# スペシャルホース（js/core/special.js の HS.Special と同じ）：1989年より前に走り終えた名馬。条件のグループにまとめ、
# 自分の馬がリーチをかけて出るレースに出てくる。勝てば馬の店に並ぶ
class_name HSSpecial

const MAX_IN_RACE := 4
const UNBEATEN := { "マルゼンスキー": 8.0, "ラフィアン": 10.0 }
const ALIAS := { "朝日杯3歳ステークス": "朝日杯フューチュリティステークス", "朝日盃3歳ステークス": "朝日杯フューチュリティステークス", "阪神3歳牝馬ステークス": "阪神ジュベナイルフィリーズ", "中山グランプリ": "有馬記念", "産経大阪杯": "大阪杯" }
static var _g1: Variant = null
static func _g1_map() -> Dictionary:
	if _g1 != null: return _g1
	_g1 = {}
	var ey := HSEraless.ERA
	for r in HSData.d().get("races", []):
		if r.get("grade") == "G1" and r.from <= ey and ey <= float(HSU.or_(r.get("to"), 9999.0)):
			_g1[r.name] = { short = HSU.or_(r.get("short"), r.name), prize = HSU.or_(r.get("prize"), 0.0), at = r.month * 10.0 + r.week, age = r.get("age"), region = r.get("region") }
	return _g1
static func map_win(s: String) -> Variant:
	var y := int(s.substr(0, 4))
	var name := s.substr(4)
	if name == "エリザベス女王杯" and y < 1996: name = "秋華賞"
	name = ALIAS.get(name, name)
	return _g1_map().get(name)

static func _gw(h: Dictionary) -> Array: return HSU.or_(h.get("gradedWins"), []).map(func(g): return { y = g.y, r = HSU.or_(g.get("short"), g.race) })
static func _won(h: Dictionary, name: String, pred: Variant = null) -> bool:
	return _gw(h).any(func(w): return w.r == name and (pred == null or pred.call(w.y)))
static func _dn(d: Dictionary, name: String) -> int: return HSU.or_(d.get("wins"), []).filter(func(x): return x.substr(4) == name).size()
static func _same_year(h: Dictionary, race: Dictionary, names: Array) -> bool:
	return names.all(func(n): return _won(h, n, func(y): return y == race.year))
static func _prev_year(h: Dictionary, race: Dictionary, name: String) -> bool: return _won(h, name, func(y): return y == race.year - 1)
static func _other(h: Dictionary, race: Dictionary, pairs: Dictionary) -> bool:
	var o = pairs.get(race.get("short"))
	return o != null and _won(h, o) and not _won(h, race.short)
const CLASSIC := ["皐月賞", "日本ダービー", "菊花賞"]
static func _g1_count(d: Dictionary) -> int: return HSU.or_(d.get("wins"), []).filter(func(x): return map_win(x) != null).size()
const OLD_BIG := ["皐月賞", "日本ダービー", "菊花賞", "桜花賞", "オークス", "天皇賞・春", "天皇賞・秋", "有馬記念", "宝塚記念", "安田記念", "ジャパンC", "エリザベス女王杯", "秋華賞", "朝日杯FS", "阪神JF"]
static func big_wins(d: Dictionary) -> Array:
	return HSU.or_(d.get("wins"), []).filter(func(x):
		var k = map_win(x)
		return k != null and (k.region != "JRA" or int(x.substr(0, 4)) >= 1984 or OLD_BIG.has(k.short)))
static func _race_of_win(name: String, y: float) -> Variant:
	for r in HSData.d().get("races", []):
		if r.name == name and r.from <= y and y <= float(HSU.or_(r.get("to"), 9999.0)): return r
	return null
static func _my_g1(h: Dictionary) -> Array:
	var out: Array = []
	for g in HSU.or_(h.get("gradedWins"), []):
		if g.get("grade") == "G1":
			var r = _race_of_win(g.race, g.y)
			if r: out.append(r)
	return out
const SPRINT := 1400.0
const STAY := 3000.0
static func _all_round(rs: Array) -> bool:
	return (rs.any(func(r): return r.surface == "ダ") and rs.any(func(r): return r.surface != "ダ")) or (rs.any(func(r): return r.dist <= SPRINT) and rs.any(func(r): return r.dist >= STAY))
const BEAT_MALES := ["天皇賞・秋", "天皇賞・春", "有馬記念", "ジャパンC", "宝塚記念"]
static func unbeaten_of(d: Dictionary) -> float: return float(HSU.or_(d.get("unbeaten"), HSU.or_(UNBEATEN.get(d.name), 0.0)))
const STREAK := 8.0

# グループ：finals＝最後のレース（短い名。null は「どれでも」）。legs・member は下の関数（id で分ける）
# グループの表はデータ（番組の G1）から作るので、初めて使うときに作る
static var _GROUPS: Variant = null
static func groups() -> Array:
	if _GROUPS == null: _GROUPS = _groups()
	return _GROUPS
# トロフィー（HSTrophy）のリーチで出てくる隠し馬（data/trophy_horses.js）。並んだあとも、またリーチをかければ出てくる（again）
static func _trophy_groups() -> Array:
	var out: Array = []
	var th: Dictionary = HSData.d().get("trophyHorses", {})
	for t in HSTrophy.list():
		var xs: Array = th.get(t.id, [])
		if not xs.size(): continue
		var when := {}
		var surf := {}
		for x in xs:
			if x.get("when"): when[x.name] = x.when
			if x.get("surf"): surf[x.name] = x.surf
		out.append({ id = "t:" + t.id, trophy = t.id, label = "トロフィー「%s」" % t.label, note = "%s（あと1勝のとき）" % t.note,
			finals = t.races.duplicate() if (t.kind == "set" or t.kind == "repeat") else null, again = true, needG1 = t.kind == "immortal",
			names = xs.map(func(x): return x.name), when = when, surf = surf })
	return out
# 隠し馬の出てくるとき（data/trophy_horses.js の when。持ち主の決定 2026-10-20）：書いていなければいつでも。
# "unbeaten"＝自分の馬がデビューから一度も負けていない（出走数と勝ち数が同じ。GF はどちらにも数えない）ときだけ
# 芝でもダートでも最後のレースになりうるトロフィーの隠し馬（surf）は、そのレースの馬場に合うほうだけ（race が null なら馬場は見ない）
static func unbeaten_now(h: Dictionary) -> bool: return float(HSU.or_(h.get("starts"), 0.0)) == float(HSU.or_(h.get("wins"), 0.0))
static func when_ok(g: Dictionary, d: Dictionary, h: Dictionary, race: Variant = null) -> bool:
	var s = g.get("surf", {}).get(d.name)
	if s != null and race != null and race.get("surface") and s != race.surface: return false
	var w = g.get("when", {}).get(d.name)
	return w == null or (w == "unbeaten" and unbeaten_now(h))
static func _groups() -> Array:
	var gs: Array = _trophy_groups() + [
		{ id = "nikan", label = "クラシック二冠馬", finals = CLASSIC },
		{ id = "filly", label = "牡馬を破った名牝", finals = BEAT_MALES },
		{ id = "long", label = "長距離の王者", finals = ["天皇賞・春"] },
		{ id = "allround", label = "万能の名馬", finals = null },
		{ id = "local", label = "地方から来た名馬", finals = null },
		{ id = "autumn", label = "秋の王者", finals = ["有馬記念"] },
		{ id = "spring", label = "春の王者", finals = ["宝塚記念"] },
		{ id = "grandprix", label = "グランプリホース", finals = ["有馬記念", "宝塚記念"] },
		{ id = "tenno", label = "天皇賞の春秋制覇", finals = ["天皇賞・秋", "天皇賞・春"] },
		{ id = "arima2", label = "有馬記念の連覇", finals = ["有馬記念"] },
		{ id = "mile", label = "マイルの王者", finals = ["マイルCS", "安田記念"] },
		{ id = "europe", label = "欧州の頂点", finals = ["凱旋門賞"] },
		{ id = "us2", label = "米国の名馬", finals = ["ベルモントS"] },
		{ id = "aus", label = "豪州の英雄", finals = ["メルボルンカップ"] },
		{ id = "gf", label = "伝説級の名馬", finals = null, top = true, fit = true, again = true },
		{ id = "gfall", label = "グランドフェスティバル全制覇", finals = null, top = true, again = true },
		{ id = "g1five", label = "G1を5勝した名馬", finals = null },
		{ id = "unbeaten", label = "無敗の名馬", finals = null },
	]
	var seen := {}
	for name in _g1_map():
		var m: Dictionary = _g1_map()[name]
		if seen.has(m.short): continue
		seen[m.short] = true
		gs.append({ id = "r:" + m.short, label = "歴代の%s馬" % m.short, finals = [m.short], race = true, at = m.at, prize = m.prize, two = m.age == "2", short = m.short })
	# G1 でない重賞の「歴代の○○馬」（js/core/special.js の SP.HAND_RACES と同じ）：手で入れた名馬（specialRaceHand）の行き先が G1 でないときだけ。
	# 出方は2歳の G1 と同じ軽い条件（重賞を勝った馬で、まだ勝っていないそのレースへ）。名馬は手で入れた馬だけ（hand）
	var ey := HSEraless.ERA
	for s in HSData.d().get("specialRaceHand", {}).values():
		if seen.has(s): continue
		for r in HSData.d().get("races", []):
			if r.get("short") == s and r.from <= ey and ey <= float(HSU.or_(r.get("to"), 9999.0)):
				seen[s] = true
				gs.append({ id = "r:" + s, label = "歴代の%s馬" % s, finals = [s], race = true, at = r.month * 10.0 + r.week, prize = HSU.or_(r.get("prize"), 0.0), two = true, short = s, hand = true, grade = r.get("grade") })
				break
	return gs
static var _BY: Variant = null
static func by_id() -> Dictionary:
	if _BY == null:
		_BY = {}
		for g in groups(): _BY[g.id] = g
	return _BY

static func legs(g: Dictionary, h: Dictionary, race: Dictionary) -> bool:
	var gwins: Array = HSU.or_(h.get("gradedWins"), [])
	if g.get("trophy"): return HSTrophy.reach(h, HSTrophy.by()[g.trophy], race)
	match g.id:
		"nikan": return CLASSIC.filter(func(n): return _won(h, n, func(y): return y == race.year)).size() == 1 and not _won(h, race.short, func(y): return y == race.year)
		"filly": return h.get("sex") == "牝" and gwins.any(func(x): return x.get("grade") == "G1") and not _won(h, race.short)
		"long": return _won(h, "菊花賞") and not _won(h, "天皇賞・春")
		"allround":
			if race.get("grade") != "G1": return false
			var rs := _my_g1(h)
			if not rs.size(): return false
			return not _all_round(rs) and _all_round(rs + [race])
		"local": return race.get("grade") == "G1" and race.get("region") == "JRA" and gwins.any(func(x): return x.get("region") == "地方") and not gwins.any(func(x): return x.get("grade") == "G1" and x.get("region") == "JRA")
		"autumn": return _same_year(h, race, ["天皇賞・秋", "ジャパンC"])
		"spring": return _same_year(h, race, ["天皇賞・春"])
		"grandprix": return _other(h, race, { "有馬記念": "宝塚記念", "宝塚記念": "有馬記念" })
		"tenno": return _other(h, race, { "天皇賞・秋": "天皇賞・春", "天皇賞・春": "天皇賞・秋" })
		"arima2": return _prev_year(h, race, "有馬記念")
		"mile": return _other(h, race, { "マイルCS": "安田記念", "安田記念": "マイルCS" })
		"europe": return _won(h, "英ダービー", func(y): return y == race.year) or _won(h, "キングジョージ", func(y): return y == race.year)
		"us2": return _same_year(h, race, ["プリークネスS"])
		"aus": return _same_year(h, race, ["コックスプレート"])
		"gf": return race.get("grade") == "GF" and HSSeason.gf_won_prev(h, race)
		"gfall": return race.get("grade") == "GF" and HSSeason.gf_all_won()
		"g1five": return race.get("grade") == "G1" and _gw(h).size() and gwins.filter(func(x): return x.get("grade") == "G1").size() == 4
		"unbeaten": return float(HSU.or_(h.get("starts"), 0.0)) == float(HSU.or_(h.get("wins"), 0.0)) and float(HSU.or_(h.get("wins"), 0.0)) == STREAK - 1
	if g.get("race"):
		return not _won(h, race.short) and (gwins.size() > 0 if g.two else gwins.any(func(x): return x.get("grade") == "G1"))
	return false
static func member(g: Dictionary, d: Dictionary) -> bool:
	if g.get("trophy"): return g.names.has(d.name)
	match g.id:
		"nikan": return (1 if _dn(d, "皐月賞") else 0) + (1 if _dn(d, "東京優駿") else 0) + (1 if _dn(d, "菊花賞") else 0) == 2
		"filly": return d.get("sex") == "牝" and ["天皇賞（春）", "天皇賞（秋）", "有馬記念", "ジャパンカップ", "宝塚記念"].any(func(n): return _dn(d, n) > 0)
		"long": return _dn(d, "菊花賞") > 0 and _dn(d, "天皇賞（春）") > 0
		"allround": return big_wins(d).size() > 0 and _all_round(HSHorse.win_races(d))
		"local": return HSU.truthy(d.get("local"))
		"autumn": return (1 if _dn(d, "天皇賞（秋）") else 0) + (1 if _dn(d, "ジャパンカップ") else 0) + (1 if _dn(d, "有馬記念") else 0) >= 2
		"spring": return _dn(d, "天皇賞（春）") > 0 and _dn(d, "宝塚記念") > 0
		"grandprix": return _dn(d, "宝塚記念") > 0 and _dn(d, "有馬記念") > 0
		"tenno": return _dn(d, "天皇賞（春）") > 0 and _dn(d, "天皇賞（秋）") > 0
		"arima2": return _dn(d, "有馬記念") >= 2
		"mile": return _dn(d, "安田記念") > 0 and _dn(d, "マイルチャンピオンシップ") > 0
		"europe": return _dn(d, "凱旋門賞") > 0 and (_dn(d, "英ダービー") > 0 or _dn(d, "キングジョージ6世＆クイーンエリザベスステークス") > 0)
		"us2": return _dn(d, "プリークネスステークス") > 0 and _dn(d, "ベルモントステークス") > 0
		"aus": return _dn(d, "コックスプレート") > 0 and _dn(d, "メルボルンカップ") > 0
		"gf": return HSU.truthy(d.get("gf")) and d.gf != "all"
		"gfall": return d.get("gf") == "all"
		"g1five": return _g1_count(d) >= 5
		"unbeaten": return unbeaten_of(d) >= STREAK
	if g.get("race"):
		# 手で入れた名馬（data/trophy_horses.js の specialRaceHand。js/core/special.js と同じ）
		if HSData.d().get("specialRaceHand", {}).get(d.name) == g.short: return true
		if g.get("hand"): return false
		return HSU.or_(d.get("wins"), []).any(func(x):
			var k = map_win(x)
			return k != null and k.short == g.short)
	return false

const WITH_BIG := false
static var _pool: Variant = null
static func pool() -> Array:
	if _pool != null: return _pool
	var prof := {}
	for f in HSData.d().get("profiles", []): prof[HSDatafix.norm_name(f.name)] = true
	_pool = HSData.d().get("historic", []).filter(func(d): return HSEraless.is_legend(d) and (prof.has(HSDatafix.norm_name(d.name)) or (WITH_BIG and big_wins(d).size()))) + HSData.d().get("legendsExtra", [])
	# 香港の三冠の隠し馬は1989年からの馬でもよい（data/trophy_horses.js の modern。持ち主の決定 2026-10-20）
	for n in modern():
		for d in HSData.d().get("historic", []):
			if d.name == n:
				if not _pool.has(d): _pool.append(d)
				break
	return _pool
# 1989年からの隠し馬（香港の三冠だけ。data/trophy_horses.js の modern）の名前
static var _modern: Variant = null
static func modern() -> Array:
	if _modern == null:
		_modern = []
		var th: Dictionary = HSData.d().get("trophyHorses", {})
		for xs in th.values():
			for x in xs:
				if x.get("modern") and not _modern.has(x.name): _modern.append(x.name)
	return _modern
static func is_modern(d: Dictionary) -> bool: return modern().has(d.name)
static func data(name: String) -> Variant:
	for d in pool():
		if d.name == name: return d
	return null
static func is_top(d: Dictionary) -> bool: return d.get("tier") == "legend"
const PRIORITY_REST := ["unbeaten", "long", "nikan", "arima2", "local", "allround", "filly", "europe", "autumn", "spring", "grandprix", "tenno", "mile", "us2", "aus", "g1five"]
static var _assign: Variant = null
static func _assign_all() -> Dictionary:
	if _assign != null: return _assign
	_assign = {}
	var order: Array = []
	var prio: Array = ["gf", "gfall"] + _trophy_groups().map(func(g): return g.id) + PRIORITY_REST
	for id in prio:
		if by_id().has(id): order.append(by_id()[id])
	order += HSU.stable_sort(groups().filter(func(g): return g.get("race")), func(a, b): return float(HSU.or_(a.get("prize"), 0.0)) > float(HSU.or_(b.get("prize"), 0.0)))
	var taken := {}
	for g in order:
		var list: Array = pool().filter(func(d): return not taken.has(d.name) and (is_top(d) if g.get("top") else not is_top(d)) and member(g, d))
		_assign[g.id] = HSU.stable_sort(list, func(a, b): return float(HSU.or_(a.get("rating"), 0.0)) > float(HSU.or_(b.get("rating"), 0.0)))
		for d in _assign[g.id]: taken[d.name] = true
	return _assign
static func members(g: Dictionary) -> Array: return _assign_all().get(g.id, [])
static var _list: Variant = null
static func list() -> Array:
	if _list != null: return _list
	var seen := {}
	for g in groups():
		for d in members(g):
			if not seen.has(d.name): seen[d.name] = { name = d.name, d = d, groups = [] }
			seen[d.name].groups.append(g.id)
	_list = HSU.stable_sort(seen.values(), func(a, b): return float(HSU.or_(a.d.get("rating"), 0.0)) > float(HSU.or_(b.d.get("rating"), 0.0)))
	return _list

static func reach(h: Dictionary, g: Dictionary, race: Dictionary) -> bool:
	return h.get("owner") == "P" and (g.finals == null or g.finals.has(race.get("short"))) and legs(g, h, race)
# 出てこられるか：ふつうはまだ店に並んでいない名馬だけ。伝説級（again）は、自分のお手馬（引退していない）になっていなければ何度でも
# 1989年からの隠し馬（is_modern）は、その年に世界で走っている（入厩・牧場の）ときは出さない（同じ馬が2頭にならないように）
# オーナーの依頼の馬にしたスペシャルホース（ハイセイコー・メジロティターン）：まだやり終えていないミッションの馬と、いま世界で走っている依頼の馬は出てこない（js/core/owners.js が SP.canAppear を包むのと同じ）
static func can_appear(g: Dictionary, d: Dictionary, un: Array) -> bool:
	if HSWorld.G.get("mode") == "jockey" and (HSOwners.reserved().has(d.name) or (HSOwners.mission_owner(String(d.name)) != null and HSEraless.active_names().has(d.name))): return false
	if is_modern(d) and HSEraless.active_names().has(d.name): return false
	if g.get("again"): return not HSWorld.mine().any(func(x): return x.name == d.name and x.get("loc") != "retired")
	return not un.has(d.name)
static func pending(h: Dictionary, race: Dictionary) -> Array:
	var un: Array = HSU.or_(HSWorld.G.get("unlocked"), [])
	var out: Array = []
	for g in groups():
		if reach(h, g, race):
			for d in members(g):
				if can_appear(g, d, un) and when_ok(g, d, h, race) and not out.any(func(x): return is_same(x.d, d)) and (not g.get("fit") or d.get("gf") == race.get("gf")): out.append({ d = d, g = g })
	var key := func(x): return (1000.0 if x.g.get("race") else 0.0) - float(HSU.or_(x.d.get("rating"), 0.0))
	return HSU.stable_sort(out, func(a, b): return key.call(a) < key.call(b))
static func reach_info(h: Dictionary) -> Array:
	var un: Array = HSU.or_(HSWorld.G.get("unlocked"), [])
	if h.get("owner") != "P": return []
	var out: Array = []
	var nextRaces: Array = HSWorld.upcoming_graded(52).filter(func(r): return r.inWeeks > 0 and not HSSeason.static_ineligible(h, r, r.year))
	for g in groups():
		var ms: Array = members(g).filter(func(d): return can_appear(g, d, un))
		if ms.is_empty(): continue
		var r = null
		for rc in nextRaces:
			if reach(h, g, rc) and ms.any(func(d): return when_ok(g, d, h, rc)): r = rc; break
		if r: out.append({ group = g, need = r.short if g.finals else ("次のG1" if (g.get("needG1") or ["g1five", "allround", "local"].has(g.id)) else "次のレース") })
	return out
# その場限りの馬にする。能力はデータのまま（トロフィーの難しさで底上げしない。持ち主の決定 2026-10-20）
static func horse(d: Dictionary, race: Dictionary) -> Dictionary:
	var age := 2.0 if race.get("age") == "2" else (3.0 if race.get("age") == "3" else 4.0)
	var h := HSHorse.from_historic(HSEraless.shift(d, (race.year - age) - d.born), "special:" + d.name)
	h.legend = true; h.owner = "AI"; h.loc = "legend"; h.starts = 8.0; h.wins = 8.0; h.earn = 50000.0
	if HSData.is_foreign(d):
		h.foreignTrained = true; h.country = HSU.or_(d.get("country"), "外")
	return h
static func for_race(race: Dictionary, entries: Array) -> Array:
	var names := {}; var out: Array = []
	var fromRace := 0
	for e in entries:
		if not e.get("mine") or not e.get("horse"): continue
		for sp in pending(e.horse, race):
			if names.has(sp.d.name) or out.size() >= MAX_IN_RACE: continue
			if sp.g.get("race") and fromRace >= 2: continue
			if sp.g.get("race"): fromRace += 1
			if race.get("sex") == "牝" and sp.d.get("sex") != "牝": continue
			names[sp.d.name] = true; out.append({ horse = horse(sp.d, race), legend = true })
	return out
static func after_race(race: Dictionary, sim: Dictionary) -> Array:
	var G = HSWorld.G
	var sps: Array = sim.results.filter(func(r): return r.horse.get("legend")).map(func(r): return r.horse.name)
	if not sps.size(): return []
	var win = sim.results[0]
	if not win or win.horse.get("owner") != "P":
		HSWorld.news("スペシャルホース %sに敗れた……。" % "・".join(sps), "warn"); return []
	if not G.get("unlocked"): G.unlocked = []
	var got: Array = sps.filter(func(n): return not G.unlocked.has(n))
	G.unlocked.append_array(got)
	if got.size(): HSWorld.news("%sがスペシャルホース %sを破った！ %sが馬の店に並ぶようになった。" % [win.horse.name, "・".join(got), "・".join(got)], "g1")
	return got
