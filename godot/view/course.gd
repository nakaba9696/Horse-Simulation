# 競馬場を組む：芝とダートの馬場・柵・ハロン棒・ゴール板・スタンドと観客・内馬場（池と大きな画面）・木・遠くの町と山・発走のゲート
# 形は track.gd（js/core/track.js と同じ式）から作る。素材は godot/CREDITS.md
class_name ViewCourse
extends RefCounted

const TRACK_W := 27.0      # 芝の馬場の幅（m）
const LANE0 := 1.0
const GATE_P := 1.25
const FLAT := 4294967295   # SurfaceTool：面ごとの法線（表と裏を重ねた面で法線が消えないように）

var tr: ViewTrack
var root: Node3D
var font: Font
var S: Array = []          # 2m ごとの地点
var home0 := 0.0           # ゴール前の直線の範囲（s）
var home1 := 0.0
var rng := RandomNumberGenerator.new()
var gate: Node3D
var gate_doors: Array = []
var gate_lamp: StandardMaterial3D
var board_labels: Array = []

func _init(track: ViewTrack, parent: Node3D, f: Font) -> void:
	tr = track
	root = parent
	font = f
	rng.seed = 20251130
	var n := int(round(tr.L / 2.0))
	for i in n + 1:
		S.append(tr.frame(i * tr.L / n))
	while home1 < tr.L / 2.0 and tr.at(home1 + 5.0).corner == 0:
		home1 += 5.0
	while home0 > -tr.L / 2.0 and tr.at(home0 - 5.0).corner == 0:
		home0 -= 5.0

# ---- 材質 ----
func tex(p: String) -> Texture2D:
	return load(p)

func turf_mat() -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = load("res://view/shaders/turf.gdshader")
	m.set_shader_parameter("tex_albedo", tex("res://assets/textures/leafy_grass_diff_1k.jpg"))
	m.set_shader_parameter("tex_normal", tex("res://assets/textures/leafy_grass_nor_gl_1k.jpg"))
	m.set_shader_parameter("tint", Color(0.30, 0.50, 0.15))
	m.set_shader_parameter("tile", 2.6)
	m.set_shader_parameter("stripe_len", 12.0)
	m.set_shader_parameter("stripe_amp", 0.075)
	m.set_shader_parameter("desat", 0.8)
	m.set_shader_parameter("wear_u", 3.5)
	return m

func dirt_mat() -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = load("res://view/shaders/turf.gdshader")
	m.set_shader_parameter("tex_albedo", tex("res://assets/textures/dirt_aerial_02_diff_1k.jpg"))
	m.set_shader_parameter("tex_normal", tex("res://assets/textures/dirt_aerial_02_nor_gl_1k.jpg"))
	m.set_shader_parameter("tint", Color(0.55, 0.43, 0.30))
	m.set_shader_parameter("tile", 5.0)
	m.set_shader_parameter("stripe_len", 0.0)
	m.set_shader_parameter("desat", 0.7)
	m.set_shader_parameter("rough", 0.98)
	return m

func verge_mat() -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = load("res://view/shaders/turf.gdshader")
	m.set_shader_parameter("tex_albedo", tex("res://assets/textures/aerial_grass_rock_diff_1k.jpg"))
	m.set_shader_parameter("tex_normal", tex("res://assets/textures/aerial_grass_rock_nor_gl_1k.jpg"))
	m.set_shader_parameter("tint", Color(0.26, 0.42, 0.14))
	m.set_shader_parameter("tile", 8.0)
	m.set_shader_parameter("stripe_len", 0.0)
	m.set_shader_parameter("desat", 0.85)
	return m

func ground_mat() -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = load("res://view/shaders/ground.gdshader")
	m.set_shader_parameter("tex_albedo", tex("res://assets/textures/aerial_grass_rock_diff_1k.jpg"))
	m.set_shader_parameter("tex_normal", tex("res://assets/textures/aerial_grass_rock_nor_gl_1k.jpg"))
	return m

func std(c: Color, rough := 0.8, metal := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	m.metallic = metal
	return m

func add_mesh(mesh: Mesh, mat: Material = null, xf := Transform3D.IDENTITY, shadow := true) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	if mat:
		mi.material_override = mat
	mi.transform = xf
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(mi)
	return mi

# ---- 帯（コースに沿った面）。u0→u1、高さは坂の高さ×k0→k1 + h ----
func ribbon(u0: float, u1: float, k0: float, k1: float, mat: Material, h := 0.0, s_from := 0.0, s_to := -1.0) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var pts: Array = S
	if s_to > s_from:
		pts = []
		var s := s_from
		var stp := minf(2.0, (s_to - s_from) / 2.0)
		while s <= s_to + 0.001:
			pts.append(tr.frame(s))
			s += stp
	for i in pts.size() - 1:
		var fa: Dictionary = pts[i]
		var fb: Dictionary = pts[i + 1]
		var sa: float = fa.s
		var sb: float = fb.s
		var a0 := tr.w3(fa, u0, fa.e * k0 + h)
		var a1 := tr.w3(fa, u1, fa.e * k1 + h)
		var b0 := tr.w3(fb, u0, fb.e * k0 + h)
		var b1 := tr.w3(fb, u1, fb.e * k1 + h)
		var quad := [[a0, Vector2(u0, sa)], [b0, Vector2(u0, sb)], [b1, Vector2(u1, sb)], [a0, Vector2(u0, sa)], [b1, Vector2(u1, sb)], [a1, Vector2(u1, sa)]]
		# 面が上を向くように（左回り・右回りで裏返る）
		var nrm := (b0 - a0).cross(a1 - a0)
		if nrm.y > 0.0:
			quad = [quad[0], quad[2], quad[1], quad[3], quad[5], quad[4]]
		for q in quad:
			st.set_uv(q[1])
			st.add_vertex(q[0])
	st.generate_normals()
	st.generate_tangents()
	return add_mesh(st.commit(), mat, Transform3D.IDENTITY, false)

# 断面（u, h）をコースに沿って押し出す（スタンドなど）。s_from→s_to
func extrude(profile: PackedVector2Array, s_from: float, s_to: float, mat: Material, step := 4.0, shadow := true) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(FLAT)
	var fs: Array = []
	var s := s_from
	while s <= s_to + 0.01:
		fs.append(tr.frame(s))
		s += step
	for i in fs.size() - 1:
		var fa: Dictionary = fs[i]
		var fb: Dictionary = fs[i + 1]
		for j in profile.size() - 1:
			var p: Vector2 = profile[j]
			var q: Vector2 = profile[j + 1]
			var a0 := tr.w3(fa, p.x, p.y + fa.e)
			var a1 := tr.w3(fa, q.x, q.y + fa.e)
			var b0 := tr.w3(fb, p.x, p.y + fb.e)
			var b1 := tr.w3(fb, q.x, q.y + fb.e)
			var tri := [a0, b0, b1, a0, b1, a1]
			var uvs := [Vector2(0, fa.s), Vector2(0, fb.s), Vector2(1, fb.s), Vector2(0, fa.s), Vector2(1, fb.s), Vector2(1, fa.s)]
			for k in 6:
				st.set_uv(uvs[k])
				st.add_vertex(tri[k])
			# 裏面も（どちらから見ても見える）
			var back := [a0, b1, b0, a0, a1, b1]
			for k in 6:
				st.set_uv(uvs[k])
				st.add_vertex(back[k])
	st.generate_normals()
	return add_mesh(st.commit(), mat, Transform3D.IDENTITY, shadow)

# 2点のあいだに置く箱の向き（y 軸が a→b）
static func basis_between(a: Vector3, b: Vector3) -> Basis:
	var y := (b - a).normalized()
	var x := y.cross(Vector3.FORWARD if absf(y.z) < 0.9 else Vector3.RIGHT).normalized()
	var z := x.cross(y).normalized()
	return Basis(x, y, z)

func build() -> void:
	build_ground()
	build_track()
	build_rails()
	build_poles()
	build_stands()
	build_infield()
	build_trees()
	build_town()
	build_mountains()

# ---- 地面と馬場 ----
func build_ground() -> void:
	var pm := PlaneMesh.new()
	pm.size = Vector2(16000, 16000)
	pm.subdivide_width = 8
	pm.subdivide_depth = 8
	add_mesh(pm, ground_mat(), Transform3D(Basis(), Vector3(0, -0.05, 0)), false)

func build_track() -> void:
	ribbon(0.0, TRACK_W, 1, 1, turf_mat(), 0.02)
	ribbon(TRACK_W, TRACK_W + 6, 1, 1, verge_mat(), 0.015)
	ribbon(TRACK_W + 6, TRACK_W + 30, 1, 0.0, verge_mat(), 0.01)
	# 内：芝とダートのあいだの草・ダート・内馬場へ下りる草
	ribbon(-4.0, 0.0, 1, 1, verge_mat(), 0.015)
	ribbon(-26.0, -4.0, 1, 1, dirt_mat(), 0.02)
	ribbon(-32.0, -26.0, 1, 1, verge_mat(), 0.015)
	ribbon(-50.0, -32.0, 0.0, 1, verge_mat(), 0.01)

# ---- 柵（白い柱と横木） ----
func rail_line(u: float, h: float, col: Color, post_every := 2.5) -> void:
	var mat := std(col, 0.35)
	# 横木：断面の箱を押し出す
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(FLAT)
	var hw := 0.07
	var hh := 0.11
	for i in S.size() - 1:
		var fa: Dictionary = S[i]
		var fb: Dictionary = S[i + 1]
		var corners := [Vector2(-hw, -hh), Vector2(hw, -hh), Vector2(hw, hh), Vector2(-hw, hh)]
		for j in 4:
			var p: Vector2 = corners[j]
			var q: Vector2 = corners[(j + 1) % 4]
			var a0 := tr.w3(fa, u + p.x, fa.e + h + p.y)
			var a1 := tr.w3(fa, u + q.x, fa.e + h + q.y)
			var b0 := tr.w3(fb, u + p.x, fb.e + h + p.y)
			var b1 := tr.w3(fb, u + q.x, fb.e + h + q.y)
			for v in [a0, b0, b1, a0, b1, a1, a0, b1, b0, a0, a1, b1]:
				st.add_vertex(v)
	st.generate_normals()
	add_mesh(st.commit(), mat)
	# 柱
	var post := BoxMesh.new()
	post.size = Vector3(0.09, h, 0.09)
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	var n := int(tr.L / post_every)
	mm.mesh = post
	mm.instance_count = n
	for i in n:
		var f := tr.frame(i * post_every)
		var p := tr.w3(f, u, f.e + h / 2.0)
		mm.set_instance_transform(i, Transform3D(Basis(Vector3.UP, atan2(f.fx, -f.fy)), p))
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.material_override = mat
	root.add_child(mmi)

func build_rails() -> void:
	rail_line(-0.6, 1.0, Color(0.95, 0.95, 0.93))
	rail_line(TRACK_W + 0.6, 1.1, Color(0.95, 0.95, 0.93))
	rail_line(-26.4, 0.9, Color(0.92, 0.92, 0.9), 3.0)

# ---- ハロン棒・ゴール板 ----
func label(text: String, size: int, col: Color, pos: Vector3, yaw: float, px := 0.01, outline := 0) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.font = font
	l.font_size = size
	l.pixel_size = px
	l.modulate = col
	l.outline_size = outline
	l.outline_modulate = Color(0, 0, 0, 0.8)
	l.position = pos
	l.rotation = Vector3(0, yaw, 0)
	l.double_sided = true
	l.shaded = true
	root.add_child(l)
	return l

func build_poles() -> void:
	var white := std(Color(0.96, 0.96, 0.95), 0.4)
	var red := std(Color(0.85, 0.08, 0.1), 0.45)
	var pole := CylinderMesh.new()
	pole.top_radius = 0.07
	pole.bottom_radius = 0.07
	pole.height = 3.4
	var disc := CylinderMesh.new()
	disc.top_radius = 0.55
	disc.bottom_radius = 0.55
	disc.height = 0.06
	var k := 1
	while k * 200 < tr.L:
		var s := float(k * 200)
		var f := tr.frame(s)
		var p := tr.w3(f, -1.6, f.e)
		var yaw := atan2(f.fx, -f.fy)
		add_mesh(pole, white, Transform3D(Basis(), p + Vector3(0, 1.7, 0)))
		# 赤と白の円板（進む向きに向ける）
		var b := Basis(Vector3.UP, yaw) * Basis(Vector3.RIGHT, PI / 2)
		add_mesh(disc, red if k % 2 == 1 else white, Transform3D(b, p + Vector3(0, 3.3, 0)))
		var lab := label(str(k * 2), 96, Color(0.08, 0.08, 0.08) if k % 2 == 0 else Color(1, 1, 1), p + Vector3(0, 3.3, 0) - tr.fwd3(f) * 0.05, yaw + PI, 0.008)
		lab.no_depth_test = false
		k += 1
	# ゴール板：内ラチの外に、白地に赤い円
	var f0 := tr.frame(0.0)
	var pg := tr.w3(f0, -2.0, f0.e)
	add_mesh(_cyl(0.12, 6.0), white, Transform3D(Basis(), pg + Vector3(0, 3.0, 0)))
	var gb := Basis(Vector3.UP, atan2(tr.out3(f0).x, tr.out3(f0).z)) * Basis(Vector3.RIGHT, PI / 2)
	add_mesh(_cyl(1.3, 0.1), white, Transform3D(gb, pg + Vector3(0, 6.2, 0)))
	add_mesh(_cyl(0.85, 0.12), red, Transform3D(gb, pg + Vector3(0, 6.2, 0)))
	# 外ラチの側にも
	var po := tr.w3(f0, TRACK_W + 2.0, f0.e)
	add_mesh(_cyl(0.1, 4.5), white, Transform3D(Basis(), po + Vector3(0, 2.25, 0)))
	add_mesh(_cyl(0.9, 0.1), red, Transform3D(gb, po + Vector3(0, 4.6, 0)))
	# ゴールの線（白く細い帯）
	ribbon(0.0, TRACK_W, 1, 1, std(Color(0.95, 0.95, 0.95), 0.6), 0.03, -0.12, 0.12)

func _cyl(r: float, h: float) -> CylinderMesh:
	var c := CylinderMesh.new()
	c.top_radius = r
	c.bottom_radius = r
	c.height = h
	return c

# ---- スタンドと観客 ----
func person_mesh() -> ArrayMesh:
	# 体（服の色）と頭（肌）。頭は頂点の色 r=1 で見分ける
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var body := CapsuleMesh.new()
	body.radius = 0.2
	body.height = 1.4
	body.radial_segments = 6
	body.rings = 1
	var head := SphereMesh.new()
	head.radius = 0.12
	head.height = 0.24
	head.radial_segments = 6
	head.rings = 3
	st.set_color(Color(0, 0, 0))
	st.append_from(body, 0, Transform3D(Basis(), Vector3(0, 0.72, 0)))
	var st2 := SurfaceTool.new()
	st2.begin(Mesh.PRIMITIVE_TRIANGLES)
	var arr := head.surface_get_arrays(0)
	var verts: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	var norms: PackedVector3Array = arr[Mesh.ARRAY_NORMAL]
	var idx: PackedInt32Array = arr[Mesh.ARRAY_INDEX]
	for i in idx:
		st.set_color(Color(1, 0, 0))
		st.set_normal(norms[i])
		st.add_vertex(verts[i] + Vector3(0, 1.58, 0))
	return st.commit()

func crowd_mat() -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
varying vec3 cloth;
varying float skin;
void vertex() { cloth = INSTANCE_CUSTOM.rgb; skin = COLOR.r; }
void fragment() {
	ALBEDO = mix(cloth * 0.75, vec3(0.5, 0.37, 0.29), skin);
	ROUGHNESS = 1.0;
	SPECULAR = 0.1;
}
"""
	var m := ShaderMaterial.new()
	m.shader = sh
	return m

var _crowd_pts: Array = []
func add_people(f: Dictionary, u: float, h: float) -> void:
	_crowd_pts.append([tr.w3(f, u + rng.randf_range(-0.12, 0.12), h + f.e), atan2(-tr.out3(f).x, -tr.out3(f).z) + rng.randf_range(-0.5, 0.5)])

func flush_people() -> void:
	var cols := [Color(0.08, 0.09, 0.11), Color(0.62, 0.62, 0.6), Color(0.13, 0.16, 0.26), Color(0.38, 0.09, 0.09), Color(0.24, 0.22, 0.2), Color(0.06, 0.06, 0.06), Color(0.48, 0.42, 0.3), Color(0.16, 0.26, 0.2), Color(0.6, 0.5, 0.15), Color(0.3, 0.33, 0.4), Color(0.12, 0.12, 0.13)]
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_custom_data = true
	mm.mesh = person_mesh()
	mm.instance_count = _crowd_pts.size()
	for i in _crowd_pts.size():
		var p: Array = _crowd_pts[i]
		var sc := rng.randf_range(0.9, 1.08)
		mm.set_instance_transform(i, Transform3D(Basis(Vector3.UP, p[1]).scaled(Vector3(sc, sc, sc)), p[0]))
		var c: Color = cols[rng.randi() % cols.size()]
		mm.set_instance_custom_data(i, c.lerp(Color(rng.randf(), rng.randf(), rng.randf()) * 0.6, 0.12))
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.material_override = crowd_mat()
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(mmi)
	_crowd_pts.clear()

func build_stands() -> void:
	# ゴール前の直線の外。ゴールの先 130m から手前 330m まで
	var s0 := maxf(home0 + 10.0, -140.0)
	var s1 := minf(home1 - 20.0, 470.0)
	var u_ap := TRACK_W + 6.0      # 前の芝生の外（ここから人が立つ）
	var concrete := std(Color(0.72, 0.71, 0.68), 0.85)
	var seat := std(Color(0.42, 0.45, 0.5), 0.7)
	var white := std(Color(0.93, 0.93, 0.92), 0.5)
	var glass := std(Color(0.12, 0.2, 0.28), 0.06, 0.6)
	var dark := std(Color(0.16, 0.17, 0.19), 0.7)
	# 前の広場（スタンドの前のコンクリート）
	extrude(PackedVector2Array([Vector2(u_ap, 0.3), Vector2(u_ap + 26, 0.6)]), s0 - 40, s1 + 40, concrete, 4.0, false)
	# 下の段（1階席）
	var p := PackedVector2Array()
	var u := u_ap + 26.0
	var h := 0.6
	p.append(Vector2(u, h))
	var lower: Array = []
	for i in 22:
		h += 0.42; p.append(Vector2(u, h)); u += 0.85; p.append(Vector2(u, h)); lower.append([u - 0.42, h])
	extrude(p, s0, s1, seat)
	var uL := u
	var hL := h
	# 2階の床の張り出し（ガラス張り）と上の段
	extrude(PackedVector2Array([Vector2(uL - 3, hL + 0.2), Vector2(uL - 3, hL + 5.5), Vector2(uL + 4, hL + 5.5)]), s0, s1, glass)
	var p2 := PackedVector2Array()
	u = uL + 2.0
	h = hL + 6.0
	p2.append(Vector2(u, h))
	var upper: Array = []
	for i in 20:
		h += 0.5; p2.append(Vector2(u, h)); u += 0.85; p2.append(Vector2(u, h)); upper.append([u - 0.42, h])
	extrude(p2, s0, s1, seat)
	var uU := u
	var hU := h
	# 後ろの建物（ガラスの壁）・屋根
	extrude(PackedVector2Array([Vector2(uU, hU), Vector2(uU, hU + 8), Vector2(uU + 22, hU + 8), Vector2(uU + 22, 0)]), s0, s1, glass)
	extrude(PackedVector2Array([Vector2(uU + 22, 0), Vector2(uL - 3, 0), Vector2(uL - 3, hL)]), s0, s1, dark, 4.0, false)
	extrude(PackedVector2Array([Vector2(u_ap + 18, hU + 13), Vector2(uU + 24, hU + 9), Vector2(uU + 24, hU + 10.2), Vector2(u_ap + 18, hU + 14.0), Vector2(u_ap + 18, hU + 13)]), s0 - 6, s1 + 6, white)
	# 屋根を支える柱
	var col := _cyl(0.35, 1.0)
	var s := s0
	while s <= s1:
		var f := tr.frame(s)
		var a := tr.w3(f, uU + 1, f.e + hU)
		var b := tr.w3(f, uU + 1, f.e + hU + 9.5)
		add_mesh(col, white, Transform3D(basis_between(a, b).scaled(Vector3(1, (b - a).length(), 1)), (a + b) / 2))
		s += 40.0
	# 観客：段の上に座る人と、前の広場に立つ人
	s = s0 + 1.0
	while s < s1 - 1.0:
		var f := tr.frame(s)
		for row in lower:
			if rng.randf() < 0.72:
				add_people(f, row[0], row[1] - 0.25)
		for row in upper:
			if rng.randf() < 0.62:
				add_people(f, row[0], row[1] - 0.25)
		s += 0.75
	# 前の広場：ラチの近くほど混む。ゴール前がいちばん
	s = s0 - 30.0
	while s < s1 + 30.0:
		var f := tr.frame(s)
		var near := 1.0 - clampf(absf(s - 40.0) / 300.0, 0.0, 0.7)
		var uu := u_ap + 0.6
		while uu < u_ap + 25.0:
			if rng.randf() < near * (1.15 - (uu - u_ap) / 30.0):
				add_people(f, uu, 0.3 + (uu - u_ap) / 26.0 * 0.3)
			uu += 0.7
		s += 0.65
	flush_people()

# ---- 内馬場：池・大きな画面・植え込み ----
func build_infield() -> void:
	# 池（ゴール前の向こう）
	var water := std(Color(0.18, 0.28, 0.32), 0.04, 0.0)
	water.metallic_specular = 0.9
	var pond := CylinderMesh.new()
	pond.top_radius = 1.0
	pond.bottom_radius = 1.0
	pond.height = 0.1
	pond.radial_segments = 48
	var fp := tr.frame(160.0)
	var pc := tr.w3(fp, -95.0, 0.0)
	add_mesh(pond, water, Transform3D(Basis(Vector3.UP, atan2(fp.fx, -fp.fy)).scaled(Vector3(70, 1, 30)), pc + Vector3(0, 0.02, 0)), false)
	# 大きな画面（内馬場、スタンドの向かい）
	var fb := tr.frame(230.0)
	var pb := tr.w3(fb, -60.0, 0.0)
	var face := atan2(tr.out3(fb).x, tr.out3(fb).z)
	var bas := Basis(Vector3.UP, face)
	var frame_m := std(Color(0.1, 0.1, 0.11), 0.6)
	var box := BoxMesh.new()
	box.size = Vector3(70, 13, 1.6)
	add_mesh(box, frame_m, Transform3D(bas, pb + Vector3(0, 13.5, 0)))
	var leg := BoxMesh.new()
	leg.size = Vector3(1.2, 8, 1.2)
	for dx in [-28.0, -9.0, 9.0, 28.0]:
		add_mesh(leg, frame_m, Transform3D(bas, pb + bas * Vector3(dx, 4, 0)))
	var scr := StandardMaterial3D.new()
	scr.albedo_color = Color(0.02, 0.03, 0.06)
	scr.emission_enabled = true
	scr.emission = Color(0.05, 0.1, 0.22)
	scr.emission_energy_multiplier = 1.0
	var sbox := BoxMesh.new()
	sbox.size = Vector3(67, 11, 0.1)
	add_mesh(sbox, scr, Transform3D(bas, pb + bas * Vector3(0, 13.5, 0.85)))
	for i in 3:
		var l := label("", 150, Color(1.0, 0.75, 0.3), pb + bas * Vector3(0, 17.2 - i * 3.4, 0.95), face, 0.014)
		l.shaded = false
		l.double_sided = false
		l.modulate = Color(1.6, 1.1, 0.5) if i == 0 else Color(1.4, 1.4, 1.4)
		board_labels.append(l)

# ---- 木（Quaternius の木。MultiMesh で並べる） ----
func tree_parts(path: String) -> Array:
	var sc: Node3D = load(path).instantiate()
	var out: Array = []
	for mi in sc.find_children("*", "MeshInstance3D", true, false):
		var m: MeshInstance3D = mi
		var xf := m.transform
		var n: Node = m.get_parent()
		while n != sc and n is Node3D:
			xf = (n as Node3D).transform * xf
			n = n.get_parent()
		out.append([m.mesh, xf])
	sc.free()
	return out

func plant(path: String, pts: Array) -> void:
	for part in tree_parts(path):
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = part[0]
		mm.instance_count = pts.size()
		for i in pts.size():
			mm.set_instance_transform(i, pts[i] * part[1])
		var mmi := MultiMeshInstance3D.new()
		mmi.multimesh = mm
		root.add_child(mmi)

func tree_xf(p: Vector3, size: float) -> Transform3D:
	return Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3.ONE * size * rng.randf_range(0.8, 1.25)), p)

func build_trees() -> void:
	var a: Array = []
	var b: Array = []
	var c: Array = []
	# 外周（スタンドのところは除く）。2〜3列
	var s := 0.0
	while s < tr.L:
		var f := tr.frame(s)
		var in_stand := s > tr.L - 180 or s < 520
		if not in_stand:
			for k in 3:
				if rng.randf() < 0.8:
					var p := tr.w3(f, TRACK_W + 45 + k * 11 + rng.randf_range(-3, 3), 0.0)
					[a, b, c][rng.randi() % 3].append(tree_xf(p, 2.2))
		s += 9.0
	# 内馬場の植え込み
	for i in 160:
		var f := tr.frame(rng.randf() * tr.L)
		if f.corner == 0 and absf(f.s) < 420 or f.s > tr.L - 200:
			continue
		var p := tr.w3(f, -60 - rng.randf() * 80, 0.0)
		[a, b, c][rng.randi() % 3].append(tree_xf(p, 1.9))
	plant("res://assets/trees/CommonTree_1.gltf", a)
	plant("res://assets/trees/CommonTree_3.gltf", b)
	plant("res://assets/trees/Pine_1.gltf", c)

# ---- 遠くの町（箱を並べる） ----
func build_town() -> void:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	var box := BoxMesh.new()
	mm.mesh = box
	var n := 2200
	mm.instance_count = n
	for i in n:
		var ang := rng.randf() * TAU
		var rr := rng.randf_range(900.0, 2600.0)
		var w := rng.randf_range(12, 40)
		var d := rng.randf_range(12, 40)
		var h := rng.randf_range(6, 22) * (2.6 if rng.randf() < 0.08 else 1.0)
		var p := Vector3(cos(ang) * rr * 1.25, h / 2.0 - 0.2, sin(ang) * rr)
		mm.set_instance_transform(i, Transform3D(Basis(Vector3.UP, rng.randf() * PI).scaled(Vector3(w, h, d)), p))
		var g := rng.randf_range(0.55, 0.9)
		mm.set_instance_color(i, Color(g, g * 0.98, g * 0.95))
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.roughness = 0.8
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.material_override = m
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(mmi)

# ---- 遠くの山（輪の形の地形。西に大きな山） ----
func build_mountains() -> void:
	var noise := FastNoiseLite.new()
	noise.seed = 7
	noise.frequency = 0.9
	noise.fractal_octaves = 5
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var NA := 360
	var radii := [4200.0, 5200.0, 6400.0, 7800.0]
	var grid: Array = []
	for j in radii.size():
		var row: Array = []
		for i in NA + 1:
			var ang := float(i) / NA * TAU
			var rr: float = radii[j]
			var n := noise.get_noise_2d(cos(ang) * 3.0 + j * 0.7, sin(ang) * 3.0 + j * 0.7) * 0.5 + 0.5
			var hgt := 0.0
			if j > 0:
				hgt = pow(n, 1.6) * (380.0 + 260.0 * j)
				# 西（-x）の山並みを高く
				hgt *= 0.55 + 0.9 * clampf(-cos(ang) * 0.8 + 0.4, 0.0, 1.0)
			var y := hgt - 3.0
			row.append(Vector3(cos(ang) * rr, y, sin(ang) * rr))
		grid.append(row)
	for j in radii.size() - 1:
		for i in NA:
			var a: Vector3 = grid[j][i]
			var b: Vector3 = grid[j][i + 1]
			var c: Vector3 = grid[j + 1][i]
			var d: Vector3 = grid[j + 1][i + 1]
			for v in [a, c, d, a, d, b]:
				var k := clampf(v.y / 900.0, 0.0, 1.0)
				st.set_color(Color(0.1, 0.17, 0.11).lerp(Color(0.2, 0.24, 0.3), k))
				st.add_vertex(v)
	# 遠い大きな山（雪をかぶった円すい）
	var ang0 := deg_to_rad(195.0)
	var c0 := Vector3(cos(ang0) * 9000, 0, sin(ang0) * 9000)
	var top := c0 + Vector3(0, 1650, 0)
	var NS := 64
	for i in NS:
		var a1 := float(i) / NS * TAU
		var a2 := float(i + 1) / NS * TAU
		var p1 := c0 + Vector3(cos(a1) * 3000, 0, sin(a1) * 3000)
		var p2 := c0 + Vector3(cos(a2) * 3000, 0, sin(a2) * 3000)
		var m1 := c0 + Vector3(cos(a1) * 900, 1100, sin(a1) * 900)
		var m2 := c0 + Vector3(cos(a2) * 900, 1100, sin(a2) * 900)
		for v in [p1, m1, m2, p1, m2, p2]:
			st.set_color(Color(0.17, 0.21, 0.3))
			st.add_vertex(v)
		for v in [m1, top, m2]:
			st.set_color(Color(0.95, 0.96, 1.0) if v == top else Color(0.85, 0.88, 0.95))
			st.add_vertex(v)
	st.generate_normals()
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.roughness = 1.0
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	add_mesh(st.commit(), m, Transform3D.IDENTITY, false)

# ---- 発走のゲート（スタート地点 s＝D） ----
func build_gate(n := 16, D := 2400.0) -> void:
	gate = Node3D.new()
	root.add_child(gate)
	var f := tr.frame(D)
	var fw := tr.fwd3(f)
	var ou := tr.out3(f)
	var bas := Basis(ou, Vector3.UP, -fw)  # x＝外、z＝後ろ
	var origin := tr.w3(f, LANE0 - GATE_P * 0.5, f.e)
	gate.transform = Transform3D(bas, origin)
	var green := std(Color(0.12, 0.38, 0.22), 0.5)
	var white := std(Color(0.93, 0.93, 0.9), 0.5)
	var w := GATE_P * n
	var beam := BoxMesh.new()
	beam.size = Vector3(w + 1.2, 0.5, 0.5)
	_gate_mesh(beam, green, Vector3(w / 2, 3.3, -1.0))
	_gate_mesh(beam, green, Vector3(w / 2, 3.3, 2.6))
	var post := BoxMesh.new()
	post.size = Vector3(0.12, 3.3, 0.12)
	var panel := BoxMesh.new()
	panel.size = Vector3(0.06, 1.5, 3.4)
	for i in n + 1:
		var x := i * GATE_P
		_gate_mesh(post, white, Vector3(x, 1.65, -0.2))
		_gate_mesh(post, white, Vector3(x, 1.65, 3.2))
		_gate_mesh(panel, green, Vector3(x, 1.25, 1.5))
	# 端の大きな柱と車輪
	var big := BoxMesh.new()
	big.size = Vector3(0.6, 3.6, 4.0)
	_gate_mesh(big, green, Vector3(-0.5, 1.8, 1.3))
	_gate_mesh(big, green, Vector3(w + 0.5, 1.8, 1.3))
	# 前の扉（左右に開く）
	var door := BoxMesh.new()
	door.size = Vector3(GATE_P / 2 - 0.04, 1.6, 0.05)
	for i in n:
		for side in [0, 1]:
			var hinge := Node3D.new()
			hinge.position = Vector3(i * GATE_P + (0.0 if side == 0 else GATE_P), 1.25, -0.25)
			gate.add_child(hinge)
			var mi := MeshInstance3D.new()
			mi.mesh = door
			mi.material_override = green if (i % 2 == 0) else white
			mi.position = Vector3((GATE_P / 4) * (1 if side == 0 else -1), 0, 0)
			hinge.add_child(mi)
			gate_doors.append([hinge, 1 if side == 0 else -1])
		var lab := Label3D.new()
		lab.text = str(i + 1)
		lab.font = font
		lab.font_size = 64
		lab.pixel_size = 0.006
		lab.position = Vector3(i * GATE_P + GATE_P / 2, 3.3, -1.27)
		lab.rotation = Vector3(0, PI, 0)
		lab.modulate = Color(1, 1, 1)
		gate.add_child(lab)
	# 前触れの灯（前の梁の上に枠ごとに1つ）：開く少し前（HSSim.GATE.tell 秒前）につく。目押しの合図（数・文字は出さない）
	gate_lamp = StandardMaterial3D.new()
	gate_lamp.albedo_color = Color(0.23, 0.14, 0.13)
	gate_lamp.roughness = 0.4
	gate_lamp.emission_enabled = true
	gate_lamp.emission = Color(1.0, 0.36, 0.16)
	gate_lamp.emission_energy_multiplier = 0.0
	var lamp := BoxMesh.new()
	lamp.size = Vector3(0.46, 0.24, 0.3)
	for i in n:
		_gate_mesh(lamp, gate_lamp, Vector3(i * GATE_P + GATE_P / 2, 3.68, -1.0))

# 前触れの灯をつける・消す
func set_lamps(on: bool) -> void:
	if gate_lamp == null:
		return
	gate_lamp.albedo_color = Color(1.0, 0.42, 0.2) if on else Color(0.23, 0.14, 0.13)
	gate_lamp.emission_energy_multiplier = 4.0 if on else 0.0

func _gate_mesh(m: Mesh, mat: Material, p: Vector3) -> void:
	var mi := MeshInstance3D.new()
	mi.mesh = m
	mi.material_override = mat
	mi.position = p
	gate.add_child(mi)

func set_doors(open: float) -> void:
	for d in gate_doors:
		var hinge: Node3D = d[0]
		hinge.rotation = Vector3(0, -open * d[1], 0)
