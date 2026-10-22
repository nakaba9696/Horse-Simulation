# 元の生成画像から全体の img2img（seed・設定は元の値、プロンプトだけ置き換え）
# 使い方：python i2i.py <元.png> <値.json> <出す頭> den seeds "<置き換え前>=><後>|..." "<ネガに足す>"
import base64, io, json, sys, urllib.request
from PIL import Image
src, recf, outp, den, seeds, reps = sys.argv[1:7]; negx = sys.argv[7] if len(sys.argv) > 7 else ""
rec = json.load(open(recf, encoding="utf-8"))
pos = rec["prompt"]
for r in reps.split("|"):
    a, b = r.split("=>"); assert a in pos, a; pos = pos.replace(a, b)
enc = lambda im: (lambda bio: (im.save(bio, "PNG"), base64.b64encode(bio.getvalue()).decode())[1])(io.BytesIO())
s = Image.open(src).convert("RGB")
for sd in [int(v) for v in seeds.split(",")]:
    body = {"prompt": pos, "negative_prompt": rec["negative_prompt"] + (", " + negx if negx else ""), "seed": sd, "steps": 24, "cfg_scale": 5.5, "sampler_name": "Euler a",
            "scheduler": "Automatic", "width": s.width, "height": s.height, "init_images": [enc(s)], "denoising_strength": float(den), "resize_mode": 0,
            "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True}
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
    Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"{outp}_{sd}.png")
    body.pop("init_images"); body["init_image"] = src
    json.dump(body, open(f"{outp}_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(outp, sd, flush=True)
