// 馬のデータの形と、成長・能力・状態の計算
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U;
  const H = HS.Horse = {};

  H.COATS = ['鹿毛', '黒鹿毛', '青鹿毛', '青毛', '栗毛', '栃栗毛', '芦毛', '白毛'];
  // 毛色を決める（両親が芦毛なら芦毛が出やすい）
  H.pickCoat = function (rng, sireCoat, damCoat) {
    if ((sireCoat === '芦毛' || damCoat === '芦毛') && rng.chance(0.5)) return '芦毛';
    if ((sireCoat === '白毛' || damCoat === '白毛') && rng.chance(0.4)) return '白毛';
    return rng.weighted(['鹿毛', '黒鹿毛', '青鹿毛', '青毛', '栗毛', '栃栗毛'], c => ({ '鹿毛': 40, '黒鹿毛': 20, '青鹿毛': 7, '青毛': 2, '栗毛': 26, '栃栗毛': 4 })[c]);
  };
  H.STATS = ['spd', 'sta', 'kick', 'pow', 'guts', 'wise'];
  H.STAT_LABEL = { spd: 'スピード', sta: 'スタミナ', kick: '瞬発力', pow: 'パワー', guts: '根性', wise: '賢さ' };
  H.STYLES = ['逃げ', '先行', '差し', '追込'];
  H.GROWTHS = ['早熟', '早め', '普通', '遅め', '晩成'];
  // 成長型ごとの [ピークの始まり, ピークの終わり]（満年齢、4月生まれを0として）
  H.PEAK = { '早熟': [2.6, 3.6], '早め': [3.0, 4.2], '普通': [3.5, 5.0], '遅め': [4.0, 5.8], '晩成': [4.6, 6.8] };

  // 週の通し番号（年×48＋月・週）。1か月4週。
  H.weekIndex = (year, month, week) => year * 48 + (month - 1) * 4 + (week - 1);
  // 満年齢を小数で（4月生まれとみなす）
  H.ageAt = (horse, wIdx) => (wIdx - (horse.born * 48 + 12)) / 48;

  // 成長の度合い（0〜1）。ピーク前は伸び、ピーク後はゆっくり衰える
  H.growthFactor = function (horse, wIdx) {
    const age = H.ageAt(horse, wIdx);
    const p = H.PEAK[horse.growth] || H.PEAK['普通'];
    const ps = p[0] + (horse.peakShift || 0), pe = p[1] + (horse.peakShift || 0);
    if (age < ps) {
      const t = (age - 1.4) / (ps - 1.4);
      return 0.62 + 0.38 * U.smooth(t);
    }
    if (age <= pe) return 1;
    const d = age - pe;
    return Math.max(0.55, 1 - 0.04 * d - 0.02 * d * d);
  };

  // いまの能力値（成長×素質＋調教の上積み）
  H.cur = function (horse, wIdx) {
    const g = horse.filler ? 1 : H.growthFactor(horse, wIdx); // 頭数合わせの馬は、いまの値をそのまま持つ
    const out = {};
    for (const k of H.STATS) out[k] = horse.pot[k] * g + ((horse.bonus && horse.bonus[k]) || 0);
    return out;
  };
  // 総合力（表示や人気の目安）
  H.overall = function (stats) {
    return stats.spd * 0.3 + stats.kick * 0.2 + stats.sta * 0.15 + stats.pow * 0.12 + stats.guts * 0.13 + stats.wise * 0.1;
  };

  // 見立て（プレイヤーに見える値）。走るほど・調教するほど正確になる
  H.estimate = function (horse, wIdx, key) {
    const real = H.cur(horse, wIdx)[key];
    if (horse.owner !== 'P' && !horse.hist) return null;
    const rng = U.hashRng(horse.id + ':' + key);
    const bias = rng.normal(0, 7);
    const unc = Math.max(0.12, 1 - (horse.starts || 0) * 0.12 - (horse.trainWeeks || 0) * 0.008);
    return real + bias * unc;
  };

  // クラス（勝ち数で決める簡略版）
  H.classOf = function (horse) {
    if ((horse.gradedWins || []).length > 0) return 'OP';
    const w = horse.wins || 0;
    if (w === 0) return 'maiden';
    if (w === 1) return 'C1';
    if (w === 2) return 'C2';
    if (w === 3) return 'C3';
    return 'OP';
  };
  H.className = function (cls, year) {
    const old = year < 2019;
    return ({ maiden: '未勝利', C1: old ? '500万下' : '1勝クラス', C2: old ? '1000万下' : '2勝クラス', C3: old ? '1600万下' : '3勝クラス', OP: 'オープン' })[cls] || cls;
  };
  H.CLASS_RANK = { maiden: 0, C1: 1, C2: 2, C3: 3, OP: 4 };

  // 調子（-100〜100）を表示に
  H.condLabel = function (c) {
    if (c >= 60) return { text: '絶好調', icon: '⤴⤴', cls: 'c5' };
    if (c >= 20) return { text: '好調', icon: '⤴', cls: 'c4' };
    if (c > -20) return { text: '普通', icon: '→', cls: 'c3' };
    if (c > -60) return { text: '不調', icon: '⤵', cls: 'c2' };
    return { text: '絶不調', icon: '⤵⤵', cls: 'c1' };
  };

  // 距離適性の幅を表示に
  H.distLabel = function (min, max) {
    const mid = (min + max) / 2;
    let kind = '中距離';
    if (max <= 1400) kind = '短距離';
    else if (mid <= 1700) kind = 'マイル';
    else if (min >= 2400) kind = '長距離';
    else if (max >= 3000) kind = '中長距離';
    return `${kind}（${min}〜${max}m）`;
  };

  // 史実馬のデータから、能力の素質を作る（名前ごとに毎回同じ）
  H.fromHistoric = function (d, id) {
    const rng = U.hashRng('hist:' + d.name);
    const r = d.rating;
    const dirt = d.surface === 'ダ', both = d.surface === '芝ダ';
    const longH = d.distMax >= 2400, sprint = d.distMax <= 1400;
    const st = d.style;
    const pot = {
      spd: r + rng.normal(0, 2) + (sprint ? 3 : 0) + (st === '逃げ' ? 2 : 0),
      sta: r + rng.normal(0, 2) + (longH ? 3 : 0) - (sprint ? 6 : 0),
      kick: r + rng.normal(0, 2) + (st === '差し' || st === '追込' ? 3 : -2),
      pow: r + rng.normal(0, 2) + (dirt ? 4 : both ? 2 : -2),
      guts: r + rng.normal(0, 3),
      wise: r - 3 + rng.normal(0, 3),
    };
    for (const k of H.STATS) pot[k] = U.clamp(pot[k], 30, 106);
    // エディットで能力を個別に決めた馬
    if (d.pot) for (const k of H.STATS) if (d.pot[k] != null) pot[k] = U.clamp(d.pot[k], 20, 120);
    const growth = H.GROWTHS.includes(d.growth) ? d.growth : '普通';
    const h = {
      id, name: d.name, sex: d.sex === 'セ' ? '牡' : d.sex, gelding: d.sex === 'セ', born: d.born,
      coat: H.COATS.includes(d.coat) ? d.coat : H.pickCoat(rng),
      sire: d.sire || null, dam: d.dam || null, damsire: d.damsire || null,
      hist: true, owner: 'AI', loc: 'farm',
      pot,
      apt: { turf: dirt ? 45 : both ? 85 : 100, dirt: dirt ? 100 : both ? 90 : 40 + rng.int(0, 15), heavy: 40 + rng.int(0, 50) },
      distMin: d.distMin || 1600, distMax: d.distMax || 2400,
      style: H.STYLES.includes(st) ? st : '先行',
      growth, peakShift: 0,
      temper: 50 + rng.int(-20, 30), health: 70 + rng.int(0, 25),
      bonus: {}, cond: 0, fatigue: 0, injury: null,
      wins: 0, starts: 0, w2: 0, w3: 0, earn: 0, prize: 0, gradedWins: [], results: [],
      restUntil: 0, retireYear: d.retire || (d.born + 5),
    };
    // エディットで気性・体質を決めた馬
    if (d.temper != null) h.temper = d.temper;
    if (d.health != null) h.health = d.health;
    return h;
  };

  // 架空の馬（モブ・生産馬）の素質を、総合の目安 mean から作る
  H.makeStats = function (rng, mean, sd) {
    const pot = {};
    for (const k of H.STATS) pot[k] = U.clamp(mean + rng.normal(0, sd), 20, 106);
    return pot;
  };

  // 名前を作る（重ならないように used を見る）
  H.makeName = function (rng, used, foreign) {
    const P = HS.DATA.nameParts;
    for (let i = 0; i < 40; i++) {
      let n;
      if (foreign) n = rng.pick(P.foreignHead) + rng.pick(P.foreignTail);
      else {
        const r = rng.next();
        if (r < 0.12) n = rng.pick(P.single);
        else n = rng.pick(P.head) + rng.pick(P.tail);
      }
      if (n.length <= 9 && !(used && used.has(n))) { if (used) used.add(n); return n; }
    }
    return '名無しの' + rng.int(1000, 9999);
  };

  // その場限りの出走馬（条件戦・重賞の頭数合わせ）。level＝いまの総合の目安
  H.makeFiller = function (rng, opts) {
    const { level, surface, dist, born, sex, foreign, sireName } = opts;
    const pot = H.makeStats(rng, level, 4.5);
    const growth = '普通';
    const h = {
      id: 'f' + rng.int(1, 1e9), name: opts.name || '', sex: sex || (rng.chance(0.75) ? '牡' : '牝'), born, coat: H.pickCoat(rng),
      sire: sireName || null, dam: null, hist: false, owner: 'AI', filler: true, foreign: !!foreign,
      pot, apt: { turf: surface === '芝' ? 95 + rng.int(0, 5) : 50, dirt: surface === 'ダ' ? 95 + rng.int(0, 5) : 50, heavy: 30 + rng.int(0, 60) },
      distMin: Math.max(1000, dist - 400 + rng.int(0, 2) * 100), distMax: dist + 200 + rng.int(0, 4) * 100,
      style: rng.weighted(H.STYLES, s => ({ '逃げ': 1, '先行': 3, '差し': 3, '追込': 1.5 })[s]),
      growth, peakShift: 0, temper: 30 + rng.int(0, 60), health: 60 + rng.int(0, 30),
      bonus: {}, cond: rng.normal(0, 30), fatigue: 0, injury: null,
      wins: 0, starts: 0, w2: 0, w3: 0, earn: 0, prize: 0, gradedWins: [], results: [],
    };
    return h;
  };

  // 調教のメニュー。gain＝伸びる能力、fat＝疲れ、cond＝調子への効き、risk＝故障の危険、time＝時計の目安
  H.MENUS = {
    '坂路(強め)': { gain: { spd: 0.35, pow: 0.35 }, fat: 16, cond: 14, risk: 1.4, course: '坂路' },
    '坂路(馬なり)': { gain: { spd: 0.15, pow: 0.15 }, fat: 8, cond: 8, risk: 0.6, course: '坂路' },
    'ウッド(強め)': { gain: { sta: 0.35, kick: 0.3 }, fat: 15, cond: 14, risk: 1.3, course: 'ウッド' },
    'ウッド(馬なり)': { gain: { sta: 0.15, kick: 0.15 }, fat: 7, cond: 8, risk: 0.5, course: 'ウッド' },
    '併せ馬': { gain: { guts: 0.4, kick: 0.2 }, fat: 17, cond: 16, risk: 1.4, course: 'ウッド' },
    'ダート': { gain: { pow: 0.3, sta: 0.15 }, fat: 10, cond: 8, risk: 0.8, course: 'ダート' },
    'プール': { gain: { sta: 0.25 }, fat: 2, cond: 4, risk: 0.1, course: 'プール' },
    'ゲート練習': { gain: { wise: 0.4 }, fat: 3, cond: 2, risk: 0.1, course: 'ゲート' },
    '軽め': { gain: {}, fat: -6, cond: 3, risk: 0.2, course: '軽め' },
    '休養': { gain: {}, fat: -18, cond: -4, risk: 0, course: '休養' },
  };
  H.MENU_LIST = Object.keys(H.MENUS);
  H.BONUS_CAP = 8; // 調教で上積みできる上限（各能力）

  // 1週間の調教。戻り値は調教タイムなどの記録
  H.train = function (horse, menuName, rng, wIdx) {
    const m = H.MENUS[menuName] || H.MENUS['軽め'];
    horse.bonus = horse.bonus || {};
    const g = H.growthFactor(horse, wIdx);
    const growthRoom = g < 1 ? 1.2 : 0.7; // 成長期は伸びやすい
    for (const [k, v] of Object.entries(m.gain)) {
      const cur = horse.bonus[k] || 0;
      const room = Math.max(0, H.BONUS_CAP - cur) / H.BONUS_CAP;
      horse.bonus[k] = cur + v * growthRoom * room * (0.6 + rng.next() * 0.8);
    }
    // 疲れと調子
    const fatBefore = horse.fatigue || 0;
    horse.fatigue = U.clamp(fatBefore + m.fat * (0.8 + rng.next() * 0.4) - 6, 0, 100);
    let dc = m.cond * (1 - fatBefore / 120) - fatBefore * 0.25 + rng.normal(0, 8);
    if (m.fat < 0) dc += 6;
    horse.cond = U.clamp((horse.cond || 0) * 0.85 + dc, -100, 100);
    horse.trainWeeks = (horse.trainWeeks || 0) + 1;
    // 故障（体質・疲れ・強さ）
    let injury = null;
    const riskP = m.risk * 0.004 * (1 + fatBefore / 40) * (1.4 - (horse.health || 70) / 100);
    if (rng.chance(riskP)) injury = H.injure(horse, rng);
    // 調教タイム（強めのときだけ速い時計）
    let time = null;
    const c = H.cur(horse, wIdx);
    const ability = (c.spd + c.pow + c.kick) / 3 + horse.cond * 0.04 - horse.fatigue * 0.03;
    if (m.course === '坂路') {
      const hard = menuName.includes('強め');
      const t4 = 58.5 - ability * 0.075 - (hard ? 1.6 : 0) + rng.normal(0, 0.4);
      const last = 13.9 - ability * 0.019 - (hard ? 0.4 : 0) + rng.normal(0, 0.12);
      time = `坂路 4F ${t4.toFixed(1)}-${last.toFixed(1)}`;
    } else if (m.course === 'ウッド') {
      const hard = menuName.includes('強め') || menuName === '併せ馬';
      const t6 = 89.5 - ability * 0.11 - (hard ? 2.4 : 0) + rng.normal(0, 0.6);
      const last = 13.7 - ability * 0.02 - (hard ? 0.5 : 0) + rng.normal(0, 0.12);
      time = `ウッド 6F ${t6.toFixed(1)}-${last.toFixed(1)}`;
    } else if (m.course === 'ダート') {
      const t5 = 72 - ability * 0.08 + rng.normal(0, 0.5);
      time = `ダート 5F ${t5.toFixed(1)}`;
    }
    return { menu: menuName, time, injury };
  };

  H.INJURIES = [
    { name: '軽い捻挫', weeks: [3, 6], p: 5 }, { name: 'ソエ', weeks: [4, 8], p: 4 }, { name: '球節炎', weeks: [8, 16], p: 3 },
    { name: '骨瘤', weeks: [6, 12], p: 2 }, { name: '屈腱炎', weeks: [36, 60], p: 1, severe: true }, { name: '骨折', weeks: [20, 40], p: 1, severe: true },
  ];
  H.injure = function (horse, rng) {
    const inj = rng.weighted(H.INJURIES, i => i.p);
    horse.injury = { name: inj.name, weeks: rng.int(inj.weeks[0], inj.weeks[1]), severe: !!inj.severe };
    horse.cond = Math.min(horse.cond, -30);
    return horse.injury;
  };

  // 放牧中・牧場にいる週の回復
  H.rest = function (horse, rng) {
    horse.fatigue = Math.max(0, (horse.fatigue || 0) - 22);
    horse.cond = U.clamp((horse.cond || 0) * 0.6 + rng.normal(0, 10), -60, 40);
    if (horse.injury) { horse.injury.weeks -= 1; if (horse.injury.weeks <= 0) horse.injury = null; }
  };

  // 調教師のコメント（調子・疲れ・能力から）
  H.comment = function (horse, wIdx) {
    if (horse.injury) return `${horse.injury.name}で休養中です。焦らず治しましょう。`;
    const f = horse.fatigue || 0, c = horse.cond || 0;
    if (f >= 70) return '疲れが目立ちます。ここは無理をさせたくありません。';
    if (f >= 45) return '少し疲れが残っています。軽めにしておきたいところです。';
    if (c >= 60) return '動きは抜群。いつでも走れる状態です。';
    if (c >= 20) return '順調です。追い切りの反応も上々。';
    if (c > -20) return '可もなく不可もなく、といったところです。';
    if (c > -60) return 'どうも覇気がありません。調整を工夫します。';
    return '状態はかなり悪いです。立て直しに時間が要ります。';
  };
})();
