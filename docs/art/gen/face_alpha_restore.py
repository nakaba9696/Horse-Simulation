# 白い地を抜いたときに顔・目・耳・首の肌まで抜けた所を、抜く前の絵から戻す（髪の外の縁で抜いた所はそのまま）
# 使い方：python face_alpha_restore.py <抜いたあと.png> <抜く前.png> <出す.png> y0,y1,x0,x1（抜けた所の始まりがこの範囲なら戻す）
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
A = np.array(Image.open(sys.argv[1]).convert("RGBA")); B = np.array(Image.open(sys.argv[2]).convert("RGBA"))
y0, y1, x0, x1 = [int(v) for v in sys.argv[4].split(",")]
d = ndimage.binary_dilation(B[..., 3].astype(int) - A[..., 3] > 30, iterations=2)
lab, n = ndimage.label(d); keep = np.zeros_like(d)
for i, (y, x) in enumerate(ndimage.find_objects(lab)):
    if y0 <= y.start <= y1 and x0 <= x.start <= x1: keep |= lab == i + 1
A[keep] = B[keep]
Image.fromarray(A).save(sys.argv[3])
