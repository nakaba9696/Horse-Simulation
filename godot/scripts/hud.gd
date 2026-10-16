# 画面の上に重ねる表示：レース名・残り・時計・順位・実況の字幕・確定の掲示板・カメラの名前
# ブラウザ版（js/ui/watch3d.js）と同じ中身を出す
class_name RaceHud
extends CanvasLayer

var font: Font
var race: Dictionary
var title: Label
var remain: Label
var clock: Label
var order_box: VBoxContainer
var order_rows: Array = []
var telop_panel: PanelContainer
var telop: Label
var board: PanelContainer
var board_head: Label
var board_rows: Array = []
var cam_label: Label
var help: Label

func panel_style(bg: Color, border: Color, radius := 10, bw := 2) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(bw)
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = 18
	sb.content_margin_right = 18
	sb.content_margin_top = 10
	sb.content_margin_bottom = 10
	sb.shadow_color = Color(0, 0, 0, 0.45)
	sb.shadow_size = 8
	return sb

func mk_label(text: String, size: int, col: Color, outline := 0) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", font)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	if outline > 0:
		l.add_theme_constant_override("outline_size", outline)
		l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	return l

func setup(f: Font, r: Dictionary, horses: Array) -> void:
	font = f
	race = r
	# 左上：レース名・残り・時計
	var tl := PanelContainer.new()
	tl.add_theme_stylebox_override("panel", panel_style(Color(0.03, 0.07, 0.13, 0.84), Color(0.79, 0.64, 0.23), 12, 3))
	tl.position = Vector2(28, 26)
	tl.custom_minimum_size = Vector2(460, 0)
	add_child(tl)
	var v := VBoxContainer.new()
	tl.add_child(v)
	var grade := String(r.race.grade)
	title = mk_label("%s  %s" % [r.race.name, grade], 34, Color(1.0, 0.83, 0.3))
	v.add_child(title)
	var sub := mk_label("%s %s%dm  %s" % [r.race.course, r.race.surface, int(r.race.dist), r.race.ground], 20, Color(0.8, 0.85, 0.92))
	v.add_child(sub)
	var h := HBoxContainer.new()
	v.add_child(h)
	remain = mk_label("発走前", 38, Color(1, 1, 1))
	remain.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(remain)
	clock = mk_label("", 30, Color(1, 1, 1))
	h.add_child(clock)
	# 右：順位
	var rp := PanelContainer.new()
	rp.add_theme_stylebox_override("panel", panel_style(Color(0.03, 0.07, 0.13, 0.8), Color(0.79, 0.64, 0.23, 0.6), 12, 2))
	rp.position = Vector2(1920 - 28 - 340, 26)
	rp.custom_minimum_size = Vector2(340, 0)
	add_child(rp)
	order_box = VBoxContainer.new()
	order_box.add_theme_constant_override("separation", 4)
	rp.add_child(order_box)
	for k in 8:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 10)
		var pos := mk_label(str(k + 1), 24, Color(1.0, 0.83, 0.3))
		pos.custom_minimum_size = Vector2(28, 0)
		pos.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		row.add_child(pos)
		var chip := PanelContainer.new()
		var cs := StyleBoxFlat.new()
		cs.set_corner_radius_all(4)
		chip.add_theme_stylebox_override("panel", cs)
		chip.custom_minimum_size = Vector2(40, 32)
		var nl := mk_label("", 22, Color.WHITE)
		nl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		nl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		nl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		chip.add_child(nl)
		row.add_child(chip)
		var name := mk_label("", 24, Color.WHITE)
		row.add_child(name)
		order_box.add_child(row)
		order_rows.append([chip, nl, name, cs])
	# 下：実況の字幕
	telop_panel = PanelContainer.new()
	telop_panel.add_theme_stylebox_override("panel", panel_style(Color(0.03, 0.06, 0.12, 0.88), Color(0.79, 0.64, 0.23), 12, 3))
	telop_panel.position = Vector2(160, 1080 - 150)
	telop_panel.custom_minimum_size = Vector2(1600, 92)
	add_child(telop_panel)
	telop = mk_label("", 38, Color.WHITE)
	telop.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	telop.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	telop_panel.add_child(telop)
	# 確定の掲示板
	board = PanelContainer.new()
	board.add_theme_stylebox_override("panel", panel_style(Color(0.04, 0.04, 0.04, 0.94), Color(0.35, 0.35, 0.35), 10, 4))
	board.position = Vector2(1920 / 2 - 330, 200)
	board.custom_minimum_size = Vector2(660, 0)
	board.visible = false
	add_child(board)
	var bv := VBoxContainer.new()
	board.add_child(bv)
	board_head = mk_label("審 議 中", 36, Color(1.0, 0.6, 0.12))
	board_head.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	bv.add_child(board_head)
	for i in 5:
		var res: Dictionary = r.results[i]
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 26)
		var a := mk_label(str(i + 1), 40, Color(1.0, 0.6, 0.12))
		a.custom_minimum_size = Vector2(50, 0)
		row.add_child(a)
		var b := mk_label(str(int(res.num)), 48, Color(1.0, 0.71, 0.28))
		b.custom_minimum_size = Vector2(70, 0)
		row.add_child(b)
		var c := mk_label(String(res.name), 32, Color(1.0, 0.81, 0.54))
		c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(c)
		var d := mk_label(fmt_time(res.time) if i == 0 else String(res.margin), 28, Color(1.0, 0.6, 0.12))
		row.add_child(d)
		bv.add_child(row)
	cam_label = mk_label("", 22, Color(1, 1, 1, 0.85), 6)
	cam_label.position = Vector2(30, 1080 - 48)
	add_child(cam_label)
	help = mk_label("", 18, Color(1, 1, 1, 0.7), 5)
	help.position = Vector2(1920 - 760, 1080 - 40)
	add_child(help)

static func fmt_time(t: float) -> String:
	var m := int(t / 60.0)
	var s := t - m * 60.0
	return "%d:%04.1f" % [m, s]

# P＝各馬の [x, lane, v]、fin＝各馬のゴールの時刻（null 可）
func update(T: float, P: Array, horses: Array, telop_text: String, telop_t: float, cam_name: String) -> void:
	var D: float = race.track.D
	var winT: float = race.winnerTime
	var order: Array = []
	for j in P.size():
		var fin = horses[j].fin
		order.append([P[j][0], j, fin if fin != null and fin <= T else null])
	order.sort_custom(func(a, b):
		if a[2] != null and b[2] != null: return a[2] < b[2]
		if a[2] != null: return true
		if b[2] != null: return false
		return a[0] > b[0])
	var lead: float = order[0][0]
	var rem := maxi(0, int(ceil(D - lead)))
	remain.text = "発走前" if T <= 0.0 else ("残り %dm" % rem if rem > 0 else "ゴール")
	clock.text = fmt_time(minf(T, winT)) if T > 0.0 else ""
	for k in 8:
		var info: Dictionary = horses[order[k][1]].info
		var row: Array = order_rows[k]
		(row[3] as StyleBoxFlat).bg_color = Color.html(String(info.cap))
		(row[1] as Label).text = str(int(info.num))
		(row[1] as Label).add_theme_color_override("font_color", Color.html(String(info.capText)))
		var nm := String(info.name)
		(row[2] as Label).text = nm if nm.length() <= 9 else nm.substr(0, 9) + "…"
		(row[2] as Label).add_theme_color_override("font_color", Color(1.0, 0.85, 0.35) if horses[order[k][1]].mine else Color.WHITE)
	telop_panel.visible = telop_text != "" and T - telop_t < 7.0
	telop.text = telop_text
	board.visible = T > winT + 0.4
	board.modulate.a = clampf((T - winT - 0.4) / 0.5, 0.0, 1.0)
	board_head.text = "確 定" if T > winT + 2.5 else "審 議 中"
	cam_label.text = cam_name
