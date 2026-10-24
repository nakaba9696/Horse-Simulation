# 下のメニュー（docs/UI.md「下のメニュー」。持ち主の指摘 2026-10-24「常に基本メニューは画面下部に表示して」）
# - 管理画面（ホーム・厩舎・お手馬・番組表・店・牧場・データ・オーナー・GF・ホームから開いた設定）を開くと、下の端（y 912〜1000）に行き先の札が並び、いまいる画面の札が光る
# - タイトル・出走表・騎乗・週の結果・タイトルから開いた設定には出さない
# - 札を押す・キーボードの 1〜8・パッドの LT/RT で行き先へ移る。いまいる画面の札は移らない。その他は小窓（セーブ・設定・タイトルへ）
# - キーの案内の行は y 880〜912、中身は y 872 まで（番組表は別の仕事で作り直すので見ない）
extends RefCounted

const SCREENS := {"home": "home", "stable": "stable", "horse": "stable", "program": "program", "shop": "shop", "breed": "breed", "data": "data", "owners": "owners", "gf": ""}

func run_async(t) -> void:
	var era0 = HSU.ERA
	UiFlow.demo_week(1)
	UiFlow.program_id = HSWorld.mine()[0].id if HSWorld.mine().size() else ""
	for n in SCREENS:
		var sc = await _open(t, n)
		var nb: UiNav = sc.nav_bar
		t.ok(nb != null and nb.cards.size() == UiFlow.NAV.size(), "nav: %s に下のメニュー（%d枚）" % [n, UiFlow.NAV.size()])
		if nb == null:
			sc.free()
			continue
		# テストの画面は 1000 より高いことがあるので、下の端からの距離で見る（1600×1000 なら y 912〜1000）
		var y0: float = sc.size.y - 1000.0
		var r: Rect2 = nb.get_global_rect()
		t.ok(absf(r.position.y - y0 - 912.0) < 0.5 and absf(r.end.y - y0 - 1000.0) < 0.5, "nav: %s の下のメニューは y 912〜1000（%s）" % [n, r])
		t.ok(nb.cards.all(func(b): return b.get_global_rect().position.y - y0 >= 912.0 and b.get_global_rect().end.y - y0 <= 1000.5 and b.focus_mode == Control.FOCUS_NONE and b.has_meta("pad")), "nav: %s の札は下のメニューの中・カーソルは乗らずパッドの LT/RT で押せる" % n)
		var lit: Array = nb.cards.filter(func(b): return b.has_meta("current")).map(func(b): return String(b.get_meta("nav")))
		t.eq(lit, [SCREENS[n]] if SCREENS[n] != "" else [], "nav: %s で光る札" % n)
		var kr: Rect2 = sc.kb_holder.get_global_rect()
		t.ok(kr.position.y - y0 >= 879.5 and kr.end.y - y0 <= 912.5, "nav: %s のキーの案内は y 880〜912（%s）" % [n, kr])
		t.ok(sc.all_keys().any(func(k): return k[1] == "LT/RT"), "nav: %s のキーの案内に下のメニューの開き方" % n)
		if n != "program":
			var over: Array = []
			for c in sc.get_children():
				if not (c is Control) or c == nb or c == sc.kb_holder or c == sc.fade or not c.visible: continue
				var cr: Rect2 = (c as Control).get_global_rect()
				if cr.size.y >= 999.0: continue   # 背景の写真と幕
				if cr.end.y > 872.5: over.append("%s(%d)" % [c.name, int(cr.end.y)])
			t.ok(over.is_empty(), "nav: %s の中身は y 872 まで（%s）" % [n, ", ".join(over)])
		sc.free()
		await t.process_frame
	await _press(t)
	await _none(t)
	HSU.ERA = era0
	HSWorld.G = null
	UiFlow._reset_week()
	UiFlow.no_save = false

func _open(t, n: String):
	var sc = load("res://scenes/%s.tscn" % n).instantiate()
	t.root.add_child(sc)
	for i in 4:
		await t.process_frame
	await t.create_timer(0.4).timeout   # 入りの動き（中身が下から 0.24 秒）を終えてから測る
	return sc

# 札・数字キー・LT/RT で移る
func _press(t) -> void:
	var sc = await _open(t, "home")
	var card: Button = sc.nav_bar.cards.filter(func(b): return b.get_meta("nav") == "stable")[0]
	card.pressed.emit()
	t.eq(sc.went, "stable", "nav: 厩舎の札を押すと厩舎へ")
	sc.free()
	sc = await _open(t, "home")
	var home_card: Button = sc.nav_bar.cards[0]
	home_card.pressed.emit()
	t.eq(sc.went, "", "nav: いまいる画面の札は押しても移らない")
	var k := InputEventKey.new()
	k.keycode = KEY_4; k.pressed = true
	sc._unhandled_input(k)
	t.eq(sc.went, "shop", "nav: キーボードの 4 で馬の店へ")
	sc.free()
	sc = await _open(t, "stable")
	var rt := InputEventJoypadMotion.new()
	rt.axis = JOY_AXIS_TRIGGER_RIGHT; rt.axis_value = 1.0
	sc._unhandled_input(rt)
	t.eq(sc.went, "program", "nav: 厩舎で RT を押すと次の行き先（番組表）へ")
	sc.free()
	sc = await _open(t, "stable")
	var lt := InputEventJoypadMotion.new()
	lt.axis = JOY_AXIS_TRIGGER_LEFT; lt.axis_value = 1.0
	sc._unhandled_input(lt)
	t.eq(sc.went, "home", "nav: 厩舎で LT を押すと前の行き先（ホーム）へ")
	sc.free()
	# その他：小窓（セーブ・設定・タイトルへ・もどる）。小窓の間は数字キーで移らない
	sc = await _open(t, "data")
	sc.nav_pick("more")
	await t.process_frame
	t.ok(sc._modal != null and sc._modal.find_children("*", "Button", true, false).size() == 4, "nav: その他は小窓（セーブ・設定・タイトルへ・もどる）")
	var k1 := InputEventKey.new()
	k1.keycode = KEY_1; k1.pressed = true
	sc._unhandled_input(k1)
	t.eq(sc.went, "", "nav: 小窓の間は数字キーで移らない")
	sc._more("settings")
	t.ok(sc.went == "settings" and UiFlow.settings_back == "data", "nav: その他の設定は、もどる先をいまの画面にして開く")
	sc.free()
	# ホームから開いた設定には出る・タイトルから開いた設定には出ない
	UiFlow.settings_back = "home"
	sc = await _open(t, "settings")
	t.ok(sc.nav_bar != null, "nav: ホームから開いた設定には下のメニュー")
	sc.free()
	UiFlow.settings_back = "title"
	sc = await _open(t, "settings")
	t.ok(sc.nav_bar == null, "nav: タイトルから開いた設定には出さない")
	sc.free()
	await t.process_frame

# 出さない画面：タイトル・週の結果・出走表・騎乗
func _none(t) -> void:
	for n in ["title", "week_result"]:
		var sc = await _open(t, n)
		t.ok(sc.nav_bar == null and sc.find_children("*", "UiNav", true, false).is_empty(), "nav: %s には下のメニューを出さない" % n)
		sc.free()
	UiFlow.demo_ride(1)
	for n in ["race_card", "race"]:
		var sc = await _open(t, n)
		t.ok(_navs(sc) == 0, "nav: %s には下のメニューを出さない" % n)
		sc.free()
		await t.process_frame

func _navs(n: Node) -> int:
	var c := 1 if n is UiNav else 0
	for x in n.get_children(): c += _navs(x)
	return c
