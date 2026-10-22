# 斤量の仕組みは無い（持ち主の決定 2026-10-21「このゲームでは斤量というシステム自体なくしていいです」）
# 斤量は強さ（HSSim.power）に効かない（GDScript と C++ の両方）・見習いの減量は無い・出走表に斤量の列が無い
extends RefCounted

func run(t) -> void:
	var race := { name = "テスト", course = "東京", surface = "芝", dist = 2000.0, ground = "良", region = "JRA", year = 2025.0, month = 5.0, week = 2.0, age = "3+", weight = "ハンデ" }
	var h := HSHorse.make_filler(HSRng.new(5), { level = 80, surface = "芝", dist = 2000, born = 2020 })
	var backs: Array = ["gd"]
	if HSSim.native_ok(): backs.append("native")
	var keep := HSSim.backend
	for k in backs:
		HSSim.backend = k
		var base: float = HSSim.power(h, race, null, { jockey = { skill = 75.0 } }).total
		for w in [48.0, 52.0, 56.0, 58.0, 60.0, 62.0]:
			var v: float = HSSim.power(h, race, null, { jockey = { skill = 75.0 }, weight = w }).total
			t.eq(v, base, "noweight: 斤量 %d で強さが変わった（%s）" % [int(w), k])
	HSSim.backend = keep
	var ms: Array = load("res://core/hs_jockey.gd").get_script_method_list().map(func(m): return m.name)
	t.ok(ms.has("player_jockey") and not ms.has("allowance") and not ms.has("allowance_mark"), "noweight: HSJockey.allowance が残っている")
	var names: Array = []
	for c in load("res://ui/race_card.gd").COLS: names.append(c[0])
	t.ok(not names.has("斤量"), "noweight: 出走表に斤量の列がある")
