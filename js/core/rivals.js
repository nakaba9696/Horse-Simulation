// ライバル騎手（配り役の提案 2026-10-16。持ち主の声「他におもしろくなりそうな要素があればおねがい」）
// 顔のある騎手（data/rivals.js。架空）が、毎年強い史実馬（相棒の馬）に乗って同じレースに出てくる。
//   ・相棒の馬：毎月はじめに、空いた枠（1人3頭まで）を世界の強い史実馬から埋める。引退するまで乗り続ける（主戦騎手から乗り替わる）
//   ・ほかのレースにも、格に合わせた割合で強い馬に乗って出てくる（自分の馬が出るレースほど多い）
//   ・乗り方の型（Rv.TYPES）で動く：ペースを作る・後ろで脚をためて大外から・流れを読んで強い相手（あなた）の外につける・同期の新人
//   ・あなたとの対戦成績（先着の数。重賞・G1 は別にも）を残し、G1 で破る・年間で勝ち越すと、ニュースと評判（と馬主の好感度）
// 模擬（racesim.js）からは、0.1秒ごとに Rv.tactics(sim, order) を1か所で聞くだけ。模擬は決定的のまま（乱数を使わない）。
// 出走表の割り当ては U.hashRng（レースとライバルから決まる）だけで、世界の乱数は使わない。セーブは G.rivals（W.migrate で既定値）。
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World, R = HS.Races, J = HS.Jockey;
  const Rv = HS.Rivals = {};
  const G = () => W.get();
  const LIST = () => (HS.DATA && HS.DATA.rivals) || [];
  Rv.list = LIST;
  Rv.by = id => LIST().find(o => o.id === id) || null;

  // ---------- 数（仮の値。遊んで直す） ----------
  Rv.PARTNERS = 3;      // 1人が乗り続ける相棒の馬の数（年齢は別々）
  // 相棒のほかに出てくる割合（レースの格ごと）。mine＝自分の馬が出るレースで足す分
  Rv.SPOT = { G1: 0.7, G2: 0.45, G3: 0.4, open: 0.2, cond: 0.08, mine: 0.25, max: 0.9 };
  Rv.ROOKIE_CAP = { base: 56, grow: 4 }; // 同期の新人が選べる相棒の強さ（完成の総合力）の上限：1年目56、1年ごとに +4
  Rv.REWARD = { g1Rep: 1.5, g1Owner: 5, yearRep: 2, yearMin: 3 }; // G1 で破った評判・馬主の好感度、年間の勝ち越しの評判と、それに要る対戦数
  // 乗り方の型（模擬の値。tools なしでも tests/extra_rivals.js が型ごとの違いを測る）
  Rv.TYPES = {
    // 天才肌の逃げ：前へ（隊列の差を詰める・出だしが速い）。早めに動いて押し切る。先頭でペースを作っている間は脚を残す
    pace: { gapAdj: -2.5, early: 1.008, spurt: 50, refund: 0.00012, refundMax: 0.025 },
    // 追込の鬼：後ろで脚をためて、仕掛けを我慢し、直線は大外から一気
    closer: { gap: 4, spurt: -30, kick: 1.12, wide: 3 },
    // ペースを読むベテラン：スローなら前へ早めに、ハイなら後ろで遅めに。強い相手（あなた。いなければ1番強い馬）の外にぴたりとつけ、相手が動いたら動く
    veteran: { slowFwd: 3, slowSpurt: 50, hiBack: 4, hiSpurt: -40, mark: 1.8, gain: 4, near: 6, cover: 2.4, tense: 0.06 },
    // 同期の新人：腕が低いうちは前に行きたがり、仕掛けが早い（腕が上がると消える）。直線であなたと並ぶと根性を出す
    rookie: { fwd: 3, spurt: 90, top: 84, span: 22, guts: 8, duel: 300 },
  };
  Rv.TYPE_LABEL = { pace: '逃げ・先行でペースを作る', closer: '後ろでためて直線一気', veteran: '流れを読み、強い相手をマークする', rookie: '同期。年ごとに腕を上げる' };

  Rv.on = () => !!(J && J.isMode && J.isMode() && G() && G().rivals);
  const blank = () => ({ meets: 0, ahead: 0, behind: 0, gMeets: 0, gAhead: 0, g1Meets: 0, g1Ahead: 0, streak: 0, last: null, years: {} });
  Rv.init = function (g) {
    const vs = {}; for (const rv of LIST()) vs[rv.id] = blank();
    return { start: g.year, ride: {}, refreshed: '', vs, log: [], titles: {}, big: {}, lines: {} };
  };
  // 古いセーブ・足りない項目を埋める（前の版のセーブは、読み込んだ年を同期の新人のデビューの年にする）
  Rv.fill = function (s, g) {
    s = s || Rv.init(g);
    if (s.start == null) s.start = g.year;
    s.ride = s.ride || {}; s.refreshed = s.refreshed || ''; s.vs = s.vs || {};
    for (const rv of LIST()) s.vs[rv.id] = Object.assign(blank(), s.vs[rv.id] || {});
    s.log = s.log || []; s.titles = s.titles || {}; s.big = s.big || {}; s.lines = s.lines || {};
    return s;
  };
  Rv.state = function () { const g = G(); if (!g.rivals) g.rivals = Rv.init(g); return g.rivals; };
  Rv.vs = id => { const s = Rv.state(); return s.vs[id] || (s.vs[id] = blank()); };
  Rv.yearN = () => G().year - Rv.state().start; // 0＝1年目
  // 腕前（騎手の腕前と同じ目盛り）。同期の新人は年ごとに上がる
  Rv.skillOf = (rv, n) => Math.min(rv.max, rv.skill + rv.grow * Math.max(0, n == null ? Rv.yearN() : n));
  Rv.jockeyOf = rv => ({ name: rv.name, region: rv.region, skill: Math.round(Rv.skillOf(rv)), rival: rv.id });
  Rv.ofRunner = x => { const id = x && x.jockey && x.jockey.rival; return id ? Rv.by(id) : null; };
  Rv.isBig = race => !!(race && (race.grade === 'G1' || race.invite || race.grade === 'GF'));

  // ---------- 相棒の馬 ----------
  const peak = h => { const T = HS.Season; if (!T || !h.pot) return 50; const p = T.fhPeak(h); return Math.max(p.turf, p.dirt); };
  const okHorse = h => !!(h && h.hist && !h.legend && !h.filler && h.owner !== 'P' && (h.loc === 'stable' || h.loc === 'farm') && !h.foreignTrained && !h.local);
  const distFit = (rv, h) => (h.distMin || 1600) <= rv.dist[1] && (h.distMax || 2000) >= rv.dist[0];
  Rv.fitScore = function (rv, h, pk) {
    let sc = pk + (rv.styles.includes(h.style) ? 4 : 0) + (distFit(rv, h) ? 3 : 0);
    if (rv.type === 'rookie') { const cap = Rv.ROOKIE_CAP.base + Rv.ROOKIE_CAP.grow * Rv.yearN(); if (pk > cap) sc -= (pk - cap) * 3; }
    return sc;
  };
  Rv.partners = id => { const g = G(), s = Rv.state(); return Object.entries(s.ride).filter(([, r]) => r === id).map(([hid]) => g.horses[hid]).filter(Boolean); };
  // 毎月はじめに、いなくなった相棒を外し、空いた枠を埋める（同じ月に2度は動かない）
  Rv.refresh = function (force) {
    const g = G(), s = Rv.state();
    const key = `${g.year}-${g.month}`;
    if (!force && s.refreshed === key) return false;
    s.refreshed = key;
    for (const [hid, id] of Object.entries(s.ride)) if (!okHorse(g.horses[hid]) || !Rv.by(id)) delete s.ride[hid];
    const taken = new Set(Object.keys(s.ride));
    const cands = W.all().filter(h => okHorse(h) && !taken.has(String(h.id)) && g.year - h.born >= 2 && g.year - h.born <= 6).map(h => ({ h, pk: peak(h) }))
      .sort((a, b) => b.pk - a.pk || (a.h.name < b.h.name ? -1 : 1));
    const order = U.hashRng(`rvdraft:${g.seed}:${g.year}`).shuffle(LIST().slice());
    for (let round = 0; round < Rv.PARTNERS; round++) {
      for (const rv of order) {
        const mine = Rv.partners(rv.id);
        if (mine.length >= Rv.PARTNERS) continue;
        const ages = new Set(mine.map(h => g.year - h.born));
        let best = null, bs = -1e9;
        for (const c of cands) {
          if (taken.has(String(c.h.id)) || ages.has(g.year - c.h.born)) continue;
          const sc = Rv.fitScore(rv, c.h, c.pk);
          if (sc > bs) { bs = sc; best = c; }
        }
        if (best) { s.ride[best.h.id] = rv.id; taken.add(String(best.h.id)); }
      }
    }
    return true;
  };

  // ---------- 出走表：相棒の馬と、ほかの騎乗 ----------
  const isMain = (x, year) => x.horse.hist && x.jockey && W.histJockey && x.jockey.name === W.histJockey(x.horse, year);
  const canRide = x => !x.mine && !x.rider && x.horse.owner !== 'P' && !x.horse.legend && !(x.jockey && (x.jockey.player || x.jockey.rival));
  Rv.spotP = function (race, hasMine) {
    const S = Rv.SPOT;
    const p = race.invite || race.grade === 'G1' ? S.G1 : race.grade === 'G2' ? S.G2 : race.graded ? S.G3 : /オープン|OP|リステッド/.test(race.name || '') ? S.open : S.cond;
    return Math.min(S.max, p + (hasMine ? S.mine : 0));
  };
  Rv.assign = function (card, wIdx) {
    const g = G(), s = Rv.state(), race = card.race;
    const used = new Set();
    for (const x of card.runners) {
      const id = s.ride[x.horse.id], rv = id && Rv.by(id);
      if (rv && !used.has(id) && !x.mine && !x.rider && x.horse.owner !== 'P') { x.jockey = Rv.jockeyOf(rv); used.add(id); }
    }
    if (race.region !== 'JRA' && !race.invite) return card; // 海外・地方は相棒の馬だけ
    const hasMine = card.runners.some(x => x.mine);
    for (const rv of LIST()) {
      if (used.has(rv.id)) continue;
      const rr = U.hashRng(`rv:${g.seed}:${g.year}:${race.key}:${rv.id}`);
      if (!rr.chance(Rv.spotP(race, hasMine))) continue;
      const cands = card.runners.filter(x => canRide(x) && !x.horse.foreignTrained && !x.horse.foreign && !x.horse.local && !isMain(x, g.year))
        .map(x => ({ x, pw: H.overall(H.cur(x.horse, wIdx)) })).sort((a, b) => b.pw - a.pw || a.x.num - b.x.num);
      const off = rv.type === 'rookie' ? Math.max(0, 3 - Rv.yearN()) : 0; // 新人のうちは強い馬が回ってこない
      const pool = cands.slice(Math.min(off, Math.max(0, cands.length - 1)), off + 5);
      if (!pool.length) continue;
      const pick = rr.weighted(pool, o => (6 - pool.indexOf(o)) + (rv.styles.includes(o.x.horse.style) ? 2 : 0) + (distFit(rv, o.x.horse) ? 1.5 : 0));
      pick.x.jockey = Rv.jockeyOf(rv); used.add(rv.id);
    }
    return card;
  };
  Rv.inCard = card => card ? card.runners.filter(x => Rv.ofRunner(x)).map(x => ({ rv: Rv.ofRunner(x), x })) : [];

  // ---------- 台詞 ----------
  // 場面：初対決 → 連敗中・連勝中 → G1 → 前の対戦の勝ち負け（条件戦はときどき、ふだんの一言）
  Rv.scene = function (id, race) {
    const v = Rv.vs(id);
    if (!v.meets) return 'first';
    if (v.streak <= -3) return 'streakL';
    if (v.streak >= 3) return 'streakW';
    if (Rv.isBig(race)) return 'g1';
    if (!race.graded && U.hash(`${race.key}:${id}`) % 3 === 0) return 'plain';
    return v.last === 'W' ? 'afterWin' : 'afterLoss';
  };
  Rv.fillText = (t, vars) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : '');
  Rv.line = function (id, scene, seed, vars) {
    const rv = Rv.by(id); if (!rv) return '';
    const set = rv.lines[scene] && rv.lines[scene].length ? rv.lines[scene] : rv.lines.plain;
    return Rv.fillText(set[Math.abs(seed | 0) % set.length], Object.assign({ me: J.me() ? J.me().name : 'あなた' }, vars || {}));
  };
  Rv.lineFor = function (id, race, horse) {
    const sc = Rv.scene(id, race);
    return { scene: sc, text: Rv.line(id, sc, U.hash(`${race.key}:${id}:${sc}`), { horse: horse ? horse.name : '', race: R.label(race) }) };
  };

  // ---------- 対戦成績とご褒美 ----------
  Rv.record = function (race, sim) {
    const g = G(), s = Rv.state(), y = g.year;
    const win = sim.results[0];
    // ライバルの大きな勝ち（年代記の代わりに、名鑑の欄に残す）
    const wid = win && win.jockey && win.jockey.rival;
    if (wid && race.graded) {
      const b = s.big[wid] = s.big[wid] || [];
      b.unshift({ y, race: race.short || race.name, grade: R.gradeBadge(race), horse: win.horse.name });
      if (b.length > 40) b.length = 40;
      if (Rv.isBig(race) && win.rider !== 'P') W.news(`${Rv.by(wid).name}が${win.horse.name}で${R.label(race)}を勝った。`, 'info');
    }
    const me = sim.results.find(x => x.rider === 'P');
    if (!me) return;
    const beaten = [];
    for (const res of sim.results) {
      const id = res.jockey && res.jockey.rival, rv = id && Rv.by(id);
      if (!rv) continue;
      const v = Rv.vs(id), ahead = me.pos < res.pos;
      v.meets++; if (ahead) v.ahead++; else v.behind++;
      if (race.graded || race.invite) { v.gMeets++; if (ahead) v.gAhead++; }
      if (Rv.isBig(race)) { v.g1Meets++; if (ahead) v.g1Ahead++; }
      v.streak = ahead ? Math.max(0, v.streak) + 1 : Math.min(0, v.streak) - 1;
      v.last = ahead ? 'W' : 'L';
      const yr = v.years[y] = v.years[y] || [0, 0];
      yr[ahead ? 0 : 1]++;
      s.log.unshift({ y, m: race.month, w: race.week, id, race: race.short || race.name, grade: R.gradeBadge(race) || '', horse: res.horse.name, mine: me.horse.name, me: me.pos, rv: res.pos });
      if (me.pos === 1 && Rv.isBig(race)) beaten.push(rv);
    }
    if (s.log.length > 150) s.log.length = 150;
    // G1 であなたが勝ち、ライバルも出ていた：評判と、依頼を受けた馬なら馬主の好感度
    if (beaten.length) {
      const j = J.me();
      j.rep = U.clamp(j.rep + Rv.REWARD.g1Rep * Math.min(2, beaten.length), 0, 100);
      const O = HS.Owners, a = O && O.on && O.on() && O.state().week && O.state().week.acc && O.state().week.acc[race.key];
      if (a && a.horseId === me.horse.id && O.by(a.oid)) O.addPts(a.oid, Rv.REWARD.g1Owner);
      W.news(`${R.label(race)}で${beaten.map(rv => rv.name).join('・')}を破った。評判が上がった。`, 'g1');
    }
  };
  // 年末：その年の対戦で勝ち越したライバルごとに、評判とニュース。いちばん多く当たったライバルのひと言
  Rv.yearEnd = function (year) {
    const s = Rv.state();
    const got = [];
    let most = null;
    for (const rv of LIST()) {
      const yr = Rv.vs(rv.id).years[year]; if (!yr) continue;
      const n = yr[0] + yr[1];
      if (!most || n > most.n) most = { rv, n };
      if (n >= Rv.REWARD.yearMin && yr[0] > yr[1]) got.push({ rv, a: yr[0], b: yr[1] });
    }
    if (got.length && !s.titles[year]) {
      s.titles[year] = got.map(x => x.rv.id);
      const j = J.me(); j.rep = U.clamp(j.rep + Rv.REWARD.yearRep * got.length, 0, 100);
      for (const x of got) W.news(`${W.yLabel(year)}、${x.rv.name}との対戦は${x.a}勝${x.b}敗。勝ち越した。`, 'good');
    }
    if (most && !s.lines[year]) {
      const text = Rv.line(most.rv.id, 'year', U.hash(`year:${year}:${most.rv.id}`));
      s.lines[year] = { id: most.rv.id, text };
      W.news(`${most.rv.name}「${text}」`, 'info');
    }
  };

  // ---------- レースの中の作戦（racesim.js の S.step から 0.1 秒ごとに呼ばれる） ----------
  // 動かすのは、模擬がもともと持っている値だけ：隊列の差（gap・gapAdj）・出だしの速さ（styleMult）・仕掛けの距離（spurtR）・
  // 終いの伸び（kickS）・進路の目標（driftLane）・脚の残り（E）・根性（guts）。あなたの進路（ctl.lane）は、外から蓋をされている間だけ外へ出られない
  const S = () => HS.Sim;
  function setup(sim) {
    const list = [];
    for (const s of sim.st) {
      const id = s.r.jockey && s.r.jockey.rival, rv = id && Rv.by(id);
      if (!rv || s.me) continue;
      const T = Rv.TYPES[rv.type] || {};
      const o = { s, rv, type: rv.type, T, skill: s.r.jockey.skill || rv.skill, refund: 0, lane: 0, guts0: s.guts, tg: null };
      if (rv.type === 'pace') { s.gapAdj += T.gapAdj; s.styleMult *= T.early; s.spurtR += T.spurt; }
      else if (rv.type === 'closer') { s.gap += T.gap; s.spurtR = Math.max(sim.straight * 0.5, s.spurtR + T.spurt); s.kickS *= T.kick; }
      else if (rv.type === 'veteran') {
        if (sim.paceF < S().PACE_LO) { s.gapAdj -= T.slowFwd; s.spurtR += T.slowSpurt; }
        else if (sim.paceF > S().PACE_HI) { s.gap += T.hiBack; s.spurtR += T.hiSpurt; }
        // マークする相手：あなた。いなければ、自分のほかでいちばん強い馬
        o.tg = sim.me >= 0 ? sim.st[sim.me] : sim.st.filter(x => x !== s).sort((a, b) => b.A - a.A)[0] || null;
      } else if (rv.type === 'rookie') {
        const m = U.clamp((T.top - o.skill) / T.span, 0, 1);
        s.gapAdj -= T.fwd * m; s.spurtR += T.spurt * m;
      }
      list.push(o);
    }
    return list.length ? { list } : null;
  }
  const setLane = (o, off) => { const s = o.s; s.driftLane = (s.driftLane || 0) - o.lane + off; o.lane = off; };
  Rv.tactics = function (sim, order) {
    let T0 = sim._riv;
    if (T0 === undefined) T0 = sim._riv = setup(sim);
    if (!T0) return;
    const { D, straight } = sim;
    const pack = order.find(x => !x.oonige) || order[0];
    const leaderX = pack ? pack.x : 0;
    for (const o of T0.list) {
      const s = o.s, T = o.T;
      if (s.done) { if (o.lane) setLane(o, 0); continue; }
      const R = D - s.x, prog = s.x / D;
      if (o.type === 'pace') {
        // 先頭でペースを作っている間は、脚を残す（マイペース）
        if (pack === s && !s.spurting && prog > 0.22 && prog < 0.75 && o.refund < T.refundMax) { s.E += T.refund; o.refund += T.refund; }
      } else if (o.type === 'closer') {
        setLane(o, R < straight && s.spurting ? T.wide : 0); // 直線は大外へ
      } else if (o.type === 'veteran') {
        const tg = o.tg;
        if (!tg || tg.done || s.spurting || prog < 0.12) { if (o.lane) setLane(o, 0); }
        else {
          // 相手のすぐ後ろ外に位置を取る
          // （隊列の差 gap を、目標との差の gain 倍だけ動かして寄せる。模擬は隊列の差に合わせて速さを少しずつ変える）
          s.gap = U.clamp(leaderX - s.x - T.gain * (tg.x - T.mark - s.x) - s.gapAdj, 0, 40);
          const close = Math.abs(s.x - tg.x) < T.near;
          setLane(o, close && R > straight ? Math.round(((tg.laneT != null ? tg.laneT : tg.lane) + 1) * 10) / 10 : 0);
          // 相手が仕掛けたら、すぐ動く
          if (tg.spurting && R < straight + 400) s.spurtR = Math.max(s.spurtR, R + 1);
          // 外から蓋：横に並んでいる間は、あなたは外へ出られず、馬も嫌がる
          const c = sim.ctl;
          if (c && tg.me && Math.abs(s.x - tg.x) < T.cover && s.lane - tg.lane > 0.5 && s.lane - tg.lane < 1.6 && !tg.spurting) {
            if (c.lane > tg.lane + 0.2) c.lane = Math.max(0, Math.floor(s.lane - 0.9));
            c.tension = U.clamp(c.tension + T.tense, 0, 100);
            c.covered = true;
          } else if (c && tg.me) c.covered = false;
        }
      } else if (o.type === 'rookie') {
        // 同期の意地：直線であなたと並ぶと根性を出す
        const me = sim.me >= 0 ? sim.st[sim.me] : null;
        s.guts = o.guts0 + (me && !me.done && R < T.duel && Math.abs(me.x - s.x) < 1.5 ? T.guts : 0);
      }
    }
  };

  // ---------- 週の流れにつなぐ（共有のファイルは書き換えず、包む） ----------
  const newGame0 = W.newGame;
  W.newGame = function () { const g = newGame0.apply(this, arguments); if (g && g.mode === 'jockey' && LIST().length) { g.rivals = Rv.init(g); Rv.refresh(true); } return g; };
  const migrate0 = W.migrate;
  W.migrate = function (g) { migrate0.apply(this, arguments); if (g.mode === 'jockey' && LIST().length) g.rivals = Rv.fill(g.rivals, g); };
  const build0 = W.buildField;
  W.buildField = function (race) { const card = build0.apply(this, arguments); if (card && !race.free && Rv.on()) Rv.assign(card, arguments[2]); return card; };
  if (J) {
    const weekStart0 = J.weekStart;
    J.weekStart = function () { weekStart0.apply(this, arguments); if (Rv.on()) Rv.refresh(); };
    const record0 = J.record;
    J.record = function (race, sim) { record0.apply(this, arguments); if (Rv.on()) Rv.record(race, sim); };
    const yearEnd0 = J.yearEnd;
    J.yearEnd = function (year) { yearEnd0.apply(this, arguments); if (Rv.on()) Rv.yearEnd(year); };
  }
})();
