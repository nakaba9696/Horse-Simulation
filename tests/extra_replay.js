// 確かめ：コースレコード（自分の印）・リプレイ（縮めて戻す）・フリーレース（セーブを変えない）
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const W = HS.World, U = HS.U;
  const S_step = sim => HS.Sim.step(sim);

  check('records: レコードの更新の判定・前との差・自分で乗った印・古いセーブの既定値', () => {
    W.newGame({ seed: 91, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get();
    const race = { course: '東京', surface: '芝', dist: 1600, year: G.year, name: 'テストのレース', short: 'テスト', month: 5, week: 2 };
    const sim = (time, rider, name) => ({ results: [{ time, rider: rider || null, horse: { name: name || 'テストの馬', owner: rider === 'P' ? 'P' : 'AI' }, jockey: { name: rider === 'P' ? 'テスト騎手' : 'ほかの騎手' } }] });
    assert(W.noteRecord(race, sim(94.0)) === null, '初めての記録で「破った」になる');
    let rc = W.courseRecord(race);
    assert(rc && rc.t === 94 && rc.rode === false && rc.jockey === 'ほかの騎手', '初めての記録が残らない');
    assert(W.noteRecord(race, sim(94.5, 'P')) === null && W.courseRecord(race).t === 94, '遅い時計で塗り替わる');
    assert(W.noteRecord(race, sim(94.04, 'P')) === null, '同じ時計（0.1秒に丸めて同じ）で塗り替わる');
    const beat = W.noteRecord(race, sim(93.62, 'P', '自分の馬'));
    assert(beat && beat.t === 93.6 && beat.old === 94 && beat.diff === -0.4 && beat.rode, `破った判定が違う ${JSON.stringify(beat)}`);
    rc = W.courseRecord(race);
    assert(rc.rode && rc.mine && rc.prev === 94 && rc.name === '自分の馬', '自分で乗った印・前の時計が残らない');
    const chk = W.recordCheck(race, 93.4);
    assert(chk.beat && chk.diff === -0.2 && !W.recordCheck(race, 93.6).beat, 'recordCheck が違う');
    // 結果の要約に「RECORD」の元が載る
    const slim = W.slimResult({ race: Object.assign({ key: 'k', ground: '良', region: 'JRA' }, race), sim: { results: [] }, hasMine: true, rec: beat });
    assert(slim.rec && slim.rec.diff === -0.4, '結果の要約にレコードが載らない');
    // 古いセーブ：rode が無い記録は、騎手のゲームなら mine を引き継ぐ
    const g = JSON.parse(W.serialize());
    g.records.course = { '中山|芝|2000': { t: 120.1, name: 'A', year: 1, race: 'x', mine: true }, '中山|ダ|1800': { t: 111.1, name: 'B', year: 1, race: 'y', mine: false } };
    W.load(g);
    const rs = W.get().records.course;
    assert(rs['中山|芝|2000'].rode === true && rs['中山|ダ|1800'].rode === false, '古いセーブの既定値が違う');
    return `破った差 ${beat.diff}`;
  });
  // JS 版のリプレイの縮め方の確かめは外した（持ち主の決定 2026-10-22「不要なら外してもいい」。JS 版はもう作らない。Godot 版のリプレイは godot/tests/test_flow.gd で確かめる）
  check('freerace: 1レースだけ遊ぶ。セーブ・世界の乱数・記録を一切変えない', () => {
    const FR = HS.FreeRace, RP = HS.Replay;
    W.newGame({ seed: 93, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    for (let i = 0; i < 6; i++) W.finishWeek({});
    const G = W.get();
    // 自分の馬を1頭持たせる
    G.player.money = 1e9;
    const it = W.marketHistoric().sort((a, b) => b.price - a.price)[0];
    assert(!W.buy(it), '買えない');
    const mine = W.mine()[0];
    const before = W.serialize();
    const snap = FR.saveSnapshot();
    assert(snap && snap.live && FR.myHorses(snap).some(h => h.id === mine.id), '自分の馬が候補にない');
    const hist = FR.search('でぃーぷいんぱくと', 5);
    assert(hist.length && hist[0].name === 'ディープインパクト', `名前で探せない（ひらがな）: ${hist.map(d => d.name)}`);
    const sp = FR.specials();
    assert(sp.length > 10, 'スペシャルホースが候補にない');
    const entries = [{ kind: 'mine', key: mine.id }, { kind: 'special', key: sp[0].name }].concat(FR.search('', 30).slice(0, 20).map(d => ({ kind: 'hist', key: d.name })));
    const o = { course: '京都', surface: '芝', dist: 3200, ground: '稍重', weather: '雨', entries, ride: 0, seed: 12345, n: 1 };
    const card = FR.build(o, snap);
    assert(card.runners.length === FR.MAX, `18頭にならない ${card.runners.length}`);
    assert(card.race.dist === 3200 && card.race.ground === '稍重' && card.race.weather === '雨' && card.race.free, '条件が違う');
    const me = card.runners.find(x => x.rider === 'P');
    assert(me && me.horse.name === mine.name && me.horse !== mine && me.jockey.name === 'テスト騎手', '自分の馬に自分が乗っていない（または写しでない）');
    assert(card.runners.some(x => x.horse.legend), 'スペシャルホースがいない');
    // 騎乗（操作つき）と、見るだけ
    const sim = FR.sim(card, { ride: true });
    while (!S_step(sim)) { /* 進める */ }
    const res = HS.Sim.finish(sim);
    const res2 = FR.run(FR.build(Object.assign({}, o, { ride: -1 }), snap));
    assert(res.results.length === 18 && res2.results.length === 18 && res.frames && res2.frames, '結果が出ない');
    // 同じ種なら同じ結果（決定性）
    const res3 = FR.run(FR.build(Object.assign({}, o, { ride: -1 }), snap));
    assert(res3.results.map(x => x.horse.name).join() === res2.results.map(x => x.horse.name).join(), '同じ種で結果が変わる');
    // リプレイにもできる
    const rp = RP.make({ race: card.race, sim: res, runners: card.runners }, { free: true, yearLabel: 'フリー' });
    assert(rp && rp.free && rp.rode && rp.horse === mine.name, 'フリーレースのリプレイが作れない');
    FR.slim(card, res);
    // セーブが変わっていない（前と後で JSON が同じ）
    const after = W.serialize();
    assert(after === before, 'フリーレースでセーブが変わった');
    assert(W.horse(mine.id).starts === mine.starts && !mine.fatigue === !W.horse(mine.id).fatigue, '自分の馬に成績・疲れが付いた');
    // セーブを読み込んでいないとき（タイトルから）も、端末のセーブの写しで動く
    const mem = { [W.SAVE_KEY]: before };
    globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
    try {
      const live = W.get; W.get = () => null;
      try {
        const s2 = FR.saveSnapshot();
        assert(s2 && !s2.live && FR.myHorses(s2).some(h => h.name === mine.name), 'タイトルから自分の馬が選べない');
        const c2 = FR.build(Object.assign({}, o, { ride: 0 }), s2);
        FR.run(c2);
        assert(mem[W.SAVE_KEY] === before, 'タイトルからのフリーレースで端末のセーブが変わった');
      } finally { W.get = live; }
    } finally { delete globalThis.localStorage; }
    return `${card.runners.length}頭・自分 ${mine.name} ${res.results.find(x => x.rider === 'P').pos}着・勝ち ${res2.results[0].horse.name}`;
  });
};
