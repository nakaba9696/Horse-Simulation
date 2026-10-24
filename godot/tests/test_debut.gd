# 毎年デビューする史実馬の選び方（持ち主の決定 2026-10-24。tests/extra_debut.js と同じことを確かめる）
#   隠し馬（data/trophy_horses.js の馬）は基本プールにいない：毎年のデビュー・始めの世界・店の品ぞろえに出ず、トロフィーのリーチで出てくる道だけ
#   デビューは総合力の帯（70.0以上・65.0〜69.5・60.0〜64.5・59.5以下）ごとに 5・20・35・40％。足りない帯は隣の帯から埋める
# JS と同じ種で同じ世界になるかは一致テスト（test_world.gd）
extends RefCounted

func _new_game(seed: float) -> Dictionary:
	HSWorld.new_game({ seed = seed, mode = "jockey", jockeyName = "テスト騎手", region = "美浦" })
	return HSWorld.G

func _live() -> Array:
	return HSWorld.all().filter(func(h): return h.get("loc") == "stable" or h.get("loc") == "farm")

func _tiers(ds: Array) -> String:
	var c := [0, 0, 0, 0]
	for d in ds: c[HSEraless.tier_of(d)] += 1
	return ",".join(c.map(func(x): return str(x)))

func _hidden_names() -> Dictionary:
	var s := {}
	for xs in HSData.d().get("trophyHorses", {}).values():
		for x in xs: s[x.name] = true
	return s

# 毎年の初めのデビュー（週を進めずに年だけ進める）で新しく出た馬
func _crop_fresh() -> Array:
	var before := {}
	for h in _live(): before[h.name] = true
	HSWorld.G.year += 1.0
	HSEraless.crop()
	return _live().filter(func(h): return not before.has(h.name)).map(func(h): return HSWorld.histByName[h.name])

func run(t) -> void:
	var t0 := Time.get_ticks_msec()
	# ---- 隠し馬は基本プールにいない ----
	var hid := _hidden_names()
	t.ok(hid.size() > 50, "debut: 隠し馬の数 %d" % hid.size())
	t.ok(not HSEraless.pool().any(func(d): return hid.has(d.name)), "debut: 基本プールに隠し馬がいる")
	var modern: Array = HSData.d().historic.filter(func(d): return HSEraless.is_pool(d) and HSEraless.is_hidden(d)).map(func(d): return d.name)
	t.ok(modern.size() >= 6 and modern.has("ロマンチックウォリアー") and modern.has("サイレントウィットネス"), "debut: 外した1989年からの隠し馬 %s" % [modern])
	for seed in [3.0, 68.0, 101.0]:
		var G := _new_game(seed)
		t.eq(_live().filter(func(h): return HSEraless.is_hidden(h)).size(), 0, "debut: 種 %d の始めの世界に隠し馬" % seed)
		t.ok(not HSEraless.pick(100000, HSRng.new(seed)).any(func(d): return HSEraless.is_hidden(d)), "debut: 毎年のデビューに隠し馬が選ばれる")
		for m in [1.0, 6.0]:
			G.month = m
			HSEraless.restock(true)
			t.ok(not G.shopStock.names.any(func(n): return hid.has(n)), "debut: %d月の店に隠し馬が並ぶ" % m)

	# ---- 帯ごとの割合 ----
	t.eq(HSEraless.TIERS.map(func(x): return x.min), [70.0, 65.0, 60.0, 0.0], "debut: 帯の境")
	t.eq(HSEraless.TIERS.map(func(x): return x.pct), [5, 20, 35, 40], "debut: 帯の割合")
	t.eq(HSEraless.tier_counts(300), [15, 60, 105, 120], "debut: 300頭の割り方")
	var c7: Array = HSEraless.tier_counts(7)
	t.eq(c7[0] + c7[1] + c7[2] + c7[3], 7, "debut: 端数もいちばん下の帯で合う")
	var bad := []
	for d in HSEraless.pool():
		var f := HSSeason.fh_show_peak(HSHorse.from_historic(d, "x"))
		var v: float = maxf(f.turf, f.dirt)
		var want := 0 if v >= 70.0 else 1 if v >= 65.0 else 2 if v >= 60.0 else 3
		if HSEraless.tier_of(d) != want: bad.append("%s%s" % [d.name, v])
	t.eq(bad.slice(0, 5), [], "debut: 帯が総合力と合わない")
	var G := _new_game(11.0)
	var by_age := {}
	for h in _live():
		var a: float = G.year - h.born
		if not by_age.has(a): by_age[a] = []
		by_age[a].append(HSWorld.histByName[h.name])
	for a in HSEraless.AGES: t.eq(_tiers(by_age.get(a, [])), "15,60,105,120", "debut: 始めの世界の%d歳" % a)
	for y in 3:
		var fresh := _crop_fresh()
		t.eq(_tiers(fresh), "15,60,105,120", "debut: %d年のデビュー" % G.year)
		t.ok(not fresh.any(func(d): return HSEraless.is_hidden(d)), "debut: %d年のデビューに隠し馬" % G.year)

	# ---- 足りない帯は隣の帯から ----
	var mk := func(ns: Array) -> Array:
		var free: Array = []
		for i in ns.size():
			var L: Array = []
			for k in ns[i]: L.append({ name = "t%d-%d" % [i, k], t = i })
			free.append(L)
		return free
	var cnt := func(ns: Array, n: int) -> String:
		var c := [0, 0, 0, 0]
		for x in HSEraless.pick_tiers(mk.call(ns), n, HSRng.new(1.0)): c[x.t] += 1
		return ",".join(c.map(func(x): return str(x)))
	t.eq(cnt.call([500, 500, 500, 500], 300), "15,60,105,120", "debut: 足りるときの割合")
	t.eq(cnt.call([5, 100, 200, 300], 300), "5,70,105,120", "debut: いちばん上が足りない")
	t.eq(cnt.call([5, 62, 200, 300], 300), "5,62,113,120", "debut: 上の2つが足りない")
	t.eq(cnt.call([50, 100, 200, 30], 300), "15,60,195,30", "debut: いちばん下が足りない")
	t.eq(cnt.call([20, 70, 110, 10], 300), "20,70,110,10", "debut: 全部足りない")
	var names := func(seed: float) -> String: return ",".join(HSEraless.pick_tiers(mk.call([30, 80, 150, 200]), 100, HSRng.new(seed)).map(func(x): return x.name))
	t.eq(names.call(7.0), names.call(7.0), "debut: 同じ種で同じ馬")
	t.ok(names.call(7.0) != names.call(8.0), "debut: 種を変えると違う馬")

	# ---- 隠し馬はトロフィーのリーチで出てくる ----
	G = _new_game(69.0)
	var cal := {}
	for r in HSRaces.graded_year(G.year):
		if not cal.has(r.short): cal[r.short] = r
	var h: Dictionary = _live().filter(func(x): return x.get("hist") and x.loc == "stable" and x.get("sex") != "牝")[0]
	h.owner = "P"; h.auto = false; h.results = []
	h.gradedWins = []
	for n in ["スチュワーズC", "香港ゴールドカップ"]:
		var r: Dictionary = cal[n]
		h.gradedWins.append({ y = G.year, race = r.name, short = r.short, grade = r.grade, region = r.region })
	var race: Dictionary = cal["チャンピオンズ＆チャターC"].duplicate()
	race.year = G.year
	var rw := "ロマンチックウォリアー"
	var appear := func() -> Array: return HSSpecial.pending(h, race).map(func(x): return x.d.name)
	t.ok(appear.call().has(rw), "debut: 香港三冠のリーチで隠し馬が出てこない（%s）" % [appear.call()])

	# ---- 前のセーブ：1989年からの隠し馬がもうデビューしている ----
	var live = HSEraless.spawn(HSSpecial.data(rw), 4.0, true)
	t.ok(live != null and HSEraless.active_names().has(rw), "debut: 前のセーブの形を作れない")
	var s := HSWorld.serialize()
	HSWorld.load_save(s)
	t.eq(HSWorld.serialize(), s, "debut: 前のセーブの往復で変わる")
	t.ok(not appear.call().has(rw) and appear.call().size() > 0, "debut: 走っている隠し馬が出てくる（%s）" % [appear.call()])
	var fresh := _crop_fresh()
	t.eq(_tiers(fresh), "15,60,105,120", "debut: 前のセーブの次の年のデビュー")
	t.ok(not fresh.any(func(d): return HSEraless.is_hidden(d)), "debut: 前のセーブの次の年に隠し馬")
	for x in HSWorld.all():
		if x.name == rw and x.get("loc") != "retired": x.loc = "retired"
	t.ok(appear.call().has(rw), "debut: 引退したあとも隠し馬で出てこない")
	t.ok(not HSEraless.pick(100000, HSRng.new(3.0)).any(func(d): return d.name == rw), "debut: 引退した隠し馬がデビューに選ばれる")
	print("    debut: プール %s 頭・%d ミリ秒" % [_tiers(HSEraless.pool()), Time.get_ticks_msec() - t0])
