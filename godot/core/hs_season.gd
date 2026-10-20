# シーズンの決まり（js/core/season.js と js/core/dream.js の HS.Season と同じ）：お手馬の上限・資金切れ・総合力・冠と殿堂・出走の予約・
# 年末のグランドフェスティバル（GF。12月4週のあとに海外の競馬場で6つ。招待・出るかの選択・出走表）・天気
class_name HSSeason

const MAX_OWN := 10.0
const BROKE_MONTHS := 2.0

# 調子は無い（持ち主の決定 2026-10-20「調子のパラメータは無し。疲労だけにする」）。馬の状態は疲労（HSFatigue）の段階で見せる

# ---------- 総合力（芝・ダートそれぞれ 1〜99） ----------
# その馬場のスピードとスタミナだけから出す（js/core/season.js の T.fhOf と同じ式。持ち主の決定 2026-10-20「スピードスタミナから出す」）。
# スタミナの重みは得意な距離（distMin と distMax の真ん中）で 0.25（1200m 以下）〜0.35（2000m）〜0.45（2800m 以上）。残りがスピード
const FH_NAME := "総合力"
const FH_KNOTS := [[76.0, 53.0], [94.0, 70.0], [106.7, 85.0], [118.0, 99.0]]
# スタミナの重み（d は馬か distMin・distMax を持つ辞書か距離の数。null なら 2000m とみる）
static func fh_sta_w(d: Variant) -> float:
	var m := 2000.0
	if d is Dictionary: m = (float(HSU.or_(d.get("distMin"), 1600.0)) + float(HSU.or_(d.get("distMax"), 2400.0))) / 2.0
	elif d != null: m = float(d)
	return HSU.clamp(0.35 + (m - 2000.0) / 8000.0, 0.25, 0.45)
static func fh_raw(c0: Dictionary, surface: String, d: Variant = null) -> float:
	var s := HSHorse.on_surface(c0, surface)
	var w := fh_sta_w(d)
	return float(HSU.or_(s.get("spd"), 0.0)) * (1.0 - w) + float(HSU.or_(s.get("sta"), 0.0)) * w
static func fh(h: Dictionary, wIdx: Variant, surface: String) -> float: return fh_of(HSHorse.cur(h, wIdx), surface, h)
static func fh_of(c0: Dictionary, surface: String, d: Variant = null) -> float:
	var a := fh_raw(c0, surface, d)
	var K := FH_KNOTS
	var i := 0
	while i < K.size() - 2 and a > K[i + 1][0]: i += 1
	var x0: float = K[i][0]; var y0: float = K[i][1]; var x1: float = K[i + 1][0]; var y1: float = K[i + 1][1]
	return HSU.clamp(HSMath.round_js(y0 + (a - x0) * (y1 - y0) / (x1 - x0)), 1.0, 99.0)
static func fh_both(h: Dictionary, wIdx: Variant) -> Dictionary: return { turf = fh(h, wIdx, "芝"), dirt = fh(h, wIdx, "ダ") }
static func fh_peak(h: Dictionary) -> Dictionary: return { turf = fh_of(h.pot, "芝", h), dirt = fh_of(h.pot, "ダ", h) }
# 入厩している現役の馬の中での順位
static func rank(h: Dictionary, wIdx: float) -> Dictionary:
	var c := HSWorld.wc()
	if not c.has("fhRank"):
		var list: Array = []
		for x in HSWorld.all():
			if x.get("loc") == "stable": list.append({ id = x.id, v = HSU.mx(fh(x, wIdx, "芝"), fh(x, wIdx, "ダ")) })
		list = HSU.stable_sort(list, func(a, b): return a.v > b.v)
		var pos := {}
		for i in list.size(): pos[list[i].id] = i + 1
		c.fhRank = { n = list.size(), pos = pos }
	return { pos = c.fhRank.pos.get(h.id), n = c.fhRank.n }

# ---------- 冠：勝ったレースの組み合わせで付く称号 ----------
static func _won(h: Dictionary) -> Array:
	return HSU.or_(h.get("gradedWins"), []).map(func(g): return { y = g.y, r = HSU.or_(g.get("short"), g.race), grade = g.get("grade"), region = g.get("region") })
static func _same_year(ws: Array, names: Array) -> Array:
	var ys := {}
	for w in ws:
		if names.has(w.r):
			var k := HSU.num(w.y)
			if not ys.has(k): ys[k] = {}
			ys[k][w.r] = true
	return ys.values().map(func(s): return s.size())
static func _has_w(ws: Array, n: String) -> bool: return ws.any(func(w): return w.r == n)
static func _title_test(id: String, ws: Array, t: Dictionary) -> bool:
	match id:
		"triple": return _same_year(ws, ["皐月賞", "日本ダービー", "菊花賞"]).any(func(n): return n >= 3)
		"ftriple": return _same_year(ws, ["桜花賞", "オークス", "秋華賞"]).any(func(n): return n >= 3) or ws.any(func(w): return w.r == "エリザベス女王杯" and w.y < 1996 and _has_w(ws.filter(func(x): return x.y == w.y), "桜花賞") and _has_w(ws.filter(func(x): return x.y == w.y), "オークス"))
		"double": return not t.has("triple") and _same_year(ws, ["皐月賞", "日本ダービー", "菊花賞"]).any(func(n): return n >= 2)
		"fdouble": return not t.has("ftriple") and _same_year(ws, ["桜花賞", "オークス", "秋華賞"]).any(func(n): return n >= 2)
		"henso": return _same_year(ws, ["NHKマイルC", "日本ダービー"]).any(func(n): return n >= 2)
		"autumn": return _same_year(ws, ["天皇賞・秋", "ジャパンC", "有馬記念"]).any(func(n): return n >= 3)
		"spring": return _same_year(ws, ["大阪杯", "天皇賞・春", "宝塚記念"]).any(func(n): return n >= 3)
		"grandprix": return _has_w(ws, "宝塚記念") and _has_w(ws, "有馬記念")
		"tenno": return _has_w(ws, "天皇賞・春") and _has_w(ws, "天皇賞・秋")
		"world": return ws.any(func(w): return w.region == "海外" and w.grade == "G1")
		"g1five": return ws.filter(func(w): return w.grade == "G1").size() >= 5
	return false
const TITLES := [
	{ id = "triple", label = "三冠" }, { id = "ftriple", label = "牝馬三冠" }, { id = "double", label = "二冠" }, { id = "fdouble", label = "牝馬二冠" },
	{ id = "henso", label = "変則二冠" }, { id = "autumn", label = "秋の古馬三冠" }, { id = "spring", label = "春の古馬三冠" }, { id = "grandprix", label = "グランプリ制覇" },
	{ id = "tenno", label = "天皇賞の春秋制覇" }, { id = "world", label = "海外G1制覇" }, { id = "g1five", label = "G1五勝" },
]   # 前の「グランドフェスティバル制覇」は、GF ごとの冠（GF クラシック覇者など。titles で足す）に置き換えた
static func titles(h: Dictionary) -> Array:
	var ws := _won(h); var got := {}
	for t in TITLES:
		if _title_test(t.id, ws, got): got[t.id] = true
	var out: Array = TITLES.filter(func(t): return got.has(t.id))
	for c in gf_cats():
		if ws.any(func(w): return gf_cat_of_name(w.r) == c.id): out.append({ id = "gf:" + c.id, label = c.trophy })
	return out

# 自分の馬が重賞を勝ったとき：新しい冠を知らせ、冠のある馬は殿堂へ
static func on_win(h: Dictionary, race: Dictionary, year: float) -> Array:
	var G = HSWorld.G
	HSTrophy.on_win(h, race)
	var now: Array = titles(h).map(func(t): return t.label)
	var before: Array = HSU.or_(h.get("titles"), [])
	var fresh: Array = now.filter(func(l): return not before.has(l))
	h.titles = now
	for l in fresh: HSWorld.news("%sが「%s」の冠を手にした！" % [h.name, l], "g1")
	if not now.size(): return fresh
	if not G.records.get("hall"): G.records.hall = []
	var e = null
	for x in G.records.hall:
		if x.id == h.id: e = x; break
	if not e:
		e = { id = h.id, name = h.name, born = h.born, sex = h.sex, since = year }; G.records.hall.append(e)
	var g1 := 0
	for g in HSU.or_(h.get("gradedWins"), []):
		if g.get("grade") == "G1": g1 += 1
	e.titles = now; e.starts = HSU.or_(h.get("starts"), 0.0); e.wins = HSU.or_(h.get("wins"), 0.0); e.g1 = float(g1); e.prize = HSU.or_(h.get("prize"), 0.0); e.last = year
	return fresh

# ---------- お手馬の上限と、資金切れ ----------
static func own_count() -> int: return HSWorld.mine().filter(func(h): return h.get("loc") == "stable" or h.get("loc") == "farm").size()
static func can_buy() -> bool: return own_count() < MAX_OWN
static func month_end() -> void:
	var G = HSWorld.G
	if G.mode != "jockey" or G.get("gameOver"): return
	if G.player.money >= 0:
		G.broke = 0.0; return
	G.broke = float(HSU.or_(G.get("broke"), 0.0)) + 1.0
	if G.broke >= BROKE_MONTHS:
		G.gameOver = { y = G.year, m = G.month, money = G.player.money }
		HSWorld.news("資金が尽きた。ここでシーズンは終わり。", "warn")
	else: HSWorld.news("資金がマイナスです。来月の末までに立て直さないと、シーズンが終わります。", "warn")

# ---------- 出走の予約 ----------
const RESERVE_WEEKS := 52
static func reserves(id: Variant = null) -> Array:
	return HSU.or_(HSWorld.G.get("reserve"), []).filter(func(x): return not id or x.id == id)
static func _sort_reserve(G) -> void:
	G.reserve = HSU.stable_sort(G.reserve, func(a, b):
		if a.y != b.y: return a.y < b.y
		if a.m != b.m: return a.m < b.m
		return a.w < b.w)
static func reserve(id: String, race: Dictionary) -> Variant:
	var G = HSWorld.G
	var h = HSWorld.horse(id)
	if not h or h.get("owner") != "P": return "持ち馬ではない"
	if not race.get("graded") and not (race.get("cls") and race.get("region") == "JRA"): return "予約できるのは重賞とオープンだけ"
	var why = static_ineligible(h, race, race.year)
	if not why: why = HSFatigue.travel_why(h, race)   # 連闘で別の国へは予約できない
	if not why and not (race.get("graded") and race.get("grade") != "G1"): # G1 は獲得賞金の条件もいまの賞金で見る（番組表 hs_program.gd と同じ）
		why = HSRaces.ineligible(h, race, race.year)
	if why: return why
	if not G.get("reserve"): G.reserve = []
	if G.reserve.any(func(x): return x.id == id and x.y == race.year and x.m == race.month and x.w == race.week): return "その週はもう予約している"
	if HSWorld.one_ride() and G.reserve.any(func(x): return x.key == race.key and x.id != id): return HSWorld.WHY_MINE   # 1つのレースに自分の馬は1頭まで（持ち主の決定 2026-10-20）
	G.reserve.append({ id = id, key = race.key, y = race.year, m = race.month, w = race.week, label = HSRaces.label(race) })
	_sort_reserve(G)
	return null
static func static_ineligible(h: Dictionary, race: Dictionary, year: float) -> Variant:
	var age: float = year - h.born
	var ra = race.get("age")
	if ra == "2" and age != 2: return "年齢"
	if ra == "3" and age != 3: return "年齢"
	if ra == "3+" and age < 3: return "年齢"
	if ra == "4+" and age < 4: return "年齢"
	if ra == "4" and age != 4: return "年齢"
	if age < 2: return "年齢"
	if age == 2 and race.month < 6: return "デビュー前"
	if race.get("sex") == "牝" and h.get("sex") != "牝": return "牝馬限定"
	if race.get("noGelding") and h.get("gelding"): return "せん馬は出られない"
	return null
static func debut_weeks(h: Dictionary) -> Array:
	var G = HSWorld.G; var out: Array = []
	var y: float = G.year; var m: float = G.month; var w: float = G.week
	for i in RESERVE_WEEKS:
		w += 1.0
		if w > 4:
			w = 1.0; m += 1.0
			if m > 12:
				m = 1.0; y += 1.0
		if y - h.born == 2 and m >= 6: out.append({ y = y, m = m, w = w })
	return out
static func reserve_debut(id: String, y: float, m: float, w: float) -> Variant:
	var G = HSWorld.G; var h = HSWorld.horse(id)
	if not h or h.get("owner") != "P": return "持ち馬ではない"
	if float(HSU.or_(h.get("starts"), 0.0)) > 0: return "もうデビューしている"
	if not debut_weeks(h).any(func(x): return x.y == y and x.m == m and x.w == w): return "その週は予約できない"
	G.reserve = HSU.or_(G.get("reserve"), []).filter(func(x): return not (x.id == id and x.get("debut")))
	if G.reserve.any(func(x): return x.id == id and x.y == y and x.m == m and x.w == w): return "その週はもう予約している"
	G.reserve.append({ id = id, key = "debut:%s-%s-%s" % [HSU.num(y), HSU.num(m), HSU.num(w)], y = y, m = m, w = w, label = "デビュー戦", debut = true })
	_sort_reserve(G)
	return null
static func debut_race(h: Dictionary) -> Variant:
	var G = HSWorld.G
	var list: Array = HSWorld.week_races().filter(func(r): return not r.get("graded") and not r.get("invite") and r.get("age") == "2" and not HSRaces.ineligible(h, r, G.year) and not HSWorld.ride_taken(r.key, h.id))   # ほかのお手馬のデビュー戦とは別のレースに
	var mid: float = (h.distMin + h.distMax) / 2.0
	var score := func(r): return float(HSU.or_(h.apt.dirt if r.surface == "ダ" else h.apt.turf, 50.0)) * 3.0 - absf(r.dist - HSU.mn(mid, 1800.0)) / 20.0
	list = HSU.stable_sort(list, func(a, b): return score.call(a) > score.call(b))
	return list[0] if list.size() else null
static func unreserve(id: String, key: String) -> void:
	var G = HSWorld.G; G.reserve = HSU.or_(G.get("reserve"), []).filter(func(x): return not (x.id == id and x.key == key))
# 週の初めに、今週の予約を出走登録に変える
static func apply_reserves() -> void:
	var G = HSWorld.G
	if not G.get("reserve") or not G.reserve.size(): return
	var now: float = (G.year * 12.0 + G.month) * 5.0 + G.week
	var keep: Array = []
	for x in G.reserve:
		var h = HSWorld.horse(x.id)
		if not h or h.get("owner") != "P": continue
		var t: float = (x.y * 12.0 + x.m) * 5.0 + x.w
		if t > now:
			keep.append(x); continue
		if t < now: continue
		var key: String = x.key
		if x.get("debut"):
			var r = debut_race(h)
			if not r:
				HSWorld.news("%sの予約していたデビュー戦（2歳オープン）が、この週にはない。" % h.name, "warn"); continue
			key = r.key
		var err = HSWorld.enter(x.id, key)
		if err: HSWorld.news("%sは予約していた%sに出られない（%s）。" % [h.name, x.label, err], "warn")
	G.reserve = keep

# ---------- 天気 ----------
static func weather(seed: float, year: float, month: float, week: float, course: String, ground: String) -> String:
	var rng := HSU.hash_rng("w:%s:%s:%s:%s:%s" % [HSU.num(seed), HSU.num(year), HSU.num(month), HSU.num(week), course])
	var winter := month == 12 or month <= 2
	if ground == "不良" or ground == "重": return "雪" if (winter and rng.chance(0.3)) else "雨"
	if ground == "稍重": return "雨" if rng.chance(0.5) else "曇"
	return "晴" if rng.chance(0.7) else "曇"
static func weather_icon(w: String) -> String: return { "晴": "☀", "曇": "☁", "雨": "☂", "雪": "❄" }.get(w, "")

# ================= グランドフェスティバル（js/core/dream.js） =================
# 区分は data/gf.js（godot/data/gf.json）。12月4週のあとの「GF の週」（G.week＝5）に全部を走る。
# GF は特別枠（疲れ・休み（移動の疲れも無い）・出走数・勝ち数・リーディングに数えない）。同じ馬でいくつの GF にも出られる（連戦）
const DC_NAME := "グランドフェスティバル"
const DC_FIELD := 16
const GF_WEEK := 5.0
const GF_GIFT_AGE := 6.0
static func _fit(id: String, r: Dictionary) -> bool:
	var v: Dictionary = HSU.or_(gf_by()[id].get("votes"), {})
	if v.get("surface") != null and ((r.surface != "ダ") if v.surface == "ダ" else (r.surface == "ダ")): return false
	if v.get("min") != null and r.dist < v.min: return false
	if v.get("max") != null and r.dist > v.max: return false
	return true
static var _gf_cats: Variant = null
static func gf_cats() -> Array:
	if _gf_cats == null:
		_gf_cats = []
		for c in HSData.d().get("gf", []):
			var x: Dictionary = c.duplicate(true); x.week = GF_WEEK
			_gf_cats.append(x)
	return _gf_cats
static var _gf_by_v: Variant = null
static func gf_by() -> Dictionary:
	if _gf_by_v == null:
		_gf_by_v = {}
		for c in gf_cats(): _gf_by_v[c.id] = c
	return _gf_by_v
static func gf_order() -> Array: return gf_cats().map(func(c): return c.id)
const DC_PREV := ["ドリームクラシック", "グランドフィナーレ"]   # 前の名前（前のセーブの勝ち鞍も GF として数える）
const DC_RESERVE := 6
const DC_FOREIGN := 4
static func gf_name(id: String) -> String: return "%s（%s）" % [DC_NAME, gf_by()[id].label]
static func is_gf(n: Variant) -> bool:
	if n == null or n == "": return false
	if String(n).begins_with(DC_NAME): return true
	return DC_PREV.any(func(p): return String(n).begins_with(p))
static func gf_cat_of_name(n: Variant) -> Variant:
	if not is_gf(n): return null
	for x in gf_cats():
		if String(n).ends_with("（%s）" % x.label): return x.id
	return "classic"
static func gf_wins(h: Dictionary) -> Array: return HSU.or_(h.get("gradedWins"), []).filter(func(g): return is_gf(HSU.or_(g.get("short"), g.race)))
static func gf_cat_of_data(d: Dictionary, peak: Variant) -> String:
	if d.get("surface") == "ダ" or (d.get("surface") == "芝ダ" and peak and peak.dirt > peak.turf): return "dirt"
	if float(HSU.or_(d.get("distMin"), 0.0)) >= 2000 and float(HSU.or_(d.get("distMax"), 0.0)) >= 3000: return "long"
	var m: float = (float(HSU.or_(d.get("distMin"), 1600.0)) + float(HSU.or_(d.get("distMax"), 2400.0))) / 2.0
	return "sprint" if m <= 1400 else ("mile" if m <= 1800 else ("distance" if m <= 2200 else "classic"))
static func gf_won_prev(h: Dictionary, race: Dictionary) -> bool:
	return gf_wins(h).any(func(g): return g.y == race.year - 1 and gf_cat_of_name(HSU.or_(g.get("short"), g.race)) == race.get("gf"))
static func gf_legends(cat: String) -> Array: return HSSpecial.pool().filter(func(d): return d.get("tier") == "legend" and d.get("gf") == cat)
static func gf_all_won() -> bool:
	var tr: Dictionary = HSU.or_(HSWorld.G.get("trophies"), {}) if HSWorld.G else {}
	return gf_cats().size() > 0 and gf_cats().all(func(c): return HSU.truthy(tr.get("gf:" + c.id)))

const VOTES := { "G1": [100.0, 40.0, 25.0, 15.0, 10.0], "G2": [50.0, 20.0, 12.0, 6.0, 4.0], "G3": [30.0, 12.0, 8.0, 4.0, 2.0], "Jpn1": [50.0, 20.0, 12.0, 6.0, 4.0], "Jpn2": [30.0, 12.0, 8.0, 4.0, 2.0], "Jpn3": [30.0, 12.0, 8.0, 4.0, 2.0], "OP": [8.0, 3.0, 2.0], "": [4.0, 1.0] }
const VOTE_FAV := 5.0
static func votes_of(h: Dictionary, year: float, cat: Variant = null) -> float:
	var v := 0.0
	for r in HSU.or_(h.get("results"), []):
		if r.y != year or (cat and not _fit(cat, r)): continue
		var tab = VOTES.get(HSU.or_(r.get("grade"), ""))
		if tab: v += tab[int(r.pos) - 1] if r.pos >= 1 and r.pos <= tab.size() else 0.0
		if r.get("pop") == 1: v += VOTE_FAV
	return v
static func dc_champ(h: Dictionary, year: float, cat: Variant) -> bool:
	var c = HSU.or_(cat, "classic")
	return gf_wins(h).any(func(g): return g.y == year - 1 and gf_cat_of_name(HSU.or_(g.get("short"), g.race)) == c)
static func g1_wins(h: Dictionary, year: float, cat: Variant = null) -> Array:
	return HSU.or_(h.get("results"), []).filter(func(r): return r.y == year and r.pos == 1 and r.get("grade") == "G1" and (not cat or _fit(cat, r)))

# その年・その区分の順位（週ごとに使い回す）。tier：0 確定・2 票・3 埋め（AI の馬だけ）
static func dc_standing(cat: Variant = null, year: Variant = null) -> Array:
	var G = HSWorld.G
	cat = HSU.or_(cat, "classic"); year = HSU.or_(year, G.year)
	var c := HSWorld.wc()
	if not c.has("dcStand"): c.dcStand = {}
	var ck := "%s:%s" % [cat, HSU.num(year)]
	if c.dcStand.has(ck): return c.dcStand[ck]
	var C: Dictionary = gf_by()[cat]; var wIdx := HSWorld.w_idx(); var sf := "ダ" if C.surface == "ダ" else "芝"
	var list: Array = []; var fill: Array = []
	for h in HSWorld.all():
		if h.get("loc") != "stable" or year - h.born < 3 or h.get("legend"): continue
		var g1 := g1_wins(h, year, cat); var champ := dc_champ(h, year, cat); var votes := votes_of(h, year, cat)
		var mine: bool = h.get("owner") == "P"
		var fhv := fh(h, wIdx, sf)
		if not votes and not champ:
			var apt: float = HSU.or_(h.apt.dirt if C.surface == "ダ" else h.apt.turf, 0.0)
			var near: bool = C.dist >= float(HSU.or_(h.get("distMin"), 0.0)) - 200 and C.dist <= float(HSU.or_(h.get("distMax"), 9999.0)) + 200 and apt >= 70
			var loose: bool = C.dist >= float(HSU.or_(h.get("distMin"), 0.0)) - 600 and C.dist <= float(HSU.or_(h.get("distMax"), 9999.0)) + 800 and apt >= 60
			if not mine and (near or loose): fill.append({ h = h, tier = 3.0 if near else 4.0, votes = 0.0, champ = false, g1 = 0.0, why = "その距離の実力", fh = fhv })
			continue
		var tier := 0.0 if (champ or (mine and g1.size())) else 2.0
		var why: String = "前の年の勝ち馬" if champ else ("%sを勝った" % g1[g1.size() - 1].race if g1.size() else "ファンの票")
		list.append({ h = h, tier = tier, votes = votes, champ = champ, g1 = float(g1.size()), why = why, fh = fhv })
	var by := func(a, b) -> float:
		if a.tier != b.tier: return a.tier - b.tier
		if b.votes != a.votes: return b.votes - a.votes
		if b.fh != a.fh: return b.fh - a.fh
		return -1.0 if a.h.id < b.h.id else 1.0
	HSSort.sort(list, by); HSSort.sort(fill, by)
	var top: Array = []; var rest: Array = []
	var nf := 0
	for x in list + fill:
		var f: bool = HSU.truthy(x.h.get("foreignTrained")) and x.tier > 0
		if top.size() < DC_FIELD and (not f or nf < DC_FOREIGN):
			top.append(x)
			if f: nf += 1
		else: rest.append(x)
	var out: Array = top + rest
	for i in out.size():
		out[i].rank = float(i + 1); out[i].in = i < DC_FIELD
	c.dcStand[ck] = out
	return out
static func dc_cut(cat: Variant, year: Variant) -> Dictionary:
	var l := dc_standing(cat, year)
	var x = l[DC_FIELD - 1] if l.size() >= DC_FIELD else null
	return { votes = 1.0 if x.tier == 3 else x.votes, tier = x.tier } if x else { votes = 1.0, tier = 3.0 }

# ---------- 12月4週が終わったら：招待（HSWorld.next_week から。GF が1つでもあれば GF の週に入る） ----------
static func gf_stage() -> bool:
	var G = HSWorld.G
	if G.mode != "jockey" or G.month != 12 or G.week != 4: return false
	HSWorld.wc().dcStand = {}
	dc_invite()
	return G.get("dc") != null and G.dc.y == G.year and G.dc.get("gf") != null and G.dc.gf.size() > 0
static func dc_invite() -> void:
	var G = HSWorld.G
	if G.mode != "jockey" or (G.get("dc") and G.dc.y == G.year): return
	HSWorld.dirty()
	var gf := {}
	for id in gf_order():
		var l := dc_standing(id, G.year)
		var top: Array = l.slice(0, DC_FIELD)
		var elig: Array = []
		for x in top:
			if x.h.get("owner") == "P": elig.append({ id = x.h.id, why = x.why if x.tier == 0 else "ファンの票 %s位（%s票）" % [HSU.num(x.rank), HSU.num(x.votes)] })
		var ai: Array = []
		for x in top + l.slice(DC_FIELD).filter(func(y): return not y.h.get("foreignTrained")):
			if x.h.get("owner") == "P" or ai.size() >= DC_FIELD + DC_RESERVE: continue
			ai.append(x.h.id)
		gf[id] = { ai = ai, elig = elig, pick = null, ans = null }
	G.dc = { y = G.year, v = 2.0, gf = gf }
	HSWorld.news("%s（%dつ）の招待馬が決まった。" % [DC_NAME, gf_cats().size()], "g1")
	var mineIds := {}
	for id in gf:
		for x in gf[id].elig: mineIds[x.id] = true
	if mineIds.size(): HSWorld.news("%sに%sの招待が届いた！ 出るかどうかを決めてください。" % ["・".join(mineIds.keys().map(func(i): return HSWorld.horse(i).name)), DC_NAME], "g1")
static func _inv(cat: String) -> Variant:
	var G = HSWorld.G
	return G.dc.gf.get(cat) if (G.get("dc") and G.dc.y == G.year and G.dc.get("gf")) else null
static func dc_pending_list() -> Array:
	var G = HSWorld.G
	if G.mode != "jockey": return []
	var out: Array = []
	for c in gf_cats():
		var x = _inv(c.id)
		if x and x.elig.size() and not x.ans and dc_eligible(c.id).size(): out.append(c.id)
	return out
static func dc_pending() -> bool: return dc_pending_list().size() > 0
static func dc_eligible(cat: Variant = null) -> Array:
	var x = _inv(HSU.or_(cat, "classic"))
	if not x: return []
	var out: Array = []
	for e in HSU.or_(x.get("elig"), []):
		var h = HSWorld.horse(e.id)
		if h and h.get("owner") == "P" and h.get("loc") == "stable": out.append({ h = h, why = e.why })
	return out
static func dc_choose(cat: String, id: String) -> Variant:
	var x = _inv(cat)
	if not x: return "招待が来ていない"
	if not dc_eligible(cat).any(func(e): return e.h.id == id): return "この馬は出られない"
	x.pick = id; x.ans = "yes"
	HSWorld._week = null
	return null
static func dc_decline(cat: String) -> Variant:
	var x = _inv(cat)
	if not x: return "招待が来ていない"
	x.pick = null; x.ans = "no"
	HSWorld._week = null
	return null
static func dc_runners(opts: Variant = null) -> Dictionary:
	var wIdx := HSWorld.w_idx(); var out := {}
	var ok := func(h): return h != null and h.get("owner") == "P" and h.get("loc") == "stable"
	for c in gf_cats():
		var x = _inv(c.id)
		if x and x.ans == "yes" and ok.call(HSWorld.horse(x.pick)): out[c.id] = HSWorld.horse(x.pick)
	if opts and opts.get("explicitOnly"): return out
	for c in gf_cats():
		var x = _inv(c.id)
		if not x or x.ans: continue
		var sf := "ダ" if c.surface == "ダ" else "芝"
		var free: Array = dc_eligible(c.id).map(func(e): return e.h)
		free = HSU.stable_sort(free, func(a, b): return fh(a, wIdx, sf) > fh(b, wIdx, sf))
		if free.size(): out[c.id] = free[0]
	return out
static func dc_runner(cat: Variant = null) -> Variant: return dc_runners().get(HSU.or_(cat, "classic"))

static func dc_race(year: float, cat: Variant = null) -> Dictionary:
	var G = HSWorld.G; var C: Dictionary = gf_by()[HSU.or_(cat, "classic")]
	var arima = null
	for r in HSRaces.graded_of(year, 12.0, 4.0):
		if r.name == "有馬記念": arima = r; break
	var race := { name = gf_name(C.id), short = gf_name(C.id), gf = C.id, grade = "GF", region = "JRA", course = C.course, surface = C.surface, dist = C.dist, month = 12.0, week = GF_WEEK, age = "3+", weight = "定量",
		key = "%s-12-%s-GF-%s" % [HSU.num(year), HSU.num(GF_WEEK), C.id], graded = true, invite = true, year = year, prize = arima.prize if arima else 20000.0,
		ground = HSRaces.ground(G.seed, year, 12.0, GF_WEEK, C.course) }
	return race
static func add_special(list: Array, year: float, month: float, week: float) -> void:
	var G = HSWorld.G
	if G.mode != "jockey" or month != 12 or week != GF_WEEK or not G.get("dc") or G.dc.y != year or not G.dc.get("gf"): return
	for c in gf_cats():
		if G.dc.gf.get(c.id): list.append(dc_race(year, c.id))
static func dc_field(race: Dictionary) -> Array:
	var G = HSWorld.G
	if not G.get("dc") or G.dc.y != race.year or not G.dc.get("gf"): return []
	var cat: String = HSU.or_(race.get("gf"), "classic"); var x = G.dc.gf.get(cat)
	if not x: return []
	var me = dc_runners().get(cat)
	var out: Array = [{ horse = me, jockeyName = HSWorld.best_free_jockey(race.key, me.id), mine = true }] if me else []
	var nf := out.filter(func(e): return e.horse.get("foreignTrained")).size()
	for id in x.ai:
		if out.size() >= DC_FIELD: break
		var h = HSWorld.horse(id)
		if not h or h.get("owner") == "P" or h.get("loc") != "stable": continue
		if h.get("foreignTrained") and nf >= DC_FOREIGN: continue
		if h.get("foreignTrained"): nf += 1
		out.append({ horse = h })
	return out

# 自分の馬が GF を勝ったとき（HSWorld.apply_results から）：担当の伝説級が店に並び、初めての区分なら1頭を牧場に
static func on_gf_win(h: Dictionary, race: Dictionary) -> void:
	var G = HSWorld.G
	if not G.get("eraless") or h.get("owner") != "P" or not race.get("gf"): return
	var legends := gf_legends(race.gf)
	if legends.is_empty(): return
	if G.get("unlocked") == null: G.unlocked = []
	var fresh: Array = legends.filter(func(d): return not G.unlocked.has(d.name))
	for d in fresh: G.unlocked.append(d.name)
	if fresh.size(): HSWorld.news("%sを勝った。伝説の名馬 %sが馬の店に並ぶようになった。" % [gf_name(race.gf), "・".join(fresh.map(func(d): return d.name))], "g1")
	if not G.get("gfGift"): G.gfGift = {}
	if G.gfGift.get(race.gf): return
	var d: Dictionary = legends[0]
	var g := HSHorse.from_historic(HSEraless.shift(d, (G.year - GF_GIFT_AGE) - d.born), "gift:" + d.name)
	g.id = HSWorld.new_id(); g.owner = "P"; g.loc = "retired"; g.retiredY = G.year; g.auto = false; g.parentBonus = 0.0; g.legendBought = true; g.gfGift = race.gf
	if HSData.is_foreign(d):
		g.imported = true; g.country = HSU.or_(d.get("country"), "外")
	G.lineup[g.name] = g.born - d.born
	G.horses[g.id] = g
	G.gfGift[race.gf] = d.name
	HSWorld.dirty()
	HSWorld.news("初めての%sの勝利の記念に、%sを牧場に迎えた。オリジナルホースの%sにできる。" % [gf_name(race.gf), d.name, "母" if d.get("sex") == "牝" else "父"], "g1")

# 前の形のセーブ（12月2〜4週に GF を走っていた版。v が無い）を今の形に（js/core/dream.js の dcUpgrade と同じ）
static func dc_upgrade(g: Dictionary) -> void:
	if not g.get("dc") or g.dc.get("v") == 2: return
	if g.dc.y != g.year:
		g.dc = null; return
	g.dc = { y = g.dc.y, v = 2.0, gf = {} } if (g.month == 12 and g.week >= 3) else null
