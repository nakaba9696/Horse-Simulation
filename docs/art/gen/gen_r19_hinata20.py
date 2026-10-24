# ひなた 20 案（19 回目）：style.json だけ・胸から上・1024 四方・緑の地。ほかのオーナーとかぶる属性はネガティブで避ける
import base64, io, json, sys, urllib.request
from PIL import Image
S = json.load(open("H:/game/trpg-game2/docs/art/style.json", encoding="utf-8"))
POST = ", solo, upper body, portrait, (head size about one third of image width:1.2), looking at viewer, simple background, (green background:1.3), (chroma key:1.1), character focus"
PRE = "1girl, (adult woman:1.4), (mature face:1.1), 22 years old, rural ranch girl, "
HN = ", (child:1.6), (loli:1.6), (makeup:1.2), (cleavage:1.6), (revealing clothes:1.6), (old:1.4), (animal ears:1.7), (green hair:1.6), (glasses:1.5), (maid:1.6), (blonde ponytail:1.5), (light blue hair:1.5), (hair bun:1.2), (dress:1.2), (multiple girls:1.6), (multiple views:1.8), (reference sheet:1.7), (character sheet:1.7), (chibi:1.7), (bird:1.7), (animal:1.6), (creature:1.6), (mascot:1.6), white background, text, scenery"
H = [
 ("01", "(chubby:1.4), (plump round cheeks:1.4), (short bob brown hair:1.3), (big open-mouth laugh:1.4), (green plaid flannel shirt:1.3), (yellow scarf:1.1), cheerful"),
 ("02", "(tanned skin:1.4), (very short pixie cut black hair:1.4), (athletic:1.4), (green coveralls tied at waist:1.3), (yellow tank top:1.3), (towel around neck:1.1), sporty grin"),
 ("03", "(red hair in two braids:1.5), (freckles:1.5), (green knit sweater:1.3), (yellow ribbon hair ties:1.2), (bright smile:1.2), country girl"),
 ("04", "(gyaru:1.4), (bright light-brown dyed hair, long, straight:1.3), (colorful nail art:1.3), (unzipped green work jacket worn off shoulder:1.2), (yellow t-shirt:1.2), (hoop earrings:1.1), peace sign, playful grin"),
 ("05", "(delinquent big sister:1.4), (sharp eyes:1.4), (long bangs held back by a towel headband:1.4), (dark brown hair:1.2), (green tracksuit jacket:1.4), (yellow line on jacket:1.1), confident smirk, arms crossed"),
 ("06", "(airhead:1.3), (droopy eyes:1.5), (fluffy light brown wavy short hair:1.3), (straw hat:1.5), (yellow sunflower on hat:1.2), (green gingham shirt:1.2), dreamy open-mouth smile"),
 ("07", "(boyish:1.5), (short messy dark brown hair:1.3), (green baseball cap:1.4), (yellow-green overalls:1.3), (white t-shirt:1.1), mischievous grin"),
 ("08", "(tall muscular woman:1.5), (strong toned arms:1.4), (rolled up sleeves:1.4), (dark hair low ponytail:1.2), (green work shirt:1.3), (yellow work gloves:1.2), carrying a hay bale on shoulder, reliable smile"),
 ("09", "(petite:1.4), (energetic:1.4), (ahoge:1.5), (short orange-brown hair:1.3), (yellow towel around neck:1.3), (green hoodie:1.3), (big sparkling eyes:1.2), waving, wide smile"),
 ("10", "(snow-white pale skin:1.4), (silver-white short hair:1.4), (yellow knit beanie:1.3), (green fluffy earmuffs:1.4), (white winter coat:1.1), (breath visible:1.1), gentle smile"),
 ("11", "(winter work clothes:1.4), (green down vest:1.4), (yellow thick muffler wrapped up to chin:1.4), (dark brown shoulder-length hair:1.2), (rosy cheeks:0.8), warm eyes, small smile"),
 ("12", "(sleepy half-closed eyes:1.5), (jitome:1.4), (downer:1.3), (messy dark grey-brown hair:1.3), (oversized green hoodie:1.3), (yellow drawstrings:1.1), (yawning:1.1), deadpan"),
 ("13", "(tsundere:1.3), (pouting sulky face:1.4), (arms crossed:1.4), (dark auburn shoulder-length hair:1.3), (green work jacket:1.3), (yellow bandana on neck:1.2), looking away slightly, annoyed"),
 ("14", "(motherly calm big sister:1.4), (gentle eyes:1.3), (dark brown hair in a low single tie over shoulder:1.4), (green cardigan:1.4), (yellow blouse:1.2), soft kind smile"),
 ("15", "(veterinary student:1.4), (white lab coat over green work clothes:1.4), (stethoscope around neck:1.4), (black short hair with hairclip:1.2), (yellow hairclip:1.2), (holding a clipboard:1.1), intelligent smile"),
 ("16", "(side ponytail:1.5), (brown hair:1.3), (yellow scrunchie:1.3), (green zip-up jacket:1.3), (energetic wink:1.3), cheerful"),
 ("17", "(black bob cut with straight bangs:1.5), (okappa:1.4), (plain simple face:1.3), (green knitted vest:1.3), (yellow shirt:1.2), (shy small smile:1.2), rustic"),
 ("18", "(showa era farm girl:1.4), (tenugui headscarf on head:1.5), (kappogi apron:1.4), (yellow and green tenugui pattern:1.2), (dark hair:1.2), (monpe:1.1), friendly smile"),
 ("19", "(biker girl:1.4), (brown leather jacket:1.4), (goggles on forehead:1.5), (green scarf:1.3), (short wind-swept dark brown hair:1.3), (yellow motorcycle gloves:1.2), confident grin"),
 ("20", "(dairy farm girl:1.4), (yellow bandana on head:1.4), (green apron:1.4), (holding a glass milk bottle:1.4), (light brown hair in a low braid:1.2), (white shirt:1.1), bright smile"),
]
OUTD = sys.argv[1]; seeds = [int(s) for s in sys.argv[2].split(",")]; only = sys.argv[3].split(",") if len(sys.argv) > 3 else None
for k, body in H:
    if only and k not in only: continue
    neg = S["negative"].replace(" breasts,", "") + HN
    if k in ("02",): neg = neg  # 日焼けは 02 だけ（ほかでも打ち消していない）
    else: neg += ", (tan:1.4), (dark skin:1.4)"
    for sd in seeds:
        b = {"prompt": S["prefix"] + ", " + PRE + body + POST, "negative_prompt": neg, "seed": sd, "steps": 24, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
             "width": 1024, "height": 1024, "override_settings": S["override_settings"], "override_settings_restore_afterwards": True}
        r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/txt2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
        Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"{OUTD}/h{k}_{sd}.png")
        json.dump(b, open(f"{OUTD}/h{k}_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(k, sd, flush=True)
