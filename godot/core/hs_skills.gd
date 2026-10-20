# 発動する特殊能力（js/core/skills.js の HS.Skills と同じ）。レース中の決まった場面で効き目が出る。
# どれを持つかは能力値から自動で決まる（持てる数は総合の力で1〜4。系統を1つずつ回して選ぶ）
class_name HSSkills

const LEN := 2.4
const SASHI := ["差し", "追込"]

# at：調べる区間（start＝スタートから4秒、mid＝直線の前、st＝直線、any＝いつも）。fx：効き目。learn：身につく条件。when：発動の条件
static var LIST: Array = [
	# 爆発
	{ id = "saikoubi", at = "any", label = "豪脚", group = "爆発", ikki = true, note = "残り500mから、最後方近くでムチを入れると大きく伸びる（直線の長さに関係なく、残りの距離で決まる）", fx = { spd = 0.07, sec = 4.0, free = true, top = 0.3 },
		learn = func(p): return p.style == "追込" and p.kire >= 6,
		when = func(x): return x.R <= 500 and x.R > 100 and x.rank >= x.n - 2 and (x.whipping if x.c else x.s.spurting) }, # AI は直線の外でも追い出していれば
	{ id = "chokusen", at = "st", label = "直線一気", group = "爆発", ikki = true, note = "直線で中団より後ろからムチを入れると伸びる", fx = { spd = 0.05, sec = 4.0, free = true, top = 0.2 },
		learn = func(p): return SASHI.has(p.style) and p.kire >= 6,
		when = func(x): return x.inStraight and x.R > 100 and x.rank > x.n / 2.0 and x.whipping },
	{ id = "oosoto", at = "st", label = "大外一気", group = "爆発", ikki = true, note = "直線で外に持ち出してムチを入れると伸びる", fx = { spd = 0.045, sec = 4.0, free = true, top = 0.2 },
		learn = func(p): return SASHI.has(p.style) and p.slope >= 82,
		when = func(x): return x.inStraight and x.R > 100 and x.s.lane >= 5 and x.whipping },
	# 損
	{ id = "sasari", at = "any", label = "ささり癖", group = "損", bad = true, note = "脚が無いときにムチを入れると、ささって伸びを欠く（進路は変わらない）", fx = { spd = -0.035, sec = 1.5 },
		learn = func(p): return p.mind < 64 and p.guts < 76,
		when = func(x):
			if x.c: return x.c.lastWhip != null and x.t - x.c.lastWhip.t < 0.15 and x.s.E < 0.12
			return x.whipping and x.s.E < 0.15 },
	{ id = "kongomi", at = "any", label = "馬込み×", group = "損", bad = true, note = "馬群に包まれたままだと、やる気をなくす", fx = { E = -0.03 },
		learn = func(p): return p.mind < 70 and (p.style == "逃げ" or p.style == "追込"),
		when = func(x): return x.sk.boxedFor >= 3 },
	{ id = "bante", at = "mid", label = "番手×", group = "損", bad = true, note = "逃げられず、2番手より後ろで道中を運ぶと、やる気をなくす", fx = { E = -0.03 },
		learn = func(p): return p.style == "逃げ" and p.mind < 72,
		when = func(x): return x.sk.banteFor >= 10 },
	{ id = "sessenB", at = "st", label = "叩き合い×", group = "損", bad = true, note = "ゴール前で並ばれると、ひるむ", fx = { spd = -0.015, sec = 1.5 },
		learn = func(p): return p.guts < 70,
		when = func(x): return x.R < 100 and x.close },
	# 速さ
	{ id = "isshun", at = "st", label = "切れ味", group = "速さ", note = "残り150mで2番手以下なら、ひと伸び", fx = { spd = 0.06, sec = 2.5, free = true },
		learn = func(p): return p.style != "逃げ" and p.kire >= 6 and p.spd >= 85,
		when = func(x): return x.R <= 150 and x.rank >= 2 and (x.whipping or x.s.spurting) },
	{ id = "hanno", at = "st", label = "抜群の反応", group = "速さ", note = "直線までムチを使わず、直線に入ってすぐムチを入れると一気に伸びる", fx = { spd = 0.045, sec = 3.0, free = true },
		learn = func(p): return p.kire >= 7 or (p.kire >= 6 and p.mind >= 82),
		when = func(x): return x.inStraight and x.straight - x.R < 100 and x.whipping and not x.sk.whipBefore },
	{ id = "startdash", at = "start", label = "ロケットスタート", group = "速さ", note = "うまく出ると、すっと前へ行く", fx = { spd = 0.06, sec = 3.0, pos = 2.0, free = true },
		learn = func(p): return p.mind >= 82 and (p.style == "逃げ" or p.style == "先行"),
		when = func(x): return x.t - x.s.delay < 0.6 and x.s.delay < 0.25 and not x.s.late },
	{ id = "nebari", at = "st", label = "二の脚", group = "速さ", note = "残り600mで先頭にいた馬が、残り300mからつかまりかけると、もうひと踏ん張り", fx = { spd = 0.05, sec = 3.5, free = true },
		learn = func(p): return (p.style == "逃げ" or p.style == "先行") and p.sta >= 85,
		when = func(x): return x.R <= 300 and x.sk.led600 and x.rank <= 3 and x.leader.x - x.s.x < LEN },
	{ id = "nidan", at = "st", label = "二段ロケット", group = "速さ", note = "先頭で直線に入り、2番手を1馬身以上離していれば、もうひと伸び", fx = { spd = 0.08, sec = 4.0, free = true },
		learn = func(p): return p.style == "逃げ" and p.spd >= 80,
		when = func(x): return x.inStraight and x.straight - x.R < 30 and x.rank == 1 and x.second != null and x.s.x - x.second.x >= LEN },
	{ id = "sabaki", at = "st", label = "馬群さばき", group = "速さ", note = "直線で前が壁になっても、すぐ進路を見つけて伸びる。横の馬に止められにくい", fx = { spd = 0.03, sec = 2.5, free = true },
		learn = func(p): return p.style == "追込" and p.spd < 85 and p.mind >= 70,
		when = func(x): return x.inStraight and x.R > 100 and x.sk.wallFor >= 0.6 and not x.wall },
	# 気性
	{ id = "genwaku", at = "any", label = "幻惑逃げ", group = "気性", note = "ペースのチェックポイントを先頭で通り、スローなら、後ろの差し・追込の馬が脚を使わされる", fx = { foeE = -0.05, foe = SASHI },
		learn = func(p): return p.style == "逃げ" and p.mind >= 84,
		when = func(x): return x.sim.check != null and x.sim.check.lead == x.s.i and x.sim.check.verdict == "スローペース" },
	{ id = "ikiire", at = "mid", label = "息入れ○", group = "気性", note = "3〜4コーナーを先頭で回ると、ひと息入って脚が戻る", fx = { E = 0.05 },
		learn = func(p): return p.style == "逃げ" and p.sta >= 84 and p.mind < 84,
		when = func(x): return not x.inStraight and x.R <= x.straight + 350 and x.rank == 1 },
	{ id = "tanki", at = "mid", label = "単騎逃げ", group = "気性", note = "後ろを2馬身以上離して逃げると、気分よく走る", fx = { E = 0.06 },
		learn = func(p): return p.style == "逃げ" and p.mind >= 65,
		when = func(x): return not x.inStraight and x.sk.soloFor >= 10 },
	{ id = "kouhou", at = "mid", label = "後方待機○", group = "気性", note = "中間点まで後ろから3頭以内で、掛からずに運ぶと、脚が戻る", fx = { E = 0.025 },
		learn = func(p): return p.style == "追込" and p.mind >= 76,
		when = func(x): return x.s.x >= x.D / 2.0 and x.sk.rankMid != null and x.sk.rankMid >= x.n - 2 and not x.sk.kakari and not (x.c and x.c.everKakari) },
	{ id = "yonkaku", at = "st", label = "四角先頭", group = "気性", note = "先頭で直線に入ると、脚が戻る", fx = { E = 0.05 },
		learn = func(p): return (p.style == "先行" or p.style == "差し") and p.spd >= 86 and p.kire <= 4,
		when = func(x): return x.inStraight and x.straight - x.R < 30 and x.rank == 1 },
	{ id = "oriai", at = "mid", label = "折り合い上手", group = "気性", note = "中間点まで一度も掛からなければ、脚が残る", fx = { E = 0.02 },
		learn = func(p): return p.mind >= 85,
		when = func(x): return x.D >= 1600 and x.s.x >= x.D / 2.0 and not x.sk.kakari and not (x.c and x.c.everKakari) },
	# 根性
	{ id = "nimai", at = "st", label = "差し返し", group = "根性", note = "先頭でゴール前、2番手に詰め寄られると、もう一度伸びる", fx = { E = 0.05, spd = 0.025, sec = 2.0, free = true },
		learn = func(p): return p.style == "逃げ" and p.guts >= 82,
		when = func(x): return x.R < 300 and x.rank == 1 and x.second != null and x.s.x - x.second.x < LEN },
	{ id = "demuchi", at = "start", label = "出ムチ○", group = "根性", note = "スタート直後にムチを入れると、前へ行ける", fx = { spd = 0.05, sec = 2.5, pos = 1.5, free = true },
		learn = func(p): return (p.style == "逃げ" or p.style == "先行") and p.guts >= 86,
		when = func(x): return x.t - x.s.delay < 3 and (x.c.whips > 0 if x.c else true) },
	{ id = "makuri", at = "st", label = "大まくり", group = "根性", note = "中間点で後ろ半分にいた馬が、6頭以上抜いて先頭から1馬身以内で直線に入ると、脚が戻ってひと伸び", fx = { E = 0.1, spd = 0.04, sec = 4.0, free = true },
		learn = func(p): return SASHI.has(p.style) and p.kire <= 4 and p.sta >= 78,
		when = func(x): return x.inStraight and x.straight - x.R < 30 and x.sk.rankMid != null and x.sk.rankMid > x.n / 2.0 and x.sk.rankMid - x.rank >= 6 and x.leader.x - x.s.x < LEN },
	# 追走○・外回し○は、条件が続いている間ずっと効く（hs_sim.gd。cont）。発動の印は初めて効いたときに出す
	{ id = "tsuiso", at = "any", label = "追走○", group = "根性", cont = true, note = "直線の前、すぐ前に馬がいる間は、脚の減りが少ない", fx = {},
		learn = func(p): return p.style == "追込" and p.guts >= 82,
		when = func(_x): return false },
	{ id = "sotomawashi", at = "any", label = "外回し○", group = "根性", cont = true, note = "コーナーで外を回っても、余分に脚を使わない", fx = {},
		learn = func(p): return p.style == "追込" and p.sta >= 76 and p.guts < 82,
		when = func(_x): return false },
	{ id = "dokonjo", at = "any", label = "ど根性", group = "根性", note = "追い出してから3秒叩き合うと、脚が戻る", fx = { E = 0.02 },
		learn = func(p): return p.guts >= 88,
		when = func(x): return x.sk.duelFor >= 3 },
	{ id = "sessen", at = "st", label = "叩き合い", group = "根性", note = "ゴール前で並ぶと、ひと伸び", fx = { spd = 0.03, sec = 2.5, free = true },
		learn = func(p): return p.guts >= 86,
		when = func(x): return x.R < 100 and x.close },
]
static var BY: Dictionary = _by()
static func _by() -> Dictionary:
	var o := {}
	for k in LIST: o[k.id] = k
	return o
const ORDER := ["爆発", "損", "速さ", "気性", "根性"]

# 名馬の固有の能力（godot/data/uniques.json。伝説級の名馬に1頭1つ）。場面の型（when の名前 → 条件）。持てる数（cap）には数えない
static var UWHEN := {
	leadStraight = func(x): return x.inStraight and x.straight - x.R < 30 and x.rank == 1,
	leadMid = func(x): return not x.inStraight and x.s.x >= x.D / 2.0 and x.rank == 1,
	duelEnd = func(x): return x.R < 300 and x.close,
	neck = func(x): return x.R < 100 and x.close,
	longStraight = func(x): return x.D >= 2400 and x.inStraight and x.straight - x.R < 30,
	heavyOrLate = func(x): return not x.inStraight and x.R <= x.straight + 400 and (x.s.late or float(HSU.or_(x.s.r.get("weight"), 0.0)) >= 57),
	front3 = func(x): return x.R <= 400 and x.rank <= 3,
	holdLead = func(x): return x.R < 300 and x.rank == 1 and x.second != null and x.s.x - x.second.x < LEN,
	posBreak = func(x): return x.inStraight and x.straight - x.R < 30 and x.rank >= 2 and x.rank <= 4,
	bigLead = func(x): return x.inStraight and x.rank == 1 and x.second != null and x.s.x - x.second.x >= 2 * LEN,
	nearLead = func(x): return x.R <= 400 and x.rank >= 2 and x.leader.x - x.s.x < LEN,
	start = func(x): return x.t - x.s.delay < 0.6 and not x.s.late,
	sprint = func(x): return x.D <= 1400 and x.inStraight and x.straight - x.R < 30 and x.rank <= 3,
	# 2026-10-17 に足した型（持ち主が選んだ名馬の分。差し・追込の名馬と、マイル・逃げ切り・叩き合いの勝ち方）
	mile = func(x): return x.D >= 1400 and x.D <= 2000 and x.inStraight and x.R <= 400 and x.R > 100 and x.rank >= 2 and x.rank <= 6,
	ledAll = func(x): return x.R <= 400 and x.rank == 1 and x.sk.led600,
	wideKick = func(x): return x.inStraight and x.R > 100 and x.rank > x.n / 2.0 and x.s.lane >= 3,
	chase = func(x): return x.inStraight and x.R <= 400 and x.R > 100 and x.rank >= 2 and x.leader.x - x.s.x < 3 * LEN,
	lateKick = func(x): return x.inStraight and x.R <= 400 and x.R > 100 and x.rank > x.n / 2.0,
	fromLast = func(x): return x.inStraight and x.R > 100 and x.rank >= x.n - 2,
	boxed = func(x): return x.inStraight and x.R > 100 and x.sk.wallFor >= 0.6 and not x.wall,
	top2 = func(x): return x.R <= 200 and x.rank >= 2 and x.rank <= 3,
	breakAway = func(x): return x.inStraight and x.R > 100 and x.R < 400 and x.close,
	backRecover = func(x): return not x.inStraight and x.R <= x.straight + 400 and x.rank > x.n / 2.0,
}
static var _uniqueOf = null # 馬名 → 固有の能力（データを読んでから作る）
static func _uniques() -> Dictionary:
	if _uniqueOf == null:
		_uniqueOf = {}
		for u in HSData.d().get("uniques", []):
			if not UWHEN.has(u.when): continue
			var d: Dictionary = u.duplicate(); d.unique = true; d.group = "固有"; d.whenId = u.when; d.when = UWHEN[u.when]
			BY[d.id] = d; _uniqueOf[d.horse] = d
	return _uniqueOf
static func is_unique(id: Variant) -> bool:
	_uniques()
	return BY.has(id) and HSU.truthy(BY[id].get("unique"))
# 固有の能力を持つ名馬か（godot/data/uniques.json に名前があるか）
static func has_unique(name: Variant) -> bool:
	return _uniques().has(name)
static func unique_of(h: Variant) -> Variant:
	if not h or HSU.truthy(h.get("original")): return null
	var u = _uniques().get(h.get("name"))
	return u.id if u else null

# 習得の材料（能力値）。芝・ダートは高いほう
static func stats(h: Dictionary, w_idx: Variant) -> Dictionary:
	var c: Dictionary = HSHorse.cur(h, w_idx) if w_idx != null else HSU.or_(h.get("pot"), {})
	var spd := HSU.mx(HSU.or_(c.get("spd"), 0.0), HSU.or_(c.get("dspd"), 0.0)); var sta := HSU.mx(HSU.or_(c.get("sta"), 0.0), HSU.or_(c.get("dsta"), 0.0))
	return { spd = spd, sta = sta, guts = HSU.or_(c.get("guts"), 0.0), mind = HSU.or_(c.get("mind"), 0.0), slope = HSU.or_(c.get("slope"), 0.0), kire = HSU.or_(h.get("kire"), 4.0), style = h.get("style") }
# 持てる数：総合の力で1〜4
static func cap(p: Dictionary) -> int:
	var a: float = (p.spd + p.sta + p.guts) / 3.0
	return 1 if a < 65 else (2 if a < 78 else (3 if a < 90 else 4))
# この馬の発動する特殊能力（id の並び）
static func of(h: Variant, w_idx: Variant) -> Array:
	if not h: return []
	_uniques()
	# オリジナルホースは親から受け継いだもの（無くした特殊能力は外す）。逸話で決めた名馬（データの trig）は、固有の能力を先頭に
	if h.get("trigFixed"):
		var t: Array = h.trigFixed.filter(func(id): return BY.has(id))
		var u0 = unique_of(h)
		if u0 != null and not t.has(u0): return [u0] + t
		return t
	var p := stats(h, w_idx)
	var ok: Array = []
	for g in ORDER:
		var l: Array = []
		for k in LIST:
			if k.group == g and k.learn.call(p): l.append(k)
		ok.append(l)
	var u = unique_of(h) # 伝説級の名馬は、固有の能力を先頭に（持てる数とは別）
	var c := cap(p); var out: Array = []
	var round_ := 0
	while out.size() < c:
		var any := false
		for g in ok:
			if round_ < g.size():
				any = true
				if out.size() < c: out.append(g[round_].id)
		if not any: break
		round_ += 1
	# 史実馬は、損な技（ささり癖・馬込み× など）を能力の数から自動で付けない。逸話のある馬だけ trig に手で書く（外部レビューの指摘・持ち主の決定 2026-10-20）
	if HSU.truthy(h.get("hist")): out = out.filter(func(id): return not HSU.truthy(BY[id].get("bad")))
	return [u] + out if u else out
static func label(id: String) -> String:
	_uniques()
	if BY.has(id): return BY[id].label
	if HSHorse.SKILLS.has(id): return HSHorse.SKILLS[id].label
	return id
static func is_bad(id: String) -> bool:
	_uniques()
	if BY.has(id): return HSU.truthy(BY[id].get("bad"))
	return HSU.truthy(HSHorse.SKILLS.get(id, {}).get("bad"))
static func note(id: String) -> String:
	_uniques()
	if BY.has(id): return BY[id].get("note", "")
	return HSHorse.SKILLS.get(id, {}).get("note", "")

# レースの初めに、各馬の発動の特殊能力を決める
static func setup(sim) -> void:
	for s in sim.st:
		s.trig = of(s.h, sim.wIdx)
		s.sk = { boxedFor = 0.0, soloFor = 0.0, duelFor = 0.0, banteFor = 0.0, wallFor = 0.0, led600 = false, rankMid = null, whipBefore = false, ikki = false, kakari = false }
# 続いている間ずっと効く能力と、横の動き・前が壁に効く能力の印（hs_sim.gd が見る）。HSSim.create が setup のあとに呼ぶ
static func flags(s) -> void:
	var t: Array = s.trig if s.trig else []
	s.tsuiso = t.has("tsuiso"); s.sotoM = t.has("sotomawashi"); s.sabaki = t.has("sabaki")

# 0.2 秒ごと。order＝まだ走っている馬の、前から順の並び
static func step(sim, order: Array, DT: float) -> void:
	var D: float = sim.D; var straight: float = sim.straight; var t: float = sim.t
	var n: int = sim.st.size()
	var leader = order[0] if order.size() > 0 else null
	var second = order[1] if order.size() > 1 else null
	var near: Array = []
	var x := {}
	for k in order.size():
		var s = order[k]
		if s.done or not s.trig or not s.trig.size() or t < s.delay: continue
		var R0: float = D - s.x
		var ph := "st" if R0 <= straight + 30 else ("start" if t - s.delay < 4 else "mid")
		var need: bool = k < 2 or (s.x >= D * 0.5 and s.sk.rankMid == null)
		var q := 0
		while q < s.trig.size() and not need:
			var id: String = s.trig[q]; var d: Dictionary = BY[id]; var a: String = d.at
			if not s.fired.has(id) and not d.get("cont") and (a == ph or a == "any"): need = true
			q += 1
		if not need: continue
		var me = sim.ctl if (s.me and sim.ctl) else null
		var R: float = D - s.x
		var inStraight: bool = R <= straight and R > 0
		var rank := k + 1
		var sk: Dictionary = s.sk
		var whipping: bool = (t < me.whipUntil) if me else (s.spurting and inStraight)
		if me and whipping and not inStraight: sk.whipBefore = true
		near.clear()
		q = k - 1
		while q >= 0 and order[q].x - s.x < 5:
			near.append(order[q]); q -= 1
		q = k + 1
		while q < order.size() and s.x - order[q].x < 3:
			near.append(order[q]); q += 1
		var left := false; var right := false; var front := false; var close := false; var faster := true; var wall := false
		for o in near:
			var dl: float = o.lane - s.lane; var dx: float = o.x - s.x
			if dx > 0 and absf(dl) < 0.9: front = true
			if dx > 0 and dx < 2.6 and absf(dl) < 0.85: wall = true # すぐ前が壁
			if dx >= 3: continue
			if dl < -0.4 and dl > -1.6: left = true
			if dl > 0.4 and dl < 1.6: right = true
			if absf(dx) < 1.2 and absf(dl) < 1.6: close = true
			if o.v >= s.v: faster = false
		sk.boxedFor = sk.boxedFor + DT if ((left or s.lane < 0.5) and right and front) else 0.0
		sk.soloFor = sk.soloFor + DT if (rank == 1 and second != null and s.x - second.x >= 2 * LEN) else 0.0
		sk.duelFor = sk.duelFor + DT if ((s.spurting or (me and me.gear > 0.3)) and close) else 0.0
		if rank == 1 and R <= 600 and R > 300: sk.led600 = true
		if not inStraight and rank >= 3 and s.x > D * 0.2: sk.banteFor += DT # 番手×：ハナに立てず3番手より後ろ（2番手以内に上がると数え直し）
		elif rank <= 2: sk.banteFor = 0.0
		if inStraight and wall: sk.wallFor += DT
		if sk.rankMid == null and s.x >= D * 0.5: sk.rankMid = rank
		if s.kakariDay and s.x < D * 0.5 and not me: sk.kakari = true
		x.sim = sim; x.s = s; x.c = me; x.t = t; x.D = D; x.R = R; x.straight = straight; x.inStraight = inStraight; x.rank = rank; x.n = n
		x.whipping = whipping; x.left = left; x.right = right; x.faster = faster; x.close = close; x.wall = wall; x.leader = leader; x.second = second; x.sk = sk
		for id in s.trig:
			if s.fired.has(id): continue
			var def: Dictionary = BY[id]
			if def.get("cont") or (def.at != ph and def.at != "any"): continue
			if def.get("ikki") and sk.ikki: continue
			if not def.when.call(x): continue
			if def.get("ikki"): sk.ikki = true
			HSSim.fire(sim, s, id)
			apply(sim, s, def)

# 一気系は、ためた脚（発動したときのスタミナ）で伸びが変わる
const IKKI := { a = 0.4, b = 2.0, lo = 0.6, hi = 1.6 }
static func apply(sim, s, k: Dictionary) -> void:
	var f: Dictionary = k.fx
	var amp := HSU.clamp(IKKI.a + IKKI.b * s.E, IKKI.lo, IKKI.hi) if k.get("ikki") else 1.0
	# 速さの効き目が重なったら強いほう（倍率が高いほう。同じなら長く残るほう）を残す（外部レビューの指摘 2026-10-20）
	if f.get("spd"):
		var b := { mul = 1.0 + f.spd * amp, until = sim.t + float(HSU.or_(f.get("sec"), 1.5)), id = k.id, free = HSU.truthy(f.get("free")) }
		var o = s.boost
		if not (o and sim.t < o.until and (o.mul > b.mul or (o.mul == b.mul and o.until >= b.until))): s.boost = b
	if f.get("free") and k.at == "start": s.easyStart = true
	if f.get("top"): s.topAdd = s.topAdd + f.top
	if f.get("E"): s.E = HSU.clamp(s.E + f.E, -0.2, 1.0)
	if f.get("drift") and s.me and sim.ctl and sim.ctl.lastWhip != null: sim.ctl.lane = HSU.clamp(sim.ctl.lane + sim.ctl.lastWhip.away * f.drift, 0.0, 12.0)
	elif f.get("drift"): s.driftLane = float(HSU.or_(s.driftLane, 0.0)) + f.drift * 1.5
	if f.get("pos"): s.gapAdj = float(HSU.or_(s.gapAdj, 0.0)) - f.pos
	# ほかの馬に効く（幻惑逃げ・影もなし）：後ろの馬のスタミナを減らす（foe があればその脚質だけ）
	if f.get("foeE"):
		for o in sim.st:
			if o != s and not o.done and o.x < s.x and (not f.get("foe") or f.foe.has(o.h.get("style"))): o.E = HSU.clamp(o.E + f.foeE, -0.2, 1.0)
