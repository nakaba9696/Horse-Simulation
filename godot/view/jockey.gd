# 騎手：手作りの骨（js/ui/race3d.js の 24 腰・25 上体・26 頭・27/28 左腕・29/30 右腕・31 ムチ）と同じ並びの節に、丸い棒の形を付ける
# 角度は ViewGait の P（rz・ry・rx）。脚は腰から鐙（胴に付いた点）へ、2本の骨の IK で膝を出す。この Node3D は馬の胴（手作りの骨 1）の子
class_name ViewJockey
extends Node3D

# 手作りの骨の付け根（体の比を直したあとの座標。x 前・y 上・z 右）
const J := {24: [0.084, 1.87, 0.0], 25: [0.204, 1.9, 0.0], 26: [0.624, 2.07, 0.0],
	27: [0.514, 2.0, -0.15], 28: [0.664, 1.86, -0.2], 29: [0.514, 2.0, 0.15], 30: [0.664, 1.86, 0.2], 31: [0.924, 1.81, 0.1]}
const PARENT := {25: 24, 26: 25, 27: 25, 28: 27, 29: 25, 30: 29, 31: 30}
const THIGH := 0.46
const SHIN := 0.5

var j1 := Vector3.ZERO
var nodes := {}
var legs: Array = []       # [腿, 脛, 腰の点(24の中), 鐙(胴の中)]
var silk: ShaderMaterial
var whip_mi: MeshInstance3D
var mats: Array[BaseMaterial3D] = []
var head_parts: Array[Node3D] = []

static func hmv(a: Array) -> Vector3:
	return Vector3(-a[2], a[1], a[0])

func mat(c: Color, rough := 0.6) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	ViewHorse.fade_setup(m)
	mats.append(m)
	return m

static func basis_between(a: Vector3, b: Vector3) -> Basis:
	var y := (b - a).normalized()
	var x := y.cross(Vector3.FORWARD if absf(y.z) < 0.9 else Vector3.RIGHT).normalized()
	var z := x.cross(y).normalized()
	return Basis(x, y, z)

func capsule(parent: Node3D, a: Vector3, b: Vector3, r: float, m: Material, sx := 1.0, sz := 1.0) -> MeshInstance3D:
	var cm := CapsuleMesh.new()
	cm.radius = r
	cm.height = (b - a).length() + 2.0 * r
	cm.radial_segments = 14
	cm.rings = 5
	var mi := MeshInstance3D.new()
	mi.mesh = cm
	mi.material_override = m
	mi.transform = Transform3D(basis_between(a, b).scaled_local(Vector3(sx, 1, sz)), (a + b) / 2.0)
	parent.add_child(mi)
	return mi

func ball(parent: Node3D, p: Vector3, r: float, m: Material, sy := 1.0) -> MeshInstance3D:
	var sm := SphereMesh.new()
	sm.radius = r
	sm.height = 2.0 * r * sy
	sm.radial_segments = 16
	sm.rings = 8
	var mi := MeshInstance3D.new()
	mi.mesh = sm
	mi.material_override = m
	mi.position = p
	parent.add_child(mi)
	return mi

func setup(info: Dictionary, torso_origin: Vector3) -> void:
	j1 = torso_origin
	var sk: Dictionary = info.get("silks", {"base": "#1f4fbf", "sub": "#ffd23f", "pattern": "plain"})
	silk = ShaderMaterial.new()
	silk.shader = preload("res://view/shaders/silks.gdshader")
	silk.set_shader_parameter("base_col", ViewHorse.hexc(sk.get("base"), Color(0.12, 0.3, 0.75)))
	silk.set_shader_parameter("sub_col", ViewHorse.hexc(sk.get("sub"), Color(1, 0.82, 0.25)))
	var pats := ["plain", "hoops", "stripes", "sash", "cross", "diamonds", "stars", "halves", "yoke"]
	silk.set_shader_parameter("pattern", maxi(0, pats.find(String(sk.get("pattern", "plain")))))
	var breeches := mat(Color(0.9, 0.9, 0.88), 0.75)
	var boots := mat(Color(0.05, 0.05, 0.05), 0.3)
	var skin := mat(Color(0.86, 0.68, 0.55), 0.6)
	var cap := mat(ViewHorse.hexc(info.get("cap"), Color(1, 1, 1)), 0.3)
	# 節（親から順に）
	for i in [24, 25, 26, 27, 28, 29, 30, 31]:
		var n := Node3D.new()
		var par: Node3D = self if i == 24 else nodes[PARENT[i]]
		var base := hmv(J[i]) - (j1 if i == 24 else hmv(J[PARENT[i]]))
		n.position = base
		n.set_meta("base", base)
		par.add_child(n)
		nodes[i] = n
	var n24: Node3D = nodes[24]
	var n25: Node3D = nodes[25]
	var n26: Node3D = nodes[26]
	var o25 := hmv(J[25])
	# 腰：白いズボンの尻
	var hips := ball(n24, Vector3(0, -0.01, -0.02), 0.12, breeches, 0.85)
	hips.scale = Vector3(1.05, 1, 1.1)
	# 上体：腰から肩へ（前かがみ）。勝負服
	var sh := Vector3(0, 2.02, 0.5)
	var torso := capsule(n25, Vector3(0, 0.0, -0.08), sh - o25, 0.14, silk, 1.2, 0.8)
	head_parts.append(torso)
	torso.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	# 頭・帽子・ゴーグル
	var hc := Vector3(0, 0.1, 0.07)
	head_parts.append(ball(n26, Vector3(0, 0.0, 0.0), 0.06, skin))
	head_parts.append(ball(n26, hc, 0.1, skin))
	var helmet := ball(n26, hc + Vector3(0, 0.035, -0.01), 0.118, cap, 0.86)
	head_parts.append(helmet)
	helmet.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var visor := BoxMesh.new()
	visor.size = Vector3(0.16, 0.014, 0.07)
	var vm := MeshInstance3D.new()
	vm.mesh = visor
	vm.material_override = cap
	vm.position = hc + Vector3(0, 0.05, 0.11)
	vm.rotation.x = 0.25
	n26.add_child(vm)
	head_parts.append(vm)
	var gog := BoxMesh.new()
	gog.size = Vector3(0.15, 0.035, 0.03)
	var gm := MeshInstance3D.new()
	gm.mesh = gog
	gm.material_override = mat(Color(0.04, 0.04, 0.05), 0.08)
	gm.position = hc + Vector3(0, 0.005, 0.095)
	n26.add_child(gm)
	head_parts.append(gm)
	# 腕：上腕（肩→肘）・前腕（肘→手）。手は手綱を持つ（たてがみの上）
	for side in [[27, 28, -1.0], [29, 30, 1.0]]:
		var ua: Node3D = nodes[side[0]]
		var fa: Node3D = nodes[side[1]]
		var elbow := hmv(J[side[1]]) - hmv(J[side[0]])
		capsule(ua, Vector3.ZERO, elbow, 0.055, silk)
		var hand := Vector3(-0.09 * side[2], 1.78, 0.86) - hmv(J[side[1]])
		capsule(fa, Vector3.ZERO, hand, 0.045, silk)
		ball(fa, hand, 0.045, breeches)
	# ムチ（右手。後ろへ寝かせて持つ）
	var w31: Node3D = nodes[31]
	whip_mi = capsule(w31, Vector3(0, 0, 0), Vector3(0.02, 0.32, -0.6), 0.008, mat(Color(0.08, 0.06, 0.05), 0.4))
	# 脚：腰の左右 → 鐙（胴の横）
	for sd in [-1.0, 1.0]:
		var thigh := capsule(self, Vector3.ZERO, Vector3(0, THIGH, 0), 0.066, breeches)
		var shin := capsule(self, Vector3.ZERO, Vector3(0, SHIN, 0), 0.046, boots)
		var hip := Vector3(0.1 * sd * -1.0, -0.05, 0.02)
		var stir := hmv([0.18, 1.24, 0.31 * sd]) - j1
		legs.append([thigh, shin, hip, stir])
	pose(ViewGait.make())

# 手作りの角度で節を回し、脚を IK で合わせる
func pose(P: PackedFloat32Array) -> void:
	for i in nodes:
		var n: Node3D = nodes[i]
		var base: Vector3 = n.get_meta("base")
		if i == 24:
			n.position = base + Vector3(0, P[ViewGait.JY], P[ViewGait.JX])
		n.basis = ViewHorse._rot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2])
	var n24: Node3D = nodes[24]
	for L in legs:
		var a: Vector3 = n24.transform * (L[2] as Vector3)
		var c: Vector3 = L[3]
		var d := (c - a)
		var dl := clampf(d.length(), 0.05, THIGH + SHIN - 0.01)
		var dir := d.normalized()
		# 膝は前へ（+Z）
		var pole := (Vector3(0, 0, 1) - dir * dir.z).normalized()
		var ca := (THIGH * THIGH + dl * dl - SHIN * SHIN) / (2.0 * THIGH * dl)
		var ang := acos(clampf(ca, -1.0, 1.0))
		var knee := a + (dir * cos(ang) + pole * sin(ang)) * THIGH
		_place(L[0], a, knee)
		_place(L[1], knee, a + dir * dl)

func _place(mi: MeshInstance3D, a: Vector3, b: Vector3) -> void:
	mi.transform = Transform3D(basis_between(a, b), (a + b) / 2.0)
