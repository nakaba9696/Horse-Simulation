# 頭の上の、輪郭の線の内側に抜けてしまった白い髪の穴を埋める（箱の中の囲まれた透明を、元の生成画像の色で不透明に）
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
src = np.array(Image.open(sys.argv[1]).convert("RGB"))
x0, y0, x1, y1 = [int(v) for v in sys.argv[2].split(",")]
for f in sys.argv[3:]:
    a = np.array(Image.open(f).convert("RGBA"))
    op = a[..., 3] > 100
    box = np.zeros(op.shape, bool); box[y0:y1, x0:x1] = True
    filled = ndimage.binary_fill_holes(ndimage.binary_closing(op, iterations=2)) & box
    hole = filled & (a[..., 3] < 250)
    a[hole, :3] = src[hole]; a[hole, 3] = 255
    Image.fromarray(a, "RGBA").save(f, "WEBP", quality=92, alpha_quality=100, method=6)
    print(f, int(hole.sum()))
