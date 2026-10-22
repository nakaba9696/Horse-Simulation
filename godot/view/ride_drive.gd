# 全開の知らせ（docs/FEEL.md 3・4・8。持ち主の決定 2026-10-22「組み合わせでお願いします　スピードゲージも最大にすれば良いと思います」）
# 模擬の全開の度合い（ctl.drive。0〜1。手綱の段が HSSim.DRIVE.from より上の分）を、計器の色・速さの計器の振り切り・音・振動へ渡す形にならす。
# 模擬の結果には触らない（読むだけ）。騎乗中は文字を出さない。
# - vis：色と音と振動の強さ（度合いにすぐ寄り、抜けるとなめらかに引く）
# - peg：速さの計器を最大へ振り切る割合（全開の間は 1 へ、抜けたら 0 へなめらかに戻る）
# - 脚が尽きた（バテた）ら、全開の知らせはすぐ消す（光の余韻・音・振動を残さず、スタミナの赤い升の知らせと混ぜない）
class_name ViewRideDrive
extends RefCounted

const RISE := 0.12       # 入るとき：vis・peg がほぼ寄りきる秒（実時間）
const FALL := 0.45       # 抜けるとき：段を下げてから計器が実際の値へ戻る秒（実時間）
const SPENT_FALL := 0.08 # 脚が尽きたとき：知らせを消す秒（すぐ）
const ON := 0.02         # これより上を「全開の間」とみる

var raw := 0.0           # いまの模擬の度合い
var vis := 0.0           # 色・音・振動の強さ（0〜1）
var peg := 0.0           # 速さの計器の振り切り（0〜1）
var on := false          # 全開の間
var spent := false       # 脚が尽きて全開が切れた（バテ）
var entered_at := -99.0  # 入った瞬間（実時間）

# dt＝実時間の秒・now＝実時間。返り値：この呼び出しで起きたこと（"enter"＝入った・"exit"＝段を下げて抜けた・"spent"＝脚が尽きて切れた・""）
func update(drive: float, E: float, done: bool, dt: float, now: float) -> String:
	var d := clampf(drive, 0.0, 1.0)
	if done:
		d = 0.0
	raw = d
	var ev := ""
	var now_on := d > ON
	if now_on and not on:
		ev = "enter"
		entered_at = now
		spent = false
	elif on and not now_on:
		spent = E <= 0.0 and not done
		ev = "spent" if spent else "exit"
	on = now_on
	var fall := SPENT_FALL if (spent or done) else FALL
	vis = _approach(vis, d, dt, RISE if d > vis else fall)
	peg = _approach(peg, 1.0 if on else 0.0, dt, RISE if on else fall)
	return ev

# 一次の遅れで寄せる（tau 秒でおよそ 95% 寄る）
static func _approach(cur: float, want: float, dt: float, tau: float) -> float:
	if dt <= 0.0:
		return cur
	var k := 1.0 - exp(-3.0 * dt / maxf(tau, 1e-3))
	var v := lerpf(cur, want, k)
	return want if absf(v - want) < 1e-3 else v

# 速さの計器の満ちる割合：実際の値 f（0〜1）を、振り切りの分だけ最大へ寄せる
static func dial_frac(f: float, p: float) -> float:
	return lerpf(clampf(f, 0.0, 1.0), 1.0, clampf(p, 0.0, 1.0))

# 入った瞬間からの光の一打（0〜1。0.5 秒で引く）
func burst(now: float) -> float:
	var a := now - entered_at
	if a < 0.0 or a > 0.5 or spent:
		return 0.0
	return (1.0 - a / 0.5) * (1.0 - a / 0.5)
