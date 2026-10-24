# 色の役目（docs/UI.md「色の役目」。持ち主の指摘 2026-10-24「背景も牧場で緑なのにボタンも緑でわかりにくい」）
# - 役目の色の並び：地 ＜ 面 ＜ 押せる物 ＜ 選んだ物、明るさの差（WCAG のコントラスト比）が決まりの値より大きい
# - 押せる物の面は背景の写真と同じ色の仲間（緑）にしない
# - 字の色が面・押せる物の上で読める
# - 部品の絵の塗り替え（godot/assets/ui/role。godot/tools/ui_roles.py）が theme.gd の色とそろっている
# - 撮った絵の物差し（UiScreen.measure_contrast）が、浮いて見える札を通し、背景と同じ明るさの札を落とす
extends RefCounted

func run_async(t) -> void:
	var C := func(a: Color, b: Color) -> float: return UiTheme.contrast(a, b)
	var face := UiTheme.SURFACE   # 面（地の上に 93%）
	t.ok(is_equal_approx(snappedf(UiTheme.contrast(Color.WHITE, Color.BLACK), 0.01), 21.0), "contrast: 白と黒は 21")
	t.ok(is_equal_approx(UiTheme.contrast(UiTheme.GOLD, UiTheme.GOLD), 1.0), "contrast: 同じ色は 1")
	# 並び：地 ≦ 面 ＜ 行 ＜ 押せる物 ＜ 選んだ物
	var l := func(c: Color) -> float: return UiTheme.lum(c)
	t.ok(l.call(UiTheme.BG) <= l.call(face) + 0.002, "contrast: 面は地と同じか少し明るい（写真を透かさない墨の緑）")
	t.ok(l.call(face) < l.call(UiTheme.ROW) and l.call(UiTheme.ROW) < l.call(UiTheme.ACT) and l.call(UiTheme.ACT) < l.call(UiTheme.ACT_HI), "contrast: 面 ＜ 表の行 ＜ 押せる物 ＜ 選んだ物の順に明るい")
	t.ok(l.call(UiTheme.ACT_DOWN) < l.call(UiTheme.ACT), "contrast: 押した面は押せる物より暗い（沈む）")
	# 明るさの差（決まりの値。docs/UI.md「色の役目」の表）
	var need := [
		["押せる物の面と面", UiTheme.ACT, face, 2.0],
		["選んだ物の面と面", UiTheme.ACT_HI, face, 3.0],
		["押せる物の縁と面", UiTheme.ACT_EDGE, face, 3.0],
		["押せる物の縁と押せる物の面", UiTheme.ACT_EDGE, UiTheme.ACT, 2.5],
		["危ない操作の面と面", UiTheme.DANGER, face, 1.8],
		["危ない操作の縁と面", UiTheme.DANGER_EDGE, face, 3.0],
		["表の行と面", Color(UiTheme.ROW.r, UiTheme.ROW.g, UiTheme.ROW.b, 0.96), face, 1.3],
		["金の面と面", UiTheme.GOLD_FACE[1], face, 7.0],
		["字と押せる物の面", UiTheme.IVORY, UiTheme.ACT, 7.0],
		["字と選んだ物の面", UiTheme.IVORY, UiTheme.ACT_HI, 4.5],
		["字と表の行", UiTheme.IVORY, UiTheme.ROW, 7.0],
		["字と危ない操作の面", UiTheme.IVORY, UiTheme.DANGER, 4.5],
		["控えめの字と面", UiTheme.MUTED, face, 4.5],
		["控えめの字と表の行", UiTheme.MUTED, UiTheme.ROW, 4.5],
		["金の上の字と金の面", UiTheme.ON_GOLD, UiTheme.GOLD_FACE[1], 7.0],
		["明るい金の字と押せる物の面", UiTheme.GOLD_BRIGHT, UiTheme.ACT, 4.5],
	]
	for n in need:
		var r: float = C.call(n[1], n[2])
		t.ok(r >= float(n[3]), "contrast: %s が %.1f 以上（%.2f）" % [n[0], n[3], r])
	# 押せる物は緑の仲間にしない（色相 75〜165° の外。牧場・芝の写真の上でも色で混ざらない）
	for c in [["押せる物", UiTheme.ACT], ["選んだ物", UiTheme.ACT_HI], ["押した", UiTheme.ACT_DOWN], ["縁", UiTheme.ACT_EDGE]]:
		var h: float = (c[1] as Color).h * 360.0
		t.ok(h < 75.0 or h > 165.0, "contrast: %sの色は緑の仲間でない（色相 %.0f°）" % [c[0], h])
	# 部品の絵の塗り替え：面の真ん中の明るさが theme.gd の色と同じ（ui_roles.py を回し直していないと落ちる）
	for p in [["btn_sub_normal", UiTheme.ACT], ["btn_sub_focus", UiTheme.ACT_HI], ["row_normal", UiTheme.ACT], ["row_focus", UiTheme.ACT_HI], ["panel_card", UiTheme.INK]]:
		var path := "res://assets/ui/role/%s.png" % p[0]
		var img := Image.load_from_file(ProjectSettings.globalize_path(path))
		if img == null or img.is_empty():
			t.ok(false, "contrast: 塗り替えた絵がある（%s）" % path)
			continue
		var w := img.get_width()
		var hh := img.get_height()
		var sum := Color(0, 0, 0)
		var n := 0
		for y in range(int(hh * 0.4), int(hh * 0.6)):
			for x in range(int(w * 0.4), int(w * 0.6), 2):
				var px := img.get_pixel(x, y)
				sum.r += px.r; sum.g += px.g; sum.b += px.b; n += 1
		var avg := Color(sum.r / n, sum.g / n, sum.b / n)
		var want: Color = p[1]
		t.ok(absf(avg.h - want.h) < 0.04 and absf(avg.v - want.v) < 0.12, "contrast: role/%s の面は theme.gd の色（%s ≈ %s）" % [p[0], avg.to_html(false), want.to_html(false)])
	t.ok(UiSkin.roles and UiSkin.box("btn_sub_normal") != null and String(UiSkin.box("btn_sub_normal").texture.resource_path).contains("/role/") , "contrast: 部品の絵は塗り替えた絵を先に使う")
	# 撮った絵の物差し：暗い地に、浮いている札（革の面・金の縁）と、地と同じ明るさの札を置いて測る
	var host := Control.new()
	host.size = Vector2(1600, 1000)
	t.root.add_child(host)
	var good := Button.new()
	good.text = "浮いている"
	good.position = Vector2(100, 100)
	good.size = Vector2(240, 60)
	host.add_child(good)
	var flat := Button.new()
	flat.text = "沈んでいる"
	flat.position = Vector2(100, 300)
	flat.size = Vector2(240, 60)
	host.add_child(flat)
	await t.process_frame
	var vw := host.get_viewport().get_visible_rect().size
	var img2 := Image.create(int(vw.x), int(vw.y), false, Image.FORMAT_RGB8)
	img2.fill(UiTheme.INK)
	var k := vw.x / 1600.0
	var fill := func(r: Rect2, c: Color) -> void: img2.fill_rect(Rect2i(Vector2i(r.position * k), Vector2i(r.size * k)), c)
	fill.call(Rect2(100, 100, 240, 60), UiTheme.ACT_EDGE)
	fill.call(Rect2(103, 103, 234, 54), UiTheme.ACT)
	fill.call(Rect2(100, 300, 240, 60), UiTheme.INK.lightened(0.04))
	var path2 := OS.get_user_data_dir().path_join("test_contrast.json")
	var w2: Dictionary = UiScreen.measure_contrast(host, img2, path2)
	var j = JSON.parse_string(FileAccess.get_file_as_string(path2))
	var by := {}
	for b in j.buttons:
		by[String(b.text)] = b
	t.ok(by.has("浮いている") and bool(by["浮いている"].ok), "contrast: 物差し：革の面と金の縁の札は通る（%s）" % str(by.get("浮いている", {})).left(120))
	t.ok(by.has("沈んでいる") and not bool(by["沈んでいる"].ok), "contrast: 物差し：地と同じ明るさの札は落ちる")
	t.eq(int(w2.bad), 1, "contrast: 物差し：足りない札は1つ")
	host.queue_free()
	DirAccess.remove_absolute(path2)
