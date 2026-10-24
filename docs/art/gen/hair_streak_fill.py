# 候補 5 の髪の明るい金色の筋を、まわりの濃い髪の平均の色で埋める（肌・帽子・地のふちは外す）
# 使い方：python streakfix.py in.png out.png
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
def fill(s, m):
    lum = s.mean(-1); src = (lum < 85) & ~m
    o = s.copy(); done = np.zeros_like(m)
    for sig in (4, 8, 16, 32):
        w = ndimage.gaussian_filter(src.astype(np.float32), sig)
        avg = np.stack([ndimage.gaussian_filter(s[..., c] * src, sig) for c in range(3)], -1) / np.maximum(w, 1e-4)[..., None]
        f = m & (w > 0.05) & ~done; o[f] = avg[f]; done |= f
    mm = ndimage.gaussian_filter(m.astype(np.float32), 0.8)[..., None]
    return s * (1 - mm) + o * mm
s = np.array(Image.open(sys.argv[1]).convert("RGB")).astype(np.float32); R, G, B = s[..., 0], s[..., 1], s[..., 2]
lum = (R + G + B) / 3; dark = lum < 85
fr = ndimage.uniform_filter(dark.astype(float), 21)
yy, xx = np.mgrid[:s.shape[0], :s.shape[1]]; left = (xx > 330) & (xx < 500) & (yy > 370) & (yy < 740)
m = (R - B > 35) & (R > G + 5) & (lum > 55) & (((lum < 175) & (fr > 0.35)) | (left & (lum < 230) & (fr > 0.12)))
skin = (R > 190) & (B > 150) & (R - B < 70)
m = ndimage.binary_dilation(m, iterations=2) & ~ndimage.binary_dilation(skin, iterations=3) & ~(G > R + 5); m[:330] = False
s = fill(s, m)
R, G, B = s[..., 0], s[..., 1], s[..., 2]; lum = s.mean(-1)
box = (xx > 360) & (xx < 460) & (yy > 540) & (yy < 660)
m2 = box & (R > G + 3) & (lum > 80) & ~((R > 190) & (B > 150))
m2 = ndimage.binary_dilation(m2, iterations=2) & box & ~(G > R + 5)
s = fill(s, m2)
Image.fromarray(s.round().clip(0, 255).astype(np.uint8)).save(sys.argv[2])
