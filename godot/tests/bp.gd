extends SceneTree
func _init():
	HSWorld.load_save(FileAccess.get_file_as_string("res://tests/golden/world_save.json"))
	HSWorld._week = null
	var c := Time.get_ticks_usec(); var wk := HSWorld.prepare_week(); print("prepare ", (Time.get_ticks_usec() - c) / 1e6, " cards ", wk.cards.size(), " BT ", HSWorld.BT)
	quit()
