# 画面の共通の部品（docs/UI.md のテーマ「夕方の競馬場の貴賓席」：深い芝の緑の地・金の縁取り・明朝の題字）。どの画面もここの色・字・部品で作る
# 値（色・px・角丸）は docs/UI.md（1600×1000 の画面が基準。project.godot の画面の大きさも 1600×1000）
# 部品：見出しの帯（band）・数値の札（chip）・能力の数の札（stat_chip。段の色）・格の札（grade_chip）・枠の色の札（frame_box）・表の行（row_box）・ボタン（Theme の Button、主な操作は gold_button）・操作の案内（keybar）
# 参考の作品の画面・配色・英語の飾り文字は写さない（GAM-74）
class_name UiTheme
extends RefCounted

# ---- 色（役目ごと。直書きしない） ----
const BG := Color("07140d")              # 地
const BG_LIGHT := Color("134a30")        # 地の上の光
const SURFACE := Color(0.051, 0.129, 0.090, 0.84)   # 板 #0d2117（84%）
const SURFACE_2 := Color("12291d")       # ボタン・カード
const SURFACE_3 := Color("183627")       # 乗せたときの行
const SUNK := Color("091a11")            # 溝
const BRAND_TOP := Color("1b5536")       # 帯（上→下）
const BRAND_BOTTOM := Color("103a24")
const GOLD := Color("d6ad4c")            # 金
const GOLD_BRIGHT := Color("f2d98e")
const GOLD_DIM := Color("a37a26")        # 暗い金
const GOLD_FACE := [Color("f6e1a0"), Color("dcb455"), Color("c4952f")]   # 金の面（上→下）
const ON_GOLD := Color("1e1604")         # 金の面の上の字
const IVORY := Color("edf3ee")           # 字
const MUTED := Color("a6bdad")           # 控えめ
const FAINT := Color("789283")           # 薄い
const GOOD := Color("63d293")
const BAD := Color("ff7d70")
const WARN := Color("ffbd5a")
const COOL := Color("82c8ff")
const RED := Color("ff7d70")             # 脚質の印の光（悪い色と同じ赤）
const TURF := Color("3a8a4a")
const DIRT := Color("a8794a")
const GRADE := {"G1": Color("2457c4"), "G2": Color("c3313a"), "G3": Color("23904a"), "Jpn": Color("6d45ba"), "OP": Color("5a6270")}
const LINE := Color(0.87, 0.925, 0.886, 0.09)      # 髪の毛の線
const LINE_STRONG := Color(0.87, 0.925, 0.886, 0.16)
const LINE_GOLD := Color(0.87, 0.72, 0.36, 0.55)
const SHADOW := Color(0, 0, 0, 0.5)
# 枠の色（1〜8枠）と字の色（1・5・8 が黒）
const FRAME_BG := [Color("ffffff"), Color("222222"), Color("e0312f"), Color("2a63d4"), Color("f2cf1d"), Color("2c9a48"), Color("f08a1c"), Color("f07fb0")]
const FRAME_FG := [Color("111111"), Color("ffffff"), Color("ffffff"), Color("ffffff"), Color("111111"), Color("ffffff"), Color("ffffff"), Color("111111")]
# ---- 能力の段（docs/UI.md「能力の段」。持ち主の指摘 2026-10-17「ステータスの数値によって色つけてください　数字だけだとわかりにくいので」） ----
# 段：0 低い（暗い青）・1 ふつう（灰）・2 良い（緑）・3 とても良い（金）・4 飛び抜けている（紅。光る）
# 境目は「この値から上がその段」。史実馬・スペシャルホースの値を数えて決めた（docs/UI.md）。JS 版（js/ui/uikit.js の K.TIER）と同じ値にする（tests/extra_ui.js が比べる）
const TIER_NAMES := ["低い", "ふつう", "良い", "とても良い", "飛び抜けている"]
const TIER_FH := [51, 61, 66, 81]      # 総合力（芝・ダ 1〜99）
const TIER_STAT := [60, 75, 85, 95]    # 能力（芝SP・芝ST・ダSP・ダST・根性・気性・坂 20〜120）
const TIER_KIRE := [3, 5, 7, 8]        # 脚の切れ（1〜8）
const TIER_BG := [Color("15283a"), Color("26362e"), Color("1d6a42"), Color("7d5c14"), Color("a5233c")]
const TIER_FG := [Color("8fb0c8"), Color("edf3ee"), Color("ffffff"), Color("ffe8a6"), Color("ffffff")]
const TIER_LINE := [Color(0, 0, 0, 0), Color(0.87, 0.925, 0.886, 0.16), Color(0.39, 0.82, 0.58, 0.85), Color("f2d98e"), Color("ffb3a6")]
const TIER_LINE_W := [0, 1, 1, 2, 2]
# 前の名前（ほかのファイルの呼び名）
const GREEN_DEEP := SUNK
const GREEN := Color("0d2117")
const GREEN_LIGHT := SURFACE_3

# ---- 角丸（階層で変える） ----
const R_CHIP := 6
const R_BUTTON := 10
const R_PANEL := 14
const R_WINDOW := 18

static var _font: Font
static var _mincho: Font
static var _num: Font
static var _theme: Theme

# 本文のゴシック
static func font() -> Font:
	if _font == null:
		_font = load("res://assets/fonts/NotoSansJP_700Bold.ttf")
	return _font

# 題字の明朝（無い字はゴシックで）
static func mincho() -> Font:
	if _mincho == null:
		var f: FontFile = load("res://assets/fonts/NotoSerifJP_900Black_sub.ttf")
		if f == null:
			return font()
		f.fallbacks = [font()]
		_mincho = f
	return _mincho

# 数（等幅の数字。tabular-nums）
static func num_font() -> Font:
	if _num == null:
		var fv := FontVariation.new()
		fv.base_font = font()
		fv.opentype_features = {"tnum": 1}
		_num = fv
	return _num

static func box(bg: Color, border := Color(0, 0, 0, 0), bw := 0, radius := R_CHIP, pad := Vector4(16, 10, 16, 10)) -> StyleBoxFlat:
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

# 板：写真が透ける深緑に、髪の毛の線の縁と影
static func panel(alpha := 0.84, radius := R_PANEL) -> StyleBoxFlat:
	var sb := box(Color(GREEN.r, GREEN.g, GREEN.b, alpha), LINE_STRONG, 1, radius, Vector4(18, 14, 18, 14))
	sb.shadow_color = SHADOW
	sb.shadow_size = 12
	sb.shadow_offset = Vector2(0, 4)
	return sb

# 金の縁の板（右の見本など）
static func panel_gold(alpha := 0.88) -> StyleBoxFlat:
	var sb := panel(alpha)
	sb.border_color = LINE_GOLD
	return sb

# ボタン：普通は板2に線と下の厚み（3px の影）。押すと 2px 沈む
static func _btn(bg: Color, border: Color, bottom: Color, top_line := Color(0, 0, 0, 0)) -> Array:
	var n := box(bg, border, 1, R_BUTTON, Vector4(28, 9, 28, 11))
	n.border_width_bottom = 4
	n.border_color = border
	n.shadow_color = Color(0, 0, 0, 0.45)
	n.shadow_size = 3
	n.shadow_offset = Vector2(0, 3)
	if top_line.a > 0.0:
		n.border_width_top = 2
	var bb := n.duplicate() as StyleBoxFlat
	bb.border_color = bottom
	var p := bb.duplicate() as StyleBoxFlat
	p.border_width_bottom = 2
	p.content_margin_top = 11
	p.content_margin_bottom = 9
	p.shadow_offset = Vector2(0, 1)
	return [bb, p]

static func get_theme() -> Theme:
	if _theme != null:
		return _theme
	var t := Theme.new()
	t.default_font = font()
	t.default_font_size = 15
	t.set_color("font_color", "Label", IVORY)
	t.set_stylebox("panel", "PanelContainer", panel())
	t.set_stylebox("panel", "Panel", panel())
	# 普通のボタン
	var nb := _btn(SURFACE_2, LINE_STRONG, Color(0, 0, 0, 0.55))
	var hv := (nb[0] as StyleBoxFlat).duplicate() as StyleBoxFlat
	hv.bg_color = SURFACE_3
	var fo := hv.duplicate() as StyleBoxFlat
	fo.border_color = GOLD
	fo.set_border_width_all(2)
	fo.border_width_bottom = 4
	t.set_stylebox("normal", "Button", nb[0])
	t.set_stylebox("hover", "Button", hv)
	t.set_stylebox("focus", "Button", fo)
	t.set_stylebox("pressed", "Button", nb[1])
	# 押せないボタンは押せる形をしていない（厚みなし・沈みの色・薄い字）
	t.set_stylebox("disabled", "Button", box(Color(SUNK.r, SUNK.g, SUNK.b, 0.7), LINE, 1, R_BUTTON, Vector4(28, 9, 28, 11)))
	t.set_color("font_disabled_color", "Button", FAINT)
	t.set_stylebox("hover_pressed", "Button", nb[1])
	t.set_color("font_color", "Button", IVORY)
	t.set_color("font_hover_color", "Button", IVORY)
	t.set_color("font_focus_color", "Button", GOLD_BRIGHT)
	t.set_color("font_pressed_color", "Button", GOLD_BRIGHT)
	t.set_font_size("font_size", "Button", 18)
	_theme = t
	return t

# 主な操作の金のボタン（金の面・暗い金の厚み・金の上の字）。選んでいるときは明るい金の縁が光る
static func gold_button(b: Button) -> void:
	var face: Color = GOLD_FACE[1]
	var nb := _btn(face, GOLD_FACE[0], GOLD_DIM, GOLD_FACE[0])
	var n: StyleBoxFlat = nb[0]
	n.border_color = GOLD_DIM
	n.border_width_top = 2
	n.border_width_left = 1
	n.border_width_right = 1
	n.border_blend = false
	var hv := n.duplicate() as StyleBoxFlat
	hv.bg_color = GOLD_FACE[0].lerp(face, 0.5)
	var fo := hv.duplicate() as StyleBoxFlat
	fo.border_color = Color(1, 0.97, 0.85)
	fo.set_border_width_all(3)
	fo.border_width_bottom = 5
	fo.shadow_color = Color(GOLD.r, GOLD.g, GOLD.b, 0.55)
	fo.shadow_size = 14
	fo.shadow_offset = Vector2(0, 0)
	b.add_theme_stylebox_override("normal", n)
	b.add_theme_stylebox_override("hover", hv)
	b.add_theme_stylebox_override("focus", fo)
	b.add_theme_stylebox_override("pressed", nb[1])
	b.add_theme_stylebox_override("hover_pressed", nb[1])
	for k in ["font_color", "font_hover_color", "font_focus_color", "font_pressed_color"]:
		b.add_theme_color_override(k, ON_GOLD)

static func label(text: String, size := 15, col := IVORY, align := HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	l.horizontal_alignment = align
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	return l

# 題字（明朝）
static func title(text: String, size := 26, col := IVORY) -> Label:
	var l := label(text, size, col)
	l.add_theme_font_override("font", mincho())
	return l

# 数（等幅）
static func num_label(text: String, size := 15, col := IVORY, align := HORIZONTAL_ALIGNMENT_CENTER) -> Label:
	var l := label(text, size, col, align)
	l.add_theme_font_override("font", num_font())
	return l

# 数値の札：小さな角丸の札
static func chip(text: String, bg := SURFACE_3, fg := IVORY, size := 14, w := 0.0) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", box(bg, Color(0, 0, 0, 0.25), 1, R_CHIP, Vector4(9, 2, 9, 3)))
	var l := label(text, size, fg, HORIZONTAL_ALIGNMENT_CENTER)
	p.add_child(l)
	if w > 0.0:
		p.custom_minimum_size.x = w
	return p

# 能力の段（0〜4）。kind：fh（総合力）・stat（能力）・kire（脚の切れ）
static func tier(v: float, kind := "fh") -> int:
	var cut: Array = TIER_FH if kind == "fh" else (TIER_KIRE if kind == "kire" else TIER_STAT)
	var t := 0
	for c in cut:
		if roundf(v) >= float(c):
			t += 1
	return t

# 能力の数の札：段の色の地・字・縁。上の段ほど縁が太く、字も太く（色だけに頼らない）。飛び抜けている段は紅く光る
static func stat_chip(v: float, kind := "fh", big := false, txt := "") -> PanelContainer:
	var t := tier(v, kind)
	var p := PanelContainer.new()
	var sb := box(TIER_BG[t], TIER_LINE[t], TIER_LINE_W[t], R_CHIP, Vector4(7, 1, 7, 2) if not big else Vector4(9, 3, 9, 4))
	if t == 4:
		sb.shadow_color = Color(1.0, 0.33, 0.4, 0.55)
		sb.shadow_size = 6
	p.add_theme_stylebox_override("panel", sb)
	var l := num_label(txt if txt != "" else str(int(roundf(v))), 17 if big else 14, TIER_FG[t])
	if t >= 3:
		l.add_theme_color_override("font_outline_color", TIER_FG[t])
		l.add_theme_constant_override("outline_size", 2)
	p.add_child(l)
	p.custom_minimum_size.x = 48.0 if big else 34.0
	p.tooltip_text = TIER_NAMES[t]
	return p

# 枠の色の札（馬番）
static func frame_box(frame: int, num: int, size := 28.0, fs := 16) -> PanelContainer:
	var k := clampi(frame - 1, 0, 7)
	var p := PanelContainer.new()
	var sb := box(FRAME_BG[k], Color(0, 0, 0, 0.35) if k != 1 else Color(1, 1, 1, 0.3), 1, R_CHIP, Vector4(0, 0, 0, 0))
	p.add_theme_stylebox_override("panel", sb)
	p.custom_minimum_size = Vector2(size, size)
	var l := num_label(str(num), fs, FRAME_FG[k])
	p.add_child(l)
	return p

# 格の札（G1 青・G2 赤・G3 緑・Jpn 紫・OP 灰。白い字）
static func grade_chip(grade: String, size := 15) -> PanelContainer:
	var bg: Color = GRADE.get(grade, GRADE.OP)
	return chip(grade, bg, Color.WHITE, size)

# 芝・ダの札
static func surface_chip(surface: String, dist: int, size := 16) -> PanelContainer:
	return chip("%s %dm" % [surface, dist], TURF if surface == "芝" else DIRT, Color.WHITE, size)

# 表の行の地：板の色・上に髪の毛の線。選ぶと金を 16% 混ぜ、上下と左に金の線。自分の物は左の金の線が常に光る
static func row_box(_i: int, selected := false, mine := false) -> StyleBoxFlat:
	var c := Color(GREEN.r, GREEN.g, GREEN.b, 0.84)
	var sb := box(c, LINE, 0, 10, Vector4(10, 0, 12, 0))
	sb.border_width_top = 1
	if selected:
		sb.bg_color = Color(GREEN.r, GREEN.g, GREEN.b, 0.9).lerp(GOLD, 0.16)
		sb.border_color = LINE_GOLD
		sb.border_width_top = 1
		sb.border_width_bottom = 1
		sb.border_width_left = 3
		sb.border_color = GOLD
	elif mine:
		sb.border_width_left = 3
		sb.border_color = GOLD
	return sb

# 見出しの帯（UiBand）
static func band(h := 76.0) -> UiBand:
	var b := UiBand.new()
	b.custom_minimum_size.y = h
	return b

# 操作の案内（右下の丸い帯）。pad＝ゲームパッドで遊んでいるか
static func keybar(items: Array, pad := false) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", box(Color(SUNK.r, SUNK.g, SUNK.b, 0.86), LINE_STRONG, 1, 999, Vector4(16, 5, 16, 6)))
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 14)
	p.add_child(h)
	for it in items:
		var g := HBoxContainer.new()
		g.add_theme_constant_override("separation", 5)
		var k := chip(String(it[1] if pad else it[0]), SURFACE_3, IVORY, 11)
		g.add_child(k)
		g.add_child(label(String(it[2]), 12, MUTED))
		h.add_child(g)
	return p

# タブ（docs/UI.md「タブ」）：沈みの溝に高さ 38px のタブ。選んだタブは金の面。両端に Q・E（パッドは LB・RB）。押すと on_pick(i)
static func tabs(items: Array, cur: int, pad := false, on_pick = null) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", box(SUNK, LINE, 1, 999, Vector4(6, 5, 6, 5)))
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 4)
	p.add_child(h)
	h.add_child(chip("LB" if pad else "Q", SURFACE_3, MUTED, 11))
	for i in items.size():
		var b := Button.new()
		b.text = String(items[i])
		b.focus_mode = Control.FOCUS_NONE
		b.custom_minimum_size = Vector2(120, 38)
		b.add_theme_font_size_override("font_size", 15)
		if i == cur:
			gold_button(b)
		else:
			b.add_theme_stylebox_override("normal", box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 999, Vector4(16, 6, 16, 6)))
			b.add_theme_stylebox_override("hover", box(SURFACE_3, Color(0, 0, 0, 0), 0, 999, Vector4(16, 6, 16, 6)))
			b.add_theme_color_override("font_color", MUTED)
		if on_pick != null:
			var k: int = i
			b.pressed.connect(func(): on_pick.call(k))
		h.add_child(b)
	h.add_child(chip("RB" if pad else "E", SURFACE_3, MUTED, 11))
	return p

# 適性の印（◎ 良い・○ 字・△ 注意・× 悪い）
static func mark(lv: int, size := 17) -> Label:
	var t: String = ["×", "△", "○", "◎"][clampi(lv, 0, 3)]
	var c: Color = [Color(BAD.r, BAD.g, BAD.b, 0.8), WARN, IVORY, GOOD][clampi(lv, 0, 3)]
	return label(t, size, c, HORIZONTAL_ALIGNMENT_CENTER)

# 格の札か、オープン（OP・L）の枠だけの札
static func class_chip(text: String, graded: bool, size := 13) -> PanelContainer:
	if graded:
		return grade_chip(text, size)
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", box(Color(0, 0, 0, 0), LINE_STRONG, 1, R_CHIP, Vector4(8, 1, 8, 2)))
	p.add_child(label(text, size, MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	return p
