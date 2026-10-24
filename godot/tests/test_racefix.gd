# 番組の保留の直し（持ち主の決定 2026-10-24「A7A8以外やって」。docs/review/PENDING.md の A1〜A6・A9）
# 2歳以上（"2+"）の表示と出走・東京大賞典の国際 G1 の札・2025年の週（書き出したデータ）
extends RefCounted

func _row(name: String, y: float) -> Dictionary:
	for r in HSData.d().get("races", []):
		if r.name == name and r.from <= y and y <= float(HSU.or_(r.get("to"), 9999.0)): return r
	return {}

func run(t) -> void:
	var keep := HSText.lang
	HSText.set_lang("ja")
	t.eq(HSText.age_cond({"age": "2+"}), "2歳以上", "racefix: 日本語の2歳以上")
	HSText.set_lang("en")
	t.eq(HSText.age_cond({"age": "2+"}), "2yo+", "racefix: 英語の2歳以上")
	HSText.set_lang(keep)
	for n in ["ナンソープステークス", "アベイドロンシャン賞"]:
		var r: Dictionary = _row(n, 2025.0).duplicate()
		r.year = 2025.0; r.graded = true
		t.eq(String(r.get("age")), "2+", "racefix: %s は2歳以上" % n)
		t.eq(HSRaces.ineligible_base({ born = 2023.0, sex = "牡", owner = "P", earn = 1e6 }, r, 2025.0), null, "racefix: %s に2歳が出られる" % n)
		t.eq(HSRaces.ineligible_base({ born = 2024.0, sex = "牡", earn = 1e6 }, r, 2025.0), "年齢", "racefix: %s に1歳は出られない" % n)
	var tk: Dictionary = _row("東京大賞典", 2025.0).duplicate(); tk.year = 2025.0
	t.eq(HSRaces.grade_badge(tk), "G1", "racefix: 東京大賞典は G1 と出す")
	var tk0: Dictionary = _row("東京大賞典", 2010.0).duplicate(); tk0.year = 2010.0
	t.eq(HSRaces.grade_badge(tk0), "Jpn1", "racefix: 2010年の東京大賞典は Jpn1")
	var te: Dictionary = _row("帝王賞", 2025.0).duplicate(); te.year = 2025.0
	t.eq(HSRaces.grade_badge(te), "Jpn1", "racefix: 帝王賞は Jpn1 のまま")
	var d: Dictionary = _row("東京優駿", 2025.0)
	t.eq([d.month, d.week], [6.0, 1.0], "racefix: 2025年の日本ダービーは6月1週")
	var gf: Dictionary = _row("ゴールデンフリースステークス", 2025.0)
	t.eq([String(gf.grade), float(gf.dist)], ["G2", 1600.0], "racefix: 2025年のゴールデンフリースSは G2・1600m")
