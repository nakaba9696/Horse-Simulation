# 1頭の馬：骨入りの馬の素材（ViewHorseModel）を毛色で塗り、手作りの骨の角度（ViewGait）を素材の骨へ写す。騎手・鞍・ゼッケンも
# 根（この Node3D）＝手作りの馬の骨 0（地面・胴のまん中の下）。前は +Z、左は +X、上は +Y（実寸 m）
# 写し方は js/ui/horse_rigged.js の HR.pose・HR.settle と同じ（腰と背のしなり・股と後膝の分け方・つなぎの返り）。
# Godot 版で足したもの：尾の左右の振れ（rx）・手前の替わり（形を混ぜる）
class_name ViewHorse
extends Node3D

const REF := {5: 0.75, 6: 0.25, 7: 0.15}   # 尾：手作りの馬の立ち姿の角度を 0 とみなす
const HIP_K := 0.6
const BODY := 1.2          # 馬の位置 x（鼻先）から根までの長さ（m。ブラウザ版と同じ）

var M: ViewHorseModel
var num := 1
var seed := 0.3
var torso: Node3D          # 手作りの骨 1（胴）
var model: Node3D          # 素材の馬（拡大と前後のずれ）
var skel: Skeleton3D
var body_mi: MeshInstance3D
var coat: ShaderMaterial
var jockey: ViewJockey
var cloth: Node3D
var P := ViewGait.make()
var lead := 1.0            # 手前（1＝左・0＝右）
var lead_want := 1.0
var ears := 0.4            # 耳の向き（−1 伏せる〜1 立てる）
var head_up := 0.0
var _rest_q: Array[Quaternion] = []
var _j1 := Vector3.ZERO    # 手作りの骨 1 の付け根（Godot の座標）

static func hexc(s, def := Color(0.5, 0.5, 0.5)) -> Color:
	if s == null or String(s) == "":
		return def
	return Color.html(String(s))

# 手作りの馬の座標（x 前・y 上・z 右）→ Godot（x 左・y 上・z 前）
static func hm(x: float, y: float, z := 0.0) -> Vector3:
	return Vector3(-z, y, x)

func setup(info: Dictionary, font: Font) -> void:
	M = ViewHorseModel.get_model()
	num = int(info.get("num", 1))
	seed = fposmod(float(num) * 0.618034 + 0.13, 1.0)
	lead = 1.0 if seed < 0.5 else 0.0
	lead_want = lead
	var J1: Array = M.handmade.J1
	_j1 = hm(J1[0], J1[1], J1[2])
	torso = Node3D.new()
	torso.position = _j1
	add_child(torso)
	model = Node3D.new()
	model.position = -_j1 + Vector3(0, 0, M.place_dx)
	model.scale = Vector3.ONE * M.place_s
	torso.add_child(model)
	skel = Skeleton3D.new()
	for i in M.names.size():
		skel.add_bone(M.names[i])
	for i in M.names.size():
		if M.parents[i] >= 0:
			skel.set_bone_parent(i, M.parents[i])
		skel.set_bone_rest(i, M.rests[i])
	skel.reset_bone_poses()
	for i in M.names.size():
		_rest_q.append(M.rests[i].basis.get_rotation_quaternion())
	model.add_child(skel)
	coat = coat_material(info)
	body_mi = _mesh(M.body_mesh, coat)
	var hair_m := StandardMaterial3D.new()
	var L: Dictionary = info.get("coatLook", {})
	var hc := hexc(L.get("mane"), Color(0.09, 0.06, 0.05)).srgb_to_linear().lerp(hexc(L.get("body"), Color(0.49, 0.26, 0.13)).srgb_to_linear(), 0.15) * 1.7
	hair_m.albedo_color = hc.linear_to_srgb()
	hair_m.albedo_texture = M.hair_tex
	hair_m.vertex_color_use_as_albedo = true
	hair_m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
	hair_m.alpha_scissor_threshold = 0.3
	hair_m.cull_mode = BaseMaterial3D.CULL_DISABLED
	hair_m.roughness = 0.8
	hair_m.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	fade_setup(hair_m)
	fade_std.append(hair_m)
	var hmi := _mesh(M.hair_mesh, hair_m)
	hmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var br := StandardMaterial3D.new()
	br.vertex_color_use_as_albedo = true
	br.vertex_color_is_srgb = false
	br.roughness = 0.7
	br.cull_mode = BaseMaterial3D.CULL_DISABLED
	fade_setup(br)
	fade_std.append(br)
	_mesh(M.bridle_mesh, br)
	build_cloth(info, font)
	jockey = ViewJockey.new()
	torso.add_child(jockey)
	jockey.setup(info, _j1)

func _mesh(m: Mesh, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = m
	mi.material_override = mat
	model.add_child(mi)
	mi.skin = M.skin
	mi.skeleton = mi.get_path_to(skel)
	return mi

# 毛色の材質（js/ui/horse_rigged.js の material() と同じ値）
func coat_material(info: Dictionary) -> ShaderMaterial:
	var L: Dictionary = info.get("coatLook", {})
	var mk: Dictionary = info.get("marks", {})
	var I := M.info
	var S := M.place_s
	var m := ShaderMaterial.new()
	m.shader = preload("res://view/shaders/horse_coat.gdshader")
	m.set_shader_parameter("shade_tex", M.shade_tex)
	var def := {"body": "#7d4322", "top": "#5c2f16", "belly": "#8f5531", "mane": "#16100c", "points": "#17110d", "muzzle": "#3b2519", "hoof": "#26211d"}
	for k in def:
		var v = L.get(k)
		m.set_shader_parameter("c_" + k, hexc(v if v != null else def[k]))
	m.set_shader_parameter("c_muzzle", hexc(L.get("muzzle", L.get("points", def.muzzle))))
	m.set_shader_parameter("c_dapple", hexc(L.get("dappleCol"), hexc(L.get("body", def.body))))
	m.set_shader_parameter("dapple", float(L.get("dapple", 0.0)))
	m.set_shader_parameter("pts_soft", 0.25 if L.get("pointsSoft", false) else 0.08)
	m.set_shader_parameter("pts_on", 1.0 if L.get("points") != null and L.get("points") != L.get("body") else 0.0)
	m.set_shader_parameter("gloss", float(L.get("gloss", 0.5)))
	m.set_shader_parameter("knee_y", float(I.kneeY))
	m.set_shader_parameter("hock_y", float(I.hockY))
	m.set_shader_parameter("leg_z", float(I.legZ))
	m.set_shader_parameter("back_y", float(I.back))
	m.set_shader_parameter("belly_y", float(I.bellyY))
	m.set_shader_parameter("hoof_y", 0.075 / S)
	var socks: Array = mk.get("socks", [0, 0, 0, 0])
	m.set_shader_parameter("sock", Vector4(float(socks[0]) / S, float(socks[1]) / S, float(socks[2]) / S, float(socks[3]) / S))
	var hp := ViewHorseModel.v3(I.headP)
	var hd := ViewHorseModel.v3(I.nose) - hp
	m.set_shader_parameter("head_p", hp)
	m.set_shader_parameter("head_dir", hd.normalized())
	m.set_shader_parameter("head_len", hd.length())
	var bl := String(mk.get("blaze", "none"))
	var bi: float = {"none": 0.0, "star": 1.0, "strip": 2.0, "stripe": 2.0, "blaze": 3.0, "wide": 4.0}.get(bl, 2.0)
	m.set_shader_parameter("blaze", bi)
	return m

# 鞍とゼッケン：体の面を浮かせた殻（骨で動く）と、横の番号
var numbers: Array[Label3D] = []
var fade_std: Array[BaseMaterial3D] = []
var fade_sh: Array[ShaderMaterial] = []
func build_cloth(info: Dictionary, font: Font) -> void:
	var cm := ShaderMaterial.new()
	cm.shader = preload("res://view/shaders/horse_cloth.gdshader")
	for k in ViewHorseModel.CLOTH:
		cm.set_shader_parameter(k, float(ViewHorseModel.CLOTH[k]))
	cm.set_shader_parameter("trim", hexc(info.get("cap"), Color(0.12, 0.2, 0.55)))
	_mesh(M.cloth_mesh, cm)
	var sm := ShaderMaterial.new()
	sm.shader = preload("res://view/shaders/horse_cloth.gdshader")
	for k in ViewHorseModel.SADDLE:
		sm.set_shader_parameter(k, float(ViewHorseModel.SADDLE[k]))
	sm.set_shader_parameter("base", Color(0.08, 0.055, 0.04))
	sm.set_shader_parameter("trim", Color(0.05, 0.035, 0.025))
	sm.set_shader_parameter("rough", 0.45)
	sm.set_shader_parameter("round_k", 0.1)
	_mesh(M.saddle_mesh, sm)
	fade_sh.append_array([coat, cm, sm])
	cloth = Node3D.new()
	torso.add_child(cloth)
	for sd in [1.0, -1.0]:
		var side := M.cloth_side(sd)
		var p: Vector3 = model.transform * (side[0] as Vector3)
		var n: Vector3 = (model.transform.basis * (side[1] as Vector3)).normalized()
		var l := Label3D.new()
		l.text = str(num)
		l.font = font
		l.font_size = 110
		l.pixel_size = 0.0022
		l.modulate = Color(0.06, 0.06, 0.06)
		l.outline_size = 0
		l.position = p + n * 0.014
		l.basis = Basis.looking_at(-n, Vector3.UP)
		l.shaded = true
		l.double_sided = false
		cloth.add_child(l)
		numbers.append(l)

# カメラのすぐ前で網目に消すか（騎手の目のカメラのときの自分の馬は消さない）
func set_fade(on: bool) -> void:
	for m in fade_sh:
		m.set_shader_parameter("fade_far", 4.9 if on else 0.0)
	for m in fade_std:
		m.distance_fade_mode = BaseMaterial3D.DISTANCE_FADE_PIXEL_DITHER if on else BaseMaterial3D.DISTANCE_FADE_DISABLED
	for m in jockey.mats:
		m.distance_fade_mode = BaseMaterial3D.DISTANCE_FADE_PIXEL_DITHER if on else BaseMaterial3D.DISTANCE_FADE_DISABLED
	jockey.silk.set_shader_parameter("fade_far", 4.9 if on else 0.0)
	if jockey.bmat != null:
		jockey.bmat.set_shader_parameter("fade_far", 4.9 if on else 0.0)

static func fade_setup(m: BaseMaterial3D) -> void:
	m.distance_fade_mode = BaseMaterial3D.DISTANCE_FADE_PIXEL_DITHER
	m.distance_fade_min_distance = 2.8
	m.distance_fade_max_distance = 4.9

# ---- 1コマの形 ----
# g＝{ph, sp, push, t, walk_ph, walk_w, whip, pose, head_up, ears, lead_want, ease, hold, beat, tired, look, hpush}
func animate(g: Dictionary, dt: float, near: bool) -> void:
	lead_want = float(g.get("lead_want", lead_want))
	if dt > 0.0:
		lead = move_toward(lead, lead_want, dt * 2.2)
		head_up = lerpf(head_up, float(g.get("head_up", 0.0)), minf(1.0, dt * 3.0))
		ears = lerpf(ears, float(g.get("ears", 0.4)), minf(1.0, dt * 4.0))
	else:
		head_up = float(g.get("head_up", 0.0))
		ears = float(g.get("ears", 0.4))
	ViewGait.pose(P, g.ph, g.sp, g.push, g.t, seed, lead, g.walk_ph, g.walk_w, g.whip, g.pose, head_up, float(g.get("ease", 0.0)),
		float(g.get("hold", 0.0)), float(g.get("beat", 0.0)), float(g.get("tired", 0.0)), float(g.get("look", 0.0)), float(g.get("hpush", -1.0)))
	# 胴（手作りの骨 1）：高さ・前後の傾き・左右の揺れ
	torso.position = Vector3(_j1.x, P[ViewGait.Y], _j1.z)
	torso.basis = _rot(P[1 * 3], P[1 * 3 + 1], P[1 * 3 + 2])
	retarget()
	# 蹄を地面へ（騎手はそのあとで合わせる）
	var walking: bool = g.walk_w >= 0.5
	settle(g.walk_ph if walking else g.ph, 1.0 if walking else g.sp, walking)
	if near:
		jockey.position = seat_shift()
		jockey.pose(P)
	var cd: float = g.get("cam_d", 99.0)
	for l in numbers:
		l.visible = cd > 4.0

# 鞍が胴（手作りの骨 1）からどれだけずれたか（胴の座標）。腰と背がしなると鞍も動くので、騎手と鐙をそこへ乗せる
func seat_shift() -> Vector3:
	var d := Vector3.ZERO
	for sp in M.seat:
		var v: Vector3 = sp[0]
		var bi: PackedInt32Array = sp[1]
		var bw: PackedFloat32Array = sp[2]
		var acc := Vector3.ZERO
		for q in 4:
			if bw[q] > 0.0:
				acc += (skel.get_bone_global_pose(bi[q]) * M.skin.get_bind_pose(bi[q]) * v) * bw[q]
		d += model.transform * acc - model.transform * v
	return d / maxf(1.0, float(M.seat.size()))

# 手作りの角度（rz・ry・rx）→ Godot の回転（three.js の XYZ の順：Rx・Ry・Rz）
static func _rot(rz: float, ry: float, rx: float) -> Basis:
	return Basis(Vector3(0, 0, 1), rx) * Basis(Vector3(0, 1, 0), ry) * Basis(Vector3(-1, 0, 0), rz)

func _turn(k: String, a: float, ay := 0.0, ax := 0.0) -> void:
	if not M.role.has(k):
		return
	var bi: int = M.role[k]
	var q := _rest_q[bi] * Quaternion(M.axis_z[k], a)
	if ay != 0.0:
		q = q * Quaternion(M.axis_y[k], ay)
	if ax != 0.0:
		q = q * Quaternion(M.axis_x[k], ax)
	skel.set_bone_pose_rotation(bi, q)

func retarget() -> void:
	# 腰と背のしなり：後脚が前へ踏み込むと腰が丸まり、蹴り出すと伸びる
	var flex := 0.38 * (P[16 * 3] + P[20 * 3]) / 2.0
	_turn("pelvis", flex)
	_turn("spine", -flex * 0.6)
	_turn("spine1", -flex * 0.4)
	for rt in ViewHorseModel.RETARGET:
		var hi: int = rt[0]
		var k: String = rt[1]
		var ang: float = P[hi * 3] - REF.get(hi, 0.0)
		if hi == 16 or hi == 20:
			ang = ang * HIP_K - flex
		elif hi == 17 or hi == 21:
			ang += P[(hi - 1) * 3] * (1.0 - HIP_K)
		var ax := 0.0
		if hi >= 5 and hi <= 7:
			ax = P[hi * 3 + 2]
		_turn(k, ang, P[hi * 3 + 1], ax)
	_turn("tail3", P[7 * 3] - REF[7], 0.0, P[7 * 3 + 2])
	# つなぎ：脚を畳むとき、蹄も遅れて後ろへ返る
	_turn("lFi", 0.55 * minf(0.0, P[11 * 3]))
	_turn("rFi", 0.55 * minf(0.0, P[15 * 3]))
	_turn("lTo", 0.55 * minf(0.0, P[19 * 3]))
	_turn("rTo", 0.55 * minf(0.0, P[23 * 3]))
	# 耳（素材の両耳の先は Ponytail2 の1本の骨）：+1 で前へ立て、-1 で後ろへ伏せる
	_turn("pony2", 0.5 * ears)

# 蹄を地面へ：地面を押している脚の蹄の高さの重みつきの平均を 0 に。4本とも浮く間はいちばん低い蹄を少し上げる
func settle(ph: float, sp: float, walking: bool) -> void:
	var to_root := torso.transform * model.transform
	var ws := 0.0
	var wy := 0.0
	var lo := 9.0
	var T: Dictionary = ViewGait.WALK_TOUCH if walking else (ViewGait.TOUCH_L if lead >= 0.5 else ViewGait.TOUCH_R)
	for b0 in ViewHorseModel.HOOF:
		var bi: int = M.role[ViewHorseModel.HOOF[b0]]
		var y := (to_root * (skel.get_bone_global_pose(bi) * (M.hoof[b0] as Vector3))).y
		lo = minf(lo, y)
		if sp > 0.0:
			var duty: float = ViewGait.W_DUTY if walking else (ViewGait.F_DUTY if b0 < 16 else ViewGait.H_DUTY)
			var phi := fposmod(ph - float(T[b0]), 1.0)
			if phi < duty:
				var w := sin(phi / duty * PI)
				ws += w
				wy += w * y
		else:
			ws += 1.0
			wy += y
	var al := minf(1.0, ws * 1.5)
	var corr := -(al * (wy / ws if ws > 0.0 else 0.0) + (1.0 - al) * (lo - 0.1 * minf(sp, 1.1)))
	torso.position.y += corr
