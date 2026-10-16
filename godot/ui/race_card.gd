# 出走表：全頭（最大18頭）をスクロールなしで1画面に（持ち主「レース時の馬一覧もスクロールなしで全頭見れるようにしてね」）
# 上の帯：レース番号・レース名・格・競馬場・芝ダと距離・天気・馬場。表の行：馬番（枠の色）・馬名・性齢・斤量・脚質の矢印（その馬の脚質が赤く光る）
# 下：PADDOCK（選んだ馬をパドックで見る）・GATE IN!（レースへ）。後ろはパドックを歩く馬（3D。選んだ馬をカメラが追う）
# 操作：十字キー・矢印で選ぶ、A・Enter で決める、B・Esc で戻る
extends Node

const RACE_SCENE := "res://scenes/race.tscn"
const ROW_H := 46.0

var race: Dictionary
var paddock: ViewPaddock
var ui: CanvasLayer
var root: Control
var band: PanelContainer
var table: PanelContainer
var rows: Array[Button] = []
var card: PanelContainer
var card_name: Label
var card_sub: Label
var card_arrows: UiStyleArrows
var card_mine: Label
var btn_paddock: Button
var btn_gate: Button
var shade: ColorRect
var fade: ColorRect
var sel := 0
var mode := "card"     # card / paddock
var t := 0.0
var shots: Array = []
var out_dir := "res://out"
var video := {}

func _ready() -> void:
	race = JSON.parse_string(FileAccess.get_file_as_string("res://assets/replay_race.json"))
	sel = int(race.me)
	paddock = ViewPaddock.new()
	add_child(paddock)
	paddock.setup(race)
	ui = CanvasLayer.new()
	add_child(ui)
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.theme = UiTheme.get_theme()
	ui.add_child(root)
	_build()
	_select(sel, false)
	_parse_args()
	_enter_anim()
	if shots.size() > 0 or not video.is_empty():
		_capture()
	else:
		rows[sel].grab_focus.call_deferred()

# ---- 組む ----
func _build() -> void:
	# 左を深緑で沈め、右のパドックの馬を見せる
	shade = ColorRect.new()
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sh := ShaderMaterial.new()
	sh.shader = Shader.new()
	sh.shader.code = """shader_type canvas_item;
uniform vec4 c : source_color = vec4(0.03, 0.11, 0.08, 1.0);
void fragment() {
	float a = 0.86 * (1.0 - smoothstep(0.42, 0.78, UV.x)) + 0.25 * smoothstep(0.75, 1.0, UV.y);
	COLOR = vec4(c.rgb, a);
}"""
	shade.material = sh
	root.add_child(shade)
	_build_band()
	_build_table()
	_build_card()
	_build_buttons()
	fade = ColorRect.new()
	fade.color = Color(0.01, 0.04, 0.03, 0.0)
	fade.set_anchors_preset(Control.PRESET_FULL_RECT)
	fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(fade)

func _build_band() -> void:
	band = UiTheme.band(108)
	band.set_anchors_preset(Control.PRESET_TOP_WIDE)
	root.add_child(band)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 22)
	band.add_child(h)
	var r: Dictionary = race.race
	# レース番号：金の札
	var rn := PanelContainer.new()
	rn.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.GOLD, UiTheme.GOLD_BRIGHT, 2, 8, Vector4(14, 0, 14, 0)))
	var rl := UiTheme.label("%dR" % int(r.get("num", 11)), 44, UiTheme.GREEN_DEEP, HORIZONTAL_ALIGNMENT_CENTER)
	rn.add_child(rl)
	rn.custom_minimum_size = Vector2(108, 76)
	rn.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(rn)
	var name_box := VBoxContainer.new()
	name_box.add_theme_constant_override("separation", -8)
	name_box.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(name_box)
	var nm := HBoxContainer.new()
	nm.add_theme_constant_override("separation", 16)
	nm.add_child(UiTheme.label(String(r.name), 52, UiTheme.IVORY))
	var gc := UiTheme.grade_chip(String(r.grade))
	gc.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	nm.add_child(gc)
	name_box.add_child(nm)
	name_box.add_child(UiTheme.label("%s競馬場" % r.course, 22, UiTheme.MUTED))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(sp)
	# 右：芝ダと距離・天気・馬場（数値の札）
	var info := HBoxContainer.new()
	info.add_theme_constant_override("separation", 12)
	info.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(info)
	var surf := String(r.surface)
	var sc := UiTheme.chip("%s %dm" % [surf, int(r.dist)], Color("2e7d3c") if surf == "芝" else Color("8a5a2b"), UiTheme.IVORY, 32)
	info.add_child(sc)
	info.add_child(UiTheme.chip(("右回り" if String(r.get("dir", "左")) == "右" else "左回り"), UiTheme.GREEN_LIGHT, UiTheme.IVORY, 26))
	info.add_child(_weather_chip(String(r.get("weather", "晴"))))
	info.add_child(UiTheme.chip("馬場 " + String(r.ground), UiTheme.GREEN_LIGHT, UiTheme.GOLD_BRIGHT, 26))

func _weather_chip(w: String) -> PanelContainer:
	var p := UiTheme.chip(w, Color("1d5a7a") if w == "雨" else (Color("6a7480") if w == "曇" else Color("b7862a")), UiTheme.IVORY, 26)
	return p

func _build_table() -> void:
	table = PanelContainer.new()
	table.add_theme_stylebox_override("panel", UiTheme.box(Color(UiTheme.GREEN_DEEP.r, UiTheme.GREEN_DEEP.g, UiTheme.GREEN_DEEP.b, 0.55), Color(UiTheme.GOLD_DIM.r, UiTheme.GOLD_DIM.g, UiTheme.GOLD_DIM.b, 0.8), 1, 10, Vector4(10, 8, 10, 10)))
	table.position = Vector2(40, 128)
	table.custom_minimum_size = Vector2(980, 0)
	root.add_child(table)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 3)
	table.add_child(v)
	# 見出しの行
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 14)
	head.custom_minimum_size.y = 30
	for col in [["馬番", 64], ["馬名", 0], ["性齢", 86], ["斤量", 86], ["脚質", 168]]:
		var l := UiTheme.label(col[0], 18, UiTheme.GOLD, HORIZONTAL_ALIGNMENT_CENTER if col[1] > 0 else HORIZONTAL_ALIGNMENT_LEFT)
		if col[1] > 0:
			l.custom_minimum_size.x = col[1]
		else:
			l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		head.add_child(l)
	var pad := MarginContainer.new()
	pad.add_theme_constant_override("margin_left", 12)
	pad.add_theme_constant_override("margin_right", 14)
	pad.add_child(head)
	v.add_child(pad)
	var n: int = race.horses.size()
	# 18頭で高さに収まる行の高さ（1080 の画面で 46）
	for i in n:
		var hinfo: Dictionary = race.horses[i]
		var b := Button.new()
		b.custom_minimum_size = Vector2(0, ROW_H)
		b.focus_mode = Control.FOCUS_ALL
		b.add_theme_stylebox_override("normal", UiTheme.row_box(i))
		b.add_theme_stylebox_override("hover", UiTheme.row_box(i, true))
		b.add_theme_stylebox_override("focus", UiTheme.row_box(i, true))
		b.add_theme_stylebox_override("pressed", UiTheme.row_box(i, true))
		b.add_theme_stylebox_override("hover_pressed", UiTheme.row_box(i, true))
		var h := HBoxContainer.new()
		h.set_anchors_preset(Control.PRESET_FULL_RECT)
		h.offset_left = 12
		h.offset_right = -14
		h.add_theme_constant_override("separation", 14)
		h.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(h)
		var fb := UiTheme.frame_box(int(hinfo.frame), int(hinfo.num), 38, 24)
		var fbw := CenterContainer.new()
		fbw.custom_minimum_size.x = 64
		fbw.add_child(fb)
		h.add_child(fbw)
		var mine := bool(hinfo.get("mine", i == int(race.me)))
		var nl := UiTheme.label(String(hinfo.name), 28, UiTheme.GOLD_BRIGHT if mine else UiTheme.IVORY)
		nl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		nl.clip_text = true
		h.add_child(nl)
		if mine:
			var me_tag := UiTheme.chip("YOU", UiTheme.GOLD, UiTheme.GREEN_DEEP, 16)
			me_tag.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			h.add_child(me_tag)
		var sa := UiTheme.label("%s%d" % [hinfo.sex, int(hinfo.get("age", 4))], 24, UiTheme.IVORY, HORIZONTAL_ALIGNMENT_CENTER)
		sa.custom_minimum_size.x = 86
		h.add_child(sa)
		var wl := UiTheme.label("%.1f" % float(hinfo.weight), 24, UiTheme.IVORY, HORIZONTAL_ALIGNMENT_CENTER)
		wl.custom_minimum_size.x = 86
		h.add_child(wl)
		var ar := UiStyleArrows.new(String(hinfo.style))
		ar.custom_minimum_size = Vector2(168, 30)
		ar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		h.add_child(ar)
		for c in h.get_children():
			if c is Control:
				(c as Control).mouse_filter = Control.MOUSE_FILTER_IGNORE
		var idx := i
		b.focus_entered.connect(func(): _select(idx, true))
		b.mouse_entered.connect(func(): b.grab_focus())
		b.pressed.connect(func(): _open_paddock())
		v.add_child(b)
		rows.append(b)

# 選んだ馬の札（右下）
func _build_card() -> void:
	card = PanelContainer.new()
	card.add_theme_stylebox_override("panel", UiTheme.panel(0.82))
	card.custom_minimum_size = Vector2(620, 0)
	root.add_child(card)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	card.add_child(v)
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 12)
	v.add_child(top)
	card_mine = UiTheme.label("", 18, UiTheme.GOLD)
	card_name = UiTheme.label("", 44, UiTheme.IVORY)
	card_name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(card_name)
	card_arrows = UiStyleArrows.new("")
	card_arrows.custom_minimum_size = Vector2(170, 34)
	card_arrows.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	top.add_child(card_arrows)
	card_sub = UiTheme.label("", 24, UiTheme.MUTED)
	v.add_child(card_sub)

func _build_buttons() -> void:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 22)
	h.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	h.position = Vector2(-680, -132)
	root.add_child(h)
	btn_paddock = Button.new()
	btn_paddock.text = "PADDOCK"
	btn_paddock.custom_minimum_size = Vector2(290, 88)
	h.add_child(btn_paddock)
	btn_gate = Button.new()
	btn_gate.text = "GATE IN!"
	btn_gate.custom_minimum_size = Vector2(330, 88)
	btn_gate.add_theme_font_size_override("font_size", 38)
	h.add_child(btn_gate)
	btn_paddock.pressed.connect(_open_paddock)
	btn_gate.pressed.connect(_gate_in)
	# 表の行と下のボタンのあいだを十字キーで行き来できるように
	for r in rows:
		r.focus_neighbor_right = r.get_path_to(btn_gate)
	if rows.size() > 0:
		rows[rows.size() - 1].focus_neighbor_bottom = rows[rows.size() - 1].get_path_to(btn_gate)
		btn_gate.focus_neighbor_top = btn_gate.get_path_to(rows[rows.size() - 1])
		btn_paddock.focus_neighbor_top = btn_paddock.get_path_to(rows[rows.size() - 1])
		btn_gate.focus_neighbor_left = btn_gate.get_path_to(btn_paddock)
		btn_paddock.focus_neighbor_left = btn_paddock.get_path_to(rows[sel])

func _select(i: int, animate: bool) -> void:
	sel = i
	paddock.focus = i
	var h: Dictionary = race.horses[i]
	card_name.text = String(h.name)
	card_name.add_theme_color_override("font_color", UiTheme.GOLD_BRIGHT if bool(h.get("mine", false)) else UiTheme.IVORY)
	card_arrows.style = String(h.style)
	card_arrows.queue_redraw()
	card_sub.text = "%d番  %s%d  %s  %s  斤量 %.1f" % [int(h.num), h.sex, int(h.get("age", 4)), h.coat, h.style, float(h.weight)]
	if animate:
		card.modulate.a = 0.4
		create_tween().tween_property(card, "modulate:a", 1.0, 0.25)

func _open_paddock() -> void:
	if mode == "paddock":
		return
	mode = "paddock"
	paddock.close = true
	paddock.orbit = 0.0
	var tw := create_tween().set_parallel(true)
	tw.tween_property(table, "position:x", -1100.0, 0.35).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tw.tween_property(shade, "modulate:a", 0.0, 0.35)
	btn_gate.grab_focus()

func _close_paddock() -> void:
	if mode != "paddock":
		return
	mode = "card"
	paddock.close = false
	var tw := create_tween().set_parallel(true)
	tw.tween_property(table, "position:x", 40.0, 0.35).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(shade, "modulate:a", 1.0, 0.35)
	rows[sel].grab_focus()

func _gate_in() -> void:
	var tw := create_tween()
	tw.tween_property(fade, "color:a", 1.0, 0.45)
	tw.tween_callback(func(): get_tree().change_scene_to_file(RACE_SCENE))

func _unhandled_input(ev: InputEvent) -> void:
	if ev.is_action_pressed("ui_cancel"):
		_close_paddock()

# 入りの動き：帯が上から、表の行が左から順に、ボタンが下から
func _enter_anim() -> void:
	band.position.y = -120
	var tw := create_tween()
	tw.tween_property(band, "position:y", 0.0, 0.4).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	for i in rows.size():
		var r := rows[i]
		r.modulate.a = 0.0
		var t2 := create_tween()
		t2.tween_interval(0.15 + i * 0.03)
		t2.tween_property(r, "modulate:a", 1.0, 0.25)

func _layout() -> void:
	var sz := root.size
	card.position = Vector2(sz.x - card.size.x - 40, sz.y - 132 - 30 - card.size.y)

func _process(delta: float) -> void:
	if shots.size() > 0 or not video.is_empty():
		return
	t += delta
	paddock.step(delta)
	_layout()

# ---- 撮影 ----
func _parse_args() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="):
			out_dir = a.substr(6)
		elif a.begins_with("--shot="):
			var p := a.substr(7).split(":")
			shots.append({"t": float(p[0]), "name": p[1], "sel": int(p[2]) if p.size() > 2 else -1, "paddock": p.size() > 3 and p[3] == "paddock"})
		elif a.begins_with("--video="):
			var q := a.substr(8).split(":")
			video = {"t0": float(q[0]), "t1": float(q[1]), "fps": float(q[2]), "name": q[3]}
		elif a == "--fast":
			get_viewport().msaa_3d = Viewport.MSAA_DISABLED
			RenderingServer.directional_shadow_atlas_set_size(2048, true)

func _capture() -> void:
	DirAccess.make_dir_recursive_absolute(out_dir)
	var list: Array = shots.duplicate()
	if not video.is_empty():
		var tt := float(video.t0)
		var i := 0
		while tt <= float(video.t1) + 1e-6:
			list.append({"t": tt, "name": "%s_%04d" % [video.name, i], "sel": -1, "paddock": false})
			tt += 1.0 / float(video.fps)
			i += 1
	var step := 1.0 / 30.0
	for sh in list:
		if int(sh.sel) >= 0 and int(sh.sel) != sel:
			_select(int(sh.sel), false)
			rows[sel].grab_focus()
		if sh.paddock:
			_open_paddock()
		while t < float(sh.t) - 1e-4:
			var d := minf(step, float(sh.t) - t)
			t += d
			paddock.step(d)
			_layout()
			# 入りの動きの tween も同じ刻みで進める
			for tw in get_tree().get_processed_tweens():
				tw.custom_step(d)
		for k in 2:
			await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(out_dir.path_join(String(sh.name) + ".png"))
		if not String(sh.name).contains("_0"):
			print("shot ", sh.name)
	print("done")
	OS.kill(OS.get_process_id())
