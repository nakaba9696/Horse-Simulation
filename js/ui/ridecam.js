// 騎乗の映像：自分の馬の少し後ろ・上から前を見る疑似3Dの絵
// 空・山並み・スタンド・馬場（芝の刈り目／ダートの蹄の跡）・内外のラチ・ハロン棒・ゴール板・ゲート・前の馬と自分の馬を描く
// 使い方：HS.RideCam.draw(ctx, VW, VH, view)。ctx は scale 済み、VW×VH は論理ピクセル
//   view = { t, D, surface:'芝'|'ダ', ground:'良'|'稍重'|'重'|'不良', course:{name,dir,lap,straight,slope},
//            track: HS.Track.make(...) の戻り値, me, horses:[{x,lane,v,num,frame,cap,silks,coat,name,mine}], phase:'gate'|'race'|'finish' }
//   戻り値：{ horses: [{ i, sx, sy, k, z }] }（画面に出た馬の足元の位置・1mあたりの画素・奥行き。名前の札などを重ねるとき用）
// 乱数は使わない（揺らぎは番号・位置から決まる値で出す）
// 重さ：塗りの回数がそのまま重さになるので、同じ色の形は1つのパスにまとめて塗る
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const RC = HS.RideCam = {};
  const TAU = Math.PI * 2;

  const NEAR = 0.5;        // これより手前は切る（m）
  const CAM_BACK = 5.5;    // カメラは自分の馬の尻から何m後ろか
  const CAM_H = 2.4;       // カメラの高さ（m）
  const BODY = 1.2;        // 馬の位置 x から尻までの長さ（m）
  const LANE_M = 1.6;      // 進路1つの幅（m）
  const LANE0 = 1.0;       // ラチ沿い（lane 0）の馬の、内ラチからの距離（m）
  const VIEW_FAR = 430;    // 馬場を描く先の長さ（m）
  const STRIDE = 7.2;      // 一完歩の長さ（m）
  const GATE_P = 1.25;     // ゲートの枠の間隔（m）。発走から GATE_OPEN 秒で実際の進路へ寄せる
  const GATE_OPEN = 2.5;
  const FONT = '"Noto Sans JP", sans-serif';
  const DEF_SILKS = { base: '#1f4fbf', sub: '#ffd23f', pattern: 'plain' };

  const uOf = lane => LANE0 + Math.max(0, lane || 0) * LANE_M;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  // 整数から決まった 0〜1 の値（見た目の揺らぎ用）
  function hash01(a, b) {
    let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
    h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  // ---- 色 ----
  function rgb(c, k, mix, mk) {
    let r = c[0], g = c[1], b = c[2];
    if (mix) { r += (mix[0] - r) * mk; g += (mix[1] - g) * mk; b += (mix[2] - b) * mk; }
    return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
  }
  const PAL = new Map();
  function palette(surface, ground) {
    const key = surface + '|' + ground;
    if (PAL.has(key)) return PAL.get(key);
    const dirt = surface === 'ダ';
    const wet = ({ '良': 0, '稍重': 1, '重': 2, '不良': 3 })[ground] || 0;
    const dk = dirt ? [1, 0.86, 0.74, 0.64][wet] : [1, 0.93, 0.85, 0.77][wet];
    const grey = [92, 84, 80], gm = dirt ? wet * 0.08 : wet * 0.05;
    const A = dirt ? [200, 154, 104] : [92, 166, 70];
    const B = dirt ? [186, 140, 92] : [74, 145, 58];
    const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
    const overcast = wet >= 2;
    const p = {
      dirt, wet, overcast,
      trackA: rgb(A, dk, grey, gm), trackB: rgb(B, dk, grey, gm), trackM: rgb(M, dk, grey, gm),
      mark: dirt ? `rgba(${wet >= 2 ? '40,28,18' : '92,60,32'},${0.22 + wet * 0.05})` : 'rgba(30,70,25,0.25)',
      harrow: dirt ? 'rgba(80,52,28,0.16)' : null,
      dust: dirt ? (wet >= 2 ? 'rgba(70,50,32,0.32)' : 'rgba(205,165,115,0.30)') : 'rgba(60,110,45,0.22)',
      grassFar: overcast ? '#4c7a42' : '#4d8a3e', grassNear: overcast ? '#355a2d' : '#386f2e',
      skyTop: overcast ? '#76838f' : (wet === 1 ? '#5a8fc8' : '#3f81d2'),
      skyBot: overcast ? '#c6ccd1' : '#d4e8f3',
      cloud: overcast ? 'rgba(150,158,166,0.85)' : 'rgba(255,255,255,0.85)',
      mount: overcast ? '#8a959d' : '#7f9fba', mount2: overcast ? '#6f7d77' : '#5f8a6f',
      trees: overcast ? '#2f4a33' : '#2d5a31', crown: overcast ? '#2c4a2e' : '#2e6033',
      haze: overcast ? 'rgba(198,204,209,' : 'rgba(212,232,243,',
      rail: '#f3f5f6', railShade: '#c9cfd4', post: '#d7dce0',
    };
    PAL.set(key, p);
    return p;
  }
  function coatOf(c) {
    const A = HS.Art;
    return A && A.coat ? A.coat(c) : ['#8a4f24', '#5e3415', '#1a120d', '#1a120d'];
  }
  const MARKS = new Map();
  function marksOf(key) {
    if (!(HS.Art && HS.Art.marks)) return null;
    let m = MARKS.get(key);
    if (!m) { if (MARKS.size > 200) MARKS.clear(); m = HS.Art.marks(key); MARKS.set(key, m); }
    return m;
  }

  // 縦のグラデーションは 1px 幅の絵に描いて覚え、引き伸ばして貼る（毎コマ作ると重い）
  const IMG = new Map();
  function canvasOf(w, h) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    return c;
  }
  function vgrad(ctx, key, x, y, w, h, stops) {
    if (h <= 0) return;
    let img = IMG.get(key);
    if (img === undefined) {
      img = canvasOf(1, Math.max(2, Math.round(h)));
      if (img) {
        const g = img.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, img.height);
        for (const [o, c] of stops) gr.addColorStop(o, c);
        g.fillStyle = gr; g.fillRect(0, 0, 1, img.height);
      }
      if (IMG.size > 60) IMG.clear();
      IMG.set(key, img);
    }
    if (img) { ctx.drawImage(img, x, y, w, h); return; }
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    for (const [o, c] of stops) gr.addColorStop(o, c);
    ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
  }

  // ---- コースの形 ----
  // s（ゴールからさかのぼった距離）の地点：位置と進む向き
  function frame(tr, s) {
    const p = tr.at(s), a = tr.at(s - 0.6), b = tr.at(s + 0.6);
    let fx = a.x - b.x, fy = a.y - b.y;
    const l = Math.hypot(fx, fy) || 1;
    return { x: p.x, y: p.y, fx: fx / l, fy: fy / l, curv: p.curv };
  }
  // 内ラチから外へ u m、前へ dq m の地点（世界の座標。y は上向き）
  // 右手の向き＝(fy, -fx)。右回りは内が右なので、外向き＝(-sign*fy, sign*fx)
  function wpt(fr, u, sign, dq) {
    dq = dq || 0;
    return { x: fr.x - sign * fr.fy * u + fr.fx * dq, y: fr.y + sign * fr.fx * u + fr.fy * dq };
  }
  // ゴール前の直線の範囲（ゴールからさかのぼった距離で [始まり, 終わり]）。形から測る
  const HOME = new WeakMap();
  function homeRange(tr) {
    let r = HOME.get(tr);
    if (r) return r;
    let a = 0, b = 0;
    while (b < tr.L / 2 && tr.at(b + 5).corner === 0) b += 5;
    while (a > -tr.L / 2 && tr.at(a - 5).corner === 0) a -= 5;
    r = [a, b];
    HOME.set(tr, r);
    return r;
  }

  // ---- 投影 ----
  let P = null; // 1コマの間だけ使うカメラ
  function cam(w, h) {
    const dx = w.x - P.Cx, dy = w.y - P.Cy;
    return { X: dx * P.Rx + dy * P.Ry, Z: dx * P.Fx + dy * P.Fy, Y: h - P.camY };
  }
  const sxOf = q => P.cx + q.X * P.f / q.Z;
  const syOf = q => P.hy - q.Y * P.f / q.Z;
  function clipZ(pts) {
    let anyIn = false, allIn = true;
    for (let i = 0; i < pts.length; i++) { if (pts[i].Z >= NEAR) anyIn = true; else allIn = false; }
    if (allIn) return pts;
    if (!anyIn) return null;
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ain = a.Z >= NEAR, bin = b.Z >= NEAR;
      if (ain) out.push(a);
      if (ain !== bin) { const k = (NEAR - a.Z) / (b.Z - a.Z); out.push({ X: a.X + (b.X - a.X) * k, Y: a.Y + (b.Y - a.Y) * k, Z: NEAR }); }
    }
    return out;
  }
  // 多角形を今のパス（ctx か Path2D）に足す
  function polyTo(p, pts) {
    const c = clipZ(pts);
    if (!c) return;
    p.moveTo(sxOf(c[0]), syOf(c[0]));
    for (let i = 1; i < c.length; i++) p.lineTo(sxOf(c[i]), syOf(c[i]));
    p.closePath();
  }
  function poly(ctx, pts, col) {
    ctx.beginPath(); polyTo(ctx, pts);
    ctx.fillStyle = col; ctx.fill();
  }
  function clipSeg(a, b) {
    if (a.Z < NEAR && b.Z < NEAR) return null;
    if (a.Z < NEAR) { const k = (NEAR - a.Z) / (b.Z - a.Z); a = { X: a.X + (b.X - a.X) * k, Y: a.Y + (b.Y - a.Y) * k, Z: NEAR }; }
    else if (b.Z < NEAR) { const k = (NEAR - b.Z) / (a.Z - b.Z); b = { X: b.X + (a.X - b.X) * k, Y: b.Y + (a.Y - b.Y) * k, Z: NEAR }; }
    return [a, b];
  }
  function line3(ctx, a, b, w, col) {
    const c = clipSeg(a, b);
    if (!c) return;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, w * P.f / ((c[0].Z + c[1].Z) / 2));
    ctx.beginPath(); ctx.moveTo(sxOf(c[0]), syOf(c[0])); ctx.lineTo(sxOf(c[1]), syOf(c[1])); ctx.stroke();
  }
  // 縦の棒（同じ奥行き）を長方形としてパスに足す
  function postTo(p, a, b, w) {
    if (a.Z < NEAR) return;
    const pw = Math.max(1, w * P.f / a.Z), x = sxOf(a), y1 = syOf(b), y0 = syOf(a);
    p.rect(x - pw / 2, y1, pw, y0 - y1);
  }

  // ---- 絵の部品（パスに足すだけ。塗るのは呼ぶ側） ----
  // 先細りの棒（art.js と同じ形）
  function seg(p, x1, y1, x2, y2, w1, w2) {
    const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
    p.moveTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); p.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2);
    p.arc(x2, y2, w2 / 2, a + Math.PI / 2, a - Math.PI / 2, true);
    p.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2);
    p.arc(x1, y1, w1 / 2, a - Math.PI / 2, a + Math.PI / 2, true);
    p.closePath();
  }
  function ell(p, x, y, rx, ry) { p.moveTo(x + rx, y); p.ellipse(x, y, rx, ry, 0, 0, TAU); }
  function star(p, cx, cy, r) {
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; if (i) p.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else p.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    p.closePath();
  }
  // 勝負服の模様を塗る（パスを作ってから呼ぶ。模様の名は HS.Art.SILK_PATTERNS と同じ）
  function fillSilks(ctx, sk, bx, by, bw, bh, detail) {
    ctx.fillStyle = sk.base; ctx.fill();
    const p = sk.pattern;
    if (!detail || !p || p === 'plain') return;
    ctx.save(); ctx.clip();
    ctx.fillStyle = sk.sub;
    ctx.beginPath();
    if (p === 'hoops') for (let i = 0; i < 4; i++) ctx.rect(bx, by + (i + 0.25) * bh / 4, bw, bh / 9);
    else if (p === 'stripes') for (let i = 0; i < 6; i++) ctx.rect(bx + (i + 0.25) * bw / 6, by, bw / 13, bh);
    else if (p === 'sash') { ctx.moveTo(bx + bw * 0.62, by); ctx.lineTo(bx + bw * 0.86, by); ctx.lineTo(bx + bw * 0.38, by + bh); ctx.lineTo(bx + bw * 0.14, by + bh); ctx.closePath(); }
    else if (p === 'cross') { const w = bw * 0.12; ctx.moveTo(bx, by); ctx.lineTo(bx + w, by); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw - w, by + bh); ctx.closePath(); ctx.moveTo(bx + bw, by); ctx.lineTo(bx + bw - w, by); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + w, by + bh); ctx.closePath(); }
    else if (p === 'diamonds') for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) { const cx = bx + (i + 0.5) * bw / 4, cy = by + (j + 0.5) * bh / 3; ctx.moveTo(cx, cy - bh / 6); ctx.lineTo(cx + bw / 8, cy); ctx.lineTo(cx, cy + bh / 6); ctx.lineTo(cx - bw / 8, cy); ctx.closePath(); }
    else if (p === 'stars') for (let i = 0; i < 4; i++) star(ctx, bx + (0.2 + ((i * 37) % 100) / 160) * bw, by + (0.25 + ((i * 53) % 100) / 200) * bh, Math.min(bw, bh) * 0.16);
    else if (p === 'halves') ctx.rect(bx + bw / 2, by, bw / 2, bh);
    else if (p === 'yoke') ctx.rect(bx, by, bw, bh * 0.38);
    ctx.fill();
    ctx.restore();
  }

  // 後ろから見た馬と騎手。sx,sy＝足元の中心（画面）、k＝1mあたりの画素
  // o: { ph, moving, v, coat, marks, silks, cap, num, lean, hero, dust, t }
  function drawRear(ctx, sx, sy, k, o, pal) {
    const C = coatOf(o.coat), sk = o.silks || DEF_SILKS;
    const mv = o.moving, ph = o.ph;
    const s1 = Math.sin(ph * TAU);
    const sp = mv ? clamp((o.v || 0) / 16, 0.4, 1.15) : 0;
    const b = mv ? (-Math.abs(s1) * 0.075 + 0.035) * sp : 0;              // 体の上下
    const jy = b + (mv ? Math.sin(ph * TAU * 2 + 0.6) * 0.025 * sp : 0);  // 騎手の押し
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(k, k);
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.beginPath(); ell(ctx, 0, 0, 0.56, 0.1); ctx.fill();
    if (o.lean) ctx.rotate(o.lean);
    if (k < 9) { // 遠い：影絵だけ
      ctx.fillStyle = C[1];
      ctx.fillRect(-0.24, -1.05, 0.13, 1.05); ctx.fillRect(0.11, -1.05, 0.13, 1.05);
      ctx.fillStyle = C[0]; ctx.beginPath(); ell(ctx, 0, -1.3 + b, 0.41, 0.33); ctx.fill();
      ctx.fillStyle = sk.base; ctx.fillRect(-0.24, -2.1 + jy, 0.48, 0.3);
      ctx.fillStyle = o.cap || '#fff'; ctx.fillRect(-0.12, -2.32 + jy, 0.24, 0.2);
      ctx.restore();
      return;
    }
    const full = k >= 30;
    const mk = o.marks || null;
    const lift = p => mv ? Math.max(0, Math.sin((ph + p) * TAU)) * sp : 0;
    // 砂・芝が舞う
    if (o.dust && mv && full) {
      ctx.fillStyle = pal.dust; ctx.beginPath();
      for (let j = 0; j < 3; j++) {
        const pj = (ph * 2 + j / 3) % 1, r = 0.1 + pj * 0.22;
        ell(ctx, (j - 1) * 0.28 + (pj - 0.5) * 0.12, -0.08 - pj * 0.3, r * 1.4, r * 0.7);
      }
      ctx.fill();
    }
    // 前脚（奥。後ろ脚のあいだから見える）と胴（尻より奥。横に少し張る）
    const fore = [];
    ctx.beginPath();
    for (let sd = -1; sd <= 1; sd += 2) {
      const L = lift(sd < 0 ? 0.42 : 0.55);
      const fx = sd * (0.11 - L * 0.03), fy = -0.05 - L * 0.34;
      seg(ctx, sd * 0.13, -1.02 + b, fx, fy, 0.11, 0.065);
      fore.push(fx, fy);
    }
    ctx.fillStyle = C[1]; ctx.fill();
    ctx.beginPath(); ell(ctx, 0, -1.3 + b, 0.45, 0.28); ctx.fill();
    // 後ろ脚の形
    const hind = [];
    for (let sd = -1; sd <= 1; sd += 2) {
      const L = lift(sd < 0 ? 0.0 : 0.12);
      hind.push({ sd, L, hx: sd * 0.2, hy: -1.1 + b, kx: sd * (0.23 - L * 0.03), ky: -0.52 - L * 0.18, fx: sd * (0.19 - L * 0.07), fy: -0.07 - L * 0.44 });
    }
    // 蹄（前と、着いている後ろ）
    ctx.beginPath();
    ell(ctx, fore[0], fore[1] + 0.02, 0.052, 0.03); ell(ctx, fore[2], fore[3] + 0.02, 0.052, 0.03);
    // ゼッケン（胴の両脇に見える）・鞍の後ろの縁
    ctx.fillStyle = '#161616'; ctx.fill();
    ctx.fillStyle = '#f4f4f2';
    ctx.fillRect(-0.48, -1.79 + b, 0.18, 0.36); ctx.fillRect(0.30, -1.79 + b, 0.18, 0.36);
    ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ell(ctx, 0, -1.7 + b, 0.3, 0.06); ctx.fill();
    // 後ろ脚の下（管と球節）
    ctx.beginPath();
    for (const h of hind) seg(ctx, h.kx, h.ky, h.fx, h.fy, 0.095, 0.075);
    ctx.fillStyle = C[3]; ctx.fill();
    if (mk && mk.socks && (mk.socks[2] || mk.socks[3])) {
      ctx.beginPath();
      for (const h of hind) if (mk.socks[h.sd < 0 ? 2 : 3]) seg(ctx, h.kx + (h.fx - h.kx) * 0.45, h.ky + (h.fy - h.ky) * 0.45, h.fx, h.fy, 0.09, 0.078);
      ctx.fillStyle = '#f2efe6'; ctx.fill();
    }
    // 後ろの蹄：上がると裏が見える
    ctx.beginPath();
    let soles = false;
    for (const h of hind) { if (h.L > 0.3 && full) soles = true; else ell(ctx, h.fx, h.fy + 0.025, 0.068, 0.035); }
    ctx.fillStyle = '#141414'; ctx.fill();
    if (soles) {
      ctx.beginPath();
      for (const h of hind) if (h.L > 0.3) ell(ctx, h.fx, h.fy + 0.02, 0.07, 0.055);
      ctx.fillStyle = '#8c8174'; ctx.fill();
    }
    // 後ろ脚の上と尻（重なる形を1つのパスにすると巻き方で穴があくので分けて塗る）
    ctx.beginPath();
    for (const h of hind) seg(ctx, h.hx, h.hy, h.kx, h.ky, 0.27, 0.11);
    ctx.fillStyle = C[0]; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -0.96 + b);
    ctx.bezierCurveTo(-0.2, -0.94 + b, -0.39, -1.02 + b, -0.41, -1.25 + b);
    ctx.bezierCurveTo(-0.43, -1.47 + b, -0.32, -1.65 + b, -0.15, -1.67 + b);
    ctx.quadraticCurveTo(-0.05, -1.67 + b, 0, -1.61 + b);
    ctx.quadraticCurveTo(0.05, -1.67 + b, 0.15, -1.67 + b);
    ctx.bezierCurveTo(0.32, -1.65 + b, 0.43, -1.47 + b, 0.41, -1.25 + b);
    ctx.bezierCurveTo(0.39, -1.02 + b, 0.2, -0.94 + b, 0, -0.96 + b);
    ctx.closePath(); ctx.fill();
    // 陰影（筋肉の張り・下の影・まん中の溝）
    if (o.hero) {
      for (let sd = -1; sd <= 1; sd += 2) {
        const g = ctx.createRadialGradient(sd * 0.2, -1.47 + b, 0.01, sd * 0.2, -1.4 + b, 0.2);
        g.addColorStop(0, 'rgba(255,255,255,0.26)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ell(ctx, sd * 0.2, -1.4 + b, 0.2, 0.2); ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ell(ctx, -0.2, -1.43 + b, 0.12, 0.13); ell(ctx, 0.2, -1.43 + b, 0.12, 0.13); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ell(ctx, 0, -1.03 + b, 0.3, 0.07); ctx.fill();
    // 尾（走ると後ろへなびいて短く見える）
    const sw = mv ? s1 * 0.05 : Math.sin((o.t || 0) * 1.7 + (o.num || 0)) * 0.025;
    const te = mv ? -1.06 + b + 0.05 * Math.cos(ph * TAU) : -0.78;
    ctx.fillStyle = C[2];
    ctx.beginPath();
    ctx.moveTo(-0.05, -1.63 + b);
    ctx.quadraticCurveTo(-0.14 + sw, -1.32 + b, -0.11 + sw * 1.6, te);
    ctx.quadraticCurveTo(sw * 1.8, te + 0.07, 0.11 + sw * 1.6, te);
    ctx.quadraticCurveTo(0.14 + sw, -1.32 + b, 0.05, -1.63 + b);
    ctx.closePath(); ctx.fill();
    if (full) {
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 0.016;
      ctx.beginPath(); ctx.moveTo(0, -1.0 + b); ctx.lineTo(0, -1.12 + b);
      ctx.moveTo(-0.02, -1.58 + b); ctx.quadraticCurveTo(-0.05 + sw, -1.3 + b, -0.04 + sw * 1.6, te + 0.02);
      ctx.stroke();
    }
    // 騎手：鐙と長靴・白いズボン
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#141414'; ctx.lineWidth = 0.1; ctx.beginPath();
    for (let sd = -1; sd <= 1; sd += 2) { ctx.moveTo(sd * 0.44, -1.44 + b); ctx.lineTo(sd * 0.37, -1.75 + jy); }
    ctx.stroke();
    ctx.strokeStyle = '#f1f1f1'; ctx.lineWidth = 0.13; ctx.beginPath();
    for (let sd = -1; sd <= 1; sd += 2) { ctx.moveTo(sd * 0.37, -1.75 + jy); ctx.lineTo(sd * 0.15, -1.87 + jy); }
    ctx.stroke();
    if (full) { ctx.fillStyle = '#9aa0a8'; ctx.fillRect(-0.495, -1.42 + b, 0.11, 0.03); ctx.fillRect(0.385, -1.42 + b, 0.11, 0.03); }
    ctx.fillStyle = '#efefef'; ctx.beginPath(); ell(ctx, 0, -1.87 + jy, 0.18, 0.085); ctx.fill();
    // 背中（勝負服）
    ctx.beginPath();
    ctx.moveTo(-0.17, -1.87 + jy);
    ctx.lineTo(-0.27, -2.07 + jy);
    ctx.quadraticCurveTo(0, -2.21 + jy, 0.27, -2.07 + jy);
    ctx.lineTo(0.17, -1.87 + jy);
    ctx.closePath();
    fillSilks(ctx, sk, -0.28, -2.2 + jy, 0.56, 0.34, k >= 16);
    // 腕（袖）
    const arm = mv ? Math.sin(ph * TAU * 2) * 0.03 : 0;
    ctx.strokeStyle = sk.pattern === 'plain' ? sk.base : sk.sub; ctx.lineWidth = 0.075;
    ctx.beginPath();
    for (let sd = -1; sd <= 1; sd += 2) { ctx.moveTo(sd * 0.23, -2.07 + jy); ctx.lineTo(sd * 0.28, -2.01 + jy + arm); ctx.lineTo(sd * 0.2, -1.97 + jy + arm); }
    ctx.stroke();
    // 頭（帽子＝枠の色）
    ctx.fillStyle = o.cap || '#ffffff';
    ctx.beginPath(); ell(ctx, 0, -2.25 + jy, 0.115, 0.11); ctx.fill();
    if (full) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.015; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ell(ctx, -0.035, -2.29 + jy, 0.035, 0.025); ctx.fill();
    }
    // ゼッケンの番号（近いときだけ）
    if (o.num != null && k >= 55) {
      ctx.save(); ctx.scale(1 / k, 1 / k);
      ctx.fillStyle = '#111'; ctx.font = `bold ${Math.round(0.15 * k)}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(o.num), -0.39 * k, (-1.6 + b) * k);
      ctx.fillText(String(o.num), 0.39 * k, (-1.6 + b) * k);
      ctx.restore();
    }
    ctx.restore();
  }

  // 中くらい・遠くの馬は、走りの位相ごとに一度だけ描いた絵を貼る（塗りの回数を減らす）
  const SPR = new Map();
  const SPR_K = 40;   // これより小さく見える馬を絵で貼る（1mあたりの画素）
  const SPR_PH = 10;  // 一完歩を何コマに分けるか
  function spriteOf(o, scale) {
    const sk = o.silks || DEF_SILKS;
    const pi = o.moving ? Math.floor(o.ph * SPR_PH) % SPR_PH : -1;
    const mk = o.marks && o.marks.socks ? (o.marks.socks[2] ? 1 : 0) + (o.marks.socks[3] ? 2 : 0) : 0;
    const key = o.coat + '|' + sk.base + '|' + sk.sub + '|' + sk.pattern + '|' + o.cap + '|' + mk + '|' + pi + '|' + scale;
    let c = SPR.get(key);
    if (c !== undefined) return c;
    const kr = SPR_K * scale;
    c = canvasOf(Math.ceil(1.4 * kr), Math.ceil(2.5 * kr));
    if (c) {
      const so = Object.assign({}, o, { ph: pi < 0 ? 0 : (pi + 0.5) / SPR_PH, v: 16, lean: 0, hero: false, dust: false, num: null, t: 0 });
      drawRear(c.getContext('2d'), c.width / 2, c.height - 0.14 * kr, kr, so, null);
    }
    if (SPR.size > 400) SPR.clear();
    SPR.set(key, c);
    return c;
  }
  function blitHorse(ctx, sx, sy, k, o, pal, scale) {
    const c = spriteOf(o, scale);
    if (!c) { drawRear(ctx, sx, sy, k, o, pal); return; }
    const m = k / (SPR_K * scale);
    if (o.lean) {
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(o.lean);
      ctx.drawImage(c, -c.width / 2 * m, -(c.height - 0.14 * SPR_K * scale) * m, c.width * m, c.height * m);
      ctx.restore();
    } else ctx.drawImage(c, sx - c.width / 2 * m, sy - (c.height - 0.14 * SPR_K * scale) * m, c.width * m, c.height * m);
  }

  // ---- 背景（空・雲・山並み・林）。向き psi が変わると横に流れる ----
  function drawSky(ctx, VW, hy, pal, psi, f, t) {
    vgrad(ctx, 'sky' + pal.skyTop + hy, 0, 0, VW, hy + 1, [[0, pal.skyTop], [1, pal.skyBot]]);
    const cx = VW / 2;
    // 画面の x に見える向き：右手は時計回り（y 上向きの角度では減る）
    const angAt = sx => psi - Math.atan((sx - cx) / f);
    const sxAt = a => { let d = psi - a; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI; return Math.abs(d) < 1.3 ? cx + Math.tan(d) * f : null; };
    // 雲
    ctx.fillStyle = pal.cloud;
    ctx.beginPath();
    const nc = pal.overcast ? 11 : 7;
    for (let i = 0; i < nc; i++) {
      const a = i * TAU / nc + hash01(i, 7) * 0.5 + t * 0.003;
      const x = sxAt(a);
      if (x == null) continue;
      const w = (50 + hash01(i, 5) * 70) * (pal.overcast ? 1.6 : 1);
      if (x < -w * 1.6 || x > VW + w * 1.6) continue;
      const y = hy * (0.12 + hash01(i, 3) * 0.45);
      ell(ctx, x, y, w, w * 0.22);
      ell(ctx, x + w * 0.45, y - w * 0.1, w * 0.55, w * 0.22);
      ell(ctx, x - w * 0.4, y - w * 0.06, w * 0.45, w * 0.18);
    }
    ctx.fill();
    const sc = hy / 190;
    const ridge = (col, stepX, hf, min) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, hy + 1);
      for (let x = 0; x <= VW + stepX; x += stepX) ctx.lineTo(x, hy - Math.max(min, hf(angAt(x))) * sc);
      ctx.lineTo(VW, hy + 1); ctx.closePath(); ctx.fill();
    };
    ridge(pal.mount, 16, a => 22 + 12 * Math.sin(3 * a + 1) + 9 * Math.sin(7 * a + 2.1) + 5 * Math.sin(13 * a + 0.4) + 3 * Math.sin(29 * a), 4);
    ridge(pal.mount2, 12, a => 9 + 5 * Math.sin(5 * a + 0.3) + 4 * Math.sin(11 * a + 1.7) + 2 * Math.sin(23 * a + 0.9), 2);
    ridge(pal.trees, 8, a => 4 + 2.2 * Math.sin(37 * a) + 1.6 * Math.sin(61 * a + 1.3) + 1.2 * Math.sin(97 * a + 0.2), 1);
  }

  // ---- まとめて塗るもの（奥行きの順で隣り合う間は1つのパスにためる） ----
  const BATCH = {
    rail(pal) {
      const o = { post: new Path2D(), shade: new Path2D(), tube: new Path2D(), far: new Path2D() };
      o.flush = ctx => {
        ctx.fillStyle = pal.post; ctx.fill(o.post);
        ctx.fillStyle = pal.railShade; ctx.fill(o.shade);
        ctx.fillStyle = pal.rail; ctx.fill(o.tube);
        ctx.strokeStyle = pal.rail; ctx.lineWidth = 1; ctx.stroke(o.far);
      };
      return o;
    },
    tree(pal) {
      const o = { trunk: new Path2D(), crown: new Path2D(), light: new Path2D() };
      o.flush = ctx => {
        ctx.fillStyle = '#4a3523'; ctx.fill(o.trunk);
        ctx.fillStyle = pal.crown; ctx.fill(o.crown);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(o.light);
      };
      return o;
    },
    stand() {
      const cols = ['#d6d1c4', '#7b7686', '#5d7590', '#3d434d', '#eeece6'];
      const o = { p: cols.map(() => new Path2D()) };
      o.flush = ctx => { for (let i = 0; i < cols.length; i++) { ctx.fillStyle = cols[i]; ctx.fill(o.p[i]); } };
      return o;
    },
  };

  // 自分の馬の傾き（進路を変えたとき・コーナー）を覚えておく
  const mem = { t: null, lanes: new Map(), leans: new Map() };

  // ---- 1コマ描く ----
  RC.draw = function (ctx, VW, VH, view) {
    const horses = view.horses || [];
    const me = horses[view.me] || horses[0];
    if (!me) return { horses: [] };
    const course = view.course || {};
    const tr = view.track || HS.Track.make(course.lap, course.straight, course.dir);
    const D = view.D || 2000, t = view.t || 0;
    const sign = tr.sign || (course.dir === '左' ? -1 : 1);
    const pal = palette(view.surface, view.ground);
    const gate = view.phase === 'gate' || t <= 0;
    const L = tr.L;
    let maxLane = 0;
    for (const h of horses) maxLane = Math.max(maxLane, h.lane || 0);
    const W = Math.max(24, uOf(maxLane) + 5); // 馬場の幅（m）
    // ゴール前の坂の高さ（m）
    const slopeH = ({ '急': 2.1, '中': 1.6, '小': 0.9, '平': 0 })[course.slope] || 0;
    const elev = s => {
      if (!slopeH) return 0;
      s = ((s % L) + L) % L;
      if (s < 100) return slopeH;
      if (s < 330) return slopeH * (1 - smooth((s - 100) / 230));
      if (s > L - 450) return slopeH * smooth((s - (L - 450)) / 450);
      return 0;
    };

    // 傾きの記憶（巻き戻ったら消す）
    const dt = mem.t == null ? 0 : t - mem.t;
    if (dt < -0.05 || dt > 2) { mem.lanes.clear(); mem.leans.clear(); }
    const dtt = dt > 0 && dt <= 2 ? dt : 0;
    mem.t = t;

    // カメラ：自分の馬の尻から CAM_BACK 後ろ、同じ進路の上。少し先を見る
    const phOf = h => (((h.x || 0) / STRIDE + (h.num || 0) * 0.137) % 1 + 1) % 1;
    const movOf = h => !gate && (h.v || 0) > 1.5;
    const qMe = (me.x || 0) - BODY;
    const camQ = qMe - CAM_BACK;
    const sC = D - camQ, sMe = D - qMe;
    // 横の位置：ゲートの中は枠の間隔、出たら実際の進路へ寄せる
    const gk = gate ? 0 : smooth(t / GATE_OPEN);
    const uH = h => gk >= 1 ? uOf(h.lane) : LANE0 + (h.lane || 0) / 0.5 * GATE_P * (1 - gk) + (uOf(h.lane) - LANE0) * gk;
    const uMe = uH(me);
    const fC = frame(tr, sC), fT = frame(tr, sC - (CAM_BACK + 12));
    const Cw = wpt(fC, uMe, sign), Tw = wpt(fT, uMe, sign);
    let Fx = Tw.x - Cw.x, Fy = Tw.y - Cw.y;
    const fl = Math.hypot(Fx, Fy) || 1; Fx /= fl; Fy /= fl;
    const hy = Math.round(VH * 0.34);
    const groundY = VH - 62;
    const f = (groundY - hy) * CAM_BACK / CAM_H;
    const camBob = movOf(me) ? -Math.abs(Math.sin(phOf(me) * TAU)) * 0.035 : 0;
    P = { cx: VW / 2, hy, f, Cx: Cw.x, Cy: Cw.y, Fx, Fy, Rx: Fy, Ry: -Fx, camY: elev(sMe) + CAM_H + camBob };
    const psi = Math.atan2(Fy, Fx);
    // 画面の拡大率（高精細の画面では馬の絵も細かく作る）
    const tf = ctx.getTransform ? ctx.getTransform() : null;
    const dpr = tf ? Math.hypot(tf.a, tf.b) : 1;
    const sprScale = dpr > 1.75 ? 2 : dpr > 1.25 ? 1.5 : 1;

    ctx.save();
    // 空・山並み
    drawSky(ctx, VW, hy, pal, psi, f, t);
    // 地面（芝生）
    vgrad(ctx, 'grass' + pal.grassFar + hy + VH, 0, hy, VW, VH - hy, [[0, pal.grassFar], [1, pal.grassNear]]);

    // 馬場の区切り（5mごと。遠くは粗く）
    const S = [];
    for (let q = Math.floor(camQ / 5) * 5; q < camQ + VIEW_FAR;) {
      const s = D - q;
      S.push({ q, fr: frame(tr, s), e: elev(s) });
      const d = q - camQ;
      q += d < 170 ? 5 : d < 270 ? 10 : 25;
    }
    const cp = (smp, u, h, dq) => cam(wpt(smp.fr, u, sign, dq), smp.e + (h || 0));
    const IN = -0.4, OUT = W + 0.4;
    const inner = S.map(s => cp(s, IN, 0)), outer = S.map(s => cp(s, OUT, 0));
    // 馬場：平らな地面の上の四角は重ならないので、色ごとに1回で塗る
    for (const col of [pal.trackA, pal.trackB, pal.trackM]) {
      ctx.beginPath();
      for (let i = 0; i < S.length - 1; i++) {
        const a = S[i], b = S[i + 1];
        if (inner[i + 1].Z < NEAR && outer[i + 1].Z < NEAR) continue;
        const c = b.q - a.q === 5 ? ((Math.floor(a.q / 5) & 1) ? pal.trackA : pal.trackB) : pal.trackM;
        if (c === col) polyTo(ctx, [inner[i], inner[i + 1], outer[i + 1], outer[i]]);
      }
      ctx.fillStyle = col; ctx.fill();
    }
    // ダート：まぐわの筋
    if (pal.dirt) {
      ctx.strokeStyle = pal.harrow; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let u = 2.5; u < W - 1; u += 3.2) {
        let started = false;
        for (let i = 0; i < S.length && S[i].q - camQ < 200; i++) {
          const c = cp(S[i], u, 0);
          if (c.Z < 1) continue;
          if (started) ctx.lineTo(sxOf(c), syOf(c)); else { ctx.moveTo(sxOf(c), syOf(c)); started = true; }
        }
      }
      ctx.stroke();
    }
    // 蹄の跡（ダートは全体、芝は内の荒れたあたり）。地面に付いているので流れて見える
    ctx.fillStyle = pal.mark;
    ctx.beginPath();
    for (let i = 0; i < S.length - 1 && S[i].q - camQ < 75; i++) {
      if (S[i + 1].q - S[i].q !== 5) break;
      const kq = Math.round(S[i].q / 5);
      const nm = pal.dirt ? 5 : 2;
      for (let j = 0; j < nm; j++) {
        const u = pal.dirt ? 0.6 + hash01(kq, j) * (W - 2) : 0.5 + hash01(kq, j) * 6;
        const c = cp(S[i], u, 0, hash01(kq, j + 11) * 5);
        if (c.Z < 1.2) continue;
        const rx = (pal.dirt ? 0.16 : 0.22) * f / c.Z;
        if (rx < 0.6) continue;
        ell(ctx, sxOf(c), syOf(c), rx, Math.max(0.5, rx * clamp(CAM_H / c.Z, 0.08, 0.7)));
      }
    }
    ctx.fill();
    // ゴールの線
    if (D - camQ < VIEW_FAR + 20 && D - camQ > -5) {
      const s0 = frame(tr, 0), e0 = elev(0);
      poly(ctx, [cam(wpt(s0, IN, sign, -0.3), e0), cam(wpt(s0, IN, sign, 0.3), e0), cam(wpt(s0, OUT, sign, 0.3), e0), cam(wpt(s0, OUT, sign, -0.3), e0)], 'rgba(255,255,255,0.9)');
    }
    // 遠くのかすみ
    vgrad(ctx, 'haze' + pal.haze, 0, hy - 6, VW, 32, [[0, pal.haze + '0.55)'], [1, pal.haze + '0)']]);

    // ---- 高さのあるもの：奥から順に描く ----
    // kind のあるものは、奥行きの順で隣り合う間は1つのパスにためて塗る
    const list = [];
    const add = (z, d, kind) => { if (z > NEAR) list.push({ z, d, kind }); };
    // ラチ（内・外）
    for (const u of [IN + 0.05, OUT - 0.05]) {
      for (let i = 0; i < S.length - 1; i++) {
        const a0 = cp(S[i], u, 0.93), b0 = cp(S[i + 1], u, 0.93);
        if (b0.Z < NEAR) continue;
        const z = (a0.Z + b0.Z) / 2;
        const near = S[i].q - camQ < 150;
        add(z, B => {
          if (z < 70) {
            polyTo(B.tube, [a0, b0, cp(S[i + 1], u, 1.06), cp(S[i], u, 1.06)]);
            polyTo(B.shade, [cp(S[i], u, 0.86), cp(S[i + 1], u, 0.86), b0, a0]);
          } else {
            const c = clipSeg(a0, b0);
            if (c) { B.far.moveTo(sxOf(c[0]), syOf(c[0])); B.far.lineTo(sxOf(c[1]), syOf(c[1])); }
          }
          if (near) postTo(B.post, cp(S[i], u, 0), a0, 0.08);
        }, 'rail');
      }
    }
    // ハロン棒（残り200mごと、内ラチの内側）とゴール板
    for (let R = 0; R <= D + 1; R += 200) {
      const q = D - R;
      if (q < camQ + 1 || q > camQ + VIEW_FAR) continue;
      const fr = frame(tr, R), e = elev(R);
      const base = cam(wpt(fr, -1.0, sign), e);
      if (base.Z < NEAR) continue;
      if (R === 0) {
        add(base.Z, () => {
          const top = cam(wpt(fr, -1.6, sign), e + 3.9);
          line3(ctx, cam(wpt(fr, -1.6, sign), e), top, 0.16, '#f6f6f6');
          const r = 0.75 * f / top.Z, x = sxOf(top), y = syOf(top);
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r * 1.12, 0, TAU); ctx.fill();
          ctx.fillStyle = '#d4202a'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          if (r > 9) {
            ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(r * 0.55)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('ゴール', x, y);
          }
        });
      } else {
        add(base.Z, () => {
          const h1 = 2.3;
          for (let kk = 0; kk < 4; kk++) line3(ctx, cam(wpt(fr, -1.0, sign), e + kk * h1 / 4), cam(wpt(fr, -1.0, sign), e + (kk + 1) * h1 / 4), 0.14, kk % 2 ? '#ffffff' : '#d42a2a');
          const c1 = cam(wpt(fr, -1.45, sign), e + 2.25), c2 = cam(wpt(fr, -0.55, sign), e + 2.25);
          const c3 = cam(wpt(fr, -0.55, sign), e + 2.85), c4 = cam(wpt(fr, -1.45, sign), e + 2.85);
          poly(ctx, [c1, c2, c3, c4], '#ffffff');
          const z = (c1.Z + c2.Z) / 2, fs = 0.42 * f / z;
          if (fs >= 6) {
            ctx.fillStyle = '#c11'; ctx.font = `bold ${Math.round(fs)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(String(R), (sxOf(c1) + sxOf(c2)) / 2, (syOf(c1) + syOf(c4)) / 2 + fs * 0.05);
          }
        });
      }
    }
    // 木（外ラチの外と内馬場）。スタンドの前には置かない
    const hr = homeRange(tr);
    const step = 32;
    for (let kk = Math.ceil((sC - VIEW_FAR) / step); kk * step < sC - 3; kk++) {
      const s = kk * step, sm = ((s % L) + L) % L, id = Math.round(sm / step);
      const home = sm < hr[1] + 30 || sm > L + hr[0] - 30;
      const fr = frame(tr, s), e = elev(s);
      for (let side = 0; side < 2; side++) {
        if (side === 0 && home) continue;
        if (side === 1 && hash01(id, 31) < 0.45) continue;
        const u = side === 0 ? W + 9 + hash01(id, 1) * 10 : -10 - hash01(id, 2) * 14;
        const bq = cam(wpt(fr, u, sign), e);
        if (bq.Z < 2) continue;
        const hgt = 6 + hash01(id, 3 + side) * 5, rad = 2.6 + hash01(id, 5 + side) * 1.6;
        const k = f / bq.Z, x = sxOf(bq), y = syOf(bq);
        if (x < -rad * k * 1.2 || x > VW + rad * k * 1.2) continue;
        add(bq.Z, B => {
          B.trunk.rect(x - 0.18 * k, y - hgt * 0.55 * k, 0.36 * k, hgt * 0.55 * k);
          ell(B.crown, x, y - hgt * 0.7 * k, rad * k, hgt * 0.42 * k);
          ell(B.light, x - rad * 0.3 * k, y - hgt * 0.82 * k, rad * 0.5 * k, hgt * 0.2 * k);
        }, 'tree');
      }
    }
    // スタンド（ゴール前の外側）と内馬場の大きな画面
    {
      const U1 = W + 16;
      const sa = Math.max(hr[0], -150), sb = Math.min(hr[1], 420);
      for (let s0 = sa; s0 < sb - 5; s0 += 45) {
        const s1 = Math.min(sb, s0 + 45);
        const f0 = frame(tr, s0), f1 = frame(tr, s1), e0 = elev(s0), e1 = elev(s1);
        const p = (fr, u, e, h) => cam(wpt(fr, u, sign), e + h);
        const a = p(f0, U1, e0, 0), b = p(f1, U1, e1, 0);
        if (a.Z < NEAR && b.Z < NEAR) continue;
        const quad = (u, h0, u2, h1) => [p(f0, u, e0, h0), p(f1, u, e1, h0), p(f1, u2, e1, h1), p(f0, u2, e0, h1)];
        add(Math.max(a.Z, b.Z), B => {
          polyTo(B.p[0], quad(U1, 0, U1, 15.5));
          polyTo(B.p[1], quad(U1 + 0.1, 1.2, U1 + 0.1, 6.5));
          polyTo(B.p[2], quad(U1 + 0.1, 7.5, U1 + 0.1, 13));
          polyTo(B.p[3], quad(U1 - 5, 16, U1 + 4, 18.5));
          polyTo(B.p[4], quad(U1 - 5, 15.4, U1 - 5, 16.4));
        }, 'stand');
      }
      const sm = (sa + sb) / 2, s2 = sm + 30, s3 = sm - 30;
      const fa = frame(tr, s2), fb = frame(tr, s3);
      const a = cam(wpt(fa, -38, sign), elev(s2)), bq = cam(wpt(fb, -38, sign), elev(s3));
      if (a.Z > NEAR || bq.Z > NEAR) {
        add(Math.max(a.Z, bq.Z), () => {
          const p = (fr, s, h, u, dq) => cam(wpt(fr, u || -38, sign, dq), elev(s) + h);
          poly(ctx, [p(fa, s2, 4), p(fb, s3, 4), p(fb, s3, 15), p(fa, s2, 15)], '#1c2129');
          poly(ctx, [p(fa, s2, 0), p(fb, s3, 0), p(fb, s3, 4), p(fa, s2, 4)], '#555c66');
          poly(ctx, [p(fa, s2, 5, -38.05, 1), p(fb, s3, 5, -38.05, -1), p(fb, s3, 14, -38.05, -1), p(fa, s2, 14, -38.05, 1)], pal.overcast ? '#3d5a78' : '#3f6e9e');
        });
      }
    }
    // ゲート（発走前は中から見る。開いたら後ろへ流れる）
    if (camQ < 4) {
      const n = Math.max(horses.length, 2);
      const qB = -1.7, qF = 1.4, fB = frame(tr, D - qB), fF = frame(tr, D - qF), eB = elev(D - qB), eF = elev(D - qF);
      const uD = j => LANE0 + (j - 0.5) * GATE_P;
      const half = GATE_P / 2;
      const tl = view.tell; // 前触れ：灯がついてから 0.3 秒、扉が小さく鳴る
      const open = t > 0 ? clamp(t / 0.35, 0, 1) * 1.35 : tl != null && tl >= 0 && tl < 0.3 ? 0.035 * Math.sin(tl * 70) * (1 - tl / 0.3) : 0;
      const green = '#2f7d50', greenD = '#245f3d', white = '#e9ece8';
      for (let j = 0; j <= n; j++) {
        const u = uD(j);
        const pts = [cam(wpt(fB, u, sign), eB + 0.35), cam(wpt(fF, u, sign), eF + 0.35), cam(wpt(fF, u, sign), eF + 1.95), cam(wpt(fB, u, sign), eB + 1.95)];
        add(Math.max(pts[0].Z, pts[1].Z) + 0.05, () => {
          poly(ctx, pts, j === 0 || j === n ? greenD : green);
          line3(ctx, cam(wpt(fF, u, sign), eF), cam(wpt(fF, u, sign), eF + 2.85), 0.1, white);
          line3(ctx, cam(wpt(fB, u, sign), eB), cam(wpt(fB, u, sign), eB + 3.3), 0.1, white);
          line3(ctx, cam(wpt(fB, u, sign), eB + 3.1), cam(wpt(fF, u, sign), eF + 2.7), 0.08, white);
        });
      }
      // 扉（前）。t が 0 を過ぎると外へ開く
      for (let j = 0; j < n; j++) {
        for (const [hu, dir] of [[uD(j), 1], [uD(j + 1), -1]]) {
          const eu = hu + dir * half * Math.cos(open), eq = half * Math.sin(open);
          const pts = [cam(wpt(fF, hu, sign), eF + 0.5), cam(wpt(fF, eu, sign, eq), eF + 0.5), cam(wpt(fF, eu, sign, eq), eF + 1.75), cam(wpt(fF, hu, sign), eF + 1.75)];
          add(Math.max(pts[0].Z, pts[1].Z) + 0.02, () => {
            poly(ctx, pts, '#cdd4d8');
            line3(ctx, cam(wpt(fF, hu, sign), eF + 1.1), cam(wpt(fF, eu, sign, eq), eF + 1.1), 0.05, '#8d979e');
            line3(ctx, cam(wpt(fF, hu, sign), eF + 1.45), cam(wpt(fF, eu, sign, eq), eF + 1.45), 0.04, '#8d979e');
          });
        }
      }
      // 上の梁（前・後ろ）と枠の番号
      for (const [fr, e, isF] of [[fB, eB, false], [fF, eF, true]]) {
        const u0 = uD(0), u1 = uD(n), h0 = isF ? 2.5 : 3.05, h1 = isF ? 2.88 : 3.3;
        const pts = [cam(wpt(fr, u0, sign), e + h0), cam(wpt(fr, u1, sign), e + h0), cam(wpt(fr, u1, sign), e + h1), cam(wpt(fr, u0, sign), e + h1)];
        add(Math.min(pts[0].Z, pts[1].Z), () => {
          poly(ctx, pts, green);
          if (!isF) return;
          for (let j = 0; j < n; j++) {
            const uc = LANE0 + j * GATE_P;
            const a = cam(wpt(fr, uc - 0.16, sign, -0.02), e + 2.55), b = cam(wpt(fr, uc + 0.16, sign, -0.02), e + 2.55);
            const c = cam(wpt(fr, uc + 0.16, sign, -0.02), e + 2.83), d = cam(wpt(fr, uc - 0.16, sign, -0.02), e + 2.83);
            if (a.Z < NEAR) continue;
            poly(ctx, [a, b, c, d], '#ffffff');
            const fs = 0.24 * f / a.Z;
            if (fs >= 7) {
              ctx.fillStyle = '#111'; ctx.font = `bold ${Math.round(fs)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText(String(j + 1), (sxOf(a) + sxOf(b)) / 2, (syOf(a) + syOf(d)) / 2);
            }
          }
          // 前触れの灯（梁の上。開く少し前につく。race3d と同じ）
          const lit = view.tell != null && view.tell >= 0 && t < 0.4;
          for (let j = 0; j < n; j++) {
            const uc = LANE0 + j * GATE_P;
            const a = cam(wpt(fr, uc - 0.2, sign), e + 2.9), b = cam(wpt(fr, uc + 0.2, sign), e + 2.9);
            const c = cam(wpt(fr, uc + 0.2, sign), e + 3.12), d = cam(wpt(fr, uc - 0.2, sign), e + 3.12);
            if (a.Z < NEAR) continue;
            poly(ctx, [a, b, c, d], lit ? '#ff5a2a' : '#3a2420');
          }
        });
      }
    }
    // 馬
    const shown = [];
    for (let i = 0; i < horses.length; i++) {
      const h = horses[i];
      const isMe = h === me;
      const q = (h.x || 0) - BODY, s = D - q;
      const fr = frame(tr, s);
      const c = cam(wpt(fr, uH(h), sign), elev(s));
      // 傾き：コーナーで内へ、進路を変えると変える向きへ（見えない馬も覚えておく）
      const key = h.num != null ? h.num : i;
      const prevLane = mem.lanes.get(key);
      const vlat = dtt > 0 && prevLane != null ? ((h.lane || 0) - prevLane) / dtt : 0;
      mem.lanes.set(key, h.lane || 0);
      const v = h.v || 0;
      const tgt = gate ? 0 : clamp(fr.curv * v * v / 9.8 * 0.6, -0.16, 0.16) + clamp(-sign * vlat * LANE_M * 0.09, -0.14, 0.14);
      let lean = mem.leans.get(key);
      lean = lean == null ? tgt : lean + (tgt - lean) * Math.min(1, dtt * 5);
      mem.leans.set(key, lean);
      if (c.Z < 1.2 || c.Z > 280) continue;
      const k = f / c.Z, sx = sxOf(c), sy = syOf(c);
      if (sx < -k * 1.2 || sx > VW + k * 1.2) continue;
      const o = {
        ph: phOf(h), moving: movOf(h), v, coat: h.coat, silks: h.silks, cap: h.cap, num: h.num,
        marks: marksOf(h.name || String(h.num)), lean, hero: isMe, dust: pal.dirt || pal.wet >= 2, t,
      };
      // 自分の馬は同じ奥行きのものより手前に
      if (isMe || k >= SPR_K) add(c.Z - (isMe ? 0.01 : 0), () => drawRear(ctx, sx, sy, k, o, pal));
      else add(c.Z, () => blitHorse(ctx, sx, sy, k, o, pal, sprScale));
      shown.push({ i, sx, sy, k, z: c.Z });
    }

    list.sort((a, b) => b.z - a.z);
    let B = null, bk = null;
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (it.kind !== bk) { if (B) B.flush(ctx); B = it.kind ? BATCH[it.kind](pal) : null; bk = it.kind; }
      if (B) it.d(B); else it.d();
    }
    if (B) B.flush(ctx);
    ctx.restore();
    P = null;
    return { horses: shown };
  };
})();
