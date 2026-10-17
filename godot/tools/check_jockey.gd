# 騎手の乗り姿を数で確かめる（docs/HORSE3D.md 9）：腰・お尻の下・膝・足首・肩・手・頭の位置を馬の胴の座標（x 前・y 上・z 右。胴が立ち姿の高さ）で測り、範囲に入るかを見る
#   godot --headless --path godot -s res://tools/check_jockey.gd
extends SceneTree

var h: ViewHorse
var fails := 0

func _initialize() -> void:
	var race: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/replay_race.json"))
	h = ViewHorse.new()
	root.add_child(h)
	h.setup(race.horses[0], null)
	await process_frame
	if h.jockey.skel == null:
		print("jockey: 素材の体が読めないので飛ばした")
		quit(0)
		return
	var base := {"ph": 0.0, "sp": 1.0, "push": 0.0, "t": 1.3, "walk_ph": 0.0, "walk_w": 0.0, "whip": -1.0, "pose": -1.0, "head_up": 0.0, "ears": 0.4}
	# 襲歩（道中）：1完歩を8コマ
	var run := []
	for i in 8:
		var g := base.duplicate()
		g.ph = i / 8.0
		run.append(_measure(g))
	_judge("道中", run, {"seat": [0.02, 0.12], "knee_x": [0.32, 0.56], "knee_y": [1.58, 1.8], "ank_y": [1.36, 1.54], "shin": [30.0, 80.0], "back": [-5.0, 32.0], "hand_x": [0.62, 0.9], "hand_y": [1.72, 1.92], "wide": [0.0, 0.31], "spread": [0.0, 0.3], "drift": [0.0, 0.02], "butt": [0.0, 0.06]})
	# 追う：前後に大きく
	var push := []
	for i in 8:
		var g := base.duplicate()
		g.ph = i / 8.0
		g.push = 1.0
		push.append(_measure(g))
	_judge("追う", push, {"seat": [0.0, 0.14], "butt": [-0.01, 0.08], "knee_x": [0.3, 0.58], "back": [-10.0, 32.0], "hand_x": [0.6, 1.0], "wide": [0.0, 0.31], "sweep": [0.08, 0.4]})
	# パドック（常歩）：鞍に座って体を起こす
	var walk := []
	for i in 4:
		var g := base.duplicate()
		g.sp = 0.0
		g.walk_w = 1.0
		g.walk_ph = i / 4.0
		walk.append(_measure(g))
	_judge("常歩", walk, {"seat": [-0.02, 0.1], "butt": [-0.03, 0.03], "back": [45.0, 85.0], "hand_x": [0.4, 0.85], "wide": [0.0, 0.31]})
	# ゴール後の流し
	var ease := []
	for i in 4:
		var g := base.duplicate()
		g.sp = 0.55
		g.ph = i / 4.0
		g["ease"] = 1.0
		ease.append(_measure(g))
	_judge("流し", ease, {"back": [30.0, 75.0], "wide": [0.0, 0.31]})
	print("jockey: %s" % ("ok" if fails == 0 else "%d 件が範囲の外" % fails))
	quit(1 if fails > 0 else 0)

func _hm(p: Vector3) -> Vector3:
	var r := h.torso.global_transform.affine_inverse() * p
	return Vector3(r.z + h._j1.z, r.y + 1.25, -r.x)

# 騎手の骨の位置（鞍のずれを引いた、鞍に対する位置）
func _bone(n: String) -> Vector3:
	var sk := h.jockey.skel
	var o := h.jockey.position
	return _hm(sk.global_transform * sk.get_bone_global_pose(h.jockey.B[n]).origin) - Vector3(o.z, o.y, -o.x)

func _measure(g: Dictionary) -> Dictionary:
	h.animate(g, 0.0, true)
	var hip := _bone("pelvis")
	var sh := _bone("neck_01")
	var kl := _bone("calf_l")
	var kr := _bone("calf_r")
	var al := _bone("foot_l")
	var hl := _bone("hand_l")
	var hr := _bone("hand_r")
	var sad := _saddle() - h.jockey.position.y   # 鞍の上面の、騎手（鐙）から見た高さ
	var shin := rad_to_deg(atan2(kl.x - al.x, kl.y - al.y))
	var wide := maxf(maxf(absf(kl.z), absf(kr.z)), maxf(absf(al.z), absf(_bone("foot_r").z)))
	return {"seat": hip.y - 1.63, "knee_x": kl.x, "knee_y": kl.y, "ank_y": al.y, "shin": shin,
		"back": rad_to_deg(atan2(sh.y - hip.y, sh.x - hip.x)), "hand_x": (hl.x + hr.x) / 2.0, "hand_y": (hl.y + hr.y) / 2.0,
		"wide": wide, "spread": absf(kl.z - kr.z) / 2.0 - 0.0, "hip_x": hip.x, "hip_y": hip.y, "sad": sad,
		"head": _bone("Head"), "butt": _butt() - 1.63}

# お尻の下の面：腰の骨が主の頂点（ズボン）のいちばん低い所（鞍に対する高さ）
var _bv: PackedInt32Array = []
func _butt() -> float:
	var j := h.jockey
	var mi: MeshInstance3D = null
	for m in j.body.find_children("*", "MeshInstance3D", true, false):
		if m.visible:
			mi = m
	var a := mi.mesh.surface_get_arrays(0)
	var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
	var BI: PackedInt32Array = a[Mesh.ARRAY_BONES]
	var BW: PackedFloat32Array = a[Mesh.ARRAY_WEIGHTS]
	var nb := BI.size() / V.size()
	var sk := mi.skin
	if _bv.is_empty():
		for k in V.size():
			for q in nb:
				if BW[k * nb + q] > 0.3 and String(sk.get_bind_name(BI[k * nb + q])) in ["pelvis", "thigh_l", "thigh_r"]:
					_bv.append(k)
					break
	var lo := 9.0
	var o := j.position
	for k in _bv:
		var acc := Vector3.ZERO
		for q in nb:
			var w := BW[k * nb + q]
			if w > 0.0:
				var b := BI[k * nb + q]
				acc += (j.skel.get_bone_global_pose(j.B[String(sk.get_bind_name(b))]) * sk.get_bind_pose(b) * V[k]) * w
		var p := _hm(j.skel.global_transform * acc) - Vector3(o.z, o.y, -o.x)
		# 鞍の上（前後 −0.15〜0.25）だけを見る
		if p.x > -0.15 and p.x < 0.25:
			lo = minf(lo, p.y)
	return lo

# 鞍の上面の真ん中に近い体の頂点を、骨で動かした位置（胴の座標の高さ）
var _sv := -1
func _saddle() -> float:
	var M := ViewHorseModel.get_model()
	var a := M.body_mesh.surface_get_arrays(0)
	var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
	var BI: PackedInt32Array = a[Mesh.ARRAY_BONES]
	var BW: PackedFloat32Array = a[Mesh.ARRAY_WEIGHTS]
	if _sv < 0:
		var best := 1e9
		for k in V.size():
			var p := V[k] * M.place_s + Vector3(0, 0, M.place_dx)
			var d := Vector3(p.x * 3.0, p.y - 1.6, p.z - 0.05).length()
			if d < best:
				best = d
				_sv = k
	var nb := BI.size() / V.size()
	var acc := Vector3.ZERO
	for q in nb:
		var w := BW[_sv * nb + q]
		if w > 0.0:
			var b := BI[_sv * nb + q]
			acc += (h.skel.get_bone_global_pose(M.skin.get_bind_bone(b) if M.skin.get_bind_bone(b) >= 0 else b) * M.skin.get_bind_pose(b) * V[_sv]) * w
	return _hm(h.skel.global_transform * acc).y

func _judge(name: String, M: Array, R: Dictionary) -> void:
	var s := "  %s:" % name
	for k in R:
		var lo := 1e9
		var hi := -1e9
		for m in M:
			var v: float
			if k == "drift":
				# 鞍と鐙のずれ：鞍（馬の体の面。骨で動く）の上面が、鐙を付けた胴の座標で1完歩にどれだけ動くか
				v = float(m.sad)
			elif k == "sweep":
				v = float(m.hip_x)
			else:
				v = float(m[k])
			lo = minf(lo, v)
			hi = maxf(hi, v)
		var bad := false
		if k == "drift" or k == "sweep":
			var d := hi - lo
			bad = d < float(R[k][0]) or d > float(R[k][1])
			s += " %s=%.3f" % [k, d]
		else:
			bad = lo < float(R[k][0]) or hi > float(R[k][1])
			s += " %s=%.2f〜%.2f" % [k, lo, hi]
		if bad:
			fails += 1
			s += "(NG)"
	print(s)
