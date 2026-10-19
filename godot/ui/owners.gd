# 馬主（js/ui/ownersui.js の S.owners・S.owner と同じ中身）：左に7人を1人1行（顔・名前と間柄・好感度の目盛り・次のご褒美・一緒の成績）、
# 右に選んだ馬主の顔（胸から上）・立場・ひと言・間柄の段とご褒美・勝負服を着せる（「勝負服」のご褒美のあと）・思い出の名馬を受け取る
# 決まりは HSOwners（of・tier_of・claim・wear）を呼ぶだけ
extends UiScreen

# ご褒美の名前（js/core/owners.js の O.REWARDS と同じ）
const REWARDS := [
	{"key": "t1", "tier": 1, "label": "祝いの品"},
	{"key": "t2", "tier": 2, "label": "勝負服"},
	{"key": "t3", "tier": 3, "label": "引退した馬"},
	{"key": "bond", "tier": 4, "label": "思い出の名馬"},
]
const TIER_JOB := ["条件戦の依頼", "重賞の依頼", "G1の依頼・いちばん強い馬", "グランドフェスティバル・海外の依頼"]

var rows: Array[Button] = []
var ids: Array = []
var pv: VBoxContainer
var sel := 0

func hint() -> String:
	return "はじめは縁が無く、条件を満たすと声がかかる。依頼を受けて結果を出すと好感度が上がり、大きなレースで強い馬の依頼が来る"

func on_back() -> void:
	go("home")

func build() -> void:
	backdrop("bg_home", 0.84)
	make_band("主", "馬主", "騎乗依頼をくれる人たち", [["縁のある馬主", "%d/%d人" % [HSOwners.known_list().size(), HSOwners.LIST().size()]], ["暦", UiFlow.date_label()]])
	var v := VBoxContainer.new()
	v.position = Vector2(PAD_X, TOP + 4)
	v.custom_minimum_size = Vector2(760, 0)
	v.add_theme_constant_override("separation", 6)
	add_child(v)
	for o in HSOwners.LIST():
		var st := HSOwners.of(String(o.id))
		var rb := UiScreen.row_button(112, st.tier >= 2)
		var b: Button = rb[0]
		var hb: HBoxContainer = rb[1]
		var cv := VBoxContainer.new()
		cv.add_theme_constant_override("separation", 2)
		cv.alignment = BoxContainer.ALIGNMENT_CENTER
		cv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var who := HBoxContainer.new()
		who.add_theme_constant_override("separation", 8)
		if not st.known:
			# まだ縁の無い馬主：顔と名前を伏せ、看板の特徴と条件のヒントだけ
			hb.add_child(UiScreen.owner_q_face(80, 98))
			who.add_child(UiTheme.label("まだ会っていない馬主", 17, UiTheme.MUTED))
			who.add_child(UiScreen.owner_sign_chip(o, 12))
			cv.add_child(who)
			var hl := UiTheme.label(HSOwners.hint(String(o.id)), 14, UiTheme.GOLD_BRIGHT)
			hl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			hl.custom_minimum_size.x = 100
			cv.add_child(hl)
			cv.add_child(UiTheme.label("条件を満たすと声がかかり、次の週から騎乗依頼が来る", 12, UiTheme.FAINT))
		else:
			hb.add_child(_face(String(o.id), "smile" if st.tier >= 2 else "base", 80, 98))
			who.add_child(UiTheme.label(String(o.name), 17))
			who.add_child(UiScreen.owner_sign_chip(o, 12))
			who.add_child(UiTheme.chip(String(HSOwners.tier_of(String(o.id)).label), UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT, 11))
			who.add_child(UiTheme.label("%s・%d歳" % [o.title, int(o.age)], 12, UiTheme.MUTED))
			cv.add_child(who)
			cv.add_child(_gauge(String(o.id), 420))
			cv.add_child(UiTheme.label("次のご褒美：%s　一緒に %d戦%d勝" % [_next_reward(String(o.id)), int(st.rides), int(st.wins)], 12, UiTheme.MUTED))
		hb.add_child(cv)
		UiScreen.pass_mouse(hb)
		var k := ids.size()
		b.focus_entered.connect(func(): _preview(k))
		v.add_child(b)
		rows.append(b)
		ids.append(String(o.id))
	var pb := UiScreen.panel_box(true, 8)
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
	var p := "res://assets/owners/%s_%s.webp" % [oid, mood]
	if ResourceLoader.exists(p):
		var tr := TextureRect.new()
		tr.texture = load(p)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		tr.custom_minimum_size = Vector2(w, h)
		fr.add_child(tr)
	return fr

# 好感度の目盛り：いまの段から次の段まで
func _gauge(oid: String, w: float) -> VBoxContainer:
	var st := HSOwners.of(oid)
	var cur: Dictionary = HSOwners.TIERS[int(st.tier)]
	var nx = HSOwners.next_tier(oid)
	var lo: float = cur.pts
	var hi: float = nx.pts if nx else HSOwners.MAX
	var u := clampf((float(st.pts) - lo) / maxf(1.0, hi - lo), 0.0, 1.0)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 0)
	var bar := PanelContainer.new()
	bar.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SUNK, UiTheme.LINE, 1, 999, Vector4(2, 2, 2, 2)))
	bar.custom_minimum_size = Vector2(w, 12)
	var fill := ColorRect.new()
	fill.color = UiTheme.GOLD
	fill.custom_minimum_size = Vector2(maxf(2.0, (w - 4.0) * u), 8)
	fill.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	bar.add_child(fill)
	v.add_child(bar)
	var to := ("次は「%s」" % nx.label) if nx else ("いちばんの間柄" if st.got.get("bond") else "好感度がいっぱいになると、最後のご褒美")
	v.add_child(UiTheme.label(to, 11, UiTheme.FAINT))
	return v

func _next_reward(oid: String) -> String:
	var st := HSOwners.of(oid)
	for r in REWARDS:
		if not st.got.get(r.key):
			return "%s（%s）" % [r.label, "「%s」で" % HSOwners.TIERS[r.tier].label if r.tier < 4 else "好感度がいっぱいで"]
	return "すべて受け取った"

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
	top.add_child(_face(oid, "joy" if st.tier >= 2 else "smile", 200, 250))
	var tv := VBoxContainer.new()
	tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tv.add_theme_constant_override("separation", 4)
	top.add_child(tv)
	tv.add_child(UiTheme.label("%s・%d歳" % [o.kana, int(o.age)], 12, UiTheme.MUTED))
	var nh := HBoxContainer.new()
	nh.add_theme_constant_override("separation", 10)
	nh.add_child(UiTheme.title(String(o.name), 28))
	nh.add_child(UiTheme.chip(String(HSOwners.tier_of(oid).label), UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 13))
	tv.add_child(nh)
	tv.add_child(UiTheme.label(String(o.title), 15, UiTheme.GOLD_BRIGHT))
	var sh := HBoxContainer.new()
	sh.add_theme_constant_override("separation", 8)
	sh.add_child(UiScreen.owner_sign_chip(o, 14))
	var subs := HSOwners.sub_labels(o)
	if subs.size():
		sh.add_child(UiTheme.label("ほかに %s" % "・".join(subs), 12, UiTheme.MUTED))
	tv.add_child(sh)
	if o.get("unlock") and o.unlock.get("text"):
		tv.add_child(UiTheme.label("依頼が始まる条件：%s" % o.unlock.text, 12, UiTheme.FAINT))
	var note := UiTheme.label(String(o.get("note", "")), 13, UiTheme.MUTED)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.custom_minimum_size.x = 100
	tv.add_child(note)
	var intro := UiTheme.label("「%s」" % HSOwners.fill_(String(o.get("intro", "")), {}), 15)
	intro.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	intro.custom_minimum_size.x = 100
	tv.add_child(intro)
	tv.add_child(_gauge(oid, 380))
	# 間柄の段とご褒美
	pv.add_child(UiScreen.section("間柄とご褒美"))
	for t in HSOwners.TIERS.size():
		var rw = null
		for r in REWARDS:
			if r.tier == t: rw = r
		var reached: bool = st.tier >= t
		var txt := ""
		if rw:
			var g = st.got.get(rw.key)
			txt = ("⏳ %s（引退を待つ）" % rw.label) if g and g.get("pending") else (("✓ " if g else "🎁 ") + String(rw.label))
		pv.add_child(_ladder(String(HSOwners.TIERS[t].label), TIER_JOB[t], txt, reached))
	var gb = st.got.get("bond")
	pv.add_child(_ladder("好感度いっぱい", "思い出の名馬 %s" % o.get("memory", ""), ("✓ " if gb and not gb.get("pending") else "🎁 ") + "思い出の名馬", gb != null))
	if gb and gb.get("pending"):
		var bc := UiScreen.button("思い出の名馬を受け取る", true, 300, 48, 18)
		bc.focus_mode = Control.FOCUS_NONE
		bc.pressed.connect(func():
			var err = HSOwners.claim(oid)
			if err: toast(String(err), "bad"); return
			UiFlow.save()
			var q = HSOwners.state().queue.pop_back()
			owner_scene(q, func(): _preview(sel)))
		pv.add_child(bc)
	# 勝負服を着せる
	var mine := HSWorld.mine("stable") + HSWorld.mine("farm")
	if HSOwners.can_wear(oid) and mine.size():
		pv.add_child(UiScreen.section("勝負服を着せる", "決定で切り替え"))
		var wear: Dictionary = HSOwners.state().wear
		for h in mine.slice(0, 5):
			var on: bool = wear.get(h.id) == oid
			var bw := UiScreen.button("%s：%s" % [h.name, "%sさんの勝負服" % o.name if on else "自分の勝負服"], false, 0, 36, 14)
			bw.focus_mode = Control.FOCUS_NONE
			var hid: String = h.id
			bw.pressed.connect(func():
				var err = HSOwners.wear(hid, null if on else oid)
				if err: toast(String(err), "bad"); return
				UiFlow.save()
				_preview(sel))
			pv.add_child(bw)

# まだ縁の無い馬主の右の見本：伏せた顔・看板の特徴・条件のヒント
func _preview_locked(o: Dictionary, top: HBoxContainer) -> void:
	top.add_child(UiScreen.owner_q_face(200, 250))
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
	var nl := UiTheme.label("自分が乗ったレースで条件を満たすと、この馬主から声がかかる。縁ができると、次の週から騎乗依頼が来る。", 13, UiTheme.MUTED)
	nl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	nl.custom_minimum_size.x = 100
	tv.add_child(nl)
	pv.add_child(UiScreen.section("間柄とご褒美"))
	for t in HSOwners.TIERS.size():
		pv.add_child(_ladder(String(HSOwners.TIERS[t].label), TIER_JOB[t], "", false))

func _ladder(name: String, job: String, reward: String, on: bool) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := UiTheme.box(UiTheme.SURFACE, UiTheme.LINE, 1, 10, Vector4(12, 5, 12, 5))
	if on:
		sb.border_width_left = 3
		sb.border_color = UiTheme.GOLD
	p.add_theme_stylebox_override("panel", sb)
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 12)
	p.add_child(hb)
	var n := UiTheme.label(name, 15, UiTheme.GOLD_BRIGHT if on else UiTheme.FAINT)
	n.custom_minimum_size.x = 130
	hb.add_child(n)
	var j := UiTheme.label(job, 13, UiTheme.IVORY if on else UiTheme.FAINT)
	j.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	j.clip_text = true
	hb.add_child(j)
	hb.add_child(UiTheme.label(reward, 13, UiTheme.GOLD_BRIGHT if reward.begins_with("✓") else UiTheme.MUTED))
	return p

func focus_first() -> void:
	if rows.size():
		rows[clampi(sel, 0, rows.size() - 1)].grab_focus()
