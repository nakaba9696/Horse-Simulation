# 髪のそばの白い島（服の大きな白とは別の、閉じた白い塊）を抜く。白い塊は「暗い線」で区切って数える
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
for f in sys.argv[1:]:
    a = np.array(Image.open(f).convert("RGBA")).astype(np.float32); c = a[..., :3]
    mx = c.max(-1); mn = c.min(-1); sat = (mx - mn) / np.maximum(mx, 1); lum = c.mean(-1)
    tr = a[..., 3] < 40
    hair = (sat > 0.3) & (mx > 50) & (mx < 245) & ~tr & (c[..., 0] > c[..., 2] + 15)
    white = (mn > 150) & (sat < 0.3) & ~tr & ~hair
    lab, k = ndimage.label(white)
    sz = ndimage.sum(np.ones(lab.shape), lab, range(1, k + 1))
    dil = ndimage.grey_dilation(lab, size=(5, 5)); ring = (dil > 0) & ~white
    nh = ndimage.sum(hair.astype(np.float32), np.where(ring, dil, 0), range(1, k + 1))
    nall = ndimage.sum(np.ones(lab.shape), np.where(ring, dil, 0), range(1, k + 1))
    H, W = tr.shape; yy, xx = np.mgrid[:H, :W]
    face = ((xx - 505) / 175) ** 2 + ((yy - 400) / 190) ** 2 < 1
    keepz = face | ((xx > 380) & (xx < 680) & (yy > 560) & (yy < 820))   # 顔・襟・ブローチ
    cx = ndimage.mean(xx, lab, range(1, k + 1)); cy = ndimage.mean(yy, lab, range(1, k + 1))
    rm = np.zeros(lab.shape, bool)
    for j in range(k):
        if sz[j] < 2500 and nall[j] > 0 and nh[j] / nall[j] > 0.4 and not keepz[int(cy[j]), int(cx[j])]:
            rm |= lab == j + 1
    a[rm] = 0
    Image.fromarray(a.round().clip(0, 255).astype(np.uint8), "RGBA").save(f)
    print(f, int(rm.sum()))
