# 騎乗の計器（下のまんなか）：線と光だけで描く。文字は速さの数字だけ
#   外の弧＝脚の残り（金。減るほど右から欠ける。残りわずかは赤みを帯びる）
#   内の弧＝手綱の段（左＝引く・右＝しごく。今の段に光る印。0 に細い目盛り）
#   弧の地の光＝馬の気分（落ち着き＝白金のやわらかい光、高ぶり＝赤くゆっくり脈打つ）
#   左右の小さな点＝ムチを持つ手（持っている側が光る。打つと一瞬強く光る）
class_name UiRideMeter
extends Control

var st: Dictionary = {}
var _glow := 0.0
var _gear := 0.0
var _E := 1.0

const A0 := PI * 1.08     # 弧の始め（左下）
const A1 := PI * 1.92     # 弧の終わり（右下）

func _arc_pts(c: Vector2, r: float, a0: float, a1: float, n := 64) -> PackedVector2Array:
	var p := PackedVector2Array()
	for i in n + 1:
		var a := lerpf(a0, a1, float(i) / n)
		p.append(c + Vector2(cos(a), sin(a)) * r)
	return p

func _draw() -> void:
	if st.is_empty():
		return
	var t: float = st.get("t", 0.0)
	var dt := 1.0 / 60.0
	_gear = lerpf(_gear, float(st.get("gear", 0.0)), 0.25)
	_E = lerpf(_E, float(st.get("E", 1.0)), 0.2)
	var tension: float = st.get("tension", 30.0)
	var hot := clampf((tension - 45.0) / 35.0, 0.0, 1.0)
	_glow = lerpf(_glow, hot, dt * 3.0)
	var c := Vector2(size.x / 2.0, size.y - 8.0)
	var R := minf(size.x * 0.4, size.y * 0.9)
	var gold := UiTheme.GOLD
	var bright := UiTheme.GOLD_BRIGHT
	# 地の光（気分）
	var pulse := 0.5 + 0.5 * sin(t * (2.0 + 3.0 * _glow))
	var calm_c := Color(0.95, 0.92, 0.8, 0.10)
	var hot_c := Color(0.95, 0.25, 0.18, 0.18 + 0.16 * pulse)
	var gc := calm_c.lerp(hot_c, _glow)
	for k in 6:
		var w := 18.0 + k * 7.0
		draw_polyline(_arc_pts(c, R - 14.0, A0, A1), Color(gc.r, gc.g, gc.b, gc.a * (1.0 - k / 6.0) * 0.6), w, true)
	# 外の弧：脚の残り
	draw_polyline(_arc_pts(c, R, A0, A1), Color(0.02, 0.1, 0.07, 0.75), 16.0, true)
	draw_polyline(_arc_pts(c, R, A0, A1), Color(gold.r, gold.g, gold.b, 0.25), 2.0, true)
	var e := clampf(_E, 0.0, 1.0)
	if e > 0.002:
		var low := clampf((0.25 - e) / 0.25, 0.0, 1.0)
		var ec := bright.lerp(Color(0.95, 0.35, 0.25), low)
		draw_polyline(_arc_pts(c, R, A0, lerpf(A0, A1, e)), ec, 10.0, true)
		# 先の明るい点
		var tip := c + Vector2(cos(lerpf(A0, A1, e)), sin(lerpf(A0, A1, e))) * R
		draw_circle(tip, 7.0, Color(1, 1, 1, 0.9))
	# 内の弧：手綱の段
	var R2 := R - 30.0
	draw_polyline(_arc_pts(c, R2, A0, A1), Color(gold.r, gold.g, gold.b, 0.35), 3.0, true)
	var mid := (A0 + A1) / 2.0
	draw_line(c + Vector2(cos(mid), sin(mid)) * (R2 - 10.0), c + Vector2(cos(mid), sin(mid)) * (R2 + 10.0), Color(gold.r, gold.g, gold.b, 0.7), 2.0, true)
	for g in [-1.0, -0.5, 0.5, 1.0]:
		var a := lerpf(A0, A1, (g + 1.0) / 2.0)
		draw_line(c + Vector2(cos(a), sin(a)) * (R2 - 5.0), c + Vector2(cos(a), sin(a)) * (R2 + 5.0), Color(gold.r, gold.g, gold.b, 0.45), 2.0, true)
	var ga := lerpf(A0, A1, (clampf(_gear, -1.0, 1.0) + 1.0) / 2.0)
	# 0 から今の段まで光の帯
	draw_polyline(_arc_pts(c, R2, minf(mid, ga), maxf(mid, ga), 24), Color(bright.r, bright.g, bright.b, 0.85), 6.0, true)
	var gp := c + Vector2(cos(ga), sin(ga)) * R2
	draw_circle(gp, 11.0, Color(0.02, 0.1, 0.07, 0.9))
	draw_circle(gp, 8.0, bright)
	# 速さ（km/h）
	var f := UiTheme.font()
	var v: float = st.get("me_v", 0.0)
	var s := "%d" % int(round(v * 3.6))
	var fs := 46
	var w2 := f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	draw_string_outline(f, c + Vector2(-w2 / 2.0, -R * 0.42), s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 8, Color(0.02, 0.08, 0.05, 0.7))
	draw_string(f, c + Vector2(-w2 / 2.0, -R * 0.42), s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, UiTheme.IVORY)
	var u := "km/h"
	var wu := f.get_string_size(u, HORIZONTAL_ALIGNMENT_LEFT, -1, 20).x
	draw_string(f, c + Vector2(-wu / 2.0, -R * 0.42 + 24.0), u, HORIZONTAL_ALIGNMENT_LEFT, -1, 20, UiTheme.MUTED)
	# ムチの手（左右の点）
	var hand: int = st.get("hand", 1)
	var wa: float = st.get("whip_age", 9.0)
	var flash := clampf(1.0 - wa / 0.35, 0.0, 1.0)
	for sd in [-1, 1]:
		var on: bool = (sd == 1) == (hand == 1)
		var p := c + Vector2(sd * (R + 22.0), -14.0)
		var col := Color(bright.r, bright.g, bright.b, 0.95) if on else Color(gold.r, gold.g, gold.b, 0.25)
		if on and flash > 0.0:
			draw_circle(p, 10.0 + 14.0 * flash, Color(1, 0.95, 0.8, 0.35 * flash))
		draw_circle(p, 8.0, col)
