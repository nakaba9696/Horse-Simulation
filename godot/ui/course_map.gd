# コース図（出走表・パドック。持ち主の指摘 2026-10-20「コースの図をもっと分かりやすく」）。上と下の2段：
# 上＝上から見た回り：コース全体は薄く、このレースで走る道（スタート → ゴール）を太く。スタートは金の「S」、ゴールは白の「G」、走る向きの矢印、
#   残りの距離の目盛り（200m ごとの点・400m ごとの数）、最後の直線は明るく塗って長さを書く
# 下＝高低差：横は残りの距離（スタート → ゴール。400m ごとの目盛り）、縦は高さ（強めて描く）。上り坂は橙、下り坂は青。最後の直線の入り口に縦の線
# 数は記録の形（ViewTrack）から出す。最後の直線＝ゴールからさかのぼってコーナーに入るまで
class_name UiCourseMap
extends Control

var tr: ViewTrack
var race: Dictionary
var D := 2000.0
var straight := 0.0     # 最後の直線の長さ（m）
var rise := 0.0         # 最後の直線の上り（m）
var span := 0.0         # 高低差（このレースの道の中で）

func setup(track: ViewTrack, r: Dictionary) -> void:
	tr = track
	race = r
	D = float(r.track.D)
	# 最後の直線：ゴールから 1m ずつさかのぼり、コーナーに入ったところまで（直線だけのコースは距離いっぱい）
	var s := 0.0
	while s < D and int(tr.at(s).corner) == 0:
		s += 1.0
	straight = s
	var lo := 1e9
	var hi := -1e9
	var k := 0.0
	while k <= D:
		var e := tr.elev(k)
		lo = minf(lo, e)
		hi = maxf(hi, e)
		k += 10.0
	span = hi - lo
	rise = tr.elev(0.0) - tr.elev(straight)

# 見出しに添える一言（回り・直線・坂）
func summary() -> String:
	var dir := "直線" if tr.line else ("右回り" if String(race.race.get("dir", race.track.get("dir", "左"))) == "右" else "左回り")
	var slope := "坂なし" if span < 0.6 else (HSText.t("直線に上り %.1fm") % rise if rise >= 0.6 else HSText.t("高低差 %.1fm") % span)
	return HSText.t("%s・最後の直線 %dm・%s") % [HSText.t(dir), int(round(straight)), HSText.t(slope)]

func _pt(s: float) -> Vector2:
	var a := tr.at(s)
	return Vector2(a.x, -a.y)

func _draw() -> void:
	if tr == null:
		return
	var col := UiTheme.TURF if String(race.race.surface) == "芝" else UiTheme.DIRT
	var f := UiTheme.num_font()
	var jf := UiTheme.font()
	# ---- 上：回り ----
	var top_h := size.y * 0.6
	var box := Rect2(Vector2(26, 8), Vector2(size.x - 52, top_h - 18))
	var n := 300
	var all := PackedVector2Array()
	var mn := Vector2(1e9, 1e9)
	var mx := Vector2(-1e9, -1e9)
	var whole := tr.L if not tr.line else D
	for i in n + 1:
		var p := _pt(whole * i / n)
		all.append(p)
		mn = mn.min(p); mx = mx.max(p)
	for i in 41:
		var p2 := _pt(D * i / 40.0)
		mn = mn.min(p2); mx = mx.max(p2)
	var sc := minf(box.size.x / maxf(1.0, mx.x - mn.x), box.size.y / maxf(1.0, mx.y - mn.y))
	var off := box.position + box.size / 2.0 - (mn + mx) / 2.0 * sc
	var to := func(p: Vector2) -> Vector2: return off + p * sc
	var line := PackedVector2Array()
	for p in all: line.append(to.call(p))
	draw_polyline(line, Color(col.r, col.g, col.b, 0.28), 8.0, true)
	# このレースの道（スタート → ゴール）
	var path := PackedVector2Array()
	var m := maxi(60, int(D / 10.0))
	for i in m + 1:
		path.append(to.call(_pt(D * (1.0 - float(i) / m))))
	draw_polyline(path, Color(col.r, col.g, col.b, 0.55), 9.0, true)
	draw_polyline(path, col.lightened(0.3), 3.0, true)
	# 最後の直線（明るく）
	var stp := PackedVector2Array()
	var ms := maxi(8, int(straight / 10.0))
	for i in ms + 1:
		stp.append(to.call(_pt(straight * (1.0 - float(i) / ms))))
	draw_polyline(stp, UiTheme.GOLD_BRIGHT, 4.0, true)
	# 走る向きの矢印（道の 1/4・2/4・3/4 の所）
	for q in [0.78, 0.52, 0.26]:
		var s0: float = D * q
		var a: Vector2 = to.call(_pt(s0 + 6.0))
		var b: Vector2 = to.call(_pt(s0 - 6.0))
		var dv := (b - a).normalized()
		var nv := Vector2(-dv.y, dv.x)
		var tip := b + dv * 5.0
		draw_colored_polygon(PackedVector2Array([tip, tip - dv * 11.0 + nv * 6.0, tip - dv * 11.0 - nv * 6.0]), UiTheme.IVORY)
	# 残りの距離の目盛り：200m ごとの点、400m ごとに数
	var r := 200.0
	while r < D - 1.0:
		var p3: Vector2 = to.call(_pt(r))
		draw_circle(p3, 2.5, UiTheme.IVORY)
		if int(r) % 400 == 0:
			var nb: Vector2 = to.call(_pt(r + 4.0)) - to.call(_pt(r - 4.0))
			var out := Vector2(-nb.y, nb.x).normalized()
			# 外側（図の真ん中から離れる向き）へ字を出す
			if (p3 + out - (box.position + box.size / 2.0)).length() < (p3 - (box.position + box.size / 2.0)).length():
				out = -out
			var txt := str(int(r))
			var tw := f.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 11).x
			draw_string(f, p3 + out * 14.0 - Vector2(tw / 2.0, -4.0), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, UiTheme.MUTED)
		r += 200.0
	# 最後の直線の長さ（直線の真ん中の内側）
	var mid: Vector2 = to.call(_pt(straight / 2.0))
	var cen := box.position + box.size / 2.0
	var inw := (cen - mid).normalized()
	var st_txt := HSText.t("直線 %dm") % int(round(straight))
	var sw := jf.get_string_size(st_txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x
	draw_string(jf, mid + inw * 22.0 - Vector2(sw / 2.0, -5.0), st_txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, UiTheme.GOLD_BRIGHT)
	# スタートとゴール
	_badge(to.call(_pt(D)), "S", UiTheme.GOLD, UiTheme.ON_GOLD)
	_badge(to.call(_pt(0.0)), "G", Color.WHITE, Color("111111"))
	# ---- 下：高低差 ----
	var y0 := top_h + 4.0
	var gh := size.y - y0 - 18.0
	var x0 := 26.0
	var gw := size.x - 52.0
	var k := 120
	var hs: Array = []
	var lo := 1e9
	var hi := -1e9
	for i in k + 1:
		var e := tr.elev(D * (1.0 - float(i) / k))
		hs.append(e); lo = minf(lo, e); hi = maxf(hi, e)
	var sp := maxf(2.0, hi - lo)
	var gp := func(i: int) -> Vector2: return Vector2(x0 + gw * i / k, y0 + gh * 0.9 - (hs[i] - lo) / sp * gh * 0.75)
	var fill := PackedVector2Array()
	for i in k + 1: fill.append(gp.call(i))
	fill.append(Vector2(x0 + gw, y0 + gh))
	fill.append(Vector2(x0, y0 + gh))
	draw_colored_polygon(fill, Color(col.r, col.g, col.b, 0.22))
	# 坂：50m で 0.5m 以上の上り下りを色で
	for i in k:
		var a2: Vector2 = gp.call(i)
		var b2: Vector2 = gp.call(i + 1)
		var g: float = (float(hs[i + 1]) - float(hs[i])) / (D / k) * 50.0
		var c := UiTheme.MUTED
		if g >= 0.5: c = UiTheme.WARN
		elif g <= -0.5: c = UiTheme.COOL
		draw_line(a2, b2, c, 2.5 if c != UiTheme.MUTED else 1.5, true)
	# 最後の直線の入り口
	var xs := x0 + gw * (1.0 - straight / D)
	draw_line(Vector2(xs, y0), Vector2(xs, y0 + gh), Color(UiTheme.GOLD_BRIGHT.r, UiTheme.GOLD_BRIGHT.g, UiTheme.GOLD_BRIGHT.b, 0.7), 1.0)
	# 目盛り（残りの距離。400m ごと。短いレースは 200m ごと）
	var stepm := 400.0 if D > 1400.0 else 200.0
	var rr := 0.0
	while rr <= D + 1.0:
		var x := x0 + gw * (1.0 - rr / D)
		draw_line(Vector2(x, y0 + gh), Vector2(x, y0 + gh + 3), UiTheme.FAINT, 1.0)
		var t := "G" if rr == 0.0 else str(int(rr))
		var tw2 := f.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, 11).x
		draw_string(f, Vector2(clampf(x - tw2 / 2.0, 0.0, size.x - tw2), y0 + gh + 15), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, UiTheme.FAINT)
		rr += stepm
	draw_string(jf, Vector2(x0, y0 + 12), HSText.t("高低差 %.1fm") % span, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, UiTheme.MUTED)
	var lg := HSText.t("上り坂")
	var ld := HSText.t("下り坂")
	var lw := jf.get_string_size(lg + "　" + ld, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x
	draw_string(jf, Vector2(x0 + gw - lw, y0 + 12), lg, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, UiTheme.WARN)
	draw_string(jf, Vector2(x0 + gw - lw + jf.get_string_size(lg + "　", HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x, y0 + 12), ld, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, UiTheme.COOL)

# スタート・ゴールの丸い札
func _badge(p: Vector2, t: String, bg: Color, fg: Color) -> void:
	draw_circle(p, 11.0, Color(0, 0, 0, 0.45))
	draw_circle(p, 9.5, bg)
	var f := UiTheme.num_font()
	var w := f.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x
	draw_string(f, p + Vector2(-w / 2.0, 5.0), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, fg)
