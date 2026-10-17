# 絵の決まり（js/ui/art.js・raceview.js と同じ値）：毛色の表・白徴（名前から）・白い靴下の長さ・勝負服（名前から）・枠の色
# 乱数は名前の hash（HSU.hash_rng）だけで、JS と同じ結果になる（godot/tools/check_art.gd で確かめる）
class_name UiArt
extends RefCounted

# 毛色の表（body 体・top 背・belly 腹・mane たてがみ・tail 尾・points 脚先・muzzle 鼻先・hoof 蹄・gloss 毛づや・pointsSoft 脚先へゆるやかに）
const COAT_LOOK := {
	"鹿毛": {"body": "#7d4322", "top": "#5a2e15", "belly": "#8f5531", "mane": "#16100c", "tail": "#16100c", "points": "#17110d", "muzzle": "#3b2519", "hoof": "#26211d", "gloss": 0.55},
	"黒鹿毛": {"body": "#432617", "top": "#2c180d", "belly": "#55331e", "mane": "#0f0b09", "tail": "#0f0b09", "points": "#110c0a", "muzzle": "#6a4128", "hoof": "#201c19", "tan": "#6e4328", "gloss": 0.6},
	"青鹿毛": {"body": "#261913", "top": "#170f0b", "belly": "#2e1f17", "mane": "#0a0807", "tail": "#0a0807", "points": "#0b0908", "muzzle": "#4a3020", "hoof": "#1c1916", "tan": "#47301f", "gloss": 0.65},
	"青毛": {"body": "#161516", "top": "#0d0c0d", "belly": "#1a1919", "mane": "#070707", "tail": "#070707", "points": "#090909", "muzzle": "#222020", "hoof": "#1a1817", "gloss": 0.8},
	"栗毛": {"body": "#a9592a", "top": "#8b4620", "belly": "#b86a3a", "mane": "#b8692f", "tail": "#a85d2a", "points": "#97501f", "muzzle": "#8a4b2c", "hoof": "#3a3027", "gloss": 0.55, "pointsSoft": true},
	"栃栗毛": {"body": "#5f2f18", "top": "#4a2312", "belly": "#6c3820", "mane": "#7c4a2a", "tail": "#6e3f22", "points": "#552a16", "muzzle": "#4f2a18", "hoof": "#2e2620", "gloss": 0.55, "pointsSoft": true},
	"芦毛": {"grey": true, "gloss": 0.35,
		"young": {"body": "#6c6e72", "top": "#55575b", "belly": "#7a7c80", "mane": "#3e4044", "tail": "#45474b", "points": "#35373a", "muzzle": "#2e2e30", "hoof": "#26231f", "dappleCol": "#a7aaae"},
		"old": {"body": "#d8d9d6", "top": "#c6c8c6", "belly": "#e2e2de", "mane": "#c4c4c0", "tail": "#b9bab6", "points": "#a9abab", "muzzle": "#3a393a", "hoof": "#2e2a26", "dappleCol": "#ecebe6"}},
	"白毛": {"body": "#f3f1ec", "top": "#e4e1da", "belly": "#f6f4ef", "mane": "#f0ede6", "tail": "#ece8e0", "points": "#ebe7df", "muzzle": "#d9b4aa", "hoof": "#cbbca3", "gloss": 0.3, "pointsSoft": true},
	"粕毛": {"body": "#8c6c5c", "top": "#6e5040", "belly": "#977a6a", "mane": "#1c1410", "tail": "#1c1410", "points": "#1c1410", "muzzle": "#4a3020", "hoof": "#26211d", "roan": 1, "gloss": 0.35},
	"月毛": {"body": "#d6b06a", "top": "#c39b56", "belly": "#e0bd7c", "mane": "#f1e5c7", "tail": "#ece0c0", "points": "#c9a35e", "muzzle": "#8d6a50", "hoof": "#6b5a48", "gloss": 0.5, "pointsSoft": true},
	"河原毛": {"body": "#c9a465", "top": "#a8844a", "belly": "#d4b278", "mane": "#1d1712", "tail": "#1d1712", "points": "#1d1712", "muzzle": "#3a2c20", "hoof": "#26211d", "gloss": 0.45},
	"佐目毛": {"body": "#efe3c8", "top": "#e3d5b6", "belly": "#f3e9d3", "mane": "#f5eedf", "tail": "#f2eadb", "points": "#ebdfc4", "muzzle": "#dcb7a6", "hoof": "#cbbca3", "gloss": 0.3, "pointsSoft": true},
}
const SILK_PATTERNS := ["plain", "hoops", "stripes", "sash", "cross", "diamonds", "stars", "halves", "yoke"]
const SILK_COLS := ["#c8102e", "#003da5", "#ffd100", "#00843d", "#ffffff", "#111111", "#ff6a13", "#7a2182", "#e04e9a", "#8a5a2b", "#5bc2e7", "#a4d65e"]

static func _mix_hex(a: String, b: String, t: float) -> String:
	var out := "#"
	for i in 3:
		var va := ("0x" + a.substr(1 + i * 2, 2)).hex_to_int()
		var vb := ("0x" + b.substr(1 + i * 2, 2)).hex_to_int()
		out += "%02x" % int(HSMath.round_js(va + (vb - va) * t))
	return out

# 毛色の色（age＝満年齢。芦毛は2歳で濃く、年を取るほど白い）
static func coat_look(c: String, age = null) -> Dictionary:
	var L: Dictionary = COAT_LOOK.get(c, COAT_LOOK["鹿毛"])
	if not L.get("grey", false):
		return L
	var a: float = 4.0 if age == null else float(age)
	var w := clampf((a - 1.5) / 7.0, 0.0, 1.0)
	var out := {"gloss": L.gloss, "grey": true, "pointsSoft": true,
		"dapple": 0.85 * clampf(w / 0.12, 0.0, 1.0) * maxf(0.0, 1.0 - maxf(0.0, w - 0.3) / 0.45)}
	for k in L.young:
		out[k] = _mix_hex(L.young[k], L.old[k], w)
	return out

# 白徴（流星・白い靴下）を名前から。socks：前左・前右・後左・後右
static func marks(key: String) -> Dictionary:
	var r := HSU.hash_rng("marks:" + key)
	var blaze = r.pick(["none", "none", "star", "stripe", "blaze"])
	var socks := [r.chance(0.25), r.chance(0.2), r.chance(0.3), r.chance(0.25)]
	return {"blaze": blaze, "socks": socks}

# 白い靴下の長さ（m。js/ui/horse_rigged.js と同じ hash）。無い脚は 0
static func sock_lengths(name: String, mk: Dictionary) -> Array:
	var out := []
	for k in 4:
		out.append([0.16, 0.24, 0.34, 0.46][int(floor(_hash01(_str_hash(name + str(k)), 5) * 4.0))] if mk.socks[k] else 0.0)
	return out

# 勝負服（名前から。自分の馬は持ち主の勝負服を渡す）
static func silks_of(name: String) -> Dictionary:
	var r := HSU.hash_rng("silks:" + name)
	var base: String = r.pick(SILK_COLS)
	var sub: String = r.pick(SILK_COLS)
	if sub == base:
		sub = "#111111" if base == "#ffffff" else "#ffffff"
	return {"base": base, "sub": sub, "pattern": r.pick(SILK_PATTERNS)}

# 見た目の一式（ViewHorse.setup に渡す形）
static func horse_info(name: String, coat: String, age: float, num: int, frame: int) -> Dictionary:
	var L := coat_look(coat, age)
	var mk := marks(name)
	var fc: Array = HSData.d().get("frameColors", ["#ffffff", "#111111", "#d8302a", "#2a5fc8", "#f0cf2a", "#2e9a4a", "#f08a24", "#f07aa8"])
	return {"name": name, "coat": coat, "num": num, "frame": frame, "coatLook": L,
		"marks": {"blaze": mk.blaze, "socks": sock_lengths(name, mk)}, "silks": silks_of(name), "cap": fc[(frame - 1) % 8]}

# ---- JS の 32 ビットの整数の計算（Math.imul・>>>・|0）----
static func _i32(x: int) -> int:
	x &= 0xffffffff
	return x - 0x100000000 if x >= 0x80000000 else x

static func _imul(a: int, b: int) -> int:
	var lo := (a & 0xffff) * (b & 0xffffffff)
	var hi := ((a >> 16) & 0xffff) * (b & 0xffffffff)
	return _i32(lo + ((hi & 0xffff) << 16))

static func _str_hash(s: String) -> int:
	var h := _i32(2166136261)
	var b := s.to_utf16_buffer()
	for i in range(0, b.size(), 2):
		h = _i32(h ^ (b[i] | (b[i + 1] << 8)))
		h = _imul(h, 16777619)
	return h

static func _hash01(a: int, b: int) -> float:
	var h := _i32(_imul(_i32(a ^ _i32(0x9e3779b9)), _i32(0x85ebca6b)) ^ _imul(_i32(b + 0x632be5ab), _i32(0xc2b2ae35)))
	h = _i32(h ^ ((h & 0xffffffff) >> 13))
	h = _imul(h, _i32(0x27d4eb2f))
	h = _i32(h ^ ((h & 0xffffffff) >> 16))
	return float(h & 0xffffffff) / 4294967296.0
