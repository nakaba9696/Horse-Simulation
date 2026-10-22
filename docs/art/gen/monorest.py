# 基本の片眼鏡（金色の縁と鎖）の画素を差分の上に戻す
import sys
import numpy as np
from PIL import Image
b = np.array(Image.open(sys.argv[1]).convert("RGBA")).astype(np.float32)
c = b[..., :3] / 255; mx = c.max(-1); mn = c.min(-1); d = mx - mn + 1e-6
r, g, bl = c[..., 0], c[..., 1], c[..., 2]
h = np.where(mx == r, ((g - bl) / d) % 6, np.where(mx == g, (bl - r) / d + 2, (r - g) / d + 4)) * 60
s = d / (mx + 1e-6)
gold = (h > 30) & (h < 60) & (s > 0.35) & (mx > 0.35)
box = np.zeros(gold.shape, bool); box[380:820, 380:560] = True
from scipy import ndimage
m = ndimage.binary_dilation(gold & box, iterations=1)
for f in sys.argv[2:]:
    a = np.array(Image.open(f).convert("RGBA")); a[m] = b[m].astype(np.uint8)
    Image.fromarray(a, "RGBA").save(f, "WEBP", quality=92, alpha_quality=100, method=6)
print(int(m.sum()))
