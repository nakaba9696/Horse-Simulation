# 全開の知らせ（持ち主の決定 2026-10-22「組み合わせでお願いします　スピードゲージも最大にすれば良いと思います」。docs/FEEL.md 3・4・8）
# ・模擬の全開の度合い（ctl.drive）が計器へ渡る：段が DRIVE.from 以下なら 0、上げると 0 より大きく、脚が尽きると 0（GDScript と C++ の両方）
# ・速さの計器：全開の間は最大まで振り切り、抜けたらなめらかに実際の値へ戻る。脚が尽きたら知らせはすぐ消える
# ・振動：入った瞬間に一度大きく、全開の間は蹄の振動が強く長い
# ・音：全開でなければ鳴らず、入った瞬間と全開の間は鳴る
extends RefCounted

func run(t) -> void:
	_sim(t, "gd")
	if HSSim.native_ok():
		_sim(t, "native")
	_drive_obj(t)
	_rumble(t)
	_sfx(t)

# 自分の馬で直線の手前から段をいちばん上まで上げ、ゴールまで走らせる
func _sim(t, backend: String) -> void:
	var keep := HSSim.backend
	HSSim.backend = backend
	var live := ViewLive.new()
	HSSim.backend = keep
	var sim = live.sim
	var tag := "全開(%s)" % HSSim.kind_of(sim)
	t.ok("drive" in sim.ctl, tag + ": ctl に drive がある")
	live.ctl("up", -0.05)
	var me: int = live.me
	var before_max := 0.0      # 段が DRIVE.from 以下の間の drive の最大
	var during_max := 0.0      # 段が DRIVE.from より上・脚が残っている間の最大
	var spent_max := 0.0       # 脚が尽きたあとの最大
	var spent_n := 0
	var last_tap := -9.0
	var guard := 0
	while not sim.over and guard < 4000:
		guard += 1
		var s = sim.st[me]
		var R: float = float(sim.D) - float(s.x)
		if R < float(sim.straight) + 600.0 and float(sim.t) - last_tap > 0.3 and float(sim.ctl.gear) < 1.0:
			HSSim.ctl_up(sim); last_tap = float(sim.t)
		var E0: float = float(s.E)
		var g0: float = float(sim.ctl.gear)
		HSSim.step(sim)
		var d: float = float(sim.ctl.drive)
		var g: float = float(sim.ctl.gear)
		if s.done: break
		if E0 <= 0.0:
			spent_max = maxf(spent_max, d); spent_n += 1
		elif maxf(g0, g) <= float(HSSim.DRIVE.from): before_max = maxf(before_max, d)
		elif bool(s.spurting): during_max = maxf(during_max, d)
	t.eq(before_max, 0.0, tag + ": 段が DRIVE.from 以下は 0")
	t.ok(during_max > 0.5, tag + ": 段をいちばん上にすると 0 より大きい（%.2f）" % during_max)
	t.ok(spent_n > 0, tag + ": 早く全開にして脚が尽きる所まで走った")
	t.eq(spent_max, 0.0, tag + ": 脚が尽きたら 0")
	t.eq(float(sim.ctl.drive), 0.0, tag + ": ゴールしたら 0")

func _drive_obj(t) -> void:
	var d := ViewRideDrive.new()
	var dt := 1.0 / 60.0
	var now := 0.0
	var real_f := 0.35   # 速さの計器の実際の満ち
	t.eq(d.update(0.0, 0.8, false, dt, now), "", "全開: 入る前は何も起きない")
	t.eq(ViewRideDrive.dial_frac(real_f, d.peg), real_f, "全開: 入る前の速さの計器は実際の値")
	t.eq(d.update(0.7, 0.8, false, dt, now), "enter", "全開: 度合いが 0 より大きくなった瞬間に enter")
	t.ok(d.burst(now) > 0.9, "全開: 入った瞬間の光の一打")
	for i in 30:
		now += dt; d.update(0.7, 0.8, false, dt, now)
	t.ok(d.on, "全開: 間は on")
	t.ok(ViewRideDrive.dial_frac(real_f, d.peg) > 0.995, "全開: 速さの計器が最大まで振り切る（%.3f）" % ViewRideDrive.dial_frac(real_f, d.peg))
	t.ok(absf(d.vis - 0.7) < 0.02, "全開: 色の強さは度合いに寄る（%.2f）" % d.vis)
	var d2 := ViewRideDrive.new()
	for i in 30: d2.update(0.3, 0.8, false, dt, i * dt)
	t.ok(d2.vis < d.vis and d2.vis > 0.2, "全開: 度合いが小さいと色は弱い（%.2f < %.2f）" % [d2.vis, d.vis])
	# 段を下げて抜ける：なめらかに戻る
	t.eq(d.update(0.0, 0.6, false, dt, now), "exit", "全開: 段を下げて抜けると exit")
	var mid_peg := d.peg
	for i in 5:
		now += dt; d.update(0.0, 0.6, false, dt, now)
	var mid_f := ViewRideDrive.dial_frac(real_f, d.peg)
	t.ok(mid_f < 0.999 and mid_f > real_f + 0.05, "全開: 抜けて 0.1 秒は戻る途中（%.2f。いきなり落ちない）" % mid_f)
	t.ok(mid_peg > 0.85, "全開: 抜けた瞬間はまだほぼ振り切っている（%.2f）" % mid_peg)
	for i in 60:
		now += dt; d.update(0.0, 0.6, false, dt, now)
	t.ok(absf(ViewRideDrive.dial_frac(real_f, d.peg) - real_f) < 0.005, "全開: 抜けて 1 秒で実際の値に戻る")
	t.ok(d.vis < 0.01, "全開: 抜けたら色も戻る")
	# 脚が尽きて切れる：知らせはすぐ消える（バテの知らせと混ぜない）
	var d3 := ViewRideDrive.new()
	for i in 30: d3.update(1.0, 0.2, false, dt, i * dt)
	t.eq(d3.update(0.0, 0.0, false, dt, 0.5), "spent", "全開: 脚が尽きて切れると spent")
	for i in 6: d3.update(0.0, 0.0, false, dt, 0.5 + (i + 1) * dt)
	t.ok(d3.vis < 0.05 and d3.peg < 0.05, "全開: 脚が尽きたら 0.1 秒で知らせが消える（vis %.2f・peg %.2f）" % [d3.vis, d3.peg])
	t.eq(d3.burst(0.52), 0.0, "全開: 脚が尽きたあとに光の一打を出さない")
	# ゴールしたら消える
	var d4 := ViewRideDrive.new()
	for i in 30: d4.update(1.0, 0.5, false, dt, i * dt)
	d4.update(1.0, 0.5, true, dt, 0.6)
	t.ok(not d4.on, "全開: ゴールしたら off")

func _rumble(t) -> void:
	for k in [1.0, 0.55]:
		var p0 := ViewRideInput.step_pulse(k, 17.0, 1.0, 0.0)
		var p1 := ViewRideInput.step_pulse(k, 17.0, 1.0, 1.0)
		t.ok(p1[0] > p0[0] and p1[1] >= p0[1] and p1[2] > p0[2] and p1[1] + p1[2] > p0[1] + p0[2], "振動: 全開の間は蹄の振動が強く長い（k=%.2f：%s → %s）" % [k, str(p0), str(p1)])
	var p_half := ViewRideInput.step_pulse(1.0, 17.0, 1.0, 0.5)
	t.ok(p_half[1] < ViewRideInput.step_pulse(1.0, 17.0, 1.0, 1.0)[1] or ViewRideInput.step_pulse(1.0, 17.0, 1.0, 1.0)[1] >= 1.0, "振動: 度合いに応じて強まる")
	var amp0 := 0.25 + 0.45 * clampf((12.0 - 8.0) / 9.0, 0.0, 1.0) + 0.3 * 0.3   # 前の式（gallop）
	var q := ViewRideInput.step_pulse(0.85, 12.0, 0.3, 0.0)
	t.ok(q[0] == 55.0 and absf(q[1] - 0.85 * amp0) < 1e-9 and absf(q[2] - 0.85 * amp0 * 0.6) < 1e-9, "振動: 全開でなければ前と同じ（%s）" % str(q))
	var inp := ViewRideInput.new()
	(Engine.get_main_loop() as SceneTree).root.add_child(inp)
	ViewRideInput.trace.clear()
	ViewRideInput.tracing = true
	inp.fx("drive")
	ViewRideInput.tracing = false
	t.ok(ViewRideInput.trace.size() >= 1 and float(ViewRideInput.trace[0][1]) >= 1.0 and float(ViewRideInput.trace[0][2]) >= 1.0 and float(ViewRideInput.trace[0][0]) >= 150.0,
		"振動: 全開に入った瞬間は両方のモーターを最大で一度大きく（%s）" % str(ViewRideInput.trace))
	inp.queue_free()

func _sfx(t) -> void:
	var s := ViewRideSfx.new()
	var e0 := _energy(s.mix(2048))
	t.eq(e0, 0.0, "音: 全開でなければ鳴らない")
	s.enter()
	var e1 := _energy(s.mix(int(ViewRideSfx.RATE * 0.4)))
	t.ok(e1 > 0.01, "音: 入った瞬間の合図が鳴る（%.3f）" % e1)
	s.vis = 1.0
	s.mix(4096)
	var e2 := _energy(s.mix(int(ViewRideSfx.RATE)))
	t.ok(e2 > 0.003, "音: 全開の間は風と息が鳴る（%.4f）" % e2)
	s.vis = 0.3
	s.mix(8192)
	var e3 := _energy(s.mix(int(ViewRideSfx.RATE)))
	t.ok(e3 < e2, "音: 度合いが小さいと小さい（%.4f < %.4f）" % [e3, e2])
	s.stop()
	s.mix(4096)
	t.ok(s.silent(), "音: 脚が尽きたら（stop）すぐ止む")
	s.free()

static func _energy(b: PackedVector2Array) -> float:
	var e := 0.0
	for v in b:
		e += v.x * v.x
	return e / maxf(1.0, b.size())
