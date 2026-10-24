#!/usr/bin/env python3
# 色の役目の物差し（UiScreen.measure_contrast と同じ測り方）を、別の絵に当てる
#   python3 godot/tools/contrast_png.py 絵.png 札の位置.json
# 札の位置は shot_screens.sh --contrast が書いた *_contrast.json（直した後の絵で測ったもの）。
# 直す前の絵を、同じ札の位置で測って前後を比べるのに使う（札の位置が前後で同じ画面だけ）
import json, sys
from PIL import Image

FACE, RIM, ROW = 1.6, 3.0, 1.25

def lin(v):
	v /= 255.0
	return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

def lum(px):
	r, g, b = px[:3]
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def ratio(a, b):
	return (max(a, b) + 0.05) / (min(a, b) + 0.05)

def med(a):
	a = sorted(a)
	return a[len(a) // 2]

def measure(img, j):
	px = img.load()
	W, H = img.size
	others = [tuple(o) for o in j.get("others", [])]
	out = []
	for b in j["buttons"]:
		x, y, w, h = b["rect"]
		face = [lum(px[xx, yy]) for yy in range(int(y + h * .3), int(y + h - h * .3), 2) for xx in range(int(x + w * .3), int(x + w - w * .3), 3)]
		rim = []
		for d in range(7):
			for xx in range(x + 6, x + w - 6, 3):
				rim += [lum(px[xx, y + d]), lum(px[xx, y + h - 1 - d])]
			for yy in range(y + 6, y + h - 6, 3):
				rim += [lum(px[x + d, yy]), lum(px[x + w - 1 - d, yy])]
		ring = []
		for d in range(4, 13, 2):
			pts = [(xx, y - d) for xx in range(x - d, x + w + d, 4)] + [(xx, y + h + d) for xx in range(x - d, x + w + d, 4)]
			pts += [(x - d, yy) for yy in range(y - d, y + h + d, 4)] + [(x + w + d, yy) for yy in range(y - d, y + h + d, 4)]
			for (px_, py_) in pts:
				if px_ < 0 or py_ < 0 or px_ >= W or py_ >= H:
					continue
				if any(o != (x, y, w, h) and o[0] - 2 <= px_ <= o[0] + o[2] + 2 and o[1] - 2 <= py_ <= o[1] + o[3] + 2 for o in others):
					continue
				ring.append(lum(px[px_, py_]))
		if len(ring) < 12 or not face:
			continue
		rim.sort()
		f, g = med(face), med(ring)
		e = rim[min(len(rim) - 1, int(len(rim) * 0.95))]
		fc, rc = ratio(f, g), ratio(e, g)
		ok = fc >= ROW if b["kind"] == "row" else (fc >= FACE and rc >= RIM)
		out.append(dict(b, face=fc, rim=rc, ok=ok))
	return out

def summary(rows):
	bt = [r for r in rows if r["kind"] != "row"]
	rw = [r for r in rows if r["kind"] == "row"]
	return {
		"n": len(rows),
		"face": min([r["face"] for r in bt], default=None),
		"rim": min([r["rim"] for r in bt], default=None),
		"row": min([r["face"] for r in rw], default=None),
		"bad": sum(1 for r in rows if not r["ok"]),
	}

if __name__ == "__main__":
	img = Image.open(sys.argv[1]).convert("RGB")
	j = json.load(open(sys.argv[2], encoding="utf-8"))
	print(json.dumps(summary(measure(img, j)), ensure_ascii=False))
