# 出走表・パドックの印（持ち主の決定 2026-10-20「スピード　スタミナ　サブパラ　実績　で印つけて　◎ 1位　○ 2位　▲ 3位　△ 4位」）
# 4つの列（スピード・スタミナ・サブパラ・実績）ごとに、出走馬の順位の1〜4位に ◎○▲△ を付ける（5位以下は空）。1頭が別々の列で別々の印を持ってよい。
# - スピード・スタミナ：今日の馬場（芝・ダ）のいまの値（HSHorse.cur → on_surface）
# - サブパラ：根性＋気性＋坂＋切れの換算（切れ 1〜8 を 20〜120 に：20 + (切れ − 1) × 100 ÷ 7）
# - 実績：レーティングの総合（HSRating.of）。無い馬は獲得賞金で、レーティングのある馬の後ろ。どちらも無い馬には付けない
# 同じ値は馬番の若い順。乱数は使わない（データから決まりで出す）。意味は docs/UI.md「出走表の印」
class_name UiMarks
extends RefCounted

const SYMS := ["◎", "○", "▲", "△"]
const COLS := ["spd", "sta", "sub", "rec"]
const HEAD := {"spd": "SP", "sta": "ST", "sub": "サブ", "rec": "実績"}
const NAME := {"spd": "スピード", "sta": "スタミナ", "sub": "サブパラ", "rec": "実績"}

# 切れ（1〜8）を能力の目盛り（20〜120）に
static func kire_scaled(k: float) -> float:
	return 20.0 + (clampf(k, 1.0, 8.0) - 1.0) * 100.0 / 7.0

# 1頭の4つの値。h が無い（データの無い馬）は空
static func values(h: Variant, surface: String, w_idx: Variant) -> Dictionary:
	if not (h is Dictionary) or not h.has("pot"): return {}
	var c := HSHorse.cur(h, w_idx)
	var s := HSHorse.on_surface(c, surface)
	var sub := float(c.guts) + float(c.mind) + float(c.slope) + kire_scaled(float(HSU.or_(h.get("kire"), 4.0)))
	var rt = HSRating.of(h)
	var earn := float(HSU.or_(h.get("earn"), 0.0))
	var rec: Variant = null
	if rt != null: rec = 1e9 + float(rt.v)      # レーティングのある馬が先
	elif earn > 0.0: rec = earn / 1e6           # 無ければ獲得賞金（1e9 より下に収まる）
	return {"spd": float(s.spd), "sta": float(s.sta), "sub": sub, "rec": rec}

# 出走馬（馬番の順の配列。要素は馬の辞書か null）→ 各馬の印 {spd: "◎", …}（付かない列は ""）
static func of(horses: Array, nums: Array, surface: String, w_idx: Variant) -> Array:
	var vals: Array = []
	var out: Array = []
	for h in horses:
		vals.append(values(h, surface, w_idx))
		out.append({"spd": "", "sta": "", "sub": "", "rec": ""})
	for col in COLS:
		var idx: Array = []
		for i in vals.size():
			if not vals[i].is_empty() and vals[i][col] != null: idx.append(i)
		idx = HSU.stable_sort(idx, func(a, b):
			var va := float(vals[a][col]); var vb := float(vals[b][col])
			if va != vb: return va > vb
			return int(nums[a]) < int(nums[b]))
		for k in mini(4, idx.size()):
			out[idx[k]][col] = SYMS[k]
	return out
