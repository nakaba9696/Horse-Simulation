# グランドフェスティバル（js/core/dream.js・js/ui の dreamAskAll と同じ中身）：12月4週のあとの GF の週に、海外の競馬場で6つの大一番
# タブ（Q/E・LB/RB）：区分（data/gf.js の並び：短距離・マイル・中距離・クラシック・長距離・ダート）
# 上：その区分の招待（12月4週のあとに届く）と出す馬・辞退（同じ馬でいくつの GF にも出られる）。下：その年のファンの票の順位（上位16頭が出られる。自分の馬は金の線）
# 決まりは HSSeason（dc_standing・dc_eligible・dc_choose・dc_decline・dc_runners）を呼ぶだけ
extends UiScreen

var cat := 0
var tab_box: VBoxContainer
var inv_box: VBoxContainer
var list: VBoxContainer
var rows: Array[Control] = []
var acts: Array[Button] = []

func hint() -> String:
	return "その年の G1 の勝ち馬とファンの票の上位16頭が出られる。招待は12月4週のあとに届く。同じ馬でいくつの GF にも出られる（疲れはたまらない）"

func keys() -> Array:
	return [["↑↓", "十字", "選ぶ"], ["Enter", "A", "決定"], ["Q/E", "LB/RB", "区分"], ["Esc", "B", "もどる"]]

func on_back() -> void:
	go("home")

func on_tab(d: int) -> void:
	cat = posmod(cat + d, HSSeason.gf_order().size())
	_fill()

func build() -> void:
	backdrop("bg_result", 0.8)
	make_band("終", HSText.t(HSSeason.DC_NAME), HSText.t("12月4週のあと・海外の競馬場で%dつ") % HSSeason.gf_cats().size(), [["暦", UiFlow.date_label()], ["資金", UiFlow.money_label(), "money"]])
	var pend := HSSeason.dc_pending_list()
	if pend.size(): cat = maxi(0, HSSeason.gf_order().find(pend[0]))
	tab_box = VBoxContainer.new()
	tab_box.position = Vector2(PAD_X, TOP + 4)
	add_child(tab_box)
	_host()
	# 招待の札と順位の表を縦に並べ、y 872 までに収める（スクロールしない。持ち主の指示 2026-10-24）。表は出られる16頭まで
	var col := VBoxContainer.new()
	col.position = Vector2(PAD_X, TOP + 66)
	col.custom_minimum_size = Vector2(1600 - PAD_X * 2, 0)
	col.size = col.custom_minimum_size
	col.add_theme_constant_override("separation", 10)
	add_child(col)
	UiFit.hug(col)
	inv_box = VBoxContainer.new()
	inv_box.add_theme_constant_override("separation", 8)
	col.add_child(inv_box)
	list = VBoxContainer.new()
	list.add_theme_constant_override("separation", 3)
	col.add_child(list)
	UiScreen.back_under(list)
	_fill()

func _fill() -> void:
	for c in tab_box.get_children(): c.queue_free()
	for c in inv_box.get_children(): c.queue_free()
	for c in list.get_children(): c.queue_free()
	rows.clear()
	acts.clear()
	var G = HSWorld.G
	var id: String = HSSeason.gf_order()[cat]
	var C: Dictionary = HSSeason.gf_by()[id]
	tab_box.add_child(UiTheme.tabs(HSSeason.gf_order().map(func(k): return HSText.t(String(HSSeason.gf_by()[k].label))), cat, pad, func(k): cat = k; _fill()))
	# 招待
	var pb := UiScreen.panel_box(true, 8)
	inv_box.add_child(pb[0])
	var v: VBoxContainer = pb[1]
	var hh := HBoxContainer.new()
	hh.add_theme_constant_override("separation", 14)
	hh.add_child(UiTheme.title(HSText.tx(HSSeason.gf_name(id)), 24, UiTheme.GOLD_BRIGHT))
	hh.add_child(UiTheme.label(HSText.course_dist(C), 15, UiTheme.MUTED))
	var lgs: Array = HSSeason.gf_legends(id).map(func(d): return HSText.horse_name(d))
	hh.add_child(UiTheme.label(HSText.t("伝説の名馬：%s") % (HSText.t("・").join(lgs) if lgs.size() else HSText.t("まだいない")), 15, UiTheme.GOLD if lgs.size() else UiTheme.FAINT))
	hh.add_child(UiTheme.label(HSText.t("トロフィー：%s") % HSText.t(String(C.trophy)), 15, UiTheme.MUTED))
	v.add_child(hh)
	var inv = HSSeason._inv(id)
	var bh := HBoxContainer.new()
	bh.add_theme_constant_override("separation", 10)
	if inv == null and G.get("dc") and G.dc.y == G.year:
		v.add_child(UiTheme.label("今年はこの GF は開かれない", 15, UiTheme.MUTED))
	elif inv == null:
		v.add_child(UiTheme.label("招待は12月4週のあとに届く。いまのファンの票の順位は下のとおり", 15, UiTheme.MUTED))
	elif inv.ans == "yes" and inv.pick:
		var h = HSWorld.horse(inv.pick)
		v.add_child(UiTheme.label(HSText.t("出る：%s") % (HSText.horse_name(h) if h else ""), 18, UiTheme.GOLD_BRIGHT))
	elif inv.ans == "no":
		v.add_child(UiTheme.label("辞退した", 16, UiTheme.MUTED))
	else:
		var el := HSSeason.dc_eligible(id)
		if el.is_empty():
			v.add_child(UiTheme.label("自分の馬に招待は来ていない", 15, UiTheme.MUTED))
		else:
			v.add_child(UiTheme.label("招待が届いた。出す馬を1頭選ぶか、辞退する", 15))
			var sf := "ダ" if C.surface == "ダ" else "芝"
			for e in el:
				var hid: String = e.h.id
				var b := UiScreen.button(HSText.t("出す：%s（%s・総合力 %s）") % [HSText.horse_name(e.h), HSText.tx(String(e.why)), HSSeason.fh_text(HSSeason.fh_show(e.h, HSWorld.w_idx(), sf))], acts.is_empty(), 0, 48, 16)
				b.pressed.connect(func():
					var err = HSSeason.dc_choose(id, hid)
					if err: toast(HSText.tx(String(err)), "bad"); return
					UiFlow.save()
					toast(HSText.t("%sを出す") % HSText.horse_name(HSWorld.horse(hid)), "good")
					_fill())
				bh.add_child(b)
				acts.append(b)
			var bd := UiScreen.button("辞退", false, 120, 48, 16)
			bd.pressed.connect(func(): HSSeason.dc_decline(id); UiFlow.save(); toast("辞退した"); _fill())
			bh.add_child(bd)
			acts.append(bd)
	v.add_child(bh)
	# ファンの票の順位
	list.add_child(UiScreen.section(HSText.t("%sの順位（%d年目）") % [HSText.t(String(C.label)), UiFlow.year_n()], HSText.t("上位%d頭が出られる") % HSSeason.DC_FIELD))
	var st := HSSeason.dc_standing(id, G.year)
	if st.is_empty():
		var p := PanelContainer.new()
		p.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SURFACE, UiTheme.LINE, 1, 10, Vector4(16, 12, 16, 12)))
		p.add_child(UiTheme.label("まだ候補がいない", 15, UiTheme.FAINT))
		list.add_child(p)
	# 列の見出し（面の台の中）。同じ理由が続く行は字を薄くする（docs/review/UI_REVIEW.md 2-1）
	if st.size():
		var head := HBoxContainer.new()
		head.add_theme_constant_override("separation", 10)
		for c in [["順位", 50, HORIZONTAL_ALIGNMENT_RIGHT], ["馬名", 0, HORIZONTAL_ALIGNMENT_LEFT], ["出られる理由", 300, HORIZONTAL_ALIGNMENT_LEFT], ["ファンの票", 100, HORIZONTAL_ALIGNMENT_RIGHT], ["", 100, HORIZONTAL_ALIGNMENT_CENTER], ["総合力", 50, HORIZONTAL_ALIGNMENT_CENTER]]:
			var hl := UiTheme.label(String(c[0]), 12, UiTheme.MUTED, c[2])
			if c[1] > 0: hl.custom_minimum_size.x = c[1]
			else: hl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			head.add_child(hl)
		var hm := MarginContainer.new()
		hm.add_theme_constant_override("margin_left", 12)
		hm.add_theme_constant_override("margin_right", 12)
		hm.add_child(head)
		list.add_child(hm)
	var prev_why := ""
	for x in st.slice(0, HSSeason.DC_FIELD):
		var mine: bool = x.h.get("owner") == "P"
		var rb := UiScreen.row_button(30, mine)
		var b: Button = rb[0]
		var hb: HBoxContainer = rb[1]
		var why := HSText.tx(String(x.why))
		var cells := [[str(int(x.rank)), 50, UiTheme.GOLD_BRIGHT if x.in else UiTheme.FAINT, HORIZONTAL_ALIGNMENT_RIGHT], [HSText.horse_name(x.h), 0, UiTheme.GOLD_BRIGHT if mine else UiTheme.IVORY],
			[why, 300, UiTheme.FAINT if why == prev_why else UiTheme.MUTED], [HSText.t("%s票") % HSU.num(x.votes) if x.votes > 0 else "－", 100, UiTheme.MUTED if x.votes > 0 else UiTheme.FAINT, HORIZONTAL_ALIGNMENT_RIGHT], ["出られる" if x.in else "", 100, UiTheme.GOOD, HORIZONTAL_ALIGNMENT_CENTER]]
		prev_why = why
		for c in cells:
			var l := UiTheme.label(String(c[0]), 15, c[2], c[3] if c.size() > 3 else HORIZONTAL_ALIGNMENT_LEFT)
			if c[1] > 0: l.custom_minimum_size.x = c[1]
			else:
				l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				l.clip_text = true
			hb.add_child(l)
		var cw := CenterContainer.new()
		cw.custom_minimum_size.x = 50
		cw.add_child(UiTheme.stat_chip(HSSeason.fh_show(x.h, HSWorld.w_idx(), "ダ" if C.surface == "ダ" else "芝")))
		hb.add_child(cw)
		UiScreen.pass_mouse(hb)
		list.add_child(b)
		rows.append(b)
	UiFit.cut(self, rows)   # 招待の札が高いときは、下の行を隠す（16頭のうち入るだけ）
	focus_first()

# GF を開いている一族の人（data/gfhost.js・HSGFHost）：右上に顔（絵がある人だけ。無ければ色の帯）とひと言（場面で変わる。台詞は下書き）
func _host() -> void:
	var d = HSGFHost.data()
	if not d: return
	var sc := HSGFHost.scene()
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SURFACE, Color(String(d.silks.sub)).darkened(0.3), 1, 12, Vector4(8, 4, 12, 4)))
	p.position = Vector2(1600 - PAD_X - 600, TOP + 2)
	p.custom_minimum_size = Vector2(600, 58)
	add_child(p)
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 10)
	p.add_child(hb)
	hb.add_child(UiScreen.owner_face(d, "joy" if sc == "kincsem" else "base", 48, 48, 8, 1))
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 0)
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb.add_child(v)
	v.add_child(UiTheme.label(HSText.t("%s（%s）") % [HSText.owner_line(String(d.name)), HSText.owner_line(String(d.title))], 12, UiTheme.GOLD_BRIGHT))
	var l := UiTheme.label(HSText.t("「%s」") % HSGFHost.line(sc, String(HSSeason.gf_order()[cat])), 13, UiTheme.IVORY)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size.x = 510
	v.add_child(l)

func focus_first() -> void:
	if acts.size():
		acts[0].grab_focus.call_deferred()
	elif rows.size():
		rows[0].grab_focus.call_deferred()
