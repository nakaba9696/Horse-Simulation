# インブリード（js/core/inbreed.js の HS.Inbreed と同じ答え）：オリジナルホースの配合の選べない組み合わせ・因子・クロスの上がり・健康の下がり
# 決まりと数は js/core/inbreed.js の頭と docs/BALANCE.md「12. インブリード」
class_name HSInbreed

const BLOCK_PCT := 50.0
const TIERS := [
	{ min = 25.0, name = "濃い", up = 3.0, chance = 0.6, risk = 9.0 },
	{ min = 12.5, name = "ほどよい", up = 2.0, chance = 0.2, risk = 4.0 },
	{ min = 0.0, name = "薄い", up = 1.0, chance = 0.0, risk = 0.0 },
]
const SECOND := 0.5
const STAT_CAP := 3.0
const RISK_CAP := 20.0
const HEALTH_MIN := 20.0
const FACTOR_CLOSE := 2.0
const TRAIT_STAT := { "スピード": "spd", "瞬発力": "spd", "スタミナ": "sta", "持続力": "sta", "パワー": "slope", "底力": "guts" }

static var _cache: Dictionary = {}
static var _legends = null

static func reset() -> void:
	_cache = {}; _legends = null

static func top_stats(pot: Dictionary, n: int) -> Array:
	var a = null
	for k in HSHorse.STATS:
		if pot.get(k) != null and (a == null or float(pot[k]) > float(pot[a])): a = k
	if a == null: return []
	if n < 2: return [a]
	var b = null
	for k in HSHorse.STATS:
		if k != a and pot.get(k) != null and (b == null or float(pot[k]) > float(pot[b])): b = k
	return [a, b] if b != null and float(pot[b]) >= float(pot[a]) - FACTOR_CLOSE else [a]

static func orig_factor_of(h: Dictionary) -> Array:
	var up: Dictionary = HSU.or_(h.get("potUp"), {}); var pot: Dictionary = HSU.or_(h.get("pot"), {})
	var best = null
	for k in HSHorse.STATS:
		var u := float(HSU.or_(up.get(k), 0.0))
		if u > 0 and (best == null or u > float(up[best]) or (u == float(up[best]) and float(HSU.or_(pot.get(k), 0.0)) > float(HSU.or_(pot.get(best), 0.0)))): best = k
	return [best] if best != null else top_stats(pot, 1)

static func remember(h: Variant) -> void:
	var G = HSWorld.G
	if G == null or not h or not HSU.truthy(h.get("original")) or not HSU.truthy(h.get("name")): return
	if not G.get("origFactor"): G.origFactor = {}
	if not G.origFactor.get(h.name): G.origFactor[h.name] = orig_factor_of(h)

static func migrate(g: Dictionary) -> void:
	if not g.get("origFactor"): g.origFactor = {}
	if not g.get("pedExtra"): g.pedExtra = {}
	for h in HSU.or_(g.get("horses"), {}).values():
		if not HSU.truthy(h.get("original")) or not HSU.truthy(h.get("name")): continue
		if not g.pedExtra.get(h.name) and (HSU.truthy(h.get("sire")) or HSU.truthy(h.get("dam"))): g.pedExtra[h.name] = [HSU.or_(h.get("sire"), null), HSU.or_(h.get("dam"), null)]
		if h.get("loc") == "retired" and not g.origFactor.get(h.name): g.origFactor[h.name] = orig_factor_of(h)

static func factor_of(name: Variant) -> Array:
	if not name: return []
	var G = HSWorld.G
	if G != null and G.get("origFactor") and G.origFactor.get(name): return G.origFactor[name]
	if _cache.has(name): return _cache[name]
	var D := HSData.d()
	var hand = D.get("factors", {}).get(name)
	var f: Array = []
	if hand:
		for k in hand:
			if HSHorse.STATS.has(k) and f.size() < 2: f.append(k)
	else:
		if _legends == null:
			_legends = {}
			for x in D.get("legendsExtra", []):
				if not _legends.has(x.name): _legends[x.name] = x
		var d = HSWorld.histByName.get(name)
		if d == null: d = _legends.get(name)
		if d != null: f = top_stats(HSHorse.from_historic(d, "factor").pot, 2)
		else:
			var st = null
			for x in D.get("stallions", []):
				if x.name == name: st = x; break
			if st != null:
				for t in HSU.or_(st.get("traits"), []):
					var k = TRAIT_STAT.get(t)
					if not k: continue
					if st.get("surface") == "ダ": k = "dspd" if k == "spd" else ("dsta" if k == "sta" else k)
					if not f.has(k): f.append(k)
					if f.size() >= 2: break
	_cache[name] = f
	return f

static func tier_of(pct: float) -> int:
	var i := 0
	while i < TIERS.size() - 1 and pct < TIERS[i].min: i += 1
	return i

static func analyze(sire: Variant, dam: Variant) -> Dictionary:
	var t := HSPed.tree(sire, dam, 5)
	var pos := {}
	for g in t.size():
		var arr: Array = t[g]; var half := arr.size() / 2.0
		for i in arr.size():
			var n = arr[i]
			if not n: continue
			if not pos.has(n): pos[n] = []
			pos[n].append([g, i, 0 if i < half else 1])
	var list: Array = []
	for n in pos:
		var ps: Array = pos[n]
		var sg: Array = []; var dg: Array = []
		for p in ps:
			if p[2] == 0: sg.append(float(p[0] + 1))
			else: dg.append(float(p[0] + 1))
		if sg.is_empty() or dg.is_empty(): continue
		var pct := 0.0
		for p in ps: pct += HSMath.pow_(0.5, float(p[0] + 1))
		pct *= 100.0
		list.append({ name = n, sire = sg, dam = dg, label = "・".join(sg.map(func(x): return HSU.num(x))) + "×" + "・".join(dg.map(func(x): return HSU.num(x))), pct = pct, ps = ps })
	var names := {}
	for c in list: names[c.name] = true
	for c in list:
		var via := true
		for p in c.ps:
			var hit := false
			var i: int = p[1] >> 1
			var g: int = p[0] - 1
			while g >= 0:
				var n = t[g][i]
				if n and n != c.name and names.has(n): hit = true; break
				i >>= 1; g -= 1
			if not hit: via = false; break
		c.via = via
		c.erase("ps")
	list = HSU.stable_sort(list, func(a, b): return a.pct > b.pct)
	var up := {}; var raw := {}
	for k in HSHorse.STATS:
		up[k] = 0.0; raw[k] = 0.0
	var risk := 0.0
	for c in list:
		c.tier = tier_of(c.pct)
		c.factor = factor_of(c.name)
		c.up = {}
		if c.via or c.pct >= BLOCK_PCT: continue
		var T: Dictionary = TIERS[c.tier]
		for j in c.factor.size():
			var k = c.factor[j]
			var v: float = T.up if j == 0 else HSU.mx(1.0, HSMath.round_js(T.up * SECOND))
			c.up[k] = v; raw[k] += v
		risk += T.chance * T.risk
	for k in HSHorse.STATS: up[k] = HSU.mn(STAT_CAP, raw[k])
	var block = null
	var sp := HSPed.parents(sire); var dp := HSPed.parents(dam)
	if sire and dam and sp[0] and sp[1] and sp[0] == dp[0] and sp[1] == dp[1]: block = "近すぎる（全きょうだい）"
	else:
		for c in list:
			if c.pct >= BLOCK_PCT:
				block = "近すぎる（%sの%s）" % [c.name, c.label]; break
	return { block = block, crosses = list, up = up, raw = raw, risk = HSMath.round_js(HSU.mn(RISK_CAP, risk) * 10.0) / 10.0 }

static func health_drop(rng: HSRng, an: Dictionary) -> float:
	var d := 0.0
	for c in an.crosses:
		if c.via or c.pct >= BLOCK_PCT: continue
		var T: Dictionary = TIERS[c.tier]
		if T.chance > 0 and rng.chance(T.chance): d += T.risk * (0.5 + rng.next())
	return HSMath.round_js(HSU.mn(RISK_CAP, d))

static func up_text(up: Dictionary) -> String:
	var out: Array = []
	for k in HSHorse.STATS:
		if float(HSU.or_(up.get(k), 0.0)) != 0.0: out.append("%s＋%s" % [HSHorse.STAT_LABEL[k], HSU.num(up[k])])
	return "・".join(out)

static func text(c: Dictionary) -> String:
	var u := up_text(c.up)
	return "%sの%s（%s%s）" % [c.name, c.label, u if u != "" else ("効き目なし" if c.factor.size() else "因子なし"), "・健康が下がりやすい" if c.tier == 0 else ""]

static func shown(an: Dictionary) -> Array:
	return an.crosses.filter(func(c): return not c.via)
