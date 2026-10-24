# 押した返りと次週の見本を撮る（docs/UI.md 1「形と動き」。docs/shots/godot/press/）。決まった刻み（--fixed-fps 30）で進めて数コマずつ撮る
#   xvfb-run -a -s "-screen 0 1600x1000x24" godot --path godot --fixed-fps 30 --audio-driver Dummy --resolution 1600x1000 -s res://tools/shot_press.gd -- --out=DIR --case=名前
#   （sh godot/tools/shot_press.sh 出力先 が全部まとめて撮る）
# 名前：week（騎乗の無い週の次週を2回押す）・buy（馬の店で買う）・reserve（番組表で予約する）・deny（資金が足りない馬の「買う」を押す）
# 見本は決まった種の新しいゲーム（UiFlow.demo。セーブは書かない）
extends SceneTree

var out := "res://out"
var kase := "week"
var sc: Control
var n := 0

func _initialize() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="): out = a.substr(6)
		elif a.begins_with("--case="): kase = a.substr(7)
	DirAccess.make_dir_recursive_absolute(out)
	_run.call_deferred()

func _frames(k: int) -> void:
	for i in k:
		await process_frame

func _shot(name: String) -> void:
	for k in 2:
		await RenderingServer.frame_post_draw
	root.get_viewport().get_texture().get_image().save_png(out.path_join(name + ".png"))
	print("shot ", name)

# いまから every コマおきに count 枚
func _burst(prefix: String, count: int, every := 2) -> void:
	for i in count:
		await _shot("%s_%02d" % [prefix, i])
		await _frames(every)

func _open(scene: String) -> void:
	sc = load("res://scenes/%s.tscn" % scene).instantiate()
	root.add_child(sc)
	await _frames(14)   # 入りの動き（0.24 秒）が終わるまで

func _run() -> void:
	UiSettings.boot()
	UiFlow.demo(1, 7.0)
	match kase:
		"week":
			for h in HSWorld.mine():
				h.auto = false
				if HSWorld.entry_of(h.id) != null: HSWorld.unenter(h.id)
			for o in HSOwners.offers():
				if o.now: HSOwners.decline(o.oid)
			HSWorld.dirty()
			await _open("home")
			sc.b_main.grab_focus()
			await _frames(2)
			await _shot("week_0before")
			sc.b_main.button_down.emit()
			sc.b_main.pressed.emit()
			await _frames(3)
			sc.b_main.pressed.emit()   # 締めている間にもう一度（続けて進む）
			await _burst("week_1press", 24, 2)
			while UiWeek.busy() or UiWeek.queued > 0:
				await process_frame
			await _burst("week_2after", 10, 3)
			await _frames(40)
			await _shot("week_3settled")
		"buy":
			HSWorld.G.player.money = 30000.0
			await _open("shop")
			sc.open_detail(0)
			await _frames(10)
			await _shot("buy_0detail")
			sc.ask_buy(0)
			await _frames(10)
			sc.confirm_ok.button_down.emit()
			sc.confirm_ok.pressed.emit()
			await _burst("buy_1after", 12, 2)
		"reserve":
			UiFlow.program_id = HSWorld.mine("stable")[0].id
			await _open("program")
			var b: Button = null
			for r in sc.rows:
				if String(r.get_meta("what", "")) == "reserve": b = r; break
			if b == null:
				print("予約できる行が無い"); quit(); return
			b.grab_focus()
			await _frames(2)
			await _shot("reserve_0before")
			b.button_down.emit()
			b.pressed.emit()
			await _burst("reserve_1after", 12, 2)
		"deny":
			HSWorld.G.player.money = 0.0
			await _open("shop")
			sc.open_detail(0)
			await _frames(10)
			var ev := InputEventMouseButton.new()
			ev.button_index = MOUSE_BUTTON_LEFT
			ev.pressed = true
			sc.detail_buy.gui_input.emit(ev)
			await _burst("deny_1after", 10, 2)
	print("done")
	quit()
