# 疲労（js/core/fatigue.js の HS.Fatigue と同じ式・同じ順。持ち主の仕様書 docs/SPEC.md「疲労」。数の表は docs/BALANCE.md の「疲労」）
#   ・疲労（h.fatigue 0〜100）はレースでたまり、毎週、健康の値に応じて抜ける。故障は無い
#   ・レースでたまる量＝(base＋距離)×格×激戦の度合い（着差の小ささ・残った脚の少なさ）。すごい G1 だけ重くする決まりは無い（持ち主の決定 2026-10-20）
#   ・段階に応じた強さの下げは模擬の中（HSSim.FATIGUE・C++ の fatigue_pen）
#   ・国が変わると移動の疲れ。前のレースから1週しか空いていないときは別の国のレースに出られない。GF は疲労も移動もない
class_name HSFatigue

const STAGES := [
	{ label = "万全", color = "#3fb56a" },
	{ label = "軽い疲れ", color = "#c9b23a" },
	{ label = "疲れ", color = "#e8892e" },
	{ label = "疲れが濃い", color = "#8a5a32" },
	{ label = "使いすぎ", color = "#8c8c8c" },
]
const GAIN := { base = 8.0, per100 = 0.7 }
const GRADE := { G1 = 1.2, G2 = 1.05, G3 = 0.95, OP = 0.85, other = 0.8 }
const SEV := { lo = 0.6, close = 0.4, spent = 0.4, winLen = 3.0, loseLen = 4.0, full = 0.25 }
const REC := { base = 5.0, k = 0.2, min = 2.0, farm = 2.0 }
const TRAVEL := { near = 4.0, far = 8.0 }
const MIN_GAP := 2.0
const WHY := "移動が間に合わない"

# ---------- 段階 ----------
static func stage_of(fat: float) -> int: return HSSim.fatigue_stage(fat)
static func stage(h: Dictionary, extra: float = 0.0) -> int: return stage_of(float(HSU.or_(h.get("fatigue"), 0.0)) + extra)
static func view(h: Dictionary, extra: float = 0.0) -> Dictionary:
	var i := stage(h, extra)
	var v: Dictionary = STAGES[i].duplicate()
	v.i = i; v.value = HSMath.round_js(float(HSU.or_(h.get("fatigue"), 0.0)) + extra)
	return v

# ---------- 国 ----------
static func country_of(race: Dictionary) -> String:
	if race.get("region") != "海外": return "日"
	return String(HSU.or_(race.get("country"), HSU.or_(HSData.d().courses.get(race.get("course"), {}).get("country"), "外")))
static var _by_name: Variant = null
static var _re_key: RegEx = null
static var _re_cls: RegEx = null
static func country_of_key(key: Variant) -> String:
	if _re_key == null:
		_re_key = RegEx.new(); _re_key.compile("^(\\d+)-(\\d+)-(\\d+)-(.*)$")
		_re_cls = RegEx.new(); _re_cls.compile("^[co]\\d+-\\d+$")   # オープン（o…）と前の版の条件戦（c…）
	var m := _re_key.search(String(HSU.or_(key, "")))
	if m == null or _re_cls.search(m.get_string(4)) != null: return "日"
	if _by_name == null:
		_by_name = {}
		for r in HSData.d().races:
			if not _by_name.has(r.name): _by_name[r.name] = country_of(r)
	return String(_by_name.get(m.get_string(4), "日"))
static func home(h: Dictionary) -> Variant:
	if h.get("foreignTrained"): return h.country if (HSU.truthy(h.get("country")) and h.country != "外") else null
	return "日"
static func where(h: Dictionary) -> Variant: return h.at if HSU.truthy(h.get("at")) else home(h)
static func zone(c: Variant) -> String: return "JP" if c == "日" else HSWorld.zone_of(c)
# このレースへ移るときにたまる疲れ（招待のレースは無し）
static func travel(h: Dictionary, race: Dictionary) -> float:
	if race.get("invite"): return 0.0
	var w = where(h); var c := country_of(race)
	if not HSU.truthy(w) or w == c: return 0.0
	return TRAVEL.near if zone(w) == zone(c) else TRAVEL.far
static func race_w(race: Dictionary) -> float:
	return HSHorse.week_index(float(race.year), float(race.month), HSU.mn(float(race.week), 4.0))
static func _near(wi: float, w2: float, c2: Variant, race: Dictionary) -> bool:
	var d: float = absf(wi - w2)
	return d > 0.0 and d < MIN_GAP and c2 != country_of(race)
# 連闘で別の国へは行けない：前のレース・今週の登録・予約と1週しか離れていない別の国のレースなら理由を返す
static func travel_why(h: Dictionary, race: Dictionary) -> Variant:
	if race.get("invite"): return null
	if race.get("year") == null or race.get("month") == null or race.get("week") == null: return null
	var wi := race_w(race)
	if h.get("lastRaceW") != null and wi > float(h.lastRaceW):
		var w = where(h)
		if HSU.truthy(w) and _near(wi, float(h.lastRaceW), w, race): return WHY
	if h.get("owner") != "P" or not HSU.truthy(h.get("id")): return null
	var G = HSWorld.G
	if G == null: return null
	var ents: Dictionary = HSU.or_(G.get("entries"), {})
	for k in ents:
		var hit := false
		for e in ents[k]:
			if e.horseId == h.id: hit = true; break
		if not hit: continue
		var r = HSWorld.race_by_key(k)
		if r and not r.get("invite") and _near(wi, race_w(r), country_of(r), race): return WHY
	for x in HSU.or_(G.get("reserve"), []):
		if x.id != h.id: continue
		if _near(wi, HSHorse.week_index(x.y, x.m, x.w), "日" if x.get("debut") else country_of_key(x.key), race): return WHY
	return null

# ---------- レースのあと ----------
static func grade_mult(race: Dictionary) -> float:
	if race.get("graded"): return GRADE.get(race.get("grade"), GRADE.G3)
	return GRADE.OP if race.get("cls") == "OP" else GRADE.other
# 激戦の度合い。results＝模擬の結果の着順の並び、k＝その馬の着順−1
static func severity(results: Array, k: int) -> float:
	var res = results[k]
	var close: float
	if k == 0: close = HSU.clamp(1.0 - (float(results[1].lengths) if results.size() > 1 else SEV.winLen) / SEV.winLen, 0.0, 1.0)
	else:
		var behind := 0.0
		for j in range(1, k + 1): behind += float(results[j].lengths)
		close = HSU.clamp(1.0 - behind / SEV.loseLen, 0.0, 1.0)
	var left := HSU.clamp(float(res.endE) / SEV.full, 0.0, 1.0)
	return SEV.lo + SEV.close * close + SEV.spent * (1.0 - left)
static func gain(race: Dictionary, results: Array, k: int) -> float:
	return (GAIN.base + float(race.dist) / 100.0 * GAIN.per100) * grade_mult(race) * severity(results, k)
# レースのあと（GF は呼ばない）：移動の疲れとレースの疲れを足し、いる国を移す
static func after_race(h: Dictionary, race: Dictionary, results: Array, k: int, trav: Variant) -> void:
	h.fatigue = HSU.mn(100.0, float(HSU.or_(h.get("fatigue"), 0.0)) + float(HSU.or_(trav, 0.0)) + gain(race, results, k))
	var c := country_of(race)
	if c == home(h): h.erase("at")
	else: h.at = c

# ---------- 毎週の回復 ----------
static func recover(h: Dictionary) -> float:
	return HSU.mx(REC.min, REC.base + ((float(h.health) if h.get("health") != null else 70.0) - 50.0) * REC.k)
static func weekly(h: Dictionary, mult: float = 1.0) -> void:
	var f = h.get("fatigue")
	if f == null or not (float(f) > 0.0): return
	h.fatigue = HSU.mx(0.0, float(f) - recover(h) * mult)
