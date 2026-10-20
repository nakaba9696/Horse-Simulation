// 検証：当たり判定（持ち主の指摘 2026-10-20「馬と馬が重なって抜ける」「何もない所にぶつかる」「自分の馬が勝手に横へ移動することがある」）と、
// 競り合いは根性（底力）で粘る・落ちる（持ち主の決定 2026-10-20）。数は docs/BALANCE.md「2-3d. 当たり判定」「2-6. 競り合い」
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const S = HS.Sim, U = HS.U, H = HS.Horse, B = S.BODY;
  const EPS = 1e-4;
  const field = (rng, n, dist, me) => {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ horse: H.makeFiller(rng, { level: 80, surface: '芝', dist, born: 2000 }), jockey: { skill: 75 }, weight: 57, num: i + 1, frame: i + 1, rider: i === me ? 'P' : null });
    return out;
  };
  // 走っている（出た・まだゴールしていない）馬どうしで、いちばん重なっている組
  const overlap = sim => {
    const L = sim.st.filter(s => !s.done && sim.t >= s.delay);
    let bad = null;
    for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) {
      const ax = Math.abs(L[a].x - L[b].x), al = Math.abs(L[a].lane - L[b].lane);
      if (ax < B.len - EPS && al < B.wid - EPS) bad = `${L[a].i}と${L[b].i}（前後 ${ax.toFixed(2)}m・横 ${(al * S.LANE_M).toFixed(2)}m）`;
    }
    return bad;
  };

  check('collision: 判定の大きさは 3D の馬と同じ（前後1馬身・横は馬の幅＋間）。描画の1進路と模擬の1進路が同じ m', () => {
    const fs = require('fs'), path = require('path');
    const view = fs.readFileSync(path.join(__dirname, '..', 'godot/view/race_view.gd'), 'utf8');
    const m = view.match(/const LANE_M := ([\d.]+)/);
    assert(m && Number(m[1]) === S.LANE_M, `描画の LANE_M ${m && m[1]}・模擬 ${S.LANE_M}`);
    assert(B.len === 2.4 && B.wid * S.LANE_M >= 0.75 && B.wid * S.LANE_M <= 0.9, `前後 ${B.len}m・横 ${B.wid * S.LANE_M}m`);
    assert(S.LANE.dx >= B.len && S.LANE.gap >= B.wid && S.SABAKI.dx >= B.len && S.SABAKI.gap >= B.wid, '横の移動の止まる幅が判定より小さい');
    return `前後 ${B.len}m・横 ${(B.wid * S.LANE_M).toFixed(2)}m（${B.wid}進路）`;
  });

  check('collision: 全部のコマで、走っている馬どうしが判定の大きさより近づかない（種と頭数を変えて）', () => {
    let steps = 0;
    for (const [seed, n, dist, course] of [[1, 8, 1200, '中山'], [2, 12, 1600, '東京'], [3, 16, 2000, '京都'], [4, 18, 2400, '東京'], [5, 18, 1800, '阪神'], [6, 14, 3000, '京都']]) {
      for (const ride of [false, true]) {
        const rng = new U.RNG(seed * 7 + (ride ? 1 : 0));
        const sim = S.create({ dist, surface: '芝', course, ground: '良', year: 2004 }, field(rng, n, dist, ride ? n - 2 : -1), H.weekIndex(2004, 5, 1), rng, { ride });
        let k = 0;
        while (!S.step(sim)) {
          if (ride && !sim.ctl.started) S.ctl.up(sim);
          // 自分の馬：ときどき左右を押す（ぶつかる場面を作る）
          if (ride && ++k % 23 === 0) S.ctl.lane(sim, k % 46 === 0 ? -1 : 1);
          const bad = overlap(sim);
          assert(!bad, `種${seed}・${n}頭・${dist}m${ride ? '（自分で乗る）' : ''}・${sim.t.toFixed(1)}秒：${bad}`);
          steps++;
        }
      }
    }
    return `${steps}コマで重なり 0`;
  });

  check('collision: 自分の馬は、左右を押さない限り横の位置が変わらない（ゲートの進路のまま）', () => {
    let moved = 0;
    for (const seed of [11, 12, 13, 14]) {
      for (const me of [0, 6, 13]) {
        const rng = new U.RNG(seed);
        const sim = S.create({ dist: 2000, surface: '芝', course: '東京', ground: '良', year: 2004 }, field(rng, 16, 2000, me), H.weekIndex(2004, 5, 1), rng, { ride: true });
        const s = sim.st[me], l0 = s.lane;
        while (!S.step(sim)) {
          if (!sim.ctl.started) S.ctl.up(sim);
          if (s.done) break;
          assert(s.lane === l0, `種${seed}・${me + 1}番：${sim.t.toFixed(1)}秒で進路が ${l0}→${s.lane.toFixed(2)}`);
        }
        moved++;
      }
    }
    return `${moved}レース、押さないで乗って進路は動かない`;
  });

  check('collision: 押されたら（AI の馬が触れたら）揺れの印が出る。押した向きの注文はぶつかった所で止まり、戻らない', () => {
    const rng = new U.RNG(21);
    const sim = S.create({ dist: 1600, surface: '芝', course: '東京', ground: '良', year: 2004 }, field(rng, 10, 1600, 0), H.weekIndex(2004, 5, 1), rng, { ride: true });
    const me = sim.st[0];
    while (sim.t < 30) { if (!sim.ctl.started) S.ctl.up(sim); S.step(sim); }
    // 外の横に1頭置いて、外へ押す
    const o = sim.st[1], l0 = me.lane;
    S.ctl.lane(sim, 1);
    for (let i = 0; i < 4; i++) { o.x = me.x + 0.5; o.lane = l0 + 0.7; o.v = me.v; S.step(sim); }
    assert(sim.ctl.bumpT != null && sim.ctl.bumpSide === 1, `横の馬にぶつかった印が無い（${sim.ctl.bumpT}・${sim.ctl.bumpSide}）`);
    const stop = me.lane;
    assert(sim.ctl.lane === stop && stop >= l0, `ぶつかった所で止まらない・戻った（${l0}→${stop}・注文 ${sim.ctl.lane}）`);
    // AI の馬が横から寄ってきて重なる：自分の馬は動かず、相手が押し返される・印が出る
    for (let i = 0; i < 10; i++) S.step(sim);
    const t0 = sim.t, l1 = me.lane;
    o.x = me.x; o.lane = me.lane + 0.2; sim.ctl.bumpT = null;
    S.separate(sim);
    assert(me.lane === l1 && Math.abs(o.lane - me.lane) >= B.wid - EPS, `寄ってきた馬に自分の馬が押された（${l1}→${me.lane}・相手 ${o.lane}）`);
    assert(sim.ctl.bumpT === t0, '寄ってきた馬に触れても印が出ない');
    return `外へ押して ${l0}→${stop.toFixed(2)} で止まる・寄ってきた馬は ${o.lane.toFixed(2)} へ押し返す`;
  });

  check('collision: 前が空いていれば止まらない（横に馬の幅より離れた馬は壁にならない）', () => {
    const rng = new U.RNG(31);
    const sim = S.create({ dist: 1600, surface: '芝', course: '東京', ground: '良', year: 2004 }, field(rng, 6, 1600, 0), H.weekIndex(2004, 5, 1), rng, { ride: true });
    const me = sim.st[0];
    while (sim.t < 25) { if (!sim.ctl.started) S.ctl.up(sim); S.step(sim); }
    // すぐ前・斜め（横 0.6 進路＝約1m）に遅い馬：見た目では前は空いている
    const o = sim.st[1];
    let minV = 99;
    for (let i = 0; i < 20; i++) { o.x = me.x + 1.8; o.lane = me.lane + 0.6; o.v = me.v - 3; S.step(sim); assert(!sim.ctl.blockedNow, `横に ${(0.6 * S.LANE_M).toFixed(2)}m 離れた馬で前が詰まった`); minV = Math.min(minV, me.v); }
    const free = me.v;
    // 真後ろに付けると詰まる（速さを前の馬に合わせて落とす）
    o.lane = me.lane; o.x = me.x + 2.5; o.v = me.v - 3; S.step(sim);
    assert(sim.ctl.blockedNow, '真前の馬で詰まらない');
    // ふつうのレース：前（判定の箱＋0.2m）に馬がいないのに詰まった印が出ない
    for (const seed of [41, 42, 43]) {
      const r2 = new U.RNG(seed);
      const s2 = S.create({ dist: 2000, surface: '芝', course: '京都', ground: '良', year: 2004 }, field(r2, 16, 2000, 5), H.weekIndex(2004, 5, 1), r2, { ride: true });
      const m = s2.st[5];
      for (;;) {
        // 印は刻みの途中で、刻みの前の進路（進路は刻みの終わりに動く）と、その刻みで進んだ分（0.1秒で 2m まで）で決まる
        const snap = s2.st.map(o2 => ({ o: o2, x: o2.x, lane: o2.lane, done: o2.done })), mx = m.x, ml = m.lane;
        if (S.step(s2)) break;
        if (!s2.ctl.started) S.ctl.up(s2);
        if (m.done) break;
        if (s2.ctl.blockedNow) assert(snap.some(p => p.o !== m && !p.done && p.x - mx > -2 && p.x - mx < B.len + 0.2 + 2 && Math.abs(p.lane - ml) < B.wid), `種${seed}・${s2.t.toFixed(1)}秒：前に馬がいないのに詰まった`);
      }
    }
    return `斜め前の遅い馬の横を ${free.toFixed(1)}m/s で抜ける（最も遅くて ${minV.toFixed(1)}）`;
  });

  check('fight: 競り合うと根性（底力）の高い馬は粘り、低い馬は速さが落ちる。70前後はほぼ変わらない', () => {
    const F = S.FIGHT;
    const mk = (guts, lane) => ({ guts, lane, x: 1700, v: 17, done: false, spurting: true, fight: 0, duel: null, fightPeak: 0 });
    const mul = s => 1 + F.spd * s.fight / F.per;
    const rows = [];
    for (const g of [50, 70, 90, 110]) {
      const a = mk(g, 1), b = mk(80, 2);
      const sim = { st: [a, b], straight: 400, D: 2000 };
      for (let i = 0; i < 60; i++) S.fightStep(sim, a, 300, 0.85);
      rows.push([g, (mul(a) - 1) * 100]);
    }
    const p = Object.fromEntries(rows);
    assert(p[50] < -0.5 && Math.abs(p[70]) < 0.05 && p[90] > 0.5 && p[110] > p[90], `競り合い中の速さ ${rows.map(r => `根性${r[0]} ${r[1].toFixed(2)}%`).join('・')}`);
    // 離れた馬・道中（3コーナーより前）は動かない
    const far = mk(110, 6), c = mk(110, 1), d = mk(70, 2); c.spurting = d.spurting = false;
    const sim2 = { st: [far, c, d], straight: 400, D: 2000 };
    for (let i = 0; i < 50; i++) { S.fightStep(sim2, far, 300, 0.85); S.fightStep(sim2, c, 1200, 0.4); }
    assert(far.fight === 0 && c.fight === 0, '離れた馬・道中の並走で速さが変わった');
    // 同じ相手と並んで直線を走ると、根性の高い馬が前に出て、低い馬が下がる（同じ強さ・同じ種で根性だけ変える）
    const duel = guts => {
      const rng = new U.RNG(77);
      const fl = field(rng, 2, 2000, -1);
      const sim = S.create({ dist: 2000, surface: '芝', course: '京都', ground: '良', year: 2004 }, fl, H.weekIndex(2004, 5, 1), rng, {});
      // 残り450mで2頭を同じ馬・同じ位置・同じ脚の残りにして（根性だけ変える）、横に並べて走らせる
      const [a, b] = sim.st;
      while (!S.step(sim) && Math.max(a.x, b.x) < 2000 - 450) { /* 進める */ }
      for (const k of Object.keys(b)) if (!['r', 'h', 'i', 'me', 'fired', 'trig', 'passive', 'boost', 'sk', 'duel'].includes(k) && typeof b[k] !== 'object') a[k] = b[k];
      a.h = Object.assign({}, b.h, { name: 'A' }); a.trig = b.trig.slice(); a.sk = Object.assign({}, b.sk); a.boost = null; b.boost = null;
      a.guts = guts; b.guts = 70; a.fight = b.fight = 0;
      a.lane = 0; b.lane = 1;
      while (!S.step(sim)) { a.lane = 0; b.lane = 1; if (a.done && b.done) break; }
      const r = S.finish(sim).results;
      return r.find(x => x.num === 1).time - r.find(x => x.num === 2).time; // 負＝根性を変えた馬が先着
    };
    // 並びの順などの差を消すため、根性70どうしの差からの動きで見る
    const base = duel(70), hi = duel(100) - base, lo = duel(45) - base;
    assert(hi < -0.02 && lo > 0.02, `根性100 で ${hi.toFixed(3)}秒・根性45 で ${lo.toFixed(3)}秒（根性70どうしと比べて）`);
    return rows.map(r => `根性${r[0]} ${r[1] >= 0 ? '+' : ''}${r[1].toFixed(1)}%`).join('・') + `　並んで直線（根性70の相手と）：根性100 ${(-hi).toFixed(2)}秒前へ・根性45 ${lo.toFixed(2)}秒後ろへ`;
  });
};
