# 殿堂の数とセーブの重さを測る（テストではない）：godot --headless --path godot -s tests/bench_hall.gd
# 新しいゲームと、何年か遊んだセーブで、殿堂の馬を 0・100・300 頭にして、セーブの本体の大きさと、週の締めの保存（UiFlow.save＝本体を文字にして書く）の時間を比べる。
#   前＝1走ごとの記録（rec）を本体に持つ形（JS 版と、別ファイルにする前の Godot 版）・後＝記録は別ファイル（HSHall）
# 殿堂の馬は1頭 20走・1走 18頭の出走馬とラップ（2000m で10本）の記録を持つ（G1 を走り続けた馬の目安）
extends SceneTree

func _init():
	UiFlow.save_path = "user://bench_hall_save.json"
	UiFlow.new_game("測る騎手", "美浦", 5.0)
	_bench("新しいゲーム")
	HSWorld.load_save(FileAccess.get_file_as_string("res://tests/golden/world_save.json"))
	_bench("何年か遊んだセーブ（一致テストの world_save）")
	UiFlow.delete_save()
	quit()

func _bench(label: String) -> void:
	print("--- ", label)
	var G = HSWorld.G
	var names: Array = HSWorld.all().map(func(x): return String(x.name))
	print("殿堂0頭：本体 %.2fMB・保存 %.2f秒" % [_size(), _save_time()])
	for n in [100, 300]:
		for form in ["前（本体に記録）", "後（別ファイル）"]:
			HSHall.clear()
			HSHall.set_dir(UiFlow.hall_dir())
			G.hallOwn = []
			var t0 := Time.get_ticks_usec()
			for i in n:
				var e := _entry(G, names, i)
				if form.begins_with("後"): HSHall._store(String(e.id), String(e.name), HSHall._split(e))
				G.hallOwn.append(e)
			var tw := (Time.get_ticks_usec() - t0) / 1e6
			print("殿堂%d頭 %s：本体 %.2fMB・保存 %.2f秒%s" % [n, form, _size(), _save_time(), ("（記録のファイル %d個・計 %.2fMB・書くのに %.2f秒＝殿堂入りのときに1頭ずつ）" % [n, _dir_mb(), tw]) if form.begins_with("後") else ""])
	t_open()

# 殿堂の馬を1頭開く時間（別ファイルを読む）
func t_open() -> void:
	var id := String(HSWorld.G.hallOwn[150].id)
	HSHall.forget()
	var t0 := Time.get_ticks_usec()
	var o = HSHall.open(id)
	print("殿堂の馬を開く（別ファイルを読む）：%.3f秒・記録 %d走" % [(Time.get_ticks_usec() - t0) / 1e6, o.results.filter(func(r): return r.has("rec")).size()])

func _entry(G: Dictionary, names: Array, i: int) -> Dictionary:
	var res: Array = []
	for k in 20:
		var f: Array = []
		for j in 18:
			f.append([String(names[(i * 37 + k * 18 + j) % names.size()]), float(j + 1), 1190.0 + j * 3 + k, "クビ" if j else "", float((j * 7) % 18 + 1), "騎手%d" % (j % 9)])
		var lap: Array = []
		for j in 10: lap.append(118.0 + (j * 7 + k) % 9)
		res.append({ y = 2026.0 + k / 6, m = float(k % 12 + 1), w = 2.0, race = "天皇賞（秋）", grade = "G1", course = "東京", surface = "芝", dist = 2000.0, ground = "良", pos = float(k % 5 + 1), n = 18.0,
			time = 119.5 + k * 0.1, margin = "クビ", last3f = 33.8, jockey = "騎手甲", pop = 2.0, rt = 118.0, rec = { f = f, lap = lap } })
	return { id = "bench%d" % i, name = String(names[i % names.size()]), born = 2023.0, sex = "牡", coat = "鹿毛", sire = "父", dam = "母", hist = true, original = false, style = "差し", kire = 6.0, skills = [],
		starts = 20.0, wins = 8.0, w2 = 5.0, w3 = 3.0, prize = 1.5e6, g1 = 5.0, gradedWins = [], trophies = [{ id = "triple", label = "日本三冠", y = 2026.0, bonus = 0.0 }], titles = [],
		fh = { turf = 80.0, dirt = 50.0 }, first = 2026.0, retiredY = 2029.0, results = res }

func _size() -> float:
	return HSWorld.serialize().to_utf8_buffer().size() / 1048576.0

func _save_time() -> float:
	var best := 1e9
	for k in 3:
		var t0 := Time.get_ticks_usec()
		UiFlow.save()
		best = minf(best, (Time.get_ticks_usec() - t0) / 1e6)
	return best

func _dir_mb() -> float:
	var s := 0
	for f in DirAccess.get_files_at(HSHall.dir):
		s += FileAccess.get_file_as_bytes(HSHall.dir.path_join(f)).size()
	return s / 1048576.0
