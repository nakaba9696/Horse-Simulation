// 馬主の「絵が無いときの顔」（SVG）。髪型・髪の色・目・服・小物を data/owners.js の face で決める
// 画面（js/ui/ownersui.js）と、Godot 版の顔の絵の書き出し（tools/owner_faces.js → godot/assets/owners/<id>_<表情>.svg）の両方で使う
// mood：normal・smile・happy・sad
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const F = HS.OwnerFace = {};
  const e = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let fid = 0;
  // 絵が読めないときの顔（SVG）
  F.svg = function (o, mood, size) {
    const f = o.face || {};
    mood = mood || 'normal';
    const id = 'of' + (++fid);
    const sk = f.skin || '#f6d7c0', hc = f.hair || '#2a2a30', cl = f.cloth || '#333', ac = f.accent || '#fff', ey = f.eyes || '#3a2a20';
    const ex = new Set(f.extras || []);
    const dark = shade(hc, -0.28), skD = shade(sk, -0.12), clD = shade(cl, -0.25);
    const p = [];
    // 地（勝負服の色をうすく）
    p.push(`<defs><radialGradient id="${id}b" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${shade(o.silks.base, 0.35)}"/><stop offset="1" stop-color="${shade(o.silks.base, -0.35)}"/></radialGradient>
      <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(hc, 0.18)}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>`);
    p.push(`<rect width="100" height="100" rx="18" fill="url(#${id}b)"/>`);
    const HAIR = `url(#${id}h)`;
    // 後ろ髪
    const st = f.style;
    if (st === 'long') p.push(`<path d="M24 40 C22 62 21 80 22 96 L78 96 C79 80 78 62 76 40 C74 18 26 18 24 40 Z" fill="${HAIR}"/>`);
    if (st === 'wavy') p.push(`<path d="M25 38 C18 52 22 60 18 70 C14 80 22 88 20 96 L80 96 C78 88 86 80 82 70 C78 60 82 52 75 38 C72 16 28 16 25 38 Z" fill="${HAIR}"/>`);
    if (st === 'bob') p.push(`<path d="M25 42 C22 56 23 66 26 72 C34 76 66 76 74 72 C77 66 78 56 75 42 C72 18 28 18 25 42 Z" fill="${HAIR}"/>`);
    if (st === 'ponytail') p.push(`<path d="M68 26 C86 26 92 44 88 60 C86 70 80 76 76 82 C80 70 82 58 76 46 Z" fill="${HAIR}"/>`);
    if (st === 'bun') p.push(`<circle cx="50" cy="15" r="10" fill="${HAIR}"/><path d="M42 12 C46 9 54 9 58 12" stroke="${dark}" stroke-width="1.2" fill="none"/>`);
    if (st === 'braids') p.push(`<path d="M25 42 C23 52 24 58 27 62 L73 62 C76 58 77 52 75 42 C72 18 28 18 25 42 Z" fill="${HAIR}"/>`);
    // 体と服
    p.push(`<path d="M12 100 C14 84 28 77 50 77 C72 77 86 84 88 100 Z" fill="${cl}"/>`);
    p.push(`<path d="M43 62 L57 62 L57 79 C53 82 47 82 43 79 Z" fill="${skD}"/>`);
    p.push(collar(f.collar, cl, clD, ac, sk));
    // 二本のおさげ（耳の下から肩の前へ。結び目は accent の色）
    if (st === 'braids') p.push([24.5, 75.5].map(x => [60, 67, 74, 81].map(y => `<ellipse cx="${x}" cy="${y}" rx="4.4" ry="4.2" fill="${HAIR}" stroke="${dark}" stroke-width=".6"/>`).join('') + `<circle cx="${x}" cy="86" r="2.4" fill="${ac}"/><path d="M${x - 3} 88 L${x} 95 L${x + 3} 88 Z" fill="${HAIR}"/>`).join(''));
    if (ex.has('necklace')) p.push(`<path d="M40 82 C45 89 55 89 60 82" stroke="${f.accent || '#e8d27a'}" stroke-width="1.4" fill="none"/><circle cx="50" cy="88.5" r="2.2" fill="${f.accent || '#e8d27a'}"/>`);
    // 耳と顔
    p.push(`<ellipse cx="28.5" cy="49" rx="3.6" ry="5" fill="${skD}"/><ellipse cx="71.5" cy="49" rx="3.6" ry="5" fill="${skD}"/>`);
    p.push(`<path d="M28 44 C28 26 38 21 50 21 C62 21 72 26 72 44 C72 58 64 69 50 69 C36 69 28 58 28 44 Z" fill="${sk}"/>`);
    if (ex.has('earring')) p.push(`<circle cx="28.5" cy="56" r="1.8" fill="#e8d27a"/><circle cx="71.5" cy="56" r="1.8" fill="#e8d27a"/>`);
    // ほお
    const blush = mood === 'happy' ? 0.55 : mood === 'smile' ? 0.42 : 0.28;
    p.push(`<ellipse cx="37" cy="57" rx="5" ry="2.6" fill="#ff8a8a" opacity="${blush}"/><ellipse cx="63" cy="57" rx="5" ry="2.6" fill="#ff8a8a" opacity="${blush}"/>`);
    if (ex.has('freckles')) p.push([[35, 55], [38, 56.5], [36.5, 58.5], [62, 56.5], [65, 55], [63.5, 58.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".7" fill="#b07050"/>`).join(''));
    if (ex.has('wrinkles')) p.push(`<path d="M31 50 l3 1 M31 53 l3 0 M69 50 l-3 1 M69 53 l-3 0 M42 27 C46 26 54 26 58 27" stroke="${skD}" stroke-width=".9" fill="none" stroke-linecap="round"/>`);
    // 目と眉
    p.push(eyes(f.eye, mood, ey, ex.has('lashes')));
    p.push(brows(f.brow, mood, shade(hc, f.style === 'gray' ? -0.35 : -0.1)));
    // 鼻と口
    p.push(`<path d="M50 52.5 l-1 3 l1.6 .3" stroke="${skD}" stroke-width=".9" fill="none" stroke-linecap="round"/>`);
    p.push(mouth(mood));
    if (ex.has('mustache')) p.push(`<path d="M41 59.5 C44 57 48 57.5 50 59 C52 57.5 56 57 59 59.5 C56 61 52 60.5 50 60 C48 60.5 44 61 41 59.5 Z" fill="${shade(hc, -0.2)}"/>`);
    // 前髪
    p.push(front(st, HAIR, dark));
    if (ex.has('headband')) p.push(`<path d="M27.5 33 C34 22 66 22 72.5 33" stroke="${ac}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    if (ex.has('bandana')) p.push(`<path d="M26 34 C30 18 70 18 74 34 C64 29 36 29 26 34 Z" fill="#d6463a"/><circle cx="40" cy="27" r="1" fill="#fff"/><circle cx="52" cy="25" r="1" fill="#fff"/><circle cx="62" cy="28" r="1" fill="#fff"/><path d="M73 31 L82 36 L76 39 Z" fill="#b8352b"/>`);
    if (ex.has('hairpin')) p.push(`<g transform="translate(62 17)">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-3" rx="2" ry="3" fill="#ffd1e0" transform="rotate(${a})"/>`).join('')}<circle r="1.4" fill="#f2b84b"/></g>`);
    if (ex.has('glasses-round')) p.push(`<g stroke="#7a6a4a" stroke-width="1.3" fill="rgba(255,255,255,.12)"><circle cx="41" cy="49.5" r="6.4"/><circle cx="59" cy="49.5" r="6.4"/><path d="M47.4 49 L52.6 49 M34.6 48 L29 46.5 M65.4 48 L71 46.5" fill="none"/></g>`);
    // 花輪（頭にのせた花の冠）：葉の輪に、白・桃・黄の花を交互に
    if (ex.has('wreath')) {
      const fl = ['#ffffff', '#ffb3c8', '#ffe07a'];
      const pts = [[25, 36], [30, 27], [37, 21], [45, 18], [55, 18], [63, 21], [70, 27], [75, 36]];
      p.push(`<path d="M24 38 C28 20 72 20 76 38" stroke="#4f8a3a" stroke-width="3.4" fill="none" stroke-linecap="round"/>`);
      p.push(pts.map(([x, y], i) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-2.3" rx="1.7" ry="2.4" fill="${fl[i % 3]}" transform="rotate(${a + i * 17})"/>`).join('')}<circle r="1.1" fill="${i % 3 === 2 ? '#e08a3a' : '#f2b84b'}"/></g>`).join(''));
    }
    // つばの広い帽子
    if (ex.has('hat')) p.push(`<path d="M10 33 C22 37 78 37 90 33 C86 39 70 41 50 41 C30 41 14 39 10 33 Z" fill="${f.hat || '#8a5a2e'}"/><path d="M30 34 C30 18 37 10 50 10 C63 10 70 18 70 34 C62 36 38 36 30 34 Z" fill="${f.hat || '#8a5a2e'}"/><path d="M30.5 30 C40 32.5 60 32.5 69.5 30" stroke="${ac}" stroke-width="2.4" fill="none"/>`);
    // 白いフリルの髪飾り（メイドの頭飾り）
    if (ex.has('maidcap')) p.push(`<path d="M30 30 C36 19 64 19 70 30 C64 27 36 27 30 30 Z" fill="#ffffff" stroke="#d8d8e0" stroke-width=".8"/>${[34, 40, 46, 52, 58, 64].map(x => `<circle cx="${x}" cy="${24 - Math.abs(x - 49) * 0.12}" r="2.6" fill="#ffffff" stroke="#d8d8e0" stroke-width=".6"/>`).join('')}`);
    if (ex.has('glasses')) p.push(`<g stroke="#222" stroke-width="1.4" fill="rgba(255,255,255,.1)"><rect x="33.5" y="44.5" width="14" height="10" rx="3"/><rect x="52.5" y="44.5" width="14" height="10" rx="3"/><path d="M47.5 48.5 L52.5 48.5 M33.5 48 L29 46.5 M66.5 48 L71 46.5" fill="none"/></g>`);
    const sz = size || 64;
    return `<svg class="oface" viewBox="0 0 100 100" width="${sz}" height="${sz}" role="img" aria-label="${e(o.name)}">${p.join('')}</svg>`;
  };
  function collar(kind, cl, clD, ac, sk) {
    if (kind === 'blazer') return `<path d="M42 78 L50 92 L58 78 Z" fill="${ac}"/><path d="M38 78 L50 100 L44 100 L32 82 Z M62 78 L50 100 L56 100 L68 82 Z" fill="${clD}"/><path d="M47 84 L50 90 L53 84 Z" fill="#b8323c"/>`;
    if (kind === 'kimono') return `<path d="M40 77 L56 100 L49 100 L35 80 Z" fill="${ac}"/><path d="M60 77 L50 92 L54 100 L65 80 Z" fill="${shade(ac, -0.1)}"/><rect x="24" y="95" width="52" height="5" fill="${clD}"/>`;
    if (kind === 'hoodie') return `<path d="M30 82 C34 74 66 74 70 82 C64 86 36 86 30 82 Z" fill="${clD}"/><path d="M45 85 L44 96 M55 85 L56 96" stroke="#f4f4f4" stroke-width="1.3"/>`;
    if (kind === 'shirt') return `<path d="M43 78 L50 100 L57 78 Z" fill="${ac}"/><path d="M43 78 L47 86 L50 80 L53 86 L57 78" fill="${ac}" stroke="${shade(ac, -0.2)}" stroke-width=".8"/><path d="M36 79 L48 100 L42 100 L31 84 Z M64 79 L52 100 L58 100 L69 84 Z" fill="${clD}"/>`;
    if (kind === 'overall') return `<path d="M38 79 C44 84 56 84 62 79 L64 100 L36 100 Z" fill="${ac}"/><rect x="38" y="88" width="24" height="12" rx="2" fill="${cl}"/><path d="M38 89 L32 79 M62 89 L68 79" stroke="${cl}" stroke-width="3.2"/><circle cx="41" cy="91" r="1.2" fill="#e8d27a"/><circle cx="59" cy="91" r="1.2" fill="#e8d27a"/>`;
    if (kind === 'dress') return `<path d="M36 79 C42 90 58 90 64 79 C60 78 40 78 36 79 Z" fill="${sk}"/>`;
    return '';
  }
  function eyes(kind, mood, col, lashes) {
    const one = (cx, side) => {
      if (mood === 'happy' && kind !== 'narrow') return `<path d="M${cx - 5} ${51} Q${cx} ${45} ${cx + 5} ${51}" stroke="#2a1a14" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      if (kind === 'narrow') return mood === 'sad' ? `<path d="M${cx - 4} 49 Q${cx} 52 ${cx + 4} 49" stroke="#2a1a14" stroke-width="1.8" fill="none" stroke-linecap="round"/>` : `<path d="M${cx - 4.5} 51 Q${cx} 46.5 ${cx + 4.5} 51" stroke="#2a1a14" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
      const ry = kind === 'sharp' ? 5 : kind === 'soft' ? 5.6 : 6.2, rx = kind === 'sharp' ? 5.2 : 5;
      const cy = 50.5, ir = kind === 'sharp' ? 3.7 : 4.1;
      let s = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff"/><circle cx="${cx}" cy="${cy + 0.6}" r="${ir}" fill="${col}"/><circle cx="${cx}" cy="${cy + 0.8}" r="${ir * 0.5}" fill="#120c0a"/><circle cx="${cx - 1.4}" cy="${cy - 1.3}" r="1.35" fill="#fff"/><circle cx="${cx + 1.5}" cy="${cy + 2}" r=".6" fill="#fff"/>`;
      // 上のまぶた（目の形で傾きを変える）
      const tilt = kind === 'sharp' ? (side < 0 ? -1.6 : 1.6) * -1 : kind === 'soft' ? (side < 0 ? 1 : -1) : 0;
      s += `<path d="M${cx - rx - 0.6} ${cy - ry * 0.35 + tilt} Q${cx} ${cy - ry - 1.6} ${cx + rx + 0.6} ${cy - ry * 0.35 - tilt}" stroke="#1e1410" stroke-width="${lashes ? 2.2 : 1.7}" fill="none" stroke-linecap="round"/>`;
      if (lashes) s += `<path d="M${cx + side * (rx + 0.4)} ${cy - ry * 0.4} l${side * 2} -1.6" stroke="#1e1410" stroke-width="1.3" stroke-linecap="round"/>`;
      if (mood === 'sad') s += `<path d="M${cx - 3} ${cy + ry + 1} Q${cx} ${cy + ry + 2} ${cx + 3} ${cy + ry + 1}" stroke="#7a5a50" stroke-width=".8" fill="none"/>`;
      return s;
    };
    return one(41, -1) + one(59, 1);
  }
  function brows(kind, mood, col) {
    const w = kind === 'thick' ? 2.6 : 1.5;
    const lift = mood === 'sad' ? 2 : mood === 'happy' ? -0.8 : 0;
    const L = `M35 ${41 - lift * -0.2} Q40 ${38.6 - lift * 0.2} 46 ${40.4 - lift}`, Rr = `M54 ${40.4 - lift} Q60 ${38.6 - lift * 0.2} 65 ${41 - lift * -0.2}`;
    return `<path d="${L}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"/><path d="${Rr}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  }
  function mouth(mood) {
    if (mood === 'happy') return `<path d="M44 60.5 Q50 61 56 60.5 Q55 66.5 50 66.5 Q45 66.5 44 60.5 Z" fill="#9a3a3a"/><path d="M46.5 64.4 Q50 62.6 53.5 64.4 Q52 66.2 50 66.2 Q48 66.2 46.5 64.4 Z" fill="#ff8a8a"/>`;
    if (mood === 'smile') return `<path d="M45 61 Q50 64.6 55 61" stroke="#8a3a3a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    if (mood === 'sad') return `<path d="M46 63.4 Q50 60.8 54 63.4" stroke="#8a3a3a" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    return `<path d="M46.5 61.4 Q50 63.2 53.5 61.4" stroke="#8a3a3a" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  }
  function front(st, HAIR, dark) {
    if (st === 'long') return `<path d="M27 46 C26 24 38 17 50 17 C63 17 75 24 73 46 L69 35 L63 39 L58 30 L50 37 L43 30 L37 38 L31 34 Z" fill="${HAIR}"/><path d="M27 42 C25 56 26 66 29 74 L32 52 Z M73 42 C75 56 74 66 71 74 L68 52 Z" fill="${HAIR}"/>`;
    if (st === 'wavy') return `<path d="M27 47 C24 24 40 16 52 17 C66 18 76 27 73 46 C70 38 66 33 60 31 C56 36 48 37 42 33 C38 38 32 41 27 47 Z" fill="${HAIR}"/><path d="M27 44 C22 54 27 60 24 68 L31 56 Z M73 44 C78 54 73 60 76 68 L69 56 Z" fill="${HAIR}"/>`;
    if (st === 'bob' || st === 'braids') return `<path d="M26 50 C24 26 38 18 50 18 C64 18 76 26 74 50 L70 38 C64 34 58 30 54 26 C50 33 40 37 30 38 Z" fill="${HAIR}"/><path d="M26 46 C25 58 26 66 28 72 L31 50 Z M74 46 C75 58 74 66 72 72 L69 50 Z" fill="${HAIR}"/>`;
    if (st === 'ponytail') return `<path d="M27 45 C26 24 38 18 50 18 C63 18 74 24 73 44 L68 34 L61 37 L56 29 L49 36 L44 28 L37 36 L31 33 Z" fill="${HAIR}"/><path d="M27 42 L27 54 L31 46 Z M73 42 L73 54 L69 46 Z" fill="${HAIR}"/>`;
    if (st === 'bun') return `<path d="M27 44 C26 26 38 20 50 20 C62 20 74 26 73 44 C70 34 64 28 52 28 C48 32 38 36 30 37 Z" fill="${HAIR}"/><path d="M28 40 C27 50 28 56 30 60 L31 44 Z" fill="${HAIR}"/>`;
    if (st === 'short') return `<path d="M27 44 C25 22 38 16 51 16 C64 16 76 22 73 44 L70 34 L66 37 L63 30 L57 34 L54 27 L48 33 L43 27 L39 34 L34 30 L31 37 Z" fill="${HAIR}"/><path d="M28 40 L28 50 L30.5 44 Z M72 40 L72 50 L69.5 44 Z" fill="${dark}"/>`;
    if (st === 'gray') return `<path d="M28 46 C26 36 28 30 32 27 C30 34 31 40 31 46 Z M72 46 C74 36 72 30 68 27 C70 34 69 40 69 46 Z" fill="${HAIR}"/><path d="M33 26 C40 20 60 20 67 26 C60 23.5 48 23 40 25.5 C37 26.5 35 27 33 26 Z" fill="${HAIR}"/>`;
    return '';
  }
  // 色を明るく（+）・暗く（-）
  function shade(hex, k) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex;
    const n = parseInt(m[1], 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = c => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k));
    r = f(r); g = f(g); b = f(b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  F.shade = shade;
})();
