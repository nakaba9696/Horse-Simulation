// その週のレース一覧（重賞はデータから、オープン（OP・リステッド）は開催場ごとに作る）と、出走できるかの判定
// レースは OP 以上だけ（持ち主の決定 2026-10-20「レースはOP以上のみ」）：新馬戦・未勝利戦・条件戦は無い。最初から OP に出られ、G2 までは無条件、G1 は獲得賞金の条件
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse;
  const R = HS.Races = {};

  // オープンの距離（競馬場ごと）
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
  // オープンの1着賞金（万円・1995年の物価）。リステッド（L）は少し高い
  R.CLS_PRIZE = { OP: 2300, L: 2600 };
  R.GRADE_RANK = { G1: 3, G2: 2, G3: 1 };

  // 重賞のデータ（年で有効なもの）
  R.gradedOf = function (year, month, week) {
    const ey = U.ERA || year; // 年代なしなら、番組はその年で固定
    return (HS.DATA.races || []).filter(r => r.from <= ey && ey <= (r.to || 9999) && r.month === month && r.week === week)
      .map(r => Object.assign({}, r, { key: `${year}-${month}-${week}-${r.name}`, graded: true, year, prize: R.prizeOf(r, ey) }));
  };
  // その年の1着賞金（prizeBy があれば年ごとの値）
  R.prizeOf = function (r, year) {
    let p = r.prize || 3000;
    if (r.prizeBy) for (const [y, v] of Object.entries(r.prizeBy).sort((a, b) => a[0] - b[0])) if (+y <= year) p = v;
    return p;
  };
  R.gradedYear = function (year) {
    const ey = U.ERA || year;
    return (HS.DATA.races || []).filter(r => r.from <= ey && ey <= (r.to || 9999)).map(r => Object.assign({}, r, { year }))
      .sort((a, b) => (a.month - b.month) || (a.week - b.week) || ((R.GRADE_RANK[b.grade] || 0) - (R.GRADE_RANK[a.grade] || 0)));
  };

  // オープン（OP・リステッド）を作る（種と日付で毎回同じものになる）。競馬場ごとに、2歳（6月〜）・3歳（〜9月）・古馬を1つずつと、ときどきもう1つ
  // 鍵は 年-月-週-o競馬場-番号（前の版の条件戦は -c…。World.migrate が予約と出走登録を外す）
  R.openOf = function (seed, year, month, week) {
    const out = [];
    const courses = (HS.DATA.meets && HS.DATA.meets[month]) || [];
    courses.forEach((course, ci) => {
      const rng = U.hashRng(`op:${seed}:${year}:${month}:${week}:${course}`);
      const slots = [];
      if (month >= 6) slots.push('2');
      if (month >= 9 && rng.chance(0.4)) slots.push('2');
      if (month <= 9) slots.push('3');
      const olderAge = month <= 5 ? '4+' : '3+';
      slots.push(olderAge);
      if (rng.chance(0.5)) slots.push(olderAge);
      slots.forEach((age, si) => {
        const listed = rng.chance(0.3);
        const surface = rng.chance(age === '2' ? 0.6 : 0.5) ? '芝' : 'ダ';
        let ds = R.DISTS[course][surface];
        if (age === '2') ds = ds.filter(d => d <= (month < 9 ? 1800 : 2000)).length ? ds.filter(d => d <= (month < 9 ? 1800 : 2000)) : [ds[0]];
        const dist = rng.pick(ds);
        const ageLabel = age === '2' ? '2歳' : age === '3' ? '3歳' : age === '3+' ? '3歳以上' : '4歳以上';
        const fem = rng.chance(0.15);
        const r = {
          key: `${year}-${month}-${week}-o${ci}-${si}`, name: `${ageLabel}${listed ? 'リステッド' : 'オープン'}${fem ? '（牝）' : ''}`, short: null, grade: null, cls: 'OP',
          region: 'JRA', course, surface, dist, month, week, age, weight: '馬齢', prize: Math.round(R.CLS_PRIZE[listed ? 'L' : 'OP'] * U.priceIndex(year) / 10) * 10, year, graded: false,
        };
        if (fem) r.sex = '牝';
        if (listed) r.listed = true;
        out.push(r);
      });
    });
    return out;
  };
  R.isOldKey = key => /-c\d+-\d+$/.test(key || ''); // 前の版の条件戦の鍵

  R.ofWeek = function (seed, year, month, week) {
    return R.gradedOf(year, month, week).concat(R.openOf(seed, year, month, week));
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
  // 1984年より前の日本には格付けが無いので「重賞」と出す。地方は Jpn と出すが、国際格付けの印（intlGrade）があれば G のまま
  R.gradeBadge = r => r.grade ? (r.region === 'JRA' && r.year && r.year < 1984 ? '重賞' : r.region === '地方' && !r.intlGrade ? (r.grade === 'G1' ? 'Jpn1' : r.grade.replace('G', 'Jpn')) : r.grade) : (r.cls === 'OP' ? (r.listed ? 'L' : 'OP') : '');
  R.maxField = function (race) {
    if (race.region === '海外') return 14;
    if (race.region === '地方') return race.course === '大井' ? 16 : 14;
    const c = HS.DATA.courses[race.course];
    const geo = c && (race.surface === 'ダ' ? c.dirt : c.turf);
    if (!race.graded) return geo && geo.lap < 1700 ? 14 : 16;
    return geo && geo.lap < 1700 ? 16 : 18;
  };

  // 出走できるか。理由の文字列（できないとき）か null を返す。
  // ほかの条件を満たしていても、連闘で別の国へは行けない（中1週から。js/core/fatigue.js）
  R.ineligible = (horse, race, year) => R.ineligibleBase(horse, race, year) || (HS.Fatigue ? HS.Fatigue.travelWhy(horse, race) : null);
  R.ineligibleBase = function (horse, race, year) {
    if (race.invite) return '招待馬だけ';
    const age = year - horse.born;
    if (race.age === '2' && age !== 2) return '年齢';
    if (race.age === '3' && age !== 3) return '年齢';
    if (race.age === '3+' && age < 3) return '年齢';
    if (race.age === '4+' && age < 4) return '年齢';
    if (race.age === '4' && age !== 4) return '年齢'; // 4歳限定（香港ダービーなど）
    if (age < 2) return '年齢';
    if (race.sex === '牝' && horse.sex !== '牝') return '牝馬限定';
    if (race.noGelding && horse.gelding) return 'せん馬は出られない';
    // 外国で調教されている馬は、向こうでの実績で出てくるので賞金を問わない（重賞だけ）
    if (horse.foreignTrained) return race.graded ? null : '外国調教馬';
    if (race.region === '海外') return R.abroadWhy(horse, race, year);
    if (race.grade === 'G1') return R.g1Why(horse, race, year);
    return null; // OP・リステッド・G3・G2 は無条件（年齢・性の決まりだけ）
  };

  // ---------- G1 の獲得賞金の条件（数は docs/BALANCE.md「8. 出走の条件」） ----------
  // 獲得賞金（h.earn）：勝った1着賞金と、重賞の2着の4割を足したもの。G1 の前の週までの分で見る
  // 要る額は G1 の年齢の区分ごと（万円・1995年の物価）。2歳：OP を1つ勝てば足りる／3歳：OP 2勝か G3 1勝ほど／古馬：G2 1勝か G3＋OP ほど
  R.G1_EARN = { '2': 2000, '3': 3500, older: 5000 };
  R.G1_WHY = '賞金が足りない';
  R.g1Need = (race, year) => Math.round(R.G1_EARN[race.age === '2' ? '2' : race.age === '3' ? '3' : 'older'] * U.priceIndex(year) / 10) * 10;
  R.g1Why = function (horse, race, year) {
    if (horse.rights && horse.rights[race.name] === year) return null; // トライアルの優先出走権（その年のもの）
    const need = R.g1Need(race, year), earn = horse.earn || 0;
    return earn >= need ? null : `${R.G1_WHY}（あと${U.money(need - earn)}）`;
  };
  // 海外のレースの出走条件：ここだけ差し替えればよい
  // 豪州の2歳 G1 は出られない（持ち主の決定 2026-10-20「豪州の2歳 G1 には出られない」）・ほかの2歳の G1 は、自分の馬は一度海外の G1 を勝つ（G.abroadG1）といつでも出られる（持ち主の決定 2026-10-20「一度海外G1制覇すればいつでもでれるように」。AI の馬は無条件）・ほかの G1 は JRA の G1 と同じ獲得賞金・G2 と G3 は無条件
  // （外国で調教されている馬はここに来ない。R.ineligibleBase で先に通す）
  R.AU2_WHY = '豪州の2歳 G1 には出られない';
  R.ABROAD2_WHY = '海外の G1 を一度勝つと出られる';
  // 印（G.abroadG1。自分の馬が海外の G1 を勝つと world.js が立てる）か、いま持っている自分の馬の勝ち鞍で見る（前のセーブもそのまま効く。セーブの中身は変えない）
  R.abroadOk = () => { const W = HS.World, G = W && W.get && W.get(); if (!G) return false; if (G.abroadG1) return true; return Object.values(G.horses || {}).some(h => h.owner === 'P' && (h.gradedWins || []).some(w => w.grade === 'G1' && w.region === '海外')); };
  R.abroadWhy = function (horse, race, year) {
    if (race.grade !== 'G1') return null;
    if (race.age === '2') {
      if ((race.country || (HS.DATA.courses[race.course] || {}).country) === '豪') return R.AU2_WHY;
      return horse.owner === 'P' && !R.abroadOk() ? R.ABROAD2_WHY : null;
    }
    return R.g1Why(horse, race, year);
  };

  // 出走の優先順（大きいほど先）
  R.priority = function (horse, race, year, rng) {
    let p = 0;
    if (horse.rights && horse.rights[race.name] === year) p += 1e6; // トライアルの優先出走権
    p += (horse.gradedWins || []).filter(g => g.grade === 'G1').length * 1e5;
    p += (horse.earn || 0); // あとは獲得賞金の順（フルゲートを超えたら下から除外）
    p += rng.next() * 500;
    return p;
  };
})();
