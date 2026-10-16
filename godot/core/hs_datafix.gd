# データの仕上げ（js/core/datafix.js）のうち、遊んでいる間に使う所。データのまとめ自体は書き出す前に JS で済ませてある
class_name HSDatafix

const SMALL := { "ッ": "ツ", "ャ": "ヤ", "ュ": "ユ", "ョ": "ヨ", "ァ": "ア", "ィ": "イ", "ゥ": "ウ", "ェ": "エ", "ォ": "オ", "ヮ": "ワ" }
# 昔の登録名は小さいカナを使えない（ヤマピツト＝ヤマピット）。比べるときはそろえる（JS の HS.normName）
static func norm_name(n: Variant) -> String:
	var s := str(n) if n != null else ""
	for k in SMALL: s = s.replace(k, SMALL[k])
	return s
