# 画面の言語（日本語と英語。持ち主の決定 2026-10-21「言語は日本語と英語にしたい」）。仕組みと用語の表は docs/I18N.md
# - 画面の文は、日本語の文そのものをキーにして英語の表（i18n/text_en.gd の HSTextEn.T）を引く（gettext の msgid と同じ考え方）。
#   日本語のときは何もしないで元の文を返す。英語で表に無い文は元の日本語のまま出し、missing に残す（テストで抜けを見つける）。
# - 数を差し込む文は「%s」「%d」の入った形をキーにする：HSText.t("%d着") % n ではなく HSText.ord(n)、ほかは HSText.t("資金 %s") % [x]
# - 共通の部品（UiTheme.label・title・chip・UiScreen.button・section・stat・toast など）は、受け取った文を auto() で引く。
#   ちょうど表のキーと同じ文なら英語になる（データの名前などキーに無い文はそのまま）
# - データの名前（馬・レース・競馬場・騎手・特殊能力・名鑑）は、データに英語の欄（nameEn・labelEn・noteEn・textEn・mainWinsEn）があれば英語、
#   無ければ日本語を出す。入れ口はこのファイルの horse_name・race_name・course_name・jockey_name・skill_label・skill_note・profile_text・main_wins の1か所だけ
# - 言語は設定（ui/settings_store.gd の cur.lang）で選ぶ。初めての起動は OS の言語（日本語なら日本語、ほかは英語）
class_name HSText
extends RefCounted

const LANGS := ["ja", "en"]
const LANG_NAME := {"ja": "日本語", "en": "English"}

static var lang := "ja"
static var missing := {}   # 英語で表に無かった文（t() に来た日本語の文）→ 回数。テストで空かを見る

static func is_en() -> bool: return lang == "en"

# OS の言語から既定を決める（日本語なら ja、ほかは en）
static func lang_for_locale(loc: String) -> String:
	return "ja" if loc.to_lower().begins_with("ja") else "en"

static func set_lang(l: String) -> void:
	lang = l if l in LANGS else "ja"
	TranslationServer.set_locale(lang)

static func _has_jp(s: String) -> bool:
	for i in s.length():
		var c := s.unicode_at(i)
		if (c >= 0x3040 and c <= 0x30ff) or (c >= 0x4e00 and c <= 0x9fff) or (c >= 0xff01 and c <= 0xff5e and c != 0xff5c): return true
	return false

# 画面の文を引く（キーは日本語の文）。表に無い日本語の文は missing に残す
static func t(s: String) -> String:
	if lang == "ja" or s == "": return s
	var v = HSTextEn.T.get(s)
	if v != null: return v
	if _has_jp(s): missing[s] = int(missing.get(s, 0)) + 1
	return s

# 部品が受け取った文：ちょうどキーと同じなら英語。データの名前などはそのまま（missing に残さない）
static func auto(s: String) -> String:
	if lang == "ja" or s == "": return s
	var v = HSTextEn.T.get(s)
	return v if v != null else s

# 遊びの決まり（godot/core）が組んだ文（ニュース・理由・依頼の文など）を引く。
# まずちょうどのキー、無ければ「%s」「%d」の入ったキーの形に当てはめて、差し込まれた所（馬名・レース名・数）を入れ直す
# 差し込まれた所は、表のキー・レース名・馬名の順に引く。どれにも当たらない日本語の文は missing に残す
static var _pats: Array = []   # [正規表現, キーの日本語の字の数, 英語の形, 差し込みの型の並び]

static func _build_pats() -> void:
	_pats = []
	var spec := RegEx.new()
	spec.compile("%(?:[-0-9.]*)([sdf])")
	for k in HSTextEn.PATTERNS:
		var key := String(k)
		if not HSTextEn.T.has(key): continue
		var parts := spec.search_all(key)
		if parts.is_empty(): continue
		var lit := spec.sub(key, "", true)
		if not _has_jp(lit): continue
		var rx := "^"
		var last := 0
		var kinds: Array = []
		for m in parts:
			rx += _rx_escape(key.substr(last, m.get_start() - last))
			var kd := m.get_string(1)
			kinds.append(kd)
			rx += "(-?[0-9]+(?:\\.[0-9]+)?)" if kd != "s" else "(.*?)"
			last = m.get_end()
		rx += _rx_escape(key.substr(last)) + "$"
		var re := RegEx.new()
		if re.compile(rx) != OK: continue
		_pats.append([re, lit.length(), String(HSTextEn.T[k]), kinds])
	_pats.sort_custom(func(a, b): return a[1] > b[1])

static func _rx_escape(s: String) -> String:
	var out := ""
	for ch in s:
		if "\\^$.|?*+()[]{}".contains(ch): out += "\\" + ch
		elif ch == "\n": out += "\\n"
		else: out += ch
	return out

static var _date_rx: RegEx = null
static var _money_rx: RegEx = null
static var _open_rx: RegEx = null
static var missing_tx := {}   # tx() で当てはまる形が無かった日本語の文（データの名前も入るので、テストは見ない）

static func tx(s: String) -> String:
	if lang == "ja" or s == "": return s
	var v = HSTextEn.T.get(s)
	if v != null: return v
	if not _has_jp(s): return s
	# 「5月2週」「2年目5月4週」の日付は形で引く
	if _date_rx == null:
		_date_rx = RegEx.new()
		_date_rx.compile("^(?:([0-9]+)年目 ?)?([0-9]+)月 ?(?:([0-9]+)週|GF週)$")
	var dm := _date_rx.search(s)
	if dm:
		var wl := week_label(float(dm.get_string(2)), float(dm.get_string(3)) if dm.get_string(3) != "" else 5.0)
		return ("Year %s, %s" % [dm.get_string(1), wl]) if dm.get_string(1) != "" else wl
	var d := _data_name(s)
	if d != s: return d
	if _pats.is_empty(): _build_pats()
	for p in _pats:
		var m: RegExMatch = (p[0] as RegEx).search(s)
		if m == null: continue
		var args: Array = []
		for i in (p[3] as Array).size():
			var g := m.get_string(i + 1)
			if p[3][i] == "d": args.append(int(g))
			elif p[3][i] == "f": args.append(float(g))
			else: args.append(_cap(g))
		return String(p[2]) % args
	missing_tx[s] = int(missing_tx.get(s, 0)) + 1
	return s

# 差し込まれた所：表のキー → お金 → データの名前（レース・馬・競馬場）→「・」でつないだ語（全部引けたときだけ）。無ければそのまま
static func _cap(g: String) -> String:
	var v = HSTextEn.T.get(g)
	if v != null: return v
	if not _has_jp(g): return g
	var d := _data_name(g)
	if d != g: return d
	for sep in ["・", "、"]:
		if g.contains(sep) and g.length() > 1:
			var parts: Array = Array(g.split(sep)).map(func(x): return _cap(String(x)))
			var src: Array = Array(g.split(sep))
			var ok := true
			for i in parts.size():
				if parts[i] == src[i] and _has_jp(String(src[i])): ok = false
			if ok: return t(sep).join(parts)
	return g

# お金（「1億2,345万円」）・名前のあるオープン（「3歳以上オープン（牝）」）・レース・馬・競馬場の名前
static func _data_name(g: String) -> String:
	if _money_rx == null:
		_money_rx = RegEx.new()
		_money_rx.compile("^(-?)(?:([0-9,]+)億)?(?:([0-9,]+)万)?円$")
		_open_rx = RegEx.new()
		_open_rx.compile("^(2歳|3歳|3歳以上|4歳以上)(オープン|リステッド)(（牝）)?$")
	var mm := _money_rx.search(g)
	if mm and (mm.get_string(2) != "" or mm.get_string(3) != ""):
		var man := float(mm.get_string(2).replace(",", "")) * 10000.0 + float(mm.get_string(3).replace(",", ""))
		return money(-man if mm.get_string(1) == "-" else man)
	var om := _open_rx.search(g)
	if om:
		return "%s%s %s" % [t(om.get_string(1)), " " + t("牝馬") if om.get_string(3) != "" else "", "Listed" if om.get_string(2) == "リステッド" else "Open"]
	var r = _index("race").get(g)
	if r != null: return r
	var h = _index("horse").get(g)
	if h != null: return h
	var c = HSData.d().get("courses", {}).get(g)
	if c is Dictionary and c.get("nameEn"): return String(c.nameEn)
	return g

# 「・」でつないだ語を1つずつ引く（「差し・自在」→「Closer · Versatile」）
static func tparts(s: String, sep := "・") -> String:
	if lang == "ja" or s == "": return s
	return t(sep).join(Array(s.split(sep)).map(func(x): return tx(String(x))))

# 脚質（HSHorse.style_text の形）
static func style_text(h) -> String:
	return tparts(HSHorse.style_text(h))

# 狭い所に出す短い形（ホームのコマンドの札など。HSTextEn.SHORT。無ければ t）
static func short(s: String) -> String:
	if lang == "ja": return s
	var v = HSTextEn.SHORT.get(s)
	return v if v != null else t(s)

# 並びの文を全部引く（["芝", "ダート"] → ["Turf", "Dirt"]）
static func ts(arr: Array) -> Array:
	return arr.map(func(x): return t(String(x)))

# ---------- 数・お金・日付 ----------
# 着順：日本語「3着」、英語「3rd」
static func ord(n: int) -> String:
	if lang == "ja": return "%d着" % n
	return ordinal(n)

static func ordinal(n: int) -> String:
	var m := n % 100
	var suf := "th"
	if m < 11 or m > 13:
		match n % 10:
			1: suf = "st"
			2: suf = "nd"
			3: suf = "rd"
	return "%d%s" % [n, suf]

# お金（万円の数）。日本語は HSU.money のまま（「1億2,345万円」）、英語は ¥ と3桁区切り（「¥123,450,000」）
static func money(man: float) -> String:
	if lang == "ja": return HSU.money(man)
	var neg := man < 0.0
	var v := int(HSMath.round_js(absf(man)))
	return ("-" if neg else "") + "¥" + HSU.locale_int(v * 10000)

const MONTHS := ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
static func month(m: float) -> String:
	if lang == "ja": return "%s月" % HSU.num(m)
	return MONTHS[clampi(int(m) - 1, 0, 11)]

# 月と週（HSWorld.week_label と同じ形。英語は「May W4」・12月の GF の週は「Dec GF Week」）
static func week_label(m: float, w: float) -> String:
	if lang == "ja": return HSWorld.week_label(m, w)
	if w > 4: return "%s GF Week" % month(m)
	return "%s W%s" % [month(m), HSU.num(w)]

# 年（年代なしのゲームでは「n年目」。英語は「Year n」）
static func year_label(y: float) -> String:
	if lang == "ja": return HSWorld.y_label(y)
	var G = HSWorld.G
	if G and G.get("eraless"): return "Year %s" % HSU.num(y - G.startYear + 1.0)
	return HSU.num(y)

# 年と月と週（HSWorld.date_label の形）
static func date_label(y: float, m: float, w: float) -> String:
	if lang == "ja": return HSWorld.date_label(y, m, w)
	if w > 4: return "%s, %s Grand Festival" % [year_label(y), month(m)]
	return "%s, %s W%s" % [year_label(y), month(m), HSU.num(w)]

# n年目（UiFlow.year_n の数）
static func year_n(n: int) -> String:
	return "%d年目" % n if lang == "ja" else "Year %d" % n

# 着差（HSU.margin の表記を英語に。数の馬身はそのまま）
static func margin(lengths: float) -> String:
	return t(HSU.margin(lengths))

# 年齢：日本語「3歳」、英語「3yo」
static func age(a: int) -> String:
	return "%d歳" % a if lang == "ja" else "%dyo" % a

# 距離と馬場（「芝 2400m」→「Turf 2400m」）
static func surface(s: String) -> String:
	if s.begins_with("ダ"): return t("ダート")
	if s == "障": return t("障害")
	return t("芝") if s.begins_with("芝") else t(s)

# 競馬場と馬場と距離（「東京 芝2400m」→「Tokyo Turf 2400m」）。r は course・surface・dist のある辞書
static func course_dist(r: Dictionary) -> String:
	if lang == "ja": return "%s %s%sm" % [r.get("course", ""), r.get("surface", ""), HSU.num(float(r.get("dist", 0)))]
	return "%s %s %sm" % [course_name(String(r.get("course", ""))), surface(String(r.get("surface", ""))), HSU.num(float(r.get("dist", 0)))]

# 馬場と距離だけ（「芝2400m」→「Turf 2400m」）
static func surf_dist(surf: String, dist: float) -> String:
	if lang == "ja": return "%s%sm" % [surf, HSU.num(dist)]
	return "%s %sm" % [surface(surf), HSU.num(dist)]

# 性（牡・牝・セ）。英語は Colt・Filly・Gelding
static func sex(s: String) -> String:
	return t(s)

# 性と年齢の短い形（「牡3」「セ5」→「C3」「G5」）
const SEX_SHORT := {"牡": "C", "牝": "F", "セ": "G", "騸": "G"}
static func sex_age(h: Dictionary, a: int) -> String:
	return "%s%d" % [sex_short(h), a]

# 性の一字（「牡」「セ」→「C」「G」）
static func sex_short(h: Dictionary) -> String:
	var sx := "セ" if h.get("gelding") else String(h.get("sex", ""))
	return sx if lang == "ja" else String(SEX_SHORT.get(sx, sx))

# ---------- データの名前（英語の欄があれば英語、無ければ日本語） ----------
static var _idx := {}

static func _index(kind: String) -> Dictionary:
	if _idx.has(kind): return _idx[kind]
	var m := {}
	var D := HSData.d()
	match kind:
		"horse":
			for src in ["historic", "legendsExtra"]:
				for d in D.get(src, []):
					if d is Dictionary and d.get("nameEn"): m[String(d.name)] = String(d.nameEn)
		"race":
			for src in ["races", "racesWorld"]:
				for r in D.get(src, []):
					if r is Dictionary and r.get("nameEn"):
						m[String(r.name)] = String(r.nameEn)
						if r.get("short"): m[String(r.short)] = String(r.get("shortEn", r.nameEn))
		"profile":
			for p in D.get("profiles", []):
				if p is Dictionary: m[String(p.name)] = p
	_idx[kind] = m
	return m

# 馬の名前（馬の辞書か名前の文字列）
static func horse_name(h) -> String:
	var nm := ""
	if h is Dictionary:
		nm = String(h.get("name", ""))
		if lang == "en" and h.get("nameEn"): return String(h.nameEn)
	else:
		nm = String(h)
	if lang == "ja": return nm
	return String(_index("horse").get(nm, nm))

# レースの名前（レースの辞書か名前の文字列）
static func race_name(r) -> String:
	var nm := ""
	if r is Dictionary:
		nm = String(r.get("name", ""))
		if lang == "en" and r.get("nameEn"): return String(r.nameEn)
	else:
		nm = String(r)
	if lang == "ja": return nm
	var v = _index("race").get(nm)
	return String(v) if v != null else _data_name(nm)

# レースの短い名前（HSRaces.label の形：short があれば short）
static func race_label(r: Dictionary) -> String:
	if lang == "ja": return HSRaces.label(r)
	if r.get("shortEn"): return String(r.shortEn)
	if r.get("nameEn"): return String(r.nameEn)
	var v = _index("race").get(String(HSRaces.label(r)))
	if v == null: v = _index("race").get(String(r.get("name", "")))
	return String(v) if v != null else _data_name(HSRaces.label(r))

# 競馬場の名前（courses.json のキー）
static func course_name(key: String) -> String:
	if lang == "ja": return key
	var c = HSData.d().get("courses", {}).get(key)
	if c is Dictionary and c.get("nameEn"): return String(c.nameEn)
	return auto(key)

# 騎手の名前（騎手の辞書か名前の文字列）
static func jockey_name(j) -> String:
	if j is Dictionary:
		if lang == "en" and j.get("nameEn"): return String(j.nameEn)
		return String(j.get("name", ""))
	return String(j)

# 特殊能力の名前と説明（HSSkills の辞書か id）
static func _skill(s):
	if s is Dictionary: return s
	HSSkills._uniques()
	var id := String(s)
	if HSSkills.BY.has(id): return HSSkills.BY[id]
	return HSHorse.SKILLS.get(id)

static func skill_label(s) -> String:
	var d = _skill(s)
	if d == null: return String(s)
	if lang == "en" and d.get("labelEn"): return String(d.labelEn)
	return String(d.get("label", ""))

static func skill_note(s) -> String:
	var d = _skill(s)
	if d == null: return ""
	if lang == "en" and d.get("noteEn"): return String(d.noteEn)
	return String(d.get("note", ""))

# 名鑑の文と主な勝鞍（名鑑の辞書か馬の名前）
static func _profile(p):
	if p is Dictionary: return p
	return _index("profile").get(String(p))

static func profile_text(p) -> String:
	var d = _profile(p)
	if d == null: return ""
	if lang == "en" and d.get("textEn"): return String(d.textEn)
	return String(d.get("text", ""))

static func main_wins(p) -> Array:
	var d = _profile(p)
	if d == null: return []
	if lang == "en" and d.get("mainWinsEn") is Array: return d.mainWinsEn
	return d.get("mainWins", [])

# オーナーの台詞（データに英語の欄が入ったら、ここで引く。いまは日本語のまま）
static func owner_line(s: String) -> String:
	return s

# オーナーのミッションの文（OP〜G1 は決まりが組む「依頼の馬○○で、△△を勝つ」、お手馬の段階はオーナーのデータの文）
static func mission(o, k: int) -> String:
	var s := HSOwners.mission_text(o, k)
	return tx(s) if k < HSOwners.JOBS else owner_line(s)

# 出られる年齢と性の条件（「3歳以上牝」→「3yo+ Fillies」）。r は age・sex のあるレースの辞書
const AGE_COND := {"2": "2歳", "2+": "2歳以上", "3": "3歳", "3+": "3歳以上", "4": "4歳", "4+": "4歳以上"}
static func age_cond(r: Dictionary) -> String:
	var s := String(AGE_COND.get(String(HSU.or_(r.get("age"), "")), ""))
	var f: bool = r.get("sex") == "牝"
	if lang == "ja": return s + ("牝" if f else "")
	s = t(s)
	if f: s = (s + " " if s != "" else "") + t("牝馬限定")
	return s
