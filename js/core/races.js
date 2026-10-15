// その週のレース一覧（重賞はデータから、条件戦は開催場ごとに作る）と、出走できるかの判定
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse;
  const R = HS.Races = {};

  // 条件戦の距離（競馬場ごと）
  R.DISTS = {
    '東京': { '芝': [1400, 1600, 1800, 2000, 2300, 2400], 'ダ': [1300, 1400, 1600, 2100] },
    '中山': { '芝': [1200, 1600, 1800, 2000, 2200, 2500], 'ダ': [1200, 1800, 2400] },
    '京都': { '芝': [1200, 1400, 1600, 1800, 2000, 2200, 2400], 'ダ': [1200, 1400, 1800, 1900] },
    '阪神': { '芝': [1200, 1400, 1600, 1800, 2000, 2200, 2400], 'ダ': [1200, 1400, 1800, 2000] },
    '中京': { '芝': [1200, 1400, 1600, 2000, 2200], 'ダ': [1200, 1400, 1800, 1900] },
    '新潟': { '芝': [1000, 1200, 1400, 1600, 1800, 2000, 2200], 'ダ': [1200, 1800] },
    '福島': { '芝': [1200, 1800, 2000, 2600], 'ダ': [1150, 1700] },
    '小倉': { '芝': [1200, 1800, 2000, 2600], 'ダ': [1000, 1700] },
    '札幌': { '芝': [1200, 1500, 1800, 2000, 2600], 'ダ': [1000, 1700] },
    '函館': { '芝': [1200, 1800, 2000, 2600], 'ダ': [1000, 1700] },
  };
  R.CLS_PRIZE = { newcomer: 700, maiden: 520, C1: 950, C2: 1400, C3: 1850, OP: 2300 };
  R.GRADE_RANK = { G1: 3, G2: 2, G3: 1 };

  // 重賞のデータ（年で有効なもの）
  R.gradedOf = function (year, month, week) {
    return (HS.DATA.races || []).filter(r => r.from <= year && year <= (r.to || 9999) && r.month === month && r.week === week)
      .map(r => Object.assign({}, r, { key: `${year}-${month}-${week}-${r.name}`, graded: true, year, prize: R.prizeOf(r, year) }));
  };
  // その年の1着賞金（prizeBy があれば年ごとの値）
  R.prizeOf = function (r, year) {
    let p = r.prize || 3000;
    if (r.prizeBy) for (const [y, v] of Object.entries(r.prizeBy).sort((a, b) => a[0] - b[0])) if (+y <= year) p = v;
    return p;
  };
  R.gradedYear = function (year) {
    return (HS.DATA.races || []).filter(r => r.from <= year && year <= (r.to || 9999)).map(r => Object.assign({}, r, { year }))
      .sort((a, b) => (a.month - b.month) || (a.week - b.week) || ((R.GRADE_RANK[b.grade] || 0) - (R.GRADE_RANK[a.grade] || 0)));
  };

  // 条件戦を作る（種と日付で毎回同じものになる）
  R.conditionalOf = function (seed, year, month, week) {
    const out = [];
    const courses = (HS.DATA.meets && HS.DATA.meets[month]) || [];
    const old = year < 2019;
    courses.forEach((course, ci) => {
      const rng = U.hashRng(`${seed}:${year}:${month}:${week}:${course}`);
      const slots = [];
      // 2歳戦（6月〜）・3歳戦（〜9月）・古馬の条件戦
      if (month >= 6) slots.push({ age: '2', cls: month <= 8 || rng.chance(0.5) ? 'newcomer' : 'maiden' });
      if (month >= 9) slots.push({ age: '2', cls: rng.chance(0.6) ? 'maiden' : 'C1' });
      if (month <= 3) slots.push({ age: '3', cls: rng.chance(0.3) ? 'newcomer' : 'maiden' });
      if (month <= 9) slots.push({ age: '3', cls: 'maiden' });
      if (month <= 6) slots.push({ age: '3', cls: rng.chance(0.75) ? 'C1' : 'OP' });
      const olderAge = month <= 5 ? '4+' : '3+';
      slots.push({ age: olderAge, cls: 'C1' }, { age: olderAge, cls: 'C2' }, { age: olderAge, cls: rng.chance(0.6) ? 'C3' : 'OP' });
      slots.forEach((sl, si) => {
        const surface = rng.chance(sl.cls === 'newcomer' ? 0.55 : 0.5) ? '芝' : 'ダ';
        let ds = R.DISTS[course][surface];
        if (sl.age === '2') ds = ds.filter(d => d <= (month < 9 ? 1800 : 2000)).length ? ds.filter(d => d <= (month < 9 ? 1800 : 2000)) : [ds[0]];
        const dist = rng.pick(ds);
        const ageLabel = sl.age === '2' ? '2歳' : sl.age === '3' ? '3歳' : sl.age === '3+' ? '3歳以上' : '4歳以上';
        const clsLabel = sl.cls === 'newcomer' ? '新馬' : sl.cls === 'maiden' ? '未勝利' : sl.cls === 'OP' ? 'オープン' : H.className(sl.cls, year);
        const fem = sl.cls !== 'newcomer' && rng.chance(0.15);
        out.push({
          key: `${year}-${month}-${week}-c${ci}-${si}`, name: `${ageLabel}${clsLabel}${fem ? '（牝）' : ''}`, short: null, grade: null, cls: sl.cls,
          region: 'JRA', course, surface, dist, month, week, age: sl.age, sex: fem ? '牝' : undefined, weight: '馬齢', prize: Math.round(R.CLS_PRIZE[sl.cls] * U.priceIndex(year) / 10) * 10, year, graded: false,
        });
      });
    });
    return out;
  };

  R.ofWeek = function (seed, year, month, week) {
    return R.gradedOf(year, month, week).concat(R.conditionalOf(seed, year, month, week));
  };

  // 馬場状態（週・競馬場ごとに決まる）
  R.ground = function (seed, year, month, week, course) {
    const rng = U.hashRng(`g:${seed}:${year}:${month}:${week}:${course}`);
    const wet = (month === 6 || month === 7 || month === 9) ? 1.8 : 1;
    const r = rng.next();
    if (r < 0.05 * wet) return '不良';
    if (r < 0.14 * wet) return '重';
    if (r < 0.28 * wet) return '稍重';
    return '良';
  };

  R.label = r => r.short || r.name;
  // 1984年より前の日本には格付けが無いので「重賞」と出す
  R.gradeBadge = r => r.grade ? (r.region === 'JRA' && r.year && r.year < 1984 ? '重賞' : r.region === '地方' ? (r.grade === 'G1' ? 'Jpn1' : r.grade.replace('G', 'Jpn')) : r.grade) : (r.cls === 'OP' ? 'OP' : '');
  R.maxField = function (race) {
    if (race.region === '海外') return 14;
    if (race.region === '地方') return race.course === '大井' ? 16 : 14;
    const c = HS.DATA.courses[race.course];
    const geo = c && (race.surface === 'ダ' ? c.dirt : c.turf);
    if (!race.graded) return geo && geo.lap < 1700 ? 14 : 16;
    return geo && geo.lap < 1700 ? 16 : 18;
  };

  // 出走できるか。理由の文字列（できないとき）か null を返す
  R.ineligible = function (horse, race, year) {
    if (race.invite) return '招待馬だけ';
    const age = year - horse.born;
    if (race.age === '2' && age !== 2) return '年齢';
    if (race.age === '3' && age !== 3) return '年齢';
    if (race.age === '3+' && age < 3) return '年齢';
    if (race.age === '4+' && age < 4) return '年齢';
    if (age < 2) return '年齢';
    if (race.sex === '牝' && horse.sex !== '牝') return '牝馬限定';
    if (race.noGelding && horse.gelding) return 'せん馬は出られない';
    if (horse.injury) return '故障中';
    // 外国で調教されている馬は、向こうでの実績で出てくるのでクラスを問わない
    if (horse.foreignTrained) return race.graded ? null : '外国調教馬';
    const cls = H.classOf(horse), rank = H.CLASS_RANK[cls];
    if (!race.graded) {
      if (race.cls === 'newcomer') return (horse.starts || 0) === 0 ? null : '新馬戦はデビュー戦のみ';
      if (race.cls === 'maiden') return rank === 0 ? null : '勝ち上がり済み';
      const need = H.CLASS_RANK[race.cls];
      if (rank > need) return 'クラスが上';
      return null; // 格上挑戦は出られる（除外されやすい）
    }
    // 重賞：1勝以上（2歳・3歳限定戦）、古馬は2勝クラス以上
    if (rank === 0) return '未勝利馬';
    if ((race.age === '3+' || race.age === '4+') && rank < 2 && race.grade !== 'G3') return '実績が足りない';
    if (race.region === '海外' && rank < 4) return 'オープン馬のみ';
    return null;
  };

  // 出走の優先順（大きいほど先）
  R.priority = function (horse, race, year, rng) {
    let p = 0;
    if (horse.rights && horse.rights[race.name] === year) p += 1e6;
    p += (horse.gradedWins || []).filter(g => g.grade === 'G1').length * 1e5;
    if (!race.graded && race.cls) {
      const diff = H.CLASS_RANK[race.cls] - H.CLASS_RANK[H.classOf(horse)];
      p -= diff * 5e4; // 格上挑戦は後回し
    }
    p += (horse.earn || 0);
    p += rng.next() * 500;
    return p;
  };
})();
