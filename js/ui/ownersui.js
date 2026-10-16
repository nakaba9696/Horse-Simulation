// 馬主の画面：ホームの「騎乗依頼」の札・馬主の一覧と詳しい画面・ご褒美の場面・パドックとレースの後のひと言・顔の絵（SVG）
// 仕組みは js/core/owners.js。騎乗中には文字を出さない（パドックの前と、レースの結果のあとだけ）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World, R = HS.Races, UI = HS.UI, App = HS.App, J = HS.Jockey, O = HS.Owners, A = HS.Art;
  if (!O || !UI || !App) return;
  const S = UI.screens;
  const e = U.esc;

  // ---------- 顔の絵（画像ファイルは使わず SVG で描く。髪型・髪の色・目・服を馬主ごとに） ----------
  // mood：normal・smile・happy・sad
  let fid = 0;
  // 持ち主が作った顔の絵（assets/owners_<id>.js。HS.ASSETS['owner_<id>_<表情>']）。x・y は顔の中心（絵の幅・高さに対する％）、w は丸い枠に入れる幅（％）
  const PHOTO_POS = { takenouchi: [48, 14], saginomiya: [52, 23], makino: [50, 19], kirishima: [48, 17], sengoku: [51, 15], hanabusa: [47, 19], takarada: [53, 17] };
  const PHOTO_MOOD = { normal: 'base', smile: 'smile', happy: 'joy', sad: 'sad' };
  UI.ownerPhoto = (o, mood) => { const A0 = HS.ASSETS || {}; return A0['owner_' + o.id + '_' + (PHOTO_MOOD[mood] || 'base')] || A0['owner_' + o.id + '_base'] || null; };
  UI.ownerFace = function (o, mood, size) {
    const src = UI.ownerPhoto(o, mood || 'normal');
    if (src) {
      const sz = size || 64;
      // 大きい絵（ご褒美の場面・一人ずつの画面）は胸から上、小さいときは顔のあたりを丸い枠に切り抜く
      if (sz >= 160) return `<div class="oface photo big" role="img" aria-label="${e(o.name)}" style="width:${sz}px;height:${Math.round(sz * 1.25)}px;background-image:url('${src}')"></div>`;
      const [x, y] = PHOTO_POS[o.id] || [50, 12], bw = sz / 0.32, bh = bw * 1.25;
      return `<div class="oface photo" role="img" aria-label="${e(o.name)}" style="width:${sz}px;height:${sz}px;background-image:url('${src}');background-size:${bw.toFixed(1)}px ${bh.toFixed(1)}px;background-position:${(sz / 2 - x / 100 * bw).toFixed(1)}px ${(sz / 2 - y / 100 * bh).toFixed(1)}px"></div>`;
    }
    return UI.ownerFaceSvg(o, mood, size);
  };
  // 絵が無いときの顔（SVG で描く）
  UI.ownerFaceSvg = function (o, mood, size) {
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
    // 体と服
    p.push(`<path d="M12 100 C14 84 28 77 50 77 C72 77 86 84 88 100 Z" fill="${cl}"/>`);
    p.push(`<path d="M43 62 L57 62 L57 79 C53 82 47 82 43 79 Z" fill="${skD}"/>`);
    p.push(collar(f.collar, cl, clD, ac, sk));
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
    if (st === 'bob') return `<path d="M26 50 C24 26 38 18 50 18 C64 18 76 26 74 50 L70 38 C64 34 58 30 54 26 C50 33 40 37 30 38 Z" fill="${HAIR}"/><path d="M26 46 C25 58 26 66 28 72 L31 50 Z M74 46 C75 58 74 66 72 72 L69 50 Z" fill="${HAIR}"/>`;
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
  UI.shade = shade;

  // ---------- 小物 ----------
  const MOOD = { win: 'happy', bigwin: 'happy', good: 'smile', lose: 'sad', decline: 'sad' };
  const tierChip = oid => { const st = O.of(oid); return `<span class="own-tier t${st.tier}">${e(O.TIERS[st.tier].label)}</span>`; };
  // 次の段階までの帯（数は出さず、帯の長さで見せる）
  const gauge = oid => {
    const st = O.of(oid), cur = O.TIERS[st.tier], nx = O.TIERS[st.tier + 1];
    const lo = cur.pts, hi = nx ? nx.pts : O.MAX;
    const pct = U.clamp((st.pts - lo) / Math.max(1, hi - lo), 0, 1) * 100;
    const to = nx ? `次は「${nx.label}」` : st.got.bond ? 'いちばんの間柄' : '好感度がいっぱいになると、最後のご褒美';
    return `<div class="own-gauge"><i style="width:${pct.toFixed(1)}%"></i></div><div class="own-next small muted">${e(to)}</div>`;
  };
  const nextReward = oid => { const st = O.of(oid); const r = O.REWARDS.find(r => !st.got[r.key]); return r ? `${r.label}（${r.tier < 4 ? '「' + O.TIERS[r.tier].label + '」で' : '好感度がいっぱいで'}）` : 'すべて受け取った'; };
  const silksCv = oid => `<canvas class="own-silks" width="40" height="40" data-osilks="${e(oid)}"></canvas>`;
  const hydrate0 = App.hydrate;
  App.hydrate = function (root) {
    hydrate0(root);
    if (A) root.querySelectorAll('canvas[data-osilks]').forEach(cv => { const o = O.by(cv.dataset.osilks); if (o) A.silksIcon(cv, o.silks); });
  };
  // 勝負服：馬主の馬はその馬主の服、主戦になった馬主の服を着せた自分の馬はその服
  const RV = HS.RaceView;
  if (RV) { const silks0 = RV.silksOf; RV.silksOf = h => (h && !h._silks && O.silksOf(h)) || silks0(h); }

  // ---------- ホーム：騎乗依頼の札 ----------
  const raceLine = (race, x) => `${UI.gradeTag(race)} <b>${e(R.label(race))}</b> <span class="small">${e(race.course)} ${UI.surf(race.surface)} ${race.dist}m</span>`;
  UI.ownerOfferCard = function (o) {
    const card = W.cardOf(o.raceKey); if (!card) return '';
    const x = card.runners.find(r => r.horse.id === o.horseId); if (!x) return '';
    const ow = O.by(o.oid), h = x.horse, race = card.race;
    const acc = O.accepted(o.raceKey);
    const clash = O.clash(o);
    const line = O.line(o.oid, 'offer', o.line, { horse: h.name, race: R.label(race) }, { race, horse: h });
    const fee = Math.round(O.FEE[O.classOf(race)] * U.priceIndex(W.get().year) / 10) * 10;
    const wIdx = W.prepareWeek().wIdx;
    return `<div class="own-offer ${acc ? 'on' : ''}" style="--oc:${ow.silks.base};--oc2:${ow.silks.sub}">
      <button class="own-face" data-act="owner" data-id="${e(ow.id)}" aria-label="${e(ow.name)}">${UI.ownerFace(ow, acc ? 'smile' : 'normal', 72)}</button>
      <div class="grow">
        <div class="own-who"><b>${e(ow.name)}</b>${tierChip(ow.id)}<span class="small muted">${e(ow.title)}</span>${o.best ? '<span class="chip hist">いちばんの馬</span>' : ''}</div>
        <div class="own-say">「${e(line)}」</div>
        <div class="own-race">${raceLine(race, x)}</div>
        <div class="row"><span class="nm">${e(h.name)}</span>${UI.histMark ? UI.histMark(h) : ''}<span class="small muted">${h.gelding ? 'セ' : h.sex}${W.get().year - h.born}・${e(h.style)}・${x.pop ? `${x.pop}番人気（${x.odds}倍）` : ''}・騎乗料 ${U.money(fee)}</span></div>
        ${UI.numStats ? UI.numStats(h, wIdx, { surface: race.surface }) : ''}
        ${clash ? `<div class="own-clash">同じレースに自分の馬「${e(clash.name)}」が出る。受けると「${e(clash.name)}」には別の騎手が乗る。</div>` : ''}
        <div class="btns">${acc ? `<span class="chip mine">受けた</span><button class="btn sm" data-act="own-cancel" data-race="${e(o.raceKey)}">取り消す</button>`
          : `<button class="btn sm gold" data-act="own-accept" data-race="${e(o.raceKey)}" data-horse="${e(h.id)}">${clash ? '依頼の馬に乗る' : '受ける'}</button><button class="btn sm" data-act="own-decline" data-race="${e(o.raceKey)}">断る</button>`}
          ${W.horse(h.id) ? `<button class="btn sm" data-act="horse" data-id="${e(h.id)}">馬を見る</button>` : ''}</div>
      </div></div>`;
  };
  UI.ownerOffersSection = function () {
    const offers = O.offers();
    const G = W.get();
    return `<h2 class="sec">騎乗依頼<span class="r">${offers.length}件・<a href="#" data-act="owners">馬主の一覧 ▶</a></span></h2>
      ${offers.length ? `<div class="list own-offers">${offers.map(UI.ownerOfferCard).join('')}</div>` : `<div class="panel empty">今週の騎乗依頼はありません。${G.month}月${G.week}週</div>`}`;
  };
  const home0 = S.home;
  S.home = function (st) {
    const html = home0(st);
    if (!O.on() || W.get().gameOver) return html;
    const mark = '<h2 class="sec">今週の騎乗';
    const sec = UI.ownerOffersSection();
    return html.includes(mark) ? html.replace(mark, sec + mark) : html + sec;
  };

  // ---------- 馬主の一覧 ----------
  S.owners = function () {
    const rows = O.list().map(o => {
      const st = O.of(o.id), best = O.horsesOf(o.id).slice(0, 3);
      return `<div class="own-card" data-act="owner" data-id="${e(o.id)}" style="--oc:${o.silks.base};--oc2:${o.silks.sub}">
        <div class="own-face">${UI.ownerFace(o, st.tier >= 2 ? 'smile' : 'normal', 84)}</div>
        <div class="grow">
          <div class="own-who"><b>${e(o.name)}</b>${tierChip(o.id)}${silksCv(o.id)}</div>
          <div class="small muted">${e(o.title)}・${o.age}歳</div>
          ${gauge(o.id)}
          <div class="small">次のご褒美：${e(nextReward(o.id))}</div>
          <div class="small muted">一緒に ${st.rides}戦${st.wins}勝${best.length ? `・持ち馬 ${best.map(h => e(h.name)).join('・')}ほか` : ''}</div>
        </div></div>`;
    }).join('');
    return `<h2 class="sec">馬主<span class="r">${O.list().length}人</span></h2>
      <div class="small muted">騎乗依頼をくれる馬主たち。依頼を受けて結果を出すと好感度が上がり、大きなレースで強い馬の依頼が来るようになる。断ると少し下がる。</div>
      <div class="own-grid mt">${rows}</div>`;
  };
  // ---------- 馬主の詳しい画面 ----------
  S.owner = function (v) {
    const o = O.by(v.id); if (!o) return '<div class="panel empty">馬主が見つからない</div>';
    const G = W.get(), st = O.of(o.id), s = O.state();
    const ladder = O.TIERS.map((t, i) => {
      const rw = O.REWARDS.find(r => r.tier === i);
      const reached = st.tier >= i;
      return `<li class="${reached ? 'on' : ''}"><b>${e(t.label)}</b><span>${['条件戦の依頼', '重賞の依頼', 'G1の依頼・いちばん強い馬', 'グランドフィナーレ・海外の依頼'][i]}</span>${rw ? `<em class="${st.got[rw.key] && !st.got[rw.key].pending ? 'got' : ''}">${st.got[rw.key] ? (st.got[rw.key].pending ? '⏳ ' : '✓ ') : '🎁 '}${e(rw.label)}${st.got[rw.key] && st.got[rw.key].pending ? '（引退を待つ）' : ''}</em>` : ''}</li>`;
    }).join('') + `<li class="${st.got.bond ? 'on' : ''}"><b>好感度いっぱい</b><span>思い出の名馬 ${e(o.memory)}</span><em class="${st.got.bond && !st.got.bond.pending ? 'got' : ''}">${st.got.bond && !st.got.bond.pending ? '✓ ' : '🎁 '}思い出の名馬</em></li>`;
    const pending = st.got.bond && st.got.bond.pending;
    const mine = W.mine().filter(h => h.loc === 'stable' || h.loc === 'farm');
    const wear = O.canWear(o.id) && mine.length ? `<h2 class="sec">勝負服を着せる<span class="r">${silksCv(o.id)}</span></h2>
      <div class="panel"><table class="t">${mine.map(h => { const on = s.wear[h.id] === o.id; return `<tr><td><b>${e(h.name)}</b></td><td class="small muted">${on ? `${e(o.name)}さんの勝負服` : s.wear[h.id] ? `${e(O.by(s.wear[h.id]).name)}さんの勝負服` : '自分の勝負服'}</td><td><button class="btn sm ${on ? '' : 'gold'}" data-act="own-wear" data-horse="${e(h.id)}" data-oid="${on ? '' : e(o.id)}">${on ? '自分の服に戻す' : '着せる'}</button></td></tr>`; }).join('')}</table></div>` : '';
    const horses = O.horsesOf(o.id).slice(0, 8);
    const log = s.log.filter(x => x.oid === o.id).slice(0, 12);
    const T = HS.Season;
    return `<div class="own-hero" style="--oc:${o.silks.base};--oc2:${o.silks.sub}">
        <div class="own-face big">${UI.ownerFace(o, st.tier >= 2 ? 'happy' : 'smile', 168)}</div>
        <div class="grow">
          <div class="small muted">${e(o.kana)}・${o.age}歳</div>
          <div class="own-name">${e(o.name)} ${tierChip(o.id)}</div>
          <div class="own-title">${e(o.title)}</div>
          <div class="small">${e(o.note)}</div>
          <div class="own-say mt">「${e(O.fill_(o.intro))}」</div>
          ${gauge(o.id)}
        </div></div>
      ${pending ? `<div class="panel gold mt center">🎁 思い出の名馬 <b>${e(o.memory)}</b> を受け取れる（お手馬に空きが要る）。<div class="btns mt" style="justify-content:center"><button class="btn gold" data-act="own-claim" data-id="${e(o.id)}">受け取る</button></div></div>` : ''}
      <h2 class="sec">段階とご褒美<span class="r">一緒に ${st.rides}戦${st.wins}勝・G1 ${st.big}勝</span></h2>
      <ol class="own-ladder">${ladder}</ol>
      ${wear}
      <h2 class="sec">${e(o.name)}さんの馬<span class="r">${O.horsesOf(o.id).length}頭</span></h2>
      ${horses.length ? `<div class="panel"><table class="t">${horses.map(h => { const p = T ? T.fhPeak(h) : { turf: '-', dirt: '-' }; return `<tr data-act="horse" data-id="${e(h.id)}"><td><b>${e(h.name)}</b>${UI.histMark ? UI.histMark(h) : ''}</td><td class="small">${h.sex}${G.year - h.born}・${e(h.style)}</td><td class="small">芝 <b>${p.turf}</b>・ダ <b>${p.dirt}</b></td><td class="small muted">${h.starts || 0}戦${h.wins || 0}勝</td></tr>`; }).join('')}</table></div>` : '<div class="panel empty">いま走っている馬はいない。</div>'}
      <h2 class="sec">依頼の記録</h2>
      ${log.length ? `<div class="panel"><table class="t">${log.map(x => `<tr><td class="small muted">${e(W.yLabel(x.y))}${x.m}月${x.w}週</td><td>${e(x.race)}</td><td>${e(x.horse)}</td><td class="num ${x.pos && x.pos <= 3 ? 'pos' + x.pos : ''}">${x.pos ? x.pos + '着' : '断った'}</td></tr>`).join('')}</table></div>` : '<div class="panel empty">まだ依頼を受けていない。</div>'}`;
  };

  // ---------- 操作 ----------
  const act = App.act;
  act.owners = () => { App.closeAll(); App.go({ name: 'owners' }); };
  act.owner = d => { App.closeAll(); App.go({ name: 'owner', id: d.id }); };
  act['own-accept'] = d => { const err = O.accept(d.race, d.horse); if (err) return App.toast(err); if (HS.Audio) HS.Audio.se && HS.Audio.se('coin'); App.save(); App.render(); };
  act['own-cancel'] = d => { O.unaccept(d.race); App.save(); App.render(); };
  act['own-decline'] = d => {
    const o = O.offerOf(d.race); if (!o) return;
    const ow = O.by(o.oid), race = W.raceByKey(d.race);
    const err = O.decline(d.race); if (err) return App.toast(err);
    const c = W.cardOf(d.race), x = c && c.runners.find(r => r.horse.id === o.horseId);
    App.toast(`${ow.name}「${O.line(o.oid, 'decline', o.line, { horse: o.horse, race: race ? R.label(race) : '' }, { race, horse: x && x.horse })}」`);
    App.save(); App.render();
  };
  act['own-wear'] = d => { const err = O.wear(d.horse, d.oid || null); if (err) return App.toast(err); App.save(); App.render(); };
  act['own-claim'] = async d => { const err = O.claim(d.id); if (err) return App.toast(err); App.save(); await UI.ownersScenes(); App.render(); };

  // ---------- ご褒美の場面 ----------
  const KICK = { up1: '間柄が「信頼」になった', up2: '間柄が「主戦」になった', up3: '間柄が「相棒」になった', bond: '好感度がいっぱいになった', gift: '引退した馬を譲ってもらった', award: '名コンビ賞' };
  UI.ownerScene = function (q) {
    return new Promise(res => {
      const o = O.by(q.oid); if (!o) return res();
      const lines = O.sceneLines(q.oid, q.kind, { horse: q.horse || '' });
      if (HS.Audio && HS.Audio.se) HS.Audio.se('coin');
      const bg = App.modal(`<div class="own-scene" style="--oc:${o.silks.base};--oc2:${o.silks.sub}">
          <div class="own-scene-face">${UI.ownerFace(o, 'happy', 200)}</div>
          <div class="own-scene-body">
            <div class="own-kicker">${e(KICK[q.kind] || '')}</div>
            <div class="own-name">${e(o.name)}<small>${e(o.title)}</small></div>
            <div class="own-talk">${lines.map((t, i) => `<p style="--d:${i}">「${e(t)}」</p>`).join('')}</div>
            ${q.reward ? `<div class="own-reward" style="--d:${lines.length}">🎁 ${e(q.reward)}</div>` : ''}
            <div class="btns mt"><button class="btn gold" data-x="ok">ありがとうございます</button></div>
          </div></div>`, { noClose: true, scene: 'home' });
      bg.querySelector('[data-x=ok]').onclick = () => { App.closeModal(); res(); };
    });
  };
  // たまった場面を順に見せる
  UI.ownersScenes = async function () {
    if (!O.on()) return;
    const s = O.state();
    while (s.queue.length) { const q = s.queue.shift(); await UI.ownerScene(q); }
    App.save();
  };
  // レースのあと：依頼で乗った馬の馬主のひと言（まとめて1枚）→ ご褒美の場面
  UI.ownersAfterWeek = async function () {
    if (!O.on()) return;
    const s = O.state();
    const rs = (s.react || []).slice();
    if (rs.length) {
      await new Promise(res => {
        const rows = rs.map(x => {
          const o = O.by(x.oid); if (!o) return '';
          const o0 = O.by(x.oid), st0 = O.of(x.oid);
          const set = ((o0.lines[x.kind] || {})[st0.tier >= 2 ? 'close' : 'near']) || [];
          const line = O.fill_(O.pickLine(set, x.line, new Set(x.tags || [])), { horse: x.horse, race: x.race });
          return `<div class="own-react" style="--oc:${o.silks.base}">${UI.ownerFace(o, MOOD[x.kind] || 'normal', 64)}
            <div class="grow"><div class="own-who"><b>${e(o.name)}</b>${tierChip(o.id)}<span class="small muted">${e(x.race)}・${e(x.horse)}・${x.pos}着</span></div>
            <div class="own-say">「${e(line)}」</div>${gauge(o.id)}${x.up ? '<div class="own-up">▲ 間柄が深まった</div>' : ''}<div class="small muted">騎乗料 ${U.money(x.fee)}</div></div></div>`;
        }).join('');
        const bg = App.modal(`<h3>馬主のひと言</h3>${rows}<div class="btns mt"><button class="btn gold" data-x="ok">次へ</button></div>`, { noClose: true });
        bg.querySelector('[data-x=ok]').onclick = () => { App.closeModal(); res(); };
      });
      s.react = [];
    }
    await UI.ownersScenes();
  };
  // パドック：依頼の馬なら、馬主のひと言
  UI.paddockOwner = function (card, runner) {
    if (!O.on() || !O.accepted(card.race.key)) return '';
    const a = O.state().week.acc[card.race.key];
    if (!a || a.horseId !== runner.horse.id) return '';
    const o = O.by(a.oid); if (!o) return '';
    const line = O.line(o.id, 'paddock', U.hash(card.race.key + runner.horse.name), { horse: runner.horse.name, race: R.label(card.race) }, { race: card.race, horse: runner.horse });
    return `<div class="panel mt own-paddock" style="--oc:${o.silks.base}">${UI.ownerFace(o, 'smile', 56)}<div class="grow"><div class="own-who"><b>${e(o.name)}</b>${tierChip(o.id)}<span class="small muted">馬主</span></div><div class="own-say">「${e(line)}」</div></div></div>`;
  };
})();
