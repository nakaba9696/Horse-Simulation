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
    const c = H.cur(horse, wIdx);
    const dirt = race.surface === 'ダ';
    const w = dirt ? { spd: 0.30, kick: 0.12, sta: 0.13, pow: 0.25, guts: 0.12, wise: 0.08 } : { spd: 0.30, kick: 0.22, sta: 0.13, pow: 0.10, guts: 0.15, wise: 0.10 };
    let a = 0; for (const k of H.STATS) a += c[k] * w[k];
    const D = race.dist;
    let distPen = 0;
    if (D < horse.distMin) distPen = (horse.distMin - D) / 100 * 1.4;
    if (D > horse.distMax) distPen = (D - horse.distMax) / 100 * 1.2;
    const apt = dirt ? horse.apt.dirt : horse.apt.turf;
    const surfPen = (100 - apt) * 0.2;
    const gl = { '良': 0, '稍重': 1, '重': 2, '不良': 3 }[race.ground] || 0;
    const groundAdj = gl * ((horse.apt.heavy || 50) - 55) / 45 * 1.3;
    const condAdj = (horse.cond || 0) / 100 * 3 - (horse.fatigue || 0) * 0.05;
    const jockAdj = ctx && ctx.jockey ? (ctx.jockey.skill - 75) * 0.06 : 0;
    const wtAdj = ctx && ctx.weight ? -(ctx.weight - 56) * 1.4 : 0;
    const total = a - distPen - surfPen + groundAdj + condAdj + jockAdj + wtAdj;
    return { total, base: a, distPen, surfPen, groundAdj, condAdj, cur: c };
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
      const pw = S.power(h, race, wIdx, r);
      const form = rng.normal(0, 2.2);
      const A = pw.total + form;
      const vc = v0 * (1 + 0.0008 * (A - 85));
      const sta = pw.cur.sta, kick = pw.cur.kick, guts = pw.cur.guts, wise = pw.cur.wise, pow = pw.cur.pow;
      const Ds = Math.max(900, h.distMax + 300 + (sta - 75) * 10);
      const kickS = 0.03 + 0.0009 * (kick - 70);
      const styleAdd = { '逃げ': 0, '先行': 60, '差し': 120, '追込': 170 }[h.style] || 80;
      const spurtR = U.clamp(straight + 120 + styleAdd + rng.normal(0, 60) * (1.3 - wise / 120), 300, Math.min(1100, D * 0.55));
      const temper = h.temper == null ? 60 : h.temper;
      let delay = Math.abs(rng.normal(0, 0.12));
      const lateP = 0.025 + Math.max(0, 60 - temper) * 0.0007 + Math.max(0, 70 - wise) * 0.0004;
      const late = rng.chance(lateP);
      if (late) delay += rng.float(0.5, 1.4);
      const kakari = rng.chance(Math.max(0, (55 - temper) / 100) * 0.45);
      return {
        r, h, i, A, vc, Ds, kickS, spurtR, guts, wise, pow, x: 0, v: 0, E: 1, delay, late, kakari,
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
      const leaderX = order.length ? order[0].x : D;
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
          target = s.vc * (0.9 + 0.0005 * s.guts);
        } else if (s.spurting) {
          target = s.vc * (1 + s.kickS);
          // 叩き合い（根性）
          if (R < 250) {
            const rival = st.some(o => o !== s && !o.done && Math.abs(o.x - s.x) < 1.5);
            if (rival) target *= 1 + 0.004 * (s.guts - 70) / 30;
          }
        } else if (prog < 0.22) {
          target = pace * s.styleMult;
        } else {
          // 隊列を保つ：先頭からの目標の差に寄せる
          const gapNow = leaderX - s.x;
          const err = gapNow - s.gap;
          target = pace * (1 + U.clamp(err * 0.0012, -0.02, 0.02));
          if (s.kakari && prog < 0.5) target *= 1.012;
        }
        // 坂
        if (R < 320 && slope !== '平') target *= 1 - ({ '急': 0.012, '中': 0.007, '小': 0.004 }[slope] || 0) * (1 - s.pow / 115);
        // 不利（差し・追込が直線で詰まる）
        if (s.spurting && !s.blockedOnce && st.length >= 10 && (s.h.style === '差し' || s.h.style === '追込')) {
          s.blockedOnce = true;
          const jk = s.r.jockey ? s.r.jockey.skill : 70;
          if (rng.chance(0.1 * (1 - s.wise / 160) * (1.2 - jk / 150))) { s.blocked = rng.float(1.0, 2.4); say(t, `${s.h.name}、前が壁になった！`, 'trouble'); }
        }
        if (s.blocked > 0) { target *= 0.93; s.blocked -= DT; }
        // 加減速の上限
        const acc = s.v < 10 ? 3.6 : 0.7 + s.pow * 0.006;
        const dv = U.clamp(target - s.v, -1.4 * DT, acc * DT);
        const vPrev = s.v;
        s.v = Math.max(0, s.v + dv);
        // スタミナの消耗（自分の巡航より速いほど重い）
        const ratio = s.v / s.vc;
        s.E -= (s.v * DT) / s.Ds * 0.9 * ratio * ratio * ratio * (s.kakari && prog < 0.5 ? 1.15 : 1);
        const xPrev = s.x;
        s.x += (vPrev + s.v) / 2 * DT;
        if (s.t600 == null && s.x >= D - 600) s.t600 = t - DT + (D - 600 - xPrev) / Math.max(0.1, s.x - xPrev) * DT;
        if (s.x >= D) {
          s.finishT = t - DT + (D - xPrev) / Math.max(0.1, s.x - xPrev) * DT;
          s.done = true; finished++;
          if (winnerT == null) { winnerT = s.finishT; }
        }
      }
      // 進路（描画用）：前から順に、近くの馬と重ならない一番内の位置
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
      // 実況
      if (step % 5 === 0) {
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
        late: s.late, blocked: s.blockedOnce && s.blocked !== 0, power: s.A,
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
