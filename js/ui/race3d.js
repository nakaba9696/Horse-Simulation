// レースの3D：Three.js（lib/three.min.js、r128。グローバルの THREE）で、コース・馬・騎手を立体で描く
// 使い方：
//   const r3 = HS.Race3D.create(canvas, setup)  // setup = { D, surface, ground, course, track, horses:[{num,frame,cap,silks,coat,name,mine}] }
//   r3.render(view, cam, orbit)   // view = { t, horses:[{x,lane,v,push?,whip?（ムチを入れてからの秒）}], me, phase:'gate'|'race'|'finish' }、cam = 'ride'|'tv'|'gate'
//   orbit = { yaw, pitch, zoom }（カメラの回転。yaw は左右の回り込み[rad]、pitch は上下[-0.3〜1.2]、zoom は距離の倍率）
//   r3.resize(w, h, dpr) / r3.dispose() / r3.info()
//   HS.Race3D.supported()  // WebGL が使えるか
//   render の戻り値：{ horses: [{ i, sx, sy, k, z }] }（画面に出た馬の頭の上の位置・1mあたりの画素・奥行き。名前の札などを重ねるとき用）
// 座標：コースの上から見た位置 (x, y)（js/core/track.js。y は上向き）を、3D では (X, Y, Z) = (x, 高さ, -y) にする
// 乱数は使わない（揺らぎは番号・位置から決まる値で出す）
// 重さ：馬1頭＝骨つきの形1つ（材質1つ・描く回数1回）。形は全頭で共有し、色・勝負服・ゼッケンは馬ごとの小さな絵（256×256）で変える。
//       景色は材質ごとに1つの形へまとめる。影は丸い影の板（まとめて1回）で代用し、影の計算はしない。
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
  function lookOf(surface, ground) {
    const dirt = surface === 'ダ';
    const wet = ({ '良': 0, '稍重': 1, '重': 2, '不良': 3 })[ground] || 0;
    const overcast = wet >= 2;
    return {
      dirt, wet, overcast,
      skyTop: overcast ? '#76838f' : wet === 1 ? '#4f88c6' : '#2f74cc',
      skyHor: overcast ? '#c3c9ce' : '#d2e6f2',
      cloud: overcast ? 'rgba(150,158,166,0.9)' : 'rgba(255,255,255,0.92)',
      mount: overcast ? '#8d989f' : '#7f9fba', mount2: overcast ? '#6f7f78' : '#5f8a70', woods: overcast ? '#3a553c' : '#2f5a34',
      sun: overcast ? 0.32 : 0.78, hemi: overcast ? 0.88 : 0.62,
      grass: overcast ? [58, 100, 50] : [64, 120, 52],
    };
  }
  function shade(rgb, k) { return `rgb(${Math.round(clamp(rgb[0] * k, 0, 255))},${Math.round(clamp(rgb[1] * k, 0, 255))},${Math.round(clamp(rgb[2] * k, 0, 255))})`; }
  function coatOf(c) {
    const A = HS.Art;
    return A && A.coat ? A.coat(c) : ['#8a4f24', '#5e3415', '#1a120d', '#1a120d'];
  }
  function marksOf(key) {
    if (HS.Art && HS.Art.marks && HS.U && HS.U.hashRng) return HS.Art.marks(key);
    return { blaze: 'none', socks: [false, false, false, false] };
  }
  function frameColor(fr) {
    const fc = HS.DATA && HS.DATA.frameColors;
    return fc ? fc[((fr || 1) - 1) % 8] : '#ffffff';
  }

  // ---- 絵（canvas）→ 貼る絵 ----
  function canvasOf(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function texOf(cv, repeat, aniso) {
    const t = new THREE.CanvasTexture(cv);
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = aniso || 1;
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
  // 観客席（列ごとの人の点）
  function crowdCanvas() {
    const c = canvasOf(256, 256), g = c.getContext('2d');
    g.fillStyle = '#6d6a72'; g.fillRect(0, 0, 256, 256);
    const cols = ['#c9b8a6', '#e8d6c0', '#3b3f52', '#8a6d5a', '#f2f2f2', '#c83a3a', '#3a6bc8', '#e0c040', '#2c2c30', '#9aa4b0'];
    for (let r = 0; r < 24; r++) {
      const y = r * (256 / 24);
      g.fillStyle = '#56535c'; g.fillRect(0, y + 8.5, 256, 2);
      for (let k = 0; k < 44; k++) {
        if (hash01(r * 64 + k, 71) < 0.12) continue;
        const x = k * (256 / 44) + hash01(r * 64 + k, 72) * 2;
        g.fillStyle = cols[Math.floor(hash01(r * 64 + k, 73) * cols.length)];
        g.fillRect(x, y + 2, 4, 6);
        g.fillStyle = '#e3c4a4'; g.fillRect(x + 1, y, 2, 2.5);
      }
    }
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
    const col = this.c ? new THREE.Color(o.color || '#ffffff') : null;
    for (let i = 0; i < P.count; i++) {
      V.fromBufferAttribute(P, i).applyMatrix4(m); this.p.push(V.x, V.y, V.z);
      if (N) { V.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); this.n.push(V.x, V.y, V.z); } else this.n.push(0, 1, 0);
      let a = 0, b = 0;
      if (o.uv) { a = o.uv[0]; b = o.uv[1]; }
      else if (T) {
        a = T.getX(i); b = T.getY(i);
        if (o.rect) { a = o.rect[0] + a * (o.rect[2] - o.rect[0]); b = o.rect[1] + b * (o.rect[3] - o.rect[1]); }
      }
      this.uv.push(a, b);
      if (col) this.c.push(col.r, col.g, col.b);
      if (this.k) this.k.push(o.bone || 0);
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
    const col = this.c ? new THREE.Color(o.color || '#ffffff') : null;
    for (let i = 0; i < 4; i++) {
      this.p.push(pts[i].x, pts[i].y, pts[i].z); this.n.push(n.x, n.y, n.z);
      const uv = o.uvs ? o.uvs[i] : (o.uv || [0, 0]);
      this.uv.push(uv[0], uv[1]);
      if (col) this.c.push(col.r, col.g, col.b);
      if (this.k) this.k.push(o.bone || 0);
    }
    this.ix.push(base, base + 1, base + 2, base, base + 2, base + 3);
    return this;
  };
  Builder.prototype.box = function (cx, cy, cz, sx, sy, sz, ry, o) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(cx, cy, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry || 0, 0)), new THREE.Vector3(1, 1, 1));
    return this.add(new THREE.BoxGeometry(sx, sy, sz), m, o);
  };
  Builder.prototype.build = function () {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.c) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.k) {
      const n = this.k.length, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = this.k[i]; sw[i * 4] = 1; }
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

  // ---- 馬と騎手の形（全頭で共有。骨1本ごとに固い部品をつける） ----
  // 骨：0 根元、1 胴、2 首、3 頭、4 尾、5/6 左前（上・下）、7/8 右前、9/10 左後、11/12 右後、13 騎手の上体、14 騎手の腕
  // 馬の向き：+X が前、+Y が上、+Z が右
  const BONES = [
    [-1, 0, 0, 0], [0, 0, 1.25, 0], [1, 0.62, 1.5, 0], [2, 1.02, 1.98, 0], [1, -0.86, 1.45, 0],
    [1, 0.5, 1.15, -0.14], [5, 0.52, 0.62, -0.14], [1, 0.5, 1.15, 0.14], [7, 0.52, 0.62, 0.14],
    [1, -0.54, 1.2, -0.16], [9, -0.68, 0.6, -0.16], [1, -0.54, 1.2, 0.16], [11, -0.68, 0.6, 0.16],
    [1, 0.0, 1.84, 0], [13, 0.42, 2.0, 0],
  ];
  // 馬ごとの絵（256×256）の割り付け：上の3段は 32px の色の升、その下に勝負服（128×128）とゼッケン（128×80）
  const CELL = { coat: 0, dark: 1, mane: 2, points: 3, sockFL: 4, sockFR: 5, sockHL: 6, sockHR: 7, hoof: 8, saddle: 9, pants: 10, boots: 11, skin: 12, cap: 13, sleeve: 14, blaze: 15, goggle: 16, white: 17, eye: 18 };
  const cellUV = i => [((i % 8) + 0.5) / 8, 1 - (Math.floor(i / 8) * 32 + 16) / 256];
  const SILK_RECT = [0, 1 - 224 / 256, 0.5, 1 - 96 / 256];
  const NUM_RECT = [0.5, 1 - 176 / 256, 1, 1 - 96 / 256];

  function horseGeometry() {
    const B = new Builder({ skin: true });
    const C = k => ({ uv: cellUV(CELL[k]) });
    const cb = (k, bone) => ({ uv: cellUV(CELL[k]), bone });
    // 胴（樽・胸・尻）
    blob(B, V3(-0.02, 1.25, 0), 0.7, 0.31, 0.27, 12, 8, cb('coat', 1));
    blob(B, V3(0.5, 1.31, 0), 0.34, 0.33, 0.25, 10, 7, cb('coat', 1), 0.2);
    blob(B, V3(-0.55, 1.31, 0), 0.38, 0.33, 0.31, 10, 7, cb('coat', 1), -0.1);
    // 鞍とゼッケン（番号は両脇。外から見て読めるように貼る）
    B.box(0.16, 1.585, 0, 0.44, 0.06, 0.36, 0, cb('saddle', 1));
    for (const sd of [-1, 1]) {
      const x0 = -0.14, x1 = 0.4, yt = 1.52, yb = 1.1;
      const top = sd * 0.24, bot = sd * 0.315;
      const [u0, v0, u1, v1] = NUM_RECT;
      const a = V3(x0, yb, bot), b = V3(x1, yb, bot), c = V3(x1, yt, top), d = V3(x0, yt, top);
      if (sd > 0) B.quad(a, b, c, d, { uvs: [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], bone: 1 });
      else B.quad(b, a, d, c, { uvs: [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], bone: 1 });
    }
    // 首・たてがみ
    limb(B, V3(0.52, 1.36, 0), V3(0.99, 1.95, 0), 0.25, 0.13, 8, cb('coat', 2), 0.72);
    {
      const d = V3(0.43, 0.54, 0).normalize(), n = V3(-d.y, d.x, 0);
      const c = V3(0.755, 1.655, 0).add(n.clone().multiplyScalar(0.165));
      const g = new THREE.BoxGeometry(0.66, 0.07, 0.05);
      const m = new THREE.Matrix4().compose(c, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.atan2(d.y, d.x))), V3(1, 1, 1));
      B.add(g, m, cb('mane', 2));
    }
    // 頭（うなじから鼻先へ）・頬・鼻・耳・目・流星
    limb(B, V3(1.0, 1.99, 0), V3(1.36, 1.57, 0), 0.115, 0.075, 8, cb('coat', 3), 0.72);
    blob(B, V3(1.07, 1.87, 0), 0.13, 0.12, 0.095, 8, 6, cb('coat', 3));
    blob(B, V3(1.36, 1.56, 0), 0.085, 0.075, 0.07, 7, 5, cb('dark', 3));
    for (const sd of [-1, 1]) {
      const g = new THREE.ConeGeometry(0.035, 0.15, 4);
      const m = new THREE.Matrix4().compose(V3(0.97, 2.1, sd * 0.055), new THREE.Quaternion().setFromEuler(new THREE.Euler(sd * 0.25, 0, 0.35)), V3(1, 1, 1));
      B.add(g, m, cb('coat', 3));
      blob(B, V3(1.11, 1.92, sd * 0.078), 0.022, 0.022, 0.02, 5, 4, cb('eye', 3));
    }
    {
      const d = V3(0.36, -0.42, 0).normalize(), n = V3(-d.y, d.x, 0);
      const c = V3(1.19, 1.77, 0).add(n.clone().multiplyScalar(0.085));
      const g = new THREE.BoxGeometry(0.4, 0.012, 0.045);
      const m = new THREE.Matrix4().compose(c, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.atan2(d.y, d.x))), V3(1, 1, 1));
      B.add(g, m, cb('blaze', 3));
    }
    // 尾
    limb(B, V3(-0.86, 1.47, 0), V3(-1.0, 1.24, 0), 0.05, 0.05, 5, cb('mane', 4));
    limb(B, V3(-1.0, 1.24, 0), V3(-1.12, 0.76, 0), 0.05, 0.085, 6, cb('mane', 4), 0.6);
    // 脚（前：肘から膝・膝から蹄。後：飛節まで太く）
    const legs = [[5, 6, -0.14, true, 'sockFL'], [7, 8, 0.14, true, 'sockFR'], [9, 10, -0.16, false, 'sockHL'], [11, 12, 0.16, false, 'sockHR']];
    for (const [bu, bl, z, front, sock] of legs) {
      if (front) {
        limb(B, V3(0.5, 1.2, z), V3(0.52, 0.62, z), 0.1, 0.06, 7, cb('coat', bu));
        blob(B, V3(0.52, 0.62, z), 0.058, 0.06, 0.055, 6, 4, cb('coat', bl));
        limb(B, V3(0.52, 0.62, z), V3(0.53, 0.27, z), 0.045, 0.04, 6, cb('points', bl));
        limb(B, V3(0.53, 0.27, z), V3(0.56, 0.08, z), 0.04, 0.045, 6, cb(sock, bl));
        limb(B, V3(0.565, 0.08, z), V3(0.57, 0.0, z), 0.055, 0.065, 6, cb('hoof', bl));
      } else {
        limb(B, V3(-0.52, 1.28, z), V3(-0.68, 0.6, z), 0.15, 0.07, 7, cb('coat', bu));
        blob(B, V3(-0.56, 1.06, z * 1.05), 0.17, 0.27, 0.12, 7, 5, cb('coat', bu), -0.25);
        blob(B, V3(-0.68, 0.6, z), 0.065, 0.065, 0.055, 6, 4, cb('coat', bl));
        limb(B, V3(-0.68, 0.6, z), V3(-0.62, 0.27, z), 0.05, 0.042, 6, cb('points', bl));
        limb(B, V3(-0.62, 0.27, z), V3(-0.585, 0.08, z), 0.042, 0.046, 6, cb(sock, bl));
        limb(B, V3(-0.58, 0.08, z), V3(-0.575, 0.0, z), 0.056, 0.066, 6, cb('hoof', bl));
      }
    }
    // 騎手：脚（白いズボン・黒い長靴。鐙に立つ形で胴につく）
    for (const sd of [-1, 1]) {
      limb(B, V3(0.02, 1.84, sd * 0.1), V3(0.36, 1.66, sd * 0.245), 0.085, 0.068, 6, cb('pants', 1));
      limb(B, V3(0.36, 1.66, sd * 0.245), V3(0.2, 1.37, sd * 0.27), 0.062, 0.05, 6, cb('boots', 1));
      B.box(0.24, 1.33, sd * 0.27, 0.16, 0.06, 0.07, 0, cb('boots', 1));
    }
    // 上体（勝負服）・尻・頭・帽子・ゴーグル
    blob(B, V3(-0.01, 1.81, 0), 0.11, 0.085, 0.13, 7, 5, cb('pants', 13));
    {
      const g = new THREE.BoxGeometry(0.52, 0.24, 0.32);
      const m = new THREE.Matrix4().compose(V3(0.25, 1.94, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.3)), V3(1, 1, 1));
      B.add(g, m, { rect: SILK_RECT, bone: 13 });
    }
    blob(B, V3(0.58, 2.1, 0), 0.1, 0.105, 0.095, 8, 6, cb('skin', 13));
    {
      const g = new THREE.SphereGeometry(0.118, 9, 6, 0, TAU, 0, Math.PI * 0.62);
      const m = new THREE.Matrix4().compose(V3(0.575, 2.11, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.55)), V3(1.05, 1, 1.02));
      B.add(g, m, cb('cap', 13));
      B.add(new THREE.BoxGeometry(0.11, 0.016, 0.16), new THREE.Matrix4().compose(V3(0.69, 2.165, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.25)), V3(1, 1, 1)), cb('cap', 13));
      B.box(0.67, 2.1, 0, 0.03, 0.045, 0.15, 0, cb('goggle', 13));
    }
    // 腕（袖）・手・手綱
    for (const sd of [-1, 1]) {
      limb(B, V3(0.42, 2.02, sd * 0.15), V3(0.6, 1.8, sd * 0.19), 0.056, 0.046, 6, cb('sleeve', 14));
      limb(B, V3(0.6, 1.8, sd * 0.19), V3(0.86, 1.72, sd * 0.09), 0.046, 0.04, 6, cb('sleeve', 14));
      blob(B, V3(0.88, 1.72, sd * 0.085), 0.045, 0.04, 0.04, 5, 4, cb('white', 14));
      limb(B, V3(0.9, 1.71, sd * 0.08), V3(1.3, 1.62, sd * 0.07), 0.009, 0.009, 3, cb('mane', 14));
    }
    const g = B.build();
    g.boundingSphere.radius += 0.6; // 脚が動いても切れないように
    return g;
  }

  // 馬ごとの絵：毛色・白徴・帽子・勝負服・ゼッケン
  function paintHorse(h) {
    const cv = canvasOf(256, 256), g = cv.getContext('2d');
    const C = coatOf(h.coat), mk = marksOf(h.name || String(h.num)), sk = h.silks || DEF_SILKS;
    const cell = (k, col) => { const i = CELL[k]; g.fillStyle = col; g.fillRect((i % 8) * 32, Math.floor(i / 8) * 32, 32, 32); };
    const sock = '#f2efe6';
    cell('coat', C[0]); cell('dark', C[1]); cell('mane', C[2]); cell('points', C[3]);
    cell('sockFL', mk.socks && mk.socks[0] ? sock : C[3]); cell('sockFR', mk.socks && mk.socks[1] ? sock : C[3]);
    cell('sockHL', mk.socks && mk.socks[2] ? sock : C[3]); cell('sockHR', mk.socks && mk.socks[3] ? sock : C[3]);
    cell('hoof', '#1e1b19'); cell('saddle', '#2a1a10'); cell('pants', '#f2f2f0'); cell('boots', '#161616');
    cell('skin', '#e3bf9c'); cell('cap', h.cap || frameColor(h.frame)); cell('sleeve', sk.sub || sk.base);
    cell('blaze', mk.blaze && mk.blaze !== 'none' ? '#f4f2ec' : C[0]); cell('goggle', '#20252b'); cell('white', '#f4f4f2'); cell('eye', '#0c0a08');
    // 勝負服（x 0〜128, y 96〜224）
    const bx = 0, by = 96, bw = 128, bh = 128;
    g.fillStyle = sk.base; g.fillRect(bx, by, bw, bh);
    g.fillStyle = sk.sub || '#ffffff';
    const p = sk.pattern;
    g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip(); g.beginPath();
    if (p === 'hoops') for (let i = 0; i < 4; i++) g.rect(bx, by + (i + 0.25) * bh / 4, bw, bh / 9);
    else if (p === 'stripes') for (let i = 0; i < 6; i++) g.rect(bx + (i + 0.25) * bw / 6, by, bw / 13, bh);
    else if (p === 'sash') { g.moveTo(bx + bw * 0.62, by); g.lineTo(bx + bw * 0.86, by); g.lineTo(bx + bw * 0.38, by + bh); g.lineTo(bx + bw * 0.14, by + bh); g.closePath(); }
    else if (p === 'cross') { const w = bw * 0.14; g.moveTo(bx, by); g.lineTo(bx + w, by); g.lineTo(bx + bw, by + bh); g.lineTo(bx + bw - w, by + bh); g.closePath(); g.moveTo(bx + bw, by); g.lineTo(bx + bw - w, by); g.lineTo(bx, by + bh); g.lineTo(bx + w, by + bh); g.closePath(); }
    else if (p === 'diamonds') for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) { const cx = bx + (i + 0.5) * bw / 4, cy = by + (j + 0.5) * bh / 4; g.moveTo(cx, cy - bh / 8); g.lineTo(cx + bw / 8, cy); g.lineTo(cx, cy + bh / 8); g.lineTo(cx - bw / 8, cy); g.closePath(); }
    else if (p === 'stars') for (let i = 0; i < 5; i++) { const cx = bx + (0.15 + ((i * 37) % 100) / 140) * bw, cy = by + (0.15 + ((i * 53) % 100) / 140) * bh, r = bw * 0.13; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; if (k) g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); }
    else if (p === 'halves') g.rect(bx + bw / 2, by, bw / 2, bh);
    else if (p === 'yoke') g.rect(bx, by, bw, bh * 0.38);
    g.fill(); g.restore();
    // ゼッケン（x 128〜256, y 96〜176）：白地に黒の番号
    g.fillStyle = '#f4f4f2'; g.fillRect(128, 96, 128, 80);
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 3; g.strokeRect(131.5, 99.5, 121, 73);
    g.fillStyle = '#111'; g.font = `bold 58px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(h.num != null ? h.num : ''), 192, 138);
    return cv;
  }

  // 馬の形を動かす。ph＝走りの位相 0〜1、sp＝走りの大きさ（0＝立つ）、push＝騎手の追い 0〜1
  const LEGS = [[5, 6, -0.35, true], [7, 8, -0.45, true], [9, 10, 0.0, false], [11, 12, -0.1, false]];
  function poseHorse(H, ph, sp, push, t, seed, whip) {
    const b = H.bones;
    if (sp <= 0) {
      b[1].position.y = 1.25; b[1].rotation.z = 0;
      b[2].rotation.z = 0.04 * Math.sin(t * 1.1 + seed * 5);
      b[3].rotation.z = 0.05 * Math.sin(t * 0.7 + seed * 3);
      b[4].rotation.z = 0.06 * Math.sin(t * 1.3 + seed * 7); b[4].rotation.x = 0.05 * Math.sin(t * 0.9 + seed);
      for (const [u, l] of LEGS) { b[u].rotation.z = 0; b[l].rotation.z = 0; }
      b[13].rotation.z = 0.03 * Math.sin(t * 0.8 + seed * 2); b[13].position.x = 0; b[14].rotation.z = 0;
      return;
    }
    const a = ph * TAU;
    b[1].position.y = 1.25 + sp * 0.06 * Math.cos(a - 0.6) - sp * 0.03;
    b[1].rotation.z = sp * 0.05 * Math.sin(a + 1.4);
    const nk = sp * 0.15 * Math.sin(a + 2.3);
    b[2].rotation.z = nk - sp * 0.12;
    b[3].rotation.z = -nk * 0.5 + sp * 0.1;
    b[4].rotation.z = -sp * 0.5 + 0.1 * Math.sin(a * 2 + seed);
    b[4].rotation.x = 0.06 * Math.sin(a + seed * 3);
    for (const [u, l, off, front] of LEGS) {
      const p = (ph + off) * TAU, s = Math.sin(p), c = Math.max(0, Math.cos(p));
      if (front) {
        b[u].rotation.z = sp * (0.12 + 0.62 * s);
        b[l].rotation.z = -sp * 1.75 * Math.pow(c, 1.4);
      } else {
        b[u].rotation.z = sp * (-0.08 + 0.55 * s);
        b[l].rotation.z = -sp * 1.05 * Math.pow(c, 1.3) + sp * 0.12;
      }
    }
    // 騎手：追うときは首の動きに合わせて上体と腕を前後に
    const k = clamp(push, 0, 1);
    b[13].rotation.z = -0.02 + k * 0.13 * Math.sin(a + 2.0) - sp * 0.02 * Math.sin(a);
    b[13].position.x = k * 0.06 * Math.sin(a + 2.0);
    b[14].rotation.z = k * 0.42 * Math.sin(a + 2.3) - k * 0.12;
    // ムチ：入れてから 0.5 秒、腕を大きく振り上げて振り下ろす
    if (whip != null && whip >= 0 && whip < 0.5) {
      const w = Math.sin(whip / 0.5 * Math.PI);
      b[14].rotation.z = -1.25 * w + 0.25 * (1 - w);
      b[13].rotation.z -= 0.1 * w;
    }
  }

  // ---- 本体 ----
  R3.create = function (canvas, setup) {
    setup = setup || {};
    const course = setup.course || {};
    const tr = setup.track || HS.Track.make(course.lap, course.straight, course.dir);
    const D = setup.D || 2000;
    const L = tr.L;
    const sign = tr.sign || (course.dir === '左' ? -1 : 1);
    const look = lookOf(setup.surface, setup.ground);
    const horsesIn = setup.horses || [];
    const nH = horsesIn.length;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setClearColor(new THREE.Color(look.skyHor));
    const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(new THREE.Color(look.skyHor), 260, 2400);
    const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.3, 7000);
    camera.rotation.order = 'YXZ';
    let VW = 960, VH = 540;

    // 片づけ用
    const owned = { geos: [], mats: [], texs: [] };
    const G = g => (owned.geos.push(g), g), M = m => (owned.mats.push(m), m), T = t => (owned.texs.push(t), t);
    const lambert = o => M(new THREE.MeshLambertMaterial(o));

    // 光
    scene.add(new THREE.HemisphereLight(0xffffff, 0x56664a, look.hemi));
    const sun = new THREE.DirectionalLight(0xfff6e8, look.sun);
    sun.position.set(-0.5, 1, 0.35);
    scene.add(sun);

    // ---- コースの形 ----
    const slopeH = ({ '急': 2.1, '中': 1.6, '小': 0.9, '平': 0 })[course.slope] || 0;
    const elev = s => {
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
    const W3 = (f, u, h, dq) => { const p = wpt(f, u, dq); return new THREE.Vector3(p.x, h, -p.y); };
    const yawOf = f => Math.atan2(f.fy, f.fx);
    // ゴール前の直線の範囲（ゴールからさかのぼった距離で [始まり, 終わり]）
    let hr0 = 0, hr1 = 0;
    while (hr1 < L / 2 && tr.at(hr1 + 5).corner === 0) hr1 += 5;
    while (hr0 > -L / 2 && tr.at(hr0 - 5).corner === 0) hr0 -= 5;

    const N = Math.max(160, Math.round(L / 5));
    const S = [];
    for (let i = 0; i <= N; i++) S.push(frame(i * L / N));

    // 帯（u0→u1、高さは坂の高さ×k0→k1）
    function ribbon(u0, u1, k0, k1, mat, ua, ub, period) {
      const n = S.length, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [];
      for (let i = 0; i < n; i++) {
        const f = S[i], p0 = wpt(f, u0), p1 = wpt(f, u1);
        pos.set([p0.x, f.e * k0, -p0.y, p1.x, f.e * k1, -p1.y], i * 6);
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
    const loopPts = u => { const out = []; for (let i = 0; i < N; i++) { const p = wpt(S[i], u); out.push(new THREE.Vector2(p.x, p.y)); } return out; };

    // ---- 馬場と周り ----
    const period = L / Math.max(1, Math.round(L / 16));
    const turfTex = T(texOf(turfCanvas(look.wet, look), true, aniso));
    const dirtTex = T(texOf(dirtCanvas(look.wet), true, aniso));
    const turfMat = lambert({ map: turfTex });
    const dirtMat = look.wet >= 2
      ? M(new THREE.MeshPhongMaterial({ map: dirtTex, specular: new THREE.Color(look.wet >= 3 ? 0x3a3a3a : 0x262626), shininess: 26 }))
      : lambert({ map: dirtTex });
    const grassTex = T(texOf(grassCanvas(look, 1), true, aniso));
    const grassMat = lambert({ map: grassTex });
    const W = TRACK_W;
    const mainMat = look.dirt ? dirtMat : turfMat;
    // もう一方のコース（芝の内のダート・ダートの外の芝）は、その競馬場にあるときだけ
    const cdat = HS.DATA && HS.DATA.courses && HS.DATA.courses[course.name];
    const hasOther = !cdat || !!(look.dirt ? cdat.turf : cdat.dirt);
    ribbon(-0.6, W + 0.4, 1, 1, mainMat, 0, 1, period);
    // 外側：ダートの日は外に芝コースが見える
    let uo = W + 0.4;
    if (look.dirt && hasOther) { ribbon(uo, uo + 3, 1, 1, grassMat, 0, 3 / 12, 12); ribbon(uo + 3, uo + 28, 1, 1, turfMat, 0, 1, period); uo += 28; }
    const standU = uo + 12;
    ribbon(uo, standU + 30, 1, 1, grassMat, 0, (standU + 30 - uo) / 12, 12);
    const outerEdge = standU + 56;
    ribbon(standU + 30, outerEdge, 1, 0, grassMat, 0, 26 / 12, 12);
    // 内側：芝の日は内にダートコースが見える
    let ui = -0.6;
    if (!look.dirt && hasOther) { ribbon(-4, ui, 1, 1, grassMat, 0, 3.4 / 12, 12); ribbon(-24, -4, 1, 1, dirtMat, 0, 1, period); ui = -24; }
    ribbon(ui - 6, ui, 1, 1, grassMat, 0, 0.5, 12);
    const innerEdge = ui - 20;
    ribbon(innerEdge, ui - 6, 0, 1, grassMat, 0, 14 / 12, 12);
    // 内馬場と外の地面（平らな面。帯とすき間なくつなぐ）
    function flatShape(shape, mat) {
      const g = G(new THREE.ShapeGeometry(shape));
      g.rotateX(-Math.PI / 2);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 12, uv.getY(i) / 12);
      const m = new THREE.Mesh(g, mat);
      scene.add(m);
      return m;
    }
    flatShape(new THREE.Shape(loopPts(innerEdge)), grassMat);
    {
      const R = 5000, sh = new THREE.Shape([new THREE.Vector2(-R, -R), new THREE.Vector2(R, -R), new THREE.Vector2(R, R), new THREE.Vector2(-R, R)]);
      sh.holes.push(new THREE.Path(loopPts(outerEdge)));
      const farTex = T(texOf(grassCanvas(look, 0.85), true, 1));
      flatShape(sh, lambert({ map: farTex }));
    }
    // 池（内馬場の中ほど）
    {
      const g = G(new THREE.CircleGeometry(1, 36));
      g.rotateX(-Math.PI / 2);
      const pond = new THREE.Mesh(g, M(new THREE.MeshPhongMaterial({ color: look.overcast ? 0x4e6670 : 0x3f7fae, specular: 0x667788, shininess: 60, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
      const rx = Math.max(20, tr.a * 0.28), rz = Math.max(14, (tr.r + innerEdge) * 0.42);
      pond.scale.set(rx, 1, rz);
      pond.position.set(-tr.a * 0.12 * sign, 0.02, 0);
      scene.add(pond);
    }

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
      const m = new THREE.Mesh(G(B.build()), lambert({ color: 0xf2f4f5, side: THREE.DoubleSide }));
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
    {
      const crowd = new Builder();
      const sa = Math.max(hr0, -160), sb = Math.min(hr1, 430);
      const u0 = standU, step = 25;
      for (let s0 = sa; s0 < sb - 1; s0 += step) {
        const s1 = Math.min(sb, s0 + step), f0 = frame(s0), f1 = frame(s1);
        const e0 = f0.e, e1 = f1.e;
        const P = (f, e, u, h) => W3(f, u, e + h);
        // 1階の壁・観客席（斜め）・上の窓・後ろの壁・屋根
        props.quad(P(f0, e0, u0, -2), P(f1, e1, u0, -2), P(f1, e1, u0, 2.6), P(f0, e0, u0, 2.6), { color: '#8f8c86' });
        props.quad(P(f0, e0, u0, 2.6), P(f1, e1, u0, 2.6), P(f1, e1, u0 + 1, 2.6), P(f0, e0, u0 + 1, 2.6), { color: '#bdb8ad' });
        crowd.quad(P(f0, e0, u0 + 1, 2.6), P(f1, e1, u0 + 1, 2.6), P(f1, e1, u0 + 22, 15), P(f0, e0, u0 + 22, 15), { uvs: [[0, 0], [1, 0], [1, 1], [0, 1]] });
        props.quad(P(f0, e0, u0 + 22, 15), P(f1, e1, u0 + 22, 15), P(f1, e1, u0 + 22, 19.5), P(f0, e0, u0 + 22, 19.5), { color: look.overcast ? '#4c6378' : '#4f7aa6' });
        props.quad(P(f0, e0, u0 + 24, -2), P(f1, e1, u0 + 24, -2), P(f1, e1, u0 + 24, 20), P(f0, e0, u0 + 24, 20), { color: '#d6d1c4' });
        props.quad(P(f0, e0, u0 - 3, 20.6), P(f1, e1, u0 - 3, 20.6), P(f1, e1, u0 + 24.5, 20.6), P(f0, e0, u0 + 24.5, 20.6), { color: '#eeece6' });
        props.quad(P(f0, e0, u0 - 3, 19.8), P(f1, e1, u0 - 3, 19.8), P(f1, e1, u0 - 3, 20.6), P(f0, e0, u0 - 3, 20.6), { color: '#f6f5f0' });
        props.quad(P(f0, e0, u0 - 3, 19.8), P(f1, e1, u0 - 3, 19.8), P(f1, e1, u0 + 24.5, 19.8), P(f0, e0, u0 + 24.5, 19.8), { color: '#7b7686' });
        // 柱
        const pc = W3(f0, u0 + 0.5, 0);
        props.box(pc.x, e0 + 11.2, pc.z, 0.5, 17.2, 0.5, yawOf(f0), { color: '#d6d1c4' });
      }
      // 両端の壁
      for (const s of [sa, sb]) {
        const f = frame(s), e = f.e;
        props.quad(W3(f, u0, e - 2), W3(f, u0 + 24, e - 2), W3(f, u0 + 24, e + 20), W3(f, u0, e + 20), { color: '#cfcabd' });
      }
      const ctex = T(texOf(crowdCanvas(), false, aniso));
      scene.add(new THREE.Mesh(G(crowd.build()), lambert({ map: ctex, side: THREE.DoubleSide })));
      // 大きな画面（内馬場、スタンドの向かい）
      const sm = (sa + sb) / 2, f = frame(sm), su = Math.min(innerEdge - 30, -tr.r * 1.05), c = W3(f, su, 0), yaw = yawOf(f);
      props.box(c.x, 10, c.z, 44, 14, 1.4, yaw, { color: '#1c2129' });
      const cf = W3(f, su + 0.75, 0);
      props.box(cf.x, 10.3, cf.z, 41, 11.5, 0.1, yaw, { color: look.overcast ? '#2a4258' : '#2c5070' });
      for (const dq of [-14, 14]) { const lg = W3(f, su, 0, dq); props.box(lg.x, 1.6, lg.z, 1, 3.2, 1, yaw, { color: '#555c66' }); }
    }
    // 木（外の向こう正面と、内馬場）。InstancedMesh で1回に描く
    {
      const B = new Builder({ color: true });
      B.add(new THREE.CylinderGeometry(0.22, 0.32, 3.2, 5, 1, true), new THREE.Matrix4().makeTranslation(0, 1.6, 0), { color: '#4a3523' });
      B.add(new THREE.IcosahedronGeometry(1, 0), new THREE.Matrix4().compose(V3(0, 5.2, 0), new THREE.Quaternion(), V3(2.8, 3.2, 2.8)), { color: look.overcast ? '#2f4f31' : '#2e6033' });
      B.add(new THREE.IcosahedronGeometry(1, 0), new THREE.Matrix4().compose(V3(0.5, 7.3, 0.3), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0.7, 0)), V3(1.9, 2.0, 1.9)), { color: look.overcast ? '#375a38' : '#3a7440' });
      const tg = G(B.build());
      const spots = [];
      const step = 26;
      for (let k = 0; k * step < L; k++) {
        const s = k * step, home = s < hr1 + 40 || s > L + hr0 - 40;
        const f = frame(s);
        if (!home) { const p = W3(f, outerEdge - 18 + hash01(k, 1) * 30, 0); spots.push([p.x, p.z, 0.8 + hash01(k, 2) * 0.6, k]); }
        const ut = innerEdge - 34 - hash01(k, 4) * 30;
        if (hash01(k, 3) < 0.55 && !home && -ut < tr.r - 6) { const p = W3(f, ut, 0); spots.push([p.x, p.z, 0.7 + hash01(k, 5) * 0.6, k + 1000]); }
      }
      const im = new THREE.InstancedMesh(tg, lambert({ vertexColors: true }), spots.length);
      const o = new THREE.Object3D();
      spots.forEach(([x, z, sc, id], i) => { o.position.set(x, 0, z); o.rotation.set(0, hash01(id, 9) * TAU, 0); o.scale.set(sc, sc * (0.85 + hash01(id, 8) * 0.4), sc); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }

    // ---- ゲート（スタート地点 x=0。発走前は全頭が収まる。t が 0 を過ぎたら扉が開く） ----
    const gate = new THREE.Group();
    let doors = null;
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
      gate.add(new THREE.Mesh(G(B.build()), lambert({ vertexColors: true })));
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
      scene.add(gate);
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
    const sky = new THREE.Mesh(G(new THREE.SphereGeometry(5000, 32, 16)), M(new THREE.MeshBasicMaterial({ map: T(texOf(skyCanvas(look), false, 1)), side: THREE.BackSide, fog: false, depthWrite: false })));
    sky.renderOrder = -10;
    scene.add(sky);
    function ring(R, hf, top, bot, seed) {
      const n = 160, pos = [], col = [], idx = [];
      const ct = new THREE.Color(top), cb = new THREE.Color(bot);
      for (let i = 0; i <= n; i++) {
        const a = i / n * TAU, h = hf(a);
        pos.push(Math.cos(a) * R, -4, Math.sin(a) * R, Math.cos(a) * R, h, Math.sin(a) * R);
        col.push(cb.r, cb.g, cb.b, ct.r, ct.g, ct.b);
        if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
      const g = G(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      const m = new THREE.Mesh(g, M(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide })));
      scene.add(m);
    }
    const haze = (c, k) => { const a = new THREE.Color(c), b = new THREE.Color(look.skyHor); return a.lerp(b, k); };
    ring(3600, a => 150 + 90 * Math.sin(3 * a + 1) + 60 * Math.sin(7 * a + 2.1) + 30 * Math.sin(13 * a + 0.4) + 16 * Math.sin(29 * a), haze(look.mount, 0.25), haze(look.mount, 0.75));
    ring(2700, a => 60 + 34 * Math.sin(5 * a + 0.3) + 22 * Math.sin(11 * a + 1.7) + 10 * Math.sin(23 * a + 0.9), haze(look.mount2, 0.2), haze(look.mount2, 0.6));
    ring(1500, a => 22 + 7 * Math.sin(37 * a) + 5 * Math.sin(61 * a + 1.3) + 4 * Math.sin(97 * a + 0.2), haze(look.woods, 0.18), haze(look.woods, 0.35));

    // ---- 馬 ----
    const hgeo = G(horseGeometry());
    const H = [];
    for (let i = 0; i < nH; i++) {
      const h = horsesIn[i] || {};
      const tex = T(texOf(paintHorse(h), false, aniso));
      const mat = M(new THREE.MeshLambertMaterial({ map: tex, skinning: true }));
      const mesh = new THREE.SkinnedMesh(hgeo, mat);
      const bones = BONES.map(() => new THREE.Bone());
      BONES.forEach(([par, x, y, z], k) => {
        if (par < 0) bones[k].position.set(x, y, z);
        else { const p = BONES[par]; bones[k].position.set(x - p[1], y - p[2], z - p[3]); bones[par].add(bones[k]); }
      });
      mesh.add(bones[0]);
      mesh.updateMatrixWorld(true);
      mesh.bind(new THREE.Skeleton(bones));
      mesh.rotation.order = 'YXZ';
      scene.add(mesh);
      H.push({ mesh, bones, num: h.num != null ? h.num : i + 1, seed: hash01(strHash(h.name || i), 3), lean: 0, yaw: 0, lane: null });
    }
    // 丸い影の板（まとめて1回）
    const shTexC = canvasOf(64, 64), sg = shTexC.getContext('2d');
    const rg = sg.createRadialGradient(32, 32, 2, 32, 32, 31);
    rg.addColorStop(0, 'rgba(0,0,0,0.55)'); rg.addColorStop(0.6, 'rgba(0,0,0,0.3)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64);
    const shGeo = G(new THREE.PlaneGeometry(1, 1)); shGeo.rotateX(-Math.PI / 2);
    const shadows = new THREE.InstancedMesh(shGeo, M(new THREE.MeshBasicMaterial({ map: T(texOf(shTexC, false, 1)), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })), Math.max(1, nH));
    shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    shadows.renderOrder = 1;
    scene.add(shadows);
    // 自分の馬の目印（黄色い輪）
    const ringGeo = G(new THREE.RingGeometry(0.95, 1.12, 32)); ringGeo.rotateX(-Math.PI / 2);
    const mark = new THREE.Mesh(ringGeo, M(new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 })));
    mark.renderOrder = 2;
    mark.visible = false;
    scene.add(mark);

    // ---- 1コマ ----
    const mem = { t: null, cam: null, camMode: null, camU: null };
    const tmpO = new THREE.Object3D();
    const vtmp = new THREE.Vector3();
    let hfovMin = 66;

    function setFov(base) {
      const asp = VW / VH;
      const need = 2 * Math.atan(Math.tan(hfovMin * Math.PI / 360) / asp) * 180 / Math.PI;
      const f = Math.max(base, Math.min(need, 80));
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
        Hh.mesh.rotation.set(sign * Hh.lean, yawOf(f) + sign * Hh.yaw, pitch);
        const ph = ((x / STRIDE + Hh.num * 0.137) % 1 + 1) % 1;
        const sp = moving ? clamp(v / 16, 0.35, 1.15) : 0;
        const push = st.push != null ? st.push : (moving ? clamp((v - 15.2) / 2, 0, 1) : 0);
        poseHorse(Hh, ph, sp, push, t, Hh.seed, st.whip);
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
      gate.visible = t < 12;
      if (gate.visible) setDoors(gateNow ? 0 : clamp(t / 0.35, 0, 1) * 1.35);

      // カメラ
      if (camMode !== mem.camMode) { mem.cam = null; mem.camMode = camMode; }
      const me = pos[meI] || { s: D, u: LANE0, f: frame(D), x: 0, v: 0 };
      let cp, lk, base = 55;
      if (camMode === 'gate') {
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
        const dist = clamp(span / 2 / Math.tan(hf / 2) * 1.15, 24, Math.max(30, Math.min(-innerEdge + 26, tr.r)));
        const home = !gateNow && (D - lead) < tr.straight + 30 && (D - lead) > -40 && fc.corner === 0;
        if (home) {
          const d2 = dist * 1.25, fa = frame(D - qc - d2 * 0.55);
          cp = W3(fa, uc - d2 * 0.8, fa.e + 4 + d2 * 0.1);
        } else {
          cp = W3(fc, uc - dist, fc.e + 5 + dist * 0.14);
        }
        lk = W3(fc, uc, fc.e + 1.2);
        hfovMin = 50; base = 34;
      } else {
        // 騎乗：自分の馬の少し後ろ・上から。進路を変えると少し遅れてついてくる
        if (mem.camU == null || mem.cam == null) mem.camU = me.u;
        mem.camU += (me.u - mem.camU) * (dt > 0 ? Math.min(1, dt * 2.6) : 1);
        const qMe = me.x - BODY;
        const camQ = qMe - 6.4, fc = frame(D - camQ), fl = frame(D - (qMe + 16));
        const bob = me.v > 1.5 && !gateNow ? Math.sin(((me.x / STRIDE) % 1) * TAU) * 0.05 : 0;
        const camH = gate.visible ? 2.55 + 0.65 * smooth((camQ - 1) / 14) : 3.2; // ゲートの梁の下をくぐる
        cp = W3(fc, mem.camU, fc.e + camH + bob);
        lk = W3(fl, mem.camU * 0.55 + me.u * 0.45, fl.e + 1.0);
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
      setFov(base);
      if (!mem.cam || camMode === 'ride') {
        mem.cam = { p: cp.clone(), l: lk.clone() };
      } else {
        const k = dt > 0 ? 1 - Math.exp(-dt * 2.2) : 0;
        mem.cam.p.lerp(cp, k); mem.cam.l.lerp(lk, Math.min(1, k * 1.6));
      }
      camera.position.copy(mem.cam.p);
      camera.lookAt(mem.cam.l);
      sky.position.copy(camera.position);
      renderer.render(scene, camera);
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

    function resize(w, h, dpr) {
      VW = Math.max(1, w | 0); VH = Math.max(1, h | 0);
      renderer.setPixelRatio(Math.min(dpr || 1, 1.5));
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
      scene.clear ? scene.clear() : null;
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
    }
    const info = () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles });

    return { render, resize, dispose, info, renderer, scene, camera };
  };
})();
