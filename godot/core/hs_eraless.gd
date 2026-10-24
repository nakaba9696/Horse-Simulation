# 年代なしのゲーム（js/core/eraless.js の HS.Eraless と同じ）：番組・物価・騎手は ERA の年で固定。1989〜2026年に走った史実馬（トロフィーの隠し馬は除く）を
# 毎年、総合力の帯ごとの割合でデビューさせる（TIERS。生年をずらす）。
# 馬の店（走っていない馬を売る。6〜12月は2歳・1〜5月は3歳。品ぞろえは月ごと・鍵で少しずつ開く）
class_name HSEraless

const ERA := 2025.0
const START := 2025.0
const CROP := 300   # 毎年デビューする史実馬の数（eraless.js と同じ。架空の馬をやめたので 110 から増やした）
const AGES := [2.0, 3.0, 4.0, 5.0, 6.0]

static func _last_year(d: Dictionary) -> float: return float(HSU.or_(d.get("retire"), d.born + 5.0))
# noDebut：血統表の母などとしてだけ持つ馬（持ち主の決定 2026-10-20）
static func is_pool(d: Dictionary) -> bool: return _last_year(d) >= 1989 and d.born <= 2023 and not d.get("noDebut", false)
static func is_legend(d: Dictionary) -> bool: return _last_year(d) < 1989
# トロフィーの隠し馬（data/trophy_horses.js に名前のある馬。香港の三冠の1989年からの馬も）は基本プールから外す（持ち主の決定 2026-10-24
# 「隠し馬は基本プールからはずしたい」）。毎年のデビューにも始めの世界にも馬の店の品ぞろえにも出ず、トロフィーのリーチで出てきて、倒すと店に並ぶ道だけになる
static var _hidden: Variant = null
static func is_hidden(d: Dictionary) -> bool:
	if _hidden == null:
		_hidden = {}
		for xs in HSData.d().get("trophyHorses", {}).values():
			for x in xs: _hidden[x.name] = true
	return _hidden.has(d.name)
static var _pool: Variant = null
static var _pc: Variant = null
static func pool() -> Array:
	if _pool == null: _pool = HSData.d().get("historic", []).filter(func(d): return is_pool(d) and not is_hidden(d))
	# owners.js の包み：まだやり終えていないミッションの依頼の馬は、デビューと馬の店に出さない（騎手のゲーム）
	var g = HSWorld.G
	if not g or g.get("mode") != "jockey" or not g.get("eraless"): return _pool
	var res := HSOwners.reserved()
	if _pc != null and is_same(_pc.p, _pool) and is_same(_pc.res, res): return _pc.list
	_pc = { p = _pool, res = res, list = _pool.filter(func(d): return not res.has(d.name)) }
	return _pc.list

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
# デビューの選び方（持ち主の決定 2026-10-24。eraless.js の E.TIERS と同じ）：総合力（画面の数・芝とダートの高いほう。HSSeason.fh_show_peak）で帯に分け、
# 帯ごとの割合で選ぶ。帯は上から 70.0以上・65.0〜69.5・60.0〜64.5・59.5以下、割合は 5・20・35・40％（300頭なら 15・60・105・120頭）。数は docs/BALANCE.md「21」
const TIERS := [{ min = 70.0, pct = 5 }, { min = 65.0, pct = 20 }, { min = 60.0, pct = 35 }, { min = 0.0, pct = 40 }]
# 帯の番号（0 がいちばん上）。能力はデータだけで決まるので名前で覚える（新しいゲーム・セーブを読んだとき＝エディットを当て直したときに空にする。HSWorld._reset_caches）
static var _tier := {}
static func tier_of(d: Dictionary) -> int:
	if _tier.has(d.name): return _tier[d.name]
	var f := HSSeason.fh_show_peak(HSHorse.from_historic(d, "tier:" + d.name))
	var v: float = maxf(f.turf, f.dirt)
	var t := 0
	while t < TIERS.size() - 1 and v < TIERS[t].min: t += 1
	_tier[d.name] = t
	return t
# n 頭を帯に割る（端数はいちばん下の帯へ）
static func tier_counts(n: int) -> Array:
	var c: Array = []
	var sum := 0
	for i in TIERS.size() - 1:
		c.append(n * int(TIERS[i].pct) / 100); sum += c[i]
	c.append(n - sum)
	return c
# 帯ごとの馬の並び free（free[0] がいちばん上の帯。中身は取り出して減る）から n 頭を選ぶ。帯ごとに種付きの乱数で選び、
# 帯に残りが足りなければ1つ下の帯から埋める。いちばん下の帯も足りなければ、下から順に上の帯へ戻って埋める
static func pick_tiers(free: Array, n: int, rng: HSRng) -> Array:
	var out: Array = []
	var take := func(i: int, k: int) -> int:
		var L: Array = free[i]
		var got := 0
		while got < k and L.size():
			var j := rng.int_(0, L.size() - 1)
			out.append(L[j]); L.remove_at(j)
			got += 1
		return got
	var want := tier_counts(n)
	var carry := 0
	for i in want.size(): carry += want[i] - take.call(i, want[i] + carry)
	var up := want.size() - 2
	while up >= 0 and carry > 0:
		carry -= take.call(up, carry)
		up -= 1
	return out
# n 頭を選ぶ（走っていない馬から。帯ごとの割合で）
static func pick(n: int, rng: HSRng) -> Array:
	var act := active_names()
	var free: Array = []
	for i in TIERS.size(): free.append([])
	for d in pool():
		if not act.has(d.name): free[tier_of(d)].append(d)
	return pick_tiers(free, n, rng)
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
#   値段 ＝ 2,000万円 × 2^((評価点 − 52) ÷ 6) × 物価 × 1.3 × 成長型の掛け（300万円から）。スペシャルホースはその1.6倍
const PRICE_BASE := 2000.0
const PRICE_DOUBLE := 5.0
const PRICE_FH := 55.0
const GROWTH_PRICE := { "超早熟": 0.85, "早熟": 0.9, "早め": 0.95, "普通": 1.0, "遅め": 1.07, "晩成": 1.15, "超晩成": 1.2, "持続": 1.1 }
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
const GF_FH := 71.0
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
