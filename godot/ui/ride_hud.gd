# 騎乗の画面の上の表示（docs/FEEL.md 4・5）。ブラウザ版 js/ui/ride.js の hud() と同じ形を 960×600 の座標で描き、画面の大きさに合わせて広げる
# 計器は4か所（左上＝順位と残り・上の真ん中＝ペース（チェックポイントを過ぎたときだけ）・右上＝時計・右＝馬群のレーダー）と左下の1つの塊（脚質・丸い計器＝速さ・馬の頭＝折り合い・STAMINA・手綱 HOLD/PUSH）
# 文字は短い英語の見出しと数だけ（日本語は馬名と特殊能力の名前だけ）。操作の結果は文字で出さず、光で返す
# 画面の箱・計器は揺らさない（揺れは 3D のカメラだけ。view/race_view.gd の kick）
# 字はにじまないように、座標だけを広げて、字の大きさは画面の大きさで作り直す
class_name UiRideHud
extends CanvasLayer

const VH := 600.0
const GLASS := Color(6 / 255.0, 14 / 255.0, 11 / 255.0, 0.72)
const GLASS2 := Color(14 / 255.0, 30 / 255.0, 23 / 255.0, 0.82)
const LINE := Color(242 / 255.0, 217 / 255.0, 142 / 255.0, 0.6)
const LABEL := Color(214 / 255.0, 230 / 255.0, 220 / 255.0, 0.78)
const GOLD := Color("f2d98e")
const OFF := Color(1, 1, 1, 0.10)
const GOOD := Color("57d17f")
const WARN := Color("ffd34d")
const BAD := Color("ff5a4d")
const CALM := Color("5fb4ff")
const CYAN := Color("7fe6ff")
const PALE := Color("ffe9a6")
const STYLES := ["逃げ", "先行", "差し", "追込"]
const PACE_SHOW := 4.5     # ペースはチェックポイント（sim.checkAt）を先頭が過ぎたときだけ、この秒だけ出す（持ち主の指摘「常にわかるとつまらない」）
const PACE_FADE := 0.6
const PACE_EN := {"スローペース": "SLOW", "平均ペース": "EVEN", "ハイペース": "HIGH"}

var rv          # view/race_view.gd
var race: Dictionary
var src
var H: Array = []
var order: Array = []
var paused := false
var paused_at := 0.0

var canvas: Control
var root: Control
var board: PanelContainer
var board_rows: VBoxContainer
var gate_keys: PanelContainer
var K := 1.0
var VW := 960.0
var now := 0.0

var f_num: Font        # 太い斜体の数
var f_bold: Font       # 太い数
var f_tag: Font        # 見出し
var f_jp: Font         # 馬名・特殊能力

var _flash = null
var _up_t := -99.0
var _up_beat := false       # 拍子の合ったしごき（▲ が金に強く光る。合わないと白く弱く）
var _down_t := -99.0
var _whip = null
var _skill = null
var _fight_t := -99.0
var _pings: Array = []
var _pace = null
var _sta_prev := 8
var _sta_lost = null

func setup(view) -> void:
	rv = view
	src = view.src
	race = src.race
	layer = 5
	var base := UiTheme.font()
	f_num = _fv(base, 0.9, 0.2, true)
	f_bold = _fv(base, 0.4, 0.0, true)
	f_tag = _fv(base, 0.2, 0.0, false)
	f_jp = _fv(base, 0.6, 0.0, false)
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.theme = UiTheme.get_theme()
	add_child(root)
	canvas = Control.new()
	canvas.set_anchors_preset(Control.PRESET_FULL_RECT)
	canvas.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.draw.connect(_draw_hud)
	root.add_child(canvas)
	# ゲートの中だけ：操作の案内（英語の短い合図）
	gate_keys = UiTheme.keybar([["↑", "D-PAD ↑", "START"], ["← →", "D-PAD ← →", "LANE"], ["V", "BACK", "VIEW"], ["ESC", "START", "PAUSE"]], Input.get_connected_joypads().size() > 0, false)
	root.add_child(gate_keys)
	_build_board()

static func _fv(base: Font, bold: float, slant: float, tnum: bool) -> FontVariation:
	var fv := FontVariation.new()
	fv.base_font = base
	fv.variation_embolden = bold
	if slant != 0.0:
		fv.variation_transform = Transform2D(Vector2(1.0, slant), Vector2(0.0, 1.0), Vector2.ZERO)
	if tnum:
		fv.opentype_features = {"tnum": 1}
	return fv

func queue_redraw() -> void:
	if canvas != null:
		canvas.queue_redraw()

# ---- 場面から呼ぶ（押した瞬間の光） ----
func flash(text: String, kind: String) -> void:
	_flash = {"text": text, "kind": kind, "t": rv.rt}

func up_fx(on_beat := false) -> void:
	_up_t = rv.rt
	_up_beat = on_beat

func down_fx() -> void:
	_down_t = rv.rt

func whip_fx(side: String, zone: bool) -> void:
	_whip = {"side": side, "zone": zone, "t": rv.rt}

func skill(label: String, bad: bool) -> void:
	_skill = {"text": label, "bad": bad, "t": rv.rt}

func ping(i: int, col: Color) -> void:
	_pings.append({"i": i, "t": rv.rt, "col": col})

func fight_fx() -> void:
	_fight_t = rv.rt

func goal_fx() -> void:
	pass

func show_board() -> void:
	_fill_board()
	board.visible = true
	board.modulate.a = 0.0
	board.set_meta("t", rv.rt)

# ---- 自分の馬の状態（模擬なら模擬の値、記録の再生なら記録の値） ----
func _m() -> Dictionary:
	var me: int = rv.me
	var v: float = float(H[me][2]) if H.size() > me else 0.0
	var r = rv.me_runner()
	var c = rv.ctl_obj()
	if r != null and c != null:
		var sim = src.sim
		var duel = r.duel
		return {"v": v, "vc": float(r.vc), "E": float(r.E), "fight": float(r.fight), "duel": duel != null, "duel_lane": float(duel.lane) if duel != null else 0.0,
			"duel_i": int(duel.i) if duel != null else -1, "spurting": bool(r.spurting), "done": bool(r.done), "finishT": float(r.finishT) if r.finishT != null else -1.0,
			"t600": float(r.t600) if r.t600 != null else -1.0, "gear": float(c.gear), "tension": float(c.tension), "hand": String(c.hand),
			"swapping": float(sim.t) < float(c.swapUntil), "whips": int(c.whips), "eff": HSSim.whip_eff(c), "kakari": bool(c.kakariNow), "reinFight": bool(c.reinFight),
			"surge": float(c.surge), "blocked": bool(c.blockedNow), "style": String(r.h.get("style", "")), "jiyu": bool(r.jiyu)}
	var a: Dictionary = src.me_at(maxf(rv.T, 0.0))
	var ft: float = src.finish_t[me]
	return {"v": v, "vc": 16.6, "E": float(a.get("E", 1.0)), "fight": float(a.get("fight", 0.0)), "duel": bool(a.get("duel", false)), "duel_lane": 0.0, "duel_i": -1,
		"spurting": float(a.get("gear", 0.0)) > 0.5, "done": ft >= 0.0 and rv.T >= ft, "finishT": ft, "t600": -1.0, "gear": float(a.get("gear", 0.0)),
		"tension": float(a.get("tension", 30.0)), "hand": "R" if int(a.get("hand", 1)) == 1 else "L", "swapping": false, "whips": 0, "eff": 1.0,
		"kakari": bool(a.get("kakari", false)), "reinFight": false, "surge": 0.0, "blocked": bool(a.get("blocked", false)),
		"style": String(race.horses[me].get("style", "")), "jiyu": false}

func _straight() -> float:
	if rv.live:
		return float(src.sim.straight)
	return float(race.track.get("straight", 500.0))

# ---- 描く ----
func _draw_hud() -> void:
	var size := canvas.size
	if size.y <= 0.0 or H.is_empty():
		return
	K = size.y / VH
	VW = size.x / K
	now = rv.rt
	var M := _m()
	var T: float = rv.T
	var fin = rv.fin
	var me: int = rv.me
	var rank: int = order.find(me) + 1
	if rv.live and src.sim.check != null and _pace == null:
		_pace = {"verdict": String(src.sim.check.verdict), "t": now, "at": int(src.sim.check.at), "time": float(src.sim.check.t)}
	# 画面の効果（下から）：追い出した速さの筋・掛かりの赤い縁・競り合いの縁・ムチの光
	if fin == null and T > 0.0:
		_speed_lines(M)
		_kakari_edge(M)
	_draw_fight(M)
	_draw_whip()
	if T >= 0.0 and fin == null:   # ゲートの中は数を出さない（目押し。持ち主の指摘 2026-10-17）
		_top_left(rank, M)
		_style_panel(M, rank)
	if fin == null or float(fin.shown) < 0.0:
		_draw_pace(M, T)
		_timer(M, T)
		_radar(M)
		_meters(M)
	if _skill != null:
		_draw_skill()
	if fin != null:
		_finish_fx(M)
	if _flash != null:
		var age: float = now - float(_flash.t)
		if age < 1.1:
			var u := age / 1.1
			var a := minf(1.0, (1.0 - u) * 3.0)
			var pop := 1.0 + 0.18 * maxf(0.0, 1.0 - u * 8.0)
			var big: bool = ["go", "good", "bad"].has(String(_flash.kind))
			var col := Color("ffa48a") if _flash.kind == "bad" else (PALE if big else Color.WHITE)
			_outlined(String(_flash.text), VW / 2.0, VH * (0.3 if big else 0.7), (46.0 if big else 18.0) * pop, _a(col, a), "center", 7.0 if big else 4.0, f_num, a)
		else:
			_flash = null
	if paused:
		_pause_fx()
	gate_keys.visible = T < 1.5 and fin == null
	gate_keys.position = Vector2(root.size.x * 0.64 - gate_keys.size.x / 2.0, root.size.y - 30.0 * K - gate_keys.size.y)
	gate_keys.modulate.a = 1.0 if T < 0.0 else clampf(1.0 - T / 1.5, 0.0, 1.0)
	if board.visible:
		var bt: float = now - float(board.get_meta("t", now))
		var b := clampf(bt / 0.35, 0.0, 1.0)
		board.modulate.a = b
		board.position = Vector2(root.size.x / 2.0 - board.size.x / 2.0, root.size.y / 2.0 - board.size.y / 2.0 + 40.0 * pow(1.0 - b, 3.0))

# ---- 描く道具（座標は 960×600 の仮の画面） ----
func _p(x: float, y: float) -> Vector2:
	return Vector2(x * K, y * K)

static func _a(c: Color, a: float) -> Color:
	return Color(c.r, c.g, c.b, c.a * a)

func _poly(pts: Array, cols) -> void:
	var pv := PackedVector2Array()
	for p in pts:
		pv.append(p * K)
	if cols is Color:
		canvas.draw_colored_polygon(pv, cols)
	else:
		canvas.draw_polygon(pv, PackedColorArray(cols))

func _rect(x: float, y: float, w: float, h: float, col: Color) -> void:
	canvas.draw_rect(Rect2(x * K, y * K, w * K, h * K), col)

func _hgrad(x: float, y: float, w: float, h: float, c0: Color, c1: Color) -> void:
	_poly([Vector2(x, y), Vector2(x + w, y), Vector2(x + w, y + h), Vector2(x, y + h)], [c0, c1, c1, c0])

func _line(x0: float, y0: float, x1: float, y1: float, col: Color, w: float) -> void:
	canvas.draw_line(_p(x0, y0), _p(x1, y1), col, w * K, true)

func _arc(cx: float, cy: float, r: float, a0: float, a1: float, col: Color, w: float) -> void:
	if a1 <= a0:
		return
	canvas.draw_arc(_p(cx, cy), r * K, a0, a1, maxi(4, int((a1 - a0) * 16.0)), col, w * K, true)

func _circle(cx: float, cy: float, r: float, col: Color) -> void:
	canvas.draw_circle(_p(cx, cy), r * K, col)

func _glow_circle(cx: float, cy: float, r: float, col: Color, blur: float) -> void:
	for k in 3:
		_circle(cx, cy, r + blur * (k + 1) / 3.0, _a(col, 0.16))

func _width(s: String, size: float, f: Font) -> float:
	return f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, maxi(1, int(round(size * K)))).x / K

func _txt(s: String, x: float, y: float, size: float, col: Color, align := "left", f: Font = null, base := "alphabetic") -> void:
	if f == null:
		f = f_bold
	var fs := maxi(1, int(round(size * K)))
	var w := f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	var px := x * K - (w / 2.0 if align == "center" else (w if align == "right" else 0.0))
	var py := y * K + (fs * 0.36 if base == "middle" else 0.0)
	canvas.draw_string(f, Vector2(px, py), s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)

func _outlined(s: String, x: float, y: float, size: float, col: Color, align := "left", lw := 5.0, f: Font = null, alpha := 1.0) -> void:
	if f == null:
		f = f_num
	var fs := maxi(1, int(round(size * K)))
	var w := f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	var px := x * K - (w / 2.0 if align == "center" else (w if align == "right" else 0.0))
	canvas.draw_string_outline(f, Vector2(px, y * K), s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, maxi(1, int(lw * K)), Color(0, 0, 0, 0.75 * alpha))
	canvas.draw_string(f, Vector2(px, y * K), s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)

# 小さな英字の見出し（字間を空ける）
func _tag(s: String, x: float, y: float, col := LABEL, align := "left") -> void:
	var sp := 1.5
	var w := 0.0
	for ch in s:
		w += _width(ch, 9.0, f_tag) + sp
	w -= sp
	var cx := x - (w / 2.0 if align == "center" else (w if align == "right" else 0.0))
	for ch in s:
		_txt(ch, cx, y, 9.0, col, "left", f_tag)
		cx += _width(ch, 9.0, f_tag) + sp

# 板：暗いガラスに金の細い線。角を1つ斜めに落とし、上の縁につや
func _glass(x: float, y: float, w: float, h: float, cut := 10.0) -> void:
	var pts := [Vector2(x, y), Vector2(x + w - cut, y), Vector2(x + w, y + cut), Vector2(x + w, y + h), Vector2(x + cut, y + h), Vector2(x, y + h - cut)]
	var sh: Array = []
	for p in pts:
		sh.append(p + Vector2(0, 3))
	_poly(sh, Color(0, 0, 0, 0.28))
	var cols: Array = []
	for p in pts:
		cols.append(GLASS2.lerp(GLASS, (p.y - y) / h))
	_poly(pts, cols)
	var loop := PackedVector2Array()
	for p in pts:
		loop.append(p * K)
	loop.append(pts[0] * K)
	canvas.draw_polyline(loop, LINE, maxf(1.0, K), true)
	canvas.draw_polyline_colors(PackedVector2Array([_p(x + 2, y + 1.5), _p(x + 2 + (w - cut - 2) * 0.3, y + 1.5), _p(x + w - cut, y + 1.5)]),
		PackedColorArray([Color(1, 1, 1, 0), Color(1, 0.94, 0.78, 0.35), Color(1, 1, 1, 0)]), maxf(1.0, K), true)

# 消えていく板（ペースの板）
func _glass_a(x: float, y: float, w: float, h: float, cut: float, a: float) -> void:
	var pts := [Vector2(x, y), Vector2(x + w - cut, y), Vector2(x + w, y + cut), Vector2(x + w, y + h), Vector2(x + cut, y + h), Vector2(x, y + h - cut)]
	var cols: Array = []
	for p in pts:
		cols.append(_a(GLASS2.lerp(GLASS, (p.y - y) / h), a))
	_poly(pts, cols)
	var loop := PackedVector2Array()
	for p in pts:
		loop.append(p * K)
	loop.append(pts[0] * K)
	canvas.draw_polyline(loop, _a(LINE, a), maxf(1.0, K), true)

# 斜めの升（計器の目盛り）。glow＝光をにじませる
func _cell(x: float, y: float, w: float, h: float, col: Color, glow := 0.0) -> void:
	var sk := h * 0.35
	var pts := [Vector2(x + sk, y), Vector2(x + w + sk, y), Vector2(x + w, y + h), Vector2(x, y + h)]
	if glow > 0.0:
		for k in 2:
			var g := glow * (k + 1) / 4.0
			_poly([pts[0] + Vector2(-g, -g), pts[1] + Vector2(g, -g), pts[2] + Vector2(g, g), pts[3] + Vector2(-g, g)], _a(col, 0.14))
	_poly(pts, col)
	if col != OFF:
		_rect(x + sk * 0.7, y + 1, w - 1, maxf(1.0, h * 0.28), Color(1, 1, 1, 0.22 * col.a))

static func ordinal(n: int) -> String:
	var s := "th"
	if n % 100 < 11 or n % 100 > 13:
		match n % 10:
			1: s = "st"
			2: s = "nd"
			3: s = "rd"
	return "%d%s" % [n, s]

static func _ease(u: float) -> float:
	u = clampf(u, 0.0, 1.0)
	return 1.0 - pow(1.0 - u, 3.0)

# ---- 左上：順位と残り（m）だけ（持ち主の指摘 2026-10-20「左上は順位と残りmだけ」）。残りの数の下に、スタートからゴールまでの細い帯 ----
func _top_left(rank: int, M: Dictionary) -> void:
	var x := 16.0
	var y := 14.0
	var w := 232.0
	var D: float = rv.D
	var meX: float = float(H[rv.me][0])
	_glass(x, y, w, 66, 12)
	var rc := WARN if rank == 1 else Color.WHITE
	_outlined(str(rank), x + 14, y + 52, 50, rc, "left", 5)
	var rw := _width(str(rank), 50, f_num)
	_txt(ordinal(rank).substr(str(rank).length()), x + 18 + rw, y + 30, 15, rc, "left", f_num)
	_txt("/%d" % src.n, x + 18 + rw, y + 52, 13, LABEL)
	var rem := maxf(0.0, ceil(D - meX))
	var st := _straight()
	var bx := x + 96
	var bw := w - 110
	var by := y + 46
	_txt(str(int(rem)), x + w - 30, y + 34, 24, PALE if rem <= st else Color.WHITE, "right")
	_txt("m", x + w - 14, y + 34, 12, LABEL, "right")
	_tag("TO GO", bx, y + 18)
	_rect(bx, by, bw, 5, OFF)
	var s0 := clampf(1.0 - st / D, 0.0, 1.0)
	_rect(bx + bw * s0, by, bw * (1.0 - s0), 5, Color(242 / 255.0, 217 / 255.0, 142 / 255.0, 0.28))
	var pr := clampf(meX / D, 0.0, 1.0)
	_hgrad(bx, by, bw * pr, 5, Color("2f7f5a"), Color("2f7f5a").lerp(Color("8ff0b4"), pr))
	var m := 200.0
	while m < D:
		_rect(bx + bw * (1.0 - m / D), by, 1, 5, Color(0, 0, 0, 0.55))
		m += 200.0
	_glow_circle(bx + bw * pr, by + 2.5, 4, Color("bfffd6"), 6)
	_circle(bx + bw * pr, by + 2.5, 4, Color.WHITE)

# ---- 左下（丸い計器の上）：脚質の板（持ち主の指摘 2026-10-20「脚質は左下に」）----
func _style_panel(M: Dictionary, rank: int) -> void:
	var w := 232.0
	var h := 40.0
	var x := 16.0
	var y := VH - 18.0 - 112.0 - 12.0 - h
	_glass(x, y, w, h, 10)
	_style_row(x + 12, y + 8, w - 24, M, rank, float(H[rv.me][0]) / rv.D)

# ---- 左下の脚質の板の中：脚質の矢印4つ（出走表・馬の店の UiStyleArrows と同じ形。左から 追込・差し・先行・逃げ。自分の脚質が赤く光る）----
# 持ち主の指摘 2026-10-17「レース中　自分の馬の脚質見えるUIにして△4つならべるやつ」。文字は出さない。
# 矢印の下の細い帯：その脚質の得意な位置（HSSim.ZONE。右ほど前）を金で、いまの位置（隊列の前から何割か）を点で。
# 点は隊列が決まるまで（距離の HSSim.MISFIT_FROM まで）は白、そのあとは得意な位置の中なら緑、外れていれば金（外れていると折り合いを欠く）
func _style_row(x: float, y: float, w: float, M: Dictionary, rank: int, prog: float) -> void:
	var style := String(M.style)
	var on := UiStyleArrows.ORDER.find(style)
	var aw4 := w / 4.0
	var h := 15.0
	var cy := y + 6.0
	for i in 4:
		var ax := x + i * aw4 + aw4 * 0.16
		var aw := aw4 * 0.68
		var pts := PackedVector2Array([_p(ax, cy - h * 0.32), _p(ax + aw * 0.55, cy - h * 0.32), _p(ax + aw * 0.55, cy - h * 0.5),
			_p(ax + aw, cy), _p(ax + aw * 0.55, cy + h * 0.5), _p(ax + aw * 0.55, cy + h * 0.32), _p(ax, cy + h * 0.32)])
		var ol := pts.duplicate()
		ol.append(pts[0])
		if i == on:
			_glow_circle(ax + aw * 0.5, cy, h * 0.6, _a(UiTheme.RED, 0.5), 8)
			canvas.draw_colored_polygon(pts, UiTheme.RED.lerp(Color(1, 0.55, 0.45), 0.15))
			canvas.draw_polyline(ol, Color(1, 0.8, 0.7, 0.9), 1.5 * K, true)
		else:
			canvas.draw_colored_polygon(pts, _a(UiTheme.GREEN_DEEP, 0.6))
			canvas.draw_polyline(ol, _a(UiTheme.GOLD_DIM, 0.9), 1.2 * K, true)
	# 得意な位置の帯といまの位置の点（右ほど前）
	var by := y + 19.0
	_rect(x, by, w, 3, OFF)
	var zone: Array = HSSim.ZONE.get(style, HSSim.ZONE["先行"])
	var za := 1.0 - float(zone[1])
	var zb := 1.0 - float(zone[0])
	_rect(x + w * za, by, w * (zb - za), 3, _a(GOLD, 0.75))
	var n: int = order.size()
	if n > 1 and rank > 0:
		var rk := float(rank - 1) / float(n - 1)
		var off := maxf(0.0, maxf(float(zone[0]) - rk, rk - float(zone[1])))
		var col := Color.WHITE if prog <= HSSim.MISFIT_FROM else (GOOD if off <= 0.05 else WARN)
		var px := x + w * (1.0 - rk)
		_glow_circle(px, by + 1.5, 3.5, col, 5)
		_circle(px, by + 1.5, 3.5, col)

# ---- 右上：時計とレコード ----
func _timer(M: Dictionary, T: float) -> void:
	var tw := 168.0
	var tx := VW - tw - 16.0
	var ty := 14.0
	_glass(tx, ty, tw, 46, 10)
	_tag("TIME", tx + 12, ty + 19)
	var t := 0.0
	if T > 0.0:
		t = minf(T, float(M.finishT)) if bool(M.done) and float(M.finishT) > 0.0 else T
	_txt(UiRaceHud.fmt_time(t), tx + tw - 12, ty + 25, 20, Color.WHITE, "right", f_num)
	_tag("RECORD", tx + 12, ty + 38)
	var rec = race.get("record")
	_txt(UiRaceHud.fmt_time(float(rec)) if rec != null else "－", tx + tw - 12, ty + 39, 12, GOLD, "right")

# ---- 上の真ん中：ペース。先頭がチェックポイント（sim.checkAt）を過ぎたときだけ 4.5 秒、通過の距離と時計・SLOW/EVEN/HIGH・斜めの升の目盛りを出して消す。見込みは出さない ----
static func _pace_col(v: String) -> Color:
	return Color("ff8a6a") if v == "ハイペース" else (Color("7fc8ff") if v == "スローペース" else PALE)

func _draw_pace(M: Dictionary, T: float) -> void:
	if T < 0.0 or bool(M.done) or _pace == null:
		return
	var age: float = (T - float(_pace.time)) / rv.SPEED   # 実時間の秒（模擬が通過した時から。描いた時ではない）
	if age < 0.0 or age > PACE_SHOW:
		return
	var alpha := minf(1.0, minf(age / 0.15, (PACE_SHOW - age) / PACE_FADE))
	var bw := 260.0
	var bx := VW / 2.0 - bw / 2.0
	var by := 14.0
	var h := 46.0
	var fresh := maxf(0.0, 1.0 - age / 0.9)
	_glass_a(bx, by, bw, h, 10, alpha)
	_tag("%dm" % int(_pace.at), bx + 12, by + 18, _a(LABEL, alpha))
	_txt("%.1f" % float(_pace.time), bx + 12 + 50, by + 20, 15, Color(1, 1, 1, alpha), "left", f_num)
	var v: String = String(_pace.verdict)
	var word: String = PACE_EN.get(v, v)
	var col := _a(_pace_col(v), alpha)
	if fresh > 0.0:
		_outlined(word, bx + bw - 12, by + 20, 15 + 6 * fresh, col, "right", 3 + 6 * fresh, f_num, fresh * alpha)
	else:
		_txt(word, bx + bw - 12, by + 20, 15, col, "right", f_num)
	# 目盛り：9 の升。判定の所が光る
	var n := 9
	var gx := bx + 14.0
	var cw := (bw - 28.0 - (n - 1) * 3.0) / n
	var gy := by + 28.0
	var k := 0.5
	if rv.live:
		k = clampf((float(src.sim.paceF) - 0.982) / 0.036, 0.0, 1.0)
	var lit := int(round(k * (n - 1)))
	for i in n:
		var q := float(i) / (n - 1)
		var c := Color("7fc8ff").lerp(PALE, q * 2.0) if q < 0.5 else PALE.lerp(Color("ff8a6a"), (q - 0.5) * 2.0)
		if i == lit:
			_cell(gx + i * (cw + 3), gy, cw, 9, _a(c, alpha), 6.0 + 8.0 * fresh)
		else:
			_cell(gx + i * (cw + 3), gy, cw, 9, _a(c, (0.45 if i < lit else 0.18) * alpha))
	var kx := gx + lit * (cw + 3) + cw / 2.0 + 1.5
	_poly([Vector2(kx, gy - 1), Vector2(kx - 5, gy - 8), Vector2(kx + 5, gy - 8)], Color(1, 1, 1, alpha))

# ---- 追い出したら、画面の端に速さの筋（速いほど濃く） ----
func _speed_lines(M: Dictionary) -> void:
	if not bool(M.spurting):
		return
	var sp := clampf((float(M.v) / float(M.vc) - 0.98) / 0.1, 0.0, 1.0)
	if sp <= 0.05:
		return
	var cx := VW / 2.0
	var cy := VH * 0.46
	for i in 26:
		var a := i / 26.0 * TAU + 0.11
		var ph := fposmod(now / 0.26 + fposmod(i * 0.618, 1.0), 1.0)
		var r0 := maxf(VW, VH) * (0.42 + ph * 0.5)
		var r1 := r0 + 40.0 + 50.0 * sp
		_line(cx + cos(a) * r0, cy + sin(a) * r0 * 0.62, cx + cos(a) * r1, cy + sin(a) * r1 * 0.62, Color(1, 1, 1, 0.16 * sp * (1.0 - ph)), 1.5)

# 縁の光（内は透明、外へ向けて濃く）
func _edge(col: Color, inner: float) -> void:
	var cx := VW / 2.0
	var cy := VH / 2.0
	var n := 48
	var outer := VW * 0.75
	for i in n:
		var a0 := i * TAU / n
		var a1 := (i + 1) * TAU / n
		var p0 := Vector2(cx + cos(a0) * inner * VW / VH, cy + sin(a0) * inner)
		var p1 := Vector2(cx + cos(a1) * inner * VW / VH, cy + sin(a1) * inner)
		var q0 := Vector2(cx + cos(a0) * outer, cy + sin(a0) * outer)
		var q1 := Vector2(cx + cos(a1) * outer, cy + sin(a1) * outer)
		_poly([p0, p1, q1, q0], [_a(col, 0.0), _a(col, 0.0), col, col])

# 掛かっている間：画面の縁がゆっくり赤く脈打つ
func _kakari_edge(M: Dictionary) -> void:
	if not bool(M.kakari):
		return
	_edge(Color(1, 60 / 255.0, 40 / 255.0, 0.22 + 0.14 * sin(now / 0.24)), VH * 0.42)

# 競り合い（持ち主の指摘 2026-10-20「FIGHT いらない」）：文字も目盛りも出さない。並んだ相手のいる側の画面の縁だけが、控えめに橙に脈打つ。
# 気合が乗りきった瞬間（fight_fx）は、その縁が一度だけ強く光って引く（揺れ・振動と一緒に）
func _draw_fight(M: Dictionary) -> void:
	var f: float = M.fight
	var flare := maxf(0.0, 1.0 - (now - _fight_t) / 0.6)
	if bool(M.done) or not bool(M.duel) or (f <= 15.0 and flare <= 0.0):
		return
	var k := clampf((f - 10.0) / 60.0, 0.0, 1.0)
	var pulse := 0.65 + 0.35 * sin(now / 0.16)
	var my_lane: float = float(H[rv.me][1])
	var left_turn: bool = String(race.race.get("dir", "左")) == "左"
	var side := 0 if (float(M.duel_lane) > my_lane) == (not left_turn) else 1
	var gw := VW * (0.12 + 0.06 * flare)
	var c0 := Color(1, (120.0 + 80.0 * k) / 255.0, 40 / 255.0, minf(0.6, 0.3 * k * pulse + 0.45 * flare))
	var c1 := Color(1, 140 / 255.0, 40 / 255.0, 0)
	if side == 0:
		_hgrad(0, 0, gw, VH, c0, c1)
	else:
		_hgrad(VW - gw, 0, gw, VH, c1, c0)

# ムチ：画面の両端から短い光の筋（画面は揺らさない）。左右どちらで打っても効きは同じなので、打った側は見せない（持ち主の指摘 2026-10-20「ムチどっちで打っても変わらないから無駄な情報増やさないで」）
func _draw_whip() -> void:
	if _whip == null:
		return
	var age: float = now - float(_whip.t)
	if age > 0.38:
		_whip = null
		return
	var u := age / 0.38
	var k := (1.0 - u) * (1.0 - u)
	var col := _a(Color("fff3b0") if bool(_whip.zone) else Color("ffd0bf"), 0.45 * k)
	for right in [false, true]:
		for i in 4:
			var y := VH * (0.36 + i * 0.07)
			var x0 := VW if right else 0.0
			var len := VW * (0.06 + (i % 2) * 0.025) * _ease(minf(1.0, age / 0.09))
			_line(x0, y, x0 - len if right else x0 + len, y - 6, col, 2.5)

# 発動の札：真ん中に大きく出て（集中線・縁の光）、0.8 秒で右上へ退いて残る。得なものは水色、損なものは赤茶
func _draw_skill() -> void:
	var age: float = now - float(_skill.t)
	if age > 2.6:
		_skill = null
		return
	var bad: bool = _skill.bad
	if age < 0.6:
		var k := 1.0 - age / 0.6
		var cx := VW / 2.0
		var cy := VH * 0.48
		var lc := _a(Color("ffb199") if bad else Color("e6fbff"), 0.45 * k)
		for i in 36:
			var a := i / 36.0 * TAU + (i % 3) * 0.05
			var r0 := minf(VW, VH) * (0.34 + 0.08 * ((i * 7) % 5) / 5.0)
			var r1 := maxf(VW, VH)
			_line(cx + cos(a) * r0, cy + sin(a) * r0, cx + cos(a) * r1, cy + sin(a) * r1, lc, 2)
		var ec := Color(1, 120 / 255.0, 90 / 255.0, 0.8 * k) if bad else Color(120 / 255.0, 220 / 255.0, 1, 0.85 * k)
		canvas.draw_rect(Rect2(_p(4, 4), _p(VW - 8, VH - 8)), ec, false, (8.0 * k + 2.0) * K)
	var m := _ease((age - 0.8) / 0.3)
	var pop := 1.0 + 0.3 * maxf(0.0, 1.0 - age / 0.14)
	var w := 250.0
	var cx0 := VW / 2.0
	var cy0 := VH * 0.2
	var cx1 := VW - 16.0 - w / 2.0 * 0.8
	var cy1 := 84.0
	var sc := (1.15 - 0.35 * m) * pop
	var cx2 := cx0 + (cx1 - cx0) * m
	var cy2 := cy0 + (cy1 - cy0) * m
	var al := minf(1.0, minf(age / 0.08, (2.6 - age) / 0.3))
	var c0 := Color("6e2a1e") if bad else Color("16759f")
	var c1 := Color("a8452f") if bad else Color("4fc8f5")
	var hw := w / 2.0 * sc
	var hh := 18.0 * sc
	var pts := [Vector2(cx2 - hw + 12 * sc, cy2 - hh), Vector2(cx2 + hw, cy2 - hh), Vector2(cx2 + hw - 12 * sc, cy2 + hh), Vector2(cx2 - hw, cy2 + hh)]
	var gc := _a(Color("ff7a5a") if bad else CYAN, 0.18 * al)
	for g in [10.0, 5.0]:
		_poly([pts[0] + Vector2(-g, -g), pts[1] + Vector2(g, -g), pts[2] + Vector2(g, g), pts[3] + Vector2(-g, g)], gc)
	_poly(pts, [_a(c0, al), _a(c1, al), _a(c1, al), _a(c0, al)])
	var loop := PackedVector2Array()
	for p in pts:
		loop.append(p * K)
	loop.append(pts[0] * K)
	canvas.draw_polyline(loop, Color(1, 1, 1, 0.85 * al), 1.2 * K, true)
	_horse_icon(cx2 - hw + 26 * sc, cy2 + 1 * sc, sc, _a(Color("ffd9cf") if bad else Color.WHITE, al))
	_outlined(String(_skill.text), cx2 + 8 * sc, cy2 + 7 * sc, 19.0 * sc, _a(Color.WHITE, al), "center", 4, f_jp, al)

func _horse_icon(x: float, y: float, s: float, col: Color) -> void:
	var body: Array = []
	for i in 16:
		var a := i * TAU / 16.0
		body.append(Vector2(x + cos(a) * 9 * s, y + sin(a) * 4.5 * s))
	_poly(body, col)
	_poly([Vector2(x + 6 * s, y - 2 * s), Vector2(x + 13 * s, y - 9 * s), Vector2(x + 15 * s, y - 7 * s), Vector2(x + 9 * s, y + 1 * s)], col)
	for l in [[-6, 1, -10, 9], [-3, 2, -1, 9], [5, 2, 8, 9], [7, 1, 12, 7]]:
		_line(x + l[0] * s, y + l[1] * s, x + l[2] * s, y + l[3] * s, col, 1.6 * s)

# ---- ゴールのあと：ゴール板で白く光り、流している間は何も出さない。着順は叩きつけるように出し、TIME と LAST 3F を添える ----
func _finish_fx(M: Dictionary) -> void:
	var fin: Dictionary = rv.fin
	var age: float = now - float(fin.at)
	if age < 0.26:
		_rect(0, 0, VW, VH, Color(1, 1, 1, 0.35 * (1.0 - age / 0.26)))
	if float(fin.shown) < 0.0:
		var a := clampf((age - 0.6) / 0.4, 0.0, 0.8)
		if a > 0.0:
			_txt("[A] SKIP  ▶", VW / 2.0, VH - 16, 12, Color(1, 1, 1, a), "center")
		return
	if rv.phase == "result":
		var bt := clampf((now - float(board.get_meta("t", now))) / 0.35, 0.0, 1.0)
		_rect(0, 0, VW, VH, Color(2 / 255.0, 8 / 255.0, 6 / 255.0, 0.5 * bt))
		_txt("[A] NEXT", VW / 2.0, VH - 24, 13, _a(PALE, bt), "center")
		return
	var t: float = now - float(fin.shown)
	var u := _ease(t / 0.22)
	var pos: int = fin.pos
	var win := pos == 1
	var by := VH * 0.36
	var bw := VW * u
	var b0 := by - 66.0
	var bh := 130.0
	var e0 := Color(70 / 255.0, 46 / 255.0, 0, 0.55) if win else Color(4 / 255.0, 14 / 255.0, 10 / 255.0, 0.55)
	var e1 := Color(90 / 255.0, 60 / 255.0, 0, 0.82) if win else Color(5 / 255.0, 16 / 255.0, 11 / 255.0, 0.82)
	var x0 := VW / 2.0 - bw / 2.0
	_poly([Vector2(x0, b0), Vector2(x0 + bw, b0), Vector2(x0 + bw, b0 + bh / 2), Vector2(x0, b0 + bh / 2)], [e0, e0, e1, e1])
	_poly([Vector2(x0, b0 + bh / 2), Vector2(x0 + bw, b0 + bh / 2), Vector2(x0 + bw, b0 + bh), Vector2(x0, b0 + bh)], [e1, e1, e0, e0])
	var lc := WARN if win else LINE
	_rect(x0, b0, bw, 1.5, lc)
	_rect(x0, b0 + bh - 1.5, bw, 1.5, lc)
	if t < 0.14:
		_rect(0, 0, VW, VH, Color(1, 1, 1, 0.4 * (1.0 - t / 0.14)))
	var sc := 1.0 + 0.8 * (1.0 - u)
	var a1 := minf(1.0, t / 0.09)
	var big := (86.0 if win else 70.0) * sc
	if win:
		for g in [26.0, 14.0]:
			_txt_glow(ordinal(pos), VW / 2.0, by + 12, big, Color(1, 0.81, 0.3, 0.12 * a1), g)
	_outlined(ordinal(pos), VW / 2.0, by + 12, big, _a(WARN if win else Color.WHITE, a1), "center", 9, f_num, a1)
	var a2 := clampf((t - 0.2) / 0.25, 0.0, 1.0)
	var ft: float = float(M.finishT)
	var last3 := "%.1f" % (ft - float(M.t600)) if float(M.t600) > 0.0 and ft > 0.0 else "－"
	_txt("TIME %s　LAST 3F %s" % [UiRaceHud.fmt_time(ft) if ft > 0.0 else "－", last3], VW / 2.0, by + 38, 16, Color(1, 1, 1, a2), "center")
	_txt("[A] NEXT    [Y] POSE" if win and rv.pose_at < 0.0 else "[A] NEXT", VW / 2.0, by + 58, 12, _a(PALE, a2), "center")

# 光：字の縁を太く薄く重ねる
func _txt_glow(s: String, x: float, y: float, size: float, col: Color, lw: float) -> void:
	var fs := maxi(1, int(round(size * K)))
	var w := f_num.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	canvas.draw_string_outline(f_num, Vector2(x * K - w / 2.0, y * K), s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, int(lw * K), col)

# ---- 一時停止の幕 ----
func _pause_fx() -> void:
	var a := 1.0   # 止まっている間は時が進まないので、すぐ出す
	_rect(0, 0, VW, VH, Color(2 / 255.0, 8 / 255.0, 6 / 255.0, 0.55 * a))
	_outlined("PAUSE", VW / 2.0, VH * 0.44, 52, Color(1, 1, 1, a), "center", 7, f_num, a)
	_txt("[START] / [ESC]  RESUME", VW / 2.0, VH * 0.44 + 34, 13, _a(PALE, a), "center")

# ---- 左下の計器：丸い計器（速さ・真ん中に時速）と、その右の板に 馬の頭（折り合い）・STAMINA・手綱（HOLD ◀ ▶ PUSH）----
# 持ち主の指摘 2026-10-20「FIGHT・WHIP・縦のメーターは意味が分からない」「折り合いのゲージをもっと分かりやすく」「FIGHT いらない」「WHIP いらない」：
# 気合の目盛りとムチの手の札は外した（競り合いは縁の光、ムチの持ち手は 3D の騎手の手で見える）。縦の ▲▼ は横の手綱の帯（左＝引く・右＝しごく）に、
# 丸い計器の内の輪（気性）は馬の頭の絵に替えた（落ち着くと頭が下がって青、掛かると頭を上げて口を割り、赤く震える）
func _meters(M: Dictionary) -> void:
	var R := 56.0
	var cx := 18.0 + R
	var cy := VH - 18.0 - R
	var px := cx + 20.0
	var pw := 352.0
	var ph := 92.0
	var py := cy - ph / 2.0 + 8.0
	_glass(px, py, pw, ph, 12)
	_dial(M, cx, cy, R)
	var x0 := cx + R + 10.0
	_temper(M, x0 + 32.0, py + ph / 2.0, 30.0)
	var bx := x0 + 78.0
	_stamina(M, bx, py + 10.0)
	_reins(M, bx, py + 52.0, 212.0)

# 丸い計器：速さだけ（下の空いた 270° の 30 の目盛り。巡航の速さに金の目盛り。追い出すと縁が金に光る）
func _dial(M: Dictionary, cx: float, cy: float, R: float) -> void:
	var spurt: bool = bool(M.spurting) and not bool(M.done)
	var halo := Color(1, 214 / 255.0, 90 / 255.0, 0.7) if spurt else Color(0, 0, 0, 0.6)
	for k in 4:
		_circle(cx, cy + (0 if spurt else 3), R + 2.0 + k * (5.0 if spurt else 3.0), _a(halo, 0.16))
	var g0 := Color(34 / 255.0, 58 / 255.0, 46 / 255.0, 0.96)
	var g1 := Color(5 / 255.0, 13 / 255.0, 10 / 255.0, 0.94)
	for k in 6:
		var q := k / 6.0
		_circle(cx - R * 0.3 * q, cy - R * 0.4 * q, R * (1.0 - q * 0.85), g1.lerp(g0, q))
	_arc(cx, cy, R - 0.5, 0, TAU, LINE, 1.5)
	var a0 := PI * 0.75
	var sweep := PI * 1.5
	var N := 30
	var f := clampf((float(M.v) / float(M.vc) - 0.85) / 0.27, 0.0, 1.0)
	var cruise := (1.0 - 0.85) / 0.27
	var lit := int(round(f * N))
	for i in N:
		var a := a0 + sweep * (i + 0.5) / N
		var over := float(i) / N >= cruise
		var col := OFF
		if i < lit:
			col = (PALE if spurt else CYAN) if over else Color("3a9cf0")
		var r0 := R - 13.0
		var r1 := R - 4.0
		if i < lit and over:
			_line(cx + cos(a) * r0, cy + sin(a) * r0, cx + cos(a) * r1, cy + sin(a) * r1, _a(WARN if spurt else CYAN, 0.3), 7.0)
		_line(cx + cos(a) * r0, cy + sin(a) * r0, cx + cos(a) * r1, cy + sin(a) * r1, col, 3.6)
	var ac := a0 + sweep * cruise
	_line(cx + cos(ac) * (R - 15), cy + sin(ac) * (R - 15), cx + cos(ac) * (R - 1), cy + sin(ac) * (R - 1), GOLD, 2)
	var kmh := int(round(float(M.v) * 3.6))
	_txt(str(kmh), cx, cy + 9, 30, PALE if spurt else Color.WHITE, "center", f_num)
	_tag("km/h", cx, cy + 25, LABEL, "center")

# 気性の段（0〜1）→ 色：落ち着き＝青・ふつう＝緑・高ぶり＝金・掛かり＝赤
static func temper_col(tv: float, kakari: bool) -> Color:
	if kakari or tv >= 0.75:
		return BAD
	return CALM if tv < 0.35 else (GOOD if tv < 0.55 else WARN)

# 折り合い：丸い札の中に横向きの馬の頭。落ち着くほど頭が下がって前へ伸び（耳は前）、高ぶるほど頭が上がる。
# 掛かる・手綱とケンカすると、頭を振り上げて口を割り、耳を絞り、白目をむいて赤く震える。札の縁の弧は気性の高さ（左下から右下へ）
func _temper(M: Dictionary, cx: float, cy: float, r: float) -> void:
	var kak: bool = bool(M.kakari) or bool(M.reinFight)
	var tv := clampf(float(M.tension) / 100.0, 0.0, 1.0)
	var col := temper_col(tv, kak)
	var calm := not kak and tv < 0.35
	# 札：色の光（掛かると脈打つ。折り合うと静かに息づく）
	var glow := 0.55 + 0.45 * sin(now / 0.1) if kak else (0.35 + 0.12 * sin(now / 0.9) if calm else 0.3)
	for k in 3:
		_circle(cx, cy, r + 2.0 + k * (4.0 if kak else 2.5), _a(col, 0.12 * glow / 0.5))
	_circle(cx, cy, r, Color(5 / 255.0, 13 / 255.0, 10 / 255.0, 0.95))
	_circle(cx, cy, r - 2.0, _a(col.darkened(0.55), 0.85))
	# 縁の弧：気性の高さ（左下から時計回りに右下へ。4つの色の帯、今の所まで灯る）
	var a0 := PI * 0.75
	var sweep := PI * 1.5
	for sg in [[0.0, 0.35, CALM], [0.35, 0.55, GOOD], [0.55, 0.75, WARN], [0.75, 1.0, BAD]]:
		var s0: float = sg[0]
		var s1: float = sg[1]
		_arc(cx, cy, r + 0.5, a0 + sweep * s0 + 0.03, a0 + sweep * s1 - 0.03, _a(sg[2], 0.28), 3.0)
		if tv > s0:
			_arc(cx, cy, r + 0.5, a0 + sweep * s0 + 0.03, a0 + sweep * minf(tv, s1) - (0.03 if tv >= s1 else 0.0), sg[2], 3.0)
	# 頭：首の付け根を軸に回す（＋＝下げる）。掛かると不規則に振る
	var shake := 0.0
	if kak:
		shake = 0.16 * sin(now / 0.045) + 0.09 * sin(now / 0.019 + 1.3)
	elif tv > 0.55:
		shake = 0.05 * sin(now / 0.07) * (tv - 0.55) / 0.45
	var ang := lerpf(0.18, -0.45, tv) - (0.25 if kak else 0.0) + shake
	var sc := r * 0.78
	var piv := Vector2(cx - r * 0.3, cy + r * 0.62)
	var P0 := Vector2(-0.3, 0.75)
	var tf := func(v: Vector2) -> Vector2:
		return piv + (v - P0).rotated(ang) * sc
	var open := 0.22 if kak else 0.0
	var head := [Vector2(-0.6, 0.78), Vector2(-0.45, 0.05), Vector2(-0.2, -0.4), Vector2(0.06, -0.42), Vector2(0.56, -0.06),
		Vector2(0.6, 0.1), Vector2(0.42, 0.18 + open * 0.3), Vector2(0.08, 0.1 + open * 0.2), Vector2(-0.06, 0.3), Vector2(0.02, 0.78)]
	var hp: Array = []
	for v in head:
		hp.append(tf.call(v))
	var ivory := Color(1, 0.96, 0.86)
	_poly(hp, ivory)
	# 割った口（掛かり）
	if open > 0.0:
		_poly([tf.call(Vector2(0.62, 0.1)), tf.call(Vector2(0.24, 0.12)), tf.call(Vector2(0.6, 0.1 + open))], Color(0.25, 0.04, 0.03))
	# 耳：落ち着くと前へ立ち、掛かると後ろへ絞る
	var tip := Vector2(-0.12, -0.8).lerp(Vector2(-0.48, -0.6), clampf((tv - 0.35) / 0.5, 0.0, 1.0) if not kak else 1.0)
	_poly([tf.call(Vector2(-0.22, -0.36)), tf.call(tip), tf.call(Vector2(-0.02, -0.4))], ivory)
	# 目：掛かると白目をむく
	var eye: Vector2 = tf.call(Vector2(0.04, -0.22))
	if kak:
		_circle(eye.x, eye.y, 2.6, Color.WHITE)
		_circle(eye.x + 0.8, eye.y, 1.3, BAD.darkened(0.4))
	else:
		_circle(eye.x, eye.y, 1.7, Color(0.08, 0.1, 0.09))
	# たてがみ（色の線）
	canvas.draw_polyline(PackedVector2Array([tf.call(Vector2(-0.6, 0.72)) * K, tf.call(Vector2(-0.46, 0.08)) * K, tf.call(Vector2(-0.22, -0.36)) * K]), col.lightened(0.2), 2.5 * K, true)

# 手綱：横の帯。真ん中から右へ金の升＝しごいた段（PUSH・↑）、左へ青の升＝引いた段（HOLD・↓）。押した瞬間に光る。
# 拍子の合ったしごきは右の升が全部金にふくらむ。外れると最初の升だけ白く弱く
func _reins(M: Dictionary, x: float, y: float, w: float) -> void:
	var g: float = M.gear
	var n := int(ceil(absf(g) * 4.0)) if absf(g) > 0.05 else 0
	var up_f := maxf(0.0, 1.0 - (now - _up_t) / 0.22)
	var dn_f := maxf(0.0, 1.0 - (now - _down_t) / 0.22)
	var hold_c := Color("7fc8ff")
	# 見出し：左に ▼ HOLD、右に PUSH ▲（十字キーの向きと同じ）
	_poly([Vector2(x, y + 2), Vector2(x + 8, y + 2), Vector2(x + 4, y + 8)], _a(hold_c, 0.9 if g < -0.05 else 0.55))
	_tag("HOLD", x + 12, y + 8, hold_c if g < -0.05 else LABEL)
	_poly([Vector2(x + w - 8, y + 8), Vector2(x + w, y + 8), Vector2(x + w - 4, y + 2)], _a(WARN, 0.9 if g > 0.05 else 0.55))
	_tag("PUSH", x + w - 12, y + 8, WARN if g > 0.05 else LABEL, "right")
	var mid := x + w / 2.0
	var cw := (w / 2.0 - 8.0 - 3.0 * 3) / 4.0
	var cy := y + 14.0
	for i in 4:
		# 右（しごく）
		var on_r := g > 0.05 and i < n
		var cr := WARN if on_r else OFF
		var glow_r := 6.0 if on_r else 0.0
		if up_f > 0.0 and (_up_beat or i == 0):
			cr = (WARN.lerp(Color(1, 0.97, 0.8), 0.5 * up_f)) if _up_beat else Color(1, 1, 1, 0.25 + 0.55 * up_f)
			glow_r = 6.0 + 8.0 * up_f
		_cell(mid + 6.0 + i * (cw + 3.0), cy, cw, 13, cr, glow_r)
		# 左（引く）
		var on_l := g < -0.05 and i < n
		var cl := hold_c if on_l else OFF
		var glow_l := 6.0 if on_l else 0.0
		if dn_f > 0.0 and i == 0 and not on_l:
			cl = Color(1, 1, 1, 0.25 + 0.55 * dn_f)
			glow_l = 4.0
		_cell(mid - 6.0 - (i + 1) * cw - i * 3.0, cy, cw, 13, cl, glow_l)
	# 真ん中の手（白い丸）：段の分だけ左右へ寄る
	var hx := mid + clampf(g, -1.0, 1.0) * (w / 2.0 - 10.0)
	_rect(mid - 0.75, cy - 3, 1.5, 19, Color(1, 1, 1, 0.35))
	_glow_circle(hx, cy + 6.5, 4.5, Color(1, 1, 1, 0.8), 5)
	_circle(hx, cy + 6.5, 4.5, Color.WHITE)


# 道悪：{wet＝馬場が良でない, e＝自分の馬のスタミナの減りの倍率}（初めて描くときに決める）
var _mud := {}
func _mud_fx() -> Dictionary:
	if _mud.is_empty():
		var rr: Dictionary = race.race
		var wet := String(rr.get("ground", "良")) != "良"
		var e := 1.0
		if wet:
			var r = rv.me_runner()
			var h: Dictionary = r.h if r != null else {"apt": {"heavy": float(race.horses[rv.me].get("heavy", 50.0))}, "kire": 4.0}
			e = float(HSSim.ground_fx(h, {"ground": rr.ground, "surface": rr.surface, "dist": float(rr.dist)}).e)
		_mud = {"wet": wet, "e": e}
	return _mud

# スタミナ：8つの斜めの升。減るほど緑→金→赤、残り2つで点滅、空なら赤い枠だけ
func _stamina(M: Dictionary, x: float, y: float) -> void:
	_tag("STAMINA", x, y + 8)
	var E: float = M.E
	var nb := 0 if E <= 0.0 else int(ceil(clampf(E, 0.0, 1.0) * 8.0))
	if nb < _sta_prev:
		_sta_lost = {"i": nb, "t": now}
	_sta_prev = nb
	var col := BAD if nb <= 2 else (WARN if nb <= 4 else GOOD)
	var blink := 0.55 + 0.45 * sin(now / 0.11) if nb <= 2 and not bool(M.done) else 1.0
	# いちばん先の升は、残りの割合だけ満たす（減っていく速さが見える）
	var frac := clampf(E * 8.0 - (nb - 1), 0.08, 1.0) if nb > 0 else 0.0
	for i in 8:
		var cx := x + i * 27.0
		if i < nb - 1:
			_cell(cx, y + 13, 23, 17, _a(col, blink), 6)
		elif i == nb - 1:
			_cell(cx, y + 13, 23, 17, OFF)
			_cell(cx, y + 13, 23.0 * frac, 17, _a(col, blink), 6)
		else:
			_cell(cx, y + 13, 23, 17, OFF)
	# 道悪（馬場が良でない）：升の下に泥がかかり、いちばん先の升から泥のしずくが垂れる（HSSim.ground_fx の e。スタミナの減りは全馬共通で、道悪の段・距離で速くなる。文字は出さない）
	var mud := _mud_fx()
	if bool(mud.wet) and nb > 0 and not bool(M.done):
		for i in nb:
			_rect(x + i * 27.0 + 1.0, y + 24.0, 22.0 * frac if i == nb - 1 else 22.0, 6.0, Color(110 / 255.0, 74 / 255.0, 40 / 255.0, 0.85))
		if float(mud.e) > 1.005:
			var lx := x + (nb - 1) * 27.0 + 23.0 * frac - 3.0
			var rate := 1.1 + (float(mud.e) - 1.0) * 9.0
			for d in 3:
				var u := fmod(now * rate + d / 3.0, 1.0)
				_circle(lx - d * 5.0, y + 32.0 + u * 16.0, 3.2 - u * 1.4, Color(138 / 255.0, 95 / 255.0, 52 / 255.0, 0.95 * (1.0 - u * 0.7)))
	if _sta_lost != null and now - float(_sta_lost.t) < 0.38:
		var u: float = (now - float(_sta_lost.t)) / 0.38
		_cell(x + int(_sta_lost.i) * 27.0, y + 13 - u * 4, 23, 17, Color(1, 1, 1, 1.0 - u), 12)
	if nb == 0 and not bool(M.done):
		canvas.draw_rect(Rect2(_p(x - 2, y + 11), _p(8 * 27 + 4, 21)), Color(1, 90 / 255.0, 77 / 255.0, 0.5 + 0.5 * sin(now / 0.09)), false, 1.5 * K)

# ---- 右：縦長の馬群レーダー。上が前。紫が自分、白い輪が照準。内ラチは回る向きの側 ----
# 脇の金の括弧＝得意な位置（脚質）。前が塞がれていると自分の印の前に赤い線。近くの馬の特殊能力は輪が広がる
func _radar(M: Dictionary) -> void:
	var w := 70.0
	var h := minf(290.0, VH * 0.5)
	var bx := VW - w - 16.0
	var by := 112.0
	var me: int = rv.me
	_glass(bx, by, w, h + 30, 10)
	var top := -1e9
	var bot := 1e9
	for p in H:
		top = maxf(top, float(p[0]))
		bot = minf(bot, float(p[0]))
	var span := maxf(40.0, top - bot + 6.0)
	var lanes := 10.0
	var inner_right: bool = String(race.race.get("dir", "左")) != "左"
	var lane_x := func(l: float) -> float:
		var k := clampf(l, -0.4, lanes) / lanes * (w - 20.0)
		return bx + w - 10.0 - k if inner_right else bx + 10.0 + k
	var y_of := func(x: float) -> float:
		return by + 10.0 + (top + 3.0 - x) / span * (h - 14.0)
	var rx: float = lane_x.call(-0.4)
	_line(rx, by + 6, rx, by + h, Color(232 / 255.0, 232 / 255.0, 232 / 255.0, 0.8), 2)
	# 得意な位置の括弧（自由自在は出さない）
	var si := STYLES.find(String(M.style))
	if not bool(M.jiyu) and si >= 0 and order.size() > 1:
		var n := order.size()
		var ia: int = order[mini(n - 1, int(floor(n * si / 4.0)))]
		var ib: int = order[mini(n - 1, int(ceil(n * (si + 1) / 4.0)) - 1)]
		var ya: float = float(y_of.call(float(H[ia][0]))) - 4.0
		var yb: float = float(y_of.call(float(H[ib][0]))) + 4.0
		var ex := bx + 4.0 if inner_right else bx + w - 4.0
		var k_me := order.find(me)
		var in_zone := k_me >= order.find(ia) and k_me <= order.find(ib)
		var d := 4.0 if inner_right else -4.0
		_rect(bx + 2, ya, w - 4, yb - ya, Color(1, 211 / 255.0, 77 / 255.0, 0.16) if in_zone else Color(242 / 255.0, 217 / 255.0, 142 / 255.0, 0.07))
		var bc := WARN if in_zone else Color(242 / 255.0, 217 / 255.0, 142 / 255.0, 0.5)
		var pl := PackedVector2Array([_p(ex + d, ya), _p(ex, ya), _p(ex, yb), _p(ex + d, yb)])
		if in_zone:
			canvas.draw_polyline(pl, _a(WARN, 0.3), 6.0 * K, true)
		canvas.draw_polyline(pl, bc, (2.5 if in_zone else 1.5) * K, true)
	var target: int = rv.target
	for j in H.size():
		var x: float = lane_x.call(float(H[j][1]))
		var y: float = y_of.call(float(H[j][0]))
		var is_me := j == me
		var cap := Color(String(race.horses[j].get("cap", "#ffffff")))
		if is_me:
			_rect(x - 6, y - 7.5, 12, 15, Color(217 / 255.0, 168 / 255.0, 1, 0.3))
		_rect(x - 3.5, y - 5, 7, 10, Color("b45cff") if is_me else cap)
		canvas.draw_rect(Rect2(_p(x - 3.5, y - 5), _p(7, 10)), Color.WHITE if is_me else Color(0, 0, 0, 0.6), false, (1.5 if is_me else 1.0) * K)
		if bool(M.duel) and j == int(M.duel_i) and float(M.fight) > 15.0:
			_arc(x, y, 7, 0, TAU, Color("ffb347"), 2)
		if j == target and not is_me:
			_arc(x, y, 8, 0, TAU, Color.WHITE, 1.5)
		if is_me and bool(M.blocked) and not bool(M.done):
			_rect(x - 6, y - 9, 12, 2.5, Color(1, 90 / 255.0, 77 / 255.0, 0.6 + 0.4 * sin(now / 0.1)))
	for i in range(_pings.size() - 1, -1, -1):
		var p: Dictionary = _pings[i]
		var u: float = (now - float(p.t)) / 0.9
		if u >= 1.0:
			_pings.remove_at(i)
			continue
		var pi: int = p.i
		_arc(lane_x.call(float(H[pi][1])), y_of.call(float(H[pi][0])), 4.0 + 12.0 * u, 0, TAU, _a(p.col, 1.0 - u), 2)
	var kk := order.find(target) + 1
	var info: Dictionary = race.horses[target]
	var label := "#%d" % int(info.num) if rv.fin != null else "#%d  %s" % [int(info.num), ordinal(kk)]
	_txt(label, bx + w / 2.0, by + h + 12, 11, Color("d9a8ff") if target == me else Color.WHITE, "center", f_bold, "middle")
	var nm := String(info.name)
	_txt(nm.substr(0, 5) + "…" if nm.length() > 5 else nm, bx + w / 2.0, by + h + 24, 10, LABEL, "center", f_jp, "middle")

# ---- 確定の表（着順・馬番・馬名・タイム・着差）。模擬のときは終わってから結果が決まるので、出す時に作る ----
func _build_board() -> void:
	board = PanelContainer.new()
	board.add_theme_stylebox_override("panel", UiTheme.panel(0.9))
	board.custom_minimum_size = Vector2(620, 0)
	board.visible = false
	root.add_child(board)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	board.add_child(v)
	var head := HBoxContainer.new()
	head.add_child(UiTheme.label("RESULT", 34, UiTheme.GOLD_BRIGHT))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	head.add_child(UiTheme.label("%s  %s%dm" % [race.race.course, race.race.surface, int(race.race.dist)], 22, UiTheme.MUTED))
	v.add_child(head)
	var line := ColorRect.new()
	line.color = UiTheme.GOLD_DIM
	line.custom_minimum_size = Vector2(0, 2)
	v.add_child(line)
	board_rows = VBoxContainer.new()
	board_rows.add_theme_constant_override("separation", 3)
	v.add_child(board_rows)

var _board_built := false
func _fill_board() -> void:
	if _board_built:
		return
	_board_built = true
	var res: Array = race.get("results", [])
	for k in mini(res.size(), 8):
		var r: Dictionary = res[k]
		var info: Dictionary = {}
		for h in race.horses:
			if int(h.num) == int(r.num):
				info = h
		var row := PanelContainer.new()
		var mine := int(r.num) == int(race.horses[src.me].num)
		row.add_theme_stylebox_override("panel", UiTheme.row_box(k, false, mine))
		row.custom_minimum_size.y = 46
		var hb := HBoxContainer.new()
		hb.add_theme_constant_override("separation", 12)
		row.add_child(hb)
		var pl := UiTheme.num_label(str(int(r.pos)), 30, UiTheme.GOLD_BRIGHT if k < 3 else UiTheme.IVORY)
		pl.custom_minimum_size.x = 36
		hb.add_child(pl)
		hb.add_child(UiTheme.frame_box(int(info.get("frame", 1)), int(r.num), 34, 20))
		var nm := UiTheme.label(String(r.name), 26, UiTheme.GOLD_BRIGHT if mine else UiTheme.IVORY)
		nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		hb.add_child(nm)
		var tm := UiTheme.num_label(UiRaceHud.fmt_time(float(r.time)) if k == 0 else String(r.margin), 24, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
		tm.custom_minimum_size.x = 120
		hb.add_child(tm)
		board_rows.add_child(row)
