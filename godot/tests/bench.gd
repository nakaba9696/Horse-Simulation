# 模擬の速さを測る（テストではない）：godot --headless --path godot -s tests/bench.gd
extends SceneTree
func _init():
	for k in (["native", "gd"] if HSSim.native_ok() else ["gd"]):
		HSSim.backend = k
		_bench(k)
	quit()
func _bench(kind: String):
	var g: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://tests/golden/races.json"))
	var T = load("res://tests/test_race.gd")
	var tc := 0; var ts := 0; var tsk := 0; var steps := 0; var th := 0
	for cs in g.cases:
		var runners: Array = []
		var a := Time.get_ticks_usec()
		for x in cs.card:
			runners.append({ horse = T.make_horse(x.spec, x.id), jockey = x.jockey, rider = null, num = x.num, frame = x.frame, weight = x.weight })
		var b := Time.get_ticks_usec(); th += b - a
		var sim = HSSim.create(cs.race, runners, cs.wIdx, HSRng.new(cs.seed), {})
		var c := Time.get_ticks_usec(); tc += c - b
		while not HSSim.step(sim): pass
		ts += Time.get_ticks_usec() - c
		steps += sim.step
	print("%s: horses %.1f ms/race  create %.1f ms/race  step %.1f us/step (%.1f ms/race)" % [kind, th / 1000.0 / g.cases.size(), tc / 1000.0 / g.cases.size(), float(ts) / steps, ts / 1000.0 / g.cases.size()])
