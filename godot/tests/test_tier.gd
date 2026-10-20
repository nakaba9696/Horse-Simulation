# 能力の段（UiTheme.tier・stat_chip。docs/UI.md「能力の段」）：境目の値が正しい段になるか、札の色が段の色か
extends RefCounted

func run(t) -> void:
	# [値, 種類, 段]（境目は「この値から上」。見せる数（四捨五入）で決める）
	var cases := [
		[50.0, "fh", 0], [50.4, "fh", 0], [50.5, "fh", 1], [51.0, "fh", 1], [60.0, "fh", 1], [61.0, "fh", 2], [65.0, "fh", 2],
		[66.0, "fh", 3], [80.0, "fh", 3], [81.0, "fh", 4], [99.0, "fh", 4], [1.0, "fh", 0],
		[59.0, "stat", 0], [60.0, "stat", 1], [74.0, "stat", 1], [75.0, "stat", 2], [84.0, "stat", 2], [85.0, "stat", 3],
		[94.0, "stat", 3], [94.6, "stat", 4], [95.0, "stat", 4], [120.0, "stat", 4], [20.0, "stat", 0],
		[1.0, "kire", 0], [2.0, "kire", 0], [3.0, "kire", 1], [4.0, "kire", 1], [5.0, "kire", 2], [6.0, "kire", 2], [7.0, "kire", 3], [8.0, "kire", 4],
	]
	for c in cases:
		t.eq(UiTheme.tier(float(c[0]), String(c[1])), int(c[2]), "tier %s %s" % [c[1], c[0]])
	t.eq(UiTheme.TIER_NAMES.size(), 5, "段の名前は5つ")
	for a in [UiTheme.TIER_FH, UiTheme.TIER_STAT, UiTheme.TIER_KIRE]:
		t.eq(a.size(), 4, "境目は4つ")
		for i in range(1, a.size()):
			t.ok(a[i] > a[i - 1], "境目が小さい順")
	# 札：段の地の色・数の字（四捨五入）・前の呼び方（UiScreen.num_chip の lo）
	for c in [[38.0, "fh"], [58.0, "fh"], [80.0, "fh"], [96.0, "stat"], [7.0, "kire"]]:
		var p := UiTheme.stat_chip(float(c[0]), String(c[1]))
		var k := UiTheme.tier(float(c[0]), String(c[1]))
		var sb := p.get_theme_stylebox("panel") as StyleBoxFlat
		t.eq(sb.bg_color, UiTheme.TIER_BG[k], "札の地の色 %s" % c[0])
		t.eq((p.get_child(0) as Label).text, str(int(c[0])), "札の数 %s" % c[0])
		t.eq(sb.border_width_left, UiTheme.TIER_LINE_W[k], "札の縁の太さ %s" % c[0])
		p.free()
	var old := UiScreen.num_chip(86.0, 50.0, 110.0)
	t.eq((old.get_theme_stylebox("panel") as StyleBoxFlat).bg_color, UiTheme.TIER_BG[3], "前の呼び方（lo=50）は能力の段")
	old.free()
	var old2 := UiScreen.num_chip(66.0)
	t.eq((old2.get_theme_stylebox("panel") as StyleBoxFlat).bg_color, UiTheme.TIER_BG[3], "前の呼び方（既定）は総合力の段")
	old2.free()
