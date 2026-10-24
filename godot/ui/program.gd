# 番組表（次走を選ぶ。docs/UI.md「番組表」・GAM-76）：1か月をスクロール無しで1画面に収める（持ち主の指摘 2026-10-24）
# 1. 上：月の札（Q/E・LB/RB で送る）と表示の絞り込み。その下に馬の要点（R・Y で馬を替える）と次走
# 2. 左：月の格子。列は週（1〜4週。12月の GF の週はその週だけ5列目）、段は「日本の重賞」「オープン」「欧州」「その他」。札は格・名前・距離と芝ダだけ
#    入りきらない段は格の高い順（予約・登録したものは先）に絞り「ほか n」。「ほか n」は押すとその週・その段の一覧の小窓
# 3. 右：カーソルの札の詳しい欄（日付・条件・コース・1着賞金・向き・出られない理由・押すと何をするか）
# 4. 札を押すと、今週は「出走する」、先の週は「予約する」、登録・予約済みは「取消」。出られないときは理由
# 中身は HSProgram（rows・month_grid・fit_band。godot/core）。決まりは画面で作り直さない。中身は y 104〜872 に収める（下はキーの案内と下のメニュー）
extends UiScreen

const GRID_Y := 234.0        # 格子と詳しい欄の上
const BOTTOM := 864.0        # 中身の下の端（docs/UI.md「下のメニュー」：872 まで）
const DETAIL_W := 360.0      # 右の詳しい欄
const LABEL_W := 74.0        # 段の名前の列
const HEAD_H := 40.0         # 週の見出し
const CARD_H := 30.0
const CARD_GAP := 4.0
const BAND_GAP := 12.0
const NARROW := 92.0         # 過ぎた週・予約できる範囲の外の列（細くする）
const SLOTS := {"jp": 6, "op": 3, "eu": 4, "ot": 3}   # 段ごとの札の数
const BAND_NAME := {"jp": "日本の重賞", "op": "オープン", "eu": "欧州", "ot": "その他"}

var horses: Array = []
var cur := 0
var mo := 0                  # 今月から何か月先を見ているか
var opt := {"show": "all", "kind": "all", "surf": ""}
var top_row: HBoxContainer
var horse_row: HBoxContainer
var grid: Control
var detail: VBoxContainer
var rows: Array[Button] = []     # 格子の札（レースの札と「ほか n」の札）
var cards: Array = []            # rows と同じ並びで { b, col, band, r?（行）, more?（ほかの行） }
var filt: Array[Button] = []
var b_horse: Button
var rs: Array = []               # HSProgram.rows（馬と絞り込みを替えたときだけ作り直す）
var mg: Dictionary = {}          # HSProgram.month_grid
var _focus_y := -1.0             # 月を送る前のカーソルの高さ（送った先で近い札へ）
var _focus_key := ""
var back_to := "home"     # もどる画面（UiFlow.program_back。厩舎・お手馬の画面から開くとそこへ）

func hint() -> String:
	return "今週は出走登録、来週から先は予約（その週の初めに出走登録に変わる）"

func keys() -> Array:
	return [["↑↓←→", "十字", "選ぶ"], ["Enter", "A", "出走・予約"], ["Q/E", "LB/RB", "月"], ["R", "Y", "馬"], ["Esc", "B", "もどる"]]

func on_back() -> void:
	go(back_to)

# Q/E・LB/RB：月を送る（端から反対の端へ回る）
func on_tab(d: int) -> void:
	_month(posmod(mo + d, HSProgram.last_month() + 1))

func _month(k: int, edge := 0) -> void:
	mo = k
	_focus_key = ""
	_fill_top()
	_fill_grid()
	if edge != 0:
		_focus_edge(edge)
	else:
		focus_first()

func _horse_step(d: int) -> void:
	if horses.size() < 2:
		return
	cur = posmod(cur + d, horses.size())
	UiFlow.program_id = horses[cur].id
	_focus_key = ""
	_fill(true)

func build() -> void:
	backdrop("bg_home", 0.84)
	back_to = UiFlow.program_back
	UiFlow.program_back = "home"
	horses = HSWorld.mine("stable") + HSWorld.mine("farm")
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--month="): mo = int(a.substr(8))   # 撮影の見本：今月から何か月先を開くか
	cur = 0
	for i in horses.size():
		if horses[i].id == UiFlow.program_id: cur = i
	make_band("暦", "番組表", "今週から1年先までのレース", [["暦", UiFlow.date_label()], ["資金", UiFlow.money_label(), "money"]])
	top_row = HBoxContainer.new()
	top_row.position = Vector2(PAD_X, TOP + 8)
	top_row.size = Vector2(1600 - PAD_X * 2, 46)
	top_row.add_theme_constant_override("separation", 16)
	add_child(top_row)
	horse_row = HBoxContainer.new()
	horse_row.position = Vector2(PAD_X, TOP + 60)
	horse_row.size = Vector2(1600 - PAD_X * 2, 50)
	horse_row.add_theme_constant_override("separation", 12)
	add_child(horse_row)
	grid = Control.new()
	grid.position = Vector2(PAD_X, GRID_Y)
	grid.size = Vector2(1600 - PAD_X * 2 - DETAIL_W - 16, BOTTOM - GRID_Y)
	grid.mouse_filter = Control.MOUSE_FILTER_PASS
	add_child(grid)
	var pb := UiScreen.panel_box(true, 8)
	var dp: PanelContainer = pb[0]
	dp.position = Vector2(1600 - PAD_X - DETAIL_W, GRID_Y)
	dp.size = Vector2(DETAIL_W, BOTTOM - GRID_Y)
	dp.custom_minimum_size = dp.size
	dp.clip_contents = true
	add_child(dp)
	detail = pb[1]
	_fill(false)
	if OS.get_cmdline_user_args().has("--book") and not horses.is_empty():
		# 撮影の見本：見ている月の最初に予約できるレースを予約しておく
		for r in rs:
			if r.can == "reserve" and HSProgram.month_of(mo).m == r.wk.m:
				HSProgram.reserve(horses[cur].id, r.race.key)
				break
		_fill(false)

# 馬・絞り込みを替えたとき：行を作り直して全部を描き直す
func _fill(refocus: bool) -> void:
	rs = HSProgram.rows(horses[cur], opt) if not horses.is_empty() else []
	mo = clampi(mo, 0, HSProgram.last_month())
	_fill_top()
	_fill_horse()
	_fill_grid()
	if refocus:
		focus_first()

# ---- 1. 月の札と絞り込み ----
func _fill_top() -> void:
	_clear(top_row)
	filt.clear()
	var labels: Array = []
	for k in HSProgram.last_month() + 1:
		var ym := HSProgram.month_of(k)
		labels.append(HSText.month(ym.m) + ("・" if HSProgram.month_mine(rs, k) else ""))   # 予約・登録のある月は「・」
	var tb := UiTheme.tabs(labels, mo, pad, func(k): _month(k))
	for b in tb.find_children("*", "Button", true, false):
		(b as Button).custom_minimum_size = Vector2(62, 36)
		(b as Button).add_theme_font_size_override("font_size", 14)
	top_row.add_child(tb)
	top_row.add_child(UiScreen.spacer())
	var fl := _seg("表示", "show", [["all", "出られない重賞も"], ["ok", "出られるレース"]])
	fl.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	top_row.add_child(fl)

func _seg(label: String, key: String, opts: Array) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	h.add_child(UiTheme.label(label, 12, UiTheme.MUTED))
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SUNK, Color(0, 0, 0, 0), 0, 999, Vector4(3, 3, 3, 3)))
	var g := HBoxContainer.new()
	g.add_theme_constant_override("separation", 2)
	p.add_child(g)
	for o in opts:
		var b := Button.new()
		b.text = HSText.t(String(o[1]))
		b.custom_minimum_size = Vector2(0, 30)
		b.add_theme_font_size_override("font_size", 13)
		if String(opt[key]) == String(o[0]):
			# 選んだ札は明るい革に金の縁と金の字（主な操作の金の面と見分ける。docs/UI.md「色の役目」の「選んだ物」）
			b.add_theme_stylebox_override("normal", UiTheme.box(UiTheme.ACT_HI, UiTheme.GOLD, 1, 999, Vector4(12, 4, 12, 4)))
			b.add_theme_color_override("font_color", UiTheme.GOLD_BRIGHT)
		else:
			b.add_theme_stylebox_override("normal", UiTheme.box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 999, Vector4(12, 4, 12, 4)))
			b.add_theme_color_override("font_color", UiTheme.MUTED)
		var v = o[0]
		b.pressed.connect(func(): opt[key] = v; _focus_key = ""; _fill(true))
		g.add_child(b)
		filt.append(b)
	h.add_child(p)
	return h

# ---- 馬の要点（距離・芝ダの向き・脚質・疲労）と次走 ----
func _fill_horse() -> void:
	_clear(horse_row)
	b_horse = null
	if horses.is_empty():
		horse_row.add_child(UiTheme.label("お手馬がいません", 16, UiTheme.MUTED))
		return
	var h: Dictionary = horses[cur]
	var pb := UiScreen.panel_box(false, 0)
	var sp: PanelContainer = pb[0]
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	horse_row.add_child(sp)
	var l1 := HBoxContainer.new()
	l1.add_theme_constant_override("separation", 14)
	(pb[1] as VBoxContainer).add_child(l1)
	# 馬の名前の札：押すと次の馬（R・Y でも）。お手馬が1頭なら押せない字
	if horses.size() > 1:
		b_horse = UiScreen.button(HSText.horse_name(h), false, 0, 36, 18)
		UiScreen.compact(b_horse, 16)
		b_horse.add_theme_font_override("font", UiTheme.mincho())
		b_horse.pressed.connect(func(): _horse_step(1))
		l1.add_child(b_horse)
		l1.add_child(UiGlyph.make("R", "Y", 11))
		l1.add_child(UiTheme.label("%d/%d" % [cur + 1, horses.size()], 13, UiTheme.FAINT))
	else:
		l1.add_child(UiTheme.title(HSText.horse_name(h), 20))
	l1.add_child(UiTheme.label(HSText.t("%s・%s") % [HSText.sex_age(h, int(HSWorld.G.year - float(h.born))), HSText.tparts(String(h.style))], 15, UiTheme.MUTED))
	l1.add_child(UiTheme.label(HSText.t("距離 %s〜%sm") % [HSU.num(h.distMin), HSU.num(h.distMax)], 15))
	l1.add_child(UiTheme.label("芝", 14, UiTheme.MUTED))
	l1.add_child(UiTheme.mark(HSProgram.fit_surf(h, "芝")))
	l1.add_child(UiTheme.label("ダ", 14, UiTheme.MUTED))
	l1.add_child(UiTheme.mark(HSProgram.fit_surf(h, "ダ")))
	# 馬の状態は疲労の段階（調子は無い：持ち主の決定 2026-10-20）
	var fv := HSFatigue.view(h)
	l1.add_child(UiTheme.label("入厩前" if h.loc == "farm" else HSText.t("疲労 %s") % HSText.t(String(fv.label)), 15, Color(String(fv.color)) if h.loc == "stable" else UiTheme.FAINT))
	l1.add_child(UiScreen.spacer())
	var nx = HSProgram.next(h)
	l1.add_child(UiTheme.label("次走", 13, UiTheme.MUTED))
	var nt := "未定"
	if nx != null:
		nt = HSText.t("今週　%s") % HSText.race_label(nx.race) if nx.get("entered") else "%s　%s" % [HSText.tx(String(nx.label)), HSText.race_name(String(nx.name))]
	l1.add_child(UiTheme.title(nt, 17, UiTheme.GOLD_BRIGHT if nx != null else UiTheme.FAINT))
	# おまかせ（入っていると、出るレースを自動で選ぶ）
	var ba := UiScreen.button(HSText.t("おまかせ：%s") % HSText.t("入" if h.get("auto") else "切"), false, 150, 34, 14)
	ba.add_theme_color_override("font_color", UiTheme.GOLD_BRIGHT if h.get("auto") else UiTheme.MUTED)
	var hid: String = h.id
	ba.pressed.connect(func():
		var hh = HSWorld.horse(hid)
		hh.auto = not hh.get("auto")
		if hh.auto: HSWorld.unenter(hid)
		HSWorld.dirty()
		UiFlow.save()
		_fill(false)
		toast(HSText.t("おまかせを%sにした") % HSText.t("入" if hh.auto else "切"), "good"))
	l1.add_child(ba)

# ---- 2. 月の格子 ----
func _fill_grid() -> void:
	_clear(grid)
	rows.clear()
	cards.clear()
	if horses.is_empty():
		_fill_detail(null)
		return
	var h: Dictionary = horses[cur]
	mg = HSProgram.month_grid(rs, mo)
	var bk := Panel.new()
	bk.add_theme_stylebox_override("panel", UiTheme.backing())
	bk.size = grid.size
	bk.mouse_filter = Control.MOUSE_FILTER_IGNORE
	grid.add_child(bk)
	# 列の幅：過ぎた週・範囲の外の列は細く、残りを出られる週で分ける
	var cols: Array = mg.cols
	var inner := grid.size.x - 16.0 - LABEL_W
	var n_open := 0
	for c in cols: if c.state == "open": n_open += 1
	var gap := 8.0
	var wide := (inner - NARROW * (cols.size() - n_open) - gap * cols.size()) / maxf(1.0, n_open)
	# 月の名前（左上）
	var mv := VBoxContainer.new()
	mv.add_theme_constant_override("separation", -6)
	mv.position = Vector2(12, 4)
	mv.size = Vector2(LABEL_W, HEAD_H)
	mv.add_child(UiTheme.label(HSText.year_label(mg.y), 12, UiTheme.MUTED))
	mv.add_child(UiTheme.title(HSText.month(mg.m), 20, UiTheme.GOLD))
	grid.add_child(mv)
	# 段の位置
	var by := {}
	var y := 8.0 + HEAD_H
	for b in HSProgram.BANDS:
		by[b] = y
		y += SLOTS[b] * (CARD_H + CARD_GAP) - CARD_GAP + BAND_GAP
	for b in HSProgram.BANDS:
		var bl := UiTheme.title(BAND_NAME[b], 15, UiTheme.IVORY)
		bl.position = Vector2(12, by[b])
		bl.size = Vector2(LABEL_W, CARD_H)
		bl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		grid.add_child(bl)
		if b != "jp":
			var ln := ColorRect.new()
			ln.color = UiTheme.LINE_STRONG
			ln.position = Vector2(10, by[b] - BAND_GAP * 0.5 - 1)
			ln.size = Vector2(grid.size.x - 20, 1)
			ln.mouse_filter = Control.MOUSE_FILTER_IGNORE
			grid.add_child(ln)
	var x := 8.0 + LABEL_W + gap
	for ci in cols.size():
		var col: Dictionary = cols[ci]
		var w := wide if col.state == "open" else NARROW
		# 週の見出し：「n週」と「今週」「n週後」
		var hv := VBoxContainer.new()
		hv.add_theme_constant_override("separation", -4)
		hv.position = Vector2(x, 6)
		hv.size = Vector2(w, HEAD_H)
		var now: bool = col.state == "open" and col.i == 0
		var wl := UiTheme.title(HSText.t("GFの週") if col.w > 4 else HSText.t("%s週") % HSU.num(col.w), 16, UiTheme.GOLD_BRIGHT if now else UiTheme.IVORY)
		wl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		hv.add_child(wl)
		var sub := ""
		if col.state == "past": sub = "過ぎた週"
		elif col.state == "out": sub = "予約の外"
		elif now: sub = "今週"
		else: sub = HSText.t("%d週後") % int(col.i)
		hv.add_child(UiTheme.label(sub, 12, UiTheme.GOLD if now else UiTheme.FAINT, HORIZONTAL_ALIGNMENT_CENTER))
		grid.add_child(hv)
		if col.state == "open":
			for b in HSProgram.BANDS:
				var fb := HSProgram.fit_band(col.bands[b], SLOTS[b])
				var cy: float = by[b]
				for r in fb[0]:
					_card(h, r, ci, b, Vector2(x, cy), w)
					cy += CARD_H + CARD_GAP
				if fb[1].size():
					_more(fb[1], ci, b, Vector2(x, cy), w, col)
		x += w + gap
	_fill_detail(null)

# レースの札：格・名前・距離と芝ダ（登録・予約したものは金の札）。出られないものは薄く
func _card(h: Dictionary, r: Dictionary, ci: int, band: String, pos: Vector2, w: float) -> void:
	var race: Dictionary = r.race
	var mine: bool = r.state != null
	var rb := UiScreen.row_button(CARD_H, mine)
	var b: Button = rb[0]
	var hb: HBoxContainer = rb[1]
	hb.offset_left = 8
	hb.offset_right = -6
	hb.add_theme_constant_override("separation", 6)
	b.position = pos
	b.size = Vector2(w, CARD_H)
	b.clip_contents = true
	hb.add_child(UiTheme.class_chip(UiFlow.class_label(race), race.get("graded") == true, 12))
	var nl := UiTheme.label(HSText.race_label(race), 14, UiTheme.GOLD_BRIGHT if mine else UiTheme.IVORY)
	nl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	nl.clip_text = true
	nl.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	hb.add_child(nl)
	if mine:
		hb.add_child(UiTheme.chip(HSText.t("出走" if r.state == "entered" else "予約済"), UiTheme.GOLD, UiTheme.ON_GOLD, 11))
	else:
		hb.add_child(UiTheme.chip(HSText.surf_dist(String(race.surface), float(race.dist)), UiTheme.TURF if race.surface == "芝" else UiTheme.DIRT, Color.WHITE, 11))
	UiScreen.pass_mouse(hb)
	if not mine and r.can == null:
		hb.modulate.a = 0.45
	var what := _what(r)
	b.set_meta("key", String(race.key))
	b.set_meta("what", what)
	b.pressed.connect(func(): _do(h, race, what))
	b.focus_entered.connect(func(): _fill_detail({"r": r}))
	grid.add_child(b)
	rows.append(b)
	cards.append({"b": b, "col": ci, "band": band, "r": r})

# 「ほか n」の札：押すとその週・その段の全部を一覧の小窓で
func _more(list: Array, ci: int, band: String, pos: Vector2, w: float, col: Dictionary) -> void:
	var rb := UiScreen.row_button(CARD_H, false)
	var b: Button = rb[0]
	var hb: HBoxContainer = rb[1]
	b.position = pos
	b.size = Vector2(w, CARD_H)
	hb.alignment = BoxContainer.ALIGNMENT_CENTER
	hb.add_child(UiTheme.label(HSText.t("ほか%d") % list.size(), 14, UiTheme.GOLD))
	if list.any(func(r): return r.can != null):
		hb.add_child(UiTheme.label("出られる", 12, UiTheme.MUTED))   # 中に出走・予約できるレースがある
	UiScreen.pass_mouse(hb)
	var all: Array = col.bands[band]
	b.set_meta("key", "")
	b.set_meta("what", "more")
	b.pressed.connect(func(): _list(all, band, col))
	b.focus_entered.connect(func(): _fill_detail({"more": list, "band": band, "col": col}))
	grid.add_child(b)
	rows.append(b)
	cards.append({"b": b, "col": ci, "band": band, "more": list})

static func _what(r: Dictionary) -> String:
	if r.state == "entered": return "unenter"
	if r.state == "reserved": return "unreserve"
	if r.can == "enter": return "enter"
	if r.can == "reserve": return "reserve"
	return ""

# ---- 3. 詳しい欄（カーソルの札。画面の右の1か所） ----
func _fill_detail(e) -> void:
	_clear(detail)
	if e == null:
		detail.add_child(UiTheme.label("札を選ぶと、レースの条件と出られるかをここに出す", 14, UiTheme.MUTED))
		(detail.get_child(0) as Label).autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		return
	if e.has("more"):
		var col: Dictionary = e.col
		detail.add_child(UiTheme.label(_date(col.w, col.i), 14, UiTheme.MUTED))
		detail.add_child(UiTheme.title(HSText.t("%sのほかのレース") % HSText.t(BAND_NAME[e.band]), 20))
		for r in (e.more as Array).slice(0, 12):
			var hb := HBoxContainer.new()
			hb.add_theme_constant_override("separation", 8)
			hb.add_child(UiTheme.class_chip(UiFlow.class_label(r.race), r.race.get("graded") == true, 12))
			var nl := UiTheme.label(HSText.race_label(r.race), 14, UiTheme.IVORY if r.can != null or r.state != null else UiTheme.FAINT)
			nl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			nl.clip_text = true
			nl.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
			hb.add_child(nl)
			hb.add_child(UiTheme.label(HSText.surf_dist(String(r.race.surface), float(r.race.dist)), 12, UiTheme.MUTED))
			detail.add_child(hb)
		if (e.more as Array).size() > 12:
			detail.add_child(UiTheme.label(HSText.t("ほか%d") % ((e.more as Array).size() - 12), 13, UiTheme.FAINT))
		detail.add_child(_vfill())
		detail.add_child(_act_line("一覧を開く", false))
		return
	var r: Dictionary = e.r
	var race: Dictionary = r.race
	detail.add_child(UiTheme.label(_date(r.wk.w, r.wk.i), 14, UiTheme.GOLD_BRIGHT if r.wk.i == 0 else UiTheme.MUTED))
	var th := HBoxContainer.new()
	th.add_theme_constant_override("separation", 8)
	var cc := UiTheme.class_chip(UiFlow.class_label(race), race.get("graded") == true, 14)
	cc.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	th.add_child(cc)
	var tl := UiTheme.title(HSText.race_label(race), 21)
	tl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	tl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	th.add_child(tl)
	detail.add_child(th)
	detail.add_child(UiTheme.label(HSText.age_cond(race), 14, UiTheme.MUTED))
	var ch := HBoxContainer.new()
	ch.add_theme_constant_override("separation", 8)
	ch.add_child(UiTheme.label(HSText.course_name(String(race.course)), 16))
	ch.add_child(UiTheme.surface_chip(String(race.surface), int(race.dist), 13))
	detail.add_child(ch)
	detail.add_child(_kv("1着賞金", HSText.money(float(HSU.or_(race.get("prize"), 0.0)))))
	var fh := HBoxContainer.new()
	fh.add_theme_constant_override("separation", 10)
	fh.add_child(UiTheme.label("距離の向き", 13, UiTheme.MUTED))
	fh.add_child(UiTheme.mark(int(r.dist), 19))
	fh.add_child(UiTheme.label("馬場の向き", 13, UiTheme.MUTED))
	fh.add_child(UiTheme.mark(int(r.surf), 19))
	detail.add_child(fh)
	if r.others.size():
		detail.add_child(UiTheme.label(HSText.t("%sも予約") % HSText.t("・").join(r.others.map(func(x): return HSText.horse_name(String(x)))), 13, UiTheme.WARN))
	detail.add_child(_vfill())
	var what := _what(r)
	match what:
		"enter": detail.add_child(_act_line("出走する", true))
		"reserve": detail.add_child(_act_line("予約する", false))
		"unenter":
			detail.add_child(UiTheme.label("出走登録している", 14, UiTheme.GOLD_BRIGHT))
			detail.add_child(_act_line("取消", false))
		"unreserve":
			detail.add_child(UiTheme.label("予約している", 14, UiTheme.GOLD_BRIGHT))
			detail.add_child(_act_line("取消", false))
		_:
			var why := "この週は予約あり" if r.busy and r.why == null else HSText.tx(String(HSU.or_(r.why, "")))
			var wl := UiTheme.label(HSText.t("出られない：%s") % HSText.tx(why), 14, UiTheme.WARN)
			wl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			detail.add_child(wl)

func _date(w: float, i: int) -> String:
	var wl := HSText.week_label(mg.m, w)
	return HSText.t("%s・今週") % wl if i == 0 else HSText.t("%s・%d週後") % [wl, i]

# 描き直す前に外す（消えるのを待つ間に、古い札が並びや数えに入らないように）
static func _clear(n: Node) -> void:
	for c in n.get_children():
		n.remove_child(c)
		c.queue_free()

static func _vfill() -> Control:
	var c := Control.new()
	c.size_flags_vertical = Control.SIZE_EXPAND_FILL
	return c

func _kv(k: String, v: String) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	h.add_child(UiTheme.label(k, 13, UiTheme.MUTED))
	h.add_child(UiTheme.num_label(v, 16, UiTheme.IVORY, HORIZONTAL_ALIGNMENT_LEFT))
	return h

# 押すと何をするか（決定のボタンの印と、操作の札。札そのものは押せない：決定は格子の札で）
func _act_line(text: String, solid: bool) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	h.add_child(UiGlyph.make("Enter", "A", 12))
	var p := PanelContainer.new()
	var sb: StyleBoxFlat
	if solid:
		sb = UiTheme.box(UiTheme.GOLD_FACE[1], UiTheme.GOLD_DIM, 1, UiTheme.R_BUTTON, Vector4(16, 4, 16, 5))
	else:
		sb = UiTheme.box(UiTheme.ACT, UiTheme.ACT_EDGE, 1, UiTheme.R_BUTTON, Vector4(16, 4, 16, 5))
	sb.border_width_bottom = 3
	p.add_theme_stylebox_override("panel", sb)
	p.add_child(UiTheme.label(text, 15, UiTheme.ON_GOLD if solid else UiTheme.IVORY, HORIZONTAL_ALIGNMENT_CENTER))
	h.add_child(p)
	return h

# ---- 一覧の小窓（オープン・「ほか n」）：その週・その段の全部。行を押すと出走・予約・取消 ----
func _list(all: Array, band: String, col: Dictionary) -> void:
	var h: Dictionary = horses[cur]
	var pb := UiScreen.panel_box(true, 10)
	var p: PanelContainer = pb[0]
	var v: VBoxContainer = pb[1]
	v.add_child(UiTheme.title("%s　%s" % [HSText.week_label(mg.m, col.w), HSText.t(BAND_NAME[band])], 20))
	var two: bool = all.size() > 12
	var g := GridContainer.new()
	g.columns = 2 if two else 1
	g.add_theme_constant_override("h_separation", 8)
	g.add_theme_constant_override("v_separation", 4)
	v.add_child(g)
	var first: Button = null
	for r in all:
		var race: Dictionary = r.race
		var rb := UiScreen.row_button(34, r.state != null)
		var b: Button = rb[0]
		var hb: HBoxContainer = rb[1]
		b.custom_minimum_size.x = 540 if two else 680
		hb.add_child(UiTheme.class_chip(UiFlow.class_label(race), race.get("graded") == true, 12))
		var nl := UiTheme.label(HSText.race_label(race), 14)
		nl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		nl.clip_text = true
		nl.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		hb.add_child(nl)
		hb.add_child(UiTheme.label(HSText.course_name(String(race.course)), 13, UiTheme.MUTED))
		hb.add_child(UiTheme.chip(HSText.surf_dist(String(race.surface), float(race.dist)), UiTheme.TURF if race.surface == "芝" else UiTheme.DIRT, Color.WHITE, 11))
		hb.add_child(UiTheme.mark(int(r.dist), 15))
		hb.add_child(UiTheme.mark(int(r.surf), 15))
		var what := _what(r)
		var al := {"enter": "出走する", "reserve": "予約する", "unenter": "出走 ・ 取消", "unreserve": "予約 ・ 取消"}
		var lab := UiTheme.label(al.get(what, "この週は予約あり" if r.busy and r.why == null else HSText.tx(String(HSU.or_(r.why, "")))), 12, UiTheme.GOLD_BRIGHT if what != "" else UiTheme.WARN, HORIZONTAL_ALIGNMENT_RIGHT)
		lab.custom_minimum_size.x = 120
		lab.clip_text = true
		hb.add_child(lab)
		UiScreen.pass_mouse(hb)
		if what == "":
			hb.modulate.a = 0.5
		b.pressed.connect(func(): close_modal(); _do(h, race, what))
		g.add_child(b)
		if first == null or (String(first.get_meta("what", "")) == "" and what != ""):
			first = b
		b.set_meta("what", what)
	var close := UiScreen.button("閉じる", false, 160, 40, 15)
	close.pressed.connect(close_modal)
	var ch := HBoxContainer.new()
	ch.alignment = BoxContainer.ALIGNMENT_END
	ch.add_child(close)
	v.add_child(ch)
	open_modal(p, first if first else close)

func _do(h: Dictionary, race: Dictionary, what: String) -> void:
	var err = null
	var msg := ""
	match what:
		"enter":
			err = HSWorld.enter(h.id, race.key)
			if err == null: h.auto = false
			msg = HSText.t("%sに出走登録した") % HSText.race_label(race)
		"unenter":
			HSWorld.unenter(h.id)
			msg = "出走を取り消した"
		"reserve":
			err = HSProgram.reserve(h.id, race.key)
			msg = HSText.t("%s %sを予約した") % [HSText.week_label(race.month, race.week), HSText.race_label(race)]
		"unreserve":
			HSSeason.unreserve(h.id, race.key)
			msg = "予約を取り消した"
		_:
			toast(HSText.t("出られない：%s") % HSText.tx(_why_of(h, race)), "bad")
			return
	if err:
		toast(HSText.tx(String(err)), "bad")
		return
	HSWorld.dirty()
	UiFlow.save()
	_focus_key = race.key
	_fill(true)
	toast(msg, "good")

func _why_of(h: Dictionary, race: Dictionary) -> String:
	for r in HSProgram.rows(h, {"show": "all"}):
		if r.race.key == race.key:
			return String(HSU.or_(r.why, "この週は予約あり" if r.busy else ""))
	return ""

# ---- 操作：R・Y で馬を替える。格子の左右の端から外へ押すと、前・次の月 ----
func _input(ev: InputEvent) -> void:
	super._input(ev)
	if _modal != null or shots.size() > 0:
		return
	if (ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_R) or (ev is InputEventJoypadButton and ev.pressed and ev.button_index == JOY_BUTTON_Y):
		_horse_step(1)
		get_viewport().set_input_as_handled()
		return
	var d := 0
	if ev.is_action_pressed("ui_left", true): d = -1
	elif ev.is_action_pressed("ui_right", true): d = 1
	if d == 0:
		return
	var fo := get_viewport().gui_get_focus_owner()
	var e = null
	for c in cards:
		if c.b == fo: e = c
	if e == null:
		return
	var open: Array = []
	for ci in mg.cols.size():
		if mg.cols[ci].state == "open": open.append(ci)
	var at_edge: bool = (d < 0 and e.col == open.front()) or (d > 0 and e.col == open.back())
	var k := mo + d
	if at_edge and k >= 0 and k <= HSProgram.last_month():
		var fy: float = (fo as Control).global_position.y
		_month(k, d)
		_focus_y = fy
		get_viewport().set_input_as_handled()

# 月を送ったとき：入った側の端の列で、前の札に近い高さの札へ
func _focus_edge(d: int) -> void:
	var open: Array = []
	for ci in mg.cols.size():
		if mg.cols[ci].state == "open": open.append(ci)
	if open.is_empty() or cards.is_empty():
		focus_first()
		return
	var want: int = open.back() if d < 0 else open.front()
	var y0 := _focus_y
	(func():
		var best = null
		for c in cards:
			if c.col != want: continue
			if best == null or absf(c.b.global_position.y - y0) < absf(best.b.global_position.y - y0): best = c
		if best and is_instance_valid(best.b) and best.b.is_inside_tree(): best.b.grab_focus()
		else: focus_first()).call_deferred()

func focus_first() -> void:
	if rows.is_empty():
		if b_horse: _grab(b_horse)
		return
	if _focus_key != "":
		for r in rows:
			if String(r.get_meta("key", "")) == _focus_key:
				_grab(r)
				return
	# 最初に出走・予約できる札（無ければ最初の札）
	for r in rows:
		if String(r.get_meta("what", "")) in ["enter", "reserve"]:
			_grab(r)
			return
	_grab(rows[0])

# 次のフレームで掴む（それまでに描き直して外れた札・小窓で止めた札は掴まない）
static func _grab(b: Control) -> void:
	(func():
		if is_instance_valid(b) and b.is_inside_tree() and b.focus_mode != Control.FOCUS_NONE: b.grab_focus()).call_deferred()
