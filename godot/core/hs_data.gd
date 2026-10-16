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

# セーブ（G）の指紋（tools/golden_world.js の digest と同じ）：辞書の項目を名前の順に並べ、null の項目を除き、-0 を 0 にする（JSON に書いて読み直したのと同じ）
static func digest_save(v: Variant) -> String:
	var buf := PackedStringArray()
	_canon_save(v, buf)
	return "".join(buf).sha256_text().left(16)
static func _canon_save(v: Variant, out: PackedStringArray) -> void:
	match typeof(v):
		TYPE_NIL: out.append("n;")
		TYPE_BOOL: out.append("t;" if v else "f;")
		TYPE_INT, TYPE_FLOAT:
			var x := float(v)
			out.append("d" + HSMath.hex(0.0 if x == 0.0 else x) + ";")
		TYPE_STRING, TYPE_STRING_NAME:
			var s := String(v)
			out.append("s%d:" % s.to_utf8_buffer().size() + s)
		TYPE_ARRAY:
			out.append("[")
			for x in v: _canon_save(x, out)
			out.append("]")
		TYPE_DICTIONARY:
			out.append("{")
			var ks: Array = v.keys().map(func(k): return String(k))
			ks.sort_custom(func(a, b): return _js_less(a, b))
			for ks_ in ks:
				var val = v[ks_] if v.has(ks_) else v[StringName(ks_)]
				if val == null: continue
				out.append("k%d:" % ks_.to_utf8_buffer().size() + ks_)
				_canon_save(val, out)
			out.append("}")
		_: out.append("?;")
# JS の文字の比べ（UTF-16 の単位の順）
static func _js_less(a: String, b: String) -> bool:
	var ua := a.to_utf16_buffer(); var ub := b.to_utf16_buffer()
	var n := mini(ua.size(), ub.size()) / 2
	for i in n:
		var ca := ua[i * 2] | (ua[i * 2 + 1] << 8); var cb := ub[i * 2] | (ub[i * 2 + 1] << 8)
		if ca != cb: return ca < cb
	return ua.size() < ub.size()
