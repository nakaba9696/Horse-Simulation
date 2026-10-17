# コース図（docs/UI.md「競馬場の札」のコース図を大きくしたもの）：上から見た回り（芝は緑・ダートは茶の線）、ゴールに白い点、スタートに金の点、
# 下に高低差の線（ゴールまでの残りで。坂が分かるように縦を強めて描く）
class_name UiCourseMap
extends Control

var tr: ViewTrack
var race: Dictionary
var pts := PackedVector2Array()
var _scale := 1.0
var _mid := Vector2.ZERO

func setup(track: ViewTrack, r: Dictionary) -> void:
	tr = track
	race = r
	var n := 240
	var mn := Vector2(1e9, 1e9)
	var mx := Vector2(-1e9, -1e9)
	for i in n + 1:
		var a := tr.at(tr.L * i / n)
		var p := Vector2(a.x, -a.y)
		pts.append(p)
		mn = mn.min(p)
		mx = mx.max(p)
	_mid = (mn + mx) / 2.0
	_scale = 1.0 / maxf(1.0, maxf(mx.x - mn.x, (mx.y - mn.y) * 2.2))

func _draw() -> void:
	if tr == null:
		return
	var w := size.x * 0.62
	var h := size.y
	var s := minf(w * 0.92, h * 0.85 * 2.2) * _scale
	var c := Vector2(w / 2.0, h / 2.0)
	var line := PackedVector2Array()
	for p in pts:
		line.append(c + (p - _mid) * s)
	var col := UiTheme.TURF if String(race.race.surface) == "芝" else UiTheme.DIRT
	draw_polyline(line, Color(col.r, col.g, col.b, 0.35), 9.0, true)
	draw_polyline(line, col.lightened(0.25), 3.0, true)
	var g := tr.at(0.0)
	var D: float = race.track.D
	var st := tr.at(D)
	draw_circle(c + (Vector2(st.x, -st.y) - _mid) * s, 5.0, UiTheme.GOLD)
	draw_circle(c + (Vector2(g.x, -g.y) - _mid) * s, 6.0, Color.WHITE)
	# 高低差（右の 38%）：ゴールまでの残り D → 0
	var x0 := w + 10.0
	var gw := size.x - x0
	var lo := 1e9
	var hi := -1e9
	var k := 60
	var hs: Array = []
	for i in k + 1:
		var e := tr.elev(D * (1.0 - float(i) / k))
		hs.append(e)
		lo = minf(lo, e)
		hi = maxf(hi, e)
	var span := maxf(2.0, hi - lo)
	var gl := PackedVector2Array()
	for i in k + 1:
		gl.append(Vector2(x0 + gw * i / k, h * 0.78 - (hs[i] - lo) / span * h * 0.5))
	var fill := gl.duplicate()
	fill.append(Vector2(x0 + gw, h * 0.86))
	fill.append(Vector2(x0, h * 0.86))
	draw_colored_polygon(fill, Color(col.r, col.g, col.b, 0.18))
	draw_polyline(gl, UiTheme.MUTED, 2.0, true)
	var f := UiTheme.num_font()
	draw_string(f, Vector2(x0, h * 0.98), "%.1fm" % (hi - lo), HORIZONTAL_ALIGNMENT_LEFT, -1, 12, UiTheme.FAINT)
	draw_string(f, Vector2(x0 + gw - 34, h * 0.98), "GOAL", HORIZONTAL_ALIGNMENT_LEFT, -1, 11, UiTheme.FAINT)
