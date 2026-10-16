# パドック：出走表の後ろの 3D。全頭が楕円の周回路を常歩で回り、カメラは選んだ馬を追う（遠くはぼかす）
class_name ViewPaddock
extends Node3D

const RX := 21.0          # 周回路の半径（長いほう・短いほう、m）
const RZ := 11.0
const WALK_V := 1.55      # 歩く速さ（m/s）

var race: Dictionary
var horses: Array[ViewHorse] = []
var cam: Camera3D
var t := 0.0
var focus := 0
var orbit := 0.0          # パドックの画面のとき、選んだ馬のまわりを回る
var close := false        # 寄り（パドックの画面）
var _cp = null
var _lk = null
var _perim := 0.0

func setup(r: Dictionary) -> void:
	race = r
	var font := UiTheme.font()
	_env()
	_ground()
	_perim = _perimeter()
	for i in race.horses.size():
		var h := ViewHorse.new()
		add_child(h)
		h.setup(race.horses[i], font)
		horses.append(h)
	cam = Camera3D.new()
	cam.fov = 26.0
	cam.near = 0.2
	cam.far = 3000.0
	var attr := CameraAttributesPractical.new()
	attr.dof_blur_far_enabled = true
	attr.dof_blur_far_distance = 14.0
	attr.dof_blur_far_transition = 10.0
	attr.dof_blur_amount = 0.12
	cam.attributes = attr
	add_child(cam)
	cam.make_current()
	step(0.0)

func _env() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var pm := PanoramaSkyMaterial.new()
	pm.panorama = load("res://assets/sky/kloofendal_48d_partly_cloudy_puresky_2k.hdr")
	sky.sky_material = pm
	sky.radiance_size = Sky.RADIANCE_SIZE_128
	env.sky = sky
	env.sky_rotation = Vector3(0, deg_to_rad(40), 0)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_AGX
	env.tonemap_exposure = 1.0
	env.ssao_enabled = true
	env.glow_enabled = true
	env.glow_intensity = 0.5
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.08
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var sun := DirectionalLight3D.new()
	sun.light_color = Color(1.0, 0.95, 0.86)
	sun.light_energy = 2.0
	sun.rotation = Vector3(deg_to_rad(-38), deg_to_rad(120), 0)
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 80.0
	add_child(sun)

func _mat(c: Color, rough := 0.9) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	return m

func _ground() -> void:
	# 芝の地面（遠くまで）と、周回路（砂）、内の芝
	var g := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(600, 600)
	g.mesh = pm
	var gm := _mat(Color(0.25, 0.42, 0.18))
	gm.albedo_texture = load("res://assets/textures/leafy_grass_diff_1k.jpg")
	gm.uv1_scale = Vector3(150, 150, 1)
	g.material_override = gm
	add_child(g)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := 96
	for i in n:
		var a0 := TAU * i / n
		var a1 := TAU * (i + 1) / n
		var p := [_ring(a0, -1.8), _ring(a0, 1.8), _ring(a1, 1.8), _ring(a1, -1.8)]
		for k in [0, 2, 1, 0, 3, 2]:
			st.set_uv(Vector2((p[k] as Vector3).x, (p[k] as Vector3).z) * 0.25)
			st.add_vertex(p[k] + Vector3(0, 0.02, 0))
	st.generate_normals()
	var path := MeshInstance3D.new()
	path.mesh = st.commit()
	var dm := _mat(Color(0.78, 0.66, 0.5))
	dm.albedo_texture = load("res://assets/textures/dirt_aerial_02_diff_1k.jpg")
	path.material_override = dm
	add_child(path)
	# 白い柵（内と外）
	var post := CylinderMesh.new()
	post.top_radius = 0.05
	post.bottom_radius = 0.05
	post.height = 1.1
	var white := _mat(Color(0.95, 0.95, 0.93), 0.5)
	for side in [-2.6, 2.6]:
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = post
		mm.instance_count = 72
		for i in 72:
			var p := _ring(TAU * i / 72, side)
			mm.set_instance_transform(i, Transform3D(Basis(), p + Vector3(0, 0.55, 0)))
		var mi := MultiMeshInstance3D.new()
		mi.multimesh = mm
		mi.material_override = white
		add_child(mi)
		var rail := SurfaceTool.new()
		rail.begin(Mesh.PRIMITIVE_TRIANGLES)
		for i in 96:
			var a := _ring(TAU * i / 96, side)
			var b := _ring(TAU * (i + 1) / 96, side)
			for h in [0.75, 1.05]:
				var q := [a + Vector3(0, h, 0), b + Vector3(0, h, 0), b + Vector3(0, h + 0.07, 0), a + Vector3(0, h + 0.07, 0)]
				for k in [0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]:
					rail.add_vertex(q[k])
		rail.generate_normals()
		var rm := MeshInstance3D.new()
		rm.mesh = rail.commit()
		rm.material_override = white
		add_child(rm)
	# 木（遠く）
	var tree: PackedScene = load("res://assets/trees/CommonTree_1.gltf")
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	for i in 40:
		var a := rng.randf() * TAU
		var r := rng.randf_range(38.0, 70.0)
		var tn: Node3D = tree.instantiate()
		tn.position = Vector3(cos(a) * r * 1.4, 0, sin(a) * r)
		tn.scale = Vector3.ONE * rng.randf_range(1.6, 2.4)
		tn.rotation.y = rng.randf() * TAU
		add_child(tn)

# 周回路の上の点（a＝角度、off＝外へ）
func _ring(a: float, off := 0.0) -> Vector3:
	var p := Vector3(cos(a) * RX, 0, sin(a) * RZ)
	var n := Vector3(cos(a) / RX, 0, sin(a) / RZ).normalized()
	return p + n * off

func _perimeter() -> float:
	var s := 0.0
	var prev := _ring(0.0)
	for i in range(1, 361):
		var p := _ring(TAU * i / 360.0)
		s += p.distance_to(prev)
		prev = p
	return s

# 1頭の位置（周回路を左回りに歩く。間はそろえる）
func _horse_at(i: int) -> Array:
	var n := float(horses.size())
	var a := fposmod(-t * WALK_V / _perim * TAU + TAU * i / n, TAU)
	var p := _ring(a)
	var p2 := _ring(a - 0.01)
	return [p, (p2 - p).normalized(), a]

func step(dt: float) -> void:
	t += dt
	for i in horses.size():
		var h := horses[i]
		var q := _horse_at(i)
		var p: Vector3 = q[0]
		var dir: Vector3 = q[1]
		h.transform = Transform3D(Basis.looking_at(-dir, Vector3.UP), p)
		var walked := t * WALK_V + i * 3.1
		h.animate({"ph": 0.0, "sp": 0.0, "push": 0.0, "t": t + i * 1.7, "walk_ph": fposmod(walked / ViewGait.WALK_STRIDE, 1.0), "walk_w": 1.0,
			"whip": -1.0, "pose": -1.0, "head_up": 0.0, "ears": 0.5, "cam_d": 99.0}, dt, true)
	# カメラ：選んだ馬を周回路の外から、少し前から。寄りのときはゆっくり回り込む
	var f := _horse_at(focus)
	var hp: Vector3 = f[0]
	var hd: Vector3 = f[1]
	var out := Vector3(hp.x / RX / RX, 0, hp.z / RZ / RZ).normalized()
	var cp: Vector3
	var lk: Vector3
	if close:
		orbit += dt * 0.18
		var ang := orbit
		var off := (out * cos(ang) + hd * sin(ang)).normalized()
		cp = hp + off * 5.2 + Vector3(0, 1.5, 0)
		lk = hp + Vector3(0, 1.25, 0) + hd * 0.3
		cam.fov = lerpf(cam.fov, 30.0, minf(1.0, dt * 2.0)) if dt > 0.0 else 30.0
	else:
		cp = hp + out * 9.0 + hd * 4.5 + Vector3(0, 2.0, 0)
		lk = hp + Vector3(0, 1.2, 0) - out * 1.5 - hd * 1.0
		cam.fov = lerpf(cam.fov, 26.0, minf(1.0, dt * 2.0)) if dt > 0.0 else 26.0
	var k := 1.0 - exp(-dt * 2.4) if dt > 0.0 else 1.0
	_cp = cp if _cp == null else (_cp as Vector3).lerp(cp, k)
	_lk = lk if _lk == null else (_lk as Vector3).lerp(lk, k)
	cam.position = _cp
	cam.look_at(_lk, Vector3.UP)
	var attr := cam.attributes as CameraAttributesPractical
	attr.dof_blur_far_distance = cam.position.distance_to(hp) + 3.0
