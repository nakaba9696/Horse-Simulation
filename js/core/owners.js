// 馬主と騎乗依頼（持ち主の仕様書 docs/SPEC.md「騎乗依頼」2026-10-19 が正本）
// 世界の AI の馬の一部を、架空の馬主（data/owners.js）が持つ。縁のある馬主から、毎週「この馬でこのレースに」と依頼が来る。
// 受けると出走表で自分が乗る（G.rides。おまかせ騎乗は無い。自分の馬が出るレースには依頼が来ない）。騎手の取り分は賞金の5%（jockey.js）と、ここで払う騎乗料。
// 馬主は8つのジャンル（地方・短距離・クラシック・長距離・牝馬・米・欧州・豪州）に1人ずつ。クラシック系は秘書のユニ（ふつうの優秀なナビゲーター）。キンチェムモチーフの人物は GF の一族の人として別に作った（data/gfhost.js・js/core/gfhost.js）。
//
// 好感度（pts。0〜100）は、その人のジャンルのレースで勝つと上がる（自分の馬でも依頼の馬でも）。ある程度たまると出会いの場面になり、
// 次の週から依頼が来る（海外の人は、海外のレースに1度出た印のあと。O.GATES）。
// 段階：OP → G3 → G2 → G1 → お手馬。段階ごとに課題（data の missions）があり、やり終えるとお礼のお金と好感度、会話の場面、次の段階へ。
// 段階が上がるほど格の高いレース・強い馬の依頼が来る。G1 の段階からは、その人のいちばん強い馬の依頼も来る。G1 の段階で勝負服を着せられる。
// お手馬の段階の課題までやり終えると好感度がいっぱいになり、繁殖の永続のボーナスのアイテムをもらって、その人からの依頼は来なくなる。
// 少し仲良くなると（G3 の段階から）、頼めば来月の店にその人の好きな系統の馬が並びやすくなる（O.ask）。年末には「名コンビ賞」。
// 乱数は U.hashRng（週と馬の名前から決まる）だけで、世界の乱数は使わない。セーブは G.owners（W.migrate で既定値と前の形からの移し替え）。
// Godot 版は godot/core/hs_owners.gd（同じ種で同じ結果。tools/golden_world.js の一致テスト）。
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World, R = HS.Races, J = HS.Jockey;
  const O = HS.Owners = {};
  const G = () => W.get();
  const ALL = () => (HS.DATA && HS.DATA.owners) || [];
  // いま依頼をくれる人たち（外した人を除く）
  let act = null;
  const LIST = () => {
    const all = ALL();
    if (act && act.src === all && act.n === all.length) return act.list;
    act = { src: all, n: all.length, list: all.filter(o => !o.retired) };
    return act.list;
  };
  O.list = LIST;
  O.all = ALL;
  O.by = id => LIST().find(o => o.id === id) || ALL().find(o => o.id === id) || null;
  O.active = id => LIST().some(o => o.id === id);

  // ---------- 段階と数（仮の値。遊んで直す） ----------
  // floor：その段階の好感度の下限。課題をやり終えると次の段階の下限まで上がる。課題をやらずに次の段階の下限を超えることはない
  O.STAGES = [
    { key: 'op', label: 'OP', maxClass: 0, maxFh: 60, maxStrength: 0.9, floor: 10, money: 300 },   // OP の依頼
    { key: 'g3', label: 'G3', maxClass: 1, maxFh: 66, maxStrength: 0.95, floor: 25, money: 600 },
    { key: 'g2', label: 'G2', maxClass: 2, maxFh: 72, maxStrength: 1, floor: 40, money: 1000 },
    { key: 'g1', label: 'G1', maxClass: 3, maxFh: 80, maxStrength: 1, floor: 55, money: 2000 },     // 海外の G1・いちばん強い馬も
    { key: 'own', label: 'お手馬', maxClass: 4, maxFh: 99, maxStrength: 1, floor: 70, money: 5000 }, // 課題は自分の馬で
  ];
  O.DONE = 5;              // 最後の課題までやり終えた段階
  O.MAX = 100;             // 好感度の上限（やり終えると、いっぱい）
  O.MEET = 10;             // 出会いに要る好感度
  O.GAIN = [5, 7, 9, 12, 15];   // ジャンルのレースで勝ったときの好感度（OP・G3・G2・G1・GF）
  O.PLACE = [0, 0, 3, 2];       // まだ会っていない人：ジャンルのレースで2着・3着のときの好感度（出会いを少し早める）
  O.OWNED = 0.5;           // AI の史実馬のうち、馬主のキャラが持つ割合
  O.OWNED_FILLER = 0.3;    // その場限りの馬（モブ）のうち、馬主のキャラが持つ割合
  O.FEE = [10, 30, 50, 100, 200];   // 騎乗料（万円・1995年の物価）。OP・G3・G2・G1・GF
  O.GIFT = 1000;           // 思い出の名馬が受け取れないときのお祝い（前の版。前のセーブのため）
  O.AWARD = 500;           // 名コンビ賞の賞金（万円・1995年の物価）
  O.AWARD_MIN = 3;         // 名コンビ賞に要る、その年の勝ち数
  O.SIGN_RATE = 0.95;      // ジャンルに合う候補があるとき、その中から選ぶ割合（仮）
  O.OFF_SIGN = 0.15;       // ジャンルに合う候補が無い週に、それでも依頼を出す割合（仮）
  O.ASK_STAGE = 1;         // 店に馬を頼めるようになる段階（G3 の段階。「少し仲良くなると」）
  O.ASK_N = 3;             // 頼んだとき、牡馬・牝馬それぞれ何頭までその人の好みの馬に入れ替えるか
  O.WEAR_STAGE = 3;        // 勝負服を着せられるようになる段階（G1 の段階）
  // 依頼が始まる前に要る印（あとで本当の「海外の解放」に差し替える）
  O.GATES = { overseas: () => !!O.state().flags.overseas };
  O.GATE_LABEL = { overseas: '海外のレースに1度出たあと' };

  O.on = () => !!(J && J.isMode && J.isMode());
  // stage：段階（0 OP〜4 お手馬・5 やり終えた）。prog：いまの課題の回数。known：縁がある（依頼が来る）。knownAt：縁ができた日
  const blank = () => ({ pts: 0, stage: 0, prog: 0, met: false, known: false, rides: 0, wins: 0, big: 0, dec: 0, streak: 0, fees: 0, got: {}, years: {}, cleared: [] });
  O.init = function () {
    const st = {}; for (const o of ALL()) st[o.id] = blank();
    return { v: 2, st, week: null, log: [], queue: [], react: [], awards: {}, wear: {}, flags: {}, ask: null };
  };
  // 前の形（好感度 0〜800・段階 顔見知り／信頼／主戦／相棒）を、新しい段階に移す
  O.migrateSt = function (st) {
    const t = st.tier || 0, p = st.pts || 0;
    const lo = [0, 100, 260, 520][t] || 0, hi = [100, 260, 520, 800][t] || 800;
    const stage = t >= 3 ? 4 : t === 2 ? 3 : t === 1 ? (p >= 180 ? 2 : 1) : 0;
    st.stage = stage; st.prog = 0;
    st.pts = st.known ? O.STAGES[stage].floor + U.clamp(Math.floor((p - lo) / (hi - lo) * 10), 0, 10) : 0;
    delete st.tier;
    return st;
  };
  // 古いセーブ・足りない項目を埋める
  O.fill = function (s, g) {
    s = s || O.init();
    s.st = s.st || {};
    const old = !s.v;
    for (const o of ALL()) {
      const st = s.st[o.id];
      // 縁の項目が無い前のセーブ：依頼を受けた・断った・乗った・好感度がある馬主は、縁がある扱い
      if (st && st.known === undefined) st.known = !!(st.met || st.rides || st.pts || st.tier);
      if (st && st.stage === undefined) O.migrateSt(st);
      s.st[o.id] = Object.assign(blank(), st || {});
    }
    for (const k of ['log', 'queue', 'react']) s[k] = s[k] || [];
    // 前の形の場面（間柄が上がった・引退した馬など）は、新しい形には無いので捨てる
    if (old) { s.queue = []; s.react = []; }
    s.awards = s.awards || {}; s.wear = s.wear || {}; s.flags = s.flags || {};
    if (s.week === undefined) s.week = null;
    if (s.ask === undefined) s.ask = null;
    // 海外の印：前のセーブで、自分が海外の重賞を勝っていれば出たことにする
    if (!s.flags.overseas && g && g.records && g.records.player && (g.records.player.g1 || []).some(x => x.region === '海外')) s.flags.overseas = { y: g.year };
    s.v = 2;
    return s;
  };
  O.state = function () { const g = G(); if (!g.owners) g.owners = O.init(); return g.owners; };
  O.of = id => { const s = O.state(); return s.st[id] || (s.st[id] = blank()); };
  O.stageOf = id => O.STAGES[Math.min(O.of(id).stage, 4)];
  O.done = id => O.of(id).stage >= O.DONE;
  O.stageLabel = id => O.done(id) ? 'やり終えた' : O.stageOf(id).label + 'の段階';
  O.missionOf = function (o, stage) { return o && o.missions && stage < O.DONE ? o.missions[stage] || null : null; };
  O.mission = id => { const o = O.by(id); return O.missionOf(o, O.of(id).stage); };
  const IDX = () => U.priceIndex(G().year);
  const yen = v => Math.round(v * IDX() / 10) * 10;
  O.yen = yen;

  // ---------- 好み ----------
  // 国の好み（usa・europe・aus）：その国で生まれた馬・その国の種牡馬の仔、その国のレース
  const EU = ['英', '愛', '仏', '独', '伊'];
  const AUS = ['豪', '新'];
  let sireC = null;
  const sireCountry = h => {
    if (!sireC) { sireC = new Map(); for (const s of (HS.DATA && HS.DATA.stallions) || []) sireC.set(s.name, s.country || ''); }
    return (h.sire && sireC.get(h.sire)) || '';
  };
  const turfy = h => !h.apt || h.apt.turf >= h.apt.dirt;
  const early = h => h.growth === '早熟' || h.growth === '早め';
  const fitH = {
    sprint: h => (h.distMax || 2000) <= 1600 ? 1 : (h.distMin || 1600) <= 1400 ? 0.5 : 0,
    mile: h => (h.distMin || 1600) <= 1600 && (h.distMax || 2000) >= 1600 ? 1 : 0,
    long: h => (h.distMax || 2000) >= 2400 ? 1 : 0,
    dirt: h => h.apt && h.apt.dirt > h.apt.turf ? 1 : 0,
    turf: h => turfy(h) ? 1 : 0,
    filly: h => h.sex === '牝' ? 1 : 0,
    front: h => h.style === '逃げ' ? 1 : 0,
    closer: h => h.style === '差し' || h.style === '追込' ? 1 : 0,
    foreign: h => h.foreign || h.foreignTrained || (h.country && h.country !== '日') ? 1 : 0,
    blood: h => h.hist ? 1 : 0,
    local: h => h.local ? 1 : h.apt && h.apt.dirt > h.apt.turf ? 0.6 : 0,
    classic: h => turfy(h) && (h.distMin || 1600) <= 2000 && (h.distMax || 2000) >= 2000 ? 1 : 0,
    usa: h => h.country === '米' ? 1 : sireCountry(h) === '米' ? (h.apt && h.apt.dirt > h.apt.turf ? 1 : 0.4) : h.apt && h.apt.dirt > h.apt.turf ? 0.3 : 0,   // 米国の血とダート
    europe: h => EU.includes(h.country) ? 1 : EU.includes(sireCountry(h)) ? 0.8 : turfy(h) && (h.distMax || 2000) >= 2400 ? 0.4 : 0,   // 欧州の血と、芝の長い距離
    aus: h => AUS.includes(h.country) ? 1 : sireCountry(h) === '豪' ? 0.8 : turfy(h) && (h.distMax || 2000) <= 1800 ? (early(h) ? 0.8 : 0.5) : 0,   // 豪州の血と、芝の短い距離の（早く仕上がる）馬
  };
  const fitR = {
    sprint: r => r.dist <= 1400 ? 1 : 0, mile: r => r.dist > 1400 && r.dist <= 1800 ? 1 : 0, long: r => r.dist >= 2400 ? 1 : 0,
    dirt: r => r.surface === 'ダ' ? 1 : 0, turf: r => r.surface === '芝' ? 1 : 0, filly: r => r.sex === '牝' ? 1 : 0,
    overseas: r => r.region === '海外' ? 1 : 0, foreign: r => r.region === '海外' ? 1 : 0, local: r => r.region === '地方' ? 1 : 0,
    classic: r => r.age === '3' && r.graded ? 1 : 0, young: r => r.age === '2' ? 1 : 0, veteran: r => r.age === '3+' || r.age === '4+' ? 1 : 0,
    usa: r => r.region === '海外' && r.country === '米' ? 1 : 0, europe: r => r.region === '海外' && EU.includes(r.country) ? 1 : 0,
    aus: r => r.region === '海外' && AUS.includes(r.country) ? 1 : 0,
  };
  O.fitHorse = (o, h) => o.likes.length ? U.sum(o.likes.map(k => fitH[k] ? fitH[k](h) : 0)) / o.likes.length : 0;
  O.fitRace = (o, r) => o.likes.length ? U.sum(o.likes.map(k => fitR[k] ? fitR[k](r) : 0)) / o.likes.length : 0;

  // ---------- ジャンル（likes の先頭。看板の特徴） ----------
  O.LIKE_LABEL = {
    sprint: '短距離好き', mile: 'マイル好き', long: '長距離好き', dirt: 'ダート好き', turf: '芝好き', filly: '牝馬好き', front: '逃げ馬好き',
    closer: '差し馬好き', foreign: '外国の馬好き', overseas: '海外好き', local: '地方好き', classic: 'クラシック好き', young: '2歳馬好き',
    veteran: '古馬好き', blood: '血統好き', usa: 'アメリカ好き', europe: '欧州好き', aus: '豪州好き',
  };
  O.signOf = o => (o && o.likes && o.likes[0]) || '';
  O.signLabel = o => O.LIKE_LABEL[O.signOf(o)] || '';
  O.subLabels = o => ((o && o.likes) || []).slice(1).map(k => O.LIKE_LABEL[k]).filter(Boolean);
  // そのレースとその馬が、ジャンルに合うか（依頼を選ぶときと、好感度が上がる勝ちの判定。勝ちの判定はレースのあとの馬で見る）
  const yearOf = r => r.year != null ? r.year : G().year;
  const SIGN = {
    local: (r, h) => r.surface === 'ダ' || r.region === '地方',
    sprint: (r, h) => r.dist <= 1400,
    dirt: (r, h) => r.surface === 'ダ',
    long: (r, h) => r.dist >= 2000,
    classic: (r, h) => r.age === '2' || r.age === '3' || yearOf(r) - h.born <= 3,   // 2歳・3歳のレースか、3歳までの若い馬
    front: (r, h) => h.style === '逃げ',
    closer: (r, h) => h.style === '差し' || h.style === '追込',
    filly: (r, h) => h.sex === '牝',
    usa: (r, h) => fitR.usa(r) > 0 || (r.surface === 'ダ' && fitH.usa(h) > 0),
    europe: (r, h) => fitR.europe(r) > 0 || (r.surface === '芝' && r.dist >= 2000 && fitH.europe(h) > 0),
    aus: (r, h) => fitR.aus(r) > 0 || (r.surface === '芝' && r.dist <= 1600 && fitH.aus(h) > 0),
  };
  O.signFits = (o, race, h) => { const f = SIGN[O.signOf(o)]; return f ? !!f(race, h) : true; };
  // 馬を持つときの重み：ジャンルに合う馬を強く好む
  const ownW = (o, h) => { const f = fitH[O.signOf(o)]; return 0.2 + (f ? f(h) : 0) * 3 + O.fitHorse(o, h); };
  // 店の馬（史実馬のデータ d）がジャンルに合うか（店に頼んだとき）
  const FITD = {
    local: d => d.surface === 'ダ',
    sprint: d => (d.distMax || 2000) <= 1600 && (d.distMin || 1600) <= 1400,
    classic: d => d.surface !== 'ダ' && (d.distMin || 1600) <= 2000 && (d.distMax || 2000) >= 2000,
    long: d => (d.distMax || 2000) >= 2400,
    filly: d => d.sex === '牝',
    usa: d => d.country === '米' || sireCountry(d) === '米',
    europe: d => EU.includes(d.country) || EU.includes(sireCountry(d)),
    aus: d => AUS.includes(d.country) || sireCountry(d) === '豪' || (d.surface !== 'ダ' && (d.distMax || 2000) <= 1600 && early(d)),
  };
  O.fitData = (o, d) => { const f = FITD[O.signOf(o)]; return f ? !!f(d) : false; };

  // ---------- 縁（出会い） ----------
  O.known = id => !!O.of(id).known;
  O.knownList = () => LIST().filter(o => O.known(o.id));
  O.gateOk = o => !o || !o.gate || !!(O.GATES[o.gate] && O.GATES[o.gate]());
  // 縁ができる：次の週から依頼が来る。出会いの場面（kind 'meet'）を積む
  O.meet = function (oid, ctx) {
    const o = O.by(oid), st = O.of(oid);
    if (!o || st.known) return false;
    const g = G(), s = O.state();
    ctx = ctx || st.lastWin || {};
    st.known = true; st.knownAt = { y: g.year, m: g.month, w: g.week };
    st.pts = Math.max(st.pts, O.STAGES[0].floor);
    W.news(`${o.name}さん（${O.signLabel(o)}）から声がかかった。これから騎乗依頼が来る。`, 'good');
    s.queue.push({ oid, kind: 'meet', horse: ctx.horse || '', race: ctx.race || '', reward: '', y: g.year });
    return true;
  };
  // 好感度がたまって、印のそろった人と出会う
  O.meetCheck = function () {
    for (const o of LIST()) { const st = O.of(o.id); if (!st.known && st.pts >= O.MEET && O.gateOk(o)) O.meet(o.id); }
  };
  // まだ会っていない人の、条件のヒント（ぼかした一言）
  O.hint = oid => { const o = O.by(oid); return (o && o.unlock && o.unlock.hint) || ''; };

  // ---------- 馬主の馬 ----------
  // 馬の名前と種から決まる（セーブに持たない）。自分の馬・スペシャルホースはだれの馬でもない
  let own = null;
  O.ownerOf = function (h) {
    if (!h || h.owner === 'P' || h.legend || !LIST().length) return null;
    const g = G(); if (!g) return null;
    if (!own || own.seed !== g.seed || own.map.size > 6000) own = { seed: g.seed, map: new Map() };
    // 覚えておく鍵は名前と id の組（同じ名前の別の馬＝店の馬と走っている馬で、答えが入れ替わらないように）
    const name = h.name || h.id, key = `${name}|${h.id}`;
    if (own.map.has(key)) return own.map.get(key);
    const r = U.hashRng(`owner:${g.seed}:${name}`);
    let res = null;
    if (r.chance(h.filler ? O.OWNED_FILLER : O.OWNED)) {
      const ok = LIST().filter(o => !o.only || (fitH[o.only] && fitH[o.only](h)));
      if (ok.length) res = r.weighted(ok, o => ownW(o, h)).id;
    }
    own.map.set(key, res);
    return res;
  };
  const peak = h => { const T = HS.Season; if (!T || !h.pot) return 50; const p = T.fhPeak(h); return Math.max(p.turf, p.dirt); };
  O.peak = peak;
  // その馬主の、いま走っている馬（強い順）
  O.horsesOf = function (oid) {
    const wc = W.wc(); wc.owners = wc.owners || {};
    if (wc.owners[oid]) return wc.owners[oid];
    const list = W.all().filter(h => h.owner !== 'P' && (h.loc === 'stable' || h.loc === 'farm') && O.ownerOf(h) === oid)
      .map(h => ({ h, fh: peak(h) })).sort((a, b) => b.fh - a.fh).map(x => x.h);
    return (wc.owners[oid] = list);
  };
  O.bestHorse = oid => O.horsesOf(oid).find(h => h.loc === 'stable') || null;

  // レースの格：0 OP（リステッドも）・1 G3・2 G2・3 G1・4 グランドフェスティバル
  O.classOf = race => race.invite || race.grade === 'GF' ? 4 : !race.graded ? 0 : ({ G1: 3, G2: 2, G3: 1 }[race.grade] || 1);
  // その段階で、このレースのこの馬の依頼が来るか
  O.allowed = function (stage, race, h, strength) {
    const t = O.STAGES[Math.min(stage, 4)];
    const cls = O.classOf(race);
    if (cls > t.maxClass) return false;
    if (race.region === '海外' && stage < 3) return false;
    if (strength > t.maxStrength + 1e-9) return false;
    if (peak(h) > t.maxFh) return false;
    return true;
  };

  // ---------- 今週の依頼 ----------
  // cards：W.cards() の出走表。opts.stage で段階を決め打ちにできる・opts.all で縁の無い馬主も（テスト用）
  // 縁のある馬主だけが依頼を出す（やり終えた人は出さない）。ジャンルに合う候補があればたいていその中から、無い週はたまにだけ合わない依頼を出す
  O.generate = function (cards, key, opts) {
    opts = opts || {};
    const g = G();
    const wIdx = W.wIdx();
    const r = U.hashRng(`${key}:owners:${g.seed}`);
    const stageOf = oid => opts.stage != null ? opts.stage : O.of(oid).stage;
    const per = {};
    for (const c of cards) {
      const race = c.race;
      if (c.runners.some(x => x.mine)) continue; // 自分の馬が出るレースには依頼が来ない（1レースに乗れるのは1頭。持ち主の決定 2026-10-20）
      const ranked = c.runners.slice().sort((a, b) => H.overall(H.cur(b.horse, wIdx)) - H.overall(H.cur(a.horse, wIdx)));
      ranked.forEach((x, k) => {
        if (x.mine || x.horse.owner === 'P' || x.horse.legend) return;
        const oid = O.ownerOf(x.horse); if (!oid) return;
        if (!opts.all && !O.of(oid).known) return;
        const stage = stageOf(oid);
        if (stage >= O.DONE) return;
        const strength = 1 - k / Math.max(1, ranked.length - 1); // 1＝いちばん強い
        if (!O.allowed(stage, race, x.horse, strength)) return;
        (per[oid] = per[oid] || []).push({ c, x, strength });
      });
    }
    const out = [], used = new Set();
    const push = (o, y, best) => { used.add(y.c.race.key); out.push({ oid: o.id, raceKey: y.c.race.key, horseId: y.x.horse.id, horse: y.x.horse.name, best: !!best, line: r.int(0, 999) }); };
    const owners = r.shuffle(LIST().slice());
    for (const o of owners) {
      const cand = (per[o.id] || []).filter(y => !used.has(y.c.race.key));
      if (!cand.length) continue;
      const stage = stageOf(o.id);
      // G1 の段階から：その馬主のいちばん強い馬が走るなら、必ずその馬で
      const best = stage >= 3 ? O.bestHorse(o.id) : null;
      const bestPick = best && cand.find(y => y.x.horse.id === best.id);
      if (bestPick) { push(o, bestPick, true); continue; }
      if (!r.chance(0.4 + 0.1 * stage)) continue;
      const fit = cand.filter(y => O.signFits(o, y.c.race, y.x.horse));
      let pool = cand;
      if (fit.length) { if (r.chance(O.SIGN_RATE)) pool = fit; }
      else if (!r.chance(O.OFF_SIGN)) continue;
      const want = 0.5 + 0.12 * stage;
      const pick = r.weighted(pool, y => (Math.exp(-Math.pow((y.strength - want) / 0.3, 2)) + 0.02) * (1 + O.classOf(y.c.race) * stage * 0.6) * (1 + O.fitRace(o, y.c.race) + O.fitHorse(o, y.x.horse)));
      push(o, pick);
    }
    // 縁のある馬主がいれば、毎週少なくとも1件は来る（だれも出さなかった週は、候補のいちばん多い馬主から。ジャンルに合う候補を先に）
    if (!out.length) {
      const o = owners.filter(o => (per[o.id] || []).length).sort((a, b) => per[b.id].length - per[a.id].length)[0];
      if (o) { const fit = per[o.id].filter(y => O.signFits(o, y.c.race, y.x.horse)); push(o, r.pick(fit.length ? fit : per[o.id])); }
    }
    return out;
  };
  const wkKey = () => { const g = G(); return `${g.year}-${g.month}-${g.week}`; };
  const cardHas = (cards, raceKey, horseId) => { const c = cards.find(c => c.race.key === raceKey); return !!(c && c.runners.some(x => x.horse.id === horseId)); };
  const mineIn = (cards, raceKey) => { const c = cards.find(c => c.race.key === raceKey); return !!(c && c.runners.some(x => x.mine)); };
  // 今週の依頼（週の初めに一度だけ作り、セーブに残す。断った依頼・走れなくなった依頼は除く）
  // 依頼を作ったあとで自分の馬をそのレースに出したら、受けていない依頼は見せない（自分の馬に乗るので、依頼の馬には乗れない）
  O.offers = function () {
    if (!O.on()) return [];
    const s = O.state(), g = G();
    const key = wkKey();
    const cards = W.cards();
    if (!s.week || s.week.key !== key) s.week = { key, list: O.generate(cards, key), acc: {}, dec: [] };
    // 出走表が変わって馬がいなくなった依頼は、黙って取り下げる（受けていたら騎乗も外す）
    for (const [rk, a] of Object.entries(s.week.acc)) {
      if (cardHas(cards, rk, a.horseId)) continue;
      delete s.week.acc[rk];
      if (g.rides && g.rides[rk] === a.horseId) J.cancel(rk);
    }
    const fresh = W.cards();
    return s.week.list.filter(o => cardHas(fresh, o.raceKey, o.horseId) && !s.week.dec.includes(o.raceKey) && (s.week.acc[o.raceKey] || !mineIn(fresh, o.raceKey)));
  };
  O.offerOf = (raceKey) => O.offers().find(o => o.raceKey === raceKey) || null;
  O.accepted = raceKey => { const s = O.state(); return !!(s.week && s.week.key === wkKey() && s.week.acc[raceKey]); };
  // 自分の馬が同じレースに出るか。1レースに乗れるのは1頭なので、ふつうは無い（O.offers が見せない）。前のセーブとテストのために残す
  O.clash = function (o) {
    const c = W.cardOf(o.raceKey); if (!c) return null;
    const x = c.runners.find(x => x.mine && x.horse.id !== o.horseId);
    return x ? x.horse : null;
  };

  // 受ける
  O.accept = function (raceKey, horseId) {
    const g = G(), s = O.state();
    const o = O.offers().find(o => o.raceKey === raceKey && o.horseId === horseId);
    if (!o) return '依頼が見つからない';
    g.rides = Object.assign({}, g.rides, { [raceKey]: horseId });
    s.week.acc[raceKey] = { oid: o.oid, horseId };
    O.of(o.oid).met = true;
    W.dirty();
    return null;
  };
  // 受けたのを取り消す（好感度は動かない）
  O.unaccept = function (raceKey) {
    const s = O.state();
    if (s.week && s.week.acc[raceKey]) { delete s.week.acc[raceKey]; J.cancel(raceKey); }
  };
  // 断る（好感度が少し下がる。段階の下限より下にはならない）
  O.decline = function (raceKey) {
    const s = O.state(), g = G();
    const o = O.offers().find(o => o.raceKey === raceKey);
    if (!o) return '依頼が見つからない';
    if (s.week.acc[raceKey]) O.unaccept(raceKey);
    s.week.dec.push(raceKey);
    const st = O.of(o.oid); st.met = true; st.dec++;
    const d = -2;
    O.addPts(o.oid, d);
    const race = W.raceByKey(raceKey);
    s.log.unshift({ y: g.year, m: g.month, w: g.week, oid: o.oid, race: race ? R.label(race) : '', horse: o.horse, pos: 0, d });
    if (s.log.length > 150) s.log.length = 150;
    return null;
  };

  // ---------- 好感度 ----------
  // 上限：まだ会っていない人は G3 の下限の手前まで、会った人は次の段階の下限の手前まで（課題をやらずに段階は上がらない）
  O.cap = st => !st.known ? O.STAGES[1].floor - 1 : st.stage >= O.DONE ? O.MAX : st.stage >= 4 ? O.MAX - 1 : O.STAGES[st.stage + 1].floor - 1;
  O.floor = st => !st.known ? 0 : st.stage >= O.DONE ? O.MAX : O.STAGES[st.stage].floor;
  O.addPts = function (oid, d) {
    const st = O.of(oid);
    let v = st.pts + d;
    if (d > 0) v = Math.min(v, Math.max(O.cap(st), st.pts));
    v = Math.max(v, O.floor(st));
    st.pts = Math.round(v * 10) / 10;
    return st.pts;
  };
  // 依頼を受けて乗った結果（騎乗料・成績・ひと言。好感度も少し動く）
  O.onRide = function (oid, race, me, pop) {
    const g = G(), s = O.state(), o = O.by(oid), st = O.of(oid);
    if (!o) return;
    const cls = O.classOf(race), pos = me.pos;
    st.streak = pos <= 3 ? 0 : st.streak + 1;
    let d = pos === 1 ? 3 + cls : pos === 2 ? 1.5 : pos === 3 ? 1 : pos <= 5 ? 0.5 : st.streak >= 4 ? -1 : 0;
    if (pop && pop - pos >= 3) d += 0.5;                          // 人気より上に来た
    const bigLoss = cls >= 3 && pos >= 10 && pop && pop <= 3;     // 大事なレースで大敗
    if (bigLoss) d = -2;
    // 騎乗料（賞金の取り分は jockey.js で入っている）
    const fee = yen(O.FEE[cls]);
    g.player.money += fee; st.fees += fee;
    st.rides++; if (pos === 1) { st.wins++; if (cls >= 3) st.big++; }
    const yr = st.years[g.year] = st.years[g.year] || { rides: 0, wins: 0 };
    yr.rides++; if (pos === 1) yr.wins++;
    st.met = true;
    O.addPts(oid, d);
    const kind = pos === 1 ? (cls >= 3 ? 'bigwin' : 'win') : (pos <= 3 || (pop && pop - pos >= 3)) ? 'good' : 'lose';
    const label = R.label(race);
    s.react.push({ oid, kind, race: label, horse: me.horse.name, pos, d, fee, line: U.hash(`${label}:${me.horse.name}:${g.year}`) % 997, tags: [...O.tagsOf(race, me.horse)] });
    s.log.unshift({ y: g.year, m: race.month, w: race.week, oid, race: label, horse: me.horse.name, pos, d });
    if (s.log.length > 150) s.log.length = 150;
    if (pos === 1 && cls >= 3) W.news(`${o.name}さんの${me.horse.name}で${label}を勝った。`, 'g1');
  };

  // ---------- 課題 ----------
  const nameIn = (names, race) => names.includes(race.name) || (race.short != null && names.includes(race.short));
  const won = (h, name, y) => (h.gradedWins || []).some(w => (y == null || w.y === y) && (w.race === name || w.short === name));
  O.wonAll = (h, names, y) => names.every(n => won(h, n, y));
  // いまの連勝（成績の新しいほうから数える）
  O.streakOf = function (h) { const rs = h.results || []; let n = 0; for (let i = rs.length - 1; i >= 0 && rs[i].pos === 1; i--) n++; return n; };
  // 課題の判定。me：着順の結果（レースのあとの馬）、isOffer：その人の依頼で乗ったか
  O.needOk = function (n, race, me, isOffer) {
    const h = me.horse;
    const by = n.by || 'offer';
    if (by === 'offer' && !isOffer) return false;
    if (by === 'own' && h.owner !== 'P') return false;
    if (by === 'orig' && !(h.owner === 'P' && h.original)) return false;
    if (me.pos > (n.pos || 1)) return false;
    if (n.cls && O.classOf(race) < n.cls) return false;
    if (n.region && race.region !== n.region) return false;
    if (n.countries && !(race.region === '海外' && n.countries.includes(race.country))) return false;
    if (n.eu && !(race.region === '海外' && EU.includes(race.country))) return false;
    if (n.surface && race.surface !== n.surface) return false;
    if (n.minDist && race.dist < n.minDist) return false;
    if (n.maxDist && race.dist > n.maxDist) return false;
    if (n.ages && !n.ages.includes(race.age)) return false;
    if (n.raceSex === '牝' && race.sex !== '牝') return false;
    if (n.raceSex === 'mixed' && race.sex === '牝') return false;
    if (n.horseSex && h.sex !== n.horseSex) return false;
    if (n.styles && !n.styles.includes(h.style)) return false;
    if (n.popMin && !(me.pop >= n.popMin)) return false;
    if (n.names && !nameIn(n.names, race)) return false;
    if (n.unbeaten && !((h.starts || 0) > 0 && h.wins === h.starts)) return false;
    if (n.streak && O.streakOf(h) < n.streak) return false;
    if (n.set && !O.wonAll(h, n.set, yearOf(race))) return false;
    if (n.all && !O.wonAll(h, n.all, null)) return false;
    if (n.twice && !(n.names || []).some(x => won(h, x, yearOf(race) - 1))) return false;
    if (n.wonRegion && !(h.gradedWins || []).some(w => w.region === n.wonRegion)) return false;
    return true;
  };
  // 課題をやり終えた：お礼・好感度・場面・次の段階（最後ならアイテム）
  O.advance = function (oid, ctx) {
    const g = G(), s = O.state(), o = O.by(oid), st = O.of(oid);
    if (!o || st.stage >= O.DONE) return false;
    ctx = ctx || {};
    const k = st.stage;
    const m = yen(O.STAGES[k].money);
    g.player.money += m;
    st.stage = k + 1; st.prog = 0;
    st.pts = Math.max(st.pts, st.stage >= O.DONE ? O.MAX : O.STAGES[st.stage].floor);
    st.cleared = (st.cleared || []).concat([{ y: g.year, m: g.month, w: g.week, horse: ctx.horse || '', race: ctx.race || '' }]);
    let reward = `お礼 ${U.money(m)}`;
    if (st.stage === O.WEAR_STAGE && !st.got.t2) { st.got.t2 = { y: g.year }; reward += `・${o.name}さんの勝負服を自分の馬に着せられる`; }
    if (st.stage >= O.DONE) { st.got.item = { y: g.year }; reward += `・${o.item.name}（${o.item.text}）`; }
    W.news(st.stage >= O.DONE ? `${o.name}さんの依頼をすべてやり終えた。${o.item.name}を受け取った（${o.item.text}）。` : `${o.name}さんの「${O.STAGES[k].label}」の依頼をやり終えた。次は「${O.STAGES[st.stage].label}」の依頼。${reward}。`, 'g1');
    s.queue.push({ oid, kind: 'm' + st.stage, horse: ctx.horse || '', race: ctx.race || '', reward, y: g.year });
    return true;
  };
  // 自分が乗ったレースの結果（週の終わりに、レースのあとの馬で見る）：ジャンルの勝ちで好感度、課題、海外の印
  O.onResult = function (race, me) {
    const s = O.state();
    const h = me.horse, label = R.label(race);
    if (race.region === '海外' && !s.flags.overseas) s.flags.overseas = { y: yearOf(race), race: label };
    const a = s.week && s.week.acc[race.key];
    const offerOid = a && a.horseId === h.id ? a.oid : null;
    const cls = O.classOf(race);
    for (const o of LIST()) {
      const st = O.of(o.id);
      if (st.stage >= O.DONE) continue;
      const gain = me.pos === 1 ? O.GAIN[cls] : !st.known ? O.PLACE[me.pos] || 0 : 0;
      if (gain && O.signFits(o, race, h)) {
        O.addPts(o.id, gain);
        if (!st.known) st.lastWin = { horse: h.name, race: label };
      }
      if (!st.known) continue;
      const m = O.missionOf(o, st.stage);
      if (!m || !O.needOk(m.need || {}, race, me, offerOid === o.id)) continue;
      st.prog = (st.prog || 0) + 1;
      if (st.prog >= ((m.need && m.need.count) || 1)) O.advance(o.id, { horse: h.name, race: label });
    }
  };
  O.afterWeek = function (rep) {
    for (const r of (rep && rep.races) || []) {
      if (r.race.grade === 'GF' || !r.sim) continue;
      const me = r.sim.results.find(x => x.rider === 'P');
      if (me && me.horse) O.onResult(r.race, me);
    }
    O.meetCheck();
  };

  // ---------- 最後のアイテム（繁殖の永続のボーナス） ----------
  O.items = () => ALL().filter(o => o.item && O.of(o.id).got.item).map(o => o.item);
  // オリジナルホースが生まれたときに足す（js/core/original.js の O.make から）
  O.applyItems = function (h) {
    const its = O.items(); if (!its.length) return [];
    for (const it of its) {
      const b = it.bonus || {};
      if (b.pot) for (const k of Object.keys(b.pot)) if (h.pot[k] != null) h.pot[k] = Math.round(Math.min(120, h.pot[k] + b.pot[k]) * 10) / 10;
      if (b.health) h.health = Math.min(100, (h.health || 70) + b.health);
      if (b.distMax) h.distMax = Math.min(4000, h.distMax + b.distMax);
      if (b.kire) h.kire = Math.min(8, (h.kire || 4) + b.kire);
      if (b.heavy && h.apt) h.apt.heavy = Math.min(100, (h.apt.heavy || 50) + b.heavy);
    }
    h.items = its.map(it => it.name);
    return h.items;
  };

  // ---------- 店に頼む（来月の品ぞろえに、その人の好きな系統の馬を） ----------
  O.canAsk = id => O.active(id) && O.known(id) && O.of(id).stage >= O.ASK_STAGE;
  O.ask = function (oid) {
    if (!O.canAsk(oid)) return 'まだ頼めない';
    const g = G(), s = O.state();
    const y = g.month >= 12 ? g.year + 1 : g.year, m = g.month >= 12 ? 1 : g.month + 1;
    s.ask = { oid, y, m };
    W.dirty();
    return null;
  };
  // E.restock のあとに呼ぶ：頼まれた月なら、品ぞろえの後ろの何頭かを好みの馬に入れ替える
  O.shopBias = function (names) {
    const g = G(); if (!g || !g.owners) return names;
    const a = g.owners.ask;
    if (!a || a.y !== g.year || a.m !== g.month) return names;
    const o = O.by(a.oid), E = HS.Eraless; if (!o || !E) return names;
    const actN = E.activeNames();
    const pool = E.pool();
    const byName = new Map(pool.map(d => [d.name, d]));
    const rng = U.hashRng(`ask:${g.seed}:${g.year}:${g.month}:${o.id}`);
    for (const side of [false, true]) {
      const idx = []; names.forEach((n, i) => { const d = byName.get(n); if (d && (d.sex === '牝') === side) idx.push(i); });
      const fits = pool.filter(d => (d.sex === '牝') === side && E.isOpen(d) && !actN.has(d.name) && !names.includes(d.name) && O.fitData(o, d));
      const k = Math.min(O.ASK_N, fits.length, idx.length);
      for (let j = 0; j < k; j++) names[idx[idx.length - 1 - j]] = fits.splice(rng.int(0, fits.length - 1), 1)[0].name;
    }
    return names;
  };

  // ---------- 前の版のご褒美（前のセーブで受け取っていないものを受け取る） ----------
  // 思い出の名馬（スペシャルホース）を、デビュー前の2歳として譲ってもらう。お手馬がいっぱいなら、空いてから受け取る
  O.giftLegend = function (oid) {
    const g = G(), o = O.by(oid), st = O.of(oid);
    const got = st.got.bond || (st.got.bond = { y: g.year });
    const E = HS.Eraless, SP = HS.Special, T = HS.Season;
    const d = g.eraless && E && SP && o.memory ? SP.data(o.memory) : null;
    const money = () => { const m = yen(O.GIFT * 3); g.player.money += m; got.money = m; delete got.pending; return `お祝い ${U.money(m)}`; };
    if (!d) return money();
    if (T && !T.canBuy()) { got.pending = true; return `思い出の名馬${o.memory}（お手馬に空きができたら、馬主の画面で受け取れる）`; }
    g.unlocked = g.unlocked || [];
    if (!g.unlocked.includes(d.name)) g.unlocked.push(d.name);
    const it = E.market().find(x => x.horse.name === d.name);
    if (!it) return money(); // もう自分の馬にしている
    const h = it.horse;
    h.id = W.newId(); h.owner = 'P'; h.loc = 'farm'; h.legendBought = true; h.giftFrom = oid;
    if (HS.DATA.isForeign && HS.DATA.isForeign(d)) h.imported = true;
    g.lineup[h.name] = h.born - d.born;
    g.bornHist = (g.bornHist || []).filter(n => n !== h.name).concat([h.name]);
    g.horses[h.id] = h;
    W.dirty();
    got.horse = h.name; delete got.pending;
    W.news(`${o.name}さんから、思い出の名馬${h.name}を譲ってもらった。`, 'g1');
    return `思い出の名馬 ${h.name}`;
  };
  // 受け取っていないご褒美を受け取る（画面から）
  O.claim = function (oid) {
    const st = O.of(oid);
    if (!(st.got.bond && st.got.bond.pending)) return 'まだ受け取るものはない';
    const r = O.giftLegend(oid);
    if (st.got.bond.pending) return 'お手馬がいっぱい';
    W.news(`${O.by(oid).name}さんから受け取った：${r}`, 'good');
    return null;
  };
  // 前の版で「引退した馬を譲ってもらう」約束をした馬主の馬を1頭、年明けに牧場へ（W.newYear の前に。乗って勝った馬を優先）
  O.retireGifts = function () {
    const g = G();
    const Ori = HS.Original;
    for (const o of ALL()) {
      const st = O.of(o.id);
      if (!(st.got.t3 && st.got.t3.pending)) continue;
      const leaving = W.all().filter(h => h.owner !== 'P' && (h.loc === 'stable' || h.loc === 'farm') && !h.gelding && h.sex !== 'セ' && O.ownerOf(h) === o.id && (() => {
        const age = g.year - h.born;
        return (h.retireYear && h.retireYear < g.year && age >= 2) || age >= 9;
      })());
      if (!leaving.length) continue;
      const mt = (J.me() && J.me().mounts) || {};
      leaving.sort((a, b) => ((mt[b.name] || {}).wins || 0) - ((mt[a.name] || {}).wins || 0) || peak(b) - peak(a));
      const h = leaving.find(h => !Ori || !Ori.on() || Ori.retired(h.sex).length < Ori.MAX_EACH);
      if (!h) continue; // 牧場がいっぱい：次の年に
      if (Ori && Ori.on()) {
        W.unenter && W.unenter(h.id);
        h.owner = 'P'; h.loc = 'retired'; h.retiredY = g.year; h.auto = false; h.parentBonus = 0; h.giftFrom = o.id;
        st.got.t3 = { y: g.year, horse: h.name };
        W.news(`${o.name}さんから、引退した${h.name}を牧場に譲ってもらった。オリジナルホースの${h.sex === '牝' ? '母' : '父'}にできる。`, 'g1');
      } else {
        const m = yen(O.GIFT); g.player.money += m;
        st.got.t3 = { y: g.year, horse: h.name, money: m };
        W.news(`${o.name}さんの${h.name}が引退した。お礼に ${U.money(m)} が届いた。`, 'g1');
      }
      W.dirty();
    }
  };
  // 年末：その年にいちばん勝った馬主と「名コンビ賞」
  O.yearAward = function (year) {
    const s = O.state(), g = G();
    const rows = LIST().map(o => ({ o, y: O.of(o.id).years[year] || { rides: 0, wins: 0 } })).filter(x => x.y.wins >= O.AWARD_MIN)
      .sort((a, b) => b.y.wins - a.y.wins || a.y.rides - b.y.rides);
    if (!rows.length || s.awards[year]) return null;
    const { o, y } = rows[0];
    const m = yen(O.AWARD);
    g.player.money += m;
    s.awards[year] = { oid: o.id, wins: y.wins, money: m };
    O.addPts(o.id, 3);
    W.news(`${W.yLabel(year)}の名コンビ賞：${o.name}さんの馬で${y.wins}勝。賞金 ${U.money(m)}。`, 'g1');
    s.queue.push({ oid: o.id, kind: 'award', reward: `名コンビ賞 ${U.money(m)}`, y: year });
    return o.id;
  };
  // 勝負服：自分の馬に、G1 の段階になった馬主の勝負服を着せる（null で自分の服に戻す）
  O.canWear = oid => !!O.of(oid).got.t2;
  O.wear = function (horseId, oid) {
    const s = O.state(), h = W.horse(horseId);
    if (!h || h.owner !== 'P') return '自分の馬ではない';
    if (oid && !O.canWear(oid)) return 'まだ着せられない';
    if (oid) s.wear[horseId] = oid; else delete s.wear[horseId];
    return null;
  };
  O.silksOf = function (h) {
    const g = G(); if (!g || !g.owners || !h) return null;
    const oid = h.owner === 'P' ? g.owners.wear[h.id] : O.on() ? O.ownerOf(h) : null;
    const o = oid && O.by(oid);
    return o ? o.silks : null;
  };

  // ---------- 台詞 ----------
  // scene：offer・paddock・win・bigwin・good・lose・decline。段階で near（OP・G3）と close（G2 から）を使い分ける
  // 台詞の頭の印：その場面に合うときだけ使う（[ダ] ダート・[芝] 芝・[短] 1400mまで・[長] 2400mから・[逃] 逃げ馬・[差] 差し追込・[牝] 牝馬・[海] 海外）
  O.tagsOf = function (race, h) {
    const t = new Set();
    if (race) { t.add(race.surface === 'ダ' ? 'ダ' : '芝'); if (race.dist <= 1400) t.add('短'); if (race.dist >= 2400) t.add('長'); if (race.region === '海外') t.add('海'); }
    if (h) { if (h.style === '逃げ') t.add('逃'); if (h.style === '差し' || h.style === '追込') t.add('差'); if (h.sex === '牝') t.add('牝'); }
    return t;
  };
  O.pickLine = function (set, seed, tags) {
    const ok = set.filter(t => { const m = /^\[(.)\]/.exec(t); return !m || (tags && tags.has(m[1])); });
    const list = ok.length ? ok : set.filter(t => !/^\[/.test(t));
    if (!list.length) return '';
    return list[Math.abs(seed | 0) % list.length].replace(/^\[.\]/, '');
  };
  O.closeOf = oid => O.of(oid).stage >= 2;
  // ctx：{ race, horse }（印の判定に使う）
  O.line = function (oid, scene, seed, vars, ctx) {
    const o = O.by(oid); if (!o) return '';
    const set = (o.lines[scene] || {})[O.closeOf(oid) ? 'close' : 'near'] || (o.lines[scene] || {}).near || [];
    if (!set.length) return '';
    ctx = ctx || {};
    return O.fill_(O.pickLine(set, seed, O.tagsOf(ctx.race, ctx.horse)), vars);
  };
  O.fill_ = function (text, vars) {
    vars = Object.assign({ me: J && J.me && J.me() ? J.me().name : '' }, vars || {});
    return String(text).replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : '');
  };
  O.sceneLines = (oid, kind, vars) => { const o = O.by(oid); return o ? ((o.scenes || {})[kind] || []).map(t => O.fill_(t, vars)) : []; };

  // ---------- 週の流れにつなぐ（共有のファイルは書き換えず、包む） ----------
  const newGame0 = W.newGame;
  W.newGame = function (opts) { const g = newGame0.apply(this, arguments); if (g && g.mode === 'jockey') g.owners = O.init(); return g; };
  const migrate0 = W.migrate;
  W.migrate = function (g) { migrate0.apply(this, arguments); if (g.mode === 'jockey') g.owners = O.fill(g.owners, g); };
  const finish0 = W.finishWeek;
  W.finishWeek = function () {
    if (O.on()) O.state().react = [];
    const rep = finish0.apply(this, arguments);
    if (O.on() && rep) O.afterWeek(rep);   // 自分が乗ったレースの結果（ジャンルの勝ち・課題・出会い）
    return rep;
  };
  const newYear0 = W.newYear;
  W.newYear = function () { if (O.on()) O.retireGifts(); return newYear0.apply(this, arguments); };
  const E = HS.Eraless;
  if (E && E.restock) { const restock0 = E.restock; E.restock = function () { const names = restock0.apply(this, arguments); if (O.on()) O.shopBias(names); return names; }; }
  if (J) {
    const record0 = J.record;
    J.record = function (race, sim, runners) {
      record0.apply(this, arguments);
      if (!O.on()) return;
      const s = O.state(), a = s.week && s.week.acc[race.key];
      if (!a) return;
      const me = sim.results.find(x => x.rider === 'P');
      if (!me || me.horse.id !== a.horseId) return;
      const ex = runners.find(x => x.rider === 'P');
      O.onRide(a.oid, race, me, ex && ex.pop);
    };
    const yearEnd0 = J.yearEnd;
    J.yearEnd = function (year) { yearEnd0.apply(this, arguments); if (O.on()) O.yearAward(year); };
  }
})();
