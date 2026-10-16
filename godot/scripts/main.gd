# ターフの系譜：Godot の試作。tools/export_race.js が書き出したレースの記録（data/race.json）を再生する。
# 遊び方：1＝中継のカメラ・2＝騎乗のカメラ・スペース＝止める・←→＝5秒戻す／進める・↑↓＝速さ・R＝はじめから
# 撮影：godot --path godot -- --out=DIR --shot=秒:tv|ride:名前 ... --seq=始め:終わり:枚数:tv|ride:名前
extends Node3D

const LANE_M := 1.6
const LANE0 := 1.0
const GATE_P := 1.25
const GATE_OPEN := 2.5
const STRIDE := 7.2
const BODY := 1.2      # カメラの基準（ブラウザ版と同じ）
const NOSE := 1.45     # 馬の根（胴のまん中）から鼻先まで

var race: Dictionary
var tr: TrackGeo
var course: CourseBuilder
var horses: Array = []          # [{node, info, fin, mine}]
var frames: Array
var dt_rec := 0.1
var D := 2400.0
var winT := 0.0
var me := 0
var T := -3.0
var speed := 1.0
var paused := false
var cam_mode := "tv"
var cam: Camera3D
var hud: RaceHud
var font: Font
var env: Environment
var mem := {"p": null, "l": null, "camU": null, "mode": ""}
var shots: Array = []
var out_dir := "res://out"
var show_hud := true

func _ready() -> void:
	font = load("res://assets/fonts/NotoSansJP_700Bold.ttf")
	race = JSON.parse_string(FileAccess.get_file_as_string("res://data/race.json"))
	frames = race.frames
	dt_rec = race.dt
	D = race.track.D
	winT = race.winnerTime
	me = int(race.me)
	tr = TrackGeo.new(race.track)
	build_env()
	course = CourseBuilder.new(tr, self, font)
	course.build()
	var fin := {}
	for r in race.results:
		fin[int(r.num)] = float(r.time)
	var scene: PackedScene = load("res://assets/horse/Horse.gltf")
	for i in race.horses.size():
		var info: Dictionary = race.horses[i]
		var h := HorseRig.new()
		add_child(h)
		h.setup(info, scene, font)
		horses.append({"node": h, "info": info, "fin": fin.get(int(info.num)), "mine": i == me})
	cam = Camera3D.new()
	cam.near = 0.3
	cam.far = 20000.0
	add_child(cam)
	cam.make_current()
	hud = RaceHud.new()
	add_child(hud)
	hud.setup(font, race, horses)
	parse_args()
	print("built in ", Time.get_ticks_msec(), " ms")
	if shots.size() > 0:
		run_shots()

# ---- 光・空・色の調子 ----
func build_env() -> void:
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var pm := PanoramaSkyMaterial.new()
	pm.panorama = load("res://assets/sky/kloofendal_48d_partly_cloudy_puresky_2k.hdr")
	pm.energy_multiplier = 1.0
	sky.sky_material = pm
	sky.radiance_size = Sky.RADIANCE_SIZE_256
	env.sky = sky
	env.sky_rotation = Vector3(0, deg_to_rad(-25), 0)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 1.0
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_AGX
	env.tonemap_exposure = 1.05
	env.ssao_enabled = true
	env.ssao_radius = 1.2
	env.ssao_intensity = 1.6
	env.ssao_detail = 0.6
	env.ssil_enabled = true
	env.ssil_radius = 4.0
	env.ssr_enabled = true
	env.ssr_max_steps = 48
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
	var sun := DirectionalLight3D.new()
	sun.light_color = Color(1.0, 0.96, 0.9)
	sun.light_energy = 2.2
	sun.rotation = Vector3(deg_to_rad(-42), deg_to_rad(150), 0)
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	sun.directional_shadow_max_distance = 320.0
	sun.directional_shadow_blend_splits = true
	sun.shadow_blur = 1.2
	sun.light_angular_distance = 0.6
	add_child(sun)

# ---- 記録から位置を引く ----
func pos_at(t: float) -> Array:
	var n := frames.size()
	if t <= 0.0:
		var out: Array = []
		for h in horses:
			out.append([0.0, (int(h.info.num) - 1) * 0.5, 0.0])
		return out
	var fi := t / dt_rec
	var i := clampi(int(floor(fi)), 0, n - 2)
	var k := clampf(fi - i, 0.0, 1.0)
	var a: Array = frames[i].p
	var b: Array = frames[i + 1].p
	var res: Array = []
	for j in a.size():
		var pa: Array = a[j]
		var pb: Array = b[j]
		res.append([lerpf(pa[0], pb[0], k), lerpf(pa[1], pb[1], k), lerpf(pa[2], pb[2], k)])
	return res

func u_of(lane: float) -> float:
	return LANE0 + maxf(0.0, lane) * LANE_M

# 馬の置き場所（ゲートの間隔から進路へ寄せる）
func view_at(t: float) -> Array:
	var P := pos_at(t)
	var gk := 0.0 if t <= 0.0 else TrackGeo.smooth(t / GATE_OPEN)
	var out: Array = []
	for j in P.size():
		var x: float = P[j][0]
		var lane: float = P[j][1]
		var v: float = P[j][2]
		var u := u_of(lane) if gk >= 1.0 else LANE0 + lane / 0.5 * GATE_P * (1.0 - gk) + (u_of(lane) - LANE0) * gk
		out.append({"x": x, "lane": lane, "v": v, "u": u, "s": D - (x - BODY)})
	return out

# ---- 馬を置く ----
func place(t: float) -> Array:
	var V := view_at(t)
	var V2 := view_at(t + 0.1)
	var gate_now := t <= 0.0
	for j in horses.size():
		var h: HorseRig = horses[j].node
		var st: Dictionary = V[j]
		var x: float = st.x
		var v: float = st.v
		var s := D - (x - NOSE)
		var f := tr.frame(s)
		var p := tr.w3(f, st.u, f.e)
		var moving := not gate_now and v > 1.5
		var fw := tr.fwd3(f)
		var ou := tr.out3(f)
		# 進路を変える向きへ少し向く・坂で前後に傾く・コーナーで内へ傾く
		var vlat: float = (V2[j].u - st.u) / 0.1 if moving else 0.0
		var dir := (fw * maxf(v, 4.0) + ou * vlat).normalized()
		dir.y = (tr.elev(s + 1.0) - tr.elev(s - 1.0)) * -0.5
		dir = dir.normalized()
		var up := Vector3.UP
		var xa := up.cross(dir).normalized()
		var b := Basis(xa, dir.cross(xa).normalized(), dir)
		var lean := clampf(absf(f.curv) * v * v / 9.8 * 0.5, 0.0, 0.14) if moving else 0.0
		b = Basis(dir, tr.sign * lean) * b
		h.transform = Transform3D(b, p)
		var ph := fposmod(x / STRIDE + int(h.num) * 0.137, 1.0)
		h.pose(ph, moving, t)
	course.gate.visible = t < 12.0
	if course.gate.visible:
		course.set_doors(0.0 if gate_now else clampf(t / 0.35, 0.0, 1.0) * 1.35)
	return V

# ---- カメラ（ブラウザ版 race3d.js と同じ決め方） ----
func cam_target(t: float, V: Array, mode: String, dt: float) -> Array:
	var gate_now := t <= 0.0
	var aspect := 16.0 / 9.0
	if mode == "tv":
		var fov := 34.0
		var lead := -1e9
		for p in V:
			lead = maxf(lead, p.x)
		var qmin := 1e9
		var usum := 0.0
		var cnt := 0
		for p in V:
			if p.x >= lead - 24.0:
				qmin = minf(qmin, p.x); usum += p.u; cnt += 1
		var qc := (qmin + lead) / 2.0 - BODY
		var span := lead - qmin + 9.0
		var uc := usum / cnt if cnt > 0 else LANE0
		var fc := tr.frame(D - qc)
		var hf := 2.0 * atan(tan(deg_to_rad(fov) / 2.0) * aspect)
		var dist := clampf(span / 2.0 / tan(hf / 2.0) * 1.15, 24.0, maxf(30.0, minf(70.0, tr.r)))
		var home: bool = not gate_now and (D - lead) < tr.st + 30.0 and (D - lead) > -40.0 and fc.corner == 0
		var cp: Vector3
		if home:
			var d2 := dist * 1.25
			var fa := tr.frame(D - qc - d2 * 0.55)
			cp = tr.w3(fa, uc - d2 * 0.8, fa.e + 4.0 + d2 * 0.1)
		else:
			cp = tr.w3(fc, uc - dist, fc.e + 5.0 + dist * 0.14)
		var lk := tr.w3(fc, uc, fc.e + 1.2)
		return [cp, lk, fov]
	if mode == "close":
		# 寄り：自分の馬の内側、斜め前から（見比べの寄りの絵）
		var mc: Dictionary = V[me]
		var qc2: float = mc.x - NOSE
		var fq := tr.frame(D - qc2)
		var fa2 := tr.frame(D - (qc2 + 3.5))
		return [tr.w3(fa2, mc.u - 6.5, fa2.e + 1.9), tr.w3(fq, mc.u, fq.e + 1.3), 40.0]
	# 騎乗：自分の馬の少し後ろ・上から。進路を変えると少し遅れてついてくる
	var m: Dictionary = V[me]
	if mem.camU == null:
		mem.camU = m.u
	mem.camU += (m.u - mem.camU) * (minf(1.0, dt * 2.6) if dt > 0.0 else 1.0)
	var qme: float = m.x - BODY
	var camq := qme - 6.4
	var fc2 := tr.frame(D - camq)
	var fl := tr.frame(D - (qme + 16.0))
	var bob := sin(fposmod(m.x / STRIDE, 1.0) * TAU) * 0.05 if (m.v > 1.5 and not gate_now) else 0.0
	var camh := 2.55 + 0.65 * TrackGeo.smooth((camq - 1.0) / 14.0) if t < 12.0 else 3.2
	var cp2 := tr.w3(fc2, mem.camU, fc2.e + camh + bob)
	var lk2 := tr.w3(fl, mem.camU * 0.55 + m.u * 0.45, fl.e + 1.0)
	return [cp2, lk2, 50.0]

func update_camera(t: float, V: Array, dt: float) -> void:
	if cam_mode != mem.mode:
		mem.p = null; mem.camU = null; mem.mode = cam_mode
	var tg := cam_target(t, V, cam_mode, dt)
	if mem.p == null or cam_mode != "tv":
		mem.p = tg[0]; mem.l = tg[1]
	else:
		var k := 1.0 - exp(-dt * 2.2) if dt > 0.0 else 0.0
		mem.p = (mem.p as Vector3).lerp(tg[0], k)
		mem.l = (mem.l as Vector3).lerp(tg[1], minf(1.0, k * 1.6))
	cam.fov = tg[2]
	cam.position = mem.p
	cam.look_at(mem.l, Vector3.UP)

# カメラの遅れを、t の数秒前から細かく進めてそろえる（撮影のとき）
func settle_camera(t: float) -> void:
	mem.p = null; mem.camU = null; mem.mode = cam_mode
	var t0 := maxf(0.05, t - 6.0)
	var tt := t0
	var h := 1.0 / 30.0
	update_camera(tt, view_at(tt), 0.0)
	while tt < t - 1e-6:
		var nt := minf(t, tt + h)
		update_camera(nt, view_at(nt), nt - tt)
		tt = nt

# ---- 画面の上の表示 ----
func telop_at(t: float) -> Array:
	var txt := ""
	var et := -99.0
	for e in race.events:
		if float(e.t) <= t:
			txt = String(e.text); et = float(e.t)
		else:
			break
	if t <= 0.0:
		return ["%s、まもなく発走です。" % race.race.name, t]
	return [txt, et]

func update_overlays(t: float, V: Array) -> void:
	var P: Array = []
	for v in V:
		P.append([v.x, v.lane, v.v])
	var tl := telop_at(t)
	hud.update(t, P, horses, tl[0], tl[1], "中継カメラ" if cam_mode == "tv" else ("騎乗カメラ" if cam_mode == "ride" else "寄りのカメラ") + "（%d %s）" % [int(race.horses[me].num), race.horses[me].name])
	hud.visible = show_hud
	# 内馬場の大きな画面
	var lead := 0.0
	for v in V:
		lead = maxf(lead, v.x)
	var bl: Array = course.board_labels
	(bl[0] as Label3D).text = "%s  %s" % [race.race.name, race.race.grade]
	(bl[1] as Label3D).text = ("残り %dm" % int(maxf(0.0, ceil(D - lead)))) if t > 0.0 and lead < D else ("ゴール" if t > 0.0 else "まもなく発走")
	(bl[2] as Label3D).text = RaceHud.fmt_time(minf(maxf(t, 0.0), winT))

func _process(delta: float) -> void:
	if shots.size() > 0:
		return
	if not paused:
		T += delta * speed
		if T > winT + 12.0:
			T = -3.0
	var V := place(T)
	update_camera(T, V, delta * speed if not paused else 0.0)
	update_overlays(T, V)

func _unhandled_input(ev: InputEvent) -> void:
	if not (ev is InputEventKey and ev.pressed):
		return
	match ev.keycode:
		KEY_1: cam_mode = "tv"
		KEY_2: cam_mode = "ride"
		KEY_SPACE: paused = not paused
		KEY_LEFT: T = maxf(-3.0, T - 5.0); mem.p = null
		KEY_RIGHT: T += 5.0; mem.p = null
		KEY_UP: speed = minf(8.0, speed * 2.0)
		KEY_DOWN: speed = maxf(0.25, speed / 2.0)
		KEY_R: T = -3.0; mem.p = null
		KEY_H: show_hud = not show_hud

# ---- 撮影 ----
func parse_args() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="):
			out_dir = a.substr(6)
		elif a == "--nohud":
			show_hud = false
		elif a.begins_with("--shot="):
			var p := a.substr(7).split(":")
			shots.append({"t": float(p[0]), "cam": p[1], "name": p[2]})
		elif a.begins_with("--seq="):
			var q := a.substr(6).split(":")
			var n := int(q[2])
			for i in n:
				var t := lerpf(float(q[0]), float(q[1]), float(i) / maxf(1.0, n - 1))
				shots.append({"t": t, "cam": q[3], "name": "%s_%02d" % [q[4], i + 1]})

func run_shots() -> void:
	DirAccess.make_dir_recursive_absolute(out_dir)
	for sh in shots:
		cam_mode = sh.cam
		var t: float = sh.t
		settle_camera(t)
		var V := place(t)
		update_camera(t, V, 1.0 / 30.0)
		update_overlays(t, V)
		for k in 3:
			await RenderingServer.frame_post_draw
		var img := get_viewport().get_texture().get_image()
		var path: String = out_dir.path_join(String(sh.name) + ".png")
		img.save_png(path)
		print("shot ", path, " t=", t, " cam=", cam_mode, " at ", Time.get_ticks_msec(), " ms")
	print("done")
	# lavapipe（CPU の Vulkan）では終わりの片づけで止まることがあるので、撮り終えたら自分で終える
	OS.kill(OS.get_process_id())
