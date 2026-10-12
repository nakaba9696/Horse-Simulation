// 絵：馬（毛色・白徴・走りの動き）・騎手（勝負服）・ゼッケン・勝負服の札・馬の肖像
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U;
  const A = HS.Art = {};

  // 毛色ごとの色 [体, 体の影, たてがみ・尾, 脚先]
  A.COAT = {
    '鹿毛': ['#8a4f24', '#5e3415', '#1a120d', '#1a120d'],
    '黒鹿毛': ['#4b2a17', '#2e190c', '#120c08', '#120c08'],
    '青鹿毛': ['#2c1c14', '#1a100a', '#0b0807', '#0b0807'],
    '青毛': ['#191717', '#0d0c0c', '#050505', '#050505'],
    '栗毛': ['#b4602a', '#87421a', '#c9783c', '#9c5326'],
    '栃栗毛': ['#7a3a1a', '#55260f', '#4a2410', '#55260f'],
    '芦毛': ['#c3c6ca', '#8d9196', '#7a7f86', '#5d6166'],
    '白毛': ['#f4f3ef', '#cfccc4', '#e2dfd8', '#d8d4cc'],
    '粕毛': ['#a07a62', '#7a5a46', '#3a2a20', '#3a2a20'],
    '月毛': ['#d8b57a', '#b08f58', '#efe0bd', '#c4a06a'],
    '河原毛': ['#c9a96e', '#9f8250', '#2a2018', '#2a2018'],
    '佐目毛': ['#efe4cc', '#cdbf9f', '#f2ead8', '#e6dac0'],
  };
  A.coat = c => A.COAT[c] || A.COAT['鹿毛'];

  // 馬ごとの白徴（流星・白い靴下）を名前から決める
  A.marks = function (key) {
    const r = U.hashRng('marks:' + key);
    return {
      blaze: r.pick(['none', 'none', 'star', 'stripe', 'blaze']),
      socks: [r.chance(0.25), r.chance(0.2), r.chance(0.3), r.chance(0.25)], // 前左・前右・後左・後右
    };
  };

  // 1本の脚（上・下の2節、先細り）。角度はラジアン、下向きが0
  function seg(ctx, x1, y1, x2, y2, w1, w2) {
    const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
    ctx.beginPath();
    ctx.moveTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); ctx.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2);
    ctx.arc(x2, y2, w2 / 2, a + Math.PI / 2, a - Math.PI / 2, true);
    ctx.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2);
    ctx.arc(x1, y1, w1 / 2, a - Math.PI / 2, a + Math.PI / 2, true);
    ctx.closePath(); ctx.fill();
  }
  function leg(ctx, x, y, a1, a2, l1, l2, w, col, hoof, sock, hind) {
    const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
    const fx = kx + Math.sin(a1 + a2) * l2, fy = ky + Math.cos(a1 + a2) * l2;
    ctx.fillStyle = col;
    seg(ctx, x, y, kx, ky, w * (hind ? 1.5 : 1.2), w * 0.62);
    seg(ctx, kx, ky, fx, fy, w * 0.55, w * 0.42);
    if (sock) { ctx.fillStyle = '#f5f2ea'; seg(ctx, kx + (fx - kx) * 0.5, ky + (fy - ky) * 0.5, fx, fy, w * 0.5, w * 0.44); }
    ctx.fillStyle = hoof; ctx.beginPath(); ctx.ellipse(fx + Math.sin(a1 + a2) * 1.0, fy + 0.6, w * 0.36, w * 0.26, a1 + a2, 0, Math.PI * 2); ctx.fill();
  }

  // 走る馬（右向き）。x,y＝地面の足元の中心、s＝大きさ（1で体長およそ100px）、ph＝走りの位相 0〜1
  // o: { coat, marks, silks:{base,sub,pattern}, cap, num, cloth, jockey:true, shadow:true, alpha }
  A.horse = function (ctx, x, y, s, ph, o) {
    o = o || {};
    const C = A.coat(o.coat);
    const mk = o.marks || { blaze: 'none', socks: [false, false, false, false] };
    const T = Math.PI * 2;
    const bob = -Math.abs(Math.sin(ph * T)) * 3 + 1.5;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.shadow !== false) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(0, 1, 48, 6, 0, 0, T); ctx.fill();
    }
    ctx.translate(0, bob);
    // 脚の振り（回転襲歩：後左・後右・前左・前右の順に着地）
    const legA = (p, fore) => {
      const c = Math.cos((ph + p) * T), sn = Math.sin((ph + p) * T);
      const a1 = (fore ? 0.15 : -0.1) + c * (fore ? 0.62 : 0.55);
      const a2 = fore ? -Math.max(0, sn) * 1.5 - 0.05 : Math.max(0, -sn) * 1.2 + 0.1;
      return [a1, a2];
    };
    const far = (fore, p, sock) => { const [a1, a2] = legA(p, fore); leg(ctx, fore ? 24 : -24, -32, a1, a2, 19, 19, 6.5, C[1], '#222', sock, !fore); };
    const near = (fore, p, sock) => { const [a1, a2] = legA(p, fore); leg(ctx, fore ? 22 : -26, -31, a1, a2, 19, 19, 7, C[0], '#1b1b1b', sock, !fore); };
    // 奥の脚
    far(false, 0.1, mk.socks[3]); far(true, 0.5, mk.socks[1]);
    // 尾
    ctx.fillStyle = C[2];
    ctx.beginPath();
    const tw = Math.sin(ph * T) * 4;
    ctx.moveTo(-33, -40); ctx.quadraticCurveTo(-52, -40 + tw, -60, -24 + tw); ctx.quadraticCurveTo(-50, -30 + tw, -36, -33); ctx.closePath(); ctx.fill();
    // 胴
    const g = ctx.createLinearGradient(0, -48, 0, -18);
    g.addColorStop(0, C[0]); g.addColorStop(1, C[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-34, -36);
    ctx.bezierCurveTo(-36, -48, -18, -48, 0, -45);
    ctx.bezierCurveTo(14, -44, 24, -48, 30, -44);
    ctx.bezierCurveTo(38, -38, 36, -24, 26, -22);
    ctx.bezierCurveTo(10, -18, -12, -18, -26, -22);
    ctx.bezierCurveTo(-36, -24, -38, -30, -34, -36);
    ctx.closePath(); ctx.fill();
    // 筋肉の陰影（肩・尻）と背の光
    ctx.save(); ctx.clip();
    const hl = ctx.createRadialGradient(-18, -42, 2, -18, -38, 18);
    hl.addColorStop(0, 'rgba(255,255,255,0.22)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.fillRect(-40, -50, 40, 30);
    const hl2 = ctx.createRadialGradient(22, -40, 2, 22, -36, 14);
    hl2.addColorStop(0, 'rgba(255,255,255,0.16)'); hl2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl2; ctx.fillRect(6, -50, 34, 30);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0, -18, 30, 6, 0, 0, T); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-20, -32, 13, -0.4, 1.6); ctx.stroke();
    ctx.restore();
    // 首と頭（前に伸ばす）
    ctx.beginPath();
    ctx.moveTo(22, -46);
    ctx.bezierCurveTo(30, -58, 42, -66, 50, -66);
    ctx.lineTo(62, -58);
    ctx.bezierCurveTo(66, -55, 66, -51, 62, -50);
    ctx.lineTo(53, -52);
    ctx.bezierCurveTo(46, -50, 40, -40, 34, -30);
    ctx.closePath(); ctx.fill();
    // たてがみ
    ctx.fillStyle = C[2];
    ctx.beginPath(); ctx.moveTo(23, -47); ctx.bezierCurveTo(31, -60, 41, -68, 50, -67); ctx.lineTo(48, -63); ctx.bezierCurveTo(40, -62, 32, -55, 27, -45); ctx.closePath(); ctx.fill();
    // 耳・目・鼻
    ctx.fillStyle = C[1]; ctx.beginPath(); ctx.moveTo(49, -66); ctx.lineTo(51, -72); ctx.lineTo(53, -65); ctx.fill();
    ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(55, -61, 1.3, 0, T); ctx.fill();
    // 白徴（顔）
    if (mk.blaze !== 'none') {
      ctx.fillStyle = '#f7f4ec';
      if (mk.blaze === 'star') { ctx.beginPath(); ctx.arc(54, -64, 1.8, 0, T); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(53, -65); ctx.lineTo(56, -66); ctx.lineTo(63, -55); ctx.lineTo(mk.blaze === 'blaze' ? 58 : 60, -54); ctx.closePath(); ctx.fill(); }
    }
    // メンコ（耳覆い）は無し。手綱
    ctx.strokeStyle = '#3a2618'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(58, -55); ctx.lineTo(30, -52); ctx.stroke();
    // ゼッケン
    if (o.num != null) {
      ctx.fillStyle = o.cloth || '#ffffff';
      ctx.beginPath(); ctx.moveTo(-17, -45); ctx.lineTo(3, -45); ctx.lineTo(4, -29); ctx.lineTo(-19, -29); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = o.clothText || '#111';
      ctx.font = 'bold 11px "Noto Sans JP", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(o.num), -7.5, -36.5);
    }
    // 鞍
    ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(1, -45.5, 9, 2.6, -0.05, 0, T); ctx.fill();
    // 手前の脚
    near(false, 0.0, mk.socks[2]); near(true, 0.4, mk.socks[0]);
    // 騎手
    if (o.jockey !== false) A.jockey(ctx, ph, o.silks, o.cap);
    ctx.restore();
  };

  // 勝負服の模様を塗る（パスを作ってから呼ぶ）
  function fillSilks(ctx, silks, bx, by, bw, bh) {
    const sk = silks || { base: '#1f4fbf', sub: '#ffd23f', pattern: 'plain' };
    ctx.save(); ctx.clip();
    ctx.fillStyle = sk.base; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = sk.sub;
    const p = sk.pattern;
    if (p === 'hoops') for (let i = 0; i < 6; i++) ctx.fillRect(bx, by + i * bh / 6 * 1, bw, bh / 12);
    else if (p === 'stripes') for (let i = 0; i < 8; i++) ctx.fillRect(bx + i * bw / 8, by, bw / 16, bh);
    else if (p === 'sash') { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw * 0.35, by); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw * 0.65, by + bh); ctx.closePath(); ctx.fill(); }
    else if (p === 'cross') { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw * 0.25, by); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw * 0.75, by + bh); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(bx + bw, by); ctx.lineTo(bx + bw * 0.75, by); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + bw * 0.25, by + bh); ctx.closePath(); ctx.fill(); }
    else if (p === 'diamonds') for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) { const cx = bx + (i + 0.5) * bw / 4, cy = by + (j + 0.5) * bh / 4; ctx.beginPath(); ctx.moveTo(cx, cy - bh / 8); ctx.lineTo(cx + bw / 8, cy); ctx.lineTo(cx, cy + bh / 8); ctx.lineTo(cx - bw / 8, cy); ctx.closePath(); ctx.fill(); }
    else if (p === 'stars') for (let i = 0; i < 5; i++) { const cx = bx + ((i * 37) % 100) / 100 * bw, cy = by + ((i * 53) % 100) / 100 * bh; star(ctx, cx, cy, Math.min(bw, bh) * 0.12); }
    else if (p === 'halves') ctx.fillRect(bx + bw / 2, by, bw / 2, bh);
    else if (p === 'yoke') ctx.fillRect(bx, by, bw, bh * 0.3);
    ctx.restore();
  }
  function star(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }
  A.SILK_PATTERNS = { plain: '無地', hoops: '横縞', stripes: '縦縞', sash: 'たすき', cross: '十字たすき', diamonds: 'ダイヤ', stars: '星', halves: '左右', yoke: '肩' };

  // 騎手（馬の上にかがむ）
  A.jockey = function (ctx, ph, silks, cap) {
    const T = Math.PI * 2;
    const push = Math.sin(ph * T * 2) * 1.2;
    // 脚（白いズボン・黒い長靴）
    ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -51); ctx.lineTo(10, -47); ctx.stroke();
    ctx.strokeStyle = '#151515'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(10, -47); ctx.lineTo(8, -41); ctx.stroke();
    // 胴（勝負服）
    ctx.beginPath();
    ctx.moveTo(-4, -52 + push * 0.2);
    ctx.bezierCurveTo(-2, -62, 10, -66, 18, -63 + push * 0.3);
    ctx.lineTo(20, -57);
    ctx.bezierCurveTo(12, -54, 6, -50, 2, -48);
    ctx.closePath();
    fillSilks(ctx, silks, -6, -68, 28, 22);
    // 腕（袖）
    ctx.strokeStyle = (silks && silks.sub) || '#ffd23f'; ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.moveTo(15, -61); ctx.lineTo(26 + push, -56); ctx.lineTo(31 + push, -53); ctx.stroke();
    ctx.fillStyle = '#e9c9a8'; ctx.beginPath(); ctx.arc(32 + push, -53, 1.6, 0, T); ctx.fill();
    // 頭と帽子（枠の色）
    ctx.fillStyle = '#e9c9a8'; ctx.beginPath(); ctx.arc(21, -66, 3.4, 0, T); ctx.fill();
    ctx.fillStyle = cap || '#ffffff';
    ctx.beginPath(); ctx.arc(21, -67.2, 3.8, Math.PI, 0); ctx.fill();
    ctx.fillRect(21, -67.6, 5.5, 1.4);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(21, -67.2, 3.8, Math.PI, 0); ctx.stroke();
  };

  // 勝負服の札（小さな服の絵）
  A.silksIcon = function (canvas, silks) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save(); ctx.scale(w / 40, h / 40);
    ctx.beginPath();
    ctx.moveTo(12, 5); ctx.lineTo(28, 5); ctx.lineTo(38, 12); ctx.lineTo(34, 20); ctx.lineTo(29, 17); ctx.lineTo(29, 36); ctx.lineTo(11, 36); ctx.lineTo(11, 17); ctx.lineTo(6, 20); ctx.lineTo(2, 12); ctx.closePath();
    fillSilks(ctx, silks, 0, 4, 40, 33);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  };

  // 口取り（重賞を勝ったときの記念の絵）
  A.winner = function (canvas, horse, silks, title, sub) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    // スタンドと観客
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1d2b45'); bg.addColorStop(0.55, '#33405c'); bg.addColorStop(0.56, '#3d7d36'); bg.addColorStop(1, '#2a5a25');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const r = U.hashRng('crowd:' + title);
    for (let i = 0; i < 900; i++) {
      const x = r.float(0, w), y = r.float(h * 0.12, h * 0.55);
      ctx.fillStyle = r.pick(['#c9b8a6', '#e8d6c0', '#3b3f52', '#8a6d5a', '#f2f2f2', '#c83a3a', '#3a6bc8', '#e0c040']);
      ctx.beginPath(); ctx.arc(x, y, r.float(1.5, 3.2) * w / 960, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(10,18,32,0.35)'; ctx.fillRect(0, 0, w, h * 0.56);
    // 光
    const glow = ctx.createRadialGradient(w / 2, h * 0.6, 10, w / 2, h * 0.6, w * 0.5);
    glow.addColorStop(0, 'rgba(255,230,160,0.35)'); glow.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    const s = Math.min(w / 215, h / 135);
    const x = w * 0.5, y = h * 0.9;
    A.horse(ctx, x, y, s, 0.18, { coat: horse.coat, marks: A.marks(horse.name || horse.id), silks, cap: '#ffffff' });
    // レイ（花の首飾り）
    ctx.save(); ctx.translate(x, y + (Math.abs(Math.sin(0.18 * Math.PI * 2)) * -3 + 1.5) * s); ctx.scale(s, s);
    const cols = ['#e83b5a', '#ffd34d', '#ffffff', '#ff8fb1', '#7fd06b'];
    for (let i = 0; i <= 26; i++) {
      const t = i / 26;
      const px = 26 + Math.sin(t * Math.PI) * 9 + t * 12, py = -54 + t * 30 + Math.sin(t * Math.PI) * 6;
      ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // 帯
    ctx.fillStyle = 'rgba(10,22,38,0.85)'; ctx.fillRect(0, h * 0.04, w, h * 0.17);
    ctx.fillStyle = '#d6ad3c'; ctx.fillRect(0, h * 0.04, w, 3); ctx.fillRect(0, h * 0.21 - 3, w, 3);
    ctx.fillStyle = '#f3d27a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(h * 0.075)}px "Noto Serif JP", serif`;
    ctx.fillText(title, w / 2, h * 0.11);
    ctx.fillStyle = '#e8eef6'; ctx.font = `700 ${Math.round(h * 0.04)}px "Noto Sans JP", sans-serif`;
    ctx.fillText(sub || '', w / 2, h * 0.175);
  };

  // 肖像（牧場の背景に、立ち止まり気味に走る馬）
  A.portrait = function (canvas, horse, silks) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#7fb6e8'); sky.addColorStop(0.55, '#cfe6f5'); sky.addColorStop(0.56, '#6fa94a'); sky.addColorStop(1, '#3f7a2c');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // 遠くの山と柵
    ctx.fillStyle = '#5d8fb0'; ctx.beginPath(); ctx.moveTo(0, h * 0.56);
    for (let i = 0; i <= 8; i++) ctx.lineTo(w * i / 8, h * (0.42 + ((i * 37) % 7) / 60));
    ctx.lineTo(w, h * 0.56); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f4efe2'; ctx.lineWidth = Math.max(1.5, h / 90);
    for (const yy of [0.62, 0.68]) { ctx.beginPath(); ctx.moveTo(0, h * yy); ctx.lineTo(w, h * yy); ctx.stroke(); }
    for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(w * i / 9, h * 0.6); ctx.lineTo(w * i / 9, h * 0.7); ctx.stroke(); }
    const s = Math.min(w / 190, h / 120);
    A.horse(ctx, w * 0.5, h * 0.74, s, 0.18, { coat: horse.coat, marks: A.marks(horse.name || horse.id), jockey: false, shadow: true });
    // 毛色の札
    ctx.fillStyle = 'rgba(12,26,43,0.75)'; ctx.fillRect(8, 8, 64, 22);
    ctx.fillStyle = '#f3d27a'; ctx.font = 'bold 13px "Noto Sans JP", sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(horse.coat || '鹿毛', 14, 19);
    void silks;
  };
})();
