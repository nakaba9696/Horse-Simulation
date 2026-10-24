# 騎乗の無い週を、ホームのまま進める（持ち主の指摘 2026-10-24「頻繁に連打することになる次週ボタンは画面遷移や演出なしでいい
# ただ、次週ボタンを押した結果はわかりやすくする必要があるので週が変わったことはわかりやすく表示して」。docs/UI.md 1「形と動き」）
# - 週の結果の画面へ移らない。週の結果の画面に出ていた中身（資金の増減・ニュース・オーナーの場面・トロフィー）と、お手馬の成長・疲れの抜けを
#   「知らせ」（notes）にまとめ、ホームの知らせの欄に出す。オーナーの場面・見せ場は知らせの行を押すと開く（勝手に小窓を出さない）
# - 週の締め（HSWorld.finish_week）と次の週の出走表づくりは C++ の模擬でも 0.3〜1.3 秒かかるので、画面からは別の thread で回す（start・poll）。
#   回している間、画面は世界（HSWorld）に触らない。次週をもう一度押したら数えておき（queued）、終わったら続けて進める
# - テストと道具は run（同じ thread で最後まで）を呼ぶ
class_name UiWeek
extends RefCounted

const KEEP := 8          # 知らせの欄に残す数（新しい順。連打で何週か進めても、前の週の大事な知らせが残る）
const KICK := {"meet": "新しいオーナーから声がかかった", "job": "騎乗依頼が届いた", "m1": "「OP」の依頼をやり終えた", "m2": "「G3」の依頼をやり終えた", "m3": "「G2」の依頼をやり終えた", "m4": "「G1」の依頼をやり終えた", "m5": "すべての依頼をやり終えた", "award": "名コンビ賞", "wreath": "GF 全制覇の花輪"}

# 知らせ [{text, kind, date, w（週の通し番号）, scene（押すと開くオーナーの場面）, moment（押すと開く見せ場 [見出し, 題, 注記]）}]。新しい順
static var notes: Array = []
static var last: Array = []        # いちばん新しく進めた週の知らせ（ホームが光らせる）
static var flipped := false        # 週をめくったばかり（ホームが暦の札を開く）
static var date0 := {}             # めくる前の暦 {y, m, w}
static var queued := 0             # 回している間に押された次週の数
static var _th: Thread = null
static var _res: Array = []

static func reset() -> void:
	notes = []
	last = []
	flipped = false
	queued = 0

# ---------- 週を進める（同じ thread） ----------
static func run() -> Array:
	var b := _before()
	UiFlow.close_week()
	var out := _collect(b)
	UiFlow.after_result()   # オーナーのひと言と場面を見たことにする・セーブ
	return out

static func _before() -> Dictionary:
	var G = HSWorld.G
	var horses := {}
	for h in HSWorld.mine("stable") + HSWorld.mine("farm"):
		var fh := HSSeason.fh_show_both(h, HSWorld.w_idx())
		horses[String(h.id)] = {"turf": int(fh.turf), "dirt": int(fh.dirt), "fat": HSFatigue.stage(h), "loc": String(h.loc)}
	date0 = {"y": UiFlow.year_n(), "m": int(G.month), "w": int(G.week)}
	return {"money": float(G.player.money), "horses": horses}

static func _collect(b: Dictionary) -> Array:
	var G = HSWorld.G
	var rep = UiFlow.report
	var date := HSText.week_label(rep.m, rep.w) if rep else ""
	var wi := HSWorld.w_idx()
	var out: Array = []
	# 資金の増減（理由は週の出来事から：今月の経費など）
	var d := float(G.player.money) - float(b.money)
	if d != 0.0:
		var why := ""
		if rep:
			for e in rep.get("events", []):
				if String(e).begins_with("今月の経費"): why = "今月の経費"  # i18n:skip（出来事の文の頭）
		out.append({"text": HSText.t("資金 %s%s%s") % ["+" if d > 0 else "－", HSText.money(absf(d)), HSText.t("（%s）") % HSText.t(why) if why != "" else ""], "kind": "good" if d > 0 else "money"})
	# オーナーの場面（届いた依頼・出会い・ご褒美）：押すと場面を開く
	if HSOwners.on():
		for q in HSOwners.state().queue:
			var o = HSGFHost.data() if q.get("kind") == "wreath" else HSOwners.by(String(q.oid))
			var who := HSText.owner_line(String(o.name)) if o else ""
			var tail := ""
			if q.get("kind") == "job": tail = HSText.t("：%s（%s）") % [HSText.race_name(String(q.race)), HSText.tx(String(q.get("date", "")))]
			out.append({"text": HSText.t("%s：%s%s") % [who, HSText.t(String(KICK.get(q.kind, ""))), tail], "kind": "owner", "scene": q})
	# 見せ場（トロフィー・スペシャルホース。騎乗の無い週にはふつう起きないが、落とさない）
	for t in UiFlow.week_trophies():
		out.append({"text": HSText.t("トロフィー「%s」を手にした（%s）") % [HSText.tx(String(t.label)), HSText.horse_name(String(t.horse))], "kind": "g1",
			"moment": ["トロフィーを手にした", HSText.tx(String(t.label)), HSText.horse_name(String(t.horse))]})
	# お手馬の成長（総合力が上がった）・疲れの抜け
	var grow := PackedStringArray()
	for h in HSWorld.mine("stable") + HSWorld.mine("farm"):
		var p = b.horses.get(String(h.id))
		if p == null: continue
		var fh := HSSeason.fh_show_both(h, wi)
		var parts := PackedStringArray()
		if int(fh.turf) != int(p.turf): parts.append(HSText.t("芝 %d→%d") % [int(p.turf), int(fh.turf)])
		if int(fh.dirt) != int(p.dirt): parts.append(HSText.t("ダ %d→%d") % [int(p.dirt), int(fh.dirt)])
		if parts.size(): grow.append("%s %s" % [HSText.horse_name(h), " ".join(parts)])
		var st := HSFatigue.stage(h)
		if h.loc == "stable" and st < int(p.fat) and st == 0:
			out.append({"text": HSText.t("%sの疲れが抜けた（%s）") % [HSText.horse_name(h), HSText.t(String(HSFatigue.view(h).label))], "kind": "info"})
	if grow.size():
		out.append({"text": HSText.t("成長：%s") % HSText.t("・").join(grow), "kind": "good"})
	# 週のニュース（G1 の勝ち馬・入厩・デビュー・資金の知らせなど）
	for nw in UiFlow.week_news():
		out.append({"text": HSText.tx(String(nw.text)), "kind": String(nw.get("kind", ""))})
	for x in out:
		x.date = date
		x.w = wi
	last = out
	notes = (out + notes).slice(0, KEEP)
	flipped = true
	return out

# ---------- 別の thread で回す（画面から） ----------
static func busy() -> bool:
	return _th != null

static func start() -> void:
	if _th != null: return
	_res = []
	_th = Thread.new()
	_th.start(func():
		_res = run()
		HSJockey.my_rides())   # 次の週の出走表も作っておく（ホームを組み直すときに待たせない）

# 終わっていれば thread を片づけて true（その週の知らせは last）
static func poll() -> bool:
	if _th == null or _th.is_alive(): return false
	_th.wait_to_finish()
	_th = null
	return true

# 締め終わるまで待つ（画面を移る・世界を変える操作の前に。回している thread と世界を同時に触らない）。続けて押された次週は捨てる
static func wait() -> void:
	queued = 0
	if _th == null: return
	_th.wait_to_finish()
	_th = null

# 次の週に騎乗がある・オーナーの場面が届いた・GF の招待・シーズンの終わり：続けて押された次週はここで止める（読ませる）
static func stop_here() -> bool:
	if HSWorld.G.get("gameOver") or HSJockey.my_rides().size() > 0 or HSSeason.dc_pending_list().size() > 0:
		return true
	return last.any(func(x): return x.get("scene") != null or x.get("moment") != null)
