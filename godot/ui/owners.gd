# オーナー（js/ui/ownersui.js の S.owners・S.owner と同じ中身）：左に8人を1人1行（顔・名前と段階・友好度の目盛り・いまのミッションと予定・一緒の成績）、
# 右に選んだオーナーの顔（胸から上）・立場・ひと言・段階ごとのミッション（OP → G3 → G2 → G1 は依頼の馬とレース、お手馬は自分の馬で）・最後のアイテム・
# 店に頼む（G3 の段階から）・勝負服を着せる（G1 の段階から）・思い出の名馬を受け取る（前の版の約束）
# 決まりは HSOwners（of・mission・ask・claim・wear）を呼ぶだけ
extends UiScreen

const ROW_H := 98.0

var rows: Array[Button] = []
var ids: Array = []
var pv: VBoxContainer
var sel := 0

func hint() -> String:
	return HSText.t("ジャンルのレースで勝つと出会いの点（OP 1・G3 2・G2 3・G1 4。4点で出会い）。ミッションはレースの%d週前に届き、勝てば次の段階。負けたら次の年にもう一度") % int(HSOwners.LEAD)

func on_back() -> void:
	go("home")

func build() -> void:
	backdrop("bg_home", 0.84)
	make_band("主", "オーナー", "騎乗依頼をくれる人たち", [["縁のあるオーナー", HSText.t("%d/%d人") % [HSOwners.known_list().size(), HSOwners.LIST().size()]], ["暦", UiFlow.date_label()]])
	var v := VBoxContainer.new()
	v.position = Vector2(PAD_X, TOP + 4)
	v.custom_minimum_size = Vector2(760, 0)
	v.add_theme_constant_override("separation", 5)
	add_child(v)
	for o in HSOwners.LIST():
		var st := HSOwners.of(String(o.id))
		var rb := UiScreen.row_button(ROW_H, st.stage >= 2)
		var b: Button = rb[0]
		var hb: HBoxContainer = rb[1]
		var cv := VBoxContainer.new()
		cv.add_theme_constant_override("separation", 1)
		cv.alignment = BoxContainer.ALIGNMENT_CENTER
		cv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var who := HBoxContainer.new()
		who.add_theme_constant_override("separation", 8)
		if not st.known:
			# まだ会っていないオーナー：顔と名前を伏せ、ジャンルと出会いのヒント・出会いの点だけ
			hb.add_child(UiScreen.owner_q_face(72, 88))
			who.add_child(UiTheme.label("まだ会っていないオーナー", 17, UiTheme.MUTED))
			who.add_child(UiScreen.owner_sign_chip(o, 12))
			who.add_child(UiTheme.label(HSText.t("出会いの点 %s") % _pips(String(o.id)), 13, UiTheme.GOLD))
			cv.add_child(who)
			var hl := UiTheme.label(HSText.owner_line(HSOwners.hint(String(o.id))), 14, UiTheme.GOLD_BRIGHT)
			hl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			hl.custom_minimum_size.x = 100
			cv.add_child(hl)
		else:
			hb.add_child(_face(String(o.id), "smile" if st.stage >= 2 else "base", 72, 88))
			who.add_child(UiTheme.label(HSText.owner_line(String(o.name)), 17))
			who.add_child(UiScreen.owner_sign_chip(o, 12))
			who.add_child(UiTheme.chip(HSText.t(HSOwners.stage_label(String(o.id))), UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT, 11))
			who.add_child(UiTheme.label(HSText.t("%s・%d歳") % [HSText.owner_line(String(o.title)), int(o.age)], 12, UiTheme.MUTED))
			cv.add_child(who)
			cv.add_child(_gauge(String(o.id), 420))
			cv.add_child(UiTheme.label(HSText.t("一緒に %d戦%d勝") % [int(st.rides), int(st.wins)], 12, UiTheme.MUTED))
		hb.add_child(cv)
		UiScreen.pass_mouse(hb)
		var k := ids.size()
		b.focus_entered.connect(func(): _preview(k))
		v.add_child(b)
		rows.append(b)
		ids.append(String(o.id))
	var pb := UiScreen.panel_box(true, 6)
	(pb[0] as PanelContainer).position = Vector2(PAD_X + 760 + 20, TOP + 4)
	(pb[0] as PanelContainer).custom_minimum_size = Vector2(1600 - PAD_X * 2 - 760 - 20, 830)
	add_child(pb[0])
	pv = pb[1]
	_preview(0)

static func _face(oid: String, mood: String, w: float, h: float) -> Control:
	return UiScreen.owner_face(HSOwners.by(oid), mood, w, h)

# 出会いの点（4つの印）
static func _pips(oid: String) -> String:
	var n := mini(int(HSOwners.MEET), int(floorf(float(HSOwners.of(oid).pts))))
	return "●".repeat(n) + "○".repeat(int(HSOwners.MEET) - n)

# いまのミッションと予定の一言（js/ui/ownersui.js の jobNote と同じ）
static func job_note(oid: String) -> String:
	var st := HSOwners.of(oid)
	if HSOwners.done(oid): return HSText.t("いちばんの間柄（依頼はすべてやり終えた）")
	var o = HSOwners.by(oid)
	var t := HSText.t("ミッション：%s") % HSText.mission(o, int(st.stage))
	var j = st.get("job")
	if st.stage >= HSOwners.JOBS or not j or j.k != st.stage: return t
	return HSText.t("%s（%s。%s%s）") % [t, HSText.date_label(float(j.y), float(j.m), float(j.w)), HSText.t("依頼が来ている") if j.on else HSText.t("%d週前に依頼が来る") % int(HSOwners.LEAD), HSText.t("・%d度目") % (int(j.tries) + 1) if j.tries else ""]

# 友好度の目盛り：いまの段階の下限から次の段階の下限まで（やり終えたら、いっぱい）と、いまのミッション
func _gauge(oid: String, w: float) -> VBoxContainer:
	var st := HSOwners.of(oid)
	var done := HSOwners.done(oid)
	var lo: float = 0.0 if done else HSOwners.floor_(st)
	var hi: float = HSOwners.MAX if (done or st.stage >= 4) else HSOwners.STAGES[int(st.stage) + 1].floor
	var u := clampf((float(st.pts) - lo) / maxf(1.0, hi - lo), 0.0, 1.0)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 0)
	var bar := PanelContainer.new()
	bar.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SUNK, UiTheme.LINE, 1, 999, Vector4(2, 2, 2, 2)))
	bar.custom_minimum_size = Vector2(w, 12)
	bar.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	var fill := ColorRect.new()
	fill.color = UiTheme.GOLD
	fill.custom_minimum_size = Vector2(maxf(2.0, (w - 4.0) * u), 8)
	fill.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	bar.add_child(fill)
	v.add_child(bar)
	var tl := UiTheme.label(job_note(oid), 12, UiTheme.FAINT)
	tl.clip_text = true
	tl.custom_minimum_size.x = w
	v.add_child(tl)
	return v

func _preview(i: int) -> void:
	sel = i
	for c in pv.get_children(): c.queue_free()
	var oid: String = ids[i]
	var o = HSOwners.by(oid)
	var st := HSOwners.of(oid)
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 18)
	pv.add_child(top)
	if not st.known:
		_preview_locked(o, top)
		return
	top.add_child(_face(oid, "joy" if st.stage >= 2 else "smile", 180, 225))
	var tv := VBoxContainer.new()
	tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tv.add_theme_constant_override("separation", 4)
	top.add_child(tv)
	tv.add_child(UiTheme.label(HSText.t("%s・%d歳") % [HSText.owner_line(String(o.kana)), int(o.age)], 12, UiTheme.MUTED))
	var nh := HBoxContainer.new()
	nh.add_theme_constant_override("separation", 10)
	nh.add_child(UiTheme.title(HSText.owner_line(String(o.name)), 26 if String(o.name).length() < 12 else 20))
	nh.add_child(UiTheme.chip(HSText.t(HSOwners.stage_label(oid)), UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 13))
	tv.add_child(nh)
	tv.add_child(UiTheme.label(HSText.owner_line(String(o.title)), 15, UiTheme.GOLD_BRIGHT))
	var sh := HBoxContainer.new()
	sh.add_theme_constant_override("separation", 8)
	sh.add_child(UiScreen.owner_sign_chip(o, 14))
	var subs := HSOwners.sub_labels(o)
	if subs.size():
		sh.add_child(UiTheme.label(HSText.t("ほかに %s") % HSText.t("・").join(subs.map(func(x): return HSText.t(String(x)))), 12, UiTheme.MUTED))
	tv.add_child(sh)
	var note := UiTheme.label(HSText.owner_line(String(o.get("note", ""))), 13, UiTheme.MUTED)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.custom_minimum_size.x = 100
	tv.add_child(note)
	var m = HSOwners.mission(oid)
	var say := UiTheme.label(HSText.t("「%s」") % HSOwners.fill_(String(m.say if m else o.get("intro", "")), {"horse": String(m.get("horse", "")) if m else "", "race": HSOwners.race_label(String(m.race)) if m and m.get("race") else ""}), 15)
	say.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	say.custom_minimum_size.x = 100
	tv.add_child(say)
	tv.add_child(_gauge(oid, 380))
	# 段階ごとのミッション（OP〜G1 は依頼の馬とレース）
	pv.add_child(UiScreen.section("段階とミッション", HSText.t("一緒に %d戦%d勝・G1 %d勝") % [int(st.rides), int(st.wins), int(st.big)]))
	for k in HSOwners.STAGES.size():
		var mi: Dictionary = o.missions[k]
		var extra := HSText.t("・勝負服") if k + 1 == HSOwners.WEAR_STAGE else (HSText.t("・%s") % HSText.owner_line(String(o.item.name)) if k == 4 else "")
		var txt := HSText.mission(o, k)
		if k < HSOwners.JOBS and mi.get("horse"):
			var d = HSOwners.race_data(String(mi.race))
			txt = HSText.t("%s（%d歳）で%s") % [HSText.horse_name(String(mi.horse)), int(mi.age), HSText.race_name(HSOwners.race_label(String(mi.race)))]
			if d: txt += "　%s・%s" % [HSText.course_dist({"course": d.course, "surface": "ダート" if d.surface == "ダ" else "芝", "dist": d.dist}), HSText.week_label(float(d.month), float(d.week))]
			var fa = HSOwners.mission_fact(o, k)
			if fa: txt += "　【%s】%s" % [HSText.t(fa.label), HSText.t("史実：%s") % HSText.tx(String(fa.real)) if fa.ifs else ""]
		var rw := ("✓ " if st.stage > k else ("▶ " if st.stage == k else "")) + HSText.t("お礼 %s%s") % [HSText.money(HSOwners.yen(HSOwners.STAGES[k].money)), extra]
		pv.add_child(_ladder(HSText.t(String(HSOwners.STAGES[k].label)), txt, rw, st.stage >= k))
	var il := UiTheme.label(HSText.t("🎁 %s：%s（受け取った）" if HSOwners.done(oid) else "最後のアイテム：%s（%s）") % [HSText.owner_line(String(o.item.name)), HSText.owner_line(String(o.item.text))], 13, UiTheme.GOLD_BRIGHT if HSOwners.done(oid) else UiTheme.MUTED)
	pv.add_child(il)
	var gb = st.got.get("bond")
	if gb and gb.get("pending"):
		var bc := UiScreen.button("思い出の名馬を受け取る（前の版の約束）", true, 420, 44, 16)
		bc.pressed.connect(func():
			var err = HSOwners.claim(oid)
			if err: toast(HSText.tx(String(err)), "bad"); return
			UiFlow.save()
			_after_press())
		pv.add_child(bc)
	# 来月の店に頼む（G3 の段階から）
	if HSOwners.can_ask(oid):
		var a = HSOwners.state().get("ask")
		var asked: bool = a != null and a.oid == oid
		var ba := UiScreen.button((HSText.t("%d月の店に頼んだ") % int(a.m)) if asked else "来月の店に、好みの馬を頼む", not asked, 420, 40, 15)
		ba.disabled = asked
		ba.pressed.connect(func():
			var err = HSOwners.ask(oid)
			if err: toast(HSText.tx(String(err)), "bad"); return
			toast(HSText.t("%s「%s」") % [HSText.owner_line(String(o.name)), HSText.owner_line(HSOwners.fill_(String(HSU.or_(o.scenes.get("ask"), [""])[0]), {}))], "good")
			UiFlow.save()
			_after_press())
		pv.add_child(ba)
	# 勝負服を着せる
	var mine := HSWorld.mine("stable") + HSWorld.mine("farm")
	if HSOwners.can_wear(oid) and mine.size():
		pv.add_child(UiScreen.section("勝負服を着せる", "決定で切り替え"))
		var wear: Dictionary = HSOwners.state().wear
		for h in mine.slice(0, 3):
			var on: bool = wear.get(h.id) == oid
			var bw := UiScreen.button(HSText.t("%s：%s") % [HSText.horse_name(h), HSText.t("%sさんの勝負服") % HSText.owner_line(String(o.name)) if on else HSText.t("自分の勝負服")], false, 0, 34, 14)
			var hid: String = h.id
			bw.pressed.connect(func():
				var err = HSOwners.wear(hid, null if on else oid)
				if err: toast(HSText.tx(String(err)), "bad"); return
				UiFlow.save()
				_after_press())
			pv.add_child(bw)

# まだ会っていないオーナーの右の見本：伏せた顔・ジャンル・出会いのヒント・出会いの点
func _preview_locked(o: Dictionary, top: HBoxContainer) -> void:
	top.add_child(UiScreen.owner_q_face(180, 225))
	var tv := VBoxContainer.new()
	tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tv.add_theme_constant_override("separation", 8)
	top.add_child(tv)
	tv.add_child(UiTheme.title("まだ会っていないオーナー", 28, UiTheme.MUTED))
	tv.add_child(UiScreen.owner_sign_chip(o, 14))
	var hl := UiTheme.label(HSText.owner_line(HSOwners.hint(String(o.id))), 17, UiTheme.GOLD_BRIGHT)
	hl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hl.custom_minimum_size.x = 100
	tv.add_child(hl)
	var gate := ""
	if o.get("gate"): gate = HSText.t("（%s）") % HSText.t(String(HSOwners.GATE_LABEL.get(o.gate, "")))
	tv.add_child(UiTheme.label(HSText.t("出会いの点 %s") % _pips(String(o.id)), 17, UiTheme.GOLD))
	var nl := UiTheme.label(HSText.t("このオーナーの好きなジャンルのレースで勝つと点がたまる（%s）%s。会うと、騎乗依頼（ミッション）が始まる。") % [HSOwners.POINT_TEXT, gate], 13, UiTheme.MUTED)
	nl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	nl.custom_minimum_size.x = 100
	tv.add_child(nl)
	pv.add_child(UiScreen.section("段階とミッション"))
	for k in HSOwners.STAGES.size():
		pv.add_child(_ladder(HSText.t(String(HSOwners.STAGES[k].label)), "？", "", false))

func _ladder(name: String, job: String, reward: String, on: bool) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := UiTheme.box(UiTheme.SURFACE, UiTheme.LINE, 1, 10, Vector4(12, 4, 12, 4))
	if on:
		sb.border_width_left = 3
		sb.border_color = UiTheme.GOLD
	p.add_theme_stylebox_override("panel", sb)
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 12)
	p.add_child(hb)
	var n := UiTheme.label(name, 15, UiTheme.GOLD_BRIGHT if on else UiTheme.FAINT)
	n.custom_minimum_size.x = 70
	hb.add_child(n)
	var j := UiTheme.label(job, 13, UiTheme.IVORY if on else UiTheme.FAINT)
	j.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	j.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	j.custom_minimum_size.x = 100
	hb.add_child(j)
	var r := UiTheme.label(reward, 12, UiTheme.GOLD_BRIGHT if reward.begins_with("✓") else UiTheme.MUTED)
	r.custom_minimum_size.x = 170
	r.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hb.add_child(r)
	return p

func focus_first() -> void:
	if rows.size():
		rows[clampi(sel, 0, rows.size() - 1)].grab_focus()

# 見本のボタン（受け取る・店に頼む・勝負服）を押したあと：見本を組み直すと押した札が消えるので、カーソルを左の行へ戻す
func _after_press() -> void:
	_preview(sel)
	if sel < rows.size():
		rows[sel].grab_focus()
