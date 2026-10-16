# コースの形（js/core/track.js の HS.Track と同じ）。ゴールからさかのぼった距離 s から、上から見た位置・曲がり・コーナー・高さ・勾配を出す。
#   var cf := HSTrack.for_race(race)   # { geo, track, dir, layout }（JS の T.forRace）
#   cf.track.at(s) → { x, y, curv, corner }・cf.track.h_at(s)（高さ m）・cf.track.g_at(s)（走る向きの勾配。上りが正）
# data/layouts.js（実際の回り）がある場は fromLayout、無ければ直線と半円（make）
class_name HSTrack
extends RefCounted

const STEP := 0.5

var L: float
var a: float
var r: float
var straight: float
var sign_: float
var flat := false
var line := false
var id := ""
var layout: Variant = null
# 楕円（make）のとき
var _ell := false
var _goalX: float
var _seg1: float
# 実際の回り（fromLayout）のとき
var n: int
var dl: float
var X := PackedFloat64Array()
var Y := PackedFloat64Array()
var K := PackedFloat64Array()
var C := PackedInt32Array()
var Hs := PackedFloat64Array()

static func _u01(v: float) -> float:
	return 0.0 if v < 0.0 else (1.0 if v > 1.0 else v)

# lap＝1周の長さ、straight＝最後の直線、dir＝'左'|'右'（回る向き）
static func make(lap: float, straight_: float, dir: Variant) -> HSTrack:
	var t := HSTrack.new()
	t._ell = true
	var L_: float = HSU.or_(lap, 2000.0)
	var minR := L_ * 0.06
	var runout := HSU.mn(170.0, HSU.mx(90.0, L_ * 0.07))
	var a_ := HSU.mx(float(HSU.or_(straight_, 400.0)) + runout, L_ * 0.22)
	var r_ := (L_ - 2.0 * a_) / (2.0 * PI)
	if r_ < minR:
		r_ = minR; a_ = (L_ - 2.0 * PI * r_) / 2.0
	var st := HSU.mn(a_, HSU.or_(straight_, a_))
	t.sign_ = -1.0 if dir == "左" else 1.0
	t._goalX = st - a_ / 2.0
	t._seg1 = a_ / 2.0 + t._goalX
	t.L = L_; t.a = a_; t.r = r_; t.straight = st; t.flat = true
	return t

static func from_layout(lay: Dictionary, dir: Variant) -> HSTrack:
	var t := HSTrack.new()
	t.sign_ = -1.0 if dir == "左" else 1.0
	var segs: Array = lay.get("segs") if lay.get("segs") else [["S", HSU.or_(lay.get("lap"), 2000.0)]]
	t.line = HSU.truthy(lay.get("line")) or HSU.truthy(lay.get("open"))
	var turn := 0.0
	for g in segs:
		turn = turn + (float(g[3]) if g[0] == "C" else 0.0)
	var kTurn := 360.0 / turn if (not t.line and turn) else 1.0
	var parts: Array = []
	for g in segs:
		if g[0] != "C":
			parts.append({ len = float(g[1]), th = 0.0, c = 0 })
		else:
			var th: float = float(g[3]) * kTurn * PI / 180.0
			parts.append({ len = absf(th) * (float(g[1]) + float(g[2])) / 2.0, th = th, r0 = float(g[2]), r1 = float(g[1]), c = int(HSU.or_(g[4] if g.size() > 4 else null, 3)) })
	var L_ := 0.0
	for q in parts: L_ = L_ + q.len
	var n_ := int(ceilf(L_ / STEP)) + 1
	var dl_ := L_ / (n_ - 1)
	t.X.resize(n_); t.Y.resize(n_); t.K.resize(n_); t.C.resize(n_)
	var x := 0.0; var y := 0.0; var th := PI; var pi_ := 0; var u0 := 0.0
	for i in n_:
		var s := i * dl_
		while pi_ < parts.size() - 1 and s > u0 + parts[pi_].len:
			u0 += parts[pi_].len; pi_ += 1
		var q: Dictionary = parts[pi_]
		var k := _k_at(q, HSU.mx(0.0, HSU.mn(q.len, s - u0)))
		t.X[i] = x; t.Y[i] = y; t.K[i] = k; t.C[i] = q.c
		if i < n_ - 1:
			th += k * dl_ / 2.0; x += HSMath.cos_(th) * dl_; y += HSMath.sin_(th) * dl_; th += k * dl_ / 2.0
	# 周回は終わりが始まりに戻るように、ずれを少しずつ割り振る
	if not t.line:
		var ex := t.X[n_ - 1]; var ey := t.Y[n_ - 1]
		for i in n_:
			t.X[i] -= ex * i / (n_ - 1); t.Y[i] -= ey * i / (n_ - 1)
	var x0 := HSMath.INF; var x1 := -HSMath.INF; var y0 := HSMath.INF; var y1 := -HSMath.INF
	for i in n_:
		x0 = HSU.mn(x0, t.X[i]); x1 = HSU.mx(x1, t.X[i]); y0 = HSU.mn(y0, t.Y[i]); y1 = HSU.mx(y1, t.Y[i])
	var cx := (x0 + x1) / 2.0; var cy := (y0 + y1) / 2.0
	for i in n_:
		t.X[i] -= cx; t.Y[i] -= cy
	t.r = HSU.mx(1.0, (y1 - y0) / 2.0); t.a = HSU.mx(0.0, (x1 - x0) - 2.0 * t.r)
	# 高さ
	var E: Array = (lay.get("elev") if lay.get("elev") and lay.get("elev").size() else [[0.0, 0.0]]).duplicate()
	E = HSU.sort_by(E, func(p): return float(p[0]))
	var H := PackedFloat64Array(); H.resize(n_)
	for i in n_: H[i] = _h_raw(E, i * dl_)
	t.Hs.resize(n_)
	var w := maxi(1, int(HSMath.round_js(8.0 / dl_)))
	for i in n_:
		var tt := 0.0; var c := 0
		for j in range(-w, w + 1):
			var k := i + j
			if t.line: k = maxi(0, mini(n_ - 1, k))
			else: k = ((k % (n_ - 1)) + (n_ - 1)) % (n_ - 1)
			tt += H[k]; c += 1
		t.Hs[i] = tt / c
	t.L = L_; t.n = n_; t.dl = dl_
	t.straight = HSU.mn(HSU.or_(lay.get("straight"), L_), L_)
	t.id = HSU.or_(lay.get("id"), "")
	t.layout = lay
	return t

static func _k_at(q: Dictionary, u: float) -> float:
	if not q.th: return 0.0
	var T: float = absf(q.th); var a_: float = (q.r1 - q.r0) / (2.0 * T); var b: float = q.r0
	var phi: float = u / b if absf(a_) < 1e-9 else (-b + sqrt(HSU.mx(0.0, b * b + 4.0 * a_ * u))) / (2.0 * a_)
	return HSMath.sign_js(q.th) / (q.r0 + (q.r1 - q.r0) * _u01(phi / T))

static func _h_raw(E: Array, s: float) -> float:
	if E.size() == 1: return float(E[0][1])
	if s <= float(E[0][0]): return float(E[0][1])
	for i in range(1, E.size()):
		if s <= float(E[i][0]):
			var s0 := float(E[i - 1][0]); var h0 := float(E[i - 1][1]); var s1 := float(E[i][0]); var h1 := float(E[i][1])
			return h0 + (h1 - h0) * (s - s0) / HSU.mx(1e-6, s1 - s0)
	return float(E[E.size() - 1][1])

# 区切りの番号と割合（i・f・over）
var _i := 0
var _f := 0.0
var _over := 0.0
func _idx(s: float) -> void:
	if line:
		var sc := HSU.mx(0.0, HSU.mn(L, s))
		_i = mini(n - 2, int(floorf(sc / dl))); _f = _u01(sc / dl - floorf(sc / dl)); _over = s - sc
	else:
		s = fmod(fmod(s, L) + L, L)
		_i = mini(n - 2, int(floorf(s / dl))); _f = s / dl - _i; _over = 0.0

# ゴールからさかのぼった距離 s の地点：x・y（上から見た位置）、curv（進む向きに対する曲がり。左へ曲がるなら負）、corner（3＝3・4コーナー、1＝1・2コーナー、0＝直線）
func at(s: float) -> Dictionary:
	if _ell: return _at_ell(s)
	_idx(s)
	var i := _i; var f := _f; var over := _over
	var px := X[i] + (X[i + 1] - X[i]) * f
	var py := Y[i] + (Y[i + 1] - Y[i]) * f
	if over:
		var hx := X[n - 1] - X[n - 2]; var hy := Y[n - 1] - Y[n - 2]; var l: float = HSU.or_(HSMath.hypot(hx, hy), 1.0)
		if over > 0.0:
			px += hx / l * over; py += hy / l * over
	if line and s < 0.0:
		var hx := X[1] - X[0]; var hy := Y[1] - Y[0]; var l: float = HSU.or_(HSMath.hypot(hx, hy), 1.0)
		px = X[0] + hx / l * s; py = Y[0] + hy / l * s
	var j := i if f < 0.5 else i + 1
	return { x = px * sign_, y = py, curv = K[j] * sign_, corner = C[j] }

func _at_ell(s: float) -> Dictionary:
	s = fmod(fmod(s, L) + L, L)
	var u := s; var x: float; var y: float; var curv := 0.0; var corner := 0
	if u <= _seg1:
		x = _goalX - u; y = r
	else:
		u -= _seg1
		if u <= PI * r:
			var ang := PI / 2.0 + u / r; x = -a / 2.0 + HSMath.cos_(ang) * r; y = HSMath.sin_(ang) * r; curv = 1.0 / r; corner = 3
		else:
			u -= PI * r
			if u <= a:
				x = -a / 2.0 + u; y = -r
			else:
				u -= a
				if u <= PI * r:
					var ang := -PI / 2.0 + u / r; x = a / 2.0 + HSMath.cos_(ang) * r; y = HSMath.sin_(ang) * r; curv = 1.0 / r; corner = 1
				else:
					u -= PI * r; x = a / 2.0 - u; y = r
	return { x = x * sign_, y = y, curv = curv * sign_, corner = corner }

# 高さ（m）
func h_at(s: float) -> float:
	if _ell: return 0.0
	_idx(s)
	return Hs[_i] + (Hs[_i + 1] - Hs[_i]) * _f
# 走る向き（残りが減る向き）の勾配：上りが正
func g_at(s: float) -> float:
	if _ell: return 0.0
	return (h_at(s - 5.0) - h_at(s + 5.0)) / 10.0
# コーナーの中か（3・4コーナー＝3、1・2コーナー＝1、直線＝0）
func corner_at(R: float) -> int:
	return at(HSU.mx(0.0, R)).corner

# レースの競馬場・芝ダート・距離から、使う回りを選ぶ（data/layouts.js が無い場は null）
static func layout_of(race: Dictionary) -> Variant:
	var LY = HSData.d().get("layouts", {}).get(race.course)
	if not LY: return null
	var list = LY.get("dirt") if race.surface == "ダ" else LY.get("turf")
	if not list or not list.size(): return null
	if race.get("loop"):
		for l in list:
			if l.get("id") == race.loop: return l
	for l in list:
		if l.get("use", []).has(float(race.dist)): return l
	for l in list:
		if not l.get("line"): return l
	return list[0]

static var _cache: Array = [] # [回り（data の辞書そのもの）, 向き, 形]
# レースのコース：geo（lap・straight・slope・speed）と track
static func for_race(race: Dictionary) -> Dictionary:
	var Cs: Dictionary = HSData.d().get("courses", {})
	var course: Dictionary = Cs.get(race.course, Cs.get("東京", {}))
	var base: Dictionary = HSU.or_(course.get("dirt") if race.surface == "ダ" else course.get("turf"), HSU.or_(course.get("turf"), HSU.or_(course.get("dirt"), { lap = 2000.0, straight = 400.0, slope = "平" })))
	var lay = layout_of(race)
	var dir = course.get("dir")
	if not lay:
		return { geo = base, track = make(HSU.or_(base.get("lap"), 0.0), HSU.or_(base.get("straight"), 0.0), dir), dir = dir, layout = null }
	# 同じ回り・向きの形は使い回す（形は変わらない）
	var track: HSTrack = null
	for e in _cache:
		if is_same(e[0], lay) and e[1] == dir: track = e[2]; break
	if track == null:
		track = from_layout(lay, dir); _cache.append([lay, dir, track])
	var geo := base.duplicate()
	geo.lap = HSMath.round_js(track.L); geo.straight = HSU.or_(lay.get("straight"), base.get("straight")); geo.loop = HSU.or_(lay.get("id"), "")
	return { geo = geo, track = track, dir = dir, layout = lay }
