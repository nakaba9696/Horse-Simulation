# 設定（ui/settings_store.gd・ui/settings.gd）と実績の入れ口（core/hs_achieve.gd）の確かめ
# - 設定はセーブと別のファイルに書き、読み直すと同じ値。壊れた値は既定に戻す
# - 割り当て：キー・パッド（LT/RT も）を替えると InputMap に効く。同じ組のほかの操作と同じ手なら入れ替える。既定のほかの手（スペースでしごく）は、ぶつかるときだけ外れ、初めの設定に戻すと戻る
# - 音量はバス（Master・BGM・SE）に、振動は ViewRideInput.level に効く
# - 設定の画面：パッドだけで値を替え（十字←→）、割り当てを待ってパッドのボタンで決められる
# - 実績：自分の馬がトロフィーを手にすると HSAchieve.unlock が呼ばれる（レースの勝ちから・直に give でも）。ほかの馬では呼ばれない。40個・id は Steam の API 名に使える形
extends RefCounted

const PATH := "user://test_settings.cfg"

func run_async(t) -> void:
	var path0 := UiSettings.path
	UiSettings.path = PATH
	if FileAccess.file_exists(PATH): DirAccess.remove_absolute(ProjectSettings.globalize_path(PATH))
	UiSettings.reset()
	t.ok(FileAccess.file_exists(PATH), "settings: 設定のファイルを書く（%s）" % PATH)
	t.ok(UiSettings.path != UiFlow.save_path, "settings: セーブとは別のファイル")
	# 保存と読み直し
	UiSettings.set_value("mode", "full")
	UiSettings.set_value("res", Vector2i(1920, 1080))
	UiSettings.set_value("vol_master", 50)
	UiSettings.set_value("vol_bgm", 30)
	UiSettings.set_value("vol_se", 0)
	UiSettings.set_value("vibration", false)
	UiSettings.bind("ride_whip_r", "key", KEY_Z)
	UiSettings.bind("ride_view", "pad", "a:%d:+" % JOY_AXIS_TRIGGER_LEFT)
	UiSettings.cur = {}
	UiSettings.load_file()
	var c := UiSettings.cur
	t.ok(c.mode == "full" and c.res == Vector2i(1920, 1080), "settings: 画面の表示と解像度を読み直せる（%s・%s）" % [c.mode, c.res])
	t.ok(int(c.vol_master) == 50 and int(c.vol_bgm) == 30 and int(c.vol_se) == 0 and c.vibration == false, "settings: 音量と振動を読み直せる")
	t.eq(int(c.keys.ride_whip_r), KEY_Z, "settings: キーの割り当てを読み直せる")
	t.eq(int(c.keys.ride_whip_l), KEY_X, "settings: 同じキーを使っていた操作と入れ替える（左ムチ ← X）")
	t.eq(String(c.pads.ride_view), "a:%d:+" % JOY_AXIS_TRIGGER_LEFT, "settings: パッドの LT を割り当てられる")
	t.eq(String(c.pads.ride_look_l), "b:%d" % JOY_BUTTON_BACK, "settings: LT を使っていた左を見るは Back に入れ替わる")
	UiSettings.apply()
	t.ok(_has_key("ride_whip_r", KEY_Z) and not _has_key("ride_whip_r", KEY_X) and _has_key("ride_whip_l", KEY_X), "settings: 割り当てが InputMap に効く（キー）")
	t.ok(_has_axis("ride_view", JOY_AXIS_TRIGGER_LEFT) and _has_btn("ride_look_l", JOY_BUTTON_BACK) and not _has_axis("ride_look_l", JOY_AXIS_TRIGGER_LEFT), "settings: 割り当てが InputMap に効く（パッド）")
	t.ok(_has_axis("ride_up", JOY_AXIS_LEFT_Y), "settings: 左スティックは割り当てのほかに残る")
	t.eq(ViewRideInput.level, 0.0, "settings: 振動を切ると ViewRideInput.level が 0")
	var bi := AudioServer.get_bus_index("BGM")
	t.ok(bi >= 0 and AudioServer.get_bus_index("SE") >= 0, "settings: BGM と SE のバスがある")
	t.ok(bi >= 0 and absf(AudioServer.get_bus_volume_db(bi) - linear_to_db(0.3)) < 0.01, "settings: BGM の音量がバスに効く")
	t.ok(AudioServer.is_bus_mute(AudioServer.get_bus_index("SE")), "settings: 効果音 0 は消音")
	# 既定のほかの手：スペースでしごく。右ムチにスペースを割り当てると、しごくからは外れる。初めの設定に戻すと戻る
	t.ok(_has_key("ride_up", KEY_SPACE), "settings: 既定のほかの手（スペースでしごく）が残る")
	UiSettings.bind("ride_whip_r", "key", KEY_SPACE)
	t.ok(_has_key("ride_whip_r", KEY_SPACE) and not _has_key("ride_up", KEY_SPACE), "settings: ほかの操作とぶつかる既定の手は外す")
	UiSettings.reset()
	t.ok(_has_key("ride_up", KEY_SPACE) and _has_key("ride_whip_r", KEY_X) and _has_btn("ride_view", JOY_BUTTON_BACK), "settings: 初めの設定に戻すと既定の割り当て")
	t.eq(ViewRideInput.level, UiSettings.VIB_LEVEL, "settings: 初めの設定では振動が入")
	t.ok(_has_btn("ui_accept", JOY_BUTTON_A) and _has_btn("ui_cancel", JOY_BUTTON_B), "settings: 初めの設定ではパッドの A で決める・B でもどる")
	# 壊れた値は既定に
	var cf := ConfigFile.new()
	cf.set_value("display", "res", Vector2i(123, 45))
	cf.set_value("audio", "vol_bgm", 999)
	cf.set_value("pads", "ride_up", "zzz")
	cf.save(PATH)
	UiSettings.load_file()
	t.ok(UiSettings.cur.res == Vector2i(1600, 1000) and int(UiSettings.cur.vol_bgm) == 100 and String(UiSettings.cur.pads.ride_up) == "b:%d" % JOY_BUTTON_DPAD_UP, "settings: 壊れた値は既定（範囲の中）に戻す")
	UiSettings.reset()
	# 名前
	t.ok(UiSettings.pad_name("a:%d:+" % JOY_AXIS_TRIGGER_RIGHT) == "RT" and UiSettings.pad_name("b:%d" % JOY_BUTTON_START) == "Start" and UiSettings.key_name(KEY_ESCAPE) == "Esc", "settings: キーとボタンの名前")
	t.ok(UiSettings.RESOLUTIONS[0] == Vector2i(1280, 720) and UiSettings.RESOLUTIONS[-1] == Vector2i(2560, 1440), "settings: 解像度は 1280×720〜2560×1440")
	await _screen(t)
	UiSettings.reset()
	if FileAccess.file_exists(PATH): DirAccess.remove_absolute(ProjectSettings.globalize_path(PATH))
	UiSettings.path = path0
	_achieve(t)

# 設定の画面をパッドだけで
func _screen(t) -> void:
	UiFlow.settings_back = "title"
	var sc = load("res://scenes/settings.tscn").instantiate()
	t.root.add_child(sc)
	for i in 3: await t.process_frame
	sc.focus_first()
	await t.process_frame
	var vp: Viewport = sc.get_viewport()
	var cur: Control = vp.gui_get_focus_owner()
	t.ok(cur != null and cur == sc.rows[0], "settings: 開くとカーソルが最初の行（画面の表示）")
	# 十字↓で全体の音量の行へ、十字←で 80 → 70
	for k in 2: _press(vp, "ui_down")
	await t.process_frame
	t.ok(vp.gui_get_focus_owner() == sc.rows[2], "settings: 十字↓で行を選ぶ")
	_press(vp, "ui_left")
	await t.process_frame
	t.eq(int(UiSettings.cur.vol_master), 70, "settings: 十字←で音量が下がる")
	t.eq(vp.gui_get_focus_owner(), sc.rows[2], "settings: 左右で値を替えてもカーソルは同じ行")
	# RB で割り当てのタブ → 最初の札（しごくのキー）から右へ（パッド）→ 決定で待つ → Y を押す
	var rb := InputEventJoypadButton.new()
	rb.button_index = JOY_BUTTON_RIGHT_SHOULDER; rb.pressed = true
	vp.push_input(rb)
	await t.process_frame
	await t.process_frame
	t.eq(sc.tab, 1, "settings: RB で割り当てのタブ")
	sc.focus_first()
	await t.process_frame
	_press(vp, "ui_right")
	await t.process_frame
	var pb: Control = vp.gui_get_focus_owner()
	t.ok(pb != null and pb.has_meta("bind") and pb.get_meta("bind") == ["ride_up", "pad"], "settings: 十字→でパッドの列")
	(pb as Button).pressed.emit()
	sc.listen.from = 0.0
	var y := InputEventJoypadButton.new()
	y.button_index = JOY_BUTTON_Y; y.pressed = true
	sc._input(y)
	await t.process_frame
	t.eq(String(UiSettings.cur.pads.ride_up), "b:%d" % JOY_BUTTON_Y, "settings: パッドのボタンを押して割り当てる")
	t.ok(sc.listen.is_empty(), "settings: 割り当てたら待つのをやめる")
	# 決める・もどるに十字は使えない
	for b in sc.rows:
		if b.get_meta("bind") == ["ui_accept", "pad"]:
			sc._listen(b, "ui_accept", "pad")
	sc.listen.from = 0.0
	var dn := InputEventJoypadButton.new()
	dn.button_index = JOY_BUTTON_DPAD_DOWN; dn.pressed = true
	sc._input(dn)
	t.eq(String(UiSettings.cur.pads.ui_accept), "b:%d" % JOY_BUTTON_A, "settings: 決めるに十字は割り当てない")
	sc.queue_free()
	await t.process_frame

func _press(vp: Viewport, a: String) -> void:
	var e := InputEventAction.new()
	e.action = a; e.pressed = true
	vp.push_input(e)
	var r := InputEventAction.new()
	r.action = a; r.pressed = false
	vp.push_input(r)

func _has_key(a: String, k: int) -> bool:
	return InputMap.action_get_events(a).any(func(e): return UiSettings.key_matches(e, k))
func _has_btn(a: String, b: int) -> bool:
	return InputMap.action_get_events(a).any(func(e): return e is InputEventJoypadButton and e.button_index == b)
func _has_axis(a: String, ax: int) -> bool:
	return InputMap.action_get_events(a).any(func(e): return e is InputEventJoypadMotion and e.axis == ax)

func _achieve(t) -> void:
	var era0 = HSU.ERA
	var save0 := UiFlow.save_path
	UiFlow.save_path = "user://test_achieve.json"
	UiFlow.new_game("実績騎手", "美浦", 5.0)
	UiFlow.no_save = true
	var G = HSWorld.G
	G.player.money = 1e10
	HSWorld.buy(HSWorld.market_historic()[0])
	var h = HSWorld.mine()[0]
	HSAchieve.clear()
	# レースの勝ちから：三冠がそろう
	var y: float = G.year
	h.gradedWins = [{ race = "皐月賞", short = "皐月賞", y = y, grade = "G1" }, { race = "日本ダービー", short = "日本ダービー", y = y, grade = "G1" }, { race = "菊花賞", short = "菊花賞", y = y, grade = "G1" }]
	var got := HSTrophy.on_win(h, { short = "菊花賞", year = y })
	t.ok(got.size() >= 1 and HSAchieve.calls.has("TROPHY_TRIPLE"), "achieve: トロフィー（日本三冠）を手にすると実績の入れ口が呼ばれる（%s）" % [HSAchieve.calls])
	var n0 := HSAchieve.calls.size()
	HSTrophy.give(h, HSTrophy.by()["triple"], y)
	t.eq(HSAchieve.calls.size(), n0, "achieve: 同じトロフィーは二度呼ばない")
	# ほかの馬（自分の馬でない）では呼ばない
	var ai: Dictionary = h.duplicate(true)
	ai.id = HSWorld.new_id()
	ai.name = "ほかの馬"
	ai.owner = "AI"
	G.horses[ai.id] = ai
	HSTrophy.give(ai, HSTrophy.by()["ftriple"], y)
	t.ok(not HSAchieve.calls.has("TROPHY_FTRIPLE"), "achieve: 自分の馬でないと呼ばない")
	# backend（あとで Steam につなぐ所）に渡る
	var seen: Array = []
	HSAchieve.backend = func(id): seen.append(id)
	HSTrophy.give(h, HSTrophy.by()["gf:sprint"], y)
	t.ok(seen == ["TROPHY_GF_SPRINT"], "achieve: 入れ口から backend に渡る（%s）" % [seen])
	HSAchieve.backend = Callable()
	# つづきから：セーブにあるトロフィーの分を呼び直す
	HSAchieve.clear()
	t.ok(HSAchieve.sync_from_world() >= 2 and HSAchieve.unlocked.has("TROPHY_TRIPLE") and HSAchieve.unlocked.has("TROPHY_GF_SPRINT"), "achieve: つづきからでセーブのトロフィーを呼び直す")
	# 表：40個・id は英大文字と数字と _・重なり無し
	var tb := HSAchieve.table()
	var ids := {}
	var re := RegEx.create_from_string("^[A-Z0-9_]+$")
	var bad := 0
	for r in tb:
		ids[r.id] = true
		if re.search(String(r.id)) == null: bad += 1
	t.eq(tb.size(), 40, "achieve: 実績はトロフィーの40個")
	t.ok(ids.size() == tb.size() and bad == 0, "achieve: 実績の id は重ならず、Steam の API 名に使える形")
	HSAchieve.clear()
	UiFlow.delete_save()
	HSWorld.G = null
	HSU.ERA = era0
	UiFlow.save_path = save0
	UiFlow.no_save = false
	UiFlow._reset_week()
