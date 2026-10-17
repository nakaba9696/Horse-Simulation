// 画面の背景の絵と馬主の顔を、JS 版の素材（assets/*.js の base64）から Godot 版へ書き出す（godot/assets/ui/・godot/assets/owners/）
//   node godot/tools/export_ui_assets.js
// 出典とライセンスは assets/CREDITS.md（Godot 版の一覧は godot/CREDITS.md）。書き出したものは手で直さない
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'godot', 'assets');

function pull(file) {
  const src = fs.readFileSync(path.join(ROOT, 'assets', file), 'utf8');
  const out = {};
  const re = /([A-Za-z0-9_]+)\s*[:=]\s*'data:image\/([a-z]+);base64,([A-Za-z0-9+/=]+)'/g;
  let m;
  while ((m = re.exec(src))) out[m[1].replace(/^HS\.ASSETS\./, '')] = { ext: m[2] === 'jpeg' ? 'jpg' : m[2], buf: Buffer.from(m[3], 'base64') };
  return out;
}

let n = 0;
fs.mkdirSync(path.join(OUT, 'ui'), { recursive: true });
for (const k of ['title', 'home', 'shop', 'result', 'paddock']) {
  const got = pull(`ui_bg_${k}.js`);
  for (const [, v] of Object.entries(got)) { fs.writeFileSync(path.join(OUT, 'ui', `bg_${k}.${v.ext}`), v.buf); n++; }
}
fs.mkdirSync(path.join(OUT, 'owners'), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, 'assets')).filter(f => /^owners_.*\.js$/.test(f))) {
  for (const [key, v] of Object.entries(pull(f))) { fs.writeFileSync(path.join(OUT, 'owners', `${key.replace(/^owner_/, '')}.${v.ext}`), v.buf); n++; }
}
console.log(`書き出した：${n} 枚`);
