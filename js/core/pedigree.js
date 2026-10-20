// 血統：5代の血統表・インブリード（クロス）・ニックス・系統・配合の評価・仔の誕生
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse;
  const P = HS.Ped = {};

  // 系統の根（具体的なものから順に見る）
  P.LINE_ROOTS = ['サンデーサイレンス', 'ロベルト', 'ヘイルトゥリーズン', 'ストームキャット', 'ストームバード', 'ダンジグ', 'サドラーズウェルズ', 'ヌレイエフ', 'リファール', 'ニジンスキー', 'ノーザンテースト', 'ヴァイスリージェント', 'ノーザンダンサー',
    'キングマンボ', 'フォーティナイナー', 'ファピアノ', 'ゴーンウエスト', 'ミスタープロスペクター', 'レイズアネイティヴ', 'ネイティヴダンサー',
    'プリンスリーギフト', 'グレイソヴリン', 'ネヴァーベンド', 'ボールドルーラー', 'レッドゴッド', 'ナスルーラ', 'ロイヤルチャージャー', 'ネアルコ',
    'ハイペリオン', 'セントサイモン', 'トウルビヨン', 'マンノウォー', 'ハンプトン', 'パーソロン', 'テディ', 'ブランドフォード', 'シリーン', 'ファラリス'];

  P.index = new Map();     // 名前 → [父, 母]
  P.extra = {};            // ゲームの中で生まれた馬（セーブに入れる）

  // データから血統の索引を作る（起動時と、ロードのあとに呼ぶ）
  P.build = function (extra) {
    const D = HS.DATA; const idx = new Map();
    const put = (n, s, d, force) => {
      if (!n) return;
      const cur = idx.get(n);
      if (!cur || force) idx.set(n, [s || (cur && cur[0]) || null, d || (cur && cur[1]) || null]);
      else idx.set(n, [cur[0] || s || null, cur[1] || d || null]);
    };
    for (const [n, pd] of Object.entries(D.pedigree || {})) put(n, pd[0], pd[1], true);
    for (const h of D.historic || []) { put(h.name, h.sire, h.dam); if (h.dam && h.damsire) put(h.dam, h.damsire, null); }
    for (const m of D.mares || []) put(m.name, m.sire, m.dam);
    P.extra = extra || P.extra || {};
    for (const [n, pd] of Object.entries(P.extra)) put(n, pd[0], pd[1], true);
    P.index = idx;
    if (HS.Inbreed) HS.Inbreed.reset(); // インブリードの因子の覚え（エディットで史実馬の能力が変わるので、読み直すたびに）
  };
  P.register = function (name, sire, dam) { P.extra[name] = [sire || null, dam || null]; P.index.set(name, [sire || null, dam || null]); };
  P.parents = name => (name && P.index.get(name)) || [null, null];

  // 血統表（世代ごとの配列）。gen1＝[父,母]、gen2＝[父父,父母,母父,母母] …
  P.tree = function (sire, dam, depth) {
    depth = depth || 5;
    const gens = [[sire || null, dam || null]];
    for (let g = 1; g < depth; g++) {
      const prev = gens[g - 1], next = [];
      for (const n of prev) { const pr = P.parents(n); next.push(pr[0], pr[1]); }
      gens.push(next);
    }
    return gens;
  };

  // 父系をたどって系統を決める
  P.lineOf = function (name) {
    let n = name, guard = 0;
    while (n && guard++ < 25) {
      if (P.LINE_ROOTS.includes(n)) return n + '系';
      n = P.parents(n)[0];
    }
    return 'その他';
  };
  // 父系の祖先の一覧（自分を含む）
  P.maleLine = function (name) {
    const out = []; let n = name, guard = 0;
    while (n && guard++ < 25) { out.push(n); n = P.parents(n)[0]; }
    return out;
  };

  // クロス（父方と母方の両方に出る祖先）
  P.crosses = function (sire, dam) {
    const t = P.tree(sire, dam, 5);
    const sireSide = new Map(), damSide = new Map();
    // 世代 g の配列で、前半が父方・後半が母方
    for (let g = 0; g < t.length; g++) {
      const arr = t[g], half = arr.length / 2;
      arr.forEach((n, i) => {
        if (!n) return;
        const m = i < half ? sireSide : damSide;
        if (!m.has(n)) m.set(n, []);
        m.get(n).push(g + 1);
      });
    }
    const out = [];
    for (const [n, sg] of sireSide) {
      if (!damSide.has(n)) continue;
      const dg = damSide.get(n);
      const pct = [...sg, ...dg].reduce((s, g) => s + Math.pow(0.5, g), 0) * 100;
      out.push({ name: n, sire: sg.sort(), dam: dg.sort(), pct, label: `${sg.sort().join('・')}×${dg.sort().join('・')}` });
    }
    // 子孫として重なるもの（サンデーとヘイロー等）は両方出してよいが、血量の多い順に
    out.sort((a, b) => b.pct - a.pct);
    return out;
  };

  // ニックス：父の父系に A、母父の父系に B
  P.nicks = function (sire, dam) {
    const damsire = P.parents(dam)[0];
    if (!sire || !damsire) return [];
    // 父系の近い3代までで見る（遠い祖先どうしでは広く当たりすぎる）
    const sl = P.maleLine(sire).slice(0, 3), dl = P.maleLine(damsire).slice(0, 3);
    return (HS.DATA.nicks || []).filter(([a, b]) => sl.includes(a) && dl.includes(b));
  };

  // 種牡馬の評価値（データの種牡馬・プレイヤーの種牡馬）
  P.sireRating = function (stallion) {
    if (!stallion) return 50;
    if (stallion.rating != null) return stallion.rating;
    return 55;
  };
  // 繁殖牝馬の評価値
  P.mareQuality = function (mare, wIdx) {
    if (mare.quality != null) return mare.quality;
    // 競走馬としてのピークの総合力と、父の格から
    const peak = mare.pot ? H.overall(mare.pot) : 55;
    const sire = HS.World && HS.World.findStallion(mare.sire);
    const sr = sire ? P.sireRating(sire) : 55;
    let q = peak * 0.75 + sr * 0.25;
    if ((mare.gradedWins || []).some(g => g.grade === 'G1')) q += 4;
    return U.clamp(q, 30, 98);
  };

  // 配合の評価（画面に出す）
  P.evaluate = function (stallion, mare) {
    const crosses = P.crosses(stallion.name, mare.name);
    const nicks = P.nicks(stallion.name, mare.name);
    const famous = n => {
      const st = (HS.DATA.stallions || []).find(s => s.name === n);
      return (st && st.rating >= 75) || P.LINE_ROOTS.includes(n);
    };
    let burst = 0, risk = 0; const notes = [];
    for (const c of crosses) {
      const minSire = Math.min(...c.sire), minDam = Math.min(...c.dam);
      if (minSire <= 2 && minDam <= 2 || c.pct > 30) { risk += 3; notes.push(`${c.name} ${c.label}：近すぎる（体質に不安）`); }
      else if (c.pct > 19) { risk += 1.5; burst += famous(c.name) ? 2.5 : 1; notes.push(`${c.name} ${c.label}：濃いめ（爆発力と不安が同居）`); }
      else if (Math.min(...c.sire, ...c.dam) >= 3) { burst += famous(c.name) ? 2 : 0.8; notes.push(`${c.name} ${c.label}：好ましいクロス`); }
      else { burst += 0.5; notes.push(`${c.name} ${c.label}`); }
    }
    burst = Math.min(burst, 5);
    const nickBonus = nicks.length ? 3 : 0;
    for (const n of nicks) notes.push(`ニックス：${n[0]} × ${n[1]}`);
    const sr = P.sireRating(stallion), mq = P.mareQuality(mare);
    const mean = 38 + 0.26 * sr + 0.22 * mq + burst + nickBonus - risk;
    // 距離・馬場の相性（母の適性と父の傾向が離れすぎていると減点）
    let fit = 0;
    if (mare.distMin != null) {
      const mMid = (mare.distMin + mare.distMax) / 2, sMid = (stallion.distMin + stallion.distMax) / 2;
      if (Math.abs(mMid - sMid) > 800) { fit -= 1; notes.push('距離の傾向が父と母で離れている'); }
    }
    const score = mean + fit;
    const rank = score >= 84 ? 'S' : score >= 78 ? 'A' : score >= 72 ? 'B' : score >= 66 ? 'C' : 'D';
    return { crosses, nicks, burst, risk, mean: score, rank, notes, sireLine: P.lineOf(stallion.name), damsireLine: P.lineOf(P.parents(mare.name)[0]) };
  };

  // 仔を作る（産まれた時点）。ev＝評価、rng、year＝生まれ年
  P.makeFoal = function (rng, stallion, mare, year) {
    const ev = P.evaluate(stallion, mare);
    const talent = rng.normal(0, 5.5) + (ev.burst > 0 ? rng.normal(0, ev.burst * 0.6) : 0);
    const prof = { spd: 0, sta: 0, guts: 0, mind: 0, slope: 0 };
    const tr = stallion.traits || [];
    if (tr.includes('スタミナ')) prof.sta += 4;
    if (tr.includes('スピード')) prof.spd += 4;
    if (tr.includes('パワー')) prof.slope += 5;
    if (tr.includes('底力')) prof.guts += 4;
    if (tr.includes('持続力')) { prof.sta += 2; prof.guts += 2; }
    if (tr.includes('気性難')) prof.mind -= 6;
    const pot = {};
    for (const k of H.STATS) {
      // 母が競走馬だったなら、その能力の形も少し受け継ぐ
      let m = 0;
      if (mare.pot && mare.pot[k] != null) m = (mare.pot[k] - H.overall(mare.pot)) * 0.3;
      pot[k] = U.clamp(ev.mean + talent + (prof[k] || 0) + m + rng.normal(0, 4), 25, 106);
    }
    // 適性
    const sSurf = stallion.surface || '芝';
    const sTurf = sSurf === 'ダ' ? 45 : sSurf === '芝ダ' ? 85 : 95, sDirt = sSurf === '芝' ? 50 : sSurf === '芝ダ' ? 85 : 95;
    const mTurf = mare.apt ? mare.apt.turf : (mare.surface === 'ダ' ? 50 : 85), mDirt = mare.apt ? mare.apt.dirt : (mare.surface === 'ダ' ? 95 : 60);
    const apt = {
      turf: U.clamp(sTurf * 0.6 + mTurf * 0.4 + rng.normal(0, 8), 30, 100),
      dirt: U.clamp(sDirt * 0.6 + mDirt * 0.4 + rng.normal(0, 8), 30, 100),
      heavy: U.clamp(50 + rng.normal(0, 18) + (tr.includes('道悪') ? 20 : 0), 10, 100),
    };
    // 芝とダートのスピード・スタミナを、父母から来た芝・ダートの向きで分ける
    H.splitSurface({ pot, apt }, rng);
    // 距離
    const mMin = mare.distMin || stallion.distMin || 1600, mMax = mare.distMax || stallion.distMax || 2400;
    let dMin = Math.round(((stallion.distMin || 1600) * 0.6 + mMin * 0.4 + rng.normal(0, 150)) / 100) * 100;
    let dMax = Math.round(((stallion.distMax || 2400) * 0.6 + mMax * 0.4 + rng.normal(0, 200)) / 100) * 100;
    dMin = U.clamp(dMin, 1000, 3000); dMax = U.clamp(Math.max(dMax, dMin + 400), 1400, 4000);
    // スタミナが高いと長め・スピードが高いと短めに少し寄る
    if (pot.sta - pot.spd > 6) dMax = Math.min(4000, dMax + 200);
    if (pot.spd - pot.sta > 6) dMin = Math.max(1000, dMin - 200);
    // 成長型
    let growth;
    const r = rng.next();
    if (r < 0.5) growth = stallion.growth || '普通';
    else if (r < 0.75) growth = mare.growth || '普通';
    else growth = rng.pick(H.GROWTHS);
    if (!H.GROWTHS.includes(growth)) growth = '普通';
    // 脚質
    // 脚の切れ（父の切れ・持続、母の切れを受け継ぐ）
    const sKire = stallion.kire || (tr.includes('瞬発力') ? 6.5 : tr.includes('持続力') ? 3 : tr.includes('パワー') ? 3.8 : 4.5);
    const kire = U.clamp(Math.round(sKire * 0.6 + (mare.kire || 4.5) * 0.4 + rng.normal(0, 1.1)), 1, 8);
    const style = kire >= 6 ? rng.pick(['差し', '差し', '追込', '先行']) : kire <= 3 ? rng.pick(['逃げ', '先行', '先行', '差し']) : rng.pick(['先行', '差し', '先行', '差し', '逃げ', '追込']);
    let health = U.clamp(75 + rng.normal(0, 12) + (tr.includes('丈夫') ? 10 : 0) + (tr.includes('体質弱') ? -10 : 0) - ev.risk * 6, 10, 100);
    // 特殊能力：親の能力をときどき受け継ぎ、まれに新しく持つ
    const skills = [];
    for (const id of [...(stallion.skills || []), ...(mare.skills || [])]) if (!skills.includes(id) && rng.chance(0.25)) skills.push(id);
    if (rng.chance(0.12)) { const id = rng.pick(H.SKILL_IDS); if (!skills.includes(id)) skills.push(id); }
    return {
      pot, apt, distMin: dMin, distMax: dMax, growth, peakShift: rng.normal(0, 0.2), style, kire, skills, health,
      sex: rng.chance(0.5) ? '牡' : '牝', ev,
    };
  };
})();
