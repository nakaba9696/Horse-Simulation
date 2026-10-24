# 騎乗の外の画面の土台（docs/UI.md）：背景の写真と深緑の幕・見出しの帯・帯の数・節の見出し・操作の案内・トースト・入りの動き・撮影。
# 画面（ホーム・番組表・週の結果・タイトル・馬の店）はこれを継いで build() で中身を組む。部品は UiTheme のものを使う。
# 操作（docs/UI.md 4）：十字キー・矢印で選ぶ（Godot の ui_* の割り当て）・A／Enter で決定・B／Esc でもどる（on_back）・LB/RB・Q/E でタブ（on_tab）
# 撮影：-- --out=DIR --shot=秒:名前 …（決まった刻みで進めて撮り、撮り終えたら閉じる）。--demo[=週] で決まった種の新しいゲームから始める（UiFlow.demo）
class_name UiScreen
extends Control

const PAD_X := 24.0
const TOP := 104.0           # 帯の下
# 下のメニューのある画面の場所の取り決め（docs/UI.md「下のメニュー」。並行の仕事のため固定）：
# 中身は TOP〜BOTTOM（スクロールしない）・キーの案内の行は KEYS_Y〜UiNav.Y・下のメニューは UiNav.Y〜1000
const BOTTOM := 872.0
const KEYS_Y := 880.0

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
var _modal_locked: Array = []    # 小窓の間、カーソルが乗らないようにした後ろの札 [札, 前の focus_mode]
var _toast: PanelContainer
var _toast_until := 0.0
var nav_bar: UiNav = null        # 下のメニュー（nav() が "" でない画面）
var _trig := {}                  # LT・RT を押している間（軸の揺れで何度も移らない）

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	theme = UiTheme.get_theme()
	pad = Input.get_connected_joypads().size() > 0
	UiSettings.boot()        # 設定（画面の大きさ・音量・振動・割り当て。user://settings.cfg）を1回だけ読んで効かせる
	add_child(UiPad.new())   # パッドの A・B・十字キーの押しっぱなし・左スティック（ui/pad.gd）
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
			if OS.get_cmdline_user_args().has("--setup=inbreed"):
				# 撮影の見本：インブリードの見える牧場（史実の名馬を引退馬として置く。ディープインパクト × ジェンティルドンナは親子で選べない）
				for nm in ["ディープインパクト", "ドゥラメンテ", "ゴールドシップ", "ジェンティルドンナ", "アーモンドアイ", "デアリングタクト"]:  # i18n:skip（撮影の見本）
					var d = HSWorld.histByName.get(nm)
					if d == null: continue
					var h := HSHorse.from_historic(d, HSWorld.new_id())
					h.owner = "P"; h.loc = "retired"; h.retiredY = HSWorld.G.year
					HSWorld.G.horses[h.id] = h
				HSWorld.dirty()
			if OS.get_cmdline_user_args().has("--setup=fatigue"):
				UiFlow.demo_fatigue()   # 撮影の見本：疲労の段階が並ぶように
			if OS.get_cmdline_user_args().has("--setup=owners8"):
				# 撮影の見本：8人の段階がばらばら（会っていない人・OP〜お手馬・やり終えた人）
				var plan := {"makino": [1, 30.0], "sengoku": [3, 62.0], "yuni": [2, 47.0], "takenouchi": [0, 18.0], "takarada": [5, 100.0], "lucy": [4, 80.0]}
				for o in HSOwners.LIST():
					var st := HSOwners.of(String(o.id))
					st.known = plan.has(o.id)
					if not st.known: st.pts = 2.0   # 出会いの点（2点たまっている見本）
					if plan.has(o.id):
						st.known = true; st.stage = float(plan[o.id][0]); st.pts = plan[o.id][1]; st.rides = 12.0; st.wins = 3.0
						if st.stage >= HSOwners.WEAR_STAGE: st.got.t2 = { y = HSWorld.G.year }
						if st.stage >= HSOwners.DONE: st.got.item = { y = HSWorld.G.year }
				# ミッションの予定（千石さんの依頼は今週に届いたことにする）
				HSOwners.plan_missing()
				var sj = HSOwners.of("sengoku").get("job")
				if sj: sj.at = minf(sj.at, HSWorld.w_idx())
				HSOwners.tick()
				HSOwners.state().queue = []
			if OS.get_cmdline_user_args().has("--setup=met2"):
				# 撮影の見本：縁があるのは2人だけ（オーナーの一覧で、縁のあるオーナーとまだのオーナーが並ぶ）
				for o in HSOwners.LIST():
					HSOwners.of(String(o.id)).known = String(o.id) in ["sengoku", "makino"]
				HSOwners.of("yuni").pts = 2.0
				HSOwners.plan_missing()
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
		celebrate("トロフィーを手にした", "三冠", "サンプルホース・ボーナス賞金 5億円")  # i18n:skip（撮影の見本）
	elif args.has("--setup=scene"):
		owner_scene({"oid": "makino", "kind": "m1", "horse": "サンプルホース", "race": "3歳オープン", "reward": "お礼 300万円"})  # i18n:skip
	elif args.has("--setup=meet"):
		# 縁ができたときの場面（初めて声をかけてくる）
		owner_scene({"oid": "sengoku", "kind": "meet", "horse": "サンプルホース", "race": "2歳オープン", "reward": ""})  # i18n:skip
	elif args.has("--setup=job"):
		# ミッションの依頼が届いた場面（G1 の段階の依頼の馬とレース）
		owner_scene({"oid": "makino", "kind": "job", "k": 3.0, "horse": "ハイセイコー", "race": "日本ダービー", "date": "2年目5月4週", "retry": false, "y": 2026.0})  # i18n:skip
	elif args.has("--setup=wreath"):
		# GF を全制覇したときのイロナの花輪（アイテム）
		owner_scene({"oid": "gfhost", "kind": "wreath", "horse": "", "race": "", "reward": "一族の花輪（1頭の馬からオリジナルホースを作れる数＋1）"})  # i18n:skip
	elif args.has("--setup=meet_yuni"):
		# 絵の無い人の出会い（顔は出さず色の帯だけ）
		owner_scene({"oid": "yuni", "kind": "meet", "horse": "サンプルホース", "race": "2歳オープン", "reward": ""})  # i18n:skip
	elif args.has("--setup=scene_violaine"):
		# 課題をやり終えた場面（G2 の課題・勝負服）
		owner_scene({"oid": "violaine", "kind": "m3", "horse": "サンプルホース", "race": "目黒記念", "reward": "お礼 1,000万円・ヴィオレーヌ・ド・サン＝クレールさんの勝負服を自分の馬に着せられる"})  # i18n:skip
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
# 下のメニュー：光らせる札の鍵（UiFlow.NAV）。"" なら出さない。既定は UiFlow.NAV_ON（画面ごとに1行）
func nav() -> String: return String(UiFlow.NAV_ON.get(UiFlow.scene_key(scene_file_path), ""))

# 中身の下の端（下のメニューのある画面は BOTTOM、無い画面は前のまま操作の案内の上）
func bottom() -> float:
	return BOTTOM if nav() != "" else 1000.0 - 56.0

# ---- 画面の移り（暗くしてから） ----
var went := ""   # 最後に go した画面（テストが見る）

func go(name: String) -> void:
	if shots.size() > 0:
		return
	went = name
	var tw := create_tween()
	tw.tween_property(fade, "color:a", 1.0, 0.16)
	tw.tween_callback(func(): UiFlow.go(get_tree(), name))

# ---- 背景の写真（覆うように置く）と、左ほど濃い深緑の幕 ----
# img に ".png" を付けると部品の絵の背景（godot/assets/ui/bg_*.png。UiSkin）。読めなければ同じ名前の写真（.jpg）
func backdrop(img: String, strength := 0.82) -> void:
	var base := ColorRect.new()
	base.color = UiTheme.BG
	base.set_anchors_preset(Control.PRESET_FULL_RECT)
	base.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(base)
	var tex = null
	if img.ends_with(".png"):
		img = img.get_basename()
		tex = UiSkin.background(img)
	if tex == null:
		tex = load("res://assets/ui/%s.jpg" % img) if ResourceLoader.exists("res://assets/ui/%s.jpg" % img) else null
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
# icon（UiSkin のアイコンの名前）を渡すと、部品の絵の帯（band_title）と丸い札に金の線画のアイコン。絵が無ければ前の形（金の丸に mark の字）
func make_band(mark: String, title: String, sub: String, stats: Array, icon := "") -> UiBand:
	band = UiTheme.band(76)
	if icon != "":
		band.art = UiSkin.band(76)
		if band.art != null:
			# 中身の余白は絵の帯の余白（左右の金の飾りの内に置く）
			var em := StyleBoxEmpty.new()
			for sd in [SIDE_LEFT, SIDE_TOP, SIDE_RIGHT, SIDE_BOTTOM]:
				em.set_content_margin(sd, band.art.get_content_margin(sd))
			band.add_theme_stylebox_override("panel", em)
	band.set_anchors_preset(Control.PRESET_TOP_WIDE)
	band.offset_left = PAD_X
	band.offset_right = -PAD_X
	band.offset_top = 16
	band.offset_bottom = 92
	add_child(band)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 14)
	band.add_child(h)
	var ri = UiSkin.round_icon(icon, 58) if icon != "" else null
	if ri != null:
		h.add_child(ri)
	else:
		var rn := PanelContainer.new()
		rn.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.GOLD_FACE[1], UiTheme.GOLD_FACE[0], 2, 999, Vector4(0, 0, 0, 0)))
		rn.custom_minimum_size = Vector2(52, 52)
		rn.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		var ml := UiTheme.title((HSText.auto(mark) if HSText.auto(mark) != mark else HSText.auto(title)).left(1) if HSText.is_en() else mark, 24, UiTheme.ON_GOLD)
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
# art＝部品の絵の節の帯（band_section。左に金の印）。絵が無ければ前の形
static func section(text: String, note := "", art := false) -> Control:
	var sb = UiSkin.section(36) if art else null
	if sb != null:
		var p := PanelContainer.new()
		p.add_theme_stylebox_override("panel", sb)
		p.custom_minimum_size.y = 36
		var ah := HBoxContainer.new()
		ah.add_theme_constant_override("separation", 8)
		p.add_child(ah)
		ah.add_child(UiTheme.title(text, 17, UiTheme.IVORY))
		if note != "":
			ah.add_child(UiScreen.spacer())
			ah.add_child(UiTheme.label(note, 13, UiTheme.MUTED))
		return p
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

# 面の台を target（表の ScrollContainer・行の並び）の後ろに敷く。押せる行を写真の上に直に置かない（docs/UI.md「色の役目」）
# fit を渡すと、台の高さは fit（表の中身）の高さまで（短い表の下に空の台を伸ばさない）。target・fit の大きさが変わると付いていく
static func back_under(target: Control, fit: Control = null, grow := 8.0) -> Panel:
	var bk := Panel.new()
	bk.add_theme_stylebox_override("panel", UiTheme.backing_around(grow))
	bk.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var par := target.get_parent()
	par.add_child(bk)
	par.move_child(bk, target.get_index())
	var sync := func() -> void:
		var h := target.size.y
		if fit != null:
			h = minf(h, fit.size.y) if h > 1.0 else fit.size.y
		bk.position = target.position
		bk.size = Vector2(target.size.x, h)
		bk.visible = h > 1.0
	target.resized.connect(sync)
	target.item_rect_changed.connect(sync)
	if fit != null:
		fit.resized.connect(sync)
	sync.call()
	return bk

# 板（写真が透ける深緑）に縦の並びを入れて返す。art＝部品の絵の札（panel_card。gold なら金の縁が光る札）
static func panel_box(gold := false, sep := 8, art := false) -> Array:
	var p := PanelContainer.new()
	var sb = UiSkin.card(gold) if art else null
	p.add_theme_stylebox_override("panel", sb if sb != null else (UiTheme.panel_gold(0.88) if gold else UiTheme.panel(0.84)))
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", sep)
	p.add_child(v)
	return [p, v]

# 押せる行（表の行の札。選ぶと金の線）。中身の HBox を返す
# art＝部品の絵の行（row_normal・row_focus。両端の金の飾りの内に中身を置く）。絵が無ければ前の形
static func row_button(h := 40.0, mine := false, art := false) -> Array:
	var b := Button.new()
	b.custom_minimum_size = Vector2(0, h)
	b.focus_mode = Control.FOCUS_ALL
	b.set_meta("ui_row", true)   # 表の行（色の役目の物差しで行として測る）
	var inset := 12.0
	if art and UiSkin.row_button(b, h, mine, Vector4(0, 0, 0, 0), 0.8):
		inset = 40.0
	else:
		b.add_theme_stylebox_override("normal", UiTheme.row_box(0, false, mine))
		var hov := UiTheme.row_box(0, false, mine)
		hov.bg_color = UiTheme.ROW_HI
		b.add_theme_stylebox_override("hover", hov)
		for st in ["focus", "pressed", "hover_pressed"]:
			b.add_theme_stylebox_override(st, UiTheme.row_box(0, true, mine))
	var hb := HBoxContainer.new()
	hb.set_anchors_preset(Control.PRESET_FULL_RECT)
	hb.offset_left = inset
	hb.offset_right = -inset
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

# art＝部品の絵のボタン（金の面 btn_main・深緑に金の縁 btn_sub。4つの状態）。絵が無ければ前の形
static func button(text: String, gold := false, w := 0.0, h := 44.0, fs := 18, art := false) -> Button:
	var b := Button.new()
	b.text = HSText.auto(text)   # 画面の言語（キーと同じ文なら英語）
	b.custom_minimum_size = Vector2(w, h)
	b.add_theme_font_size_override("font_size", fs)
	var drawn := art and UiSkin.button(b, "main" if gold else "sub", h)
	if gold:
		if not drawn: UiTheme.gold_button(b)
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
	# 小窓の間は、カーソルが後ろの札へ抜けないように（十字キーは小窓の中だけを動く）
	_modal_locked = []
	for c in find_children("*", "Control", true, false):
		var ctl := c as Control
		if ctl.focus_mode != Control.FOCUS_NONE and not dim.is_ancestor_of(ctl):
			_modal_locked.append([ctl, ctl.focus_mode])
			ctl.focus_mode = Control.FOCUS_NONE
	dim.modulate.a = 0.0
	create_tween().tween_property(dim, "modulate:a", 1.0, 0.16)
	if first:
		first.grab_focus.call_deferred()

func close_modal() -> void:
	if _modal == null:
		return
	_modal.queue_free()
	_modal = null
	for x in _modal_locked:
		if is_instance_valid(x[0]): (x[0] as Control).focus_mode = x[1]
	_modal_locked = []
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

# 引退の流れ（厩舎・馬の画面）：確かめ（「やめる」から）→ HSJockey.retire。done(結果) を呼ぶ。
# トロフィーを1つ以上手にした馬は案内なしで殿堂入りする（持ち主の決定 2026-10-20「殿堂入りは自動」）。確かめの文にそのことを添える
func retire_flow(id: String, done: Callable) -> void:
	var h = HSWorld.horse(id)
	if h == null: return
	var keep: bool = HSOriginal.on() and not h.get("gelding")
	var hall := "トロフィーを手にしたので、殿堂入りします。" if HSHall.will(h) else ""
	confirm(HSText.t("%sを引退させますか？\n%s%s") % [HSText.horse_name(h), HSText.t("牧場に残り、オリジナルホースの親にできます。" if keep else "手もとを離れます。"), HSText.t(hall)], "引退させる", func():
		done.call(HSJockey.retire(id)))

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

# オーナーの看板の特徴の札（短距離好きなど。js/ui/ownersui.js の signChip と同じ）：勝負服の2色のうち暗いほうをさらに暗くした地に白い字、縁は明るいほう
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

# まだ縁の無いオーナー：顔の枠は出さず、色の無い細い帯だけ（伏せる）
static func owner_q_face(_w: float, h: float) -> PanelContainer:
	return owner_band(UiTheme.SUNK, UiTheme.LINE_STRONG, h)

# オーナーの色の帯（絵の無い人の顔の代わり。顔の枠・仮の丸・頭文字は描かない。持ち主の指示 2026-10-20）
static func owner_band(base: Color, edge: Color, h: float) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.box(base, edge, 1, 3, Vector4(0, 0, 0, 0)))
	p.custom_minimum_size = Vector2(8, h)
	p.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return p

# オーナーの顔の絵：持ち主の絵（webp）だけ。無ければ ""（コードで描いた顔は作らない・置かない。持ち主の指示 2026-10-20）
static func owner_face_path(oid: String, mood: String) -> String:
	var p := "res://assets/owners/%s_%s.webp" % [oid, mood]
	return p if ResourceLoader.exists(p) else ""

# オーナーの顔：絵がある人は勝負服の色の角丸の枠に絵、無い人は顔の枠ごと出さず勝負服の色の帯だけ
static func owner_face(o: Dictionary, mood: String, w: float, h: float, radius := 10, border := 2) -> Control:
	var p := owner_face_path(String(o.id), mood)
	if p == "": return owner_band(Color(String(o.silks.base)), Color(String(o.silks.sub)), h)
	var fr := PanelContainer.new()
	fr.add_theme_stylebox_override("panel", UiTheme.box(Color(String(o.silks.base)), Color(String(o.silks.sub)), border, radius, Vector4(0, 0, 0, 0)))
	fr.clip_children = CanvasItem.CLIP_CHILDREN_AND_DRAW
	fr.custom_minimum_size = Vector2(w, h)
	fr.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var tr := TextureRect.new()
	tr.texture = load(p)
	tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	tr.custom_minimum_size = Vector2(w, h)
	fr.add_child(tr)
	return fr

# オーナーの場面（js/ui/ownersui.js の ownerScene）：胸から上の顔・何が起きたか・名前と立場・台詞・ご褒美・「ありがとうございます」
# 縁ができたとき（kind "meet"）は、初めて声をかけてくる場面（看板の特徴・最初のミッション・「よろしくお願いします」）
# 依頼が届いたとき（kind "job"）は、依頼の馬とレース。ミッションをやり終えたとき（kind "m1"〜"m5"）は、お礼と次のミッション
# GF を全制覇したとき（kind "wreath"）は、GF の一族の人（イロナ）の花輪とアイテム
const OWNER_KICK := {"meet": "新しいオーナーから声がかかった", "job": "騎乗依頼が届いた", "m1": "「OP」の依頼をやり終えた", "m2": "「G3」の依頼をやり終えた", "m3": "「G2」の依頼をやり終えた", "m4": "「G1」の依頼をやり終えた", "m5": "すべての依頼をやり終えた", "award": "名コンビ賞", "wreath": "GF 全制覇の花輪"}
func owner_scene(q: Dictionary, on_done := Callable()) -> void:
	var host: bool = q.get("kind") == "wreath"
	var o = HSGFHost.data() if host else HSOwners.by(String(q.oid))
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
	var fp := owner_face_path(String(o.id), "smile" if meet else "joy")
	if fp != "":
		var tr := TextureRect.new()
		tr.texture = load(fp)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(380, 480)
		hb.add_child(tr)
	else:
		# 絵の無い人は顔を出さず、その人の色の帯だけ（文を詰めて左に寄せる）
		hb.add_child(owner_band(Color(String(o.silks.base)), Color(String(o.silks.sub)), 440))
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 10)
	hb.add_child(v)
	v.add_child(UiTheme.label(HSText.t(String(OWNER_KICK.get(q.kind, ""))), 18, UiTheme.GOLD_BRIGHT))
	var nh := HBoxContainer.new()
	nh.add_theme_constant_override("separation", 12)
	nh.add_child(UiTheme.title(String(o.name), 34))
	nh.add_child(UiTheme.label(HSText.owner_line(String(o.get("title", ""))), 14, UiTheme.MUTED))
	if not host: nh.add_child(owner_sign_chip(o, 14))
	v.add_child(nh)
	var vars := {"horse": q.get("horse", ""), "race": q.get("race", "")}
	var lines: Array = HSGFHost.scene_lines(vars) if host else ([HSOwners.job_line(String(q.oid), q)] if q.get("kind") == "job" else HSOwners.scene_lines(String(q.oid), String(q.kind), vars))
	var labs: Array = []
	for t in lines:
		var l := UiTheme.label(HSText.t("「%s」") % HSText.owner_line(String(t)), 17)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.custom_minimum_size.x = 520
		l.modulate.a = 0.0
		v.add_child(l)
		labs.append(l)
	if q.get("reward"):
		var rl := UiTheme.label(HSText.t("ご褒美：%s") % HSText.tx(String(q.reward)), 18, UiTheme.GOLD_BRIGHT)
		rl.modulate.a = 0.0
		v.add_child(rl)
		labs.append(rl)
	if meet:
		var nl := UiTheme.label(HSText.t("%sのオーナー。%s") % [HSText.t(HSOwners.sign_label(o)), HSText.owner_line(String(o.get("note", "")))], 13, UiTheme.MUTED)
		nl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		nl.custom_minimum_size.x = 520
		nl.modulate.a = 0.0
		v.add_child(nl)
		labs.append(nl)
	# 届いた依頼の中身／次のミッション（出会いなら OP の段階、m1〜m4 なら次の段階）と、その予定
	var note := ""
	if not host and q.get("kind") == "job":
		note = HSText.t("依頼（%s）：%sで%sを勝つ（%s）") % [HSText.t(HSOwners.STAGES[int(q.k)].label), HSText.horse_name(String(q.horse)), HSText.race_name(String(q.race)), HSText.tx(String(q.get("date", "")))]
		var fa = HSOwners.mission_fact(o, int(q.k))
		if fa: note += "　【%s】%s" % [HSText.t(fa.label), (HSText.t("\n史実：") + HSText.tx(String(fa.real))) if fa.ifs else ""]
	elif not host:
		var k := 0 if meet else (int(String(q.kind).substr(1)) if String(q.kind) in ["m1", "m2", "m3", "m4"] else -1)
		if k >= 0 and HSOwners.mission_of(o, k):
			var sj = HSOwners.of(String(q.oid)).get("job")
			note = HSText.t("次のミッション（%s）：%s") % [HSText.t(HSOwners.STAGES[k].label), HSText.mission(o, k)]
			if sj and sj.k == k: note += HSText.t("\n%sのレース。依頼はその%d週前に届く") % [HSText.date_label(float(sj.y), float(sj.m), float(sj.w)), int(HSOwners.LEAD)]
	if note != "":
		var al := UiTheme.label(note, 15, UiTheme.IVORY)
		al.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		al.custom_minimum_size.x = 520
		al.modulate.a = 0.0
		v.add_child(al)
		labs.append(al)
	var b := UiScreen.button("よろしくお願いします" if (meet or q.get("kind") == "job") else "ありがとうございます", true, 300, 54, 20)
	var done := func():
		close_modal()
		if on_done.is_valid(): on_done.call()
	b.pressed.connect(done)
	v.add_child(b)
	open_modal(p, b, done)
	for i in labs.size():
		create_tween().tween_property(labs[i], "modulate:a", 1.0, 0.3).set_delay(0.15 + i * 0.35)

# 危ない操作（引退・放す・消す）のボタン：暗い赤
# 危ない操作（売る・引退・消す）：赤い革の面・赤い縁（押せる物の形はほかのボタンと同じ。docs/UI.md「色の役目」）
static func danger_button(text: String, w := 180.0, h := 48.0, fs := 17) -> Button:
	var b := UiScreen.button(text, false, w, h, fs)
	var n := UiTheme.box(UiTheme.DANGER, UiTheme.DANGER_EDGE, 2, UiTheme.R_BUTTON, Vector4(20, 9, 20, 11))
	n.shadow_color = Color(0, 0, 0, 0.7)
	n.shadow_size = 2
	n.shadow_offset = Vector2(0, 4)
	var f := n.duplicate() as StyleBoxFlat
	f.bg_color = UiTheme.DANGER.lightened(0.12)
	f.border_color = UiTheme.BAD
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
	_toast.position.y = -96 if nav_bar == null else KEYS_Y - 1000.0 - 56.0
	_toast.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_toast)
	_toast_until = clock + 2.2

# ---- 操作の案内（右下。左に選んでいる札のひと言） ----
func _build_keybar() -> void:
	var nk := nav()
	nav_bar = null
	if nk != "":
		nav_bar = UiNav.make(nk, nav_pick)
		add_child(nav_bar)
	kb_holder = HBoxContainer.new()
	kb_holder.add_theme_constant_override("separation", 14)
	kb_holder.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	kb_holder.offset_left = PAD_X
	kb_holder.offset_right = -PAD_X
	kb_holder.offset_top = -44 if nav_bar == null else KEYS_Y - 1000.0
	kb_holder.offset_bottom = -12 if nav_bar == null else UiNav.Y - 1000.0
	kb_holder.alignment = BoxContainer.ALIGNMENT_END
	kb_holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(kb_holder)
	kb_hint = UiTheme.label(hint(), 13, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
	kb_hint.size_flags_horizontal = Control.SIZE_EXPAND_FILL   # 長いひと言（英語など）は左の端で切る
	kb_hint.clip_text = true
	kb_hint.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	kb_holder.add_child(kb_hint)
	keybar = UiTheme.keybar(all_keys(), pad)
	kb_holder.add_child(keybar)

# 操作の案内：画面のキーに、下のメニューの開き方（1〜8・LT/RT）を足す
func all_keys() -> Array:
	return keys() + ([["1〜8", "LT/RT", "行き先"]] if nav_bar != null else [])

func refresh_keybar() -> void:
	if keybar:
		keybar.queue_free()
		keybar = UiTheme.keybar(all_keys(), pad)
		kb_holder.add_child(keybar)
	if kb_hint:
		kb_hint.text = HSText.auto(hint())

# ---- 入りの動き（中身が下から 0.24 秒・帯は 0.34 秒） ----
func enter_anim() -> void:
	for c in get_children():
		if c == band or (c is Control and c != fade and c != kb_holder and c != nav_bar and (c as Control).mouse_filter != Control.MOUSE_FILTER_IGNORE):
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
	if nav_bar != null and _modal == null and _nav_input(ev):
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

# ---- 下のメニュー（docs/UI.md 4「選ぶ操作」）：キーボードの 1〜8 でその札、パッドの LT・RT で前・次の行き先 ----
func _nav_input(ev: InputEvent) -> bool:
	if ev is InputEventKey and ev.pressed and not ev.echo:
		var k: int = ev.keycode
		var i := -1
		if k >= KEY_1 and k <= KEY_9: i = k - KEY_1
		elif k >= KEY_KP_1 and k <= KEY_KP_9: i = k - KEY_KP_1
		if i >= 0 and i < UiFlow.NAV.size():
			nav_pick(String(UiFlow.NAV[i][0]))
			return true
	elif ev is InputEventJoypadMotion and int(ev.axis) in [JOY_AXIS_TRIGGER_LEFT, JOY_AXIS_TRIGGER_RIGHT]:
		var ax := int(ev.axis)
		if ev.axis_value > 0.6 and not _trig.get(ax, false):
			_trig[ax] = true
			nav_step(-1 if ax == JOY_AXIS_TRIGGER_LEFT else 1)
			return true
		if ev.axis_value < 0.3: _trig[ax] = false
	return false

# 札を押した（その画面へ）。いまいる画面の札は何もしない。その他は小窓
func nav_pick(key: String) -> void:
	if _modal != null or nav_bar == null: return
	if key == nav_bar.cur and key != "more": return
	if key == "more":
		open_more()
		return
	var why := UiFlow.nav_prepare(key)
	if why != "":
		toast(why, "bad")
		return
	nav_leave()
	go(key)

# 前・次の行き先（移れない行き先は飛ばす）
func nav_step(d: int) -> void:
	if _modal != null or nav_bar == null: return
	for k in nav_bar.step_key(d):
		if UiFlow.nav_prepare(k) == "":
			nav_leave()
			go(k)
			return

# 下のメニューで画面を離れる前（継いだ画面がカーソルの記憶などを残す）
func nav_leave() -> void: pass

# その他（セーブ・設定・タイトルへ）の小窓。カーソルはセーブから
func open_more() -> void:
	var pb := UiScreen.panel_box(true, 12)
	var p: PanelContainer = pb[0]
	var v: VBoxContainer = pb[1]
	p.custom_minimum_size = Vector2(420, 0)
	v.add_child(UiTheme.title("その他", 20))
	var first: Button = null
	for it in [["セーブ", "save", "horseshoe"], ["設定", "settings", "settings"], ["タイトルへ", "title", "back"]]:
		var b := UiScreen.button(String(it[0]), false, 0, 52, 17, true)
		UiSkin.button_icon(b, String(it[2]), 22)
		var key: String = it[1]
		b.pressed.connect(func(): _more(key))
		v.add_child(b)
		if first == null: first = b
	var no := UiScreen.button("もどる", false, 0, 44, 15)
	no.pressed.connect(close_modal)
	v.add_child(no)
	open_modal(p, first)

func _more(key: String) -> void:
	close_modal()
	match key:
		"save":
			UiFlow.save()
			toast(HSText.t("セーブした（%s）") % UiFlow.date_label(), "good")
		"settings":
			var me := UiFlow.scene_key(scene_file_path)
			if me != "settings": UiFlow.settings_back = me if me != "" else "home"   # 設定からはもどる先を変えない
			go("settings")   # 設定からはこの画面へもどるので、nav_leave（画面の記憶を消す）はしない
		"title":
			UiFlow.save()
			nav_leave()
			go("title")

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
		var img := get_viewport().get_texture().get_image()
		img.save_png(out_dir.path_join(String(sh.name) + ".png"))
		if OS.get_cmdline_user_args().has("--contrast"):
			UiScreen.measure_contrast(self, img, out_dir.path_join(String(sh.name) + "_contrast.json"))
		print("shot ", sh.name)
	print("done")
	get_tree().quit()

# ---- 色の役目の物差し（docs/UI.md「色の役目」）：撮った絵で、押せる物（Button）の面と縁が周りから浮いているかを測る ----
# 面＝ボタンの内側（四方を 30% 削った所）の明るさの中央値、周り＝ボタンの外 4〜12px の帯（ほかのボタンの上は除く）の中央値、
# 縁＝ボタンの内側の端 0〜6px の明るさの上から 5% の値。どれも相対輝度（UiTheme.lum）で、比は WCAG のコントラスト比。
# 押せる形をしていない物（押せない・透明な地のつまみ）は数えない。結果は path の JSON（1つずつ）と、print の1行（いちばん悪い値）
const CONTRAST_FACE := 1.6   # ボタン・カーソルのある行：面と周り。これより小さいと「背景と同じに見える」
const CONTRAST_RIM := 3.0    # ボタン・カーソルのある行：縁と周り（WCAG 1.4.11 の部品の境目）
const CONTRAST_ROW := 1.25   # 表の行（カーソルの無い行）：面と周り（面の台・濃い幕）。縁は問わない（並ぶ行に金の縁を付けない）

# 表の行か（行の部品の印 ui_row、無ければ横に長い押せる物）
static func is_row(b: Button) -> bool:
	return b.has_meta("ui_row") or (b.size.x >= 360.0 and b.size.y <= 110.0 and b.size.x >= b.size.y * 6.0)

static func measure_contrast(root: Node, img: Image, path: String) -> Dictionary:
	var vp := root.get_viewport()
	var k := float(img.get_width()) / maxf(1.0, vp.get_visible_rect().size.x)
	var btns: Array = []
	var others: Array = []   # 周りから除く札（数えない札も。切れた行・押せない札の上は周りにしない）
	var modal = root.get("_modal")
	for n in root.find_children("*", "Button", true, false):
		var b := n as Button
		if b.is_visible_in_tree():
			var gr := b.get_global_rect()
			others.append([b, Rect2(gr.position * k, gr.size * k)])
		if not b.is_visible_in_tree() or b.disabled or b.flat or b.size.x < 24 or b.size.y < 16:
			continue
		if modal is Control and is_instance_valid(modal) and not (modal as Control).is_ancestor_of(b):
			continue   # 小窓の後ろ（暗くした札）は数えない
		var clip := b.get_parent()
		while clip != null and not (clip is ScrollContainer):
			clip = clip.get_parent()
		if clip is ScrollContainer and not (clip as Control).get_global_rect().encloses(b.get_global_rect()):
			continue   # 表の端で切れている行は数えない
		var sb := b.get_theme_stylebox("normal")
		if sb is StyleBoxEmpty or (sb is StyleBoxFlat and (sb as StyleBoxFlat).bg_color.a < 0.05):
			continue   # 字だけのつまみ（溝の中の選んでいないタブ）
		var r := b.get_global_rect()
		r = Rect2(r.position * k, r.size * k)
		if not Rect2(Vector2.ZERO, Vector2(img.get_width(), img.get_height())).encloses(r.grow(-1)):
			continue
		btns.append([b, r])
	var lm := func(x: int, y: int) -> float: return UiTheme.lum(img.get_pixel(x, y))
	var med := func(a: Array) -> float:
		if a.is_empty(): return -1.0
		a.sort()
		return float(a[a.size() / 2])
	var rows: Array = []
	for e in btns:
		var b: Button = e[0]
		var r: Rect2 = e[1]
		var face: Array = []
		var ix := r.size.x * 0.3
		var iy := r.size.y * 0.3
		for y in range(int(r.position.y + iy), int(r.end.y - iy), 2):
			for x in range(int(r.position.x + ix), int(r.end.x - ix), 3):
				face.append(lm.call(x, y))
		var rim: Array = []
		for d in 7:
			for x in range(int(r.position.x) + 6, int(r.end.x) - 6, 3):
				rim.append(lm.call(x, int(r.position.y) + d)); rim.append(lm.call(x, int(r.end.y) - 1 - d))
			for y in range(int(r.position.y) + 6, int(r.end.y) - 6, 3):
				rim.append(lm.call(int(r.position.x) + d, y)); rim.append(lm.call(int(r.end.x) - 1 - d, y))
		var ring: Array = []
		for d in range(4, 13, 2):
			var o := r.grow(float(d))
			var pts: Array = []
			for x in range(int(o.position.x), int(o.end.x), 4):
				pts.append(Vector2(x, o.position.y)); pts.append(Vector2(x, o.end.y))
			for y in range(int(o.position.y), int(o.end.y), 4):
				pts.append(Vector2(o.position.x, y)); pts.append(Vector2(o.end.x, y))
			for p in pts:
				if p.x < 0 or p.y < 0 or p.x >= img.get_width() or p.y >= img.get_height():
					continue
				if others.any(func(o2): return o2[0] != b and (o2[1] as Rect2).grow(2).has_point(p)):
					continue
				ring.append(lm.call(int(p.x), int(p.y)))
		if ring.size() < 12 or face.is_empty():
			continue
		rim.sort()
		var f: float = med.call(face)
		var g: float = med.call(ring)
		var e2: float = float(rim[mini(rim.size() - 1, int(rim.size() * 0.95))])
		var row := is_row(b) and not b.has_focus()
		var fc := UiTheme.contrast_l(f, g)
		var rc := UiTheme.contrast_l(e2, g)
		rows.append({"text": b.text if b.text != "" else String(b.name), "kind": "row" if row else "button", "face": fc, "rim": rc,
			"ok": (fc >= CONTRAST_ROW) if row else (fc >= CONTRAST_FACE and rc >= CONTRAST_RIM),
			"focus": b.has_focus(), "rect": [int(r.position.x), int(r.position.y), int(r.size.x), int(r.size.y)]})
	var worst := {"face": 99.0, "rim": 99.0, "row": 99.0, "n": rows.size(), "bad": 0}
	for x in rows:
		if x.kind == "row":
			worst.row = minf(worst.row, x.face)
		else:
			worst.face = minf(worst.face, x.face)
			worst.rim = minf(worst.rim, x.rim)
		if not x.ok:
			worst.bad += 1
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f:
		var ox: Array = others.map(func(o): var q: Rect2 = o[1]; return [int(q.position.x), int(q.position.y), int(q.size.x), int(q.size.y)])
		f.store_string(JSON.stringify({"worst": worst, "buttons": rows, "others": ox}, "\t"))
	print("contrast %s n=%d ボタンの面=%.2f 縁=%.2f 行の面=%.2f 足りない=%d" % [path.get_file().get_basename().trim_suffix("_contrast"), rows.size(), worst.face, worst.rim, worst.row, worst.bad])   # i18n:skip（撮影の道具の出力）
	return worst
