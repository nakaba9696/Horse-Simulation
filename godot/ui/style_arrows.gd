# 脚質の印：右向きの矢印4つ（左から 追込・差し・先行・逃げ。右ほど前で走る）。その馬の脚質が赤く光る
class_name UiStyleArrows
extends Control

const ORDER := ["追込", "差し", "先行", "逃げ"]
var style := ""
var lit := 1.0

func _init(s := "") -> void:
	style = s
	custom_minimum_size = Vector2(150, 30)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _draw() -> void:
	var w := size.x / 4.0
	var h := minf(size.y, 26.0)
	var cy := size.y / 2.0
	var on := ORDER.find(style)
	for i in 4:
		var x := i * w + w * 0.18
		var aw := w * 0.64
		var pts := PackedVector2Array([Vector2(x, cy - h * 0.32), Vector2(x + aw * 0.55, cy - h * 0.32), Vector2(x + aw * 0.55, cy - h * 0.5),
			Vector2(x + aw, cy), Vector2(x + aw * 0.55, cy + h * 0.5), Vector2(x + aw * 0.55, cy + h * 0.32), Vector2(x, cy + h * 0.32)])
		if i == on:
			# 光の暈
			var glow := Color(UiTheme.RED.r, UiTheme.RED.g, UiTheme.RED.b, 0.28 * lit)
			draw_circle(Vector2(x + aw * 0.5, cy), h * 0.75, glow)
			draw_colored_polygon(pts, UiTheme.RED.lerp(Color(1, 0.55, 0.45), 0.15))
			var ol := pts.duplicate()
			ol.append(pts[0])
			draw_polyline(ol, Color(1, 0.8, 0.7, 0.9), 1.5, true)
		else:
			var ol2 := pts.duplicate()
			ol2.append(pts[0])
			draw_colored_polygon(pts, Color(UiTheme.GREEN_DEEP.r, UiTheme.GREEN_DEEP.g, UiTheme.GREEN_DEEP.b, 0.6))
			draw_polyline(ol2, Color(UiTheme.GOLD_DIM.r, UiTheme.GOLD_DIM.g, UiTheme.GOLD_DIM.b, 0.9), 1.5, true)
