# 騎乗の操作：ゲームパッド（十字キー・左スティック・ボタン）とキーボード。押したコマで動く（離すのを待たない）。docs/FEEL.md 1
# 操作（ブラウザ版 js/ui/ride.js と同じ並び）
#   しごく：十字キー↑・左スティック↑・↑・スペース（ゲートの中ならスタート。開く 150ms 前からの押しは覚えておく）／引く：十字キー↓・左スティック↓・↓
#   進路：十字キー←→・左スティック←→・←→（押し続けると、すぐ1つ・0.28 秒でもう1つ・あとは 0.2 秒ごと）
#   ムチ：右＝B（○）・X キー／左＝X（□）・Z キー／持ち替え：A（×）・C（ゴールのあとの A は「次へ」）
#   左右を見る：LT・RT・Q/E／照準：LB・RB・A/S キー／視点：Back（Select）・V／カメラを戻す：R3・R
#   次へ：A・Enter／ガッツポーズ：Y・G／一時停止：Start・Esc・P
# 持ち主の指摘「パッドの十字キーで横移動できない」：十字キー（hat もボタンとして届く）とスティックの両方を、押した瞬間と押し続けで受ける
class_name ViewRideInput
extends Node

signal act(name: String, arg)

const REPEAT_FIRST := 0.28
const REPEAT := 0.2
const STICK := 0.55

var _held := {}       # 行いの名前 → 押してからの秒
var look := 0.0       # 左右を見る（−1〜1）
var enabled := true

const ACTIONS := ["ride_up", "ride_down", "ride_left", "ride_right", "ride_whip_r", "ride_whip_l", "ride_swap", "ride_ok", "ride_view", "ride_camreset",
	"ride_tgt_prev", "ride_tgt_next", "ride_pose", "ride_pause"]

static func ensure_actions() -> void:
	# [キー…], [パッドのボタン…]
	var map := {
		"ride_up": [[KEY_UP, KEY_SPACE], [JOY_BUTTON_DPAD_UP]],
		"ride_down": [[KEY_DOWN], [JOY_BUTTON_DPAD_DOWN]],
		"ride_left": [[KEY_LEFT], [JOY_BUTTON_DPAD_LEFT]],
		"ride_right": [[KEY_RIGHT], [JOY_BUTTON_DPAD_RIGHT]],
		"ride_whip_r": [[KEY_X], [JOY_BUTTON_B]],
		"ride_whip_l": [[KEY_Z], [JOY_BUTTON_X]],
		"ride_swap": [[KEY_C], [JOY_BUTTON_A]],
		"ride_ok": [[KEY_ENTER, KEY_KP_ENTER], []],
		"ride_look_l": [[KEY_Q], []],
		"ride_look_r": [[KEY_E], []],
		"ride_view": [[KEY_V], [JOY_BUTTON_BACK]],
		"ride_camreset": [[KEY_R], [JOY_BUTTON_RIGHT_STICK]],
		"ride_tgt_prev": [[KEY_A], [JOY_BUTTON_LEFT_SHOULDER]],
		"ride_tgt_next": [[KEY_S], [JOY_BUTTON_RIGHT_SHOULDER]],
		"ride_pose": [[KEY_G], [JOY_BUTTON_Y]],
		"ride_pause": [[KEY_ESCAPE, KEY_P], [JOY_BUTTON_START]],
	}
	for a in map:
		if InputMap.has_action(a):
			continue
		InputMap.add_action(a, 0.5)
		for code in map[a][0]:
			var k := InputEventKey.new()
			k.physical_keycode = code
			InputMap.action_add_event(a, k)
		for b in map[a][1]:
			var j := InputEventJoypadButton.new()
			j.button_index = b
			InputMap.action_add_event(a, j)
		# スティック（左：上下左右・LT/RT：左右を見る）
		match a:
			"ride_up": _axis(a, JOY_AXIS_LEFT_Y, -1.0)
			"ride_down": _axis(a, JOY_AXIS_LEFT_Y, 1.0)
			"ride_left": _axis(a, JOY_AXIS_LEFT_X, -1.0)
			"ride_right": _axis(a, JOY_AXIS_LEFT_X, 1.0)
			"ride_look_l": _axis(a, JOY_AXIS_TRIGGER_LEFT, 1.0)
			"ride_look_r": _axis(a, JOY_AXIS_TRIGGER_RIGHT, 1.0)

static func _axis(a: String, axis: int, dir: float) -> void:
	var m := InputEventJoypadMotion.new()
	m.axis = axis
	m.axis_value = dir
	InputMap.action_add_event(a, m)

func _ready() -> void:
	ensure_actions()

func _process(delta: float) -> void:
	if not enabled:
		return
	for a in ACTIONS:
		if Input.is_action_pressed(a):
			if not _held.has(a):
				_held[a] = 0.0
				_fire(a)
			else:
				var t0: float = _held[a]
				_held[a] = t0 + delta
				# 進路は押し続けると続けて動く
				if a == "ride_left" or a == "ride_right":
					if _reps(t0 + delta) > _reps(t0):
						_fire(a)
		else:
			_held.erase(a)
	var want := Input.get_action_strength("ride_look_r") - Input.get_action_strength("ride_look_l")
	look = move_toward(look, want, delta * 6.0)

# 押し続けた秒までに足す数（押した瞬間の1つは別）
static func _reps(t: float) -> int:
	if t < REPEAT_FIRST:
		return 0
	return 1 + int((t - REPEAT_FIRST) / REPEAT)

func _fire(a: String) -> void:
	match a:
		"ride_up": act.emit("up", null)
		"ride_down": act.emit("down", null)
		"ride_left": act.emit("lane", -1)
		"ride_right": act.emit("lane", 1)
		"ride_whip_r": act.emit("whip", "R")
		"ride_whip_l": act.emit("whip", "L")
		"ride_swap": act.emit("swap_or_ok", null)
		"ride_ok": act.emit("ok", null)
		"ride_view": act.emit("view", null)
		"ride_camreset": act.emit("camreset", null)
		"ride_tgt_prev": act.emit("target", -1)
		"ride_tgt_next": act.emit("target", 1)
		"ride_pose": act.emit("pose", null)
		"ride_pause": act.emit("pause", null)

# ---- 振動（ブラウザ版 js/ui/rumble.js と同じ場面と強さ）----
static var level := 0.7
const STRIDE := 7.2
const STEPS := [[0.0, 1.0], [0.12, 0.85], [0.34, 0.55], [0.46, 0.5]]   # 着地の位相と強さ（後・後・前・前）
var _last_ph = null

static func play(ms: float, strong: float, weak: float) -> void:
	if level <= 0.0:
		return
	for d in Input.get_connected_joypads():
		Input.start_joy_vibration(d, clampf(weak * level, 0.0, 1.0), clampf(strong * level, 0.0, 1.0), ms / 1000.0)

func fx(name: String) -> void:
	match name:
		"gate": play(260, 1.0, 0.8)
		"whip": play(70, 0.15, 0.9)
		"skill":
			play(120, 0.5, 1.0)
			get_tree().create_timer(0.17).timeout.connect(func(): play(160, 0.8, 1.0))
		"bad": play(220, 0.7, 0.2)
		"lane": play(45, 0.0, 0.35)
		"bump":
			play(110, 1.0, 0.4)
			get_tree().create_timer(0.13).timeout.connect(func(): play(80, 0.4, 0.2))
		"cross": play(160, 0.5, 0.7)
		"fight":
			play(90, 0.9, 0.5)
			get_tree().create_timer(0.16).timeout.connect(func(): play(90, 0.9, 0.5))
			get_tree().create_timer(0.33).timeout.connect(func(): play(220, 0.5, 1.0))
		"finish": play(350, 0.6, 0.6)
		"win":
			play(300, 1.0, 1.0)
			get_tree().create_timer(0.42).timeout.connect(func(): play(500, 0.7, 1.0))

# 蹄の拍子：前のコマから今のコマまでに着地の位相をまたいだら震える。速いほど・追うほど強い
func gallop(x: float, num: int, v: float, push: float) -> void:
	if level <= 0.0 or v <= 1.5:
		_last_ph = null
		return
	var pos := x / STRIDE + num * 0.137
	if _last_ph == null or pos < _last_ph or pos - _last_ph > 1.0:
		_last_ph = pos
		return
	var sp := clampf((v - 8.0) / 9.0, 0.0, 1.0)
	var amp := 0.25 + 0.45 * sp + 0.3 * clampf(push, 0.0, 1.0)
	for st in STEPS:
		var n0 := floorf(_last_ph - st[0])
		var n1 := floorf(pos - st[0])
		if n1 > n0:
			var k: float = st[1]
			play(55.0 if k > 0.7 else 40.0, k * amp, k * amp * 0.6)
			break
	_last_ph = pos
