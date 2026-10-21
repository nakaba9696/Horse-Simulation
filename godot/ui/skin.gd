# 画面の部品の絵（godot/assets/ui。持ち主が GPT の画像生成で作った絵。頼み方は docs/art/UI_ART_REQUEST.md、使い方は docs/UI.md「部品の絵」）
# 九つ切り（StyleBoxTexture）でボタン（通常・選んでいる・押した・押せない）・札・表の行・タブ・見出しの帯・節の帯・区切りを描く。
# 角の px は godot/assets/ui/slices.json（[左, 上, 右, 下]）。札が絵より低いときは、絵ごと縮めて角の飾りの形を保つ。
# 絵が読めないとき（ファイルが無い・enabled＝false）は null を返す。呼ぶ側は前の色の形（UiTheme の StyleBoxFlat）に戻る。
# アイコン（金の線画）は名前で引く：UiSkin.icon("farm") → icon_farm.png
class_name UiSkin
extends RefCounted

const DIR := "res://assets/ui/"
const ICONS := ["back", "calendar", "crown", "data", "dirt", "farm", "horse", "horseshoe", "laurel", "lock", "money", "owner", "race", "saddle", "settings", "shop", "stable", "star", "trophy", "turf"]

static var enabled := true    # false で絵を使わない（前の形で撮って比べる・テスト）
static var _slices = null
static var _tex := {}         # "名前@倍率" → Texture2D（無ければ null）

# slices.json の textures（"btn_main_normal.png" → {width, height, slice_margins_px, …}）
static func slices() -> Dictionary:
	if _slices == null:
		_slices = {}
		var f := FileAccess.open(DIR + "slices.json", FileAccess.READ)
		if f:
			var j = JSON.parse_string(f.get_as_text())
			if j is Dictionary and j.get("textures") is Dictionary:
				_slices = j.textures
	return _slices

static func info(name: String) -> Dictionary:
	var s = slices().get(name + ".png")
	return s if s is Dictionary else {}

# 角の px（[左, 上, 右, 下]。絵のもとの大きさで）
static func margins(name: String) -> Array:
	var m = info(name).get("slice_margins_px")
	return m if m is Array and m.size() == 4 else [0, 0, 0, 0]

static func has(name: String) -> bool:
	return tex(name) != null

# 絵（倍率 scale で縮めたもの）。無ければ null
static func tex(name: String, scale := 1.0) -> Texture2D:
	if not enabled:
		return null
	scale = clampf(scale, 0.2, 1.0)
	var key := "%s@%.3f" % [name, scale]
	if _tex.has(key):
		return _tex[key]
	var t: Texture2D = null
	var p := DIR + name + ".png"
	if ResourceLoader.exists(p):
		t = load(p)
		if t != null and scale < 0.999:
			var img := t.get_image()
			if img != null and not img.is_empty():
				img = img.duplicate() as Image
				if img.is_compressed(): img.decompress()
				img.resize(maxi(1, roundi(img.get_width() * scale)), maxi(1, roundi(img.get_height() * scale)), Image.INTERPOLATE_LANCZOS)
				t = ImageTexture.create_from_image(img)
			# 縮められないとき（画面の無いテスト）はもとの大きさのまま
	_tex[key] = t
	return t

# 札の高さ h に角の飾りが収まる倍率（上と下の角の和が h の 85% まで）
static func fit(name: String, h: float) -> float:
	var m := margins(name)
	var mh := float(m[1]) + float(m[3])
	if mh <= 0.0 or h <= 0.0:
		return 1.0
	return clampf(h * 0.85 / mh, 0.2, 1.0)

# 九つ切りの札。pad＝中身の余白（左・上・右・下）。絵が無ければ null
static func box(name: String, pad := Vector4(16, 8, 16, 8), scale := 1.0) -> StyleBoxTexture:
	var t := tex(name, scale)
	if t == null:
		return null
	var w0 := float(info(name).get("width", t.get_width()))
	var s := float(t.get_width()) / maxf(1.0, w0)    # 実際に縮めた倍率
	var m := margins(name)
	var sb := StyleBoxTexture.new()
	sb.texture = t
	sb.texture_margin_left = float(m[0]) * s
	sb.texture_margin_top = float(m[1]) * s
	sb.texture_margin_right = float(m[2]) * s
	sb.texture_margin_bottom = float(m[3]) * s
	if info(name).get("horizontal_mode") == "tile":
		sb.axis_stretch_horizontal = StyleBoxTexture.AXIS_STRETCH_MODE_TILE_FIT
	sb.content_margin_left = pad.x
	sb.content_margin_top = pad.y
	sb.content_margin_right = pad.z
	sb.content_margin_bottom = pad.w
	return sb

# ---- ボタン：kind "main"（金の面。主な操作）・"sub"（深緑に金の細い縁）。h＝ボタンの高さ ----
# 通常・選んでいる（乗せたときも）・押した（2px 沈む）・押せない の4つ。絵が無ければ false（呼ぶ側が前の形にする）
static func button(b: Button, kind := "sub", h := 52.0, padx := 24.0) -> bool:
	var s := fit("btn_%s_normal" % kind, h)
	var pad := Vector4(padx, 6, padx, 8)
	var n := box("btn_%s_normal" % kind, pad, s)
	if n == null:
		return false
	var fo := box("btn_%s_focus" % kind, pad, s)
	var pr := box("btn_%s_pressed" % kind, Vector4(padx, 8, padx, 6), s)
	var di := box("btn_%s_disabled" % kind, pad, s)
	b.add_theme_stylebox_override("normal", n)
	b.add_theme_stylebox_override("hover", fo if fo else n)
	b.add_theme_stylebox_override("focus", fo if fo else n)
	b.add_theme_stylebox_override("pressed", pr if pr else n)
	b.add_theme_stylebox_override("hover_pressed", pr if pr else n)
	b.add_theme_stylebox_override("disabled", di if di else n)
	if kind == "main":
		for k in ["font_color", "font_hover_color", "font_focus_color", "font_pressed_color", "font_hover_pressed_color"]:
			b.add_theme_color_override(k, UiTheme.ON_GOLD)
		b.add_theme_color_override("font_disabled_color", Color(0.86, 0.9, 0.87, 0.6))
	else:
		b.add_theme_color_override("font_color", UiTheme.IVORY)
		b.add_theme_color_override("font_hover_color", UiTheme.GOLD_BRIGHT)
		b.add_theme_color_override("font_focus_color", UiTheme.GOLD_BRIGHT)
		b.add_theme_color_override("font_pressed_color", UiTheme.GOLD_BRIGHT)
		b.add_theme_color_override("font_hover_pressed_color", UiTheme.GOLD_BRIGHT)
		b.add_theme_color_override("font_disabled_color", Color(0.8, 0.85, 0.82, 0.5))
	b.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0))
	return true

# ---- 札（深緑の板・金の縁と角の飾り。選んでいる札は金の縁が光る） ----
static func card(focus := false, pad := Vector4(34, 22, 34, 22), h := 0.0) -> StyleBoxTexture:
	var nm := "panel_card_focus" if focus else "panel_card"
	return box(nm, pad, fit(nm, h) if h > 0.0 else 1.0)

# ---- 表の行（細長い板。選んでいる行は左に金の印と明るい地） ----
static func row(focus := false, h := 56.0, pad := Vector4(40, 4, 34, 4), scale := 0.0) -> StyleBoxTexture:
	var nm := "row_focus" if focus else "row_normal"
	return box(nm, pad, scale if scale > 0.0 else fit(nm, h))

# 押せる行（Button）に行の絵を付ける。mine＝自分の物（選んだ親など）は選んでいなくても明るい行
static func row_button(b: Button, h: float, mine := false, pad := Vector4(40, 4, 34, 4), scale := 0.0) -> bool:
	var n := row(mine, h, pad, scale)
	var f := row(true, h, pad, scale)
	if n == null or f == null:
		return false
	b.add_theme_stylebox_override("normal", n)
	for st in ["hover", "focus", "pressed", "hover_pressed"]:
		b.add_theme_stylebox_override(st, f)
	return true

# ---- タブ（溝の中のつまみ。選んだタブは金の面） ----
static func tab_track() -> StyleBoxTexture:
	return box("tab_track", Vector4(18, 5, 18, 5), fit("tab_track", 48.0))

static func tab(active: bool, h := 38.0) -> StyleBoxTexture:
	var nm := "tab_active" if active else "tab_normal"
	return box(nm, Vector4(18, 4, 18, 4), fit(nm, h))

# ---- 見出しの帯（画面の上）・節の帯（左に金の印） ----
static func band(h := 76.0) -> StyleBoxTexture:
	return box("band_title", Vector4(58, 6, 64, 6), clampf(h / 96.0, 0.2, 1.0))

static func section(h := 36.0) -> StyleBoxTexture:
	return box("band_section", Vector4(46, 2, 18, 3), clampf(h / 44.0, 0.2, 1.0))

# 区切りの線（白いラチを横から見た形）。絵が無ければ髪の毛の線
static func rail(h := 12.0) -> Control:
	var p := PanelContainer.new()
	var sb := box("divider_rail", Vector4(0, 0, 0, 0), clampf(h / 16.0, 0.2, 1.0))
	if sb == null:
		var c := ColorRect.new()
		c.color = UiTheme.LINE_STRONG
		c.custom_minimum_size.y = 1
		return c
	p.add_theme_stylebox_override("panel", sb)
	p.custom_minimum_size.y = h
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return p

# ---- アイコン（64×64 の金の線画）。名前で引く。無ければ null ----
static func icon_tex(name: String, px := 64.0) -> Texture2D:
	return tex("icon_" + name, px / 64.0)

static func icon(name: String, px := 28.0, tint := Color.WHITE) -> TextureRect:
	var t := icon_tex(name, px)
	if t == null:
		return null
	var tr := TextureRect.new()
	tr.texture = t
	tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	tr.custom_minimum_size = Vector2(px, px)
	tr.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	tr.modulate = tint
	tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return tr

# 丸い札にアイコン（見出しの帯の左の印）。絵が無ければ null
static func round_icon(name: String, d := 56.0) -> Control:
	var t := tex("btn_round_focus", d / 96.0)
	var ic := icon(name, d * 0.56)
	if t == null or ic == null:
		return null
	var p := PanelContainer.new()
	var sb := StyleBoxTexture.new()
	sb.texture = t
	p.add_theme_stylebox_override("panel", sb)
	p.custom_minimum_size = Vector2(d, d)
	p.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var cc := CenterContainer.new()
	cc.add_child(ic)
	p.add_child(cc)
	return p

# ボタンの左にアイコン（コマンドの札）
static func button_icon(b: Button, name: String, px := 24.0) -> void:
	var t := icon_tex(name, px)
	if t == null:
		return
	b.icon = t
	b.add_theme_constant_override("icon_max_width", int(px))
	b.add_theme_constant_override("h_separation", 8)

# 背景の絵（1920×1080 の PNG）
static func background(name: String) -> Texture2D:
	return tex(name)
