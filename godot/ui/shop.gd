# 馬の店（docs/UI.md「馬の店」・持ち主の仕様書 2026-10-19「店」「ゲームメニュー画面」）：走っていない史実馬を売る。毎月入れ替え
# 帯：資金・お手馬 n/10（いっぱいなら橙）。タブ：牡馬・牝馬（Q/E・LB/RB）
# 表（左）：印（★ スペシャル・外・地）・馬名（毛色・父）・性齢（6〜12月は2歳・1〜5月は3歳）・芝・ダ（いまの総合力）・距離・脚質・値段。見出しで並べ替え（R・Y でも回る）
# 見本（右）：カーソルの馬のいまの総合力・能力・距離・脚質と成長・特殊能力・値段と「詳しく見る」（金）
# 行を押してもすぐには買わない（仕様書「クリックですぐ購入にしない」）：詳しい小窓（3D の馬・能力・血統・名鑑）→「買う」→ 確かめ（カーソルは「やめる」から）→ 買う
# 品ぞろえと値段・買う決まりは HSWorld.market_historic・HSWorld.buy（godot/core）。値段はいまの総合力で決まる（HSEraless.price_of）
extends UiScreen

const COLS := [["", 30, ""], ["馬名", 0, "name"], ["性齢", 52, ""], ["芝", 50, "turf"], ["ダ", 50, "dirt"], ["距離", 120, "dist"], ["脚質", 70, "style"], ["値段", 130, "price"]]
const STYLES := ["逃げ", "先行", "差し", "追込"]

var sex := 0              # 0 牡馬・1 牝馬
var sort_key := ""
var sort_dir := 1
var items: Array = []
var shown: Array = []
var rows: Array[Button] = []
var sel := 0
var top_box: VBoxContainer
var scroll: ScrollContainer
var list: VBoxContainer
var pv: VBoxContainer
var portrait: UiHorsePortrait
var b_buy: Button
var stat_own: PanelContainer

func hint() -> String:
	return "芝・ダはいまの総合力。値段はこの値で決まる（同じなら晩成ほど少し高い）。行を選ぶと詳しく"

func keys() -> Array:
	return [["↑↓", "十字", "選ぶ"], ["Enter", "A", "詳しく"], ["Q/E", "LB/RB", "牡馬・牝馬"], ["R", "Y", "並べ替え"], ["Esc", "B", "もどる"]]

func on_back() -> void:
	go("home")

func on_tab(d: int) -> void:
	if _modal != null: return
	sex = posmod(sex + d, 2)
	sel = 0
	_fill()

# 帯の注記：売っている年齢（6〜12月は2歳・1〜5月は3歳）と次の入れ替え
static func band_sub() -> String:
	var G = HSWorld.G
	var nm := 1 if G.month == 12 else int(G.month) + 1
	return "%d歳の史実馬を売る（6〜12月は2歳・1〜5月は3歳）。毎月入れ替え（次は%d月）" % [int(HSEraless.shop_age(G.month)), nm]

func build() -> void:
	backdrop("bg_shop", 0.8)
	make_band("店", "馬の店", band_sub(), [["資金", UiFlow.money_label(), "money"], ["お手馬", "%d/%d" % [HSSeason.own_count(), int(HSSeason.MAX_OWN)], "" if HSSeason.can_buy() else "warn"]])
	top_box = VBoxContainer.new()
	top_box.position = Vector2(PAD_X, TOP + 4)
	top_box.custom_minimum_size = Vector2(1180, 0)
	top_box.add_theme_constant_override("separation", 8)
	add_child(top_box)
	scroll = ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	scroll.position = Vector2(PAD_X, 212)
	scroll.size = Vector2(1180, 1000 - 212 - 56)
	add_child(scroll)
	list = VBoxContainer.new()
	list.add_theme_constant_override("separation", 4)
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(list)
	var pb := UiScreen.panel_box(true, 8)
	(pb[0] as PanelContainer).position = Vector2(PAD_X + 1180 + 20, TOP + 4)
	(pb[0] as PanelContainer).custom_minimum_size = Vector2(1600 - PAD_X * 2 - 1180 - 20, 820)
	add_child(pb[0])
	pv = pb[1]
	_load_items()
	_fill()
	# 撮影の見本：詳しい小窓・買う前の確かめ
	var args := OS.get_cmdline_user_args()
	if args.has("--setup=shop_detail") and shown.size():
		open_detail(0)
	elif args.has("--setup=shop_confirm") and shown.size():
		for i in shown.size():
			if float(shown[i].it.price) <= float(HSWorld.G.player.money):
				ask_buy(i)
				break

func _load_items() -> void:
	items.clear()
	var wi := HSWorld.w_idx()
	for it in HSWorld.market_historic():
		items.append({"it": it, "fh": HSEraless.shop_fh(it.horse, wi), "f": it.horse.sex == "牝"})

func _val(x: Dictionary, k: String):
	var h: Dictionary = x.it.horse
	match k:
		"name": return String(h.name)
		"turf": return float(x.fh.turf)
		"dirt": return float(x.fh.dirt)
		"dist": return float(h.distMin) * 10000.0 + float(h.distMax)
		"style": return float(STYLES.find(String(h.style)))
		"price": return float(x.it.price)
	return 0.0

func _fill() -> void:
	for c in top_box.get_children(): c.queue_free()
	for c in list.get_children(): c.queue_free()
	rows.clear()
	var nm := items.filter(func(x): return not x.f).size()
	top_box.add_child(UiTheme.tabs(["牡馬 %d" % nm, "牝馬 %d" % (items.size() - nm)], sex, pad, func(k): sex = k; sel = 0; _fill()))
	shown = items.filter(func(x): return x.f == (sex == 1))
	# 並べ替えていないとき：倒したスペシャルホースが上、あとは高い順
	shown = HSU.stable_sort(shown, func(a, b):
		if sort_key != "":
			var va = _val(a, sort_key)
			var vb = _val(b, sort_key)
			if va != vb: return (va < vb) if sort_dir > 0 else (va > vb)
			return false
		var la := 1 if a.it.get("legend") else 0
		var lb := 1 if b.it.get("legend") else 0
		if la != lb: return la > lb
		return a.it.price > b.it.price)
	# 並べ替えの見出し
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 10)
	for c in COLS:
		var b := Button.new()
		var mark := ""
		if c[2] != "" and c[2] == sort_key:
			mark = " ▲" if sort_dir > 0 else " ▼"
		b.text = String(c[0]) + mark
		b.focus_mode = Control.FOCUS_NONE
		b.flat = true
		b.add_theme_font_size_override("font_size", 11)
		b.add_theme_color_override("font_color", UiTheme.GOLD if mark != "" else UiTheme.MUTED)
		b.add_theme_color_override("font_hover_color", UiTheme.GOLD_BRIGHT)
		b.alignment = HORIZONTAL_ALIGNMENT_CENTER if c[1] > 0 else HORIZONTAL_ALIGNMENT_LEFT
		for st in ["normal", "hover", "pressed", "hover_pressed", "focus"]:
			b.add_theme_stylebox_override(st, UiTheme.box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 4, Vector4(0, 0, 0, 0)))
		if c[1] > 0: b.custom_minimum_size.x = c[1]
		else: b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		if c[2] != "":
			var k: String = c[2]
			b.pressed.connect(func(): _sort_by(k))
		head.add_child(b)
	var hm := MarginContainer.new()
	hm.add_theme_constant_override("margin_left", 12)
	hm.add_theme_constant_override("margin_right", 12)
	hm.add_child(head)
	top_box.add_child(hm)
	var money := float(HSWorld.G.player.money)
	for i in shown.size():
		var x: Dictionary = shown[i]
		var h: Dictionary = x.it.horse
		var rb := UiScreen.row_button(46, x.it.get("legend") == true)
		var b: Button = rb[0]
		var hb: HBoxContainer = rb[1]
		var mk := ""
		if x.it.get("legend"): mk = "★"
		elif HSData.is_foreign(HSU.or_(x.it.get("data"), {})): mk = "外"
		elif x.it.get("data") and HSEraless.lock_of(x.it.data) == "local": mk = "地"
		var ml := UiTheme.label(mk, 15, UiTheme.GOLD_BRIGHT, HORIZONTAL_ALIGNMENT_CENTER)
		ml.custom_minimum_size.x = COLS[0][1]
		hb.add_child(ml)
		var nv := VBoxContainer.new()
		nv.add_theme_constant_override("separation", -4)
		nv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		nv.alignment = BoxContainer.ALIGNMENT_CENTER
		var nl := UiTheme.label(String(h.name), 16)
		nl.clip_text = true
		nv.add_child(nl)
		var sire := String(HSU.or_(h.get("sire"), ""))
		nv.add_child(UiTheme.label("%s%s" % [HSU.or_(h.get("coat"), ""), "・父 " + sire if sire != "" and sire != "?" else ""], 12, UiTheme.FAINT))
		hb.add_child(nv)
		var sa := UiTheme.num_label("%s%d" % ["牝" if x.f else "牡", int(HSWorld.G.year - float(h.born))], 15)
		sa.custom_minimum_size.x = COLS[2][1]
		hb.add_child(sa)
		for k in ["turf", "dirt"]:
			var cw := CenterContainer.new()
			cw.custom_minimum_size.x = 50
			cw.add_child(UiTheme.stat_chip(float(x.fh[k])))
			hb.add_child(cw)
		var dl := UiTheme.num_label("%s〜%s" % [HSU.num(h.distMin), HSU.num(h.distMax)], 14, UiTheme.MUTED)
		dl.custom_minimum_size.x = COLS[5][1]
		hb.add_child(dl)
		var ar := UiStyleArrows.new(String(h.style))
		ar.custom_minimum_size = Vector2(COLS[6][1], 22)
		ar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		hb.add_child(ar)
		var pl := UiTheme.num_label(HSU.money(float(x.it.price)), 16, UiTheme.GOLD_BRIGHT if float(x.it.price) <= money else UiTheme.BAD, HORIZONTAL_ALIGNMENT_RIGHT)
		pl.custom_minimum_size.x = COLS[7][1]
		hb.add_child(pl)
		UiScreen.pass_mouse(hb)
		var k2: int = i
		b.focus_entered.connect(func(): _preview(k2))
		b.pressed.connect(func(): open_detail(k2))
		list.add_child(b)
		rows.append(b)
	if shown.is_empty():
		list.add_child(UiTheme.label("いま並んでいる%sはいません" % ["牡馬", "牝馬"][sex], 15, UiTheme.MUTED))
		_preview(-1)
	else:
		sel = clampi(sel, 0, shown.size() - 1)
		_preview(sel)
		rows[sel].grab_focus.call_deferred()

func _sort_by(k: String) -> void:
	if sort_key == k:
		sort_dir = -sort_dir
	else:
		sort_key = k
		sort_dir = 1 if k in ["name", "dist", "style"] else -1
	sel = 0
	_fill()

func _unhandled_input(ev: InputEvent) -> void:
	super._unhandled_input(ev)
	var cyc: bool = _modal == null and ((ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_R) or (ev is InputEventJoypadButton and ev.pressed and ev.button_index == JOY_BUTTON_Y))
	if cyc:
		var ks := ["", "price", "turf", "dirt", "dist", "style", "name"]
		var i := ks.find(sort_key)
		sort_key = ks[(i + 1) % ks.size()]
		sort_dir = 1 if sort_key in ["name", "dist", "style"] else -1
		sel = 0
		_fill()
		toast("並べ替え：%s" % {"": "おすすめ", "price": "値段", "turf": "芝", "dirt": "ダ", "dist": "距離", "style": "脚質", "name": "馬名"}[sort_key])

# ---- 右の見本 ----
func _preview(i: int) -> void:
	sel = maxi(0, i)
	for c in pv.get_children():
		if c != portrait: c.queue_free()
	b_buy = null
	if i < 0 or i >= shown.size():
		pv.add_child(UiTheme.label("馬を選ぶと、ここに能力が出ます", 14, UiTheme.MUTED))
		if portrait: portrait.visible = false
		return
	var x: Dictionary = shown[i]
	var h: Dictionary = x.it.horse
	var G = HSWorld.G
	# 毛色の帯（絵の代わりに、毛色と勝負服の色）
	if portrait == null:
		portrait = UiHorsePortrait.new()
		portrait.custom_minimum_size = Vector2(0, 170)
		pv.add_child(portrait)
	portrait.visible = true
	portrait.set_horse(String(h.name), String(HSU.or_(h.get("coat"), "鹿毛")), 2.0)
	var t := UiTheme.title(String(h.name), 22, UiTheme.GOLD_BRIGHT if x.it.get("legend") else UiTheme.IVORY)
	t.clip_text = true
	pv.add_child(t)
	var sub := "%s%d・%s" % ["牝" if x.f else "牡", int(G.year - float(h.born)), HSU.or_(h.get("coat"), "")]
	if h.get("sire") and h.sire != "?": sub += "・父 %s" % h.sire
	if h.get("dam") and h.dam != "?": sub += "・母 %s" % h.dam
	var sl := UiTheme.label(sub, 13, UiTheme.MUTED)
	sl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	sl.custom_minimum_size.x = 330
	pv.add_child(sl)
	var fr := HBoxContainer.new()
	fr.add_theme_constant_override("separation", 8)
	fr.add_child(UiTheme.label("総合力（いま）", 13, UiTheme.MUTED))
	fr.add_child(UiScreen.spacer())
	fr.add_child(UiTheme.label("芝", 13, UiTheme.MUTED))
	fr.add_child(UiTheme.stat_chip(float(x.fh.turf), "fh", true))
	fr.add_child(UiTheme.label("ダ", 13, UiTheme.MUTED))
	fr.add_child(UiTheme.stat_chip(float(x.fh.dirt), "fh", true))
	pv.add_child(fr)
	var grid := GridContainer.new()
	grid.columns = 4
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 6)
	var cur := HSHorse.cur(h, HSWorld.w_idx())
	for k in ["spd", "sta", "dspd", "dsta", "guts", "mind", "slope"]:
		grid.add_child(_stat_cell(HSHorse.STAT_SHORT[k], float(cur[k])))
	grid.add_child(_stat_cell("切れ", float(HSU.or_(h.get("kire"), 4.0)), "kire"))
	pv.add_child(grid)
	pv.add_child(_kv("距離", "%s〜%sm" % [HSU.num(h.distMin), HSU.num(h.distMax)]))
	pv.add_child(_kv("脚質・成長", "%s・%s" % [HSHorse.style_text(h), HSU.or_(h.get("growth"), "")]))
	var sk: Array = HSU.or_(h.get("skills"), [])
	if sk.size():
		var fl := HFlowContainer.new()
		fl.add_theme_constant_override("h_separation", 6)
		fl.add_theme_constant_override("v_separation", 6)
		for id in sk:
			fl.add_child(UiTheme.chip(HSSkills.label(String(id)), UiTheme.SURFACE_3, UiTheme.IVORY, 12))
		pv.add_child(fl)
	var sp := Control.new()
	sp.size_flags_vertical = Control.SIZE_EXPAND_FILL
	pv.add_child(sp)
	var money := float(G.player.money)
	var over := float(x.it.price) > money
	var full := not HSSeason.can_buy()
	var ph := HBoxContainer.new()
	ph.add_child(UiTheme.num_label(HSU.money(float(x.it.price)), 22, UiTheme.BAD if over else UiTheme.GOLD_BRIGHT, HORIZONTAL_ALIGNMENT_LEFT))
	ph.add_child(UiScreen.spacer())
	b_buy = UiScreen.button("詳しく見る", true, 150, 52, 19)
	b_buy.focus_mode = Control.FOCUS_NONE
	var k2 := i
	b_buy.pressed.connect(func(): open_detail(k2))
	ph.add_child(b_buy)
	pv.add_child(ph)
	if over or full:
		pv.add_child(UiTheme.label("資金が足りない" if over else "お手馬がいっぱい", 13, UiTheme.BAD if over else UiTheme.WARN))

func _stat_cell(name: String, v: float, kind := "stat") -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 4)
	h.add_child(UiTheme.stat_chip(v, kind))
	h.add_child(UiTheme.label(name, 12, UiTheme.MUTED))
	return h

func _kv(k: String, v: String) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_child(UiTheme.label(k, 13, UiTheme.MUTED))
	h.add_child(UiScreen.spacer())
	h.add_child(UiTheme.label(v, 15))
	return h

# ---- 詳しい小窓（行を押したとき）：3D の馬・いまの総合力と能力・距離・脚質・成長・特殊能力・血統・名鑑、値段と「買う」 ----
var detail_i := -1
var detail_buy: Button = null     # 小窓の「買う」（テストが押す）
var confirm_no: Button = null     # 確かめの「やめる」
var confirm_ok: Button = null     # 確かめの「買う」

func open_detail(i: int) -> void:
	if i < 0 or i >= shown.size():
		return
	detail_i = i
	sel = i
	var x: Dictionary = shown[i]
	var h: Dictionary = x.it.horse
	var d: Dictionary = HSU.or_(x.it.get("data"), {})
	var G = HSWorld.G
	var wi := HSWorld.w_idx()
	var pb := UiScreen.panel_box(true, 12)
	var p: PanelContainer = pb[0]
	p.custom_minimum_size = Vector2(1240, 800)
	var root: VBoxContainer = pb[1]
	var cols := HBoxContainer.new()
	cols.add_theme_constant_override("separation", 26)
	cols.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(cols)
	# 左：絵と名前・いまの総合力・能力
	var lv := VBoxContainer.new()
	lv.custom_minimum_size.x = 560
	lv.add_theme_constant_override("separation", 8)
	cols.add_child(lv)
	var por := UiHorsePortrait.new()
	por.custom_minimum_size = Vector2(560, 290)
	lv.add_child(por)
	por.set_horse(String(h.name), String(HSU.or_(h.get("coat"), "鹿毛")), G.year - float(h.born))
	var nh := HBoxContainer.new()
	nh.add_theme_constant_override("separation", 10)
	var t := UiTheme.title(String(h.name), 30, UiTheme.GOLD_BRIGHT if x.it.get("legend") else UiTheme.IVORY)
	nh.add_child(t)
	if x.it.get("legend"): nh.add_child(UiTheme.chip("スペシャル", UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 12))
	lv.add_child(nh)
	lv.add_child(UiTheme.label("%s%d・%s・%s" % ["牝" if x.f else "牡", int(G.year - float(h.born)), HSU.or_(h.get("coat"), ""), "外国の馬" if HSData.is_foreign(d) else "日本の馬"], 14, UiTheme.MUTED))
	var fr := HBoxContainer.new()
	fr.add_theme_constant_override("separation", 8)
	fr.add_child(UiTheme.label("総合力（いま）", 15, UiTheme.MUTED))
	fr.add_child(UiScreen.spacer())
	fr.add_child(UiTheme.label("芝", 14, UiTheme.MUTED))
	fr.add_child(UiTheme.stat_chip(float(x.fh.turf), "fh", true))
	fr.add_child(UiTheme.label("ダ", 14, UiTheme.MUTED))
	fr.add_child(UiTheme.stat_chip(float(x.fh.dirt), "fh", true))
	lv.add_child(fr)
	var grid := GridContainer.new()
	grid.columns = 4
	grid.add_theme_constant_override("h_separation", 14)
	grid.add_theme_constant_override("v_separation", 6)
	var cur := HSHorse.cur(h, wi)
	for k in ["spd", "sta", "dspd", "dsta", "guts", "mind", "slope"]:
		grid.add_child(_stat_cell(HSHorse.STAT_SHORT[k], float(cur[k])))
	grid.add_child(_stat_cell("切れ", float(HSU.or_(h.get("kire"), 4.0)), "kire"))
	lv.add_child(grid)
	lv.add_child(_kv("距離", "%s〜%sm" % [HSU.num(h.distMin), HSU.num(h.distMax)]))
	lv.add_child(_kv("脚質", HSHorse.style_text(h)))
	var gkv := _kv("成長型", "%s（%s）" % [String(HSU.or_(h.get("growth"), "")), HSHorse.growth_note(h.get("growth"))])
	(gkv.get_child(2) as Label).add_theme_color_override("font_color", HSHorse.growth_color(h.get("growth")))
	lv.add_child(gkv)
	var sk: Array = HSU.or_(h.get("skills"), [])
	if sk.size():
		var fl := HFlowContainer.new()
		fl.add_theme_constant_override("h_separation", 6)
		fl.add_theme_constant_override("v_separation", 6)
		for id in sk:
			fl.add_child(UiTheme.chip(HSSkills.label(String(id)), UiTheme.SURFACE_3, UiTheme.IVORY, 12))
		lv.add_child(fl)
	# 右：血統と名鑑
	var rv := VBoxContainer.new()
	rv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	rv.add_theme_constant_override("separation", 8)
	cols.add_child(rv)
	rv.add_child(UiScreen.section("血統"))
	rv.add_child(UiHorseScreen.pedigree_box(h.get("sire"), h.get("dam"), d.get("damsire")))
	var has_prof: bool = d.get("text") != null or d.get("record") != null
	rv.add_child(UiScreen.section("名鑑", "史実" if has_prof else ""))
	rv.add_child(UiHorseScreen.profile_box(d, 600, 7))
	var sp := Control.new()
	sp.size_flags_vertical = Control.SIZE_EXPAND_FILL
	rv.add_child(sp)
	# 下：値段と操作
	var money := float(G.player.money)
	var over := float(x.it.price) > money
	var full := not HSSeason.can_buy()
	var bh := HBoxContainer.new()
	bh.add_theme_constant_override("separation", 14)
	bh.add_child(UiTheme.label("値段", 15, UiTheme.MUTED))
	bh.add_child(UiTheme.num_label(HSU.money(float(x.it.price)), 30, UiTheme.BAD if over else UiTheme.GOLD_BRIGHT, HORIZONTAL_ALIGNMENT_LEFT))
	if over or full:
		bh.add_child(UiTheme.label("資金が足りない" if over else "お手馬がいっぱい（引退させると空く）", 14, UiTheme.BAD if over else UiTheme.WARN))
	bh.add_child(UiScreen.spacer())
	var no := UiScreen.button("もどる", false, 160, 52, 18)
	no.pressed.connect(close_modal)
	bh.add_child(no)
	detail_buy = UiScreen.button("買う", true, 200, 56, 22)
	detail_buy.disabled = over or full
	detail_buy.pressed.connect(func(): ask_buy(i))
	bh.add_child(detail_buy)
	root.add_child(bh)
	open_modal(p, no if detail_buy.disabled else detail_buy)

# 確かめ（買うときだけ）：カーソルは「やめる」から。やめると詳しい小窓に戻る
func ask_buy(i: int) -> void:
	if i < 0 or i >= shown.size():
		return
	var x: Dictionary = shown[i]
	var money := float(HSWorld.G.player.money)
	var price := float(x.it.price)
	if price > money or not HSSeason.can_buy():
		toast("資金が足りない" if price > money else "お手馬がいっぱい", "bad")
		return
	var pb := UiScreen.panel_box(true, 16)
	var p: PanelContainer = pb[0]
	p.custom_minimum_size = Vector2(620, 0)
	var t := UiTheme.title("%sを%sで買いますか？" % [x.it.horse.name, HSU.money(price)], 22)
	t.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	t.custom_minimum_size.x = 580
	(pb[1] as VBoxContainer).add_child(t)
	(pb[1] as VBoxContainer).add_child(UiTheme.label("資金 %s → %s" % [HSU.money(money), HSU.money(money - price)], 15, UiTheme.MUTED))
	var h := HBoxContainer.new()
	h.alignment = BoxContainer.ALIGNMENT_END
	h.add_theme_constant_override("separation", 12)
	confirm_no = UiScreen.button("やめる", false, 160, 50, 17)
	confirm_no.pressed.connect(func(): open_detail(i))
	h.add_child(confirm_no)
	confirm_ok = UiScreen.button("買う", true, 180, 50, 19)
	confirm_ok.pressed.connect(func(): close_modal(); buy_now(i))
	h.add_child(confirm_ok)
	(pb[1] as VBoxContainer).add_child(h)
	open_modal(p, confirm_no, func(): open_detail(i))

# 買う（確かめのあと）。自動で遊ぶ道具（godot/tools/autoplay.gd）もこれを呼ぶ
func buy_now(i: int) -> void:
	if i < 0 or i >= shown.size():
		return
	var x: Dictionary = shown[i]
	var err = HSWorld.buy(x.it)
	if err:
		toast(String(err), "bad")
		return
	UiFlow.save()
	toast("%sを買った（%s）" % [x.it.horse.name, HSU.money(float(x.it.price))], "good")
	# 帯の資金・お手馬と品ぞろえを組み直す
	for c in get_children():
		if c == band: c.queue_free()
	make_band("店", "馬の店", band_sub(), [["資金", UiFlow.money_label(), "money"], ["お手馬", "%d/%d" % [HSSeason.own_count(), int(HSSeason.MAX_OWN)], "" if HSSeason.can_buy() else "warn"]])
	_load_items()
	_fill()

func focus_first() -> void:
	if rows.size():
		rows[clampi(sel, 0, rows.size() - 1)].grab_focus()
