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
