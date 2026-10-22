# 騎乗の効果音（その場で波形を作って鳴らす。音のファイルは使わない。docs/FEEL.md 3）
# いまは全開の知らせだけ（持ち主の決定 2026-10-22「組み合わせでお願いします」）：
# - 入った瞬間：低い踏み込み（沈む低音）と、下から上へ駆け上がる風の音（0.4 秒）
# - 全開の間：強い向かい風と、一完歩に一度の荒い息（馬は駆け足で一完歩に一度息をする）。強さは ViewRideDrive.vis
# - 抜けたら音は引く。脚が尽きたら（バテ）すぐ消す（vis が先に落ちるので、ここでは何もしない）
# 雑音は自前の乱数（結果に関わらない。ゲームの乱数は進めない）。バスは設定の「SE」（UiSettings.apply_audio）
class_name ViewRideSfx
extends Node

const RATE := 22050.0
const ENTER_LEN := 0.42

var vis := 0.0           # 全開の強さ（0〜1。毎コマ race_view が入れる）
var stride_hz := 2.3     # 一完歩の回数（毎秒）。v / 7.2
var _player: AudioStreamPlayer
var _pb: AudioStreamGeneratorPlayback
var _n := 0x2545F491     # 雑音の種
var _ph := 0.0           # 一完歩の位相
var _cue := -1.0         # 入った瞬間の合図の経過（秒。負は鳴っていない）
var _thump := 0.0        # 低音の位相
var _lp_w := 0.0         # 風の低域
var _lp_w2 := 0.0
var _bp := [0.0, 0.0]    # 息の帯域（状態変数フィルタ）
var _bp_c := [0.0, 0.0]  # 合図の風の帯域
var _vis_s := 0.0        # なめらかにした強さ（サンプルごと）
var _cut := false        # stop のあと：ごく短く（およそ 5ms）引く

func _ready() -> void:
	var gen := AudioStreamGenerator.new()
	gen.mix_rate = RATE
	gen.buffer_length = 0.12
	_player = AudioStreamPlayer.new()
	_player.stream = gen
	_player.bus = &"SE" if AudioServer.get_bus_index("SE") >= 0 else &"Master"
	add_child(_player)
	_player.play()
	_pb = _player.get_stream_playback() as AudioStreamGeneratorPlayback

func enter() -> void:
	_cue = 0.0

# すぐ消す（脚が尽きたとき・ゴール）。プツッと切らないよう、ごく短く引く
func stop() -> void:
	vis = 0.0
	_cue = -1.0
	_cut = true

# 一時停止の間は音を止める（docs/FEEL.md 1）
func set_paused(on: bool) -> void:
	if _player != null:
		_player.stream_paused = on

func _process(_d: float) -> void:
	if _pb == null:
		return
	var n := _pb.get_frames_available()
	if n <= 0:
		return
	_pb.push_buffer(mix(n))

# 鳴っていない（全開でなく合図も無い）か
func silent() -> bool:
	return vis <= 0.0 and _vis_s < 1e-4 and _cue < 0.0

# n サンプルを作る（テストからも呼ぶ）
func mix(n: int) -> PackedVector2Array:
	var out := PackedVector2Array()
	out.resize(n)
	if silent():
		return out   # 0 で埋まっている
	var dt := 1.0 / RATE
	for i in n:
		if _cut and vis > 0.0: _cut = false
		_vis_s += (vis - _vis_s) * (0.01 if _cut else 0.0015)
		var s := 0.0
		var w := _noise()
		if _vis_s > 1e-4:
			# 向かい風：低域に寄せた雑音（全開ほど明るく）
			var a := 0.05 + 0.1 * _vis_s
			_lp_w += (w - _lp_w) * a
			_lp_w2 += (_lp_w - _lp_w2) * a
			var gust := 0.8 + 0.2 * sin(_ph * TAU * 0.5)
			s += _lp_w2 * 0.9 * _vis_s * gust
			# 荒い息：一完歩に一度（位相 0.55 の前後。首が下がって前へ伸びる所で吐く）
			_ph += stride_hz * dt
			if _ph >= 1.0:
				_ph -= 1.0
			var e := maxf(0.0, sin((_ph - 0.4) * TAU))
			e = e * e * e
			var y := _svf(_bp, w, 0.22, 0.35)
			s += y * 0.55 * e * _vis_s
		if _cue >= 0.0:
			var u := _cue / ENTER_LEN
			# 低い踏み込み：70Hz から 42Hz へ沈み、すぐ引く
			var f := lerpf(70.0, 42.0, minf(1.0, u * 2.0))
			_thump += f * dt
			s += sin(_thump * TAU) * 0.55 * exp(-u * 7.0)
			# 駆け上がる風：帯域の真ん中が下から上へ
			var fc := lerpf(0.04, 0.35, u)
			var y2 := _svf(_bp_c, w, fc, 0.5)
			s += y2 * 0.7 * sin(minf(1.0, u) * PI)
			_cue += dt
			if _cue > ENTER_LEN:
				_cue = -1.0
		s = clampf(s, -1.0, 1.0)
		out[i] = Vector2(s, s)
	return out

# 状態変数フィルタの帯域（f＝0〜0.5 ほどの係数、q＝減衰）
static func _svf(st: Array, x: float, f: float, q: float) -> float:
	var low: float = st[0] + f * st[1]
	var high := x - low - q * float(st[1])
	var band: float = f * high + float(st[1])
	st[0] = low
	st[1] = band
	return band

func _noise() -> float:
	_n ^= (_n << 13) & 0xFFFFFFFF
	_n ^= _n >> 17
	_n ^= (_n << 5) & 0xFFFFFFFF
	return float(_n & 0xFFFF) / 32767.5 - 1.0
