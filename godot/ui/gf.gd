# グランドフィナーレ（js/core/dream.js・js/ui の dreamAskAll と同じ中身）：12月2〜4週の距離ごとの5つの大一番
# タブ（Q/E・LB/RB）：区分（中長距離・マイル・短距離・長距離・ダート）
# 上：その区分の招待（12月1週に届く）と出す馬・辞退。下：その年のファンの票の順位（上位16頭が出られる。自分の馬は金の線）
# 決まりは HSSeason（dc_standing・dc_eligible・dc_choose・dc_decline・dc_runners）を呼ぶだけ
extends UiScreen

var cat := 0
var tab_box: VBoxContainer
var inv_box: VBoxContainer
var list: VBoxContainer
var rows: Array[Control] = []
var acts: Array[Button] = []

func hint() -> String:
	return "その年の G1 の勝ち馬とファンの票の上位16頭が出られる。招待は12月1週に届く"

func keys() -> Array:
	return [["↑↓", "十字", "選ぶ"], ["Enter", "A", "決定"], ["Q/E", "LB/RB", "区分"], ["Esc", "B", "もどる"]]

func on_back() -> void:
	go("home")

func on_tab(d: int) -> void:
	cat = posmod(cat + d, HSSeason.GF_ORDER.size())
	_fill()

func build() -> void:
	backdrop("bg_result", 0.8)
	make_band("終", HSSeason.DC_NAME, "12月2〜4週・距離ごとに5つ", [["暦", UiFlow.date_label()], ["資金", UiFlow.money_label(), "money"]])
	var pend := HSSeason.dc_pending_list()
	if pend.size(): cat = maxi(0, HSSeason.GF_ORDER.find(pend[0]))
	tab_box = VBoxContainer.new()
	tab_box.position = Vector2(PAD_X, TOP + 4)
	add_child(tab_box)
	inv_box = VBoxContainer.new()
	inv_box.position = Vector2(PAD_X, TOP + 66)
	inv_box.custom_minimum_size = Vector2(1600 - PAD_X * 2, 0)
	inv_box.add_theme_constant_override("separation", 8)
	add_child(inv_box)
	var sc := ScrollContainer.new()
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	sc.follow_focus = true
	sc.position = Vector2(PAD_X, 330)
	sc.size = Vector2(1600 - PAD_X * 2, 1000 - 330 - 56)
	add_child(sc)
	list = VBoxContainer.new()
	list.add_theme_constant_override("separation", 4)
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_child(list)
	_fill()

func _fill() -> void:
	for c in tab_box.get_children(): c.queue_free()
	for c in inv_box.get_children(): c.queue_free()
	for c in list.get_children(): c.queue_free()
	rows.clear()
	acts.clear()
	var G = HSWorld.G
	var id: String = HSSeason.GF_ORDER[cat]
	var C: Dictionary = HSSeason.GF_BY[id]
	tab_box.add_child(UiTheme.tabs(HSSeason.GF_ORDER.map(func(k): return HSSeason.GF_BY[k].label), cat, pad, func(k): cat = k; _fill()))
	# 招待
	var pb := UiScreen.panel_box(true, 8)
	inv_box.add_child(pb[0])
	var v: VBoxContainer = pb[1]
	var hh := HBoxContainer.new()
	hh.add_theme_constant_override("separation", 14)
	hh.add_child(UiTheme.title(HSSeason.gf_name(id), 24, UiTheme.GOLD_BRIGHT))
	hh.add_child(UiTheme.label("%s %s%sm・12月%s週" % [C.course, C.surface, HSU.num(C.dist), HSU.num(C.week)], 15, UiTheme.MUTED))
	v.add_child(hh)
	var inv = HSSeason._inv(id)
	var bh := HBoxContainer.new()
	bh.add_theme_constant_override("separation", 10)
	if inv == null:
		v.add_child(UiTheme.label("招待は12月1週に届く。いまのファンの票の順位は下のとおり", 15, UiTheme.MUTED))
	elif inv.ans == "yes" and inv.pick:
		var h = HSWorld.horse(inv.pick)
		v.add_child(UiTheme.label("出る：%s" % (h.name if h else ""), 18, UiTheme.GOLD_BRIGHT))
	elif inv.ans == "no":
		v.add_child(UiTheme.label("辞退した", 16, UiTheme.MUTED))
	elif HSSeason._over(id):
		v.add_child(UiTheme.label("もう終わった", 16, UiTheme.MUTED))
	else:
		var el := HSSeason.dc_eligible(id)
		if el.is_empty():
			v.add_child(UiTheme.label("自分の馬に招待は来ていない", 15, UiTheme.MUTED))
		else:
			v.add_child(UiTheme.label("招待が届いた。出す馬を1頭選ぶか、辞退する", 15))
			var sf := "ダ" if C.surface == "ダ" else "芝"
			for e in el:
				var hid: String = e.h.id
				var b := UiScreen.button("出す：%s（%s・総合力 %d）" % [e.h.name, e.why, int(HSSeason.fh(e.h, HSWorld.w_idx(), sf))], acts.is_empty(), 0, 48, 16)
				b.pressed.connect(func():
					var err = HSSeason.dc_choose(id, hid)
					if err: toast(String(err), "bad"); return
					UiFlow.save()
					toast("%sを出す" % HSWorld.horse(hid).name, "good")
					_fill())
				bh.add_child(b)
				acts.append(b)
			var bd := UiScreen.button("辞退", false, 120, 48, 16)
			bd.pressed.connect(func(): HSSeason.dc_decline(id); UiFlow.save(); toast("辞退した"); _fill())
			bh.add_child(bd)
			acts.append(bd)
	v.add_child(bh)
	# ファンの票の順位
	list.add_child(UiScreen.section("%sの順位（%d年目）" % [C.label, UiFlow.year_n()], "上位%d頭が出られる" % HSSeason.DC_FIELD))
	var st := HSSeason.dc_standing(id, G.year)
	if st.is_empty():
		var p := PanelContainer.new()
		p.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SURFACE, UiTheme.LINE, 1, 10, Vector4(16, 12, 16, 12)))
		p.add_child(UiTheme.label("まだ候補がいない", 15, UiTheme.FAINT))
		list.add_child(p)
	for x in st.slice(0, 24):
		var mine: bool = x.h.get("owner") == "P"
		var rb := UiScreen.row_button(38, mine)
		var b: Button = rb[0]
		var hb: HBoxContainer = rb[1]
		var cells := [[str(int(x.rank)), 50, UiTheme.GOLD_BRIGHT if x.in else UiTheme.FAINT, HORIZONTAL_ALIGNMENT_RIGHT], [String(x.h.name), 0, UiTheme.GOLD_BRIGHT if mine else UiTheme.IVORY],
			[String(x.why), 300, UiTheme.MUTED], ["%s票" % HSU.num(x.votes) if x.votes > 0 else "－", 100, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_RIGHT], ["出られる" if x.in else "", 100, UiTheme.GOOD, HORIZONTAL_ALIGNMENT_CENTER]]
		for c in cells:
			var l := UiTheme.label(String(c[0]), 15, c[2], c[3] if c.size() > 3 else HORIZONTAL_ALIGNMENT_LEFT)
			if c[1] > 0: l.custom_minimum_size.x = c[1]
			else:
				l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				l.clip_text = true
			hb.add_child(l)
		var cw := CenterContainer.new()
		cw.custom_minimum_size.x = 50
		cw.add_child(UiScreen.num_chip(float(x.fh)))
		hb.add_child(cw)
		UiScreen.pass_mouse(hb)
		list.add_child(b)
		rows.append(b)
	focus_first()

func focus_first() -> void:
	if acts.size():
		acts[0].grab_focus.call_deferred()
	elif rows.size():
		rows[0].grab_focus.call_deferred()
