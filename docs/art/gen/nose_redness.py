# 鼻の赤みを肌の色に戻す：鼻の楕円の中の明るい所の色みを、頬の肌の色みに寄せる（明るさはそのまま）
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
skin = np.array([249., 222., 204.])
for f in sys.argv[1:]:
    a = np.array(Image.open(f).convert("RGBA")).astype(np.float32); c = a[..., :3]
    H, W = c.shape[:2]; yy, xx = np.mgrid[:H, :W]
    e = ((xx - 522) / 50) ** 2 + ((yy - 490) / 80) ** 2
    lum = c.mean(-1)
    rg = c[..., 0] - c[..., 1]
    w = np.clip((rg - 22) / 10, 0, 1) * np.clip((lum - 110) / 30, 0, 1) * np.clip((1 - e) * 1.6, 0, 1)
    w = ndimage.gaussian_filter(w, 1.5)[..., None]
    t = np.clip((lum - 150) / 80, 0, 1)
    gr = 0.82 + (0.93 - 0.82) * t; br = 0.75 + (0.87 - 0.75) * t
    tgt = np.stack([c[..., 0], c[..., 0] * gr, c[..., 0] * br], -1)
    a[..., :3] = c * (1 - w) + tgt * w
    Image.fromarray(a.clip(0, 255).round().astype(np.uint8), "RGBA").save(f)
    print(f, float(w.sum()))
