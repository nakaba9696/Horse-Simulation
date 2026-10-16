# 3D のレース（騎乗）。レースの入れ口（ViewReplay。のちに gdcore の模擬）から各馬の状態を読み、競馬場・馬・騎手・カメラ・計器を動かす
# 流れ：ゲート（発走前の3秒。しごくでスタート）→ 走る → ゴールのあと少し流す（減速）→ 着順（英語）→ 確定の表
# カメラ：BEHIND（自分の馬の後ろ）・JOCKEY（騎手の目）・TV（中継）。揺れは小さくなめらかに（持ち主「ムチうつとガクガクゆれる」への対応：ムチでカメラを揺らさない）
# 操作は ViewRideInput（十字キー・スティック・キーボード）。振動は Input.start_joy_vibration
# 撮影：godot --path godot res://scenes/race.tscn -- --out=DIR --shot=秒:カメラ:名前 … --video=始め:終わり:fps:カメラ:名前 --press=秒:行い …
extends Node3D

const LANE_M := 1.6
const LANE0 := 1.0
const GATE_P := 1.25
const GATE_OPEN := 2.5
const STRIDE := 7.2
const BODY := 1.2
const COUNT := 3.0
const AFTER_END := 9.0     # ゴールしてからこの秒で表を出しきる
const VIEWS := ["behind", "jockey", "tv"]
const VIEW_NAME := {"behind": "BEHIND", "jockey": "JOCKEY", "tv": "TV"}

var src   # ViewLive（模擬）か ViewReplay（記録の再生）
var race: Dictionary
var tr: ViewTrack
var course: ViewCourse
var horses: Array[ViewHorse] = []
var font: Font
var env: Environment
var sun: DirectionalLight3D
var cam: Camera3D
var hud: UiRideHud
var input: ViewRideInput
var D := 2400.0
var me := 0
var T := -COUNT            # レースの秒（負はゲートの中）
var phase := "gate"        # gate / run / after / result
var after_t := -1.0
var view := "behind"
var paused := false
# 自分の馬の操作（記録の再生のあいだの見た目。模擬に替えたら模擬の値を読む）
var ctl := {"gear": 0.0, "hand": 1, "whip_t": -99.0, "lane_off": 0.0, "lane_want": 0.0, "start": "", "pose_t": -1.0, "pushes": 0}
var lane_vis: Array = []   # 各馬の見た目の進路（なめらかに）
var lean: Array = []
var yaw: Array = []
var cam_state := {}
var shots: Array = []
var presses: Array = []
var video := {}
var out_dir := "res://out"
var hud_on := true
var _last_order: Array = []
var _fight_on := false
var _t_prev := -99.0
var _bump_seen = null      # 模擬の c.bumpT（横の馬にぶつかった時刻）
var _bump_t := -99.0
var _bump_side := 0.0

func _ready() -> void:
	ViewRideInput.ensure_actions()
	font = UiTheme.font()
	src = ViewReplay.new() if (OS.get_cmdline_user_args().has("--replay") or not ResourceLoader.exists("res://core/hs_sim.gd")) else ViewLive.new()
	race = src.race
	D = src.D
	me = src.me
	tr = ViewTrack.new(race.track)
	build_env()
	course = ViewCourse.new(tr, self, font)
	course.build()
	course.build_gate(src.n, D)
	for i in src.n:
		var h := ViewHorse.new()
		add_child(h)
		h.setup(race.horses[i], font)
		horses.append(h)
		lane_vis.append(null)
		lean.append(0.0)
		yaw.append(0.0)
	cam = Camera3D.new()
	cam.near = 0.25
	cam.far = 20000.0
	add_child(cam)
	cam.make_current()
	hud = UiRideHud.new()
	add_child(hud)
	hud.setup(race, src, tr)
	input = ViewRideInput.new()
	add_child(input)
	input.act.connect(_on_act)
	parse_args()
	if shots.size() > 0 or not video.is_empty():
		input.enabled = false
		run_capture()

# ---- 光・空・色の調子 ----
func build_env() -> void:
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var pm := PanoramaSkyMaterial.new()
	pm.panorama = load("res://assets/sky/kloofendal_48d_partly_cloudy_puresky_2k.hdr")
	sky.sky_material = pm
	sky.radiance_size = Sky.RADIANCE_SIZE_256
	env.sky = sky
	env.sky_rotation = Vector3(0, deg_to_rad(-25), 0)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_AGX
	env.tonemap_exposure = 1.05
	env.ssao_enabled = true
	env.ssao_radius = 1.2
	env.ssao_intensity = 1.6
	env.ssil_enabled = true
	env.ssil_radius = 4.0
	env.glow_enabled = true
	env.glow_intensity = 0.6
	env.glow_bloom = 0.04
	env.glow_hdr_threshold = 1.1
	env.fog_enabled = true
	env.fog_light_color = Color(0.68, 0.76, 0.88)
	env.fog_density = 0.00016
	env.fog_aerial_perspective = 0.75
	env.fog_sky_affect = 0.0
	env.adjustment_enabled = true
	env.adjustment_contrast = 1.06
	env.adjustment_saturation = 1.12
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	sun = DirectionalLight3D.new()
	sun.light_color = Color(1.0, 0.96, 0.9)
	sun.light_energy = 2.2
	sun.rotation = Vector3(deg_to_rad(-42), deg_to_rad(150), 0)
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	sun.directional_shadow_max_distance = 260.0
	sun.directional_shadow_blend_splits = true
	sun.shadow_blur = 1.2
	add_child(sun)

func u_of(lane: float) -> float:
	return LANE0 + maxf(0.0, lane) * LANE_M

# ---- 操作 ----
func _on_act(name: String, arg) -> void:
	var live: bool = src.get("live") == true
	match name:
		"up":
			if phase == "gate":
				# ゲートの中：開く直前（0.6 秒前から）に押せばよいスタート。早すぎる合図は数えない
				if ctl.start == "" and T > -0.6:
					ctl.start = "good"
				return
			if phase == "run":
				if live:
					var was_started: bool = src.started()
					var r = src.ctl("up")
					if not was_started:
						_start_cue(r)
				ctl.gear = minf(1.0, ctl.gear + 0.12)
				ctl.pushes += 1
				ViewRideInput.play(30, 0.0, 0.22)   # 押した手ごたえ（短く弱く）
		"down":
			if phase == "run":
				if live:
					src.ctl("down")
				ctl.gear = maxf(-1.0, ctl.gear - 0.12)
				ViewRideInput.play(30, 0.18, 0.0)
		"lane":
			if phase == "run" or phase == "gate":
				if live:
					src.ctl("lane", arg)
				else:
					ctl.lane_want = clampf(ctl.lane_want + float(arg), -6.0, 10.0)
		"whip":
			if phase == "run":
				var side := 1 if arg == "R" else 0
				if live:
					var r2 = src.ctl("whip", arg)
					if r2 == "swap":
						ctl.hand = side
					elif r2 != null:
						ctl.whip_t = T
						input.fx("bad" if r2 == "yore" else "whip")
				elif side != ctl.hand:
					ctl.hand = side
				else:
					ctl.whip_t = T
					input.fx("whip")
		"swap":
			if phase == "run":
				if live:
					src.ctl("swap")
				ctl.hand = 1 - ctl.hand
		"view":
			view = VIEWS[(VIEWS.find(view) + 1) % VIEWS.size()]
			cam_state.clear()
			hud.show_cue(VIEW_NAME[view], T, 1.0)
		"pause":
			paused = not paused

func _start_cue(r) -> void:
	if r == "good":
		hud.show_cue("GOOD START", T, 1.4)
	elif r == "late":
		hud.show_cue("LATE START", T, 1.4)
		input.fx("bad")

# ---- 1コマ進める（遊ぶときも撮るときも同じ） ----
func advance(dt: float) -> void:
	var t0 := T
	if phase == "gate":
		T += dt
		if t0 < 0.0 and T >= 0.0:
			phase = "run"
			input.fx("gate")
			if src.get("live") == true:
				if ctl.start == "good":
					_start_cue(src.ctl("up"))
				else:
					hud.show_cue("START", T, 1.0)
			else:
				hud.show_cue("GOOD START" if ctl.start == "good" else "START", T, 1.4)
	else:
		T += dt
	if phase == "run" and src.finish_t[me] >= 0.0 and T >= src.finish_t[me]:
		phase = "after"
		after_t = T - src.finish_t[me]
		input.fx("win" if src.place_of(me) == 1 else "finish")
		ctl.pose_t = 0.0 if src.place_of(me) == 1 else -1.0
	if phase == "after":
		after_t = T - src.finish_t[me]
		if after_t >= AFTER_END:
			phase = "result"
	if ctl.pose_t >= 0.0:
		ctl.pose_t += dt
	T = minf(T, src.end_t() - 0.05)
	# 自分の馬の進路のずれ（見た目）：押した分だけすぐ動き出し、なめらかに止まる
	ctl.lane_off = move_toward(ctl.lane_off, ctl.lane_want, dt * 2.2)
	if phase == "gate":
		ctl.lane_off = 0.0
	var was: bool = src.started() if src.get("live") == true else true
	var H: Array = src.horses_at(T)
	if not was and src.started():
		_start_cue(src.start_ret)
	_feel(H)
	place(H, dt)
	update_camera(H, dt)
	update_hud(H)
	# 振動：蹄の拍子
	if phase == "run" or phase == "after":
		var m: Array = H[me]
		input.gallop(float(m[0]), int(race.horses[me].num), float(m[2]), maxf(0.0, ctl.gear))
	course.gate.visible = T < 12.0
	if course.gate.visible:
		course.set_doors(0.0 if T <= 0.0 else clampf(T / 0.35, 0.0, 1.0) * 1.35)

# 振動：特殊能力・競り合い（模擬のとき）
func _feel(_H: Array) -> void:
	if src.get("live") != true:
		_t_prev = T
		return
	for f in src.skills_between(_t_prev, T):
		if int(f.i) == me:
			input.fx("skill")
	var m: Dictionary = src.me_at(T)
	# 横の馬にぶつかった（模擬の c.bumpT・c.bumpSide。ある模擬だけ）：振動と、馬が横へよれる小さな動き（カメラは揺らさない）
	var c = src.sim.ctl
	if c != null and "bumpT" in c and c.bumpT != null and c.bumpT != _bump_seen:
		_bump_seen = c.bumpT
		_bump_t = T
		_bump_side = float(c.bumpSide) if "bumpSide" in c and c.bumpSide != null else 0.0
		input.fx("bad")
	var on: bool = float(m.get("fight", 0.0)) > 30.0 and bool(m.get("duel", false))
	if on and not _fight_on:
		input.fx("fight")
	_fight_on = on
	_t_prev = T

# ---- 馬を置く ----
func place(H: Array, dt: float) -> void:
	var gate_now := T <= 0.0
	var gk := 0.0 if gate_now else ViewTrack.smooth(T / GATE_OPEN)
	var rec: Dictionary = src.me_at(T)
	for j in horses.size():
		var h := horses[j]
		var st: Array = H[j]
		var x: float = st[0]
		var lane: float = st[1]
		var v: float = st[2]
		if j == me and src.get("live") != true:
			lane = maxf(0.0, lane + ctl.lane_off)
		var u_goal := u_of(lane) if gk >= 1.0 else LANE0 + lane / 0.5 * GATE_P * (1.0 - gk) + (u_of(lane) - LANE0) * gk
		var u: float = u_goal if lane_vis[j] == null or dt <= 0.0 else lerpf(lane_vis[j], u_goal, minf(1.0, dt * 6.0))
		var vlat := 0.0 if lane_vis[j] == null or dt <= 0.0 else (u - float(lane_vis[j])) / dt
		lane_vis[j] = u
		var q := x - BODY
		var s := D - q
		var f := tr.frame(s)
		var p := tr.w3(f, u, f.e)
		var moving := not gate_now and v > 1.5
		var k := minf(1.0, dt * 5.0) if dt > 0.0 else 1.0
		lean[j] = lerpf(lean[j], clampf(absf(f.curv) * v * v / 9.8 * 0.5, 0.0, 0.14) if moving else 0.0, k)
		yaw[j] = lerpf(yaw[j], clampf(atan2(vlat, maxf(v, 4.0)), -0.2, 0.2) if moving else 0.0, k)
		if j == me and T - _bump_t < 0.5:
			# ぶつかった向きと反対へ、短くよれる
			var e := exp(-(T - _bump_t) * 9.0)
			yaw[j] += -_bump_side * 0.1 * e * sin((T - _bump_t) * 22.0) * (1.0 if dt > 0.0 else 0.0)
		var fw := tr.fwd3(f)
		var ou := tr.out3(f)
		var dir := (fw * cos(yaw[j]) + ou * sin(yaw[j])).normalized()
		var pitch := atan((tr.elev(s - 1.0) - tr.elev(s + 1.0)) / 2.0)
		var b := Basis.looking_at(-dir, Vector3.UP)
		b = Basis(dir, tr.sign * lean[j]) * b
		b = b * Basis(Vector3(-1, 0, 0), pitch)
		h.transform = Transform3D(b, p)
		# 走りの形
		var ph := fposmod(x / STRIDE + h.num * 0.137, 1.0)
		var sp := clampf(v / 16.0, 0.35, 1.15) if moving else 0.0
		var push := clampf((v - 15.2) / 2.0, 0.0, 1.0) if moving else 0.0
		var whip := -1.0
		if j == me:
			push = clampf(maxf(ctl.gear, float(rec.gear)), 0.0, 1.0) if moving else 0.0
			whip = T - ctl.whip_t
			var rw = src.last_whip(T)
			if rw != null and T - float(rw[0]) < whip:
				whip = T - float(rw[0])
			if whip > 0.5:
				whip = -1.0
		var ww := 1.0 - ViewTrack.smooth((v - 4.0) / 3.0) if (not gate_now and v > 0.3) else 0.0
		# 手前：コーナーでは内の手前、直線は替えたまま
		var lead_want := h.lead_want
		if moving and absf(f.curv) > 0.002:
			lead_want = 0.0 if tr.sign > 0.0 else 1.0
		var g := {"ph": ph, "sp": sp, "push": push, "t": maxf(T, 0.0) + 3.0, "walk_ph": fposmod(x / ViewGait.WALK_STRIDE + h.num * 0.37, 1.0), "walk_w": ww,
			"whip": whip, "pose": ctl.pose_t if j == me else -1.0, "head_up": float(st[3]), "ears": float(st[4]), "lead_want": lead_want}
		var cd := cam.global_position.distance_to(p)
		g["cam_d"] = cd
		h.animate(g, dt, cd < 90.0 or j == me)

# ---- カメラ ----
func update_camera(H: Array, dt: float) -> void:
	var m: Array = H[me]
	var mx: float = m[0]
	var mv: float = m[2]
	var hm := horses[me]
	var u_me: float = lane_vis[me]
	var mode := view
	if phase == "gate" or (T < 1.2 and view != "tv"):
		mode = "gate" if T < 0.0 else view
	var cp: Vector3
	var lk: Vector3
	var fov := 50.0
	var first := mode == "jockey"
	if first != cam_state.get("first", false) or not cam_state.has("first"):
		cam_state.first = first
		# 自分の馬は網目に消さない（騎手の目のときは騎手の体だけ隠す）
		hm.set_fade(false)
		for n in hm.jockey.head_parts:
			n.visible = not first
	var k := 1.0 - exp(-dt * 6.0) if dt > 0.0 else 1.0
	if not cam_state.has("u"):
		cam_state.u = u_me
		cam_state.bob = 0.0
		cam_state.fov = 52.0
		cam_state.look = 0.0
	cam_state.u = lerpf(cam_state.u, u_me, 1.0 - exp(-dt * 2.6) if dt > 0.0 else 1.0)
	cam_state.look = lerpf(cam_state.look, input.look, 1.0 - exp(-dt * 7.0) if dt > 0.0 else 1.0)
	match mode:
		"gate":
			var n := float(src.n)
			var uc := LANE0 + n / 2.0 * GATE_P
			var fb := tr.frame(D + 17.0)
			var ff := tr.frame(D - 4.0)
			cp = tr.w3(fb, uc, fb.e + 4.6)
			lk = tr.w3(ff, uc, ff.e + 0.9)
			fov = 54.0
		"tv":
			var res := tv_target(H)
			cp = res[0]; lk = res[1]; fov = res[2]
		"jockey":
			# 騎手の目：頭の少し後ろ・上。馬の上下はほとんど吸い、前を見る
			var head := (hm.jockey.nodes[26] as Node3D).global_transform * Vector3(0, 0.16, 0.1)
			var fw := tr.fwd3(tr.frame(D - (mx - BODY)))
			cam_state.bob = lerpf(cam_state.bob, head.y, 1.0 - exp(-dt * 4.0) if dt > 0.0 else 1.0)
			cp = Vector3(head.x, cam_state.bob - 0.08, head.z) - fw * 0.05
			var fl := tr.frame(D - (mx - BODY + 22.0))
			lk = tr.w3(fl, cam_state.u, fl.e + 0.2)
			fov = 62.0
		_:
			# 後ろ：自分の馬の 6.4m 後ろ・3.2m 上。進路を変えると少し遅れてついてくる。上下の揺れは馬の胴の上下を弱めて
			var qme := mx - BODY
			var camq := qme - 5.6
			var fc := tr.frame(D - camq)
			var fl2 := tr.frame(D - (qme + 16.0))
			var body_y := hm.torso.global_position.y - hm.global_position.y - 1.25
			cam_state.bob = lerpf(cam_state.bob, body_y, 1.0 - exp(-dt * 5.0) if dt > 0.0 else 1.0)
			cp = tr.w3(fc, cam_state.u, fc.e + 2.85 + cam_state.bob * 0.35)
			lk = tr.w3(fl2, cam_state.u * 0.55 + u_me * 0.45, fl2.e * 0.4 + fc.e * 0.6 + 1.0)
			# 速さで少しだけ広く（追うほど前へ吸い込まれる感じ）
			fov = 44.0 + clampf((mv - 14.0) / 4.0, 0.0, 1.0) * 3.0
	# 左右を見る：自分の馬のまわりを回り込む
	if absf(cam_state.look) > 0.01 and mode != "tv" and mode != "gate":
		var piv := hm.global_position + Vector3(0, 1.6, 0)
		var off := cp - piv
		off = off.rotated(Vector3.UP, -cam_state.look * 1.25)
		cp = piv + off
		lk = lk.lerp(piv + (lk - piv).rotated(Vector3.UP, -cam_state.look * 1.25), 1.0)
	# なめらかに：位置と見る所をばねで寄せる（騎乗はほぼ追いつく速さ、中継はゆっくり）
	var kp := k if mode != "tv" else (1.0 - exp(-dt * 2.2) if dt > 0.0 else 1.0)
	if not cam_state.has("p") or cam_state.get("mode", "") != mode:
		if cam_state.has("p") and dt > 0.0 and cam_state.get("mode", "") == "gate":
			cam_state.blend = 1.0
		cam_state.p = cp
		cam_state.l = lk
		cam_state.mode = mode
	var blend: float = cam_state.get("blend", 0.0)
	if blend > 0.0:
		kp = minf(kp, 1.0 - exp(-dt * 2.0))
		cam_state.blend = maxf(0.0, blend - dt)
	cam_state.p = (cam_state.p as Vector3).lerp(cp, kp if mode != "behind" and mode != "jockey" or blend > 0.0 else minf(1.0, kp * 3.0))
	cam_state.l = (cam_state.l as Vector3).lerp(lk, minf(1.0, kp * 1.6))
	cam_state.fov = lerpf(cam_state.fov, fov, 1.0 - exp(-dt * 1.5) if dt > 0.0 else 1.0)
	cam.fov = cam_state.fov
	cam.position = cam_state.p
	cam.look_at(cam_state.l, Vector3.UP)

# 中継：先頭集団が入るように内馬場から横に追う。直線では斜め前から（ブラウザ版と同じ）
func tv_target(H: Array) -> Array:
	var lead := -1e9
	for p in H:
		lead = maxf(lead, float(p[0]))
	var qmin := 1e9
	var usum := 0.0
	var cnt := 0
	for j in H.size():
		if float(H[j][0]) >= lead - 24.0:
			qmin = minf(qmin, float(H[j][0])); usum += float(lane_vis[j]); cnt += 1
	var qc := (qmin + lead) / 2.0 - BODY
	var span := lead - qmin + 9.0
	var uc := usum / cnt if cnt > 0 else LANE0
	var fc := tr.frame(D - qc)
	var fov := 34.0
	var hf := 2.0 * atan(tan(deg_to_rad(fov) / 2.0) * 16.0 / 10.0)
	var dist := clampf(span / 2.0 / tan(hf / 2.0) * 1.15, 24.0, 70.0)
	var home: bool = T > 0.0 and (D - lead) < tr.st + 30.0 and (D - lead) > -40.0 and fc.corner == 0
	var cp: Vector3
	if home:
		var d2 := dist * 1.25
		var fa := tr.frame(D - qc - d2 * 0.55)
		cp = tr.w3(fa, uc - d2 * 0.8, fa.e + 4.0 + d2 * 0.1)
	else:
		cp = tr.w3(fc, uc - dist, fc.e + 5.0 + dist * 0.14)
	var lk := tr.w3(fc, uc, fc.e + 1.2)
	return [cp, lk, fov]

func update_hud(H: Array) -> void:
	var order: Array = src.ranking(T, H)
	var rec: Dictionary = src.me_at(T)
	var m: Array = H[me]
	hud.mode = "tv" if view == "tv" else "ride"
	hud.visible = hud_on
	hud.update({"t": T, "H": H, "me_x": m[0], "me_v": m[2], "rank": order.find(me) + 1, "order": order,
		"gear": float(rec.gear) if src.get("live") == true or ctl.pushes == 0 else ctl.gear, "E": rec.E, "tension": rec.tension, "hand": int(rec.hand) if src.get("live") == true else ctl.hand,
		"whip_age": T - ctl.whip_t, "phase": phase, "after_t": after_t if phase == "after" or phase == "result" else -1.0,
		"place": src.place_of(me), "my_time": src.finish_t[me]})
	# 内馬場の大きな画面
	var bl: Array = course.board_labels
	if bl.size() >= 3:
		var lead := 0.0
		for v in H:
			lead = maxf(lead, float(v[0]))
		(bl[0] as Label3D).text = "%s  %s" % [race.race.name, race.race.grade]
		(bl[1] as Label3D).text = ("残り %dm" % int(maxf(0.0, ceil(D - lead)))) if T > 0.0 and lead < D else ("ゴール" if T > 0.0 else "まもなく発走")
		(bl[2] as Label3D).text = UiRaceHud.fmt_time(minf(maxf(T, 0.0), src.win_t))

func _process(delta: float) -> void:
	if shots.size() > 0 or not video.is_empty():
		return
	if paused:
		return
	# 記録の再生の操作の確かめ（--press）
	for pr in presses:
		if not pr.done and T >= pr.t:
			pr.done = true
			_inject(pr.a, true)
		elif pr.done and not pr.get("up", false) and T >= pr.t + 0.12:
			pr.up = true
			_inject(pr.a, false)
	advance(minf(delta, 0.1))

# 操作を入れる（ゲームパッドの十字キーのボタンの出来事として。テストと撮影用）
func _inject(a: String, down: bool) -> void:
	var ev := InputEventJoypadButton.new()
	var btn := {"ride_up": JOY_BUTTON_DPAD_UP, "ride_down": JOY_BUTTON_DPAD_DOWN, "ride_left": JOY_BUTTON_DPAD_LEFT, "ride_right": JOY_BUTTON_DPAD_RIGHT,
		"ride_whip_r": JOY_BUTTON_B, "ride_whip_l": JOY_BUTTON_X, "ride_swap": JOY_BUTTON_A, "ride_view": JOY_BUTTON_BACK}
	ev.button_index = btn.get(a, JOY_BUTTON_DPAD_UP)
	ev.pressed = down
	ev.device = 0
	Input.parse_input_event(ev)

# ---- 撮影 ----
func parse_args() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="):
			out_dir = a.substr(6)
		elif a == "--nohud":
			hud_on = false
		elif a == "--fast":
			_fast()
		elif a.begins_with("--shot="):
			var p := a.substr(7).split(":")
			shots.append({"t": float(p[0]), "cam": p[1], "name": p[2]})
		elif a.begins_with("--video="):
			var q := a.substr(8).split(":")
			video = {"t0": float(q[0]), "t1": float(q[1]), "fps": float(q[2]), "cam": q[3], "name": q[4]}
		elif a.begins_with("--press="):
			var r := a.substr(8).split(":")
			presses.append({"t": float(r[0]), "a": r[1], "done": false})

# 動画を撮るとき（CPU の Vulkan で重いので）：画面の後処理と影を軽く
func _fast() -> void:
	env.ssil_enabled = false
	env.ssr_enabled = false
	env.ssao_enabled = false
	get_viewport().msaa_3d = Viewport.MSAA_DISABLED
	RenderingServer.directional_shadow_atlas_set_size(2048, true)
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	sun.directional_shadow_max_distance = 120.0

# 撮影：はじめ（ゲートの中）から決まった刻みで進め、撮る秒で絵を保存する。操作（--press）も同じ刻みで入れる
func run_capture() -> void:
	DirAccess.make_dir_recursive_absolute(out_dir)
	var step := 1.0 / 30.0
	var list: Array = []
	for sh in shots:
		list.append(sh)
	if not video.is_empty():
		step = 1.0 / float(video.fps)
		var t := float(video.t0)
		var i := 0
		while t <= float(video.t1) + 1e-6:
			list.append({"t": t, "cam": video.cam, "name": "%s_%04d" % [video.name, i]})
			t += step
			i += 1
	list.sort_custom(func(a, b): return a.t < b.t)
	# 撮る秒の手前から（遠い秒へは早送り：カメラのばねが落ち着く 4 秒前から刻む）
	for sh in list:
		view = String(sh.cam) if VIEWS.has(String(sh.cam)) else "behind"
		var target: float = sh.t
		if target - T > 4.0:
			_jump_to(target - 4.0)
		if target <= T + 1e-4:
			cam_state.clear()
			advance(0.0)
		var guard := 0
		while T < target - 1e-4 and guard < 100000:
			_apply_presses()
			advance(minf(step, target - T))
			guard += 1
		for k in 2:
			await RenderingServer.frame_post_draw
		var img := get_viewport().get_texture().get_image()
		img.save_png(out_dir.path_join(String(sh.name) + ".png"))
		if not String(sh.name).contains("_0"):
			print("shot ", sh.name, " t=", snappedf(T, 0.01), " phase=", phase)
	print("me: finish=%.2f place=%d start=%s" % [src.finish_t[me], src.place_of(me), str(src.get("start_ret"))])
	print("done")
	OS.kill(OS.get_process_id())

func _apply_presses() -> void:
	for pr in presses:
		if not pr.done and T >= pr.t:
			pr.done = true
			var name := String(pr.a)
			match name:
				"ride_up": _on_act("up", null)
				"ride_down": _on_act("down", null)
				"ride_left": _on_act("lane", -1)
				"ride_right": _on_act("lane", 1)
				"ride_whip_r": _on_act("whip", "R")
				"ride_whip_l": _on_act("whip", "L")
				"ride_view": _on_act("view", null)

# 早送り：0.5 秒ずつ進める（操作を入れる秒では止まる）。出来事（ゲート・ゴール）はそろう
func _jump_to(t: float) -> void:
	var guard := 0
	while T < t - 1e-6 and guard < 10000:
		guard += 1
		var nt := minf(t, T + 0.5)
		for pr in presses:
			if not pr.done and float(pr.t) > T and float(pr.t) < nt:
				nt = float(pr.t)
		advance(maxf(1e-4, nt - T))
		_apply_presses()
	cam_state.clear()
