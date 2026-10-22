# 髪の色だけを変える：色相が髪の範囲（橙〜栗）で彩度のある所を、深い赤茶〜マホガニーに寄せる。顔の楕円・金の飾り（黄色の色相）は除く
# 使い方：python recolor_hair.py in(.png|.webp) out cx,cy,rx,ry(除く顔)
import sys, colorsys
import numpy as np
from PIL import Image
im = Image.open(sys.argv[1]); mode = im.mode
a = np.array(im.convert("RGBA")).astype(np.float32) / 255
rgb = a[..., :3]
mx = rgb.max(-1); mn = rgb.min(-1); d = mx - mn + 1e-6
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
s = d / (mx + 1e-6); v = mx
H, W = h.shape; yy, xx = np.mgrid[:H, :W]
face = np.zeros((H, W), bool)   # 除く楕円（目・宝石など）を ; で並べる
for el in sys.argv[3].split(";"):
    cx, cy, rx, ry = [float(t) for t in el.split(",")]
    face |= ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 < 1
keep = np.zeros_like(face)
for bx in (sys.argv[4].split(";") if len(sys.argv) > 4 else []):
    x0, y0, x1, y1 = [int(t) for t in bx.split(",")]; keep[y0:y1, x0:x1] = True
hair = (h > 8) & (h < 34) & (s > 0.35) & ~face & ~keep
w = np.clip((s - 0.35) / 0.15, 0, 1) * hair
nh = 8.0; ns = np.clip(s * 0.95, 0, 1); nv = v * 0.62
c = nv * ns; x = c * (1 - abs((nh / 60) % 2 - 1)); m = nv - c
nr, ng, nb = c + m, x + m, np.zeros_like(c) + m
out = rgb.copy()
out[..., 0] = rgb[..., 0] * (1 - w) + nr * w
out[..., 1] = rgb[..., 1] * (1 - w) + ng * w
out[..., 2] = rgb[..., 2] * (1 - w) + nb * w
a[..., :3] = out
o = Image.fromarray((a * 255).round().astype(np.uint8), "RGBA")
if sys.argv[2].endswith(".png") and mode == "RGB": o = o.convert("RGB")
o.save(sys.argv[2], **({"quality": 92, "alpha_quality": 100, "method": 6} if sys.argv[2].endswith(".webp") else {}))
print(sys.argv[2], int(hair.sum()))
