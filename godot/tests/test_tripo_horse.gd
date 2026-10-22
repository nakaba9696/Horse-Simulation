# 馬モデル試作 v2（godot/proto/tripo_horse/。ゲームからは呼ばない独立した場面）
# - 場面が読み込める・骨 54 本・クリップ Gallop（0.8 秒・LOOP_LINEAR）
# - 3 周まわして全部の骨の位置が有限・脚が動く・1 周ごとに同じ形に戻る
# - 向き：頭が +Z（ゲームの前）・左の脚が +X（ゲームの馬の左）。移動は親（rig）で、接地の再生では 速さ＝基準の速さ×倍率×再生の倍率
extends RefCounted

func run(t) -> void:
	var ps = load("res://proto/tripo_horse/tripo_horse.tscn")
	t.ok(ps != null, "tripo: 試作の場面が読み込める")
	if ps == null:
		return
	var sc = ps.instantiate()
	t.root.add_child(sc)
	var sk: Skeleton3D = sc.skel
	var ap: AnimationPlayer = sc.player
	t.eq(sk.get_bone_count(), 54, "tripo: 骨 54 本")
	t.eq(String(sc.clip), "Gallop", "tripo: クリップの名前は Gallop")
	var an := ap.get_animation(sc.clip)
	t.eq(an.loop_mode, Animation.LOOP_LINEAR, "tripo: クリップはループ（LOOP_LINEAR）")
	t.ok(is_equal_approx(an.length, 0.8), "tripo: クリップは 0.8 秒")
	# 向き（立ち姿のときの骨の位置。世界の座標）
	var head := -1
	var lfore := -1
	var hips := -1
	for i in sk.get_bone_count():
		var n := sk.get_bone_name(i)
		if n.ends_with("Head_8"): head = i
		if n.ends_with("0_Left_Limb_4"): lfore = i
		if n.ends_with("Root"): hips = i
	t.ok(head >= 0 and lfore >= 0 and hips >= 0, "tripo: 頭・左前脚・根の骨が名前の末尾で引ける")
	if head < 0 or lfore < 0 or hips < 0:
		sc.free()
		return
	var g := func(b: int) -> Vector3: return sk.global_transform * sk.get_bone_global_pose(b).origin
	sc.step(0.0)
	t.ok(g.call(head).z > g.call(hips).z + 0.5, "tripo: 頭が +Z（前）")
	t.ok(g.call(lfore).x > g.call(hips).x, "tripo: 左の脚が +X（馬の左）")
	# 3 周（1 周 96 刻み）をクリップのループで回す
	ap.play(sc.clip)
	ap.seek(0.0, true)
	var first: Array[Vector3] = []
	for i in sk.get_bone_count():
		first.append(sk.get_bone_global_pose(i).origin)
	var finite := true
	var leg := 0.0
	var drift := 0.0
	for s in range(1, 3 * 96 + 1):
		ap.advance(0.8 / 96.0)
		for i in sk.get_bone_count():
			var p := sk.get_bone_global_pose(i).origin
			if not p.is_finite():
				finite = false
		leg = maxf(leg, sk.get_bone_global_pose(lfore).origin.distance_to(first[lfore]))
		if s % 96 == 0:
			for i in sk.get_bone_count():
				drift = maxf(drift, sk.get_bone_global_pose(i).origin.distance_to(first[i]))
	t.ok(finite, "tripo: 3 周のあいだ全部の骨の位置が有限")
	t.ok(leg > 0.05, "tripo: 前脚が動く（%.3f モデル単位）" % leg)
	t.ok(drift < 1e-4, "tripo: 1 周ごとに同じ形に戻る（ずれ %s）" % str(drift))
	ap.pause()
	# 移動は親。接地の再生では 速さ＝BASE_V×SCALE×再生の倍率
	sc.mode = "slip"
	sc.v = 16.0
	var z0: float = sc.rig.position.z
	sc.step(0.5)
	t.ok(is_equal_approx(sc.rig.position.z - z0, 8.0), "tripo: 親が 16 m/秒で前（+Z）へ動く")
	t.ok(is_equal_approx(sc.anim_rate() * sc.BASE_V * sc.SCALE, 16.0), "tripo: 接地の再生の倍率は 速さ÷（基準の速さ×倍率）")
	sc.free()
