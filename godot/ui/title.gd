# タイトル：はじめから・つづきから（セーブの要点つき）・1レースだけ走る（出走表の見本）・設定・終わる
# はじめから：騎手の名前と所属（美浦・栗東）を決める小窓。セーブがあるときは「消して始める」の確かめ（「やめる」から）
extends UiScreen

var menu: VBoxContainer
var b_cont: Button
var b_new: Button
var win: PanelContainer
var name_edit: LineEdit
var region := "美浦"
var seg_btns: Array[Button] = []
var b_start: Button
var confirm_box: PanelContainer
var b_no: Button

func needs_world() -> bool: return false
func hint() -> String: return "騎手になって、史実の名馬に乗る"

func build() -> void:
	backdrop("bg_title", 0.55)
	# 題字
	var tv := VBoxContainer.new()
	tv.position = Vector2(120, 170)
	tv.add_theme_constant_override("separation", 2)
	add_child(tv)
	var k := UiTheme.label("騎手が主役の競馬ゲーム", 18, UiTheme.GOLD_BRIGHT)
	tv.add_child(k)
	var t := UiTheme.title("ターフの系譜", 96, UiTheme.IVORY)
	t.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.6))
	t.add_theme_constant_override("shadow_offset_y", 4)
	tv.add_child(t)
	var line := ColorRect.new()
	line.color = UiTheme.GOLD
	line.custom_minimum_size = Vector2(420, 2)
	tv.add_child(line)
	# メニュー
	menu = VBoxContainer.new()
	menu.position = Vector2(120, 470)
	menu.custom_minimum_size = Vector2(460, 0)
	menu.add_theme_constant_override("separation", 14)
	add_child(menu)
	var info := UiFlow.save_info()
	b_cont = UiScreen.button("つづきから", not info.is_empty(), 460, 64, 24)
	if info.is_empty():
		b_cont.disabled = true
		b_cont.focus_mode = Control.FOCUS_NONE
	menu.add_child(b_cont)
	if not info.is_empty():
		var il := UiTheme.label(HSText.t("%s　%s　資金 %s") % [info.name, info.label, HSText.money(info.money)], 17, UiTheme.GOLD_BRIGHT)
		il.custom_minimum_size.x = 460
		menu.add_child(il)
	b_new = UiScreen.button("はじめから", info.is_empty(), 460, 64, 24)
	menu.add_child(b_new)
	var b_one := UiScreen.button("1レースだけ走る", false, 460, 48, 18)
	menu.add_child(b_one)
	var b_set := UiScreen.button("設定", false, 460, 48, 18)
	menu.add_child(b_set)
	var b_quit := UiScreen.button("終わる", false, 460, 48, 18)
	menu.add_child(b_quit)
	b_cont.pressed.connect(_continue)
	b_new.pressed.connect(_open_new)
	b_one.pressed.connect(func(): UiFlow._reset_week(); go("card"))
	b_set.pressed.connect(func(): UiFlow.settings_back = "title"; go("settings"))
	b_quit.pressed.connect(func(): get_tree().quit())
	var ver := UiTheme.label("背景：Grasslands Sunset（Poly Haven・CC0）", 11, UiTheme.FAINT)
	ver.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	ver.position = Vector2(PAD_X, -30)
	ver.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(ver)
	_build_new()

func focus_first() -> void:
	if win and win.visible:
		name_edit.grab_focus()
	elif not b_cont.disabled:
		b_cont.grab_focus()
	else:
		b_new.grab_focus()

func _continue() -> void:
	if UiFlow.load_game():
		go("home")
	else:
		toast("セーブを読めなかった", "bad")

# ---- はじめからの小窓 ----
func _build_new() -> void:
	var pb := UiScreen.panel_box(true, 14)
	win = pb[0]
	var v: VBoxContainer = pb[1]
	win.position = Vector2(640, 430)
	win.custom_minimum_size = Vector2(520, 0)
	win.visible = false
	add_child(win)
	v.add_child(UiScreen.section("新しい騎手"))
	v.add_child(UiTheme.label("名前", 13, UiTheme.MUTED))
	name_edit = LineEdit.new()
	name_edit.text = HSText.t("新人騎手")
	name_edit.max_length = 16 if HSText.is_en() else 10
	name_edit.custom_minimum_size = Vector2(0, 44)
	name_edit.add_theme_font_size_override("font_size", 20)
	name_edit.add_theme_stylebox_override("normal", UiTheme.box(UiTheme.SUNK, UiTheme.LINE_STRONG, 1, UiTheme.R_BUTTON, Vector4(14, 6, 14, 6)))
	name_edit.add_theme_stylebox_override("focus", UiTheme.box(UiTheme.SUNK, UiTheme.GOLD, 2, UiTheme.R_BUTTON, Vector4(14, 6, 14, 6)))
	name_edit.text_submitted.connect(func(_t): b_start.grab_focus())
	v.add_child(name_edit)
	# 所属：選び肢の札
	var sh := HBoxContainer.new()
	sh.add_theme_constant_override("separation", 10)
	sh.add_child(UiTheme.label("所属", 13, UiTheme.MUTED))
	var seg := PanelContainer.new()
	seg.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SUNK, Color(0, 0, 0, 0), 0, 999, Vector4(4, 4, 4, 4)))
	var sg := HBoxContainer.new()
	sg.add_theme_constant_override("separation", 4)
	seg.add_child(sg)
	for r in ["美浦", "栗東"]:
		var b := Button.new()
		b.text = HSText.t(r)
		b.set_meta("region", r)
		b.custom_minimum_size = Vector2(110, 34)
		b.add_theme_font_size_override("font_size", 16)
		b.pressed.connect(func(): region = r; _seg_paint())
		sg.add_child(b)
		seg_btns.append(b)
	sh.add_child(seg)
	v.add_child(sh)
	_seg_paint()
	var bh := HBoxContainer.new()
	bh.alignment = BoxContainer.ALIGNMENT_END
	bh.add_theme_constant_override("separation", 12)
	var b_back := UiScreen.button("もどる", false, 130, 48, 17)
	b_back.pressed.connect(_close_new)
	bh.add_child(b_back)
	b_start = UiScreen.button("この騎手で始める", true, 250, 52, 20)
	b_start.pressed.connect(_start)
	bh.add_child(b_start)
	v.add_child(bh)
	# 消して始める確かめ（「やめる」から）
	var cb := UiScreen.panel_box(true, 12)
	confirm_box = cb[0]
	confirm_box.position = Vector2(640, 470)
	confirm_box.custom_minimum_size = Vector2(520, 0)
	confirm_box.visible = false
	add_child(confirm_box)
	var cv: VBoxContainer = cb[1]
	cv.add_child(UiTheme.title("つづきのセーブを消して始めますか", 20))
	var ch := HBoxContainer.new()
	ch.alignment = BoxContainer.ALIGNMENT_END
	ch.add_theme_constant_override("separation", 12)
	b_no = UiScreen.button("やめる", false, 140, 48, 17)
	b_no.pressed.connect(func(): confirm_box.visible = false; b_start.grab_focus())
	ch.add_child(b_no)
	var b_yes := UiScreen.button("消して始める", false, 180, 48, 17)
	b_yes.add_theme_stylebox_override("normal", UiTheme.box(Color("5a1f1c"), Color("8a3a33"), 1, UiTheme.R_BUTTON, Vector4(20, 9, 20, 11)))
	b_yes.pressed.connect(_really_start)
	ch.add_child(b_yes)
	cv.add_child(ch)

func _seg_paint() -> void:
	for b in seg_btns:
		if b.get_meta("region", "") == region:
			UiTheme.gold_button(b)
		else:
			for k in ["normal", "hover", "focus", "pressed", "hover_pressed"]:
				b.remove_theme_stylebox_override(k)
			for k in ["font_color", "font_hover_color", "font_focus_color", "font_pressed_color"]:
				b.remove_theme_color_override(k)

func _open_new() -> void:
	win.visible = true
	menu.modulate.a = 0.45
	name_edit.grab_focus()
	name_edit.select_all()

func _close_new() -> void:
	win.visible = false
	confirm_box.visible = false
	menu.modulate.a = 1.0
	b_new.grab_focus()

func _start() -> void:
	if UiFlow.has_save():
		confirm_box.visible = true
		b_no.grab_focus()
		return
	_really_start()

func _really_start() -> void:
	var nm := name_edit.text.strip_edges()
	UiFlow.new_game(nm if nm != "" else HSText.t("新人騎手"), region)
	go("home")

func on_back() -> void:
	if confirm_box.visible:
		confirm_box.visible = false
		b_start.grab_focus()
	elif win.visible:
		_close_new()
