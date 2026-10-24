// 確かめ：出典で決めていない能力の散らし（持ち主の指摘 2026-10-25「わからない数値全員66とかじゃなくてある程度ばらけさせてね」
// 「重馬場適正以外もちゃんとみんな同じ数値とかにしないでね」。docs/BALANCE.md「22」・docs/review/ABILITIES_CHECK.md の 7）
// js/core/datafix.js が馬ごとのずらし（d.spr）を作り、H.fromHistoric が手で決めていない値にだけ足す。総合力は動かない
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const D = HS.DATA, H = HS.Horse, T = HS.Season, U = HS.U;
  const all = D.historic.concat(D.legendsExtra || []);
  const plain = d => { const x = Object.assign({}, d); delete x.spr; return x; };
  // その能力を手で決めた（データに値がある）か
  const hand = {
    heavy: d => d.heavy != null || (Array.isArray(d.skills) && d.skills.includes('mud')),
    health: d => d.health != null, kire: d => d.kire != null,
    guts: d => !!(d.pot && d.pot.guts != null), mind: d => !!(d.pot && d.pot.mind != null), slope: d => !!(d.pot && d.pot.slope != null),
    turf: d => d.turf != null || !!(d.pot && d.pot.dspd != null && d.pot.dsta != null), dirt: d => d.dirt != null || !!(d.pot && d.pot.dspd != null && d.pot.dsta != null),
  };
  const val = { heavy: h => h.apt.heavy, health: h => h.health, kire: h => h.kire, guts: h => h.pot.guts, mind: h => h.pot.mind, slope: h => h.pot.slope, turf: h => h.apt.turf, dirt: h => h.apt.dirt };
  const made = new Map(all.map(d => [d, [H.fromHistoric(d, 'spr'), H.fromHistoric(plain(d), 'plain')]]));

  check('spread: 散らしで総合力（画面の数・中の値）とスピード・スタミナが動かない', () => {
    for (const [d, [a, b]] of made) {
      const sa = T.fhShowPeak(a), sb = T.fhShowPeak(b), pa = T.fhPeak(a), pb = T.fhPeak(b);
      assert(sa.turf === sb.turf && sa.dirt === sb.dirt, `${d.name} の総合力が動いた ${sb.turf}/${sb.dirt} → ${sa.turf}/${sa.dirt}`);
      assert(pa.turf === pb.turf && pa.dirt === pb.dirt, `${d.name} の中の総合力が動いた ${pb.turf}/${pb.dirt} → ${pa.turf}/${pa.dirt}`);
      for (const k of ['spd', 'sta', 'dspd', 'dsta']) assert(a.pot[k] === b.pot[k], `${d.name} の ${k} が動いた`);
    }
    return `${made.size}頭`;
  });

  check('spread: 手で決めた値は変わらない', () => {
    let n = 0;
    for (const [d, [a, b]] of made) for (const k of Object.keys(hand)) {
      if (!hand[k](d)) continue;
      assert(!(d.spr && d.spr[k] != null), `${d.name} の ${k} は手で決めたのに散らしがある`);
      assert(val[k](a) === val[k](b), `${d.name} の ${k} が動いた ${val[k](b)} → ${val[k](a)}`);
      n++;
    }
    const of = n => H.fromHistoric(all.find(d => d.name === n), 'x');
    assert(of('トウカイテイオー').health === 65 && of('ジャイアンツコーズウェイ').health === 83, '健康を手で決めた馬');
    assert(of('オートキツ').apt.heavy === 90 && of('コクサイプリンス').apt.heavy === 35, '道悪を手で決めた馬');
    return `${n}件`;
  });

  check('spread: 自動の値が決めた幅に収まり、手で決めた得意・苦手と取り違えない', () => {
    const S = HS.SPREAD;
    for (const [d, [a, b]] of made) {
      if (!hand.heavy(d)) assert(a.apt.heavy >= S.heavy[0] && a.apt.heavy <= S.heavy[1] && a.apt.heavy < H.MUD_HEAVY && !a.skills.includes('mud') === !b.skills.includes('mud'), `${d.name} の重馬場 ${a.apt.heavy}`);
      if (!hand.health(d)) assert(a.health >= S.health[0] && a.health <= S.health[1], `${d.name} の健康 ${a.health}`);
      if (!hand.kire(d)) assert(Math.abs(a.kire - b.kire) <= 1, `${d.name} の切れ ${b.kire} → ${a.kire}`);
      for (const k of ['guts', 'mind', 'slope']) if (!hand[k](d)) assert(Math.abs(a.pot[k] - b.pot[k]) <= 4.5, `${d.name} の ${k} のずれが大きい`);
      for (const k of ['turf', 'dirt']) {
        if (hand[k](d) || a.apt[k] === b.apt[k]) continue;
        // 得意の 100 は 90〜100、走っていない 55 は 48〜59（番組表の段 P.fitSurf が変わらない）
        if (b.apt[k] === 100) assert(a.apt[k] >= S.topApt && a.apt[k] <= 100, `${d.name} の ${k} ${a.apt[k]}`);
        else if (b.apt[k] === 55) assert(a.apt[k] >= S.offApt[0] && a.apt[k] <= S.offApt[1], `${d.name} の ${k} ${a.apt[k]}`);
        else assert(false, `${d.name} の ${k}（${b.apt[k]}）は散らさない値なのに動いた`);
        if (HS.Program && HS.Program.fitSurf) assert(HS.Program.fitSurf(a, k === 'dirt' ? 'ダ' : '芝') === HS.Program.fitSurf(b, k === 'dirt' ? 'ダ' : '芝'), `${d.name} の ${k} の段が変わった`);
      }
    }
  });

  check('spread: 自動の値が1つの値に固まっていない（いちばん多い値が自動の馬の1割以下。切れは8段なので3割以下）', () => {
    const out = [];
    for (const k of Object.keys(hand)) {
      const c = new Map(); let n = 0;
      for (const [d, [a, b]] of made) {
        if (hand[k](d)) continue;
        // 芝・ダートの適性は、散らす値（得意の 100・走っていない 55）だけを数える
        if ((k === 'turf' || k === 'dirt') && b.apt[k] !== 100 && b.apt[k] !== 55) continue;
        const v = val[k](a); c.set(v, (c.get(v) || 0) + 1); n++;
      }
      const top = Math.max(...c.values());
      assert(top <= n * (k === 'kire' ? 0.3 : 0.1), `${k} の自動の値が固まっている（${n}頭のうち ${top}頭が同じ値）`);
      out.push(`${k} ${top}/${n}`);
    }
    return out.join('・');
  });

  check('spread: 散らしは馬名の種で決まり、Math.random を使わない', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'core', 'datafix.js'), 'utf8');
    const block = src.split('出典で決めていない能力の散らし')[1].split('英語の名前')[0];
    assert(!/Math\.random\(/.test(block), 'datafix の散らしに Math.random がある');
    assert(/U\.hashRng\('spread:'/.test(block), '馬名の種の乱数を使っていない');
    const d = all.find(x => x.spr);
    const r = U.hashRng('spread:heavy:' + d.name).int(-9, 8), r2 = U.hashRng('spread:heavy:' + d.name).int(-9, 8);
    assert(r === r2, '同じ種で同じ値にならない');
  });
};
