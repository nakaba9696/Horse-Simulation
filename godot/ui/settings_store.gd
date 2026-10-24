# 設定（画面の大きさ・音量・振動・キーとパッドの割り当て）。セーブとは別のファイル user://settings.cfg に置き、起動するたびに読んで効かせる
# - 画面：ウィンドウかフルスクリーン・解像度（1280×720〜2560×1440）。ウィンドウではその大きさ、フルスクリーンでは 3D を描く細かさをその高さに合わせる
# - 音量：全体（Master）・BGM・効果音（SE）を 0〜100。BGM と SE のバスが無ければ作る（音を鳴らす係はこのバスに流す）
# - 振動：入り切り（ViewRideInput.level）
# - 画面の動き：ふつうか減らす（motion＝"full"｜"less"。UiFx が見る。減らすと押した返り・知らせ・めくれ・画面の入りで位置と大きさを動かさず、色と光だけで返す）
# - 言語：日本語か英語（HSText.lang。docs/I18N.md）。ファイルに無ければ（初めての起動）OS の言語で決める（日本語なら日本語、ほかは英語）。
#   撮影（--out=）と headless で言語の欄が無いときは日本語。-- --lang=en|ja で替えられる（英語の画面を撮るとき）
# - 割り当て：騎乗の操作（しごく・引く・進路・ムチ・持ち替え・左右を見る・視点・一時停止）と、決める・もどる。1つの操作にキー1つとパッド1つ。
#   既定の割り当て（view/ride_input.gd・ui/pad.gd・Godot の ui_*）のほかの手（スペースでしごく・P で一時停止・左スティックなど）は残し、
#   同じ組（騎乗・画面）のほかの操作に割り当てた手とぶつかるものだけ外す
# 画面（UiScreen）と騎乗（ViewRideInput）が開くときに boot() を呼ぶ（1回だけ読む）。撮影（--out=）と headless では画面の大きさに触らない
class_name UiSettings
extends RefCounted

static var path := "user://settings.cfg"   # テストは別の場所に替える

const RESOLUTIONS := [Vector2i(1280, 720), Vector2i(1280, 800), Vector2i(1366, 768), Vector2i(1600, 900), Vector2i(1600, 1000), Vector2i(1920, 1080), Vector2i(1920, 1200), Vector2i(2560, 1440)]
const VOL_STEP := 10
const VIB_LEVEL := 0.7

# 割り当てを替えられる操作 [action, 画面に出す名前, 組]。パッドは "b:ボタン" か "a:軸:+/-"（LT・RT）
const ACTIONS := [
	["ride_up", "しごく（ゲートでスタート）", "ride"],
	["ride_down", "引く", "ride"],
	["ride_left", "進路を左へ", "ride"],
	["ride_right", "進路を右へ", "ride"],
	["ride_whip_l", "左ムチ", "ride"],
	["ride_whip_r", "右ムチ", "ride"],
	["ride_swap", "ムチの持ち替え", "ride"],
	["ride_look_l", "左を見る", "ride"],
	["ride_look_r", "右を見る", "ride"],
	["ride_view", "視点を替える", "ride"],
	["ride_pause", "一時停止", "ride"],
	["ui_accept", "決める", "ui"],
	["ui_cancel", "もどる", "ui"],
]

static func defaults() -> Dictionary:
	return {
		"mode": "window", "res": Vector2i(1600, 1000),
		"vol_master": 80, "vol_bgm": 80, "vol_se": 80,
		"vibration": true,
		"motion": "full",
		"lang": first_lang(),
		"keys": default_keys(), "pads": default_pads(),
	}

static func default_keys() -> Dictionary:
	return {"ride_up": KEY_UP, "ride_down": KEY_DOWN, "ride_left": KEY_LEFT, "ride_right": KEY_RIGHT, "ride_whip_l": KEY_Z, "ride_whip_r": KEY_X,
		"ride_swap": KEY_C, "ride_look_l": KEY_Q, "ride_look_r": KEY_E, "ride_view": KEY_V, "ride_pause": KEY_ESCAPE, "ui_accept": KEY_ENTER, "ui_cancel": KEY_ESCAPE}

static func default_pads() -> Dictionary:
	return {"ride_up": "b:%d" % JOY_BUTTON_DPAD_UP, "ride_down": "b:%d" % JOY_BUTTON_DPAD_DOWN, "ride_left": "b:%d" % JOY_BUTTON_DPAD_LEFT, "ride_right": "b:%d" % JOY_BUTTON_DPAD_RIGHT,
		"ride_whip_l": "b:%d" % JOY_BUTTON_X, "ride_whip_r": "b:%d" % JOY_BUTTON_B, "ride_swap": "b:%d" % JOY_BUTTON_A,
		"ride_look_l": "a:%d:+" % JOY_AXIS_TRIGGER_LEFT, "ride_look_r": "a:%d:+" % JOY_AXIS_TRIGGER_RIGHT,
		"ride_view": "b:%d" % JOY_BUTTON_BACK, "ride_pause": "b:%d" % JOY_BUTTON_START, "ui_accept": "b:%d" % JOY_BUTTON_A, "ui_cancel": "b:%d" % JOY_BUTTON_B}

static var cur: Dictionary = {}
static var _booted := false
static var _orig := {}   # 起動したときの割り当て（既定のほかの手を残すため）

# ---------- 読む・書く ----------
static func boot() -> void:
	if _booted: return
	_booted = true
	load_file()
	apply()

static func load_file() -> void:
	cur = defaults()
	var cf := ConfigFile.new()
	if cf.load(path) != OK: return
	cur.mode = "full" if String(cf.get_value("display", "mode", "window")) == "full" else "window"
	var r = cf.get_value("display", "res", cur.res)
	if r is Vector2i and RESOLUTIONS.has(r): cur.res = r
	for k in ["vol_master", "vol_bgm", "vol_se"]:
		cur[k] = clampi(int(cf.get_value("audio", k, cur[k])), 0, 100)
	cur.vibration = bool(cf.get_value("input", "vibration", true))
	cur.motion = "less" if String(cf.get_value("display", "motion", "full")) == "less" else "full"
	var lg := String(cf.get_value("general", "lang", ""))
	if lg in HSText.LANGS: cur.lang = lg
	for a in default_keys():
		var kk = cf.get_value("keys", a, 0) if cf.has_section_key("keys", a) else 0
		if kk is int and kk > 0: cur.keys[a] = kk
		var pp = cf.get_value("pads", a, "") if cf.has_section_key("pads", a) else ""
		if pp is String and _pad_ok(pp): cur.pads[a] = pp

static func save_file() -> bool:
	var cf := ConfigFile.new()
	cf.set_value("meta", "version", 1)
	cf.set_value("display", "mode", cur.mode)
	cf.set_value("display", "res", cur.res)
	cf.set_value("display", "motion", String(cur.get("motion", "full")))
	for k in ["vol_master", "vol_bgm", "vol_se"]:
		cf.set_value("audio", k, int(cur[k]))
	cf.set_value("input", "vibration", bool(cur.vibration))
	cf.set_value("general", "lang", String(cur.lang))
	for a in cur.keys: cf.set_value("keys", a, int(cur.keys[a]))
	for a in cur.pads: cf.set_value("pads", a, String(cur.pads[a]))
	return cf.save(path) == OK

# 初めの設定に戻す（ファイルも書き直す）
static func reset() -> void:
	var lg = cur.get("lang") if not cur.is_empty() else null
	cur = defaults()
	if lg != null: cur.lang = lg   # 言語は残す（初めの設定に戻しても、読めない言語にしない）
	apply()
	save_file()

# 値を替えて、すぐ効かせて書く
static func set_value(k: String, v) -> void:
	if cur.is_empty(): cur = defaults()
	cur[k] = v
	apply()
	save_file()

# ---------- 効かせる ----------
static func apply() -> void:
	if cur.is_empty(): cur = defaults()
	apply_audio()
	ViewRideInput.level = VIB_LEVEL if cur.vibration else 0.0
	HSText.set_lang(arg_lang() if arg_lang() != "" else String(cur.get("lang", "ja")))
	apply_bindings()
	apply_display()

static func bus_ensure(name: String) -> int:
	var i := AudioServer.get_bus_index(name)
	if i < 0:
		AudioServer.add_bus()
		i = AudioServer.bus_count - 1
		AudioServer.set_bus_name(i, name)
		AudioServer.set_bus_send(i, "Master")
	return i

static func apply_audio() -> void:
	for p in [["Master", "vol_master"], ["BGM", "vol_bgm"], ["SE", "vol_se"]]:
		var i := bus_ensure(String(p[0]))
		var v := float(cur[p[1]]) / 100.0
		AudioServer.set_bus_mute(i, v <= 0.0)
		AudioServer.set_bus_volume_db(i, linear_to_db(maxf(v, 0.0001)))

# 初めての起動の言語：OS の言語（日本語なら日本語、ほかは英語）。撮影・headless・テストでは日本語
static func first_lang() -> String:
	if not can_touch_window(): return "ja"
	return HSText.lang_for_locale(OS.get_locale())

# -- --lang=en|ja（撮影で言語を決める）。無ければ ""
static func arg_lang() -> String:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--lang="):
			var l := a.substr(7)
			if l in HSText.LANGS: return l
	return ""

# 撮影（--out=）・headless・テストでは画面の大きさに触らない
static func can_touch_window() -> bool:
	if DisplayServer.get_name() == "headless": return false
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out=") or a.begins_with("--shot="): return false
	return true

static func apply_display() -> void:
	if not can_touch_window(): return
	var res: Vector2i = cur.res
	var tree := Engine.get_main_loop() as SceneTree
	if cur.mode == "full":
		if DisplayServer.window_get_mode() != DisplayServer.WINDOW_MODE_FULLSCREEN:
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
		var scr := DisplayServer.screen_get_size()
		if tree and scr.y > 0:
			tree.root.scaling_3d_scale = clampf(float(res.y) / float(scr.y), 0.5, 1.0)
	else:
		if DisplayServer.window_get_mode() != DisplayServer.WINDOW_MODE_WINDOWED:
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
		var area := DisplayServer.screen_get_usable_rect()
		var sz := Vector2i(mini(res.x, area.size.x), mini(res.y, area.size.y)) if area.size.x > 0 else res
		DisplayServer.window_set_size(sz)
		DisplayServer.window_set_position(area.position + (area.size - sz) / 2)
		if tree: tree.root.scaling_3d_scale = 1.0

# ---------- 割り当て ----------
static func _snapshot() -> void:
	if not _orig.is_empty(): return
	UiPad.ensure_actions()
	ViewRideInput.ensure_actions()
	for p in ACTIONS:
		var evs: Array = []
		for e in InputMap.action_get_events(p[0]): evs.append(e.duplicate())
		_orig[p[0]] = evs

static func _group(a: String) -> String:
	for p in ACTIONS:
		if p[0] == a: return String(p[2])
	return ""

static func apply_bindings() -> void:
	_snapshot()
	var dk := default_keys()
	var dp := default_pads()
	for p in ACTIONS:
		var a: String = p[0]
		var g: String = p[2]
		InputMap.action_erase_events(a)
		for e in _orig[a]:
			if key_matches(e, int(dk[a])) or pad_matches(e, String(dp[a])): continue   # 既定の手は、いまの手に入れ替える
			var clash := false
			for q in ACTIONS:
				if q[0] == a or q[2] != g: continue
				if key_matches(e, int(cur.keys[q[0]])) or pad_matches(e, String(cur.pads[q[0]])): clash = true
			if not clash: InputMap.action_add_event(a, e.duplicate())
		InputMap.action_add_event(a, key_event(int(cur.keys[a])))
		InputMap.action_add_event(a, pad_event(String(cur.pads[a])))

# 割り当てる：同じ組のほかの操作が同じ手を使っていれば、その操作にいまの手を渡す（入れ替え）
static func bind(a: String, kind: String, v) -> void:
	if cur.is_empty(): cur = defaults()
	var tab: Dictionary = cur.keys if kind == "key" else cur.pads
	var old = tab[a]
	for q in ACTIONS:
		if q[0] != a and q[2] == _group(a) and tab[q[0]] == v:
			tab[q[0]] = old
	tab[a] = v
	apply_bindings()
	save_file()

static func key_event(code: int) -> InputEventKey:
	var k := InputEventKey.new()
	k.physical_keycode = code as Key
	return k

static func pad_event(code: String) -> InputEvent:
	var p := code.split(":")
	if p[0] == "a":
		var m := InputEventJoypadMotion.new()
		m.axis = int(p[1]) as JoyAxis
		m.axis_value = 1.0 if p[2] == "+" else -1.0
		return m
	var j := InputEventJoypadButton.new()
	j.button_index = int(p[1]) as JoyButton
	return j

static func _pad_ok(code: String) -> bool:
	var p := code.split(":")
	return (p.size() == 2 and p[0] == "b") or (p.size() == 3 and p[0] == "a" and p[2] in ["+", "-"])

static func key_matches(e: InputEvent, code: int) -> bool:
	return e is InputEventKey and (int(e.physical_keycode) == code or int(e.keycode) == code)

static func pad_matches(e: InputEvent, code: String) -> bool:
	var p := code.split(":")
	if p[0] == "b": return e is InputEventJoypadButton and int(e.button_index) == int(p[1])
	return e is InputEventJoypadMotion and int(e.axis) == int(p[1]) and (e.axis_value > 0.0) == (p[2] == "+")

# 押された手を割り当ての形に（割り当てを待っているとき）。使えない手は null
static func code_of(e: InputEvent):
	if e is InputEventKey and e.pressed and not e.echo:
		var c := int(e.physical_keycode) if int(e.physical_keycode) != 0 else int(e.keycode)
		return ["key", c] if c != 0 else null
	if e is InputEventJoypadButton and e.pressed:
		return ["pad", "b:%d" % int(e.button_index)]
	if e is InputEventJoypadMotion and int(e.axis) in [JOY_AXIS_TRIGGER_LEFT, JOY_AXIS_TRIGGER_RIGHT] and e.axis_value > 0.6:
		return ["pad", "a:%d:+" % int(e.axis)]
	return null

# ---------- 画面に出す名前 ----------
const KEY_NAME := {KEY_UP: "↑", KEY_DOWN: "↓", KEY_LEFT: "←", KEY_RIGHT: "→", KEY_ESCAPE: "Esc", KEY_ENTER: "Enter", KEY_KP_ENTER: "Enter", KEY_SPACE: "Space", KEY_SHIFT: "Shift", KEY_CTRL: "Ctrl", KEY_ALT: "Alt", KEY_TAB: "Tab", KEY_BACKSPACE: "BS"}
const PAD_NAME := {JOY_BUTTON_A: "A", JOY_BUTTON_B: "B", JOY_BUTTON_X: "X", JOY_BUTTON_Y: "Y", JOY_BUTTON_LEFT_SHOULDER: "LB", JOY_BUTTON_RIGHT_SHOULDER: "RB",
	JOY_BUTTON_BACK: "Back", JOY_BUTTON_START: "Start", JOY_BUTTON_LEFT_STICK: "L3", JOY_BUTTON_RIGHT_STICK: "R3", JOY_BUTTON_GUIDE: "Guide",
	JOY_BUTTON_DPAD_UP: "十字↑", JOY_BUTTON_DPAD_DOWN: "十字↓", JOY_BUTTON_DPAD_LEFT: "十字←", JOY_BUTTON_DPAD_RIGHT: "十字→"}

static func key_name(code: int) -> String:
	if KEY_NAME.has(code): return KEY_NAME[code]
	var s := OS.get_keycode_string(code as Key)
	return s if s != "" else "?"

static func pad_name(code: String) -> String:
	var p := code.split(":")
	if p[0] == "a":
		return "LT" if int(p[1]) == JOY_AXIS_TRIGGER_LEFT else ("RT" if int(p[1]) == JOY_AXIS_TRIGGER_RIGHT else HSText.t("軸%s%s") % [p[1], p[2]])
	return PAD_NAME.get(int(p[1]), HSText.t("ボタン%s") % p[1])

static func res_label(r: Vector2i) -> String:
	return "%d×%d" % [r.x, r.y]
