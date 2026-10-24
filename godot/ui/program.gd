# 番組表（次走を選ぶ。docs/UI.md「番組表」・GAM-76）：お手馬をタブ（Q/E・LB/RB）で替え、今週から1年先までの週ごとのレースを並べる
# 1. 馬の要点（距離・芝ダの向き・脚質・疲労・総合力）と「次走」の札（右端・金の縁）
# 2. 絞り込み：表示（出られるレース／出られない重賞も）・種類（すべて／重賞）・馬場（すべて／芝／ダ）
# 3. 表：月の区切り → 週ごとの行（週・格と名前と条件・コース・距離の向き・馬場の向き・1着賞金・操作）
# 4. 操作：行を押すと、今週は「出走する」（金）、先の週は「予約する」、登録・予約済みは「取消」。出られないときは理由
# 中身は HSProgram.rows（godot/core）。決まりは画面で作り直さない
extends UiScreen

const COLS := [["週", 78], ["レース", 0], ["コース", 170], ["距離", 50], ["馬場", 50], ["1着賞金", 120], ["", 150]]

var horses: Array = []
var cur := 0
var opt := {"show": "ok", "kind": "all", "surf": ""}
var scroll: ScrollContainer
var list: VBoxContainer
var rows: Array[Button] = []
var top_box: VBoxContainer
var filt: Array[Button] = []
var _focus_key := ""
var back_to := "home"     # もどる画面（UiFlow.program_back。厩舎・お手馬の画面から開くとそこへ）

func hint() -> String:
	return "今週は出走登録、来週から先は予約（その週の初めに出走登録に変わる）"

func keys() -> Array:
	return [["↑↓", "十字", "選ぶ"], ["Enter", "A", "出走・予約"], ["Q/E", "LB/RB", "馬"], ["Esc", "B", "もどる"]]

func on_back() -> void:
	go(back_to)

func on_tab(d: int) -> void:
	if horses.size() < 2:
		return
	cur = posmod(cur + d, horses.size())
	UiFlow.program_id = horses[cur].id
	_fill(true)

func build() -> void:
	backdrop("bg_home", 0.84)
	back_to = UiFlow.program_back
	UiFlow.program_back = "home"
	horses = HSWorld.mine("stable") + HSWorld.mine("farm")
	cur = 0
	for i in horses.size():
		if horses[i].id == UiFlow.program_id: cur = i
	make_band("暦", "番組表", "今週から1年先までのレース", [["暦", UiFlow.date_label()], ["資金", UiFlow.money_label(), "money"]])
	top_box = VBoxContainer.new()
	top_box.position = Vector2(PAD_X, TOP + 4)
	top_box.custom_minimum_size = Vector2(1600 - PAD_X * 2, 0)
	top_box.add_theme_constant_override("separation", 8)
	add_child(top_box)
	scroll = ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	scroll.position = Vector2(PAD_X, 290)
	scroll.size = Vector2(1600 - PAD_X * 2, 1000 - 290 - 52)
	add_child(scroll)
	list = VBoxContainer.new()
	list.add_theme_constant_override("separation", 2)
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiScreen.back_under(scroll, list)
	scroll.add_child(list)
	_fill(false)

func _fill(refocus: bool) -> void:
	for c in top_box.get_children(): c.queue_free()
	for c in list.get_children(): c.queue_free()
	rows.clear()
	filt.clear()
	if horses.is_empty():
		top_box.add_child(UiTheme.label("お手馬がいません", 16, UiTheme.MUTED))
		return
	var h: Dictionary = horses[cur]
	var wi := HSWorld.w_idx()
	# 1行目：馬のタブと絞り込み（同じ行に置いて、表を上へ広げる）
	var row0 := HBoxContainer.new()
	row0.add_theme_constant_override("separation", 16)
	top_box.add_child(row0)
	var tb := UiTheme.tabs(horses.map(func(x): return HSText.horse_name(x)), cur, pad, func(k): cur = k; UiFlow.program_id = horses[k].id; _fill(true))
	tb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row0.add_child(tb)
	# 馬の要点と次走の札
	var sh := HBoxContainer.new()
	sh.add_theme_constant_override("separation", 12)
	top_box.add_child(sh)
	var pb := UiScreen.panel_box(false, 4)
	var sp: PanelContainer = pb[0]
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sh.add_child(sp)
	var l1 := HBoxContainer.new()
	l1.add_theme_constant_override("separation", 14)
	(pb[1] as VBoxContainer).add_child(l1)
	l1.add_child(UiTheme.title(HSText.horse_name(h), 22))
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
	var fh := HSSeason.fh_show_both(h, wi)
	l1.add_child(UiTheme.label("総合力", 12, UiTheme.MUTED))
	l1.add_child(UiTheme.label("芝", 13, UiTheme.MUTED))
	l1.add_child(UiTheme.stat_chip(float(fh.turf)))
	l1.add_child(UiTheme.label("ダ", 13, UiTheme.MUTED))
	l1.add_child(UiTheme.stat_chip(float(fh.dirt)))
	# おまかせ（入っていると、出るレースを自動で選ぶ。js/ui/app.js の act.auto と同じ）
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
	var nb := UiScreen.panel_box(true, 0)
	(nb[0] as PanelContainer).custom_minimum_size.x = 360
	sh.add_child(nb[0])
	var nx = HSProgram.next(h)
	(nb[1] as VBoxContainer).add_child(UiTheme.label("次走", 12, UiTheme.MUTED))
	var nt := "未定"
	if nx != null:
		nt = HSText.t("今週　%s") % HSText.race_label(nx.race) if nx.get("entered") else "%s　%s" % [HSText.tx(String(nx.label)), HSText.race_name(String(nx.name))]
	(nb[1] as VBoxContainer).add_child(UiTheme.title(nt, 19, UiTheme.GOLD_BRIGHT if nx != null else UiTheme.FAINT))
	# 絞り込み（選び肢の札。押すと切り替わる）
	var fl := HBoxContainer.new()
	fl.add_theme_constant_override("separation", 12)
	fl.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	row0.add_child(fl)
	fl.add_child(_seg("表示", "show", [["ok", "出られるレース"], ["all", "出られない重賞も"]]))
	fl.add_child(_seg("種類", "kind", [["all", "オープンと重賞"], ["graded", "重賞だけ"]]))
	fl.add_child(_seg("馬場", "surf", [["", "すべて"], ["芝", "芝"], ["ダ", "ダート"]]))
	# 見出しの行
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 10)
	for c in COLS:
		var l := UiTheme.label(c[0], 11, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_CENTER if c[1] > 0 else HORIZONTAL_ALIGNMENT_LEFT)
		if c[1] > 0: l.custom_minimum_size.x = c[1]
		else: l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		head.add_child(l)
	var hm := MarginContainer.new()
	hm.add_theme_constant_override("margin_left", 12)
	hm.add_theme_constant_override("margin_right", 12)
	hm.add_child(head)
	top_box.add_child(hm)
	# 表
	var rs := HSProgram.rows(h, opt)
	var last_m := -1.0
	for r in rs:
		if r.wk.m != last_m:
			last_m = r.wk.m
			var ml := UiTheme.title(HSText.month(r.wk.m), 15, UiTheme.GOLD)
			var mc := MarginContainer.new()
			mc.add_theme_constant_override("margin_left", 8)
			mc.add_theme_constant_override("margin_top", 0)
			mc.add_child(ml)
			list.add_child(mc)
		list.add_child(_row(h, r))
	if rows.is_empty():
		list.add_child(UiTheme.label("この条件で出られるレースがありません。「出られない重賞も」で見られます", 15, UiTheme.MUTED))
	if refocus:
		focus_first()

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
		b.pressed.connect(func(): opt[key] = v; _fill(true))
		g.add_child(b)
		filt.append(b)
	h.add_child(p)
	return h

func _row(h: Dictionary, r: Dictionary) -> Button:
	var race: Dictionary = r.race
	var mine: bool = r.state != null
	var rb := UiScreen.row_button(28, mine)
	var b: Button = rb[0]
	var hb: HBoxContainer = rb[1]
	var faded: bool = r.why != null and not mine
	var wl := UiTheme.label("今週" if r.wk.i == 0 else HSText.t("%s週（%d週後）") % [HSU.num(r.wk.w), int(r.wk.i)], 13, UiTheme.GOLD_BRIGHT if r.wk.i == 0 else UiTheme.MUTED, HORIZONTAL_ALIGNMENT_CENTER)
	wl.custom_minimum_size.x = COLS[0][1]
	hb.add_child(wl)
	var nm := HBoxContainer.new()
	nm.add_theme_constant_override("separation", 8)
	nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	nm.add_child(UiTheme.class_chip(UiFlow.class_label(race), race.get("graded") == true))
	var nl := UiTheme.label(HSText.race_label(race), 15)
	nm.add_child(nl)
	nm.add_child(UiTheme.label(_cond(race), 12, UiTheme.FAINT))
	if r.others.size():
		nm.add_child(UiTheme.label(HSText.t("%sも予約") % HSText.t("・").join(r.others.map(func(x): return HSText.horse_name(String(x)))), 12, UiTheme.WARN))
	hb.add_child(nm)
	var cl := HBoxContainer.new()
	cl.custom_minimum_size.x = COLS[2][1]
	cl.add_theme_constant_override("separation", 6)
	cl.add_child(UiTheme.label(HSText.course_name(String(race.course)), 14))
	var sc := UiTheme.chip(HSText.surf_dist(String(race.surface), float(race.dist)), UiTheme.TURF if race.surface == "芝" else UiTheme.DIRT, Color.WHITE, 12)
	sc.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	cl.add_child(sc)
	hb.add_child(cl)
	var dm := UiTheme.mark(int(r.dist))
	dm.custom_minimum_size.x = COLS[3][1]
	hb.add_child(dm)
	var sm := UiTheme.mark(int(r.surf))
	sm.custom_minimum_size.x = COLS[4][1]
	hb.add_child(sm)
	var pl := UiTheme.num_label(HSText.money(float(HSU.or_(race.get("prize"), 0.0))), 14, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
	pl.custom_minimum_size.x = COLS[5][1]
	hb.add_child(pl)
	# 操作の列（押せる形の札。行を押すとこの操作）
	var act := CenterContainer.new()
	act.custom_minimum_size.x = COLS[6][1]
	var what := ""
	if r.state == "entered":
		act.add_child(_act_chip("出走 ・ 取消", true)); what = "unenter"
	elif r.state == "reserved":
		act.add_child(_act_chip("予約 ・ 取消", true)); what = "unreserve"
	elif r.can == "enter":
		act.add_child(_act_chip("出走する", true, true)); what = "enter"
	elif r.can == "reserve":
		act.add_child(_act_chip("予約する", false)); what = "reserve"
	elif r.busy:
		act.add_child(UiTheme.label("この週は予約あり", 12, UiTheme.FAINT))
	else:
		act.add_child(UiTheme.label(HSText.tx(String(HSU.or_(r.why, ""))), 12, UiTheme.WARN))
	hb.add_child(act)
	UiScreen.pass_mouse(hb)
	if faded:
		hb.modulate.a = 0.55
		act.modulate.a = 1.0 / 0.55
	var key: String = race.key
	b.set_meta("key", key)
	b.set_meta("what", what)
	b.pressed.connect(func(): _do(h, race, what))
	if what == "":
		b.focus_mode = Control.FOCUS_ALL   # 理由を読めるようにカーソルは止まる（押すと理由を返す）
	rows.append(b)
	return b

static func _cond(race: Dictionary) -> String:
	return HSText.age_cond(race)

func _act_chip(text: String, gold: bool, solid := false) -> PanelContainer:
	var p := PanelContainer.new()
	var sb: StyleBoxFlat
	if solid:
		sb = UiTheme.box(UiTheme.GOLD_FACE[1], UiTheme.GOLD_DIM, 1, UiTheme.R_BUTTON, Vector4(14, 3, 14, 4))
		sb.border_width_bottom = 3
	else:
		sb = UiTheme.box(UiTheme.ACT, UiTheme.GOLD_BRIGHT if gold else UiTheme.ACT_EDGE, 1, UiTheme.R_BUTTON, Vector4(14, 3, 14, 4))   # 行の操作の札は押せる物の形（革の面・金の縁）
		sb.border_width_bottom = 3
	p.add_theme_stylebox_override("panel", sb)
	p.add_child(UiTheme.label(text, 14, UiTheme.ON_GOLD if solid else (UiTheme.GOLD_BRIGHT if gold else UiTheme.IVORY), HORIZONTAL_ALIGNMENT_CENTER))
	return p

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
			for r in rows:
				if r.has_focus():
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

func focus_first() -> void:
	if rows.is_empty():
		return
	if _focus_key != "":
		for r in rows:
			if is_instance_valid(r) and String(r.get_meta("key", "")) == _focus_key:
				r.grab_focus.call_deferred()
				return
	# 最初に出走・予約できる行（無ければ1行目）
	for r in rows:
		if String(r.get_meta("what", "")) != "":
			r.grab_focus.call_deferred()
			return
	rows[0].grab_focus.call_deferred()
