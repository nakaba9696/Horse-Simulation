# 週ごとのレース（js/core/races.js の HS.Races と同じ）：重賞はデータから、条件戦は開催場ごとに作る。出走できるか・優先順
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
const CLS_PRIZE := { newcomer = 700.0, maiden = 520.0, C1 = 950.0, C2 = 1400.0, C3 = 1850.0, OP = 2300.0 }
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

# 条件戦を作る（種と日付で毎回同じものになる）
static func conditional_of(seed: float, year: float, month: float, week: float) -> Array:
	var out: Array = []
	var meets = HSData.d().get("meets", {})
	var courses: Array = meets.get(HSU.num(month), []) if meets else []
	var ey := _ey(year)
	for ci in courses.size():
		var course: String = courses[ci]
		var rng := HSU.hash_rng("%s:%s:%s:%s:%s" % [HSU.num(seed), HSU.num(year), HSU.num(month), HSU.num(week), course])
		var slots: Array = []
		if month >= 6: slots.append({ age = "2", cls = "newcomer" if (month <= 8 or rng.chance(0.5)) else "maiden" })
		if month >= 9: slots.append({ age = "2", cls = "maiden" if rng.chance(0.6) else "C1" })
		if month <= 3: slots.append({ age = "3", cls = "newcomer" if rng.chance(0.3) else "maiden" })
		if month <= 9: slots.append({ age = "3", cls = "maiden" })
		if month <= 6: slots.append({ age = "3", cls = "C1" if rng.chance(0.75) else "OP" })
		var olderAge := "4+" if month <= 5 else "3+"
		slots.append({ age = olderAge, cls = "C1" }); slots.append({ age = olderAge, cls = "C2" }); slots.append({ age = olderAge, cls = "C3" if rng.chance(0.6) else "OP" })
		for si in slots.size():
			var sl: Dictionary = slots[si]
			var surface := "芝" if rng.chance(0.55 if sl.cls == "newcomer" else 0.5) else "ダ"
			var ds: Array = DISTS[course][surface]
			if sl.age == "2":
				var lim := 1800.0 if month < 9 else 2000.0
				var f: Array = ds.filter(func(d): return d <= lim)
				ds = f if f.size() else [ds[0]]
			var dist: float = rng.pick(ds)
			var ageLabel: String = "2歳" if sl.age == "2" else ("3歳" if sl.age == "3" else ("3歳以上" if sl.age == "3+" else "4歳以上"))
			var clsLabel: String = "新馬" if sl.cls == "newcomer" else ("未勝利" if sl.cls == "maiden" else ("オープン" if sl.cls == "OP" else HSHorse.class_name_of(sl.cls, ey)))
			var fem: bool = sl.cls != "newcomer" and rng.chance(0.15)
			var r := { key = "%s-%s-%s-c%d-%d" % [HSU.num(year), HSU.num(month), HSU.num(week), ci, si], name = "%s%s%s" % [ageLabel, clsLabel, "（牝）" if fem else ""], short = null, grade = null, cls = sl.cls,
				region = "JRA", course = course, surface = surface, dist = dist, month = month, week = week, age = sl.age }
			if fem: r.sex = "牝"
			r.weight = "馬齢"; r.prize = HSMath.round_js(CLS_PRIZE[sl.cls] * HSU.price_index(year) / 10.0) * 10.0; r.year = year; r.graded = false
			out.append(r)
	return out

static func of_week(seed: float, year: float, month: float, week: float) -> Array:
	return graded_of(year, month, week) + conditional_of(seed, year, month, week)

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
	return "OP" if r.get("cls") == "OP" else ""
static func max_field(race: Dictionary) -> int:
	if race.get("region") == "海外": return 14
	if race.get("region") == "地方": return 16 if race.course == "大井" else 14
	var c = HSData.d().courses.get(race.course)
	var geo = (c.get("dirt") if race.surface == "ダ" else c.get("turf")) if c else null
	if not race.get("graded"): return 14 if (geo and geo.lap < 1700) else 16
	return 16 if (geo and geo.lap < 1700) else 18

# 出走できるか。理由の文字列（できないとき）か null を返す
static func ineligible(horse: Dictionary, race: Dictionary, year: float) -> Variant:
	if race.get("invite"): return "招待馬だけ"
	var age: float = year - horse.born
	var ra = race.get("age")
	if ra == "2" and age != 2: return "年齢"
	if ra == "3" and age != 3: return "年齢"
	if ra == "3+" and age < 3: return "年齢"
	if ra == "4+" and age < 4: return "年齢"
	if age < 2: return "年齢"
	if race.get("sex") == "牝" and horse.get("sex") != "牝": return "牝馬限定"
	if race.get("noGelding") and horse.get("gelding"): return "せん馬は出られない"
	if horse.get("injury"): return "故障中"
	if horse.get("foreignTrained"): return null if race.get("graded") else "外国調教馬"
	var cls := HSHorse.class_of(horse); var rank: int = HSHorse.CLASS_RANK[cls]
	if not race.get("graded"):
		if race.cls == "newcomer": return null if float(HSU.or_(horse.get("starts"), 0.0)) == 0 else "新馬戦はデビュー戦のみ"
		if race.cls == "maiden": return null if rank == 0 else "勝ち上がり済み"
		var need: int = HSHorse.CLASS_RANK[race.cls]
		if rank > need: return "クラスが上"
		return null
	if rank == 0: return "未勝利馬"
	if (ra == "3+" or ra == "4+") and rank < 2 and race.get("grade") != "G3": return "実績が足りない"
	if race.get("region") == "海外" and rank < 4: return "オープン馬のみ"
	return null

# 出走の優先順（大きいほど先）
static func priority(horse: Dictionary, race: Dictionary, year: float, rng: HSRng) -> float:
	var p := 0.0
	var rights = horse.get("rights")
	if rights and rights.get(race.name) == year: p += 1e6
	var g1 := 0
	for g in HSU.or_(horse.get("gradedWins"), []):
		if g.get("grade") == "G1": g1 += 1
	p += g1 * 1e5
	if not race.get("graded") and race.get("cls"):
		# JS では表に無い格（新馬戦の newcomer）は undefined で、差が NaN になる（並べ替えでは「同じ」扱い）。同じにする
		var ra = HSHorse.CLASS_RANK.get(race.cls)
		var ha = HSHorse.CLASS_RANK.get(HSHorse.class_of(horse))
		if ra == null or ha == null: p = NAN   # 乱数は JS と同じく下で引く
		else: p -= (ra - ha) * 5e4
	p += float(HSU.or_(horse.get("earn"), 0.0))
	p += rng.next() * 500.0
	return p
