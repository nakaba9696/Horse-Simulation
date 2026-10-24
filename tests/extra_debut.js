// 確かめ：毎年デビューする史実馬の選び方（持ち主の決定 2026-10-24）
//   隠し馬（data/trophy_horses.js の馬）は基本プールにいない：毎年のデビュー・始めの世界・店の品ぞろえに出ず、トロフィーのリーチで出てくる道だけ
//   デビューは総合力の帯（70.0以上・65.0〜69.5・60.0〜64.5・59.5以下）ごとに 5・20・35・40％。足りない帯は隣の帯から埋める
// Godot は godot/tests/test_debut.gd が同じことを確かめる。JS と Godot が同じ種で同じ世界になるかは一致テスト（godot/tests/test_world.gd）
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const W = HS.World, E = HS.Eraless, T = HS.Season, H = HS.Horse, U = HS.U, SP = HS.Special, D = HS.DATA;
  const newGame = seed => { W.newGame({ seed, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' }); return W.get(); };
  const hiddenNames = () => [...new Set([].concat(...Object.values(D.trophyHorses).map(xs => xs.map(x => x.name))))];
  const live = () => W.all().filter(h => h.loc === 'stable' || h.loc === 'farm');
  const tiersOf = ds => { const c = E.TIERS.map(() => 0); for (const d of ds) c[E.tierOf(d)]++; return c; };

  check('debut: 隠し馬は基本プールにいない（毎年のデビュー・始めの世界・店の品ぞろえに出ない）', () => {
    const names = hiddenNames();
    assert(names.length > 50, `隠し馬が少ない ${names.length}`);
    assert(!E.pool().some(d => names.includes(d.name)), '基本プールに隠し馬がいる');
    // 1989年からの隠し馬（香港の三冠）も外れる。今後足しても、トロフィーの隠し馬の一覧から引くので外れる
    const modern = D.historic.filter(d => E.isPool(d) && E.isHidden(d)).map(d => d.name);
    assert(modern.length >= 6 && modern.includes('ロマンチックウォリアー') && modern.includes('サイレントウィットネス'), `外した1989年からの隠し馬 ${modern}`);
    assert(D.historic.filter(E.isHidden).every(d => !E.isPool(d) || modern.includes(d.name)), '外れていない隠し馬がいる');
    for (const seed of [3, 68, 101]) {
      const G = newGame(seed);
      const bad = live().filter(h => E.isHidden(h)).map(h => h.name);
      assert(!bad.length, `種 ${seed} の始めの世界に隠し馬：${bad}`);
      // 毎年のデビュー（走っていない馬を全部選ぶほど引いても出ない）と店の品ぞろえ
      assert(!E.pick(100000, new U.RNG(seed)).some(E.isHidden), '毎年のデビューに隠し馬が選ばれる');
      for (const m of [1, 6]) { G.month = m; E.restock(true); assert(!G.shopStock.names.some(n => names.includes(n)), `${m}月の店に隠し馬が並ぶ`); }
    }
    return `外した1989年からの隠し馬 ${modern.length}頭（${modern.join('・')}）・隠し馬 ${names.length}頭`;
  });

  check('debut: デビューは総合力の帯ごとに 5・20・35・40％（始めの世界も、毎年も）', () => {
    // 割合と帯の境は E.TIERS の1か所（docs/BALANCE.md「21」）
    assert(E.TIERS.map(x => x.min).join() === '70,65,60,0' && E.TIERS.map(x => x.pct).join() === '5,20,35,40', `帯 ${JSON.stringify(E.TIERS)}`);
    assert(E.tierCounts(300).join() === '15,60,105,120' && E.tierCounts(E.CROP).reduce((a, b) => a + b) === E.CROP && E.tierCounts(7).reduce((a, b) => a + b) === 7, `頭数 ${E.tierCounts(300)}`);
    // 帯は画面の総合力（芝・ダートの高いほう）。境目の 69.5・64.5・59.5 は下の帯
    const bad = [];
    for (const d of E.pool()) {
      const f = T.fhShowPeak(H.fromHistoric(d, 'x')), v = Math.max(f.turf, f.dirt), t = E.tierOf(d);
      if (t !== (v >= 70 ? 0 : v >= 65 ? 1 : v >= 60 ? 2 : 3)) bad.push(d.name + v);
    }
    assert(!bad.length, `帯が総合力と合わない：${bad.slice(0, 5)}`);
    const pool = tiersOf(E.pool());
    // 始めの世界：2〜6歳の世代ごとに 15・60・105・120頭
    const G = newGame(11);
    const byAge = {};
    for (const h of live()) { const d = W.histByName.get(h.name); (byAge[G.year - h.born] = byAge[G.year - h.born] || []).push(d); }
    for (const a of E.AGES) assert(tiersOf(byAge[a]).join() === '15,60,105,120', `始めの世界の${a}歳 ${tiersOf(byAge[a])}`);
    // 毎年の初めのデビュー（3年分。週を進めずに年だけ進める）
    const years = [];
    for (let y = 0; y < 3; y++) {
      const before = new Set(live().map(h => h.name));
      G.year++; E.crop();
      const fresh = live().filter(h => !before.has(h.name)).map(h => W.histByName.get(h.name));
      assert(tiersOf(fresh).join() === '15,60,105,120' && fresh.every(d => !E.isHidden(d)), `${G.year}年のデビュー ${tiersOf(fresh)}`);
      years.push(tiersOf(fresh).join('・'));
    }
    return `プール ${pool.join('・')}頭／毎年のデビュー ${years[0]}頭`;
  });

  check('debut: 帯に残りが足りないときは1つ下の帯から、いちばん下が足りなければ上の帯へ戻って埋める・同じ種なら同じ馬', () => {
    const mk = ns => ns.map((n, i) => Array.from({ length: n }, (_, k) => ({ name: `t${i}-${k}`, t: i })));
    const run = (ns, n) => tiersOf(E.pickTiers(mk(ns), n, new U.RNG(1))).join();
    const tierOf0 = E.tierOf;
    E.tierOf = d => d.t;   // ここだけ：作った馬の帯は t
    try {
      assert(run([500, 500, 500, 500], 300) === '15,60,105,120', '足りるときの割合');
      assert(run([5, 100, 200, 300], 300) === '5,70,105,120', `いちばん上が足りない：${run([5, 100, 200, 300], 300)}`);
      assert(run([5, 62, 200, 300], 300) === '5,62,113,120', `上の2つが足りない：${run([5, 62, 200, 300], 300)}`);
      assert(run([50, 100, 200, 30], 300) === '15,60,195,30', `いちばん下が足りない：${run([50, 100, 200, 30], 300)}`);
      assert(run([20, 70, 110, 10], 300) === '20,70,110,10', `全部足りない：${run([20, 70, 110, 10], 300)}`);
      const a = E.pickTiers(mk([30, 80, 150, 200]), 100, new U.RNG(7)).map(x => x.name).join();
      assert(a === E.pickTiers(mk([30, 80, 150, 200]), 100, new U.RNG(7)).map(x => x.name).join(), '同じ種で違う馬');
      assert(a !== E.pickTiers(mk([30, 80, 150, 200]), 100, new U.RNG(8)).map(x => x.name).join(), '種を変えても同じ馬');
    } finally { E.tierOf = tierOf0; }
    return '上が足りない 5・70・105・120／下が足りない 15・60・195・30';
  });

  check('debut: 前のセーブ（1989年からの隠し馬がもうデビューしている）でも動く。走っている間は隠し馬で出ず、次の年からは新しい選び方', () => {
    const G = newGame(12);
    const rw = 'ロマンチックウォリアー', d = SP.data(rw);
    // 前のセーブ：基本プールにいたころにデビューしていた
    const h = E.spawn(d, 4, true);
    assert(h && E.activeNames().has(rw), '前のセーブの形を作れない');
    const s = W.serialize(); W.load(s);
    assert(W.serialize() === s && E.activeNames().has(rw), 'セーブの往復で変わる');
    // 走っている間は香港三冠のリーチで出てこない
    const grp = SP.BY['t:hk3'];
    assert(!SP.canAppear(grp, d, G.unlocked) && SP.members(grp).some(x => SP.canAppear(grp, x, W.get().unlocked)), '走っている隠し馬が出てこられる');
    // 次の年のデビューは帯の割合で、隠し馬は選ばない
    const g = W.get(), before = new Set(live().map(x => x.name));
    g.year++; E.crop();
    const fresh = live().filter(x => !before.has(x.name)).map(x => W.histByName.get(x.name));
    assert(tiersOf(fresh).join() === '15,60,105,120' && !fresh.some(E.isHidden), `前のセーブの次の年 ${tiersOf(fresh)}`);
    // 引退すると隠し馬に戻り、デビューにはもう選ばれない
    W.all().find(x => x.name === rw && x.loc !== 'retired').loc = 'retired';
    assert(SP.canAppear(grp, d, g.unlocked) && !E.pick(100000, new U.RNG(3)).some(x => x.name === rw), '引退したあとの隠し馬');
    return '前のセーブのロマンチックウォリアーは引退まで走り、そのあとは隠し馬だけ';
  });
};
