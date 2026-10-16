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
  check('replay: コマを縮めて戻しても元と近い・大きさ・保存の上限とお気に入り', () => {
    const RP = HS.Replay;
    // 数の列の往復
    const q = [0, 5, -3, 1000, 40000, 39990, -7, 0, 0, 123456];
    for (const o of [1, 2]) assert(JSON.stringify(RP.unpack(RP.pack(q, o), o)) === JSON.stringify(q), `数の列が戻らない（${o}）`);
    W.newGame({ seed: 92, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    let r = null;
    for (let i = 0; i < 60 && !r; i++) { const rep = W.finishWeek({}); r = rep.races.find(x => x.sim.frames && x.race.dist >= 2000); }
    assert(r, 'コマのあるレースが無い');
    const rp = RP.make(r, { yearLabel: W.yLabel(r.race.year) });
    const json = JSON.stringify(rp);
    const back = RP.expand(JSON.parse(json));
    // もとのコマの時刻で、戻したコマを補って比べる
    const F = back.sim.frames;
    let ex = 0, el = 0, ev = 0, i = 0, sl = 0, nl = 0;
    for (const f of r.sim.frames) {
      while (i < F.length - 2 && F[i + 1].t < f.t) i++;
      const a = F[i], b = F[i + 1], k = U.clamp((f.t - a.t) / Math.max(1e-6, b.t - a.t), 0, 1);
      f.p.forEach((p, j) => {
        ex = Math.max(ex, Math.abs(a.p[j][0] + (b.p[j][0] - a.p[j][0]) * k - p[0]));
        const dl = Math.abs(a.p[j][1] + (b.p[j][1] - a.p[j][1]) * k - p[1]); el = Math.max(el, dl); sl += dl; nl++;
        if (f.t > 3 && f.t < r.sim.results[0].time - 1) ev = Math.max(ev, Math.abs(a.p[j][2] + (b.p[j][2] - a.p[j][2]) * k - p[2]));
      });
    }
    // 内外は間引いたコマの間で急に動くことがあるので、平均で見る（いちばん大きいずれも1m未満）
    assert(ex < 0.5 && el < 1 && sl / nl < 0.03 && ev < 1.0, `戻したコマがずれる：位置 ${ex.toFixed(2)}m・内外 最大 ${el.toFixed(2)} 平均 ${(sl / nl).toFixed(3)}・速さ ${ev.toFixed(2)}`);
    assert(back.sim.results.length === r.sim.results.length && back.sim.results.every((x, k) => x.horse.name === r.sim.results[k].horse.name && Math.abs(x.time - r.sim.results[k].time) < 0.01), '着順・タイムが戻らない');
    assert(back.sim.events.length === r.sim.events.length, '実況が戻らない');
    const raw = JSON.stringify(r.sim.frames).length;
    assert(json.length < 60000 && json.length * 4 < raw, `リプレイが大きい ${json.length}字（もと ${raw}字）`);
    // 保存：お気に入りでないものは MAX 本まで、お気に入りは消えない。入りきらないときは古いものから消す
    const mem = {}, store = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
    RP.store = store;
    const first = RP.save(rp).id; assert(first && !RP.toggleFav(first), 'お気に入りにできない');
    for (let k = 0; k < RP.MAX + 5; k++) assert(RP.save(rp).id, '保存できない');
    let L = RP.list();
    assert(L.filter(m => !m.fav).length === RP.MAX && L.some(m => m.id === first && m.fav) && RP.get(first), `上限・お気に入りが違う ${L.length}`);
    assert(Object.keys(mem).filter(k => k.startsWith(RP.DATA_KEY)).length === L.length, '消したリプレイの中身が残る');
    // 容量の上限がある端末：満杯なら古いものを消して入れる
    const cap = json.length * 3 + 20000;
    store.setItem = (k, v) => { const used = Object.entries(mem).filter(([kk]) => kk !== k).reduce((s, [, vv]) => s + vv.length, 0); if (used + String(v).length > cap) throw new Error('quota'); mem[k] = String(v); };
    const res = RP.save(rp);
    L = RP.list();
    assert(res.id && L[0].id === res.id && L.some(m => m.id === first), `満杯のときに古いものを消して入れられない ${JSON.stringify(res)}`);
    assert(RP.remove(res.id) && !RP.get(res.id), '消せない');
    RP.store = null;
    return `${(json.length / 1024).toFixed(1)}KB（もとのコマ ${(raw / 1024).toFixed(0)}KB）・ずれ 位置 ${ex.toFixed(2)}m 内外の平均 ${(sl / nl).toFixed(3)}m 速さ ${ev.toFixed(2)}`;
  });
};
