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
    return v * (1 + (courseAdj || 0));
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
    const condAdj = (horse.cond || 0) / 100 * 3 - (horse.fatigue || 0) * 0.05;
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
      else if (id === 'hipace' && ctx && ctx.paceF > 1.003) a += 1.8;
      else if (id === 'slowpace' && ctx && ctx.paceF && ctx.paceF < 0.995) a += 1.8;
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
  S.DS = 0.78; // スタミナの持ちの全体の倍率
  S.KIRE = { s0: 0.03, s1: 0.0035, r: 60, a0: 0.85, a1: 0.05, c0: 0.95, c1: 0.01, z: 0.0015, top: 1.6 };

  // 本体。runners: [{horse, jockey, weight, num, frame}]
  S.run = function (race, runners, wIdx, rng, opts) {
    opts = opts || {};
    const course = HS.DATA.courses[race.course] || HS.DATA.courses['東京'];
    const surfKey = race.surface === 'ダ' ? 'dirt' : 'turf';
    const geo = course[surfKey] || course.turf || course.dirt;
    const D = race.dist;
    const v0 = S.baseSpeed(D, race.surface, race.ground, geo.speed) * U.eraSpeed(race.year);
    const straight = Math.min(geo.straight, D * 0.6);
    const slope = geo.slope;
    const nNige = runners.filter(r => r.horse.style === '逃げ').length;
    const paceF = 1 + (nNige >= 2 ? 0.006 : nNige === 0 ? -0.01 : 0) + rng.normal(0, 0.004);
    const events = [];
    const say = (t, text, kind) => events.push({ t, text, kind: kind || '' });

    const st = runners.map((r, i) => {
      const h = r.horse;
      const pw = S.power(h, race, wIdx, Object.assign({ paceF }, r));
      const form = rng.normal(0, 2.2);
      const A = pw.total + form;
      const vc = v0 * (1 + 0.0008 * (A - 85));
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
        r, h, i, A, vc, Ds, kickS, spurtR, guts, mind, slopeP, x: 0, v: 0, E: 1, delay, late, kakari,
        acc: K.a0 + K.a1 * kire, zubu: (8 - kire) * K.z + (has('longspurt') ? 0.003 : 0), spurtCost: K.c0 + K.c1 * (kire - 1),
        oonige: has('oonige') && h.style === '逃げ', nino: has('nino'), narabu: has('narabu'), sora: has('sora'),
        lane: (r.num - 1) * 0.5, laneT: 0, spurting: false, done: false, finishT: null, t600: null, blocked: 0, blockedOnce: false,
        styleMult: ({ '逃げ': 1.03, '先行': 1.014, '差し': 0.995, '追込': 0.982 })[h.style] || 1,
        gap: ({ '逃げ': 0, '先行': 5, '差し': 14, '追込': 24 })[h.style] || 10,
      };
    });
    const medVc = st.map(s => s.vc).sort((a, b) => a - b)[Math.floor(st.length / 2)];
    const pace = medVc * paceF;
    const frames = [];
    let t = 0, step = 0, finished = 0, winnerT = null;
    let lastLeader = null, saidStraight = false, saidMid = false, saidCorner = false, said400 = false, said200 = false;
    say(0, 'スタートしました！', 'start');
    for (const s of st) if (s.late) say(0.6, `${s.h.name}、出遅れた！`, 'trouble');

    while (finished < st.length && t < 400) {
      t += DT; step++;
      const order = st.filter(s => !s.done).sort((a, b) => b.x - a.x);
      // 隊列の先頭（大逃げの馬は追いかけず、2番手以下の集団で隊列を作る）
      const pack = order.find(o => !o.oonige) || order[0];
      const leaderX = pack ? pack.x : D;
      for (const s of st) {
        if (s.done) continue;
        if (t < s.delay) continue;
        const R = D - s.x;
        let target;
        if (!s.spurting && R <= s.spurtR) {
          s.spurting = true;
          // 残りの脚が足りないなら仕掛けを遅らせる
          const need = R / s.Ds * 0.9 * Math.pow(1 + s.kickS, 3);
          if (need > s.E * 1.15 && R > 260) s.spurting = false;
        }
        const prog = s.x / D;
        if (s.E <= 0) {
          target = s.vc * (0.9 + 0.0005 * s.guts + s.zubu);
        } else if (s.spurting) {
          // 残りの脚をゴールまでに使い切る速さ（切れの上限まで）
          const ratioE = Math.cbrt(Math.max(0, s.E) * s.Ds / (0.9 * Math.max(R, 30) * s.spurtCost));
          target = s.vc * U.clamp(ratioE, 1 + s.kickS, 1 + s.kickS * S.KIRE.top);
          // 大逃げは道中で脚を使っているので、終いは粘るだけ
          if (s.oonige) target = s.vc * (1 + s.kickS * S.OONIGE.kick);
          // 叩き合い（根性）
          if (R < (s.narabu ? 350 : 250)) {
            const rival = st.some(o => o !== s && !o.done && Math.abs(o.x - s.x) < 1.5);
            if (rival) target *= 1 + 0.004 * (s.guts - 70) / 30 + (s.narabu ? 0.004 : 0);
          }
          // ソラを使う：抜け出すと気を抜く
          if (s.sora && R < 200 && order[0] === s && order[1] && s.x - order[1].x > 2) target *= 0.985;
        } else if (prog < 0.22) {
          target = pace * s.styleMult * (s.nino && prog < 0.08 ? 1.02 : 1) * (s.oonige ? S.OONIGE.early : 1);
        } else if (s.oonige) {
          target = pace * (s.x - leaderX < S.OONIGE.lead * straight * 2000 / D ? S.OONIGE.mid : 1);
        } else {
          // 隊列を保つ：先頭からの目標の差に寄せる
          const gapNow = leaderX - s.x;
          const err = gapNow - s.gap;
          target = pace * (1 + U.clamp(err * 0.0012, -0.02, 0.02));
          if (s.kakari && prog < 0.5) target *= 1.012;
        }
        // 坂：ゴール前の上りで脚を使う。坂が弱いほど大きく減る
        const onHill = R < 320 && R > 60 && slope !== '平';
        if (onHill) target *= 1 - ({ '急': 0.008, '中': 0.005, '小': 0.003 }[slope] || 0) * (1 - s.slopeP / 120);
        // 不利（差し・追込が直線で詰まる）
        if (s.spurting && !s.blockedOnce && st.length >= 10 && (s.h.style === '差し' || s.h.style === '追込')) {
          s.blockedOnce = true;
          const jk = s.r.jockey ? s.r.jockey.skill : 70;
          if (rng.chance(0.1 * (1 - s.mind / 160) * (1.2 - jk / 150))) { s.blocked = rng.float(1.0, 2.4); say(t, `${s.h.name}、前が壁になった！`, 'trouble'); }
        }
        if (s.blocked > 0) { target *= 0.93; s.blocked -= DT; }
        // 加減速の上限
        const acc = s.v < 10 ? 3.6 : s.acc + s.slopeP * 0.0015;
        const dv = U.clamp(target - s.v, -1.4 * DT, acc * DT);
        const vPrev = s.v;
        s.v = Math.max(0, s.v + dv);
        // スタミナの消耗（自分の巡航より速いほど重い）
        const ratio = s.v / s.vc;
        let cost = (s.v * DT) / s.Ds * 0.9 * ratio * ratio * ratio * (s.kakari && prog < 0.5 ? 1.3 : 1);
        if (s.spurting) cost *= s.spurtCost;
        if (onHill) cost *= 1 + ({ '急': 2.2, '中': 1.4, '小': 0.8 }[slope] || 0) * U.clamp(1 - s.slopeP / 100, 0, 0.6);
        s.E -= cost;
        const xPrev = s.x;
        s.x += (vPrev + s.v) / 2 * DT;
        if (s.t600 == null && s.x >= D - 600) s.t600 = t - DT + (D - 600 - xPrev) / Math.max(0.1, s.x - xPrev) * DT;
        if (s.x >= D) {
          s.finishT = t - DT + (D - xPrev) / Math.max(0.1, s.x - xPrev) * DT;
          s.done = true; finished++;
          if (winnerT == null) { winnerT = s.finishT; }
        }
      }
      // 進路（描画用）：前から順に、近くの馬と重ならない一番内の位置。映像を出さないレースでは省く
      if (opts.frames) {
      const live = st.slice().sort((a, b) => b.x - a.x);
      const placed = [];
      for (const s of live) {
        let want = 0;
        const inStraight = D - s.x < straight;
        if (inStraight && (s.h.style === '差し' || s.h.style === '追込')) want = 2 + (s.i % 4);
        let lane = want;
        for (let k = 0; k < 20; k++) {
          if (!placed.some(p => Math.abs(p.x - s.x) < 2.6 && Math.abs(p.laneT - lane) < 0.9)) break;
          lane += 1;
        }
        s.laneT = lane; placed.push(s);
        s.lane += (s.laneT - s.lane) * 0.08;
      }
      }
      // 実況（映像を出すときだけ）
      if (opts.frames && step % 5 === 0) {
        const ord = st.slice().sort((a, b) => b.x - a.x);
        const lead = ord[0];
        if (t > 6 && t < 14 && !lastLeader) { lastLeader = lead; say(t, `ハナを切ったのは${lead.h.name}。`, 'lead'); }
        const R = D - lead.x;
        if (!saidMid && lead.x > D * 0.5 && D >= 1600) {
          saidMid = true;
          const names = ord.slice(0, 3).map(s => s.h.name).join('、');
          say(t, `中間点、前は${names}。`, 'mid');
          const pl = ord.findIndex(s => s.h.owner === 'P');
          if (pl >= 0) say(t + 1.5, `${ord[pl].h.name}は${pl + 1}番手あたり。`, 'mine');
        }
        if (!saidCorner && R <= straight + 350) { saidCorner = true; say(t, '3コーナーから4コーナーへ。各馬が動き出す！', 'corner'); }
        if (!saidStraight && R <= straight) { saidStraight = true; say(t, `最後の直線！ 先頭は${lead.h.name}！`, 'straight'); }
        if (lastLeader && lead !== lastLeader && R < straight && R > 30) { say(t, `${lead.h.name}が先頭に立つ！`, 'lead'); }
        if (!said400 && R <= 400 && R > 0) { said400 = true; const second = ord[1]; if (second && lead.x - second.x > 6) say(t, `${lead.h.name}、リードは${Math.round((lead.x - second.x) / LEN)}馬身！`, 'mid'); else if (second) say(t, `${lead.h.name}と${second.h.name}の叩き合い！`, 'duel'); }
        if (!said200 && R <= 200 && R > 0) {
          said200 = true;
          const closer = ord.slice(1, 6).sort((a, b) => b.v - a.v)[0];
          if (closer && closer.v > lead.v + 0.4) say(t, `外から${closer.h.name}が猛然と追い込む！`, 'duel');
        }
        lastLeader = lastLeader ? lead : lastLeader;
      }
      if (opts.frames && step % REC_EVERY === 0) frames.push({ t, p: st.map(s => [Math.round(s.x * 10) / 10, Math.round(s.lane * 100) / 100, Math.round(s.v * 100) / 100]) });
      if (winnerT != null && t > winnerT + 25) break; // 残りはまとめて止める
    }
    // まだゴールしていない馬（大差）を片づける
    for (const s of st) if (!s.done) { s.finishT = t + (D - s.x) / Math.max(5, s.v); s.done = true; }
    if (opts.frames) frames.push({ t: t + DT, p: st.map(s => [Math.min(D + 30, s.x), s.lane, s.v]) });

    const ranked = st.slice().sort((a, b) => a.finishT - b.finishT);
    const winner = ranked[0];
    const results = ranked.map((s, k) => {
      const prev = ranked[k - 1];
      const lengths = prev ? (s.finishT - prev.finishT) * s.vc / LEN : 0;
      return {
        pos: k + 1, num: s.r.num, frame: s.r.frame, horse: s.h, jockey: s.r.jockey, weight: s.r.weight,
        time: s.finishT, margin: k === 0 ? '' : U.margin(lengths), lengths, last3f: s.t600 != null ? s.finishT - s.t600 : null,
        late: s.late, blocked: s.blockedOnce && s.blocked !== 0, power: s.A, endE: s.E,
      };
    });
    const win = results[0];
    const second = results[1];
    let finishText = `${win.horse.name}、1着でゴールイン！`;
    if (second && second.lengths < 0.1) finishText = `${win.horse.name}と${second.horse.name}、並んでゴール！ 写真判定……${win.horse.name}がハナ差で制した！`;
    else if (second && second.lengths >= 5) finishText = `${win.horse.name}、圧勝！ ${second.margin}馬身突き放してゴール！`;
    say(winner.finishT, finishText, 'finish');
    events.sort((a, b) => a.t - b.t);
    return { results, events, frames: opts.frames ? frames : null, D, straight, lap: geo.lap, winnerTime: win.time };
  };
})();
