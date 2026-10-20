// 疲労（持ち主の仕様書 docs/SPEC.md「疲労」2026-10-19。数の表は docs/BALANCE.md の「疲労」）
//   ・疲労（h.fatigue 0〜100）はレースでたまり、毎週、健康の値に応じて抜ける。故障は無い（「故障はなしにする」）
//   ・レースでたまる量＝レースの格（すごい G1 ほど大）×距離×激戦の度合い（着差の小ささ・残った脚の少なさ）。脚を余らせて勝つと少ない
//   ・段階（5つ）に応じて、レースで強さが下がる（下げの数と強い馬ほど小さくなる決まりは js/core/racesim.js の S.FATIGUE）
//   ・国が変わるレースに出ると、移動の疲れが少したまる（同じ国に居続ければたまらない）。前のレースから1週しか空いていないときは、別の国のレースに出られない
//   ・グランドフェスティバル（招待のレース）は特別枠：疲労も移動もない
// Godot 版は godot/core/hs_fatigue.gd（同じ式・同じ順）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse;
  const F = HS.Fatigue = {};

  // 段階（境目は S.FATIGUE.at）。調子の8段階（js/core/season.js）の「疲れ」「疲れが濃い」「使いすぎ」と同じ名前・色
  F.STAGES = [
    { label: '万全', color: '#3fb56a' },
    { label: '軽い疲れ', color: '#c9b23a' },
    { label: '疲れ', color: '#e8892e' },
    { label: '疲れが濃い', color: '#8a5a32' },
    { label: '使いすぎ', color: '#8c8c8c' },
  ];
  // レースでたまる量：(base + 距離100mごとに per100) × 格 × 激戦の度合い
  F.GAIN = { base: 8, per100: 0.7 };
  F.GRADE = { G1: 1.2, G2: 1.05, G3: 0.95, OP: 0.85, other: 0.8, top: 1.5 };
  // すごい G1（格の上にさらに重い）。暦の名前（data/races*.js の name）
  F.TOP_G1 = ['東京優駿', 'ジャパンカップ', '有馬記念', '天皇賞（春）', '天皇賞（秋）', '宝塚記念', '菊花賞',
    '凱旋門賞', 'キングジョージ6世＆クイーンエリザベスステークス', 'ドバイワールドカップ', 'ドバイシーマクラシック', 'サウジカップ',
    'ブリーダーズカップクラシック', 'ブリーダーズカップターフ', '英ダービー', 'ケンタッキーダービー', 'メルボルンカップ', 'コックスプレート',
    '香港カップ', '愛チャンピオンステークス', 'インターナショナルステークス'];
  // 激戦の度合い（0.6〜1.4）＝ lo ＋ close×（着差の近さ）＋ spent×（脚の使い切り）
  //   着差の近さ：勝ち馬は2着との差（winLen 馬身で0）、ほかは勝ち馬からの差（loseLen 馬身で0）。脚の使い切り：残りのスタミナが full で0
  F.SEV = { lo: 0.6, close: 0.4, spent: 0.4, winLen: 3, loseLen: 4, full: 0.25 };
  // 毎週の回復＝ base ＋（健康−50）× k（下限 min）。牧場では farm 倍
  F.REC = { base: 5, k: 0.2, min: 2, farm: 2 };
  // 移動の疲れ（国が変わるとき）。同じ地域の中（英→仏など）は near、地域をまたぐ（日本→欧州など）は far
  F.TRAVEL = { near: 4, far: 8 };
  // 前のレースから gap 週より短い間隔では、別の国のレースに出られない（中1週＝2週あける）
  F.MIN_GAP = 2;
  F.WHY = '移動が間に合わない';

  // ---------- 段階 ----------
  F.stageOf = fat => HS.Sim.fatigueStage(fat || 0);
  F.stage = (h, extra) => F.stageOf((h.fatigue || 0) + (extra || 0));
  F.view = (h, extra) => { const i = F.stage(h, extra); return Object.assign({ i, value: Math.round((h.fatigue || 0) + (extra || 0)) }, F.STAGES[i]); };

  // ---------- 国 ----------
  F.countryOf = function (race) {
    if (race.region !== '海外') return '日';
    return race.country || (HS.DATA.courses[race.course] || {}).country || '外';
  };
  // 予約の鍵（年-月-週-レース名、条件戦は年-月-週-c…、新馬戦は debut:…）から国
  let byName = null;
  F.countryOfKey = function (key) {
    const m = /^(\d+)-(\d+)-(\d+)-(.*)$/.exec(key || '');
    if (!m || /^c\d+-\d+$/.test(m[4])) return '日';
    if (!byName) { byName = {}; for (const r of HS.DATA.races) if (!(r.name in byName)) byName[r.name] = F.countryOf(r); }
    return byName[m[4]] || '日';
  };
  F.home = h => h.foreignTrained ? (h.country && h.country !== '外' ? h.country : null) : '日';
  F.where = h => h.at || F.home(h);
  F.zone = c => c === '日' ? 'JP' : HS.World.zoneOf(c);
  // このレースへ移るときにたまる疲れ（招待のレースは無し）
  F.travel = function (h, race) {
    if (race.invite) return 0;
    const w = F.where(h), c = F.countryOf(race);
    if (!w || w === c) return 0;
    return F.zone(w) === F.zone(c) ? F.TRAVEL.near : F.TRAVEL.far;
  };
  F.raceW = race => H.weekIndex(race.year, race.month, Math.min(race.week, 4));
  // 連闘で別の国へは行けない：前のレース・今週の登録・予約と1週しか離れていない別の国のレースなら理由を返す
  F.travelWhy = function (h, race) {
    if (race.invite) return null;
    const wi = F.raceW(race);
    const near = (w2, c2) => { const d = Math.abs(wi - w2); return d > 0 && d < F.MIN_GAP && c2 !== F.countryOf(race); };
    if (h.lastRaceW != null && wi > h.lastRaceW) { const w = F.where(h); if (w && near(h.lastRaceW, w)) return F.WHY; }
    if (h.owner !== 'P' || !h.id) return null;
    const W = HS.World, G = W.get();
    if (!G) return null;
    for (const [k, arr] of Object.entries(G.entries || {})) {
      if (!arr.some(e => e.horseId === h.id)) continue;
      const r = W.raceByKey(k);
      if (r && !r.invite && near(F.raceW(r), F.countryOf(r))) return F.WHY;
    }
    for (const x of G.reserve || []) {
      if (x.id !== h.id) continue;
      if (near(H.weekIndex(x.y, x.m, x.w), x.debut ? '日' : F.countryOfKey(x.key))) return F.WHY;
    }
    return null;
  };

  // ---------- レースのあと ----------
  F.isTop = race => race.grade === 'G1' && F.TOP_G1.includes(race.name);
  F.gradeMult = function (race) {
    const g = F.GRADE;
    if (F.isTop(race)) return g.top;
    if (race.graded) return g[race.grade] || g.G3;
    return race.cls === 'OP' ? g.OP : g.other;
  };
  // 激戦の度合い。results＝S.finish の着順の並び、k＝その馬の着順−1
  F.severity = function (results, k) {
    const s = F.SEV, res = results[k];
    let close;
    if (k === 0) close = U.clamp(1 - (results[1] ? results[1].lengths : s.winLen) / s.winLen, 0, 1);
    else { let behind = 0; for (let j = 1; j <= k; j++) behind += results[j].lengths; close = U.clamp(1 - behind / s.loseLen, 0, 1); }
    const left = U.clamp(res.endE / s.full, 0, 1);
    return s.lo + s.close * close + s.spent * (1 - left);
  };
  F.gain = (race, results, k) => (F.GAIN.base + race.dist / 100 * F.GAIN.per100) * F.gradeMult(race) * F.severity(results, k);
  // レースのあと（グランドフェスティバルは呼ばない）：移動の疲れとレースの疲れを足し、いる国を移す
  F.afterRace = function (h, race, results, k, travel) {
    h.fatigue = Math.min(100, (h.fatigue || 0) + (travel || 0) + F.gain(race, results, k));
    const c = F.countryOf(race);
    if (c === F.home(h)) delete h.at; else h.at = c;
  };

  // ---------- 毎週の回復 ----------
  F.recover = h => Math.max(F.REC.min, F.REC.base + ((h.health != null ? h.health : 70) - 50) * F.REC.k);
  F.weekly = function (h, mult) {
    if (!(h.fatigue > 0)) return;
    h.fatigue = Math.max(0, h.fatigue - F.recover(h) * (mult || 1));
  };
})();
