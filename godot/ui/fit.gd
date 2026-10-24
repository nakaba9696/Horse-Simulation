# 画面に収める小物（持ち主の指示 2026-10-24「基本的にスクロールはさせないで　画面に収めてかつ情報量を抑えて」。docs/UI.md「下のメニュー」）
# 中身は y 104（帯の下）〜872 に収める。y 880 より下はキーの案内と下の固定メニューの場所
# - cut：並べた後で、下の端（872）を越えた札を後ろから隠す（縦に並べた VBox の、削ってよい札だけを渡す）
# - pager：数が増える一覧のページ送りの帯（◀ 1/3 ▶。←→ で替える）と、行の上で ←→・端の ↑↓ でページを替える
class_name UiFit
extends RefCounted

const TOP := 104.0
const BOTTOM := 872.0

# 並べ終えて（下の端が動かなくなって）から、bottom を越えた札を隠す。items は上から下の順。
# 越えた最初の札から後ろを全部隠す（縦の並びでは、後ろを隠しても前の札は動かない）
static func cut(owner: Node, items: Array, bottom := BOTTOM) -> void:
	if not owner.is_inside_tree(): return
	var tree := owner.get_tree()
	# 折り返す字の札は、幅が決まるまで高さが何度か変わる。下の端が2フレーム続けて動かなくなるまで待つ（10フレームまで）
	var last := -1.0
	var still := 0
	for i in 10:
		await tree.process_frame
		var e := 0.0
		for it in items:
			if is_instance_valid(it) and it is Control and (it as Control).visible: e = maxf(e, (it as Control).get_global_rect().end.y)
		if absf(e - last) < 0.5:
			still += 1
			if still >= 2: break
		else:
			still = 0
		last = e
	cut_now(items, bottom)

static func cut_now(items: Array, bottom := BOTTOM) -> int:
	var hidden := 0
	var over := false
	for it in items:
		if not is_instance_valid(it) or not (it is Control): continue
		var c := it as Control
		if not over and c.visible and c.get_global_rect().end.y > bottom + 0.5:
			over = true
		if over and c.visible:
			c.visible = false
			hidden += 1
			_shrink_root(c)
	return hidden

# 並びのいちばん外の箱（親が並びの箱でない所）は、中身が減っても大きさが戻らない。決めた大きさまで縮める
static func _shrink_root(c: Control) -> void:
	var n: Node = c.get_parent()
	var root: Control = null
	while n is Container:
		root = n
		n = n.get_parent()
	if root != null:
		root.size = root.custom_minimum_size

# 一画面に入らない札の数（下の端を越えた札）。テストで使う
static func overflow(root: Control, bottom := BOTTOM) -> Array:
	var out: Array = []
	for c in root.find_children("*", "Control", true, false):
		var cc := c as Control
		if not cc.is_visible_in_tree() or cc.get_meta("fit_skip", false): continue
		if cc.get_global_rect().end.y > bottom + 1.0:
			out.append(cc)
	return out

# ページの数
static func pages(n: int, per: int) -> int:
	return maxi(1, int(ceil(float(n) / float(maxi(1, per)))))

# ページ送りの帯：◀ n/m ▶（押せる。カーソルは乗らず、行の上の ←→ で替える）
static func pager(page: int, n_pages: int, total: int, on_page: Callable) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	h.visible = n_pages > 1
	var prev := UiScreen.button("◀", false, 44, 32, 14)
	prev.focus_mode = Control.FOCUS_NONE
	prev.set_meta("pad", "page")
	prev.disabled = n_pages <= 1
	prev.pressed.connect(func(): on_page.call(-1, false))
	h.add_child(prev)
	h.add_child(UiGlyph.make("←", "十字←", 11))
	var l := UiTheme.num_label(HSText.t("%d / %d ページ（%d）") % [page + 1, n_pages, total], 14, UiTheme.MUTED)
	l.custom_minimum_size.x = 150
	h.add_child(l)
	h.add_child(UiGlyph.make("→", "十字→", 11))
	var nx := UiScreen.button("▶", false, 44, 32, 14)
	nx.focus_mode = Control.FOCUS_NONE
	nx.set_meta("pad", "page")
	nx.disabled = n_pages <= 1
	nx.pressed.connect(func(): on_page.call(1, false))
	h.add_child(nx)
	return h

# 行の上でページを替える：←→ で前後のページ（端から反対の端へ回る）、最後の行で ↓ は次のページの最初、最初の行で ↑ は前のページの最後。
# on_page(差, 最後の行にカーソルを置くか)。1ページだけなら何もしない
static func page_keys(rows: Array, page: int, n_pages: int, on_page: Callable) -> void:
	if n_pages <= 1: return
	for i in rows.size():
		var b := rows[i] as Control
		var down := i == rows.size() - 1 and page < n_pages - 1
		var up := i == 0 and page > 0
		b.gui_input.connect(func(ev: InputEvent):
			if not ev.is_pressed(): return
			if ev.is_action_pressed("ui_right", true):
				on_page.call(1, false); b.accept_event()
			elif ev.is_action_pressed("ui_left", true):
				on_page.call(-1, false); b.accept_event()
			elif down and ev.is_action_pressed("ui_down", true):
				on_page.call(1, false); b.accept_event()
			elif up and ev.is_action_pressed("ui_up", true):
				on_page.call(-1, true); b.accept_event())
