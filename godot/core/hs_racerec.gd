# お手馬のレースの記録（js/core/racerec.js の HS.RaceRec と同じ。持ち主の決定 2026-10-20）
# 自分の持ち馬が走ったレースは、戦績の1走に rec を付けて残す：
#   rec.f   ＝ 出走馬（着順の並び）。1頭 [馬名, 馬番, タイム（0.1秒の整数）, 着差の言葉, 人気, 騎手]。枠は馬番と頭数から（HSWorld.frame_of）
#   rec.lap ＝ 先頭の200mごとのラップ（0.1秒の整数。最初は距離の端数。足すと勝ち時計）。区切りを全部とれなかったときは []
# 引退したら消す（strip）。殿堂入りした馬は殿堂の写し（G.hallOwn の results）に残る
class_name HSRaceRec

static func _t10(x: float) -> float: return HSMath.round_js(x * 10.0)

static func make(race: Dictionary, sim: Dictionary) -> Dictionary:
	var f: Array = []
	for r in sim.results:
		f.append([String(r.horse.name), r.get("num"), _t10(float(r.time)), String(HSU.or_(r.get("margin"), "")), float(HSU.or_(r.get("pop"), 0.0)), String(r.jockey.name) if r.get("jockey") else ""])
	var lap: Array = []
	var sp: Array = HSU.or_(sim.get("splits"), [])
	if sp.size() and sp.size() == HSSim.lap_marks(float(race.dist)).size():
		var prev := 0.0
		for x in sp:
			var c := _t10(float(x))
			lap.append(c - prev)
			prev = c
		lap.append(_t10(float(sim.results[0].time)) - prev)
	return { f = f, lap = lap }

static func has(r: Variant) -> bool:
	return r is Dictionary and r.get("rec") is Dictionary and (r.rec.get("f", []) as Array).size() > 0

# 出走馬の行（枠・着順つき）
static func rows(r: Dictionary) -> Array:
	if not has(r): return []
	var fs: Array = r.rec.f
	var n := fs.size()
	var out: Array = []
	for k in n:
		var x: Array = fs[k]
		out.append({ pos = k + 1, name = String(x[0]), num = x[1], frame = HSWorld.frame_of(int(x[1]), n) if x[1] != null else 0.0, time = float(x[2]) / 10.0, margin = String(x[3]), pop = float(x[4]), jockey = String(x[5]) })
	return out

# ラップ（秒）
static func laps(r: Dictionary) -> Array:
	if not has(r): return []
	return (r.rec.get("lap", []) as Array).map(func(v): return float(v) / 10.0)

static func strip(h: Variant) -> void:
	if not (h is Dictionary): return
	for r in HSU.or_(h.get("results"), []):
		if r is Dictionary: r.erase("rec")
