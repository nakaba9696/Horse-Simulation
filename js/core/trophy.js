// トロフィーと伝説の名馬（騎手のゲーム・年代なし。持ち主の決定 2026-10-16）
// 三冠などのトロフィーは、条件の最後のレースに自分の馬が出ると、1990年より前に同じことをやってのけた名馬（伝説の名馬）が特別に出てくる。
// 勝つとトロフィーを手にし、その名馬たちが馬の店に並ぶようになる。伝説の名馬はその場限りで、世界の暦には出ない
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const H = HS.Horse, W = HS.World;
  const TR = HS.Trophy = {};
  TR.MAX_LEGENDS = 4; // 1レースに出てくる伝説の名馬の数の上限

  // ゲームの中の勝ち鞍（短い名）と、データの勝ち鞍（"1964皐月賞" の形）
  const gw = h => (h.gradedWins || []).map(g => ({ y: g.y, r: g.short || g.race }));
  const won = (h, name, pred) => gw(h).some(w => w.r === name && (!pred || pred(w.y)));
  const dn = (d, name) => (d.wins || []).filter(s => s.slice(4) === name).length;
  const sameYear = names => (h, race) => names.every(n => won(h, n, y => y === race.year));
  const prevYear = name => (h, race) => won(h, name, y => y === race.year - 1);
  const other = pairs => (h, race) => { const o = pairs[race.short]; return !!o && won(h, o, y => y <= race.year) && !won(h, race.short); };

  // final：条件の最後のレース（短い名。複数あれば、どちらかが最後）。legs：それまでに勝っておくもの。legend：伝説の名馬の条件（データの勝ち鞍）
  TR.LIST = [
    { id: 'triple', label: '三冠', note: '皐月賞・日本ダービー・菊花賞を同じ年に', finals: ['菊花賞'], legs: sameYear(['皐月賞', '日本ダービー']), legend: d => dn(d, '皐月賞') && dn(d, '東京優駿') && dn(d, '菊花賞') },
    { id: 'ftriple', label: '牝馬三冠', note: '桜花賞・オークス・秋華賞を同じ年に', finals: ['秋華賞'], legs: sameYear(['桜花賞', 'オークス']), legend: d => dn(d, '桜花賞') && dn(d, '優駿牝馬') },
    { id: 'autumn', label: '秋の古馬三冠', note: '天皇賞・秋・ジャパンC・有馬記念を同じ年に', finals: ['有馬記念'], legs: sameYear(['天皇賞・秋', 'ジャパンC']), legend: d => (dn(d, '天皇賞（秋）') ? 1 : 0) + (dn(d, 'ジャパンカップ') ? 1 : 0) + (dn(d, '有馬記念') ? 1 : 0) >= 2 },
    { id: 'spring', label: '春の古馬三冠', note: '大阪杯・天皇賞・春・宝塚記念を同じ年に', finals: ['宝塚記念'], legs: sameYear(['大阪杯', '天皇賞・春']), legend: d => dn(d, '天皇賞（春）') && dn(d, '宝塚記念') },
    { id: 'grandprix', label: 'グランプリ制覇', note: '宝塚記念と有馬記念の両方', finals: ['有馬記念', '宝塚記念'], legs: other({ '有馬記念': '宝塚記念', '宝塚記念': '有馬記念' }), legend: d => dn(d, '宝塚記念') && dn(d, '有馬記念') },
    { id: 'tenno', label: '天皇賞の春秋制覇', note: '天皇賞・春と天皇賞・秋の両方', finals: ['天皇賞・秋', '天皇賞・春'], legs: other({ '天皇賞・秋': '天皇賞・春', '天皇賞・春': '天皇賞・秋' }), legend: d => dn(d, '天皇賞（春）') && dn(d, '天皇賞（秋）') },
    { id: 'arima2', label: '有馬記念連覇', note: '有馬記念を2年続けて', finals: ['有馬記念'], legs: prevYear('有馬記念'), legend: d => dn(d, '有馬記念') >= 2 },
    { id: 'arc2', label: '凱旋門賞連覇', note: '凱旋門賞を2年続けて', finals: ['凱旋門賞'], legs: prevYear('凱旋門賞'), legend: d => dn(d, '凱旋門賞') >= 2 },
    { id: 'us3', label: '米三冠', note: 'ケンタッキーダービー・プリークネスS・ベルモントSを同じ年に', finals: ['ベルモントS'], legs: sameYear(['ケンタッキーダービー', 'プリークネスS']), legend: d => dn(d, 'ケンタッキーダービー') && dn(d, 'プリークネスステークス') && dn(d, 'ベルモントステークス') },
    { id: 'uk3', label: '英三冠', note: '英2000ギニー・英ダービー・英セントレジャーを同じ年に', finals: ['英セントレジャー'], legs: sameYear(['英2000ギニー', '英ダービー']), legend: d => dn(d, '英2000ギニー') && dn(d, '英ダービー') && dn(d, '英セントレジャー') },
  ];
  TR.BY = {}; TR.LIST.forEach(t => { TR.BY[t.id] = t; });

  // 伝説の名馬：1990年より前に走った史実馬（と data/legends.js）
  let legendAll = null;
  TR.legendPool = () => legendAll || (legendAll = (HS.DATA.historic || []).filter(d => HS.Eraless.isLegend(d)).concat(HS.DATA.legendsExtra || []));
  TR.legendData = name => TR.legendPool().find(d => d.name === name) || null;
  const legCache = {};
  TR.legendsOf = function (t) {
    if (!legCache[t.id]) legCache[t.id] = TR.legendPool().filter(t.legend).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);
    return legCache[t.id];
  };

  // このレースで、自分の馬にかかっているトロフィー（まだ手にしていないもの）
  TR.pending = function (h, race) {
    const G = W.get();
    if (h.owner !== 'P' || !race.short) return [];
    return TR.LIST.filter(t => t.finals.includes(race.short) && !(G.trophies || {})[t.id] && t.legs(h, race));
  };
  // 伝説の名馬を、このレースのための馬にする（いちばん良いときの力で。その場限り）
  TR.legendHorse = function (d, race) {
    const age = race.age === '2' ? 2 : race.age === '3' ? 3 : 4;
    const h = H.fromHistoric(HS.Eraless.shift(d, (race.year - age) - d.born), `legend:${d.name}`);
    h.legend = true; h.owner = 'AI'; h.loc = 'legend'; h.starts = 8; h.wins = 7; h.earn = 50000;
    if (HS.DATA.isForeign(d)) { h.foreignTrained = true; h.country = d.country || '外'; }
    return h;
  };
  // prepareWeek から：自分の馬がトロフィーのかかったレースに出るなら、伝説の名馬の出走を足す
  TR.legendsFor = function (race, entries) {
    const names = new Set(), out = [];
    for (const e of entries) {
      if (!e.mine || !e.horse) continue;
      for (const t of TR.pending(e.horse, race)) for (const d of TR.legendsOf(t)) {
        if (names.has(d.name) || out.length >= TR.MAX_LEGENDS) continue;
        names.add(d.name); out.push({ horse: TR.legendHorse(d, race), legend: true });
      }
    }
    return out;
  };
  // 自分の馬が重賞を勝ったとき（season.js の onWin から）
  TR.onWin = function (h, race) {
    const G = W.get();
    if (!G.eraless) return [];
    G.trophies = G.trophies || {}; G.unlocked = G.unlocked || [];
    const got = [];
    for (const t of TR.LIST) {
      if (!t.finals.includes(race.short) || G.trophies[t.id]) continue;
      // legs は「この勝ちより前」で見る（いま足した勝ち鞍は除く）
      const before = Object.assign({}, h, { gradedWins: h.gradedWins.slice(0, -1) });
      if (!t.legs(before, race)) continue;
      const legends = TR.legendsOf(t).map(d => d.name);
      G.trophies[t.id] = { y: race.year, horse: h.name, legends };
      for (const n of legends) if (!G.unlocked.includes(n)) G.unlocked.push(n);
      W.news(`トロフィー「${t.label}」を手にした！（${h.name}）${legends.length ? `　${legends.join('・')}が馬の店に並ぶようになった。` : ''}`, 'g1');
      got.push(t);
    }
    return got;
  };
})();
