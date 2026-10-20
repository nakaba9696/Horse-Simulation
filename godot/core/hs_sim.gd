# レースの模擬（js/core/racesim.js の HS.Sim と同じ）。0.1秒刻みで全馬を動かし、着順・タイム・実況・描画用のコマを出す。
# 同じ種・同じ操作なら JS 版と毎刻み同じ位置・同じ着順・同じタイムになる（tools/golden_race.js と godot/tests/test_race.gd で確かめる）。
#   var sim = HSSim.create(race, runners, w_idx, HSRng.new(seed), { ride = true })
#   while not HSSim.step(sim): ...            # 0.1 秒ずつ（操作は HSSim.ctl_up(sim) など）
#   var res := HSSim.finish(sim)              # { results, events, frames, D, straight, lap, winnerTime }
# 式の並び（浮動小数の計算の順）は JS と同じにしてある。直すときは JS 版と一緒に直し、一致テストを回す
class_name HSSim

const DT := 0.1
const REC_EVERY := 2
const LEN := 2.4

# ---------- 1頭の状態（JS の st の要素と同じ名前） ----------
class Runner:
	var r: Dictionary
	var h: Dictionary
	var i: int
	var A: float
	var vc: float
	var Ds: float
	var kickS: float
	var spurtR: float
	var guts: float
	var mind: float
	var slopeP: float
	var x := 0.0
	var v := 0.0
	var E := 1.0
	var delay := 0.0
	var late := false
	var kakariDay := false # この日は掛かりやすい（レースの初めのくじ）
	var acc: float
	var zubu: float
	var spurtCost: float
	var oonige := false
	var sora := false
	var sunaB := false
	var jiyu := false
	var gapAdj := 0.0
	var driftLane := 0.0
	var me := false
	var fired := {}
	var boost: Variant = null
	var trig: Array = []
	var sk: Variant = null
	var passive: Array = []
	var passiveShown := false
	var lane := 0.0
	var laneT := 0.0
	var spurting := false
	var done := false
	var finishT: Variant = null
	var t600: Variant = null
	var blocked := 0.0
	var blockedOnce := false
	var styleMult: float
	var gap: float
	var jiyuMove := 0
	var fight := 0.0
	var duel: Variant = null
	var fightPeak := 0.0
	var kakari := 0.0 # 掛かり（ハミに逆らう強さ・頭の上げ具合 0〜1）
	# 前の名前（画面の係のため。kakari と同じ）
	var headUp: float:
		get: return kakari
	var ears := 0.4
	var rk: Variant = null
	var easyStart := false
	var topAdd := 0.0
	var sunaT := 0.0
	var tsuiso := false # 追走○（HSSkills.flags）
	var sotoM := false # 外回し○
	var sabaki := false # 馬群さばき

# ---------- 自分で乗る馬の操作の状態（JS の sim.ctl） ----------
class Ctl:
	var tension: float
	var started := false
	var fumble := false
	var gear := 0.0
	var hand := "R"
	var swapUntil := -1.0
	var lastPush := -9.0
	var lastPull := -9.0
	var pushes := 0
	var whips := 0
	var whipUntil := -1.0
	var windmill := false
	var lane := 0.0
	var blockedNow := false
	var wide := false
	var kakariNow := false
	var behind := false
	var surge := 0.0
	var shrink := 0.0
	var pullT := 0.0
	var reinFight := false
	var bumpT: Variant = null
	var bumpSide := 0.0
	var bond: Variant = null
	var bondF := 1.0
	var spurtTension: Variant = null
	var lastEv: Variant = null
	var startGood: Variant = null
	var taps: Array = []
	var whipT: Array = []
	var lastWhip: Variant = null
	var laneT := 0.0
	var driftT := 0.0
	var evT := {}
	var passSeen := {}
	var misfit := false
	var everKakari := false
	var steered := false        # 進路を自分で動かした
	var beats := 0              # 拍子の合ったしごきの続いた数
	var lastBeat := -9.0        # 最後に拍子の合ったしごきの時刻
	# しごく・引くの段（JS の getter）
	var push: float:
		get: return HSU.mx(0.0, gear)
	var hold: bool:
		get: return gear < -0.05

# ---------- レース全体の状態（JS の sim） ----------
class Sim:
	var race: Dictionary
	var runners: Array
	var wIdx: Variant
	var rng: HSRng
	var opts: Dictionary
	var geo: Dictionary
	var D: float
	var straight: float
	var slope: Variant
	var paceF: float
	var pace: float
	var st: Array = []
	var events: Array = []
	var frames: Array = []
	var t := 0.0
	var step := 0
	var finished := 0
	var winnerT: Variant = null
	var over := false
	var talk := { lastLeader = null, straight = false, mid = false, corner = false, f400 = false, f200 = false }
	var track: HSTrack = null
	var me := -1
	var ctl: Ctl = null
	var _byX: Array = []
	var checkAt: float
	var check: Variant = null
	var skillFx: Array = []
	var top: float
	var gateWait := 0.0
	var marks: Array = []    # ラップの区切り（JS の sim.marks。lap_marks）
	var splits: Array = []   # 先頭が区切りを過ぎた時刻（まだなら null）
	var lapN := 0

# ---------- 調整の値（JS の S.〜 と同じ） ----------
static var OONIGE := { early = 1.02, mid = 1.02, kick = 0.5, lead = 0.055 }
static var DS := 0.68
static var ZONE := { "逃げ": [0.0, 0.12], "先行": [0.05, 0.4], "差し": [0.3, 0.75], "追込": [0.6, 1.0] }
static var MISFIT := 10.0
static var MISFIT_FROM := 0.2
static var TENSE_COST := 1.0
static var KAKARI_COST := 1.6
static var TENSION := { base = 25.0, hot = 0.5, kakari = 15.0, settle = 0.08, calm = 1.2, lane = 8.0 }
static var START_ACC := 7.5
# ゲートを出た直後：脚質ごとの出だしの加速の倍率。FAN.x m までは内へ寄る速さを 0.2 秒に FAN.v 進路までに（JS の S.START_STYLE・S.FAN）
static var START_STYLE := { "逃げ": 1.18, "先行": 1.07, "差し": 0.96, "追込": 0.88 }
static var FAN := { x = 250.0, v = 0.1 }
# 拍子（JS の S.BEAT。説明は js/core/racesim.js）
static var BEAT := { stride = 7.2, lag = 0.05, at = 0.55, win = 0.2, minGap = 0.25, vmin = 8.0, gear = 1.4, calm = 0.5, keep = 0.95, k = 0.05, save = 0.985 }
static var START_SKILL_ACC := 1.35
static var EASY_START := 0.95
static var LATE_E := 0.15
# ゲート（JS の S.GATE。持ち主の指摘 2026-10-17「スタートのカウントダウンいらない　目押しで」）。秒はレースの秒
# wait＋spread×くじ＝ゲートで待つ秒（レースの種から）・tell＝前触れ（灯）から開くまで・buf と good＝GOOD の幅（開く前と後）・fumble＝早押しのあとの出の遅れ・fret＝早押しで上がる気分
static var GATE := { wait = 2.2, spread = 1.6, tell = 0.8, buf = 0.12, good = 0.1, fumble = 0.35, fret = 4.0 }
# ゲートで待つ秒（JS の S.gateWaitOf。種の乱数は進めない）
static func gate_wait_of(rng: HSRng) -> float:
	var g := HSRng.new(float((rng.s ^ 0x9E3779B9) & 0xFFFFFFFF))
	return float(GATE.wait) + float(GATE.spread) * g.next()
static var PUSH := { base = 0.25 }
# 横の移動（自分で乗る馬）：毎秒 v 進路・前後 dx m 以内で、進路の差が gap より近い馬がいる向きへは動けない・何もしないまま drift 秒で内へ戻り始める
static var LANE := { v = 3.0, dx = 2.0, gap = 0.8, drift = 10.0 }
static var EARLY_PUSH := 500.0
static var GEAR_GAP := 18.0
static var GEAR_COST := 0.05
static var POS_K := 0.004
static var POS_MAX := 0.03
static var WHIP := { k = 0.4, wind = 0.6, cost = 0.96, windCost = 0.98, early = 0.2, earlyCost = 1.2 }
static var CALM_SAVE := 0.97
static var PACE_HI := 1.006
static var PACE_LO := 0.994
static var PACE_K := 25.0
static var DRAFT := 0.08
static var PACE_TOP := 50.0
static var PACE_EARLY := 60.0
static var PACE_NIGE := [-0.009, -0.002, 0.003, 0.008]
static var PACE_SD := 0.006
# その日の出来の揺れ（点）。前の 1.9 に調子（sd 0.89 点）の分を合わせた（racesim.js の S.FORM_SD）
static var FORM_SD := 2.1
static var STYLE_MULT := { "逃げ": 1.03, "先行": 1.014, "差し": 0.995, "追込": 0.982 }
static var STYLE_GAP := { "逃げ": 0.0, "先行": 6.0, "差し": 13.0, "追込": 21.0 }
static var STYLE_SPURT := { "逃げ": 0.0, "先行": 60.0, "差し": 120.0, "追込": 170.0 }
static var HILL := { v = 0.4, e = 100.0, dv = 0.25, de = 10.0, mid = 0.4 }
static var LONGSPURT := { r = 50.0, z = 0.002 }
static var JIYU := { slow = 0.994, hi = 1.006, k = 0.5, misfit = 0.35 }
static var SUNA := 1.08
# 追走○・外回し○の脚の使い方の倍率。馬群さばき：横の動きの速さの倍率・止められる幅（進路の差 gap・前後 dx m）・AI の前が壁の長さの倍率
static var TSUISO := 0.95
static var SOTO := 0.96
static var SABAKI := { v = 1.6, gap = 0.55, dx = 1.4, block = 0.4 }
static var KIRE := { s0 = 0.03, s1 = 0.0035, r = 60.0, a0 = 0.85, a1 = 0.05, c0 = 0.95, c1 = 0.0, cS = 0.035, z = 0.0015, top = 2.2 }
# 馬場の状態（js/core/racesim.js の S.GROUND・S.mudS・S.groundDrop・S.mudLabel・S.groundFx と同じ。C++ は hs_horse.cpp の mud_s・ground_drop・ground_fx）。数は docs/BALANCE.md「14. 馬場の状態」
# スピード：稍重・重・不良では全馬の強さ（点）が sp[芝ダ][段]×s 下がる。s は道悪の適性で決まる（ref より上は 1−(適性−ref)/up、下は 1＋(ref−適性)/dn。0〜sMax）
# スタミナの減り（e）と終いの伸び（k）は全馬共通（道悪の適性は掛けない）。mid・bad は印（mud_label）の境目
static var GROUND := { mid = 75.0, bad = 45.0, ref = 66.0, up = 27.0, dn = 22.0, sMax = 3.0,
	sp = { "芝": [0.0, 2.0, 4.0, 6.0], "ダ": [0.0, 1.5, 3.0, 4.5] },
	e = { "芝": [0.0, 0.009, 0.019, 0.031], "ダ": [0.0, 0.007, 0.014, 0.024] }, k = { "芝": [0.0, 0.014, 0.028, 0.046], "ダ": [0.0, 0.01, 0.02, 0.034] },
	dLo = 0.6, dHi = 1.6, kw0 = 0.5, kw1 = 0.15, kMin = 0.35 }
# 道悪でのスピードの下がりやすさ（1＝ふつう。大きいほど下がる）
static func mud_s(heavy: Variant) -> float:
	var G := GROUND
	var a: float = float(HSU.or_(heavy, 50.0))
	if a >= G.ref: return HSU.mx(0.0, 1.0 - (a - G.ref) / G.up)
	return HSU.mn(G.sMax, 1.0 + (G.ref - a) / G.dn)
# 道悪で下がる強さ（点。0 以上）
static func ground_drop(horse: Dictionary, race: Dictionary) -> float:
	var gl: int = _GROUND.get(race.get("ground"), 0)
	if gl == 0: return 0.0
	var sf := "ダ" if race.get("surface") == "ダ" else "芝"
	return GROUND.sp[sf][gl] * mud_s(_heavy_of(horse))
# 道悪の得手不得手の印（苦手・ふつう・得意）
static func mud_label(heavy: Variant) -> String:
	var a: float = float(HSU.or_(heavy, 50.0))
	return "苦手" if a < GROUND.bad else ("得意" if a >= GROUND.mid else "ふつう")
static func _heavy_of(horse: Dictionary) -> Variant:
	var apt: Variant = horse.get("apt")
	return apt.get("heavy") if apt is Dictionary else null
# この馬場での効き：e＝スタミナの減りの倍率・k＝終いの伸びの倍率（全馬共通。切れと距離だけで変わる）・s＝スピードの下がりやすさ
static func ground_fx(horse: Dictionary, race: Dictionary) -> Dictionary:
	var G := GROUND
	var gl: int = _GROUND.get(race.get("ground"), 0)
	if gl == 0: return { e = 1.0, k = 1.0, s = 0.0 }
	var sf := "ダ" if race.get("surface") == "ダ" else "芝"
	var kire := HSU.clamp(float(HSU.or_(horse.get("kire"), 4.0)), 1.0, 8.0)
	var dF := HSU.clamp(float(race.dist) / 2000.0, G.dLo, G.dHi)
	var e: float = 1.0 + G.e[sf][gl] * dF
	var k: float = HSU.mx(G.kMin, 1.0 - G.k[sf][gl] * (G.kw0 + G.kw1 * (kire - 1.0)))
	return { e = e, k = k, s = mud_s(_heavy_of(horse)) }
static var ORIAI := { ramp = 2.5, calmK = 5.0, over = 0.55, overHot = 0.25, fightAfter = 1.2, fightK = 14.0, surgeT = 6.0, match = 0.35, matchLo = 0.12,
	keen = 40.0, passed = 9.0, wall = 4.0, sand = 3.0, cover = 4.0, shrinkT = 4.0, shrinkSpd = 0.012, pushSurge = 10.0, surgeMax = 45.0 }
static var FIGHT := { from = 300.0, dx = 2.4, l0 = 0.45, l1 = 1.8, dv = 0.6, g0 = 72.0, up = 10.0, low = -40.0, decay = 0.05, spd = 0.012, cost = 0.12 }
# step の中で使う定数（上の辞書と同じ値。辞書を引くより速い）
const _HILL_V := 0.4
const _HILL_E := 100.0
const _HILL_DV := 0.25
const _HILL_DE := 10.0
const _HILL_MID := 0.4
const _ON_HILL_V := { "急": 0.008, "中": 0.005, "小": 0.003 }
const _ON_HILL_E := { "急": 2.2, "中": 1.4, "小": 0.8 }
const _OONIGE_EARLY := 1.02
const _OONIGE_MID := 1.02
const _OONIGE_KICK := 0.5
const _OONIGE_LEAD := 0.055
const _FIGHT_FROM := 300.0
const _FIGHT_DX := 2.4
const _FIGHT_L0 := 0.45
const _FIGHT_L1 := 1.8
const _FIGHT_DV := 0.6
const _FIGHT_SPD := 0.012
const _FIGHT_COST := 0.12
const _GROUND := { "良": 0, "稍重": 1, "重": 2, "不良": 3 }

# 基準の巡航速度（m/s）。総合85の馬の良馬場・芝
static func base_speed(dist: float, surface: Variant, ground: Variant, course_adj: Variant) -> float:
	var v := 27.32 - 1.378 * HSMath.log_(dist)
	v *= 1.0 + HSU.mx(0.0, 1600.0 - dist) / 1600.0 * 0.04
	if surface == "ダ": v *= 0.955
	var g: int = _GROUND.get(ground, 0)
	if surface == "芝": v *= 1.0 - [0.0, 0.004, 0.0075, 0.011][g]   # 芝の道悪は馬場そのものも少し遅い（全馬のスピードの下がりは ground_drop）
	else: v *= 1.0 + [0.0, 0.004, 0.007, 0.009][g]
	v *= 1.0 + float(HSU.or_(course_adj, 0.0))
	return dist / (dist / v + 2.4)

# 疲労の段階と下げ（js/core/racesim.js の S.FATIGUE・S.fatigueStage・S.fatiguePen と同じ。C++ は hs_horse.cpp の fatigue_pen）
const FATIGUE := { at = [15.0, 35.0, 55.0, 75.0], pen = [0.0, 1.5, 4.0, 8.0, 13.0], strong = 86.0, top = 104.3, keep = 0.2 }
static func fatigue_stage(fat: float) -> int:
	var at: Array = FATIGUE.at
	var st := 0
	while st < at.size() and fat >= at[st]: st += 1
	return st
static func fatigue_pen(fat: float, a: float) -> float:
	var p: float = FATIGUE.pen[fatigue_stage(fat)]
	if not p: return 0.0
	return p * HSU.clamp(1.0 - (a - FATIGUE.strong) / (FATIGUE.top - FATIGUE.strong) * (1.0 - FATIGUE.keep), FATIGUE.keep, 1.0)

# 1頭の、このレースでの強さ（点）と内訳
static func power(horse: Dictionary, race: Dictionary, w_idx: Variant, ctx: Variant) -> Dictionary:
	if use_native(): return ClassDB.class_call_static(&"HSNativeSim", &"power", horse, race, w_idx, ctx if ctx else {})
	return _power_gd(horse, race, w_idx, ctx)
static func _power_gd(horse: Dictionary, race: Dictionary, w_idx: Variant, ctx: Variant) -> Dictionary:
	var c0 := HSHorse.cur(horse, w_idx)
	var dirt: bool = race.surface == "ダ"
	var c := c0.duplicate(); c.merge(HSHorse.on_surface(c0, race.surface), true)
	var w: Dictionary = { spd = 0.42, sta = 0.20, guts = 0.15, mind = 0.11, slope = 0.12 } if dirt else { spd = 0.45, sta = 0.22, guts = 0.16, mind = 0.12, slope = 0.05 }
	var a := 0.0
	for k in w: a += c[k] * w[k]
	var D: float = race.dist
	var distPen := 0.0
	if D < horse.distMin: distPen = (horse.distMin - D) / 100.0 * 1.4
	if D > horse.distMax: distPen = (D - horse.distMax) / 100.0 * 1.2
	var surfPen := 0.0
	# 馬場の状態：稍重・重・不良では全馬のスピード（強さの点）が下がり、道悪の適性が高いほど下がりにくい（ground_drop）
	var groundAdj: float = -ground_drop(horse, race)
	var layoff := 1.2 if (horse.get("lastRaceW") != null and w_idx != null and w_idx - horse.lastRaceW >= 12) else 0.0
	var trav: float = float(HSU.or_(ctx.get("travel"), 0.0)) if ctx else 0.0   # このレースへの移動の疲れ（HSFatigue.travel）
	# 調子は無い（持ち主の決定 2026-10-20）。調子の揺れの分はその日の出来（FORM_SD）に入れた
	var condAdj: float = -fatigue_pen(float(HSU.or_(horse.get("fatigue"), 0.0)) + trav, a) - layoff
	var jockAdj := 0.0
	if ctx and ctx.get("jockey"): jockAdj = (ctx.jockey.skill - 75.0) * 0.06
	var wtAdj := 0.0
	if ctx and ctx.get("weight"): wtAdj = -(ctx.weight - 56.0) * 1.4
	var skillAdj := skill_adj(horse, race, w_idx, ctx)
	var total := a - distPen - surfPen + groundAdj + condAdj + jockAdj + wtAdj + skillAdj
	return { total = total, base = a, distPen = distPen, surfPen = surfPen, groundAdj = groundAdj, condAdj = condAdj, skillAdj = skillAdj, cur = c }

# 特殊能力のうち、レースの条件で強さが上下するもの（ids を渡すと、その能力だけで数える）
static func skill_adj(horse: Dictionary, race: Dictionary, w_idx: Variant, ctx: Variant, ids: Variant = null) -> float:
	var sk = ids if ids != null else horse.get("skills")
	if not sk or not sk.size(): return 0.0
	var course: Dictionary = HSData.d().courses.get(race.course, {})
	var geo = HSU.or_(course.get("dirt") if race.surface == "ダ" else course.get("turf"), HSU.or_(course.get("turf"), HSU.or_(course.get("dirt"), {})))
	var gap = w_idx - horse.lastRaceW if (horse.get("lastRaceW") != null and w_idx != null) else null
	var dir = course.get("dir")
	var month = race.get("month"); var region = race.get("region")
	var a := 0.0
	for id in sk:
		if id == "big" and race.get("grade") == "G1": a += 2.0
		elif id == "fresh" and gap != null and gap >= 10: a += 2.0
		elif id == "tataki" and gap != null: a += -2.0 if gap >= 10 else 1.2
		elif id == "left" and dir == "左": a += 1.8
		elif id == "right" and dir == "右": a += 1.8
		elif id == "small" and geo.get("straight") and geo.straight < 330: a += 1.8
		elif id == "long" and geo.get("straight") != null and geo.straight >= 450: a += 1.8
		elif id == "summer" and month != null and month >= 6 and month <= 8: a += 1.8
		elif id == "winter" and month != null and (month == 12 or month <= 2): a += 1.8
		elif id == "inner" and ctx and ctx.get("num") and ctx.num <= 4: a += 1.2
		elif id == "outer" and ctx and ctx.get("frame") != null and ctx.frame >= 7: a += 1.2
		elif id == "mud" and (race.get("ground") == "重" or race.get("ground") == "不良"): a += 2.0
		elif id == "travel" and region == "海外": a += 2.0
		elif id == "homebody" and region == "海外": a -= 3.0
		elif id == "leftB" and dir == "左": a -= 1.5
		elif id == "rightB" and dir == "右": a -= 1.5
		elif id == "hipace" and ctx and ctx.get("paceF") != null and ctx.paceF > PACE_HI: a += 1.8
		elif id == "slowpace" and ctx and ctx.get("paceF") and ctx.paceF < PACE_LO: a += 1.8
	return a

# 斤量（簡略）
static func weight_for(horse: Dictionary, race: Dictionary, year: float) -> float:
	var age: float = year - horse.born
	var w: float
	if age <= 2: w = 55.0
	elif race.get("age") == "3": w = 57.0
	else: w = 56.0 if (race.month <= 9 and age == 3) else 58.0
	if race.get("age") == "3+" and age == 3 and race.month >= 10: w = 56.0
	if horse.get("sex") == "牝" and race.get("sex") != "牝": w -= 2.0
	if race.get("weight") == "ハンデ": w = 53.0 + HSMath.round_js(float(HSU.or_(horse.get("earn"), 0.0)) / 3000.0) - (1.0 if horse.get("sex") == "牝" else 0.0)
	if race.get("weight") == "別定":
		var g1 := 0
		for g in HSU.or_(horse.get("gradedWins"), []):
			if g.get("grade") == "G1": g1 += 1
		w += mini(2, g1)
	return HSU.clamp(w, 48.0, 60.0)

static func pace_verdict(f: float) -> String:
	return "ハイペース" if f > PACE_HI else ("スローペース" if f < PACE_LO else "平均ペース")
static func pace_hint(v: String) -> String:
	return "前は苦しい。後ろでためて遅めに" if v == "ハイペース" else ("前が楽。早めに動け" if v == "スローペース" else "力どおりの流れ")
# 気性の荒さ（mind が70より低いほど大きい。45で2倍）
static func temperF(s) -> float:
	return 1.0 + HSU.mx(0.0, 70.0 - s.mind) / 25.0
# ムチへの素直さ
static func respOf(c: Ctl) -> float:
	var t: float = c.spurtTension if c.spurtTension != null else c.tension
	return HSU.clamp(1.1 - HSU.mx(0.0, t - 35.0) / 80.0, 0.6, 1.1)
static func bondF(n: Variant) -> float:
	if n == null: return 1.0
	if n <= 0: return 1.15
	if n < 3: return 1.15 - n * 0.05
	return HSU.mx(0.8, 1.0 - (n - 3.0) * 0.022)
# 臆病さ（0〜1.3）
static func cowardOf(s) -> float:
	return HSU.clamp((72.0 - s.guts) / 25.0, 0.0, 1.0) + (0.3 if (s.trig and s.trig.has("sessenB")) else 0.0)
# 歩幅の周期（秒）。映像の足の運びに使う
static func stride_of(v: Variant) -> float:
	return HSU.clamp(7.4 / HSU.mx(10.0, HSU.or_(v, 16.0)), 0.38, 0.7)
# 拍子の位相（0〜1）：描画（ViewGait）と同じ式
static func beat_phase(s) -> float:
	var ph := fmod((s.x - s.v * BEAT.lag) / BEAT.stride + float(s.r.num) * 0.137, 1.0)
	if ph < 0: ph += 1.0
	return ph
static func _on_beat(sim, c) -> bool:
	return c.beats >= 2 and sim.t - c.lastBeat < BEAT.keep

# 道中の位置取り（脚質と自由自在）
static func run_pos(h: Dictionary, paceF: float) -> Dictionary:
	var st = h.get("style"); var i: int = HSHorse.STYLES.find(st)
	var pos := { mult = STYLE_MULT.get(st, 1.0), gap = STYLE_GAP[st] if STYLE_GAP.get(st) != null else 10.0, jiyu = 0 }
	if not HSHorse.has(h, "jiyu") or i < 0: return pos
	var to := i - 1 if (paceF < JIYU.slow and i > 0) else (i + 1 if (paceF > JIYU.hi and i < HSHorse.STYLES.size() - 1) else i)
	if to == i: return pos
	var t: String = HSHorse.STYLES[to]; var k: float = JIYU.k
	return { mult = pos.mult + (STYLE_MULT[t] - pos.mult) * k, gap = pos.gap + (STYLE_GAP[t] - pos.gap) * k, jiyu = -1 if to < i else 1 }

static func dir_of(sim: Sim) -> String:
	return HSData.d().courses.get(sim.race.course, {}).get("dir", "右")
static func whip_eff(c) -> float:
	return HSU.mx(0.25, 1.0 - 0.07 * HSU.mx(0.0, c.whips - 1.0))
# 気分（高いほど良い）
static func mood(c) -> float:
	return HSU.clamp(100.0 - c.tension, 0.0, 100.0) if c else 50.0

# ---------- C++（GDExtension。godot/native/）への切り替え：ここ 1 か所 ----------
# C++ の模擬（HSNativeSim）が読めればそれを、読めなければ下の GDScript の模擬を使う。どちらも JS と同じ結果（一致テスト）。
# backend＝"gd" で GDScript に固定、"native" で C++ を求める（読めなければ GDScript）。テストが両方を回すのに使う
static var backend := ""
static var _native_ready := false
static func native_ok() -> bool:
	return ClassDB.class_exists(&"HSNativeSim")
static func use_native() -> bool:
	if backend == "gd" or not native_ok(): return false
	if not _native_ready:
		_native_ready = true
		var labels := {}
		for id in HSHorse.SKILLS: labels[id] = HSHorse.SKILLS[id].label
		var d := HSData.d()
		ClassDB.class_call_static(&"HSNativeSim", &"set_data", d.get("courses", {}), d.get("layouts", {}), labels, d.get("uniques", []))
	return true
# 模擬を作る。戻り値は Sim（GDScript）か HSNativeSim（C++）。どちらも同じ名前で値を読める（sim.t・sim.st[i].x・sim.ctl …）
static func create(race: Dictionary, runners: Array, w_idx: Variant, rng: HSRng, opts: Dictionary = {}):
	if use_native():
		return ClassDB.class_call_static(&"HSNativeSim", &"create", race, runners, w_idx, rng.s, opts, HSU.era_speed(race.get("year")))
	return _create_gd(race, runners, w_idx, rng, opts)
static func step(sim) -> bool:
	if sim is Sim: return _step_gd(sim)
	return sim.advance()
static func finish(sim) -> Dictionary:
	if sim is Sim: return _finish_gd(sim)
	return sim.finish()
# at＝押した時刻（レースの秒。負はゲートの中。null なら sim.t）。JS の S.ctl.up(sim, at)
static func ctl_up(sim, at: Variant = null) -> Variant:
	if sim is Sim: return _ctl_up_gd(sim, at)
	return sim.ctl_up(at)
static func ctl_down(sim) -> Variant:
	if sim is Sim: return _ctl_down_gd(sim)
	return sim.ctl_down()
static func ctl_whip(sim, side: Variant = null) -> Variant:
	if sim is Sim: return _ctl_whip_gd(sim, side)
	return sim.ctl_whip(side)
static func ctl_swap(sim) -> Variant:
	if sim is Sim: return _ctl_swap_gd(sim)
	return sim.ctl_swap()
static func ctl_lane(sim, d: float) -> Variant:
	if sim is Sim: return _ctl_lane_gd(sim, d)
	return sim.ctl_lane(d)
# どちらの模擬か（"native"＝C++・"gd"＝GDScript）
static func kind_of(sim) -> String:
	return "gd" if sim is Sim else "native"

static func run(race: Dictionary, runners: Array, w_idx: Variant, rng: HSRng, opts: Dictionary = {}) -> Dictionary:
	var sim = create(race, runners, w_idx, rng, opts)
	while not step(sim): pass
	return finish(sim)

static func _has(h: Dictionary, id: String) -> bool:
	return HSHorse.has(h, id)

static func _create_gd(race: Dictionary, runners: Array, w_idx: Variant, rng: HSRng, opts: Dictionary = {}) -> Sim:
	var cf := HSTrack.for_race(race)
	var geo: Dictionary = cf.geo
	var D: float = race.dist
	var v0 := base_speed(D, race.surface, race.get("ground"), geo.get("speed")) * HSU.era_speed(race.get("year"))
	var straight := HSU.mn(geo.straight, D * 0.6)
	var nNige := 0
	for r in runners:
		if r.horse.get("style") == "逃げ": nNige += 1
	var paceF: float = 1.0 + PACE_NIGE[mini(3, nNige)] + rng.normal(0.0, PACE_SD)
	var st: Array = []
	for i in runners.size():
		var r: Dictionary = runners[i]
		var h: Dictionary = r.horse
		var ctx := { paceF = paceF }; ctx.merge(r, true)
		var pw := power(h, race, w_idx, ctx)
		var form := rng.normal(0.0, FORM_SD)
		var A: float = pw.total + form
		var vc := v0 * (1.0 + 0.0012 * (A - 85.0))
		var sta: float = pw.cur.sta; var guts: float = pw.cur.guts; var mind: float = pw.cur.mind; var slopeP: float = pw.cur.slope
		# 馬場の状態：道悪ほどスタミナの減りが速く（Ds を割る）、終いの伸びが鈍る（全馬共通）
		var gx := ground_fx(h, race)
		var Ds: float = HSU.mx(800.0, (h.distMax + 300.0 + (sta - 75.0) * 12.0) * DS) / gx.e
		var kire := HSU.clamp(HSU.or_(h.get("kire"), 4.0), 1.0, 8.0)
		var K := KIRE
		var kickS: float = (K.s0 + K.s1 * (kire - 1.0) + 0.0006 * (pw.cur.spd - 80.0)) * gx.k
		var styleAdd: float = STYLE_SPURT[h.style] if STYLE_SPURT.get(h.get("style")) != null else 80.0
		var spurtR := HSU.clamp(straight + 120.0 + styleAdd + (4.5 - kire) * K.r + (LONGSPURT.r if _has(h, "longspurt") else 0.0) + rng.normal(0.0, 60.0) * (1.3 - mind / 120.0), 300.0, HSU.mn(1300.0, D * 0.6))
		var delay := absf(rng.normal(0.0, 0.12))
		var lateP := 0.02 + HSU.mx(0.0, 75.0 - mind) * 0.0008 + (0.14 if _has(h, "deokure") else 0.0)
		var late := rng.chance(lateP)
		if late: delay += rng.float_(0.5, 1.4)
		var kakari := rng.chance(HSU.mx(0.0, (72.0 - mind) / 100.0) * 0.3 + (0.25 if _has(h, "kakari") else 0.0))
		var rp := run_pos(h, paceF)
		var s := Runner.new()
		s.r = r; s.h = h; s.i = i; s.A = A; s.vc = vc; s.Ds = Ds; s.kickS = kickS; s.spurtR = spurtR; s.guts = guts; s.mind = mind; s.slopeP = slopeP
		s.E = 1.0 - LATE_E if late else 1.0
		s.delay = delay; s.late = late; s.kakariDay = kakari
		s.acc = K.a0 + K.a1 * kire
		s.zubu = (8.0 - kire) * K.z + (LONGSPURT.z if _has(h, "longspurt") else 0.0)
		s.spurtCost = K.c0 + K.c1 * (kire - 1.0) + K.cS * (kire - 4.5) * (330.0 - geo.straight) / 200.0
		s.oonige = _has(h, "oonige") and h.style == "逃げ"; s.sora = _has(h, "sora")
		s.sunaB = _has(h, "sunaB") and race.surface == "ダ"; s.jiyu = _has(h, "jiyu")
		s.gapAdj = 0.0
		s.lane = (r.num - 1.0) * 0.5
		s.styleMult = rp.mult; s.gap = rp.gap; s.jiyuMove = rp.jiyu
		st.append(s)
	var vcs: Array = []
	for s: Runner in st: vcs.append(s.vc)
	vcs.sort()
	var medVc: float = vcs[st.size() / 2]
	var sim := Sim.new()
	sim.race = race; sim.runners = runners; sim.wIdx = w_idx; sim.rng = rng; sim.opts = opts; sim.geo = geo; sim.D = D; sim.straight = straight
	sim.slope = geo.get("slope"); sim.paceF = paceF; sim.pace = medVc * paceF; sim.st = st
	sim.track = cf.track
	sim.checkAt = 1200.0 if D >= 2400 else (1000.0 if D >= 1600 else 600.0)
	sim.top = KIRE.top * HSU.clamp(1.0 + (paceF - 1.0) * PACE_TOP, 0.55, 1.6)
	HSSkills.setup(sim)
	for s: Runner in st: HSSkills.flags(s)
	for s: Runner in st:
		s.passive = []
		for id in HSU.or_(s.h.get("skills"), []):
			var ctx := { paceF = paceF }; ctx.merge(s.r, true)
			if skill_adj(s.h, race, w_idx, ctx, [id]) > 0: s.passive.append(id)
		if s.late and _has(s.h, "deokure"): sim.skillFx.append({ t = 0.6, i = s.i, id = "deokure" })
	var meIdx := -1
	for i in runners.size():
		if runners[i].get("rider") == "P": meIdx = i; break
	if meIdx >= 0:
		sim.me = meIdx
		var s: Runner = st[meIdx]; s.me = true
		if opts.get("ride"):
			var c := Ctl.new()
			c.tension = HSU.clamp(30.0 + (75.0 - s.mind) * 0.4 * bondF(opts.get("bond")) + (15.0 if s.kakariDay else 0.0), 10.0, 70.0)
			c.lane = HSU.mn(3.0, s.lane); c.bond = opts.get("bond"); c.bondF = bondF(opts.get("bond"))
			sim.ctl = c
			s.delay = 99.0; s.late = false
	sim.gateWait = gate_wait_of(rng)
	sim.marks = lap_marks(sim.D)
	sim.splits = []
	sim.splits.resize(sim.marks.size())
	say(sim, 0.0, "スタートしました！", "start")
	for s: Runner in st:
		if s.late: say(sim, 0.6, "%s、出遅れた！" % s.h.name, "trouble")
	return sim

static func say(sim: Sim, t: float, text: String, kind: String = "") -> void:
	sim.events.append({ t = t, text = text, kind = kind })
# 特殊能力の発動を記録する（同じ馬・同じ能力は1回だけ）。spurt は仕掛けの合図で、能力ではない
static func fire(sim: Sim, s: Runner, id: String) -> void:
	if s.fired.has(id): return
	s.fired[id] = true
	if id == "spurt": return
	sim.skillFx.append({ t = sim.t, i = s.i, id = id })
	if sim.opts.get("frames") and (s.me or s.h.get("owner") == "P" or HSU.truthy(s.h.get("hist"))): say(sim, sim.t, "%sの%s！" % [s.h.name, HSSkills.label(id)], "skill")

# ---------- プレイヤーの操作（JS の S.ctl） ----------
static func _rate_of(c: Ctl, t: float) -> int:
	var keep: Array = []
	for x in c.taps:
		if t - x < 1: keep.append(x)
	keep.append(t); c.taps = keep
	return keep.size()
static func _gear_step(n: int) -> float:
	return HSU.mn(0.25, 0.05 + 0.025 * mini(n, 8))
# しごく。ゲートの中ならスタートの合図
static func _ctl_up_gd(sim: Sim, at: Variant = null) -> Variant:
	var c := sim.ctl
	if not c or sim.over: return null
	var s: Runner = sim.st[sim.me]
	if not c.started:
		var t: float = sim.t if at == null else (float(at) if float(at) < 0.0 else HSU.mx(float(at), sim.t))
		if t < -float(GATE.buf):
			c.fumble = true; c.tension = HSU.clamp(c.tension + float(GATE.fret) * temperF(s), 0.0, 100.0); return "fumble"
		if t < 0.0: t = 0.0 # 開く直前の押しは、開いた瞬間に受け付ける
		c.started = true
		if t < float(GATE.good) and not c.fumble:
			s.delay = 0.05; c.startGood = true; return "good"
		c.startGood = false
		s.delay = HSU.mx(t, float(GATE.fumble)) if c.fumble else t
		if s.delay > 0.5:
			s.late = true; s.E -= LATE_E; say(sim, sim.t, "%s、出遅れた！" % s.h.name, "trouble"); return "late"
		return "ok"
	var n := _rate_of(c, sim.t); var d := _gear_step(n)
	# 拍子：首が下がって前へ伸びる所でしごくと、馬が応えて大きく動く（連打は数えない）
	var off := absf(beat_phase(s) - BEAT.at)
	if off > 0.5: off = 1.0 - off
	var beat: bool = s.v > BEAT.vmin and off < BEAT.win and sim.t - c.lastPush >= BEAT.minGap
	if beat:
		c.beats = c.beats + 1 if sim.t - c.lastBeat < BEAT.keep else 1
		c.lastBeat = sim.t; d *= BEAT.gear
	else: c.beats = 0
	var g0 := c.gear; c.gear = HSU.mn(1.0, c.gear + d)
	if not s.spurting:
		c.tension = HSU.clamp(c.tension + (c.gear - g0) * 12.0 * temperF(s) * (BEAT.calm if beat else 1.0), 0.0, 100.0)
		if c.surge > 5: c.surge = HSU.mn(ORIAI.surgeMax, c.surge + (c.gear - g0) * ORIAI.pushSurge)
	c.pushes += 1; c.lastPush = sim.t
	return "beat" if beat else ("fast" if n >= 5 else "ok")
# 引く
static func _ctl_down_gd(sim: Sim) -> Variant:
	var c := sim.ctl
	if not c or not c.started or sim.over: return null
	var n := _rate_of(c, sim.t); var d := _gear_step(n)
	var g0 := c.gear; c.gear = HSU.mx(-1.0, c.gear - d)
	c.tension = HSU.clamp(c.tension + (g0 - c.gear) * (14.0 if n >= 5 else 4.0) * temperF(sim.st[sim.me]), 0.0, 100.0)
	c.lastPull = sim.t
	return "fast" if n >= 5 else "ok"
# ムチ（side＝"L" か "R"。持っていない手のムチは、まず持ち替える）。続けて打つと風車ムチ
static func _ctl_whip_gd(sim: Sim, side: Variant = null) -> Variant:
	var c := sim.ctl
	if not c or not c.started or sim.over: return null
	var s: Runner = sim.st[sim.me]
	if not side: side = c.hand
	if sim.t < c.swapUntil: return "swap"
	if side != c.hand: return ctl_swap(sim)
	c.whips += 1; c.whipUntil = sim.t + 1.2
	var keep: Array = []
	for x in c.whipT:
		if sim.t - x < 1.5: keep.append(x)
	keep.append(sim.t); c.whipT = keep
	c.windmill = c.whipT.size() >= 3
	var R := sim.D - s.x
	if R > sim.straight + 200: c.tension = HSU.clamp(c.tension + 12.0, 0.0, 100.0)
	# ムチでは進路は変わらない（どちらの手で打ってもよれない。持ち主の指摘 2026-10-17）。away は打った手と反対の側（見た目の向きだけ）
	var away := -1.0 if ((dir_of(sim) == "左") == (side == "R")) else 1.0
	c.lastWhip = { t = sim.t, side = side, away = away, yore = false }
	if c.whips > 12: return "tired"
	return "windmill" if c.windmill else "ok"
# ムチの持ち替え（少しの間、打てない）
static func _ctl_swap_gd(sim: Sim) -> Variant:
	var c := sim.ctl
	if not c or sim.over: return null
	c.hand = "L" if c.hand == "R" else "R"; c.swapUntil = sim.t + 0.35
	return "swap"
static func _ctl_lane_gd(sim: Sim, d: float) -> Variant:
	var c := sim.ctl
	if not c: return null
	var l0 := c.lane; c.lane = HSU.clamp(HSMath.round_js(c.lane + d), 0.0, 12.0); c.laneT = sim.t; c.steered = true
	var s: Runner = sim.st[sim.me]
	if c.started and c.lane != l0 and not s.spurting and s.x > sim.D * 0.05: c.tension = HSU.clamp(c.tension + TENSION.lane * (temperF(s) - 1.0 + 0.15), 0.0, 100.0)
	return null
# 前の形の呼び名（push＝しごく、hold＝押している間は引く）
static func ctl_push(sim) -> Variant:
	return ctl_up(sim)
static func ctl_hold(sim, on: bool) -> void:
	if not (sim is Sim):
		sim.ctl_hold(on); return
	if on and sim.ctl and sim.ctl.started and sim.ctl.gear > -1 and sim.t - sim.ctl.lastPull > 0.4: ctl_down(sim)

# ---------- 折り合い（自分で乗る馬の気分）----------
static func oriai_step(sim: Sim, s: Runner, c: Ctl, g: float, prog: float, ahead1: Variant) -> void:
	var st := sim.st; var T := TENSION; var O := ORIAI
	var bf := c.bondF
	var tf := 1.0 + (temperF(s) - 1.0) * bf
	var cw := cowardOf(s)
	var zone: Array = ZONE.get(s.h.get("style"), ZONE["先行"])
	var off := HSU.mx(0.0, HSU.mx(zone[0] - s.rk, s.rk - zone[1])) if (prog > MISFIT_FROM and s.rk != null) else 0.0
	c.misfit = off > 0.05
	if prog > 0.08 and sim.step % 5 == 0:
		var hot := tf - 1.0 + 0.15; var front: bool = s.h.style == "逃げ" or s.h.style == "先行"; var t := sim.t
		var cd := c.evT; var seen := c.passSeen
		var due := func(k: String, sec: float) -> bool:
			if t - float(cd.get(k, -99.0)) < sec: return false
			cd[k] = t; return true
		var ev = null
		for o: Runner in st:
			if o == s or o.done or (seen.get(o.i) != null and t - seen[o.i] < 10): continue
			if o.x > s.x - 1 and o.x - s.x < 3 and absf(o.lane - s.lane) < 2 and o.v > s.v + 0.35:
				seen[o.i] = t; c.surge += O.passed * hot * (1.3 if front else 1.0) * HSU.mx(0.0, 1.0 - cw * 0.6); ev = "passed"; break
		if c.blockedNow and due.call("wall", 3.0):
			if cw > 0.5: c.shrink = HSU.mn(1.0, c.shrink + 0.3 * cw)
			else: c.surge += O.wall * hot
			ev = HSU.or_(ev, "wall")
		if sim.race.surface == "ダ" and ahead1 and due.call("sand", 2.0):
			c.surge += O.sand * (2.5 if s.sunaB else HSU.mx(0.0, tf - 1.0) * 0.6 + cw * 0.4); ev = HSU.or_(ev, "sand")
		var side := func(d: float) -> bool:
			for o: Runner in st:
				if o != s and not o.done and absf(o.x - s.x) < 2 and d * (o.lane - s.lane) > 0.5 and d * (o.lane - s.lane) < 1.6: return true
			return false
		if side.call(1.0) and (s.lane < 0.6 or side.call(-1.0)) and due.call("cover", 3.0):
			if cw > 0.4: c.shrink = HSU.mn(1.0, c.shrink + 0.2 * cw)
			c.surge += O.cover * (1.5 if (s.trig and s.trig.has("kongomi")) else HSU.mx(0.0, tf - 1.0))
			ev = HSU.or_(ev, "cover")
		if ev: c.lastEv = { t = t, ev = ev }
		c.surge = HSU.mn(O.surgeMax, c.surge)
	var p := HSU.mx(0.0, -g)
	c.pullT = c.pullT + DT if p > 0.05 else HSU.mx(0.0, c.pullT - 2.0 * DT)
	var over := HSU.mx(0.2, O.over - (tf - 1.0) * O.overHot)
	var rein := 0.0; var gentle := false
	if p > 0.05 and _has(s.h, "kakari"): rein = 1.5
	elif p > over and c.pullT > O.fightAfter and c.tension > O.keen: rein = (p - over) * O.fightK * tf * HSU.mn(1.0, (c.tension - O.keen) / 25.0)
	elif p > 0.05:
		rein = -O.calmK * HSU.mn(p, over) * HSU.mn(1.0, c.pullT / O.ramp); gentle = p >= O.matchLo
	c.reinFight = rein > 0 and not _has(s.h, "kakari")
	c.surge *= HSMath.exp_(-DT / (O.surgeT * (O.match if gentle else 1.0) * (1.6 if g > 0.05 else 1.0)))
	c.shrink *= HSMath.exp_(-DT / O.shrinkT)
	var rest: float = T.base + HSU.mx(0.0, 70.0 - s.mind) * T.hot * bf + (T.kakari if s.kakariDay else 0.0) + c.surge
	var ner: float = (rest - c.tension) * T.settle + off * MISFIT * tf * tf * (JIYU.misfit if s.jiyu else 1.0) * (1.0 if prog < 0.65 else 0.5)
	var sides := 0
	for o: Runner in st:
		if o != s and not o.done and o.x - s.x > -1.5 and o.x - s.x < 3 and absf(o.lane - s.lane) < 1.6: sides += 1
	var boxed := 0.0 if prog < 0.08 else (1.5 if (sides >= 2 and (s.h.style == "逃げ" or s.h.style == "追込")) else (0.4 if sides else 0.0))
	var calm: float = (T.calm if (ahead1 and s.h.style != "逃げ") else 0.0) / sqrt(tf)
	c.tension = HSU.clamp(c.tension + (ner + boxed * tf + rein - calm) * DT, 0.0, 100.0)

# 掛かり（ハミに逆らう強さ・頭の上げ具合 0〜1。s.kakari）と耳の向き（−1 伏せる〜1 前へ。s.ears）。3D の馬の首と耳に使う（模擬の結果には効かない）
static func mood_out(sim: Sim, s: Runner, c: Ctl) -> void:
	var head := 0.0; var ears := 0.4
	if c:
		head = HSU.mx(HSU.clamp((c.tension - 50.0) / 35.0, 0.0, 1.0), 1.0 if c.reinFight else 0.0)
		if c.kakariNow: ears = -0.3
		elif c.tension < 35: ears = 0.6
		if c.shrink > 0.2: ears = HSU.mn(ears, -c.shrink)
	elif s.kakariDay and s.x < sim.D * 0.5:
		head = 0.7; ears = -0.3
	if s.spurting:
		head *= 0.3; ears = HSU.mn(ears, 0.2)
	if s.fight > 30 and s.duel: ears = HSU.mn(ears, -0.7 * HSU.mn(1.0, s.fight / 80.0))
	if s.done:
		head = 0.0; ears = 0.5
	s.kakari = HSMath.round_js(head * 100.0) / 100.0; s.ears = HSMath.round_js(ears * 100.0) / 100.0

# 競り合いの気合
static func fight_step(sim: Sim, s: Runner, R: float, prog: float) -> void:
	var F := FIGHT
	var duel: Runner = null
	if prog > 0.3 and (R < sim.straight + _FIGHT_FROM or s.spurting):
		var sx := s.x; var sl := s.lane; var sv := s.v
		for o: Runner in sim.st:
			if o == s or o.done: continue
			var ddx := o.x - sx
			if ddx >= _FIGHT_DX or ddx <= -_FIGHT_DX: continue # |dx| < dx
			var dl := absf(o.lane - sl)
			if dl > _FIGHT_L0 and dl < _FIGHT_L1 and absf(o.v - sv) < _FIGHT_DV:
				duel = o; break
	s.duel = duel
	if duel:
		s.fight = HSU.clamp(s.fight + (s.guts - F.g0) / (100.0 - F.g0) * F.up * DT, F.low, 100.0)
		if s.fight > s.fightPeak: s.fightPeak = s.fight
	elif s.fight:
		s.fight *= 1.0 - F.decay * DT

# 前にいる順の並び（前の刻みの並びを、挿し込みで並べ直す）
static func by_x(sim: Sim) -> Array:
	if sim._byX.is_empty(): sim._byX = sim.st.duplicate()
	var a := sim._byX
	for i in range(1, a.size()):
		var v = a[i]; var j := i - 1
		while j >= 0 and a[j].x < v.x:
			a[j + 1] = a[j]; j -= 1
		a[j + 1] = v
	return a

static func _ahead_of(st: Array, s: Runner, dmax: float, lmax: float) -> Variant:
	for o: Runner in st:
		if o != s and not o.done and o.x > s.x and o.x - s.x < dmax and absf(o.lane - s.lane) < lmax: return o
	return null

# 0.1 秒進める。終わったら true
static func _step_gd(sim: Sim) -> bool:
	if sim.over: return true
	var D := sim.D; var st := sim.st; var straight := sim.straight; var slope = sim.slope; var pace := sim.pace; var opts := sim.opts; var rng := sim.rng
	sim.t += DT; sim.step += 1
	var t := sim.t
	var order: Array = []
	for s: Runner in by_x(sim):
		if not s.done: order.append(s)
	for k in order.size(): order[k].rk = float(k) / (order.size() - 1) if order.size() > 1 else 0.5
	var pack = null
	for o in order:
		if not o.oonige: pack = o; break
	if pack == null and order.size(): pack = order[0]
	var leaderX: float = pack.x if pack else D
	var c := sim.ctl
	for s: Runner in st:
		if s.done:
			s.v = maxf(6.0, s.v - 0.9 * DT); s.x += s.v * DT; s.kakari = 0.0; s.ears = 0.5; continue
		if s.me and c and not c.started and t >= 0.9:
			c.started = true; s.delay = 0.9; s.late = true; s.E -= LATE_E; say(sim, t, "%s、出遅れた！" % s.h.name, "trouble")
		if t < s.delay: continue
		var R := D - s.x
		var prog := s.x / D
		var target := 0.0
		var costMul := 1.0
		var kakariNow := false
		if s.me and c:
			var g := c.gear
			if not s.spurting and (R <= s.spurtR or (g > 0.35 and R < straight + 500)):
				s.spurting = true; fire(sim, s, "spurt")
				if _has(s.h, "longspurt"): fire(sim, s, "longspurt")
			if s.spurting and g < -0.05 and R > 200:
				s.spurting = false; c.spurtTension = null
			var ahead1 = _ahead_of(st, s, 5.0, 0.8)
			c.behind = ahead1 != null
			if not s.spurting: oriai_step(sim, s, c, g, prog, ahead1)
			else: c.tension = HSU.mx(0.0, c.tension - 3.0 * DT)
			if s.spurting and c.spurtTension == null: c.spurtTension = c.tension
			kakariNow = c.tension > 75 and not s.spurting
			if kakariNow and not c.kakariNow and _has(s.h, "kakari"): fire(sim, s, "kakari")
			c.kakariNow = kakariNow
			if kakariNow: c.everKakari = true
			if s.E <= 0: target = s.vc * (0.9 + 0.0005 * s.guts + s.zubu)
			else:
				if s.spurting:
					var ratioE := HSMath.cbrt(HSU.mx(0.0, s.E) * s.Ds / (0.9 * HSU.mx(R, 30.0) * s.spurtCost))
					target = s.vc * HSU.clamp(ratioE, 1.0 + s.kickS, 1.0 + s.kickS * (1.0 + (sim.top + s.topAdd - 1.0) * HSU.clamp(g, PUSH.base, 1.0)))
				elif prog < 0.22:
					target = pace * s.styleMult
					if s.easyStart: costMul *= EASY_START
					if g > 0:
						target *= 1.0 + g * 0.03; costMul *= 1.0 + 0.6 * g
					elif g < 0: target *= 1.0 + g * (0.03 if prog < 0.15 else 0.012)
				else:
					var gapT := HSU.mx(0.0, s.gap + s.gapAdj - g * GEAR_GAP)
					target = pace * (1.0 + HSU.clamp((leaderX - s.x - gapT) * POS_K, -POS_MAX, POS_MAX))
					if g > 0: costMul *= 1.0 + GEAR_COST * g
				if g < 0: costMul *= 1.0 + 0.1 * g
				if t < c.whipUntil:
					var inZone := R < straight + 200
					var W := WHIP; var k: float = W.wind if c.windmill else W.k
					var resp := respOf(c)
					target *= 1.0 + (k * resp if inZone else W.early) * s.kickS * whip_eff(c)
					costMul *= ((W.windCost if c.windmill else W.cost) * (1.0 + (1.0 - resp) * 0.15)) if inZone else W.earlyCost
				# 拍子の合ったしごきが続いている間は、馬が気持ちよく伸びる（追い出してから）
				if s.spurting and _on_beat(sim, c):
					target *= 1.0 + BEAT.k * s.kickS; costMul *= BEAT.save
				if kakariNow:
					target *= 1.012; costMul *= KAKARI_COST
				elif c.tension < 35 and not s.spurting: costMul *= CALM_SAVE
				elif c.tension > 50 and not s.spurting: costMul *= 1.0 + (c.tension - 50.0) / 100.0 * TENSE_COST
			if c.lane > 0 and t - c.laneT > LANE.drift and t - c.driftT > 1.2:
				var blockedIn := false
				for o: Runner in st:
					if o != s and not o.done and absf(o.x - s.x) < 3.2 and o.lane < s.lane - 0.2 and o.lane > c.lane - 1.9: blockedIn = true; break
				if not blockedIn:
					c.lane -= 1.0; c.driftT = t
			var ahead = _ahead_of(st, s, 2.6, 0.85)
			c.blockedNow = ahead != null
			if ahead: target = HSU.mn(target, ahead.v - 0.05)
			if c.shrink > 0.05 and not s.spurting: target *= 1.0 - ORIAI.shrinkSpd * c.shrink
		else:
			if not s.spurting and R <= s.spurtR:
				s.spurting = true
				var need := R / s.Ds * 0.9 * HSMath.pow_(1.0 + s.kickS, 3.0)
				if need > s.E * 1.15 and R > 260: s.spurting = false
				elif _has(s.h, "longspurt"): fire(sim, s, "longspurt")
			if s.E <= 0:
				target = s.vc * (0.9 + 0.0005 * s.guts + s.zubu)
			elif s.spurting:
				var ratioE := HSMath.cbrt(maxf(0.0, s.E) * s.Ds / (0.9 * maxf(R, 30.0) * s.spurtCost))
				target = s.vc * maxf(1.0 + s.kickS, minf(1.0 + s.kickS * (sim.top + s.topAdd), ratioE))
				if s.oonige: target = s.vc * (1.0 + s.kickS * _OONIGE_KICK)
				if s.sora and R < 200 and order[0] == s and order.size() > 1 and s.x - order[1].x > 2:
					target *= 0.985; fire(sim, s, "sora")
			elif prog < 0.22:
				target = pace * s.styleMult * (_OONIGE_EARLY if s.oonige else 1.0)
				if s.easyStart: costMul *= EASY_START
			elif s.oonige:
				target = pace * (_OONIGE_MID if s.x - leaderX < _OONIGE_LEAD * straight * 2000.0 / D else 1.0)
				if s.x - leaderX > 10: fire(sim, s, "oonige")
			else:
				var g0 := maxf(0.0, s.gap + s.gapAdj) # gap・gapAdj は -0 にならない
				var err: float = 0.0 if pack == s else leaderX - s.x - g0
				target = pace * (1.0 + maxf(-0.02, minf(0.02, err * 0.0012)))
				if s.kakariDay and prog < 0.5:
					target *= 1.012
					if prog > 0.1 and _has(s.h, "kakari"): fire(sim, s, "kakari")
			if s.kakariDay and prog < 0.5: costMul *= 1.3
		if s.spurting and R > straight and sim.paceF > 1: costMul *= 1.0 + (sim.paceF - 1.0) * PACE_EARLY
		if not s.spurting and prog > 0.08 and not s.oonige:
			var rk: float = 0.5 if s.rk == null else s.rk
			costMul *= maxf(0.5, 1.0 + (sim.paceF - 1.0) * PACE_K * (1.0 - 2.0 * rk)) * (1.0 - DRAFT * rk)
		if s.sunaB and not s.spurting and prog > 0.05 and _ahead_of(st, s, 4.0, 0.8) != null:
			costMul *= SUNA; s.sunaT = s.sunaT + DT
			if s.sunaT > 3: fire(sim, s, "sunaB")
		# 追走○：直線の前、すぐ前に馬がいる間は、脚の減りが少ない
		if s.tsuiso and not s.spurting and prog > 0.08 and R > straight and _ahead_of(st, s, 4.0, 0.8) != null:
			costMul *= TSUISO; fire(sim, s, "tsuiso")
		# 外回し○：3〜4コーナーで追い出している間は、脚の減りが少ない。自分で乗る馬は外（進路1.5より外）にいるときだけ
		if s.sotoM and s.spurting and R > straight and ((sim.track.corner_at(R) != 0 and R < straight + 700) if sim.track else R < straight + 350) and (not (s.me and c) or s.lane > 1.5):
			costMul *= SOTO; fire(sim, s, "sotomawashi")
		fight_step(sim, s, R, prog)
		var fk := s.fight / 100.0
		if fk and (s.spurting or s.E <= 0):
			target *= 1.0 + _FIGHT_SPD * fk
			if fk > 0: costMul *= 1.0 - _FIGHT_COST * fk
		if s.boost and t < s.boost.until:
			target *= s.boost.mul
			if s.boost.free: costMul /= s.boost.mul * s.boost.mul * s.boost.mul
		var grade := sim.track.g_at(R) if (sim.track and not sim.track.flat) else 0.0
		var onHill: bool = (not sim.track or sim.track.flat) and R < 320 and R > 60 and slope != "平"
		if onHill: target *= 1.0 - float(_ON_HILL_V.get(slope, 0.0)) * (1.0 - s.slopeP / 120.0)
		var hillW: float = 1.0 if s.spurting else _HILL_MID
		if grade > 0: target *= 1.0 - grade * _HILL_V * hillW * (1.0 - s.slopeP / 120.0)
		elif grade < 0: target *= 1.0 - grade * _HILL_DV
		if not (s.me and c) and s.spurting and not s.blockedOnce and st.size() >= 10 and (s.h.style == "差し" or s.h.style == "追込"):
			s.blockedOnce = true
			var jk: float = s.r.jockey.skill if s.r.get("jockey") else 70.0
			if rng.chance(0.1 * (1.0 - s.mind / 160.0) * (1.2 - jk / 150.0)):
				# 外回し○は外を回して壁を避け、馬群さばきはすぐに進路を見つける（くじは同じように引く）
				s.blocked = rng.float_(1.0, 2.4) * (0.0 if s.sotoM else (SABAKI.block if s.sabaki else 1.0))
				if s.blocked > 0: say(sim, t, "%s、前が壁になった！" % s.h.name, "trouble")
		if s.blocked > 0:
			target *= 0.93; s.blocked -= DT
		var accel: float = START_ACC * float(START_STYLE.get(s.h.get("style"), 1.0)) * (START_SKILL_ACC if (s.boost and s.boost.free and t < s.boost.until) else 1.0) if s.v < s.vc * 0.9 else s.acc + s.slopeP * 0.0015
		var dv := maxf(-1.4 * DT, minf(accel * DT, target - s.v))
		var vPrev := s.v
		s.v = HSU.mx(0.0, s.v + dv)
		var ratio := s.v / s.vc
		var cost := (s.v * DT) / s.Ds * 0.9 * ratio * ratio * ratio * costMul
		if s.spurting: cost *= s.spurtCost
		# 1 − 坂/100 は -0 にならないので、組み込みの max・min で JS と同じ
		if onHill: cost *= 1.0 + float(_ON_HILL_E.get(slope, 0.0)) * maxf(0.0, minf(0.6, 1.0 - s.slopeP / 100.0))
		if grade > 0: cost *= 1.0 + grade * _HILL_E * hillW * maxf(0.0, minf(0.6, 1.0 - s.slopeP / 100.0))
		elif grade < 0: cost *= maxf(0.7, 1.0 + grade * _HILL_DE)
		if s.me and c and c.gear > 0.05 and R > straight + EARLY_PUSH: cost *= 1.0 + 8.0 * HSU.mx(0.0, ratio - 1.0)
		s.E -= cost
		var xPrev := s.x
		var dx := (vPrev + s.v) / 2.0 * DT
		if s.me and c and sim.track:
			var corner := sim.track.corner_at(R) != 0
			c.wide = corner and s.lane > 1.5
			if corner and not s.sotoM: dx *= 1.0 - 0.005 * HSU.mx(0.0, s.lane - 0.5) # 外回し○は遠回りにならない
		s.x += dx
		mood_out(sim, s, c if s.me else null)
		if s.t600 == null and s.x >= D - 600: s.t600 = t - DT + (D - 600.0 - xPrev) / maxf(0.1, s.x - xPrev) * DT
		# ラップ：区切りをいちばん早く過ぎた馬の時刻（JS と同じ）
		var lk := sim.lapN
		while lk < sim.marks.size() and float(sim.marks[lk]) <= s.x:
			var mk := float(sim.marks[lk])
			if mk > xPrev:
				var tc := t - DT + (mk - xPrev) / maxf(0.1, s.x - xPrev) * DT
				if sim.splits[lk] == null or tc < float(sim.splits[lk]): sim.splits[lk] = tc
			lk += 1
		if s.x >= D:
			s.finishT = t - DT + (D - xPrev) / maxf(0.1, s.x - xPrev) * DT
			s.done = true; sim.finished += 1
			if sim.winnerT == null: sim.winnerT = s.finishT
	while sim.lapN < sim.marks.size() and sim.splits[sim.lapN] != null: sim.lapN += 1
	if sim.step % 2 == 1: HSSkills.step(sim, order, DT * 2.0)
	for s: Runner in st:
		if s.done or s.passive == null: continue
		if not s.passiveShown and D - s.x <= straight:
			s.passiveShown = true
			for id in s.passive: fire(sim, s, id)
		if s.jiyuMove and t > 8 and t < 8.5: fire(sim, s, "jiyu")
	if not sim.check and order.size() and order[0].x >= sim.checkAt:
		var verdict := pace_verdict(sim.paceF)
		sim.check = { t = t, at = sim.checkAt, verdict = verdict, lead = order[0].i } # lead＝チェックポイントを先頭で通った馬（幻惑逃げ）
		if opts.get("frames"): say(sim, t, "%sm通過は%s秒。%sです。" % [HSU.num(sim.checkAt), HSMath.to_fixed(t, 1), verdict], "pace")
	# 進路：前から順に、近くの馬と重ならない一番内の位置
	var live := by_x(sim)
	var me: Runner = st[sim.me] if c else null
	if me:
		# 押したらすぐ動き出し（毎秒 LANE.v 進路）、横に馬がいれば止まる（ぶつかった印 c.bumpT・c.bumpSide。振動と揺れに使う）
		# 馬群さばき：横に動くのが速く、横の馬に止められにくい
		var lv: float = FAN.v / (2.0 * DT) if me.x < FAN.x and not c.steered else LANE.v * (SABAKI.v if me.sabaki else 1.0)
		var ldx: float = SABAKI.dx if me.sabaki else LANE.dx
		var lgap: float = SABAKI.gap if me.sabaki else LANE.gap
		var want := HSU.clamp(c.lane - me.lane, -lv * DT, lv * DT)
		if absf(want) > 1e-6:
			var nl := me.lane + want; var dir := signf(want)
			var hit := false
			for o: Runner in st:
				if o != me and not o.done and absf(o.x - me.x) < ldx and dir * (o.lane - me.lane) > 0 and absf(o.lane - nl) < lgap: hit = true; break
			if hit:
				if t - (-9.0 if c.bumpT == null else c.bumpT) > 0.4:
					c.bumpT = t; c.bumpSide = dir
				c.lane = HSU.clamp(HSMath.round_js(me.lane - dir * 0.49), 0.0, 12.0) # 押した向きの注文は取り消す（ぶつかった所で止まる）
			else: me.lane = nl
		me.laneT = c.lane
	var near: Array = []
	if sim.step % 2 == 0:
		for k in live.size():
			var s: Runner = live[k]
			if s == me: continue
			var want := 0.0
			var inStraight := D - s.x < straight
			if inStraight and (s.h.style == "差し" or s.h.style == "追込"): want = 6.0 if (s.trig and s.trig.has("oosoto")) else 2.0 + (s.i % 4)
			want += s.driftLane
			near.clear()
			var q := k - 1
			while q >= 0 and live[q].x - s.x < 2.6:
				near.append(me.lane if live[q] == me else live[q].laneT); q -= 1
			if me and me.x < s.x and s.x - me.x < 2.6: near.append(me.lane)
			var lane := want
			for n in 20:
				var hit := false
				for nq in near:
					if absf(nq - lane) < 0.9: hit = true; break
				if not hit: break
				lane += 1.0
			s.laneT = lane
			var dl := (s.laneT - s.lane) * 0.16
			s.lane += HSU.clamp(dl, -FAN.v, FAN.v) if s.x < FAN.x else dl
	if opts.get("frames") and sim.step % 5 == 0: commentary(sim)
	if opts.get("frames") and sim.step % REC_EVERY == 0:
		var p: Array = []
		for s: Runner in st: p.append([HSMath.round_js(s.x * 10.0) / 10.0, HSMath.round_js(s.lane * 100.0) / 100.0, HSMath.round_js(s.v * 100.0) / 100.0])
		sim.frames.append({ t = t, p = p })
	if sim.finished >= st.size() or t >= 400 or (sim.winnerT != null and t > sim.winnerT + 25): sim.over = true
	if c and st[sim.me].done and t > st[sim.me].finishT + 4: sim.over = true
	return sim.over

static func commentary(sim: Sim) -> void:
	var st := sim.st; var D := sim.D; var straight := sim.straight; var t := sim.t; var k := sim.talk
	var ord := HSU.stable_sort(st, func(a, b): return a.x > b.x)
	var lead: Runner = ord[0]
	if t > 6 and t < 14 and not k.lastLeader:
		k.lastLeader = lead; say(sim, t, "ハナを切ったのは%s。" % lead.h.name, "lead")
	var R := D - lead.x
	if not k.mid and lead.x > D * 0.5 and D >= 1600:
		k.mid = true
		var names: Array = []
		for s in ord.slice(0, 3): names.append(s.h.name)
		say(sim, t, "中間点、前は%s。" % "、".join(names), "mid")
		var pl := -1
		for i in ord.size():
			if ord[i].h.get("owner") == "P" or ord[i].me: pl = i; break
		if pl >= 0: say(sim, t + 1.5, "%sは%d番手あたり。" % [ord[pl].h.name, pl + 1], "mine")
	if not k.corner and R <= straight + 350:
		k.corner = true; say(sim, t, "3コーナーから4コーナーへ。各馬が動き出す！", "corner")
	if not k.straight and R <= straight:
		k.straight = true; say(sim, t, "最後の直線！ 先頭は%s！" % lead.h.name, "straight")
	if k.lastLeader and lead != k.lastLeader and R < straight and R > 30: say(sim, t, "%sが先頭に立つ！" % lead.h.name, "lead")
	if not k.f400 and R <= 400 and R > 0:
		k.f400 = true
		var second = ord[1] if ord.size() > 1 else null
		if second and lead.x - second.x > 6: say(sim, t, "%s、リードは%s馬身！" % [lead.h.name, HSU.num(HSMath.round_js((lead.x - second.x) / LEN))], "mid")
		elif second: say(sim, t, "%sと%sの叩き合い！" % [lead.h.name, second.h.name], "duel")
	if not k.f200 and R <= 200 and R > 0:
		k.f200 = true
		var closers := HSU.stable_sort(ord.slice(1, 6), func(a, b): return a.v > b.v)
		var closer = closers[0] if closers.size() else null
		if closer and closer.v > lead.v + 0.4: say(sim, t, "外から%sが猛然と追い込む！" % closer.h.name, "duel")
	k.lastLeader = lead if k.lastLeader else k.lastLeader

# ラップの区切り（JS の S.lapMarks）：ゴールから200mごと。最初は端数。ゴールそのものは入れない
static func lap_marks(D: float) -> Array:
	var out: Array = []
	var m := fmod(D, 200.0)
	if m < 1.0: m = 200.0
	while m < D - 0.5:
		out.append(m)
		m += 200.0
	return out

# 結果をまとめる
static func _finish_gd(sim: Sim) -> Dictionary:
	var st := sim.st; var D := sim.D; var opts := sim.opts; var events := sim.events
	var t := sim.t
	for s: Runner in st:
		if not s.done:
			s.finishT = t + (D - s.x) / HSU.mx(5.0, s.v); s.done = true
	if opts.get("frames"):
		var p: Array = []
		for s: Runner in st: p.append([s.x, s.lane, s.v])
		sim.frames.append({ t = t + DT, p = p })
	var ranked := HSU.stable_sort(st, func(a, b): return a.finishT < b.finishT)
	var winner: Runner = ranked[0]
	var results: Array = []
	for k in ranked.size():
		var s: Runner = ranked[k]
		var lengths := 0.0
		if k > 0: lengths = (s.finishT - ranked[k - 1].finishT) * s.vc / LEN
		results.append({ pos = k + 1, num = s.r.get("num"), frame = s.r.get("frame"), horse = s.h, jockey = s.r.get("jockey"), weight = s.r.get("weight"),
			time = s.finishT, margin = "" if k == 0 else HSU.margin(lengths), lengths = lengths, last3f = s.finishT - s.t600 if s.t600 != null else null,
			late = s.late, blocked = s.blockedOnce and s.blocked != 0, power = s.A, endE = s.E, rider = HSU.or_(s.r.get("rider"), null) })
	var win: Dictionary = results[0]
	var second = results[1] if results.size() > 1 else null
	var finishText := "%s、1着でゴールイン！" % win.horse.name
	if second and second.lengths < 0.1: finishText = "%sと%s、並んでゴール！ 写真判定……%sがハナ差で制した！" % [win.horse.name, second.horse.name, win.horse.name]
	elif second and second.lengths >= 5: finishText = "%s、圧勝！ %s馬身突き放してゴール！" % [win.horse.name, second.margin]
	say(sim, winner.finishT, finishText, "finish")
	sim.events = HSU.stable_sort(events, func(a, b): return a.t < b.t)
	var splits: Array = []
	for x in sim.splits:
		if x == null: break
		splits.append(x)
	return { results = results, events = sim.events, frames = sim.frames if opts.get("frames") else null, D = D, straight = sim.straight, lap = sim.geo.get("lap"), winnerTime = win.time, splits = splits }
