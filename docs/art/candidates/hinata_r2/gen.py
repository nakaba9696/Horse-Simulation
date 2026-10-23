# ひなたを 1 から再デザイン：互いにはっきり違う 6 案（style.json だけ・胸から上・1024 四方・緑の地で抜く）
import base64, io, json, sys, urllib.request
from PIL import Image
S = json.load(open("H:/game/trpg-game2/docs/art/style.json", encoding="utf-8"))
COMMON = "1girl, (young woman:1.3), (early 20s:1.2), youthful face, rustic, unrefined country girl, no makeup, kind big-sister smile, (large breasts:1.1), modest clothes, fully clothed, "
POST = ", solo, upper body, portrait, looking at viewer, facing viewer, simple background, (green background:1.3), (chroma key:1.1), character focus"
V = [
 ("A", "(short messy brown bob:1.4), freckles, round face, (yellow bandana on head:1.3), (green overalls:1.4), white t-shirt, work gloves tucked in pocket, holding a pitchfork"),
 ("B", "(long chestnut low twin braids:1.4), big round eyes, (straw hat:1.4), (green plaid flannel shirt:1.4), (yellow neckerchief:1.2), denim vest, holding a basket of corn"),
 ("C", "(black hair in a high ponytail:1.4), sharp friendly eyes, (fair skin:1.3), (green jersey track jacket:1.3), (yellow towel around neck:1.3), rubber boots, holding a milk can"),
 ("D", "(light brown wavy medium hair:1.3), (side ponytail with yellow scrunchie:1.4), droopy gentle eyes, (oversized green knit sweater:1.4), (cream apron:1.2), holding a newborn lamb"),
 ("E", "(dark brown hair in a low bun:1.4), (headscarf:1.3), thick eyebrows, (green work jacket with many pockets:1.4), yellow inner shirt, holding a bucket of feed, rolled sleeves"),
 ("F", "(short reddish-brown hair with hairclips:1.4), (yellow hairclips:1.3), cheerful wide grin, (green and yellow checkered blouse:1.4), (brown leather work apron:1.3), holding a horse brush"),
]
neg = S["negative"].replace(" breasts,", "") + ", (child:1.6), (loli:1.6), (makeup:1.4), (cleavage:1.6), (revealing clothes:1.6), (mature female:1.4), (old:1.4), (blush:1.3), (animal ears:1.7), (green hair:1.6), (tan:1.6), (dark skin:1.6), (tanned skin:1.6), (hair over one eye:1.4), white background, (multiple girls:1.6), text, scenery"
for k, body in [v for v in V if v[0] in sys.argv[2]] if len(sys.argv) > 2 else V:
    for sd in [int(s) for s in sys.argv[1].split(",")]:
        b = {"prompt": S["prefix"] + ", " + COMMON + body + POST, "negative_prompt": neg, "seed": sd, "steps": 24, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
             "width": 1024, "height": 1024, "override_settings": S["override_settings"], "override_settings_restore_afterwards": True}
        r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/txt2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
        Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"hr2/h{k}_{sd}.png")
        json.dump(b, open(f"hr2/h{k}_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(k, sd, flush=True)
