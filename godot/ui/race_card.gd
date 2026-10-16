# 出走表（docs/UI.md「出走表（レースの前・パドック）」）：18頭が 1600×1000 の 1画面に収まる（持ち主「レース時の馬一覧もスクロールなしで全頭見れるようにしてね」）
# 上の帯（1行）：レース番号・格・レース名（明朝）・競馬場・芝ダと距離・回り・天気・馬場・頭数
# 表（1行 36px）：馬番（枠の色）・馬名・性齢・斤量・脚質の矢印（右ほど前。その馬の脚質が赤く光る）・騎手・人気（単勝）。自分の馬の行は左に金の線
# 右：コース図と展開予想・選んだ馬の札・「パドック」「ゲートイン」（金）・操作の案内。後ろはパドックを歩く馬（3D。選んだ馬をカメラが追う）
# 操作：十字キー・矢印で選ぶ、A・Enter で決める、B・Esc で戻る（docs/UI.md 4）
extends Node

const RACE_SCENE := "res://scenes/race.tscn"
const ROW_H := 36.0
const ROW_GAP := 4.0
const TABLE_W := 1040.0

var race: Dictionary
var info: Array = []        # 各馬の表の中身 {jockey, pop, odds}
var paddock: ViewPaddock
var ui: CanvasLayer
var root: Control
var band: UiBand
var table: PanelContainer
var rows: Array[Button] = []
var right: VBoxContainer
var card: PanelContainer
var card_name: Label
var card_sub: Label
var card_arrows: UiStyleArrows
var btn_paddock: Button
var btn_gate: Button
var keybar: PanelContainer
var shade: ColorRect
var fade: ColorRect
var sel := 0
var mode := "card"     # card / paddock
var t := 0.0
var shots: Array = []
var out_dir := "res://out"
var video := {}
var pad := false

func _ready() -> void:
	race = JSON.parse_string(FileAccess.get_file_as_string("res://assets/replay_race.json"))
	sel = int(race.me)
	pad = Input.get_connected_joypads().size() > 0
	_card_info()
	paddock = ViewPaddock.new()
	add_child(paddock)
	paddock.setup(race)
	ui = CanvasLayer.new()
	add_child(ui)
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.theme = UiTheme.get_theme()
	ui.add_child(root)
	_build()
	_select(sel, false)
	_parse_args()
	_enter_anim()
	if shots.size() > 0 or not video.is_empty():
		_capture()
	else:
		# 最初のカーソルは主な操作（ゲートイン）。表は十字キーの上で入る
		btn_gate.grab_focus.call_deferred()

# 騎手（データの主戦。架空の名前）と人気・単勝（強さの見込みから。js/core/world.js の setOdds と同じ式。種はレースの名前から）
# 世界の進み（world.js）が Godot に移ったら、そちらの人気を使う
func _card_info() -> void:
	var D := HSData.d()
	var hist := {}
	for d in D.historic:
		hist[d.name] = d
	var hj: Dictionary = D.get("historicJockeys", {})
	var rd: Dictionary = race.race
	var r := {"name": rd.name, "grade": rd.grade, "course": rd.course, "surface": rd.surface, "dist": float(rd.dist), "ground": rd.ground, "year": 2025.0, "month": 11.0, "week": 4.0}
	var w_idx := HSHorse.week_index(2025, 11, 4)
	var rng := HSU.hash_rng("odds:%s:%s" % [rd.name, rd.course])
	var est: Array = []
	# 1人の騎手は1頭だけ。主戦がほかの馬で埋まっていたら、ほかの騎手（年代なしのゲームなので 1990 年より後に乗った人）から
	var used := {}
	var spare: Array = []
	for jk in D.get("jockeys", []):
		if float(jk.get("to", 0)) >= 1990.0:
			spare.append(String(jk.name))
	for h in race.horses:
		var d: Dictionary = hist.get(String(h.name), {})
		var jn := ""
		var j = hj.get(String(h.name))
		if j is String:
			jn = j
		elif j is Dictionary:
			jn = String(j.get("default", ""))
		if jn == "" or used.has(jn):
			jn = "—"
			for c in spare:
				if not used.has(c):
					jn = c
					break
		used[jn] = true
		info.append({"jockey": jn})
		if d.is_empty():
			est.append(70.0)
			continue
		var hh := HSHorse.from_historic(d, "c")
		hh.born = 2021.0
		var p: Dictionary = HSSim.power(hh, r, w_idx, {"weight": float(h.weight), "jockey": {"skill": 80.0}})
		est.append(float(p.total) + rng.normal(0.0, 1.8) + (1.5 if hh.get("hist") and hh.get("gradedWins", []).size() > 0 else 0.0))
	var mx := -1e9
	for e in est:
		mx = maxf(mx, e)
	var tot := 0.0
	var ex: Array = []
	for e in est:
		var v := exp(0.17 * (e - mx))
		ex.append(v)
		tot += v
	var ord: Array = []
	for i in est.size():
		info[i].odds = clampf(roundf(0.8 / (ex[i] / tot) * 10.0) / 10.0, 1.1, 999.9)
		ord.append(i)
	ord.sort_custom(func(a, b): return info[a].odds < info[b].odds)
	for k in ord.size():
		info[ord[k]].pop = k + 1

# ---- 組む ----
func _build() -> void:
	# 左を深緑で沈め、右のパドックの馬を見せる
	shade = ColorRect.new()
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sh := ShaderMaterial.new()
	sh.shader = Shader.new()
	sh.shader.code = """shader_type canvas_item;
uniform vec4 c : source_color = vec4(0.027, 0.078, 0.051, 1.0);
void fragment() {
	float a = 0.9 * (1.0 - smoothstep(0.5, 0.8, UV.x)) + 0.35 * smoothstep(0.8, 1.0, UV.y) + 0.25 * (1.0 - smoothstep(0.0, 0.12, UV.y));
	COLOR = vec4(c.rgb, clamp(a, 0.0, 0.94));
}"""
	shade.material = sh
	root.add_child(shade)
	_build_band()
	_build_table()
	_build_right()
	# 素材の出典（CC-BY の馬は作者の名前を出す。一覧は godot/CREDITS.md）
	var cr := UiTheme.label("馬の3Dモデル：Horse Rigged (Game Ready) by abhayexe（CC BY 4.0）・騎手の体：Quaternius（CC0）", 11, UiTheme.FAINT)
	cr.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	cr.position = Vector2(26, -26)
	root.add_child(cr)
	fade = ColorRect.new()
	fade.color = Color(0.01, 0.03, 0.02, 0.0)
	fade.set_anchors_preset(Control.PRESET_FULL_RECT)
	fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(fade)

func _build_band() -> void:
	band = UiTheme.band(76)
	band.set_anchors_preset(Control.PRESET_TOP_WIDE)
	band.offset_left = 24
	band.offset_right = -24
	band.offset_top = 16
	band.offset_bottom = 92
	root.add_child(band)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 14)
	band.add_child(h)
	var r: Dictionary = race.race
	# レース番号：金の丸の印
	var rn := PanelContainer.new()
	var face: Color = UiTheme.GOLD_FACE[1]
	rn.add_theme_stylebox_override("panel", UiTheme.box(face, UiTheme.GOLD_FACE[0], 2, 999, Vector4(0, 0, 0, 0)))
	rn.custom_minimum_size = Vector2(52, 52)
	rn.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	rn.add_child(UiTheme.num_label("%dR" % int(r.get("num", 11)), 18, UiTheme.ON_GOLD))
	h.add_child(rn)
	var gc := UiTheme.grade_chip(String(r.grade), 17)
	gc.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(gc)
	var tv := VBoxContainer.new()
	tv.add_theme_constant_override("separation", -6)
	tv.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	tv.add_child(UiTheme.title(String(r.name), 30, UiTheme.IVORY))
	tv.add_child(UiTheme.label("%s競馬場  %s" % [r.course, "右回り" if String(r.get("dir", "左")) == "右" else "左回り"], 13, UiTheme.MUTED))
	h.add_child(tv)
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(sp)
	var chips := HBoxContainer.new()
	chips.add_theme_constant_override("separation", 10)
	chips.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(chips)
	chips.add_child(UiTheme.surface_chip(String(r.surface), int(r.dist), 18))
	chips.add_child(_stat("天気", String(r.get("weather", "晴"))))
	chips.add_child(_stat("馬場", String(r.ground)))
	chips.add_child(_stat("頭数", "%d頭" % race.horses.size()))

# 帯の数（docs/UI.md「帯の数」）：黒 28% の札、上に見出し、下に値
func _stat(head: String, val: String) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.box(Color(0, 0, 0, 0.28), Color(0, 0, 0, 0), 0, 10, Vector4(12, 3, 12, 4)))
	p.custom_minimum_size.x = 72
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", -4)
	p.add_child(v)
	v.add_child(UiTheme.label(head, 11, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	v.add_child(UiTheme.num_label(val, 17, UiTheme.IVORY))
	return p

const COLS := [["馬番", 44], ["馬名", 0], ["性齢", 52], ["斤量", 52], ["脚質", 118], ["騎手", 128], ["人気", 76]]

func _build_table() -> void:
	table = PanelContainer.new()
	table.add_theme_stylebox_override("panel", UiTheme.box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 0, Vector4(0, 0, 0, 0)))
	table.position = Vector2(24, 104)
	table.custom_minimum_size = Vector2(TABLE_W, 0)
	root.add_child(table)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", int(ROW_GAP))
	table.add_child(v)
	# 見出しの行
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 10)
	head.custom_minimum_size.y = 22
	for col in COLS:
		var l := UiTheme.label(col[0], 11, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_CENTER if col[1] > 0 else HORIZONTAL_ALIGNMENT_LEFT)
		if col[1] > 0:
			l.custom_minimum_size.x = col[1]
		else:
			l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		head.add_child(l)
	var pad_c := MarginContainer.new()
	pad_c.add_theme_constant_override("margin_left", 10)
	pad_c.add_theme_constant_override("margin_right", 12)
	pad_c.add_child(head)
	v.add_child(pad_c)
	for i in race.horses.size():
		var hinfo: Dictionary = race.horses[i]
		var mine := bool(hinfo.get("mine", i == int(race.me)))
		var b := Button.new()
		b.custom_minimum_size = Vector2(0, ROW_H)
		b.focus_mode = Control.FOCUS_ALL
		b.add_theme_stylebox_override("normal", UiTheme.row_box(i, false, mine))
		var hov := UiTheme.row_box(i, false, mine)
		hov.bg_color = Color(UiTheme.SURFACE_3.r, UiTheme.SURFACE_3.g, UiTheme.SURFACE_3.b, 0.92)
		b.add_theme_stylebox_override("hover", hov)
		for st in ["focus", "pressed", "hover_pressed"]:
			b.add_theme_stylebox_override(st, UiTheme.row_box(i, true, mine))
		var h := HBoxContainer.new()
		h.set_anchors_preset(Control.PRESET_FULL_RECT)
		h.offset_left = 10
		h.offset_right = -12
		h.add_theme_constant_override("separation", 10)
		h.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(h)
		var fbw := CenterContainer.new()
		fbw.custom_minimum_size.x = COLS[0][1]
		fbw.add_child(UiTheme.frame_box(int(hinfo.frame), int(hinfo.num), 28, 16))
		h.add_child(fbw)
		var nl := UiTheme.label(String(hinfo.name), 17, UiTheme.GOLD_BRIGHT if mine else UiTheme.IVORY)
		nl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		nl.clip_text = true
		h.add_child(nl)
		var sa := UiTheme.num_label("%s%d" % [hinfo.sex, int(hinfo.get("age", 4))], 15)
		sa.custom_minimum_size.x = COLS[2][1]
		h.add_child(sa)
		var wl := UiTheme.num_label("%.1f" % float(hinfo.weight), 15)
		wl.custom_minimum_size.x = COLS[3][1]
		h.add_child(wl)
		var ar := UiStyleArrows.new(String(hinfo.style))
		ar.custom_minimum_size = Vector2(COLS[4][1], 24)
		ar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		h.add_child(ar)
		var jl := UiTheme.label(String(info[i].jockey), 14, UiTheme.MUTED)
		jl.custom_minimum_size.x = COLS[5][1]
		jl.clip_text = true
		h.add_child(jl)
		var pv := HBoxContainer.new()
		pv.custom_minimum_size.x = COLS[6][1]
		pv.add_theme_constant_override("separation", 4)
		var pl := UiTheme.num_label(str(int(info[i].pop)), 17, UiTheme.GOLD_BRIGHT if int(info[i].pop) <= 3 else UiTheme.IVORY, HORIZONTAL_ALIGNMENT_RIGHT)
		pl.custom_minimum_size.x = 24
		pv.add_child(pl)
		pv.add_child(UiTheme.num_label("%.1f" % float(info[i].odds), 12, UiTheme.FAINT, HORIZONTAL_ALIGNMENT_LEFT))
		h.add_child(pv)
		for c in h.get_children():
			if c is Control:
				(c as Control).mouse_filter = Control.MOUSE_FILTER_IGNORE
		var idx: int = i
		b.focus_entered.connect(func(): _select(idx, true))
		b.mouse_entered.connect(func(): b.grab_focus())
		b.pressed.connect(func(): _open_paddock())
		v.add_child(b)
		rows.append(b)

# 右：コース図と展開予想・選んだ馬の札・ボタン・操作の案内
func _build_right() -> void:
	right = VBoxContainer.new()
	right.add_theme_constant_override("separation", 12)
	root.add_child(right)
	var cp := PanelContainer.new()
	cp.add_theme_stylebox_override("panel", UiTheme.panel(0.82))
	right.add_child(cp)
	var cv := VBoxContainer.new()
	cv.add_theme_constant_override("separation", 4)
	cp.add_child(cv)
	var hd := HBoxContainer.new()
	hd.add_child(_section("コース"))
	cv.add_child(hd)
	var mm := UiCourseMap.new()
	mm.setup(ViewTrack.new(race.track), race)
	mm.custom_minimum_size = Vector2(0, 116)
	cv.add_child(mm)
	cv.add_child(_section("展開予想"))
	cv.add_child(_pace_line())
	var sp := Control.new()
	sp.size_flags_vertical = Control.SIZE_EXPAND_FILL
	right.add_child(sp)
	card = PanelContainer.new()
	card.add_theme_stylebox_override("panel", UiTheme.panel_gold(0.86))
	right.add_child(card)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	card.add_child(v)
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 12)
	v.add_child(top)
	card_name = UiTheme.title("", 24, UiTheme.IVORY)
	card_name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card_name.clip_text = true
	top.add_child(card_name)
	card_arrows = UiStyleArrows.new("")
	card_arrows.custom_minimum_size = Vector2(118, 26)
	card_arrows.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	top.add_child(card_arrows)
	card_sub = UiTheme.label("", 14, UiTheme.MUTED)
	v.add_child(card_sub)
	var bh := HBoxContainer.new()
	bh.add_theme_constant_override("separation", 14)
	bh.alignment = BoxContainer.ALIGNMENT_END
	right.add_child(bh)
	btn_paddock = Button.new()
	btn_paddock.text = "パドック"
	btn_paddock.custom_minimum_size = Vector2(170, 56)
	bh.add_child(btn_paddock)
	btn_gate = Button.new()
	btn_gate.text = "ゲートイン"
	btn_gate.custom_minimum_size = Vector2(230, 56)
	btn_gate.add_theme_font_size_override("font_size", 22)
	btn_gate.add_theme_font_override("font", UiTheme.mincho())
	UiTheme.gold_button(btn_gate)
	bh.add_child(btn_gate)
	btn_paddock.pressed.connect(_open_paddock)
	btn_gate.pressed.connect(_gate_in)
	var kb := HBoxContainer.new()
	kb.alignment = BoxContainer.ALIGNMENT_END
	keybar = UiTheme.keybar([["↑↓", "十字", "選ぶ"], ["Enter", "A", "決定"], ["Esc", "B", "もどる"]], pad)
	kb.add_child(keybar)
	right.add_child(kb)
	# 十字キーで表の行と右のボタンを行き来できるように
	for r in rows:
		r.focus_neighbor_right = r.get_path_to(btn_gate)
	if rows.size() > 0:
		rows[rows.size() - 1].focus_neighbor_bottom = rows[rows.size() - 1].get_path_to(btn_gate)
		btn_gate.focus_neighbor_top = btn_gate.get_path_to(rows[sel])
		btn_paddock.focus_neighbor_top = btn_paddock.get_path_to(rows[sel])
		btn_gate.focus_neighbor_left = btn_gate.get_path_to(btn_paddock)
		btn_paddock.focus_neighbor_left = btn_paddock.get_path_to(rows[sel])
		btn_gate.focus_neighbor_bottom = btn_gate.get_path_to(btn_gate)

# 節の見出し（明朝・左に金の縦線）
func _section(text: String) -> Control:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	var bar := ColorRect.new()
	bar.color = UiTheme.GOLD
	bar.custom_minimum_size = Vector2(3, 18)
	bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(bar)
	h.add_child(UiTheme.title(text, 17, UiTheme.IVORY))
	return h

# 展開予想：逃げ・先行の数からペース（騎乗の画面の読みと同じ：逃げ2頭以上＝ハイ、0頭＝スロー）
func _pace_line() -> Control:
	var nige := 0
	var senko := 0
	for h in race.horses:
		if String(h.style) == "逃げ":
			nige += 1
		elif String(h.style) == "先行":
			senko += 1
	var verdict := "ハイペース" if nige >= 2 else ("スローペース" if nige == 0 else "平均ペース")
	var col := UiTheme.WARN if nige >= 2 else (UiTheme.COOL if nige == 0 else UiTheme.IVORY)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	h.add_child(UiTheme.label("逃げ %d頭・先行 %d頭" % [nige, senko], 14, UiTheme.MUTED))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(sp)
	h.add_child(UiTheme.label(verdict, 17, col))
	return h

func _select(i: int, animate: bool) -> void:
	sel = i
	paddock.focus = i
	var h: Dictionary = race.horses[i]
	card_name.text = String(h.name)
	card_name.add_theme_color_override("font_color", UiTheme.GOLD_BRIGHT if bool(h.get("mine", false)) else UiTheme.IVORY)
	card_arrows.style = String(h.style)
	card_arrows.queue_redraw()
	card_sub.text = "%d番  %s%d  %s  %s  斤量%.1f  %s" % [int(h.num), h.sex, int(h.get("age", 4)), h.coat, h.style, float(h.weight), info[i].jockey]
	if animate:
		card.modulate.a = 0.5
		create_tween().tween_property(card, "modulate:a", 1.0, 0.18)

func _open_paddock() -> void:
	if mode == "paddock":
		return
	mode = "paddock"
	paddock.close = true
	paddock.orbit = 0.0
	var tw := create_tween().set_parallel(true)
	tw.tween_property(table, "position:x", -TABLE_W - 40.0, 0.24).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tw.tween_property(shade, "modulate:a", 0.0, 0.24)
	btn_gate.grab_focus()

func _close_paddock() -> void:
	if mode != "paddock":
		return
	mode = "card"
	paddock.close = false
	var tw := create_tween().set_parallel(true)
	tw.tween_property(table, "position:x", 24.0, 0.24).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(shade, "modulate:a", 1.0, 0.24)
	rows[sel].grab_focus()

func _gate_in() -> void:
	var tw := create_tween()
	tw.tween_property(fade, "color:a", 1.0, 0.3)
	tw.tween_callback(func(): get_tree().change_scene_to_file(RACE_SCENE))

func _unhandled_input(ev: InputEvent) -> void:
	if ev.is_action_pressed("ui_cancel"):
		_close_paddock()
	# 最後に使った道具に合わせて案内の名前を替える
	var p := ev is InputEventJoypadButton or ev is InputEventJoypadMotion
	if (ev is InputEventKey or p) and p != pad:
		pad = p
		var par := keybar.get_parent()
		keybar.queue_free()
		keybar = UiTheme.keybar([["↑↓", "十字", "選ぶ"], ["Enter", "A", "決定"], ["Esc", "B", "もどる"]], pad)
		par.add_child(keybar)

# 入りの動き：帯が左から（0.34 秒）、表の行が 22ms ずつ下から、右の札が右から
func _enter_anim() -> void:
	band.modulate.a = 0.0
	var tw := create_tween().set_parallel(true)
	tw.tween_property(band, "modulate:a", 1.0, 0.34)
	for i in rows.size():
		var r := rows[i]
		r.modulate.a = 0.0
		var t2 := create_tween()
		t2.tween_interval(0.06 + i * 0.022)
		t2.tween_property(r, "modulate:a", 1.0, 0.18)
	right.modulate.a = 0.0
	create_tween().tween_property(right, "modulate:a", 1.0, 0.24).set_delay(0.1)

func _layout() -> void:
	var sz := root.size
	right.position = Vector2(24 + TABLE_W + 24, 104)
	right.size = Vector2(sz.x - right.position.x - 24, sz.y - 104 - 20)

func _process(delta: float) -> void:
	if shots.size() > 0 or not video.is_empty():
		return
	t += delta
	paddock.step(delta)
	_layout()

# ---- 撮影 ----
func _parse_args() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="):
			out_dir = a.substr(6)
		elif a.begins_with("--shot="):
			var p := a.substr(7).split(":")
			shots.append({"t": float(p[0]), "name": p[1], "sel": int(p[2]) if p.size() > 2 else -1, "paddock": p.size() > 3 and p[3] == "paddock"})
		elif a.begins_with("--video="):
			var q := a.substr(8).split(":")
			video = {"t0": float(q[0]), "t1": float(q[1]), "fps": float(q[2]), "name": q[3]}
		elif a == "--fast":
			get_viewport().msaa_3d = Viewport.MSAA_DISABLED
			RenderingServer.directional_shadow_atlas_set_size(2048, true)

func _capture() -> void:
	DirAccess.make_dir_recursive_absolute(out_dir)
	var list: Array = shots.duplicate()
	if not video.is_empty():
		var tt := float(video.t0)
		var i := 0
		while tt <= float(video.t1) + 1e-6:
			list.append({"t": tt, "name": "%s_%04d" % [video.name, i], "sel": -1, "paddock": false})
			tt += 1.0 / float(video.fps)
			i += 1
	var step := 1.0 / 30.0
	for sh in list:
		if int(sh.sel) >= 0 and int(sh.sel) != sel:
			rows[int(sh.sel)].grab_focus()
			_select(int(sh.sel), false)
		if sh.paddock:
			_open_paddock()
		while t < float(sh.t) - 1e-4:
			var d := minf(step, float(sh.t) - t)
			t += d
			paddock.step(d)
			_layout()
			for tw in get_tree().get_processed_tweens():
				tw.custom_step(d)
		_layout()
		for k in 2:
			await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(out_dir.path_join(String(sh.name) + ".png"))
		if not String(sh.name).contains("_0"):
			print("shot ", sh.name)
	print("done")
	OS.kill(OS.get_process_id())
