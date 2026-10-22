# 馬モデル試作（持ち主が Tripo で作った形に、骨54本と襲歩のその場走行を付けたもの）を見るだけの独立した場面
# v2（Gallop・0.8 秒・1完歩 約 1.84m）と v3（RaceGallop・0.45 秒・1完歩 7m・UV2 の毛色の領域・首の補正）と、いまの馬（ViewHorse）を切り替え・並べて見る
# ゲームの場面・メニューからは呼ばない。本採用は持ち主が実画面で比べてから決める（2026-10-22）
#   開く：sh godot/tools/run_scene.sh res://proto/tripo_horse/tripo_horse.tscn
#   撮る：… -- --out=DIR --ver=v3|v2 --view=side|rear|front|feet --lay=solo|pair|trio --v=16 --mode=slip|cadence --t=秒 --seq=枚数 --dt=秒
#             --coat=bay|chestnut|grey --socks=1 --face=1 --regions=1 --jockey=1 --tag=名前 --shots=キー:値,…/…（1回の起動で何枚も）
#   操作：1 横・2 斜め後ろ・3 正面・4 足元／V v2 と v3／C 並べ方（1頭・いまの馬と・3頭）／↑↓ 速さ／M 再生の合わせ方
#         K 毛色（鹿毛・栗毛・芦毛）／W 白い脚／F 顔の白徴／R 領域の表示／J いまの馬の騎手／Space 止める
#
# 向き：元の GLB は Y-up・前 -X・馬の左 +Z。ゲームの馬（ViewHorse）は前 +Z・左 +X なので、GLB の根を Y のまわりに +90° 回す（骨は回さない。tripo_model.gd）
# 大きさ：倍率 2.6（背の線でいまの馬に合わせた。v2 のときに測った：試作の尻 0.624・鞍の下の背 0.600 → いまの馬の 1.61・1.59 に合わせて 2.6）
# 動き：アニメはその場走行。移動は親（rig）を動かし、走りの位相を 距離÷完歩 で決める（v3 は再生の倍率 v×0.45÷7 と同じ）
extends Node3D

const TripoModel := preload("res://proto/tripo_horse/tripo_model.gd")
const STRIDE_OLD := 7.2                     # いまの馬の1完歩（m。view/race_view.gd の STRIDE）
const GAP_SIDE := 3.4                       # 横・足元から見るとき、並べる馬の前後の間（m）
const GAP_WIDE := 2.4                       # 正面・斜め後ろから見るとき、並べる馬の左右の間（m）
const LOOP_Z := 400.0                       # この長さごとに位置を巻き戻す（カメラも一緒なので見えない）
const SPEEDS := [4.0, 8.0, 12.0, 15.56, 16.0, 18.0]
const VIEWS := {"side": "横", "rear": "斜め後ろ", "front": "正面", "feet": "足元"}
const COATS := {"bay": ["鹿毛", 4.0], "chestnut": ["栗毛", 4.0], "grey": ["芦毛", 7.0]}
const COAT_NAME := {"bay": "鹿毛", "chestnut": "栗毛", "grey": "芦毛"}
const SOCKS := [0.24, 0.16, 0.34, 0.46]     # 白い脚を試すときの長さ（m。左前・右前・左後・右後）

var rig: Node3D               # 試作の馬の親（移動する。いま見ている版）
var tri := {}                 # 版 → 試作の馬（tripo_model.gd）
var tri_rig := {}             # 版 → 親
var ver := "v3"               # いま見ている版
var old: ViewHorse            # いまの馬（比べる）
var old_rig: Node3D
var race_info: Dictionary
var cam: Camera3D
var hud: Label
var v := 16.0                 # 移動の速さ（m/秒）
var mode := "slip"            # slip＝蹄が滑らない（距離÷試作の完歩）／cadence＝いまの馬と同じ完歩の数（距離÷7.2m）
var view := "side"
var lay := "solo"             # solo＝試作1頭／pair＝試作といまの馬／trio＝v2・v3・いまの馬
var coat := "bay"
var socks := false
var face := false
var regions := false
var paused := false
var t := 0.0                  # 経った時間（秒）
var dist := 0.0               # 走った距離（m）

# テストと古い呼び方のため（いま見ている版の中身）
var horse: Node3D:
	get: return tri[ver].glb
var player: AnimationPlayer:
	get: return tri[ver].player
var skel: Skeleton3D:
	get: return tri[ver].skel
var clip: String:
	get: return tri[ver].clip

func _ready() -> void:
	var args := {}
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	build_world()
	race_info = (JSON.parse_string(FileAccess.get_file_as_string("res://assets/replay_race.json")) as Dictionary).horses[0]
	for vv in ["v2", "v3"]:
		var r := Node3D.new()
		add_child(r)
		var m = TripoModel.new()
		r.add_child(m)
		m.setup(vv, coat_info())
		tri[vv] = m
		tri_rig[vv] = r
	build_old(args.get("jockey", "0") == "1")
	build_hud()
	apply(args)
	if args.has("out"):
		shoot(args)
	else:
		step(0.0)

func apply(a: Dictionary) -> void:
	ver = String(a.get("ver", ver))
	v = float(a.get("v", v))
	mode = String(a.get("mode", mode))
	view = String(a.get("view", view))
	lay = String(a.get("lay", "pair" if a.get("pair", "0") == "1" else lay))
	coat = String(a.get("coat", "grey" if a.get("grey", "0") == "1" else coat))
	socks = a.get("socks", "0") == "1"
	face = a.get("face", "0") == "1"
	regions = a.get("regions", "0") == "1"
	set_jockey(a.get("jockey", "0") == "1")
	refresh()

# 並べ方・毛色を反映する
func refresh() -> void:
	rig = tri_rig[ver]
	for vv in tri_rig:
		tri_rig[vv].visible = vv == ver or lay == "trio"
	old_rig.visible = lay != "solo"
	var info := coat_info()
	for vv in tri:
		tri[vv].set_coat(info)
		tri[vv].show_regions(regions)
	old.coat = old.coat_material(info)
	old.body_mi.material_override = old.coat
	old.fade_sh[0] = old.coat
	old.set_fade(false)

func coat_info() -> Dictionary:
	var c: Array = COATS[coat]
	var info := race_info.duplicate(true)
	info.coatLook = UiArt.coat_look(String(c[0]), float(c[1]))
	info.marks = {"blaze": "blaze" if face else "none", "socks": SOCKS if socks else [0, 0, 0, 0]}
	return info

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
		mm.set_instance_transform(i, Transform3D(Basis(), Vector3(-5.5, 0.5, -L + i * 2.5)))
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	add_child(mmi)
	var bar := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(0.1, 0.1, 2.0 * L)
	bm.material = rail_m
	bar.mesh = bm
	bar.position = Vector3(-5.45, 1.0, 0)
	add_child(bar)
	cam = Camera3D.new()
	cam.fov = 40.0
	add_child(cam)
	cam.make_current()

# ---- いまの馬（ゲームで使っている ViewHorse。比べるために並べる） ----
func build_old(with_jockey: bool) -> void:
	old_rig = Node3D.new()
	add_child(old_rig)
	old = ViewHorse.new()
	old_rig.add_child(old)
	old.setup(race_info, load("res://assets/fonts/NotoSansJP_700Bold.ttf"))
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

# ---- 並べる位置（3頭は横から見て左から v2・v3・いまの馬。馬は左（+Z）を向いて走る） ----
func slot_off(k: int) -> Vector3:
	if view == "side" or view == "feet":
		return Vector3(0, 0, -(GAP_SIDE + (0.6 if lay == "trio" else 0.0)) * k)
	return Vector3(GAP_WIDE * k, 0, 0)

func slots() -> Dictionary:
	match lay:
		"trio": return {"v2": -1, "v3": 0, "old": 1}
		"pair": return {ver: 0, "old": 1}
	return {ver: 0}

# 試作の走りの位相：slip は 距離÷試作の完歩、cadence は いまの馬と同じ 距離÷7.2m
func phase_of(vv: String) -> float:
	var L: float = STRIDE_OLD if mode == "cadence" else tri[vv].stride_m()
	return dist / L

# 再生の倍率（1秒あたりのクリップの進み）：位相の進み × 周期
func anim_rate(vv := "") -> float:
	var k: String = ver if vv == "" else vv
	var L: float = STRIDE_OLD if mode == "cadence" else tri[k].stride_m()
	return v * tri[k].cycle() / L

# ---- 1コマ進める ----
func step(dt: float) -> void:
	t += dt
	dist += v * dt
	var z := fposmod(dist + LOOP_Z / 2.0, LOOP_Z) - LOOP_Z / 2.0
	var base := Vector3(0, 0, z)
	var sl := slots()
	for vv in tri:
		tri_rig[vv].position = base + slot_off(int(sl.get(vv, 0)))
		tri[vv].set_phase(phase_of(vv))
	if sl.has("old"):
		old_rig.position = base + slot_off(int(sl.old))
		var sp := clampf(v / 16.0, 0.35, 1.15)
		var ww := 1.0 - smoothstep(0.0, 1.0, (v - 4.0) / 3.0)
		old.animate({"ph": fposmod(dist / STRIDE_OLD, 1.0), "sp": sp, "push": 0.0, "t": t + 3.0,
			"walk_ph": fposmod(dist / ViewGait.WALK_STRIDE, 1.0), "walk_w": ww, "whip": -1.0, "pose": -1.0,
			"head_up": 0.0, "ears": 0.4, "ease": 0.0}, dt, true)
	place_cam(base)
	update_hud()

func place_cam(base: Vector3) -> void:
	# 見る中心：並べた馬のまん中
	var sl := slots()
	var lo := 9
	var hi := -9
	for k in sl:
		lo = mini(lo, int(sl[k]))
		hi = maxi(hi, int(sl[k]))
	var c := base + (slot_off(lo) + slot_off(hi)) * 0.5
	var nh := hi - lo + 1
	var far: float = [1.0, 1.45, 1.9][nh - 1]
	match view:
		"side":
			cam.position = c + Vector3(7.5 * float([1.0, 1.3, 1.85][nh - 1]), 1.35, 0.4)
			cam.look_at(c + Vector3(0, 1.05, 0.4))
		"rear":
			cam.position = c + Vector3(3.4 * far, 2.7, -6.5 * far)
			cam.look_at(c + Vector3(0, 1.15, 0.8))
		"front":
			cam.position = c + Vector3(0.9, 1.45, 8.0 * far)
			cam.look_at(c + Vector3(0, 1.05, 0))
		"feet":
			var r: Vector3 = tri_rig[ver].position
			cam.position = r + Vector3(3.6, 0.45, 0.2)
			cam.look_at(r + Vector3(0, 0.38, 0.2))

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
		KEY_V: ver = "v2" if ver == "v3" else "v3"
		KEY_C: lay = {"solo": "pair", "pair": "trio", "trio": "solo"}[lay]
		KEY_J: set_jockey(not old.jockey.visible)
		KEY_K: coat = {"bay": "chestnut", "chestnut": "grey", "grey": "bay"}[coat]
		KEY_W: socks = not socks
		KEY_F: face = not face
		KEY_R: regions = not regions
		KEY_M: mode = "cadence" if mode == "slip" else "slip"
		KEY_SPACE: paused = not paused
		KEY_UP: v = next_speed(1)
		KEY_DOWN: v = next_speed(-1)
	refresh()
	step(0.0)

func next_speed(d: int) -> float:
	var i := SPEEDS.find(v)
	if i < 0:
		i = 4
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
	var m = tri[ver]
	var r := anim_rate()
	var lays := {"solo": "試作だけ", "pair": "左から 試作 %s・いまの馬" % ver, "trio": "左から v2・v3・いまの馬"}
	hud.text = "馬モデル試作 %s（Tripo の形・骨 %d 本・%s %.2f 秒）  倍率 %.1f・1完歩 %.2f m\n視点：%s　［1］横 ［2］斜め後ろ ［3］正面 ［4］足元　［V］版　［C］並べ方：%s\n速さ %.2f m/秒 ［↑↓］　再生の合わせ方 ［M］：%s　再生 ×%.2f・1秒に %.2f 完歩\n毛色 ［K］：%s　［W］白い脚：%s　［F］顔の白徴：%s　［R］領域：%s" % [
		ver, m.skel.get_bone_count(), m.clip, m.cycle(), m.S, m.stride_m(), VIEWS.get(view, view), lays[lay],
		v, "接地（蹄が滑らない）" if mode == "slip" else "完歩の数（いまの馬と同じ 7.2m）", r, r / m.cycle(),
		COAT_NAME[coat], "あり" if socks else "なし", "あり" if face else "なし", "あり" if regions else "なし"]

# ---- 撮る（決まった時刻へ進めて撮る） ----
# --shots=キー:値,キー:値/…（1回の起動で何枚も撮る。無いキーは起動の引数のまま）
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
		apply(job)
		hud.get_parent().visible = job.get("hud", "1") == "1"
		var t0 := float(job.get("t", "1.0"))
		var n := int(job.get("seq", "1"))
		var dt := float(job.get("dt", "0.0"))
		var tag := String(job.get("tag", view))
		for i in n:
			var target := t0 + i * dt
			t = 0.0; dist = 0.0
			# いまの馬は手前の替わりなどを時間でならすので、0.1 秒ずつ進めて着く
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
