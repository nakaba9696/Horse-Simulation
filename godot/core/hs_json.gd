# JSON の読み書き（セーブ用）。Godot の JSON.parse は有効数字の長い小数（14 桁以上）を最後の桁で読み違えるので、
# 数だけはここで読み直す（10 進の値にいちばん近い小数を、大きい整数の比べで正しく選ぶ。JS の JSON.parse と同じ値）。
#   HSJson.parse(text) → Variant（数はすべて小数）
#   HSJson.stringify(v) → 文字（数は 17 桁で書くので、JS でも Godot でも同じ値に読める）
class_name HSJson

const _MARK := "\u0001"
static var _re: RegEx = null

static func parse(text: String) -> Variant:
	if _re == null: _re = RegEx.create_from_string("\"(?:[^\"\\\\]|\\\\.)*\"|-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?")
	var parts := PackedStringArray()
	var nums := PackedStringArray()
	var last := 0
	for m in _re.search_all(text):
		var s := m.get_string()
		if s.begins_with("\""): continue
		parts.append(text.substr(last, m.get_start() - last))
		parts.append("\"\\u0001%d\"" % nums.size())
		nums.append(s)
		last = m.get_end()
	parts.append(text.substr(last))
	var v = JSON.parse_string("".join(parts))
	var vals := PackedFloat64Array(); vals.resize(nums.size())
	for i in nums.size(): vals[i] = to_float(nums[i])
	return _fix(v, vals)

static func _fix(v: Variant, vals: PackedFloat64Array) -> Variant:
	match typeof(v):
		TYPE_STRING:
			var s: String = v
			if s.begins_with(_MARK): return vals[int(s.substr(1))]
			return s
		TYPE_ARRAY:
			for i in v.size(): v[i] = _fix(v[i], vals)
			return v
		TYPE_DICTIONARY:
			for k in v: v[k] = _fix(v[k], vals)
			return v
	return v

# ---------- 10 進の文字 → 小数（正しく丸める） ----------
static var _P10: PackedFloat64Array = _p10()
static func _p10() -> PackedFloat64Array:
	var a := PackedFloat64Array(); var x := 1.0
	for i in 23:
		a.append(x); x *= 10.0
	return a
static func to_float(s: String) -> float:
	var neg := s.begins_with("-")
	if neg: s = s.substr(1)
	var e10 := 0
	var ei := s.findn("e")
	if ei >= 0:
		e10 = s.substr(ei + 1).to_int(); s = s.substr(0, ei)
	var dot := s.find(".")
	if dot >= 0:
		e10 -= s.length() - dot - 1; s = s.substr(0, dot) + s.substr(dot + 1)
	var i := 0
	while i < s.length() - 1 and s[i] == "0": i += 1
	s = s.substr(i)
	var v: float
	if s == "0": v = 0.0
	elif s.length() <= 15 and absi(e10) <= 22:
		var m := float(s.to_int())
		v = m * _P10[e10] if e10 >= 0 else m / _P10[-e10]
	else:
		v = _slow(s, e10)
	return -v if neg else v

# ---------- 大きい整数（24 ビットずつ、下の桁から） ----------
const _B := 16777216
static func _big(n: int) -> PackedInt64Array:
	var a := PackedInt64Array()
	while n > 0:
		a.append(n % _B); n /= _B
	return a
static func _big_dec(s: String) -> PackedInt64Array:
	var a := PackedInt64Array()
	for ch in s: a = _mul_add(a, 10, ch.to_int())
	return a
static func _mul_add(a: PackedInt64Array, m: int, add: int) -> PackedInt64Array:
	var out := PackedInt64Array(); out.resize(a.size())
	var c := add
	for i in a.size():
		var t := a[i] * m + c
		out[i] = t % _B; c = t / _B
	while c > 0:
		out.append(c % _B); c /= _B
	return out
static func _shl(a: PackedInt64Array, n: int) -> PackedInt64Array:
	var out := a
	while n >= 23:
		out = _mul_add(out, 1 << 23, 0); n -= 23
	if n > 0: out = _mul_add(out, 1 << n, 0)
	return out
static func _pow5(a: PackedInt64Array, n: int) -> PackedInt64Array:
	var out := a
	while n >= 10:
		out = _mul_add(out, 9765625, 0); n -= 10
	var p := 1
	for i in n: p *= 5
	return _mul_add(out, p, 0)
static func _cmp(a: PackedInt64Array, b: PackedInt64Array) -> int:
	var na := a.size(); var nb := b.size()
	while na > 0 and a[na - 1] == 0: na -= 1
	while nb > 0 and b[nb - 1] == 0: nb -= 1
	if na != nb: return 1 if na > nb else -1
	for i in range(na - 1, -1, -1):
		if a[i] != b[i]: return 1 if a[i] > b[i] else -1
	return 0
# 小数 x（正）を m×2^e に
static func _me(x: float) -> Array:
	var h := HSMath.hi_u(x); var l := HSMath.lo_u(x)
	var ex := (h >> 20) & 0x7FF
	var m := ((h & 0xFFFFF) << 32) | l
	if ex == 0: ex = 1
	else: m |= 1 << 52
	return [m, ex - 1075]
# D×10^E と、隣り合う2つの小数 a < b のまん中を比べる（D：10 進の整数の桁）
static func _cmp_mid(D: PackedInt64Array, E: int, a: float, b: float) -> int:
	var pa := _me(a); var pb := _me(b)
	var emin := mini(pa[1], pb[1])
	# まん中 = (ma×2^(ea−emin) + mb×2^(eb−emin)) × 2^(emin−1)
	var mid := _shl(_big(pa[0]), pa[1] - emin)
	var mb := _shl(_big(pb[0]), pb[1] - emin)
	var s := PackedInt64Array(); s.resize(maxi(mid.size(), mb.size()) + 1)
	var c := 0
	for i in s.size():
		var t := (mid[i] if i < mid.size() else 0) + (mb[i] if i < mb.size() else 0) + c
		s[i] = t % _B; c = t / _B
	var e2 := emin - 1
	# 左：D×5^E×2^E、右：s×2^e2。5 の累乗と 2 の累乗を整数にそろえる
	var L := D; var R := s
	if E >= 0: L = _pow5(L, E)
	else: R = _pow5(R, -E)
	var le := E; var re := e2
	var lo := mini(le, re)
	L = _shl(L, le - lo); R = _shl(R, re - lo)
	return _cmp(L, R)
static func _next(x: float) -> float:
	var m := _me(x)
	return HSMath.words((HSMath.hi_u(x) + (1 if HSMath.lo_u(x) == 0xFFFFFFFF else 0)) & 0xFFFFFFFF, (HSMath.lo_u(x) + 1) & 0xFFFFFFFF)
static func _prev(x: float) -> float:
	return HSMath.words((HSMath.hi_u(x) - (1 if HSMath.lo_u(x) == 0 else 0)) & 0xFFFFFFFF, (HSMath.lo_u(x) - 1) & 0xFFFFFFFF)
static func _slow(digits: String, E: int) -> float:
	var D := _big_dec(digits)
	var c := ("%se%d" % [digits, E]).to_float()
	if c <= 0.0 or is_inf(c): return c
	for k in 8:
		var hi := _cmp_mid(D, E, c, _next(c))
		if hi > 0 or (hi == 0 and (HSMath.lo_u(c) & 1) == 1):
			c = _next(c); continue
		var lo := _cmp_mid(D, E, _prev(c), c)
		if lo < 0 or (lo == 0 and (HSMath.lo_u(c) & 1) == 1):
			c = _prev(c); continue
		break
	return c

# ---------- 書く ----------
static func stringify(v: Variant) -> String:
	return JSON.stringify(v, "", false, true)
