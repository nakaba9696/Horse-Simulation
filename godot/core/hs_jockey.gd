# 騎手のゲーム（js/core/jockey.js の HS.Jockey と同じ）：プレイヤーは騎手。乗ったレースの成績・評判・腕前・お手馬・見習いの減量・リーディング・騎手の表彰
# owners.js が包んでいた所（record のあとの馬主の好感度・year_end のあとの名コンビ賞）は、ここで同じ順に呼ぶ
class_name HSJockey

const REGIONS := ["美浦", "栗東"]
const SEI := ["高森", "有馬野", "北沢", "朝倉", "桐生", "春日井", "真壁", "宮園", "久我", "水城", "早瀬", "白樫", "若松", "杉浦", "笹岡", "葛西", "設楽", "大槻", "野々村", "鷹野", "日向", "瀬川", "三春", "倉田", "藤代", "鳴海", "芦川", "榊", "梶原", "浅葉"]
const MEI := ["誠", "修", "剛", "亮", "浩之", "健司", "雅人", "和也", "敏", "康夫", "隆", "昭", "伸也", "英樹", "博", "茂", "徹", "聡", "克己", "直人"]
static func trainer_of(h: Dictionary) -> String:
	var r := HSU.hash_rng("trainer:" + (h.name if h.get("hist") else str(h.id)))
	return r.pick(SEI) + r.pick(MEI)

static func init(opts: Dictionary) -> Dictionary:
	return { name = HSU.or_(opts.get("jockeyName"), HSU.or_(opts.get("name"), "新人騎手")), region = opts.region if REGIONS.has(opts.get("region")) else "美浦",
		debut = HSU.or_(opts.get("year"), 1995.0), skill = 58.0, rep = 8.0,
		total = { rides = 0.0, wins = 0.0, w2 = 0.0, w3 = 0.0, prize = 0.0 }, years = {}, big = [], history = [] }
static func me() -> Variant: return HSWorld.G.get("jockey")
static func is_mode() -> bool: return HSWorld.G != null and HSWorld.G.get("mode") == "jockey" and HSWorld.G.get("jockey") != null
static func player_jockey() -> Dictionary:
	var j = me(); return { name = j.name, region = j.region, skill = HSMath.round_js(j.skill), player = true }

# 見習いの減量（デビュー5年以内、勝ち数で ▲3・△2・☆1）。重賞では付かない
static func allowance(race: Dictionary) -> float:
	var j = me()
	if not j or race.get("graded") or race.get("region") != "JRA": return 0.0
	if HSWorld.G.year - j.debut >= 5: return 0.0
	var w: float = j.total.wins
	return 3.0 if w < 30 else (2.0 if w < 50 else (1.0 if w < 100 else 0.0))
static func allowance_mark(a: float) -> String: return { 3: "▲", 2: "△", 1: "☆" }.get(int(a), "")
static func rep_label(rep: float) -> String:
	return "トップジョッキー" if rep >= 85 else ("一流" if rep >= 65 else ("中堅" if rep >= 45 else ("若手の有望株" if rep >= 25 else "駆け出し")))

# 騎乗依頼（前の版の名残。持ち主の決定 2026-10-15：買った馬だけで走る）は使わない
static func offers() -> Array: return []
static func cancel(raceKey: String) -> void:
	var g = HSWorld.G; var r: Dictionary = g.rides.duplicate(); r.erase(raceKey); g.rides = r
static func my_rides() -> Array:
	var out: Array = []
	for c in HSWorld.cards():
		if not c.ride: continue
		var rn = null
		for x in c.runners:
			if x.get("rider") == "P": rn = x; break
		out.append({ card = c, runner = rn })
	return out

# 全レースの騎手の成績（リーディング）と、プレイヤーの成績・評判・腕前
static func record(race: Dictionary, sim: Dictionary, runners: Array) -> void:
	_record0(race, sim, runners)
	if not HSOwners.on(): return    # owners.js の包み
	var meR = null
	for x in sim.results:
		if x.get("rider") == "P": meR = x; break
	var s := HSOwners.state()
	var a = s.week.acc.get(race.key) if s.get("week") else null
	if not a: return
	if not meR or meR.horse.id != a.horseId: return
	var ex = null
	for x in runners:
		if x.get("rider") == "P": ex = x; break
	HSOwners.on_ride(a.oid, race, meR, ex.get("pop") if ex else null)

static func _record0(race: Dictionary, sim: Dictionary, runners: Array) -> void:
	var g = HSWorld.G
	var y: float = g.year; var yk := HSU.num(y)
	if not g.records.get("jockeys"): g.records.jockeys = {}
	if not g.records.jockeys.has(yk): g.records.jockeys[yk] = {}
	var tab: Dictionary = g.records.jockeys[yk]
	for res in sim.results:
		var nm = res.jockey.name if res.get("jockey") else null
		if not nm or nm == "騎手未定": continue
		if race.get("region") == "海外": continue
		if not tab.has(nm): tab[nm] = [0.0, 0.0, 0.0, 0.0, 0.0]
		var t: Array = tab[nm]
		t[0] += 1.0
		if res.pos <= 3: t[res.pos] += 1.0
		if res.pos <= 5: t[4] = float(HSU.or_(t[4], 0.0)) + HSMath.round_js(HSWorld.race_prize(race, res.pos) * 0.05)
	if not is_mode(): return
	var meR = null
	for x in sim.results:
		if x.get("rider") == "P" or (x.get("jockey") and x.jockey.get("player")): meR = x; break
	if not meR: return
	var j = me()
	if not j.years.has(yk): j.years[yk] = { rides = 0.0, wins = 0.0, w2 = 0.0, w3 = 0.0, prize = 0.0 }
	var yr: Dictionary = j.years[yk]
	for o in [j.total, yr]:
		o.rides += 1.0
		if meR.pos == 1: o.wins += 1.0
		if meR.pos == 2: o.w2 += 1.0
		if meR.pos == 3: o.w3 += 1.0
	var prize := HSWorld.race_prize(race, meR.pos)
	var cut := HSMath.round_js(prize * 0.05)
	j.total.prize += cut; yr.prize += cut; g.player.money += cut
	var n: int = sim.results.size()
	var exp = null
	for x in runners:
		if x.get("rider") == "P": exp = x; break
	var pop: float = (float(HSU.or_(exp.get("pop"), ceilf(n / 2.0)))) if exp else ceilf(n / 2.0)
	var gradeW: float = { G1 = 3.0, G2 = 2.0, G3 = 1.5 }.get(race.get("grade"), 1.0)
	var d: float = 0.12 + (3.0 if meR.pos == 1 else (1.0 if meR.pos == 2 else (0.5 if meR.pos == 3 else 0.0))) * gradeW + (pop - meR.pos) * 0.12
	j.rep = HSU.clamp(j.rep + d * (1.0 - j.rep / 120.0), 0.0, 100.0)
	j.skill = HSU.clamp(j.skill + 0.05 + (0.15 if meR.pos == 1 else 0.0), 0.0, 96.0)
	if not meR.horse.get("filler"):
		if not j.get("mounts"): j.mounts = {}
		if not j.mounts.has(meR.horse.name): j.mounts[meR.horse.name] = { rides = 0.0, wins = 0.0, best = 99.0 }
		var mt: Dictionary = j.mounts[meR.horse.name]
		mt.rides += 1.0
		if meR.pos == 1: mt.wins += 1.0
		mt.best = HSU.mn(mt.best, meR.pos); mt.last = y
	j.history.push_front({ y = y, m = race.month, w = race.week, race = HSU.or_(race.get("short"), race.name), grade = HSRaces.grade_badge(race), horse = meR.horse.name, pos = float(meR.pos), n = float(n), pop = pop })
	if j.history.size() > 300: j.history.resize(300)
	if meR.pos == 1:
		if race.get("graded"): j.big.append({ y = y, race = HSU.or_(race.get("short"), race.name), grade = race.grade, region = race.region, horse = meR.horse.name })
		HSWorld.news("%sに騎乗し%s%sを勝った。通算%s勝。" % [meR.horse.name, HSRaces.label(race), "（" + HSRaces.grade_badge(race) + "）" if race.get("grade") else "", HSU.num(j.total.wins)], "g1" if race.get("grade") == "G1" else "win")
		if j.total.wins == 1: HSWorld.news("初勝利。ここからが始まりだ。", "win")

# 週の頭：自分の馬を、2歳の4月から自動で入厩させる
static func week_start() -> void:
	if not is_mode(): return
	var g = HSWorld.G
	for h in HSWorld.mine("farm"):
		var age: float = g.year - h.born
		if h.get("injury") or h.get("parked") or age < 2 or (age == 2 and g.month < 4): continue
		if not HSWorld.to_stable(h.id):
			if h.get("auto") == null: h.auto = true
			HSWorld.news("%sが入厩した。" % h.name, "info")
	HSSeason.apply_reserves()
	# グランドフェスティバルの招待は12月4週のあと（HSWorld.next_week → HSSeason.gf_stage）
# 引退：年代なしのゲームは牧場に残してオリジナルホースの親にする
static func retire(id: String) -> Dictionary:
	if HSOriginal.on(): return HSOriginal.retire(id)
	var h = HSWorld.horse(id)
	if not h: return { err = "持ち馬ではない" }
	if h.get("owner") == "P": HSHall.on_retire(h)
	var r := HSWorld.retire(id)
	if not r.has("err") and HSWorld.horse(id):
		HSWorld.horse(id).owner = "AI"; HSWorld.dirty()
	return r
# 毎週、評判は少しずつ落ち着く
static func weekly() -> void:
	if not is_mode(): return
	var j = me(); j.rep = HSU.mx(0.0, j.rep - 0.08)

# その年のリーディング（勝ち数の順）
static func leading(year: float) -> Array:
	var tab: Dictionary = HSU.or_(HSWorld.G.records.get("jockeys"), {}).get(HSU.num(year), {})
	var meName = me().name if is_mode() else null
	var rows: Array = []
	for name in tab:
		var t: Array = tab[name]
		rows.append({ name = name, rides = t[0], wins = t[1], w2 = t[2], w3 = t[3], me = is_mode() and name == meName })
	return HSU.stable_sort(rows, func(a, b):
		if a.wins != b.wins: return a.wins > b.wins
		if a.w2 != b.w2: return a.w2 > b.w2
		return a.rides < b.rides)
static func my_rank(year: float) -> Variant:
	var l := leading(year)
	for i in l.size():
		if l[i].me: return i + 1
	return null
# 年の終わり：リーディングの順位・騎手の年度表彰
static func year_end(year: float) -> void:
	_year_end0(year)
	if HSOwners.on(): HSOwners.year_award(year)   # owners.js の包み
static func _year_end0(year: float) -> void:
	var l := leading(year)
	if l.size(): HSWorld.news("%s年のリーディングジョッキーは%s（%s勝）。" % [HSU.num(year), l[0].name, HSU.num(l[0].wins)], "info")
	var tab: Dictionary = HSU.or_(HSWorld.G.records.get("jockeys"), {}).get(HSU.num(year), {})
	var rows: Array = []
	for name in tab:
		var t: Array = tab[name]
		rows.append({ name = name, rides = t[0], wins = t[1], prize = float(HSU.or_(t[4], 0.0)) })
	var best := func(f: Callable, ok: Callable) -> Variant:
		var c: Array = HSU.stable_sort(rows.filter(ok), func(a, b): return f.call(a) > f.call(b))
		return c[0] if c.size() else null
	var aw := {}
	var a1 = best.call(func(x): return x.wins * 1000.0 - x.rides, func(_x): return true)
	var a2 = best.call(func(x): return x.wins / HSU.mx(1.0, x.rides), func(x): return x.rides >= 30)
	var a3 = best.call(func(x): return x.prize, func(_x): return true)
	if a1: aw["最多勝利騎手"] = a1.name
	if a2: aw["最高勝率騎手"] = a2.name
	if a3: aw["最多賞金獲得騎手"] = a3.name
	var g = HSWorld.G
	if not g.records.get("jawards"): g.records.jawards = {}
	g.records.jawards[HSU.num(year)] = aw
	if is_mode():
		for k in aw:
			if aw[k] == me().name: HSWorld.news("%s年の%sに選ばれた。" % [HSU.num(year), k], "g1")
		var k = my_rank(year); var j = me()
		var yr = j.years.get(HSU.num(year))
		if yr: HSWorld.news("%s年のあなた：%s戦%s勝%s。" % [HSU.num(year), HSU.num(yr.rides), HSU.num(yr.wins), ("・リーディング%d位" % k) if k else ""], "g1" if k == 1 else "info")
