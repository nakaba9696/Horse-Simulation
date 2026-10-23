# 馬モデル試作 v2・v3・v4（godot/proto/tripo_horse/。ゲームからは呼ばない独立した場面と、レース画面の見比べの差し替え --proto-horse=v3・v4）
# - v4：骨 54 本・RaceGallop 0.45 秒・Stand 3 秒・Walk 1.2 秒（どれも LOOP_LINEAR）・首の補正は走り 1・立ち姿と常歩 0（クリップが持つ）
#        毛色は Horse にだけ（頭絡は別の材質）・取付点 6 つ・鞍の点が走りで上下する（0.08〜0.16m）・き甲の上下 0.10〜0.15m・三角形 2 万まで
#        騎手を Saddle に乗せられる・レース画面で v4 に替わり、ゲートの中は立ち姿・走ると位相が 距離÷7m
# - v3：読み込める・骨 54 本・RaceGallop が LOOP_LINEAR で約 0.45 秒・3 周で全部の骨が有限・1 周で同じ形に戻る・脚が動く
#        UV2 の領域が 8 つ（0〜7）・脚の番号が 5 つ（0〜4）・首の補正 RaceNeckCorrective が 1・完歩の式 L＝7×S÷2.6・再生の倍率 v×0.45÷L
# - v2：読み込める・骨 54 本・Gallop（0.8 秒）
# - 向き：頭が +Z（ゲームの前）・左の脚が +X（ゲームの馬の左）。移動は親（rig）
# - レース画面：proto_ver＝v3 で全部の馬が試作に替わり、いまの馬の形と騎手が消える。走ると位相が 距離÷7m で進む
extends RefCounted

const TripoModel := preload("res://proto/tripo_horse/tripo_model.gd")

func run(t) -> void:
	var ps = load("res://proto/tripo_horse/tripo_horse.tscn")
	t.ok(ps != null, "tripo: 試作の場面が読み込める")
	if ps == null:
		return
	var sc = ps.instantiate()
	t.root.add_child(sc)
	# ---- v3 ----
	var m3 = sc.tri["v3"]
	var sk: Skeleton3D = m3.skel
	var ap: AnimationPlayer = m3.player
	t.eq(sk.get_bone_count(), 54, "tripo v3: 骨 54 本")
	t.ok(ap.get_animation_list().has("RaceGallop"), "tripo v3: クリップ RaceGallop がある（%s）" % str(ap.get_animation_list()))
	t.eq(String(m3.clip), "RaceGallop", "tripo v3: 使うクリップは RaceGallop")
	var an := ap.get_animation(m3.clip)
	t.eq(an.loop_mode, Animation.LOOP_LINEAR, "tripo v3: クリップはループ（LOOP_LINEAR）")
	t.ok(absf(an.length - 0.45) < 0.005, "tripo v3: クリップは約 0.45 秒（%.4f）" % an.length)
	# UV2 の領域
	var mi: MeshInstance3D = m3.meshes[0]
	var arr := mi.mesh.surface_get_arrays(0)
	var uv2 = arr[Mesh.ARRAY_TEX_UV2]
	t.ok(uv2 != null and uv2.size() == (arr[Mesh.ARRAY_VERTEX] as PackedVector3Array).size(), "tripo v3: UV2 が全部の頂点にある（取り込みで作り直していない）")
	var regions := {}
	var legs := {}
	var bad := 0
	if uv2 != null:
		for uv in uv2:
			var r := int(floor(uv.x * 8.0))
			var l := int(floor(uv.y * 8.0))
			if r < 0 or r > 7 or l < 0 or l > 4:
				bad += 1
			regions[r] = regions.get(r, 0) + 1
			legs[l] = legs.get(l, 0) + 1
	t.eq(bad, 0, "tripo v3: UV2 の領域は 0〜7・脚は 0〜4 に収まる")
	t.eq(regions.size(), 8, "tripo v3: UV2 の領域が 8 つ（胴・たてがみ・尾・蹄・鼻先・目・顔の白徴候補・耳内側候補）")
	t.eq(legs.size(), 5, "tripo v3: 脚の番号が 5 つ（脚以外・左前・右前・左後・右後）")
	t.ok(mi.material_override is ShaderMaterial and (mi.material_override as ShaderMaterial).shader.resource_path.ends_with("v3/coat.gdshader"), "tripo v3: 毛色は v3/coat.gdshader")
	t.ok((mi.material_override as ShaderMaterial).get_shader_parameter("has_normal_map") == true, "tripo v3: 法線の絵を元の材質から引き継ぐ")
	# 首の補正
	t.eq(mi.mesh.get_blend_shape_count(), 1, "tripo v3: ブレンドシェイプが 1 つ")
	t.eq(String(mi.mesh.get_blend_shape_name(0)), "RaceNeckCorrective", "tripo v3: 首の補正 RaceNeckCorrective")
	m3.set_phase(0.37)
	t.ok(is_equal_approx(m3.neck_value(), 1.0), "tripo v3: 走るとき首の補正は 1（%.3f）" % m3.neck_value())
	# 完歩の式
	t.ok(is_equal_approx(m3.stride_m(), 7.0), "tripo v3: 倍率 2.6 で 1完歩 7m")
	t.ok(is_equal_approx(m3.speed_scale(7.0 / 0.45), 1.0), "tripo v3: 速さ 15.56m/秒で再生の倍率 1")
	t.ok(is_equal_approx(m3.speed_scale(16.0), 16.0 * 0.45 / 7.0), "tripo v3: 再生の倍率＝v×0.45÷L")
	var m3b = TripoModel.new()
	t.root.add_child(m3b)
	m3b.setup("v3", {}, 2.86)
	t.ok(is_equal_approx(m3b.stride_m(), 7.0 * 2.86 / 2.6), "tripo v3: 倍率を変えると L＝7×S÷2.6（S 2.86 → %.3f m）" % m3b.stride_m())
	m3b.free()
	# 向き（立ち姿のときの骨の位置。世界の座標）
	var head := -1
	var lfore := -1
	var hips := -1
	for i in sk.get_bone_count():
		var n := sk.get_bone_name(i)
		if n.ends_with("Head_8"): head = i
		if n.ends_with("0_Left_Limb_4"): lfore = i
		if n.ends_with("Root"): hips = i
	t.ok(head >= 0 and lfore >= 0 and hips >= 0, "tripo v3: 頭・左前脚・根の骨が名前の末尾で引ける")
	if head >= 0 and lfore >= 0 and hips >= 0:
		sc.ver = "v3"
		sc.refresh()
		sc.step(0.0)
		var g := func(b: int) -> Vector3: return sk.global_transform * sk.get_bone_global_pose(b).origin
		t.ok(g.call(head).z > g.call(hips).z + 0.5, "tripo v3: 頭が +Z（前）")
		t.ok(g.call(lfore).x > g.call(hips).x, "tripo v3: 左の脚が +X（馬の左）")
		# 3 周（1 周 96 刻み）をクリップのループで回す
		ap.play(m3.clip)
		ap.seek(0.0, true)
		var first: Array[Vector3] = []
		for i in sk.get_bone_count():
			first.append(sk.get_bone_global_pose(i).origin)
		var finite := true
		var leg := 0.0
		var drift := 0.0
		for s in range(1, 3 * 96 + 1):
			ap.advance(an.length / 96.0)
			if not m3.bones_finite():
				finite = false
			leg = maxf(leg, sk.get_bone_global_pose(lfore).origin.distance_to(first[lfore]))
			if s % 96 == 0:
				for i in sk.get_bone_count():
					drift = maxf(drift, sk.get_bone_global_pose(i).origin.distance_to(first[i]))
		t.ok(finite, "tripo v3: 3 周のあいだ全部の骨の位置が有限")
		t.ok(leg > 0.2, "tripo v3: 前脚が大きく動く（%.3f モデル単位）" % leg)
		t.ok(drift < 1e-4, "tripo v3: 1 周ごとに同じ形に戻る（ずれ %s）" % str(drift))
		ap.pause()
	# 移動は親。位相は 距離÷完歩
	sc.mode = "slip"
	sc.v = 16.0
	sc.lay = "solo"
	sc.refresh()
	var z0: float = sc.rig.position.z
	sc.step(0.5)
	t.ok(is_equal_approx(sc.rig.position.z - z0, 8.0), "tripo: 親が 16 m/秒で前（+Z）へ動く")
	t.ok(is_equal_approx(sc.anim_rate() / m3.cycle() * m3.stride_m(), 16.0), "tripo v3: 1秒の完歩の数×完歩＝速さ")
	# 毛色の切り替え（鹿毛 → 栗毛 → 芦毛）でシェーダの色が変わる
	var cols := []
	for c in ["bay", "chestnut", "grey"]:
		sc.coat = c
		sc.refresh()
		cols.append((mi.material_override as ShaderMaterial).get_shader_parameter("coat_color"))
	t.ok(cols[0] != cols[1] and cols[1] != cols[2], "tripo v3: 毛色 3 つで胴の色が変わる")
	# ---- v2 ----
	var m2 = sc.tri["v2"]
	t.eq(m2.skel.get_bone_count(), 54, "tripo v2: 骨 54 本")
	t.eq(String(m2.clip), "Gallop", "tripo v2: クリップは Gallop")
	t.ok(is_equal_approx(m2.player.get_animation(m2.clip).length, 0.8), "tripo v2: クリップは 0.8 秒")
	t.ok(absf(m2.stride_m() - 1.835) < 0.01, "tripo v2: 1完歩 約 1.84m（%.3f）" % m2.stride_m())
	# ---- v4 ----
	var m4 = sc.tri["v4"]
	var ap4: AnimationPlayer = m4.player
	t.eq(m4.skel.get_bone_count(), 54, "tripo v4: 骨 54 本")
	var lens := {"RaceGallop": 0.45, "Stand": 3.0, "Walk": 1.2}
	for c in lens:
		t.ok(ap4.has_animation(c), "tripo v4: クリップ %s がある" % c)
		if ap4.has_animation(c):
			var a4 := ap4.get_animation(c)
			t.ok(absf(a4.length - float(lens[c])) < 0.005 and a4.loop_mode == Animation.LOOP_LINEAR, "tripo v4: %s は約 %.2f 秒のループ（%.4f）" % [c, lens[c], a4.length])
	var tris := 0
	var horse_mi: MeshInstance3D = null
	var tack_ok := true
	for x in m4.meshes:
		tris += x.mesh.surface_get_array_index_len(0) / 3
		if String(x.name) == "Horse":
			horse_mi = x
		elif x.material_override != null:
			tack_ok = false
	t.ok(horse_mi != null and horse_mi.material_override is ShaderMaterial, "tripo v4: 毛色は Horse の形に塗る")
	t.ok(tack_ok and m4.meshes.size() == 3, "tripo v4: 頭絡（BridleLeather・BridleMetal）は元の材質のまま（%d の形）" % m4.meshes.size())
	t.ok(tris <= 20000, "tripo v4: 三角形は 2 万まで（%d）" % tris)
	if horse_mi != null:
		var uv4 = horse_mi.mesh.surface_get_arrays(0)[Mesh.ARRAY_TEX_UV2]
		var rg := {}
		var lg := {}
		for uv in uv4:
			rg[int(floor(uv.x * 8.0))] = true
			lg[int(floor(uv.y * 8.0))] = true
		t.ok(rg.size() == 8 and lg.size() == 5, "tripo v4: UV2 の領域 8・脚の番号 5（v3 と同じ決まり）")
	var socks_ok := true
	for n in ["Saddle", "Stirrup_L", "Stirrup_R", "Bit_L", "Bit_R", "Withers"]:
		if not m4.sockets.has(n):
			socks_ok = false
	t.ok(socks_ok, "tripo v4: 取付点 6 つ（Saddle・Stirrup_L/R・Bit_L/R・Withers）がある（%s）" % str(m4.sockets.keys()))
	# 歩き方と首の補正
	m4.set_motion("walk", 0.3, 0.0)
	t.ok(String(ap4.current_animation) == "Walk" and is_equal_approx(m4.neck_value(), 0.0), "tripo v4: 常歩では首の補正 0（%.3f）" % m4.neck_value())
	m4.set_motion("stand", 0.3, 0.0)
	t.ok(String(ap4.current_animation) == "Stand" and is_equal_approx(m4.neck_value(), 0.0), "tripo v4: 立ち姿では首の補正 0")
	m4.set_motion("race", 0.3, 0.0)
	t.ok(String(ap4.current_animation) == "RaceGallop" and is_equal_approx(m4.neck_value(), 1.0), "tripo v4: 走りでは首の補正 1（%.3f）" % m4.neck_value())
	t.ok(absf(ap4.current_animation_position - 0.3 * 0.45) < 1e-3, "tripo v4: 走りの位相 0.3 → 0.135 秒（%.4f）" % ap4.current_animation_position)
	# 1 周：鞍の点とき甲の上下・骨が有限・1 周で同じ形に戻る
	var w_lo := 1e9
	var w_hi := -1e9
	var s_lo := 1e9
	var s_hi := -1e9
	var fin4 := true
	var first4: Array[Vector3] = []
	m4.set_motion("race", 0.0, 0.0)
	for i in m4.skel.get_bone_count():
		first4.append(m4.skel.get_bone_global_pose(i).origin)
	for k in range(1, 97):
		m4.set_motion("race", k / 96.0, 0.0)
		if not m4.bones_finite():
			fin4 = false
		var wy: float = m4.socket_xf("Withers").origin.y
		var sy: float = m4.socket_xf("Saddle").origin.y
		w_lo = minf(w_lo, wy); w_hi = maxf(w_hi, wy)
		s_lo = minf(s_lo, sy); s_hi = maxf(s_hi, sy)
	var drift4 := 0.0
	for i in m4.skel.get_bone_count():
		drift4 = maxf(drift4, m4.skel.get_bone_global_pose(i).origin.distance_to(first4[i]))
	t.ok(fin4, "tripo v4: 1 周のあいだ全部の骨が有限")
	t.ok(drift4 < 1e-3, "tripo v4: 1 周で同じ形に戻る（ずれ %s）" % str(drift4))
	t.ok(w_hi - w_lo > 0.10 and w_hi - w_lo < 0.15, "tripo v4: き甲が 0.10〜0.15m 上下する（%.3f）" % (w_hi - w_lo))
	t.ok(s_hi - s_lo > 0.08 and s_hi - s_lo < 0.16, "tripo v4: 鞍の点が背の骨と一緒に上下する（%.3f）" % (s_hi - s_lo))
	# 騎手を Saddle に乗せる
	m4.mount_jockey(sc.race_info)
	m4.set_motion("race", 0.4, 0.0)
	m4.update_rider(0.4, 1.0, 1.0, 0.0)
	t.ok(m4.rider != null and (m4.rider_hold.global_transform * m4._seat0).distance_to(m4.socket_xf("Saddle").origin) < 1e-3, "tripo v4: 騎手の鞍の上面が Saddle に重なる")
	var fwd: Vector3 = m4.rider_hold.global_basis.z.normalized()
	var rig_fwd: Vector3 = m4.global_basis.z.normalized()
	t.ok(fwd.dot(rig_fwd) > 0.98 and m4.rider_hold.global_basis.y.normalized().y > 0.98, "tripo v4: 騎手は馬の前（+Z）を向き、上は +Y（%s）" % str(fwd))
	sc.free()
	# ---- レース画面の差し替え（--proto-horse=v4） ----
	var rv4 = load("res://scenes/race.tscn").instantiate()
	rv4.proto_ver = "v4"
	t.root.add_child(rv4)
	rv4.set_process(false)
	t.eq(rv4.proto.size(), rv4.horses.size(), "tripo race v4: 全部の馬が試作 v4 に替わる（%d 頭）" % rv4.horses.size())
	var riders := 0
	for p in rv4.proto:
		if p.rider != null:
			riders += 1
	t.eq(riders, rv4.horses.size(), "tripo race v4: 全部の v4 に騎手が乗る")
	rv4._jump_to(-1.0)
	t.eq(String(rv4.proto[0].player.current_animation), "Stand", "tripo race v4: ゲートの中は立ち姿")
	rv4._jump_to(8.0)
	var me4: int = rv4.me
	var x4: float = rv4._last_H[me4][0] if rv4._last_H.size() > me4 else -1.0
	var want4 := fposmod((x4 / 7.0 + rv4.horses[me4].num * 0.137), 1.0) * 0.45
	var got4: float = rv4.proto[me4].player.current_animation_position
	t.ok(String(rv4.proto[me4].player.current_animation) == "RaceGallop" and absf(got4 - want4) < 1e-3, "tripo race v4: 走りの位相は 距離÷7m（%.3f・%.3f 秒）" % [got4, want4])
	rv4.free()
	# ---- レース画面の差し替え（--proto-horse=v3 と同じ） ----
	var rv = load("res://scenes/race.tscn").instantiate()
	rv.proto_ver = "v3"
	t.root.add_child(rv)
	rv.set_process(false)
	t.eq(rv.proto.size(), rv.horses.size(), "tripo race: 全部の馬が試作 v3 に替わる（%d 頭）" % rv.horses.size())
	var hidden := true
	for h in rv.horses:
		if h.model.visible or h.jockey.visible:
			hidden = false
	t.ok(hidden, "tripo race: いまの馬の形と騎手は消える")
	rv._jump_to(8.0)
	var me: int = rv.me
	var x: float = rv._last_H[me][0] if rv._last_H.size() > me else -1.0
	var want := fposmod((x / 7.0 + rv.horses[me].num * 0.137), 1.0) * 0.45
	var got: float = rv.proto[me].player.current_animation_position
	t.ok(x > 0.0 and absf(got - want) < 1e-3, "tripo race: 走りの位相は 距離÷7m（%.3f・%.3f 秒）" % [got, want])
	var fin := true
	for p in rv.proto:
		if not p.bones_finite():
			fin = false
	t.ok(fin, "tripo race: 走ったあとも全部の骨が有限")
	rv.free()
