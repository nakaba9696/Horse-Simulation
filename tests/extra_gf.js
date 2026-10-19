// 牝馬のグランドフィナーレと、伝説級の担当の GF（js/core/dream.js・js/core/special.js・data/legends.js）の検証
// 持ち主の指摘 2026-10-17「GF　牝馬部門も追加して　それぞれ担当するスペシャルホースもあわせて設定だして」
module.exports = function (check, assert, HS) {
  const W = HS.World, T = HS.Season, SP = HS.Special, D = HS.DATA;
  const fakeWin = (G, h, name, grade, surface, dist) => {
    h.results.push({ y: G.year, m: 10, w: 4, race: name, grade, surface, dist, pos: 1, pop: 2 });
    h.gradedWins.push({ y: G.year, race: name, short: name, grade, region: 'JRA' });
    W.dirty();
  };

  check('gf: 伝説級は担当の GF をデータに持ち、どの GF にも担当がいる（1頭1グループ・牝馬の GF は牝馬だけ）', () => {
    const lg = SP.members(SP.BY.gf);
    const all = SP.pool().filter(d => SP.isTop(d));
    assert(lg.length === all.length, `伝説級なのに伝説級のグループに入らない馬（${all.filter(d => !lg.includes(d)).map(d => d.name)}）`);
    for (const d of lg) {
      assert(T.GF_BY[d.gf], `${d.name}の担当の GF（${d.gf}）が無い`);
      assert(!T.GF_BY[d.gf].sex || d.sex === T.GF_BY[d.gf].sex, `${d.name}は牝馬でないのに牝馬の GF の担当`);
      const gs = SP.byName(d.name).groups;
      assert(gs.length === 1 && gs[0] === 'gf', `${d.name}が伝説級のほかのグループにも入る（${gs}）`);
    }
    for (const c of T.GF_CATS) assert(lg.some(d => d.gf === c.id), `${c.label}の GF に担当の伝説級がいない`);
    // 配り役の案の担当（data/legends.js の gf と legendMarks。持ち主が変えたらここも直す）
    const want = { sprint: 'ザテトラーク・ドミノ', mile: 'ネアルコ・ブリガディアジェラード', classic: 'オーモンド・バーラム', long: 'エクリプス・セントサイモン・ファーラップ',
      dirt: 'マンノウォー・サイテーション・カウントフリート・ウォーアドミラル', filly: 'キンチェム・プリティーポリー・アレフランス・プティトエトワール・ダリア・サンチャリオット' };
    for (const [c, names] of Object.entries(want)) {
      const got = lg.filter(d => d.gf === c).map(d => d.name).sort().join('・'), exp = names.split('・').sort().join('・');
      assert(got === exp, `${T.GF_BY[c].label}の担当（${got}）`);
    }
    // 史実馬のデータから伝説級にした名馬は、前のグループ（G1を5勝・歴代の英1000ギニー馬）から外れる
    for (const n of ['ブリガディアジェラード', 'アレフランス', 'プティトエトワール', 'ダリア', 'プリティーポリー']) assert(!SP.members(SP.BY.g1five).some(d => d.name === n), `${n}が G1を5勝した名馬に残る`);
    assert(!SP.members(SP.BY['r:英1000ギニー']).some(d => d.name === 'サンチャリオット'), 'サンチャリオットが歴代の英1000ギニー馬に残る');
    // 史実の値は書き換えない（印だけ足す）
    const bg = D.historic.find(d => d.name === 'ブリガディアジェラード');
    assert(bg && bg.tier === 'legend' && bg.gf === 'mile' && bg.born === 1968 && bg.sex === '牡', 'ブリガディアジェラードの印か史実の値');
    return T.GF_CATS.map(c => `${c.label}：${lg.filter(d => d.gf === c.id).map(d => d.name).join('・')}`).join('／');
  });

  check('gf: 牝馬の GF（京都芝2200・12月2週）は牝馬だけ・票は全部のレースから・2つの GF に出るときの間・担当の名牝が出てくる・古いセーブ', () => {
    const C = T.GF_BY.filly;
    assert(C && C.course === '京都' && C.surface === '芝' && C.dist === 2200 && C.week === 2 && C.sex === '牝' && C.label === '牝馬', '牝馬の GF の形が違う');
    assert(T.gfName('filly') === 'グランドフィナーレ（牝馬）' && T.gfCatOfName(T.gfName('filly')) === 'filly', '牝馬の GF の名前');
    // 票：牝馬の GF はその年の全部のレース（ダートも短距離も）
    const rs = { results: [{ y: 2030, grade: 'G1', pos: 1, pop: 1, surface: 'ダ', dist: 1600 }, { y: 2030, grade: 'G3', pos: 2, surface: '芝', dist: 1200 }, { y: 2029, grade: 'G1', pos: 1, surface: '芝', dist: 2200 }] };
    assert(T.votesOf(rs, 2030, 'filly') === 117 && T.votesOf(rs, 2030, 'classic') === 0, `牝馬の GF の票（${T.votesOf(rs, 2030, 'filly')}）`);
    // 馬の店の「GF の馬」：芝の牝馬は牝馬の GF
    assert(T.gfCatOfData({ sex: '牝', surface: '芝', distMin: 1600, distMax: 2400 }) === 'filly' && T.gfCatOfData({ sex: '牝', surface: 'ダ' }) === 'dirt' && T.gfCatOfData({ sex: '牡', surface: '芝', distMin: 1600, distMax: 2400 }) === 'classic', 'GF の馬の区分');

    W.newGame({ seed: 32, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get();
    let guard = 0;
    while (!(G.month === 11 && G.week === 4) && guard++ < 60) W.finishWeek({});
    const st = T.dcStanding('filly');
    assert(st.length >= T.DC_FIELD && st.every(x => x.h.sex === '牝'), `牝馬の GF の順位に牡馬・せん馬がいる（${st.filter(x => x.h.sex !== '牝').map(x => x.h.name)}）`);
    // 自分の馬：牝馬1頭（前の年の牝馬の GF の勝ち馬で、今年 G1 をマイルと中長距離で勝った）と牡馬1頭
    const pool = W.all().filter(h => h.loc === 'stable' && !h.injury && G.year - h.born >= 4 && h.owner !== 'P' && !h.foreignTrained && !T.gfWins(h).length);
    const mare = pool.find(h => h.sex === '牝'), colt = pool.find(h => h.sex === '牡');
    for (const h of [mare, colt]) { h.owner = 'P'; h.auto = false; }
    fakeWin(G, mare, 'マイルCS', 'G1', '芝', 1600); fakeWin(G, mare, 'ジャパンC', 'G1', '芝', 2400);
    mare.gradedWins.push({ y: G.year - 1, race: T.gfName('filly'), short: T.gfName('filly'), grade: 'GF', region: 'JRA' }); W.dirty();
    const save11 = W.serialize();
    assert(T.dcStatus(colt, 'filly').state === 'sex' && T.dcStatus(colt, 'filly').text === '牝馬限定', `牡馬の牝馬の GF の資格（${T.dcStatus(colt, 'filly').state}）`);
    assert(['filly', 'mile', 'classic'].every(c => T.dcStatus(mare, c).state === 'sure'), `牝馬の資格 ${['filly', 'mile', 'classic'].map(c => T.dcStatus(mare, c).state)}`);
    W.finishWeek({});
    assert(G.month === 12 && G.week === 1 && G.dc && G.dc.gf && Object.keys(G.dc.gf).length === 6, '12月1週に6つの招待が来ない');
    const elig = c => T.dcEligible(c).map(x => x.h.id);
    assert(elig('filly').includes(mare.id) && !elig('filly').includes(colt.id), '牝馬の GF の招待が違う');
    assert(G.dc.gf.filly.ai.every(id => W.horse(id).sex === '牝'), '牝馬の GF の招待（ほかの馬）に牡馬がいる');
    // 間：牝馬（2週）と中長距離（4週）は両方出られる。マイル（3週）とは片方だけ
    for (const c of T.dcPendingList()) T.dcDecline(c);
    assert(!T.dcChoose('filly', mare.id) && !T.dcChoose('classic', mare.id), '牝馬の GF と中長距離の GF の両方に出られない');
    assert(T.dcChoose('mile', mare.id), '牝馬の GF と間2週なしのマイルの GF にも出られる');
    // 牝馬の GF（2週）：牝馬だけ16頭と、担当の名牝（強い順に4頭まで）
    W.finishWeek({});
    assert(G.week === 2, '2週にならない');
    const card = W.cards().find(c => c.race.gf === 'filly');
    assert(card && card.race.course === '京都' && card.race.dist === 2200 && card.race.sex === '牝', '2週に牝馬の GF が無い');
    assert(card.runners.every(x => x.horse.sex === '牝'), `牝馬の GF に牝馬でない馬（${card.runners.filter(x => x.horse.sex !== '牝').map(x => x.horse.name)}）`);
    const lgs = card.runners.filter(x => x.horse.legend).map(x => x.horse.name);
    const want = SP.members(SP.BY.gf).filter(d => d.gf === 'filly').slice(0, SP.MAX_IN_RACE).map(d => d.name);
    assert(lgs.length === SP.MAX_IN_RACE && lgs.join() === want.join(), `出てきた伝説級（${lgs}）が担当の名牝の強い順（${want}）でない`);
    assert(card.runners.filter(x => !x.horse.legend).length === T.DC_FIELD && card.runners.some(x => x.horse.id === mare.id), '招待の16頭と自分の馬');
    // ほかの GF には牝馬の担当の名牝は出てこない（自分の馬は前の年に牝馬の GF しか勝っていない）
    for (const c of W.cards().filter(x => x.race.invite && x.race.gf !== 'filly')) assert(!c.runners.some(x => x.horse.legend), `${c.race.name}に伝説級が出てくる`);
    W.finishWeek({});
    const fr = (W.horse(mare.id).results || []).find(r => r.y === G.year && r.race === T.gfName('filly'));
    assert(fr, '牝馬の GF の成績が残らない');
    const msg = `牝馬の GF の16位 ${T.dcCut('filly', G.year).votes}票・出てきた名牝 ${lgs.join('・')}（自分の馬 ${fr.pos}着）`;

    // 古いセーブ（牝馬の GF が無かった版）：12月1週の招待が5つのまま入っていても読めて、その年は牝馬の GF を開かない
    W.load(save11);
    W.finishWeek({});
    const g = JSON.parse(W.serialize());
    delete g.dc.gf.filly;
    W.load(JSON.stringify(g));
    const G2 = W.get();
    assert(G2.dc && Object.keys(G2.dc.gf).length === 5 && !T.dcPendingList().includes('filly'), '古いセーブの招待');
    const m2 = W.horse(mare.id);
    assert(T.dcStatus(m2, 'filly').state === 'notInvited', `古いセーブの牝馬の GF の資格（${T.dcStatus(m2, 'filly').state}）`);
    for (const c of T.dcPendingList()) T.dcDecline(c);
    const ran = [];
    while (G2.month === 12 && guard++ < 80) { const rep = W.finishWeek({}); for (const r of rep.races.filter(x => x.race.invite)) ran.push(r.race.gf); }
    assert(ran.length === 5 && !ran.includes('filly'), `古いセーブの年に走った GF（${ran}）`);
    const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
    return msg;
  });
};
