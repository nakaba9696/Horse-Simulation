# 蹴り上げ：後脚の蹄のうしろから、芝なら土の付いた芝の塊、ダートなら土の粒と薄い砂ぼこりを後ろ上へ飛ばす
# 馬の子に置く（馬の前は +Z）。粒は世界の座標に残るので、馬が進むと後ろへ流れて落ちる。見た目だけで、結果には関わらない
class_name ViewKickup
extends Node3D

var clods: CPUParticles3D
var dust: CPUParticles3D
var dirt := false
var tscale := 1.0      # 撮るとき：1コマの絵で進む秒に合わせる

func setup(surface: String) -> void:
	dirt = surface.begins_with("ダ")
	position = Vector3(0, 0.06, -0.55)
	clods = _make(26 if dirt else 22, 0.55, Vector2(0.03, 0.06) if dirt else Vector2(0.045, 0.08))
	var g := Gradient.new()
	if dirt:
		g.set_color(0, Color(0.52, 0.38, 0.24))
		g.set_color(1, Color(0.36, 0.25, 0.15))
	else:
		g.set_color(0, Color(0.27, 0.42, 0.16))
		g.set_color(1, Color(0.38, 0.29, 0.17))
	clods.color_initial_ramp = g
	add_child(clods)
	if dirt:
		dust = _make(10, 1.1, Vector2(0.25, 0.45))
		dust.initial_velocity_min = 0.8
		dust.initial_velocity_max = 1.8
		dust.gravity = Vector3(0, 0.3, 0)
		var dg := Gradient.new()
		dg.set_color(0, Color(0.62, 0.5, 0.36, 0.35))
		dg.set_color(1, Color(0.62, 0.5, 0.36, 0.0))
		dust.color_ramp = dg
		add_child(dust)

func _make(amount: int, life: float, size: Vector2) -> CPUParticles3D:
	var p := CPUParticles3D.new()
	p.use_fixed_seed = true
	p.seed = 7
	p.amount = amount
	p.lifetime = life
	p.local_coords = false
	p.emitting = false
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	p.emission_box_extents = Vector3(0.18, 0.02, 0.1)
	p.direction = Vector3(0, 0.55, -1)
	p.spread = 22.0
	p.initial_velocity_min = 2.2
	p.initial_velocity_max = 4.5
	p.gravity = Vector3(0, -9.8, 0)
	p.angular_velocity_min = -360.0
	p.angular_velocity_max = 360.0
	p.scale_amount_min = size.x
	p.scale_amount_max = size.y
	var q := QuadMesh.new()
	q.size = Vector2.ONE
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.vertex_color_use_as_albedo = true
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.billboard_keep_scale = true
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	q.material = m
	p.mesh = q
	return p

# 毎コマ：速さ（m/s）と、カメラの近くか（遠い馬は出さない）
func run(v: float, near: bool) -> void:
	var on := near and v > 9.0
	clods.emitting = on
	clods.speed_scale = clampf(v / 16.0, 0.6, 1.2) * tscale
	if dust != null:
		dust.emitting = on
		dust.speed_scale = tscale

# 撮るとき（止め絵）：早送りの間は粒が進まないので、出ている粒を一度に満たす
func warm() -> void:
	for p in [clods, dust]:
		if p != null and p.emitting:
			p.preprocess = p.lifetime
			p.restart()
