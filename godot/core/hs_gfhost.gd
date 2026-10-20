# グランドフェスティバルを開いている一族の人（js/core/gfhost.js の HS.GFHost と同じ）：GF の場面で出すひと言を選ぶ
# 場面：wait 招待の前・invite 招待が届いた・week GF の週・kincsem 全部の GF を勝ったあと。台詞は data/gfhost.js（下書き）
# GF を全制覇したとき（6つの GF のトロフィーがそろったとき。年をまたいでよい）、花輪とアイテム（一族の花輪。1頭の馬から作れるオリジナルホース＋1。HSOriginal）。印は G.owners.flags.wreath
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
# 花輪（アイテム）をもらったか
static func has_item() -> bool:
	var G = HSWorld.G
	return G != null and G.get("owners") != null and G.owners.get("flags") != null and HSU.truthy(G.owners.flags.get("wreath"))
static func fill(t: String, vars: Dictionary) -> String:
	var v := { me = HSJockey.me().name if HSJockey.me() else "" }; v.merge(vars, true)
	var re := RegEx.create_from_string("\\{(\\w+)\\}")
	var out := ""; var last := 0
	for m in re.search_all(t):
		out += t.substr(last, m.get_start() - last)
		var k := m.get_string(1)
		out += str(v[k]) if v.get(k) != null else ""
		last = m.get_end()
	return out + t.substr(last)
# 花輪の場面の会話
static func scene_lines(vars: Dictionary) -> Array:
	var d = data()
	if not d: return []
	return HSU.or_(d.get("lines"), {}).get("wreath", []).map(func(t): return fill(String(t), vars))
# 週の終わり（HSOwners.after_week から）：GF の全制覇がそろったら、花輪とアイテム（js/core/gfhost.js と同じ）
static func after_week(_rep: Dictionary) -> void:
	var G = HSWorld.G; var d = data()
	if not d or not d.get("item") or not HSOwners.on() or has_item() or not HSSeason.gf_all_won(): return
	var s := HSOwners.state()
	s.flags.wreath = { y = G.year }
	HSWorld.news("GF を全制覇した。%sさんから%sを受け取った（%s）。" % [d.name, d.item.name, d.item.text], "g1")
	s.queue.append({ oid = d.id, kind = "wreath", horse = "", race = "", reward = "%s（%s）" % [d.item.name, d.item.text], y = G.year })
