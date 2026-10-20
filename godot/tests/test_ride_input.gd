# 騎乗の入力の向き（持ち主の指摘 2026-10-20「左右の動きが反対」「L2・R2 のカメラが速すぎ、角度もおかしい」）
# ・進路の左右：右回り・左回りのどちらでも、直線でもコーナーでも、右へ押すとカメラ（JOCKEY CAM）から見て右へ動く
# ・左右を見る：押している間だけ 0.3 秒でなめらかに振り向き（真横よりやや後ろ）、離すと同じ速さで戻る
extends RefCounted

func run(t) -> void:
	for sg in [-1.0, 1.0]:
		var tr := ViewTrack.new({"lap": 1800.0, "a": 500.0, "r": 120.0, "straight": 400.0, "sign": sg})
		var bad := 0
		var n := 0
		var s := 10.0
		while s < 1800.0:
			var f := tr.frame(s)
			var fwd := tr.fwd3(f)
			var out := tr.out3(f)
			var cam := Basis.looking_at(fwd, Vector3.UP)   # 騎乗のカメラ：馬の真後ろから進む向きを見る。cam.x が画面の右
			for screen in [-1, 1]:
				var d := ViewRideInput.lane_step(screen, ViewRideInput.out_is_right(fwd, out))
				var moved: Vector3 = out * float(d)
				if signf(moved.dot(cam.x)) != float(screen):
					bad += 1
				n += 1
			s += 37.0
		var name := "左回り" if sg < 0.0 else "右回り"
		t.eq(bad, 0, "入力: %s で、押した左右とカメラから見た動く向きが違う所（%d のうち）" % [name, n])
		# 外が画面のどちらか：左回りは外が右（右へ押すと外へ）、右回りは外が左（右へ押すと内へ）
		var f0 := tr.frame(200.0)
		t.eq(ViewRideInput.lane_step(1, ViewRideInput.out_is_right(tr.fwd3(f0), tr.out3(f0))), 1 if sg < 0.0 else -1, "入力: %s で右へ押したときの進路の向き" % name)
	# 左右を見る：0.3 秒で振り向ききり、半分の所は途中、離すと戻る
	var lt := 0.0
	var dt := 1.0 / 60.0
	for i in 9:
		lt = ViewRideInput.look_step(lt, 1.0, dt)
	var mid := ViewRideInput.look_ease(lt)
	t.ok(mid > 0.2 and mid < 0.8, "入力: 左右を見る：0.15 秒では途中（%.2f）" % mid)
	for i in 9:
		lt = ViewRideInput.look_step(lt, 1.0, dt)
	t.ok(absf(ViewRideInput.look_ease(lt) - 1.0) < 1e-6, "入力: 左右を見る：0.3 秒で振り向ききる")
	for i in 18:
		lt = ViewRideInput.look_step(lt, 0.0, dt)
	t.ok(absf(ViewRideInput.look_ease(lt)) < 1e-6, "入力: 左右を見る：離して 0.3 秒で前へ戻る")
	for i in 6:
		lt = ViewRideInput.look_step(lt, -1.0, dt)
	t.ok(ViewRideInput.look_ease(lt) < 0.0, "入力: 左を見ると負")
	t.ok(ViewRideInput.LOOK_YAW > PI / 2.0 and ViewRideInput.LOOK_YAW < 2.2, "入力: 振り向く角度は真横よりやや後ろ（%.2f rad）" % ViewRideInput.LOOK_YAW)
	# 入りと終わりがなめらか（出だしの変化が小さい）
	t.ok(ViewRideInput.look_ease(0.1) < 0.05, "入力: 振り向きの出だしがなめらか")
