# 画面に収める（持ち主の指示 2026-10-24「基本的にスクロールはさせないで　画面に収めてかつ情報量を抑えて」。docs/UI.md「下のメニュー」）
# 番組表を除く管理画面で：
# - スクロールの箱（ScrollContainer）が無い
# - 中身（帯・キーの案内・背景の幕を除く）は y 872 より下に出ない（y 880 より下はキーの案内と下の固定メニューの場所）
# - 数が増える一覧はページ送り（お手馬の戦績・馬の店）
# 何フレームか待って並べてから見るので run_async（tests/run.gd が待つ）
extends RefCounted

func run_async(t) -> void:
	var era0 = HSU.ERA
	UiFlow.demo_week(1)
	UiFlow.program_id = HSWorld.mine()[0].id if HSWorld.mine().size() else ""
	for n in ["home", "shop", "stable", "horse", "breed", "data", "owners", "gf", "week_result", "settings"]:
		await _screen(t, n)
	# お手馬の戦績が多いとき：1ページ REC_PER 行とページ送り
	var h = HSWorld.mine()[0]
	var r0: Dictionary = h.results[0] if h.get("results") and h.results.size() else {"y": HSWorld.G.year, "m": 1.0, "w": 1.0, "race": "3歳オープン", "course": "中山", "surface": "芝", "dist": 2000.0, "pos": 3.0, "n": 14.0}  # i18n:skip（見本）
	var keep: Array = HSU.or_(h.get("results"), []).duplicate()
	h.results = []
	for i in 30: h.results.append(r0.duplicate())
	UiFlow.program_id = h.id
	UiFlow.focus["horse_tab"] = "rec"
	UiFlow.focus["horse_row"] = 0
	var sc = load("res://scenes/horse.tscn").instantiate()
	t.root.add_child(sc)
	await _frames(t, 4)
	t.eq(sc.rows.size(), UiHorseScreen.REC_PER, "fit: お手馬の戦績は1ページ %d 行" % UiHorseScreen.REC_PER)
	var bad := _over(sc)
	t.ok(bad.is_empty(), "fit: 戦績30走でも y 872 に収まる（%s）" % ", ".join(bad.slice(0, 6)))
	sc._rec_page(1, false)
	await _frames(t, 3)
	t.eq(sc.page, 1, "fit: 戦績の次のページ")
	sc._rec_page(1, false)
	sc._rec_page(1, false)
	await _frames(t, 3)
	t.eq(sc.page, 0, "fit: 戦績のページは端から反対の端へ回る")
	sc.queue_free()
	h.results = keep
	UiFlow.focus["horse_tab"] = "stat"
	await _frames(t, 1)
	# 馬の店：PER 行を越える品ぞろえはページ送り
	var shop = load("res://scenes/shop.tscn").instantiate()
	t.root.add_child(shop)
	await _frames(t, 3)
	var PER: int = shop.get_script().get_script_constant_map()["PER"]
	var many: Array = []
	for x in shop.items:
		if not x.f: many.append(x)
	while many.size() < PER * 2 + 3 and many.size() > 0: many.append(many[0])
	shop.items = many
	shop.sex = 0
	shop.sel = 0
	shop._fill()
	await _frames(t, 4)
	t.eq(shop.rows.size(), PER, "fit: 馬の店は1ページ %d 行" % PER)
	bad = _over(shop)
	t.ok(bad.is_empty(), "fit: 品ぞろえが多くても y 872 に収まる（%s）" % ", ".join(bad.slice(0, 6)))
	shop._page(1, false)
	await _frames(t, 3)
	t.eq(shop.sel, PER, "fit: 馬の店の次のページの最初の行")
	shop.queue_free()
	await _frames(t, 1)
	HSU.ERA = era0
	HSWorld.G = null
	UiFlow._reset_week()
	UiFlow.no_save = false

func _frames(t, n: int) -> void:
	for i in n:
		await t.process_frame

func _screen(t, n: String) -> void:
	var sc = load("res://scenes/%s.tscn" % n).instantiate()
	t.root.add_child(sc)
	await _frames(t, 12)   # 折り返す字と、入らない札を隠す（UiFit.cut）のを待つ
	_check(t, sc, n)
	var tabs := 0
	if n in ["shop", "stable", "horse", "data", "gf", "settings"] and sc.has_method("on_tab"):
		tabs = {"data": 10, "horse": 3, "settings": 1, "gf": 5}.get(n, 1)
	for k in tabs:
		sc.on_tab(1)
		await _frames(t, 12)
		_check(t, sc, n + "（タブ%d）" % (k + 2))
	sc.queue_free()
	await _frames(t, 1)

func _check(t, sc: Node, tag: String) -> void:
	var sv: Array = sc.find_children("*", "ScrollContainer", true, false)
	t.ok(sv.is_empty(), "fit: %s にスクロールの箱が無い" % tag)
	var bad := _over(sc)
	t.ok(bad.is_empty(), "fit: %s の中身は y %d までに収まる（はみ出し：%s）" % [tag, int(UiFit.BOTTOM), ", ".join(bad.slice(0, 6))])

# y 872 を越える見えている札（帯・キーの案内・背景の幕・トースト・パッドの印・小窓は除く）
func _over(sc: Node) -> Array:
	var out: Array = []
	var skip: Array = []
	for k in ["kb_holder", "_toast", "fade", "_modal"]:
		var v = sc.get(k)
		if v != null and is_instance_valid(v): skip.append(v)
	for c in sc.get_children():
		if c is UiPad: skip.append(c)
	for c in sc.find_children("*", "Control", true, false):
		var cc := c as Control
		if not cc.is_visible_in_tree() or cc.size.y >= 900.0: continue
		if skip.any(func(s): return s == cc or (s as Node).is_ancestor_of(cc)): continue
		var r := cc.get_global_rect()
		if r.end.y > UiFit.BOTTOM + 1.0 and r.size.y > 0.5:
			out.append("%s(%d)" % [cc.name if not (cc is Label) else "「%s」" % String((cc as Label).text).left(12), int(r.end.y)])
	return out
