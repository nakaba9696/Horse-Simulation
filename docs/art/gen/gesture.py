# 身振りの差分：緑の地の元の絵の、胸から下（y0 より下）だけを inpaint で描き直し、緑の差で抜いて、上は基本の絵のまま重ねる
# 使い方：python gesture.py <緑の地の元.png> <基本.webp> <生成の値.json> <出す所の頭> y0 "<身振りのタグ>" den seed[,seed]
import base64, io, json, sys, subprocess, urllib.request
import numpy as np
from PIL import Image
from scipy import ndimage
src, basef, recf, outp, y0, gest, den, seeds = sys.argv[1:9]; y0 = int(y0)
rec = json.load(open(recf, encoding="utf-8"))
s = Image.open(src).convert("RGB"); W, H = s.size
mask = np.zeros((H, W), np.uint8); mask[y0:, :] = 255
enc = lambda im: (lambda bio: (im.save(bio, "PNG"), base64.b64encode(bio.getvalue()).decode())[1])(io.BytesIO())
pos = rec["prompt"].replace("upper body, portrait", "upper body, portrait, (hands visible:1.3)") + ", (dark navy blue long-sleeved dress:1.4), (white frilled apron with lace trim:1.2), " + gest
neg = rec["negative_prompt"] + ", (extra hands:1.5), (extra arms:1.5), (bad hands:1.4), (extra fingers:1.3), (black dress:1.5), (brooch:1.3), (bowtie:1.2)"
b = np.array(Image.open(basef).convert("RGBA")).astype(np.float32)
for sd in [int(v) for v in seeds.split(",")]:
    body = {"prompt": pos, "negative_prompt": neg, "seed": sd, "steps": 28, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
            "width": W, "height": H, "init_images": [enc(s)], "mask": enc(Image.fromarray(mask)), "denoising_strength": float(den), "inpainting_fill": 1,
            "inpaint_full_res": False, "mask_blur": 16, "resize_mode": 0,
            "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True}
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
    g = Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB"); g.save(f"{outp}_{sd}_gen.png")
    subprocess.run([sys.executable, "gkey.py", f"{outp}_{sd}_gen.png", f"{outp}_{sd}_k.webp"], check=True)
    subprocess.run([sys.executable, "rimfix.py", f"{outp}_{sd}_k.webp", f"{outp}_{sd}_k.webp", "40"], check=True)
    k = np.array(Image.open(f"{outp}_{sd}_k.webp").convert("RGBA")).astype(np.float32)
    yy = np.mgrid[:H, :W][0]
    m = np.clip((yy - (y0 - 10)) / 30, 0, 1)[..., None]
    o = b * (1 - m) + k * m
    Image.fromarray(o.round().clip(0, 255).astype(np.uint8), "RGBA").save(f"{outp}_{sd}.webp", "WEBP", quality=92, alpha_quality=100, method=6)
    body.pop("init_images"); body.pop("mask"); body["init_image"] = src; body["mask_rows_from"] = y0
    json.dump(body, open(f"{outp}_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(outp, sd, flush=True)
