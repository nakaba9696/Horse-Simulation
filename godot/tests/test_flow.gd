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
	UiFlow.replay_dir = "user://test_flow_replays"   # demo のあとで替える（demo は見本の置き場所にする）
	for f in DirAccess.get_files_at(UiFlow.replay_dir) if DirAccess.dir_exists_absolute(UiFlow.replay_dir) else []:
		DirAccess.remove_absolute(ProjectSettings.globalize_path(UiFlow.replay_dir.path_join(f)))
	UiFlow.no_save = false
	var rode := 0
	var autos := 0
	var own_rode := false   # 自分の馬（店で買った馬）に1度は自分で乗る（戦績からリプレイを開く確かめのため。レースが OP 以上だけになって、買った馬の出走が少ない週がある）
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
			var own: bool = cur.runner.horse.get("owner") == "P"
			if (wk + k) % 2 == 0 or (own and not own_rode):
				own_rode = own_rode or own
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
	# リプレイ：自分で乗ったレースが残り、記録の再生（ViewReplay）で読める
	var rl := UiFlow.replay_list()
	t.eq(rl.size(), rode, "flow: 自分で乗った鞍の数だけリプレイが残る")
	if rl.size():
		var rp := ViewReplay.new(UiFlow.replay_dir.path_join(String(rl[0].id) + ".json"))
		t.ok(rp.n > 4 and rp.order.size() == rp.n and rp.end_t() > 30.0, "flow: リプレイを再生の入れ口で読める（%d頭・%.0f秒）" % [rp.n, rp.end_t()])
		var m0 := rp.me_at(5.0)
		var m1 := rp.me_at(rp.end_t() - 10.0)
		t.ok(m0.has("fight") and float(m1.E) < float(m0.E), "flow: リプレイに自分の馬の値が残る（脚の残り %.2f → %.2f）" % [m0.E, m1.E])
		t.ok(rp.whips.size() > 0, "flow: リプレイにムチが残る（%d回）" % rp.whips.size())
		t.ok(UiFlow.replay_fav(String(rl[0].id)) and UiFlow.replay_list()[0].fav, "flow: リプレイをお気に入りにできる")
	# 引退（牧場に残る）→ オリジナルホース（父と母から仔を作る）
	var G = HSWorld.G
	G.player.money = 1e9
	var male = null
	var female = null
	for it in HSU.stable_sort(HSWorld.market_historic(), func(a, b): return a.price < b.price):
		if female == null and it.horse.sex == "牝":
			t.eq(HSWorld.buy(it), null, "flow: 牝馬を買う")
			female = it.horse.name
	for h in HSWorld.mine():
		if h.sex == "牝" and h.name == female: female = h
		elif h.sex != "牝" and male == null: male = h
	t.ok(male is Dictionary and female is Dictionary, "flow: 牡馬と牝馬がいる")
	t.eq(HSJockey.retire(male.id).get("to"), "retired", "flow: 牡馬を引退させると牧場に残る")
	t.eq(HSJockey.retire(female.id).get("to"), "retired", "flow: 牝馬を引退させると牧場に残る")
	t.eq(HSOriginal.retired("牡").size() + HSOriginal.retired("牝").size(), 2, "flow: 牧場の馬（父と母）")
	var made := HSOriginal.make(male.id, female.id, "テストノホシ")
	t.ok(made.has("horse") and made.horse.name == "テストノホシ" and made.horse.get("original"), "flow: オリジナルホースが生まれる")
	t.ok(HSOriginal.make(male.id, female.id, "").has("err"), "flow: 牝馬は1年に1頭")
	# 出走の優先順：オープンは獲得賞金の順（乱数は1回引く。レースは OP 以上だけで、クラスの差は無い）
	var r1 := HSRng.new(5.0)
	var r2 := HSRng.new(5.0)
	var pr := HSRaces.priority(made.horse, {"graded": false, "cls": "OP", "name": "2歳オープン"}, G.year, r1)
	var pr2 := float(HSU.or_(made.horse.get("earn"), 0.0)) + r2.next() * 500.0
	t.ok(pr == pr2 and r1.next() == r2.next(), "flow: オープンの優先順は獲得賞金の順（乱数は1回）")
	# 画面を組めるか（ホーム・番組表・店・週の結果・タイトル・厩舎・生産・データ・馬主・GF）
	UiFlow.report = HSWorld.finish_week({})
	UiFlow.program_id = HSWorld.mine()[0].id if HSWorld.mine().size() else ""
	for n in ["home", "program", "shop", "week_result", "title", "stable", "horse", "breed", "data", "owners", "gf"]:
		var sc = load("res://scenes/%s.tscn" % n).instantiate()
		t.root.add_child(sc)
		var ok: bool = sc.get_child_count() > 3
		if n == "home": ok = ok and sc.b_main != null and sc.b_main.text != ""
		if n == "program": ok = ok and sc.rows.size() > 0
		if n == "shop": ok = ok and sc.rows.size() > 0
		if n == "week_result": ok = ok and sc.b_next != null
		if n == "stable": ok = ok and sc.rows.size() > 0
		if n == "horse":
			for k in sc.TABS.size():
				sc.on_tab(1)
			ok = ok and not sc.h.is_empty() and sc.b_prog != null
		if n == "breed": ok = ok and sc.rows.size() == 2
		if n == "data":
			for k in sc.TABS.size():
				sc.on_tab(1)
			ok = ok and sc.rows.size() > 0
		if n == "owners": ok = ok and sc.rows.size() == HSOwners.LIST().size()
		if n == "gf": ok = ok and sc.rows.size() > 0
		t.ok(ok, "flow: 画面を組める（%s）" % n)
		sc.free()
	_shop(t)
	_horse(t)
	DirAccess.remove_absolute(ProjectSettings.globalize_path(UiFlow.save_path))
	UiFlow.save_path = "user://save.json"
	for f in DirAccess.get_files_at(UiFlow.replay_dir):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(UiFlow.replay_dir.path_join(f)))
	UiFlow.replay_dir = "user://replays"
	HSU.ERA = era0
	HSWorld.G = null
	UiFlow._reset_week()
	UiFlow.no_save = false
	print("    flow: %d 週・自分で %d 鞍・おまかせ %d 鞍 %.1f 秒" % [WEEKS, rode, autos, (Time.get_ticks_msec() - t0) / 1000.0])

# 馬の店（持ち主の仕様書「クリックですぐ購入にしない」）：行を押すと詳しい小窓、「買う」で確かめ、確かめの「買う」で買う。
# 見える総合力はいまの値（HSEraless.shop_fh）
func _shop(t) -> void:
	var G = HSWorld.G
	G.player.money = 1e9
	var sc = load("res://scenes/shop.tscn").instantiate()
	t.root.add_child(sc)
	var wi := HSWorld.w_idx()
	var cur_ok := true
	for x in sc.items:
		var f := HSEraless.shop_fh(x.it.horse, wi)
		if float(x.fh.turf) != float(f.turf) or float(x.fh.dirt) != float(f.dirt): cur_ok = false
	t.ok(cur_ok and sc.items.size() > 0, "shop: 一覧の総合力はいまの値")
	var n0 := HSWorld.mine().size()
	var m0 := float(G.player.money)
	sc.rows[0].pressed.emit()
	t.ok(sc._modal != null and sc.detail_buy != null and HSWorld.mine().size() == n0 and float(G.player.money) == m0, "shop: 行を押してもすぐには買わない（詳しい小窓が開く）")
	sc.detail_buy.pressed.emit()
	t.ok(sc._modal != null and sc.confirm_no != null and HSWorld.mine().size() == n0, "shop: 「買う」で確かめが出る（まだ買わない）")
	sc.confirm_no.pressed.emit()
	t.ok(sc._modal != null and sc.detail_buy != null and HSWorld.mine().size() == n0, "shop: 確かめで「やめる」と詳しい小窓に戻る（買わない）")
	var price := float(sc.shown[sc.detail_i].it.price)
	var name := String(sc.shown[sc.detail_i].it.horse.name)
	sc.detail_buy.pressed.emit()
	sc.confirm_ok.pressed.emit()
	t.ok(HSWorld.mine().size() == n0 + 1 and float(G.player.money) == m0 - price and HSWorld.mine().any(func(h): return h.name == name), "shop: 確かめの「買う」で買う")
	t.ok(sc._modal == null, "shop: 買うと小窓が閉じる")
	sc.free()

# お手馬の詳しい画面：戦績の1走から、自分で乗ったレースの出走馬とラップ（リプレイから）を出す
func _horse(t) -> void:
	var hit = null
	var hr = null
	for h in HSWorld.mine():
		for r in HSU.or_(h.get("results"), []):
			if UiHorseScreen.find_replay(String(h.name), r) != "":
				hit = h; hr = r
				break
		if hit: break
	t.ok(hit != null, "horse: 自分で乗ったレースの戦績からリプレイが見つかる")
	if hit == null: return
	t.ok(hr.get("rt") != null and float(hr.rt) >= HSRating.MIN, "horse: 戦績に1走のレーティングが付く")
	UiFlow.program_id = String(hit.id)
	var sc = load("res://scenes/horse.tscn").instantiate()
	t.root.add_child(sc)
	while sc.TABS[sc.tab][0] != "rec": sc.on_tab(1)
	t.ok(sc.rows.size() == HSU.or_(hit.get("results"), []).size(), "horse: 戦績が1走1行")
	sc.race_detail(hr)
	t.ok(sc._modal != null and sc.detail_replay != "", "horse: レースの詳しい記録（リプレイあり・その1走のもの）")
	var rep = JSON.parse_string(FileAccess.get_file_as_string(UiFlow.replay_dir.path_join(sc.detail_replay + ".json")))
	var laps := UiHorseScreen.laps_of(rep)
	var sum := 0.0
	for x in laps: sum += float(x)
	t.ok(laps.size() == ceili(float(rep.race.dist) / 200.0) and absf(sum - float(rep.winnerTime)) < 0.3, "horse: ラップは200mごとで、足すと勝ち時計（%d本・%.1f秒）" % [laps.size(), sum])
	sc.close_modal()
	sc.free()

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
	L.result.meRows = L.me_rows
	L.result.whips = L.whips
	return L.result
