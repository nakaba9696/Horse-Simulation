# 髪の外の縁の白い細線を消す：透明に接する所から n 画素以内の、明るく彩度の低い画素を、内側のいちばん近い髪の色で塗る（アルファは保つ）。
# 塗れない（近くに髪が無い）所はアルファを落とす。顔・服（白いブラウス）は箱の外にして守る
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
boxes = [[int(v) for v in b.split(",")] for b in sys.argv[1].split(";")]
n = int(sys.argv[2])
for f in sys.argv[3:]:
    a = np.array(Image.open(f).convert("RGBA")).astype(np.float32); c = a[..., :3]
    H, W = c.shape[:2]; box = np.zeros((H, W), bool)
    for x0, y0, x1, y1 in boxes: box[y0:y1, x0:x1] = True
    tr = a[..., 3] < 40
    near = ndimage.distance_transform_edt(~tr) <= n
    mx = c.max(-1); mn = c.min(-1); sat = (mx - mn) / np.maximum(mx, 1)
    whiteish = (mn > 150) & (sat < 0.28) & ~tr
    lab, k = ndimage.label(whiteish)
    sz = ndimage.sum(np.ones(lab.shape), lab, range(1, k + 1))
    big = np.isin(lab, [j + 1 for j in range(k) if sz[j] > 3000])   # 服・顔など大きな白い所は守る
    core = ndimage.binary_opening(big, structure=np.ones((19, 19)))
    thinw = big & ~ndimage.binary_dilation(core, iterations=1) & (ndimage.distance_transform_edt(~tr) <= 22)
    m = near & whiteish & box & ~big
    hair = (sat > 0.35) & (mx > 60) & (mx < 235) & (a[..., 3] > 200) & ~m
    d, (iy, ix) = ndimage.distance_transform_edt(~hair, return_indices=True)
    ok = m & (d <= 6)
    a[ok, :3] = c[iy[ok], ix[ok]]
    bad = m & ~ok
    a[bad, 3] = 0; a[bad, :3] = 0
    # 半透明の明るい縁も髪色に
    semi = near & box & (a[..., 3] > 0) & (a[..., 3] < 200) & (c.min(-1) > 140) & ~ndimage.binary_dilation(big, iterations=2)
    a[semi, :3] = c[iy[semi], ix[semi]]
    Image.fromarray(a.round().clip(0, 255).astype(np.uint8), "RGBA").save(f)
    print(f, int(ok.sum()), int(bad.sum()), int(semi.sum()))
