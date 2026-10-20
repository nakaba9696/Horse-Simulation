// レースの模擬。0.1秒刻みで全馬を動かし、着順・タイム・実況・描画用のコマ（frames）を出す
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse;
  const S = HS.Sim = {};

  const DT = 0.1, REC_EVERY = 2;          // 0.2秒ごとに記録
  const LEN = 2.4;                         // 1馬身（m）

  // 基準の巡航速度（m/s）。総合85の馬の良馬場・芝
  S.baseSpeed = function (dist, surface, ground, courseAdj) {
    let v = 27.32 - 1.378 * Math.log(dist);
    v *= 1 + Math.max(0, 1600 - dist) / 1600 * 0.04; // 短距離はもう少し速い
    if (surface === 'ダ') v *= 0.955;
    const g = { '良': 0, '稍重': 1, '重': 2, '不良': 3 }[ground] || 0;
    if (surface === '芝') v *= 1 - [0, 0.006, 0.015, 0.03][g];
    else v *= 1 + [0, 0.004, 0.007, 0.009][g];
    v *= 1 + (courseAdj || 0);
    // 出だしの加速を速くした分（約2秒）、走りの速さを少し落として走破タイムを保つ
    return dist / (dist / v + 2.4);
  };

  // 疲労の段階と下げ（持ち主の仕様書 docs/SPEC.md「疲労」。数の表は docs/BALANCE.md の「疲労」）
  // at＝段階の境目（疲労 0〜100）。pen＝段階ごとの強さの下げ（点。1点≒2000mで1馬身）。
  // 強い馬は下げが小さい：能力の重み付きの値（S.power の base）が strong（総合力61ほど）から top（総合力85）へ上がるほど、keep（2割）まで縮む
  S.FATIGUE = { at: [15, 35, 55, 75], pen: [0, 1.5, 4, 8, 13], strong: 86, top: 104.3, keep: 0.2 };
  S.fatigueStage = function (fat) {
    const at = S.FATIGUE.at;
    let st = 0;
    while (st < at.length && fat >= at[st]) st++;
    return st;
  };
  S.fatiguePen = function (fat, a) {
    const F = S.FATIGUE;
    const p = F.pen[S.fatigueStage(fat)];
    if (!p) return 0;
    return p * U.clamp(1 - (a - F.strong) / (F.top - F.strong) * (1 - F.keep), F.keep, 1);
  };

  // その日の出来の揺れ（点。1頭ずつ、レースごとに）。前は 1.9 に調子（sd 0.89 点）が別に足されていた。
  // 調子を無くしたので、合わせた揺れ（√(1.9²＋0.89²)≒2.1）をここで保つ（docs/BALANCE.md「疲労」）
  S.FORM_SD = 2.1;

  // 1頭の、このレースでの強さ（点）を計算する。内訳も返す（人気・説明に使う）
  S.power = function (horse, race, wIdx, ctx) {
    const c0 = H.cur(horse, wIdx);
    const dirt = race.surface === 'ダ';
    // この馬場でのスピード・スタミナを spd・sta として扱う
    const c = Object.assign({}, c0, H.onSurface(c0, race.surface));
    const w = dirt ? { spd: 0.42, sta: 0.20, guts: 0.15, mind: 0.11, slope: 0.12 } : { spd: 0.45, sta: 0.22, guts: 0.16, mind: 0.12, slope: 0.05 };
    let a = 0; for (const k of Object.keys(w)) a += c[k] * w[k];
    const D = race.dist;
    let distPen = 0;
    if (D < horse.distMin) distPen = (horse.distMin - D) / 100 * 1.4;
    if (D > horse.distMax) distPen = (D - horse.distMax) / 100 * 1.2;
    const surfPen = 0; // 芝・ダートの違いは能力（芝スピードなど）に入っている
    // 馬場の状態：強さの上下は小さく（道悪の効きはスタミナの減りと脚の切れで。S.groundFx）
    const gl = S.GROUND.lv[race.ground] || 0;
    const groundAdj = gl ? -gl * S.mudM((horse.apt && horse.apt.heavy) || 50) * S.GROUND.pw : 0;
    // 休み明け（12週以上あいた）は少し割り引く（鉄砲駆けの馬は別に足す）
    const layoff = horse.lastRaceW != null && wIdx != null && wIdx - horse.lastRaceW >= 12 ? 1.2 : 0;
    // 疲労の下げ（段階ごと。強い馬ほど小さい）。ctx.travel＝このレースへの移動の疲れ（国が変わるとき。js/core/fatigue.js）
    // 調子は無い（持ち主の決定 2026-10-20「調子のパラメータは無し。疲労だけにする」）。調子の揺れの分は、その日の出来（S.FORM_SD）に入れた
    const condAdj = -S.fatiguePen((horse.fatigue || 0) + ((ctx && ctx.travel) || 0), a) - layoff;
    const jockAdj = ctx && ctx.jockey ? (ctx.jockey.skill - 75) * 0.06 : 0;
    const wtAdj = ctx && ctx.weight ? -(ctx.weight - 56) * 1.4 : 0;
    const skillAdj = S.skillAdj(horse, race, wIdx, ctx);
    const total = a - distPen - surfPen + groundAdj + condAdj + jockAdj + wtAdj + skillAdj;
    return { total, base: a, distPen, surfPen, groundAdj, condAdj, skillAdj, cur: c };
  };

  // 特殊能力のうち、レースの条件で強さが上下するもの
  S.skillAdj = function (horse, race, wIdx, ctx) {
    const sk = horse.skills;
    if (!sk || !sk.length) return 0;
    const course = HS.DATA.courses[race.course] || {};
    const geo = (race.surface === 'ダ' ? course.dirt : course.turf) || course.turf || course.dirt || {};
    const gap = horse.lastRaceW != null && wIdx != null ? wIdx - horse.lastRaceW : null;
    let a = 0;
    for (const id of sk) {
      if (id === 'big' && race.grade === 'G1') a += 2;
      else if (id === 'fresh' && gap != null && gap >= 10) a += 2;
      else if (id === 'tataki' && gap != null) a += gap >= 10 ? -2 : 1.2;
      else if (id === 'left' && course.dir === '左') a += 1.8;
      else if (id === 'right' && course.dir === '右') a += 1.8;
      else if (id === 'small' && geo.straight && geo.straight < 330) a += 1.8;
      else if (id === 'long' && geo.straight >= 450) a += 1.8;
      else if (id === 'summer' && race.month >= 6 && race.month <= 8) a += 1.8;
      else if (id === 'winter' && (race.month === 12 || race.month <= 2)) a += 1.8;
      else if (id === 'inner' && ctx && ctx.num && ctx.num <= 4) a += 1.2;
      else if (id === 'outer' && ctx && ctx.frame >= 7) a += 1.2;
      else if (id === 'mud' && (race.ground === '重' || race.ground === '不良')) a += 2;
      else if (id === 'travel' && race.region === '海外') a += 2;
      else if (id === 'homebody' && race.region === '海外') a -= 3;
      else if (id === 'leftB' && course.dir === '左') a -= 1.5;
      else if (id === 'rightB' && course.dir === '右') a -= 1.5;
      else if (id === 'hipace' && ctx && ctx.paceF > S.PACE_HI) a += 1.8;
      else if (id === 'slowpace' && ctx && ctx.paceF && ctx.paceF < S.PACE_LO) a += 1.8;
    }
    return a;
  };

  // 斤量（簡略）。定量・馬齢：年齢と性で、別定・ハンデ：実績で上下
  S.weightFor = function (horse, race, year) {
    const age = year - horse.born;
    let w;
    if (age <= 2) w = 55;
    else if (race.age === '3') w = 57;
    else w = (race.month <= 9 && age === 3) ? 56 : 58;
    if (race.age === '3+' && age === 3 && race.month >= 10) w = 56;
    if (horse.sex === '牝' && race.sex !== '牝') w -= 2;
    if (race.weight === 'ハンデ') w = 53 + Math.round(((horse.earn || 0) / 3000)) - (horse.sex === '牝' ? 1 : 0);
    if (race.weight === '別定') w += Math.min(2, (horse.gradedWins || []).filter(g => g.grade === 'G1').length);
    return U.clamp(w, 48, 60);
  };

  // 脚の切れの効き方（s＝終いの伸び、r＝仕掛けの早さ、a＝加速、c＝スパートの消耗、z＝バテたあとの粘り）
  S.OONIGE = { early: 1.02, mid: 1.02, kick: 0.5, lead: 0.055 }; // 大逃げの速さ（道中）・終いの伸び・離す差（直線の長さに対して）
  S.DS = 0.68; // スタミナの持ちの全体の倍率
  // ペース（持ち主の指摘 2026-10-16）：スローなら前の馬が楽で、早めに動くのが得。ハイなら前の馬が脚を使い、後ろでためて遅めに動くのが得。
  // paceF が PACE_HI より上でハイ、PACE_LO より下でスロー。道中、隊列の前にいるほど（paceF-1）×PACE_K の割合でスタミナの減りが増える（スローなら減る）
  // 脚質ごとの居心地のよい位置（前から何割目か。0＝先頭、1＝最後方）。外れた分（割合）× MISFIT ×（気性の荒さ）² が、気分の上がる速さ（毎秒）に足される（距離の MISFIT_FROM まではまだ数えない）。
  // 気分が50を越えると脚の使い方が ×(1＋(気分−50)/100×TENSE_COST)、75を越えると掛かって ×KAKARI_COST
  S.ZONE = { '逃げ': [0, 0.12], '先行': [0.05, 0.4], '差し': [0.3, 0.75], '追込': [0.6, 1] };
  S.MISFIT = 10; S.MISFIT_FROM = 0.2; S.TENSE_COST = 1; S.KAKARI_COST = 1.6;
  // 気分（テンション）の動き：落ち着く先＝base＋(70−mind)×hot（掛かりやすい日は＋kakari）、そこへ毎秒 settle の割合で寄る。前の馬の真後ろで calm だけ落ち着く。
  // 道中の進路の変更は、1つにつき lane×(気性の荒さ−1＋0.15) だけ気分を上げる（荒い馬を外へ出すと掛かる）。しごく・引くも気性の荒い馬ほど気分が動く
  S.TENSION = { base: 25, hot: 0.5, kakari: 15, settle: 0.08, calm: 1.2, lane: 8 };
  // 気性の荒さ（mind が70より低いほど大きい。45で2倍）
  S.temperF = s => 1 + Math.max(0, 70 - s.mind) / 25;
  S.START_ACC = 7.5; S.START_SKILL_ACC = 1.35; S.EASY_START = 0.95; // スタートの特殊能力が出たときの、出だしの加速の倍率と、距離の22%までの消耗の倍率
  // ゲートを出た直後（持ち主の指摘 2026-10-17「スタート後の挙動」）：横一線から全馬が一気に出て、数秒で脚質ごとの位置へ分かれる（出だしの加速の倍率）。
  // そのあと内へ寄りながら縦長の群れになる：スタートから FAN.x m までは、内へ寄る速さを 0.2 秒に FAN.v 進路までにする（前は 2〜3 秒で全馬がラチ沿いに固まっていた）
  S.START_STYLE = { '逃げ': 1.18, '先行': 1.07, '差し': 0.96, '追込': 0.88 };
  S.FAN = { x: 250, v: 0.1 };
  S.LATE_E = 0.15; // 出遅れた馬は、位置を取り戻すのに脚を使う（スタミナの減り）
  // ゲート（自分で乗る馬。持ち主の指摘 2026-10-17「スタートのカウントダウンいらない　目押しで」）。秒はレースの秒（画面は実時間の 1.35 倍で進む）
  // wait＋spread×くじ＝ゲートに入ってから開くまで（レースの種で決まる。毎回少し違うので、覚えて押せない）。開く tell 秒前に前触れ（ゲートの上の灯がつき、扉が小さく鳴る）を見せる
  // 開く buf 秒前から開いて good 秒までに押すと GOOD（buf の中は開いた瞬間に受け付ける）。それより前に押すと馬が煽って（気分 +fret×気性の荒さ）、そのスタートは GOOD にならず、fumble 秒より早くは出られない
  S.GATE = { wait: 2.2, spread: 1.6, tell: 0.8, buf: 0.12, good: 0.1, fumble: 0.35, fret: 4 };
  // ゲートで待つ秒（レースの種から。種の乱数は進めないので、ほかの結果は変わらない）
  S.gateWaitOf = rng => S.GATE.wait + S.GATE.spread * new U.RNG((rng.s ^ 0x9E3779B9) >>> 0).next();
  S.PUSH = { base: 0.25 }; // 追い出したあと、しごかずに馬なりで行くときの伸び（段に置き換えた値）
  // 自分で乗る馬：しごいて巡航より速く走ると脚を大きく使う境目（直線の手前 m）。道中は手綱の段が隊列の位置の注文（段 1 で GEAR_GAP m 前・しごいている間の脚の使い方 GEAR_COST）。
  // 注文の位置へ寄せる強さ（差 1m あたりの速さの割合 POS_K と上限 POS_MAX）
  // 当たり判定（持ち主の指摘 2026-10-20「馬と馬が重なって抜ける」「何もない所にぶつかる」）。数は docs/BALANCE.md「2-3d. 当たり判定」
  // 1進路＝LANE_M m（3D の描画と同じ）。BODY：len＝前後の下限（鼻先どうし。1馬身）・wid＝横の下限（進路。馬と騎手の幅 0.7m＋間 0.1m＝0.8m）・
  // look＝前の馬（横が wid より近い）を見る長さ（鼻先どうし len＋look m まで）。その馬との間が len＋d m なら、前の馬の速さ＋close×d より速く走らない（近づくほど前の馬の速さへ。急に止まらない）
  // follow＝AI の馬が進路を選ぶときに見る前（len＋follow＋0.2 m）。side＝前の馬に詰まっている間の、AI の馬の進路の寄せ（0.2秒にこの割合）
  S.LANE_M = 1.6;
  S.BODY = { len: 2.4, wid: 0.5, look: 6, close: 0.8, follow: 1.0, side: 0.35 };
  // 前の馬に詰まらない速さの上限（前に馬がいなければ Infinity）
  S.followV = function (sim, s) {
    const B = S.BODY;
    let lim = Infinity;
    for (const o of sim.st) {
      if (o === s || o.done || o.x <= s.x) continue;
      const d = o.x - s.x;
      if (d >= B.len + B.look || Math.abs(o.lane - s.lane) >= B.wid) continue;
      const v = o.v + Math.max(0, d - B.len) * B.close;
      if (v < lim) lim = v;
    }
    return lim;
  };
  // 横の移動（自分で乗る馬）：毎秒 v 進路・前後 dx m 以内で、進路の差が gap より近い馬がいる向きへは動けない。
  // 押さない限り横へは動かない（前は何もしないまま10秒で内へ戻り始めた。持ち主の指摘 2026-10-20「勝手に横へ移動することがある」）
  S.LANE = { v: 3, dx: 2.4, gap: 0.65 };
  S.EARLY_PUSH = 500; S.GEAR_GAP = 18; S.GEAR_COST = 0.05; S.POS_K = 0.004; S.POS_MAX = 0.03;
  // ムチ（直線で打ったときの伸びの倍率・風車ムチ・脚の使い方、直線の前で打ったとき）。折り合っている（気分 35 未満）間の脚の使い方
  // 前は伸び 0.6・0.9、脚 0.9・0.95、折り合い 0.94 で、直線の手前から追ってムチを入れるだけで、おまかせの3倍以上勝てた（tools/balance_bench.js）
  // ムチへの素直さ：追い出したときの気分が35以下で ×1.1、35を越えると下がり、75で ×0.6（そのぶん脚も使う）
  S.respOf = c => { const t = c.spurtTension != null ? c.spurtTension : c.tension; return U.clamp(1.1 - Math.max(0, t - 35) / 80, 0.6, 1.1); };
  S.WHIP = { k: 0.4, wind: 0.6, cost: 0.96, windCost: 0.98, early: 0.2, earlyCost: 1.2 }; S.CALM_SAVE = 0.97;
  // PACE_K・DRAFT・PACE_NIGE は、頭数合わせの馬の脚質が平均ペースでおおむね釣り合うように合わせた（tools/skills_bench.js style。前は 70・0.12・2頭で +0.009 で、ハイペースが半分を占め、逃げ馬が平均10〜11着だった）
  S.PACE_HI = 1.006; S.PACE_LO = 0.994; S.PACE_K = 25; S.DRAFT = 0.08; S.PACE_TOP = 50; S.PACE_EARLY = 60;
  // 逃げ馬の数（0・1・2・3頭以上）で決まるペースの片寄りと、レースごとのぶれ
  S.PACE_NIGE = [-0.009, -0.002, 0.003, 0.008]; S.PACE_SD = 0.006;
  // 脚質ごとの、出だし（距離の22%まで）の速さ・隊列での先頭からの差（m）・仕掛けの早さ（m。大きいほど早い）
  S.STYLE_MULT = { '逃げ': 1.03, '先行': 1.014, '差し': 0.995, '追込': 0.982 };
  S.STYLE_GAP = { '逃げ': 0, '先行': 6, '差し': 13, '追込': 21 };
  S.STYLE_SPURT = { '逃げ': 0, '先行': 60, '差し': 120, '追込': 170 };
  S.paceVerdict = f => f > S.PACE_HI ? 'ハイペース' : f < S.PACE_LO ? 'スローペース' : '平均ペース';
  S.paceHint = v => v === 'ハイペース' ? '前は苦しい。後ろでためて遅めに' : v === 'スローペース' ? '前が楽。早めに動け' : '力どおりの流れ';
  // 勾配（比。0.02＝2%）の効き：上りの速さ・上りの消耗・下りの速さ・下りの楽さ
  S.HILL = { v: 0.4, e: 100, dv: 0.25, de: 10, mid: 0.4 };
  // 二の脚：出だし（距離の22%まで）の速さと消耗の倍率・隊列で前に取る位置（m）。自由自在：ペースを見て位置を変える（スロー・ハイの境目と、そこで取る差 m）・騎乗中の折り合いの崩れにくさ。砂かぶり×：脚の使い方の倍率
  S.LONGSPURT = { r: 50, z: 0.002 }; // ロングスパート：仕掛けを早める（m）・バテたあとの粘り
  S.JIYU = { slow: 0.994, hi: 1.006, k: 0.5, misfit: 0.35 };
  S.SUNA = 1.08;
  // 追走○：直線の前、すぐ前（4m 以内・同じ進路）に馬がいる間の脚の使い方の倍率。外回し○：3〜4コーナーで追い出している間の脚の使い方の倍率（自分で乗る馬は外を回った遠回りも無くなる）。
  // 馬群さばき：自分で乗る馬の横の動きの速さの倍率・横の馬に止められる幅（進路の差 gap・前後 dx m）、AI の馬が前が壁になったときの長さの倍率
  S.TSUISO = 0.95; S.SOTO = 0.96; S.SABAKI = { v: 1.6, gap: 0.5, dx: 2.4, block: 0.4 };
  // 道中の位置取り（出だしの速さの倍率・隊列での先頭からの差）。自由自在の馬は、スローならひとつ前の脚質（差し→先行）、ハイならひとつ後ろの脚質の位置へ
  // JIYU.k の割合だけ寄せて運ぶ（仕掛けの早さは本来の脚質のまま）。jiyu＝寄せた向き（-1 前・1 後ろ・0 そのまま）
  S.runPos = function (h, paceF) {
    const st = h.style, i = H.STYLES.indexOf(st);
    const pos = { mult: S.STYLE_MULT[st] || 1, gap: S.STYLE_GAP[st] != null ? S.STYLE_GAP[st] : 10, jiyu: 0 };
    if (!H.has(h, 'jiyu') || i < 0) return pos;
    const to = paceF < S.JIYU.slow && i > 0 ? i - 1 : paceF > S.JIYU.hi && i < H.STYLES.length - 1 ? i + 1 : i;
    if (to === i) return pos;
    const t = H.STYLES[to], k = S.JIYU.k;
    return { mult: pos.mult + (S.STYLE_MULT[t] - pos.mult) * k, gap: pos.gap + (S.STYLE_GAP[t] - pos.gap) * k, jiyu: to < i ? -1 : 1 };
  };
  S.KIRE = { s0: 0.03, s1: 0.0035, r: 60, a0: 0.85, a1: 0.05, c0: 0.95, c1: 0, cS: 0.035, z: 0.0015, top: 2.2 };
  // 馬場の状態（持ち主の決定 2026-10-20「馬場の状態　スタミナ消費や脚の切れに影響をだしてほしい　道悪苦手な馬は大きく影響受けて欲しい」）。数は docs/BALANCE.md「14. 馬場の状態」
  // 苦手さ m：道悪の適性（apt.heavy）が mid より低いほど大きい。x＝(mid−適性)/span として m＝x×(q＋(1−q)×x)（少し苦手なだけなら小さく、はっきり苦手なら大きく。上限 mMax）。
  // mid より高い馬は得をする（good 上がるごとに gain、上限 gain）。pw＝強さ（点）の上下：−馬場の段×m×pw
  // e＝スタミナの減りの増え（苦手さ 1・2000m のとき。良・稍重・重・不良）。距離 /2000 を掛ける（dLo〜dHi）。k＝終いの伸び（脚の切れ）の鈍り（苦手さ 1・切れの重み 1 のとき）
  // 切れの重み＝kw0＋kw1×(切れ−1)：切れる馬ほど損が大きい。内ラチの荒れ・通り道の違いは入れない
  S.GROUND = { lv: { '良': 0, '稍重': 1, '重': 2, '不良': 3 }, mid: 75, bad: 45, span: 30, q: 0.25, mMax: 2.2, good: 25, gain: 0.15, pw: 0.4,
    e: { '芝': [0, 0.06, 0.13, 0.22], 'ダ': [0, 0.05, 0.1, 0.17] }, k: { '芝': [0, 0.1, 0.2, 0.32], 'ダ': [0, 0.07, 0.14, 0.24] },
    dLo: 0.6, dHi: 1.6, kw0: 0.5, kw1: 0.15, kMin: 0.35 };
  // 道悪の苦手さ（正＝苦手・負＝得意）
  S.mudM = function (heavy) {
    const G = S.GROUND, a = heavy || 50;
    if (a >= G.mid) return -Math.min(G.gain, (a - G.mid) / G.good * G.gain);
    const x = (G.mid - a) / G.span;
    return Math.min(G.mMax, x * (G.q + (1 - G.q) * x));
  };
  // 道悪の得手不得手の印（出走表・パドック・馬の詳しい画面と同じ境目）：bad より下は苦手（苦手さ 1 より大きい）・mid 以上は得意
  S.mudLabel = heavy => { const a = heavy || 50; return a < S.GROUND.bad ? '苦手' : a >= S.GROUND.mid ? '得意' : 'ふつう'; };
  // この馬のこの馬場での効き：e＝スタミナの減りの倍率・k＝終いの伸びの倍率
  S.groundFx = function (horse, race) {
    const G = S.GROUND, gl = G.lv[race.ground] || 0;
    if (!gl) return { e: 1, k: 1, m: 0 };
    const sf = race.surface === 'ダ' ? 'ダ' : '芝';
    const m = S.mudM((horse.apt && horse.apt.heavy) || 50);
    const kire = U.clamp(horse.kire || 4, 1, 8);
    const dF = U.clamp(race.dist / 2000, G.dLo, G.dHi);
    const e = 1 + G.e[sf][gl] * m * dF;
    const k = Math.max(G.kMin, 1 - G.k[sf][gl] * m * (G.kw0 + G.kw1 * (kire - 1)));
    return { e, k, m };
  };

  // 本体。runners: [{horse, jockey, weight, num, frame, rider?}]。rider==='P' の馬はプレイヤーが乗る（opts.ride のとき操作を受け付ける）
  // S.create で始め、S.step で 0.1 秒ずつ進め、S.finish で結果を出す。S.run はそれを一度に行う
  S.run = function (race, runners, wIdx, rng, opts) {
    const sim = S.create(race, runners, wIdx, rng, opts);
    while (!S.step(sim)) { /* 進める */ }
    return S.finish(sim);
  };

  S.create = function (race, runners, wIdx, rng, opts) {
    opts = opts || {};
    const course = HS.DATA.courses[race.course] || HS.DATA.courses['東京'];
    // コースの形と高低差（data/layouts.js にある場は実際の回り。無ければ courses.js の数で楕円）
    const cf = HS.Track ? HS.Track.forRace(race) : null;
    const geo = cf ? cf.geo : (race.surface === 'ダ' ? course.dirt : course.turf) || course.turf || course.dirt;
    const D = race.dist;
    const v0 = S.baseSpeed(D, race.surface, race.ground, geo.speed) * U.eraSpeed(race.year);
    const straight = Math.min(geo.straight, D * 0.6);
    const nNige = runners.filter(r => r.horse.style === '逃げ').length;
    const paceF = 1 + S.PACE_NIGE[Math.min(3, nNige)] + rng.normal(0, S.PACE_SD);
    const st = runners.map((r, i) => {
      const h = r.horse;
      const pw = S.power(h, race, wIdx, Object.assign({ paceF }, r));
      const form = rng.normal(0, S.FORM_SD);
      const A = pw.total + form;
      const vc = v0 * (1 + 0.0012 * (A - 85));
      const sta = pw.cur.sta, guts = pw.cur.guts, mind = pw.cur.mind, slopeP = pw.cur.slope;
      const has = id => H.has(h, id);
      // 馬場の状態：道悪ほどスタミナの減りが速く（Ds を割る）、終いの伸びが鈍る。道悪の苦手な馬ほど大きく
      const gx = S.groundFx(h, race);
      const Ds = Math.max(800, (h.distMax + 300 + (sta - 75) * 12) * S.DS) / gx.e;
      // 脚の切れ：切れる馬は終いの伸びが大きく、ズブい馬は早めに動いて長く脚を使う
      const kire = U.clamp(h.kire || 4, 1, 8);
      const K = S.KIRE;
      const kickS = (K.s0 + K.s1 * (kire - 1) + 0.0006 * (pw.cur.spd - 80)) * gx.k;
      const styleAdd = S.STYLE_SPURT[h.style] != null ? S.STYLE_SPURT[h.style] : 80;
      const spurtR = U.clamp(straight + 120 + styleAdd + (4.5 - kire) * K.r + (has('longspurt') ? S.LONGSPURT.r : 0) + rng.normal(0, 60) * (1.3 - mind / 120), 300, Math.min(1300, D * 0.6));
      let delay = Math.abs(rng.normal(0, 0.12));
      const lateP = 0.02 + Math.max(0, 75 - mind) * 0.0008 + (has('deokure') ? 0.14 : 0);
      const late = rng.chance(lateP);
      if (late) delay += rng.float(0.5, 1.4);
      const kakari = rng.chance(Math.max(0, (72 - mind) / 100) * 0.3 + (has('kakari') ? 0.25 : 0));
      const rp = S.runPos(h, paceF); // 道中の位置取り（脚質と自由自在）
      return {
        r, h, i, A, vc, Ds, kickS, spurtR, guts, mind, slopeP, x: 0, v: 0, E: late ? 1 - S.LATE_E : 1, delay, late, kakariDay: kakari, // kakariDay＝この日は掛かりやすい（レースの初めのくじ）
        acc: K.a0 + K.a1 * kire, zubu: (8 - kire) * K.z + (has('longspurt') ? S.LONGSPURT.z : 0), spurtCost: K.c0 + K.c1 * (kire - 1) + K.cS * (kire - 4.5) * (330 - geo.straight) / 200, // 直線が長いほど切れる馬が、短いほどズブい馬が脚を効率よく使える
        oonige: has('oonige') && h.style === '逃げ', sora: has('sora'), sunaB: has('sunaB') && race.surface === 'ダ', jiyu: has('jiyu'),
        gapAdj: 0, driftLane: 0,
        me: false, fired: {}, boost: null, trig: [], sk: null, passive: [], passiveShown: false,
        lane: (r.num - 1) * 0.5, laneT: 0, spurting: false, done: false, finishT: null, t600: null, blocked: 0, blockedOnce: false,
        styleMult: rp.mult, gap: rp.gap, jiyuMove: rp.jiyu,
        fight: 0, duel: null, fightPeak: 0, kakari: 0, ears: 0.4, // 競り合いの気合（-40〜100）・いま競り合っている相手・このレースでの気合の最大・掛かり（0〜1）・耳の向き（−1〜1。S.moodOut）
      };
    });
    const medVc = st.map(s => s.vc).sort((a, b) => a - b)[Math.floor(st.length / 2)];
    const sim = {
      race, runners, wIdx, rng, opts, geo, D, straight, slope: geo.slope, paceF, pace: medVc * paceF, st,
      events: [], frames: [], t: 0, step: 0, finished: 0, winnerT: null, over: false,
      talk: { lastLeader: null, straight: false, mid: false, corner: false, f400: false, f200: false },
      track: cf ? cf.track : null,
      me: -1, ctl: null, _byX: null,
      checkAt: D >= 2400 ? 1200 : D >= 1600 ? 1000 : 600, check: null, skillFx: [],
      gateWait: 0,
      marks: S.lapMarks(D), splits: null, lapN: 0, // ラップ：200m ごとの区切り（ゴールから数える。最初は端数）と、先頭が過ぎた時刻（S.lapMarks）
    };
    sim.splits = sim.marks.map(() => null);
    // 終いの伸びの上限はペースで変わる：スローは脚が余っても伸びきれない（早めに動いて余った脚を使う）。ハイは脚の残りで決まる
    sim.top = S.KIRE.top * U.clamp(1 + (paceF - 1) * S.PACE_TOP, 0.55, 1.6);
    if (HS.Skills) { HS.Skills.setup(sim); for (const s of st) HS.Skills.flags(s); }
    // このレースで効く特殊能力（直線で見せる）
    for (const s of st) {
      s.passive = (s.h.skills || []).filter(id => S.skillAdj(Object.assign({}, s.h, { skills: [id] }), race, wIdx, Object.assign({ paceF }, s.r)) > 0);
      if (s.late && H.has(s.h, 'deokure')) sim.skillFx.push({ t: 0.6, i: s.i, id: 'deokure' });
    }
    // プレイヤーが乗る馬（操作を受け付けるのは opts.ride のときだけ。ほかは騎手の腕で自動に乗る）
    const meIdx = runners.findIndex(r => r.rider === 'P');
    if (meIdx >= 0) {
      sim.me = meIdx;
      const s = st[meIdx]; s.me = true;
      if (opts.ride) {
        sim.ctl = { tension: U.clamp(30 + (75 - st[meIdx].mind) * 0.4 * S.bondF(opts.bond) + (st[meIdx].kakariDay ? 15 : 0), 10, 70), started: false, fumble: false, gear: 0, hand: 'R', swapUntil: -1, lastPush: -9, lastPull: -9, pushes: 0, whips: 0, whipUntil: -1, windmill: false, lane: s.lane, blockedNow: false, wide: false, kakariNow: false, behind: false,
          surge: 0, shrink: 0, pullT: 0, reinFight: false, bumpT: null, bumpSide: 0, bond: opts.bond, bondF: S.bondF(opts.bond), spurtTension: null, lastEv: null,
          steered: false, beats: 0, lastBeat: -9 };
        Object.defineProperty(sim.ctl, 'push', { get() { return Math.max(0, this.gear); }, enumerable: false });
        Object.defineProperty(sim.ctl, 'hold', { get() { return this.gear < -0.05; }, enumerable: false });
        s.delay = 99; s.late = false; // スタートはプレイヤーの合図で
      }
    }
    sim.gateWait = S.gateWaitOf(rng);
    S.say(sim, 0, 'スタートしました！', 'start');
    for (const s of st) if (s.late) S.say(sim, 0.6, `${s.h.name}、出遅れた！`, 'trouble');
    return sim;
  };
  S.say = (sim, t, text, kind) => sim.events.push({ t, text, kind: kind || '' });
  // 特殊能力の発動を記録する（同じ馬・同じ能力は1回だけ）。spurt は仕掛けの合図で、能力ではない
  S.fire = function (sim, s, id) {
    if (s.fired[id]) return;
    s.fired[id] = true;
    if (id === 'spurt') return;
    sim.skillFx.push({ t: sim.t, i: s.i, id });
    if (sim.opts.frames && (s.me || s.h.owner === 'P' || s.h.hist)) S.say(sim, sim.t, `${s.h.name}の${HS.Skills ? HS.Skills.label(id) : (H.SKILLS[id] || { label: id }).label}！`, 'skill');
  };

  // ---------- プレイヤーの操作 ----------
  // しごく（↑の連打）で手綱を押して速さの段（gear）を上げ、引く（↓の連打）で下げる。連打が速いほど大きく動く。
  // 手を止めても段はそのまま（押し続けなくてよい）。急に上げ下げすると馬の気分が悪くなる
  // 歩幅の周期（秒）。映像の足の運びに使う
  S.strideOf = v => U.clamp(7.4 / Math.max(10, v || 16), 0.38, 0.7);
  // 拍子（持ち主の指摘 2026-10-17「操作感は生き物に乗ってる手応えがほしい」）：馬の1完歩（stride m）のうち、首が下がって前へ伸びる所（at）の前後 win に
  // しごくと拍子が合う。合うと手綱の段が gear 倍動き、気分の上がりは calm 倍。追い出してから拍子の合ったしごきが続く（keep 秒以内に2回目から）間は、
  // 脚の使い方 ×save・伸び ×(1＋k×終いの伸び)。連打（前のしごきから minGap 秒より短い）は拍子に数えない。位相は描画と同じ式（騎乗の画面は lag 秒ぶん先の模擬を補間して見せる）
  S.BEAT = { stride: 7.2, lag: 0.05, at: 0.55, win: 0.2, minGap: 0.25, vmin: 8, gear: 1.4, calm: 0.5, keep: 0.95, k: 0.05, save: 0.985 };
  S.beatPhase = s => { let ph = ((s.x - s.v * S.BEAT.lag) / S.BEAT.stride + s.r.num * 0.137) % 1; if (ph < 0) ph += 1; return ph; };
  S.onBeat = (sim, s, c) => c.beats >= 2 && sim.t - c.lastBeat < S.BEAT.keep;
  const rateOf = (c, t) => { c.taps = (c.taps || []).filter(x => t - x < 1); c.taps.push(t); return c.taps.length; };
  const gearStep = n => Math.min(0.25, 0.05 + 0.025 * Math.min(n, 8));
  S.ctl = {
    // しごく。ゲートの中ならスタートの合図。at＝押した時刻（レースの秒。負はゲートの中。省くと sim.t）
    // スタートの戻り値：'good'（開く瞬間に合った）・'ok'・'late'（出遅れ）・'fumble'（早すぎて馬が煽った。まだ出ていない）。走っている間は 'ok'・'fast'
    up(sim, at) {
      const c = sim.ctl; if (!c || sim.over) return null;
      const s = sim.st[sim.me];
      if (!c.started) {
        const G = S.GATE;
        let t = at == null ? sim.t : at < 0 ? at : Math.max(at, sim.t);
        if (t < -G.buf) { c.fumble = true; c.tension = U.clamp(c.tension + G.fret * S.temperF(s), 0, 100); return 'fumble'; }
        if (t < 0) t = 0; // 開く直前の押しは、開いた瞬間に受け付ける
        c.started = true;
        if (t < G.good && !c.fumble) { s.delay = 0.05; c.startGood = true; return 'good'; }
        c.startGood = false;
        s.delay = c.fumble ? Math.max(t, G.fumble) : t;
        if (s.delay > 0.5) { s.late = true; s.E -= S.LATE_E; S.say(sim, sim.t, `${s.h.name}、出遅れた！`, 'trouble'); return 'late'; }
        return 'ok';
      }
      const n = rateOf(c, sim.t);
      let d = gearStep(n);
      // 拍子：首が下がって前へ伸びる所でしごくと、馬が応えて大きく動く（連打は数えない）
      const B = S.BEAT;
      let off = Math.abs(S.beatPhase(s) - B.at); if (off > 0.5) off = 1 - off;
      const beat = s.v > B.vmin && off < B.win && sim.t - c.lastPush >= B.minGap;
      if (beat) { c.beats = sim.t - c.lastBeat < B.keep ? c.beats + 1 : 1; c.lastBeat = sim.t; d *= B.gear; } else c.beats = 0;
      const g0 = c.gear; c.gear = Math.min(1, c.gear + d);
      if (!s.spurting) { c.tension = U.clamp(c.tension + (c.gear - g0) * 12 * S.temperF(s) * (beat ? B.calm : 1), 0, 100); if (c.surge > 5) c.surge = Math.min(S.ORIAI.surgeMax, c.surge + (c.gear - g0) * S.ORIAI.pushSurge); } // 高ぶっているときに押すと、さらに行きたがる
      c.pushes++; c.lastPush = sim.t;
      return beat ? 'beat' : n >= 5 ? 'fast' : 'ok';
    },
    // 引く
    down(sim) {
      const c = sim.ctl; if (!c || !c.started || sim.over) return null;
      const n = rateOf(c, sim.t), d = gearStep(n);
      const g0 = c.gear; c.gear = Math.max(-1, c.gear - d);
      c.tension = U.clamp(c.tension + (g0 - c.gear) * (n >= 5 ? 14 : 4) * S.temperF(sim.st[sim.me]), 0, 100);
      c.lastPull = sim.t;
      return n >= 5 ? 'fast' : 'ok';
    },
    // ムチ（side＝'L' か 'R'。持っていない手のムチは、まず持ち替える）。続けて打つと風車ムチ
    whip(sim, side) {
      const c = sim.ctl; if (!c || !c.started || sim.over) return null;
      const s = sim.st[sim.me];
      side = side || c.hand;
      if (sim.t < c.swapUntil) return 'swap';
      if (side !== c.hand) return S.ctl.swap(sim);
      c.whips++; c.whipUntil = sim.t + 1.2; c.whipT = (c.whipT || []).filter(x => sim.t - x < 1.5); c.whipT.push(sim.t);
      c.windmill = c.whipT.length >= 3;
      const R = sim.D - s.x;
      // 直線の前のムチは、馬が行きたがるだけ
      if (R > sim.straight + 200) c.tension = U.clamp(c.tension + 12, 0, 100);
      // ムチでは進路は変わらない（どちらの手で打ってもよれない。持ち主の指摘 2026-10-17「ムチ打つとめっちゃよれる。どっちうってもよれないようにして」）。
      // away は打った手と反対の側（見た目の向きだけに使う）
      const away = ((S.dirOf(sim) === '左') === (side === 'R')) ? -1 : 1;
      c.lastWhip = { t: sim.t, side, away, yore: false };
      if (c.whips > 12) return 'tired';
      return c.windmill ? 'windmill' : 'ok';
    },
    // ムチの持ち替え（少しの間、打てない）
    swap(sim) {
      const c = sim.ctl; if (!c || sim.over) return null;
      c.hand = c.hand === 'R' ? 'L' : 'R'; c.swapUntil = sim.t + 0.35;
      return 'swap';
    },
    lane(sim, d) {
      const c = sim.ctl; if (!c) return;
      const l0 = c.lane; c.lane = U.clamp(Math.round(c.lane + d), 0, 12); c.laneT = sim.t; c.steered = true;
      const s = sim.st[sim.me];
      if (c.started && c.lane !== l0 && !s.spurting && s.x > sim.D * 0.05) c.tension = U.clamp(c.tension + S.TENSION.lane * (S.temperF(s) - 1 + 0.15), 0, 100);
    },
    // 前の形の呼び名（push＝しごく、hold＝押している間は引く）
    push(sim) { return S.ctl.up(sim); },
    hold(sim, on) { if (on && sim.ctl && sim.ctl.started && sim.ctl.gear > -1 && sim.t - (sim.ctl.lastPull || -9) > 0.4) S.ctl.down(sim); },
  };
  S.dirOf = sim => (HS.DATA.courses[sim.race.course] || {}).dir || '右';
  S.whipEff = c => Math.max(0.25, 1 - 0.07 * Math.max(0, c.whips - 1));
  S.mood = c => c ? U.clamp(100 - c.tension, 0, 100) : 50; // 気分（高いほど良い）

  // ---------- 折り合い（自分で乗る馬の気分）----------
  // 持ち主の指摘 2026-10-16「折り合いについては生き物を操作してるように感じるように作り込んで欲しい」。
  // 気分（tension 0〜100）は「落ち着く先」へ遅れて寄っていく。落ち着く先＝base＋(70−気性)×hot（掛かりやすい日は＋kakari）＋高ぶり（surge）。
  // 高ぶりは周りの出来事（抜かれる・前の壁・砂・外から被される）で上がり、ORIAI.surgeT 秒ほどで引いていく（掛かり始め→山→落ち着く、の波）。
  // 手綱：そっと引くと数秒かけて（ORIAI.ramp 秒で満額）落ち着き、高ぶりも早く引く（surgeT×match）。行きたがっている（気分が keen より上の）馬を
  // 引きすぎ（段の深さが over より深い。気性の荒い馬ほど浅い）のまま fightAfter 秒より抑えると、頭を上げてケンカし、かえって気分が上がる。
  // 臆病な馬（根性が低い）は、壁・被されると高ぶるかわりに縮こまる（shrink：少し遅くなる・耳を伏せる）。
  // 絆（同じ馬に自分で乗った回数。G.bond）：気性の荒さの効きが ×bondF（初めて 1.15・3回で 1・12回以上で 0.8）
  S.ORIAI = { ramp: 2.5, calmK: 5, over: 0.55, overHot: 0.25, fightAfter: 1.2, fightK: 14, surgeT: 6, match: 0.35, matchLo: 0.12,
    keen: 40, passed: 9, wall: 4, sand: 3, cover: 4, shrinkT: 4, shrinkSpd: 0.012, pushSurge: 10, surgeMax: 45 };
  S.bondF = n => n == null ? 1 : n <= 0 ? 1.15 : n < 3 ? 1.15 - n * 0.05 : Math.max(0.8, 1 - (n - 3) * 0.022);
  // 臆病さ（0〜1.3）：根性が低いほど。接戦に弱い馬はさらに
  S.cowardOf = s => U.clamp((72 - s.guts) / 25, 0, 1) + (s.trig && s.trig.includes('sessenB') ? 0.3 : 0);
  S.oriaiStep = function (sim, s, c, g, prog, ahead1) {
    const { st } = sim, T = S.TENSION, O = S.ORIAI;
    const bf = c.bondF != null ? c.bondF : 1;
    const tf = 1 + (S.temperF(s) - 1) * bf; // 絆のぶん、気性の荒さの効きが変わる
    const cw = S.cowardOf(s);
    // 脚質に合った位置にいないと、折り合いを欠いて気分が悪くなる。気性の荒い馬ほど大きく（tf の2乗）、自由自在の馬は小さく
    const zone = S.ZONE[s.h.style] || S.ZONE['先行'];
    const off = prog > S.MISFIT_FROM && s.rk != null ? Math.max(0, zone[0] - s.rk, s.rk - zone[1]) : 0; // 出だし（隊列が決まるまで）は数えない
    c.misfit = off > 0.05;
    // 周りの出来事（0.5 秒ごとに見る）：気性の荒い馬は抜かれる・壁で行きたがり、臆病な馬は壁・被されると縮こまる。
    // 同じ出来事は続いている間も数秒に一度だけ数える（抜かれるは1頭につき1回）
    if (prog > 0.08 && sim.step % 5 === 0) {
      const hot = tf - 1 + 0.15, front = s.h.style === '逃げ' || s.h.style === '先行', t = sim.t;
      const cd = c.evT || (c.evT = {}), seen = c.passSeen || (c.passSeen = {});
      const due = (k, sec) => { if (t - (cd[k] || -99) < sec) return false; cd[k] = t; return true; };
      let ev = null;
      for (const o of st) {
        if (o === s || o.done || seen[o.i] != null && t - seen[o.i] < 10) continue;
        if (o.x > s.x - 1 && o.x - s.x < 3 && Math.abs(o.lane - s.lane) < 2 && o.v > s.v + 0.35) { seen[o.i] = t; c.surge += O.passed * hot * (front ? 1.3 : 1) * Math.max(0, 1 - cw * 0.6); ev = 'passed'; break; }
      }
      if (c.blockedNow && due('wall', 3)) { if (cw > 0.5) c.shrink = Math.min(1, c.shrink + 0.3 * cw); else c.surge += O.wall * hot; ev = ev || 'wall'; }
      if (sim.race.surface === 'ダ' && ahead1 && due('sand', 2)) { c.surge += O.sand * (s.sunaB ? 2.5 : Math.max(0, tf - 1) * 0.6 + cw * 0.4); ev = ev || 'sand'; }
      const side = d => st.some(o => o !== s && !o.done && Math.abs(o.x - s.x) < 2 && d * (o.lane - s.lane) > 0.5 && d * (o.lane - s.lane) < 1.6);
      if (side(1) && (s.lane < 0.6 || side(-1)) && due('cover', 3)) {
        if (cw > 0.4) c.shrink = Math.min(1, c.shrink + 0.2 * cw);
        c.surge += O.cover * (s.trig && s.trig.includes('kongomi') ? 1.5 : Math.max(0, tf - 1));
        ev = ev || 'cover';
      }
      if (ev) c.lastEv = { t, ev };
      c.surge = Math.min(O.surgeMax, c.surge);
    }
    // 手綱：引いている長さ（慣性）と、引きすぎ（ケンカ）
    const p = Math.max(0, -g);
    c.pullT = p > 0.05 ? c.pullT + DT : Math.max(0, c.pullT - 2 * DT);
    const over = Math.max(0.2, O.over - (tf - 1) * O.overHot);
    let rein = 0, gentle = false;
    if (p > 0.05 && H.has(s.h, 'kakari')) rein = 1.5; // 掛かり癖の馬は、引いて遅く走らせると余計に行きたがる
    else if (p > over && c.pullT > O.fightAfter && c.tension > O.keen) rein = (p - over) * O.fightK * tf * Math.min(1, (c.tension - O.keen) / 25); // 引きすぎ：行きたがっている馬を力ずくで抑えると、頭を上げてケンカ（落ち着いた馬を後ろに置くだけならケンカしない）
    else if (p > 0.05) { rein = -O.calmK * Math.min(p, over) * Math.min(1, c.pullT / O.ramp); gentle = p >= O.matchLo; }
    c.reinFight = rein > 0 && !H.has(s.h, 'kakari');
    // 高ぶりは時間で引く。そっと手綱で合わせると早く引き、高ぶっているときに押すと長引く
    c.surge *= Math.exp(-DT / (O.surgeT * (gentle ? O.match : 1) * (g > 0.05 ? 1.6 : 1)));
    c.shrink *= Math.exp(-DT / O.shrinkT);
    // 落ち着く先へ寄る
    const rest = T.base + Math.max(0, 70 - s.mind) * T.hot * bf + (s.kakariDay ? T.kakari : 0) + c.surge;
    const ner = (rest - c.tension) * T.settle + off * S.MISFIT * tf * tf * (s.jiyu ? S.JIYU.misfit : 1) * (prog < 0.65 ? 1 : 0.5);
    const sides = st.filter(o => o !== s && !o.done && o.x - s.x > -1.5 && o.x - s.x < 3 && Math.abs(o.lane - s.lane) < 1.6).length; // 横と前の馬
    const boxed = prog < 0.08 ? 0 : sides >= 2 && (s.h.style === '逃げ' || s.h.style === '追込') ? 1.5 : sides ? 0.4 : 0; // ゲートを出てすぐは横に並んでいて当たり前
    const calm = (ahead1 && s.h.style !== '逃げ' ? T.calm : 0) / Math.sqrt(tf);
    c.tension = U.clamp(c.tension + (ner + boxed * tf + rein - calm) * DT, 0, 100);
  };
  // 掛かり（ハミに逆らう強さ・頭の上げ具合 0〜1。s.kakari）と耳の向き（−1 伏せる〜1 前へ。s.ears）。3D の馬の首と耳に使う（模擬の結果には効かない）
  S.moodOut = function (sim, s, c) {
    let head = 0, ears = 0.4;
    if (c) {
      head = Math.max(U.clamp((c.tension - 50) / 35, 0, 1), c.reinFight ? 1 : 0);
      if (c.kakariNow) ears = -0.3; else if (c.tension < 35) ears = 0.6;
      if (c.shrink > 0.2) ears = Math.min(ears, -c.shrink);
    } else if (s.kakariDay && s.x < sim.D * 0.5) { head = 0.7; ears = -0.3; }
    if (s.spurting) { head *= 0.3; ears = Math.min(ears, 0.2); }
    if (s.fight > 30 && s.duel) ears = Math.min(ears, -0.7 * Math.min(1, s.fight / 80)); // 競り合って気合が乗ると耳を絞る
    if (s.done) { head = 0; ears = 0.5; }
    s.kakari = Math.round(head * 100) / 100; s.ears = Math.round(ears * 100) / 100;
  };

  // 競り合い（持ち主の指摘 2026-10-16「競り合ったときに根性が高い馬なら上げて欲しい」、2026-10-20「他の馬と競り合いになった時に影響する。
  // 底力が高いと減速しにくい（粘れる）。逆に底力が低いと他の馬と競り合いになった時にスピードが落ちる」。底力＝根性）。
  // 3〜4コーナーから先（残り 直線＋from m）で、すぐ横（前後 dx m 以内・進路が l0〜l1 離れた隣・速さの差 dv m/s 以内）に馬がいる間、
  // 気合（s.fight）が根性で決まる値 (根性−g0)/span×per（−100〜100）へ毎秒 up ずつ寄る。横に馬がいなくなると、毎秒 decay の割合で 0 へ戻る。
  // 効き目：追い出してから・バテたあとの速さ ×(1＋spd×気合/per)。根性 g0（70）でほぼ変わらず、高いほど粘り、低いほど落ちる。脚の使い方には効かない（前の「脚の使い方も軽く」は外した）
  S.FIGHT = { from: 300, dx: 2.4, l0: 0.45, l1: 1.8, dv: 0.6, g0: 70, span: 20, per: 50, up: 20, decay: 0.05, spd: 0.008 };
  S.fightStep = function (sim, s, R, prog) {
    const F = S.FIGHT;
    let duel = null;
    if (prog > 0.3 && (R < sim.straight + F.from || s.spurting)) {
      for (const o of sim.st) {
        if (o === s || o.done) continue;
        const dl = Math.abs(o.lane - s.lane);
        if (Math.abs(o.x - s.x) < F.dx && dl > F.l0 && dl < F.l1 && Math.abs(o.v - s.v) < F.dv) { duel = o; break; }
      }
    }
    s.duel = duel;
    if (duel) {
      const aim = U.clamp((s.guts - F.g0) / F.span * F.per, -100, 100);
      s.fight = aim > s.fight ? Math.min(aim, s.fight + F.up * DT) : Math.max(aim, s.fight - F.up * DT);
      if (s.fight > s.fightPeak) s.fightPeak = s.fight;
    } else if (s.fight) s.fight *= 1 - F.decay * DT;
  };

  // 前にいる順の並び（前の刻みの並びを、挿し込みで並べ直す。ほとんど並んでいるので速い）
  S.byX = function (sim) {
    const a = sim._byX || (sim._byX = sim.st.slice());
    for (let i = 1; i < a.length; i++) {
      const v = a[i]; let j = i - 1;
      while (j >= 0 && a[j].x < v.x) { a[j + 1] = a[j]; j--; }
      a[j + 1] = v;
    }
    return a;
  };
  // 0.1 秒進める。終わったら true
  S.step = function (sim) {
    if (sim.over) return true;
    const { D, st, straight, slope, pace, opts, rng } = sim;
    sim.t += DT; sim.step++;
    const t = sim.t;
    const order = S.byX(sim).filter(s => !s.done);
    for (let k = 0; k < order.length; k++) order[k].rk = order.length > 1 ? k / (order.length - 1) : 0.5;
    // 隊列の先頭（大逃げの馬は追いかけず、2番手以下の集団で隊列を作る）
    const pack = order.find(o => !o.oonige) || order[0];
    const leaderX = pack ? pack.x : D;
    const c = sim.ctl;
    for (const s of st) {
      // ゴールした馬は止まらず、少しずつ速さを落として流す（描画のため。着順・時計は変わらない）
      if (s.done) { s.v = Math.max(6, s.v - 0.9 * DT); s.x += s.v * DT; s.kakari = 0; s.ears = 0.5; continue; }
      if (s.me && c && !c.started && t >= 0.9) { c.started = true; s.delay = 0.9; s.late = true; s.E -= S.LATE_E; S.say(sim, t, `${s.h.name}、出遅れた！`, 'trouble'); }
      if (t < s.delay) continue;
      const R = D - s.x;
      const prog = s.x / D;
      let target;
      let costMul = 1;
      if (s.me && c) {
        // プレイヤーの操作：何もしなければ馬なり（自分の仕掛けどころで勝手に伸びる）。しごいて段を上げればもっと速く、引けば脚をためる。ムチでもうひと伸び
        const g = c.gear;
        // 追い出し：自然の仕掛けどころに来るか、直線の手前でしごいて段を上げれば、そこから伸びる
        if (!s.spurting && (R <= s.spurtR || (g > 0.35 && R < straight + 500))) { s.spurting = true; S.fire(sim, s, 'spurt'); if (H.has(s.h, 'longspurt')) S.fire(sim, s, 'longspurt'); }
        if (s.spurting && g < -0.05 && R > 200) { s.spurting = false; c.spurtTension = null; } // 引いたら仕掛け直し
        // 気分（テンション）：放っておくと行きたがり、包まれると嫌がる。前の馬の真後ろや、そっと引くと落ち着く。高すぎると掛かる
        const ahead1 = st.find(o => o !== s && !o.done && o.x > s.x && o.x - s.x < 5 && Math.abs(o.lane - s.lane) < 0.8);
        c.behind = !!ahead1;
        if (!s.spurting) S.oriaiStep(sim, s, c, g, prog, ahead1);
        else c.tension = Math.max(0, c.tension - 3 * DT);
        if (s.spurting && c.spurtTension == null) c.spurtTension = c.tension; // 追い出したときの気分（ムチへの素直さに効く）
        const kakariNow = c.tension > 75 && !s.spurting;
        if (kakariNow && !c.kakariNow && H.has(s.h, 'kakari')) S.fire(sim, s, 'kakari');
        c.kakariNow = kakariNow;
        if (kakariNow) c.everKakari = true;
        if (s.E <= 0) target = s.vc * (0.9 + 0.0005 * s.guts + s.zubu);
        else {
          if (s.spurting) {
            // 馬なりでは伸びきらない。しごいて段を上げるほど、残っている脚を使って伸びる（段がいちばん上で、おまかせと同じ伸び）。
            // いつ追い出すかが腕の見せどころ：スローなら早め、ハイなら遅め（脚が残っていれば伸び、無ければバテる）
            const ratioE = Math.cbrt(Math.max(0, s.E) * s.Ds / (0.9 * Math.max(R, 30) * s.spurtCost));
            target = s.vc * U.clamp(ratioE, 1 + s.kickS, 1 + s.kickS * (1 + (sim.top + (s.topAdd || 0) - 1) * U.clamp(g, S.PUSH.base, 1)));
          } else if (prog < 0.22) {
            // 出だし：段の高さだけ速く（前へ）、深さだけ遅く（後ろへ）。出だしで押すと脚を使う
            target = pace * s.styleMult; if (s.easyStart) costMul *= S.EASY_START;
            if (g > 0) { target *= 1 + g * 0.03; costMul *= 1 + 0.6 * g; } else if (g < 0) target *= 1 + g * (prog < 0.15 ? 0.03 : 0.012);
          } else {
            // 道中：手綱の段で隊列の位置を決める（しごけば前へ・引けば後ろへ、段 1 で S.GEAR_GAP m）。段を戻さなければ、その位置を保つ。
            // 位置を変える間は速く（遅く）走るぶん脚を使い、しごいている間は少し余計に使う（前の形は段のぶんずっと速さを足していて、位置を保つだけで脚を大きく使った）
            const gapT = Math.max(0, s.gap + (s.gapAdj || 0) - g * S.GEAR_GAP);
            target = pace * (1 + U.clamp((leaderX - s.x - gapT) * S.POS_K, -S.POS_MAX, S.POS_MAX));
            if (g > 0) costMul *= 1 + S.GEAR_COST * g;
          }
          // 引く：脚をためる（スタミナの減りが小さい）
          if (g < 0) costMul *= 1 + 0.1 * g;
          if (t < c.whipUntil) {
            const inZone = R < straight + 200;
            const W = S.WHIP, k = c.windmill ? W.wind : W.k;
            // 直線のムチは気合が入って、もうひと伸びし、脚ももつ。直線の前のムチは脚を使うだけ
            // 折り合っていた馬ほどムチに素直に応え、掛かっていた馬はムダに脚を使う（追い出したときの気分で）
            const resp = S.respOf(c);
            target *= 1 + (inZone ? k * resp : W.early) * s.kickS * S.whipEff(c); costMul *= inZone ? (c.windmill ? W.windCost : W.cost) * (1 + (1 - resp) * 0.15) : W.earlyCost;
          }
          // 拍子の合ったしごきが続いている間は、馬が気持ちよく伸びる（追い出してから）
          if (s.spurting && S.onBeat(sim, s, c)) { target *= 1 + S.BEAT.k * s.kickS; costMul *= S.BEAT.save; }
          // 掛かると行きたがって脚を使う。落ち着いていれば脚がもつ
          if (kakariNow) { target *= 1.012; costMul *= S.KAKARI_COST; }
          else if (c.tension < 35 && !s.spurting) costMul *= S.CALM_SAVE;
          // 折り合いを欠くほど（気分が悪いほど）脚を使う
          else if (c.tension > 50 && !s.spurting) costMul *= 1 + (c.tension - 50) / 100 * S.TENSE_COST;
          // 叩き合い：根性の効きは競り合い（S.FIGHT）で
        }
        // 進路は押さない限り変わらない（前は何もしないまま10秒で内ラチへ寄った。持ち主の指摘 2026-10-20）
        // 前に馬がいて進路が無い（すぐ前・横が馬の幅より近い。前は横 0.85 進路＝1.4m まで数えて、何もない所で詰まった）
        const ahead = st.find(o => o !== s && !o.done && o.x > s.x && o.x - s.x < S.BODY.len + 0.2 && Math.abs(o.lane - s.lane) < S.BODY.wid);
        c.blockedNow = !!ahead;
        if (ahead) target = Math.min(target, ahead.v - 0.05);
        if (c.shrink > 0.05 && !s.spurting) target *= 1 - S.ORIAI.shrinkSpd * c.shrink; // 縮こまると、少し遅くなる
      } else {
        if (!s.spurting && R <= s.spurtR) {
          s.spurting = true;
          // 残りの脚が足りないなら仕掛けを遅らせる
          const need = R / s.Ds * 0.9 * Math.pow(1 + s.kickS, 3);
          if (need > s.E * 1.15 && R > 260) s.spurting = false;
          else if (H.has(s.h, 'longspurt')) S.fire(sim, s, 'longspurt');
        }
        if (s.E <= 0) {
          target = s.vc * (0.9 + 0.0005 * s.guts + s.zubu);
        } else if (s.spurting) {
          // 残りの脚をゴールまでに使い切る速さ（切れの上限まで）
          const ratioE = Math.cbrt(Math.max(0, s.E) * s.Ds / (0.9 * Math.max(R, 30) * s.spurtCost));
          target = s.vc * U.clamp(ratioE, 1 + s.kickS, 1 + s.kickS * (sim.top + (s.topAdd || 0)));
          // 大逃げは道中で脚を使っているので、終いは粘るだけ
          if (s.oonige) target = s.vc * (1 + s.kickS * S.OONIGE.kick);
          // 叩き合い：根性の効きは競り合い（S.FIGHT）で
          // ソラを使う：抜け出すと気を抜く
          if (s.sora && R < 200 && order[0] === s && order[1] && s.x - order[1].x > 2) { target *= 0.985; S.fire(sim, s, 'sora'); }
        } else if (prog < 0.22) {
          target = pace * s.styleMult * (s.oonige ? S.OONIGE.early : 1);
          if (s.easyStart) costMul *= S.EASY_START;
        } else if (s.oonige) {
          target = pace * (s.x - leaderX < S.OONIGE.lead * straight * 2000 / D ? S.OONIGE.mid : 1);
          if (s.x - leaderX > 10) S.fire(sim, s, 'oonige');
        } else {
          // 隊列を保つ：先頭からの目標の差に寄せる
          // 特殊能力（スタートダッシュ・出ムチ・二の脚）で目標の差が前へずれる。先頭の馬はそのままのペースで行く（2番手と競り合わない）
          const g0 = Math.max(0, s.gap + s.gapAdj);
          const err = pack === s ? 0 : leaderX - s.x - g0;
          target = pace * (1 + U.clamp(err * 0.0012, -0.02, 0.02));
          if (s.kakariDay && prog < 0.5) { target *= 1.012; if (prog > 0.1 && H.has(s.h, 'kakari')) S.fire(sim, s, 'kakari'); }
        }
        if (s.kakariDay && prog < 0.5) costMul *= 1.3;
      }
      // ペース：道中は前にいるほど、ハイなら脚を使い、スローなら楽をする
      // ハイペースで直線の前から追い出すと、脚がもたない（早仕掛けは損）
      if (s.spurting && R > straight && sim.paceF > 1) costMul *= 1 + (sim.paceF - 1) * S.PACE_EARLY;
      // （後ろの馬は前の馬を風よけにして、ペースにかかわらず少し楽をする）
      if (!s.spurting && prog > 0.08 && !s.oonige) { const rk = s.rk == null ? 0.5 : s.rk; costMul *= Math.max(0.5, 1 + (sim.paceF - 1) * S.PACE_K * (1 - 2 * rk)) * (1 - S.DRAFT * rk); } // 大逃げは集団と離れて自分のペースで行く
      // 砂かぶり×：ダートで、すぐ前に馬がいると砂をかぶって嫌がり、脚を使う
      if (s.sunaB && !s.spurting && prog > 0.05 && st.some(o => o !== s && !o.done && o.x > s.x && o.x - s.x < 4 && Math.abs(o.lane - s.lane) < 0.8)) { costMul *= S.SUNA; s.sunaT = (s.sunaT || 0) + DT; if (s.sunaT > 3) S.fire(sim, s, 'sunaB'); }
      // 追走○：直線の前、すぐ前に馬がいる間は、脚の減りが少ない
      if (s.tsuiso && !s.spurting && prog > 0.08 && R > straight && st.some(o => o !== s && !o.done && o.x > s.x && o.x - s.x < 4 && Math.abs(o.lane - s.lane) < 0.8)) { costMul *= S.TSUISO; S.fire(sim, s, 'tsuiso'); }
      // 外回し○：3〜4コーナーで追い出している間（外を回して進出する）は、脚の減りが少ない。自分で乗る馬は外（進路1.5より外）にいるときだけ
      if (s.sotoM && s.spurting && R > straight && (sim.track ? HS.Track.cornerAt(sim.track, R) !== 0 && R < straight + 700 : R < straight + 350) && (!(s.me && c) || s.lane > 1.5)) { costMul *= S.SOTO; S.fire(sim, s, 'sotomawashi'); }
      // 競り合いの気合：追い出してから（とバテたあと）の伸びと粘りに効く。ひるんだ馬は少し遅くなる
      S.fightStep(sim, s, R, prog);
      if (s.fight && (s.spurting || s.E <= 0)) target *= 1 + S.FIGHT.spd * s.fight / S.FIGHT.per;
      // 発動した特殊能力の、一時の速さ
      if (s.boost && t < s.boost.until) { target *= s.boost.mul; if (s.boost.free) costMul /= s.boost.mul * s.boost.mul * s.boost.mul; }
      // 坂：ゴール前の上りで脚を使う。坂が弱いほど大きく減る
      // 実際の高低差があるコースは、その場の勾配で（上りは遅く重く、下りは少し速く楽に）。無いコースはゴール前の坂の強さで
      const grade = sim.track && !sim.track.flat ? sim.track.gAt(R) : 0;
      const onHill = (!sim.track || sim.track.flat) && R < 320 && R > 60 && slope !== '平';
      if (onHill) target *= 1 - ({ '急': 0.008, '中': 0.005, '小': 0.003 }[slope] || 0) * (1 - s.slopeP / 120);
      // 道中の坂はペースで吸収されるので効きを弱く、追い出してからの坂（ゴール前の急坂など）は強く
      const hillW = s.spurting ? 1 : S.HILL.mid;
      if (grade > 0) target *= 1 - grade * S.HILL.v * hillW * (1 - s.slopeP / 120);
      else if (grade < 0) target *= 1 - grade * S.HILL.dv;
      // 不利（差し・追込が直線で詰まる）。プレイヤーの馬は自分の進路取りしだい
      if (!(s.me && c) && s.spurting && !s.blockedOnce && st.length >= 10 && (s.h.style === '差し' || s.h.style === '追込')) {
        s.blockedOnce = true;
        const jk = s.r.jockey ? s.r.jockey.skill : 70;
        // 外回し○は外を回して壁を避け、馬群さばきはすぐに進路を見つける（くじは同じように引く）
        if (rng.chance(0.1 * (1 - s.mind / 160) * (1.2 - jk / 150))) { s.blocked = rng.float(1.0, 2.4) * (s.sotoM ? 0 : s.sabaki ? S.SABAKI.block : 1); if (s.blocked > 0) S.say(sim, t, `${s.h.name}、前が壁になった！`, 'trouble'); }
      }
      if (s.blocked > 0) { target *= 0.93; s.blocked -= DT; }
      // 当たり判定：前の馬（横が馬の幅より近い）に近づくほど、その馬の速さへ落とす（AI の馬は進路を変えて抜く。自分の馬は自分で進路を変える）
      { const lim = S.followV(sim, s); s.held = lim < target; if (s.held) target = lim; }
      // 加減速の上限
      // ゲートを出てすぐは強く加速し、2秒ほどで巡航の速さの9割に乗る（持ち主の指摘「動き出しが遅い」）
      // スタートの特殊能力（脚を使わない速さ）が出ている間は、出だしの加速も速い
      const acc = s.v < s.vc * 0.9 ? S.START_ACC * (S.START_STYLE[s.h.style] || 1) * (s.boost && s.boost.free && t < s.boost.until ? S.START_SKILL_ACC : 1) : s.acc + s.slopeP * 0.0015;
      const dv = U.clamp(target - s.v, -1.4 * DT, acc * DT);
      const vPrev = s.v;
      s.v = Math.max(0, s.v + dv);
      // スタミナの消耗（自分の巡航より速いほど重い）
      const ratio = s.v / s.vc;
      let cost = (s.v * DT) / s.Ds * 0.9 * ratio * ratio * ratio * costMul;
      if (s.spurting) cost *= s.spurtCost;
      if (onHill) cost *= 1 + ({ '急': 2.2, '中': 1.4, '小': 0.8 }[slope] || 0) * U.clamp(1 - s.slopeP / 100, 0, 0.6);
      if (grade > 0) cost *= 1 + grade * S.HILL.e * hillW * U.clamp(1 - s.slopeP / 100, 0, 0.6);
      else if (grade < 0) cost *= Math.max(0.7, 1 + grade * S.HILL.de);
      // 早くから追い通すと、馬がもたない（直線の手前 S.EARLY_PUSH m より前でしごいて巡航より速く走ると、脚を大きく使う）
      // 前は「残り600mより前」で、自然の仕掛けどころ（残り800m前後）で追っても損になり、自分で乗るとおまかせより大きく負けていた
      if (s.me && c && c.gear > 0.05 && R > straight + S.EARLY_PUSH) cost *= 1 + 8 * Math.max(0, ratio - 1);
      s.E -= cost;
      const xPrev = s.x;
      let dx = (vPrev + s.v) / 2 * DT;
      // コーナーで外を回ると、そのぶん遠回りになる（プレイヤーの馬）
      if (s.me && c && sim.track) { const corner = HS.Track.cornerAt(sim.track, R) !== 0; c.wide = corner && s.lane > 1.5; if (corner && !s.sotoM) dx *= 1 - 0.005 * Math.max(0, s.lane - 0.5); } // 外回し○は遠回りにならない
      s.x += dx;
      S.moodOut(sim, s, s.me ? c : null);
      if (s.t600 == null && s.x >= D - 600) s.t600 = t - DT + (D - 600 - xPrev) / Math.max(0.1, s.x - xPrev) * DT;
      // ラップ：区切りをいちばん早く過ぎた馬の時刻（この刻みで過ぎた馬のうち早いほう）
      for (let k = sim.lapN; k < sim.marks.length && sim.marks[k] <= s.x; k++) {
        if (sim.marks[k] <= xPrev) continue;
        const tc = t - DT + (sim.marks[k] - xPrev) / Math.max(0.1, s.x - xPrev) * DT;
        if (sim.splits[k] == null || tc < sim.splits[k]) sim.splits[k] = tc;
      }
      if (s.x >= D) {
        s.finishT = t - DT + (D - xPrev) / Math.max(0.1, s.x - xPrev) * DT;
        s.done = true; sim.finished++;
        if (sim.winnerT == null) sim.winnerT = s.finishT;
      }
    }
    while (sim.lapN < sim.marks.length && sim.splits[sim.lapN] != null) sim.lapN++;
    if (HS.Skills && sim.step % 2 === 1) HS.Skills.step(sim, order, DT * 2);
    // スキルの発動（見せるため）：直線に入ったら、このレースで効いている特殊能力
    for (const s of st) {
      if (s.done || !s.passive) continue;
      if (!s.passiveShown && D - s.x <= straight) { s.passiveShown = true; for (const id of s.passive) S.fire(sim, s, id); }
      if (s.jiyuMove && t > 8 && t < 8.5) S.fire(sim, s, 'jiyu');
    }
    // ペースの目安：先頭がチェックポイントを過ぎたとき
    if (!sim.check && order[0] && order[0].x >= sim.checkAt) {
      const verdict = S.paceVerdict(sim.paceF);
      sim.check = { t, at: sim.checkAt, verdict, lead: order[0].i }; // lead＝チェックポイントを先頭で通った馬（幻惑逃げ）
      if (opts.frames) S.say(sim, t, `${sim.checkAt}m通過は${t.toFixed(1)}秒。${verdict}です。`, 'pace');
    }
    // 進路：前から順に、近くの馬と重ならない一番内の位置（特殊能力の発動にも使うので、映像を出さないレースでも決める）
    if (true) {
      const live = S.byX(sim);
      // プレイヤーの馬は自分で選んだ進路にいる
      const me = c ? st[sim.me] : null;
      if (me) {
        // 押したらすぐ動き出し（毎秒 S.LANE.v 進路）、横に馬がいれば止まる（ぶつかった印 c.bumpT・c.bumpSide。振動と揺れに使う）
        // 馬群さばき：横に動くのが速く、横の馬に止められにくい
        // 出だしで進路をまだ触っていなければ、ほかの馬と同じようにゆっくり内へ寄る
        const SB = me.sabaki ? S.SABAKI : null, lv = me.x < S.FAN.x && !c.steered ? S.FAN.v / (2 * DT) : S.LANE.v * (SB ? SB.v : 1);
        const want = U.clamp(c.lane - me.lane, -lv * DT, lv * DT);
        if (Math.abs(want) > 1e-6) {
          const nl = me.lane + want, dir = Math.sign(want);
          const hit = st.find(o => o !== me && !o.done && Math.abs(o.x - me.x) < (SB ? SB.dx : S.LANE.dx) && dir * (o.lane - me.lane) > 0 && Math.abs(o.lane - nl) < (SB ? SB.gap : S.LANE.gap));
          if (hit) {
            if (t - (c.bumpT == null ? -9 : c.bumpT) > 0.4) { c.bumpT = t; c.bumpSide = dir; }
            c.lane = me.lane; // 押した向きの注文は取り消す（ぶつかった所で止まる。戻りもしない）
          } else me.lane = nl;
        }
        me.laneT = c.lane;
      }
      const near = [];
      // ほかの馬の進路は 0.2 秒ごとに決め直す（計算を軽くするため）
      for (let k = 0; k < live.length && sim.step % 2 === 0; k++) {
        const s = live[k];
        if (s === me) continue;
        let want = 0;
        const inStraight = D - s.x < straight;
        if (inStraight && (s.h.style === '差し' || s.h.style === '追込')) want = s.trig && s.trig.includes('oosoto') ? 6 : 2 + (s.i % 4);
        want += s.driftLane; // ささり癖でよれた分
        // すぐ前（BODY.len＋BODY.follow＋0.2 m 以内。追いついて前の馬に速さを合わせる所まで見る。前は 2.6m で、詰まったまま進路を変えなかった）にいて、もう進路が決まった馬の進路
        near.length = 0;
        const look = S.BODY.len + (s.held ? S.BODY.look : S.BODY.follow + 0.2); // 詰まっている馬は、前の馬を見る長さまで見て進路を選ぶ
        for (let q = k - 1; q >= 0 && live[q].x - s.x < look; q--) near.push(live[q] === me ? me.lane : live[q].laneT);
        if (me && me.x < s.x && s.x - me.x < 2.6) near.push(me.lane);
        let lane = want;
        for (let n = 0; n < 20; n++) {
          let hit = false;
          for (let q = 0; q < near.length; q++) if (Math.abs(near[q] - lane) < 0.9) { hit = true; break; }
          if (!hit) break;
          lane += 1;
        }
        s.laneT = lane;
        const dl = (s.laneT - s.lane) * (s.held ? S.BODY.side : 0.16); // 前の馬に詰まっている間は、早く進路を変える
        const mv = s.x < S.FAN.x ? U.clamp(dl, -S.FAN.v, S.FAN.v) : dl;
        // 当たり判定：横に動く向きに馬がいれば（前後 BODY.len 以内）、その馬の BODY.wid 手前で止まる（重なってから押し返さない）
        let nl = s.lane + mv;
        if (mv !== 0) {
          const dir = mv > 0 ? 1 : -1, B = S.BODY;
          for (const o of st) {
            if (o === s || o.done || Math.abs(o.x - s.x) >= B.len || dir * (o.lane - s.lane) <= 0) continue;
            const lim = o.lane - dir * B.wid;
            if (dir > 0 ? nl > lim : nl < lim) nl = dir > 0 ? Math.max(s.lane, lim) : Math.min(s.lane, lim);
          }
        }
        s.lane = nl;
      }
    }
    S.separate(sim);
    // 実況（映像を出すときだけ）
    if (opts.frames && sim.step % 5 === 0) S.commentary(sim);
    if (opts.frames && sim.step % REC_EVERY === 0) sim.frames.push({ t, p: st.map(s => [Math.round(s.x * 10) / 10, Math.round(s.lane * 100) / 100, Math.round(s.v * 100) / 100]) });
    if (sim.finished >= st.length || t >= 400 || (sim.winnerT != null && t > sim.winnerT + 25)) sim.over = true; // 残りはまとめて止める
    // 操作して乗るときは、自分がゴールして少ししたら終える
    if (c && st[sim.me].done && t > st[sim.me].finishT + 4) sim.over = true;
    return sim.over;
  };

  // 当たり判定（毎刻みの終わり）：走っている馬（出た・まだゴールしていない）どうしが、前後 BODY.len より近く、横 BODY.wid より近ければ重なり。
  // 1) 重なりの浅いほうの向きに分ける：横なら、後ろの馬（自分の馬が絡むときは AI の馬。自分の馬は押されない）が相手から離れる向きへ動く（内ラチより内へは行けない。行けなければ前後で分ける）。
  //    前後なら、後ろの馬を前の馬の len 後ろへ下げ、速さを前の馬より上にしない。自分の馬に触れたら c.bumpT・bumpSide（騎乗の画面の揺れと振動）
  // 2) 前から順に、まだ重なる後ろの馬を下げる（必ず重なりが無くなる）
  S.separate = function (sim) {
    const B = S.BODY, c = sim.ctl, me = c ? sim.st[sim.me] : null, t = sim.t, EPS = 1e-6;
    const live = S.byX(sim).filter(s => !s.done && t >= s.delay);
    const n = live.length;
    for (let k = 1; k < n; k++) {
      const s = live[k];
      for (let q = 0; q < k; q++) {
        const o = live[q];
        const ax = Math.abs(o.x - s.x), al = Math.abs(o.lane - s.lane);
        if (ax >= B.len - EPS || al >= B.wid - EPS) continue;
        let done = false;
        if ((B.wid - al) * S.LANE_M < 3 * (B.len - ax)) {
          // 横に分ける：動くのは後ろの馬。ただし自分の馬は動かさない
          const y = s === me ? o : s, f = y === s ? o : s;
          const d = y.lane > f.lane ? 1 : y.lane < f.lane ? -1 : 1;
          const nl = f.lane + d * B.wid;
          if (nl >= 0) { y.lane = nl; done = true; }
          else if (f !== me) { f.lane = y.lane + B.wid; done = true; } // 内ラチで行き場が無ければ、相手を外へ
        }
        if (!done) { s.x = o.x - B.len; if (s.v > o.v) s.v = o.v; }
        if (me && (s === me || o === me) && t - (c.bumpT == null ? -9 : c.bumpT) > 0.4) {
          const other = s === me ? o : s;
          c.bumpT = t; c.bumpSide = other.lane > me.lane ? 1 : other.lane < me.lane ? -1 : 0;
        }
      }
    }
    const a = S.byX(sim);
    for (let k = 1; k < a.length; k++) {
      const s = a[k];
      if (s.done || t < s.delay) continue;
      for (let it = 0; it <= k; it++) {
        let moved = false;
        for (let q = 0; q < k; q++) {
          const o = a[q];
          if (o.done || t < o.delay) continue;
          if (Math.abs(o.lane - s.lane) < B.wid - EPS && Math.abs(o.x - s.x) < B.len - EPS) { s.x = o.x - B.len; if (s.v > o.v) s.v = o.v; moved = true; }
        }
        if (!moved) break;
      }
    }
  };

  S.commentary = function (sim) {
    const { st, D, straight, t } = sim; const k = sim.talk;
    const ord = st.slice().sort((a, b) => b.x - a.x);
    const lead = ord[0];
    if (t > 6 && t < 14 && !k.lastLeader) { k.lastLeader = lead; S.say(sim, t, `ハナを切ったのは${lead.h.name}。`, 'lead'); }
    const R = D - lead.x;
    if (!k.mid && lead.x > D * 0.5 && D >= 1600) {
      k.mid = true;
      const names = ord.slice(0, 3).map(s => s.h.name).join('、');
      S.say(sim, t, `中間点、前は${names}。`, 'mid');
      const pl = ord.findIndex(s => s.h.owner === 'P' || s.me);
      if (pl >= 0) S.say(sim, t + 1.5, `${ord[pl].h.name}は${pl + 1}番手あたり。`, 'mine');
    }
    if (!k.corner && R <= straight + 350) { k.corner = true; S.say(sim, t, '3コーナーから4コーナーへ。各馬が動き出す！', 'corner'); }
    if (!k.straight && R <= straight) { k.straight = true; S.say(sim, t, `最後の直線！ 先頭は${lead.h.name}！`, 'straight'); }
    if (k.lastLeader && lead !== k.lastLeader && R < straight && R > 30) { S.say(sim, t, `${lead.h.name}が先頭に立つ！`, 'lead'); }
    if (!k.f400 && R <= 400 && R > 0) { k.f400 = true; const second = ord[1]; if (second && lead.x - second.x > 6) S.say(sim, t, `${lead.h.name}、リードは${Math.round((lead.x - second.x) / LEN)}馬身！`, 'mid'); else if (second) S.say(sim, t, `${lead.h.name}と${second.h.name}の叩き合い！`, 'duel'); }
    if (!k.f200 && R <= 200 && R > 0) {
      k.f200 = true;
      const closer = ord.slice(1, 6).sort((a, b) => b.v - a.v)[0];
      if (closer && closer.v > lead.v + 0.4) S.say(sim, t, `外から${closer.h.name}が猛然と追い込む！`, 'duel');
    }
    k.lastLeader = k.lastLeader ? lead : k.lastLeader;
  };

  // ラップの区切り：ゴールから200mごと（距離が200で割り切れないときは、最初の区切りが端数）。ゴールそのものは入れない（最後は勝ち時計まで）
  S.lapMarks = function (D) {
    const out = [];
    let m = D % 200; if (m < 1) m = 200;
    for (; m < D - 0.5; m += 200) out.push(m);
    return out;
  };
  // 結果をまとめる
  S.finish = function (sim) {
    const { st, D, opts, events } = sim;
    const t = sim.t;
    // まだゴールしていない馬（大差）を片づける
    for (const s of st) if (!s.done) { s.finishT = t + (D - s.x) / Math.max(5, s.v); s.done = true; }
    if (opts.frames) sim.frames.push({ t: t + DT, p: st.map(s => [s.x, s.lane, s.v]) });
    const ranked = st.slice().sort((a, b) => a.finishT - b.finishT);
    const winner = ranked[0];
    const results = ranked.map((s, k) => {
      const prev = ranked[k - 1];
      const lengths = prev ? (s.finishT - prev.finishT) * s.vc / LEN : 0;
      return {
        pos: k + 1, num: s.r.num, frame: s.r.frame, horse: s.h, jockey: s.r.jockey, weight: s.r.weight,
        time: s.finishT, margin: k === 0 ? '' : U.margin(lengths), lengths, last3f: s.t600 != null ? s.finishT - s.t600 : null,
        late: s.late, blocked: s.blockedOnce && s.blocked !== 0, power: s.A, endE: s.E, rider: s.r.rider || null,
      };
    });
    const win = results[0];
    const second = results[1];
    let finishText = `${win.horse.name}、1着でゴールイン！`;
    if (second && second.lengths < 0.1) finishText = `${win.horse.name}と${second.horse.name}、並んでゴール！ 写真判定……${win.horse.name}がハナ差で制した！`;
    else if (second && second.lengths >= 5) finishText = `${win.horse.name}、圧勝！ ${second.margin}馬身突き放してゴール！`;
    S.say(sim, winner.finishT, finishText, 'finish');
    events.sort((a, b) => a.t - b.t);
    // ラップの通過の時刻（先頭が区切りを過ぎた時刻。過ぎなかった区切りから先は無い）
    const splits = [];
    for (const x of sim.splits) { if (x == null) break; splits.push(x); }
    return { results, events, frames: opts.frames ? sim.frames : null, D, straight: sim.straight, lap: sim.geo.lap, winnerTime: win.time, splits };
  };
})();
