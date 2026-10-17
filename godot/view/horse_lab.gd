# 馬の確かめ場：同じ馬を立ち姿・常歩・襲歩で並べて撮る（godot --path godot res://scenes/horse_lab.tscn -- --out=DIR）
# --ph=位相（0〜1）・--cam=side|front|back|head・--coat=毛色 で撮り分ける。--seq=枚数 で襲歩の1完歩を連続で撮る
# 騎手の乗り姿：--cam=jside|jback|jeye|jfront（右の襲歩の馬に寄る）・jwalk（真ん中の常歩の馬）・jstand（左の立ち姿の馬）。--push=追い 0〜1・--ease=ゴール後の流し 0〜1・--whip=ムチの秒
extends Node3D

var out_dir := "res://out"
var horses: Array = []
var cam: Camera3D
var font: Font

func _ready() -> void:
	font = load("res://assets/fonts/NotoSansJP_700Bold.ttf")
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var pm := PanoramaSkyMaterial.new()
	pm.panorama = load("res://assets/sky/kloofendal_48d_partly_cloudy_puresky_2k.hdr")
	sky.sky_material = pm
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_AGX
	env.ssao_enabled = true
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var sun := DirectionalLight3D.new()
	sun.light_energy = 2.0
	sun.rotation = Vector3(deg_to_rad(-40), deg_to_rad(140), 0)
	sun.shadow_enabled = true
	add_child(sun)
	var g := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(60, 60)
	g.mesh = plane
	var gm := StandardMaterial3D.new()
	gm.albedo_color = Color(0.32, 0.5, 0.22)
	g.material_override = gm
	add_child(g)
	var race: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/replay_race.json"))
	var args := {}
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	out_dir = args.get("out", out_dir)
	var picks := [0, 3, 6]
	for k in 3:
		var info: Dictionary = race.horses[int(args.get("h%d" % k, picks[k]))]
		var h := ViewHorse.new()
		add_child(h)
		h.setup(info, font)
		h.position = Vector3((k - 1) * 3.6, 0, 0)
		h.rotation.y = PI / 2.0
		h.set_fade(false)
		horses.append(h)
	cam = Camera3D.new()
	add_child(cam)
	cam.fov = 30
	var mode := String(args.get("cam", "side"))
	match mode:
		"side": cam.position = Vector3(0.0, 1.3, 19.0); cam.look_at(Vector3(0.0, 1.0, 0.0))
		"close": cam.position = Vector3(3.6, 1.6, 5.2); cam.look_at(Vector3(3.6, 1.3, 0.0))
		"front": cam.position = Vector3(9, 1.5, 6); cam.look_at(Vector3(0, 1.2, 0))
		"back": cam.position = Vector3(-9, 2.4, 3); cam.look_at(Vector3(0, 1.2, 0))
		"head": cam.fov = 14; cam.position = Vector3(5.5, 2.0, 5.0); cam.look_at(Vector3(1.5, 1.6, 3.2))
		"jside": cam.position = Vector3(3.8, 1.75, 4.6); cam.look_at(Vector3(3.8, 1.45, 0.0))
		"jback": cam.position = Vector3(0.6, 2.25, 0.0); cam.look_at(Vector3(3.6, 1.55, 0.0))
		"jeye": cam.position = Vector3(5.6, 1.95, 2.6); cam.look_at(Vector3(3.7, 1.8, 0.0))
		"jfront": cam.position = Vector3(8.0, 2.0, -1.8); cam.look_at(Vector3(3.8, 1.5, 0.0))
		"jwalk": cam.position = Vector3(0.2, 1.75, 4.6); cam.look_at(Vector3(0.2, 1.45, 0.0))
		"jstand": cam.position = Vector3(-3.4, 1.75, 4.6); cam.look_at(Vector3(-3.4, 1.45, 0.0))
	cam.make_current()
	# 騎手に寄るときは、ほかの馬を隠す
	var only := {"jside": 2, "jback": 2, "jeye": 2, "jfront": 2, "jwalk": 1, "jstand": 0}
	if only.has(mode):
		for k in 3:
			horses[k].visible = k == only[mode]
	DirAccess.make_dir_recursive_absolute(out_dir)
	var n := int(args.get("seq", "1"))
	for i in n:
		var ph := float(args.get("ph", "0.3")) + float(i) / maxf(1.0, n)
		var head_up := float(args.get("headup", "0"))
		var ears := float(args.get("ears", "0.4"))
		horses[0].animate({"ph": 0.0, "sp": 0.0, "push": 0.0, "t": 1.3 + i * 0.1, "walk_ph": 0.0, "walk_w": 0.0, "whip": -1.0, "pose": -1.0, "head_up": head_up, "ears": ears}, 0.0, true)
		horses[1].animate({"ph": 0.0, "sp": 0.0, "push": 0.0, "t": 1.3, "walk_ph": fposmod(ph, 1.0), "walk_w": 1.0, "whip": -1.0, "pose": -1.0, "head_up": 0.0, "ears": ears}, 0.0, true)
		horses[2].animate({"ph": fposmod(ph, 1.0), "sp": float(args.get("sp", "1.0")), "push": float(args.get("push", "0.6")), "t": 1.3, "walk_ph": 0.0, "walk_w": 0.0,
			"whip": float(args.get("whip", "-1")), "pose": -1.0, "head_up": head_up, "ears": ears, "ease": float(args.get("ease", "0"))}, 0.0, true)
		for k in 3:
			await RenderingServer.frame_post_draw
		var img := get_viewport().get_texture().get_image()
		img.save_png(out_dir.path_join("%s%s_%02d.png" % [mode, args.get("tag", ""), i]))
	print("done")
	OS.kill(OS.get_process_id())
