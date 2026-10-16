# JS（V8）の Math と同じ値を返す数学の関数。V8 は fdlibm を移したもの（src/base/ieee754.cc）を使うので、それを GDScript に移した。
# Godot の sin・cos・exp・log・pow は OS の数学ライブラリで、JS と最後の桁が違うことがある（Windows と Linux でも違う）。
# 模擬を JS 版と同じにするため、模擬の中では必ずここを通す。定数は 16 進のビットで持つ（GDScript の小数の読み取りは長い桁でずれる）。
# fdlibm: Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
# Developed at SunSoft, a Sun Microsystems, Inc. business. Permission to use, copy, modify, and distribute this
# software is freely granted, provided that this notice is preserved.
class_name HSMath

static var _b: PackedByteArray = _buf()
static func _buf() -> PackedByteArray:
	var b := PackedByteArray(); b.resize(8); return b
# 16 進（大きい桁から）のビットを小数に
static func _f(hex: String) -> float:
	var be := hex.hex_decode(); var le := PackedByteArray(); le.resize(8)
	for i in 8: le[i] = be[7 - i]
	return le.decode_double(0)

static var invpio2: float = _f("3fe45f306dc9c883")
static var pio2_1: float = _f("3ff921fb54400000")
static var pio2_1t: float = _f("3dd0b4611a626331")
static var pio2_2: float = _f("3dd0b4611a600000")
static var pio2_2t: float = _f("3ba3198a2e037073")
static var pio2_3: float = _f("3ba3198a2e000000")
static var pio2_3t: float = _f("397b839a252049c1")
static var KC1: float = _f("3fa555555555554c")
static var KC2: float = _f("bf56c16c16c15177")
static var KC3: float = _f("3efa01a019cb1590")
static var KC4: float = _f("be927e4f809c52ad")
static var KC5: float = _f("3e21ee9ebdb4b1c4")
static var KC6: float = _f("bda8fae9be8838d4")
static var KS1: float = _f("bfc5555555555549")
static var KS2: float = _f("3f8111111110f8a6")
static var KS3: float = _f("bf2a01a019c161d5")
static var KS4: float = _f("3ec71de357b1fe7d")
static var KS5: float = _f("be5ae5e68a2b9ceb")
static var KS6: float = _f("3de5d93a5acfd57c")
static var o_threshold: float = _f("40862e42fefa39ef")
static var u_threshold: float = _f("c0874910d52d3051")
static var ln2HI: float = _f("3fe62e42fee00000")
static var ln2LO: float = _f("3dea39ef35793c76")
static var invln2: float = _f("3ff71547652b82fe")
static var EP1: float = _f("3fc555555555553e")
static var EP2: float = _f("bf66c16c16bebd93")
static var EP3: float = _f("3f11566aaf25de2c")
static var EP4: float = _f("bebbbd41c5d26bf1")
static var EP5: float = _f("3e66376972bea4d0")
static var E: float = _f("4005bf0a8b145769")
static var twom1000: float = _f("0170000000000000")
static var two1023: float = _f("7fe0000000000000")
static var two54: float = _f("4350000000000000")
static var Lg1: float = _f("3fe5555555555593")
static var Lg2: float = _f("3fd999999997fa04")
static var Lg3: float = _f("3fd2492494229359")
static var Lg4: float = _f("3fcc71c51d8e78af")
static var Lg5: float = _f("3fc7466496cb03de")
static var Lg6: float = _f("3fc39a09d078c69f")
static var Lg7: float = _f("3fc2f112df3e5244")
static var third17: float = _f("3fd5555555555555")
static var CP0: float = _f("3ffe03e60f61e692")
static var CP1: float = _f("bffe28e092f02420")
static var CP2: float = _f("3ff9f1604a49d6c2")
static var CP3: float = _f("bfe844cbbee751d9")
static var CP4: float = _f("3fc2b000d4e4edd7")
static var dp_h1: float = _f("3fe2b80340000000")
static var dp_l1: float = _f("3e4cfdeb43cfd006")
static var two53: float = _f("4340000000000000")
static var huge: float = _f("7e37e43c8800759c")
static var tiny: float = _f("01a56e1fc2f8f359")
static var L1: float = _f("3fe3333333333303")
static var L2: float = _f("3fdb6db6db6fabff")
static var L3: float = _f("3fd55555518f264d")
static var L4: float = _f("3fd17460a91d4101")
static var L5: float = _f("3fcd864a93c9db65")
static var L6: float = _f("3fca7e284a454eef")
static var lg2: float = _f("3fe62e42fefa39ef")
static var lg2_h: float = _f("3fe62e4300000000")
static var lg2_l: float = _f("be205c610ca86c39")
static var ovt: float = _f("3c971547652b82fe")
static var cp: float = _f("3feec709dc3a03fd")
static var cp_h: float = _f("3feec709e0000000")
static var cp_l: float = _f("be3e2fe0145b01f5")
static var ivln2: float = _f("3ff71547652b82fe")
static var ivln2_h: float = _f("3ff7154760000000")
static var ivln2_l: float = _f("3e54ae0bf85ddf44")
static var third22: float = _f("3fd5555555555555")
static var PI: float = _f("400921fb54442d18")
static var TWO_PI: float = _f("401921fb54442d18")
static var HALF_PI: float = _f("3ff921fb54442d18")
static var INF: float = _f("7ff0000000000000")
static var NAN_: float = _f("7ff8000000000000")

# ---------- ビット ----------
static func hi_s(x: float) -> int:
	_b.encode_double(0, x); return _b.decode_s32(4)
static func hi_u(x: float) -> int:
	_b.encode_double(0, x); return _b.decode_u32(4)
static func lo_u(x: float) -> int:
	_b.encode_double(0, x); return _b.decode_u32(0)
static func words(h: int, l: int) -> float:
	_b.encode_u32(4, h & 0xFFFFFFFF); _b.encode_u32(0, l & 0xFFFFFFFF); return _b.decode_double(0)
static func set_hi(x: float, v: int) -> float:
	var l := lo_u(x); return words(v, l)
static func set_lo(x: float, v: int) -> float:
	var h := hi_u(x); return words(h, v)
# 小数のビットを 16 進（大きい桁から）に。テストで値を完全に比べるのに使う
static func hex(x: float) -> String:
	return "%08x%08x" % [hi_u(x), lo_u(x)]
static func from_hex(h: String) -> float:
	return _f(h)
# C の int32_t にそろえる
static func i32(v: int) -> int:
	v &= 0xFFFFFFFF
	return v - 0x100000000 if v >= 0x80000000 else v

# ---------- JS の小物 ----------
# Math.round（V8：ceil して、0.5 引いた値が x より大きければ 1 戻す）
static func round_js(x: float) -> float:
	var c := ceilf(x)
	return c if c - 0.5 <= x else c - 1.0
static func sign_js(x: float) -> float:
	return 1.0 if x > 0.0 else (-1.0 if x < 0.0 else x)
# Math.imul と >>> 0（32 ビットの符号なしで持つ）
static func imul_u(a: int, b: int) -> int:
	a &= 0xFFFFFFFF; b &= 0xFFFFFFFF
	var al := a & 0xFFFF; var ah := a >> 16
	return ((((ah * b) & 0xFFFF) << 16) + al * b) & 0xFFFFFFFF
# Math.hypot（V8：一番大きい値で割り、Kahan の足し算で 2 乗を足す）
static func hypot(a: float, b: float) -> float:
	a = absf(a); b = absf(b)
	if is_nan(a) or is_nan(b):
		return INF if (is_inf(a) or is_inf(b)) else NAN_
	var mx := maxf(a, b)
	if is_inf(mx): return INF
	if mx == 0.0: return 0.0
	var sum := 0.0; var comp := 0.0
	for v in [a, b]:
		var n: float = v / mx
		var summand: float = n * n - comp
		var prelim: float = sum + summand
		comp = (prelim - sum) - summand
		sum = prelim
	return sqrt(sum) * mx
# Number.prototype.toFixed(d)（d は 0〜3。2 進の値をそのまま 10 進にして、ちょうど半分なら大きい方へ）
static func to_fixed(x: float, d: int) -> String:
	if is_nan(x): return "NaN"
	var neg := x < 0.0
	var ax := absf(x)
	var p := 1
	for i in d: p *= 10
	# ax = m × 2^e（m は 53 ビットの整数）
	var h := hi_u(ax); var l := lo_u(ax)
	var ex := (h >> 20) & 0x7FF
	var m := ((h & 0xFFFFF) << 32) | l
	if ex == 0: ex = 1
	else: m |= 1 << 52
	var e := ex - 1075
	var num := m * p # m < 2^53・p <= 1000 なので 2^63 より小さい
	var n: int
	if e >= 0:
		n = num << e
	else:
		var sh := -e
		if sh >= 64: n = 0
		elif sh == 63: n = 1 if num >= (1 << 62) else 0
		else:
			n = num >> sh
			if num - (n << sh) >= (1 << (sh - 1)): n += 1
	var s := str(n)
	if d > 0:
		while s.length() <= d: s = "0" + s
		s = s.substr(0, s.length() - d) + "." + s.substr(s.length() - d)
	return ("-" + s) if neg else s

# ---------- 三角関数 ----------
static var _npio2_hw: PackedInt32Array = PackedInt32Array([
	0x3FF921FB, 0x400921FB, 0x4012D97C, 0x401921FB, 0x401F6A7A, 0x4022D97C,
	0x4025FDBB, 0x402921FB, 0x402C463A, 0x402F6A7A, 0x4031475C, 0x4032D97C,
	0x40346B9C, 0x4035FDBB, 0x40378FDB, 0x403921FB, 0x403AB41B, 0x403C463A,
	0x403DD85A, 0x403F6A7A, 0x40407E4C, 0x4041475C, 0x4042106C, 0x4042D97C,
	0x4043A28C, 0x40446B9C, 0x404534AC, 0x4045FDBB, 0x4046C6CB, 0x40478FDB,
	0x404858EB, 0x404921FB])
static var _y0 := 0.0
static var _y1 := 0.0
# x を π/2 の n 倍と余り（_y0＋_y1）に分ける。|x| が 2^19×π/2 までだけ（それより大きい値は模擬に出てこない）
static func _rem_pio2(x: float) -> int:
	var hx := hi_s(x)
	var ix := hx & 0x7FFFFFFF
	var z := 0.0
	if ix <= 0x3FE921FB:
		_y0 = x; _y1 = 0.0; return 0
	if ix < 0x4002D97C:
		if hx > 0:
			z = x - pio2_1
			if ix != 0x3FF921FB:
				_y0 = z - pio2_1t; _y1 = (z - _y0) - pio2_1t
			else:
				z -= pio2_2
				_y0 = z - pio2_2t; _y1 = (z - _y0) - pio2_2t
			return 1
		else:
			z = x + pio2_1
			if ix != 0x3FF921FB:
				_y0 = z + pio2_1t; _y1 = (z - _y0) + pio2_1t
			else:
				z += pio2_2
				_y0 = z + pio2_2t; _y1 = (z - _y0) + pio2_2t
			return -1
	if ix <= 0x413921FB:
		var t := absf(x)
		var n := int(t * invpio2 + 0.5)
		var fn := float(n)
		var r := t - fn * pio2_1
		var w := fn * pio2_1t
		if n < 32 and ix != _npio2_hw[n - 1]:
			_y0 = r - w
		else:
			var j := ix >> 20
			_y0 = r - w
			var high := hi_u(_y0)
			var i := j - ((high >> 20) & 0x7FF)
			if i > 16:
				t = r
				w = fn * pio2_2
				r = t - w
				w = fn * pio2_2t - ((t - r) - w)
				_y0 = r - w
				high = hi_u(_y0)
				i = j - ((high >> 20) & 0x7FF)
				if i > 49:
					t = r
					w = fn * pio2_3
					r = t - w
					w = fn * pio2_3t - ((t - r) - w)
					_y0 = r - w
		_y1 = (r - _y0) - w
		if hx < 0:
			_y0 = -_y0; _y1 = -_y1; return -n
		return n
	if ix >= 0x7FF00000:
		_y0 = x - x; _y1 = _y0; return 0
	push_error("HSMath: 大きすぎる角度 %s" % x)
	_y0 = NAN_; _y1 = NAN_
	return 0

static func _k_cos(x: float, y: float) -> float:
	var ix := hi_s(x) & 0x7FFFFFFF
	if ix < 0x3E400000:
		if int(x) == 0: return 1.0
	var z := x * x
	var r := z * (KC1 + z * (KC2 + z * (KC3 + z * (KC4 + z * (KC5 + z * KC6)))))
	if ix < 0x3FD33333:
		return 1.0 - (0.5 * z - (z * r - x * y))
	var qx: float
	if ix > 0x3FE90000: qx = 0.28125
	else: qx = words(ix - 0x00200000, 0)
	var iz := 0.5 * z - qx
	var a := 1.0 - qx
	return a - (iz - (z * r - x * y))

static func _k_sin(x: float, y: float, iy: int) -> float:
	var ix := hi_s(x) & 0x7FFFFFFF
	if ix < 0x3E400000:
		if int(x) == 0: return x
	var z := x * x
	var v := z * x
	var r := KS2 + z * (KS3 + z * (KS4 + z * (KS5 + z * KS6)))
	if iy == 0:
		return x + v * (KS1 + z * r)
	return x - ((z * (0.5 * y - v * r) - y) - v * KS1)

static func cos_(x: float) -> float:
	var ix := hi_s(x) & 0x7FFFFFFF
	if ix <= 0x3FE921FB: return _k_cos(x, 0.0)
	if ix >= 0x7FF00000: return x - x
	var n := _rem_pio2(x)
	match n & 3:
		0: return _k_cos(_y0, _y1)
		1: return -_k_sin(_y0, _y1, 1)
		2: return -_k_cos(_y0, _y1)
		_: return _k_sin(_y0, _y1, 1)

static func sin_(x: float) -> float:
	var ix := hi_s(x) & 0x7FFFFFFF
	if ix <= 0x3FE921FB: return _k_sin(x, 0.0, 0)
	if ix >= 0x7FF00000: return x - x
	var n := _rem_pio2(x)
	match n & 3:
		0: return _k_sin(_y0, _y1, 1)
		1: return _k_cos(_y0, _y1)
		2: return -_k_sin(_y0, _y1, 1)
		_: return -_k_cos(_y0, _y1)

# ---------- exp・log ----------
static func exp_(x: float) -> float:
	var hi := 0.0; var lo := 0.0; var k := 0
	var hx := hi_u(x)
	var xsb := (hx >> 31) & 1
	hx &= 0x7FFFFFFF
	if hx >= 0x40862E42:
		if hx >= 0x7FF00000:
			var lx := lo_u(x)
			if ((hx & 0xFFFFF) | lx) != 0: return x + x
			return x if xsb == 0 else 0.0
		if x > o_threshold: return INF
		if x < u_threshold: return 0.0
	if hx > 0x3FD62E42:
		if hx < 0x3FF0A2B2:
			if x == 1.0: return E
			hi = x - (ln2HI if xsb == 0 else -ln2HI)
			lo = ln2LO if xsb == 0 else -ln2LO
			k = 1 - xsb - xsb
		else:
			k = int(invln2 * x + (0.5 if xsb == 0 else -0.5))
			var tk := float(k)
			hi = x - tk * ln2HI
			lo = tk * ln2LO
		x = hi - lo
	elif hx < 0x3E300000:
		if huge + x > 1.0: return 1.0 + x
	else:
		k = 0
	var t := x * x
	var twopk: float
	if k >= -1021: twopk = words(0x3FF00000 + ((k << 20) & 0xFFFFFFFF), 0)
	else: twopk = words(0x3FF00000 + (((k + 1000) << 20) & 0xFFFFFFFF), 0)
	var c := x - t * (EP1 + t * (EP2 + t * (EP3 + t * (EP4 + t * EP5))))
	var y: float
	if k == 0:
		return 1.0 - ((x * c) / (c - 2.0) - x)
	y = 1.0 - ((lo - (x * c) / (2.0 - c)) - hi)
	if k >= -1021:
		if k == 1024: return y * 2.0 * two1023
		return y * twopk
	return y * twopk * twom1000

static func log_(x: float) -> float:
	var hx := hi_s(x); var lx := lo_u(x)
	var k := 0
	if hx < 0x00100000:
		if ((hx & 0x7FFFFFFF) | lx) == 0: return -INF
		if hx < 0: return NAN_
		k -= 54
		x *= two54
		hx = hi_s(x)
	if hx >= 0x7FF00000: return x + x
	k += (hx >> 20) - 1023
	hx &= 0x000FFFFF
	var i := (hx + 0x95F64) & 0x100000
	x = set_hi(x, hx | (i ^ 0x3FF00000))
	k += (i >> 20)
	var f := x - 1.0
	var dk: float
	var R: float
	if (0x000FFFFF & (2 + hx)) < 3:
		if f == 0.0:
			if k == 0: return 0.0
			dk = float(k)
			return dk * ln2HI + dk * ln2LO
		R = f * f * (0.5 - third17 * f)
		if k == 0: return f - R
		dk = float(k)
		return dk * ln2HI - ((R - dk * ln2LO) - f)
	var s := f / (2.0 + f)
	dk = float(k)
	var z := s * s
	i = hx - 0x6147A
	var w := z * z
	var j := 0x6B851 - hx
	var t1 := w * (Lg2 + w * (Lg4 + w * Lg6))
	var t2 := z * (Lg1 + w * (Lg3 + w * (Lg5 + w * Lg7)))
	i |= j
	R = t2 + t1
	if i > 0:
		var hfsq := 0.5 * f * f
		if k == 0: return f - (hfsq - s * (hfsq + R))
		return dk * ln2HI - ((hfsq - (s * (hfsq + R) + dk * ln2LO)) - f)
	if k == 0: return f - s * (f - R)
	return dk * ln2HI - ((s * (f - R) - dk * ln2LO) - f)

# ---------- cbrt ----------
static func cbrt(x: float) -> float:
	var hx := hi_u(x); var low := lo_u(x)
	var sgn := hx & 0x80000000
	hx ^= sgn
	if hx >= 0x7FF00000: return x + x
	var t := 0.0
	if hx < 0x00100000:
		if (hx | low) == 0: return x
		t = set_hi(t, 0x43500000)
		t *= x
		var high := hi_u(t)
		t = words(sgn | ((high & 0x7FFFFFFF) / 3 + 696219795), 0)
	else:
		t = words(sgn | (hx / 3 + 715094163), 0)
	var r := (t * t) * (t / x)
	t = t * ((CP0 + r * (CP1 + r * CP2)) + ((r * r) * r) * (CP3 + r * CP4))
	# bits = (bits + 0x80000000) & 0xFFFFFFFFC0000000
	var th := hi_u(t); var tl := lo_u(t) + 0x80000000
	th = (th + (tl >> 32)) & 0xFFFFFFFF
	tl &= 0xC0000000
	t = words(th, tl)
	var s := t * t
	r = x / s
	var w := t + t
	r = (r - t) / (w + r)
	t = t + t * r
	return t

# ---------- pow ----------
static func _scalbn(z: float, n: int) -> float:
	while n > 0:
		var k := mini(n, 1000); z *= words(0x3FF00000 + (k << 20), 0); n -= k
	while n < 0:
		var k := mini(-n, 1000); z *= words(0x3FF00000 - (k << 20), 0); n += k
	return z

static func pow_(x: float, y: float) -> float:
	var z: float; var ax: float; var z_h: float; var z_l: float; var p_h: float; var p_l: float
	var y1: float; var t1: float; var t2: float; var r: float; var s: float; var t: float; var u: float; var v: float; var w: float
	var i: int; var j: int; var k: int; var yisint: int; var n: int
	var hx := hi_s(x); var lx := lo_u(x)
	var hy := hi_s(y); var ly := lo_u(y)
	var ix := hx & 0x7fffffff
	var iy := hy & 0x7fffffff
	if (iy | ly) == 0: return 1.0
	if ix > 0x7ff00000 or (ix == 0x7ff00000 and lx != 0) or iy > 0x7ff00000 or (iy == 0x7ff00000 and ly != 0):
		return x + y
	yisint = 0
	if hx < 0:
		if iy >= 0x43400000:
			yisint = 2
		elif iy >= 0x3ff00000:
			k = (iy >> 20) - 0x3ff
			if k > 20:
				j = ly >> (52 - k)
				if ((j << (52 - k)) & 0xFFFFFFFF) == ly: yisint = 2 - (j & 1)
			elif ly == 0:
				j = iy >> (20 - k)
				if (j << (20 - k)) == iy: yisint = 2 - (j & 1)
	if ly == 0:
		if iy == 0x7ff00000:
			if ((ix - 0x3ff00000) | lx) == 0: return y - y
			elif ix >= 0x3ff00000: return y if hy >= 0 else 0.0
			else: return -y if hy < 0 else 0.0
		if iy == 0x3ff00000:
			return 1.0 / x if hy < 0 else x
		if hy == 0x40000000: return x * x
		if hy == 0x3fe00000:
			if hx >= 0: return sqrt(x)
	ax = absf(x)
	if lx == 0:
		if ix == 0x7ff00000 or ix == 0 or ix == 0x3ff00000:
			z = ax
			if hy < 0: z = 1.0 / z
			if hx < 0:
				if ((ix - 0x3ff00000) | yisint) == 0: z = NAN_
				elif yisint == 1: z = -z
			return z
	n = (hx >> 31) + 1
	if (n | yisint) == 0: return NAN_
	s = 1.0
	if (n | (yisint - 1)) == 0: s = -1.0
	if iy > 0x41e00000:
		if iy > 0x43f00000:
			if ix <= 0x3fefffff: return INF if hy < 0 else 0.0
			if ix >= 0x3ff00000: return INF if hy > 0 else 0.0
		if ix < 0x3fefffff: return s * INF if hy < 0 else s * 0.0
		if ix > 0x3ff00000: return s * INF if hy > 0 else s * 0.0
		t = ax - 1.0
		w = (t * t) * (0.5 - t * (third22 - t * 0.25))
		u = ivln2_h * t
		v = t * ivln2_l - w * ivln2
		t1 = u + v
		t1 = set_lo(t1, 0)
		t2 = v - (t1 - u)
	else:
		var ss: float; var s2: float; var s_h: float; var s_l: float; var t_h: float; var t_l: float
		n = 0
		if ix < 0x00100000:
			ax *= two53
			n -= 53
			ix = hi_s(ax)
		n += (ix >> 20) - 0x3ff
		j = ix & 0x000fffff
		ix = j | 0x3ff00000
		if j <= 0x3988E: k = 0
		elif j < 0xBB67A: k = 1
		else:
			k = 0; n += 1; ix -= 0x00100000
		ax = set_hi(ax, ix)
		var bpk := 1.0 if k == 0 else 1.5
		var dphk := 0.0 if k == 0 else dp_h1
		var dplk := 0.0 if k == 0 else dp_l1
		u = ax - bpk
		v = 1.0 / (ax + bpk)
		ss = u * v
		s_h = ss
		s_h = set_lo(s_h, 0)
		t_h = 0.0
		t_h = set_hi(t_h, ((ix >> 1) | 0x20000000) + 0x00080000 + (k << 18))
		t_l = ax - (t_h - bpk)
		s_l = v * ((u - s_h * t_h) - s_h * t_l)
		s2 = ss * ss
		r = s2 * s2 * (L1 + s2 * (L2 + s2 * (L3 + s2 * (L4 + s2 * (L5 + s2 * L6)))))
		r += s_l * (s_h + ss)
		s2 = s_h * s_h
		t_h = 3.0 + s2 + r
		t_h = set_lo(t_h, 0)
		t_l = r - ((t_h - 3.0) - s2)
		u = s_h * t_h
		v = s_l * t_h + t_l * ss
		p_h = u + v
		p_h = set_lo(p_h, 0)
		p_l = v - (p_h - u)
		z_h = cp_h * p_h
		z_l = cp_l * p_h + p_l * cp + dplk
		t = float(n)
		t1 = (((z_h + z_l) + dphk) + t)
		t1 = set_lo(t1, 0)
		t2 = z_l - (((t1 - t) - dphk) - z_h)
	y1 = y
	y1 = set_lo(y1, 0)
	p_l = (y - y1) * t1 + y * t2
	p_h = y1 * t1
	z = p_l + p_h
	j = hi_s(z); i = lo_u(z)
	if j >= 0x40900000:
		if ((j - 0x40900000) | i) != 0: return s * INF
		elif p_l + ovt > z - p_h: return s * INF
	elif (j & 0x7fffffff) >= 0x4090cc00:
		if ((j - i32(0xc090cc00)) | i) != 0: return s * 0.0
		elif p_l <= z - p_h: return s * 0.0
	i = j & 0x7fffffff
	k = (i >> 20) - 0x3ff
	n = 0
	if i > 0x3fe00000:
		n = j + (0x00100000 >> (k + 1))
		k = ((n & 0x7fffffff) >> 20) - 0x3ff
		t = 0.0
		t = set_hi(t, n & ~(0x000fffff >> k))
		n = ((n & 0x000fffff) | 0x00100000) >> (20 - k)
		if j < 0: n = -n
		p_h -= t
	t = p_l + p_h
	t = set_lo(t, 0)
	u = t * lg2_h
	v = (p_l - (t - p_h)) * lg2 + t * lg2_l
	z = u + v
	w = v - (z - u)
	t = z * z
	t1 = z - t * (EP1 + t * (EP2 + t * (EP3 + t * (EP4 + t * EP5))))
	r = (z * t1) / ((t1 - 2.0) - (w + z * w))
	z = 1.0 - (r - z)
	j = hi_s(z)
	j = i32(j + ((n << 20) & 0xFFFFFFFF))
	if (j >> 20) <= 0:
		z = _scalbn(z, n)
	else:
		var tmp := hi_s(z)
		z = set_hi(z, tmp + ((n << 20) & 0xFFFFFFFF))
	return s * z
