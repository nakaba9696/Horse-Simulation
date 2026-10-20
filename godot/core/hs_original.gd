# オリジナルホース（js/core/original.js の HS.Original と同じ）：引退させた牡馬・牝馬（それぞれ5頭まで牧場に残る）から仔を作る
class_name HSOriginal

const MAX_EACH := 5
const MAX_SKILLS := 4
const BONUS_PER := 3.0   # 前の版：仔へのボーナス（前のセーブの引退馬だけ。potUp の無い馬）
const BONUS_MAX := 12.0
const POT_MAX := 118.0   # 能力の上限（仔を作るときと同じ）
# 1頭の馬から作れる仔の数（作り終えた親は牧場を去る）。GF の一族の人（イロナ）の花輪を持っていれば＋1（original.js と同じ）
const FOALS := 3
static func foals_max() -> int: return FOALS + (1 if HSGFHost.has_item() else 0)
static func foals_left(h: Variant) -> int: return maxi(0, foals_max() - int(HSU.or_(h.get("origN"), 0.0) if h else 0.0))
# 仔の能力の元：両親の平均のうち SOFT を超えた分は HERIT の割合だけ受け継ぐ（original.js と同じ。持ち主の決定 2026-10-20）
const SOFT := 94.0
const HERIT := 0.5
static func inherit(avg: float) -> float: return SOFT + (avg - SOFT) * HERIT if avg > SOFT else avg

static func on() -> bool:
	var G = HSWorld.G
	return G != null and HSU.truthy(G.get("eraless"))
static func retired(sex: String) -> Array:
	return HSWorld.mine().filter(func(h): return h.get("loc") == "retired" and ((h.get("sex") == "牝") if sex == "牝" else (h.get("sex") != "牝")))
# 引退したときの能力の上がり：手にしたトロフィー（GF のトロフィーも）。by＝能力ごとの上がり、pts＝いちばん大きい上がり（original.js と同じ）
static func bonus_of(h: Dictionary) -> Dictionary:
	var p := HSTrophy.points(h)
	return { trophies = p.n, by = p.by, pts = p.top }
# 仔へのボーナス：前の版の引退馬（引退で能力が上がっていない馬）だけ
static func legacy_bonus(h: Variant) -> float: return float(HSU.or_(h.get("parentBonus"), 0.0)) if (h and not h.get("potUp")) else 0.0
static func child_bonus(s: Variant, m: Variant) -> float: return HSU.mn(BONUS_MAX, legacy_bonus(s) + legacy_bonus(m))
# opts.hall：殿堂入りさせるか（引退の画面で「殿堂入りさせますか」に「はい」のとき true）。入らなければレースの記録は消える（original.js と同じ）
static func retire(id: String, opts: Dictionary = {}) -> Dictionary:
	var G = HSWorld.G; var h = HSWorld.horse(id)
	if not h or h.get("owner") != "P" or h.get("loc") == "retired": return { err = "持ち馬ではない" }
	if retired(h.sex).size() >= MAX_EACH and not h.get("gelding"): return { err = "引退した%sは%d頭まで。生産の画面で1頭放してから" % ["牝馬" if h.sex == "牝" else "牡馬", MAX_EACH] }
	HSWorld.unenter(id)
	G.reserve = HSU.or_(G.get("reserve"), []).filter(func(x): return x.id != id)
	var hall = HSHall.on_retire(h) if opts.get("hall") == true else null   # トロフィー1つ以上で、殿堂入りを選んだとき
	HSRaceRec.strip(h)   # レースの記録は消す（殿堂入りなら殿堂の写しに残る）
	if h.get("gelding"):
		G.horses.erase(id); HSWorld.dirty(); HSWorld.news("%sは引退して乗馬になった。おつかれさま。" % h.name, "info"); return { to = "gone", hall = hall }
	var b := bonus_of(h)
	h.loc = "retired"; h.retiredY = G.year; h.auto = false; h.parentBonus = b.pts
	# トロフィーで能力が上がる（上がった分は potUp に残す）
	h.potUp = {}
	for k in HSHorse.STATS:
		if h.pot.get(k) == null: continue
		var v: float = h.pot[k]
		var up: float = HSU.mn(float(HSU.or_(b.by.get(k), 0.0)), HSU.mx(0.0, POT_MAX - v))
		h.potUp[k] = HSMath.round_js(up * 10.0) / 10.0
		if up > 0: h.pot[k] = HSMath.round_js((v + up) * 10.0) / 10.0
	HSWorld.dirty()
	HSWorld.news("%sは引退し、牧場に残った。オリジナルホースの%sにできる%s。" % [h.name, "母" if h.sex == "牝" else "父", ("（トロフィー%sつで能力が上がった。最大 +%s）" % [HSU.num(b.trophies), HSU.num(b.pts)]) if b.pts else ""], "info")
	return { to = "retired", hall = hall }
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
	for p in [s, m]:
		if not foals_left(p): return { err = "%sはもう仔を作れない（1頭から%d頭まで）" % [p.name, foals_max()] }
	if not HSSeason.can_buy(): return { err = "お手馬は%s頭まで" % HSU.num(HSSeason.MAX_OWN) }
	var rng := HSRng.new(float(HSU.hash32("orig:%s:%s:%s:%s" % [HSU.num(G.seed), HSU.num(G.year), s.id, m.id])))
	var bonus := child_bonus(s, m)   # 前の版の引退馬だけ（いまは引退で親の能力が上がっている）
	var pot := {}
	for k in HSHorse.STATS:
		var a: float = HSU.or_(s.pot.get(k), 70.0); var b: float = m.pot[k] if m.pot.get(k) != null else a
		pot[k] = HSMath.round_js(HSU.clamp(inherit((a + b) / 2.0) + rng.normal(0.0, 6.0) + bonus, 40.0, 118.0) * 10.0) / 10.0
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
	HSOwners.apply_items(h)   # オーナーの依頼をやり終えてもらったアイテム（繁殖の永続のボーナス）
	HSHorse.sync_apt(h)
	G.horses[h.id] = h
	HSWorld.used_names()[nm] = true
	HSPed.register(nm, s.name, m.name)
	m.foalY = G.year
	HSWorld.dirty()
	HSWorld.news("オリジナルホース「%s」が生まれた！（父 %s・母 %s%s）" % [nm, s.name, m.name, ("・ボーナス +%s" % HSU.num(bonus)) if bonus else ""], "g1")
	# 作った数を数え、決まった数の仔を残した親は牧場を去る
	for p in [s, m]:
		p.origN = float(HSU.or_(p.get("origN"), 0.0)) + 1.0
		if not foals_left(p):
			G.horses.erase(p.id)
			HSWorld.news("%sは仔を%s頭残して、牧場を去った。" % [p.name, HSU.num(p.origN)], "info")
	return { horse = h, bonus = bonus, skills = pick }
