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
	t.ok(HSSpecial.when_ok(g, rudolf, win) and HSSpecial.when_ok(g, rudolf, lost), "無敗のときだけの条件は無い：シンボリルドルフ（持ち主の決定 2026-10-24「無敗のとき条件なしで」）")
	t.ok(HSSpecial.when_ok(g, cb, win) and HSSpecial.when_ok(g, cb, lost), "いつでも：ミスターシービー")
	t.ok(HSSpecial.members(HSSpecial.by_id()["t:us3"]).any(func(d): return d.name == "シアトルスルー"), "シアトルスルーは米国三冠")
	t.ok(HSSpecial.members(HSSpecial.by_id()["t:bc2"]).any(func(d): return d.name == "ジョンヘンリー"), "ジョンヘンリーはクラウンオブブリーダーズ")
	t.ok(not HSSpecial.by_id().has("t:legend") and not HSSpecial.by_id().has("t:wonder") and not HSSpecial.by_id().has("t:immortal"), "ホールオブフェイム・ワンダーホース・インモータルロードは隠し馬なし（持ち主の決定 2026-10-24）")
	t.ok(HSSpecial.members(HSSpecial.by_id()["t:gs_jp"]).any(func(d): return d.name == "テンポイント"), "テンポイントはジャパン GS")
	t.ok(HSSpecial.members(HSSpecial.by_id()["t:gs_us"]).any(func(d): return d.name == "トムフール"), "アメリカン GS にトムフールを戻した（持ち主の決定 2026-10-24）")
	# リーチで出てくるのはランダムに1頭（持ち主の決定 2026-10-24）：JS の SP.pickOne と同じ式。同じ馬・同じレース・同じ年なら同じ馬
	var ds: Array = HSSpecial.members(g)
	var kk := { year = 2030.0, short = "菊花賞", sex = "" }
	var p1: Array = HSSpecial.pick_one(ds, { id = "h1" }, g, kk)
	t.ok(p1.size() == 1 and is_same(p1[0], HSSpecial.pick_one(ds, { id = "h1" }, g, kk)[0]), "ランダムに1頭・同じ馬なら同じ馬")
	t.ok(is_same(p1[0], ds[HSU.hash32("h1|t:triple|2030|菊花賞") % ds.size()]), "選び方が JS と同じ")
	var seen := {}
	for i in 40: seen[HSSpecial.pick_one(ds, { id = "h%d" % i }, g, kk)[0].name] = true
	t.ok(seen.size() >= 3, "馬が替わればばらける（%d頭）" % seen.size())
	var fds: Array = HSSpecial.members(HSSpecial.by_id()["t:ftriple"])
	t.ok(HSSpecial.pick_one(ds + fds, { id = "h1" }, g, { year = 2030.0, short = "オークス", sex = "牝" })[0].sex == "牝", "牝馬限定のレースは牝馬から")
	for n in ["ロベルト", "ロイヤルパレス", "ギャロレット"]:   # トムフール・カーバインは戻した（持ち主の決定 2026-10-24）
		var x = HSSpecial.list().filter(func(e): return e.name == n)
		t.ok(x.is_empty() or not String(x[0].groups[0]).begins_with("t:"), "%s はトロフィーの隠し馬でない" % n)
	# 隠し馬はデータのままの能力で出てくる（底上げしない。持ち主の決定 2026-10-20「これ言ってないんだけど　こんな仕様やめてね」）
	t.ok(not HSTrophy.rule().has("HIDDEN_FH"), "隠し馬の底上げの下限が無い")
	var dj = HSSpecial.data("ダイヤモンドジュビリー")
	var turf := { age = "3+", year = 2030.0, surface = "芝" }
	var sp := HSSpecial.horse(dj, turf)
	var raw := HSHorse.from_historic(HSEraless.shift(dj, (2030.0 - 4.0) - dj.born), "special:" + dj.name)
	t.eq(sp.pot, raw.pot, "データのままの能力（ダイヤモンドジュビリー）")
	# 芝にもダートにもなるトロフィー：そのレースの馬場の馬だけ
	var bc: Dictionary = HSSpecial.by_id()["t:bc2"]
	var al = HSSpecial.data("アリシーバ")
	var jh = HSSpecial.data("ジョンヘンリー")
	t.ok(HSSpecial.when_ok(bc, al, lost, { surface = "ダ" }) and not HSSpecial.when_ok(bc, al, lost, { surface = "芝" }), "アリシーバはダートのときだけ")
	t.ok(HSSpecial.when_ok(bc, jh, lost, { surface = "芝" }) and not HSSpecial.when_ok(bc, jh, lost, { surface = "ダ" }), "ジョンヘンリーは芝のときだけ")
	# 今の G1 を勝っていない名鑑のある6頭は G2・G3 の「歴代の○○馬」、歴代の BCターフ馬は空でない（持ち主の決定 2026-10-20「推しで」。JS の tests/run.js と同じ）
	var want := { "ホワイトフォンテン": "日経賞", "シービークロス": "毎日王冠", "メジロモンスニー": "シンザン記念", "ニシノライデン": "阪神大賞典", "ビゼンニシキ": "スプリングS", "スダホーク": "弥生賞" }
	for n in want:
		var gid: String = "r:" + want[n]
		t.ok(HSSpecial.by_id().has(gid) and HSSpecial.members(HSSpecial.by_id()[gid]).any(func(d): return d.name == n), "%s は歴代の%s馬" % [n, want[n]])
	t.ok(HSSpecial.members(HSSpecial.by_id()["r:BCターフ"]).size() > 0, "歴代の BCターフ馬は空でない")
	for d in HSSpecial.pool():
		if d.name == "フォルリ": continue   # 外した（持ち主の決定 2026-10-24）
		t.ok(HSSpecial.list().any(func(e): return e.name == d.name), "%s はどれかのグループに入る" % d.name)
	# 隠し馬とスペシャルホースの強さ・出方（持ち主の決定 2026-10-20。JS の tests/run.js と同じ）：馬・馬場・総合力・出る組
	var want2 := [["テツノカチドキ", "dirt", 65, "local"], ["オールアロング", "turf", 72, "t:gs_tiara"], ["スペクタキュラービッド", "dirt", 76, "t:us3"],
		["パーソナルエンスン", "dirt", 76, "t:usf3"], ["ロッキータイガー", "dirt", 64, "local"], ["タマモクロス", "turf", 73, "t:gs_jp"],
		["ミエスク", "turf", 76, "t:gs_mile"], ["ドクターフェイガー", "dirt", 77, "t:gs_us"], ["ヴェイグリーノーブル", "turf", 74, "r:凱旋門賞"]]
	for w in want2:
		var f: Dictionary = HSSeason.fh_peak(HSHorse.from_historic(HSSpecial.data(w[0]), "x"))
		t.eq(int(f[w[1]]), w[2], "%s の総合力" % w[0])
		var e = HSSpecial.list().filter(func(x): return x.name == w[0])
		t.ok(e.size() == 1 and e[0].groups == [w[3]], "%s は %s" % [w[0], w[3]])
	HSU.ERA = era0
