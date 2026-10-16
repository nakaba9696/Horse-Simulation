# 骨入りの馬（assets/src/horse_rigged の glTF・bin・絵）を1つの GLB にし、base64 で assets/horse_rigged.js に書き出す
# 使い方：python3 tools/pack_horse.py   （絵は 1024 の JPEG に縮める。出典は assets/CREDITS.md）
import json, struct, base64, io, os
from PIL import Image, ImageFilter, ImageDraw
import numpy as np
ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'assets', 'src', 'horse_rigged')
g = json.load(open(os.path.join(SRC, 'scene.gltf'), encoding='utf8'))
binv = open(os.path.join(SRC, 'scene.bin'), 'rb').read()
# 毛色は描くときに色を付けるので、絵からは明るさの陰影（毛並み・筋肉の陰）だけを取り出す
#   細かい陰影＝明るさ ÷ ぼかした明るさ、大きな陰影＝ぼかした明るさ ÷ 中ほどの明るさ（白い流星・脚の下の白っぽい毛は抑える）
#   赤に 陰影 × 0.5 を入れる（2 倍まで表せるように）
im = Image.open(os.path.join(SRC, g['images'][0]['uri'])).convert('RGB').resize((1024, 1024), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255
L = a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11
Bl = np.asarray(Image.fromarray((L * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(12))).astype(np.float32) / 255
detail = np.clip(L / (Bl + 0.02), 0.45, 1.7)
low = np.clip(Bl / np.median(Bl[Bl > 0.08]), 0.78, 1.18)
shade = np.clip(detail * low * 0.5, 0, 1)
# 首の皮に描いてあるたてがみの毛の筋（絵の左の帯）は、ぼかして毛の筋を消す（たてがみは毛の房で描く）
MANE = [(0.02, 0.32), (0.1, 0.315), (0.2, 0.37), (0.3, 0.445), (0.39, 0.5), (0.38, 0.57), (0.3, 0.62), (0.22, 0.65), (0.1, 0.62), (0.02, 0.54)]
mm = Image.new('L', (1024, 1024), 0); ImageDraw.Draw(mm).polygon([(u * 1024, v * 1024) for u, v in MANE], fill=255)
mm = np.asarray(mm.filter(ImageFilter.GaussianBlur(12))).astype(np.float32) / 255
flat = np.asarray(Image.fromarray((np.clip(shade, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))).astype(np.float32) / 255
flat = np.clip(flat, 0.42, 0.55)
shade = shade * (1 - mm) + flat * mm
# 緑：たてがみ・尾の毛の印（絵の上の多角形。js/ui/horse_rigged.js の MANE_UV と同じ）
#   たてがみは首すじ（絵の毛の帯の上の縁）から下へ細い帯にする（サラブレッドのたてがみは短い）
CREST = [(0.03, 0.335), (0.1, 0.33), (0.2, 0.38), (0.3, 0.455), (0.37, 0.505)]
mask = Image.new('L', (1024, 1024), 0); d = ImageDraw.Draw(mask)
band = CREST + [(u, v + 0.16) for u, v in reversed(CREST)]
# たてがみ・尾は毛の房（js/ui/horse_rigged.js の hairCards）で描くので、印は空にしておく（首の皮は毛色のまま）
mask = mask.filter(ImageFilter.GaussianBlur(6))
im = Image.merge('RGB', [Image.fromarray((shade * 255).astype(np.uint8), 'L'), mask, Image.new('L', (1024, 1024), 0)])
buf = io.BytesIO(); im.save(buf, 'JPEG', quality=90, subsampling=0); jpg = buf.getvalue()
pad = lambda b, c=b'\0': b + c * ((4 - len(b) % 4) % 4)
binv = pad(binv)
off = len(binv)
g['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': len(jpg)})
g['images'] = [{'bufferView': len(g['bufferViews']) - 1, 'mimeType': 'image/jpeg'}]
allbin = pad(binv + jpg)
g['buffers'] = [{'byteLength': len(allbin)}]
js = pad(json.dumps(g, separators=(',', ':')).encode('utf8'), b' ')
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(allbin)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(allbin), 0x004E4942) + allbin
out = os.path.join(ROOT, 'assets', 'horse_rigged.js')
with open(out, 'w', encoding='utf8') as f:
    f.write('// 骨入りの馬「Horse Rigged(Game Ready)」abhayexe・CC-BY-4.0（出典は assets/CREDITS.md）。tools/pack_horse.py が書き出した。手で直さない\n')
    f.write("(globalThis.HS = globalThis.HS || {}).ASSETS = Object.assign(globalThis.HS.ASSETS || {}, { horse_rigged: 'data:model/gltf-binary;base64,%s' });\n" % base64.b64encode(glb).decode())
print('horse_rigged.js', os.path.getsize(out) // 1024, 'KB', 'jpg', len(jpg) // 1024, 'KB')
