# 出走表・パドックの印（ui/marks.gd。持ち主の決定 2026-10-20「スピード　スタミナ　サブパラ　実績　で印つけて　◎ 1位　○ 2位　▲ 3位　△ 4位」）
# 列ごとに1〜4位へ ◎○▲△・5位以下は空・同じ値は馬番の若い順・今日の馬場の値・サブパラは根性＋気性＋坂＋切れの換算・実績はレーティング（無ければ獲得賞金）
extends RefCounted

func _h(spd: float, sta: float, dspd: float, sub: float, kire: float, rt: Variant, earn: float) -> Dictionary:
	var res: Array = []
	if rt != null:
		res = [{"rt": rt, "surface": "芝", "dist": 2000.0}]
	return {"filler": true, "kire": kire, "earn": earn, "results": res,
		"pot": {"spd": spd, "sta": sta, "dspd": dspd, "dsta": sta - 10.0, "guts": sub, "mind": sub, "slope": sub}}

func run(t) -> void:
	t.eq(UiMarks.kire_scaled(1.0), 20.0, "marks: 切れ1 は 20")
	t.eq(UiMarks.kire_scaled(8.0), 120.0, "marks: 切れ8 は 120")
	var hs := [
		_h(90, 70, 60, 70, 4, 110.0, 0.0),   # 1番
		_h(95, 80, 50, 60, 4, null, 5e7),    # 2番
		_h(80, 90, 99, 80, 4, 120.0, 0.0),   # 3番
		_h(95, 60, 70, 50, 8, null, 0.0),    # 4番：スピードは2番と同じ
		_h(70, 75, 80, 75, 2, 100.0, 0.0),   # 5番
		_h(60, 50, 40, 40, 1, null, 1e7),    # 6番
		null,                                # 7番：データの無い馬
	]
	var nums := [1, 2, 3, 4, 5, 6, 7]
	var m := UiMarks.of(hs, nums, "芝", 0.0)
	t.eq(m.map(func(x): return x.spd), ["▲", "◎", "△", "○", "", "", ""], "marks: スピード（芝）の1〜4位。同じ値は馬番の若い順")
	t.eq(m.map(func(x): return x.sta), ["△", "○", "◎", "", "▲", "", ""], "marks: スタミナ（芝）")
	t.eq(m.map(func(x): return x.rec), ["○", "△", "◎", "", "▲", "", ""], "marks: 実績はレーティングが先、無ければ獲得賞金（どちらも無い馬は付かない）")
	# サブパラ：1番 210+62.9・2番 180+62.9・3番 240+62.9・4番 150+120・5番 225+34.3・6番 120+20
	t.eq(m.map(func(x): return x.sub), ["○", "", "◎", "▲", "△", "", ""], "marks: サブパラ（根性・気性・坂・切れの換算）")
	var md := UiMarks.of(hs, nums, "ダ", 0.0)
	t.eq(md.map(func(x): return x.spd), ["△", "", "◎", "▲", "○", "", ""], "marks: ダートはダートのスピード")
	t.eq(UiMarks.of(hs, nums, "芝", 0.0), m, "marks: 同じ出走馬なら同じ印（乱数を使わない）")
