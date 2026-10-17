# レースの入れ口（模擬）：gdcore の模擬（HSSim。JS と同じ結果になる）をその場で回し、ViewReplay と同じ形で各馬の状態を返す。
# 週の流れの中では、その週の出走表（UiFlow.desc_of が作る見た目の一式と card）から HSWorld.start_sim で模擬を作る（本当のレース・JS と同じ種）。
# 一式が無いとき（出走表から1レースだけ走る）は、記録（replay_race.json）と同じ出走馬・枠・コース・見た目を使う（tools/export_race.js と同じ作り方・同じ種）。
# プレイヤーの操作は HSSim.ctl_*（しごく・引く・ムチ・持ち替え・進路）で模擬へ渡す。0.1 秒の刻みのあいだは補間する。
class_name ViewLive
extends RefCounted

const SEED := 20251130
const YEAR := 2025
const DT := 0.1
const AUTO_START := 0.8          # 合図が無ければ、ゲートが開いてこの秒で出る（出遅れ）

var live := true
var race: Dictionary
var sim                          # HSSim.Sim
var D := 2400.0
var me := 0
var n := 0
var win_t := 0.0
var finish_t: PackedFloat32Array = []
var order: PackedInt32Array = []
var whips: Array = []
var events: Array = []
var skill_fx: Array = []         # [t, 馬, 能力]
var result: Dictionary = {}
var _prev: Array = []
var _cur: Array = []
var _t_cur := 0.0
var _after: Array = []           # 模擬が終わったあと（流して止まる）の各コマ
var start_ret = null
var me_rows: Array = []          # 自分の馬の値（リプレイの計器用）[t, 手綱の段, 気分, 脚の残り, ムチの手（1＝右）, 掛かり, 詰まり, 気合, 競り合い, 巡航の速さ]

func _init(path := "res://assets/replay_race.json", desc = null) -> void:
	if desc is Dictionary:
		_init_card(desc)
		return
	race = JSON.parse_string(FileAccess.get_file_as_string(path))
	D = float(race.track.D)
	me = int(race.me)
	n = race.horses.size()
	race.frames = []
	var rd: Dictionary = race.race
	var r := {"name": rd.name, "short": rd.get("short", rd.name), "grade": rd.grade, "course": rd.course, "surface": rd.surface, "dist": float(rd.dist),
		"ground": rd.ground, "year": float(YEAR), "month": 11.0, "week": 4.0}
	var rng := HSRng.new(SEED)
	# tools/export_race.js と同じ：枠順を決める乱数を先に16回引く
	for i in n:
		rng.next()
	var hist := {}
	for d in HSData.d().historic:
		hist[d.name] = d
	var runners: Array = []
	for i in n:
		var info: Dictionary = race.horses[i]
		var d: Dictionary = hist.get(String(info.name), {})
		var h := HSHorse.from_historic(d, "x%d" % i)
		h.born = float(YEAR - 4)
		runners.append({"horse": h, "jockey": {"name": "—", "skill": 80.0}, "weight": float(info.weight), "num": float(info.num), "frame": float(info.frame),
			"rider": "P" if bool(info.get("mine", i == me)) else null, "mine": bool(info.get("mine", i == me))})
	sim = HSSim.create(r, runners, HSHorse.week_index(YEAR, 11, 4), rng, {"ride": true, "frames": true})
	finish_t.resize(n)
	finish_t.fill(-1.0)
	_cur = _snap()
	_prev = _cur.duplicate(true)

# その週の出走表から（UiFlow.desc_of の一式。card は HSWorld.cards の1件）
func _init_card(desc: Dictionary) -> void:
	race = desc
	D = float(race.track.D)
	me = int(race.me)
	n = race.horses.size()
	race.frames = []
	sim = HSWorld.start_sim(race.card, {"ride": true, "frames": true})
	finish_t.resize(n)
	finish_t.fill(-1.0)
	_cur = _snap()
	_prev = _cur.duplicate(true)

func _snap() -> Array:
	var out: Array = []
	for s in sim.st:
		out.append([s.x, s.lane, s.v, _kak(s), s.ears])
	return out

# 掛かり（0〜1）：模擬の名前が kakari（数）でも headUp でも読む
static func _kak(s) -> float:
	if "headUp" in s:
		return float(s.headUp)
	var k = s.get("kakari")
	return float(k) if (k is float or k is int) else 0.0

# ---- 操作（ゲームの側から） ----
func ctl(name: String, arg = null):
	if sim.over:
		return null
	match name:
		"up":
			# arg＝押した時刻（レースの秒。負はゲートの中。null なら模擬の時刻）
			var was: bool = started()
			var ret = HSSim.ctl_up(sim, arg)
			if not was and started():
				start_ret = ret
			return ret
		"down": return HSSim.ctl_down(sim)
		"whip":
			var ret2 = HSSim.ctl_whip(sim, arg)
			if ret2 != null and ret2 != "swap":
				whips.append([sim.t, 1 if String(arg) == "R" else 0])
			return ret2
		"swap": return HSSim.ctl_swap(sim)
		"lane": return HSSim.ctl_lane(sim, float(arg))
	return null

func started() -> bool:
	return sim.ctl != null and sim.ctl.started

# t まで模擬を進める（t は発走からの秒）
func advance_to(t: float) -> void:
	if t > AUTO_START and not started():
		start_ret = ctl("up")
	while _t_cur < t - 1e-6:
		if not sim.over:
			_prev = _cur
			HSSim.step(sim)
			_cur = _snap()
			_t_cur = sim.t
			_rec_me()
			for j in n:
				var s = sim.st[j]
				if finish_t[j] < 0.0 and s.done and s.finishT != null:
					finish_t[j] = float(s.finishT)
			if sim.over:
				_finish()
		else:
			# 終わったあと：ゴールした馬は少しずつ落とし、まだの馬はその速さでゴールまで走る（記録の書き出しと同じ）
			_prev = _cur
			var nx: Array = []
			for a in _cur:
				var v: float = a[2] if a[0] < D else maxf(0.0, a[2] - 0.16)
				nx.append([a[0] + v * DT, a[1], v, 0.2, 0.5])
			_cur = nx
			_t_cur += DT

func _rec_me() -> void:
	var c = sim.ctl
	if c == null: return
	var s = sim.st[me]
	me_rows.append([snappedf(sim.t, 0.1), snappedf(float(c.gear), 0.01), snappedf(float(c.tension), 0.1), snappedf(float(s.E), 0.001), 1 if c.hand == "R" else 0,
		1 if c.kakariNow else 0, 1 if c.blockedNow else 0, snappedf(float(s.fight), 0.1), 1 if s.duel != null else 0, snappedf(float(s.vc), 0.01)])

# 着順を出すとき：模擬を最後まで進めて結果を作る（ゴールのあと流している間に、まだの馬も決まる）
func finish_now() -> void:
	var guard := 0
	while not sim.over and guard < 20000:
		guard += 1
		HSSim.step(sim)
		for j in n:
			var s = sim.st[j]
			if finish_t[j] < 0.0 and s.done and s.finishT != null:
				finish_t[j] = float(s.finishT)
	if sim.over and order.size() == 0:
		_finish()

func _finish() -> void:
	result = HSSim.finish(sim)
	win_t = float(result.winnerTime)
	var res: Array = []
	var ord: Array = []
	for r in result.results:
		res.append({"pos": int(r.pos), "num": int(r.num), "name": String(r.horse.name), "time": float(r.time), "margin": String(r.margin)})
		for j in n:
			if int(race.horses[j].num) == int(r.num):
				ord.append(j)
				if finish_t[j] < 0.0:
					finish_t[j] = float(r.time)
	race.results = res
	race.winnerTime = win_t
	order = PackedInt32Array(ord)
	events = result.events

func end_t() -> float:
	return 1e9

# t 秒の各馬：[x, lane, v, 頭の上げ具合, 耳]
func horses_at(t: float) -> Array:
	if t <= 0.0:
		var out: Array = []
		for a in _cur:
			out.append([0.0, a[1], 0.0, a[3], a[4]])
		return out
	advance_to(t)
	var k := clampf((t - (_t_cur - DT)) / DT, 0.0, 1.0)
	var res: Array = []
	for j in n:
		var a: Array = _prev[j]
		var b: Array = _cur[j]
		res.append([lerpf(a[0], b[0], k), lerpf(a[1], b[1], k), lerpf(a[2], b[2], k), lerpf(a[3], b[3], k), lerpf(a[4], b[4], k)])
	return res

func me_at(_t: float) -> Dictionary:
	var c = sim.ctl
	var s = sim.st[me]
	return {"gear": c.gear, "tension": c.tension, "E": s.E, "hand": 1 if c.hand == "R" else 0, "kakari": c.kakariNow, "blocked": c.blockedNow, "fight": s.fight, "duel": s.duel != null}

func last_whip(t: float):
	var w = null
	for x in whips:
		if float(x[0]) <= t:
			w = x
	return w

func place_of(j: int) -> int:
	if order.size() == 0:
		# 模擬が終わる前：ゴールした馬の中での順（まだの馬には抜かれない）
		if finish_t[j] < 0.0:
			return 0
		var k := 1
		for i in n:
			if i != j and finish_t[i] >= 0.0 and finish_t[i] < finish_t[j]:
				k += 1
		return k
	return order.find(j) + 1

func ranking(t: float, H: Array) -> Array:
	var idx: Array = range(n)
	idx.sort_custom(func(x, y):
		var fx := finish_t[x] >= 0.0 and finish_t[x] <= t
		var fy := finish_t[y] >= 0.0 and finish_t[y] <= t
		if fx and fy:
			return finish_t[x] < finish_t[y]
		if fx != fy:
			return fx
		return float(H[x][0]) > float(H[y][0]))
	return idx

func telop_at(t: float) -> Array:
	var txt := ""
	var et := -99.0
	for e in sim.events:
		if float(e.t) <= t:
			txt = String(e.text); et = float(e.t)
	return [txt, et]

# 特殊能力の発動（t0〜t の間に出たもの）
func skills_between(t0: float, t: float) -> Array:
	var out: Array = []
	for f in sim.skillFx:
		if float(f.t) > t0 and float(f.t) <= t:
			out.append(f)
	return out
