# 騎乗のレースの1コマの時間（描く所まで込み）を測る。docs/STEAM.md「重さ」
#   画面あり（Xvfb・CPU の Vulkan でも動く）：sh godot/tools/run_scene.sh を使わずに
#     xvfb-run -a -s "-screen 0 1600x1000x24" godot --path godot --audio-driver Dummy -s res://tools/bench_frame.gd -- [--demo=1] [--frames=300] [--warm=30] [--res=1920x1080]
#   画面なし（模擬・馬の形・騎手・表示の更新だけ）：godot --headless --path godot -s res://tools/bench_frame.gd
# レースを 20 秒まで早送りしてから、frames コマを本当に回し（vsync は切る）、
#   1コマの時間（平均・95%）・描く CPU と GPU の時間（RenderingServer の測り）を出す
extends SceneTree

func _initialize() -> void:
	var frames := 300
	var warm := 30
	var res := Vector2i(1600, 1000)
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--frames="): frames = int(a.substr(9))
		elif a.begins_with("--warm="): warm = int(a.substr(7))
		elif a.begins_with("--res="):
			var p := a.substr(6).split("x")
			res = Vector2i(int(p[0]), int(p[1]))
	var headless := DisplayServer.get_name() == "headless"
	if not headless:
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
		DisplayServer.window_set_size(res)
		root.size = res
	Engine.max_fps = 0
	var rv = load("res://scenes/race.tscn").instantiate()
	root.add_child(rv)
	for i in 5: await process_frame
	rv._jump_to(20.0)
	var vp := root.get_viewport_rid()
	RenderingServer.viewport_set_measure_render_time(vp, true)
	for i in warm: await process_frame   # 温める（影・質感の読み込み）
	var dts: Array = []
	var cpu := 0.0
	var gpu := 0.0
	var t_prev := Time.get_ticks_usec()
	for i in frames:
		await process_frame
		var now := Time.get_ticks_usec()
		dts.append((now - t_prev) / 1000.0)
		t_prev = now
		cpu += RenderingServer.viewport_get_measured_render_time_cpu(vp) + RenderingServer.get_frame_setup_time_cpu()
		gpu += RenderingServer.viewport_get_measured_render_time_gpu(vp)
	dts.sort()
	var avg := 0.0
	for d in dts: avg += d
	avg /= dts.size()
	var p95: float = dts[int(dts.size() * 0.95) - 1]
	print("bench_frame: %s・%s・%d頭・%dコマ・C++ の模擬 %s" % ["画面なし" if headless else "画面あり %dx%d" % [res.x, res.y], RenderingServer.get_video_adapter_name(), int(rv.src.n), frames, "あり" if ClassDB.class_exists("HSNativeSim") else "なし"])
	print("bench_frame: 1コマ 平均 %.2f ms（%.1f fps）・95%% %.2f ms・描く CPU %.2f ms・GPU %.2f ms" % [avg, 1000.0 / avg, p95, cpu / frames, gpu / frames])
	quit()
