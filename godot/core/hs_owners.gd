# 馬主と騎乗依頼（js/core/owners.js の HS.Owners と同じ。仕様書 docs/SPEC.md「騎乗依頼」）：AI の馬の一部を架空の馬主が持ち、
# 毎週「この馬でこのレースに」と依頼が来る。馬主は8つのジャンル（地方・短距離・クラシック・長距離・牝馬・米・欧州・豪州）に1人ずつ。
# 好感度（0〜100）はその人のジャンルのレースで勝つと上がり、たまると出会い（海外の人は海外の印のあと）。
# 段階 OP → G3 → G2 → G1 → お手馬。段階ごとの課題をやり終えるとお礼・好感度・場面・次の段階、最後はアイテム（繁殖の永続のボーナス）で依頼が止まる。
# 乱数は週と馬の名前から決まるもの（U.hashRng）だけで、世界の乱数は使わない。セーブは G.owners
class_name HSOwners

static func ALL() -> Array: return HSData.d().get("owners", [])
# いま依頼をくれる人たち（外した人を除く）
static var _act: Variant = null
static func LIST() -> Array:
	var all := ALL()
	if _act != null and is_same(_act.src, all) and _act.n == all.size(): return _act.list
	_act = { src = all, n = all.size(), list = all.filter(func(o): return not o.get("retired")) }
	return _act.list
static func by(id: String) -> Variant:
	for o in LIST():
		if o.id == id: return o
	for o in ALL():
		if o.id == id: return o
	return null
static func active(id: String) -> bool: return LIST().any(func(o): return o.id == id)

# ---------- 段階と数（仮の値。js/core/owners.js と同じ） ----------
const STAGES := [
	{ key = "op", label = "OP", maxClass = 0, maxFh = 60.0, maxStrength = 0.9, floor = 10.0, money = 300.0 },
	{ key = "g3", label = "G3", maxClass = 1, maxFh = 66.0, maxStrength = 0.95, floor = 25.0, money = 600.0 },
	{ key = "g2", label = "G2", maxClass = 2, maxFh = 72.0, maxStrength = 1.0, floor = 40.0, money = 1000.0 },
	{ key = "g1", label = "G1", maxClass = 3, maxFh = 80.0, maxStrength = 1.0, floor = 55.0, money = 2000.0 },
	{ key = "own", label = "お手馬", maxClass = 4, maxFh = 99.0, maxStrength = 1.0, floor = 70.0, money = 5000.0 },
]
const DONE := 5
const MAX := 100.0
const MEET := 10.0
const GAIN := [5.0, 7.0, 9.0, 12.0, 15.0]
const PLACE := [0.0, 0.0, 3.0, 2.0]
const OWNED := 0.5
const OWNED_FILLER := 0.3
const FEE := [10.0, 30.0, 50.0, 100.0, 200.0]
const GIFT := 1000.0
const AWARD := 500.0
const AWARD_MIN := 3.0
const SIGN_RATE := 0.9
const OFF_SIGN := 0.25
const ASK_STAGE := 1
const ASK_N := 3
const WEAR_STAGE := 3
const GATE_LABEL := { "overseas": "海外のレースに1度出たあと" }
# 依頼が始まる前に要る印（あとで本当の「海外の解放」に差し替える）
static func gate_ok(o: Variant) -> bool:
	if not o or not o.get("gate"): return true
	match String(o.gate):
		"overseas": return HSU.truthy(state().flags.get("overseas"))
	return false

static func on() -> bool: return HSJockey.is_mode()
static func _blank() -> Dictionary: return { pts = 0.0, stage = 0.0, prog = 0.0, met = false, known = false, rides = 0.0, wins = 0.0, big = 0.0, dec = 0.0, streak = 0.0, fees = 0.0, got = {}, years = {}, cleared = [] }
static func init() -> Dictionary:
	var st := {}
	for o in ALL(): st[o.id] = _blank()
	return { v = 2.0, st = st, week = null, log = [], queue = [], react = [], awards = {}, wear = {}, flags = {}, ask = null }
# 前の形（好感度 0〜800・段階 顔見知り／信頼／主戦／相棒）を、新しい段階に移す
static func migrate_st(st: Dictionary) -> Dictionary:
	var t := int(HSU.or_(st.get("tier"), 0.0)); var p: float = float(HSU.or_(st.get("pts"), 0.0))
	var lo: float = [0.0, 100.0, 260.0, 520.0][t] if t < 4 else 0.0
	var hi: float = [100.0, 260.0, 520.0, 800.0][t] if t < 4 else 800.0
	var stage := 4 if t >= 3 else (3 if t == 2 else ((2 if p >= 180 else 1) if t == 1 else 0))
	st.stage = float(stage); st.prog = 0.0
	st.pts = STAGES[stage].floor + HSU.clamp(floorf((p - lo) / (hi - lo) * 10.0), 0.0, 10.0) if HSU.truthy(st.get("known")) else 0.0
	st.erase("tier")
	return st
static func fill(s: Variant, g: Variant = null) -> Dictionary:
	if not s: s = init()
	if not s.get("st"): s.st = {}
	var old := not HSU.truthy(s.get("v"))
	for o in ALL():
		var st = s.st.get(o.id)
		# 縁の項目が無い前のセーブ：依頼を受けた・断った・乗った・好感度がある馬主は、縁がある扱い
		if st and not st.has("known"):
			st.known = bool(HSU.truthy(st.get("met")) or HSU.truthy(st.get("rides")) or HSU.truthy(st.get("pts")) or HSU.truthy(st.get("tier")))
		if st and not st.has("stage"): migrate_st(st)
		var b := _blank(); b.merge(HSU.or_(st, {}), true); s.st[o.id] = b
	for k in ["log", "queue", "react"]:
		if not s.get(k): s[k] = []
	if old:
		s.queue = []; s.react = []
	if not s.get("awards"): s.awards = {}
	if not s.get("wear"): s.wear = {}
	if not s.get("flags"): s.flags = {}
	if not s.has("week"): s.week = null
	if not s.has("ask"): s.ask = null
	# 海外の印：前のセーブで、自分が海外の重賞を勝っていれば出たことにする
	if not s.flags.get("overseas") and g and g.get("records") and g.records.get("player"):
		if HSU.or_(g.records.player.get("g1"), []).any(func(x): return x.get("region") == "海外"): s.flags.overseas = { y = g.year }
	s.v = 2.0
	return s
static func state() -> Dictionary:
	var g = HSWorld.G
	if not g.get("owners"): g.owners = init()
	return g.owners
static func of(id: String) -> Dictionary:
	var s := state()
	if not s.st.has(id): s.st[id] = _blank()
	return s.st[id]
static func stage_of(id: String) -> Dictionary: return STAGES[mini(int(of(id).stage), 4)]
static func done(id: String) -> bool: return of(id).stage >= DONE
static func stage_label(id: String) -> String: return "やり終えた" if done(id) else String(stage_of(id).label) + "の段階"
static func mission_of(o: Variant, stage: int) -> Variant:
	if not o or not o.get("missions") or stage >= DONE or stage >= o.missions.size(): return null
	return o.missions[stage]
static func mission(id: String) -> Variant: return mission_of(by(id), int(of(id).stage))
static func yen(v: float) -> float: return HSMath.round_js(v * HSU.price_index(HSWorld.G.year) / 10.0) * 10.0

# ---------- 好み ----------
const EU := ["英", "愛", "仏", "独", "伊"]
const AUS := ["豪", "新"]
static var _sire_c: Variant = null
static func _sire_country(h: Dictionary) -> String:
	if _sire_c == null:
		_sire_c = {}
		for s in HSData.d().get("stallions", []): _sire_c[s.name] = String(HSU.or_(s.get("country"), ""))
	var sr = h.get("sire")
	return String(_sire_c.get(sr, "")) if sr else ""
static func _turfy(h: Dictionary) -> bool: return not h.get("apt") or h.apt.turf >= h.apt.dirt
static func _early(h: Dictionary) -> bool: return h.get("growth") == "早熟" or h.get("growth") == "早め"
static func _dirty(h: Dictionary) -> bool: return h.get("apt") != null and HSU.truthy(h.get("apt")) and h.apt.dirt > h.apt.turf
static func _fit_h(k: String, h: Dictionary) -> float:
	match k:
		"sprint": return 1.0 if float(HSU.or_(h.get("distMax"), 2000.0)) <= 1600 else (0.5 if float(HSU.or_(h.get("distMin"), 1600.0)) <= 1400 else 0.0)
		"mile": return 1.0 if (float(HSU.or_(h.get("distMin"), 1600.0)) <= 1600 and float(HSU.or_(h.get("distMax"), 2000.0)) >= 1600) else 0.0
		"long": return 1.0 if float(HSU.or_(h.get("distMax"), 2000.0)) >= 2400 else 0.0
		"dirt": return 1.0 if _dirty(h) else 0.0
		"turf": return 1.0 if _turfy(h) else 0.0
		"filly": return 1.0 if h.get("sex") == "牝" else 0.0
		"front": return 1.0 if h.get("style") == "逃げ" else 0.0
		"closer": return 1.0 if (h.get("style") == "差し" or h.get("style") == "追込") else 0.0
		"foreign": return 1.0 if (h.get("foreign") or h.get("foreignTrained") or (h.get("country") and h.country != "日")) else 0.0
		"blood": return 1.0 if h.get("hist") else 0.0
		"local": return 1.0 if h.get("local") else (0.6 if _dirty(h) else 0.0)
		"classic": return 1.0 if (_turfy(h) and float(HSU.or_(h.get("distMin"), 1600.0)) <= 2000 and float(HSU.or_(h.get("distMax"), 2000.0)) >= 2000) else 0.0
		"usa":
			if h.get("country") == "米": return 1.0
			if _sire_country(h) == "米": return 1.0 if _dirty(h) else 0.4
			return 0.3 if _dirty(h) else 0.0
		"europe":
			if EU.has(h.get("country")): return 1.0
			if EU.has(_sire_country(h)): return 0.8
			return 0.4 if (_turfy(h) and float(HSU.or_(h.get("distMax"), 2000.0)) >= 2400) else 0.0
		"aus":
			if AUS.has(h.get("country")): return 1.0
			if _sire_country(h) == "豪": return 0.8
			if _turfy(h) and float(HSU.or_(h.get("distMax"), 2000.0)) <= 1800: return 0.8 if _early(h) else 0.5
			return 0.0
	return 0.0
const _FIT_H := ["sprint", "mile", "long", "dirt", "turf", "filly", "front", "closer", "foreign", "blood", "local", "classic", "usa", "europe", "aus"]
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
		"usa": return 1.0 if (r.get("region") == "海外" and r.get("country") == "米") else 0.0
		"europe": return 1.0 if (r.get("region") == "海外" and EU.has(r.get("country"))) else 0.0
		"aus": return 1.0 if (r.get("region") == "海外" and AUS.has(r.get("country"))) else 0.0
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

# ---------- ジャンル（likes の先頭） ----------
const LIKE_LABEL := {
	"sprint": "短距離好き", "mile": "マイル好き", "long": "長距離好き", "dirt": "ダート好き", "turf": "芝好き", "filly": "牝馬好き", "front": "逃げ馬好き",
	"closer": "差し馬好き", "foreign": "外国の馬好き", "overseas": "海外好き", "local": "地方好き", "classic": "クラシック好き", "young": "2歳馬好き",
	"veteran": "古馬好き", "blood": "血統好き", "usa": "アメリカ好き", "europe": "欧州好き", "aus": "豪州好き",
}
static func sign_of(o: Variant) -> String:
	return String(o.likes[0]) if o and o.get("likes") and o.likes.size() else ""
static func sign_label(o: Variant) -> String: return String(LIKE_LABEL.get(sign_of(o), ""))
static func sub_labels(o: Variant) -> Array:
	var out: Array = []
	if o and o.get("likes"):
		for k in o.likes.slice(1):
			if LIKE_LABEL.has(k): out.append(LIKE_LABEL[k])
	return out
static func _year_of(r: Dictionary) -> float: return float(r.year) if r.get("year") != null else float(HSWorld.G.year)
# そのレースとその馬が、ジャンルに合うか
static func sign_fits(o: Dictionary, race: Dictionary, h: Dictionary) -> bool:
	match sign_of(o):
		"local": return race.surface == "ダ" or race.get("region") == "地方"
		"sprint": return race.dist <= 1400
		"dirt": return race.surface == "ダ"
		"long": return race.dist >= 2000
		"classic": return race.get("age") == "2" or race.get("age") == "3" or _year_of(race) - float(h.born) <= 3
		"front": return h.get("style") == "逃げ"
		"closer": return h.get("style") == "差し" or h.get("style") == "追込"
		"filly": return h.get("sex") == "牝"
		"usa": return _fit_r("usa", race) > 0 or (race.surface == "ダ" and _fit_h("usa", h) > 0)
		"europe": return _fit_r("europe", race) > 0 or (race.surface == "芝" and race.dist >= 2000 and _fit_h("europe", h) > 0)
		"aus": return _fit_r("aus", race) > 0 or (race.surface == "芝" and race.dist <= 1600 and _fit_h("aus", h) > 0)
	return true
static func _own_w(o: Dictionary, h: Dictionary) -> float:
	var k := sign_of(o)
	return 0.2 + (_fit_h(k, h) if _FIT_H.has(k) else 0.0) * 3.0 + fit_horse(o, h)
# 店の馬（史実馬のデータ d）がジャンルに合うか
static func fit_data(o: Dictionary, d: Dictionary) -> bool:
	match sign_of(o):
		"local": return d.get("surface") == "ダ"
		"sprint": return float(HSU.or_(d.get("distMax"), 2000.0)) <= 1600 and float(HSU.or_(d.get("distMin"), 1600.0)) <= 1400
		"classic": return d.get("surface") != "ダ" and float(HSU.or_(d.get("distMin"), 1600.0)) <= 2000 and float(HSU.or_(d.get("distMax"), 2000.0)) >= 2000
		"long": return float(HSU.or_(d.get("distMax"), 2000.0)) >= 2400
		"filly": return d.get("sex") == "牝"
		"usa": return d.get("country") == "米" or _sire_country(d) == "米"
		"europe": return EU.has(d.get("country")) or EU.has(_sire_country(d))
		"aus": return AUS.has(d.get("country")) or _sire_country(d) == "豪" or (d.get("surface") != "ダ" and float(HSU.or_(d.get("distMax"), 2000.0)) <= 1600 and _early(d))
	return false

# ---------- 縁（出会い） ----------
static func known(id: String) -> bool: return bool(of(id).known)
static func known_list() -> Array: return LIST().filter(func(o): return known(o.id))
static func meet(oid: String, ctx: Variant = null) -> bool:
	var o = by(oid); var st := of(oid)
	if not o or st.known: return false
	var g = HSWorld.G; var s := state()
	var c: Dictionary = ctx if ctx else HSU.or_(st.get("lastWin"), {})
	st.known = true; st.knownAt = { y = g.year, m = g.month, w = g.week }
	st.pts = HSU.mx(st.pts, STAGES[0].floor)
	HSWorld.news("%sさん（%s）から声がかかった。これから騎乗依頼が来る。" % [o.name, sign_label(o)], "good")
	s.queue.append({ oid = oid, kind = "meet", horse = String(c.get("horse", "")), race = String(c.get("race", "")), reward = "", y = g.year })
	return true
static func meet_check() -> void:
	for o in LIST():
		var st := of(o.id)
		if not st.known and st.pts >= MEET and gate_ok(o): meet(o.id)
static func hint(oid: String) -> String:
	var o = by(oid)
	return String(o.unlock.get("hint", "")) if o and o.get("unlock") else ""

# ---------- 馬主の馬（馬の名前と種から決まる） ----------
static var _own: Variant = null
static func _s(v: Variant) -> String:
	return HSU.num(v) if (v is float or v is int) else str(v)
static func owner_of(h: Variant) -> Variant:
	if not h or h.get("owner") == "P" or h.get("legend") or not LIST().size(): return null
	var g = HSWorld.G
	if not g: return null
	if _own == null or _own.seed != g.seed or _own.map.size() > 6000: _own = { seed = g.seed, map = {} }
	var name: String = h.name if h.get("name") else _s(h.id)
	var key := "%s|%s" % [name, _s(h.id)]
	if _own.map.has(key): return _own.map[key]
	var r := HSU.hash_rng("owner:%s:%s" % [HSU.num(g.seed), name])
	var res = null
	if r.chance(OWNED_FILLER if h.get("filler") else OWNED):
		var ok: Array = LIST().filter(func(o): return not o.get("only") or (_FIT_H.has(o.only) and _fit_h(o.only, h)))
		if ok.size(): res = r.weighted(ok, func(o): return _own_w(o, h)).id
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
static func allowed(stage: int, race: Dictionary, h: Dictionary, strength: float) -> bool:
	var t: Dictionary = STAGES[mini(stage, 4)]
	var cls := class_of(race)
	if cls > t.maxClass: return false
	if race.get("region") == "海外" and stage < 3: return false
	if strength > t.maxStrength + 1e-9: return false
	if peak(h) > t.maxFh: return false
	return true

# ---------- 今週の依頼 ----------
static func generate(cs: Array, key: String, opts: Dictionary = {}) -> Array:
	var g = HSWorld.G
	var wIdx := HSWorld.w_idx()
	var r := HSU.hash_rng("%s:owners:%s" % [key, HSU.num(g.seed)])
	var stageOf := func(oid): return int(opts.stage) if opts.get("stage") != null else int(of(oid).stage)
	var per := {}
	for c in cs:
		var race: Dictionary = c.race
		var ranked: Array = HSU.stable_sort(c.runners, func(a, b): return HSHorse.overall(HSHorse.cur(a.horse, wIdx)) > HSHorse.overall(HSHorse.cur(b.horse, wIdx)))
		for k in ranked.size():
			var x = ranked[k]
			if x.get("mine") or x.horse.get("owner") == "P" or x.horse.get("legend"): continue
			var oid = owner_of(x.horse)
			if not oid: continue
			if not opts.get("all") and not of(oid).known: continue
			var stage: int = stageOf.call(oid)
			if stage >= DONE: continue
			var strength := 1.0 - k / HSU.mx(1.0, ranked.size() - 1.0)
			if not allowed(stage, race, x.horse, strength): continue
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
		var stage: int = stageOf.call(o.id)
		var best = best_horse(o.id) if stage >= 3 else null
		var bestPick = null
		if best:
			for y in cand:
				if y.x.horse.id == best.id: bestPick = y; break
		if bestPick:
			push.call(o, bestPick, true); continue
		if not r.chance(0.4 + 0.1 * stage): continue
		var fit: Array = cand.filter(func(y): return sign_fits(o, y.c.race, y.x.horse))
		var pool: Array = cand
		if fit.size():
			if r.chance(SIGN_RATE): pool = fit
		elif not r.chance(OFF_SIGN): continue
		var want := 0.5 + 0.12 * stage
		var pick = r.weighted(pool, func(y): return (HSMath.exp_(-HSMath.pow_((y.strength - want) / 0.3, 2.0)) + 0.02) * (1.0 + class_of(y.c.race) * stage * 0.6) * (1.0 + fit_race(o, y.c.race) + fit_horse(o, y.x.horse)))
		push.call(o, pick, false)
	if not out.size():
		var cands: Array = HSU.stable_sort(owners.filter(func(o): return per.get(o.id, []).size()), func(a, b): return per[a.id].size() > per[b.id].size())
		if cands.size():
			var o0: Dictionary = cands[0]
			var fit0: Array = per[o0.id].filter(func(y): return sign_fits(o0, y.c.race, y.x.horse))
			push.call(o0, r.pick(fit0 if fit0.size() else per[o0.id]), false)
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
	var d := -2.0
	add_pts(o.oid, d)
	var race = HSWorld.race_by_key(raceKey)
	s.log.push_front({ y = g.year, m = g.month, w = g.week, oid = o.oid, race = HSRaces.label(race) if race else "", horse = o.horse, pos = 0.0, d = d })
	if s.log.size() > 150: s.log.resize(150)
	return null

# ---------- 好感度 ----------
static func cap(st: Dictionary) -> float:
	if not st.known: return STAGES[1].floor - 1.0
	if st.stage >= DONE: return MAX
	if st.stage >= 4: return MAX - 1.0
	return STAGES[int(st.stage) + 1].floor - 1.0
static func floor_(st: Dictionary) -> float:
	if not st.known: return 0.0
	if st.stage >= DONE: return MAX
	return STAGES[int(st.stage)].floor
static func add_pts(oid: String, d: float) -> float:
	var st := of(oid)
	var v: float = st.pts + d
	if d > 0: v = HSU.mn(v, HSU.mx(cap(st), st.pts))
	v = HSU.mx(v, floor_(st))
	st.pts = HSMath.round_js(v * 10.0) / 10.0
	return st.pts
static func on_ride(oid: String, race: Dictionary, me: Dictionary, pop: Variant) -> void:
	var g = HSWorld.G; var s := state(); var o = by(oid); var st := of(oid)
	if not o: return
	var cls := class_of(race); var pos: float = me.pos
	st.streak = 0.0 if pos <= 3 else st.streak + 1.0
	var d := 0.0
	if pos == 1: d = 3.0 + cls
	elif pos == 2: d = 1.5
	elif pos == 3: d = 1.0
	elif pos <= 5: d = 0.5
	elif st.streak >= 4: d = -1.0
	if pop and pop - pos >= 3: d += 0.5
	var bigLoss: bool = cls >= 3 and pos >= 10 and pop and pop <= 3
	if bigLoss: d = -2.0
	var fee := yen(FEE[cls])
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
	add_pts(oid, d)
	var kind: String = ("bigwin" if cls >= 3 else "win") if pos == 1 else ("good" if (pos <= 3 or (pop and pop - pos >= 3)) else "lose")
	var label := HSRaces.label(race)
	s.react.append({ oid = oid, kind = kind, race = label, horse = me.horse.name, pos = pos, d = d, fee = fee, line = float(HSU.hash32("%s:%s:%s" % [label, me.horse.name, HSU.num(g.year)]) % 997), tags = tags_of(race, me.horse) })
	s.log.push_front({ y = g.year, m = race.month, w = race.week, oid = oid, race = label, horse = me.horse.name, pos = pos, d = d })
	if s.log.size() > 150: s.log.resize(150)
	if pos == 1 and cls >= 3: HSWorld.news("%sさんの%sで%sを勝った。" % [o.name, me.horse.name, label], "g1")

# ---------- 課題 ----------
static func _name_in(names: Array, race: Dictionary) -> bool:
	return names.has(race.get("name")) or (race.get("short") != null and names.has(race.short))
static func _won(h: Dictionary, name: String, y: Variant) -> bool:
	return HSU.or_(h.get("gradedWins"), []).any(func(w): return (y == null or w.get("y") == y) and (w.get("race") == name or w.get("short") == name))
static func won_all(h: Dictionary, names: Array, y: Variant) -> bool:
	return names.all(func(n): return _won(h, n, y))
static func streak_of(h: Dictionary) -> int:
	var rs: Array = HSU.or_(h.get("results"), [])
	var n := 0; var i := rs.size() - 1
	while i >= 0 and rs[i].pos == 1:
		n += 1; i -= 1
	return n
static func need_ok(n: Dictionary, race: Dictionary, me: Dictionary, isOffer: bool) -> bool:
	var h: Dictionary = me.horse
	var by_: String = String(HSU.or_(n.get("by"), "offer"))
	if by_ == "offer" and not isOffer: return false
	if by_ == "own" and h.get("owner") != "P": return false
	if by_ == "orig" and not (h.get("owner") == "P" and HSU.truthy(h.get("original"))): return false
	if me.pos > float(HSU.or_(n.get("pos"), 1.0)): return false
	if HSU.truthy(n.get("cls")) and class_of(race) < n.cls: return false
	if n.get("region") and race.get("region") != n.region: return false
	if n.get("countries") and not (race.get("region") == "海外" and n.countries.has(race.get("country"))): return false
	if n.get("eu") and not (race.get("region") == "海外" and EU.has(race.get("country"))): return false
	if n.get("surface") and race.surface != n.surface: return false
	if HSU.truthy(n.get("minDist")) and race.dist < n.minDist: return false
	if HSU.truthy(n.get("maxDist")) and race.dist > n.maxDist: return false
	if n.get("ages") and not n.ages.has(race.get("age")): return false
	if n.get("raceSex") == "牝" and race.get("sex") != "牝": return false
	if n.get("raceSex") == "mixed" and race.get("sex") == "牝": return false
	if n.get("horseSex") and h.get("sex") != n.horseSex: return false
	if n.get("styles") and not n.styles.has(h.get("style")): return false
	if HSU.truthy(n.get("popMin")) and not (me.get("pop") != null and me.pop >= n.popMin): return false
	if n.get("names") and not _name_in(n.names, race): return false
	if n.get("unbeaten") and not (float(HSU.or_(h.get("starts"), 0.0)) > 0 and h.get("wins") == h.get("starts")): return false
	if HSU.truthy(n.get("streak")) and streak_of(h) < n.streak: return false
	if n.get("set") and not won_all(h, n.set, _year_of(race)): return false
	if n.get("all") and not won_all(h, n.all, null): return false
	if n.get("twice") and not HSU.or_(n.get("names"), []).any(func(x): return _won(h, x, _year_of(race) - 1.0)): return false
	if n.get("wonRegion") and not HSU.or_(h.get("gradedWins"), []).any(func(w): return w.get("region") == n.wonRegion): return false
	return true
static func advance(oid: String, ctx: Dictionary = {}) -> bool:
	var g = HSWorld.G; var s := state(); var o = by(oid); var st := of(oid)
	if not o or st.stage >= DONE: return false
	var k := int(st.stage)
	var m := yen(STAGES[k].money)
	g.player.money += m
	st.stage = float(k + 1); st.prog = 0.0
	st.pts = HSU.mx(st.pts, MAX if st.stage >= DONE else STAGES[int(st.stage)].floor)
	st.cleared = HSU.or_(st.get("cleared"), []) + [{ y = g.year, m = g.month, w = g.week, horse = String(ctx.get("horse", "")), race = String(ctx.get("race", "")) }]
	var reward := "お礼 %s" % HSU.money(m)
	if st.stage == WEAR_STAGE and not st.got.get("t2"):
		st.got.t2 = { y = g.year }; reward += "・%sさんの勝負服を自分の馬に着せられる" % o.name
	if st.stage >= DONE:
		st.got.item = { y = g.year }; reward += "・%s（%s）" % [o.item.name, o.item.text]
	if st.stage >= DONE: HSWorld.news("%sさんの依頼をすべてやり終えた。%sを受け取った（%s）。" % [o.name, o.item.name, o.item.text], "g1")
	else: HSWorld.news("%sさんの「%s」の依頼をやり終えた。次は「%s」の依頼。%s。" % [o.name, STAGES[k].label, STAGES[int(st.stage)].label, reward], "g1")
	s.queue.append({ oid = oid, kind = "m" + HSU.num(st.stage), horse = String(ctx.get("horse", "")), race = String(ctx.get("race", "")), reward = reward, y = g.year })
	return true
# 自分が乗ったレースの結果（週の終わりに、レースのあとの馬で見る）
static func on_result(race: Dictionary, me: Dictionary) -> void:
	var s := state()
	var h: Dictionary = me.horse; var label := HSRaces.label(race)
	if race.get("region") == "海外" and not s.flags.get("overseas"): s.flags.overseas = { y = _year_of(race), race = label }
	var a = s.week.acc.get(race.key) if s.get("week") else null
	var offerOid = a.oid if (a and a.horseId == h.id) else null
	var cls := class_of(race)
	for o in LIST():
		var st := of(o.id)
		if st.stage >= DONE: continue
		var gain := 0.0
		if me.pos == 1: gain = GAIN[cls]
		elif not st.known and int(me.pos) < PLACE.size(): gain = PLACE[int(me.pos)]
		if gain and sign_fits(o, race, h):
			add_pts(o.id, gain)
			if not st.known: st.lastWin = { horse = h.name, race = label }
		if not st.known: continue
		var m = mission_of(o, int(st.stage))
		if not m or not need_ok(HSU.or_(m.get("need"), {}), race, me, offerOid == o.id): continue
		st.prog += 1.0
		if st.prog >= float(HSU.or_(m.need.get("count"), 1.0)): advance(o.id, { horse = h.name, race = label })
static func after_week(rep: Dictionary) -> void:
	for r in rep.get("races", []):
		if r.race.get("grade") == "GF" or not r.get("sim"): continue
		var me = null
		for x in r.sim.results:
			if x.get("rider") == "P": me = x; break
		if me and me.get("horse"): on_result(r.race, me)
	meet_check()

# ---------- 最後のアイテム ----------
static func items() -> Array:
	return ALL().filter(func(o): return o.get("item") and of(o.id).got.get("item")).map(func(o): return o.item)
static func apply_items(h: Dictionary) -> Array:
	var its := items()
	if not its.size(): return []
	for it in its:
		var b: Dictionary = HSU.or_(it.get("bonus"), {})
		if b.get("pot"):
			for k in b.pot.keys():
				if h.pot.get(k) != null: h.pot[k] = HSMath.round_js(HSU.mn(120.0, h.pot[k] + b.pot[k]) * 10.0) / 10.0
		if HSU.truthy(b.get("health")): h.health = HSU.mn(100.0, float(HSU.or_(h.get("health"), 70.0)) + b.health)
		if HSU.truthy(b.get("distMax")): h.distMax = HSU.mn(4000.0, h.distMax + b.distMax)
		if HSU.truthy(b.get("kire")): h.kire = HSU.mn(8.0, float(HSU.or_(h.get("kire"), 4.0)) + b.kire)
		if HSU.truthy(b.get("heavy")) and h.get("apt"): h.apt.heavy = HSU.mn(100.0, float(HSU.or_(h.apt.get("heavy"), 50.0)) + b.heavy)
	h.items = its.map(func(it): return it.name)
	return h.items

# ---------- 店に頼む ----------
static func can_ask(id: String) -> bool: return active(id) and known(id) and of(id).stage >= ASK_STAGE
static func ask(oid: String) -> Variant:
	if not can_ask(oid): return "まだ頼めない"
	var g = HSWorld.G; var s := state()
	var y: float = g.year + 1.0 if g.month >= 12 else g.year
	var m: float = 1.0 if g.month >= 12 else g.month + 1.0
	s.ask = { oid = oid, y = y, m = m }
	HSWorld.dirty()
	return null
# HSEraless.restock のあとに呼ぶ：頼まれた月なら、品ぞろえの後ろの何頭かを好みの馬に入れ替える
static func shop_bias(names: Array) -> Array:
	var g = HSWorld.G
	if not g or not g.get("owners"): return names
	var a = g.owners.get("ask")
	if not a or a.y != g.year or a.m != g.month: return names
	var o = by(String(a.oid))
	if not o: return names
	var actN := HSEraless.active_names()
	var pool := HSEraless.pool()
	var byName := {}
	for d in pool: byName[d.name] = d
	var rng := HSU.hash_rng("ask:%s:%s:%s:%s" % [HSU.num(g.seed), HSU.num(g.year), HSU.num(g.month), o.id])
	for side in [false, true]:
		var idx: Array = []
		for i in names.size():
			var d = byName.get(names[i])
			if d and (d.get("sex") == "牝") == side: idx.append(i)
		var fits: Array = pool.filter(func(d): return (d.get("sex") == "牝") == side and HSEraless.is_open(d) and not actN.has(d.name) and not names.has(d.name) and fit_data(o, d))
		var k := mini(ASK_N, mini(fits.size(), idx.size()))
		for j in k:
			var t := rng.int_(0, fits.size() - 1)
			names[idx[idx.size() - 1 - j]] = fits[t].name
			fits.remove_at(t)
	return names

# ---------- 前の版のご褒美（前のセーブで受け取っていないものを受け取る） ----------
static func gift_legend(oid: String) -> String:
	var g = HSWorld.G; var o = by(oid); var st := of(oid)
	if not st.got.get("bond"): st.got.bond = { y = g.year }
	var got: Dictionary = st.got.bond
	var d = HSSpecial.data(o.memory) if (g.get("eraless") and o.get("memory")) else null
	var money := func() -> String:
		var m := yen(GIFT * 3.0); g.player.money += m; got.money = m; got.erase("pending"); return "お祝い %s" % HSU.money(m)
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
	HSWorld.news("%sさんから受け取った：%s" % [by(oid).name, r], "good")
	return null
# 前の版で「引退した馬を譲ってもらう」約束をした馬主の馬を1頭、年明けに牧場へ（W.newYear の前に）
static func retire_gifts() -> void:
	var g = HSWorld.G
	for o in ALL():
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
			var m := yen(GIFT); g.player.money += m
			st.got.t3 = { y = g.year, horse = h.name, money = m }
			HSWorld.news("%sさんの%sが引退した。お礼に %s が届いた。" % [o.name, h.name, HSU.money(m)], "g1")
		HSWorld.dirty()
# 年末：その年にいちばん勝った馬主と「名コンビ賞」
static func year_award(year: float) -> Variant:
	var s := state(); var g = HSWorld.G
	var yk := HSU.num(year)
	var rows: Array = LIST().map(func(o): return { o = o, y = HSU.or_(of(o.id).years.get(yk), { rides = 0.0, wins = 0.0 }) }).filter(func(x): return x.y.wins >= AWARD_MIN)
	rows = HSU.stable_sort(rows, func(a, b): return a.y.wins > b.y.wins or (a.y.wins == b.y.wins and a.y.rides < b.y.rides))
	if not rows.size() or s.awards.get(yk): return null
	var o: Dictionary = rows[0].o; var y: Dictionary = rows[0].y
	var m := yen(AWARD)
	g.player.money += m
	s.awards[yk] = { oid = o.id, wins = y.wins, money = m }
	add_pts(o.id, 3.0)
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
		if race.get("region") == "海外": add.call("海")
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
static func close_of(oid: String) -> bool: return of(oid).stage >= 2
static func line(oid: String, scene: String, seed: float, vars: Dictionary = {}, ctx: Dictionary = {}) -> String:
	var o = by(oid)
	if not o: return ""
	var sc: Dictionary = o.lines.get(scene, {})
	var set: Array = HSU.or_(sc.get("close" if close_of(oid) else "near"), HSU.or_(sc.get("near"), []))
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
	return HSU.or_(o.get("scenes"), {}).get(kind, []).map(func(t): return fill_(t, vars)) if o else []
