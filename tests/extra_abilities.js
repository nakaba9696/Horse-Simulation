// 確かめ：名馬の総合力の下の能力の洗い出し（持ち主の決定 2026-10-24「Codexとまたレビューしあいながら世間の認識と乖離がないようにしたい」。docs/review/ABILITIES_CHECK.md）
// 一覧を書き出す道具（tools/review_abilities.js）と、data/horse_fix.js の直し（was に直す前の値）で総合力（画面の数）が動かないこと
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const D = HS.DATA, H = HS.Horse, T = HS.Season, SP = HS.Special;
  const dataOf = n => SP.data(n) || D.historic.find(d => d.name === n);

  check('abilities: 能力の直し（data/horse_fix.js の was）で総合力が動かない', () => {
    let n = 0;
    for (const [name, f] of Object.entries(D.horseFix || {})) {
      if (!f.was) continue;
      const d = dataOf(name); assert(d, `${name} がいない`);
      // 直す前の形に戻す（null は「データに無かった」）
      const x = Object.assign({}, d);
      for (const [k, v] of Object.entries(f.was)) {
        if (k === 'pot') {
          x.pot = Object.assign({}, d.pot || {});
          for (const [pk, pv] of Object.entries(v)) { if (pv == null) delete x.pot[pk]; else x.pot[pk] = pv; }
          if (!Object.keys(x.pot).length) delete x.pot;
        } else if (v == null) delete x[k]; else x[k] = v;
      }
      const a = T.fhShowPeak(H.fromHistoric(x, 'was')), b = T.fhShowPeak(H.fromHistoric(d, 'now'));
      assert(a.turf === b.turf && a.dirt === b.dirt, `${name} の総合力が動いた ${a.turf}/${a.dirt} → ${b.turf}/${b.dirt}`);
      assert(/能力の洗い出し/.test(f.why || ''), `${name} の why に洗い出しの理由が無い`);
      n++;
    }
    assert(n >= 30, `洗い出しで直した馬が少ない（${n}頭）`);
  });

  check('abilities: 名鑑にはっきり書いてある癖・故障・道悪が能力に入っている', () => {
    const h = n => H.fromHistoric(dataOf(n), 'x');
    assert(h('デュランダル').skills.includes('deokure'), 'デュランダルに出遅れ癖が無い');
    assert(h('コスモバルク').skills.includes('kakari'), 'コスモバルクに掛かり癖が無い');
    assert(h('トウカイテイオー').health === 65, 'トウカイテイオーの健康');
    assert(h('オートキツ').apt.heavy >= H.MUD_HEAVY && h('オートキツ').skills.includes('mud'), 'オートキツが道悪○でない');
    assert(h('コクサイプリンス').apt.heavy < 45, 'コクサイプリンスが道悪を苦手にしていない');
    // 気性難の馬は、同じ強さのふつうの馬より気性が低い
    const e = h('エアシャカール'), base = H.fromHistoric(Object.assign({}, dataOf('エアシャカール'), { pot: undefined }), 'y');
    assert(e.pot.mind <= base.pot.mind - 9, `エアシャカールの気性 ${e.pot.mind}（ふつうなら ${base.pot.mind}）`);
  });

  check('abilities: 一覧の道具（tools/review_abilities.js）が名馬を書き出し、食い違いの目安を付ける', () => {
    const { build, HEAD } = require('../tools/review_abilities.js');
    const rows = build();
    assert(rows.length >= 1000, `書き出した馬が少ない（${rows.length}頭）`);
    for (const r of rows) assert(r.length === HEAD.length, `${r[1]} の列の数が違う`);
    const by = new Map(rows.map(r => [r[1], r]));
    for (const n of ['ディープインパクト', 'フランケル', 'キンチェム', 'オグリキャップ']) assert(by.has(n), `${n} が一覧に無い`);
    const col = k => HEAD.indexOf(k);
    assert(by.get('デュランダル')[col('気性の出どころ')] === '自動・癖で下げ', 'デュランダルの気性の出どころ');
    assert(by.get('エアシャカール')[col('気性の出どころ')] === '手', 'エアシャカールの気性の出どころ');
    // 気性の言葉があって癖も手の値も無い馬には、見どころが付く（直した馬には付かない）
    assert(!String(by.get('エアシャカール')[col('見どころ')]).includes('気性の言葉'), '直した馬に気性の見どころが残る');
    // build() は読み込み直すので、run.js の HS を元に戻す
    globalThis.HS = HS;
  });
};
