# 押した返り・知らせ・変わった所の光・数のめくれ（docs/UI.md 1「形と動き」の「押したら結果が分かるように返す」）。
# 画面（UiScreen）はこれを呼ぶだけにする。どの画面も同じ時間・同じ緩急で返す。
# 時間と緩急は、持ち主の指定の手本（docs/UI.md 5「画面のモーションの手本」）を見て決めた：
#   押した返り   0.06 秒で 0.96 倍に縮み、0.16 秒で少し行きすぎて戻る。明るさも 1.25 倍 → 1（「ボタンを押す」100ms・ばね）
#   知らせ       0.28 秒で下からばねで入り、字の数で読める間止まり（1.6 秒＋1字 0.06 秒・4 秒まで）、0.2 秒で速く下へ抜ける（「トースト通知」・退場は登場より短く）
#   変わった所   金の縁が 0.15 秒おきに2回点いて、0.45 秒で消える（「スコア更新」）
#   数の変わり   変わった数だけが 5px 滑り込む（増えたら下から・減ったら上から）。色は 0.6 秒で戻る。横に ▲▼ と増減の札（「価格ティッカー」）
#   札のめくれ   0.14 秒で畳み、字を替えて 0.21 秒で開く（行きすぎ）。そのあと変わった所の光（「スプリットフラップ」）
#   押せない     横の揺れを 0.54 秒で半分ずつ小さく（「エラーシェイク」）と赤い縁。理由は知らせで出す
# 動きを減らす設定（UiSettings の motion＝"less"）では、位置と大きさを動かさず、色と光だけで返す。
# 騎乗中（ride_hud）はこれを使わない（騎乗中は操作の結果を文字で出さない。CLAUDE.md）
class_name UiFx
extends RefCounted

const PRESS_IN := 0.06
const PRESS_OUT := 0.16
const PRESS_SCALE := 0.96
const NOTE_IN := 0.28
const NOTE_OUT := 0.2
const NOTE_BOTTOM := 136.0     # 知らせの下の端（画面の下から。中身の欄 y 872 の上に収める。docs/UI.md「下のメニュー」）
const BLINK := 0.075           # 点滅の半分（0.15 秒おき）
const RING_FADE := 0.45
const FOLD := 0.14
const UNFOLD := 0.21
const SHAKE := 0.54
const TICK := 0.3
const TICK_COLOR := 0.6
const DELTA_HOLD := 2.2

static func less() -> bool:
	return String(UiSettings.cur.get("motion", "full")) == "less"

# 知らせを読める間（字の数で）
static func hold_time(text: String) -> float:
	return clampf(1.6 + 0.06 * text.length(), 1.8, 4.0)

static func _ok(c) -> bool:
	return c is Control and is_instance_valid(c) and (c as Control).is_inside_tree()

# ---- 押した返り（どのボタンも。UiScreen が押されたボタンに付ける） ----
static func press(c: Control) -> void:
	if not _ok(c):
		return
	var old = c.get_meta("_fx_press") if c.has_meta("_fx_press") else null
	if old is Tween and old.is_valid():
		old.kill()
	var tw := c.create_tween().set_parallel(true)
	c.set_meta("_fx_press", tw)
	var a := c.modulate.a
	c.modulate = Color(1.25, 1.25, 1.25, a)
	tw.tween_property(c, "modulate", Color(1, 1, 1, a), PRESS_IN + PRESS_OUT)
	c.scale = Vector2.ONE
	if less():
		return
	_pivot(c)
	tw.tween_property(c, "scale", Vector2(PRESS_SCALE, PRESS_SCALE), PRESS_IN).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.chain().tween_property(c, "scale", Vector2.ONE, PRESS_OUT).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

# ---- 変わった所を光らせる（金の縁が2回点いて消える）。押せない・失敗は赤 ----
# 縁は c の子に top_level で置く（入れ物の並びを崩さない。c と一緒に消える）。組み直した直後は並びが決まっていないので、1コマ待ってから置く
static func ring(c: Control, col := UiTheme.GOLD_BRIGHT, grow := 3.0) -> void:
	if not _ok(c):
		return
	await c.get_tree().process_frame
	if not _ok(c):
		return
	if c.has_meta("_fx_ring"):
		var o = c.get_meta("_fx_ring")
		if is_instance_valid(o): o.queue_free()
	var p := Panel.new()
	p.top_level = true
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := UiTheme.box(Color(col.r, col.g, col.b, 0.07), col, 2, UiTheme.R_BUTTON, Vector4())
	sb.shadow_color = Color(col.r, col.g, col.b, 0.45)
	sb.shadow_size = 10
	p.add_theme_stylebox_override("panel", sb)
	var sc := c.get_global_transform().get_scale()
	p.global_position = c.global_position - Vector2(grow, grow)
	p.size = c.size * sc + Vector2(grow, grow) * 2.0
	p.z_index = 5
	c.add_child(p)
	c.set_meta("_fx_ring", p)
	var tw := p.create_tween()
	if less():
		tw.tween_interval(1.0)
	else:
		for k in 2:
			tw.tween_property(p, "modulate:a", 0.25, BLINK)
			tw.tween_property(p, "modulate:a", 1.0, BLINK)
		tw.tween_interval(0.25)
	tw.tween_property(p, "modulate:a", 0.0, RING_FADE).set_ease(Tween.EASE_IN)
	tw.tween_callback(p.queue_free)

# ---- 押しても何も起きない（押せない・理由がある）：赤い縁と横の揺れ ----
static func deny(c: Control) -> void:
	if not _ok(c):
		return
	ring(c, UiTheme.BAD)
	if less() or c.has_meta("_fx_shake"):
		return
	var x0 := c.position.x
	c.set_meta("_fx_shake", true)
	var tw := c.create_tween()
	var amp := 8.0
	var dt := SHAKE / 6.0
	for k in 5:
		tw.tween_property(c, "position:x", x0 + (amp if k % 2 == 0 else -amp), dt).set_trans(Tween.TRANS_SINE)
		amp *= 0.5
	tw.tween_property(c, "position:x", x0, dt).set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	tw.tween_callback(func(): c.remove_meta("_fx_shake"))

# ---- 札のめくれ：畳む → 字を替える（swap）→ 開く → 光る。畳んだまま待つときは fold だけ先に呼ぶ ----
static func _pivot(c: Control) -> void:
	if c.size != Vector2.ZERO: c.pivot_offset = c.size * 0.5

static func fold(c: Control) -> void:
	if not _ok(c) or less():
		return
	_pivot(c)
	c.create_tween().tween_property(c, "scale:y", 0.0, FOLD).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

static func unfold(c: Control, glow: Control = null) -> void:
	if not _ok(c):
		return
	if less():
		c.scale = Vector2.ONE
		if glow: ring(glow)
		return
	_pivot(c)
	c.scale = Vector2(1, 0)
	var tw := c.create_tween()
	tw.tween_property(c, "scale:y", 1.0, UNFOLD).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	if glow: tw.tween_callback(func(): ring(glow))

static func flip(c: Control, swap: Callable, glow: Control = null) -> void:
	if not _ok(c) or less():
		swap.call()
		if glow: ring(glow)
		return
	_pivot(c)
	var tw := c.create_tween()
	tw.tween_property(c, "scale:y", 0.0, FOLD).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.tween_callback(swap)
	tw.tween_property(c, "scale:y", 1.0, UNFOLD).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	if glow: tw.tween_callback(func(): ring(glow))

# ---- 数の変わり：値の字が滑り込み、色が 0.6 秒で戻る。横（下）に ▲▼ と増減の札 ----
static func tick(l: Label, up: bool, delta := "") -> void:
	if not _ok(l):
		return
	var hi := UiTheme.GOOD if up else UiTheme.WARN
	# 色は modulate で（字の色を書き替えると入れ物が並べ直して、滑り込みが崩れる）
	l.modulate = Color(1.6, 1.6, 1.6, l.modulate.a)
	var tw := l.create_tween().set_parallel(true)
	tw.tween_property(l, "modulate", Color(1, 1, 1, l.modulate.a), TICK_COLOR).set_delay(0.15)
	if not less():
		var y0 := l.position.y
		l.position.y = y0 + (5.0 if up else -5.0)
		tw.tween_property(l, "position:y", y0, TICK).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	if delta != "":
		var d := UiTheme.num_label(("▲ " if up else "▼ ") + delta, 12, hi)
		d.top_level = true
		d.mouse_filter = Control.MOUSE_FILTER_IGNORE
		d.z_index = 5
		l.add_child(d)
		d.global_position = l.global_position + Vector2(0, l.size.y - 2)
		d.size.x = l.size.x
		d.modulate.a = 0.0
		var t2 := d.create_tween()
		t2.tween_property(d, "modulate:a", 1.0, 0.15)
		t2.tween_interval(DELTA_HOLD)
		t2.tween_property(d, "modulate:a", 0.0, 0.4)
		t2.tween_callback(d.queue_free)

# ---- 知らせ（押した結果のひと言。下の真ん中・中身の欄の下の端） ----
# kind：good（緑の縁）・bad（赤の縁）・それ以外（金の縁）。前の知らせはすぐ消して入れ替える
static func notice(host: Control, text: String, kind := "") -> PanelContainer:
	if host == null or not is_instance_valid(host):
		return null
	if host.has_meta("_fx_note"):
		var o = host.get_meta("_fx_note")
		if is_instance_valid(o): o.queue_free()
	var col := UiTheme.BAD if kind == "bad" else (UiTheme.GOOD if kind == "good" else UiTheme.GOLD)
	var p := PanelContainer.new()
	var sb := UiTheme.box(Color(UiTheme.SUNK.r, UiTheme.SUNK.g, UiTheme.SUNK.b, 0.96), col, 1, 999, Vector4(14, 8, 24, 9))
	sb.border_width_left = 1
	sb.shadow_color = Color(0, 0, 0, 0.55)
	sb.shadow_size = 12
	sb.shadow_offset = Vector2(0, 4)
	p.add_theme_stylebox_override("panel", sb)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	p.add_child(h)
	var dot := Panel.new()
	dot.custom_minimum_size = Vector2(10, 10)
	dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	dot.add_theme_stylebox_override("panel", UiTheme.box(col, Color(0, 0, 0, 0), 0, 999, Vector4()))
	h.add_child(dot)
	h.add_child(UiTheme.label(text, 15, UiTheme.IVORY))
	p.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	p.grow_horizontal = Control.GROW_DIRECTION_BOTH
	p.grow_vertical = Control.GROW_DIRECTION_BEGIN
	p.offset_bottom = -NOTE_BOTTOM
	p.offset_top = -NOTE_BOTTOM
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.z_index = 20
	host.add_child(p)
	host.set_meta("_fx_note", p)
	p.set_meta("text", text)
	p.set_meta("kind", kind)
	var hold := hold_time(text)
	if not less():
		p.modulate.a = 0.0
		p.pivot_offset = Vector2(p.get_combined_minimum_size().x * 0.5, 20)
		p.scale = Vector2(0.94, 0.94)
		p.offset_bottom = -NOTE_BOTTOM + 24.0
		p.offset_top = p.offset_bottom
		var t1 := p.create_tween().set_parallel(true)
		t1.tween_property(p, "modulate:a", 1.0, 0.12)
		for k in ["offset_bottom", "offset_top"]:
			t1.tween_property(p, k, -NOTE_BOTTOM, NOTE_IN).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		t1.tween_property(p, "scale", Vector2.ONE, NOTE_IN).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	var t2 := p.create_tween()
	t2.tween_interval((0.0 if less() else NOTE_IN) + hold)
	t2.tween_property(p, "modulate:a", 0.0, NOTE_OUT)
	if not less():
		for k in ["offset_bottom", "offset_top"]:
			t2.parallel().tween_property(p, k, -NOTE_BOTTOM + 16.0, NOTE_OUT).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	t2.tween_callback(p.queue_free)
	return p
