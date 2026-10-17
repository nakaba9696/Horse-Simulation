# 模擬の入れ口（ViewLive）の確かめ（画面なし）：記録と同じ出走馬・同じ種で模擬を作り、合図なし（0.8 秒で自動の出遅れ）で最後まで回して着順を出す
#   godot --headless --path godot -s res://tools/check_live.gd   （JS の同じ回し方は node tools/check_live.js）
extends SceneTree

func _initialize() -> void:
	var t0 := Time.get_ticks_msec()
	var L := ViewLive.new()
	var t1 := Time.get_ticks_msec()
	var t := 0.0
	while t < 200.0 and L.order.size() == 0:
		t += 0.1
		L.advance_to(t)
	var out := PackedStringArray()
	for r in L.race.results.slice(0, 5):
		out.append("%d %s %.2f" % [r.pos, r.name, r.time])
	print("live: ", " / ".join(out), "  start=", L.start_ret, "  作る %d ms・回す %d ms" % [t1 - t0, Time.get_ticks_msec() - t1])
	quit()
