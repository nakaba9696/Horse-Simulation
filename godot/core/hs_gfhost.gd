# グランドフェスティバルを開いている一族の人（js/core/gfhost.js の HS.GFHost と同じ）：GF の場面で出すひと言を選ぶ
# 場面：wait 招待の前・invite 招待が届いた・week GF の週・kincsem 全部の GF を勝ったあと。台詞は data/gfhost.js（下書き）
class_name HSGFHost

static func data() -> Variant: return HSData.d().get("gfHost")
static func scene() -> String:
	var G = HSWorld.G
	if HSSeason.gf_all_won(): return "kincsem"
	if HSSeason.dc_pending_list().size(): return "invite"
	if G and G.week > 4: return "week"
	return "wait"
static func line(sc: String, cat: String = "") -> String:
	var d = data()
	if not d: return ""
	var set: Array = HSU.or_(d.get("lines"), {}).get(sc, [])
	if not set.size(): return ""
	var G = HSWorld.G
	var t: String = set[HSU.hash32("gfhost:%s:%s:%s" % [sc, HSU.num(G.year) if G else "0", cat]) % set.size()]
	var vars := { me = HSJockey.me().name if HSJockey.me() else "", race = HSSeason.gf_name(cat) if cat != "" else "グランドフェスティバル" }
	var re := RegEx.create_from_string("\\{(\\w+)\\}")
	var out := ""; var last := 0
	for m in re.search_all(t):
		out += t.substr(last, m.get_start() - last)
		var k := m.get_string(1)
		out += str(vars[k]) if vars.get(k) != null else ""
		last = m.get_end()
	return out + t.substr(last)
