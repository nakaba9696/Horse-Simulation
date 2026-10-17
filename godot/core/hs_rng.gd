# 種で固定できる乱数（js/core/util.js の U.RNG と同じ mulberry32。同じ種なら JS と全く同じ列）。状態は数 1 つ（s）でセーブに入れられる
class_name HSRng
extends RefCounted

var s: int = 1

func _init(seed_: float = 1.0) -> void:
	# JS：(seed >>> 0) || 1
	s = HSU.to_u32(seed_)
	if s == 0: s = 1

func next() -> float:
	s = (s + 0x6D2B79F5) & 0xFFFFFFFF
	var t := s
	t = HSMath.imul_u(t ^ (t >> 15), t | 1)
	t ^= (t + HSMath.imul_u(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF
	return float((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

func float_(a: float = 0.0, b: float = 1.0) -> float:
	return a + (b - a) * next()

# a..b を含む
func int_(a: float, b: float) -> int:
	return int(floorf(float_(a, b + 1.0)))

func chance(p: float) -> bool:
	return next() < p

func normal(m: float = 0.0, sd: float = 1.0) -> float:
	var u := 0.0; var v := 0.0
	while u == 0.0: u = next()
	while v == 0.0: v = next()
	return m + sd * sqrt(-2.0 * HSMath.log_(u)) * HSMath.cos_(HSMath.TWO_PI * v)

func pick(arr: Array) -> Variant:
	return arr[int(floorf(next() * arr.size()))]

# weight_fn：項目 → 重み
func weighted(items: Array, weight_fn: Callable) -> Variant:
	var total := 0.0
	var ws: Array[float] = []
	for it in items:
		var w := maxf(0.0, float(weight_fn.call(it))); total += w; ws.append(w)
	if total <= 0.0: return items[int(floorf(next() * items.size()))]
	var r := next() * total
	for i in items.size():
		r -= ws[i]
		if r <= 0.0: return items[i]
	return items[items.size() - 1]

# weighted と同じ選び方で、重み（0 以上にしたもの）と合計を先に出しておく形
func weighted_pre(items: Array, ws: PackedFloat64Array, total: float) -> Variant:
	if total <= 0.0: return items[int(floorf(next() * items.size()))]
	var r := next() * total
	for i in items.size():
		r -= ws[i]
		if r <= 0.0: return items[i]
	return items[items.size() - 1]

func shuffle(arr: Array) -> Array:
	var i := arr.size() - 1
	while i > 0:
		var j := int(floorf(next() * (i + 1)))
		var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
		i -= 1
	return arr

func fork() -> HSRng:
	return HSRng.new(floorf(next() * 4294967296.0))
