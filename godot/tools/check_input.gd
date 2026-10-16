# 騎乗の操作の確かめ（画面なし）：十字キー・左スティック・キーボードで、しごく・進路・ムチが押したコマで出るか、押し続けで進路が続けて動くか
#   godot --headless --path godot -s res://tools/check_input.gd
extends SceneTree

var inp: ViewRideInput
var got: Array = []
var frame := 0
var fails := 0
var steps: Array = []

func _initialize() -> void:
	inp = ViewRideInput.new()
	root.add_child(inp)
	inp.act.connect(func(n, a): got.append([frame, n, a]))
	# [コマ, 出来事, 押す/離す]
	steps = [
		[2, _joy(JOY_BUTTON_DPAD_RIGHT), true], [3, _joy(JOY_BUTTON_DPAD_RIGHT), false],
		[6, _joy(JOY_BUTTON_DPAD_LEFT), true], [7, _joy(JOY_BUTTON_DPAD_LEFT), false],
		[10, _joy(JOY_BUTTON_DPAD_UP), true], [11, _joy(JOY_BUTTON_DPAD_UP), false],
		[14, _axis(JOY_AXIS_LEFT_X, 0.9), true], [15, _axis(JOY_AXIS_LEFT_X, 0.0), false],
		[18, _key(KEY_LEFT), true], [19, _key(KEY_LEFT), false],
		[22, _joy(JOY_BUTTON_B), true], [23, _joy(JOY_BUTTON_B), false],
		[26, _key(KEY_Z), true], [27, _key(KEY_Z), false],
		# 押し続け：十字キー右を 1 秒（60 コマ）→ 進路が 3 回以上
		[30, _joy(JOY_BUTTON_DPAD_RIGHT), true], [90, _joy(JOY_BUTTON_DPAD_RIGHT), false],
	]

func _joy(b: int) -> InputEventJoypadButton:
	var e := InputEventJoypadButton.new()
	e.button_index = b
	return e

func _axis(a: int, v: float) -> InputEventJoypadMotion:
	var e := InputEventJoypadMotion.new()
	e.axis = a
	e.axis_value = v
	return e

func _key(k: int) -> InputEventKey:
	var e := InputEventKey.new()
	e.physical_keycode = k
	e.keycode = k
	return e

func _process(_delta: float) -> bool:
	frame += 1
	for s in steps:
		if s[0] == frame:
			var ev: InputEvent = (s[1] as InputEvent).duplicate()
			if ev is InputEventJoypadButton or ev is InputEventKey:
				ev.pressed = s[2]
			Input.parse_input_event(ev)
			Input.flush_buffered_events()
	if frame < 100:
		return false
	_expect("十字キー右で進路+1", func(g): return g[1] == "lane" and g[2] == 1 and g[0] <= 3)
	_expect("十字キー左で進路-1", func(g): return g[1] == "lane" and g[2] == -1 and g[0] >= 6 and g[0] <= 7)
	_expect("十字キー上でしごく", func(g): return g[1] == "up" and g[0] >= 10 and g[0] <= 11)
	_expect("左スティック右で進路+1", func(g): return g[1] == "lane" and g[2] == 1 and g[0] >= 14 and g[0] <= 15)
	_expect("← キーで進路-1", func(g): return g[1] == "lane" and g[2] == -1 and g[0] >= 18 and g[0] <= 19)
	_expect("B で右ムチ", func(g): return g[1] == "whip" and g[2] == "R" and g[0] >= 22 and g[0] <= 23)
	_expect("Z キーで左ムチ", func(g): return g[1] == "whip" and g[2] == "L" and g[0] >= 26 and g[0] <= 27)
	var held := got.filter(func(g): return g[1] == "lane" and g[2] == 1 and g[0] >= 30 and g[0] <= 91).size()
	if held >= 3:
		print("  ok   押し続けで進路が続けて動く（%d 回）" % held)
	else:
		print("  FAIL 押し続けで進路が続けて動く（%d 回）" % held)
		fails += 1
	print("%d failed" % fails)
	quit(1 if fails > 0 else 0)
	return true

func _expect(name: String, f: Callable) -> void:
	if got.any(f):
		print("  ok   " + name)
	else:
		print("  FAIL " + name + "  " + str(got))
		fails += 1
