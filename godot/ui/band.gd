# 見出しの帯（docs/UI.md「見出しの帯」）：帯の色の縦の濃淡に、左 34% へ斜めの金の光。金の線の縁 1px・角 14px・下に 4px の影
# 中身は子（HBoxContainer など）を置く。左右の余白は 22px
class_name UiBand
extends PanelContainer

func _init() -> void:
	var sb := StyleBoxEmpty.new()
	sb.content_margin_left = 22
	sb.content_margin_right = 22
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	add_theme_stylebox_override("panel", sb)

func _draw() -> void:
	var r := Rect2(Vector2.ZERO, size)
	# 影
	var sh := StyleBoxFlat.new()
	sh.bg_color = Color(0, 0, 0, 0)
	sh.set_corner_radius_all(UiTheme.R_PANEL)
	sh.shadow_color = Color(0, 0, 0, 0.5)
	sh.shadow_size = 8
	sh.shadow_offset = Vector2(0, 4)
	draw_style_box(sh, r)
	# 縦の濃淡（角丸は細い帯を重ねて近づける）
	var n := 16
	for i in n:
		var y0 := size.y * i / n
		var y1 := size.y * (i + 1) / n
		var c := UiTheme.BRAND_TOP.lerp(UiTheme.BRAND_BOTTOM, (i + 0.5) / n)
		var inset := 0.0
		var rr := float(UiTheme.R_PANEL)
		if y0 < rr:
			inset = rr - sqrt(maxf(0.0, rr * rr - (rr - y0) * (rr - y0)))
		elif y1 > size.y - rr:
			var d := y1 - (size.y - rr)
			inset = rr - sqrt(maxf(0.0, rr * rr - d * d))
		draw_rect(Rect2(inset, y0, size.x - inset * 2.0, y1 - y0 + 0.5), c)
	# 斜めの金の光（左 34%。105°）
	var w := size.x * 0.34
	var sk := size.y * tan(deg_to_rad(15.0))
	var pts := PackedVector2Array([Vector2(0, 0), Vector2(w, 0), Vector2(w - sk, size.y), Vector2(0, size.y)])
	var cols := PackedColorArray([Color(UiTheme.GOLD.r, UiTheme.GOLD.g, UiTheme.GOLD.b, 0.16), Color(UiTheme.GOLD.r, UiTheme.GOLD.g, UiTheme.GOLD.b, 0.0),
		Color(UiTheme.GOLD.r, UiTheme.GOLD.g, UiTheme.GOLD.b, 0.0), Color(UiTheme.GOLD.r, UiTheme.GOLD.g, UiTheme.GOLD.b, 0.10)])
	draw_polygon(pts, cols)
	# 金の線の縁
	var bd := StyleBoxFlat.new()
	bd.draw_center = false
	bd.border_color = UiTheme.LINE_GOLD
	bd.set_border_width_all(1)
	bd.set_corner_radius_all(UiTheme.R_PANEL)
	bd.anti_aliasing = true
	draw_style_box(bd, r)
