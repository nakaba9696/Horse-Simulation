# お手馬の詳しい画面（docs/UI.md「馬の画面」・持ち主の仕様書 2026-10-19「お手馬画面」「ゲームメニュー画面」）
# 左 420px：3D の馬・名前・疲労と次走・「番組表（出走登録）」（金）・引退。右：タブ（Q/E・LB/RB）
#   能力：総合力（いま・完成）・能力（いま・完成）・距離・脚質・成長・特殊能力・トロフィーと冠・重賞の勝ち鞍
#   戦績：1走 1行（新しい順。着順・人気・タイム・着差・上がり・レーティング）。行を押すとそのレースの詳しい記録
#     （出走馬・枠・着順・タイム・着差・人気・騎手・ラップ・勝ち時計。HSRaceRec の記録から。リプレイが残っていれば「リプレイを見る」も。記録の無い前のセーブの1走は「記録なし」）
#   レーティング：総合と部門（短距離・マイル・中距離・長距離・ダート）。式は HSRating（godot/core/hs_rating.gd）
#   血統・名鑑：2代の血統表と、史実馬の名鑑
# 厩舎（stable）から UiFlow.program_id の馬で開く。もどると厩舎の同じ行へ
# 殿堂（データの殿堂タブ）から UiFlow.hall_id で開くと、殿堂の写し（HSHall.open。1走ごとの記録は別ファイルから読む）を読むだけの画面（戦績・殿堂の記録・レーティング・血統）。もどるとデータへ
class_name UiHorseScreen
extends UiScreen

const TABS := [["stat", "能力"], ["rec", "戦績"], ["rating", "レーティング"], ["ped", "血統・名鑑"]]
const HALL_TABS := [["rec", "戦績"], ["hall", "殿堂の記録"], ["rating", "レーティング"], ["ped", "血統・名鑑"]]
const LEFT_W := 420.0

var tabs_: Array = TABS
var hall_mode := false

var tab := 0
var h: Dictionary = {}
var tab_box: VBoxContainer
var scroll: ScrollContainer
var list: VBoxContainer
var rows: Array[Button] = []
var results: Array = []      # 戦績（新しい順）
var sel := 0
var b_prog: Button
var portrait: UiHorsePortrait

func hint() -> String:
	match tabs_[tab][0]:
		"rec": return "行を選ぶと、そのレースの詳しい記録"
		"rating": return "1走の値＝負かした相手のレーティング＋着差。馬の値＝良かった3走の平均"
	if hall_mode: return "殿堂入りした馬の記録（読むだけ）"
	return "お手馬の中身。番組表で次走を決める"

func keys() -> Array:
	if hall_mode: return [["↑↓←→", "十字", "選ぶ"], ["Enter", "A", "決定"], ["Q/E", "LB/RB", "切り替え"], ["Esc", "B", "もどる"]]
	return [["↑↓←→", "十字", "選ぶ"], ["Enter", "A", "決定"], ["Q/E", "LB/RB", "切り替え"], ["Y", "Y", "番組表"], ["Esc", "B", "もどる"]]

func on_back() -> void:
	if hall_mode:
		UiFlow.hall_id = ""
		go("data")
		return
	go("stable")

# 撮影の見本（--setup=ridden）：決まった種で週を進め、最後の週は自分で乗ってから開く（戦績の行からリプレイの記録を出せるように）
func demo_week() -> bool:
	return OS.get_cmdline_user_args().has("--setup=ridden")

func on_tab(d: int) -> void:
	if _modal != null: return
	tab = posmod(tab + d, tabs_.size())
	sel = 0
	_fill()
	refresh_keybar()
	focus_first()

func build() -> void:
	backdrop("bg_home", 0.86)
	var args := OS.get_cmdline_user_args()
	if args.has("--setup=ridden"):
		# 撮影の見本：リプレイの残っている1走がある馬（無ければ戦績のいちばん多い馬）
		var best = null
		for x in HSWorld.mine():
			var n: int = HSU.or_(x.get("results"), []).size()
			var has := false
			for r in HSU.or_(x.get("results"), []):
				if find_replay(String(x.name), r) != "": has = true
			var sc := n + (1000 if has else 0)
			if best == null or sc > best[0]: best = [sc, x]
		if best: UiFlow.program_id = String(best[1].id)
	if args.has("--setup=hall_view"): _setup_hall_view()
	if UiFlow.hall_id != "" and HSHall.by_id(UiFlow.hall_id) != null:
		_build_hall(args)
		return
	UiFlow.hall_id = ""
	var hh = HSWorld.horse(UiFlow.program_id)
	if hh == null:
		var ms := HSWorld.mine("stable") + HSWorld.mine("farm")
		if ms.size(): hh = ms[0]
	if hh == null:
		make_band("馬", "お手馬", "", [])
		add_child(UiTheme.label("お手馬がいません", 16, UiTheme.MUTED))
		return
	h = hh
	UiFlow.program_id = String(h.id)
	var G = HSWorld.G
	var rt = HSRating.of(h)
	make_band("馬", HSText.horse_name(h), HSText.t("%s・%s%s") % [HSText.sex_age(h, int(G.year - float(h.born))), HSText.t(String(HSU.or_(h.get("coat"), ""))), HSText.t("・史実" if h.get("hist") else ("・オリジナル" if h.get("original") else ""))],
		[["戦績", record_text(h)], ["レーティング", "%d" % int(rt.v) if rt != null else "－"], ["資金", UiFlow.money_label(), "money"]])
	_build_left()
	tab_box = VBoxContainer.new()
	tab_box.position = Vector2(PAD_X + LEFT_W + 20, TOP + 4)
	tab_box.custom_minimum_size = Vector2(1600 - PAD_X * 2 - LEFT_W - 20, 0)
	add_child(tab_box)
	# 中身は板の上に（写真の地の上に字を直に置かない）
	var pbr := UiScreen.panel_box(false, 0)
	var rp: PanelContainer = pbr[0]
	rp.position = Vector2(PAD_X + LEFT_W + 20, TOP + 66)
	rp.custom_minimum_size = Vector2(1600 - PAD_X * 2 - LEFT_W - 20, 1000 - TOP - 66 - 60)
	rp.size = rp.custom_minimum_size
	add_child(rp)
	scroll = ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	(pbr[1] as VBoxContainer).add_child(scroll)
	list = VBoxContainer.new()
	list.add_theme_constant_override("separation", 6)
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(list)
	var want := String(UiFlow.focus.get("horse_tab", "stat"))
	for a in args:
		if a.begins_with("--tab="): want = a.substr(6)   # 撮影：開くタブ
	var k := tabs_.map(func(x): return x[0]).find(want)
	tab = maxi(0, k)
	sel = int(UiFlow.focus.get("horse_row", 0)) if tabs_[tab][0] == "rec" else 0
	_fill()
	_setup_shots(args)

# 撮影：1走の記録（記録の残っているいちばん新しい1走。--setup=race_detail_old は記録の無い1走）・引退の確かめ（殿堂入りする馬）
func _setup_shots(args: PackedStringArray) -> void:
	if args.has("--setup=race_detail"):
		for r in results:
			if HSRaceRec.has(r):
				race_detail(r)
				break
	elif args.has("--setup=race_detail_old"):
		if results.size():
			var r: Dictionary = results[0].duplicate()
			r.erase("rec")
			race_detail(r)
	elif args.has("--setup=retire") and not hall_mode:
		_give_trophy(h)
		retire_flow(String(h.id), func(_r): pass)

# 撮影の見本：その馬にトロフィーを1つ持たせる（殿堂入りの条件）
static func _give_trophy(x: Dictionary) -> void:
	var G = HSWorld.G
	if not G.get("trophies"): G.trophies = {}
	var id := String(HSTrophy.list()[0].id)
	G.trophies[id] = { hid = x.id, horse = x.name, y = G.year, bonus = 0.0 }

# 撮影の見本：戦績のいちばん多いお手馬にトロフィーを持たせ、殿堂入りさせて引退させ、殿堂から開く
static func _setup_hall_view() -> void:
	var best = null
	for x in HSWorld.mine():
		if x.get("loc") == "retired": continue
		if best == null or HSU.or_(x.get("results"), []).size() > HSU.or_(best.get("results"), []).size(): best = x
	if best == null: return
	_give_trophy(best)
	var id := String(best.id)
	HSJockey.retire(id)
	UiFlow.hall_id = id

# 殿堂の写しを読むだけの画面（殿堂入りした馬。引退したあとも戦績と1走ごとの記録を見られる）
func _build_hall(args: PackedStringArray) -> void:
	hall_mode = true
	tabs_ = HALL_TABS
	h = HSHall.open(UiFlow.hall_id)   # 1走ごとの記録は別ファイルから（読めなければ記録なし）
	var rt = HSRating.of(h)
	make_band("殿", HSText.horse_name(h), HSText.t("%s・%s・殿堂入り（%s引退）") % [HSText.t(String(h.sex)), HSText.t(String(HSU.or_(h.get("coat"), ""))), _yl(h.retiredY)],
		[["戦績", record_text(h)], ["トロフィー", "%d" % (h.trophies as Array).size()], ["レーティング", "%d" % int(rt.v) if rt != null else "－"]])
	var pb := UiScreen.panel_box(true, 8)
	var p: PanelContainer = pb[0]
	p.position = Vector2(PAD_X, TOP + 4)
	p.custom_minimum_size = Vector2(LEFT_W, 1000 - TOP - 4 - 60)
	add_child(p)
	var v: VBoxContainer = pb[1]
	portrait = UiHorsePortrait.new()
	portrait.custom_minimum_size = Vector2(0, 270)
	v.add_child(portrait)
	portrait.set_horse(String(h.name), String(HSU.or_(h.get("coat"), "鹿毛")), float(h.retiredY) - float(h.born))
	v.add_child(UiTheme.chip("殿堂入り", UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 15))
	var fh = h.get("fhShow", h.get("fh"))
	if fh is Dictionary:
		var fr := HBoxContainer.new()
		fr.add_theme_constant_override("separation", 8)
		fr.add_child(UiTheme.label("総合力 完成", 14, UiTheme.MUTED))
		fr.add_child(UiScreen.spacer())
		fr.add_child(UiTheme.label("芝", 13, UiTheme.MUTED))
		fr.add_child(UiTheme.stat_chip(float(fh.turf), "fh", true))
		fr.add_child(UiTheme.label("ダ", 13, UiTheme.MUTED))
		fr.add_child(UiTheme.stat_chip(float(fh.dirt), "fh", true))
		v.add_child(fr)
	v.add_child(_kv("戦績", HSText.t("%s（%d-%d）") % [record_text(h), int(HSU.or_(h.get("w2"), 0.0)), int(HSU.or_(h.get("w3"), 0.0))]))
	v.add_child(_kv("G1", HSText.t("%d勝") % int(HSU.or_(h.get("g1"), 0.0))))
	v.add_child(_kv("獲得賞金", HSText.money(float(HSU.or_(h.get("prize"), 0.0)))))
	v.add_child(_kv("走った年", "%s〜%s" % [_yl(h.first), _yl(h.retiredY)]))
	v.add_child(_kv("父・母", HSText.t("%s・%s") % [HSText.horse_name(String(HSU.or_(h.get("sire"), "－"))), HSText.horse_name(String(HSU.or_(h.get("dam"), "－")))]))
	tab_box = VBoxContainer.new()
	tab_box.position = Vector2(PAD_X + LEFT_W + 20, TOP + 4)
	tab_box.custom_minimum_size = Vector2(1600 - PAD_X * 2 - LEFT_W - 20, 0)
	add_child(tab_box)
	var pbr := UiScreen.panel_box(false, 0)
	var rp: PanelContainer = pbr[0]
	rp.position = Vector2(PAD_X + LEFT_W + 20, TOP + 66)
	rp.custom_minimum_size = Vector2(1600 - PAD_X * 2 - LEFT_W - 20, 1000 - TOP - 66 - 60)
	rp.size = rp.custom_minimum_size
	add_child(rp)
	scroll = ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	(pbr[1] as VBoxContainer).add_child(scroll)
	list = VBoxContainer.new()
	list.add_theme_constant_override("separation", 6)
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(list)
	var want := "rec"
	for a in args:
		if a.begins_with("--tab="): want = a.substr(6)
	tab = maxi(0, tabs_.map(func(x): return x[0]).find(want))
	sel = 0
	_fill()
	_setup_shots(args)

# ---- 殿堂の記録（トロフィー・冠・特殊能力・重賞の勝ち鞍） ----
func _hall_info() -> void:
	var tro: Array = HSU.or_(h.get("trophies"), [])
	var tit: Array = HSU.or_(h.get("titles"), [])
	list.add_child(UiScreen.section("トロフィー・冠", HSText.t("%d個") % (tro.size() + tit.size())))
	var tl := HFlowContainer.new()
	tl.add_theme_constant_override("h_separation", 6)
	tl.add_theme_constant_override("v_separation", 6)
	for x in tro: tl.add_child(UiTheme.chip("🏆 %s　%s" % [HSText.tx(String(x.label) if x is Dictionary else String(x)), _yl(x.y) if x is Dictionary else ""], UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 13))
	for x in tit: tl.add_child(UiTheme.chip(HSText.t("冠 %s") % HSText.tx(String(x)), UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT, 13))
	list.add_child(tl)
	var sk: Array = HSU.or_(h.get("skills"), [])
	if sk.size():
		list.add_child(UiScreen.section("特殊能力"))
		var fl := HFlowContainer.new()
		fl.add_theme_constant_override("h_separation", 6)
		for id in sk: fl.add_child(UiTheme.chip(HSText.skill_label(String(id)), UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT if HSSkills.is_unique(id) else UiTheme.IVORY, 13))
		list.add_child(fl)
	var gw: Array = HSU.or_(h.get("gradedWins"), [])
	list.add_child(UiScreen.section("重賞の勝ち鞍", HSText.t("%d勝") % gw.size()))
	if gw.is_empty(): list.add_child(UiTheme.label("なし", 14, UiTheme.FAINT))
	var gl := HFlowContainer.new()
	gl.add_theme_constant_override("h_separation", 10)
	gl.add_theme_constant_override("v_separation", 6)
	for g in gw:
		var hb := HBoxContainer.new()
		hb.add_theme_constant_override("separation", 4)
		hb.add_child(UiTheme.grade_chip(String(HSU.or_(g.get("grade"), "")), 12))
		hb.add_child(UiTheme.label("%s %s" % [_yl(g.y), HSText.race_name(String(HSU.or_(g.get("short"), g.race)))], 13))
		gl.add_child(hb)
	list.add_child(gl)

func _build_left() -> void:
	var G = HSWorld.G
	var wi := HSWorld.w_idx()
	var pb := UiScreen.panel_box(true, 8)
	var p: PanelContainer = pb[0]
	p.position = Vector2(PAD_X, TOP + 4)
	p.custom_minimum_size = Vector2(LEFT_W, 1000 - TOP - 4 - 60)
	add_child(p)
	var v: VBoxContainer = pb[1]
	portrait = UiHorsePortrait.new()
	portrait.custom_minimum_size = Vector2(0, 270)
	v.add_child(portrait)
	portrait.set_horse(String(h.name), String(HSU.or_(h.get("coat"), "鹿毛")), G.year - float(h.born))
	var fr := HBoxContainer.new()
	fr.add_theme_constant_override("separation", 8)
	var now := HSSeason.fh_show_both(h, wi)
	fr.add_child(UiTheme.label("総合力 いま", 14, UiTheme.MUTED))
	fr.add_child(UiScreen.spacer())
	fr.add_child(UiTheme.label("芝", 13, UiTheme.MUTED))
	fr.add_child(UiTheme.stat_chip(float(now.turf), "fh", true))
	fr.add_child(UiTheme.label("ダ", 13, UiTheme.MUTED))
	fr.add_child(UiTheme.stat_chip(float(now.dirt), "fh", true))
	v.add_child(fr)
	# 馬の状態は疲労の段階だけ（調子は無い：持ち主の決定 2026-10-20）
	if h.loc == "farm":
		v.add_child(_kv("疲労", "入厩前", UiTheme.FAINT))
	else:
		var fh := HBoxContainer.new()
		fh.add_child(UiTheme.label("疲労", 14, UiTheme.MUTED))
		fh.add_child(UiScreen.spacer())
		fh.add_child(fatigue_label(h, 15))
		v.add_child(fh)
	v.add_child(_kv("次走", next_text(h), UiTheme.GOLD_BRIGHT if HSProgram.next(h) != null else UiTheme.FAINT))
	v.add_child(_kv("戦績", HSText.t("%s・獲得 %s") % [record_text(h), HSText.money(float(HSU.or_(h.get("earn"), 0.0)))]))
	v.add_child(_kv("近走", recent_text(h, 5)))
	var sp := Control.new()
	sp.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(sp)
	b_prog = UiScreen.button("番組表（出走登録）", true, 0, 56, 20)
	b_prog.pressed.connect(_program)
	b_prog.set_meta("pad", "Y")   # Y でも番組表（押すボタンの印が付く）
	v.add_child(b_prog)
	var keep: bool = HSOriginal.on() and not h.get("gelding")
	var br := UiScreen.danger_button("引退させる", 0, 44, 16)
	var id := String(h.id)
	br.pressed.connect(func(): retire_flow(id, _retired))
	v.add_child(br)

func _program() -> void:
	UiFlow.program_back = "horse"
	go("program")

func _retired(r: Dictionary) -> void:
	if r.has("err"):
		toast(HSText.tx(String(r.err)), "bad")
		return
	UiFlow.save()
	go("stable")

func _fill() -> void:
	if h.is_empty(): return
	for c in tab_box.get_children(): c.queue_free()
	for c in list.get_children(): c.queue_free()
	rows.clear()
	if not hall_mode: UiFlow.focus["horse_tab"] = tabs_[tab][0]
	tab_box.add_child(UiTheme.tabs(tabs_.map(func(x): return x[1]), tab, pad, func(k): tab = k; sel = 0; _fill(); refresh_keybar(); focus_first()))
	scroll.scroll_vertical = 0
	match tabs_[tab][0]:
		"stat": _stat()
		"hall": _hall_info()
		"rec": _rec()
		"rating": _rating()
		"ped": _ped()

# ---- 能力 ----
func _stat() -> void:
	var wi := HSWorld.w_idx()
	var now := HSSeason.fh_show_both(h, wi)
	var pk := HSSeason.fh_show_peak(h)
	var fr := HBoxContainer.new()
	fr.add_theme_constant_override("separation", 10)
	fr.add_child(UiScreen.section("総合力", "その馬場のスピードとスタミナから"))
	fr.add_child(UiScreen.spacer())
	for x in [["いま 芝", now.turf, true], ["ダ", now.dirt, true], ["完成 芝", pk.turf, false], ["ダ", pk.dirt, false]]:
		fr.add_child(UiTheme.label(String(x[0]), 14, UiTheme.MUTED))
		fr.add_child(UiTheme.stat_chip(float(x[1]), "fh", x[2]))
	list.add_child(fr)
	list.add_child(UiScreen.section("能力", "いま／完成"))
	var grid := GridContainer.new()
	grid.columns = 8
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 8)
	var cur := HSHorse.cur(h, wi)
	var full := HSHorse.cur(h, HSWorld.w_idx()) if h.get("legend") else _peak_stats()
	for k in ["spd", "sta", "dspd", "dsta", "guts", "mind", "slope"]:
		var nm := UiTheme.label(String(HSHorse.STAT_SHORT[k]), 14, UiTheme.MUTED)
		nm.custom_minimum_size.x = 60
		grid.add_child(nm)
		grid.add_child(UiTheme.stat_chip(float(cur[k]), "stat"))
		grid.add_child(UiTheme.stat_chip(float(full[k]), "stat"))
		grid.add_child(_gap())
	var kn := UiTheme.label("切れ", 14, UiTheme.MUTED)
	kn.custom_minimum_size.x = 60
	grid.add_child(kn)
	grid.add_child(UiTheme.stat_chip(float(HSU.or_(h.get("kire"), 4.0)), "kire"))
	list.add_child(grid)
	var kv := HBoxContainer.new()
	kv.add_theme_constant_override("separation", 30)
	# 成長型は型の色で、ピークのめやすを添える（8つの型。HSHorse.GROWTH_INFO）
	var gr: Variant = h.get("growth")
	var gtxt := HSText.t(String(HSU.or_(gr, ""))) + (HSText.t("（%s）") % HSText.t(HSHorse.growth_note(gr)) if HSHorse.growth_note(gr) != "" else "")
	for x in [["距離", "%s〜%sm" % [HSU.num(h.distMin), HSU.num(h.distMax)]], ["脚質", HSText.style_text(h)], ["成長型", gtxt, HSHorse.growth_color(gr)], ["健康", "%d" % int(HSU.or_(h.get("health"), 70.0))]]:
		var pr := HBoxContainer.new()
		pr.add_theme_constant_override("separation", 8)
		pr.add_child(UiTheme.label(String(x[0]), 14, UiTheme.MUTED))
		pr.add_child(UiTheme.label(String(x[1]), 16, x[2] if x.size() > 2 else UiTheme.IVORY))
		kv.add_child(pr)
	list.add_child(kv)
	var sk := HSSkills.of(h, wi)
	if sk.size():
		list.add_child(UiScreen.section("特殊能力"))
		var fl := HFlowContainer.new()
		fl.add_theme_constant_override("h_separation", 6)
		fl.add_theme_constant_override("v_separation", 6)
		for id in sk:
			fl.add_child(UiTheme.chip(HSText.skill_label(String(id)), UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT if HSSkills.is_unique(id) else UiTheme.IVORY, 13))
		list.add_child(fl)
	var tro := HSHall.trophies_of(h)
	var tit: Array = HSU.or_(h.get("titles"), [])
	list.add_child(UiScreen.section("トロフィー・冠", HSText.t("%d個") % (tro.size() + tit.size())))
	if tro.size() or tit.size():
		var tl := HFlowContainer.new()
		tl.add_theme_constant_override("h_separation", 6)
		tl.add_theme_constant_override("v_separation", 6)
		for x in tro: tl.add_child(UiTheme.chip("🏆 " + HSText.tx(String(x.label)), UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 13))
		for x in tit: tl.add_child(UiTheme.chip(HSText.t("冠 %s") % HSText.tx(String(x)), UiTheme.SURFACE_3, UiTheme.GOLD_BRIGHT, 13))
		list.add_child(tl)
	else:
		list.add_child(UiTheme.label("まだありません", 14, UiTheme.FAINT))
	var gw: Array = HSU.or_(h.get("gradedWins"), [])
	list.add_child(UiScreen.section("重賞の勝ち鞍", HSText.t("%d勝") % gw.size()))
	if gw.is_empty():
		list.add_child(UiTheme.label("まだありません", 14, UiTheme.FAINT))
	var gl := HFlowContainer.new()
	gl.add_theme_constant_override("h_separation", 10)
	gl.add_theme_constant_override("v_separation", 6)
	for g in gw:
		var hb := HBoxContainer.new()
		hb.add_theme_constant_override("separation", 4)
		hb.add_child(UiTheme.grade_chip(String(HSU.or_(g.get("grade"), "")), 12))
		hb.add_child(UiTheme.label("%s %s" % [_yl(g.y), HSText.race_name(String(HSU.or_(g.get("short"), g.race)))], 13))
		gl.add_child(hb)
	list.add_child(gl)

func _peak_stats() -> Dictionary:
	var o := {}
	for k in h.pot: o[k] = float(h.pot[k]) + float(HSU.or_(HSU.or_(h.get("bonus"), {}).get(k), 0.0))
	return o

func _gap() -> Control:
	var c := Control.new()
	c.custom_minimum_size.x = 30
	return c

# ---- 戦績（新しい順。行を押すとレースの詳しい記録） ----
const REC_COLS := [["日付", 150], ["", 46], ["レース", 0], ["コース", 150], ["馬場", 44], ["着順", 64], ["人気", 48], ["タイム", 74], ["着差", 64], ["上がり", 58], ["レート", 56]]
func _rec() -> void:
	results = HSU.or_(h.get("results"), []).duplicate()
	results.reverse()
	list.add_child(_head(REC_COLS))
	if results.is_empty():
		list.add_child(UiTheme.label("まだ走っていません", 15, UiTheme.MUTED))
		return
	for i in results.size():
		var r: Dictionary = results[i]
		var rb := UiScreen.row_button(38, int(r.pos) == 1)
		var b: Button = rb[0]
		var hb: HBoxContainer = rb[1]
		var pos := int(r.pos)
		var cells := [[_date(r), UiTheme.MUTED], ["", null], [HSText.race_name(String(r.race)), UiTheme.IVORY], [HSText.course_dist(r), UiTheme.MUTED], [HSText.t(String(HSU.or_(r.get("ground"), ""))), UiTheme.MUTED],
			["%d/%d" % [pos, int(r.n)], UiTheme.GOLD_BRIGHT if pos <= 3 else UiTheme.IVORY], ["%d" % int(r.pop) if r.get("pop") != null else "－", UiTheme.MUTED],
			[HSU.time(float(r.time)) if r.get("time") != null else "", UiTheme.IVORY], [HSText.t(String(HSU.or_(r.get("margin"), ""))) if pos > 1 else "", UiTheme.MUTED],
			["%.1f" % float(r.last3f) if r.get("last3f") != null else "", UiTheme.MUTED], ["%d" % int(r.rt) if r.get("rt") != null else "－", UiTheme.GOLD_BRIGHT]]
		for k in REC_COLS.size():
			var w: float = REC_COLS[k][1]
			if k == 1:
				var gc := CenterContainer.new()
				gc.custom_minimum_size.x = w
				var g := String(HSU.or_(r.get("grade"), ""))
				if g != "": gc.add_child(UiTheme.grade_chip(g, 11))
				hb.add_child(gc)
				continue
			var l := UiTheme.num_label(String(cells[k][0]), 14, cells[k][1], HORIZONTAL_ALIGNMENT_LEFT if k in [0, 2, 3] else HORIZONTAL_ALIGNMENT_CENTER)
			if k == 2: l.add_theme_font_override("font", UiTheme.font())
			if w > 0: l.custom_minimum_size.x = w
			else: l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			l.clip_text = true
			hb.add_child(l)
		UiScreen.pass_mouse(hb)
		var k2 := i
		b.focus_entered.connect(func():
			sel = k2
			if not hall_mode: UiFlow.focus["horse_row"] = k2)
		b.pressed.connect(func(): race_detail(results[k2]))
		list.add_child(b)
		rows.append(b)

func _head(cols: Array) -> Control:
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 10)
	for c in cols:
		var l := UiTheme.label(HSText.t(String(c[0])), 11, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_LEFT if c[0] in ["日付", "レース", "コース", "部門", "馬名", "騎手"] else HORIZONTAL_ALIGNMENT_CENTER)
		if c[1] > 0: l.custom_minimum_size.x = c[1]
		else: l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		head.add_child(l)
	var hm := MarginContainer.new()
	hm.add_theme_constant_override("margin_left", 12)
	hm.add_theme_constant_override("margin_right", 12)
	hm.add_child(head)
	return hm

# ---- レーティング（総合と部門） ----
func _rating() -> void:
	var tb := HSRating.table(h)
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 14)
	top.add_child(UiScreen.section("レーティング"))
	top.add_child(UiScreen.spacer())
	var ov = tb.all
	top.add_child(UiTheme.label("総合", 15, UiTheme.MUTED))
	top.add_child(rating_chip(float(ov.v) if ov != null else -1.0, true))
	top.add_child(UiTheme.label(HSText.t("%d走から") % int(ov.n) if ov != null else "まだ走っていない", 13, UiTheme.FAINT))
	list.add_child(top)
	list.add_child(_head([["部門", 0], ["レーティング", 120], ["数えた走り", 120], ["いちばん良い走り", 160]]))
	for d in HSRating.DIVS:
		var r = tb[d.id]
		var rb := UiScreen.row_button(40, false)
		var b: Button = rb[0]
		b.focus_mode = Control.FOCUS_NONE
		var hb: HBoxContainer = rb[1]
		var nv := HBoxContainer.new()
		nv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		nv.add_theme_constant_override("separation", 10)
		nv.add_child(UiTheme.label(HSText.t(String(d.label)), 15))
		nv.add_child(UiTheme.label(HSText.t(String(d.note)), 12, UiTheme.FAINT))
		hb.add_child(nv)
		var cc := CenterContainer.new()
		cc.custom_minimum_size.x = 120
		cc.add_child(rating_chip(float(r.v) if r != null else -1.0))
		hb.add_child(cc)
		var nl := UiTheme.num_label(HSText.t("%d走") % int(r.n) if r != null else "－", 14, UiTheme.MUTED)
		nl.custom_minimum_size.x = 120
		hb.add_child(nl)
		var bl := UiTheme.num_label("%d" % int(r.best) if r != null else "－", 14, UiTheme.MUTED)
		bl.custom_minimum_size.x = 160
		hb.add_child(bl)
		UiScreen.pass_mouse(hb)
		list.add_child(b)
	# 数えた走り（良かった順に3つ）
	var rs: Array = HSU.or_(h.get("results"), []).filter(func(x): return x.get("rt") != null)
	rs = HSU.stable_sort(rs, func(a, b): return float(a.rt) > float(b.rt))
	list.add_child(UiScreen.section("良かった走り", "上の3つの平均が総合"))
	if rs.is_empty():
		list.add_child(UiTheme.label("まだありません（走ると付く）", 14, UiTheme.FAINT))
	for r in rs.slice(0, 5):
		var hb := HBoxContainer.new()
		hb.add_theme_constant_override("separation", 10)
		hb.add_child(rating_chip(float(r.rt)))
		var g := String(HSU.or_(r.get("grade"), ""))
		if g != "": hb.add_child(UiTheme.grade_chip(g, 11))
		hb.add_child(UiTheme.label(HSText.t("%s %s　%s／%d頭%s") % [_date(r), HSText.race_name(String(r.race)), HSText.ord(int(r.pos)), int(r.n), HSText.t("（%s）") % HSText.t(String(r.margin)) if int(r.pos) > 1 and String(HSU.or_(r.get("margin"), "")) != "" else ""], 14))
		list.add_child(hb)

# ---- 血統・名鑑 ----
func _ped() -> void:
	var d = HSWorld.histByName.get(String(h.name))
	if d == null and h.get("hist"): d = HSSpecial.data(String(h.name))
	list.add_child(UiScreen.section("血統"))
	list.add_child(pedigree_box(h.get("sire"), h.get("dam"), d.get("damsire") if d is Dictionary else h.get("damsire")))
	list.add_child(UiScreen.section("名鑑", "史実" if d is Dictionary else ""))
	list.add_child(profile_box(d if d is Dictionary else {}, 1060, 12))

func focus_first() -> void:
	if h.is_empty(): return
	if tabs_[tab][0] == "rec" and rows.size():
		rows[clampi(sel, 0, rows.size() - 1)].grab_focus()
	elif b_prog:
		b_prog.grab_focus()

func _unhandled_input(ev: InputEvent) -> void:
	if _modal == null and not h.is_empty() and not hall_mode and ((ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_Y) or (ev is InputEventJoypadButton and ev.pressed and ev.button_index == JOY_BUTTON_Y)):
		_program()
		get_viewport().set_input_as_handled()
		return
	super._unhandled_input(ev)

# ---- レースの詳しい記録（戦績の行から）：自分の馬の記録・出走馬（枠・着順・タイム・着差・人気・騎手）・ラップ・勝ち時計 ----
# 記録は HSRaceRec（1走に付けた rec）。リプレイが残っていれば「リプレイを見る」も出す。記録の無い前のセーブの1走は「記録なし」
const DETAIL_COLS := [["着", 34], ["枠", 34], ["馬名", 0], ["タイム", 74], ["着差", 64], ["人気", 46], ["騎手", 150]]
var detail_replay := ""
func race_detail(r: Dictionary) -> void:
	var pb := UiScreen.panel_box(true, 10)
	var p: PanelContainer = pb[0]
	p.custom_minimum_size = Vector2(1320, 0)
	var root: VBoxContainer = pb[1]
	var th := HBoxContainer.new()
	th.add_theme_constant_override("separation", 12)
	var g := String(HSU.or_(r.get("grade"), ""))
	if g != "": th.add_child(UiTheme.grade_chip(g, 15))
	th.add_child(UiTheme.title(HSText.race_name(String(r.race)), 28))
	th.add_child(UiScreen.spacer())
	th.add_child(UiTheme.label("%s　%s %s %sm　%s" % [_date(r), HSText.course_name(String(r.course)), HSText.t("ダート" if r.surface == "ダ" else "芝"), HSU.num(r.dist), HSText.t(String(HSU.or_(r.get("ground"), "")))], 15, UiTheme.MUTED))
	root.add_child(th)
	var cols := HBoxContainer.new()
	cols.add_theme_constant_override("separation", 26)
	cols.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(cols)
	var lv := VBoxContainer.new()
	lv.custom_minimum_size.x = 360
	lv.add_theme_constant_override("separation", 6)
	cols.add_child(lv)
	lv.add_child(UiScreen.section(HSText.horse_name(h)))
	var pos := int(r.pos)
	var ph := HBoxContainer.new()
	ph.add_child(UiTheme.title(HSText.ord(pos), 40, UiTheme.GOLD_BRIGHT if pos <= 3 else UiTheme.IVORY))
	ph.add_child(UiTheme.label(HSText.t("／%d頭") % int(r.n), 16, UiTheme.MUTED))
	lv.add_child(ph)
	for x in [["人気", HSText.t("%d番人気") % int(r.pop) if r.get("pop") != null else "－"], ["タイム", HSU.time(float(r.time)) if r.get("time") != null else "－"], ["着差", HSText.t(String(HSU.or_(r.get("margin"), ""))) if pos > 1 else "－"],
			["上がり3F", "%.1f" % float(r.last3f) if r.get("last3f") != null else "－"], ["騎手", HSText.jockey_name(String(HSU.or_(r.get("jockey"), "－")))], ["レーティング", "%d" % int(r.rt) if r.get("rt") != null else "－"]]:
		lv.add_child(_kv(String(x[0]), String(x[1])))
	var has := HSRaceRec.has(r)
	if has:
		var wt = HSRaceRec.rows(r)[0].time
		lv.add_child(UiScreen.section("勝ち時計"))
		lv.add_child(UiTheme.num_label(HSU.time(float(wt)), 26, UiTheme.GOLD_BRIGHT, HORIZONTAL_ALIGNMENT_LEFT))
		var laps := HSRaceRec.laps(r)
		lv.add_child(UiScreen.section("ラップ", "先頭の200mごと"))
		var lt := UiTheme.num_label(" - ".join(PackedStringArray(laps.map(func(x): return "%.1f" % x))) if laps.size() else "－", 15, UiTheme.IVORY, HORIZONTAL_ALIGNMENT_LEFT)
		lt.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		lt.custom_minimum_size.x = 350
		lv.add_child(lt)
	var rv := VBoxContainer.new()
	rv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	rv.add_theme_constant_override("separation", 2)
	cols.add_child(rv)
	detail_replay = find_replay(String(h.name), r)
	if detail_replay != "":
		var path := UiFlow.replay_dir.path_join(detail_replay + ".json")
		var rep = JSON.parse_string(FileAccess.get_file_as_string(path)) if FileAccess.file_exists(path) else null
		if not replay_matches(rep, String(h.name), r): detail_replay = ""
	if has:
		var rs := HSRaceRec.rows(r)
		rv.add_child(UiScreen.section("出走馬", HSText.t("%d頭") % rs.size()))
		rv.add_child(_head(DETAIL_COLS))
		var me_name := String(h.name)
		for x in rs:
			var mine := String(x.name) == me_name
			var rb := UiScreen.row_button(29, mine)
			var b: Button = rb[0]
			b.focus_mode = Control.FOCUS_NONE
			var hb: HBoxContainer = rb[1]
			var xp := int(x.pos)
			var cells := [["%d" % xp, UiTheme.GOLD_BRIGHT if xp <= 3 else UiTheme.MUTED], ["", null], [HSText.horse_name(String(x.name)), UiTheme.GOLD_BRIGHT if mine else UiTheme.IVORY],
				[HSU.time(float(x.time)), UiTheme.IVORY], [HSText.t(String(x.margin)) if xp > 1 else "", UiTheme.MUTED], ["%d" % int(x.pop) if float(x.pop) > 0 else "－", UiTheme.MUTED], [HSText.jockey_name(String(x.jockey)), UiTheme.MUTED]]
			for k in DETAIL_COLS.size():
				var w: float = DETAIL_COLS[k][1]
				if k == 1:
					var fc := CenterContainer.new()
					fc.custom_minimum_size.x = w
					if x.num != null: fc.add_child(UiTheme.frame_box(int(x.frame), int(x.num), 24, 13))
					hb.add_child(fc)
					continue
				var l := UiTheme.num_label(String(cells[k][0]), 14, cells[k][1], HORIZONTAL_ALIGNMENT_LEFT if k in [2, 6] else HORIZONTAL_ALIGNMENT_CENTER)
				if k in [2, 6]: l.add_theme_font_override("font", UiTheme.font())
				if w > 0: l.custom_minimum_size.x = w
				else: l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				l.clip_text = true
				hb.add_child(l)
			UiScreen.pass_mouse(hb)
			rv.add_child(b)
	else:
		rv.add_child(UiScreen.section("出走馬・ラップ"))
		var nl := UiTheme.label("記録なし（出走馬とラップを残す前のレース）", 16, UiTheme.MUTED)
		nl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		nl.custom_minimum_size.x = 740
		rv.add_child(nl)
	var bh := HBoxContainer.new()
	bh.alignment = BoxContainer.ALIGNMENT_END
	bh.add_theme_constant_override("separation", 12)
	var back := UiScreen.button("もどる", detail_replay == "", 160, 50, 18)
	back.pressed.connect(close_modal)
	bh.add_child(back)
	var first: Button = back
	if detail_replay != "":
		var bw := UiScreen.button("リプレイを見る", true, 220, 52, 20)
		var id := detail_replay
		bw.pressed.connect(func():
			UiFlow.replay_path = UiFlow.replay_dir.path_join(id + ".json")
			UiFlow.replay_back = "horse"
			go("race"))
		bh.add_child(bw)
		first = bw
	root.add_child(bh)
	open_modal(p, first)

# ---------- 共通の小物（厩舎・店も使う） ----------
static func record_text(x: Dictionary) -> String:
	return HSText.t("%d戦%d勝") % [int(HSU.or_(x.get("starts"), 0.0)), int(HSU.or_(x.get("wins"), 0.0))]

# 近走の着順（新しいものから n 走。「1・3・2」）
static func recent_text(x: Dictionary, n: int) -> String:
	var rs: Array = HSU.or_(x.get("results"), [])
	var out: Array = []
	for i in range(rs.size() - 1, maxi(-1, rs.size() - 1 - n), -1):
		out.append(str(int(rs[i].pos)))
	return HSText.t("・").join(PackedStringArray(out)) if out.size() else "－"

static func next_text(x: Dictionary) -> String:
	var nx = HSProgram.next(x)
	if nx == null: return HSText.t("おまかせ" if x.get("auto") else "未定")
	return HSText.t("今週 %s") % HSText.race_label(nx.race) if nx.get("entered") else "%s %s" % [HSText.tx(String(nx.label)), HSText.race_name(String(nx.name))]

# 疲労の段階（HSFatigue：万全・軽い疲れ・疲れ・疲れが濃い・使いすぎ）と値
static func fatigue_label(x: Dictionary, size := 14) -> Label:
	var v := HSFatigue.view(x)
	return UiTheme.label("%s %d" % [HSText.t(String(v.label)), int(v.value)], size, Color(String(v.color)))

# レーティングの札（総合力に直した段の色で塗る：レーティング 110＝総合力 63）
static func rating_chip(v: float, big := false) -> PanelContainer:
	if v < 0.0:
		return UiTheme.chip("－", UiTheme.SUNK, UiTheme.FAINT, 17 if big else 14, 48.0 if big else 34.0)
	var eq := HSRating.FH0 + (v - HSRating.BASE) / HSRating.PER_FH
	return UiTheme.stat_chip(eq, "fh", big, "%d" % int(v))

# 2代の血統表（父・母と、その父と母）
static func _known(n: Variant) -> bool:
	return n != null and String(n) != "" and String(n) != "?"

static func pedigree_box(sire: Variant, dam: Variant, damsire: Variant = null) -> Control:
	if not _known(sire) and not _known(dam):
		return UiTheme.label("血統の記録はありません（重賞の記録から作った史実馬）", 14, UiTheme.FAINT)
	var sp: Array = HSPed.parents(sire)
	var dp: Array = HSPed.parents(dam)
	if dp[0] == null and damsire != null: dp = [damsire, dp[1]]
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 4)
	var c1 := VBoxContainer.new()
	c1.add_theme_constant_override("separation", 4)
	c1.custom_minimum_size.x = 250
	c1.add_child(_ped_cell("父", sire, 2, true))
	c1.add_child(_ped_cell("母", dam, 2, false))
	hb.add_child(c1)
	var c2 := VBoxContainer.new()
	c2.add_theme_constant_override("separation", 4)
	c2.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	c2.add_child(_ped_cell("父の父", sp[0], 1, true))
	c2.add_child(_ped_cell("父の母", sp[1], 1, false))
	c2.add_child(_ped_cell("母の父", dp[0], 1, true))
	c2.add_child(_ped_cell("母の母", dp[1], 1, false))
	hb.add_child(c2)
	return hb

static func _ped_cell(head: String, name: Variant, span: int, male: bool) -> PanelContainer:
	var p := PanelContainer.new()
	var col := Color("16304a") if male else Color("3a1d2c")
	p.add_theme_stylebox_override("panel", UiTheme.box(Color(col.r, col.g, col.b, 0.7), UiTheme.LINE_STRONG, 1, UiTheme.R_CHIP, Vector4(10, 2, 10, 2)))
	p.custom_minimum_size.y = 30.0 * span + 4.0 * (span - 1)
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 8)
	hb.add_child(UiTheme.label(head, 11, UiTheme.MUTED))
	var s := HSText.horse_name(String(name)) if _known(name) else "－"
	var l := UiTheme.label(s, 14)
	l.clip_text = true
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb.add_child(l)
	p.add_child(hb)
	return p

# 名鑑（史実馬：年代・戦績・主な成績・解説）。無ければひと言
static func profile_box(d: Dictionary, width: float, lines: int) -> Control:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	var years := String(HSU.or_(d.get("years"), ""))
	var rec := String(HSU.or_(d.get("record"), ""))
	var mw: Array = HSText.main_wins(d).duplicate() if d.has("mainWins") else []
	if mw.is_empty():
		# 名鑑の無い馬は、史実の勝ち鞍（データの wins「2016札幌2歳ステークス」）から（js/ui/screens.js の UI.histMainWins と同じ考え）
		for w in HSU.or_(d.get("wins"), []).slice(0, 6):
			mw.append("%s %s" % [String(w).substr(0, 4), String(w).substr(4)])
	if years != "": years = HSText.tx(years)
	if rec != "": rec = HSText.tx(rec)
	if years == "" and d.get("born") != null and d.get("retire") != null:
		years = HSText.t("%d〜%d年に走った") % [int(d.born) + 2, int(d.retire)]
	var text := HSText.profile_text(d) if HSU.truthy(d.get("text")) else String(HSU.or_(d.get("note"), ""))
	if years == "" and rec == "" and mw.is_empty() and text == "":
		v.add_child(UiTheme.label("名鑑はありません", 14, UiTheme.FAINT))
		return v
	if years != "" or rec != "":
		v.add_child(UiTheme.label("　".join(PackedStringArray([years, rec].filter(func(x): return x != ""))), 14, UiTheme.GOLD_BRIGHT))
	if mw.size():
		var ml := UiTheme.label(HSText.t("主な成績：%s") % HSText.t("、").join(PackedStringArray(mw.slice(0, 6))), 13, UiTheme.MUTED)
		ml.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		ml.custom_minimum_size.x = width
		v.add_child(ml)
	if text != "":
		var tl := UiTheme.label(text, 14)
		tl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		tl.custom_minimum_size.x = width
		tl.max_lines_visible = lines
		tl.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		v.add_child(tl)
	return v

# 戦績の1走に当たるリプレイ（自分で乗ったレースの記録。日付と馬名で探す）。無ければ ""
static func find_replay(name: String, r: Dictionary) -> String:
	var G = HSWorld.G
	var date := "%d年目 %s" % [int(float(r.y) - float(HSU.or_(G.get("startYear"), G.year))) + 1, HSWorld.week_label(float(r.m), float(r.w))]  # i18n:skip（記録の鍵。UiFlow.date_key と同じ形）
	for x in UiFlow.replay_list():
		if String(x.get("horse", "")) == name and String(x.get("date", "")) == date:
			return String(x.id)
	return ""

# 読んだリプレイが、その1走のものか（レースの鍵の年・月・週と、出走馬に名前があるか）
static func replay_matches(rep: Variant, name: String, r: Dictionary) -> bool:
	if not (rep is Dictionary): return false
	var key := String(rep.get("race", {}).get("key", ""))
	if not key.begins_with("%s-%s-%s-" % [HSU.num(float(r.y)), HSU.num(float(r.m)), HSU.num(float(r.w))]): return false
	for x in rep.get("results", []):
		if String(x.get("name", "")) == name: return true
	return false

# リプレイのコマから、先頭の馬の200mごとのラップ（最初の区切りは距離の端数。最後は勝ち時計まで）
static func laps_of(rep: Dictionary) -> Array:
	var fr: Array = rep.get("frames", [])
	var D := float(rep.get("race", {}).get("dist", 0.0))
	if fr.size() < 2 or D <= 0.0: return []
	var marks: Array = []
	var m := fmod(D, 200.0)
	if m < 1.0: m = 200.0
	while m < D - 0.5:
		marks.append(m)
		m += 200.0
	var times: Array = []
	var k := 0
	var prev_t := 0.0
	var prev_x := 0.0
	for mk in marks:
		var found := false
		while k < fr.size():
			var f: Dictionary = fr[k]
			var lead := 0.0
			for p in f.p: lead = maxf(lead, float(p[0]))
			if lead >= mk:
				var t := float(f.t)
				var tt: float = prev_t + (mk - prev_x) / maxf(1e-6, lead - prev_x) * (t - prev_t) if lead > prev_x else t
				times.append(tt)
				found = true
				break
			prev_t = float(f.t)
			prev_x = lead
			k += 1
		if not found: break
	times.append(float(rep.get("winnerTime", 0.0)))
	var out: Array = []
	var last := 0.0
	for t in times:
		var c := snappedf(float(t), 0.1)   # 通過の時計を 0.1 秒に丸めてから引く（足すと勝ち時計になる）
		out.append(snappedf(c - last, 0.1))
		last = c
	return out

func _kv(k: String, v: String, col := UiTheme.IVORY) -> HBoxContainer:
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 12)
	hb.add_child(UiTheme.label(k, 14, UiTheme.MUTED))
	var l := UiTheme.label(v, 15, col, HORIZONTAL_ALIGNMENT_RIGHT)
	l.clip_text = true
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb.add_child(l)
	return hb

func _date(r: Dictionary) -> String:
	return "%s %s" % [_yl(r.y), HSText.week_label(float(r.m), float(r.w))]

func _yl(y: Variant) -> String:
	var G = HSWorld.G
	return HSText.year_n(int(float(y) - float(HSU.or_(G.get("startYear"), G.year))) + 1)
