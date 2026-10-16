// レースの3D：Three.js（lib/three.min.js、r128。グローバルの THREE）で、コース・馬・騎手を立体で描く
// 使い方：
//   const r3 = HS.Race3D.create(canvas, setup)  // setup = { D, surface, ground, course, track, horses:[{num,frame,cap,silks,coat,name,mine}] }
//   r3.render(view, cam, orbit)   // view = { t, horses:[{x,lane,v,push?,whip?（ムチを入れてからの秒）,pose?（ガッツポーズからの秒）}], me, phase:'gate'|'race'|'finish' }、cam = 'ride'|'tv'|'gate'
//   orbit = { yaw, pitch, zoom }（カメラの回転。yaw は左右の回り込み[rad]、pitch は上下[-0.3〜1.2]、zoom は距離の倍率）
//   r3.resize(w, h, dpr) / r3.dispose() / r3.info()
//   HS.Race3D.supported()  // WebGL が使えるか
//   setup.horses[i] には age（満年齢。芦毛の白さ）・gear（馬具。無ければ data/gear.js から名前で引く）も渡せる
//   render の戻り値：{ horses: [{ i, sx, sy, k, z }] }（画面に出た馬の頭の上の位置・1mあたりの画素・奥行き。名前の札などを重ねるとき用）
// 座標：コースの上から見た位置 (x, y)（js/core/track.js。y は上向き）を、3D では (X, Y, Z) = (x, 高さ, -y) にする
// 乱数は使わない（揺らぎは番号・位置から決まる値で出す）
// 重さ：馬1頭＝骨つきの形1つ（材質1つ・描く回数1回）。形は全頭で共有し（近く・遠くの2つ）、色・勝負服・ゼッケンは馬ごとの小さな絵（256×256）で変える。
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
      if (this.k) this.k.push(o.bone || 0, o.bone || 0, 0);
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
  // 三角形の数の目安（騎手・鞍・馬具を含む1頭）：近くの形 4,500 まで・遠くの形 2,500 まで（28m で切り替える）。
  //   16頭がみな近くにいても 7 万ほどで、スマホでも重くならない。形は全頭で共有し、馬ごとに違うのは小さな絵（256×256）だけ
  // 骨：0 根元、1 胴、2・3 首、4 頭、5〜7 尾、8〜11 左前・12〜15 右前（肩・肘・膝・球節）、16〜19 左後・20〜23 右後（股・後膝・飛節・球節）
  //     24 騎手の腰、25 上体、26 頭、27・28 左腕（上・下）、29・30 右腕、31 ムチ、32〜35 馬具（シャドーロール・ブリンカー・メンコ・チークピーシーズ）
  const FJ = [[0.60, 1.26], [0.47, 0.97], [0.485, 0.53], [0.495, 0.215]];   // 前脚の関節：肩・肘・膝・球節
  const HJ = [[-0.62, 1.36], [-0.56, 0.98], [-0.74, 0.57], [-0.705, 0.215]]; // 後脚の関節：股・後膝・飛節・球節
  const FZ = 0.15, HZ = 0.16;
  const HEAD0 = [1.12, 1.86], HEAD_L = 0.6;              // 頭：うなじから鼻先へ
  const HD = [0.62, -0.785], HU = [0.785, 0.62];        // 頭の向き（鼻先へ）と、顔の前の向き
  const GEAR0 = [1.3, 1.63];                            // 馬具の骨の付け根（頭の中。使わない馬具はここへ縮める）
  const GEAR = { shadowRoll: 32, blinkers: 33, hood: 34, cheekPieces: 35 };
  const BONES = (() => {
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

  // 胴の断面：[x, 背の高さ, 腹の高さ, 横の半幅, 上ほど細く]
  const BODY_T = [
    [0.87, 1.44, 1.12, 0.09, 0.1], [0.81, 1.54, 1.01, 0.17, 0.15], [0.71, 1.6, 0.94, 0.225, 0.22], [0.57, 1.64, 0.895, 0.255, 0.32],
    [0.41, 1.645, 0.875, 0.27, 0.36], [0.23, 1.6, 0.87, 0.285, 0.26], [0.03, 1.565, 0.885, 0.3, 0.15], [-0.17, 1.565, 0.92, 0.3, 0.1],
    [-0.35, 1.58, 0.975, 0.29, 0.06], [-0.53, 1.61, 1.035, 0.285, 0.05], [-0.69, 1.62, 1.08, 0.28, 0.08], [-0.83, 1.6, 1.12, 0.25, 0.12],
    [-0.94, 1.545, 1.16, 0.2, 0.15], [-1.01, 1.47, 1.21, 0.13, 0.2], [-1.045, 1.39, 1.27, 0.06, 0.2],
  ];
  // 首の断面：[たてがみの側の点 x, y, のどの側の点 x, y, 半幅, 骨a, 骨b, bの重み]
  const NECK_T = [
    [0.47, 1.6, 0.72, 1.05, 0.19, 1, 2, 0], [0.63, 1.655, 0.86, 1.18, 0.185, 1, 2, 0.55], [0.77, 1.72, 0.97, 1.36, 0.16, 2, 3, 0.1],
    [0.91, 1.8, 1.05, 1.53, 0.135, 2, 3, 0.6], [1.02, 1.875, 1.11, 1.66, 0.115, 3, 4, 0.15], [1.09, 1.925, 1.16, 1.76, 0.105, 3, 4, 0.7],
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
    [0.62, 1.34, 0.13, 0.085, 0, 0, 0], [0.58, 1.2, 0.15, 0.095, 0, 0, 0], [0.52, 1.07, 0.13, 0.09, 0, 1, 0.3], [0.48, 0.96, 0.11, 0.082, 0, 1, 0.75],
    [0.47, 0.86, 0.095, 0.075, 1, 1, 0], [0.474, 0.74, 0.075, 0.064, 1, 1, 0], [0.479, 0.62, 0.056, 0.054, 1, 1, 0], [0.483, 0.55, 0.06, 0.058, 1, 2, 0.35],
    [0.486, 0.5, 0.058, 0.055, 1, 2, 0.8], [0.488, 0.42, 0.048, 0.044, 2, 2, 0], [0.49, 0.31, 0.047, 0.04, 2, 2, 0], [0.493, 0.24, 0.054, 0.05, 2, 3, 0.4],
    [0.5, 0.19, 0.055, 0.05, 2, 3, 0.85], [0.52, 0.135, 0.044, 0.043, 3, 3, 0], [0.542, 0.085, 0.048, 0.048, 3, 3, 0], [0.556, 0.04, 0.058, 0.054, 3, 3, 0],
    [0.566, 0.004, 0.064, 0.058, 3, 3, 0],
  ];
  const HLEG_T = [
    [-0.66, 1.42, 0.22, 0.1, 0, 0, 0], [-0.64, 1.28, 0.26, 0.125, 0, 0, 0], [-0.61, 1.14, 0.25, 0.125, 0, 0, 0], [-0.6, 1.02, 0.2, 0.11, 0, 1, 0.4],
    [-0.62, 0.92, 0.14, 0.09, 0, 1, 0.85], [-0.66, 0.82, 0.105, 0.075, 1, 1, 0], [-0.7, 0.71, 0.08, 0.058, 1, 1, 0], [-0.73, 0.63, 0.07, 0.05, 1, 2, 0.2],
    [-0.745, 0.575, 0.072, 0.055, 1, 2, 0.5], [-0.74, 0.52, 0.06, 0.05, 1, 2, 0.85], [-0.73, 0.44, 0.05, 0.044, 2, 2, 0], [-0.718, 0.32, 0.048, 0.041, 2, 2, 0],
    [-0.708, 0.24, 0.055, 0.05, 2, 3, 0.4], [-0.7, 0.19, 0.055, 0.05, 2, 3, 0.85], [-0.682, 0.135, 0.045, 0.043, 3, 3, 0], [-0.662, 0.085, 0.048, 0.048, 3, 3, 0],
    [-0.648, 0.04, 0.057, 0.054, 3, 3, 0], [-0.638, 0.004, 0.062, 0.057, 3, 3, 0],
  ];
  // 尾（付け根から）：[x, y, 上下の半径, 横の半幅, 骨a, 骨b, bの重み]
  const TAIL_T = [
    [-0.98, 1.5, 0.055, 0.05, 5, 5, 0], [-1.06, 1.46, 0.05, 0.045, 5, 6, 0.3], [-1.16, 1.4, 0.055, 0.05, 5, 6, 0.8], [-1.28, 1.31, 0.065, 0.06, 6, 6, 0],
    [-1.4, 1.21, 0.07, 0.068, 6, 7, 0.5], [-1.52, 1.11, 0.068, 0.07, 7, 7, 0], [-1.64, 1.02, 0.055, 0.06, 7, 7, 0], [-1.74, 0.95, 0.03, 0.035, 7, 7, 0],
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

  function horseGeometry(q) {
    const hi = q > 0;
    const B = new Builder({ skin: true });
    const X = V3(1, 0, 0), Y = V3(0, 1, 0), Z = V3(0, 0, 1);
    const cell = k => { const uv = cellUV(CELL[k]); return () => uv; };
    const rig = b => [b, b, 0];
    const mBody = hi ? 16 : 10, mNeck = hi ? 12 : 8, mHead = hi ? 12 : 8, mLeg = hi ? 8 : 6, mTail = hi ? 8 : 5;

    // 胴
    loft(B, BODY_T.map(([x, top, bot, w, k]) => ell(V3(x, (top + bot) / 2, 0), Y, Z, (top - bot) / 2, w, mBody, k, 0.92)),
      BODY_T.map(() => rig(1)), (i, j, P) => sideUV(P), { cap0: true, cap1: true });
    // 首
    loft(B, NECK.map(s => ell(s.c, s.u, Z, s.h, s.w, mNeck, 0.28, 0.95)), NECK.map(s => s.sk), (i, j, P) => sideUV(P), { cap0: true, cap1: true });
    // 頭
    {
      const ts = hi ? [0, 0.08, 0.2, 0.32, 0.44, 0.58, 0.72, 0.85, 0.94, 1] : [0, 0.2, 0.44, 0.72, 0.9, 1];
      loft(B, ts.map(t => { const s = headSec(t); return ell(s.c, vHU(), Z, s.h, s.w, mHead, s.k, 0.9); }), ts.map(() => rig(4)),
        (i, j) => rUV(R_HEAD, ts[i], mth(j, mHead)), { cap0: true, cap1: true });
      // 耳・目・鼻の穴
      for (const sd of [-1, 1]) {
        const base = headPt(0.03, Math.PI - sd * 0.55, -0.02);
        const dir = vHU().multiplyScalar(0.75).addScaledVector(new THREE.Vector3(-HD[0], -HD[1], 0), 0.55).addScaledVector(Z, sd * 0.2).normalize();
        const g = new THREE.ConeGeometry(0.042, 0.17, hi ? 6 : 4);
        g.translate(0, 0.085, 0);
        const m = new THREE.Matrix4().compose(base, new THREE.Quaternion().setFromUnitVectors(Y, dir), V3(0.62, 1, 1));
        B.add(g, m, { uv: sideUV(base), bone: 4 });
        blob(B, headPt(0.21, Math.PI - sd * 1.0, -0.012), 0.027, 0.027, 0.027, hi ? 7 : 5, hi ? 5 : 4, { uv: cellUV(CELL.eye), bone: 4 });
        if (hi) blob(B, headPt(0.93, Math.PI - sd * 0.78, -0.014), 0.02, 0.026, 0.016, 5, 4, { uv: cellUV(CELL.dark), bone: 4 });
      }
      // 前髪
      const ft = [-0.02, 0.07, 0.15, 0.22];
      loft(B, ft.map((t, i) => { const s = headSec(Math.max(0, t)); const o = arc(s.c, vHU(), Z, s.h, s.w, s.k, 0.9, Math.PI - 0.38, Math.PI + 0.38, hi ? 4 : 3, 0.02 + (i ? 0 : 0.01)); const n = arc(s.c, vHU(), Z, s.h, s.w, s.k, 0.9, Math.PI + 0.38, Math.PI - 0.38, hi ? 4 : 3, 0.003); return o.concat(n); }),
        ft.map(() => rig(4)), (i, j) => rUV(R_HAIR, 0.1 + (j % 4) * 0.08, 1 - i / 3), { cap1: true });
    }
    // たてがみ（首の右側に寝る）
    {
      const n = hi ? 5 : 3;
      const rings = [], sk = [];
      for (let i = 1; i < NECK.length; i++) {
        const lo = Math.PI - 0.72 - 0.08 * hash01(i, 77);
        const o = [], inn = [];
        for (let j = 0; j < n; j++) { const th = Math.PI + 0.1 - (Math.PI + 0.1 - lo) * j / (n - 1); o.push(neckPt(i, th, 0.022 - 0.01 * j / (n - 1))); }
        for (let j = n - 1; j >= 0; j--) { const th = Math.PI + 0.1 - (Math.PI + 0.1 - lo) * j / (n - 1); inn.push(neckPt(i, th, 0.004)); }
        rings.push(o.concat(inn)); sk.push(NECK[i].sk);
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
    // 頭絡（鼻革・額革・頬革）と手綱
    {
      const ring2 = (t0, t1, off) => [t0, t1].map(t => { const s = headSec(t); return ell(s.c, vHU(), Z, s.h + off, s.w + off, mHead, s.k * s.w / (s.w + off), 0.9); });
      loft(B, ring2(0.6, 0.645, 0.008), [rig(4), rig(4)], cell('bridle'));
      loft(B, ring2(0.1, 0.13, 0.008), [rig(4), rig(4)], cell('bridle'));
      if (hi) for (const sd of [-1, 1]) {
        const pts = [0.04, 0.3, 0.56, 0.84].map(t => headPt(t, Math.PI - sd * 1.32, 0.006));
        tube(B, pts, 0.011, 3, pts.map(() => rig(4)), cell('bridle'));
      }
      for (const sd of [-1, 1]) {
        const a = headPt(0.86, Math.PI - sd * 1.75, 0.01), b = V3(0.86, 1.8, sd * 0.085), n = 5, pts = [];
        for (let i = 0; i < n; i++) pts.push(a.clone().lerp(b, i / (n - 1)).add(V3(0, 0.03 * Math.sin(i / (n - 1) * Math.PI), 0)));
        tube(B, pts, 0.008, hi ? 4 : 3, pts.map((p, i) => [4, sd < 0 ? 28 : 30, i / (n - 1)]), cell('bridle'));
      }
    }
    // 騎手：脚（白いズボン・黒い長靴。鐙に立つ）
    for (const sd of [-1, 1]) {
      const hip = V3(0.0, 1.87, sd * 0.1), knee = V3(0.4, 1.7, sd * 0.25), ankle = V3(0.24, 1.36, sd * 0.29);
      tube(B, [hip, hip.clone().lerp(knee, 0.5), knee], [0.068, 0.06, 0.048], hi ? 7 : 5, [[24, 24, 0], [24, 1, 0.5], [1, 1, 0]], cell('pants'), { cap0: true });
      blob(B, knee, 0.05, 0.05, 0.05, 6, 4, { uv: cellUV(CELL.pants), bone: 1 });
      tube(B, [knee, knee.clone().lerp(ankle, 0.3), ankle], [0.055, 0.052, 0.044], hi ? 7 : 5, [rig(1), rig(1), rig(1)], (i) => cellUV(i === 0 ? CELL.bootTop : CELL.boots), { cap1: true });
      B.box(0.29, 1.335, sd * 0.29, 0.17, 0.06, 0.075, 0, { uv: cellUV(CELL.boots), bone: 1 });
      // 鐙と鐙革
      limb(B, V3(0.14, 1.6, sd * 0.25), V3(0.27, 1.34, sd * 0.31), 0.008, 0.008, 3, { uv: cellUV(CELL.bridle), bone: 1 });
      B.box(0.29, 1.3, sd * 0.29, 0.1, 0.016, 0.1, 0, { uv: cellUV(CELL.goggle), bone: 1 });
    }
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
    // ムチ（右手。ふだんは肩の方へ寝かせる）
    {
      const a = V3(0.86, 1.81, 0.11), b = V3(0.36, 2.15, 0.27);
      limb(B, a, b, 0.014, 0.008, 4, { uv: cellUV(CELL.dark), bone: 31 });
      B.add(new THREE.BoxGeometry(0.06, 0.035, 0.008), new THREE.Matrix4().compose(b, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.6)), V3(1, 1, 1)), { uv: cellUV(CELL.dark), bone: 31 });
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
    g.boundingSphere.radius += 0.8; // 脚・首・尾が動いても切れないように
    return g;
  }

  // 馬ごとの絵：毛色（年齢で白くなる芦毛も）・白徴・帽子・勝負服・ゼッケン・馬具の色
  const DEF_LOOK = { body: '#7d4322', top: '#5c2f16', belly: '#8f5531', mane: '#16100c', tail: '#16100c', points: '#17110d', muzzle: '#3b2519', hoof: '#26211d', gloss: 0.5 };
  function coatLook(c, age) {
    const A = HS.Art;
    return A && A.coatLook ? A.coatLook(c, age) : DEF_LOOK;
  }
  function paintHorse(h) {
    const cv = canvasOf(256, 256), g = cv.getContext('2d');
    const L = coatLook(h.coat, h.age), mk = marksOf(h.name || String(h.num)), sk = h.silks || DEF_SILKS, gear = h.gear || {};
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
      const spot = (x, y, rr, col, a) => { const R = rr / (SY1 - SY0) * rh; const gg = g.createRadialGradient(px(x), py(y), 0, px(x), py(y), R); gg.addColorStop(0, col); gg.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gg; g.fillRect(px(x) - R, py(y) - R, R * 2, R * 2); g.globalAlpha = 1; };
      if (L.tan) { spot(-0.42, 1.08, 0.3, L.tan, 0.75); spot(0.38, 1.0, 0.22, L.tan, 0.6); spot(-0.7, 1.15, 0.2, L.tan, 0.35); }
      if (L.dapple > 0) for (let i = 0; i < 70; i++) {
        const x = -1.05 + hash01(i, 91) * 1.9, y = 0.95 + hash01(i, 92) * 0.68;
        spot(x, y, 0.045 + hash01(i, 93) * 0.04, L.dappleCol, L.dapple * (0.5 + hash01(i, 94) * 0.5));
      }
      if (L.roan > 0) { g.fillStyle = 'rgba(235,232,226,' + (0.25 * L.roan) + ')'; for (let i = 0; i < 900; i++) { const x = -1.0 + hash01(i, 95) * 1.8, y = 0.9 + hash01(i, 96) * 0.75; g.fillRect(px(x), py(y), 1, 1); } }
      // 肩・尻の筋肉の光り
      spot(0.5, 1.32, 0.2, 'rgba(255,255,255,0.5)', 0.08 + 0.1 * L.gloss); spot(-0.66, 1.42, 0.24, 'rgba(255,255,255,0.5)', 0.08 + 0.1 * L.gloss);
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
  const HOOF_OFF = [0.07, -0.215, 0];
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
  function poseHorse(H, ph, sp, push, t, seed, whip, pose) {
    const b = H.bones;
    const J = BONES;
    // 騎手の骨を元の位置へ
    b[24].position.set(J[24][1] - J[1][1], J[24][2] - J[1][2], 0);
    for (const i of [1, 2, 3, 4, 5, 6, 7, 24, 25, 26, 27, 28, 29, 30, 31]) b[i].rotation.set(0, 0, 0);
    let bob = 0, pitch = 0;
    if (sp <= 0) {
      b[1].position.y = 1.25;
      b[2].rotation.z = 0.04 * Math.sin(t * 1.1 + seed * 5);
      b[4].rotation.z = 0.06 * Math.sin(t * 0.7 + seed * 3);
      b[5].rotation.z = 0.75 + 0.05 * Math.sin(t * 1.3 + seed * 7); b[6].rotation.z = 0.25; b[7].rotation.z = 0.15;
      b[5].rotation.x = 0.05 * Math.sin(t * 0.9 + seed);
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
        for (let i = 0; i < 4; i++) b[b0 + i].rotation.z = k * cyc(K[i], phi);
      }
      bob = 0.02 * k * cyc(BOB, ph);
      pitch = 0.05 * k * cyc(PITCH, ph);
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
      b[1].position.y -= al * (ws > 0 ? wy / ws : 0) + (1 - al) * (lo - 0.05 * k);
      // 首：前脚が着く頃に下げ、後脚で押す頃に上げる。走るほど前へ伸ばす
      const nod = cyc(NOD, ph) * k;
      b[2].rotation.z = -0.14 * k + 0.09 * nod;
      b[3].rotation.z = -0.05 * k + 0.06 * nod;
      b[4].rotation.z = 0.12 * k - 0.1 * nod - pitch;
      // 尾：走ると後ろへ流れる
      b[5].rotation.z = 0.46 - 0.1 * k + 0.05 * Math.sin(ph * TAU * 2 + seed);
      b[6].rotation.z = 0.05 * Math.sin(ph * TAU + 1 + seed); b[7].rotation.z = 0.08 * Math.sin(ph * TAU + 2 + seed);
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

  // テスト用：馬の形（q＝1 近く・0 遠く）と骨の数
  R3.horseGeometry = q => horseGeometry(q);
  R3.BONES = BONES.length;
  R3.GEAR = GEAR;

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
    // 形は近く・遠くの2つを全頭で使い回す。馬ごとに違うのは絵（毛色・勝負服・ゼッケン）と、馬具の骨を見せるかだけ
    const hgeo = G(horseGeometry(1)), hgeoLo = G(horseGeometry(0));
    const H = [];
    for (let i = 0; i < nH; i++) {
      const h0 = horsesIn[i] || {};
      const h = Object.assign({}, h0, { age: ageOf(h0), gear: gearOf(h0) });
      const tex = T(texOf(paintHorse(h), false, aniso));
      const L = coatLook(h.coat, h.age);
      const mat = M(new THREE.MeshPhongMaterial({ map: tex, skinning: true, shininess: 18 + 30 * (L.gloss || 0), specular: new THREE.Color(0x111111).lerp(new THREE.Color(0x3a3a3a), L.gloss || 0) }));
      const mesh = new THREE.SkinnedMesh(hgeo, mat);
      const bones = BONES.map(() => new THREE.Bone());
      BONES.forEach(([par, x, y, z], k) => {
        if (par < 0) bones[k].position.set(x, y, z);
        else { const p = BONES[par]; bones[k].position.set(x - p[1], y - p[2], z - p[3]); bones[par].add(bones[k]); }
      });
      mesh.add(bones[0]);
      mesh.updateMatrixWorld(true);
      mesh.bind(new THREE.Skeleton(bones));
      // 着けていない馬具は骨を縮めて消す
      for (const [k, bi] of Object.entries(GEAR)) if (!h.gear[k]) bones[bi].scale.set(0, 0, 0);
      mesh.rotation.order = 'YXZ';
      scene.add(mesh);
      const seed = hash01(strHash(h.name || i), 3);
      H.push({ mesh, bones, num: h.num != null ? h.num : i + 1, seed, lead: seed < 0.5 ? 1 : -1, lean: 0, yaw: 0, lane: null });
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
        // 近い馬は細かい形、遠い馬は粗い形（カメラは前のコマの位置）
        Hh.mesh.geometry = camera.position.distanceToSquared(Hh.mesh.position) < 28 * 28 ? hgeo : hgeoLo;
        Hh.mesh.rotation.set(sign * Hh.lean, yawOf(f) + sign * Hh.yaw, pitch);
        const ph = ((x / STRIDE + Hh.num * 0.137) % 1 + 1) % 1;
        const sp = moving ? clamp(v / 16, 0.35, 1.15) : 0;
        const push = st.push != null ? st.push : (moving ? clamp((v - 15.2) / 2, 0, 1) : 0);
        poseHorse(Hh, ph, sp, push, t, Hh.seed, st.whip, st.pose);
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
