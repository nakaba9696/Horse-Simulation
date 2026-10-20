# 年代なしのゲーム（js/core/eraless.js の HS.Eraless と同じ）：番組・物価・騎手は ERA の年で固定。1989〜2026年に走った史実馬を毎年ランダムにデビューさせる（生年をずらす）。
# 馬の店（走っていない馬を売る。6〜12月は2歳・1〜5月は3歳。品ぞろえは月ごと・鍵で少しずつ開く）
class_name HSEraless

const ERA := 2025.0
const START := 2025.0
const CROP := 110
const AGES := [2.0, 3.0, 4.0, 5.0, 6.0]

static func _last_year(d: Dictionary) -> float: return float(HSU.or_(d.get("retire"), d.born + 5.0))
# noDebut：血統表の母などとしてだけ持つ馬（持ち主の決定 2026-10-20）
static func is_pool(d: Dictionary) -> bool: return _last_year(d) >= 1989 and d.born <= 2023 and not d.get("noDebut", false)
static func is_legend(d: Dictionary) -> bool: return _last_year(d) < 1989
static var _pool: Variant = null
static func pool() -> Array:
	if _pool == null: _pool = HSData.d().get("historic", []).filter(func(d): return is_pool(d))
	return _pool

# いま世界で走っている（入厩・牧場の）馬の名前
static func active_names() -> Dictionary:
	var s := {}
	for h in HSWorld.all():
		if h.get("loc") == "stable" or h.get("loc") == "farm": s[h.name] = true
	return s

# 生年を off 年ずらしたデータ（勝ち鞍・出たレース・引退の年も同じだけずらす）
static func shift(d: Dictionary, off: float) -> Dictionary:
	var mv := func(s: String) -> String: return HSU.num(float(int(s.substr(0, 4))) + off) + s.substr(4)
	var x := d.duplicate()
	x.born = d.born + off; x.retire = d.retire + off if d.get("retire") != null else d.get("retire")
	x.wins = HSU.or_(d.get("wins"), []).map(mv); x.ran = HSU.or_(d.get("ran"), []).map(mv)
	return x
# 史実馬を、いま age 歳として世界に出す
static func spawn(d: Dictionary, age: float, at_start: bool) -> Variant:
	var G = HSWorld.G
	var off: float = (G.year - age) - d.born
	G.bornHist = HSU.or_(G.get("bornHist"), []).filter(func(n): return n != d.name)
	var h = HSWorld.spawn_historic(shift(d, off), at_start)
	if h: G.lineup[d.name] = off
	return h
# ランダムに n 頭（走っていない馬から）
# 倒した隠し馬（G.unlocked。香港の三冠の隠し馬は1989年からの馬）は、店にいつも並ぶので、デビューに選ばない
static func pick(n: int, rng: HSRng) -> Array:
	var act := active_names()
	var un: Array = HSU.or_(HSWorld.G.get("unlocked"), [])
	var free: Array = pool().filter(func(d): return not act.has(d.name) and not un.has(d.name))
	var out: Array = []
	var i := 0
	while i < n and free.size():
		var k := rng.int_(0, free.size() - 1)
		out.append(free[k]); free.remove_at(k)
		i += 1
	return out
static func populate() -> void:
	var G = HSWorld.G
	var rng := HSRng.new(G.seed + 7.0)
	for age in AGES:
		for d in pick(CROP, rng): spawn(d, age, true)
static func crop() -> void:
	var G = HSWorld.G
	var rng := HSRng.new(G.seed * 31.0 + G.year)
	var list := pick(CROP, rng)
	for d in list:
		var h = spawn(d, 2.0, false)
		if h: h.loc = "farm"
	HSWorld.news("今年は%d頭の史実馬がデビューに向けて動き出した。" % list.size(), "info")

# ---------- 馬の店 ----------
# 店の馬の年齢は月で変える（持ち主の仕様書 2026-10-19「店」：6〜12月は2歳、1〜5月は3歳）。6月から翌年の5月までは同じ生まれ年の馬を売る
static func shop_age(month: float) -> float: return 2.0 if month >= 6.0 else 3.0
static func shop_born() -> float: return HSWorld.G.year - shop_age(HSWorld.G.month)
# 店で見える評価値は、その馬のいまの総合力（早熟は高く、晩成は低く見える）
static func shop_fh(h: Dictionary, wIdx: float) -> Dictionary: return HSSeason.fh_both(h, wIdx)
# 値段は、いまの評価点（いまの総合力。芝・ダの良いほう）だけで決める（js/core/eraless.js の E.priceOf と同じ式。持ち主の決定 2026-10-20）：
#   値段 ＝ 2,000万円 × 2^((評価点 − 52) ÷ 6) × 物価 × 1.3 × 成長型の掛け（300万円から）。スペシャルホースはその1.6倍
#   成長型の掛け：評価点が同じなら晩成ほど少し高い（早熟 0.9・早め 0.95・普通 1・遅め 1.07・晩成 1.15）
const PRICE_BASE := 2000.0
const PRICE_DOUBLE := 6.0
const PRICE_FH := 52.0
const GROWTH_PRICE := { "早熟": 0.9, "早め": 0.95, "普通": 1.0, "遅め": 1.07, "晩成": 1.15 }
static func growth_price(h: Dictionary) -> float: return float(GROWTH_PRICE.get(String(HSU.or_(h.get("growth"), "")), 1.0))
static func shop_value(h: Dictionary, wIdx: float) -> float:
	var f := shop_fh(h, wIdx)
	return HSU.mx(float(f.turf), float(f.dirt))
static func price_of(h: Dictionary, legend: bool, wIdx: Variant = null) -> float:
	var w: float = HSWorld.w_idx() if wIdx == null else float(wIdx)
	var v := shop_value(h, w)
	return HSMath.round_js(HSU.mx(300.0, PRICE_BASE * HSMath.pow_(2.0, (v - PRICE_FH) / PRICE_DOUBLE)) * HSU.price_index() * 1.3 * growth_price(h) * (1.6 if legend else 1.0) / 10.0) * 10.0

const COUNTRY_NEAR := { "新": "豪", "伊": "仏" }
const COUNTRY_NAME := { "英": "イギリス", "仏": "フランス", "米": "アメリカ", "愛": "アイルランド", "独": "ドイツ", "豪": "オーストラリア", "香港": "香港", "UAE": "UAE", "サウジ": "サウジアラビア", "加": "カナダ", "星": "シンガポール", "海外": "そのほかの国" }
const GRADE_RANK := { G1 = 3, G2 = 2, G3 = 1 }
static var _raceCountries: Variant = null
static func _country_of_race(r: Dictionary) -> String:
	return HSU.or_(HSData.d().courses.get(r.course, {}).get("country"), HSU.or_(r.get("country"), "海外"))
static var _lockCache := {}
const GF_FH := 70.0
const GF_RATING := 98.0
static func elite_cat(d: Dictionary) -> Variant:
	var pk := HSSeason.fh_peak(HSHorse.from_historic(d, "lock:" + d.name))
	if HSU.mx(pk.turf, pk.dirt) < GF_FH and float(HSU.or_(d.get("rating"), 0.0)) < GF_RATING: return null
	return HSSeason.gf_cat_of_data(d, pk)
static func lock_of(d: Dictionary) -> String:
	if _lockCache.has(d.name): return _lockCache[d.name]
	var key := ""
	var gf = elite_cat(d)
	if gf: key = "gf:" + gf
	elif HSData.is_foreign(d):
		if _raceCountries == null:
			_raceCountries = {}
			for r in HSData.d().get("races", []):
				if r.get("region") == "海外": _raceCountries[_country_of_race(r)] = true
		var c = COUNTRY_NEAR.get(d.country, d.country)
		key = "c:" + (c if _raceCountries.has(c) else "海外")
	else:
		var ws := HSHorse.win_races(d)
		var loc := ws.filter(func(r): return r.get("region") == "地方").size(); var jra := ws.filter(func(r): return r.get("region") == "JRA").size()
		if loc > 0 and loc >= jra: key = "local"
		else:
			var b := 0
			for r in ws: b = maxi(b, GRADE_RANK.get(r.get("grade"), 0))
			key = "g1" if b >= 3 else ("g2" if b == 2 else "")
	_lockCache[d.name] = key
	return key
static func _gf_label(k: String) -> String: return HSSeason.gf_by().get(k.substr(3), {}).get("label", k.substr(3))
static func lock_label(k: String) -> String:
	if k.begins_with("gf:"): return "GFの馬（%s）" % _gf_label(k)
	if k == "g1": return "G1馬"
	if k == "g2": return "G2馬"
	if k == "local": return "地方馬"
	if k.begins_with("c:"): return "%sの馬" % COUNTRY_NAME.get(k.substr(2), k.substr(2))
	return ""
static func lock_hint(k: String) -> String:
	if k.begins_with("gf:"): return "%sのGFを勝つ" % _gf_label(k)
	if k == "g1": return "G1を勝つ"
	if k == "g2": return "G2かG1を勝つ"
	if k == "local": return "地方のレースを勝つ"
	if k == "c:海外": return "海外のレースを勝つ"
	if k.begins_with("c:"): return "%sのレースを勝つ" % COUNTRY_NAME.get(k.substr(2), k.substr(2))
	return ""
static func keys_of_win(race: Dictionary) -> Array:
	var out: Array = []
	var g: int = 3 if race.get("grade") == "GF" else GRADE_RANK.get(race.get("grade"), 0)
	if race.get("grade") == "GF" and race.get("gf"): out.append("gf:" + race.gf)
	if g >= 2: out.append("g2")
	if g >= 3: out.append("g1")
	if race.get("region") == "地方": out.append("local")
	if race.get("region") == "海外":
		out.append("c:" + _country_of_race(race)); out.append("c:海外")
	return out
static func is_open(d: Dictionary) -> bool:
	var k := lock_of(d)
	return k == "" or HSU.or_(HSWorld.G.get("shopKeys"), []).has(k)
static func unlock_win(race: Dictionary) -> Array:
	var G = HSWorld.G
	if not G.get("eraless"): return []
	if not G.get("shopKeys"): G.shopKeys = []
	var fresh: Array = keys_of_win(race).filter(func(k): return not G.shopKeys.has(k))
	if not fresh.size(): return []
	G.shopKeys.append_array(fresh)
	var shown: Array = fresh.filter(func(k): return k != "c:海外" or not fresh.any(func(x): return x.begins_with("c:") and x != "c:海外"))
	var n := pool().filter(func(d): return fresh.has(lock_of(d))).size()
	if n: HSWorld.news("来月から、馬の店に%sも並ぶようになる！（%d頭）" % ["・".join(shown.map(func(k): return lock_label(k))), n], "g1")
	return fresh
static func migrate_keys(g: Dictionary) -> Array:
	var keys := {}
	for h in g.get("horses", {}).values():
		if h.get("owner") != "P": continue
		for w in HSU.or_(h.get("gradedWins"), []):
			for k in keys_of_win({ grade = w.get("grade"), region = w.get("region"), course = "" }):
				if k != "c:海外": keys[k] = true
		for r in HSU.or_(h.get("results"), []):
			if r.pos == 1:
				var c: Dictionary = HSData.d().courses.get(r.course, {})
				if c.get("region") == "地方": keys["local"] = true
				if c.get("region") == "海外":
					keys["c:" + HSU.or_(c.get("country"), "海外")] = true; keys["c:海外"] = true
	return keys.keys()
static func gf_keys(g: Dictionary) -> Array:
	var keys := {}
	for h in g.get("horses", {}).values():
		if h.get("owner") == "P":
			for w in HSU.or_(h.get("gradedWins"), []):
				var c = HSSeason.gf_cat_of_name(HSU.or_(w.get("short"), w.race))
				if c: keys["gf:" + c] = true
	return keys.keys()
static var _mk: Variant = null
static func _item_of(d: Dictionary, legend: bool) -> Dictionary:
	var born := shop_born()
	if _mk == null or _mk.born != born: _mk = { born = born, horses = {} }
	var h = _mk.horses.get(d.name)
	if h == null:
		h = HSHorse.from_historic(shift(d, born - d.born), "pool:" + d.name)
		if HSData.is_foreign(d): h.country = HSU.or_(d.get("country"), "外")
		h.owner = "AI"; h.loc = "shop"
		if legend: h.legendBought = true
		_mk.horses[d.name] = h
	return { kind = "pool", horse = h, data = d, price = price_of(h, legend, HSWorld.w_idx()), legend = legend }
static func market() -> Array:
	var G = HSWorld.G
	var act := active_names()
	var items: Array = []
	var un: Array = HSU.or_(G.get("unlocked"), [])   # 倒した隠し馬は下で（1989年からの隠し馬が二重に並ばないように）
	for d in pool():
		if is_open(d) and not act.has(d.name) and not un.has(d.name): items.append(_item_of(d, false))
	for name in HSU.or_(G.get("unlocked"), []):
		var d = HSSpecial.data(name)
		if d and not act.has(d.name): items.append(_item_of(d, true))
	return items

const STOCK := 10
static func restock(reroll: bool) -> Array:
	var G = HSWorld.G
	var s = G.get("shopStock")
	var n: float = (float(HSU.or_(s.get("n"), 0.0)) if (s and s.y == G.year and s.m == G.month) else 0.0) + (1.0 if reroll else 0.0)
	var rng := HSRng.new(float(HSU.to_u32((G.seed * 131.0 + G.year * 12.0 + G.month) * 7.0 + n * 7919.0)))
	var act := active_names()
	var un: Array = HSU.or_(G.get("unlocked"), [])
	var free: Array = pool().filter(func(d): return is_open(d) and not act.has(d.name) and not un.has(d.name))
	var names: Array = []
	for side in [false, true]:
		var list: Array = free.filter(func(d): return (d.get("sex") == "牝") == side)
		var i := 0
		while i < STOCK and list.size():
			var k := rng.int_(0, list.size() - 1)
			names.append(list[k].name); list.remove_at(k)
			i += 1
	G.shopStock = { y = G.year, m = G.month, n = n, names = names }
	if HSOwners.on(): HSOwners.shop_bias(names)   # owners.js の包み（馬主に頼んだ月は、好みの馬を入れる）
	return names
static func shop() -> Array:
	var G = HSWorld.G
	var s = G.get("shopStock")
	if not s or s.y != G.year or s.m != G.month: restock(false)
	var act := active_names()
	var byName := {}
	for d in pool(): byName[d.name] = d
	var items: Array = []
	var un: Array = HSU.or_(G.get("unlocked"), [])
	for name in G.shopStock.names:
		var d = byName.get(name)
		if d and not act.has(name) and not un.has(name): items.append(_item_of(d, false))
	for name in HSU.or_(G.get("unlocked"), []):
		var d = HSSpecial.data(name)
		if d and not act.has(d.name): items.append(_item_of(d, true))
	return items
static func shop_horse(id: Variant) -> Variant:
	if _mk and typeof(id) == TYPE_STRING and String(id).begins_with("pool:"): return _mk.horses.get(String(id).substr(5))
	return null
static func buy(item: Dictionary) -> Variant:
	var G = HSWorld.G
	var h: Dictionary = item.horse; var d: Dictionary = item.data
	if active_names().has(h.name): return "売り切れ"
	h.id = HSWorld.new_id()
	h.owner = "P"; h.loc = "farm"
	if HSData.is_foreign(d): h.imported = true
	G.lineup[h.name] = h.born - d.born
	G.bornHist = HSU.or_(G.get("bornHist"), []).filter(func(n): return n != h.name) + [h.name]
	G.horses[h.id] = h
	G.player.money -= item.price
	if _mk: _mk.horses.erase(h.name)
	HSWorld.dirty()
	HSWorld.news("「%s」を%sで買った！" % [h.name, HSU.money(item.price)], "g1")
	return null
