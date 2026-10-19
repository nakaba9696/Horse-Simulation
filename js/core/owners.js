// 馬主と騎乗依頼（持ち主の決定 2026-10-16「プレイヤーに騎乗依頼をしてくる人にします。仲良くなるほど大きなレースで強い馬の依頼がきます。仲良くなったときのご褒美はほしい」）
// 世界の AI の馬の一部を、架空の馬主（data/owners.js）が持つ。縁のある馬主から、毎週「この馬でこのレースに」と依頼が来る。
// 受けると出走表で自分が乗る（G.rides。おまかせも可）。騎手の取り分は賞金の5%（jockey.js）と、ここで払う騎乗料。
// はじめはだれからも依頼が来ない。馬主ごとの「依頼が始まる条件」（data/owners.js の unlock。看板の特徴に合わせた結果）を満たすと
// その馬主との縁ができ（known）、次の週から依頼が来る（持ち主の指摘 2026-10-17「最初から騎乗依頼ださないで　それぞれ条件があって依頼始まる感じで」）。
// 馬主には看板の特徴が1つある（likes の先頭。短距離好き・ダート好きなど）。持つ馬と依頼のレースが、はっきりそこに寄る
// （持ち主の指摘 2026-10-17「騎乗依頼主の特徴つけれるといい　短距離好きとかアメリカ好きとかダート好きとか」）。
// 好感度（pts）で段階が上がる：顔見知り → 信頼 → 主戦 → 相棒。段階が上がるほど格の高いレース・強い馬の依頼が来る。
// 段階が上がるとご褒美（祝いの品・勝負服・引退した馬・思い出の名馬）。年末には「名コンビ賞」。
// 乱数は U.hashRng（週と馬の名前から決まる）だけで、世界の乱数は使わない。セーブは G.owners（W.migrate で既定値）。
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World, R = HS.Races, J = HS.Jockey;
  const O = HS.Owners = {};
  const G = () => W.get();
  const LIST = () => (HS.DATA && HS.DATA.owners) || [];
  O.list = LIST;
  O.by = id => LIST().find(o => o.id === id) || null;

  // ---------- 段階と数（仮の値。遊んで直す） ----------
  O.TIERS = [
    { label: '顔見知り', pts: 0, maxClass: 0, maxFh: 60, maxStrength: 0.75 },   // 条件戦だけ・そこそこの馬
    { label: '信頼', pts: 100, maxClass: 2, maxFh: 70, maxStrength: 0.9 },       // 重賞（G3・G2）
    { label: '主戦', pts: 260, maxClass: 3, maxFh: 78, maxStrength: 1 },         // G1。いちばん強い馬に乗り続けられる
    { label: '相棒', pts: 520, maxClass: 4, maxFh: 99, maxStrength: 1 },         // グランドフィナーレ・海外
  ];
  O.MAX = 800;             // 好感度の上限（ここまで来ると最後のご褒美）
  O.OWNED = 0.5;           // AI の史実馬のうち、馬主のキャラが持つ割合
  O.OWNED_FILLER = 0.3;    // その場限りの馬（モブ）のうち、馬主のキャラが持つ割合
  O.FEE = [10, 30, 50, 100, 200];   // 騎乗料（万円・1995年の物価）。条件戦・G3・G2・G1・グランドフィナーレ
  O.GIFT = 1000;           // 信頼の祝いの品（万円・1995年の物価）
  O.AWARD = 500;           // 名コンビ賞の賞金（万円・1995年の物価）
  O.AWARD_MIN = 3;         // 名コンビ賞に要る、その年の勝ち数
  O.SIGN_RATE = 0.9;       // 看板の特徴に合う候補があるとき、その中から選ぶ割合（仮）
  O.OFF_SIGN = 0.25;       // 看板の特徴に合う候補が無い週に、それでも依頼を出す割合（仮）
  O.REWARDS = [
    { key: 't1', tier: 1, label: '祝いの品', note: '賞金のお祝い' },
    { key: 't2', tier: 2, label: '勝負服', note: 'その馬主の勝負服を自分の馬に着せられる。いちばん強い馬に乗り続けられる' },
    { key: 't3', tier: 3, label: '引退した馬', note: 'その馬主の馬が引退したら、牧場に譲ってもらえる（オリジナルホースの親）' },
    { key: 'bond', tier: 4, label: '思い出の名馬', note: '好感度がいっぱいになると、その馬主の思い出のスペシャルホースを譲ってもらえる' },
  ];

  O.on = () => !!(J && J.isMode && J.isMode());
  // known：縁がある（依頼が来る）。knownAt：縁ができた日（{ y, m, w }）
  const blank = () => ({ pts: 0, tier: 0, met: false, known: false, rides: 0, wins: 0, big: 0, dec: 0, streak: 0, fees: 0, got: {}, years: {} });
  O.init = function () {
    const st = {}; for (const o of LIST()) st[o.id] = blank();
    return { st, week: null, log: [], queue: [], react: [], awards: {}, wear: {} };
  };
  // 古いセーブ・足りない項目を埋める
  O.fill = function (s) {
    s = s || O.init();
    s.st = s.st || {};
    for (const o of LIST()) {
      const old = s.st[o.id];
      // 縁の項目が無い前のセーブ：依頼を受けた・断った・乗った・好感度がある馬主は、縁がある扱い
      if (old && old.known === undefined) old.known = !!(old.met || old.rides || old.pts || old.tier);
      s.st[o.id] = Object.assign(blank(), old || {});
    }
    for (const k of ['log', 'queue', 'react']) s[k] = s[k] || [];
    s.awards = s.awards || {}; s.wear = s.wear || {}; if (s.week === undefined) s.week = null;
    return s;
  };
  O.state = function () { const g = G(); if (!g.owners) g.owners = O.init(); return g.owners; };
  O.of = id => { const s = O.state(); return s.st[id] || (s.st[id] = blank()); };
  O.tierOf = id => O.TIERS[O.of(id).tier];
  O.nextTier = id => O.TIERS[O.of(id).tier + 1] || null;
  const IDX = () => U.priceIndex(G().year);
  const yen = v => Math.round(v * IDX() / 10) * 10;

  // ---------- 好み ----------
  // 国の好み（usa・europe）：その国で生まれた馬・その国の種牡馬の仔、その国のレース
  const EU = ['英', '愛', '仏', '独', '伊'];
  let sireC = null;
  const sireCountry = h => {
    if (!sireC) { sireC = new Map(); for (const s of (HS.DATA && HS.DATA.stallions) || []) sireC.set(s.name, s.country || ''); }
    return (h.sire && sireC.get(h.sire)) || '';
  };
  const fitH = {
    sprint: h => (h.distMax || 2000) <= 1600 ? 1 : (h.distMin || 1600) <= 1400 ? 0.5 : 0,
    mile: h => (h.distMin || 1600) <= 1600 && (h.distMax || 2000) >= 1600 ? 1 : 0,
    long: h => (h.distMax || 2000) >= 2400 ? 1 : 0,
    dirt: h => h.apt && h.apt.dirt > h.apt.turf ? 1 : 0,
    turf: h => !h.apt || h.apt.turf >= h.apt.dirt ? 1 : 0,
    filly: h => h.sex === '牝' ? 1 : 0,
    front: h => h.style === '逃げ' ? 1 : 0,
    closer: h => h.style === '差し' || h.style === '追込' ? 1 : 0,
    foreign: h => h.foreign || h.foreignTrained || (h.country && h.country !== '日') ? 1 : 0,
    blood: h => h.hist ? 1 : 0,
    local: h => h.local ? 1 : 0,
    classic: h => (!h.apt || h.apt.turf >= h.apt.dirt) && (h.distMin || 1600) <= 2000 && (h.distMax || 2000) >= 2000 ? 1 : 0,
    usa: h => h.country === '米' ? 1 : sireCountry(h) === '米' ? 0.5 : 0,
    europe: h => EU.includes(h.country) ? 1 : EU.includes(sireCountry(h)) ? 0.5 : 0,
  };
  const fitR = {
    sprint: r => r.dist <= 1400 ? 1 : 0, mile: r => r.dist > 1400 && r.dist <= 1800 ? 1 : 0, long: r => r.dist >= 2400 ? 1 : 0,
    dirt: r => r.surface === 'ダ' ? 1 : 0, turf: r => r.surface === '芝' ? 1 : 0, filly: r => r.sex === '牝' ? 1 : 0,
    overseas: r => r.region === '海外' ? 1 : 0, foreign: r => r.region === '海外' ? 1 : 0, local: r => r.region === '地方' ? 1 : 0,
    classic: r => r.age === '3' && r.graded ? 1 : 0, young: r => r.age === '2' ? 1 : 0, veteran: r => r.age === '3+' || r.age === '4+' ? 1 : 0,
    usa: r => r.region === '海外' && r.country === '米' ? 1 : 0, europe: r => r.region === '海外' && EU.includes(r.country) ? 1 : 0,
  };
  O.fitHorse = (o, h) => o.likes.length ? U.sum(o.likes.map(k => fitH[k] ? fitH[k](h) : 0)) / o.likes.length : 0;
  O.fitRace = (o, r) => o.likes.length ? U.sum(o.likes.map(k => fitR[k] ? fitR[k](r) : 0)) / o.likes.length : 0;

  // ---------- 看板の特徴（likes の先頭） ----------
  O.LIKE_LABEL = {
    sprint: '短距離好き', mile: 'マイル好き', long: '長距離好き', dirt: 'ダート好き', turf: '芝好き', filly: '牝馬好き', front: '逃げ馬好き',
    closer: '差し馬好き', foreign: '外国の馬好き', overseas: '海外好き', local: '地方好き', classic: 'クラシック好き', young: '2歳馬好き',
    veteran: '古馬好き', blood: '血統好き', usa: 'アメリカ好き', europe: '欧州好き',
  };
  O.signOf = o => (o && o.likes && o.likes[0]) || '';
  O.signLabel = o => O.LIKE_LABEL[O.signOf(o)] || '';
  O.subLabels = o => ((o && o.likes) || []).slice(1).map(k => O.LIKE_LABEL[k]).filter(Boolean);
  // 依頼（レースと馬）が看板の特徴に合うか
  const SIGN = {
    sprint: (r, h) => r.dist <= 1400,
    dirt: (r, h) => r.surface === 'ダ',
    long: (r, h) => r.dist >= 2000,
    classic: (r, h) => r.age === '2' || r.age === '3' || G().year - h.born <= 3,   // 2歳・3歳のレースか、3歳までの若い馬
    front: (r, h) => h.style === '逃げ',
    closer: (r, h) => h.style === '差し' || h.style === '追込',
    filly: (r, h) => h.sex === '牝',
    usa: (r, h) => fitR.usa(r) > 0 || fitH.usa(h) > 0,
    europe: (r, h) => fitR.europe(r) > 0 || fitH.europe(h) > 0,
  };
  O.signFits = (o, race, h) => { const f = SIGN[O.signOf(o)]; return f ? !!f(race, h) : true; };
  // 馬を持つときの重み：看板の特徴に合う馬を強く好む
  const ownW = (o, h) => { const f = fitH[O.signOf(o)]; return 0.2 + (f ? f(h) : 0) * 3 + O.fitHorse(o, h); };

  // ---------- 縁（依頼が始まる条件） ----------
  O.known = id => !!O.of(id).known;
  O.knownList = () => LIST().filter(o => O.known(o.id));
  // 条件（data/owners.js の unlock）：pos 着以内・距離・芝ダ・馬の性・脚質・重賞・レースの年齢・地域。書いていない項目は問わない
  O.unlockOk = function (u, race, me) {
    if (!u) return true;
    const h = me.horse || {};
    if (u.pos && !(me.pos <= u.pos)) return false;
    if (u.minDist && race.dist < u.minDist) return false;
    if (u.maxDist && race.dist > u.maxDist) return false;
    if (u.surface && race.surface !== u.surface) return false;
    if (u.sex && h.sex !== u.sex) return false;
    if (u.style && !u.style.includes(h.style)) return false;
    if (u.graded && !race.graded) return false;
    if (u.age && !u.age.includes(race.age)) return false;
    if (u.region && race.region !== u.region) return false;
    return true;
  };
  // 縁ができる：次の週から依頼が来る。出会いの場面（kind 'meet'）を積む
  O.meet = function (oid, ctx) {
    const o = O.by(oid), st = O.of(oid);
    if (!o || st.known) return false;
    const g = G(), s = O.state();
    ctx = ctx || {};
    st.known = true; st.knownAt = { y: g.year, m: g.month, w: g.week };
    W.news(`${o.name}さん（${O.signLabel(o)}）から声がかかった。これから騎乗依頼が来る。`, 'good');
    s.queue.push({ oid, kind: 'meet', horse: ctx.horse || '', race: ctx.race || '', reward: '', y: g.year });
    return true;
  };
  // 自分が乗ったレースの結果で、まだ縁のない馬主の条件を見る
  O.meetCheck = function (race, me) {
    for (const o of LIST()) if (!O.of(o.id).known && O.unlockOk(o.unlock, race, me)) O.meet(o.id, { horse: me.horse.name, race: R.label(race) });
  };
  // 縁がまだ無い馬主の、条件のヒント（ぼかした一言）
  O.hint = oid => { const o = O.by(oid); return (o && o.unlock && o.unlock.hint) || ''; };

  // ---------- 馬主の馬 ----------
  // 馬の名前と種から決まる（セーブに持たない）。自分の馬・スペシャルホースはだれの馬でもない
  let own = null;
  O.ownerOf = function (h) {
    if (!h || h.owner === 'P' || h.legend || !LIST().length) return null;
    const g = G(); if (!g) return null;
    if (!own || own.seed !== g.seed || own.map.size > 6000) own = { seed: g.seed, map: new Map() };
    // 覚えておく鍵は名前と id の組（同じ名前の別の馬＝店の馬と走っている馬で、答えが入れ替わらないように。
    // 前は名前だけで覚えていて、先にどちらを見たかで答えが変わり、セーブを読み直すとその週の依頼が変わることがあった）
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

  // レースの格：0 条件戦・1 G3・2 G2・3 G1・4 グランドフィナーレ
  O.classOf = race => race.invite || race.grade === 'GF' ? 4 : !race.graded ? 0 : ({ G1: 3, G2: 2, G3: 1 }[race.grade] || 1);
  // その段階で、このレースのこの馬の依頼が来るか
  O.allowed = function (tier, race, h, strength) {
    const t = O.TIERS[tier];
    const cls = O.classOf(race);
    if (cls > t.maxClass) return false;
    if (race.region === '海外' && tier < 3) return false;
    if (strength > t.maxStrength + 1e-9) return false;
    if (peak(h) > t.maxFh) return false;
    return true;
  };

  // ---------- 今週の依頼 ----------
  // cards：W.cards() の出走表。opts.tier で段階を決め打ちにできる・opts.all で縁の無い馬主も（テスト用）
  // 縁のある馬主だけが依頼を出す。看板の特徴に合う候補があればたいていその中から、無い週はたまにだけ合わない依頼を出す
  O.generate = function (cards, key, opts) {
    opts = opts || {};
    const g = G();
    const wIdx = W.wIdx();
    const r = U.hashRng(`${key}:owners:${g.seed}`);
    const tierOf = oid => opts.tier != null ? opts.tier : O.of(oid).tier;
    const per = {};
    for (const c of cards) {
      const race = c.race;
      const ranked = c.runners.slice().sort((a, b) => H.overall(H.cur(b.horse, wIdx)) - H.overall(H.cur(a.horse, wIdx)));
      ranked.forEach((x, k) => {
        if (x.mine || x.horse.owner === 'P' || x.horse.legend) return;
        const oid = O.ownerOf(x.horse); if (!oid) return;
        if (!opts.all && !O.of(oid).known) return;
        const strength = 1 - k / Math.max(1, ranked.length - 1); // 1＝いちばん強い
        if (!O.allowed(tierOf(oid), race, x.horse, strength)) return;
        (per[oid] = per[oid] || []).push({ c, x, strength });
      });
    }
    const out = [], used = new Set();
    const push = (o, y, best) => { used.add(y.c.race.key); out.push({ oid: o.id, raceKey: y.c.race.key, horseId: y.x.horse.id, horse: y.x.horse.name, best: !!best, line: r.int(0, 999) }); };
    const owners = r.shuffle(LIST().slice());
    for (const o of owners) {
      const cand = (per[o.id] || []).filter(y => !used.has(y.c.race.key));
      if (!cand.length) continue;
      const tier = tierOf(o.id);
      // 主戦から：その馬主のいちばん強い馬が走るなら、必ずその馬で
      const best = tier >= 2 ? O.bestHorse(o.id) : null;
      const bestPick = best && cand.find(y => y.x.horse.id === best.id);
      if (bestPick) { push(o, bestPick, true); continue; }
      if (!r.chance(0.4 + 0.1 * tier)) continue;
      const fit = cand.filter(y => O.signFits(o, y.c.race, y.x.horse));
      let pool = cand;
      if (fit.length) { if (r.chance(O.SIGN_RATE)) pool = fit; }
      else if (!r.chance(O.OFF_SIGN)) continue;
      const want = 0.3 + 0.17 * tier;
      const pick = r.weighted(pool, y => (Math.exp(-Math.pow((y.strength - want) / 0.3, 2)) + 0.02) * (1 + O.classOf(y.c.race) * tier * 0.6) * (1 + O.fitRace(o, y.c.race) + O.fitHorse(o, y.x.horse)));
      push(o, pick);
    }
    // 縁のある馬主がいれば、毎週少なくとも1件は来る（だれも出さなかった週は、候補のいちばん多い馬主から。看板の特徴に合う候補を先に）
    if (!out.length) {
      const o = owners.filter(o => (per[o.id] || []).length).sort((a, b) => per[b.id].length - per[a.id].length)[0];
      if (o) { const fit = per[o.id].filter(y => O.signFits(o, y.c.race, y.x.horse)); push(o, r.pick(fit.length ? fit : per[o.id])); }
    }
    return out;
  };
  const wkKey = () => { const g = G(); return `${g.year}-${g.month}-${g.week}`; };
  const cardHas = (cards, raceKey, horseId) => { const c = cards.find(c => c.race.key === raceKey); return !!(c && c.runners.some(x => x.horse.id === horseId)); };
  // 今週の依頼（週の初めに一度だけ作り、セーブに残す。断った依頼・走れなくなった依頼は除く）
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
    return s.week.list.filter(o => cardHas(fresh, o.raceKey, o.horseId) && !s.week.dec.includes(o.raceKey));
  };
  O.offerOf = (raceKey) => O.offers().find(o => o.raceKey === raceKey) || null;
  O.accepted = raceKey => { const s = O.state(); return !!(s.week && s.week.key === wkKey() && s.week.acc[raceKey]); };
  // 自分の馬が同じレースに出るか（出るなら、受けるとその馬には別の騎手が乗る）
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
  // 断る（好感度が少し下がる。段階は下がらない）
  O.decline = function (raceKey) {
    const s = O.state(), g = G();
    const o = O.offers().find(o => o.raceKey === raceKey);
    if (!o) return '依頼が見つからない';
    if (s.week.acc[raceKey]) O.unaccept(raceKey);
    s.week.dec.push(raceKey);
    const st = O.of(o.oid); st.met = true; st.dec++;
    const d = -(5 + st.tier);
    O.addPts(o.oid, d);
    const race = W.raceByKey(raceKey);
    s.log.unshift({ y: g.year, m: g.month, w: g.week, oid: o.oid, race: race ? R.label(race) : '', horse: o.horse, pos: 0, d });
    if (s.log.length > 150) s.log.length = 150;
    return null;
  };

  // ---------- 好感度 ----------
  // 下がっても、いまの段階の入口より下にはならない（急に冷めない）
  O.addPts = function (oid, d) {
    const st = O.of(oid);
    const floor = O.TIERS[st.tier].pts;
    st.pts = U.clamp(Math.round((st.pts + d) * 10) / 10, floor, O.MAX);
    while (st.tier < O.TIERS.length - 1 && st.pts >= O.TIERS[st.tier + 1].pts) { st.tier++; O.grant(oid, 't' + st.tier); }
    if (st.pts >= O.MAX) O.grant(oid, 'bond');
    return st.pts;
  };
  // 乗った結果で好感度が動く（依頼を受けて乗ったレース）
  O.onRide = function (oid, race, me, pop) {
    const g = G(), s = O.state(), o = O.by(oid), st = O.of(oid);
    if (!o) return;
    const cls = O.classOf(race), pos = me.pos;
    const mult = [1, 1.4, 1.7, 2.5, 3][cls] * (race.region === '海外' && cls >= 3 ? 1.2 : 1);
    st.streak = pos <= 3 ? 0 : st.streak + 1;
    let d = pos <= 5 ? 4 : st.streak >= 4 ? -3 : 1;              // 乗るだけで少し。負け続けると下がる
    if (pos === 1) d += 25 * mult; else if (pos === 2) d += 10 * mult; else if (pos === 3) d += 6 * mult; else if (pos <= 5) d += 2;
    if (pop && pop - pos >= 3) d += 4;                           // 人気より上に来た
    if (pos <= 3 && O.fitRace(o, race) >= 0.5) d *= 1.3;         // 好みのレースで結果を出した
    const bigLoss = cls >= 3 && pos >= 10 && pop && pop <= 3;    // 大事なレースで大敗
    if (bigLoss) d = -8;
    d = Math.round(d * 10) / 10;
    // 騎乗料（賞金の取り分は jockey.js で入っている）
    const fee = yen(O.FEE[cls]);
    g.player.money += fee; st.fees += fee;
    st.rides++; if (pos === 1) { st.wins++; if (cls >= 3) st.big++; }
    const yr = st.years[g.year] = st.years[g.year] || { rides: 0, wins: 0 };
    yr.rides++; if (pos === 1) yr.wins++;
    st.met = true;
    const t0 = st.tier;
    O.addPts(oid, d);
    const kind = pos === 1 ? (cls >= 3 ? 'bigwin' : 'win') : (pos <= 3 || (pop && pop - pos >= 3)) ? 'good' : 'lose';
    const label = R.label(race);
    s.react.push({ oid, kind, race: label, horse: me.horse.name, pos, d, fee, up: st.tier > t0, line: U.hash(`${label}:${me.horse.name}:${g.year}`) % 997, tags: [...O.tagsOf(race, me.horse)] });
    s.log.unshift({ y: g.year, m: race.month, w: race.week, oid, race: label, horse: me.horse.name, pos, d });
    if (s.log.length > 150) s.log.length = 150;
    if (pos === 1 && cls >= 3) W.news(`${o.name}さんの${me.horse.name}で${label}を勝った。`, 'g1');
  };

  // ---------- ご褒美（1つにつき1度だけ） ----------
  O.grant = function (oid, key) {
    const g = G(), s = O.state(), o = O.by(oid), st = O.of(oid);
    if (!o || st.got[key]) return false;
    const got = st.got[key] = { y: g.year };
    let reward = '';
    if (key === 't1') { const m = yen(O.GIFT); g.player.money += m; got.money = m; reward = `祝いの品 ${U.money(m)}`; }
    else if (key === 't2') reward = `${o.name}さんの勝負服を、自分の馬に着せられるようになった`;
    else if (key === 't3') { got.pending = true; reward = `${o.name}さんの馬が引退したら、牧場に譲ってもらえる`; }
    else if (key === 'bond') { const r = O.giftLegend(oid); reward = r; }
    W.news(key === 'bond' ? `${o.name}さんの好感度がいっぱいになった。${reward}。` : `${o.name}さんとの間柄が「${O.TIERS[st.tier].label}」になった。${reward}。`, 'g1');
    s.queue.push({ oid, kind: key === 'bond' ? 'bond' : 'up' + key.slice(1), reward, y: g.year });
    return true;
  };
  // 思い出の名馬（スペシャルホース）を、デビュー前の2歳として譲ってもらう。お手馬がいっぱいなら、空いてから受け取る
  O.giftLegend = function (oid) {
    const g = G(), o = O.by(oid), st = O.of(oid);
    const got = st.got.bond || (st.got.bond = { y: g.year });
    const E = HS.Eraless, SP = HS.Special, T = HS.Season;
    const d = g.eraless && E && SP ? SP.data(o.memory) : null;
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
    O.state().queue.push({ oid, kind: 'bond', reward: r, y: G().year });
    return null;
  };
  // 年明けに引退する、相棒の馬主の馬を1頭、牧場へ（W.newYear の前に。乗って勝った馬を優先）
  O.retireGifts = function () {
    const g = G(), s = O.state();
    const Ori = HS.Original;
    for (const o of LIST()) {
      const st = O.of(o.id);
      if (!(st.got.t3 && st.got.t3.pending)) continue;
      const leaving = W.all().filter(h => h.owner !== 'P' && (h.loc === 'stable' || h.loc === 'farm') && !h.gelding && h.sex !== 'セ' && O.ownerOf(h) === o.id && (() => {
        const age = g.year - h.born;
        return (h.retireYear && h.retireYear < g.year && age >= 2) || age >= 9 || (h.injury && h.injury.severe && age >= 4);
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
      s.queue.push({ oid: o.id, kind: 'gift', horse: h.name, reward: `引退した ${h.name}`, y: g.year });
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
    O.addPts(o.id, 25);
    W.news(`${W.yLabel(year)}の名コンビ賞：${o.name}さんの馬で${y.wins}勝。賞金 ${U.money(m)}。`, 'g1');
    s.queue.push({ oid: o.id, kind: 'award', reward: `名コンビ賞 ${U.money(m)}`, y: year });
    return o.id;
  };
  // 勝負服：自分の馬に、主戦になった馬主の勝負服を着せる（null で自分の服に戻す）
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
  // scene：offer・paddock・win・bigwin・good・lose・decline。段階で near（顔見知り・信頼）と close（主戦・相棒）を使い分ける
  // 台詞の頭の印：その場面に合うときだけ使う（[ダ] ダート・[芝] 芝・[短] 1400mまで・[長] 2400mから・[逃] 逃げ馬・[差] 差し追込・[牝] 牝馬）
  O.tagsOf = function (race, h) {
    const t = new Set();
    if (race) { t.add(race.surface === 'ダ' ? 'ダ' : '芝'); if (race.dist <= 1400) t.add('短'); if (race.dist >= 2400) t.add('長'); }
    if (h) { if (h.style === '逃げ') t.add('逃'); if (h.style === '差し' || h.style === '追込') t.add('差'); if (h.sex === '牝') t.add('牝'); }
    return t;
  };
  O.pickLine = function (set, seed, tags) {
    const ok = set.filter(t => { const m = /^\[(.)\]/.exec(t); return !m || (tags && tags.has(m[1])); });
    const list = ok.length ? ok : set.filter(t => !/^\[/.test(t));
    if (!list.length) return '';
    return list[Math.abs(seed | 0) % list.length].replace(/^\[.\]/, '');
  };
  // ctx：{ race, horse }（印の判定に使う）
  O.line = function (oid, scene, seed, vars, ctx) {
    const o = O.by(oid); if (!o) return '';
    const st = O.of(oid);
    const set = (o.lines[scene] || {})[st.tier >= 2 ? 'close' : 'near'] || (o.lines[scene] || {}).near || [];
    if (!set.length) return '';
    ctx = ctx || {};
    return O.fill_(O.pickLine(set, seed, O.tagsOf(ctx.race, ctx.horse)), vars);
  };
  O.fill_ = function (text, vars) {
    vars = Object.assign({ me: J && J.me && J.me() ? J.me().name : '' }, vars || {});
    return String(text).replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : '');
  };
  O.sceneLines = (oid, kind, vars) => { const o = O.by(oid); return o ? (o.scenes[kind] || []).map(t => O.fill_(t, vars)) : []; };

  // ---------- 週の流れにつなぐ（共有のファイルは書き換えず、包む） ----------
  const newGame0 = W.newGame;
  W.newGame = function (opts) { const g = newGame0.apply(this, arguments); if (g && g.mode === 'jockey') g.owners = O.init(); return g; };
  const migrate0 = W.migrate;
  W.migrate = function (g) { migrate0.apply(this, arguments); if (g.mode === 'jockey') g.owners = O.fill(g.owners); };
  const finish0 = W.finishWeek;
  W.finishWeek = function () { if (O.on()) O.state().react = []; return finish0.apply(this, arguments); };
  const newYear0 = W.newYear;
  W.newYear = function () { if (O.on()) O.retireGifts(); return newYear0.apply(this, arguments); };
  if (J) {
    const record0 = J.record;
    J.record = function (race, sim, runners) {
      record0.apply(this, arguments);
      if (!O.on()) return;
      const meP = sim.results.find(x => x.rider === 'P');
      if (meP) O.meetCheck(race, meP);
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
