# 厩舎（docs/UI.md「厩舎」「馬の画面」）：お手馬を 1頭 1行（性齢・調子・総合力・次走）、右の見本に選んだ馬の中身と操作
# タブ（Q/E・LB/RB）：お手馬 n・牧場 n（引退した馬。オリジナルホースの親）
# 見本：総合力（いま・完成）・能力・距離と脚質と成長・特殊能力・戦績と重賞の勝ち鞍・トロフィーと冠。
# 操作：番組表（金）・おまかせの入切・引退させる（確かめは「やめる」から）。牧場の馬は「生産へ」「放す」
# 決まりは HSJockey.retire・HSOriginal.release（godot/core）を呼ぶだけ
extends UiScreen

const COLS := [["馬名", 0], ["性齢", 52], ["調子", 100], ["芝", 50], ["ダ", 50], ["次走", 230]]

var tab := 0
var list_v: VBoxContainer
var top_box: VBoxContainer
var pv: VBoxContainer
var portrait: UiHorsePortrait
var rows: Array[Button] = []
var horses: Array = []
var sel := 0

func hint() -> String:
	return "行を選ぶと右に中身。引退した馬は牧場に残り、オリジナルホースの親になる"

func keys() -> Array:
	return [["↑↓", "十字", "選ぶ"], ["Enter", "A", "番組表・生産"], ["X", "X", "引退・放す"], ["Q/E", "LB/RB", "お手馬・牧場"], ["Esc", "B", "もどる"]]

func on_back() -> void:
	go("home")

func on_tab(d: int) -> void:
	tab = posmod(tab + d, 2)
	sel = 0
	_fill()

func build() -> void:
	backdrop("bg_home", 0.84)
	make_band("厩", "厩舎", "お手馬と牧場の馬", [["お手馬", "%d/%d" % [HSSeason.own_count(), int(HSSeason.MAX_OWN)], "" if HSSeason.can_buy() else "warn"], ["毎月の費用", HSU.money(HSWorld.monthly_cost())], ["資金", UiFlow.money_label(), "money"]])
	top_box = VBoxContainer.new()
	top_box.position = Vector2(PAD_X, TOP + 4)
	top_box.custom_minimum_size = Vector2(1060, 0)
	top_box.add_theme_constant_override("separation", 8)
	add_child(top_box)
	var sc := ScrollContainer.new()
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	sc.follow_focus = true
	sc.position = Vector2(PAD_X, 212)
	sc.size = Vector2(1060, 1000 - 212 - 56)
	add_child(sc)
	list_v = VBoxContainer.new()
	list_v.add_theme_constant_override("separation", 4)
	list_v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_child(list_v)
	var pb := UiScreen.panel_box(true, 8)
	(pb[0] as PanelContainer).position = Vector2(PAD_X + 1060 + 20, TOP + 4)
	(pb[0] as PanelContainer).custom_minimum_size = Vector2(1600 - PAD_X * 2 - 1060 - 20, 830)
	add_child(pb[0])
	pv = pb[1]
	if UiFlow.program_id != "":
		var h = HSWorld.horse(UiFlow.program_id)
		if h and h.get("loc") == "retired": tab = 1
	_fill()

func _horses() -> Array:
	if tab == 1:
		return HSWorld.mine("retired")
	return HSWorld.mine("stable") + HSWorld.mine("farm")

func _fill() -> void:
	for c in top_box.get_children(): c.queue_free()
	for c in list_v.get_children(): c.queue_free()
	rows.clear()
	horses = _horses()
	var n0 := (HSWorld.mine("stable") + HSWorld.mine("farm")).size()
	top_box.add_child(UiTheme.tabs(["お手馬 %d" % n0, "牧場 %d" % HSWorld.mine("retired").size()], tab, pad, func(k): tab = k; sel = 0; _fill()))
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 10)
	var cols: Array = COLS if tab == 0 else [["馬名", 0], ["性", 40], ["戦績", 120], ["芝", 50], ["ダ", 50], ["親のボーナス", 130]]
	for c in cols:
		var l := UiTheme.label(c[0], 11, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_CENTER if c[1] > 0 else HORIZONTAL_ALIGNMENT_LEFT)
		if c[1] > 0: l.custom_minimum_size.x = c[1]
		else: l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		head.add_child(l)
	var hm := MarginContainer.new()
	hm.add_theme_constant_override("margin_left", 12)
	hm.add_theme_constant_override("margin_right", 12)
	hm.add_child(head)
	top_box.add_child(hm)
	var wi := HSWorld.w_idx()
	var G = HSWorld.G
	for i in horses.size():
		var h: Dictionary = horses[i]
		var rb := UiScreen.row_button(46, true)
		var b: Button = rb[0]
		var hb: HBoxContainer = rb[1]
		var nm := HBoxContainer.new()
		nm.add_theme_constant_override("separation", 8)
		nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var nl := UiTheme.label(String(h.name), 16)
		nl.clip_text = true
		nl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		nm.add_child(nl)
		if h.get("original"): nm.add_child(UiTheme.chip("オリジナル", UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT, 11))
		elif h.get("hist"): nm.add_child(UiTheme.chip("史実", UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT, 11))
		hb.add_child(nm)
		var fh := HSSeason.fh_both(h, wi) if tab == 0 else HSSeason.fh_peak(h)
		if tab == 0:
			var sa := UiTheme.num_label("%s%d" % ["セ" if h.get("gelding") else h.sex, int(G.year - float(h.born))], 15)
			sa.custom_minimum_size.x = 52
			hb.add_child(sa)
			var c: Dictionary = HSSeason.cond(h, wi)
			var ct := "入厩前" if h.loc == "farm" else ("故障" if h.get("injury") else String(c.label))
			var cl := UiTheme.label(ct, 13, Color(String(c.color)) if h.loc == "stable" and not h.get("injury") else UiTheme.FAINT, HORIZONTAL_ALIGNMENT_CENTER)
			cl.custom_minimum_size.x = 100
			hb.add_child(cl)
		else:
			var sx := UiTheme.label(String(h.sex), 15, UiTheme.IVORY, HORIZONTAL_ALIGNMENT_CENTER)
			sx.custom_minimum_size.x = 40
			hb.add_child(sx)
			var rc := UiTheme.num_label("%d戦%d勝" % [int(HSU.or_(h.get("starts"), 0.0)), int(HSU.or_(h.get("wins"), 0.0))], 14, UiTheme.MUTED)
			rc.custom_minimum_size.x = 120
			hb.add_child(rc)
		for k in ["turf", "dirt"]:
			var cw := CenterContainer.new()
			cw.custom_minimum_size.x = 50
			cw.add_child(UiTheme.stat_chip(float(fh[k])))
			hb.add_child(cw)
		var last: Label
		if tab == 0:
			var nx = HSProgram.next(h)
			var nt := "おまかせ" if h.get("auto") else "未定"
			if nx != null:
				nt = "今週 %s" % HSRaces.label(nx.race) if nx.get("entered") else "%s %s" % [nx.label, nx.name]
			last = UiTheme.label(nt, 14, UiTheme.GOLD_BRIGHT if nx != null else UiTheme.FAINT)
			last.custom_minimum_size.x = 230
		else:
			var pbn := float(HSU.or_(h.get("parentBonus"), 0.0))
			last = UiTheme.label("+%s" % HSU.num(pbn) if pbn > 0 else "－", 14, UiTheme.GOLD_BRIGHT if pbn > 0 else UiTheme.FAINT, HORIZONTAL_ALIGNMENT_CENTER)
			last.custom_minimum_size.x = 130
		last.clip_text = true
		hb.add_child(last)
		UiScreen.pass_mouse(hb)
		var k2: int = i
		b.focus_entered.connect(func(): _preview(k2))
		b.pressed.connect(func(): _main(k2))
		list_v.add_child(b)
		rows.append(b)
	if horses.is_empty():
		list_v.add_child(UiTheme.label("まだお手馬がいません。馬の店でデビュー前の史実馬を買いましょう" if tab == 0 else "まだいません。お手馬を引退させると牧場に残ります", 15, UiTheme.MUTED))
		_preview(-1)
	else:
		if UiFlow.program_id != "":
			for i in horses.size():
				if horses[i].id == UiFlow.program_id: sel = i
		sel = clampi(sel, 0, horses.size() - 1)
		_preview(sel)
		rows[sel].grab_focus.call_deferred()

func _main(i: int) -> void:
	if i < 0 or i >= horses.size(): return
	UiFlow.program_id = horses[i].id
	go("program" if tab == 0 else "breed")

# ---- 右の見本 ----
func _preview(i: int) -> void:
	for c in pv.get_children():
		if c != portrait: c.queue_free()
	if i < 0 or i >= horses.size():
		pv.add_child(UiTheme.label("馬を選ぶと、ここに中身が出ます", 14, UiTheme.MUTED))
		if portrait: portrait.visible = false
		return
	sel = i
	var h: Dictionary = horses[i]
	UiFlow.program_id = h.id
	var G = HSWorld.G
	var wi := HSWorld.w_idx()
	if portrait == null:
		portrait = UiHorsePortrait.new()
		portrait.custom_minimum_size = Vector2(0, 170)
		pv.add_child(portrait)
	portrait.visible = true
	portrait.set_horse(String(h.name), String(HSU.or_(h.get("coat"), "鹿毛")), G.year - float(h.born))
	var t := UiTheme.title(String(h.name), 22)
	t.clip_text = true
	pv.add_child(t)
	var sub := "%s%d・%s" % ["セ" if h.get("gelding") else h.sex, int(G.year - float(h.born)), HSU.or_(h.get("coat"), "")]
	if h.get("sire") and h.sire != "?": sub += "・父 %s" % h.sire
	if h.get("dam") and h.dam != "?": sub += "・母 %s" % h.dam
	var sl := UiTheme.label(sub, 13, UiTheme.MUTED)
	sl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	sl.custom_minimum_size.x = 100
	pv.add_child(sl)
	var fr := HBoxContainer.new()
	fr.add_theme_constant_override("separation", 8)
	var now := HSSeason.fh_both(h, wi)
	var pk := HSSeason.fh_peak(h)
	if h.loc != "retired":
		fr.add_child(UiTheme.label("総合力 いま", 13, UiTheme.MUTED))
		fr.add_child(UiTheme.stat_chip(float(now.turf), "fh", true))
		fr.add_child(UiTheme.stat_chip(float(now.dirt), "fh", true))
	fr.add_child(UiScreen.spacer())
	fr.add_child(UiTheme.label("完成", 13, UiTheme.MUTED))
	fr.add_child(UiTheme.stat_chip(float(pk.turf)))
	fr.add_child(UiTheme.stat_chip(float(pk.dirt)))
	pv.add_child(fr)
	var grid := GridContainer.new()
	grid.columns = 4
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 6)
	var c := HSHorse.cur(h, wi)
	for k in ["spd", "sta", "dspd", "dsta", "guts", "mind", "slope"]:
		grid.add_child(_cell(HSHorse.STAT_SHORT[k], float(c[k])))
	grid.add_child(_cell("切れ", float(HSU.or_(h.get("kire"), 4.0)), "kire"))
	pv.add_child(grid)
	pv.add_child(_kv("距離", "%s〜%sm" % [HSU.num(h.distMin), HSU.num(h.distMax)]))
	pv.add_child(_kv("脚質・成長", "%s・%s" % [HSHorse.style_text(h), HSU.or_(h.get("growth"), "")]))
	pv.add_child(_kv("戦績", "%d戦%d勝・獲得 %s" % [int(HSU.or_(h.get("starts"), 0.0)), int(HSU.or_(h.get("wins"), 0.0)), HSU.money(float(HSU.or_(h.get("earn"), 0.0)))]))
	var sk := HSSkills.of(h, wi)
	if sk.size():
		var fl := HFlowContainer.new()
		fl.add_theme_constant_override("h_separation", 6)
		fl.add_theme_constant_override("v_separation", 6)
		for id in sk.slice(0, 8):
			fl.add_child(UiTheme.chip(HSSkills.label(String(id)), UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT if HSSkills.is_unique(id) else UiTheme.IVORY, 12))
		pv.add_child(fl)
	var tro := HSHall.trophies_of(h)
	var tit: Array = HSU.or_(h.get("titles"), [])
	if tro.size() or tit.size():
		var tl := HFlowContainer.new()
		tl.add_theme_constant_override("h_separation", 6)
		for x in tro: tl.add_child(UiTheme.chip("🏆 " + String(x.label), UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 12))
		for x in tit: tl.add_child(UiTheme.chip("冠 " + String(x), UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT, 12))
		pv.add_child(tl)
	var gw: Array = HSU.or_(h.get("gradedWins"), [])
	for g in gw.slice(maxi(0, gw.size() - 3)):
		pv.add_child(UiTheme.label("%s %s" % [String(HSU.or_(g.get("grade"), "")), HSU.or_(g.get("short"), g.race)], 13, UiTheme.MUTED))
	var sp := Control.new()
	sp.size_flags_vertical = Control.SIZE_EXPAND_FILL
	pv.add_child(sp)
	var bh := HBoxContainer.new()
	bh.add_theme_constant_override("separation", 10)
	bh.alignment = BoxContainer.ALIGNMENT_END
	var id: String = h.id
	if h.loc == "retired":
		var br := UiScreen.danger_button("放す", 110, 46, 16)
		br.focus_mode = Control.FOCUS_NONE
		br.pressed.connect(func(): confirm("%sを牧場から放しますか？（親にできなくなります）" % h.name, "放す", func(): _release(id)))
		bh.add_child(br)
		var bb := UiScreen.button("生産へ", true, 170, 50, 20)
		bb.focus_mode = Control.FOCUS_NONE
		bb.pressed.connect(func(): go("breed"))
		bh.add_child(bb)
	else:
		var keep: bool = HSOriginal.on() and not h.get("gelding")
		var br := UiScreen.danger_button("引退させる", 140, 46, 16)
		br.focus_mode = Control.FOCUS_NONE
		br.pressed.connect(func(): confirm("%sを引退させますか？%s" % [h.name, "（牧場に残り、オリジナルホースの親にできます）" if keep else "（手もとを離れます）"], "引退させる", func(): _retire(id)))
		bh.add_child(br)
		var bp := UiScreen.button("番組表", true, 170, 50, 20)
		bp.focus_mode = Control.FOCUS_NONE
		bp.pressed.connect(func(): _main(i))
		bh.add_child(bp)
	pv.add_child(bh)

func _unhandled_input(ev: InputEvent) -> void:
	if _modal == null and horses.size() and ((ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_X) or (ev is InputEventJoypadButton and ev.pressed and ev.button_index == JOY_BUTTON_X)):
		var h: Dictionary = horses[clampi(sel, 0, horses.size() - 1)]
		var id: String = h.id
		if h.loc == "retired":
			confirm("%sを牧場から放しますか？（親にできなくなります）" % h.name, "放す", func(): _release(id))
		else:
			confirm("%sを引退させますか？" % h.name, "引退させる", func(): _retire(id))
		get_viewport().set_input_as_handled()
		return
	super._unhandled_input(ev)

func _retire(id: String) -> void:
	var r := HSJockey.retire(id)
	if r.has("err"):
		toast(String(r.err), "bad")
		return
	UiFlow.save()
	toast("引退させた（%s）" % ("牧場に残った" if r.get("to") == "retired" else "おつかれさま"), "good")
	_fill()

func _release(id: String) -> void:
	var err = HSOriginal.release(id)
	if err:
		toast(String(err), "bad")
		return
	UiFlow.save()
	toast("牧場から放した", "good")
	_fill()

func _cell(name: String, v: float, kind := "stat") -> HBoxContainer:
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 4)
	hb.add_child(UiTheme.stat_chip(v, kind))
	hb.add_child(UiTheme.label(name, 12, UiTheme.MUTED))
	return hb

func _kv(k: String, v: String) -> HBoxContainer:
	var hb := HBoxContainer.new()
	hb.add_child(UiTheme.label(k, 13, UiTheme.MUTED))
	hb.add_child(UiScreen.spacer())
	var l := UiTheme.label(v, 14)
	hb.add_child(l)
	return hb

func focus_first() -> void:
	if rows.size():
		rows[clampi(sel, 0, rows.size() - 1)].grab_focus()
