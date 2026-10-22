# 馬モデル試作 v2（持ち主が Tripo で作った形に、骨54本と襲歩のその場走行を付けたもの）を見るだけの独立した場面
# ゲームの場面・メニューからは呼ばない。本採用は持ち主が実画面で比べてから決める（2026-10-22）
#   開く：sh godot/tools/run_scene.sh res://proto/tripo_horse/tripo_horse.tscn
#   撮る：… -- --out=DIR --view=side|rear|front|feet --pair=1 --v=16 --mode=slip|cadence --t=秒 --seq=枚数 --dt=秒 --jockey=1 --grey=1 --tag=名前
#   操作：1 横・2 斜め後ろ・3 正面・4 足元／C 既存の馬と並べる／↑↓ 速さ／M 再生の合わせ方／J 既存の馬の騎手／K 毛色／Space 止める
#
# 向き：元の GLB は Y-up・前 -X・馬の左 +Z。ゲームの馬（ViewHorse）は前 +Z・左 +X なので、GLB の根を Y のまわりに +90° 回す（骨は回さない）
# 大きさ：元の GLB は実寸でない（耳まで 0.85）。背の線で既存の馬に合わせる（下の SCALE の根拠）
# 動き：アニメはその場走行。移動は親（rig）を動かし、アニメの再生の速さを移動の速さから決める
extends Node3D

const GLB := "res://proto/tripo_horse/horse-gallop.glb"
# 倍率の根拠（2026-10-22 に測った）：
#   試作の立ち姿の背の線（モデル単位）：尻の最高点 0.624・鞍の下の背の最低点 0.600（耳まで 0.849・鼻先〜尾 0.979）
#   既存の馬（ViewHorse の立ち姿・m）：尻 1.61・鞍の下の背 1.59（docs/HORSE3D.md 9 の「馬の背 1.59m」、き甲 1.70）
#   1.61/0.624＝2.58、1.59/0.600＝2.65 → 2.6。き甲は試作では首の線とつながって測れないので使わない。全高（耳まで）も使わない
#   2.6 倍で：尻 1.62 m・背 1.56 m・耳まで 2.21 m・鼻先〜尾の先 2.55 m（既存の馬は耳まで 2.05・鼻先〜尾 2.28）
const SCALE := 2.6
const CYCLE := 0.8                          # クリップの長さ（秒）＝1完歩
const BASE_V := 0.24 / (0.34 * 0.8)         # 再生 1 倍で蹄が滑らない移動の速さ（モデル単位/秒。約 0.88235）
const STRIDE_OLD := 7.2                     # 既存の馬の1完歩（m。view/race_view.gd の STRIDE）
const PAIR_SIDE := Vector3(0.0, 0.0, 3.4)   # 既存の馬を置く所（試作の馬から）。横から見るときは同じ列の 3.4 m 前（カメラから同じ距離で大きさを比べる）
const PAIR_WIDE := Vector3(-2.2, 0.0, 0.0)  # 正面・斜め後ろから見るときは右へ 2.2 m
const LOOP_Z := 400.0                       # この長さごとに位置を巻き戻す（カメラも一緒なので見えない）
const SPEEDS := [4.0, 8.0, 12.0, 16.0, 18.0]
const VIEWS := {"side": "横", "rear": "斜め後ろ", "front": "正面", "feet": "足元"}
const BAY := Color(0.42, 0.22, 0.11)        # 鹿毛に寄せた単色（試作には毛色の塗り分けが無い）

var rig: Node3D               # 試作の馬の親（移動する）
var horse: Node3D             # GLB の根（+90° 回して SCALE 倍）
var player: AnimationPlayer
var skel: Skeleton3D
var clip := ""
var body_mat: StandardMaterial3D
var old: ViewHorse            # 既存の馬（比べる）
var old_rig: Node3D
var cam: Camera3D
var hud: Label
var v := 16.0                 # 移動の速さ（m/秒）
var mode := "slip"            # slip＝蹄が滑らない再生／cadence＝既存の馬と同じ完歩の数
var view := "side"
var pair := false
var paused := false
var grey := false
var t := 0.0                  # 経った時間（秒）
var dist := 0.0               # 走った距離（m）
var anim_t := 0.0             # クリップの中の時間（秒。巻き戻す前）

func _ready() -> void:
	var args := {}
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	v = float(args.get("v", v))
	mode = String(args.get("mode", mode))
	view = String(args.get("view", view))
	pair = args.get("pair", "0") == "1"
	grey = args.get("grey", "0") == "1"
	build_world()
	build_tripo()
	build_old(args.get("jockey", "0") == "1")
	build_hud()
	set_pair(pair)
	set_grey(grey)
	if args.has("out"):
		shoot(args)
	else:
		step(0.0)

# ---- 場（芝・空・光。騎乗の画面 view/race_view.gd の build_env に寄せた明るさ） ----
func build_world() -> void:
	var env := Environment.new()
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
	env.glow_enabled = true
	env.glow_intensity = 0.6
	env.glow_bloom = 0.04
	env.glow_hdr_threshold = 1.1
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
	sun.directional_shadow_max_distance = 40.0
	sun.shadow_blur = 1.2
	add_child(sun)
	# 芝（UV＝m。course.gd の芝の材質と同じ shader と値）
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var W := 80.0
	var L := LOOP_Z / 2.0 + 60.0
	var c := [Vector3(-W, 0, -L), Vector3(W, 0, -L), Vector3(W, 0, L), Vector3(-W, 0, L)]
	for k in [0, 2, 1, 0, 3, 2]:
		st.set_normal(Vector3.UP)
		st.set_uv(Vector2(c[k].x, c[k].z))
		st.add_vertex(c[k])
	var g := MeshInstance3D.new()
	g.mesh = st.commit()
	var m := ShaderMaterial.new()
	m.shader = load("res://view/shaders/turf.gdshader")
	m.set_shader_parameter("tex_albedo", load("res://assets/textures/leafy_grass_diff_1k.jpg"))
	m.set_shader_parameter("tex_normal", load("res://assets/textures/leafy_grass_nor_gl_1k.jpg"))
	m.set_shader_parameter("tint", Color(0.30, 0.50, 0.15))
	m.set_shader_parameter("tile", 2.6)
	m.set_shader_parameter("stripe_len", 12.0)
	m.set_shader_parameter("stripe_amp", 0.075)
	m.set_shader_parameter("desat", 0.8)
	g.material_override = m
	add_child(g)
	# 内ラチ（白い柵。走る速さが分かるように 2.5 m ごとの柱）
	var rail_m := StandardMaterial3D.new()
	rail_m.albedo_color = Color(0.93, 0.93, 0.9)
	rail_m.roughness = 0.5
	var post := BoxMesh.new()
	post.size = Vector3(0.08, 1.0, 0.08)
	post.material = rail_m
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = post
	var n := int(2.0 * L / 2.5)
	mm.instance_count = n
	for i in n:
		mm.set_instance_transform(i, Transform3D(Basis(), Vector3(-5.0, 0.5, -L + i * 2.5)))
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	add_child(mmi)
	var bar := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(0.1, 0.1, 2.0 * L)
	bm.material = rail_m
	bar.mesh = bm
	bar.position = Vector3(-4.95, 1.0, 0)
	add_child(bar)
	cam = Camera3D.new()
	cam.fov = 40.0
	add_child(cam)
	cam.make_current()

# ---- 試作の馬 ----
func build_tripo() -> void:
	rig = Node3D.new()
	add_child(rig)
	horse = (load(GLB) as PackedScene).instantiate()
	horse.rotation_degrees.y = 90.0        # 前 -X → +Z
	horse.scale = Vector3.ONE * SCALE
	rig.add_child(horse)
	player = horse.find_children("*", "AnimationPlayer", true, false)[0]
	skel = horse.find_children("*", "Skeleton3D", true, false)[0]
	for a in player.get_animation_list():
		if a != "RESET":
			clip = a
			break
	player.get_animation(clip).loop_mode = Animation.LOOP_LINEAR
	player.play(clip)
	player.pause()   # 時間はこちらで進めて seek する（撮る絵とテストが同じになる）
	for mi in horse.find_children("*", "MeshInstance3D", true, false):
		var src = mi.get_active_material(0)
		if src is StandardMaterial3D:
			body_mat = src.duplicate()
			mi.material_override = body_mat

func set_grey(on: bool) -> void:
	grey = on
	if body_mat != null:
		body_mat.albedo_color = Color(0.9063, 0.9063, 0.9063) if on else BAY
		body_mat.roughness = 0.5 if on else 0.72

# ---- 既存の馬（ゲームで使っている ViewHorse。比べるために並べる） ----
func build_old(with_jockey: bool) -> void:
	old_rig = Node3D.new()
	add_child(old_rig)
	var race: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/replay_race.json"))
	old = ViewHorse.new()
	old_rig.add_child(old)
	old.setup(race.horses[0], load("res://assets/fonts/NotoSansJP_700Bold.ttf"))
	old.set_fade(false)
	set_jockey(with_jockey)

# 騎手・鞍・ゼッケンを出すか（馬の形どうしを比べるときは消す）
func set_jockey(on: bool) -> void:
	old.jockey.visible = on
	if old.jockey.body != null:
		old.jockey.body.visible = on
	old.cloth.visible = on
	for mi in old.model.get_children():
		if mi is MeshInstance3D and (mi.mesh == old.M.cloth_mesh or mi.mesh == old.M.saddle_mesh):
			mi.visible = on

func set_pair(on: bool) -> void:
	pair = on
	old_rig.visible = on

# ---- 速さ ----
# クリップの再生の倍率。slip：蹄が地面で滑らない（v＝BASE_V×SCALE×倍率）。cadence：既存の馬と同じ1秒あたりの完歩の数
func anim_rate() -> float:
	if mode == "cadence":
		return CYCLE * v / STRIDE_OLD
	return v / (BASE_V * SCALE)

# ---- 1コマ進める ----
func step(dt: float) -> void:
	t += dt
	dist += v * dt
	anim_t += anim_rate() * dt
	var z := fposmod(dist + LOOP_Z / 2.0, LOOP_Z) - LOOP_Z / 2.0
	rig.position = Vector3(0, 0, z)
	player.seek(fposmod(anim_t, CYCLE), true)
	if pair:
		old_rig.position = rig.position + pair_off()
		var sp := clampf(v / 16.0, 0.35, 1.15)
		var ww := 1.0 - smoothstep(0.0, 1.0, (v - 4.0) / 3.0)
		old.animate({"ph": fposmod(dist / STRIDE_OLD, 1.0), "sp": sp, "push": 0.0, "t": t + 3.0,
			"walk_ph": fposmod(dist / ViewGait.WALK_STRIDE, 1.0), "walk_w": ww, "whip": -1.0, "pose": -1.0,
			"head_up": 0.0, "ears": 0.4, "ease": 0.0}, dt, true)
	place_cam()
	update_hud()

func pair_off() -> Vector3:
	return PAIR_SIDE if view == "side" or view == "feet" else PAIR_WIDE

func place_cam() -> void:
	# 見る中心：1頭なら試作の馬、並べたら2頭のまん中
	var c := rig.position + (pair_off() * 0.5 if pair else Vector3.ZERO)
	var far := 1.45 if pair else 1.0
	match view:
		"side":
			cam.position = c + Vector3(7.5 * (1.3 if pair else 1.0), 1.35, 0.4)
			cam.look_at(c + Vector3(0, 1.05, 0.4))
		"rear":
			cam.position = c + Vector3(3.4 * far, 2.7, -6.5 * far)
			cam.look_at(c + Vector3(0, 1.15, 0.8))
		"front":
			cam.position = c + Vector3(0.9, 1.45, 8.0 * far)
			cam.look_at(c + Vector3(0, 1.05, 0))
		"feet":
			cam.position = rig.position + Vector3(3.6, 0.45, 0.2)
			cam.look_at(rig.position + Vector3(0, 0.38, 0.2))

func _process(delta: float) -> void:
	if not paused:
		step(delta)

func _unhandled_input(e: InputEvent) -> void:
	if not (e is InputEventKey and e.pressed and not e.echo):
		return
	match e.keycode:
		KEY_1: view = "side"
		KEY_2: view = "rear"
		KEY_3: view = "front"
		KEY_4: view = "feet"
		KEY_C: set_pair(not pair)
		KEY_J: set_jockey(not old.jockey.visible)
		KEY_K: set_grey(not grey)
		KEY_M: mode = "cadence" if mode == "slip" else "slip"
		KEY_SPACE: paused = not paused
		KEY_UP: v = next_speed(1)
		KEY_DOWN: v = next_speed(-1)
	step(0.0)

func next_speed(d: int) -> float:
	var i := SPEEDS.find(v)
	if i < 0:
		i = 3
	return SPEEDS[clampi(i + d, 0, SPEEDS.size() - 1)]

# ---- 文字（試作の確かめ用。ゲームの画面ではない） ----
func build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.03, 0.08, 0.05, 0.72)
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 16; sb.content_margin_right = 16
	sb.content_margin_top = 10; sb.content_margin_bottom = 10
	p.add_theme_stylebox_override("panel", sb)
	p.position = Vector2(20, 16)
	layer.add_child(p)
	hud = Label.new()
	hud.add_theme_font_override("font", load("res://assets/fonts/NotoSansJP_700Bold.ttf"))
	hud.add_theme_font_size_override("font_size", 17)
	hud.add_theme_color_override("font_color", Color(0.95, 0.92, 0.82))
	p.add_child(hud)

func update_hud() -> void:
	if hud == null:
		return
	var r := anim_rate()
	hud.text = "馬モデル試作 v2（Tripo の形・骨 %d 本・%s）  倍率 %.1f\n視点：%s　［1］横 ［2］斜め後ろ ［3］正面 ［4］足元　［C］既存の馬と並べる：%s\n速さ %.0f m/秒 ［↑↓］　再生の合わせ方 ［M］：%s　再生 ×%.2f・1完歩 %.2f 秒" % [
		skel.get_bone_count(), clip, SCALE, VIEWS.get(view, view), "あり" if pair else "なし",
		v, "接地（蹄が滑らない）" if mode == "slip" else "完歩の数（既存の馬と同じ）", r, CYCLE / maxf(r, 0.001)]

# ---- 撮る（決まった時刻へ進めて撮る） ----
# --shots=キー:値,キー:値/…（1回の起動で何枚も撮る。キーは view・pair・v・mode・t・seq・dt・jockey・grey・tag。無いキーは起動の引数のまま）
func shoot(args: Dictionary) -> void:
	var out := String(args.out)
	DirAccess.make_dir_recursive_absolute(out)
	var jobs: Array = []
	if args.has("shots"):
		for js in String(args.shots).split("/", false):
			var job := args.duplicate()
			for kv in js.split(",", false):
				var p := kv.split(":", true, 1)
				job[p[0]] = p[1] if p.size() > 1 else "1"
			jobs.append(job)
	else:
		jobs.append(args)
	for job in jobs:
		v = float(job.get("v", "16"))
		mode = String(job.get("mode", "slip"))
		view = String(job.get("view", "side"))
		set_pair(job.get("pair", "0") == "1")
		set_grey(job.get("grey", "0") == "1")
		set_jockey(job.get("jockey", "0") == "1")
		var t0 := float(job.get("t", "1.0"))
		var n := int(job.get("seq", "1"))
		var dt := float(job.get("dt", "0.0"))
		var tag := String(job.get("tag", view))
		for i in n:
			var target := t0 + i * dt
			t = 0.0; dist = 0.0; anim_t = 0.0
			# 既存の馬は手前の替わりなどを時間でならすので、0.1 秒ずつ進めて着く
			var k := int(ceil(target / 0.1))
			for j in k:
				step(target / k)
			if k == 0:
				step(0.0)
			for f in 3:
				await RenderingServer.frame_post_draw
			var img := get_viewport().get_texture().get_image()
			var name := ("%s_%02d.jpg" % [tag, i]) if n > 1 else ("%s.jpg" % tag)
			img.save_jpg(out.path_join(name), 0.88)
	print("done")
	get_tree().quit()
