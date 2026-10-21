# 画面の部品の絵（UiSkin。godot/assets/ui の九つ切りの絵。docs/UI.md「部品の絵」）
# - slices.json の角の px を読み、StyleBoxTexture の角に写す（縮めた絵では角も同じ倍率）
# - アイコン20個を名前で引ける
# - 絵が使えないとき（enabled＝false）は null を返し、ボタン・行・帯は前の色の形（StyleBoxFlat）に戻る
# - 牧場の画面：引退した牡馬・牝馬の行・手順の札・父と母を選ぶと「作る」へカーソル
extends RefCounted

func run_async(t) -> void:
	var era0 = HSU.ERA
	t.eq(UiSkin.margins("btn_main_normal").map(func(x): return int(x)), [24, 24, 24, 24], "skin: ボタンの角は 24px（slices.json）")
	t.eq(UiSkin.margins("row_normal").map(func(x): return int(x)), [56, 24, 56, 24], "skin: 行の角は左右 56・上下 24")
	var sb := UiSkin.box("btn_main_normal")
	t.ok(sb is StyleBoxTexture and is_equal_approx(sb.texture_margin_left, 24.0) and is_equal_approx(sb.texture_margin_bottom, 24.0), "skin: 九つ切りの札の角が slices.json の値")
	t.ok(UiSkin.fit("btn_main_normal", 40.0) < 1.0 and is_equal_approx(UiSkin.fit("btn_main_normal", 76.0), 1.0), "skin: 低いボタンは絵ごと縮める（角が収まる倍率）")
	var miss: Array = UiSkin.ICONS.filter(func(n): return UiSkin.icon_tex(String(n)) == null)
	t.ok(miss.is_empty(), "skin: アイコン20個を名前で引ける（無い：%s）" % ", ".join(miss))
	t.ok(UiSkin.icon("no_such_icon") == null and UiSkin.box("no_such_part") == null, "skin: 無い名前は null")
	for k in ["normal", "focus", "pressed", "disabled"]:
		t.ok(UiSkin.has("btn_main_" + k) and UiSkin.has("btn_sub_" + k), "skin: ボタンの絵（%s）がある" % k)
	var b := UiScreen.button("作る", true, 200, 52, 18, true)
	t.ok(b.get_theme_stylebox("normal") is StyleBoxTexture and b.get_theme_stylebox("disabled") is StyleBoxTexture, "skin: 絵のボタン（通常・押せない）")
	t.eq(b.get_theme_color("font_color"), UiTheme.ON_GOLD, "skin: 金のボタンの字は金の上の字")
	b.free()
	# 絵が使えないときは前の形
	UiSkin.enabled = false
	t.ok(UiSkin.box("btn_main_normal") == null and UiSkin.icon("farm") == null, "skin: 絵を切ると null")
	var b2 := UiScreen.button("作る", true, 200, 52, 18, true)
	t.ok(b2.get_theme_stylebox("normal") is StyleBoxFlat, "skin: 絵が無いと金のボタンは前の形（StyleBoxFlat）")
	b2.free()
	var rb: Array = UiScreen.row_button(60, false, true)
	t.ok((rb[0] as Button).get_theme_stylebox("normal") is StyleBoxFlat, "skin: 絵が無いと行は前の形")
	(rb[0] as Button).free()
	var sec := UiScreen.section("節", "", true)
	t.ok(sec is HBoxContainer, "skin: 絵が無いと節の見出しは前の形（金の縦線）")
	sec.free()
	UiSkin.enabled = true
	# 牧場の画面（引退した牡馬・牝馬が1頭ずつ）
	UiFlow.demo(1)
	for sx in ["牡", "牝"]:
		for h in HSWorld.mine():
			if h.get("loc") != "retired" and (h.sex == "牝") == (sx == "牝"):
				HSJockey.retire(h.id)
				break
	UiFlow.program_id = ""   # 開いたとき選んでいる馬は無し
	var ns := HSOriginal.retired("牡").size()
	var nd := HSOriginal.retired("牝").size()
	var sc = load("res://scenes/breed.tscn").instantiate()
	t.root.add_child(sc)
	for i in 3: await t.process_frame
	t.eq(sc.rows.size(), ns + nd, "skin: 牧場に引退した馬の行（牡 %d・牝 %d）" % [ns, nd])
	var texts: Array = sc.find_children("*", "Label", true, false).map(func(l): return String(l.text))
	t.ok(texts.has("① 父を選ぶ") and texts.has("② 母を選ぶ") and texts.has("③ 名前・作る"), "skin: 牧場に手順の札（① 父 → ② 母 → ③ 作る）")
	t.ok(sc.band != null and sc.band.art is StyleBoxTexture, "skin: 牧場の見出しの帯は部品の絵")
	if ns > 0 and nd > 0:
		sc.rows[0].pressed.emit()
		await t.process_frame
		sc.rows[ns].pressed.emit()
		for i in 2: await t.process_frame
		t.ok(sc.sire != "" and sc.dam != "", "skin: 行を押すと父と母を選ぶ")
		if not sc.b_make.disabled:
			t.eq(t.root.get_viewport().gui_get_focus_owner(), sc.b_make, "skin: 父と母がそろうと「作る」にカーソル")
	sc.queue_free()
	await t.process_frame
	HSU.ERA = era0
	HSWorld.G = null
	UiFlow._reset_week()
	UiFlow.no_save = false
