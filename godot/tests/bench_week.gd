# 1週を進める時間の内訳を測る（テストではない）：godot --headless --path godot -s tests/bench_week.gd
extends SceneTree
func _init():
	for k in (["native", "gd"] if HSSim.native_ok() else ["gd"]):
		HSSim.backend = k
		print("--- ", k)
		_bench()
	quit()
func _bench():
	HSWorld.load_save(FileAccess.get_file_as_string("res://tests/golden/world_save.json"))
	for i in 3:
		var a := Time.get_ticks_usec()
		HSWorld._week = null
		var wk := HSWorld.prepare_week()
		var b := Time.get_ticks_usec()
		var cs := HSWorld.cards()
		var c := Time.get_ticks_usec()
		var offers := HSOwners.offers()
		var d := Time.get_ticks_usec()
		var rs := 0
		for card in cs:
			var t0 := Time.get_ticks_usec()
			HSSim.run(card.race, card.runners, wk.wIdx, HSRng.new(card.seed), { frames = true })
			rs += Time.get_ticks_usec() - t0
		var e := Time.get_ticks_usec()
		HSWorld.finish_week({})
		var f := Time.get_ticks_usec()
		print("week %d: prepare %.2fs cards %.2fs offers %.2fs races(%d) %.2fs finish(全部) %.2fs  horses %d" % [i, (b - a) / 1e6, (c - b) / 1e6, (d - c) / 1e6, cs.size(), rs / 1e6, (f - e) / 1e6, HSWorld.G.horses.size()])
