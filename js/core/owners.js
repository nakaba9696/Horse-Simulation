// オーナー（馬主）と騎乗依頼（持ち主の仕様書 docs/SPEC.md「騎乗依頼」2026-10-19 と「持ち主の決定（2026-10-20・オーナーの依頼）」が正本）
// 世界の AI の馬の一部を、架空のオーナー（data/owners.js）が持つ。オーナーは8つのジャンル（地方・短距離・クラシック・長距離・牝馬・米・欧州・豪州）に1人ずつ。
// クラシック系は秘書のユニ（ふつうの優秀なナビゲーター）。キンチェムモチーフの人物は GF の一族の人として別に作った（data/gfhost.js・js/core/gfhost.js）。
// 画面の言葉は「オーナー」「友好度」（持ち主の決定 2026-10-20）。コードの名前（owners・pts）はそのまま。
//
// 出会いの点：その人のジャンルのレースを自分が乗って勝つと、点がたまる（OP 1点・G3 2点・G2 3点・G1 4点。O.GAIN）。合わせて O.MEET（4点）で出会い。
//   海外の人は、海外のレースに1度出た印のあと（O.GATES）。出会いの場面は次の週の頭に見せる（場面の列 queue）。
// 依頼はミッション形式：段階 OP → G3 → G2 → G1 → お手馬。OP〜G1 の段階は「依頼の馬」と「レース」が決まっている（data の missions。名前で固定）。
//   出会い・ミッションのクリアのあと、次のミッションのレースの O.LEAD 週前に依頼が来る（st.job）。依頼が来た週に、オーナーの馬として世界に出す（O.issue）。
//   レースの週は、依頼の馬に自分が乗る（G.rides。依頼が先）。自分の馬が同じレースに出ていれば出走を取り消す。自分の馬に乗るなら依頼は見送り（O.decline）。
//   勝てばクリア（お礼・友好度・場面・次の段階）。負けた・見送った・走れなかったときは、次の年の同じレースでもう一度（詰まらない）。
//   お手馬の段階は自分の馬で条件を満たす（need。O.needOk）。最後までやり終えると友好度がいっぱいになり、繁殖の永続のボーナスのアイテムをもらって依頼は終わる。
// 年代なしの世界とぶつからないように：まだやり終えていないミッションの依頼の馬は、デビュー（E.pick）と馬の店に出さない（E.pool を包む）。
//   依頼が来たとき、その馬が走っていればその馬を使い、年齢や引退でそのレースに出られなければ、いったん世界から外して、出られる年齢でもう一度出す。
//   自分の馬になっていれば（前のセーブ）、自分の馬で勝てばよい。
// 少し仲良くなると（G3 の段階から）、頼めば来月の店にその人の好きな系統の馬が並びやすくなる（O.ask）。年末には「名コンビ賞」。
// 乱数は U.hashRng（馬の名前などから決まる）だけで、世界の乱数は使わない。セーブは G.owners（W.migrate で既定値と前の形からの移し替え）。
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

  // ---------- 段階と数（仮の値。遊んで直す。docs/BALANCE.md「9. オーナーの依頼」） ----------
  // floor：その段階の友好度の下限。ミッションをやり終えると次の段階の下限まで上がる。やらずに次の段階の下限を超えることはない
  O.STAGES = [
    { key: 'op', label: 'OP', floor: 10, money: 300 },
    { key: 'g3', label: 'G3', floor: 25, money: 600 },
    { key: 'g2', label: 'G2', floor: 40, money: 1000 },
    { key: 'g1', label: 'G1', floor: 55, money: 2000 },
    { key: 'own', label: 'お手馬', floor: 70, money: 5000 },  // ミッションは自分の馬で
  ];
  O.DONE = 5;              // 最後のミッションまでやり終えた段階
  O.JOBS = 4;              // 馬とレースの決まったミッションの数（OP〜G1）
  O.MAX = 100;             // 友好度の上限（やり終えると、いっぱい）
  O.MEET = 4;              // 出会いに要る点
  O.GAIN = [1, 2, 3, 4, 0];   // ジャンルのレースで勝ったときの点（OP・G3・G2・G1・GF。GF は勝ち数に数えないので0）
  O.LEAD = 4;              // 依頼が来るのは、ミッションのレースの何週前か
  O.OWNED = 0.5;           // AI の史実馬のうち、オーナーのキャラが持つ割合（依頼の馬は別に、その人の馬）
  O.OWNED_FILLER = 0.3;    // その場限りの馬のうち、オーナーのキャラが持つ割合
  O.FEE = [10, 30, 50, 100, 200];   // 騎乗料（万円・1995年の物価）。OP・G3・G2・G1・GF
  O.GIFT = 1000;           // 思い出の名馬が受け取れないときのお祝い（前の版。前のセーブのため）
  O.AWARD = 500;           // 名コンビ賞の賞金（万円・1995年の物価）
  O.AWARD_MIN = 2;         // 名コンビ賞に要る、その年の勝ち数（依頼はミッションだけになったので、前の3から2に）
  O.ASK_STAGE = 1;         // 店に馬を頼めるようになる段階（G3 の段階。「少し仲良くなると」）
  O.ASK_N = 3;             // 頼んだとき、牡馬・牝馬それぞれ何頭までその人の好みの馬に入れ替えるか
  O.WEAR_STAGE = 3;        // 勝負服を着せられるようになる段階（G1 の段階）
  // 依頼が始まる前に要る印（あとで本当の「海外の解放」に差し替える）
  O.GATES = { overseas: () => !!O.state().flags.overseas };
  O.GATE_LABEL = { overseas: '海外のレースに1度出たあと' };
  O.POINT_TEXT = 'OP 1点・G3 2点・G2 3点・G1 4点。合わせて4点で出会い';

  O.on = () => !!(J && J.isMode && J.isMode());
  // stage：段階（0 OP〜4 お手馬・5 やり終えた）。pts：出会いの前は出会いの点、出会いのあとは友好度。known：縁がある。job：いまのミッションの予定
  const blank = () => ({ pts: 0, stage: 0, prog: 0, met: false, known: false, rides: 0, wins: 0, big: 0, dec: 0, streak: 0, fees: 0, got: {}, years: {}, cleared: [], job: null, fails: 0 });
  O.init = function () {
    const st = {}; for (const o of ALL()) st[o.id] = blank();
    return { v: 3, st, log: [], queue: [], react: [], awards: {}, wear: {}, flags: {}, ask: null };
  };
  // 前の形（好感度 0〜800・段階 顔見知り／信頼／主戦／相棒）を、段階に移す
  O.migrateSt = function (st) {
    const t = st.tier || 0, p = st.pts || 0;
    const lo = [0, 100, 260, 520][t] || 0, hi = [100, 260, 520, 800][t] || 800;
    const stage = t >= 3 ? 4 : t === 2 ? 3 : t === 1 ? (p >= 180 ? 2 : 1) : 0;
    st.stage = stage; st.prog = 0;
    st.pts = st.known ? O.STAGES[stage].floor + U.clamp(Math.floor((p - lo) / (hi - lo) * 10), 0, 10) : 0;
    delete st.tier;
    return st;
  };
  // 古いセーブ・足りない項目を埋める（ミッションの予定は、読み込んだあと O.planMissing で）
  O.fill = function (s, g) {
    s = s || O.init();
    s.st = s.st || {};
    const old = !s.v;
    for (const o of ALL()) {
      const st = s.st[o.id];
      // 縁の項目が無い前のセーブ：依頼を受けた・断った・乗った・好感度がある人は、縁がある扱い
      if (st && st.known === undefined) st.known = !!(st.met || st.rides || st.pts || st.tier);
      if (st && st.stage === undefined) O.migrateSt(st);
      s.st[o.id] = Object.assign(blank(), st || {});
    }
    for (const k of ['log', 'queue', 'react']) s[k] = s[k] || [];
    // 前の形の場面（間柄が上がった・引退した馬など）は、新しい形には無いので捨てる
    if (old) { s.queue = []; s.react = []; }
    // 前の版（v2 まで）の「毎週の依頼」：受けていた騎乗を外し、依頼の形を捨てる（ミッションの予定は O.planMissing が作る）
    if (s.week) {
      if (g && g.rides && s.week.acc) for (const [rk, a] of Object.entries(s.week.acc)) if (g.rides[rk] === a.horseId) delete g.rides[rk];
      delete s.week;
    }
    // 前の版の課題の途中の回数（count）は、ミッションの形には無い
    if ((s.v || 0) < 3) for (const o of ALL()) s.st[o.id].prog = 0;
    s.awards = s.awards || {}; s.wear = s.wear || {}; s.flags = s.flags || {};
    if (s.ask === undefined) s.ask = null;
    // 海外の印：前のセーブで、自分が海外の重賞を勝っていれば出たことにする
    if (!s.flags.overseas && g && g.records && g.records.player && (g.records.player.g1 || []).some(x => x.region === '海外')) s.flags.overseas = { y: g.year };
    s.v = 3;
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

  // ---------- ミッションのレース ----------
  // 番組のレース（data/races.js などの重賞。年代なしの年で有効なもの）と、依頼に使う名前のあるオープン（data/owner_races.js）
  let rIdx = null;
  O.raceData = function (name) {
    const ey = U.ERA || 2025;
    if (!rIdx || rIdx.ey !== ey || rIdx.src !== HS.DATA.races) {
      const m = new Map();
      for (const r of HS.DATA.ownerRaces || []) m.set(r.name, r);
      for (const r of HS.DATA.races || []) if (r.from <= ey && ey <= (r.to || 9999)) { if (!m.has(r.name)) m.set(r.name, r); if (r.short && !m.has(r.short)) m.set(r.short, r); }
      rIdx = { ey, src: HS.DATA.races, m };
    }
    return rIdx.m.get(name) || null;
  };
  O.raceLabel = name => { const d = O.raceData(name); return d ? R.label(d) : name; };
  // 名前のあるオープンを、年代なしのゲームの週に足す（R.ofWeek を包む。鍵は重賞と同じ 年-月-週-レース名）
  O.openRaces = function (year, month, week) {
    if (!U.ERA) return [];
    return (HS.DATA.ownerRaces || []).filter(r => r.month === month && r.week === week).map(r => Object.assign({}, r, {
      key: `${year}-${month}-${week}-${r.name}`, short: null, grade: null, graded: false, year,
      prize: Math.round(R.CLS_PRIZE[r.listed ? 'L' : 'OP'] * U.priceIndex(year) / 10) * 10,
    }));
  };
  // ミッションの馬の名前 → オーナー（依頼の馬は、その人の馬）
  let mh = null;
  O.missionOwner = function (name) {
    if (!mh || mh.src !== ALL()) { mh = { src: ALL(), m: new Map() }; for (const o of LIST()) for (const m of (o.missions || []).slice(0, O.JOBS)) if (m.horse) mh.m.set(m.horse, o.id); }
    return mh.m.get(name) || null;
  };
  // まだやり終えていないミッションの依頼の馬（デビューと馬の店に出さない）
  O.reserved = function () {
    const g = G(); const s = g && g.owners;
    const sig = LIST().map(o => (s && s.st[o.id] ? s.st[o.id].stage : 0)).join(',');
    if (O._res && O._res.sig === sig && O._res.src === ALL()) return O._res.set;
    const set = new Set();
    for (const o of LIST()) { const k0 = s && s.st[o.id] ? s.st[o.id].stage : 0; (o.missions || []).slice(0, O.JOBS).forEach((m, k) => { if (k >= k0 && m.horse) set.add(m.horse); }); }
    O._res = { sig, src: ALL(), set };
    return set;
  };
  O.jobKey = j => `${j.y}-${j.m}-${j.w}-${j.race}`;
  O.jobIdx = j => H.weekIndex(j.y, j.m, j.w);
  O.jobDate = j => `${W.yLabel ? W.yLabel(j.y) : j.y + '年'}${j.m}月${j.w}週`;
  // その馬が、そのミッションのレースに出られるか（年齢・性・引退の年）
  O.canRun = function (h, j) {
    const d = O.raceData(j.race); if (!d || !h) return false;
    const age = j.y - h.born;
    if (d.age === '2' && age !== 2) return false;
    if (d.age === '3' && age !== 3) return false;
    if (d.age === '3+' && age < 3) return false;
    if (d.age === '4+' && age < 4) return false;
    if (age < 2 || age >= 9) return false;
    if (d.sex === '牝' && h.sex !== '牝') return false;
    if (h.retireYear && h.retireYear < j.y) return false;
    return true;
  };
  // 次のミッションの予定を立てる。after（{y,m,w}）より後のいちばん近いレースの週（無ければいまの週より後）。依頼はその O.LEAD 週前に来る
  O.plan = function (oid, after) {
    const st = O.of(oid), o = O.by(oid), prev = st.job;
    st.job = null;
    if (!o || !O.active(oid) || !st.known || st.stage >= O.JOBS) return null;
    const m = o.missions[st.stage], d = m && O.raceData(m.race);
    if (!d) return null;
    const g = G();
    const base = after || { y: g.year, m: g.month, w: Math.min(g.week, 4) };
    const bi = H.weekIndex(base.y, base.m, base.w);
    let y = base.y;
    if (H.weekIndex(y, d.month, d.week) <= bi) y++;
    st.job = { k: st.stage, horse: m.horse, race: d.name, y, m: d.month, w: d.week, at: H.weekIndex(y, d.month, d.week) - O.LEAD, on: false, hid: null, tries: prev && prev.k === st.stage ? (prev.tries || 0) + 1 : 0 };
    return st.job;
  };
  // 縁のある人で、予定の無い人に予定を立てる（読み込んだとき）
  O.planMissing = function () {
    for (const o of LIST()) { const st = O.of(o.id); if (st.known && st.stage < O.JOBS && (!st.job || st.job.k !== st.stage)) O.plan(o.id); }
  };
  // 依頼の馬を世界に出す（その年齢で、オーナーの馬として。年代なしの世界の生年のずらし方は E.spawn と同じ）
  O.spawn = function (name, age, raceY) {
    const g = G(), E = HS.Eraless;
    const d = W.histByName.get(name); if (!d || !E) return null;
    const off = (raceY - age) - d.born;
    const h = H.fromHistoric(E.shift(d, off), W.newId());
    if (W.foreignTrained.has(d.name) || HS.DATA.isForeign(d)) { h.foreignTrained = true; h.country = d.country || '外'; }
    h.loc = 'stable';
    g.bornHist = (g.bornHist || []).filter(n => n !== d.name).concat([d.name]);
    g.lineup[d.name] = off;
    g.horses[h.id] = h;
    W.dirty();
    return h;
  };
  // 依頼が来る：依頼の馬を用意して、場面を積む
  O.issue = function (oid) {
    const g = G(), s = O.state(), o = O.by(oid), st = O.of(oid), j = st.job;
    if (!o || !j || j.on) return false;
    const m = o.missions[j.k];
    let h = W.all().find(x => x.name === j.horse && (x.loc === 'stable' || x.loc === 'farm'));
    if (h && h.owner !== 'P' && !O.canRun(h, j)) { W.unenter(h.id); delete g.horses[h.id]; W.dirty(); h = null; }   // 年齢などで出られない：いったん世界から外す
    if (h && h.owner === 'P' && !O.canRun(h, j)) { O.plan(oid, j); return false; }   // 自分の馬（前のセーブ）が出られない年：次の年に
    if (!h) h = O.spawn(j.horse, m.age, j.y);
    if (!h) { O.plan(oid, j); return false; }
    if (h.owner !== 'P') { h.loc = 'stable'; h.restUntil = 0; }
    h.rights = Object.assign({}, h.rights, { [j.race]: j.y });   // 出走の権利（G1 の賞金の条件と、フルゲートの優先。js/core/races.js）
    j.on = true; j.hid = h.id;
    const label = O.raceLabel(j.race);
    W.news(`${o.name}さんから騎乗依頼：${O.jobDate(j)}の${label}に${h.name}で。`, 'good');
    s.queue.push({ oid, kind: 'job', k: j.k, horse: h.name, race: label, date: O.jobDate(j), retry: j.tries > 0, y: g.year });
    return true;
  };
  // 週の頭：予定の週になった依頼を出す。レースの週を過ぎた依頼は次の年へ
  O.tick = function () {
    const now = W.wIdx();
    for (const o of LIST()) {
      const st = O.of(o.id), j = st.job;
      if (!j || !st.known || st.stage >= O.JOBS) continue;
      if (O.jobIdx(j) < now) { O.plan(o.id, j); continue; }
      if (!j.on && now >= j.at) O.issue(o.id);
    }
  };
  // いま来ている依頼（UI とテスト用）。now：今週がレースの週
  O.offers = function () {
    if (!O.on()) return [];
    const g = G(), now = W.wIdx();
    const out = [];
    for (const o of LIST()) {
      const st = O.of(o.id), j = st.job;
      if (!j || !j.on || st.stage >= O.JOBS) continue;
      const key = O.jobKey(j);
      out.push({ oid: o.id, k: j.k, raceKey: key, horseId: j.hid, horse: j.horse, race: j.race, y: j.y, m: j.m, w: j.w, inWeeks: O.jobIdx(j) - now, now: j.y === g.year && j.m === g.month && j.w === g.week, line: U.hash(`${key}:${j.horse}`) % 997, retry: j.tries > 0 });
    }
    return out.sort((a, b) => a.inWeeks - b.inWeeks || (a.oid < b.oid ? -1 : 1));
  };
  O.offerOf = raceKey => O.offers().find(o => o.raceKey === raceKey) || null;
  // 今週のレースの依頼（その人の）
  O.jobNow = function (oid) {
    const g = G(), j = O.of(oid).job;
    return j && j.on && j.y === g.year && j.m === g.month && j.w === g.week ? j : null;
  };
  // このレースの依頼で乗っているか（パドックのひと言など）
  O.accepted = raceKey => { const g = G(); return LIST().some(o => { const j = O.jobNow(o.id); return j && O.jobKey(j) === raceKey && (g.rides || {})[raceKey] === j.hid; }); };
  O.jobOfRace = function (raceKey) { for (const o of LIST()) { const j = O.jobNow(o.id); if (j && O.jobKey(j) === raceKey) return { oid: o.id, j }; } return null; };
  // 同じレースに出す予定だった自分の馬（依頼のために取り消した馬）
  O.clash = function (ofr) { const j = O.of(ofr.oid).job; return j && j.scr && j.scr.length ? (W.horse(j.scr[0].id) || null) : null; };
  // 自分の馬の出走を取り消す（依頼が先）。取り消した馬は j.scr に覚えて、見送ったら戻す
  const scratch = function (j, h, key, label) {
    const g = G();
    const e = (g.entries[key] || []).find(e => e.horseId === h.id);
    if (e) { g.entries[key] = g.entries[key].filter(x => x.horseId !== h.id); if (!g.entries[key].length) delete g.entries[key]; (j.scr = j.scr || []).push({ id: h.id, jockey: e.jockey }); }
    else if (h.auto) { h.skipW = W.wIdx(); (j.scr = j.scr || []).push({ id: h.id, auto: true }); }
    else return;
    W.news(`${h.name}は${label}で依頼の馬と重なったので、今週の出走を取り消した。`, 'warn');
  };
  // レースの週：依頼の馬に自分が乗る（W.cards を包む）
  O.applyRide = function () {
    if (!O.on()) return;
    const g = G();
    for (const o of LIST()) {
      const j = O.jobNow(o.id); if (!j) continue;
      const key = O.jobKey(j);
      const card = W.prepareWeek().cards.find(c => c.race.key === key);
      if (!card || !card.runners.some(x => x.horse.id === j.hid)) continue;
      for (const x of card.runners) if (x.mine && x.horse.id !== j.hid) scratch(j, x.horse, key, R.label(card.race));
      if ((g.rides || {})[key] !== j.hid) g.rides = Object.assign({}, g.rides, { [key]: j.hid });
    }
  };
  // 受ける（前の形の名残。依頼は来た時点で受けている。レースの週なら騎乗を当て直す）
  O.accept = function (raceKey) {
    const x = O.jobOfRace(raceKey);
    if (!x) return O.offerOf(raceKey) ? null : '依頼が見つからない';
    O.applyRide(); W.dirty();
    return null;
  };
  // 見送る（自分の馬に乗るときも）：次の年の同じレースでもう一度。取り消した自分の馬は戻す
  O.decline = function (oid) {
    if (!O.by(oid)) { const x = O.offerOf(oid); if (!x) return '依頼が見つからない'; oid = x.oid; }   // レースの鍵でも呼べる（前の形）
    const g = G(), s = O.state(), st = O.of(oid), j = st.job;
    if (!j || !j.on) return '依頼が見つからない';
    const key = O.jobKey(j);
    for (const x of j.scr || []) {
      const h = W.horse(x.id); if (!h) continue;
      if (x.auto) delete h.skipW; else { g.entries[key] = g.entries[key] || []; if (!g.entries[key].some(e => e.horseId === x.id)) g.entries[key].push({ horseId: x.id, jockey: x.jockey }); }
    }
    if ((g.rides || {})[key] === j.hid) J.cancel(key);
    st.met = true; st.dec++;
    s.log.unshift({ y: g.year, m: g.month, w: g.week, oid, race: O.raceLabel(j.race), horse: j.horse, pos: 0, d: 0 });
    if (s.log.length > 150) s.log.length = 150;
    O.plan(oid, j);
    W.dirty();
    return null;
  };

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
  const early = h => h.growth === '超早熟' || h.growth === '早熟' || h.growth === '早め';
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
  // そのレースとその馬が、ジャンルに合うか（出会いの点が入る勝ちの判定。レースのあとの馬で見る）
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
  // 縁ができる：最初のミッションの予定を立てる。出会いの場面（kind 'meet'）を積む
  O.meet = function (oid, ctx) {
    const o = O.by(oid), st = O.of(oid);
    if (!o || st.known) return false;
    const g = G(), s = O.state();
    ctx = ctx || st.lastWin || {};
    st.known = true; st.knownAt = { y: g.year, m: g.month, w: g.week };
    st.pts = Math.max(st.pts, O.STAGES[0].floor);
    O.plan(oid);
    W.news(`${o.name}さん（${O.signLabel(o)}）から声がかかった。これから騎乗依頼が来る。`, 'good');
    s.queue.push({ oid, kind: 'meet', horse: ctx.horse || '', race: ctx.race || '', reward: '', y: g.year });
    return true;
  };
  // 出会いの点がたまって、印のそろった人と出会う
  O.meetCheck = function () {
    for (const o of LIST()) { const st = O.of(o.id); if (!st.known && st.pts >= O.MEET && O.gateOk(o)) O.meet(o.id); }
  };
  // まだ会っていない人の、条件のヒント（ぼかした一言）
  O.hint = oid => { const o = O.by(oid); return (o && o.unlock && o.unlock.hint) || ''; };

  // ---------- オーナーの馬 ----------
  // 馬の名前と種から決まる（セーブに持たない）。依頼の馬はその人の馬。自分の馬・スペシャルホースはだれの馬でもない
  let own = null;
  O.ownerOf = function (h) {
    if (!h || h.owner === 'P' || h.legend || !LIST().length) return null;
    const g = G(); if (!g) return null;
    const mo = h.name ? O.missionOwner(h.name) : null;
    if (mo) return mo;
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
  // その人の、いま走っている馬（強い順）
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

  // ---------- 友好度 ----------
  // 上限：まだ会っていない人は G3 の下限の手前まで、会った人は次の段階の下限の手前まで（ミッションをやらずに段階は上がらない）
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
  // 依頼の馬に乗った結果（騎乗料・成績・ひと言。友好度も少し上がる）
  O.onRide = function (oid, race, me, pop) {
    const g = G(), s = O.state(), o = O.by(oid), st = O.of(oid);
    if (!o) return;
    const cls = O.classOf(race), pos = me.pos;
    st.streak = pos <= 3 ? 0 : st.streak + 1;
    let d = pos === 1 ? 0 : pos === 2 ? 1.5 : pos === 3 ? 1 : pos <= 5 ? 0.5 : 0;   // 勝ちはミッションのクリアで上がる。負けても下がらない
    if (pop && pop - pos >= 3) d += 0.5;                          // 人気より上に来た
    const fee = yen(O.FEE[cls]);
    g.player.money += fee; st.fees += fee;
    st.rides++; if (pos === 1) { st.wins++; if (cls >= 3) st.big++; }
    const yr = st.years[g.year] = st.years[g.year] || { rides: 0, wins: 0 };
    yr.rides++; if (pos === 1) yr.wins++;
    st.met = true;
    if (d) O.addPts(oid, d);
    const kind = pos === 1 ? (cls >= 3 ? 'bigwin' : 'win') : (pos <= 3 || (pop && pop - pos >= 3)) ? 'good' : 'lose';
    const label = R.label(race);
    s.react.push({ oid, kind, race: label, horse: me.horse.name, pos, d, fee, line: U.hash(`${label}:${me.horse.name}:${g.year}`) % 997, tags: [...O.tagsOf(race, me.horse)] });
    s.log.unshift({ y: g.year, m: race.month, w: race.week, oid, race: label, horse: me.horse.name, pos, d });
    if (s.log.length > 150) s.log.length = 150;
    if (pos === 1 && cls >= 3) W.news(`${o.name}さんの${me.horse.name}で${label}を勝った。`, 'g1');
  };

  // ---------- ミッション ----------
  // OP〜G1 の段階：依頼の馬とレースが決まっている。文は馬とレースから作る
  O.missionText = function (o, k) {
    const m = O.missionOf(o, k); if (!m) return '';
    if (k >= O.JOBS || !m.horse) return m.text || '';
    return `依頼の馬${m.horse}で、${O.raceLabel(m.race)}を勝つ`;
  };
  const nameIn = (names, race) => names.includes(race.name) || (race.short != null && names.includes(race.short));
  const won = (h, name, y) => (h.gradedWins || []).some(w => (y == null || w.y === y) && (w.race === name || w.short === name));
  O.wonAll = (h, names, y) => names.every(n => won(h, n, y));
  // いまの連勝（成績の新しいほうから数える）
  O.streakOf = function (h) { const rs = h.results || []; let n = 0; for (let i = rs.length - 1; i >= 0 && rs[i].pos === 1; i--) n++; return n; };
  // お手馬の段階のミッションの判定。me：着順の結果（レースのあとの馬）
  O.needOk = function (n, race, me) {
    const h = me.horse;
    const by = n.by || 'own';
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
  // ミッションをやり終えた：お礼・友好度・場面・次の段階（次のミッションの予定。最後ならアイテム）
  O.advance = function (oid, ctx) {
    const g = G(), s = O.state(), o = O.by(oid), st = O.of(oid);
    if (!o || st.stage >= O.DONE) return false;
    ctx = ctx || {};
    const k = st.stage;
    const m = yen(O.STAGES[k].money);
    g.player.money += m;
    st.stage = k + 1; st.prog = 0; st.job = null;
    st.pts = Math.max(st.pts, st.stage >= O.DONE ? O.MAX : O.STAGES[st.stage].floor);
    st.cleared = (st.cleared || []).concat([{ y: g.year, m: g.month, w: g.week, horse: ctx.horse || '', race: ctx.race || '' }]);
    let reward = `お礼 ${U.money(m)}`;
    if (st.stage === O.WEAR_STAGE && !st.got.t2) { st.got.t2 = { y: g.year }; reward += `・${o.name}さんの勝負服を自分の馬に着せられる`; }
    if (st.stage >= O.DONE) { st.got.item = { y: g.year }; reward += `・${o.item.name}（${o.item.text}）`; }
    W.news(st.stage >= O.DONE ? `${o.name}さんの依頼をすべてやり終えた。${o.item.name}を受け取った（${o.item.text}）。` : `${o.name}さんの「${O.STAGES[k].label}」の依頼をやり終えた。次は「${O.STAGES[st.stage].label}」の依頼。${reward}。`, 'g1');
    s.queue.push({ oid, kind: 'm' + st.stage, horse: ctx.horse || '', race: ctx.race || '', reward, y: g.year });
    if (st.stage < O.JOBS) O.plan(oid);
    return true;
  };
  // 自分が乗ったレースの結果（週の終わりに、レースのあとの馬で見る）：ジャンルの勝ちで出会いの点（会ったあとは友好度）、お手馬の段階のミッション、海外の印
  O.onResult = function (race, me) {
    const s = O.state();
    const h = me.horse, label = R.label(race);
    if (race.region === '海外' && !s.flags.overseas) s.flags.overseas = { y: yearOf(race), race: label };
    const cls = O.classOf(race);
    for (const o of LIST()) {
      const st = O.of(o.id);
      if (st.stage >= O.DONE) continue;
      const gain = me.pos === 1 ? O.GAIN[cls] || 0 : 0;
      if (gain && O.signFits(o, race, h)) {
        O.addPts(o.id, gain);
        if (!st.known) st.lastWin = { horse: h.name, race: label };
      }
      if (!st.known || st.stage < O.JOBS) continue;
      const m = O.missionOf(o, st.stage);
      if (m && m.need && O.needOk(m.need, race, me)) O.advance(o.id, { horse: h.name, race: label });
    }
  };
  // ミッションのレースの結果：依頼の馬で勝てばクリア。負け・見送り・走れなかったときは次の年の同じレースでもう一度
  O.jobResult = function (rep) {
    for (const o of LIST()) {
      const st = O.of(o.id), j = st.job;
      if (!j || !j.on || st.stage >= O.JOBS || j.y !== rep.y || j.m !== rep.m || j.w !== rep.w) continue;
      const key = O.jobKey(j);
      const r = (rep.races || []).find(x => x.race.key === key);
      const me = r && r.sim && r.sim.results.find(x => x.rider === 'P');
      if (me && me.horse && me.horse.id === j.hid && me.pos === 1) { O.advance(o.id, { horse: me.horse.name, race: R.label(r.race) }); continue; }
      st.fails = (st.fails || 0) + 1;
      W.news(`${o.name}さんの依頼（${O.raceLabel(j.race)}）は、次の年の同じレースでもう一度。`, 'info');
      O.plan(o.id, j);
    }
  };
  O.afterWeek = function (rep) {
    for (const r of (rep && rep.races) || []) {
      if (r.race.grade === 'GF' || !r.sim) continue;
      const me = r.sim.results.find(x => x.rider === 'P');
      if (me && me.horse) O.onResult(r.race, me);
    }
    if (rep) O.jobResult(rep);
    if (HS.GFHost && HS.GFHost.afterWeek) HS.GFHost.afterWeek(rep);   // GF の一族の人（GF を全制覇したときの花輪）
    O.meetCheck();
    O.tick();
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
    if (T && !T.canBuy()) { got.pending = true; return `思い出の名馬${o.memory}（お手馬に空きができたら、オーナーの画面で受け取れる）`; }
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
  // 前の版で「引退した馬を譲ってもらう」約束をした人の馬を1頭、年明けに牧場へ（W.newYear の前に。乗って勝った馬を優先）
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
  // 年末：その年にいちばん勝ったオーナーと「名コンビ賞」
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
  // 勝負服：自分の馬に、G1 の段階になったオーナーの勝負服を着せる（null で自分の服に戻す）
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
  // 依頼が来たときのひと言：はじめはミッションの say、やり直しは offer の台詞
  O.jobLine = function (oid, q) {
    const o = O.by(oid); if (!o) return '';
    const m = O.missionOf(o, q.k);
    const vars = { horse: q.horse || '', race: q.race || '' };
    if (!q.retry && m && m.say) return O.fill_(m.say, vars);
    const d = O.raceData(m ? m.race : '');
    return O.line(oid, 'offer', U.hash(`${q.race}:${q.horse}:${q.y}`) % 997, vars, { race: d, horse: W.histByName.get(q.horse) });
  };

  // ---------- 週の流れにつなぐ（共有のファイルは書き換えず、包む） ----------
  const newGame0 = W.newGame;
  W.newGame = function (opts) { const g = newGame0.apply(this, arguments); if (g && g.mode === 'jockey') g.owners = O.init(); return g; };
  const migrate0 = W.migrate;
  W.migrate = function (g) { migrate0.apply(this, arguments); if (g.mode === 'jockey') g.owners = O.fill(g.owners, g); };
  const load0 = W.load;
  W.load = function () { const r = load0.apply(this, arguments); if (O.on()) O.planMissing(); return r; };
  // レースの週の騎乗（依頼が先）。出走表を作る前に当てる
  const cards0 = W.cards;
  W.cards = function () { if (O.on()) O.applyRide(); return cards0.apply(this, arguments); };
  // 依頼の馬は、ミッションのレースの週にそのレースへ出る（年代なしの世界の AI の出走の判断を包む）
  const aiChoose0 = W.aiChoose;
  W.aiChoose = function (h, races) {
    if (h && h.owner !== 'P' && O.on() && h.loc === 'stable') {
      for (const o of LIST()) { const j = O.jobNow(o.id); if (j && j.hid === h.id) { const rc = races.find(r => r.key === O.jobKey(j)); if (rc) return rc; } }
    }
    return aiChoose0.apply(this, arguments);
  };
  const finish0 = W.finishWeek;
  W.finishWeek = function () {
    if (O.on()) { O.state().react = []; O.applyRide(); }
    const rep = finish0.apply(this, arguments);
    if (O.on() && rep) O.afterWeek(rep);   // 自分が乗ったレースの結果（ジャンルの勝ち・ミッション・出会い・次の依頼）
    return rep;
  };
  const newYear0 = W.newYear;
  W.newYear = function () { if (O.on()) O.retireGifts(); return newYear0.apply(this, arguments); };
  // 名前のあるオープン（ミッションのレース）を番組に足す
  const ofWeek0 = R.ofWeek;
  R.ofWeek = function (seed, year, month, week) { return ofWeek0.apply(this, arguments).concat(O.openRaces(year, month, week)); };
  const E = HS.Eraless;
  if (E && E.restock) { const restock0 = E.restock; E.restock = function () { const names = restock0.apply(this, arguments); if (O.on()) O.shopBias(names); return names; }; }
  // まだやり終えていないミッションの依頼の馬は、デビューと馬の店に出さない（騎手のゲーム。始めたときの世代を作る前から）
  if (E && E.pool) {
    const pool0 = E.pool;
    let pc = null;
    E.pool = function () {
      const p = pool0.apply(this, arguments), g = G();
      if (!g || g.mode !== 'jockey' || !g.eraless) return p;
      const res = O.reserved();
      if (pc && pc.p === p && pc.res === res) return pc.list;
      pc = { p, res, list: p.filter(d => !res.has(d.name)) };
      return pc.list;
    };
  }
  if (J) {
    const record0 = J.record;
    J.record = function (race, sim, runners) {
      record0.apply(this, arguments);
      if (!O.on()) return;
      const x = O.jobOfRace(race.key); if (!x) return;
      const me = sim.results.find(r => r.rider === 'P');
      if (!me || me.horse.id !== x.j.hid) return;
      const ex = runners.find(r => r.rider === 'P');
      O.onRide(x.oid, race, me, ex && ex.pop);
    };
    const yearEnd0 = J.yearEnd;
    J.yearEnd = function (year) { yearEnd0.apply(this, arguments); if (O.on()) O.yearAward(year); };
  }
})();
