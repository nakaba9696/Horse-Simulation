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
			else:
				UiFlow.demo(demo)
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

# 能力の数の札（docs/UI.md「能力の数の札」：低い 205 青 → 高い 35 金赤）
static func num_chip(v: float, lo := 40.0, hi := 85.0, big := false) -> PanelContainer:
	var u := clampf((v - lo) / (hi - lo), 0.0, 1.0)
	var c := Color.from_hsv(lerpf(205.0, 35.0, u) / 360.0, 0.55, lerpf(0.42, 0.62, u))
	return UiTheme.chip(str(int(round(v))), c, Color.WHITE, 17 if big else 14, 48.0 if big else 34.0)

static func spacer() -> Control:
	var s := Control.new()
	s.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return s

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
