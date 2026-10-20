# 殿堂入りした馬の1走ごとの記録の別ファイル（HSHall。持ち主の決定 2026-10-20「殿堂入りは別ファイルで」）の確かめ：
# 殿堂入りで別ファイルができる・セーブの本体に記録が無い・殿堂の馬を開くと読める・読めなければ記録なし・
# 前のセーブ（本体に記録がある）を読むと別ファイルへ移る・セーブの枠ごとに分かれ、枠を消す／はじめからで片づく
extends RefCounted

const SLOT_A := "user://test_hall_a.json"
const SLOT_B := "user://test_hall_b.json"

func run(t) -> void:
	var era0 = HSU.ERA
	UiFlow.save_path = SLOT_B
	UiFlow.delete_save()
	UiFlow.save_path = SLOT_A
	UiFlow.new_game("殿堂騎手", "美浦", 11.0)
	t.ok(HSHall.dir == "user://hall/test_hall_a", "hall: セーブの枠ごとの置き場所（%s）" % HSHall.dir)
	var G = HSWorld.G
	G.player.money = 1e10
	HSWorld.buy(HSWorld.market_historic()[0])
	var h = HSWorld.mine()[0]
	var hid := String(h.id)
	# 戦績：8走のうち6走に記録（出走馬・ラップ）。2走は記録の無い前の形
	var res: Array = []
	var recs0: Array = []
	for i in 8:
		var r := { y = G.year, m = 5.0, w = float(i % 4 + 1), race = "テスト記念%d" % i, grade = "G2", pos = float(i % 3 + 1), n = 3.0, course = "東京", surface = "芝", dist = 2000.0, ground = "良", time = 120.0 + i, margin = "", last3f = 34.0, jockey = "騎手甲", pop = 1.0, rt = null }
		var rec = null
		if i % 4 != 3:
			rec = { f = [[String(h.name), 1.0, 1200.0 + i, "", 1.0, "騎手甲"], ["相手乙", 2.0, 1201.0 + i, "クビ", 2.0, "騎手乙"], ["相手丙", 3.0, 1205.0 + i, "2", 3.0, "騎手丙"]], lap = [70.0, 115.0, 120.0, 118.0, 117.0, 119.0, 121.0, 120.0, 118.0, 112.0 + i] }
			r.rec = rec
		res.append(r)
		recs0.append(rec)
	h.results = res
	HSTrophy.give(h, HSTrophy.by()["triple"], G.year)
	var rr: Dictionary = HSJockey.retire(hid)
	t.ok(not rr.has("err") and HSHall.by_id(hid) != null, "hall: 引退で殿堂入り")
	# 別ファイルができ、本体には記録が無い（成績と札は残る）
	var p := HSHall.path_of(hid)
	t.ok(FileAccess.file_exists(p), "hall: 殿堂入りで別ファイルができる（%s）" % p)
	UiFlow.save()
	var body = HSJson.parse(FileAccess.get_file_as_string(SLOT_A))
	var be: Dictionary = (body.hallOwn as Array).filter(func(x): return x.id == hid)[0]
	t.ok(be.results.size() == 8 and not be.results.any(func(r): return r.has("rec")) and be.trophies.size() == 1 and be.results[0].race == "テスト記念0", "hall: セーブの本体には戦績の行とトロフィーだけ（記録は無い）")
	# 開くと読める（手元の覚えを忘れて、ファイルから）
	HSHall.forget()
	t.ok(_same(HSHall.open(hid), recs0), "hall: 殿堂の馬を開くと別ファイルの記録が付く（6走）")
	t.ok(not HSHall.by_id(hid).results.any(func(r): return r.has("rec")), "hall: 開いても本体の写しは変わらない")
	# セーブを読み直しても読める
	t.ok(UiFlow.load_game() and _same(HSHall.open(hid), recs0), "hall: セーブを読み直しても記録を読める")
	# 殿堂から馬の画面を開く
	UiFlow.hall_id = hid
	var hs = load("res://scenes/horse.tscn").instantiate()
	t.root.add_child(hs)
	t.ok(hs.hall_mode and HSRaceRec.has(hs.h.results[0]) and not HSRaceRec.has(hs.h.results[3]), "hall: 殿堂の馬の画面は別ファイルの記録を読む（記録の無い1走はそのまま）")
	hs.free()
	# 読めなければ記録なし（壊れたファイル・無いファイル）
	var f := FileAccess.open(p, FileAccess.WRITE)
	f.store_string("{壊れた")
	f.close()
	HSHall.forget()
	var o = HSHall.open(hid)
	t.ok(o != null and o.results.size() == 8 and not o.results.any(func(r): return HSRaceRec.has(r)), "hall: 壊れたファイルは記録なし（戦績の行は出る）")
	hs = load("res://scenes/horse.tscn").instantiate()
	t.root.add_child(hs)
	hs.race_detail(hs.h.results[0])
	t.ok(hs.hall_mode and hs._modal != null, "hall: 記録が読めなくても1走の小窓を開ける（記録なし）")
	hs.close_modal()
	hs.free()
	DirAccess.remove_absolute(ProjectSettings.globalize_path(p))
	HSHall.forget()
	t.ok(HSHall.open(hid) != null and HSHall.recs_of(hid) == null, "hall: ファイルが無くても殿堂の馬は開ける（記録なし）")
	UiFlow.hall_id = ""
	# 前のセーブ（本体の殿堂の写しに記録がある。JS 版のセーブも）：読み込みで別ファイルへ移す
	var old: Dictionary = HSJson.parse(FileAccess.get_file_as_string(SLOT_A))
	var oe: Dictionary = (old.hallOwn as Array).filter(func(x): return x.id == hid)[0]
	for i in 8:
		if recs0[i] != null: oe.results[i].rec = recs0[i]
	UiFlow.save_path = SLOT_B
	var fb := FileAccess.open(SLOT_B, FileAccess.WRITE)
	fb.store_string(HSJson.stringify(old))
	fb.close()
	t.ok(UiFlow.load_game(), "hall: 前のセーブを読む")
	var pb := HSHall.path_of(hid)
	t.ok(pb.begins_with("user://hall/test_hall_b/") and FileAccess.file_exists(pb), "hall: 前のセーブの記録は、その枠の別ファイルへ移る")
	t.ok(not HSHall.by_id(hid).results.any(func(r): return r.has("rec")), "hall: 移したあと本体に記録は無い")
	HSHall.forget()
	t.ok(_same(HSHall.open(hid), recs0), "hall: 移した記録を開ける")
	UiFlow.save()
	t.ok(not FileAccess.get_file_as_string(SLOT_B).contains("\"lap\""), "hall: 書き直した本体に記録が無い")
	# 枠を消すと、その枠の殿堂の記録も片づく（ほかの枠は残る）
	var pa := "user://hall/test_hall_a".path_join(hid.validate_filename() + ".json")
	UiFlow.save_path = SLOT_A
	HSHall.set_dir(UiFlow.hall_dir())
	HSHall._store(hid, "x", recs0)   # 枠 A にも記録を置き直す（上で消したので）
	t.ok(FileAccess.file_exists(pa) and FileAccess.file_exists(pb), "hall: 枠 A と枠 B に別々の記録")
	UiFlow.save_path = SLOT_B
	UiFlow.delete_save()
	t.ok(not FileAccess.file_exists(SLOT_B) and not DirAccess.dir_exists_absolute("user://hall/test_hall_b") and FileAccess.file_exists(pa), "hall: セーブを消すと、その枠の殿堂の記録も消える（ほかの枠は残る）")
	# はじめから：その枠の前の殿堂の記録を片づける
	UiFlow.save_path = SLOT_A
	UiFlow.new_game("殿堂騎手", "美浦", 12.0)
	t.ok(not FileAccess.file_exists(pa) and HSHall.recs_of(hid) == null, "hall: はじめからで、その枠の殿堂の記録を片づける")
	# 片づけ
	UiFlow.delete_save()
	UiFlow.save_path = "user://save.json"
	HSHall.set_dir("")
	HSU.ERA = era0

# 開いた写しの記録が、殿堂入りの前の記録と同じか
func _same(o: Variant, recs0: Array) -> bool:
	if o == null or (o.results as Array).size() != recs0.size(): return false
	for i in recs0.size():
		var r: Dictionary = o.results[i]
		if recs0[i] == null:
			if r.has("rec"): return false
		elif not r.has("rec") or HSJson.stringify(r.rec) != HSJson.stringify(recs0[i]): return false
	return true
