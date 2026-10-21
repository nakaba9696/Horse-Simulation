# 設定の画面（タイトルとホームのメニューから開く）。中身の読み書きと効かせ方は UiSettings（ui/settings_store.gd）
# タブ（Q/E・LB/RB）：画面と音（言語・表示・解像度・全体・BGM・効果音の音量・振動）／操作の割り当て（騎乗の操作と、決める・もどる。キーとパッド）
# 画面と音：行を上下で選び、左右（十字←→）で値を替える。決定でも次の値へ。替えるとすぐ効き、すぐ書く（user://settings.cfg。セーブとは別）
# 割り当て：キーかパッドの札で決定 → 押したキー（パッドのボタン・LT/RT）にする。ほかの操作と同じなら入れ替える。5 秒で待つのをやめる
# 下：初めの設定に戻す（確かめは「やめる」から）・もどる（金）
extends UiScreen

const LIST_W := 1060.0
const WAIT := 5.0
# 画面と音の行 [設定の名前, 種類, 見出し, ひと言]
const ITEMS := [
	["lang", "choice", "言語", "画面の文の言語（Language）。替えるとすぐ切り替わる。初めての起動は PC の言語に合わせる"],
	["mode", "choice", "画面の表示", "フルスクリーンは画面いっぱい。ウィンドウは解像度の大きさ"],
	["res", "choice", "解像度", "ウィンドウの大きさ。フルスクリーンでは 3D を描く細かさをこの高さに合わせる（低いほど軽い）"],
	["vol_master", "volume", "全体の音量", "すべての音の大きさ"],
	["vol_bgm", "volume", "BGM", "曲の大きさ"],
	["vol_se", "volume", "効果音", "蹄・ムチ・ゲート・歓声などの音の大きさ"],
	["vibration", "choice", "振動", "パッドの振動（ゲート・ムチ・蹄の拍子・ゴール）"],
]
const SECTIONS := {"lang": "画面", "vol_master": "音", "vibration": "パッド"}
# 決める・もどるに使えない手（選ぶ・タブに使う）
const UI_KEYS_TAKEN := [KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT, KEY_Q, KEY_E, KEY_PAGEUP, KEY_PAGEDOWN]
const UI_PADS_TAKEN := ["b:11", "b:12", "b:13", "b:14", "b:9", "b:10"]

var tab := 0
var sel := 0
var list_v: VBoxContainer
var top_box: VBoxContainer
var pv: VBoxContainer
var rows: Array[Control] = []          # カーソルが乗る札（画面と音：行／割り当て：キーとパッドの札を順に）
var b_reset: Button
var b_back: Button
var listen := {}                       # 割り当てを待っている { a, kind, btn, until, from }
var _pad_node: UiPad

func needs_world() -> bool: return false

func hint() -> String:
	if not listen.is_empty(): return "割り当てるキー（パッドのボタン）を押す"
	return "左右で値を替える。替えるとすぐ効く（セーブとは別に保存）" if tab == 0 else "札を選んで決定 → 割り当てるキー（ボタン）を押す"

func keys() -> Array:
	var ok := [UiSettings.key_name(int(_cur().keys.ui_accept)), UiSettings.pad_name(String(_cur().pads.ui_accept))]
	var bk := [UiSettings.key_name(int(_cur().keys.ui_cancel)), UiSettings.pad_name(String(_cur().pads.ui_cancel))]
	if tab == 0:
		return [["↑↓", "十字", "選ぶ"], ["←→", "十字←→", "替える"], ["Q/E", "LB/RB", "画面と音・割り当て"], [bk[0], bk[1], "もどる"]]
	return [["↑↓←→", "十字", "選ぶ"], [ok[0], ok[1], "割り当てる"], ["Q/E", "LB/RB", "画面と音・割り当て"], [bk[0], bk[1], "もどる"]]

static func _cur() -> Dictionary:
	if UiSettings.cur.is_empty(): UiSettings.load_file()
	return UiSettings.cur

func build() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--tab="): tab = clampi(int(a.substr(6)), 0, 1)   # 撮影：割り当てのタブで開く
	backdrop("bg_title", 0.86)
	_make_band()
	for c in get_children():
		if c is UiPad: _pad_node = c
	top_box = VBoxContainer.new()
	top_box.position = Vector2(PAD_X, TOP + 4)
	top_box.custom_minimum_size = Vector2(LIST_W, 0)
	top_box.add_theme_constant_override("separation", 8)
	add_child(top_box)
	list_v = VBoxContainer.new()
	list_v.position = Vector2(PAD_X, 212)
	list_v.custom_minimum_size = Vector2(LIST_W, 0)
	list_v.add_theme_constant_override("separation", 4)
	add_child(list_v)
	# 下の札：初めの設定に戻す・もどる（金）
	var bh := HBoxContainer.new()
	bh.position = Vector2(PAD_X, 1000 - 56 - 70)
	bh.custom_minimum_size = Vector2(LIST_W, 0)
	bh.add_theme_constant_override("separation", 12)
	add_child(bh)
	b_reset = UiScreen.danger_button("初めの設定に戻す", 230, 52, 17)
	b_reset.pressed.connect(func(): confirm("初めの設定に戻しますか？\n画面・音・振動・割り当てが、最初の値になります。", "戻す", _do_reset))
	bh.add_child(b_reset)
	bh.add_child(UiScreen.spacer())
	b_back = UiScreen.button("もどる", true, 220, 52, 20)
	b_back.pressed.connect(on_back)
	bh.add_child(b_back)
	# 右の見本
	var pb := UiScreen.panel_box(true, 10)
	(pb[0] as PanelContainer).position = Vector2(PAD_X + LIST_W + 20, TOP + 4)
	(pb[0] as PanelContainer).custom_minimum_size = Vector2(1600 - PAD_X * 2 - LIST_W - 20, 1000 - TOP - 4 - 70)
	add_child(pb[0])
	pv = pb[1]
	_fill()

# ---- 行を組む ----
func _fill() -> void:
	for box in [top_box, list_v]:
		for c in box.get_children():
			box.remove_child(c)
			c.queue_free()
	rows.clear()
	top_box.add_child(UiTheme.tabs(["画面と音", "操作の割り当て"], tab, pad, func(k): _set_tab(k)))
	if tab == 0: _fill_general()
	else: _fill_binds()
	_link_focus()
	sel = clampi(sel, 0, maxi(0, rows.size() - 1))
	_preview(sel)
	if rows.size() and shots.is_empty(): rows[sel].grab_focus.call_deferred()
	elif rows.size(): rows[sel].grab_focus()

func _fill_general() -> void:
	var c := _cur()
	for i in ITEMS.size():
		var it: Array = ITEMS[i]
		var k: String = it[0]
		if SECTIONS.has(k):
			var sm := MarginContainer.new()
			sm.add_theme_constant_override("margin_top", 6 if i > 0 else 0)
			sm.add_child(UiScreen.section(String(SECTIONS[k])))
			list_v.add_child(sm)
		var rb := UiScreen.row_button(60, false)
		var b: Button = rb[0]
		var hb: HBoxContainer = rb[1]
		var nl := UiTheme.label(String(it[2]), 18)
		nl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		hb.add_child(nl)
		var idx: int = rows.size()
		hb.add_child(_arrow("◀", func(): _change(idx, -1)))
		if it[1] == "volume":
			hb.add_child(_bar(float(c[k])))
		else:
			var val := UiTheme.label(_value_text(k), 18, UiTheme.GOLD_BRIGHT, HORIZONTAL_ALIGNMENT_CENTER)
			val.custom_minimum_size.x = 300
			hb.add_child(val)
		hb.add_child(_arrow("▶", func(): _change(idx, 1)))
		if it[1] == "volume":
			var vl := UiTheme.num_label(str(int(c[k])), 18, UiTheme.GOLD_BRIGHT)
			vl.custom_minimum_size.x = 48
			hb.add_child(vl)
		else:
			var gap := Control.new()
			gap.custom_minimum_size.x = 48
			hb.add_child(gap)
		b.focus_entered.connect(func(): _preview(idx))
		b.pressed.connect(func(): _change(idx, 1, true))
		b.gui_input.connect(func(ev): _row_input(ev, b, idx))
		b.set_meta("item", k)
		list_v.add_child(b)
		rows.append(b)

# 左右の矢印（マウスで押す小さな札。キー・パッドは行の上で左右）
func _arrow(t: String, f: Callable) -> Button:
	var b := Button.new()
	b.text = t
	b.flat = true
	b.focus_mode = Control.FOCUS_NONE
	b.set_meta("pad", "←→")
	b.custom_minimum_size = Vector2(34, 40)
	b.add_theme_font_size_override("font_size", 16)
	b.add_theme_color_override("font_color", UiTheme.GOLD)
	b.add_theme_color_override("font_hover_color", UiTheme.GOLD_BRIGHT)
	b.pressed.connect(f)
	return b

# 音量の棒（沈みの溝に金）
func _bar(v: float) -> Control:
	var box := Control.new()
	box.custom_minimum_size = Vector2(300, 14)
	box.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var bg := Panel.new()
	bg.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.SUNK, UiTheme.LINE_STRONG, 1, 999, Vector4(0, 0, 0, 0)))
	bg.size = Vector2(300, 14)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.add_child(bg)
	if v > 0.0:
		var fill := Panel.new()
		fill.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.GOLD, Color(0, 0, 0, 0), 0, 999, Vector4(0, 0, 0, 0)))
		fill.size = Vector2(maxf(14.0, 300.0 * v / 100.0), 14)
		fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
		box.add_child(fill)
	return box

func _value_text(k: String) -> String:
	var c := _cur()
	match k:
		"lang": return String(HSText.LANG_NAME.get(HSText.lang, "日本語"))  # i18n:skip（言語の名前はその言語のまま）
		"mode": return HSText.t("フルスクリーン" if c.mode == "full" else "ウィンドウ")
		"res": return UiSettings.res_label(c.res)
		"vibration": return HSText.t("入" if c.vibration else "切")
	return str(int(c[k]))

func _row_input(ev: InputEvent, b: Button, idx: int) -> void:
	if ev.is_action_pressed("ui_left", true):
		_change(idx, -1); b.accept_event()
	elif ev.is_action_pressed("ui_right", true):
		_change(idx, 1); b.accept_event()

# 値を替える（すぐ効かせて書く）
# wrap：決定で押したときは端から反対の端へ回る（左右では端で止まる）
func _change(idx: int, d: int, wrap := false) -> void:
	if tab != 0 or idx < 0 or idx >= ITEMS.size(): return
	var k: String = ITEMS[idx][0]
	var c := _cur()
	match k:
		"lang":
			var ls: Array = HSText.LANGS
			var li := ls.find(HSText.lang) + d
			UiSettings.set_value("lang", ls[posmod(li, ls.size())])
			sel = idx
			# 言語を替えたら画面ごと組み直す（帯・下の札・操作の案内も替える）
			if shots.is_empty(): UiFlow.go(get_tree(), "settings")
			return
		"mode": UiSettings.set_value("mode", "window" if c.mode == "full" else "full")
		"vibration":
			UiSettings.set_value("vibration", not c.vibration)
			if c.vibration: ViewRideInput.play(180, 0.6, 0.6)   # 入れたら一度だけ震えて知らせる
		"res":
			var n := UiSettings.RESOLUTIONS.size()
			var i := UiSettings.RESOLUTIONS.find(c.res) + d
			i = posmod(i, n) if wrap else clampi(i, 0, n - 1)
			UiSettings.set_value("res", UiSettings.RESOLUTIONS[i])
		_:
			var v := int(c[k]) + d * UiSettings.VOL_STEP
			if wrap and v > 100: v = 0
			UiSettings.set_value(k, clampi(v, 0, 100))
	sel = idx
	_refresh_band()
	_fill()

func _refresh_band() -> void:
	if band: band.queue_free()
	_make_band()
	if fade: move_child(band, fade.get_index())

func _make_band() -> void:
	make_band("設", "設定", "言語・画面・音・振動・操作の割り当て（この PC に保存。セーブとは別）", [["言語", _value_text("lang")], ["画面", _value_text("mode")], ["全体の音量", str(int(_cur().vol_master))], ["振動", _value_text("vibration")]])

# ---- 割り当て ----
func _fill_binds() -> void:
	var c := _cur()
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 12)
	var h0 := UiTheme.label("操作", 12, UiTheme.MUTED)
	h0.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(h0)
	for t in ["キーボード", "パッド"]:
		var l := UiTheme.label(t, 12, UiTheme.MUTED, HORIZONTAL_ALIGNMENT_CENTER)
		l.custom_minimum_size.x = 200
		head.add_child(l)
	var hm := MarginContainer.new()
	hm.add_theme_constant_override("margin_left", 14)
	hm.add_theme_constant_override("margin_right", 14)
	hm.add_child(head)
	list_v.add_child(hm)
	var last_g := ""
	for p in UiSettings.ACTIONS:
		var a: String = p[0]
		var row := PanelContainer.new()
		var sb := UiTheme.row_box(0, false, false)
		if p[2] != last_g and last_g != "":
			sb.border_color = UiTheme.LINE_GOLD
			sb.border_width_top = 1
		last_g = p[2]
		row.add_theme_stylebox_override("panel", sb)
		var hb := HBoxContainer.new()
		hb.add_theme_constant_override("separation", 12)
		row.add_child(hb)
		var nl := UiTheme.label(HSText.t(String(p[1])), 16)
		nl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		hb.add_child(nl)
		for kind in ["key", "pad"]:
			var txt := UiSettings.key_name(int(c.keys[a])) if kind == "key" else UiSettings.pad_name(String(c.pads[a]))
			var b := UiScreen.button(txt, false, 200, 38, 16)
			b.set_meta("bind", [a, kind])
			var idx: int = rows.size()
			b.focus_entered.connect(func(): _preview(idx))
			b.pressed.connect(func(): _listen(b, a, kind))
			hb.add_child(b)
			rows.append(b)
		list_v.add_child(row)

func _listen(b: Button, a: String, kind: String) -> void:
	if not listen.is_empty(): return
	listen = {"a": a, "kind": kind, "btn": b, "until": _now() + WAIT, "from": _now() + 0.15}
	b.text = HSText.t("押してください…")
	UiTheme.gold_button(b)
	if _pad_node:
		_pad_node.set_process(false)
		_pad_node.set_process_input(false)
	if kb_hint: kb_hint.text = HSText.auto(hint())

func _end_listen(msg := "", kind := "") -> void:
	listen = {}
	if _pad_node:
		_pad_node.set_process(true)
		_pad_node.set_process_input(true)
	_fill()
	refresh_keybar()
	if msg != "": toast(msg, kind)

static func _now() -> float:
	return Time.get_ticks_msec() / 1000.0

func _input(ev: InputEvent) -> void:
	if listen.is_empty():
		super._input(ev)
		return
	get_viewport().set_input_as_handled()
	if _now() < float(listen.from): return
	var got = UiSettings.code_of(ev)
	if got == null: return
	var a: String = listen.a
	if got[0] != listen.kind:
		# 違う道具で押した：キーを待っているときのパッドの B、パッドを待っているときの Esc はやめる
		if (got[0] == "pad" and got[1] == "b:%d" % JOY_BUTTON_B) or (got[0] == "key" and got[1] == KEY_ESCAPE):
			_end_listen()
		return
	if UiSettings._group(a) == "ui" and ((got[0] == "key" and UI_KEYS_TAKEN.has(got[1])) or (got[0] == "pad" and UI_PADS_TAKEN.has(got[1]))):
		_end_listen("その手は選ぶ・タブに使うので、決める・もどるには使えない", "bad")
		return
	UiSettings.bind(a, String(got[0]), got[1])
	_end_listen(HSText.t("「%s」を %s にした") % [HSText.t(_action_label(a)), UiSettings.key_name(int(got[1])) if got[0] == "key" else UiSettings.pad_name(String(got[1]))], "good")

func _process(delta: float) -> void:
	super._process(delta)
	if not listen.is_empty():
		var left := float(listen.until) - _now()
		if left <= 0.0:
			_end_listen("割り当てをやめた")
		elif is_instance_valid(listen.btn):
			(listen.btn as Button).text = HSText.t("押してください %d") % int(ceil(left))

static func _action_label(a: String) -> String:
	for p in UiSettings.ACTIONS:
		if p[0] == a: return String(p[1])
	return a

# ---- カーソルの行き先（行の札・下の札。割り当ては左右の列） ----
func _link_focus() -> void:
	var cols := 1 if tab == 0 else 2
	var n := rows.size()
	for i in n:
		var b := rows[i]
		var up := i - cols
		var dn := i + cols
		b.focus_neighbor_top = rows[up].get_path() if up >= 0 else b_back.get_path()
		b.focus_neighbor_bottom = rows[dn].get_path() if dn < n else (b_reset.get_path() if (i % cols) == 0 else b_back.get_path())
		if cols == 2:
			b.focus_neighbor_left = rows[i - 1].get_path() if i % 2 == 1 else b.get_path()
			b.focus_neighbor_right = rows[i + 1].get_path() if i % 2 == 0 else b.get_path()
		else:
			b.focus_neighbor_left = b.get_path()
			b.focus_neighbor_right = b.get_path()
	if n:
		b_reset.focus_neighbor_top = rows[n - cols].get_path() if n >= cols else rows[0].get_path()
		b_back.focus_neighbor_top = rows[n - 1].get_path()
		b_reset.focus_neighbor_bottom = rows[0].get_path()
		b_back.focus_neighbor_bottom = rows[cols - 1 if n >= cols else 0].get_path()
	b_reset.focus_neighbor_right = b_back.get_path()
	b_back.focus_neighbor_left = b_reset.get_path()
	b_reset.focus_neighbor_left = b_reset.get_path()
	b_back.focus_neighbor_right = b_back.get_path()

# ---- 右の見本 ----
func _preview(i: int) -> void:
	sel = i
	for c in pv.get_children():
		pv.remove_child(c)   # すぐ外す（同じコマで2度組むと板が伸びたままになる）
		c.queue_free()
	var c := _cur()
	if tab == 0:
		if i < 0 or i >= ITEMS.size(): return
		var it: Array = ITEMS[i]
		pv.add_child(UiScreen.section(String(it[2])))
		var big := UiTheme.title(_value_text(String(it[0])), 44, UiTheme.GOLD_BRIGHT)
		pv.add_child(big)
		var nl := UiTheme.label(String(it[3]), 15, UiTheme.MUTED)
		nl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		nl.custom_minimum_size.x = 420
		pv.add_child(nl)
		if it[0] == "res":
			var fl := HFlowContainer.new()
			fl.add_theme_constant_override("h_separation", 6)
			fl.add_theme_constant_override("v_separation", 6)
			for r in UiSettings.RESOLUTIONS:
				var on: bool = r == c.res
				fl.add_child(UiTheme.chip(UiSettings.res_label(r), UiTheme.GOLD_DIM if on else UiTheme.SURFACE_3, UiTheme.ON_GOLD if on else UiTheme.MUTED, 13))
			pv.add_child(fl)
		# いまの設定（ひと目で）
		var mg := MarginContainer.new()
		mg.add_theme_constant_override("margin_top", 18)
		mg.add_child(UiScreen.section("いまの設定"))
		pv.add_child(mg)
		for x in ITEMS:
			var kv := HBoxContainer.new()
			kv.add_child(UiTheme.label(String(x[2]), 14, UiTheme.MUTED))
			kv.add_child(UiScreen.spacer())
			kv.add_child(UiTheme.label(_value_text(String(x[0])), 15, UiTheme.GOLD_BRIGHT if x[0] == it[0] else UiTheme.IVORY))
			pv.add_child(kv)
	else:
		var b := rows[i] if i >= 0 and i < rows.size() else null
		if b == null: return
		var m: Array = b.get_meta("bind")
		var a: String = m[0]
		pv.add_child(UiScreen.section(HSText.t(_action_label(a)), "騎乗" if UiSettings._group(a) == "ride" else "画面"))
		var gh := HBoxContainer.new()
		gh.add_theme_constant_override("separation", 16)
		for kind in ["key", "pad"]:
			var v := VBoxContainer.new()
			v.add_child(UiTheme.label("キーボード" if kind == "key" else "パッド", 13, UiTheme.GOLD_BRIGHT if kind == m[1] else UiTheme.MUTED))
			var on := UiSettings.pad_name(String(c.pads[a])) if kind == "pad" else UiSettings.key_name(int(c.keys[a]))
			v.add_child(UiTheme.chip(on, UiTheme.GOLD_DIM if kind == m[1] else UiTheme.SURFACE_3, UiTheme.ON_GOLD if kind == m[1] else UiTheme.IVORY, 24, 150))
			gh.add_child(v)
		pv.add_child(gh)
		var nl := UiTheme.label("決定のあと、割り当てるキー（ボタン）を押す。ほかの操作と同じ手なら入れ替える", 15, UiTheme.MUTED)
		nl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		nl.custom_minimum_size.x = 420
		pv.add_child(nl)
		var extra := _extra_text(a)
		if extra != "":
			var el := UiTheme.label(extra, 13, UiTheme.FAINT)
			el.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			el.custom_minimum_size.x = 420
			pv.add_child(el)
	var sp := Control.new()
	sp.size_flags_vertical = Control.SIZE_EXPAND_FILL
	pv.add_child(sp)
	pv.add_child(UiTheme.label(HSText.t("保存先：%s") % UiSettings.path, 12, UiTheme.FAINT))
	var pane := pv.get_parent() as Control
	pane.size = pane.custom_minimum_size

# 割り当てのほかに効く手（既定のまま残るもの）
static func _extra_text(a: String) -> String:
	match a:
		"ride_up": return "ほかに：スペース・左スティック↑"
		"ride_down": return "ほかに：左スティック↓"
		"ride_left", "ride_right": return "ほかに：左スティック（押し続けると続けて動く）"
		"ride_pause": return "ほかに：P"
		"ui_accept": return "ほかに：スペース・テンキーの Enter"
	return ""

func _set_tab(k: int) -> void:
	if not listen.is_empty(): return
	tab = k
	sel = 0
	_fill()
	refresh_keybar()

func on_tab(d: int) -> void:
	if _modal != null or not listen.is_empty(): return
	_set_tab(posmod(tab + d, 2))

func on_back() -> void:
	if not listen.is_empty():
		_end_listen()
		return
	var to := UiFlow.settings_back
	if to == "home" and not UiFlow.active(): to = "title"
	go(to)

func _do_reset() -> void:
	UiSettings.reset()
	sel = 0
	_refresh_band()
	_fill()
	refresh_keybar()
	toast("初めの設定に戻した", "good")

func focus_first() -> void:
	if rows.size():
		rows[clampi(sel, 0, rows.size() - 1)].grab_focus()
