// ライバル騎手（js/core/rivals.js・data/rivals.js）の検証
module.exports = function (check, assert, HS) {
  const W = HS.World, U = HS.U, H = HS.Horse, S = HS.Sim, J = HS.Jockey, Rv = HS.Rivals, D = HS.DATA;
  const QUICK = !!process.env.QUICK;
  const SCENES = ['first', 'g1', 'streakL', 'streakW', 'afterWin', 'afterLoss', 'year', 'plain'];
  const newGame = seed => { W.newGame({ seed, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' }); return W.get(); };
  // 自分の馬を何頭か持たせて、何週か進める（おまかせで出走・おまかせで乗る）
  const play = (seed, weeks) => {
    const G = newGame(seed); G.player.money = 1e9;
    const pick = W.all().filter(h => h.owner !== 'P' && h.loc === 'stable' && h.hist && !h.foreignTrained && !G.rivals.ride[h.id])
      .sort((a, b) => H.overall(H.cur(b, 0)) - H.overall(H.cur(a, 0)) || (a.name < b.name ? -1 : 1)).slice(4, 10);
    for (const h of pick) { h.owner = 'P'; h.auto = true; }
    const peaks = [];
    for (let w = 0; w < weeks; w++) {
      if (G.week === 1 && G.month === 1 || w === 0) peaks.push({ y: G.year, p: Object.fromEntries(Rv.list().map(rv => [rv.id, Math.max(0, ...Rv.partners(rv.id).map(h => Math.max(HS.Season.fhPeak(h).turf, HS.Season.fhPeak(h).dirt))) ])) });
      W.finishWeek({});
    }
    return { G, peaks };
  };

  check('rivals: ライバルは3〜4人・架空の名前・型・札の色・場面ごとの台詞（2つずつ）・避ける癖', () => {
    const L = D.rivals;
    assert(L.length >= 3 && L.length <= 4, `ライバル ${L.length}人`);
    const real = new Set((D.jockeys || []).map(j => j.name));
    const fict = new Set([...(HS.Fictional ? HS.Fictional.map.values() : []), ...(HS.Fictional ? HS.Fictional.map.keys() : [])]);
    const owners = new Set((D.owners || []).map(o => o.name));
    const ids = new Set(), names = new Set(), types = new Set(), colors = new Set();
    for (const rv of L) {
      assert(!ids.has(rv.id) && !names.has(rv.name), '重複 ' + rv.name); ids.add(rv.id); names.add(rv.name);
      const flat = rv.name.replace(/\s/g, '');
      assert(!real.has(rv.name) && !real.has(flat) && !fict.has(rv.name) && !fict.has(flat) && !owners.has(rv.name), `${rv.name} が騎手・馬主の名前と重なる`);
      // 架空の騎手の姓とも重ねない（出走表で見分けにくい）
      const sur = rv.name.split(/\s/)[0];
      assert(![...real].some(n => n.startsWith(sur)), `${rv.name} の姓が騎手と重なる`);
      assert(Rv.TYPES[rv.type] && Rv.TYPE_LABEL[rv.type], `${rv.name} の型 ${rv.type}`);
      types.add(rv.type);
      assert(['美浦', '栗東'].includes(rv.region), `${rv.name} の所属`);
      assert(/^#[0-9a-f]{6}$/i.test(rv.colors.base) && /^#[0-9a-f]{6}$/i.test(rv.colors.sub) && !colors.has(rv.colors.base), `${rv.name} の札の色`); colors.add(rv.colors.base);
      assert(rv.crest.length === 1 && rv.name.includes(rv.crest), `${rv.name} の札の字 ${rv.crest}`);
      assert(rv.skill >= 55 && rv.max <= 92 && rv.max >= rv.skill && rv.styles.length && rv.dist[0] < rv.dist[1], `${rv.name} の腕前・好み`);
      for (const sc of SCENES) assert((rv.lines[sc] || []).length >= 2, `${rv.name} の ${sc} の台詞が足りない`);
      const all = JSON.stringify([rv.lines, rv.note]);
      for (const m of all.matchAll(/\{(\w+)\}/g)) assert(['me', 'horse', 'race'].includes(m[1]), `${rv.name} の文に知らない差し込み {${m[1]}}`);
      assert(!/どこか|少しだけ|そっと|ふと|まるで|気がした|胸が温かく|なぜか/.test(all), `${rv.name} の文に避ける癖の語`);
      assert(!/……/.test(all), `${rv.name} の文に「……」`);
      for (const sc of SCENES) for (const t of rv.lines[sc]) assert((t.match(/！/g) || []).length <= 1, `${rv.name} の「${t}」に「！」が2つ以上`);
      assert(!/\d+(\.\d+)?%|腕前\d|総合力\d/.test(all), `${rv.name} の文に内部の数値`);
    }
    assert(types.size === L.length, '型が重なっている');
    return `${L.map(rv => `${rv.name}（${rv.label}）`).join('・')}`;
  });

  // 1年（QUICK は半年）遊ぶ。下の確認で使い回す
  let run = null;
  const season = () => run || (run = play(21, QUICK ? 26 : 50));

  check('rivals: 毎年、強い史実馬（相棒の馬）に乗り、たくさんのレースに出てリーディングに絡む・新人は腕が上がる', () => {
    const G0 = newGame(5);
    for (const rv of Rv.list()) {
      const ps = Rv.partners(rv.id);
      assert(ps.length >= 2 && ps.length <= Rv.PARTNERS, `${rv.name} の相棒 ${ps.length}頭`);
      assert(ps.every(h => h.hist && h.owner !== 'P' && !h.foreignTrained), `${rv.name} の相棒に史実馬でない・自分の・外国の馬`);
      assert(new Set(ps.map(h => G0.year - h.born)).size === ps.length, `${rv.name} の相棒の年齢が重なる`);
    }
    const all = Object.keys(G0.rivals.ride); assert(new Set(all).size === all.length, '相棒の馬が二人に重なる');
    const { G, peaks } = season();
    const y = G.year - (G.month === 1 && G.week === 1 ? 1 : 0);
    const lead = J.leading(G.startYear || y);
    const out = [];
    for (const rv of Rv.list()) {
      const row = lead.find(x => x.name === rv.name);
      assert(row && row.rides >= (QUICK ? 25 : 50), `${rv.name} の騎乗が少ない（${row ? row.rides : 0}）`);
      const pk = peaks[0].p[rv.id];
      assert(pk >= (rv.type === 'rookie' ? 45 : 62), `${rv.name} の相棒が弱い（完成の総合力 ${pk}）`);
      out.push(`${rv.name} ${row.wins}/${row.rides}`);
    }
    const rk = Rv.list().find(r => r.type === 'rookie');
    assert(Rv.skillOf(rk, 0) < Rv.skillOf(rk, 3) && Rv.skillOf(rk, 30) === rk.max, '同期の新人の腕前が上がらない');
    const vet = Rv.list().find(r => r.type === 'veteran');
    assert(Rv.skillOf(vet, 0) === Rv.skillOf(vet, 5), 'ベテランの腕前が動く');
    // 相棒の馬に乗るレースでは、その馬の主戦騎手から乗り替わっている
    const wk = W.cards();
    // （同じレースに相棒の馬が2頭いれば、乗るのは1頭）
    for (const c of wk) for (const x of c.runners) { const id = G.rivals.ride[x.horse.id]; if (id && !x.mine && x.rider !== 'P') assert(c.runners.some(y => y.jockey && y.jockey.rival === id && G.rivals.ride[y.horse.id] === id), `${x.horse.name} に相棒の ${id} が乗っていない`); }
    return out.join('・');
  });

  check('rivals: 型ごとに乗り方が違う（位置取り・仕掛け・マーク）。ライバルのいないレースは前と同じ', () => {
    const G = newGame(3);
    let card = null;
    for (let i = 0; i < 30 && !card; i++) { card = W.cards().find(c => c.race.graded && c.race.region === 'JRA' && c.runners.length >= 14 && c.race.dist >= 1800); if (!card) W.finishWeek({}); }
    assert(card, '測るレースが無い');
    const wIdx = W.prepareWeek().wIdx;
    const base = card.runners.map(x => Object.assign({}, x, { jockey: { name: 'x' + x.num, skill: 75 }, rider: null }));
    const byP = base.slice().sort((a, b) => H.overall(H.cur(b.horse, wIdx)) - H.overall(H.cur(a.horse, wIdx)) || a.num - b.num);
    const subj = byP[1], me = byP[0];
    const N = QUICK ? 30 : 60;
    const run1 = (type, withMe) => {
      const o = { rk: 0, sp: 0, dist: 0, pos: 0 };
      for (let k = 0; k < N; k++) {
        const rs = base.map(x => Object.assign({}, x));
        const si = rs.findIndex(x => x.num === subj.num);
        const rv = type && Rv.list().find(r => r.type === type);
        rs[si].jockey = rv ? { name: rv.name, skill: type === 'rookie' ? 62 : 85, rival: rv.id } : { name: 'R', skill: type === 'rookie0' ? 62 : 85 };
        if (withMe) { const mi = rs.findIndex(x => x.num === me.num); rs[mi].rider = 'P'; rs[mi].jockey = { name: 'P', skill: 75, player: true }; }
        const sim = S.create(card.race, rs, wIdx, new U.RNG(500 + k), {});
        const s = sim.st[si]; let rk = null, sp = null, dsum = 0, dn = 0;
        while (!S.step(sim)) {
          if (rk == null && s.x > sim.D * 0.5) rk = s.rk;
          if (sp == null && s.spurting) sp = sim.D - s.x;
          if (withMe && s.x > sim.D * 0.25 && s.x < sim.D - sim.straight) { dsum += Math.abs(s.x - sim.st[sim.me].x); dn++; }
        }
        const res = S.finish(sim);
        o.rk += rk; o.sp += sp || 0; o.dist += dn ? dsum / dn : 0; o.pos += res.results.findIndex(r => r.num === subj.num) + 1;
      }
      for (const k of Object.keys(o)) o[k] /= N;
      return o;
    };
    const plain = run1(null, true), pace = run1('pace', true), closer = run1('closer', true), vet = run1('veteran', true), rook = run1('rookie', true), rook0 = run1('rookie0', true);
    assert(pace.rk < plain.rk - 0.08, `天才肌の逃げが前に行かない（中間点の位置 ${pace.rk.toFixed(2)} / ふつう ${plain.rk.toFixed(2)}）`);
    assert(closer.rk > plain.rk + 0.08 && closer.sp < plain.sp, `追込の鬼が後ろでためない（${closer.rk.toFixed(2)}・仕掛け ${closer.sp.toFixed(0)}m / ふつう ${plain.rk.toFixed(2)}・${plain.sp.toFixed(0)}m）`);
    assert(vet.dist < plain.dist * 0.75, `ベテランがあなたをマークしない（あなたとの差 ${vet.dist.toFixed(1)}m / ふつう ${plain.dist.toFixed(1)}m）`);
    assert(rook.sp > rook0.sp + 30, `新人のうちに仕掛けが早くならない（${rook.sp.toFixed(0)}m / ふつう ${rook0.sp.toFixed(0)}m）`);
    // 型で極端に強く・弱くならない（同じ馬・同じ腕前で、平均の着順の差が2着以内）
    for (const [k, o] of [['pace', pace], ['closer', closer], ['veteran', vet]]) assert(Math.abs(o.pos - plain.pos) < 2, `${k} の平均着順 ${o.pos.toFixed(1)}（ふつう ${plain.pos.toFixed(1)}）`);
    // ライバルのいないレースは、作戦のフックがあっても無くても同じ結果
    const sim0 = S.run(card.race, base, wIdx, new U.RNG(9), {});
    const t0 = Rv.tactics; Rv.tactics = () => {};
    const sim1 = S.run(card.race, base, wIdx, new U.RNG(9), {});
    Rv.tactics = t0;
    assert(sim0.results.map(r => r.num + ':' + r.time).join() === sim1.results.map(r => r.num + ':' + r.time).join(), 'ライバルのいないレースの結果が変わった');
    return `中間点の位置 逃げ${pace.rk.toFixed(2)}・ふつう${plain.rk.toFixed(2)}・追込${closer.rk.toFixed(2)}／あなたとの差 ベテラン${vet.dist.toFixed(1)}m・ふつう${plain.dist.toFixed(1)}m／新人の仕掛け ${rook.sp.toFixed(0)}m・${rook0.sp.toFixed(0)}m`;
  });

  check('rivals: 対戦成績（先着の数・重賞・G1・年ごと）と記録・台詞の場面・G1 で破るとニュースと評判', () => {
    const { G } = season();
    const s = G.rivals;
    let meets = 0;
    for (const rv of Rv.list()) {
      const v = s.vs[rv.id];
      assert(v.ahead + v.behind === v.meets && v.gMeets <= v.meets && v.g1Meets <= v.gMeets && v.gAhead <= v.gMeets && v.g1Ahead <= v.g1Meets, `${rv.name} の対戦成績の数が合わない`);
      assert(U.sum(Object.values(v.years).map(a => a[0] + a[1])) === v.meets, `${rv.name} の年ごとの合計が合わない`);
      meets += v.meets;
    }
    assert(meets >= (QUICK ? 8 : 20), `ライバルとの対戦が少ない（${meets}）`);
    assert(s.log.length === Math.min(150, meets) && s.log.every(r => Rv.by(r.id) && r.me !== r.rv), '対戦の記録が合わない');
    // 台詞の場面：初対決 → 先着の勝ち負け → 3つ続けて負けると「連敗中」。台詞に差し込みが残らない
    const G2 = newGame(8);
    const rv = Rv.list()[0], race = { key: 'x-1', name: 'テスト特別', graded: false, grade: null, region: 'JRA', month: 5, week: 2, course: '東京', surface: '芝', dist: 1600 };
    assert(Rv.scene(rv.id, race) === 'first', '初対決にならない');
    const mk = (mePos, rvPos) => ({ results: [
      { pos: mePos, rider: 'P', jockey: { name: 'テスト騎手', player: true }, horse: { name: 'ワタシノウマ' } },
      { pos: rvPos, rider: null, jockey: { name: rv.name, rival: rv.id }, horse: { name: 'アイテノウマ' } },
    ].sort((a, b) => a.pos - b.pos) });
    Rv.record(race, mk(1, 2));
    assert(Rv.scene(rv.id, race) !== 'first' && Rv.vs(rv.id).last === 'W', '先着が残らない');
    for (let i = 0; i < 3; i++) Rv.record(race, mk(2, 1));
    assert(Rv.scene(rv.id, race) === 'streakL' && Rv.vs(rv.id).streak === -3, `連敗中にならない（${Rv.vs(rv.id).streak}）`);
    for (const sc of SCENES) for (let k = 0; k < 2; k++) { const t = Rv.line(rv.id, sc, k, { horse: 'ウマ', race: 'レース' }); assert(t && !/\{/.test(t), `台詞に差し込みが残る ${t}`); }
    // G1 で勝ち、ライバルが後ろ：評判が上がり、ニュース
    const g1 = Object.assign({}, race, { key: 'x-2', name: 'テストG1', graded: true, grade: 'G1' });
    const rep0 = J.me().rep, n0 = G2.news.length;
    Rv.record(g1, mk(1, 5));
    assert(J.me().rep > rep0 && G2.news.length > n0 && G2.news.some(n => n.text.includes(rv.name) && n.text.includes('破った')), 'G1 で破っても評判・ニュースが無い');
    assert(Rv.vs(rv.id).g1Ahead === 1 && Rv.vs(rv.id).gAhead === 1, 'G1 の先着が数えられない');
    // 年末：勝ち越すと評判とニュース。ひと言も残る
    Rv.record(race, mk(1, 2)); Rv.record(race, mk(1, 2)); Rv.record(race, mk(1, 2));
    const rep1 = J.me().rep;
    Rv.yearEnd(G2.year);
    assert((G2.rivals.titles[G2.year] || []).includes(rv.id) && J.me().rep > rep1, '年間で勝ち越しても何も無い');
    assert(G2.rivals.lines[G2.year] && G2.rivals.lines[G2.year].text, '年末のひと言が無い');
    return `対戦 ${meets}回・${Rv.list().map(r => `${r.name} ${s.vs[r.id].ahead}-${s.vs[r.id].behind}`).join('・')}`;
  });

  check('rivals: セーブの往復・古いセーブ（G.rivals が無い）でも動く・決定性', () => {
    const { G } = season();
    W.load(JSON.stringify(G));
    const s1 = W.serialize(); W.load(s1);
    assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
    assert(JSON.stringify(W.get().rivals) === JSON.stringify(G.rivals), 'ライバルの記録が戻らない');
    // 古いセーブ：rivals が無い → 既定値で埋まり、次の月に相棒が決まる
    const old = JSON.parse(s1);
    const g0 = old.g || old;
    delete g0.rivals;
    W.load(JSON.stringify(old));
    const g = W.get();
    assert(g.rivals && Rv.list().every(rv => g.rivals.vs[rv.id] && g.rivals.vs[rv.id].meets === 0), '古いセーブに既定値が入らない');
    for (let i = 0; i < 5; i++) W.finishWeek({});
    assert(Object.keys(g.rivals.ride).length >= Rv.list().length, '古いセーブで相棒の馬が決まらない');
    // 同じ種なら同じ結果
    const a = play(33, 6).G, ja = JSON.stringify([a.rivals, a.records.jockeys]);
    const b = play(33, 6).G, jb = JSON.stringify([b.rivals, b.records.jockeys]);
    assert(ja === jb, '同じ種で結果が変わる');
    return `記録 ${JSON.stringify(G.rivals).length}字`;
  });
};
