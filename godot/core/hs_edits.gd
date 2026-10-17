# 競走馬エディット（js/core/edits.js の HS.Edits のうち、ゲームの中で使う所）：史実馬のデータを書き換える。
# 新しいゲーム・ロードのときに、セーブの G.edits を当てる（いったん元に戻してから）
class_name HSEdits

const FIELDS := ["rating", "surface", "distMin", "distMax", "style", "kire", "growth", "coat", "retire", "pot", "turf", "dirt", "heavy", "health", "skills", "temper", "jockey"]
static var _orig: Variant = null
static var _origJ: Variant = null
static var active: Dictionary = {}

static func snapshot() -> void:
	if _orig != null: return
	_orig = {}
	for h in HSData.d().get("historic", []): _orig[h.name] = h.duplicate(true)
	_origJ = HSData.d().get("historicJockeys", {}).duplicate()
static func original(name: String) -> Variant:
	return _orig.get(name) if _orig else null

static func apply(edits: Dictionary) -> void:
	snapshot()
	var D := HSData.d()
	for h in D.get("historic", []):
		var o: Dictionary = _orig[h.name]
		for k in h.keys():
			if not o.has(k): h.erase(k)
		for k in o: h[k] = o[k].duplicate(true) if (o[k] is Dictionary or o[k] is Array) else o[k]
		var ed = edits.get(h.name)
		if not ed: continue
		for k in FIELDS:
			if k != "jockey" and ed.get(k) != null: h[k] = ed[k].duplicate(true) if (ed[k] is Dictionary or ed[k] is Array) else ed[k]
	D.historicJockeys = _origJ.duplicate()
	for n in edits:
		var ed = edits[n]
		if ed and ed.get("jockey"): D.historicJockeys[n] = ed.jockey
	active = edits
