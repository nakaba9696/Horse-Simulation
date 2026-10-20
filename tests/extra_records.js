// 確かめ：お手馬のレースの記録（js/core/racerec.js）と殿堂入りの案内（js/core/hall.js。持ち主の決定 2026-10-20）
//   自分の持ち馬が走ったレースは、おまかせでも出走馬・ラップ・勝ち時計が残る・引退で消え、殿堂入りなら殿堂に残る・
//   トロフィー1つで殿堂入りの案内・「いいえ」なら入らない・前のセーブ（記録の無い1走）は「記録なし」
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const W = HS.World, S = HS.Sim, RR = HS.RaceRec, HL = HS.Hall, J = HS.Jockey, U = HS.U;

  check('racerec: ラップの区切りは200mごと（最初は端数）で、模擬は先頭が区切りを過ぎた時刻を順に返す', () => {
    assert(S.lapMarks(1600).join() === '200,400,600,800,1000,1200,1400', '1600m の区切り');
    assert(S.lapMarks(2500).join() === '100,300,500,700,900,1100,1300,1500,1700,1900,2100,2300', '2500m の区切り（最初は100m）');
    assert(S.lapMarks(1000).length === 4, '1000m の区切り');
    const pool = HS.DATA.historic.filter(d => d.rating >= 80 && d.surface !== 'ダ').slice(0, 12);
    const race = { name: 'テスト', course: '東京', surface: '芝', dist: 2500, grade: 'G2', region: 'JRA', year: 2025, month: 11, week: 2, ground: '良', age: '3+', weight: '定量' };
    const wIdx = HS.Horse.weekIndex(2025, 11, 2);
    const runners = pool.map((d, i) => ({ horse: Object.assign(HS.Horse.fromHistoric(d, 't' + i), { born: 2021 }), num: i + 1, frame: W.frameOf(i + 1, pool.length), weight: 57, jockey: null }));
    const res = S.run(race, runners, wIdx, new U.RNG(5));
    assert(res.splits.length === S.lapMarks(2500).length, `区切りの数 ${res.splits.length}`);
    for (let k = 1; k < res.splits.length; k++) assert(res.splits[k] > res.splits[k - 1], '通過の時刻が増えていない');
    assert(res.splits[res.splits.length - 1] < res.winnerTime, '最後の区切りが勝ち時計より後');
    const rec = RR.make(race, res);
    const sum = rec.lap.reduce((a, b) => a + b, 0);
    assert(rec.lap.length === 13 && sum === Math.round(res.winnerTime * 10) && rec.f.length === pool.length, `ラップの合計 ${sum}・勝ち時計 ${res.winnerTime}`);
    return `2500m：${RR.laps({ rec }).map(v => v.toFixed(1)).join('-')}（勝ち ${U.time(res.winnerTime)}）`;
  });

  // おまかせで走らせて、記録の付いた馬を作る（週を進める）
  const play = (seed, nHorses, weeks) => {
    W.newGame({ seed, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get();
    G.player.money = 1e9; G.shopKeys = HS.Eraless.locks().map(l => l.key);
    const shop = HS.Eraless.market().filter(it => !it.legend).sort((a, b) => b.price - a.price);
    for (const it of shop.slice(0, nHorses)) W.buy(it);
    let k = 0;
    while (k++ < weeks && !W.mine().every(h => (h.results || []).length >= 2)) { for (const h of W.mine()) h.auto = true; W.finishWeek({}); }
    return G;
  };

  check('racerec: おまかせで走ったレースにも、出走馬（馬名・枠・着順・タイム・着差・人気・騎手）とラップ・勝ち時計の記録が残る。ほかの馬には残さない', () => {
    const G = play(41, 2, 30);
    const mine = W.mine().filter(h => h.results.length);
    assert(mine.length, '自分の馬が走っていない');
    let n = 0;
    for (const h of mine) for (const r of h.results) {
      assert(RR.has(r), `${h.name} の ${r.race} に記録が無い`);
      const rows = RR.rows(r);
      assert(rows.length === r.n && rows[r.pos - 1].name === h.name && Math.round(rows[r.pos - 1].time * 10) === Math.round(r.time * 10), `${r.race} の出走馬の並び`);
      assert(rows.every(x => x.name && x.num >= 1 && x.frame >= 1 && x.frame <= 8 && x.pop >= 1 && typeof x.jockey === 'string'), '出走馬の項目が欠ける');
      assert(rows[r.pos - 1].pop === r.pop, '人気が戦績と違う');
      const laps = RR.laps(r);
      assert(laps.length === S.lapMarks(r.dist).length + 1 && Math.round(laps.reduce((a, b) => a + b, 0) * 10) === Math.round(RR.winTime(r) * 10), `${r.race} のラップ ${laps}`);
      assert(laps.every(v => v > 4 && v < 20), `ラップの値がおかしい ${laps}`);
      n++;
    }
    const ai = W.all().filter(h => h.owner !== 'P' && (h.results || []).some(r => r.rec));
    assert(!ai.length, `ほかの馬に記録がある（${ai.length}頭）`);
    // セーブの往復で残る
    const s1 = W.serialize(); W.load(s1);
    assert(W.mine().some(h => h.results.some(r => RR.has(r))), 'セーブの往復で記録が消える');
    const per = Math.round(W.mine().flatMap(h => h.results).reduce((a, r) => a + JSON.stringify(r.rec || '').length, 0) / Math.max(1, n));
    return `${n}走に記録・1走あたり約${per}字（${G.year - G.startYear + 1}年目 ${G.month}月）`;
  });

  check('racerec: 引退で記録が消え、殿堂入り（トロフィー1つで案内・はい）なら殿堂に残る。いいえなら入らず、記録も消える', () => {
    const G = play(42, 3, 40);
    const ran = W.mine().filter(h => h.results.some(r => RR.has(r)));
    assert(ran.length >= 3, `記録のある馬が足りない ${ran.length}`);
    const [a, b, c] = ran;
    G.trophies = Object.assign(G.trophies || {}, { triple: { y: G.year, horse: a.name, hid: a.id, bonus: 1 }, spring: { y: G.year, horse: b.name, hid: b.id, bonus: 1 } });
    assert(HL.ask(a) && HL.ask(b) && !HL.ask(c), 'トロフィー1つで殿堂入りの案内が出ない（か、無い馬に出る）');
    const nA = a.results.filter(r => RR.has(r)).length;
    const ra = J.retire(a.id, { hall: true }), rb = J.retire(b.id, { hall: false }), rc = J.retire(c.id);
    assert(!ra.err && !rb.err && !rc.err, `引退できない ${ra.err || rb.err || rc.err}`);
    assert(ra.hall && !rb.hall && !rc.hall && HL.byId(a.id) && !HL.byId(b.id) && !HL.byId(c.id), '殿堂入りの選び方どおりでない');
    for (const h of [a, b, c]) { const x = W.horse(h.id); if (x) assert(!x.results.some(r => r.rec), `${h.name} の記録が引退で消えない`); }
    const hall = HL.byId(a.id);
    assert(hall.results.filter(r => RR.has(r)).length === nA, '殿堂の写しに記録が残らない');
    const s1 = W.serialize(); W.load(s1);
    assert(HL.byId(a.id).results.filter(r => RR.has(r)).length === nA, 'セーブの往復で殿堂の記録が消える');
    return `殿堂入り ${a.name}（${nA}走の記録）・いいえ ${b.name}・トロフィー無し ${c.name}`;
  });

  check('racerec: 前のセーブ（記録の無い1走）は「記録なし」で、読み込んでも動く', () => {
    play(43, 1, 30);
    const g = JSON.parse(W.serialize());
    for (const h of Object.values(g.horses)) for (const r of h.results || []) delete r.rec;
    W.load(JSON.stringify(g));
    const h = W.mine().find(x => x.results.length);
    assert(h, '走った馬がいない');
    const r = h.results[0];
    assert(!RR.has(r) && RR.rows(r).length === 0 && RR.laps(r).length === 0 && RR.winTime(r) == null, '記録の無い1走の扱い');
    W.finishWeek({});
    return `${h.name}：前の1走は記録なし`;
  });
};
