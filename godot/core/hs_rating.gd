# レーティング（js/core/rating.js の HS.Rating と同じ。持ち主の仕様書 2026-10-19「レーティングの付け方は着差や勝った相手で決めたい」）
# 1走ごとの値（h.results[].rt）を、レースが終わったときに付ける（HSWorld.apply_results から annotate）。
#   相手1頭ごとの見積もり ＝ 相手の評価 ＋ 相手との着差（馬身）× 1馬身の重さ。その走りの値 ＝ 見積もりの加重平均（着差の近い相手ほど重い）
#   相手の評価 ＝ 定まったレーティング（同じ馬場で3走以上）か、いまの総合力からの見積もりと混ぜたもの
# 馬のレーティング ＝ 良かった3走の平均。部門（短距離・マイル・中距離・長距離・ダート）ごとにも出せる（of(h, 部門)）。
# 式の並びは JS と同じにする（世界の進行の一致テストがセーブの指紋で確かめる）
class_name HSRating

const BASE := 110.0
const FH0 := 62.0
const PER_FH := 1.25
const MIN := 40.0
const MAX := 150.0
const GAP_CAP := 12.0
const NEED := 3.0
const TOP := 3
const DIVS := [
	{ id = "sprint", label = "短距離", note = "芝1400mまで" },
	{ id = "mile", label = "マイル", note = "芝1401〜1899m" },
	{ id = "mid", label = "中距離", note = "芝1900〜2100m" },
	{ id = "long", label = "長距離", note = "芝2101m以上" },
	{ id = "dirt", label = "ダート", note = "ダート" },
]

static func div_of(surface: Variant, dist: float) -> String:
	if surface == "ダ": return "dirt"
	if dist <= 1400.0: return "sprint"
	if dist <= 1899.0: return "mile"
	if dist <= 2100.0: return "mid"
	return "long"

static func _in_div(r: Dictionary, div: Variant) -> bool:
	if div == null or div == "": return true
	if div == "turf": return r.get("surface") != "ダ"
	return div_of(r.get("surface"), float(r.dist)) == div

static func lb_per_length(dist: float) -> float: return HSU.clamp(4200.0 / dist, 1.2, 3.2)

# 馬のレーティング（部門 div。null は全部）：{ v, n, best } か null
static func of(h: Variant, div: Variant = null) -> Variant:
	var xs: Array = []
	if h == null: return null
	for r in HSU.or_(h.get("results"), []):
		if r.get("rt") != null and _in_div(r, div): xs.append(float(r.rt))
	if xs.is_empty(): return null
	xs.sort_custom(func(a, b): return a > b)
	var k := mini(TOP, xs.size())
	var s := 0.0
	for i in k: s += xs[i]
	return { v = HSMath.round_js(s / float(k)), n = float(xs.size()), best = xs[0] }

static func table(h: Variant) -> Dictionary:
	var o := { all = of(h, null) }
	for d in DIVS: o[d.id] = of(h, d.id)
	return o

static func prior(h: Dictionary, surface: String, wIdx: float) -> float:
	return BASE + PER_FH * (HSSeason.fh(h, wIdx, surface) - FH0)

static func value(h: Dictionary, surface: String, wIdx: float) -> float:
	var r = of(h, "dirt" if surface == "ダ" else "turf")
	var n: float = HSU.mn(NEED, float(r.n)) if r != null else 0.0
	if n >= NEED: return float(r.v)
	var p := prior(h, surface, wIdx)
	return (n * float(r.v) + (NEED - n) * p) / NEED if n > 0.0 else p

# レースの結果（着順の並び。各 res に horse・lengths）に、走りの値 res.rt を付ける
static func annotate(race: Dictionary, results: Array, wIdx: float) -> void:
	var n := results.size()
	if n == 0: return
	var lpl := lb_per_length(float(race.dist))
	var L: Array = []
	var cum := 0.0
	for k in n:
		if k > 0: cum += HSU.mn(float(HSU.or_(results[k].get("lengths"), 0.0)), GAP_CAP)
		L.append(cum)
	var v: Array = []
	for res in results: v.append(value(res.horse, String(race.surface), wIdx))
	for i in n:
		var s := 0.0
		var sw := 0.0
		for j in n:
			if j == i: continue
			var d := HSU.clamp(float(L[j]) - float(L[i]), -GAP_CAP, GAP_CAP)
			var w := 1.0 / (1.0 + 0.4 * absf(d))
			s += w * (float(v[j]) + d * lpl)
			sw += w
		results[i].rt = HSU.clamp(HSMath.round_js(s / sw if sw > 0.0 else float(v[i])), MIN, MAX)
