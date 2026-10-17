# 騎手：手作りの骨（js/ui/race3d.js の 24 腰・25 上体・26 頭・27/28 左腕・29/30 右腕・31 ムチ）と同じ並びの節を ViewGait の角度で動かし、
# 素材の体（assets/jockey/jockey.glb。Quaternius・CC0）の骨を、その節の位置へ毎コマ IK で合わせる（js/ui/race3d.js の poseJockey と同じ合わせ方）。
# 素材が読めないときは、節に丸い棒の形を付けた騎手で描く。この Node3D は馬の胴（手作りの骨 1）の子で、鞍のずれ（ViewHorse.seat_shift）だけ動かして置く
class_name ViewJockey
extends Node3D

# 手作りの骨の付け根（体の比を直したあとの馬の座標。x 前・y 上・z 右。胴が立ち姿の高さのとき）
# 競馬の乗り方：鐙はとても短く、腰は鞍（上面 1.63）から浮かせ、背は馬の背とほぼ平行。膝はき甲（x 0.5）の横、手は首の付け根の低い所
const J := {24: [0.07, 1.8, 0.0], 25: [0.12, 1.82, 0.0], 26: [0.56, 1.95, 0.0],
	27: [0.5, 1.92, -0.15], 28: [0.64, 1.8, -0.17], 29: [0.5, 1.92, 0.15], 30: [0.64, 1.8, 0.17], 31: [0.8, 1.81, 0.09]}
# 鐙（足首）・膝の向き・手：馬の胴の中の点（x 前・y 上・z 右）
const STIR := [0.08, 1.47, 0.215]       # 足首。すねは膝から斜め後ろ下へ寝る
const KNEE_POLE := [1.0, 0.1, 0.04]    # 膝は前へ、わずかに外へ（き甲の横に付ける）
const HAND := [0.77, 1.81, 0.08]       # 手綱を持つ手（首の付け根のすぐ上）
const HAND_UP := [0.5, 1.8, 0.1]       # 体を起こしたときの手（き甲の前の低い所。馬の胴の中）
# 体の起こし（P[JU]＝1）：腰を鞍へ下ろし、上体を起こし、頭と腕は前へ残す
const UP_HIP := [-0.05, -0.08]         # 腰の動き（前・上）
const UP_TORSO := 0.95                 # 上体の起こし（rad）
const UP_HEAD := -0.6
const UP_ARM := -0.8
const UP_FORE := 0.15
# 素材の体を細くする（Superhero の体は幅が広い。小柄な騎手の 50kg ほどに）：骨ごとに、骨の軸からの横の離れを掛ける
const THIN := {"thigh": 0.82, "calf": 0.84, "upperarm": 0.78, "lowerarm": 0.82, "pelvis": 0.86, "spine_01": 0.86, "spine_02": 0.86, "spine_03": 0.86, "clavicle": 0.88}
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
# 素材の体
const JK_SCALE := 0.86        # 背の高さ 1.58m（馬の背 1.59m）
var _up := 0.0                # 体の起こし（P[JU]）
var body: Node3D              # 素材の体の根（馬の根の子）
var skel: Skeleton3D
var bmat: ShaderMaterial
var B := {}                   # 骨の名前 → 番号
var _head_up := Vector3.ZERO  # 頭の骨の中の、頭の上を指す点
static var _mesh_cache: ArrayMesh
static var _src: PackedScene

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
	# ムチ（右手。後ろへ寝かせて持つ）
	var w31: Node3D = nodes[31]
	whip_mi = capsule(w31, Vector3(0, 0, 0), Vector3(0.02, 0.32, -0.6), 0.008, mat(Color(0.08, 0.06, 0.05), 0.4))
	if _make_body(info):
		pose(ViewGait.make())
		return
	var n24: Node3D = nodes[24]
	var n25: Node3D = nodes[25]
	var n26: Node3D = nodes[26]
	var o25 := hmv(J[25])
	# 腰：白いズボンの尻
	var hips := ball(n24, Vector3(0, -0.01, -0.02), 0.12, breeches, 0.85)
	hips.scale = Vector3(1.05, 1, 1.1)
	# 上体：腰から肩へ（前かがみ）。勝負服
	var sh := Vector3(0, 1.93, 0.56)
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
		var hand := Vector3(-HAND[2] * side[2], HAND[1], HAND[0]) - hmv(J[side[1]])
		capsule(fa, Vector3.ZERO, hand, 0.045, silk)
		ball(fa, hand, 0.045, breeches)
	# 脚：腰の左右 → 鐙（胴の横）
	for sd in [-1.0, 1.0]:
		var thigh := capsule(self, Vector3.ZERO, Vector3(0, THIGH, 0), 0.066, breeches)
		var shin := capsule(self, Vector3.ZERO, Vector3(0, SHIN, 0), 0.046, boots)
		var hip := Vector3(0.1 * sd * -1.0, -0.05, 0.02)
		var stir := hmv([STIR[0], STIR[1], STIR[2] * sd]) - j1
		legs.append([thigh, shin, hip, stir])
	pose(ViewGait.make())

# 手作りの角度で節を回し、脚を IK で合わせる
func pose(P: PackedFloat32Array) -> void:
	_up = P[ViewGait.JU]
	var add := {25: UP_TORSO, 26: UP_HEAD, 27: UP_ARM, 29: UP_ARM, 28: UP_FORE, 30: UP_FORE}
	for i in nodes:
		var n: Node3D = nodes[i]
		var base: Vector3 = n.get_meta("base")
		if i == 24:
			n.position = base + Vector3(0, P[ViewGait.JY] + UP_HIP[1] * _up, P[ViewGait.JX] + UP_HIP[0] * _up)
		n.basis = ViewHorse._rot(P[i * 3] + float(add.get(i, 0.0)) * _up, P[i * 3 + 1], P[i * 3 + 2])
	if skel != null:
		_ik()
		return
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

# ---- 素材の体 ----
func _make_body(info: Dictionary) -> bool:
	if _src == null:
		if not ResourceLoader.exists("res://assets/jockey/jockey.glb"):
			return false
		_src = load("res://assets/jockey/jockey.glb")
	if _src == null:
		return false
	body = _src.instantiate()
	var sks := body.find_children("*", "Skeleton3D", true, false)
	if sks.is_empty():
		body.free()
		body = null
		return false
	skel = sks[0]
	var hi: MeshInstance3D = null
	for mi in body.find_children("*", "MeshInstance3D", true, false):
		if String(mi.name).to_lower().ends_with("lo"):
			mi.visible = false
		else:
			hi = mi
	if hi == null:
		return false
	if _mesh_cache == null:
		_mesh_cache = _with_rest(hi.mesh, hi.skin)
	hi.mesh = _mesh_cache
	hi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var sk: Dictionary = info.get("silks", {"base": "#1f4fbf", "sub": "#ffd23f", "pattern": "plain"})
	bmat = ShaderMaterial.new()
	bmat.shader = preload("res://view/shaders/jockey.gdshader")
	bmat.set_shader_parameter("base_col", ViewHorse.hexc(sk.get("base"), Color(0.12, 0.3, 0.75)))
	bmat.set_shader_parameter("sub_col", ViewHorse.hexc(sk.get("sub", sk.get("base")), Color(1, 1, 1)))
	var pats := ["plain", "hoops", "stripes", "sash", "cross", "diamonds", "stars", "halves", "yoke"]
	bmat.set_shader_parameter("pattern", maxi(0, pats.find(String(sk.get("pattern", "plain")))))
	bmat.set_shader_parameter("cap_col", ViewHorse.hexc(info.get("cap"), Color(1, 1, 1)))
	hi.material_override = bmat
	body.scale = Vector3.ONE * JK_SCALE
	# 馬の根（胴の親）の子にする
	get_parent().get_parent().add_child(body)
	for i in skel.get_bone_count():
		B[skel.get_bone_name(i)] = i
	var hb: int = B.get("Head", -1)
	if hb >= 0:
		var g := skel.get_bone_global_rest(hb)
		_head_up = g.affine_inverse() * (g.origin + Vector3(0, 0.15, 0))
	head_parts.append(body)
	return true

# 頂点に、写す前の位置と部位の番号（頂点色の R×8）を CUSTOM0 で持たせる。体は骨ごとに細くする（THIN）
static func _with_rest(src: Mesh, skin: Skin) -> ArrayMesh:
	# 骨（bind の番号）ごとの軸：付け根 → 子の付け根（素材の座標）
	var org := {}
	var bnames := {}
	if skin != null:
		for i in skin.get_bind_count():
			org[String(skin.get_bind_name(i))] = skin.get_bind_pose(i).affine_inverse().origin
			bnames[i] = String(skin.get_bind_name(i))
	var child := {"thigh": "calf", "calf": "foot", "upperarm": "lowerarm", "lowerarm": "hand"}
	var out := ArrayMesh.new()
	for si in src.get_surface_count():
		var a := src.surface_get_arrays(si)
		var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
		var V0 := V.duplicate()
		var C: PackedColorArray = a[Mesh.ARRAY_COLOR]
		var BI: PackedInt32Array = a[Mesh.ARRAY_BONES] if a[Mesh.ARRAY_BONES] != null else PackedInt32Array()
		var BW: PackedFloat32Array = a[Mesh.ARRAY_WEIGHTS] if a[Mesh.ARRAY_WEIGHTS] != null else PackedFloat32Array()
		var nb := BI.size() / maxi(1, V.size())
		for k in V.size():
			var v := V[k]
			var acc := Vector3.ZERO
			for q in nb:
				var w := BW[k * nb + q]
				if w <= 0.0:
					continue
				var bn: String = bnames.get(BI[k * nb + q], "")
				var key := bn.trim_suffix("_l").trim_suffix("_r")
				var f: float = THIN.get(key, 1.0)
				var moved := v
				if f < 1.0 and org.has(bn):
					var o: Vector3 = org[bn]
					if child.has(key):
						# 手足：骨の軸のまわりに細く
						var e: Vector3 = org.get(child[key] + bn.substr(bn.length() - 2), o + Vector3.DOWN)
						var ax := (e - o).normalized()
						var c := o + ax * (v - o).dot(ax)
						moved = c + (v - c) * f
					else:
						# 胴：横（x）を真ん中へ、前後（z）を骨の付け根へ少し
						moved = Vector3(v.x * f, v.y, o.z + (v.z - o.z) * lerpf(1.0, f, 0.6))
				acc += moved * w
			var ws := 0.0
			for q in nb:
				ws += BW[k * nb + q]
			if ws > 0.0:
				V[k] = acc / ws
		a[Mesh.ARRAY_VERTEX] = V
		var C0 := PackedFloat32Array()
		C0.resize(V.size() * 4)
		for k in V.size():
			C0[k * 4] = V0[k].x; C0[k * 4 + 1] = V0[k].y; C0[k * 4 + 2] = V0[k].z
			C0[k * 4 + 3] = roundf(C[k].r * 8.0) if C.size() > k else 1.0
		a[Mesh.ARRAY_CUSTOM0] = C0
		var flags: int = src.surface_get_format(si) & Mesh.ARRAY_FLAG_USE_8_BONE_WEIGHTS
		out.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, a, [], {}, flags | (Mesh.ARRAY_CUSTOM_RGBA_FLOAT << Mesh.ARRAY_FORMAT_CUSTOM0_SHIFT))
	out.custom_aabb = AABB(Vector3(-1, -0.2, -1), Vector3(2, 2.4, 2))
	return out

# 手作りの骨 i の中の点（race3d.js の atBone：馬の形の座標で書いた点 → 体の比を直す → 骨の付け根からの差）→ 骨格の座標
func _at(i: int, x: float, y: float, z: float) -> Vector3:
	var m := Vector3(x, y, z) if i >= 24 else Vector3(_tx(x), y, z)
	var jj: Array = J[i] if i >= 24 else [0.099, 1.25, 0.0]
	var local := hmv([m.x - jj[0], m.y - jj[1], m.z - jj[2]])
	var n: Node3D = nodes[i] if i >= 24 else self
	return _to_skel(n.global_transform * local)

func _dir(i: int, x: float, y: float, z: float) -> Vector3:
	var n: Node3D = nodes[i] if i >= 24 else get_parent()
	var w := n.global_transform.basis * hmv([x, y, z])
	return (_skel_inv.basis * w).normalized()

static func _tx(x: float) -> float:
	return 0.66 + (x - 0.66) * 0.85 if x < 0.66 else x

var _skel_inv := Transform3D.IDENTITY
func _to_skel(p: Vector3) -> Vector3:
	return _skel_inv * p

func _gp(b: int) -> Vector3:
	return skel.get_bone_global_pose(b).origin

# 骨 b をまわして、いま cur にある点を target の向きへ（骨格の座標）
func _aim(b: int, cur: Vector3, target: Vector3) -> void:
	var g := skel.get_bone_global_pose(b)
	var u := cur - g.origin
	var w := target - g.origin
	if u.length_squared() < 1e-10 or w.length_squared() < 1e-10:
		return
	var q := Quaternion(u.normalized(), w.normalized())
	skel.set_bone_global_pose(b, Transform3D(Basis(q) * g.basis, g.origin))

# 2本の骨（a→b→c）の先 c を target へ。曲がる向きは pole
func _two(a: int, b: int, c: int, target: Vector3, pole: Vector3) -> void:
	var pa := _gp(a)
	var pb := _gp(b)
	var pc := _gp(c)
	var l1 := pa.distance_to(pb)
	var l2 := pb.distance_to(pc)
	var dir := target - pa
	var d := clampf(dir.length(), absf(l1 - l2) + 1e-3, (l1 + l2) * 0.999)
	dir = dir.normalized()
	var x := (l1 * l1 - l2 * l2 + d * d) / (2.0 * d)
	var y := sqrt(maxf(0.0, l1 * l1 - x * x))
	var pn := pole - dir * pole.dot(dir)
	pn = Vector3.UP if pn.length_squared() < 1e-8 else pn.normalized()
	var knee := pa + dir * x + pn * y
	_aim(a, pb, knee)
	_aim(b, _gp(c), pa + dir * d)

func _ik() -> void:
	if not body.is_inside_tree():
		return
	_skel_inv = skel.global_transform.affine_inverse()
	skel.reset_bone_poses()
	for s in ["l", "r"]:
		skel.set_bone_pose_scale(B["upperarm_" + s], Vector3.ONE * 1.08)
	# 腰：手作りの腰の骨（24）の位置へ。前へ傾ける（座ると立つ）
	var pel: int = B.pelvis
	var hip := _at(24, 0.07, 1.8, 0.0)
	var gp := skel.get_bone_global_pose(pel)
	skel.set_bone_global_pose(pel, Transform3D(gp.basis, hip))
	_aim(pel, _gp(B.spine_01), hip + _dir(24, lerpf(0.9, 0.35, _up), lerpf(0.42, 0.94, _up), 0.0))
	# 背骨：肩の真ん中へ
	var sh := _at(25, 0.56, 1.93, 0.0)
	_aim(B.spine_01, _gp(B.neck_01), sh)
	_aim(B.spine_03, _gp(B.neck_01), sh)
	# 首と頭：頭を上げて前を見る
	var np := _gp(B.neck_01)
	_aim(B.neck_01, _gp(B.Head), np + _dir(26, 0.78, 0.62, 0.0))
	var hg := skel.get_bone_global_pose(B.Head)
	_aim(B.Head, hg * _head_up, hg.origin + _dir(26, 0.32, 0.95, 0.0))
	# 腕：手綱を持つ手へ。肘は外・上へ
	for arm in [["l", 28, -1.0], ["r", 30, 1.0]]:
		var s: String = arm[0]
		var hand := _at(arm[1], HAND[0], HAND[1], arm[2] * HAND[2])
		if _up > 0.0:
			hand = hand.lerp(_at(1, HAND_UP[0], HAND_UP[1], arm[2] * HAND_UP[2]), _up)
		_two(B["upperarm_" + s], B["lowerarm_" + s], B["hand_" + s], hand, _dir(1, -0.5, 0.35, arm[2]))
	# 脚：短い鐙へ。膝はき甲の横（前・少し外）、つま先は前へ
	for leg in [["l", -1.0], ["r", 1.0]]:
		var s2: String = leg[0]
		var sd: float = leg[1]
		var ank := _at(1, STIR[0], STIR[1], sd * STIR[2])
		_two(B["thigh_" + s2], B["calf_" + s2], B["foot_" + s2], ank, _dir(1, KNEE_POLE[0], KNEE_POLE[1], sd * KNEE_POLE[2]))
		var fp := _gp(B["foot_" + s2])
		_aim(B["foot_" + s2], _gp(B["ball_" + s2]), fp + _dir(1, 0.95, -0.2, sd * 0.1))
	# ムチ：右手の中へ。体を起こした分だけ戻して、後ろへ寝かせたまま持つ
	var w31: Node3D = nodes[31]
	var hr := _gp(B.hand_r)
	var palm := hr + (hr - _gp(B.lowerarm_r)).normalized() * 0.06
	var axis := (global_transform.basis * Vector3(-1, 0, 0)).normalized()
	w31.global_transform = Transform3D(Basis(axis, -(UP_TORSO + UP_ARM + UP_FORE) * _up) * w31.global_basis, skel.global_transform * palm)
