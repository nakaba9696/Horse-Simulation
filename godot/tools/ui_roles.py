#!/usr/bin/env python3
# 部品の絵（godot/assets/ui。持ち主が作った絵）の面の色を、色の役目（docs/UI.md「色の役目」）に塗り替えた絵を作る
#   python3 godot/tools/ui_roles.py        → godot/assets/ui/role/*.png（もとの絵は変えない）
# 色は godot/ui/theme.gd の定数（INK・ACT・ACT_HI・ACT_DOWN）から読む。定数を変えたら回し直す（test_contrast.gd が面の色のずれを見る）
# 塗り替えるのは面（緑の所）だけ。金の縁・角の飾り・影は残す。面の濃淡（光の当たり方）は保つ
# 要るもの：Pillow（pip install pillow）
import os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "ui")
DST = os.path.join(SRC, "role")

# 絵 → 役目（theme.gd の定数の名前）
PARTS = {
	"btn_sub_normal": "ACT",       # 普通のボタン：革の面
	"btn_sub_focus": "ACT_HI",     # 選んでいる・乗せた：明るい革
	"btn_sub_pressed": "ACT_DOWN", # 押した：暗い革
	"row_normal": "ACT",           # 押せる行
	"row_focus": "ACT_HI",         # カーソルのある行
	"tab_normal": "ACT",           # 選んでいないつまみ
	"panel_card": "INK",           # 読む板（面）
	"panel_card_focus": "INK",     # 金の縁が光る板（面は同じ墨の緑）
	"panel_racecard": "INK",
}

def theme_colors():
	src = open(os.path.join(ROOT, "ui", "theme.gd"), encoding="utf-8").read()
	out = {}
	for name in set(PARTS.values()):
		m = re.search(r'^const %s := Color\("([0-9a-fA-F]{6})"\)' % name, src, re.M)
		if not m:
			sys.exit("theme.gd に const %s := Color(\"rrggbb\") が無い" % name)
		h = m.group(1)
		out[name] = tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
	return out

def is_face(r, g, b):
	# 面＝緑が赤より明らかに強い所（金の縁は赤が緑と同じか強い）
	return g > r * 1.15 and g >= b and g > 12

def luma(r, g, b):
	return 0.299 * r + 0.587 * g + 0.114 * b

# 読む板（INK）は写真をほとんど透かさない（面の不透明さを 93% 以上に。theme.gd の SURFACE と同じ）
ALPHA_MIN = {"INK": 238}

def recolor(name, rgb, alpha_min=0):
	im = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
	px = im.load()
	w, h = im.size
	ls = [luma(*px[x, y][:3]) for y in range(h) for x in range(w) if px[x, y][3] > 200 and is_face(*px[x, y][:3])]
	if not ls:
		sys.exit("%s に面（緑の所）が無い" % name)
	ls.sort()
	mid = ls[len(ls) // 2]   # 面の真ん中の明るさを役目の色にそろえる（濃淡は比で保つ）
	for y in range(h):
		for x in range(w):
			r, g, b, a = px[x, y]
			if a > 0 and is_face(r, g, b):
				k = luma(r, g, b) / mid
				px[x, y] = tuple(min(255, int(round(c * k))) for c in rgb) + (max(a, alpha_min),)
	os.makedirs(DST, exist_ok=True)
	im.save(os.path.join(DST, name + ".png"), optimize=True)
	return mid

def main():
	cols = theme_colors()
	for name, role in PARTS.items():
		recolor(name, cols[role], ALPHA_MIN.get(role, 0))
		print("role/%s.png ← %s #%02x%02x%02x" % ((name, role) + cols[role]))

if __name__ == "__main__":
	main()
