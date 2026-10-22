# 牧場（オリジナルホース。js/ui/jockeyui.js の S.breed と同じ中身）：引退した馬が暮らす所。父と母を1頭ずつ選んで仔を作る
# 持ち主の指摘 2026-10-21「牧場とかのUI　わかりにくいので全面的に改修したい」「競馬のゲームなのでそれっぽいUIにしたい」→ 部品の絵（UiSkin）と背景 bg_farm で作り直した
# 並び（左から右へ、することの順）：
#   左「① 父を選ぶ」＝引退した牡馬の行 ／ 真ん中「仔を作る」の札＝手順の札（① 父 → ② 母 → ③ 作る）・選んだ父と母・クロスと受け継ぐ特殊能力の候補・名前・「オリジナルホースを作る」（金）
#   右「② 母を選ぶ」＝引退した牝馬の行
# 行を押すとその馬を選ぶ（もう一度押すと外す）。X で牧場から放す（確かめは「やめる」から）。父と母がそろうと「作る」へカーソルが移る
# 決まりは HSOriginal（retired・candidates・make・release）を呼ぶだけ。牝馬は1年に1頭。1頭の馬から仔は2頭まで（作り終えた親は牧場を去る）
# インブリード（HSInbreed）：組み合わせのクロスと効き目（「サンデーサイレンスの3×4（芝スピード＋2・根性＋1）」）を真ん中の札に。
# 片方を選ぶと、もう片方の表の近すぎる馬（親子・2×2 より濃い・全きょうだい）は灰色にし「近すぎる（〇〇の2×2）」の札。押しても選べない
extends UiScreen

const COL_W := 492.0     # 左右の表の幅
const MID_W := 520.0     # 真ん中の札の幅
const ROW_H := 68.0

var sire := ""
var dam := ""
var mid_box: VBoxContainer
var cols: Array[VBoxContainer] = []
var rows: Array[Button] = []
var name_edit: LineEdit
var b_make: Button
var _focus_id := ""

func hint() -> String:
	return "能力は両親の値をもとにばらつく。クロスがあると祖先の得意な能力が上がる"

func keys() -> Array:
	return [["↑↓←→", "十字", "選ぶ"], ["Enter", "A", "父・母にする"], ["X", "X", "放す"], ["Esc", "B", "もどる"]]

func on_back() -> void:
	go(UiFlow.farm_back)

func build() -> void:
	backdrop("bg_farm.png", 0.42)
	make_band("牧", "牧場", "引退した馬が暮らす所。父と母を1頭ずつ選んで、オリジナルホースを作る", [
		["牡馬", "%d/%d" % [HSOriginal.retired("牡").size(), HSOriginal.MAX_EACH]],
		["牝馬", "%d/%d" % [HSOriginal.retired("牝").size(), HSOriginal.MAX_EACH]],
		["お手馬", "%d/%d" % [HSSeason.own_count(), int(HSSeason.MAX_OWN)], "" if HSSeason.can_buy() else "warn"],
		["資金", UiFlow.money_label(), "money"]], "farm")
	var h = HSWorld.horse(UiFlow.program_id)
	if h and h.get("loc") == "retired":
		if h.sex == "牝": dam = h.id
		else: sire = h.id
	# 撮影：-- --pick=馬名（父・母を選んだ形で開く）
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--pick="):
			for x in HSOriginal.retired("牡") + HSOriginal.retired("牝"):
				if x.name == a.substr(7):
					if x.sex == "牝": dam = x.id
					else: sire = x.id
	var y0 := TOP + 8.0
	var gap := (1600.0 - PAD_X * 2.0 - COL_W * 2.0 - MID_W) / 2.0
	for k in 2:
		var v := VBoxContainer.new()
		v.position = Vector2(PAD_X + (COL_W + gap + MID_W + gap) * k, y0)
		v.custom_minimum_size = Vector2(COL_W, 0)
		v.size = Vector2(COL_W, 0)
		v.add_theme_constant_override("separation", 6)
		add_child(v)
		cols.append(v)
	var pb := UiScreen.panel_box(true, 10, true)
	var p: PanelContainer = pb[0]
	var msb = UiSkin.card(true, Vector4(34, 22, 34, 34))   # 下の縁の金の線に字がかからないよう、下を広く
	if msb != null: p.add_theme_stylebox_override("panel", msb)
	p.position = Vector2(PAD_X + COL_W + gap, y0)
	p.custom_minimum_size = Vector2(MID_W, 0)
	p.size = Vector2(MID_W, 0)
	add_child(p)
	mid_box = pb[1]
	_fill()

func _fill() -> void:
	var keep_name := name_edit.text if name_edit else ""
	for c in mid_box.get_children(): c.queue_free()
	for v in cols:
		for c in v.get_children(): c.queue_free()
	rows.clear()
	b_make = null
	if not HSOriginal.on():
		mid_box.add_child(UiTheme.label("この遊び方では使えません", 15, UiTheme.MUTED))
		return
	var sires := HSOriginal.retired("牡")
	var dams := HSOriginal.retired("牝")
	var ps = null
	var pd = null
	for x in sires: if x.id == sire: ps = x
	for x in dams: if x.id == dam: pd = x
	_col(cols[0], "① 父を選ぶ", "引退した牡馬", sires, true, pd)
	_col(cols[1], "② 母を選ぶ", "引退した牝馬", dams, false, ps)
	_mid(ps, pd, keep_name)
	focus_first()

# ---- 真ん中：仔を作る札 ----
func _mid(ps, pd, keep_name: String) -> void:
	var G = HSWorld.G
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 10)
	var ic := UiSkin.icon("horseshoe", 26)
	if ic: head.add_child(ic)
	head.add_child(UiTheme.title("仔を作る", 22, UiTheme.GOLD_BRIGHT))
	mid_box.add_child(head)
	# 手順の札：済んだ手順は金の面、いまの手順は金の縁、まだの手順は控えめ
	var steps := HBoxContainer.new()
	steps.add_theme_constant_override("separation", 6)
	var now := 0 if ps == null else (1 if pd == null else 2)
	var names := ["① 父を選ぶ", "② 母を選ぶ", "③ 名前・作る"]
	for i in 3:
		var done: bool = (i == 0 and ps != null) or (i == 1 and pd != null)
		var c := PanelContainer.new()
		var bg: Color = UiTheme.GOLD_FACE[1] if done else UiTheme.SUNK
		var bd: Color = UiTheme.GOLD_FACE[0] if done else (UiTheme.GOLD if i == now else UiTheme.LINE_STRONG)
		c.add_theme_stylebox_override("panel", UiTheme.box(bg, bd, 2 if i == now and not done else 1, 999, Vector4(12, 3, 12, 4)))
		c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		c.add_child(UiTheme.label(("✓ " if done else "") + HSText.t(names[i]), 13, UiTheme.ON_GOLD if done else (UiTheme.GOLD_BRIGHT if i == now else UiTheme.FAINT), HORIZONTAL_ALIGNMENT_CENTER))
		steps.add_child(c)
	mid_box.add_child(steps)
	# 選んだ父と母（左右の札。真ん中に ×）
	var pair := HBoxContainer.new()
	pair.add_theme_constant_override("separation", 6)
	pair.add_child(_slot(ps, true))
	var x := UiTheme.title("×", 26, UiTheme.GOLD if ps and pd else UiTheme.FAINT)
	x.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	pair.add_child(x)
	pair.add_child(_slot(pd, false))
	mid_box.add_child(pair)
	mid_box.add_child(UiSkin.rail(10))
	# クロス（インブリード）と効き目・受け継ぐ特殊能力の候補
	var an = HSInbreed.analyze(ps.name, pd.name) if ps and pd else null
	var info := VBoxContainer.new()
	info.add_theme_constant_override("separation", 6)
	info.custom_minimum_size.y = 150
	mid_box.add_child(info)
	if ps == null or pd == null:
		var l := UiTheme.label("左の表から父、右の表から母を選ぶと、クロスと受け継ぐ特殊能力がここに出る", 14, UiTheme.MUTED)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.custom_minimum_size.x = MID_W - 60
		info.add_child(l)
	if an != null:
		var bonus := HSOriginal.child_bonus(ps, pd)   # 前の版の引退馬だけ（いまは引退で親の能力が上がっている）
		info.add_child(_kv_head("クロス", HSText.t("合わせて %s") % HSText.tx(HSInbreed.up_text(an.up)) if an.block == null and HSInbreed.up_text(an.up) != "" else ("" if an.block != null else HSText.t("上がりなし")), HSText.t("ボーナス +%s") % HSU.num(bonus) if bonus > 0 else ""))
		var cf := HFlowContainer.new()
		cf.add_theme_constant_override("h_separation", 6)
		cf.add_theme_constant_override("v_separation", 4)
		if an.block != null:
			cf.add_child(UiTheme.chip(HSText.tx(String(an.block)), UiTheme.SURFACE_3, UiTheme.BAD, 13))
		else:
			var sh := HSInbreed.shown(an)
			for c in sh.slice(0, 3):   # 札が伸びすぎないよう3つまで（血量の多い順）
				cf.add_child(UiTheme.chip(HSText.tx(HSInbreed.text(c)), UiTheme.SURFACE_3, UiTheme.WARN if c.tier == 0 else UiTheme.GOLD_BRIGHT, 12))
			if sh.size() > 3: cf.add_child(UiTheme.label(HSText.t("ほか%dつ") % (sh.size() - 3), 12, UiTheme.FAINT))
			if sh.is_empty(): cf.add_child(UiTheme.label("なし", 13, UiTheme.FAINT))
		info.add_child(cf)
		var cand: Array = HSOriginal.candidates(ps, pd)
		info.add_child(_kv_head("受け継ぐ特殊能力", HSText.t("候補 %dつ%s") % [cand.size(), HSText.t("（この中から%dつ）") % HSOriginal.MAX_SKILLS if cand.size() > HSOriginal.MAX_SKILLS else ""], ""))
		var fl := HFlowContainer.new()
		fl.add_theme_constant_override("h_separation", 6)
		fl.add_theme_constant_override("v_separation", 4)
		for id in cand:
			fl.add_child(UiTheme.chip(HSText.skill_label(String(id)), UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT if HSSkills.is_unique(id) else UiTheme.IVORY, 12))
		if cand.is_empty(): fl.add_child(UiTheme.label("なし", 13, UiTheme.FAINT))
		info.add_child(fl)
	mid_box.add_child(UiSkin.rail(10))
	# 名前と「作る」
	mid_box.add_child(UiTheme.label("仔の名前", 13, UiTheme.MUTED))
	name_edit = LineEdit.new()
	name_edit.placeholder_text = HSText.t("空ならおまかせで付ける")
	name_edit.text = keep_name
	name_edit.max_length = 18 if HSText.is_en() else 12
	name_edit.custom_minimum_size = Vector2(0, 46)
	name_edit.add_theme_font_size_override("font_size", 18)
	name_edit.add_theme_stylebox_override("normal", UiTheme.box(UiTheme.SUNK, UiTheme.LINE_STRONG, 1, UiTheme.R_BUTTON, Vector4(14, 6, 14, 6)))
	name_edit.add_theme_stylebox_override("focus", UiTheme.box(UiTheme.SUNK, UiTheme.GOLD, 2, UiTheme.R_BUTTON, Vector4(14, 6, 14, 6)))
	mid_box.add_child(name_edit)
	var why := ""
	if an != null and an.block != null: why = "近すぎるので作れない"
	elif ps and pd and pd.get("foalY") == G.year: why = HSText.t("%sは今年もう仔を産んだ") % HSText.horse_name(pd)
	elif not HSSeason.can_buy(): why = "お手馬がいっぱい（厩舎で引退させると空く）"
	b_make = UiScreen.button("オリジナルホースを作る", true, 0, 64, 22, true)
	b_make.disabled = not (ps and pd) or why != ""
	b_make.pressed.connect(_make)
	mid_box.add_child(b_make)
	if why != "":
		mid_box.add_child(UiTheme.label(why, 13, UiTheme.WARN, HORIZONTAL_ALIGNMENT_CENTER))

# 見出しと右の小さな数（札の中の小見出し）
func _kv_head(k: String, v: String, extra: String) -> HBoxContainer:
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 8)
	var bar := ColorRect.new()
	bar.color = UiTheme.GOLD
	bar.custom_minimum_size = Vector2(3, 15)
	bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	hb.add_child(bar)
	hb.add_child(UiTheme.label(k, 14, UiTheme.IVORY))
	var vl := UiTheme.label(v, 12, UiTheme.MUTED)
	vl.clip_text = true
	vl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb.add_child(vl)
	if extra != "":
		hb.add_child(UiTheme.chip(extra, UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 12))
	return hb

# 選んだ親の札（空なら「表から選ぶ」）
func _slot(h, is_sire: bool) -> PanelContainer:
	var p := PanelContainer.new()
	var on: bool = h != null
	var sb := UiTheme.box(Color(UiTheme.SUNK.r, UiTheme.SUNK.g, UiTheme.SUNK.b, 0.75), UiTheme.LINE_GOLD if on else UiTheme.LINE_STRONG, 1, UiTheme.R_PANEL, Vector4(12, 8, 12, 8))
	p.add_theme_stylebox_override("panel", sb)
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	p.custom_minimum_size = Vector2(0, 112)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	p.add_child(v)
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 6)
	top.add_child(UiTheme.chip("父" if is_sire else "母", UiTheme.GOLD_DIM if on else UiTheme.SURFACE_3, UiTheme.ON_GOLD if on else UiTheme.FAINT, 12))
	var ic := UiSkin.icon("horse", 22, Color(1, 1, 1, 1.0 if on else 0.35))
	if ic: top.add_child(ic)
	v.add_child(top)
	if not on:
		var l := UiTheme.label(HSText.t("左の表から選ぶ" if is_sire else "右の表から選ぶ"), 14, UiTheme.FAINT)
		v.add_child(l)
		return p
	var nm := UiTheme.title(HSText.horse_name(h), 19, UiTheme.GOLD_BRIGHT)
	nm.clip_text = true
	nm.custom_minimum_size.x = 100
	v.add_child(nm)
	var st := HBoxContainer.new()
	st.add_theme_constant_override("separation", 4)
	var pk := HSSeason.fh_show_peak(h)
	st.add_child(UiTheme.label("芝", 12, UiTheme.MUTED))
	st.add_child(UiTheme.stat_chip(float(pk.turf)))
	st.add_child(UiTheme.label("ダ", 12, UiTheme.MUTED))
	st.add_child(UiTheme.stat_chip(float(pk.dirt)))
	v.add_child(st)
	v.add_child(UiTheme.label(HSText.t("%d戦%d勝・%s") % [int(HSU.or_(h.get("starts"), 0.0)), int(HSU.or_(h.get("wins"), 0.0)), HSText.tx(HSHorse.dist_label(h.distMin, h.distMax))], 12, UiTheme.MUTED))
	return p

# ---- 左右の表 ----
# other＝もう片方で選んでいる馬（いれば、近すぎる馬を灰色に）
func _col(v: VBoxContainer, title: String, sub: String, list: Array, is_sire: bool, other: Variant) -> void:
	v.add_child(UiScreen.section(title, HSText.t("%s %d/%d頭") % [HSText.t(sub), list.size(), HSOriginal.MAX_EACH], true))
	if list.is_empty():
		var p := PanelContainer.new()
		var sb = UiSkin.card(false, Vector4(44, 14, 44, 14), 64)
		p.add_theme_stylebox_override("panel", sb if sb != null else UiTheme.box(UiTheme.SURFACE, UiTheme.LINE, 1, 10, Vector4(14, 10, 14, 10)))
		var l := UiTheme.label(HSText.t("まだいません。%sを厩舎で引退させると、ここで暮らします") % HSText.t("牡馬" if is_sire else "牝馬"), 14, UiTheme.MUTED)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.custom_minimum_size.x = COL_W - 100
		p.add_child(l)
		v.add_child(p)
		return
	# 列の見出し（芝・ダ は引退したときの総合力）
	var hd := HBoxContainer.new()
	hd.add_theme_constant_override("separation", 6)
	var hm := MarginContainer.new()
	hm.add_theme_constant_override("margin_left", 40)
	hm.add_theme_constant_override("margin_right", 40)
	hm.add_child(hd)
	var hn := UiTheme.label("馬名・戦績・脚質・距離", 11, UiTheme.MUTED)
	hn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hd.add_child(hn)
	for t in ["芝", "ダ"]:
		var l := UiTheme.label(t, 11, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_CENTER)
		l.custom_minimum_size.x = 34
		hd.add_child(l)
	v.add_child(hm)
	var G = HSWorld.G
	for h in list:
		var on: bool = h.id == (sire if is_sire else dam)
		var near = null   # 選んでいる相手と近すぎる（インブリード）
		if other and not on: near = HSInbreed.analyze(h.name if is_sire else other.name, other.name if is_sire else h.name).block
		var rb := UiScreen.row_button(ROW_H, false, true)   # 選んだ親は「父」「母」の札と金の名前（行の光はカーソルだけ）
		var b: Button = rb[0]
		var hb: HBoxContainer = rb[1]
		if on:
			var pc := UiTheme.chip("父" if is_sire else "母", UiTheme.GOLD_FACE[1], UiTheme.ON_GOLD, 13)
			pc.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			hb.add_child(pc)
		var nv := VBoxContainer.new()
		nv.add_theme_constant_override("separation", -2)
		nv.alignment = BoxContainer.ALIGNMENT_CENTER
		nv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var l1 := HBoxContainer.new()
		l1.add_theme_constant_override("separation", 6)
		var nl := UiTheme.label(HSText.horse_name(h), 16, UiTheme.GOLD_BRIGHT if on else UiTheme.IVORY)
		l1.add_child(nl)
		if near == null:
			if float(HSU.or_(h.get("parentBonus"), 0.0)) > 0:
				l1.add_child(UiTheme.chip(HSText.t("能力 最大+%s" if h.get("potUp") else "ボーナス +%s") % HSU.num(h.parentBonus), UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 11))
			if not is_sire and h.get("foalY") == G.year:
				l1.add_child(UiTheme.chip("今年は産んだ", UiTheme.SURFACE_3, UiTheme.WARN, 11))
			l1.add_child(UiTheme.chip(HSText.t("仔はあと%d頭") % HSOriginal.foals_left(h), UiTheme.SURFACE_3, UiTheme.MUTED, 11))   # 1頭の馬から作れる数（作り終えた親は牧場を去る）
		nv.add_child(l1)
		# 2段目：戦績・脚質・距離。選んでいる相手と近すぎる馬は、その理由（「近すぎる（〇〇の1×2）」）
		var l2 := UiTheme.label(HSText.tx(String(near)) if near != null else HSText.t("%d戦%d勝・%s・%s") % [int(HSU.or_(h.get("starts"), 0.0)), int(HSU.or_(h.get("wins"), 0.0)), HSText.style_text(h), HSText.tx(HSHorse.dist_label(h.distMin, h.distMax))], 12, UiTheme.BAD if near != null else UiTheme.MUTED)
		l2.custom_minimum_size.x = 60
		l2.clip_text = true
		nv.add_child(l2)
		hb.add_child(nv)
		var pk := HSSeason.fh_show_peak(h)
		for k in ["turf", "dirt"]:
			var cw := CenterContainer.new()
			cw.custom_minimum_size.x = 34
			cw.add_child(UiTheme.stat_chip(float(pk[k])))
			hb.add_child(cw)
		UiScreen.pass_mouse(hb)
		var id: String = h.id
		b.set_meta("id", id)
		if near != null: b.modulate = Color(1, 1, 1, 0.45)   # 近すぎる馬は灰色（押しても選べない）
		var why_near = near
		b.pressed.connect(func():
			if why_near != null:
				toast(HSText.tx(String(why_near)), "bad")
				return
			_focus_id = id
			if is_sire: sire = "" if sire == id else id
			else: dam = "" if dam == id else id
			_fill())
		v.add_child(b)
		rows.append(b)

func _make() -> void:
	var r := HSOriginal.make(sire, dam, name_edit.text)
	if r.has("err"):
		toast(HSText.tx(String(r.err)), "bad")
		return
	UiFlow.save()
	UiFlow.program_id = r.horse.id
	celebrate("オリジナルホースが生まれた", HSText.horse_name(r.horse), HSText.t("父 %s・母 %s%s") % [HSText.horse_name(String(r.horse.sire)), HSText.horse_name(String(r.horse.dam)), HSText.t("・ボーナス +%s") % HSU.num(r.bonus) if r.bonus else ""], func(): go("stable"))

# X：カーソルのある行の馬を牧場から放す（確かめは「やめる」から。厩舎の牧場のタブと同じ）
func _unhandled_input(ev: InputEvent) -> void:
	if _modal == null and ((ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_X) or (ev is InputEventJoypadButton and ev.pressed and ev.button_index == JOY_BUTTON_X)):
		var f := get_viewport().gui_get_focus_owner()
		if f is Button and f.has_meta("id"):
			var id := String(f.get_meta("id"))
			var h = HSWorld.horse(id)
			if h:
				confirm(HSText.t("%sを牧場から放しますか？（親にできなくなります）") % HSText.horse_name(h), "放す", func(): _release(id))
			get_viewport().set_input_as_handled()
			return
	super._unhandled_input(ev)

func _release(id: String) -> void:
	var err = HSOriginal.release(id)
	if err:
		toast(HSText.tx(String(err)), "bad")
		return
	if sire == id: sire = ""
	if dam == id: dam = ""
	_focus_id = ""
	UiFlow.save()
	toast("牧場から放した", "good")
	_fill()

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
