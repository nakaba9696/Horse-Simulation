// 隠し馬の名鑑（B9）とデータの穴（B10）の検証（docs/review/PENDING.md・持ち主の決定 2026-10-24「おねがい」「かいて」）
module.exports = function (check, assert, HS) {
  const D = HS.DATA, SP = HS.Special, H = HS.Horse;
  const hist = n => (D.historic || []).find(d => d.name === n) || (D.legendsExtra || []).find(d => d.name === n);
  // 勝ち鞍が、その年の暦か史実の勝ち鞍の記録のためのレース（data/hist_races.js）に結びつく
  const linked = (d, w) => H.winRaces({ wins: [w] }).length === 1 && (d.wins || []).includes(w);

  check('holes: 名鑑を書いた8頭のうち隠し馬に残る4頭は（ポーニーズ・シュヴィー・ルモス・アードロスは外した。持ち主の決定 2026-10-24）、条件にぴったりのトロフィーの隠し馬で、ほかのグループには入らない（B9）', () => {
    HS.U.ERA = HS.Eraless.ERA;
    const want = { 'イヴァンジカ': 'frf3', 'スリートロイカス': 'frf3', 'ミセスペニー': 'frf3', 'ストロベリーロード': 'au3' };
    const bad = [];
    for (const [n, t] of Object.entries(want)) {
      const x = SP.byName(n);
      if (!x) { bad.push(n + ':スペシャルホースにいない'); continue; }
      if (x.groups.join() !== 't:' + t) bad.push(`${n}:${x.groups.join()}`);
      if (!(x.d.record && x.d.text && x.d.text.length >= 250)) bad.push(n + ':名鑑');
    }
    // 史実で取った条件のレース（同じ年）がデータの勝ち鞍に入っている
    const need = { 'ポーニーズ': ['1976英オークス', '1976仏オークス'], 'シュヴィー': ['1969エイコーンステークス', '1969コーチングクラブアメリカンオークス', '1969アラバマステークス'],
      'イヴァンジカ': ['1975仏1000ギニー', '1975ヴェルメイユ賞'], 'スリートロイカス': ['1979仏1000ギニー', '1979ヴェルメイユ賞'], 'ミセスペニー': ['1980仏オークス', '1980ヴェルメイユ賞'],
      'ルモス': ['1979アスコットゴールドカップ', '1979グッドウッドカップ', '1980アスコットゴールドカップ', '1980グッドウッドカップ'], 'アードロス': ['1981アスコットゴールドカップ', '1981グッドウッドカップ'],
      'ストロベリーロード': ['1983ローズヒルギニー', '1983オーストラリアンダービー'] };
    for (const [n, ws] of Object.entries(need)) for (const w of ws) if (!linked(hist(n), w)) bad.push(`${n}:${w}`);
    assert(!bad.length, bad.join(', '));
    return Object.keys(want).map(n => `${n}（${want[n]}）`).join('・');
  });

  check('holes: 地方の名馬の勝ち鞍が入り、その年の形（data/hist_races.js）に結びつく（B10）', () => {
    const need = { 'ヒカルタカイ': ['1966全日本三才優駿', '1967羽田盃', '1967東京ダービー', '1967東京王冠賞'], 'ハツシバオー': ['1978羽田盃', '1978東京ダービー', '1978東京王冠賞', '1978東京大賞典'],
      'サンオーイ': ['1983羽田盃', '1983東京ダービー', '1983東京王冠賞', '1983東京大賞典'], 'テツノカチドキ': ['1984東京大賞典', '1985大井記念', '1986大井記念', '1987帝王賞', '1987東京大賞典'] };
    const bad = [];
    for (const [n, ws] of Object.entries(need)) for (const w of ws) {
      if (!linked(hist(n), w)) { bad.push(`${n}:${w}`); continue; }
      const r = H.winRaces({ wins: [w] })[0];
      if (r.region !== '地方' || r.surface !== 'ダ') bad.push(`${n}:${w}:${r.region}${r.surface}`);
    }
    // 1983年の東京王冠賞は 2600m（1980〜1986年）
    const okan = H.winRaces({ wins: ['1983東京王冠賞'] })[0];
    if (!okan || okan.dist !== 2600) bad.push('1983東京王冠賞の距離');
    assert(!bad.length, bad.join(', '));
    return '4頭・18勝';
  });

  check('holes: 暦の古い年（豪のクイーンエリザベスS・グッドウッドC・ランドウィックギニー）と、古い勝ちの結びつき（B10）', () => {
    const bad = [];
    const rowOf = (name, y) => (D.races || []).filter(r => r.name === name && r.from <= y && y <= (r.to || 9999));
    // 暦は年ごとにちょうど1行（重ならない）
    for (const [n, a, b] of [['クイーンエリザベスステークス', 1960, 2026], ['グッドウッドカップ', 1960, 2026], ['ランドウィックギニー', 2014, 2026]])
      for (let y = a; y <= b; y++) if (rowOf(n, y).length !== 1) bad.push(`${n}${y}:${rowOf(n, y).length}行`);
    for (const y of [2006, 2007, 2008, 2009, 2010, 2012]) if (rowOf('ランドウィックギニー', y).length !== 1) bad.push('ランドウィックギニー' + y);
    // 格：グッドウッドCは2016年まで G2・G3、2017年から G1
    const gw = y => (rowOf('グッドウッドカップ', y)[0] || {}).grade;
    if (gw(1979) !== 'G2' || gw(1987) !== 'G3' || gw(2010) !== 'G2' || gw(2017) !== 'G1') bad.push('グッドウッドCの格');
    // 古い勝ち：タロックの3勝・ファーラップの AJC プレート・セントサイモンのグッドウッドC・オクタゴナルのカンタベリーギニー
    for (const [n, w] of [['タロック', '1958クイーンエリザベスステークス'], ['タロック', '1960クイーンエリザベスステークス'], ['タロック', '1961クイーンエリザベスステークス'],
      ['ファーラップ', '1930AJCプレート'], ['セントサイモン', '1884グッドウッドカップ'], ['オクタゴナル', '1996カンタベリーギニー']]) if (!linked(hist(n), w)) bad.push(`${n}:${w}`);
    // 1960年のクイーンエリザベスSは暦の行（2800m）
    const q = H.winRaces({ wins: ['1960クイーンエリザベスステークス'] })[0];
    if (!q || q.dist !== 2800 || !(D.races || []).includes(q)) bad.push('1960クイーンエリザベスS');
    assert(!bad.length, bad.join(', '));
    return 'クイーンエリザベスS 1960〜・グッドウッドC 1960〜・ランドウィックギニー 2006〜（2011・2013 はウォリックファームで暦に無い）';
  });
};
