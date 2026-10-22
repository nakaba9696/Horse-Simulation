# ユニの水着の全身立ち絵：trpg-game の style.json と同じ設定で txt2img（緑の地・1024×1536）
import base64, io, json, sys, urllib.request
from PIL import Image
S = json.load(open("H:/game/trpg-game2/docs/art/style.json", encoding="utf-8"))
body = ("1girl, adult woman, 21 years old, slim, (light greyish beige hair:1.4), (ash grey hair:1.2), (chin-length inward curled bob:1.3), blunt bangs, (closed eyes:1.5), gentle smile, "
        "(white frilled maid headdress:1.3), (navy blue bikini with white maid frills:1.5), (frilled bikini top:1.3), (frilled skirt bikini bottom:1.4), "
        "(white frilled wrist cuffs:1.1), bare shoulders, bare arms, (holding a navy notebook:1.2), sandals, standing, full body, looking at viewer, facing viewer, "
        "simple background, (plain green background:1.5), (chroma key green:1.3), (solo:1.5), (1girl:1.3)")
neg = (S["negative"].replace(" swimsuit,", "").replace(" breasts,", "").replace(" cleavage,", "").replace(" revealing clothes,", "")
       + ", (choker:1.7), (collar:1.6), (neck ribbon:1.6), (necklace:1.4), (large breasts:1.5), (cleavage:1.4), (nipples:1.8), (nude:1.8), (topless:1.8), "
       "(child:1.6), (loli:1.6), (open eyes:1.4), (cropped:1.4), (green hair:1.5), (green clothes:1.4), white background, beach, ocean, scenery, (multiple girls:1.8), (2girls:1.8), (3girls:1.8), (twins:1.6), (brown hair:1.4), (curly hair:1.4), (wavy hair:1.3), (apron:1.4)")
for sd in [int(s) for s in sys.argv[1].split(",")]:
    b = {"prompt": S["prefix"] + ", " + body, "negative_prompt": neg, "seed": sd, "steps": 24, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
         "width": 1024, "height": 1536, "override_settings": S["override_settings"], "override_settings_restore_afterwards": True}
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/txt2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
    Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"swf/yuni_swim_{sd}.png")
    json.dump(b, open(f"swf/yuni_swim_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(sd, flush=True)
