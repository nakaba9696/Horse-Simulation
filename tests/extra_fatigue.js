// 確かめ：疲労（js/core/fatigue.js・js/core/racesim.js の S.FATIGUE）と、故障が無いこと
// 持ち主の仕様書 docs/SPEC.md「疲労」（2026-10-19）。数の表は docs/BALANCE.md の「疲労」
module.exports = function (check, assert, HS) {
  const W = HS.World, U = HS.U, H = HS.Horse, R = HS.Races, S = HS.Sim, F = HS.Fatigue, T = HS.Season, P = HS.Program;
  const QUICK = !!process.env.QUICK;
  const JC = { name: 'ジャパンカップ', grade: 'G1', graded: true, dist: 2400, surface: '芝', course: '東京', ground: '良', region: 'JRA', year: 2025, month: 11, week: 4 };
  const G3 = Object.assign({}, JC, { name: 'アルゼンチン共和国杯', grade: 'G3' });
  const COND = { name: '3歳以上2勝クラス', grade: null, graded: false, cls: 'C2', dist: 2400, surface: '芝', course: '東京', ground: '良', region: 'JRA', year: 2025, month: 11, week: 4 };
  const wIdx = H.weekIndex(2025, 11, 4);
  // 着順の並び（lengths＝前の馬との差・endE＝残りのスタミナ）
  const duel = [{ lengths: 0, endE: 0 }, { lengths: 0.05, endE: -0.02 }, { lengths: 2, endE: -0.1 }];
  const easy = [{ lengths: 0, endE: 0.25 }, { lengths: 6, endE: 0.02 }, { lengths: 1, endE: -0.05 }];
  const field = (rng, lvMe, lvOpp, n) => { const me = H.makeFiller(rng, { level: lvMe, surface: '芝', dist: 2400, born: 2021 }); me.name = 'me'; me.owner = 'P'; /* 疲労がたまるのは自分の馬だけ（AI の馬は疲労なし。持ち主の補足 2026-10-20） */ me.health = 75; me.distMin = 2000; me.distMax = 2800; me.fatigue = 0; const opp = []; for (let i = 0; i < n; i++) { const h = H.makeFiller(rng, { level: lvOpp, surface: '芝', dist: 2400, born: 2021 }); h.name = 'o' + i; opp.push(h); } return { me, opp }; };
  const runners = (me, opp) => [me, ...opp].map((h, i) => ({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 }));

  check('fatigue: 故障が起きない（調教・レース・牧場のどこでも）。故障の仕組みが無い', () => {
    assert(!H.injure && !H.INJURIES, '故障の仕組みが残っている');
    for (const m of Object.values(H.MENUS)) assert(m.risk == null, '調教に故障の危険の値が残っている');
    W.newGame({ mode: 'jockey', seed: 41, jockeyName: 'テスト', region: '美浦' });
    const G = W.get(); G.player.money = 1e9;
    for (const it of W.marketHistoric().slice(0, 3)) W.buy(it);
    let runs = 0;
    for (let i = 0; i < (QUICK ? 6 : 16); i++) { for (const h of W.mine()) h.auto = true; const rep = W.finishWeek({}); runs += rep.races.reduce((s, r) => s + r.runners.length, 0); }
    const bad = W.all().filter(h => 'injury' in h);
    assert(!bad.length, `故障の項目がある馬 ${bad.length}頭`);
    assert(!G.news.some(n => /故障|全治|発症/.test(n.text || n.t || '')), '故障の知らせが出た');
    return `${runs}頭が走って故障 0`;
  });

  check('fatigue: 前のセーブで故障していた馬は治った扱い（読み直すと故障の項目が消え、出られる）', () => {
    W.newGame({ mode: 'jockey', seed: 42, jockeyName: 'テスト', region: '美浦' });
    const G = W.get();
    const h = W.all().find(x => x.hist && x.loc === 'stable' && G.year - x.born >= 4);
    h.injury = { name: '屈腱炎', weeks: 40, severe: true };
    const s = JSON.parse(W.serialize()); s.horses[h.id].injury = { name: '屈腱炎', weeks: 40, severe: true };
    W.load(JSON.stringify(s));
    const h2 = W.horse(h.id);
    assert(h2 && !('injury' in h2), '故障の項目が残った');
    const rc = W.weekRaces().find(r => !R.ineligible(h2, r, W.get().year));
    assert(!rc || R.ineligible(h2, rc, W.get().year) !== '故障中', '故障中のまま');
  });

  check('fatigue: 格の重いレースの激戦ほど多くたまり、脚を余らせた余裕勝ちは少ない。すごい G1 だけ重くする決まりは無い', () => {
    const gJ = F.gain(JC, duel, 0), gJe = F.gain(JC, easy, 0), g3 = F.gain(G3, duel, 0), gc = F.gain(COND, duel, 0);
    // 持ち主の決定 2026-10-20「すごいG1だと相手が強いので結果的に激戦になって勝手に疲労が溜まる」：レースの名前では変わらない
    assert(F.TOP_G1 === undefined && F.isTop === undefined && F.GRADE.top === undefined, 'すごい G1 の表が残っている');
    const otherG1 = Object.assign({}, JC, { name: 'エリザベス女王杯' });
    assert(F.gain(otherG1, duel, 0) === gJ && F.gain(otherG1, easy, 1) === F.gain(JC, easy, 1), 'G1 の名前でたまる量が変わる');
    assert(gJ > g3 && g3 > gc, `格の順にならない（JC ${gJ.toFixed(1)}・G3 ${g3.toFixed(1)}・条件戦 ${gc.toFixed(1)}）`);
    assert(gJe < gJ * 0.65, `余裕勝ちが少なくない（${gJe.toFixed(1)} / 激戦 ${gJ.toFixed(1)}）`);
    // 着順の2着でも、ハナ差の激戦は大差負けより多い
    assert(F.gain(JC, duel, 1) > F.gain(JC, easy, 1), '僅差の2着が大差の2着より少ない');
    // 長い距離ほど多い
    assert(F.gain(Object.assign({}, COND, { dist: 3200 }), duel, 0) > F.gain(Object.assign({}, COND, { dist: 1200 }), duel, 0), '距離で増えない');
    // 激戦の度合いの幅
    for (const r of [duel, easy]) for (let k = 0; k < r.length; k++) { const v = F.severity(r, k); assert(v >= F.SEV.lo - 1e-9 && v <= F.SEV.lo + F.SEV.close + F.SEV.spent + 1e-9, '度合いの幅'); }
    return `JC の激戦 ${gJ.toFixed(1)}・JC の余裕勝ち ${gJe.toFixed(1)}・G3 の激戦 ${g3.toFixed(1)}・条件戦の激戦 ${gc.toFixed(1)}`;
  });

  check('fatigue: 強い相手と競り合うと、同じレースでも疲労が多くたまる（すごい G1 の重さは相手の強さから来る）', () => {
    // 同じ強い馬・同じレース（ジャパンカップ）で、少し下の相手13頭（競り合う）と、ずっと弱い相手13頭（楽に勝つ）。たまる量の平均を比べる
    const N = QUICK ? 16 : 40;
    let tight = 0, soft = 0;
    for (let t = 0; t < N; t++) for (const lvOpp of [90, 76]) {
      const { me, opp } = field(new U.RNG(1300 + t), 96, lvOpp, 13);
      const res = S.run(JC, runners(me, opp), wIdx, new U.RNG(1700 + t), {});
      const k = res.results.findIndex(x => x.horse === me);
      const g = F.gain(JC, res.results, k);
      if (lvOpp === 90) tight += g; else soft += g;
    }
    tight /= N; soft /= N;
    assert(tight > soft * 1.06, `強い相手でたまる量が増えない（強い相手 ${tight.toFixed(1)}・弱い相手 ${soft.toFixed(1)}）`);
    return `ジャパンカップでたまる量：強い相手 ${tight.toFixed(1)}・弱い相手 ${soft.toFixed(1)}`;
  });

  check('fatigue: 調子は無い（強さ・新しい馬・調教・前のセーブ）。馬の状態は疲労だけ', () => {
    // 強さ：前のセーブに残った調子の値は効かない
    const rng = new U.RNG(8);
    const { me } = field(rng, 88, 86, 1);
    assert(!('cond' in me), '新しい馬に調子の項目がある');
    const p0 = S.power(me, JC, wIdx, {}).total;
    me.cond = 100; const p1 = S.power(me, JC, wIdx, {}).total;
    me.cond = -100; const p2 = S.power(me, JC, wIdx, {}).total;
    assert(p0 === p1 && p0 === p2, '調子の値で強さが変わる');
    delete me.cond;
    // 調教では調子が動かない（疲労だけ。休ませるメニューは疲労が抜ける）
    for (const m of Object.values(H.MENUS)) assert(m.cond == null, '調教のメニューに調子の効きが残っている');
    me.fatigue = 40; H.train(me, '休養', new U.RNG(2), wIdx);
    assert(!('cond' in me) && me.fatigue < 40, '休養で疲労が抜けない・調子ができた');
    // 調教師のひと言は疲労の段階から
    me.fatigue = 0; const c0 = H.comment(me); me.fatigue = 80; const c4 = H.comment(me);
    assert(c0 !== c4 && /休ませ/.test(c4), `調教師のひと言（${c0}／${c4}）`);
    // 前のセーブ：調子の項目は読み捨てる。読み直しても強さは同じ
    W.newGame({ mode: 'jockey', seed: 43, jockeyName: 'テスト', region: '美浦' });
    const s = JSON.parse(W.serialize());
    const ids = Object.keys(s.horses).slice(0, 20);
    for (const id of ids) s.horses[id].cond = 55;
    W.load(JSON.stringify(s));
    assert(ids.every(id => !W.horse(id) || !('cond' in W.horse(id))), '前のセーブの調子の項目が残った');
    // 1週進めても誰にも調子の項目ができない
    W.finishWeek({});
    assert(!W.all().some(h => 'cond' in h), '週を進めると調子の項目ができる');
    return `調子の値（±100）で強さが変わらない・前のセーブの調子を読み捨てる`;
  });

  check('fatigue: 健康が高いほど早く抜ける（毎週）。牧場ではもっと早い', () => {
    const weeksTo0 = (health, farm) => { const h = { fatigue: 80, health }; let n = 0; while (h.fatigue > 0 && n < 99) { F.weekly(h, farm ? F.REC.farm : 1); n++; } return n; };
    const a = weeksTo0(55), b = weeksTo0(75), c = weeksTo0(95);
    assert(a > b && b > c, `健康で速さが変わらない（${a}・${b}・${c}週）`);
    assert(weeksTo0(75, true) < b, '牧場で早くならない');
    assert(F.recover({ health: 10 }) >= F.REC.min, '下限');
    return `疲労80が0になるまで：健康55で${a}週・75で${b}週・95で${c}週`;
  });

  check('fatigue: 段階（5つ）と、疲労があると走りが落ちる（強さの下げ・模擬の着順）', () => {
    assert(F.STAGES.length === S.FATIGUE.at.length + 1 && S.FATIGUE.pen.length === F.STAGES.length, '段階の数');
    assert(F.stageOf(0) === 0 && F.stageOf(14.9) === 0 && F.stageOf(15) === 1 && F.stageOf(54.9) === 2 && F.stageOf(75) === 4 && F.stageOf(100) === 4, '段階の境目');
    for (let i = 1; i < S.FATIGUE.pen.length; i++) assert(S.FATIGUE.pen[i] > S.FATIGUE.pen[i - 1], '段階が上がるほど下げが大きい');
    // 段階の名前（万全・軽い疲れ・疲れ・疲れが濃い・使いすぎ）。調子の段階は無い（持ち主の決定 2026-10-20「調子のパラメータは無し。疲労だけにする」）
    assert(F.STAGES.map(x => x.label).join() === '万全,軽い疲れ,疲れ,疲れが濃い,使いすぎ', '段階の名前');
    assert(!T.COND && !T.condLevel && !T.cond && !H.condLabel, '調子の段階が残っている');
    const rng = new U.RNG(3);
    const { me, opp } = field(rng, 88, 86, 13);
    const p0 = S.power(me, JC, wIdx, {}).total;
    me.fatigue = 60; const p1 = S.power(me, JC, wIdx, {}).total;
    me.fatigue = 0; const p2 = S.power(me, JC, wIdx, { travel: 60 }).total;
    assert(p0 - p1 > 3 && Math.abs(p1 - p2) < 1e-9, `強さの下げ（${(p0 - p1).toFixed(2)}点）・移動の疲れも同じに効く`);
    // 模擬：同じ相手・同じ種で、疲労80（使いすぎ）と0の平均着順
    const N = QUICK ? 30 : 80;
    let s0 = 0, s1 = 0;
    for (let t = 0; t < N; t++) for (const fat of [0, 80]) {
      me.fatigue = fat;
      const res = S.run(JC, runners(me, opp), wIdx, new U.RNG(700 + t), {});
      const pos = res.results.findIndex(x => x.horse === me) + 1;
      if (fat) s1 += pos; else s0 += pos;
    }
    assert(s1 / N - s0 / N >= 1.2, `疲れていても着順が落ちない（${(s0 / N).toFixed(1)} → ${(s1 / N).toFixed(1)}）`);
    return `疲労60の下げ ${(p0 - p1).toFixed(1)}点・平均着順 ${(s0 / N).toFixed(1)} → ${(s1 / N).toFixed(1)}（疲労80）`;
  });

  check('fatigue: 強い馬（総合力80ほど）は連闘しても戦える。ふつうの G1 馬は連闘で落ちる', () => {
    const N = QUICK ? 10 : 24, WEEKS = 5;
    const run = (lv, fresh) => {
      let lateWins = 0, latePos = 0, fh = 0, fat = 0;
      for (let t = 0; t < N; t++) {
        const { me, opp } = field(new U.RNG(900 + t), lv, 86, 13);
        fh = T.fh(me, wIdx, '芝');
        for (let w = 0; w < WEEKS; w++) {
          const res = S.run(JC, runners(me, opp), wIdx, new U.RNG(5000 + t * 10 + w), {});
          const k = res.results.findIndex(x => x.horse === me);
          if (w >= 3) { latePos += k + 1; if (k === 0) lateWins++; fat += me.fatigue; }
          if (!fresh) F.afterRace(me, JC, res.results, k, 0);
          F.weekly(me);
        }
      }
      return { fh, win: lateWins / (N * 2), pos: latePos / (N * 2), fat: fat / (N * 2) };
    };
    const sR = run(104, false), sF = run(104, true), mR = run(88, false), mF = run(88, true);
    assert(sR.fh >= 80, `強い馬の総合力 ${sR.fh}`);
    // 5週続けてジャパンカップ（すごい G1 の重さは無くした。持ち主の決定 2026-10-20）でも「疲れ」（35）より上にたまる
    assert(sR.fat > 45, `強い馬にも疲労はたまる（${sR.fat.toFixed(0)}）`);
    assert(sR.win >= sF.win - 0.15 && sR.win >= 0.5, `強い馬が連闘で勝てない（連闘 ${(sR.win * 100).toFixed(0)}％・休み明け ${(sF.win * 100).toFixed(0)}％）`);
    assert(mR.pos - mF.pos >= 0.8, `ふつうの G1 馬が連闘で落ちない（${mF.pos.toFixed(1)} → ${mR.pos.toFixed(1)}着）`);
    return `4・5戦目：総合力${sR.fh}は勝率 ${(sF.win * 100).toFixed(0)}％→${(sR.win * 100).toFixed(0)}％（疲労 ${sR.fat.toFixed(0)}）／総合力${mR.fh}は平均 ${mF.pos.toFixed(1)}→${mR.pos.toFixed(1)}着（疲労 ${mR.fat.toFixed(0)}）`;
  });

  check('fatigue: 国が変わると移動の疲れ（同じ地域は少し・地域をまたぐと多め）。同じ国に居続ければ無い', () => {
    const fr = { region: '海外', course: 'ロンシャン', name: '凱旋門賞', grade: 'G1', graded: true, dist: 2400, surface: '芝' };
    const uk = { region: '海外', course: 'アスコット', name: 'キングジョージ6世＆クイーンエリザベスステークス', grade: 'G1', graded: true, dist: 2400, surface: '芝' };
    const jp = { region: 'JRA', course: '東京', name: 'ジャパンカップ', grade: 'G1', graded: true, dist: 2400, surface: '芝' };
    const h = { fatigue: 0 };
    assert(F.travel(h, jp) === 0, '日本の馬が日本で走るのに移動の疲れ');
    assert(F.travel(h, fr) === F.TRAVEL.far, '日本から仏');
    h.at = '仏';
    assert(F.travel(h, fr) === 0, '仏に居続けて移動の疲れ');
    assert(F.travel(h, uk) === F.TRAVEL.near, '仏から英は近い');
    assert(F.travel(h, jp) === F.TRAVEL.far, '仏から日本へ戻る');
    assert(F.travel(h, Object.assign({ invite: true }, fr)) === 0, 'GF（招待）に移動の疲れ');
    // レースのあと、いる国が移る（日本へ戻ると項目は消える）
    F.afterRace(h, fr, duel, 0, 0); assert(h.at === '仏', 'いる国');
    F.afterRace(h, jp, duel, 0, F.travel(h, jp)); assert(!('at' in h), '日本へ戻ったのに国が残る');
    // 外国で調教された馬は、はじめにいる国が無い（最初のレースはどこでも移動なし）
    assert(F.travel({ foreignTrained: true, country: '外' }, fr) === 0 && F.travel({ foreignTrained: true, country: '米' }, fr) === F.TRAVEL.far, '外国の馬のいる国');
  });

  check('fatigue: 連闘で別の国へは出られない（出走・番組表・予約）。中1週あれば出られる。同じ国なら連闘できる', () => {
    W.newGame({ mode: 'jockey', seed: 43, jockeyName: 'テスト', region: '美浦' });
    const G = W.get(); G.player.money = 1e9;
    const h = W.all().find(x => x.hist && x.loc === 'stable' && G.year - x.born === 4 && !x.foreignTrained && x.sex !== '牝');
    Object.assign(h, { owner: 'P', auto: false, wins: 8, starts: 10, earn: 1e5, fatigue: 0 });
    for (const k of H.STATS) h.pot[k] = 110;
    const wi = W.wIdx();
    const rcs = W.weekRaces().filter(r => r.region === 'JRA' && !r.invite);
    const rc = rcs.find(r => !R.ineligible(Object.assign({}, h, { lastRaceW: null }), r, G.year));
    assert(rc, '今週出られる国内のレースが無い');
    h.lastRaceW = wi - 1; h.at = '仏'; W.dirty();
    assert(R.ineligible(h, rc, G.year) === F.WHY, `先週は仏で走ったのに出られる（${R.ineligible(h, rc, G.year)}）`);
    assert(W.enter(h.id, rc.key) === F.WHY, '出走登録がはねられない');
    const row = P.rows(h, { show: 'all' }).find(x => x.race.key === rc.key);
    assert(row && row.why === F.WHY && !row.can, '番組表で「移動が間に合わない」と分からない');
    assert(P.rows(h).some(x => x.race.key === rc.key && x.why === F.WHY), '「出られるレース」の表示で、移動が間に合わないレースが消える（理由が見えない）');
    h.lastRaceW = wi - 2;
    assert(R.ineligible(h, rc, G.year) !== F.WHY, '中1週なのに出られない');
    h.lastRaceW = wi - 1; delete h.at;
    assert(R.ineligible(h, rc, G.year) !== F.WHY, '同じ国の連闘が出られない');
    // 予約：先の週の国内の重賞を予約したら、その次の週と前の週の海外のレースははねる。2週離れればよい
    h.lastRaceW = wi - 8;
    const wks = P.weeks(12);
    let i = 2, jp = null;
    for (; i < 8 && !jp; i++) jp = P.racesOf(wks[i]).find(r => r.region === 'JRA' && r.graded && !T.staticIneligible(h, r, r.year));
    i--;
    assert(jp, '先の週に国内の重賞が無い');
    assert(!T.reserve(h.id, jp), `国内の重賞を予約できない（${T.reserve(h.id, jp)}）`);
    const ov = { region: '海外', course: 'ロンシャン', name: '凱旋門賞', grade: 'G1', graded: true, dist: 2400, surface: '芝', age: '3+' };
    const mk = (k, x) => Object.assign({}, x, { year: wks[k].y, month: wks[k].m, week: wks[k].w, key: `${wks[k].y}-${wks[k].m}-${wks[k].w}-${x.name}` });
    assert(T.reserve(h.id, mk(i + 1, ov)) === F.WHY, '予約の次の週の別の国の予約がはねられない');
    assert(T.reserve(h.id, mk(i - 1, ov)) === F.WHY && F.travelWhy(h, mk(i - 1, ov)) === F.WHY, '予約の前の週の別の国の予約がはねられない');
    assert(F.travelWhy(h, mk(i + 2, ov)) === null && F.travelWhy(h, mk(i - 2, ov)) === null, '2週離れた別の国がはねられる');
    // 予約の鍵から国（重賞は暦の名前・条件戦と新馬戦は日本）
    assert(F.countryOfKey('2025-10-1-凱旋門賞') === '仏' && F.countryOfKey('2025-10-1-c3-1') === '日' && F.countryOfKey('2025-10-1-有馬記念') === '日', '鍵から国');
  });

  check('fatigue: 出走表の移動の疲れが走りに効き、レースのあと疲労に残る（今週の出走表から）', () => {
    W.newGame({ mode: 'jockey', seed: 44, jockeyName: 'テスト', region: '美浦' });
    const G = W.get(); G.player.money = 1e9;
    const h = W.all().find(x => x.hist && x.loc === 'stable' && G.year - x.born === 4 && !x.foreignTrained && x.sex !== '牝');
    Object.assign(h, { owner: 'P', auto: false, wins: 8, starts: 10, earn: 1e5, fatigue: 0, health: 70 });
    for (const k of H.STATS) h.pot[k] = 110;
    h.at = '仏'; h.lastRaceW = W.wIdx() - 3; W.dirty();
    const rc = W.weekRaces().find(r => r.region === 'JRA' && !r.invite && !R.ineligible(h, r, G.year));
    assert(!W.enter(h.id, rc.key), '出走登録できない');
    const card = W.cards().find(c => c.race.key === rc.key);
    const x = card.runners.find(y => y.horse === h);
    assert(x.travel === F.TRAVEL.far, `出走表の移動の疲れ ${x.travel}`);
    assert(card.runners.filter(y => y.horse !== h && y.travel).every(y => F.where(y.horse) !== F.countryOf(rc)), '移動の無い馬に移動の疲れ');
    const rep = W.finishWeek({});
    const r = rep.races.find(q => q.race.key === rc.key);
    const k = r.sim.results.findIndex(q => q.horse === h);
    const want = Math.max(0, Math.min(100, F.TRAVEL.far + F.gain(rc, r.sim.results, k)) - F.recover(h));
    assert(Math.abs(h.fatigue - want) < 1e-9 && !('at' in h), `レースのあとの疲労 ${h.fatigue} / ${want}・国 ${h.at}`);
  });
};
