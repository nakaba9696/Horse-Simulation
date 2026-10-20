# 画面の流れを自動で遊ぶ（画面なしで動く）：新しいゲームから、週ごとにホーム → 出走表 → 決まった乗り方で乗る（UiFlow.bot_ride） → 週の結果 → 次の週、を本物の画面で進める
#   godot --headless --path godot -s res://tools/autoplay.gd -- [--weeks=52] [--seed=1]
# 初めに馬の店でいちばん安い馬を3頭買い、オーナーの依頼の馬には自分が乗る。12月の GF の招待は GF の画面で最初の馬を出す。
# 見せ場・ご褒美の場面（小窓）は、遊ぶ人と同じくカーソルのあるボタンを押して閉じる。
# 1つの画面に 20 秒（実時間）いても先へ進まなければ「止まった」とする。実行時の誤り（SCRIPT ERROR）の数も数える
extends SceneTree

const STUCK_SEC := 20.0

var weeks := 52
var seed := 1.0
var week0 := 0.0
var done_weeks := 0
var scene_name := ""
var scene_since := 0.0
var acted := {}
var log_lines: Array = []
var t0 := 0
var shots_dir := ""
var counts := {}
const TOUR := ["stable", "program", "data", "owners", "shop", "breed", "gf"]
var tour_i := 0
var tour_week := -1.0
var horse_week := -1.0     # お手馬の詳しい画面を開いた週（厩舎から1度だけ開く）

func _initialize() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--weeks="): weeks = int(a.substr(8))
		elif a.begins_with("--seed="): seed = float(a.substr(7))
	UiFlow.save_path = "user://autoplay_save.json"
	UiFlow.replay_dir = "user://autoplay_replays"
	UiFlow.new_game("自動騎手", "美浦", seed)
	week0 = HSWorld.w_idx()
	t0 = Time.get_ticks_msec()
	process_frame.connect(_tick)
	change_scene_to_file(UiFlow.SCENES.shop)

func _name() -> String:
	var cs := current_scene
	if cs == null: return ""
	var sc = cs.get_script()
	return String(sc.resource_path.get_file().get_basename()) if sc else String(cs.name)

func _say(s: String) -> void:
	log_lines.append(s)
	print(s)

func _tick() -> void:
	var now := (Time.get_ticks_msec() - t0) / 1000.0
	var n := _name()
	if n != scene_name:
		scene_name = n
		scene_since = now
		acted = {}
		counts[n] = int(counts.get(n, 0)) + 1
	if n == "": return
	if now - scene_since > STUCK_SEC:
		_say("NG 止まった：%s（%s）" % [n, UiFlow.date_label()])
		_finish(false)
		return
	var cs := current_scene
	# 開いている小窓は、カーソルのあるボタンを押して閉じる
	if "_modal" in cs and cs._modal != null:
		if now - scene_since > 0.4 and not acted.has("modal%d" % cs._modal.get_instance_id()):
			acted["modal%d" % cs._modal.get_instance_id()] = true
			var f := cs.get_viewport().gui_get_focus_owner()
			if f is Button:
				(f as Button).pressed.emit()
			else:
				cs.close_modal()
		return
	if now - scene_since < 0.3: return   # 入りの動きを待つ
	match n:
		"shop":
			if acted.has("buy"): return
			acted.buy = true
			cs.on_tab(1)
			cs.on_tab(1)
			# いちばん安い馬を3頭まで（行を押して詳しい小窓 →「買う」→ 確かめの「買う」と同じ）
			for k in 3:
				var best := -1
				for i in cs.shown.size():
					if float(cs.shown[i].it.price) <= float(HSWorld.G.player.money) and (best < 0 or cs.shown[i].it.price < cs.shown[best].it.price): best = i
				if best < 0 or not HSSeason.can_buy(): break
				cs.open_detail(best)
				cs.detail_buy.pressed.emit()
				cs.confirm_ok.pressed.emit()
			cs.on_back()
		"home":
			if acted.has("go"): return
			if HSWorld.w_idx() - week0 >= weeks:
				_finish(true)
				return
			acted.go = true
			# 4週ごとに、ほかの画面を1つ開いて戻る（画面を組むときの誤りを探す）
			var wk := HSWorld.w_idx()
			if int(wk - week0) % 4 == 2 and tour_week != wk:
				tour_week = wk
				var dest: String = TOUR[tour_i % TOUR.size()]
				tour_i += 1
				if dest == "program" and HSWorld.mine().is_empty(): dest = "data"
				cs.go(dest)
				return
			if HSSeason.dc_pending_list().size():
				cs.go("gf")
				return
			if cs.b_main.disabled:
				_say("NG ホームの主な操作が押せない（%s）" % UiFlow.date_label())
				_finish(false)
				return
			cs.b_main.pressed.emit()
		"gf":
			if acted.has("gf"): return
			acted.gf = true
			if cs.acts.size(): cs.acts[0].pressed.emit()
			cs.on_back()
		"stable":
			if acted.has("back"): return
			acted.back = true
			# 週に1度、お手馬の詳しい画面を開く（タブをめくり、戦績の1走の記録を開いて閉じる）
			if horse_week != HSWorld.w_idx() and cs.horses.size():
				horse_week = HSWorld.w_idx()
				cs._main(0)
				return
			cs.on_back()
		"horse":
			if acted.has("back"): return
			acted.back = true
			for k in cs.TABS.size():
				cs.on_tab(1)
				if cs.TABS[cs.tab][0] == "rec" and cs.results.size():
					cs.race_detail(cs.results[0])
					cs.close_modal()
			cs.on_back()
		"program", "owners", "breed":
			if acted.has("back"): return
			acted.back = true
			if n == "data": pass
			cs.on_back()
		"data":
			if acted.has("back"): return
			acted.back = true
			for k in cs.TABS.size():   # タブを全部めくる
				cs.on_tab(1)
			cs.on_back()
		"race_card":
			if acted.get("ride") == cs.get_instance_id(): return   # 2鞍目の出走表は同じ名前の別の画面
			acted.ride = cs.get_instance_id()
			# おまかせ騎乗は無い（持ち主の決定 2026-10-20）：自分の騎乗は決まった乗り方（UiFlow.bot_ride）で乗る。騎乗の 3D の画面は開かない
			var cur = UiFlow.current()
			if cur == null or cs.btn_gate == null:
				_say("NG 出走表に今週の騎乗・ゲートインが無い（%s）" % UiFlow.date_label())
				_finish(false)
				return
			var sim = HSWorld.start_sim(cur.card, {"ride": true})
			UiFlow.go(self, UiFlow.ride_done(UiFlow.bot_ride(sim)))
		"week_result":
			if acted.has("next"): return
			if now - scene_since < 0.8: return   # 見せ場が開くのを待つ
			acted.next = true
			done_weeks += 1
			var rep = UiFlow.report
			var rides := 0
			for r in rep.races:
				if r.get("ride"): rides += 1
			if done_weeks % 4 == 0 or rides > 0:
				_say("%s　騎乗 %d鞍　資金 %s　お手馬 %d" % [rep.date, rides, UiFlow.money_label(), HSWorld.mine().size()])
			cs.b_next.pressed.emit()
		_:
			_say("NG 知らない画面に来た：%s" % n)
			_finish(false)

func _finish(ok: bool) -> void:
	process_frame.disconnect(_tick)
	var sec := (Time.get_ticks_msec() - t0) / 1000.0
	_say("autoplay: %s %d週（%.0f秒）・画面の数 %s" % ["ok" if ok else "NG", done_weeks, sec, JSON.stringify(counts)])
	UiFlow.delete_save()   # セーブと、その枠の殿堂の記録
	quit(0 if ok else 1)
