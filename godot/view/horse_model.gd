# 骨入りの馬の形（全頭で共有）。tools/export_horse_godot.js が書き出した horse.json から、体・たてがみと尾の房・頭絡の形と骨を組む
# 素材：「Horse Rigged(Game Ready)」abhayexe・CC-BY-4.0（godot/CREDITS.md）。比の写し直しはブラウザ版（js/ui/horse_rigged.js）と同じ
# 座標は素材の座標（+Z が前・+X が馬の左・+Y が上・地面が y=0）。1頭ぶんの骨と材質は ViewHorse が持つ
class_name ViewHorseModel
extends RefCounted

const PATH := "res://assets/horse_rigged/"
# 骨の名前（素材の名前から空白と _ を除いたもの。js/ui/horse_rigged.js の BN と同じ）
const BN := {
	"pelvis": "Bip01Pelvis", "spine": "Bip01Spine", "spine1": "Bip01Spine1",
	"neck": "Bip01Neck", "neck1": "Bip01Neck1", "head": "Bip01Head",
	"tail": "Bip01Tail", "tail1": "Bip01Tail1", "tail2": "Bip01Tail2", "tail3": "Bip01Tail3",
	"lCla": "Bip01LClavicle", "lUp": "Bip01LUpperArm", "lFo": "Bip01LForearm", "lHa": "Bip01LHand", "lFi": "Bip01LFinger0",
	"rCla": "Bip01RClavicle", "rUp": "Bip01RUpperArm", "rFo": "Bip01RForearm", "rHa": "Bip01RHand", "rFi": "Bip01RFinger0",
	"lTh": "Bip01LThigh", "lCa": "Bip01LCalf", "lHL": "Bip01LHorseLink", "lFt": "Bip01LFoot", "lTo": "Bip01LToe0",
	"rTh": "Bip01RThigh", "rCa": "Bip01RCalf", "rHL": "Bip01RHorseLink", "rFt": "Bip01RFoot", "rTo": "Bip01RToe0",
}
# 手作りの骨（js/ui/race3d.js の並び）→ 素材の骨
const RETARGET := [
	[2, "neck"], [3, "neck1"], [4, "head"], [5, "tail"], [6, "tail1"], [7, "tail2"],
	[8, "lCla"], [9, "lUp"], [10, "lFo"], [11, "lHa"], [12, "rCla"], [13, "rUp"], [14, "rFo"], [15, "rHa"],
	[16, "lTh"], [17, "lCa"], [18, "lHL"], [19, "lFt"], [20, "rTh"], [21, "rCa"], [22, "rHL"], [23, "rFt"],
]
# 脚の最後の骨（蹄の底を計る）：手作りの脚の始めの骨 → 素材の骨
const HOOF := {8: "lHa", 12: "rHa", 16: "lFt", 20: "rFt"}

static var _inst: ViewHorseModel

var names: PackedStringArray = []
var parents: PackedInt32Array = []
var rests: Array[Transform3D] = []
var globals: Array[Transform3D] = []
var role := {}                  # 役の名前 → 骨の番号
var axis_z := {}                # 役 → 骨の中の横の軸（馬の右＝素材の -X）
var axis_y := {}                # 役 → 骨の中の縦の軸
var axis_x := {}                # 役 → 骨の中の前の軸（尾を左右に振る）
var hoof := {}                  # 手作りの脚の番号 → 骨の中の蹄の底
var skin: Skin
var body_mesh: ArrayMesh
var hair_mesh: ArrayMesh
var bridle_mesh: ArrayMesh
var shade_tex: Texture2D
var hair_tex: Texture2D
var info: Dictionary
var handmade: Dictionary
var place_s := 1.0
var place_dx := 0.0
var ear_bones := PackedInt32Array()   # 耳（素材に無いので足した骨）
var cloth_mesh: ArrayMesh             # 鞍の下の布（体の面を浮かせた殻）
var saddle_mesh: ArrayMesh            # 鞍
const CLOTH := {"z0": -0.36, "z1": 0.2, "y0": 1.02}     # 布の範囲（素材の座標）
const SADDLE := {"z0": -0.2, "z1": 0.08, "y0": 1.45}

static func get_model() -> ViewHorseModel:
	if _inst == null:
		_inst = ViewHorseModel.new()
		_inst._load()
	return _inst

# three.js の Matrix4.elements（列ごと）→ Transform3D
static func m4(e: Array) -> Transform3D:
	return Transform3D(Basis(Vector3(e[0], e[1], e[2]), Vector3(e[4], e[5], e[6]), Vector3(e[8], e[9], e[10])), Vector3(e[12], e[13], e[14]))

static func v3(a: Array) -> Vector3:
	return Vector3(a[0], a[1], a[2])

func _load() -> void:
	var d: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(PATH + "horse.json"))
	info = d.info
	handmade = d.handmade
	place_s = float(info.place.S)
	place_dx = float(info.place.dx)
	for i in d.bones.size():
		var b: Dictionary = d.bones[i]
		names.append(String(b.name))
		parents.append(int(b.parent))
		var r := m4(b.rest)
		rests.append(r)
		globals.append(r if int(b.parent) < 0 else globals[int(b.parent)] * r)
	for k in BN:
		var idx := names.find(String(BN[k]))
		if idx >= 0:
			role[k] = idx
	for k in role:
		var gb := globals[role[k]].basis.orthonormalized().inverse()
		axis_z[k] = (gb * Vector3(-1, 0, 0)).normalized()
		axis_y[k] = (gb * Vector3(0, 1, 0)).normalized()
		axis_x[k] = (gb * Vector3(0, 0, 1)).normalized()
	for b0 in HOOF:
		var bi: int = role[HOOF[b0]]
		var gp := globals[bi].origin
		hoof[b0] = globals[bi].affine_inverse() * Vector3(gp.x, 0.0, gp.z)
	var inv: Array = d.inverses
	# 耳の骨を足す（頭の骨の子。うなじの上・左右）
	_add_ears(d.body)
	skin = Skin.new()
	for i in names.size():
		skin.add_bind(i, globals[i].affine_inverse() if i >= inv.size() else m4(inv[i]))
	body_mesh = _build(d.body, true)
	cloth_mesh = _shell(d.body, CLOTH, 0.014)
	saddle_mesh = _shell(d.body, SADDLE, 0.036)
	hair_mesh = _build(d.hair, false)
	bridle_mesh = _build(d.bridle, false)
	shade_tex = load(PATH + "shade.jpg")
	hair_tex = load(PATH + "hair.png")

# 耳：頭の骨にいちばん重い頂点のうち、うなじより上にあるものを左右の耳の骨へ付け替える
var _ear_w := {}   # 頂点の番号 → [骨, 重み]
func _add_ears(g: Dictionary) -> void:
	var hb: int = role["head"]
	var hp: Vector3 = v3(info.headP)
	var nose: Vector3 = v3(info.nose)
	var pos: Array = g.pos
	var si: Array = g.si
	var sw: Array = g.sw
	var n := pos.size() / 3
	# 耳の候補：頭の骨が主で、頭の軸より上・うなじの近く
	var ax := (nose - hp).normalized()
	var up := (Vector3.UP - ax * ax.y).normalized()
	var cand := {-1: [], 1: []}
	var top := {-1: -1e9, 1: -1e9}
	var tip := {-1: Vector3.ZERO, 1: Vector3.ZERO}
	for k in n:
		if int(si[k * 4]) != hb or float(sw[k * 4]) < 0.6:
			continue
		var p := Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2])
		var rel := p - hp
		var along := rel.dot(ax)
		var high := rel.dot(up)
		if along < 0.12 and high > 0.06 and absf(p.x) > 0.012:
			var sd := 1 if p.x > 0.0 else -1
			cand[sd].append(k)
			if high > top[sd]:
				top[sd] = high
				tip[sd] = p
	for sd in [-1, 1]:
		if cand[sd].size() < 6:
			continue
		# 付け根：耳の頂点のうち低いほうの平均
		var lo := 1e9
		for k in cand[sd]:
			lo = minf(lo, (Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]) - hp).dot(up))
		var base_sum := Vector3.ZERO
		var cnt := 0
		for k in cand[sd]:
			var p := Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2])
			if (p - hp).dot(up) < lo + 0.025:
				base_sum += p; cnt += 1
		var base := base_sum / maxi(1, cnt)
		var bi := names.size()
		names.append("Ear" + ("L" if sd > 0 else "R"))
		parents.append(hb)
		var gx := Transform3D(Basis(), base)
		globals.append(gx)
		rests.append(globals[hb].affine_inverse() * gx)
		ear_bones.append(bi)
		var h := maxf(0.02, top[sd] - lo)
		for k in cand[sd]:
			var p := Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2])
			var w := clampf(((p - hp).dot(up) - lo) / h * 1.6, 0.0, 1.0)
			_ear_w[k] = [bi, w]
	if ear_bones.size() > 0:
		role["earL"] = ear_bones[0]
		if ear_bones.size() > 1:
			role["earR"] = ear_bones[1]

func _build(g: Dictionary, is_body: bool) -> ArrayMesh:
	var pos: Array = g.pos
	var nor: Array = g.nor
	var n := pos.size() / 3
	var V := PackedVector3Array()
	V.resize(n)
	var N := PackedVector3Array()
	N.resize(n)
	for k in n:
		V[k] = Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2])
		N[k] = Vector3(nor[k * 3], nor[k * 3 + 1], nor[k * 3 + 2]).normalized()
	var B := PackedInt32Array()
	B.resize(n * 4)
	var W := PackedFloat32Array()
	W.resize(n * 4)
	var si: Array = g.si
	var sw: Array = g.sw
	for k in n:
		var s := 0.0
		for j in 4:
			B[k * 4 + j] = int(si[k * 4 + j])
			W[k * 4 + j] = float(sw[k * 4 + j])
			s += W[k * 4 + j]
		if is_body and _ear_w.has(k):
			# 頭の骨の重みの一部を耳の骨へ
			var ew: Array = _ear_w[k]
			var w: float = ew[1]
			for j in 4:
				W[k * 4 + j] *= 1.0 - w
			B[k * 4 + 3] = ew[0]
			W[k * 4 + 3] = w * s
		var s2 := 0.0
		for j in 4:
			s2 += W[k * 4 + j]
		if s2 > 0.0:
			for j in 4:
				W[k * 4 + j] /= s2
	var I := PackedInt32Array()
	var idx: Array = g.idx
	I.resize(idx.size())
	# 三角形の向き：three.js は反時計回りが表、Godot は時計回りが表
	for t in idx.size() / 3:
		I[t * 3] = int(idx[t * 3])
		I[t * 3 + 1] = int(idx[t * 3 + 2])
		I[t * 3 + 2] = int(idx[t * 3 + 1])
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = V
	arr[Mesh.ARRAY_NORMAL] = N
	arr[Mesh.ARRAY_BONES] = B
	arr[Mesh.ARRAY_WEIGHTS] = W
	arr[Mesh.ARRAY_INDEX] = I
	if g.has("uv"):
		var uv: Array = g.uv
		var U := PackedVector2Array()
		U.resize(n)
		for k in n:
			# three.js の glTF の uv は上が 0（flipY なし）。Godot も上が 0
			U[k] = Vector2(uv[k * 2], uv[k * 2 + 1])
		arr[Mesh.ARRAY_TEX_UV] = U
	if g.has("col"):
		var col: Array = g.col
		var C := PackedColorArray()
		C.resize(n)
		for k in n:
			C[k] = Color(col[k * 3], col[k * 3 + 1], col[k * 3 + 2])
		arr[Mesh.ARRAY_COLOR] = C
	var flags := 0
	if is_body:
		# CUSTOM0＝写す前の位置と毛の重み・CUSTOM1＝写す前の法線（Godot は骨で動かしてから頂点の処理をするので、元の位置を別に持つ）
		var hair: Array = g.aHair
		var C0 := PackedFloat32Array()
		C0.resize(n * 4)
		var C1 := PackedFloat32Array()
		C1.resize(n * 4)
		for k in n:
			C0[k * 4] = V[k].x; C0[k * 4 + 1] = V[k].y; C0[k * 4 + 2] = V[k].z; C0[k * 4 + 3] = float(hair[k])
			C1[k * 4] = N[k].x; C1[k * 4 + 1] = N[k].y; C1[k * 4 + 2] = N[k].z
		arr[Mesh.ARRAY_CUSTOM0] = C0
		arr[Mesh.ARRAY_CUSTOM1] = C1
		flags = (Mesh.ARRAY_CUSTOM_RGBA_FLOAT << Mesh.ARRAY_FORMAT_CUSTOM0_SHIFT) | (Mesh.ARRAY_CUSTOM_RGBA_FLOAT << Mesh.ARRAY_FORMAT_CUSTOM1_SHIFT)
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr, [], {}, flags)
	# 骨で動くので、見えるかの箱を広めに
	m.custom_aabb = AABB(Vector3(-1.2, -0.5, -2.0), Vector3(2.4, 3.2, 4.4))
	return m

# 体の面の殻：範囲（少し広め）にかかる三角形を写し、法線の向きに off だけ浮かせる。縁は材質（horse_cloth.gdshader）で切る
func _shell(g: Dictionary, R: Dictionary, off: float) -> ArrayMesh:
	var pos: Array = g.pos
	var nor: Array = g.nor
	var idx: Array = g.idx
	var si: Array = g.si
	var sw: Array = g.sw
	var inside := func(k: int) -> bool:
		var y: float = pos[k * 3 + 1]
		var z: float = pos[k * 3 + 2]
		return z > float(R.z0) - 0.08 and z < float(R.z1) + 0.08 and y > float(R.y0) - 0.08
	var map := {}
	var V := PackedVector3Array()
	var N := PackedVector3Array()
	var B := PackedInt32Array()
	var W := PackedFloat32Array()
	var C0 := PackedFloat32Array()
	var I := PackedInt32Array()
	for t in idx.size() / 3:
		var a: int = idx[t * 3]
		var b: int = idx[t * 3 + 1]
		var c: int = idx[t * 3 + 2]
		if not (inside.call(a) or inside.call(b) or inside.call(c)):
			continue
		for k in [a, c, b]:
			if not map.has(k):
				map[k] = V.size()
				var p := Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2])
				var n := Vector3(nor[k * 3], nor[k * 3 + 1], nor[k * 3 + 2]).normalized()
				V.append(p + n * off)
				N.append(n)
				C0.append_array([p.x, p.y, p.z, 0.0])
				for j in 4:
					B.append(int(si[k * 4 + j]))
					W.append(float(sw[k * 4 + j]))
			I.append(map[k])
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = V
	arr[Mesh.ARRAY_NORMAL] = N
	arr[Mesh.ARRAY_BONES] = B
	arr[Mesh.ARRAY_WEIGHTS] = W
	arr[Mesh.ARRAY_CUSTOM0] = C0
	arr[Mesh.ARRAY_INDEX] = I
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr, [], {}, Mesh.ARRAY_CUSTOM_RGBA_FLOAT << Mesh.ARRAY_FORMAT_CUSTOM0_SHIFT)
	m.custom_aabb = AABB(Vector3(-1.2, -0.5, -2.0), Vector3(2.4, 3.2, 4.4))
	return m

# 布の横の面のまんなか（ゼッケンの番号を置く所）：素材の座標と外向き
func cloth_side(sd: float) -> Array:
	var best := Vector3.ZERO
	var bn := Vector3.RIGHT
	var bx := -1.0
	var arrs := cloth_mesh.surface_get_arrays(0)
	var C0: PackedFloat32Array = arrs[Mesh.ARRAY_CUSTOM0]
	var NN: PackedVector3Array = arrs[Mesh.ARRAY_NORMAL]
	var VV: PackedVector3Array = arrs[Mesh.ARRAY_VERTEX]
	var zc := (float(CLOTH.z0) + float(CLOTH.z1)) / 2.0 - 0.03
	for k in VV.size():
		var p := Vector3(C0[k * 4], C0[k * 4 + 1], C0[k * 4 + 2])
		if absf(p.z - zc) < 0.07 and absf(p.y - 1.2) < 0.06 and p.x * sd > bx:
			bx = p.x * sd
			best = VV[k]
			bn = NN[k]
	return [best, bn]
