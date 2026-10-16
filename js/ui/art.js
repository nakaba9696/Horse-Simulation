// 絵：馬（毛色・白徴・走りの動き）・騎手（勝負服）・ゼッケン・勝負服の札・馬の肖像
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U;
  const A = HS.Art = {};

  // 毛色の表（2D の絵・肖像・3D のレースで同じものを使う）
  //   body 体 / top 背の濃い所 / belly 腹 / mane たてがみ / tail 尾 / points 脚先（膝・飛節から下）/ muzzle 鼻先 / hoof 蹄
  //   tan 明るく抜ける所（黒鹿毛・青鹿毛の鼻先・腹・肘）/ gloss 毛づやの光り 0〜1 / pointsSoft 脚先へゆるやかに変わる
  //   芦毛は young（若い）と old（年を取って白い）の間を年齢で動き、まだら（dapple）は若いうちに出る
  A.COAT_LOOK = {
    '鹿毛': { body: '#7d4322', top: '#5a2e15', belly: '#8f5531', mane: '#16100c', tail: '#16100c', points: '#17110d', muzzle: '#3b2519', hoof: '#26211d', gloss: 0.55 },
    '黒鹿毛': { body: '#432617', top: '#2c180d', belly: '#55331e', mane: '#0f0b09', tail: '#0f0b09', points: '#110c0a', muzzle: '#6a4128', hoof: '#201c19', tan: '#6e4328', gloss: 0.6 },
    '青鹿毛': { body: '#261913', top: '#170f0b', belly: '#2e1f17', mane: '#0a0807', tail: '#0a0807', points: '#0b0908', muzzle: '#4a3020', hoof: '#1c1916', tan: '#47301f', gloss: 0.65 },
    '青毛': { body: '#161516', top: '#0d0c0d', belly: '#1a1919', mane: '#070707', tail: '#070707', points: '#090909', muzzle: '#222020', hoof: '#1a1817', gloss: 0.8 },
    '栗毛': { body: '#a9592a', top: '#8b4620', belly: '#b86a3a', mane: '#b8692f', tail: '#a85d2a', points: '#97501f', muzzle: '#8a4b2c', hoof: '#3a3027', gloss: 0.55, pointsSoft: true },
    '栃栗毛': { body: '#5f2f18', top: '#4a2312', belly: '#6c3820', mane: '#7c4a2a', tail: '#6e3f22', points: '#552a16', muzzle: '#4f2a18', hoof: '#2e2620', gloss: 0.55, pointsSoft: true },
    '芦毛': {
      grey: true,
      young: { body: '#6c6e72', top: '#55575b', belly: '#7a7c80', mane: '#3e4044', tail: '#45474b', points: '#35373a', muzzle: '#2e2e30', hoof: '#26231f', dappleCol: '#a7aaae' },
      old: { body: '#d8d9d6', top: '#c6c8c6', belly: '#e2e2de', mane: '#c4c4c0', tail: '#b9bab6', points: '#a9abab', muzzle: '#3a393a', hoof: '#2e2a26', dappleCol: '#ecebe6' },
      gloss: 0.35,
    },
    '白毛': { body: '#f3f1ec', top: '#e4e1da', belly: '#f6f4ef', mane: '#f0ede6', tail: '#ece8e0', points: '#ebe7df', muzzle: '#d9b4aa', hoof: '#cbbca3', gloss: 0.3, pointsSoft: true },
    '粕毛': { body: '#8c6c5c', top: '#6e5040', belly: '#977a6a', mane: '#1c1410', tail: '#1c1410', points: '#1c1410', muzzle: '#4a3020', hoof: '#26211d', roan: 1, gloss: 0.35 },
    '月毛': { body: '#d6b06a', top: '#c39b56', belly: '#e0bd7c', mane: '#f1e5c7', tail: '#ece0c0', points: '#c9a35e', muzzle: '#8d6a50', hoof: '#6b5a48', gloss: 0.5, pointsSoft: true },
    '河原毛': { body: '#c9a465', top: '#a8844a', belly: '#d4b278', mane: '#1d1712', tail: '#1d1712', points: '#1d1712', muzzle: '#3a2c20', hoof: '#26211d', gloss: 0.45 },
    '佐目毛': { body: '#efe3c8', top: '#e3d5b6', belly: '#f3e9d3', mane: '#f5eedf', tail: '#f2eadb', points: '#ebdfc4', muzzle: '#dcb7a6', hoof: '#cbbca3', gloss: 0.3, pointsSoft: true },
  };
  const mixHex = (a, b, t) => {
    const p = x => [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)];
    const A = p(a), B = p(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  // 毛色の色（age＝満年齢。芦毛は2歳で濃く、年を取るほど白い。わからなければ4歳）
  A.coatLook = function (c, age) {
    const L = A.COAT_LOOK[c] || A.COAT_LOOK['鹿毛'];
    if (!L.grey) return L;
    const a = age == null || !isFinite(age) ? 4 : age;
    const w = Math.max(0, Math.min(1, (a - 1.5) / 7));
    const out = { gloss: L.gloss, grey: true, dapple: 0.9 * Math.max(0, 1 - Math.abs(w - 0.35) / 0.45), pointsSoft: true };
    for (const k of Object.keys(L.young)) out[k] = mixHex(L.young[k], L.old[k], w);
    return out;
  };
  // 毛色ごとの色 [体, 体の影, たてがみ・尾, 脚先]（上の表から作る。2D の絵で使う）
  A.coat = (c, age) => { const L = A.coatLook(c, age); return [L.body, L.top, L.mane, L.points]; };
  A.COAT = {};
  for (const k of Object.keys(A.COAT_LOOK)) A.COAT[k] = A.coat(k);

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
