# 週ごとのレース（js/core/races.js の HS.Races と同じ）：重賞はデータから、オープン（OP・リステッド）は開催場ごとに作る。出走できるか・優先順
# レースは OP 以上だけ（持ち主の決定 2026-10-20）：新馬戦・未勝利戦・条件戦は無い。OP〜G2 は無条件、G1 は獲得賞金の条件
class_name HSRaces

const DISTS := {
	"東京": { "芝": [1400.0, 1600.0, 1800.0, 2000.0, 2300.0, 2400.0], "ダ": [1300.0, 1400.0, 1600.0, 2100.0] },
	"中山": { "芝": [1200.0, 1600.0, 1800.0, 2000.0, 2200.0, 2500.0], "ダ": [1200.0, 1800.0, 2400.0] },
	"京都": { "芝": [1200.0, 1400.0, 1600.0, 1800.0, 2000.0, 2200.0, 2400.0], "ダ": [1200.0, 1400.0, 1800.0, 1900.0] },
	"阪神": { "芝": [1200.0, 1400.0, 1600.0, 1800.0, 2000.0, 2200.0, 2400.0], "ダ": [1200.0, 1400.0, 1800.0, 2000.0] },
	"中京": { "芝": [1200.0, 1400.0, 1600.0, 2000.0, 2200.0], "ダ": [1200.0, 1400.0, 1800.0, 1900.0] },
	"新潟": { "芝": [1000.0, 1200.0, 1400.0, 1600.0, 1800.0, 2000.0, 2200.0], "ダ": [1200.0, 1800.0] },
	"福島": { "芝": [1200.0, 1800.0, 2000.0, 2600.0], "ダ": [1150.0, 1700.0] },
	"小倉": { "芝": [1200.0, 1800.0, 2000.0, 2600.0], "ダ": [1000.0, 1700.0] },
	"札幌": { "芝": [1200.0, 1500.0, 1800.0, 2000.0, 2600.0], "ダ": [1000.0, 1700.0] },
	"函館": { "芝": [1200.0, 1800.0, 2000.0, 2600.0], "ダ": [1000.0, 1700.0] },
}
const CLS_PRIZE := { OP = 2300.0, L = 2600.0 }   # オープンの1着賞金（万円・1995年の物価）。リステッド（L）は少し高い
const GRADE_RANK := { G1 = 3, G2 = 2, G3 = 1 }

static func _ey(year: float) -> float:
	return float(HSU.ERA) if HSU.ERA else year

# 重賞のデータ（年で有効なもの）
static func graded_of(year: float, month: float, week: float) -> Array:
	var ey := _ey(year)
	var out: Array = []
	for r in HSData.d().get("races", []):
		if r.from <= ey and ey <= float(HSU.or_(r.get("to"), 9999.0)) and r.month == month and r.week == week:
			var x: Dictionary = r.duplicate()
			x.key = "%s-%s-%s-%s" % [HSU.num(year), HSU.num(month), HSU.num(week), r.name]; x.graded = true; x.year = year; x.prize = prize_of(r, ey)
			out.append(x)
	return out
# その年の1着賞金（prizeBy があれば年ごとの値）
static func prize_of(r: Dictionary, year: float) -> float:
	var p: float = HSU.or_(r.get("prize"), 3000.0)
	var by = r.get("prizeBy")
	if by:
		var ks: Array = by.keys()
		ks = HSU.sort_by(ks, func(k): return float(k))
		for k in ks:
			if float(k) <= year: p = by[k]
	return p
static func graded_year(year: float) -> Array:
	var ey := _ey(year)
	var out: Array = []
	for r in HSData.d().get("races", []):
		if r.from <= ey and ey <= float(HSU.or_(r.get("to"), 9999.0)):
			var x: Dictionary = r.duplicate(); x.year = year; out.append(x)
	return HSU.stable_sort(out, func(a, b):
		if a.month != b.month: return a.month < b.month
		if a.week != b.week: return a.week < b.week
		return GRADE_RANK.get(a.grade, 0) > GRADE_RANK.get(b.grade, 0))

# オープン（OP・リステッド）を作る（種と日付で毎回同じものになる）。競馬場ごとに、2歳（6月〜）・3歳（〜9月）・古馬を1つずつと、ときどきもう1つ
# 鍵は 年-月-週-o競馬場-番号（前の版の条件戦は -c…。HSWorld.migrate が予約と出走登録を外す）
static func open_of(seed: float, year: float, month: float, week: float) -> Array:
	var out: Array = []
	var meets = HSData.d().get("meets", {})
	var courses: Array = meets.get(HSU.num(month), []) if meets else []
	for ci in courses.size():
		var course: String = courses[ci]
		var rng := HSU.hash_rng("op:%s:%s:%s:%s:%s" % [HSU.num(seed), HSU.num(year), HSU.num(month), HSU.num(week), course])
		var slots: Array = []
		if month >= 6: slots.append("2")
		if month >= 9 and rng.chance(0.4): slots.append("2")
		if month <= 9: slots.append("3")
		var olderAge := "4+" if month <= 5 else "3+"
		slots.append(olderAge)
		if rng.chance(0.5): slots.append(olderAge)
		for si in slots.size():
			var age: String = slots[si]
			var listed := rng.chance(0.3)
			var surface := "芝" if rng.chance(0.6 if age == "2" else 0.5) else "ダ"
			var ds: Array = DISTS[course][surface]
			if age == "2":
				var lim := 1800.0 if month < 9 else 2000.0
				var f: Array = ds.filter(func(d): return d <= lim)
				ds = f if f.size() else [ds[0]]
			var dist: float = rng.pick(ds)
			var ageLabel: String = "2歳" if age == "2" else ("3歳" if age == "3" else ("3歳以上" if age == "3+" else "4歳以上"))
			var fem: bool = rng.chance(0.15)
			var r := { key = "%s-%s-%s-o%d-%d" % [HSU.num(year), HSU.num(month), HSU.num(week), ci, si], name = "%s%s%s" % [ageLabel, "リステッド" if listed else "オープン", "（牝）" if fem else ""], short = null, grade = null, cls = "OP",
				region = "JRA", course = course, surface = surface, dist = dist, month = month, week = week, age = age }
			r.weight = "馬齢"; r.prize = HSMath.round_js(CLS_PRIZE["L" if listed else "OP"] * HSU.price_index(year) / 10.0) * 10.0; r.year = year; r.graded = false
			if fem: r.sex = "牝"
			if listed: r.listed = true
			out.append(r)
	return out
# 前の版の条件戦の鍵（年-月-週-c…）
static var _re_old: RegEx = null
static func is_old_key(key: Variant) -> bool:
	if _re_old == null: _re_old = RegEx.create_from_string("-c\\d+-\\d+$")
	return _re_old.search(String(key if key != null else "")) != null

static func of_week(seed: float, year: float, month: float, week: float) -> Array:
	return graded_of(year, month, week) + open_of(seed, year, month, week) + HSOwners.open_races(year, month, week)   # owners.js の包み（ミッションに使う名前のあるオープン）

# 馬場状態（週・競馬場ごとに決まる）
static func ground(seed: float, year: float, month: float, week: float, course: String) -> String:
	var rng := HSU.hash_rng("g:%s:%s:%s:%s:%s" % [HSU.num(seed), HSU.num(year), HSU.num(month), HSU.num(week), course])
	var wet := 1.8 if (month == 6 or month == 7 or month == 9) else 1.0
	var r := rng.next()
	if r < 0.05 * wet: return "不良"
	if r < 0.14 * wet: return "重"
	if r < 0.28 * wet: return "稍重"
	return "良"

static func label(r: Dictionary) -> String:
	return r.short if r.get("short") else r.name
# 1984年より前の日本には格付けが無いので「重賞」と出す
static func grade_badge(r: Dictionary) -> String:
	if r.get("grade"):
		if r.get("region") == "JRA" and r.get("year") and r.year < 1984: return "重賞"
		if r.get("region") == "地方": return "Jpn1" if r.grade == "G1" else r.grade.replace("G", "Jpn")
		return r.grade
	if r.get("cls") == "OP": return "L" if r.get("listed") else "OP"
	return ""
static func max_field(race: Dictionary) -> int:
	if race.get("region") == "海外": return 14
	if race.get("region") == "地方": return 16 if race.course == "大井" else 14
	var c = HSData.d().courses.get(race.course)
	var geo = (c.get("dirt") if race.surface == "ダ" else c.get("turf")) if c else null
	if not race.get("graded"): return 14 if (geo and geo.lap < 1700) else 16
	return 16 if (geo and geo.lap < 1700) else 18

# 出走できるか。理由の文字列（できないとき）か null を返す
# ほかの条件を満たしていても、連闘で別の国へは行けない（中1週から。HSFatigue）
static func ineligible(horse: Dictionary, race: Dictionary, year: float) -> Variant:
	var why = ineligible_base(horse, race, year)
	if why: return why
	return HSFatigue.travel_why(horse, race)
static func ineligible_base(horse: Dictionary, race: Dictionary, year: float) -> Variant:
	if race.get("invite"): return "招待馬だけ"
	var age: float = year - horse.born
	var ra = race.get("age")
	if ra == "2" and age != 2: return "年齢"
	if ra == "3" and age != 3: return "年齢"
	if ra == "3+" and age < 3: return "年齢"
	if ra == "4+" and age < 4: return "年齢"
	if ra == "4" and age != 4: return "年齢"
	if age < 2: return "年齢"
	if race.get("sex") == "牝" and horse.get("sex") != "牝": return "牝馬限定"
	if race.get("noGelding") and horse.get("gelding"): return "せん馬は出られない"
	# 外国で調教されている馬は、向こうでの実績で出てくるので賞金を問わない（重賞だけ）
	if horse.get("foreignTrained"): return null if race.get("graded") else "外国調教馬"
	if race.get("region") == "海外": return abroad_why(horse, race, year)
	if race.get("grade") == "G1": return g1_why(horse, race, year)
	return null   # OP・リステッド・G3・G2 は無条件（年齢・性の決まりだけ）

# ---------- G1 の獲得賞金の条件（js/core/races.js と同じ。数は docs/BALANCE.md「8. 出走の条件」） ----------
const G1_EARN := { "2": 2000.0, "3": 3500.0, "older": 5000.0 }
const G1_WHY := "賞金が足りない"
static func g1_need(race: Dictionary, year: float) -> float:
	var ra = race.get("age")
	var k: String = "2" if ra == "2" else ("3" if ra == "3" else "older")
	return HSMath.round_js(G1_EARN[k] * HSU.price_index(year) / 10.0) * 10.0
static func g1_why(horse: Dictionary, race: Dictionary, year: float) -> Variant:
	var rights = horse.get("rights")
	if rights and rights.get(race.name) == year: return null   # トライアルの優先出走権（その年のもの）
	var need := g1_need(race, year); var earn := float(HSU.or_(horse.get("earn"), 0.0))
	return null if earn >= need else "%s（あと%s）" % [G1_WHY, HSU.money(need - earn)]
# 海外のレースの出走条件：ここだけ差し替えればよい（js/core/races.js の R.abroadWhy と同じ）
# 豪州の2歳 G1 は出られない・ほかの2歳の G1 は、自分の馬は一度海外の G1 を勝つ（G.abroadG1）といつでも出られる（AI の馬は無条件）・ほかの G1 は JRA の G1 と同じ獲得賞金・G2 と G3 は無条件（持ち主の決定 2026-10-20）
const AU2_WHY := "豪州の2歳 G1 には出られない"
const ABROAD2_WHY := "海外の G1 を一度勝つと出られる"
static func abroad_ok() -> bool:
	var G = HSWorld.G
	if G == null: return false
	if HSU.truthy(G.get("abroadG1")): return true
	for h in HSU.or_(G.get("horses"), {}).values():
		if h.get("owner") != "P": continue
		for w in HSU.or_(h.get("gradedWins"), []):
			if w.get("grade") == "G1" and w.get("region") == "海外": return true
	return false
static func abroad_why(horse: Dictionary, race: Dictionary, year: float) -> Variant:
	if race.get("grade") != "G1": return null
	if race.get("age") == "2":
		var c = race.get("country")
		if not c:
			var cd = HSData.d().courses.get(race.get("course"))
			c = cd.get("country") if cd else null
		if c == "豪": return AU2_WHY
		return ABROAD2_WHY if horse.get("owner") == "P" and not abroad_ok() else null
	return g1_why(horse, race, year)

# 出走の優先順（大きいほど先）
static func priority(horse: Dictionary, race: Dictionary, year: float, rng: HSRng) -> float:
	var p := 0.0
	var rights = horse.get("rights")
	if rights and rights.get(race.name) == year: p += 1e6   # トライアルの優先出走権
	var g1 := 0
	for g in HSU.or_(horse.get("gradedWins"), []):
		if g.get("grade") == "G1": g1 += 1
	p += g1 * 1e5
	p += float(HSU.or_(horse.get("earn"), 0.0))   # あとは獲得賞金の順（フルゲートを超えたら下から除外）
	p += rng.next() * 500.0
	return p
