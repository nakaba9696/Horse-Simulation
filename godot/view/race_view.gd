# 3D のレース（騎乗）。docs/FEEL.md（騎乗の手ざわり）に合わせる
# レースの入れ口（ViewLive＝gdcore の模擬。無いときは ViewReplay＝記録の再生）から各馬の状態を読み、競馬場・馬・騎手・カメラ・計器を動かす
# 流れ：ゲート（3・2・1。開く 150ms 前からの ↑ は覚えて開いた瞬間に受け付ける）→ 走る（実時間の 1.35 倍）→
#       ゴール板（白い光と振動。時は止めない・遅くしない。着順はまだ出さない）→ 流す（2.4 秒。馬は映像の側で駈歩の 8.5m/s まで落として走り続ける。カメラは斜め横へ回る）→
#       着順（英語の序数を叩きつける）→ A で確定の表 → A で出走表へ。流している間に A で着順へ飛ぶ
# カメラ：JOCKEY CAM（6.4m 後ろ・3.2m 上・横の画角 68°）・HIGH CAM（上へ 0.42rad・1.7 倍引く）・TV CAM。揺れは kick（減衰する正弦。3D のカメラだけ）
# 一時停止：Esc・P・Start。ほかの窓へ移ったら自動で止める
# 撮影：godot --path godot res://scenes/race.tscn -- --out=DIR --shot=秒:カメラ:名前 … --video=始め:終わり:fps:カメラ:名前 --press=秒:行い …（秒はレースの秒）
extends Node3D

const LANE_M := 1.6
const LANE0 := 1.0
const GATE_P := 1.25
const GATE_OPEN := 2.5
const STRIDE := 7.2
const BODY := 1.2
const COUNT := 3.0
const SPEED := 1.35        # 進む速さの倍率（JS の RD.speed。走破タイムの表示は本当の秒）
const COOL := 2.4          # ゴール板から着順を出すまでの実時間（秒）
const COAST_V := 8.5       # ゴールのあとは駈歩のこの速さまで毎秒 0.8m/s ずつ落とし、止めずに走り続ける（持ち主の指摘「ゴールしたあと止まらないで」）
const BUFFER := 0.15       # ゲートの先行入力（開く何秒前からの ↑ を覚えるか）
const VIEWS := ["jockey", "high", "tv"]
const VIEW_NAME := {"jockey": "JOCKEY CAM", "high": "HIGH CAM", "tv": "TV CAM"}
const RACE_CARD := "res://scenes/race_card.tscn"

var src   # ViewLive（模擬）か ViewReplay（記録の再生）
var live := false
var race: Dictionary
var tr: ViewTrack
var course: ViewCourse
var horses: Array[ViewHorse] = []
var kickups: Array[ViewKickup] = []
var font: Font
var env: Environment
var sun: DirectionalLight3D
var cam: Camera3D
var hud: UiRideHud
var input: ViewRideInput
var D := 2400.0
var me := 0
var T := -COUNT            # レースの秒（負はゲートの中）
var rt := 0.0              # 実時間の秒（揺れ・光・ゴールのあとの流れ）
var phase := "gate"        # gate / run / after（ゴールのあと）/ result（確定の表）
var view := "jockey"
var paused := false
var buffered := false
var target := 0            # 照準（レーダーで見る馬）
var fin = null             # ゴール板を過ぎた：{at（実時間）, pos, shown（着順を出した実時間。-1 はまだ）}
var pose_at := -1.0        # ガッツポーズ（実時間）
var whip_at := -99.0       # 自分のムチ（レースの秒）
var coast: Array = []      # ゴールした馬（と模擬が止まったあとの馬）は映像の側で流す {x, v}
var lane_vis: Array = []
var lean: Array = []
var yaw: Array = []
var kicks: Array = []      # 揺れ {t0, dur, hz, ax, ay, fov, roll}
var cam_state := {}
var shots: Array = []
var presses: Array = []
var video := {}
var out_dir := "res://out"
var hud_on := true
var capturing := false
var _fight_armed := true
var _fight_prev := 0.0
var _fx_seen := 0
var _bump_seen = null
var _oriai := {"kakari": false, "fight": false, "high": false}
var _oriai_bin := -1
var _count_shown := 0
var _last_H: Array = []

func _ready() -> void:
	ViewRideInput.ensure_actions()
	font = UiTheme.font()
	live = not OS.get_cmdline_user_args().has("--replay") and ResourceLoader.exists("res://core/hs_sim.gd")
	src = ViewLive.new() if live else ViewReplay.new()
	race = src.race
	D = src.D
	me = src.me
	target = me
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
		var ku := ViewKickup.new()
		h.add_child(ku)
		ku.setup(String(race.race.get("surface", "芝")))
		kickups.append(ku)
		lane_vis.append(null)
		lean.append(0.0)
		yaw.append(0.0)
		coast.append(null)
	horses[me].set_fade(false)
	cam = Camera3D.new()
	cam.near = 0.25
	cam.far = 20000.0
	add_child(cam)
	cam.make_current()
	hud = UiRideHud.new()
	add_child(hud)
	hud.setup(self)
	input = ViewRideInput.new()
	add_child(input)
	input.act.connect(_on_act)
	parse_args()
	if shots.size() > 0 or not video.is_empty():
		capturing = true
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

# ---- 自分の馬の状態（計器が読む。記録の再生のときは記録の値） ----
func me_runner():
	return src.sim.st[me] if live else null

func ctl_obj():
	return src.sim.ctl if live else null

# ---- 揺れ（FEEL.md 2。3D のカメラだけを動かす） ----
func kick(o: Dictionary) -> void:
	var k := {"t0": rt, "dur": 0.3, "hz": 8.0, "ax": 0.0, "ay": 0.0, "fov": 0.0, "roll": 0.0}
	k.merge(o, true)
	kicks.append(k)
	if kicks.size() > 6:
		kicks.pop_front()

func shake_now() -> Dictionary:
	var o := {"x": 0.0, "y": 0.0, "fov": 0.0, "roll": 0.0}
	for i in range(kicks.size() - 1, -1, -1):
		var k: Dictionary = kicks[i]
		var u: float = (rt - float(k.t0)) / float(k.dur)
		if u >= 1.0:
			kicks.remove_at(i)
			continue
		var env_ := (1.0 - u) * (1.0 - u)
		var ph: float = (rt - float(k.t0)) * float(k.hz) * TAU
		o.x += float(k.ax) * env_ * sin(ph)
		o.y += float(k.ay) * env_ * sin(ph * 1.31 + 0.7)
		o.fov += float(k.fov) * env_ * minf(1.0, u * 8.0)
		o.roll += float(k.roll) * env_ * sin(ph * 0.9)
	# 上限（騎乗のカメラ）：横 10cm・縦 5cm・ロール 0.012rad
	o.x = clampf(o.x, -0.1, 0.1)
	o.y = clampf(o.y, -0.05, 0.05)
	o.roll = clampf(o.roll, -0.012, 0.012)
	return o

# ---- 操作 ----
func _on_act(name: String, arg) -> void:
	if paused and name != "pause":
		if name == "ok":
			_toggle_pause()
		return
	match name:
		"up": _do_up()
		"down":
			if fin != null or phase != "run":
				return
			if live:
				src.ctl("down")
			hud.down_fx()
			input.fx("pull")
		"lane":
			if fin != null:
				return
			if live:
				var c = ctl_obj()
				var l0: float = c.lane if c != null else 0.0
				src.ctl("lane", arg)
				if c != null and c.lane != l0 and T >= 0.0:
					input.fx("lane")
					cam_state["lane_kick"] = float(arg)
		"whip": _do_whip(String(arg))
		"swap":
			if fin == null and live:
				src.ctl("swap")
		"view":
			view = VIEWS[(VIEWS.find(view) + 1) % VIEWS.size()]
			cam_state.erase("p")
			hud.flash(VIEW_NAME[view], "")
		"target":
			var order: Array = src.ranking(T, _last_H) if _last_H.size() > 0 else range(src.n)
			var k: int = order.find(target)
			target = order[(k + int(arg) + order.size()) % order.size()]
		"pose":
			if fin != null and pose_at < 0.0:
				pose_at = rt
		"camreset":
			cam_state.erase("p")
			cam_state.erase("u")
		"ok": _do_ok()
		"pause":
			if fin != null:
				_do_ok()
			else:
				_toggle_pause()
		"swap_or_ok":
			if fin != null:
				_do_ok()
			elif live:
				src.ctl("swap")

func _do_up() -> void:
	if fin != null:
		return
	if T < 0.0:
		if T > -BUFFER:
			buffered = true
		return
	if not live:
		hud.up_fx()
		return
	var was: bool = src.started()
	var b = src.ctl("up")
	if not was:
		_start_fx(b)
	hud.up_fx()
	input.fx("push")

func _start_fx(b) -> void:
	if b == "good":
		hud.flash("GOOD START", "good")
		kick({"dur": 0.42, "hz": 6.0, "ay": 0.05, "fov": 3.0})
	elif b == "late":
		hud.flash("LATE START", "bad")
		input.fx("bad")

func _do_whip(side: String) -> void:
	if fin != null or phase != "run":
		return
	var b = src.ctl("whip", side) if live else "ok"
	if b == null or b == "swap":
		return
	input.fx("bad" if b == "yore" else "whip")
	whip_at = T
	var zone := D - _me_x() < tr.st + 200.0
	hud.whip_fx(side, zone)
	kick({"dur": 0.26, "hz": 7.0, "ax": (1.0 if side == "R" else -1.0) * 0.03, "ay": 0.012, "fov": 1.4 if zone else 0.6})

func _do_ok() -> void:
	if fin == null:
		return
	if rt - float(fin.at) < 0.35:
		return
	if float(fin.shown) < 0.0:
		_reveal()
	elif phase != "result" and rt - float(fin.shown) > 0.3:
		phase = "result"
		hud.show_board()
	elif phase == "result" and not capturing:
		get_tree().change_scene_to_file(RACE_CARD)

func _toggle_pause() -> void:
	if fin != null:
		return
	paused = not paused
	hud.paused = paused
	hud.paused_at = rt
	hud.queue_redraw()
	for d in Input.get_connected_joypads():
		Input.stop_joy_vibration(d)

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and not paused and fin == null and not capturing and T > -COUNT:
		_toggle_pause()

# ---- 1コマ進める（遊ぶときも撮るときも同じ。dt は実時間の秒） ----
func advance(dt_real: float) -> void:
	if paused:
		hud.queue_redraw()
		return
	rt += dt_real
	var dt := dt_real * SPEED
	var t0 := T
	T += dt
	if t0 < 0.0:
		# 数え（3・2・1）
		var n := int(ceil(-T))
		if T < 0.0 and n != _count_shown and n <= 3:
			_count_shown = n
		if T >= 0.0:
			phase = "run"
			input.fx("gate")
			hud.flash("START", "go")
			kick({"dur": 0.45, "hz": 6.0, "ay": 0.04, "fov": 2.0})
			if buffered:
				buffered = false
				_do_up()
	var was_started: bool = src.started() if live else true
	var H: Array = src.horses_at(maxf(T, 0.0)) if T > 0.0 else src.horses_at(0.0)
	if live and not was_started and src.started():
		_start_fx(src.start_ret)
	# ゴール板
	if fin == null and src.finish_t[me] >= 0.0 and T >= src.finish_t[me]:
		fin = {"at": rt, "pos": src.place_of(me), "shown": -1.0}
		phase = "after"
		input.fx("cross")
		hud.goal_fx()
	if fin != null and float(fin.shown) < 0.0 and rt - float(fin.at) > COOL:
		_reveal()
	# 流す：ゴールした馬・止まったあとの馬は、映像の側で駈歩の 8.5m/s まで落とし、止めずに走り続ける
	var over: bool = (live and src.sim.over) or (not live and T > src.end_t())
	for j in H.size():
		var done: bool = src.finish_t[j] >= 0.0 and T >= src.finish_t[j]
		if coast[j] == null and (done or over):
			coast[j] = {"x": float(H[j][0]), "v": float(H[j][2])}
		if coast[j] != null:
			var c: Dictionary = coast[j]
			if float(c.v) > COAST_V:
				c.v = maxf(COAST_V, float(c.v) - 0.8 * dt)
			c.x = float(c.x) + float(c.v) * dt
			H[j] = [c.x, H[j][1], c.v, 0.2, 0.5]
	_last_H = H
	_feel(H)
	place(H, dt)
	update_camera(H, dt_real)
	update_hud(H)
	# 振動：蹄の拍子（追うほど・気合が乗るほど強い）
	if T >= 0.0:
		var m: Array = H[me]
		var push := 0.0
		var r = me_runner()
		var c2 = ctl_obj()
		if c2 != null and fin == null:
			push = clampf(float(c2.gear) + (0.4 if r.spurting else 0.0) + maxf(0.0, float(r.fight)) / 200.0, 0.0, 1.0)
		input.gallop(float(m[0]), int(race.horses[me].num), float(m[2]), push)
	course.gate.visible = T < 12.0
	if course.gate.visible:
		course.set_doors(0.0 if T <= 0.0 else clampf(T / 0.35, 0.0, 1.0) * 1.35)

# 着順を出す：模擬を最後まで進めて結果を作る
func _reveal() -> void:
	if fin == null or float(fin.shown) >= 0.0:
		return
	if live:
		src.finish_now()
	fin.pos = src.place_of(me)
	fin.shown = rt
	input.fx("win" if int(fin.pos) == 1 else "finish")
	kick({"dur": 0.36, "hz": 5.0, "ay": 0.05 if int(fin.pos) == 1 else 0.02, "fov": -2.5 if int(fin.pos) == 1 else -1.0})
	if int(fin.pos) == 1 and pose_at < 0.0:
		pose_at = rt + 0.3

# 手ざわり（模擬のとき）：特殊能力・競り合い・ぶつかり・掛かりの振動と揺れ（FEEL.md 3）
func _feel(_H: Array) -> void:
	if not live:
		return
	var sim = src.sim
	while _fx_seen < sim.skillFx.size():
		var f: Dictionary = sim.skillFx[_fx_seen]
		_fx_seen += 1
		var bad := HSSkills.is_bad(String(f.id))
		if int(f.i) == me:
			hud.skill(HSSkills.label(String(f.id)), bad)
			input.fx("bad" if bad else "skill")
		elif absf(float(sim.st[int(f.i)].x) - float(sim.st[me].x)) < 60.0:
			hud.ping(int(f.i), Color("ff9a7a") if bad else Color("7fe6ff"))
	var r = me_runner()
	var c = ctl_obj()
	# 競り合いの気合が乗りきった
	var fv: float = float(r.fight)
	if fin == null and fv >= 50.0 and _fight_armed and fv > _fight_prev:
		_fight_armed = false
		hud.fight_fx()
		input.fx("fight")
		kick({"dur": 0.42, "hz": 9.0, "ax": 0.03, "ay": 0.03, "fov": 1.5})
	if fv < 25.0:
		_fight_armed = true
	_fight_prev = fv
	# ぶつかった（c.bumpT・c.bumpSide がある模擬だけ）
	if c != null and "bumpT" in c and c.bumpT != null and c.bumpT != _bump_seen:
		var first: bool = _bump_seen == null
		_bump_seen = c.bumpT
		if not first or float(sim.t) - float(c.bumpT) < 0.5:
			var sd: float = float(c.bumpSide) if "bumpSide" in c and c.bumpSide != null else 1.0
			kick({"dur": 0.38, "hz": 10.0, "ax": -sd * 0.09, "ay": 0.03, "roll": 0.012})
			input.fx("bump")
			hud.ping(me, Color("ff5a4d"))
	# 掛かり：始まりに1回強く、そのあと不規則にガツガツ（拍子の外れた揺れは結果に関わらない）
	if c != null and r != null and not r.done:
		var fight_now: bool = bool(c.reinFight)
		var kak: bool = bool(c.kakariNow)
		if (kak and not _oriai.kakari) or (fight_now and not _oriai.fight):
			ViewRideInput.play(160, 1.0, 0.3)
		_oriai.kakari = kak
		_oriai.fight = fight_now
		if kak or fight_now:
			var bin := int(floor(rt / 0.11))
			if bin != _oriai_bin:
				_oriai_bin = bin
				var h := fposmod(absf(sin(bin * 12.9898) * 43758.5453), 1.0)
				if h > (0.45 if fight_now else 0.6):
					ViewRideInput.play(50 + roundf(h * 40.0), 0.6 + 0.4 * h, 0.15)

func _me_x() -> float:
	return float(_last_H[me][0]) if _last_H.size() > me else 0.0

# ---- 馬を置く ----
func place(H: Array, dt: float) -> void:
	var gate_now := T <= 0.0
	var gk := 0.0 if gate_now else ViewTrack.smooth(T / GATE_OPEN)
	var c = ctl_obj()
	var r = me_runner()
	for j in horses.size():
		var h := horses[j]
		var st: Array = H[j]
		var x: float = st[0]
		var lane: float = st[1]
		var v: float = st[2]
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
		var pose := -1.0
		if j == me:
			push = 0.0
			if c != null and fin == null and moving:
				push = clampf(float(c.gear) + (0.4 if r.spurting else 0.0), 0.0, 1.0)
			whip = T - whip_at if T - whip_at < 0.5 else -1.0
			pose = rt - pose_at if pose_at >= 0.0 and rt >= pose_at else -1.0
		var ww := 1.0 - ViewTrack.smooth((v - 4.0) / 3.0) if (not gate_now and v > 0.3) else 0.0
		# 手前：コーナーでは内の手前、直線は替えたまま
		var lead_want := h.lead_want
		if moving and absf(f.curv) > 0.002:
			lead_want = 0.0 if tr.sign > 0.0 else 1.0
		var g := {"ph": ph, "sp": sp, "push": push, "t": maxf(T, 0.0) + 3.0, "walk_ph": fposmod(x / ViewGait.WALK_STRIDE + h.num * 0.37, 1.0), "walk_w": ww,
			"whip": whip, "pose": pose, "head_up": float(st[3]), "ears": float(st[4]), "lead_want": lead_want}
		var cd := cam.global_position.distance_to(p)
		g["cam_d"] = cd
		kickups[j].run(v if moving else 0.0, cd < 45.0)
		h.animate(g, dt, cd < 90.0 or j == me)

# ---- カメラ（FEEL.md 2） ----
func update_camera(H: Array, dt: float) -> void:
	var m: Array = H[me]
	var mx: float = m[0]
	var mv: float = m[2]
	var hm := horses[me]
	var u_me: float = lane_vis[me]
	var mode := "gate" if T < 0.0 else view
	var cp: Vector3
	var lk: Vector3
	var vfov := 45.0
	var aspect := 1.6
	var vs := get_viewport().get_visible_rect().size
	if vs.y > 0.0:
		aspect = vs.x / vs.y
	if not cam_state.has("u"):
		cam_state.u = u_me
		cam_state.fov = 46.0
		cam_state.look = 0.0
		cam_state.roll = 0.0
		cam_state.u_prev = u_me
	var ku := 1.0 - exp(-dt * 2.6) if dt > 0.0 else 1.0
	cam_state.u = lerpf(cam_state.u, u_me, ku)
	# 動いている間は動く向きへ少し傾く（最大 0.035rad。毎秒 6 の割合でなじむ）
	var vu: float = (float(cam_state.u) - float(cam_state.u_prev)) / dt if dt > 0.0 else 0.0
	cam_state.u_prev = cam_state.u
	cam_state.roll = lerpf(cam_state.roll, clampf(vu * 0.0175, -0.035, 0.035), 1.0 - exp(-dt * 6.0) if dt > 0.0 else 1.0)
	cam_state.look = lerpf(cam_state.look, input.look * PI / 2.0, minf(1.0, dt * 8.0) if dt > 0.0 else 1.0)
	match mode:
		"gate":
			var n := float(src.n)
			var uc := LANE0 + n / 2.0 * GATE_P
			var fb := tr.frame(D + 17.0)
			var ff := tr.frame(D - 4.0)
			cp = tr.w3(fb, uc, fb.e + 4.6)
			lk = tr.w3(ff, uc, ff.e + 0.9)
			vfov = 50.0
		"tv":
			var res := tv_target(H)
			cp = res[0]; lk = res[1]; vfov = res[2]
		_:
			# JOCKEY CAM：6.4m 後ろ・高さ 3.2m、16m 先の高さ 1.0m を見る。走りの拍子で上下に 5cm
			var qme := mx - BODY
			var camq := qme - 6.4
			var fc := tr.frame(D - camq)
			var fl := tr.frame(D - (qme + 16.0))
			var bob := sin(fposmod(mx / STRIDE, 1.0) * TAU) * 0.05 if (mv > 1.5) else 0.0
			cp = tr.w3(fc, cam_state.u, fc.e + 3.2 + bob)
			lk = tr.w3(fl, float(cam_state.u) * 0.55 + u_me * 0.45, fl.e * 0.4 + fc.e * 0.6 + 1.0)
			# 横の画角 68° 以上
			vfov = rad_to_deg(2.0 * atan(tan(deg_to_rad(34.0)) / aspect))
			var piv := tr.w3(tr.frame(D - qme), u_me, tr.frame(D - qme).e + 1.5)
			var yaw_o: float = cam_state.look
			var pitch_o := 0.0
			var zoom := 1.0
			if mode == "high":
				pitch_o = 0.42
				zoom = 1.7
			# ゴールのあと：1.8 秒かけて横へ 1.05rad 回り、1.4 倍引き、0.04rad 上げる（外ラチ側から斜め横に）
			if fin != null:
				var u := _ease((rt - float(fin.at)) / 1.8)
				var ou := tr.out3(tr.frame(D - qme))
				var off0 := cp - piv
				var sgn := 1.0 if off0.rotated(Vector3.UP, 1.05).dot(ou) > off0.rotated(Vector3.UP, -1.05).dot(ou) else -1.0
				yaw_o += u * 1.05 * sgn
				pitch_o += u * 0.04
				zoom *= 1.0 + 0.4 * u
			if absf(yaw_o) > 1e-4 or absf(pitch_o) > 1e-4 or absf(zoom - 1.0) > 1e-4:
				var off := cp - piv
				var flat := Vector2(off.x, off.z).length() * zoom
				var ang := atan2(off.x, off.z) + yaw_o
				var el := clampf(atan2(off.y, Vector2(off.x, off.z).length()) + pitch_o, -0.05, 1.35)
				var rr := sqrt(flat * flat + off.y * zoom * off.y * zoom)
				cp = piv + Vector3(sin(ang) * cos(el) * rr, sin(el) * rr, cos(ang) * cos(el) * rr)
				var w := clampf(absf(yaw_o) / 0.7 + absf(pitch_o) / 0.8, 0.0, 1.0)
				lk = lk.lerp(piv, w)
	# なめらかに：騎乗のカメラはすぐ追いつき、中継はゆっくり。視点を替えたときは寄せ直す
	var kp := 1.0 - exp(-dt * (2.2 if mode == "tv" else 14.0)) if dt > 0.0 else 1.0
	if not cam_state.has("p") or cam_state.get("mode", "") != mode:
		if cam_state.has("p") and cam_state.get("mode", "") == "gate" and dt > 0.0:
			cam_state.blend = 1.0
		cam_state.p = cp
		cam_state.l = lk
		cam_state.mode = mode
	var blend: float = cam_state.get("blend", 0.0)
	if blend > 0.0:
		kp = minf(kp, 1.0 - exp(-dt * 3.0))
		cam_state.blend = maxf(0.0, blend - dt)
	cam_state.p = (cam_state.p as Vector3).lerp(cp, kp)
	cam_state.l = (cam_state.l as Vector3).lerp(lk, minf(1.0, kp * 1.3))
	cam_state.fov = lerpf(cam_state.fov, vfov, 1.0 - exp(-dt * 3.0) if dt > 0.0 else 1.0)
	# 揺れ（カメラの右・上へずらし、画角とロールを足す）
	var sh := shake_now() if mode != "tv" else {"x": 0.0, "y": 0.0, "fov": 0.0, "roll": 0.0}
	var p: Vector3 = cam_state.p
	var l: Vector3 = cam_state.l
	var fwd := (l - p).normalized()
	var right := fwd.cross(Vector3.UP).normalized()
	p += right * float(sh.x) + Vector3.UP * float(sh.y)
	cam.fov = float(cam_state.fov) + float(sh.fov)
	cam.position = p
	cam.look_at(l + right * float(sh.x), Vector3.UP)
	cam.rotate_object_local(Vector3(0, 0, 1), float(cam_state.roll) * (0.0 if mode == "tv" or mode == "gate" else 1.0) + float(sh.roll))

static func _ease(u: float) -> float:
	if u <= 0.0:
		return 0.0
	if u >= 1.0:
		return 1.0
	return 1.0 - pow(1.0 - u, 3.0)

# TV CAM：先頭集団が入るように内馬場から横に追う。直線では斜め前から
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
	hud.visible = hud_on
	hud.H = H
	hud.order = src.ranking(T, H)
	hud.queue_redraw()
	# 内馬場の大きな画面
	var bl: Array = course.board_labels
	if bl.size() >= 3:
		var lead := 0.0
		for v in H:
			lead = maxf(lead, float(v[0]))
		(bl[0] as Label3D).text = "%s  %s" % [race.race.name, race.race.grade]
		(bl[1] as Label3D).text = ("残り %dm" % int(maxf(0.0, ceil(D - lead)))) if T > 0.0 and lead < D else ("ゴール" if T > 0.0 else "まもなく発走")
		(bl[2] as Label3D).text = UiRaceHud.fmt_time(minf(maxf(T, 0.0), src.win_t if src.win_t > 0.0 else maxf(T, 0.0)))

func _process(delta: float) -> void:
	if capturing:
		return
	advance(minf(delta, 0.1))

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

# 撮影：はじめ（ゲートの中）から決まった刻み（実時間）で進め、撮る秒（レースの秒）で絵を保存する。操作（--press）も同じ刻みで入れる
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
			t += step * SPEED
			i += 1
	list.sort_custom(func(a, b): return a.t < b.t)
	for sh in list:
		var v := String(sh.cam)
		view = v if VIEWS.has(v) else "jockey"
		var tgt: float = sh.t
		if tgt - T > 4.0:
			_jump_to(tgt - 4.0)
		if tgt <= T + 1e-4:
			cam_state.erase("p")
			advance(0.0)
		var guard := 0
		while T < tgt - 1e-4 and guard < 100000:
			_apply_presses()
			advance(minf(step, (tgt - T) / (SPEED)))
			guard += 1
		_apply_presses()
		if not String(sh.name).begins_with(String(video.get("name", "\u0000")) + "_"):
			for ku in kickups:
				ku.warm()
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
		if not pr.done and T >= float(pr.t):
			pr.done = true
			match String(pr.a):
				"ride_up": _on_act("up", null)
				"ride_down": _on_act("down", null)
				"ride_left": _on_act("lane", -1)
				"ride_right": _on_act("lane", 1)
				"ride_whip_r": _on_act("whip", "R")
				"ride_whip_l": _on_act("whip", "L")
				"ride_view": _on_act("view", null)
				"ride_ok": _on_act("ok", null)
				"ride_pause": _on_act("pause", null)

# 早送り：0.5 秒（レースの秒）ずつ進める（操作を入れる秒では止まる）
func _jump_to(t: float) -> void:
	var guard := 0
	while T < t - 1e-6 and guard < 10000:
		guard += 1
		var nt := minf(t, T + 0.5)
		for pr in presses:
			if not pr.done and float(pr.t) > T and float(pr.t) < nt:
				nt = float(pr.t)
		advance(maxf(1e-4, (nt - T) / (SPEED)))
		_apply_presses()
	cam_state.erase("p")
