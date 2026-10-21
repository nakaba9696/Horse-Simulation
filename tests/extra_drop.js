// 検証：ゲームに出さない史実馬（data/drop_horses.js。持ち主の決定 2026-10-21）
module.exports = function (check, assert, HS) {
  const D = HS.DATA;
  check('drop: 外した史実馬は世界に出ず、有名な馬（大きなレースの勝ち馬・名鑑のある馬・ほかの馬の親）は残る', () => {
    const names = new Set(D.historic.map(h => h.name));
    const left = D.dropHorses.filter(n => names.has(n));
    assert(!left.length, '外したのに残る：' + left.join('・'));
    for (const n of ['ホーリックス', 'ウイニングカラーズ', 'ブラックタイアフェアー', 'ブライアンズタイム', 'デインヒル']) assert(names.has(n), n + ' が消えた');
    const prof = new Set(D.profiles.map(p => HS.normName(p.name)));
    const par = new Set(); for (const h of D.historic) { par.add(h.sire); par.add(h.dam); par.add(h.damsire); }
    const bad = D.dropHorses.filter(n => prof.has(HS.normName(n)) || par.has(n));
    assert(!bad.length, '名鑑か仔のある馬を外している：' + bad.join('・'));
    return D.dropHorses.length + '頭を外した';
  });
};
