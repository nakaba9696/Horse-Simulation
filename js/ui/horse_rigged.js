// 骨入りの馬の素材（assets/horse_rigged.js。「Horse Rigged(Game Ready)」abhayexe・CC-BY-4.0）を、3D のレースと肖像で使う
// 使い方（js/ui/race3d.js から）：
//   HS.HorseRigged.use()            // 使えるか（素材が読めていて、設定が「素材の馬」）
//   const r = HS.HorseRigged.make(h, bones)  // h＝{coat, age, name, num}、bones＝手作りの馬の骨（race3d の horseBones()）。r.root を骨 1（胴）に付ける
//   HS.HorseRigged.pose(r, bones, gait)      // 手作りの骨の角度（poseHorse のあと）を素材の骨へ写す。gait＝{ ph, sp, lead }
//   HS.HorseRigged.settle(r, bones, gait)    // 蹄を地面へ合わせ（胴の骨を上下）、頭の馬具の骨（4）を素材の頭へ合わせる。手作りの骨の行列を更新してから呼ぶ
// しくみ：
//   形：読み込んだときに一度だけ、サラブレッドの比へ写し直す（脚を長く細く・脚の下の長い毛を消す・胴を浅く・首を細長く・頭を小さく）。
//       頂点と骨の付け根を同じ写し方で動かし、骨のはじめの姿勢を計り直す
//   動き：手作りの馬の骨（4拍子の襲歩）の角度を、横の軸のまわりの回転として素材の骨へ写す。胴（骨 1）に素材の馬ごと付ける
//   色：素材の絵は明るさの陰影だけ（tools/pack_horse.py）。毛色・脚先・白徴・連銭・たてがみは、写す前の位置から材質の中で塗る（js/ui/art.js の毛色の表）
//   鞍・ゼッケン・頭絡・手綱・馬具・騎手は手作りの形のまま（race3d の horseGeometry(…, { tack: true })）
// 乱数は使わない
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const HR = HS.HorseRigged = { state: 'none', err: null };
  const KEY = 'hs_horse_model';

  // ---- 設定（素材の馬 'rigged' ／ 手作りの馬 'handmade'）。この端末に覚える ----
  HR.DEFAULT = 'rigged';
  HR.model = function () {
    try { const v = globalThis.localStorage && localStorage.getItem(KEY); if (v === 'rigged' || v === 'handmade') return v; } catch (e) { /* 読めなければ既定 */ }
    return HR.DEFAULT;
  };
  HR.setModel = function (v) { try { localStorage.setItem(KEY, v); } catch (e) { /* 覚えられなくても動く */ } };
  HR.use = () => HR.model() === 'rigged' && HR.state === 'ok';

  // ---- 読み込み ----
  const P = { scene: null, mesh: null, bones: null, info: null };
  HR.preload = function () {
    if (HR.state !== 'none') return;
    const A = HS.ASSETS && HS.ASSETS.horse_rigged;
    if (!A || typeof THREE === 'undefined' || !THREE.GLTFLoader || !THREE.SkeletonUtils) return;
    HR.state = 'loading';
    try {
      const bin = atob(A.slice(A.indexOf(',') + 1)), buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      new THREE.GLTFLoader().parse(buf.buffer, '', g => {
        try { prepare(g); HR.state = 'ok'; } catch (e) { HR.err = e; HR.state = 'error'; }
      }, e => { HR.err = e; HR.state = 'error'; });
    } catch (e) { HR.err = e; HR.state = 'error'; }
  };
  HR.loading = () => HR.state === 'loading';

  // 骨の名前（素材の名前から空白と _ を除いて引く）
  const key = s => s.replace(/_\d+_\d+$/, '').replace(/[ _]/g, '');
  const BN = {
    neck: 'Bip01Neck', neck1: 'Bip01Neck1', head: 'Bip01Head', headNub: 'Bip01HeadNub',
    pony1: 'Bip01Ponytail1', pony1n: 'Bip01Ponytail1Nub', pony2: 'Bip01Ponytail2', pony2n: 'Bip01Ponytail2Nub',
    tail: 'Bip01Tail', tail1: 'Bip01Tail1', tail2: 'Bip01Tail2', tail3: 'Bip01Tail3',
    lCla: 'Bip01LClavicle', lUp: 'Bip01LUpperArm', lFo: 'Bip01LForearm', lHa: 'Bip01LHand', lFi: 'Bip01LFinger0', lFin: 'Bip01LFinger0Nub',
    rCla: 'Bip01RClavicle', rUp: 'Bip01RUpperArm', rFo: 'Bip01RForearm', rHa: 'Bip01RHand', rFi: 'Bip01RFinger0', rFin: 'Bip01RFinger0Nub',
    lTh: 'Bip01LThigh', lCa: 'Bip01LCalf', lHL: 'Bip01LHorseLink', lFt: 'Bip01LFoot', lTo: 'Bip01LToe0', lTon: 'Bip01LToe0Nub',
    rTh: 'Bip01RThigh', rCa: 'Bip01RCalf', rHL: 'Bip01RHorseLink', rFt: 'Bip01RFoot', rTo: 'Bip01RToe0', rTon: 'Bip01RToe0Nub',
  };
  HR.BN = BN; HR.keyOf = key; // テスト用
  // 手作りの骨 → 素材の骨（同じ横の軸のまわりに回す）
  // 尾は手作りの馬の立ち姿の角度を 0 とみなす（素材の尾ははじめから垂れている）
  const REF = { 5: 0.75, 6: 0.25, 7: 0.15 };
  const HIP_K = 0.6;
  const RETARGET = [
    [2, 'neck'], [3, 'neck1'], [4, 'head'], [5, 'tail'], [6, 'tail1'], [7, 'tail2'],
    [8, 'lCla'], [9, 'lUp'], [10, 'lFo'], [11, 'lHa'], [12, 'rCla'], [13, 'rUp'], [14, 'rFo'], [15, 'rHa'],
    [16, 'lTh'], [17, 'lCa'], [18, 'lHL'], [19, 'lFt'], [20, 'rTh'], [21, 'rCa'], [22, 'rHL'], [23, 'rFt'],
  ];
  // 脚の最後の骨（蹄の底を計る）：手作りの脚の始めの骨の番号 → 素材の骨
  const HOOF = { 8: 'lHa', 12: 'rHa', 16: 'lFt', 20: 'rFt' };

  // ---- 比を写す（素材の座標：+Z が前、+X が馬の左、+Y が上。地面が y=0） ----
  const LEG_UP = { lUp: 0.84, rUp: 0.84, lCa: 0.84, rCa: 0.84 };                       // 上腕・脛：細く
  const LEG_LO = { lFo: 0.7, rFo: 0.7, lHa: 0.7, rHa: 0.7, lFi: 0.75, rFi: 0.75, lFin: 0.75, rFin: 0.75,   // 膝・飛節から下：細く（長い毛を消す）
    lHL: 0.72, rHL: 0.72, lFt: 0.7, rFt: 0.7, lTo: 0.75, rTo: 0.75, lTon: 0.75, rTon: 0.75 };
  const NECK = { neck: 1, neck1: 1, pony1: 1, pony1n: 1 }, HEAD = { head: 1, headNub: 1, pony2: 1, pony2n: 1 };
  const Y0 = 0.9, KY = 1.12;               // 脚：y0 より下を KY 倍に伸ばし、上はその分持ち上げる
  const NK = { along: 1.08, across: 0.92, x: 0.86 }, HK = 0.8, BODY_X = 0.94;
  // 頂点の属性の j 番目（r128 には getComponent が無い。正規化された整数は 0〜1 に）
  function comp(at, k, j) {
    const v = at.array[k * at.itemSize + j];
    if (!at.normalized) return v;
    const a = at.array;
    return v / (a instanceof Uint8Array ? 255 : a instanceof Uint16Array ? 65535 : 1);
  }
  function prepare(g) {
    g.scene.updateMatrixWorld(true);
    let mesh = null;
    g.scene.traverse(o => { if (o.isSkinnedMesh && !mesh) mesh = o; });
    const sk = mesh.skeleton, bones = sk.bones, n = bones.length;
    const role = bones.map(b => { const k = key(b.name); for (const [r, nm] of Object.entries(BN)) if (k === key(nm)) return r; return null; });
    const W = bones.map(b => new THREE.Vector3().setFromMatrixPosition(b.matrixWorld));
    const byRole = r => role.indexOf(r);
    // 脚の骨の軸（付け根 → 子の付け根）
    const child = i => bones.findIndex(b => b.parent === bones[i]);
    const seg = bones.map((b, i) => { const c = child(i); return c >= 0 ? [W[i], W[c]] : null; });
    const nBase = W[byRole('neck')], hBase = W[byRole('head')];
    const nDir = hBase.clone().sub(nBase).normalize();
    const T = new THREE.Vector3(), Q = new THREE.Vector3();
    const neckMap = p => {
      const d = p.clone().sub(nBase), u = d.dot(nDir), perp = d.clone().addScaledVector(nDir, -u);
      return nBase.clone().addScaledVector(nDir, u * NK.along).addScaledVector(new THREE.Vector3(perp.x * NK.x, perp.y * NK.across, perp.z * NK.across), 1);
    };
    const hNew = neckMap(hBase);
    const yMap = y => y < Y0 ? y * KY : y + (KY - 1) * Y0;
    // 胴：腹を上げる（腹から背へ浅く）。前脚と後脚の間ほど強く
    const belly = p => { const w = Math.max(0, 1 - Math.abs((p.z + 0.1) / 0.6)); return 0.055 * w * (1 - Math.min(1, Math.max(0, (p.y - 0.75) / 0.45))); };
    function mapBy(p, i) {
      const r = role[i];
      let q = p.clone();
      if (r && (LEG_UP[r] || LEG_LO[r]) && seg[i]) {
        const [a, b] = seg[i], d = T.copy(b).sub(a), l2 = d.lengthSq() || 1, t = Math.min(1, Math.max(0, Q.copy(q).sub(a).dot(d) / l2));
        const c = a.clone().addScaledVector(d, t), k = LEG_UP[r] || LEG_LO[r];
        q = c.addScaledVector(q.clone().sub(c), k);
      }
      if (r && NECK[r]) q = neckMap(q);
      else if (r && HEAD[r]) q = hNew.clone().addScaledVector(q.clone().sub(hBase), HK);
      else if (!(r && (LEG_UP[r] || LEG_LO[r]))) { q.x *= BODY_X; q.y += belly(q); }
      q.y = yMap(q.y);
      return q;
    }
    // 頂点
    const G = mesh.geometry, Pos = G.attributes.position, si = G.attributes.skinIndex, sw = G.attributes.skinWeight, v = new THREE.Vector3();
    const hair = new Float32Array(Pos.count), dom = new Array(Pos.count);
    for (let k = 0; k < Pos.count; k++) {
      v.fromBufferAttribute(Pos, k);
      const out = new THREE.Vector3();
      let ws = 0, hw = 0, wm = 0;
      for (let j = 0; j < 4; j++) {
        const w = comp(sw, k, j), b = comp(si, k, j);
        if (!(w > 0)) continue;
        if (w > wm) { wm = w; dom[k] = role[b]; }
        out.addScaledVector(mapBy(v, b), w); ws += w;
        const r = role[b];
        if (r && /^(pony|tail1|tail2|tail3)/.test(r)) hw += w;
      }
      if (ws > 0) Pos.setXYZ(k, out.x / ws, out.y / ws, out.z / ws);
      // 毛：尾の骨の重み（たてがみ・尾の毛の印は絵の緑）
      hair[k] = Math.min(1, hw / (ws || 1) * 1.4);
    }
    Pos.needsUpdate = true;
    G.setAttribute('aHair', new THREE.BufferAttribute(hair, 1));
    G.computeBoundingSphere();
    // 骨の付け根（親から順に）
    const NW = bones.map((b, i) => mapBy(W[i], i));
    const depth = b => { let d = 0; while (b.parent) { d++; b = b.parent; } return d; };
    const order = bones.map((b, i) => i).sort((a, b) => depth(bones[a]) - depth(bones[b]));
    for (const i of order) { const b = bones[i]; b.parent.updateMatrixWorld(true); b.position.copy(b.parent.worldToLocal(NW[i].clone())); b.updateMatrixWorld(true); }
    g.scene.updateMatrixWorld(true);
    sk.calculateInverses();
    // 寸法（写したあと）
    const vs = []; for (let k = 0; k < Pos.count; k++) vs.push(new THREE.Vector3().fromBufferAttribute(Pos, k));
    const sel = f => vs.filter(f);
    const top = (z0, z1) => Math.max(...sel(p => p.z > z0 && p.z < z1 && Math.abs(p.x) < 0.08).map(p => p.y));
    const W2 = bones.map(b => new THREE.Vector3().setFromMatrixPosition(b.matrixWorld));
    const kneeY = W2[byRole('lFo')].y, hockY = W2[byRole('lHL')].y, fetY = W2[byRole('lHa')].y;
    const headP = W2[byRole('head')];
    // 鼻先：頭の骨にいちばん重い頂点のうち、頭の骨からいちばん遠い点
    let nose = headP.clone(), far = 0;
    for (let k = 0; k < Pos.count; k++) { const b = comp(si, k, 0); if (role[b] !== 'head') continue; const d = vs[k].distanceTo(headP); if (d > far && vs[k].z > headP.z) { far = d; nose = vs[k]; } }
    const trunk = vs.filter((p, k) => !NECK[dom[k]] && !HEAD[dom[k]] && !LEG_UP[dom[k]] && !LEG_LO[dom[k]]);
    // 頭の半幅（頭のまんなかあたり）
    const hAx = nose.clone().sub(headP), hLen = hAx.length(); hAx.normalize();
    let headW = 0;
    for (let k = 0; k < Pos.count; k++) { if (!HEAD[dom[k]]) continue; const t = vs[k].clone().sub(headP).dot(hAx) / hLen; if (t > 0.4 && t < 0.6) headW = Math.max(headW, Math.abs(vs[k].x)); }
    const chest = Math.max(...trunk.filter(p => p.y > 1.0 && p.y < 1.5 && Math.abs(p.x) < 0.15).map(p => p.z));
    const buttock = Math.min(...sel(p => p.y > 1.0 && p.y < 1.4 && Math.abs(p.x) < 0.15).map(p => p.z));
    P.info = { headW, back: top(-0.25, 0.15), withers: top(0.2, 0.6), kneeY, hockY, fetY, headP, nose, chest, buttock, legZ: (W2[byRole('lUp')].z + W2[byRole('lCa')].z) / 2, bellyY: Math.min(...sel(p => Math.abs(p.z + 0.1) < 0.15 && Math.abs(p.x) < 0.1).map(p => p.y)) };
    // 蹄の底（脚の最後の骨の中の点）
    P.hoof = {};
    for (const [b0, r] of Object.entries(HOOF)) { const b = bones[byRole(r)]; P.hoof[b0] = b.worldToLocal(new THREE.Vector3(W2[byRole(r)].x, 0, W2[byRole(r)].z)); }
    // 手作りの横の軸（馬の右＝素材の -X）と縦の軸を、骨ごとの中の向きに
    P.axis = {};
    for (const [hi, r] of RETARGET) {
      const b = bones[byRole(r)], q = new THREE.Quaternion(); b.getWorldQuaternion(q); q.invert();
      P.axis[r] = { z: new THREE.Vector3(-1, 0, 0).applyQuaternion(q), y: new THREE.Vector3(0, 1, 0).applyQuaternion(q) };
    }
    // 尾の先の骨も、尾の2つめと同じ向きに回す
    { const b = bones[byRole('tail3')], q = new THREE.Quaternion(); b.getWorldQuaternion(q); q.invert(); P.axis.tail3 = { z: new THREE.Vector3(-1, 0, 0).applyQuaternion(q), y: new THREE.Vector3(0, 1, 0).applyQuaternion(q) }; }
    P.scene = g.scene; P.mesh = mesh; P.role = role;
    // 陰影の絵は色でなく数（線形のまま読む）
    if (mesh.material.map) { P.tex = mesh.material.map; P.tex.encoding = THREE.LinearEncoding; P.tex.anisotropy = 4; P.tex.needsUpdate = true; }
    // 置き方：鞍の下の背の高さと、胸の前を、手作りの馬に合わせる（手作りの馬の寸法は race3d から）
    const R3 = HS.Race3D, hm = R3 && R3.handmadeSize ? R3.handmadeSize() : { back: 1.57, chest: 0.86 };
    const S = hm.back / P.info.back;
    P.place = { S, dx: hm.chest - P.info.chest * S };
  }
  HR.info = () => P.info ? Object.assign({ place: P.place }, P.info) : null;

  // ---- 材質（毛色を塗る） ----
  const lin = c => new THREE.Color(c).convertSRGBToLinear();
  function material(h) {
    const A = HS.Art, L = A && A.coatLook ? A.coatLook(h.coat || '鹿毛', h.age) : { body: '#7d4322', top: '#5c2f16', belly: '#8f5531', mane: '#16100c', points: '#17110d', muzzle: '#3b2519', hoof: '#26211d', gloss: 0.5 };
    const mk = h.noMarks ? { blaze: 'none', socks: [false, false, false, false] } : (A && A.marks ? A.marks(h.name || String(h.num || '')) : { blaze: 'none', socks: [false, false, false, false] });
    const I = P.info, S = P.place.S;
    // 白い靴下の高さ（脚ごとに名前から決まる。手作りの馬と同じ決め方）
    const sockLen = k => [0.16, 0.24, 0.34, 0.46][Math.floor(hash01(strHash((h.name || '') + k), 5) * 4)] / S;
    const sock = [0, 1, 2, 3].map(k => mk.socks && mk.socks[k] ? sockLen(k) : 0);
    const blaze = { none: 0, star: 1, strip: 2, blaze: 3, wide: 4 }[mk.blaze] || (mk.blaze && mk.blaze !== 'none' ? 2 : 0);
    const hd = I.nose.clone().sub(I.headP), hl = hd.length();
    const U = {
      uBody: { value: lin(L.body) }, uTop: { value: lin(L.top) }, uBelly: { value: lin(L.belly) }, uPoints: { value: lin(L.points) }, uMane: { value: lin(L.mane) },
      uMuzzle: { value: lin(L.muzzle || L.points) }, uHoof: { value: lin(L.hoof || '#26211d') }, uWhite: { value: lin('#f2efe8') }, uDappleCol: { value: lin(L.dappleCol || L.body) },
      uDapple: { value: L.dapple || 0 }, uPtsSoft: { value: L.pointsSoft ? 0.25 : 0.08 }, uPtsOn: { value: L.points && L.points !== L.body ? 1 : 0 },
      uKnee: { value: I.kneeY }, uHock: { value: I.hockY }, uLegZ: { value: I.legZ }, uBack: { value: I.back }, uBellyY: { value: I.bellyY },
      uSock: { value: new THREE.Vector4(sock[0], sock[1], sock[2], sock[3]) }, uHoofY: { value: 0.075 / S },
      uHead: { value: I.headP.clone() }, uHeadDir: { value: hd.clone().normalize() }, uHeadLen: { value: hl }, uBlaze: { value: blaze },
    };
    const m = new THREE.MeshStandardMaterial({ map: P.tex, skinning: true, roughness: 0.78 - 0.08 * (L.gloss || 0), metalness: 0, envMapIntensity: 0.6 });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'attribute float aHair;\nvarying vec3 vRest;\nvarying vec3 vRestN;\nvarying float vHair;\n' + sh.vertexShader
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vRest = position; vRestN = normal; vHair = aHair;');
      sh.fragmentShader = `varying vec3 vRest; varying vec3 vRestN; varying float vHair;
uniform vec3 uBody, uTop, uBelly, uPoints, uMane, uMuzzle, uHoof, uWhite, uDappleCol, uHead, uHeadDir;
uniform float uDapple, uPtsSoft, uPtsOn, uKnee, uHock, uLegZ, uBack, uBellyY, uHoofY, uHeadLen, uBlaze;
uniform vec4 uSock;
float hrH(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float hrN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hrH(i), hrH(i + vec3(1,0,0)), f.x), mix(hrH(i + vec3(0,1,0)), hrH(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hrH(i + vec3(0,0,1)), hrH(i + vec3(1,0,1)), f.x), mix(hrH(i + vec3(0,1,1)), hrH(i + vec3(1,1,1)), f.x), f.y), f.z); }
` + sh.fragmentShader.replace('#include <map_fragment>', `
  vec4 tx = texture2D(map, vUv);
  float sh = tx.r * 2.0;
  vec3 p = vRest;
  // 体の色：腹 → 体 → 背
  vec3 c = mix(uBelly, uBody, smoothstep(uBellyY - 0.05, uBellyY + 0.25, p.y));
  c = mix(c, uTop, smoothstep(uBack - 0.25, uBack + 0.05, p.y) * 0.8);
  // 連銭（芦毛）：ぼかした丸の斑点
  if (uDapple > 0.0) { float d = hrN(p * 9.0); c = mix(c, uDappleCol, uDapple * smoothstep(0.58, 0.78, d) * smoothstep(uBellyY, uBellyY + 0.2, p.y)); }
  // 脚先（膝・飛節から下）
  bool front = p.z > uLegZ;
  float kn = front ? uKnee : uHock;
  float pts = 1.0 - smoothstep(kn - 0.05, kn + uPtsSoft, p.y);
  c = mix(c, uPoints, pts * uPtsOn);
  // 白い靴下（左＝+X）
  bool left = p.x > 0.0;
  float sk = front ? (left ? uSock.x : uSock.y) : (left ? uSock.z : uSock.w);
  if (sk > 0.0) c = mix(c, uWhite, 1.0 - smoothstep(sk - 0.015, sk + 0.015, p.y));
  // 蹄
  c = mix(c, uHoof, 1.0 - smoothstep(uHoofY - 0.01, uHoofY + 0.01, p.y));
  // 頭：鼻先・白徴（顔の前）
  float t = dot(p - uHead, uHeadDir) / uHeadLen;
  vec3 q = p - uHead - uHeadDir * dot(p - uHead, uHeadDir);
  float onHead = step(0.0, t) * step(t, 1.15) * (1.0 - smoothstep(0.12, 0.2, length(q)));
  c = mix(c, uMuzzle, smoothstep(0.78, 0.92, t) * onHead);
  if (uBlaze > 0.5) {
    vec3 face = normalize(vec3(0.0, uHeadDir.z, -uHeadDir.y));
    if (face.y < 0.0) face = -face;
    float fr = smoothstep(0.15, 0.45, dot(normalize(vRestN), face)) * onHead;
    float w = uBlaze < 1.5 ? 0.035 : uBlaze < 2.5 ? 0.02 : uBlaze < 3.5 ? 0.04 : 0.06;
    float t0 = uBlaze < 1.5 ? 0.1 : 0.08, t1 = uBlaze < 1.5 ? 0.28 : 0.88;
    float b = (1.0 - smoothstep(w, w + 0.012, abs(p.x))) * smoothstep(t0, t0 + 0.03, t) * (1.0 - smoothstep(t1 - 0.03, t1, t));
    c = mix(c, uWhite, b * fr);
  }
  // たてがみ・尾の毛
  // たてがみ・尾：毛の色にし、陰影は暗めで差を小さく（毛の筋が白く光らないように）
  float hm = max(vHair, tx.g);
  c = mix(c, uMane, hm);
  sh = mix(sh, 0.8 + 0.4 * (sh - 1.0), hm);
  diffuseColor.rgb *= c * sh;`);
    };
    m.customProgramCacheKey = () => 'hs-horse-rigged';
    return m;
  }
  function hash01(a, b) {
    let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
    h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function strHash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; }

  // ---- 1頭ぶん ----
  HR.make = function (h, hb) {
    const root = new THREE.Group(), body = THREE.SkeletonUtils.clone(P.scene);
    let mesh = null; body.traverse(o => { if (o.isSkinnedMesh) mesh = o; });
    const mat = material(h);
    mesh.material = mat; mesh.castShadow = true; mesh.frustumCulled = false;
    const S = P.place.S;
    body.rotation.y = Math.PI / 2;   // 素材の前（+Z）を馬の前（+X）へ
    body.scale.setScalar(S);
    body.position.set(P.place.dx, 0, 0);
    root.add(body);
    // 胴の骨（1）に付ける：骨 1 のはじめの位置を引く
    const J1 = HS.Race3D.BONE_AT(1);
    root.position.set(-J1[0], -J1[1], -J1[2]);
    const bones = {};
    body.traverse(o => { if (o.isBone) { const k = key(o.name); for (const [r, nm] of Object.entries(BN)) if (k === key(nm)) bones[r] = o; } });
    const rest = {};
    for (const r of Object.keys(bones)) rest[r] = bones[r].quaternion.clone();
    const inst = { root, body, mesh, mat, bones, rest, head: null, K: null };
    hb[1].add(root);
    // 頭の馬具（手作りの骨 4）を素材の頭へ合わせる写し（はじめの姿勢で）
    hb[0].updateMatrixWorld(true);
    const hand = HS.Race3D.handmadeHead();   // { start, nose }（手作りの馬の形の座標）
    const toW = p => hb[0].localToWorld(p.clone());
    const sH = bones.head, sHw = new THREE.Vector3().setFromMatrixPosition(sH.matrixWorld);
    const sNose = body.localToWorld(P.info.nose.clone());
    const a0 = toW(hand.start), a1 = toW(hand.nose);
    const da = a1.clone().sub(a0), db = sNose.clone().sub(sHw);
    const rot = new THREE.Quaternion().setFromUnitVectors(da.clone().normalize(), db.clone().normalize());
    const sc = db.length() / da.length(), scz = P.info.headW * P.place.S / hand.width;
    const J4 = HS.Race3D.BONE_AT(4);
    // 骨 4 の付け根（J4）→ 素材の頭の付け根 + 回転・拡大
    const want = new THREE.Matrix4().compose(sHw.clone().add(toW(new THREE.Vector3(J4[0], J4[1], J4[2])).sub(a0).applyQuaternion(rot).multiplyScalar(sc)), rot, new THREE.Vector3(sc, sc, scz));
    inst.K = new THREE.Matrix4().copy(sH.matrixWorld).invert().multiply(want);
    return inst;
  };

  // ---- 動き：手作りの骨の角度を写す ----
  const tq = { a: null, b: null };
  HR.pose = function (r, hb) {
    const qa = tq.a || (tq.a = new THREE.Quaternion()), qb = tq.b || (tq.b = new THREE.Quaternion());
    for (const [hi, k] of RETARGET) {
      const b = r.bones[k]; if (!b) continue;
      const ax = P.axis[k];
      // 股は素材の尻の皮も引っぱるので小さく回し、残りを後膝へ回す（後脚の付け根が伸びて見えないように）
      let ang = hb[hi].rotation.z - (REF[hi] || 0);
      if (hi === 16 || hi === 20) ang *= HIP_K;
      else if (hi === 17 || hi === 21) ang += hb[hi - 1].rotation.z * (1 - HIP_K);
      b.quaternion.copy(r.rest[k]).multiply(qa.setFromAxisAngle(ax.z, ang));
      if (hb[hi].rotation.y) b.quaternion.multiply(qb.setFromAxisAngle(ax.y, hb[hi].rotation.y));
    }
    // 尾の先は尾の2つめと同じだけ
    if (r.bones.tail3) r.bones.tail3.quaternion.copy(r.rest.tail3).multiply(qa.setFromAxisAngle(P.axis.tail3.z, hb[7].rotation.z - REF[7]));
  };
  // 蹄を地面へ・頭の馬具を素材の頭へ。gait＝{ ph, sp, lead, touch, duty }（race3d の襲歩の表）。手作りの骨の行列は更新してあること
  const sv = { v: null, m: null, p: null, q: null, s: null };
  HR.settle = function (r, hb, gait) {
    const V = sv.v || (sv.v = new THREE.Vector3()), M = sv.m || (sv.m = new THREE.Matrix4());
    const pv = sv.p || (sv.p = new THREE.Vector3()), pq = sv.q || (sv.q = new THREE.Quaternion()), ps = sv.s || (sv.s = new THREE.Vector3());
    r.root.updateMatrixWorld(true);
    // 蹄の高さ（馬の形の中＝骨 0 の中）
    let ws = 0, wy = 0, lo = 9;
    for (const [b0, k] of Object.entries(HOOF)) {
      V.copy(P.hoof[b0]).applyMatrix4(r.bones[k].matrixWorld);
      hb[0].worldToLocal(V);
      lo = Math.min(lo, V.y);
      if (gait.sp > 0) {
        const duty = +b0 < 16 ? gait.duty[0] : gait.duty[1], phi = ((gait.ph - gait.touch[b0]) % 1 + 1) % 1;
        if (phi < duty) { const w = Math.sin(phi / duty * Math.PI); ws += w; wy += w * V.y; }
      } else { ws += 1; wy += V.y; }
    }
    const al = Math.min(1, ws * 1.5);
    const corr = -(al * (ws > 0 ? wy / ws : 0) + (1 - al) * (lo - 0.1 * Math.min(gait.sp, 1.1)));
    if (Math.abs(corr) > 1e-4) { hb[1].position.y += corr; hb[1].updateMatrixWorld(true); }
    // 頭の馬具の骨（4）
    const Mi = sv.mi || (sv.mi = new THREE.Matrix4());
    M.multiplyMatrices(r.bones.head.matrixWorld, r.K);
    M.premultiply(Mi.copy(hb[3].matrixWorld).invert());
    M.decompose(pv, pq, ps);
    hb[4].position.copy(pv); hb[4].quaternion.copy(pq); hb[4].scale.copy(ps);
    hb[4].updateMatrixWorld(true);
  };
  if (typeof document !== 'undefined') HR.preload();
})();
