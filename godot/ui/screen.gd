# 騎乗の外の画面の土台（docs/UI.md）：背景の写真と深緑の幕・見出しの帯・帯の数・節の見出し・操作の案内・トースト・入りの動き・撮影。
# 画面（ホーム・番組表・週の結果・タイトル・馬の店）はこれを継いで build() で中身を組む。部品は UiTheme のものを使う。
# 操作（docs/UI.md 4）：十字キー・矢印で選ぶ（Godot の ui_* の割り当て）・A／Enter で決定・B／Esc でもどる（on_back）・LB/RB・Q/E でタブ（on_tab）
# 撮影：-- --out=DIR --shot=秒:名前 …（決まった刻みで進めて撮り、撮り終えたら閉じる）。--demo[=週] で決まった種の新しいゲームから始める（UiFlow.demo）
class_name UiScreen
extends Control

const PAD_X := 24.0
const TOP := 104.0           # 帯の下

var pad := false
var keybar: PanelContainer
var kb_holder: HBoxContainer
var kb_hint: Label
var band: UiBand
var fade: ColorRect
var shots: Array = []
var out_dir := "res://out"
var clock := 0.0
var demo := -1
var _modal: Control = null       # 小窓（確かめ・見せ場）。開いている間は Esc・B で閉じる
var _modal_back: Callable
var _modal_focus: Control = null
var _toast: PanelContainer
var _toast_until := 0.0

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	theme = UiTheme.get_theme()
	pad = Input.get_connected_joypads().size() > 0
	_parse_args()
	if needs_world() and not UiFlow.active():
		if demo >= 0:
			if demo_week():
				UiFlow.demo_week(demo)
			elif OS.get_cmdline_user_args().has("--setup=gf"):
				UiFlow.demo_gf()   # 撮影の見本：グランドフェスティバルの週
			else:
				UiFlow.demo(demo)
			if OS.get_cmdline_user_args().has("--setup=retire"):
				# 撮影の見本：牡馬と牝馬を1頭ずつ引退させる（生産・牧場の画面）
				for sx in ["牡", "牝"]:
					for h in HSWorld.mine():
						if h.get("loc") != "retired" and (h.sex == "牝") == (sx == "牝"):
							HSJockey.retire(h.id)
							break
			if OS.get_cmdline_user_args().has("--setup=fatigue"):
				UiFlow.demo_fatigue()   # 撮影の見本：疲労の段階が並ぶように
			if OS.get_cmdline_user_args().has("--setup=owners8"):
				# 撮影の見本：8人の段階がばらばら（会っていない人・OP〜お手馬・やり終えた人）
				var plan := {"makino": [1, 30.0], "sengoku": [3, 62.0], "yuni": [2, 47.0], "takenouchi": [0, 18.0], "takarada": [5, 100.0], "dakota": [4, 80.0]}
				for o in HSOwners.LIST():
					var st := HSOwners.of(String(o.id))
					st.known = plan.has(o.id)
					if plan.has(o.id):
						st.known = true; st.stage = float(plan[o.id][0]); st.pts = plan[o.id][1]; st.rides = 12.0; st.wins = 3.0
						if st.stage >= HSOwners.WEAR_STAGE: st.got.t2 = { y = HSWorld.G.year }
						if st.stage >= HSOwners.DONE: st.got.item = { y = HSWorld.G.year }
			if OS.get_cmdline_user_args().has("--setup=met2"):
				# 撮影の見本：縁があるのは2人だけ（馬主の一覧で、縁のある馬主とまだの馬主が並ぶ）
				for o in HSOwners.LIST():
					HSOwners.of(String(o.id)).known = String(o.id) in ["sengoku", "makino"]
		else:
			UiFlow.go.call_deferred(get_tree(), "title")
			return
	build()
	_build_keybar()
	fade = ColorRect.new()
	fade.color = Color(0.01, 0.03, 0.02, 0.0)
	fade.set_anchors_preset(Control.PRESET_FULL_RECT)
	fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(fade)
	enter_anim()
	# 撮影の見本：見せ場とご褒美の場面
	var args := OS.get_cmdline_user_args()
	if args.has("--setup=celebrate"):
		celebrate("トロフィーを手にした", "三冠", "サンプルホース・ボーナス賞金 5億円")
	elif args.has("--setup=scene"):
		owner_scene({"oid": "makino", "kind": "m1", "horse": "サンプルホース", "race": "3歳オープン", "reward": "お礼 300万円"})
	elif args.has("--setup=meet"):
		# 縁ができたときの場面（初めて声をかけてくる）
		owner_scene({"oid": "sengoku", "kind": "meet", "horse": "サンプルホース", "race": "2歳オープン", "reward": ""})
	elif args.has("--setup=meet_yuni"):
		# 絵の無い人（コードで描いた顔）の出会い
		owner_scene({"oid": "yuni", "kind": "meet", "horse": "サンプルホース", "race": "2歳オープン", "reward": ""})
	elif args.has("--setup=scene_violaine"):
		# 課題をやり終えた場面（G2 の課題・勝負服）
		owner_scene({"oid": "violaine", "kind": "m3", "horse": "サンプルホース", "race": "目黒記念", "reward": "お礼 1,000万円・ヴィオレーヌ・ド・サン＝クレールさんの勝負服を自分の馬に着せられる"})
	if shots.size() > 0:
		_capture()
	else:
		focus_first.call_deferred()

# ---- 継いだ画面が書く所 ----
func needs_world() -> bool: return true
func demo_week() -> bool: return false   # 撮影の見本で、1週を乗って締めてから開く
func build() -> void: pass
func focus_first() -> void: pass
func keys() -> Array: return [["↑↓←→", "十字", "選ぶ"], ["Enter", "A", "決定"], ["Esc", "B", "もどる"]]
func hint() -> String: return ""
func on_back() -> void: pass
func on_tab(_d: int) -> void: pass

# ---- 画面の移り（暗くしてから） ----
func go(name: String) -> void:
	if shots.size() > 0:
		return
	var tw := create_tween()
	tw.tween_property(fade, "color:a", 1.0, 0.16)
	tw.tween_callback(func(): UiFlow.go(get_tree(), name))

# ---- 背景の写真（覆うように置く）と、左ほど濃い深緑の幕 ----
func backdrop(img: String, strength := 0.82) -> void:
	var base := ColorRect.new()
	base.color = UiTheme.BG
	base.set_anchors_preset(Control.PRESET_FULL_RECT)
	base.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(base)
	var tex = load("res://assets/ui/%s.jpg" % img) if ResourceLoader.exists("res://assets/ui/%s.jpg" % img) else null
	if tex:
		var tr := TextureRect.new()
		tr.texture = tex
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		tr.set_anchors_preset(Control.PRESET_FULL_RECT)
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(tr)
	var sh := ColorRect.new()
	sh.set_anchors_preset(Control.PRESET_FULL_RECT)
	sh.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var m := ShaderMaterial.new()
	m.shader = Shader.new()
	m.shader.code = """shader_type canvas_item;
uniform vec4 c : source_color = vec4(0.027, 0.078, 0.051, 1.0);
uniform vec4 glow : source_color = vec4(0.075, 0.29, 0.19, 1.0);
uniform float k = 0.82;
void fragment() {
	float a = k * (0.78 + 0.22 * (1.0 - UV.x)) + 0.12 * smoothstep(0.6, 1.0, UV.y);
	vec3 col = mix(c.rgb, glow.rgb, 0.35 * (1.0 - smoothstep(0.0, 0.6, distance(UV, vec2(0.5, 0.0)))));
	COLOR = vec4(col, clamp(a, 0.0, 0.97));
}"""
	m.set_shader_parameter("k", strength)
	sh.material = m
	add_child(sh)

# ---- 見出しの帯：金の丸の印・明朝の画面名・注記・右に帯の数 ----
func make_band(mark: String, title: String, sub: String, stats: Array) -> UiBand:
	band = UiTheme.band(76)
	band.set_anchors_preset(Control.PRESET_TOP_WIDE)
	band.offset_left = PAD_X
	band.offset_right = -PAD_X
	band.offset_top = 16
	band.offset_bottom = 92
	add_child(band)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 14)
	band.add_child(h)
	var rn := PanelContainer.new()
	rn.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.GOLD_FACE[1], UiTheme.GOLD_FACE[0], 2, 999, Vector4(0, 0, 0, 0)))
	rn.custom_minimum_size = Vector2(52, 52)
	rn.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var ml := UiTheme.title(mark, 24, UiTheme.ON_GOLD)
	ml.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	rn.add_child(ml)
	h.add_child(rn)
	var tv := VBoxContainer.new()
	tv.add_theme_constant_override("separation", -6)
	tv.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	tv.add_child(UiTheme.title(title, 26, UiTheme.IVORY))
	if sub != "":
		tv.add_child(UiTheme.label(sub, 13, UiTheme.MUTED))
	h.add_child(tv)
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(sp)
	var chips := HBoxContainer.new()
	chips.add_theme_constant_override("separation", 10)
	chips.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(chips)
	for s in stats:
		chips.add_child(stat(String(s[0]), String(s[1]), String(s[2]) if s.size() > 2 else ""))
	return band

# 帯の数（黒 28% の札。上に見出し、下に値。資金は金・注意は橙）
static func stat(head: String, val: String, kind := "") -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.box(Color(0, 0, 0, 0.28), Color(0, 0, 0, 0), 0, 10, Vector4(14, 3, 14, 4)))
	p.custom_minimum_size.x = 92
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", -4)
	p.add_child(v)
	v.add_child(UiTheme.label(head, 11, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	var col := UiTheme.GOLD_BRIGHT if kind == "money" else (UiTheme.WARN if kind == "warn" else UiTheme.IVORY)
	v.add_child(UiTheme.num_label(val, 17, col))
	return p

# 節の見出し（明朝・左に金の縦線。右に小さな注記）
static func section(text: String, note := "") -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	var bar := ColorRect.new()
	bar.color = UiTheme.GOLD
	bar.custom_minimum_size = Vector2(3, 18)
	bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(bar)
	h.add_child(UiTheme.title(text, 17, UiTheme.IVORY))
	if note != "":
		var sp := Control.new()
		sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(sp)
		h.add_child(UiTheme.label(note, 13, UiTheme.MUTED))
	return h

# 板（写真が透ける深緑）に縦の並びを入れて返す
static func panel_box(gold := false, sep := 8) -> Array:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.panel_gold(0.88) if gold else UiTheme.panel(0.84))
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", sep)
	p.add_child(v)
	return [p, v]

# 押せる行（表の行の札。選ぶと金の線）。中身の HBox を返す
static func row_button(h := 40.0, mine := false) -> Array:
	var b := Button.new()
	b.custom_minimum_size = Vector2(0, h)
	b.focus_mode = Control.FOCUS_ALL
	b.add_theme_stylebox_override("normal", UiTheme.row_box(0, false, mine))
	var hov := UiTheme.row_box(0, false, mine)
	hov.bg_color = Color(UiTheme.SURFACE_3.r, UiTheme.SURFACE_3.g, UiTheme.SURFACE_3.b, 0.92)
	b.add_theme_stylebox_override("hover", hov)
	for st in ["focus", "pressed", "hover_pressed"]:
		b.add_theme_stylebox_override(st, UiTheme.row_box(0, true, mine))
	var hb := HBoxContainer.new()
	hb.set_anchors_preset(Control.PRESET_FULL_RECT)
	hb.offset_left = 12
	hb.offset_right = -12
	hb.add_theme_constant_override("separation", 10)
	hb.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(hb)
	b.mouse_entered.connect(func(): b.grab_focus())
	return [b, hb]

# 行の中に足した札が押すのを邪魔しないように
static func pass_mouse(n: Node) -> void:
	for c in n.get_children():
		if c is Control:
			(c as Control).mouse_filter = Control.MOUSE_FILTER_IGNORE
		pass_mouse(c)

static func button(text: String, gold := false, w := 0.0, h := 44.0, fs := 18) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(w, h)
	b.add_theme_font_size_override("font_size", fs)
	if gold:
		UiTheme.gold_button(b)
		b.add_theme_font_override("font", UiTheme.mincho())
	b.mouse_entered.connect(func(): if b.focus_mode != Control.FOCUS_NONE: b.grab_focus())
	return b

# 横の余白の小さいボタン（コマンドの札を1行に並べるとき）
static func compact(b: Button, padx := 8.0) -> void:
	var th := UiTheme.get_theme()
	for st in ["normal", "hover", "focus", "pressed", "hover_pressed", "disabled"]:
		var sb := (b.get_theme_stylebox(st) if b.has_theme_stylebox_override(st) else th.get_stylebox(st, "Button")).duplicate() as StyleBox
		sb.content_margin_left = padx
		sb.content_margin_right = padx
		b.add_theme_stylebox_override(st, sb)

# 総合力の数の札（docs/UI.md「能力の段」。中身は UiTheme.stat_chip）。lo・hi は前の呼び方の名残：lo が 50 以上なら能力の段で塗る
static func num_chip(v: float, lo := 40.0, _hi := 85.0, big := false) -> PanelContainer:
	return UiTheme.stat_chip(v, "stat" if lo >= 50.0 else "fh", big)

static func spacer() -> Control:
	var s := Control.new()
	s.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return s

# ---- 小窓（docs/UI.md 4「取り返しのつかない確かめは『やめる』を先に選ぶ」） ----
func open_modal(panel: Control, first: Control = null, on_cancel := Callable(), dim_a := 0.62) -> void:
	close_modal()
	_modal_focus = get_viewport().gui_get_focus_owner()
	var dim := ColorRect.new()
	dim.color = Color(0.0, 0.03, 0.02, dim_a)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(dim)
	var cc := CenterContainer.new()
	cc.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.add_child(cc)
	cc.add_child(panel)
	_modal = dim
	_modal_back = on_cancel
	dim.modulate.a = 0.0
	create_tween().tween_property(dim, "modulate:a", 1.0, 0.16)
	if first:
		first.grab_focus.call_deferred()

func close_modal() -> void:
	if _modal == null:
		return
	_modal.queue_free()
	_modal = null
	if is_instance_valid(_modal_focus) and _modal_focus.is_inside_tree():
		_modal_focus.grab_focus()

# 確かめ：本文と、危ない操作のボタン（暗い赤）。カーソルは「やめる」から
func confirm(text: String, ok_label: String, on_ok: Callable) -> void:
	var pb := UiScreen.panel_box(true, 16)
	var p: PanelContainer = pb[0]
	p.custom_minimum_size = Vector2(560, 0)
	var t := UiTheme.title(text, 20)
	t.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	t.custom_minimum_size.x = 520
	(pb[1] as VBoxContainer).add_child(t)
	var h := HBoxContainer.new()
	h.alignment = BoxContainer.ALIGNMENT_END
	h.add_theme_constant_override("separation", 12)
	var no := UiScreen.button("やめる", false, 150, 48, 17)
	no.pressed.connect(close_modal)
	h.add_child(no)
	var ok := UiScreen.danger_button(ok_label)
	ok.pressed.connect(func(): close_modal(); on_ok.call())
	h.add_child(ok)
	(pb[1] as VBoxContainer).add_child(h)
	open_modal(p, no)

# 引退の流れ（厩舎・馬の画面）：確かめ（「やめる」から）→ 殿堂入りの条件を満たす馬は「殿堂入りさせますか」（はい・いいえ）→ HSJockey.retire。
# done(結果) を呼ぶ。殿堂入りの案内で Esc・B を押すと、引退もやめる（持ち主の決定 2026-10-20「引退時に殿堂入りさせるか案内がきます」）
func retire_flow(id: String, done: Callable) -> void:
	var h = HSWorld.horse(id)
	if h == null: return
	var keep: bool = HSOriginal.on() and not h.get("gelding")
	confirm("%sを引退させますか？%s" % [h.name, "（牧場に残り、オリジナルホースの親にできます）" if keep else "（手もとを離れます）"], "引退させる", func():
		if HSHall.ask(h): ask_hall(h, done)
		else: done.call(HSJockey.retire(id, { hall = false })))

# 殿堂入りの案内：トロフィーの札と、入るとどうなるか。カーソルは「はい」から（「いいえ」は記録が消えて戻せない）
func ask_hall(h: Dictionary, done: Callable) -> void:
	var id := String(h.id)
	var pb := UiScreen.panel_box(true, 14)
	var p: PanelContainer = pb[0]
	p.custom_minimum_size = Vector2(640, 0)
	var v: VBoxContainer = pb[1]
	v.add_child(UiTheme.label("殿堂入り", 15, UiTheme.GOLD_BRIGHT))
	var t := UiTheme.title("%sを殿堂入りさせますか？" % h.name, 26)
	t.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	t.custom_minimum_size.x = 600
	v.add_child(t)
	var tl := HFlowContainer.new()
	tl.add_theme_constant_override("h_separation", 6)
	tl.add_theme_constant_override("v_separation", 6)
	for x in HSHall.trophies_of(h): tl.add_child(UiTheme.chip("🏆 " + String(x.label), UiTheme.GOLD_DIM, UiTheme.ON_GOLD, 14))
	v.add_child(tl)
	var note := UiTheme.label("殿堂入りすると、引退したあとも戦績と、1走ごとの出走馬・ラップをデータの殿堂で見られます。させないと、レースの記録は消えます。", 15, UiTheme.MUTED)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.custom_minimum_size.x = 600
	v.add_child(note)
	var hb := HBoxContainer.new()
	hb.alignment = BoxContainer.ALIGNMENT_END
	hb.add_theme_constant_override("separation", 12)
	var no := UiScreen.button("いいえ", false, 150, 50, 18)
	no.pressed.connect(func(): close_modal(); done.call(HSJockey.retire(id, { hall = false })))
	hb.add_child(no)
	var yes := UiScreen.button("はい", true, 190, 54, 20)
	yes.pressed.connect(func(): close_modal(); done.call(HSJockey.retire(id, { hall = true })))
	hb.add_child(yes)
	v.add_child(hb)
	open_modal(p, yes)

# 見せ場（重賞の優勝・トロフィー・スペシャルホース・オリジナルホースの誕生）：光の筋と紙吹雪・大きな明朝の題字。決定で閉じる
func celebrate(kicker: String, title: String, sub: String, on_done := Callable()) -> void:
	var box := Control.new()
	box.custom_minimum_size = Vector2(1600, 1000)
	var fx := UiCelebrate.new()
	box.add_child(fx)
	var v := VBoxContainer.new()
	v.set_anchors_preset(Control.PRESET_CENTER)
	v.grow_horizontal = Control.GROW_DIRECTION_BOTH
	v.grow_vertical = Control.GROW_DIRECTION_BOTH
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 10)
	box.add_child(v)
	v.add_child(UiTheme.label(kicker, 22, UiTheme.GOLD_BRIGHT, HORIZONTAL_ALIGNMENT_CENTER))
	var t := UiTheme.title(title, 76, UiTheme.IVORY)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.7))
	t.add_theme_constant_override("shadow_offset_y", 4)
	v.add_child(t)
	var line := ColorRect.new()
	line.color = UiTheme.GOLD
	line.custom_minimum_size = Vector2(520, 2)
	line.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(line)
	if sub != "":
		var sl := UiTheme.label(sub, 20, UiTheme.IVORY, HORIZONTAL_ALIGNMENT_CENTER)
		v.add_child(sl)
	var b := UiScreen.button("つづける", true, 260, 56, 22)
	b.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	var done := func():
		close_modal()
		if on_done.is_valid(): on_done.call()
	b.pressed.connect(done)
	var bm := MarginContainer.new()
	bm.add_theme_constant_override("margin_top", 30)
	bm.add_child(b)
	bm.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(bm)
	t.scale = Vector2(1.25, 1.25)
	t.pivot_offset = Vector2(400, 50)
	open_modal(box, b, done, 0.88)
	create_tween().tween_property(t, "scale", Vector2.ONE, 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

# 馬主の看板の特徴の札（短距離好きなど。js/ui/ownersui.js の signChip と同じ）：勝負服の2色のうち暗いほうをさらに暗くした地に白い字、縁は明るいほう
static func owner_sign_chip(o: Dictionary, size := 12) -> PanelContainer:
	var a := Color(String(o.silks.base))
	var b := Color(String(o.silks.sub))
	if a.get_luminance() > b.get_luminance():
		var t := a; a = b; b = t
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.box(a.darkened(0.3), b, 1, 999, Vector4(9, 1, 9, 2)))
	p.add_child(UiTheme.label(HSOwners.sign_label(o), size, Color.WHITE, HORIZONTAL_ALIGNMENT_CENTER))
	p.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	p.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	return p

# まだ縁の無い馬主の顔（伏せて「？」）
static func owner_q_face(w: float, h: float) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SUNK, UiTheme.LINE_STRONG, 2, 10, Vector4(0, 0, 0, 0)))
	p.custom_minimum_size = Vector2(w, h)
	p.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var q := UiTheme.title("？", int(minf(w, h) * 0.5), UiTheme.GOLD_DIM)
	q.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	q.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	p.add_child(q)
	return p

# 馬主の顔の絵：持ち主の絵（webp）、無ければコードで描いた顔（svg。tools/owner_faces.js）。どちらも無ければ ""
static func owner_face_path(oid: String, mood: String) -> String:
	for ext in ["webp", "svg"]:
		var p := "res://assets/owners/%s_%s.%s" % [oid, mood, ext]
		if ResourceLoader.exists(p): return p
	return ""

# 馬主のご褒美の場面（js/ui/ownersui.js の ownerScene）：胸から上の顔・何が起きたか・名前と立場・台詞・ご褒美・「ありがとうございます」
# 縁ができたとき（kind "meet"）は、初めて声をかけてくる場面（看板の特徴・次の週から依頼が来る・「よろしくお願いします」）
# 課題をやり終えたとき（kind "m1"〜"m5"）は、お礼と、次の依頼（課題）を出す
const OWNER_KICK := {"meet": "新しい馬主から声がかかった", "m1": "「OP」の依頼をやり終えた", "m2": "「G3」の依頼をやり終えた", "m3": "「G2」の依頼をやり終えた", "m4": "「G1」の依頼をやり終えた", "m5": "すべての依頼をやり終えた", "award": "名コンビ賞"}
func owner_scene(q: Dictionary, on_done := Callable()) -> void:
	var o = HSOwners.by(String(q.oid))
	if o == null:
		if on_done.is_valid(): on_done.call()
		return
	var p := PanelContainer.new()
	var sb := UiTheme.panel_gold(0.95)
	sb.border_color = Color(String(o.silks.base)).lerp(UiTheme.GOLD, 0.5)
	sb.set_border_width_all(2)
	p.add_theme_stylebox_override("panel", sb)
	p.custom_minimum_size = Vector2(1000, 520)
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 28)
	p.add_child(hb)
	var meet: bool = q.get("kind") == "meet"
	var fp := owner_face_path(String(q.oid), "smile" if meet else "joy")
	if fp != "":
		var tr := TextureRect.new()
		tr.texture = load(fp)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(380, 480)
		hb.add_child(tr)
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 10)
	hb.add_child(v)
	v.add_child(UiTheme.label(String(OWNER_KICK.get(q.kind, "")), 18, UiTheme.GOLD_BRIGHT))
	var nh := HBoxContainer.new()
	nh.add_theme_constant_override("separation", 12)
	nh.add_child(UiTheme.title(String(o.name), 34))
	nh.add_child(UiTheme.label(String(o.get("title", "")), 14, UiTheme.MUTED))
	nh.add_child(owner_sign_chip(o, 14))
	v.add_child(nh)
	var lines := HSOwners.scene_lines(String(q.oid), String(q.kind), {"horse": q.get("horse", ""), "race": q.get("race", "")})
	var labs: Array = []
	for t in lines:
		var l := UiTheme.label("「%s」" % t, 17)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.custom_minimum_size.x = 520
		l.modulate.a = 0.0
		v.add_child(l)
		labs.append(l)
	if q.get("reward"):
		var rl := UiTheme.label("ご褒美：%s" % q.reward, 18, UiTheme.GOLD_BRIGHT)
		rl.modulate.a = 0.0
		v.add_child(rl)
		labs.append(rl)
	if meet:
		var ml := UiTheme.label("次の週から騎乗依頼が来る", 18, UiTheme.GOLD_BRIGHT)
		ml.modulate.a = 0.0
		v.add_child(ml)
		labs.append(ml)
		var nl := UiTheme.label("%sの馬主。%s" % [HSOwners.sign_label(o), o.get("note", "")], 13, UiTheme.MUTED)
		nl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		nl.custom_minimum_size.x = 520
		nl.modulate.a = 0.0
		v.add_child(nl)
		labs.append(nl)
	# 次の依頼（課題）：出会いなら OP の課題、m1〜m4 なら次の段階の課題
	var k := 0 if meet else (int(String(q.kind).substr(1)) if String(q.kind) in ["m1", "m2", "m3", "m4"] else -1)
	if k >= 0 and o.get("missions") and k < o.missions.size():
		var mi: Dictionary = o.missions[k]
		var al := UiTheme.label("「%s」\n次の依頼（%s）：%s" % [HSOwners.fill_(String(mi.say), {}), HSOwners.STAGES[k].label, mi.text], 15, UiTheme.IVORY)
		al.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		al.custom_minimum_size.x = 520
		al.modulate.a = 0.0
		v.add_child(al)
		labs.append(al)
	var b := UiScreen.button("よろしくお願いします" if meet else "ありがとうございます", true, 300, 54, 20)
	var done := func():
		close_modal()
		if on_done.is_valid(): on_done.call()
	b.pressed.connect(done)
	v.add_child(b)
	open_modal(p, b, done)
	for i in labs.size():
		create_tween().tween_property(labs[i], "modulate:a", 1.0, 0.3).set_delay(0.15 + i * 0.35)

# 危ない操作（引退・放す・消す）のボタン：暗い赤
static func danger_button(text: String, w := 180.0, h := 48.0, fs := 17) -> Button:
	var b := UiScreen.button(text, false, w, h, fs)
	var n := UiTheme.box(Color("5a1f1c"), Color("8a3a33"), 1, UiTheme.R_BUTTON, Vector4(20, 9, 20, 11))
	n.border_width_bottom = 4
	var f := n.duplicate() as StyleBoxFlat
	f.border_color = UiTheme.BAD
	f.set_border_width_all(2)
	f.border_width_bottom = 4
	b.add_theme_stylebox_override("normal", n)
	b.add_theme_stylebox_override("hover", f)
	b.add_theme_stylebox_override("focus", f)
	return b

# ---- トースト（押した結果のひと言。下の真ん中に 2.2 秒） ----
func toast(text: String, kind := "") -> void:
	if _toast:
		_toast.queue_free()
	_toast = PanelContainer.new()
	var col := UiTheme.BAD if kind == "bad" else (UiTheme.GOOD if kind == "good" else UiTheme.GOLD)
	_toast.add_theme_stylebox_override("panel", UiTheme.box(Color(UiTheme.SUNK.r, UiTheme.SUNK.g, UiTheme.SUNK.b, 0.95), col, 1, 999, Vector4(22, 8, 22, 9)))
	_toast.add_child(UiTheme.label(text, 15, UiTheme.IVORY))
	_toast.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_toast.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_toast.position.y = -96
	_toast.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_toast)
	_toast_until = clock + 2.2

# ---- 操作の案内（右下。左に選んでいる札のひと言） ----
func _build_keybar() -> void:
	kb_holder = HBoxContainer.new()
	kb_holder.add_theme_constant_override("separation", 14)
	kb_holder.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	kb_holder.offset_left = PAD_X
	kb_holder.offset_right = -PAD_X
	kb_holder.offset_top = -44
	kb_holder.offset_bottom = -12
	kb_holder.alignment = BoxContainer.ALIGNMENT_END
	kb_holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(kb_holder)
	kb_hint = UiTheme.label(hint(), 13, UiTheme.MUTED)
	kb_holder.add_child(kb_hint)
	keybar = UiTheme.keybar(keys(), pad)
	kb_holder.add_child(keybar)

func refresh_keybar() -> void:
	if keybar:
		keybar.queue_free()
		keybar = UiTheme.keybar(keys(), pad)
		kb_holder.add_child(keybar)
	if kb_hint:
		kb_hint.text = hint()

# ---- 入りの動き（中身が下から 0.24 秒・帯は 0.34 秒） ----
func enter_anim() -> void:
	for c in get_children():
		if c == band or (c is Control and c != fade and c != kb_holder and (c as Control).mouse_filter != Control.MOUSE_FILTER_IGNORE):
			var ctl := c as Control
			ctl.modulate.a = 0.0
			var tw := create_tween().set_parallel(true)
			tw.tween_property(ctl, "modulate:a", 1.0, 0.34 if c == band else 0.24)
			if c != band:
				var y0 := ctl.position.y
				ctl.position.y = y0 + 14.0
				tw.tween_property(ctl, "position:y", y0, 0.24).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)

func _input(ev: InputEvent) -> void:
	var p := ev is InputEventJoypadButton or ev is InputEventJoypadMotion
	if (ev is InputEventKey or ev is InputEventJoypadButton) and p != pad:
		pad = p
		refresh_keybar()

func _unhandled_input(ev: InputEvent) -> void:
	if shots.size() > 0:
		return
	if ev.is_action_pressed("ui_cancel"):
		if _modal != null:
			if _modal_back.is_valid(): _modal_back.call()
			else: close_modal()
		else:
			on_back()
		get_viewport().set_input_as_handled()
		return
	var d := 0
	if ev is InputEventKey and ev.pressed and not ev.echo:
		if ev.keycode in [KEY_Q, KEY_PAGEUP]: d = -1
		elif ev.keycode in [KEY_E, KEY_PAGEDOWN]: d = 1
	elif ev is InputEventJoypadButton and ev.pressed:
		if ev.button_index == JOY_BUTTON_LEFT_SHOULDER: d = -1
		elif ev.button_index == JOY_BUTTON_RIGHT_SHOULDER: d = 1
	if d != 0:
		on_tab(d)
		get_viewport().set_input_as_handled()

func _process(delta: float) -> void:
	if shots.size() > 0:
		return
	clock += delta
	_tick()

func _tick() -> void:
	if _toast and clock > _toast_until:
		_toast.queue_free()
		_toast = null

# ---- 撮影 ----
func _parse_args() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="):
			out_dir = a.substr(6)
		elif a.begins_with("--shot="):
			var p := a.substr(7).split(":")
			shots.append({"t": float(p[0]), "name": p[1]})
		elif a == "--demo":
			demo = 0
		elif a.begins_with("--demo="):
			demo = int(a.substr(7))

func _capture() -> void:
	DirAccess.make_dir_recursive_absolute(out_dir)
	focus_first()
	var step := 1.0 / 30.0
	for sh in shots:
		while clock < float(sh.t) - 1e-4:
			var d := minf(step, float(sh.t) - clock)
			clock += d
			_tick()
			for tw in get_tree().get_processed_tweens():
				tw.custom_step(d)
			await get_tree().process_frame
		for k in 3:
			await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(out_dir.path_join(String(sh.name) + ".png"))
		print("shot ", sh.name)
	print("done")
	get_tree().quit()
