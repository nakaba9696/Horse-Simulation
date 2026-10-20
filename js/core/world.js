// ゲームの世界：状態・新しいゲーム・週を進める・AI・お金・市場・配合・表彰・セーブ
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, P = HS.Ped, R = HS.Races, S = HS.Sim;
  const W = HS.World = {};
  const SAVE_VERSION = 1;
  W.SAVE_KEY = 'horse-sim-save-v1';

  let G = null;        // いまの状態（セーブに入るもの）
  let rng = null;      // 世界の乱数（状態は G.rngState）
  W.get = () => G;

  // ---------- 索引（データから作る。セーブには入れない） ----------
  W.index = function () {
    const D = HS.DATA;
    W.histByName = new Map((D.historic || []).map(h => [h.name, h]));
    W.histByBorn = new Map();
    for (const h of D.historic || []) { if (!W.histByBorn.has(h.born)) W.histByBorn.set(h.born, []); W.histByBorn.get(h.born).push(h); }
    // 史実の勝ち馬（'2005東京優駿' → 'ディープインパクト'）
    W.histWinner = new Map();
    for (const h of D.historic || []) for (const w of h.wins || []) W.histWinner.set(w, h.name);
    W.mareByName = new Map((D.mares || []).map(m => [m.name, m]));
    // 母 → 史実の仔
    W.histFoalsOfDam = new Map();
    for (const h of D.historic || []) if (h.dam) { if (!W.histFoalsOfDam.has(h.dam)) W.histFoalsOfDam.set(h.dam, []); W.histFoalsOfDam.get(h.dam).push(h); }
    for (const m of D.mares || []) for (const [y, sire, name] of m.foals || []) {
      if (!W.histFoalsOfDam.has(m.name)) W.histFoalsOfDam.set(m.name, []);
      const arr = W.histFoalsOfDam.get(m.name);
      if (!arr.some(x => x.name === name)) arr.push(W.histByName.get(name) || { name, born: y, sire, dam: m.name, rating: 88, missing: true });
    }
    W.stallionByName = new Map((D.stallions || []).map(s => [s.name, s]));
    // 外国で調教された馬（日本の目標レースにだけ来る。市場には出ない）
    const FOREIGN_EXTRA = ['ファルブラヴ', 'サイレントウィットネス', 'テイクオーバーターゲット'];
    W.foreignTrained = new Set((D.historic || []).filter(h => FOREIGN_EXTRA.includes(h.name) || (/調教馬|外国馬/.test(h.note || '') && !/日本調教馬/.test(h.note || ''))).map(h => h.name));
  };

  // ---------- 便利 ----------
  W.wIdx = () => H.weekIndex(G.year, G.month, Math.min(G.week, 4)); // 12月の GF の週（5）は12月4週と同じ（成長・休みの勘定を変えない）
  // その年の物価（1995年＝1）
  const IDX = () => U.priceIndex(G.year);
  W.priceIndex = IDX;
  // 年の見せ方（年代なしのゲームは「n年目」）
  W.yLabel = y => G && G.eraless ? `${y - G.startYear + 1}年目` : `${y}年`;
  W.weekLabel = (m, w) => w > 4 ? `${m}月 GF週` : `${m}月${w}週`; // 12月の GF の週は「12月 GF週」
  W.dateLabel = (y, m, w) => w > 4 ? `${W.yLabel(y)}${m}月 グランドフェスティバル` : `${W.yLabel(y)}${m}月${w}週`;
  const news = (text, kind) => { G.news.unshift({ y: G.year, m: G.month, w: G.week, text, kind: kind || '' }); if (G.news.length > 120) G.news.length = 120; };
  W.news = news;
  const newId = () => 'h' + (G.nextId++);
  W.newId = newId;
  W.horse = id => G.horses[id] || (HS.Eraless && HS.Eraless.shopHorse(id)) || undefined;
  W.all = () => Object.values(G.horses);
  W.mine = loc => W.all().filter(h => h.owner === 'P' && (!loc || h.loc === loc));
  // 使われている名前（週の間は使い回し、新しい名前は足していく）
  W.usedNames = () => {
    const wc = W.wc();
    if (!wc.used) { wc.used = new Set(W.histByName.keys()); for (const h of W.all()) wc.used.add(h.name); }
    return wc.used;
  };
  // 週ごとの使い回し（暦が進んだとき・持ち馬が変わったときに捨てる）
  W.wc = () => { const key = G ? `${G.year}-${G.month}-${G.week}` : ''; if (!W._wcache || W._wcache.key !== key) W._wcache = { key }; return W._wcache; };
  W.dirty = () => { W._wcache = null; };

  // ---------- 新しいゲーム ----------
  W.newGame = function (opts) {
    // 競走馬エディットの内容をこのゲームに写す（以後、このセーブはこの内容で動く）
    const edits = opts.edits || (HS.Edits ? HS.Edits.loadLocal() : {});
    if (HS.Edits) HS.Edits.apply(edits);
    W.index();
    const seed = opts.seed || (Date.now() % 1e9);
    // 騎手のゲームは年代なし（持ち主の決定 2026-10-16）：番組・物価・騎手は固定し、史実馬は毎年ランダムにデビューする
    const eraless = opts.mode === 'jockey' && opts.eraless !== false && !!HS.Eraless;
    U.ERA = eraless ? HS.Eraless.ERA : null;
    const year0 = eraless ? HS.Eraless.START : (opts.year || 1995);
    G = {
      v: SAVE_VERSION, seed, rngState: seed, year: year0, month: 1, week: 1, eraless, startYear: year0, lineup: {}, unlocked: [], shopKeys: [], trophies: {}, hallOwn: [], gfShop: 1, gfTrophy: 1,
      player: {
        name: opts.name || 'プレイヤー', farm: opts.farm || '新星牧場', crown: opts.crown || '',
        silks: opts.silks || { base: '#1f4fbf', sub: '#ffd23f', pattern: 'hoops' }, money: Math.round((opts.money || 30000) * U.priceIndex(year0) / 10) * 10,
      },
      difficulty: opts.difficulty || 'normal',
      horses: {}, nextId: 1, erased: [], bornHist: [], pedExtra: {}, edits, bond: {},
      records: { g1: {}, graded: {}, awards: {}, pts: {}, course: {}, hall: [], player: { starts: 0, wins: 0, earn: 0, g1: [] } },
      news: [], entries: {}, rides: {}, mode: opts.mode === 'jockey' ? 'jockey' : 'owner', lastWeek: null, market: { gen: [], genMares: [], month: 0 },
      farmLevel: 1, stats: {}, settings: { animSpeed: 1, showHistNote: true }, broke: 0, gameOver: null, reserve: [], dc: null,
    };
    rng = new U.RNG(seed);
    P.build(G.pedExtra);
    // 史実馬：開始年に生きている世代（0歳は3月に生まれる）。年代なしのゲームは、2〜6歳をランダムに
    if (eraless) HS.Eraless.populate();
    else for (let b = G.year - 9; b < G.year; b++) for (const d of W.histByBorn.get(b) || []) {
      if ((d.retire || d.born + 5) < G.year && b < G.year - 2) continue;
      W.spawnHistoric(d, true);
    }
    // 騎手のゲーム：持ち馬は無く、騎乗依頼を受けて乗る
    if (G.mode === 'jockey') {
      G.jockey = HS.Jockey.init(Object.assign({}, opts, { year: G.year }));
      // 騎手のゲームは、自分で買った馬に自分で乗る（持ち主の決定 2026-10-15）。最初は史実馬を1頭買えるくらい
      G.player.money = Math.round(8000 * U.priceIndex(G.year) / 10) * 10;
      W.refreshMarket(true);
      news(`${G.jockey.region}所属の新人騎手、${G.jockey.name}がデビューした。まずは市場でデビュー前の史実馬を買おう。`, 'info');
      return G;
    }
    // 最初の持ち馬：繁殖牝馬2頭・1歳と2歳を1頭ずつ
    for (let i = 0; i < 2; i++) { const m = W.makeGenMare(rng, 52 + rng.int(0, 10)); m.owner = 'P'; m.loc = 'mare'; G.horses[m.id] = m; }
    for (const age of [1, 2]) { const y = W.makeGenYoung(rng, G.year - age, 64 + rng.int(0, 6)); y.owner = 'P'; y.loc = 'farm'; G.horses[y.id] = y; }
    W.refreshMarket(true);
    news(`${G.player.farm}の歩みが始まった。まずは市場と牧場を見てみよう。`, 'info');
    return G;
  };

  // 史実馬を世界に出す（生まれたとき・開始時）
  W.spawnHistoric = function (d, atStart) {
    if (G.bornHist.includes(d.name) || G.erased.includes(d.name)) return null;
    // 親が消えた（歴史が変わった）なら、この馬も生まれない
    if ((d.sire && G.erased.includes(d.sire)) || (d.dam && G.erased.includes(d.dam))) { G.erased.push(d.name); return null; }
    // 母をプレイヤーが持っているなら、配合しだい（ここでは出さない）
    const damH = W.all().find(h => h.name === d.dam && h.owner === 'P');
    if (damH && !atStart) return null;
    const h = H.fromHistoric(d, newId());
    if (W.foreignTrained.has(d.name) || HS.DATA.isForeign(d)) { h.foreignTrained = true; h.country = d.country || '外'; }
    G.bornHist.push(d.name);
    const age = G.year - d.born;
    if (atStart && age >= 2) {
      // 開始前の実績を写す
      for (const w of d.wins || []) {
        const y = parseInt(w.slice(0, 4), 10);
        if (y < G.year) { h.gradedWins.push({ y, race: w.slice(4), grade: 'G1', hist: true }); h.earn += 9000; h.wins += 1; }
      }
      if (age >= 3) {
        h.wins = Math.max(h.wins, d.rating >= 85 ? 4 : d.rating >= 78 ? 3 : 2);
        h.starts = h.wins * 2 + 2;
        h.earn += h.wins * 1200;
      }
      h.loc = age >= 3 ? 'stable' : 'farm';
      h.restUntil = W.wIdx() + rng.int(0, 6);
    }
    G.horses[h.id] = h;
    return h;
  };

  // 架空の繁殖牝馬
  W.makeGenMare = function (r, quality) {
    const used = W.usedNames();
    const year = G.year;
    const sire = W.pickSire(r, year - 6);
    const m = {
      id: newId(), name: H.makeName(r, used), sex: '牝', born: year - r.int(4, 9), sire: sire ? sire.name : null, dam: H.makeName(r, used),
      hist: false, owner: 'AI', loc: 'mare', quality, coat: H.pickCoat(r, sire && sire.coat),
      pot: H.makeStats(r, quality, 3), apt: { turf: 60 + r.int(0, 40), dirt: 40 + r.int(0, 55), heavy: 50 },
      distMin: 1200 + r.int(0, 6) * 100, distMax: 1800 + r.int(0, 8) * 100, growth: r.pick(H.GROWTHS), style: r.pick(H.STYLES), kire: r.int(2, 7), skills: [],
      bonus: {}, wins: 0, starts: 0, earn: 0, gradedWins: [], results: [], cover: null, foals: [],
    };
    H.splitSurface(m, r);
    P.register(m.name, m.sire, m.dam);
    return m;
  };
  // 架空の若馬（市場・最初の持ち馬）
  W.makeGenYoung = function (r, born, mean) {
    const used = W.usedNames();
    const sire = W.pickSire(r, born - 1) || { name: null, rating: 55, surface: '芝', distMin: 1400, distMax: 2200, growth: '普通' };
    const damName = H.makeName(r, used);
    const fakeMare = { name: damName, quality: mean - 8, surface: r.chance(0.6) ? '芝' : 'ダ' };
    P.register(damName, null, null);
    const f = P.makeFoal(r, sire, fakeMare, born);
    for (const k of H.STATS) f.pot[k] = U.clamp(f.pot[k] + (mean - f.ev.mean), 25, 104);
    const h = W.horseFromFoal(f, sire.name, damName, born, null);
    h.coat = H.pickCoat(r, sire.coat);
    return h;
  };
  W.horseFromFoal = function (f, sireName, damName, born, name) {
    const h = {
      id: newId(), name: name || '', sex: f.sex, born, sire: sireName, dam: damName, hist: false, owner: 'AI', loc: 'farm',
      pot: f.pot, apt: f.apt, distMin: f.distMin, distMax: f.distMax, growth: f.growth, peakShift: f.peakShift, style: f.style,
      kire: f.kire, skills: f.skills || [], health: f.health, bonus: {}, fatigue: 0,
      wins: 0, starts: 0, w2: 0, w3: 0, earn: 0, prize: 0, gradedWins: [], results: [], restUntil: 0, coat: f.coat || '鹿毛',
    };
    return h;
  };
  W.displayName = h => h.name || `${h.dam || '母不明'}の${h.born}`;

  // 種牡馬：その年に種付けできるもの（データ＋プレイヤーの種牡馬）
  W.stallionsOf = function (year) {
    const wc = W.wc(); wc.st = wc.st || {};
    if (!wc.st[year]) wc.st[year] = W.stallionsOf0(year);
    return wc.st[year];
  };
  W.stallionsOf0 = function (year) {
    const mineNames = new Set(W.all().filter(h => h.owner === 'P').map(h => h.name));
    const out = [];
    for (const s of HS.DATA.stallions || []) {
      if (s.from > year || (s.to || 9999) < year) continue;
      if (year - s.born > 26) continue;
      if (G.erased.includes(s.name) || mineNames.has(s.name)) continue;
      out.push(Object.assign({}, s, { fee: W.feeOf(s, year), owner: 'AI' }));
    }
    for (const h of W.all()) if (h.loc === 'stud' && year - h.born <= 26) {
      out.push({ name: h.name, born: h.born, rating: h.studRating, fee: h.studFee, surface: h.apt.dirt > h.apt.turf + 10 ? 'ダ' : h.apt.turf > h.apt.dirt + 10 ? '芝' : '芝ダ', distMin: h.distMin, distMax: h.distMax, growth: h.growth, kire: h.kire, skills: h.skills || [], traits: h.studTraits || [], owner: h.owner, horseId: h.id, coat: h.coat });
    }
    return out;
  };
  W.feeOf = function (s, year) {
    let fee = 100;
    for (const [y, f] of s.fee || []) if (y <= year) fee = f;
    if (!(s.fee || []).length) fee = Math.round(50 + Math.pow(Math.max(0, (s.rating || 50) - 40), 2) * 0.6);
    return fee;
  };
  W.findStallion = function (name) {
    if (!name) return null;
    const h = W.all().find(x => x.name === name && x.loc === 'stud');
    if (h) return { name: h.name, rating: h.studRating, traits: h.studTraits || [], kire: h.kire, skills: h.skills || [] };
    return W.stallionByName.get(name) || null;
  };
  W.pickSire = function (r, year) {
    const list = W.stallionsOf(year);
    if (!list.length) return null;
    return r.weighted(list, s => Math.pow(Math.max(5, s.rating || 50), 2));
  };

  // ---------- 週のレース ----------
  W.weekRaces = function () {
    if (!W._cache || W._cache.key !== `${G.year}-${G.month}-${G.week}`) {
      const list = G.week > 4 ? [] : R.ofWeek(G.seed, G.year, G.month, G.week); // GF の週（12月4週のあと）はグランドフェスティバルだけ
      for (const r of list) r.ground = R.ground(G.seed, G.year, G.month, G.week, r.course);
      if (HS.Season) HS.Season.addSpecial(list, G.year, G.month, G.week);
      W._cache = { key: `${G.year}-${G.month}-${G.week}`, list };
    }
    return W._cache.list;
  };
  W.raceByKey = key => W.weekRaces().find(r => r.key === key);
  // 地域（外国の馬が普段走る場所）
  const ZONES = { '英': 'EU', '愛': 'EU', '仏': 'EU', '独': 'EU', '伊': 'EU', '米': 'US', '加': 'US', '豪': 'OC', '新': 'OC', '香港': 'HK', 'UAE': 'ME', 'サウジ': 'ME', '星': 'SG' };
  W.zoneOf = c => ZONES[c] || 'EU';
  // 1〜6週先の重賞（その週の間は使い回す）
  W.upcomingSoon = function () {
    const key = `${G.year}-${G.month}-${G.week}`;
    if (!W._soon || W._soon.key !== key) W._soon = { key, list: W.upcomingGraded(7).filter(r => r.inWeeks > 0) };
    return W._soon.list;
  };
  W.upcomingGraded = function (weeks) {
    const out = [];
    let y = G.year, m = G.month, w = G.week;
    for (let i = 0; i < weeks; i++) {
      for (const r of R.gradedOf(y, m, w)) out.push(Object.assign(r, { inWeeks: i }));
      w++; if (w > 4) { w = 1; m++; if (m > 12) { m = 1; y++; } }
    }
    return out;
  };

  // プレイヤーの出走登録
  W.enter = function (horseId, raceKey, jockeyName) {
    const h = G.horses[horseId], race = W.raceByKey(raceKey);
    if (!h || !race) return 'レースが見つからない';
    if (h.loc !== 'stable') return '入厩していない';
    const why = R.ineligible(h, race, G.year);
    if (why) return why;
    if (race.region === '海外') {
      const cost = W.travelCost(race);
      if (G.player.money < cost) return `遠征費（${U.money(cost)}）が足りない`;
    }
    W.unenter(horseId);
    G.entries[raceKey] = G.entries[raceKey] || [];
    G.entries[raceKey].push({ horseId, jockey: jockeyName || W.bestFreeJockey(raceKey, horseId) });
    return null;
  };
  W.unenter = function (horseId) {
    for (const k of Object.keys(G.entries)) { G.entries[k] = G.entries[k].filter(e => e.horseId !== horseId); if (!G.entries[k].length) delete G.entries[k]; }
  };
  W.entryOf = function (horseId) {
    for (const [k, arr] of Object.entries(G.entries)) for (const e of arr) if (e.horseId === horseId) return { raceKey: k, jockey: e.jockey };
    return null;
  };
  // ---------- 騎手（実名・年代ごと） ----------
  // 腕前は年ごとの値を線でつなぐ
  W.skillAt = function (j, year) {
    if (typeof j.skill === 'number') return j.skill;
    const pts = Object.entries(j.skill || {}).map(([y, v]) => [+y, v]).sort((a, b) => a[0] - b[0]);
    if (!pts.length) return 70;
    if (year <= pts[0][0]) return pts[0][1];
    if (year >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const [y1, v1] = pts[i], [y2, v2] = pts[i + 1];
      if (year >= y1 && year <= y2) return v1 + (v2 - v1) * (year - y1) / (y2 - y1);
    }
    return 70;
  };
  // その年に乗っている騎手。regions：['美浦','栗東'] など
  W.jockeysOf = function (year, regions) {
    const wc = W.wc(); wc.jk = wc.jk || {};
    const key = year + ':' + (regions ? regions.join(',') : '*');
    if (!wc.jk[key]) wc.jk[key] = W.jockeysOf0(year, regions);
    return wc.jk[key].map(j => Object.assign({}, j));
  };
  W.jockeysOf0 = function (year, regions) {
    // 年代なしのゲーム：1990〜2026年に乗った騎手が全員いて、腕前はその間のいちばん良い年
    if (U.ERA) return (HS.DATA.jockeys || []).filter(j => j.from <= 2026 && (j.to || 9999) >= 1990 && (!regions || regions.includes(j.region)))
      .map(j => { let s = 0; for (let y = Math.max(j.from, 1990); y <= Math.min(j.to || 2026, 2026); y += 2) s = Math.max(s, W.skillAt(j, y)); return { name: j.name, region: j.region, skill: Math.round(s || W.skillAt(j, 2026)) }; })
      .sort((a, b) => b.skill - a.skill);
    return (HS.DATA.jockeys || []).filter(j => j.from <= year && year <= (j.to || 9999) && (!regions || regions.includes(j.region)))
      .map(j => ({ name: j.name, region: j.region, skill: Math.round(W.skillAt(j, year)) }))
      .sort((a, b) => b.skill - a.skill);
  };
  W.JRA = ['美浦', '栗東'];
  // プレイヤーが選べる騎手（JRA と短期免許の外国人）
  W.ridersForPlayer = year => W.jockeysOf(year, W.JRA).concat(W.jockeysOf(year, ['外国']).slice(0, 15)).sort((a, b) => b.skill - a.skill);
  // 既定の騎手：その年の上位8人から、馬ごとに決まった1人（空いていなければ次）
  W.bestFreeJockey = function (raceKey, horseId) {
    const taken = new Set((G.entries[raceKey] || []).map(e => e.jockey));
    const list = W.jockeysOf(G.year, W.JRA);
    if (!list.length) return '騎手未定';
    const top = list.slice(0, Math.min(8, list.length));
    const start = U.hash(`${horseId || raceKey}:${G.year}`) % top.length;
    for (let i = 0; i < list.length; i++) {
      const j = i < top.length ? top[(start + i) % top.length] : list[i];
      if (!taken.has(j.name)) return j.name;
    }
    return list[0].name;
  };
  W.jockey = function (name) {
    const yr = G ? G.year : 2000;
    const all = (HS.DATA.jockeys || []).filter(j => j.name === name);
    const j = all.find(x => x.from <= yr && yr <= (x.to || 9999)) || all[0];
    if (!j) return { name: name || '騎手未定', skill: 65, region: '' };
    if (U.ERA) { let s = 0; for (let y = j.from; y <= (j.to || 2026); y += 2) s = Math.max(s, W.skillAt(j, y)); return { name: j.name, region: j.region, skill: Math.round(s || 70) }; }
    return { name: j.name, region: j.region, skill: Math.round(W.skillAt(j, yr)) };
  };
  // 史実馬の主戦騎手（その年）
  W.histJockey = function (h, year) {
    const m = HS.DATA.historicJockeys && HS.DATA.historicJockeys[h.name];
    if (!m) return null;
    if (typeof m === 'string') return m;
    // 年の指定はその年だけ（ほかの年は default）。年代なしのゲームは、その馬の本当の年に直して見る
    const off = (G.lineup && G.lineup[h.name]) || 0;
    return m[String(year - off)] || m.default || null;
  };
  W.travelCost = race => race.region !== '海外' ? 0 : Math.round((['仏', '英', '米', '愛', '加', '独'].includes(race.country || (HS.DATA.courses[race.course] || {}).country) ? 3000 : 1500) * IDX());

  // ---------- AI の出走の判断 ----------
  const GRADE_NEED = { G1: 80, G2: 76, G3: 72 };
  W.histTargets = function (h, year) {
    const d = W.histByName.get(h.name);
    if (!d) return [];
    const off = (G.lineup && G.lineup[h.name]) || 0; // 年代なしのゲームでは生年をずらしているので、本当の年に直す
    return [...(d.wins || []), ...(d.ran || [])].filter(s => s.startsWith(String(year - off))).map(s => s.slice(4));
  };
  // このプレイヤー以外の馬を、どのレースに出すか
  W.aiChoose = function (h, races, wIdx, r) {
    if (h.loc !== 'stable') return null;
    const year = G.year;
    const targets = h.hist ? W.histTargets(h, year) : [];
    const hit = races.find(rc => rc.graded && targets.includes(rc.name) && !R.ineligible(h, rc, year));
    if (hit) return hit;
    if (wIdx < (h.restUntil || 0)) return null;
    if (HS.Fatigue.stage(h) >= 2) return null; // 疲れ（段階2）より上は休む
    // 目標が近いなら休む
    if (targets.length) {
      const soon = W.upcomingSoon().some(rc => targets.includes(rc.name));
      if (soon) return null;
    }
    if (!r.chance(h.foreignTrained ? 0.35 : 0.5)) return null;
    if (h.foreignTrained) {
      // 外国の馬は自分の地域の大レースに出る
      const z = W.zoneOf(h.country);
      const cand = races.filter(rc => rc.region === '海外' && W.zoneOf(rc.country) === z && !R.ineligible(h, rc, year))
        .filter(rc => rc.dist >= h.distMin - 300 && rc.dist <= h.distMax + 300 && (rc.surface === 'ダ' ? h.apt.dirt : h.apt.turf) >= 70);
      return cand.length ? r.pick(cand) : null;
    }
    const c = H.overall(H.cur(h, wIdx));
    const cand = races.filter(rc => !R.ineligible(h, rc, year) && rc.region !== '海外')
      .filter(rc => rc.dist >= h.distMin - 200 && rc.dist <= h.distMax + 200)
      .filter(rc => (rc.surface === 'ダ' ? h.apt.dirt : h.apt.turf) >= 70)
      .filter(rc => !rc.graded || c >= (GRADE_NEED[rc.grade] || 72) - (year - h.born <= 3 ? 6 : 0));
    if (!cand.length) return null;
    // レースは OP 以上だけ。重賞に出られる強さの馬は、オープンを軽く見る（オープンは週に多いので、重さ1）
    const opW = c >= GRADE_NEED.G3 - (year - h.born <= 3 ? 6 : 0) ? 1 : 4;
    return r.weighted(cand, rc => rc.graded ? (R.GRADE_RANK[rc.grade] * 3) : opW);
  };

  // その場限りの馬の強さ（格・年齢・月から）
  W.fillerLevel = function (race, year) {
    const m = race.month;
    if (race.region === '海外') return 86;
    if (race.region === '地方') return race.grade === 'G1' ? 74 : 70;
    if (race.graded) {
      const gr = race.grade === 'GF' ? 'G1' : race.grade; // グランドフェスティバル（GF）は G1 と同じ
      if (race.age === '2') return { G1: 71, G2: 68, G3: 66 }[gr] || 66;
      if (race.age === '3' && m <= 6) return { G1: 77, G2: 74, G3: 71 }[gr] || 71;
      return { G1: 81, G2: 78, G3: 76 }[gr] || 76;
    }
    // オープン（レースは OP 以上だけ）：2歳は6月 56 から月に1ずつ上がり、3歳は春は低め、古馬は G3 より6下。リステッドは1上
    // （仕様書の総合力の目安「46〜50 OP 馬相当」の馬が、ときどき勝てる強さ。docs/BALANCE.md「8-1」）
    const L = race.listed ? 1 : 0;
    if (race.age === '2') return 50 + Math.min(12, Math.max(6, m)) + L;
    if (race.age === '3') return (m <= 4 ? 64 : m <= 6 ? 66 : 69) + L;
    return 70 + L;
  };

  // ---------- 週を進める ----------
  // ---------- 週の流れ ----------
  // 1. W.prepareWeek：今週のレースの出走表（出走馬・騎手・枠）を作る。G は変えない（同じ状態なら何度呼んでも同じ）
  // 2. W.cards：プレイヤーの騎乗（G.rides）を当てた出走表と人気
  // 3. W.finishWeek：レースを走らせ（騎乗したレースは played の結果を使う）、結果・調教・暦を進める
  W.prepareWeek = function () {
    // 出走登録・おまかせ・入厩が変わったら作り直す
    const mineSig = W.mine().map(h => `${h.id}${h.loc}${h.auto ? 1 : 0}${h.skipW === W.wIdx() ? 's' : ''}`).join(',');
    const key = `${G.year}-${G.month}-${G.week}:${G.rngState}:${JSON.stringify(G.entries)}:${mineSig}`;
    if (W._week && W._week.key === key) return W._week;
    const r = new U.RNG(G.rngState);
    const wIdx = W.wIdx();
    const allRaces = W.weekRaces();
    const races = allRaces.filter(rc => !rc.invite); // 招待のレースは AI もおまかせも選ばない
    // 出走馬を集める
    const field = {};
    for (const [k, arr] of Object.entries(G.entries)) {
      const race = W.raceByKey(k); if (!race) continue;
      field[k] = arr.map(e => ({ horse: G.horses[e.horseId], jockeyName: e.jockey, mine: true })).filter(x => x.horse && x.horse.loc === 'stable');
    }
    const aiHorses = W.all().filter(h => h.owner !== 'P' && h.loc === 'stable');
    for (const h of aiHorses) {
      const rc = W.aiChoose(h, races, wIdx, r);
      if (!rc) continue;
      (field[rc.key] = field[rc.key] || []).push({ horse: h });
    }
    // プレイヤーの「おまかせ」の馬
    for (const h of W.mine('stable')) {
      if (!h.auto || W.entryOf(h.id) || h.skipW === wIdx) continue;
      const rc = W.aiChoose(h, races, wIdx, r);
      if (rc && rc.region !== '海外') (field[rc.key] = field[rc.key] || []).push({ horse: h, jockeyName: W.bestFreeJockey(rc.key, h.id), mine: true, auto: true });
    }
    // 招待のレース（グランドフェスティバル）は招待馬で組む
    for (const rc of allRaces) if (rc.invite && HS.Season) field[rc.key] = HS.Season.dcField(rc);
    // 自分の馬がスペシャルホースの条件にリーチをかけて出るレースには、その名馬が出てくる（special.js）
    if (G.eraless && HS.Special) for (const rc of allRaces) { const lg = HS.Special.forRace(rc, field[rc.key] || []); if (lg.length) field[rc.key] = (field[rc.key] || []).concat(lg); }
    // レースごとの出走表（G1 は出走が無くても実施）。レースごとに乱数の種を分ける
    const cards = [];
    for (const race of allRaces) {
      const entr = field[race.key] || [];
      if (!entr.length && !(race.graded && race.grade === 'G1')) continue;
      const seed = r.int(1, 2147483646);
      const card = W.buildField(race, entr, wIdx, new U.RNG(seed));
      if (card) { card.seed = seed; cards.push(card); }
    }
    W._week = { key, wIdx, cards, finSeed: r.int(1, 2147483646), cardsKey: null, cardsOut: null };
    return W._week;
  };

  // 出走表を作る（頭数合わせ・騎手・枠）。r はこのレースの乱数
  W.buildField = function (race, entr, wIdx, r) {
    const year = G.year;
    // 出走取消・重複の整理
    const seen = new Set();
    entr = entr.filter(e => e.horse && !seen.has(e.horse.id) && seen.add(e.horse.id));
    // スペシャルホース（隠し馬）は、出走表ができてから手持ちでない最低人気の馬と入れ替わる（持ち主の仕様書 2026-10-19）
    const legends = entr.filter(e => e.legend);
    if (legends.length) entr = entr.filter(e => !e.legend);
    // 地方：JRA 所属は7頭まで
    const max = R.maxField(race);
    entr.sort((a, b) => ((b.legend ? 1 : 0) - (a.legend ? 1 : 0)) || (R.priority(b.horse, race, year, r) - R.priority(a.horse, race, year, r))); // スペシャルホースは必ず出る
    const limit = race.region === '地方' ? Math.min(max, 7) : max;
    const excluded = entr.slice(limit).filter(e => e.mine).map(e => e.horse.id);
    entr = entr.slice(0, limit);
    if (!entr.length && !(race.graded && race.grade === 'G1')) return null;
    // 頭数をそろえる
    const lvl = W.fillerLevel(race, year);
    // 招待のレース（GF）は招待馬だけ。足りないときだけ16頭まで埋める
    const want = race.invite ? Math.max(entr.length, HS.Season ? HS.Season.DC_FIELD : 16) : race.graded ? Math.max(entr.length, Math.min(max, r.int(max - 4, max))) : Math.max(entr.length, r.int(Math.min(10, max), max));
    const used = new Set(W.usedNames());
    const runners = entr.map(e => ({ horse: e.horse, jockey: e.jockeyName ? W.jockey(e.jockeyName) : null, mine: !!e.mine, legend: !!e.legend }));
    while (runners.length < want) {
      const born = year - (race.age === '2' ? 2 : race.age === '3' ? 3 : 3 + r.int(0, 3));
      const foreign = race.region === '海外' && r.chance(0.85);
      const sire = W.pickSire(r, born - 1);
      const f = H.makeFiller(r, { level: lvl + r.normal(0, 1.5), surface: race.surface, dist: race.dist, born, sex: race.sex === '牝' ? '牝' : undefined, foreign, sireName: foreign ? null : sire && sire.name });
      f.name = H.makeName(r, used, foreign);
      f.local = race.region === '地方' && !foreign;
      runners.push({ horse: f, jockey: null });
    }
    if (legends.length) W.swapLegends(race, runners, legends, wIdx);
    // 騎手：プレイヤーの指名 → 史実馬の主戦 → 残りを強い馬から
    const taken = new Set(runners.filter(x => x.jockey).map(x => x.jockey.name));
    for (const x of runners) {
      if (x.jockey || !x.horse.hist) continue;
      const nm = W.histJockey(x.horse, year);
      if (!nm || taken.has(nm)) continue;
      // 年代なしのゲームは1990〜2026年の騎手なら乗れる（スペシャルホースは、その時代の主戦騎手）
      if (!(HS.DATA.jockeys || []).some(j => j.name === nm && (x.horse.legend || (U.ERA ? (j.to || 9999) >= 1990 && j.from <= 2026 : j.from <= year && year <= (j.to || 9999))))) continue;
      x.jockey = W.jockey(nm); taken.add(nm);
    }
    const pools = { JRA: W.jockeysOf(year, W.JRA), foreign: W.jockeysOf(year, ['外国']), local: W.jockeysOf(year, ['地方']) };
    for (const k of Object.keys(pools)) pools[k] = pools[k].filter(j => !taken.has(j.name));
    const take = (pool, strong) => {
      if (!pool.length) return { name: '騎手未定', skill: 60 };
      // 強い馬ほど上位の騎手に乗ってもらいやすい
      const k = strong ? Math.min(pool.length - 1, r.int(0, 3)) : r.int(0, pool.length - 1);
      return pool.splice(k, 1)[0];
    };
    const byPower = runners.filter(x => !x.jockey).sort((a, b) => H.overall(H.cur(b.horse, wIdx)) - H.overall(H.cur(a.horse, wIdx)));
    byPower.forEach((x, i) => {
      const strong = i < 6;
      if (x.horse.foreign || x.horse.foreignTrained) x.jockey = take(pools.foreign.length ? pools.foreign : pools.JRA, strong);
      else if (x.horse.local) x.jockey = take(pools.local.length ? pools.local : pools.JRA, strong);
      else x.jockey = take(pools.JRA.length ? pools.JRA : pools.foreign, strong);
    });
    // 枠順
    r.shuffle(runners);
    const n = runners.length;
    runners.forEach((x, i) => { x.num = i + 1; x.frame = W.frameOf(i + 1, n); x.weight = S.weightFor(x.horse, race, year); });
    // 国が変わる馬は移動の疲れ（js/core/fatigue.js。このレースから効き、レースのあと疲労に残る）
    for (const x of runners) { const tv = HS.Fatigue.travel(x.horse, race); if (tv > 0) x.travel = tv; }
    return { race, runners, excluded };
  };

  // スペシャルホースを、手持ちでない馬のうち人気の見込み（W.setOdds の見積もりから運の揺れを除いたもの）がいちばん低い馬と入れ替える。
  // 入れ替える馬がいなければ足す
  W.popEstimate = (h, race, wIdx) => S.power(h, race, wIdx).total + (h.hist && h.gradedWins.length ? 1.5 : 0);
  W.swapLegends = function (race, runners, legends, wIdx) {
    for (const lg of legends) {
      const x = { horse: lg.horse, jockey: null, mine: false, legend: true };
      let low = -1, lv = Infinity;
      runners.forEach((r, i) => { if (r.mine || r.legend) return; const v = W.popEstimate(r.horse, race, wIdx); if (v < lv) { lv = v; low = i; } });
      if (low < 0) runners.push(x); else runners[low] = x;
    }
  };
  // プレイヤーの騎乗を当てた出走表（人気つき）。騎乗が変わるまで使い回す
  W.cards = function () {
    const wk = W.prepareWeek();
    const rides = G.rides || {};
    const rk = JSON.stringify(rides);
    if (wk.cardsKey === rk && wk.cardsOut) return wk.cardsOut;
    const out = wk.cards.map(c => {
      const runners = c.runners.map(x => Object.assign({}, x));
      const hid = rides[c.race.key];
      // 騎手のゲームでは、自分の馬には自分が乗る（同じレースに2頭いれば1頭目）
      const me = hid ? runners.find(x => x.horse.id === hid) : (G.mode === 'jockey' ? runners.find(x => x.mine) : null);
      if (me && HS.Jockey) { me.jockey = HS.Jockey.playerJockey(); me.rider = 'P'; me.allowance = HS.Jockey.allowance(c.race); me.weight = me.weight - me.allowance; }
      W.setOdds(runners, c.race, wk.wIdx, new U.RNG(c.seed ^ 0x2545f491));
      return Object.assign({}, c, { runners, ride: !!me });
    });
    wk.cardsKey = rk; wk.cardsOut = out;
    return out;
  };
  W.cardOf = key => W.cards().find(c => c.race.key === key);
  // レースの模擬を始める（騎乗するときは ride: true）。乱数はレースごとの種から
  // 自分で乗るときは、その馬に自分で乗った回数（絆。G.bond）を渡す。折り合いのつきやすさに効く（js/core/racesim.js の S.bondF）
  W.bondOf = h => (h && G && G.bond && G.bond[h.id]) || 0;
  W.startSim = (card, opts) => {
    opts = Object.assign({ frames: true }, opts || {});
    if (opts.ride && opts.bond == null) { const me = card.runners.find(r => r.rider === 'P'); if (me) opts.bond = W.bondOf(me.horse); }
    return S.create(card.race, card.runners, W.prepareWeek().wIdx, new U.RNG(card.seed), opts);
  };

  // played：{ raceKey: S.finish の結果 }（プレイヤーが乗ったレース）
  W.finishWeek = function (played) {
    played = played || {};
    const wk = W.prepareWeek();
    const cards = W.cards();
    const wIdx = wk.wIdx;
    rng = new U.RNG(wk.finSeed);
    const report = { date: W.dateLabel(G.year, G.month, G.week), y: G.year, m: G.month, w: G.week, races: [], events: [] };
    for (const card of cards) {
      const { race, runners } = card;
      for (const id of card.excluded) { const h = G.horses[id]; if (h) news(`${h.name}は${R.label(race)}を除外された（賞金が足りない）。`, 'warn'); }
      // 遠征
      for (const x of runners) if (x.mine && race.region === '海外') { const c = W.travelCost(race); G.player.money -= c; news(`${x.horse.name}の${R.label(race)}遠征費 ${U.money(c)}`, 'money'); }
      const hasMine = runners.some(x => x.mine) || card.ride;
      const watch = hasMine || race.grade === 'G1' || !!race.invite;
      const sim = played[race.key] || S.run(race, runners, wIdx, new U.RNG(card.seed), { frames: watch });
      if (played[race.key]) { const me = runners.find(r => r.rider === 'P'); if (me && me.horse.id) { G.bond = G.bond || {}; G.bond[me.horse.id] = (G.bond[me.horse.id] || 0) + 1; } } // 絆：自分で乗った回数
      if (HS.Jockey && race.grade !== 'GF') HS.Jockey.record(race, sim, runners); // GF は特別枠：リーディングの勝ち数に数えない
      W.applyResults(race, sim, runners, wIdx);
      const rec = W.noteRecord(race, sim);
      report.races.push({ race, sim, runners, hasMine, watch, ridden: !!played[race.key], ride: card.ride, rec });
    }
    G.entries = {}; G.rides = {};
    // GF の週は特別枠：時が進まない（調教・回復・評判の下がり無し）
    if (G.week <= 4) {
      if (HS.Jockey) HS.Jockey.weekly();
      // 調教と回復
      W.weeklyCare(wIdx, report);
    }
    // 暦を進める
    const y0 = G.year;
    W.nextWeek(report);
    if (HS.Jockey && G.year !== y0) HS.Jockey.yearEnd(y0);
    if (HS.Trophy && G.year !== y0) HS.Trophy.yearEnd(y0); // 年末の表彰のトロフィー（ホールオブフェイム）
    if (HS.Jockey) HS.Jockey.weekStart();
    G.rngState = Math.floor(rng.next() * 4294967296);
    G.lastWeek = { date: report.date, races: report.races.map(r => W.slimResult(r)) };
    W._week = null;
    return report;
  };
  // コースレコード（このゲームの中で出た、競馬場・芝ダ・距離ごとの一番速い時計）
  W.recKey = race => `${race.course}|${race.surface}|${race.dist}`;
  W.courseRecord = race => (G && G.records.course || {})[W.recKey(race)] || null;
  // time の走破タイムがいまのレコードを破るか（0.1秒に丸めて比べる。同じ時計はタイ記録で、塗り替えない）
  W.recordCheck = function (race, time, old) {
    if (old === undefined) old = G ? W.courseRecord(race) : null;
    const t = Math.round(time * 10) / 10;
    return { t, old: old ? old.t : null, beat: !!old && t < old.t, diff: old ? Math.round((t - old.t) * 10) / 10 : null };
  };
  // 勝ち時計がレコードなら書きかえる。前のレコードを破ったときは { t, old, diff, rode } を返す（結果の画面の「RECORD」に使う）
  // rode：プレイヤーが乗って作ったレコード（一覧で強調する）
  W.noteRecord = function (race, sim) {
    const w = sim.results[0]; if (!w || !(w.time > 0)) return null;
    G.records.course = G.records.course || {};
    const key = W.recKey(race), old = G.records.course[key];
    const chk = W.recordCheck(race, w.time, old || null);
    if (old && !chk.beat) return null;
    const rode = w.rider === 'P';
    G.records.course[key] = { t: chk.t, name: w.horse.name, year: race.year, race: R.label(race), jockey: w.jockey ? w.jockey.name : '', rode, mine: rode || w.horse.owner === 'P', prev: old ? old.t : null };
    if (old && (w.rider === 'P' || w.horse.owner === 'P')) news(`${w.horse.name}が${race.course}${race.surface === 'ダ' ? 'ダート' : '芝'}${race.dist}mのコースレコードを塗り替えた（${U.time(w.time)}）。`, 'good');
    return old ? { t: chk.t, old: old.t, diff: chk.diff, rode, name: w.horse.name } : null;
  };
  // 騎乗せずに1週進める（馬主のゲームと、テスト）
  W.advance = () => W.finishWeek({});

  W.frameOf = function (num, n) {
    if (n <= 8) return num;
    // JRA の枠の分け方：頭数が8を超えたぶんは外の枠から増やす（18頭なら7・8枠が3頭）
    const base = Math.floor(n / 8), extra = n % 8;
    let start = 1;
    for (let f = 1; f <= 8; f++) {
      const cnt = base + (f > 8 - extra ? 1 : 0);
      if (num < start + cnt) return f;
      start += cnt;
    }
    return 8;
  };

  W.setOdds = function (runners, race, wIdx, r) {
    r = r || rng;
    const est = runners.map(x => S.power(x.horse, race, wIdx, x).total + r.normal(0, 1.8) + (x.horse.hist && x.horse.gradedWins.length ? 1.5 : 0));
    const ex = est.map(e => Math.exp(0.17 * (e - Math.max(...est))));
    const tot = U.sum(ex);
    const ps = ex.map(e => e / tot);
    runners.forEach((x, i) => { x.odds = U.clamp(Math.round(0.8 / ps[i] * 10) / 10, 1.1, 999.9); });
    const ord = runners.slice().sort((a, b) => a.odds - b.odds);
    ord.forEach((x, i) => { x.pop = i + 1; });
  };

  // 結果を記録に反映する
  // 着順ごとの賞金（万円）
  W.racePrize = (race, pos) => Math.round((race.prize || 500) * ([1, 0.4, 0.25, 0.15, 0.1][pos - 1] || 0));
  W.applyResults = function (race, sim, runners, wIdx) {
    const year = G.year;
    const pr = race.prize || 500;
    const share = [1, 0.4, 0.25, 0.15, 0.1];
    if (HS.Rating) HS.Rating.annotate(race, sim.results, wIdx); // 1走ごとのレーティング（js/core/rating.js）
    // 人気を先に付ける（お手馬のレースの記録に出走馬の人気を入れるため。前は下の繰り返しの中で1頭ずつ付けていた）
    for (const res of sim.results) { const x = runners.find(r => r.horse === res.horse); res.odds = x.odds; res.pop = x.pop; res.mine = !!(x.mine || x.rider === 'P'); }
    let recOf = null;
    for (const res of sim.results) {
      const h = res.horse;
      const x = runners.find(r => r.horse === h);
      if (h.legend) continue; // スペシャルホースはその場限り（記録だけ残る）
      if (h.filler) {
        // 重賞を勝った・G1で3着以内の「その場限りの馬」は名を残して走り続ける
        if (race.graded && (res.pos === 1 || (race.grade === 'G1' && res.pos <= 3)) && race.region === 'JRA') W.promote(h, race, res, wIdx);
        else continue;
      }
      const gf = race.grade === 'GF'; // グランドフェスティバルは特別枠：出走数・勝ち数・疲れ・休みに数えない（賞金・勝ち鞍・成績は残る）
      if (!gf) {
        h.starts = (h.starts || 0) + 1;
        if (res.pos === 1) h.wins = (h.wins || 0) + 1;
        if (res.pos === 2) h.w2 = (h.w2 || 0) + 1;
        if (res.pos === 3) h.w3 = (h.w3 || 0) + 1;
      }
      const money = res.pos <= 5 ? Math.round(pr * share[res.pos - 1]) : 0;
      h.prize = (h.prize || 0) + money;
      if (res.pos === 1) h.earn = (h.earn || 0) + pr;
      if (res.pos === 2 && race.graded) h.earn = (h.earn || 0) + Math.round(pr * 0.4);
      if (res.pos === 1 && h.owner === 'P' && G.eraless && HS.Eraless) HS.Eraless.unlockWin(race);
      if (race.graded && res.pos === 1) { h.gradedWins.push({ y: year, race: race.name, short: race.short, grade: race.grade, region: race.region }); if (h.owner === 'P' && HS.Season) { HS.Season.onWin(h, race, year); if (gf && HS.Season.onGFWin) HS.Season.onGFWin(h, race); } }
      if (race.trialFor && res.pos <= (race.trialTop || 2)) { h.rights = h.rights || {}; h.rights[race.trialFor] = year; }
      const entry = { y: year, m: race.month, w: race.week, race: race.short || race.name, grade: R.gradeBadge(race), course: race.course, surface: race.surface, dist: race.dist, ground: race.ground, pos: res.pos, n: sim.results.length, time: Math.round(res.time * 10) / 10, margin: res.margin, last3f: res.last3f ? Math.round(res.last3f * 10) / 10 : null, jockey: res.jockey && res.jockey.name, pop: res.pop, rt: res.rt };
      // 自分の持ち馬は、出走馬・ラップ・勝ち時計の記録も残す（js/core/racerec.js。引退で消え、殿堂入りなら殿堂に残る）
      if (h.owner === 'P' && HS.RaceRec) entry.rec = recOf || (recOf = HS.RaceRec.make(race, sim));
      h.results.push(entry);
      // AI の馬は最近の成績だけ残す（セーブを小さく）
      const keep = h.owner === 'P' ? 80 : 12;
      while (h.results.length > keep) h.results.shift();
      // 疲れ（js/core/fatigue.js：格×距離×激戦の度合い＋移動）・休み（GF は動かさない）。故障も調子も無い
      if (!gf) {
        HS.Fatigue.afterRace(h, race, sim.results, res.pos - 1, x.travel);
        h.restUntil = wIdx + (race.grade === 'G1' ? 5 + rng.int(0, 4) : 3 + rng.int(0, 4));
        h.lastRaceW = wIdx;
      }
      if (h.owner === 'P') {
        const owner = Math.round(money * 0.8 + 30 * IDX());
        G.player.money += owner;
        if (!gf) G.records.player.starts++;
        G.records.player.earn += owner;
        if (res.pos === 1) {
          if (!gf) G.records.player.wins++;
          if (race.graded) G.records.player.g1.push({ y: year, race: race.short || race.name, grade: race.grade, horse: h.name, region: race.region });
          news(`${h.name}が${R.label(race)}${race.grade ? '（' + R.gradeBadge(race) + '）' : ''}を勝利！ 賞金 ${U.money(owner)}`, race.grade === 'G1' ? 'g1' : 'win');
        }
      }
      // 年間の成績（表彰に使う）
      if (race.graded || res.pos === 1) {
        const pts = race.graded ? ({ G1: [10, 4, 2], G2: [4, 1.5, 0.5], G3: [2, 0.6, 0.2] }[race.grade] || [1, 0, 0])[res.pos - 1] || 0 : (res.pos === 1 ? 0.3 : 0);
        if (pts > 0) {
          const key = h.id;
          const rec = G.records.pts[key] = G.records.pts[key] || { name: h.name, born: h.born, sex: h.sex, owner: h.owner, hist: !!h.hist, pts: 0, sprint: 0, dirt: 0, year };
          rec.pts += pts; if (race.dist <= 1600 && race.surface === '芝') rec.sprint += pts; if (race.surface === 'ダ') rec.dirt += pts;
        }
      }
    }
    if (G.eraless && HS.Trophy) HS.Trophy.afterRace(race, sim); // 着差の合計・G1 の連勝のトロフィー（js/core/trophy.js）
    if (G.eraless && HS.Special) HS.Special.afterRace(race, sim);
    // 記録（G1 は全部、ほかの重賞は勝ち馬だけ）
    if (race.graded) {
      const win = sim.results[0];
      const hist = G.eraless ? null : W.histWinner.get(`${year}${race.name}`) || null;
      const rec = { race: race.name, short: race.short, grade: race.grade, region: race.region, m: race.month, w: race.week, winner: win.horse.name, owner: win.horse.owner, hist: !!win.horse.hist, sire: win.horse.sire, time: Math.round(win.time * 10) / 10, histWinner: hist, second: sim.results[1] && sim.results[1].horse.name };
      if (race.grade === 'G1') {
        (G.records.g1[year] = G.records.g1[year] || []).push(rec);
        const histNote = hist && hist !== win.horse.name ? `（史実では${hist}）` : '';
        news(`${R.label(race)}は${win.horse.name}が制した${histNote}。`, 'g1race');
      } else if (win.horse.owner === 'P') (G.records.graded[year] = G.records.graded[year] || []).push(rec);
    }
  };

  W.promote = function (f, race, res, wIdx) {
    delete f.filler;
    f.id = newId();
    // いまの値を素質に直す（成長の途中ならピークはもう少し上）
    const g = H.growthFactor(Object.assign({}, f, { growth: '普通' }), wIdx);
    for (const k of H.STATS) f.pot[k] = U.clamp(f.pot[k] / Math.max(0.75, g), 20, 106);
    f.owner = 'AI'; f.loc = 'stable'; f.promoted = true;
    f.wins = race.graded ? 3 : 1; f.starts = 6; f.earn = 3000;
    f.retireYear = f.born + 6 + rng.int(0, 2);
    G.horses[f.id] = f;
    // 多すぎたら古いものから引退
    const promoted = W.all().filter(h => h.promoted);
    if (promoted.length > 160) {
      promoted.sort((a, b) => H.overall(a.pot) - H.overall(b.pot));
      for (const h of promoted.slice(0, promoted.length - 160)) delete G.horses[h.id];
    }
  };

  // 調教・放牧と疲労の回復（疲労は毎週、健康の値に応じて抜ける。レースに出た週も。js/core/fatigue.js）
  W.weeklyCare = function (wIdx, report) {
    const raced = new Set();
    for (const r of report.races) for (const x of r.runners) raced.add(x.horse.id);
    for (const h of W.all()) {
      if (h.loc === 'stable') {
        if (!raced.has(h.id)) {
          if (h.owner === 'P') {
            const menu = G.mode === 'jockey' || h.auto || !h.menu ? W.autoMenu(h, wIdx) : h.menu; // 騎手のゲームでは調教は調教師にまかせる
            const tr = H.train(h, menu, rng, wIdx);
            h.lastTrain = { menu, time: tr.time, date: report.date };
          }
        }
        HS.Fatigue.weekly(h);
      } else if (h.loc === 'farm') {
        H.rest(h);
      }
    }
  };
  W.autoMenu = function (h, wIdx) {
    const st = HS.Fatigue.stage(h);
    if (st >= 3) return '休養';
    if (st >= 2) return '軽め';
    const toRest = (h.restUntil || 0) - wIdx;
    if (toRest > 2) return rng.pick(['プール', '軽め', 'ウッド(馬なり)']);
    if (toRest > 0) return rng.pick(['坂路(強め)', 'ウッド(強め)', '併せ馬']);
    return rng.pick(['坂路(馬なり)', 'ウッド(馬なり)', '坂路(強め)']);
  };

  // 暦を1週進める（月末・年明けの処理を含む）
  W.nextWeek = function (report) {
    const endOfMonth = G.week === 4;
    if (endOfMonth) W.monthEnd(report);
    // 12月4週が終わったら、グランドフェスティバルの招待。GF があれば GF の週（12月の5週め）に入る
    if (G.week === 4 && G.month === 12 && HS.Season && HS.Season.gfStage && HS.Season.gfStage()) { G.week = HS.Season.GF_WEEK; W._cache = null; return; }
    G.week++;
    if (G.week > 4) { G.week = 1; G.month++; }
    if (G.month > 12) { G.month = 1; G.year++; W.newYear(report); }
    if (G.week === 1) W.monthStart(report);
    W._cache = null;
  };

  W.monthlyCost = function () {
    let c = 0;
    for (const h of W.mine()) {
      if (h.loc === 'stable') c += 60;
      else if (h.loc === 'farm') c += 15;
      else if (h.loc === 'mare') c += 15;
    }
    if (G.mode !== 'jockey') c += G.farmLevel * 50;
    return Math.round(c * IDX());
  };
  W.monthEnd = function (report) {
    const c = W.monthlyCost();
    G.player.money -= c;
    report.events.push(`今月の経費 ${U.money(c)}（預託料・牧場の維持費）`);
    if (G.mode === 'jockey' && HS.Season) HS.Season.monthEnd();
    else if (G.player.money < 0) news(`資金がマイナスです（${U.money(G.player.money)}）。馬を売るなどして立て直そう。`, 'warn');
  };
  W.monthStart = function (report) {
    // 3月1週：出産
    if (G.month === 3) W.foaling(report);
    // 市場は毎月入れ替え
    W.refreshMarket(false);
    // 2歳の4月：入厩の案内
    if (G.month === 4) {
      const n = W.mine('farm').filter(h => G.year - h.born === 2).length;
      if (n && G.mode !== 'jockey') news(`2歳馬が${n}頭、入厩できるようになった。名前を付けて厩舎へ送ろう。`, 'info');
    }
    // AI の2歳史実馬のデビュー準備
    for (const h of W.all()) {
      if (h.owner === 'P' || h.loc !== 'farm') continue;
      const age = G.year - h.born;
      if (age === 2 && G.month >= 5 && (rng.chance(0.25) || G.month >= 10)) { h.loc = 'stable'; h.restUntil = W.wIdx() + rng.int(0, 3); }
      if (age >= 3) h.loc = 'stable';
    }
    // 2月：種付けの季節
    if (G.month === 2) news('種付けの季節が来た（2月〜6月）。牧場から繁殖牝馬の相手を選ぼう。', 'info');
  };

  W.newYear = function (report) {
    const prev = G.year - 1;
    W.awards(prev);
    // 史実馬の引退
    for (const h of W.all()) {
      if (h.owner === 'P') continue;
      if (h.loc === 'stable' || h.loc === 'farm') {
        const age = G.year - h.born;
        if ((h.retireYear && h.retireYear < G.year && age >= 2) || age >= 9) delete G.horses[h.id];
      }
    }
    // プレイヤーの繁殖牝馬の年齢
    for (const h of W.mine('mare')) if (G.year - h.born >= 23) { news(`${h.name}は繁殖を引退した。`, 'info'); delete G.horses[h.id]; }
    // 種牡馬の収入
    let stud = 0;
    for (const h of W.mine('stud')) {
      const books = Math.round(30 + (h.studRating || 50) * 0.9);
      const inc = Math.round(h.studFee * books * 0.25);
      stud += inc;
    }
    if (stud > 0) { G.player.money += stud; news(`種牡馬の種付け料収入 ${U.money(stud)}`, 'money'); }
    // 年代なしのゲーム：今年デビューする史実馬をランダムに
    if (G.eraless && HS.Eraless) HS.Eraless.crop();
    // 古い記録を整理
    G.records.pts = {};
    news(`${G.year}年が明けた。`, 'info');
  };

  // 出産（3月）：プレイヤーの牝馬の仔と、史実馬の誕生
  W.foaling = function (report) {
    for (const m of W.mine('mare')) {
      if (!m.cover) continue;
      if (m.cover.year === G.year) continue; // 今年の種付け（出産は来年）
      if (m.cover.year !== G.year - 1 || !m.cover.ok) { m.cover = null; continue; }
      const sire = W.findStallion(m.cover.sire) || { name: m.cover.sire, rating: 60 };
      // 史実の仔か？
      const histFoal = (W.histFoalsOfDam.get(m.name) || []).find(d => d.born === G.year && d.sire === m.cover.sire);
      let foal;
      if (histFoal && W.histByName.get(histFoal.name) && !G.bornHist.includes(histFoal.name)) {
        foal = H.fromHistoric(W.histByName.get(histFoal.name), newId());
        G.bornHist.push(histFoal.name);
        news(`${m.name}に${sire.name}の仔が誕生！ 史実の名馬「${foal.name}」だ！`, 'g1');
      } else {
        const f = P.makeFoal(rng, Object.assign({ distMin: 1600, distMax: 2400, surface: '芝' }, W.stallionsOf(G.year - 1).find(s => s.name === sire.name) || sire), m, G.year);
        f.coat = H.pickCoat(rng, (W.stallionByName.get(sire.name) || {}).coat, m.coat);
        foal = W.horseFromFoal(f, sire.name, m.name, G.year, histFoal && !W.histByName.get(histFoal.name) ? histFoal.name : '');
        if (histFoal && foal.name) { for (const k of H.STATS) foal.pot[k] = Math.min(104, foal.pot[k] + 10); G.bornHist.push(foal.name); }
        news(`${m.name}に${sire.name}の仔（${foal.sex}）が誕生した。`, 'birth');
      }
      foal.owner = 'P'; foal.loc = 'farm';
      G.horses[foal.id] = foal;
      if (foal.name) P.register(foal.name, foal.sire, foal.dam);
      m.foals = m.foals || []; m.foals.push(foal.id);
      m.cover = null;
    }
    // 史実馬の誕生（母をプレイヤーが持っていない仔）。年代なしのゲームでは、毎年の初めにランダムに出す（eraless.js）
    for (const d of G.eraless ? [] : W.histByBorn.get(G.year) || []) {
      const damMine = W.all().some(h => h.owner === 'P' && h.name === d.dam);
      if (damMine) { if (!G.bornHist.includes(d.name) && !G.erased.includes(d.name)) { G.erased.push(d.name); news(`歴史が変わった……「${d.name}」はこの世界には生まれなかった。`, 'hist'); } continue; }
      W.spawnHistoric(d, false);
    }
  };

  // 種付け
  W.canBreed = () => G.month >= 2 && G.month <= 6;
  W.breed = function (mareId, sireName) {
    rng = new U.RNG(G.rngState);
    const m = G.horses[mareId];
    if (!m || m.loc !== 'mare') return { err: '繁殖牝馬ではない' };
    if (!W.canBreed()) return { err: '種付けは2月〜6月' };
    if (m.cover && m.cover.year === G.year && m.cover.ok) return { err: 'もう受胎している' };
    const s = W.stallionsOf(G.year).find(x => x.name === sireName);
    if (!s) return { err: 'その種牡馬は今年は種付けできない' };
    const fee = s.owner === 'P' ? 0 : s.fee;
    if (G.player.money < fee) return { err: '資金が足りない' };
    G.player.money -= fee;
    const age = G.year - m.born;
    const p = U.clamp(0.88 - Math.max(0, age - 14) * 0.04, 0.4, 0.9);
    const ok = rng.chance(p);
    m.cover = { year: G.year, sire: sireName, ok };
    G.rngState = Math.floor(rng.next() * 4294967296);
    news(`${m.name}に${sireName}を種付け（${U.money(fee)}）。${ok ? '受胎を確認した。' : '不受胎だった……。'}`, ok ? 'info' : 'warn');
    return { ok, fee };
  };

  // ---------- 厩舎・牧場の操作 ----------
  W.toStable = function (id) {
    const h = G.horses[id];
    if (!h || h.owner !== 'P') return '持ち馬ではない';
    const age = G.year - h.born;
    if (age < 2 || (age === 2 && G.month < 4)) return '入厩は2歳の4月から';
    if (!h.name) return '先に名前を付けてください';
    h.loc = 'stable';
    return null;
  };
  W.toFarm = function (id) { const h = G.horses[id]; if (!h || h.owner !== 'P') return '持ち馬ではない'; W.unenter(id); h.loc = 'farm'; return null; };
  W.rename = function (id, name) {
    W.dirty();
    const h = G.horses[id];
    name = (name || '').trim();
    if (!h || h.owner !== 'P') return '持ち馬ではない';
    if (h.name) return 'もう名前がある';
    if (!/^[ァ-ヶー・ヴ]{2,9}$/.test(name)) return '名前はカタカナ2〜9文字';
    if (W.usedNames().has(name)) return 'その名前は使われている';
    h.name = name;
    P.register(name, h.sire, h.dam);
    return null;
  };
  W.suggestName = function (r) { const used = W.usedNames(); const base = H.makeName(r || new U.RNG(Date.now() % 1e9), used); const c = G.player.crown; return c && (c + base).length <= 9 ? c + base.slice(0, 9 - c.length) : base; };
  W.retire = function (id) {
    W.dirty();
    const h = G.horses[id];
    if (!h || h.owner !== 'P') return { err: '持ち馬ではない' };
    W.unenter(id);
    if (h.sex === '牝') { h.loc = 'mare'; h.cover = null; h.foals = []; if (W.mareByName.has(h.name)) h.quality = W.mareByName.get(h.name).quality; news(`${h.name}は引退し、繁殖牝馬になった。`, 'info'); return { to: 'mare' }; }
    const g1 = h.gradedWins.filter(g => g.grade === 'G1').length;
    const data = W.stallionByName.get(h.name);
    if (!h.gelding && (data || g1 > 0 || h.prize >= 30000 || h.gradedWins.length >= 3)) {
      h.loc = 'stud';
      const peak = H.overall(h.pot);
      h.studRating = data ? data.rating : Math.round(U.clamp(peak * 0.85 + g1 * 2.5 + h.gradedWins.length * 0.5, 40, 97));
      h.studFee = data ? W.feeOf(data, G.year + 1) || 300 : Math.round(U.clamp(Math.pow(Math.max(0, h.studRating - 45), 2) * 0.9, 50, 3000) / 10) * 10;
      h.studTraits = data ? data.traits || [] : [];
      news(`${h.name}は種牡馬になった（種付け料 ${U.money(h.studFee)}）。`, 'g1');
      return { to: 'stud' };
    }
    delete G.horses[id];
    news(`${h.name}は引退して乗馬になった。おつかれさま。`, 'info');
    return { to: 'gone' };
  };
  W.sellPrice = function (h) {
    const wIdx = W.wIdx();
    if (h.loc === 'stud') return Math.round(h.studFee * 40);
    if (h.loc === 'mare') return Math.round((300 + Math.pow(P.mareQuality(h) / 10, 3) * 4) * IDX());
    const age = G.year - h.born;
    const c = H.overall(H.cur(h, wIdx));
    let p = (200 + Math.pow(Math.max(0, c - 40) / 10, 3) * 30) * IDX() + (h.prize || 0) * 0.15;
    if (age <= 1) p = (300 + Math.pow(H.overall(h.pot) / 10, 3) * 8) * IDX();
    if (age >= 6) p *= 0.5;
    return Math.round(p / 10) * 10;
  };
  W.sell = function (id) {
    W.dirty();
    const h = G.horses[id];
    if (!h || h.owner !== 'P') return { err: '持ち馬ではない' };
    const p = W.sellPrice(h);
    G.player.money += p;
    W.unenter(id);
    delete G.horses[id];
    news(`${W.displayName(h)}を${U.money(p)}で売却した。`, 'money');
    return { price: p };
  };
  W.farmCap = () => 4 + G.farmLevel * 2;
  W.farmUpgradeCost = () => Math.round(5000 * G.farmLevel * IDX() / 10) * 10;
  W.upgradeFarm = function () {
    const c = W.farmUpgradeCost();
    if (G.farmLevel >= 5) return '最大です';
    if (G.player.money < c) return '資金が足りない';
    G.player.money -= c; G.farmLevel++;
    news(`牧場を拡張した。繁殖牝馬を${W.farmCap()}頭まで持てる。`, 'info');
    return null;
  };

  // ---------- 市場 ----------
  W.refreshMarket = function (force) {
    const key = G.year * 12 + G.month;
    if (!force && G.market.month === key) return;
    const r = new U.RNG(U.hash(`mk:${G.seed}:${key}`));
    G.market.month = key;
    G.market.gen = [];
    for (let i = 0; i < 6; i++) {
      const age = r.pick([0, 1, 1, 2]);
      if (age === 0 && G.month < 4) continue;
      const mean = 58 + r.normal(0, 7);
      const h = W.makeGenYoung(r, G.year - age, mean);
      const sireFee = (W.stallionsOf(G.year - age - 1).find(s => s.name === h.sire) || { fee: 100 }).fee;
      const price = Math.round(((300 + Math.pow(Math.max(0, mean - 40) / 10, 3) * 6 + r.normal(0, 150)) * IDX() + sireFee * 0.9) / 10) * 10;
      G.market.gen.push({ horse: h, price: Math.max(200, price) });
    }
    G.market.genMares = [];
    for (let i = 0; i < 4; i++) {
      const q = 45 + r.int(0, 25);
      const m = W.makeGenMare(r, q);
      G.market.genMares.push({ horse: m, price: Math.round((400 + Math.pow(q / 10, 3) * 5) * IDX() / 10) * 10 });
    }
  };
  // 史実馬（デビュー前）と史実の繁殖牝馬
  W.marketHistoric = function () {
    if (G.eraless && HS.Eraless) return HS.Eraless.shop();
    const out = [];
    for (const h of W.all()) {
      if (!h.hist || h.owner === 'P' || h.loc !== 'farm' || h.starts > 0 || h.foreignTrained) continue;
      const age = G.year - h.born;
      if (age > 2) continue;
      const d = W.histByName.get(h.name);
      const sire = W.stallionsOf(h.born - 1).find(s => s.name === h.sire) || W.stallionByName.get(h.sire);
      const sireFee = sire ? (sire.fee != null ? sire.fee : W.feeOf(sire, h.born - 1)) : 200;
      let price = (800 + Math.max(0, ((d ? d.rating : 80) - 80)) * 60) * IDX() + sireFee * 1.1;
      price *= age === 0 ? 0.8 : age === 2 ? 1.3 : 1;
      out.push({ kind: 'hist', horse: h, data: d, price: Math.round(price / 10) * 10 });
    }
    return out.sort((a, b) => a.horse.born - b.horse.born || b.price - a.price);
  };
  // 海外の史実馬（デビュー前）。輸入の費用を足した値段
  W.marketForeign = function () {
    if (G.eraless) return []; // 年代なしのゲームは、海外の馬も馬の店（marketHistoric）に並ぶ
    const out = [];
    for (const h of W.all()) {
      if (!h.hist || !h.foreignTrained || h.owner === 'P' || h.loc !== 'farm' || h.starts > 0) continue;
      const age = G.year - h.born;
      if (age > 2) continue;
      const d = W.histByName.get(h.name);
      let price = (2500 + Math.max(0, ((d ? d.rating : 80) - 80)) * 90) * IDX();
      price *= age === 0 ? 0.8 : age === 2 ? 1.3 : 1;
      out.push({ kind: 'hist', horse: h, data: d, price: Math.round(price / 10) * 10, foreign: true });
    }
    return out.sort((a, b) => a.horse.born - b.horse.born || b.price - a.price);
  };
  W.marketMares = function () {
    const out = [];
    for (const m of HS.DATA.mares || []) {
      if (m.from > G.year || G.year - m.born > 20 || G.year - m.born < 3) continue;
      if (G.erased.includes(m.name)) continue;
      if (W.all().some(h => h.name === m.name)) continue; // 持ち馬、またはまだ現役で走っている
      const price = Math.round((1500 + Math.pow(m.quality / 10, 3) * 9) * IDX() / 10) * 10;
      // 今年生まれる史実の仔がいるなら「受胎中」で買える
      const inFoal = (m.foals || []).find(f => f[0] === G.year && G.month < 3);
      out.push({ kind: 'hmare', data: m, price: inFoal ? Math.round(price * 1.3) : price, inFoal });
    }
    return out;
  };
  W.buy = function (item) {
    W.dirty();
    const n = item.kind === 'hmare' || item.kind === 'gmare' ? W.mine('mare').length : 0;
    if ((item.kind === 'hmare' || item.kind === 'gmare') && n >= W.farmCap()) return '繁殖牝馬の枠がいっぱい（牧場を拡張しよう）';
    if (G.player.money < item.price) return '資金が足りない';
    if (G.mode === 'jockey' && HS.Season && !HS.Season.canBuy()) return `お手馬は${HS.Season.MAX_OWN}頭まで`;
    if (item.kind === 'pool') return HS.Eraless.buy(item);
    if (item.kind === 'hist') {
      const h = G.horses[item.horse.id];
      if (!h || h.owner === 'P') return '売り切れ';
      h.owner = 'P'; h.loc = 'farm';
      if (h.foreignTrained) { h.foreignTrained = false; h.imported = true; } // 日本に連れてきて走らせる
      G.player.money -= item.price;
      news(`史実馬「${h.name}」を${U.money(item.price)}で購入した！`, 'g1');
      return null;
    }
    if (item.kind === 'hmare') {
      const m = item.data;
      const r = new U.RNG(U.hash('mare:' + m.name));
      const h = {
        id: newId(), name: m.name, sex: '牝', born: m.born, sire: m.sire, dam: m.dam, hist: true, histMare: true, owner: 'P', loc: 'mare',
        quality: m.quality, coat: m.coat || H.pickCoat(r), pot: H.makeStats(r, m.quality - 5, 3), apt: { turf: 85, dirt: 60, heavy: 50 }, distMin: 1600, distMax: 2400, growth: '普通', style: '先行', kire: 3 + r.int(0, 3), skills: [],
        bonus: {}, wins: 0, starts: 0, earn: 0, gradedWins: [], results: [], cover: null, foals: [],
      };
      H.splitSurface(h, r);
      if (item.inFoal) h.cover = { year: G.year - 1, sire: item.inFoal[1], ok: true };
      G.horses[h.id] = h;
      G.player.money -= item.price;
      news(`名牝「${m.name}」を${U.money(item.price)}で購入した。${item.inFoal ? item.inFoal[1] + 'の仔を受胎している。' : ''}`, 'g1');
      return null;
    }
    if (item.kind === 'gen' || item.kind === 'gmare') {
      const list = item.kind === 'gen' ? G.market.gen : G.market.genMares;
      const i = list.findIndex(x => x.horse.id === item.horse.id);
      if (i < 0) return '売り切れ';
      const h = list[i].horse;
      list.splice(i, 1);
      h.owner = 'P';
      h.loc = item.kind === 'gmare' ? 'mare' : 'farm';
      G.horses[h.id] = h;
      G.player.money -= item.price;
      news(`${W.displayName(h)}を${U.money(item.price)}で購入した。`, 'money');
      return null;
    }
    return '不明な品';
  };

  // ---------- 表彰（JRA賞にならった年度表彰） ----------
  W.awards = function (year) {
    const list = Object.values(G.records.pts).filter(r => r.year === year);
    if (!list.length) return;
    const best = (f, key) => { const c = list.filter(f).sort((a, b) => b[key || 'pts'] - a[key || 'pts'])[0]; return c && c[key || 'pts'] > 0 ? c : null; };
    const age = r => year - r.born;
    const A = {
      '年度代表馬': best(() => true),
      '最優秀2歳牡馬': best(r => age(r) === 2 && r.sex !== '牝'),
      '最優秀2歳牝馬': best(r => age(r) === 2 && r.sex === '牝'),
      '最優秀3歳牡馬': best(r => age(r) === 3 && r.sex !== '牝'),
      '最優秀3歳牝馬': best(r => age(r) === 3 && r.sex === '牝'),
      '最優秀4歳以上牡馬': best(r => age(r) >= 4 && r.sex !== '牝'),
      '最優秀4歳以上牝馬': best(r => age(r) >= 4 && r.sex === '牝'),
      '最優秀短距離馬': best(() => true, 'sprint'),
      '最優秀ダートホース': best(() => true, 'dirt'),
    };
    const out = {};
    for (const [k, v] of Object.entries(A)) if (v) out[k] = { name: v.name, owner: v.owner };
    G.records.awards[year] = out;
    const top = out['年度代表馬'];
    if (top) news(`${year}年の年度代表馬は${top.name}${top.owner === 'P' ? '（あなたの馬！）' : ''}。`, top.owner === 'P' ? 'g1' : 'info');
  };

  // ---------- セーブ ----------
  W.slimResult = function (r) {
    return {
      key: r.race.key, name: r.race.name, short: r.race.short, rec: r.rec || null, grade: r.race.grade, year: r.race.year, region: r.race.region, course: r.race.course, surface: r.race.surface, dist: r.race.dist, ground: r.race.ground, mine: r.hasMine,
      rows: r.sim.results.map(x => ({ pos: x.pos, num: x.num, frame: x.frame, name: x.horse.name, mine: x.mine, hist: !!x.horse.hist, sex: x.horse.sex, age: G.year - x.horse.born, jockey: x.jockey && x.jockey.name, weight: x.weight, time: Math.round(x.time * 10) / 10, margin: x.margin, last3f: x.last3f ? Math.round(x.last3f * 10) / 10 : null, pop: x.pop, odds: x.odds, sire: x.horse.sire })),
    };
  };
  W.serialize = function () { G.pedExtra = P.extra; return JSON.stringify(G); };
  W.load = function (json) {
    const g = typeof json === 'string' ? JSON.parse(json) : json;
    if (!g || !g.v || !g.horses) throw new Error('セーブデータが読めない');
    W.migrate(g);
    G = g;
    U.ERA = G.eraless && HS.Eraless ? HS.Eraless.ERA : null;
    if (HS.Edits) HS.Edits.apply(G.edits || {});
    W.index();
    P.build(G.pedExtra || {});
    rng = new U.RNG(G.rngState);
    W._cache = null;
    return G;
  };
  // 古いセーブを今の形にそろえる
  W.migrate = function (g) {
    g.settings = Object.assign({ animSpeed: 1, showHistNote: true }, g.settings || {});
    g.records = Object.assign({ g1: {}, graded: {}, awards: {}, pts: {}, course: {}, hall: [], player: { starts: 0, wins: 0, earn: 0, g1: [] } }, g.records || {});
    g.market = g.market || { gen: [], genMares: [], month: 0 };
    g.farmLevel = g.farmLevel || 1;
    g.erased = g.erased || []; g.rides = g.rides || {}; g.broke = g.broke || 0; g.gameOver = g.gameOver || null; g.reserve = g.reserve || []; g.dc = g.dc || null; g.lineup = g.lineup || {}; g.unlocked = g.unlocked || []; if (g.eraless && !g.shopKeys) g.shopKeys = HS.Eraless ? HS.Eraless.migrateKeys(g) : []; /* 前のセーブは、自分の馬の勝ち鞍で馬の店を開けておく */ g.trophies = g.trophies || {}; g.hallOwn = g.hallOwn || []; if (g.eraless && !g.startYear) g.startYear = 2025; g.mode = g.mode || 'owner'; g.bornHist = g.bornHist || []; g.pedExtra = g.pedExtra || {}; g.edits = g.edits || {}; g.bond = g.bond || {}; /* 絆：馬ごとの、自分で乗った回数 */
    if (g.dc && HS.Season && HS.Season.dcUpgrade) HS.Season.dcUpgrade(g); // 前の形の招待（12月2〜4週に GF を走っていた頃）を、GF の週の形に
    if (HS.Trophy && HS.Trophy.migrateRemoved) HS.Trophy.migrateRemoved(g); // 外したトロフィー（仕様書に無い5つ・豪州2歳三冠）の記録を消す
    if (g.eraless && !g.gfTrophy && HS.Trophy && HS.Trophy.migrateGF) { HS.Trophy.migrateGF(g); g.gfTrophy = 1; } // 前のセーブ（GF ごとのトロフィーより前）：勝った GF の区分のトロフィーを付ける
    if (g.eraless && !g.gfShop && HS.Eraless && HS.Eraless.gfKeys) { for (const k of HS.Eraless.gfKeys(g)) if (!g.shopKeys.includes(k)) g.shopKeys.push(k); g.gfShop = 1; } // 前のセーブ（GF の馬の段より前）：自分の馬が勝った GF の区分を開けておく
    for (const h of Object.values(g.horses)) {
      h.bonus = h.bonus || {}; h.results = h.results || []; h.gradedWins = h.gradedWins || []; h.coat = h.coat || '鹿毛';
      // 能力の形が変わる前のセーブ（瞬発力・パワー・賢さ・気性 → 気性・坂・脚の切れ）
      H.fromLegacy(h);
      if (h.pot) for (const k of H.STATS) if (h.pot[k] == null) h.pot[k] = h.pot.spd || 60;
      if (h.kire == null) h.kire = ({ '逃げ': 3, '先行': 4, '差し': 6, '追込': 6 })[h.style] || 4;
      h.skills = h.skills || [];
      // 騎手のゲームに放牧は無い（持ち主の指摘 2026-10-17「放牧いらない」）：前のセーブで放牧に出した馬は、次の週の頭に自動で入厩に戻す
      if (g.mode === 'jockey' && h.parked) delete h.parked;
      // 故障は無くなった（持ち主の仕様書「故障はなしにする」）：前のセーブで故障していた馬は治った扱い
      if ('injury' in h) delete h.injury;
      // 調子は無くなった（持ち主の決定 2026-10-20「調子のパラメータは無し。疲労だけにする」）：前のセーブの調子の値は読み捨てる
      if ('cond' in h) delete h.cond;
    }
    // レースが OP 以上だけになる前のセーブ（持ち主の決定 2026-10-20）：条件戦（鍵が -c…）の予約・出走登録・騎乗を外す。デビュー戦の予約は、その週の2歳オープンに出る
    if (HS.Races && HS.Races.isOldKey) {
      g.reserve = g.reserve.filter(x => !HS.Races.isOldKey(x.key));
      for (const x of g.reserve) if (x.debut && x.label === '新馬戦') x.label = 'デビュー戦';
      for (const k of Object.keys(g.entries || {})) if (HS.Races.isOldKey(k)) delete g.entries[k];
      for (const k of Object.keys(g.rides)) if (HS.Races.isOldKey(k)) delete g.rides[k];
    }
    // コースレコードの「自分で乗って作ったか」（前の版のセーブには無い。騎手のゲームでは自分の馬＝自分が乗った馬）
    for (const rc of Object.values(g.records.course || {})) if (rc.rode == null) rc.rode = !!rc.mine && g.mode === 'jockey';
    // 前の版のエディット（瞬発力などの数値）は、遊ぶときに H.fromHistoric が読み替える
    g.v = SAVE_VERSION;
  };
  W.saveLocal = function () { try { localStorage.setItem(W.SAVE_KEY, W.serialize()); return true; } catch (e) { return false; } };
  W.loadLocal = function () { try { const s = localStorage.getItem(W.SAVE_KEY); if (!s) return null; return W.load(s); } catch (e) { return null; } };
  W.hasLocal = function () { try { return !!localStorage.getItem(W.SAVE_KEY); } catch (e) { return false; } };
  W.clearLocal = function () { try { localStorage.removeItem(W.SAVE_KEY); } catch (e) { /* 何もしない */ } };
})();
