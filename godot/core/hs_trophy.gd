# トロフィー（js/core/trophy.js の HS.Trophy と同じ）：三冠など、勝ったレースの組み合わせ。手にするとボーナス賞金
class_name HSTrophy

const LIST := [
	{ id = "triple", label = "三冠", note = "皐月賞・日本ダービー・菊花賞を同じ年に", finals = ["菊花賞"] },
	{ id = "ftriple", label = "牝馬三冠", note = "桜花賞・オークス・秋華賞を同じ年に", finals = ["秋華賞"] },
	{ id = "autumn", label = "秋の古馬三冠", note = "天皇賞・秋・ジャパンC・有馬記念を同じ年に", finals = ["有馬記念"] },
	{ id = "spring", label = "春の古馬三冠", note = "大阪杯・天皇賞・春・宝塚記念を同じ年に", finals = ["宝塚記念"] },
	{ id = "grandprix", label = "グランプリ制覇", note = "宝塚記念と有馬記念の両方", finals = ["有馬記念", "宝塚記念"] },
	{ id = "tenno", label = "天皇賞の春秋制覇", note = "天皇賞・春と天皇賞・秋の両方", finals = ["天皇賞・秋", "天皇賞・春"] },
	{ id = "arima2", label = "有馬記念連覇", note = "有馬記念を2年続けて", finals = ["有馬記念"] },
	{ id = "arc2", label = "凱旋門賞連覇", note = "凱旋門賞を2年続けて", finals = ["凱旋門賞"] },
	{ id = "us3", label = "米三冠", note = "ケンタッキーダービー・プリークネスS・ベルモントSを同じ年に", finals = ["ベルモントS"] },
	{ id = "uk3", label = "英三冠", note = "英2000ギニー・英ダービー・英セントレジャーを同じ年に", finals = ["英セントレジャー"] },
]
const BONUS := { triple = 50000.0, ftriple = 30000.0, autumn = 30000.0, spring = 30000.0, grandprix = 10000.0, tenno = 10000.0, arima2 = 10000.0, arc2 = 30000.0, us3 = 50000.0, uk3 = 50000.0 }
static func bonus_of(t: Dictionary) -> float: return HSMath.round_js(float(BONUS.get(t.id, 0.0)) * HSU.price_index() / 10.0) * 10.0
static func note_of(t: Dictionary) -> String: return "%s（ボーナス賞金 %s）" % [t.note, HSU.money(bonus_of(t))]
static var BY: Dictionary = _by()
static func _by() -> Dictionary:
	var o := {}
	for t in LIST: o[t.id] = t
	return o

static func _won(h: Dictionary, name: String, pred: Variant = null) -> bool:
	for g in HSU.or_(h.get("gradedWins"), []):
		if HSU.or_(g.get("short"), g.race) == name and (pred == null or pred.call(g.y)): return true
	return false
static func _legs(id: String, h: Dictionary, race: Dictionary) -> bool:
	var sy := func(names: Array): return names.all(func(n): return _won(h, n, func(y): return y == race.year))
	var other := func(pairs: Dictionary):
		var o = pairs.get(race.get("short"))
		return o != null and _won(h, o, func(y): return y <= race.year) and not _won(h, race.short)
	match id:
		"triple": return sy.call(["皐月賞", "日本ダービー"])
		"ftriple": return sy.call(["桜花賞", "オークス"])
		"autumn": return sy.call(["天皇賞・秋", "ジャパンC"])
		"spring": return sy.call(["大阪杯", "天皇賞・春"])
		"grandprix": return other.call({ "有馬記念": "宝塚記念", "宝塚記念": "有馬記念" })
		"tenno": return other.call({ "天皇賞・秋": "天皇賞・春", "天皇賞・春": "天皇賞・秋" })
		"arima2": return _won(h, "有馬記念", func(y): return y == race.year - 1)
		"arc2": return _won(h, "凱旋門賞", func(y): return y == race.year - 1)
		"us3": return sy.call(["ケンタッキーダービー", "プリークネスS"])
		"uk3": return sy.call(["英2000ギニー", "英ダービー"])
	return false

# 自分の馬が重賞を勝ったとき（HSSeason.on_win から）
static func on_win(h: Dictionary, race: Dictionary) -> Array:
	var G = HSWorld.G
	if not G.get("eraless"): return []
	if not G.get("trophies"): G.trophies = {}
	var got: Array = []
	for t in LIST:
		if not t.finals.has(race.get("short")) or G.trophies.get(t.id): continue
		var before := h.duplicate(); before.gradedWins = h.gradedWins.slice(0, h.gradedWins.size() - 1)
		if not _legs(t.id, before, race): continue
		var bonus := bonus_of(t)
		G.trophies[t.id] = { y = race.year, horse = h.name, hid = h.id, bonus = bonus }
		G.player.money += bonus
		HSWorld.news("トロフィー「%s」を手にした！（%s）ボーナス賞金 %s" % [t.label, h.name, HSU.money(bonus)], "g1")
		got.append(t)
	return got
