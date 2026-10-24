# 下のメニュー（docs/UI.md「下のメニュー」。持ち主の指摘 2026-10-24「お手馬一覧や店などで画面遷移するとおもうけど、常に基本メニューは画面下部に表示して」）
# どの管理画面にも、画面の下の端（y 912〜1000）に基本の行き先の札（UiFlow.NAV）を横一列に出す。いまいる画面の札は光らせる。
# 札は鞍の革の押せる物（UiSkin の btn_sub。docs/UI.md「色の役目」）で、墨の緑の面の台の上に置く。
# 十字キーのカーソルは乗らない（画面の中の札の動きを変えない）。キーボードは 1〜8 で札を、パッドは LT・RT で前・次の行き先へ（meta "pad"）
# 置くのは UiScreen（nav() が "" でない画面）。押すと on_pick(鍵)
class_name UiNav
extends Control

const Y := 912.0       # 上の端（1600×1000 で。並行の仕事のため固定。docs/UI.md「下のメニュー」）
const H := 88.0
const CARD_H := 66.0

var cur := ""
var on_pick: Callable
var cards: Array[Button] = []
var nums: Array[UiGlyph] = []   # 札の左上の数（キーボードのとき）
var ends: Array[UiGlyph] = []   # 両端の LT・RT（パッドのとき）
var _shown := -1

static func make(current: String, pick: Callable) -> UiNav:
	var n := UiNav.new()
	n.cur = current
	n.on_pick = pick
	n._build()
	return n

func _build() -> void:
	name = "Nav"
	# 画面の下の端に付ける（横長の画面では幅いっぱい。1600×1000 では y 912〜1000）
	set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	offset_top = -H
	offset_bottom = 0
	mouse_filter = Control.MOUSE_FILTER_STOP   # 後ろの写真へ押すのを抜けさせない
	# 面の台：墨の緑・上の端に金の細い線
	var bk := Panel.new()
	var sb := UiTheme.box(Color(UiTheme.INK.r, UiTheme.INK.g, UiTheme.INK.b, 0.95), UiTheme.LINE_GOLD, 0, 0, Vector4(0, 0, 0, 0))
	sb.border_width_top = 1
	sb.shadow_color = Color(0, 0, 0, 0.55)
	sb.shadow_size = 14
	bk.add_theme_stylebox_override("panel", sb)
	bk.set_anchors_preset(Control.PRESET_FULL_RECT)
	bk.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bk)
	var h := HBoxContainer.new()
	h.set_anchors_preset(Control.PRESET_FULL_RECT)
	h.offset_left = UiScreen.PAD_X
	h.offset_right = -UiScreen.PAD_X
	h.add_theme_constant_override("separation", 8)
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	add_child(h)
	ends.append(UiGlyph.make("", "LT", 12))
	h.add_child(ends[0])
	for i in UiFlow.NAV.size():
		var it: Array = UiFlow.NAV[i]
		var b := _card(String(it[0]), String(it[1]), String(it[2]), i)
		h.add_child(b)
		cards.append(b)
	ends.append(UiGlyph.make("", "RT", 12))
	h.add_child(ends[1])
	_sync()

func _card(key: String, label: String, icon: String, i: int) -> Button:
	var b := Button.new()
	b.name = "nav_" + key
	b.text = HSText.short(label)
	b.focus_mode = Control.FOCUS_NONE
	b.set_meta("pad", "LT/RT")    # パッドは LT・RT で前・次の行き先（tests/test_focus.gd）
	b.set_meta("nav", key)
	b.custom_minimum_size = Vector2(0, CARD_H)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	b.add_theme_font_size_override("font_size", 14 if HSText.is_en() else 15)
	var here := key == cur
	# いまいる画面の札は、選んだタブと同じ金の面・金の上の字（押しても移らない）。ほかは鞍の革
	if not UiSkin.button(b, "main" if here else "sub", CARD_H, 6):
		if here: UiTheme.gold_button(b)
		UiScreen.compact(b, 6)
	# アイコンは字の上（よくある下のメニューの形）
	var t := UiSkin.icon_tex(icon, 26)
	if t != null:
		b.icon = t
		b.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
		b.vertical_icon_alignment = VERTICAL_ALIGNMENT_TOP
		b.add_theme_constant_override("icon_max_width", 26)
		b.add_theme_constant_override("h_separation", 0)
		# 金の線のアイコンは革の上で沈むので明るく（金の面の上は暗い金の上の字の色）
		var ic := UiTheme.ON_GOLD if here else Color(1.5, 1.4, 1.15)
		for k in ["icon_normal_color", "icon_hover_color", "icon_pressed_color", "icon_hover_pressed_color", "icon_focus_color"]:
			b.add_theme_color_override(k, ic)
	if here:
		b.set_meta("current", true)
	b.pressed.connect(func(): if on_pick.is_valid(): on_pick.call(key))
	var g := UiGlyph.make(str(i + 1), "", 11)
	g.position = Vector2(8, 6)
	b.add_child(g)
	nums.append(g)
	return b

# いまの入力（キーボード・パッド）で、札の数と両端の LT・RT を出し分ける
func _sync() -> void:
	_shown = 1 if UiPad.using_pad else 0
	for g in nums: g.visible = not UiPad.using_pad
	for g in ends: g.visible = UiPad.using_pad

func _process(_d: float) -> void:
	if (1 if UiPad.using_pad else 0) != _shown:
		_sync()

# 前・次の行き先（LT・RT）。いまの画面が並びに無ければホームから数える。その他の小窓は飛ばす
func step_key(d: int) -> Array:
	var keys: Array = UiFlow.NAV.map(func(x): return String(x[0])).filter(func(k): return k != "more")
	var i := keys.find(cur)
	if i < 0: i = 0
	var out: Array = []
	for k in keys.size() - 1:
		out.append(keys[posmod(i + d * (k + 1), keys.size())])
	return out   # 近い順の候補（移れない行き先は次へ）
