# 次週と押した返り（持ち主の指摘 2026-10-24「基本的にボタンを押したら押したボタンの結果がわかりやすく帰ってくるようにしてほしい
# ただし、頻繁に連打することになる次週ボタンは画面遷移や演出なしでいい　ただ、次週ボタンを押した結果はわかりやすくする必要があるので週が変わったことはわかりやすく表示して」）
# - 騎乗の無い週：次週でホームに留まり（週の結果の画面へ移らない）、週が1つ進み、その週の知らせ（UiWeek.notes）がホームの知らせの欄に出る
# - ホームの次週は週の締めを別の thread で回す：押してすぐ（0.3 秒より前に）次を押せ、締めている間に押した次週は続けて進む
# - 騎乗のある週：次週は出走表へ（週は進まない）
# - 共通の部品（UiFx・UiScreen.toast）：知らせが出る・押せない札を押すと理由が出る・押した札が返る・動きを減らす設定では大きさを動かさない
extends RefCounted

func run_async(t) -> void:
	var era0 = HSU.ERA
	var motion0 := String(UiSettings.cur.get("motion", "full"))
	UiFlow.demo(0, 7.0)
	_quiet_setup()
	# ---- 同じ thread（テスト・道具の道すじ）----
	t.eq(HSJockey.my_rides().size(), 0, "week: 騎乗の無い週を作れた")
	var w0 := HSWorld.w_idx()
	var nxt := UiFlow.begin_week()
	t.eq(nxt, "home", "week: 騎乗の無い週は次週でホームに留まる（週の結果へ移らない）")
	t.eq(HSWorld.w_idx(), w0 + 1, "week: 週が1つ進む")
	t.ok(UiFlow.report != null and not UiFlow.in_week, "week: 週を締めた（週の結果の中身は UiFlow.report に残る）")
	t.ok(UiWeek.flipped, "week: 週をめくった印（ホームが暦の札を開く）")
	# 月末まで進めると、経費で資金が減った知らせが出る
	var guard := 0
	while HSWorld.G.week != 1 and guard < 6:
		_quiet_setup()
		UiFlow.begin_week()
		guard += 1
	t.ok(UiWeek.notes.any(func(x): return String(x.text).begins_with("資金")), "week: 資金の増減が知らせに出る（%s）" % str(UiWeek.notes.map(func(x): return x.text)).left(200))
	t.ok(UiWeek.notes.size() <= UiWeek.KEEP and UiWeek.notes.all(func(x): return x.has("date") and String(x.text) != ""), "week: 知らせは %d件まで・どれも週の日付つき" % UiWeek.KEEP)
	# ---- ホームの次週（別の thread）----
	_quiet_setup()
	var sc = load("res://scenes/home.tscn").instantiate()
	t.root.add_child(sc)
	await _frames(t, 3)
	t.ok(sc.b_main != null and String(sc.b_main.text).contains("次の週へ"), "week: 騎乗の無い週の主な操作は「次の週へ」")
	var w1 := HSWorld.w_idx()
	var t0 := Time.get_ticks_usec()
	sc._main()
	var took := (Time.get_ticks_usec() - t0) / 1000.0
	t.ok(took < 300.0, "week: 次週を押してから次を押せるまで 0.3 秒より短い（%.0fms）" % took)
	t.ok(UiWeek.busy(), "week: 週の締めは別の thread で回る")
	sc._main()   # 締めている間にもう一度押す → 数えておき、続けて進む
	t.eq(UiWeek.queued, 1, "week: 締めている間の次週は数えておく")
	var n := 0
	while (UiWeek.busy() or UiWeek.queued > 0) and n < 600:
		await t.process_frame
		n += 1
	await _frames(t, 2)
	t.ok(is_instance_valid(sc) and sc.is_inside_tree() and sc.b_main != null, "week: 次週のあともホームのまま（画面は移らない）")
	var adv := HSWorld.w_idx() - w1
	t.ok(adv == 2.0 or (adv == 1.0 and UiWeek.stop_here()), "week: 2回押すと2週進む（騎乗のある週などで止まったら1週）：%d" % int(adv))
	var labels: Array = sc.find_children("*", "Label", true, false).map(func(l): return String(l.text)) + sc.find_children("*", "Button", true, false).map(func(b): return String(b.text))
	var want: Array = UiWeek.last.map(func(x): return String(x.text))
	t.ok(want.is_empty() or want.slice(0, 2).all(func(x): return labels.any(func(l): return l.contains(x.left(12)))), "week: その週の知らせがホームの知らせの欄に出る（%s）" % str(want.slice(0, 2)).left(160))
	t.ok(labels.any(func(l): return l == UiFlow.date_label() or l.contains(HSText.t("第%s週") % HSU.num(HSWorld.G.week)) or l.contains("GF週")), "week: 暦の札と帯が新しい週になる（%s）" % UiFlow.date_label())
	# 締めている間にほかの札（セーブ）を押すと、締め終わってから（thread と世界を同時に触らない）
	_quiet_setup()
	sc._guard = 0.0
	sc._rebuild_now()
	await _frames(t, 2)
	var w3 := HSWorld.w_idx()
	if sc.b_main.text.contains("次の週へ"):
		sc._main()
		sc._cmd("save")
		t.ok(not UiWeek.busy() and HSWorld.w_idx() == w3 + 1, "week: 締めている間のほかの操作は、締め終わってから")
	else:
		t.ok(false, "week: 騎乗の無い週に戻せなかった（%s）" % sc.b_main.text)
	# ---- 騎乗のある週：次週は出走表へ ----
	var ride := _ride_setup()
	if ride:
		var w2 := HSWorld.w_idx()
		t.eq(UiFlow.begin_week(), "card", "week: 騎乗のある週は出走表へ")
		t.eq(HSWorld.w_idx(), w2, "week: 騎乗のある週は、乗るまで週が進まない")
		UiFlow._reset_week()
	else:
		t.ok(false, "week: 騎乗のある週を作れなかった")
	# ---- 共通の部品：知らせ・押せない理由・押した返り・動きを減らす ----
	sc._rebuild_now()
	await _frames(t, 2)
	sc.toast("テストの知らせ", "good", sc.b_main)  # i18n:skip（テスト）
	var note = sc.get_meta("_fx_note") if sc.has_meta("_fx_note") else null
	t.ok(note is PanelContainer and String(note.get_meta("text")) == "テストの知らせ", "week: 知らせ（UiFx.notice）が出る")  # i18n:skip
	await _frames(t, 3)
	t.ok(sc.b_main.has_meta("_fx_ring"), "week: うまくいった知らせは、変わった所（渡した札）を金の縁で光らせる")
	var bd := UiScreen.button("押せない札", false, 200, 40)  # i18n:skip（テスト）
	bd.disabled = true
	bd.set_meta("why", "テストの理由")  # i18n:skip
	sc.add_child(bd)
	var ev := InputEventMouseButton.new()
	ev.button_index = MOUSE_BUTTON_LEFT
	ev.pressed = true
	bd.gui_input.emit(ev)
	note = sc.get_meta("_fx_note") if sc.has_meta("_fx_note") else null
	t.ok(note is PanelContainer and String(note.get_meta("text")).contains("テストの理由") and String(note.get_meta("kind")) == "bad", "week: 押せない札を押すと理由が出る")  # i18n:skip
	var bp := UiScreen.button("押す札", false, 200, 40)  # i18n:skip
	sc.add_child(bp)
	await _frames(t, 2)
	bp.button_down.emit()
	await _frames(t, 2)
	t.ok(bp.scale.x < 1.0 or bp.modulate.r > 1.0, "week: 押した札が返る（縮む・明るくなる）")
	UiSettings.cur.motion = "less"
	await _frames(t, 20)
	bp.button_down.emit()
	await _frames(t, 2)
	t.ok(bp.scale == Vector2.ONE and bp.modulate.r > 1.0, "week: 動きを減らす設定では大きさを動かさず、明るさだけで返す")
	UiSettings.cur.motion = motion0
	sc.free()
	HSU.ERA = era0
	HSWorld.G = null
	UiFlow._reset_week()
	UiFlow.no_save = false

func _frames(t, n: int) -> void:
	for i in n:
		await t.process_frame

# 自分の馬を出走させず（おまかせを切る）、今週の依頼は見送る → 騎乗の無い週
func _quiet_setup() -> void:
	for h in HSWorld.mine():
		h.auto = false
		if HSWorld.entry_of(h.id) != null: HSWorld.unenter(h.id)
	for o in HSOwners.offers():
		if o.now: HSOwners.decline(o.oid)
	HSWorld.dirty()

# 自分の馬を今週のレースに出走登録 → 騎乗のある週
func _ride_setup() -> bool:
	for h in HSWorld.mine("stable"):
		for x in HSProgram.rows(h, {"weeks": 1}):
			if x.can == "enter" and HSWorld.enter(h.id, x.race.key) == null:
				return HSJockey.my_rides().size() > 0
	return false
