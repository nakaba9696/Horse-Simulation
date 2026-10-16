# コースの形：js/core/track.js の T.make と同じ式（直線2本と半円2つ）。
# s＝ゴールからさかのぼった距離。上から見た (x, y) を出し、3D では (x, 高さ, -y) に置く（ブラウザ版の race3d.js と同じ向き）。
class_name TrackGeo
extends RefCounted

var L := 2000.0
var a := 600.0
var r := 120.0
var st := 400.0
var sign := 1.0
var goal_x := 0.0
var seg1 := 0.0
var slope_h := 0.0

func _init(t: Dictionary) -> void:
	L = t.lap
	a = t.a
	r = t.r
	st = t.straight
	sign = t.sign
	goal_x = st - a / 2.0
	seg1 = a / 2.0 + goal_x
	slope_h = {"急": 2.1, "中": 1.6, "小": 0.9, "平": 0.0}.get(t.get("slope", "平"), 0.0)

# 上から見た位置・曲がり・コーナーの番号（3・4コーナー＝3、1・2コーナー＝1、直線＝0）
func at(s: float) -> Dictionary:
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

# ゴール前の坂（race3d.js と同じ形）
func elev(s: float) -> float:
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
