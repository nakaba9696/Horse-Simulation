# レースの入れ口。見た目（ViewRace）はここから「t 秒の各馬の状態」を読むだけにする。
# いまは記録の再生（tools/export_race.js が書き出した replay_race.json）。gdcore の模擬（godot/core）ができたら、
# 同じ関数（horses_at・me_at・finish_of など）を模擬から返す入れ口を足して差し替える（docs/GODOT.md）。
# 記録の再生では、プレイヤーの操作は結果を変えない（見た目の進路・手綱の段・ムチの動きだけ）。
class_name ViewReplay
extends RefCounted

var race: Dictionary
var frames: Array
var dt := 0.1
var D := 2400.0
var me := 0
var n := 0
var win_t := 0.0
var finish_t: PackedFloat32Array = []   # 各馬がゴールした秒（記録から）
var order: PackedInt32Array = []         # 着順（馬の並びの番号）
var whips: Array = []                    # 自分の馬のムチ [t, 手]
var events: Array = []

func _init(path := "res://assets/replay_race.json") -> void:
	race = JSON.parse_string(FileAccess.get_file_as_string(path))
	frames = race.frames
	dt = float(race.dt)
	D = float(race.track.D)
	me = int(race.me)
	n = race.horses.size()
	win_t = float(race.winnerTime)
	whips = race.get("whips", [])
	events = race.get("events", [])
	finish_t.resize(n)
	finish_t.fill(-1.0)
	for i in range(1, frames.size()):
		var a: Array = frames[i - 1].p
		var b: Array = frames[i].p
		for j in n:
			if finish_t[j] < 0.0 and float(b[j][0]) >= D:
				var xa: float = a[j][0]
				var xb: float = b[j][0]
				var k := (D - xa) / maxf(1e-6, xb - xa)
				finish_t[j] = (i - 1 + k) * dt
	var idx: Array = range(n)
	idx.sort_custom(func(x, y): return _ft(x) < _ft(y))
	order = PackedInt32Array(idx)

func _ft(j: int) -> float:
	return finish_t[j] if finish_t[j] >= 0.0 else 1e9

func end_t() -> float:
	return (frames.size() - 1) * dt

func _fi(t: float) -> Array:
	var fi := clampf(t / dt, 0.0, frames.size() - 1.001)
	var i := int(floor(fi))
	return [i, fi - i]

# t 秒の各馬：[x, lane, v, 頭の上げ具合, 耳]（間は補間）
func horses_at(t: float) -> Array:
	var out: Array = []
	if t <= 0.0:
		var p0: Array = frames[0].p
		for j in n:
			out.append([0.0, float(p0[j][1]), 0.0, float(p0[j][3]) if p0[j].size() > 3 else 0.0, 0.4])
		return out
	var q := _fi(t)
	var a: Array = frames[q[0]].p
	var b: Array = frames[q[0] + 1].p
	var k: float = q[1]
	for j in n:
		var pa: Array = a[j]
		var pb: Array = b[j]
		var row := []
		for c in pa.size():
			row.append(lerpf(float(pa[c]), float(pb[c]), k))
		while row.size() < 5:
			row.append(0.4 if row.size() == 4 else 0.0)
		out.append(row)
	return out

# 自分の馬の手綱の段・気分・脚の残り・ムチの手（1＝右）・掛かり・詰まり
func me_at(t: float) -> Dictionary:
	var q := _fi(maxf(0.0, t))
	var f: Dictionary = frames[q[0]]
	var m: Array = f.get("me", [0, 30, 1, 1, 0, 0])
	return {"gear": float(m[0]), "tension": float(m[1]), "E": float(m[2]), "hand": int(m[3]), "kakari": int(m[4]) == 1, "blocked": int(m[5]) == 1}

# t までに入った自分の馬のムチの、最後のもの（無ければ null）
func last_whip(t: float):
	var w = null
	for x in whips:
		if float(x[0]) <= t:
			w = x
		else:
			break
	return w

func place_of(j: int) -> int:
	return order.find(j) + 1

# t の時点の順位（前から。ゴールした馬はゴールの順）
func ranking(t: float, H: Array) -> Array:
	var idx: Array = range(n)
	idx.sort_custom(func(x, y):
		var fx := finish_t[x] >= 0.0 and finish_t[x] <= t
		var fy := finish_t[y] >= 0.0 and finish_t[y] <= t
		if fx and fy:
			return finish_t[x] < finish_t[y]
		if fx != fy:
			return fx
		return float(H[x][0]) > float(H[y][0]))
	return idx

# t までに出た実況（最後のもの）
func telop_at(t: float) -> Array:
	var txt := ""
	var et := -99.0
	for e in events:
		if float(e.t) <= t:
			txt = String(e.text); et = float(e.t)
		else:
			break
	return [txt, et]
