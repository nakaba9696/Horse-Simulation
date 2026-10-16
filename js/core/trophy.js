// トロフィー（騎手のゲーム・年代なし）：三冠など、勝ったレースの組み合わせ。手にするとデータに残る。
// 1989年より前の名馬（スペシャルホース）は、トロフィーとは別に、馬ごとの戦績に合わせた条件で出てくる（js/core/special.js）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const H = HS.Horse, W = HS.World;
  const TR = HS.Trophy = {};

  // ゲームの中の勝ち鞍（短い名）と、データの勝ち鞍（"1964皐月賞" の形）
  const gw = h => (h.gradedWins || []).map(g => ({ y: g.y, r: g.short || g.race }));
  const won = (h, name, pred) => gw(h).some(w => w.r === name && (!pred || pred(w.y)));
  const sameYear = names => (h, race) => names.every(n => won(h, n, y => y === race.year));
  const prevYear = name => (h, race) => won(h, name, y => y === race.year - 1);
  const other = pairs => (h, race) => { const o = pairs[race.short]; return !!o && won(h, o, y => y <= race.year) && !won(h, race.short); };

  // finals：条件の最後のレース（短い名。複数あれば、どちらかが最後）。legs：それまでに勝っておくもの
  TR.LIST = [
    { id: 'triple', label: '三冠', note: '皐月賞・日本ダービー・菊花賞を同じ年に', finals: ['菊花賞'], legs: sameYear(['皐月賞', '日本ダービー']) },
    { id: 'ftriple', label: '牝馬三冠', note: '桜花賞・オークス・秋華賞を同じ年に', finals: ['秋華賞'], legs: sameYear(['桜花賞', 'オークス']) },
    { id: 'autumn', label: '秋の古馬三冠', note: '天皇賞・秋・ジャパンC・有馬記念を同じ年に', finals: ['有馬記念'], legs: sameYear(['天皇賞・秋', 'ジャパンC']) },
    { id: 'spring', label: '春の古馬三冠', note: '大阪杯・天皇賞・春・宝塚記念を同じ年に', finals: ['宝塚記念'], legs: sameYear(['大阪杯', '天皇賞・春']) },
    { id: 'grandprix', label: 'グランプリ制覇', note: '宝塚記念と有馬記念の両方', finals: ['有馬記念', '宝塚記念'], legs: other({ '有馬記念': '宝塚記念', '宝塚記念': '有馬記念' }) },
    { id: 'tenno', label: '天皇賞の春秋制覇', note: '天皇賞・春と天皇賞・秋の両方', finals: ['天皇賞・秋', '天皇賞・春'], legs: other({ '天皇賞・秋': '天皇賞・春', '天皇賞・春': '天皇賞・秋' }) },
    { id: 'arima2', label: '有馬記念連覇', note: '有馬記念を2年続けて', finals: ['有馬記念'], legs: prevYear('有馬記念') },
    { id: 'arc2', label: '凱旋門賞連覇', note: '凱旋門賞を2年続けて', finals: ['凱旋門賞'], legs: prevYear('凱旋門賞') },
    { id: 'us3', label: '米三冠', note: 'ケンタッキーダービー・プリークネスS・ベルモントSを同じ年に', finals: ['ベルモントS'], legs: sameYear(['ケンタッキーダービー', 'プリークネスS']) },
    { id: 'uk3', label: '英三冠', note: '英2000ギニー・英ダービー・英セントレジャーを同じ年に', finals: ['英セントレジャー'], legs: sameYear(['英2000ギニー', '英ダービー']) },
  ];
  // 手にしたときのボーナス賞金（万円・1995年の物価。いまの物価に直して渡す）。持ち主の指摘 2026-10-16「トロフィーゲットでボーナス賞金」
  TR.BONUS = { triple: 50000, ftriple: 30000, autumn: 30000, spring: 30000, grandprix: 10000, tenno: 10000, arima2: 10000, arc2: 30000, us3: 50000, uk3: 50000 };
  TR.bonusOf = t => Math.round((TR.BONUS[t.id] || 0) * HS.U.priceIndex() / 10) * 10;
  TR.LIST.forEach(t => { const base = t.note; Object.defineProperty(t, 'note', { get: () => `${base}（ボーナス賞金 ${HS.U.money(TR.bonusOf(t))}）`, enumerable: true }); });
  TR.BY = {}; TR.LIST.forEach(t => { TR.BY[t.id] = t; });

  // 自分の馬が重賞を勝ったとき（season.js の onWin から）
  TR.onWin = function (h, race) {
    const G = W.get();
    if (!G.eraless) return [];
    G.trophies = G.trophies || {};
    const got = [];
    for (const t of TR.LIST) {
      if (!t.finals.includes(race.short) || G.trophies[t.id]) continue;
      // legs は「この勝ちより前」で見る（いま足した勝ち鞍は除く）
      const before = Object.assign({}, h, { gradedWins: h.gradedWins.slice(0, -1) });
      if (!t.legs(before, race)) continue;
      const bonus = TR.bonusOf(t);
      G.trophies[t.id] = { y: race.year, horse: h.name, hid: h.id, bonus };
      G.player.money += bonus;
      W.news(`トロフィー「${t.label}」を手にした！（${h.name}）ボーナス賞金 ${HS.U.money(bonus)}`, 'g1');
      got.push(t);
    }
    return got;
  };
})();
