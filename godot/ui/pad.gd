# 騎乗の外の画面のゲームパッド（docs/UI.md 4。持ち主の指摘 2026-10-20「全部の画面をコントローラーで」）
# - A を決定（ui_accept）・B をもどる（ui_cancel）に足す（Godot 4.7 の既定ではキーボードだけ）
# - 十字キー：押しっぱなしで 0.38 秒後から 0.12 秒ごとに続けて動く（パッドのボタンは押し続けても繰り返さないため）
# - 左スティック：倒した向きを1つの向きに直して、十字キーと同じに動く（軸の細かな揺れで何度も動かない。0.5 で入り 0.3 で戻る）
# 画面（UiScreen・出走表）が子に置く。騎乗の画面には置かない（騎乗は view/ride_input.gd）
class_name UiPad
extends Node

const DELAY := 0.38
const EVERY := 0.12
const ON := 0.5
const OFF := 0.3
const DIRS := {JOY_BUTTON_DPAD_UP: "ui_up", JOY_BUTTON_DPAD_DOWN: "ui_down", JOY_BUTTON_DPAD_LEFT: "ui_left", JOY_BUTTON_DPAD_RIGHT: "ui_right"}

static var using_pad := false   # いま使っている入力がパッドか（押すボタンの印 UiGlyph が字を替える）
var held := ""         # 押している向き（ui_up など）
var layer: CanvasLayer
var cursor_glyph: UiGlyph   # 選んでいる札の横に出す決定の印（A・Enter）
var from_stick := false
var next_t := 0.0
var sx := 0.0
var sy := 0.0

static func ensure_actions() -> void:
	for p in [["ui_accept", JOY_BUTTON_A], ["ui_cancel", JOY_BUTTON_B]]:
		var have := false
		for e in InputMap.action_get_events(p[0]):
			if e is InputEventJoypadButton and e.button_index == p[1]: have = true
		if not have:
			var j := InputEventJoypadButton.new()
			j.button_index = p[1]
			j.device = -1
			InputMap.action_add_event(p[0], j)
	# 左スティックの軸は ui_* から外し、ここで向きに直す（軸の揺れのたびに動くのを防ぐ）
	for a in ["ui_up", "ui_down", "ui_left", "ui_right"]:
		for e in InputMap.action_get_events(a):
			if e is InputEventJoypadMotion and e.axis in [JOY_AXIS_LEFT_X, JOY_AXIS_LEFT_Y]:
				InputMap.action_erase_event(a, e)

func _ready() -> void:
	ensure_actions()
	process_mode = Node.PROCESS_MODE_ALWAYS
	if Input.get_connected_joypads().size() > 0: using_pad = true
	if OS.get_cmdline_user_args().has("--pad"): using_pad = true   # 撮影：パッドの印で撮る
	layer = CanvasLayer.new()
	layer.layer = 60
	add_child(layer)
	cursor_glyph = UiGlyph.make("Enter", "A", 12)
	cursor_glyph.visible = false
	layer.add_child(cursor_glyph)

static func _now() -> float:
	return Time.get_ticks_msec() / 1000.0

func _input(ev: InputEvent) -> void:
	if ev is InputEventJoypadButton or (ev is InputEventJoypadMotion and absf(ev.axis_value) > 0.5):
		using_pad = true
	elif ev is InputEventKey:
		using_pad = false
	if ev is InputEventJoypadButton and DIRS.has(ev.button_index):
		var a: String = DIRS[ev.button_index]
		if ev.pressed:
			held = a; from_stick = false; next_t = _now() + DELAY
		elif held == a:
			held = ""
	elif ev is InputEventJoypadMotion and ev.axis in [JOY_AXIS_LEFT_X, JOY_AXIS_LEFT_Y]:
		if ev.axis == JOY_AXIS_LEFT_X: sx = ev.axis_value
		else: sy = ev.axis_value
		var d := stick_dir(sx, sy, held if from_stick else "")
		if d != (held if from_stick else ""):
			if d == "":
				if from_stick: held = ""
			else:
				held = d; from_stick = true; next_t = _now() + DELAY
				fire(d)
		get_viewport().set_input_as_handled()

# スティックの向き（今の向きは OFF まで戻るまで保つ）
static func stick_dir(x: float, y: float, cur: String) -> String:
	var ax := absf(x)
	var ay := absf(y)
	if cur != "":
		var v := ax if cur in ["ui_left", "ui_right"] else ay
		if v >= OFF: return cur
	if maxf(ax, ay) < ON: return ""
	if ax > ay: return "ui_right" if x > 0 else "ui_left"
	return "ui_down" if y > 0 else "ui_up"

static func fire(action: String) -> void:
	var e := InputEventAction.new()
	e.action = action
	e.pressed = true
	Input.parse_input_event(e)
	var r := InputEventAction.new()
	r.action = action
	r.pressed = false
	Input.parse_input_event(r)

# 選んでいる札（ボタン・表の行）の横に決定の印を置く。字のあるボタンは中の左、表の行は中の右端。自分の印を持つ札（meta "glyph"）には出さない
func _place_cursor() -> void:
	var c := get_viewport().gui_get_focus_owner() if is_inside_tree() else null
	# 表の行（字の無い札）には出さない（行の中身を隠さない。決定は右下の操作の案内に出ている）
	var ok: bool = c is Button and c.is_visible_in_tree() and not c.has_meta("glyph") and String((c as Button).text) != "" and get_parent().is_ancestor_of(c)
	cursor_glyph.visible = ok
	if not ok: return
	var r: Rect2 = c.get_global_rect()
	var gs := cursor_glyph.custom_minimum_size
	var bt := c as Button
	var tw := bt.get_theme_font("font").get_string_size(bt.text, HORIZONTAL_ALIGNMENT_LEFT, -1, bt.get_theme_font_size("font_size")).x
	var x := r.position.x + 10.0          # 字が真ん中：中の左
	if bt.alignment == HORIZONTAL_ALIGNMENT_LEFT:
		x = r.end.x - gs.x - 12.0         # 字が左寄せ：中の右
	elif (r.size.x - tw) / 2.0 < gs.x + 14.0:
		x = r.position.x - gs.x - 6.0     # ボタンが狭いときは外の左
	cursor_glyph.position = Vector2(x, r.position.y + (r.size.y - gs.y) / 2.0)

# パッドのボタンで押せる札（meta "pad"＝A・X・Y）に、押すボタンの印を付ける（見本は組み直されるので、ときどき見回る）
const PAD_KEY := {"A": "Enter", "X": "X", "Y": "Y"}
var _scan := 0
func _mark_buttons() -> void:
	for b in get_parent().find_children("*", "BaseButton", true, false):
		var m = b.get_meta("pad", "")
		if PAD_KEY.has(m) and not b.has_meta("glyph") and (b as Control).is_visible_in_tree() and not b.has_meta("no_glyph"):
			UiGlyph.attach(b, String(b.get_meta("pad_key", PAD_KEY[m])), String(m))

func _process(_d: float) -> void:
	_scan -= 1
	if _scan <= 0:
		_scan = 8
		_mark_buttons()
	_place_cursor()
	if held != "" and _now() >= next_t:
		next_t += EVERY
		if _now() > next_t: next_t = _now() + EVERY
		fire(held)
