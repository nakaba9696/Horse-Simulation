# 見本の馬の絵（docs/UI.md「右の見本」の 2:1 の絵）：3D の馬（ViewHorse・毛色と白徴は UiArt の決まり）を小さな窓に立たせ、
# 息・見回し・尾振りの立ち姿で動かす。騎手と鞍は隠す。空と芝の地。馬を替えるときは set_horse
class_name UiHorsePortrait
extends SubViewportContainer

var vp: SubViewport
var horse: ViewHorse
var cam: Camera3D
var t := 0.0
var _key := ""

func _init() -> void:
	stretch = true
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	vp = SubViewport.new()
	vp.own_world_3d = true
	vp.msaa_3d = Viewport.MSAA_2X
	vp.render_target_update_mode = SubViewport.UPDATE_WHEN_VISIBLE
	add_child(vp)
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var pm := PanoramaSkyMaterial.new()
	pm.panorama = load("res://assets/sky/kloofendal_48d_partly_cloudy_puresky_2k.hdr")
	sky.sky_material = pm
	sky.radiance_size = Sky.RADIANCE_SIZE_64
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_AGX
	env.tonemap_exposure = 1.0
	var we := WorldEnvironment.new()
	we.environment = env
	vp.add_child(we)
	var sun := DirectionalLight3D.new()
	sun.light_energy = 2.0
	sun.rotation = Vector3(deg_to_rad(-38), deg_to_rad(150), 0)
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 30.0
	vp.add_child(sun)
	var g := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(80, 80)
	g.mesh = plane
	var gm := StandardMaterial3D.new()
	gm.albedo_color = Color(0.12, 0.24, 0.08)
	gm.roughness = 0.95
	g.material_override = gm
	vp.add_child(g)
	cam = Camera3D.new()
	cam.fov = 26
	vp.add_child(cam)
	var eye := Vector3(0.9, 1.4, 5.4)
	cam.transform = Transform3D.IDENTITY.looking_at(Vector3(0.05, 1.12, 0.0) - eye, Vector3.UP)
	cam.position = eye

# 馬を替える（名前・毛色・年齢。同じ馬なら作り直さない）
func set_horse(name: String, coat: String, age: float) -> void:
	var key := "%s|%s|%s" % [name, coat, age]
	if key == _key:
		return
	_key = key
	if horse:
		horse.queue_free()
	horse = ViewHorse.new()
	vp.add_child(horse)
	horse.setup(UiArt.horse_info(name, coat, age, 1, 1), UiTheme.font())
	horse.rotation.y = PI / 2.0
	horse.set_fade(false)   # カメラの近くで網目に消す仕組みを切る
	if horse.jockey:
		horse.jockey.visible = false
		if horse.jockey.body: horse.jockey.body.visible = false   # 騎手の体は馬の根の子にある
	for mi in horse.model.find_children("*", "MeshInstance3D", true, false):
		if mi.mesh == horse.M.cloth_mesh or mi.mesh == horse.M.saddle_mesh: mi.visible = false
	if horse.cloth: horse.cloth.visible = false
	for l in horse.numbers: l.visible = false
	_pose(0.0)

func _pose(dt: float) -> void:
	if horse:
		horse.animate({"ph": 0.0, "sp": 0.0, "push": 0.0, "t": t, "walk_ph": 0.0, "walk_w": 0.0, "whip": -1.0, "pose": -1.0, "head_up": 0.0, "ears": 0.5, "cam_d": 0.0}, dt, false)

func _process(delta: float) -> void:
	t += delta
	_pose(delta)
