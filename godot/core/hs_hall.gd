# 殿堂（お手馬。js/core/hall.js の HS.Hall と同じ）：トロフィーを1つ以上手にした自分の馬は、引退すると案内なしで殿堂入りし、
# 記録の写し（1走ごとの出走馬・ラップの記録 rec も）が残る。トロフィーの無い馬は入らず、レースの記録も消える（持ち主の決定 2026-10-20「殿堂入りは自動」）
# 1走ごとの記録（rec）はセーブの本体に置かず、別ファイル user://hall/<セーブの枠>/<馬の id>.json に置く（持ち主の決定 2026-10-20「殿堂入りは別ファイルで」）。
#   本体（G.hallOwn）には成績と札（戦績の行・トロフィー）だけ。別ファイルは殿堂入りのときに一度だけ書き、殿堂の馬の画面を開いたときだけ読む（open）。
#   置き場所（dir）は UiFlow がセーブの枠ごとに決める。空なら手元（_mem）だけに置く（中身のテスト・撮影の見本）。
#   JS 版はセーブの本体に rec を持つ。前のセーブ（本体に rec がある）は読み込みのとき（migrate）に別ファイルへ移す
class_name HSHall

const NEED := 1
static func trophies_of(h: Dictionary) -> Array:
	var G = HSWorld.G
	var out: Array = []
	var tr: Dictionary = HSU.or_(G.get("trophies"), {})
	for id in tr:
		var v = tr[id]
		if not v or not HSTrophy.by().has(id): continue   # 外したトロフィー（前のセーブ）は数えない
		var label = HSTrophy.by()[id].label
		if (v.hid == h.id) if v.get("hid") else (v.horse == h.name):
			out.append({ id = id, label = label, y = v.y, bonus = HSU.or_(v.get("bonus"), 0.0) })
		else:
			for m in HSU.or_(v.get("more"), []):   # GF のトロフィーは2頭目からの勝ち馬にも
				if m.hid == h.id:
					out.append({ id = id, label = label, y = m.y, bonus = float(HSU.or_(m.get("bonus"), 0.0)) }); break
	return HSU.stable_sort(out, func(a, b): return a.y < b.y)
static func eligible(h: Variant) -> bool: return h != null and h.get("owner") == "P" and trophies_of(h).size() >= NEED
# 引退すると殿堂入りするか（条件を満たし、まだ殿堂にいない。引退の確かめの文に添える）
static func will(h: Variant) -> bool: return eligible(h) and by_id(String(h.id)) == null
static func list() -> Array:
	return HSU.stable_sort(HSU.or_(HSWorld.G.get("hallOwn"), []).duplicate(), func(a, b):
		if a.trophies.size() != b.trophies.size(): return a.trophies.size() > b.trophies.size()
		if a.g1 != b.g1: return a.g1 > b.g1
		return a.retiredY < b.retiredY)
static func by_id(id: String) -> Variant:
	for x in HSU.or_(HSWorld.G.get("hallOwn"), []):
		if x.id == id: return x
	return null
static func on_retire(h: Dictionary) -> Variant:
	var G = HSWorld.G
	if not eligible(h): return null
	if not G.get("hallOwn"): G.hallOwn = []
	if G.hallOwn.any(func(x): return x.id == h.id): return null
	var fh := HSSeason.fh_peak(h)
	var res: Array = HSU.or_(h.get("results"), []).map(func(r): return r.duplicate())
	var g1 := 0
	for g in HSU.or_(h.get("gradedWins"), []):
		if g.get("grade") == "G1" or g.get("grade") == "GF": g1 += 1
	var e := { id = h.id, name = h.name, born = h.born, sex = h.sex, coat = h.get("coat"), sire = h.get("sire"), dam = h.get("dam"), hist = HSU.truthy(h.get("hist")), original = HSU.truthy(h.get("original")),
		style = h.get("style"), kire = h.get("kire"), skills = HSOriginal.skills_of(h),
		starts = HSU.or_(h.get("starts"), 0.0), wins = HSU.or_(h.get("wins"), 0.0), w2 = HSU.or_(h.get("w2"), 0.0), w3 = HSU.or_(h.get("w3"), 0.0), prize = HSU.or_(h.get("prize"), 0.0),
		g1 = float(g1), gradedWins = HSU.or_(h.get("gradedWins"), []).map(func(g): return g.duplicate()),
		trophies = trophies_of(h), titles = HSU.or_(h.get("titles"), []).duplicate(),
		fh = { turf = fh.turf, dirt = fh.dirt }, fhShow = HSSeason.fh_show_peak(h), first = res[0].y if res.size() else G.year, retiredY = G.year, results = res }
	_store(String(e.id), String(e.name), _split(e))   # 1走ごとの記録は別ファイルへ（殿堂入りのときに一度だけ）
	G.hallOwn.append(e)
	HSWorld.dirty()
	HSWorld.news("%sが殿堂入りした！（トロフィー %s）" % [h.name, "・".join(e.trophies.map(func(t): return t.label))], "g1")
	return e

# ---------- 1走ごとの記録の別ファイル ----------
const REC_V := 1.0
static var dir := ""             # user://hall/<セーブの枠>。空なら手元（_mem）だけ
static var _mem := {}            # dir が空のとき：馬の id → 1走ごとの rec の並び（戦績と同じ順。記録の無い1走は null）
static var _last_id := ""        # 最後に読んだ1頭（同じ馬の画面を開き直すときに読み直さない）
static var _last = null

static func set_dir(d: String) -> void:
	if d == dir: return
	dir = d
	forget()
# 手元に覚えている分を忘れる（新しいゲーム・セーブの読み込みのとき。ファイルは消さない）
static func forget() -> void:
	_mem = {}
	_last_id = ""
	_last = null
static func path_of(id: String) -> String:
	return dir.path_join(id.validate_filename() + ".json")
# その枠の殿堂の記録を全部消す（はじめから・セーブを消すとき）
static func clear() -> void:
	forget()
	if dir == "" or not DirAccess.dir_exists_absolute(dir): return
	for f in DirAccess.get_files_at(dir):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(dir.path_join(f)))
	DirAccess.remove_absolute(ProjectSettings.globalize_path(dir))
# 殿堂の写しの戦績から rec を抜き出す（写しの戦績からは消す）。1つも無ければ []
static func _split(e: Dictionary) -> Array:
	var recs: Array = []
	var any := false
	for r in HSU.or_(e.get("results"), []):
		var x = r.get("rec") if r is Dictionary else null
		if x is Dictionary:
			any = true
			r.erase("rec")
		recs.append(x if x is Dictionary else null)
	return recs if any else []
static func _store(id: String, name: String, recs: Array) -> void:
	if recs.is_empty(): return
	_last_id = id
	_last = recs
	if dir == "":
		_mem[id] = recs
		return
	DirAccess.make_dir_recursive_absolute(dir)
	var p := path_of(id)
	var f := FileAccess.open(p + ".tmp", FileAccess.WRITE)
	if f == null:
		push_warning("殿堂の記録を書けない：%s" % p)
		return
	f.store_string(HSJson.stringify({ v = REC_V, id = id, name = name, recs = recs }))
	f.close()
	DirAccess.rename_absolute(ProjectSettings.globalize_path(p + ".tmp"), ProjectSettings.globalize_path(p))
# その馬の1走ごとの rec の並び。読めなければ null（画面は「記録なし」）
static func recs_of(id: String) -> Variant:
	if id == _last_id and _last != null: return _last
	if dir == "": return _mem.get(id)
	var p := path_of(id)
	if not FileAccess.file_exists(p): return null
	var txt := FileAccess.get_file_as_string(p).strip_edges()
	if not (txt.begins_with("{") and txt.ends_with("}")): return null   # 途中で切れた・壊れたファイル
	var v = HSJson.parse(txt)
	if not (v is Dictionary) or not (v.get("recs") is Array) or String(v.get("id", "")) != id: return null
	_last_id = id
	_last = v.recs
	return v.recs
# 殿堂の馬の画面に出す写し：本体の写しの戦績に、別ファイルの rec を付けたもの（本体は変えない）。殿堂にいなければ null
static func open(id: String) -> Variant:
	var e = by_id(id)
	if e == null: return null
	var c: Dictionary = e.duplicate()
	c.results = HSU.or_(e.get("results"), []).map(func(r): return r.duplicate())
	var recs = recs_of(id)
	if recs is Array and recs.size() == c.results.size():   # 数が合わない（壊れた・別の馬の）ファイルは使わない
		for i in recs.size():
			if recs[i] is Dictionary: c.results[i].rec = recs[i]
	return c
# 前のセーブ（本体の殿堂の写しに rec がある。JS 版のセーブも）：別ファイルへ移し、本体からは外す（HSWorld.migrate から）
static func migrate(g: Dictionary) -> void:
	for e in HSU.or_(g.get("hallOwn"), []):
		if e is Dictionary: _store(String(e.id), String(HSU.or_(e.get("name"), "")), _split(e))
# JS 版と同じ形（本体の殿堂の写しに rec がある）に戻したセーブ。JS との一致テストで比べるため（g は読んだあとの写し。g を書き換えて返す）
static func with_recs(g: Dictionary) -> Dictionary:
	for e in HSU.or_(g.get("hallOwn"), []):
		var recs = recs_of(String(e.id))
		if not (recs is Array) or recs.size() != (e.results as Array).size(): continue
		for i in recs.size():
			if recs[i] is Dictionary: e.results[i].rec = recs[i]
	return g
