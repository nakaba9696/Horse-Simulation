# 白い袖の縁の抜き直し：箱の中だけ、元の絵の白い地を「上と右の端からつながる明るい所」として塗りつぶし、それ以外は不透明にする（下の端は袖が続くので種にしない）
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
src = np.array(Image.open(sys.argv[1]).convert("RGB")).astype(np.float32)
x0, y0, x1, y1 = [int(v) for v in sys.argv[3].split(",")]
c = src[y0:y1, x0:x1]
light = (c.min(-1) >= 228) & (c.max(-1) - c.min(-1) < 14)
line = c.mean(-1) < 215
light &= ~ndimage.binary_dilation(line, iterations=2)
lab, n = ndimage.label(light)
ids = np.unique(np.concatenate([lab[0], lab[:, -1]])); ids = ids[ids > 0]
bg = np.isin(lab, ids)
lightall = (c.min(-1) >= 228) & (c.max(-1) - c.min(-1) < 14)
for _ in range(4): bg |= ndimage.binary_dilation(bg, iterations=1) & lightall
alpha = np.where(bg, 0, 255).astype(np.float32)
edge = ndimage.binary_dilation(bg, iterations=1) & ~bg
alpha[edge] = np.clip((255 - c.mean(-1)[edge]) / 135 * 255, 90, 255)
for f in sys.argv[4:]:
    a = np.array(Image.open(f).convert("RGBA"))
    blk = a[y0:y1, x0:x1].copy()
    blk[..., :3] = c.astype(np.uint8); blk[..., 3] = alpha.astype(np.uint8)
    blk[blk[..., 3] == 0, :3] = 0
    a[y0:y1, x0:x1] = blk
    Image.fromarray(a, "RGBA").save(f, "WEBP", quality=92, alpha_quality=100, method=6)
    print(f)
