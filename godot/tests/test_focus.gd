# 全部の画面をコントローラーで（持ち主の指摘 2026-10-20「レース中だけでなく、全部の画面をコントローラーで操作できるように」。docs/UI.md 4）
# 画面ごとに：
# - パッドの A が決定（ui_accept）・B がもどる（ui_cancel）に入っている（Godot 4.7 の既定には入っていない）
# - 開いたとき、カーソル（フォーカス）がどこかの札にある
# - 押せる札（見えていて押せるボタン）は、どれもカーソルが乗る。乗らない札は、パッドのボタン（meta "pad"＝"tab"・"Y"・"X" など）で押せると印がある
# - カーソルが乗る札は、最初の札から十字キー（上下左右の行き先）だけでたどり着ける。タブのある画面は LB・RB で替えたタブごとに見る
# - 小窓（確かめ・詳しい小窓）を開くと、カーソルは小窓の中だけを動く（後ろの札へ抜けない）
# 何フレームか待って並べてから見るので run_async（tests/run.gd が待つ）
extends RefCounted

const SIDES := [SIDE_LEFT, SIDE_TOP, SIDE_RIGHT, SIDE_BOTTOM]

func run_async(t) -> void:
	var era0 = HSU.ERA
	UiPad.ensure_actions()
	t.ok(_has_joy("ui_accept", JOY_BUTTON_A), "focus: パッドの A で決める（ui_accept）")
	t.ok(_has_joy("ui_cancel", JOY_BUTTON_B), "focus: パッドの B でもどる（ui_cancel）")
	# 左スティック：0.5 で入り、0.3 まで戻るまで同じ向き（軸の揺れで何度も動かない）。軸は ui_* から外して UiPad が向きに直す
	t.ok(UiPad.stick_dir(0.0, 0.6, "") == "ui_down" and UiPad.stick_dir(0.0, 0.4, "") == "" and UiPad.stick_dir(0.0, 0.4, "ui_down") == "ui_down" and UiPad.stick_dir(0.0, 0.2, "ui_down") == "", "focus: 左スティックの向き（入り 0.5・戻り 0.3）")
	t.ok(UiPad.stick_dir(-0.9, 0.3, "") == "ui_left" and UiPad.stick_dir(0.2, -0.8, "") == "ui_up", "focus: 左スティックは強いほうの軸の向き")
	t.ok(not InputMap.action_get_events("ui_down").any(func(e): return e is InputEventJoypadMotion), "focus: 左スティックの軸は ui_down から外す（UiPad が向きに直す）")
	# 出走表（その週の本当の出走表）
	UiFlow.demo_ride(1)
	await _screen(t, "race_card")
	# 週の結果を作ってから、ほかの画面
	UiFlow.demo_week(1)
	UiFlow.program_id = HSWorld.mine()[0].id if HSWorld.mine().size() else ""
	for n in ["title", "home", "program", "shop", "stable", "horse", "breed", "data", "owners", "gf", "week_result"]:
		await _screen(t, n)
	HSU.ERA = era0
	HSWorld.G = null
	UiFlow._reset_week()
	UiFlow.no_save = false

func _has_joy(action: String, b: int) -> bool:
	for e in InputMap.action_get_events(action):
		if e is InputEventJoypadButton and e.button_index == b: return true
	return false

func _frames(t, n: int) -> void:
	for i in n:
		await t.process_frame

func _screen(t, n: String) -> void:
	var sc = load("res://scenes/%s.tscn" % n).instantiate()
	t.root.add_child(sc)
	await _frames(t, 3)
	if sc.has_method("focus_first"): sc.focus_first()
	await _frames(t, 2)
	_check(t, sc, n, "")
	# タブのある画面：LB・RB で替えたタブごと
	var tabs := 0
	if n in ["program", "shop", "stable", "horse", "data", "gf"] and sc.has_method("on_tab"):
		tabs = {"data": 12, "horse": 5}.get(n, 3)
	for k in tabs:
		sc.on_tab(1)
		await _frames(t, 2)
		if t.root.get_viewport().gui_get_focus_owner() == null and sc.has_method("focus_first"):
			sc.focus_first()
			await _frames(t, 1)
		_check(t, sc, n, "タブ%d" % (k + 2))
	# 小窓：馬の店の詳しい小窓 → 確かめ。厩舎の引退の確かめ
	if n == "shop" and sc.rows.size() > 0:
		sc.rows[0].pressed.emit()
		await _frames(t, 2)
		_check(t, sc, n, "詳しい小窓", sc._modal)
		if sc.detail_buy:
			sc.detail_buy.pressed.emit()
			await _frames(t, 2)
			_check(t, sc, n, "確かめ", sc._modal)
		sc.close_modal()
	if n == "race_card":
		# 印の凡例は出さない（持ち主「印の意味書かないでいい」）・特殊能力の見出しはパッシブとスキル・道悪はほかの能力と同じ並び
		var texts: Array = sc.find_children("*", "Label", true, false).map(func(l): return String(l.text))
		t.ok(not texts.any(func(x): return x.begins_with("印：")), "focus: 出走表に印の凡例が無い")
		t.ok(texts.has("パッシブ") and texts.has("スキル") and not texts.has("性質") and not texts.has("発動"), "focus: 特殊能力の見出しはパッシブ・スキル")
		var mud_in_grid := false
		for l in sc.card_stats.find_children("*", "Label", true, false):
			if String(l.text) == "道悪" and l.get_parent() is GridContainer: mud_in_grid = true
		t.ok(mud_in_grid, "focus: 道悪はほかの能力と同じ並び（能力の格子の中）")
		t.ok(sc.btn_gate.has_meta("glyph") and sc.btn_paddock.has_meta("glyph"), "focus: ゲートイン・パドックのボタンに押すボタンの印")
		var s1: int = sc.sel
		var rb := InputEventJoypadButton.new()
		rb.button_index = JOY_BUTTON_RIGHT_SHOULDER; rb.pressed = true
		sc._input(rb)
		t.eq(sc.sel, posmod(s1 + 1, sc.rows.size()), "focus: RB で次の馬")
		var lb := InputEventJoypadButton.new()
		lb.button_index = JOY_BUTTON_LEFT_SHOULDER; lb.pressed = true
		sc._input(lb)
		t.eq(sc.sel, s1, "focus: LB で前の馬")
		sc._open_paddock()
		await _frames(t, 2)
		var s0: int = sc.sel
		var e := InputEventAction.new()
		e.action = "ui_down"; e.pressed = true
		sc._input(e)
		t.ok(sc.sel != s0, "focus: パドックでは十字キーの上下で馬を替える")
		sc._close_paddock()
	sc.queue_free()
	await _frames(t, 1)

# 押せる札・カーソルの行き先を確かめる。modal があれば、その中だけ
func _check(t, sc: Node, n: String, where: String, modal: Node = null) -> void:
	var tag := n + ("（%s）" % where if where != "" else "")
	var vp: Viewport = sc.get_viewport()
	var cur: Control = vp.gui_get_focus_owner()
	var scope: Node = modal if modal != null else sc
	var all: Array = []
	var bad: Array = []
	for b in scope.find_children("*", "BaseButton", true, false):
		var bb := b as BaseButton
		if not bb.is_visible_in_tree() or bb.disabled or bb.is_queued_for_deletion(): continue
		if modal == null and sc.get("_modal") != null and (sc._modal as Node).is_ancestor_of(bb): continue
		if bb.focus_mode == Control.FOCUS_NONE:
			# 押しても何も起きない札（表の行の形をした、見るだけの行）は数えない
			if not bb.has_meta("pad") and not bb.get_signal_connection_list("pressed").is_empty(): bad.append(_name(bb))
			continue
		all.append(bb)
	t.ok(bad.is_empty(), "focus: %s の押せる札は、どれもカーソルが乗るか、パッドのボタンで押せる（%s）" % [tag, ", ".join(bad)])
	# 押せる札が1つも無い画面（空のタブ）は、カーソルが無くてよい（B でもどる）
	if all.is_empty() and cur == null: return
	t.ok(cur != null and scope.is_ancestor_of(cur), "focus: %s を開くとカーソルが札にある（%s）" % [tag, cur.get_path() if cur else "なし"])
	if cur == null: return
	# 十字キーでたどる
	var seen := {cur: true}
	var q: Array = [cur]
	var escaped: Array = []
	while not q.is_empty():
		var c: Control = q.pop_back()
		for s in SIDES:
			var nb: Control = c.find_valid_focus_neighbor(s)
			if nb == null or seen.has(nb): continue
			seen[nb] = true
			if not scope.is_ancestor_of(nb):
				escaped.append(_name(nb))
				continue
			q.append(nb)
	var lost: Array = []
	for b in all:
		if not seen.has(b): lost.append(_name(b))
	# 押すボタンの印：右下の操作の案内は印（UiGlyph）で出し、字のあるボタンを選んでいるときはその横に決定の印
	var glyphs := sc.find_children("*", "Control", true, false).filter(func(x): return x is UiGlyph and x.is_visible_in_tree())
	t.ok(glyphs.size() > 0, "focus: %s に押すボタンの印がある" % tag)
	if cur is Button and String(cur.text) != "" and not cur.has_meta("glyph"):
		var pads: Array = sc.get_children().filter(func(x): return x is UiPad)
		t.ok(pads.size() > 0 and pads[0].cursor_glyph.visible, "focus: %s の選んでいるボタンの横に決定の印（%s）" % [tag, cur.text])
	t.ok(lost.is_empty(), "focus: %s の札は十字キーでたどり着ける（届かない：%s）" % [tag, ", ".join(lost.slice(0, 8))])
	t.ok(escaped.is_empty(), "focus: %s のカーソルは画面（小窓）の外へ抜けない（%s）" % [tag, ", ".join(escaped.slice(0, 6))])

func _name(c: Control) -> String:
	if c is Button and String((c as Button).text) != "": return "「%s」" % (c as Button).text
	return String(c.name)
