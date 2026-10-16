# JS（V8）の Array.prototype.sort と同じ並べ替え（TimSort。V8 の third_party/v8/builtins/array-sort.tq を移した）。
# 比べる関数が乱数を引く・同じ値を返すときも、比べる回数と順が JS と同じになる（結果も同じ）。
#   HSSort.sort(arr, func(a, b): return a.x - b.x)   # arr をその場で並べ替える。比べる関数は数を返す（負なら a が先）
# Copyright 2016 the V8 project authors. BSD-style license.
class_name HSSort

const MIN_GALLOP := 7

var a: Array
var cmp: Callable
var min_gallop := MIN_GALLOP
var runs: Array[int] = [] # [base, length, base, length, …]
var tmp: Array = []

static func sort(arr: Array, compare: Callable) -> Array:
	if arr.size() < 2: return arr
	var s := HSSort.new()
	s.a = arr; s.cmp = compare
	s._timsort(arr.size())
	return arr

func _c(x, y) -> float:
	var v := float(cmp.call(x, y))
	return 0.0 if is_nan(v) else v

func _timsort(length: int) -> void:
	var remaining := length
	var low := 0
	var min_run := _min_run(remaining)
	while remaining != 0:
		var cur := _count_and_make_run(low, low + remaining)
		if cur < min_run:
			var forced := mini(min_run, remaining)
			_binary_insertion(low, low + cur, low + forced)
			cur = forced
		runs.append(low); runs.append(cur)
		_merge_collapse()
		low += cur
		remaining -= cur
	_merge_force_collapse()

static func _min_run(n: int) -> int:
	var r := 0
	while n >= 64:
		r |= n & 1
		n >>= 1
	return n + r

func _binary_insertion(low: int, start_arg: int, high: int) -> void:
	var start := start_arg + 1 if low == start_arg else start_arg
	while start < high:
		var left := low; var right := start
		var pivot = a[right]
		while left < right:
			var mid := left + ((right - left) >> 1)
			if _c(pivot, a[mid]) < 0: right = mid
			else: left = mid + 1
		var p := start
		while p > left:
			a[p] = a[p - 1]; p -= 1
		a[left] = pivot
		start += 1

func _count_and_make_run(low_arg: int, high: int) -> int:
	var low := low_arg + 1
	if low == high: return 1
	var run_len := 2
	var el = a[low]; var prev_el = a[low - 1]
	var order := _c(el, prev_el)
	var desc := order < 0
	var previous = el
	var idx := low + 1
	while idx < high:
		var current = a[idx]
		order = _c(current, previous)
		if desc:
			if order >= 0: break
		else:
			if order < 0: break
		previous = current
		run_len += 1
		idx += 1
	if desc:
		var lo := low_arg; var hi := low_arg + run_len - 1
		while lo < hi:
			var t = a[lo]; a[lo] = a[hi]; a[hi] = t
			lo += 1; hi -= 1
	return run_len

func _rb(i: int) -> int: return runs[i * 2]
func _rl(i: int) -> int: return runs[i * 2 + 1]
func _n() -> int: return runs.size() / 2

func _invariant(n: int) -> bool:
	if n < 2: return true
	return _rl(n - 2) > _rl(n - 1) + _rl(n)

func _merge_collapse() -> void:
	while _n() > 1:
		var n := _n() - 2
		if not _invariant(n + 1) or not _invariant(n):
			if _rl(n - 1) < _rl(n + 1): n -= 1
			_merge_at(n)
		elif _rl(n) <= _rl(n + 1):
			_merge_at(n)
		else:
			break

func _merge_force_collapse() -> void:
	while _n() > 1:
		var n := _n() - 2
		if n > 0 and _rl(n - 1) < _rl(n + 1): n -= 1
		_merge_at(n)

func _merge_at(i: int) -> void:
	var stack := _n()
	var baseA := _rb(i); var lengthA := _rl(i)
	var baseB := _rb(i + 1); var lengthB := _rl(i + 1)
	runs[i * 2 + 1] = lengthA + lengthB
	if i == stack - 3:
		runs[(i + 1) * 2] = _rb(i + 2); runs[(i + 1) * 2 + 1] = _rl(i + 2)
	runs.resize((stack - 1) * 2)
	var k := _gallop_right(a, a[baseB], baseA, lengthA, 0)
	baseA += k
	lengthA -= k
	if lengthA == 0: return
	lengthB = _gallop_left(a, a[baseA + lengthA - 1], baseB, lengthB, lengthB - 1)
	if lengthB == 0: return
	if lengthA <= lengthB: _merge_low(baseA, lengthA, baseB, lengthB)
	else: _merge_high(baseA, lengthA, baseB, lengthB)

func _gallop_left(arr: Array, key, base: int, length: int, hint: int) -> int:
	var last_ofs := 0; var offset := 1
	var order := _c(arr[base + hint], key)
	if order < 0:
		var max_ofs := length - hint
		while offset < max_ofs:
			order = _c(arr[base + hint + offset], key)
			if order >= 0: break
			last_ofs = offset
			offset = (offset << 1) + 1
			if offset <= 0: offset = max_ofs
		if offset > max_ofs: offset = max_ofs
		last_ofs += hint
		offset += hint
	else:
		var max_ofs := hint + 1
		while offset < max_ofs:
			order = _c(arr[base + hint - offset], key)
			if order < 0: break
			last_ofs = offset
			offset = (offset << 1) + 1
			if offset <= 0: offset = max_ofs
		if offset > max_ofs: offset = max_ofs
		var t := last_ofs
		last_ofs = hint - offset
		offset = hint - t
	last_ofs += 1
	while last_ofs < offset:
		var m := last_ofs + ((offset - last_ofs) >> 1)
		order = _c(arr[base + m], key)
		if order < 0: last_ofs = m + 1
		else: offset = m
	return offset

func _gallop_right(arr: Array, key, base: int, length: int, hint: int) -> int:
	var last_ofs := 0; var offset := 1
	var order := _c(key, arr[base + hint])
	if order < 0:
		var max_ofs := hint + 1
		while offset < max_ofs:
			order = _c(key, arr[base + hint - offset])
			if order >= 0: break
			last_ofs = offset
			offset = (offset << 1) + 1
			if offset <= 0: offset = max_ofs
		if offset > max_ofs: offset = max_ofs
		var t := last_ofs
		last_ofs = hint - offset
		offset = hint - t
	else:
		var max_ofs := length - hint
		while offset < max_ofs:
			order = _c(key, arr[base + hint + offset])
			if order < 0: break
			last_ofs = offset
			offset = (offset << 1) + 1
			if offset <= 0: offset = max_ofs
		if offset > max_ofs: offset = max_ofs
		last_ofs += hint
		offset += hint
	last_ofs += 1
	while last_ofs < offset:
		var m := last_ofs + ((offset - last_ofs) >> 1)
		order = _c(key, arr[base + m])
		if order < 0: offset = m
		else: last_ofs = m + 1
	return offset

static func _copy(src: Array, sp: int, dst: Array, dp: int, n: int) -> void:
	if sp < dp:
		var si := sp + n - 1; var di := dp + n - 1
		while si >= sp:
			dst[di] = src[si]; di -= 1; si -= 1
	else:
		var si := sp; var di := dp; var to := sp + n
		while si < to:
			dst[di] = src[si]; di += 1; si += 1

func _temp(n: int) -> Array:
	if tmp.size() < maxi(32, n): tmp.resize(maxi(32, n))
	return tmp

func _merge_low(baseA: int, lengthA: int, baseB: int, lengthB: int) -> void:
	var t := _temp(lengthA)
	_copy(a, baseA, t, 0, lengthA)
	var dest := baseA; var ct := 0; var cb := baseB
	a[dest] = a[cb]; dest += 1; cb += 1
	lengthB -= 1
	var outcome := 0 # 0 続ける・1 Succeed・2 CopyB
	if lengthB == 0: outcome = 1
	elif lengthA == 1: outcome = 2
	var mg := min_gallop
	while outcome == 0:
		var winsA := 0; var winsB := 0
		while true:
			if _c(a[cb], t[ct]) < 0:
				a[dest] = a[cb]; dest += 1; cb += 1
				winsB += 1; lengthB -= 1; winsA = 0
				if lengthB == 0: outcome = 1; break
				if winsB >= mg: break
			else:
				a[dest] = t[ct]; dest += 1; ct += 1
				winsA += 1; lengthA -= 1; winsB = 0
				if lengthA == 1: outcome = 2; break
				if winsA >= mg: break
		if outcome != 0: break
		mg += 1
		var first := true
		while winsA >= MIN_GALLOP or winsB >= MIN_GALLOP or first:
			first = false
			mg = maxi(1, mg - 1)
			min_gallop = mg
			winsA = _gallop_right(t, a[cb], ct, lengthA, 0)
			if winsA > 0:
				_copy(t, ct, a, dest, winsA)
				dest += winsA; ct += winsA; lengthA -= winsA
				if lengthA == 1: outcome = 2; break
				if lengthA == 0: outcome = 1; break
			a[dest] = a[cb]; dest += 1; cb += 1
			lengthB -= 1
			if lengthB == 0: outcome = 1; break
			winsB = _gallop_left(a, t[ct], cb, lengthB, 0)
			if winsB > 0:
				_copy(a, cb, a, dest, winsB)
				dest += winsB; cb += winsB; lengthB -= winsB
				if lengthB == 0: outcome = 1; break
			a[dest] = t[ct]; dest += 1; ct += 1
			lengthA -= 1
			if lengthA == 1: outcome = 2; break
		if outcome != 0: break
		mg += 1
		min_gallop = mg
	if outcome == 1:
		if lengthA > 0: _copy(t, ct, a, dest, lengthA)
	else:
		_copy(a, cb, a, dest, lengthB)
		a[dest + lengthB] = t[ct]

func _merge_high(baseA: int, lengthA: int, baseB: int, lengthB: int) -> void:
	var t := _temp(lengthB)
	_copy(a, baseB, t, 0, lengthB)
	var dest := baseB + lengthB - 1; var ct := lengthB - 1; var ca := baseA + lengthA - 1
	a[dest] = a[ca]; dest -= 1; ca -= 1
	lengthA -= 1
	var outcome := 0 # 0 続ける・1 Succeed・2 CopyA
	if lengthA == 0: outcome = 1
	elif lengthB == 1: outcome = 2
	var mg := min_gallop
	while outcome == 0:
		var winsA := 0; var winsB := 0
		while true:
			if _c(t[ct], a[ca]) < 0:
				a[dest] = a[ca]; dest -= 1; ca -= 1
				winsA += 1; lengthA -= 1; winsB = 0
				if lengthA == 0: outcome = 1; break
				if winsA >= mg: break
			else:
				a[dest] = t[ct]; dest -= 1; ct -= 1
				winsB += 1; lengthB -= 1; winsA = 0
				if lengthB == 1: outcome = 2; break
				if winsB >= mg: break
		if outcome != 0: break
		mg += 1
		var first := true
		while winsA >= MIN_GALLOP or winsB >= MIN_GALLOP or first:
			first = false
			mg = maxi(1, mg - 1)
			min_gallop = mg
			var k := _gallop_right(a, t[ct], baseA, lengthA, lengthA - 1)
			winsA = lengthA - k
			if winsA > 0:
				dest -= winsA; ca -= winsA
				_copy(a, ca + 1, a, dest + 1, winsA)
				lengthA -= winsA
				if lengthA == 0: outcome = 1; break
			a[dest] = t[ct]; dest -= 1; ct -= 1
			lengthB -= 1
			if lengthB == 1: outcome = 2; break
			k = _gallop_left(t, a[ca], 0, lengthB, lengthB - 1)
			winsB = lengthB - k
			if winsB > 0:
				dest -= winsB; ct -= winsB
				_copy(t, ct + 1, a, dest + 1, winsB)
				lengthB -= winsB
				if lengthB == 1: outcome = 2; break
				if lengthB == 0: outcome = 1; break
			a[dest] = a[ca]; dest -= 1; ca -= 1
			lengthA -= 1
			if lengthA == 0: outcome = 1; break
		if outcome != 0: break
		mg += 1
		min_gallop = mg
	if outcome == 1:
		if lengthB > 0: _copy(t, 0, a, dest - (lengthB - 1), lengthB)
	else:
		dest -= lengthA; ca -= lengthA
		_copy(a, ca + 1, a, dest + 1, lengthA)
		a[dest] = t[ct]
