# 表情の差分を新しい基本に乗せ直す：差分が古い基本と違う画素だけ差分から、ほかは新しい基本から
# 使い方：python rebase.py <古い基本> <新しい基本> <出す所> <差分...>
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage
ob = np.array(Image.open(sys.argv[1]).convert("RGBA")).astype(np.int16)
nb = np.array(Image.open(sys.argv[2]).convert("RGBA"))
out = sys.argv[3]; os.makedirs(out, exist_ok=True)
for f in sys.argv[4:]:
    d = np.array(Image.open(f).convert("RGBA"))
    m = np.abs(d.astype(np.int16) - ob).max(-1) > 6
    m = ndimage.binary_closing(m, iterations=2) & (ob[..., 3] > 250)
    o = nb.copy(); o[m] = d[m]
    Image.fromarray(o, "RGBA").save(os.path.join(out, os.path.basename(f)), "WEBP", quality=92, alpha_quality=100, method=6)
    print(os.path.basename(f), int(m.sum()))
