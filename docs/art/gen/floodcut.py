# 線画の外側を、絵の端からつながる白い地として塗りつぶして抜く（白い服・白い髪で、輪郭の線がはっきりした絵向け）
# 内側に囲まれた白（服・紙）は残す。縁は線の外側 1px をなじませる
# 使い方：python floodcut.py in.png out.webp [white=226] [chroma=16]
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
c = np.array(Image.open(sys.argv[1]).convert("RGB")).astype(np.float32)
wt = float(sys.argv[3]) if len(sys.argv) > 3 else 226
ct = float(sys.argv[4]) if len(sys.argv) > 4 else 16
light = (c.min(-1) >= wt) & (c.max(-1) - c.min(-1) < ct)
gap = int(sys.argv[5]) if len(sys.argv) > 5 else 3          # 線のすき間を閉じる太さ
line = c.mean(-1) < 215
light &= ~ndimage.binary_dilation(line, iterations=gap)
lab, n = ndimage.label(light)
ids = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])); ids = ids[ids > 0]
bg = np.isin(lab, ids)
lightall = (c.min(-1) >= wt) & (c.max(-1) - c.min(-1) < ct)
for _ in range(gap + 2):    # 閉じた分の明るい帯を外からはがす
    bg |= ndimage.binary_dilation(bg, iterations=1) & lightall
# 縁：背景に接する所の明るさから透明度（明るいほど透明）
fg = ~bg
fg = ndimage.binary_fill_holes(fg) & ~bg | fg
edge = ndimage.binary_dilation(bg, iterations=1) & fg
lum = c.mean(-1)
a = fg.astype(np.float32)
a[edge] = np.clip((255 - lum[edge]) / (255 - 120), 0.35, 1)
lab2, n2 = ndimage.label(a > 0.5); sz = ndimage.sum(np.ones_like(a), lab2, range(1, n2 + 1))
if n2 > 1: a[(lab2 > 0) & (lab2 != int(np.argmax(sz)) + 1)] = 0
o = np.dstack([c, a * 255]).round().clip(0, 255).astype(np.uint8); o[a == 0, :3] = 0
Image.fromarray(o, "RGBA").save(sys.argv[2], "WEBP", quality=92, alpha_quality=100, method=6)
print(sys.argv[2], "bg", int(bg.sum()))
