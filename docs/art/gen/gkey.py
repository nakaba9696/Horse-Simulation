# 緑の地の絵を色の差で抜く：緑らしさ（G − max(R,B)）から柔らかい透明度 → 緑を引いて縁の色を戻す → にじみを抑える → 浮いたごみを消す
# 使い方：python gkey.py in.png out.webp
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
c = np.array(Image.open(sys.argv[1]).convert("RGB")).astype(np.float32)
K = np.array([0, 200, 0], np.float32)
s = np.clip(c[..., 1] - np.maximum(c[..., 0], c[..., 2]), 0, None)
border = np.concatenate([s[:8].ravel(), s[-8:].ravel(), s[:, :8].ravel(), s[:, -8:].ravel()])
bgS = float(np.median(border[border > 0.5 * border.max()]))
a = np.clip(1 - (s - 0.15 * bgS) / (0.7 * bgS), 0, 1)
keyish = s > 0.5 * bgS
a[~ndimage.binary_dilation(keyish, iterations=10)] = 1          # 緑から離れた所（体の内側）は不透明
lab, n = ndimage.label(a > 0.5)
if n > 1:
    sz = ndimage.sum(np.ones_like(a), lab, range(1, n + 1)); big = int(np.argmax(sz)) + 1
    keep = np.isin(lab, [j + 1 for j in range(n) if sz[j] >= 0.002 * sz.max()])
    a[(lab > 0) & ~keep] = 0
holes = (a < 0.5) & ~keyish; lab, n = ndimage.label(holes)
if n:
    sz = ndimage.sum(np.ones_like(a), lab, range(1, n + 1)); a[np.isin(lab, [j + 1 for j in range(n) if sz[j] < 80])] = 1
am = np.maximum(a, 1e-3)[..., None]
col = np.clip((c - (1 - a[..., None]) * K) / am, 0, 255)
solid = (a > 0.95) & (s < 6)
_, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
w = np.clip((a - 0.35) / 0.6, 0, 1)[..., None]
col = np.where(solid[..., None], col, c[iy, ix] * (1 - w) + col * w)
edge = ndimage.binary_dilation(keyish, iterations=3) & (a > 0)
gl = (col[..., 0] + col[..., 2]) / 2; col[..., 1] = np.where(edge, np.minimum(col[..., 1], np.maximum(gl, col[..., 1] - s)), col[..., 1])
sp = np.clip(col[..., 1] - np.maximum(col[..., 0], col[..., 2]), 0, None); col[..., 1] -= sp * edge
al = (a * 255).round(); al[al < 3] = 0
o = np.dstack([col, al]).round().clip(0, 255).astype(np.uint8); o[al == 0, :3] = 0
Image.fromarray(o, "RGBA").save(sys.argv[2], "WEBP", quality=92, alpha_quality=100, method=6)
print(sys.argv[2], "bgS", round(bgS, 1))
