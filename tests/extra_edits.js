// 確かめ：競走馬エディット（持ち主の決定 2026-10-20「評価という項目がいらない　評価＝芝やダートの総合力なので」
//   「エディットするときは各種パラメータをいじり　それをもとに評価点（＝総合力）が決まります」）
//   能力を直接書き換え、芝・ダートの総合力はその結果。前の版の書き出し（rating・向き・前の能力の名前）も読める
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const E = HS.Edits, H = HS.Horse, D = HS.DATA;
  const fs = require('fs'), path = require('path');
  const find = n => D.historic.find(x => x.name === n);

  check('edits: 能力を書き換えると芝・ダートの総合力が変わり、書き換えなければ能力を残さない', () => {
    E.apply({});
    const d = find('キタサンブラック');
    const h0 = E.horseOf(d);
    const pot = {}; for (const k of H.STATS) pot[k] = Math.round(h0.pot[k]);
    const fh0 = E.fhOfPot(pot);
    // 動かさずに保存：能力（pot）は残らず、編集も無い
    const same = E.build(d, { surface: d.surface, distMin: d.distMin, distMax: d.distMax, style: d.style, growth: d.growth, coat: d.coat, retire: d.retire, pot });
    assert(same.pot == null && E.clean(d.name, same) === null, `動かしていないのに残った ${JSON.stringify(E.clean(d.name, same))}`);
    // 芝のスピードとスタミナを上げる → 芝の総合力が上がり、ダートは変わらない
    const up = Object.assign({}, pot, { spd: pot.spd + 10, sta: pot.sta + 6 });
    const fh1 = E.fhOfPot(up);
    assert(fh1.turf > fh0.turf && fh1.dirt === fh0.dirt, `芝の総合力が動かない ${fh0.turf}→${fh1.turf}・ダ ${fh0.dirt}→${fh1.dirt}`);
    const ed = E.clean(d.name, E.build(d, { pot: up }));
    assert(ed && ed.pot && ed.pot.spd === up.spd && ed.rating == null, `能力が残らない ${JSON.stringify(ed)}`);
    assert(!E.validate(ed), E.validate(ed) || '');
    // 当てたデータから作った馬の総合力が、画面に出した値と同じ
    E.apply({ [d.name]: ed });
    const h1 = E.horseOf(find(d.name));
    const got = E.fhOfPot(h1.pot);
    E.apply({});
    assert(got.turf === fh1.turf && got.dirt === fh1.dirt, `当てたあとの総合力が違う ${JSON.stringify(got)} / ${JSON.stringify(fh1)}`);
    // ダートの能力を下げる → ダートの総合力だけ下がる
    const dn = Object.assign({}, pot, { dspd: pot.dspd - 15, dsta: pot.dsta - 15 });
    assert(E.fhOfPot(dn).dirt < fh0.dirt && E.fhOfPot(dn).turf === fh0.turf, 'ダートの総合力が動かない');
    return `芝 ${fh0.turf}→${fh1.turf}・ダ ${fh0.dirt}`;
  });

  check('edits: 前の版の書き出し（評価・芝ダートの向き・前の能力の名前）が読めて、効く', () => {
    E.apply({});
    const a = find('ディープインパクト'), b = find('キタサンブラック'), c = find('オグリキャップ');
    const text = JSON.stringify({
      [a.name]: { rating: a.rating - 10, coat: '芦毛' },
      [b.name]: { rating: 90, turf: 80, dirt: 60, pot: { spd: 80, sta: 82, kick: 70, pow: 75, guts: 80, wise: 70 }, temper: 60 },
      [c.name]: { rating: 300 }, // 範囲の外は捨てる
      'いない馬': { rating: 80 },
    });
    const r = E.parseImport(text, new Set(D.historic.map(x => x.name)));
    assert(!r.err, r.err || '');
    const names = Object.keys(r.edits);
    assert(names.length === 2 && r.edits[a.name] && r.edits[b.name], `読めた馬が違う ${names}`);
    const before = E.fhOfPot(E.horseOf(a).pot).turf;
    E.apply(r.edits);
    const ha = E.horseOf(find(a.name)), hb = E.horseOf(find(b.name));
    const after = E.fhOfPot(ha.pot).turf;
    E.apply({});
    assert(after < before && ha.coat === '芦毛', `前の形の rating が効かない ${before}→${after}`);
    assert(hb.pot.spd === 80 && hb.pot.slope === 75 && hb.pot.kick == null, `前の能力の名前が読み替えられない ${JSON.stringify(hb.pot)}`);
    // 前の形の編集を開いて保存し直しても、rating・向きは引き継ぐ（能力が勝手に変わらない）
    E.apply(r.edits);
    const d = find(a.name), p = {}; const h = E.horseOf(d); for (const k of H.STATS) p[k] = Math.round(h.pot[k]);
    const re = E.clean(a.name, E.build(d, { coat: '芦毛', pot: p }));
    E.apply({});
    assert(re && re.rating === a.rating - 10 && re.pot == null, `保存し直すと前の値が消える ${JSON.stringify(re)}`);
    assert(E.parseImport('{壊れた', new Set()).err, '壊れた文字で落ちない');
    return `${names.length}頭・芝の総合力 ${before}→${after}`;
  });

  check('edits: エディットの画面に「評価」の欄が無く、強さの数は芝・ダートの総合力だけ', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui', 'editor.js'), 'utf8');
    const lines = src.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\/\/.*$/, ''));
    const bad = lines.filter(l => l.includes('評価'));
    assert(!bad.length, `評価が残っている：${bad.join(' / ').slice(0, 200)}`);
    assert(!/ed-rating|ed-custom/.test(src), '評価の欄・個別に決めるの切り替えが残っている');
    assert(/'芝' \+ HS\.Season\.FH_NAME/.test(src) && /'ダ' \+ HS\.Season\.FH_NAME/.test(src), '一覧に芝・ダートの総合力の列が無い');
  });
};
