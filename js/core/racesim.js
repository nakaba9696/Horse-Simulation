// レースの模擬。0.1秒刻みで全馬を動かし、着順・タイム・実況・描画用のコマ（frames）を出す
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse;
  const S = HS.Sim = {};

  const DT = 0.1, REC_EVERY = 2;          // 0.2秒ごとに記録
  const LEN = 2.4;                         // 1馬身（m）

  // 基準の巡航速度（m/s）。総合85の馬の良馬場・芝
  S.baseSpeed = function (dist, surface, ground, courseAdj) {
    let v = 27.32 - 1.378 * Math.log(dist);
    v *= 1 + Math.max(0, 1600 - dist) / 1600 * 0.04; // 短距離はもう少し速い
    if (surface === 'ダ') v *= 0.955;
    const g = { '良': 0, '稍重': 1, '重': 2, '不良': 3 }[ground] || 0;
    if (surface === '芝') v *= 1 - [0, 0.006, 0.015, 0.03][g];
    else v *= 1 + [0, 0.004, 0.007, 0.009][g];
    v *= 1 + (courseAdj || 0);
    // 出だしの加速を速くした分（約2秒）、走りの速さを少し落として走破タイムを保つ
    return dist / (dist / v + 2.4);
  };

  // 1頭の、このレースでの強さ（点）を計算する。内訳も返す（人気・説明に使う）
  S.power = function (horse, race, wIdx, ctx) {
    const c0 = H.cur(horse, wIdx);
    const dirt = race.surface === 'ダ';
    // この馬場でのスピード・スタミナを spd・sta として扱う
    const c = Object.assign({}, c0, H.onSurface(c0, race.surface));
    const w = dirt ? { spd: 0.42, sta: 0.20, guts: 0.15, mind: 0.11, slope: 0.12 } : { spd: 0.45, sta: 0.22, guts: 0.16, mind: 0.12, slope: 0.05 };
    let a = 0; for (const k of Object.keys(w)) a += c[k] * w[k];
    const D = race.dist;
    let distPen = 0;
    if (D < horse.distMin) distPen = (horse.distMin - D) / 100 * 1.4;
    if (D > horse.distMax) distPen = (D - horse.distMax) / 100 * 1.2;
    const surfPen = 0; // 芝・ダートの違いは能力（芝スピードなど）に入っている
    const gl = { '良': 0, '稍重': 1, '重': 2, '不良': 3 }[race.ground] || 0;
    const groundAdj = gl * ((horse.apt.heavy || 50) - 55) / 45 * 1.3;
    // 休み明け（12週以上あいた）は少し割り引く（鉄砲駆けの馬は別に足す）
    const layoff = horse.lastRaceW != null && wIdx != null && wIdx - horse.lastRaceW >= 12 ? 1.2 : 0;
    const condAdj = (horse.cond || 0) / 100 * 3 - (horse.fatigue || 0) * 0.05 - layoff;
    const jockAdj = ctx && ctx.jockey ? (ctx.jockey.skill - 75) * 0.06 : 0;
    const wtAdj = ctx && ctx.weight ? -(ctx.weight - 56) * 1.4 : 0;
    const skillAdj = S.skillAdj(horse, race, wIdx, ctx);
    const total = a - distPen - surfPen + groundAdj + condAdj + jockAdj + wtAdj + skillAdj;
    return { total, base: a, distPen, surfPen, groundAdj, condAdj, skillAdj, cur: c };
  };

  // 特殊能力のうち、レースの条件で強さが上下するもの
  S.skillAdj = function (horse, race, wIdx, ctx) {
    const sk = horse.skills;
    if (!sk || !sk.length) return 0;
    const course = HS.DATA.courses[race.course] || {};
    const geo = (race.surface === 'ダ' ? course.dirt : course.turf) || course.turf || course.dirt || {};
    const gap = horse.lastRaceW != null && wIdx != null ? wIdx - horse.lastRaceW : null;
    let a = 0;
    for (const id of sk) {
      if (id === 'big' && race.grade === 'G1') a += 2;
      else if (id === 'fresh' && gap != null && gap >= 10) a += 2;
      else if (id === 'tataki' && gap != null) a += gap >= 10 ? -2 : 1.2;
      else if (id === 'left' && course.dir === '左') a += 1.8;
      else if (id === 'right' && course.dir === '右') a += 1.8;
      else if (id === 'small' && geo.straight && geo.straight < 330) a += 1.8;
      else if (id === 'long' && geo.straight >= 450) a += 1.8;
      else if (id === 'summer' && race.month >= 6 && race.month <= 8) a += 1.8;
      else if (id === 'winter' && (race.month === 12 || race.month <= 2)) a += 1.8;
      else if (id === 'inner' && ctx && ctx.num && ctx.num <= 4) a += 1.2;
      else if (id === 'travel' && race.region === '海外') a += 2;
      else if (id === 'homebody' && race.region === '海外') a -= 3;
      else if (id === 'hipace' && ctx && ctx.paceF > S.PACE_HI) a += 1.8;
      else if (id === 'slowpace' && ctx && ctx.paceF && ctx.paceF < S.PACE_LO) a += 1.8;
    }
    return a;
  };

  // 斤量（簡略）。定量・馬齢：年齢と性で、別定・ハンデ：実績で上下
  S.weightFor = function (horse, race, year) {
    const age = year - horse.born;
    let w;
    if (age <= 2) w = 55;
    else if (race.age === '3') w = 57;
    else w = (race.month <= 9 && age === 3) ? 56 : 58;
    if (race.age === '3+' && age === 3 && race.month >= 10) w = 56;
    if (horse.sex === '牝' && race.sex !== '牝') w -= 2;
    if (race.weight === 'ハンデ') w = 53 + Math.round(((horse.earn || 0) / 3000)) - (horse.sex === '牝' ? 1 : 0);
    if (race.weight === '別定') w += Math.min(2, (horse.gradedWins || []).filter(g => g.grade === 'G1').length);
    return U.clamp(w, 48, 60);
  };

  // 脚の切れの効き方（s＝終いの伸び、r＝仕掛けの早さ、a＝加速、c＝スパートの消耗、z＝バテたあとの粘り）
  S.OONIGE = { early: 1.02, mid: 1.02, kick: 0.5, lead: 0.055 }; // 大逃げの速さ（道中）・終いの伸び・離す差（直線の長さに対して）
  S.DS = 0.68; // スタミナの持ちの全体の倍率
  // ペース（持ち主の指摘 2026-10-16）：スローなら前の馬が楽で、早めに動くのが得。ハイなら前の馬が脚を使い、後ろでためて遅めに動くのが得。
  // paceF が PACE_HI より上でハイ、PACE_LO より下でスロー。道中、隊列の前にいるほど（paceF-1）×PACE_K の割合でスタミナの減りが増える（スローなら減る）
  // 脚質ごとの居心地のよい位置（前から何割目か。0＝先頭、1＝最後方）。外れた分（割合）× MISFIT が、気分の上がる速さ（毎秒）に足される
  S.ZONE = { '逃げ': [0, 0.12], '先行': [0.05, 0.4], '差し': [0.3, 0.75], '追込': [0.6, 1] };
  S.MISFIT = 14; S.TENSE_COST = 0.5;
  // 気性の荒さ（mind が70より低いほど大きい。45で2倍）
  S.temperF = s => 1 + Math.max(0, 70 - s.mind) / 25;
  S.START_ACC = 7.5;
  S.LATE_E = 0.15; // 出遅れた馬は、位置を取り戻すのに脚を使う（スタミナの減り）
  S.PUSH = { base: 0.25 }; // 追い出したあと、しごかずに馬なりで行くときの伸び（段に置き換えた値）
  S.PACE_HI = 1.006; S.PACE_LO = 0.994; S.PACE_K = 70; S.DRAFT = 0.12; S.PACE_TOP = 50; S.PACE_EARLY = 60;
  S.paceVerdict = f => f > S.PACE_HI ? 'ハイペース' : f < S.PACE_LO ? 'スローペース' : '平均ペース';
  S.paceHint = v => v === 'ハイペース' ? '前は苦しい。後ろでためて遅めに' : v === 'スローペース' ? '前が楽。早めに動け' : '力どおりの流れ';
  S.KIRE = { s0: 0.03, s1: 0.0035, r: 60, a0: 0.85, a1: 0.05, c0: 0.95, c1: 0, cS: 0.035, z: 0.0015, top: 2.2 };

  // 本体。runners: [{horse, jockey, weight, num, frame, rider?}]。rider==='P' の馬はプレイヤーが乗る（opts.ride のとき操作を受け付ける）
  // S.create で始め、S.step で 0.1 秒ずつ進め、S.finish で結果を出す。S.run はそれを一度に行う
  S.run = function (race, runners, wIdx, rng, opts) {
    const sim = S.create(race, runners, wIdx, rng, opts);
    while (!S.step(sim)) { /* 進める */ }
    return S.finish(sim);
  };

  S.create = function (race, runners, wIdx, rng, opts) {
    opts = opts || {};
    const course = HS.DATA.courses[race.course] || HS.DATA.courses['東京'];
    const surfKey = race.surface === 'ダ' ? 'dirt' : 'turf';
    const geo = course[surfKey] || course.turf || course.dirt;
    const D = race.dist;
    const v0 = S.baseSpeed(D, race.surface, race.ground, geo.speed) * U.eraSpeed(race.year);
    const straight = Math.min(geo.straight, D * 0.6);
    const nNige = runners.filter(r => r.horse.style === '逃げ').length;
    const paceF = 1 + (nNige >= 3 ? 0.014 : nNige === 2 ? 0.009 : nNige === 0 ? -0.012 : 0) + rng.normal(0, 0.006);
    const st = runners.map((r, i) => {
      const h = r.horse;
      const pw = S.power(h, race, wIdx, Object.assign({ paceF }, r));
      const form = rng.normal(0, 1.9);
      const A = pw.total + form;
      const vc = v0 * (1 + 0.0012 * (A - 85));
      const sta = pw.cur.sta, guts = pw.cur.guts, mind = pw.cur.mind, slopeP = pw.cur.slope;
      const has = id => H.has(h, id);
      const Ds = Math.max(800, (h.distMax + 300 + (sta - 75) * 12) * S.DS);
      // 脚の切れ：切れる馬は終いの伸びが大きく、ズブい馬は早めに動いて長く脚を使う
      const kire = U.clamp(h.kire || 4, 1, 8);
      const K = S.KIRE;
      const kickS = K.s0 + K.s1 * (kire - 1) + 0.0006 * (pw.cur.spd - 80);
      const styleAdd = { '逃げ': 0, '先行': 60, '差し': 120, '追込': 170 }[h.style] || 80;
      const spurtR = U.clamp(straight + 120 + styleAdd + (4.5 - kire) * K.r + (has('longspurt') ? 80 : 0) + rng.normal(0, 60) * (1.3 - mind / 120), 300, Math.min(1300, D * 0.6));
      let delay = Math.abs(rng.normal(0, 0.12));
      const lateP = 0.02 + Math.max(0, 75 - mind) * 0.0008 + (has('deokure') ? 0.14 : 0);
      const late = rng.chance(lateP);
      if (late) delay += rng.float(0.5, 1.4);
      const kakari = rng.chance(Math.max(0, (72 - mind) / 100) * 0.3 + (has('kakari') ? 0.25 : 0));
      return {
        r, h, i, A, vc, Ds, kickS, spurtR, guts, mind, slopeP, x: 0, v: 0, E: late ? 1 - S.LATE_E : 1, delay, late, kakari,
        acc: K.a0 + K.a1 * kire, zubu: (8 - kire) * K.z + (has('longspurt') ? 0.003 : 0), spurtCost: K.c0 + K.c1 * (kire - 1) + K.cS * (kire - 4.5) * (330 - geo.straight) / 200, // 直線が長いほど切れる馬が、短いほどズブい馬が脚を効率よく使える
        oonige: has('oonige') && h.style === '逃げ', nino: has('nino'), narabu: has('narabu'), sora: has('sora'),
        me: false, fired: {}, boost: null, trig: [], sk: null, passive: [], passiveShown: false,
        lane: (r.num - 1) * 0.5, laneT: 0, spurting: false, done: false, finishT: null, t600: null, blocked: 0, blockedOnce: false,
        styleMult: ({ '逃げ': 1.03, '先行': 1.014, '差し': 0.995, '追込': 0.982 })[h.style] || 1,
        gap: ({ '逃げ': 0, '先行': 5, '差し': 14, '追込': 24 })[h.style] || 10,
      };
    });
    const medVc = st.map(s => s.vc).sort((a, b) => a - b)[Math.floor(st.length / 2)];
    const sim = {
      race, runners, wIdx, rng, opts, geo, D, straight, slope: geo.slope, paceF, pace: medVc * paceF, st,
      events: [], frames: [], t: 0, step: 0, finished: 0, winnerT: null, over: false,
      talk: { lastLeader: null, straight: false, mid: false, corner: false, f400: false, f200: false },
      track: HS.Track ? HS.Track.make(geo.lap, geo.straight, course.dir) : null,
      me: -1, ctl: null, _byX: null,
      checkAt: D >= 2400 ? 1200 : D >= 1600 ? 1000 : 600, check: null, skillFx: [],
    };
    // 終いの伸びの上限はペースで変わる：スローは脚が余っても伸びきれない（早めに動いて余った脚を使う）。ハイは脚の残りで決まる
    sim.top = S.KIRE.top * U.clamp(1 + (paceF - 1) * S.PACE_TOP, 0.55, 1.6);
    if (HS.Skills) HS.Skills.setup(sim);
    // このレースで効く特殊能力（直線で見せる）
    for (const s of st) {
      s.passive = (s.h.skills || []).filter(id => S.skillAdj(Object.assign({}, s.h, { skills: [id] }), race, wIdx, Object.assign({ paceF }, s.r)) > 0);
      if (s.late && H.has(s.h, 'deokure')) sim.skillFx.push({ t: 0.6, i: s.i, id: 'deokure' });
    }
    // プレイヤーが乗る馬（操作を受け付けるのは opts.ride のときだけ。ほかは騎手の腕で自動に乗る）
    const meIdx = runners.findIndex(r => r.rider === 'P');
    if (meIdx >= 0) {
      sim.me = meIdx;
      const s = st[meIdx]; s.me = true;
      if (opts.ride) {
        sim.ctl = { tension: U.clamp(30 + (75 - st[meIdx].mind) * 0.4 + (st[meIdx].kakari ? 15 : 0), 10, 70), started: false, gear: 0, hand: 'R', swapUntil: -1, lastPush: -9, lastPull: -9, pushes: 0, whips: 0, whipUntil: -1, windmill: false, lane: Math.min(3, s.lane), blockedNow: false, wide: false, kakariNow: false, behind: false };
        Object.defineProperty(sim.ctl, 'push', { get() { return Math.max(0, this.gear); }, enumerable: false });
        Object.defineProperty(sim.ctl, 'hold', { get() { return this.gear < -0.05; }, enumerable: false });
        s.delay = 99; s.late = false; // スタートはプレイヤーの合図で
      }
    }
    S.say(sim, 0, 'スタートしました！', 'start');
    for (const s of st) if (s.late) S.say(sim, 0.6, `${s.h.name}、出遅れた！`, 'trouble');
    return sim;
  };
  S.say = (sim, t, text, kind) => sim.events.push({ t, text, kind: kind || '' });
  // 特殊能力の発動を記録する（同じ馬・同じ能力は1回だけ）。spurt は仕掛けの合図で、能力ではない
  S.fire = function (sim, s, id) {
    if (s.fired[id]) return;
    s.fired[id] = true;
    if (id === 'spurt') return;
    sim.skillFx.push({ t: sim.t, i: s.i, id });
    if (sim.opts.frames && (s.me || s.h.owner === 'P' || s.h.hist)) S.say(sim, sim.t, `${s.h.name}の${HS.Skills ? HS.Skills.label(id) : (H.SKILLS[id] || { label: id }).label}！`, 'skill');
  };

  // ---------- プレイヤーの操作 ----------
  // しごく（↑の連打）で手綱を押して速さの段（gear）を上げ、引く（↓の連打）で下げる。連打が速いほど大きく動く。
  // 手を止めても段はそのまま（押し続けなくてよい）。急に上げ下げすると馬の気分が悪くなる
  // 歩幅の周期（秒）。映像の足の運びに使う
  S.strideOf = v => U.clamp(7.4 / Math.max(10, v || 16), 0.38, 0.7);
  const rateOf = (c, t) => { c.taps = (c.taps || []).filter(x => t - x < 1); c.taps.push(t); return c.taps.length; };
  const gearStep = n => Math.min(0.25, 0.05 + 0.025 * Math.min(n, 8));
  S.ctl = {
    // しごく。ゲートの中ならスタートの合図
    up(sim) {
      const c = sim.ctl; if (!c || sim.over) return null;
      const s = sim.st[sim.me];
      if (!c.started) {
        c.started = true;
        if (sim.t < 0.05) { s.delay = 0.05; c.startGood = true; return 'good'; }
        s.delay = sim.t; if (sim.t > 0.5) { s.late = true; s.E -= S.LATE_E; S.say(sim, sim.t, `${s.h.name}、出遅れた！`, 'trouble'); return 'late'; }
        c.startGood = sim.t < 0.25;
        return c.startGood ? 'good' : 'ok';
      }
      const n = rateOf(c, sim.t), d = gearStep(n);
      const g0 = c.gear; c.gear = Math.min(1, c.gear + d);
      if (!s.spurting) c.tension = U.clamp(c.tension + (c.gear - g0) * 16, 0, 100);
      c.pushes++; c.lastPush = sim.t;
      return n >= 5 ? 'fast' : 'ok';
    },
    // 引く
    down(sim) {
      const c = sim.ctl; if (!c || !c.started || sim.over) return null;
      const n = rateOf(c, sim.t), d = gearStep(n);
      const g0 = c.gear; c.gear = Math.max(-1, c.gear - d);
      c.tension = U.clamp(c.tension + (g0 - c.gear) * (n >= 5 ? 14 : 4), 0, 100);
      c.lastPull = sim.t;
      return n >= 5 ? 'fast' : 'ok';
    },
    // ムチ（side＝'L' か 'R'。持っていない手のムチは、まず持ち替える）。続けて打つと風車ムチ
    whip(sim, side) {
      const c = sim.ctl; if (!c || !c.started || sim.over) return null;
      const s = sim.st[sim.me];
      side = side || c.hand;
      if (sim.t < c.swapUntil) return 'swap';
      if (side !== c.hand) return S.ctl.swap(sim);
      c.whips++; c.whipUntil = sim.t + 1.2; c.whipT = (c.whipT || []).filter(x => sim.t - x < 1.5); c.whipT.push(sim.t);
      c.windmill = c.whipT.length >= 3;
      const R = sim.D - s.x;
      // 直線の前のムチは、馬が行きたがるだけ
      if (R > sim.straight + 200) c.tension = U.clamp(c.tension + 12, 0, 100);
      // 馬はムチと反対の側へ寄る。脚が無いとき・気の荒い馬は大きくよれる
      const away = ((S.dirOf(sim) === '左') === (side === 'R')) ? -1 : 1;
      const yore = sim.rng.chance(Math.max(0, (70 - s.mind) / 100) * 0.4);
      c.lane = U.clamp(c.lane + away * (yore ? 1 : 0.2), 0, 12);
      c.lastWhip = { t: sim.t, side, away, yore };
      if (yore) return 'yore';
      if (c.whips > 12) return 'tired';
      return c.windmill ? 'windmill' : 'ok';
    },
    // ムチの持ち替え（少しの間、打てない）
    swap(sim) {
      const c = sim.ctl; if (!c || sim.over) return null;
      c.hand = c.hand === 'R' ? 'L' : 'R'; c.swapUntil = sim.t + 0.35;
      return 'swap';
    },
    lane(sim, d) { const c = sim.ctl; if (c) { c.lane = U.clamp(Math.round(c.lane + d), 0, 12); c.laneT = sim.t; } },
    // 前の形の呼び名（push＝しごく、hold＝押している間は引く）
    push(sim) { return S.ctl.up(sim); },
    hold(sim, on) { if (on && sim.ctl && sim.ctl.started && sim.ctl.gear > -1 && sim.t - (sim.ctl.lastPull || -9) > 0.4) S.ctl.down(sim); },
  };
  S.dirOf = sim => (HS.DATA.courses[sim.race.course] || {}).dir || '右';
  S.whipEff = c => Math.max(0.25, 1 - 0.07 * Math.max(0, c.whips - 1));
  S.mood = c => c ? U.clamp(100 - c.tension, 0, 100) : 50; // 気分（高いほど良い）

  // 前にいる順の並び（前の刻みの並びを、挿し込みで並べ直す。ほとんど並んでいるので速い）
  S.byX = function (sim) {
    const a = sim._byX || (sim._byX = sim.st.slice());
    for (let i = 1; i < a.length; i++) {
      const v = a[i]; let j = i - 1;
      while (j >= 0 && a[j].x < v.x) { a[j + 1] = a[j]; j--; }
      a[j + 1] = v;
    }
    return a;
  };
  // 0.1 秒進める。終わったら true
  S.step = function (sim) {
    if (sim.over) return true;
    const { D, st, straight, slope, pace, opts, rng } = sim;
    sim.t += DT; sim.step++;
    const t = sim.t;
    const order = S.byX(sim).filter(s => !s.done);
    for (let k = 0; k < order.length; k++) order[k].rk = order.length > 1 ? k / (order.length - 1) : 0.5;
    // 隊列の先頭（大逃げの馬は追いかけず、2番手以下の集団で隊列を作る）
    const pack = order.find(o => !o.oonige) || order[0];
    const leaderX = pack ? pack.x : D;
    const c = sim.ctl;
    for (const s of st) {
      // ゴールした馬は止まらず、少しずつ速さを落として流す（描画のため。着順・時計は変わらない）
      if (s.done) { s.v = Math.max(6, s.v - 0.9 * DT); s.x += s.v * DT; continue; }
      if (s.me && c && !c.started && t >= 0.9) { c.started = true; s.delay = 0.9; s.late = true; s.E -= S.LATE_E; S.say(sim, t, `${s.h.name}、出遅れた！`, 'trouble'); }
      if (t < s.delay) continue;
      const R = D - s.x;
      const prog = s.x / D;
      let target;
      let costMul = 1;
      if (s.me && c) {
        // プレイヤーの操作：何もしなければ馬なり（自分の仕掛けどころで勝手に伸びる）。しごいて段を上げればもっと速く、引けば脚をためる。ムチでもうひと伸び
        const g = c.gear;
        // 追い出し：自然の仕掛けどころに来るか、直線の手前でしごいて段を上げれば、そこから伸びる
        if (!s.spurting && (R <= s.spurtR || (g > 0.35 && R < straight + 500))) { s.spurting = true; S.fire(sim, s, 'spurt'); if (H.has(s.h, 'longspurt')) S.fire(sim, s, 'longspurt'); }
        if (s.spurting && g < -0.05 && R > 200) s.spurting = false; // 引いたら仕掛け直し
        // 気分（テンション）：放っておくと行きたがり、包まれると嫌がる。前の馬の真後ろや、そっと引くと落ち着く。高すぎると掛かる
        const ahead1 = st.find(o => o !== s && !o.done && o.x > s.x && o.x - s.x < 5 && Math.abs(o.lane - s.lane) < 0.8);
        c.behind = !!ahead1;
        if (!s.spurting) {
          // 気性が荒い（mind が低い）ほど、気分が動きやすい（上がるのも速い）
          const tf = S.temperF(s);
          // 脚質に合った位置にいないと、折り合いを欠いて気分が悪くなる（ペースを見越してわざと位置を変えるなら、そのぶん気分の管理が要る）
          const zone = S.ZONE[s.h.style] || S.ZONE['先行'];
          const off = prog > 0.08 && s.rk != null ? Math.max(0, zone[0] - s.rk, s.rk - zone[1]) : 0;
          c.misfit = off > 0.05;
          const ner = (0.3 + Math.max(0, 75 - s.mind) * 0.03 + (s.kakari ? 1.2 : 0) + off * S.MISFIT) * tf * (prog < 0.65 ? 1 : 0.4);
          const sides = st.filter(o => o !== s && !o.done && Math.abs(o.x - s.x) < 3 && Math.abs(o.lane - s.lane) < 1.6).length;
          const boxed = sides >= 2 && (s.h.style === '逃げ' || s.h.style === '追込') ? 1.5 : sides ? 0.4 : 0;
          // 掛かり癖の馬は、引いて遅く走らせると余計に行きたがる
          const pull = g < -0.05 ? (H.has(s.h, 'kakari') ? 1.5 : -2.5 * -g) : 0;
          const calm = (ahead1 && s.h.style !== '逃げ' ? 2.6 : 0) / Math.sqrt(tf);
          c.tension = U.clamp(c.tension + (ner + boxed * tf + pull - calm) * DT, 0, 100);
        } else c.tension = Math.max(0, c.tension - 3 * DT);
        const kakariNow = c.tension > 75 && !s.spurting;
        if (kakariNow && !c.kakariNow && H.has(s.h, 'kakari')) S.fire(sim, s, 'kakari');
        c.kakariNow = kakariNow;
        if (kakariNow) c.everKakari = true;
        if (s.E <= 0) target = s.vc * (0.9 + 0.0005 * s.guts + s.zubu);
        else {
          if (s.spurting) {
            // 馬なりでは伸びきらない。しごいて段を上げるほど、残っている脚を使って伸びる（段がいちばん上で、おまかせと同じ伸び）。
            // いつ追い出すかが腕の見せどころ：スローなら早め、ハイなら遅め（脚が残っていれば伸び、無ければバテる）
            const ratioE = Math.cbrt(Math.max(0, s.E) * s.Ds / (0.9 * Math.max(R, 30) * s.spurtCost));
            target = s.vc * U.clamp(ratioE, 1 + s.kickS, 1 + s.kickS * (1 + (sim.top - 1) * U.clamp(g, S.PUSH.base, 1)));
          } else if (prog < 0.22) target = pace * s.styleMult * (s.nino && prog < 0.08 ? 1.02 : 1);
          else target = pace * (1 + U.clamp((leaderX - s.x - s.gap) * 0.0012, -0.02, 0.02));
          // 引く：段の深さだけ下げて、脚をためる（スタミナの減りが小さい）
          if (g < 0) { target *= 1 + g * (prog < 0.15 ? 0.03 : 0.012); costMul *= 1 + 0.1 * g; }
          // しごく：段の高さだけ速く。道中で上げると脚を使う
          // 追い出してからしごくと、少しだけ速くなるが、そのぶん脚を使う（追うだけで楽に勝てないように）
          if (g > 0 && !s.spurting) { target *= 1 + g * 0.03; costMul *= 1 + 0.6 * g; }
          if (t < c.whipUntil) {
            const inZone = R < straight + 200;
            const k = c.windmill ? 0.9 : 0.6;
            // 直線のムチは気合が入って、もうひと伸びし、脚ももつ。直線の前のムチは脚を使うだけ
            target *= 1 + (inZone ? k : 0.2) * s.kickS * S.whipEff(c); costMul *= inZone ? (c.windmill ? 0.95 : 0.9) : 1.2;
          }
          // 掛かると行きたがって脚を使う。落ち着いていれば脚がもつ
          if (kakariNow) { target *= 1.012; costMul *= 1.35; }
          else if (c.tension < 35 && !s.spurting) costMul *= 0.94;
          // 折り合いを欠くほど（気分が悪いほど）脚を使う
          else if (c.tension > 50 && !s.spurting) costMul *= 1 + (c.tension - 50) / 100 * S.TENSE_COST;
          if (R < 250 && (g > 0.3 || s.spurting)) {
            const rival = st.some(o => o !== s && !o.done && Math.abs(o.x - s.x) < 1.5);
            if (rival) { target *= 1 + 0.004 * (s.guts - 70) / 30 + (s.narabu ? 0.004 : 0); if (s.narabu) S.fire(sim, s, 'narabu'); }
          }
        }
        // 進路を触らずにいると、空いていれば少しずつ内ラチへ寄る（馬はラチ沿いを走りたがる）
        if (c.lane > 0 && t - (c.laneT || 0) > 3 && t - (c.driftT || 0) > 1.2 && !st.some(o => o !== s && !o.done && Math.abs(o.x - s.x) < 3.2 && o.lane < s.lane - 0.2 && o.lane > c.lane - 1.9)) { c.lane -= 1; c.driftT = t; }
        // 前に馬がいて進路が無い
        const ahead = st.find(o => o !== s && !o.done && o.x > s.x && o.x - s.x < 2.6 && Math.abs(o.lane - s.lane) < 0.85);
        c.blockedNow = !!ahead;
        if (ahead) target = Math.min(target, ahead.v - 0.05);
      } else {
        if (!s.spurting && R <= s.spurtR) {
          s.spurting = true;
          // 残りの脚が足りないなら仕掛けを遅らせる
          const need = R / s.Ds * 0.9 * Math.pow(1 + s.kickS, 3);
          if (need > s.E * 1.15 && R > 260) s.spurting = false;
          else if (H.has(s.h, 'longspurt')) S.fire(sim, s, 'longspurt');
        }
        if (s.E <= 0) {
          target = s.vc * (0.9 + 0.0005 * s.guts + s.zubu);
        } else if (s.spurting) {
          // 残りの脚をゴールまでに使い切る速さ（切れの上限まで）
          const ratioE = Math.cbrt(Math.max(0, s.E) * s.Ds / (0.9 * Math.max(R, 30) * s.spurtCost));
          target = s.vc * U.clamp(ratioE, 1 + s.kickS, 1 + s.kickS * sim.top);
          // 大逃げは道中で脚を使っているので、終いは粘るだけ
          if (s.oonige) target = s.vc * (1 + s.kickS * S.OONIGE.kick);
          // 叩き合い（根性）
          if (R < (s.narabu ? 350 : 250)) {
            const rival = st.some(o => o !== s && !o.done && Math.abs(o.x - s.x) < 1.5);
            if (rival) { target *= 1 + 0.004 * (s.guts - 70) / 30 + (s.narabu ? 0.004 : 0); if (s.narabu) S.fire(sim, s, 'narabu'); }
          }
          // ソラを使う：抜け出すと気を抜く
          if (s.sora && R < 200 && order[0] === s && order[1] && s.x - order[1].x > 2) { target *= 0.985; S.fire(sim, s, 'sora'); }
        } else if (prog < 0.22) {
          target = pace * s.styleMult * (s.nino && prog < 0.08 ? 1.02 : 1) * (s.oonige ? S.OONIGE.early : 1);
        } else if (s.oonige) {
          target = pace * (s.x - leaderX < S.OONIGE.lead * straight * 2000 / D ? S.OONIGE.mid : 1);
          if (s.x - leaderX > 10) S.fire(sim, s, 'oonige');
        } else {
          // 隊列を保つ：先頭からの目標の差に寄せる
          const gapNow = leaderX - s.x;
          const err = gapNow - s.gap;
          target = pace * (1 + U.clamp(err * 0.0012, -0.02, 0.02));
          if (s.kakari && prog < 0.5) { target *= 1.012; if (prog > 0.1 && H.has(s.h, 'kakari')) S.fire(sim, s, 'kakari'); }
        }
        if (s.kakari && prog < 0.5) costMul *= 1.3;
      }
      // ペース：道中は前にいるほど、ハイなら脚を使い、スローなら楽をする
      // ハイペースで直線の前から追い出すと、脚がもたない（早仕掛けは損）
      if (s.spurting && R > straight && sim.paceF > 1) costMul *= 1 + (sim.paceF - 1) * S.PACE_EARLY;
      // （後ろの馬は前の馬を風よけにして、ペースにかかわらず少し楽をする）
      if (!s.spurting && prog > 0.08 && !s.oonige) { const rk = s.rk == null ? 0.5 : s.rk; costMul *= Math.max(0.5, 1 + (sim.paceF - 1) * S.PACE_K * (1 - 2 * rk)) * (1 - S.DRAFT * rk); } // 大逃げは集団と離れて自分のペースで行く
      // 発動した特殊能力の、一時の速さ
      if (s.boost && t < s.boost.until) target *= s.boost.mul;
      // 坂：ゴール前の上りで脚を使う。坂が弱いほど大きく減る
      const onHill = R < 320 && R > 60 && slope !== '平';
      if (onHill) target *= 1 - ({ '急': 0.008, '中': 0.005, '小': 0.003 }[slope] || 0) * (1 - s.slopeP / 120);
      // 不利（差し・追込が直線で詰まる）。プレイヤーの馬は自分の進路取りしだい
      if (!(s.me && c) && s.spurting && !s.blockedOnce && st.length >= 10 && (s.h.style === '差し' || s.h.style === '追込')) {
        s.blockedOnce = true;
        const jk = s.r.jockey ? s.r.jockey.skill : 70;
        if (rng.chance(0.1 * (1 - s.mind / 160) * (1.2 - jk / 150))) { s.blocked = rng.float(1.0, 2.4); S.say(sim, t, `${s.h.name}、前が壁になった！`, 'trouble'); }
      }
      if (s.blocked > 0) { target *= 0.93; s.blocked -= DT; }
      // 加減速の上限
      // ゲートを出てすぐは強く加速し、2秒ほどで巡航の速さの9割に乗る（持ち主の指摘「動き出しが遅い」）
      const acc = s.v < s.vc * 0.9 ? S.START_ACC : s.acc + s.slopeP * 0.0015;
      const dv = U.clamp(target - s.v, -1.4 * DT, acc * DT);
      const vPrev = s.v;
      s.v = Math.max(0, s.v + dv);
      // スタミナの消耗（自分の巡航より速いほど重い）
      const ratio = s.v / s.vc;
      let cost = (s.v * DT) / s.Ds * 0.9 * ratio * ratio * ratio * costMul;
      if (s.spurting) cost *= s.spurtCost;
      if (onHill) cost *= 1 + ({ '急': 2.2, '中': 1.4, '小': 0.8 }[slope] || 0) * U.clamp(1 - s.slopeP / 100, 0, 0.6);
      // 早くから追い通すと、馬がもたない
      if (s.me && c && R > 600) cost *= 1 + 8 * Math.max(0, ratio - 1);
      s.E -= cost;
      const xPrev = s.x;
      let dx = (vPrev + s.v) / 2 * DT;
      // コーナーで外を回ると、そのぶん遠回りになる（プレイヤーの馬）
      if (s.me && c && sim.track) { const corner = HS.Track.cornerAt(sim.track, R) !== 0; c.wide = corner && s.lane > 1.5; if (corner) dx *= 1 - 0.005 * Math.max(0, s.lane - 0.5); }
      s.x += dx;
      if (s.t600 == null && s.x >= D - 600) s.t600 = t - DT + (D - 600 - xPrev) / Math.max(0.1, s.x - xPrev) * DT;
      if (s.x >= D) {
        s.finishT = t - DT + (D - xPrev) / Math.max(0.1, s.x - xPrev) * DT;
        s.done = true; sim.finished++;
        if (sim.winnerT == null) sim.winnerT = s.finishT;
      }
    }
    if (HS.Skills && sim.step % 2 === 1) HS.Skills.step(sim, order, DT * 2);
    // スキルの発動（見せるため）：直線に入ったら、このレースで効いている特殊能力
    for (const s of st) {
      if (s.done || !s.passive) continue;
      if (!s.passiveShown && D - s.x <= straight) { s.passiveShown = true; for (const id of s.passive) S.fire(sim, s, id); }
      if (s.nino && t > 1.5 && t < 2) S.fire(sim, s, 'nino');
    }
    // ペースの目安：先頭がチェックポイントを過ぎたとき
    if (!sim.check && order[0] && order[0].x >= sim.checkAt) {
      const verdict = S.paceVerdict(sim.paceF);
      sim.check = { t, at: sim.checkAt, verdict };
      if (opts.frames) S.say(sim, t, `${sim.checkAt}m通過は${t.toFixed(1)}秒。${verdict}です。`, 'pace');
    }
    // 進路：前から順に、近くの馬と重ならない一番内の位置（特殊能力の発動にも使うので、映像を出さないレースでも決める）
    if (true) {
      const live = S.byX(sim);
      // プレイヤーの馬は自分で選んだ進路にいる
      const me = c ? st[sim.me] : null;
      if (me) { me.laneT = c.lane; me.lane += U.clamp(c.lane - me.lane, -1.0 * DT, 1.0 * DT); }
      const near = [];
      // ほかの馬の進路は 0.2 秒ごとに決め直す（計算を軽くするため）
      for (let k = 0; k < live.length && sim.step % 2 === 0; k++) {
        const s = live[k];
        if (s === me) continue;
        let want = 0;
        const inStraight = D - s.x < straight;
        if (inStraight && (s.h.style === '差し' || s.h.style === '追込')) want = s.trig && s.trig.includes('oosoto') ? 6 : 2 + (s.i % 4);
        // すぐ前（2.6m 以内）にいて、もう進路が決まった馬の進路
        near.length = 0;
        for (let q = k - 1; q >= 0 && live[q].x - s.x < 2.6; q--) near.push(live[q] === me ? me.lane : live[q].laneT);
        if (me && me.x < s.x && s.x - me.x < 2.6) near.push(me.lane);
        let lane = want;
        for (let n = 0; n < 20; n++) {
          let hit = false;
          for (let q = 0; q < near.length; q++) if (Math.abs(near[q] - lane) < 0.9) { hit = true; break; }
          if (!hit) break;
          lane += 1;
        }
        s.laneT = lane;
        s.lane += (s.laneT - s.lane) * 0.16;
      }
    }
    // 実況（映像を出すときだけ）
    if (opts.frames && sim.step % 5 === 0) S.commentary(sim);
    if (opts.frames && sim.step % REC_EVERY === 0) sim.frames.push({ t, p: st.map(s => [Math.round(s.x * 10) / 10, Math.round(s.lane * 100) / 100, Math.round(s.v * 100) / 100]) });
    if (sim.finished >= st.length || t >= 400 || (sim.winnerT != null && t > sim.winnerT + 25)) sim.over = true; // 残りはまとめて止める
    // 操作して乗るときは、自分がゴールして少ししたら終える
    if (c && st[sim.me].done && t > st[sim.me].finishT + 4) sim.over = true;
    return sim.over;
  };

  S.commentary = function (sim) {
    const { st, D, straight, t } = sim; const k = sim.talk;
    const ord = st.slice().sort((a, b) => b.x - a.x);
    const lead = ord[0];
    if (t > 6 && t < 14 && !k.lastLeader) { k.lastLeader = lead; S.say(sim, t, `ハナを切ったのは${lead.h.name}。`, 'lead'); }
    const R = D - lead.x;
    if (!k.mid && lead.x > D * 0.5 && D >= 1600) {
      k.mid = true;
      const names = ord.slice(0, 3).map(s => s.h.name).join('、');
      S.say(sim, t, `中間点、前は${names}。`, 'mid');
      const pl = ord.findIndex(s => s.h.owner === 'P' || s.me);
      if (pl >= 0) S.say(sim, t + 1.5, `${ord[pl].h.name}は${pl + 1}番手あたり。`, 'mine');
    }
    if (!k.corner && R <= straight + 350) { k.corner = true; S.say(sim, t, '3コーナーから4コーナーへ。各馬が動き出す！', 'corner'); }
    if (!k.straight && R <= straight) { k.straight = true; S.say(sim, t, `最後の直線！ 先頭は${lead.h.name}！`, 'straight'); }
    if (k.lastLeader && lead !== k.lastLeader && R < straight && R > 30) { S.say(sim, t, `${lead.h.name}が先頭に立つ！`, 'lead'); }
    if (!k.f400 && R <= 400 && R > 0) { k.f400 = true; const second = ord[1]; if (second && lead.x - second.x > 6) S.say(sim, t, `${lead.h.name}、リードは${Math.round((lead.x - second.x) / LEN)}馬身！`, 'mid'); else if (second) S.say(sim, t, `${lead.h.name}と${second.h.name}の叩き合い！`, 'duel'); }
    if (!k.f200 && R <= 200 && R > 0) {
      k.f200 = true;
      const closer = ord.slice(1, 6).sort((a, b) => b.v - a.v)[0];
      if (closer && closer.v > lead.v + 0.4) S.say(sim, t, `外から${closer.h.name}が猛然と追い込む！`, 'duel');
    }
    k.lastLeader = k.lastLeader ? lead : k.lastLeader;
  };

  // 結果をまとめる
  S.finish = function (sim) {
    const { st, D, opts, events } = sim;
    const t = sim.t;
    // まだゴールしていない馬（大差）を片づける
    for (const s of st) if (!s.done) { s.finishT = t + (D - s.x) / Math.max(5, s.v); s.done = true; }
    if (opts.frames) sim.frames.push({ t: t + DT, p: st.map(s => [s.x, s.lane, s.v]) });
    const ranked = st.slice().sort((a, b) => a.finishT - b.finishT);
    const winner = ranked[0];
    const results = ranked.map((s, k) => {
      const prev = ranked[k - 1];
      const lengths = prev ? (s.finishT - prev.finishT) * s.vc / LEN : 0;
      return {
        pos: k + 1, num: s.r.num, frame: s.r.frame, horse: s.h, jockey: s.r.jockey, weight: s.r.weight,
        time: s.finishT, margin: k === 0 ? '' : U.margin(lengths), lengths, last3f: s.t600 != null ? s.finishT - s.t600 : null,
        late: s.late, blocked: s.blockedOnce && s.blocked !== 0, power: s.A, endE: s.E, rider: s.r.rider || null,
      };
    });
    const win = results[0];
    const second = results[1];
    let finishText = `${win.horse.name}、1着でゴールイン！`;
    if (second && second.lengths < 0.1) finishText = `${win.horse.name}と${second.horse.name}、並んでゴール！ 写真判定……${win.horse.name}がハナ差で制した！`;
    else if (second && second.lengths >= 5) finishText = `${win.horse.name}、圧勝！ ${second.margin}馬身突き放してゴール！`;
    S.say(sim, winner.finishT, finishText, 'finish');
    events.sort((a, b) => a.t - b.t);
    return { results, events, frames: opts.frames ? sim.frames : null, D, straight: sim.straight, lap: sim.geo.lap, winnerTime: win.time };
  };
})();
