// レースの3D：Three.js（lib/three.min.js、r128。グローバルの THREE）で、コース・馬・騎手を立体で描く
// 使い方：
//   const r3 = HS.Race3D.create(canvas, setup)  // setup = { D, surface, ground, course, track, horses:[{num,frame,cap,silks,coat,name,age,mine}] }
//   r3.render(view, cam, orbit)   // view = { t, horses:[{x,lane,v,push?,whip?（ムチを入れてからの秒）,pose?（ガッツポーズからの秒）}], me, phase:'gate'|'race'|'finish', fix? }、cam = 'ride'|'tv'|'gate'|'fixed'（fix の位置から。止め絵用）
//   orbit = { yaw, pitch, zoom }（カメラの回転。yaw は左右の回り込み[rad]、pitch は上下[-0.3〜1.2]、zoom は距離の倍率）
//   r3.resize(w, h, dpr) / r3.dispose() / r3.info()
//   HS.Race3D.supported()  // WebGL が使えるか
//   setup.horses[i] には age（満年齢。芦毛の白さ）・gear（馬具。無ければ data/gear.js から名前で引く）も渡せる
//   setup には、確かめ用に noShadow（太陽の影なし）・noDust（蹴り上げなし）・handmade（素材を使わず手作りの絵と形で）・handmadeJockey（騎手だけ手作り）も渡せる
//   r3.info() は { calls, triangles, photo（素材の絵を使っている）, jockey（素材の騎手）, shadow, dust, level（重さで落とした段 0〜2） }
//   render の戻り値：{ horses: [{ i, sx, sy, k, z }] }（画面に出た馬の頭の上の位置・1mあたりの画素・奥行き。名前の札などを重ねるとき用）
// 座標：コースの上から見た位置 (x, y)（js/core/track.js。y は上向き）を、3D では (X, Y, Z) = (x, 高さ, -y) にする
// 乱数は使わない（揺らぎは番号・位置から決まる値で出す）
// 素材：assets/*.js が HS.ASSETS に載せた絵（空・芝・ダート・草地・木の板絵）と騎手の形（GLB）を使う（出典は assets/CREDITS.md）。
//       読み込みは R3.preload（このファイルを読んだときに始まる）。読めていない素材は、手作りの絵と形で代わりに描く。
//       騎手の GLB は lib/GLTFLoader.js で読み、lib/SkeletonUtils.js で骨ごと複製する。動きは手作りの骨（24〜31）に IK で合わせる
// 色：出力は sRGB、色の調子は ACESFilmic。色の値（#rrggbb）は線形に直してから材質へ渡す（lin）
// 重さ：馬1頭＝骨つきの形1つ（材質1つ・描く回数1回）＋騎手1つ。形は全頭で共有し（近く・遠くの2つ）、色・勝負服・ゼッケンは馬ごとの小さな絵（512×512）で変える。
//       景色は材質ごとに1つの形へまとめる。影は太陽の影（見ている所のまわりだけ）と、足元の丸い影の板（まとめて1回）。
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const R3 = HS.Race3D = {};
  const TAU = Math.PI * 2;

  const LANE_M = 1.6;     // 進路1つの幅（m）
  const LANE0 = 1.0;      // ラチ沿い（lane 0）の馬の、内ラチからの距離（m）
  const GATE_P = 1.25;    // ゲートの枠の間隔（m）
  const GATE_OPEN = 2.5;  // 発走からこの秒で、枠の間隔から実際の進路へ寄せる
  const STRIDE = 7.2;     // 一完歩の長さ（m）
  const BODY = 1.2;       // 馬の位置 x（鼻先）から胴のまん中までの長さ（m）
  const TRACK_W = 27;     // 馬場の幅（m）
  const FONT = '"Noto Sans JP", sans-serif';
  const DEF_SILKS = { base: '#1f4fbf', sub: '#ffd23f', pattern: 'plain' };

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const uOf = lane => LANE0 + Math.max(0, lane || 0) * LANE_M;
  // 整数から決まった 0〜1 の値（見た目の揺らぎ用）
  function hash01(a, b) {
    let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
    h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function strHash(s) {
    let h = 2166136261;
    s = String(s);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h | 0;
  }

  // ---- WebGL が使えるか ----
  let SUP = null;
  R3.supported = function () {
    if (SUP !== null) return SUP;
    try {
      if (typeof THREE === 'undefined' || typeof document === 'undefined') return (SUP = false);
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      SUP = !!gl;
      if (gl) { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
    } catch (e) { SUP = false; }
    return SUP;
  };

  // ---- 色（馬場の状態で変える） ----
  function lookOf(surface, ground, weather) {
    const dirt = surface === 'ダ';
    const wet = ({ '良': 0, '稍重': 1, '重': 2, '不良': 3 })[ground] || 0;
    const overcast = wet >= 2 || weather === '曇' || weather === '雨' || weather === '雪'; // 天気を決めたレース（フリーレース）は天気でも
    return {
      dirt, wet, overcast,
      skyTop: overcast ? '#76838f' : wet === 1 ? '#4f88c6' : '#2f74cc',
      skyHor: overcast ? '#c3c9ce' : '#d2e6f2',
      cloud: overcast ? 'rgba(150,158,166,0.9)' : 'rgba(255,255,255,0.92)',
      mount: overcast ? '#8d989f' : '#7f9fba', mount2: overcast ? '#6f7f78' : '#5f8a70', woods: overcast ? '#3a553c' : '#2f5a34',
      sun: overcast ? 0.32 : 0.78, hemi: overcast ? 0.88 : 0.62,
      grass: overcast ? [58, 100, 50] : [64, 120, 52],
      // 素材を使うとき（ACESFilmic の下での明るさ）
      sky: overcast ? 'sky_overcast' : 'sky_clear',
      sunP: overcast ? 0.9 : 2.95, hemiP: overcast ? 0.75 : 0.3, envP: overcast ? 1.15 : 0.85, exposure: overcast ? 1.05 : 0.92,
      sunEl: overcast ? 0.4 : 0.9, // 太陽の高さ（rad）
    };
  }
  // 色の値を線形に（出力が sRGB なので、材質と頂点の色はこれを通す）。素材が無いとき（LIN＝false）は前と同じく、色をそのまま使い出力も直さない
  let LIN = true;
  const lin = c => LIN ? new THREE.Color(c).convertSRGBToLinear() : new THREE.Color(c);
  function linOpts(o) { if (o && o.color != null && !(o.color instanceof THREE.Color)) o = Object.assign({}, o, { color: lin(o.color) }); return o; }

  // ---- 素材（assets/*.js が HS.ASSETS に載せた base64） ----
  const IMG = {};     // 名前 → Image（読み終わるまで complete でない）
  const JK = { state: 'none', scene: null, err: null }; // 騎手の GLB
  const IMG_KEYS = ['sky_clear', 'sky_overcast', 'turf_col', 'turf_nor', 'grass_col', 'dirt_col', 'dirt_nor', 'tree'];
  R3.preload = function () {
    if (typeof document === 'undefined' || typeof Image === 'undefined') return;
    const A = HS.ASSETS || {};
    for (const k of IMG_KEYS) if (A[k] && !IMG[k]) { const im = new Image(); im.decoding = 'async'; im.src = A[k]; IMG[k] = im; }
    if (A.jockey && JK.state === 'none' && typeof THREE !== 'undefined' && THREE.GLTFLoader && THREE.SkeletonUtils) {
      JK.state = 'loading';
      try {
        const b64 = A.jockey.slice(A.jockey.indexOf(',') + 1), bin = atob(b64), buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        new THREE.GLTFLoader().parse(buf.buffer, '', g => { JK.scene = g.scene; JK.state = 'ok'; }, e => { JK.err = e; JK.state = 'error'; });
      } catch (e) { JK.err = e; JK.state = 'error'; }
    }
  };
  const imgOk = k => { const im = IMG[k]; return !!(im && im.complete && im.naturalWidth > 0); };
  // 素材がみな読めたか（読めない素材があれば false のまま。そのときは手作りで描く）
  R3.assetsReady = () => IMG_KEYS.every(k => !(HS.ASSETS || {})[k] || imgOk(k)) && JK.state !== 'loading' && !(HS.HorseRigged && HS.HorseRigged.loading());
  R3.assetState = () => ({ images: IMG_KEYS.filter(imgOk), jockey: JK.state });
  if (typeof document !== 'undefined') R3.preload();
  function shade(rgb, k) { return `rgb(${Math.round(clamp(rgb[0] * k, 0, 255))},${Math.round(clamp(rgb[1] * k, 0, 255))},${Math.round(clamp(rgb[2] * k, 0, 255))})`; }
  function coatOf(c) {
    const A = HS.Art;
    return A && A.coat ? A.coat(c) : ['#8a4f24', '#5e3415', '#1a120d', '#1a120d'];
  }
  function marksOf(key) {
    if (HS.Art && HS.Art.marks && HS.U && HS.U.hashRng) return HS.Art.marks(key);
    return { blaze: 'none', socks: [false, false, false, false] };
  }
  // 年齢（芦毛の白さに使う）。渡されなければ、いまのセーブの馬を名前で探す
  function ageOf(h) {
    if (h.age != null) return h.age;
    try {
      const W = HS.World, G = W && W.get && W.get();
      if (G && G.horses && h.name) {
        for (const x of Object.values(G.horses)) if (x.name === h.name && x.born != null) return HS.Horse.ageAt(x, W.wIdx());
      }
    } catch (e) { /* 見つからなければ既定の年齢 */ }
    return null;
  }
  // 馬具（data/gear.js。渡された h.gear が優先）
  function gearOf(h) {
    const d = HS.DATA && HS.DATA.gear;
    return Object.assign({}, (d && h.name && d[h.name]) || {}, h.gear || {});
  }
  function frameColor(fr) {
    const fc = HS.DATA && HS.DATA.frameColors;
    return fc ? fc[((fr || 1) - 1) % 8] : '#ffffff';
  }

  // ---- 絵（canvas）→ 貼る絵 ----
  function canvasOf(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // 色の絵は sRGB。data＝true は凹凸（法線）など色でない絵
  function texOf(cv, repeat, aniso, data) {
    const t = new THREE.CanvasTexture(cv);
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = aniso || 1;
    if (!data && LIN) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  // 空の絵（全天の上 SKY_CROP を切り出した絵）の、高さ el（rad）での色の平均。霞と背景の色に使う
  const SKY_CROP = 0.56;
  const skyV = el => clamp((0.5 + Math.asin(clamp(el, -1, 1)) / Math.PI - (1 - SKY_CROP)) / SKY_CROP, 0.002, 0.998);
  const HZC = {};
  function horizonColor(key, im) {
    if (HZC[key]) return HZC[key];
    try {
      const c = canvasOf(64, 64), g = c.getContext('2d');
      g.drawImage(im, 0, 0, 64, 64);
      const y = Math.round((1 - skyV(0.03)) * 63), d = g.getImageData(0, y, 64, 1).data;
      let r = 0, gg = 0, b = 0;
      for (let i = 0; i < 64; i++) { r += d[i * 4]; gg += d[i * 4 + 1]; b += d[i * 4 + 2]; }
      HZC[key] = '#' + [r, gg, b].map(v => Math.round(v / 64).toString(16).padStart(2, '0')).join('');
    } catch (e) { HZC[key] = '#c8d6e2'; }
    return HZC[key];
  }
  // 素材の絵 → 貼る絵（読めていなければ null）
  function imgTex(key, repeat, aniso, data) {
    if (!imgOk(key)) return null;
    const t = new THREE.Texture(IMG[key]);
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = aniso || 1;
    if (!data) t.encoding = THREE.sRGBEncoding;
    t.needsUpdate = true;
    return t;
  }
  // 細かいまだら（芝・砂・草地）
  function speckle(g, w, h, n, seed, cols, size) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = cols[Math.floor(hash01(i, seed) * cols.length)];
      const s = size * (0.6 + hash01(i, seed + 3) * 0.9);
      g.fillRect(hash01(i, seed + 1) * w, hash01(i, seed + 2) * h, s, s);
    }
  }
  // 馬場の絵。横＝馬場の幅（内ラチ→外ラチ）、縦＝進む向き（period m）
  function turfCanvas(wet, look) {
    const c = canvasOf(256, 256), g = c.getContext('2d');
    const dk = [1, 0.92, 0.84, 0.76][wet];
    const A = [104, 182, 76], B = [74, 142, 56];
    g.fillStyle = shade(A, dk); g.fillRect(0, 0, 256, 128);   // 刈り目（進む向きに交互）
    g.fillStyle = shade(B, dk); g.fillRect(0, 128, 256, 128);
    for (let i = 0; i < 9000; i++) { // 細かい芝目
      const y = hash01(i, 12) * 256, top = y < 128;
      g.fillStyle = shade(top ? A : B, dk * (0.88 + hash01(i, 13) * 0.22));
      g.fillRect(hash01(i, 11) * 256, y, 1, 1 + (hash01(i, 14) > 0.5 ? 1 : 0));
    }
    // 内ラチ沿いは少し荒れる
    const gr = g.createLinearGradient(0, 0, 60, 0);
    gr.addColorStop(0, 'rgba(120,100,60,0)'); gr.addColorStop(0.15, `rgba(120,100,60,${0.16 + wet * 0.03})`); gr.addColorStop(1, 'rgba(120,100,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 60, 256);
    if (wet >= 2) { g.fillStyle = 'rgba(40,60,50,0.12)'; g.fillRect(0, 0, 256, 256); }
    return c;
  }
  function dirtCanvas(wet) {
    const c = canvasOf(256, 256), g = c.getContext('2d');
    const base = [[204, 160, 110], [184, 140, 94], [150, 112, 76], [126, 92, 62]][wet];
    g.fillStyle = shade(base, 1); g.fillRect(0, 0, 256, 256);
    speckle(g, 256, 256, 3000, 21, [shade(base, 0.86), shade(base, 1.1), shade(base, 0.94), shade(base, 1.04)], 2);
    // ハローの筋（進む向き）
    for (let i = 0; i < 64; i++) {
      const x = i * 4 + hash01(i, 5) * 3;
      g.fillStyle = `rgba(${wet >= 2 ? '40,26,14' : '96,64,36'},${0.06 + hash01(i, 6) * 0.12})`;
      g.fillRect(x, 0, 1 + (hash01(i, 7) > 0.7 ? 1 : 0), 256);
    }
    // 蹄の跡（内寄りに多い）
    for (let i = 0; i < 900; i++) {
      const xi = Math.pow(hash01(i, 31), 1.8) * 256, y = hash01(i, 32) * 256;
      g.fillStyle = `rgba(${wet >= 2 ? '30,20,12' : '90,60,34'},${0.18 + wet * 0.05})`;
      g.beginPath(); g.ellipse(xi, y, 1.3, 2.0, 0, 0, TAU); g.fill();
    }
    if (wet >= 2) { // 水が浮いて光る
      for (let i = 0; i < 26; i++) {
        g.fillStyle = 'rgba(190,200,210,0.09)';
        g.beginPath(); g.ellipse(hash01(i, 41) * 256, hash01(i, 42) * 256, 10 + hash01(i, 43) * 26, 3 + hash01(i, 44) * 6, 0, 0, TAU); g.fill();
      }
    }
    return c;
  }
  function grassCanvas(look, k) {
    const c = canvasOf(128, 128), g = c.getContext('2d');
    g.fillStyle = shade(look.grass, k); g.fillRect(0, 0, 128, 128);
    speckle(g, 128, 128, 2400, 51, [shade(look.grass, k * 0.86), shade(look.grass, k * 1.1), shade(look.grass, k * 0.94)], 1.4);
    return c;
  }
  function skyCanvas(look) {
    const c = canvasOf(512, 256), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, look.skyTop); gr.addColorStop(0.75, look.skyHor); gr.addColorStop(1, look.skyHor);
    g.fillStyle = gr; g.fillRect(0, 0, 512, 129);
    g.fillStyle = look.skyHor; g.fillRect(0, 128, 512, 128);
    // 雲（横はつながるように両端にも描く）
    const n = look.overcast ? 26 : 14;
    g.fillStyle = look.cloud;
    for (let i = 0; i < n; i++) {
      const x = hash01(i, 61) * 512, y = 40 + hash01(i, 62) * 78, w = 18 + hash01(i, 63) * 40;
      for (const dx of [-512, 0, 512]) {
        g.globalAlpha = 0.55 + hash01(i, 64) * 0.4;
        g.beginPath(); g.ellipse(x + dx, y, w, w * 0.2, 0, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(x + dx + w * 0.4, y - w * 0.09, w * 0.5, w * 0.18, 0, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(x + dx - w * 0.35, y - w * 0.05, w * 0.4, w * 0.15, 0, 0, TAU); g.fill();
      }
    }
    g.globalAlpha = 1;
    return c;
  }
  // 観客席（列ごとの人）。res＝絵の大きさ（素材を使うときは細かく）
  function crowdCanvas(res) {
    res = res || 256;
    const c = canvasOf(res, res), g = c.getContext('2d');
    const k = res / 256;
    g.scale(k, k);
    g.fillStyle = '#6d6a72'; g.fillRect(0, 0, 256, 256);
    const cols = ['#c9b8a6', '#e8d6c0', '#3b3f52', '#8a6d5a', '#f2f2f2', '#c83a3a', '#3a6bc8', '#e0c040', '#2c2c30', '#9aa4b0', '#6a8a5a', '#d88a5a', '#ffffff', '#1c1c22'];
    const hair = ['#1a1410', '#2a2018', '#4a3828', '#6a6a6a', '#16120e'];
    const rows = res > 256 ? 26 : 24, per = res > 256 ? 52 : 44;
    for (let r = 0; r < rows; r++) {
      const y = r * (256 / rows), rh = 256 / rows;
      g.fillStyle = '#56535c'; g.fillRect(0, y + rh * 0.82, 256, rh * 0.18);   // 段の縁
      for (let q = 0; q < per; q++) {
        const id = r * 97 + q;
        if (hash01(id, 71) < 0.1) continue;
        const w = 256 / per, x = q * w + hash01(id, 72) * w * 0.3;
        g.fillStyle = cols[Math.floor(hash01(id, 73) * cols.length)];
        if (res > 256) {
          // 肩から下（丸い四角）・頭・髪
          g.beginPath(); g.moveTo(x + w * 0.08, y + rh * 0.85); g.lineTo(x + w * 0.08, y + rh * 0.45); g.quadraticCurveTo(x + w * 0.42, y + rh * 0.3, x + w * 0.76, y + rh * 0.45); g.lineTo(x + w * 0.76, y + rh * 0.85); g.fill();
          g.fillStyle = hash01(id, 74) < 0.85 ? '#e1bf9c' : '#b8896a';
          g.beginPath(); g.arc(x + w * 0.42, y + rh * 0.24, w * 0.21, 0, TAU); g.fill();
          g.fillStyle = hair[Math.floor(hash01(id, 75) * hair.length)];
          g.beginPath(); g.arc(x + w * 0.42, y + rh * 0.19, w * 0.21, Math.PI, TAU); g.fill();
          if (hash01(id, 76) < 0.12) { g.fillStyle = cols[Math.floor(hash01(id, 77) * cols.length)]; g.fillRect(x + w * 0.12, y + rh * 0.06, w * 0.6, rh * 0.09); } // 帽子
        } else {
          g.fillRect(x, y + 2, 4, 6);
          g.fillStyle = '#e3c4a4'; g.fillRect(x + 1, y, 2, 2.5);
        }
      }
    }
    if (res > 256) { // 屋根の陰（上ほど暗い）
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, 'rgba(10,12,20,0.55)'); gr.addColorStop(0.45, 'rgba(10,12,20,0.18)'); gr.addColorStop(1, 'rgba(10,12,20,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    }
    return c;
  }
  // 観客席の座席（人は立体で置く）。段ごとの座席と段の縁、上ほど屋根の陰で暗く
  function seatCanvas() {
    const c = canvasOf(512, 512), g = c.getContext('2d');
    g.scale(2, 2);
    g.fillStyle = '#5d5b63'; g.fillRect(0, 0, 256, 256);
    const rows = 24, per = 40, rh = 256 / rows, w = 256 / per;
    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      g.fillStyle = '#4a4850'; g.fillRect(0, y + rh * 0.8, 256, rh * 0.2);
      for (let q = 0; q < per; q++) {
        const id = r * 97 + q;
        g.fillStyle = hash01(id, 71) < 0.5 ? '#3d5a86' : '#456494';
        g.fillRect(q * w + w * 0.1, y + rh * 0.25, w * 0.8, rh * 0.5);
      }
    }
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(10,12,20,0.6)'); gr.addColorStop(0.45, 'rgba(10,12,20,0.2)'); gr.addColorStop(1, 'rgba(10,12,20,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return c;
  }

  // ---- 形をまとめる道具（同じ材質の形を1つにまとめ、描く回数を減らす） ----
  const _v = { a: null };
  function Builder(o) {
    o = o || {};
    this.p = []; this.n = []; this.uv = []; this.c = o.color ? [] : null; this.k = o.skin ? [] : null; this.ix = [];
  }
  Builder.prototype.add = function (g, m, o) {
    o = o || {};
    const V = _v.a || (_v.a = new THREE.Vector3());
    const P = g.attributes.position, N = g.attributes.normal, T = g.attributes.uv;
    const base = this.p.length / 3;
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const col = this.c ? lin(o.color || '#ffffff') : null;
    for (let i = 0; i < P.count; i++) {
      V.fromBufferAttribute(P, i).applyMatrix4(m); this.p.push(V.x, V.y, V.z);
      // o.uvf(P)・o.skinf(P)：頂点の位置から uv と骨（[骨a, 骨b, bの重み]）を決める
      const uvP = o.uvf ? o.uvf(V) : null, skP = o.skinf ? o.skinf(V) : null;
      if (N) { V.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); this.n.push(V.x, V.y, V.z); } else this.n.push(0, 1, 0);
      let a = 0, b = 0;
      if (uvP) { a = uvP[0]; b = uvP[1]; }
      else if (o.uv) { a = o.uv[0]; b = o.uv[1]; }
      else if (T) {
        a = T.getX(i); b = T.getY(i);
        if (o.rect) { a = o.rect[0] + a * (o.rect[2] - o.rect[0]); b = o.rect[1] + b * (o.rect[3] - o.rect[1]); }
      }
      this.uv.push(a, b);
      if (col) this.c.push(col.r, col.g, col.b);
      if (this.k) { if (skP) this.k.push(skP[0], skP[1], skP[2]); else this.k.push(o.bone || 0, o.bone || 0, 0); }
    }
    const flip = m.determinant() < 0;
    const cnt = g.index ? g.index.count : P.count;
    for (let i = 0; i + 2 < cnt; i += 3) {
      const a = g.index ? g.index.getX(i) : i, b = g.index ? g.index.getX(i + 1) : i + 1, c = g.index ? g.index.getX(i + 2) : i + 2;
      if (flip) this.ix.push(base + a, base + c, base + b); else this.ix.push(base + a, base + b, base + c);
    }
    g.dispose();
    return this;
  };
  // 四角（a→b→c→d の順）。法線は巻き方から。o.uvs＝4点の uv、o.uv＝1点
  Builder.prototype.quad = function (a, b, c, d, o) {
    o = o || {};
    const e1 = new THREE.Vector3().subVectors(b, a), e2 = new THREE.Vector3().subVectors(c, a);
    const n = e1.cross(e2).normalize();
    const base = this.p.length / 3;
    const pts = [a, b, c, d];
    const col = this.c ? lin(o.color || '#ffffff') : null;
    for (let i = 0; i < 4; i++) {
      this.p.push(pts[i].x, pts[i].y, pts[i].z); this.n.push(n.x, n.y, n.z);
      const uv = o.uvs ? o.uvs[i] : (o.uv || [0, 0]);
      this.uv.push(uv[0], uv[1]);
      if (col) this.c.push(col.r, col.g, col.b);
      if (this.k) this.k.push(o.bone || 0, o.bone || 0, 0);
    }
    this.ix.push(base, base + 1, base + 2, base, base + 2, base + 3);
    return this;
  };
  Builder.prototype.box = function (cx, cy, cz, sx, sy, sz, ry, o) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(cx, cy, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry || 0, 0)), new THREE.Vector3(1, 1, 1));
    return this.add(new THREE.BoxGeometry(sx, sy, sz), m, o);
  };
  // できあがった頂点の並びをそのまま足す。skin＝頂点ごとに [骨a, 骨b, bの重み]
  Builder.prototype.raw = function (pos, nor, uv, skin, idx) {
    const base = this.p.length / 3;
    for (let i = 0; i < pos.length; i++) { this.p.push(pos[i]); this.n.push(nor[i]); }
    for (let i = 0; i < uv.length; i++) this.uv.push(uv[i]);
    if (this.k) for (let i = 0; i < skin.length; i++) this.k.push(skin[i]);
    for (let i = 0; i < idx.length; i++) this.ix.push(base + idx[i]);
    return this;
  };
  Builder.prototype.build = function () {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.c) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.k) {
      const n = this.k.length / 3, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = this.k[i * 3]; si[i * 4 + 1] = this.k[i * 3 + 1]; sw[i * 4] = 1 - this.k[i * 3 + 2]; sw[i * 4 + 1] = this.k[i * 3 + 2]; }
      g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    }
    g.setIndex(this.ix);
    g.computeBoundingSphere();
    return g;
  };
  // 2点を結ぶ先細りの円柱（r1＝a の側、r2＝b の側）。flatZ で横を薄く
  function limb(B, a, b, r1, r2, seg, o, flatZ) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const g = new THREE.CylinderGeometry(r2, r1, len, seg || 7, 1, false);
    if (flatZ) g.scale(1, 1, flatZ);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
    return B.add(g, m, o);
  }
  function blob(B, c, sx, sy, sz, ws, hs, o, rz) {
    const g = new THREE.SphereGeometry(1, ws || 8, hs || 6);
    const m = new THREE.Matrix4().compose(c, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz || 0)), new THREE.Vector3(sx, sy, sz));
    return B.add(g, m, o);
  }
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---- 馬と騎手の形（全頭で共有） ----
  // 馬の向き：+X が前、+Y が上、+Z が右。地面が y=0。頂点ごとに骨を2本まで混ぜ、関節でなめらかに曲がる
  // 胴・首・頭・脚・尾・たてがみ・騎手は、断面（楕円）を並べてつないだ形（ロフト）で作る
  // 三角形の数の目安（騎手・鞍・馬具を含む1頭）：近くの形 8,000 まで（PC だけなので）・遠くの形 2,500 まで（28m で切り替える）。
  //   16頭がみな近くにいても 10 万ほど。形は全頭で共有し、馬ごとに違うのは小さな絵（256×256）だけ
  // 骨：0 根元、1 胴、2・3 首、4 頭、5〜7 尾、8〜11 左前・12〜15 右前（肩・肘・膝・球節）、16〜19 左後・20〜23 右後（股・後膝・飛節・球節）
  //     24 騎手の腰、25 上体、26 頭、27・28 左腕（上・下）、29・30 右腕、31 ムチ、32〜35 馬具（シャドーロール・ブリンカー・メンコ・チークピーシーズ）
  const FJ = [[0.60, 1.26], [0.47, 0.97], [0.485, 0.53], [0.495, 0.215]];   // 前脚の関節：肩・肘・膝・球節
  const HJ = [[-0.62, 1.36], [-0.56, 0.98], [-0.74, 0.57], [-0.705, 0.215]]; // 後脚の関節：股・後膝・飛節・球節
  const FZ = 0.15, HZ = 0.16;
  const HEAD0 = [1.12, 1.86], HEAD_L = 0.6;              // 頭：うなじから鼻先へ
  const HD = [0.62, -0.785], HU = [0.785, 0.62];        // 頭の向き（鼻先へ）と、顔の前の向き
  const GEAR0 = [1.3, 1.63];                            // 馬具の骨の付け根（頭の中。使わない馬具はここへ縮める）
  const GEAR = { shadowRoll: 32, blinkers: 33, hood: 34, cheekPieces: 35 };
  const BONES0 = (() => {
    const b = [];
    const put = (i, par, x, y, z) => { b[i] = [par, x, y, z || 0]; };
    put(0, -1, 0, 0); put(1, 0, 0, 1.25);
    put(2, 1, 0.68, 1.32); put(3, 2, 0.9, 1.6); put(4, 3, HEAD0[0], HEAD0[1]);
    put(5, 1, -0.98, 1.5); put(6, 5, -1.16, 1.4); put(7, 6, -1.4, 1.21);
    for (const [k, sd] of [[8, -1], [12, 1]]) FJ.forEach((j, n) => put(k + n, n ? k + n - 1 : 1, j[0], j[1], sd * FZ));
    for (const [k, sd] of [[16, -1], [20, 1]]) HJ.forEach((j, n) => put(k + n, n ? k + n - 1 : 1, j[0], j[1], sd * HZ));
    put(24, 1, 0.0, 1.87); put(25, 24, 0.12, 1.9); put(26, 25, 0.54, 2.07);
    put(27, 25, 0.43, 2.0, -0.15); put(28, 27, 0.58, 1.86, -0.2); put(29, 25, 0.43, 2.0, 0.15); put(30, 29, 0.58, 1.86, 0.2);
    put(31, 30, 0.84, 1.81, 0.1);
    for (let i = 32; i <= 35; i++) put(i, 4, GEAR0[0], GEAR0[1]);
    return b;
  })();
  // ---- 体の比（サラブレッド：体長と体高がほぼ同じ、首は細く長く、頭は小さく） ----
  // 形と骨は上の表の座標で作り、最後にこの写し方で比を直す（表を書き直さずに済むように）。uv は写す前の座標のまま
  //   胴・脚・尾：前脚より後ろ（x < PIV）を前後に KX 倍に縮める
  //   首：付け根から首の向きに伸ばし、太さを細く。頭：首の先へ動かして小さく。騎手：胴の上で前後にずらすだけ
  const PIV = 0.66, KX = 0.85, NK = { base: [0.5, 1.45], ang: 0.9, along: 1.1, across: 0.9, z: 0.86 }, HK0 = 0.9;
  const tX = x => x < PIV ? PIV + (x - PIV) * KX : x;
  const JSH = tX(0.1) - 0.1;
  function neckMap(x, y, z) {
    x = tX(x);
    const bx = tX(NK.base[0]), by = NK.base[1], ca = Math.cos(NK.ang), sa = Math.sin(NK.ang);
    const dx = x - bx, dy = y - by, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
    const u2 = u * NK.along, v2 = v * NK.across;
    return [bx + u2 * ca - v2 * sa, by + u2 * sa + v2 * ca, z * NK.z];
  }
  const HEADP = neckMap(HEAD0[0], HEAD0[1], 0);
  function mapBone(x, y, z, bone) {
    if (bone >= 24 && bone <= 31) return [x + JSH, y, z];
    if (bone === 2 || bone === 3) return neckMap(x, y, z);
    if (bone === 4 || bone >= 32) return [HEADP[0] + (x - HEAD0[0]) * HK0, HEADP[1] + (y - HEAD0[1]) * HK0, z * HK0];
    return [tX(x), y, z];
  }
  // 点 P（表の座標）を、骨 a・b（b の重み w）で写す
  function mapPt(x, y, z, a, b, w) {
    const A = mapBone(x, y, z, a);
    if (!w || a === b) return A;
    const Bp = mapBone(x, y, z, b);
    return [A[0] + (Bp[0] - A[0]) * w, A[1] + (Bp[1] - A[1]) * w, A[2] + (Bp[2] - A[2]) * w];
  }
  // 骨の付け根は、その骨の写し方で
  const BONES = BONES0.map(([par, x, y, z], i) => [par].concat(mapBone(x, y, z || 0, i)));

  // 胴の断面：[x, 背の高さ, 腹の高さ, 横の半幅, 上ほど細く]
  const BODY_T = [
    [0.86, 1.42, 1.13, 0.1, 0.1], [0.82, 1.54, 1.01, 0.19, 0.15], [0.74, 1.625, 0.95, 0.24, 0.24], [0.59, 1.685, 0.91, 0.26, 0.36],
    [0.41, 1.665, 0.895, 0.275, 0.36], [0.23, 1.595, 0.9, 0.285, 0.26], [0.03, 1.555, 0.915, 0.295, 0.15], [-0.17, 1.555, 0.955, 0.295, 0.1],
    [-0.35, 1.575, 1.02, 0.295, 0.06], [-0.53, 1.625, 1.075, 0.305, 0.04], [-0.69, 1.655, 1.1, 0.305, 0.06], [-0.83, 1.635, 1.12, 0.28, 0.1],
    [-0.94, 1.58, 1.15, 0.23, 0.14], [-1.01, 1.49, 1.2, 0.15, 0.2], [-1.05, 1.39, 1.27, 0.065, 0.2],
  ];
  // 首の断面：[たてがみの側の点 x, y, のどの側の点 x, y, 半幅, 骨a, 骨b, bの重み]
  const NECK_T = [
    [0.47, 1.6, 0.74, 1.03, 0.21, 1, 2, 0], [0.63, 1.665, 0.88, 1.17, 0.2, 1, 2, 0.55], [0.77, 1.735, 0.98, 1.35, 0.17, 2, 3, 0.1],
    [0.91, 1.81, 1.05, 1.53, 0.14, 2, 3, 0.6], [1.02, 1.875, 1.11, 1.66, 0.115, 3, 4, 0.15], [1.09, 1.925, 1.16, 1.76, 0.105, 3, 4, 0.7],
    [1.13, 1.95, 1.2, 1.81, 0.1, 4, 4, 0],
  ];
  // 頭の断面（うなじ 0 → 鼻先 1）：[t, 前後の半径, 横の半幅, 前へずらす, 前ほど細く]
  const HEAD_T = [
    [0, 0.1, 0.08, 0, 0], [0.08, 0.135, 0.095, -0.03, -0.1], [0.2, 0.165, 0.105, -0.055, -0.15], [0.32, 0.15, 0.1, -0.05, 0],
    [0.44, 0.11, 0.088, -0.015, 0.05], [0.58, 0.088, 0.078, 0, 0.05], [0.72, 0.082, 0.074, 0, 0], [0.85, 0.09, 0.084, -0.008, -0.05],
    [0.94, 0.076, 0.072, -0.016, 0], [1, 0.04, 0.045, -0.02, 0],
  ];
  // 脚の断面（上から）：[x, y, 前後の半径, 横の半幅, 骨a, 骨b, bの重み]（骨は肩・股から 0〜3）
  const FLEG_T = [
    [0.62, 1.34, 0.13, 0.085, 0, 0, 0], [0.58, 1.2, 0.15, 0.095, 0, 0, 0], [0.52, 1.07, 0.14, 0.095, 0, 1, 0.3], [0.48, 0.96, 0.115, 0.085, 0, 1, 0.75],
    [0.47, 0.86, 0.095, 0.075, 1, 1, 0], [0.474, 0.74, 0.075, 0.064, 1, 1, 0], [0.479, 0.62, 0.056, 0.054, 1, 1, 0], [0.483, 0.55, 0.066, 0.062, 1, 2, 0.35],
    [0.486, 0.5, 0.062, 0.058, 1, 2, 0.8], [0.488, 0.42, 0.046, 0.042, 2, 2, 0], [0.49, 0.31, 0.045, 0.039, 2, 2, 0], [0.491, 0.24, 0.062, 0.054, 2, 3, 0.4],
    [0.498, 0.19, 0.062, 0.055, 2, 3, 0.85], [0.52, 0.135, 0.042, 0.041, 3, 3, 0], [0.545, 0.085, 0.052, 0.05, 3, 3, 0], [0.56, 0.04, 0.062, 0.058, 3, 3, 0],
    [0.57, 0.004, 0.068, 0.062, 3, 3, 0],
  ];
  const HLEG_T = [
    [-0.66, 1.42, 0.23, 0.12, 0, 0, 0], [-0.64, 1.28, 0.27, 0.145, 0, 0, 0], [-0.61, 1.14, 0.26, 0.14, 0, 0, 0], [-0.6, 1.02, 0.2, 0.115, 0, 1, 0.4],
    [-0.62, 0.92, 0.14, 0.09, 0, 1, 0.85], [-0.66, 0.82, 0.105, 0.075, 1, 1, 0], [-0.7, 0.71, 0.08, 0.058, 1, 1, 0], [-0.73, 0.63, 0.075, 0.054, 1, 2, 0.2],
    [-0.745, 0.575, 0.08, 0.06, 1, 2, 0.5], [-0.74, 0.52, 0.062, 0.052, 1, 2, 0.85], [-0.73, 0.44, 0.048, 0.043, 2, 2, 0], [-0.718, 0.32, 0.046, 0.04, 2, 2, 0],
    [-0.708, 0.24, 0.062, 0.054, 2, 3, 0.4], [-0.7, 0.19, 0.062, 0.055, 2, 3, 0.85], [-0.682, 0.135, 0.043, 0.042, 3, 3, 0], [-0.66, 0.085, 0.05, 0.05, 3, 3, 0],
    [-0.646, 0.04, 0.06, 0.057, 3, 3, 0], [-0.636, 0.004, 0.066, 0.061, 3, 3, 0],
  ];
  // 尾（付け根から）：[x, y, 上下の半径, 横の半幅, 骨a, 骨b, bの重み]
  const TAIL_T = [
    [-0.99, 1.5, 0.055, 0.05, 5, 5, 0], [-1.07, 1.45, 0.06, 0.05, 5, 6, 0.3], [-1.17, 1.38, 0.085, 0.065, 5, 6, 0.8], [-1.29, 1.28, 0.11, 0.08, 6, 6, 0],
    [-1.41, 1.17, 0.125, 0.085, 6, 7, 0.5], [-1.53, 1.06, 0.12, 0.08, 7, 7, 0], [-1.64, 0.96, 0.095, 0.065, 7, 7, 0], [-1.73, 0.88, 0.045, 0.04, 7, 7, 0],
  ];
  // 騎手の背骨（腰から首へ）：[x, y, 背と胸の半径, 横の半幅, 骨a, 骨b, bの重み]
  const SPINE_T = [
    [0.0, 1.88, 0.1, 0.14, 24, 24, 0], [0.1, 1.915, 0.095, 0.135, 24, 25, 0.5], [0.22, 1.955, 0.105, 0.15, 25, 25, 0], [0.34, 1.995, 0.115, 0.17, 25, 25, 0],
    [0.44, 2.03, 0.1, 0.18, 25, 25, 0], [0.51, 2.05, 0.07, 0.12, 25, 25, 0], [0.555, 2.06, 0.04, 0.06, 25, 25, 0],
  ];

  // 馬ごとの絵（256×256）の割り付け
  //   上の2段：32px の色の升 16 個 / 体の横から見た絵（毛色・影・まだら）/ ゼッケン / 脚4本（横から見た絵。白い靴下・蹄）
  //   たてがみと尾の毛の筋 / 勝負服（体のまわり × 背骨の向き）/ 頭（うなじ→鼻先 × 下→顔の前。流星）
  const CELL = { saddle: 0, pants: 1, boots: 2, skin: 3, cap: 4, sleeve: 5, goggle: 6, white: 7, eye: 8, mane: 9, bridle: 10, roll: 11, gear: 12, dark: 13, bootTop: 14, cheek: 15 };
  const cellUV = i => [((i % 8) + 0.5) / 8, 1 - (Math.floor(i / 8) * 32 + 16) / 256];
  const R_BODY = [0, 64, 128, 96], R_NUM = [128, 64, 128, 80], R_HAIR = [224, 144, 32, 112], R_SILK = [0, 160, 128, 64], R_HEAD = [0, 224, 128, 32];
  const R_LEG = [0, 1, 2, 3].map(k => [128 + k * 24, 144, 24, 112]);
  const SX0 = -1.3, SX1 = 1.7, SY0 = 0, SY1 = 2.3;   // 体の絵が受け持つ範囲（横から見た x, y）
  const LEG_XC = [0.5, 0.5, -0.66, -0.66], LEG_HW = 0.35, LEG_H = 1.4; // 脚の絵の範囲
  function rUV(r, fx, fy) {
    const ex = 0.5 / r[2], ey = 0.5 / r[3];
    fx = clamp(fx, ex, 1 - ex); fy = clamp(fy, ey, 1 - ey);
    return [(r[0] + fx * r[2]) / 256, 1 - (r[1] + (1 - fy) * r[3]) / 256];
  }
  const sideUV = P => rUV(R_BODY, (P.x - SX0) / (SX1 - SX0), (P.y - SY0) / (SY1 - SY0));
  const legUV = (k, P) => rUV(R_LEG[k], (P.x - LEG_XC[k] + LEG_HW) / (2 * LEG_HW), P.y / LEG_H);
  const mth = (j, m) => 1 - Math.abs(j / m * 2 - 1); // 輪の上の位置（0＝下・後ろ → 1＝上・前。左右は同じ）

  // 楕円の上の点：中心 c、縦の向き u（半径 h）、横の向き s（半幅 w）。th＝0 が -u の側、π が +u の側。k＞0 で +u の側ほど細く、p＜1 で角ばる。off＝外へ
  function ellPt(c, u, s, h, w, k, p, th, off) {
    let cy = -Math.cos(th), sz = Math.sin(th);
    if (p && p !== 1) { cy = Math.sign(cy) * Math.pow(Math.abs(cy), p); sz = Math.sign(sz) * Math.pow(Math.abs(sz), p); }
    const ww = w * (1 - (k || 0) * cy) + (off || 0);
    return c.clone().addScaledVector(u, (h + (off || 0)) * cy).addScaledVector(s, ww * sz);
  }
  function ell(c, u, s, h, w, m, k, p) {
    const out = [];
    for (let j = 0; j < m; j++) out.push(ellPt(c, u, s, h, w, k, p, j / m * TAU));
    return out;
  }
  function arc(c, u, s, h, w, k, p, th0, th1, n, off) {
    const out = [];
    for (let j = 0; j < n; j++) out.push(ellPt(c, u, s, h, w, k, p, th0 + (th1 - th0) * j / (n - 1), off));
    return out;
  }
  // 輪（断面の点の並び）をつないだ形。rings[i]＝点の並び、sk[i]＝[骨a, 骨b, bの重み]、uvf(i, j, P)→[u, v]
  // o.cap0 / o.cap1：始め・終わりをふさぐ（tip0 / tip1 でとがらせる）。o.open：輪を閉じない。o.inside(i)：外向きを決める内側の点
  function loft(B, rings, sk, uvf, o) {
    o = o || {};
    const n = rings.length, m = rings[0].length, pos = [], uv = [], skn = [], idx = [];
    const cen = i => { const c = new THREE.Vector3(); for (const P of rings[i]) c.add(P); return c.multiplyScalar(1 / m); };
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      const P = rings[i][j];
      pos.push(P.x, P.y, P.z);
      const t = uvf(i, j, P); uv.push(t[0], t[1]);
      skn.push(sk[i][0], sk[i][1], sk[i][2]);
    }
    const jm = o.open ? m - 1 : m;
    const quads = [];
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < jm; j++) {
      const a = i * m + j, b = i * m + (j + 1) % m;
      quads.push(a, a + m, b, b, a + m, b + m);
    }
    // 外向きにそろえる
    const P = k => new THREE.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
    const triN = (a, b, c) => P(b).sub(P(a)).cross(P(c).sub(P(a)));
    {
      const i = Math.max(0, Math.floor((n - 1) / 2)), j = Math.floor(jm / 2);
      const a = i * m + j, b = i * m + (j + 1) % m;
      const inside = o.inside ? o.inside(i) : cen(i);
      if (triN(a, a + m, b).dot(P(a).sub(inside)) < 0) for (let k = 0; k < quads.length; k += 3) { const t = quads[k + 1]; quads[k + 1] = quads[k + 2]; quads[k + 2] = t; }
    }
    for (const q of quads) idx.push(q);
    const cap = (ri, nb, tip) => {
      const c = cen(ri);
      if (tip) c.add(tip);
      const ci = pos.length / 3;
      pos.push(c.x, c.y, c.z);
      const t = uvf(ri, 0, c); uv.push(t[0], t[1]);
      skn.push(sk[ri][0], sk[ri][1], sk[ri][2]);
      const away = c.clone().sub(cen(nb));
      const tri = [];
      for (let j = 0; j < m; j++) tri.push(ci, ri * m + (j + 1) % m, ri * m + j);
      if (triN(tri[0], tri[1], tri[2]).dot(away) < 0) for (let k = 0; k < tri.length; k += 3) { const t = tri[k + 1]; tri[k + 1] = tri[k + 2]; tri[k + 2] = t; }
      for (const q of tri) idx.push(q);
    };
    if (o.cap0 && n > 1) cap(0, 1, o.tip0);
    if (o.cap1 && n > 1) cap(n - 1, n - 2, o.tip1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    B.raw(pos, Array.from(g.attributes.normal.array), uv, skn, idx);
    g.dispose();
    return B;
  }
  // 点の並びに沿った管（半径 r[i]、断面 m 角）。sk[i] は点ごと
  function tube(B, pts, r, m, sk, uvf, o) {
    const rings = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const T = b.clone().sub(a).normalize();
      const ref = Math.abs(T.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
      const u = new THREE.Vector3().crossVectors(ref, T).normalize(), s = new THREE.Vector3().crossVectors(T, u).normalize();
      const rr = Array.isArray(r) ? r[i] : r;
      rings.push(ell(pts[i], u, s, rr, rr, m));
    }
    return loft(B, rings, sk, uvf, o);
  }
  const lerpRow = (tab, x, key) => {
    key = key || 0;
    let i = 0;
    while (i < tab.length - 2 && tab[i + 1][key] <= x) i++;
    const a = tab[i], b = tab[i + 1], t = clamp((x - a[key]) / (b[key] - a[key] || 1), 0, 1);
    return a.map((v, k) => v + (b[k] - v) * t);
  };
  // 頭の断面（t：うなじ 0 → 鼻先 1）
  const vHU = () => new THREE.Vector3(HU[0], HU[1], 0), vZ = () => new THREE.Vector3(0, 0, 1);
  function headSec(t) {
    const r = lerpRow(HEAD_T, t);
    const c = new THREE.Vector3(HEAD0[0] + HD[0] * t * HEAD_L, HEAD0[1] + HD[1] * t * HEAD_L, 0).addScaledVector(vHU(), r[3]);
    return { c, h: r[1], w: r[2], k: r[4] };
  }
  const headPt = (t, th, off) => { const s = headSec(t); return ellPt(s.c, vHU(), vZ(), s.h, s.w, s.k, 0.9, th, off); };
  // 胴の断面（x）
  function bodySec(x) { const r = lerpRow(BODY_T.slice().reverse(), x); return { c: new THREE.Vector3(x, (r[1] + r[2]) / 2, 0), h: (r[1] - r[2]) / 2, w: r[3], k: r[4] }; }
  const bodyPt = (x, th, off) => { const s = bodySec(x); return ellPt(s.c, new THREE.Vector3(0, 1, 0), vZ(), s.h, s.w, s.k, 0.92, th, off); };
  // 首の断面
  const NECK = NECK_T.map(([tx, ty, bx, by, w, a, b, t]) => {
    const top = new THREE.Vector3(tx, ty, 0), bot = new THREE.Vector3(bx, by, 0);
    const u = top.clone().sub(bot);
    return { c: top.clone().add(bot).multiplyScalar(0.5), h: u.length() / 2, u: u.normalize(), w, sk: [a, b, t] };
  });
  const neckPt = (i, th, off) => { const s = NECK[i]; return ellPt(s.c, s.u, vZ(), s.h, s.w, 0.28, 0.95, th, off); };

  // 胴の面の筋肉のふくらみ：[中心 x, y, 長い向きの半径, 短い向きの半径, 長い向きの傾き(rad), 高さ(m), 横を向いた面だけ(1)か前も(0)]
  const MUSCLES = [
    [0.6, 1.36, 0.28, 0.1, 1.15, 0.045, 1],    // 肩（き甲から肩の先へ斜め）
    [0.78, 1.13, 0.12, 0.08, 0.3, 0.026, 0],   // 胸前（前脚の付け根）
    [0.67, 1.08, 0.1, 0.06, 1.4, 0.022, 1],    // 上腕
    [-0.64, 1.3, 0.26, 0.17, 1.2, 0.046, 1],   // 尻から太もも
    [-0.5, 1.56, 0.22, 0.1, 0.1, 0.014, 0],    // 腰の張り
  ];
  function muscle(P, c) {
    const d = P.clone().sub(c); d.x = 0; const l = d.length() || 1; d.multiplyScalar(1 / l);
    let h = 0;
    for (const [mx, my, ra, rb, a, amp, side] of MUSCLES) {
      const dx = P.x - mx, dy = P.y - my, u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a);
      h += amp * Math.exp(-(u * u) / (ra * ra) - (v * v) / (rb * rb)) * (side ? Math.abs(d.z) : 1);
    }
    return P.addScaledVector(d, h);
  }
  // 頭の彫り：[t（うなじ 0 → 鼻先 1）, 角度（0＝のど・π＝顔の前。左右は同じ）, t の幅, 角度の幅, 高さ(m)]
  const CARVE = [
    [0.16, 2.45, 0.06, 0.28, -0.022],  // 目の上のくぼみ
    [0.24, 2.25, 0.045, 0.22, 0.012],  // 目の縁の張り
    [0.6, Math.PI, 0.3, 0.32, 0.012],  // 鼻筋
    [0.55, 2.4, 0.22, 0.25, -0.012],   // 鼻筋の横の平ら
    [0.9, 2.25, 0.06, 0.3, 0.018],     // 鼻の穴のふくらみ
    [0.2, 0.75, 0.1, 0.45, 0.032],     // 顎（頬）のふくらみ
    [0.38, 1.05, 0.08, 0.3, -0.015],   // 頬の前のくぼみ
    [0.86, 0.4, 0.06, 0.4, 0.008],     // 下あご（口の下）
  ];
  function carve(P, c, t, th) {
    const d = P.clone().sub(c).normalize();
    let h = 0;
    const a = th > Math.PI ? TAU - th : th;  // 左右を同じに
    for (const [t0, a0, dt, da, amp] of CARVE) { const u = (t - t0) / dt, v = (a - a0) / da; h += amp * Math.exp(-u * u - v * v); }
    return P.addScaledVector(d, h);
  }
  // o.noJockey：騎手を描かない（騎手は素材の形で別に描くとき。鐙・手綱・ムチは残す）
  // o.bare：鞍・ゼッケン・鐙・手綱・ムチも描かない（肖像用。頭絡と馬具は残す。騎手も描かない）
  function horseGeometry(q, o) {
    const bare = !!(o && o.bare), hi = q > 0, rider = !(o && (o.noJockey || o.bare)), tack = !!(o && o.tack);
    const B = new Builder({ skin: true });
    const X = V3(1, 0, 0), Y = V3(0, 1, 0), Z = V3(0, 0, 1);
    const cell = k => { const uv = cellUV(CELL[k]); return () => uv; };
    const rig = b => [b, b, 0];
    const mBody = hi ? 22 : 10, mNeck = hi ? 12 : 8, mHead = hi ? 18 : 8, mLeg = hi ? 8 : 6, mTail = hi ? 8 : 5;

    // o.tack：馬の体を描かず、鞍・ゼッケン・頭絡・手綱・馬具・騎手だけ（体は骨入りの馬の素材で描くとき。js/ui/horse_rigged.js）
    if (!tack) {
      // 胴（近くの形は、肩・胸前・尻の筋肉のふくらみを面に足す）
      {
        // 近くの形は断面を細かく取り直す（筋肉のふくらみが面に出るように）
        const rows = hi ? (() => { const out = [BODY_T[0]], x0 = BODY_T[0][0], x1 = BODY_T[BODY_T.length - 1][0], n = 26; for (let i = 1; i < n; i++) out.push(lerpRow(BODY_T.slice().reverse(), x0 + (x1 - x0) * i / n)); out.push(BODY_T[BODY_T.length - 1]); return out; })() : BODY_T;
        loft(B, rows.map(([x, top, bot, w, k]) => { const c = V3(x, (top + bot) / 2, 0), r = ell(c, Y, Z, (top - bot) / 2, w, mBody, k, 0.92); return hi ? r.map(P => muscle(P, c)) : r; }),
          rows.map(() => rig(1)), (i, j, P) => sideUV(P), { cap0: true, cap1: true });
      }
      // 首
      loft(B, NECK.map(s => ell(s.c, s.u, Z, s.h, s.w, mNeck, 0.28, 0.95)), NECK.map(s => s.sk), (i, j, P) => sideUV(P), { cap0: true, cap1: true });
      // 頭
      {
        const ts = hi ? [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.32, 0.4, 0.48, 0.57, 0.66, 0.75, 0.83, 0.89, 0.94, 0.975, 1] : [0, 0.2, 0.44, 0.72, 0.9, 1];
        loft(B, ts.map(t => { const s = headSec(t), r = ell(s.c, vHU(), Z, s.h, s.w, mHead, s.k, 0.9); return hi ? r.map((P, j) => carve(P, s.c, t, j / mHead * TAU)) : r; }), ts.map(() => rig(4)),
          (i, j) => rUV(R_HEAD, ts[i], mth(j, mHead)), { cap0: true, cap1: true });
        // 耳・目・鼻の穴
        for (const sd of [-1, 1]) {
          const base = headPt(0.03, Math.PI - sd * 0.55, -0.02);
          const dir = vHU().multiplyScalar(0.75).addScaledVector(new THREE.Vector3(-HD[0], -HD[1], 0), 0.55).addScaledVector(Z, sd * 0.2).normalize();
          const g = new THREE.ConeGeometry(0.042, 0.17, hi ? 6 : 4);
          g.translate(0, 0.085, 0);
          const m = new THREE.Matrix4().compose(base, new THREE.Quaternion().setFromUnitVectors(Y, dir), V3(0.62, 1, 1));
          B.add(g, m, { uv: sideUV(base), bone: 4 });
          blob(B, headPt(0.21, Math.PI - sd * 1.0, -0.012), 0.03, 0.022, 0.02, hi ? 8 : 5, hi ? 6 : 4, { uv: cellUV(CELL.eye), bone: 4 }, -0.9);
          if (hi) blob(B, headPt(0.93, Math.PI - sd * 0.78, -0.014), 0.02, 0.026, 0.016, 5, 4, { uv: cellUV(CELL.dark), bone: 4 });
        }
        // 前髪
        const ft = [-0.02, 0.07, 0.15, 0.22];
        loft(B, ft.map((t, i) => { const s = headSec(Math.max(0, t)); const o = arc(s.c, vHU(), Z, s.h, s.w, s.k, 0.9, Math.PI - 0.38, Math.PI + 0.38, hi ? 4 : 3, 0.02 + (i ? 0 : 0.01)); const n = arc(s.c, vHU(), Z, s.h, s.w, s.k, 0.9, Math.PI + 0.38, Math.PI - 0.38, hi ? 4 : 3, 0.003); return o.concat(n); }),
          ft.map(() => rig(4)), (i, j) => rUV(R_HAIR, 0.1 + (j % 4) * 0.08, 1 - i / 3), { cap1: true });
      }
      // たてがみ（首の右側に寝る）。近くの形は輪の間にも輪を足し、下の縁を房のようにぎざぎざに
      {
        const n = hi ? 5 : 3;
        const rings = [], sk = [];
        const ring = (i, lo, th0, off) => {
          const o = [], inn = [];
          for (let j = 0; j < n; j++) { const th = th0 - (th0 - lo) * j / (n - 1); o.push(neckPt(i, th, off - 0.012 * j / (n - 1))); }
          for (let j = n - 1; j >= 0; j--) { const th = th0 - (th0 - lo) * j / (n - 1); inn.push(neckPt(i, th, 0.004)); }
          return o.concat(inn);
        };
        for (let i = 1; i < NECK.length; i++) {
          if (!hi) { rings.push(ring(i, Math.PI - 0.72 - 0.08 * hash01(i, 77), Math.PI + 0.1, 0.022)); sk.push(NECK[i].sk); continue; }
          // 近くの形：i と i+1 の間を3つに分けて、房の長さを変える
          const steps = i < NECK.length - 1 ? 3 : 1;
          for (let q = 0; q < steps; q++) {
            const a = ring(i, Math.PI - 0.62 - 0.4 * hash01(i * 3 + q, 77), Math.PI + 0.12, 0.03);
            if (q === 0) { rings.push(a); sk.push(NECK[i].sk); continue; }
            const b = ring(i + 1, Math.PI - 0.62 - 0.4 * hash01(i * 3 + q, 77), Math.PI + 0.12, 0.03), f = q / steps;
            rings.push(a.map((P, j) => P.lerp(b[j], f)));
            const s0 = NECK[i].sk, s1 = NECK[i + 1].sk;
            sk.push(f < 0.5 ? s0 : s1);
          }
        }
        loft(B, rings, sk, (i, j) => rUV(R_HAIR, (j % n) / n * 0.45, i / (rings.length - 1)), { cap0: true, cap1: true });
      }
      // 尾
      {
        const rings = [], sk = [];
        TAIL_T.forEach((r, i) => {
          const a = TAIL_T[Math.max(0, i - 1)], b = TAIL_T[Math.min(TAIL_T.length - 1, i + 1)];
          const T = V3(b[0] - a[0], b[1] - a[1], 0).normalize(), u = V3(-T.y, T.x, 0);
          rings.push(ell(V3(r[0], r[1], 0), u, Z, r[2], r[3], mTail, 0, 0.85)); sk.push([r[4], r[5], r[6]]);
        });
        loft(B, rings, sk, (i, j) => rUV(R_HAIR, 0.5 + mth(j, mTail) * 0.5, 1 - i / (rings.length - 1)), { cap0: true, cap1: true, tip1: V3(-0.06, -0.03, 0) });
      }
      // 脚
      [[8, FLEG_T, -1, FZ, 0], [12, FLEG_T, 1, FZ, 1], [16, HLEG_T, -1, HZ, 2], [20, HLEG_T, 1, HZ, 3]].forEach(([b0, tab, sd, z0, k]) => {
        const rows = hi ? tab : tab.filter((r, i) => i % 2 === 0 || i === tab.length - 1 || i < 2);
        loft(B, rows.map(([x, y, h, w]) => ell(V3(x, y, sd * (z0 - (y < 0.9 ? 0.012 * (0.9 - y) : 0))), X, Z, h, w, mLeg, -0.08, 1)),
          rows.map(r => [b0 + r[4], b0 + r[5], r[6]]), (i, j, P) => legUV(k, P), { cap0: true, cap1: true });
      });
      // 近くの形だけ：飛節の角、頬とのど、たてがみと尾の房（肩・胸前・尻の筋肉は胴の面のふくらみ MUSCLE で）
      if (hi) {
        // y0 より上は骨 a、y1 より下は骨 b
        for (const sd of [-1, 1]) {
          const h0 = sd < 0 ? 16 : 20;
          blob(B, V3(-0.795, 0.6, sd * HZ * 0.95), 0.032, 0.05, 0.03, 6, 4, { uvf: P => legUV(sd < 0 ? 2 : 3, P), bone: h0 + 2 }); // 飛節の角
        }
        // のど（首と頭のつなぎ）
        blob(B, V3(1.045, 1.72, 0), 0.1, 0.1, 0.082, 8, 6, { uvf: sideUV, skinf: () => [3, 4, 0.5] }, -0.6);
        // 尾の房：付け根から3本に分かれて下へ流れる
        for (const [dz, dy, ext] of [[-0.04, 0.0, 0.1], [0.04, 0.01, 0.07], [0, -0.03, 0.13]]) {
          const pts = [], rr = [], sks = [];
          TAIL_T.forEach((r, i) => { if (i < 2) return; const f = (i - 2) / (TAIL_T.length - 3); pts.push(V3(r[0] - 0.01, r[1] + dy * f, dz * f)); rr.push(r[3] * 0.62 * (1 - 0.3 * f)); sks.push([r[4], r[5], r[6]]); });
          const e = pts[pts.length - 1];
          pts.push(e.clone().add(V3(-ext * 0.45, -ext, dz * 0.5))); rr.push(0.022); sks.push([7, 7, 0]);
          tube(B, pts, rr, 4, sks, (i, j, P) => rUV(R_HAIR, 0.5 + (j % 4) * 0.12, 1 - i / (pts.length - 1)), { cap0: true });
        }
      }
    }
    if (!bare) {
      // ゼッケン（鞍の下の布。両脇に番号。外から読めるように）
      {
        const xs = [], nx = hi ? 6 : 3, nt = hi ? 5 : 3, x0 = -0.2, x1 = 0.3;
        for (let i = 0; i < nx; i++) xs.push(x0 + (x1 - x0) * i / (nx - 1));
        for (const sd of [1, -1]) {
          const ta = sd > 0 ? 0.3 * Math.PI : 1.07 * Math.PI, tb = sd > 0 ? 0.93 * Math.PI : 1.7 * Math.PI;
          const rings = xs.map(x => { const out = []; for (let j = 0; j < nt; j++) out.push(bodyPt(x, ta + (tb - ta) * j / (nt - 1), 0.012)); return out; });
          loft(B, rings, xs.map(() => rig(1)), (i, j) => {
            const fx = i / (nx - 1), fy = j / (nt - 1);
            return rUV(R_NUM, sd > 0 ? fx : 1 - fx, sd > 0 ? fy : 1 - fy);
          }, { open: true, inside: i => bodySec(xs[i]).c });
        }
      }
      // 鞍・腹帯
      {
        const xs = [-0.05, 0.07, 0.2, 0.33], n = hi ? 5 : 3;
        loft(B, xs.map(x => arc(bodySec(x).c, Y, Z, bodySec(x).h, bodySec(x).w, bodySec(x).k, 0.92, 0.8 * Math.PI, 1.2 * Math.PI, n, 0.042)
          .concat(arc(bodySec(x).c, Y, Z, bodySec(x).h, bodySec(x).w, bodySec(x).k, 0.92, 1.2 * Math.PI, 0.8 * Math.PI, n, 0.014))), xs.map(() => rig(1)), cell('saddle'), { cap0: true, cap1: true });
        const gx = [0.315, 0.36];
        loft(B, gx.map(x => { const s = bodySec(x); return ell(s.c, Y, Z, s.h + 0.012, s.w + 0.012, mBody, s.k * s.w / (s.w + 0.012), 0.92); }), gx.map(() => rig(1)), cell('goggle'));
      }
    }
    // 頭絡（鼻革・額革・頬革）と手綱
    {
      const ring2 = (t0, t1, off) => [t0, t1].map(t => { const s = headSec(t); return ell(s.c, vHU(), Z, s.h + off, s.w + off, mHead, s.k * s.w / (s.w + off), 0.9); });
      // o.noBridle：頭絡を描かない（骨入りの馬の素材は、その頭に合わせた頭絡を js/ui/horse_rigged.js で描く。手綱は残す）
      const bridle = !(o && o.noBridle);
      if (bridle) loft(B, ring2(0.6, 0.645, 0.008), [rig(4), rig(4)], cell('bridle'));
      if (bridle) loft(B, ring2(0.1, 0.13, 0.008), [rig(4), rig(4)], cell('bridle'));
      if (hi && bridle) for (const sd of [-1, 1]) {
        const pts = [0.04, 0.3, 0.56, 0.84].map(t => headPt(t, Math.PI - sd * 1.32, 0.006));
        tube(B, pts, 0.011, 3, pts.map(() => rig(4)), cell('bridle'));
      }
      if (!bare) for (const sd of [-1, 1]) {
        const a = headPt(0.86, Math.PI - sd * 1.75, 0.01), b = V3(0.86, 1.8, sd * 0.085), n = 5, pts = [];
        for (let i = 0; i < n; i++) pts.push(a.clone().lerp(b, i / (n - 1)).add(V3(0, 0.03 * Math.sin(i / (n - 1) * Math.PI), 0)));
        tube(B, pts, 0.008, hi ? 4 : 3, pts.map((p, i) => [4, sd < 0 ? 28 : 30, i / (n - 1)]), cell('bridle'));
      }
    }
    // 騎手：脚（白いズボン・黒い長靴。鐙に立つ）
    for (const sd of [-1, 1]) {
      const hip = V3(0.0, 1.87, sd * 0.1), knee = V3(0.4, 1.7, sd * 0.25), ankle = V3(0.24, 1.36, sd * 0.29);
      if (rider) {
        tube(B, [hip, hip.clone().lerp(knee, 0.5), knee], [0.068, 0.06, 0.048], hi ? 7 : 5, [[24, 24, 0], [24, 1, 0.5], [1, 1, 0]], cell('pants'), { cap0: true });
        blob(B, knee, 0.05, 0.05, 0.05, 6, 4, { uv: cellUV(CELL.pants), bone: 1 });
        tube(B, [knee, knee.clone().lerp(ankle, 0.3), ankle], [0.055, 0.052, 0.044], hi ? 7 : 5, [rig(1), rig(1), rig(1)], (i) => cellUV(i === 0 ? CELL.bootTop : CELL.boots), { cap1: true });
        B.box(0.29, 1.335, sd * 0.29, 0.17, 0.06, 0.075, 0, { uv: cellUV(CELL.boots), bone: 1 });
      }
      // 鐙と鐙革
      if (!bare) {
        limb(B, V3(0.14, 1.6, sd * 0.25), V3(0.27, 1.34, sd * 0.31), 0.008, 0.008, 3, { uv: cellUV(CELL.bridle), bone: 1 });
        B.box(0.29, 1.3, sd * 0.29, 0.1, 0.016, 0.1, 0, { uv: cellUV(CELL.goggle), bone: 1 });
      }
    }
    if (rider) {
      // 上体（勝負服）・尻
      {
        const rings = [], sk = [];
        SPINE_T.forEach((r, i) => {
          const a = SPINE_T[Math.max(0, i - 1)], b = SPINE_T[Math.min(SPINE_T.length - 1, i + 1)];
          const T = V3(b[0] - a[0], b[1] - a[1], 0).normalize(), u = V3(-T.y, T.x, 0);
          rings.push(ell(V3(r[0], r[1], 0), u, Z, r[2], r[3], hi ? 12 : 8, 0.05, 0.85)); sk.push([r[4], r[5], r[6]]);
        });
        const m = hi ? 12 : 8;
        loft(B, rings, sk, (i, j) => rUV(R_SILK, mth(j, m), i / (rings.length - 1)), { cap0: true, cap1: true });
        blob(B, V3(-0.02, 1.86, 0), 0.12, 0.09, 0.15, hi ? 8 : 6, hi ? 6 : 4, { uv: cellUV(CELL.pants), bone: 24 });
      }
      // 首・頭・帽子・ゴーグル
      {
        limb(B, V3(0.53, 2.05, 0), V3(0.62, 2.11, 0), 0.045, 0.042, hi ? 6 : 4, { uv: cellUV(CELL.skin), bone: 26 });
        blob(B, V3(0.655, 2.14, 0), 0.098, 0.1, 0.088, hi ? 9 : 6, hi ? 7 : 5, { uv: cellUV(CELL.skin), bone: 26 });
        const g = new THREE.SphereGeometry(0.122, hi ? 12 : 8, hi ? 7 : 4, 0, TAU, 0, Math.PI * 0.56);
        B.add(g, new THREE.Matrix4().compose(V3(0.645, 2.155, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.5)), V3(1.06, 1, 1.0)), { uv: cellUV(CELL.cap), bone: 26 });
        B.add(new THREE.BoxGeometry(0.1, 0.014, 0.17), new THREE.Matrix4().compose(V3(0.76, 2.19, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.28)), V3(1, 1, 1)), { uv: cellUV(CELL.cap), bone: 26 });
        B.box(0.742, 2.14, 0, 0.03, 0.045, 0.16, 0, { uv: cellUV(CELL.goggle), bone: 26 });
      }
      // 腕（袖）・手（手袋）
      for (const sd of [-1, 1]) {
        const ua = sd < 0 ? 27 : 29, fa = ua + 1;
        const sh = V3(0.43, 2.0, sd * 0.15), el = V3(0.58, 1.86, sd * 0.2), hd = V3(0.84, 1.81, sd * 0.1);
        tube(B, [sh, sh.clone().lerp(el, 0.5), el, el.clone().lerp(hd, 0.5), hd], [0.058, 0.052, 0.046, 0.042, 0.036], hi ? 7 : 5,
          [[ua, ua, 0], [ua, ua, 0], [ua, fa, 0.5], [fa, fa, 0], [fa, fa, 0]], cell('sleeve'), { cap0: true });
        blob(B, hd.clone().add(V3(0.02, -0.005, 0)), 0.045, 0.04, 0.04, hi ? 6 : 4, 4, { uv: cellUV(CELL.white), bone: fa });
      }
    }
    if (!bare) {
      // ムチ（右手。ふだんは肩の方へ寝かせる）
      {
        const a = V3(0.86, 1.81, 0.11), b = V3(0.36, 2.15, 0.27);
        limb(B, a, b, 0.014, 0.008, 4, { uv: cellUV(CELL.dark), bone: 31 });
        B.add(new THREE.BoxGeometry(0.06, 0.035, 0.008), new THREE.Matrix4().compose(b, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.6)), V3(1, 1, 1)), { uv: cellUV(CELL.dark), bone: 31 });
      }
    }
    // 馬具（使う馬だけ骨を伸ばして見せる）
    {
      // シャドーロール：鼻の上の白いもこもこ
      const n = hi ? 11 : 7, pts = [], r = [];
      for (let i = 0; i < n; i++) { const th = Math.PI * (0.46 + 1.08 * i / (n - 1)); pts.push(headPt(0.6, th, 0.056)); r.push(0.062 * (1 + 0.16 * Math.sin(i * 2.7)) * (i === 0 || i === n - 1 ? 0.7 : 1)); }
      const rings = [];
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        const T = b.clone().sub(a).normalize(), u = new THREE.Vector3().crossVectors(Z, T).normalize();
        const s = new THREE.Vector3().crossVectors(T, u).normalize(), m = hi ? 8 : 5, ring = [];
        for (let j = 0; j < m; j++) { const th = j / m * TAU, rr = r[i] * (1 + 0.16 * Math.sin(j * 2.3 + i * 1.7) + 0.08 * Math.sin(j * 5.1 + i * 3.3)); ring.push(pts[i].clone().addScaledVector(u, Math.cos(th) * rr).addScaledVector(s, Math.sin(th) * rr * 1.1)); }
        rings.push(ring);
      }
      loft(B, rings, rings.map(() => rig(GEAR.shadowRoll)), cell('roll'), { cap0: true, cap1: true });
      // ブリンカー：目のまわりのカップ
      for (const sd of [-1, 1]) {
        const eye = headPt(0.21, Math.PI - sd * 1.0, 0.0);
        const out = eye.clone().sub(headSec(0.21).c).normalize();
        const fwd = new THREE.Vector3(HD[0], HD[1], 0).multiplyScalar(-0.2).addScaledVector(vHU(), 0.15).addScaledVector(out, 0.9).normalize();
        const g = new THREE.CylinderGeometry(0.064, 0.048, 0.07, hi ? 10 : 6, 1, false);
        g.translate(0, 0.02, 0);
        B.add(g, new THREE.Matrix4().compose(eye.clone().addScaledVector(out, 0.012), new THREE.Quaternion().setFromUnitVectors(Y, fwd), V3(1, 1, 0.85)), { uv: cellUV(CELL.gear), bone: GEAR.blinkers });
      }
      // メンコ：耳覆いと、額からうなじを包む布
      for (const sd of [-1, 1]) {
        const base = headPt(0.03, Math.PI - sd * 0.55, -0.02);
        const dir = vHU().multiplyScalar(0.75).addScaledVector(new THREE.Vector3(-HD[0], -HD[1], 0), 0.55).addScaledVector(Z, sd * 0.2).normalize();
        const g = new THREE.ConeGeometry(0.056, 0.19, hi ? 7 : 5);
        g.translate(0, 0.088, 0);
        B.add(g, new THREE.Matrix4().compose(base, new THREE.Quaternion().setFromUnitVectors(Y, dir), V3(0.7, 1, 1)), { uv: cellUV(CELL.gear), bone: GEAR.hood });
      }
      const ht = [-0.03, 0.08, 0.18, 0.3, 0.4], na = hi ? 6 : 4;
      loft(B, ht.map(t => { const s = headSec(Math.max(0, t)); return arc(s.c, vHU(), Z, s.h, s.w, s.k, 0.9, Math.PI * 0.42, Math.PI * 1.58, na, 0.018).concat(arc(s.c, vHU(), Z, s.h, s.w, s.k, 0.9, Math.PI * 1.58, Math.PI * 0.42, na, 0.005)); }),
        ht.map(() => rig(GEAR.hood)), cell('gear'), { cap0: true, cap1: true });
      // チークピーシーズ：頬革の上のもこもこ
      for (const sd of [-1, 1]) {
        const pts = [0.1, 0.24, 0.38, 0.5].map(t => headPt(t, Math.PI - sd * 1.32, 0.022));
        tube(B, pts, [0.016, 0.026, 0.026, 0.018], hi ? 6 : 4, pts.map(() => rig(GEAR.cheekPieces)), cell('cheek'), { cap0: true, cap1: true });
      }
    }
    const g = B.build();
    // 体の比を直す（上の mapPt）。法線は写したあとの形から計算し直す
    {
      const P = g.attributes.position, si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array;
      for (let i = 0; i < P.count; i++) {
        const m = mapPt(P.getX(i), P.getY(i), P.getZ(i), si[i * 4], si[i * 4 + 1], sw[i * 4 + 1]);
        P.setXYZ(i, m[0], m[1], m[2]);
      }
      g.computeVertexNormals();
      g.computeBoundingSphere();
    }
    g.boundingSphere.radius += 0.8; // 脚・首・尾が動いても切れないように
    return g;
  }

  // 馬ごとの絵：毛色（年齢で白くなる芦毛も）・白徴・帽子・勝負服・ゼッケン・馬具の色
  const DEF_LOOK = { body: '#7d4322', top: '#5c2f16', belly: '#8f5531', mane: '#16100c', tail: '#16100c', points: '#17110d', muzzle: '#3b2519', hoof: '#26211d', gloss: 0.5 };
  function coatLook(c, age) {
    const A = HS.Art;
    return A && A.coatLook ? A.coatLook(c, age) : DEF_LOOK;
  }
  // 色（#rrggbb・rgb()・rgba()）を、同じ色で不透明度 a に
  function clear(col, a) {
    let r = 0, gg = 0, b = 0, a0 = 1;
    if (col[0] === '#') { r = parseInt(col.slice(1, 3), 16); gg = parseInt(col.slice(3, 5), 16); b = parseInt(col.slice(5, 7), 16); }
    else { const m = col.match(/[\d.]+/g) || []; r = +m[0] || 0; gg = +m[1] || 0; b = +m[2] || 0; if (m[3] != null) a0 = +m[3]; }
    return `rgba(${r},${gg},${b},${a0 * a})`;
  }
  function paintHorse(h, res) {
    res = res || 256;
    const cv = canvasOf(res, res), g = cv.getContext('2d');
    g.scale(res / 256, res / 256); // 割り付けは 256 の目盛りで書く
    const L = coatLook(h.coat, h.age), mk = h.noMarks ? { blaze: 'none', socks: [false, false, false, false] } : marksOf(h.name || String(h.num)), sk = h.silks || DEF_SILKS, gear = h.gear || {};
    const cell = (k, col) => { const i = CELL[k]; g.fillStyle = col; g.fillRect((i % 8) * 32, Math.floor(i / 8) * 32, 32, 32); };
    cell('saddle', '#1d1a18'); cell('pants', '#f2f2f0'); cell('boots', '#141414'); cell('bootTop', '#8a5a34'); cell('skin', '#e3bf9c');
    cell('cap', h.cap || frameColor(h.frame)); cell('sleeve', sk.sub || sk.base); cell('goggle', '#2a2f36'); cell('white', '#f4f4f2'); cell('eye', '#0c0a08');
    cell('mane', L.mane); cell('bridle', '#2a1c12'); cell('roll', gear.rollColor || '#f6f4ee'); cell('gear', gear.color || '#25345e'); cell('dark', '#181210');
    cell('cheek', gear.cheekColor || gear.rollColor || '#f3f0e6');
    const rect = (r, fn) => { g.save(); g.beginPath(); g.rect(r[0], r[1], r[2], r[3]); g.clip(); fn(r[0], r[1], r[2], r[3]); g.restore(); };
    // 体の色：横から見た位置（x, y）で決まる。背は濃く、腹は明るく（毛色による）、まだら・差し毛
    const paintSide = (r, x0, x1) => rect(r, (rx, ry, rw, rh) => {
      const py = y => ry + rh - (y - SY0) / (SY1 - SY0) * rh, px = x => rx + (x - x0) / (x1 - x0) * rw;
      const gr = g.createLinearGradient(0, py(1.7), 0, py(0.85));
      gr.addColorStop(0, L.top); gr.addColorStop(0.3, L.body); gr.addColorStop(0.75, L.body); gr.addColorStop(1, L.belly);
      g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
      // 丸いぼかし（外へ同じ色のまま透ける。黒へ透けると縁が輪になる）
      const spot = (x, y, rr, col, a) => { const R = rr / (SY1 - SY0) * rh; const gg = g.createRadialGradient(px(x), py(y), 0, px(x), py(y), R); gg.addColorStop(0, col); gg.addColorStop(0.45, clear(col, 0.7)); gg.addColorStop(1, clear(col, 0)); g.globalAlpha = a; g.fillStyle = gg; g.fillRect(px(x) - R, py(y) - R, R * 2, R * 2); g.globalAlpha = 1; };
      if (L.tan) { spot(-0.42, 1.08, 0.3, L.tan, 0.75); spot(0.38, 1.0, 0.22, L.tan, 0.6); spot(-0.7, 1.15, 0.2, L.tan, 0.35); }
      // 連銭：ぼかした丸の斑点（胴と尻に多く、腹・胸の前には少なく）
      if (L.dapple > 0) for (let i = 0; i < 90; i++) {
        const x = -1.05 + hash01(i, 91) * 1.9, y = 0.95 + hash01(i, 92) * 0.68;
        const edge = Math.min(1, Math.max(0, (y - 0.95) / 0.15)) * Math.min(1, Math.max(0, (0.85 - x) / 0.25));
        spot(x, y, 0.035 + hash01(i, 93) * 0.035, L.dappleCol, L.dapple * edge * (0.45 + hash01(i, 94) * 0.45));
      }
      if (L.roan > 0) { g.fillStyle = 'rgba(235,232,226,' + (0.25 * L.roan) + ')'; for (let i = 0; i < 900; i++) { const x = -1.0 + hash01(i, 95) * 1.8, y = 0.9 + hash01(i, 96) * 0.75; g.fillRect(px(x), py(y), 1, 1); } }
      // 筋肉の境の陰（肩の後ろ・肘・首の下・脇腹・尻の後ろ・後膝）。ぼかした線で
      const pxm = rw / (x1 - x0) * res / 256;
      const groove = (pts, w, a) => {
        g.save(); g.filter = `blur(${Math.max(0.5, w * 0.6 * pxm).toFixed(1)}px)`;
        g.strokeStyle = `rgba(0,0,0,${a})`; g.lineWidth = w / (SY1 - SY0) * rh; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(px(x), py(y)) : g.moveTo(px(x), py(y))); g.stroke(); g.restore();
      };
      const dk = (L.dapple > 0 ? 0.6 : 1) * 1.5;
      groove([[0.45, 1.52], [0.39, 1.27], [0.36, 1.03]], 0.05, 0.17 * dk);
      groove([[0.33, 1.0], [0.5, 0.97], [0.63, 1.04]], 0.04, 0.13 * dk);
      groove([[0.74, 1.2], [0.93, 1.48], [1.04, 1.67]], 0.035, 0.09 * dk);
      groove([[-0.3, 1.0], [-0.41, 1.21], [-0.5, 1.43]], 0.06, 0.13 * dk);
      groove([[-0.93, 1.5], [-0.89, 1.26], [-0.8, 1.02]], 0.05, 0.17 * dk);
      groove([[-0.5, 1.42], [-0.45, 1.16], [-0.52, 0.98]], 0.045, 0.1 * dk);
      // 筋肉の山の光り（肩・上腕・尻・太もも・首すじ・胴）。光を計算する材質（細かい絵）では控えめに
      // 光りの丸は弱く広く（白い点が乗らず、面の明るさの差で筋肉が見えるように）
      const gk = res > 256 ? 0.3 : 0.6, ga = (0.05 + 0.05 * L.gloss) * gk;
      spot(0.53, 1.36, 0.3, 'rgba(255,255,255,0.5)', ga); spot(-0.66, 1.43, 0.34, 'rgba(255,255,255,0.5)', ga);
      spot(0.8, 1.68, 0.2, 'rgba(255,255,255,0.5)', ga * 0.7); spot(0.0, 1.32, 0.45, 'rgba(255,255,255,0.5)', ga * 0.5);
      // 頭の側（耳）
      spot(1.1, 2.05, 0.12, L.top, 0.5);
    });
    paintSide(R_BODY, SX0, SX1);
    // 脚：体の続きの色 → 膝・飛節から下は脚先の色 → 白い靴下 → 蹄
    const sockLen = k => [0.16, 0.24, 0.34, 0.46][Math.floor(hash01(strHash((h.name || '') + k), 5) * 4)];
    R_LEG.forEach((r, k) => {
      paintSide(r, LEG_XC[k] - LEG_HW, LEG_XC[k] + LEG_HW);
      rect(r, (rx, ry, rw, rh) => {
        const py = y => ry + rh - y / LEG_H * rh;
        const kn = k < 2 ? 0.53 : 0.58;
        const gr = g.createLinearGradient(0, py(kn + (L.pointsSoft ? 0.3 : 0.14)), 0, py(kn - 0.02));
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, L.points);
        g.fillStyle = gr; g.fillRect(rx, py(kn + 0.32), rw, py(kn - 0.02) - py(kn + 0.32));
        g.fillStyle = L.points; g.fillRect(rx, py(kn - 0.02), rw, py(0) - py(kn - 0.02));
        const sock = mk.socks && mk.socks[k];
        if (sock) {
          const top = sockLen(k);
          g.fillStyle = '#f2efe8'; g.fillRect(rx, py(top), rw, py(0.075) - py(top));
          for (let i = 0; i < 6; i++) g.fillRect(rx + i * rw / 6, py(top + 0.02 * hash01(k * 9 + i, 7)), rw / 6, py(top) - py(top + 0.02 * hash01(k * 9 + i, 7)) + 1);
        }
        g.fillStyle = sock ? '#b8a68a' : L.hoof; g.fillRect(rx, py(0.078), rw, py(0) - py(0.078) + 1);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(rx, py(0.082), rw, 2);
      });
    });
    // たてがみ・尾：毛の筋
    rect(R_HAIR, (rx, ry, rw, rh) => {
      g.fillStyle = L.mane; g.fillRect(rx, ry, rw / 2, rh);
      g.fillStyle = L.tail; g.fillRect(rx + rw / 2, ry, rw / 2, rh);
      for (let i = 0; i < 40; i++) {
        const x = rx + hash01(i, 81) * rw;
        g.fillStyle = hash01(i, 82) > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.22)';
        g.fillRect(x, ry, 1, rh);
      }
    });
    // 頭：横（u＝うなじ→鼻先）× 回り（v＝下・あご → 顔の前）。鼻先は鼻の色、流星は顔の前
    rect(R_HEAD, (rx, ry, rw, rh) => {
      const gr = g.createLinearGradient(rx, 0, rx + rw, 0);
      gr.addColorStop(0, L.body); gr.addColorStop(0.62, L.body); gr.addColorStop(0.85, L.muzzleMid || L.muzzle); gr.addColorStop(1, L.muzzle);
      g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
      const gv = g.createLinearGradient(0, ry + rh, 0, ry);
      gv.addColorStop(0, 'rgba(0,0,0,0.12)'); gv.addColorStop(0.5, 'rgba(0,0,0,0)'); gv.addColorStop(1, 'rgba(255,255,255,0.05)');
      g.fillStyle = gv; g.fillRect(rx, ry, rw, rh);
      const W = '#f4f2ec', px = t => rx + t * rw, py = v => ry + (1 - v) * rh;
      g.fillStyle = W;
      if (mk.blaze === 'star') { g.beginPath(); g.ellipse(px(0.2), py(0.97), rw * 0.05, rh * 0.16, 0, 0, TAU); g.fill(); }
      else if (mk.blaze === 'stripe') { g.beginPath(); g.moveTo(px(0.16), py(1)); g.lineTo(px(0.16), py(0.86)); g.lineTo(px(0.85), py(0.92)); g.lineTo(px(0.85), py(1)); g.fill(); }
      else if (mk.blaze === 'blaze') { g.beginPath(); g.moveTo(px(0.12), py(1)); g.lineTo(px(0.14), py(0.8)); g.lineTo(px(0.6), py(0.82)); g.lineTo(px(1), py(0.62)); g.lineTo(px(1), py(1)); g.fill(); }
    });
    // 勝負服（横＝体のまわり 0 胸 → 1 背、縦＝腰 → 首）
    rect(R_SILK, (bx, by, bw, bh) => {
      g.fillStyle = sk.base; g.fillRect(bx, by, bw, bh);
      g.fillStyle = sk.sub || '#ffffff';
      const p = sk.pattern;
      g.beginPath();
      if (p === 'hoops') for (let i = 0; i < 4; i++) g.rect(bx, by + (i + 0.3) * bh / 4, bw, bh / 9);
      else if (p === 'stripes') for (let i = 0; i < 4; i++) g.rect(bx + (i + 0.3) * bw / 4, by, bw / 9, bh);
      else if (p === 'sash') { g.moveTo(bx + bw * 0.45, by); g.lineTo(bx + bw * 0.75, by); g.lineTo(bx + bw * 0.55, by + bh); g.lineTo(bx + bw * 0.25, by + bh); g.closePath(); }
      else if (p === 'cross') { const w = bw * 0.12; g.moveTo(bx, by); g.lineTo(bx + w, by); g.lineTo(bx + bw, by + bh); g.lineTo(bx + bw - w, by + bh); g.closePath(); g.moveTo(bx + bw, by); g.lineTo(bx + bw - w, by); g.lineTo(bx, by + bh); g.lineTo(bx + w, by + bh); g.closePath(); }
      else if (p === 'diamonds') for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const cx = bx + (i + 0.5) * bw / 4, cy = by + (j + 0.5) * bh / 2; g.moveTo(cx, cy - bh / 4.5); g.lineTo(cx + bw / 9, cy); g.lineTo(cx, cy + bh / 4.5); g.lineTo(cx - bw / 9, cy); g.closePath(); }
      else if (p === 'stars') for (let i = 0; i < 5; i++) { const cx = bx + (0.12 + i * 0.19) * bw, cy = by + (i % 2 ? 0.3 : 0.7) * bh, r = bh * 0.16; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; if (k) g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); }
      else if (p === 'halves') g.rect(bx + bw / 2, by, bw / 2, bh);
      else if (p === 'yoke') g.rect(bx, by + bh * 0.62, bw, bh * 0.38);
      g.fill();
    });
    // ゼッケン：白地に黒の番号
    rect(R_NUM, (x, y, w, hh) => {
      g.fillStyle = '#f4f4f2'; g.fillRect(x, y, w, hh);
      g.strokeStyle = '#2a2a2a'; g.lineWidth = 3; g.strokeRect(x + 4.5, y + 4.5, w - 9, hh - 9);
      g.fillStyle = '#111'; g.font = `bold 54px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(h.num != null ? h.num : ''), x + w / 2, y + hh / 2 + 3);
    });
    return cv;
  }

  // 馬の体の凹凸（全頭で共有する法線の絵。割り付けは馬ごとの絵と同じ）：肩・前腕・尻・後ろ腿の筋肉、あばら、首の付け根、脚の腱、たてがみ・尾の毛の筋
  let HORSE_NOR = null;
  function horseNormalCanvas(res) {
    res = res || 512;
    const k = res / 256, hc = canvasOf(res, res), g = hc.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, res, res);
    g.scale(k, k);
    const bump = (r, x0, x1, y0, y1, pts) => {
      g.save(); g.beginPath(); g.rect(r[0], r[1], r[2], r[3]); g.clip();
      const px = x => r[0] + (x - x0) / (x1 - x0) * r[2], py = y => r[1] + r[3] - (y - y0) / (y1 - y0) * r[3];
      for (const [x, y, rx, ry, a, rot] of pts) {
        const R = Math.max(rx / (x1 - x0) * r[2], 0.5), Ry = Math.max(ry / (y1 - y0) * r[3], 0.5);
        g.save(); g.translate(px(x), py(y)); g.rotate(rot || 0); g.scale(1, Ry / R);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, R);
        const c = a > 0 ? '255,255,255' : '0,0,0';
        gr.addColorStop(0, `rgba(${c},${Math.abs(a)})`); gr.addColorStop(0.55, `rgba(${c},${Math.abs(a) * 0.55})`); gr.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.restore();
      }
      g.restore();
    };
    // 体（横から見た x, y）
    const side = [
      [0.52, 1.3, 0.2, 0.26, 0.3, -0.3], [0.5, 0.92, 0.07, 0.17, 0.35], [0.7, 1.15, 0.1, 0.18, 0.25, 0.4],
      [-0.6, 1.42, 0.27, 0.22, 0.5], [-0.72, 1.08, 0.13, 0.22, 0.45, 0.2], [-0.35, 1.2, 0.16, 0.1, -0.2], [-0.92, 1.35, 0.1, 0.14, 0.25],
      [0.0, 1.0, 0.36, 0.08, 0.25], [0.15, 1.5, 0.3, 0.06, 0.15], [0.86, 1.48, 0.16, 0.08, 0.3, -0.9], [0.98, 1.68, 0.1, 0.06, 0.25, -0.9],
    ];
    for (let i = 0; i < 5; i++) side.push([-0.25 + i * 0.1, 1.17, 0.025, 0.16, -0.18, 0.15]); // あばら
    bump(R_BODY, SX0, SX1, SY0, SY1, side);
    // 脚：腱（縦の筋）と関節のふくらみ
    R_LEG.forEach((r, kk) => {
      const xc = LEG_XC[kk], fr = kk < 2, kn = fr ? 0.53 : 0.58;
      bump(r, xc - LEG_HW, xc + LEG_HW, 0, LEG_H, [
        [xc - 0.02, 0.36, 0.03, 0.16, 0.35], [xc, kn, 0.06, 0.05, 0.45], [xc, 0.22, 0.05, 0.04, 0.4], [xc + 0.02, fr ? 0.9 : 0.95, 0.09, 0.2, 0.35],
      ]);
    });
    // 頭：頬のふくらみ・鼻すじ・目の上のくぼみ
    bump(R_HEAD, 0, 1, 0, 1, [[0.24, 0.35, 0.12, 0.3, 0.45], [0.6, 0.85, 0.3, 0.1, 0.25], [0.18, 0.8, 0.05, 0.1, -0.3], [0.93, 0.5, 0.05, 0.2, 0.3]]);
    g.setTransform(1, 0, 0, 1, 0, 0);
    // たてがみ・尾：毛の筋
    {
      const r = R_HAIR.map(v => v * k);
      for (let i = 0; i < 70; i++) {
        const x = r[0] + hash01(i, 83) * r[2];
        g.fillStyle = hash01(i, 84) > 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
        g.fillRect(x, r[1], k * (0.5 + hash01(i, 85)), r[3]);
      }
    }
    // 高さ → 法線（OpenGL の向き。絵の上が +v）
    const src = g.getImageData(0, 0, res, res).data, out = g.createImageData(res, res), d = out.data, S = 1.6;
    const H = (x, y) => src[((Math.min(res - 1, Math.max(0, y)) * res) + Math.min(res - 1, Math.max(0, x))) * 4] / 255;
    for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * S, dy = (H(x, y + 1) - H(x, y - 1)) * S;
      const l = Math.hypot(dx, dy, 1), i = (y * res + x) * 4;
      d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
    g.putImageData(out, 0, 0);
    return hc;
  }

  // ---- 走りの動き ----
  // 周期の折れ線をなめらかにつなぐ（Catmull-Rom）。K＝[[位相, 値], ...]
  function cyc(K, x) {
    x = ((x % 1) + 1) % 1;
    const n = K.length;
    let i = n - 1;
    for (let k = 0; k < n; k++) if (K[k][0] <= x) i = k;
    const p0 = K[(i - 1 + n) % n][1], p1 = K[i][1], p2 = K[(i + 1) % n][1], p3 = K[(i + 2) % n][1];
    const t1 = K[i][0], t2 = K[(i + 1) % n][0] + (i + 1 >= n ? 1 : 0);
    const u = (x + (x < t1 ? 1 : 0) - t1) / (t2 - t1 || 1), u2 = u * u, u3 = u2 * u;
    return 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (3 * p1 - p0 - 3 * p2 + p3) * u3);
  }
  // 脚の関節の角度（φ＝その脚が地面に着いてからの位相。0〜DUTY が地面を押す間、そのあと畳んで前へ振り出す）
  //   正の角度＝下を向いた骨の先が前へ。膝・飛節・球節の曲がりもこの向きで書く
  const F_DUTY = 0.25, H_DUTY = 0.27;
  const FK = [
    [[0, 0.38], [0.125, 0.0], [0.25, -0.42], [0.4, -0.4], [0.6, 0.05], [0.8, 0.42], [0.92, 0.47]],   // 肩
    [[0, 0.04], [0.125, 0.0], [0.25, -0.08], [0.4, 0.25], [0.6, 0.85], [0.8, 0.62], [0.92, 0.22]],   // 肘
    [[0, 0.0], [0.125, 0.04], [0.25, 0.0], [0.38, -0.9], [0.5, -1.75], [0.65, -1.6], [0.8, -0.6], [0.92, -0.05]], // 膝
    [[0, 0.15], [0.1, 0.45], [0.2, 0.35], [0.28, -0.2], [0.4, -0.9], [0.6, -0.7], [0.8, -0.25], [0.92, 0.1]],     // 球節
  ];
  const HK = [
    [[0, 0.42], [0.13, 0.05], [0.27, -0.42], [0.42, -0.42], [0.6, -0.05], [0.78, 0.38], [0.9, 0.5]],  // 股
    [[0, 0.0], [0.13, -0.05], [0.27, 0.12], [0.42, -0.1], [0.6, -0.5], [0.78, -0.45], [0.9, -0.12]],  // 後膝
    [[0, 0.1], [0.13, 0.28], [0.27, -0.05], [0.42, 0.7], [0.6, 1.35], [0.78, 1.0], [0.9, 0.35]],        // 飛節
    [[0, 0.1], [0.13, 0.45], [0.25, 0.2], [0.35, -0.5], [0.5, -1.0], [0.68, -0.6], [0.85, -0.15]],     // 球節
  ];
  // 襲歩の4拍子（左手前）：右後 → 左後 → 右前 → 左前、そのあと4本とも浮く。右手前は左右を入れ替える
  const TOUCH_L = { 8: 0.46, 12: 0.34, 16: 0.12, 20: 0.0 }, TOUCH_R = { 8: 0.34, 12: 0.46, 16: 0.0, 20: 0.12 };
  const BOB = [[0, -0.3], [0.13, -0.7], [0.3, -0.2], [0.46, -0.6], [0.6, -0.5], [0.75, 0.2], [0.88, 0.8]];  // 胴の上下（浮く間が高い）
  const PITCH = [[0, 0.3], [0.16, 0.7], [0.34, 0.1], [0.5, -0.6], [0.66, -0.6], [0.84, -0.1]];          // 胴の前後の傾き（＋＝鼻が上）
  const NOD = [[0, 0.5], [0.2, 0.8], [0.4, 0.0], [0.56, -0.8], [0.72, -0.6], [0.86, 0.0]];               // 首の上下（＋＝上げる）
  const LEG_LAG = [0, 0.018, 0.036, 0.055];
  // 常歩（なみあし）の4拍子：左後 → 左前 → 右後 → 右前。脚は 6 割の間地面に着いている
  const W_DUTY = 0.62, WALK_STRIDE = 1.75;
  const WALK_TOUCH = { 8: 0.25, 12: 0.75, 16: 0.0, 20: 0.5 };
  const WFK = [
    [[0, 0.2], [0.31, 0.0], [0.62, -0.2], [0.75, -0.12], [0.88, 0.12]],                 // 肩
    [[0, 0.0], [0.31, 0.0], [0.62, 0.02], [0.75, 0.3], [0.88, 0.2]],                    // 肘
    [[0, 0.0], [0.31, 0.0], [0.62, -0.05], [0.72, -0.75], [0.84, -0.45], [0.95, -0.05]], // 膝
    [[0, 0.08], [0.31, 0.2], [0.58, 0.15], [0.7, -0.6], [0.82, -0.4], [0.95, 0.0]],     // 球節
  ];
  const WHK = [
    [[0, 0.22], [0.31, 0.0], [0.62, -0.22], [0.75, -0.08], [0.88, 0.16]],               // 股
    [[0, 0.0], [0.31, 0.04], [0.62, 0.0], [0.75, -0.25], [0.88, -0.12]],                // 後膝
    [[0, 0.1], [0.31, 0.12], [0.62, 0.05], [0.74, 0.6], [0.86, 0.4], [0.96, 0.15]],     // 飛節
    [[0, 0.08], [0.31, 0.2], [0.58, 0.15], [0.7, -0.55], [0.84, -0.35], [0.95, 0.0]],   // 球節
  ];
  const HOOF_OFF = [0.07 * KX, -0.215, 0];
  const _m = { a: null, v: null };
  // 蹄の底の高さ（馬の形の中で。胴の骨から関節をたどる）
  function hoofY(b, b0) {
    const A = _m.a || (_m.a = new THREE.Matrix4()), V = _m.v || (_m.v = new THREE.Vector3());
    A.copy(b[1].matrix);
    for (let i = 0; i < 4; i++) A.multiply(b[b0 + i].matrix);
    V.set(HOOF_OFF[0], HOOF_OFF[1], 0).applyMatrix4(A);
    return V.y;
  }
  // 馬の形を動かす。ph＝走りの位相 0〜1、sp＝走りの大きさ（0＝立つ）、push＝騎手の追い 0〜1、lead＝手前（1＝左）
  // 常歩の形（脚・首・尾・胴の高さ）。phW＝常歩の位相
  function walkPose(H, phW, t, seed) {
    const b = H.bones;
    for (const b0 of [8, 12, 16, 20]) {
      const K = b0 < 16 ? WFK : WHK, phi = ((phW - WALK_TOUCH[b0]) % 1 + 1) % 1;
      for (let i = 0; i < 4; i++) b[b0 + i].rotation.z = cyc(K[i], phi - LEG_LAG[i] * 0.5);
    }
    // 前脚が着くたびに首が下がる（1周期に2回）。頭はそれより少し遅れる
    const n1 = Math.cos((phW - 0.3) * TAU * 2), n2 = Math.cos((phW - 0.36) * TAU * 2);
    b[2].rotation.z = -0.06 + 0.035 * n1;
    b[3].rotation.z = -0.02 + 0.02 * n2;
    b[4].rotation.z = 0.05 - 0.03 * n2 + 0.03 * Math.sin(t * 0.6 + seed * 3);
    b[2].rotation.y = 0.025 * Math.sin(phW * TAU) + 0.03 * Math.sin(t * 0.23 + seed * 5);
    b[4].rotation.y = -0.5 * b[2].rotation.y;
    // 胴：後脚の踏み込みに合わせて少し左右に揺れ、上下は小さく
    b[1].position.y = 1.25 + 0.008 * Math.cos(phW * TAU * 2);
    b[1].rotation.x = 0.018 * Math.sin((phW - 0.1) * TAU);
    b[1].rotation.z = 0.008 * Math.cos((phW - 0.15) * TAU * 2);
    // 尾：腰の揺れに遅れて左右に振れる
    b[5].rotation.z = 0.72 + 0.02 * Math.sin(phW * TAU * 2);
    b[5].rotation.x = 0.08 * Math.sin((phW - 0.25) * TAU);
    b[6].rotation.z = 0.22; b[6].rotation.x = 0.06 * Math.sin((phW - 0.35) * TAU);
    b[7].rotation.z = 0.15; b[7].rotation.x = 0.05 * Math.sin((phW - 0.45) * TAU);
    b[1].updateMatrix();
    for (let i = 8; i < 24; i++) b[i].updateMatrix();
    // 着いている脚の蹄を地面へ
    let ws = 0, wy = 0;
    for (const b0 of [8, 12, 16, 20]) {
      const phi = ((phW - WALK_TOUCH[b0]) % 1 + 1) % 1;
      if (phi < W_DUTY) { const w = Math.sin(phi / W_DUTY * Math.PI) + 0.05; ws += w; wy += w * hoofY(b, b0); }
    }
    if (ws > 0) b[1].position.y -= wy / ws;
  }
  const _wk = { r: null, x: null };
  function poseHorse(H, ph, sp, push, t, seed, whip, pose, walk) {
    const b = H.bones;
    // 常歩だけ（パドック・発走前後のゆっくりの歩み）。walk＝{ ph, w }（w＝常歩の重み 0〜1）
    const wk = walk && walk.w > 0 ? Math.min(1, walk.w) : 0;
    if (wk >= 1 || (wk > 0 && sp <= 0)) {
      poseHorse(H, ph, 0, 0, t, seed, null, null, null);
      walkPose(H, walk.ph, t, seed);
      for (let i = 1; i < 24; i++) b[i].updateMatrix();
      return;
    }
    const J = BONES;
    // 騎手の骨を元の位置へ
    b[24].position.set(J[24][1] - J[1][1], J[24][2] - J[1][2], 0);
    for (const i of [1, 2, 3, 4, 5, 6, 7, 24, 25, 26, 27, 28, 29, 30, 31]) b[i].rotation.set(0, 0, 0);
    let bob = 0, pitch = 0;
    if (sp <= 0) {
      // 立ち姿：息で胴がわずかに上下し、ゆっくり体重を左右へ移す。首と頭はあたりを見回し、尾はときどき振る
      const br = Math.sin(t * 1.7 + seed * 9), sw = Math.sin(t * 0.31 + seed * 4);
      b[1].position.y = 1.25 + 0.004 * br;
      b[1].rotation.x = 0.012 * sw;
      b[1].rotation.z = 0.004 * br;
      b[2].rotation.z = 0.04 * Math.sin(t * 1.1 + seed * 5) + 0.01 * br;
      b[3].rotation.z = 0.02 * Math.sin(t * 0.8 + seed * 6 - 0.5);
      b[4].rotation.z = 0.06 * Math.sin(t * 0.7 + seed * 3);
      b[2].rotation.y = 0.06 * Math.sin(t * 0.27 + seed * 2);
      b[4].rotation.y = 0.05 * Math.sin(t * 0.41 + seed * 8 - 0.6);
      const swish = Math.pow(Math.max(0, Math.sin(t * 0.45 + seed * 11)), 6);
      b[5].rotation.z = 0.75 + 0.05 * Math.sin(t * 1.3 + seed * 7); b[6].rotation.z = 0.25; b[7].rotation.z = 0.15;
      b[5].rotation.x = 0.05 * Math.sin(t * 0.9 + seed) + 0.25 * swish * Math.sin(t * 5.5);
      b[6].rotation.x = 0.3 * swish * Math.sin(t * 5.5 - 0.7); b[7].rotation.x = 0.35 * swish * Math.sin(t * 5.5 - 1.4);
      for (let i = 8; i < 24; i++) b[i].rotation.z = 0;
      b[24].position.y -= 0.03;
      b[25].rotation.z = 0.08 + 0.03 * Math.sin(t * 0.8 + seed * 2);
      b[26].rotation.z = -0.08;
      b[27].rotation.z = b[29].rotation.z = -0.15; b[28].rotation.z = b[30].rotation.z = -0.25;
    } else {
      const k = Math.min(sp, 1.1);
      const T = H.lead > 0 ? TOUCH_L : TOUCH_R;
      for (const b0 of [8, 12, 16, 20]) {
        const front = b0 < 16, K = front ? FK : HK, phi = ((ph - T[b0]) % 1 + 1) % 1;
        // 関節ごとに少しずつ遅らせる（肩→肘→膝→球節、股→後膝→飛節→球節の順にしなる）
        for (let i = 0; i < 4; i++) b[b0 + i].rotation.z = k * cyc(K[i], phi - LEG_LAG[i]);
      }
      bob = 0.035 * k * cyc(BOB, ph);
      pitch = 0.065 * k * cyc(PITCH, ph);
      b[1].position.y = 1.25 + bob;
      b[1].rotation.z = pitch;
      b[1].updateMatrix();
      for (let i = 8; i < 24; i++) b[i].updateMatrix();
      // 地面を押している脚の蹄が地面に着くように、胴の高さを寄せる
      // 4本とも浮いている間は、いちばん低い蹄を地面から少し上げる
      let ws = 0, wy = 0, lo = 9;
      for (const b0 of [8, 12, 16, 20]) {
        const duty = b0 < 16 ? F_DUTY : H_DUTY, phi = ((ph - T[b0]) % 1 + 1) % 1, y = hoofY(b, b0);
        lo = Math.min(lo, y);
        if (phi < duty) { const w = Math.sin(phi / duty * Math.PI); ws += w; wy += w * y; }
      }
      const al = Math.min(1, ws * 1.5);
      b[1].position.y -= al * (ws > 0 ? wy / ws : 0) + (1 - al) * (lo - 0.1 * k); // 4本とも浮く間は蹄が 10cm ほど上がる
      // 首：前脚が着く頃に下げ、後脚で押す頃に上げる。走るほど前へ伸ばす
      // 首の根元から頭へ、少しずつ遅れて付いてくる（胴の上下に引っぱられる重さ）
      const nod = cyc(NOD, ph) * k, nod1 = cyc(NOD, ph - 0.035) * k, nod2 = cyc(NOD, ph - 0.07) * k;
      const pitchLag = 0.065 * k * cyc(PITCH, ph - 0.07);
      b[2].rotation.z = -0.14 * k + 0.13 * nod;
      b[3].rotation.z = -0.05 * k + 0.08 * nod1;
      b[4].rotation.z = 0.12 * k - 0.15 * nod2 - pitchLag;
      // 手前の側へ少しだけ首を振る
      b[2].rotation.y = 0.03 * k * Math.sin(ph * TAU + (H.lead > 0 ? 0 : Math.PI));
      b[4].rotation.y = -0.6 * b[2].rotation.y;
      // 尾：走ると後ろへ流れる
      // 尾：胴の上下に遅れて波打つ（根元 → 先へ遅れが大きく、振れも大きく）
      const tb = k * cyc(BOB, ph - 0.1), tb2 = k * cyc(BOB, ph - 0.2), tb3 = k * cyc(BOB, ph - 0.3);
      b[5].rotation.z = 0.46 - 0.1 * k + 0.05 * Math.sin(ph * TAU * 2 + seed) + 0.06 * tb;
      b[6].rotation.z = 0.05 * Math.sin(ph * TAU + 1 + seed) + 0.1 * tb2; b[7].rotation.z = 0.08 * Math.sin(ph * TAU + 2 + seed) + 0.14 * tb3;
      b[5].rotation.x = 0.06 * Math.sin(ph * TAU + seed * 3);
      // 騎手：鐙の上で腰を浮かせ、馬の上下を脚で吸う。追うときは首の動きに合わせて上体と腕を前へ送る
      const pk = clamp(push, 0, 1);
      b[24].position.y -= bob * 0.75;
      b[24].rotation.z = -pitch * 0.8;
      const pump = -cyc(NOD, ph + 0.04);
      b[24].position.x += pk * 0.06 * pump;
      b[24].position.y -= pk * 0.03 * (1 + pump) * 0.5;
      b[25].rotation.z = -0.04 - pk * (0.05 + 0.06 * pump);
      b[26].rotation.z = 0.04 + pk * (0.05 + 0.06 * pump) + pitch * 0.8;
      for (const ua of [27, 29]) { b[ua].rotation.z = pk * (0.12 + 0.3 * pump); b[ua + 1].rotation.z = pk * (0.05 + 0.25 * pump); }
    }
    // 掛かり（H.kakari 0〜1）：ハミに逆らって首と頭を上げ、鼻先を突き出し、首を振る。騎手は上体を起こして手綱を引く
    const fg = H.kakari || 0;
    if (fg > 0.01) {
      const sh = Math.sin(t * 6.3 + seed * 5), sh2 = Math.sin(t * 6.3 + seed * 5 - 0.9), toss = Math.sin(t * 4.1 + seed * 2);
      // 走っている間は首を前へ伸ばしている分も戻す（sp）
      const up = 1 + 0.6 * Math.min(1, sp);
      b[2].rotation.z += (0.2 * fg + 0.05 * fg * toss) * up;
      b[3].rotation.z += 0.1 * fg * up;
      b[4].rotation.z += (0.3 * fg + 0.12 * fg * Math.sin(t * 4.1 + seed * 2 - 0.7)) * up;
      b[2].rotation.y += 0.07 * fg * sh;
      b[4].rotation.y += 0.12 * fg * sh2;
      b[25].rotation.z += 0.3 * fg;
      b[26].rotation.z -= 0.15 * fg;
      b[24].position.x -= 0.06 * fg;
      for (const ua of [27, 29]) { b[ua].rotation.z -= 0.35 * fg; b[ua + 1].rotation.z += 0.3 * fg; }
    }
    // 襲歩と常歩のあいだ：両方の形を混ぜる（脚・首・尾・胴の高さ）
    if (wk > 0 && sp > 0) {
      const R = _wk.r || (_wk.r = new Float32Array(24 * 2)), Y = b[1].position.y;
      for (let i = 1; i < 24; i++) { R[i * 2] = b[i].rotation.z; R[i * 2 + 1] = b[i].rotation.x; }
      walkPose(H, walk.ph, t, seed);
      for (let i = 1; i < 24; i++) { b[i].rotation.z = R[i * 2] + (b[i].rotation.z - R[i * 2]) * wk; b[i].rotation.x = R[i * 2 + 1] + (b[i].rotation.x - R[i * 2 + 1]) * wk; }
      b[1].position.y = Y + (b[1].position.y - Y) * wk;
    }
    // ムチ：入れてから 0.5 秒。右腕を振り上げ、尻へ振り下ろして戻す
    if (whip != null && whip >= 0 && whip < 0.5) {
      const u = whip / 0.5;
      const key = (K) => { let i = 0; while (i < K.length - 2 && K[i + 1][0] <= u) i++; const [t0, v0] = K[i], [t1, v1] = K[i + 1]; return v0 + (v1 - v0) * smooth((u - t0) / (t1 - t0)); };
      b[29].rotation.z = key([[0, b[29].rotation.z], [0.38, 1.7], [0.58, -1.4], [1, 0]]);
      b[29].rotation.x = key([[0, 0], [0.38, -0.25], [0.58, -0.8], [1, 0]]);
      b[30].rotation.z = key([[0, b[30].rotation.z], [0.38, 0.5], [0.58, 0.17], [1, 0]]);
      b[31].rotation.z = key([[0, 0], [0.38, -0.5], [0.58, 2.25], [1, 0]]);
      b[31].rotation.x = key([[0, 0], [0.38, 0], [0.58, 0.6], [1, 0]]);
      b[25].rotation.z += 0.12 * key([[0, 0], [0.38, 1], [0.58, -0.3], [1, 0]]);
    }
    // ガッツポーズ：ゴールのあと、上体を起こして右の拳を突き上げる（pose＝始めてからの秒）
    if (pose != null && pose >= 0 && pose < 2.6) {
      const w = clamp(pose / 0.25, 0, 1) * clamp((2.6 - pose) / 0.4, 0, 1);
      b[25].rotation.z = b[25].rotation.z * (1 - w) + 0.45 * w;
      b[26].rotation.z = b[26].rotation.z * (1 - w) - 0.3 * w;
      b[24].position.x *= 1 - w;
      b[29].rotation.z = b[29].rotation.z * (1 - w) + 2.5 * w + 0.12 * w * Math.sin(pose * 9);
      b[30].rotation.z = b[30].rotation.z * (1 - w) + 0.4 * w;
      b[29].rotation.x = -0.3 * w;
    }
  }

  // ---- 騎手（素材の GLB）。部位は頂点色の R（番号/8）：0 肌・1 勝負服・2 袖・3 ズボン・4 長靴・5 長靴の折り返し・6 手袋・7 帽子・8 ゴーグル ----
  // 動き：手作りの骨（24 腰・25 上体・26 頭・28/30 手・1 胴の鐙）の位置へ、毎コマ IK で合わせる。手綱とムチは手作りの形のまま手に付いてくる
  const JK_SCALE = 0.86;   // 素材の体（1.81m）を騎手の背丈へ
  const PAT_ID = { plain: 0, hoops: 1, stripes: 2, sash: 3, cross: 4, diamonds: 5, stars: 6, halves: 7, yoke: 8 };
  function jockeyMaterial(h) {
    const sk = h.silks || DEF_SILKS;
    const U = {
      uBase: { value: lin(sk.base || '#1f4fbf') }, uSub: { value: lin(sk.sub || sk.base || '#ffffff') }, uPat: { value: PAT_ID[sk.pattern] || 0 },
      uCap: { value: lin(h.cap || frameColor(h.frame)) }, uSkin: { value: lin('#d9a882') },
    };
    const m = new THREE.MeshStandardMaterial({ skinning: true, roughness: 0.55, metalness: 0 });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'attribute vec4 color;\nvarying float vReg;\nvarying vec3 vBP;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vReg = color.r * 8.0; vBP = position;');
      sh.fragmentShader = 'varying float vReg;\nvarying vec3 vBP;\nuniform vec3 uBase, uSub, uCap, uSkin;\nuniform float uPat;\n' +
        `float silkMask(vec3 p) {
  float x = p.x, y = p.y, k = 0.0;
  if (uPat < 0.5) return 0.0;
  if (uPat < 1.5) return step(0.5, fract((y - 0.98) / 0.13));                       // 横縞
  if (uPat < 2.5) return step(0.5, fract(x / 0.085 + 0.25));                        // 縦縞
  if (uPat < 3.5) return step(abs((y - 1.24) - 0.95 * x), 0.06);                      // たすき
  if (uPat < 4.5) return max(step(abs((y - 1.24) - 0.95 * x), 0.045), step(abs((y - 1.24) + 0.95 * x), 0.045)); // 十字たすき
  if (uPat < 5.5) { vec2 q = abs(fract(vec2(x / 0.15 + 0.5, (y - 1.0) / 0.17)) - 0.5); return step(q.x + q.y, 0.24); } // ダイヤ
  if (uPat < 6.5) { vec2 c = fract(vec2(x / 0.14 + 0.5, (y - 1.0) / 0.15 + p.z * 2.0)) - 0.5; float a = atan(c.y, c.x), r = length(c); return step(r, 0.2 * (0.62 + 0.38 * cos(5.0 * a + 1.5708))); } // 星
  if (uPat < 7.5) return step(0.0, x);                                              // 左右
  return step(1.37, y);                                                             // 肩
}
` + sh.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
  float rg = floor(vReg + 0.5);
  vec3 jc = uSkin; float jr = 0.62;
  if (rg > 0.5 && rg < 1.5) { jc = mix(uBase, uSub, silkMask(vBP)); jr = 0.38; }
  else if (rg < 2.5 && rg > 1.5) { jc = (uPat > 6.5 && uPat < 7.5) ? mix(uBase, uSub, step(0.0, vBP.x)) : uSub; jr = 0.38; }
  else if (rg < 3.5 && rg > 2.5) { jc = vec3(0.86); jr = 0.6; }
  else if (rg < 4.5 && rg > 3.5) { jc = vec3(0.012); jr = 0.32; }
  else if (rg < 5.5 && rg > 4.5) { jc = vec3(0.23, 0.11, 0.04); jr = 0.45; }
  else if (rg < 6.5 && rg > 5.5) { jc = vec3(0.88); jr = 0.6; }
  else if (rg < 7.5 && rg > 6.5) { jc = uCap; jr = 0.25; }
  else if (rg > 7.5) { jc = vec3(0.02, 0.025, 0.03); jr = 0.12; }
  diffuseColor.rgb *= jc;`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = jr;');
    };
    m.customProgramCacheKey = () => 'hs-jockey';
    return m;
  }
  // 騎手を1人作る（骨ごと複製）。o.hi / o.lo：近く・遠くの形、bones：名前 → 骨
  function makeJockey(h, M, src) {
    const root = THREE.SkeletonUtils.clone(src || JK.scene);
    const mat = M(jockeyMaterial(h));
    const o = { root, bones: {}, hi: null, lo: null, mat, rest: [] };
    root.traverse(x => {
      if (x.isBone) { o.bones[x.name] = x; o.rest.push([x, x.position.clone(), x.quaternion.clone()]); }
      if (x.isSkinnedMesh) {
        x.material = mat; x.castShadow = true; x.frustumCulled = false;
        if (/lo$/i.test(x.name)) o.lo = x; else o.hi = x;
      }
    });
    if (o.lo) o.lo.visible = false;
    // 腕を少し長く（手綱を前で持つ前かがみの姿勢でも、手が手綱に届くように）
    for (const s of ['l', 'r']) if (o.bones['upperarm_' + s]) o.bones['upperarm_' + s].scale.setScalar(1.08);
    root.rotation.y = Math.PI / 2; // 素材の前（+Z）を馬の前（+X）へ。素材の左（+X）は馬の左（-Z）
    root.scale.setScalar(JK_SCALE);
    // 頭の上を指す点（骨の中の向き）を、はじめの姿勢で覚える
    root.updateMatrixWorld(true);
    const hd = o.bones.Head, hp = new THREE.Vector3().setFromMatrixPosition(hd.matrixWorld);  // 頭の骨は必ずある（無ければ素材の作りが違う）
    o.headUp = hd.worldToLocal(hp.clone().add(new THREE.Vector3(0, 0.15, 0)));
    o.footFwd = { l: null, r: null };
    return o;
  }
  // IK の道具（世界の座標で考える。骨の軸の向きは問わない）
  const IKV = { a: null };
  function ikTmp() {
    if (!IKV.a) Object.assign(IKV, { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), e: new THREE.Vector3(), f: new THREE.Vector3(), q1: new THREE.Quaternion(), q2: new THREE.Quaternion(), q3: new THREE.Quaternion() });
    return IKV;
  }
  const wpos = (o, out) => out.setFromMatrixPosition(o.matrixWorld);
  // 骨 bone をまわして、いま cur（世界）にある点を target（世界）の向きへ
  function aim(bone, cur, target) {
    const T = ikTmp();
    const p = wpos(bone, T.a);
    const u = T.b.subVectors(cur, p), w = T.c.subVectors(target, p);
    if (u.lengthSq() < 1e-10 || w.lengthSq() < 1e-10) return;
    T.q1.setFromUnitVectors(u.normalize(), w.normalize());
    bone.parent.matrixWorld.decompose(T.d, T.q2, T.e);
    T.q3.copy(T.q2).multiply(bone.quaternion);      // いまの世界の向き
    T.q3.premultiply(T.q1);                          // まわした後の世界の向き
    bone.quaternion.copy(T.q2.invert().multiply(T.q3));
    bone.updateMatrixWorld(true);
  }
  // 2本の骨（a→b→c）の先 c を target へ。曲がる向きは pole（世界の向き）
  function twoBone(a, b, c, target, pole) {
    const pa = wpos(a, new THREE.Vector3()), pb = wpos(b, new THREE.Vector3()), pc = wpos(c, new THREE.Vector3());
    const l1 = pa.distanceTo(pb), l2 = pb.distanceTo(pc);
    const dir = new THREE.Vector3().subVectors(target, pa);
    const d = clamp(dir.length(), Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.999);
    dir.normalize();
    const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), y = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    const pn = new THREE.Vector3().copy(pole).addScaledVector(dir, -pole.dot(dir));
    if (pn.lengthSq() < 1e-8) pn.set(0, 1, 0); else pn.normalize();
    const knee = new THREE.Vector3().copy(pa).addScaledVector(dir, x).addScaledVector(pn, y);
    aim(a, pb, knee);
    aim(b, wpos(c, pc), pa.clone().addScaledVector(dir, d));
  }
  // 手作りの骨 bone の中の点（馬の形の座標で書いた点 P から、その骨の付け根 J を引いた差）→ 世界の点
  const atBone = (bones, i, x, y, z) => {
    const J = BONES[i], m = mapBone(x, y, z, i), v = new THREE.Vector3(m[0] - J[1], m[1] - J[2], m[2] - J[3]);
    return v.applyMatrix4(bones[i].matrixWorld);
  };
  // 馬の形の向き（胴の骨の向き）→ 世界の向き
  const dirBone = (bones, i, x, y, z) => new THREE.Vector3(x, y, z).transformDirection(bones[i].matrixWorld);
  function poseJockey(J, hb) {
    const B = J.bones;
    for (const [b, p, q] of J.rest) { b.position.copy(p); b.quaternion.copy(q); }
    J.root.updateMatrixWorld(true);
    // 腰：手作りの腰の骨（24）の位置へ。少し前へ傾ける
    const hip = atBone(hb, 24, -0.04, 1.9, 0);
    B.pelvis.position.copy(B.pelvis.parent.worldToLocal(hip.clone()));
    B.pelvis.updateMatrixWorld(true);
    aim(B.pelvis, wpos(B.spine_01, new THREE.Vector3()), hip.clone().add(dirBone(hb, 24, 0.9, 0.42, 0)));
    // 背骨：肩の真ん中（手作りの上体 25 の肩）へ
    const sh = atBone(hb, 25, 0.46, 2.01, 0);
    aim(B.spine_01, wpos(B.neck_01, new THREE.Vector3()), sh);
    aim(B.spine_03, wpos(B.neck_01, new THREE.Vector3()), sh);
    // 首と頭：前を見る
    const np = wpos(B.neck_01, new THREE.Vector3());
    aim(B.neck_01, wpos(B.Head, new THREE.Vector3()), np.clone().add(dirBone(hb, 26, 0.78, 0.62, 0)));
    const hp = wpos(B.Head, new THREE.Vector3());
    aim(B.Head, B.Head.localToWorld(J.headUp.clone()), hp.clone().add(dirBone(hb, 26, 0.32, 0.95, 0)));
    // 腕：手綱を持つ手（手作りの 28・30 の手の位置）へ。肘は外・上へ
    for (const [s, fa, sd] of [['l', 28, -1], ['r', 30, 1]]) {
      const hand = atBone(hb, fa, 0.8, 1.815, sd * 0.1);
      twoBone(B['upperarm_' + s], B['lowerarm_' + s], B['hand_' + s], hand, dirBone(hb, 1, -0.5, 0.35, sd));
    }
    // 脚：鐙（胴の骨 1）へ。膝は前・外へ。つま先は前へ
    for (const [s, sd] of [['l', -1], ['r', 1]]) {
      const ank = atBone(hb, 1, 0.235, 1.37, sd * 0.29);
      twoBone(B['thigh_' + s], B['calf_' + s], B['foot_' + s], ank, dirBone(hb, 1, 1, 0.15, sd * 0.45));
      const fp = wpos(B['foot_' + s], new THREE.Vector3());
      aim(B['foot_' + s], wpos(B['ball_' + s], new THREE.Vector3()), fp.clone().add(dirBone(hb, 1, 0.95, -0.12, sd * 0.25)));
    }
  }

  // 馬の骨（手作り）。はじめの姿勢で組む
  function horseBones() {
    const bones = BONES.map(() => new THREE.Bone());
    BONES.forEach(([par, x, y, z], k) => {
      if (par < 0) bones[k].position.set(x, y, z);
      else { const p = BONES[par]; bones[k].position.set(x - p[1], y - p[2], z - p[3]); bones[par].add(bones[k]); }
    });
    return bones;
  }
  // テスト用：騎手の IK（src＝骨だけの形でもよい）
  R3._ik = { horseBones, makeJockey: (h, src) => makeJockey(h, m => m, src), poseJockey, poseHorse, atBone, paintHorse };

  // テスト用：馬の形（q＝1 近く・0 遠く）と骨の数
  R3.horseGeometry = (q, o) => horseGeometry(q, o);
  // 手作りの馬の寸法（骨入りの馬の素材を同じ大きさ・位置に置くため）：鞍の下の背の高さ・胸の前
  let HM_SIZE = null;
  R3.handmadeSize = function () {
    if (HM_SIZE) return HM_SIZE;
    const g = horseGeometry(1, { bare: true }), P = g.attributes.position, si = g.attributes.skinIndex.array;
    let back = 0, chest = -9;
    for (let i = 0; i < P.count; i++) {
      if (si[i * 4] !== 1 || si[i * 4 + 1] !== 1) continue;
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      if (x > 0 && x < 0.3 && Math.abs(z) < 0.06) back = Math.max(back, y);
      if (y > 1.0 && y < 1.35 && Math.abs(z) < 0.1) chest = Math.max(chest, x);
    }
    g.dispose();
    return (HM_SIZE = { back, chest });
  };
  // 手作りの馬の頭：うなじ（骨 4 の付け根）と鼻先（体の比を直したあとの座標）
  R3.handmadeHead = function () {
    const n = mapBone(HEAD0[0] + HD[0] * HEAD_L, HEAD0[1] + HD[1] * HEAD_L, 0, 4);
    return { start: new THREE.Vector3(HEADP[0], HEADP[1], 0), nose: new THREE.Vector3(n[0], n[1], 0), width: headSec(0.5).w * HK0 };
  };
  R3.BONES = BONES.length;
  // テスト用：手作りの骨で常歩・襲歩の形を作り、蹄の高さを返す（骨は手作りの馬と同じ並び）
  R3.gaitTest = function (walkPh, gallopPh, w, fight) {
    const bones = horseBones(), H = { bones, lead: 1, kakari: fight || 0 };
    poseHorse(H, gallopPh || 0, w != null && w < 1 ? 0.6 : 0, 0, 1, 0.3, null, null, walkPh != null ? { ph: walkPh, w: w == null ? 1 : w } : null);
    bones[1].updateMatrix(); for (let i = 8; i < 24; i++) bones[i].updateMatrix();
    return { hoof: [8, 12, 16, 20].map(b0 => hoofY(bones, b0)), y: bones[1].position.y, rot: bones.map(b => b.rotation.z) };
  };
  R3.BONE_AT = i => BONES[i].slice(1); // テスト用：骨の付け根（体の比を直したあとの座標）
  R3.GEAR = GEAR;

  // ---- 本体 ----
  // ---- 地形：コースの形と高さから、帯・地面の高さ・地面の升目を作る（THREE を使わない。テストでも呼べる） ----
  // tr＝HS.Track の形。o＝{ slope（courses.js の坂。実際の高さが無いときに使う）, dirt（ダートのレース）, hasOther（もう一方のコースがある） }
  // 戻り値：elev(s)・frame(s)・wpt(f, u, dq)・S（5m ごとの点）・bands・スタンドの範囲 sa〜sb・ground(x, y)（上から見た点の地面の高さ）・nearest(x, y)・pond・grid()
  R3.terrain = function (tr, o) {
    o = o || {};
    const L = tr.L, sign = tr.sign || 1;
    const slopeH = ({ '急': 2.1, '中': 1.6, '小': 0.9, '平': 0 })[o.slope] || 0;
    // 実際の高低差があるコース（data/layouts.js）はその高さ。無ければゴール前の坂の強さで作る
    const elev = tr.hAt && !tr.flat ? s => tr.hAt(s) : s => {
      if (!slopeH) return 0;
      s = ((s % L) + L) % L;
      if (s < 100) return slopeH;
      if (s < 330) return slopeH * (1 - smooth((s - 100) / 230));
      if (s > L - 450) return slopeH * smooth((s - (L - 450)) / 450);
      return 0;
    };
    // s（ゴールからさかのぼった距離）の地点：位置と進む向き（ゴールへ向かう向き）
    function frame(s) {
      const p = tr.at(s), a = tr.at(s - 0.6), b = tr.at(s + 0.6);
      let fx = a.x - b.x, fy = a.y - b.y;
      const l = Math.hypot(fx, fy) || 1;
      return { s, x: p.x, y: p.y, fx: fx / l, fy: fy / l, curv: p.curv, corner: p.corner, e: elev(s) };
    }
    // 内ラチから外へ u m、前へ dq m（上から見た座標）
    const wpt = (f, u, dq) => { dq = dq || 0; return { x: f.x - sign * f.fy * u + f.fx * dq, y: f.y + sign * f.fx * u + f.fy * dq }; };
    // ゴール前の直線の範囲（ゴールからさかのぼった距離で [始まり, 終わり]）
    const loop = !tr.line;
    let hr0 = 0, hr1 = 0;
    while (hr1 < L / 2 && tr.at(hr1 + 5).corner === 0) hr1 += 5;
    while (hr0 > -L / 2 && tr.at(hr0 - 5).corner === 0) hr0 -= 5;
    // スタンドの範囲
    const sa = Math.max(hr0, -160), sb = Math.min(hr1, 430);
    // 描く範囲：周回は1周、直線・馬蹄形のコースはゴールの先とスタートの後ろも少し
    const sLo = loop ? 0 : Math.min(-200, sa - 40), sHi = loop ? L : L + 80;
    const N = Math.max(160, Math.round((sHi - sLo) / 5));
    const S = [];
    for (let i = 0; i <= N; i++) S.push(frame(sLo + i * (sHi - sLo) / N));

    // 帯（内ラチから外へ u0→u1）：馬場・もう一方のコース・草の縁。kind＝main|turf|dirt|grass
    const W = TRACK_W, bands = [];
    bands.push([-0.6, W + 0.4, 'main']);
    // 外側：ダートの日は外に芝コースが見える
    let uo = W + 0.4;
    if (o.dirt && o.hasOther) { bands.push([uo, uo + 3, 'grass'], [uo + 3, uo + 28, 'turf']); uo += 28; }
    const standU = uo + 12;
    bands.push([uo, uo + 8, 'grass']);
    const outerEdge = standU + 56;
    // 内側：芝の日は内にダートコースが見える
    let ui = -0.6;
    if (!o.dirt && o.hasOther) { bands.push([-4, ui, 'grass'], [-24, -4, 'dirt']); ui = -24; }
    bands.push([ui - 6, ui, 'grass']);
    const innerEdge = ui - 20;
    // 平らに作る帯の範囲（内 bandI・外 bandO。スタンドの前は外を広く）
    const bandI = ui - 6, bandO0 = uo + 8, bandOS = standU + 30;
    const bandOf = s => (s >= sa - 30 && s <= sb + 30) ? bandOS : bandO0;

    // ---- 地面の高さ：帯の中はコースの高さ。離れると、まわりのコースの高さの重みつき平均（近いほど重い）へなだらかに ----
    // 近いコースの点を探す升目（40m）
    const HC = 40, hgrid = new Map(), hkey = (i, j) => i * 65536 + j;
    for (let i = 0; i < S.length - (loop ? 1 : 0); i++) {
      const k = hkey(Math.floor(S[i].x / HC), Math.floor(S[i].y / HC));
      if (!hgrid.has(k)) hgrid.set(k, []);
      hgrid.get(k).push(i);
    }
    // 上から見た点 (x, y) にいちばん近いコースの点：{ i, u（外へ）, q（前へ）, d }
    function nearest(x, y) {
      const ci = Math.floor(x / HC), cj = Math.floor(y / HC);
      let best = null, bd = Infinity;
      for (let r = 1; r <= 8; r++) {
        for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) {
          if (r > 1 && Math.abs(i - ci) < r && Math.abs(j - cj) < r) continue;
          const lst = hgrid.get(hkey(i, j)); if (!lst) continue;
          for (const k of lst) { const d = (S[k].x - x) ** 2 + (S[k].y - y) ** 2; if (d < bd) { bd = d; best = k; } }
        }
        if (best != null && Math.sqrt(bd) < (r - 0.5) * HC) break;
      }
      if (best == null) return null;
      const f = S[best], dx = x - f.x, dy = y - f.y;
      return { i: best, u: dx * (-sign * f.fy) + dy * (sign * f.fx), q: dx * f.fx + dy * f.fy, d: Math.sqrt(bd) };
    }
    // 遠くの高さ：20m ごとのコースの点の重みつき平均
    const FAR = [];
    for (let i = 0; i < S.length; i += 4) FAR.push(S[i]);
    let hAvg = 0; for (const f of S) hAvg += f.e; hAvg /= S.length;
    function hFar(x, y) {
      let tw = 0, th = 0;
      for (const f of FAR) { const d2 = (f.x - x) ** 2 + (f.y - y) ** 2 + 900, w = 1 / (d2 * Math.sqrt(d2)); tw += w; th += w * f.e; }
      const w0 = 1 / Math.pow(700 * 700, 1.5); // とても遠い所は平均の高さ
      return (th + hAvg * w0) / (tw + w0);
    }
    // 池（内馬場）：あれば地面をくぼませる
    let pond = null;
    // 高さ。info＝true なら { h, band（帯の中）, inner（内馬場か）, near }
    function ground(x, y, info) {
      const n = nearest(x, y);
      if (!n) return info ? { h: hAvg, band: false, inner: false, near: null } : hAvg;
      const f = S[n.i], bo = bandOf(f.s);
      let out = n.u < bandI ? bandI - n.u : n.u > bo ? n.u - bo : 0;
      // 直線・馬蹄形のコースの両端より先
      if (!loop && (n.i === 0 || n.i === S.length - 1) && Math.abs(n.q) > 2.5) out = Math.max(out, Math.abs(n.q));
      let h;
      if (out <= 0) h = f.e - 0.1; // 帯の下（帯は polygonOffset で手前に描く）
      else { const k = smooth((out - 6) / 70); h = (f.e - 0.03) * (1 - k) + (k > 0 ? hFar(x, y) * k : 0); } // 縁から 6m は帯と同じ高さ
      if (pond) {
        const px = x - pond.x, py = y - pond.y, c = Math.cos(pond.rot), s = Math.sin(pond.rot);
        const r = Math.hypot((px * c + py * s) / pond.rx, (-px * s + py * c) / pond.rz);
        if (r < 1.35) h = r < 1 ? pond.y0 - 0.5 : h + (pond.y0 - 0.5 - h) * (1 - smooth((r - 1) / 0.35));
      }
      return info ? { h, band: out <= 0 && n.u > bandI + 3 && n.u < bandO0 - 3, inner: n.u < 0, near: n } : h;
    }
    // 内馬場のまんなか（周回のときだけ）と、そこからコースまでの距離
    let mid = null;
    if (loop) {
      let cx = 0, cy = 0; for (let i = 0; i < N; i++) { cx += S[i].x; cy += S[i].y; } cx /= N; cy /= N;
      const n = nearest(cx, cy);
      if (n && n.u < bandI - 10) mid = { x: cx, y: cy, free: -n.u + bandI };
    }
    if (mid && mid.free > 30) {
      // 池：いちばん長い向きに伸ばし、まわりがコースから 12m 以上離れるまで縮める
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const f of S) { x0 = Math.min(x0, f.x); x1 = Math.max(x1, f.x); y0 = Math.min(y0, f.y); y1 = Math.max(y1, f.y); }
      const p = { x: mid.x - (x1 - x0) * 0.1 * sign, y: mid.y, rot: x1 - x0 > y1 - y0 ? 0 : Math.PI / 2, rx: Math.max(20, Math.max(x1 - x0, y1 - y0) * 0.14), rz: Math.max(14, mid.free * 0.5) };
      for (let k = 0; k < 12; k++) {
        let ok = true;
        for (let a = 0; a < 16 && ok; a++) {
          const th = a / 16 * TAU, c = Math.cos(p.rot), s = Math.sin(p.rot), ex = Math.cos(th) * p.rx * 1.35, ey = Math.sin(th) * p.rz * 1.35;
          const n = nearest(p.x + ex * c - ey * s, p.y + ex * s + ey * c);
          if (!n || n.u > bandI - 12) ok = false;
        }
        if (ok) break;
        p.rx *= 0.85; p.rz *= 0.85;
      }
      if (p.rz > 8) { p.y0 = ground(p.x, p.y); pond = p; }
    }
    // 地面の升目（8m）。帯の中に入りきる三角形は描かない（コースの帯が上にある）。uv は m
    function grid() {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const f of S) { x0 = Math.min(x0, f.x); x1 = Math.max(x1, f.x); y0 = Math.min(y0, f.y); y1 = Math.max(y1, f.y); }
      const MG = 360, CS = 8;
      x0 = Math.floor((x0 - MG) / CS) * CS; x1 = Math.ceil((x1 + MG) / CS) * CS; y0 = Math.floor((y0 - MG) / CS) * CS; y1 = Math.ceil((y1 + MG) / CS) * CS;
      const nx = Math.round((x1 - x0) / CS) + 1, ny = Math.round((y1 - y0) / CS) + 1;
      const pos = new Float32Array(nx * ny * 3), uv = new Float32Array(nx * ny * 2), inB = new Uint8Array(nx * ny);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = x0 + i * CS, y = y0 + j * CS, k = j * nx + i;
        const gi = ground(x, y, true);
        // 升目の縁は平均の高さへ（その外の広い地面とつなぐ）
        const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
        const h = gi.h + (hAvg - gi.h) * (1 - smooth(edge / 120));
        pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = -y;
        uv[k * 2] = x; uv[k * 2 + 1] = y;
        inB[k] = gi.band ? 1 : 0;
      }
      const idx = [];
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
        if (!(inB[a] && inB[b] && inB[c])) idx.push(a, b, c);
        if (!(inB[b] && inB[c] && inB[d])) idx.push(b, d, c);
      }
      return { pos, uv, idx, x0, x1, y0, y1 };
    }
    return { L, sign, loop, elev, frame, wpt, hr0, hr1, sa, sb, sLo, sHi, N, S, bands, W, uo, standU, outerEdge, ui, innerEdge, bandI, bandO0, bandOf, nearest, hAvg, ground, pond, grid };
  };

  R3.create = function (canvas, setup) {
    setup = setup || {};
    const course = setup.course || {};
    const tr = setup.track || HS.Track.make(course.lap, course.straight, course.dir);
    const D = setup.D || 2000;
    const L = tr.L;
    const sign = tr.sign || (course.dir === '左' ? -1 : 1);
    const look = lookOf(setup.surface, setup.ground, setup.weather);
    const horsesIn = setup.horses || [];
    const nH = horsesIn.length;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    const mobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '');
    // 素材の絵が読めているか（地面・空は、読めていなければ手作りの絵で描く）
    const photo = imgOk('turf_col') && imgOk('dirt_col') && imgOk('grass_col') && !setup.handmade;
    LIN = photo;
    if (photo) { renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; }
    const skyImg = photo && imgOk(look.sky) ? IMG[look.sky] : null;
    const useJockey = JK.state === 'ok' && !!THREE.SkeletonUtils && !setup.handmadeJockey;
    // 骨入りの馬の素材（js/ui/horse_rigged.js）。設定が「素材の馬」で読めているときだけ。手作りの形は鞍・馬具・騎手だけ描く
    const HRG = HS.HorseRigged, rigged = photo && !setup.handmade && !setup.handmadeHorse && !!(HRG && HRG.use());
    renderer.toneMappingExposure = look.exposure;
    const fogCol = skyImg ? horizonColor(look.sky, skyImg) : look.skyHor;
    renderer.setClearColor(new THREE.Color(fogCol));
    const aniso = Math.min(mobile ? 4 : 8, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1);
    const scene = new THREE.Scene();
    // 遠くの霞（色は空の地平の色。霧は sRGB のまま混ぜる）
    scene.fog = photo ? new THREE.FogExp2(new THREE.Color(fogCol), look.overcast ? 0.00075 : 0.00048) : new THREE.Fog(new THREE.Color(look.skyHor), 260, 2400);
    const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.3, 7000);
    camera.rotation.order = 'YXZ';
    let VW = 960, VH = 540;

    // 片づけ用
    const owned = { geos: [], mats: [], texs: [] };
    const G = g => (owned.geos.push(g), g), M = m => (owned.mats.push(m), m), T = t => (owned.texs.push(t), t);
    const lambert = o => M(new THREE.MeshLambertMaterial(linOpts(o)));
    const std = o => M(new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.8, metalness: 0 }, linOpts(o))));

    // 光：空の光（半球）と太陽。素材の空があれば、空を映り込み（環境の光）にも使う
    const hemi = new THREE.HemisphereLight(lin('#dfeaff'), lin('#6b7a52'), photo ? look.hemiP : look.hemi);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(lin('#fff4e2'), photo ? look.sunP : look.sun);
    sun.position.set(-0.5, 1, 0.35);
    scene.add(sun);
    scene.add(sun.target);
    // 太陽の影：見ている所のまわり（一辺 shadowBox m）だけ
    const shadowOn = photo && !setup.noShadow;
    let shadowBox = 36;
    if (shadowOn) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = mobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
      sun.castShadow = true;
      sun.shadow.mapSize.set(mobile ? 1024 : 4096, mobile ? 1024 : 4096);
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.03;
      const sc = sun.shadow.camera;
      sc.near = 1; sc.far = 400; sc.left = -shadowBox; sc.right = shadowBox; sc.top = shadowBox; sc.bottom = -shadowBox;
      sc.updateProjectionMatrix();
    }

    // ---- コースの形と地形（R3.terrain） ----
    const cdat = HS.DATA && HS.DATA.courses && HS.DATA.courses[course.name];
    const hasOther = !tr.line && (!cdat || !!(look.dirt ? cdat.turf : cdat.dirt));
    const TR = R3.terrain(tr, { slope: course.slope, dirt: look.dirt, hasOther });
    const { elev, frame, wpt, loop, hr0, hr1, sa, sb, sLo, sHi, N, S, standU, outerEdge, innerEdge, bandI, bandO0, bandOf, nearest, hAvg, ground, pond } = TR;
    const W3 = (f, u, h, dq) => { const p = wpt(f, u, dq); return new THREE.Vector3(p.x, h, -p.y); };
    const yawOf = f => Math.atan2(f.fy, f.fx);

    // 帯（u0→u1。高さはコースの高さから d0・d1 だけ下げる）
    function ribbon(u0, u1, d0, d1, mat, ua, ub, period) {
      const n = S.length, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [];
      for (let i = 0; i < n; i++) {
        const f = S[i], p0 = wpt(f, u0), p1 = wpt(f, u1);
        pos.set([p0.x, f.e - d0, -p0.y, p1.x, f.e - d1, -p1.y], i * 6);
        const v = f.s / period;
        uv.set([ua, v, ub, v], i * 4);
        if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      // 上を向くように巻き方をそろえる
      const ax = pos[3] - pos[0], az = pos[5] - pos[2], bx = pos[6] - pos[0], bz = pos[8] - pos[2];
      if (az * bx - ax * bz < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
      const g = G(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat);
      scene.add(m);
      return m;
    }

    // ---- 馬場と周り ----
    // 素材の絵（photo）があれば、写真の質感を m 単位で貼り、刈り目・内ラチ沿いの荒れ・ハローの筋を材質の中で描く
    const period = L / Math.max(1, Math.round(L / 16));
    const W = TRACK_W;
    let turfMat, dirtMat, grassMat, farMat, terrMat;
    function groundMat(col, nor, tile, o) {
      const map = T(imgTex(col, true, aniso)); map.repeat.set(1 / tile, 1 / tile);
      // 地面は画面の半分を占めるので、映り込みを計算しない軽い材質（Phong）にし、空の明るさは一定の環境の光（uAmb）で足す
      const wet = o.rough < 0.7;
      const m = M(new THREE.MeshPhongMaterial({ map, shininess: wet ? 60 * (1 - o.rough) : 4, specular: lin(wet ? '#5a5a5a' : '#141414'), polygonOffset: !!o.lift, polygonOffsetFactor: o.lift ? -1 : 0, polygonOffsetUnits: o.lift ? -2 : 0 }));
      if (nor && imgOk(nor)) { m.normalMap = T(imgTex(nor, true, aniso, true)); m.normalScale.set(o.ns || 1, o.ns || 1); }
      const U = {
        uStripe: { value: o.stripe || 0 }, uStripeLen: { value: o.stripeLen || 16 }, uWear: { value: o.wear || 0 }, uWearCol: { value: lin(o.wearCol || '#8a7650') },
        uTint: { value: new THREE.Vector3().fromArray(o.tint || [1, 1, 1]) }, uMix: { value: o.mix != null ? o.mix : 0.42 }, uHarrow: { value: o.harrow || 0 },
        uAmb: { value: lin(fogCol).multiplyScalar((o.env != null ? o.env : 0.6) * (look.overcast ? 0.9 : 0.6)) }, uClod: { value: o.clod || 0 },
      };
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = 'varying vec2 vM;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n  vM = uv;');
        sh.fragmentShader = 'varying vec2 vM;\nuniform float uStripe, uStripeLen, uWear, uMix, uHarrow, uClod;\nuniform vec3 uWearCol, uTint, uAmb;\n' +
          'float hsH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
          'float hsN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hsH(i), hsH(i + vec2(1.0, 0.0)), f.x), mix(hsH(i + vec2(0.0, 1.0)), hsH(i + vec2(1.0, 1.0)), f.x), f.y); }\n' + sh.fragmentShader
          .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n  reflectedLight.indirectDiffuse += diffuseColor.rgb * uAmb;')
          .replace('#include <map_fragment>', `
  // 同じ絵の繰り返しが目立たないように、大きく引き伸ばした絵を重ねる
  vec4 tA = texture2D(map, vUv), tB = texture2D(map, vUv * 0.137 + vec2(0.31, 0.17));
  vec4 texelColor = mapTexelToLinear(mix(tA, tB, uMix));
  diffuseColor *= texelColor;
  diffuseColor.rgb *= uTint;
  // 刈り目：進む向きに uStripeLen/2 m ごとに明暗
  float sp = fract(vM.y / uStripeLen);
  float st = smoothstep(0.0, 0.04, sp) * (1.0 - smoothstep(0.5, 0.54, sp));
  diffuseColor.rgb *= 1.0 + uStripe * (st * 2.0 - 1.0);
  // 内ラチ沿いの荒れ
  float wr = exp(-pow((vM.x - 1.8) / 2.2, 2.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, uWearCol, uWear * wr);
  // ハローの筋（進む向きの細い筋）
  diffuseColor.rgb *= 1.0 + uHarrow * (sin(vM.x * 9.0) * 0.6 + sin(vM.x * 23.0 + 1.3) * 0.4);
  // ダート：蹴られた土の塊と蹄の跡（暗い粒）・乾いて白っぽい所のむら
  if (uClod > 0.0) {
    float big = hsN(vM * vec2(0.35, 0.22)), mid = hsN(vM * 1.7 + 3.1), fine = hsN(vM * vec2(6.0, 4.0) + 7.7);
    diffuseColor.rgb *= 1.0 + uClod * ((big - 0.5) * 0.55 + (mid - 0.5) * 0.35);
    float clod = smoothstep(0.72, 0.86, fine) * (0.6 + 0.4 * mid);
    diffuseColor.rgb *= 1.0 - uClod * 0.55 * clod;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, 1.05, 0.92), uClod * smoothstep(0.62, 0.8, big) * 0.6);
  }`);
      };
      m.customProgramCacheKey = () => 'hs-ground';
      return m;
    }
    if (photo) {
      const ov = look.overcast ? 0.86 : 1;
      const tw = ov * [1, 0.94, 0.86, 0.78][look.wet];
      turfMat = groundMat('turf_col', 'turf_nor', 2.6, { rough: 0.92, stripe: 0.12, stripeLen: 18, wear: 0.16 + 0.04 * look.wet, tint: [0.52 * tw, 0.8 * tw, 0.42 * tw], ns: 0.9, env: 0.4, lift: true });
      const dk = [1, 0.8, 0.56, 0.46][look.wet];
      dirtMat = groundMat('dirt_col', 'dirt_nor', 1.8, { rough: [0.96, 0.78, 0.55, 0.42][look.wet], stripe: 0, wear: 0.14, wearCol: '#5e3f24', tint: [0.98 * dk, 0.74 * dk, 0.52 * dk], ns: 1.6, harrow: 0.08, env: [0.42, 0.48, 0.55, 0.6][look.wet], clod: [1, 0.9, 0.7, 0.55][look.wet], lift: true });
      grassMat = groundMat('grass_col', null, 3.2, { rough: 0.95, tint: [0.78 * ov, 0.92 * ov, 0.7 * ov], env: 0.35, lift: true });
      farMat = groundMat('grass_col', null, 9, { rough: 1, tint: [0.66 * ov, 0.8 * ov, 0.6 * ov], mix: 0.6, env: 0.3 });
      terrMat = groundMat('grass_col', null, 3.2, { rough: 0.95, tint: [0.74 * ov, 0.9 * ov, 0.66 * ov], mix: 0.5, env: 0.35 });
    } else {
      const turfTex = T(texOf(turfCanvas(look.wet, look), true, aniso));
      const dirtTex = T(texOf(dirtCanvas(look.wet), true, aniso));
      const lift = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 };
      turfMat = lambert(Object.assign({ map: turfTex }, lift));
      dirtMat = look.wet >= 2
        ? M(new THREE.MeshPhongMaterial(Object.assign({ map: dirtTex, specular: lin(look.wet >= 3 ? 0x3a3a3a : 0x262626), shininess: 26 }, lift)))
        : lambert(Object.assign({ map: dirtTex }, lift));
      grassMat = lambert(Object.assign({ map: T(texOf(grassCanvas(look, 1), true, aniso)) }, lift));
      farMat = lambert({ map: T(texOf(grassCanvas(look, 0.85), true, 1)) });
      terrMat = lambert({ map: T(texOf(grassCanvas(look, 1), true, aniso)) });
    }
    const mainMat = look.dirt ? dirtMat : turfMat;
    // 帯の貼り方：photo のときは uv を m 単位（横 u・進む向き s）に、そうでなければ手作りの絵の割り付け
    const band = (u0, u1, mat, ua, ub, per) => {
      const m = photo ? ribbon(u0, u1, 0, 0, mat, u0, u1, 1) : ribbon(u0, u1, 0, 0, mat, ua, ub, per);
      m.receiveShadow = shadowOn;
      return m;
    };
    for (const [u0, u1, kind] of TR.bands) {
      if (kind === 'grass') band(u0, u1, grassMat, 0, (u1 - u0) / 12, 12);
      else band(u0, u1, kind === 'main' ? mainMat : kind === 'turf' ? turfMat : dirtMat, 0, 1, period);
    }

    // 地面の升目（R3.terrain の grid）と、その外の広い地面
    {
      const { pos, uv, idx, x0, x1, y0, y1 } = TR.grid();
      if (!photo) for (let i = 0; i < uv.length; i++) uv[i] /= 12;
      const g = G(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const gm = new THREE.Mesh(g, terrMat);
      gm.receiveShadow = shadowOn;
      scene.add(gm);
      // その外の広い地面（升目の形の穴をあけた平らな面）
      const R = 5000, sh = new THREE.Shape([new THREE.Vector2(-R, -R), new THREE.Vector2(R, -R), new THREE.Vector2(R, R), new THREE.Vector2(-R, R)]);
      sh.holes.push(new THREE.Path([new THREE.Vector2(x0, y0), new THREE.Vector2(x0, y1), new THREE.Vector2(x1, y1), new THREE.Vector2(x1, y0)]));
      const fg = G(new THREE.ShapeGeometry(sh));
      fg.rotateX(-Math.PI / 2);
      fg.translate(0, hAvg, 0);
      const fuv = fg.attributes.uv, k = photo ? 1 : 1 / 12;
      for (let i = 0; i < fuv.count; i++) fuv.setXY(i, fuv.getX(i) * k, fuv.getY(i) * k);
      const fm = new THREE.Mesh(fg, farMat);
      fm.receiveShadow = shadowOn;
      scene.add(fm);
    }
    // 池の水
    if (pond) {
      const g = G(new THREE.CircleGeometry(1, 36));
      g.rotateX(-Math.PI / 2);
      const pm = new THREE.Mesh(g, photo ? std({ color: look.overcast ? 0x3d4f55 : 0x2f5a74, roughness: 0.06, envMapIntensity: 1.4 })
        : M(new THREE.MeshPhongMaterial({ color: lin(look.overcast ? 0x4e6670 : 0x3f7fae), specular: lin(0x667788), shininess: 60 })));
      pm.scale.set(pond.rx, 1, pond.rz);
      pm.rotation.y = pond.rot;
      pm.position.set(pond.x, pond.y0 - 0.15, -pond.y);
      scene.add(pm);
    }
    // 確かめ用：地面の高さ（上から見た x, y）
    const groundAt = (x, y) => ground(x, y);

    // ---- ラチ（内・外。白い横木と支柱） ----
    {
      const B = new Builder();
      const rail = (u, hTop) => {
        for (let i = 0; i < S.length - 1; i++) {
          const f0 = S[i], f1 = S[i + 1];
          const h0 = hTop - 0.12;
          const a0 = W3(f0, u - 0.05, f0.e + hTop), a1 = W3(f1, u - 0.05, f1.e + hTop), b0 = W3(f0, u + 0.05, f0.e + hTop), b1 = W3(f1, u + 0.05, f1.e + hTop);
          B.quad(a0, a1, b1, b0);
          B.quad(a0, W3(f0, u - 0.05, f0.e + h0), W3(f1, u - 0.05, f1.e + h0), a1);
          B.quad(b0, b1, W3(f1, u + 0.05, f1.e + h0), W3(f0, u + 0.05, f0.e + h0));
          // 支柱（十字の板）
          const p0 = W3(f0, u, f0.e), p1 = W3(f0, u, f0.e + h0);
          const fw = V3(f0.fx * 0.05, 0, -f0.fy * 0.05), sw = V3(-sign * f0.fy * 0.05, 0, -sign * f0.fx * 0.05);
          B.quad(p0.clone().sub(fw), p0.clone().add(fw), p1.clone().add(fw), p1.clone().sub(fw));
          B.quad(p0.clone().sub(sw), p0.clone().add(sw), p1.clone().add(sw), p1.clone().sub(sw));
        }
      };
      rail(0, 1.0);
      rail(W + 0.4, 1.1);
      const m = new THREE.Mesh(G(B.build()), photo ? std({ color: 0xf4f6f7, roughness: 0.35, side: THREE.DoubleSide }) : lambert({ color: 0xf2f4f5, side: THREE.DoubleSide }));
      m.castShadow = shadowOn;
      scene.add(m);
    }

    // ---- ハロン棒（残り200mごと）とゴール板 ----
    {
      const cv = canvasOf(512, 512), g = cv.getContext('2d');
      for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#f4f4f4' : '#d42a2a'; g.fillRect(0, k * 64, 32, 64); }
      const cellOf = k => [32 + (k % 4) * 120, Math.floor(k / 4) * 60];
      const nums = [];
      for (let R = 200; R < L - 60; R += 200) nums.push(R);
      nums.forEach((R, k) => {
        const [x, y] = cellOf(k);
        g.fillStyle = '#ffffff'; g.fillRect(x + 2, y + 2, 116, 56);
        g.strokeStyle = '#c11'; g.lineWidth = 3; g.strokeRect(x + 4, y + 4, 112, 52);
        g.fillStyle = '#c11'; g.font = `bold 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(R), x + 60, y + 32);
      });
      const tex = T(texOf(cv, false, aniso));
      const B = new Builder();
      const stripe = [0, 0, 32 / 512, 1];
      nums.forEach((R, k) => {
        const f = frame(R), e = f.e;
        const base = W3(f, -1.0, e);
        const pg = new THREE.CylinderGeometry(0.07, 0.07, 2.3, 6, 1, true);
        B.add(pg, new THREE.Matrix4().makeTranslation(base.x, e + 1.15, base.z), { rect: stripe });
        const [cx, cy] = cellOf(k);
        const u0 = cx / 512, u1 = (cx + 120) / 512, v1 = 1 - cy / 512, v0 = 1 - (cy + 60) / 512;
        // 前から（来る馬から）見て読める面と、後ろから見て読める面
        for (const dir of [1, -1]) {
          const dq = -dir * 0.02;
          const L1 = W3(f, -1.45, e + 2.25, dq), R1 = W3(f, -0.55, e + 2.25, dq), R2 = W3(f, -0.55, e + 2.85, dq), L2 = W3(f, -1.45, e + 2.85, dq);
          // 見る人の右手：前から見ると -sign*u の向き
          const leftIsInner = dir * sign > 0;
          const uvs = leftIsInner ? [[u1, v0], [u0, v0], [u0, v1], [u1, v1]] : [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
          B.quad(L1, R1, R2, L2, { uvs });
        }
      });
      // ゴール板の柱
      const f0 = frame(0), gb = W3(f0, -1.6, f0.e);
      B.add(new THREE.CylinderGeometry(0.09, 0.09, 3.6, 6, 1, true), new THREE.Matrix4().makeTranslation(gb.x, f0.e + 1.8, gb.z), { uv: [0.03, 1 - 96 / 512] });
      const m = new THREE.Mesh(G(B.build()), lambert({ map: tex, side: THREE.DoubleSide }));
      m.castShadow = shadowOn;
      scene.add(m);
      // ゴール板（丸い札。いつもこちらを向く）
      const gc = canvasOf(128, 128), gg = gc.getContext('2d');
      gg.fillStyle = '#ffffff'; gg.beginPath(); gg.arc(64, 64, 62, 0, TAU); gg.fill();
      gg.fillStyle = '#d4202a'; gg.beginPath(); gg.arc(64, 64, 54, 0, TAU); gg.fill();
      gg.fillStyle = '#ffffff'; gg.font = `bold 30px ${FONT}`; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText('ゴール', 64, 66);
      const sp = new THREE.Sprite(M(new THREE.SpriteMaterial({ map: T(texOf(gc, false, 1)) })));
      sp.position.set(gb.x, f0.e + 3.9, gb.z);
      sp.scale.set(1.5, 1.5, 1);
      scene.add(sp);
    }

    // ---- スタンド（ゴール前の外側）・内馬場の大きな画面・木 ----
    const props = new Builder({ color: true });
    let crowdN = 0; // 立体の観客の数
    let camFar = 70; // 中継のカメラを内へ離せるいちばん遠く
    {
      const crowd = new Builder();
      const u0 = standU, step = 25;
      for (let s0 = sa; s0 < sb - 1; s0 += step) {
        const s1 = Math.min(sb, s0 + step), f0 = frame(s0), f1 = frame(s1);
        const e0 = f0.e, e1 = f1.e;
        const P = (f, e, u, h) => W3(f, u, e + h);
        // 1階の壁・観客席（斜め）・上の窓・後ろの壁・屋根
        props.quad(P(f0, e0, u0, -2), P(f1, e1, u0, -2), P(f1, e1, u0, 2.6), P(f0, e0, u0, 2.6), { color: '#8f8c86' });
        props.quad(P(f0, e0, u0, 2.6), P(f1, e1, u0, 2.6), P(f1, e1, u0 + 1, 2.6), P(f0, e0, u0 + 1, 2.6), { color: '#bdb8ad' });
        crowd.quad(P(f0, e0, u0 + 1, 2.6), P(f1, e1, u0 + 1, 2.6), P(f1, e1, u0 + 22, 15), P(f0, e0, u0 + 22, 15), { uvs: [[0, 0], [1, 0], [1, 1], [0, 1]] });
        props.quad(P(f0, e0, u0 + 22, 15), P(f1, e1, u0 + 22, 15), P(f1, e1, u0 + 22, 19.5), P(f0, e0, u0 + 22, 19.5), { color: look.overcast ? '#33424f' : '#344a60' });
        props.quad(P(f0, e0, u0 + 24, -2), P(f1, e1, u0 + 24, -2), P(f1, e1, u0 + 24, 20), P(f0, e0, u0 + 24, 20), { color: '#d6d1c4' });
        props.quad(P(f0, e0, u0 - 3, 20.6), P(f1, e1, u0 - 3, 20.6), P(f1, e1, u0 + 24.5, 20.6), P(f0, e0, u0 + 24.5, 20.6), { color: '#eeece6' });
        props.quad(P(f0, e0, u0 - 3, 19.8), P(f1, e1, u0 - 3, 19.8), P(f1, e1, u0 - 3, 20.6), P(f0, e0, u0 - 3, 20.6), { color: '#f6f5f0' });
        props.quad(P(f0, e0, u0 - 3, 19.8), P(f1, e1, u0 - 3, 19.8), P(f1, e1, u0 + 24.5, 19.8), P(f0, e0, u0 + 24.5, 19.8), { color: '#d8d4de' });
        // 柱
        const pc = W3(f0, u0 + 0.5, 0);
        props.box(pc.x, e0 + 11.2, pc.z, 0.5, 17.2, 0.5, yawOf(f0), { color: '#d6d1c4' });
      }
      // 両端の壁
      for (const s of [sa, sb]) {
        const f = frame(s), e = f.e;
        props.quad(W3(f, u0, e - 2), W3(f, u0 + 24, e - 2), W3(f, u0 + 24, e + 20), W3(f, u0, e + 20), { color: '#cfcabd' });
      }
      // 素材を使うときは、観客席は座席の絵にして、人は立体（下の crowd3d）で置く
      const ctex = T(texOf(photo ? seatCanvas() : crowdCanvas(256), false, aniso));
      scene.add(new THREE.Mesh(G(crowd.build()), lambert({ map: ctex, side: THREE.DoubleSide })));
      if (photo) crowd3d(u0);
      // 内馬場のまんなかあたり（スタンドの向かい）。直線のコースは内側の少し先
      const sm = (sa + sb) / 2, f = frame(sm);
      let su = innerEdge - 40;
      if (loop) { const i0 = nearest(f.x, f.y).i; for (let u = innerEdge; u > -2000; u -= 10) { const p = wpt(f, u), n = nearest(p.x, p.y); if (!n || Math.abs(n.i - i0) > 6) { su = Math.min(innerEdge - 30, u * 0.55); break; } } }
      if (loop) camFar = Math.max(30, Math.min(-innerEdge + 26, -su));
      const c = W3(f, su, 0), yaw = yawOf(f), gy = ground(c.x, -c.z);
      props.box(c.x, gy + 10, c.z, 44, 14, 1.4, yaw, { color: '#1c2129' });
      const cf = W3(f, su + 0.75, 0);
      props.box(cf.x, gy + 10.3, cf.z, 41, 11.5, 0.1, yaw, { color: look.overcast ? '#2a4258' : '#2c5070' });
      for (const dq of [-14, 14]) { const lg = W3(f, su, 0, dq); props.box(lg.x, ground(lg.x, -lg.z) + 1.2, lg.z, 1, 4.0, 1, yaw, { color: '#555c66' }); }
    }
    // 観客（立体）：観客席に座る人とスタンド前の立ち見。体と頭の2つの形を InstancedMesh で（描く回数は4回）
    // 色・背の高さ・向き・座る位置は番号から決まる揺らぎでばらす。光は受けるが影は落とさない（重さ）
    function crowd3d(u0) {
      const shirts = ['#c9b8a6', '#e8d6c0', '#3b3f52', '#8a6d5a', '#f2f2f2', '#c83a3a', '#3a6bc8', '#e0c040', '#2c2c30', '#9aa4b0', '#6a8a5a', '#d88a5a', '#ffffff', '#1c1c22', '#7a3a5a', '#2f6a6a'];
      const skins = ['#e9c8a6', '#dcb48e', '#c99a74', '#a8795a', '#f0d4b8'];
      const hairs = ['#1a1410', '#2a2018', '#4a3828', '#6a6a6a', '#16120e', '#8a6a48'];
      const seat = [], stand = [];
      const len = sb - sa;
      // 座る人：段は 24 段（u0+1.6 → u0+21.4、高さ 2.6 → 15）、横は 0.62m ごと
      for (let r = 0; r < 24; r++) {
        const fu = (r + 0.5) / 24, u = u0 + 1 + 21 * fu, h = 2.6 + 12.4 * fu;
        const n = Math.floor(len / 0.62);
        for (let q = 0; q < n; q++) {
          const id = r * 4099 + q;
          // 上の段と端は空き気味
          if (hash01(id, 91) > 0.78 - fu * 0.22 - (q < 6 || q > n - 6 ? 0.3 : 0)) continue;
          seat.push([sa + (q + 0.5 + (hash01(id, 92) - 0.5) * 0.3) * 0.62, u + (hash01(id, 93) - 0.5) * 0.12, h, id]);
        }
      }
      // 立ち見：スタンドの前に 3 列
      for (let r = 0; r < 3; r++) {
        const n = Math.floor(len / 0.56);
        for (let q = 0; q < n; q++) {
          const id = 900000 + r * 4099 + q;
          if (hash01(id, 91) > (r === 0 ? 0.85 : 0.62)) continue;
          stand.push([sa + (q + 0.5 + (hash01(id, 92) - 0.5) * 0.5) * 0.56, u0 - 1.2 - r * 0.75 + (hash01(id, 93) - 0.5) * 0.3, 0, id]);
        }
      }
      const all = seat.concat(stand), n = all.length;
      if (!n) return;
      // 体（座っていれば胸から上、立っていれば脚まで）と頭（髪の帽子つき）
      const body = new Builder({ color: true });
      body.add(new THREE.CylinderGeometry(0.15, 0.21, 0.64, 5, 1, true), new THREE.Matrix4().makeTranslation(0, 0.32, 0), { color: '#ffffff' });
      const legs = new Builder({ color: true });
      legs.add(new THREE.CylinderGeometry(0.15, 0.21, 0.64, 5, 1, true), new THREE.Matrix4().makeTranslation(0, 1.14, 0), { color: '#ffffff' });
      legs.add(new THREE.CylinderGeometry(0.15, 0.11, 0.84, 4, 1, true), new THREE.Matrix4().makeTranslation(0, 0.42, 0), { color: '#3a3c46' });
      const head = new Builder({ color: true });
      head.add(new THREE.OctahedronGeometry(0.12, 0), new THREE.Matrix4().makeScale(1, 1.1, 1), { color: '#ffffff' });
      const hair = new Builder({ color: true });
      hair.add(new THREE.ConeGeometry(0.13, 0.11, 4, 1, true), new THREE.Matrix4().makeTranslation(0, 0.09, 0), { color: '#ffffff' });
      const mat = lambert({ vertexColors: true });
      // スタンドを横に 4 つに分けて描く（見えない所は描かない）。InstancedMesh の見える範囲は、形の範囲を人のいる所まで広げて決める
      const NC = 4, chunk = x => clamp(Math.floor((x[0] - sa) / len * NC), 0, NC - 1);
      const o = new THREE.Object3D(), c = new THREE.Color();
      for (let ck = 0; ck < NC; ck++) {
        const ps = all.filter(x => chunk(x) === ck), ns = ps.filter(x => x[2] > 0).length, nl = ps.length - ns;
        if (!ps.length) continue;
        const f0 = frame(sa + (ck + 0.5) * len / NC), ctr = W3(f0, u0 + 8, f0.e + 7), rad = len / NC / 2 + 30;
        const mk = (B, cnt) => {
          const g = G(B.build()); g.boundingSphere = new THREE.Sphere(ctr.clone(), rad);
          const m = new THREE.InstancedMesh(g, mat, Math.max(1, cnt)); m.count = cnt; scene.add(m); return m;
        };
        const mBody = mk(body, ns), mLegs = mk(legs, nl), mHead = mk(head, ps.length), mHair = mk(hair, ps.length);
        let ib = 0, il = 0;
        ps.forEach(([s, u, h, id], k) => {
          const f = frame(s), p = W3(f, u, f.e + h), sit = h > 0;
          const tall = 0.9 + hash01(id, 94) * 0.22, wide = 0.9 + hash01(id, 95) * 0.25;
          const yaw = yawOf(f) + (hash01(id, 96) - 0.5) * 0.6;
          o.position.copy(p); o.rotation.set((sit ? -0.12 : 0) * sign, yaw, 0); o.scale.set(wide, tall, wide); o.updateMatrix();
          c.copy(lin(shirts[Math.floor(hash01(id, 97) * shirts.length)]));
          if (sit) { mBody.setMatrixAt(ib, o.matrix); mBody.setColorAt(ib++, c); } else { mLegs.setMatrixAt(il, o.matrix); mLegs.setColorAt(il++, c); }
          // 頭と髪（1割は帽子）
          o.position.y = p.y + (sit ? 0.76 : 1.58) * tall; o.scale.set(1, 1, 1); o.rotation.set(0, yaw, 0); o.updateMatrix();
          mHead.setMatrixAt(k, o.matrix); mHead.setColorAt(k, c.copy(lin(skins[Math.floor(hash01(id, 98) * skins.length)])));
          const hat = hash01(id, 99) < 0.1;
          mHair.setMatrixAt(k, o.matrix); mHair.setColorAt(k, c.copy(lin(hat ? shirts[Math.floor(hash01(id, 100) * shirts.length)] : hairs[Math.floor(hash01(id, 101) * hairs.length)])));
        });
        for (const m of [mBody, mLegs, mHead, mHair]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
      }
      crowdN = n;
    }
    // 木（外の向こう正面と、内馬場）。InstancedMesh で1回に描く
    // 素材の木（板絵を十字に組んだ形）があればそれを、無ければ手作りの形
    {
      const spots = [];
      const treeImg = imgOk('tree');
      const step = treeImg ? 15 : 26;
      // 置く所が、そのコースの点からいちばん近い（ほかの所のコースの上に来ない）ときだけ置く
      const put = (f, u, sc, id) => {
        const p = wpt(f, u), n = nearest(p.x, p.y);
        if (!n || Math.abs(n.u - u) > 2 || n.u > bandI && n.u < bandOf(n.i != null ? S[n.i].s : 0) + 6) return;
        if (pond) { const px = p.x - pond.x, py = p.y - pond.y, c = Math.cos(pond.rot), s = Math.sin(pond.rot); if (Math.hypot((px * c + py * s) / pond.rx, (-px * s + py * c) / pond.rz) < 1.5) return; }
        spots.push([p.x, ground(p.x, p.y), -p.y, sc, id]);
      };
      for (let k = 0; sLo + k * step < sHi; k++) {
        const s = sLo + k * step, home = loop ? (s < hr1 + 40 || s > L + hr0 - 40) : (s > sa - 60 && s < sb + 60);
        const f = frame(s);
        if (!home) {
          put(f, outerEdge - 18 + hash01(k, 1) * 30, 0.8 + hash01(k, 2) * 0.6, k);
          if (treeImg && hash01(k, 6) < 0.7) put(f, outerEdge + 14 + hash01(k, 7) * 40, 0.9 + hash01(k, 8) * 0.7, k + 2000);
        }
        const ut = innerEdge - 34 - hash01(k, 4) * 30;
        if (hash01(k, 3) < 0.55 && !home) put(f, ut, 0.7 + hash01(k, 5) * 0.6, k + 1000);
      }
      let tg, tm;
      if (treeImg) {
        // 板絵（左半分＝正面から、右半分＝横から）。高さ 5.1m の木を 2.2〜3.5 倍に
        const B = new Builder();
        const hw = 2.565, y0 = -0.07, y1 = 5.06;
        for (const [ax, u0] of [[0, 0], [1, 0.5]]) {
          const a = ax ? V3(0, y0, -hw) : V3(-hw, y0, 0), b = ax ? V3(0, y0, hw) : V3(hw, y0, 0);
          const c = b.clone().setY(y1), d = a.clone().setY(y1);
          B.quad(a, b, c, d, { uvs: [[u0 + 0.002, 0], [u0 + 0.498, 0], [u0 + 0.498, 1], [u0 + 0.002, 1]] });
        }
        tg = G(B.build());
        // 光は板絵に描いてあるので、光を受けない材質で（裏から見ても暗くならない）
        tm = M(new THREE.MeshBasicMaterial({ map: T(imgTex('tree', false, aniso)), alphaTest: 0.45, side: THREE.DoubleSide, color: lin(look.overcast ? '#9fae9c' : '#c6d6b4') }));
      } else {
        const B = new Builder({ color: true });
        B.add(new THREE.CylinderGeometry(0.22, 0.32, 3.2, 5, 1, true), new THREE.Matrix4().makeTranslation(0, 1.6, 0), { color: '#4a3523' });
        B.add(new THREE.IcosahedronGeometry(1, 0), new THREE.Matrix4().compose(V3(0, 5.2, 0), new THREE.Quaternion(), V3(2.8, 3.2, 2.8)), { color: look.overcast ? '#2f4f31' : '#2e6033' });
        B.add(new THREE.IcosahedronGeometry(1, 0), new THREE.Matrix4().compose(V3(0.5, 7.3, 0.3), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0.7, 0)), V3(1.9, 2.0, 1.9)), { color: look.overcast ? '#375a38' : '#3a7440' });
        tg = G(B.build());
        tm = lambert({ vertexColors: true });
      }
      const im = new THREE.InstancedMesh(tg, tm, spots.length);
      im.frustumCulled = false; // 木はコースのまわり全体にある
      const o = new THREE.Object3D();
      spots.forEach(([x, y, z, sc, id], i) => {
        const k = treeImg ? 2.3 * sc : sc;
        o.position.set(x, y, z); o.rotation.set(0, hash01(id, 9) * TAU, 0); o.scale.set(k, k * (0.85 + hash01(id, 8) * 0.4), k); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }

    // ---- ゲート（スタート地点 x=0。発走前は全頭が収まる。t が 0 を過ぎたら扉が開く） ----
    const gate = new THREE.Group();
    let doors = null, lamps = null, glows = [];
    const LAMP_OFF = 0x24150f, LAMP_ON = 0xffb070;
    const GQ0 = -2.6, GQ1 = 0.6; // 枠の奥行き（前が +）
    const gZ = u => -sign * u;   // ゲートの中の横の位置（外へ u m）
    {
      const fS = frame(D), n = Math.max(nH, 2);
      const p0 = W3(fS, 0, fS.e);
      gate.position.copy(p0); gate.rotation.y = yawOf(fS);
      const B = new Builder({ color: true });
      const green = '#2f7d50', greenD = '#245f3d', white = '#e9ece8';
      const uD = j => LANE0 + (j - 0.5) * GATE_P;
      const um = (uD(0) + uD(n)) / 2, wid = uD(n) - uD(0);
      for (let j = 0; j <= n; j++) {
        const z = gZ(uD(j));
        B.box((GQ0 + GQ1) / 2, 1.15, z, GQ1 - GQ0, 1.5, 0.06, 0, { color: j === 0 || j === n ? greenD : green });
        B.box(GQ1, 1.6, z, 0.1, 3.2, 0.1, 0, { color: white });
        B.box(GQ0, 1.75, z, 0.1, 3.5, 0.1, 0, { color: white });
        B.box((GQ0 + GQ1) / 2, 3.3, z, GQ1 - GQ0, 0.08, 0.08, 0, { color: white });
      }
      B.box(GQ1, 3.0, gZ(um), 0.3, 0.42, wid + 0.3, 0, { color: green });
      B.box(GQ0, 3.4, gZ(um), 0.3, 0.32, wid + 0.3, 0, { color: green });
      for (const j of [0, n]) { // 両端の台
        const z = gZ(uD(j) + (j === 0 ? -0.45 : 0.45));
        B.box((GQ0 + GQ1) / 2, 2.0, z, GQ1 - GQ0 + 0.4, 3.6, 0.8, 0, { color: greenD });
        for (const q of [GQ0 + 0.4, GQ1 - 0.4]) B.add(new THREE.CylinderGeometry(0.4, 0.4, 0.25, 10), new THREE.Matrix4().compose(V3(q, 0.4, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), V3(1, 1, 1)), { color: '#202020' });
      }
      { const gm = new THREE.Mesh(G(B.build()), lambert({ vertexColors: true })); gm.castShadow = shadowOn; gate.add(gm); }
      // 枠の番号（前の梁の前と、後ろの梁の後ろ）
      const cv = canvasOf(512, 128), g = cv.getContext('2d');
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 128);
      g.fillStyle = '#111'; g.font = `bold 44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let k = 0; k < 18; k++) { const x = (k % 9) * 56 + 28, y = Math.floor(k / 9) * 64 + 34; g.fillText(String(k + 1), x, y); g.strokeStyle = '#999'; g.lineWidth = 2; g.strokeRect((k % 9) * 56 + 3, Math.floor(k / 9) * 64 + 3, 50, 58); }
      const NB = new Builder();
      for (let j = 0; j < Math.min(n, 18); j++) {
        const k = j, cu0 = (k % 9) * 56 / 512, cu1 = ((k % 9) * 56 + 56) / 512, cv1 = 1 - Math.floor(k / 9) * 64 / 512 * 4, cv0 = cv1 - 0.5;
        const uc = LANE0 + j * GATE_P;
        for (const [q, y, dir] of [[GQ1 + 0.16, 3.0, 1], [GQ0 - 0.16, 3.4, -1]]) {
          const za = gZ(uc - 0.28), zb = gZ(uc + 0.28);
          // 見る人の右手（前から見る＝-dir 向きに見る）
          const a = V3(q, y - 0.17, za), b = V3(q, y - 0.17, zb), c = V3(q, y + 0.17, zb), d = V3(q, y + 0.17, za);
          // 板の左右：前の板は前から、後ろの板は後ろから見る
          const flipU = (dir > 0) !== (sign > 0);
          const uvs = flipU ? [[cu1, cv0], [cu0, cv0], [cu0, cv1], [cu1, cv1]] : [[cu0, cv0], [cu1, cv0], [cu1, cv1], [cu0, cv1]];
          NB.quad(a, b, c, d, { uvs });
        }
      }
      gate.add(new THREE.Mesh(G(NB.build()), lambert({ map: T(texOf(cv, false, aniso)), side: THREE.DoubleSide })));
      // 扉（前）：枠ごとに左右2枚
      const dg = G(new THREE.BoxGeometry(0.04, 1.25, GATE_P / 2 - 0.03));
      dg.translate(0, 0, (GATE_P / 2 - 0.03) / 2);
      doors = new THREE.InstancedMesh(dg, lambert({ color: 0xcdd4d8, side: THREE.DoubleSide }), n * 2);
      doors.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      doors.userData = { n, uD };
      gate.add(doors);
      // 前触れの灯（後ろの梁の上、枠ごとに1つ。発走を待つ騎乗の視点から見える側）：開く少し前（S.GATE.tell 秒前）につき、光がにじむ。目押しの合図（数・文字は出さない）
      lamps = new THREE.InstancedMesh(G(new THREE.BoxGeometry(0.16, 0.3, 0.62)), M(new THREE.MeshBasicMaterial({ color: LAMP_OFF })), n);
      const lc = canvasOf(64, 64), lg = lc.getContext('2d'), rg = lg.createRadialGradient(32, 32, 0, 32, 32, 31);
      rg.addColorStop(0, 'rgba(255,236,200,1)'); rg.addColorStop(0.25, 'rgba(255,140,70,0.85)'); rg.addColorStop(1, 'rgba(255,80,30,0)');
      lg.fillStyle = rg; lg.fillRect(0, 0, 64, 64);
      const glowMat = M(new THREE.SpriteMaterial({ map: T(texOf(lc, false, 1)), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      glows = [];
      { const o = new THREE.Object3D(); for (let j = 0; j < n; j++) {
        const z = gZ(LANE0 + j * GATE_P);
        o.position.set(GQ0 - 0.12, 3.74, z); o.updateMatrix(); lamps.setMatrixAt(j, o.matrix);
        const sp = new THREE.Sprite(glowMat); sp.position.set(GQ0 - 0.3, 3.74, z); sp.scale.set(1.5, 1.5, 1); sp.visible = false; gate.add(sp); glows.push(sp);
      } }
      gate.add(lamps);
      scene.add(gate);
    }
    let lampOn = false;
    function setLamps(on) {
      if (on === lampOn || !lamps) return;
      lampOn = on;
      lamps.material.color.setHex(on ? LAMP_ON : LAMP_OFF);
      for (const sp of glows) sp.visible = on;
    }
    let doorOpen = -1;
    function setDoors(open) {
      if (Math.abs(open - doorOpen) < 1e-4) return;
      doorOpen = open;
      const { n, uD } = doors.userData, o = new THREE.Object3D();
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < 2; k++) {
          // 蝶番は仕切りの側。扉は前へ開く
          const hu = k === 0 ? uD(j) : uD(j + 1), z = gZ(hu), towardZ = Math.sign(gZ(LANE0 + j * GATE_P) - z) || 1;
          o.position.set(GQ1, 1.12, z);
          o.rotation.set(0, -towardZ * open, 0);
          o.scale.set(1, 1, towardZ);
          o.updateMatrix();
          doors.setMatrixAt(j * 2 + k, o.matrix);
        }
      }
      doors.instanceMatrix.needsUpdate = true;
    }
    setDoors(0);
    scene.add(new THREE.Mesh(G(props.build()), lambert({ vertexColors: true, side: THREE.DoubleSide })));

    // ---- 空・山並み・遠くの林 ----
    // 素材の空：全天の上を切り出した絵を、内側から見る球に貼る。太陽は向こう正面の側（中継のカメラの後ろ）に来るように回す
    let sky;
    const sunDir = new THREE.Vector3(-0.5, 1, 0.35).normalize();
    if (skyImg) {
      const SUN_U = look.overcast ? 0.6016 : 0.5967;   // 絵の中の太陽の横の位置（0〜1）
      const f0 = frame(0), fwd = V3(f0.fx, 0, -f0.fy), out = V3(-sign * f0.fy, 0, -sign * f0.fx);
      const sh = out.clone().multiplyScalar(-0.8).addScaledVector(fwd, -0.6).normalize();  // 太陽の水平の向き
      const phiS = Math.atan2(sh.z, sh.x), off = SUN_U - 0.5 - phiS / TAU;
      sunDir.set(sh.x * Math.cos(look.sunEl), Math.sin(look.sunEl), sh.z * Math.cos(look.sunEl));
      const g = G(new THREE.SphereGeometry(5000, 48, 24));
      const P = g.attributes.position, UV = g.attributes.uv;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i), r = Math.hypot(x, y, z) || 1;
        UV.setXY(i, 1 - UV.getX(i) + off, skyV(y / r));
      }
      const st = T(new THREE.Texture(IMG[look.sky]));
      st.wrapS = THREE.RepeatWrapping; st.encoding = THREE.sRGBEncoding; st.anisotropy = 1; st.needsUpdate = true;
      sky = new THREE.Mesh(g, M(new THREE.MeshBasicMaterial({ map: st, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false })));
      // 映り込み（環境の光）：空の絵の下に地面の色を足した全天の絵から作る
      const ec = canvasOf(512, 256), eg = ec.getContext('2d');
      const ox = Math.round(off * 512), ch = Math.round(256 * SKY_CROP);
      for (const dx of [-512, 0, 512]) eg.drawImage(IMG[look.sky], dx - ox, 0, 512, ch);
      const gr = eg.createLinearGradient(0, ch, 0, 256);
      gr.addColorStop(0, fogCol); gr.addColorStop(0.08, look.overcast ? '#5e6a55' : '#6e8a4c'); gr.addColorStop(1, '#3a4a2c');
      eg.fillStyle = gr; eg.fillRect(0, ch, 512, 256 - ch);
      const et = new THREE.CanvasTexture(ec);
      et.mapping = THREE.EquirectangularReflectionMapping; et.encoding = THREE.sRGBEncoding;
      try {
        const pm = new THREE.PMREMGenerator(renderer);
        const env = pm.fromEquirectangular(et).texture;
        pm.dispose(); et.dispose();
        scene.environment = T(env);
      } catch (e) { et.dispose(); }
    } else {
      sky = new THREE.Mesh(G(new THREE.SphereGeometry(5000, 32, 16)), M(new THREE.MeshBasicMaterial({ map: T(texOf(skyCanvas(look), false, 1)), side: THREE.BackSide, fog: false, depthWrite: false })));
    }
    sky.renderOrder = -10;
    scene.add(sky);
    sun.position.copy(sunDir).multiplyScalar(150);
    function ring(R, hf, top, bot, seed) {
      const n = 160, pos = [], col = [], idx = [];
      const ct = new THREE.Color(top), cb = new THREE.Color(bot);
      for (let i = 0; i <= n; i++) {
        const a = i / n * TAU, h = hf(a);
        pos.push(Math.cos(a) * R, hAvg - 4, Math.sin(a) * R, Math.cos(a) * R, hAvg + h, Math.sin(a) * R);
        col.push(cb.r, cb.g, cb.b, ct.r, ct.g, ct.b);
        if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
      const g = G(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      // 色はそのまま出す（線形に直した色を、色の調子をかけずに）
      const m = new THREE.Mesh(g, M(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide, toneMapped: false })));
      scene.add(m);
    }
    const hazeTo = skyImg ? fogCol : look.skyHor;
    const haze = (c, k) => { const a = new THREE.Color(c), b = new THREE.Color(hazeTo); const m = a.lerp(b, k); return LIN ? m.convertSRGBToLinear() : m; };
    const hk = skyImg ? 0.2 : 0;
    ring(3600, a => 150 + 90 * Math.sin(3 * a + 1) + 60 * Math.sin(7 * a + 2.1) + 30 * Math.sin(13 * a + 0.4) + 16 * Math.sin(29 * a), haze(look.mount, 0.25 + hk * 1.5), haze(look.mount, 0.75 + hk));
    ring(2700, a => 60 + 34 * Math.sin(5 * a + 0.3) + 22 * Math.sin(11 * a + 1.7) + 10 * Math.sin(23 * a + 0.9), haze(look.mount2, 0.2 + hk * 1.4), haze(look.mount2, 0.6 + hk));
    ring(1500, a => 22 + 7 * Math.sin(37 * a) + 5 * Math.sin(61 * a + 1.3) + 4 * Math.sin(97 * a + 0.2), haze(look.woods, 0.18 + hk), haze(look.woods, 0.35 + hk));

    // ---- 馬 ----
    // 形は近く・遠くの2つを全頭で使い回す。馬ごとに違うのは絵（毛色・勝負服・ゼッケン）と、馬具の骨を見せるかだけ
    // 騎手の素材（GLB）があれば、馬の形からは騎手を抜き、騎手は別の形で描く（手綱・ムチ・鐙は馬の形のまま）
    const hgeo = G(horseGeometry(1, { noJockey: useJockey, tack: rigged, noBridle: rigged })), hgeoLo = G(horseGeometry(0, { noJockey: useJockey, tack: rigged, noBridle: rigged }));
    if (photo && !HORSE_NOR) HORSE_NOR = horseNormalCanvas(512);
    const norTex = photo ? T(texOf(HORSE_NOR, false, aniso, true)) : null;
    const H = [];
    for (let i = 0; i < nH; i++) {
      const h0 = horsesIn[i] || {};
      const h = Object.assign({}, h0, { age: ageOf(h0), gear: gearOf(h0) });
      const tex = T(texOf(paintHorse(h, photo ? 512 : 256), false, aniso));
      const L = coatLook(h.coat, h.age), gl = L.gloss || 0;
      const mat = photo
        ? M(new THREE.MeshStandardMaterial({ map: tex, normalMap: norTex, normalScale: new THREE.Vector2(1, 1), skinning: true, roughness: 0.78 - 0.08 * gl, metalness: 0, envMapIntensity: 0.6 }))
        : M(new THREE.MeshPhongMaterial({ map: tex, skinning: true, shininess: 18 + 30 * gl, specular: new THREE.Color(0x111111).lerp(new THREE.Color(0x3a3a3a), gl) }));
      const mesh = new THREE.SkinnedMesh(hgeo, mat);
      mesh.castShadow = shadowOn;
      const bones = horseBones();
      mesh.add(bones[0]);
      mesh.updateMatrixWorld(true);
      mesh.bind(new THREE.Skeleton(bones));
      // 着けていない馬具は骨を縮めて消す
      for (const [k, bi] of Object.entries(GEAR)) if (!h.gear[k]) bones[bi].scale.set(0, 0, 0);
      mesh.rotation.order = 'YXZ';
      let rig = null;
      if (rigged) { try { rig = HRG.make(h, bones); M(rig.mat); M(rig.hairMat); M(rig.bridleMat); } catch (e) { rig = null; } }
      let jockey = null;
      if (useJockey) {
        try { jockey = makeJockey(h, M); mesh.add(jockey.root); } catch (e) { jockey = null; }
      }
      scene.add(mesh);
      const seed = hash01(strHash(h.name || i), 3);
      H.push({ mesh, bones, jockey, rig, num: h.num != null ? h.num : i + 1, seed, lead: seed < 0.5 ? 1 : -1, lean: 0, yaw: 0, lane: null, kakari: 0, ears: 0.3 });
    }
    // 丸い影の板（まとめて1回）
    const shTexC = canvasOf(64, 64), sg = shTexC.getContext('2d');
    const rg = sg.createRadialGradient(32, 32, 2, 32, 32, 31);
    const so = shadowOn ? 0.75 : 1; // 太陽の影があるときは、足元の暗がりだけ
    rg.addColorStop(0, `rgba(0,0,0,${0.55 * so})`); rg.addColorStop(0.6, `rgba(0,0,0,${0.3 * so})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64);
    const shGeo = G(new THREE.PlaneGeometry(1, 1)); shGeo.rotateX(-Math.PI / 2);
    const shadows = new THREE.InstancedMesh(shGeo, M(new THREE.MeshBasicMaterial({ map: T(texOf(shTexC, false, 1)), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })), Math.max(1, nH));
    shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    shadows.renderOrder = 1;
    scene.add(shadows);
    // 自分の馬の目印（黄色い輪）
    const ringGeo = G(new THREE.RingGeometry(0.95, 1.12, 32)); ringGeo.rotateX(-Math.PI / 2);
    const mark = new THREE.Mesh(ringGeo, M(new THREE.MeshBasicMaterial({ color: lin(0xffd34d), transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 })));
    mark.renderOrder = 2;
    mark.visible = false;
    scene.add(mark);

    // ---- 蹴り上げ：ダートは砂ぼこり（重・不良は泥の粒）、芝は土くれ。点の絵をまとめて1回で描く ----
    const dust = photo && !setup.noDust ? makeDust() : null;
    function makeDust() {
      const N = 480, puff = look.dirt && look.wet < 2;
      const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), age = new Float32Array(N).fill(99), life = new Float32Array(N).fill(1);
      const size = new Float32Array(N), alpha = new Float32Array(N), s0 = new Float32Array(N), grow = new Float32Array(N), a0 = new Float32Array(N), shade = new Float32Array(N).fill(1), grain = new Uint8Array(N), floor = new Float32Array(N);
      const g = G(new THREE.BufferGeometry());
      const pa = new THREE.BufferAttribute(pos, 3), sa = new THREE.BufferAttribute(size, 1), aa = new THREE.BufferAttribute(alpha, 1), ha = new THREE.BufferAttribute(shade, 1);
      for (const at of [pa, sa, aa, ha]) at.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('position', pa); g.setAttribute('aSize', sa); g.setAttribute('aAlpha', aa); g.setAttribute('aShade', ha);
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
      const pc = canvasOf(64, 64), pg = pc.getContext('2d');
      const rg = pg.createRadialGradient(32, 32, 0, 32, 32, 31);
      if (puff) { rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(0.45, 'rgba(255,255,255,0.45)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); }
      else { rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.55, 'rgba(255,255,255,0.95)'); rg.addColorStop(0.75, 'rgba(255,255,255,0.2)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); }
      pg.fillStyle = rg; pg.fillRect(0, 0, 64, 64);
      const col = look.dirt ? (puff ? '#e8cfa6' : '#5a4430') : '#4e4128';
      const U = { uMap: { value: T(texOf(pc, false, 1)) }, uCol: { value: lin(col) }, uScale: { value: 300 }, uLight: { value: look.overcast ? 0.75 : 1.15 } };
      const mat = M(new THREE.ShaderMaterial({
        uniforms: U, transparent: true, depthWrite: false,
        vertexShader: `attribute float aSize; attribute float aAlpha; attribute float aShade; varying float vA; varying float vS; uniform float uScale;
          void main() { vA = aAlpha; vS = aShade; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform sampler2D uMap; uniform vec3 uCol; uniform float uLight; varying float vA; varying float vS;
          void main() { vec4 t = texture2D(uMap, gl_PointCoord); float a = t.a * vA; if (a < 0.01) discard; gl_FragColor = vec4(uCol * uLight * vS, a);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          }`,
      }));
      const pts = new THREE.Points(g, mat);
      pts.frustumCulled = false;
      pts.renderOrder = 3;
      scene.add(pts);
      const acc = new Float32Array(Math.max(1, nH));
      let cur = 0, cnt = 0;
      return {
        U,
        emit(i, p, f, v, ph, dt, lead, d2) {
          if (!(dt > 0) || d2 > 95 * 95) return;
          const rate = (puff ? 44 : 16) * clamp((v - 6) / 10, 0, 1);
          acc[i] += rate * dt;
          const fx = f.fx, fz = -f.fy, lx = -sign * f.fy, lz = -sign * f.fx;   // 前と外の向き（3D）
          while (acc[i] >= 1) {
            acc[i] -= 1;
            const k = cur; cur = (cur + 1) % N; cnt++;
            const h1 = hash01(cnt, i * 7 + 1), h2 = hash01(cnt, i * 7 + 2), h3 = hash01(cnt, i * 7 + 3), h4 = hash01(cnt, i * 7 + 4);
            const back = -0.55 - h1 * 0.6, side = (h2 - 0.5) * 0.55;
            pos[k * 3] = p.x + fx * back + lx * side; pos[k * 3 + 1] = f.e + 0.06; pos[k * 3 + 2] = -p.y + fz * back + lz * side; floor[k] = f.e + 0.02;
            const vb = puff ? 1.2 + h3 * 2.6 : 2.0 + h3 * 3.0, vs = (h4 - 0.5) * 1.6, vu = puff ? 0.9 + h4 * 1.6 : 2.2 + h1 * 2.6;
            vel[k * 3] = -fx * vb + lx * vs; vel[k * 3 + 1] = vu; vel[k * 3 + 2] = -fz * vb + lz * vs;
            age[k] = 0;
            // ダートの乾いた日は、砂けむり（大きく薄い）と砂粒（小さく暗い）を混ぜる
            const gr = puff && h4 < 0.35;
            grain[k] = gr || !puff ? 1 : 0;
            if (gr) { vel[k * 3 + 1] = 2.4 + h1 * 2.2; vel[k * 3] *= 1.4; vel[k * 3 + 2] *= 1.4; }
            life[k] = gr ? 0.5 + h2 * 0.25 : puff ? 1.0 + h2 * 0.9 : 0.45 + h2 * 0.3;
            s0[k] = gr ? 0.06 + h3 * 0.05 : puff ? 0.45 + h3 * 0.4 : 0.07 + h3 * 0.08;
            grow[k] = gr ? 0 : puff ? 1.8 + h1 * 1.0 : 0;
            a0[k] = gr ? 0.95 : puff ? 0.42 + h4 * 0.3 : 0.9;
            shade[k] = gr ? 0.55 : puff ? 0.95 + h2 * 0.2 : 1;
          }
        },
        update(dt, scale) {
          U.uScale.value = scale;
          const drag0 = puff ? 2.2 : 0.4;
          for (let k = 0; k < N; k++) {
            if (age[k] >= life[k]) { if (alpha[k] !== 0) alpha[k] = 0; continue; }
            age[k] += dt;
            const gv = grain[k] ? 9.8 : 1.6, e = Math.max(0, 1 - (grain[k] ? 0.4 : drag0) * dt);
            vel[k * 3] *= e; vel[k * 3 + 2] *= e; vel[k * 3 + 1] = vel[k * 3 + 1] * e - gv * dt;
            pos[k * 3] += vel[k * 3] * dt; pos[k * 3 + 1] = Math.max(floor[k], pos[k * 3 + 1] + vel[k * 3 + 1] * dt); pos[k * 3 + 2] += vel[k * 3 + 2] * dt;
            const u = age[k] / life[k];
            size[k] = s0[k] * (1 + grow[k] * u);
            alpha[k] = u >= 1 ? 0 : a0[k] * Math.pow(1 - u, 1.4) * Math.min(1, u * 8);
          }
          pa.needsUpdate = true; sa.needsUpdate = true; aa.needsUpdate = true; ha.needsUpdate = true;
        },
      };
    }

    // ---- 1コマ ----
    const mem = { t: null, cam: null, camMode: null, camU: null };
    const tmpO = new THREE.Object3D();
    const vtmp = new THREE.Vector3();
    let hfovMin = 66;

    function setFov(base, extra) {
      const asp = VW / VH;
      const need = 2 * Math.atan(Math.tan(hfovMin * Math.PI / 360) / asp) * 180 / Math.PI;
      const f = Math.max(base, Math.min(need, 80)) + (extra || 0);
      if (Math.abs(camera.fov - f) > 0.01) { camera.fov = f; camera.updateProjectionMatrix(); }
    }

    function render(view, camMode, orbit) {
      view = view || {};
      camMode = camMode || 'ride';
      const t = view.t || 0;
      const hv = view.horses || [];
      let meI = view.me != null ? view.me : horsesIn.findIndex(h => h.mine);
      if (meI == null || meI < 0) meI = 0;
      const gateNow = view.phase === 'gate' || t <= 0;
      let dt = mem.t == null ? 0 : t - mem.t;
      const jump = dt < -0.05 || dt > 1.5;
      if (jump) { dt = 0; for (const h of H) { h.lane = null; } mem.cam = null; }
      mem.t = t;
      const gk = gateNow ? 0 : smooth(t / GATE_OPEN);
      const uH = lane => gk >= 1 ? uOf(lane) : LANE0 + (lane || 0) / 0.5 * GATE_P * (1 - gk) + (uOf(lane) - LANE0) * gk;
      // 馬を置く
      const pos = [];
      for (let i = 0; i < nH; i++) {
        const st = hv[i] || { x: 0, lane: 0, v: 0 };
        const Hh = H[i];
        const x = st.x || 0, v = st.v || 0, lane = st.lane || 0;
        const q = x - BODY, s = D - q;
        const f = frame(s), u = uH(lane);
        const p = wpt(f, u);
        // 傾き：コーナーで内へ、進路を変えると変える向きへ
        const vlat = dt > 0 && Hh.lane != null ? (lane - Hh.lane) / dt * LANE_M : 0;
        Hh.lane = lane;
        const moving = !gateNow && v > 1.5;
        const tgtLean = moving ? clamp(Math.abs(f.curv) * v * v / 9.8 * 0.5, 0, 0.14) : 0;
        const tgtYaw = moving ? clamp(Math.atan2(vlat, Math.max(v, 4)), -0.2, 0.2) : 0;
        const kk = dt > 0 ? Math.min(1, dt * 5) : 1;
        Hh.lean += (tgtLean - Hh.lean) * kk;
        Hh.yaw += (tgtYaw - Hh.yaw) * kk;
        const pitch = Math.atan((elev(s - 1) - elev(s + 1)) / 2);
        Hh.mesh.position.set(p.x, f.e, -p.y);
        // 近い馬は細かい形、遠い馬は粗い形（カメラは前のコマの位置）
        const d2 = camera.position.distanceToSquared(Hh.mesh.position), near = d2 < 28 * 28;
        Hh.mesh.geometry = near ? hgeo : hgeoLo;
        Hh.mesh.rotation.set(sign * Hh.lean, yawOf(f) + sign * Hh.yaw, pitch);
        const ph = ((x / STRIDE + Hh.num * 0.137) % 1 + 1) % 1;
        const sp = moving ? clamp(v / 16, 0.35, 1.15) : 0;
        const push = st.push != null ? st.push : (moving ? clamp((v - 15.2) / 2, 0, 1) : 0);
        // ゆっくりのとき（発走前後・ゴールのあと）は常歩。4〜7m/s で襲歩へつなぐ
        const ww = !gateNow && v > 0.3 ? 1 - smooth((v - 4) / 3) : 0;
        const walk = ww > 0 ? { ph: ((x / WALK_STRIDE + Hh.num * 0.37) % 1 + 1) % 1, w: ww } : null;
        // 掛かり・耳（模擬の値。無ければ掛からず、耳は軽く前）。1コマで跳ばないよう寄せる
        const kf = dt > 0 ? Math.min(1, dt * 3) : 1;
        Hh.kakari += (clamp(st.kakari || 0, 0, 1) - Hh.kakari) * kf;
        Hh.ears += (clamp(st.ears != null ? st.ears : 0.3, -1, 1) - Hh.ears) * Math.min(1, kf * 2);
        poseHorse(Hh, ph, sp, push, t, Hh.seed, st.whip, st.pose, walk);
        // 骨入りの馬：角度を写し、蹄を地面へ・頭の馬具を頭へ（遠い馬ははじめの1回のあとは合わせ直さない）
        if (Hh.rig) {
          Hh.rig.ears = Hh.ears;
          HRG.pose(Hh.rig, Hh.bones);
          if (d2 < 120 * 120 || !Hh.rigSet) { Hh.mesh.updateMatrixWorld(true); HRG.settle(Hh.rig, Hh.bones, walk && walk.w >= 0.5 ? { ph: walk.ph, sp: 1, touch: WALK_TOUCH, duty: [W_DUTY, W_DUTY] } : { ph, sp, touch: Hh.lead > 0 ? TOUCH_L : TOUCH_R, duty: [F_DUTY, H_DUTY] }); Hh.rigSet = true; }
        }
        // 騎手（素材の形）：手作りの骨に合わせる。遠い馬（120m より先）は、はじめの1回のあとは合わせ直さない
        const J = Hh.jockey;
        if (J) {
          if (J.lo) { J.hi.visible = near; J.lo.visible = !near; }
          if (d2 < 120 * 120 || !J.posed) { Hh.mesh.updateMatrixWorld(true); poseJockey(J, Hh.bones); J.posed = true; }
        }
        // 蹴り上げ
        if (moving && dust) dust.emit(i, p, f, v, ph, dt, Hh.lead, d2);
        // 影
        tmpO.position.set(p.x, f.e + 0.03, -p.y);
        tmpO.rotation.set(0, yawOf(f), 0);
        tmpO.scale.set(2.7, 1, 1.0);
        tmpO.updateMatrix();
        shadows.setMatrixAt(i, tmpO.matrix);
        pos.push({ s, u, f, x, v });
        if (i === meI) {
          mark.visible = true;
          mark.position.set(p.x, f.e + 0.04, -p.y);
          mark.rotation.set(0, yawOf(f), 0);
          mark.scale.set(1.55, 1, 0.75);
        }
      }
      shadows.instanceMatrix.needsUpdate = true;
      // ゲート：発走前は閉じ、t が 0 を過ぎたら開く。少し経ったら片づける
      // 前触れ（view.tell＝灯がついてからの秒。負はまだ）：灯がつき、扉が小さく鳴る（0.3 秒）。灯は扉が開ききるころ消える
      gate.visible = t < 12;
      if (gate.visible) {
        const tl = view.tell;
        const rattle = gateNow && tl != null && tl >= 0 && tl < 0.3 ? 0.035 * Math.sin(tl * 70) * (1 - tl / 0.3) : 0;
        setDoors(gateNow ? rattle : clamp(t / 0.35, 0, 1) * 1.35);
        setLamps(tl != null && tl >= 0 && t < 0.4);
      }

      // カメラ
      if (camMode !== mem.camMode) { mem.cam = null; mem.camMode = camMode; }
      const me = pos[meI] || { s: D, u: LANE0, f: frame(D), x: 0, v: 0 };
      let cp, lk, base = 55;
      if (camMode === 'fixed' && view.fix) {
        // 止めたカメラ（止め絵用）：fix＝{ s, u, h（カメラ。ゴールまでの残り・内ラチから外へ・コースからの高さ）, ls, lu, lh（見る所）, fov }
        const x = view.fix, fa = frame(x.s), fb = frame(x.ls);
        cp = W3(fa, x.u, fa.e + x.h); lk = W3(fb, x.lu, fb.e + x.lh);
        hfovMin = x.fov || 60; base = x.fov ? x.fov * 0.6 : 40;
      } else if (camMode === 'gate') {
        const n = Math.max(nH, 2), uc = LANE0 + (n - 1) / 2 * GATE_P;
        const fb = frame(D + 17), ff = frame(D - 4);
        cp = W3(fb, uc, fb.e + 4.6); lk = W3(ff, uc, ff.e + 0.9);
        hfovMin = 70; base = 50;
      } else if (camMode === 'tv') {
        // 先頭集団（先頭から 24m 以内）が入るように、内馬場から横に追う。直線では斜め前から
        let lead = -1e9;
        for (const p of pos) lead = Math.max(lead, p.x);
        let qmin = 1e9, uSum = 0, cnt = 0;
        for (const p of pos) if (p.x >= lead - 24) { qmin = Math.min(qmin, p.x); uSum += p.u; cnt++; }
        const qmax = lead, qc = (qmin + qmax) / 2 - BODY, span = qmax - qmin + 9;
        const uc = cnt ? uSum / cnt : LANE0;
        const fc = frame(D - qc);
        const hf = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * VW / VH);
        const dist = clamp(span / 2 / Math.tan(hf / 2) * 1.15, 24, camFar);
        const home = !gateNow && (D - lead) < tr.straight + 30 && (D - lead) > -40 && fc.corner === 0;
        // 坂：先頭の 60m 先から後ろの馬の 20m 後ろまでの勾配が 0.8% を超えたら、カメラを少し低く・望遠にして、ラチと地面の傾きが見えるように
        const sF = D - lead - 60, sB = D - qmin + 20, grd = Math.abs(elev(sF) - elev(sB)) / Math.max(40, sB - sF);
        const hillT = gateNow ? 0 : smooth((grd - 0.008) / 0.008);
        mem.hill = mem.hill == null || jump ? hillT : mem.hill + (hillT - mem.hill) * (dt > 0 ? Math.min(1, dt * 0.8) : 1);
        const hk = mem.hill;
        if (home) {
          const d2 = dist * 1.25, fa = frame(D - qc - d2 * (0.55 + 0.25 * hk));
          cp = W3(fa, uc - d2 * (0.8 - 0.2 * hk), fa.e + (4 + d2 * 0.1) * (1 - 0.35 * hk));
        } else {
          cp = W3(fc, uc - dist, fc.e + (5 + dist * 0.14) * (1 - 0.35 * hk));
        }
        lk = W3(fc, uc, fc.e + 1.2);
        cp.y = Math.max(cp.y, ground(cp.x, -cp.z) + 2.5); // 内馬場の高い所に埋まらないように
        hfovMin = 50 - 6 * hk; base = 34 - 4 * hk;
      } else {
        // 騎乗：自分の馬の少し後ろ・上から。進路を変えると少し遅れてついてくる
        if (mem.camU == null || mem.cam == null) mem.camU = me.u;
        mem.camU += (me.u - mem.camU) * (dt > 0 ? Math.min(1, dt * 2.6) : 1);
        const qMe = me.x - BODY;
        const camQ = qMe - 6.4, fc = frame(D - camQ), fl = frame(D - (qMe + 16));
        const bob = me.v > 1.5 && !gateNow ? Math.sin(((me.x / STRIDE) % 1) * TAU) * 0.05 : 0;
        const camH = gate.visible ? 2.55 + 0.65 * smooth((camQ - 1) / 14) : 3.2; // ゲートの梁の下をくぐる
        cp = W3(fc, mem.camU, fc.e + camH + bob);
        // 見る高さは足元の高さに寄せる（上り坂は前の地面がせり上がって、下り坂は落ちて見える）
        lk = W3(fl, mem.camU * 0.55 + me.u * 0.45, fl.e * 0.4 + fc.e * 0.6 + 1.0);
        hfovMin = 68; base = 50;
      }
      // カメラの回転：見ている中心（騎乗なら自分の馬）のまわりを回り込む
      if (orbit && camMode !== 'gate' && (Math.abs(orbit.yaw || 0) > 1e-3 || Math.abs(orbit.pitch || 0) > 1e-3 || Math.abs((orbit.zoom || 1) - 1) > 1e-3)) {
        const fm = frame(D - (me.x - BODY));
        const piv = camMode === 'ride' ? W3(fm, me.u, fm.e + 1.5) : lk.clone();
        const off = cp.clone().sub(piv);
        const flat = Math.hypot(off.x, off.z) * (orbit.zoom || 1);
        const ang0 = Math.atan2(off.x, off.z) + (orbit.yaw || 0);
        const el0 = Math.atan2(off.y, Math.hypot(off.x, off.z));
        const el = clamp(el0 + (orbit.pitch || 0), -0.05, 1.35);
        const r = Math.hypot(flat, off.y * (orbit.zoom || 1));
        cp = new THREE.Vector3(piv.x + Math.sin(ang0) * Math.cos(el) * r, Math.max(piv.y - 1.2, piv.y + Math.sin(el) * r), piv.z + Math.cos(ang0) * Math.cos(el) * r);
        // 回り込むほど、自分の馬を見る
        const w = clamp(Math.abs(orbit.yaw || 0) / 0.7 + Math.abs(orbit.pitch || 0) / 0.8, 0, 1);
        lk = lk.clone().lerp(piv, w);
      }
      const sk = orbit && orbit.shake; // 手ごたえの揺れ（js/ui/ride.js が作る。小さく、なめらかに減る）
      setFov(base, sk && sk.fov);
      if (!mem.cam || camMode === 'ride') {
        mem.cam = { p: cp.clone(), l: lk.clone() };
      } else {
        const k = dt > 0 ? 1 - Math.exp(-dt * 2.2) : 0;
        mem.cam.p.lerp(cp, k); mem.cam.l.lerp(lk, Math.min(1, k * 1.6));
      }
      camera.position.copy(mem.cam.p);
      camera.lookAt(mem.cam.l);
      // 騎乗のカメラ：進路を変えている間は、動く向きへ少し傾ける（遅れてついてくるカメラとの差から）
      if (camMode === 'ride' && !gateNow) {
        const fq = frame(D - (me.x - BODY)), off = W3(fq, me.u, 0).sub(W3(fq, mem.camU, 0));
        vtmp.set(1, 0, 0).applyQuaternion(camera.quaternion);
        const side = off.dot(vtmp);
        mem.roll = (mem.roll || 0) + (clamp(-side * 0.03, -0.035, 0.035) - (mem.roll || 0)) * (dt > 0 ? Math.min(1, dt * 6) : 1);
        camera.rotateZ(mem.roll);
      }
      if (sk) { camera.translateX(sk.x || 0); camera.translateY(sk.y || 0); if (sk.roll) camera.rotateZ(sk.roll); }
      sky.position.copy(camera.position);
      // 太陽の影：見ている所（騎乗は自分の馬、中継は見ている中心）のまわりだけ。影の升目にそろえて、動いてもちらつかないように
      if (shadowOn) {
        const box = camMode === 'ride' ? 30 : camMode === 'gate' ? 24 : 58;
        if (box !== shadowBox) {
          shadowBox = box;
          const sc = sun.shadow.camera; sc.left = -box; sc.right = box; sc.top = box; sc.bottom = -box; sc.updateProjectionMatrix();
        }
        const fc = camMode === 'ride' ? W3(me.f, me.u, me.f.e + 1) : mem.cam.l;
        const tx = 2 * box / sun.shadow.mapSize.x;
        const cx = Math.round(fc.x / tx) * tx, cz = Math.round(fc.z / tx) * tx;
        sun.target.position.set(cx, fc.y, cz);
        sun.position.set(cx + sunDir.x * 150, fc.y + sunDir.y * 150, cz + sunDir.z * 150);
        sun.target.updateMatrixWorld();
      }
      if (dust) dust.update(dt, VH * renderer.getPixelRatio() / 2 / Math.tan(camera.fov * Math.PI / 360));
      renderer.render(scene, camera);
      watchPerf();
      // 画面に出た馬の頭の上の位置
      const out = [];
      camera.updateMatrixWorld();
      for (let i = 0; i < nH; i++) {
        const m = H[i].mesh;
        vtmp.set(m.position.x, m.position.y + 2.45, m.position.z);
        const z = vtmp.distanceTo(camera.position);
        vtmp.project(camera);
        if (vtmp.z > 1 || vtmp.x < -1.2 || vtmp.x > 1.2 || vtmp.y < -1.2 || vtmp.y > 1.2) continue;
        const k = VH / 2 / Math.tan(camera.fov * Math.PI / 360) / z;
        out.push({ i, sx: (vtmp.x + 1) / 2 * VW, sy: (1 - vtmp.y) / 2 * VH, k, z });
      }
      return { horses: out };
    }

    // 重さの見張り：60コマのうち 6 割以上が 24ms（約 42fps）より遅ければ、影 → 画素の細かさの順に落とす（目安は PC の中くらいの GPU で 60fps）
    const perf = { last: 0, n: 0, slow: 0, level: 0, dpr: 1, cap: mobile ? 1.25 : 1.5 };
    function watchPerf() {
      if (typeof performance === 'undefined') return;
      const now = performance.now(), d = perf.last ? now - perf.last : 0;
      perf.last = now;
      if (!(d > 0) || d > 250) return; // 止まっていた（タブの切り替え・一時停止）
      perf.n++; if (d > 24) perf.slow++;
      if (perf.n < 60) return;
      if (perf.slow >= 36 && perf.level < 2) {
        perf.level++;
        if (perf.level === 1 && shadowOn && sun.castShadow) { sun.castShadow = false; renderer.shadowMap.enabled = false; }
        else { perf.cap = 1; resize(VW, VH, perf.dpr); if (perf.level === 1) perf.level = 2; }
      }
      perf.n = 0; perf.slow = 0;
    }

    function resize(w, h, dpr) {
      VW = Math.max(1, w | 0); VH = Math.max(1, h | 0);
      perf.dpr = dpr || 1;
      renderer.setPixelRatio(Math.min(dpr || 1, perf.cap));
      renderer.setSize(VW, VH, false);
      camera.aspect = VW / VH;
      camera.updateProjectionMatrix();
    }
    resize(canvas.clientWidth || canvas.width || 960, canvas.clientHeight || canvas.height || 540, 1);

    function dispose() {
      for (const g of owned.geos) g.dispose();
      for (const m of owned.mats) m.dispose();
      for (const t of owned.texs) t.dispose();
      for (const h of H) if (h.mesh.skeleton && h.mesh.skeleton.dispose) h.mesh.skeleton.dispose();
      if (scene.environment) scene.environment = null;
      scene.clear ? scene.clear() : null;
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
    }
    const info = () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, photo, jockey: useJockey, shadow: shadowOn && sun.castShadow, dust: !!dust, level: perf.level, crowd: crowdN, horse: rigged ? 'rigged' : 'handmade' });

    return { render, resize, dispose, info, renderer, scene, camera };
  };

  // ---- 肖像：3D の馬（毛色・白徴・馬具つき、鞍なし）をパドックで横から描いた止め絵 ----
  // R3.portrait(canvas, horse) → 描けたら true（素材の絵と WebGL があるときだけ。無ければ false で、呼んだ側が今の 2D の絵を描く）
  // 描き手（WebGL）は1つを使い回し、描いた絵は覚えておく。小さな絵（幅 320 まで）は白徴を省いて、同じ毛色・馬具の馬で使い回す
  const PT = { r: null, cache: new Map(), fail: false };
  function portraitKit() {
    if (PT.r || PT.fail) return PT.r;
    try {
      const cv = document.createElement('canvas');
      const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, preserveDrawingBuffer: true });
      LIN = true;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const scene = new THREE.Scene();
      const look = lookOf('芝', '良'), sky = IMG[look.sky], fogCol = horizonColor(look.sky, sky);
      scene.fog = new THREE.FogExp2(new THREE.Color(fogCol), 0.004);
      // 空
      const sg = new THREE.SphereGeometry(400, 48, 24), P = sg.attributes.position, UV = sg.attributes.uv;
      for (let i = 0; i < P.count; i++) { const r = Math.hypot(P.getX(i), P.getY(i), P.getZ(i)) || 1; UV.setXY(i, 1 - UV.getX(i) + 0.35, skyV(P.getY(i) / r)); }
      const st = new THREE.Texture(sky); st.wrapS = THREE.RepeatWrapping; st.encoding = THREE.sRGBEncoding; st.needsUpdate = true;
      scene.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: st, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false })));
      // 映り込み
      const ec = canvasOf(256, 128), eg = ec.getContext('2d'), ch = Math.round(128 * SKY_CROP);
      eg.drawImage(sky, 0, 0, 256, ch); eg.fillStyle = '#5f7a44'; eg.fillRect(0, ch, 256, 128 - ch);
      const et = new THREE.CanvasTexture(ec); et.mapping = THREE.EquirectangularReflectionMapping; et.encoding = THREE.sRGBEncoding;
      const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(et).texture; pm.dispose(); et.dispose();
      // 光
      // 日は頭の側の斜め上から当て、体の丸み（肩・尻の張り）に陰を付ける
      scene.add(new THREE.HemisphereLight(lin('#dfeaff'), lin('#6b7a52'), 0.4));
      const sun = new THREE.DirectionalLight(lin('#fff4e2'), 2.7);
      sun.position.set(5.5, 6.5, 3.5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 30 }); sun.shadow.camera.updateProjectionMatrix();
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
      scene.add(sun);
      // パドックの芝・柵・木
      const gt = imgTex('grass_col', true, 8); gt.repeat.set(1 / 3, 1 / 3);
      const gg = new THREE.CircleGeometry(120, 48); gg.rotateX(-Math.PI / 2);
      const uvg = gg.attributes.uv, pg = gg.attributes.position;
      for (let i = 0; i < uvg.count; i++) uvg.setXY(i, pg.getX(i), pg.getZ(i));
      const ground = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ map: gt, color: lin('#c8dcb4') }));
      ground.receiveShadow = true; scene.add(ground);
      const rail = new Builder();
      for (const z of [-7]) {
        for (const y of [0.55, 1.05]) rail.box(0, y, z, 80, 0.08, 0.06, 0);
        for (let x = -40; x <= 40; x += 2.5) rail.box(x, 0.55, z, 0.1, 1.1, 0.1, 0);
      }
      scene.add(new THREE.Mesh(rail.build(), new THREE.MeshStandardMaterial({ color: lin('#f4f2ec'), roughness: 0.5 })));
      if (imgOk('tree')) {
        const tb = new Builder();
        for (let k = 0; k < 9; k++) {
          const x = -36 + k * 9 + hash01(k, 3) * 4, z = -26 - hash01(k, 4) * 10, sc = 2.2 + hash01(k, 5) * 0.8, hw = 2.565 * sc, u0 = hash01(k, 6) < 0.5 ? 0 : 0.5;
          tb.quad(V3(x - hw, -0.07 * sc, z), V3(x + hw, -0.07 * sc, z), V3(x + hw, 5.06 * sc, z), V3(x - hw, 5.06 * sc, z), { uvs: [[u0 + 0.002, 0], [u0 + 0.498, 0], [u0 + 0.498, 1], [u0 + 0.002, 1]] });
        }
        scene.add(new THREE.Mesh(tb.build(), new THREE.MeshBasicMaterial({ map: imgTex('tree', false, 4), alphaTest: 0.45, side: THREE.DoubleSide, color: lin('#c6d6b4') })));
      }
      const camera = new THREE.PerspectiveCamera(26, 2, 0.1, 900);
      PT.r = { renderer, scene, camera, cv, geo: horseGeometry(1, { bare: true }), geoTack: horseGeometry(1, { bare: true, tack: true, noBridle: true }), nor: texOf(HORSE_NOR || (HORSE_NOR = horseNormalCanvas(512)), false, 8, true) };
    } catch (e) { PT.fail = true; PT.r = null; }
    return PT.r;
  }
  function portraitAge(h) {
    if (h.age != null) return h.age;
    try { if (h.born != null && HS.World && HS.World.wIdx && HS.Horse && HS.Horse.ageAt) return HS.Horse.ageAt(h, HS.World.wIdx()); } catch (e) { /* 分からなければ */ }
    return ageOf(h);
  }
  R3.portrait = function (canvas, horse, view) {
    if (!canvas || !horse || typeof document === 'undefined' || !R3.supported()) return false;
    if (!imgOk('grass_col') || !imgOk('sky_clear')) return false;
    const w = canvas.width | 0, hgt = canvas.height | 0;
    if (w < 8 || hgt < 8) return false;
    const small = w <= 320;
    const age = portraitAge(horse), gear = gearOf(horse);
    const coat = horse.coat || '鹿毛';
    const HRG = HS.HorseRigged, rigged = !!(HRG && HRG.use());
    const key = [w, hgt, coat, coat === '芦毛' ? Math.min(12, age || 0) : '', small ? '' : (horse.name || horse.id || ''), JSON.stringify(gear), rigged ? 'r' : 'h', view ? JSON.stringify(view) : ''].join('|');
    let img = PT.cache.get(key);
    if (!img) {
      const K = portraitKit();
      if (!K) return false;
      const { renderer, scene, camera } = K;
      const sc = small ? 2 : 1;  // 小さな絵は 2 倍で描いて縮める
      renderer.setPixelRatio(1);
      renderer.setSize(w * sc, hgt * sc, false);
      LIN = true;
      const h = { coat, age, gear, name: horse.name || horse.id || '', noMarks: small };
      const tex = texOf(paintHorse(h, small ? 256 : 1024), false, 8);
      const L = coatLook(coat, age), gl = L.gloss || 0;
      // 毛は「しっとり」：光は少しだけ乗る（持ち主の指摘「つやつやしすぎ」）
      const mat = new THREE.MeshStandardMaterial({ map: tex, normalMap: K.nor, skinning: true, roughness: 0.78 - 0.08 * gl, metalness: 0, envMapIntensity: 0.6 });
      const mesh = new THREE.SkinnedMesh(rigged ? K.geoTack : K.geo, mat);
      const bones = horseBones();
      mesh.add(bones[0]); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones));
      for (const [k, bi] of Object.entries(GEAR)) if (!gear[k]) bones[bi].scale.set(0, 0, 0);
      let rig = null;
      if (rigged) { try { rig = HRG.make(h, bones); } catch (e) { rig = null; } }
      // view.walk＝常歩の位相（パドックの歩きの確かめ用）、view.t＝立ち姿の時刻
      const vw = view && view.walk != null ? { ph: view.walk, w: 1 } : null;
      poseHorse({ bones, lead: 1, kakari: view && view.kakari || 0 }, 0, 0, 0, view && view.t != null ? view.t : 1.3, hash01(strHash(h.name), 3), null, null, vw);
      if (!vw) { bones[2].rotation.z += 0.06; bones[4].rotation.z -= 0.05; } // 首を少し上げて前を見る
      if (rig) { rig.ears = view && view.ears != null ? view.ears : 0.3; HRG.pose(rig, bones); mesh.updateMatrixWorld(true); HRG.settle(rig, bones, vw ? { ph: vw.ph, sp: 1, touch: WALK_TOUCH, duty: [W_DUTY, W_DUTY] } : { ph: 0, sp: 0 }); }
      mesh.castShadow = true;
      scene.add(mesh);
      // カメラ：馬の右から少し前寄り・少し下から。横長でも縦長でも馬全体が入る距離
      const asp = w / hgt;
      camera.aspect = asp; camera.fov = 24; camera.updateProjectionMatrix();
      const vf = Math.tan(camera.fov * Math.PI / 360), need = Math.max(2.55 / (2 * vf), 4.3 / (2 * vf * asp));
      const tgt = V3(0.1, small ? 1.18 : 1.12, 0), dir = V3(0.28, 0.06, 1).normalize();
      camera.position.copy(tgt).addScaledVector(dir, need * (small ? 0.9 : 1.05));
      // 寄りの絵（view：{ tgt, dir, dist, fov }。確かめ用）
      if (view) { camera.fov = view.fov || 24; camera.updateProjectionMatrix(); tgt.set(...view.tgt); camera.position.copy(tgt).addScaledVector(V3(...view.dir).normalize(), view.dist); }
      camera.lookAt(tgt);
      renderer.render(scene, camera);
      img = canvasOf(w, hgt);
      img.getContext('2d').drawImage(renderer.domElement, 0, 0, w, hgt);
      scene.remove(mesh); mat.dispose(); tex.dispose(); if (mesh.skeleton.dispose) mesh.skeleton.dispose(); if (rig) { rig.mat.dispose(); rig.hairMat.dispose(); rig.bridleMat.dispose(); }
      PT.cache.set(key, img);
      if (PT.cache.size > 160) PT.cache.delete(PT.cache.keys().next().value);
    }
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return true;
  };
})();
