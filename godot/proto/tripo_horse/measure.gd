# 馬モデル試作の比べの数を測る（v3・v4・いまの馬を同じ物差しで。速さ 16 m/秒・倍率 2.6）
#   godot --headless --path godot -s res://proto/tripo_horse/measure.gd [-- --cpu=0]
# 形の数：試作の場面（tripo_horse.gd）で 3 頭を同じ距離だけ走らせ、1/240 秒ごとに
#   蹄（試作は UV2 の領域 3 と脚の番号、いまの馬は指と趾の骨が主な頂点）を CPU で皮に写して、
#   4本とも浮く割合（どの蹄の最も低い点も地面から 1.5cm より上）・接地中の蹄の滑り（蹄の重心の水平の速さ）・前後の蹄の開き・
#   1本の蹄の前後の振れ・うなじ（頭の付け根の骨）・き甲（試作は Spine_7、いまの馬は首の付け根の骨）・鞍の高さを出す
# 1コマの CPU：レース画面（scenes/race.tscn。16 頭）を 20 秒まで進め、advance(1/60) を 180 回まわした時間（描く所は含まない）
extends SceneTree

const DT := 1.0 / 240.0
const WARM := 1.0
const SPAN := 0.9          # 2 周期
const AIR := 0.015         # 浮いているとみなす高さ（m）

func _initialize() -> void:
	var do_cpu := true
	for a in OS.get_cmdline_user_args():
		if a == "--cpu=0":
			do_cpu = false
	var sc = load("res://proto/tripo_horse/tripo_horse.tscn").instantiate()
	root.add_child(sc)
	await process_frame
	sc.lay = "quad"
	sc.v = 16.0
	sc.mode = "slip"
	sc.refresh()
	var subj := {}
	for vv in ["v3", "v4"]:
		subj[vv] = tripo_subject(sc.tri[vv])
	subj["old"] = old_subject(sc.old)
	var t := 0.0
	while t < WARM:
		sc.step(DT)
		t += DT
	var acc := {}
	for k in subj:
		acc[k] = {"air": 0, "n": 0, "slip_sum": 0.0, "slip_n": 0, "spread": 0.0, "swing": [[1e9, -1e9], [1e9, -1e9], [1e9, -1e9], [1e9, -1e9]],
			"nape": [1e9, -1e9, 0.0], "lowest": 1e9, "stance_lo": [], "wither": [1e9, -1e9], "saddle": [1e9, -1e9], "prev": []}
	t = 0.0
	while t < SPAN - 1e-6:
		sc.step(DT)
		t += DT
		for k in subj:
			sample(subj[k], acc[k])
	print("==== 比べの数（16 m/秒・倍率 2.6・%d コマ）====" % int(round(SPAN / DT)))
	for k in subj:
		var a: Dictionary = acc[k]
		var s: Dictionary = subj[k]
		var sw := 0.0
		for l in 4:
			sw = maxf(sw, a.swing[l][1] - a.swing[l][0])
		print("%s: 1完歩 %.2fm・1秒 %.2f 完歩・うなじ 平均 %.2fm（%.2f〜%.2f・幅 %.3f）・き甲の上下 %.3fm・鞍 %s・4本とも浮く %.1f%%・前後の蹄の開き %.2fm・1本の振れ %.2fm・接地中の滑り %.2fm/秒・蹄の最も低い点 %.3fm・浮く割合（いちばん低い蹄が 0/3/5cm より上）%s・三角形 %d・骨 %d・体の長さ（立ち姿の形）%.2fm" % [
			k, s.stride, 16.0 / s.stride, a.nape[2] / a.n, a.nape[0], a.nape[1], a.nape[1] - a.nape[0], a.wither[1] - a.wither[0],
			("%.2f〜%.2fm（幅 %.3f）" % [a.saddle[0], a.saddle[1], a.saddle[1] - a.saddle[0]]) if a.saddle[0] < 1e8 else "なし",
			100.0 * a.air / a.n, a.spread, sw, a.slip_sum / maxf(1.0, a.slip_n), a.lowest, air_by(a.stance_lo), s.tris, s.bones, s.length])
	sc.free()
	if do_cpu:
		for pv in ["", "v3", "v4", "v4-nojockey"]:
			cpu(pv)
	quit()

# ---- 試作 ----
func tripo_subject(m) -> Dictionary:
	var mi: MeshInstance3D = null
	var tris := 0
	for x in m.meshes:
		tris += x.mesh.surface_get_array_index_len(0) / 3
		if String(x.name) == "Horse" or mi == null:
			mi = x
	var arr := mi.mesh.surface_get_arrays(0)
	var V: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	var uv2: PackedVector2Array = arr[Mesh.ARRAY_TEX_UV2]
	var hoof := [[], [], [], []]
	for i in V.size():
		if int(floor(uv2[i].x * 8.0)) == 3:
			var l := int(floor(uv2[i].y * 8.0))
			if l >= 1 and l <= 4:
				hoof[l - 1].append(i)
	var sk: Skeleton3D = m.skel
	var nape := -1
	var wither := -1
	for i in sk.get_bone_count():
		var n := sk.get_bone_name(i)
		if n.ends_with("Head_5"): nape = i
		if n.ends_with("Spine_7"): wither = i
	var ab := mi.mesh.get_aabb()
	return {"m": m, "mi": mi, "sk": sk, "skin": mi.skin, "arr": arr, "hoof": hoof, "nape": nape, "wither": wither,
		"saddle": m.sockets.get("Saddle"), "stride": m.stride_m(), "tris": tris, "bones": sk.get_bone_count(),
		"length": maxf(ab.size.x, ab.size.z) * m.S, "binds": binds(mi.skin, sk)}

# ---- いまの馬 ----
func old_subject(h: ViewHorse) -> Dictionary:
	var mi := h.body_mi
	var arr := mi.mesh.surface_get_arrays(0)
	var Bn: PackedInt32Array = arr[Mesh.ARRAY_BONES]
	var W: PackedFloat32Array = arr[Mesh.ARRAY_WEIGHTS]
	var V: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	var per := Bn.size() / V.size()
	var R := h.M.role
	# 脚の先の骨（手・指／足・趾）が主な頂点のうち、その脚でいちばん低い所から 8cm（実寸）までを蹄とみなす
	var legs := [[R.lHa, R.lFi, R.lFi + 1], [R.rHa, R.rFi, R.rFi + 1], [R.lFt, R.lTo, R.lTo + 1], [R.rFt, R.rTo, R.rTo + 1]]
	var cand := [[], [], [], []]
	var low := [1e9, 1e9, 1e9, 1e9]
	for i in V.size():
		var best := 0
		for q in per:
			if W[i * per + q] > W[i * per + best]:
				best = q
		var b := Bn[i * per + best]
		for l in 4:
			if legs[l].has(b):
				cand[l].append(i)
				low[l] = minf(low[l], V[i].y)
	var hoof := [[], [], [], []]
	for l in 4:
		for i in cand[l]:
			if V[i].y < low[l] + 0.08 / h.M.place_s:
				hoof[l].append(i)
	var tris := 0
	for c in h.model.get_children():
		if c is MeshInstance3D and c.visible:
			tris += (c as MeshInstance3D).mesh.surface_get_array_index_len(0) / 3
	var M := h.M
	var acc := Vector3.ZERO
	for sp in M.seat:
		acc += sp[0]
	acc /= maxf(1.0, float(M.seat.size()))
	var J1: Array = M.handmade.J1
	var seat0 := (-ViewHorse.hm(J1[0], J1[1], J1[2]) + Vector3(0, 0, M.place_dx)) + acc * M.place_s
	var ab := mi.mesh.get_aabb()
	var b2 := {}
	for k in mi.skin.get_bind_count():
		b2[k] = k
	return {"h": h, "mi": mi, "sk": h.skel, "skin": mi.skin, "arr": arr, "hoof": hoof, "nape": R.head, "wither": R.neck,
		"seat0": seat0, "stride": 7.2, "tris": tris, "bones": h.skel.get_bone_count(), "length": ab.size.z * M.place_s, "binds": b2}

func binds(skin: Skin, sk: Skeleton3D) -> Dictionary:
	var d := {}
	for k in skin.get_bind_count():
		var b := skin.get_bind_bone(k)
		if b < 0:
			b = sk.find_bone(skin.get_bind_name(k))
		d[k] = b
	return d

func skinned(s: Dictionary, i: int) -> Vector3:
	var arr: Array = s.arr
	var V: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	var Bn: PackedInt32Array = arr[Mesh.ARRAY_BONES]
	var W: PackedFloat32Array = arr[Mesh.ARRAY_WEIGHTS]
	var per := Bn.size() / V.size()
	var sk: Skeleton3D = s.sk
	var skin: Skin = s.skin
	var p := Vector3.ZERO
	for q in per:
		var w := W[i * per + q]
		if w <= 0.0:
			continue
		var k := Bn[i * per + q]
		p += (sk.get_bone_global_pose(int(s.binds[k])) * skin.get_bind_pose(k) * V[i]) * w
	return sk.global_transform * p

func sample(s: Dictionary, a: Dictionary) -> void:
	var sk: Skeleton3D = s.sk
	var rig: Node3D = (s.m.get_parent() if s.has("m") else s.h.get_parent())
	var all_up := true
	var cz: Array[float] = []
	var cur := []
	for l in 4:
		var lo := 1e9
		var c := Vector3.ZERO
		for i in s.hoof[l]:
			var p := skinned(s, i)
			lo = minf(lo, p.y)
			c += p
		c /= maxf(1.0, float(s.hoof[l].size()))
		cur.append([lo, c])
		a.lowest = minf(a.lowest, lo)
		cz.append(c.z)
		if lo <= AIR:
			all_up = false
		var rel := c.z - rig.global_position.z
		a.swing[l][0] = minf(a.swing[l][0], rel)
		a.swing[l][1] = maxf(a.swing[l][1], rel)
		if lo <= AIR and a.prev.size() == 4 and a.prev[l][0] <= AIR:
			var d: Vector3 = c - a.prev[l][1]
			a.slip_sum += Vector2(d.x, d.z).length() / DT
			a.slip_n += 1
	a.prev = cur
	var m4 := 1e9
	for c4 in cur:
		m4 = minf(m4, c4[0])
	a.stance_lo.append(m4)
	a.n += 1
	if all_up:
		a.air += 1
	a.spread = maxf(a.spread, cz.max() - cz.min())
	var ny := (sk.global_transform * sk.get_bone_global_pose(s.nape).origin).y
	a.nape[0] = minf(a.nape[0], ny)
	a.nape[1] = maxf(a.nape[1], ny)
	a.nape[2] += ny
	var wy := (sk.global_transform * sk.get_bone_global_pose(s.wither).origin).y
	a.wither[0] = minf(a.wither[0], wy)
	a.wither[1] = maxf(a.wither[1], wy)
	var sy := 1e9
	if s.get("saddle") != null:
		sy = s.m.socket_xf("Saddle").origin.y
	elif s.has("seat0"):
		var h: ViewHorse = s.h
		sy = (h.torso.global_transform * (s.seat0 + h.seat_shift())).y
	if sy < 1e8:
		a.saddle[0] = minf(a.saddle[0], sy)
		a.saddle[1] = maxf(a.saddle[1], sy)

func air_by(lo: Array) -> String:
	var out := []
	for th in [0.0, 0.03, 0.05]:
		var n := 0
		for x in lo:
			if x > th:
				n += 1
		out.append("%.0f%%" % (100.0 * n / maxf(1.0, lo.size())))
	return "/".join(out)

# ---- 1コマの CPU（レース画面） ----
func cpu(pv: String) -> void:
	var rv = load("res://scenes/race.tscn").instantiate()
	rv.proto_ver = pv.trim_suffix("-nojockey")
	rv.no_jockey = pv.ends_with("-nojockey")
	root.add_child(rv)
	rv.set_process(false)
	rv._jump_to(20.0)
	for i in 30:
		rv.advance(1.0 / 60.0)
	var ts: Array[float] = []
	for i in 180:
		var t0 := Time.get_ticks_usec()
		rv.advance(1.0 / 60.0)
		ts.append((Time.get_ticks_usec() - t0) / 1000.0)
	ts.sort()
	var sum := 0.0
	for x in ts:
		sum += x
	print("CPU %s: 1コマ 平均 %.2fms・中央 %.2fms・95%% %.2fms（16 頭・advance(1/60)・描く所なし）" % [pv if pv != "" else "いまの馬", sum / ts.size(), ts[ts.size() / 2], ts[int(ts.size() * 0.95)]])
	rv.free()
