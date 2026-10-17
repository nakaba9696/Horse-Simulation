# コースの形：js/core/track.js が出した実際の回り（data/layouts.js）と高さを、記録の pts（1m ごとの [x, y, 曲がり, コーナー, 高さ]）から引く。
# pts が無い記録は T.make と同じ式（直線2本と半円2つ）。
# s＝ゴールからさかのぼった距離。上から見た (x, y) を出し、3D では (x, 高さ, -y) に置く（ブラウザ版の race3d.js と同じ向き）。
class_name ViewTrack
extends RefCounted

var L := 2000.0
var a := 600.0
var r := 120.0
var st := 400.0
var sign := 1.0
var line := false
var goal_x := 0.0
var seg1 := 0.0
var slope_h := 0.0
var pts := PackedFloat32Array()
var step := 1.0
var npt := 0

func _init(t: Dictionary) -> void:
	L = t.lap
	a = t.a
	r = t.r
	st = t.straight
	sign = t.sign
	line = bool(t.get("line", false))
	goal_x = st - a / 2.0
	seg1 = a / 2.0 + goal_x
	slope_h = {"急": 2.1, "中": 1.6, "小": 0.9, "平": 0.0}.get(t.get("slope", "平"), 0.0)
	if t.has("pts"):
		pts = PackedFloat32Array(t.pts)
		step = float(t.get("step", 1.0))
		npt = pts.size() / 5

func _idx(s: float) -> Array:
	if line:
		var sc := clampf(s, 0.0, L)
		var fi := sc / step
		var i := mini(npt - 2, int(floor(fi)))
		return [i, clampf(fi - i, 0.0, 1.0), s - sc]
	s = fposmod(s, L)
	var fi2 := s / step
	var j := mini(npt - 2, int(floor(fi2)))
	return [j, fi2 - j, 0.0]

# 上から見た位置・曲がり・コーナーの番号（3・4コーナー＝3、1・2コーナー＝1、直線＝0）
func at(s: float) -> Dictionary:
	if npt > 1:
		var q := _idx(s)
		var i: int = q[0]
		var f: float = q[1]
		var px := lerpf(pts[i * 5], pts[(i + 1) * 5], f)
		var py := lerpf(pts[i * 5 + 1], pts[(i + 1) * 5 + 1], f)
		var over: float = q[2]
		if over != 0.0:
			# 直線だけのコースの端の先：端の向きにのばす
			var k0 := (npt - 2) if over > 0.0 else 0
			var hx := pts[(k0 + 1) * 5] - pts[k0 * 5]
			var hy := pts[(k0 + 1) * 5 + 1] - pts[k0 * 5 + 1]
			var l := maxf(1e-6, sqrt(hx * hx + hy * hy))
			px += hx / l * over
			py += hy / l * over
		var k := i if f < 0.5 else i + 1
		return {"x": px, "y": py, "curv": pts[k * 5 + 2], "corner": int(pts[k * 5 + 3])}
	s = fposmod(s, L)
	var u := s
	var x := 0.0
	var y := 0.0
	var curv := 0.0
	var corner := 0
	if u <= seg1:
		x = goal_x - u; y = r
	else:
		u -= seg1
		if u <= PI * r:
			var ang := PI / 2.0 + u / r
			x = -a / 2.0 + cos(ang) * r; y = sin(ang) * r; curv = 1.0 / r; corner = 3
		else:
			u -= PI * r
			if u <= a:
				x = -a / 2.0 + u; y = -r
			else:
				u -= a
				if u <= PI * r:
					var ang2 := -PI / 2.0 + u / r
					x = a / 2.0 + cos(ang2) * r; y = sin(ang2) * r; curv = 1.0 / r; corner = 1
				else:
					u -= PI * r
					x = a / 2.0 - u; y = r
	return {"x": x * sign, "y": y, "curv": curv * sign, "corner": corner}

static func smooth(x: float) -> float:
	x = clampf(x, 0.0, 1.0)
	return x * x * (3.0 - 2.0 * x)

# 高さ（実際の高低差。無い記録はゴール前の坂だけ）
func elev(s: float) -> float:
	if npt > 1:
		var q := _idx(s)
		var i: int = q[0]
		return lerpf(pts[i * 5 + 4], pts[(i + 1) * 5 + 4], q[1])
	if slope_h == 0.0:
		return 0.0
	s = fposmod(s, L)
	if s < 100.0:
		return slope_h
	if s < 330.0:
		return slope_h * (1.0 - smooth((s - 100.0) / 230.0))
	if s > L - 450.0:
		return slope_h * smooth((s - (L - 450.0)) / 450.0)
	return 0.0

# 走る向きの勾配（上りが正）
func grade(s: float) -> float:
	return (elev(s - 5.0) - elev(s + 5.0)) / 10.0

# s の地点：位置と進む向き（ゴールへ向かう向き）
func frame(s: float) -> Dictionary:
	var p := at(s)
	var pa := at(s - 0.6)
	var pb := at(s + 0.6)
	var fx: float = pa.x - pb.x
	var fy: float = pa.y - pb.y
	var l := maxf(1e-6, sqrt(fx * fx + fy * fy))
	return {"s": s, "x": p.x, "y": p.y, "fx": fx / l, "fy": fy / l, "curv": p.curv, "corner": p.corner, "e": elev(s)}

# 内ラチから外へ u m、前へ dq m の地点（3D）。h は高さ
func w3(f: Dictionary, u: float, h: float, dq: float = 0.0) -> Vector3:
	var px: float = f.x - sign * f.fy * u + f.fx * dq
	var py: float = f.y + sign * f.fx * u + f.fy * dq
	return Vector3(px, h, -py)

# 進む向き（3D）と外へ向かう向き（3D）
func fwd3(f: Dictionary) -> Vector3:
	return Vector3(f.fx, 0.0, -f.fy)

func out3(f: Dictionary) -> Vector3:
	return Vector3(-sign * f.fy, 0.0, -sign * f.fx)
