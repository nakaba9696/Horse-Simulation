# Godot 版の中身のテスト（画面なし）。godot/tests/run.sh から呼ぶ
#   godot --headless --path godot -s tests/run.gd -- [名前の一部 …]   （test_*.gd のうち、名前に含むものだけ）
# 1 フレームに 1 ファイルずつ回す（途中で実行時の誤りが出てファイルが止まっても、次のフレームで NG に数えて先へ進む）
extends SceneTree

var passed := 0
var failed := 0
var _names: Array = []
var _k := -1
var _running := ""
var _t0 := 0
var _s := 0
var _p0 := 0
var _f0 := 0
var _busy := false   # 何フレームか待つテスト（run_async。画面を組んで並べてから見る）を回している間

func ok(c: bool, msg: String) -> void:
	if c: passed += 1
	else:
		failed += 1; print("  NG ", msg)

func eq(a: Variant, b: Variant, msg: String) -> void:
	if a == b: passed += 1
	else:
		failed += 1; print("  NG ", msg, "：", str(a).left(300), " ≠ ", str(b).left(300))

func _init() -> void:
	var only := Array(OS.get_cmdline_user_args())
	for f in DirAccess.get_files_at("res://tests"):
		if f.begins_with("test_") and f.ends_with(".gd") and (only.is_empty() or only.any(func(o): return f.contains(o))): _names.append(f)
	_names.sort()
	_t0 = Time.get_ticks_msec()
	process_frame.connect(_tick)

func _done_file() -> void:
	print("%s: %d ok, %d NG（%.1f秒）" % [_running, passed - _p0, failed - _f0, (Time.get_ticks_msec() - _s) / 1000.0])
	_running = ""

func _tick() -> void:
	if _busy: return
	if _running != "":
		failed += 1; print("  NG %s が途中で止まった（実行時の誤り）" % _running); _done_file()
	_k += 1
	if _k >= _names.size():
		print("godot: %d passed, %d failed（%.1f秒）" % [passed, failed, (Time.get_ticks_msec() - _t0) / 1000.0])
		quit(1 if failed else 0)
		return
	_running = _names[_k]; _s = Time.get_ticks_msec(); _p0 = passed; _f0 = failed
	var sc = load("res://tests/" + _running)
	if sc == null or not sc.can_instantiate():
		failed += 1; print("  NG %s を読めない" % _running); _done_file(); return
	var inst = sc.new()
	if inst.has_method("run_async"):
		_busy = true
		await inst.run_async(self)
		_busy = false
	else:
		inst.run(self)
	_done_file()
