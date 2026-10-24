# 番組表（js/core/program.js の HS.Program と同じ）：1頭の馬について、今週から1年先までの週ごとのレース（重賞とオープン。レースは OP 以上だけ）と、
# 出られるか・適性・出走登録と予約の状態をまとめる。画面はこの行を読んで描くだけ。今週は出走登録、来週から先は出走の予約（HSSeason.reserve）
class_name HSProgram

# 適性の段（3＝◎ 2＝○ 1＝△ 0＝×）
const MARK := ["×", "△", "○", "◎"]
static func fit_dist(h: Dictionary, d: float) -> int:
	var gap: float = h.distMin - d if d < h.distMin else (d - h.distMax if d > h.distMax else 0.0)
	return 3 if gap == 0 else (2 if gap <= 200 else (1 if gap <= 400 else 0))
static func fit_surf(h: Dictionary, s: Variant) -> int:
	var v: float = float(HSU.or_(h.apt.get("dirt") if s == "ダ" else h.apt.get("turf"), 0.0))
	return 3 if v >= 90 else (2 if v >= 75 else (1 if v >= 60 else 0))

# 今週から n 週の暦（i＝何週後）
static func weeks(n: int) -> Array:
	var G = HSWorld.G
	var out: Array = []
	var y: float = G.year; var m: float = G.month; var w: float = G.week
	for i in n:
		out.append({ y = y, m = m, w = w, i = i })
		w += 1.0
		if w > 4:
			w = 1.0; m += 1.0
			if m > 12:
				m = 1.0; y += 1.0
	return out
# その週のレース。今週は世界の一覧（グランドフェスティバルなども入る）、先の週は重賞とオープン（種と日付で決まる）
static func races_of(wk: Dictionary) -> Array:
	if wk.i == 0: return HSWorld.week_races()
	return HSRaces.of_week(HSWorld.G.seed, wk.y, wk.m, wk.w)
# 出られない理由（出られるなら null）。今週は入厩まで、先の週は年齢・性と、いまの獲得賞金（G1）・移動（連闘で別の国へは行けない）で見る
static func why(h: Dictionary, race: Dictionary, wk: Dictionary) -> Variant:
	var G = HSWorld.G
	if wk.i == 0:
		if race.get("invite"): return "招待馬だけ"
		if h.get("loc") != "stable": return "入厩前" if h.get("loc") == "farm" else "出られない"
		var w0 = HSRaces.ineligible(h, race, G.year)
		return w0 if w0 else HSWorld.ride_taken(race.key, h.id)
	var st = HSSeason.static_ineligible(h, race, race.year)
	if st: return st
	var w1 = HSRaces.ineligible(h, race, race.year)
	return w1 if w1 else mine_reserved(h, race)
# 1つのレースに自分の馬は1頭まで（持ち主の決定 2026-10-20）：ほかのお手馬がそのレースを予約していれば、その理由
static func mine_reserved(h: Dictionary, race: Dictionary) -> Variant:
	if HSWorld.one_ride() and HSSeason.reserves().any(func(x): return x.key == race.key and x.id != h.id): return HSWorld.WHY_MINE
	return null
# 理由を見せて並べる「出られない」（移動が間に合わない・自分の騎乗とぶつかる）。ほかの理由のレースは表から外す
static func shown_why(w: Variant) -> bool:
	return w == HSFatigue.WHY or w == HSWorld.WHY_MINE or w == HSWorld.WHY_OFFER

# o：{ weeks（既定は予約できる52週）, show: "ok"|"all", kind: "all"|"graded", surf: ""|"芝"|"ダ" }
# 行：{ wk, race, why, dist, surf, fit（0〜6）, state: "entered"|"reserved"|null, can: "enter"|"reserve"|null, busy, others }
static func rows(h: Dictionary, o: Dictionary = {}) -> Array:
	var n: int = int(HSU.or_(o.get("weeks"), HSSeason.RESERVE_WEEKS))
	var ent = HSWorld.entry_of(h.id)
	var mineRsv := HSSeason.reserves(h.id); var allRsv := HSSeason.reserves()
	var out: Array = []
	for wk in weeks(n):
		var busyKey = null
		for x in mineRsv:
			if x.y == wk.y and x.m == wk.m and x.w == wk.w: busyKey = HSU.or_(x.get("key"), null); break
		for race in races_of(wk):
			var w = why(h, race, wk)
			var state = null
			if wk.i == 0 and ent and ent.raceKey == race.key: state = "entered"
			elif mineRsv.any(func(x): return x.key == race.key): state = "reserved"
			if not state:
				if o.get("kind") == "graded" and not race.get("graded"): continue
				if o.get("surf") and race.surface != o.surf: continue
				if w and not shown_why(w) and (o.get("show") != "all" or not race.get("graded")): continue # オープンは「すべて」でも出られないものは出さない。移動が間に合わない・ほかのお手馬や受けた依頼とぶつかるものは理由を見せる
			var dist := fit_dist(h, race.dist); var surf := fit_surf(h, race.surface)
			var can = null
			if not (w or state): can = "enter" if wk.i == 0 else (null if busyKey else "reserve")
			var others: Array = []
			for x in allRsv:
				if x.key == race.key and x.id != h.id:
					var oh = HSWorld.horse(x.id)
					if oh and oh.get("name"): others.append(oh.name)
			out.append({ wk = wk, race = race, why = w, dist = dist, surf = surf, fit = dist + surf, state = state, can = can, busy = not state and busyKey != null and wk.i > 0, others = others })
	# 週の中は、予約・登録したもの → 重賞（格の高い順）→ 適性の合う順
	var gr := func(r): return HSRaces.GRADE_RANK.get(r.race.grade, 0) + 1 if r.race.get("graded") else 0
	return HSU.stable_sort(out, func(a, b):
		if a.wk.i != b.wk.i: return a.wk.i < b.wk.i
		var sa := 1 if a.state else 0; var sb := 1 if b.state else 0
		if sa != sb: return sa > sb
		var ga: int = gr.call(a); var gb: int = gr.call(b)
		if ga != gb: return ga > gb
		if a.fit != b.fit: return a.fit > b.fit
		return a.race.dist < b.race.dist)
# ---- 1か月の格子（番組表の画面。docs/UI.md「番組表」：列は週・段は日本の重賞・オープン・欧州・その他） ----
# 段：jp＝日本の重賞（地方の Jpn・GF も）、op＝日本のオープン（OP・L）、eu＝欧州、ot＝その他の国（米・豪・香港・ドバイなど）
const BANDS := ["jp", "op", "eu", "ot"]
static func band_of(race: Dictionary) -> String:
	if race.get("region") != "海外": return "jp" if race.get("graded") else "op"
	var c = HSU.or_(race.get("country"), HSData.d().courses.get(race.course, {}).get("country"))
	return "eu" if HSWorld.zone_of(c) == "EU" else "ot"
# 予約できる範囲（今週から RESERVE_WEEKS 週）が何か月にまたがるか（今月を 0 として、最後の月の数）
static func last_month() -> int:
	var ws := weeks(HSSeason.RESERVE_WEEKS)
	var a: Dictionary = ws[0]; var z: Dictionary = ws[ws.size() - 1]
	return int((z.y - a.y) * 12.0 + z.m - a.m)
# 今月から k か月先の年と月
static func month_of(k: int) -> Dictionary:
	var G = HSWorld.G
	var n := int(G.year) * 12 + int(G.month) - 1 + k
	return { y = float(floori(n / 12.0)), m = float(posmod(n, 12) + 1) }
# k か月先の格子。rs は rows(h, o) の結果（画面が1度だけ作って使い回す）
# 返す：{ y, m, cols: [{ w, i（今週から何週後）, state: "past"（過ぎた週）|"out"（予約できる範囲の外）|"open", bands: { jp: [行…], op, eu, ot } }] }
# 列は1〜4週。12月の GF の週（5週目）は、いまがその週のときだけ列を足す。段の中の並びは rows の並び（予約・登録 → 格の高い順 → 向きの合う順）
static func month_grid(rs: Array, k: int) -> Dictionary:
	var G = HSWorld.G
	var ym := month_of(k)
	var ws := weeks(HSSeason.RESERVE_WEEKS)
	var nw := 5 if k == 0 and G.week > 4 else 4
	var cols: Array = []
	for w in range(1, nw + 1):
		var col := { w = float(w), i = -1, state = "past", bands = {} }
		for b in BANDS: col.bands[b] = []
		if k > 0 or float(w) >= G.week:
			col.state = "out"
			for wk in ws:
				if wk.y == ym.y and wk.m == ym.m and wk.w == float(w):
					col.i = int(wk.i); col.state = "open"
					break
		cols.append(col)
	for r in rs:
		if r.wk.y != ym.y or r.wk.m != ym.m: continue
		for col in cols:
			if col.state == "open" and col.i == int(r.wk.i):
				col.bands[band_of(r.race)].append(r)
				break
	return { y = ym.y, m = ym.m, cols = cols }
# 1段に入る札が slots 枚のとき、出す札と「ほか n」に回す札。入りきらないときは最後の1枚を「ほか n」にする
static func fit_band(list: Array, slots: int) -> Array:
	if list.size() <= slots: return [list, []]
	var k := maxi(slots - 1, 0)
	return [list.slice(0, k), list.slice(k)]
# この月に予約・登録したもの（月の札の印）
static func month_mine(rs: Array, k: int) -> bool:
	var ym := month_of(k)
	return rs.any(func(r): return r.state != null and r.wk.y == ym.y and r.wk.m == ym.m)

# 予約するレースを、鍵（年-月-週-…）から探す
static func find(key: Variant) -> Variant:
	var re := RegEx.create_from_string("^(\\d+)-(\\d+)-(\\d+)-")
	var m := re.search(str(key) if key else "")
	if not m: return null
	var y := float(m.get_string(1)); var mo := float(m.get_string(2)); var w := float(m.get_string(3))
	for wk in weeks(HSSeason.RESERVE_WEEKS + 1):
		if wk.y == y and wk.m == mo and wk.w == w:
			for r in races_of(wk):
				if r.key == key: return r
			return null
	return null
static func reserve(id: String, key: String) -> Variant:
	var race = find(key)
	if not race: return "レースが見つからない"
	return HSSeason.reserve(id, race)
# いちばん近い予定（今週の登録か、いちばん近い予約）
static func next(h: Dictionary) -> Variant:
	var ent = HSWorld.entry_of(h.id)
	if ent:
		var r = HSWorld.race_by_key(ent.raceKey)
		if r: return { race = r, label = "今週", entered = true }
	var rs := HSSeason.reserves(h.id)
	if not rs.size(): return null
	var x = rs[0]
	return { label = "%s月%s週" % [HSU.num(x.m), HSU.num(x.w)], name = x.label, key = x.key, reserved = true }
