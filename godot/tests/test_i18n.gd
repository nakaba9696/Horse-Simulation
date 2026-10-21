# 画面の言語（日本語と英語。持ち主の決定 2026-10-21。i18n/hs_text.gd・docs/I18N.md）
# - 英語の表：「%s」「%d」の数と並びが日本語と同じ・PATTERNS と SHORT のキーが表にある
# - 書き方：着順・お金・日付・年齢・馬場と距離（英語は 3rd・¥1,234,000・May W4）。日本語のときは前のまま（HSU・HSWorld と同じ）
# - 決まりの組む文（ニュース・理由）を形で引く（HSText.tx）
# - 言語の設定：設定のファイルに書き、次の起動（boot し直し）でも効く。初めの設定に戻しても言語は残す。初めての起動は OS の言語（日本語なら日本語、ほかは英語）
# - 英語で主な画面を組み、画面に日本語の直書きが残っていない（表のキーと同じ日本語の語が無い・HSText.missing が空）
extends RefCounted

const PATH := "user://test_i18n_settings.cfg"
const JP := "[\\x{3040}-\\x{30ff}\\x{4e00}-\\x{9fff}\\x{ff01}-\\x{ff5e}]+"

func run_async(t) -> void:
	var lang0 := HSText.lang
	_table(t)
	_format(t)
	await _settings(t)
	await _screens(t)
	HSText.set_lang(lang0)

func _spec(s: String) -> String:
	var rx := RegEx.new()
	rx.compile("%[-0-9.]*([sdf])")
	var out := ""
	for m in rx.search_all(s): out += m.get_string(1)
	return out

func _table(t) -> void:
	var bad: Array = []
	for k in HSTextEn.T:
		if _spec(String(k)) != _spec(String(HSTextEn.T[k])): bad.append(k)
	t.ok(bad.is_empty(), "i18n: 英語の訳の差し込み（%%s・%%d）が日本語と同じ並び %s" % str(bad.slice(0, 5)))
	t.ok(HSTextEn.PATTERNS.all(func(k): return HSTextEn.T.has(k)), "i18n: 形で引く文（PATTERNS）は表にある")
	t.ok(HSTextEn.SHORT.keys().all(func(k): return HSTextEn.T.has(k)), "i18n: 短い形（SHORT）のキーは表にある")
	t.ok(HSTextEn.T.size() > 900, "i18n: 英語の表の数（%d）" % HSTextEn.T.size())

func _format(t) -> void:
	HSText.set_lang("ja")
	t.eq(HSText.t("出走表へ"), "出走表へ", "i18n: 日本語のときは元の文のまま")
	t.eq(HSText.money(12345.0), HSU.money(12345.0), "i18n: 日本語のお金は前のまま（1億2,345万円）")
	t.eq(HSText.week_label(5.0, 4.0), HSWorld.week_label(5.0, 4.0), "i18n: 日本語の月と週は前のまま")
	t.eq(HSText.ord(3), "3着", "i18n: 日本語の着順")
	t.eq(HSText.sex_age({"sex": "牡"}, 3), "牡3", "i18n: 日本語の性齢")
	t.eq(HSText.age_cond({"age": "3+", "sex": "牝"}), "3歳以上牝", "i18n: 日本語の出られる条件")
	HSText.set_lang("en")
	t.eq(HSText.t("出走表へ"), "Race Card", "i18n: 英語の出走表＝Race Card")
	t.eq(HSText.t("パドック"), "Paddock", "i18n: パドック＝Paddock")
	t.eq(HSText.t("厩舎"), "Stable", "i18n: 厩舎＝Stable")
	t.eq(HSText.t("番組表"), "Race Calendar", "i18n: 番組表＝Race Calendar")
	t.eq(HSText.t("馬の店"), "Horse Market", "i18n: 馬の店＝Horse Market")
	t.eq(HSText.t("総合力"), "Rating", "i18n: 総合力＝Rating")
	t.eq(HSText.t("差し"), "Closer", "i18n: 差し＝Closer")
	t.eq(HSText.t("稍重"), "Good to Soft", "i18n: 稍重＝Good to Soft")
	t.eq(HSText.money(12345.0), "¥123,450,000", "i18n: 英語のお金は ¥ と3桁区切り")
	t.eq(HSText.money(-50.0), "-¥500,000", "i18n: 英語のマイナスのお金")
	t.eq([HSText.ord(1), HSText.ord(2), HSText.ord(3), HSText.ord(4), HSText.ord(11), HSText.ord(12), HSText.ord(13), HSText.ord(21), HSText.ord(22), HSText.ord(101)], ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st"], "i18n: 英語の着順")
	t.eq(HSText.week_label(5.0, 4.0), "May W4", "i18n: 英語の月と週")
	t.eq(HSText.week_label(12.0, 5.0), "Dec GF Week", "i18n: 英語の GF の週")
	t.eq(HSText.sex_age({"sex": "牝"}, 4), "F4", "i18n: 英語の性齢")
	t.eq(HSText.sex_age({"sex": "牡", "gelding": true}, 5), "G5", "i18n: 英語の性齢（せん馬）")
	t.eq(HSText.age_cond({"age": "3+", "sex": "牝"}), "3yo+ Fillies only", "i18n: 英語の出られる条件")
	t.eq(HSText.course_dist({"course": "東京", "surface": "芝", "dist": 2400.0}).ends_with(" Turf 2400m"), true, "i18n: 英語の馬場と距離")
	t.eq(HSText.tparts("差し・自在"), "Closer · Versatile", "i18n: 「・」でつないだ語")
	# 決まりの組む文（ニュース・理由）
	t.eq(HSText.tx("移動が間に合わない"), "Can't travel in time", "i18n: 出られない理由")
	t.eq(HSText.tx("賞金が足りない（あと1,000万円）"), "Not enough earnings (¥10,000,000 short)", "i18n: 形で引く文と、差し込まれたお金")
	t.eq(HSText.tx("5月2週"), "May W2", "i18n: 決まりの組む日付")
	t.eq(HSText.tx("2年目 5月4週"), "Year 2, May W4", "i18n: 記録の日付")
	t.eq(HSText.tx("初勝利。ここからが始まりだ。"), "First win. This is just the beginning.", "i18n: ニュース（そのまま）")
	t.eq(HSText.tx("サンプルが入厩した。"), "サンプル has entered training.", "i18n: ニュース（馬名の入る形）")
	t.eq(HSText.race_label({"name": "3歳以上オープン（牝）"}), "3yo+ Fillies Open", "i18n: 名前のあるオープン")
	t.eq(HSText.horse_name({"name": "テスト", "nameEn": "Test"}), "Test", "i18n: データに英語の名前（nameEn）があれば英語")
	t.eq(HSText.horse_name({"name": "テスト"}), "テスト", "i18n: 英語の名前が無ければ日本語")
	t.eq(HSText.race_name({"name": "テスト記念", "nameEn": "Test Memorial"}), "Test Memorial", "i18n: レースの英語の名前")
	t.eq(HSText.skill_label({"label": "豪脚", "labelEn": "Power Kick"}), "Power Kick", "i18n: 特殊能力の英語の名前（labelEn）")
	t.eq(HSText.profile_text({"text": "名鑑", "textEn": "Profile"}), "Profile", "i18n: 名鑑の英語（textEn）")
	HSText.set_lang("ja")
	t.eq(HSText.horse_name({"name": "テスト", "nameEn": "Test"}), "テスト", "i18n: 日本語のときは日本語の名前")
	t.eq(HSText.lang_for_locale("ja_JP"), "ja", "i18n: OS が日本語なら日本語")
	t.eq(HSText.lang_for_locale("en_US"), "en", "i18n: OS が英語なら英語")
	t.eq(HSText.lang_for_locale("fr_FR"), "en", "i18n: OS がほかの言語なら英語")

# 言語の設定は設定のファイルに書き、次の起動でも効く
func _settings(t) -> void:
	var path0 := UiSettings.path
	var cur0 := UiSettings.cur.duplicate(true)
	var booted0 := UiSettings._booted
	UiSettings.path = PATH
	if FileAccess.file_exists(PATH): DirAccess.remove_absolute(ProjectSettings.globalize_path(PATH))
	UiSettings.cur = {}
	UiSettings.load_file()
	t.eq(String(UiSettings.cur.lang), UiSettings.first_lang(), "i18n: 設定のファイルが無い（初めての起動）は first_lang（撮影・headless は日本語、ほかは OS の言語）")
	UiSettings.set_value("lang", "en")
	t.eq(HSText.lang, "en", "i18n: 設定で英語にすると、すぐ英語")
	# 次の起動：読み直して効かせる
	UiSettings.cur = {}
	HSText.set_lang("ja")
	UiSettings._booted = false
	UiSettings.boot()
	t.eq(String(UiSettings.cur.lang), "en", "i18n: 次の起動でも設定の言語を読む")
	t.eq(HSText.lang, "en", "i18n: 次の起動でも英語で出る")
	UiSettings.reset()
	t.eq(HSText.lang, "en", "i18n: 初めの設定に戻しても言語は残る")
	UiSettings.set_value("lang", "ja")
	t.eq(HSText.lang, "ja", "i18n: 日本語に戻せる")
	# 設定の画面：言語の行で左右を押すと替わる
	DirAccess.remove_absolute(ProjectSettings.globalize_path(PATH))
	UiSettings.path = path0
	UiSettings.cur = cur0
	UiSettings._booted = booted0
	UiSettings.apply()
	HSText.set_lang("ja")

# 英語で主な画面を組んで、画面に日本語の直書きが残っていないかを見る
func _screens(t) -> void:
	var era0 = HSU.ERA
	var frags := _ui_fragments()
	var booted0 := UiSettings._booted
	UiSettings._booted = true   # 画面を開くときに設定のファイルで言語を戻さない
	HSText.set_lang("en")
	HSText.missing = {}
	UiFlow.demo_ride(1)
	await _screen(t, "race_card", frags)
	UiFlow.demo_week(1)
	UiFlow.program_id = HSWorld.mine()[0].id if HSWorld.mine().size() else ""
	for n in ["title", "home", "program", "shop", "stable", "horse", "breed", "data", "owners", "gf", "week_result", "settings"]:
		await _screen(t, n, frags)
	t.ok(HSText.missing.is_empty(), "i18n: 英語の画面を組んで、表に無い画面の文が無い %s" % str(HSText.missing.keys().slice(0, 8)))
	HSText.set_lang("ja")
	UiSettings._booted = booted0
	HSU.ERA = era0
	HSWorld.G = null
	UiFlow._reset_week()
	UiFlow.no_save = false

# 表のキーの日本語の語（2字以上。データの名前に出てこないもの）。画面の字の中の日本語の語がこれと同じなら、訳し忘れ
func _ui_fragments() -> Dictionary:
	var rx := RegEx.new()
	rx.compile(JP)
	var out := {}
	for k in HSTextEn.T:
		for m in rx.search_all(String(k)):
			var w := m.get_string()
			if w.length() >= 2: out[w] = true
	# データの名前と同じ語は外す（馬名・レース名・競馬場名・オーナーのデータ。データの英語は別の仕事）
	var D := HSData.d()
	var names := PackedStringArray()
	for src in ["historic", "races", "racesWorld"]:
		for d in D.get(src, []):
			if d is Dictionary:
				names.append(String(d.get("name", "")))
				names.append(String(d.get("short", "")))
	for c in D.get("courses", {}): names.append(String(c))
	for o in HSOwners.LIST():
		for v in [o.get("name"), o.get("title"), o.get("note"), o.get("kana")]:
			if v != null: names.append(String(v))
		for m in o.get("missions", []):
			if m is Dictionary: names.append(String(m.get("text", "")) + "\n" + String(m.get("say", "")))
	var all := "\n".join(names)
	for w in out.keys():
		if all.contains(w): out.erase(w)
	return out

func _frames(t, n: int) -> void:
	for i in n:
		await t.process_frame

func _screen(t, n: String, frags: Dictionary) -> void:
	var sc = load("res://scenes/%s.tscn" % n).instantiate()
	t.root.add_child(sc)
	await _frames(t, 3)
	var tabs: int = {"data": 11, "horse": 4, "settings": 1, "program": 0, "stable": 1, "shop": 1, "gf": 5}.get(n, 0)
	var left := _left_jp(sc, frags)
	for k in tabs:
		if not sc.has_method("on_tab"): break
		sc.on_tab(1)
		await _frames(t, 2)
		left += _left_jp(sc, frags)
	t.ok(left.is_empty(), "i18n: 英語の %s の画面に日本語の直書きが無い %s" % [n, str(left.slice(0, 6))])
	sc.queue_free()
	await _frames(t, 1)

func _left_jp(sc: Node, frags: Dictionary) -> Array:
	var rx := RegEx.new()
	rx.compile(JP)
	var out: Array = []
	for c in sc.find_children("*", "Control", true, false):
		var texts: Array = []
		if c is Label or c is Button: texts.append(String(c.text))
		if c is LineEdit: texts.append(String((c as LineEdit).placeholder_text))
		for s in texts:
			for m in rx.search_all(s):
				if frags.has(m.get_string()) and not out.has(m.get_string()): out.append(m.get_string())
	return out
