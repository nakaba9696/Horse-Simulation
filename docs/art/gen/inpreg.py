# 元の生成画像（不透明）の一部だけを inpaint で描き直す。マスクは楕円（cx,cy,rx,ry）を ; で並べる。マスクの所以外は元のまま
# 使い方：python inpreg.py <元.png> <値.json> <出す頭> "cx,cy,rx,ry;..." "<足すタグ>" den seeds ["外すタグ,..."] ["ネガに足す"]
import base64, io, json, sys, urllib.request
import numpy as np
from PIL import Image
from scipy import ndimage
src, recf, outp, ells, add, den, seeds = sys.argv[1:8]
drop = [w.strip() for w in sys.argv[8].split(",")] if len(sys.argv) > 8 and sys.argv[8] else []
negx = sys.argv[9] if len(sys.argv) > 9 else ""
rec = json.load(open(recf, encoding="utf-8"))
pos = rec["prompt"]
for w in drop: pos = pos.replace(w + ", ", "").replace(", " + w, "")
pos += ", " + add
neg = rec["negative_prompt"] + (", " + negx if negx else "")
s = Image.open(src).convert("RGB"); W, H = s.size; yy, xx = np.mgrid[:H, :W]
m = np.zeros((H, W), bool)
for el in ells.split(";"):
    cx, cy, rx, ry = [float(v) for v in el.split(",")]
    m |= ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 < 1
enc = lambda im: (lambda bio: (im.save(bio, "PNG"), base64.b64encode(bio.getvalue()).decode())[1])(io.BytesIO())
soft = ndimage.gaussian_filter(m.astype(np.float32), 4)[..., None]
sa = np.array(s).astype(np.float32)
for sd in [int(v) for v in seeds.split(",")]:
    body = {"prompt": pos, "negative_prompt": neg, "seed": sd, "steps": 28, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
            "width": W, "height": H, "init_images": [enc(s)], "mask": enc(Image.fromarray((m * 255).astype(np.uint8))), "denoising_strength": float(den),
            "inpainting_fill": int(__import__("os").environ.get("FILL", 1)), "inpaint_full_res": False, "mask_blur": 8, "resize_mode": 0,
            "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True}
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
    g = np.array(Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").resize((W, H), Image.LANCZOS)).astype(np.float32)
    o = sa * (1 - soft) + g * soft
    Image.fromarray(o.round().astype(np.uint8)).save(f"{outp}_{sd}.png")
    body.pop("init_images"); body.pop("mask"); body["init_image"] = src; body["mask_ellipses"] = ells
    json.dump(body, open(f"{outp}_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(outp, sd, flush=True)
