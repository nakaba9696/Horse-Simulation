# 押すボタンの印（持ち主の指摘 2026-10-20「各UIのところにボタン何押せばいいか表示して　ゲートインの横にスタートボタンのマークとか」）
# コードで描く簡単な形：パッドの A・B・X・Y は丸、LB・RB・Start・Back・十字は角の丸い札、キーボードはキーの札。
# 金の線（godot/assets/ui のアイコンの金の線に合わせる）・暗い地・金の字。いま使っている入力（UiPad.using_pad）で字と形を替える
class_name UiGlyph
extends Control

const FACE := ["A", "B", "X", "Y"]

var key := ""      # キーボードの字（Enter・Esc・Q など）
var padk := ""     # パッドの字（A・B・LB・Start など）
var fs := 12
var _shown := -1   # 描いたときの入力（0 キーボード・1 パッド）

static func make(k: String, p: String, font_size := 12) -> UiGlyph:
	var g := UiGlyph.new()
	g.key = k
	g.padk = p
	g.fs = font_size
	g.mouse_filter = Control.MOUSE_FILTER_IGNORE
	g.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	g._fit()
	return g

func text_now() -> String:
	return padk if UiPad.using_pad else key

static func width_of(t: String, on_pad: bool, font_size: int) -> float:
	var h := font_size + 12.0
	if on_pad and t in FACE: return h
	return maxf(h, UiTheme.num_font().get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x + 14.0)

func _fit() -> void:
	_shown = 1 if UiPad.using_pad else 0
	custom_minimum_size = Vector2(width_of(text_now(), UiPad.using_pad, fs), fs + 12.0)
	size = custom_minimum_size
	queue_redraw()

func _process(_d: float) -> void:
	if (1 if UiPad.using_pad else 0) != _shown:
		_fit()

func _draw() -> void:
	var t := text_now()
	var r := Rect2(Vector2.ZERO, custom_minimum_size)
	var gold := UiTheme.GOLD
	var bg := Color(UiTheme.SUNK.r, UiTheme.SUNK.g, UiTheme.SUNK.b, 0.92)
	if UiPad.using_pad and t in FACE:
		var c := r.size / 2.0
		var rad := r.size.y / 2.0 - 1.0
		draw_circle(c, rad, bg)
		draw_arc(c, rad - 0.5, 0, TAU, 32, gold, 1.6, true)
	else:
		var sb := StyleBoxFlat.new()
		sb.bg_color = bg
		sb.border_color = gold
		sb.set_border_width_all(1)
		sb.border_width_bottom = 2   # キーの厚み
		sb.set_corner_radius_all(int(r.size.y / 2.0) if UiPad.using_pad else 5)
		sb.anti_aliasing = true
		draw_style_box(sb, r)
	var f := UiTheme.num_font()
	var tw := f.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs)
	draw_string(f, Vector2((r.size.x - tw.x) / 2.0, r.size.y / 2.0 + fs * 0.36), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, UiTheme.GOLD_BRIGHT)

# ボタンの中の左に印を置く（ボタンの字は右へずらす）。札にも印があると分かるよう meta "glyph" を付ける
static func attach(b: Control, k: String, p: String, font_size := 12) -> UiGlyph:
	var g := make(k, p, font_size)
	g.set_anchors_preset(Control.PRESET_CENTER_LEFT)
	g.position = Vector2(10, -g.custom_minimum_size.y / 2.0)
	g.grow_vertical = Control.GROW_DIRECTION_BOTH
	b.add_child(g)
	b.set_meta("glyph", g)
	if b is Button:
		for st in ["normal", "hover", "focus", "pressed", "hover_pressed", "disabled"]:
			var base: StyleBox = (b as Button).get_theme_stylebox(st)
			if base == null: continue
			var sb := base.duplicate() as StyleBox
			sb.content_margin_left = maxf(sb.content_margin_left, maxf(width_of(k, false, font_size), width_of(p, true, font_size)) + 16.0)
			(b as Button).add_theme_stylebox_override(st, sb)
	return g
