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
}

static var rides: Array = []        # 今週自分が乗るレース [{card, runner}]
static var ride_i := 0              # いま何鞍目か
static var played := {}             # { raceKey: HSSim.finish の結果 }（自分で乗ったレース）
static var ridden := {}             # { raceKey: "ride"｜"auto" }
static var report = null            # 最後に締めた週（HSWorld.finish_week の戻り値）
static var money0 := 0.0            # 週の初めの資金（週の結果で増減を出す）
static var in_week := false         # 騎乗の列を回している間
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
	return {"name": String(g.jockey.name), "label": "%s年目 %s月%s週" % [HSU.num(y), HSU.num(g.month), HSU.num(g.week)], "money": float(g.player.money)}

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
	HSWorld.new_game({"mode": "jockey", "seed": seed, "jockeyName": "新人騎手", "region": "美浦"})
	_reset_week()
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

# 撮影の見本：今週の騎乗を決まった乗り方で全部乗り、週を締める（週の結果の画面を --demo で開く）
static func demo_week(weeks := 1) -> void:
	demo_ride(weeks)
	var nxt := "card" if in_week else close_week()
	while nxt == "card":
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
	return "%d年目 %s月%s週" % [year_n(), HSU.num(G.month), HSU.num(G.week)]

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
		else:
			ridden[key] = "auto"
		ride_i += 1
	return "card" if current() != null else close_week()

static func mark_news() -> void:
	var n: Array = HSWorld.G.news
	news_head = n[0] if n.size() else null

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
