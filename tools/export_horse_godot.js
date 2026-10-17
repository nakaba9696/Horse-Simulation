// 骨入りの馬（js/ui/horse_rigged.js がサラブレッドの比へ写し直した形）を Godot 版のために書き出す
//   NODE_PATH=$(npm root -g) node tools/export_horse_godot.js   → godot/assets/horse_rigged/horse.json と shade.jpg
// ブラウザ版と同じ形にするため、比の写し直し・たてがみと尾の房・頭絡は JS の作り（HS.HorseRigged）をそのまま
// Playwright の Chromium で動かし、できた形（頂点・骨・重み）を書き出す。Godot 側（godot/view/horse_model.gd）はこれを読んで組む。
// 座標は素材の座標（+Z が前・+X が馬の左・+Y が上・地面が y=0）。骨の rest は親の骨からの行列（親が骨でない所はたどって畳む）
// 出典：「Horse Rigged(Game Ready)」abhayexe・CC-BY-4.0（assets/CREDITS.md・godot/CREDITS.md）
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'godot', 'assets', 'horse_rigged');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForFunction(() => globalThis.HS && HS.HorseRigged && ['ok', 'error'].includes(HS.HorseRigged.state), null, { timeout: 60000 });
  const data = await page.evaluate(() => {
    const HR = HS.HorseRigged;
    if (HR.state !== 'ok') return { err: String(HR.err) };
    const hb = HS.Race3D._ik.horseBones();
    const r = HR.make({ coat: '鹿毛', name: 'x', num: 1, noMarks: true }, hb);
    // 素材の馬だけを、置き方（回転・拡大）を外した素材の座標で
    const body = r.body;
    body.parent.remove(body);
    body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); body.scale.set(1, 1, 1);
    body.updateMatrixWorld(true);
    const mesh = r.mesh, sk = mesh.skeleton, bones = sk.bones;
    const round = (a, k) => Array.from(a, v => Math.round(v * k) / k);
    const geo = (g, extra) => {
      const A = g.attributes, o = {
        pos: round(A.position.array, 1e5), nor: round(A.normal.array, 1e4),
        si: Array.from(A.skinIndex.array), sw: round(A.skinWeight.array, 1e4), idx: Array.from(g.index.array),
      };
      if (A.uv) o.uv = round(A.uv.array, 1e5);
      if (A.color) o.col = round(A.color.array, 1e3);
      for (const k of extra || []) if (A[k]) o[k] = round(A[k].array, 1e3);
      return o;
    };
    // 骨の付け根の行列（素材の座標）。親の骨が無い骨は素材の座標そのまま
    const world = bones.map(b => b.matrixWorld.clone());
    const parentOf = b => { let p = b.parent; while (p && !p.isBone) p = p.parent; return p ? bones.indexOf(p) : -1; };
    const M = new THREE.Matrix4();
    const out = bones.map((b, i) => {
      const p = parentOf(b);
      M.copy(world[i]); if (p >= 0) M.premultiply(new THREE.Matrix4().copy(world[p]).invert());
      return { name: HR.keyOf(b.name), parent: p, rest: round(M.elements, 1e6) };
    });
    // 頂点の行列（形の中 → 素材の座標）。毛と頭絡も同じ
    const meshM = round(mesh.matrixWorld.elements, 1e6);
    const hair = mesh.parent.children.find(o => o.isSkinnedMesh && o !== mesh && o.material.map);
    const bridle = mesh.parent.children.find(o => o.isSkinnedMesh && o !== mesh && o !== hair);
    // 毛の束の絵（canvas）
    const hairPng = hair.material.map.image.toDataURL('image/png');
    const inv = sk.boneInverses.map(m => round(m.elements, 1e6));
    const info = HR.info();
    const plain = v => v && v.isVector3 ? [v.x, v.y, v.z] : v;
    const infoOut = {}; for (const [k, v] of Object.entries(info)) infoOut[k] = k === 'place' ? v : plain(v);
    return {
      about: '骨入りの馬（Horse Rigged(Game Ready) abhayexe・CC-BY-4.0）を js/ui/horse_rigged.js でサラブレッドの比へ写し直した形。tools/export_horse_godot.js が書き出す。手で直さない',
      bones: out, inverses: inv, mesh_matrix: meshM,
      body: geo(mesh.geometry, ['aHair']), hair: geo(hair.geometry), bridle: geo(bridle.geometry),
      info: infoOut, hairPng,
      // 手作りの馬の寸法（Godot 側で騎手と鞍を置くため）
      handmade: { size: HS.Race3D.handmadeSize(), J1: HS.Race3D.BONE_AT(1), head: (() => { const h = HS.Race3D.handmadeHead(); return { start: [h.start.x, h.start.y, h.start.z], nose: [h.nose.x, h.nose.y, h.nose.z], width: h.width }; })() },
    };
  });
  await browser.close();
  if (data.err || errors.length) throw new Error('書き出せない: ' + (data.err || errors.join('\n')));
  const png = data.hairPng; delete data.hairPng;
  fs.writeFileSync(path.join(OUT, 'hair.png'), Buffer.from(png.slice(png.indexOf(',') + 1), 'base64'));
  // 陰影の絵：assets/horse_rigged.js の GLB の中の JPEG（tools/pack_horse.py が作った、明るさの陰影だけの絵）
  const js = fs.readFileSync(path.join(ROOT, 'assets', 'horse_rigged.js'), 'utf8');
  const glb = Buffer.from(js.slice(js.indexOf('base64,') + 7, js.lastIndexOf("'")), 'base64');
  const jl = glb.readUInt32LE(12), g = JSON.parse(glb.slice(20, 20 + jl).toString('utf8'));
  const binStart = 20 + jl + 8, bv = g.bufferViews[g.images[0].bufferView];
  fs.writeFileSync(path.join(OUT, 'shade.jpg'), glb.slice(binStart + (bv.byteOffset || 0), binStart + (bv.byteOffset || 0) + bv.byteLength));
  fs.writeFileSync(path.join(OUT, 'horse.json'), JSON.stringify(data));
  const kb = f => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0) + 'KB';
  console.log(`horse.json ${kb('horse.json')}（骨 ${data.bones.length}・頂点 ${data.body.pos.length / 3}・毛 ${data.hair.pos.length / 3}・頭絡 ${data.bridle.pos.length / 3}）・shade.jpg ${kb('shade.jpg')}・hair.png ${kb('hair.png')}`);
}
main().catch(e => { console.error(e); process.exit(1); });
