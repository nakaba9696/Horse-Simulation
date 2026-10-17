# 見せ場の後ろの絵（docs/UI.md「一瞬だけ派手」）：真ん中から回る金の光の筋と、舞い落ちる紙吹雪。
# 紙吹雪の位置は番号から決めるので乱数は使わない（ゲームの結果に関わらない飾り）
class_name UiCelebrate
extends Control

var t := 0.0
var strength := 1.0

func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_preset(Control.PRESET_FULL_RECT)

func _process(delta: float) -> void:
	t += delta
	queue_redraw()

func _draw() -> void:
	var c := size * Vector2(0.5, 0.42)
	var R := size.length()
	# 光の筋（16本。ゆっくり回る）
	for i in 16:
		var a := t * 0.12 + TAU * i / 16.0
		var w := 0.07
		var col := Color(UiTheme.GOLD.r, UiTheme.GOLD.g, UiTheme.GOLD.b, 0.10 * strength)
		draw_colored_polygon(PackedVector2Array([c, c + Vector2(cos(a - w), sin(a - w)) * R, c + Vector2(cos(a + w), sin(a + w)) * R]), col)
	# 真ん中の光
	for k in 6:
		draw_circle(c, 260.0 - k * 40.0, Color(UiTheme.GOLD_BRIGHT.r, UiTheme.GOLD_BRIGHT.g, UiTheme.GOLD_BRIGHT.b, 0.035 * strength))
	# 紙吹雪（金・白・芝の緑）
	var cols := [UiTheme.GOLD_BRIGHT, Color(1, 1, 1, 0.9), UiTheme.GOOD, UiTheme.GOLD]
	for i in 70:
		var fx := fmod(i * 0.6180339 + 0.13, 1.0)
		var sp := 60.0 + fmod(i * 37.0, 90.0)
		var y := fmod(t * sp + i * 53.0, size.y + 40.0) - 20.0
		var x := fx * size.x + sin(t * 1.7 + i) * 18.0
		var r := t * 2.0 + i
		var p := Vector2(x, y)
		var d := Vector2(cos(r), sin(r)) * 6.0
		var e := Vector2(-d.y, d.x) * 0.5
		draw_colored_polygon(PackedVector2Array([p - d - e, p + d - e, p + d + e, p - d + e]), cols[i % 4])
