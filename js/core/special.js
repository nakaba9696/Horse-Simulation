// スペシャルホース（騎手のゲーム・年代なし。持ち主の決定 2026-10-16）
// 1989年より前に走り終えた名馬は、世界の暦には出ない。条件のグループ（歴代の三冠馬・グランプリホース・無敗の名馬など）にまとめ、
// 自分の馬がその条件にリーチをかける（あと1勝で達成）と、最後のレースにそのグループの名馬が特別に出てくる。勝てば、その名馬たちが馬の店に並ぶ。
// グループの名馬は、データの勝ち鞍から自動で決める（1頭ずつ手で書かない）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World;
  const SP = HS.Special = {};
  SP.MAX_IN_RACE = 4;   // 1レースに出てくる数の上限
  // 史実馬のデータに戦績の数が無い、無敗の名馬
  SP.UNBEATEN = { 'マルゼンスキー': 8, 'ラフィアン': 10 };

  // データの勝ち鞍の名前 → いまの番組の G1（短い名）。名前が変わったレースは読み替える
  const ALIAS = { '朝日杯3歳ステークス': '朝日杯フューチュリティステークス', '阪神3歳牝馬ステークス': '阪神ジュベナイルフィリーズ', '中山グランプリ': '有馬記念', '産経大阪杯': '大阪杯' };
  let g1 = null;
  const g1Map = () => {
    if (g1) return g1;
    g1 = new Map();
    const ey = HS.Eraless ? HS.Eraless.ERA : 2025;
    for (const r of HS.DATA.races || []) if (r.grade === 'G1' && r.from <= ey && ey <= (r.to || 9999)) g1.set(r.name, { short: r.short || r.name, prize: r.prize || 0, at: r.month * 10 + r.week, age: r.age, region: r.region });
    return g1;
  };
  SP.mapWin = function (s) {
    const y = parseInt(s.slice(0, 4), 10);
    let name = s.slice(4);
    if (name === 'エリザベス女王杯' && y < 1996) name = '秋華賞'; // 1995年までは3歳牝馬のレース
    name = ALIAS[name] || name;
    return g1Map().get(name) || null;
  };
  // ---------- 条件のグループ（三冠なら歴代の三冠馬、のように、条件ごとに名馬をまとめる） ----------
  // finals：最後のレース（短い名）。legs(h, race)：それまでに勝っておくもの（＝リーチ）。member(d)：出てくる名馬（データの勝ち鞍で判定）
  const gw = h => (h.gradedWins || []).map(g => ({ y: g.y, r: g.short || g.race }));
  const won = (h, name, pred) => gw(h).some(w => w.r === name && (!pred || pred(w.y)));
  const dn = (d, name) => (d.wins || []).filter(x => x.slice(4) === name).length;
  const sameYear = names => (h, race) => names.every(n => won(h, n, y => y === race.year));
  const prevYear = name => (h, race) => won(h, name, y => y === race.year - 1);
  const other = pairs => (h, race) => { const o = pairs[race.short]; return !!o && won(h, o) && !won(h, race.short); };
  const CLASSIC = ['皐月賞', '日本ダービー', '菊花賞'];
  const g1Count = d => (d.wins || []).filter(x => SP.mapWin(x)).length;
  // 大レースの勝ち（スペシャルホースの元を決める）。JRA は1984年（グレード制）より前は、いまの G1 のうち当時から格の高かったレースだけ
  const OLD_BIG = new Set(['皐月賞', '日本ダービー', '菊花賞', '桜花賞', 'オークス', '天皇賞・春', '天皇賞・秋', '有馬記念', '宝塚記念', '安田記念', 'ジャパンC', 'エリザベス女王杯', '秋華賞', '朝日杯FS', '阪神JF']);
  SP.bigWins = d => (d.wins || []).filter(x => { const k = SP.mapWin(x); return k && (k.region !== 'JRA' || +x.slice(0, 4) >= 1984 || OLD_BIG.has(k.short)); });
  // 勝ったレースの形（距離・馬場）。データの勝ち鞍は暦から、自分の馬の勝ち鞍は暦の名前と年から
  const raceOfWin = (name, y) => (HS.DATA.races || []).find(r => r.name === name && r.from <= y && y <= (r.to || 9999)) || null;
  const winShapes = d => H.winRaces(d);
  const myG1 = h => (h.gradedWins || []).filter(g => g.grade === 'G1').map(g => raceOfWin(g.race, g.y)).filter(Boolean);
  const SPRINT = 1400, STAY = 3000;
  const allRound = rs => (rs.some(r => r.surface === 'ダ') && rs.some(r => r.surface !== 'ダ')) || (rs.some(r => r.dist <= SPRINT) && rs.some(r => r.dist >= STAY));
  const BEAT_MALES = ['天皇賞・秋', '天皇賞・春', '有馬記念', 'ジャパンC', '宝塚記念'];
  SP.unbeatenOf = d => d.unbeaten || SP.UNBEATEN[d.name] || 0;
  SP.STREAK = 8; // 無敗の名馬が出てくる連勝の数
  // トロフィー（data/trophies.js）のリーチで出てくる隠し馬（data/trophy_horses.js。持ち主の仕様書 2026-10-19「トロフィー達成系と隠し馬は紐づけたい」）。
  // 一度倒して店に並んだあとも、またリーチをかけたときに出てくる（again。自分のお手馬になっている間は出ない）。前の「歴代の三冠馬」などはこれに移した
  const TR = HS.Trophy;
  const trophyGroups = TR.LIST.filter(t => ((HS.DATA.trophyHorses || {})[t.id] || []).length).map(t => {
    const names = HS.DATA.trophyHorses[t.id].map(x => x.name);
    return { id: 't:' + t.id, trophy: t.id, label: `トロフィー「${t.label}」`, note: `${t.note}（あと1勝のとき）`, finals: (t.kind === 'set' || t.kind === 'repeat') ? t.races.slice() : null,
      again: true, needG1: t.kind === 'immortal', legs: (h, race) => TR.reach(h, t, race), member: d => names.includes(d.name) };
  });
  SP.GROUPS = trophyGroups.concat([
    { id: 'nikan', label: 'クラシック二冠馬', note: '皐月賞・日本ダービー・菊花賞のどれかを勝って、ほかのクラシックへ', finals: CLASSIC, legs: (h, race) => CLASSIC.filter(n => won(h, n, y => y === race.year)).length === 1 && !won(h, race.short, y => y === race.year), member: d => (dn(d, '皐月賞') ? 1 : 0) + (dn(d, '東京優駿') ? 1 : 0) + (dn(d, '菊花賞') ? 1 : 0) === 2 },
    { id: 'filly', label: '牡馬を破った名牝', note: '牝馬で G1 を勝って、天皇賞・宝塚記念・ジャパンC・有馬記念へ', finals: BEAT_MALES,
      legs: (h, race) => h.sex === '牝' && (h.gradedWins || []).some(g => g.grade === 'G1') && !won(h, race.short), member: d => d.sex === '牝' && ['天皇賞（春）', '天皇賞（秋）', '有馬記念', 'ジャパンカップ', '宝塚記念'].some(n => dn(d, n)) },
    { id: 'long', label: '長距離の王者', note: '菊花賞を勝って天皇賞・春へ', finals: ['天皇賞・春'], legs: (h, race) => won(h, '菊花賞') && !won(h, '天皇賞・春'), member: d => dn(d, '菊花賞') && dn(d, '天皇賞（春）') },
    // 芝とダート、または短距離（1400m 以下）と長距離（3000m 以上）の両方で重賞を勝った名馬。自分の馬は、片方で G1 を勝って、もう片方の G1 へ
    { id: 'allround', label: '万能の名馬', note: '芝とダート（または1400m以下と3000m以上）の片方で G1 を勝って、もう片方の G1 へ', finals: null,
      legs: (h, race) => { if (race.grade !== 'G1') return false; const rs = myG1(h); if (!rs.length) return false; return !allRound(rs) && allRound(rs.concat([race])); },
      member: d => SP.bigWins(d).length > 0 && allRound(winShapes(d)) },
    // 地方の競馬場でデビュー・所属した名馬（データの local）。自分の馬は、地方の重賞を勝って、まだ勝っていない中央の G1 へ
    { id: 'local', label: '地方から来た名馬', note: '地方の重賞を勝った馬で、中央の G1 へ（中央の G1 をまだ勝っていないとき）', finals: null,
      legs: (h, race) => race.grade === 'G1' && race.region === 'JRA' && (h.gradedWins || []).some(g => g.region === '地方') && !(h.gradedWins || []).some(g => g.grade === 'G1' && g.region === 'JRA'),
      member: d => !!d.local },
    { id: 'autumn', label: '秋の王者', note: '天皇賞・秋とジャパンCを勝って有馬記念へ', finals: ['有馬記念'], legs: sameYear(['天皇賞・秋', 'ジャパンC']), member: d => (dn(d, '天皇賞（秋）') ? 1 : 0) + (dn(d, 'ジャパンカップ') ? 1 : 0) + (dn(d, '有馬記念') ? 1 : 0) >= 2 },
    { id: 'spring', label: '春の王者', note: '天皇賞・春を勝って宝塚記念へ', finals: ['宝塚記念'], legs: sameYear(['天皇賞・春']), member: d => dn(d, '天皇賞（春）') && dn(d, '宝塚記念') },
    { id: 'grandprix', label: 'グランプリホース', note: '宝塚記念と有馬記念の片方を勝って、もう片方へ', finals: ['有馬記念', '宝塚記念'], legs: other({ '有馬記念': '宝塚記念', '宝塚記念': '有馬記念' }), member: d => dn(d, '宝塚記念') && dn(d, '有馬記念') },
    { id: 'tenno', label: '天皇賞の春秋制覇', note: '天皇賞の春と秋の片方を勝って、もう片方へ', finals: ['天皇賞・秋', '天皇賞・春'], legs: other({ '天皇賞・秋': '天皇賞・春', '天皇賞・春': '天皇賞・秋' }), member: d => dn(d, '天皇賞（春）') && dn(d, '天皇賞（秋）') },
    { id: 'arima2', label: '有馬記念の連覇', note: '有馬記念を勝って、次の年の有馬記念へ', finals: ['有馬記念'], legs: prevYear('有馬記念'), member: d => dn(d, '有馬記念') >= 2 },
    { id: 'mile', label: 'マイルの王者', note: '安田記念とマイルCSの片方を勝って、もう片方へ', finals: ['マイルCS', '安田記念'], legs: other({ 'マイルCS': '安田記念', '安田記念': 'マイルCS' }), member: d => dn(d, '安田記念') && dn(d, 'マイルチャンピオンシップ') },
    { id: 'europe', label: '欧州の頂点', note: '英ダービーかキングジョージを勝って凱旋門賞へ', finals: ['凱旋門賞'], legs: (h, race) => won(h, '英ダービー', y => y === race.year) || won(h, 'キングジョージ', y => y === race.year), member: d => dn(d, '凱旋門賞') && (dn(d, '英ダービー') || dn(d, 'キングジョージ6世＆クイーンエリザベスステークス')) },
    { id: 'us2', label: '米国の名馬', note: 'プリークネスSを勝ってベルモントSへ', finals: ['ベルモントS'], legs: sameYear(['プリークネスS']), member: d => dn(d, 'プリークネスステークス') && dn(d, 'ベルモントステークス') },
    { id: 'aus', label: '豪州の英雄', note: 'コックスプレートを勝ってメルボルンカップへ', finals: ['メルボルンカップ'], legs: sameYear(['コックスプレート']), member: d => dn(d, 'コックスプレート') && dn(d, 'メルボルンカップ') },
    // 伝説級（data/legends.js の tier:'legend'）：グランドフェスティバル（dream.js）ごとに、担当の名馬（データの gf）だけ出る。
    // GF を勝つと店に並ぶので、並んだあとも条件を満たせば何度でも出てくる（again。自分のお手馬になっている間は出ない）
    { id: 'gf', label: '伝説級の名馬', note: 'グランドフェスティバルを勝って、次の年の同じグランドフェスティバルへ', finals: null, top: true, again: true,
      legs: (h, race) => race.grade === 'GF' && HS.Season.gfWonPrev(h, race), fit: (d, race) => d.gf === race.gf, member: d => !!d.gf && d.gf !== 'all' },
    // GF を全部勝つと、どの GF にも出てくる名馬（data/legends.js の gf:'all'。キンチェム）
    { id: 'gfall', label: 'グランドフェスティバル全制覇', note: 'グランドフェスティバルを全部勝ったあと、どのグランドフェスティバルへも', finals: null, top: true, again: true,
      legs: (h, race) => race.grade === 'GF' && HS.Season.gfAllWon(), member: d => d.gf === 'all' },
    { id: 'g1five', label: 'G1を5勝した名馬', note: 'G1を4勝して、次のG1へ', finals: null, legs: (h, race) => race.grade === 'G1' && gw(h).length && (h.gradedWins || []).filter(g => g.grade === 'G1').length === 4, member: d => g1Count(d) >= 5 },
    { id: 'unbeaten', label: '無敗の名馬', note: `デビューから無敗で${SP.STREAK - 1}連勝して、次のレースへ`, finals: null, legs: h => (h.starts || 0) === (h.wins || 0) && (h.wins || 0) === SP.STREAK - 1, member: d => SP.unbeatenOf(d) >= SP.STREAK },
  ]);
  // 大レースごとのグループ「歴代の○○馬」：いまの番組の G1 それぞれ。G1 を勝った馬がそのレースに出ると、そのレースの歴代の勝ち馬が出てくる
  // （2歳の G1 は、重賞を勝った馬が出ると）。1回に出てくるのは強い順に SP.RACE_IN_RACE 頭まで
  SP.RACE_IN_RACE = 2;
  const seenShort = new Set();
  for (const [name, m] of g1Map()) {
    if (seenShort.has(m.short)) continue; seenShort.add(m.short);
    const two = m.age === '2';
    SP.GROUPS.push({ id: 'r:' + m.short, label: `歴代の${m.short}馬`, note: two ? `重賞を勝って${m.short}へ` : `G1を勝った馬で${m.short}へ`, finals: [m.short], race: true, at: m.at, prize: m.prize,
      legs: (h, race) => !won(h, race.short) && (two ? (h.gradedWins || []).length > 0 : (h.gradedWins || []).some(g => g.grade === 'G1')),
      member: d => (d.wins || []).some(x => { const k = SP.mapWin(x); return k && k.short === m.short; }) });
  }
  SP.BY = {}; SP.GROUPS.forEach(g => { SP.BY[g.id] = g; });

  // スペシャルホースの元：1989年より前に走り終えた史実馬のうち、名馬の名鑑（data/profiles*.js）がある馬と、data/legends.js。
  // 強さの下限は無い（持ち主の決定 2026-10-16「スペシャルホースは別に強さの下限はないです」。前は評価92以上）。
  // SP.WITH_BIG を true にすると、名鑑の無い大レース（SP.bigWins）の勝ち馬も入る（名鑑を書くまでは入れない）
  SP.WITH_BIG = false;
  // 1989年からの隠し馬（香港の三冠だけ。data/trophy_horses.js の modern）の名前
  SP.MODERN = [];
  for (const xs of Object.values(HS.DATA.trophyHorses || {})) for (const x of xs) if (x.modern && !SP.MODERN.includes(x.name)) SP.MODERN.push(x.name);
  SP.isModern = d => SP.MODERN.includes(d.name);
  let pool = null;
  SP.pool = function () {
    if (pool) return pool;
    const prof = new Set((HS.DATA.profiles || []).map(f => HS.normName(f.name))); // 名鑑と史実馬は小さいカナをそろえて比べる（ホスピタリテイ＝ホスピタリティ）
    pool = (HS.DATA.historic || []).filter(d => HS.Eraless.isLegend(d) && (prof.has(HS.normName(d.name)) || (SP.WITH_BIG && SP.bigWins(d).length))).concat(HS.DATA.legendsExtra || []);
    // 香港の三冠の隠し馬は1989年からの馬でもよい（data/trophy_horses.js の modern。持ち主の決定 2026-10-20）
    for (const n of SP.MODERN) { const d = (HS.DATA.historic || []).find(x => x.name === n); if (d && !pool.includes(d)) pool.push(d); }
    return pool;
  };
  SP.data = name => SP.pool().find(d => d.name === name) || null;
  SP.isTop = d => d.tier === 'legend'; // 伝説級：グランドフェスティバルのグループ（gf・gfall）だけに入る（担当の GF はデータの gf）。固有の能力は伝説級かどうかで決めない（data/uniques.js に名前があるか。js/core/skills.js の K.hasUnique。持ち主の決定 2026-10-17）
  // 1頭が出てくる条件は1つだけ（持ち主の決定 2026-10-16）。グループに優先順を付け、各馬は当てはまるいちばん上のグループに入る
  // スピードシンボリは有馬記念の連覇（春の王者より上）。ミエスクは G1を5勝した名馬のまま：年をまたいで路線の違う G1 を重ねた馬で、
  // 1つの冠の組み合わせより「G1 を5勝」が史実の顔に合う（ダリア・アレフランスも同じ理由でここ）
  SP.PRIORITY = ['gf', 'gfall'].concat(trophyGroups.map(g => g.id), ['unbeaten', 'long', 'nikan', 'arima2', 'local', 'allround', 'filly', 'europe', 'autumn', 'spring', 'grandprix', 'tenno', 'mile', 'us2', 'aus', 'g1five']);
  let assign = null;
  const assignAll = function () {
    if (assign) return assign;
    assign = {};
    const order = SP.PRIORITY.map(id => SP.BY[id]).filter(Boolean)
      .concat(SP.GROUPS.filter(g => g.race).sort((a, b) => (b.prize || 0) - (a.prize || 0))); // 大レースは賞金の大きい順
    const taken = new Set();
    for (const g of order) {
      assign[g.id] = SP.pool().filter(d => !taken.has(d.name) && (g.top ? SP.isTop(d) : !SP.isTop(d)) && g.member(d)).sort((a, b) => (b.rating || 0) - (a.rating || 0));
      for (const d of assign[g.id]) taken.add(d.name);
    }
    return assign;
  };
  // グループの名馬（強い順）
  SP.members = g => assignAll()[g.id] || [];
  // どれかのグループに入っている名馬（スペシャルホース）
  let list = null;
  SP.list = function () {
    if (list) return list;
    const seen = new Map();
    for (const g of SP.GROUPS) for (const d of SP.members(g)) { if (!seen.has(d.name)) seen.set(d.name, { name: d.name, d, groups: [] }); seen.get(d.name).groups.push(g.id); }
    list = [...seen.values()].sort((a, b) => (b.d.rating || 0) - (a.d.rating || 0));
    return list;
  };
  SP.byName = name => SP.list().find(x => x.name === name) || null;

  // 自分の馬 h が、このレースでグループ g にリーチをかけているか
  SP.reach = (h, g, race) => h.owner === 'P' && (!g.finals || g.finals.includes(race.short)) && g.legs(h, race);
  // 出てこられるか：ふつうはまだ店に並んでいない名馬だけ。伝説級（again）は、自分のお手馬（引退していない）になっていなければ何度でも。
  // 1989年からの隠し馬（SP.isModern）は、その年に世界で走っている（入厩・牧場の）ときは出さない（同じ馬が2頭にならないように）
  SP.canAppear = (g, d, un) => (!SP.isModern(d) || !HS.Eraless.activeNames().has(d.name)) && (g.again ? !W.mine().some(x => x.name === d.name && x.loc !== 'retired') : !un.includes(d.name));
  // このレースに出てくるスペシャルホース
  SP.pending = function (h, race) {
    const G = W.get(), un = G.unlocked || [];
    const out = [];
    // 条件の組み合わせのグループを先に（強い順）、大レースのグループはそのあと（強い順）
    for (const g of SP.GROUPS) if (SP.reach(h, g, race)) for (const d of SP.members(g)) if (SP.canAppear(g, d, un) && !out.some(x => x.d === d) && (!g.fit || g.fit(d, race))) out.push({ d, g });
    const key = x => (x.g.race ? 1000 : 0) - (x.d.rating || 0);
    return out.sort((a, b) => key(a) - key(b));
  };
  // 自分の馬のリーチ（次に勝てばよいレースと、出てくるグループ）。ホームに出す
  SP.reachInfo = function (h) {
    const G = W.get(), un = G.unlocked || [];
    if (h.owner !== 'P') return [];
    const out = [];
    const nextRaces = W.upcomingGraded(52).filter(r => r.inWeeks > 0 && !HS.Season.staticIneligible(h, r, r.year));
    for (const g of SP.GROUPS) {
      if (!SP.members(g).some(d => SP.canAppear(g, d, un))) continue;
      const r = nextRaces.find(rc => SP.reach(h, g, rc));
      if (r) out.push({ group: g, need: g.finals ? r.short : (g.needG1 || ['g1five', 'allround', 'local'].includes(g.id) ? '次のG1' : '次のレース') });
    }
    return out;
  };
  // その場限りの馬にする（いちばん良いときの力で）
  SP.horse = function (d, race) {
    const age = race.age === '2' ? 2 : race.age === '3' ? 3 : 4;
    const h = H.fromHistoric(HS.Eraless.shift(d, (race.year - age) - d.born), `special:${d.name}`);
    h.legend = true; h.owner = 'AI'; h.loc = 'legend'; h.starts = 8; h.wins = 8; h.earn = 50000;
    if (HS.DATA.isForeign(d)) { h.foreignTrained = true; h.country = d.country || '外'; }
    return h;
  };
  // prepareWeek から：自分の馬がリーチをかけて出るレースに、スペシャルホースを足す
  SP.forRace = function (race, entries) {
    const names = new Set(), out = [];
    let fromRace = 0;
    for (const e of entries) {
      if (!e.mine || !e.horse) continue;
      for (const sp of SP.pending(e.horse, race)) {
        if (names.has(sp.d.name) || out.length >= SP.MAX_IN_RACE) continue;
        if (sp.g.race && fromRace >= SP.RACE_IN_RACE) continue;
        if (sp.g.race) fromRace++;
        if (race.sex === '牝' && sp.d.sex !== '牝') continue; // 牝馬限定のレースには牝馬だけ
        names.add(sp.d.name); out.push({ horse: SP.horse(sp.d, race), legend: true });
      }
    }
    return out;
  };
  // レースのあと（applyResults から）：自分の馬が勝てば、出てきたスペシャルホースが馬の店に並ぶ
  SP.afterRace = function (race, sim) {
    const G = W.get();
    const sps = sim.results.filter(r => r.horse.legend).map(r => r.horse.name);
    if (!sps.length) return [];
    const win = sim.results[0];
    if (!win || win.horse.owner !== 'P') { W.news(`スペシャルホース ${sps.join('・')}に敗れた……。`, 'warn'); return []; }
    G.unlocked = G.unlocked || [];
    const got = sps.filter(n => !G.unlocked.includes(n));
    G.unlocked.push(...got);
    if (got.length) W.news(`${win.horse.name}がスペシャルホース ${got.join('・')}を破った！ ${got.join('・')}が馬の店に並ぶようになった。`, 'g1');
    return got;
  };
})();
