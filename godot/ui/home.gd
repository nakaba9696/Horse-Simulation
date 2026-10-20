# ホーム（管理画面。docs/UI.md「ホーム」）
# 1. 今週することの札：「レースへ（n鞍に騎乗）」か「次の週へ」。金で大きく、最初のカーソル
# 2. 帯：騎手名・所属と減量・評判／暦・リーディング・今年の勝ち・資金
# 3. コマンドの札：番組表・馬の店・セーブ・タイトルへ（よく使うものほど左）
# 4. 右：騎乗依頼（馬主の顔・ひと言・レース・馬・受ける／断る）→ 12月のグランドフェスティバルの招待 → 今週の騎乗 → ニュース。左下：お手馬
extends UiScreen

var b_main: Button
var cmd: Array[Button] = []
var right: VBoxContainer
var left: VBoxContainer

func hint() -> String:
	return "決定で今週のレースへ。お手馬の行で厩舎（番組表・引退）"

func on_back() -> void:
	pass   # ホームがいちばん上（タイトルへはコマンドの札から）

func build() -> void:
	backdrop("bg_home", 0.8)
	var G = HSWorld.G
	var j = HSJockey.me()
	var wi := HSWorld.w_idx()
	var rank = HSJockey.my_rank(G.year)
	var yr: Dictionary = HSU.or_(j.years.get(HSU.num(G.year)), {})
	var wins := int(HSU.or_(yr.get("wins"), 0.0))
	var alw := HSJockey.allowance({"region": "JRA", "graded": false})
	var sub := "%s所属・%s%s・騎乗技術 %d" % [j.region, HSJockey.rep_label(float(j.rep)), "・減量 %s%dkg" % [HSJockey.allowance_mark(alw), int(alw)] if alw > 0 else "", int(round(float(j.skill)))]
	make_band("厩", String(j.name), sub, [["暦", UiFlow.date_label()], ["リーディング", "%d位" % int(rank) if rank != null else "－"], ["今年", "%d勝" % wins], ["資金", UiFlow.money_label(), "money"]])
	_build_hero()
	_build_stable()
	_build_right()

# ---- 今週すること・暦の札・コマンドの札 ----
func _build_hero() -> void:
	cmd.clear()
	var G = HSWorld.G
	var pb := UiScreen.panel_box(false, 14)
	var p: PanelContainer = pb[0]
	var v: VBoxContainer = pb[1]
	p.position = Vector2(PAD_X, TOP + 4)
	p.custom_minimum_size = Vector2(1000, 0)
	add_child(p)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 22)
	v.add_child(h)
	# 暦の札（金の面）
	var cal := PanelContainer.new()
	var sb := UiTheme.box(UiTheme.GOLD_FACE[1], UiTheme.GOLD_FACE[0], 2, UiTheme.R_PANEL, Vector4(10, 6, 10, 8))
	sb.border_width_bottom = 5
	sb.border_color = UiTheme.GOLD_DIM
	sb.shadow_color = Color(UiTheme.GOLD.r, UiTheme.GOLD.g, UiTheme.GOLD.b, 0.35)
	sb.shadow_size = 10
	cal.add_theme_stylebox_override("panel", sb)
	cal.custom_minimum_size = Vector2(132, 132)
	var cv := VBoxContainer.new()
	cv.add_theme_constant_override("separation", -8)
	cv.alignment = BoxContainer.ALIGNMENT_CENTER
	cal.add_child(cv)
	cv.add_child(UiTheme.label("%d年目" % UiFlow.year_n(), 15, UiTheme.ON_GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	var mm := UiTheme.title("%s月" % HSU.num(G.month), 46, UiTheme.ON_GOLD)
	mm.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	cv.add_child(mm)
	cv.add_child(UiTheme.label("GF週" if G.week > 4 else "第%s週" % HSU.num(G.week), 17, UiTheme.ON_GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	h.add_child(cal)
	# 今週すること
	var mv := VBoxContainer.new()
	mv.add_theme_constant_override("separation", 8)
	mv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(mv)
	mv.add_child(UiTheme.label("今週すること", 13, UiTheme.MUTED))
	var rides := HSJockey.my_rides()
	var resume: bool = UiFlow.in_week and UiFlow.current() != null
	var txt := "次の週へ"
	if G.get("gameOver"):
		txt = "シーズンは終わりました"
	elif resume:
		txt = "レースへ（%d鞍目から）" % (UiFlow.ride_i + 1)
	elif rides.size() > 0:
		txt = "レースへ（%d鞍に騎乗）" % rides.size()
	b_main = UiScreen.button(txt, true, 600, 76, 28)
	b_main.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b_main.disabled = G.get("gameOver") != null
	b_main.pressed.connect(_main)
	mv.add_child(b_main)
	var names := PackedStringArray()
	for r in rides:
		names.append("%s（%s）" % [HSRaces.label(r.card.race), r.runner.horse.name])
	var sl := UiTheme.label("・".join(names) if names.size() else "今週は乗るレースがありません。番組表で出走を決めるか、依頼を受けましょう", 14, UiTheme.MUTED)
	sl.clip_text = true
	sl.custom_minimum_size.x = 780
	mv.add_child(sl)
	# コマンドの札
	var ch := HBoxContainer.new()
	ch.add_theme_constant_override("separation", 12)
	v.add_child(ch)
	for c in [["番組表", "program"], ["厩舎", "stable"], ["馬の店", "shop"], ["生産", "breed"], ["データ", "data"], ["馬主", "owners"], ["セーブ", "save"], ["タイトルへ", "title"]]:
		var b := UiScreen.button(c[0], false, 0, 52, 17)
		UiScreen.compact(b)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var key: String = c[1]
		b.pressed.connect(func(): _cmd(key))
		ch.add_child(b)
		cmd.append(b)

func _main() -> void:
	if UiFlow.in_week and UiFlow.current() != null:
		go("card")
		return
	b_main.disabled = true
	b_main.text = "週を進めている…"
	await get_tree().process_frame
	await get_tree().process_frame
	go(UiFlow.begin_week())

func _cmd(key: String) -> void:
	for b in cmd:
		if b.has_focus(): UiFlow.focus["home"] = b.text
	match key:
		"program":
			var st := HSWorld.mine("stable") + HSWorld.mine("farm")
			if st.is_empty():
				toast("お手馬がいません。馬の店で買えます", "bad")
				return
			if UiFlow.program_id == "" or HSWorld.horse(UiFlow.program_id) == null:
				UiFlow.program_id = st[0].id
			go("program")
		"shop", "stable", "breed", "data", "owners":
			go(key)
		"save":
			UiFlow.save()
			toast("セーブした（%s）" % UiFlow.date_label(), "good")
		"title":
			UiFlow.save()
			go("title")

# ---- お手馬（左下） ----
# 馬の状態は疲労の段階（調子は無い：持ち主の決定 2026-10-20）
const HCOLS := [["馬名", 0], ["性齢", 52], ["疲労", 96], ["芝", 44], ["ダ", 44], ["次走", 250]]

func _build_stable() -> void:
	var G = HSWorld.G
	var wi := HSWorld.w_idx()
	left = VBoxContainer.new()
	left.position = Vector2(PAD_X, 338)
	left.custom_minimum_size = Vector2(1000, 0)
	left.add_theme_constant_override("separation", 4)
	add_child(left)
	var own := HSWorld.mine("stable") + HSWorld.mine("farm")
	left.add_child(UiScreen.section("お手馬", "%d/%d頭" % [own.size(), int(HSSeason.MAX_OWN)]))
	if own.is_empty():
		var pb := UiScreen.panel_box()
		(pb[1] as VBoxContainer).add_child(UiTheme.label("まだお手馬がいません。馬の店でデビュー前の史実馬を買いましょう", 15, UiTheme.MUTED))
		left.add_child(pb[0])
		_build_lower()
		return
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 10)
	for c in HCOLS:
		var l := UiTheme.label(c[0], 11, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_CENTER if c[1] > 0 else HORIZONTAL_ALIGNMENT_LEFT)
		if c[1] > 0: l.custom_minimum_size.x = c[1]
		else: l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		head.add_child(l)
	var hm := MarginContainer.new()
	hm.add_theme_constant_override("margin_left", 12)
	hm.add_theme_constant_override("margin_right", 12)
	hm.add_child(head)
	left.add_child(hm)
	for h in own.slice(0, 10):
		var rb := UiScreen.row_button(44, true)
		var b: Button = rb[0]
		var hb: HBoxContainer = rb[1]
		var nm := HBoxContainer.new()
		nm.add_theme_constant_override("separation", 8)
		nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var nl := UiTheme.label(String(h.name), 16, UiTheme.IVORY)
		nl.clip_text = true
		nl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		nm.add_child(nl)
		if h.get("hist"):
			nm.add_child(UiTheme.chip("史実", UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT, 11))
		if h.get("auto"):
			nm.add_child(UiTheme.chip("おまかせ", UiTheme.SURFACE_3, UiTheme.MUTED, 11))
		hb.add_child(nm)
		var sa := UiTheme.num_label("%s%d" % ["セ" if h.get("gelding") else h.sex, int(G.year - float(h.born))], 15)
		sa.custom_minimum_size.x = HCOLS[1][1]
		hb.add_child(sa)
		var fv := HSFatigue.view(h)
		var cond_txt := "入厩前" if h.loc == "farm" else String(fv.label)
		var cc := Color(String(fv.color)) if h.loc == "stable" else UiTheme.FAINT
		var cl := HBoxContainer.new()
		cl.custom_minimum_size.x = HCOLS[2][1]
		cl.add_theme_constant_override("separation", 6)
		var dot := ColorRect.new()
		dot.color = cc
		dot.custom_minimum_size = Vector2(9, 9)
		dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		cl.add_child(dot)
		cl.add_child(UiTheme.label(cond_txt, 13, UiTheme.MUTED))
		hb.add_child(cl)
		var fh := HSSeason.fh_both(h, wi)
		for k in ["turf", "dirt"]:
			var cw := CenterContainer.new()
			cw.custom_minimum_size.x = 44
			cw.add_child(UiScreen.num_chip(float(fh[k])))
			hb.add_child(cw)
		var nx = HSProgram.next(h)
		var nt := "未定"
		if nx != null:
			nt = "今週 %s" % HSRaces.label(nx.race) if nx.get("entered") else "%s %s" % [nx.label, nx.name]
		elif h.get("auto"):
			nt = "おまかせ"
		var xl := UiTheme.label(nt, 14, UiTheme.GOLD_BRIGHT if nx != null else UiTheme.FAINT)
		xl.custom_minimum_size.x = HCOLS[5][1]
		xl.clip_text = true
		hb.add_child(xl)
		UiScreen.pass_mouse(hb)
		var id: String = h.id
		b.pressed.connect(func(): UiFlow.program_id = id; go("stable"))
		left.add_child(b)
	_build_lower()

# 予約（近い順）・これからのG1（8週先まで）を左右に
func _build_lower() -> void:
	var G = HSWorld.G
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 16)
	left.add_child(hb)
	var a := VBoxContainer.new()
	a.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	a.add_theme_constant_override("separation", 6)
	hb.add_child(a)
	var rs := HSSeason.reserves()
	a.add_child(UiScreen.section("予約", "%d件" % rs.size()))
	var pa := UiScreen.panel_box(false, 3)
	for x in rs.slice(0, 5):
		var h = HSWorld.horse(x.id)
		var l := UiTheme.label("%s月%s週　%s　%s" % [HSU.num(x.m), HSU.num(x.w), x.label, h.name if h else ""], 14, UiTheme.IVORY)
		l.clip_text = true
		(pa[1] as VBoxContainer).add_child(l)
	if rs.is_empty():
		(pa[1] as VBoxContainer).add_child(UiTheme.label("なし（番組表で予約できる）", 14, UiTheme.FAINT))
	a.add_child(pa[0])
	var b := VBoxContainer.new()
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.add_theme_constant_override("separation", 6)
	hb.add_child(b)
	b.add_child(UiScreen.section("これからのG1"))
	var pb := UiScreen.panel_box(false, 3)
	var n := 0
	for r in HSWorld.upcoming_graded(8):
		if r.grade != "G1" or r.get("region") != "JRA": continue
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		row.add_child(UiTheme.label("%s月%s週" % [HSU.num(r.month), HSU.num(r.week)], 13, UiTheme.MUTED))
		row.add_child(UiTheme.grade_chip("G1", 11))
		var nl := UiTheme.label("%s　%s %s%sm" % [HSRaces.label(r), r.course, r.surface, HSU.num(r.dist)], 14)
		nl.clip_text = true
		nl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(nl)
		(pb[1] as VBoxContainer).add_child(row)
		n += 1
		if n >= 5: break
	if n == 0:
		(pb[1] as VBoxContainer).add_child(UiTheme.label("8週先までなし", 14, UiTheme.FAINT))
	b.add_child(pb[0])
	# 今週の重賞（お手馬が少ないときに空く下半分を、今週の様子で埋める）
	var gr: Array = HSWorld.week_races().filter(func(r): return r.get("graded") and r.get("region") in ["JRA", "海外"])
	if gr.size() and HSWorld.mine("stable").size() + HSWorld.mine("farm").size() < 7:
		left.add_child(UiScreen.section("今週の重賞", "%d" % gr.size()))
		var pw := UiScreen.panel_box(false, 3)
		for r in gr.slice(0, 5):
			var row := HBoxContainer.new()
			row.add_theme_constant_override("separation", 8)
			row.add_child(UiTheme.class_chip(HSRaces.grade_badge(r), true, 11))
			var nl := UiTheme.label("%s　%s %s%sm　%s" % [HSRaces.label(r), r.course, r.surface, HSU.num(r.dist), _age_cond(r)], 14)
			nl.clip_text = true
			nl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			row.add_child(nl)
			(pw[1] as VBoxContainer).add_child(row)
		left.add_child(pw[0])

static func _age_cond(r: Dictionary) -> String:
	var s: String = {"2": "2歳", "3": "3歳", "3+": "3歳以上", "4+": "4歳以上"}.get(String(HSU.or_(r.get("age"), "")), "")
	if r.get("sex") == "牝": s += "牝"
	return s

# ---- 右：騎乗依頼・GF の招待・今週の騎乗・ニュース ----
func _build_right() -> void:
	right = VBoxContainer.new()
	right.position = Vector2(PAD_X + 1000 + 24, TOP + 4)
	right.size = Vector2(1600 - (PAD_X * 2 + 1000 + 24), 0)
	right.add_theme_constant_override("separation", 8)
	add_child(right)
	var offers := HSOwners.offers()
	right.add_child(UiScreen.section("騎乗依頼", "%d件" % offers.size()))
	if offers.is_empty():
		if HSOwners.known_list().is_empty():
			right.add_child(_note_panel("まだ騎乗依頼をくれる馬主はいない。自分の馬で結果を出すと声がかかる（条件は馬主の画面）"))
		else:
			right.add_child(_note_panel("今週の騎乗依頼はありません"))
	for o in offers.slice(0, 3):
		var c = _offer_card(o)
		if c: right.add_child(c)
	var pend := HSSeason.dc_pending_list()
	if pend.size():
		right.add_child(_gf_card(pend))
	var rc = _reach_card()
	if rc: right.add_child(rc)
	var rides := HSJockey.my_rides()
	right.add_child(UiScreen.section("今週の騎乗", "%d鞍" % rides.size()))
	if rides.is_empty():
		right.add_child(_note_panel("なし"))
	for r in rides:
		var pb := UiScreen.panel_box(false, 2)
		var hh := HBoxContainer.new()
		hh.add_theme_constant_override("separation", 8)
		hh.add_child(UiTheme.class_chip(UiFlow.class_label(r.card.race), r.card.race.get("graded") == true))
		var rl := UiTheme.label("%s　%s %s%sm" % [HSRaces.label(r.card.race), r.card.race.course, r.card.race.surface, HSU.num(r.card.race.dist)], 15)
		rl.clip_text = true
		rl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		hh.add_child(rl)
		hh.add_child(UiTheme.label(String(r.runner.horse.name), 15, UiTheme.GOLD_BRIGHT))
		(pb[1] as VBoxContainer).add_child(hh)
		(pb[0] as PanelContainer).add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SURFACE, UiTheme.LINE, 1, 10, Vector4(14, 7, 14, 7)))
		right.add_child(pb[0])
	right.add_child(UiScreen.section("ニュース"))
	var nb := UiScreen.panel_box(false, 3)
	var G = HSWorld.G
	for nw in G.news.slice(0, 6):
		var l := UiTheme.label("%s　%s" % [HSWorld.week_label(nw.m, nw.w), nw.text], 13, UiTheme.GOLD_BRIGHT if nw.get("kind") in ["g1", "good"] else UiTheme.MUTED)
		l.autowrap_mode = TextServer.AUTOWRAP_OFF
		l.clip_text = true
		l.custom_minimum_size.x = 100
		l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		(nb[1] as VBoxContainer).add_child(l)
	right.add_child(nb[0])

func _note_panel(text: String) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SURFACE, UiTheme.LINE, 1, 10, Vector4(14, 8, 14, 8)))
	var l := UiTheme.label(text, 14, UiTheme.FAINT)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size.x = 100
	p.add_child(l)
	return p

static func face_tex(oid: String, mood := "base") -> Texture2D:
	var p := UiScreen.owner_face_path(oid, mood)
	return load(p) if p != "" else null

# 依頼の札：顔（丸く切らずに胸から上の角丸）・名前と間柄・ひと言・レース・馬・受ける／断る
func _offer_card(o: Dictionary) -> Variant:
	var card = HSWorld.card_of(o.raceKey)
	if not card: return null
	var x = null
	for r in card.runners:
		if r.horse.id == o.horseId: x = r; break
	if not x: return null
	var ow = HSOwners.by(o.oid)
	var race: Dictionary = card.race
	var h: Dictionary = x.horse
	var acc := HSOwners.accepted(o.raceKey)
	var p := PanelContainer.new()
	var sb := UiTheme.box(UiTheme.SURFACE, UiTheme.LINE_GOLD if acc else UiTheme.LINE, 1, UiTheme.R_PANEL, Vector4(10, 8, 14, 8))
	if acc:
		sb.border_width_left = 3
		sb.border_color = UiTheme.GOLD
	p.add_theme_stylebox_override("panel", sb)
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 12)
	p.add_child(hb)
	var tex := face_tex(o.oid, "smile" if acc else "base")
	if tex:
		var fr := PanelContainer.new()
		var fs := UiTheme.box(Color(ow.silks.base), Color(ow.silks.sub), 2, 10, Vector4(0, 0, 0, 0))
		fr.add_theme_stylebox_override("panel", fs)
		fr.clip_children = CanvasItem.CLIP_CHILDREN_AND_DRAW
		fr.custom_minimum_size = Vector2(92, 112)
		var tr := TextureRect.new()
		tr.texture = tex
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		tr.custom_minimum_size = Vector2(92, 112)
		fr.add_child(tr)
		hb.add_child(fr)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb.add_child(v)
	var who := HBoxContainer.new()
	who.add_theme_constant_override("separation", 8)
	who.add_child(UiTheme.label(String(ow.name), 16))
	who.add_child(UiScreen.owner_sign_chip(ow, 11))
	who.add_child(UiTheme.chip(HSOwners.stage_label(o.oid), UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT, 11))
	if o.get("best"):
		who.add_child(UiTheme.chip("いちばんの馬", UiTheme.SURFACE_3, UiTheme.WARN, 11))
	v.add_child(who)
	var line := HSOwners.line(o.oid, "offer", float(o.line), {"horse": h.name, "race": HSRaces.label(race)}, {"race": race, "horse": h})
	var say := UiTheme.label("「%s」" % line, 13, UiTheme.MUTED)
	say.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	say.max_lines_visible = 2
	say.custom_minimum_size.x = 100
	say.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_child(say)
	var rl := HBoxContainer.new()
	rl.add_theme_constant_override("separation", 6)
	rl.add_child(UiTheme.class_chip(UiFlow.class_label(race), race.get("graded") == true, 12))
	var rn := UiTheme.label("%s　%s %s%sm" % [HSRaces.label(race), race.course, race.surface, HSU.num(race.dist)], 14)
	rn.clip_text = true
	rn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	rl.add_child(rn)
	v.add_child(rl)
	var hl := HBoxContainer.new()
	hl.add_theme_constant_override("separation", 8)
	hl.add_child(UiTheme.label(String(h.name), 15, UiTheme.GOLD_BRIGHT))
	hl.add_child(UiTheme.label("%s%d%s" % ["セ" if h.get("gelding") else h.sex, int(HSWorld.G.year - float(h.born)), "・%d番人気" % int(x.pop) if x.get("pop") else ""], 13, UiTheme.MUTED))
	hl.add_child(UiScreen.spacer())
	var bh := HBoxContainer.new()
	hl.add_child(bh)
	v.add_child(hl)
	bh.add_theme_constant_override("separation", 8)
	var rk: String = o.raceKey
	var hid: String = o.horseId
	if acc:
		bh.add_child(UiTheme.chip("受けた", UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 13))
		var bc := UiScreen.button("取り消す", false, 110, 34, 14)
		bc.pressed.connect(func(): HSOwners.unaccept(rk); UiFlow.save(); _rebuild())
		bh.add_child(bc)
	else:
		var clash = HSOwners.clash(o)
		var ba := UiScreen.button("依頼の馬に乗る" if clash else "受ける", false, 130, 34, 15)
		ba.add_theme_color_override("font_color", UiTheme.GOLD_BRIGHT)
		ba.pressed.connect(func():
			var err = HSOwners.accept(rk, hid)
			if err: toast(String(err), "bad")
			else: UiFlow.save(); _rebuild("受けた：%s" % HSRaces.label(race)))
		bh.add_child(ba)
		var bd := UiScreen.button("断る", false, 90, 34, 14)
		bd.pressed.connect(func():
			var line2 := HSOwners.line(o.oid, "decline", float(o.line), {"horse": h.name, "race": HSRaces.label(race)}, {"race": race, "horse": h})
			var err = HSOwners.decline(rk)
			if err: toast(String(err), "bad")
			else: UiFlow.save(); _rebuild("%s「%s」" % [ow.name, line2]))
		bh.add_child(bd)
	return p

# 12月1週：グランドフェスティバルの招待（GF の画面で出す馬を選ぶ）
func _gf_card(cats: Array) -> PanelContainer:
	var pb := UiScreen.panel_box(true, 6)
	var v: VBoxContainer = pb[1]
	v.add_child(UiTheme.title("%sの招待が届いた" % HSSeason.DC_NAME, 18, UiTheme.GOLD_BRIGHT))
	v.add_child(UiTheme.label("・".join(cats.map(func(c): return HSSeason.gf_by()[c].label)), 14, UiTheme.MUTED))
	var b := UiScreen.button("出る馬を決める", false, 220, 40, 16)
	b.add_theme_color_override("font_color", UiTheme.GOLD_BRIGHT)
	b.pressed.connect(func(): go("gf"))
	v.add_child(b)
	return pb[0]

# スペシャルホースのリーチ：自分の馬が、次の勝ちでグループの条件がそろう
func _reach_card() -> Variant:
	var lines: Array = []
	for h in HSWorld.mine("stable"):
		for r in HSSpecial.reach_info(h):
			lines.append("%s → %s（%s）" % [h.name, r.need, r.group.label])
	if lines.is_empty():
		return null
	var p := PanelContainer.new()
	var sb := UiTheme.box(UiTheme.SURFACE, UiTheme.LINE_GOLD, 1, 10, Vector4(14, 7, 14, 7))
	sb.border_width_left = 3
	sb.border_color = UiTheme.WARN
	p.add_theme_stylebox_override("panel", sb)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 1)
	p.add_child(v)
	v.add_child(UiTheme.label("★ スペシャルホースのリーチ（勝てば最後のレースに名馬が出てくる）", 13, UiTheme.WARN))
	for l in lines.slice(0, 3):
		var ll := UiTheme.label(String(l), 14)
		ll.clip_text = true
		v.add_child(ll)
	return p

# 依頼を受けた・断ったあとは画面を組み直す（今週の騎乗と主な操作の札が変わる）
func _rebuild(msg := "") -> void:
	for c in get_children():
		c.queue_free()
	await get_tree().process_frame
	build()
	_build_keybar()
	fade = ColorRect.new()
	fade.color = Color(0.01, 0.03, 0.02, 0.0)
	fade.set_anchors_preset(Control.PRESET_FULL_RECT)
	fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(fade)
	focus_first()
	if msg != "":
		toast(msg, "good")

func focus_first() -> void:
	var key := String(UiFlow.focus.get("home", ""))
	for b in cmd:
		if b.text == key and is_instance_valid(b):
			b.grab_focus()
			return
	if b_main and not b_main.disabled:
		b_main.grab_focus()
	elif cmd.size():
		cmd[0].grab_focus()
