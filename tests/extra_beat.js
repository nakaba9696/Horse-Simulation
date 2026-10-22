// 検証：拍子（しごく手が馬の1完歩に合うと少し得）と、ゲートを出たあとの隊列（docs/FEEL.md 8・js/core/racesim.js の S.BEAT・S.START_STYLE・S.FAN）
module.exports = function (check, assert, HS) {
  const S = HS.Sim, U = HS.U, H = HS.Horse;
  const B = require('../tools/balance_bench.js');
  const N = process.env.QUICK ? 80 : 200;

  // 自分で乗る馬を道中（800m）まで進めた模擬
  const mid = () => {
    const rng = new U.RNG(7), field = [];
    for (let i = 0; i < 10; i++) { const h = H.makeFiller(rng, { level: 82, surface: '芝', dist: 2000, born: 2000 }); h.name = 'h' + i; field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1, rider: i === 0 ? 'P' : undefined }); }
    const sim = S.create({ dist: 2000, surface: '芝', course: '東京', ground: '良', year: 2004 }, field, H.weekIndex(2004, 5, 1), new U.RNG(3), { ride: true });
    S.ctl.up(sim); while (sim.st[0].x < 800) S.step(sim);
    return sim;
  };
  const offOf = s => { let o = Math.abs(S.beatPhase(s) - S.BEAT.at); return o > 0.5 ? 1 - o : o; };

  check('beat: 首が下がって前へ伸びる所でしごくと拍子が合い、手綱の段が大きく動く。連打と外れた所は数えない', () => {
    // 拍子の合う刻みと外れた刻みを探す
    const sim = mid(), s = sim.st[0];
    while (offOf(s) > S.BEAT.win * 0.5) S.step(sim);
    sim.ctl.gear = 0; sim.ctl.taps = [];
    const r1 = S.ctl.up(sim), g1 = sim.ctl.gear;
    assert(r1 === 'beat' && sim.ctl.beats === 1, `拍子の合う所で ${r1}`);
    const r2 = S.ctl.up(sim); // 同じ刻みの連打
    assert(r2 !== 'beat' && sim.ctl.beats === 0, `連打が拍子に数えられた（${r2}）`);
    const sim2 = mid(), s2 = sim2.st[0];
    while (offOf(s2) < 0.4) S.step(sim2);
    sim2.ctl.gear = 0; sim2.ctl.taps = [];
    const r3 = S.ctl.up(sim2), g3 = sim2.ctl.gear;
    assert(r3 === 'ok', `外れた所で ${r3}`);
    assert(Math.abs(g1 - g3 * S.BEAT.gear) < 1e-9, `段の動き 合う ${g1}・外れ ${g3}`);
    // 続けて合わせると数が増え、追い出してから伸びる（S.onBeat）
    let n = 0;
    for (let k = 0; k < 60 && n < 3; k++) { S.step(sim); if (offOf(s) < S.BEAT.win * 0.5 && sim.t - sim.ctl.lastPush > 0.3) { S.ctl.up(sim); n++; } }
    assert(sim.ctl.beats >= 3 && S.onBeat(sim, s, sim.ctl), `続けて合わせた数 ${sim.ctl.beats}`);
    return `段の動き 合う ${g1.toFixed(3)}・外れ ${g3.toFixed(3)}・続けて ${sim.ctl.beats} 回`;
  });

  check('beat: 拍子に合わせて追うと、段を上げたまま手を止める（ただ追う）より少し良く、連打は得にならない', () => {
    const out = [];
    for (const style of ['先行', '差し']) {
      const r = {}; for (const p of ['push', 'beat', 'mash']) r[p] = B.bench({ style, mind: 88, policy: p, N, seed: 61 });
      const gain = r.push.pos - r.beat.pos;
      assert(gain > 0.05 && gain < 0.9, `${style}：拍子の得 ${gain.toFixed(2)}（ただ追う ${r.push.pos.toFixed(2)}・拍子 ${r.beat.pos.toFixed(2)}）`);
      assert(r.mash.pos > r.push.pos - 0.15, `${style}：連打 ${r.mash.pos.toFixed(2)} がただ追う ${r.push.pos.toFixed(2)} より良い`);
      out.push(`${style} 平均着順 ただ追う${r.push.pos.toFixed(2)}・拍子${r.beat.pos.toFixed(2)}・連打${r.mash.pos.toFixed(2)}`);
    }
    return out.join('　');
  });

  check('start: ゲートを出て数秒で脚質ごとに前後へ分かれ、内へはゆっくり寄る', () => {
    const rng = new U.RNG(3), acc = {};
    let outer = 0, on = 0;
    for (let k = 0; k < 20; k++) {
      const field = []; for (let i = 0; i < 16; i++) { const h = H.makeFiller(rng, { level: 82, surface: '芝', dist: 2400, born: 2000 }); field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 }); }
      const sim = S.create({ dist: 2400, surface: '芝', course: '東京', ground: '良' }, field, H.weekIndex(2004, 5, 1), rng, {});
      while (sim.t < 4 - 1e-9) S.step(sim);
      const lead = Math.max(...sim.st.map(s => s.x));
      for (const s of sim.st) { const a = acc[s.h.style] = acc[s.h.style] || { n: 0, gap: 0 }; a.n++; a.gap += lead - s.x; }
      for (const s of sim.st.slice(12)) { outer += s.lane; on++; }
    }
    const g = st => acc[st] ? acc[st].gap / acc[st].n : NaN;
    assert(g('追込') - g('逃げ') > 4, `4秒で 逃げ ${g('逃げ').toFixed(1)}m・追込 ${g('追込').toFixed(1)}m（差が小さい）`);
    assert(outer / on > 3, `外の枠（13〜16番）の進路が 4 秒で ${(outer / on).toFixed(1)}（内へ寄るのが速すぎる）`);
    return `4秒で先頭からの差 逃げ${g('逃げ').toFixed(1)}m・先行${g('先行').toFixed(1)}m・差し${g('差し').toFixed(1)}m・追込${g('追込').toFixed(1)}m　外の枠の進路 ${(outer / on).toFixed(1)}`;
  });
};
