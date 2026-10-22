# 出走表（docs/UI.md「出走表（レースの前・パドック）」）：18頭が 1600×1000 の 1画面に収まる（持ち主「レース時の馬一覧もスクロールなしで全頭見れるようにしてね」）
# 上の帯（1行）：レース番号・格・レース名（明朝）・競馬場・芝ダと距離・回り・天気・馬場・頭数
# 表（1行 36px）：馬番（枠の色）・馬名・性齢・脚質の矢印（右ほど前。その馬の脚質が赤く光る）・騎手・印の4列（スピード・スタミナ・サブパラ・実績の1〜4位に ◎○▲△。UiMarks）・人気（単勝）。自分の馬の行は左に金の線
# 斤量は出さない（斤量の仕組みは無し。持ち主の決定 2026-10-21「書いてあると誤解を生みそう」）
# 疲労の列は出さない（持ち主の指摘 2026-10-20「疲労の列は要らない」）。印の凡例は出さない（持ち主「印の意味書かないでいい　競馬新聞風にしたいだけだから」）
# 馬場が良でないときは、印の前に道悪の得手不得手（得意・ふつう・苦手。HSSim.mud_label。持ち主の決定 2026-10-20「馬場の状態」）の列を足す（馬名の列が縮む）
# 右：コース図（UiCourseMap：回り・走る道・スタートとゴール・距離の目盛り・最後の直線の長さ・坂。展開予想は出さない。持ち主の指摘 2026-10-17「プレイヤーに判断させたい」）・
#   選んだ馬の詳しい札（どの馬も：総合力・能力・道悪・距離・脚質・特殊能力。持ち主の指摘 2026-10-20）・「パドック」「ゲートイン」（金）・操作の案内。後ろはパドックを歩く馬（3D。選んだ馬をカメラが追う）
# 操作：十字キー・矢印で選ぶ、A・Enter で決める、B・Esc で戻る（docs/UI.md 4）。LB・RB（Q・E）で前後の馬、パドックでは十字キーの上下でも替える。
# Start（G）でゲートイン・Y（P）でパドック。ボタンと札の端に押すボタンの印（UiGlyph）
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
var card_marks: HBoxContainer   # 選んだ馬の印
var card_arrows: UiStyleArrows
var card_stats: VBoxContainer   # 選んだ馬の総合力・能力・道悪・距離・特殊能力（段の色の札。docs/UI.md「能力の段」）
var hd: Array = []        # 各馬のデータ（馬の辞書。データの無い馬は null）
var marks: Array = []     # 各馬の印（UiMarks.of）
var wi := 0.0             # 能力を見る週
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

var flow := false        # 週の流れの中（その週の本当の出走表。UiFlow）

func _ready() -> void:
	UiSettings.boot()   # 設定（言語・割り当て）。出走表を直に開いたときも
	if UiFlow.current() == null and OS.get_cmdline_user_args().has("--setup=gf"):
		UiFlow.demo_gf_ride()   # 撮影の見本：グランドフェスティバルの出走表
	elif UiFlow.current() == null and UiFlow.demo_arg() >= 0:
		UiFlow.demo_ride(UiFlow.demo_arg())
		if OS.get_cmdline_user_args().has("--setup=fatigue"):
			UiFlow.demo_fatigue()   # 撮影の見本：疲労の段階が並ぶように
	flow = UiFlow.current() != null
	if flow:
		race = UiFlow.desc_of(UiFlow.current().card)
		UiFlow.desc = race
		for h in race.horses:
			info.append({"jockey": h.jockey, "pop": h.pop, "odds": h.odds})
	else:
		race = JSON.parse_string(FileAccess.get_file_as_string("res://assets/replay_race.json"))
		_card_info()
	_prep_marks()
	sel = int(race.me)
	pad = Input.get_connected_joypads().size() > 0
	add_child(UiPad.new())   # パッドの A・B・十字キーの押しっぱなし・左スティック（ui/pad.gd）
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
			hd.append(null)
			continue
		var hh := HSHorse.from_historic(d, "c")
		hh.born = 2021.0
		hd.append(hh)
		var p: Dictionary = HSSim.power(hh, r, w_idx, {"jockey": {"skill": 80.0}})
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

# 各馬のデータと印（週の流れの中は出走表の馬、見本は史実馬から作った馬）
func _prep_marks() -> void:
	if flow:
		wi = HSWorld.w_idx()
		hd = []
		for x in race.card.runners: hd.append(x.horse)
	else:
		wi = HSHorse.week_index(2025, 11, 4)
	var nums: Array = race.horses.map(func(h): return int(h.num))
	marks = UiMarks.of(hd, nums, "ダ" if String(race.race.surface) == "ダ" else "芝", wi)

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
	tv.add_child(UiTheme.title(HSText.race_name(r), 30, UiTheme.IVORY))
	tv.add_child(UiTheme.label(HSText.t("%s競馬場  %s") % [HSText.course_name(String(r.course)), HSText.t("右回り" if String(r.get("dir", "左")) == "右" else "左回り")], 13, UiTheme.MUTED))
	h.add_child(tv)
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(sp)
	var chips := HBoxContainer.new()
	chips.add_theme_constant_override("separation", 10)
	chips.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(chips)
	chips.add_child(UiTheme.surface_chip(String(r.surface), int(r.dist), 18))
	chips.add_child(_stat("天気", HSText.t(String(r.get("weather", "晴")))))
	chips.add_child(_stat("馬場", HSText.t(String(r.ground))))
	chips.add_child(_stat("頭数", HSText.t("%d頭") % race.horses.size()))
	if flow:
		chips.add_child(_stat("騎乗", HSText.t("%d/%d鞍") % [UiFlow.ride_i + 1, UiFlow.rides.size()]))

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

const COLS := [["馬番", 44], ["馬名", 0], ["性齢", 52], ["脚質", 118], ["騎手", 128], ["SP", 34], ["ST", 34], ["サブ", 34], ["実績", 34], ["人気", 76]]
const MUD_W := 56
const MARK_COL := {"◎": UiTheme.GOLD_BRIGHT, "○": UiTheme.IVORY, "▲": UiTheme.GOOD, "△": UiTheme.COOL}

# 道悪のとき（馬場が良でない）か
func _wet() -> bool:
	return String(race.race.get("ground", "良")) != "良"
# 道悪の得手不得手の印と色（適性が無い馬は空）
func _mud_of(i: int) -> Array:
	var h: Dictionary = race.horses[i]
	if h.get("heavy") == null: return []
	var lb := HSSim.mud_label(float(h.heavy))
	return [lb, UiTheme.GOOD if lb == "得意" else (UiTheme.BAD if lb == "苦手" else UiTheme.MUTED)]

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
	var cols: Array = COLS.duplicate()
	if _wet(): cols.insert(5, ["道悪", MUD_W])
	for col in cols:
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
		var nh := HBoxContainer.new()
		nh.add_theme_constant_override("separation", 6)
		nh.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		nh.clip_contents = true   # 長い名前は列の端で切る（名前の札に clip_text を付けると幅が 0 になって名前が消えていた）
		var nl := UiTheme.label(HSText.horse_name(String(hinfo.name)), 17, UiTheme.GOLD_BRIGHT if mine else UiTheme.IVORY)
		nh.add_child(nl)
		# 史実・スペシャルの小さな印（docs/UI.md「出走表」2）
		if hinfo.get("legend"):
			nh.add_child(UiTheme.chip("★スペシャル", UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 11))
		elif hinfo.get("hist"):
			nh.add_child(UiTheme.chip("史実", UiTheme.SURFACE_3, UiTheme.MUTED, 11))
		h.add_child(nh)
		var sa := UiTheme.num_label(HSText.sex_age(hinfo, int(hinfo.get("age", 4))), 15)
		sa.custom_minimum_size.x = COLS[2][1]
		h.add_child(sa)
		var ar := UiStyleArrows.new(String(hinfo.style))
		ar.custom_minimum_size = Vector2(COLS[3][1], 24)
		ar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		h.add_child(ar)
		var jl := UiTheme.label(HSText.jockey_name(String(info[i].jockey)), 14, UiTheme.MUTED)
		jl.custom_minimum_size.x = COLS[4][1]
		jl.clip_text = true
		h.add_child(jl)
		if _wet():
			var mv := _mud_of(i)
			var ml := UiTheme.label(String(mv[0]) if not mv.is_empty() else "－", 13, mv[1] if not mv.is_empty() else UiTheme.FAINT, HORIZONTAL_ALIGNMENT_CENTER)
			ml.custom_minimum_size.x = MUD_W
			h.add_child(ml)
		for k in UiMarks.COLS.size():
			var sym := String(marks[i][UiMarks.COLS[k]]) if i < marks.size() else ""
			var mk := UiTheme.label(sym, 18, MARK_COL.get(sym, UiTheme.FAINT), HORIZONTAL_ALIGNMENT_CENTER)
			mk.custom_minimum_size.x = COLS[5 + k][1]
			h.add_child(mk)
		var pv := HBoxContainer.new()
		pv.custom_minimum_size.x = COLS[9][1]
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

# 右：コース図・選んだ馬の詳しい札・ボタン・操作の案内
func _build_right() -> void:
	right = VBoxContainer.new()
	right.add_theme_constant_override("separation", 10)
	root.add_child(right)
	var cp := PanelContainer.new()
	cp.add_theme_stylebox_override("panel", UiTheme.panel(0.86))
	right.add_child(cp)
	var cv := VBoxContainer.new()
	cv.add_theme_constant_override("separation", 4)
	cp.add_child(cv)
	var mm := UiCourseMap.new()
	mm.setup(ViewTrack.new(race.track), race)
	cv.add_child(_section("コース", mm.summary()))
	mm.custom_minimum_size = Vector2(0, 262)
	cv.add_child(mm)
	var sp := Control.new()
	sp.size_flags_vertical = Control.SIZE_EXPAND_FILL
	right.add_child(sp)
	card = PanelContainer.new()
	card.add_theme_stylebox_override("panel", UiTheme.panel_gold(0.88))
	right.add_child(card)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	card.add_child(v)
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 12)
	v.add_child(top)
	# 札の端に、前後の馬へ替える印（LB・RB／Q・E。持ち主「L1R1で次の馬に切り替わることも示して」）
	top.add_child(UiGlyph.make("Q", "LB", 11))
	card_name = UiTheme.title("", 24, UiTheme.IVORY)
	card_name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card_name.clip_text = true
	top.add_child(card_name)
	card_arrows = UiStyleArrows.new("")
	card_arrows.custom_minimum_size = Vector2(118, 26)
	card_arrows.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	top.add_child(card_arrows)
	top.add_child(UiGlyph.make("E", "RB", 11))
	card_sub = UiTheme.label("", 14, UiTheme.MUTED)
	v.add_child(card_sub)
	card_marks = HBoxContainer.new()
	card_marks.add_theme_constant_override("separation", 8)
	v.add_child(card_marks)
	card_stats = VBoxContainer.new()
	card_stats.add_theme_constant_override("separation", 6)
	v.add_child(card_stats)
	var bh := HBoxContainer.new()
	bh.add_theme_constant_override("separation", 14)
	bh.alignment = BoxContainer.ALIGNMENT_END
	right.add_child(bh)
	btn_paddock = Button.new()
	btn_paddock.text = HSText.t("パドック")
	btn_paddock.custom_minimum_size = Vector2(170, 56)
	bh.add_child(btn_paddock)
	btn_gate = Button.new()
	btn_gate.text = HSText.t("ゲートイン")
	btn_gate.custom_minimum_size = Vector2(230, 56)
	btn_gate.add_theme_font_size_override("font_size", 22)
	btn_gate.add_theme_font_override("font", UiTheme.mincho())
	UiTheme.gold_button(btn_gate)
	bh.add_child(btn_gate)
	btn_paddock.pressed.connect(_open_paddock)
	btn_gate.pressed.connect(_gate_in)
	# 押すボタンの印（持ち主「ゲートインの横にスタートボタンのマークとか」）
	UiGlyph.attach(btn_gate, "G", "Start", 13)
	UiGlyph.attach(btn_paddock, "P", "Y", 13)
	btn_paddock.mouse_entered.connect(func(): btn_paddock.grab_focus())
	btn_gate.mouse_entered.connect(func(): btn_gate.grab_focus())
	# 「おまかせで乗る」は無い（自分の騎乗は必ず自分で乗る。持ち主の決定 2026-10-20「おまかせ騎乗　なしにして」）
	var kb := HBoxContainer.new()
	kb.alignment = BoxContainer.ALIGNMENT_END
	keybar = UiTheme.keybar(_keys(), pad)
	kb.add_child(keybar)
	right.add_child(kb)
	_link_focus()

# 十字キーで表の行と右のボタンを行き来できるように（パドックの間は表が隠れるので、ボタンの間だけ）
func _link_focus() -> void:
	for r in rows:
		r.focus_neighbor_right = r.get_path_to(btn_gate)
		r.focus_neighbor_left = r.get_path_to(r)
	if rows.is_empty():
		return
	var open := mode != "paddock"
	rows[0].focus_neighbor_top = rows[0].get_path_to(rows[0])
	rows[rows.size() - 1].focus_neighbor_bottom = rows[rows.size() - 1].get_path_to(btn_gate)
	btn_gate.focus_neighbor_top = btn_gate.get_path_to(rows[sel] if open else btn_gate)
	btn_paddock.focus_neighbor_top = btn_paddock.get_path_to(rows[sel] if open else btn_paddock)
	btn_gate.focus_neighbor_left = btn_gate.get_path_to(btn_paddock)
	btn_gate.focus_neighbor_right = btn_gate.get_path_to(btn_gate)
	btn_paddock.focus_neighbor_right = btn_paddock.get_path_to(btn_gate)
	btn_paddock.focus_neighbor_left = btn_paddock.get_path_to(rows[sel] if open else btn_paddock)
	btn_gate.focus_neighbor_bottom = btn_gate.get_path_to(btn_gate)
	btn_paddock.focus_neighbor_bottom = btn_paddock.get_path_to(btn_paddock)

func _keys() -> Array:
	if mode == "paddock":
		return [["↑↓", "十字↑↓", "馬を替える"], ["Q/E", "LB/RB", "前後の馬"], ["G", "Start", "ゲートイン"], ["Esc", "B", "出走表へ"]]
	return [["↑↓", "十字", "選ぶ"], ["Q/E", "LB/RB", "前後の馬"], ["Enter", "A", "決定"], ["Esc", "B", "もどる"]]

func _refresh_keybar() -> void:
	var par := keybar.get_parent()
	par.remove_child(keybar)   # すぐ外す（同じコマの並べ直しで古い案内の幅が残らないように）
	keybar.queue_free()
	keybar = UiTheme.keybar(_keys(), pad)
	par.add_child(keybar)

# 節の見出し（明朝・左に金の縦線。右に小さな注記）
func _section(text: String, note := "") -> Control:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	var bar := ColorRect.new()
	bar.color = UiTheme.GOLD
	bar.custom_minimum_size = Vector2(3, 18)
	bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(bar)
	h.add_child(UiTheme.title(text, 17, UiTheme.IVORY))
	if note != "":
		var sp := Control.new()
		sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(sp)
		h.add_child(UiTheme.label(note, 13, UiTheme.MUTED))
	return h

func _select(i: int, animate: bool) -> void:
	sel = i
	paddock.focus = i
	var h: Dictionary = race.horses[i]
	card_name.text = HSText.horse_name(String(h.name))
	card_name.add_theme_color_override("font_color", UiTheme.GOLD_BRIGHT if bool(h.get("mine", false)) else UiTheme.IVORY)
	card_arrows.style = String(h.style)
	card_arrows.queue_redraw()
	card_sub.text = HSText.t("%d番  %s  %s  %s  %s") % [int(h.num), HSText.sex_age(h, int(h.get("age", 4))), HSText.t(String(h.coat)), HSText.tparts(String(h.style)), HSText.jockey_name(String(info[i].jockey))]
	for c in card_marks.get_children():
		card_marks.remove_child(c)   # すぐ外す（同じコマの並べ直しで札の高さが残らないように）
		c.queue_free()
	var nm := 0
	if i < marks.size():
		for k in UiMarks.COLS:
			var sym := String(marks[i][k])
			if sym == "": continue
			var g := HBoxContainer.new()
			g.add_theme_constant_override("separation", 3)
			g.add_child(UiTheme.label(sym, 18, MARK_COL.get(sym, UiTheme.IVORY)))
			g.add_child(UiTheme.label(String(UiMarks.NAME[k]), 13, UiTheme.MUTED))
			card_marks.add_child(g)
			nm += 1
	card_marks.visible = nm > 0
	_fill_stats(i)
	_link_focus()
	if animate:
		card.modulate.a = 0.5
		create_tween().tween_property(card, "modulate:a", 1.0, 0.18)

# 選んだ馬の詳しい札（どの馬も。持ち主の指摘 2026-10-20「各馬の特殊能力（パッシブ・発動）と能力値を見られるように」）：
# 芝・ダの総合力／今日の馬場のスピード・スタミナ・根性・気性・坂・切れ／道悪・距離・脚質／特殊能力（性質＝パッシブ・発動）
func _fill_stats(i: int) -> void:
	for c in card_stats.get_children():
		card_stats.remove_child(c)   # すぐ外す（同じコマの並べ直しで札の高さが残らないように）
		c.queue_free()
	var hh = hd[i] if i < hd.size() else null
	card_stats.visible = hh is Dictionary and hh.has("pot")
	if not card_stats.visible:
		return
	var sf := "ダ" if String(race.race.surface) == "ダ" else "芝"
	var c := HSHorse.cur(hh, wi)
	# 総合力（芝・ダ）
	var fr := HBoxContainer.new()
	fr.add_theme_constant_override("separation", 8)
	for s in ["芝", "ダ"]:
		fr.add_child(UiTheme.label(HSText.t("総合力 %s") % HSText.t(s), 13, UiTheme.IVORY if s == sf else UiTheme.MUTED))
		fr.add_child(UiTheme.stat_chip(HSSeason.fh_show(hh, wi, s), "fh", s == sf))
	card_stats.add_child(fr)
	# 能力（今日の馬場）
	var grid := GridContainer.new()
	grid.columns = 8
	grid.add_theme_constant_override("h_separation", 6)
	grid.add_theme_constant_override("v_separation", 4)
	var ks := ["dspd", "dsta"] if sf == "ダ" else ["spd", "sta"]
	for k in ks + ["guts", "mind", "slope"]:
		_cell(grid, HSText.short(String(HSHorse.STAT_SHORT[k])), UiTheme.stat_chip(float(c[k]), "stat"))
	_cell(grid, "切れ", UiTheme.stat_chip(float(HSU.or_(hh.get("kire"), 4.0)), "kire"))
	# 道悪もほかの能力と同じ並び・同じ札（持ち主「道悪だけ下にあるの気持ち悪い」）。得手不得手の一言を隣に
	var heavy := float(HSU.or_(hh.apt.get("heavy") if hh.get("apt") is Dictionary else null, 50.0))
	var ml := HSSim.mud_label(heavy)
	_cell(grid, "道悪", UiTheme.stat_chip(heavy, "stat"))
	var mlab := UiTheme.label(ml, 12, UiTheme.GOOD if ml == "得意" else (UiTheme.BAD if ml == "苦手" else UiTheme.MUTED))
	grid.add_child(Control.new())
	grid.add_child(mlab)
	card_stats.add_child(grid)
	# 距離・脚質
	var dmin := float(HSU.or_(hh.get("distMin"), 1600.0))
	var dmax := float(HSU.or_(hh.get("distMax"), 2400.0))
	var dist := float(race.race.dist)
	var fit := dist >= dmin and dist <= dmax
	var kv := HBoxContainer.new()
	kv.add_theme_constant_override("separation", 6)
	kv.add_child(UiTheme.label("距離", 13, UiTheme.MUTED))
	kv.add_child(UiTheme.label("%s〜%sm" % [HSU.num(dmin), HSU.num(dmax)], 14, UiTheme.GOOD if fit else UiTheme.WARN))
	kv.add_child(UiTheme.label("　脚質", 13, UiTheme.MUTED))
	kv.add_child(UiTheme.label(HSText.style_text(hh), 14, UiTheme.IVORY))
	card_stats.add_child(kv)
	# 特殊能力（持ち主「性質　発動ってなに　スキルのことなら意味不明なので改善して」）：
	# パッシブ＝いつも効く馬の性質（弱みは赤）／スキル＝レース中の場面で発動する。名前の札の横に効き目を1行（小さい字）
	var pas: Array = HSHorse.shown_skills(hh)
	var act: Array = HSSkills.of(hh, wi)
	for row in [["パッシブ", "いつも効く", pas], ["スキル", "レース中の場面で発動", act]]:
		var hd2 := HBoxContainer.new()
		hd2.add_theme_constant_override("separation", 8)
		hd2.add_child(UiTheme.label(String(row[0]), 13, UiTheme.GOLD_BRIGHT))
		hd2.add_child(UiTheme.label(String(row[1]), 11, UiTheme.FAINT))
		if (row[2] as Array).is_empty():
			hd2.add_child(UiTheme.label("なし", 12, UiTheme.FAINT))
		card_stats.add_child(hd2)
		var list: Array = row[2]
		for id in list.slice(0, 4):
			var ln := HBoxContainer.new()
			ln.add_theme_constant_override("separation", 8)
			var bad := HSSkills.is_bad(String(id))
			var fg := UiTheme.BAD if bad else (UiTheme.GOLD_BRIGHT if HSSkills.is_unique(id) else UiTheme.IVORY)
			var ch := UiTheme.chip(HSText.skill_label(String(id)), UiTheme.SURFACE_3, fg, 12)
			ch.custom_minimum_size.x = 112
			ln.add_child(ch)
			var nt := UiTheme.label(HSText.skill_note(String(id)), 11, UiTheme.MUTED)
			nt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			nt.clip_text = true
			nt.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
			ln.add_child(nt)
			card_stats.add_child(ln)
		if list.size() > 4:
			card_stats.add_child(UiTheme.label(HSText.t("ほか%d") % (list.size() - 4), 11, UiTheme.FAINT))

func _cell(grid: GridContainer, name: String, chip: Control) -> void:
	var l := UiTheme.label(name, 12, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
	l.custom_minimum_size.x = 40
	grid.add_child(l)
	grid.add_child(chip)

func _open_paddock() -> void:
	if mode == "paddock":
		return
	mode = "paddock"
	paddock.close = true
	paddock.orbit = 0.0
	var tw := create_tween().set_parallel(true)
	tw.tween_property(table, "position:x", -TABLE_W - 40.0, 0.24).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tw.tween_property(shade, "modulate:a", 0.0, 0.24)
	_link_focus()
	_refresh_keybar()
	btn_gate.grab_focus()

func _close_paddock() -> void:
	if mode != "paddock":
		return
	mode = "card"
	paddock.close = false
	var tw := create_tween().set_parallel(true)
	tw.tween_property(table, "position:x", 24.0, 0.24).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(shade, "modulate:a", 1.0, 0.24)
	_link_focus()
	_refresh_keybar()
	rows[sel].grab_focus()

var _going := false
func _gate_in() -> void:
	if _going: return   # 連打で二度入らない
	_going = true
	var tw := create_tween()
	tw.tween_property(fade, "color:a", 1.0, 0.3)
	tw.tween_callback(func(): get_tree().change_scene_to_file(RACE_SCENE))

# 前後の馬へ（端から反対の端へ回る）。表を出しているとき、カーソルが表の行にあれば行も動かす
func _step(d: int) -> void:
	var i := posmod(sel + d, rows.size())
	var on_row := mode == "card" and get_viewport().gui_get_focus_owner() in rows
	_select(i, true)
	if on_row: rows[i].grab_focus()

static func _pressed(ev: InputEvent, keys: Array, btns: Array) -> bool:
	if ev is InputEventKey and ev.pressed and not ev.echo: return ev.keycode in keys
	if ev is InputEventJoypadButton and ev.pressed: return ev.button_index in btns
	return false

# LB・RB（Q・E）で前後の馬、パドックの間は十字キーの上下（左スティック）でも。Start（G）でゲートイン、Y（P）でパドックを開く・閉じる
func _input(ev: InputEvent) -> void:
	if shots.size() > 0:
		return
	var d := 0
	if _pressed(ev, [KEY_Q, KEY_PAGEUP], [JOY_BUTTON_LEFT_SHOULDER]): d = -1
	elif _pressed(ev, [KEY_E, KEY_PAGEDOWN], [JOY_BUTTON_RIGHT_SHOULDER]): d = 1
	elif mode == "paddock" and ev.is_action_pressed("ui_up", true): d = -1
	elif mode == "paddock" and ev.is_action_pressed("ui_down", true): d = 1
	if d != 0:
		_step(d)
		get_viewport().set_input_as_handled()
		return
	if _pressed(ev, [KEY_G], [JOY_BUTTON_START]):
		_gate_in()
		get_viewport().set_input_as_handled()
	elif _pressed(ev, [KEY_P], [JOY_BUTTON_Y]):
		if mode == "paddock": _close_paddock()
		else: _open_paddock()
		get_viewport().set_input_as_handled()

func _unhandled_input(ev: InputEvent) -> void:
	if ev.is_action_pressed("ui_cancel"):
		if mode == "paddock":
			_close_paddock()
		elif flow:
			UiFlow.go(get_tree(), "home")   # ホームへ（「レースへ」でこの鞍から続ける）
		elif shots.is_empty() and video.is_empty():
			UiFlow.go(get_tree(), "title")
	# 最後に使った道具に合わせて案内の名前を替える
	var p := ev is InputEventJoypadButton or ev is InputEventJoypadMotion
	if (ev is InputEventKey or p) and p != pad:
		pad = p
		_refresh_keybar()

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
