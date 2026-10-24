# 騎手のゲームの週の流れ（画面どうしをつなぐ）：タイトル → ホーム → （番組表・馬の店）→ 出走表 → 騎乗 → 週の結果 → ホーム
# 遊びの決まりは godot/core（HSWorld・HSJockey・HSOwners・HSProgram）を呼ぶだけで、ここでは作り直さない。
# その週に自分が乗るレース（HSJockey.my_rides）を順に出走表 → 騎乗へ回し、結果（HSSim.finish）を played に集めて HSWorld.finish_week に渡す。
# セーブは user://save.json（HSWorld.serialize。JS 版のセーブと同じ形）。週を締めるたびに自動で書く
# 殿堂入りした馬の1走ごとの記録は、セーブの枠ごとの別ファイル user://hall/<枠>/<馬の id>.json（HSHall。枠はセーブのファイル名）
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
	"settings": "res://scenes/settings.tscn",
}

static var rides: Array = []        # 今週自分が乗るレース [{card, runner}]
static var ride_i := 0              # いま何鞍目か
static var played := {}             # { raceKey: HSSim.finish の結果 }（自分で乗ったレース）
static var ridden := {}             # { raceKey: "ride" }（自分で乗ったレース。おまかせ騎乗は無い。持ち主の決定 2026-10-20）
static var report = null            # 最後に締めた週（HSWorld.finish_week の戻り値）
static var money0 := 0.0            # 週の初めの資金（週の結果で増減を出す）
static var in_week := false         # 騎乗の列を回している間
static var settings_back := "title"  # 設定の画面からもどる画面（タイトルかホーム）
static var program_back := "home"   # 番組表からもどる画面（厩舎・お手馬の画面から開くとそこへ）
static var farm_back := "home"      # 牧場（breed）からもどる画面（厩舎の牧場のタブから開くと厩舎）
static var replay_back := "data"    # リプレイを見終えてもどる画面（お手馬の戦績から開くと horse）
static var focus := {}              # 画面ごとのカーソルの記憶 { 画面: 札の名前 }
static var program_id := ""         # 番組表で見ている馬
static var hall_id := ""            # 殿堂から開いたお手馬（馬の画面を殿堂の写しで開く。空ならいまの馬）
static var desc = null              # いま走るレースの見た目の一式（desc_of）
static var news_head = null         # 週の初めのいちばん新しいニュース（週の結果で、増えた分だけ出す）

static func active() -> bool:
	return HSWorld.G != null and HSJockey.is_mode()

# ---------- セーブ ----------
static func has_save() -> bool:
	return FileAccess.file_exists(save_path)

# セーブの枠（いまはセーブのファイル名。user://save.json なら save）と、その枠の殿堂の記録の置き場所
static func slot() -> String:
	return save_path.get_file().get_basename()
static func hall_dir() -> String:
	return "user://hall".path_join(slot())

# セーブを消す：本体と、その枠の殿堂の記録
static func delete_save() -> void:
	if FileAccess.file_exists(save_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(save_path))
	HSHall.set_dir(hall_dir())
	HSHall.clear()

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
	HSHall.set_dir(hall_dir())
	HSWorld.load_save(s)
	_reset_week()
	HSAchieve.sync_from_world()   # セーブにあるトロフィーの実績を呼び直す（docs/STEAM.md）
	return active()

static func save_info() -> Dictionary:
	# タイトルの「つづきから」に出す要点（読まずに、セーブの頭だけ見る）
	if not has_save():
		return {}
	var g = HSJson.parse(FileAccess.get_file_as_string(save_path))
	if not (g is Dictionary) or not g.get("jockey"):
		return {}
	var y := float(g.year) - float(HSU.or_(g.get("startYear"), g.year)) + 1.0
	return {"name": String(g.jockey.name), "label": HSText.t("%s年目 %s") % [HSU.num(y), HSText.week_label(g.month, g.week)], "money": float(g.player.money)}

static func new_game(name: String, region: String, seed := -1.0) -> void:
	if seed < 0.0:
		seed = float(int(Time.get_unix_time_from_system()) % 1000000000)
	no_save = false
	HSHall.set_dir(hall_dir())
	HSHall.clear()   # はじめから：その枠の前の殿堂の記録を片づける
	HSWorld.new_game({"mode": "jockey", "seed": seed, "jockeyName": name, "region": region})
	_reset_week()
	save()

static func _reset_week() -> void:
	UiWeek.reset()
	rides = []
	ride_i = 0
	played = {}
	ridden = {}
	in_week = false
	report = null

# 撮影とテストの見本：決まった種の新しいゲームで、店のいちばん安い馬を買えるだけ（3頭まで）買い、
# weeks 週を進める（オーナーの依頼の馬には自分が乗る。見本を作る道具なので、途中の週の騎乗は騎手の腕で自動に走らせる）。セーブは書かない
static func demo(weeks := 0, seed := 7.0) -> void:
	no_save = true
	replay_dir = "user://demo_replays"   # 見本のリプレイは遊ぶときのものと混ぜない
	HSHall.set_dir("")   # 見本の殿堂の記録は手元だけ（セーブの枠のファイルに触らない）
	HSWorld.new_game({"mode": "jockey", "seed": seed, "jockeyName": HSText.t("新人騎手"), "region": "美浦"})
	_reset_week()
	# 見本は、はじめから全員と縁がある形にする（依頼の札・出走表・騎乗の場面を撮れるように。ふだんの遊びでは出会いの点がたまると縁ができる）。
	# 最初の依頼は今週に届いたことにする（ふだんはミッションのレースの4週前に届く）
	HSOwners.state().flags.overseas = { y = HSWorld.G.year }
	for o in HSOwners.LIST():
		HSOwners.meet(String(o.id), { horse = "", race = "" })
		var j = HSOwners.of(String(o.id)).get("job")
		if j: j.at = minf(j.at, HSWorld.w_idx())
	HSOwners.tick()
	HSOwners.state().queue = []
	buy_cheapest(3)
	for i in weeks + 1:
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
	HSHall.set_dir("")
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

# 撮影の見本（--setup=fatigue）：疲労の段階が並ぶように、自分の馬と今週走る馬に疲労を置く（決まった値）。1頭目は先週フランスで走ったことにする
static func demo_fatigue() -> void:
	var vals := [62.0, 24.0, 81.0, 40.0, 8.0, 57.0, 18.0, 0.0, 77.0, 33.0]
	var k := 0
	for h in HSWorld.mine():
		h.fatigue = vals[k % vals.size()]; k += 1
	for c in HSWorld.cards():
		for x in c.runners:
			if x.horse.get("filler") or x.horse.get("owner") == "P": continue
			x.horse.fatigue = vals[k % vals.size()]; k += 1
	var mine := HSWorld.mine("stable")
	if mine.size():
		mine[0].at = "仏"; mine[0].lastRaceW = HSWorld.w_idx() - 1.0  # i18n:skip

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
	return HSText.t("%d年目 %s") % [year_n(), HSText.week_label(G.month, G.week)]

# 記録（リプレイの一覧）に残す日付：言語によらず日本語の形（「2年目 5月4週」）。画面には HSText.tx で出す
static func date_key() -> String:
	var G = HSWorld.G
	return "%d年目 %s" % [year_n(), HSWorld.week_label(G.month, G.week)]  # i18n:skip（記録の鍵）

static func money_label(v = null) -> String:
	return HSText.money(float(HSWorld.G.player.money if v == null else v))

# ---------- 週の流れ ----------
# 「レースへ」：今週の騎乗の列を作る。乗るレースが無ければ、週の結果の画面へ移らずホームのまま週を進める（UiWeek。持ち主の指摘 2026-10-24）
# async：週の締めを別の thread で回す（ホームの次週。UiWeek.start）。テスト・道具は同じ thread で最後まで（UiWeek.run）
static func begin_week(async := false) -> String:
	rides = HSJockey.my_rides()
	ride_i = 0
	played = {}
	ridden = {}
	money0 = float(HSWorld.G.player.money)
	mark_news()
	in_week = true
	if rides.size() > 0:
		return "card"
	if async: UiWeek.start()
	else: UiWeek.run()
	return "home"

static func current() -> Variant:
	return rides[ride_i] if in_week and ride_i < rides.size() else null

# 騎乗を終えた（res＝HSSim.finish の結果）。おまかせ騎乗は無いので、結果の無いまま次へは進まない
static func ride_done(res: Dictionary) -> String:
	var r = current()
	if r != null:
		var key: String = r.card.race.key
		played[key] = res
		ridden[key] = "ride"
		if desc is Dictionary and String(desc.race.get("key", "")) == key:
			save_replay(desc, res)
		ride_i += 1
	return "card" if current() != null else close_week()

# まだ乗っていない自分の騎乗（今週の出走表で自分が乗るのに、結果の無いもの）の番号。無ければ -1。
# 週の途中で出走を変えても見落とさないよう、締める前に今の出走表から数え直す
static func next_unridden() -> int:
	rides = HSJockey.my_rides()
	for i in rides.size():
		if not played.has(String(rides[i].card.race.key)):
			return i
	return -1

static var trophies0: Array = []     # 週の初めに手にしていたトロフィー（週の結果の見せ場で、増えた分を出す）
static var unlocked0: Array = []     # 週の初めに破っていたスペシャルホース

static func mark_news() -> void:
	var G = HSWorld.G
	var n: Array = G.news
	news_head = n[0] if n.size() else null
	trophies0 = HSTrophy.sig()   # 手にした馬ごと（2頭目からの馬も）
	unlocked0 = HSU.or_(G.get("unlocked"), []).duplicate()

# この週に手にしたトロフィー（[{id, label, horse, bonus}]）と、破ったスペシャルホースの名前
static func week_trophies() -> Array:
	var out: Array = []
	for k in HSTrophy.sig():
		if trophies0.has(k): continue
		var parts: PackedStringArray = String(k).split("|")
		var id := parts[0]
		for x in HSTrophy.holders(id):
			if String(x.hid if x.hid else x.horse) == parts[1]:
				out.append({"id": id, "label": HSTrophy.by()[id].label if HSTrophy.by().has(id) else id, "horse": x.horse, "bonus": float(x.bonus)})
				break
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

# 週の結果を見終えた：オーナーのひと言と場面を見たことにする（JS の ownersAfterWeek と同じく空にする）
static func after_result() -> void:
	if HSOwners.on():
		var s := HSOwners.state()
		s.react = []
		s.queue = []
	save()

# 週を締める → 週の結果。自分の騎乗が残っていれば締めずに、その出走表へ（おまかせ騎乗は無い。持ち主の決定 2026-10-20「おまかせ騎乗　なしにして」）
static func close_week() -> String:
	if not in_week:
		money0 = float(HSWorld.G.player.money)
		mark_news()
	var left := next_unridden()
	if left >= 0:
		ride_i = left
		in_week = true
		return "card"
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
	var rep := {"about": "ターフの系譜：リプレイ", "race": d.race, "track": d.track, "horses": horses, "me": d.me, "dt": REPLAY_DT,  # i18n:skip
		"frames": frames, "results": results, "winnerTime": float(res.winnerTime), "events": events, "whips": res.get("whips", []), "record": d.get("record")}
	DirAccess.make_dir_recursive_absolute(replay_dir)
	var f := FileAccess.open(replay_dir.path_join(id + ".json"), FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify(rep))
	f.close()
	var list := replay_list()
	list.push_front({"id": id, "date": date_key(), "race": String(d.race.name), "grade": String(d.race.grade), "course": "%s %s%dm" % [d.race.course, d.race.surface, int(d.race.dist)],
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
			"capText": ft[(int(x.frame) - 1) % 8], "hist": HSU.truthy(h.get("hist")), "legend": HSU.truthy(x.get("legend")), "id": String(h.id),
			"heavy": float(HSU.or_(h.apt.get("heavy") if h.get("apt") is Dictionary else null, 50.0))}, true)   # 道悪の適性（出走表の道悪の印。HSSim.mud_label）
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

# 格の札の名前（重賞は格・オープンは OP、リステッドは L。レースは OP 以上だけ）
static func class_label(race: Dictionary) -> String:
	return HSRaces.grade_badge(race)
