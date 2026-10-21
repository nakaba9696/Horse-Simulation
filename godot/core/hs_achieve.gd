# 実績の入れ口（Steam の実績につなぐ1か所。docs/STEAM.md「実績」）
# いまは Steam の SDK を入れていないので、解いた実績を覚えておくだけ（backend が空）。SDK を入れたら backend に
#   func(id): Steam.setAchievement(id); Steam.storeStats()
# のような関数を渡す（入れ口はここ1つ。呼ぶ側は HSAchieve.unlock(id) だけを知っていればよい）
# - トロフィー（data/trophies.js の34個と GF の6個。合わせて40個）を自分の馬が手にしたとき、HSTrophy.give から呼ぶ
# - 実績の id は Steam の API 名に使える形（英大文字・数字・_）：TROPHY_ + トロフィーの id（gf:sprint → TROPHY_GF_SPRINT）
# - セーブには入れない（実績は Steam の側が覚える）。つづきから始めたときは sync_from_world で、セーブにあるトロフィーの分をもう一度呼ぶ（Steam は解いた実績を二度解いても何も起きない）
# - 遊びの結果には関わらない（乱数・世界の状態に触らない）
class_name HSAchieve

static var backend := Callable()   # Steam につないだら、ここに渡す（id を受け取る）
static var unlocked := {}          # この起動で解いた実績（id → true）
static var calls: Array = []       # 呼ばれた順（テストが見る）

static func unlock(id: String) -> bool:
	if id == "" or unlocked.has(id): return false
	unlocked[id] = true
	calls.append(id)
	if backend.is_valid(): backend.call(id)
	return true

static func trophy_id(tid: String) -> String:
	var s := tid.to_upper()
	for c in [":", "-", " ", "."]:
		s = s.replace(c, "_")
	return "TROPHY_" + s

# トロフィーを手にしたとき（HSTrophy.give から）。自分の馬だけ
static func on_trophy(t: Dictionary, h: Dictionary) -> void:
	if h.get("owner") != "P": return
	unlock(trophy_id(String(t.id)))

# つづきから：セーブにあるトロフィーの実績を呼び直す（Steam が無い間に取ったものも、あとで Steam に載る）
static func sync_from_world() -> int:
	var n := 0
	if HSWorld.G == null: return 0
	var rec: Dictionary = HSU.or_(HSWorld.G.get("trophies"), {})
	for t in HSTrophy.list():
		if rec.get(t.id):
			if unlock(trophy_id(String(t.id))): n += 1
	return n

# 実績の一覧（id・名前・条件）。docs/STEAM.md の表と、Steamworks に登録するときの元
static func table() -> Array:
	var out: Array = []
	for t in HSTrophy.list():
		out.append({ id = trophy_id(String(t.id)), name = String(t.label), cond = String(t.note), cat = String(t.cat), tier = int(t.tier) })
	return out

# テスト用：覚えた分を消す
static func clear() -> void:
	unlocked = {}
	calls = []
