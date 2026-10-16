# ゲームのデータ（JS 版の HS.DATA と同じもの）。godot/data/*.json は tools/export_godot.js が書き出す（手で直さない）。
#   HSData.D["courses"]["東京"] のように読む。最初に使うとき（HSData.d()）に全部を読む
class_name HSData

static var D: Dictionary = {}
static var dir: String = "res://data"

static func d() -> Dictionary:
	if D.is_empty(): load_all()
	return D

static func load_all(from: String = "") -> Dictionary:
	if from != "": dir = from
	var man: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(dir.path_join("manifest.json")))
	D = {}
	for k in man["files"]:
		var txt := FileAccess.get_file_as_string(dir.path_join(k + ".json"))
		if txt == "": push_error("HSData: 読めない %s" % k); continue
		D[k] = JSON.parse_string(txt)
	return D

# 外国で調教された馬か（JS の HS.DATA.isForeign）
static func is_foreign(h: Dictionary) -> bool:
	var c = h.get("country")
	return c != null and c != "" and c != "日"

# 中身の指紋（tools/export_godot.js の canon と同じ並べ方の SHA-256）。書き出しを正しく読めたかのテストに使う
static func digest(v: Variant) -> String:
	var ctx := HashingContext.new()
	ctx.start(HashingContext.HASH_SHA256)
	var buf := PackedStringArray()
	_canon(v, buf)
	ctx.update("".join(buf).to_utf8_buffer())
	return ctx.finish().hex_encode()

static func _canon(v: Variant, out: PackedStringArray) -> void:
	match typeof(v):
		TYPE_NIL: out.append("n;")
		TYPE_BOOL: out.append("t;" if v else "f;")
		TYPE_INT, TYPE_FLOAT: out.append("d" + HSMath.hex(float(v)) + ";")
		TYPE_STRING, TYPE_STRING_NAME:
			var s := String(v)
			out.append("s%d:" % s.to_utf8_buffer().size() + s)
		TYPE_ARRAY:
			out.append("[")
			for x in v: _canon(x, out)
			out.append("]")
		TYPE_DICTIONARY:
			out.append("{")
			for k in v:
				var ks := String(k)
				out.append("k%d:" % ks.to_utf8_buffer().size() + ks)
				_canon(v[k], out)
			out.append("}")
		_: push_error("HSData: 知らない型 %s" % typeof(v))
