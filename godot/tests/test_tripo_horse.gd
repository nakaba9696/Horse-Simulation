# 馬モデル試作 v2〜v7（godot/proto/tripo_horse/。ゲームからは呼ばない独立した場面と、レース画面の見比べの差し替え --proto-horse=v3〜v7）
# - v7：v6 の約束（骨 54 本・5つのクリップの長さとループ・RaceNeckCorrective の値・完歩・速さで歩き方を選ぶ・き甲の上下・うなじの上下）が変わらない・三角形 19,168（v6）まで
#        首の補正を名前で 2 つ（WalkNeckCorrective は常歩だけ 1。形を動かし、歩き方の切り替えで混ざり、立ち姿で両方 0）・走ると胴のピッチが 5° より大きく揺れる
#        取り込み：.import を読み直して設定を確かめ、240 コマ・圧縮なし・UV2・COLOR_0（頭の座標）・法線の絵（強さ 0.03）・LOD が残る
#        毛色は v7/coat.gdshader（付属の差分＝COLOR_0 の鼻の穴と口の線。シェーダが読める）・取付点 6 つが v7 の attachment-tracks.json に合う（5 動作・2mm まで）
#        騎手を Saddle に乗せる（走りと常歩）・レース画面で v7 に替わる
# - v6：v5 の約束（骨 54 本・5つのクリップの長さとループ・首の補正の値・完歩・速さで歩き方を選ぶ・Saddle と Withers の動き）が変わらない・三角形 19,190（v5）まで
#        取り込み：5つのクリップは 240 コマで間引かない（AnimationPlayer の optimizer を切った確かめ）・圧縮しない・UV2 と法線の絵（強さ 0.03）が GLB のまま・LOD がある
#        毛色は v6/coat.gdshader（付属の補正）・取付点 6 つが v6 の saddle-track.json に合う（Bit は v6 の値）・走るとうなじの高さが 0.25〜0.35m 上下する（v5 は 0.17m）
#        騎手を Saddle に乗せる・レース画面で v6 に替わる
# - v5：骨 54 本・RaceGallop 0.45・Stand 3・Walk 1.2・Trot 173/240・Canter 0.6 秒（どれも LOOP_LINEAR・1 周で同じ形に戻る）・首の補正は走り・速歩・駈歩 1、立ち姿と常歩 0
#        毛色は v5/coat.gdshader（法線の補正・鼻先とたてがみの混ぜ・法線の絵の強さは GLB の 0.03）・頭絡は元の材質・三角形 19,358 まで
#        取付点 6 つが引き継ぎの saddle-track.json の位置に合う（取り込みで AnimationPlayer の optimizer を切った確かめ）・き甲の上下 0.13〜0.17m
#        速さで歩き方を選ぶ・走りから立ち姿へ戻すと立ち姿の形に戻る・騎手を Saddle に乗せる・レース画面で v5 に替わる
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
	# ---- v5 ----
	var m5 = sc.tri["v5"]
	var ap5: AnimationPlayer = m5.player
	t.eq(m5.skel.get_bone_count(), 54, "tripo v5: 骨 54 本")
	var lens5 := {"RaceGallop": 0.45, "Stand": 3.0, "Walk": 1.2, "Trot": 173.0 / 240.0, "Canter": 0.6}
	var morph5 := {"RaceGallop": 1.0, "Stand": 0.0, "Walk": 0.0, "Trot": 1.0, "Canter": 1.0}
	var gait5 := {"RaceGallop": "race", "Stand": "stand", "Walk": "walk", "Trot": "trot", "Canter": "canter"}
	for c in lens5:
		t.ok(ap5.has_animation(c), "tripo v5: クリップ %s がある" % c)
		if not ap5.has_animation(c):
			continue
		var a5 := ap5.get_animation(c)
		t.ok(absf(a5.length - float(lens5[c])) < 0.002 and a5.loop_mode == Animation.LOOP_LINEAR, "tripo v5: %s は約 %.3f 秒のループ（%.4f）" % [c, lens5[c], a5.length])
		# 1 周で同じ形に戻る・骨が有限・首の補正はクリップの値
		var g5: String = gait5[c]
		m5.set_motion(g5, 0.0, 0.0)
		var p0: Array[Vector3] = []
		for i in m5.skel.get_bone_count():
			p0.append(m5.skel.get_bone_global_pose(i).origin)
		var fin5 := true
		for k in range(1, 49):
			m5.set_motion(g5, k / 48.0, 0.0)
			if not m5.bones_finite():
				fin5 = false
		var dr5 := 0.0
		for i in m5.skel.get_bone_count():
			dr5 = maxf(dr5, m5.skel.get_bone_global_pose(i).origin.distance_to(p0[i]))
		t.ok(fin5 and dr5 < 1e-3, "tripo v5: %s は 1 周で同じ形に戻り骨が有限（ずれ %s）" % [c, str(dr5)])
		m5.set_motion(g5, 0.37, 0.0)
		t.ok(String(ap5.current_animation) == c and is_equal_approx(m5.neck_value(), float(morph5[c])), "tripo v5: %s の首の補正 %.0f（%.3f）" % [c, morph5[c], m5.neck_value()])
	t.ok(absf(m5.gait_stride_m("trot") - 2.8) < 1e-4 and absf(m5.gait_stride_m("canter") - 4.5) < 1e-4 and absf(m5.gait_stride_m("walk") - 1.6) < 1e-4 and absf(m5.stride_m() - 7.0) < 1e-4, "tripo v5: 倍率 2.6 の完歩 常歩 1.6・速歩 2.8・駈歩 4.5・襲歩 7m")
	var gv := []
	for vv in [0.0, 1.3, 3.9, 7.5, 16.0]:
		gv.append(m5.gait_for(vv))
	t.eq(gv, ["stand", "walk", "trot", "canter", "race"], "tripo v5: 速さ 0・1.3・3.9・7.5・16 m/秒で 立ち姿・常歩・速歩・駈歩・走り")
	t.eq(m5.gait_for(16.0, true), "stand", "tripo v5: ゲートの中は立ち姿")
	t.eq(m4.gait_for(3.9), "walk", "tripo v4: 速歩が無いので 3.9 m/秒は常歩のまま")
	# 毛色（付属のシェーダの補正を合わせたもの）
	var horse5: MeshInstance3D = null
	var tack5 := true
	var tris5 := 0
	for x in m5.meshes:
		tris5 += x.mesh.surface_get_array_index_len(0) / 3
		if String(x.name) == "Horse":
			horse5 = x
		elif x.material_override != null:
			tack5 = false
	t.ok(tack5 and m5.meshes.size() == 3, "tripo v5: 頭絡は元の材質のまま（%d の形）" % m5.meshes.size())
	t.ok(tris5 <= 19358, "tripo v5: 三角形は v4（19,358）より増えない（%d）" % tris5)
	var sm5: ShaderMaterial = horse5.material_override if horse5 != null else null
	t.ok(sm5 != null and sm5.shader.resource_path.ends_with("v5/coat.gdshader"), "tripo v5: 毛色は v5/coat.gdshader")
	if sm5 != null:
		var code := sm5.shader.code
		t.ok(code.contains("geometric_normal") and code.contains("dot(NORMAL, geometric_normal) < 0.15"), "tripo v5: 毛色のシェーダに法線の補正（面の向きと 0.15 より食い違う画素を戻す）がある")
		t.ok(code.contains("mix(body, muzzle_color.rgb, region_blend)") and code.contains("mix(body, mane_color.rgb, region_blend)"), "tripo v5: 鼻先とたてがみの根元を UV2 の小数で混ぜる")
		t.ok(code.contains("points_color") and code.contains("top_color") and code.contains("belly_color"), "tripo v5: v3 の脚先・背と腹の濃淡も残す")
		var names := []
		for u in sm5.shader.get_shader_uniform_list():
			names.append(String(u.name))
		t.ok(names.has("coat_color") and names.has("muzzle_color") and names.has("normal_strength"), "tripo v5: 毛色のシェーダが読める（uniform %d 個）" % names.size())
		t.ok(absf(float(sm5.get_shader_parameter("normal_strength")) - 0.03) < 1e-3 and sm5.get_shader_parameter("has_normal_map") == true, "tripo v5: 法線の絵は GLB の強さ 0.03 のまま（%s）" % str(sm5.get_shader_parameter("normal_strength")))
		m5.set_coat({"coatLook": UiArt.coat_look("栗毛")})
		var want_body := Color.html(String(UiArt.coat_look("栗毛").body))
		t.ok((sm5.get_shader_parameter("coat_color") as Color).is_equal_approx(want_body), "tripo v5: 毛色の表（UiArt.coat_look）の色を渡す")
		var uv5 = horse5.mesh.surface_get_arrays(0)[Mesh.ARRAY_TEX_UV2]
		var rg5 := {}
		var lg5 := {}
		var mixed := 0
		for uv in uv5:
			var r5 := int(floor(uv.x * 8.0))
			rg5[r5] = true
			lg5[int(floor(uv.y * 8.0))] = true
			var fr := fposmod(uv.x * 8.0, 1.0)
			if (r5 == 1 or r5 == 4) and fr > 0.12 and fr < 0.88:
				mixed += 1
		t.ok(rg5.size() == 8 and lg5.size() == 5, "tripo v5: UV2 の領域 8・脚の番号 5（v3・v4 と同じ決まり）")
		t.ok(mixed > 0, "tripo v5: 鼻先・たてがみの根元に混ぜる途中の頂点がある（%d）" % mixed)
	# 取付点：引き継ぎの saddle-track.json（モデル座標・倍率を掛ける前）の位置に合う
	var socks5 := true
	for n in ["Saddle", "Stirrup_L", "Stirrup_R", "Bit_L", "Bit_R", "Withers"]:
		if not m5.sockets.has(n):
			socks5 = false
	t.ok(socks5, "tripo v5: 取付点 6 つがある（%s）" % str(m5.sockets.keys()))
	var track5 := [[0.0, "Saddle", Vector3(0.02302, 0.53869, 0.0)], [0.23333, "Saddle", Vector3(0.03487, 0.52309, 0.0)],
		[0.11667, "Bit_L", Vector3(-0.48224, 0.44807, 0.039)], [0.35, "Withers", Vector3(-0.15226, 0.5155, -0.00191)]]
	var err5 := 0.0
	for e in track5:
		m5.set_motion("race", float(e[0]) / 0.45, 0.0)
		var pm5: Vector3 = m5.glb.global_transform.affine_inverse() * m5.socket_xf(String(e[1])).origin
		err5 = maxf(err5, pm5.distance_to(e[2]) * 2.6)
	t.ok(err5 < 0.002, "tripo v5: 取付点が引き継ぎの記録に合う（最大 %.4fm・2mm まで）" % err5)
	# き甲の上下・走りから立ち姿へ戻す
	var wl := 1e9
	var wh := -1e9
	for k in 96:
		m5.set_motion("race", k / 96.0, 0.0)
		var wy5: float = m5.socket_xf("Withers").origin.y
		wl = minf(wl, wy5); wh = maxf(wh, wy5)
	t.ok(wh - wl > 0.13 and wh - wl < 0.17, "tripo v5: き甲が 0.13〜0.17m 上下する（%.3f）" % (wh - wl))
	var ref5 = TripoModel.new()
	sc.add_child(ref5)
	ref5.setup("v5")
	m5.set_motion("race", 0.5, 0.0)
	var tt := 0.3
	for k in 30:
		tt += 0.05
		m5.set_motion("stand", tt / 3.0, 0.05)
	ref5.set_motion("stand", tt / 3.0, 0.0)
	var sw5 := 0.0
	for i in m5.skel.get_bone_count():
		sw5 = maxf(sw5, m5.skel.get_bone_global_pose(i).origin.distance_to(ref5.skel.get_bone_global_pose(i).origin))
	t.ok(sw5 < 1e-3 and is_equal_approx(m5.neck_value(), 0.0), "tripo v5: 走りから立ち姿へ戻すと立ち姿の形に戻り首の補正 0（ずれ %s）" % str(sw5))
	ref5.free()
	# 騎手を Saddle に乗せる（Saddle の軸は v4 と同じなので −90° のまま）
	m5.mount_jockey(sc.race_info)
	m5.set_motion("race", 0.4, 0.0)
	m5.update_rider(0.4, 1.0, 1.0, 0.0)
	t.ok(m5.rider != null and (m5.rider_hold.global_transform * m5._seat0).distance_to(m5.socket_xf("Saddle").origin) < 1e-3, "tripo v5: 騎手の鞍の上面が Saddle に重なる")
	var fwd5: Vector3 = m5.rider_hold.global_basis.z.normalized()
	t.ok(fwd5.dot(m5.global_basis.z.normalized()) > 0.98 and m5.rider_hold.global_basis.y.normalized().y > 0.98, "tripo v5: 騎手は馬の前（+Z）を向き、上は +Y（%s）" % str(fwd5))
	# ---- v6 ----
	var m6 = sc.tri["v6"]
	var ap6: AnimationPlayer = m6.player
	t.eq(m6.skel.get_bone_count(), 54, "tripo v6: 骨 54 本")
	for c in lens5:
		t.ok(ap6.has_animation(c), "tripo v6: クリップ %s がある" % c)
		if not ap6.has_animation(c):
			continue
		var a6 := ap6.get_animation(c)
		t.ok(absf(a6.length - float(lens5[c])) < 0.002 and a6.loop_mode == Animation.LOOP_LINEAR, "tripo v6: %s は約 %.3f 秒のループ（%.4f）" % [c, lens5[c], a6.length])
		# 取り込み：240 コマのキーが全部残り（optimizer を切った）、圧縮していない
		var mx6 := 0
		var comp6 := 0
		for i in a6.get_track_count():
			mx6 = maxi(mx6, a6.track_get_key_count(i))
			if a6.track_is_compressed(i):
				comp6 += 1
		t.ok(mx6 >= int(round(a6.length * 240.0)) and comp6 == 0, "tripo v6: %s は 240 コマのキーを間引かず圧縮しない（1本 %d キー・圧縮 %d）" % [c, mx6, comp6])
		var g6: String = gait5[c]
		m6.set_motion(g6, 0.0, 0.0)
		var q0: Array[Vector3] = []
		for i in m6.skel.get_bone_count():
			q0.append(m6.skel.get_bone_global_pose(i).origin)
		var fin6 := true
		for k in range(1, 49):
			m6.set_motion(g6, k / 48.0, 0.0)
			if not m6.bones_finite():
				fin6 = false
		var dr6 := 0.0
		for i in m6.skel.get_bone_count():
			dr6 = maxf(dr6, m6.skel.get_bone_global_pose(i).origin.distance_to(q0[i]))
		t.ok(fin6 and dr6 < 1e-3, "tripo v6: %s は 1 周で同じ形に戻り骨が有限（ずれ %s）" % [c, str(dr6)])
		m6.set_motion(g6, 0.37, 0.0)
		t.ok(String(ap6.current_animation) == c and is_equal_approx(m6.neck_value(), float(morph5[c])), "tripo v6: %s の首の補正 %.0f（%.3f）" % [c, morph5[c], m6.neck_value()])
	var gv6 := []
	for vv in [0.0, 1.3, 3.9, 7.5, 16.0]:
		gv6.append(m6.gait_for(vv))
	t.eq(gv6, ["stand", "walk", "trot", "canter", "race"], "tripo v6: 速さで 立ち姿・常歩・速歩・駈歩・走り（v5 と同じ境）")
	t.ok(absf(m6.gait_stride_m("trot") - 2.8) < 1e-4 and absf(m6.gait_stride_m("canter") - 4.5) < 1e-4 and absf(m6.stride_m() - 7.0) < 1e-4, "tripo v6: 倍率 2.6 の完歩 速歩 2.8・駈歩 4.5・襲歩 7m")
	var horse6: MeshInstance3D = null
	var tack6 := true
	var tris6 := 0
	for x in m6.meshes:
		tris6 += x.mesh.surface_get_array_index_len(0) / 3
		if String(x.name) == "Horse":
			horse6 = x
		elif x.material_override != null:
			tack6 = false
	t.ok(tack6 and m6.meshes.size() == 3, "tripo v6: 頭絡は元の材質のまま（%d の形）" % m6.meshes.size())
	t.ok(tris6 <= 19190, "tripo v6: 三角形は v5（19,190）より増えない（%d）" % tris6)
	var sm6: ShaderMaterial = horse6.material_override if horse6 != null else null
	t.ok(sm6 != null and sm6.shader.resource_path.ends_with("v6/coat.gdshader"), "tripo v6: 毛色は v6/coat.gdshader")
	if sm6 != null:
		var code6 := sm6.shader.code
		t.ok(code6.contains("dot(NORMAL, geometric_normal) < 0.15") and code6.contains("mix(body, muzzle_color.rgb, region_blend)") and code6.contains("mix(body, mane_color.rgb, region_blend)"), "tripo v6: 付属の補正（法線・鼻先とたてがみの根元の混ぜ）がある")
		t.ok(absf(float(sm6.get_shader_parameter("normal_strength")) - 0.03) < 1e-3 and sm6.get_shader_parameter("has_normal_map") == true, "tripo v6: 法線の絵は GLB の中の絵を強さ 0.03 で使う（%s）" % str(sm6.get_shader_parameter("normal_strength")))
		m6.set_coat({"coatLook": UiArt.coat_look("芦毛", 7.0)})
		t.ok((sm6.get_shader_parameter("coat_color") as Color).is_equal_approx(Color.html(String(UiArt.coat_look("芦毛", 7.0).body))), "tripo v6: 毛色の表（UiArt.coat_look）の色を渡す")
		var arr6 := horse6.mesh.surface_get_arrays(0)
		var uv6 = arr6[Mesh.ARRAY_TEX_UV2]
		t.ok(uv6 != null and (uv6 as PackedVector2Array).size() == (arr6[Mesh.ARRAY_VERTEX] as PackedVector3Array).size(), "tripo v6: UV2 が全部の頂点にある（ライトマップ用に作り直していない）")
		var rg6 := {}
		var lg6 := {}
		for uv in uv6:
			rg6[int(floor(uv.x * 8.0))] = true
			lg6[int(floor(uv.y * 8.0))] = true
		t.ok(rg6.size() == 8 and lg6.size() == 5, "tripo v6: UV2 の領域 8・脚の番号 5（v5 と同じ決まり）")
		t.ok(RenderingServer.mesh_get_surface(horse6.mesh.get_rid(), 0).get("lods", []).size() > 0, "tripo v6: LOD がある（.import の generate_lods）")
	# 取付点：v6 の saddle-track.json（モデル座標）。Saddle・Withers は v5 と同じ動き、Bit は頭の形に合わせて変わった
	var track6 := [[0.0, "Saddle", Vector3(0.02302, 0.53869, 0.0)], [0.23333, "Saddle", Vector3(0.03487, 0.52309, 0.0)],
		[0.0, "Bit_L", Vector3(-0.54697, 0.54027, 0.03447)], [0.11667, "Bit_L", Vector3(-0.53189, 0.52552, 0.03447)],
		[0.35, "Withers", Vector3(-0.15226, 0.5155, -0.00191)], [0.11667, "Stirrup_R", Vector3(0.01207, 0.47907, -0.085)]]
	var err6 := 0.0
	for e in track6:
		m6.set_motion("race", float(e[0]) / 0.45, 0.0)
		var pm6: Vector3 = m6.glb.global_transform.affine_inverse() * m6.socket_xf(String(e[1])).origin
		err6 = maxf(err6, pm6.distance_to(e[2]) * 2.6)
	t.ok(err6 < 0.002, "tripo v6: 取付点が v6 の記録に合う（最大 %.4fm・2mm まで）" % err6)
	# き甲の上下（v5 と同じ）・うなじの上下（首と頭を振る。v5 は 0.17m）
	var nape6 := -1
	for i in m6.skel.get_bone_count():
		if m6.skel.get_bone_name(i).ends_with("Head_5"):
			nape6 = i
	var wl6 := 1e9
	var wh6 := -1e9
	var nl6 := 1e9
	var nh6 := -1e9
	for k in 96:
		m6.set_motion("race", k / 96.0, 0.0)
		var wy6: float = m6.socket_xf("Withers").origin.y
		wl6 = minf(wl6, wy6); wh6 = maxf(wh6, wy6)
		var ny6: float = (m6.skel.global_transform * m6.skel.get_bone_global_pose(nape6).origin).y
		nl6 = minf(nl6, ny6); nh6 = maxf(nh6, ny6)
	t.ok(wh6 - wl6 > 0.13 and wh6 - wl6 < 0.17, "tripo v6: き甲が 0.13〜0.17m 上下する（v5 と同じ。%.3f）" % (wh6 - wl6))
	t.ok(nh6 - nl6 > 0.25 and nh6 - nl6 < 0.35, "tripo v6: 走るとうなじが 0.25〜0.35m 上下する（首と頭を振る。%.3f）" % (nh6 - nl6))
	var ref6 = TripoModel.new()
	sc.add_child(ref6)
	ref6.setup("v6")
	m6.set_motion("race", 0.5, 0.0)
	var tt6 := 0.3
	for k in 30:
		tt6 += 0.05
		m6.set_motion("stand", tt6 / 3.0, 0.05)
	ref6.set_motion("stand", tt6 / 3.0, 0.0)
	var sw6 := 0.0
	for i in m6.skel.get_bone_count():
		sw6 = maxf(sw6, m6.skel.get_bone_global_pose(i).origin.distance_to(ref6.skel.get_bone_global_pose(i).origin))
	t.ok(sw6 < 1e-3 and is_equal_approx(m6.neck_value(), 0.0), "tripo v6: 走りから立ち姿へ戻すと立ち姿の形に戻り首の補正 0（ずれ %s）" % str(sw6))
	ref6.free()
	m6.mount_jockey(sc.race_info)
	m6.set_motion("race", 0.4, 0.0)
	m6.update_rider(0.4, 1.0, 1.0, 0.0)
	t.ok(m6.rider != null and (m6.rider_hold.global_transform * m6._seat0).distance_to(m6.socket_xf("Saddle").origin) < 1e-3, "tripo v6: 騎手の鞍の上面が Saddle に重なる")
	var fwd6: Vector3 = m6.rider_hold.global_basis.z.normalized()
	t.ok(fwd6.dot(m6.global_basis.z.normalized()) > 0.98 and m6.rider_hold.global_basis.y.normalized().y > 0.98, "tripo v6: 騎手は馬の前（+Z）を向き、上は +Y（%s）" % str(fwd6))
	# ---- v7 ----
	var m7 = sc.tri["v7"]
	var ap7: AnimationPlayer = m7.player
	t.eq(m7.skel.get_bone_count(), 54, "tripo v7: 骨 54 本")
	for c in lens5:
		t.ok(ap7.has_animation(c), "tripo v7: クリップ %s がある" % c)
		if not ap7.has_animation(c):
			continue
		var a7 := ap7.get_animation(c)
		t.ok(absf(a7.length - float(lens5[c])) < 0.002 and a7.loop_mode == Animation.LOOP_LINEAR, "tripo v7: %s は約 %.3f 秒のループ（%.4f）" % [c, lens5[c], a7.length])
		var mx7 := 0
		var comp7 := 0
		for i in a7.get_track_count():
			mx7 = maxi(mx7, a7.track_get_key_count(i))
			if a7.track_is_compressed(i):
				comp7 += 1
		t.ok(mx7 >= int(round(a7.length * 240.0)) and comp7 == 0, "tripo v7: %s は 240 コマのキーを間引かず圧縮しない（1本 %d キー・圧縮 %d）" % [c, mx7, comp7])
		var g7: String = gait5[c]
		m7.set_motion(g7, 0.0, 0.0)
		var q7: Array[Vector3] = []
		for i in m7.skel.get_bone_count():
			q7.append(m7.skel.get_bone_global_pose(i).origin)
		var fin7 := true
		for k in range(1, 49):
			m7.set_motion(g7, k / 48.0, 0.0)
			if not m7.bones_finite():
				fin7 = false
		var dr7 := 0.0
		for i in m7.skel.get_bone_count():
			dr7 = maxf(dr7, m7.skel.get_bone_global_pose(i).origin.distance_to(q7[i]))
		t.ok(fin7 and dr7 < 1e-3, "tripo v7: %s は 1 周で同じ形に戻り骨が有限（ずれ %s）" % [c, str(dr7)])
		# 首の補正 2 つ（名前で読む）：RaceNeckCorrective は v6 と同じ値、WalkNeckCorrective は常歩だけ 1
		m7.set_motion(g7, 0.37, 0.0)
		var rw: float = TripoModel.MORPH_OF.RaceNeckCorrective[g7]
		var ww7: float = TripoModel.MORPH_OF.WalkNeckCorrective[g7]
		t.ok(String(ap7.current_animation) == c and is_equal_approx(m7.morph_value("RaceNeckCorrective"), rw) and is_equal_approx(m7.morph_value("WalkNeckCorrective"), ww7),
			"tripo v7: %s の首の補正 走り %.0f・常歩 %.0f（%.3f・%.3f）" % [c, rw, ww7, m7.morph_value("RaceNeckCorrective"), m7.morph_value("WalkNeckCorrective")])
		t.ok(is_equal_approx(rw, float(morph5[c])), "tripo v7: %s の RaceNeckCorrective は v5・v6 と同じ値" % c)
	t.eq(m7.morph_names().size(), 2, "tripo v7: 首の補正を名前で 2 つ持つ（%s）" % str(m7.morph_names()))
	var gv7 := []
	for vv in [0.0, 1.3, 3.9, 7.5, 16.0]:
		gv7.append(m7.gait_for(vv))
	t.eq(gv7, ["stand", "walk", "trot", "canter", "race"], "tripo v7: 速さで 立ち姿・常歩・速歩・駈歩・走り（v5・v6 と同じ境）")
	t.ok(absf(m7.walk_stride_m() - 1.6) < 1e-4 and absf(m7.gait_stride_m("trot") - 2.8) < 1e-4 and absf(m7.gait_stride_m("canter") - 4.5) < 1e-4 and absf(m7.stride_m() - 7.0) < 1e-4, "tripo v7: 倍率 2.6 の完歩 常歩 1.6・速歩 2.8・駈歩 4.5・襲歩 7m")
	var horse7: MeshInstance3D = null
	var tack7 := true
	var tris7 := 0
	for x in m7.meshes:
		tris7 += x.mesh.surface_get_array_index_len(0) / 3
		if String(x.name) == "Horse":
			horse7 = x
		elif x.material_override != null:
			tack7 = false
	t.ok(tack7 and m7.meshes.size() == 3, "tripo v7: 頭絡は元の材質のまま（%d の形）" % m7.meshes.size())
	t.ok(tris7 <= 19168, "tripo v7: 三角形は v6（19,168）より増えない（%d）" % tris7)
	# 常歩の補正が形に効く：WalkNeckCorrective のブレンドシェイプが首の下の皮を動かす（引き継ぎ：975 頂点・最大 0.087 モデル単位）
	var wk := -1
	for k in horse7.mesh.get_blend_shape_count():
		if String(horse7.mesh.get_blend_shape_name(k)) == "WalkNeckCorrective":
			wk = k
	var wmv := 0
	var wmx := 0.0
	if wk >= 0:
		var base7: PackedVector3Array = horse7.mesh.surface_get_arrays(0)[Mesh.ARRAY_VERTEX]
		var bsv: PackedVector3Array = (horse7.mesh.surface_get_blend_shape_arrays(0)[wk] as Array)[Mesh.ARRAY_VERTEX]
		var rel7: bool = horse7.mesh.blend_shape_mode == Mesh.BLEND_SHAPE_MODE_RELATIVE
		for i in base7.size():
			var d7: float = bsv[i].length() if rel7 else bsv[i].distance_to(base7[i])
			if d7 > 1e-5:
				wmv += 1
			wmx = maxf(wmx, d7)
	t.ok(wmv > 500 and wmx > 0.05 and wmx < 0.12, "tripo v7: 常歩の首の補正が形を動かす（%d 頂点・最大 %.3f モデル単位）" % [wmv, wmx])
	# 歩き方の切り替えで混ざる：常歩→立ち姿の途中は 0〜1 の間、XFADE のあとは両方 0。立ち姿→常歩では 1 に戻る
	m7.set_motion("walk", 0.2, 0.0)
	m7.set_motion("stand", 0.1, 0.05)
	m7.set_motion("stand", 0.1 + 0.05 / 3.0, 0.05)   # 替えた最初のコマはまだ混ぜが始まらない（Godot の AnimationPlayer）ので、次のコマで見る
	var mid7: float = m7.morph_value("WalkNeckCorrective")
	for k in 6:
		m7.set_motion("stand", 0.1 + (k + 2) * 0.05 / 3.0, 0.05)
	var end7: float = m7.morph_value("WalkNeckCorrective")
	var endr7: float = m7.morph_value("RaceNeckCorrective")
	for k in 6:
		m7.set_motion("walk", 0.3 + k * 0.05 / 1.2, 0.05)
	var back7: float = m7.morph_value("WalkNeckCorrective")
	t.ok(mid7 > 0.05 and mid7 < 0.95 and absf(end7) < 1e-4 and absf(endr7) < 1e-4 and absf(back7 - 1.0) < 1e-4,
		"tripo v7: 常歩↔立ち姿の切り替えで常歩の補正が混ざり（途中 %.2f）、立ち姿で両方 0（%.3f・%.3f）、常歩で 1（%.3f）" % [mid7, end7, endr7, back7])
	var sm7: ShaderMaterial = horse7.material_override if horse7 != null else null
	t.ok(sm7 != null and sm7.shader.resource_path.ends_with("v7/coat.gdshader"), "tripo v7: 毛色は v7/coat.gdshader")
	if sm7 != null:
		var code7 := sm7.shader.code
		t.ok(code7.contains("dot(NORMAL, geometric_normal) < 0.15") and code7.contains("mix(body, muzzle_color.rgb, region_blend)") and code7.contains("mix(body, mane_color.rgb, region_blend)"), "tripo v7: v6 までの補正（法線・鼻先とたてがみの根元の混ぜ）がある")
		t.ok(code7.contains("float face_gate = COLOR.a * smoothstep(0.003, 0.014, -face_front);") and code7.contains("float mouth_aa = max(fwidth(face_u) * 0.70, 0.0003);")
			and code7.contains("if (region != 1 && region != 5 && region != 7) color = mix(color, muzzle_color.rgb, facial_crease);") and not code7.contains("ALBEDO = COLOR") and not code7.contains("color *= COLOR"),
			"tripo v7: 付属の差分（COLOR_0 の頭の座標から鼻の穴と口の線。COLOR を色として掛けない）がある")
		var un7 := []
		for u in sm7.shader.get_shader_uniform_list():
			un7.append(String(u.name))
		t.ok(un7.has("muzzle_color") and un7.has("coat_color") and un7.has("sock_heights") and un7.has("normal_texture"), "tripo v7: シェーダが読める（uniform %d 個）" % un7.size())
		t.ok(absf(float(sm7.get_shader_parameter("normal_strength")) - 0.03) < 1e-3 and sm7.get_shader_parameter("has_normal_map") == true, "tripo v7: 法線の絵は GLB の中の絵を強さ 0.03 で使う（%s）" % str(sm7.get_shader_parameter("normal_strength")))
		m7.set_coat({"coatLook": UiArt.coat_look("芦毛", 7.0)})
		t.ok((sm7.get_shader_parameter("coat_color") as Color).is_equal_approx(Color.html(String(UiArt.coat_look("芦毛", 7.0).body))), "tripo v7: 毛色の表（UiArt.coat_look）の色を渡す")
		var arr7 := horse7.mesh.surface_get_arrays(0)
		var uv7 = arr7[Mesh.ARRAY_TEX_UV2]
		t.ok(uv7 != null and (uv7 as PackedVector2Array).size() == (arr7[Mesh.ARRAY_VERTEX] as PackedVector3Array).size(), "tripo v7: UV2 が全部の頂点にある（ライトマップ用に作り直していない）")
		var rg7 := {}
		var lg7 := {}
		for uv in uv7:
			rg7[int(floor(uv.x * 8.0))] = true
			lg7[int(floor(uv.y * 8.0))] = true
		t.ok(rg7.size() == 8 and lg7.size() == 5, "tripo v7: UV2 の領域 8・脚の番号 5（v5・v6 と同じ決まり）")
		# COLOR_0：頭の座標。a＝1 は頭の皮だけ（脚・尾・蹄には無い）、r（左右）は 0.5 のまわりに両側へ
		var col7 = arr7[Mesh.ARRAY_COLOR]
		var head7 := 0
		var off7 := 0
		var rl7 := 1.0
		var rh7 := 0.0
		if col7 != null:
			for i in (col7 as PackedColorArray).size():
				var cc: Color = col7[i]
				if cc.a > 0.5:
					head7 += 1
					rl7 = minf(rl7, cc.r); rh7 = maxf(rh7, cc.r)
					var rgi := int(floor(uv7[i].x * 8.0))
					if int(floor(uv7[i].y * 8.0)) != 0 or rgi == 2 or rgi == 3:
						off7 += 1
		t.ok(col7 != null and head7 > 300 and off7 == 0 and rl7 < 0.3 and rh7 > 0.7, "tripo v7: 取り込んだあとも COLOR_0（頭の座標）が残る（頭 %d 頂点・脚と尾に %d・左右 %.2f〜%.2f）" % [head7, off7, rl7, rh7])
		t.ok(RenderingServer.mesh_get_surface(horse7.mesh.get_rid(), 0).get("lods", []).size() > 0, "tripo v7: LOD がある（.import の generate_lods）")
	# import の設定（.import を読み直す）：ライトマップ用の UV を作らない・240 コマ・定数の軌跡を残す・LOD・AnimationPlayer の optimizer と compression を切る・5つのループ・法線の絵は GLB の中
	var cf7 := ConfigFile.new()
	t.eq(cf7.load("res://proto/tripo_horse/v7/horse-gallop-v7.glb.import"), OK, "tripo v7: .import が読める")
	var sub7: Dictionary = cf7.get_value("params", "_subresources", {})
	var apn7: Dictionary = sub7.get("nodes", {}).get("PATH:AnimationPlayer", {})
	var loops7 := 0
	for c in lens5:
		if int(sub7.get("animations", {}).get(c, {}).get("settings/loop_mode", 0)) == 1:
			loops7 += 1
	t.ok(int(cf7.get_value("params", "meshes/light_baking", -1)) == 0 and int(cf7.get_value("params", "animation/fps", 0)) == 240
		and cf7.get_value("params", "animation/remove_immutable_tracks", true) == false and cf7.get_value("params", "meshes/generate_lods", false) == true
		and apn7.get("optimizer/enabled", true) == false and apn7.get("compression/enabled", true) == false and loops7 == 5
		and int(cf7.get_value("params", "gltf/embedded_image_handling", -1)) == 3,
		"tripo v7: import の設定（ライトマップ UV なし・240 コマ・定数の軌跡を残す・LOD・optimizer と compression なし・5つのループ %d・法線の絵は GLB の中）" % loops7)
	# 取付点：v7 の attachment-tracks.json（全5動作・6点。v7/attachment-check.json はその間引き。走りは saddle-track.json と同じ 28 時点）
	var ac7 = JSON.parse_string(FileAccess.get_file_as_string("res://proto/tripo_horse/v7/attachment-check.json"))
	var err7 := {}
	var ang7 := 0.0
	var ns7 := 0
	if ac7 is Dictionary:
		for c in ac7.clips:
			var g := String(gait5.get(c, ""))
			var du := float(ac7.clips[c].duration)
			for smp in ac7.clips[c].samples:
				m7.set_motion(g, float(smp.t) / du, 0.0)
				var inv7: Transform3D = m7.glb.global_transform.affine_inverse()
				for n in smp.nodes:
					var x7: Transform3D = inv7 * m7.socket_xf(String(n))
					var pp: Array = smp.nodes[n].p
					var qq: Array = smp.nodes[n].q
					err7[c] = maxf(float(err7.get(c, 0.0)), x7.origin.distance_to(Vector3(pp[0], pp[1], pp[2])) * 2.6)
					ang7 = maxf(ang7, x7.basis.orthonormalized().get_rotation_quaternion().angle_to(Quaternion(qq[0], qq[1], qq[2], qq[3])))
				ns7 += 1
	var emax7 := 0.0
	for c in err7:
		emax7 = maxf(emax7, err7[c])
	t.ok(err7.size() == 5 and ns7 >= 70 and emax7 < 0.002 and ang7 < 0.01, "tripo v7: 取付点 6 つが v7 の記録に合う（5 動作・%d 時点・最大 %.4fm・2mm まで・向き %.4f rad）" % [ns7, emax7, ang7])
	# 走りの数：き甲の上下（v6 と同じ）・うなじの上下（v6 の 0.28m を保つ）・胴のピッチ（Spine_0→Spine_7。v6 の約 1.6° から大きく）
	var nape7: int = m7.skel.find_bone("tripo__Head_5")
	var sp0: int = m7.skel.find_bone("tripo__Spine_0")
	var sp7: int = m7.skel.find_bone("tripo__Spine_7")
	var wl7 := 1e9
	var wh7 := -1e9
	var nl7 := 1e9
	var nh7 := -1e9
	var pl7 := 1e9
	var ph7 := -1e9
	for k in 96:
		m7.set_motion("race", k / 96.0, 0.0)
		var wy7: float = m7.socket_xf("Withers").origin.y
		wl7 = minf(wl7, wy7); wh7 = maxf(wh7, wy7)
		var ny7: float = (m7.skel.global_transform * m7.skel.get_bone_global_pose(nape7).origin).y
		nl7 = minf(nl7, ny7); nh7 = maxf(nh7, ny7)
		var dv7: Vector3 = m7.skel.global_transform * m7.skel.get_bone_global_pose(sp7).origin - m7.skel.global_transform * m7.skel.get_bone_global_pose(sp0).origin
		var pa7 := rad_to_deg(atan2(dv7.y, Vector2(dv7.x, dv7.z).length()))
		pl7 = minf(pl7, pa7); ph7 = maxf(ph7, pa7)
	t.ok(wh7 - wl7 > 0.13 and wh7 - wl7 < 0.17, "tripo v7: き甲が 0.13〜0.17m 上下する（v6 と同じ。%.3f）" % (wh7 - wl7))
	t.ok(nh7 - nl7 > 0.2 and nh7 - nl7 < 0.35, "tripo v7: 走るとうなじが 0.20〜0.35m 上下する（v6 の首の振りを保つ。%.3f）" % (nh7 - nl7))
	t.ok(ph7 - pl7 > 5.0, "tripo v7: 走ると胴が前後に揺れる（背の骨のピッチの幅 %.1f°。v6 は約 1.6°）" % (ph7 - pl7))
	var ref7 = TripoModel.new()
	sc.add_child(ref7)
	ref7.setup("v7")
	m7.set_motion("race", 0.5, 0.0)
	var tt7 := 0.3
	for k in 30:
		tt7 += 0.05
		m7.set_motion("stand", tt7 / 3.0, 0.05)
	ref7.set_motion("stand", tt7 / 3.0, 0.0)
	var sw7 := 0.0
	for i in m7.skel.get_bone_count():
		sw7 = maxf(sw7, m7.skel.get_bone_global_pose(i).origin.distance_to(ref7.skel.get_bone_global_pose(i).origin))
	t.ok(sw7 < 1e-3 and is_equal_approx(m7.morph_value("RaceNeckCorrective"), 0.0) and is_equal_approx(m7.morph_value("WalkNeckCorrective"), 0.0), "tripo v7: 走りから立ち姿へ戻すと立ち姿の形に戻り首の補正は両方 0（ずれ %s）" % str(sw7))
	ref7.free()
	m7.mount_jockey(sc.race_info)
	for gg in ["race", "walk"]:
		m7.set_motion(gg, 0.4, 0.0)
		m7.update_rider(0.4, 1.0 if gg == "race" else 0.35, 1.0, 0.0 if gg == "race" else 1.0)
		var fwd7: Vector3 = m7.rider_hold.global_basis.z.normalized()
		t.ok(m7.rider != null and (m7.rider_hold.global_transform * m7._seat0).distance_to(m7.socket_xf("Saddle").origin) < 1e-3 and fwd7.dot(m7.global_basis.z.normalized()) > 0.98 and m7.rider_hold.global_basis.y.normalized().y > 0.95,
			"tripo v7: %s で騎手の鞍の上面が Saddle に重なり、前（+Z）・上（+Y）を向く（%s）" % [gg, str(fwd7)])
	sc.free()
	# ---- レース画面の差し替え（--proto-horse=v6） ----
	var rv6 = load("res://scenes/race.tscn").instantiate()
	rv6.proto_ver = "v6"
	t.root.add_child(rv6)
	rv6.set_process(false)
	var riders6 := 0
	var shader6 := 0
	for p in rv6.proto:
		if p.rider != null:
			riders6 += 1
		if p.coat != null and p.coat.shader.resource_path.ends_with("v6/coat.gdshader"):
			shader6 += 1
	t.ok(rv6.proto.size() == rv6.horses.size() and riders6 == rv6.horses.size() and shader6 == rv6.horses.size(), "tripo race v6: 全部の馬が v6 に替わり騎手が乗り v6 の毛色（%d・%d・%d 頭）" % [rv6.proto.size(), riders6, shader6])
	rv6._jump_to(-1.0)
	t.eq(String(rv6.proto[0].player.current_animation), "Stand", "tripo race v6: ゲートの中は立ち姿")
	rv6._jump_to(8.0)
	var me6: int = rv6.me
	var x6: float = rv6._last_H[me6][0] if rv6._last_H.size() > me6 else -1.0
	var want6 := fposmod((x6 / 7.0 + rv6.horses[me6].num * 0.137), 1.0) * 0.45
	var got6: float = rv6.proto[me6].player.current_animation_position
	t.ok(String(rv6.proto[me6].player.current_animation) == "RaceGallop" and absf(got6 - want6) < 1e-3, "tripo race v6: 走りの位相は 距離÷7m（%.3f・%.3f 秒）" % [got6, want6])
	var fin6r := true
	for p in rv6.proto:
		if not p.bones_finite():
			fin6r = false
	t.ok(fin6r, "tripo race v6: 走ったあとも全部の骨が有限")
	rv6.free()
	# ---- レース画面の差し替え（--proto-horse=v7） ----
	var rv7 = load("res://scenes/race.tscn").instantiate()
	rv7.proto_ver = "v7"
	t.root.add_child(rv7)
	rv7.set_process(false)
	var riders7 := 0
	var shader7 := 0
	for p in rv7.proto:
		if p.rider != null:
			riders7 += 1
		if p.coat != null and p.coat.shader.resource_path.ends_with("v7/coat.gdshader"):
			shader7 += 1
	t.ok(rv7.proto.size() == rv7.horses.size() and riders7 == rv7.horses.size() and shader7 == rv7.horses.size(), "tripo race v7: 全部の馬が v7 に替わり騎手が乗り v7 の毛色（%d・%d・%d 頭）" % [rv7.proto.size(), riders7, shader7])
	rv7._jump_to(-1.0)
	t.eq(String(rv7.proto[0].player.current_animation), "Stand", "tripo race v7: ゲートの中は立ち姿")
	rv7._jump_to(8.0)
	var me7: int = rv7.me
	var x7: float = rv7._last_H[me7][0] if rv7._last_H.size() > me7 else -1.0
	var want7 := fposmod((x7 / 7.0 + rv7.horses[me7].num * 0.137), 1.0) * 0.45
	var got7: float = rv7.proto[me7].player.current_animation_position
	t.ok(String(rv7.proto[me7].player.current_animation) == "RaceGallop" and absf(got7 - want7) < 1e-3, "tripo race v7: 走りの位相は 距離÷7m（%.3f・%.3f 秒）" % [got7, want7])
	var fin7r := true
	for p in rv7.proto:
		if not p.bones_finite():
			fin7r = false
	t.ok(fin7r, "tripo race v7: 走ったあとも全部の骨が有限")
	rv7.free()
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
	# ---- レース画面の差し替え（--proto-horse=v5） ----
	var rv5 = load("res://scenes/race.tscn").instantiate()
	rv5.proto_ver = "v5"
	t.root.add_child(rv5)
	rv5.set_process(false)
	t.eq(rv5.proto.size(), rv5.horses.size(), "tripo race v5: 全部の馬が試作 v5 に替わる（%d 頭）" % rv5.horses.size())
	var riders5 := 0
	var shader5 := 0
	for p in rv5.proto:
		if p.rider != null:
			riders5 += 1
		if p.coat != null and p.coat.shader.resource_path.ends_with("v5/coat.gdshader"):
			shader5 += 1
	t.eq(riders5, rv5.horses.size(), "tripo race v5: 全部の v5 に騎手が乗る")
	t.eq(shader5, rv5.horses.size(), "tripo race v5: 全部の v5 が v5 の毛色のシェーダ")
	rv5._jump_to(-1.0)
	t.eq(String(rv5.proto[0].player.current_animation), "Stand", "tripo race v5: ゲートの中は立ち姿")
	rv5._jump_to(8.0)
	var me5: int = rv5.me
	var x5: float = rv5._last_H[me5][0] if rv5._last_H.size() > me5 else -1.0
	var want5 := fposmod((x5 / 7.0 + rv5.horses[me5].num * 0.137), 1.0) * 0.45
	var got5: float = rv5.proto[me5].player.current_animation_position
	t.ok(String(rv5.proto[me5].player.current_animation) == "RaceGallop" and absf(got5 - want5) < 1e-3, "tripo race v5: 走りの位相は 距離÷7m（%.3f・%.3f 秒）" % [got5, want5])
	rv5.free()
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
