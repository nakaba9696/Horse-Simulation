# 馬モデル試作の比べの数を測る（v4〜v8・いまの馬を同じ物差しで。速さ 16 m/秒・倍率 2.6）
#   godot --headless --path godot -s res://proto/tripo_horse/measure.gd [-- --cpu=0]
# 形の数：試作の場面（tripo_horse.gd）で 3 頭を同じ距離だけ走らせ、1/240 秒ごとに
#   蹄（試作は UV2 の領域 3 と脚の番号、いまの馬は指と趾の骨が主な頂点）を CPU で皮に写して、
#   4本とも浮く割合（どの蹄の最も低い点も地面から 1.5cm より上）・接地中の蹄の滑り（蹄の重心の水平の速さ）・前後の蹄の開き・
#   1本の蹄の前後の振れ・うなじ（頭の付け根の骨）・き甲（試作は Spine_7、いまの馬は首の付け根の骨）・鞍の高さを出す
# 首の角度（v5 の依頼の物差し）：皮の上の3点を最初のコマで選び、同じ頂点を追う（首の補正のブレンドシェイプも掛ける）
#   き甲＝き甲の骨の前後 ±4cm の、体のまん中の線（左右 3cm 以内）でいちばん高い頂点／うなじ＝頭の骨の前後 ±6cm の、まん中の線でいちばん高い頂点／
#   鼻先＝いちばん前の頂点（試作は鼻先の領域 4 の中、いまの馬は高さ 0.9m より上）。尾（試作の領域 2）は除く（たてがみの帯は首の上の線なので残す）。
#   v5 で引き継ぎの値（首の傾き 23.4〜25.9°・頭と首 100.1°）と 3°以内に合うことを確かめた（こちらは 20〜23°・99.7°）。首の傾き＝き甲→うなじの線の水平からの角、頭と首の角度＝うなじで き甲 と 鼻先 を見込む角
#   （引き継ぎの neck-line.json は表面の決まった点と左右の中点で測る。こちらは同じ物差しで3頭を並べるための目安）
# 首と頭の長さ（v6 の依頼の物差し）：同じ3点で、首の水平の長さ＝き甲→うなじの水平の距離・首の弦＝き甲→うなじの距離・頭の長さ＝うなじ→鼻先の距離（平均）。
#   皮の点はたてがみの帯の上を取るので、点の選び方に左右されない 骨の首の水平の長さ（き甲の骨→頭の付け根の骨）も出す。
#   引き継ぎの proportion-comparison.json（き甲は Spine_7 の真上の皮・うなじは決まった皮の点・鼻先は左右の中点。たてがみを除く）とは点が違うので、比は合わない
# 首と頭の比（v7 の依頼の物差し）：同じ3点で、首の上の線＝き甲→うなじの弦（皮の点）・頭の長さ＝うなじ→鼻先・頭÷首の上の線。走りの平均と、立ち姿（Stand・0 m/秒）の値を出す。
#   引き継ぎの anatomy-comparison.json（首の上の線は き甲→うなじの皮の 33 点の線の長さ・頭はうなじ→上唇）とは点と測り方が違うので、数そのものは合わない（並べる版どうしの比べの目安）
# 胴と頭のピッチ（v7 の依頼の物差し）：胴＝背の骨（試作は Spine_0→Spine_7、いまの馬は腰の骨→首の付け根の骨）の向きの水平からの角、
#   頭＝うなじ→鼻先の皮の点の向きの水平からの角。1周期の幅（最大−最小）を出す。引き継ぎは胴を Spine_0→Spine_7、頭を皮の点で測る（同じ考え）
# 補正のブレンドシェイプ（RaceNeckCorrective・v7 と v8 の WalkNeckCorrective）は、どちらも今の値を掛けて皮を写す
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
	sc.lay = "quad8"
	sc.v = 16.0
	sc.mode = "slip"
	sc.refresh()
	var subj := {}
	for vv in ["v4", "v5", "v6", "v7", "v8"]:
		subj[vv] = tripo_subject(sc.tri[vv])
	subj["old"] = old_subject(sc.old)
	var t := 0.0
	while t < WARM:
		sc.step(DT)
		t += DT
	for k in subj:
		pick_neck(subj[k])
	var acc := {}
	for k in subj:
		acc[k] = {"air": 0, "n": 0, "slip_sum": 0.0, "slip_n": 0, "spread": 0.0, "swing": [[1e9, -1e9], [1e9, -1e9], [1e9, -1e9], [1e9, -1e9]],
			"nape": [1e9, -1e9, 0.0], "neck": [1e9, -1e9], "headneck": [1e9, -1e9], "neckh": 0.0, "neckc": 0.0, "headl": 0.0, "neckb": 0.0, "bpitch": [1e9, -1e9], "hpitch": [1e9, -1e9], "hc": [1e9, -1e9], "lowest": 1e9, "stance_lo": [], "wither": [1e9, -1e9], "saddle": [1e9, -1e9], "prev": []}
	t = 0.0
	while t < SPAN - 1e-6:
		sc.step(DT)
		t += DT
		for k in subj:
			sample(subj[k], acc[k])
	# 常歩（1.3 m/秒）：うなじ（頭の付け根の骨）の高さ−き甲の高さの平均と、1周期（試作 1.6m・いまの馬 ViewGait.WALK_STRIDE）でのうなじの上下の山の数（うなずき）
	var walk := {}
	sc.v = 1.3
	sc.t = 0.0
	sc.dist = 0.0
	for i in 240:
		sc.step(DT)
	var wser := {}
	for k in subj:
		wser[k] = []
	var wspan: float = 1.6 / 1.3
	var tw := 0.0
	while tw < wspan * 2.0 - 1e-6:
		sc.step(DT)
		tw += DT
		for k in subj:
			var sk2: Skeleton3D = subj[k].sk
			var ny2 := (sk2.global_transform * sk2.get_bone_global_pose(subj[k].nape).origin).y
			var wy2 := (sk2.global_transform * sk2.get_bone_global_pose(subj[k].wither).origin).y
			wser[k].append([ny2, wy2])
	for k in subj:
		var ser: Array = wser[k]
		var d := 0.0
		var lo := 1e9
		var hi := -1e9
		for e in ser:
			d += e[0] - e[1]
			lo = minf(lo, e[0]); hi = maxf(hi, e[0])
		# 山の数：前後 0.08 秒より高い点（2 周期ぶんを数えて半分）
		var pk := 0
		var w := int(0.08 / DT)
		for i in range(w, ser.size() - w):
			var top := true
			for j in range(i - w, i + w + 1):
				if j != i and ser[j][0] >= ser[i][0]:
					top = false
					break
			if top:
				pk += 1
		walk[k] = [d / ser.size(), hi - lo, pk / 2.0 * (1.6 / ViewGait.WALK_STRIDE if k == "old" else 1.0)]
	sc.v = 16.0
	# 立ち姿（0 m/秒）：同じ3点で首の上の線と頭の長さ（Stand の 1 秒の所）
	var stand := {}
	sc.v = 0.0
	sc.t = 0.0
	sc.dist = 0.0
	for i in 60:
		sc.step(1.0 / 60.0)
	for k in subj:
		var s0: Dictionary = subj[k]
		if s0.has("neck_pts"):
			var pw := skinned(s0, s0.neck_pts[0])
			var pp := skinned(s0, s0.neck_pts[1])
			var pn := skinned(s0, s0.neck_pts[2])
			stand[k] = [pw.distance_to(pp), pp.distance_to(pn), rad_to_deg(atan2(pp.y - pw.y, Vector2(pp.x - pw.x, pp.z - pw.z).length())), pp.y]
	sc.v = 16.0
	print("==== 比べの数（16 m/秒・倍率 2.6・%d コマ）====" % int(round(SPAN / DT)))
	for k in subj:
		var a: Dictionary = acc[k]
		var s: Dictionary = subj[k]
		var sw := 0.0
		for l in 4:
			sw = maxf(sw, a.swing[l][1] - a.swing[l][0])
		print("%s: 1完歩 %.2fm・1秒 %.2f 完歩・うなじ 平均 %.2fm（%.2f〜%.2f・幅 %.3f）・き甲の上下 %.3fm・鞍 %s・4本とも浮く %.1f%%・前後の蹄の開き %.2fm・1本の振れ %.2fm・接地中の滑り %.2fm/秒・蹄の最も低い点 %.3fm・浮く割合（いちばん低い蹄が 0/3/5cm より上）%s・首の傾き %.1f〜%.1f°・頭と首の角度 %.1f〜%.1f°・首の水平の長さ %.3fm（骨 %.3fm）・首の弦 %.3fm・頭の長さ %.3fm・三角形 %d・骨 %d・体の長さ（立ち姿の形）%.2fm" % [
			k, s.stride, 16.0 / s.stride, a.nape[2] / a.n, a.nape[0], a.nape[1], a.nape[1] - a.nape[0], a.wither[1] - a.wither[0],
			("%.2f〜%.2fm（幅 %.3f）" % [a.saddle[0], a.saddle[1], a.saddle[1] - a.saddle[0]]) if a.saddle[0] < 1e8 else "なし",
			100.0 * a.air / a.n, a.spread, sw, a.slip_sum / maxf(1.0, a.slip_n), a.lowest, air_by(a.stance_lo), a.neck[0], a.neck[1], a.headneck[0], a.headneck[1], a.neckh / a.n, a.neckb / a.n, a.neckc / a.n, a.headl / a.n, s.tris, s.bones, s.length])
		var st: Array = stand.get(k, [0.0, 0.0, 0.0, 0.0])
		print("%s: 走り 頭の中心（うなじと鼻先の皮の点の中点）の上下 %.3fm・首の上の線（弦）%.3fm・頭 %.3fm・頭÷首 %.3f・胴のピッチの幅 %.2f°（%.1f〜%.1f）・頭のピッチの幅 %.2f°（%.1f〜%.1f）／立ち姿 首の上の線 %.3fm・頭 %.3fm・頭÷首 %.3f・首の傾き %.1f°・うなじの高さ %.2fm／常歩 うなじ−き甲 %.3fm・うなじの上下 %.3fm・1周期のうなずき %.1f 回" % [
			k, a.hc[1] - a.hc[0], a.neckc / a.n, a.headl / a.n, (a.headl / a.n) / maxf(1e-6, a.neckc / a.n), a.bpitch[1] - a.bpitch[0], a.bpitch[0], a.bpitch[1], a.hpitch[1] - a.hpitch[0], a.hpitch[0], a.hpitch[1],
			st[0], st[1], st[1] / maxf(1e-6, st[0]), st[2], st[3], walk[k][0], walk[k][1], walk[k][2]])
	sc.free()
	if do_cpu:
		for pv in ["", "v6", "v6-nojockey", "v7", "v7-nojockey", "v8", "v8-nojockey"]:
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
	var hair := {}
	var muz := {}
	for i in V.size():
		var rg := int(floor(uv2[i].x * 8.0))
		if rg == 2:
			hair[i] = true          # 尾は除く（たてがみの帯は首の上の線そのものなので残す）
		if rg == 4:
			muz[i] = true
	var sk: Skeleton3D = m.skel
	var nape := -1
	var wither := -1
	var spine0 := -1
	for i in sk.get_bone_count():
		var n := sk.get_bone_name(i)
		if n.ends_with("Head_5"): nape = i
		if n.ends_with("Spine_7"): wither = i
		if n.ends_with("Spine_0"): spine0 = i
	var ab := mi.mesh.get_aabb()
	return {"m": m, "mi": mi, "sk": sk, "skin": mi.skin, "arr": arr, "hoof": hoof, "nape": nape, "wither": wither, "body": [spine0, wither],
		"saddle": m.sockets.get("Saddle"), "stride": m.stride_m(), "tris": tris, "bones": sk.get_bone_count(),
		"length": maxf(ab.size.x, ab.size.z) * m.S, "binds": binds(mi.skin, sk), "hair": hair, "muzzle": muz, "neck_bs": neck_bs(mi)}

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
	return {"h": h, "mi": mi, "sk": h.skel, "skin": mi.skin, "arr": arr, "hoof": hoof, "nape": R.head, "wither": R.neck, "body": [R.pelvis, R.neck],
		"seat0": seat0, "stride": 7.2, "tris": tris, "bones": h.skel.get_bone_count(), "length": ab.size.z * M.place_s, "binds": b2,
		"hair": {}, "muzzle": {}, "neck_bs": []}

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
	var v0 := V[i]
	for nb in s.get("neck_bs", []):
		var bw: float = s.mi.get_blend_shape_value(nb.k)
		if bw != 0.0:
			var T: PackedVector3Array = nb.T
			v0 = v0 + (T[i] - V[i]) * bw if nb.normalized else v0 + T[i] * bw
	var p := Vector3.ZERO
	for q in per:
		var w := W[i * per + q]
		if w <= 0.0:
			continue
		var k := Bn[i * per + q]
		p += (sk.get_bone_global_pose(int(s.binds[k])) * skin.get_bind_pose(k) * v0) * w
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
	if s.has("neck_pts"):
		var pw := skinned(s, s.neck_pts[0])
		var pp := skinned(s, s.neck_pts[1])
		var pn := skinned(s, s.neck_pts[2])
		var na := rad_to_deg(atan2(pp.y - pw.y, Vector2(pp.x - pw.x, pp.z - pw.z).length()))
		var hn := rad_to_deg((pw - pp).angle_to(pn - pp))
		a.neck[0] = minf(a.neck[0], na); a.neck[1] = maxf(a.neck[1], na)
		a.headneck[0] = minf(a.headneck[0], hn); a.headneck[1] = maxf(a.headneck[1], hn)
		a.neckh += Vector2(pp.x - pw.x, pp.z - pw.z).length()
		a.neckc += pw.distance_to(pp)
		a.headl += pp.distance_to(pn)
		var hp := rad_to_deg(atan2(pn.y - pp.y, Vector2(pn.x - pp.x, pn.z - pp.z).length()))
		a.hpitch[0] = minf(a.hpitch[0], hp); a.hpitch[1] = maxf(a.hpitch[1], hp)
		var hcy := (pp.y + pn.y) * 0.5
		a.hc[0] = minf(a.hc[0], hcy); a.hc[1] = maxf(a.hc[1], hcy)
	var bb0 := sk.global_transform * sk.get_bone_global_pose(s.body[0]).origin
	var bb1 := sk.global_transform * sk.get_bone_global_pose(s.body[1]).origin
	var bp := rad_to_deg(atan2(bb1.y - bb0.y, Vector2(bb1.x - bb0.x, bb1.z - bb0.z).length()))
	a.bpitch[0] = minf(a.bpitch[0], bp); a.bpitch[1] = maxf(a.bpitch[1], bp)
	var bwp := sk.global_transform * sk.get_bone_global_pose(s.wither).origin
	var bnp := sk.global_transform * sk.get_bone_global_pose(s.nape).origin
	a.neckb += Vector2(bnp.x - bwp.x, bnp.z - bwp.z).length()
	var wy := bwp.y
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

# 首の補正（RaceNeckCorrective・v7 の WalkNeckCorrective）のブレンドシェイプ：番号・形・混ぜ方
func neck_bs(mi: MeshInstance3D) -> Array:
	var out := []
	var ba: Array = mi.mesh.surface_get_blend_shape_arrays(0)
	for k in mi.mesh.get_blend_shape_count():
		if String(mi.mesh.get_blend_shape_name(k)) in ["RaceNeckCorrective", "WalkNeckCorrective"]:
			out.append({"k": k, "T": (ba[k] as Array)[Mesh.ARRAY_VERTEX], "normalized": mi.mesh.blend_shape_mode == Mesh.BLEND_SHAPE_MODE_NORMALIZED})
	return out

# 首の3点（き甲・うなじ・鼻先）の頂点をいまの形で選ぶ（上の説明）。前は根の +Z、左右は根の X
func pick_neck(s: Dictionary) -> void:
	var sk: Skeleton3D = s.sk
	var rig: Node3D = (s.m.get_parent() if s.has("m") else s.h.get_parent())
	var inv := rig.global_transform.affine_inverse()
	var zw := (inv * (sk.global_transform * sk.get_bone_global_pose(s.wither).origin)).z
	var zh := (inv * (sk.global_transform * sk.get_bone_global_pose(s.nape).origin)).z
	var V: PackedVector3Array = s.arr[Mesh.ARRAY_VERTEX]
	var best := [-1, -1, -1]
	var val := [-1e9, -1e9, -1e9]
	for i in V.size():
		if s.hair.has(i):
			continue
		var p := inv * skinned(s, i)
		var nose_ok: bool = s.muzzle.has(i) if not s.muzzle.is_empty() else p.y > 0.9
		if nose_ok and p.z > val[2]:
			val[2] = p.z; best[2] = i
		if absf(p.x) > 0.03:
			continue
		if absf(p.z - zw) < 0.04 and p.y > val[0]:
			val[0] = p.y; best[0] = i
		if absf(p.z - zh) < 0.06 and p.y > val[1]:
			val[1] = p.y; best[1] = i
	if best.min() >= 0:
		s["neck_pts"] = best

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
