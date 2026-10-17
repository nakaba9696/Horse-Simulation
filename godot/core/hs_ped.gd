# 血統（js/core/pedigree.js の HS.Ped と同じ）：血統表・クロス・ニックス・系統・配合の評価・仔の誕生
class_name HSPed

const LINE_ROOTS := ["サンデーサイレンス", "ロベルト", "ヘイルトゥリーズン", "ストームキャット", "ストームバード", "ダンジグ", "サドラーズウェルズ", "ヌレイエフ", "リファール", "ニジンスキー", "ノーザンテースト", "ヴァイスリージェント", "ノーザンダンサー",
	"キングマンボ", "フォーティナイナー", "ファピアノ", "ゴーンウエスト", "ミスタープロスペクター", "レイズアネイティヴ", "ネイティヴダンサー",
	"プリンスリーギフト", "グレイソヴリン", "ネヴァーベンド", "ボールドルーラー", "レッドゴッド", "ナスルーラ", "ロイヤルチャージャー", "ネアルコ",
	"ハイペリオン", "セントサイモン", "トウルビヨン", "マンノウォー", "ハンプトン", "パーソロン", "テディ", "ブランドフォード", "シリーン", "ファラリス"]

static var index: Dictionary = {}  # 名前 → [父, 母]
static var extra: Dictionary = {}  # ゲームの中で生まれた馬（セーブに入れる）

# データから血統の索引を作る（起動時と、ロードのあとに呼ぶ）
static func build(ext: Variant = null) -> void:
	var D := HSData.d(); var idx := {}
	var put := func(n, s, d, force: bool):
		if not n: return
		var cur = idx.get(n)
		if cur == null or force: idx[n] = [HSU.or_(s, HSU.or_(cur[0] if cur else null, null)), HSU.or_(d, HSU.or_(cur[1] if cur else null, null))]
		else: idx[n] = [HSU.or_(cur[0], HSU.or_(s, null)), HSU.or_(cur[1], HSU.or_(d, null))]
	for n in D.get("pedigree", {}):
		var pd: Array = D.pedigree[n]; put.call(n, pd[0], pd[1], true)
	for h in D.get("historic", []):
		put.call(h.name, h.get("sire"), h.get("dam"), false)
		if h.get("dam") and h.get("damsire"): put.call(h.dam, h.damsire, null, false)
	for m in D.get("mares", []): put.call(m.name, m.get("sire"), m.get("dam"), false)
	if ext != null: extra = ext
	for n in extra:
		var pd: Array = extra[n]; put.call(n, pd[0], pd[1], true)
	index = idx
static func register(name: String, sire: Variant, dam: Variant) -> void:
	extra[name] = [HSU.or_(sire, null), HSU.or_(dam, null)]; index[name] = [HSU.or_(sire, null), HSU.or_(dam, null)]
static func parents(name: Variant) -> Array:
	if name and index.has(name): return index[name]
	return [null, null]

# 血統表（世代ごとの配列）
static func tree(sire: Variant, dam: Variant, depth: int = 5) -> Array:
	var gens: Array = [[HSU.or_(sire, null), HSU.or_(dam, null)]]
	for g in range(1, depth):
		var nxt: Array = []
		for n in gens[g - 1]:
			var pr := parents(n); nxt.append(pr[0]); nxt.append(pr[1])
		gens.append(nxt)
	return gens

# 父系をたどって系統を決める
static func line_of(name: Variant) -> String:
	var n = name; var guard := 0
	while n and guard < 25:
		guard += 1
		if LINE_ROOTS.has(n): return n + "系"
		n = parents(n)[0]
	return "その他"
static func male_line(name: Variant) -> Array:
	var out: Array = []; var n = name; var guard := 0
	while n and guard < 25:
		guard += 1
		out.append(n); n = parents(n)[0]
	return out

# 数の配列を JS の既定の sort（文字の順）で並べる
static func _sort_str(a: Array) -> Array:
	return HSU.stable_sort(a, func(x, y): return HSU.num(x) < HSU.num(y))

# クロス（父方と母方の両方に出る祖先）
static func crosses(sire: Variant, dam: Variant) -> Array:
	var t := tree(sire, dam, 5)
	var sireSide := {}; var damSide := {}
	for g in t.size():
		var arr: Array = t[g]; var half := arr.size() / 2.0
		for i in arr.size():
			var n = arr[i]
			if not n: continue
			var m: Dictionary = sireSide if i < half else damSide
			if not m.has(n): m[n] = []
			m[n].append(float(g + 1))
	var out: Array = []
	for n in sireSide:
		if not damSide.has(n): continue
		var sg: Array = sireSide[n]; var dg: Array = damSide[n]
		var pct := 0.0
		for g in sg + dg: pct = pct + HSMath.pow_(0.5, g)
		pct *= 100.0
		sg = _sort_str(sg); dg = _sort_str(dg)
		out.append({ name = n, sire = sg, dam = dg, pct = pct, label = "%s×%s" % ["・".join(sg.map(func(x): return HSU.num(x))), "・".join(dg.map(func(x): return HSU.num(x)))] })
	return HSU.stable_sort(out, func(a, b): return a.pct > b.pct)

# ニックス：父の父系に A、母父の父系に B
static func nicks(sire: Variant, dam: Variant) -> Array:
	var damsire = parents(dam)[0]
	if not sire or not damsire: return []
	var sl := male_line(sire).slice(0, 3); var dl := male_line(damsire).slice(0, 3)
	return HSData.d().get("nicks", []).filter(func(p): return sl.has(p[0]) and dl.has(p[1]))

static func sire_rating(stallion: Variant) -> float:
	if not stallion: return 50.0
	if stallion.get("rating") != null: return stallion.rating
	return 55.0
static func mare_quality(mare: Dictionary, _w_idx: Variant = null) -> float:
	if mare.get("quality") != null: return mare.quality
	var peak := HSHorse.overall(mare.pot) if mare.get("pot") else 55.0
	var sire = HSWorld.find_stallion(mare.get("sire"))
	var sr := sire_rating(sire) if sire else 55.0
	var q := peak * 0.75 + sr * 0.25
	for g in HSU.or_(mare.get("gradedWins"), []):
		if g.get("grade") == "G1": q += 4.0; break
	return HSU.clamp(q, 30.0, 98.0)

static func _min_of(a: Array) -> float:
	var m := HSMath.INF
	for v in a: m = HSU.mn(m, v)
	return m

# 配合の評価
static func evaluate(stallion: Dictionary, mare: Dictionary) -> Dictionary:
	var cr := crosses(stallion.name, mare.name)
	var nk := nicks(stallion.name, mare.name)
	var famous := func(n):
		for st in HSData.d().get("stallions", []):
			if st.name == n: return st.get("rating") != null and st.rating >= 75 or LINE_ROOTS.has(n)
		return LINE_ROOTS.has(n)
	var burst := 0.0; var risk := 0.0; var notes: Array = []
	for c in cr:
		var minSire := _min_of(c.sire); var minDam := _min_of(c.dam)
		if (minSire <= 2 and minDam <= 2) or c.pct > 30:
			risk += 3.0; notes.append("%s %s：近すぎる（体質に不安）" % [c.name, c.label])
		elif c.pct > 19:
			risk += 1.5; burst += 2.5 if famous.call(c.name) else 1.0; notes.append("%s %s：濃いめ（爆発力と不安が同居）" % [c.name, c.label])
		elif _min_of(c.sire + c.dam) >= 3:
			burst += 2.0 if famous.call(c.name) else 0.8; notes.append("%s %s：好ましいクロス" % [c.name, c.label])
		else:
			burst += 0.5; notes.append("%s %s" % [c.name, c.label])
	burst = HSU.mn(burst, 5.0)
	var nickBonus := 3.0 if nk.size() else 0.0
	for n in nk: notes.append("ニックス：%s × %s" % [n[0], n[1]])
	var sr := sire_rating(stallion); var mq := mare_quality(mare)
	var mean := 38.0 + 0.26 * sr + 0.22 * mq + burst + nickBonus - risk
	var fit := 0.0
	if mare.get("distMin") != null:
		var mMid: float = (mare.distMin + mare.distMax) / 2.0
		var sMid: float = (stallion.distMin + stallion.distMax) / 2.0
		if absf(mMid - sMid) > 800:
			fit -= 1.0; notes.append("距離の傾向が父と母で離れている")
	var score := mean + fit
	var rank := "S" if score >= 84 else ("A" if score >= 78 else ("B" if score >= 72 else ("C" if score >= 66 else "D")))
	return { crosses = cr, nicks = nk, burst = burst, risk = risk, mean = score, rank = rank, notes = notes, sireLine = line_of(stallion.name), damsireLine = line_of(parents(mare.name)[0]) }

# 仔を作る（産まれた時点）
static func make_foal(rng: HSRng, stallion: Dictionary, mare: Dictionary, _year: float) -> Dictionary:
	var ev := evaluate(stallion, mare)
	var talent := rng.normal(0.0, 5.5) + (rng.normal(0.0, ev.burst * 0.6) if ev.burst > 0 else 0.0)
	var prof := { spd = 0.0, sta = 0.0, guts = 0.0, mind = 0.0, slope = 0.0 }
	var tr: Array = HSU.or_(stallion.get("traits"), [])
	if tr.has("スタミナ"): prof.sta += 4.0
	if tr.has("スピード"): prof.spd += 4.0
	if tr.has("パワー"): prof.slope += 5.0
	if tr.has("底力"): prof.guts += 4.0
	if tr.has("持続力"):
		prof.sta += 2.0; prof.guts += 2.0
	if tr.has("気性難"): prof.mind -= 6.0
	var pot := {}
	for k in HSHorse.STATS:
		var m := 0.0
		if mare.get("pot") and mare.pot.get(k) != null: m = (mare.pot[k] - HSHorse.overall(mare.pot)) * 0.3
		pot[k] = HSU.clamp(ev.mean + talent + float(HSU.or_(prof.get(k), 0.0)) + m + rng.normal(0.0, 4.0), 25.0, 106.0)
	var sSurf: String = HSU.or_(stallion.get("surface"), "芝")
	var sTurf := 45.0 if sSurf == "ダ" else (85.0 if sSurf == "芝ダ" else 95.0)
	var sDirt := 50.0 if sSurf == "芝" else (85.0 if sSurf == "芝ダ" else 95.0)
	var mTurf: float = mare.apt.turf if mare.get("apt") else (50.0 if mare.get("surface") == "ダ" else 85.0)
	var mDirt: float = mare.apt.dirt if mare.get("apt") else (95.0 if mare.get("surface") == "ダ" else 60.0)
	var apt := {}
	apt.turf = HSU.clamp(sTurf * 0.6 + mTurf * 0.4 + rng.normal(0.0, 8.0), 30.0, 100.0)
	apt.dirt = HSU.clamp(sDirt * 0.6 + mDirt * 0.4 + rng.normal(0.0, 8.0), 30.0, 100.0)
	apt.heavy = HSU.clamp(50.0 + rng.normal(0.0, 18.0) + (20.0 if tr.has("道悪") else 0.0), 10.0, 100.0)
	HSHorse.split_surface({ pot = pot, apt = apt }, rng)
	var mMin: float = HSU.or_(mare.get("distMin"), HSU.or_(stallion.get("distMin"), 1600.0))
	var mMax: float = HSU.or_(mare.get("distMax"), HSU.or_(stallion.get("distMax"), 2400.0))
	var dMin := HSMath.round_js((float(HSU.or_(stallion.get("distMin"), 1600.0)) * 0.6 + mMin * 0.4 + rng.normal(0.0, 150.0)) / 100.0) * 100.0
	var dMax := HSMath.round_js((float(HSU.or_(stallion.get("distMax"), 2400.0)) * 0.6 + mMax * 0.4 + rng.normal(0.0, 200.0)) / 100.0) * 100.0
	dMin = HSU.clamp(dMin, 1000.0, 3000.0); dMax = HSU.clamp(HSU.mx(dMax, dMin + 400.0), 1400.0, 4000.0)
	if pot.sta - pot.spd > 6: dMax = HSU.mn(4000.0, dMax + 200.0)
	if pot.spd - pot.sta > 6: dMin = HSU.mx(1000.0, dMin - 200.0)
	var growth
	var r := rng.next()
	if r < 0.5: growth = HSU.or_(stallion.get("growth"), "普通")
	elif r < 0.75: growth = HSU.or_(mare.get("growth"), "普通")
	else: growth = rng.pick(HSHorse.GROWTHS)
	if not HSHorse.GROWTHS.has(growth): growth = "普通"
	var sKire: float = HSU.or_(stallion.get("kire"), 6.5 if tr.has("瞬発力") else (3.0 if tr.has("持続力") else (3.8 if tr.has("パワー") else 4.5)))
	var kire := HSU.clamp(HSMath.round_js(sKire * 0.6 + float(HSU.or_(mare.get("kire"), 4.5)) * 0.4 + rng.normal(0.0, 1.1)), 1.0, 8.0)
	var style
	if kire >= 6: style = rng.pick(["差し", "差し", "追込", "先行"])
	elif kire <= 3: style = rng.pick(["逃げ", "先行", "先行", "差し"])
	else: style = rng.pick(["先行", "差し", "先行", "差し", "逃げ", "追込"])
	var health := HSU.clamp(75.0 + rng.normal(0.0, 12.0) + (10.0 if tr.has("丈夫") else 0.0) + (-10.0 if tr.has("体質弱") else 0.0) - ev.risk * 6.0, 10.0, 100.0)
	var skills: Array = []
	for id in HSU.or_(stallion.get("skills"), []) + HSU.or_(mare.get("skills"), []):
		if not skills.has(id) and rng.chance(0.25): skills.append(id)
	if rng.chance(0.12):
		var id = rng.pick(HSHorse.SKILLS.keys())
		if not skills.has(id): skills.append(id)
	var out := { pot = pot, apt = apt, distMin = dMin, distMax = dMax, growth = growth }
	out.peakShift = rng.normal(0.0, 0.2); out.style = style; out.kire = kire; out.skills = skills; out.health = health
	out.sex = "牡" if rng.chance(0.5) else "牝"; out.ev = ev
	return out
