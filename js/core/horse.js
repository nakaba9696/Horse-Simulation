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
  // 能力（成長とともに伸びる素質）。芝・ダート・道悪・健康は apt と health に、脚の切れは kire に分けて持つ
  // スピードとスタミナは芝（spd・sta）とダート（dspd・dsta）で別に持つ
  H.STATS = ['spd', 'sta', 'dspd', 'dsta', 'guts', 'mind', 'slope'];
  H.STAT_LABEL = { spd: '芝スピード', sta: '芝スタミナ', dspd: 'ダートスピード', dsta: 'ダートスタミナ', guts: '根性', mind: '気性', slope: '坂' };
  H.STAT_SHORT = { spd: '芝SP', sta: '芝ST', dspd: 'ダSP', dsta: 'ダST', guts: '根性', mind: '気性', slope: '坂' };
  H.STAT_NOTE = { spd: '芝での道中の速さ', sta: '芝で長く脚を保つ力', dspd: 'ダートでの道中の速さ', dsta: 'ダートで長く脚を保つ力', guts: '競り合いで抜かせない力', mind: '落ち着きと賢さ。出遅れ・掛かり・位置取り', slope: '坂での踏ん張り。弱いと坂で大きく脚がなくなる' };
  // 芝・ダートの向き（apt.turf・apt.dirt、100＝得意）から、苦手な側のスピード・スタミナを下げて分ける。pot の spd・sta は得意な側の値として受け取る
  H.splitSurface = function (h, rng) {
    const p = h.pot, a = h.apt;
    const top = Math.max(a.turf, a.dirt);
    const t = (a.turf - top) * 0.33, d = (a.dirt - top) * 0.33;
    const n = () => rng ? rng.normal(0, 1.5) : 0;
    p.dspd = U.clamp(p.spd + d + n(), 20, 120); p.dsta = U.clamp(p.sta + d + n(), 20, 120);
    p.spd = U.clamp(p.spd + t, 20, 120); p.sta = U.clamp(p.sta + t, 20, 120);
    return h;
  };
  // 能力から芝・ダートの向き（表示とAIの出走の目安）を出し直す
  H.syncApt = function (h) {
    const p = h.pot; if (p.dspd == null) return h;
    const T = (p.spd + p.sta) / 2, D = (p.dspd + p.dsta) / 2, top = Math.max(T, D);
    h.apt = h.apt || { heavy: 50 };
    h.apt.turf = U.clamp(Math.round(100 + (T - top) * 3), 20, 100);
    h.apt.dirt = U.clamp(Math.round(100 + (D - top) * 3), 20, 100);
    return h;
  };
  // その馬場でのスピード・スタミナ
  H.onSurface = (c, surface) => surface === 'ダ' ? { spd: c.dspd != null ? c.dspd : c.spd, sta: c.dsta != null ? c.dsta : c.sta } : { spd: c.spd, sta: c.sta };
  // 脚の切れ（1〜8）。小さいほどズブい（長く脚を使う）、大きいほど一瞬で突き抜ける
  H.kireLabel = k => '切れ' + U.clamp(Math.round(k || 4), 1, 8);
  // 特殊能力。bad＝弱み
  H.SKILLS = {
    big: { label: '大舞台', note: 'G1で力を出す' },
    fresh: { label: '鉄砲駆け', note: '長期休みでも気分が悪くならない（休み明けでも走る）' },
    tataki: { label: '叩き良化', note: '休み明けは割り引き。使われて良くなる' },
    left: { label: '左回り○', note: '左回りのコースで走る' },
    right: { label: '右回り○', note: '右回りのコースで走る' },
    small: { label: '小回り○', note: '直線の短いコースが得意' },
    long: { label: '直線巧者', note: '長い直線で伸びる' },
    summer: { label: '夏馬', note: '6〜8月に調子を上げる' },
    winter: { label: '冬馬', note: '12〜2月に調子を上げる' },
    hipace: { label: 'ハイペース○', note: '流れが速いほど良い' },
    slowpace: { label: 'スローペース○', note: '上がりの勝負に強い' },
    oonige: { label: '大逃げ', note: '後ろを大きく離して逃げる' },
    longspurt: { label: 'ロングスパート', note: '早めに動いて長く脚を使う' },
    jiyu: { label: '脚質自在', style: true, note: '脚質の一つとして見せる（特殊能力の並びには出さない）。流れを見て位置を変えられる。スローなら前、ハイなら後ろで運び、本来と違う位置でも折り合いを欠きにくい' },
    inner: { label: '内枠○', note: '内の枠で走る' },
    outer: { label: '外枠○', note: '外の枠（7・8枠）で走る' },
    mud: { label: '道悪○', note: '重・不良の馬場で力を出す' },
    travel: { label: '海外○', note: '海外の大レースで力を出す' },
    homebody: { label: '海外×', note: '海外では力を出しきれない', bad: true },
    deokure: { label: '出遅れ癖', note: 'ゲートの出が悪い', bad: true },
    kakari: { label: '掛かり癖', note: '折り合いを欠きやすい', bad: true },
    sora: { label: 'ソラ癖', note: '先頭に立つと気を抜く', bad: true },
    sunaB: { label: '砂かぶり×', note: 'ダートで前の馬の砂をかぶると嫌がり、脚を使う', bad: true },
    leftB: { label: '左回り×', note: '左回りのコースでは力を出しきれない', bad: true },
    rightB: { label: '右回り×', note: '右回りのコースでは力を出しきれない', bad: true },
  };
  H.SKILL_IDS = Object.keys(H.SKILLS);
  H.has = (h, id) => !!(h.skills && h.skills.includes(id));
  // 脚質の見せ方：脚質自在の馬は「先行・自在」のように出す（持ち主の決定 2026-10-17「脚質自在」「スキル削除」）
  H.styleText = h => h ? (h.style || '') + (H.has(h, 'jiyu') ? '・自在' : '') : '';
  // 特殊能力の並びに出すもの（脚質自在は脚質の側で見せる）
  H.shownSkills = h => (h.skills || []).filter(x => H.SKILLS[x] && !H.SKILLS[x].style);

  // 前の版の能力（瞬発力・パワー・賢さ・気性）を今の形に直す。pot・bonus・temper を持つものに使う
  H.fromLegacy = function (h) {
    const p = h.pot;
    if (p && (p.kick != null || p.pow != null || p.wise != null)) {
      if (h.kire == null && p.kick != null) h.kire = U.clamp(Math.round(4.5 + (p.kick - (p.spd || p.kick)) / 3), 1, 8);
      if (p.mind == null) p.mind = ((p.wise != null ? p.wise : 70) + (h.temper != null ? h.temper : 60)) / 2;
      if (p.slope == null) p.slope = p.pow != null ? p.pow : (p.spd || 70);
      delete p.kick; delete p.pow; delete p.wise;
    }
    const b = h.bonus;
    if (b && (b.kick != null || b.pow != null || b.wise != null)) {
      if (b.wise != null) b.mind = (b.mind || 0) + b.wise;
      if (b.pow != null) b.slope = (b.slope || 0) + b.pow;
      delete b.kick; delete b.pow; delete b.wise;
    }
    delete h.temper;
    // 一時期の版（根性などを SS〜E の段階で h.gr に持っていた）のセーブ
    if (h.gr) {
      const GV = { SS: 97, S: 92, 'A+': 87, A: 82, 'B+': 77, B: 72, 'C+': 67, C: 62, D: 57, E: 50 };
      for (const k of ['guts', 'mind', 'slope']) if (p && p[k] == null && GV[h.gr[k]]) p[k] = GV[h.gr[k]];
      if (h.health == null && GV[h.gr.health]) h.health = GV[h.gr.health];
      if (h.apt && h.apt.heavy == null && GV[h.gr.heavy]) h.apt.heavy = GV[h.gr.heavy];
      delete h.gr;
    }
    // 芝・ダートを分ける前の能力
    if (p && p.dspd == null && h.apt && h.apt.turf != null) H.splitSurface(h);
    return h;
  };

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
    const g = horse.filler || horse.legend ? 1 : H.growthFactor(horse, wIdx); // 頭数合わせの馬は、いまの値をそのまま持つ。スペシャルホースはいちばん良いとき
    const out = {};
    for (const k of H.STATS) out[k] = horse.pot[k] * g + ((horse.bonus && horse.bonus[k]) || 0);
    return out;
  };
  // 総合力（表示や人気の目安）
  H.overall = function (stats) {
    const turf = stats.spd * 0.35 + stats.sta * 0.25;
    const dirt = stats.dspd != null ? stats.dspd * 0.35 + stats.dsta * 0.25 : turf;
    return Math.max(turf, dirt) + stats.guts * 0.15 + stats.mind * 0.12 + stats.slope * 0.13;
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
    if (year < 1984) return ({ maiden: '未勝利', C1: '下級条件', C2: '中級条件', C3: '上級条件', OP: 'オープン' })[cls] || cls;
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
    else if (min >= 3000) kind = '超長距離';
    else if (min >= 2400) kind = '長距離';
    else if (max >= 3000) kind = '中長距離';
    return `${kind}（${min}〜${max}m）`;
  };

  H.LEGEND_MUL = 1.035;
  // 史実馬のデータから、能力の素質を作る（名前ごとに毎回同じ）
  H.fromHistoric = function (d, id) {
    const rng = U.hashRng('hist:' + d.name);
    const r = d.rating;
    const dirt = d.surface === 'ダ', both = d.surface === '芝ダ';
    const longH = d.distMax >= 2400, sprint = d.distMax <= 1400;
    const st = H.STYLES.includes(d.style) ? d.style : '先行';
    const pot = {
      spd: r + rng.normal(0, 2) + (sprint ? 3 : 0) + (st === '逃げ' ? 1 : 0),
      sta: r + rng.normal(0, 2) + (longH ? 3 : 0) - (sprint ? 6 : 0),
      guts: r - 1 + rng.normal(0, 5),
      mind: r - 6 + rng.normal(0, 7),
      slope: r - 5 + rng.normal(0, 5) + (dirt ? 3 : 0),
    };
    for (const k of Object.keys(pot)) pot[k] = U.clamp(pot[k], 30, 106);
    // 伝説級（data/legends.js の tier:'legend'。キンチェム・セントサイモンなど）は、史実馬のいちばん上よりもうひとつ強い
    if (d.tier === 'legend') for (const k of Object.keys(pot)) pot[k] = U.clamp(pot[k] * H.LEGEND_MUL, 30, 112);
    // エディットで能力を個別に決めた馬（前の版の形でも読む）
    let custom = null;
    if (d.pot) {
      custom = H.fromLegacy({ pot: Object.assign({}, d.pot), temper: d.temper }).pot;
      for (const k of H.STATS) if (custom[k] != null) pot[k] = U.clamp(custom[k], 20, 120);
    } else if (d.temper != null) pot.mind = (pot.mind + d.temper) / 2;
    const growth = H.GROWTHS.includes(d.growth) ? d.growth : '普通';
    const kire0 = ({ '逃げ': 3, '先行': 4, '差し': 6, '追込': 6 })[st] + rng.int(-1, 1) - (dirt ? 1 : 0) + (sprint ? 0 : longH && st !== '追込' ? -1 : 0);
    const h = {
      id, name: d.name, sex: d.sex === 'セ' ? '牡' : d.sex, gelding: d.sex === 'セ', born: d.born,
      coat: H.COATS.includes(d.coat) ? d.coat : H.pickCoat(rng),
      sire: d.sire || null, dam: d.dam || null, damsire: d.damsire || null,
      hist: true, owner: 'AI', loc: 'farm',
      pot,
      apt: { turf: dirt ? 45 : both ? 85 : 100, dirt: dirt ? 100 : both ? 90 : 40 + rng.int(0, 15), heavy: U.clamp(66 + rng.normal(0, 12), 20, 100) },
      distMin: d.distMin || 1600, distMax: d.distMax || 2400,
      style: st, kire: U.clamp(d.kire != null ? d.kire : kire0, 1, 8),
      growth, peakShift: 0,
      health: d.health != null ? d.health : U.clamp(75 + rng.normal(0, 9), 30, 100),
      skills: Array.isArray(d.skills) ? d.skills.filter(x => H.SKILLS[x]) : H.histSkills(d, rng),
      bonus: {}, cond: 0, fatigue: 0,
      wins: 0, starts: 0, w2: 0, w3: 0, earn: 0, prize: 0, gradedWins: [], results: [],
      restUntil: 0, retireYear: d.retire || (d.born + 5),
    };
    // エディットで芝・ダート・道悪を決めた馬
    for (const k of ['turf', 'dirt', 'heavy']) if (d[k] != null) h.apt[k] = d[k];
    // 芝とダートの能力を分ける（個別に決めた能力に芝・ダートの両方があれば、そのまま使う）
    if (custom && custom.dspd != null && custom.dsta != null) H.syncApt(h);
    else H.splitSurface(h, rng);
    // 出遅れ癖・掛かり癖のある馬は気性が荒い（気性を個別に決めた馬は除く）
    if (!(custom && custom.mind != null) && (h.skills.includes('kakari') || h.skills.includes('deokure'))) pot.mind = U.clamp(pot.mind - 14, 20, 120);
    if (!Array.isArray(d.skills)) H.histSkills2(d, h);
    return h;
  };

  // 史実馬の特殊能力を、史実の勝ち鞍（競馬場・時期・格）から見立てる。名馬の手書きの表（data/famous_*.js）があればそちらが正
  let RACE_BY_NAME = null;
  H.winRaces = function (d) {
    if (!RACE_BY_NAME) {
      RACE_BY_NAME = new Map();
      for (const r of HS.DATA.races || []) { if (!RACE_BY_NAME.has(r.name)) RACE_BY_NAME.set(r.name, []); RACE_BY_NAME.get(r.name).push(r); }
    }
    const out = [];
    for (const w of d.wins || []) {
      const y = +w.slice(0, 4), n = w.slice(4);
      const r = (RACE_BY_NAME.get(n) || []).find(x => x.from <= y && y <= (x.to || 9999));
      if (r) out.push(r);
    }
    return out;
  };
  H.histSkills = function (d, rng) {
    const ws = H.winRaces(d);
    const C = HS.DATA.courses || {};
    const sk = [];
    const n = ws.length;
    const cnt = f => ws.filter(f).length;
    const geo = r => { const c = C[r.course]; return c ? (r.surface === 'ダ' ? c.dirt || c.turf : c.turf || c.dirt) : null; };
    const g1 = cnt(r => r.grade === 'G1');
    if (g1 >= 3 || (g1 >= 2 && d.rating >= 95)) sk.push('big');
    if (n >= 3) {
      const left = cnt(r => (C[r.course] || {}).dir === '左'), right = cnt(r => (C[r.course] || {}).dir === '右');
      if (left >= 3 && right === 0) sk.push('left');
      else if (right >= 3 && left === 0) sk.push('right');
      // 片方の回りでばかり勝った馬（4勝以上）は、反対の回りが苦手
      if (left >= 4 && right === 0) sk.push('rightB');
      else if (right >= 4 && left === 0) sk.push('leftB');
      // 短い距離と長い距離（800m 以上の開き）の両方で勝った馬は、流れに合わせて位置を変えられる
      const ds = ws.map(r => r.dist);
      if (Math.max(...ds) - Math.min(...ds) >= 800) sk.push('jiyu');
      const short = cnt(r => (geo(r) || {}).straight < 330), longS = cnt(r => (geo(r) || {}).straight >= 450);
      if (short >= 2 && short / n >= 0.6) sk.push('small');
      else if (longS >= 3 && longS / n >= 0.7) sk.push('long');
    }
    if (n >= 2) {
      const sum = cnt(r => r.month >= 6 && r.month <= 8), win = cnt(r => r.month === 12 || r.month <= 2);
      if (sum >= 2 && sum / n >= 0.5) sk.push('summer');
      else if (win >= 2 && win / n >= 0.5) sk.push('winter');
    }
    if (HS.DATA.isForeign && !HS.DATA.isForeign(d) && cnt(r => r.region === '海外') >= 1) sk.push('travel');
    // 勝ち鞍から見えない癖は、名前ごとに決まった運で少しだけ
    if (sk.length < 2 && rng.chance(0.25)) {
      const pool = d.style === '逃げ' ? ['hipace'] : d.style === '先行' ? ['fresh', 'tataki'] : ['longspurt', 'slowpace', 'hipace', 'tataki', 'fresh'];
      const x = rng.pick(pool); if (!sk.includes(x)) sk.push(x);
    }
    if (rng.chance(0.06)) sk.push(rng.pick(['deokure', 'kakari', 'sora']));
    // ダートで前に行く馬は、砂をかぶるのを嫌って前に行っている見立て（運で）
    if ((d.style === '逃げ' || d.style === '先行') && cnt(r => r.surface === 'ダ') >= 1 && rng.chance(0.2)) sk.push('sunaB');
    return sk;
  };

  // あとから足した特性（2026-10-17）。前の見立ての運（hist:名前）の並びを変えないよう、別の運（hist2:名前）を使う
  H.MUD_HEAVY = 86; H.OUTER_P = 0.06;
  H.histSkills2 = function (d, h) {
    const rng = U.hashRng('hist2:' + d.name);
    if ((h.apt.heavy || 0) >= H.MUD_HEAVY) h.skills.push('mud'); // 道悪○：道悪の適性がとくに高い馬
    if (rng.chance(H.OUTER_P)) h.skills.push('outer'); // 外枠○：勝ち鞍からは見えない癖なので、運で少しだけ
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
      style: rng.weighted(H.STYLES, s => ({ '逃げ': 1, '先行': 3, '差し': 3, '追込': 1.5 })[s]), kire: rng.int(2, 7), skills: [],
      growth, peakShift: 0, health: 60 + rng.int(0, 30),
      bonus: {}, cond: rng.normal(0, 30), fatigue: 0,
      wins: 0, starts: 0, w2: 0, w3: 0, earn: 0, prize: 0, gradedWins: [], results: [],
    };
    return H.splitSurface(h, rng);
  };

  // 調教のメニュー。gain＝伸びる能力、fat＝きつさ（調子への効き方。負は休ませる＝疲労が余分に抜ける）、cond＝調子への効き、time＝時計の目安
  // 疲労はレースでだけたまる（js/core/fatigue.js）。故障は無い（持ち主の仕様書「故障はなしにする」）
  H.MENUS = {
    '坂路(強め)': { gain: { spd: 0.3, dspd: 0.3, slope: 0.35 }, fat: 16, cond: 14, course: '坂路' },
    '坂路(馬なり)': { gain: { spd: 0.12, dspd: 0.12, slope: 0.15 }, fat: 8, cond: 8, course: '坂路' },
    'ウッド(強め)': { gain: { sta: 0.35, spd: 0.2 }, fat: 15, cond: 14, course: 'ウッド' },
    'ウッド(馬なり)': { gain: { sta: 0.15, spd: 0.1 }, fat: 7, cond: 8, course: 'ウッド' },
    '併せ馬': { gain: { guts: 0.4, spd: 0.1, dspd: 0.1 }, fat: 17, cond: 16, course: 'ウッド' },
    'ダート': { gain: { dspd: 0.3, dsta: 0.3, slope: 0.15 }, fat: 10, cond: 8, course: 'ダート' },
    'プール': { gain: { sta: 0.15, dsta: 0.15 }, fat: 2, cond: 4, course: 'プール' },
    'ゲート練習': { gain: { mind: 0.4 }, fat: 3, cond: 2, course: 'ゲート' },
    '軽め': { gain: {}, fat: -6, cond: 3, course: '軽め' },
    '休養': { gain: {}, fat: -18, cond: -4, course: '休養' },
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
    // 調子（疲労が残っていると上がりにくい）。休ませるメニューは疲労が余分に抜ける
    const fatBefore = horse.fatigue || 0;
    const ease = m.fat * (0.8 + rng.next() * 0.4);
    if (ease < 0 && fatBefore > 0) horse.fatigue = Math.max(0, fatBefore + ease * H.REST_K);
    let dc = m.cond * (1 - fatBefore / 120) - fatBefore * 0.25 + rng.normal(0, 8);
    if (m.fat < 0) dc += 6;
    horse.cond = U.clamp((horse.cond || 0) * 0.85 + dc, -100, 100);
    horse.trainWeeks = (horse.trainWeeks || 0) + 1;
    // 調教タイム（強めのときだけ速い時計）
    let time = null;
    const c = H.cur(horse, wIdx);
    const sp = m.course === 'ダート' ? c.dspd : Math.max(c.spd, c.dspd);
    const ability = (sp * 2 + c.slope) / 3 + ((horse.kire || 4) - 4.5) * 0.8 + horse.cond * 0.04 - (horse.fatigue || 0) * 0.03;
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
    return { menu: menuName, time };
  };

  H.REST_K = 0.5; // 休ませるメニュー（fat が負）で、疲労が余分に抜ける割合

  // 牧場にいる週：疲労が多めに抜け（js/core/fatigue.js の F.REC.farm 倍）、調子がならされる
  H.rest = function (horse, rng) {
    HS.Fatigue.weekly(horse, HS.Fatigue.REC.farm);
    horse.cond = U.clamp((horse.cond || 0) * 0.6 + rng.normal(0, 10), -60, 40);
  };

  // 調教師のコメント（調子・疲れ・能力から）
  H.comment = function (horse, wIdx) {
    const st = HS.Fatigue.stage(horse), c = horse.cond || 0;
    if (st >= 3) return '疲れが目立ちます。ここは無理をさせたくありません。';
    if (st >= 2) return '少し疲れが残っています。軽めにしておきたいところです。';
    if (c >= 60) return '動きは抜群。いつでも走れる状態です。';
    if (c >= 20) return '順調です。追い切りの反応も上々。';
    if (c > -20) return '可もなく不可もなく、といったところです。';
    if (c > -60) return 'どうも覇気がありません。調整を工夫します。';
    return '状態はかなり悪いです。立て直しに時間が要ります。';
  };
})();
