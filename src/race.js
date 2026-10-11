// レースのシミュレーション（画面に依存しない。シードが同じなら結果も同じ）
(function (HS) {
  const DT = 0.1;          // 1 ステップの秒数
  const FRAME_EVERY = 2;   // 何ステップごとに位置を記録するか
  const SPURT_FROM = 0.72; // 残りこの割合からスパート

  function stableHash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // 1 頭ぶんの、このレースでの基礎値
  function prepareRunner(horse, race, rng) {
    const s = horse.stats;
    const apt = HS.APTITUDE[horse.aptitude[race.surface]];
    const diff = Math.abs(race.distance - horse.bestDistance);
    const fit = 1 - Math.min(0.02, (diff / 1000) * 0.01);
    const cond = 1 - HS.CONDITIONS[race.condition].penalty * (1 - s.power / 140);
    // その日の出来：調子と疲れも効く
    const form = (1 + rng.normal() * 0.012) * (1 + (horse.condition || 0) * 0.004) * (1 - ((horse.fatigue || 0) / 100) * 0.02);
    return {
      horse,
      base: (16.3 + s.speed * 0.02) * apt * fit * cond * form,
      hpMax: 900 + s.stamina * 16,
      hp: 900 + s.stamina * 16,
      accel: 0.4 + s.power * 0.008,
      x: 0, v: 0, noise: 0,
      finished: false, time: null, exhaustedAt: null,
      form,
    };
  }

  function simulateRace(race, horses, seed, options) {
    const opts = options || {};
    const rng = HS.createRng(seed);
    const D = race.distance;
    const runners = horses.map((h) => prepareRunner(h, race, rng));
    const nigeCount = horses.filter((h) => h.style === 'nige').length;
    const heavyDrain = 1 + HS.CONDITIONS[race.condition].penalty * 3;
    const frames = [];
    let t = 0;
    let step = 0;
    let finishedCount = 0;
    const maxSteps = Math.ceil((D / 8) / DT); // 念のための上限

    while (finishedCount < runners.length && step < maxSteps) {
      let leaderX = 0;
      for (const r of runners) if (r.x > leaderX) leaderX = r.x;

      for (const r of runners) {
        if (r.finished) continue;
        const s = r.horse.stats;
        const style = HS.STYLES[r.horse.style];
        const p = r.x / D;
        const phase = p < 0.33 ? 0 : p < 0.67 ? 1 : 2;
        let target = r.base * style.pace[phase];

        // 賢さが低いと序盤にかかって脚を使う
        if (phase === 0) target *= 1 + (50 - s.wits) * 0.0003;

        // スパート：パワーで伸び、根性で競り合いに強くなる
        if (p >= SPURT_FROM) {
          target *= 1.02 + s.power * 0.0003;
          const gap = leaderX - r.x;
          if (gap < 6) target *= 1 + s.guts * 0.0002;
        }

        // スタミナ切れ
        if (r.hp <= 0) {
          target *= 0.86 + s.guts * 0.0008;
          if (r.exhaustedAt === null) r.exhaustedAt = r.x;
        }

        // 走りのぶれ（賢さが高いほど小さい）。1 秒ごとにゆるく変わる
        if (step % 10 === 0) {
          const sigma = 0.024 - s.wits * 0.00012;
          r.noise = r.noise * 0.6 + rng.normal() * sigma;
        }
        target *= 1 + r.noise;

        // スタート直後は全馬が一気に加速する（パワーで少しだけ差がつく）
        const accel = t < 6 ? 3 + s.power * 0.012 : r.accel;
        if (r.v < target) r.v = Math.min(target, r.v + accel * DT);
        else r.v = Math.max(target, r.v - 0.8 * DT);

        // スタミナの消費：速いほど大きい。逃げが複数いると競り合って余計に減る
        const rel = r.v / 18;
        let drain = 12 * rel * rel * DT * heavyDrain;
        if (r.horse.style === 'nige' && nigeCount > 1 && phase === 0) drain *= 1.15;
        r.hp -= drain;

        const prevX = r.x;
        r.x += r.v * DT;
        if (r.x >= D) {
          const frac = (D - prevX) / (r.x - prevX);
          r.time = t + frac * DT;
          r.x = D;
          r.finished = true;
          finishedCount++;
        }
      }
      t += DT;
      step++;
      if (opts.record && step % FRAME_EVERY === 0) {
        frames.push({ t, xs: runners.map((r) => r.x), hp: runners.map((r) => Math.max(0, r.hp / r.hpMax)) });
      }
    }

    const results = runners
      .map((r, i) => ({
        index: i,
        horseId: r.horse.id,
        name: r.horse.name,
        time: r.time === null ? Infinity : r.time,
        exhausted: r.exhaustedAt !== null,
        form: r.form,
      }))
      .sort((a, b) => a.time - b.time);
    results.forEach((res, i) => {
      res.rank = i + 1;
      res.margin = i === 0 ? '' : marginLabel(res.time - results[i - 1].time);
    });
    return { results, frames, frameDt: DT * FRAME_EVERY };
  }

  // 着差の表示（1 馬身はおよそ 0.17 秒）
  function marginLabel(dt) {
    if (dt < 0.02) return 'ハナ';
    if (dt < 0.05) return 'アタマ';
    if (dt < 0.09) return 'クビ';
    const lengths = dt / 0.17;
    if (lengths < 0.75) return '1/2';
    if (lengths < 1.25) return '1';
    if (lengths < 1.75) return '1 1/2';
    if (lengths < 2.25) return '2';
    if (lengths < 2.75) return '2 1/2';
    if (lengths < 3.5) return '3';
    if (lengths < 4.5) return '4';
    if (lengths < 5.5) return '5';
    if (lengths < 7) return '6';
    if (lengths < 10) return '8';
    return '大差';
  }

  HS.simulateRace = simulateRace;
  HS.stableHash = stableHash;
})(globalThis.HS = globalThis.HS || {});
