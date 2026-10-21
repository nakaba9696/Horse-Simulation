// 検証：名鑑の無い海外の馬の史実の主な勝鞍（data/main_wins_world.js。持ち主の指示 2026-10-21）
module.exports = function (check, assert, HS) {
  const D = HS.DATA;
  check('mainwins: 史実の主な勝鞍は「年 レース名」で日本語と英語の数がそろい、名鑑のある馬は名鑑が正のまま', () => {
    const M = D.mainWinsWorld || {};
    const bad = Object.entries(M).filter(([, w]) => !w.ja.length || w.ja.length !== w.en.length || w.ja.length > 10 || !w.ja.every(x => /^\d{4} \S/.test(x)) || !w.en.every(x => /^\d{4} \S/.test(x)));
    assert(!bad.length, '形の違う馬：' + bad.slice(0, 5).map(x => x[0]).join('・'));
    const prof = new Map(D.profiles.map(p => [p.name, p]));
    const by = new Map(D.historic.map(h => [h.name, h]));
    const over = Object.keys(M).filter(n => prof.has(n) && by.has(n) && prof.get(n).mainWins && JSON.stringify(by.get(n).mainWins) !== JSON.stringify(prof.get(n).mainWins));
    assert(!over.length, '名鑑の勝鞍を上書きした：' + over.join('・'));
    const used = Object.keys(M).filter(n => by.has(n) && by.get(n).mainWinsEn).length;
    return `${Object.keys(M).length}頭（ゲームに出る ${used}頭）`;
  });
};
