# 成長の山（docs/UI.md「馬の画面」の能力のタブ 2・GAM-58）：横は年齢（2〜8歳）、縦は成長の度合い（HSHorse.growth_factor）。
# 山の線は成長型の色、いまの位置に点と縦の線。ピークの幅は薄く塗る。数はデータの決まり（HSHorse.PEAK）から出し、ここで決めない
class_name UiGrowthCurve
extends Control

const AGE0 := 2.0
const AGE1 := 8.0

var horse: Dictionary = {}
var now_w := 0.0

static func make(h: Dictionary, w_idx: float, height := 150.0) -> UiGrowthCurve:
	var c := UiGrowthCurve.new()
	c.horse = h
	c.now_w = w_idx
	c.custom_minimum_size = Vector2(0, height)
	c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return c

# 年齢 a のときの成長の度合い（0.55〜1）
func factor_at(a: float) -> float:
	var w := float(horse.born) * 48.0 + 12.0 + a * 48.0
	return HSHorse.growth_factor(horse, w)

func _draw() -> void:
	if horse.is_empty(): return
	var f := UiTheme.font()
	var r := Rect2(Vector2(36, 8), size - Vector2(48, 30))
	var col := HSHorse.growth_color(horse.get("growth"))
	var lo := 0.55
	var to_pt := func(a: float, v: float) -> Vector2:
		return Vector2(r.position.x + (a - AGE0) / (AGE1 - AGE0) * r.size.x, r.end.y - (v - lo) / (1.0 - lo) * r.size.y)
	# ピークの幅（薄く）
	var p: Array = HSHorse.PEAK.get(horse.get("growth"), HSHorse.PEAK["普通"])
	var sh := float(HSU.or_(horse.get("peakShift"), 0.0))
	var x0: float = to_pt.call(clampf(float(p[0]) + sh, AGE0, AGE1), 1.0).x
	var x1: float = to_pt.call(clampf(float(p[1]) + sh, AGE0, AGE1), 1.0).x
	draw_rect(Rect2(x0, r.position.y, x1 - x0, r.size.y), Color(col.r, col.g, col.b, 0.12))
	# 年の目盛り
	for a in range(int(AGE0), int(AGE1) + 1):
		var x: float = to_pt.call(float(a), lo).x
		draw_line(Vector2(x, r.position.y), Vector2(x, r.end.y), UiTheme.LINE, 1.0)
		draw_string(f, Vector2(x - 14, r.end.y + 18), HSText.t("%d歳") % a, HORIZONTAL_ALIGNMENT_CENTER, 28, 12, UiTheme.FAINT)
	draw_line(Vector2(r.position.x, r.end.y), Vector2(r.end.x, r.end.y), UiTheme.LINE_STRONG, 1.0)
	# 山の線
	var pts := PackedVector2Array()
	var n := 96
	for i in n + 1:
		var a := AGE0 + (AGE1 - AGE0) * float(i) / float(n)
		pts.append(to_pt.call(a, factor_at(a)))
	draw_polyline(pts, col, 3.0, true)
	# いまの位置
	var age := HSHorse.age_at(horse, now_w)
	if age >= AGE0 - 0.5 and age <= AGE1:
		var ac := clampf(age, AGE0, AGE1)
		var pt: Vector2 = to_pt.call(ac, factor_at(ac))
		draw_line(Vector2(pt.x, r.position.y), Vector2(pt.x, r.end.y), Color(UiTheme.GOLD_BRIGHT.r, UiTheme.GOLD_BRIGHT.g, UiTheme.GOLD_BRIGHT.b, 0.7), 2.0)
		draw_circle(pt, 7.0, UiTheme.INK)
		draw_circle(pt, 5.0, UiTheme.GOLD_BRIGHT)
		draw_string(f, Vector2(pt.x + 8, r.position.y + 12), HSText.t("いま"), HORIZONTAL_ALIGNMENT_LEFT, -1, 13, UiTheme.GOLD_BRIGHT)
