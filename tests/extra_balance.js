// 検証：立ち回りの噛み合い（脚質×ペース読み×特殊能力×気性）と、競り合いの気合（docs/BALANCE.md）
// 決まった乗り方の打ち手（tests/ridebot.js）で、同じ相手と種を固定して走らせて比べる
module.exports = function (check, assert, HS) {
  const S = HS.Sim;
  const B = require('../tools/balance_bench.js');
  const N = process.env.QUICK ? 50 : 80;

  check('balance: 噛み合った乗り方はおまかせより勝ち、噛み合わない乗り方は負ける', () => {
    const out = [];
    for (const style of ['先行', '差し']) {
      const r = {};
      for (const p of ['omakase', 'fit', 'misfit']) r[p] = B.bench({ style, mind: 88, policy: p, N, seed: 51 });
      assert(r.fit.pos < r.omakase.pos - 0.5, `${style}：噛み合った乗り方 ${r.fit.pos.toFixed(2)} がおまかせ ${r.omakase.pos.toFixed(2)} より良くない`);
      assert(r.misfit.pos > r.omakase.pos + 1.5, `${style}：噛み合わない乗り方 ${r.misfit.pos.toFixed(2)} がおまかせ ${r.omakase.pos.toFixed(2)} より大きく悪くない`);
      out.push(`${style} 平均着順 噛み合った${r.fit.pos.toFixed(1)}・おまかせ${r.omakase.pos.toFixed(1)}・噛み合わない${r.misfit.pos.toFixed(1)}`);
    }
    return out.join('　');
  });

  check('balance: 気性の荒い馬は、脚質と違う位置へ動かすと掛かって大きく負ける（穏やかな馬は融通がきく）', () => {
    const hot = B.bench({ style: '差し', mind: 48, policy: 'misfit', N, seed: 52 });
    const calm = B.bench({ style: '差し', mind: 88, policy: 'misfit', N, seed: 52 });
    assert(hot.kakari > 0.5 && calm.kakari < 0.2, `掛かった割合 荒い ${hot.kakari}・穏やか ${calm.kakari}`);
    assert(hot.pos > calm.pos + 0.6, `荒い馬 ${hot.pos.toFixed(2)}・穏やかな馬 ${calm.pos.toFixed(2)} で差が小さい`);
    return `噛み合わない乗り方で 荒い馬 平均着順${hot.pos.toFixed(1)}・掛かり${Math.round(hot.kakari * 100)}%／穏やかな馬 ${calm.pos.toFixed(1)}・${Math.round(calm.kakari * 100)}%`;
  });

  check('balance: 競り合うと根性の高い馬は気合が上がり、低い馬はひるむ。気合は直線の伸びに効く', () => {
    // すぐ横に並んだ2頭（直線）で、気合の動きを見る
    const mk = (guts, lane) => ({ guts, lane, x: 1700, v: 17, done: false, spurting: true, narabu: false, fight: 0, duel: null, fightPeak: 0 });
    const a = mk(95, 1), b = mk(55, 2), far = mk(80, 5);
    const sim = { st: [a, b, far], straight: 400, D: 2000 };
    far.x = 1650;
    for (let i = 0; i < 50; i++) { S.fightStep(sim, a, 300, 0.85); S.fightStep(sim, b, 300, 0.85); S.fightStep(sim, far, 350, 0.82); }
    assert(a.fight > 30 && a.duel === b, `根性95の馬の気合が上がらない（${a.fight.toFixed(1)}）`);
    assert(b.fight < 0, `根性55の馬がひるまない（${b.fight.toFixed(1)}）`);
    assert(far.fight === 0 && !far.duel, '離れた馬の気合が動いた');
    const peak = a.fight;
    b.x = 1600; for (let i = 0; i < 30; i++) S.fightStep(sim, a, 280, 0.86);
    assert(a.fight < peak && a.fight > peak * 0.5, `競り合いが終わると少しずつ戻る（${peak.toFixed(1)}→${a.fight.toFixed(1)}）`);
    // 道中（3コーナーより前）では上がらない
    const c = mk(95, 1), d = mk(70, 2); c.spurting = d.spurting = false;
    const sim2 = { st: [c, d], straight: 400, D: 2000 };
    for (let i = 0; i < 50; i++) S.fightStep(sim2, c, 1200, 0.4);
    assert(c.fight === 0, '道中の並走で気合が上がった');
    // 強さが同じなら（根性の分をスピードで埋め合わせる）、根性の高い馬のほうが着順が良い
    const hi = B.bench({ guts: 95, policy: 'omakase', N: N * 2, seed: 53 }), lo = B.bench({ guts: 55, policy: 'omakase', N: N * 2, seed: 53 });
    assert(hi.pos < lo.pos - 0.4, `根性95 ${hi.pos.toFixed(2)}・根性55 ${lo.pos.toFixed(2)}`);
    return `5秒並んで気合 根性95→${peak.toFixed(0)}・根性55→${b.fight.toFixed(0)}　平均着順 根性95 ${hi.pos.toFixed(2)}・根性55 ${lo.pos.toFixed(2)}`;
  });

  // 折り合い：自分で乗る馬を道中（600m）まで進め、気分を決めてから手綱を固定して比べる（同じ種なので、違いは手綱だけ）
  const U = HS.U, H = HS.Horse;
  const mid = (o) => {
    const rng = new U.RNG(5), field = [];
    for (let i = 0; i < 12; i++) { const h = H.makeFiller(rng, { level: 82, surface: '芝', dist: 2000, born: 2000 }); h.name = 'h' + i; if (i === 0) { h.style = '追込'; B.setMind(h, o.mind || 55); } field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1, rider: i === 0 ? 'P' : undefined }); }
    const sim = S.create({ dist: 2000, surface: '芝', course: '東京', ground: '良', year: 2004 }, field, H.weekIndex(2004, 5, 1), new U.RNG(9), { ride: true, bond: o.bond });
    S.ctl.up(sim); while (sim.st[0].x < 600) S.step(sim);
    sim.ctl.tension = o.tension; sim.ctl.surge = 0; sim.ctl.gear = o.gear;
    const tr = [];
    for (let i = 1; i <= (o.sec || 4) * 10; i++) { S.step(sim); if (i % 10 === 0) tr.push(sim.ctl.tension); }
    return { tr, c: sim.ctl, s: sim.st[0] };
  };
  check('oriai: 手綱でそっと引くと数秒かけて落ち着き、行きたがる馬を引きすぎるとケンカする', () => {
    const none = mid({ tension: 70, gear: 0 }), soft = mid({ tension: 70, gear: -0.3 }), hard = mid({ tension: 70, gear: -0.8 });
    const d1 = none.tr[0] - soft.tr[0], d4 = none.tr[3] - soft.tr[3];
    assert(d1 < 1.5 && d4 > 3 * Math.max(0.3, d1), `慣性が無い（1秒で ${d1.toFixed(1)}・4秒で ${d4.toFixed(1)} 下がった）`);
    assert(hard.tr[3] > soft.tr[3] + 10 && hard.c.reinFight && hard.s.headUp === 1, `引きすぎてもケンカしない（${hard.tr[3].toFixed(0)}・そっと ${soft.tr[3].toFixed(0)}）`);
    const relaxed = mid({ tension: 25, gear: -0.8 });
    assert(!relaxed.c.reinFight, '落ち着いた馬を後ろに置くだけでケンカした');
    // ムチへの素直さ
    assert(S.respOf({ spurtTension: 20 }) > S.respOf({ spurtTension: 80 }), '掛かっていた馬のほうがムチに素直');
    return `気分70から4秒：そのまま ${none.tr[3].toFixed(0)}・そっと引く ${soft.tr[3].toFixed(0)}（1秒では ${d1.toFixed(1)} しか下がらない）・引きすぎ ${hard.tr[3].toFixed(0)}`;
  });

  check('oriai: 周りの出来事に馬ごとに反応する（荒い馬は抜かれると行きたがり、臆病な馬は壁で縮こまる）', () => {
    const mkS = (mind, guts) => ({ h: { style: '差し', skills: [] }, mind, guts, trig: [], rk: 0.5, x: 1000, lane: 1, v: 16, done: false, i: 0 });
    const run = (mind, guts, setup) => {
      const s = mkS(mind, guts), o = { x: 999.5, lane: 1.5, v: 17, done: false, i: 1, h: { style: '先行' } };
      const sim = { st: [s, o], step: 0, t: 10, D: 2000, race: { surface: '芝' } };
      const c = { tension: 40, surge: 0, shrink: 0, pullT: 0, blockedNow: false, bondF: 1 };
      if (setup) setup(sim, s, o, c);
      S.oriaiStep(sim, s, c, 0, 0.5, null);
      return c;
    };
    const hot = run(48, 80), calm = run(88, 80);
    assert(hot.surge > calm.surge * 3 && hot.surge > 3, `抜かれたときの高ぶり 荒い ${hot.surge.toFixed(1)}・穏やか ${calm.surge.toFixed(1)}`);
    const wall = (sim, s, o, c) => { o.v = 16; o.x = 1002; o.lane = 1; c.blockedNow = true; };
    const coward = run(70, 50, wall), bold = run(55, 85, wall);
    assert(coward.shrink > 0.2 && coward.surge < 1, `臆病な馬が壁で縮こまらない（${coward.shrink.toFixed(2)}）`);
    assert(bold.surge > 0 && bold.shrink === 0, `気の荒い馬が壁で行きたがらない（${bold.surge.toFixed(1)}）`);
    return `抜かれる：荒い馬の高ぶり ${hot.surge.toFixed(1)}・穏やか ${calm.surge.toFixed(1)}　壁：臆病な馬は縮こまる ${coward.shrink.toFixed(2)}`;
  });

  check('oriai: 同じ馬に乗るほど（絆）折り合いがつきやすく、初騎乗は少し難しい', () => {
    assert(S.bondF(0) > S.bondF(3) && S.bondF(3) > S.bondF(12) && S.bondF(undefined) === 1, '絆の倍率');
    const a = B.bench({ style: '差し', mind: 55, policy: 'misfit', bond: 0, N, seed: 54 }), b = B.bench({ style: '差し', mind: 55, policy: 'misfit', bond: 12, N, seed: 54 });
    assert(b.tension < a.tension - 3 && b.kakari < a.kakari, `絆で変わらない（気分 ${a.tension.toFixed(0)}→${b.tension.toFixed(0)}・掛かり ${a.kakari}→${b.kakari}）`);
    // セーブ：前のセーブにも G.bond ができる
    const g = { horses: {} }; HS.World.migrate(g);
    assert(g.bond && typeof g.bond === 'object', '前のセーブに絆が無い');
    return `気性55の差しを脚質と違う位置で：初騎乗 気分${a.tension.toFixed(0)}・掛かり${Math.round(a.kakari * 100)}%／12回目 ${b.tension.toFixed(0)}・${Math.round(b.kakari * 100)}%`;
  });

  check('oriai: 頭の上げ具合と耳の向きを全馬が出す（3D 用）', () => {
    const rng = new U.RNG(8), field = [];
    for (let i = 0; i < 10; i++) field.push({ horse: H.makeFiller(rng, { level: 80, surface: '芝', dist: 1600, born: 2000 }), jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 });
    const sim = S.create({ dist: 1600, surface: '芝', course: '東京', ground: '良', year: 2004 }, field, H.weekIndex(2004, 5, 1), rng, {});
    let ok = true; while (!S.step(sim)) for (const s of sim.st) if (!(s.headUp >= 0 && s.headUp <= 1 && s.ears >= -1 && s.ears <= 1)) ok = false;
    assert(ok, '頭・耳の値が範囲の外');
    return '';
  });

  check('balance: 一気系の特殊能力は、ためた脚で伸びが変わり、終いの上限を上げる', () => {
    const K = HS.Skills;
    const s1 = { E: 0.5, me: false }, s2 = { E: 0.1, me: false };
    const sim = { t: 10, ctl: null };
    K.apply(sim, s1, K.BY.chokusen); K.apply(sim, s2, K.BY.chokusen);
    assert(s1.boost.mul > s2.boost.mul, `ためた脚で伸びが変わらない（${s1.boost.mul}・${s2.boost.mul}）`);
    assert(s1.topAdd > 0, '終いの上限が上がらない');
    return `直線一気の伸び スタミナ0.5→×${s1.boost.mul.toFixed(3)}・0.1→×${s2.boost.mul.toFixed(3)}`;
  });
};
