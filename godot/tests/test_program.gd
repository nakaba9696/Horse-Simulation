# 番組表（持ち主の指摘 2026-10-24「第一週　第二週　第三週　第四週で列をわけてのそれぞれのG3-G1　欧州　その他」「基本的にスクロールはさせないで　画面に収めてかつ情報量を抑えて」。docs/UI.md「番組表」）
# - 段の分け方（日本の重賞・オープン・欧州・その他）と1か月の格子（HSProgram.month_grid）・段の絞り（fit_band）
# - 画面：どの月も中身が y 104〜872 に収まり、スクロールが無い。札は格子の枠の中・段の中
# - 札を押すと予約・取消。Q/E で月・左右の端から外へで前後の月・R/Y で馬。「ほか n」は一覧の小窓
# 何フレームか待って並べてから見るので run_async（tests/run.gd が待つ）
extends RefCounted

const TOP := 104.0
const BOTTOM := 872.0

func run_async(t) -> void:
	var era0 = HSU.ERA
	UiFlow.demo_week(1)
	_core(t)
	UiFlow.program_id = HSWorld.mine()[0].id if HSWorld.mine().size() else ""
	await _screen(t)
	HSU.ERA = era0
	HSWorld.G = null
	UiFlow._reset_week()
	UiFlow.no_save = false

func _frames(t, n: int) -> void:
	for i in n:
		await t.process_frame

func _core(t) -> void:
	t.eq(HSProgram.band_of({"region": "JRA", "graded": true, "course": "東京"}), "jp", "program: JRA の重賞は日本の重賞の段")
	t.eq(HSProgram.band_of({"region": "地方", "graded": true, "course": "大井"}), "jp", "program: 地方の Jpn も日本の重賞の段")
	t.eq(HSProgram.band_of({"region": "JRA", "graded": false, "course": "中山"}), "op", "program: オープンはオープンの段")
	t.eq(HSProgram.band_of({"region": "海外", "graded": true, "country": "仏", "course": "x"}), "eu", "program: フランスは欧州")
	t.eq(HSProgram.band_of({"region": "海外", "graded": true, "country": "米", "course": "x"}), "ot", "program: アメリカはその他")
	t.eq(HSProgram.band_of({"region": "海外", "graded": true, "country": "香港", "course": "x"}), "ot", "program: 香港はその他")
	# fit_band：入りきらないときは最後の1枚を「ほか n」にする
	var l := [1, 2, 3, 4, 5]
	t.eq(HSProgram.fit_band(l, 5), [l, []], "program: 段に入るときは全部")
	t.eq(HSProgram.fit_band(l, 3), [[1, 2], [3, 4, 5]], "program: 入りきらないときは 2枚と「ほか3」")
	var h = HSWorld.mine()[0]
	var rs := HSProgram.rows(h, {"show": "all"})
	var G = HSWorld.G
	var last := HSProgram.last_month()
	t.ok(last >= 11 and last <= 13, "program: 予約できる1年は 12〜14 か月（%d）" % (last + 1))
	# 1か月の格子：行はどれも、その週の列のその段に1回だけ入る。今月の過ぎた週は past
	var seen := 0
	var ok_cols := true
	var ok_past := true
	for k in last + 1:
		var mg := HSProgram.month_grid(rs, k)
		if mg.cols.size() < 4: ok_cols = false
		for col in mg.cols:
			if k == 0 and col.w < G.week and col.state != "past": ok_past = false
			if col.state != "open":
				for b in HSProgram.BANDS:
					if col.bands[b].size(): ok_cols = false
				continue
			for b in HSProgram.BANDS:
				for r in col.bands[b]:
					if r.wk.w != col.w or int(r.wk.i) != col.i or HSProgram.band_of(r.race) != b: ok_cols = false
					seen += 1
	t.eq(seen, rs.size(), "program: どの行も、どれかの月の週の列に1回だけ入る")
	t.ok(ok_cols, "program: 列は4つ以上・行は自分の週の列と段に入る")
	t.ok(ok_past, "program: 今月の過ぎた週は「過ぎた週」")
	t.eq(HSProgram.month_grid(rs, 0).cols.filter(func(c): return c.state == "open" and c.i == 0).size(), 1, "program: 今週の列が1つ")

func _screen(t) -> void:
	var sc = load("res://scenes/program.tscn").instantiate()
	t.root.add_child(sc)
	await _frames(t, 3)
	sc.focus_first()
	await _frames(t, 2)
	t.ok(sc.rows.size() > 0, "program: 今月の札がある")
	t.ok(sc.find_children("*", "ScrollContainer", true, false).is_empty(), "program: スクロールが無い")
	# どの月も中身が y 104〜872 に収まる（帯・操作の案内・幕は除く）
	var bad: Array = []
	var cap := 0
	for k in HSProgram.last_month() + 1:
		sc._month(k)
		await _frames(t, 2)
		bad += _outside(sc)
		cap = maxi(cap, sc.rows.size())
		# 札は格子の枠の中
		for b in sc.rows:
			if not sc.grid.get_global_rect().grow(1).encloses(b.get_global_rect()): bad.append("%d月の札 %s" % [k, b.get_global_rect()])
	t.ok(bad.is_empty(), "program: どの月も中身が y %d〜%d・札は格子の中 %s" % [TOP, BOTTOM, str(bad.slice(0, 4))])
	t.ok(cap > 0, "program: 札がいちばん多い月 %d 枚" % cap)
	# 段の札は SLOTS まで
	var over := false
	for col_i in sc.mg.cols.size():
		for b in HSProgram.BANDS:
			if sc.cards.filter(func(c): return c.col == col_i and c.band == b).size() > sc.SLOTS[b]: over = true
	t.ok(not over, "program: 段の札は決まった数まで（入りきらない分は「ほか n」）")
	# 予約と取消（先の月の、最初に予約できる札）
	sc._month(2)
	await _frames(t, 2)
	var rc = null
	for c in sc.cards:
		if c.has("r") and String(c.b.get_meta("what")) == "reserve": rc = c; break
	t.ok(rc != null, "program: 先の月に予約できる札がある")
	if rc:
		var key: String = rc.r.race.key
		var id: String = sc.horses[sc.cur].id
		rc.b.pressed.emit()
		await _frames(t, 1)
		t.ok(HSSeason.reserves(id).any(func(x): return x.key == key), "program: 札を押すと予約")
		t.eq(sc.mo, 2, "program: 予約しても同じ月のまま")
		var again = null
		for c in sc.cards:
			if c.has("r") and c.r.race.key == key: again = c
		t.ok(again != null and String(again.b.get_meta("what")) == "unreserve" and again.b.has_focus(), "program: 予約した札は「取消」になり、カーソルはその札")
		if again:
			again.b.pressed.emit()
			await _frames(t, 1)
			t.ok(not HSSeason.reserves(id).any(func(x): return x.key == key), "program: もう一度押すと取消")
	# Q/E で月を送る（端から反対の端へ）
	sc._month(0)
	sc.on_tab(-1)
	t.eq(sc.mo, HSProgram.last_month(), "program: 今月から Q で最後の月へ回る")
	sc.on_tab(1)
	t.eq(sc.mo, 0, "program: E で今月へ")
	await _frames(t, 2)
	# 右の端の列から右を押すと次の月
	var right = null
	var open: Array = []
	for ci in sc.mg.cols.size():
		if sc.mg.cols[ci].state == "open": open.append(ci)
	for c in sc.cards:
		if c.col == open.back(): right = c; break
	if right:
		right.b.grab_focus()
		await _frames(t, 1)
		var e := InputEventAction.new()
		e.action = "ui_right"; e.pressed = true
		sc._input(e)
		await _frames(t, 2)
		t.eq(sc.mo, 1, "program: 右の端の列から → で次の月")
		var fo = sc.get_viewport().gui_get_focus_owner()
		var fc: int = _first_open(sc)
		t.ok(fo != null and sc.cards.any(func(c): return c.b == fo and c.col == fc), "program: 次の月の左の端の列にカーソル")
	# R で馬を替える
	if sc.horses.size() > 1:
		var c0: int = sc.cur
		var ek := InputEventKey.new()
		ek.keycode = KEY_R; ek.pressed = true
		sc._input(ek)
		t.eq(sc.cur, (c0 + 1) % sc.horses.size(), "program: R で次の馬")
	# 「ほか n」・オープンの一覧の小窓（どこかの月にあれば）
	var more = null
	for k in HSProgram.last_month() + 1:
		sc._month(k)
		for c in sc.cards:
			if c.has("more"): more = c; break
		if more: break
	t.ok(more != null, "program: 入りきらない段に「ほか n」の札がある")
	if more:
		var all: Array = sc.mg.cols[more.col].bands[more.band]
		more.b.pressed.emit()
		await _frames(t, 2)
		var n := 0
		if sc._modal != null:
			for b in (sc._modal as Node).find_children("*", "Button", true, false):
				if b.has_meta("ui_row"): n += 1
		t.eq(n, all.size(), "program: 「ほか n」を押すと、その週・その段の全部の一覧")
		sc.close_modal()
	sc.queue_free()
	await _frames(t, 1)

func _first_open(sc) -> int:
	for ci in sc.mg.cols.size():
		if sc.mg.cols[ci].state == "open": return ci
	return -1

# 画面の中身（帯・操作の案内・幕・トーストを除く）で、y 104〜872 の外に出ている物
func _outside(sc) -> Array:
	var out: Array = []
	for c in sc.find_children("*", "Control", true, false):
		var ctl := c as Control
		if not ctl.is_visible_in_tree() or ctl.size.x <= 0.0 or ctl.size.y <= 0.0: continue
		if ctl == sc.fade or (sc.band and (ctl == sc.band or sc.band.is_ancestor_of(ctl))): continue
		if sc.kb_holder and (ctl == sc.kb_holder or sc.kb_holder.is_ancestor_of(ctl)): continue
		if ctl.get_parent() == sc and ctl.mouse_filter == Control.MOUSE_FILTER_IGNORE: continue   # 背景の写真・幕
		var r := ctl.get_global_rect()
		if r.position.y < TOP - 0.5 or r.end.y > BOTTOM + 0.5:
			out.append("%s %s" % [ctl.name, r])
	return out
