# 数学の関数（V8 の Math）・乱数（U.RNG）・U.hash が JS と同じ値か（godot/tests/golden/math.json。tools/golden_race.js が作る）
extends RefCounted

func run(t) -> void:
	var g: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://tests/golden/math.json"))
	var M := HSMath
	var h := func(s): return M.from_hex(s)
	var bad := {}
	for k in ["cos", "sin", "log", "exp", "cbrt", "pow", "hypot", "round", "fixed"]:
		var n := 0
		for e in g[k]:
			var ok := true
			match k:
				"cos": ok = M.hex(M.cos_(h.call(e[0]))) == e[1]
				"sin": ok = M.hex(M.sin_(h.call(e[0]))) == e[1]
				"log": ok = M.hex(M.log_(h.call(e[0]))) == e[1]
				"exp": ok = M.hex(M.exp_(h.call(e[0]))) == e[1]
				"cbrt": ok = M.hex(M.cbrt(h.call(e[0]))) == e[1]
				"pow": ok = M.hex(M.pow_(h.call(e[0]), h.call(e[1]))) == e[2]
				"hypot": ok = M.hex(M.hypot(h.call(e[0]), h.call(e[1]))) == e[2]
				"round": ok = M.hex(M.round_js(h.call(e[0]))) == e[1]
				"fixed":
					var v: float = h.call(e[0])
					ok = M.to_fixed(v, 0) == e[1] and M.to_fixed(v, 1) == e[2] and M.to_fixed(v, 2) == e[3]
			if not ok: n += 1
		t.eq(n, 0, "math: %s が JS と違う数（%d 件のうち）" % [k, g[k].size()])
	t.eq([M.hex(PI), M.hex(M.TWO_PI), M.hex(PI / 2.0)], g.consts, "math: π の値")
	for e in g.rng:
		var r := HSRng.new(e[0])
		var seq: Array = []
		for i in 40: seq.append(M.hex(r.next()))
		seq.append(M.hex(r.normal(0.0, 1.9))); seq.append(str(r.int_(1, 1e9))); seq.append(M.hex(r.float_(0.5, 1.4))); seq.append(str(r.chance(0.3)))
		var f := r.fork(); seq.append(M.hex(f.next()))
		t.eq(seq, e[1], "rng: 種 %s の列" % e[0])
	for e in g.sort:
		var r := HSRng.new(e[0]); var n := int(e[1]); var kind: String = e[2]
		var arr: Array = []
		for i in n: arr.append({ i = float(i), k = float(r.int_(0, 9)) if kind == "t" else (float(n - i + (i % 3)) if kind == "d" else float(r.int_(0, 1000))) })
		var calls := [0]
		HSSort.sort(arr, func(a, b):
			calls[0] += 1
			return r.next() - 0.5 if (kind == "r" and r.next() < 0.2) else a.k - b.k)
		var ids: Array = []
		for x in arr: ids.append(x.i)
		t.eq([calls[0], ids], [int(e[3]), e[4]], "sort: %d 件（%s）の並べ替えと比べた回数" % [n, kind])
	for e in g.hash:
		t.eq(HSU.hash32(e[0]), int(e[1]), "hash: %s" % e[0])
