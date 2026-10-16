// 絵の素材（空・質感・木・騎手の形）を base64 にして assets/<名前>.js に書き出す。file:// でも <script> で読めるように
// 使い方：node assets/pack_assets.js <素材を置いたフォルダ>
//   フォルダの中のファイル名は下の表のとおり。作り方と出典は assets/CREDITS.md
// 書き出したファイルは HS.ASSETS[名前] に 'data:<種類>;base64,...' を載せる
const fs = require('fs');
const path = require('path');

const LIST = [
  { key: 'sky_clear', file: 'kloofendal_48d_partly_cloudy_puresky.jpg', mime: 'image/jpeg', note: '晴れの空（Poly Haven「Kloofendal 48d Partly Cloudy (Pure Sky)」CC0。上 56% を切り出し 4096×1024 に）' },
  { key: 'sky_overcast', file: 'kloofendal_overcast_puresky.jpg', mime: 'image/jpeg', note: '曇りの空（Poly Haven「Kloofendal Overcast (Pure Sky)」CC0。上 56% を切り出し 2048×512 に）' },
  { key: 'turf_col', file: 'turf_col.jpg', mime: 'image/jpeg', note: '芝の色（ambientCG「Grass005」CC0。1024×1024）' },
  { key: 'turf_nor', file: 'turf_nor.jpg', mime: 'image/jpeg', note: '芝の凹凸（ambientCG「Grass005」NormalGL CC0。512×512）' },
  { key: 'grass_col', file: 'grass_col.jpg', mime: 'image/jpeg', note: 'コースの外の草地（ambientCG「Grass001」CC0。512×512）' },
  { key: 'dirt_col', file: 'dirt_col.jpg', mime: 'image/jpeg', note: 'ダートの砂の色（ambientCG「Ground054」CC0。1024×1024）' },
  { key: 'dirt_nor', file: 'dirt_nor.jpg', mime: 'image/jpeg', note: 'ダートの砂の凹凸（ambientCG「Ground054」NormalGL CC0。512×512）' },
  { key: 'tree', file: 'tree.png', mime: 'image/png', note: '木の板絵（Poly Haven「Island Tree 01」CC0 を Blender で2方向から描いた。1024×512）' },
  { key: 'jockey', file: 'jockey.glb', mime: 'model/gltf-binary', note: '騎手の体（Quaternius「Universal Base Characters」の男性 CC0 を、指の骨をまとめ面を減らし、部位を頂点色に入れた GLB）' },
];

function main() {
  const src = process.argv[2];
  if (!src) { console.error('使い方：node assets/pack_assets.js <素材のフォルダ>'); process.exit(1); }
  const outDir = __dirname;
  fs.mkdirSync(outDir, { recursive: true });
  for (const a of LIST) {
    const buf = fs.readFileSync(path.join(src, a.file));
    const js = `// ${a.note}。出典は assets/CREDITS.md。assets/pack_assets.js が書き出した。手で直さない\n` +
      `(globalThis.HS = globalThis.HS || {}).ASSETS = Object.assign(globalThis.HS.ASSETS || {}, { ${a.key}: 'data:${a.mime};base64,${buf.toString('base64')}' });\n`;
    fs.writeFileSync(path.join(outDir, a.key + '.js'), js);
    console.log(`${a.key}.js ${(js.length / 1024).toFixed(0)}KB`);
  }
}
if (require.main === module) main();
module.exports = { LIST };
