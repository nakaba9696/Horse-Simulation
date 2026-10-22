# 地の色（端の色）を端から塗りつぶして純粋な緑 (0,200,0) に置き換える
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
c = np.array(Image.open(sys.argv[1]).convert("RGB")).astype(np.float32)
edge = np.concatenate([c[:4].reshape(-1, 3), c[-4:].reshape(-1, 3), c[:, :4].reshape(-1, 3), c[:, -4:].reshape(-1, 3)])
bgc = np.median(edge, 0)
near = np.abs(c - bgc).max(-1) < 28
lab, n = ndimage.label(near)
ids = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])); ids = ids[ids > 0]
sz = ndimage.sum(near, lab, range(1, n + 1))
bg = np.isin(lab, ids) | np.isin(lab, [j + 1 for j in range(n) if sz[j] >= 300])
sh = (np.abs(c - bgc * 0.8).max(-1) < 30) & (c[..., 1] > c[..., 0] + 15)   # 足もとの影（地の色を暗くした色）
bg |= sh
o = c.copy(); o[bg] = (0, 200, 0)
Image.fromarray(o.astype(np.uint8)).save(sys.argv[2]); print(bgc, bg.mean())
