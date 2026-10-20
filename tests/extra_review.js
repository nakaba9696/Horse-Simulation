// 確かめ：外部レビューの指摘への対応（持ち主の決定 2026-10-20「全部Codexにしたがって」）
// 史実馬に損な技を能力の数から付けない・出遅れ癖の気性の下げから馬込み× が付かない・固有の技の速さがふつうの技に上書きされない
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const H = HS.Horse, K = HS.Skills, D = HS.DATA;
  const BAD = K.LIST.filter(k => k.bad).map(k => k.id);
  const hist = name => { const i = D.historic.findIndex(d => d.name === name); assert(i >= 0, `${name} がいない`); return H.fromHistoric(D.historic[i], i); };

  check('review: 出遅れ癖の馬（タニノムーティエ・ヒカルイマイ）に馬込み× が付かない', () => {
    for (const name of ['タニノムーティエ', 'ヒカルイマイ']) {
      const h = hist(name);
      assert(h.skills.includes('deokure'), `${name} に出遅れ癖が無い（確かめの前提）`);
      for (const w of [null, H.weekIndex(h.born + 3, 5, 1), H.weekIndex(h.born + 4, 10, 1)]) assert(!K.of(h, w).includes('kongomi'), `${name} に馬込み× が付く`);
    }
  });

  check('review: 史実馬に損な技を能力の数から付けない・手で決めた馬には付く・架空の馬は今まで通り', () => {
    // 史実馬（trig を手で決めていない馬）は全部、損な技を持たない
    let n = 0;
    D.historic.forEach((d, i) => {
      const h = H.fromHistoric(d, i);
      if (h.trigFixed) return;
      const t = K.of(h, null);
      const bad = t.filter(id => BAD.includes(id));
      assert(!bad.length, `${d.name} に ${bad.map(K.label).join('・')} が付く`);
      n++;
    });
    assert(n > 1000, `確かめた史実馬が少ない（${n}頭）`);
    // ハルウララ（低い能力）にささり癖が付かない
    assert(!K.of(hist('ハルウララ'), null).includes('sasari'), 'ハルウララにささり癖が付く');
    // trig で手で決めた馬には付く
    const d0 = Object.assign({}, D.historic.find(d => d.name === 'ハルウララ'), { trig: ['sasari', 'kongomi'] });
    const h0 = H.fromHistoric(d0, 0);
    assert(K.of(h0, null).includes('sasari') && K.of(h0, null).includes('kongomi'), '手で決めた損な技が付かない');
    // 架空の馬は今まで通り、能力の数から付く（能力の低い逃げ馬 → ささり癖・馬込み× など）
    const rng = new HS.U.RNG(7);
    const f = H.makeFiller(rng, { level: 70, surface: '芝', dist: 2000, born: 2000 });
    f.style = '逃げ'; f.kire = 3;
    for (const k of Object.keys(f.pot)) f.pot[k] = 60;
    const t = K.of(f, null);
    assert(t.some(id => BAD.includes(id)), `架空の馬に損な技が付かない（${t.join('・')}）`);
    // 史実馬の印だけ変えると付く（同じ能力で、付けないのは史実馬だけ）
    const g = Object.assign({}, f, { hist: true });
    assert(!K.of(g, null).some(id => BAD.includes(id)), '史実馬の印で損な技が外れない');
  });

  check('review: 固有の技の速さが、ふつうの技に上書きされない（強いほうが残る）', () => {
    const U = K.UNIQUE_OF['ディープインパクト'], C = K.BY.chokusen;
    assert(U && C, '衝撃の飛翔か直線一気が無い');
    const run = (first, second, E) => {
      const sim = { t: 30, st: [] }, s = { E, boost: null, topAdd: 0 };
      sim.st.push(s);
      K.apply(sim, s, first); sim.t += 0.5; K.apply(sim, s, second);
      return s.boost;
    };
    for (const E of [0.2, 0.5, 1]) {
      // 固有 → ふつう：固有が残る
      let b = run(U, C, E);
      assert(b.id === U.id, `E=${E}：衝撃の飛翔が直線一気に上書きされる（${b.id}）`);
      // ふつう → 固有：固有に替わる
      b = run(C, U, E);
      assert(b.id === U.id, `E=${E}：直線一気のあとの衝撃の飛翔が効かない（${b.id}）`);
    }
    // 切れたあとなら、弱い技でも効く
    const sim = { t: 30, st: [] }, s = { E: 0.5, boost: null, topAdd: 0 };
    K.apply(sim, s, U); sim.t += 10; K.apply(sim, s, C);
    assert(s.boost.id === 'chokusen', '切れたあとの直線一気が効かない');
  });
};
