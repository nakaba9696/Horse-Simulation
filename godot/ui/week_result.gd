# 週の結果（週を締めたあと）：自分が乗ったレースの着順を大きく、1着賞金と進上金（騎手の取り分 5%）、資金の増減、
# 自分の馬のほかのレース・今週の G1 の勝ち馬・今週のニュース。主な操作は「次の週へ」（金）→ ホーム
# 中身は UiFlow.report（HSWorld.finish_week の戻り値）を読むだけ
extends UiScreen

var b_next: Button

func hint() -> String:
	return "決定でホームへ（次の週）"

func keys() -> Array:
	return [["Enter", "A", "次の週へ"]]

func demo_week() -> bool: return true

func on_back() -> void:
	_next()

func _next() -> void:
	UiFlow.after_result()
	go("home")

func build() -> void:
	backdrop("bg_result", 0.74)
	var rep = UiFlow.report
	var G = HSWorld.G
	var y0 := float(HSU.or_(G.get("startYear"), G.year))
	var title_date := "%d年目 %s" % [int(float(rep.y) - y0) + 1, HSWorld.week_label(rep.m, rep.w)] if rep else UiFlow.date_label()
	var diff := float(G.player.money) - UiFlow.money0
	make_band("結", "週の結果", title_date, [["増減", ("+" if diff >= 0 else "－") + HSU.money(absf(diff)), "money" if diff >= 0 else "warn"], ["資金", UiFlow.money_label(), "money"]])
	var main := VBoxContainer.new()
	main.position = Vector2(PAD_X, TOP + 4)
	main.custom_minimum_size = Vector2(980, 0)
	main.add_theme_constant_override("separation", 10)
	add_child(main)
	var side := VBoxContainer.new()
	side.position = Vector2(PAD_X + 980 + 24, TOP + 4)
	side.custom_minimum_size = Vector2(1600 - PAD_X * 2 - 980 - 24, 0)
	side.add_theme_constant_override("separation", 8)
	add_child(side)
	var mine_rides: Array = []
	var mine_other: Array = []
	var g1: Array = []
	if rep:
		for r in rep.races:
			if r.get("ride"): mine_rides.append(r)
			elif r.get("hasMine"): mine_other.append(r)
			if r.race.get("grade") == "G1" and r.race.get("graded") and not r.get("ride"): g1.append(r)
	main.add_child(UiScreen.section("騎乗したレース", "%d鞍" % mine_rides.size()))
	if mine_rides.is_empty():
		var p := PanelContainer.new()
		p.add_theme_stylebox_override("panel", UiTheme.panel(0.84))
		p.add_child(UiTheme.label("今週は乗りませんでした", 16, UiTheme.MUTED))
		main.add_child(p)
	for r in mine_rides.slice(0, 3):
		main.add_child(_ride_card(r))
	if mine_rides.size() >= 1:
		main.add_child(_board(mine_rides[0], [10, 10, 5, 3][mini(mine_rides.size(), 3)]))
	if mine_other.size():
		main.add_child(UiScreen.section("自分の馬（ほかの騎手）"))
		for r in mine_other.slice(0, 3):
			main.add_child(_small_card(r, true))
	b_next = UiScreen.button("次の週へ（%s）" % UiFlow.date_label(), true, 520, 68, 24)
	b_next.pressed.connect(_next)
	var bh := HBoxContainer.new()
	bh.add_child(b_next)
	main.add_child(bh)
	# 右：馬主のひと言・ご褒美・今週の G1・ニュース
	if HSOwners.on():
		var st := HSOwners.state()
		if st.react.size():
			side.add_child(UiScreen.section("馬主のひと言"))
			for x in st.react.slice(0, 3):
				side.add_child(_react_card(x))
		for q in st.queue.slice(0, 2):
			side.add_child(_gift_card(q))
	if g1.size():
		side.add_child(UiScreen.section("今週のG1"))
		for r in g1.slice(0, 3):
			side.add_child(_small_card(r, false))
	side.add_child(UiScreen.section("ニュース"))
	var nb := UiScreen.panel_box(false, 4)
	var n := 0
	for nw in UiFlow.week_news():
		var l := UiTheme.label(String(nw.text), 14, UiTheme.GOLD_BRIGHT if nw.get("kind") in ["g1", "good"] else UiTheme.MUTED)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.custom_minimum_size.x = 520
		(nb[1] as VBoxContainer).add_child(l)
		n += 1
		if n >= 6: break
	if n == 0:
		(nb[1] as VBoxContainer).add_child(UiTheme.label("なし", 14, UiTheme.FAINT))
	side.add_child(nb[0])

const MOOD := {"win": "joy", "bigwin": "joy", "good": "smile", "lose": "sad", "decline": "sad"}
const KICK := {"up1": "間柄が「信頼」になった", "up2": "間柄が「主戦」になった", "up3": "間柄が「相棒」になった", "bond": "好感度がいっぱいになった", "gift": "引退した馬を譲ってもらった", "award": "名コンビ賞"}

static func _face(oid: String, mood: String, w: float, h: float) -> Control:
	var o = HSOwners.by(oid)
	var fr := PanelContainer.new()
	fr.add_theme_stylebox_override("panel", UiTheme.box(Color(o.silks.base), Color(o.silks.sub), 2, 10, Vector4(0, 0, 0, 0)))
	fr.clip_children = CanvasItem.CLIP_CHILDREN_AND_DRAW
	fr.custom_minimum_size = Vector2(w, h)
	var p := "res://assets/owners/%s_%s.webp" % [oid, mood]
	if ResourceLoader.exists(p):
		var tr := TextureRect.new()
		tr.texture = load(p)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		tr.custom_minimum_size = Vector2(w, h)
		fr.add_child(tr)
	return fr

# 依頼で乗った馬の馬主のひと言（着順でうれしい・くやしい）
func _react_card(x: Dictionary) -> PanelContainer:
	var o = HSOwners.by(x.oid)
	var st := HSOwners.of(x.oid)
	var set: Array = o.lines.get(x.kind, {}).get("close" if st.tier >= 2 else "near", [])
	var line := HSOwners.fill_(HSOwners.pick_line(set, float(x.line), x.get("tags", [])), {"horse": x.horse, "race": x.race})
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SURFACE, UiTheme.LINE, 1, UiTheme.R_PANEL, Vector4(10, 8, 14, 8)))
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 12)
	p.add_child(hb)
	hb.add_child(_face(x.oid, MOOD.get(x.kind, "base"), 74, 90))
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb.add_child(v)
	var who := HBoxContainer.new()
	who.add_theme_constant_override("separation", 8)
	who.add_child(UiTheme.label(String(o.name), 15))
	who.add_child(UiTheme.chip(String(HSOwners.tier_of(x.oid).label), UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT, 11))
	who.add_child(UiTheme.label("%s・%d着" % [x.horse, int(x.pos)], 13, UiTheme.MUTED))
	v.add_child(who)
	var say := UiTheme.label("「%s」" % line, 14, UiTheme.IVORY)
	say.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	say.custom_minimum_size.x = 100
	say.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_child(say)
	var foot := "騎乗料 %s" % HSU.money(float(x.fee))
	if x.get("up"): foot = "▲ 間柄が深まった・" + foot
	v.add_child(UiTheme.label(foot, 12, UiTheme.GOOD if x.get("up") else UiTheme.FAINT))
	return p

# ご褒美の場面（間柄が深まった・名コンビ賞など）
func _gift_card(q: Dictionary) -> PanelContainer:
	var o = HSOwners.by(q.oid)
	var pb := UiScreen.panel_box(true, 4)
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 12)
	(pb[1] as VBoxContainer).add_child(hb)
	hb.add_child(_face(q.oid, "joy", 96, 120))
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb.add_child(v)
	v.add_child(UiTheme.label(String(KICK.get(q.kind, "")), 13, UiTheme.GOLD_BRIGHT))
	v.add_child(UiTheme.title(String(o.name), 20))
	var lines := HSOwners.scene_lines(q.oid, q.kind, {"horse": q.get("horse", "")})
	if lines.size():
		var l := UiTheme.label("「%s」" % lines[0], 14)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.custom_minimum_size.x = 100
		l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		v.add_child(l)
	if q.get("reward"):
		v.add_child(UiTheme.label("ご褒美：%s" % q.reward, 14, UiTheme.GOLD_BRIGHT))
	return pb[0]

# 自分が乗ったレースの着順（上から n 頭。1鞍なら10頭・2鞍なら最初のレースの5頭）
func _board(r: Dictionary, n := 10) -> PanelContainer:
	var pb := UiScreen.panel_box(false, 3)
	var v: VBoxContainer = pb[1]
	var pops := {}
	for x in r.runners:
		pops[x.horse] = x.get("pop")
	for x in r.sim.results.slice(0, n):
		var mine: bool = x.get("rider") == "P"
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 10)
		var pl := UiTheme.num_label(str(int(x.pos)), 16, UiTheme.GOLD_BRIGHT if int(x.pos) <= 3 else UiTheme.IVORY)
		pl.custom_minimum_size.x = 28
		row.add_child(pl)
		row.add_child(UiTheme.frame_box(int(HSU.or_(x.get("frame"), 1)), int(x.num), 24, 13))
		var nl := UiTheme.label(String(x.horse.name), 15, UiTheme.GOLD_BRIGHT if mine else UiTheme.IVORY)
		nl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(nl)
		var jl := UiTheme.label(String(x.jockey.name) if x.get("jockey") else "", 13, UiTheme.MUTED)
		jl.custom_minimum_size.x = 130
		row.add_child(jl)
		var pp = pops.get(x.horse)
		var po := UiTheme.num_label("%d人気" % int(pp) if pp != null else "", 13, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
		po.custom_minimum_size.x = 60
		row.add_child(po)
		var tm := UiTheme.num_label(HSU.time(float(x.time)) if int(x.pos) == 1 else String(x.margin), 14, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
		tm.custom_minimum_size.x = 80
		row.add_child(tm)
		v.add_child(row)
	return pb[0]

func _me_of(r: Dictionary) -> Variant:
	for x in r.sim.results:
		if x.get("rider") == "P": return x
	return null

func _head(r: Dictionary) -> HBoxContainer:
	var race: Dictionary = r.race
	var hh := HBoxContainer.new()
	hh.add_theme_constant_override("separation", 10)
	hh.add_child(UiTheme.class_chip(UiFlow.class_label(race), race.get("graded") == true, 14))
	hh.add_child(UiTheme.title(HSRaces.label(race), 22))
	hh.add_child(UiTheme.label("%s %s%sm %s" % [race.course, race.surface, HSU.num(race.dist), HSU.or_(race.get("ground"), "")], 14, UiTheme.MUTED))
	return hh

# 自分が乗ったレース：着順を大きく・馬名・人気・勝ちタイムと勝ち馬・賞金と進上金
func _ride_card(r: Dictionary) -> PanelContainer:
	var me = _me_of(r)
	var pos := int(me.pos) if me else 0
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.panel_gold(0.9) if pos == 1 else UiTheme.panel(0.88))
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 20)
	p.add_child(hb)
	var pv := VBoxContainer.new()
	pv.custom_minimum_size.x = 120
	pv.add_theme_constant_override("separation", -10)
	var pl := UiTheme.title("%d" % pos if pos > 0 else "－", 64, UiTheme.GOLD_BRIGHT if pos > 0 and pos <= 3 else UiTheme.IVORY)
	pl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	pv.add_child(pl)
	pv.add_child(UiTheme.label("着" if pos > 0 else "", 16, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	hb.add_child(pv)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb.add_child(v)
	v.add_child(_head(r))
	var w = r.sim.results[0]
	var l2 := HBoxContainer.new()
	l2.add_theme_constant_override("separation", 14)
	if me:
		l2.add_child(UiTheme.label(String(me.horse.name), 20, UiTheme.GOLD_BRIGHT))
		var pop = null
		for x in r.runners:
			if x.horse == me.horse: pop = x.get("pop")
		if pop != null:
			l2.add_child(UiTheme.label("%d番人気" % int(pop), 15, UiTheme.MUTED))
		l2.add_child(UiTheme.label("自分で騎乗" if r.get("ridden") else "おまかせ", 13, UiTheme.FAINT))
	v.add_child(l2)
	var l3 := HBoxContainer.new()
	l3.add_theme_constant_override("separation", 14)
	l3.add_child(UiTheme.label("勝ち %s　%s" % [w.horse.name, HSU.time(float(w.time))], 14, UiTheme.MUTED))
	if me and pos > 1:
		var gp := _gap_to_win(r, me)
		l3.add_child(UiTheme.label("勝ち馬から %s%s" % [gp, "馬身" if gp.substr(0, 1).is_valid_int() else ""], 14, UiTheme.MUTED))
	if r.get("rec"):
		l3.add_child(UiTheme.chip("コースレコード", UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 12))
	v.add_child(l3)
	var pr := HSWorld.race_prize(r.race, float(pos)) if pos > 0 else 0.0
	var mv := VBoxContainer.new()
	mv.custom_minimum_size.x = 200
	mv.add_child(UiTheme.label("進上金", 12, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_RIGHT))
	mv.add_child(UiTheme.num_label(HSU.money(HSMath.round_js(pr * 0.05)) if pr > 0 else "－", 22, UiTheme.GOLD_BRIGHT, HORIZONTAL_ALIGNMENT_RIGHT))
	mv.add_child(UiTheme.label("賞金 %s" % HSU.money(pr) if pr > 0 else "", 12, UiTheme.FAINT, HORIZONTAL_ALIGNMENT_RIGHT))
	hb.add_child(mv)
	return p

func _gap_to_win(r: Dictionary, me: Dictionary) -> String:
	var tot := 0.0
	for x in r.sim.results:
		if int(x.pos) > 1 and int(x.pos) <= int(me.pos): tot += float(HSU.or_(x.get("lengths"), 0.0))
	return HSU.margin(tot)

# 小さな札：レースと勝ち馬（自分の馬なら着順）
func _small_card(r: Dictionary, mine: bool) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SURFACE, UiTheme.LINE, 1, 10, Vector4(14, 8, 14, 8)))
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	p.add_child(v)
	var race: Dictionary = r.race
	var hh := HBoxContainer.new()
	hh.add_theme_constant_override("separation", 8)
	hh.add_child(UiTheme.class_chip(UiFlow.class_label(race), race.get("graded") == true, 12))
	hh.add_child(UiTheme.label(HSRaces.label(race), 16))
	hh.add_child(UiTheme.label("%s %s%sm" % [race.course, race.surface, HSU.num(race.dist)], 13, UiTheme.MUTED))
	v.add_child(hh)
	var w = r.sim.results[0]
	var txt := "1着 %s（%s）" % [w.horse.name, w.jockey.name if w.get("jockey") else ""]
	if mine:
		for x in r.sim.results:
			if x.horse.get("owner") == "P":
				txt = "%d着 %s（%s）" % [int(x.pos), x.horse.name, x.jockey.name if x.get("jockey") else ""]
				break
	v.add_child(UiTheme.label(txt, 14, UiTheme.GOLD_BRIGHT if mine else UiTheme.IVORY))
	return p

func focus_first() -> void:
	if b_next:
		b_next.grab_focus()
	_show_moments.call_deferred()

# 週の見せ場：G1 を自分で勝った・トロフィー・スペシャルホースを破った → 馬主のご褒美の場面（js/ui/jockeyui.js の週の流れと同じ順）
var _moments_done := false
func _show_moments() -> void:
	if _moments_done or shots.size() > 0:
		return
	_moments_done = true
	var q: Array = []
	if UiFlow.report:
		for r in UiFlow.report.races:
			if not r.get("ride"): continue
			var me = _me_of(r)
			if me and int(me.pos) == 1 and r.race.get("graded") and r.race.get("grade") in ["G1", "GF"]:
				q.append(["celebrate", "%sを勝った" % ("グランドフェスティバル" if r.race.get("grade") == "GF" else "G1"), HSRaces.label(r.race), "%s・%s" % [me.horse.name, HSU.time(float(me.time))]])
	for t in UiFlow.week_trophies():
		q.append(["celebrate", "トロフィーを手にした", t.label, "%s%s" % [t.horse, "・ボーナス賞金 %s" % HSU.money(t.bonus) if t.bonus > 0 else ""]])
	var beat := UiFlow.week_beaten()
	if beat.size():
		q.append(["celebrate", "スペシャルホースを破った", "・".join(beat), "馬の店に並ぶようになった"])
	if HSOwners.on():
		for x in HSOwners.state().queue:
			q.append(["owner", x])
	_next_moment(q)

func _next_moment(q: Array) -> void:
	if q.is_empty():
		if b_next: b_next.grab_focus()
		return
	var m: Array = q.pop_front()
	if m[0] == "celebrate":
		celebrate(m[1], m[2], m[3], func(): _next_moment(q))
	else:
		owner_scene(m[1], func(): _next_moment(q))
