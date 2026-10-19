# オリジナルホース（js/core/original.js の HS.Original と同じ）：引退させた牡馬・牝馬（それぞれ5頭まで牧場に残る）から仔を作る
class_name HSOriginal

const MAX_EACH := 5
const MAX_SKILLS := 4
const BONUS_PER := 3.0
const BONUS_MAX := 12.0

static func on() -> bool:
	var G = HSWorld.G
	return G != null and HSU.truthy(G.get("eraless"))
static func retired(sex: String) -> Array:
	return HSWorld.mine().filter(func(h): return h.get("loc") == "retired" and ((h.get("sex") == "牝") if sex == "牝" else (h.get("sex") != "牝")))
static func bonus_of(h: Dictionary) -> Dictionary:
	var G = HSWorld.G
	var trs: Dictionary = HSU.or_(G.get("trophies"), {})
	var tr = trs.keys().filter(func(id): return not String(id).begins_with("gf:") and trs[id].horse == h.name).size()   # GF のトロフィーは下の GF の勝ちで数える
	var dc := HSSeason.gf_wins(h).size()
	return { trophies = float(tr), dc = float(dc), pts = HSU.mn(BONUS_MAX, (tr + dc) * BONUS_PER) }
static func retire(id: String) -> Dictionary:
	var G = HSWorld.G; var h = HSWorld.horse(id)
	if not h or h.get("owner") != "P" or h.get("loc") == "retired": return { err = "持ち馬ではない" }
	if retired(h.sex).size() >= MAX_EACH and not h.get("gelding"): return { err = "引退した%sは%d頭まで。生産の画面で1頭放してから" % ["牝馬" if h.sex == "牝" else "牡馬", MAX_EACH] }
	HSWorld.unenter(id)
	G.reserve = HSU.or_(G.get("reserve"), []).filter(func(x): return x.id != id)
	HSHall.on_retire(h)
	if h.get("gelding"):
		G.horses.erase(id); HSWorld.dirty(); HSWorld.news("%sは引退して乗馬になった。おつかれさま。" % h.name, "info"); return { to = "gone" }
	var b := bonus_of(h)
	h.loc = "retired"; h.retiredY = G.year; h.auto = false; h.parentBonus = b.pts
	HSWorld.dirty()
	HSWorld.news("%sは引退し、牧場に残った。オリジナルホースの%sにできる%s。" % [h.name, "母" if h.sex == "牝" else "父", ("（仔へのボーナス +%s）" % HSU.num(b.pts)) if b.pts else ""], "info")
	return { to = "retired" }
static func release(id: String) -> Variant:
	var G = HSWorld.G; var h = HSWorld.horse(id)
	if not h or h.get("owner") != "P" or h.get("loc") != "retired": return "引退馬ではない"
	G.horses.erase(id); HSWorld.dirty()
	HSWorld.news("%sを牧場から放した。" % h.name, "info")
	return null
static func skills_of(h: Dictionary) -> Array:
	var hand: Array = HSU.or_(h.get("skills"), []).filter(func(id): return HSHorse.SKILLS.has(id))
	var trig := HSSkills.of(h, HSWorld.w_idx())
	# 伝説級の名馬の固有の能力は先頭に置き、必ず候補に入る
	var uniq: Array = trig.filter(func(id): return HSSkills.is_unique(id))
	return (uniq + hand + trig.filter(func(id): return not hand.has(id) and not uniq.has(id))).slice(0, MAX_SKILLS)
static func candidates(s: Dictionary, m: Dictionary) -> Array:
	var out: Array = []
	for id in skills_of(s) + skills_of(m):
		if not out.has(id): out.append(id)
	return out
static func make(sireId: String, damId: String, name: String = "") -> Dictionary:
	var G = HSWorld.G
	var s = HSWorld.horse(sireId); var m = HSWorld.horse(damId)
	if not s or not m or s.get("loc") != "retired" or m.get("loc") != "retired" or s.get("owner") != "P" or m.get("owner") != "P": return { err = "引退馬を選んでください" }
	if s.sex == "牝" or m.sex != "牝": return { err = "父は牡馬、母は牝馬" }
	if m.get("foalY") == G.year: return { err = "%sは今年もう仔を産んだ（来年また作れる）" % m.name }
	if not HSSeason.can_buy(): return { err = "お手馬は%s頭まで" % HSU.num(HSSeason.MAX_OWN) }
	var rng := HSRng.new(float(HSU.hash32("orig:%s:%s:%s:%s" % [HSU.num(G.seed), HSU.num(G.year), s.id, m.id])))
	var bonus := HSU.mn(BONUS_MAX, float(HSU.or_(s.get("parentBonus"), 0.0)) + float(HSU.or_(m.get("parentBonus"), 0.0)))
	var pot := {}
	for k in HSHorse.STATS:
		var a: float = HSU.or_(s.pot.get(k), 70.0); var b: float = m.pot[k] if m.pot.get(k) != null else a
		pot[k] = HSMath.round_js(HSU.clamp((a + b) / 2.0 + rng.normal(0.0, 6.0) + bonus, 40.0, 118.0) * 10.0) / 10.0
	var dMin := HSMath.round_js(HSU.clamp((s.distMin + m.distMin) / 2.0 + rng.normal(0.0, 150.0), 1000.0, 3600.0) / 100.0) * 100.0
	var dMax := HSMath.round_js(HSU.clamp((s.distMax + m.distMax) / 2.0 + rng.normal(0.0, 150.0), 1200.0, 4000.0) / 100.0) * 100.0
	if dMax < dMin + 400: dMax = HSU.mn(4000.0, dMin + 400.0)
	var cand := candidates(s, m)
	var pick: Array = cand.duplicate()
	while pick.size() > MAX_SKILLS: pick.remove_at(rng.int_(0, pick.size() - 1))
	var f := {}
	f.sex = "牡" if rng.chance(0.5) else "牝"; f.pot = pot; f.distMin = dMin; f.distMax = dMax
	f.apt = { heavy = HSMath.round_js(HSU.clamp((float(HSU.or_(HSU.or_(s.get("apt"), {}).get("heavy"), 50.0)) + float(HSU.or_(HSU.or_(m.get("apt"), {}).get("heavy"), 50.0))) / 2.0 + rng.normal(0.0, 8.0), 20.0, 100.0)) }
	f.growth = rng.pick([HSU.or_(s.get("growth"), "普通"), HSU.or_(m.get("growth"), "普通")]); f.peakShift = 0.0
	f.style = HSU.or_(rng.pick([s.get("style"), m.get("style")].filter(func(x): return HSU.truthy(x))), "先行")
	f.kire = HSU.clamp(HSMath.round_js((float(HSU.or_(s.get("kire"), 4.0)) + float(HSU.or_(m.get("kire"), 4.0))) / 2.0 + rng.normal(0.0, 1.0)), 1.0, 8.0)
	f.skills = pick.filter(func(id): return HSHorse.SKILLS.has(id)); f.health = HSMath.round_js(HSU.clamp((float(HSU.or_(s.get("health"), 70.0)) + float(HSU.or_(m.get("health"), 70.0))) / 2.0 + rng.normal(0.0, 8.0), 40.0, 100.0))
	f.coat = rng.pick([HSU.or_(s.get("coat"), "鹿毛"), HSU.or_(m.get("coat"), "鹿毛")])
	var born: float = G.year - (1.0 if G.month >= 10 else 2.0)
	var nm := name.strip_edges()
	if nm == "": nm = HSHorse.make_name(rng, HSWorld.used_names())
	if HSWorld.used_names().has(nm) and HSWorld.all().any(func(x): return x.name == nm): return { err = "その名前の馬がもういる" }
	var h := HSWorld.horse_from_foal(f, s.name, m.name, born, nm)
	h.trigFixed = pick.filter(func(id): return not HSHorse.SKILLS.has(id))
	h.owner = "P"; h.loc = "farm"; h.original = true; h.auto = true; h.bonusFromParents = bonus
	HSHorse.sync_apt(h)
	G.horses[h.id] = h
	HSWorld.used_names()[nm] = true
	HSPed.register(nm, s.name, m.name)
	m.foalY = G.year
	HSWorld.dirty()
	HSWorld.news("オリジナルホース「%s」が生まれた！（父 %s・母 %s%s）" % [nm, s.name, m.name, ("・ボーナス +%s" % HSU.num(bonus)) if bonus else ""], "g1")
	return { horse = h, bonus = bonus, skills = pick }
