// 自分の騎乗は必ず自分で乗る（おまかせ騎乗は無い。持ち主の決定 2026-10-20「おまかせ騎乗　なしにして」）。
// プレイヤーは1つのレースに1頭しか乗れないので、騎手のゲームでは：
//   ・1つのレースに自分の馬は1頭まで（出走登録・予約・デビュー戦・おまかせのレース選びで弾く）
//   ・騎乗依頼は自分の馬が出るレースには来ない。受けた依頼のレースには自分の馬を出せない
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

  check('oneride: 騎乗依頼は自分の馬が出るレースには来ない・受けた依頼のレースに自分の馬は出せない', () => {
    setup(41);
    O.state().flags.overseas = { y: W.get().year };
    for (const o of O.list()) O.meet(o.id, { horse: 'テストホース', race: 'テストのレース' });
    O.state().queue = [];
    let hidden = 0, blocked = 0, offers = 0;
    for (let i = 0; i < WEEKS; i++) {
      const offs = O.offers();
      offers += offs.length;
      for (const o of offs) { const c = W.cardOf(o.raceKey); assert(c && !mineCount(c), `${o.raceKey}：自分の馬が出るレースに依頼が来た`); }
      // 受けていない依頼のレースに自分の馬を出すと、その依頼は見えなくなる（出走を外すと戻る）
      const o1 = offs.find(o => W.mine('stable').some(h => canRun(h, W.raceByKey(o.raceKey)) && !W.entryOf(h.id)));
      if (o1) {
        const h = W.mine('stable').find(h => canRun(h, W.raceByKey(o1.raceKey)) && !W.entryOf(h.id));
        if (!W.enter(h.id, o1.raceKey)) {
          assert(!O.offers().some(o => o.raceKey === o1.raceKey), '自分の馬を出したレースの依頼が残る');
          W.unenter(h.id);
          assert(O.offers().some(o => o.raceKey === o1.raceKey), '出走を外しても依頼が戻らない');
          hidden++;
        }
      }
      // 受けた依頼のレースには、自分の馬を出せない
      const o2 = O.offers()[0];
      if (o2) {
        assert(!O.accept(o2.raceKey, o2.horseId), '依頼を受けられない');
        const h = W.mine('stable').find(h => canRun(h, W.raceByKey(o2.raceKey)) && !W.entryOf(h.id));
        if (h) { assert(W.enter(h.id, o2.raceKey) === W.WHY_OFFER, '受けた依頼のレースに自分の馬を出せてしまう'); blocked++; }
        const c = W.cardOf(o2.raceKey);
        assert(c && riderCount(c) === 1 && c.runners.find(x => x.rider === 'P').horse.id === o2.horseId, '受けた依頼のレースで自分が乗るのは依頼の馬1頭');
      }
      for (const c of W.cards()) assert(riderCount(c) <= 1, `${R.label(c.race)}に自分の馬・自分が乗る馬が${riderCount(c)}頭`);
      W.finishWeek({});
    }
    assert(offers > 0 && blocked > 0, `依頼 ${offers}件・弾いた ${blocked}件`);
    return `依頼 ${offers}件・自分の馬で隠れた ${hidden}・受けたレースへの出走を弾いた ${blocked}`;
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
