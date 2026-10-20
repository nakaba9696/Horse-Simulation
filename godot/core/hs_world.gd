# ゲームの世界（js/core/world.js の HS.World と同じ）：状態・新しいゲーム・週を進める・AI・お金・市場・表彰・セーブ。
# 状態 G は JS の G と同じ形の Dictionary（セーブはその JSON）。乱数は世界の乱数（G.rngState から）と、レース・市場ごとの種から。
#   HSWorld.new_game({ mode = "jockey", seed = 1, jockeyName = "…", region = "美浦" })
#   var cards := HSWorld.cards()           # 今週の出走表（自分の馬に自分が乗る）
#   var sim = HSWorld.start_sim(card, { ride = true })  → HSSim.step … → HSSim.finish(sim)
#   HSWorld.finish_week({ card.race.key: HSSim.finish(sim) })  # 乗ったレースの結果を渡して週を進める
# js/core/owners.js が包んでいた所（新しいゲーム・セーブの直し・週の終わり・年明け）は、ここで同じ順に呼ぶ
class_name HSWorld

const SAVE_VERSION := 1.0
static var G: Variant = null
static var rng: HSRng = null

static func get_g() -> Variant: return G

# ---------- 索引（データから作る。セーブには入れない） ----------
static var histByName := {}
static var histByBorn := {}
static var histWinner := {}
static var mareByName := {}
static var histFoalsOfDam := {}
static var stallionByName := {}
static var foreignTrained := {}
static var jockeysByName := {}   # 騎手の名前 → データの騎手（同じ名前が年代で分かれていれば、データの順に）
static func index() -> void:
	var D := HSData.d()
	histByName = {}; histByBorn = {}; histWinner = {}; mareByName = {}; histFoalsOfDam = {}; stallionByName = {}; foreignTrained = {}
	for h in D.get("historic", []):
		histByName[h.name] = h
		var b := HSU.num(h.born)
		if not histByBorn.has(b): histByBorn[b] = []
		histByBorn[b].append(h)
		for w in HSU.or_(h.get("wins"), []): histWinner[w] = h.name
		if h.get("dam"):
			if not histFoalsOfDam.has(h.dam): histFoalsOfDam[h.dam] = []
			histFoalsOfDam[h.dam].append(h)
	for m in D.get("mares", []):
		mareByName[m.name] = m
	for m in D.get("mares", []):
		for f in HSU.or_(m.get("foals"), []):
			var y = f[0]; var sire = f[1]; var name = f[2]
			if not histFoalsOfDam.has(m.name): histFoalsOfDam[m.name] = []
			var arr: Array = histFoalsOfDam[m.name]
			if not arr.any(func(x): return x.name == name): arr.append(histByName.get(name, { name = name, born = y, sire = sire, dam = m.name, rating = 88.0, missing = true }))
	for s in D.get("stallions", []): stallionByName[s.name] = s
	jockeysByName = {}
	for j in D.get("jockeys", []):
		if not jockeysByName.has(j.name): jockeysByName[j.name] = []
		jockeysByName[j.name].append(j)
	var FOREIGN_EXTRA := ["ファルブラヴ", "サイレントウィットネス", "テイクオーバーターゲット"]
	var re_a := RegEx.create_from_string("調教馬|外国馬"); var re_b := RegEx.create_from_string("日本調教馬")
	for h in D.get("historic", []):
		var note: String = HSU.or_(h.get("note"), "")
		if FOREIGN_EXTRA.has(h.name) or (re_a.search(note) != null and re_b.search(note) == null): foreignTrained[h.name] = true

# ---------- 便利 ----------
static func w_idx() -> float: return HSHorse.week_index(G.year, G.month, minf(G.week, 4.0))   # 12月の GF の週（5）は12月4週と同じ
static func IDX() -> float: return HSU.price_index(G.year)
static func price_index() -> float: return IDX()
# 年の見せ方（年代なしのゲームは「n年目」）
static func y_label(y: float) -> String:
	if G and G.get("eraless"): return "%s年目" % HSU.num(y - G.startYear + 1.0)
	return "%s年" % HSU.num(y)
# 月と週（12月の GF の週は「12月 GF週」）
static func week_label(m: float, w: float) -> String: return "%s月 GF週" % HSU.num(m) if w > 4 else "%s月%s週" % [HSU.num(m), HSU.num(w)]
static func date_label(y: float, m: float, w: float) -> String:
	if w > 4: return "%s%s月 グランドフェスティバル" % [y_label(y), HSU.num(m)]
	return "%s%s月%s週" % [y_label(y), HSU.num(m), HSU.num(w)]
static func news(text: String, kind: String = "") -> void:
	G.news.push_front({ y = G.year, m = G.month, w = G.week, text = text, kind = kind })
	if G.news.size() > 120: G.news.resize(120)
static func new_id() -> String:
	var id := "h" + HSU.num(G.nextId); G.nextId += 1.0; return id
static func horse(id: Variant) -> Variant:
	if id == null: return null
	var h = G.horses.get(id)
	if h != null: return h
	return HSEraless.shop_horse(id)
static func all() -> Array: return G.horses.values()
static func mine(loc: String = "") -> Array:
	return all().filter(func(h): return h.get("owner") == "P" and (loc == "" or h.get("loc") == loc))
# 週ごとの使い回し（暦が進んだとき・持ち馬が変わったときに捨てる）
static var _wcache: Variant = null
static func wc() -> Dictionary:
	var key := "%s-%s-%s" % [HSU.num(G.year), HSU.num(G.month), HSU.num(G.week)] if G else ""
	if _wcache == null or _wcache.key != key: _wcache = { key = key }
	return _wcache
static func dirty() -> void: _wcache = null
# 使われている名前（{名前: true}。週の間は使い回し、新しい名前は足していく）
static func used_names() -> Dictionary:
	var c := wc()
	if not c.has("used"):
		var u := {}
		for n in histByName: u[n] = true
		for h in all(): u[h.name] = true
		c.used = u
	return c.used

# 遊んでいる間の使い回しを空にする（新しいゲーム・セーブを読んだとき）。
# JS 版はページを開いている間これらを持ち続けるので、セーブを読み直すと結果が変わることがある（馬主の own など。docs/GODOT.md）。
# Godot は、ページを開き直してセーブを読んだときの JS と同じにする
static func _reset_caches() -> void:
	_wcache = null; _cache = null; _soon = null; _week = null; _jk = {}; _jkName = {}
	HSOwners._own = null
	HSEraless._mk = null

# ---------- 新しいゲーム ----------
static func new_game(opts: Dictionary) -> Dictionary:
	var edits: Dictionary = HSU.or_(opts.get("edits"), {})
	HSEdits.apply(edits)
	index()
	var seed: float = HSU.or_(opts.get("seed"), float(Time.get_ticks_msec() % 1000000000))
	var eraless: bool = opts.get("mode") == "jockey" and opts.get("eraless") != false
	HSU.ERA = HSEraless.ERA if eraless else null
	var year0: float = HSEraless.START if eraless else float(HSU.or_(opts.get("year"), 1995.0))
	G = { v = SAVE_VERSION, seed = seed, rngState = seed, year = year0, month = 1.0, week = 1.0, eraless = eraless, startYear = year0, lineup = {}, unlocked = [], shopKeys = [], trophies = {}, hallOwn = [], gfShop = 1.0, gfTrophy = 1.0,
		player = { name = HSU.or_(opts.get("name"), "プレイヤー"), farm = HSU.or_(opts.get("farm"), "新星牧場"), crown = HSU.or_(opts.get("crown"), ""),
			silks = HSU.or_(opts.get("silks"), { base = "#1f4fbf", sub = "#ffd23f", pattern = "hoops" }), money = HSMath.round_js(float(HSU.or_(opts.get("money"), 30000.0)) * HSU.price_index(year0) / 10.0) * 10.0 },
		difficulty = HSU.or_(opts.get("difficulty"), "normal"),
		horses = {}, nextId = 1.0, erased = [], bornHist = [], pedExtra = {}, origFactor = {}, edits = edits, bond = {},
		records = { g1 = {}, graded = {}, awards = {}, pts = {}, course = {}, hall = [], player = { starts = 0.0, wins = 0.0, earn = 0.0, g1 = [] } },
		news = [], entries = {}, rides = {}, mode = "jockey" if opts.get("mode") == "jockey" else "owner", lastWeek = null, market = { gen = [], genMares = [], month = 0.0 },
		farmLevel = 1.0, stats = {}, settings = { animSpeed = 1.0, showHistNote = true }, broke = 0.0, gameOver = null, reserve = [], dc = null }
	_reset_caches()
	rng = HSRng.new(seed)
	HSPed.build(G.pedExtra)
	if eraless: HSEraless.populate()
	else:
		for b in range(int(G.year) - 9, int(G.year)):
			for d in histByBorn.get(str(b), []):
				if float(HSU.or_(d.get("retire"), d.born + 5.0)) < G.year and b < G.year - 2: continue
				spawn_historic(d, true)
	if G.mode == "jockey":
		var o := opts.duplicate(); o.year = G.year
		G.jockey = HSJockey.init(o)
		G.player.money = HSMath.round_js(8000.0 * HSU.price_index(G.year) / 10.0) * 10.0
		refresh_market(true)
		news("%s所属の新人騎手、%sがデビューした。まずは市場でデビュー前の史実馬を買おう。" % [G.jockey.region, G.jockey.name], "info")
		G.owners = HSOwners.init()   # owners.js の包み
		return G
	for i in 2:
		var m := make_gen_mare(rng, 52.0 + rng.int_(0, 10)); m.owner = "P"; m.loc = "mare"; G.horses[m.id] = m
	for age in [1, 2]:
		var y := make_gen_young(rng, G.year - age, 64.0 + rng.int_(0, 6)); y.owner = "P"; y.loc = "farm"; G.horses[y.id] = y
	refresh_market(true)
	news("%sの歩みが始まった。まずは市場と牧場を見てみよう。" % G.player.farm, "info")
	return G

# 史実馬を世界に出す（生まれたとき・開始時）
static func spawn_historic(d: Dictionary, at_start: bool) -> Variant:
	if G.bornHist.has(d.name) or G.erased.has(d.name): return null
	if (d.get("sire") and G.erased.has(d.sire)) or (d.get("dam") and G.erased.has(d.dam)):
		G.erased.append(d.name); return null
	var damH = null
	for x in all():
		if x.name == d.get("dam") and x.get("owner") == "P": damH = x; break
	if damH and not at_start: return null
	var h := HSHorse.from_historic(d, new_id())
	if foreignTrained.has(d.name) or HSData.is_foreign(d):
		h.foreignTrained = true; h.country = HSU.or_(d.get("country"), "外")
	G.bornHist.append(d.name)
	var age: float = G.year - d.born
	if at_start and age >= 2:
		for w in HSU.or_(d.get("wins"), []):
			var y := float(int(w.substr(0, 4)))
			if y < G.year:
				h.gradedWins.append({ y = y, race = w.substr(4), grade = "G1", hist = true }); h.earn += 9000.0; h.wins += 1.0
		if age >= 3:
			h.wins = HSU.mx(h.wins, 4.0 if d.rating >= 85 else (3.0 if d.rating >= 78 else 2.0))
			h.starts = h.wins * 2.0 + 2.0
			h.earn += h.wins * 1200.0
		h.loc = "stable" if age >= 3 else "farm"
		h.restUntil = w_idx() + rng.int_(0, 6)
	G.horses[h.id] = h
	return h

# 架空の繁殖牝馬
static func make_gen_mare(r: HSRng, quality: float) -> Dictionary:
	var used := used_names()
	var year: float = G.year
	var sire = pick_sire(r, year - 6.0)
	var m := {}
	m.id = new_id(); m.name = HSHorse.make_name(r, used); m.sex = "牝"; m.born = year - r.int_(4, 9); m.sire = sire.name if sire else null; m.dam = HSHorse.make_name(r, used)
	m.hist = false; m.owner = "AI"; m.loc = "mare"; m.quality = quality; m.coat = HSHorse.pick_coat(r, sire.get("coat") if sire else null)
	m.pot = HSHorse.make_stats(r, quality, 3.0)
	var apt := {}; apt.turf = 60.0 + r.int_(0, 40); apt.dirt = 40.0 + r.int_(0, 55); apt.heavy = 50.0; m.apt = apt
	m.distMin = 1200.0 + r.int_(0, 6) * 100.0; m.distMax = 1800.0 + r.int_(0, 8) * 100.0; m.growth = r.pick(HSHorse.GROWTHS); m.style = r.pick(HSHorse.STYLES); m.kire = float(r.int_(2, 7)); m.skills = []
	m.bonus = {}; m.wins = 0.0; m.starts = 0.0; m.earn = 0.0; m.gradedWins = []; m.results = []; m.cover = null; m.foals = []
	HSHorse.split_surface(m, r)
	HSPed.register(m.name, m.sire, m.dam)
	return m
# 架空の若馬（市場・最初の持ち馬）
static func make_gen_young(r: HSRng, born: float, mean: float) -> Dictionary:
	var used := used_names()
	var sire = pick_sire(r, born - 1.0)
	if sire == null: sire = { name = null, rating = 55.0, surface = "芝", distMin = 1400.0, distMax = 2200.0, growth = "普通" }
	var damName := HSHorse.make_name(r, used)
	var fakeMare := { name = damName, quality = mean - 8.0, surface = "芝" if r.chance(0.6) else "ダ" }
	HSPed.register(damName, null, null)
	var f := HSPed.make_foal(r, sire, fakeMare, born)
	for k in HSHorse.STATS: f.pot[k] = HSU.clamp(f.pot[k] + (mean - f.ev.mean), 25.0, 104.0)
	var h := horse_from_foal(f, sire.name, damName, born, null)
	h.coat = HSHorse.pick_coat(r, sire.get("coat"))
	return h
static func horse_from_foal(f: Dictionary, sireName: Variant, damName: Variant, born: float, name: Variant) -> Dictionary:
	var h := {}
	h.id = new_id(); h.name = HSU.or_(name, ""); h.sex = f.sex; h.born = born; h.sire = sireName; h.dam = damName; h.hist = false; h.owner = "AI"; h.loc = "farm"
	h.pot = f.pot; h.apt = f.apt; h.distMin = f.distMin; h.distMax = f.distMax; h.growth = f.growth; h.peakShift = f.peakShift; h.style = f.style
	h.kire = f.kire; h.skills = HSU.or_(f.get("skills"), []); h.health = f.health; h.bonus = {}; h.fatigue = 0.0
	h.wins = 0.0; h.starts = 0.0; h.w2 = 0.0; h.w3 = 0.0; h.earn = 0.0; h.prize = 0.0; h.gradedWins = []; h.results = []; h.restUntil = 0.0; h.coat = HSU.or_(f.get("coat"), "鹿毛")
	return h
static func display_name(h: Dictionary) -> String:
	return h.name if h.get("name") else "%sの%s" % [HSU.or_(h.get("dam"), "母不明"), HSU.num(h.born)]

# 種牡馬：その年に種付けできるもの（データ＋プレイヤーの種牡馬）
static func stallions_of(year: float) -> Array:
	var c := wc()
	if not c.has("st"): c.st = {}
	var k := HSU.num(year)
	if not c.st.has(k): c.st[k] = _stallions_of0(year)
	return c.st[k]
static func _stallions_of0(year: float) -> Array:
	var mineNames := {}
	for h in all():
		if h.get("owner") == "P": mineNames[h.name] = true
	var out: Array = []
	for s in HSData.d().get("stallions", []):
		if s.from > year or float(HSU.or_(s.get("to"), 9999.0)) < year: continue
		if year - s.born > 26: continue
		if G.erased.has(s.name) or mineNames.has(s.name): continue
		var x: Dictionary = s.duplicate(); x.fee = fee_of(s, year); x.owner = "AI"
		out.append(x)
	for h in all():
		if h.get("loc") == "stud" and year - h.born <= 26:
			out.append({ name = h.name, born = h.born, rating = h.studRating, fee = h.studFee, surface = "ダ" if h.apt.dirt > h.apt.turf + 10 else ("芝" if h.apt.turf > h.apt.dirt + 10 else "芝ダ"), distMin = h.distMin, distMax = h.distMax, growth = h.growth, kire = h.kire, skills = HSU.or_(h.get("skills"), []), traits = HSU.or_(h.get("studTraits"), []), owner = h.owner, horseId = h.id, coat = h.coat })
	return out
static func fee_of(s: Dictionary, year: float) -> float:
	var fee := 100.0
	for p in HSU.or_(s.get("fee"), []):
		if p[0] <= year: fee = p[1]
	if not HSU.or_(s.get("fee"), []).size(): fee = HSMath.round_js(50.0 + HSMath.pow_(HSU.mx(0.0, float(HSU.or_(s.get("rating"), 50.0)) - 40.0), 2.0) * 0.6)
	return fee
static func find_stallion(name: Variant) -> Variant:
	if not name: return null
	for h in all():
		if h.name == name and h.get("loc") == "stud": return { name = h.name, rating = h.studRating, traits = HSU.or_(h.get("studTraits"), []), kire = h.kire, skills = HSU.or_(h.get("skills"), []) }
	return stallionByName.get(name)
static func pick_sire(r: HSRng, year: float) -> Variant:
	var list := stallions_of(year)
	if not list.size(): return null
	# 重み（評価の2乗）はその週の一覧ごとに一度だけ出す（r.weighted と同じ足し方で、結果は同じ）
	var c := wc()
	if not c.has("stw"): c.stw = {}
	var k := HSU.num(year)
	if not c.stw.has(k):
		var ws := PackedFloat64Array()
		var total := 0.0
		for s in list:
			var w := maxf(0.0, HSMath.pow_(HSU.mx(5.0, HSU.or_(s.get("rating"), 50.0)), 2.0)); total += w; ws.append(w)
		c.stw[k] = [ws, total]
	return r.weighted_pre(list, c.stw[k][0], c.stw[k][1])

# ---------- 週のレース ----------
static var _cache: Variant = null
static func week_races() -> Array:
	var key := "%s-%s-%s" % [HSU.num(G.year), HSU.num(G.month), HSU.num(G.week)]
	if _cache == null or _cache.key != key:
		var list: Array = [] if G.week > 4 else HSRaces.of_week(G.seed, G.year, G.month, G.week)   # GF の週はグランドフェスティバルだけ
		for r in list: r.ground = HSRaces.ground(G.seed, G.year, G.month, G.week, r.course)
		HSSeason.add_special(list, G.year, G.month, G.week)
		_cache = { key = key, list = list }
	return _cache.list
static func race_by_key(key: Variant) -> Variant:
	for r in week_races():
		if r.key == key: return r
	return null
const ZONES := { "英": "EU", "愛": "EU", "仏": "EU", "独": "EU", "伊": "EU", "米": "US", "加": "US", "豪": "OC", "新": "OC", "香港": "HK", "UAE": "ME", "サウジ": "ME", "星": "SG" }
static func zone_of(c: Variant) -> String: return ZONES.get(c, "EU")
# 1〜6週先の重賞（その週の間は使い回す）
static var _soon: Variant = null
static func upcoming_soon() -> Array:
	var key := "%s-%s-%s" % [HSU.num(G.year), HSU.num(G.month), HSU.num(G.week)]
	if _soon == null or _soon.key != key: _soon = { key = key, list = upcoming_graded(7).filter(func(r): return r.inWeeks > 0) }
	return _soon.list
static func upcoming_graded(weeks: int) -> Array:
	var out: Array = []
	var y: float = G.year; var m: float = G.month; var w: float = G.week
	for i in weeks:
		for r in HSRaces.graded_of(y, m, w):
			r.inWeeks = float(i); out.append(r)
		w += 1.0
		if w > 4:
			w = 1.0; m += 1.0
			if m > 12:
				m = 1.0; y += 1.0
	return out

# プレイヤーの出走登録
static func enter(horseId: String, raceKey: String, jockeyName: Variant = null) -> Variant:
	var h = G.horses.get(horseId); var race = race_by_key(raceKey)
	if not h or not race: return "レースが見つからない"
	if h.get("loc") != "stable": return "入厩していない"
	var why = HSRaces.ineligible(h, race, G.year)
	if not why: why = ride_taken(raceKey, horseId)
	if why: return why
	if race.get("region") == "海外":
		var cost := travel_cost(race)
		if G.player.money < cost: return "遠征費（%s）が足りない" % HSU.money(cost)
	unenter(horseId)
	if not G.entries.has(raceKey): G.entries[raceKey] = []
	G.entries[raceKey].append({ horseId = horseId, jockey = jockeyName if jockeyName else best_free_jockey(raceKey, horseId) })
	return null
static func unenter(horseId: String) -> void:
	for k in G.entries.keys():
		G.entries[k] = G.entries[k].filter(func(e): return e.horseId != horseId)
		if not G.entries[k].size(): G.entries.erase(k)
# 騎手のゲームは、1つのレースに自分が乗る馬1頭だけ（おまかせ騎乗は無い。持ち主の決定 2026-10-20「おまかせ騎乗　なしにして」。world.js の W.rideTaken）。
# 自分の馬は1レース1頭まで。騎乗依頼を受けたレースには自分の馬を出せない（依頼のレースは依頼が先で自分の馬は取り消し。hs_owners.gd の apply_ride）
const WHY_MINE := "ほかのお手馬が出る"
const WHY_OFFER := "騎乗依頼を受けたレース"
static func one_ride() -> bool:
	return G != null and G.get("mode") == "jockey"
# このレースの騎乗がふさがっている理由（ふさがっていなければ null）。horseId の馬自身の登録は数えない
static func ride_taken(raceKey: String, horseId: String) -> Variant:
	if not one_ride(): return null
	for e in G.entries.get(raceKey, []):
		if e.horseId != horseId: return WHY_MINE
	var hid = HSU.or_(G.get("rides"), {}).get(raceKey)
	return WHY_OFFER if hid and hid != horseId else null
static func entry_of(horseId: String) -> Variant:
	for k in G.entries:
		for e in G.entries[k]:
			if e.horseId == horseId: return { raceKey = k, jockey = e.jockey }
	return null

# ---------- 騎手（年代ごと） ----------
static var _skillPts := {} # 騎手（データの辞書） → 年の順に並べた [年, 腕前]（データは変わらないので一度だけ並べる）
# 腕前の表の最後の年（数だけの騎手・表の無い騎手は -INF。どの年も同じ腕前）
static func _skill_last(j: Dictionary) -> float:
	var sk = j.get("skill")
	if typeof(sk) != TYPE_DICTIONARY or not sk.size(): return -HSMath.INF
	var m := -HSMath.INF
	for y in sk: m = maxf(m, float(y))
	return m
static func skill_at(j: Dictionary, year: float) -> float:
	if typeof(j.get("skill")) in [TYPE_FLOAT, TYPE_INT]: return j.skill
	var key := "%s|%s|%s" % [j.get("name"), j.get("from"), j.get("region")]
	var pts = null
	# 同じ名前・年・地域の別の騎手の辞書もあるので、鍵ごとに [辞書, 表] を並べて持つ（前は 1 つだけで、交互に並べ直していた）
	var lst: Array = _skillPts.get(key, [])
	for e in lst:
		if is_same(e[0], j): pts = e[1]; break
	if pts == null:
		pts = []
		var sk = HSU.or_(j.get("skill"), {})
		for y in sk: pts.append([float(y), sk[y]])
		pts = HSU.sort_by(pts, func(p): return p[0])
		lst.append([j, pts]); _skillPts[key] = lst
	if not pts.size(): return 70.0
	if year <= pts[0][0]: return pts[0][1]
	if year >= pts[pts.size() - 1][0]: return pts[pts.size() - 1][1]
	for i in pts.size() - 1:
		var y1: float = pts[i][0]; var v1: float = pts[i][1]; var y2: float = pts[i + 1][0]; var v2: float = pts[i + 1][1]
		if year >= y1 and year <= y2: return v1 + (v2 - v1) * (year - y1) / (y2 - y1)
	return 70.0
# その年に乗っている騎手（写しを返す）
# 騎手のデータは遊んでいる間は変わらないので、年・地域・年代なしかで使い回す（新しいゲーム・セーブを読んだときに空にする）
static var _jk := {}
static func jockeys_of(year: float, regions: Variant = null, copy := true) -> Array:
	var key: String = HSU.num(year) + ":" + (",".join(regions) if regions else "*") + (":E" if HSU.ERA else "")
	if not _jk.has(key): _jk[key] = _jockeys_of0(year, regions)
	return _jk[key].duplicate() if copy else _jk[key] # JS は1人ずつ写すが、騎手の辞書を書き換える所は無いので、並びだけ写す
static func _jockeys_of0(year: float, regions: Variant) -> Array:
	var out: Array = []
	for j in HSData.d().get("jockeys", []):
		if HSU.ERA:
			if not (j.from <= 2026 and float(HSU.or_(j.get("to"), 9999.0)) >= 1990 and (not regions or regions.has(j.region))): continue
			var s := 0.0
			var y := HSU.mx(j.from, 1990.0)
			while y <= HSU.mn(HSU.or_(j.get("to"), 2026.0), 2026.0):
				s = HSU.mx(s, skill_at(j, y)); y += 2.0
			out.append({ name = j.name, region = j.region, skill = HSMath.round_js(HSU.or_(s, skill_at(j, 2026.0))) })
		else:
			if not (j.from <= year and year <= float(HSU.or_(j.get("to"), 9999.0)) and (not regions or regions.has(j.region))): continue
			out.append({ name = j.name, region = j.region, skill = HSMath.round_js(skill_at(j, year)) })
	return HSU.stable_sort(out, func(a, b): return a.skill > b.skill)
const JRA := ["美浦", "栗東"]
static func riders_for_player(year: float) -> Array:
	return HSU.stable_sort(jockeys_of(year, JRA) + jockeys_of(year, ["外国"]).slice(0, 15), func(a, b): return a.skill > b.skill)
# 既定の騎手：その年の上位8人から、馬ごとに決まった1人（空いていなければ次）
static func best_free_jockey(raceKey: String, horseId: Variant) -> String:
	var taken := {}
	for e in G.entries.get(raceKey, []): taken[e.jockey] = true
	var list := jockeys_of(G.year, JRA)
	if not list.size(): return "騎手未定"
	var top := list.slice(0, mini(8, list.size()))
	var start := HSU.hash32("%s:%s" % [horseId if horseId else raceKey, HSU.num(G.year)]) % top.size()
	for i in list.size():
		var j = top[(start + i) % top.size()] if i < top.size() else list[i]
		if not taken.has(j.name): return j.name
	return list[0].name
# 騎手（名前と年で決まる。データは遊んでいる間は変わらないので、名前・年・年代なしかで覚えておき、写しを返す）
static var _jkName := {}
static func jockey(name: Variant) -> Dictionary:
	var yr: float = G.year if G else 2000.0
	var ck := "%s|%s|%s" % [name, HSU.num(yr), "E" if HSU.ERA else ""]
	if not _jkName.has(ck): _jkName[ck] = _jockey0(name, yr)
	return _jkName[ck].duplicate()
static func _jockey0(name: Variant, yr: float) -> Dictionary:
	var all_j: Array = jockeysByName.get(name, [])
	var j = null
	for x in all_j:
		if x.from <= yr and yr <= float(HSU.or_(x.get("to"), 9999.0)): j = x; break
	if j == null and all_j.size(): j = all_j[0]
	if j == null: return { name = HSU.or_(name, "騎手未定"), skill = 65.0, region = "" }
	if HSU.ERA:
		var s := 0.0; var y: float = j.from
		var last := _skill_last(j)
		while y <= float(HSU.or_(j.get("to"), 2026.0)):
			s = HSU.mx(s, skill_at(j, y)); y += 2.0
			# 表の最後の年から先は腕前が変わらないので、そこで止める（to＝9999 の騎手で 4000 回まわっていた。JS と同じ値）
			if y - 2.0 >= last: break
		return { name = j.name, region = j.region, skill = HSMath.round_js(HSU.or_(s, 70.0)) }
	return { name = j.name, region = j.region, skill = HSMath.round_js(skill_at(j, yr)) }
# 史実馬の主戦騎手（その年）
static func hist_jockey(h: Dictionary, year: float) -> Variant:
	var m = HSData.d().get("historicJockeys", {}).get(h.name)
	if not m: return null
	if typeof(m) == TYPE_STRING: return m
	var off: float = HSU.or_(G.lineup.get(h.name) if G.get("lineup") else null, 0.0)
	var v = m.get(HSU.num(year - off))
	if v: return v
	return HSU.or_(m.get("default"), null)
static func travel_cost(race: Dictionary) -> float:
	if race.get("region") != "海外": return 0.0
	var c = HSU.or_(race.get("country"), HSData.d().courses.get(race.course, {}).get("country"))
	return HSMath.round_js((3000.0 if ["仏", "英", "米", "愛", "加", "独"].has(c) else 1500.0) * IDX())

# ---------- AI の出走の判断 ----------
const GRADE_NEED := { G1 = 80.0, G2 = 76.0, G3 = 72.0 }
static func hist_targets(h: Dictionary, year: float) -> Array:
	var d = histByName.get(h.name)
	if not d: return []
	var off: float = HSU.or_(G.lineup.get(h.name) if G.get("lineup") else null, 0.0)
	var pre := HSU.num(year - off)
	var out: Array = []
	for s in HSU.or_(d.get("wins"), []) + HSU.or_(d.get("ran"), []):
		if s.begins_with(pre): out.append(s.substr(4))
	return out
static func ai_choose(h: Dictionary, races: Array, wIdx: float, r: HSRng) -> Variant:
	if h.get("owner") != "P" and h.get("loc") == "stable" and HSOwners.on():   # owners.js の包み（依頼の馬は、ミッションのレースの週にそのレースへ）
		var fr = HSOwners.forced_race(h, races)
		if fr: return fr
	if h.get("loc") != "stable": return null
	var year: float = G.year
	var targets: Array = hist_targets(h, year) if h.get("hist") else []
	for rc in races:
		if rc.get("graded") and targets.has(rc.name) and not HSRaces.ineligible(h, rc, year): return rc
	if wIdx < float(HSU.or_(h.get("restUntil"), 0.0)): return null
	if HSFatigue.stage(h) >= 2: return null   # 疲れ（段階2）より上は休む
	if targets.size():
		if upcoming_soon().any(func(rc): return targets.has(rc.name)): return null
	if not r.chance(0.35 if h.get("foreignTrained") else 0.5): return null
	if h.get("foreignTrained"):
		var z := zone_of(h.get("country"))
		var cand: Array = races.filter(func(rc): return rc.get("region") == "海外" and zone_of(rc.get("country")) == z and not HSRaces.ineligible(h, rc, year)) \
			.filter(func(rc): return rc.dist >= h.distMin - 300 and rc.dist <= h.distMax + 300 and (h.apt.dirt if rc.surface == "ダ" else h.apt.turf) >= 70)
		return r.pick(cand) if cand.size() else null
	var c := HSHorse.overall(HSHorse.cur(h, wIdx))
	var cand: Array = races.filter(func(rc): return not HSRaces.ineligible(h, rc, year) and rc.get("region") != "海外") \
		.filter(func(rc): return rc.dist >= h.distMin - 200 and rc.dist <= h.distMax + 200) \
		.filter(func(rc): return (h.apt.dirt if rc.surface == "ダ" else h.apt.turf) >= 70) \
		.filter(func(rc): return not rc.get("graded") or c >= float(GRADE_NEED.get(rc.grade, 72.0)) - (6.0 if year - h.born <= 3 else 0.0))
	if not cand.size(): return null
	# レースは OP 以上だけ。重賞に出られる強さの馬は、オープンを軽く見る（オープンは週に多いので、重さ1）
	var opW := 1.0 if c >= float(GRADE_NEED.G3) - (6.0 if year - h.born <= 3 else 0.0) else 4.0
	return r.weighted(cand, func(rc): return float(HSRaces.GRADE_RANK[rc.grade] * 3) if rc.get("graded") else opW)

# その場限りの馬の強さ（格・年齢・月から）
static func filler_level(race: Dictionary, _year: float) -> float:
	var m: float = race.month
	if race.get("region") == "海外": return 86.0
	if race.get("region") == "地方": return 74.0 if race.get("grade") == "G1" else 70.0
	if race.get("graded"):
		var gr: String = "G1" if race.grade == "GF" else race.grade
		if race.get("age") == "2": return float({ G1 = 71.0, G2 = 68.0, G3 = 66.0 }.get(gr, 66.0))
		if race.get("age") == "3" and m <= 6: return float({ G1 = 77.0, G2 = 74.0, G3 = 71.0 }.get(gr, 71.0))
		return float({ G1 = 81.0, G2 = 78.0, G3 = 76.0 }.get(gr, 76.0))
	# オープン（レースは OP 以上だけ）：2歳は6月 56 から月に1ずつ上がり、3歳は春は低め、古馬は G3 より6下。リステッドは1上
	var L := 1.0 if race.get("listed") else 0.0
	if race.get("age") == "2": return 50.0 + minf(12.0, maxf(6.0, m)) + L
	if race.get("age") == "3": return (64.0 if m <= 4 else (66.0 if m <= 6 else 69.0)) + L
	return 70.0 + L

# ---------- 週の流れ ----------
# 1. prepare_week：今週のレースの出走表を作る。G は変えない（同じ状態なら何度呼んでも同じ）
# 2. cards：プレイヤーの騎乗（G.rides）を当てた出走表と人気
# 3. finish_week：レースを走らせ（騎乗したレースは played の結果を使う）、結果・調教・暦を進める
static var _week: Variant = null
static func prepare_week() -> Dictionary:
	var wi := w_idx()
	var sig := PackedStringArray()
	for h in mine():
		sig.append("%s%s%s%s" % [h.id, h.get("loc"), "1" if h.get("auto") else "0", "s" if h.get("skipW") == wi else ""])
	var key := "%s-%s-%s:%s:%s:%s" % [HSU.num(G.year), HSU.num(G.month), HSU.num(G.week), HSU.num(G.rngState), JSON.stringify(G.entries), ",".join(sig)]
	if one_ride(): key += ":" + JSON.stringify(HSU.or_(G.get("rides"), {}))
	if _week != null and _week.key == key: return _week
	var r := HSRng.new(G.rngState)
	var allRaces := week_races()
	var races: Array = allRaces.filter(func(rc): return not rc.get("invite"))
	var field := {}
	for k in G.entries:
		var race = race_by_key(k)
		if not race: continue
		var lst: Array = []
		for e in G.entries[k]:
			var hh = G.horses.get(e.horseId)
			if hh and hh.get("loc") == "stable": lst.append({ horse = hh, jockeyName = e.jockey, mine = true })
		field[k] = lst
	for h in all():
		if h.get("owner") == "P" or h.get("loc") != "stable": continue
		var rc = ai_choose(h, races, wi, r)
		if not rc: continue
		if not field.has(rc.key): field[rc.key] = []
		field[rc.key].append({ horse = h })
	# プレイヤーの「おまかせ」の馬（出るレースを自動で選ぶ）。騎手のゲームでは、ほかの自分の馬・受けた依頼と同じレースを選んだら、残りのレースから選び直す（1レースに1頭。world.js と同じ）
	var busy = null
	if one_ride():
		busy = {}
		for k in field:
			if field[k].any(func(x): return x.get("mine")): busy[k] = true
		for k in HSU.or_(G.get("rides"), {}): busy[k] = true
	for h in mine("stable"):
		if not h.get("auto") or entry_of(h.id) or h.get("skipW") == wi: continue
		var rc = ai_choose(h, races, wi, r)
		if rc and busy != null and busy.has(rc.key):
			rc = ai_choose(h, races.filter(func(x): return not busy.has(x.key)), wi, r)
		if rc and rc.get("region") != "海外":
			if not field.has(rc.key): field[rc.key] = []
			field[rc.key].append({ horse = h, jockeyName = best_free_jockey(rc.key, h.id), mine = true, auto = true })
			if busy != null: busy[rc.key] = true
	for rc in allRaces:
		if rc.get("invite"): field[rc.key] = HSSeason.dc_field(rc)
	if G.get("eraless"):
		for rc in allRaces:
			var lg := HSSpecial.for_race(rc, field.get(rc.key, []))
			if lg.size(): field[rc.key] = field.get(rc.key, []) + lg
	var cards: Array = []
	for race in allRaces:
		var entr: Array = field.get(race.key, [])
		if not entr.size() and not (race.get("graded") and race.get("grade") == "G1"): continue
		var seed := float(r.int_(1, 2147483646))
		var card = build_field(race, entr, wi, HSRng.new(seed))
		if card:
			card.seed = seed; cards.append(card)
	_week = { key = key, wIdx = wi, cards = cards, finSeed = float(r.int_(1, 2147483646)), cardsKey = null, cardsOut = null }
	return _week

# 出走表を作る（頭数合わせ・騎手・枠）。r はこのレースの乱数
# 人気の見込み（set_odds の見積もりから運の揺れを除いたもの）。スペシャルホースと入れ替える馬を選ぶ（world.js の W.popEstimate）
static func pop_estimate(h: Dictionary, race: Dictionary, wIdx: float) -> float:
	return HSSim.power(h, race, wIdx, null).total + (1.5 if (h.get("hist") and h.gradedWins.size()) else 0.0)
static func swap_legends(race: Dictionary, runners: Array, legends: Array, wIdx: float) -> void:
	for lg in legends:
		var x := { horse = lg.horse, jockey = null, mine = false, legend = true }
		var low := -1; var lv := INF
		for i in runners.size():
			var rr: Dictionary = runners[i]
			if rr.get("mine") or rr.get("legend"): continue
			var v := pop_estimate(rr.horse, race, wIdx)
			if v < lv: lv = v; low = i
		if low < 0: runners.append(x)
		else: runners[low] = x
static func build_field(race: Dictionary, entr0: Array, wIdx: float, r: HSRng) -> Variant:
	var year: float = G.year
	var seen := {}
	var entr: Array = []
	for e in entr0:
		if e.get("horse") and not seen.has(e.horse.id):
			seen[e.horse.id] = true; entr.append(e)
	# スペシャルホース（隠し馬）は、出走表ができてから手持ちでない最低人気の馬と入れ替わる（world.js と同じ）
	var legends: Array = entr.filter(func(e): return e.get("legend"))
	if legends.size(): entr = entr.filter(func(e): return not e.get("legend"))
	var mx := HSRaces.max_field(race)
	HSSort.sort(entr, func(a, b):
		var d := (1.0 if b.get("legend") else 0.0) - (1.0 if a.get("legend") else 0.0)
		if d: return d
		return HSRaces.priority(b.horse, race, year, r) - HSRaces.priority(a.horse, race, year, r))
	var limit := mini(mx, 7) if race.get("region") == "地方" else mx
	var excluded: Array = []
	for e in entr.slice(limit):
		if e.get("mine"): excluded.append(e.horse.id)
	entr = entr.slice(0, limit)
	if not entr.size() and not (race.get("graded") and race.get("grade") == "G1"): return null
	var lvl := filler_level(race, year)
	var want: int
	if race.get("invite"): want = maxi(entr.size(), HSSeason.DC_FIELD)
	elif race.get("graded"): want = maxi(entr.size(), mini(mx, r.int_(mx - 4, mx)))
	else: want = maxi(entr.size(), r.int_(mini(10, mx), mx))
	var used := {} # このレースで付けた名前（使われている名前の表は写さずに、両方を見る）
	var usedAll := used_names()
	var runners: Array = []
	for e in entr:
		runners.append({ horse = e.horse, jockey = jockey(e.jockeyName) if e.get("jockeyName") else null, mine = HSU.truthy(e.get("mine")), legend = HSU.truthy(e.get("legend")) })
	while runners.size() < want:
		var born: float = year - (2.0 if race.get("age") == "2" else (3.0 if race.get("age") == "3" else 3.0 + r.int_(0, 3)))
		var foreign: bool = race.get("region") == "海外" and r.chance(0.85)
		var sire = pick_sire(r, born - 1.0)
		var fo := { level = lvl + r.normal(0.0, 1.5), surface = race.surface, dist = race.dist, born = born }
		if race.get("sex") == "牝": fo.sex = "牝"
		fo.foreign = foreign; fo.sireName = null if foreign else (sire.name if sire else null)
		var f := HSHorse.make_filler(r, fo)
		f.name = HSHorse.make_name(r, used, foreign, usedAll)
		f.local = race.get("region") == "地方" and not foreign
		runners.append({ horse = f, jockey = null })
	if legends.size(): swap_legends(race, runners, legends, wIdx)
	var taken := {}
	for x in runners:
		if x.jockey: taken[x.jockey.name] = true
	for x in runners:
		if x.jockey or not x.horse.get("hist"): continue
		var nm = hist_jockey(x.horse, year)
		if not nm or taken.has(nm): continue
		var ok := false
		for j in jockeysByName.get(nm, []):
			if (x.horse.get("legend") or ((float(HSU.or_(j.get("to"), 9999.0)) >= 1990 and j.from <= 2026) if HSU.ERA else (j.from <= year and year <= float(HSU.or_(j.get("to"), 9999.0))))):
				ok = true; break
		if not ok: continue
		x.jockey = jockey(nm); taken[nm] = true
	var pools := { JRA = jockeys_of(year, JRA, false), foreign = jockeys_of(year, ["外国"], false), local = jockeys_of(year, ["地方"], false) } # すぐ下の filter で新しい並びになる
	for k in pools: pools[k] = pools[k].filter(func(j): return not taken.has(j.name))
	var take := func(pool: Array, strong: bool) -> Dictionary:
		if not pool.size(): return { name = "騎手未定", skill = 60.0 }
		var k: int = mini(pool.size() - 1, r.int_(0, 3)) if strong else r.int_(0, pool.size() - 1)
		var j = pool[k]; pool.remove_at(k); return j
	var byPower: Array = HSU.stable_sort(runners.filter(func(x): return not x.jockey), func(a, b): return HSHorse.overall(HSHorse.cur(a.horse, wIdx)) > HSHorse.overall(HSHorse.cur(b.horse, wIdx)))
	for i in byPower.size():
		var x = byPower[i]
		var strong := i < 6
		if x.horse.get("foreign") or x.horse.get("foreignTrained"): x.jockey = take.call(pools.foreign if pools.foreign.size() else pools.JRA, strong)
		elif x.horse.get("local"): x.jockey = take.call(pools.local if pools.local.size() else pools.JRA, strong)
		else: x.jockey = take.call(pools.JRA if pools.JRA.size() else pools.foreign, strong)
	r.shuffle(runners)
	var n := runners.size()
	for i in n:
		var x = runners[i]
		x.num = float(i + 1); x.frame = frame_of(i + 1, n); x.weight = HSSim.weight_for(x.horse, race, year)
	# 国が変わる馬は移動の疲れ（HSFatigue。このレースから効き、レースのあと疲労に残る）
	for x in runners:
		var tv := HSFatigue.travel(x.horse, race)
		if tv > 0: x.travel = tv
	return { race = race, runners = runners, excluded = excluded }

# プレイヤーの騎乗を当てた出走表（人気つき）。騎乗が変わるまで使い回す
static func cards() -> Array:
	if HSOwners.on(): HSOwners.apply_ride()   # owners.js の包み（レースの週は依頼の馬に乗る。依頼が先）
	var wk := prepare_week()
	var rides: Dictionary = HSU.or_(G.get("rides"), {})
	var rk := JSON.stringify(rides)
	if wk.cardsKey == rk and wk.cardsOut != null: return wk.cardsOut
	var out: Array = []
	for c in wk.cards:
		var runners: Array = c.runners.map(func(x): return x.duplicate())
		var hid = rides.get(c.race.key)
		var me = null
		if hid:
			for x in runners:
				if x.horse.id == hid: me = x; break
		elif G.mode == "jockey":
			for x in runners:
				if x.get("mine"): me = x; break
		if me:
			me.jockey = HSJockey.player_jockey(); me.rider = "P"; me.allowance = HSJockey.allowance(c.race); me.weight = me.weight - me.allowance
		set_odds(runners, c.race, wk.wIdx, HSRng.new(float(int(c.seed) ^ 0x2545f491)))
		var cc: Dictionary = c.duplicate(); cc.runners = runners; cc.ride = me != null
		out.append(cc)
	wk.cardsKey = rk; wk.cardsOut = out
	return out
static func card_of(key: String) -> Variant:
	for c in cards():
		if c.race.key == key: return c
	return null
# 絆：その馬に自分で乗った回数（G.bond）
static func bond_of(h: Variant) -> float:
	if h and G and G.get("bond") and G.bond.get(h.id): return G.bond[h.id]
	return 0.0
static func start_sim(card: Dictionary, opts: Dictionary = {}):
	var o := { frames = true }; o.merge(opts, true)
	if o.get("ride") and o.get("bond") == null:
		for r in card.runners:
			if r.get("rider") == "P": o.bond = bond_of(r.horse); break
	return HSSim.create(card.race, card.runners, prepare_week().wIdx, HSRng.new(card.seed), o)

# played：{ raceKey: HSSim.finish の結果 }（プレイヤーが乗ったレース）
static func finish_week(played: Dictionary = {}) -> Dictionary:
	if HSOwners.on():   # owners.js の包み
		HSOwners.state().react = []; HSOwners.apply_ride()
	var wk := prepare_week()
	var cs := cards()
	var wIdx: float = wk.wIdx
	rng = HSRng.new(wk.finSeed)
	var report := { date = date_label(G.year, G.month, G.week), y = G.year, m = G.month, w = G.week, races = [], events = [] }
	for card in cs:
		var race: Dictionary = card.race; var runners: Array = card.runners
		for id in card.excluded:
			var h = G.horses.get(id)
			if h: news("%sは%sを除外された（賞金が足りない）。" % [h.name, HSRaces.label(race)], "warn")
		for x in runners:
			if x.get("mine") and race.get("region") == "海外":
				var c := travel_cost(race); G.player.money -= c; news("%sの%s遠征費 %s" % [x.horse.name, HSRaces.label(race), HSU.money(c)], "money")
		var hasMine: bool = runners.any(func(x): return x.get("mine")) or card.ride
		var watch: bool = hasMine or race.get("grade") == "G1" or HSU.truthy(race.get("invite"))
		var sim = played.get(race.key)
		if sim == null: sim = HSSim.run(race, runners, wIdx, HSRng.new(card.seed), { frames = watch })
		if played.has(race.key):
			for r in runners:
				if r.get("rider") == "P":
					if r.horse.get("id"): G.bond[r.horse.id] = float(HSU.or_(G.bond.get(r.horse.id), 0.0)) + 1.0
					break
		if race.get("grade") != "GF": HSJockey.record(race, sim, runners)   # GF は特別枠：リーディングに数えない
		apply_results(race, sim, runners, wIdx)
		var rec = note_record(race, sim)
		report.races.append({ race = race, sim = sim, runners = runners, hasMine = hasMine, watch = watch, ridden = played.has(race.key), ride = card.ride, rec = rec })
	G.entries = {}; G.rides = {}
	if G.week <= 4:   # GF の週は特別枠：時が進まない
		HSJockey.weekly()
		weekly_care(wIdx, report)
	var y0: float = G.year
	next_week(report)
	if G.year != y0: HSJockey.year_end(y0)
	if G.year != y0: HSTrophy.year_end(y0)   # 年末の表彰のトロフィー（ホールオブフェイム）
	HSJockey.week_start()
	G.rngState = floorf(rng.next() * 4294967296.0)
	G.lastWeek = { date = report.date, races = report.races.map(func(r): return slim_result(r)) }
	_week = null
	if HSOwners.on(): HSOwners.after_week(report)   # owners.js の包み（自分が乗ったレースの結果：ジャンルの勝ち・ミッション・出会い・次の依頼）
	return report

# コースレコード
static func rec_key(race: Dictionary) -> String: return "%s|%s|%s" % [race.course, race.surface, HSU.num(race.dist)]
static func course_record(race: Dictionary) -> Variant:
	if not G: return null
	return HSU.or_(G.records.get("course"), {}).get(rec_key(race))
static func record_check(race: Dictionary, time: float, old: Variant) -> Dictionary:
	var t := HSMath.round_js(time * 10.0) / 10.0
	return { t = t, old = old.t if old else null, beat = old != null and t < old.t, diff = HSMath.round_js((t - old.t) * 10.0) / 10.0 if old else null }
static func note_record(race: Dictionary, sim: Dictionary) -> Variant:
	var w = sim.results[0] if sim.results.size() else null
	if not w or not (w.time > 0): return null
	if not G.records.get("course"): G.records.course = {}
	var key := rec_key(race); var old = G.records.course.get(key)
	var chk := record_check(race, w.time, old)
	if old and not chk.beat: return null
	var rode: bool = w.get("rider") == "P"
	G.records.course[key] = { t = chk.t, name = w.horse.name, year = race.year, race = HSRaces.label(race), jockey = w.jockey.name if w.get("jockey") else "", rode = rode, mine = rode or w.horse.get("owner") == "P", prev = old.t if old else null }
	if old and (w.get("rider") == "P" or w.horse.get("owner") == "P"): news("%sが%s%s%smのコースレコードを塗り替えた（%s）。" % [w.horse.name, race.course, "ダート" if race.surface == "ダ" else "芝", HSU.num(race.dist), HSU.time(w.time)], "good")
	return { t = chk.t, old = old.t, diff = chk.diff, rode = rode, name = w.horse.name } if old else null
static func advance() -> Dictionary: return finish_week({})

static func frame_of(num: int, n: int) -> float:
	if n <= 8: return float(num)
	var base := n / 8; var extra := n % 8
	var start := 1
	for f in range(1, 9):
		var cnt := base + (1 if f > 8 - extra else 0)
		if num < start + cnt: return float(f)
		start += cnt
	return 8.0

static func set_odds(runners: Array, race: Dictionary, wIdx: float, r: HSRng = null) -> void:
	if r == null: r = rng
	var est: Array = []
	for x in runners:
		est.append(HSSim.power(x.horse, race, wIdx, x).total + r.normal(0.0, 1.8) + (1.5 if (x.horse.get("hist") and x.horse.gradedWins.size()) else 0.0))
	var mxe := -HSMath.INF
	for e in est: mxe = HSU.mx(mxe, e)
	var ex: Array = est.map(func(e): return HSMath.exp_(0.17 * (e - mxe)))
	var tot := HSU.sum(ex)
	for i in runners.size():
		runners[i].odds = HSU.clamp(HSMath.round_js(0.8 / (ex[i] / tot) * 10.0) / 10.0, 1.1, 999.9)
	var ord := HSU.stable_sort(runners, func(a, b): return a.odds < b.odds)
	for i in ord.size(): ord[i].pop = float(i + 1)

# 着順ごとの賞金（万円）
static func race_prize(race: Dictionary, pos: float) -> float:
	var sh := [1.0, 0.4, 0.25, 0.15, 0.1]
	return HSMath.round_js(float(HSU.or_(race.get("prize"), 500.0)) * (sh[int(pos) - 1] if pos >= 1 and pos <= 5 else 0.0))
static func apply_results(race: Dictionary, sim: Dictionary, runners: Array, wIdx: float) -> void:
	var year: float = G.year
	var pr: float = HSU.or_(race.get("prize"), 500.0)
	var share := [1.0, 0.4, 0.25, 0.15, 0.1]
	HSRating.annotate(race, sim.results, wIdx)   # 1走ごとのレーティング（hs_rating.gd）
	# 人気を先に付ける（お手馬のレースの記録に出走馬の人気を入れるため。JS と同じ）
	for res in sim.results:
		for rr in runners:
			if is_same(rr.horse, res.horse):
				res.odds = rr.get("odds"); res.pop = rr.get("pop"); res.mine = HSU.truthy(rr.get("mine")) or rr.get("rider") == "P"
				break
	var recOf = null
	for res in sim.results:
		var h: Dictionary = res.horse
		var x = null
		for rr in runners:
			if is_same(rr.horse, h): x = rr; break
		if h.get("legend"): continue
		if h.get("filler"):
			if race.get("graded") and (res.pos == 1 or (race.get("grade") == "G1" and res.pos <= 3)) and race.get("region") == "JRA": promote(h, race, res, wIdx)
			else: continue
		var gf: bool = race.get("grade") == "GF"   # GF は特別枠：出走数・勝ち数・疲れ・休みに数えない
		if not gf:
			h.starts = float(HSU.or_(h.get("starts"), 0.0)) + 1.0
			if res.pos == 1: h.wins = float(HSU.or_(h.get("wins"), 0.0)) + 1.0
			if res.pos == 2: h.w2 = float(HSU.or_(h.get("w2"), 0.0)) + 1.0
			if res.pos == 3: h.w3 = float(HSU.or_(h.get("w3"), 0.0)) + 1.0
		var money := HSMath.round_js(pr * share[res.pos - 1]) if res.pos <= 5 else 0.0
		h.prize = float(HSU.or_(h.get("prize"), 0.0)) + money
		if res.pos == 1: h.earn = float(HSU.or_(h.get("earn"), 0.0)) + pr
		if res.pos == 2 and race.get("graded"): h.earn = float(HSU.or_(h.get("earn"), 0.0)) + HSMath.round_js(pr * 0.4)
		if res.pos == 1 and h.get("owner") == "P" and G.get("eraless"): HSEraless.unlock_win(race)
		if race.get("graded") and res.pos == 1:
			var gw := { y = year, race = race.name, short = race.get("short"), grade = race.get("grade"), region = race.get("region") }
			h.gradedWins.append(gw)
			if h.get("owner") == "P":
				HSSeason.on_win(h, race, year)
				if gf: HSSeason.on_gf_win(h, race)
		if race.get("trialFor") and res.pos <= float(HSU.or_(race.get("trialTop"), 2.0)):
			if not h.get("rights"): h.rights = {}
			h.rights[race.trialFor] = year
		var rr := { y = year, m = race.month, w = race.week, race = HSU.or_(race.get("short"), race.name), grade = HSRaces.grade_badge(race), course = race.course, surface = race.surface, dist = race.dist, ground = race.get("ground"), pos = float(res.pos), n = float(sim.results.size()),
			time = HSMath.round_js(res.time * 10.0) / 10.0, margin = res.margin, last3f = HSMath.round_js(res.last3f * 10.0) / 10.0 if HSU.truthy(res.last3f) else null, jockey = res.jockey.name if res.get("jockey") else null, pop = res.pop, rt = res.get("rt") }
		# 自分の持ち馬は、出走馬・ラップ・勝ち時計の記録も残す（hs_racerec.gd。引退で消え、殿堂入りなら殿堂に残る）
		if h.get("owner") == "P":
			if recOf == null: recOf = HSRaceRec.make(race, sim)
			rr.rec = recOf
		h.results.append(rr)
		var keep := 80 if h.get("owner") == "P" else 12
		while h.results.size() > keep: h.results.pop_front()
		# 疲れ（HSFatigue：格×距離×激戦の度合い＋移動）・休み（GF は動かさない）。故障も調子も無い
		if not gf:
			HSFatigue.after_race(h, race, sim.results, int(res.pos) - 1, x.get("travel"))
			h.restUntil = wIdx + (5.0 + rng.int_(0, 4) if race.get("grade") == "G1" else 3.0 + rng.int_(0, 4))
			h.lastRaceW = wIdx
		if h.get("owner") == "P":
			var owner := HSMath.round_js(money * 0.8 + 30.0 * IDX())
			G.player.money += owner
			if not gf: G.records.player.starts += 1.0
			G.records.player.earn += owner
			if res.pos == 1:
				if not gf: G.records.player.wins += 1.0
				if race.get("graded"): G.records.player.g1.append({ y = year, race = HSU.or_(race.get("short"), race.name), grade = race.grade, horse = h.name, region = race.region })
				news("%sが%s%sを勝利！ 賞金 %s" % [h.name, HSRaces.label(race), "（" + HSRaces.grade_badge(race) + "）" if race.get("grade") else "", HSU.money(owner)], "g1" if race.get("grade") == "G1" else "win")
		if race.get("graded") or res.pos == 1:
			var pts := 0.0
			if race.get("graded"):
				var tab: Array = { G1 = [10.0, 4.0, 2.0], G2 = [4.0, 1.5, 0.5], G3 = [2.0, 0.6, 0.2] }.get(race.grade, [1.0, 0.0, 0.0])
				pts = tab[res.pos - 1] if res.pos <= tab.size() else 0.0
			elif res.pos == 1: pts = 0.3
			if pts > 0:
				var key: String = h.id
				if not G.records.pts.has(key): G.records.pts[key] = { name = h.name, born = h.born, sex = h.sex, owner = h.owner, hist = HSU.truthy(h.get("hist")), pts = 0.0, sprint = 0.0, dirt = 0.0, year = year }
				var rec: Dictionary = G.records.pts[key]
				rec.pts += pts
				if race.dist <= 1600 and race.surface == "芝": rec.sprint += pts
				if race.surface == "ダ": rec.dirt += pts
	if G.get("eraless"): HSTrophy.after_race(race, sim)   # 着差の合計・G1 の連勝のトロフィー
	if G.get("eraless"): HSSpecial.after_race(race, sim)
	if race.get("graded"):
		var win = sim.results[0]
		var hist = null if G.get("eraless") else histWinner.get(HSU.num(year) + race.name)
		var second = sim.results[1].horse.name if sim.results.size() > 1 else null
		var rec := { race = race.name, short = race.get("short"), grade = race.grade, region = race.region, m = race.month, w = race.week, winner = win.horse.name, owner = win.horse.owner, hist = HSU.truthy(win.horse.get("hist")), sire = win.horse.get("sire"), time = HSMath.round_js(win.time * 10.0) / 10.0, histWinner = hist, second = second }
		var yk := HSU.num(year)
		if race.grade == "G1":
			if not G.records.g1.has(yk): G.records.g1[yk] = []
			G.records.g1[yk].append(rec)
			var histNote: String = "（史実では%s）" % hist if (hist and hist != win.horse.name) else ""
			news("%sは%sが制した%s。" % [HSRaces.label(race), win.horse.name, histNote], "g1race")
		elif win.horse.get("owner") == "P":
			if not G.records.graded.has(yk): G.records.graded[yk] = []
			G.records.graded[yk].append(rec)

static func promote(f: Dictionary, race: Dictionary, _res: Dictionary, wIdx: float) -> void:
	f.erase("filler")
	f.id = new_id()
	var f2 := f.duplicate(); f2.growth = "普通"
	var g := HSHorse.growth_factor(f2, wIdx)
	for k in HSHorse.STATS: f.pot[k] = HSU.clamp(f.pot[k] / HSU.mx(0.75, g), 20.0, 106.0)
	f.owner = "AI"; f.loc = "stable"; f.promoted = true
	f.wins = 3.0 if race.get("graded") else 1.0; f.starts = 6.0; f.earn = 3000.0
	f.retireYear = f.born + 6.0 + rng.int_(0, 2)
	G.horses[f.id] = f
	var promoted: Array = all().filter(func(h): return h.get("promoted"))
	if promoted.size() > 160:
		promoted = HSU.stable_sort(promoted, func(a, b): return HSHorse.overall(a.pot) < HSHorse.overall(b.pot))
		for h in promoted.slice(0, promoted.size() - 160): G.horses.erase(h.id)

# 調教・放牧と疲労の回復（疲労は毎週、健康の値に応じて抜ける。レースに出た週も。HSFatigue）
static func weekly_care(wIdx: float, report: Dictionary) -> void:
	var raced := {}
	for r in report.races:
		for x in r.runners: raced[x.horse.id] = true
	for h in all():
		if h.get("loc") == "stable":
			if not raced.has(h.id):
				if h.get("owner") == "P":
					var menu: String = auto_menu(h, wIdx) if (G.mode == "jockey" or h.get("auto") or not h.get("menu")) else h.menu
					var tr := HSHorse.train(h, menu, rng, wIdx)
					h.lastTrain = { menu = menu, time = tr.time, date = report.date }
			HSFatigue.weekly(h)
		elif h.get("loc") == "farm":
			HSHorse.rest(h)
static func auto_menu(h: Dictionary, wIdx: float) -> String:
	var st := HSFatigue.stage(h)
	if st >= 3: return "休養"
	if st >= 2: return "軽め"
	var toRest: float = float(HSU.or_(h.get("restUntil"), 0.0)) - wIdx
	if toRest > 2: return rng.pick(["プール", "軽め", "ウッド(馬なり)"])
	if toRest > 0: return rng.pick(["坂路(強め)", "ウッド(強め)", "併せ馬"])
	return rng.pick(["坂路(馬なり)", "ウッド(馬なり)", "坂路(強め)"])

# 暦を1週進める（月末・年明けの処理を含む）
static func next_week(report: Dictionary) -> void:
	var endOfMonth: bool = G.week == 4
	if endOfMonth: month_end(report)
	# 12月4週が終わったら、グランドフェスティバルの招待。GF があれば GF の週（12月の5週め）に入る
	if G.week == 4 and G.month == 12 and HSSeason.gf_stage():
		G.week = HSSeason.GF_WEEK; _cache = null; return
	G.week += 1.0
	if G.week > 4:
		G.week = 1.0; G.month += 1.0
	if G.month > 12:
		G.month = 1.0; G.year += 1.0; new_year(report)
	if G.week == 1: month_start(report)
	_cache = null

static func monthly_cost() -> float:
	var c := 0.0
	for h in mine():
		if h.get("loc") == "stable": c += 60.0
		elif h.get("loc") == "farm": c += 15.0
		elif h.get("loc") == "mare": c += 15.0
	if G.mode != "jockey": c += G.farmLevel * 50.0
	return HSMath.round_js(c * IDX())
static func month_end(report: Dictionary) -> void:
	var c := monthly_cost()
	G.player.money -= c
	report.events.append("今月の経費 %s（預託料・牧場の維持費）" % HSU.money(c))
	if G.mode == "jockey": HSSeason.month_end()
	elif G.player.money < 0: news("資金がマイナスです（%s）。馬を売るなどして立て直そう。" % HSU.money(G.player.money), "warn")
static func month_start(report: Dictionary) -> void:
	if G.month == 3: foaling(report)
	refresh_market(false)
	if G.month == 4:
		var n := mine("farm").filter(func(h): return G.year - h.born == 2).size()
		if n and G.mode != "jockey": news("2歳馬が%d頭、入厩できるようになった。名前を付けて厩舎へ送ろう。" % n, "info")
	for h in all():
		if h.get("owner") == "P" or h.get("loc") != "farm": continue
		var age: float = G.year - h.born
		if age == 2 and G.month >= 5 and (rng.chance(0.25) or G.month >= 10):
			h.loc = "stable"; h.restUntil = w_idx() + rng.int_(0, 3)
		if age >= 3: h.loc = "stable"
	if G.month == 2: news("種付けの季節が来た（2月〜6月）。牧場から繁殖牝馬の相手を選ぼう。", "info")

static func new_year(report: Dictionary) -> void:
	if HSOwners.on(): HSOwners.retire_gifts()   # owners.js の包み
	var prev: float = G.year - 1.0
	awards(prev)
	for h in all():
		if h.get("owner") == "P": continue
		if h.get("loc") == "stable" or h.get("loc") == "farm":
			var age: float = G.year - h.born
			if (h.get("retireYear") and h.retireYear < G.year and age >= 2) or age >= 9: G.horses.erase(h.id)
	for h in mine("mare"):
		if G.year - h.born >= 23:
			news("%sは繁殖を引退した。" % h.name, "info"); G.horses.erase(h.id)
	var stud := 0.0
	for h in mine("stud"):
		var books := HSMath.round_js(30.0 + float(HSU.or_(h.get("studRating"), 50.0)) * 0.9)
		stud += HSMath.round_js(h.studFee * books * 0.25)
	if stud > 0:
		G.player.money += stud; news("種牡馬の種付け料収入 %s" % HSU.money(stud), "money")
	if G.get("eraless"): HSEraless.crop()
	G.records.pts = {}
	news("%s年が明けた。" % HSU.num(G.year), "info")

# 出産（3月）：プレイヤーの牝馬の仔と、史実馬の誕生
static func foaling(_report: Dictionary) -> void:
	for m in mine("mare"):
		if not m.get("cover"): continue
		if m.cover.year == G.year: continue
		if m.cover.year != G.year - 1 or not m.cover.ok:
			m.cover = null; continue
		var sire = find_stallion(m.cover.sire)
		if sire == null: sire = { name = m.cover.sire, rating = 60.0 }
		var histFoal = null
		for d in histFoalsOfDam.get(m.name, []):
			if d.born == G.year and d.get("sire") == m.cover.sire: histFoal = d; break
		var foal: Dictionary
		if histFoal and histByName.get(histFoal.name) and not G.bornHist.has(histFoal.name):
			foal = HSHorse.from_historic(histByName[histFoal.name], new_id())
			G.bornHist.append(histFoal.name)
			news("%sに%sの仔が誕生！ 史実の名馬「%s」だ！" % [m.name, sire.name, foal.name], "g1")
		else:
			var st := { distMin = 1600.0, distMax = 2400.0, surface = "芝" }
			var found = null
			for s in stallions_of(G.year - 1.0):
				if s.name == sire.name: found = s; break
			st.merge(found if found else sire, true)
			var f := HSPed.make_foal(rng, st, m, G.year)
			f.coat = HSHorse.pick_coat(rng, stallionByName.get(sire.name, {}).get("coat"), m.get("coat"))
			foal = horse_from_foal(f, sire.name, m.name, G.year, histFoal.name if (histFoal and not histByName.get(histFoal.name)) else "")
			if histFoal and foal.name:
				for k in HSHorse.STATS: foal.pot[k] = HSU.mn(104.0, foal.pot[k] + 10.0)
				G.bornHist.append(foal.name)
			news("%sに%sの仔（%s）が誕生した。" % [m.name, sire.name, foal.sex], "birth")
		foal.owner = "P"; foal.loc = "farm"
		G.horses[foal.id] = foal
		if foal.name: HSPed.register(foal.name, foal.sire, foal.dam)
		if not m.get("foals"): m.foals = []
		m.foals.append(foal.id)
		m.cover = null
	if not G.get("eraless"):
		for d in histByBorn.get(HSU.num(G.year), []):
			var damMine := all().any(func(h): return h.get("owner") == "P" and h.name == d.get("dam"))
			if damMine:
				if not G.bornHist.has(d.name) and not G.erased.has(d.name):
					G.erased.append(d.name); news("歴史が変わった……「%s」はこの世界には生まれなかった。" % d.name, "hist")
				continue
			spawn_historic(d, false)

# ---------- 厩舎・牧場の操作 ----------
static func to_stable(id: String) -> Variant:
	var h = G.horses.get(id)
	if not h or h.get("owner") != "P": return "持ち馬ではない"
	var age: float = G.year - h.born
	if age < 2 or (age == 2 and G.month < 4): return "入厩は2歳の4月から"
	if not h.get("name"): return "先に名前を付けてください"
	h.loc = "stable"
	return null
static func to_farm(id: String) -> Variant:
	var h = G.horses.get(id)
	if not h or h.get("owner") != "P": return "持ち馬ではない"
	unenter(id); h.loc = "farm"; return null
static func retire(id: String) -> Dictionary:
	dirty()
	var h = G.horses.get(id)
	if not h or h.get("owner") != "P": return { err = "持ち馬ではない" }
	unenter(id)
	if h.sex == "牝":
		h.loc = "mare"; h.cover = null; h.foals = []
		if mareByName.has(h.name): h.quality = mareByName[h.name].quality
		news("%sは引退し、繁殖牝馬になった。" % h.name, "info"); return { to = "mare" }
	var g1 := 0
	for g in h.gradedWins:
		if g.get("grade") == "G1": g1 += 1
	var data = stallionByName.get(h.name)
	if not h.get("gelding") and (data or g1 > 0 or float(HSU.or_(h.get("prize"), 0.0)) >= 30000 or h.gradedWins.size() >= 3):
		h.loc = "stud"
		var peak := HSHorse.overall(h.pot)
		h.studRating = data.rating if data else HSMath.round_js(HSU.clamp(peak * 0.85 + g1 * 2.5 + h.gradedWins.size() * 0.5, 40.0, 97.0))
		h.studFee = HSU.or_(fee_of(data, G.year + 1.0), 300.0) if data else HSMath.round_js(HSU.clamp(HSMath.pow_(HSU.mx(0.0, h.studRating - 45.0), 2.0) * 0.9, 50.0, 3000.0) / 10.0) * 10.0
		h.studTraits = HSU.or_(data.get("traits"), []) if data else []
		news("%sは種牡馬になった（種付け料 %s）。" % [h.name, HSU.money(h.studFee)], "g1")
		return { to = "stud" }
	G.horses.erase(id)
	news("%sは引退して乗馬になった。おつかれさま。" % h.name, "info")
	return { to = "gone" }

# ---------- 市場 ----------
static func refresh_market(force: bool) -> void:
	var key: float = G.year * 12.0 + G.month
	if not force and G.market.month == key: return
	var r := HSRng.new(float(HSU.hash32("mk:%s:%s" % [HSU.num(G.seed), HSU.num(key)])))
	G.market.month = key
	G.market.gen = []
	for i in 6:
		var age: float = r.pick([0.0, 1.0, 1.0, 2.0])
		if age == 0 and G.month < 4: continue
		var mean := 58.0 + r.normal(0.0, 7.0)
		var h := make_gen_young(r, G.year - age, mean)
		var sireFee := 100.0
		for s in stallions_of(G.year - age - 1.0):
			if s.name == h.sire: sireFee = s.fee; break
		var price := HSMath.round_js(((300.0 + HSMath.pow_(HSU.mx(0.0, mean - 40.0) / 10.0, 3.0) * 6.0 + r.normal(0.0, 150.0)) * IDX() + sireFee * 0.9) / 10.0) * 10.0
		G.market.gen.append({ horse = h, price = HSU.mx(200.0, price) })
	G.market.genMares = []
	for i in 4:
		var q := 45.0 + r.int_(0, 25)
		var m := make_gen_mare(r, q)
		G.market.genMares.append({ horse = m, price = HSMath.round_js((400.0 + HSMath.pow_(q / 10.0, 3.0) * 5.0) * IDX() / 10.0) * 10.0 })
# 史実馬（デビュー前）
static func market_historic() -> Array:
	if G.get("eraless"): return HSEraless.shop()
	var out: Array = []
	for h in all():
		if not h.get("hist") or h.get("owner") == "P" or h.get("loc") != "farm" or h.get("starts") > 0 or h.get("foreignTrained"): continue
		var age: float = G.year - h.born
		if age > 2: continue
		var d = histByName.get(h.name)
		var sire = null
		for s in stallions_of(h.born - 1.0):
			if s.name == h.get("sire"): sire = s; break
		if sire == null: sire = stallionByName.get(h.get("sire"))
		var sireFee: float = (sire.fee if sire.get("fee") != null else fee_of(sire, h.born - 1.0)) if sire else 200.0
		var price := (800.0 + HSU.mx(0.0, (d.rating if d else 80.0) - 80.0) * 60.0) * IDX() + sireFee * 1.1
		price *= 0.8 if age == 0 else (1.3 if age == 2 else 1.0)
		out.append({ kind = "hist", horse = h, data = d, price = HSMath.round_js(price / 10.0) * 10.0 })
	return HSU.stable_sort(out, func(a, b): return a.horse.born < b.horse.born or (a.horse.born == b.horse.born and a.price > b.price))
static func buy(item: Dictionary) -> Variant:
	dirty()
	var n := mine("mare").size() if (item.kind == "hmare" or item.kind == "gmare") else 0
	if (item.kind == "hmare" or item.kind == "gmare") and n >= farm_cap(): return "繁殖牝馬の枠がいっぱい（牧場を拡張しよう）"
	if G.player.money < item.price: return "資金が足りない"
	if G.mode == "jockey" and not HSSeason.can_buy(): return "お手馬は%s頭まで" % HSU.num(HSSeason.MAX_OWN)
	if item.kind == "pool": return HSEraless.buy(item)
	if item.kind == "hist":
		var h = G.horses.get(item.horse.id)
		if not h or h.get("owner") == "P": return "売り切れ"
		h.owner = "P"; h.loc = "farm"
		if h.get("foreignTrained"):
			h.foreignTrained = false; h.imported = true
		G.player.money -= item.price
		news("史実馬「%s」を%sで購入した！" % [h.name, HSU.money(item.price)], "g1")
		return null
	if item.kind == "gen" or item.kind == "gmare":
		var list: Array = G.market.gen if item.kind == "gen" else G.market.genMares
		var i := -1
		for k in list.size():
			if list[k].horse.id == item.horse.id: i = k; break
		if i < 0: return "売り切れ"
		var h: Dictionary = list[i].horse
		list.remove_at(i)
		h.owner = "P"; h.loc = "mare" if item.kind == "gmare" else "farm"
		G.horses[h.id] = h
		G.player.money -= item.price
		news("%sを%sで購入した。" % [display_name(h), HSU.money(item.price)], "money")
		return null
	return "不明な品"
static func farm_cap() -> float: return 4.0 + G.farmLevel * 2.0

# ---------- 表彰 ----------
static func awards(year: float) -> void:
	var list: Array = G.records.pts.values().filter(func(r): return r.year == year)
	if not list.size(): return
	var best := func(f: Callable, key: String) -> Variant:
		var c: Array = HSU.stable_sort(list.filter(f), func(a, b): return a[key] > b[key])
		return c[0] if (c.size() and c[0][key] > 0) else null
	var age := func(r): return year - r.born
	var A := {
		"年度代表馬": best.call(func(_r): return true, "pts"),
		"最優秀2歳牡馬": best.call(func(r): return age.call(r) == 2 and r.sex != "牝", "pts"),
		"最優秀2歳牝馬": best.call(func(r): return age.call(r) == 2 and r.sex == "牝", "pts"),
		"最優秀3歳牡馬": best.call(func(r): return age.call(r) == 3 and r.sex != "牝", "pts"),
		"最優秀3歳牝馬": best.call(func(r): return age.call(r) == 3 and r.sex == "牝", "pts"),
		"最優秀4歳以上牡馬": best.call(func(r): return age.call(r) >= 4 and r.sex != "牝", "pts"),
		"最優秀4歳以上牝馬": best.call(func(r): return age.call(r) >= 4 and r.sex == "牝", "pts"),
		"最優秀短距離馬": best.call(func(_r): return true, "sprint"),
		"最優秀ダートホース": best.call(func(_r): return true, "dirt"),
	}
	var out := {}
	for k in A:
		if A[k]: out[k] = { name = A[k].name, owner = A[k].owner }
	G.records.awards[HSU.num(year)] = out
	var top = out.get("年度代表馬")
	if top: news("%s年の年度代表馬は%s%s。" % [HSU.num(year), top.name, "（あなたの馬！）" if top.owner == "P" else ""], "g1" if top.owner == "P" else "info")

# ---------- セーブ ----------
static func slim_result(r: Dictionary) -> Dictionary:
	var rows: Array = []
	for x in r.sim.results:
		rows.append({ pos = float(x.pos), num = x.num, frame = x.frame, name = x.horse.name, mine = x.get("mine"), hist = HSU.truthy(x.horse.get("hist")), sex = x.horse.get("sex"), age = G.year - x.horse.born, jockey = x.jockey.name if x.get("jockey") else null, weight = x.weight,
			time = HSMath.round_js(x.time * 10.0) / 10.0, margin = x.margin, last3f = HSMath.round_js(x.last3f * 10.0) / 10.0 if HSU.truthy(x.last3f) else null, pop = x.get("pop"), odds = x.get("odds"), sire = x.horse.get("sire") })
	var race: Dictionary = r.race
	return { key = race.key, name = race.name, short = race.get("short"), rec = HSU.or_(r.get("rec"), null), grade = race.get("grade"), year = race.year, region = race.region, course = race.course, surface = race.surface, dist = race.dist, ground = race.get("ground"), mine = r.hasMine, rows = rows }
static func serialize() -> String:
	G.pedExtra = HSPed.extra
	return HSJson.stringify(G)
# セーブ（JSON の文字か、読んだあとの Dictionary）を読む。JS 版のセーブもそのまま読める
static func load_save(json: Variant) -> Dictionary:
	var g = HSJson.parse(json) if typeof(json) == TYPE_STRING else json
	if not g or not g.get("v") or not g.get("horses"): push_error("セーブデータが読めない"); return {}
	migrate(g)
	G = g
	HSU.ERA = HSEraless.ERA if G.get("eraless") else null
	HSEdits.apply(HSU.or_(G.get("edits"), {}))
	index()
	HSPed.build(HSU.or_(G.get("pedExtra"), {}))
	rng = HSRng.new(G.rngState)
	_reset_caches()
	if HSOwners.on(): HSOwners.plan_missing()   # owners.js の包み（前のセーブ：縁のある人のミッションの予定）
	return G
# 古いセーブを今の形にそろえる
static func migrate(g: Dictionary) -> void:
	var st := { animSpeed = 1.0, showHistNote = true }; st.merge(HSU.or_(g.get("settings"), {}), true); g.settings = st
	var rec := { g1 = {}, graded = {}, awards = {}, pts = {}, course = {}, hall = [], player = { starts = 0.0, wins = 0.0, earn = 0.0, g1 = [] } }; rec.merge(HSU.or_(g.get("records"), {}), true); g.records = rec
	if not g.get("market"): g.market = { gen = [], genMares = [], month = 0.0 }
	if not g.get("farmLevel"): g.farmLevel = 1.0
	for k in ["erased", "reserve", "unlocked", "trophies", "hallOwn", "bornHist"]:
		if not g.get(k): g[k] = {} if k == "trophies" else []
	if not g.get("rides"): g.rides = {}
	if not g.get("broke"): g.broke = 0.0
	if not g.get("gameOver"): g.gameOver = null
	if not g.get("dc"): g.dc = null
	if not g.get("lineup"): g.lineup = {}
	if g.get("eraless") and not HSU.truthy(g.get("shopKeys")): g.shopKeys = HSEraless.migrate_keys(g)   # JS と同じく、空の配列は「ある」
	if g.get("eraless") and not g.get("startYear"): g.startYear = 2025.0
	if not g.get("mode"): g.mode = "owner"
	if not g.get("pedExtra"): g.pedExtra = {}
	if not g.get("edits"): g.edits = {}
	if not g.get("bond"): g.bond = {}
	if g.get("dc"): HSSeason.dc_upgrade(g)
	HSTrophy.migrate_removed(g)   # 外したトロフィー（仕様書に無い5つ・豪州2歳三冠）の記録を消す
	if g.get("eraless") and not g.get("gfTrophy"):   # 前のセーブ（GF ごとのトロフィーより前）：勝った GF の区分のトロフィーを付ける
		HSTrophy.migrate_gf(g)
		g.gfTrophy = 1.0
	if g.get("eraless") and not g.get("gfShop"):
		for k in HSEraless.gf_keys(g):
			if not g.shopKeys.has(k): g.shopKeys.append(k)
		g.gfShop = 1.0
	for h in g.horses.values():
		if not h.get("bonus"): h.bonus = {}
		if not h.get("results"): h.results = []
		if not h.get("gradedWins"): h.gradedWins = []
		if not h.get("coat"): h.coat = "鹿毛"
		HSHorse.from_legacy(h)
		if h.get("pot"):
			for k in HSHorse.STATS:
				if h.pot.get(k) == null: h.pot[k] = HSU.or_(h.pot.get("spd"), 60.0)
		if h.get("kire") == null: h.kire = float({ "逃げ": 3.0, "先行": 4.0, "差し": 6.0, "追込": 6.0 }.get(h.get("style"), 4.0))
		if not h.get("skills"): h.skills = []
		# 騎手のゲームに放牧は無い（world.js と同じ）：前のセーブで放牧に出した馬は、次の週の頭に自動で入厩に戻す
		if g.mode == "jockey" and h.get("parked"): h.erase("parked")
		# 故障は無くなった（持ち主の仕様書「故障はなしにする」）：前のセーブで故障していた馬は治った扱い
		if h.has("injury"): h.erase("injury")
		if h.has("cond"): h.erase("cond")   # 調子は無くなった（持ち主の決定 2026-10-20）：前のセーブの調子の値は読み捨てる
	# レースが OP 以上だけになる前のセーブ（world.js と同じ）：条件戦（鍵が -c…）の予約・出走登録・騎乗を外す。デビュー戦の予約は、その週の2歳オープンに出る
	g.reserve = g.reserve.filter(func(x): return not HSRaces.is_old_key(x.get("key")))
	for x in g.reserve:
		if x.get("debut") and x.get("label") == "新馬戦": x.label = "デビュー戦"
	var ents = g.get("entries")
	if ents:
		for k in ents.keys():
			if HSRaces.is_old_key(k): ents.erase(k)
	for k in g.rides.keys():
		if HSRaces.is_old_key(k): g.rides.erase(k)
	# 騎手のゲームは1つのレースに自分が乗る馬1頭だけ（持ち主の決定 2026-10-20。world.js と同じ）：同じレースに自分の馬が2頭いれば1頭目だけ、受けた依頼のレースの自分の馬は外す
	if g.mode == "jockey" and ents:
		for k in ents.keys():
			if g.rides.get(k): ents.erase(k)
			elif ents[k].size() > 1: ents[k] = ents[k].slice(0, 1)
	for rc in HSU.or_(g.records.get("course"), {}).values():
		if rc.get("rode") == null: rc.rode = HSU.truthy(rc.get("mine")) and g.mode == "jockey"
	# オリジナルホースのインブリードの因子（G.origFactor）と血統（G.pedExtra）：前のセーブは牧場にいる馬から足す（hs_inbreed.gd）
	HSInbreed.migrate(g)
	g.v = SAVE_VERSION
	if g.mode == "jockey": g.owners = HSOwners.fill(g.get("owners"), g)   # owners.js の包み
