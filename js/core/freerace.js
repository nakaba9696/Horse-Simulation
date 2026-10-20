// フリーレース：番組と関係なく1レースだけ遊ぶ。競馬場・芝ダート・距離・馬場・天気と、出る馬（自分の馬・史実馬・スペシャルホース、18頭まで）を選ぶ
// 結果はセーブに一切影響しない：馬はすべて写し（自分の馬も）で走らせ、世界の状態（G）にも世界の乱数にも触らない。乱数はこのレースだけの種から
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, S = HS.Sim, W = HS.World;
  const FR = HS.FreeRace = {};
  FR.YEAR = 2025;      // 物価・走破タイムは年代なしのゲームと同じ年で
  FR.MONTH = 6; FR.WEEK = 1;
  FR.MAX = 18;
  FR.GROUNDS = ['良', '稍重', '重', '不良'];
  FR.WEATHERS = ['晴', '曇', '雨', '雪'];
  FR.wIdx = () => H.weekIndex(FR.YEAR, FR.MONTH, FR.WEEK);
  const clone = o => JSON.parse(JSON.stringify(o));

  // ---------- 条件 ----------
  // 競馬場（芝・ダートのどちらがあるか）。番組にある競馬場を、レースの多い順に
  FR.courses = function () {
    const n = {};
    for (const r of HS.DATA.races) n[r.course] = (n[r.course] || 0) + 1;
    return Object.keys(HS.DATA.courses).filter(c => n[c]).sort((a, b) => n[b] - n[a]).map(c => ({ name: c, turf: !!HS.DATA.courses[c].turf, dirt: !!HS.DATA.courses[c].dirt }));
  };
  // その競馬場・芝ダートで実際にレースのある距離（無ければよく使う距離）
  FR.dists = function (course, surface) {
    const s = new Set(HS.DATA.races.filter(r => r.course === course && r.surface === surface).map(r => r.dist));
    const out = [...s].sort((a, b) => a - b);
    return out.length ? out : [1200, 1600, 2000, 2400];
  };
  FR.race = function (o) {
    const c = HS.DATA.courses[o.course] ? o.course : '東京';
    const surface = o.surface === 'ダ' && HS.DATA.courses[c].dirt ? 'ダ' : HS.DATA.courses[c].turf ? '芝' : 'ダ';
    const ds = FR.dists(c, surface);
    const dist = ds.includes(+o.dist) ? +o.dist : ds.reduce((a, b) => Math.abs(b - (+o.dist || 2000)) < Math.abs(a - (+o.dist || 2000)) ? b : a, ds[0]);
    return {
      key: `free-${o.n || 0}`, name: 'フリーレース', short: `フリーレース ${c}${surface === 'ダ' ? 'ダート' : '芝'}${dist}m`,
      course: c, surface, dist, ground: FR.GROUNDS.includes(o.ground) ? o.ground : '良', weather: FR.WEATHERS.includes(o.weather) ? o.weather : '晴',
      year: FR.YEAR, month: FR.MONTH, week: FR.WEEK, age: '3+', grade: '', region: 'JRA', graded: false, free: true,
    };
  };

  // ---------- 出る馬の候補 ----------
  // 史実馬を名前で探す（ひらがなはカタカナに直して比べる）。強い順
  const kata = s => String(s || '').replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
  FR.search = function (q, limit) {
    q = kata(q).trim();
    const all = HS.DATA.historic.filter(d => !q || kata(d.name).includes(q));
    return all.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, limit || 40);
  };
  FR.specials = () => (HS.Special ? HS.Special.list().map(x => x.d) : []);
  // 自分の馬：遊んでいるセーブ（読み込んでいなければ、この端末のセーブを読むだけ。セーブには書かない）
  FR.saveSnapshot = function () {
    if (W.get()) return { g: W.get(), live: true };
    try {
      const s = typeof localStorage !== 'undefined' && localStorage.getItem(W.SAVE_KEY);
      if (!s) return null;
      const g = JSON.parse(s);
      if (!g || !g.horses) return null;
      W.migrate(g); // 写しの中だけをそろえる
      return { g, live: false };
    } catch (err) { return null; }
  };
  FR.myHorses = function (snap) {
    snap = snap === undefined ? FR.saveSnapshot() : snap;
    if (!snap) return [];
    return Object.values(snap.g.horses).filter(h => h.owner === 'P' && h.name && h.pot).sort((a, b) => H.overall(b.pot) - H.overall(a.pot));
  };

  // ---------- 競馬場の札：中央・地方・海外にまとめる（海外は国ごとに並べる） ----------
  FR.GROUPS = [{ id: 'jra', label: '中央' }, { id: 'local', label: '地方' }, { id: 'world', label: '海外' }];
  FR.courseGroups = function () {
    const out = FR.GROUPS.map(g => Object.assign({ courses: [] }, g));
    const by = { JRA: out[0], '地方': out[1], '海外': out[2] };
    for (const c of FR.courses()) {
      const d = HS.DATA.courses[c.name];
      (by[d.region] || out[2]).courses.push(Object.assign({}, c, { dir: d.dir || '右', area: d.area || '', country: d.country || (d.region === '海外' ? '外' : '日') }));
    }
    out[2].courses.sort((a, b) => a.country.localeCompare(b.country, 'ja')); // 国ごとに（国の中はレースの多い順のまま）
    return out.filter(g => g.courses.length);
  };
  FR.groupOf = name => { const d = HS.DATA.courses[name]; return !d ? 'jra' : d.region === 'JRA' ? 'jra' : d.region === '地方' ? 'local' : 'world'; };

  // ---------- 出る馬を選ぶ一覧：能力を列で並べ、見出しで並べ替え、名前・年代・国・脚質・芝ダで絞る ----------
  // 1頭ぶんの行（能力は伸びきったときの値。自分の馬はいまの素質の値）
  const rowCache = new Map();
  const rowOf = (d, kind, key, h) => {
    const T = HS.Season;
    const pot = h.pot;
    return {
      kind, key, name: d.name, born: d.born, sex: d.sex === 'セ' || d.gelding ? 'セ' : d.sex, country: d.country && d.country !== '日' ? d.country : '日',
      surface: d.surface || (h.apt && h.apt.dirt > h.apt.turf ? 'ダ' : '芝'), distMin: h.distMin, distMax: h.distMax, style: h.style, kire: h.kire || 4,
      turf: T ? T.fhOf(pot, '芝') : 0, dirt: T ? T.fhOf(pot, 'ダ') : 0, pot: Object.assign({}, pot), skills: (h.skills || []).slice(),
    };
  };
  FR.rowsOf = function (tab, snap) {
    if (tab === 'mine') return FR.myHorses(snap).map(h => rowOf(Object.assign({}, h, { country: '日', surface: null }), 'mine', h.id, h));
    const src = tab === 'special' ? FR.specials() : HS.DATA.historic;
    const ck = tab + ':' + (HS.Edits ? HS.Edits.version : 0) + ':' + src.length;
    if (!rowCache.has(ck)) rowCache.set(ck, src.map(d => rowOf(d, tab === 'special' ? 'special' : 'hist', d.name, H.fromHistoric(d, 'x'))));
    return rowCache.get(ck);
  };
  FR.STAT_KEYS = ['spd', 'sta', 'dspd', 'dsta', 'guts', 'mind', 'slope'];
  const ORDER_STYLE = ['逃げ', '先行', '差し', '追込'];
  FR.COLS = [
    { k: 'name', label: '馬名', val: x => x.name, str: true, dir: 1 },
    { k: 'born', label: '生年', val: x => x.born, dir: 1 },
    { k: 'country', label: '国', val: x => x.country, str: true, dir: 1 },
    { k: 'turf', label: '芝', title: '総合力（芝・伸びきったとき）', val: x => x.turf, dir: -1, fh: true },
    { k: 'dirt', label: 'ダ', title: '総合力（ダート・伸びきったとき）', val: x => x.dirt, dir: -1, fh: true },
    ...FR.STAT_KEYS.map(k => ({ k, label: H.STAT_SHORT[k], title: H.STAT_LABEL[k], val: x => Math.round(x.pot[k]), dir: -1, heat: true })),
    { k: 'kire', label: '切れ', title: '脚の切れ（1＝ズブい〜8＝切れる）', val: x => x.kire, dir: -1 },
    { k: 'dist', label: '距離', val: x => x.distMin * 10000 + x.distMax, dir: 1 },
    { k: 'style', label: '脚質', val: x => { const i = ORDER_STYLE.indexOf(x.style); return i < 0 ? 9 : i; }, dir: 1 },
  ];
  // o：{ tab: 'hist'|'special'|'mine', q, decade（1990 など）, cty（'日'|'外'）, style, surf（'芝'|'ダ'）, sortKey, sortDir }
  FR.table = function (o, snap) {
    o = o || {};
    const L = HS.List;
    let rows = FR.rowsOf(o.tab || 'hist', snap).filter(x =>
      L.match(o.q, x.name) &&
      (!o.decade || Math.floor(x.born / 10) * 10 === +o.decade) &&
      (!o.cty || (o.cty === '日' ? x.country === '日' : x.country !== '日')) &&
      (!o.style || x.style === o.style) &&
      (!o.surf || (o.surf === '芝' ? x.turf >= x.dirt : x.dirt > x.turf)));
    const key = o.sortKey || (o.tab === 'mine' ? 'turf' : 'turf');
    rows = L.sort(rows, FR.COLS, key, o.sortDir || (FR.COLS.find(c => c.k === key) || {}).dir);
    return rows;
  };
  // 年代の選び肢（その一覧にいる馬の生まれた年代）
  FR.decades = (tab, snap) => [...new Set(FR.rowsOf(tab || 'hist', snap).map(x => Math.floor(x.born / 10) * 10))].sort((a, b) => a - b);

  // ---------- 馬を写して、このレースの年に合わせる ----------
  const peakAge = h => { const p = H.PEAK[h.growth] || H.PEAK['普通']; return Math.round((p[0] + p[1]) / 2); };
  const fresh = (h, id) => {
    h.id = id; h.cond = 0; h.fatigue = 0; delete h.at; delete h.lastRaceW; h.results = (h.results || []).slice(-3);
    return h;
  };
  // spec：{ kind: 'mine'|'hist'|'special', key: id か名前 }
  FR.horse = function (spec, snap) {
    if (spec.kind === 'mine') {
      const src = snap && snap.g.horses[spec.key];
      if (!src) return null;
      const h = fresh(clone(src), `free:m:${src.id}`);
      h.born = src.born + (FR.YEAR - snap.g.year); // いまの年齢のまま
      h._silks = snap.g.player && snap.g.player.silks ? clone(snap.g.player.silks) : null;
      return h;
    }
    const d = spec.kind === 'special' ? FR.specials().find(x => x.name === spec.key) : HS.DATA.historic.find(x => x.name === spec.key) || FR.specials().find(x => x.name === spec.key);
    if (!d) return null;
    const h = fresh(H.fromHistoric(d, `free:${spec.kind}:${d.name}`), `free:${spec.kind}:${d.name}`);
    if (spec.kind === 'special') { h.legend = true; h.born = FR.YEAR - 4; if (HS.DATA.isForeign && HS.DATA.isForeign(d)) { h.foreignTrained = true; h.country = d.country || '外'; } }
    else h.born = FR.YEAR - peakAge(h); // 史実馬はいちばん良い年ごろで
    return h;
  };

  // ---------- 騎手 ----------
  let TOP = null;
  const peakSkill = j => { let s = 0; for (let y = j.from; y <= (j.to || 2026); y++) s = Math.max(s, W.skillAt(j, y)); return Math.round(s || 70); };
  FR.topJockeys = function () {
    if (TOP) return TOP;
    const seen = new Set(), out = [];
    for (const j of HS.DATA.jockeys || []) {
      if (seen.has(j.name) || j.region === '地方') continue; seen.add(j.name);
      out.push({ name: j.name, region: j.region, skill: peakSkill(j) });
    }
    TOP = out.sort((a, b) => b.skill - a.skill).slice(0, 48);
    return TOP;
  };
  const histJockey = name => {
    const m = HS.DATA.historicJockeys && HS.DATA.historicJockeys[name];
    if (!m) return null;
    if (typeof m === 'string') return m;
    return m.default || Object.values(m)[0] || null;
  };

  // ---------- 出走表 ----------
  // o：{ course, surface, dist, ground, weather, entries: [spec], ride: entries の何番目に自分が乗るか（-1 は見るだけ）, seed, n }
  FR.build = function (o, snap) {
    snap = snap === undefined ? FR.saveSnapshot() : snap;
    const race = FR.race(o);
    const r = new U.RNG(o.seed || 1);
    const wIdx = FR.wIdx();
    const seen = new Set();
    const runners = [];
    (o.entries || []).slice(0, FR.MAX).forEach((spec, k) => {
      const key = spec.kind + ':' + spec.key;
      if (seen.has(key)) return; seen.add(key);
      const h = FR.horse(spec, snap);
      if (h) runners.push({ horse: h, jockey: null, rider: k === o.ride ? 'P' : null, mine: spec.kind === 'mine' || k === o.ride });
    });
    if (!runners.length) return null;
    // 騎手：自分 → 史実の主戦 → 残りは強い馬から腕のいい騎手
    const me = runners.find(x => x.rider === 'P');
    if (me) me.jockey = snap && snap.live && HS.Jockey && HS.Jockey.isMode && HS.Jockey.isMode() ? HS.Jockey.playerJockey() : { name: (snap && snap.g.jockey && snap.g.jockey.name) || 'あなた', skill: 75, region: '', player: true };
    const taken = new Set(me ? [me.jockey.name] : []);
    for (const x of runners) {
      if (x.jockey) continue;
      const nm = histJockey(x.horse.name);
      if (!nm || taken.has(nm)) continue;
      const j = (HS.DATA.jockeys || []).find(jj => jj.name === nm);
      if (!j) continue;
      x.jockey = { name: j.name, region: j.region, skill: peakSkill(j) }; taken.add(nm);
    }
    const pool = FR.topJockeys().filter(j => !taken.has(j.name)).map(j => Object.assign({}, j));
    runners.filter(x => !x.jockey).sort((a, b) => H.overall(H.cur(b.horse, wIdx)) - H.overall(H.cur(a.horse, wIdx))).forEach(x => {
      const k = Math.min(pool.length - 1, r.int(0, 2));
      x.jockey = k >= 0 ? pool.splice(k, 1)[0] : { name: '騎手未定', skill: 65 };
    });
    // 枠順
    r.shuffle(runners);
    const n = runners.length;
    runners.forEach((x, i) => { x.num = i + 1; x.frame = W.frameOf(i + 1, n); x.weight = S.weightFor(x.horse, race, race.year); });
    W.setOdds(runners, race, wIdx, new U.RNG((o.seed || 1) ^ 0x2545f491));
    return { race, runners, seed: r.int(1, 2147483646), ride: !!me, free: true, wIdx };
  };
  // 模擬（騎乗するときは ride: true）。このレースの種だけを使う
  FR.sim = (card, opts) => S.create(card.race, card.runners, card.wIdx, new U.RNG(card.seed), Object.assign({ frames: true }, opts || {}));
  FR.run = card => S.run(card.race, card.runners, card.wIdx, new U.RNG(card.seed), { frames: true });
  // 結果の表（UI.resultTable）に渡す形
  FR.slim = function (card, sim) {
    const race = card.race;
    return {
      key: race.key, name: race.name, short: race.short, grade: '', year: race.year, region: race.region, course: race.course, surface: race.surface, dist: race.dist, ground: race.ground, mine: card.runners.some(x => x.mine), rec: null,
      rows: sim.results.map(x => { const run = card.runners.find(rr => rr.horse === x.horse) || {}; return { pos: x.pos, num: x.num, frame: x.frame, name: x.horse.name, mine: !!(run.mine || x.rider === 'P'), hist: !!x.horse.hist, sex: x.horse.sex, age: race.year - x.horse.born, jockey: x.jockey && x.jockey.name, weight: x.weight, time: Math.round(x.time * 10) / 10, margin: x.margin, last3f: x.last3f ? Math.round(x.last3f * 10) / 10 : null, pop: run.pop, odds: run.odds, sire: x.horse.sire }; }),
    };
  };
})();
