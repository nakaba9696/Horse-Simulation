# 馬場の状態（HSSim.GROUND・mud_s・ground_drop・ground_fx。docs/BALANCE.md「14. 馬場の状態」）
# 持ち主の決定 2026-10-20「道悪のパラメータ　高いほど重馬場でスピードが減りにくい…スタミナの減り、切れは道悪関係なく全馬共通で」
# JS と同じ結果かは test_race.gd（golden の稍重・重・不良のレース）で確かめる。ここは効き方の形と、C++ と GDScript の強さの一致
extends RefCounted

static func _race(ground: String, surface: String = "芝", dist: float = 2000.0) -> Dictionary:
	return { course = "東京", surface = surface, dist = dist, ground = ground, year = 2004, month = 5 }
static func _horse(heavy: float, kire: float = 4.0) -> Dictionary:
	return { apt = { heavy = heavy }, kire = kire }

func run(t) -> void:
	# 良では何も変わらない
	for a in [20.0, 66.0, 95.0]:
		var g0 := HSSim.ground_fx(_horse(a), _race("良"))
		t.ok(g0.e == 1.0 and g0.k == 1.0 and HSSim.ground_drop(_horse(a), _race("良")) == 0.0, "ground: 良で効いた（道悪 %d）" % a)
	# スタミナの減り・切れは道悪の適性で変わらない（全馬共通）
	for sf in ["芝", "ダ"]:
		for g in ["稍重", "重", "不良"]:
			for kire in [2.0, 4.0, 7.0]:
				var f0 := HSSim.ground_fx(_horse(25.0, kire), _race(g, sf))
				var same := true
				for a in [35.0, 66.0, 90.0, 100.0]:
					var f := HSSim.ground_fx(_horse(a, kire), _race(g, sf))
					if f.e != f0.e or f.k != f0.k: same = false
				t.ok(same, "ground: %s・%s・切れ%d で道悪の適性がスタミナ・切れに効いた" % [sf, g, kire])
			# スピードの下がり：35 ＞ 66 ＞ 90 ≧ 0、得意はほとんど下がらない
			var d35 := HSSim.ground_drop(_horse(35.0), _race(g, sf))
			var d66 := HSSim.ground_drop(_horse(66.0), _race(g, sf))
			var d90 := HSSim.ground_drop(_horse(90.0), _race(g, sf))
			t.ok(d35 > d66 and d66 > d90 and d90 >= 0.0 and d90 < d66 * 0.2 and d35 > d66 * 2.0, "ground: %s・%s の下がり 35 %.2f・66 %.2f・90 %.2f" % [sf, g, d35, d66, d90])
	# 大きさ（JS の S.GROUND と同じ数）
	t.eq(HSSim.mud_s(66.0), 1.0, "ground: ふつうの下がりやすさ")
	t.ok(absf(HSSim.mud_s(90.0) - (1.0 - 24.0 / 27.0)) < 1e-12 and absf(HSSim.mud_s(35.0) - (1.0 + 31.0 / 22.0)) < 1e-12, "ground: 90・35 の下がりやすさ")
	t.eq(HSSim.mud_label(44.0) + HSSim.mud_label(45.0) + HSSim.mud_label(75.0), "苦手ふつう得意", "ground: 印の境目")
	var mid := HSSim.ground_fx(_horse(66.0), _race("不良"))
	t.ok(mid.e > 1.02 and mid.e < 1.045 and mid.k > 0.94 and mid.k < 0.97, "ground: 不良・芝2000 のスタミナ ×%.3f・切れ ×%.3f" % [mid.e, mid.k])

	# 強さ（power）：良では道悪の適性で変わらず、不良では 35 ＜ 66 ＜ 90。C++ と GDScript が同じ
	var base := HSHorse.make_filler(HSRng.new(3), { level = 80, surface = "芝", dist = 2000, born = 2000 })
	var pw := func(a: float, g: String, k: String) -> float:
		var h: Dictionary = base.duplicate(true); h.apt.heavy = a
		var keep := HSSim.backend
		HSSim.backend = k
		var v: float = HSSim.power(h, _race(g), null, {}).total
		HSSim.backend = keep
		return v
	t.eq(pw.call(35.0, "良", "gd"), pw.call(90.0, "良", "gd"), "ground: 良で道悪の適性が強さに効いた")
	t.ok(pw.call(35.0, "不良", "gd") < pw.call(66.0, "不良", "gd") and pw.call(66.0, "不良", "gd") < pw.call(90.0, "不良", "gd"), "ground: 不良の強さの順")
	if HSSim.native_ok():
		for a in [35.0, 66.0, 90.0]:
			for g in ["良", "稍重", "重", "不良"]:
				t.eq(pw.call(a, g, "native"), pw.call(a, g, "gd"), "ground: C++ と GDScript の強さ（道悪 %d・%s）" % [a, g])

	# 走破タイム：全馬の道悪の適性をそろえたレース（不良・芝2000）。良は同じ・不良は 35・66・90 の順に遅い
	var n := 24 if HSSim.native_ok() else 10
	var tm := {}
	for a in [35.0, 66.0, 90.0]:
		for g in ["良", "不良"]:
			var rng := HSRng.new(61)
			var sum := 0.0
			for i in n:
				var field := []
				for j in 14:
					var h := HSHorse.make_filler(rng, { level = 82, surface = "芝", dist = 2000, born = 2000 })
					h.name = "h%d" % j; h.apt.heavy = a
					field.append({ horse = h, jockey = { skill = 75 }, weight = 57, num = j + 1, frame = 1 })
				var res := HSSim.run(_race(g), field, HSHorse.week_index(2004, 5, 1), HSRng.new(rng.int_(1, 1e9)), {})
				sum += float(res.results[0].time)
			tm["%d%s" % [a, g]] = sum / n
	t.ok(tm["35良"] == tm["66良"] and tm["66良"] == tm["90良"], "ground: 良で道悪の適性が走破タイムに効いた")
	t.ok(tm["35不良"] > tm["66不良"] and tm["66不良"] > tm["90不良"], "ground: 不良の走破タイムの順 35 %.2f・66 %.2f・90 %.2f" % [tm["35不良"], tm["66不良"], tm["90不良"]])
	var slow: float = tm["66不良"] - tm["66良"]
	t.ok(slow > 1.5 and slow < 3.5, "ground: ふつうの馬の不良と良の差 %.2f秒" % slow)
