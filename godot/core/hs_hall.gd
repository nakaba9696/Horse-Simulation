# 殿堂（お手馬。js/core/hall.js の HS.Hall と同じ）：トロフィーを2つ以上手にした自分の馬は、引退したときに殿堂入りし、記録の写しが残る
class_name HSHall

const NEED := 2
static func trophies_of(h: Dictionary) -> Array:
	var G = HSWorld.G
	var out: Array = []
	var tr: Dictionary = HSU.or_(G.get("trophies"), {})
	for id in tr:
		var v = tr[id]
		if not v: continue
		var label = HSTrophy.by()[id].label if HSTrophy.by().has(id) else id
		if (v.hid == h.id) if v.get("hid") else (v.horse == h.name):
			out.append({ id = id, label = label, y = v.y, bonus = HSU.or_(v.get("bonus"), 0.0) })
		else:
			for m in HSU.or_(v.get("more"), []):   # GF のトロフィーは2頭目からの勝ち馬にも
				if m.hid == h.id:
					out.append({ id = id, label = label, y = m.y, bonus = 0.0 }); break
	return HSU.stable_sort(out, func(a, b): return a.y < b.y)
static func eligible(h: Variant) -> bool: return h != null and h.get("owner") == "P" and trophies_of(h).size() >= NEED
static func list() -> Array:
	return HSU.stable_sort(HSU.or_(HSWorld.G.get("hallOwn"), []).duplicate(), func(a, b):
		if a.trophies.size() != b.trophies.size(): return a.trophies.size() > b.trophies.size()
		if a.g1 != b.g1: return a.g1 > b.g1
		return a.retiredY < b.retiredY)
static func by_id(id: String) -> Variant:
	for x in HSU.or_(HSWorld.G.get("hallOwn"), []):
		if x.id == id: return x
	return null
static func on_retire(h: Dictionary) -> Variant:
	var G = HSWorld.G
	if not eligible(h): return null
	if not G.get("hallOwn"): G.hallOwn = []
	if G.hallOwn.any(func(x): return x.id == h.id): return null
	var fh := HSSeason.fh_peak(h)
	var res: Array = HSU.or_(h.get("results"), []).map(func(r): return r.duplicate())
	var g1 := 0
	for g in HSU.or_(h.get("gradedWins"), []):
		if g.get("grade") == "G1" or g.get("grade") == "GF": g1 += 1
	var e := { id = h.id, name = h.name, born = h.born, sex = h.sex, coat = h.get("coat"), sire = h.get("sire"), dam = h.get("dam"), hist = HSU.truthy(h.get("hist")), original = HSU.truthy(h.get("original")),
		style = h.get("style"), kire = h.get("kire"), skills = HSOriginal.skills_of(h),
		starts = HSU.or_(h.get("starts"), 0.0), wins = HSU.or_(h.get("wins"), 0.0), w2 = HSU.or_(h.get("w2"), 0.0), w3 = HSU.or_(h.get("w3"), 0.0), prize = HSU.or_(h.get("prize"), 0.0),
		g1 = float(g1), gradedWins = HSU.or_(h.get("gradedWins"), []).map(func(g): return g.duplicate()),
		trophies = trophies_of(h), titles = HSU.or_(h.get("titles"), []).duplicate(),
		fh = { turf = fh.turf, dirt = fh.dirt }, first = res[0].y if res.size() else G.year, retiredY = G.year, results = res }
	G.hallOwn.append(e)
	HSWorld.dirty()
	HSWorld.news("%sが殿堂入りした！（トロフィー %s）" % [h.name, "・".join(e.trophies.map(func(t): return t.label))], "g1")
	return e
