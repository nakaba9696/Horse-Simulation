# トロフィー（js/core/trophy.js の HS.Trophy と同じ）。表は data/trophies.js（HSData の trophies・trophyRule・trophyGF）。
# 手にした馬それぞれに付く（1頭が同じトロフィーを手にするのは1回）。手にするとお金。引退したときに、手にしたトロフィーの数と種類で能力が上がる（points）
# 記録の形（セーブ）：G.trophies[id] = { y, horse, hid, bonus, more = [{ y, horse, hid, bonus }] }
class_name HSTrophy

const CATS := [
	{ id = "classic", label = "クラシック／三冠" }, { id = "filly", label = "牝馬三冠" }, { id = "gs", label = "グランドスラム" },
	{ id = "title", label = "称号・連覇・単発偉業" }, { id = "gf", label = "GF" },
]
static func rule() -> Dictionary: return HSData.d().get("trophyRule", {})

# 一覧（data/trophies.js と、GF ごとのもの。GF は最後に入れる）。初めて使うときに作る
static var _list: Variant = null
static func list() -> Array:
	if _list == null:
		_list = []
		for t in HSData.d().get("trophies", []): _list.append(t.duplicate(true))
		var gft: Dictionary = HSData.d().get("trophyGF", { tier = 4.0, focus = {} })
		var gfl: Array = []
		for c in HSData.d().get("gf", []):
			var name := "%s（%s）" % [HSSeason.DC_NAME, c.label]
			gfl.append({ cat = "gf", id = "gf:" + c.id, label = c.trophy, kind = "gf", races = [name], same = false, tier = gft.tier, focus = HSU.or_(gft.focus.get(c.id), ["spd", "sta"]).duplicate(), note = "%sを勝つ" % name, gf = c.id })
		_list.append_array(gfl)
	return _list
static var _by_v: Variant = null
static func by() -> Dictionary:
	if _by_v == null:
		_by_v = {}
		for t in list(): _by_v[t.id] = t
	return _by_v

# お金（rule().MONEY_YEAR の物価で持つ額を、いまの物価に直す。ゲームの中は2025年で固定なので、表の額がそのまま出る）
static func money_of(t: Dictionary) -> float: return HSMath.round_js(float(rule().TIER_MONEY[int(t.tier)]) * HSU.price_index() / HSU.price_index(float(rule().get("MONEY_YEAR", 1995.0))) / 10.0) * 10.0
static func bonus_of(t: Dictionary) -> float: return money_of(t)   # 前の名前
static func note_of(t: Dictionary) -> String: return "%s（ボーナス賞金 %s）" % [t.note, HSU.money(money_of(t))]

static func _won(h: Dictionary, name: String, pred: Variant = null) -> bool:
	for g in HSU.or_(h.get("gradedWins"), []):
		if HSU.or_(g.get("short"), g.race) == name and (pred == null or pred.call(g.y)): return true
	return false
# その馬が手にしているか（前のセーブの、名前だけの記録も）
static func has(h: Dictionary, id: String) -> bool:
	var v = HSU.or_(HSWorld.G.get("trophies"), {}).get(id)
	if not v: return false
	if (v.hid == h.get("id")) if v.get("hid") else (v.horse == h.get("name")): return true
	for m in HSU.or_(v.get("more"), []):
		if m.get("hid") == h.get("id"): return true
	return false
static func holders(id: String) -> Array:
	var v = HSU.or_(HSWorld.G.get("trophies"), {}).get(id)
	if not v: return []
	var out: Array = [{ y = v.y, horse = v.horse, hid = v.get("hid"), bonus = float(HSU.or_(v.get("bonus"), 0.0)) }]
	for m in HSU.or_(v.get("more"), []): out.append({ y = m.y, horse = m.horse, hid = m.get("hid"), bonus = float(HSU.or_(m.get("bonus"), 0.0)) })
	return out
# 手にした記録の指紋（週の結果の見せ場で、増えた分を出す）
static func sig() -> Array:
	var out: Array = []
	for t in list():
		for x in holders(t.id): out.append("%s|%s" % [t.id, x.hid if x.hid else x.horse])
	return out

# 勝ったあとにそろったか（h の勝ち鞍に race の勝ちが入っているとき）
static func done(t: Dictionary, h: Dictionary, race: Dictionary) -> bool:
	if not t.races.has(race.get("short")): return false
	match t.kind:
		"gf": return true
		"set": return t.races.all(func(n): return _won(h, n, (func(y): return y == race.year) if t.same else null))
		"repeat": return _won(h, race.short, func(y): return y == race.year) and _won(h, race.short, func(y): return y == race.year - 1)
	return false
static func year_rec(h: Dictionary, y: float) -> Dictionary:
	var rs: Array = HSU.or_(h.get("results"), []).filter(func(r): return r.y == y and r.get("grade") != "GF")
	return { starts = rs.size(), wins = rs.filter(func(r): return r.pos == 1).size(), g1 = HSU.or_(h.get("gradedWins"), []).filter(func(g): return g.y == y and g.get("grade") == "G1").size() }
# このレースを勝てばそろうか（リーチ。隠し馬が出てくる）
static func reach(h: Dictionary, t: Dictionary, race: Dictionary) -> bool:
	if not h or h.get("owner") != "P" or has(h, t.id): return false
	var R := rule()
	match t.kind:
		"set":
			if not t.races.has(race.get("short")): return false
			var pred = (func(y): return y == race.year) if t.same else null
			return not _won(h, race.short, pred) and t.races.all(func(n): return n == race.short or _won(h, n, pred))
		"repeat": return t.races.has(race.get("short")) and _won(h, race.short, func(y): return y == race.year - 1) and not _won(h, race.short, func(y): return y == race.year)
		"wonder":
			var w := float(HSU.or_(h.get("winLen"), 0.0))
			return race.get("grade") != "GF" and w >= R.WONDER_LEN - R.WONDER_PER_RACE and w < R.WONDER_LEN
		"immortal": return race.get("grade") == "G1" and float(HSU.or_(h.get("g1Streak"), 0.0)) == R.IMMORTAL_STREAK - 1
	return false

# 手にする：記録・お金・知らせ
static func give(h: Dictionary, t: Dictionary, y: float) -> bool:
	var G = HSWorld.G
	if not G.get("trophies"): G.trophies = {}
	if has(h, t.id): return false
	var bonus := money_of(t)
	var rec := { y = y, horse = h.name, hid = h.id, bonus = bonus }
	if not G.trophies.get(t.id): G.trophies[t.id] = rec
	else:
		if not G.trophies[t.id].get("more"): G.trophies[t.id].more = []
		G.trophies[t.id].more.append(rec)
	G.player.money += bonus
	HSWorld.news("トロフィー「%s」を手にした！（%s）ボーナス賞金 %s" % [t.label, h.name, HSU.money(bonus)], "g1")
	return true

# 自分の馬が重賞を勝ったとき（HSSeason.on_win から。勝ち鞍はもう足してある）
static func on_win(h: Dictionary, race: Dictionary) -> Array:
	var G = HSWorld.G
	if not G.get("eraless"): return []
	if not G.get("trophies"): G.trophies = {}
	var got: Array = []
	for t in list():
		if done(t, h, race) and give(h, t, race.year): got.append(t)
	return got
# レースのあと（finish_week から）：着差の合計（ワンダーホース）・G1 の連勝（インモータルロード）。GF は数えない
static func after_race(race: Dictionary, sim: Variant) -> Array:
	var G = HSWorld.G
	if not G.get("eraless") or race.get("grade") == "GF": return []
	var R := rule()
	var got: Array = []
	var res: Array = sim.results
	for x in res:
		var h = x.horse
		if not h or h.get("owner") != "P" or h.get("legend"): continue
		if x.pos == 1:
			var ln: float = HSU.mn(R.WONDER_PER_RACE, float(res[1].lengths) if res.size() > 1 else float(R.WONDER_PER_RACE))
			h.winLen = HSMath.round_js((float(HSU.or_(h.get("winLen"), 0.0)) + ln) * 10.0) / 10.0
			if h.winLen >= R.WONDER_LEN and give(h, by().wonder, race.year): got.append(by().wonder)
		if race.get("grade") == "G1":
			h.g1Streak = float(HSU.or_(h.get("g1Streak"), 0.0)) + 1.0 if x.pos == 1 else 0.0
			if h.g1Streak >= R.IMMORTAL_STREAK and give(h, by().immortal, race.year): got.append(by().immortal)
	return got
# 年末の表彰：前はここでホールオブフェイム（無敗の年に G1 6勝）を付けた。そのトロフィーは外した（trophy.js と同じ）ので、年末には何もしない
static func year_end(_y: float) -> Array:
	return []

# 引退したときの能力の上がり：トロフィーごとに、focus の能力は TIER_PTS、ほかの能力はその半分。1つの能力は CAP まで
static func points(h: Dictionary) -> Dictionary:
	var R := rule()
	var bym := {}
	for k in HSHorse.STATS: bym[k] = 0.0
	var ids: Array = HSHall.trophies_of(h).map(func(x): return x.id)
	for id in ids:
		var t = by().get(id)
		if not t: continue
		var p: float = float(R.TIER_PTS[int(t.tier)])
		for k in HSHorse.STATS: bym[k] += p if t.focus.has(k) else p / 2.0
	var top := 0.0
	for k in HSHorse.STATS:
		bym[k] = HSU.mn(R.CAP, bym[k]); top = HSU.mx(top, bym[k])
	return { n = float(ids.size()), by = bym, top = top }

# 前のセーブ：外したトロフィー（REMOVED。仕様書に無い5つと豪州2歳三冠・持ち主の決定 2026-10-20）の記録を消す。殿堂の写しからも外す。お金はそのまま
static func migrate_removed(g: Dictionary) -> void:
	var gone: Array = HSU.or_(rule().get("REMOVED"), [])
	var tr = g.get("trophies")
	if tr is Dictionary:
		for id in gone: tr.erase(id)
	for e in HSU.or_(g.get("hallOwn"), []):
		if e.get("trophies") is Array: e.trophies = e.trophies.filter(func(t): return not gone.has(t.get("id")))
# GF のトロフィーを、2頭目からの勝ち馬にも付ける（前の版の形）
static func add_holder(rec: Dictionary, h: Dictionary, y: float) -> void:
	if rec.get("hid") == h.id: return
	for m in HSU.or_(rec.get("more"), []):
		if m.hid == h.id: return
	if not rec.get("more"): rec.more = []
	rec.more.append({ y = y, horse = h.name, hid = h.id })
# 前のセーブ：自分の馬が勝った GF の区分のトロフィーを付ける（ボーナス賞金は無し。前の「中長距離」はクラシック）
static func migrate_gf(g: Dictionary) -> void:
	if not g.get("trophies"): g.trophies = {}
	for h in HSU.or_(g.get("horses"), {}).values():
		if h.get("owner") != "P": continue
		for w in HSSeason.gf_wins(h):
			var id: String = "gf:" + String(HSSeason.gf_cat_of_name(HSU.or_(w.get("short"), w.race)))
			if not by().has(id): continue
			if g.trophies.get(id): add_holder(g.trophies[id], h, w.y)
			else: g.trophies[id] = { y = w.y, horse = h.name, hid = h.id, bonus = 0.0 }
