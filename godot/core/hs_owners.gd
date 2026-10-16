# 馬主と騎乗依頼（js/core/owners.js の HS.Owners と同じ）：AI の馬の一部を架空の馬主が持ち、毎週「この馬でこのレースに」と依頼が来る。
# 好感度の段階・ご褒美・名コンビ賞。乱数は週と馬の名前から決まるもの（U.hashRng）だけで、世界の乱数は使わない。セーブは G.owners
class_name HSOwners

static func LIST() -> Array: return HSData.d().get("owners", [])
static func by(id: String) -> Variant:
	for o in LIST():
		if o.id == id: return o
	return null

const TIERS := [
	{ label = "顔見知り", pts = 0.0, maxClass = 0, maxFh = 60.0, maxStrength = 0.75 },
	{ label = "信頼", pts = 100.0, maxClass = 2, maxFh = 70.0, maxStrength = 0.9 },
	{ label = "主戦", pts = 260.0, maxClass = 3, maxFh = 78.0, maxStrength = 1.0 },
	{ label = "相棒", pts = 520.0, maxClass = 4, maxFh = 99.0, maxStrength = 1.0 },
]
const MAX := 800.0
const OWNED := 0.5
const OWNED_FILLER := 0.3
const FEE := [10.0, 30.0, 50.0, 100.0, 200.0]
const GIFT := 1000.0
const AWARD := 500.0
const AWARD_MIN := 3.0

static func on() -> bool: return HSJockey.is_mode()
static func _blank() -> Dictionary: return { pts = 0.0, tier = 0.0, met = false, rides = 0.0, wins = 0.0, big = 0.0, dec = 0.0, streak = 0.0, fees = 0.0, got = {}, years = {} }
static func init() -> Dictionary:
	var st := {}
	for o in LIST(): st[o.id] = _blank()
	return { st = st, week = null, log = [], queue = [], react = [], awards = {}, wear = {} }
static func fill(s: Variant) -> Dictionary:
	if not s: s = init()
	if not s.get("st"): s.st = {}
	for o in LIST():
		var b := _blank(); b.merge(HSU.or_(s.st.get(o.id), {}), true); s.st[o.id] = b
	for k in ["log", "queue", "react"]:
		if not s.get(k): s[k] = []
	if not s.get("awards"): s.awards = {}
	if not s.get("wear"): s.wear = {}
	if not s.has("week"): s.week = null
	return s
static func state() -> Dictionary:
	var g = HSWorld.G
	if not g.get("owners"): g.owners = init()
	return g.owners
static func of(id: String) -> Dictionary:
	var s := state()
	if not s.st.has(id): s.st[id] = _blank()
	return s.st[id]
static func tier_of(id: String) -> Dictionary: return TIERS[int(of(id).tier)]
static func next_tier(id: String) -> Variant: return TIERS[int(of(id).tier) + 1] if of(id).tier + 1 < TIERS.size() else null
static func _yen(v: float) -> float: return HSMath.round_js(v * HSU.price_index(HSWorld.G.year) / 10.0) * 10.0

# ---------- 好み ----------
static func _fit_h(k: String, h: Dictionary) -> float:
	match k:
		"sprint": return 1.0 if float(HSU.or_(h.get("distMax"), 2000.0)) <= 1600 else (0.5 if float(HSU.or_(h.get("distMin"), 1600.0)) <= 1400 else 0.0)
		"mile": return 1.0 if (float(HSU.or_(h.get("distMin"), 1600.0)) <= 1600 and float(HSU.or_(h.get("distMax"), 2000.0)) >= 1600) else 0.0
		"long": return 1.0 if float(HSU.or_(h.get("distMax"), 2000.0)) >= 2400 else 0.0
		"dirt": return 1.0 if (h.get("apt") and h.apt.dirt > h.apt.turf) else 0.0
		"turf": return 1.0 if (not h.get("apt") or h.apt.turf >= h.apt.dirt) else 0.0
		"filly": return 1.0 if h.get("sex") == "牝" else 0.0
		"front": return 1.0 if h.get("style") == "逃げ" else 0.0
		"closer": return 1.0 if (h.get("style") == "差し" or h.get("style") == "追込") else 0.0
		"foreign": return 1.0 if (h.get("foreign") or h.get("foreignTrained") or (h.get("country") and h.country != "日")) else 0.0
		"blood": return 1.0 if h.get("hist") else 0.0
		"local": return 1.0 if h.get("local") else 0.0
	return 0.0
const _FIT_H := ["sprint", "mile", "long", "dirt", "turf", "filly", "front", "closer", "foreign", "blood", "local"]
static func _fit_r(k: String, r: Dictionary) -> float:
	match k:
		"sprint": return 1.0 if r.dist <= 1400 else 0.0
		"mile": return 1.0 if (r.dist > 1400 and r.dist <= 1800) else 0.0
		"long": return 1.0 if r.dist >= 2400 else 0.0
		"dirt": return 1.0 if r.surface == "ダ" else 0.0
		"turf": return 1.0 if r.surface == "芝" else 0.0
		"filly": return 1.0 if r.get("sex") == "牝" else 0.0
		"overseas", "foreign": return 1.0 if r.get("region") == "海外" else 0.0
		"local": return 1.0 if r.get("region") == "地方" else 0.0
		"classic": return 1.0 if (r.get("age") == "3" and r.get("graded")) else 0.0
		"young": return 1.0 if r.get("age") == "2" else 0.0
		"veteran": return 1.0 if (r.get("age") == "3+" or r.get("age") == "4+") else 0.0
	return 0.0
static func fit_horse(o: Dictionary, h: Dictionary) -> float:
	if not o.likes.size(): return 0.0
	var s := 0.0
	for k in o.likes: s += _fit_h(k, h) if _FIT_H.has(k) else 0.0
	return s / o.likes.size()
static func fit_race(o: Dictionary, r: Dictionary) -> float:
	if not o.likes.size(): return 0.0
	var s := 0.0
	for k in o.likes: s += _fit_r(k, r)
	return s / o.likes.size()

# ---------- 馬主の馬（馬の名前と種から決まる） ----------
static var _own: Variant = null
static func owner_of(h: Variant) -> Variant:
	if not h or h.get("owner") == "P" or h.get("legend") or not LIST().size(): return null
	var g = HSWorld.G
	if not g: return null
	if _own == null or _own.seed != g.seed or _own.map.size() > 6000: _own = { seed = g.seed, map = {} }
	var key: String = h.name if h.get("name") else str(h.id)
	if _own.map.has(key): return _own.map[key]
	var r := HSU.hash_rng("owner:%s:%s" % [HSU.num(g.seed), key])
	var res = null
	if r.chance(OWNED_FILLER if h.get("filler") else OWNED):
		var ok: Array = LIST().filter(func(o): return not o.get("only") or (_FIT_H.has(o.only) and _fit_h(o.only, h)))
		if ok.size(): res = r.weighted(ok, func(o): return 0.35 + fit_horse(o, h) * 2.0).id
	_own.map[key] = res
	return res
static func peak(h: Dictionary) -> float:
	if not h.get("pot"): return 50.0
	var p := HSSeason.fh_peak(h); return HSU.mx(p.turf, p.dirt)
static func horses_of(oid: String) -> Array:
	var c := HSWorld.wc()
	if not c.has("owners"): c.owners = {}
	if c.owners.has(oid): return c.owners[oid]
	var list: Array = HSWorld.all().filter(func(h): return h.get("owner") != "P" and (h.get("loc") == "stable" or h.get("loc") == "farm") and owner_of(h) == oid) \
		.map(func(h): return { h = h, fh = peak(h) })
	list = HSU.stable_sort(list, func(a, b): return a.fh > b.fh).map(func(x): return x.h)
	c.owners[oid] = list
	return list
static func best_horse(oid: String) -> Variant:
	for h in horses_of(oid):
		if h.get("loc") == "stable": return h
	return null
static func class_of(race: Dictionary) -> int:
	if race.get("invite") or race.get("grade") == "GF": return 4
	if not race.get("graded"): return 0
	return { G1 = 3, G2 = 2, G3 = 1 }.get(race.get("grade"), 1)
static func allowed(tier: int, race: Dictionary, h: Dictionary, strength: float) -> bool:
	var t: Dictionary = TIERS[tier]
	var cls := class_of(race)
	if cls > t.maxClass: return false
	if race.get("region") == "海外" and tier < 3: return false
	if strength > t.maxStrength + 1e-9: return false
	if peak(h) > t.maxFh: return false
	return true

# ---------- 今週の依頼 ----------
static func generate(cs: Array, key: String, opts: Dictionary = {}) -> Array:
	var g = HSWorld.G
	var wIdx := HSWorld.w_idx()
	var r := HSU.hash_rng("%s:owners:%s" % [key, HSU.num(g.seed)])
	var tierOf := func(oid): return int(opts.tier) if opts.get("tier") != null else int(of(oid).tier)
	var per := {}
	for c in cs:
		var race: Dictionary = c.race
		var ranked: Array = HSU.stable_sort(c.runners, func(a, b): return HSHorse.overall(HSHorse.cur(a.horse, wIdx)) > HSHorse.overall(HSHorse.cur(b.horse, wIdx)))
		for k in ranked.size():
			var x = ranked[k]
			if x.get("mine") or x.horse.get("owner") == "P" or x.horse.get("legend"): continue
			var oid = owner_of(x.horse)
			if not oid: continue
			var strength := 1.0 - k / HSU.mx(1.0, ranked.size() - 1.0)
			if not allowed(tierOf.call(oid), race, x.horse, strength): continue
			if not per.has(oid): per[oid] = []
			per[oid].append({ c = c, x = x, strength = strength })
	var out: Array = []; var used := {}
	var push := func(o, y, best: bool):
		used[y.c.race.key] = true
		out.append({ oid = o.id, raceKey = y.c.race.key, horseId = y.x.horse.id, horse = y.x.horse.name, best = best, line = float(r.int_(0, 999)) })
	var owners: Array = r.shuffle(LIST().duplicate())
	for o in owners:
		var cand: Array = per.get(o.id, []).filter(func(y): return not used.has(y.c.race.key))
		if not cand.size(): continue
		var tier: int = tierOf.call(o.id)
		var best = best_horse(o.id) if tier >= 2 else null
		var bestPick = null
		if best:
			for y in cand:
				if y.x.horse.id == best.id: bestPick = y; break
		if bestPick:
			push.call(o, bestPick, true); continue
		if not r.chance(0.4 + 0.1 * tier): continue
		var want := 0.3 + 0.17 * tier
		var pick = r.weighted(cand, func(y): return (HSMath.exp_(-HSMath.pow_((y.strength - want) / 0.3, 2.0)) + 0.02) * (1.0 + class_of(y.c.race) * tier * 0.6) * (1.0 + fit_race(o, y.c.race) + fit_horse(o, y.x.horse)))
		push.call(o, pick, false)
	if not out.size():
		var cands: Array = HSU.stable_sort(owners.filter(func(o): return per.get(o.id, []).size()), func(a, b): return per[a.id].size() > per[b.id].size())
		if cands.size(): push.call(cands[0], r.pick(per[cands[0].id]), false)
	return out
static func _wk_key() -> String:
	var g = HSWorld.G; return "%s-%s-%s" % [HSU.num(g.year), HSU.num(g.month), HSU.num(g.week)]
static func _card_has(cs: Array, raceKey: String, horseId: String) -> bool:
	for c in cs:
		if c.race.key == raceKey: return c.runners.any(func(x): return x.horse.id == horseId)
	return false
static func offers() -> Array:
	if not on(): return []
	var s := state(); var g = HSWorld.G
	var key := _wk_key()
	var cs := HSWorld.cards()
	if not s.get("week") or s.week.key != key: s.week = { key = key, list = generate(cs, key), acc = {}, dec = [] }
	for rk in s.week.acc.keys():
		var a = s.week.acc[rk]
		if _card_has(cs, rk, a.horseId): continue
		s.week.acc.erase(rk)
		if g.get("rides") and g.rides.get(rk) == a.horseId: HSJockey.cancel(rk)
	var fresh := HSWorld.cards()
	return s.week.list.filter(func(o): return _card_has(fresh, o.raceKey, o.horseId) and not s.week.dec.has(o.raceKey))
static func offer_of(raceKey: String) -> Variant:
	for o in offers():
		if o.raceKey == raceKey: return o
	return null
static func accepted(raceKey: String) -> bool:
	var s := state(); return s.get("week") != null and s.week.key == _wk_key() and s.week.acc.has(raceKey)
static func clash(o: Dictionary) -> Variant:
	var c = HSWorld.card_of(o.raceKey)
	if not c: return null
	for x in c.runners:
		if x.get("mine") and x.horse.id != o.horseId: return x.horse
	return null
static func accept(raceKey: String, horseId: String) -> Variant:
	var g = HSWorld.G; var s := state()
	var o = null
	for x in offers():
		if x.raceKey == raceKey and x.horseId == horseId: o = x; break
	if not o: return "依頼が見つからない"
	var rides: Dictionary = g.rides.duplicate(); rides[raceKey] = horseId; g.rides = rides
	s.week.acc[raceKey] = { oid = o.oid, horseId = horseId }
	of(o.oid).met = true
	HSWorld.dirty()
	return null
static func unaccept(raceKey: String) -> void:
	var s := state()
	if s.get("week") and s.week.acc.has(raceKey):
		s.week.acc.erase(raceKey); HSJockey.cancel(raceKey)
static func decline(raceKey: String) -> Variant:
	var s := state(); var g = HSWorld.G
	var o = null
	for x in offers():
		if x.raceKey == raceKey: o = x; break
	if not o: return "依頼が見つからない"
	if s.week.acc.has(raceKey): unaccept(raceKey)
	s.week.dec.append(raceKey)
	var st := of(o.oid); st.met = true; st.dec += 1.0
	var d: float = -(5.0 + st.tier)
	add_pts(o.oid, d)
	var race = HSWorld.race_by_key(raceKey)
	s.log.push_front({ y = g.year, m = g.month, w = g.week, oid = o.oid, race = HSRaces.label(race) if race else "", horse = o.horse, pos = 0.0, d = d })
	if s.log.size() > 150: s.log.resize(150)
	return null

# ---------- 好感度 ----------
static func add_pts(oid: String, d: float) -> float:
	var st := of(oid)
	var floor_: float = TIERS[int(st.tier)].pts
	st.pts = HSU.clamp(HSMath.round_js((st.pts + d) * 10.0) / 10.0, floor_, MAX)
	while st.tier < TIERS.size() - 1 and st.pts >= TIERS[int(st.tier) + 1].pts:
		st.tier += 1.0; grant(oid, "t" + HSU.num(st.tier))
	if st.pts >= MAX: grant(oid, "bond")
	return st.pts
static func on_ride(oid: String, race: Dictionary, me: Dictionary, pop: Variant) -> void:
	var g = HSWorld.G; var s := state(); var o = by(oid); var st := of(oid)
	if not o: return
	var cls := class_of(race); var pos: float = me.pos
	var mult: float = [1.0, 1.4, 1.7, 2.5, 3.0][cls] * (1.2 if (race.get("region") == "海外" and cls >= 3) else 1.0)
	st.streak = 0.0 if pos <= 3 else st.streak + 1.0
	var d := 4.0 if pos <= 5 else (-3.0 if st.streak >= 4 else 1.0)
	if pos == 1: d += 25.0 * mult
	elif pos == 2: d += 10.0 * mult
	elif pos == 3: d += 6.0 * mult
	elif pos <= 5: d += 2.0
	if pop and pop - pos >= 3: d += 4.0
	if pos <= 3 and fit_race(o, race) >= 0.5: d *= 1.3
	var bigLoss: bool = cls >= 3 and pos >= 10 and pop and pop <= 3
	if bigLoss: d = -8.0
	d = HSMath.round_js(d * 10.0) / 10.0
	var fee := _yen(FEE[cls])
	g.player.money += fee; st.fees += fee
	st.rides += 1.0
	if pos == 1:
		st.wins += 1.0
		if cls >= 3: st.big += 1.0
	var yk := HSU.num(g.year)
	if not st.years.has(yk): st.years[yk] = { rides = 0.0, wins = 0.0 }
	var yr: Dictionary = st.years[yk]
	yr.rides += 1.0
	if pos == 1: yr.wins += 1.0
	st.met = true
	var t0: float = st.tier
	add_pts(oid, d)
	var kind: String = ("bigwin" if cls >= 3 else "win") if pos == 1 else ("good" if (pos <= 3 or (pop and pop - pos >= 3)) else "lose")
	var label := HSRaces.label(race)
	s.react.append({ oid = oid, kind = kind, race = label, horse = me.horse.name, pos = pos, d = d, fee = fee, up = st.tier > t0, line = float(HSU.hash32("%s:%s:%s" % [label, me.horse.name, HSU.num(g.year)]) % 997), tags = tags_of(race, me.horse) })
	s.log.push_front({ y = g.year, m = race.month, w = race.week, oid = oid, race = label, horse = me.horse.name, pos = pos, d = d })
	if s.log.size() > 150: s.log.resize(150)
	if pos == 1 and cls >= 3: HSWorld.news("%sさんの%sで%sを勝った。" % [o.name, me.horse.name, label], "g1")

# ---------- ご褒美 ----------
static func grant(oid: String, key: String) -> bool:
	var g = HSWorld.G; var s := state(); var o = by(oid); var st := of(oid)
	if not o or st.got.get(key): return false
	var got := { y = g.year }
	st.got[key] = got
	var reward := ""
	if key == "t1":
		var m := _yen(GIFT); g.player.money += m; got.money = m; reward = "祝いの品 %s" % HSU.money(m)
	elif key == "t2": reward = "%sさんの勝負服を、自分の馬に着せられるようになった" % o.name
	elif key == "t3":
		got.pending = true; reward = "%sさんの馬が引退したら、牧場に譲ってもらえる" % o.name
	elif key == "bond": reward = gift_legend(oid)
	if key == "bond": HSWorld.news("%sさんの好感度がいっぱいになった。%s。" % [o.name, reward], "g1")
	else: HSWorld.news("%sさんとの間柄が「%s」になった。%s。" % [o.name, TIERS[int(st.tier)].label, reward], "g1")
	s.queue.append({ oid = oid, kind = "bond" if key == "bond" else "up" + key.substr(1), reward = reward, y = g.year })
	return true
static func gift_legend(oid: String) -> String:
	var g = HSWorld.G; var o = by(oid); var st := of(oid)
	if not st.got.get("bond"): st.got.bond = { y = g.year }
	var got: Dictionary = st.got.bond
	var d = HSSpecial.data(o.memory) if g.get("eraless") else null
	var money := func() -> String:
		var m := _yen(GIFT * 3.0); g.player.money += m; got.money = m; got.erase("pending"); return "お祝い %s" % HSU.money(m)
	if not d: return money.call()
	if not HSSeason.can_buy():
		got.pending = true; return "思い出の名馬%s（お手馬に空きができたら、馬主の画面で受け取れる）" % o.memory
	if not g.get("unlocked"): g.unlocked = []
	if not g.unlocked.has(d.name): g.unlocked.append(d.name)
	var it = null
	for x in HSEraless.market():
		if x.horse.name == d.name: it = x; break
	if not it: return money.call()
	var h: Dictionary = it.horse
	h.id = HSWorld.new_id(); h.owner = "P"; h.loc = "farm"; h.legendBought = true; h.giftFrom = oid
	if HSData.is_foreign(d): h.imported = true
	g.lineup[h.name] = h.born - d.born
	g.bornHist = HSU.or_(g.get("bornHist"), []).filter(func(n): return n != h.name) + [h.name]
	g.horses[h.id] = h
	HSWorld.dirty()
	got.horse = h.name; got.erase("pending")
	HSWorld.news("%sさんから、思い出の名馬%sを譲ってもらった。" % [o.name, h.name], "g1")
	return "思い出の名馬 %s" % h.name
static func claim(oid: String) -> Variant:
	var st := of(oid)
	if not (st.got.get("bond") and st.got.bond.get("pending")): return "まだ受け取るものはない"
	var r := gift_legend(oid)
	if st.got.bond.get("pending"): return "お手馬がいっぱい"
	state().queue.append({ oid = oid, kind = "bond", reward = r, y = HSWorld.G.year })
	return null
# 年明けに引退する、相棒の馬主の馬を1頭、牧場へ（W.newYear の前に）
static func retire_gifts() -> void:
	var g = HSWorld.G; var s := state()
	for o in LIST():
		var st := of(o.id)
		if not (st.got.get("t3") and st.got.t3.get("pending")): continue
		var leaving: Array = HSWorld.all().filter(func(h):
			if not (h.get("owner") != "P" and (h.get("loc") == "stable" or h.get("loc") == "farm") and not h.get("gelding") and h.get("sex") != "セ" and owner_of(h) == o.id): return false
			var age: float = g.year - h.born
			return (h.get("retireYear") and h.retireYear < g.year and age >= 2) or age >= 9 or (h.get("injury") and h.injury.get("severe") and age >= 4))
		if not leaving.size(): continue
		var mt: Dictionary = HSU.or_(HSJockey.me().get("mounts") if HSJockey.me() else null, {})
		HSSort.sort(leaving, func(a, b):
			var dw: float = float(HSU.or_(mt.get(b.name, {}).get("wins"), 0.0)) - float(HSU.or_(mt.get(a.name, {}).get("wins"), 0.0))
			return dw if dw else peak(b) - peak(a))
		var h = null
		for x in leaving:
			if not HSOriginal.on() or HSOriginal.retired(x.sex).size() < HSOriginal.MAX_EACH: h = x; break
		if not h: continue
		if HSOriginal.on():
			HSWorld.unenter(h.id)
			h.owner = "P"; h.loc = "retired"; h.retiredY = g.year; h.auto = false; h.parentBonus = 0.0; h.giftFrom = o.id
			st.got.t3 = { y = g.year, horse = h.name }
			HSWorld.news("%sさんから、引退した%sを牧場に譲ってもらった。オリジナルホースの%sにできる。" % [o.name, h.name, "母" if h.sex == "牝" else "父"], "g1")
		else:
			var m := _yen(GIFT); g.player.money += m
			st.got.t3 = { y = g.year, horse = h.name, money = m }
			HSWorld.news("%sさんの%sが引退した。お礼に %s が届いた。" % [o.name, h.name, HSU.money(m)], "g1")
		HSWorld.dirty()
		s.queue.append({ oid = o.id, kind = "gift", horse = h.name, reward = "引退した %s" % h.name, y = g.year })
# 年末：その年にいちばん勝った馬主と「名コンビ賞」
static func year_award(year: float) -> Variant:
	var s := state(); var g = HSWorld.G
	var yk := HSU.num(year)
	var rows: Array = LIST().map(func(o): return { o = o, y = HSU.or_(of(o.id).years.get(yk), { rides = 0.0, wins = 0.0 }) }).filter(func(x): return x.y.wins >= AWARD_MIN)
	rows = HSU.stable_sort(rows, func(a, b): return a.y.wins > b.y.wins or (a.y.wins == b.y.wins and a.y.rides < b.y.rides))
	if not rows.size() or s.awards.get(yk): return null
	var o: Dictionary = rows[0].o; var y: Dictionary = rows[0].y
	var m := _yen(AWARD)
	g.player.money += m
	s.awards[yk] = { oid = o.id, wins = y.wins, money = m }
	add_pts(o.id, 25.0)
	HSWorld.news("%sの名コンビ賞：%sさんの馬で%s勝。賞金 %s。" % [HSWorld.y_label(year), o.name, HSU.num(y.wins), HSU.money(m)], "g1")
	s.queue.append({ oid = o.id, kind = "award", reward = "名コンビ賞 %s" % HSU.money(m), y = year })
	return o.id
# 勝負服
static func can_wear(oid: String) -> bool: return HSU.truthy(of(oid).got.get("t2"))
static func wear(horseId: String, oid: Variant) -> Variant:
	var s := state(); var h = HSWorld.horse(horseId)
	if not h or h.get("owner") != "P": return "自分の馬ではない"
	if oid and not can_wear(oid): return "まだ着せられない"
	if oid: s.wear[horseId] = oid
	else: s.wear.erase(horseId)
	return null
static func silks_of(h: Variant) -> Variant:
	var g = HSWorld.G
	if not g or not g.get("owners") or not h: return null
	var oid = g.owners.wear.get(h.id) if h.get("owner") == "P" else (owner_of(h) if on() else null)
	var o = by(oid) if oid else null
	return o.silks if o else null

# ---------- 台詞 ----------
static func tags_of(race: Variant, h: Variant) -> Array:
	var t: Array = []
	var add := func(x):
		if not t.has(x): t.append(x)
	if race:
		add.call("ダ" if race.surface == "ダ" else "芝")
		if race.dist <= 1400: add.call("短")
		if race.dist >= 2400: add.call("長")
	if h:
		if h.get("style") == "逃げ": add.call("逃")
		if h.get("style") == "差し" or h.get("style") == "追込": add.call("差")
		if h.get("sex") == "牝": add.call("牝")
	return t
static func pick_line(set: Array, seed: float, tags: Array) -> String:
	var ok: Array = set.filter(func(t): return not t.begins_with("[") or t.length() < 3 or t[2] != "]" or tags.has(t[1]))
	var list: Array = ok if ok.size() else set.filter(func(t): return not t.begins_with("["))
	if not list.size(): return ""
	var s: String = list[absi(HSMath.i32(int(seed))) % list.size()]
	if s.begins_with("[") and s.length() >= 3 and s[2] == "]": s = s.substr(3)
	return s
static func line(oid: String, scene: String, seed: float, vars: Dictionary = {}, ctx: Dictionary = {}) -> String:
	var o = by(oid)
	if not o: return ""
	var st := of(oid)
	var sc: Dictionary = o.lines.get(scene, {})
	var set: Array = HSU.or_(sc.get("close" if st.tier >= 2 else "near"), HSU.or_(sc.get("near"), []))
	if not set.size(): return ""
	return fill_(pick_line(set, seed, tags_of(ctx.get("race"), ctx.get("horse"))), vars)
static func fill_(text: String, vars: Dictionary) -> String:
	var v := { me = HSJockey.me().name if HSJockey.me() else "" }; v.merge(vars, true)
	var re := RegEx.create_from_string("\\{(\\w+)\\}")
	var out := ""; var last := 0
	for m in re.search_all(text):
		out += text.substr(last, m.get_start() - last)
		var k := m.get_string(1)
		out += str(v[k]) if v.get(k) != null else ""
		last = m.get_end()
	return out + text.substr(last)
static func scene_lines(oid: String, kind: String, vars: Dictionary = {}) -> Array:
	var o = by(oid)
	return o.scenes.get(kind, []).map(func(t): return fill_(t, vars)) if o else []
