# 世界の進行が JS と同じか（godot/tests/golden/world.json。tools/golden_world.js が作る）。
# 決まった遊び方で週を進め、毎週のセーブ（G）の指紋を比べる。JS のセーブ（world_save.json）を読んで続きを遊ぶのも確かめる
extends RefCounted

func run(t) -> void:
	var g: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://tests/golden/world.json"))
	var t0 := Time.get_ticks_msec()
	HSWorld.new_game({ seed = g.new.seed, mode = "jockey", jockeyName = "テスト騎手", region = "美浦" })
	t.eq(HSData.digest_save(HSJson.parse(HSWorld.serialize())), g.new.start, "world: 新しいゲームの状態")
	_play(t, "new", g.new.weeks)
	var t1 := Time.get_ticks_msec()
	var save := FileAccess.get_file_as_string("res://tests/golden/world_save.json")
	HSWorld.load_save(save)
	t.eq(HSData.digest_save(HSJson.parse(HSWorld.serialize())), g.late.start, "world: JS のセーブを読んだ状態")
	_play(t, "late", g.late.weeks)
	# 前の年の GF の勝ち馬：12月1週の招待・GF に伝説級の名馬
	HSWorld.load_save(FileAccess.get_file_as_string("res://tests/golden/world_gf.json"))
	t.eq(HSData.digest_save(HSJson.parse(HSWorld.serialize())), g.gf.start, "world: GF の場面のセーブを読んだ状態")
	_play(t, "gf", g.gf.weeks)
	var t2 := Time.get_ticks_msec()
	# 手を加えたセーブ：予約・スペシャルホースの出るレース・引退と殿堂入り・オリジナルホース
	HSWorld.load_save(FileAccess.get_file_as_string("res://tests/golden/world_craft.json"))
	t.eq(HSData.digest_save(HSJson.parse(HSWorld.serialize())), g.craft.start, "world: 手を加えたセーブを読んだ状態")
	_play(t, "craft", g.craft.weeks)
	print("    world: 新しいゲーム %d 週 %.1f 秒・セーブから %d 週 %.1f 秒・手を加えたセーブから %d 週 %.1f 秒" % [g.new.weeks.size(), (t1 - t0) / 1000.0, g.late.weeks.size(), (t2 - t1) / 1000.0, g.craft.weeks.size(), (Time.get_ticks_msec() - t2) / 1000.0])

func _ops(ops: Array) -> Array:
	var out: Array = []
	for op in ops:
		match op[0]:
			"reserve":
				var r = null
				for x in HSWorld.upcoming_graded(52):
					if x.name == op[2]: r = x; break
				out.append(HSSeason.reserve(op[1], r) if r else "no race")
			"retire":
				var r := HSJockey.retire(op[1])
				out.append(r.err if r.has("err") else r.to)
			"win":
				var h = HSWorld.horse(op[1]); var G = HSWorld.G
				var race := { name = op[3], short = op[2], grade = op[4], region = "JRA", year = G.year }
				h.gradedWins.append({ y = G.year, race = race.name, short = race.short, grade = race.grade, region = race.region })
				out.append(",".join(HSSeason.on_win(h, race, G.year)))
			"pts": out.append(HSOwners.add_pts(op[1], op[2]))
			"make":
				var r := HSOriginal.make(op[1], op[2], op[3])
				out.append(r.err if r.has("err") else "%s:%s" % [r.horse.name, ",".join(r.skills)])
			_: out.append("unknown")
	return out

func _play(t, name: String, weeks: Array) -> void:
	for want in weeks:
		var G = HSWorld.G
		var step := {}
		if want.has("ops"):
			step.ops = want.ops; step.opsRet = _ops(want.ops)
		if HSWorld.mine().size() < 3:
			var items: Array = HSU.stable_sort(HSWorld.market_historic(), func(a, b): return a.price < b.price)
			for it in items:
				if it.price <= G.player.money:
					step.buy = it.horse.name; step.buyErr = HSWorld.buy(it); break
		var cs := HSWorld.cards()
		step.cards = HSData.digest_save(cs.map(func(c): return [c.race.key, c.runners.map(func(x): return [x.horse.name, x.jockey.name if x.get("jockey") else null, x.odds, x.num])]))
		step.cardKeys = cs.map(func(c): return "%s:%d" % [c.race.key, c.runners.size()])
		var offers := HSOwners.offers()
		step.offers = offers.map(func(o): return o.raceKey + "/" + o.horse)
		if offers.size(): step.accept = HSOwners.accept(offers[0].raceKey, offers[0].horseId)
		for cat in HSSeason.dc_pending_list():
			var e := HSSeason.dc_eligible(cat)
			step["gf:" + cat] = HSSeason.dc_choose(cat, e[0].h.id) if e.size() else HSSeason.dc_decline(cat)
		var played := {}
		var rides := HSJockey.my_rides()
		step.rides = rides.map(func(x): return x.card.race.key)
		if rides.size():
			var card: Dictionary = rides[0].card
			var sim := HSWorld.start_sim(card, { ride = true })
			var nxt := 0.0
			while true:
				var s = sim.st[sim.me]; var R: float = sim.D - s.x
				if not sim.ctl.started: HSSim.ctl_up(sim)
				else:
					if R < sim.straight + 350 and sim.ctl.gear < 1 and sim.t >= nxt:
						HSSim.ctl_up(sim); nxt = sim.t + 0.2
					if R < 250 and sim.t >= nxt + 0.3:
						HSSim.ctl_whip(sim, "R"); nxt = sim.t + 0.3
					if sim.ctl.blockedNow and sim.ctl.lane < 4: HSSim.ctl_lane(sim, 1)
				if HSSim.step(sim): break
			played[card.race.key] = HSSim.finish(sim)
			step.ride = played[card.race.key].results.map(func(x): return x.horse.name).slice(0, 3)
		var rep := HSWorld.finish_week(played)
		step.races = rep.races.size()
		step.date = rep.date
		step.g = HSData.digest_save(HSJson.parse(HSWorld.serialize()))
		var ok := true
		for k in want:
			var a = step.get(k); var b = want[k]
			if typeof(a) in [TYPE_INT, TYPE_FLOAT] and typeof(b) in [TYPE_INT, TYPE_FLOAT]:
				if float(a) != float(b): ok = false
			elif str(a) != str(b): ok = false
			if not ok:
				t.eq(a, b, "world %s %s: %s" % [name, want.date, k]); break
		if ok: t.ok(true, "")
		else: return
