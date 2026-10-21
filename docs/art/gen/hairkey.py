# 髪の縁の抜き直し：birefnet の柔らかいマスクに、白い地との色の差で作る透明度を重ねる（暗い髪のまわりの帯だけ）
#   白い地のすき間（外の白とつながる明るい所）は透明に、髪の中の暗い所は不透明にする
# 使い方：python hairkey.py src.png(白い地) out.webp [band_px=28] [lum_max=150] [box x0,y0,x1,y1(元の大きさ。帯をこの中だけに)]
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
from rembg import new_session, remove
src, dst = sys.argv[1], sys.argv[2]
band_px = int(sys.argv[3]) if len(sys.argv) > 3 else 28
lum_max = float(sys.argv[4]) if len(sys.argv) > 4 else 150
# 箱の末尾に ",t" を付けた箱だけ、細く飛び出した線も消す
boxes = [b.split(",") for b in sys.argv[5].split(";")] if len(sys.argv) > 5 else []
tb = [[int(v) for v in b[:4]] for b in boxes if len(b) > 4 and b[4] == "t"]
boxes = [[int(v) for v in b[:4]] for b in boxes]
box = None
im = Image.open(src).convert("RGB"); c = np.array(im).astype(np.float32); H, W = c.shape[:2]
a = np.array(remove(im, session=new_session("birefnet-general"), only_mask=True, post_process_mask=False)).astype(np.float32) / 255
a[a < 0.04] = 0; a[a > 0.96] = 1
lab, n = ndimage.label(a > 0.5)
if n > 1:
    sz = ndimage.sum(np.ones_like(a), lab, range(1, n + 1)); big = lab == (int(np.argmax(sz)) + 1)
    a = np.where(ndimage.binary_dilation(big, iterations=6), a, 0)
lum = c @ np.array([0.299, 0.587, 0.114], np.float32)
# 帯：外（a<0.5）から band_px 以内
dout = ndimage.distance_transform_edt(a >= 0.5)
band = dout <= band_px
if box is not None:
    bm = np.zeros_like(band); bm[box[1]:box[3], box[0]:box[2]] = True; band &= bm
# 近くの不透明で暗い色（髪）
dark = (a > 0.9) & (lum < lum_max)
dark = ndimage.binary_erosion(dark, iterations=1)
dd, (iy, ix) = ndimage.distance_transform_edt(~dark, return_indices=True)
f = c[iy, ix]
near = band & (dd <= 10)
# 白い地との混ざり具合：c = a*f + (1-a)*255
den = np.maximum(255 - f, 1).sum(-1)
ac = np.clip(((255 - c) * (255 - f)).sum(-1) / np.maximum(((255 - f) ** 2).sum(-1), 1), 0, 1)
# 外の白とつながる白い地（髪のすき間）。肌を拾わないよう、白はかなり白く・色みの無い所だけ
chroma = c.max(-1) - c.min(-1)
white = (c.min(-1) > 236) & (chroma < 12)
wl, wn = ndimage.label(white | (a < 0.05))
ids = np.unique(np.concatenate([wl[0], wl[-1], wl[:, 0], wl[:, -1]])); ids = ids[ids > 0]
gap = band & np.isin(wl, ids) & white & (a > 0.04)
# 外とつながらない白い筋（髪と細い線のあいだ）：白い塊のほとんどが帯の中にある物
bl, bn = ndimage.label(white)
if bn:
    tot = ndimage.sum(np.ones_like(a), bl, range(1, bn + 1)); inb = ndimage.sum(band, bl, range(1, bn + 1))
    nd = ndimage.minimum(dd, bl, range(1, bn + 1))
    keep = [j + 1 for j in range(bn) if inb[j] >= 0.9 * tot[j] and nd[j] <= 4]
    hb = np.zeros_like(band)
    for b in boxes: hb[b[1]:b[3], b[0]:b[2]] = True
    gap |= np.isin(bl, keep) & band & hb & (a > 0.04)
# 髪の箱の中：明るい灰色のすき間も（白ほど白くない筋）、細く飛び出した線（枝毛）も消す
hb = np.zeros_like(band)
for b in boxes: hb[b[1]:b[3], b[0]:b[2]] = True
if boxes:
    w2 = (c.min(-1) > 185) & (chroma < 16) & hb & band
    bl2, bn2 = ndimage.label(w2)
    if bn2:
        nd2 = ndimage.minimum(dd, bl2, range(1, bn2 + 1))
        gap |= np.isin(bl2, [j + 1 for j in range(bn2) if nd2[j] <= 4]) & (a > 0.04)
    al = (a > 0.15) & ~gap
    core = ndimage.binary_dilation(ndimage.binary_opening(al, structure=np.ones((7, 7))), iterations=1)
    ht = np.zeros_like(band)
    for b in tb: ht[b[1]:b[3], b[0]:b[2]] = True
    thin = al & ~core & ht & band
    gap |= thin
    print("thin", int(thin.sum()))
a2 = a.copy()
a2[gap] = 0
ring = ndimage.binary_dilation(gap, iterations=2) & ~gap & band & (chroma < 30) & (dd <= 6)
a2[ring] = np.minimum(a[ring], ac[ring])
# 髪の中の暗い所の半透明は不透明に寄せる
semi = band & (lum < lum_max) & (a > 0.04) & (a < 0.95) & (dd <= 2)
a2[semi] = np.maximum(a[semi], ac[semi])
a2[a2 < 0.04] = 0; a2[a2 > 0.96] = 1
near = gap | ring | semi
print("changed px", int((np.abs(a2 - a) > 0.1).sum()), "gap", int(gap.sum()), "ring", int(ring.sum()), "semi", int(semi.sum()))
a = a2
fg = (c - (1 - a[..., None]) * 255) / np.maximum(a[..., None], 1e-3)
solid = a > 0.95; _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
bad = (a < 0.95) & ((fg < -10).any(-1) | (fg > 265).any(-1) | (a < 0.25))
fg = np.where(near[..., None] & ~bad[..., None], np.clip(fg, 0, 255), fg)
fg = np.where(bad[..., None], c[iy, ix], np.clip(fg, 0, 255))
pm = fg * a[..., None]
ow, oh = (512, 640) if (W, H) == (1024, 1280) else (W, H)
small = np.array(Image.fromarray(pm.round().astype(np.uint8)).resize((ow, oh), Image.LANCZOS)).astype(np.float32)
sa = np.array(Image.fromarray((a * 255).round().astype(np.uint8)).resize((ow, oh), Image.LANCZOS)).astype(np.float32)
rgb = np.clip(small / np.maximum(sa[..., None] / 255, 1e-3), 0, 255); rgb[sa < 1] = 0
Image.fromarray(np.dstack([rgb, sa]).round().astype(np.uint8), "RGBA").save(dst, "WEBP", quality=90, alpha_quality=100, method=6)
np.save(dst + ".a.npy", a)
print(dst)
