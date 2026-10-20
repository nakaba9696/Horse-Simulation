// 自分の騎乗は必ず自分で乗る（おまかせ騎乗は無い。持ち主の決定 2026-10-20「おまかせ騎乗　なしにして」）。
// プレイヤーは1つのレースに1頭しか乗れないので、騎手のゲームでは：
//   ・1つのレースに自分の馬は1頭まで（出走登録・予約・デビュー戦・おまかせのレース選びで弾く）
//   ・オーナーの依頼のレースは依頼の馬に乗る（依頼が先で自分の馬は取り消し）。依頼の騎乗が決まったレースには自分の馬を出せない
//   ・前のセーブで同じレースに2頭いれば1頭目だけ残す
// 画面：JS のパドック・フリーレースと Godot の出走表に「おまかせで乗る」が無く、週の流れは乗っていない騎乗を残して週を締めない
module.exports = function (check, assert, HS) {
  const W = HS.World, O = HS.Owners, T = HS.Season, P = HS.Program, R = HS.Races;
  const fs = require('fs'), path = require('path');
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

  // 騎手のゲームを始め、店の安い馬を3頭買って、2頭が入厩するまで進める
  const setup = seed => {
    W.newGame({ seed, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    W.get().player.money = 1e7;
    for (const it of W.marketHistoric().slice().sort((a, b) => a.price - b.price)) { if (W.mine().length >= 3) break; W.buy(it); }
    let guard = 0; while (W.mine('stable').length < 2 && guard++ < 70) W.finishWeek({});
    assert(W.mine('stable').length >= 2, '入厩した馬が2頭いない');
  };
  const canRun = (h, rc) => !rc.invite && rc.region !== '海外' && !R.ineligible(h, rc, W.get().year);
  // 今週、2頭とも出られるレースが来るまで週を進める
  const sharedWeek = () => {
    for (let i = 0; i < 50; i++) {
      const [a, b] = W.mine('stable');
      const rc = a && b && W.weekRaces().find(x => canRun(a, x) && canRun(b, x));
      if (rc) return { a, b, rc };
      W.finishWeek({});
    }
    return {};
  };
  const WEEKS = process.env.QUICK ? 8 : 16;
  const mineCount = c => c.runners.filter(x => x.mine).length;
  const riderCount = c => c.runners.filter(x => x.mine || x.rider === 'P').length;

  check('oneride: 1つのレースに自分の馬は1頭まで（出走登録・番組表の理由・おまかせのレース選び）', () => {
    setup(31);
    const { a, b, rc } = sharedWeek();
    assert(rc, '2頭とも出られるレースが見つからない');
    a.auto = false; b.auto = false;
    assert(!W.enter(a.id, rc.key), '1頭目を登録できない');
    assert(W.enter(b.id, rc.key) === W.WHY_MINE, '2頭目も同じレースに登録できてしまう');
    assert(!W.enter(a.id, rc.key), '同じ馬の登録のし直しは通る');
    const row = P.rows(b, { weeks: 1, show: 'all' }).find(x => x.race.key === rc.key);
    assert(row && row.why === W.WHY_MINE && !row.can, '番組表の2頭目の行に「ほかのお手馬が出る」が出ない');
    const c = W.cardOf(rc.key);
    assert(c && mineCount(c) === 1 && c.ride, '出走表に自分の馬が1頭・自分が乗る');
    // おまかせ（出るレースを自動で選ぶ）の馬が、ほかの自分の馬のレースを選んだら選び直す（W.aiChoose を包んで、必ずそのレースを選ばせる）
    b.auto = true;
    const ai0 = W.aiChoose;
    let asked = 0;
    W.aiChoose = (h, races, wIdx, r) => { if (h.id === b.id) { asked++; const x = races.find(z => z.key === rc.key); if (x) return x; } return ai0(h, races, wIdx, r); };
    try {
      W._week = null;
      const c2 = W.cardOf(rc.key);
      assert(asked === 2 && mineCount(c2) === 1 && c2.runners.some(x => x.horse.id === a.id), `おまかせの馬が選び直さない（選んだ回数 ${asked}・自分の馬 ${mineCount(c2)}頭）`);
    } finally { W.aiChoose = ai0; W._week = null; }
    // おまかせの馬どうしも同じレースには出ない
    W.unenter(a.id);
    for (const h of W.mine('stable')) h.auto = true;
    let weeks2 = 0, rides = 0;
    for (let i = 0; i < WEEKS; i++) {
      const cs = W.cards();
      for (const x of cs) assert(mineCount(x) <= 1, `${R.label(x.race)}に自分の馬が${mineCount(x)}頭`);
      const n = cs.filter(x => mineCount(x)).length;
      if (n >= 2) weeks2++;
      rides += n;
      W.finishWeek({});
    }
    assert(rides > 0, 'おまかせの馬が一度も出ていない');
    return `${WEEKS}週で自分の騎乗 ${rides}鞍・2鞍以上の週 ${weeks2}`;
  });

  check('oneride: 予約も1レース1頭（2頭目は予約できない・理由が番組表に出る）', () => {
    setup(37);
    const [a, b] = W.mine('stable');
    a.auto = false; b.auto = false;
    const okB = new Set(P.rows(b, { weeks: 30, show: 'all' }).filter(x => x.can === 'reserve').map(x => x.race.key));
    const hit = P.rows(a, { weeks: 30, show: 'all' }).find(x => x.can === 'reserve' && okB.has(x.race.key));
    assert(hit, '2頭とも予約できるレースが無い');
    assert(!P.reserve(a.id, hit.race.key), '1頭目が予約できない');
    assert(P.reserve(b.id, hit.race.key) === W.WHY_MINE, '2頭目も同じレースを予約できてしまう');
    const row = P.rows(b, { weeks: 30, show: 'all' }).find(x => x.race.key === hit.race.key);
    assert(row && row.why === W.WHY_MINE && !row.can, '番組表の2頭目の行に理由が出ない');
    // 1頭目の予約を外せば、2頭目が予約できる
    T.unreserve(a.id, hit.race.key);
    assert(!P.reserve(b.id, hit.race.key), '1頭目の予約を外しても2頭目が予約できない');
  });

  // オーナーの依頼（ミッション形式）：レースの週は依頼の馬に乗る（依頼が先）。そのレースに出していた自分の馬は取り消され、
  // 依頼の騎乗が決まったあとは自分の馬を出せない。見送れば自分の馬に戻る。どの形でも、そのレースで自分が乗るのは1頭
  check('oneride: 依頼のレースで自分が乗るのは1頭（依頼が先で自分の馬は取り消し・決まったあとは出せない・見送れば自分の馬）', () => {
    const jump = (y, m, w) => { const g = W.get(); g.year = y; g.month = m; g.week = w; W._week = null; W._cache = null; W._soon = null; W.dirty(); };
    W.newGame({ seed: 47, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const g = W.get();
    O.meet('sengoku', { horse: 'テストホース', race: 'テストのレース' }); O.advance('sengoku', {}); O.state().queue = [];
    const st = O.of('sengoku'), j = st.job;
    jump(Math.floor(j.at / 48), Math.floor((j.at % 48) / 4) + 1, j.at % 4 + 1); O.tick();
    jump(j.y, j.m, j.w);
    g.player.money = 1e9;
    W.buy(W.marketHistoric().find(x => x.horse.sex !== '牝'));
    const mine = W.mine()[0];
    Object.assign(mine, { born: g.year - 4, loc: 'stable', auto: false, fatigue: 0 });
    const key = O.jobKey(j);
    W._week = null;
    assert(!W.enter(mine.id, key), '依頼の騎乗が決まる前は、自分の馬を登録できる');
    const c1 = W.cardOf(key);
    assert(c1 && riderCount(c1) === 1 && c1.runners.find(x => x.rider === 'P').horse.id === j.hid, '依頼のレースで自分が乗るのが依頼の馬1頭でない');
    assert(W.enter(mine.id, key) === W.WHY_OFFER, '依頼の騎乗が決まったレースに自分の馬を出せてしまう');
    const row = P.rows(mine, { weeks: 1, show: 'all' }).find(x => x.race.key === key);
    assert(!row || (row.why === W.WHY_OFFER && !row.can), '番組表に「騎乗依頼を受けたレース」が出ない');
    assert(!O.decline('sengoku'), '見送れない');
    const c2 = W.cardOf(key);
    assert(c2 && riderCount(c2) === 1 && c2.runners.find(x => x.rider === 'P').horse.id === mine.id, '見送ったのに自分の馬に乗らない');
    for (const c of W.cards()) assert(riderCount(c) <= 1, `${R.label(c.race)}に自分の馬・自分が乗る馬が${riderCount(c)}頭`);
  });

  check('oneride: 前のセーブで同じレースに自分の馬が2頭いれば1頭目だけ・受けた依頼のレースの自分の馬は外す', () => {
    setup(31);
    const { a, b, rc } = sharedWeek();
    assert(rc, '2頭とも出られるレースが見つからない');
    const g = W.get();
    g.entries = { [rc.key]: [{ horseId: a.id, jockey: 'x' }, { horseId: b.id, jockey: 'y' }] };
    W.load(W.serialize());
    const e1 = W.get().entries[rc.key];
    assert(e1 && e1.length === 1 && e1[0].horseId === a.id, '2頭のまま残る');
    const g2 = W.get();
    g2.rides = { [rc.key]: 'offer-horse' };
    W.load(W.serialize());
    assert(!W.get().entries[rc.key] && W.get().rides[rc.key] === 'offer-horse', '受けた依頼のレースの自分の馬が残る');
  });

  check('oneride: 「おまかせで乗る」が無い（JS のパドック・フリーレース・Godot の出走表）・週の流れは乗っていない騎乗を残して締めない', () => {
    const gd = f => read(f).replace(/^\s*#.*$/gm, ''); // GDScript の注記の行を除く（「おまかせで乗る」は無い、と書いてある）
    const jui = read('js/ui/jockeyui.js'), fr = read('js/ui/freerace.js'), rc = gd('godot/ui/race_card.gd'), fl = gd('godot/ui/flow.gd');
    assert(!/おまかせで乗る|data-x="auto"|how !== 'ride'/.test(jui), 'JS のパドックにおまかせで乗るが残る');
    assert(!/おまかせで見る/.test(fr), 'フリーレースで自分が乗る馬をおまかせで見られる');
    assert(!/おまかせで乗る|btn_auto|_auto_ride/.test(rc), 'Godot の出走表におまかせで乗るが残る');
    assert(!/"auto"/.test(fl) && /static func next_unridden/.test(fl) && /var left := next_unridden\(\)/.test(fl), 'Godot の週の流れが乗っていない騎乗を残して締める');
  });
};
