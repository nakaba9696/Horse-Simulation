// レースは OP 以上だけ（持ち主の決定 2026-10-20「レースはOP以上のみでお願いします　最初からOPでれます　未勝利戦や新馬戦、条件戦はなくてよいです
// なので未勝利戦からにはなりません　G2までは無条件でれます　G1は獲得賞金条件があります　海外G1の特に2歳については条件未定です」）の検証
// 数は docs/BALANCE.md「8. 出走の条件」
module.exports = function (check, assert, HS) {
  const W = HS.World, R = HS.Races, U = HS.U, T = HS.Season, F = HS.Fatigue;
  const BAD = /新馬|未勝利|勝クラス|万下|条件/;

  check('oponly: 週のレースは OP 以上だけ（新馬戦・未勝利戦・条件戦が無い）。オープンとリステッドは毎週ある', () => {
    W.newGame({ seed: 21, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get();
    let n = 0, op = 0, listed = 0, two = 0;
    const perWeek = [];
    for (let m = 1; m <= 12; m++) for (let w = 1; w <= 4; w++) {
      const list = R.ofWeek(G.seed, G.year, m, w);
      const opens = list.filter(r => !r.graded);
      perWeek.push(opens.length);
      for (const r of list) {
        n++;
        assert(r.graded || r.cls === 'OP', `OP 未満のレース ${r.name}（${r.cls}）`);
        assert(!BAD.test(r.name), `条件戦の名前 ${r.name}`);
        if (!r.graded) {
          op++; if (r.listed) { listed++; assert(R.gradeBadge(r) === 'L' && r.prize > R.CLS_PRIZE.OP, 'リステッドの札と賞金'); } else assert(R.gradeBadge(r) === 'OP', 'オープンの札');
          assert((/-o\d+-\d+$/.test(r.key) || (HS.DATA.ownerRaces || []).some(o => r.key === `${G.year}-${m}-${w}-${o.name}`)) && !R.isOldKey(r.key) && F.countryOfKey(r.key) === '日', `オープンの鍵 ${r.key}`);
          if (r.age === '2') { two++; assert(m >= 6, '2歳のオープンが6月より前にある'); }
        }
      }
      assert(opens.length >= 3, `${m}月${w}週のオープンが少ない（${opens.length}）`);
    }
    // 同じ種と日付なら同じもの
    assert(JSON.stringify(R.ofWeek(G.seed, G.year, 7, 2)) === JSON.stringify(R.ofWeek(G.seed, G.year, 7, 2)), '同じ週のレースが変わる');
    // 1年分の週を進めても、出走表は OP 以上だけ
    let cards = 0;
    for (let i = 0; i < 20; i++) { for (const c of W.cards()) { cards++; assert(c.race.graded || c.race.cls === 'OP', `出走表に OP 未満 ${c.race.name}`); } W.finishWeek({}); }
    const avg = U.avg(perWeek);
    return `1年 ${n}レース（オープン ${op}・うちリステッド ${listed}・2歳 ${two}）・週あたりのオープン ${avg.toFixed(1)}（${Math.min(...perWeek)}〜${Math.max(...perWeek)}）・出走表 ${cards}`;
  });

  // その年の暦から、条件の合う重賞を1つ
  const raceOf = (G, f) => { for (let m = 1; m <= 12; m++) for (let w = 1; w <= 4; w++) { const r = R.gradedOf(G.year, m, w).find(f); if (r) return r; } return null; };

  check('oponly: プレイヤーの馬は最初から OP に出られ、G2 までは無条件（年齢・性の決まりだけ）', () => {
    W.newGame({ seed: 22, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get();
    const base = W.all().find(h => h.hist && !h.foreignTrained && h.sex === '牝');
    const fresh = age => Object.assign({}, base, { born: G.year - age, starts: 0, wins: 0, earn: 0, prize: 0, gradedWins: [], rights: {}, owner: 'P', lastRaceW: null, at: null });
    // 2歳の6月から、デビュー前の馬（0戦・賞金0）が2歳オープンに出られる
    const two = R.openOf(G.seed, G.year, 6, 1).find(r => r.age === '2');
    assert(two && R.ineligible(fresh(2), two, G.year) === null, `2歳オープンに出られない（${two && R.ineligible(fresh(2), two, G.year)}）`);
    // 0勝の古馬が古馬のオープン・リステッド・G3・G2 に出られる
    let opens = 0;
    for (let w = 1; w <= 4; w++) for (const r of R.openOf(G.seed, G.year, 10, w)) if (r.age === '3+') { opens++; assert(R.ineligible(fresh(4), r, G.year) === null, `0勝の古馬が ${r.name} に出られない`); }
    assert(opens > 0, '古馬のオープンが無い');
    let g23 = 0;
    for (let m = 1; m <= 12; m++) for (let w = 1; w <= 4; w++) for (const r of R.gradedOf(G.year, m, w)) {
      if (r.region !== 'JRA' || r.grade === 'G1') continue;
      const age = r.age === '2' ? 2 : r.age === '3' ? 3 : 4;
      const why = R.ineligible(fresh(age), r, G.year);
      assert(why === null, `${r.grade} ${r.name} に賞金0・0勝で出られない（${why}）`);
      g23++;
    }
    // 年齢・性の決まりは残る
    const g2 = raceOf(G, r => r.grade === 'G2' && r.region === 'JRA' && r.age === '3');
    assert(R.ineligible(fresh(4), g2, G.year) === '年齢', '3歳限定に古馬が出られる');
    const fem = raceOf(G, r => r.region === 'JRA' && r.sex === '牝' && r.grade !== 'G1');
    assert(R.ineligible(Object.assign(fresh(fem.age === '2' ? 2 : fem.age === '3' ? 3 : 4), { sex: '牡' }), fem, G.year) === '牝馬限定', '牝馬限定に牡馬が出られる');
    // 優先順は獲得賞金の順（クラスは無い）
    const rng = () => new U.RNG(3);
    assert(R.priority(Object.assign(fresh(4), { earn: 3000 }), two, G.year, rng()) > R.priority(fresh(4), two, G.year, rng()), '賞金の多い馬が先にならない');
    return `JRA の G2・G3 ${g23}レースに賞金0で出られる`;
  });

  check('oponly: G1 は獲得賞金の条件（足りないと「賞金が足りない」・足りれば出られる・トライアルの優先出走権で出られる）', () => {
    W.newGame({ seed: 23, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get();
    const base = W.all().find(h => h.hist && !h.foreignTrained && h.sex === '牝');
    const mk = (age, earn, rights) => Object.assign({}, base, { born: G.year - age, starts: 3, wins: 1, earn, gradedWins: [], rights: rights || {}, owner: 'P', lastRaceW: null, at: null });
    const out = [];
    for (const [age, f] of [[2, r => r.age === '2'], [3, r => r.age === '3'], [4, r => r.age === '3+' || r.age === '4+']]) {
      const g1 = raceOf(G, r => r.grade === 'G1' && r.region === 'JRA' && f(r) && !r.sex);
      const need = R.g1Need(g1, G.year);
      assert(need > 0 && need === Math.round(R.G1_EARN[age === 2 ? '2' : age === 3 ? '3' : 'older'] * U.priceIndex(G.year) / 10) * 10, '要る額');
      const why = R.ineligible(mk(age, need - 10), g1, G.year);
      assert(why && why.startsWith(R.G1_WHY), `${g1.name}：賞金が足りないのに出られる（${why}）`);
      assert(R.ineligible(mk(age, need), g1, G.year) === null, `${g1.name}：賞金が足りるのに出られない`);
      out.push(`${age === 4 ? '古馬' : age + '歳'} ${U.money(need)}`);
    }
    // 2歳の G1 は OP を1つ勝てば足りる。3歳・古馬はそれより多い
    const op = R.CLS_PRIZE.OP * U.priceIndex(G.year);
    assert(R.G1_EARN['2'] * U.priceIndex(G.year) <= op && R.G1_EARN['3'] > R.G1_EARN['2'] && R.G1_EARN.older > R.G1_EARN['3'], '要る額の並び');
    // トライアルの優先出走権
    const trial = HS.DATA.races.find(r => r.trialFor === '皐月賞' && r.from <= (U.ERA || G.year) && (U.ERA || G.year) <= (r.to || 9999));
    const satsuki = raceOf(G, r => r.name === '皐月賞');
    assert(trial && satsuki, 'トライアルが無い');
    assert(R.ineligible(mk(3, 0, { '皐月賞': G.year }), satsuki, G.year) === null, '優先出走権で出られない');
    assert(R.ineligible(mk(3, 0, { '皐月賞': G.year - 1 }), satsuki, G.year).startsWith(R.G1_WHY), '去年の優先出走権で出られる');
    // 予約も、いまの賞金で見る（番組表と同じ）
    const h = W.all().find(x => x.hist && x.owner !== 'P' && x.loc === 'stable' && G.year - x.born === 4 && !x.foreignTrained);
    Object.assign(h, { owner: 'P', auto: false, earn: 0, rights: {}, lastRaceW: null, at: null }); W.dirty();
    const fut = W.upcomingGraded(T.RESERVE_WEEKS).find(r => r.grade === 'G1' && r.region === 'JRA' && r.inWeeks >= 2 && !T.staticIneligible(h, r, r.year));
    assert(fut, '予約できる G1 が無い');
    const e1 = T.reserve(h.id, fut);
    assert(e1 && e1.startsWith(R.G1_WHY), `賞金0で G1 を予約できる（${e1}）`);
    const row = HS.Program.rows(h, { show: 'all', kind: 'graded' }).find(x => x.race.key === fut.key);
    assert(row && row.why && row.why.startsWith(R.G1_WHY) && !row.can, '番組表に「賞金が足りない」が出ない');
    h.earn = R.g1Need(fut, fut.year);
    assert(T.reserve(h.id, fut) === null, '賞金が足りるのに G1 を予約できない');
    // 自動で遊んだ G1 の出走表：出た馬（その場限りの馬・スペシャルホース・外国調教馬を除く）はみな賞金か優先出走権を持っている
    let g1s = 0, runners = 0;
    for (let i = 0; i < 30; i++) {
      for (const c of W.cards()) if (c.race.grade === 'G1' && c.race.region === 'JRA') {
        g1s++;
        for (const x of c.runners) { if (x.horse.filler || x.legend || x.horse.legend || x.horse.foreignTrained) continue; runners++; assert(R.g1Why(x.horse, c.race, G.year) === null, `${c.race.name}に賞金の足りない ${x.horse.name}（${x.horse.earn || 0}）`); }
      }
      W.finishWeek({});
    }
    return `要る額 ${out.join('・')}・30週の G1 ${g1s}レースに条件を満たした馬 ${runners}頭`;
  });

  check('oponly: 海外の G1 の条件は仮で、1か所（R.abroadWhy）で決まる。豪州の2歳 G1 は出られない・ほかの2歳の海外 G1 は無条件・ほかは JRA の G1 と同じ賞金', () => {
    W.newGame({ seed: 24, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get();
    const base = W.all().find(h => h.hist && !h.foreignTrained && h.sex !== '牝');
    const mk = (age, earn) => Object.assign({}, base, { born: G.year - age, starts: 3, wins: 1, earn, gradedWins: [], rights: {}, owner: 'P', lastRaceW: null, at: null });
    const ages = r => r.age === '2' ? 2 : r.age === '3' ? 3 : 4;
    const cOf = r => r.country || (HS.DATA.courses[r.course] || {}).country;
    const two = raceOf(G, r => r.region === '海外' && r.grade === 'G1' && r.age === '2' && !r.sex && cOf(r) !== '豪');
    // 豪州の2歳 G1 には出られない（持ち主の決定 2026-10-20）。賞金が多くても同じ
    const au = []; for (let m = 1; m <= 12; m++) for (let w = 1; w <= 4; w++) for (const r of R.gradedOf(G.year, m, w)) if (r.region === '海外' && r.grade === 'G1' && r.age === '2' && cOf(r) === '豪') au.push(r);
    assert(au.length >= 3, `豪州の2歳 G1 が暦に少ない（${au.length}）`);
    for (const r of au) assert(R.ineligibleBase(Object.assign(mk(2, 1e6), { sex: r.sex || '牝' }), r, G.year) === R.AU2_WHY, `豪州の2歳 G1 に出られる（${r.name}）`);
    const old = raceOf(G, r => r.region === '海外' && r.grade === 'G1' && r.age !== '2' && !r.sex);
    const g2 = raceOf(G, r => r.region === '海外' && r.grade !== 'G1' && !r.sex);
    assert(two && old && g2, '海外のレースが無い');
    assert(R.ineligibleBase(mk(2, 0), two, G.year) === null, `2歳の海外 G1 に賞金0で出られない（${two.name}）`);
    assert((R.ineligibleBase(mk(ages(old), 0), old, G.year) || '').startsWith(R.G1_WHY), `海外の G1 に賞金0で出られる（${old.name}）`);
    assert(R.ineligibleBase(mk(ages(old), R.g1Need(old, G.year)), old, G.year) === null, '海外の G1 に賞金が足りるのに出られない');
    assert(R.ineligibleBase(mk(ages(g2), 0), g2, G.year) === null, `海外の G2・G3 に賞金0で出られない（${g2.name}）`);
    // 1か所の関数を差し替えると、海外のレースの条件だけが変わる
    const keep = R.abroadWhy;
    try {
      R.abroadWhy = () => 'テストの条件';
      assert(R.ineligibleBase(mk(2, 0), two, G.year) === 'テストの条件' && R.ineligibleBase(mk(ages(g2), 0), g2, G.year) === 'テストの条件', '差し替えが海外のレースに効かない');
      const jra = raceOf(G, r => r.region === 'JRA' && r.grade === 'G2' && r.age !== '2' && r.age !== '3' && !r.sex);
      assert(R.ineligibleBase(mk(4, 0), jra, G.year) === null, '差し替えが JRA のレースに効いた');
    } finally { R.abroadWhy = keep; }
    // 外国で調教されている馬は、重賞なら賞金を問わない
    const ft = W.all().find(h => h.foreignTrained);
    if (ft) assert(R.ineligibleBase(Object.assign({}, ft, { born: G.year - ages(old), earn: 0 }), old, G.year) === null, '外国調教馬が賞金で止まる');
    return `豪州の2歳 G1 ${au.length}（出られない）・2歳 ${two.name}・古馬 ${old.name}（${U.money(R.g1Need(old, G.year))}）・${g2.grade} ${g2.name}`;
  });

  check('oponly: 前のセーブの条件戦（鍵 -c…）の予約・出走登録・騎乗が外れ、デビュー戦の予約は残る。セーブの往復で変わらない', () => {
    W.newGame({ seed: 25, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get();
    const h = W.all().find(x => x.hist && x.owner !== 'P' && x.loc === 'stable' && G.year - x.born === 3);
    h.owner = 'P';
    const g = JSON.parse(W.serialize());
    const y = G.year;
    const gr = W.upcomingGraded(20).find(r => r.inWeeks >= 3 && !T.staticIneligible(h, r, r.year));
    g.reserve = [
      { id: h.id, key: `${y}-3-2-c0-3`, y, m: 3, w: 2, label: '3歳1勝クラス' },
      { id: h.id, key: gr.key, y: gr.year, m: gr.month, w: gr.week, label: R.label(gr) },
      { id: h.id, key: `debut:${y}-7-1`, y, m: 7, w: 1, label: '新馬戦', debut: true },
    ];
    const ck = `${y}-${G.month}-${G.week}-c1-2`;
    g.entries = { [ck]: [{ horseId: h.id, jockey: 'x' }] };
    g.rides = { [ck]: h.id };
    W.load(JSON.stringify(g));
    const G2 = W.get();
    assert(!G2.reserve.some(x => R.isOldKey(x.key)), '条件戦の予約が残る');
    assert(G2.reserve.some(x => x.key === gr.key), '重賞の予約が消えた');
    const deb = G2.reserve.find(x => x.debut);
    assert(deb && deb.label === 'デビュー戦', 'デビュー戦の予約が残らない');
    assert(!Object.keys(G2.entries).some(R.isOldKey) && !Object.keys(G2.rides).some(R.isOldKey), '条件戦の出走登録・騎乗が残る');
    const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
    // 鍵の見分け：前の版の条件戦だけ
    assert(R.isOldKey('2025-6-1-c0-3') && !R.isOldKey('2025-6-1-o0-3') && !R.isOldKey('2025-6-1-有馬記念') && !R.isOldKey('debut:2025-6-1'), '鍵の見分け');
    return `予約 ${G2.reserve.length}件（${G2.reserve.map(x => x.label).join('・')}）`;
  });

  check('oponly: 自動で遊ぶと、自分の2歳馬は2歳オープンでデビューし、AI の馬も OP 以上だけを走る', () => {
    W.newGame({ seed: 26, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get(); G.player.money = 1e9;
    G.month = 6; // 店が2歳を売るのは6〜12月
    const it = W.marketHistoric().filter(x => G.year - x.horse.born === 2).sort((a, b) => a.price - b.price)[0];
    assert(it && !W.buy(it), '2歳を買えない');
    const h = W.horse(it.horse.id);
    let first = null, guard = 0;
    while (!h.starts && guard++ < 40) {
      W.toStable && h.loc === 'farm' && W.toStable(h.id);
      h.auto = true;
      const rep = W.finishWeek({});
      for (const x of rep.races) {
        assert(x.race.graded || x.race.cls === 'OP', `OP 未満のレースが走った ${x.race.name}`);
        if (!first && x.runners.some(r => r.horse.id === h.id)) first = x.race;
      }
    }
    assert(first && !first.graded && first.age === '2', `2歳オープンでデビューしない（${first && first.name}）`);
    const res = h.results[0];
    return `${h.name}：${res.m}月${res.w}週 ${first.name}（${first.course}${first.surface}${first.dist}m）${res.pos}着`;
  });
};
