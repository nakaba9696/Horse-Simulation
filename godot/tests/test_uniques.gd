# 固有の技の「動きを直す」13頭（docs/review/UNIQUE_PLAN.md・持ち主の決定 2026-10-20）：代表の一戦（かキャリア）の形で出て、違う形では出ない。
# tests/extra_uniques.js と同じ場面。斤量の条件は使わない（「斤量条件は難しいので他のに変えてほしい」）
extends RefCounted

const LEN := 2.4

# 場面を作る。gap＝先頭との差（馬身。rank 1 なら 0）
func _x(o: Dictionary) -> Dictionary:
	var D: float = o.get("D", 2400.0); var straight: float = o.get("straight", 450.0); var R: float = o.R
	var rank: int = o.get("rank", 1); var n: int = o.get("n", 16)
	var me := { x = D - R, late = o.get("late", false), lane = 1.0, delay = 0.0, i = 0, r = { weight = o.get("weight", 57.0) } }
	var leader = me if rank == 1 else { x = me.x + float(o.get("gap", 0.0)) * LEN }
	var second = { x = me.x - LEN } if rank == 1 else me
	return { sim = {}, s = me, c = null, t = 60.0, D = D, R = R, straight = straight, inStraight = R <= straight and R > 0, rank = rank, n = n,
		whipping = false, close = false, wall = false, leader = leader, second = second,
		sk = { rankMid = o.get("rankMid"), led600 = o.get("led600", false), wallFor = 0.0, boxedFor = 0.0, duelFor = 0.0 } }

func _fires(name: String, o: Dictionary) -> bool:
	HSSkills.has_unique(name)
	var id = HSSkills.unique_of({ name = name })
	if id == null: return false
	var u: Dictionary = HSSkills.BY[id]
	var x := _x(o)
	var ph := "st" if x.R <= x.straight + 30 else "mid"
	return (u.at == "any" or u.at == ph) and bool(u.when.call(x))

func run(t) -> void:
	var NEW := { "ファーラップ": "lateOrStayer", "ケルソ": "longHaul", "スペクタキュラービッド": "moveUp", "ウィンクス": "fromBackKick", "オルフェーヴル": "comeback",
		"ゴールデンシックスティ": "chase5", "ディープインパクト": "longMakuri", "トレヴ": "earlyFromBack", "プリティーポリー": "nearOrLead", "サイテーション": "front2Late",
		"シャーガー": "entryFront3", "ナリタブライアン": "chaseOrLead", "ドクターフェイガー": "ledAll" }
	for name in NEW:
		var id = HSSkills.unique_of({ name = name })
		t.ok(id != null and HSSkills.BY[id].whenId == NEW[name], "uniques: %s の型が %s" % [name, NEW[name]])
	t.ok(not HSSkills.UWHEN.has("heavyOrLate"), "uniques: 57kg以上の型が残っていない")
	# [馬, 場面, 出るか, 何の形か]
	var cases := [
		["ファーラップ", { D = 3200.0, R = 750.0, rank = 5 }, true, "3200mの直線の手前"],
		["ファーラップ", { D = 2000.0, R = 600.0, straight = 400.0, rank = 10, late = true }, true, "出遅れた2000m"],
		["ファーラップ", { D = 2400.0, R = 750.0, rank = 5, weight = 62.0 }, false, "出遅れず2400mで重い斤量"],
		["ケルソ", { D = 3200.0, R = 700.0, straight = 400.0, rank = 3 }, true, "3200mの直線の手前"],
		["ケルソ", { D = 2000.0, R = 700.0, straight = 400.0, rank = 3, late = true, weight = 62.0 }, false, "2000m"],
		["スペクタキュラービッド", { D = 2000.0, R = 440.0, rank = 1, rankMid = 7 }, true, "中間点7番手から直線入口で先頭"],
		["スペクタキュラービッド", { D = 2000.0, R = 440.0, rank = 1, rankMid = 2, late = true }, false, "1頭しか抜いていない"],
		["ウィンクス", { D = 2040.0, R = 300.0, straight = 300.0, n = 14, rank = 1, rankMid = 9 }, true, "中間点9番手から先頭"],
		["ウィンクス", { D = 2000.0, R = 300.0, n = 14, rank = 10, rankMid = 4 }, false, "中間点4番手"],
		["オルフェーヴル", { D = 2500.0, R = 300.0, straight = 310.0, rank = 1, rankMid = 13 }, true, "中間点13番手から直線入口で先頭"],
		["オルフェーヴル", { D = 2500.0, R = 300.0, straight = 310.0, rank = 12, rankMid = 13 }, false, "1頭しか抜いていない"],
		["ゴールデンシックスティ", { D = 2000.0, R = 300.0, rank = 5, gap = 4.5 }, true, "2000mで先頭から4.5馬身"],
		["ゴールデンシックスティ", { D = 1600.0, R = 300.0, rank = 1 }, false, "先頭"],
		["ディープインパクト", { D = 3200.0, R = 900.0, straight = 400.0, n = 17, rank = 12, rankMid = 16 }, true, "中間点16番手で直線の手前500m"],
		["ディープインパクト", { D = 3200.0, R = 300.0, straight = 400.0, n = 17, rank = 15, rankMid = 16 }, false, "直線に入ってから"],
		["トレヴ", { D = 2400.0, R = 550.0, straight = 530.0, n = 17, rank = 1, rankMid = 14 }, true, "中間点14番手から残り550mで先頭"],
		["トレヴ", { D = 2400.0, R = 300.0, straight = 530.0, n = 17, rank = 12, rankMid = 14 }, false, "直線で後ろのまま"],
		["プリティーポリー", { D = 1600.0, R = 350.0, rank = 1 }, true, "残り350mで先頭"],
		["プリティーポリー", { D = 1600.0, R = 350.0, rank = 2, gap = 2.0 }, false, "先頭から2馬身"],
		["サイテーション", { D = 2400.0, R = 750.0, rank = 1 }, true, "直線の手前で先頭"],
		["サイテーション", { D = 2400.0, R = 750.0, rank = 4 }, false, "4番手"],
		["シャーガー", { D = 2400.0, R = 440.0, rank = 1 }, true, "直線入口で先頭"],
		["シャーガー", { D = 2400.0, R = 440.0, rank = 5, gap = 2.0 }, false, "直線入口で5番手"],
		["ナリタブライアン", { D = 3000.0, R = 300.0, rank = 1 }, true, "残り300mで先頭"],
		["ナリタブライアン", { D = 2000.0, R = 300.0, rank = 6, gap = 5.0 }, false, "先頭から5馬身"],
		["ドクターフェイガー", { D = 1600.0, R = 350.0, rank = 1, led600 = true }, true, "残り600mから先頭"],
		["ドクターフェイガー", { D = 1600.0, R = 350.0, rank = 1, led600 = false }, false, "先頭に替わったばかり"],
	]
	for c in cases:
		t.eq(_fires(c[0], c[1]), c[2], "uniques: %s・%s" % [c[0], c[3]])
