// 確かめ：インブリード（オリジナルホースの配合。持ち主の決定 2026-10-20。docs/SPEC.md の末尾「インブリードの決まり」・docs/BALANCE.md「12. インブリード」）
//   選べない組み合わせ（親子・2×2 より濃い・全きょうだい）・ほどよいクロスで因子の能力が上がる・濃いと健康が下がりやすい・上限・
//   オリジナルホースが祖先になっても効く（牧場を去ったあとも・セーブの往復・前のセーブ）・何世代重ねても99に簡単に届かない
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const H = HS.Horse, U = HS.U, W = HS.World, P = HS.Ped, I = HS.Inbreed, O = HS.Original, S = HS.Season, D = HS.DATA;
  const newGame = seed => { W.newGame({ seed, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' }); return W.get(); };
  // 架空の血統を登録する：[名前, 父, 母]
  const reg = rows => { for (const [n, s, d] of rows) P.register(n, s, d); };
  // 引退した自分の馬を1頭作る（能力はみな v）
  const retired = (G, name, sex, sire, dam, v) => {
    const h = W.horseFromFoal({ sex, pot: Object.fromEntries(H.STATS.map(k => [k, v])), apt: { turf: 100, dirt: 60, heavy: 60 }, distMin: 1600, distMax: 2400, growth: '普通', peakShift: 0, style: '先行', kire: 4, skills: [], health: 80, coat: '鹿毛' }, sire, dam, G.year - 6, name);
    h.owner = 'P'; h.loc = 'retired'; h.retiredY = G.year;
    G.horses[h.id] = h; W.dirty();
    reg([[name, sire, dam]]);
    return h;
  };

  check('inbreed: 選べない組み合わせ（親子 1×2・2×2・全きょうだい）は弾かれ、2×3・3×3 は選べる', () => {
    const G = newGame(81);
    reg([['テコA', 'テオヤ', 'テハハ1'], ['テコB', 'テオヤ', 'テハハ2'], ['テコC', 'テオヤ', 'テハハ1'], ['テコD', 'テコA', 'テハハ3'],
      ['テマゴ', 'テコB', 'テハハ4'], ['テヒマゴ', 'テマゴ', 'テハハ5'], ['テコE', 'テベツ', 'テコF'], ['テコF', 'テオヤ', 'テハハ6']]);
    // 親子：父 テコA × 母 テコD（テコD の父はテコA）
    const pc = I.analyze('テコA', 'テコD');
    assert(pc.block === '近すぎる（テコAの1×2）', `親子 ${pc.block}`);
    // 2×2：父が同じ（半きょうだい）
    const hs = I.analyze('テコA', 'テコB');
    assert(hs.block === '近すぎる（テオヤの2×2）', `2×2 ${hs.block}`);
    // 全きょうだい
    const fs = I.analyze('テコA', 'テコC');
    assert(fs.block === '近すぎる（全きょうだい）', `全きょうだい ${fs.block}`);
    // 2×3：テコA（父の父がテオヤ）× テマゴ（母方の3代目にテオヤ）
    const a23 = I.analyze('テコA', 'テマゴ');
    assert(!a23.block && a23.crosses[0].label === '2×3' && a23.crosses[0].tier === 0, `2×3 ${JSON.stringify(a23.crosses[0])}`);
    // 3×3：テコD（3代目にテオヤ）× テコE（母テコF の父がテオヤ）
    const a33 = I.analyze('テコD', 'テコE');
    assert(!a33.block && a33.crosses.some(c => c.name === 'テオヤ' && c.label === '3×3'), `3×3 ${a33.block} ${a33.crosses.map(c => c.label)}`);
    // オリジナルホースを作る所でも弾く（灰色の画面と同じ理由を返す）
    const s = retired(G, 'テストチチ', '牡', 'テオヤ', 'テハハ1', 90), d = retired(G, 'テストムスメ', '牝', 'テストチチ', 'テハハ3', 90);
    const d2 = retired(G, 'テストイモウト', '牝', 'テオヤ', 'テハハ1', 90);
    const canBuy = S.canBuy; S.canBuy = () => true;
    try {
      assert(O.make(s.id, d.id, 'ダメナコ').err === '近すぎる（テストチチの1×2）', '親子で作れてしまう');
      assert(O.make(s.id, d2.id, 'ダメナコ2').err === '近すぎる（全きょうだい）', '全きょうだいで作れてしまう');
      assert(!W.all().some(h => h.name === 'ダメナコ' || h.name === 'ダメナコ2'), '弾いたのに仔がいる');
    } finally { S.canBuy = canBuy; }
    return `親子 ${pc.block}・半きょうだい ${hs.block}・${fs.block}・2×3 と 3×3 は選べる`;
  });

  check('inbreed: ほどよいクロス（3×4・4×4）で因子の能力が数点上がり、ほかの能力は変わらない（同じ種で比べる）', () => {
    // リボー（手で決めた因子：芝スタミナ・根性）の3×4
    const rows = [['テ父', 'テ父父', 'テ父母'], ['テ父父', 'リボー', 'テ父父母'], ['テ母', 'テ母父', 'テ母母'], ['テ母父', 'テ母父父', 'テ母父母'], ['テ母父父', 'リボー', 'テ母父父母'],
      ['テ父X', 'テ父父X', 'テ父母'], ['テ父父X', 'テベツ1', 'テ父父母']];
    reg(rows);
    assert(JSON.stringify(I.factorOf('リボー')) === '["sta","guts"]', `リボーの因子 ${I.factorOf('リボー')}`);
    const an = I.analyze('テ父', 'テ母');
    const c = an.crosses.find(x => x.name === 'リボー');
    assert(c && c.label === '3×4' && c.tier === 1 && !an.block, `3×4 ${JSON.stringify(c)}`);
    const T = I.TIERS[1];
    assert(an.up.sta === T.up && an.up.guts === Math.max(1, Math.round(T.up * I.SECOND)) && an.up.spd === 0, `上がり ${JSON.stringify(an.up)}`);
    assert(T.up >= 2 && T.up <= 4, `ほどよいの上がりが数点でない ${T.up}`);
    assert(I.text(c) === `リボーの3×4（芝スタミナ＋${T.up}・根性＋${an.up.guts}）`, I.text(c));
    // 4×4 もほどよい・4×5 は薄い・5×5 も薄い
    assert(I.tierOf(12.5) === 1 && I.tierOf(9.375) === 2 && I.tierOf(6.25) === 2 && I.tierOf(18.75) === 1 && I.tierOf(25) === 0, '段の境目');
    // 同じ種で、クロスのある組（テ父）と無い組（テ父X。リボーの代わりに別の馬）を作って比べる
    const make = sireName => {
      const G = newGame(82);
      reg(rows); // 新しいゲームで血統の索引が作り直されるので、もう一度
      const s = retired(G, sireName, '牡', P.parents(sireName)[0], P.parents(sireName)[1], 80);
      const m = retired(G, 'テ母', '牝', 'テ母父', 'テ母母', 80);
      s.id = 'fixS'; m.id = 'fixM'; G.horses = { fixS: s, fixM: m }; W.dirty();
      const canBuy = S.canBuy; S.canBuy = () => true;
      try { const r = O.make('fixS', 'fixM', 'クラベル'); assert(!r.err, r.err); return r.horse; } finally { S.canBuy = canBuy; }
    };
    // 名前が違うと種が同じでも名前の乱数だけ変わるので、能力の列は同じ（種は id から）
    const withX = make('テ父'), without = make('テ父X');
    for (const k of H.STATS) {
      const d = Math.round((withX.pot[k] - without.pot[k]) * 10) / 10;
      const want = an.up[k] || 0;
      assert(Math.abs(d - want) < 0.11, `${k}：クロスの有無の差 ${d}（${want} のはず）`);
    }
    return `リボーの3×4：${I.upText(an.up)}（仔の能力の差も同じ）`;
  });

  check('inbreed: 濃いクロスほど健康が下がりやすい（薄いと下がらない）。下がりにも上限', () => {
    const mk = (pct, n) => ({ crosses: Array.from({ length: n }, () => ({ pct, tier: I.tierOf(pct), via: false })) });
    const avg = an => { let t = 0; for (let i = 0; i < 400; i++) t += I.healthDrop(new U.RNG(1000 + i), an); return t / 400; };
    const dense = avg(mk(37.5, 1)), mid = avg(mk(18.75, 1)), thin = avg(mk(9.375, 1)), many = avg(mk(37.5, 6));
    assert(thin === 0, `薄いのに下がる ${thin}`);
    assert(dense > mid + 2 && mid > 0, `濃いほど下がりやすくない（濃い ${dense}・ほどよい ${mid}）`);
    let mx = 0; for (let i = 0; i < 400; i++) mx = Math.max(mx, I.healthDrop(new U.RNG(i), mk(37.5, 6)));
    assert(mx <= I.RISK_CAP, `下がりが上限を超える ${mx}`);
    // 作った仔の健康も、濃い組み合わせのほうが低い（同じ両親の健康で、多くの種で）
    const rows = [['ケ父', 'ケオヤ', 'ケ父母'], ['ケ母', 'ケ母父', 'ケ母母'], ['ケ母父', 'ケオヤ', 'ケ母父母'], ['ケ父Y', 'ケベツ', 'ケ父母']];
    const hl = sireName => {
      let t = 0;
      for (let seed = 0; seed < 16; seed++) {
        const G = newGame(900 + seed);
        reg(rows);
        const s = retired(G, sireName, '牡', P.parents(sireName)[0], 'ケ父母', 80), m = retired(G, 'ケ母', '牝', 'ケ母父', 'ケ母母', 80);
        s.id = 'hS'; m.id = 'hM'; G.horses = { hS: s, hM: m }; W.dirty();
        const canBuy = S.canBuy; S.canBuy = () => true;
        try { const r = O.make('hS', 'hM', 'ケンコウ'); assert(!r.err, r.err); t += r.horse.health; } finally { S.canBuy = canBuy; }
      }
      return t / 16;
    };
    const h23 = hl('ケ父'), h0 = hl('ケ父Y');
    reg(rows);
    assert(I.analyze('ケ父', 'ケ母').crosses[0].label === '2×3', '2×3 になっていない');
    assert(h23 < h0 - 2, `2×3 の仔の健康が下がっていない（${h23.toFixed(1)}・クロス無し ${h0.toFixed(1)}）`);
    return `健康の下がりの平均：濃い ${dense.toFixed(1)}・ほどよい ${mid.toFixed(1)}・薄い ${thin}・濃いのが6つ ${many.toFixed(1)}（上限 ${I.RISK_CAP}）／2×3 の仔の健康 ${h23.toFixed(1)}・クロス無し ${h0.toFixed(1)}`;
  });

  check('inbreed: 能力ごとの上がりに上限（同じ祖先が何度出ても1つの段・別の祖先を重ねても STAT_CAP まで）。ほかのクロスを通してだけの祖先は数えない', () => {
    // ハイペリオン（芝スタミナ）を 3×3・4・4 に（血量が多くても1つの段）
    reg([['ジ父', 'ジ父父', 'ジ父母'], ['ジ父父', 'ハイペリオン', 'ジa'], ['ジ父母', 'ジb', 'ジc'], ['ジb', 'ハイペリオン', 'ジd'],
      ['ジ母', 'ジ母父', 'ジ母母'], ['ジ母父', 'ハイペリオン', 'ジe'], ['ジ母母', 'ジf', 'ジg'], ['ジf', 'ハイペリオン', 'ジh']]);
    const a1 = I.analyze('ジ父', 'ジ母');
    const c = a1.crosses.find(x => x.name === 'ハイペリオン');
    assert(c && c.label === '3・4×3・4' && c.tier === 0 && a1.up.sta === I.TIERS[0].up, `同じ祖先 ${c && c.label} ${JSON.stringify(a1.up)}`);
    // 芝スタミナの因子の祖先を3頭（ハイペリオン・トニービン・ウインドインハーヘア）、どれも 3×3
    reg([['カ父', 'カ父父', 'カ父母'], ['カ父父', 'ハイペリオン', 'トニービン'], ['カ父母', 'ウインドインハーヘア', 'カx'],
      ['カ母', 'カ母父', 'カ母母'], ['カ母父', 'ハイペリオン', 'トニービン'], ['カ母母', 'ウインドインハーヘア', 'カy']]);
    const a2 = I.analyze('カ父', 'カ母');
    assert(a2.raw.sta >= I.TIERS[0].up * 3 && a2.up.sta === I.STAT_CAP, `上限 raw ${a2.raw.sta}・up ${a2.up.sta}`);
    // サンデーサイレンスの3×3 の裏のヘイローの4×4 は数えない
    reg([['ヘ父', 'ヘ父父', 'ヘ1'], ['ヘ父父', 'サンデーサイレンス', 'ヘ2'], ['ヘ母', 'ヘ母父', 'ヘ3'], ['ヘ母父', 'サンデーサイレンス', 'ヘ4']]);
    const a3 = I.analyze('ヘ父', 'ヘ母');
    const halo = a3.crosses.find(x => x.name === 'ヘイロー'), ss = a3.crosses.find(x => x.name === 'サンデーサイレンス');
    assert(ss && !ss.via && halo && halo.via && JSON.stringify(halo.up) === '{}' && !I.shown(a3).includes(halo), 'ヘイローを二重に数える');
    return `ハイペリオン ${c.label}：芝スタミナ＋${a1.up.sta}・3頭の 3×3：合わせて ${a2.raw.sta} → 上限 ${a2.up.sta}・${I.text(ss)}`;
  });

  check('inbreed: 因子：史実の祖先はデータの能力でいちばん高い1〜2つ（手で決めた名馬は表）・オリジナルホースは引退したときの能力（トロフィーの能力を先に）', () => {
    newGame(83);
    for (const [n, f] of Object.entries(D.factors)) {
      assert(f.length >= 1 && f.length <= 2 && f.every(k => H.STATS.includes(k)), `${n} の因子 ${f}`);
      assert(Object.values(D.profiles).some(p => p.name === n), `${n} は名鑑が無い（手で決めるのは名鑑のある名馬だけ）`);
    }
    // 表に無い史実馬：データの能力から
    const d = W.histByName.get('オグリキャップ');
    const pot = H.fromHistoric(d, 'x').pot, f = I.factorOf('オグリキャップ');
    const top = Math.max(...H.STATS.map(k => pot[k]));
    assert(f.length >= 1 && pot[f[0]] === top && (f.length === 1 || pot[f[1]] >= top - I.FACTOR_CLOSE), `オグリキャップ ${f}`);
    // オリジナルホース：トロフィーで上がった能力を先に・無ければいちばん高い能力
    const a = { original: true, name: 'イ', pot: { spd: 100, sta: 90, dspd: 60, dsta: 60, guts: 95, mind: 80, slope: 70 }, potUp: { spd: 2, sta: 2, guts: 4, mind: 2, slope: 0, dspd: 0, dsta: 0 } };
    assert(JSON.stringify(I.origFactorOf(a)) === '["guts"]', `トロフィーの能力 ${I.origFactorOf(a)}`);
    assert(JSON.stringify(I.origFactorOf(Object.assign({}, a, { potUp: {} }))) === '["spd"]', 'いちばん高い能力');
    assert(JSON.stringify(I.origFactorOf(Object.assign({}, a, { potUp: { sta: 3, guts: 3 } }))) === '["guts"]', '同じ上がりは能力の高いほう');
    return `手で決めた ${Object.keys(D.factors).length}頭・オグリキャップ ${f.map(k => H.STAT_LABEL[k]).join('・')}`;
  });

  check('inbreed: オリジナルホースが祖先になったときも効く（牧場を去ったあとも・セーブの往復・前のセーブ）', () => {
    const G = newGame(84);
    const canBuy = S.canBuy; S.canBuy = () => true;
    try {
      // オリジナルホース「オリソセン」（根性がいちばん上がった）を引退させ、仔を2頭（父の違う母から）→ その仔どうしの仔を作る
      const anc = retired(G, 'オリソセン', '牡', 'オリ父', 'オリ母', 90);
      anc.loc = 'stable'; anc.original = true;
      G.trophies.triple = { y: G.year, horse: anc.name, hid: anc.id };
      anc.gradedWins.push({ y: G.year, race: '有馬記念', short: '有馬記念', grade: 'G1', region: 'JRA' });
      assert(O.retire(anc.id).to === 'retired', '引退できない');
      const fac = G.origFactor['オリソセン'];
      assert(fac && fac.length === 1 && H.STATS.includes(fac[0]), `因子が残らない ${fac}`);
      // 子：オリソセン × 牝馬2頭 → 子A（牡）・子B（牝）。子A×子B は 2×2 で選べないので、孫どうし（3×3）にする
      const m1 = retired(G, 'オリハハ1', '牝', 'オリx1', 'オリy1', 88), m2 = retired(G, 'オリハハ2', '牝', 'オリx2', 'オリy2', 88);
      reg([['オリ子A', 'オリソセン', 'オリハハ1'], ['オリ子B', 'オリソセン', 'オリハハ2'], ['オリ孫A', 'オリ子A', 'オリz1'], ['オリ孫B', 'オリz2', 'オリ子B']]);
      assert(I.analyze('オリ子A', 'オリ子B').block === '近すぎる（オリソセンの2×2）', '子どうしが選べてしまう');
      // オリソセンは仔を2頭作ると牧場を去る
      const r1 = O.make(anc.id, m1.id, 'オリ子X'); assert(!r1.err, r1.err); G.year++;
      const r2 = O.make(anc.id, m2.id, 'オリ子Y'); assert(!r2.err, r2.err);
      assert(!W.horse(anc.id), '仔を2頭作っても牧場に残る');
      const an = I.analyze('オリ孫A', 'オリ孫B');
      const c = an.crosses.find(x => x.name === 'オリソセン');
      assert(c && c.label === '3×3' && an.up[fac[0]] === I.TIERS[0].up, `孫どうしで効かない ${JSON.stringify(c)} ${JSON.stringify(an.up)}`);
      // セーブの往復でも残る（血統は G.pedExtra・因子は G.origFactor）
      const s1 = W.serialize(); W.load(s1);
      assert(W.serialize() === s1, 'セーブの往復で変わる');
      assert(JSON.stringify(I.analyze('オリ孫A', 'オリ孫B').up) === JSON.stringify(an.up), '読み直すと効き目が変わる');
      assert(W.get().pedExtra['オリ子X'] && W.get().pedExtra['オリ子X'][0] === 'オリソセン', '仔の血統がセーブに無い');
      // 前のセーブ（G.origFactor が無い）：牧場にいるオリジナルホースの因子を足す
      const g = JSON.parse(s1);
      const x = Object.values(g.horses).find(h => h.name === 'オリ子X');
      x.loc = 'retired'; delete g.origFactor; delete g.pedExtra['オリ子X'];
      W.load(JSON.stringify(g));
      const G2 = W.get();
      assert(G2.origFactor && JSON.stringify(G2.origFactor['オリ子X']) === JSON.stringify(I.origFactorOf(x)), `前のセーブで因子が付かない ${JSON.stringify(G2.origFactor)}`);
      assert(G2.pedExtra['オリ子X'] && G2.pedExtra['オリ子X'][0] === 'オリソセン', '前のセーブで血統が戻らない');
      return `オリソセン（${H.STAT_LABEL[fac[0]]}）の孫どうし：${I.text(c)}`;
    } finally { S.canBuy = canBuy; }
  });

  check('inbreed: 何世代重ねても99に簡単に届かない（トロフィーの上がりもクロスの上がりもいちばん大きく取り続け、ばらつき無しで）', () => {
    const RULE = D.trophyRule;
    // 店のいちばん強い牡・牝の能力から始め、毎世代：両親とも全部の能力にトロフィーの上限（CAP）・因子の能力（芝スピード・芝スタミナ）にクロスの上限（STAT_CAP）
    newGame(85);
    const pool = HS.Eraless.pool().map(d => H.fromHistoric(d, 'p:' + d.name));
    const fh = h => S.fhPeak(h).turf;
    const best = sex => pool.filter(h => h.sex === sex).sort((a, b) => fh(b) - fh(a))[0];
    let s = Object.assign({}, best('牡').pot), m = Object.assign({}, best('牝').pot);
    const path = [];
    for (let g = 0; g < 30; g++) {
      const kid = {};
      for (const k of H.STATS) {
        const up = (k === 'spd' || k === 'sta') ? I.STAT_CAP : 0;
        const a = Math.min(O.POT_MAX, s[k] + RULE.CAP), b = Math.min(O.POT_MAX, m[k] + RULE.CAP);
        kid[k] = U.clamp(O.inherit((a + b) / 2 + up), 40, 118);
      }
      s = kid; m = kid;
      path.push(S.fhOf(kid, '芝'));
    }
    const top = Math.max(...path);
    assert(top < 99, `ばらつき無しで99（${path.join('→')}）`);
    assert(path[2] < 95, `3世代で95（${path.slice(0, 3).join('→')}）`);
    // クロスの上がりの分だけ（同じ道をクロス無しで）
    let s0 = Object.assign({}, best('牡').pot), m0 = Object.assign({}, best('牝').pot), last0 = 0;
    for (let g = 0; g < 30; g++) { const kid = {}; for (const k of H.STATS) kid[k] = U.clamp(O.inherit((Math.min(O.POT_MAX, s0[k] + RULE.CAP) + Math.min(O.POT_MAX, m0[k] + RULE.CAP)) / 2), 40, 118); s0 = kid; m0 = kid; last0 = S.fhOf(kid, '芝'); }
    assert(path[path.length - 1] - last0 <= 4, `クロスの分が大きい（${last0} → ${path[path.length - 1]}）`);
    return `いちばん大きく取り続けた総合力：${path.slice(0, 6).join('→')}…${path[path.length - 1]}（クロス無しなら ${last0}）`;
  });
};
