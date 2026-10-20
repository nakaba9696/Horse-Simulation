# 馬のデータの形と、成長・能力・状態の計算（js/core/horse.js の HS.Horse と同じ）。馬は Dictionary（JS の馬のオブジェクトと同じ項目名）。
# 数は JS と同じく小数（float）で持つ（整数どうしの割り算が切り捨てにならないように）
class_name HSHorse

const COATS := ["鹿毛", "黒鹿毛", "青鹿毛", "青毛", "栗毛", "栃栗毛", "芦毛", "白毛"]
const _COAT_W := { "鹿毛": 40.0, "黒鹿毛": 20.0, "青鹿毛": 7.0, "青毛": 2.0, "栗毛": 26.0, "栃栗毛": 4.0 }
# 毛色を決める（両親が芦毛なら芦毛が出やすい）
static func pick_coat(rng: HSRng, sire_coat: Variant = null, dam_coat: Variant = null) -> String:
	if (sire_coat == "芦毛" or dam_coat == "芦毛") and rng.chance(0.5): return "芦毛"
	if (sire_coat == "白毛" or dam_coat == "白毛") and rng.chance(0.4): return "白毛"
	return rng.weighted(["鹿毛", "黒鹿毛", "青鹿毛", "青毛", "栗毛", "栃栗毛"], func(c): return _COAT_W[c])

const STATS := ["spd", "sta", "dspd", "dsta", "guts", "mind", "slope"]
const STAT_LABEL := { spd = "芝スピード", sta = "芝スタミナ", dspd = "ダートスピード", dsta = "ダートスタミナ", guts = "根性", mind = "気性", slope = "坂" }
const STAT_SHORT := { spd = "芝SP", sta = "芝ST", dspd = "ダSP", dsta = "ダST", guts = "根性", mind = "気性", slope = "坂" }
const STAT_NOTE := { spd = "芝での道中の速さ", sta = "芝で長く脚を保つ力", dspd = "ダートでの道中の速さ", dsta = "ダートで長く脚を保つ力", guts = "競り合いで抜かせない力", mind = "落ち着きと賢さ。出遅れ・掛かり・位置取り", slope = "坂での踏ん張り。弱いと坂で大きく脚がなくなる" }

# 芝・ダートの向き（apt.turf・apt.dirt、100＝得意）から、苦手な側のスピード・スタミナを下げて分ける
static func split_surface(h: Dictionary, rng: HSRng = null) -> Dictionary:
	var p: Dictionary = h.pot; var a: Dictionary = h.apt
	var top := HSU.mx(a.turf, a.dirt)
	var t: float = (a.turf - top) * 0.33; var d: float = (a.dirt - top) * 0.33
	var n1 := rng.normal(0.0, 1.5) if rng else 0.0
	p.dspd = HSU.clamp(p.spd + d + n1, 20.0, 120.0)
	var n2 := rng.normal(0.0, 1.5) if rng else 0.0
	p.dsta = HSU.clamp(p.sta + d + n2, 20.0, 120.0)
	p.spd = HSU.clamp(p.spd + t, 20.0, 120.0); p.sta = HSU.clamp(p.sta + t, 20.0, 120.0)
	return h
# 能力から芝・ダートの向き（表示とAIの出走の目安）を出し直す
static func sync_apt(h: Dictionary) -> Dictionary:
	var p: Dictionary = h.pot
	if p.get("dspd") == null: return h
	var T: float = (p.spd + p.sta) / 2.0; var D: float = (p.dspd + p.dsta) / 2.0; var top := HSU.mx(T, D)
	if not h.get("apt"): h.apt = { heavy = 50.0 }
	h.apt.turf = HSU.clamp(HSMath.round_js(100.0 + (T - top) * 3.0), 20.0, 100.0)
	h.apt.dirt = HSU.clamp(HSMath.round_js(100.0 + (D - top) * 3.0), 20.0, 100.0)
	return h
# その馬場でのスピード・スタミナ
static func on_surface(c: Dictionary, surface: Variant) -> Dictionary:
	if surface == "ダ":
		return { spd = c.dspd if c.get("dspd") != null else c.spd, sta = c.dsta if c.get("dsta") != null else c.sta }
	return { spd = c.spd, sta = c.sta }
static func kire_label(k: Variant) -> String:
	return "切れ" + HSU.num(HSU.clamp(HSMath.round_js(HSU.or_(k, 4.0)), 1.0, 8.0))

# 特殊能力。bad＝弱み
const SKILLS := {
	big = { label = "大舞台", note = "G1で力を出す" },
	fresh = { label = "鉄砲駆け", note = "長期休みでも気分が悪くならない（休み明けでも走る）" },
	tataki = { label = "叩き良化", note = "休み明けは割り引き。使われて良くなる" },
	left = { label = "左回り○", note = "左回りのコースで走る" },
	right = { label = "右回り○", note = "右回りのコースで走る" },
	small = { label = "小回り○", note = "直線の短いコースが得意" },
	long = { label = "直線巧者", note = "長い直線で伸びる" },
	summer = { label = "夏馬", note = "6〜8月のレースで走る" },
	winter = { label = "冬馬", note = "12〜2月のレースで走る" },
	hipace = { label = "ハイペース○", note = "流れが速いほど良い" },
	slowpace = { label = "スローペース○", note = "上がりの勝負に強い" },
	oonige = { label = "大逃げ", note = "後ろを大きく離して逃げる" },
	longspurt = { label = "ロングスパート", note = "早めに動いて長く脚を使う" },
	jiyu = { label = "脚質自在", style = true, note = "脚質の一つとして見せる（特殊能力の並びには出さない）。流れを見て位置を変えられる。スローなら前、ハイなら後ろで運び、本来と違う位置でも折り合いを欠きにくい" },
	inner = { label = "内枠○", note = "内の枠で走る" },
	outer = { label = "外枠○", note = "外の枠（7・8枠）で走る" },
	mud = { label = "道悪○", note = "重・不良の馬場で力を出す" },
	travel = { label = "海外○", note = "海外の大レースで力を出す" },
	homebody = { label = "海外×", note = "海外では力を出しきれない", bad = true },
	deokure = { label = "出遅れ癖", note = "ゲートの出が悪い", bad = true },
	kakari = { label = "掛かり癖", note = "折り合いを欠きやすい", bad = true },
	sora = { label = "ソラ癖", note = "先頭に立つと気を抜く", bad = true },
	sunaB = { label = "砂かぶり×", note = "ダートで前の馬の砂をかぶると嫌がり、脚を使う", bad = true },
	leftB = { label = "左回り×", note = "左回りのコースでは力を出しきれない", bad = true },
	rightB = { label = "右回り×", note = "右回りのコースでは力を出しきれない", bad = true },
}
# 脚質の見せ方：脚質自在の馬は「先行・自在」のように出す（持ち主の決定 2026-10-17）
static func style_text(h: Variant) -> String:
	if not h: return ""
	return str(HSU.or_(h.get("style"), "")) + ("・自在" if has(h, "jiyu") else "")
# 特殊能力の並びに出すもの（脚質自在は脚質の側で見せる）
static func shown_skills(h: Dictionary) -> Array:
	return HSU.or_(h.get("skills"), []).filter(func(x): return SKILLS.has(x) and not SKILLS[x].get("style"))
static func has(h: Dictionary, id: String) -> bool:
	var sk = h.get("skills")
	return sk != null and sk.has(id)

# 前の版の能力（瞬発力・パワー・賢さ・気性）を今の形に直す
static func from_legacy(h: Dictionary) -> Dictionary:
	var p = h.get("pot")
	if p and (p.get("kick") != null or p.get("pow") != null or p.get("wise") != null):
		if h.get("kire") == null and p.get("kick") != null: h.kire = HSU.clamp(HSMath.round_js(4.5 + (p.kick - HSU.or_(p.get("spd"), p.kick)) / 3.0), 1.0, 8.0)
		if p.get("mind") == null: p.mind = ((p.wise if p.get("wise") != null else 70.0) + (h.temper if h.get("temper") != null else 60.0)) / 2.0
		if p.get("slope") == null: p.slope = p.pow if p.get("pow") != null else HSU.or_(p.get("spd"), 70.0)
		p.erase("kick"); p.erase("pow"); p.erase("wise")
	var b = h.get("bonus")
	if b and (b.get("kick") != null or b.get("pow") != null or b.get("wise") != null):
		if b.get("wise") != null: b.mind = HSU.or_(b.get("mind"), 0.0) + b.wise
		if b.get("pow") != null: b.slope = HSU.or_(b.get("slope"), 0.0) + b.pow
		b.erase("kick"); b.erase("pow"); b.erase("wise")
	h.erase("temper")
	if h.get("gr"):
		var GV := { "SS": 97.0, "S": 92.0, "A+": 87.0, "A": 82.0, "B+": 77.0, "B": 72.0, "C+": 67.0, "C": 62.0, "D": 57.0, "E": 50.0 }
		for k in ["guts", "mind", "slope"]:
			if p and p.get(k) == null and GV.get(h.gr.get(k)): p[k] = GV[h.gr[k]]
		if h.get("health") == null and GV.get(h.gr.get("health")): h.health = GV[h.gr.health]
		if h.get("apt") and h.apt.get("heavy") == null and GV.get(h.gr.get("heavy")): h.apt.heavy = GV[h.gr.heavy]
		h.erase("gr")
	if p and p.get("dspd") == null and h.get("apt") and h.apt.get("turf") != null: split_surface(h)
	return h

const STYLES := ["逃げ", "先行", "差し", "追込"]
const GROWTHS := ["早熟", "早め", "普通", "遅め", "晩成"]
const PEAK := { "早熟": [2.6, 3.6], "早め": [3.0, 4.2], "普通": [3.5, 5.0], "遅め": [4.0, 5.8], "晩成": [4.6, 6.8] }

# 週の通し番号（年×48＋月・週）。1か月4週
static func week_index(year: float, month: float, week: float) -> float:
	return year * 48.0 + (month - 1.0) * 4.0 + (week - 1.0)
# 満年齢を小数で（4月生まれとみなす）
static func age_at(horse: Dictionary, w_idx: float) -> float:
	return (w_idx - (horse.born * 48.0 + 12.0)) / 48.0

# 成長の度合い（0〜1）。ピーク前は伸び、ピーク後はゆっくり衰える
static func growth_factor(horse: Dictionary, w_idx: float) -> float:
	var age := age_at(horse, w_idx)
	var p: Array = PEAK.get(horse.get("growth"), PEAK["普通"])
	var shift: float = HSU.or_(horse.get("peakShift"), 0.0)
	var ps: float = p[0] + shift; var pe: float = p[1] + shift
	if age < ps:
		var t := (age - 1.4) / (ps - 1.4)
		return 0.62 + 0.38 * HSU.smooth(t)
	if age <= pe: return 1.0
	var d := age - pe
	return HSU.mx(0.55, 1.0 - 0.04 * d - 0.02 * d * d)

# いまの能力値（成長×素質＋調教の上積み）
static func cur(horse: Dictionary, w_idx: Variant) -> Dictionary:
	var g := 1.0 if (HSU.truthy(horse.get("filler")) or HSU.truthy(horse.get("legend"))) else growth_factor(horse, w_idx)
	var out := {}
	var bonus = horse.get("bonus")
	for k in STATS:
		out[k] = horse.pot[k] * g + float(HSU.or_(bonus.get(k) if bonus else null, 0.0))
	return out
# 総合力（表示や人気の目安）
static func overall(stats: Dictionary) -> float:
	var turf: float = stats.spd * 0.35 + stats.sta * 0.25
	var dirt: float = stats.dspd * 0.35 + stats.dsta * 0.25 if stats.get("dspd") != null else turf
	return HSU.mx(turf, dirt) + stats.guts * 0.15 + stats.mind * 0.12 + stats.slope * 0.13

# 見立て（プレイヤーに見える値）。走るほど・調教するほど正確になる
static func estimate(horse: Dictionary, w_idx: float, key: String) -> Variant:
	var real: float = cur(horse, w_idx)[key]
	if horse.get("owner") != "P" and not HSU.truthy(horse.get("hist")): return null
	var rng := HSU.hash_rng(str(horse.id) + ":" + key)
	var bias := rng.normal(0.0, 7.0)
	var unc := HSU.mx(0.12, 1.0 - float(HSU.or_(horse.get("starts"), 0.0)) * 0.12 - float(HSU.or_(horse.get("trainWeeks"), 0.0)) * 0.008)
	return real + bias * unc

# クラス（勝ち数で決める簡略版）
static func class_of(horse: Dictionary) -> String:
	if HSU.or_(horse.get("gradedWins"), []).size() > 0: return "OP"
	var w: float = HSU.or_(horse.get("wins"), 0.0)
	if w == 0: return "maiden"
	if w == 1: return "C1"
	if w == 2: return "C2"
	if w == 3: return "C3"
	return "OP"
static func class_name_of(cls: String, year: float) -> String:
	if year < 1984: return { maiden = "未勝利", C1 = "下級条件", C2 = "中級条件", C3 = "上級条件", OP = "オープン" }.get(cls, cls)
	var old := year < 2019
	return { maiden = "未勝利", C1 = "500万下" if old else "1勝クラス", C2 = "1000万下" if old else "2勝クラス", C3 = "1600万下" if old else "3勝クラス", OP = "オープン" }.get(cls, cls)
const CLASS_RANK := { maiden = 0, C1 = 1, C2 = 2, C3 = 3, OP = 4 }

# 距離適性の幅を表示に
static func dist_label(mn: float, mx: float) -> String:
	var mid := (mn + mx) / 2.0
	var kind := "中距離"
	if mx <= 1400: kind = "短距離"
	elif mid <= 1700: kind = "マイル"
	elif mn >= 3000: kind = "超長距離"
	elif mn >= 2400: kind = "長距離"
	elif mx >= 3000: kind = "中長距離"
	return "%s（%s〜%sm）" % [kind, HSU.num(mn), HSU.num(mx)]

const LEGEND_MUL := 1.035
# 史実馬のデータから、能力の素質を作る（名前ごとに毎回同じ）
static func from_historic(d: Dictionary, id: Variant) -> Dictionary:
	var rng := HSU.hash_rng("hist:" + d.name)
	var r: float = d.rating
	var dirt: bool = d.get("surface") == "ダ"; var both: bool = d.get("surface") == "芝ダ"
	var longH: bool = d.distMax >= 2400 if d.get("distMax") != null else false
	var sprint: bool = d.distMax <= 1400 if d.get("distMax") != null else false
	var st: String = d.style if STYLES.has(d.get("style")) else "先行"
	var pot := {}
	pot.spd = r + rng.normal(0.0, 2.0) + (3.0 if sprint else 0.0) + (1.0 if st == "逃げ" else 0.0)
	pot.sta = r + rng.normal(0.0, 2.0) + (3.0 if longH else 0.0) - (6.0 if sprint else 0.0)
	pot.guts = r - 1.0 + rng.normal(0.0, 5.0)
	pot.mind = r - 6.0 + rng.normal(0.0, 7.0)
	pot.slope = r - 5.0 + rng.normal(0.0, 5.0) + (3.0 if dirt else 0.0)
	for k in pot: pot[k] = HSU.clamp(pot[k], 30.0, 106.0)
	if d.get("tier") == "legend":
		for k in pot: pot[k] = HSU.clamp(pot[k] * LEGEND_MUL, 30.0, 112.0)
	var custom = null
	if d.get("pot"):
		custom = from_legacy({ pot = d.pot.duplicate(), temper = d.get("temper") }).pot
		for k in STATS:
			if custom.get(k) != null: pot[k] = HSU.clamp(custom[k], 20.0, 120.0)
	elif d.get("temper") != null:
		pot.mind = (pot.mind + d.temper) / 2.0
	var growth: String = d.growth if GROWTHS.has(d.get("growth")) else "普通"
	var kire0: float = { "逃げ": 3.0, "先行": 4.0, "差し": 6.0, "追込": 6.0 }[st] + rng.int_(-1, 1) - (1.0 if dirt else 0.0) + (0.0 if sprint else (-1.0 if longH and st != "追込" else 0.0))
	var h := {}
	h.id = id; h.name = d.name; h.sex = "牡" if d.get("sex") == "セ" else d.get("sex"); h.gelding = d.get("sex") == "セ"; h.born = d.born
	h.coat = d.coat if COATS.has(d.get("coat")) else pick_coat(rng)
	h.sire = HSU.or_(d.get("sire"), null); h.dam = HSU.or_(d.get("dam"), null); h.damsire = HSU.or_(d.get("damsire"), null)
	h.hist = true; h.owner = "AI"; h.loc = "farm"
	h.pot = pot
	var apt := {}
	apt.turf = 45.0 if dirt else (85.0 if both else 100.0)
	apt.dirt = 100.0 if dirt else (90.0 if both else 40.0 + rng.int_(0, 15))
	apt.heavy = HSU.clamp(66.0 + rng.normal(0.0, 12.0), 20.0, 100.0)
	h.apt = apt
	h.distMin = HSU.or_(d.get("distMin"), 1600.0); h.distMax = HSU.or_(d.get("distMax"), 2400.0)
	h.style = st; h.kire = HSU.clamp(d.kire if d.get("kire") != null else kire0, 1.0, 8.0)
	h.growth = growth; h.peakShift = 0.0
	h.health = d.health if d.get("health") != null else HSU.clamp(75.0 + rng.normal(0.0, 9.0), 30.0, 100.0)
	if d.get("skills") is Array:
		var sk: Array = []
		for x in d.skills:
			if SKILLS.has(x): sk.append(x)
		h.skills = sk
	else:
		h.skills = hist_skills(d, rng)
	h.bonus = {}; h.fatigue = 0.0
	h.wins = 0.0; h.starts = 0.0; h.w2 = 0.0; h.w3 = 0.0; h.earn = 0.0; h.prize = 0.0; h.gradedWins = []; h.results = []
	h.restUntil = 0.0; h.retireYear = HSU.or_(d.get("retire"), d.born + 5.0)
	for k in ["turf", "dirt", "heavy"]:
		if d.get(k) != null: h.apt[k] = d[k]
	if custom and custom.get("dspd") != null and custom.get("dsta") != null: sync_apt(h)
	else: split_surface(h, rng)
	if not (custom and custom.get("mind") != null) and (h.skills.has("kakari") or h.skills.has("deokure")): pot.mind = HSU.clamp(pot.mind - 14.0, 20.0, 120.0)
	if not (d.get("skills") is Array): hist_skills2(d, h)
	return h

# 史実馬の特殊能力を、史実の勝ち鞍（競馬場・時期・格）から見立てる
static var _race_by_name: Dictionary = {}
static func win_races(d: Dictionary) -> Array:
	if _race_by_name.is_empty():
		for r in HSData.d().get("races", []):
			if not _race_by_name.has(r.name): _race_by_name[r.name] = []
			_race_by_name[r.name].append(r)
	var out: Array = []
	for w in HSU.or_(d.get("wins"), []):
		var y := float(w.substr(0, 4)); var n: String = w.substr(4)
		for x in _race_by_name.get(n, []):
			if x.from <= y and y <= float(HSU.or_(x.get("to"), 9999.0)):
				out.append(x); break
	return out

static func _geo(r: Dictionary) -> Variant:
	var c = HSData.d().get("courses", {}).get(r.course)
	if not c: return null
	return HSU.or_(c.get("dirt"), c.get("turf")) if r.surface == "ダ" else HSU.or_(c.get("turf"), c.get("dirt"))

static func hist_skills(d: Dictionary, rng: HSRng) -> Array:
	var ws := win_races(d)
	var C: Dictionary = HSData.d().get("courses", {})
	var sk: Array = []
	var n := ws.size()
	var cnt := func(f: Callable) -> int:
		var c := 0
		for r in ws:
			if f.call(r): c += 1
		return c
	var dir_of := func(r): return C.get(r.course, {}).get("dir")
	var g1: int = cnt.call(func(r): return r.get("grade") == "G1")
	if g1 >= 3 or (g1 >= 2 and d.rating >= 95): sk.append("big")
	if n >= 3:
		var left: int = cnt.call(func(r): return dir_of.call(r) == "左")
		var right: int = cnt.call(func(r): return dir_of.call(r) == "右")
		if left >= 3 and right == 0: sk.append("left")
		elif right >= 3 and left == 0: sk.append("right")
		if left >= 4 and right == 0: sk.append("rightB")
		elif right >= 4 and left == 0: sk.append("leftB")
		var mx := -HSMath.INF; var mn := HSMath.INF
		for r in ws:
			mx = HSU.mx(mx, r.dist); mn = HSU.mn(mn, r.dist)
		if mx - mn >= 800: sk.append("jiyu")
		var st_of := func(r):
			var g = _geo(r)
			return g.get("straight") if g else null
		var short: int = cnt.call(func(r):
			var s = st_of.call(r)
			return s != null and s < 330)
		var longS: int = cnt.call(func(r):
			var s = st_of.call(r)
			return s != null and s >= 450)
		if short >= 2 and float(short) / n >= 0.6: sk.append("small")
		elif longS >= 3 and float(longS) / n >= 0.7: sk.append("long")
	if n >= 2:
		var sum_: int = cnt.call(func(r): return r.month >= 6 and r.month <= 8)
		var win: int = cnt.call(func(r): return r.month == 12 or r.month <= 2)
		if sum_ >= 2 and float(sum_) / n >= 0.5: sk.append("summer")
		elif win >= 2 and float(win) / n >= 0.5: sk.append("winter")
	if not HSData.is_foreign(d) and cnt.call(func(r): return r.get("region") == "海外") >= 1: sk.append("travel")
	if sk.size() < 2 and rng.chance(0.25):
		var pool: Array
		if d.get("style") == "逃げ": pool = ["hipace"]
		elif d.get("style") == "先行": pool = ["fresh", "tataki"]
		else: pool = ["longspurt", "slowpace", "hipace", "tataki", "fresh"]
		var x = rng.pick(pool)
		if not sk.has(x): sk.append(x)
	if rng.chance(0.06): sk.append(rng.pick(["deokure", "kakari", "sora"]))
	if (d.get("style") == "逃げ" or d.get("style") == "先行") and cnt.call(func(r): return r.surface == "ダ") >= 1 and rng.chance(0.2): sk.append("sunaB")
	return sk

# 架空の馬（モブ・生産馬）の素質を、総合の目安 mean から作る
# あとから足した特性（2026-10-17）。前の見立ての運（hist:名前）の並びを変えないよう、別の運（hist2:名前）を使う
const MUD_HEAVY := 86.0
const OUTER_P := 0.06
static func hist_skills2(d: Dictionary, h: Dictionary) -> void:
	var rng := HSU.hash_rng("hist2:" + d.name)
	if float(HSU.or_(h.apt.get("heavy"), 0.0)) >= MUD_HEAVY: h.skills.append("mud") # 道悪○：道悪の適性がとくに高い馬
	if rng.chance(OUTER_P): h.skills.append("outer") # 外枠○：勝ち鞍からは見えない癖なので、運で少しだけ
static func make_stats(rng: HSRng, mean: float, sd: float) -> Dictionary:
	var pot := {}
	for k in STATS: pot[k] = HSU.clamp(mean + rng.normal(0.0, sd), 20.0, 106.0)
	return pot

# 名前を作る（重ならないように used を見る。used は {名前: true}）
# base：ほかに見る使われている名前の表（書き足さない）
static func make_name(rng: HSRng, used: Variant, foreign: bool = false, base: Variant = null) -> String:
	var P: Dictionary = HSData.d().nameParts
	for i in 40:
		var n: String
		if foreign: n = rng.pick(P.foreignHead) + rng.pick(P.foreignTail)
		else:
			var r := rng.next()
			if r < 0.12: n = rng.pick(P.single)
			else: n = rng.pick(P.head) + rng.pick(P.tail)
		if n.length() <= 9 and not (used != null and used.has(n)) and not (base != null and base.has(n)):
			if used != null: used[n] = true
			return n
	return "名無しの" + str(rng.int_(1000, 9999))

const _STYLE_W := { "逃げ": 1.0, "先行": 3.0, "差し": 3.0, "追込": 1.5 }
# その場限りの出走馬（条件戦・重賞の頭数合わせ）。level＝いまの総合の目安
static func make_filler(rng: HSRng, opts: Dictionary) -> Dictionary:
	var level: float = opts.level; var surface = opts.get("surface"); var dist: float = opts.dist
	var pot := make_stats(rng, level, 4.5)
	var h := {}
	h.id = "f" + str(rng.int_(1, 1e9)); h.name = HSU.or_(opts.get("name"), "")
	h.sex = opts.sex if opts.get("sex") else ("牡" if rng.chance(0.75) else "牝")
	h.born = opts.get("born"); h.coat = pick_coat(rng)
	h.sire = HSU.or_(opts.get("sireName"), null); h.dam = null; h.hist = false; h.owner = "AI"; h.filler = true; h.foreign = HSU.truthy(opts.get("foreign"))
	h.pot = pot
	var apt := {}
	apt.turf = 95.0 + rng.int_(0, 5) if surface == "芝" else 50.0
	apt.dirt = 95.0 + rng.int_(0, 5) if surface == "ダ" else 50.0
	apt.heavy = 30.0 + rng.int_(0, 60)
	h.apt = apt
	h.distMin = HSU.mx(1000.0, dist - 400.0 + rng.int_(0, 2) * 100.0); h.distMax = dist + 200.0 + rng.int_(0, 4) * 100.0
	h.style = rng.weighted(STYLES, func(s): return _STYLE_W[s]); h.kire = float(rng.int_(2, 7)); h.skills = []
	h.growth = "普通"; h.peakShift = 0.0; h.health = 60.0 + rng.int_(0, 30)
	h.bonus = {}; h.fatigue = 0.0
	h.wins = 0.0; h.starts = 0.0; h.w2 = 0.0; h.w3 = 0.0; h.earn = 0.0; h.prize = 0.0; h.gradedWins = []; h.results = []
	return split_surface(h, rng)

# 調教のメニュー。gain＝伸びる能力、fat＝きつさ（負は休ませる＝疲労が余分に抜ける）、course＝時計を出す所
# 調子は無い（持ち主の決定 2026-10-20「調子のパラメータは無し。疲労だけにする」）
# 疲労はレースでだけたまる（HSFatigue）。故障は無い（持ち主の仕様書「故障はなしにする」）
const MENUS := {
	"坂路(強め)": { gain = { spd = 0.3, dspd = 0.3, slope = 0.35 }, fat = 16.0, course = "坂路" },
	"坂路(馬なり)": { gain = { spd = 0.12, dspd = 0.12, slope = 0.15 }, fat = 8.0, course = "坂路" },
	"ウッド(強め)": { gain = { sta = 0.35, spd = 0.2 }, fat = 15.0, course = "ウッド" },
	"ウッド(馬なり)": { gain = { sta = 0.15, spd = 0.1 }, fat = 7.0, course = "ウッド" },
	"併せ馬": { gain = { guts = 0.4, spd = 0.1, dspd = 0.1 }, fat = 17.0, course = "ウッド" },
	"ダート": { gain = { dspd = 0.3, dsta = 0.3, slope = 0.15 }, fat = 10.0, course = "ダート" },
	"プール": { gain = { sta = 0.15, dsta = 0.15 }, fat = 2.0, course = "プール" },
	"ゲート練習": { gain = { mind = 0.4 }, fat = 3.0, course = "ゲート" },
	"軽め": { gain = {}, fat = -6.0, course = "軽め" },
	"休養": { gain = {}, fat = -18.0, course = "休養" },
}
const BONUS_CAP := 8.0

# 1週間の調教。戻り値は調教タイムなどの記録
static func train(horse: Dictionary, menu_name: String, rng: HSRng, w_idx: float) -> Dictionary:
	var m: Dictionary = MENUS.get(menu_name, MENUS["軽め"])
	if not horse.get("bonus"): horse.bonus = {}
	var g := growth_factor(horse, w_idx)
	var growth_room := 1.2 if g < 1.0 else 0.7
	for k in m.gain:
		var c0: float = HSU.or_(horse.bonus.get(k), 0.0)
		var room := HSU.mx(0.0, BONUS_CAP - c0) / BONUS_CAP
		horse.bonus[k] = c0 + m.gain[k] * growth_room * room * (0.6 + rng.next() * 0.8)
	var fat_before: float = HSU.or_(horse.get("fatigue"), 0.0)
	var ease: float = m.fat * (0.8 + rng.next() * 0.4)
	if ease < 0 and fat_before > 0: horse.fatigue = HSU.mx(0.0, fat_before + ease * REST_K)
	horse.trainWeeks = float(HSU.or_(horse.get("trainWeeks"), 0.0)) + 1.0
	var time = null
	var c := cur(horse, w_idx)
	var sp: float = c.dspd if m.course == "ダート" else HSU.mx(c.spd, c.dspd)
	var ability: float = (sp * 2.0 + c.slope) / 3.0 + (float(HSU.or_(horse.get("kire"), 4.0)) - 4.5) * 0.8 - float(HSU.or_(horse.get("fatigue"), 0.0)) * 0.03
	if m.course == "坂路":
		var hard := menu_name.contains("強め")
		var t4 := 58.5 - ability * 0.075 - (1.6 if hard else 0.0) + rng.normal(0.0, 0.4)
		var last := 13.9 - ability * 0.019 - (0.4 if hard else 0.0) + rng.normal(0.0, 0.12)
		time = "坂路 4F %s-%s" % [HSMath.to_fixed(t4, 1), HSMath.to_fixed(last, 1)]
	elif m.course == "ウッド":
		var hard := menu_name.contains("強め") or menu_name == "併せ馬"
		var t6 := 89.5 - ability * 0.11 - (2.4 if hard else 0.0) + rng.normal(0.0, 0.6)
		var last := 13.7 - ability * 0.02 - (0.5 if hard else 0.0) + rng.normal(0.0, 0.12)
		time = "ウッド 6F %s-%s" % [HSMath.to_fixed(t6, 1), HSMath.to_fixed(last, 1)]
	elif m.course == "ダート":
		var t5 := 72.0 - ability * 0.08 + rng.normal(0.0, 0.5)
		time = "ダート 5F %s" % HSMath.to_fixed(t5, 1)
	return { menu = menu_name, time = time }

const REST_K := 0.5   # 休ませるメニュー（fat が負）で、疲労が余分に抜ける割合

# 牧場にいる週：疲労が多めに抜ける（HSFatigue.REC.farm 倍）
static func rest(horse: Dictionary) -> void:
	HSFatigue.weekly(horse, HSFatigue.REC.farm)

# 調教師のコメント（疲労の段階から）
static func comment(horse: Dictionary, _w_idx: float = 0.0) -> String:
	var st := HSFatigue.stage(horse)
	if st >= 4: return "使い詰めで、疲れが抜けきっていません。ここは休ませたいところです。"
	if st >= 3: return "疲れが目立ちます。ここは無理をさせたくありません。"
	if st >= 2: return "少し疲れが残っています。軽めにしておきたいところです。"
	if st >= 1: return "疲れはほとんど抜けました。普段どおり走れます。"
	return "疲れは抜けて、いつでも走れる状態です。"
