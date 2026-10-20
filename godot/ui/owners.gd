# 馬主（js/ui/ownersui.js の S.owners・S.owner と同じ中身）：左に8人を1人1行（顔・名前と段階・好感度の目盛り・いまの課題・一緒の成績）、
# 右に選んだ馬主の顔（胸から上）・立場・ひと言・段階ごとの課題（OP → G3 → G2 → G1 → お手馬）・最後のアイテム・
# 店に頼む（G3 の段階から）・勝負服を着せる（G1 の段階から）・思い出の名馬を受け取る（前の版の約束）
# 決まりは HSOwners（of・mission・ask・claim・wear）を呼ぶだけ
extends UiScreen

const ROW_H := 98.0

var rows: Array[Button] = []
var ids: Array = []
var pv: VBoxContainer
var sel := 0

func hint() -> String:
	return "好きなジャンルのレースで勝つと声がかかる。段階ごとの課題をやり終えると、大きなレースで強い馬の依頼が来る。最後までやり終えると繁殖のアイテム"

func on_back() -> void:
	go("home")

func build() -> void:
	backdrop("bg_home", 0.84)
	make_band("主", "馬主", "騎乗依頼をくれる人たち", [["縁のある馬主", "%d/%d人" % [HSOwners.known_list().size(), HSOwners.LIST().size()]], ["暦", UiFlow.date_label()]])
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
			# まだ会っていない馬主：顔と名前を伏せ、ジャンルと出会いのヒントだけ
			hb.add_child(UiScreen.owner_q_face(72, 88))
			who.add_child(UiTheme.label("まだ会っていない馬主", 17, UiTheme.MUTED))
			who.add_child(UiScreen.owner_sign_chip(o, 12))
			cv.add_child(who)
			var hl := UiTheme.label(HSOwners.hint(String(o.id)), 14, UiTheme.GOLD_BRIGHT)
			hl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			hl.custom_minimum_size.x = 100
			cv.add_child(hl)
		else:
			hb.add_child(_face(String(o.id), "smile" if st.stage >= 2 else "base", 72, 88))
			who.add_child(UiTheme.label(String(o.name), 17))
			who.add_child(UiScreen.owner_sign_chip(o, 12))
			who.add_child(UiTheme.chip(HSOwners.stage_label(String(o.id)), UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT, 11))
			who.add_child(UiTheme.label("%s・%d歳" % [o.title, int(o.age)], 12, UiTheme.MUTED))
			cv.add_child(who)
			cv.add_child(_gauge(String(o.id), 420))
			cv.add_child(UiTheme.label("一緒に %d戦%d勝" % [int(st.rides), int(st.wins)], 12, UiTheme.MUTED))
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
	var o = HSOwners.by(oid)
	var fr := PanelContainer.new()
	fr.add_theme_stylebox_override("panel", UiTheme.box(Color(o.silks.base), Color(o.silks.sub), 2, 10, Vector4(0, 0, 0, 0)))
	fr.clip_children = CanvasItem.CLIP_CHILDREN_AND_DRAW
	fr.custom_minimum_size = Vector2(w, h)
	fr.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var p := UiScreen.owner_face_path(oid, mood)
	if p != "":
		var tr := TextureRect.new()
		tr.texture = load(p)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		tr.custom_minimum_size = Vector2(w, h)
		fr.add_child(tr)
	return fr

# 好感度の目盛り：いまの段階の下限から次の段階の下限まで（やり終えたら、いっぱい）と、いまの課題
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
	var m = HSOwners.mission(oid)
	var to := "いちばんの間柄（依頼はすべてやり終えた）" if done else ("課題：%s" % m.text if m else "")
	var tl := UiTheme.label(to, 12, UiTheme.FAINT)
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
	tv.add_child(UiTheme.label("%s・%d歳" % [o.kana, int(o.age)], 12, UiTheme.MUTED))
	var nh := HBoxContainer.new()
	nh.add_theme_constant_override("separation", 10)
	nh.add_child(UiTheme.title(String(o.name), 26 if String(o.name).length() < 12 else 20))
	nh.add_child(UiTheme.chip(HSOwners.stage_label(oid), UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 13))
	tv.add_child(nh)
	tv.add_child(UiTheme.label(String(o.title), 15, UiTheme.GOLD_BRIGHT))
	var sh := HBoxContainer.new()
	sh.add_theme_constant_override("separation", 8)
	sh.add_child(UiScreen.owner_sign_chip(o, 14))
	var subs := HSOwners.sub_labels(o)
	if subs.size():
		sh.add_child(UiTheme.label("ほかに %s" % "・".join(subs), 12, UiTheme.MUTED))
	tv.add_child(sh)
	var note := UiTheme.label(String(o.get("note", "")), 13, UiTheme.MUTED)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.custom_minimum_size.x = 100
	tv.add_child(note)
	var m = HSOwners.mission(oid)
	var say := UiTheme.label("「%s」" % HSOwners.fill_(String(m.say if m else o.get("intro", "")), {}), 15)
	say.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	say.custom_minimum_size.x = 100
	tv.add_child(say)
	tv.add_child(_gauge(oid, 380))
	# 段階ごとの課題
	pv.add_child(UiScreen.section("段階と課題", "一緒に %d戦%d勝・G1 %d勝" % [int(st.rides), int(st.wins), int(st.big)]))
	for k in HSOwners.STAGES.size():
		var mi: Dictionary = o.missions[k]
		var extra := "・勝負服" if k + 1 == HSOwners.WEAR_STAGE else ("・%s" % o.item.name if k == 4 else "")
		var cnt: float = float(HSU.or_(mi.need.get("count"), 1.0))
		var txt := String(mi.text) + ("（%d/%d）" % [int(st.prog), int(cnt)] if st.stage == k and cnt > 1 else "")
		var rw := ("✓ " if st.stage > k else ("▶ " if st.stage == k else "")) + "お礼 %s%s" % [HSU.money(HSOwners.yen(HSOwners.STAGES[k].money)), extra]
		pv.add_child(_ladder(String(HSOwners.STAGES[k].label), txt, rw, st.stage >= k))
	var il := UiTheme.label(("🎁 %s：%s（受け取った）" if HSOwners.done(oid) else "最後のアイテム：%s（%s）") % [o.item.name, o.item.text], 13, UiTheme.GOLD_BRIGHT if HSOwners.done(oid) else UiTheme.MUTED)
	pv.add_child(il)
	var gb = st.got.get("bond")
	if gb and gb.get("pending"):
		var bc := UiScreen.button("思い出の名馬を受け取る（前の版の約束）", true, 420, 44, 16)
		bc.focus_mode = Control.FOCUS_NONE
		bc.pressed.connect(func():
			var err = HSOwners.claim(oid)
			if err: toast(String(err), "bad"); return
			UiFlow.save()
			_preview(sel))
		pv.add_child(bc)
	# 来月の店に頼む（G3 の段階から）
	if HSOwners.can_ask(oid):
		var a = HSOwners.state().get("ask")
		var asked: bool = a != null and a.oid == oid
		var ba := UiScreen.button(("%d月の店に頼んだ" % int(a.m)) if asked else "来月の店に、好みの馬を頼む", not asked, 420, 40, 15)
		ba.focus_mode = Control.FOCUS_NONE
		ba.disabled = asked
		ba.pressed.connect(func():
			var err = HSOwners.ask(oid)
			if err: toast(String(err), "bad"); return
			toast("%s「%s」" % [o.name, HSOwners.fill_(String(HSU.or_(o.scenes.get("ask"), [""])[0]), {})], "good")
			UiFlow.save()
			_preview(sel))
		pv.add_child(ba)
	# 勝負服を着せる
	var mine := HSWorld.mine("stable") + HSWorld.mine("farm")
	if HSOwners.can_wear(oid) and mine.size():
		pv.add_child(UiScreen.section("勝負服を着せる", "決定で切り替え"))
		var wear: Dictionary = HSOwners.state().wear
		for h in mine.slice(0, 3):
			var on: bool = wear.get(h.id) == oid
			var bw := UiScreen.button("%s：%s" % [h.name, "%sさんの勝負服" % o.name if on else "自分の勝負服"], false, 0, 34, 14)
			bw.focus_mode = Control.FOCUS_NONE
			var hid: String = h.id
			bw.pressed.connect(func():
				var err = HSOwners.wear(hid, null if on else oid)
				if err: toast(String(err), "bad"); return
				UiFlow.save()
				_preview(sel))
			pv.add_child(bw)

# まだ会っていない馬主の右の見本：伏せた顔・ジャンル・出会いのヒント
func _preview_locked(o: Dictionary, top: HBoxContainer) -> void:
	top.add_child(UiScreen.owner_q_face(180, 225))
	var tv := VBoxContainer.new()
	tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tv.add_theme_constant_override("separation", 8)
	top.add_child(tv)
	tv.add_child(UiTheme.title("まだ会っていない馬主", 28, UiTheme.MUTED))
	tv.add_child(UiScreen.owner_sign_chip(o, 14))
	var hl := UiTheme.label(HSOwners.hint(String(o.id)), 17, UiTheme.GOLD_BRIGHT)
	hl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hl.custom_minimum_size.x = 100
	tv.add_child(hl)
	var gate := ""
	if o.get("gate"): gate = "（%s）" % HSOwners.GATE_LABEL.get(o.gate, "")
	var nl := UiTheme.label("この馬主の好きなジャンルのレースで勝ちを重ねると、声がかかる%s。会うと、次の週から騎乗依頼が来る。" % gate, 13, UiTheme.MUTED)
	nl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	nl.custom_minimum_size.x = 100
	tv.add_child(nl)
	pv.add_child(UiScreen.section("段階と課題"))
	for k in HSOwners.STAGES.size():
		pv.add_child(_ladder(String(HSOwners.STAGES[k].label), "？", "", false))

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
