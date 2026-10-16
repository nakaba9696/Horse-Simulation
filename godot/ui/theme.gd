# 画面の共通の部品（深緑と金、競馬場の格調）。どの画面もここの色・字・部品で作る（持ち主「UIはテーマにそって統一感あわせておしゃれにして」）
# 部品：見出しの帯（band）・タブ（tab）・表の行（row）・数値の札（chip）・ボタン（Theme の Button）・枠の色の四角（frame_box）
# 決まりは docs/UI.md（届いたらそれに合わせる）。参考の作品の画面は写さない
class_name UiTheme
extends RefCounted

# ---- 色 ----
const GREEN_DEEP := Color("0a2219")      # いちばん奥の深緑
const GREEN := Color("103327")           # 板の地
const GREEN_LIGHT := Color("1b4a39")     # 選んだ行・浮いた板
const GOLD := Color("d6b25e")            # 金（線・見出し）
const GOLD_BRIGHT := Color("f3dc9a")     # 光る金
const GOLD_DIM := Color("7d6631")        # 沈んだ金（細い線）
const IVORY := Color("f5f0e2")           # 文字
const MUTED := Color("a9b8ad")           # 添えの文字
const RED := Color("e2483b")             # 強調（脚質の印など）
const SHADOW := Color(0, 0, 0, 0.5)
# 枠の色（1〜8枠）と、その上の字の色
const FRAME_BG := [Color("f4f4f0"), Color("1a1a1a"), Color("d8302a"), Color("2a5fc8"), Color("f0cf2a"), Color("2e9a4a"), Color("f08a24"), Color("f07aa8")]
const FRAME_FG := [Color("1a1a1a"), Color("f4f4f0"), Color("f4f4f0"), Color("f4f4f0"), Color("1a1a1a"), Color("f4f4f0"), Color("1a1a1a"), Color("1a1a1a")]

static var _font: Font
static var _theme: Theme

static func font() -> Font:
	if _font == null:
		_font = load("res://assets/fonts/NotoSansJP_700Bold.ttf")
	return _font

static func box(bg: Color, border := Color(0, 0, 0, 0), bw := 0, radius := 6, pad := Vector4(16, 10, 16, 10)) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(bw)
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = pad.x
	sb.content_margin_top = pad.y
	sb.content_margin_right = pad.z
	sb.content_margin_bottom = pad.w
	sb.anti_aliasing = true
	return sb

# 板：深緑の地に金の細い縁と影
static func panel(alpha := 0.9) -> StyleBoxFlat:
	var sb := box(Color(GREEN.r, GREEN.g, GREEN.b, alpha), Color(GOLD.r, GOLD.g, GOLD.b, 0.85), 2, 10, Vector4(20, 14, 20, 14))
	sb.shadow_color = SHADOW
	sb.shadow_size = 14
	sb.shadow_offset = Vector2(0, 6)
	return sb

static func get_theme() -> Theme:
	if _theme != null:
		return _theme
	var t := Theme.new()
	t.default_font = font()
	t.default_font_size = 24
	t.set_color("font_color", "Label", IVORY)
	t.set_stylebox("panel", "PanelContainer", panel())
	t.set_stylebox("panel", "Panel", panel())
	# ボタン：金の縁の札。選ぶと金が満ちる（ゲームパッドの選びでも同じ）
	var bn := box(Color(GREEN_DEEP.r, GREEN_DEEP.g, GREEN_DEEP.b, 0.92), GOLD, 2, 8, Vector4(34, 12, 34, 12))
	bn.shadow_color = SHADOW
	bn.shadow_size = 8
	bn.shadow_offset = Vector2(0, 4)
	var bh := bn.duplicate() as StyleBoxFlat
	bh.bg_color = GREEN_LIGHT
	bh.border_color = GOLD_BRIGHT
	var bf := bh.duplicate() as StyleBoxFlat
	bf.bg_color = Color(GOLD.r, GOLD.g, GOLD.b, 0.95)
	bf.border_color = GOLD_BRIGHT
	bf.set_border_width_all(3)
	var bp := bf.duplicate() as StyleBoxFlat
	bp.bg_color = GOLD_BRIGHT
	t.set_stylebox("normal", "Button", bn)
	t.set_stylebox("hover", "Button", bh)
	t.set_stylebox("focus", "Button", bf)
	t.set_stylebox("pressed", "Button", bp)
	t.set_stylebox("hover_pressed", "Button", bp)
	t.set_color("font_color", "Button", GOLD_BRIGHT)
	t.set_color("font_hover_color", "Button", IVORY)
	t.set_color("font_focus_color", "Button", GREEN_DEEP)
	t.set_color("font_pressed_color", "Button", GREEN_DEEP)
	t.set_font_size("font_size", "Button", 30)
	_theme = t
	return t

static func label(text: String, size := 24, col := IVORY, align := HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	l.horizontal_alignment = align
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	return l

# 数値の札：小さな角丸の札に数字（能力・斤量・人気など）
static func chip(text: String, bg := GREEN_LIGHT, fg := IVORY, size := 22, w := 0.0) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", box(bg, Color(GOLD_DIM.r, GOLD_DIM.g, GOLD_DIM.b, 0.9), 1, 5, Vector4(10, 2, 10, 2)))
	var l := label(text, size, fg, HORIZONTAL_ALIGNMENT_CENTER)
	p.add_child(l)
	if w > 0.0:
		p.custom_minimum_size.x = w
	return p

# 枠の色の四角（馬番）
static func frame_box(frame: int, num: int, size := 40.0, fs := 24) -> PanelContainer:
	var k := clampi(frame - 1, 0, 7)
	var p := PanelContainer.new()
	var sb := box(FRAME_BG[k], Color(0, 0, 0, 0.35) if k != 1 else Color(1, 1, 1, 0.25), 1, 4, Vector4(0, 0, 0, 0))
	p.add_theme_stylebox_override("panel", sb)
	p.custom_minimum_size = Vector2(size, size)
	var l := label(str(num), fs, FRAME_FG[k], HORIZONTAL_ALIGNMENT_CENTER)
	p.add_child(l)
	return p

# 見出しの帯：左に金の太い線、深緑から透ける帯
static func band(h := 96.0) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(GREEN_DEEP.r, GREEN_DEEP.g, GREEN_DEEP.b, 0.94)
	sb.border_color = GOLD
	sb.border_width_bottom = 3
	sb.border_width_left = 10
	sb.content_margin_left = 30
	sb.content_margin_right = 30
	sb.content_margin_top = 8
	sb.content_margin_bottom = 8
	sb.shadow_color = SHADOW
	sb.shadow_size = 12
	p.add_theme_stylebox_override("panel", sb)
	p.custom_minimum_size.y = h
	return p

# 表の行の地（交互に少しだけ明るさを変える。選んだ行は金の縁）
static func row_box(i: int, selected := false) -> StyleBoxFlat:
	var c := GREEN if i % 2 == 0 else Color(GREEN.r * 1.18, GREEN.g * 1.12, GREEN.b * 1.12)
	var sb := box(Color(c.r, c.g, c.b, 0.86), GOLD_BRIGHT if selected else Color(0, 0, 0, 0), 2 if selected else 0, 4, Vector4(10, 0, 14, 0))
	if selected:
		sb.bg_color = Color(GREEN_LIGHT.r, GREEN_LIGHT.g, GREEN_LIGHT.b, 0.95)
	return sb

# 格の札（G1 は金、G2 は銀に近い、G3 は銅、ほかは緑）
static func grade_chip(grade: String) -> PanelContainer:
	var bg := GREEN_LIGHT
	var fg := IVORY
	match grade:
		"G1": bg = GOLD; fg = GREEN_DEEP
		"G2": bg = Color("c9ccd2"); fg = GREEN_DEEP
		"G3": bg = Color("c48a52"); fg = GREEN_DEEP
	return chip(grade, bg, fg, 26)
