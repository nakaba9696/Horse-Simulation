# 馬モデル試作（Tripo の形）の1頭：GLB を読み、向き・大きさ・毛色・首の補正・完歩の式をまとめる
# 試作の場面（tripo_horse.gd）と、レース画面の差し替え（race_view.gd の --proto-horse=v3）の両方から使う。ゲームのふだんの遊びでは使わない
#   根（この Node3D）＝ゲームの馬（ViewHorse）の根と同じ所（地面・胴のまん中の下）。前は +Z、左は +X、上は +Y（m）
#   v2：骨 54 本・クリップ Gallop（0.8 秒）・1完歩 約 1.84 m（倍率 2.6）・材質は単色
#   v3：骨 54 本・クリップ RaceGallop（0.45 秒）・1完歩 L＝7×S÷2.6 m・UV2 の領域で毛色を塗る（v3/coat.gdshader）・首の補正 RaceNeckCorrective＝1
# 向き：GLB は Y-up・前 -X → 親の Y に +90°（骨は回さない）
extends Node3D

const SCALE := 2.6
const SPEC := {
	"v2": {"glb": "res://proto/tripo_horse/v2/horse-gallop.glb", "clip": "Gallop", "cycle": 0.8,
		# 接地の蹄の後ろへの速さ（モデル単位/秒。v2 の試作で測った 0.24÷(0.34×0.8)）× 周期 × 倍率
		"stride26": 0.24 / (0.34 * 0.8) * 0.8 * 2.6},
	"v3": {"glb": "res://proto/tripo_horse/v3/horse-gallop-v3.glb", "clip": "RaceGallop", "cycle": 0.45, "stride26": 7.0},
}
# 根からの前後のずれ（m。立ち姿の AABB の前後のまん中をゲームの馬にそろえる。試作は -1.27〜+1.27、ゲームの馬は -1.02〜+1.42 → +0.2）
const ROOT_DZ := {"v2": 0.2, "v3": 0.2}
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
	player.play(clip)
	player.pause()   # 時間はこちらで seek する（撮る絵とテストが同じになる）
	for mi in glb.find_children("*", "MeshInstance3D", true, false):
		meshes.append(mi)
		for k in mi.mesh.get_blend_shape_count():
			if String(mi.mesh.get_blend_shape_name(k)) == "RaceNeckCorrective":
				neck_idx[mi] = k
	if ver == "v3":
		coat = ShaderMaterial.new()
		coat.shader = load(COAT_SHADER)
		for mi in meshes:
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
	set_neck(1.0)
	set_coat(info)
	set_phase(0.0)

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
	player.seek(fposmod(ph, 1.0) * cycle(), true)
	set_neck(1.0)

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

# 全部の骨が有限か
func bones_finite() -> bool:
	for i in skel.get_bone_count():
		if not skel.get_bone_global_pose(i).origin.is_finite():
			return false
	return true
