// グランドフェスティバル（js/core/dream.js・data/gf.js）と伝説級の担当（js/core/special.js・data/legends.js）の検証
// 持ち主の仕様書 docs/SPEC.md の「GF」（2026-10-19）と持ち主の決定（2026-10-19「牝馬の GF は無し」「GF スプリントは芝1200m」）
module.exports = function (check, assert, HS) {
  const W = HS.World, T = HS.Season, SP = HS.Special, D = HS.DATA, TR = HS.Trophy;
  const fakeWin = (G, h, name, grade, surface, dist) => {
    h.results.push({ y: G.year, m: 10, w: 4, race: name, grade, surface, dist, pos: 1, pop: 2 });
    h.gradedWins.push({ y: G.year, race: name, short: name, grade, region: 'JRA' });
    W.dirty();
  };
  // 仕様書の表（競馬場・区分・担当）。パリロンシャン＝ロンシャン、ベルモントパーク＝ベルモント（data/courses.js の名前）
  const SPEC = { sprint: ['カラ', '芝', 1200, 'ザテトラーク'], mile: ['ニューマーケット', '芝', 1600, 'セントサイモン'], distance: ['エプソム', '芝', 2000, 'エクリプス'],
    classic: ['ロンシャン', '芝', 2400, 'グラディアトゥール'], long: ['フレミントン', '芝', 3200, 'ファーラップ'], dirt: ['ベルモント', 'ダ', 2000, 'マンノウォー'] };

  check('gf: 6つの GF（海外の競馬場・距離・担当の伝説級・トロフィー）と、伝説級から外れた名馬の行き先', () => {
    assert(T.GF_CATS.map(c => c.id).join() === Object.keys(SPEC).join(), `GF の区分（${T.GF_CATS.map(c => c.id)}）`);
    // 名前は「グランドフェスティバル」。前の名前の勝ち鞍（前のセーブ）も GF として、括弧の中の区分で数える
    assert(T.DC_NAME === 'グランドフェスティバル' && T.gfName('mile') === 'グランドフェスティバル（マイル）', 'GF の名前');
    const oldNames = { 'グランドフィナーレ（短距離）': 'sprint', 'グランドフィナーレ（ダート）': 'dirt', 'グランドフィナーレ（中長距離）': 'classic', 'グランドフィナーレ': 'classic', 'ドリームクラシック': 'classic' };
    for (const [n, c] of Object.entries(oldNames)) assert(T.isGF(n) && T.gfCatOfName(n) === c, `前の名前 ${n} → ${T.gfCatOfName(n)}`);
    assert(!T.isGF('有馬記念'), 'GF でないレースを GF に数える');
    for (const c of T.GF_CATS) {
      const [course, sf, dist, legend] = SPEC[c.id];
      assert(c.course === course && c.surface === sf && c.dist === dist && c.week === T.GF_WEEK, `${c.label}の形（${c.course}${c.surface}${c.dist}）`);
      const crs = D.courses[c.course];
      assert(crs && crs.region === '海外' && (sf === 'ダ' ? crs.dirt : crs.turf), `${c.course}に${sf}が無い`);
      const lay = ((D.layouts || {})[c.course] || {})[sf === 'ダ' ? 'dirt' : 'turf'] || [];
      assert(lay.some(l => (l.use || []).includes(dist)), `${c.course}${sf}${dist}m の形が data/layouts.js に無い`);
      assert(T.gfLegends(c.id).map(d => d.name).join() === legend, `${c.label}の担当（${T.gfLegends(c.id).map(d => d.name)}）`);
      assert(c.trophy && TR.BY['gf:' + c.id] && TR.BY['gf:' + c.id].label === c.trophy, `${c.label}のトロフィー`);
    }
    assert(new Set(T.GF_CATS.map(c => c.trophy)).size === T.GF_CATS.length, 'GF ごとのトロフィーが違う名前でない');
    // 伝説級は GF のグループだけ（1頭1グループ）。キンチェムは全部勝ったあとに出る
    const top = SP.pool().filter(d => SP.isTop(d));
    for (const d of top) { const x = SP.byName(d.name); assert(x && x.groups.length === 1 && ['gf', 'gfall'].includes(x.groups[0]), `${d.name}のグループ（${x && x.groups}）`); }
    assert(SP.members(SP.BY.gfall).map(d => d.name).join() === 'キンチェム', 'GF を全部勝ったあとに出る名馬');
    // 伝説級から外れた名馬は、ほかの条件のグループで出てくる
    const moved = { 'バーラム': 'uk3', 'オーモンド': 'uk3', 'サイテーション': 'us3', 'ウォーアドミラル': 'us3', 'カウントフリート': 'us3', 'ネアルコ': 'unbeaten', 'ドミノ': 'unbeaten' };
    for (const [n, gid] of Object.entries(moved)) { const x = SP.byName(n); assert(x && !SP.isTop(x.d) && x.groups.join() === gid, `${n}の行き先（${x && x.groups}）`); }
    for (const n of ['ブリガディアジェラード', 'アレフランス', 'プティトエトワール', 'ダリア', 'プリティーポリー', 'サンチャリオット']) assert(!SP.isTop(SP.data(n)), `${n}が伝説級`);
    return T.GF_CATS.map(c => `${c.label}：${c.course}${c.surface}${c.dist}（${T.gfLegends(c.id).map(d => d.name).join('・')}）`).join('／');
  });

  check('gf: 12月4週のあとの GF の週・連戦・疲れと勝ち数に数えない・担当の伝説級・店と牧場・トロフィー・キンチェム・古いセーブ', () => {
    assert(T.gfCatOfData({ sex: '牡', surface: '芝', distMin: 1800, distMax: 2200 }) === 'distance' && T.gfCatOfData({ sex: '牝', surface: '芝', distMin: 1000, distMax: 1400 }) === 'sprint', 'GF の馬の区分');
    W.newGame({ seed: 32, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get();
    let guard = 0;
    while (!(G.month === 12 && G.week === 4) && guard++ < 60) W.finishWeek({});
    assert(!(G.dc && G.dc.y === G.year), '12月4週より前に招待が来ている');
    assert(!W.weekRaces().some(r => r.invite), '12月4週に GF がある');
    // 自分の馬：前の年のクラシックの GF の勝ち馬で、今年マイルとクラシックの G1 を勝った馬
    const pool = W.all().filter(h => h.loc === 'stable' && !h.injury && G.year - h.born >= 4 && h.owner !== 'P' && !h.foreignTrained && !T.gfWins(h).length);
    const star = pool[0], colt = pool.find(h => h !== star && h.sex !== '牝');
    for (const h of [star, colt]) { h.owner = 'P'; h.auto = false; }
    fakeWin(G, star, 'マイルCS', 'G1', '芝', 1600); fakeWin(G, star, 'ジャパンC', 'G1', '芝', 2400);
    star.gradedWins.push({ y: G.year - 1, race: T.gfName('classic'), short: T.gfName('classic'), grade: 'GF', region: 'JRA' }); W.dirty();
    const save4 = W.serialize();
    W.finishWeek({});
    assert(G.month === 12 && G.week === T.GF_WEEK && /グランドフェスティバル/.test(W.dateLabel(G.year, G.month, G.week)), `GF の週にならない（${G.month}月${G.week}週）`);
    const races = W.weekRaces();
    assert(races.length === T.GF_CATS.length && races.every(r => r.invite && r.grade === 'GF' && r.week === T.GF_WEEK), `GF の週のレース（${races.map(r => r.name)}）`);
    assert(G.dc && G.dc.y === G.year && Object.keys(G.dc.gf).length === T.GF_CATS.length, '6つの招待が無い');
    // 連戦：同じ馬でいくつの GF にも出られる
    const el = c => T.dcEligible(c).map(x => x.h.id);
    const cats = ['mile', 'classic'].filter(c => el(c).includes(star.id));
    assert(cats.length === 2, `招待（${T.GF_CATS.filter(c => el(c.id).includes(star.id)).map(c => c.id)}）`);
    for (const c of T.dcPendingList()) T.dcDecline(c);
    for (const c of cats) assert(!T.dcChoose(c, star.id), `${c}に出られない`);
    const cards = W.cards().filter(c => c.race.invite);
    for (const c of cats) assert(cards.find(x => x.race.gf === c).runners.some(x => x.horse.id === star.id), `${c}の出走表に自分の馬がいない`);
    // 担当の伝説級：前の年のクラシックを勝った馬が出るクラシックにだけ、グラディアトゥール
    const lgOf = gfc => cards.find(x => x.race.gf === gfc).runners.filter(x => x.horse.legend).map(x => x.horse.name);
    assert(lgOf('classic').join() === 'グラディアトゥール' && !lgOf('mile').length, `伝説級（クラシック ${lgOf('classic')}・マイル ${lgOf('mile')}）`);
    const before = { starts: star.starts, wins: star.wins, fatigue: star.fatigue, cond: star.cond, rest: star.restUntil, pw: G.records.player.wins, ps: G.records.player.starts };
    const y0 = G.year;
    const rep = W.finishWeek({});
    assert(rep.races.length === T.GF_CATS.length && rep.races.every(r => r.race.invite), 'GF の週に GF 以外のレース');
    assert(G.year === y0 + 1 && G.month === 1 && G.week === 1, 'GF の週のあとに年が明けない');
    const m = W.horse(star.id);
    assert(m.starts === before.starts && m.wins === before.wins && m.fatigue === before.fatigue && m.cond === before.cond && m.restUntil === before.rest, 'GF で出走数・勝ち数・疲れ・調子が動いた');
    assert(G.records.player.wins === before.pw && G.records.player.starts === before.ps, 'GF を騎手の勝ち数に数えた');
    assert(m.results.filter(r => r.y === y0 && /グランドフェスティバル/.test(r.race)).length === 2, 'GF の成績が残らない');
    const won = rep.races.filter(r => r.sim.results[0].horse.id === star.id).map(r => r.race.gf);
    for (const c of won) assert(G.trophies['gf:' + c] && G.trophies['gf:' + c].hid === star.id && m.titles.includes(T.GF_BY[c].trophy), `${c}のトロフィー・冠`);

    // 勝ったとき：担当の伝説級が店に並び、初めての区分は牧場に1頭（2回目は無い）
    const G2 = W.get();
    const nRet = W.mine().filter(h => h.loc === 'retired').length;
    T.onGFWin(m, T.dcRace(G2.year, 'sprint'));
    const gift = W.mine().find(h => h.loc === 'retired' && h.name === 'ザテトラーク');
    assert(G2.unlocked.includes('ザテトラーク') && gift && gift.gfGift === 'sprint' && G2.gfGift.sprint === 'ザテトラーク', '担当の伝説級が店に並ばないか、牧場に来ない');
    T.onGFWin(m, T.dcRace(G2.year, 'sprint'));
    assert(W.mine().filter(h => h.loc === 'retired').length === nRet + 1, '牧場にもらう伝説級が2頭目も来る');
    assert(HS.Original.retired('牡').some(h => h.name === 'ザテトラーク'), 'オリジナルホースの父にできない');
    // 店に並んだあとも、前の年の勝ち馬が出れば伝説級は出てくる。お手馬にしている間は出ない
    m.gradedWins.push({ y: G2.year - 1, race: T.gfName('sprint'), short: T.gfName('sprint'), grade: 'GF', region: 'JRA' });
    const sp = () => SP.pending(m, T.dcRace(G2.year, 'sprint')).map(x => x.d.name);
    assert(sp().includes('ザテトラーク'), `店に並んだ伝説級が出てこない（${sp()}）`);
    gift.loc = 'stable'; W.dirty();
    assert(!sp().includes('ザテトラーク'), 'お手馬の伝説級が出てくる');
    gift.loc = 'retired'; W.dirty();
    // GF のトロフィーは2頭目の勝ち馬にも付き、殿堂の数に入る
    const rid = 'gf:mile';
    if (!G2.trophies[rid]) G2.trophies[rid] = { y: G2.year, horse: m.name, hid: m.id, bonus: 0 };
    colt.gradedWins.push({ y: G2.year, race: T.gfName('mile'), short: T.gfName('mile'), grade: 'GF', region: 'JRA' });
    TR.onWin(colt, T.dcRace(G2.year, 'mile'));
    assert(G2.trophies[rid].more.some(x => x.hid === colt.id) && HS.Hall.trophiesOf(colt).some(t => t.id === rid), '2頭目に GF のトロフィーが付かない');
    // GF を全部勝つと、どの GF にもキンチェム
    assert(!SP.pending(m, T.dcRace(G2.year, 'dirt')).some(x => x.d.name === 'キンチェム'), '全部勝つ前にキンチェム');
    for (const c of T.GF_CATS) G2.trophies['gf:' + c.id] = G2.trophies['gf:' + c.id] || { y: G2.year, horse: m.name, hid: m.id, bonus: 0 };
    assert(T.gfAllWon() && T.GF_CATS.every(c => SP.pending(colt, T.dcRace(G2.year, c.id)).some(x => x.d.name === 'キンチェム')), 'GF を全部勝ってもキンチェムが出ない');

    // 古いセーブ：12月2〜4週に GF を走っていた版の招待。まだ走っていなければ12月4週のあとに招待し直す
    const old = JSON.parse(save4);
    old.dc = { y: old.year, gf: { classic: { ai: [], elig: [], pick: null, ans: null } } };
    old.week = 1;
    W.load(JSON.stringify(old));
    assert(W.get().dc === null, `古い招待が残る（${JSON.stringify(W.get().dc)}）`);
    const old3 = JSON.parse(save4);
    old3.dc = { y: old3.year, gf: { classic: { ai: [], elig: [], pick: null, ans: null } } };
    delete old3.gfTrophy; // GF ごとのトロフィーより前の版のセーブ
    old3.horses[star.id].gradedWins.push({ y: old3.year - 2, race: 'グランドフィナーレ（中長距離）', short: 'グランドフィナーレ（中長距離）', grade: 'GF', region: 'JRA' });
    W.load(JSON.stringify(old3));
    const G3 = W.get();
    assert(G3.dc && G3.dc.v === 2 && !Object.keys(G3.dc.gf).length, '走った後の古い招待');
    assert(G3.trophies['gf:classic'] && G3.trophies['gf:classic'].hid === star.id, '前の版の GF の勝ちにトロフィーが付かない');
    W.finishWeek({});
    assert(G3.year === JSON.parse(save4).year + 1 && G3.week === 1, '古いセーブの年に GF の週が開く');
    const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
    return `連戦 ${cats.join('・')}（勝ち ${won.join('・') || 'なし'}）・クラシックの伝説級 ${lgOf('classic')}`;
  });
};
