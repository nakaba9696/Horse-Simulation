# 1頭の馬：Quaternius の馬（骨と襲歩のアニメーション）を毛色で塗り、騎手（勝負服・帽子）とゼッケンを付ける
# 根（この Node3D）は実寸（m）。馬のモデルだけ縮める。前は +Z
class_name HorseRig
extends Node3D

const MODEL_SCALE := 0.52   # Quaternius の馬（き甲まで約3.1）を実寸（約1.6m）に
const SADDLE := Vector3(0, 1.58, 0.2)   # 鞍の上（実寸、根から）

var model: Node3D
var ap: AnimationPlayer
var skel: Skeleton3D
var jockey: Node3D
var num := 1
var gallop_len := 0.6
var idle_len := 1.0
var cur_anim := ""
var torso_bone := -1
var cloth: Node3D

static var _smooth := {}

# 同じ位置の頂点の法線をならす（面ごとに分かれた低ポリの角を丸く見せる）。骨と重みはそのまま
static func smooth_mesh(mesh: Mesh) -> Mesh:
	if _smooth.has(mesh):
		return _smooth[mesh]
	var acc := {}
	var surfs: Array = []
	for i in mesh.get_surface_count():
		var arr := mesh.surface_get_arrays(i)
		surfs.append(arr)
		var v: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
		var n: PackedVector3Array = arr[Mesh.ARRAY_NORMAL]
		for k in v.size():
			var key := Vector3i((v[k] * 2000.0).round())
			acc[key] = acc.get(key, Vector3.ZERO) + n[k]
	var out := ArrayMesh.new()
	for i in surfs.size():
		var arr: Array = surfs[i]
		var v: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
		var n: PackedVector3Array = (arr[Mesh.ARRAY_NORMAL] as PackedVector3Array).duplicate()
		for k in v.size():
			n[k] = (acc[Vector3i((v[k] * 2000.0).round())] as Vector3).normalized()
		arr[Mesh.ARRAY_NORMAL] = n
		arr[Mesh.ARRAY_TANGENT] = null
		var flags: int = mesh.surface_get_format(i) & Mesh.ARRAY_FLAG_USE_8_BONE_WEIGHTS
		out.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr, [], {}, flags)
		out.surface_set_material(i, mesh.surface_get_material(i))
	_smooth[mesh] = out
	return out

static func hexc(s) -> Color:
	if s == null:
		return Color(0.5, 0.5, 0.5)
	return Color.html(String(s))

func setup(info: Dictionary, scene: PackedScene, font: Font) -> void:
	num = int(info.num)
	model = scene.instantiate()
	model.scale = Vector3.ONE * MODEL_SCALE
	add_child(model)
	ap = model.find_children("*", "AnimationPlayer", true, false)[0]
	skel = model.find_children("*", "Skeleton3D", true, false)[0]
	ap.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_MANUAL
	gallop_len = ap.get_animation("Gallop").length
	idle_len = ap.get_animation("Idle").length
	for mi in model.find_children("*", "MeshInstance3D", true, false):
		(mi as MeshInstance3D).mesh = smooth_mesh((mi as MeshInstance3D).mesh)
	paint(info.coatLook)
	build_cloth(info, font)
	build_jockey(info)

# 毛色：Main＝体・Main_Dark＝背・Main_Light＝腹・Hair＝たてがみと尾・Hooves＝蹄・Muzzle＝鼻先
func paint(L: Dictionary) -> void:
	var gloss: float = L.get("gloss", 0.5)
	var map := {"Main": L.body, "Main_Dark": L.top, "Main_Light": L.belly, "Hair": L.mane, "Hooves": L.hoof, "Muzzle": L.muzzle}
	for mi in model.find_children("*", "MeshInstance3D", true, false):
		var m: MeshInstance3D = mi
		for i in m.mesh.get_surface_count():
			var src: Material = m.mesh.surface_get_material(i)
			var nm := src.resource_name if src else ""
			var mat := StandardMaterial3D.new()
			if map.has(nm):
				mat.albedo_color = hexc(map[nm])
			elif src is BaseMaterial3D:
				mat.albedo_color = (src as BaseMaterial3D).albedo_color
			mat.roughness = 0.38 + (1.0 - gloss) * 0.45 if nm.begins_with("Main") else 0.7
			mat.metallic_specular = 0.55 if nm.begins_with("Main") else 0.4
			if nm.begins_with("Main"):
				mat.rim_enabled = true
				mat.rim = 0.25 * gloss
				mat.rim_tint = 0.7
			if nm == "Eye_Black":
				mat.roughness = 0.1
			m.set_surface_override_material(i, mat)

func silks_mat(sk: Dictionary) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = preload("res://shaders/silks.gdshader")
	m.set_shader_parameter("base_col", hexc(sk.base))
	m.set_shader_parameter("sub_col", hexc(sk.sub))
	var pats := ["plain", "hoops", "stripes", "sash", "cross", "diamonds", "stars", "halves", "yoke"]
	m.set_shader_parameter("pattern", maxi(0, pats.find(String(sk.pattern))))
	return m

func mat(c: Color, rough := 0.6) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	return m

# 2点のあいだの丸い棒（カプセル）
func limb(parent: Node3D, a: Vector3, b: Vector3, r: float, m: Material) -> MeshInstance3D:
	var cm := CapsuleMesh.new()
	cm.radius = r
	cm.height = (b - a).length() + 2.0 * r
	cm.radial_segments = 12
	cm.rings = 4
	var mi := MeshInstance3D.new()
	mi.mesh = cm
	mi.material_override = m
	mi.transform = Transform3D(CourseBuilder.basis_between(a, b), (a + b) / 2.0)
	parent.add_child(mi)
	return mi

func ball(parent: Node3D, p: Vector3, r: float, m: Material, sy := 1.0) -> MeshInstance3D:
	var sm := SphereMesh.new()
	sm.radius = r
	sm.height = 2.0 * r * sy
	var mi := MeshInstance3D.new()
	mi.mesh = sm
	mi.material_override = m
	mi.position = p
	parent.add_child(mi)
	return mi

# 騎手：鞍の上で前かがみ（短いあぶみで立つ形）
func build_jockey(info: Dictionary) -> void:
	jockey = Node3D.new()
	jockey.position = SADDLE
	add_child(jockey)
	var silk := silks_mat(info.silks)
	var breeches := mat(Color(0.86, 0.86, 0.84), 0.75)
	var boots := mat(Color(0.06, 0.06, 0.06), 0.35)
	var skin := mat(Color(0.86, 0.68, 0.55), 0.6)
	var cap := mat(hexc(info.cap), 0.3)
	var hip := Vector3(0, 0.36, -0.12)
	var chest := Vector3(0, 0.58, 0.38)
	var torso := limb(jockey, hip, chest, 0.16, silk)
	torso.scale = Vector3(1.15, 1, 0.85)
	for sd in [-1.0, 1.0]:
		var knee := Vector3(0.25 * sd, 0.22, 0.30)
		var foot := Vector3(0.30 * sd, -0.30, 0.16)
		limb(jockey, hip + Vector3(0.1 * sd, 0, 0), knee, 0.085, breeches)
		limb(jockey, knee, foot, 0.06, boots)
		var sh := chest + Vector3(0.17 * sd, 0.02, -0.02)
		var elbow := Vector3(0.24 * sd, 0.40, 0.58)
		var hand := Vector3(0.10 * sd, 0.24, 0.80)
		limb(jockey, sh, elbow, 0.058, silk)
		limb(jockey, elbow, hand, 0.048, silk)
		ball(jockey, hand, 0.05, breeches)
	var head := chest + Vector3(0, 0.15, 0.17)
	ball(jockey, head, 0.105, skin)
	var helmet := ball(jockey, head + Vector3(0, 0.035, -0.01), 0.125, cap, 0.85)
	var visor := BoxMesh.new()
	visor.size = Vector3(0.17, 0.015, 0.08)
	var vm := MeshInstance3D.new()
	vm.mesh = visor
	vm.material_override = cap
	vm.position = head + Vector3(0, 0.06, 0.12)
	jockey.add_child(vm)
	# ゴーグル
	var gog := BoxMesh.new()
	gog.size = Vector3(0.16, 0.04, 0.03)
	var gm := MeshInstance3D.new()
	gm.mesh = gog
	gm.material_override = mat(Color(0.05, 0.05, 0.06), 0.1)
	gm.position = head + Vector3(0, 0.01, 0.1)
	jockey.add_child(gm)

# 鞍とゼッケン（胴の骨につけて、馬の動きについてくる）
func build_cloth(info: Dictionary, font: Font) -> void:
	# 胴の骨の位置だけを追う（向きは馬の体の向きのまま）
	torso_bone = skel.find_bone("Torso2")
	cloth = Node3D.new()
	add_child(cloth)
	var holder := cloth
	var c_m := mat(Color(0.97, 0.97, 0.95), 0.75)
	# 鞍の下の白い布（左右の薄い板）と鞍
	for sd in [-1.0, 1.0]:
		var pad := BoxMesh.new()
		pad.size = Vector3(0.02, 0.4, 0.58)
		var pm := MeshInstance3D.new()
		pm.mesh = pad
		pm.material_override = c_m
		pm.position = Vector3(0.355 * sd, 0.02, 0.0)
		pm.rotation = Vector3(0, 0, -0.12 * sd)
		holder.add_child(pm)
	var saddle := BoxMesh.new()
	saddle.size = Vector3(0.42, 0.06, 0.46)
	var sm := MeshInstance3D.new()
	sm.mesh = saddle
	sm.material_override = mat(Color(0.12, 0.08, 0.06), 0.4)
	sm.position = Vector3(0, 0.235, 0.0)
	holder.add_child(sm)
	for sd in [-1.0, 1.0]:
		var l := Label3D.new()
		l.text = str(int(info.num))
		l.font = font
		l.font_size = 96
		l.pixel_size = 0.0028
		l.modulate = Color(0.05, 0.05, 0.05)
		l.position = Vector3(0.368 * sd, 0.0, 0.02)
		l.rotation_degrees = Vector3(0, 90 * sd, -7 * sd)
		l.shaded = true
		holder.add_child(l)

# 姿勢：phase＝一完歩の中の位置（0〜1）、moving＝走っているか
func pose(phase: float, moving: bool, t: float) -> void:
	if moving:
		if cur_anim != "Gallop":
			ap.play("Gallop"); cur_anim = "Gallop"
		ap.seek(phase * gallop_len, true)
		ap.advance(0)
		follow_cloth()
		# 騎手は馬の上下の動きを膝で吸う（少しだけ上下）
		jockey.position = SADDLE + Vector3(0, 0.035 * sin(phase * TAU * 2.0 + 0.6), 0)
	else:
		if cur_anim != "Idle":
			ap.play("Idle"); cur_anim = "Idle"
		ap.seek(fposmod(t + num * 0.37, idle_len), true)
		ap.advance(0)
		follow_cloth()
		jockey.position = SADDLE

func follow_cloth() -> void:
	# 骨の位置（モデルの中の座標）を実寸に直して、布と鞍を置く
	var bp := skel.get_bone_global_pose(torso_bone).origin * MODEL_SCALE
	cloth.position = Vector3(0, bp.y, bp.z)
