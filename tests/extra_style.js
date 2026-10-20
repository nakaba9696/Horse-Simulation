// 検証：記録から作った史実馬の脚質の決め直し（data/style_fix.js）と、史実の勝ち鞍の記録のためのレース（data/hist_races.js）。docs/BALANCE.md「16」
module.exports = function (check, assert, HS) {
  const D = HS.DATA, U = HS.U, H = HS.Horse;
  check('style: 表の馬はその脚質・ほかの記録から作った馬は名前の引きのまま', () => {
    const fix = D.styleFix || {};
    for (const [n, f] of Object.entries(fix)) {
      const d = D.historic.find(x => x.name === n);
      assert(d && d.auto, `${n} が記録から作った史実馬にいない`);
      assert(H.STYLES.includes(f.style) && f.why, `${n} の値か根拠が無い`);
      assert(d.style === f.style && H.fromHistoric(d, 'styletest').style === f.style, `${n} が ${f.style} でない（${d.style}）`);
    }
    // 表に無い記録から作った馬は tools/build_auto.js の引き（短距離は前へ）のまま
    let same = 0, other = [];
    for (const d of D.historic) {
      if (!d.auto || fix[d.name]) continue;
      const sprint = d.distMax <= 1600;
      const s = U.hashRng('style:' + d.name).weighted(['逃げ', '先行', '差し', '追込'], k => ({ '逃げ': sprint ? 2 : 1, '先行': sprint ? 5 : 3.5, '差し': sprint ? 2.5 : 3.5, '追込': 1 })[k]);
      if (s === d.style) same++; else other.push(d.name);
    }
    assert(!other.length, `引きと違う脚質 ${other.slice(0, 5).join('・')}`);
    assert(D.historic.find(x => x.name === 'ラヴァマン').style === '先行', 'ラヴァマンが先行でない');
    return `表 ${Object.keys(fix).length}頭・引きのまま ${same}頭`;
  });
  check('style: 史実の勝ち鞍の記録のためのレースは番組に出ず、勝ち鞍の格と馬場に効く', () => {
    const hr = D.histRaces || [];
    assert(hr.length > 0, '表が空');
    const used = new Set(); for (const d of D.historic) for (const w of d.wins || []) used.add(w);
    for (const r of hr) {
      assert((r.to || 9999) < (U.ERA || 2025) && r.from <= r.to, `${r.name} が番組の年に入る`);
      assert(['G1', 'G2', 'G3'].includes(r.grade) && ['芝', 'ダ'].includes(r.surface) && r.dist >= 800 && r.month >= 1 && r.month <= 12, `${r.name} の項目`);
      assert(!r.course || D.courses[r.course], `${r.name} の競馬場 ${r.course}`);
      // 暦にその年の形があるレースは書かない（暦が正）
      for (let y = r.from; y <= r.to; y++) assert(!D.races.some(x => x.name === r.name && x.from <= y && y <= (x.to || 9999)), `${y}${r.name} は暦にある`);
      let any = false; for (let y = r.from; y <= r.to; y++) if (used.has(y + r.name)) any = true;
      assert(any, `${r.name} を勝った史実馬がいない`);
    }
    const of = n => H.fromHistoric(D.historic.find(x => x.name === n), 'histrace');
    const candy = of('キャンディライド'), lava = of('ラヴァマン');
    // 芝の G1（アルゼンチン）を勝ったダートの馬：芝はダートの G1 から3引いた 97。走っていない扱いの 55 ではない
    assert(candy.apt.turf === 97 && candy.apt.dirt === 100, `キャンディライド ${JSON.stringify(candy.apt)}`);
    assert(lava.apt.turf === 100 && lava.apt.dirt === 100, `ラヴァマン ${JSON.stringify(lava.apt)}`);
    const g1 = d => H.winRaces(d).filter(r => r.grade === 'G1').length;
    const bay = D.historic.find(x => x.name === 'バヤコア');
    assert(g1(bay) >= 10, `バヤコアの G1 ${g1(bay)}`);
    const tul = D.historic.find(x => x.name === 'タロック');
    assert(tul.growth === '持続' && tul.distMax >= 3200, `タロック ${tul.growth} ${tul.distMax}`);
    return `${hr.length}件・キャンディライド 芝${candy.apt.turf}・バヤコアの G1 ${g1(bay)}・タロック ${tul.growth} ${tul.distMin}〜${tul.distMax}m`;
  });
};
