# 共通の道具（js/core/util.js の U と同じ）：決まった数（hash）・書式・小物。乱数は HSRng
class_name HSU

# 年代なしのゲーム（U.ERA に年が入る）では、物価・走りの速さ・番組はその年で固定する
static var ERA: Variant = null

# JS の (v >>> 0)
static func to_u32(v: float) -> int:
	if is_nan(v) or is_inf(v): return 0
	var t := v
	t = floorf(t) if t >= 0.0 else ceilf(t)
	var m := fmod(t, 4294967296.0)
	if m < 0.0: m += 4294967296.0
	return int(m)

# 文字列から決まった数（FNV-1a。JS の charCodeAt と同じく UTF-16 の単位で）
static func hash32(str_: String) -> int:
	var h := 2166136261
	var b := str_.to_utf16_buffer()
	for i in range(0, b.size(), 2):
		h ^= b[i] | (b[i + 1] << 8)
		h = HSMath.imul_u(h, 16777619)
	return h & 0xFFFFFFFF
static func hash_rng(str_: String) -> HSRng:
	return HSRng.new(float(hash32(str_)))

# JS の Math.max・Math.min（+0 と -0 を区別する：max(0, -0) は +0、min(0, -0) は -0。NaN はそのまま）
static func mx(a: float, b: float) -> float:
	if a > b: return a
	if b > a: return b
	if a == b and a != 0.0: return a
	return a + b
static func mn(a: float, b: float) -> float:
	if a < b: return a
	if b < a: return b
	if a == b and a != 0.0: return a
	return -((-a) + (-b))
static func clamp(v: float, a: float, b: float) -> float:
	return mx(a, mn(b, v))
static func lerp(a: float, b: float, t: float) -> float:
	return a + (b - a) * t
static func smooth(t: float) -> float:
	t = clamp(t, 0.0, 1.0); return t * t * (3.0 - 2.0 * t)
static func sum(arr: Array) -> float:
	var s := 0.0
	for v in arr: s += v
	return s
static func avg(arr: Array) -> float:
	return sum(arr) / arr.size() if arr.size() else 0.0

# JS の String(数)（整数だけ。小数は使う所で書式を決める）
static func num(v: float) -> String:
	if v == floorf(v) and absf(v) < 1e21: return str(int(v))
	return str(v)
# toLocaleString('ja-JP')（整数の 3 桁区切り）
static func locale_int(v: int) -> String:
	var s := str(absi(v)); var out := ""
	while s.length() > 3:
		out = "," + s.substr(s.length() - 3) + out; s = s.substr(0, s.length() - 3)
	return ("-" if v < 0 else "") + s + out

# 金額（万円単位の数）を「1億2,345万円」に
static func money(man: float) -> String:
	var neg := man < 0.0
	var v := int(HSMath.round_js(absf(man)))
	var oku := v / 10000; var rest := v % 10000
	var s := ""
	if oku > 0: s += locale_int(oku) + "億"
	if rest > 0 or oku == 0: s += locale_int(rest) + "万"
	return ("-" if neg else "") + s + "円"
# 走破タイム（秒）を「2:23.4」に
static func time(sec: float) -> String:
	var t := HSMath.round_js(sec * 10.0) / 10.0
	var m := floorf(t / 60.0); var s := t - m * 60.0
	var ss := HSMath.to_fixed(s, 1)
	while ss.length() < 4: ss = "0" + ss
	return "%d:%s" % [int(m), ss] if m > 0.0 else ss

# 物価の目安（1995年＝1）。年代ごとのお金に掛ける
static func _lerp_table(tbl: Array, y: float) -> float:
	if y <= tbl[0][0]: return tbl[0][1]
	for i in tbl.size() - 1:
		var y1: float = tbl[i][0]; var v1: float = tbl[i][1]; var y2: float = tbl[i + 1][0]; var v2: float = tbl[i + 1][1]
		if y <= y2: return v1 + (v2 - v1) * (y - y1) / (y2 - y1)
	return tbl[tbl.size() - 1][1]
static func _era_or(y: Variant, d: float) -> float:
	if ERA: return float(ERA)
	if y: return float(y)
	return d
static var _PRICE: Array = [[1960.0, 0.12], [1965.0, 0.18], [1970.0, 0.28], [1975.0, 0.5], [1980.0, 0.7], [1985.0, 0.82], [1990.0, 0.93], [1995.0, 1.0], [2010.0, 1.0], [2020.0, 1.05], [2030.0, 1.15]]
static var _SPEED: Array = [[1960.0, 0.972], [1970.0, 0.979], [1980.0, 0.986], [1990.0, 0.992], [2000.0, 0.997], [2010.0, 1.0]]
static func price_index(y: Variant = null) -> float:
	return _lerp_table(_PRICE, _era_or(y, 1995.0))
# 時代の走りの速さ（馬場と調教の進歩。2010年代＝1）
static func era_speed(y: Variant = null) -> float:
	return _lerp_table(_SPEED, _era_or(y, 2010.0))

# 能力値をアルファベットの評価に
static func grade(v: Variant) -> String:
	if v == null: return "?"
	if v >= 100: return "SS"
	if v >= 92: return "S"
	if v >= 84: return "A"
	if v >= 76: return "B"
	if v >= 68: return "C"
	if v >= 60: return "D"
	if v >= 50: return "E"
	if v >= 40: return "F"
	return "G"

# 着差（馬身）を表記に
static var _MARGIN: Array = [[0.6, "1/2"], [0.85, "3/4"], [1.1, "1"], [1.35, "1 1/4"], [1.6, "1 1/2"], [1.85, "1 3/4"], [2.25, "2"], [2.75, "2 1/2"], [3.25, "3"], [3.75, "3 1/2"], [4.5, "4"], [5.5, "5"], [6.5, "6"], [7.5, "7"], [8.5, "8"], [9.5, "9"], [10.5, "10"]]
static func margin(lengths: float) -> String:
	if lengths <= 0.003: return "同着"
	if lengths < 0.1: return "ハナ"
	if lengths < 0.25: return "アタマ"
	if lengths < 0.4: return "クビ"
	for st in _MARGIN:
		if lengths < st[0]: return st[1]
	return "大差"

# JS の Array.prototype.sort と同じ並び（安定）。less(a, b) は a を b より前に置くとき true
static func stable_sort(arr: Array, less: Callable) -> Array:
	var idx: Array = []
	for i in arr.size(): idx.append([arr[i], i])
	idx.sort_custom(func(p, q): return true if less.call(p[0], q[0]) else (false if less.call(q[0], p[0]) else p[1] < q[1]))
	var out: Array = []
	for p in idx: out.append(p[0])
	return out
# JS の数の比べ（a - b）で並べる：key(x) の小さい順
static func sort_by(arr: Array, key: Callable, desc: bool = false) -> Array:
	if desc: return stable_sort(arr, func(a, b): return key.call(a) > key.call(b))
	return stable_sort(arr, func(a, b): return key.call(a) < key.call(b))

# JS の (v || d)：null・0・false・空の文字なら d
static func or_(v: Variant, d: Variant) -> Variant:
	if v == null: return d
	match typeof(v):
		TYPE_BOOL: return v if v else d
		TYPE_INT, TYPE_FLOAT: return v if (v != 0 and not is_nan(float(v))) else d
		TYPE_STRING: return v if v != "" else d
	return v
# JS の真偽（!!v）
static func truthy(v: Variant) -> bool:
	if v == null: return false
	match typeof(v):
		TYPE_BOOL: return v
		TYPE_INT, TYPE_FLOAT: return v != 0 and not is_nan(float(v))
		TYPE_STRING: return v != ""
	return true
