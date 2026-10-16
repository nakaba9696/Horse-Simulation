# フリーレース（HSFreeRace）が JS と同じか（godot/tests/golden/free.json）：出走表（騎手・枠・斤量・人気）と、走らせた結果・実況
extends RefCounted

const H := preload("res://core/hs_math.gd")

func run(t) -> void:
	var g: Array = JSON.parse_string(FileAccess.get_file_as_string("res://tests/golden/free.json"))
	for cs in g:
		var card = HSFreeRace.build(cs.o, null)
		var name: String = cs.race.short
		t.eq(card.race.short, cs.race.short, "free %s: レース" % name)
		var rows: Array = card.runners.map(func(x): return [x.horse.name, x.jockey.name, x.jockey.skill, x.num, x.frame, x.weight, x.odds, x.pop, x.rider])
		t.eq(JSON.stringify(rows), JSON.stringify(cs.card), "free %s: 出走表" % name)
		t.eq(card.seed, cs.seed, "free %s: 種" % name)
		var res := HSFreeRace.run(card)
		t.eq(res.results.map(func(x): return [x.horse.name, H.hex(x.time)]), cs.results, "free %s: 着順とタイム" % name)
		t.eq(res.events.map(func(e): return [H.hex(e.t), e.text]), cs.events, "free %s: 実況" % name)
