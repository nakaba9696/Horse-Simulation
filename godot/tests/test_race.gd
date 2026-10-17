# 模擬が JS と同じ結果になるか（godot/tests/golden/races.json。tools/golden_race.js が作る）。
# 出走馬を同じ作り方で作り、同じ種・同じ操作の列で回して、10刻みごとの状態の指紋・着順・タイム・実況・特殊能力の発動を比べる
extends RefCounted

const H := preload("res://core/hs_math.gd")

static func _state(sim) -> String:
	var parts := PackedStringArray()
	for s in sim.st: parts.append(H.hex(s.x) + H.hex(s.lane) + H.hex(s.v) + H.hex(s.E))
	if sim.ctl: parts.append(H.hex(sim.ctl.tension) + H.hex(sim.ctl.gear) + H.hex(sim.ctl.lane) + H.hex(sim.ctl.surge) + H.hex(-1.0 if sim.ctl.bumpT == null else float(sim.ctl.bumpT)) + H.hex(sim.ctl.bumpSide))
	return "".join(parts)
static func _sha(s: String) -> String:
	return s.sha256_text().left(16)

static func make_horse(spec: Dictionary, id: String) -> Dictionary:
	var h: Dictionary
	if spec.kind == "filler":
		h = HSHorse.make_filler(HSRng.new(spec.seed), spec.opts)
	else:
		var src: Dictionary = {}
		for d in HSData.d()["legendsExtra" if spec.kind == "legend" else "historic"]:
			if d.name == spec.name: src = d; break
		var d := src
		if spec.get("d"):
			d = src.duplicate(); d.merge(spec.d.duplicate(true), true)
		h = HSHorse.from_historic(d, id)
	if spec.get("set"): h.merge(spec.set.duplicate(true), true)
	return h

func run(t) -> void:
	var g: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://tests/golden/races.json"))
	for cs in g.cases:
		_case(t, cs)

func _case(t, cs: Dictionary) -> void:
	var name: String = cs.name
	var runners: Array = []
	var hd: Array = []
	for x in cs.card:
		var h := make_horse(x.spec, x.id)
		hd.append(HSData.digest(h))
		runners.append({ horse = h, jockey = x.jockey, rider = x.rider, num = x.num, frame = x.frame, weight = x.weight })
	var bad_h := 0
	for i in hd.size():
		if hd[i] != cs.horseDigest[i]:
			bad_h += 1
			if bad_h == 1: print("    馬が違う：", runners[i].horse.name, " ", JSON.stringify(runners[i].horse).left(600))
	t.eq(bad_h, 0, "race %s: 出走馬の作り方" % name)
	var sim := HSSim.create(cs.race, runners, cs.wIdx, HSRng.new(cs.seed), cs.opts)
	t.eq(H.hex(sim.paceF), cs.paceF, "race %s: ペース" % name)
	var acts: Array = cs.actions
	var ai := 0
	var bad_act := 0
	var hashes: Array = []
	var first_bad := -1
	var bumps := 0; var last_bump = null
	while true:
		while ai < acts.size() and int(acts[ai][0]) == sim.step:
			var a: Array = acts[ai]
			var ret
			match a[1]:
				"up": ret = HSSim.ctl_up(sim)
				"down": ret = HSSim.ctl_down(sim)
				"whip": ret = HSSim.ctl_whip(sim, a[2])
				"swap": ret = HSSim.ctl_swap(sim)
				"lane": ret = HSSim.ctl_lane(sim, a[2])
			if ret != a[3]: bad_act += 1
			ai += 1
		var done := HSSim.step(sim)
		if sim.ctl and sim.ctl.bumpT != last_bump:
			bumps += 1; last_bump = sim.ctl.bumpT
		if sim.step % 10 == 0:
			var hh := _sha(_state(sim))
			hashes.append(hh)
			if first_bad < 0 and (hashes.size() > cs.hashes.size() or hh != cs.hashes[hashes.size() - 1]): first_bad = sim.step
		if done: break
	t.eq(ai, acts.size(), "race %s: 操作を全部使った" % name)
	t.eq(bad_act, 0, "race %s: 操作の返り値" % name)
	if first_bad >= 0:
		var cp := int(floor((first_bad - 1) / 100.0)) * 100
		print("    %s：%d 刻みでずれた（JS は %d 刻み）" % [name, first_bad, cs.steps])
		# ずれの手がかり：その前の 100 刻みの全馬の値
		if cs.checkpoints.has(str(cp)): print("    ", cp, " 刻みの JS の値：", JSON.stringify(cs.checkpoints[str(cp)]).left(300))
	t.eq(sim.step, int(cs.steps), "race %s: 刻みの数" % name)
	t.eq(float(bumps), float(cs.bumps), "race %s: 横に馬がいて止まった回数" % name)
	t.eq(first_bad, -1, "race %s: 毎刻みの位置・速さ・スタミナ" % name)
	t.eq(_sha(_state(sim)), cs.final, "race %s: 最後の状態" % name)
	var res := HSSim.finish(sim)
	var rs: Array = []
	for x in res.results:
		rs.append({ pos = float(x.pos), num = x.num, time = H.hex(x.time), margin = x.margin, lengths = H.hex(x.lengths), last3f = H.hex(x.last3f) if x.last3f != null else null, endE = H.hex(x.endE), power = H.hex(x.power), late = x.late, blocked = x.blocked })
	t.eq(rs, cs.results, "race %s: 着順・タイム・着差" % name)
	t.eq(HSU.time(res.winnerTime), cs.winnerTime, "race %s: 勝ちタイム" % name)
	var ev: Array = []
	for e in res.events: ev.append([H.hex(e.t), e.text, e.kind])
	t.eq(ev, cs.events, "race %s: 実況" % name)
	var fx: Array = []
	for f in sim.skillFx: fx.append([H.hex(f.t), float(f.i), f.id])
	t.eq(fx, cs.skillFx, "race %s: 特殊能力の発動" % name)
	var trig: Array = []
	for s in sim.st: trig.append(s.trig)
	t.eq(trig, cs.trig, "race %s: 発動の特殊能力" % name)
	if cs.frames != null:
		var parts := PackedStringArray()
		for f in res.frames:
			var ps := PackedStringArray()
			for p in f.p: ps.append("[\"%s\",\"%s\",\"%s\"]" % [H.hex(p[0]), H.hex(p[1]), H.hex(p[2])])
			parts.append("[\"%s\",[%s]]" % [H.hex(f.t), ",".join(ps)])
		t.eq(_sha("[" + ",".join(parts) + "]"), cs.frames, "race %s: 描画のコマ" % name)
