# ミニマップ：コースの形（実際の回り）を金の細い線で、各馬を枠の色の点で。自分の馬は輪で囲む
class_name UiMinimap
extends Control

var tr: ViewTrack
var race: Dictionary
var H: Array = []
var me := 0
var pts := PackedVector2Array()
var _scale := 1.0
var _off := Vector2.ZERO

func setup(track: ViewTrack, r: Dictionary) -> void:
	tr = track
	race = r
	var n := 220
	var mn := Vector2(1e9, 1e9)
	var mx := Vector2(-1e9, -1e9)
	var raw := PackedVector2Array()
	for i in n + 1:
		var a := tr.at(tr.L * i / n)
		var p := Vector2(a.x, -a.y)
		raw.append(p)
		mn = Vector2(minf(mn.x, p.x), minf(mn.y, p.y))
		mx = Vector2(maxf(mx.x, p.x), maxf(mx.y, p.y))
	pts = raw
	_off = -(mn + mx) / 2.0
	_scale = minf(300.0 / maxf(1.0, mx.x - mn.x), 150.0 / maxf(1.0, mx.y - mn.y))

func _to(p: Vector2) -> Vector2:
	return size / 2.0 + (p + _off) * _scale

func _draw() -> void:
	var bg := UiTheme.box(Color(UiTheme.GREEN_DEEP.r, UiTheme.GREEN_DEEP.g, UiTheme.GREEN_DEEP.b, 0.62), Color(0, 0, 0, 0), 0, 12)
	draw_style_box(bg, Rect2(Vector2.ZERO, size))
	var line := PackedVector2Array()
	for p in pts:
		line.append(_to(p))
	draw_polyline(line, Color(UiTheme.GOLD.r, UiTheme.GOLD.g, UiTheme.GOLD.b, 0.75), 3.0, true)
	if H.is_empty():
		return
	var D: float = race.track.D
	# ゴール
	var g := tr.at(0.0)
	draw_circle(_to(Vector2(g.x, -g.y)), 5.0, UiTheme.IVORY)
	for j in H.size():
		if j == me:
			continue
		var a := tr.at(D - float(H[j][0]))
		var k := clampi(int(race.horses[j].frame) - 1, 0, 7)
		draw_circle(_to(Vector2(a.x, -a.y)), 5.0, UiTheme.FRAME_BG[k])
	var m := tr.at(D - float(H[me][0]))
	var pm := _to(Vector2(m.x, -m.y))
	draw_circle(pm, 11.0, Color(UiTheme.GOLD_BRIGHT.r, UiTheme.GOLD_BRIGHT.g, UiTheme.GOLD_BRIGHT.b, 0.35))
	draw_circle(pm, 7.0, UiTheme.GOLD_BRIGHT)
