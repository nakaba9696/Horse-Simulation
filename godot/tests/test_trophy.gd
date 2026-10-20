# トロフィーの棚卸し（持ち主の決定 2026-10-20）：お金（難しさ1〜6で5,000万〜5億円）・難しさ・隠し馬の「無敗のとき」・外した馬と動かした馬。
# JS の tests/extra_trophy.js「棚卸し」と同じことを Godot 版（HSTrophy・HSSpecial）で見る
extends RefCounted

func run(t) -> void:
	var era0 = HSU.ERA
	HSU.ERA = 2025.0   # 年代なしのゲームの物価
	var money := [0.0, 5000.0, 10000.0, 15000.0, 20000.0, 30000.0, 50000.0]
	for k in range(1, 7): t.eq(HSTrophy.money_of({ tier = k }), money[k], "トロフィーのお金 難しさ%d" % k)
	var tiers := { arc2 = 5, au3 = 2, dwc2 = 5, eu3 = 5, eumile = 4, ev2 = 4, fr3 = 2, frf3 = 2, ftriple = 2, gs_jd = 3, jd3 = 1, triple = 3, uk3 = 4, us3 = 4, usf3 = 2, gs_tiara = 4 }
	var by := HSTrophy.by()
	for id in tiers: t.eq(int(by[id].tier), tiers[id], "難しさ %s" % id)
	for x in HSTrophy.list():
		if x.kind == "gf": t.eq(int(x.tier), 4, "GF の難しさ %s" % x.id)
	# 無敗のとき：出走数と勝ち数が同じなら出てくる。負けたことがあれば出てこない。いつでもの馬は出てくる
	var g: Dictionary = HSSpecial.by_id()["t:triple"]
	var win := { starts = 4.0, wins = 4.0 }
	var lost := { starts = 5.0, wins = 4.0 }
	var rudolf = HSSpecial.data("シンボリルドルフ")
	var cb = HSSpecial.data("ミスターシービー")
	t.ok(HSSpecial.when_ok(g, rudolf, win) and not HSSpecial.when_ok(g, rudolf, lost), "無敗のとき：シンボリルドルフ")
	t.ok(HSSpecial.when_ok(g, cb, win) and HSSpecial.when_ok(g, cb, lost), "いつでも：ミスターシービー")
	t.ok(HSSpecial.members(HSSpecial.by_id()["t:us3"]).any(func(d): return d.name == "シアトルスルー"), "シアトルスルーは米国三冠")
	t.ok(HSSpecial.members(HSSpecial.by_id()["t:bc2"]).any(func(d): return d.name == "ジョンヘンリー"), "ジョンヘンリーはクラウンオブブリーダーズ")
	t.ok(not HSSpecial.members(HSSpecial.by_id()["t:legend"]).any(func(d): return d.name == "ジョンヘンリー"), "ジョンヘンリーはホールオブフェイムにいない")
	t.ok(HSSpecial.members(HSSpecial.by_id()["t:gs_jp"]).any(func(d): return d.name == "テンポイント"), "テンポイントはジャパン GS")
	t.ok(not HSSpecial.by_id().has("t:gs_us"), "アメリカン GS の隠し馬はいない")
	for n in ["カーバイン", "ロベルト", "ロイヤルパレス", "ギャロレット", "トムフール"]:
		var x = HSSpecial.list().filter(func(e): return e.name == n)
		t.ok(x.is_empty() or not String(x[0].groups[0]).begins_with("t:"), "%s はトロフィーの隠し馬でない" % n)
	# 隠し馬の強さ：難しさの下限（そのレースの馬場で）。データは変えない
	var fl: Array = HSTrophy.rule().HIDDEN_FH
	t.eq(fl.map(func(v): return int(v)), [0, 70, 72, 75, 78, 81, 84], "隠し馬の総合力の下限")
	var uk: Dictionary = HSSpecial.by_id()["t:uk3"]
	t.eq(HSSpecial.floor_of(uk), 78.0, "英国三冠の下限")
	var dj = HSSpecial.data("ダイヤモンドジュビリー")
	var turf := { age = "3+", year = 2030.0, surface = "芝" }
	var raw := HSSpecial.horse(dj, turf)
	var up := HSSpecial.horse(dj, turf, uk)
	t.ok(HSSeason.fh_of(HSHorse.cur(raw, 0), "芝", raw) < 78.0 and HSSeason.fh_of(HSHorse.cur(up, 0), "芝", up) >= 78.0, "下限まで上げる（ダイヤモンドジュビリー）")
	t.eq(up.pot.dspd, raw.pot.dspd, "ほかの馬場の能力は変えない")
	# 芝にもダートにもなるトロフィー：そのレースの馬場の馬だけ
	var bc: Dictionary = HSSpecial.by_id()["t:bc2"]
	var al = HSSpecial.data("アリシーバ")
	var jh = HSSpecial.data("ジョンヘンリー")
	t.ok(HSSpecial.when_ok(bc, al, lost, { surface = "ダ" }) and not HSSpecial.when_ok(bc, al, lost, { surface = "芝" }), "アリシーバはダートのときだけ")
	t.ok(HSSpecial.when_ok(bc, jh, lost, { surface = "芝" }) and not HSSpecial.when_ok(bc, jh, lost, { surface = "ダ" }), "ジョンヘンリーは芝のときだけ")
	HSU.ERA = era0
