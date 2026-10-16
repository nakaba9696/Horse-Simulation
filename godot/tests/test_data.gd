# データの書き出し（godot/data/*.json）を正しく読めたか：manifest の指紋と、読んだ値の指紋が同じか
extends RefCounted

func run(t) -> void:
	var man: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/manifest.json"))
	var D := HSData.d()
	for k in man["files"]:
		t.ok(D.has(k), "data: %s を読めた" % k)
		if D.has(k): t.eq(HSData.digest(D[k]), man["files"][k], "data: %s の中身が JS と同じ" % k)
	t.ok(D["historic"].size() > 5000, "data: 史実馬 %d 頭" % D["historic"].size())
