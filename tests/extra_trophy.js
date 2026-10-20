// トロフィー（js/core/trophy.js・data/trophies.js）と、トロフィーに紐づく隠し馬（js/core/special.js・data/trophy_horses.js）、足したレース（data/races_more.js）の検証
// 持ち主の仕様書 docs/SPEC.md の「トロフィー」「条件達成で出る隠し馬」（2026-10-19）と持ち主の決定（2026-10-19）
module.exports = function (check, assert, HS) {
  const W = HS.World, TR = HS.Trophy, SP = HS.Special, D = HS.DATA, H = HS.Horse, R = HS.Races, U = HS.U;
  // 仕様書の表（名前と、条件のレース）。レースは暦の短い名
  const SPEC = {
    '日本三冠': ['皐月賞', '日本ダービー', '菊花賞'], '英国三冠': ['英2000ギニー', '英ダービー', '英セントレジャー'], '米国三冠': ['ケンタッキーダービー', 'プリークネスS', 'ベルモントS'],
    '仏国三冠': ['仏2000ギニー', '仏ダービー', 'パリ大賞'], '日本ダート三冠': ['羽田盃', '東京ダービー', 'ジャパンダートクラシック'], '欧州三冠': ['英ダービー', 'キングジョージ', '凱旋門賞'],
    '欧州マイル三冠': ['英2000ギニー', 'ジャックルマロワ賞', 'QE2世S'], '豪州三冠': ['ランドウィックギニー', 'ローズヒルギニー', '豪ダービー'],
    '豪州2歳三冠': ['ゴールデンスリッパー', 'サイアーズプロデュースS', 'シャンペンS'], '香港トリプルクラウン': ['スチュワーズC', '香港ゴールドカップ', 'チャンピオンズ＆チャターC'],
    '香港スプリント三冠': ['センテナリースプリントC', 'クイーンズシルヴァージュビリーC', 'チェアマンズスプリントプライズ'], '豪州スプリント三冠': ['ブラックキャビアライトニング', 'TJスミスS', 'ジ・エベレスト'],
    '日本牝馬三冠': ['桜花賞', 'オークス', '秋華賞'], '英国牝馬三冠': ['英1000ギニー', '英オークス', '英セントレジャー'], '米国牝馬三冠': ['エイコーンS', 'CCAオークス', 'アラバマS'],
    '仏国牝馬三冠': ['仏1000ギニー', '仏オークス', 'ヴェルメイユ賞'], '欧州オークス三冠': ['英オークス', '仏オークス', '愛オークス'],
    'ワールドスプリント GS': ['スプリンターズS', 'ジ・エベレスト', 'BCターフスプリント', '香港スプリント'], 'ワールドマイル GS': ['安田記念', 'BCマイル', 'ジャックルマロワ賞', 'サセックスS'],
    'ワールドターフ GS': ['ドバイシーマクラシック', 'エクリプスS', 'キングジョージ', '凱旋門賞'], 'ワールドステイヤー GS': ['天皇賞・春', 'アスコットGC', 'グッドウッドC', 'メルボルンカップ'],
    'ワールドダート GS': ['サウジカップ', 'ドバイワールドカップ', 'ペガサスWC', 'BCクラシック'], 'ワールドティアラ GS': ['ヴィクトリアマイル', '仏オークス', 'ヴェルメイユ賞', 'BCフィリー＆メアターフ'],
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
    const extra = TR.LIST.filter(t => !(t.label in SPEC));
    assert(extra.every(t => t.cat === 'extra'), `仕様書に無いトロフィーが extra でない（${extra.filter(t => t.cat !== 'extra').map(t => t.label)}）`);
    assert(TR.LIST.every(t => t.tier >= 1 && t.tier <= 6 && t.focus.length && t.focus.every(k => H.STATS.includes(k))), '難しさか、上がる能力の書き方が違う');
    for (const a of TR.LIST) for (const b of TR.LIST) if (a.tier < b.tier) assert(TR.money(a) < TR.money(b), `${a.label} が ${b.label} より高い`);
    assert(new Set(labels).size === labels.length && new Set(TR.LIST.map(t => t.id)).size === TR.LIST.length, '名前か id が重なる');
    return `${TR.LIST.length}個（仕様書 ${Object.keys(SPEC).length}・前からのもの ${extra.map(t => t.label).join('・')}）`;
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
    // ワールドティアラ GS は同じ年に出られない（ヴィクトリアマイルは4歳から・ディアヌ賞は3歳）ので、年をまたいでよい
    const ti = TR.BY.gs_tiara;
    assert(!ti.same && ![3, 4, 5].some(a => ti.races.map(n => m.get(n)).every(r => fitAge(r, a))), 'ワールドティアラ GS の扱い');
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
    // 紐づけの表：1989年より前の名馬だけ・1頭は1つのトロフィーだけ・伝説級（GF の担当）は入れない
    const seen = new Set();
    for (const [id, xs] of Object.entries(D.trophyHorses)) {
      assert(TR.BY[id], `トロフィー ${id} が無い`);
      for (const x of xs) {
        const d = SP.data(x.name);
        assert(d && !HS.Eraless.isPool(d) && !SP.isTop(d) && x.why, `${x.name}（${id}）は隠し馬にできない`);
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
};
