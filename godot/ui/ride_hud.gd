# 騎乗の画面の上の表示。文字の状態（溜めている・折り合っている など）は出さない（持ち主の指摘）。
# 出すもの：残りの距離・いまの順位（英語の序数）・ミニマップ・計器（脚の残り・手綱の段・馬の気分の色・ムチの手）・短い合図（英語）・ゴールのあとの着順と確定の表
# 計器は線と光だけで描く（_draw）。気分は色（落ち着き＝白金、高ぶり＝赤い脈）で返す
class_name UiRideHud
extends CanvasLayer

var race: Dictionary
var src   # ViewLive か ViewReplay
var tr: ViewTrack
var root: Control
var top_left: Control
var dist_l: Label
var dist_unit: Label
var place_l: Label
var place_sfx: Label
var place_of_l: Label
var meter: UiRideMeter
var minimap: UiMinimap
var cue: Label
var cue_t := -99.0
var cue_dur := 1.6
var finish_box: Control
var finish_l: Label
var finish_sub: Label
var board: PanelContainer
var board_rows: VBoxContainer
var tv_box: Control
var tv_rows: Array = []
var telop: Label
var telop_panel: PanelContainer
var mode := "ride"

func setup(r: Dictionary, s, track: ViewTrack) -> void:
	race = r
	src = s
	tr = track
	layer = 5
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.theme = UiTheme.get_theme()
	add_child(root)
	_build_top_left()
	_build_place()
	meter = UiRideMeter.new()
	meter.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	meter.size = Vector2(400, 190)
	meter.position = Vector2(-430, -214)
	root.add_child(meter)
	minimap = UiMinimap.new()
	minimap.setup(tr, race)
	minimap.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	minimap.size = Vector2(340, 200)
	minimap.position = Vector2(-372, 30)
	root.add_child(minimap)
	cue = UiTheme.label("", 92, UiTheme.GOLD_BRIGHT, HORIZONTAL_ALIGNMENT_CENTER)
	cue.set_anchors_preset(Control.PRESET_CENTER_TOP)
	cue.size = Vector2(1200, 140)
	cue.position = Vector2(-600, 250)
	cue.add_theme_constant_override("outline_size", 14)
	cue.add_theme_color_override("font_outline_color", Color(0.02, 0.08, 0.05, 0.85))
	cue.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.5))
	cue.add_theme_constant_override("shadow_offset_y", 6)
	cue.pivot_offset = Vector2(600, 70)
	root.add_child(cue)
	_build_finish()
	_build_board()
	_build_tv()

func _build_top_left() -> void:
	top_left = PanelContainer.new()
	var sb := UiTheme.box(Color(UiTheme.GREEN_DEEP.r, UiTheme.GREEN_DEEP.g, UiTheme.GREEN_DEEP.b, 0.72), Color(UiTheme.GOLD.r, UiTheme.GOLD.g, UiTheme.GOLD.b, 0.0), 0, 10, Vector4(22, 10, 26, 12))
	sb.border_width_left = 6
	sb.border_color = UiTheme.GOLD
	top_left.add_theme_stylebox_override("panel", sb)
	top_left.position = Vector2(30, 30)
	root.add_child(top_left)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", -6)
	top_left.add_child(v)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 12)
	v.add_child(h)
	h.add_child(UiTheme.grade_chip(String(race.race.grade)))
	h.add_child(UiTheme.label(String(race.race.get("short", race.race.name)), 26, UiTheme.IVORY))
	var h2 := HBoxContainer.new()
	h2.add_theme_constant_override("separation", 6)
	v.add_child(h2)
	dist_l = UiTheme.label("2400", 64, UiTheme.GOLD_BRIGHT)
	h2.add_child(dist_l)
	dist_unit = UiTheme.label("m", 30, UiTheme.GOLD)
	dist_unit.size_flags_vertical = Control.SIZE_SHRINK_END
	h2.add_child(dist_unit)

func _build_place() -> void:
	var box := HBoxContainer.new()
	box.position = Vector2(36, 176)
	box.add_theme_constant_override("separation", 2)
	root.add_child(box)
	place_l = UiTheme.label("1", 96, UiTheme.IVORY)
	place_l.add_theme_constant_override("outline_size", 10)
	place_l.add_theme_color_override("font_outline_color", Color(0.02, 0.08, 0.05, 0.8))
	box.add_child(place_l)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", -10)
	box.add_child(v)
	place_sfx = UiTheme.label("st", 40, UiTheme.GOLD_BRIGHT)
	place_sfx.add_theme_constant_override("outline_size", 8)
	place_sfx.add_theme_color_override("font_outline_color", Color(0.02, 0.08, 0.05, 0.8))
	v.add_child(place_sfx)
	place_of_l = UiTheme.label("/16", 26, UiTheme.MUTED)
	place_of_l.add_theme_constant_override("outline_size", 6)
	place_of_l.add_theme_color_override("font_outline_color", Color(0.02, 0.08, 0.05, 0.8))
	v.add_child(place_of_l)

func _build_finish() -> void:
	finish_box = Control.new()
	finish_box.set_anchors_preset(Control.PRESET_FULL_RECT)
	finish_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	finish_box.visible = false
	root.add_child(finish_box)
	finish_l = UiTheme.label("1st", 210, UiTheme.GOLD_BRIGHT, HORIZONTAL_ALIGNMENT_CENTER)
	finish_l.set_anchors_preset(Control.PRESET_CENTER)
	finish_l.size = Vector2(1000, 260)
	finish_l.position = Vector2(-500, -300)
	finish_l.pivot_offset = Vector2(500, 130)
	finish_l.add_theme_constant_override("outline_size", 22)
	finish_l.add_theme_color_override("font_outline_color", Color(0.02, 0.1, 0.06, 0.9))
	finish_l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.55))
	finish_l.add_theme_constant_override("shadow_offset_y", 10)
	finish_box.add_child(finish_l)
	finish_sub = UiTheme.label("", 48, UiTheme.IVORY, HORIZONTAL_ALIGNMENT_CENTER)
	finish_sub.set_anchors_preset(Control.PRESET_CENTER)
	finish_sub.size = Vector2(1000, 70)
	finish_sub.position = Vector2(-500, -36)
	finish_sub.add_theme_constant_override("outline_size", 14)
	finish_sub.add_theme_color_override("font_outline_color", Color(0.02, 0.1, 0.06, 0.9))
	finish_box.add_child(finish_sub)

# 確定の表（着順・馬番・馬名・タイム・着差）
func _build_board() -> void:
	board = PanelContainer.new()
	board.set_anchors_preset(Control.PRESET_TOP_LEFT)
	board.position = Vector2(-620, -330)
	board.custom_minimum_size = Vector2(580, 0)
	board.visible = false
	root.add_child(board)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	board.add_child(v)
	var head := HBoxContainer.new()
	head.add_child(UiTheme.label("RESULT", 34, UiTheme.GOLD_BRIGHT))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	head.add_child(UiTheme.label("%s  %s%dm" % [race.race.course, race.race.surface, int(race.race.dist)], 22, UiTheme.MUTED))
	v.add_child(head)
	var line := ColorRect.new()
	line.color = UiTheme.GOLD_DIM
	line.custom_minimum_size = Vector2(0, 2)
	v.add_child(line)
	board_rows = VBoxContainer.new()
	board_rows.add_theme_constant_override("separation", 3)
	v.add_child(board_rows)

# 確定の表の行（模擬のときは終わってから結果が決まるので、出す時に作る）
var _board_built := false
func _fill_board() -> void:
	if _board_built:
		return
	_board_built = true
	var res: Array = race.results
	for k in mini(res.size(), 8):
		var r: Dictionary = res[k]
		var info: Dictionary = {}
		for h in race.horses:
			if int(h.num) == int(r.num):
				info = h
		var row := PanelContainer.new()
		var mine := int(r.num) == int(race.horses[src.me].num)
		row.add_theme_stylebox_override("panel", UiTheme.row_box(k, mine))
		row.custom_minimum_size.y = 46
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 12)
		row.add_child(h)
		var pl := UiTheme.label(str(int(r.pos)), 30, UiTheme.GOLD_BRIGHT if k < 3 else UiTheme.IVORY, HORIZONTAL_ALIGNMENT_CENTER)
		pl.custom_minimum_size.x = 36
		h.add_child(pl)
		h.add_child(UiTheme.frame_box(int(info.get("frame", 1)), int(r.num), 34, 20))
		var nm := UiTheme.label(String(r.name), 26, UiTheme.GOLD_BRIGHT if mine else UiTheme.IVORY)
		nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(nm)
		var tm := UiTheme.label(UiRaceHud.fmt_time(float(r.time)) if k == 0 else String(r.margin), 24, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
		tm.custom_minimum_size.x = 110
		h.add_child(tm)
		board_rows.add_child(row)

# 中継のカメラのとき：上位の並びと実況の字幕
func _build_tv() -> void:
	tv_box = VBoxContainer.new()
	tv_box.position = Vector2(30, 210)
	(tv_box as VBoxContainer).add_theme_constant_override("separation", 3)
	root.add_child(tv_box)
	for k in 6:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		var pl := UiTheme.label(str(k + 1), 24, UiTheme.GOLD_BRIGHT, HORIZONTAL_ALIGNMENT_CENTER)
		pl.custom_minimum_size.x = 28
		row.add_child(pl)
		var fb := UiTheme.frame_box(1, 1, 32, 18)
		row.add_child(fb)
		var nm := UiTheme.label("", 22, UiTheme.IVORY)
		nm.add_theme_constant_override("outline_size", 8)
		nm.add_theme_color_override("font_outline_color", Color(0.02, 0.08, 0.05, 0.85))
		row.add_child(nm)
		tv_box.add_child(row)
		tv_rows.append([fb, nm])
	telop_panel = PanelContainer.new()
	telop_panel.add_theme_stylebox_override("panel", UiTheme.panel(0.82))
	telop_panel.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	telop_panel.position = Vector2(-640, -120)
	telop_panel.custom_minimum_size = Vector2(1280, 72)
	root.add_child(telop_panel)
	telop = UiTheme.label("", 30, UiTheme.IVORY, HORIZONTAL_ALIGNMENT_CENTER)
	telop_panel.add_child(telop)

static func ordinal(n: int) -> String:
	if n % 100 >= 11 and n % 100 <= 13:
		return "th"
	match n % 10:
		1: return "st"
		2: return "nd"
		3: return "rd"
	return "th"

func show_cue(text: String, t: float, dur := 1.6) -> void:
	cue.text = text
	cue_t = t
	cue_dur = dur

# 毎コマ。st＝{t, H（各馬）, me_x, me_v, rank, gear, E, tension, hand, whip_age, phase, after_t, place, look}
func update(st: Dictionary) -> void:
	var t: float = st.t
	var phase: String = st.phase
	var ride := mode != "tv"
	var D: float = src.D
	var rem := maxf(0.0, D - float(st.me_x))
	dist_l.text = _comma(int(ceil(rem))) if rem > 0.0 else "0"
	top_left.visible = phase == "run" or phase == "gate"
	place_l.get_parent().visible = phase == "run" and t > 1.0 and ride
	var rank: int = st.rank
	place_l.text = str(rank)
	place_sfx.text = ordinal(rank)
	place_of_l.text = "/%d" % src.n
	meter.visible = ride and (phase == "run" or phase == "gate")
	meter.st = st
	meter.queue_redraw()
	minimap.visible = phase == "run" or phase == "gate"
	minimap.H = st.H
	minimap.me = src.me
	minimap.queue_redraw()
	# 短い合図：大きく出て、少し縮んで消える
	var age := t - cue_t
	if age >= 0.0 and age < cue_dur:
		cue.visible = true
		var k_in := clampf(age / 0.18, 0.0, 1.0)
		var k_out := clampf((cue_dur - age) / 0.35, 0.0, 1.0)
		cue.modulate.a = k_in * k_out
		var s := 1.25 - 0.25 * (1.0 - pow(1.0 - k_in, 3.0))
		cue.scale = Vector2(s, s)
	else:
		cue.visible = false
	# ゴールのあと：少し流してから着順（英語）→ 確定の表
	var at: float = st.get("after_t", -1.0)
	finish_box.visible = at >= 3.0
	if finish_box.visible:
		var a := at - 3.0
		var place: int = st.place
		finish_l.text = "%d%s" % [place, ordinal(place)]
		var k := clampf(a / 0.35, 0.0, 1.0)
		var e := 1.0 - pow(1.0 - k, 3.0)
		finish_l.scale = Vector2.ONE * (1.6 - 0.6 * e)
		finish_l.modulate.a = e
		finish_l.add_theme_color_override("font_color", UiTheme.GOLD_BRIGHT if place == 1 else (UiTheme.IVORY if place <= 3 else UiTheme.MUTED))
		finish_sub.text = UiRaceHud.fmt_time(float(st.get("my_time", 0.0)))
		finish_sub.modulate.a = clampf((a - 0.4) / 0.4, 0.0, 1.0)
		var up := clampf((a - 2.2) / 0.5, 0.0, 1.0)
		finish_box.position.x = -420.0 * (1.0 - pow(1.0 - up, 3.0))
	board.visible = at >= 5.2 and race.get("results", []).size() > 0
	if board.visible:
		_fill_board()
		var b := clampf((at - 5.2) / 0.45, 0.0, 1.0)
		board.modulate.a = b
		board.position = Vector2(root.size.x - 640 + 80.0 * pow(1.0 - b, 3.0), root.size.y / 2.0 - board.size.y / 2.0)
	# 中継の表示
	tv_box.visible = mode == "tv" and phase == "run"
	telop_panel.visible = false
	if tv_box.visible:
		var order: Array = st.order
		for k in tv_rows.size():
			var j: int = order[k]
			var info: Dictionary = race.horses[j]
			var fb: PanelContainer = tv_rows[k][0]
			var fk := clampi(int(info.frame) - 1, 0, 7)
			(fb.get_theme_stylebox("panel") as StyleBoxFlat).bg_color = UiTheme.FRAME_BG[fk]
			var fl: Label = fb.get_child(0)
			fl.text = str(int(info.num))
			fl.add_theme_color_override("font_color", UiTheme.FRAME_FG[fk])
			var nl: Label = tv_rows[k][1]
			nl.text = String(info.name)
			nl.add_theme_color_override("font_color", UiTheme.GOLD_BRIGHT if j == src.me else UiTheme.IVORY)
		var tl: Array = src.telop_at(t)
		telop_panel.visible = String(tl[0]) != "" and t - float(tl[1]) < 6.0
		telop.text = tl[0]

static func _comma(n: int) -> String:
	var s := str(n)
	if s.length() > 3:
		s = s.substr(0, s.length() - 3) + "," + s.substr(s.length() - 3)
	return s
