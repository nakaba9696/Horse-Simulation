# 引いた構図にする：透過の基本の絵を s 倍に縮めて (ox,oy) に置き、外側（と縁から band px 内側）を緑の地のまま inpaint で描き足す（1 枚の不透明な絵を出す）
# 使い方：python outframe.py <基本.png> <値.json> <出す頭> s ox oy band den seeds ["足すタグ"] ["ネガに足す"]
import base64, io, json, sys, urllib.request
import numpy as np
from PIL import Image
from scipy import ndimage
basef, recf, outp, s, ox, oy, band, den, seeds = sys.argv[1:10]
addp = sys.argv[10] if len(sys.argv) > 10 else ""; addn = sys.argv[11] if len(sys.argv) > 11 else ""
s, ox, oy, band = float(s), int(ox), int(oy), int(band)
b = Image.open(basef).convert("RGBA"); n = round(1024 * s)
bs = b.resize((n, n), Image.LANCZOS)
G = (0, 200, 0)
can = Image.new("RGBA", (1024, 1024), G + (255,)); can.alpha_composite(bs, (ox, oy))
inner = np.zeros((1024, 1024), bool); inner[max(oy, 0):oy + n, max(ox, 0):ox + n] = True
# 元の絵の縁で人が切れていた辺だけ内側へ band 広げる（切れていない辺は元のまま）
a = np.array(b)[..., 3] > 128; cut = {"top": a[0].any(), "bottom": a[-1].any(), "left": a[:, 0].any(), "right": a[:, -1].any()}
keep = inner.copy()
if cut["top"]: keep[oy:oy + band] = False
if cut["bottom"]: keep[oy + n - band:oy + n] = False
if cut["left"]: keep[:, ox:ox + band] = False
if cut["right"]: keep[:, ox + n - band:ox + n] = False
mask = ~keep
enc = lambda im: (lambda bio: (im.save(bio, "PNG"), base64.b64encode(bio.getvalue()).decode())[1])(io.BytesIO())
rec = json.load(open(recf, encoding="utf-8"))
pos = rec["prompt"] + (", " + addp if addp else "")
neg = rec["negative_prompt"] + (", " + addn if addn else "")
np.save(outp + "_keep.npy", keep)
json.dump({"s": s, "ox": ox, "oy": oy, "n": n, "band": band, "cut": {k: bool(v) for k, v in cut.items()}}, open(outp + "_frame.json", "w"))
for sd in [int(v) for v in seeds.split(",")]:
    body = {"prompt": pos, "negative_prompt": neg, "seed": sd, "steps": 26, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
            "width": 1024, "height": 1024, "init_images": [enc(can.convert("RGB"))], "mask": enc(Image.fromarray((mask * 255).astype(np.uint8))),
            "denoising_strength": float(den), "inpainting_fill": int(__import__("os").environ.get("FILL", "1")), "inpaint_full_res": False, "mask_blur": 6, "resize_mode": 0,
            "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True}
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
    Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"{outp}_{sd}.png")
    print(outp, sd, cut, flush=True)
