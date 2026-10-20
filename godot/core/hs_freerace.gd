# フリーレース（js/core/freerace.js の HS.FreeRace と同じ）：番組と関係なく1レースだけ遊ぶ。競馬場・芝ダート・距離・馬場・天気と、出る馬（史実馬・スペシャルホース、18頭まで）を選ぶ。
# 結果はセーブに一切影響しない（馬はすべて写し、乱数はこのレースだけの種から）
#   var card := HSFreeRace.build({ course = "東京", surface = "芝", dist = 2400, ground = "良", entries = [{ kind = "hist", key = "ディープインパクト" }, …], ride = 0, seed = 1 }, null)
#   var sim = HSFreeRace.sim(card, { ride = true })   # → HSSim.step … → HSSim.finish(sim)
class_name HSFreeRace

const YEAR := 2025.0
const MONTH := 6.0
const WEEK := 1.0
const MAX := 18
const GROUNDS := ["良", "稍重", "重", "不良"]
const WEATHERS := ["晴", "曇", "雨", "雪"]
static func w_idx() -> float: return HSHorse.week_index(YEAR, MONTH, WEEK)

# 競馬場（芝・ダートのどちらがあるか）。番組にある競馬場を、レースの多い順に
static func courses() -> Array:
	var n := {}
	for r in HSData.d().races: n[r.course] = n.get(r.course, 0) + 1
	var Cs: Dictionary = HSData.d().courses
	var list: Array = Cs.keys().filter(func(c): return n.has(c))
	list = HSU.stable_sort(list, func(a, b): return n[a] > n[b])
	return list.map(func(c): return { name = c, turf = HSU.truthy(Cs[c].get("turf")), dirt = HSU.truthy(Cs[c].get("dirt")) })
static func dists(course: String, surface: String) -> Array:
	var s := {}
	for r in HSData.d().races:
		if r.course == course and r.surface == surface: s[r.dist] = true
	var out: Array = s.keys(); out.sort()
	return out if out.size() else [1200.0, 1600.0, 2000.0, 2400.0]
static func race(o: Dictionary) -> Dictionary:
	var Cs: Dictionary = HSData.d().courses
	var c: String = o.course if Cs.has(o.get("course")) else "東京"
	var surface := "ダ" if (o.get("surface") == "ダ" and Cs[c].get("dirt")) else ("芝" if Cs[c].get("turf") else "ダ")
	var ds := dists(c, surface)
	var want := float(o.get("dist", 0.0)) if o.get("dist") else 2000.0
	var dist: float
	if ds.has(float(o.get("dist", -1.0))): dist = float(o.dist)
	else:
		dist = ds[0]
		for b in ds:
			if absf(b - want) < absf(dist - want): dist = b
	return { key = "free-%s" % HSU.num(HSU.or_(o.get("n"), 0.0)), name = "フリーレース", short = "フリーレース %s%s%sm" % [c, "ダート" if surface == "ダ" else "芝", HSU.num(dist)],
		course = c, surface = surface, dist = dist, ground = o.ground if GROUNDS.has(o.get("ground")) else "良", weather = o.weather if WEATHERS.has(o.get("weather")) else "晴",
		year = YEAR, month = MONTH, week = WEEK, age = "3+", grade = "", region = "JRA", graded = false, free = true }

static func specials() -> Array: return HSSpecial.list().map(func(x): return x.d)
static func _peak_age(h: Dictionary) -> float:
	var p: Array = HSHorse.PEAK.get(h.get("growth"), HSHorse.PEAK["普通"])
	return HSMath.round_js((p[0] + p[1]) / 2.0)
static func _fresh(h: Dictionary, id: String) -> Dictionary:
	h.id = id; h.erase("cond"); h.fatigue = 0.0; h.erase("at"); h.erase("lastRaceW"); h.results = HSU.or_(h.get("results"), []).slice(-3)
	return h
# spec：{ kind: "mine"|"hist"|"special", key: id か名前 }。snap：{ g, live }（自分の馬を出すとき）
static func horse(spec: Dictionary, snap: Variant) -> Variant:
	if spec.kind == "mine":
		var src = snap.g.horses.get(spec.key) if snap else null
		if not src: return null
		var h := _fresh(src.duplicate(true), "free:m:%s" % src.id)
		h.born = src.born + (YEAR - snap.g.year)
		h._silks = snap.g.player.silks.duplicate(true) if (snap.g.get("player") and snap.g.player.get("silks")) else null
		return h
	var d = null
	if spec.kind == "special":
		for x in specials():
			if x.name == spec.key: d = x; break
	else:
		for x in HSData.d().historic:
			if x.name == spec.key: d = x; break
		if d == null:
			for x in specials():
				if x.name == spec.key: d = x; break
	if not d: return null
	var id := "free:%s:%s" % [spec.kind, d.name]
	var h := _fresh(HSHorse.from_historic(d, id), id)
	if spec.kind == "special":
		h.legend = true; h.born = YEAR - 4.0
		if HSData.is_foreign(d):
			h.foreignTrained = true; h.country = HSU.or_(d.get("country"), "外")
	else: h.born = YEAR - _peak_age(h)
	return h

static var _top: Variant = null
static func _peak_skill(j: Dictionary) -> float:
	var s := 0.0; var y: float = j.from
	while y <= float(HSU.or_(j.get("to"), 2026.0)):
		s = HSU.mx(s, HSWorld.skill_at(j, y)); y += 1.0
	return HSMath.round_js(HSU.or_(s, 70.0))
static func top_jockeys() -> Array:
	if _top != null: return _top
	var seen := {}; var out: Array = []
	for j in HSData.d().get("jockeys", []):
		if seen.has(j.name) or j.region == "地方": continue
		seen[j.name] = true
		out.append({ name = j.name, region = j.region, skill = _peak_skill(j) })
	_top = HSU.stable_sort(out, func(a, b): return a.skill > b.skill).slice(0, 48)
	return _top
static func _hist_jockey(name: String) -> Variant:
	var m = HSData.d().get("historicJockeys", {}).get(name)
	if not m: return null
	if typeof(m) == TYPE_STRING: return m
	if m.get("default"): return m.default
	return m.values()[0] if m.size() else null

# 出走表。o：{ course, surface, dist, ground, weather, entries: [spec], ride: entries の何番目に自分が乗るか（-1 は見るだけ）, seed, n }
static func build(o: Dictionary, snap: Variant = null) -> Variant:
	var rc := race(o)
	var r := HSRng.new(HSU.or_(o.get("seed"), 1.0))
	var wIdx := w_idx()
	var seen := {}
	var runners: Array = []
	var entries: Array = HSU.or_(o.get("entries"), [])
	for k in mini(entries.size(), MAX):
		var spec: Dictionary = entries[k]
		var key := "%s:%s" % [spec.kind, spec.key]
		if seen.has(key): continue
		seen[key] = true
		var h = horse(spec, snap)
		if h: runners.append({ horse = h, jockey = null, rider = "P" if k == o.get("ride") else null, mine = spec.kind == "mine" or k == o.get("ride") })
	if not runners.size(): return null
	var me = null
	for x in runners:
		if x.rider == "P": me = x; break
	if me:
		if snap and snap.get("live") and HSJockey.is_mode(): me.jockey = HSJockey.player_jockey()
		else: me.jockey = { name = HSU.or_(snap.g.jockey.name if (snap and snap.g.get("jockey")) else null, "あなた"), skill = 75.0, region = "", player = true }
	var taken := {}
	if me: taken[me.jockey.name] = true
	for x in runners:
		if x.jockey: continue
		var nm = _hist_jockey(x.horse.name)
		if not nm or taken.has(nm): continue
		var j = null
		for jj in HSData.d().get("jockeys", []):
			if jj.name == nm: j = jj; break
		if not j: continue
		x.jockey = { name = j.name, region = j.region, skill = _peak_skill(j) }; taken[nm] = true
	var pool: Array = top_jockeys().filter(func(j): return not taken.has(j.name)).map(func(j): return j.duplicate())
	var rest: Array = HSU.stable_sort(runners.filter(func(x): return not x.jockey), func(a, b): return HSHorse.overall(HSHorse.cur(a.horse, wIdx)) > HSHorse.overall(HSHorse.cur(b.horse, wIdx)))
	for x in rest:
		var k := mini(pool.size() - 1, r.int_(0, 2))
		if k >= 0:
			x.jockey = pool[k]; pool.remove_at(k)
		else: x.jockey = { name = "騎手未定", skill = 65.0 }
	r.shuffle(runners)
	var n := runners.size()
	for i in n:
		var x = runners[i]
		x.num = float(i + 1); x.frame = HSWorld.frame_of(i + 1, n); x.weight = HSSim.weight_for(x.horse, rc, rc.year)
	HSWorld.set_odds(runners, rc, wIdx, HSRng.new(float(int(HSU.or_(o.get("seed"), 1.0)) ^ 0x2545f491)))
	return { race = rc, runners = runners, seed = float(r.int_(1, 2147483646)), ride = me != null, free = true, wIdx = wIdx }
static func sim(card: Dictionary, opts: Dictionary = {}):
	var o := { frames = true }; o.merge(opts, true)
	return HSSim.create(card.race, card.runners, card.wIdx, HSRng.new(card.seed), o)
static func run(card: Dictionary) -> Dictionary:
	return HSSim.run(card.race, card.runners, card.wIdx, HSRng.new(card.seed), { frames = true })
