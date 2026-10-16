# 絵の決まり（UiArt）が JS（js/ui/art.js・raceview.js・horse_rigged.js）と同じ値を出すか：記録（tools/export_race.js が JS で作った）の16頭と比べる
#   godot --headless --path godot -s res://tools/check_art.gd
extends SceneTree

func _initialize() -> void:
	var race: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/replay_race.json"))
	var fails := 0
	for h in race.horses:
		var g := UiArt.horse_info(String(h.name), String(h.coat), 4.0, int(h.num), int(h.frame))
		var bad := []
		for k in ["body", "top", "belly", "mane", "points", "muzzle", "hoof"]:
			if String(g.coatLook.get(k)) != String(h.coatLook.get(k)):
				bad.append(k)
		if absf(float(g.coatLook.get("dapple", 0.0)) - float(h.coatLook.get("dapple", 0.0))) > 1e-9:
			bad.append("dapple")
		if String(g.marks.blaze) != String(h.marks.blaze):
			bad.append("blaze")
		for k in 4:
			if absf(float(g.marks.socks[k]) - float(h.marks.socks[k])) > 1e-9:
				bad.append("sock%d" % k)
		for k in ["base", "sub", "pattern"]:
			if String(g.silks[k]) != String(h.silks[k]):
				bad.append("silks." + k)
		if String(g.cap).to_lower() != String(h.cap).to_lower():
			bad.append("cap")
		if bad.size() > 0:
			fails += 1
			print("  FAIL ", h.name, " ", bad, " godot=", g.silks, g.marks, " js=", h.silks, h.marks)
	print("art: %d/%d 頭が JS と同じ" % [race.horses.size() - fails, race.horses.size()])
	quit(1 if fails > 0 else 0)
