// 確かめ：コースレコード（自分の印）・リプレイ（縮めて戻す）・フリーレース（セーブを変えない）
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const W = HS.World, U = HS.U;

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
};
