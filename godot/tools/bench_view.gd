# 騎乗の画面の 1 コマの重さ（画面なし。GDScript の馬の形・騎手の IK・模擬・表示の更新）を測る
#   godot --headless --path godot -s res://tools/bench_view.gd
extends SceneTree

func _initialize() -> void:
	var scene: PackedScene = load("res://scenes/race.tscn")
	var rv = scene.instantiate()
	root.add_child(rv)
	await process_frame
	rv.set_process(false)
	rv._jump_to(20.0)
	var n := 600
	var t0 := Time.get_ticks_usec()
	for i in n:
		rv.advance(1.0 / 60.0)
	var per := (Time.get_ticks_usec() - t0) / 1000.0 / n
	print("bench: 1コマ %.2f ms（%d コマの平均・16頭・騎乗のカメラ）" % [per, n])
	quit()
