# 画面のスクリプトがすべて読めるか（読み込みの誤りを一度に出す）
#   godot --headless --path godot -s res://tools/check_scripts.gd
extends SceneTree

func _initialize() -> void:
	var bad := 0
	for dir in ["res://ui", "res://view", "res://i18n"]:
		for f in DirAccess.get_files_at(dir):
			if f.ends_with(".gd"):
				var s = load(dir.path_join(f))
				if s == null or not s.can_instantiate():
					bad += 1
					print("NG ", f)
	print("check_scripts: %d NG" % bad)
	quit(1 if bad else 0)
