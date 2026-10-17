# レースを別々のスレッドで同時に回しても、結果が JS と同じか（世界の進行で、週のレースを並列に回すため）
# 模擬を作る（HSSim.create）のは一つのスレッドで、進める（step）のを同時に。馬・コースの形・データは読むだけ
extends RefCounted

const H := preload("res://core/hs_math.gd")
var sims: Array = []

func _run_one(i: int) -> void:
	var sim = sims[i]
	while not HSSim.step(sim): pass

func run(t) -> void:
	var g: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://tests/golden/races.json"))
	var T = load("res://tests/test_race.gd")
	var cases: Array = []
	for cs in g.cases:
		if cs.actions.size(): continue # 操作の列があるレースは一つずつ（騎乗は画面のスレッドで）
		var runners: Array = []
		for x in cs.card:
			runners.append({ horse = T.make_horse(x.spec, x.id), jockey = x.jockey, rider = x.rider, num = x.num, frame = x.frame, weight = x.weight })
		var opts: Dictionary = cs.opts.duplicate(); opts.ride = false
		if cs.opts.get("ride"): continue
		sims.append(HSSim.create(cs.race, runners, cs.wIdx, HSRng.new(cs.seed), opts)); cases.append(cs)
	var t0 := Time.get_ticks_msec()
	var task := WorkerThreadPool.add_group_task(_run_one, sims.size(), -1, true, "races")
	WorkerThreadPool.wait_for_group_task_completion(task)
	var par := Time.get_ticks_msec() - t0
	var bad := 0
	for k in sims.size():
		var res := HSSim.finish(sims[k])
		var times: Array = []
		for x in res.results: times.append(H.hex(x.time))
		var want: Array = []
		for x in cases[k].results: want.append(x.time)
		if times != want: bad += 1
	t.eq(bad, 0, "parallel: %d 本を同時に回して、着順とタイムが JS と同じ（%d ms・%d スレッド）" % [sims.size(), par, OS.get_processor_count()])
