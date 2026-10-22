# 箱の中の、半透明で明るい画素（白い地のなごり）を透明にする
import sys
import numpy as np
from PIL import Image
x0, y0, x1, y1 = [int(v) for v in sys.argv[1].split(",")]
for f in sys.argv[2:]:
    a = np.array(Image.open(f).convert("RGBA")); c = a[..., :3].astype(int)
    box = np.zeros(a.shape[:2], bool); box[y0:y1, x0:x1] = True
    m = box & (a[..., 3] < 220) & (c.min(-1) > 90) & (c.max(-1) - c.min(-1) < 24)
    a[m] = 0
    Image.fromarray(a, "RGBA").save(f, "WEBP", quality=92, alpha_quality=100, method=6)
    print(f, int(m.sum()))
