# データ（docs/UI.md「データ・記録・メニュー」。js/ui/jockeyui.js の S.jrecord と同じ中身）：帯 → タブ（Q/E・LB/RB）→ 中身
# タブ：わたしの成績・スペシャルホース・トロフィー・リーディング・騎手の表彰・殿堂・コースレコード。年は「n年目」
# 中身は G（HSWorld.G）の記録と HSJockey・HSSpecial・HSTrophy・HSHall を読むだけ
extends UiScreen

const TABS := [["me", "わたしの成績"], ["special", "スペシャルホース"], ["trophy", "トロフィー"], ["lead", "リーディング"], ["awards", "騎手の表彰"], ["hall", "殿堂"], ["course", "コースレコード"], ["replay", "リプレイ"], ["mounts", "乗った馬"], ["hist", "騎乗の記録"], ["gf", "GF"]]

var tab := 0
var lead_y := -1.0
var tab_box: VBoxContainer
var list: VBoxContainer
var scroll: ScrollContainer
var rows: Array[Control] = []

func hint() -> String:
	return ""

func keys() -> Array:
	return [["↑↓", "十字", "見る"], ["Q/E", "LB/RB", "切り替え"], ["Esc", "B", "もどる"]]

func on_back() -> void:
	go("home")

func on_tab(d: int) -> void:
	tab = posmod(tab + d, TABS.size())
	_fill()

func build() -> void:
	backdrop("bg_home", 0.86)
	var j = HSJockey.me()
	var rank = HSJockey.my_rank(HSWorld.G.year)
	make_band("録", "データ", "%sの記録" % j.name, [["通算", "%d勝" % int(j.total.wins)], ["今年の順位", "%d位" % int(rank) if rank != null else "－"], ["暦", UiFlow.date_label()]])
	tab_box = VBoxContainer.new()
	tab_box.position = Vector2(PAD_X, TOP + 4)
	add_child(tab_box)
	scroll = ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	scroll.position = Vector2(PAD_X, TOP + 66)
	scroll.size = Vector2(1600 - PAD_X * 2, 1000 - TOP - 66 - 56)
	add_child(scroll)
	list = VBoxContainer.new()
	list.add_theme_constant_override("separation", 4)
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(list)
	if OS.get_cmdline_user_args().has("--setup=hall_view"):
		UiHorseScreen._setup_hall_view()   # 撮影の見本：殿堂入りした馬が1頭いる
		UiFlow.focus["data_tab"] = "hall"
	var k := TABS.map(func(x): return x[0]).find(String(UiFlow.focus.get("data_tab", "me")))
	tab = maxi(0, k)
	_fill()

func yl(y) -> String:
	var G = HSWorld.G
	return "%d年目" % (int(float(y) - float(HSU.or_(G.get("startYear"), G.year))) + 1)

func _fill() -> void:
	for c in tab_box.get_children(): c.queue_free()
	for c in list.get_children(): c.queue_free()
	rows.clear()
	UiFlow.focus["data_tab"] = TABS[tab][0]
	tab_box.add_child(UiTheme.tabs(TABS.map(func(x): return x[1]), tab, pad, func(k): tab = k; _fill()))
	match TABS[tab][0]:
		"me": _me()
		"special": _special()
		"trophy": _trophy()
		"lead": _lead()
		"awards": _awards()
		"hall": _hall()
		"course": _course()
		"gf": _gf()
		"mounts": _mounts()
		"replay": _replay()
		"hist": _hist()
	if kb_hint: kb_hint.text = _note()
	focus_first()

func _note() -> String:
	match TABS[tab][0]:
		"special": return "自分の馬がグループの条件にリーチをかけると、最後のレースに名馬が出てくる。勝つと馬の店に並ぶ"
		"trophy": return "手にした馬それぞれに付き、ボーナス賞金が入る。引退すると、手にしたトロフィーの数と種類で能力が上がる"
		"hall": return "トロフィーを2つ以上手にした自分の馬は、引退したときに殿堂入りする"
		"lead": return "左右で年を替える"
		"gf": return "行を押すとグランドフェスティバルの画面へ（招待への返事もそこで）"
		"replay": return "自分で乗ったレースを20本まで残す。決定で見直す・X でお気に入り（消さない）"
	return ""

# 表の行（押せる形にして、カーソルで送れるようにする）。cells：[[文字, 幅(0 は伸びる), 色, 寄せ]]
func _row(cells: Array, mine := false, h := 38.0) -> Button:
	var rb := UiScreen.row_button(h, mine)
	var b: Button = rb[0]
	var hb: HBoxContainer = rb[1]
	for c in cells:
		var l := UiTheme.label(String(c[0]), 15, c[2] if c.size() > 2 else UiTheme.IVORY, c[3] if c.size() > 3 else HORIZONTAL_ALIGNMENT_LEFT)
		if c[1] > 0: l.custom_minimum_size.x = c[1]
		else:
			l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			l.clip_text = true
		hb.add_child(l)
	UiScreen.pass_mouse(hb)
	list.add_child(b)
	rows.append(b)
	return b

func _head(cells: Array) -> void:
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 10)
	for c in cells:
		var l := UiTheme.label(String(c[0]), 11, UiTheme.MUTED, c[3] if c.size() > 3 else HORIZONTAL_ALIGNMENT_LEFT)
		if c[1] > 0: l.custom_minimum_size.x = c[1]
		else: l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		hb.add_child(l)
	var m := MarginContainer.new()
	m.add_theme_constant_override("margin_left", 12)
	m.add_theme_constant_override("margin_right", 12)
	m.add_child(hb)
	list.add_child(m)

func _empty(text: String) -> void:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SURFACE, UiTheme.LINE, 1, 10, Vector4(16, 12, 16, 12)))
	p.add_child(UiTheme.label(text, 15, UiTheme.FAINT))
	list.add_child(p)

const R := HORIZONTAL_ALIGNMENT_RIGHT
const C := HORIZONTAL_ALIGNMENT_CENTER

static func _pct(w: float, n: float) -> String:
	return "%.1f%%" % (w / n * 100.0) if n > 0 else "0.0%"

func _me() -> void:
	var j = HSJockey.me()
	var cols := [["年", 0], ["騎乗", 110, UiTheme.MUTED, R], ["1着", 110, UiTheme.MUTED, R], ["2着", 110, UiTheme.MUTED, R], ["3着", 110, UiTheme.MUTED, R], ["勝率", 120, UiTheme.MUTED, R], ["賞金（進上金）", 180, UiTheme.MUTED, R], ["順位", 100, UiTheme.MUTED, R]]
	list.add_child(UiScreen.section("年ごとの成績"))
	_head(cols)
	var ys: Array = j.years.keys()
	ys.sort_custom(func(a, b): return float(a) > float(b))
	for y in ys:
		var r: Dictionary = j.years[y]
		var rk = HSJockey.my_rank(float(y))
		_row([[yl(y), 0], [str(int(r.rides)), 110, UiTheme.IVORY, R], [str(int(r.wins)), 110, UiTheme.GOLD_BRIGHT, R], [str(int(r.w2)), 110, UiTheme.IVORY, R], [str(int(r.w3)), 110, UiTheme.IVORY, R],
			[_pct(r.wins, r.rides), 120, UiTheme.IVORY, R], [HSU.money(float(HSU.or_(r.get("prize"), 0.0))), 180, UiTheme.MUTED, R], ["%d位" % int(rk) if rk != null else "－", 100, UiTheme.IVORY, R]])
	var t: Dictionary = j.total
	_row([["通算", 0, UiTheme.GOLD_BRIGHT], [str(int(t.rides)), 110, UiTheme.IVORY, R], [str(int(t.wins)), 110, UiTheme.GOLD_BRIGHT, R], [str(int(t.w2)), 110, UiTheme.IVORY, R], [str(int(t.w3)), 110, UiTheme.IVORY, R],
		[_pct(t.wins, t.rides), 120, UiTheme.IVORY, R], [HSU.money(float(HSU.or_(t.get("prize"), 0.0))), 180, UiTheme.MUTED, R], ["", 100]], true)
	list.add_child(UiScreen.section("重賞の勝ち鞍", "%d勝" % j.big.size()))
	if j.big.is_empty():
		_empty("まだ重賞を勝っていません")
	var big: Array = j.big.duplicate()
	big.reverse()
	for b in big.slice(0, 40):
		_row([[yl(b.y), 90, UiTheme.MUTED], [String(HSU.or_(b.get("grade"), "")), 50, UiTheme.GOLD_BRIGHT, C], [String(b.race), 0], [String(b.horse), 260, UiTheme.GOLD_BRIGHT]])

func _special() -> void:
	var G = HSWorld.G
	var un: Array = HSU.or_(G.get("unlocked"), [])
	var reach := {}
	for h in HSWorld.mine("stable") + HSWorld.mine("farm"):
		for r in HSSpecial.reach_info(h):
			if not reach.has(r.group.id): reach[r.group.id] = []
			reach[r.group.id].append("%s（%s）" % [h.name, r.need])
	list.add_child(UiScreen.section("条件のグループ", "店に並んだ馬 %d / %d" % [un.size(), HSSpecial.list().size()]))
	# リーチのかかったグループを先に、あとは並びのまま。G1 ごとのグループは後ろにまとめる
	var gs: Array = HSSpecial.groups().filter(func(g): return HSSpecial.members(g).size() > 0)
	gs = HSU.stable_sort(gs, func(a, b): return (1 if reach.has(a.id) else 0) > (1 if reach.has(b.id) else 0))
	for g in gs:
		var ms: Array = HSSpecial.members(g)
		var got := ms.filter(func(d): return un.has(d.name)).size()
		var names := ms.slice(0, 8).map(func(d): return ("★" if un.has(d.name) else "") + String(d.name))
		var b := _row([[String(g.label), 260, UiTheme.GOLD_BRIGHT if reach.has(g.id) else UiTheme.IVORY], ["・".join(names) + ("…" if ms.size() > 8 else ""), 0, UiTheme.MUTED], ["%d / %d頭" % [got, ms.size()], 110, UiTheme.IVORY, R]], reach.has(g.id), 40)
		if reach.has(g.id):
			var hb := b.get_child(0) as HBoxContainer
			var rl := UiTheme.label("リーチ：" + "・".join(reach[g.id]), 13, UiTheme.WARN)
			rl.custom_minimum_size.x = 300
			rl.clip_text = true
			rl.mouse_filter = Control.MOUSE_FILTER_IGNORE
			hb.add_child(rl)
			hb.move_child(rl, 1)

func _trophy() -> void:
	var n := HSTrophy.list().filter(func(t): return HSTrophy.holders(t.id).size() > 0).size()
	list.add_child(UiScreen.section("トロフィー", "%d / %d" % [n, HSTrophy.list().size()]))
	for c in HSTrophy.CATS:
		var ts: Array = HSTrophy.list().filter(func(t): return t.cat == c.id)
		if not ts.size(): continue
		list.add_child(UiScreen.section(String(c.label), "%d" % ts.size()))
		for t in ts:
			var hs := HSTrophy.holders(t.id)
			var got := hs.size() > 0
			var who := "まだ"
			if got: who = "・".join(hs.map(func(x): return "%s %s" % [yl(x.y), x.horse]))
			_row([["🏆" if got else "🔒", 40, UiTheme.GOLD_BRIGHT, C], [String(t.label), 240, UiTheme.GOLD_BRIGHT if got else UiTheme.IVORY], [HSTrophy.note_of(t), 0, UiTheme.MUTED],
				[who, 300, UiTheme.IVORY if got else UiTheme.FAINT, R]], got, 44)

func _lead() -> void:
	var G = HSWorld.G
	var years: Array = HSU.or_(G.records.get("jockeys"), {}).keys().map(func(y): return float(y))
	years.sort_custom(func(a, b): return a > b)
	if lead_y < 0: lead_y = years[0] if years.size() else float(G.year)
	var yi := years.find(lead_y)
	list.add_child(UiScreen.section("リーディング　%s" % yl(lead_y), "←→ で年（%d年分）" % years.size()))
	var l := HSJockey.leading(lead_y)
	if l.is_empty():
		_empty("まだレースがありません")
		return
	_head([["順位", 70, UiTheme.MUTED, R], ["騎手", 0], ["1着", 100, UiTheme.MUTED, R], ["2着", 100, UiTheme.MUTED, R], ["3着", 100, UiTheme.MUTED, R], ["騎乗", 100, UiTheme.MUTED, R], ["勝率", 110, UiTheme.MUTED, R]])
	var top := l.slice(0, 30)
	var me_i := -1
	for i in l.size():
		if l[i].me: me_i = i
	if me_i >= 30: top.append(l[me_i])
	for x in top:
		var i := l.find(x)
		var b := _row([[str(i + 1), 70, UiTheme.GOLD_BRIGHT if i < 3 else UiTheme.IVORY, R], [String(x.name) + ("（あなた）" if x.me else ""), 0, UiTheme.GOLD_BRIGHT if x.me else UiTheme.IVORY],
			[str(int(x.wins)), 100, UiTheme.IVORY, R], [str(int(x.w2)), 100, UiTheme.IVORY, R], [str(int(x.w3)), 100, UiTheme.IVORY, R], [str(int(x.rides)), 100, UiTheme.MUTED, R], [_pct(x.wins, x.rides), 110, UiTheme.MUTED, R]], x.me)
		b.gui_input.connect(func(ev): _lead_key(ev, years, yi))

func _lead_key(ev: InputEvent, years: Array, yi: int) -> void:
	var d := 0
	if ev.is_action_pressed("ui_left"): d = 1
	elif ev.is_action_pressed("ui_right"): d = -1
	if d != 0 and yi + d >= 0 and yi + d < years.size():
		lead_y = years[yi + d]
		accept_event()
		_fill()

func _awards() -> void:
	var aw: Dictionary = HSU.or_(HSWorld.G.records.get("jawards"), {})
	var me_name: String = HSJockey.me().name
	if aw.is_empty():
		_empty("年が明けると、前の年の騎手の表彰が発表されます")
		return
	var ys: Array = aw.keys()
	ys.sort_custom(func(a, b): return float(a) > float(b))
	for y in ys:
		list.add_child(UiScreen.section(yl(y)))
		for k in aw[y]:
			var v := String(aw[y][k])
			_row([[String(k), 260, UiTheme.MUTED], [("★ %s（あなた）" % v) if v == me_name else v, 0, UiTheme.GOLD_BRIGHT if v == me_name else UiTheme.IVORY]], v == me_name)

func _hall() -> void:
	var own := HSHall.list()
	list.add_child(UiScreen.section("殿堂（お手馬）", "%d頭" % own.size()))
	if own.is_empty():
		_empty("まだいません。トロフィーを%dつ以上手にした馬は、引退させるときに殿堂入りさせられます" % HSHall.NEED)
	for x in own:
		var tl: Array = x.trophies.map(func(t): return String(t.label) if t is Dictionary else String(t))
		var b := _row([[String(x.name), 260, UiTheme.GOLD_BRIGHT], ["・".join(tl), 0, UiTheme.IVORY], ["%d戦%d勝・G1 %d勝" % [int(HSU.or_(x.get("starts"), 0.0)), int(HSU.or_(x.get("wins"), 0.0)), int(HSU.or_(x.get("g1"), 0.0))], 220, UiTheme.MUTED, R],
			["%s引退" % yl(x.retiredY), 120, UiTheme.MUTED, R]], true, 44)
		var hid := String(x.id)
		# 行を押すと、その馬の戦績と1走ごとの記録（馬の画面を殿堂の写しで開く）
		b.pressed.connect(func():
			UiFlow.hall_id = hid
			go("horse"))
	var hall: Array = HSU.or_(HSWorld.G.records.get("hall"), [])
	list.add_child(UiScreen.section("冠を手にした馬", "%d頭" % hall.size()))
	if hall.is_empty():
		_empty("まだ冠を手にした馬はいません")
	for x in hall:
		_row([[String(x.name), 260, UiTheme.GOLD_BRIGHT], ["・".join(HSU.or_(x.get("titles"), [])), 0], ["%s に冠" % yl(x.since), 140, UiTheme.MUTED, R]])

func _course() -> void:
	var rec: Dictionary = HSU.or_(HSWorld.G.records.get("course"), {})
	list.add_child(UiScreen.section("コースレコード", "%d" % rec.size()))
	if rec.is_empty():
		_empty("まだ記録がありません")
		return
	var keys := rec.keys()
	keys.sort()
	_head([["コース", 260], ["タイム", 110, UiTheme.MUTED, R], ["馬", 0], ["騎手", 180], ["レース", 260], ["年", 100, UiTheme.MUTED, R]])
	for k in keys:
		var r: Dictionary = rec[k]
		var p := String(k).split("|")
		var mine: bool = r.get("rode") == true or r.get("mine") == true
		_row([["%s %s%sm" % [p[0], "ダート" if p[1] == "ダ" else "芝", p[2]], 260], [HSU.time(float(r.t)), 110, UiTheme.GOLD_BRIGHT, R], [String(r.name), 0, UiTheme.GOLD_BRIGHT if mine else UiTheme.IVORY],
			[String(HSU.or_(r.get("jockey"), "")), 180, UiTheme.MUTED], [String(HSU.or_(r.get("race"), "")), 260, UiTheme.MUTED], [yl(r.year), 100, UiTheme.MUTED, R]], mine)

# リプレイ（自分で乗ったレース。新しい順）
func _replay() -> void:
	var items := UiFlow.replay_list()
	list.add_child(UiScreen.section("リプレイ", "%d本" % items.size()))
	if items.is_empty():
		_empty("まだありません。自分で乗ったレースが残ります")
		return
	for x in items:
		var pos := int(x.get("pos", 0))
		var b := _row([["★" if x.get("fav") else "", 30, UiTheme.GOLD_BRIGHT, C], [String(x.date), 170, UiTheme.MUTED], [String(x.get("grade", "")), 50, UiTheme.GOLD_BRIGHT, C], [String(x.race), 0],
			[String(x.course), 200, UiTheme.MUTED], [String(x.horse), 240], ["%d着" % pos if pos > 0 else "", 80, UiTheme.GOLD_BRIGHT if pos > 0 and pos <= 3 else UiTheme.IVORY, R]], pos == 1, 40)
		var id := String(x.id)
		b.pressed.connect(func():
			UiFlow.replay_path = UiFlow.replay_dir.path_join(id + ".json")
			UiFlow.replay_back = "data"
			go("race"))
		b.gui_input.connect(func(ev):
			if (ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_X) or (ev is InputEventJoypadButton and ev.pressed and ev.button_index == JOY_BUTTON_X):
				var on := UiFlow.replay_fav(id)
				toast("お気に入りに%s" % ("入れた" if on else "しない"), "good")
				accept_event()
				_fill())

# これまでに乗った馬（勝ち数・最高の着順・騎乗数の順）
func _mounts() -> void:
	var ms: Dictionary = HSU.or_(HSJockey.me().get("mounts"), {})
	list.add_child(UiScreen.section("乗った馬", "%d頭" % ms.size()))
	if ms.is_empty():
		_empty("まだ乗っていません")
		return
	var names := ms.keys()
	names = HSU.stable_sort(names, func(a, b):
		var x: Dictionary = ms[a]
		var y: Dictionary = ms[b]
		if x.wins != y.wins: return x.wins > y.wins
		if x.best != y.best: return x.best < y.best
		return x.rides > y.rides)
	_head([["馬", 0], ["騎乗", 110, UiTheme.MUTED, R], ["1着", 110, UiTheme.MUTED, R], ["最高", 110, UiTheme.MUTED, R]])
	for n in names.slice(0, 60):
		var m: Dictionary = ms[n]
		_row([[String(n), 0, UiTheme.GOLD_BRIGHT if m.best <= 3 else UiTheme.IVORY], [str(int(m.rides)), 110, UiTheme.IVORY, R], [str(int(m.wins)), 110, UiTheme.IVORY, R], ["%d着" % int(m.best), 110, UiTheme.MUTED, R]])

# 騎乗の記録（新しい順）
func _hist() -> void:
	var hs: Array = HSJockey.me().history
	list.add_child(UiScreen.section("騎乗の記録", "%d鞍" % hs.size()))
	if hs.is_empty():
		_empty("まだ騎乗していません")
		return
	_head([["日付", 170], ["格", 60, UiTheme.MUTED, C], ["レース", 0], ["馬", 260], ["人気", 90, UiTheme.MUTED, R], ["着順", 90, UiTheme.MUTED, R]])
	for r in hs.slice(0, 80):
		var p := int(r.pos)
		_row([["%s %s" % [yl(r.y), HSWorld.week_label(r.m, r.w)], 170, UiTheme.MUTED], [String(HSU.or_(r.get("grade"), "")), 60, UiTheme.GOLD_BRIGHT, C], [String(r.race), 0], [String(r.horse), 260],
			[str(int(HSU.or_(r.get("pop"), 0))), 90, UiTheme.MUTED, R], ["%d着" % p, 90, UiTheme.GOLD_BRIGHT if p <= 3 else UiTheme.IVORY, R]], p == 1)

# グランドフェスティバル：区分ごとに、いまの1位と自分の馬のいちばん上の順位
func _gf() -> void:
	list.add_child(UiScreen.section(HSSeason.DC_NAME, "上位%d頭が出られる" % HSSeason.DC_FIELD))
	for id in HSSeason.gf_order():
		var C: Dictionary = HSSeason.gf_by()[id]
		var st := HSSeason.dc_standing(id, HSWorld.G.year)
		var top := String(st[0].h.name) if st.size() else "－"
		var mine := "－"
		for x in st:
			if x.h.get("owner") == "P":
				mine = "%s %d位" % [x.h.name, int(x.rank)]
				break
		var b := _row([[String(C.label), 140, UiTheme.GOLD_BRIGHT], ["%s %s%sm" % [C.course, C.surface, HSU.num(C.dist)], 260, UiTheme.MUTED], ["伝説の名馬 %s" % ("・".join(HSSeason.gf_legends(id).map(func(d): return d.name)) if HSSeason.gf_legends(id).size() else "－"), 260, UiTheme.MUTED], ["1位 %s" % top, 0], ["自分の馬：%s" % mine, 360, UiTheme.GOLD_BRIGHT if mine != "－" else UiTheme.FAINT]], mine != "－", 42)
		b.pressed.connect(func(): go("gf"))

func focus_first() -> void:
	if rows.size():
		rows[0].grab_focus.call_deferred()
