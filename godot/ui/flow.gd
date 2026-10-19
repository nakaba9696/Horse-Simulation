# 騎手のゲームの週の流れ（画面どうしをつなぐ）：タイトル → ホーム → （番組表・馬の店）→ 出走表 → 騎乗 → 週の結果 → ホーム
# 遊びの決まりは godot/core（HSWorld・HSJockey・HSOwners・HSProgram）を呼ぶだけで、ここでは作り直さない。
# その週に自分が乗るレース（HSJockey.my_rides）を順に出走表 → 騎乗へ回し、結果（HSSim.finish）を played に集めて HSWorld.finish_week に渡す。
# セーブは user://save.json（HSWorld.serialize。JS 版のセーブと同じ形）。週を締めるたびに自動で書く
class_name UiFlow
extends RefCounted

static var save_path := "user://save.json"   # テストは別の場所に替える
const SCENES := {
	"title": "res://scenes/title.tscn",
	"home": "res://scenes/home.tscn",
	"program": "res://scenes/program.tscn",
	"shop": "res://scenes/shop.tscn",
	"card": "res://scenes/race_card.tscn",
	"race": "res://scenes/race.tscn",
	"result": "res://scenes/week_result.tscn",
	"stable": "res://scenes/stable.tscn",
	"horse": "res://scenes/horse.tscn",
	"breed": "res://scenes/breed.tscn",
	"data": "res://scenes/data.tscn",
	"owners": "res://scenes/owners.tscn",
	"gf": "res://scenes/gf.tscn",
}

static var rides: Array = []        # 今週自分が乗るレース [{card, runner}]
static var ride_i := 0              # いま何鞍目か
static var played := {}             # { raceKey: HSSim.finish の結果 }（自分で乗ったレース）
static var ridden := {}             # { raceKey: "ride"｜"auto" }
static var report = null            # 最後に締めた週（HSWorld.finish_week の戻り値）
static var money0 := 0.0            # 週の初めの資金（週の結果で増減を出す）
static var in_week := false         # 騎乗の列を回している間
static var program_back := "home"   # 番組表からもどる画面（厩舎・お手馬の画面から開くとそこへ）
static var replay_back := "data"    # リプレイを見終えてもどる画面（お手馬の戦績から開くと horse）
static var focus := {}              # 画面ごとのカーソルの記憶 { 画面: 札の名前 }
static var program_id := ""         # 番組表で見ている馬
static var desc = null              # いま走るレースの見た目の一式（desc_of）
static var news_head = null         # 週の初めのいちばん新しいニュース（週の結果で、増えた分だけ出す）

static func active() -> bool:
	return HSWorld.G != null and HSJockey.is_mode()

# ---------- セーブ ----------
static func has_save() -> bool:
	return FileAccess.file_exists(save_path)

static var no_save := false         # 撮影の見本（demo）はセーブを書かない

static func save() -> void:
	if HSWorld.G == null or no_save:
		return
	var f := FileAccess.open(save_path, FileAccess.WRITE)
	if f:
		f.store_string(HSWorld.serialize())
		f.close()

static func load_game() -> bool:
	if not has_save():
		return false
	var s := FileAccess.get_file_as_string(save_path)
	if s.is_empty():
		return false
	no_save = false
	HSWorld.load_save(s)
	_reset_week()
	return active()

static func save_info() -> Dictionary:
	# タイトルの「つづきから」に出す要点（読まずに、セーブの頭だけ見る）
	if not has_save():
		return {}
	var g = HSJson.parse(FileAccess.get_file_as_string(save_path))
	if not (g is Dictionary) or not g.get("jockey"):
		return {}
	var y := float(g.year) - float(HSU.or_(g.get("startYear"), g.year)) + 1.0
	return {"name": String(g.jockey.name), "label": "%s年目 %s" % [HSU.num(y), HSWorld.week_label(g.month, g.week)], "money": float(g.player.money)}

static func new_game(name: String, region: String, seed := -1.0) -> void:
	if seed < 0.0:
		seed = float(int(Time.get_unix_time_from_system()) % 1000000000)
	no_save = false
	HSWorld.new_game({"mode": "jockey", "seed": seed, "jockeyName": name, "region": region})
	_reset_week()
	save()

static func _reset_week() -> void:
	rides = []
	ride_i = 0
	played = {}
	ridden = {}
	in_week = false
	report = null

# 撮影とテストの見本：決まった種の新しいゲームで、店のいちばん安い馬を買えるだけ（3頭まで）買い、
# weeks 週をおまかせで進める（毎週、馬主の最初の依頼を受ける）。セーブは書かない
static func demo(weeks := 0, seed := 7.0) -> void:
	no_save = true
	replay_dir = "user://demo_replays"   # 見本のリプレイは遊ぶときのものと混ぜない
	HSWorld.new_game({"mode": "jockey", "seed": seed, "jockeyName": "新人騎手", "region": "美浦"})
	_reset_week()
	# 見本は、はじめから全員と縁がある形にする（依頼の札・出走表・騎乗の場面を撮れるように。ふだんの遊びでは条件を満たすと縁ができる）
	for o in HSOwners.LIST():
		HSOwners.of(String(o.id)).known = true
	buy_cheapest(3)
	for i in weeks + 1:
		var offers := HSOwners.offers()
		if offers.size():
			HSOwners.accept(offers[0].raceKey, offers[0].horseId)
		if i < weeks:
			HSWorld.finish_week({})
			buy_cheapest(3)

# 撮影の見本：demo のあと今週の騎乗の列を作り、最初の鞍の一式を用意する（出走表・騎乗の場面を --demo で開く）
static func demo_ride(weeks := 1) -> bool:
	demo(weeks)
	rides = HSJockey.my_rides()
	ride_i = 0
	played = {}
	ridden = {}
	money0 = float(HSWorld.G.player.money)
	in_week = rides.size() > 0
	mark_news()
	if in_week:
		desc = desc_of(rides[0].card)
	return in_week

# 撮影の見本：グランドフェスティバルの週（--setup=gf）。一致テストの「GF の場面」のセーブ（11月4週・前の年のクラシックの GF の勝ち馬がいる）から GF の週まで進める
static func demo_gf() -> void:
	no_save = true
	replay_dir = "user://demo_replays"
	HSWorld.load_save(FileAccess.get_file_as_string("res://tests/golden/world_gf.json"))
	_reset_week()
	var guard := 0
	while not (HSWorld.G.month == 12 and HSWorld.G.week == HSSeason.GF_WEEK) and guard < 8:
		HSWorld.finish_week({})
		guard += 1
# 撮影の見本：GF の週の騎乗の列（GF の出走表を --setup=gf で開く）
static func demo_gf_ride() -> bool:
	demo_gf()
	rides = HSJockey.my_rides()
	ride_i = 0
	played = {}
	ridden = {}
	money0 = float(HSWorld.G.player.money)
	in_week = rides.size() > 0
	mark_news()
	if in_week:
		desc = desc_of(rides[0].card)
	return in_week

# 撮影の見本：今週の騎乗を決まった乗り方で全部乗り、週を締める（週の結果の画面を --demo で開く）
static func demo_week(weeks := 1) -> void:
	demo_ride(weeks)
	var nxt := "card" if in_week else close_week()
	while nxt == "card":
		desc = desc_of(current().card)
		var sim = HSWorld.start_sim(current().card, {"ride": true})
		nxt = ride_done(bot_ride(sim))

# 決まった乗り方（godot/tests/test_world.gd と同じ型）：出たらすぐしごき、直線の手前から追い、残り 250m でムチ、詰まったら外へ
static func bot_ride(sim) -> Dictionary:
	var nxt := 0.0
	while true:
		var s = sim.st[sim.me]
		var R: float = sim.D - s.x
		if not sim.ctl.started:
			HSSim.ctl_up(sim)
		else:
			if R < sim.straight + 350 and sim.ctl.gear < 1 and sim.t >= nxt:
				HSSim.ctl_up(sim); nxt = sim.t + 0.2
			if R < 250 and sim.t >= nxt + 0.3:
				HSSim.ctl_whip(sim, "R"); nxt = sim.t + 0.3
			if sim.ctl.blockedNow and sim.ctl.lane < 4:
				HSSim.ctl_lane(sim, 1)
		if HSSim.step(sim):
			break
	return HSSim.finish(sim)

static func demo_arg() -> int:
	for a in OS.get_cmdline_user_args():
		if a == "--demo": return 0
		if a.begins_with("--demo="): return int(a.substr(7))
	return -1

static func buy_cheapest(n: int) -> void:
	while HSWorld.mine().size() < n:
		var items: Array = HSU.stable_sort(HSWorld.market_historic(), func(a, b): return a.price < b.price)
		var got := false
		for it in items:
			if it.price <= HSWorld.G.player.money:
				got = HSWorld.buy(it) == null
				break
		if not got:
			return

# ---------- 暦・資金（どの画面の帯でも同じ） ----------
static func year_n() -> int:
	var G = HSWorld.G
	return int(G.year - float(HSU.or_(G.get("startYear"), G.year))) + 1

static func date_label() -> String:
	var G = HSWorld.G
	return "%d年目 %s" % [year_n(), HSWorld.week_label(G.month, G.week)]

static func money_label(v = null) -> String:
	return HSU.money(float(HSWorld.G.player.money if v == null else v))

# ---------- 週の流れ ----------
# 「レースへ」：今週の騎乗の列を作る。乗るレースが無ければそのまま週を締める
static func begin_week() -> String:
	rides = HSJockey.my_rides()
	ride_i = 0
	played = {}
	ridden = {}
	money0 = float(HSWorld.G.player.money)
	mark_news()
	in_week = true
	return "card" if rides.size() > 0 else close_week()

static func current() -> Variant:
	return rides[ride_i] if in_week and ride_i < rides.size() else null

# 騎乗を終えた（res＝HSSim.finish の結果）か、おまかせで乗る（res＝null）
static func ride_done(res) -> String:
	var r = current()
	if r != null:
		var key: String = r.card.race.key
		if res != null:
			played[key] = res
			ridden[key] = "ride"
			if desc is Dictionary and String(desc.race.get("key", "")) == key:
				save_replay(desc, res)
		else:
			ridden[key] = "auto"
		ride_i += 1
	return "card" if current() != null else close_week()

static var trophies0: Array = []     # 週の初めに手にしていたトロフィー（週の結果の見せ場で、増えた分を出す）
static var unlocked0: Array = []     # 週の初めに破っていたスペシャルホース

static func mark_news() -> void:
	var G = HSWorld.G
	var n: Array = G.news
	news_head = n[0] if n.size() else null
	trophies0 = HSU.or_(G.get("trophies"), {}).keys()
	unlocked0 = HSU.or_(G.get("unlocked"), []).duplicate()

# この週に手にしたトロフィー（[{id, label, horse, bonus}]）と、破ったスペシャルホースの名前
static func week_trophies() -> Array:
	var out: Array = []
	var tr: Dictionary = HSU.or_(HSWorld.G.get("trophies"), {})
	for id in tr:
		if not trophies0.has(id):
			out.append({"id": id, "label": HSTrophy.by()[id].label if HSTrophy.by().has(id) else id, "horse": tr[id].horse, "bonus": float(HSU.or_(tr[id].get("bonus"), 0.0))})
	return out

static func week_beaten() -> Array:
	return HSU.or_(HSWorld.G.get("unlocked"), []).filter(func(n): return not unlocked0.has(n))

# 週の初めからあとに増えたニュース（新しい順）
static func week_news() -> Array:
	var out: Array = []
	for nw in HSWorld.G.news:
		if news_head != null and is_same(nw, news_head):
			break
		out.append(nw)
	return out

# 週の結果を見終えた：馬主のひと言とご褒美の場面を見たことにする（JS の ownersAfterWeek と同じく空にする）
static func after_result() -> void:
	if HSOwners.on():
		var s := HSOwners.state()
		s.react = []
		s.queue = []
	save()

# 週を締める（乗らなかったレースはおまかせで走る）→ 週の結果
static func close_week() -> String:
	if not in_week:
		money0 = float(HSWorld.G.player.money)
		mark_news()
	report = HSWorld.finish_week(played)
	in_week = false
	rides = []
	save()
	return "result"

static func go(tree: SceneTree, name: String) -> void:
	tree.change_scene_to_file(SCENES[name])

# ---------- リプレイ（js/core/replay.js と同じく、種からやり直さずに描画のコマを残す） ----------
# 自分で乗ったレースを user://replays/<id>.json に残す（セーブとは別。20本まで、古いものから消す）。
# 中身は記録の再生（ViewReplay）が読む形：出走表の一式（race・track・horses・me）と 0.2 秒ごとのコマ・着順・実況
static var replay_dir := "user://replays"   # テストは別の場所に替える
const REPLAY_MAX := 20
const REPLAY_DT := 0.2
static var replay_path := ""        # 見直すリプレイ（騎乗の画面が再生で開く）

static func replay_list() -> Array:
	var p := replay_dir.path_join("index.json")
	if not FileAccess.file_exists(p):
		return []
	var v = JSON.parse_string(FileAccess.get_file_as_string(p))
	return v if v is Array else []

static func save_replay(d: Dictionary, res: Dictionary) -> void:
	var fr = res.get("frames")
	if not (fr is Array) or fr.size() < 2:
		return
	# 0.2 秒ごとにそろえる（模擬のコマは最後だけ間が違う）。0 秒は全馬スタートの位置
	var n: int = d.horses.size()
	var times: Array = fr.map(func(f): return float(f.t))
	var t_end: float = times[times.size() - 1]
	var frames: Array = []
	var me_rows: Array = res.get("meRows", [])
	var mi := 0
	var k := 0
	var t := 0.0
	while t <= t_end + 1e-6:
		while k < times.size() - 2 and times[k + 1] < t:
			k += 1
		var a: Dictionary = fr[k]
		var b: Dictionary = fr[mini(k + 1, fr.size() - 1)]
		var u := clampf((t - float(a.t)) / maxf(1e-6, float(b.t) - float(a.t)), 0.0, 1.0)
		if t < float(a.t): u = 0.0
		var p: Array = []
		for j in n:
			var pa: Array = a.p[j]
			var pb: Array = b.p[j]
			var x := lerpf(float(pa[0]), float(pb[0]), u) if t >= float(a.t) else 0.0
			p.append([snappedf(x, 0.01), snappedf(lerpf(float(pa[1]), float(pb[1]), u), 0.001), snappedf(lerpf(float(pa[2]), float(pb[2]), u), 0.01)])
		var fr_d := {"t": snappedf(t, 0.1), "p": p}
		if me_rows.size():
			# 自分の馬の値：t より前でいちばん近いもの [手綱の段, 気分, 脚の残り, ムチの手, 掛かり, 詰まり, 気合, 競り合い]
			while mi < me_rows.size() - 1 and float(me_rows[mi + 1][0]) <= t + 1e-6:
				mi += 1
			var mr: Array = me_rows[mi]
			fr_d.me = [mr[1], mr[2], mr[3], mr[4], mr[5], mr[6], mr[7], mr[8]]
		frames.append(fr_d)
		t += REPLAY_DT
	var results: Array = []
	for r in res.results:
		results.append({"pos": int(r.pos), "num": int(r.num), "name": String(r.horse.name), "time": float(r.time), "margin": String(r.margin)})
	var events: Array = []
	for e in res.events:
		events.append({"t": float(e.t), "text": String(e.text), "kind": String(e.get("kind", ""))})
	var horses: Array = []
	for h in d.horses:
		var hh: Dictionary = h.duplicate()
		horses.append(hh)
	var G = HSWorld.G
	var me_pos := 0
	for r in results:
		if r.num == int(d.horses[d.me].num): me_pos = r.pos
	var id := "%d" % Time.get_unix_time_from_system()
	# 同じ秒に2本残すとき（自動で乗る見本・テスト）は名前を分ける（前は上書きになり、索引の2行が同じ中身を指していた）
	var base_id := id
	var dup := 1
	while FileAccess.file_exists(replay_dir.path_join(id + ".json")):
		id = "%s_%d" % [base_id, dup]
		dup += 1
	var rep := {"about": "ターフの系譜：リプレイ", "race": d.race, "track": d.track, "horses": horses, "me": d.me, "dt": REPLAY_DT,
		"frames": frames, "results": results, "winnerTime": float(res.winnerTime), "events": events, "whips": res.get("whips", []), "record": d.get("record")}
	DirAccess.make_dir_recursive_absolute(replay_dir)
	var f := FileAccess.open(replay_dir.path_join(id + ".json"), FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify(rep))
	f.close()
	var list := replay_list()
	list.push_front({"id": id, "date": date_label(), "race": String(d.race.name), "grade": String(d.race.grade), "course": "%s %s%dm" % [d.race.course, d.race.surface, int(d.race.dist)],
		"horse": String(d.horses[d.me].name), "pos": me_pos, "fav": false})
	while list.size() > REPLAY_MAX:
		var drop := -1
		for i in range(list.size() - 1, -1, -1):
			if not list[i].get("fav"): drop = i; break
		if drop < 0: break
		DirAccess.remove_absolute(ProjectSettings.globalize_path(replay_dir.path_join(String(list[drop].id) + ".json")))
		list.remove_at(drop)
	_write_replay_index(list)

static func _write_replay_index(list: Array) -> void:
	DirAccess.make_dir_recursive_absolute(replay_dir)
	var f := FileAccess.open(replay_dir.path_join("index.json"), FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(list))
		f.close()

static func replay_fav(id: String) -> bool:
	var list := replay_list()
	for x in list:
		if String(x.id) == id:
			x.fav = not x.get("fav")
			_write_replay_index(list)
			return x.fav
	return false

# ---------- レースの見た目の一式（出走表・騎乗の画面が読む形。tools/export_race.js の JSON と同じ項目） ----------
static func desc_of(card: Dictionary) -> Dictionary:
	var race: Dictionary = card.race
	var cf := HSTrack.for_race(race)
	var tr = cf.track
	var G = HSWorld.G
	var pts := PackedFloat32Array()
	var s := 0.0
	while s <= tr.L + 1e-6:
		var a: Dictionary = tr.at(s)
		pts.append_array([a.x, a.y, a.curv, a.corner, tr.h_at(s)])
		s += 1.0
	var courses: Dictionary = HSData.d().get("courses", {})
	var dir := String(HSU.or_(courses.get(race.course, {}).get("dir"), "左"))
	var weather := HSSeason.weather(G.seed, race.year, race.month, race.week, race.course, String(HSU.or_(race.get("ground"), "良")))
	var horses: Array = []
	var me := 0
	var runners: Array = card.runners.duplicate()
	var fc: Array = HSData.d().get("frameColors", ["#ffffff", "#111111", "#d8302a", "#2a5fc8", "#f0cf2a", "#2e9a4a", "#f08a24", "#f07aa8"])
	var ft: Array = HSData.d().get("frameText", ["#222", "#fff", "#fff", "#fff", "#222", "#fff", "#fff", "#222"])
	for i in runners.size():
		var x: Dictionary = runners[i]
		var h: Dictionary = x.horse
		var age: float = G.year - float(h.born)
		var info := UiArt.horse_info(String(h.name), String(HSU.or_(h.get("coat"), "鹿毛")), age, int(x.num), int(x.frame))
		var mine: bool = x.get("rider") == "P"
		if mine:
			me = i
		var sk = HSOwners.silks_of(h)
		if h.get("owner") == "P":
			sk = G.player.silks
		if sk:
			info.silks = sk
		info.merge({"sex": String(h.sex), "age": int(age), "style": String(HSU.or_(h.get("style"), "先行")), "weight": float(x.weight), "mine": mine,
			"jockey": String(x.jockey.name) if x.get("jockey") else "", "odds": float(HSU.or_(x.get("odds"), 0.0)), "pop": int(HSU.or_(x.get("pop"), 0)),
			"capText": ft[(int(x.frame) - 1) % 8], "hist": HSU.truthy(h.get("hist")), "legend": HSU.truthy(x.get("legend")), "id": String(h.id)}, true)
		horses.append(info)
	var grade := HSRaces.grade_badge(race)
	var rec = HSWorld.course_record(race)
	return {
		"race": {"name": HSRaces.label(race), "short": HSRaces.label(race), "grade": grade, "course": race.course, "surface": race.surface, "dist": float(race.dist),
			"ground": String(HSU.or_(race.get("ground"), "良")), "num": 11 if race.get("graded") else 9, "weather": weather, "dir": dir, "key": race.key,
			"cls": String(HSU.or_(race.get("cls"), "")), "prize": float(HSU.or_(race.get("prize"), 0.0))},
		"track": {"lap": tr.L, "a": tr.a, "r": tr.r, "straight": tr.straight, "sign": tr.sign_, "dir": dir, "slope": String(HSU.or_(cf.geo.get("slope"), "平")),
			"D": float(race.dist), "line": bool(tr.line), "step": 1.0, "pts": pts, "layout": cf.layout.get("id", "") if cf.layout else null},
		"dt": 0.1, "me": me, "horses": horses, "card": card, "record": rec.t if rec else null,
	}

# 条件戦の札の名前（重賞は格の札）
static func class_label(race: Dictionary) -> String:
	if race.get("graded"):
		return HSRaces.grade_badge(race)
	match String(HSU.or_(race.get("cls"), "")):
		"newcomer": return "新馬"
		"maiden": return "未勝利"
		"OP": return "OP"
	return "条件"
