# 馬モデル試作（Tripo の形）の1頭：GLB を読み、向き・大きさ・毛色・首の補正・完歩の式をまとめる
# 試作の場面（tripo_horse.gd）と、レース画面の差し替え（race_view.gd の --proto-horse=v3）の両方から使う。ゲームのふだんの遊びでは使わない
#   根（この Node3D）＝ゲームの馬（ViewHorse）の根と同じ所（地面・胴のまん中の下）。前は +Z、左は +X、上は +Y（m）
#   v2：骨 54 本・クリップ Gallop（0.8 秒）・1完歩 約 1.84 m（倍率 2.6）・材質は単色
#   v3：骨 54 本・クリップ RaceGallop（0.45 秒）・1完歩 L＝7×S÷2.6 m・UV2 の領域で毛色を塗る（v3/coat.gdshader）・首の補正 RaceNeckCorrective＝1
#   v4：v3 の約束のまま、立ち姿 Stand（3 秒）・常歩 Walk（1.2 秒・倍率 2.6 で1完歩 1.6m）を足したもの。首の補正の値はクリップが持つ（走り 1・立ち姿と常歩 0）。
#       頭絡（BridleLeather・BridleMetal）は別の材質なので毛色は Horse にだけ塗る。騎手を乗せる点 Saddle・Stirrup_L/R（背の骨 Spine_3）・手綱の点 Bit_L/R（頭の骨 Head_5）・測る点 Withers
#       歩き方の切り替えは 0.2 秒で混ぜる（set_motion）。騎手は mount_jockey で Saddle に乗せる（試作）
#   v5：v4 の約束（完歩・周期・取付点・Saddle の向き・UV2 の決まり）のまま、首と肩を作り直したもの。速歩 Trot（173/240 秒・1完歩 2.8m）と
#       駈歩 Canter（0.6 秒・4.5m）を足した。毛色は v5/coat.gdshader（v3 の毛色に引き継ぎのシェーダの補正：法線・鼻先とたてがみの混ぜ）。
#       法線の絵の強さは GLB の 0.03。取り込みは AnimationPlayer の optimizer と compression を切る（.import の _subresources）
#   v6：v5 の約束（完歩・周期・5つの歩き方・取付点の名前と Saddle の向き・UV2 の決まり・骨 54 本）のまま、首を長く細く・頭を小さく・首と頭を完歩に合わせて振り・
#       たてがみを細い房に・目と鼻先の黒を小さくしたもの。毛色は v6/coat.gdshader（v5 と同じ補正。付属は法線の強さの既定値だけ 0.03 に変わった）。
#       Bit_L/R は頭の形と首の振りに合わせて動きが変わった（v5 の記録と比べない。v6 の saddle-track.json・attachment-tracks.json と比べる）。
#       取り込みは v5 と同じに、5つのクリップのループ（settings/loop_mode＝1）を .import に書く
# 向き：GLB は Y-up・前 -X → 親の Y に +90°（骨は回さない）
extends Node3D

const SCALE := 2.6
const SPEC := {
	"v2": {"glb": "res://proto/tripo_horse/v2/horse-gallop.glb", "clip": "Gallop", "cycle": 0.8,
		# 接地の蹄の後ろへの速さ（モデル単位/秒。v2 の試作で測った 0.24÷(0.34×0.8)）× 周期 × 倍率
		"stride26": 0.24 / (0.34 * 0.8) * 0.8 * 2.6},
	"v3": {"glb": "res://proto/tripo_horse/v3/horse-gallop-v3.glb", "clip": "RaceGallop", "cycle": 0.45, "stride26": 7.0},
	"v4": {"glb": "res://proto/tripo_horse/v4/horse-gallop-v4.glb", "clip": "RaceGallop", "cycle": 0.45, "stride26": 7.0,
		"stand": "Stand", "stand_cycle": 3.0, "walk": "Walk", "walk_cycle": 1.2, "walk26": 1.6, "morph_in_clip": true},
	"v5": {"glb": "res://proto/tripo_horse/v5/horse-gallop-v5.glb", "clip": "RaceGallop", "cycle": 0.45, "stride26": 7.0,
		"stand": "Stand", "stand_cycle": 3.0, "walk": "Walk", "walk_cycle": 1.2, "walk26": 1.6,
		"trot": "Trot", "trot_cycle": 173.0 / 240.0, "trot26": 2.8, "canter": "Canter", "canter_cycle": 0.6, "canter26": 4.5,
		"morph_in_clip": true, "shader": "res://proto/tripo_horse/v5/coat.gdshader"},
	"v6": {"glb": "res://proto/tripo_horse/v6/horse-gallop-v6.glb", "clip": "RaceGallop", "cycle": 0.45, "stride26": 7.0,
		"stand": "Stand", "stand_cycle": 3.0, "walk": "Walk", "walk_cycle": 1.2, "walk26": 1.6,
		"trot": "Trot", "trot_cycle": 173.0 / 240.0, "trot26": 2.8, "canter": "Canter", "canter_cycle": 0.6, "canter26": 4.5,
		"morph_in_clip": true, "shader": "res://proto/tripo_horse/v6/coat.gdshader"},
}
# 速さ（m/秒）で歩き方を決める境：これより遅いとその歩き方（立ち姿・常歩・速歩・駈歩。無い歩き方は飛ばす）
#   常歩の自然な速さ 1.6÷1.2＝1.3・速歩 2.8÷0.72＝3.9・駈歩 4.5÷0.6＝7.5・襲歩 7÷0.45＝15.6 の間。v4 は立ち姿 0.3・常歩 5.5（いまの馬の常歩の混ぜ方が半分になる所）
const GAIT_V := [["stand", 0.3], ["walk", 2.4], ["trot", 5.5], ["canter", 11.0]]
const GAIT_V_NO_TROT := [["stand", 0.3], ["walk", 5.5]]
const XFADE := 0.2              # 歩き方を替えるときに混ぜる時間（秒。引き継ぎの目安 0.18〜0.25）
# 根からの前後のずれ（m。立ち姿の AABB の前後のまん中をゲームの馬にそろえる。試作は -1.27〜+1.27、ゲームの馬は -1.02〜+1.42 → +0.2）
const ROOT_DZ := {"v2": 0.2, "v3": 0.2, "v4": 0.2, "v5": 0.2, "v6": 0.2}
const COAT_SHADER := "res://proto/tripo_horse/v3/coat.gdshader"

var ver := "v3"
var S := SCALE
var glb: Node3D
var player: AnimationPlayer
var skel: Skeleton3D
var clip := ""
var meshes: Array[MeshInstance3D] = []
var coat: ShaderMaterial        # v3
var flat: StandardMaterial3D    # v2
var neck_idx := {}              # MeshInstance3D → 首の補正の番号
var gait := "race"              # race・canter・trot・walk・stand（v4 は race・walk・stand）
var sockets := {}               # 名前 → Node3D（v4：Saddle・Stirrup_L・Stirrup_R・Bit_L・Bit_R・Withers）
var rider_hold: Node3D          # 騎手の親（いまの馬の胴の代わり。Saddle に合わせて毎コマ置く）
var rider: ViewJockey
var rider_P := ViewGait.make()
var _seat0 := Vector3.ZERO      # いまの馬の鞍の上面（胴の座標）

func setup(v: String, info: Dictionary = {}, s := SCALE) -> void:
	ver = v
	S = s
	glb = (load(SPEC[ver].glb) as PackedScene).instantiate()
	glb.rotation_degrees.y = 90.0
	glb.scale = Vector3.ONE * S
	glb.position.z = float(ROOT_DZ.get(ver, 0.0))
	add_child(glb)
	player = glb.find_children("*", "AnimationPlayer", true, false)[0]
	skel = glb.find_children("*", "Skeleton3D", true, false)[0]
	clip = String(SPEC[ver].clip)
	if not player.has_animation(clip):
		# 名前が違うときは RESET でない最初のクリップ（試作の場面の表示で分かるように）
		for a in player.get_animation_list():
			if a != "RESET":
				clip = a
				break
	player.get_animation(clip).loop_mode = Animation.LOOP_LINEAR
	for k in ["stand", "walk", "trot", "canter"]:
		if SPEC[ver].has(k) and player.has_animation(SPEC[ver][k]):
			player.get_animation(SPEC[ver][k]).loop_mode = Animation.LOOP_LINEAR
	if has_gaits():
		# v4：自分で advance して進める（混ぜる時間も進むように）。撮る絵とテストが同じになる
		player.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_MANUAL
		player.play(clip)
	else:
		player.play(clip)
		player.pause()   # 時間はこちらで seek する（撮る絵とテストが同じになる）
	for n in ["Saddle", "Stirrup_L", "Stirrup_R", "Bit_L", "Bit_R", "Withers"]:
		var f := glb.find_child(n, true, false)
		if f != null:
			sockets[n] = f
	for mi in glb.find_children("*", "MeshInstance3D", true, false):
		meshes.append(mi)
		for k in mi.mesh.get_blend_shape_count():
			if String(mi.mesh.get_blend_shape_name(k)) == "RaceNeckCorrective":
				neck_idx[mi] = k
	if ver != "v2":
		coat = ShaderMaterial.new()
		coat.shader = load(String(SPEC[ver].get("shader", COAT_SHADER)))
		for mi in meshes:
			if ver != "v3" and String(mi.name) != "Horse":
				continue   # 頭絡は元の材質のまま
			var src := mi.mesh.surface_get_material(0) as StandardMaterial3D
			if src != null and src.normal_texture != null:
				coat.set_shader_parameter("normal_texture", src.normal_texture)
				coat.set_shader_parameter("has_normal_map", true)
				coat.set_shader_parameter("normal_strength", src.normal_scale)
			mi.material_override = coat
	else:
		for mi in meshes:
			var src = mi.get_active_material(0)
			flat = (src.duplicate() if src is StandardMaterial3D else StandardMaterial3D.new())
			mi.material_override = flat
	if not morph_in_clip():
		set_neck(1.0)
	set_coat(info)
	set_phase(0.0)

func has_gaits() -> bool:
	return SPEC[ver].has("walk")

func morph_in_clip() -> bool:
	return bool(SPEC[ver].get("morph_in_clip", false))

func has_gait(g: String) -> bool:
	return g == "race" or SPEC[ver].has(g)

# 速さ v（m/秒）の歩き方（gate は発走の前＝立ち姿）
func gait_for(v: float, gate := false) -> String:
	if not has_gaits():
		return "race"
	if gate:
		return "stand"
	for e in (GAIT_V if SPEC[ver].has("trot") else GAIT_V_NO_TROT):
		if v < float(e[1]) and has_gait(String(e[0])):
			return String(e[0])
	return "race"

# 歩き方 g の位相（0〜1 を超えてよい）：立ち姿は時間÷周期、ほかは 距離÷その歩き方の完歩
func gait_phase(g: String, dist: float, t: float) -> float:
	if g == "stand":
		return t / cycle_of("stand")
	return dist / gait_stride_m(g)

# 歩き方 g の1完歩（m）
func gait_stride_m(g: String) -> float:
	match g:
		"walk": return walk_stride_m()
		"trot", "canter": return float(SPEC[ver].get(g + "26", 7.0)) * S / SCALE
	return stride_m()

func clip_of(g: String) -> String:
	if g == "race" or not SPEC[ver].has(g):
		return String(SPEC[ver].clip)
	return String(SPEC[ver][g])

func cycle_of(g: String) -> float:
	if g != "race" and SPEC[ver].has(g + "_cycle"):
		return float(SPEC[ver][g + "_cycle"])
	return cycle()

# 常歩の1完歩（m）
func walk_stride_m() -> float:
	return float(SPEC[ver].get("walk26", 1.6)) * S / SCALE

# 1完歩（m）：倍率 S のとき L＝(倍率 2.6 での完歩)×S÷2.6
func stride_m() -> float:
	return float(SPEC[ver].stride26) * S / SCALE

func cycle() -> float:
	return float(SPEC[ver].cycle)

# 速さ v（m/秒）で蹄が滑らない再生の倍率：speed_scale＝v×周期÷L
func speed_scale(v: float) -> float:
	return v * cycle() / stride_m()

# 走りの位相（0〜1）の形にする
func set_phase(ph: float) -> void:
	if has_gaits():
		set_motion("race", ph, 0.0)
		return
	player.seek(fposmod(ph, 1.0) * cycle(), true)
	set_neck(1.0)

# 歩き方 g（race・canter・trot・walk・stand）の位相 ph（0〜1）の形にする（v4）。歩き方が替わったら XFADE 秒で混ぜる。dt は実の時間（混ぜる進み）
func set_motion(g: String, ph: float, dt: float) -> void:
	if not has_gaits():
		set_phase(ph)
		return
	var c := clip_of(g)
	var want := fposmod(ph, 1.0) * cycle_of(g)
	if g != gait or player.current_animation != c:
		gait = g
		player.play(c, XFADE if dt > 0.0 else 0.0)
		player.seek(want, false)
		player.advance(dt)
		return
	var len := cycle_of(g)
	var d := fposmod(want - player.current_animation_position, len)
	if d > len * 0.5:
		player.seek(want, false)   # 後ろへ戻すとき（撮る・テスト）は飛ばす
		d = 0.0
	player.advance(d)

# 首の補正（走るときは 1）
func set_neck(w: float) -> void:
	for mi in neck_idx:
		mi.set_blend_shape_value(neck_idx[mi], w)

func neck_value() -> float:
	for mi in neck_idx:
		return mi.get_blend_shape_value(neck_idx[mi])
	return -1.0

# 毛色（info は UiArt.horse_info の形：coatLook・marks.socks（m）・marks.blaze）
func set_coat(info: Dictionary) -> void:
	var L: Dictionary = info.get("coatLook", UiArt.coat_look("鹿毛"))
	var c := func(k: String, def: String) -> Color:
		var s = L.get(k)
		return Color.html(String(s if s != null and String(s) != "" else def))
	if flat != null:
		flat.albedo_color = c.call("body", "#7d4322")
		flat.roughness = 0.82 - 0.1 * float(L.get("gloss", 0.5))
		return
	if coat == null:
		return
	coat.set_shader_parameter("coat_color", c.call("body", "#7d4322"))
	coat.set_shader_parameter("top_color", c.call("top", L.get("body", "#7d4322")))
	coat.set_shader_parameter("belly_color", c.call("belly", L.get("body", "#7d4322")))
	coat.set_shader_parameter("mane_color", c.call("mane", "#16100c"))
	coat.set_shader_parameter("tail_color", c.call("tail", L.get("mane", "#16100c")))
	coat.set_shader_parameter("points_color", c.call("points", L.get("body", "#7d4322")))
	coat.set_shader_parameter("points_on", 1.0 if L.get("points") != null and L.get("points") != L.get("body") else 0.0)
	coat.set_shader_parameter("points_soft", 0.06 if L.get("pointsSoft", false) else 0.02)
	coat.set_shader_parameter("hoof_color", c.call("hoof", "#26211d"))
	coat.set_shader_parameter("muzzle_color", c.call("muzzle", L.get("points", "#3b2519")))
	coat.set_shader_parameter("gloss", float(L.get("gloss", 0.5)))
	var mk: Dictionary = info.get("marks", {})
	var socks: Array = mk.get("socks", [0, 0, 0, 0])
	coat.set_shader_parameter("sock_heights", Vector4(float(socks[0]) / S, float(socks[1]) / S, float(socks[2]) / S, float(socks[3]) / S))
	coat.set_shader_parameter("face_mark", String(mk.get("blaze", "none")) != "none")

func show_regions(on: bool) -> void:
	if coat != null:
		coat.set_shader_parameter("show_regions", on)

# ---- 騎手（試作）：いまの馬の騎手（ViewJockey）を Saddle に乗せる ----
# 騎手の点はいまの馬の胴（手作りの骨 1）の座標で決まっているので、胴の代わりの親（rider_hold）を置き、
# いまの馬の鞍の上面（_seat0）が Saddle に重なるように毎コマ合わせる。向きは Saddle の向き（取付点の軸は GLB のまま：前 -X・上 +Y）を胴の軸（前 +Z）へ直して使う
func mount_jockey(info: Dictionary) -> void:
	if not sockets.has("Saddle") or rider != null:
		return
	var M := ViewHorseModel.get_model()
	var J1: Array = M.handmade.J1
	var j1 := ViewHorse.hm(J1[0], J1[1], J1[2])
	var acc := Vector3.ZERO
	for sp in M.seat:
		acc += sp[0]
	acc /= maxf(1.0, float(M.seat.size()))
	_seat0 = (-j1 + Vector3(0, 0, M.place_dx)) + acc * M.place_s
	rider_hold = Node3D.new()
	add_child(rider_hold)
	rider = ViewJockey.new()
	rider_hold.add_child(rider)
	rider.setup(info, j1)
	update_rider(0.0, 1.0, 0.0, 0.0)

# 毎コマ：Saddle の位置と向きへ親を置き、騎手の腕と上体を ViewGait の形で動かす
# near が false（遠い）のときは親を置くだけで、腕と上体の形（IK）は前のまま（いまの馬の騎手と同じ考え）
func update_rider(ph: float, sp: float, t: float, walk_w: float, near := true) -> void:
	if rider == null:
		return
	# Saddle の向きは GLB の軸（前 -X）のまま。胴の座標（前 +Z）へは Y のまわりに −90°（+Z → −X）
	var g := socket_xf("Saddle").orthonormalized() * Transform3D(Basis(Vector3.UP, -PI / 2.0), Vector3.ZERO)
	rider_hold.global_transform = g * Transform3D(Basis(), -_seat0)
	if not near:
		return
	ViewGait.pose(rider_P, ph, sp, 0.0, t, 0.3, 1.0, ph, walk_w, -1.0, -1.0, 0.0)
	rider.position = Vector3.ZERO
	rider.pose(rider_P)

# 取付点の世界の変換（骨の今の形から直接。BoneAttachment3D は骨の更新の知らせを待つので、同じコマの中では古いことがある）
func socket_xf(n: String) -> Transform3D:
	var nd: Node3D = sockets[n]
	var ba := nd.get_parent() as BoneAttachment3D
	if ba == null:
		return nd.global_transform
	var bi := skel.find_bone(ba.bone_name)
	return skel.global_transform * skel.get_bone_global_pose(bi) * nd.transform

# 全部の骨が有限か
func bones_finite() -> bool:
	for i in skel.get_bone_count():
		if not skel.get_bone_global_pose(i).origin.is_finite():
			return false
	return true
