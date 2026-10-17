# 馬の走りの形（js/ui/race3d.js の poseHorse・walkPose を GDScript に）。乱数は使わない
# 手作りの骨（0 根元・1 胴・2/3 首・4 頭・5〜7 尾・8〜23 脚・24〜31 騎手）の角度を出す。素材の骨へは ViewHorse が写す
#   角度の向き（手作りの馬の座標：x 前・y 上・z 右）：rz＝横の軸のまわり（＋で骨の先が前・上へ）、ry＝縦の軸、rx＝前の軸
# 出力 P（PackedFloat32Array）：P[i*3]＝rz・P[i*3+1]＝ry・P[i*3+2]＝rx（i＝0〜35）、P[Y]＝胴の高さ、P[JX]・P[JY]＝騎手の腰のずれ
class_name ViewGait
extends RefCounted

const N := 36
const Y := 108
const JX := 109
const JY := 110
const SIZE := 111

const F_DUTY := 0.25
const H_DUTY := 0.27
const FK := [
	[[0, 0.38], [0.125, 0.0], [0.25, -0.42], [0.4, -0.4], [0.6, 0.05], [0.8, 0.42], [0.92, 0.47]],
	[[0, 0.04], [0.125, 0.0], [0.25, -0.08], [0.4, 0.25], [0.6, 0.85], [0.8, 0.62], [0.92, 0.22]],
	[[0, 0.0], [0.125, 0.04], [0.25, 0.0], [0.38, -0.9], [0.5, -1.75], [0.65, -1.6], [0.8, -0.6], [0.92, -0.05]],
	[[0, 0.15], [0.1, 0.45], [0.2, 0.35], [0.28, -0.2], [0.4, -0.9], [0.6, -0.7], [0.8, -0.25], [0.92, 0.1]],
]
const HK := [
	[[0, 0.42], [0.13, 0.05], [0.27, -0.42], [0.42, -0.42], [0.6, -0.05], [0.78, 0.38], [0.9, 0.5]],
	[[0, 0.0], [0.13, -0.05], [0.27, 0.12], [0.42, -0.1], [0.6, -0.5], [0.78, -0.45], [0.9, -0.12]],
	[[0, 0.1], [0.13, 0.28], [0.27, -0.05], [0.42, 0.7], [0.6, 1.35], [0.78, 1.0], [0.9, 0.35]],
	[[0, 0.1], [0.13, 0.45], [0.25, 0.2], [0.35, -0.5], [0.5, -1.0], [0.68, -0.6], [0.85, -0.15]],
]
# 襲歩の4拍子（左手前）：右後 → 左後 → 右前 → 左前、そのあと4本とも浮く
const TOUCH_L := {8: 0.46, 12: 0.34, 16: 0.12, 20: 0.0}
const TOUCH_R := {8: 0.34, 12: 0.46, 16: 0.0, 20: 0.12}
const BOB := [[0, -0.3], [0.13, -0.7], [0.3, -0.2], [0.46, -0.6], [0.6, -0.5], [0.75, 0.2], [0.88, 0.8]]
const PITCH := [[0, 0.3], [0.16, 0.7], [0.34, 0.1], [0.5, -0.6], [0.66, -0.6], [0.84, -0.1]]
const NOD := [[0, 0.5], [0.2, 0.8], [0.4, 0.0], [0.56, -0.8], [0.72, -0.6], [0.86, 0.0]]
const LEG_LAG := [0.0, 0.018, 0.036, 0.055]
# 常歩
const W_DUTY := 0.62
const WALK_STRIDE := 1.75
const WALK_TOUCH := {8: 0.25, 12: 0.75, 16: 0.0, 20: 0.5}
const WFK := [
	[[0, 0.2], [0.31, 0.0], [0.62, -0.2], [0.75, -0.12], [0.88, 0.12]],
	[[0, 0.0], [0.31, 0.0], [0.62, 0.02], [0.75, 0.3], [0.88, 0.2]],
	[[0, 0.0], [0.31, 0.0], [0.62, -0.05], [0.72, -0.75], [0.84, -0.45], [0.95, -0.05]],
	[[0, 0.08], [0.31, 0.2], [0.58, 0.15], [0.7, -0.6], [0.82, -0.4], [0.95, 0.0]],
]
const WHK := [
	[[0, 0.22], [0.31, 0.0], [0.62, -0.22], [0.75, -0.08], [0.88, 0.16]],
	[[0, 0.0], [0.31, 0.04], [0.62, 0.0], [0.75, -0.25], [0.88, -0.12]],
	[[0, 0.1], [0.31, 0.12], [0.62, 0.05], [0.74, 0.6], [0.86, 0.4], [0.96, 0.15]],
	[[0, 0.08], [0.31, 0.2], [0.58, 0.15], [0.7, -0.55], [0.84, -0.35], [0.95, 0.0]],
]
const STRIDE := 7.2

# 周期の折れ線をなめらかにつなぐ（Catmull-Rom）
static func cyc(K: Array, x: float) -> float:
	x = fposmod(x, 1.0)
	var n := K.size()
	var i := n - 1
	for k in n:
		if K[k][0] <= x:
			i = k
	var p0: float = K[(i - 1 + n) % n][1]
	var p1: float = K[i][1]
	var p2: float = K[(i + 1) % n][1]
	var p3: float = K[(i + 2) % n][1]
	var t1: float = K[i][0]
	var t2: float = K[(i + 1) % n][0] + (1.0 if i + 1 >= n else 0.0)
	var d := t2 - t1
	var u := (x + (1.0 if x < t1 else 0.0) - t1) / (d if d != 0.0 else 1.0)
	var u2 := u * u
	var u3 := u2 * u
	return 0.5 * (2.0 * p1 + (p2 - p0) * u + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * u2 + (3.0 * p1 - p0 - 3.0 * p2 + p3) * u3)

static func smooth(x: float) -> float:
	x = clampf(x, 0.0, 1.0)
	return x * x * (3.0 - 2.0 * x)

static func make() -> PackedFloat32Array:
	var P := PackedFloat32Array()
	P.resize(SIZE)
	return P

# 常歩の形（脚・首・尾・胴の高さ）
static func walk_pose(P: PackedFloat32Array, phW: float, t: float, seed: float) -> void:
	for b0 in [8, 12, 16, 20]:
		var K: Array = WFK if b0 < 16 else WHK
		var phi := fposmod(phW - WALK_TOUCH[b0], 1.0)
		for i in 4:
			P[(b0 + i) * 3] = cyc(K[i], phi - LEG_LAG[i] * 0.5)
	var n1 := cos((phW - 0.3) * TAU * 2.0)
	var n2 := cos((phW - 0.36) * TAU * 2.0)
	P[2 * 3] = -0.06 + 0.035 * n1
	P[3 * 3] = -0.02 + 0.02 * n2
	P[4 * 3] = 0.05 - 0.03 * n2 + 0.03 * sin(t * 0.6 + seed * 3.0)
	P[2 * 3 + 1] = 0.025 * sin(phW * TAU) + 0.03 * sin(t * 0.23 + seed * 5.0)
	P[4 * 3 + 1] = -0.5 * P[2 * 3 + 1]
	P[Y] = 1.25 + 0.008 * cos(phW * TAU * 2.0)
	P[1 * 3 + 2] = 0.018 * sin((phW - 0.1) * TAU)
	P[1 * 3] = 0.008 * cos((phW - 0.15) * TAU * 2.0)
	P[5 * 3] = 0.72 + 0.02 * sin(phW * TAU * 2.0)
	P[5 * 3 + 2] = 0.08 * sin((phW - 0.25) * TAU)
	P[6 * 3] = 0.22
	P[6 * 3 + 2] = 0.06 * sin((phW - 0.35) * TAU)
	P[7 * 3] = 0.15
	P[7 * 3 + 2] = 0.05 * sin((phW - 0.45) * TAU)

# 馬の形。ph＝襲歩の位相、sp＝走りの大きさ（0＝立つ）、push＝騎手の追い 0〜1、lead＝左手前の重み（1＝左・0＝右。間は混ぜる）
# walk_ph・walk_w＝常歩の位相と重み、whip＝ムチを入れてからの秒（<0 で無し）、pose＝ゴールのあとのガッツポーズの秒（<0 で無し）
# head_up＝掛かり 0〜1（模擬の kakari。前の名前は headUp）
static func pose(P: PackedFloat32Array, ph: float, sp: float, push: float, t: float, seed: float, lead: float,
		walk_ph: float, walk_w: float, whip: float, pose_t: float, head_up: float) -> void:
	P.fill(0.0)
	var wk := clampf(walk_w, 0.0, 1.0)
	if wk >= 1.0 or (wk > 0.0 and sp <= 0.0):
		_stand(P, t, seed)
		walk_pose(P, walk_ph, t, seed)
		return
	var bob := 0.0
	var pitch := 0.0
	if sp <= 0.0:
		_stand(P, t, seed)
	else:
		var k := minf(sp, 1.1)
		for b0 in [8, 12, 16, 20]:
			var front: bool = b0 < 16
			var K: Array = FK if front else HK
			var phl := fposmod(ph - TOUCH_L[b0], 1.0)
			var phr := fposmod(ph - TOUCH_R[b0], 1.0)
			for i in 4:
				# 関節ごとに少しずつ遅らせる（肩→肘→膝→球節）。手前の替わりは2つの形を混ぜる
				var a := cyc(K[i], phl - LEG_LAG[i])
				var b := cyc(K[i], phr - LEG_LAG[i])
				P[(b0 + i) * 3] = k * lerpf(b, a, lead)
		bob = 0.035 * k * cyc(BOB, ph)
		pitch = 0.065 * k * cyc(PITCH, ph)
		P[Y] = 1.25 + bob
		P[1 * 3] = pitch
		# 首：前脚が着く頃に下げ、後脚で押す頃に上げる。首の根元から頭へ少しずつ遅れて付いてくる
		var nod := cyc(NOD, ph) * k
		var nod1 := cyc(NOD, ph - 0.035) * k
		var nod2 := cyc(NOD, ph - 0.07) * k
		var pitch_lag := 0.065 * k * cyc(PITCH, ph - 0.07)
		P[2 * 3] = -0.14 * k + 0.13 * nod
		P[3 * 3] = -0.05 * k + 0.08 * nod1
		P[4 * 3] = 0.12 * k - 0.15 * nod2 - pitch_lag
		P[2 * 3 + 1] = 0.03 * k * sin(ph * TAU) * (lead * 2.0 - 1.0)
		P[4 * 3 + 1] = -0.6 * P[2 * 3 + 1]
		# 尾：胴の上下に遅れて波打つ（根元 → 先へ遅れが大きく、振れも大きく）
		var tb := k * cyc(BOB, ph - 0.1)
		var tb2 := k * cyc(BOB, ph - 0.2)
		var tb3 := k * cyc(BOB, ph - 0.3)
		P[5 * 3] = 0.6 - 0.12 * k + 0.05 * sin(ph * TAU * 2.0 + seed) + 0.06 * tb
		P[6 * 3] = 0.05 * sin(ph * TAU + 1.0 + seed) + 0.1 * tb2
		P[7 * 3] = 0.08 * sin(ph * TAU + 2.0 + seed) + 0.14 * tb3
		P[5 * 3 + 2] = 0.06 * sin(ph * TAU + seed * 3.0)
		P[6 * 3 + 2] = 0.05 * sin(ph * TAU + seed * 3.0 - 0.8)
		P[7 * 3 + 2] = 0.05 * sin(ph * TAU + seed * 3.0 - 1.6)
		# 騎手：鐙の上で腰を浮かせ、馬の上下を脚で吸う。追うときは首の動きに合わせて上体と腕を前へ送る
		var pk := clampf(push, 0.0, 1.0)
		P[JY] = -bob * 0.75
		P[24 * 3] = -pitch * 0.8
		var pump := -cyc(NOD, ph + 0.04)
		P[JX] = pk * 0.06 * pump
		P[JY] -= pk * 0.03 * (1.0 + pump) * 0.5
		P[25 * 3] = -0.04 - pk * (0.05 + 0.06 * pump)
		P[26 * 3] = 0.04 + pk * (0.05 + 0.06 * pump) + pitch * 0.8
		for ua in [27, 29]:
			P[ua * 3] = pk * (0.12 + 0.3 * pump)
			P[(ua + 1) * 3] = pk * (0.05 + 0.25 * pump)
	_kakari(P, head_up, sp, t, seed)
	# 襲歩と常歩のあいだ：両方の形を混ぜる
	if wk > 0.0 and sp > 0.0:
		var R := P.duplicate()
		walk_pose(P, walk_ph, t, seed)
		for i in range(1, 24):
			for c in 3:
				P[i * 3 + c] = R[i * 3 + c] + (P[i * 3 + c] - R[i * 3 + c]) * wk
		P[Y] = R[Y] + (P[Y] - R[Y]) * wk
		for i in range(24, N):
			for c in 3:
				P[i * 3 + c] = R[i * 3 + c]
		P[JX] = R[JX]
		P[JY] = R[JY]
	# ムチ：入れてから 0.5 秒。右腕を振り上げ、尻へ振り下ろして戻す
	if whip >= 0.0 and whip < 0.5:
		var u := whip / 0.5
		P[29 * 3] = _key([[0, P[29 * 3]], [0.38, 1.7], [0.58, -1.4], [1, 0]], u)
		P[29 * 3 + 2] = _key([[0, 0], [0.38, -0.25], [0.58, -0.8], [1, 0]], u)
		P[30 * 3] = _key([[0, P[30 * 3]], [0.38, 0.5], [0.58, 0.17], [1, 0]], u)
		P[31 * 3] = _key([[0, 0], [0.38, -0.5], [0.58, 2.25], [1, 0]], u)
		P[31 * 3 + 2] = _key([[0, 0], [0.38, 0], [0.58, 0.6], [1, 0]], u)
		P[25 * 3] += 0.12 * _key([[0, 0], [0.38, 1], [0.58, -0.3], [1, 0]], u)
	# ガッツポーズ：ゴールのあと、上体を起こして右の拳を突き上げる
	if pose_t >= 0.0 and pose_t < 2.6:
		var w := clampf(pose_t / 0.25, 0.0, 1.0) * clampf((2.6 - pose_t) / 0.4, 0.0, 1.0)
		P[25 * 3] = P[25 * 3] * (1.0 - w) + 0.45 * w
		P[26 * 3] = P[26 * 3] * (1.0 - w) - 0.3 * w
		P[JX] *= 1.0 - w
		P[29 * 3] = P[29 * 3] * (1.0 - w) + 2.5 * w + 0.12 * w * sin(pose_t * 9.0)
		P[30 * 3] = P[30 * 3] * (1.0 - w) + 0.4 * w
		P[29 * 3 + 2] = -0.3 * w

# 掛かり（0〜1）：ハミに逆らって首と頭を上げ、鼻先を突き出し、首を振る。騎手は上体を起こして手綱を引く（race3d.js と同じ）
static func _kakari(P: PackedFloat32Array, fg: float, sp: float, t: float, seed: float) -> void:
	if fg <= 0.01:
		return
	var sh := sin(t * 6.3 + seed * 5.0)
	var sh2 := sin(t * 6.3 + seed * 5.0 - 0.9)
	var toss := sin(t * 4.1 + seed * 2.0)
	var up := 1.0 + 0.6 * minf(1.0, sp)
	P[2 * 3] += (0.2 * fg + 0.05 * fg * toss) * up
	P[3 * 3] += 0.1 * fg * up
	P[4 * 3] += (0.3 * fg + 0.12 * fg * sin(t * 4.1 + seed * 2.0 - 0.7)) * up
	P[2 * 3 + 1] += 0.07 * fg * sh
	P[4 * 3 + 1] += 0.12 * fg * sh2
	P[25 * 3] += 0.3 * fg
	P[26 * 3] -= 0.15 * fg
	P[JX] -= 0.06 * fg
	for ua in [27, 29]:
		P[ua * 3] -= 0.35 * fg
		P[(ua + 1) * 3] += 0.3 * fg

# 立ち姿：息で胴がわずかに上下し、ゆっくり体重を移す。首と頭はあたりを見回し、尾はときどき振る
static func _stand(P: PackedFloat32Array, t: float, seed: float) -> void:
	var br := sin(t * 1.7 + seed * 9.0)
	var sw := sin(t * 0.31 + seed * 4.0)
	P[Y] = 1.25 + 0.004 * br
	P[1 * 3 + 2] = 0.012 * sw
	P[1 * 3] = 0.004 * br
	P[2 * 3] = 0.04 * sin(t * 1.1 + seed * 5.0) + 0.01 * br
	P[3 * 3] = 0.02 * sin(t * 0.8 + seed * 6.0 - 0.5)
	P[4 * 3] = 0.06 * sin(t * 0.7 + seed * 3.0)
	P[2 * 3 + 1] = 0.06 * sin(t * 0.27 + seed * 2.0)
	P[4 * 3 + 1] = 0.05 * sin(t * 0.41 + seed * 8.0 - 0.6)
	var swish := pow(maxf(0.0, sin(t * 0.45 + seed * 11.0)), 6.0)
	P[5 * 3] = 0.75 + 0.05 * sin(t * 1.3 + seed * 7.0)
	P[6 * 3] = 0.25
	P[7 * 3] = 0.15
	P[5 * 3 + 2] = 0.05 * sin(t * 0.9 + seed) + 0.25 * swish * sin(t * 5.5)
	P[6 * 3 + 2] = 0.3 * swish * sin(t * 5.5 - 0.7)
	P[7 * 3 + 2] = 0.35 * swish * sin(t * 5.5 - 1.4)
	P[JY] = -0.03
	P[25 * 3] = 0.08 + 0.03 * sin(t * 0.8 + seed * 2.0)
	P[26 * 3] = -0.08
	P[27 * 3] = -0.15
	P[29 * 3] = -0.15
	P[28 * 3] = -0.25
	P[30 * 3] = -0.25

static func _key(K: Array, u: float) -> float:
	var i := 0
	while i < K.size() - 2 and float(K[i + 1][0]) <= u:
		i += 1
	var t0: float = K[i][0]
	var v0: float = K[i][1]
	var t1: float = K[i + 1][0]
	var v1: float = K[i + 1][1]
	return v0 + (v1 - v0) * smooth((u - t0) / (t1 - t0))
