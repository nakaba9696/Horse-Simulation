# 生産（オリジナルホース。js/ui/jockeyui.js の S.breed と同じ中身）：牧場に残った引退馬から、父と母を1頭ずつ選んで仔を作る
# 上：選んだ組み合わせ（父 × 母・ボーナス・受け継ぐ特殊能力の候補・名前・「作る」（金））
# 下：父（引退した牡馬）と母（引退した牝馬）の表を左右に。行を押すとその馬を選ぶ（もう一度押すと外す）
# 決まりは HSOriginal（retired・candidates・make）を呼ぶだけ。牝馬は1年に1頭
extends UiScreen

var sire := ""
var dam := ""
var pair_box: VBoxContainer
var cols: Array[VBoxContainer] = []
var rows: Array[Button] = []
var name_edit: LineEdit
var b_make: Button
var _focus_id := ""

func hint() -> String:
	return "能力は両親の値をもとにばらつく。特殊能力は両親のものから4つまで"

func keys() -> Array:
	return [["↑↓←→", "十字", "選ぶ"], ["Enter", "A", "父・母にする"], ["Esc", "B", "もどる"]]

func on_back() -> void:
	go("stable")

func build() -> void:
	backdrop("bg_home", 0.84)
	make_band("生", "生産", "引退させた牡馬と牝馬からオリジナルホースを作る", [["お手馬", "%d/%d" % [HSSeason.own_count(), int(HSSeason.MAX_OWN)], "" if HSSeason.can_buy() else "warn"], ["資金", UiFlow.money_label(), "money"]])
	var h = HSWorld.horse(UiFlow.program_id)
	if h and h.get("loc") == "retired":
		if h.sex == "牝": dam = h.id
		else: sire = h.id
	var pb := UiScreen.panel_box(true, 8)
	(pb[0] as PanelContainer).position = Vector2(PAD_X, TOP + 4)
	(pb[0] as PanelContainer).custom_minimum_size = Vector2(1600 - PAD_X * 2, 0)
	add_child(pb[0])
	pair_box = pb[1]
	var hb := HBoxContainer.new()
	hb.position = Vector2(PAD_X, 330)
	hb.custom_minimum_size = Vector2(1600 - PAD_X * 2, 0)
	hb.add_theme_constant_override("separation", 20)
	add_child(hb)
	for k in 2:
		var v := VBoxContainer.new()
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		v.add_theme_constant_override("separation", 4)
		hb.add_child(v)
		cols.append(v)
	_fill()

func _fill() -> void:
	var keep_name := name_edit.text if name_edit else ""
	for c in pair_box.get_children(): c.queue_free()
	for v in cols:
		for c in v.get_children(): c.queue_free()
	rows.clear()
	if not HSOriginal.on():
		pair_box.add_child(UiTheme.label("この遊び方では使えません", 15, UiTheme.MUTED))
		return
	var G = HSWorld.G
	var sires := HSOriginal.retired("牡")
	var dams := HSOriginal.retired("牝")
	var ps = null
	var pd = null
	for x in sires: if x.id == sire: ps = x
	for x in dams: if x.id == dam: pd = x
	# 組み合わせ
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 14)
	pair_box.add_child(top)
	top.add_child(UiTheme.title("%s　×　%s" % [ps.name if ps else "（父）", pd.name if pd else "（母）"], 24, UiTheme.GOLD_BRIGHT if ps and pd else UiTheme.FAINT))
	if ps and pd:
		var bonus := HSU.mn(HSOriginal.BONUS_MAX, float(HSU.or_(ps.get("parentBonus"), 0.0)) + float(HSU.or_(pd.get("parentBonus"), 0.0)))
		if bonus > 0: top.add_child(UiTheme.chip("ボーナス +%s" % HSU.num(bonus), UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 13))
	var cand: Array = HSOriginal.candidates(ps, pd) if ps and pd else []
	var fl := HFlowContainer.new()
	fl.add_theme_constant_override("h_separation", 6)
	fl.add_child(UiTheme.label("受け継ぐ特殊能力の候補（%dつ%s）" % [cand.size(), "。この中から4つ" if cand.size() > HSOriginal.MAX_SKILLS else ""] if ps and pd else "父と母を1頭ずつ選んでください", 13, UiTheme.MUTED))
	for id in cand:
		fl.add_child(UiTheme.chip(HSSkills.label(String(id)), UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT if HSSkills.is_unique(id) else UiTheme.IVORY, 12))
	pair_box.add_child(fl)
	var mk := HBoxContainer.new()
	mk.add_theme_constant_override("separation", 12)
	pair_box.add_child(mk)
	name_edit = LineEdit.new()
	name_edit.placeholder_text = "名前（空ならおまかせ）"
	name_edit.text = keep_name
	name_edit.max_length = 12
	name_edit.custom_minimum_size = Vector2(420, 46)
	name_edit.add_theme_font_size_override("font_size", 18)
	name_edit.add_theme_stylebox_override("normal", UiTheme.box(UiTheme.SUNK, UiTheme.LINE_STRONG, 1, UiTheme.R_BUTTON, Vector4(14, 6, 14, 6)))
	name_edit.add_theme_stylebox_override("focus", UiTheme.box(UiTheme.SUNK, UiTheme.GOLD, 2, UiTheme.R_BUTTON, Vector4(14, 6, 14, 6)))
	mk.add_child(name_edit)
	var why := ""
	if ps and pd and pd.get("foalY") == G.year: why = "%sは今年もう仔を産んだ" % pd.name
	elif not HSSeason.can_buy(): why = "お手馬がいっぱい"
	b_make = UiScreen.button("オリジナルホースを作る", true, 330, 52, 20)
	b_make.disabled = not (ps and pd) or why != ""
	b_make.pressed.connect(_make)
	mk.add_child(b_make)
	if why != "": mk.add_child(UiTheme.label(why, 14, UiTheme.WARN))
	# 父・母の表
	_col(cols[0], "父（引退した牡馬）", sires, true)
	_col(cols[1], "母（引退した牝馬）", dams, false)
	focus_first()

func _col(v: VBoxContainer, title: String, list: Array, is_sire: bool) -> void:
	v.add_child(UiScreen.section(title, "%d/%d頭" % [list.size(), HSOriginal.MAX_EACH]))
	if list.is_empty():
		var p := PanelContainer.new()
		p.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SURFACE, UiTheme.LINE, 1, 10, Vector4(14, 10, 14, 10)))
		p.add_child(UiTheme.label("まだいません。%sを引退させると、ここに残ります" % ("牡馬" if is_sire else "牝馬"), 14, UiTheme.FAINT))
		v.add_child(p)
		return
	var G = HSWorld.G
	for h in list:
		var on: bool = h.id == (sire if is_sire else dam)
		var rb := UiScreen.row_button(64, on)
		var b: Button = rb[0]
		var hb: HBoxContainer = rb[1]
		var nv := VBoxContainer.new()
		nv.add_theme_constant_override("separation", -2)
		nv.alignment = BoxContainer.ALIGNMENT_CENTER
		nv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var l1 := HBoxContainer.new()
		l1.add_theme_constant_override("separation", 8)
		l1.add_child(UiTheme.label(String(h.name), 16, UiTheme.GOLD_BRIGHT if on else UiTheme.IVORY))
		if float(HSU.or_(h.get("parentBonus"), 0.0)) > 0:
			l1.add_child(UiTheme.chip("ボーナス +%s" % HSU.num(h.parentBonus), UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 11))
		if not is_sire and h.get("foalY") == G.year:
			l1.add_child(UiTheme.chip("今年は産んだ", UiTheme.SURFACE_3, UiTheme.MUTED, 11))
		nv.add_child(l1)
		var sk := HSOriginal.skills_of(h).map(func(id): return HSSkills.label(String(id)))
		var l2 := UiTheme.label("%d戦%d勝・%s・%s　%s" % [int(HSU.or_(h.get("starts"), 0.0)), int(HSU.or_(h.get("wins"), 0.0)), HSHorse.style_text(h), HSHorse.dist_label(h.distMin, h.distMax), "・".join(sk)], 12, UiTheme.MUTED)
		l2.clip_text = true
		nv.add_child(l2)
		hb.add_child(nv)
		var pk := HSSeason.fh_peak(h)
		hb.add_child(UiTheme.stat_chip(float(pk.turf)))
		hb.add_child(UiTheme.stat_chip(float(pk.dirt)))
		UiScreen.pass_mouse(hb)
		var id: String = h.id
		b.set_meta("id", id)
		b.pressed.connect(func():
			_focus_id = id
			if is_sire: sire = "" if sire == id else id
			else: dam = "" if dam == id else id
			_fill())
		v.add_child(b)
		rows.append(b)

func _make() -> void:
	var r := HSOriginal.make(sire, dam, name_edit.text)
	if r.has("err"):
		toast(String(r.err), "bad")
		return
	UiFlow.save()
	UiFlow.program_id = r.horse.id
	celebrate("オリジナルホースが生まれた", String(r.horse.name), "父 %s・母 %s%s" % [r.horse.sire, r.horse.dam, "・ボーナス +%s" % HSU.num(r.bonus) if r.bonus else ""], func(): go("stable"))

func focus_first() -> void:
	if b_make and not b_make.disabled and sire != "" and dam != "":
		b_make.grab_focus.call_deferred()
		return
	if _focus_id != "":
		for b in rows:
			if String(b.get_meta("id", "")) == _focus_id:
				b.grab_focus.call_deferred()
				return
	if b_make and not b_make.disabled:
		b_make.grab_focus.call_deferred()
	elif rows.size():
		rows[0].grab_focus.call_deferred()
