// トロフィー（js/core/trophy.js・data/trophies.js）と、トロフィーに紐づく隠し馬（js/core/special.js・data/trophy_horses.js）、足したレース（data/races_more.js）の検証
// 持ち主の仕様書 docs/SPEC.md の「トロフィー」「条件達成で出る隠し馬」（2026-10-19）と持ち主の決定（2026-10-19）
module.exports = function (check, assert, HS) {
  const W = HS.World, TR = HS.Trophy, SP = HS.Special, D = HS.DATA, H = HS.Horse, R = HS.Races, U = HS.U;
  // 仕様書の表（名前と、条件のレース）。レースは暦の短い名
  const SPEC = {
    '日本三冠': ['皐月賞', '日本ダービー', '菊花賞'], '英国三冠': ['英2000ギニー', '英ダービー', '英セントレジャー'], '米国三冠': ['ケンタッキーダービー', 'プリークネスS', 'ベルモントS'],
    '仏国三冠': ['仏2000ギニー', '仏ダービー', 'パリ大賞'], '日本ダート三冠': ['羽田盃', '東京ダービー', 'ジャパンダートクラシック'], '欧州三冠': ['英ダービー', 'キングジョージ', '凱旋門賞'],
    '欧州マイル三冠': ['英2000ギニー', 'ジャックルマロワ賞', 'QE2世S'], '豪州三冠': ['ランドウィックギニー', 'ローズヒルギニー', '豪ダービー'],
    '香港トリプルクラウン': ['スチュワーズC', '香港ゴールドカップ', 'チャンピオンズ＆チャターC'],
    '香港スプリント三冠': ['センテナリースプリントC', 'クイーンズシルヴァージュビリーC', 'チェアマンズスプリントプライズ'], '豪州スプリント三冠': ['ブラックキャビアライトニング', 'TJスミスS', 'ジ・エベレスト'],
    '日本牝馬三冠': ['桜花賞', 'オークス', '秋華賞'], '英国牝馬三冠': ['英1000ギニー', '英オークス', '英セントレジャー'], '米国牝馬三冠': ['エイコーンS', 'CCAオークス', 'アラバマS'],
    '仏国牝馬三冠': ['仏1000ギニー', '仏オークス', 'ヴェルメイユ賞'], '欧州オークス三冠': ['英オークス', '仏オークス', '愛オークス'],
    'ワールドスプリント GS': ['スプリンターズS', 'ジ・エベレスト', 'BCターフスプリント', '香港スプリント'], 'ワールドマイル GS': ['安田記念', 'BCマイル', 'ジャックルマロワ賞', 'サセックスS'],
    'ワールドターフ GS': ['ドバイシーマクラシック', 'エクリプスS', 'キングジョージ', '凱旋門賞'], 'ワールドステイヤー GS': ['天皇賞・春', 'アスコットGC', 'グッドウッドC', 'メルボルンカップ'],
    'ワールドダート GS': ['サウジカップ', 'ドバイワールドカップ', 'ペガサスWC', 'BCクラシック'], 'ワールドティアラ GS': ['ヴィクトリアマイル', 'ナッソーS', 'ヴェルメイユ賞', 'BCフィリー＆メアターフ'],
    'ヨーロピアン GS': ['プリンスオブウェールズS', '英インターナショナルS', '愛チャンピオンS', '英チャンピオンS'], 'アメリカン GS': ['ペガサスWC', 'メトロポリタンH', 'ホイットニーS', 'BCクラシック'],
    'ジャパン GS': ['天皇賞・春', '宝塚記念', '天皇賞・秋', 'ジャパンC', '有馬記念'], 'ジャパンダート GS': ['フェブラリーステークス', '帝王賞', '南部杯', 'JBCクラシック', '東京大賞典'],
    'オーストラリアン GS': ['メルボルンカップ', 'コックスプレート', 'ジ・エベレスト'],
    'アークエンペラー': ['凱旋門賞'], 'メイダンルーラー': ['ドバイワールドカップ'], 'キングオブエベレスト': ['ジ・エベレスト'], 'クラウンオブブリーダーズ': ['BCクラシック', 'BCターフ'],
    'レジェンドホース': ['凱旋門賞', 'ドバイワールドカップ'], 'ホールオブフェイム': [], 'ワンダーホース': [], 'インモータルロード': [],
    'GF クラシック覇者': null, 'GF ディスタンス覇者': null, 'GF マイル覇者': null, 'GF スプリント覇者': null, 'GF ステイヤー覇者': null, 'GF ダート覇者': null,
  };
  const ADDED = ['ランドウィックギニー', 'ローズヒルギニー', '豪ダービー', 'サイアーズプロデュースS', 'シャンペンS', 'スチュワーズC', 'チャンピオンズ＆チャターC', 'センテナリースプリントC',
    'クイーンズシルヴァージュビリーC', 'チェアマンズスプリントプライズ', 'ブラックキャビアライトニング', 'TJスミスS', 'ジ・エベレスト', 'エイコーンS', 'CCAオークス', 'アラバマS', 'BCターフスプリント', 'グッドウッドC', 'メトロポリタンH'];
  const newGame = seed => { W.newGame({ seed, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' }); return W.get(); };
  // 自分の馬にする（史実馬から。牝馬なら sex を '牝'）
  const used = new Set();
  const myHorse = (G, sex) => {
    const h = W.all().find(x => x.hist && x.owner !== 'P' && !used.has(x.id) && x.loc === 'stable' && (sex === '牝' ? x.sex === '牝' : x.sex !== '牝') && !x.gelding);
    used.add(h.id);
    h.owner = 'P'; h.auto = false; h.gradedWins = []; h.results = [];
    return h;
  };
  const cal = () => { const m = new Map(); for (const r of R.gradedYear(W.get().year)) if (!m.has(r.short)) m.set(r.short, r); return m; };
  const winIt = (h, r, y) => { h.gradedWins.push({ y, race: r.name, short: r.short, grade: r.grade, region: r.region }); return TR.onWin(h, Object.assign({}, r, { year: y })); };
  const fitAge = (r, a) => r.age === '2' ? a === 2 : r.age === '3' ? a === 3 : r.age === '3+' ? a >= 3 : a >= 4;

  check('trophy: 仕様書の表のトロフィーが全部ある（名前・条件のレース・難しいほど高いお金）', () => {
    const labels = TR.LIST.map(t => t.label);
    for (const [label, races] of Object.entries(SPEC)) {
      const t = TR.LIST.find(x => x.label === label);
      assert(t, `トロフィー「${label}」が無い`);
      if (races) assert(t.races.join() === races.join(), `${label}の条件 ${t.races.join('・')}`);
    }
    // 仕様書に無いトロフィー（秋の古馬三冠など5つ）と豪州2歳三冠は外した（持ち主の決定 2026-10-20）。ドイツのディアナ賞（独オークス）は番組から外した
    assert(!D.races.some(r => r.name === 'ディアナ賞'), 'ディアナ賞が番組にある');
    const extra = TR.LIST.filter(t => !(t.label in SPEC));
    assert(!extra.length && !TR.CATS.some(c => c.id === 'extra'), `仕様書に無いトロフィーがある（${extra.map(t => t.label)}）`);
    assert(D.trophyRule.REMOVED.every(id => !TR.BY[id] && !(id in D.trophyHorses)), '外したトロフィーが残っている');
    assert(TR.LIST.every(t => t.tier >= 1 && t.tier <= 6 && t.focus.length && t.focus.every(k => H.STATS.includes(k))), '難しさか、上がる能力の書き方が違う');
    for (const a of TR.LIST) for (const b of TR.LIST) if (a.tier < b.tier) assert(TR.money(a) < TR.money(b), `${a.label} が ${b.label} より高い`);
    assert(new Set(labels).size === labels.length && new Set(TR.LIST.map(t => t.id)).size === TR.LIST.length, '名前か id が重なる');
    return `${TR.LIST.length}個（仕様書 ${Object.keys(SPEC).length}）`;
  });

  check('trophy: 足したレースが年代なしの暦にあり、条件のレースは全部いまの番組で走れる（同じ年のものは、出られる年齢がそろい週が重ならない）', () => {
    const G = newGame(61);
    const m = cal();
    for (const n of ADDED) { const r = m.get(n); assert(r && r.grade === 'G1' && r.region === '海外', `${n}が暦に無い`); assert(D.courses[r.course], `${n}の競馬場`); }
    const out = [];
    for (const t of TR.LIST.filter(x => x.kind === 'set' || x.kind === 'repeat')) {
      const rs = t.races.map(n => m.get(n));
      assert(rs.every(Boolean), `${t.label}のレースが暦に無い（${t.races.filter(n => !m.get(n))}）`);
      if (t.kind !== 'set' || !t.same) continue;
      const ok = [2, 3, 4, 5].some(a => rs.every(r => fitAge(r, a)));
      assert(ok, `${t.label}：同じ年に出られる年齢が無い`);
      const wk = rs.map(r => r.month * 10 + r.week);
      assert(new Set(wk).size === wk.length, `${t.label}：同じ週に重なる（${rs.map(r => r.short + r.month + '/' + r.week)}）`);
    }
    // ワールドティアラ GS は古馬の牝馬が同じ年に4つとも出られる（ディアヌ賞をナッソーSに変えた。持ち主の決定 2026-10-20）
    const ti = TR.BY.gs_tiara, tr = ti.races.map(n => m.get(n));
    assert(ti.same && [4, 5].every(a => tr.every(r => fitAge(r, a))) && tr.every(r => r.sex === '牝') && m.get('ナッソーS').course === 'グッドウッド', 'ワールドティアラ GS の扱い');
    const tw = tr.map(r => r.month * 10 + r.week);
    assert(tw.every((w, i) => !i || w > tw[i - 1]) && tw.every((w, i) => !i || (tr[i].month - tr[i - 1].month) * 4 + tr[i].week - tr[i - 1].week >= 2), `ワールドティアラ GS の週 ${tr.map(r => r.short + r.month + '/' + r.week)}`);
    out.push(`足したレース ${ADDED.length}・世界の有名な重賞 ${D.races.filter(r => r.from === 2015 && r.uncertain && (r.to || 9999) >= 9999 && D.courses[r.course].region === '海外').length}`);
    return out.join('');
  });

  check('trophy: 仕様書の全トロフィーが、レースの並びどおりに勝つと取れる（最後の1勝で手に入り、お金が入る。1頭に1回）', () => {
    const G = newGame(62);
    const m = cal();
    const got = [];
    for (const t of TR.LIST) {
      const filly = t.races.some(n => m.get(n) && m.get(n).sex === '牝') || t.cat === 'filly';
      const h = myHorse(G, filly ? '牝' : '牡');
      const y = G.year;
      const money0 = G.player.money;
      if (t.kind === 'set') {
        const rs = t.races.map(n => m.get(n)).sort((a, b) => a.month * 10 + a.week - (b.month * 10 + b.week));
        rs.forEach((r, i) => {
          const yy = t.same ? y : y + i;
          if (i === rs.length - 1) assert(TR.reach(h, t, Object.assign({}, r, { year: yy })), `${t.label}：最後の${r.short}でリーチにならない`);
          const res = winIt(h, r, yy);
          assert((i === rs.length - 1) === res.includes(t), `${t.label}：${i + 1}勝目（${r.short}）で${res.includes(t) ? '早く手に入る' : '手に入らない'}`);
        });
      } else if (t.kind === 'repeat') {
        const r = m.get(t.races[0]);
        assert(!winIt(h, r, y).includes(t), `${t.label}：1回で手に入る`);
        assert(TR.reach(h, t, Object.assign({}, r, { year: y + 1 })), `${t.label}：次の年にリーチにならない`);
        assert(winIt(h, r, y + 1).includes(t), `${t.label}：2連覇で手に入らない`);
      } else if (t.kind === 'gf') {
        const r = HS.Season.dcRace(y, t.gf);
        assert(winIt(h, r, y).includes(t), `${t.label}：GF を勝っても手に入らない`);
      } else if (t.kind === 'hof') {
        for (let i = 0; i < 6; i++) { h.results.push({ y, pos: 1, grade: 'G1' }); h.gradedWins.push({ y, race: 'G1' + i, short: 'G1' + i, grade: 'G1' }); }
        assert(TR.yearEnd(y).includes(h), 'ホールオブフェイム：無敗で G1 6勝でも手に入らない');
      } else if (t.kind === 'wonder') {
        h.winLen = 95;
        assert(TR.reach(h, t, { short: '何か', grade: 'G3' }), 'ワンダーホース：95馬身でリーチにならない');
        TR.afterRace({ grade: 'G3', year: y }, { results: [{ pos: 1, horse: h }, { pos: 2, lengths: 7.5, horse: {} }] });
        assert(h.winLen === 102.5 && TR.has(h, 'wonder'), `ワンダーホース：着差の合計 ${h.winLen}`);
      } else if (t.kind === 'immortal') {
        h.g1Streak = 9;
        assert(TR.reach(h, t, { short: '何か', grade: 'G1' }) && !TR.reach(h, t, { short: '何か', grade: 'G2' }), 'インモータルロード：9連勝でリーチにならない');
        TR.afterRace({ grade: 'G1', year: y }, { results: [{ pos: 1, horse: h }, { pos: 2, lengths: 1, horse: {} }] });
        assert(h.g1Streak === 10 && TR.has(h, 'immortal'), 'インモータルロード：G1 10連勝で手に入らない');
      }
      assert(TR.has(h, t.id), `${t.label}を手にしていない`);
      // お金：そのとき一緒にそろったトロフィー（ジャパン GS と秋の古馬三冠など）の分も
      const sum = TR.LIST.filter(x => TR.has(h, x.id)).reduce((a, x) => a + TR.money(x), 0);
      assert(G.player.money - money0 === sum && sum >= TR.money(t), `${t.label}：お金 ${G.player.money - money0}（${sum}）`);
      // 同じ馬は2回目を手にしない
      if (t.kind === 'set' || t.kind === 'repeat') { const r = m.get(t.races[t.races.length - 1]); assert(!winIt(h, r, y + 5).includes(t), `${t.label}を2回手にする`); }
      got.push(t.id);
      h.owner = 'AI';
    }
    // 2頭目にも付き、記録は G.trophies[id].more に残る
    const h2 = myHorse(G, '牡');
    const r = m.get('凱旋門賞');
    winIt(h2, r, G.year); winIt(h2, r, G.year + 1);
    assert(TR.holders('arc2').length === 2 && G.trophies.arc2.more[0].hid === h2.id && HS.Hall.trophiesOf(h2).some(x => x.id === 'arc2'), '2頭目のトロフィー');
    // G1 で負けると連勝は0から。GF は着差も連勝も数えない
    h2.g1Streak = 5; h2.winLen = 10;
    TR.afterRace({ grade: 'G1', year: G.year }, { results: [{ pos: 1, horse: {} }, { pos: 2, lengths: 1, horse: h2 }] });
    TR.afterRace({ grade: 'GF', year: G.year }, { results: [{ pos: 1, horse: h2 }, { pos: 2, lengths: 9, horse: {} }] });
    assert(h2.g1Streak === 0 && h2.winLen === 10, `連勝 ${h2.g1Streak}・着差 ${h2.winLen}`);
    // 負けた年はホールオブフェイムにならない
    const h3 = myHorse(G, '牡'); const y = G.year;
    for (let i = 0; i < 6; i++) { h3.results.push({ y, pos: 1, grade: 'G1' }); h3.gradedWins.push({ y, race: 'x' + i, short: 'x' + i, grade: 'G1' }); }
    h3.results.push({ y, pos: 2, grade: 'G2' });
    assert(!TR.yearEnd(y).includes(h3), '負けた年にホールオブフェイム');
    const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で変わる');
    return `${got.length}個を取れた`;
  });

  check('trophy: 引退すると、手にしたトロフィーの数と種類で能力が上がる（オリジナルホースの親）', () => {
    const G = newGame(63);
    const m = cal();
    const s = myHorse(G, '牡'), d = myHorse(G, '牝'), plain = myHorse(G, '牡');
    for (const n of ['皐月賞', '日本ダービー', '菊花賞']) winIt(s, m.get(n), G.year);
    const sp = m.get('スプリンターズS'); winIt(s, m.get('ジ・エベレスト'), G.year + 1); winIt(s, m.get('ジ・エベレスト'), G.year + 2);
    assert(TR.has(s, 'triple') && TR.has(s, 'ev2'), 'トロフィーが付かない');
    const p = TR.points(s);
    // 日本三冠（芝のスピード・スタミナ）とキングオブエベレスト（芝のスピード・根性）：focus は大きく、ほかは半分
    const P4 = D.trophyRule.TIER_PTS[4];
    assert(p.n === 2 && p.by.spd === Math.min(D.trophyRule.CAP, P4 * 2) && p.by.sta === P4 + P4 / 2 && p.by.dspd === P4, `上がり ${JSON.stringify(p.by)}`);
    const pot0 = Object.assign({}, s.pot), plain0 = Object.assign({}, plain.pot);
    for (const h of [s, d, plain]) assert(HS.Jockey.retire(h.id).to === 'retired', '引退できない');
    for (const k of H.STATS) {
      const up = Math.min(p.by[k], Math.max(0, HS.Original.POT_MAX - pot0[k]));
      assert(s.pot[k] === (up > 0 ? Math.round((pot0[k] + up) * 10) / 10 : pot0[k]), `${k} の上がり ${pot0[k]} → ${s.pot[k]}`);
      assert(plain.pot[k] === plain0[k], 'トロフィーの無い馬の能力が変わる');
    }
    assert(s.parentBonus === p.top && s.potUp && plain.parentBonus === 0, `parentBonus ${s.parentBonus}`);
    // 仔は上がった親の能力から（いまの引退馬に、仔へのボーナスは足さない）。前の版の引退馬（potUp の無い馬）は前のまま
    assert(HS.Original.childBonus(s, d) === 0, '仔へのボーナスが二重に付く');
    assert(HS.Original.childBonus({ parentBonus: 6 }, { parentBonus: 9 }) === HS.Original.BONUS_MAX, '前の版の引退馬のボーナス');
    const r = HS.Original.make(s.id, d.id, 'トロフィーノコ');
    assert(!r.err && r.bonus === 0, `作れない ${r.err}`);
    return `日本三冠＋キングオブエベレスト：${H.STATS.map(k => `${H.STAT_LABEL[k]}+${p.by[k]}`).join('・')}`;
  });

  check('trophy: 隠し馬はトロフィーのリーチで出てきて、手持ちでない最低人気の馬と入れ替わる（お手馬の馬は出ない・勝つと店に並び、また達成をねらうと出てくる）', () => {
    // 紐づけの表：1989年より前の名馬だけ（香港の三冠2つだけは1989年からの馬も。持ち主の決定 2026-10-20）・1頭は1つのトロフィーだけ・伝説級（GF の担当）は入れない
    const seen = new Set();
    for (const [id, xs] of Object.entries(D.trophyHorses)) {
      assert(TR.BY[id], `トロフィー ${id} が無い`);
      for (const x of xs) {
        const d = SP.data(x.name);
        const modernOk = ['hk3', 'hksp'].includes(id) && x.modern;
        assert(d && (modernOk ? HS.Eraless.isPool(d) : !HS.Eraless.isPool(d)) && !SP.isTop(d) && x.why, `${x.name}（${id}）は隠し馬にできない`);
        assert(!seen.has(x.name), `${x.name}が2つのトロフィーにいる`); seen.add(x.name);
        assert(SP.byName(x.name).groups.join() === 't:' + id, `${x.name}のグループ ${SP.byName(x.name).groups}`);
      }
    }
    assert(SP.members(SP.BY['t:uk3']).some(d => d.name === 'バーラム'), '英国三冠にバーラムがいない');
    const G = newGame(64);
    G.player.money = 1e9;
    const kk = R.gradedYear(G.year).find(r => r.short === '菊花賞');
    const h = W.all().find(x => x.hist && x.sex !== '牝' && !x.gelding && G.year - x.born === 3 && x.loc === 'stable' && !x.injury);
    h.owner = 'P'; h.auto = false; h.fatigue = 0; h.injury = null; h.earn = 30000; h.wins = 4; h.starts = 5;
    h.gradedWins.push({ y: G.year, race: '皐月賞', short: '皐月賞', grade: 'G1' }, { y: G.year, race: '東京優駿', short: '日本ダービー', grade: 'G1' });
    assert(SP.reachInfo(h).some(r => r.group.id === 't:triple' && r.need === '菊花賞'), '日本三冠のリーチが出ない');
    for (const k of H.STATS) h.pot[k] = 150;
    h.distMin = 1600; h.distMax = 3200; h.kire = 6; h.apt.turf = 100;
    // シンボリルドルフをお手馬にしておくと、出てこない
    const rudolf = H.fromHistoric(SP.data('シンボリルドルフ'), 'rudolf'); rudolf.owner = 'P'; rudolf.loc = 'farm'; G.horses[rudolf.id] = rudolf;
    G.month = kk.month; G.week = kk.week; W.dirty(); W._cache = null; W._week = null;
    const race = W.weekRaces().find(r => r.short === '菊花賞');
    assert(!W.enter(h.id, race.key), '菊花賞に登録できない');
    const lg = SP.forRace(race, [{ horse: h, mine: true }]);
    const names = lg.map(x => x.horse.name);
    assert(names.includes('シンザン') && !names.includes('シンボリルドルフ'), `出てくる名馬 ${names}`);
    // 入れ替わり：隠し馬なしで作った出走表と比べる（同じ種）
    const wk = W.prepareWeek(), card = wk.cards.find(c => c.race.key === race.key);
    const base = W.buildField(race, [{ horse: h, mine: true }].concat(card.runners.filter(x => !x.legend && !x.mine && !x.horse.filler).map(x => ({ horse: x.horse }))), wk.wIdx, new U.RNG(card.seed));
    const withLg = W.buildField(race, [{ horse: h, mine: true }].concat(card.runners.filter(x => !x.legend && !x.mine && !x.horse.filler).map(x => ({ horse: x.horse })), lg), wk.wIdx, new U.RNG(card.seed));
    assert(withLg.runners.length === base.runners.length, `頭数が変わる（${base.runners.length} → ${withLg.runners.length}）`);
    const gone = base.runners.filter(x => !withLg.runners.some(y => y.horse.name === x.horse.name));
    assert(gone.length === lg.length && gone.every(x => !x.mine), `入れ替わった馬 ${gone.map(x => x.horse.name)}`);
    const est = x => W.popEstimate(x.horse, race, wk.wIdx);
    const stay = withLg.runners.filter(x => !x.legend && !x.mine);
    assert(gone.every(g => stay.every(s => est(s) >= est(g))), '最低人気の馬と入れ替わっていない');
    assert(withLg.runners.some(x => x.mine && x.horse === h), '自分の馬が入れ替わる');
    // 走らせて勝つ：店に並び、トロフィーが付く
    const sps = card.runners.filter(x => x.horse.legend).map(x => x.horse.name);
    assert(sps.length && sps.length <= SP.MAX_IN_RACE, `出走表の名馬 ${sps}`);
    const rep = W.finishWeek({});
    const res = rep.races.find(r => r.race.key === race.key).sim.results;
    assert(res[0].horse === h, `勝てなかった（1着 ${res[0].horse.name}）`);
    assert(sps.every(n => G.unlocked.includes(n)) && TR.has(h, 'triple'), '店に並ばないか、トロフィーが付かない');
    assert(W.marketHistoric().some(x => sps.includes(x.horse.name) && x.legend), '店に並ばない');
    // 店に並んだあとも、別の馬がまた日本三冠をねらうと出てくる（again）。一度も達成していない条件のグループ（大レース）は、倒した馬は出てこない
    const h2 = Object.assign({}, h, { id: 'h2', gradedWins: [{ y: G.year + 1, race: '皐月賞', short: '皐月賞', grade: 'G1' }, { y: G.year + 1, race: '東京優駿', short: '日本ダービー', grade: 'G1' }] });
    // 見るのは日本三冠（t:triple）の名馬。出走表には「歴代の菊花賞馬」（r:菊花賞。大レースのグループで、倒すと出てこない）の名馬もいて、枠の並びしだいで先頭に来る
    const tri = sps.find(n => SP.byName(n).groups.includes('t:triple'));
    assert(tri, `日本三冠の名馬が出走表にいない（${sps}）`);
    assert(SP.pending(h2, Object.assign({}, race, { year: G.year + 1 })).some(x => x.d.name === tri), `再達成のときに出てこない（${tri}）`);
    const kikka = sps.find(n => SP.byName(n).groups.includes('r:菊花賞'));
    if (kikka) assert(!SP.pending(h2, Object.assign({}, race, { year: G.year + 1 })).some(x => x.d.name === kikka), `倒した大レースの名馬がまた出てくる（${kikka}）`);
    return `菊花賞に ${sps.join('・')}（入れ替わり ${gone.map(x => x.horse.name).join('・')}）`;
  });

  check('trophy: 同じトロフィーを別の馬で取ると、毎回同じ額のお金が入る（持ち主の決定 2026-10-20）', () => {
    const G = newGame(65);
    const m = cal();
    const t = TR.BY.triple, got = [];
    for (let i = 0; i < 3; i++) {
      const h = myHorse(G, '牡'), money0 = G.player.money;
      for (const n of t.races) winIt(h, m.get(n), G.year + i);
      assert(TR.has(h, t.id), `${i + 1}頭目が日本三冠を手にしない`);
      got.push(G.player.money - money0);
    }
    assert(got.every(x => x === TR.money(t)) && TR.holders(t.id).length === 3 && TR.holders(t.id).every(x => x.bonus === TR.money(t)), `お金 ${got.join('・')}（${TR.money(t)}）`);
    return `日本三冠を3頭で：${got.map(x => U.money(x)).join('・')}`;
  });

  check('trophy: 外したトロフィー（仕様書に無い5つ・豪州2歳三冠）は、前のセーブに残っていても消え、殿堂入りの数に入らない', () => {
    const G = newGame(66);
    const h = myHorse(G, '牡');
    G.trophies.autumn = { y: G.year, horse: h.name, hid: h.id, bonus: 30000 };
    G.trophies.arima2 = { y: G.year, horse: h.name, hid: h.id, bonus: 10000, more: [{ y: G.year, horse: 'x', hid: 'x' }] };
    G.trophies.au2 = { y: G.year, horse: 'だれか', bonus: 30000 };
    G.trophies.triple = { y: G.year, horse: h.name, hid: h.id, bonus: 50000 };
    // 読み込む前でも、殿堂は外したトロフィーを数えない
    assert(HS.Hall.trophiesOf(h).map(x => x.id).join() === 'triple', `殿堂の数 ${HS.Hall.trophiesOf(h).map(x => x.id)}`);
    G.hallOwn.push({ id: 'old', name: '前の馬', trophies: [{ id: 'tenno', label: '天皇賞の春秋制覇', y: 1 }, { id: 'triple', label: '日本三冠', y: 1 }], g1: 3, retiredY: 1 });
    const money = G.player.money;
    W.load(W.serialize());
    const G2 = W.get();
    assert(D.trophyRule.REMOVED.every(id => !(id in G2.trophies)) && G2.trophies.triple, `残ったトロフィー ${Object.keys(G2.trophies)}`);
    assert(G2.hallOwn.find(x => x.id === 'old').trophies.map(x => x.id).join() === 'triple', '殿堂の写しに外したトロフィーが残る');
    assert(G2.player.money === money, 'もらったお金が変わる');
    assert(TR.sig().every(k => TR.BY[k.split('|')[0]]), '外したトロフィーが一覧に出る');
    return '前のセーブの autumn・arima2・au2 を消した';
  });

  check('trophy: 香港の三冠の隠し馬は1989年からの有名な馬。その年に世界で走っているときは出てこず、倒すと店にいつも並び、デビューに選ばれない', () => {
    const E = HS.Eraless;
    for (const id of ['hk3', 'hksp']) {
      const ms = SP.members(SP.BY['t:' + id]).map(d => d.name);
      assert(ms.length >= 1 && ms.length <= 3 && ms.every(n => E.isPool(SP.data(n))), `${id} の隠し馬 ${ms}`);
    }
    assert(SP.members(SP.BY['t:hk3']).some(d => d.name === 'ロマンチックウォリアー') && SP.members(SP.BY['t:hksp']).some(d => d.name === 'サイレントウィットネス'), '香港の名馬がいない');
    // ほかのトロフィー・グループに1989年からの馬は入らない
    assert(SP.list().every(x => !E.isPool(x.d) || (x.groups.length === 1 && ['t:hk3', 't:hksp'].includes(x.groups[0]))), '1989年からの馬が香港の三冠のほかにいる');
    const G = newGame(67);
    G.player.money = 1e9;
    const m = cal();
    const h = myHorse(G, '牡');
    for (const k of H.STATS) h.pot[k] = 150;
    const r3 = m.get('チャンピオンズ＆チャターC');
    for (const n of ['スチュワーズC', '香港ゴールドカップ']) winIt(h, m.get(n), G.year);
    const race = Object.assign({}, r3, { year: G.year });
    const names = () => SP.pending(h, race).map(x => x.d.name);
    const rw = 'ロマンチックウォリアー';
    assert(names().includes(rw), `香港三冠のリーチで出てこない（${names()}）`);
    // 同じ馬がその年に世界で走っている（ランダムにデビューした）ときは出てこない
    const d = SP.data(rw);
    const live = E.spawn(d, 5, true);
    assert(live && E.activeNames().has(rw) && !names().includes(rw) && names().length, `世界にいるのに隠し馬で出る（${names()}）`);
    live.loc = 'retired';
    assert(names().includes(rw), '引退したあとも出てこない');
    // 倒すと店に並ぶ（1頭だけ）。そのあとは毎年のデビューに選ばれない
    G.unlocked.push(rw);
    const shop = W.marketHistoric().filter(x => x.horse.name === rw);
    assert(shop.length === 1 && shop[0].legend, `店の並び ${shop.length}`);
    assert(E.market().filter(x => x.horse.name === rw).length === 1, '開いている馬に二重に入る');
    const rng = new U.RNG(5);
    assert(!E.pick(100000, rng).some(x => x.name === rw), '倒した隠し馬がデビューに選ばれる');
    const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で変わる');
    return `香港トリプルクラウン：${SP.members(SP.BY['t:hk3']).map(x => x.name).join('・')}／香港スプリント三冠：${SP.members(SP.BY['t:hksp']).map(x => x.name).join('・')}`;
  });

  check('trophy: 引退の能力の上がりは控えめ（focus で CAP まで）。何世代も重ねる：トロフィー無しは史実の名馬どまり、多く取れば90台、1世代目はふつう90に届かず・3世代で99には届かない', () => {
    const O = HS.Original, S = HS.Season, RULE = D.trophyRule;
    // 持ち主の決定 2026-10-20「上げすぎなくていいよ すぐ総合力99ができてもつまらないし」
    assert(RULE.CAP <= 10 && Math.max(...RULE.TIER_PTS) <= 5, `上がりが大きい（TIER_PTS ${RULE.TIER_PTS}・CAP ${RULE.CAP}）`);
    const fh = h => S.fhPeak(h).turf;
    const turfT = TR.LIST.filter(t => t.kind === 'set' && !t.focus.includes('dspd')).sort((a, b) => b.tier - a.tier);
    const canBuy = S.canBuy; S.canBuy = () => true;
    const foals = O.FOALS; O.FOALS = 99;   // 世代を重ねる見積もり：1組の親から8頭ずつ作るので、1頭から作れる数（オーナーの依頼の子が足した決まり）は外す
    // 店のいちばん強い牡・牝から始め、両親に nt 個のトロフィー（難しい順）を取らせて引退 → 仔を kids 頭 → いちばん良い牡・牝で次の世代
    const lines = (nt, kids, gens, seed) => {
      const G = newGame(seed); G.player.money = 1e12;
      const pool = HS.Eraless.pool().map(d => H.fromHistoric(d, 'p:' + d.name));
      const best = sex => pool.filter(h => sex === '牝' ? h.sex === '牝' : h.sex === '牡').sort((a, b) => fh(b) - fh(a))[0];
      let s = best('牡'), d = best('牝');
      const out = [];
      for (let g = 0; g < gens; g++) {
        for (const h of [s, d]) {
          if (!G.horses[h.id]) h.id = W.newId();
          h.owner = 'P'; h.loc = 'stable'; G.horses[h.id] = h; W.dirty();
          for (const t of turfT.slice(0, nt)) TR.give(h, t, G.year);
          assert(O.retire(h.id).to === 'retired', '引退できない');
          assert(H.STATS.every(k => (h.potUp[k] || 0) <= RULE.CAP), `上がりが CAP を超える ${JSON.stringify(h.potUp)}`);
        }
        const ks = [];
        for (let i = 0; i < kids; i++) { d.foalY = null; G.year++; const r = O.make(s.id, d.id, `セダイ${seed}x${g}x${i}`); assert(!r.err, r.err); ks.push(r.horse); }
        out.push(Math.max(...ks.map(fh)));
        delete G.horses[s.id]; delete G.horses[d.id];
        const pick = sex => ks.filter(h => sex === '牝' ? h.sex === '牝' : h.sex !== '牝').sort((a, b) => fh(b) - fh(a))[0];
        s = pick('牡') || s; d = pick('牝') || d;
        for (const k of ks) if (k !== s && k !== d) delete G.horses[k.id];
        W.dirty();
      }
      return out;
    };
    try {
      const none = [], many = [];
      for (const seed of [71, 72, 73]) { none.push(lines(0, 8, 3, seed)); many.push(lines(8, 8, 3, seed)); }
      const flat = xs => [].concat(...xs);
      assert(flat(none).every(x => x < 90), `トロフィー無しで90台（${none.map(r => r.join('→')).join('／')}）`);
      const avg = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
      assert(avg(many.map(r => r[0])) < 90, `1世代目で90台（${many.map(r => r.join('→')).join('／')}）`);
      assert(flat(many).every(x => x < 99), `3世代で99（${many.map(r => r.join('→')).join('／')}）`);
      assert(avg(many.map(r => r[2])) > avg(none.map(r => r[2])) + 5, 'トロフィーを集めても仔が良くならない');
      return `いちばん良い仔の総合力（3世代）：トロフィー無し ${none.map(r => r.join('→')).join('／')}・両親が8個ずつ ${many.map(r => r.join('→')).join('／')}`;
    } finally { S.canBuy = canBuy; O.FOALS = foals; }
  });
};
