# 髪の毛束のすき間に閉じ込められた白い地を抜く：明るく彩度の低い画素の塊のうち、まわり（1〜2 画素外）の大部分が髪の色か透明の物
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
for f in sys.argv[1:]:
    a = np.array(Image.open(f).convert("RGBA")).astype(np.float32); c = a[..., :3]
    mx = c.max(-1); mn = c.min(-1); sat = (mx - mn) / np.maximum(mx, 1)
    tr = a[..., 3] < 40
    hair = (sat > 0.35) & (mx > 50) & (mx < 240) & ~tr & (c[..., 0] > c[..., 2] + 20)   # 栗色（赤み）
    white = (mn > 160) & (sat < 0.3) & ~tr
    lab, k = ndimage.label(white)
    sz = ndimage.sum(np.ones(lab.shape), lab, range(1, k + 1))
    ring_h = ndimage.sum((hair | tr).astype(np.float32), ndimage.grey_dilation(lab, size=(5, 5)) * (~white), range(1, k + 1))
    ring_all = ndimage.sum(np.ones(lab.shape), ndimage.grey_dilation(lab, size=(5, 5)) * (~white), range(1, k + 1))
    rm = np.zeros(lab.shape, bool)
    for j in range(k):
        if sz[j] < 4000 and ring_all[j] > 0 and ring_h[j] / ring_all[j] > 0.8:
            rm |= lab == j + 1
    edge = ndimage.binary_dilation(rm, iterations=1) & ~rm & ~tr & (mn > 120) & (sat < 0.35)
    a[rm] = 0
    a[edge, 3] *= 0.4
    Image.fromarray(a.round().clip(0, 255).astype(np.uint8), "RGBA").save(f)
    print(f, int(rm.sum()), int(edge.sum()))
