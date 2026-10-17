# 週の流れ（godot/ui/flow.gd の UiFlow と画面）の確かめ：決まった種の新しいゲームから数週を進める。
# 毎週：店で馬を買う・馬主の依頼を受ける・今週の騎乗を出走表の一式（desc_of）→ 模擬の入れ口（ViewLive）で決まった乗り方で走る（1鞍おきにおまかせ）
# → 週を締める（UiFlow.close_week）。週が1つ進むこと・乗ったレースが結果に入ること・セーブの往復で同じ状態に戻ること・画面を組めることを見る
extends RefCounted

const WEEKS := 6

func run(t) -> void:
	var t0 := Time.get_ticks_msec()
	var era0 = HSU.ERA   # 世界の設定（年代なし）は、あとのテスト（模擬の一致）に残さない
	UiFlow.save_path = "user://test_flow_save.json"
	UiFlow.demo(0, 7.0)
	UiFlow.no_save = false
	var rode := 0
	var autos := 0
	for wk in WEEKS:
		var G = HSWorld.G
		var w0 := HSWorld.w_idx()
		UiFlow.buy_cheapest(3)
		var offers := HSOwners.offers()
		if offers.size():
			t.eq(HSOwners.accept(offers[0].raceKey, offers[0].horseId), null, "flow: 依頼を受ける（%d週目）" % wk)
		var want := HSJockey.my_rides().size()
		var nxt := UiFlow.begin_week()
		t.eq(UiFlow.rides.size(), want, "flow: 騎乗の列は今週の騎乗と同じ数（%d週目）" % wk)
		var k := 0
		while nxt == "card":
			var cur = UiFlow.current()
			var d := UiFlow.desc_of(cur.card)
			UiFlow.desc = d
			t.eq(d.horses.size(), cur.card.runners.size(), "flow: 出走表の一式の頭数")
			t.ok(bool(d.horses[d.me].mine) and String(d.horses[d.me].id) == String(cur.runner.horse.id), "flow: 自分の馬の印")
			t.ok(d.track.pts.size() > 5 * 100, "flow: コースの形（1m ごと）")
			if (wk + k) % 2 == 0:
				var L := ViewLive.new("", d)
				var res := _ride(L)
				t.ok(res.has("results") and res.results.size() == d.horses.size(), "flow: 乗ったレースの結果")
				nxt = UiFlow.ride_done(res)
				rode += 1
			else:
				nxt = UiFlow.ride_done(null)
				autos += 1
			k += 1
		t.eq(nxt, "result", "flow: 騎乗のあとは週の結果")
		t.ok(UiFlow.report != null and HSWorld.w_idx() == w0 + 1, "flow: 週が1つ進む（%d週目）" % wk)
		for r in UiFlow.report.races:
			if UiFlow.ridden.get(r.race.key) == "ride":
				t.ok(r.ridden, "flow: 自分で乗ったレースは結果に「乗った」と入る")
		# セーブの往復
		var s1 := HSData.digest_save(HSJson.parse(HSWorld.serialize()))
		t.ok(UiFlow.load_game(), "flow: セーブを読む")
		t.eq(HSData.digest_save(HSJson.parse(HSWorld.serialize())), s1, "flow: セーブの往復で同じ状態（%d週目）" % wk)
		t.ok(not UiFlow.save_info().is_empty(), "flow: タイトルに出すセーブの要点")
	t.ok(rode > 0 and autos > 0, "flow: 自分で乗った鞍とおまかせの鞍がある（%d・%d）" % [rode, autos])
	# 画面を組めるか（ホーム・番組表・店・週の結果・タイトル）
	UiFlow.report = HSWorld.finish_week({})
	UiFlow.program_id = HSWorld.mine()[0].id if HSWorld.mine().size() else ""
	for n in ["home", "program", "shop", "week_result", "title"]:
		var sc = load("res://scenes/%s.tscn" % n).instantiate()
		t.root.add_child(sc)
		var ok: bool = sc.get_child_count() > 3
		if n == "home": ok = ok and sc.b_main != null and sc.b_main.text != ""
		if n == "program": ok = ok and sc.rows.size() > 0
		if n == "shop": ok = ok and sc.rows.size() > 0
		if n == "week_result": ok = ok and sc.b_next != null
		t.ok(ok, "flow: 画面を組める（%s）" % n)
		sc.free()
	DirAccess.remove_absolute(ProjectSettings.globalize_path(UiFlow.save_path))
	UiFlow.save_path = "user://save.json"
	HSU.ERA = era0
	HSWorld.G = null
	UiFlow._reset_week()
	UiFlow.no_save = false
	print("    flow: %d 週・自分で %d 鞍・おまかせ %d 鞍 %.1f 秒" % [WEEKS, rode, autos, (Time.get_ticks_msec() - t0) / 1000.0])

# 決まった乗り方（test_world.gd と同じ型）：出たらすぐしごき、直線の手前から追い、残り 250m でムチ、詰まったら外へ
func _ride(L: ViewLive) -> Dictionary:
	var t := 0.0
	var nxt := 0.0
	L.ctl("up")
	while L.order.size() == 0 and t < 600.0:
		t += 0.1
		var sim = L.sim
		if not sim.over:
			var s = sim.st[sim.me]
			var R: float = sim.D - s.x
			if R < sim.straight + 350 and sim.ctl.gear < 1 and sim.t >= nxt:
				L.ctl("up"); nxt = sim.t + 0.2
			if R < 250 and sim.t >= nxt + 0.3:
				L.ctl("whip", "R"); nxt = sim.t + 0.3
			if sim.ctl.blockedNow and sim.ctl.lane < 4:
				L.ctl("lane", 1)
		L.advance_to(t)
	L.finish_now()
	return L.result
