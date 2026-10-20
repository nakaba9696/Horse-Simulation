# トロフィーの画面を撮る（データのトロフィーの表と、厩舎の馬の見本のトロフィー）。1600×1000
#   xvfb-run -a godot --path godot --resolution 1600x1000 -s res://tools/shot_trophy.gd -- --out=/絶対の/出力先
# 新しいゲームで馬を1頭買い、いくつかのトロフィーを手にした形にしてから撮る（HSTrophy.give）
extends SceneTree

var out := ""
var step := 0
var wait := 0

func _initialize() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="): out = a.substr(6)
	UiFlow.save_path = "user://shot_trophy_save.json"
	UiFlow.new_game("撮影騎手", "美浦", 7.0)
	var G = HSWorld.G
	G.player.money = 1e10
	var items: Array = HSWorld.market_historic()
	HSWorld.buy(items[0])
	var h = HSWorld.mine()[0]
	for id in ["triple", "gs_jp", "arc2", "wonder", "gf:classic"]:
		HSTrophy.give(h, HSTrophy.by()[id], G.year)
	var h2 = HSWorld.all().filter(func(x): return x.get("owner") != "P" and x.get("hist"))[0]
	h2.owner = "P"
	HSTrophy.give(h2, HSTrophy.by()["arc2"], G.year + 1.0)
	UiFlow.focus["data_tab"] = "trophy"
	process_frame.connect(_tick)
	change_scene_to_file(UiFlow.SCENES.data)

func _snap(name: String) -> void:
	var img := root.get_texture().get_image()
	img.save_jpg(out.path_join(name), 0.9)
	print("shot ", name)

func _tick() -> void:
	wait += 1
	if wait < 40: return
	wait = 0
	match step:
		0: _snap("trophy_data.jpg"); change_scene_to_file(UiFlow.SCENES.stable)
		1: _snap("trophy_stable.jpg")
		_: quit(0)
	step += 1
