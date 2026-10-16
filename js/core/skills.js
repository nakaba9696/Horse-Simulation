// 発動する特殊能力。レース中の決まった場面（区間・順位・ムチ・位置・ペース・叩き合い）で効き目が出る。
// どれを持つかは能力値から自動で決まる（持てる数は総合の力で1〜4。多いときは系統を1つずつ回して選ぶ）。
// 効き目は「一時の速さ↑」か「スタミナを少し戻す」。損なものは速さ↓・スタミナ↓・よれる。
// 手書きの特殊能力（horse.js の H.SKILLS、名馬の表）はそのまま。ここは別に足すもの
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse;
  const K = HS.Skills = {};
  const LEN = 2.4;
  const SASHI = ['差し', '追込'];

  // at：調べる区間（start＝スタートから4秒、mid＝直線の前、st＝直線、any＝いつも）。group：爆発・損・速さ・気性・根性（この順に1つずつ回して選ぶ）。
  // fx：spd＝速さの倍率と秒（free なら脚を使わず、出だしの消耗も軽い）、top＝終いの伸びの上限を上げる（ためた脚を使い切れる。脚が残っていないと効かない）、E＝スタミナの増減、drift＝よれる（進路を外へ）、pos＝隊列の位置の目標を前へ（m）。ikki＝一気系（1レースに1つだけ発動）
  // 身につく条件は、史実馬のうち持つ馬が5〜25%（弱みは少なめ）になるように合わせた（tools/skills_bench.js count）
  K.LIST = [
    // 爆発
    { id: 'saikoubi', at: 'st', label: '最後方一気', group: '爆発', ikki: true, note: '直線で最後方近くからムチを入れると、大きく伸びる', fx: { spd: 0.07, sec: 4, free: true, top: 0.3 },
      learn: p => p.style === '追込' && p.kire >= 6,
      when: x => x.inStraight && x.R > 100 && x.rank >= x.n - 2 && x.whipping },
    { id: 'chokusen', at: 'st', label: '直線一気', group: '爆発', ikki: true, note: '直線で中団より後ろからムチを入れると伸びる', fx: { spd: 0.05, sec: 4, free: true, top: 0.2 },
      learn: p => SASHI.includes(p.style) && p.kire >= 6,
      when: x => x.inStraight && x.R > 100 && x.rank > x.n / 2 && x.whipping },
    { id: 'oosoto', at: 'st', label: '大外一気', group: '爆発', ikki: true, note: '直線で外に持ち出してムチを入れると伸びる', fx: { spd: 0.045, sec: 4, free: true, top: 0.2 },
      learn: p => SASHI.includes(p.style) && p.slope >= 82,
      when: x => x.inStraight && x.R > 100 && x.s.lane >= 5 && x.whipping },
    { id: 'bagun', at: 'st', label: '馬群割り', group: '爆発', note: '直線で馬と馬の間を、まわりより速く抜ける', fx: { spd: 0.05, sec: 3, free: true },
      learn: p => p.style !== '逃げ' && p.guts >= 88,
      when: x => x.inStraight && x.R > 60 && x.left && x.right && x.faster },
    // 損
    { id: 'sasari', at: 'any', label: 'ささり癖', group: '損', bad: true, note: '脚が無いときにムチを入れると、ムチと反対へよれる', fx: { spd: -0.025, sec: 1.5, drift: 1 },
      learn: p => p.mind < 64 && p.guts < 76,
      when: x => x.c ? x.c.lastWhip && x.t - x.c.lastWhip.t < 0.15 && x.s.E < 0.12 : x.whipping && x.s.E < 0.15 },
    { id: 'kongomi', at: 'any', label: '馬混み嫌い', group: '損', bad: true, note: '馬群に包まれたままだと、やる気をなくす', fx: { E: -0.03 },
      learn: p => p.mind < 70 && (p.style === '逃げ' || p.style === '追込'),
      when: x => x.sk.boxedFor >= 3 },
    { id: 'sessenB', at: 'st', label: '接戦に弱い', group: '損', bad: true, note: 'ゴール前で並ばれると、ひるむ', fx: { spd: -0.015, sec: 1.5 },
      learn: p => p.guts < 70,
      when: x => x.R < 100 && x.close },
    // 速さ
    { id: 'isshun', at: 'st', label: '一瞬の切れ', group: '速さ', note: '残り150mで2番手以下なら、ひと伸び', fx: { spd: 0.06, sec: 2.5, free: true },
      learn: p => p.style !== '逃げ' && p.kire >= 6 && p.spd >= 85,
      when: x => x.R <= 150 && x.rank >= 2 && (x.whipping || x.s.spurting) },
    { id: 'hanno', at: 'st', label: '瞬間の反応', group: '速さ', note: '直線までムチを使わず、直線に入ってすぐムチを入れると一気に伸びる', fx: { spd: 0.045, sec: 3, free: true },
      learn: p => p.kire >= 7 || (p.kire >= 6 && p.mind >= 82),
      when: x => x.inStraight && x.straight - x.R < 100 && x.whipping && !x.sk.whipBefore },
    { id: 'startdash', at: 'start', label: 'スタートダッシュ', group: '速さ', note: 'うまく出ると、すっと前へ行く', fx: { spd: 0.06, sec: 3, pos: 2, free: true },
      learn: p => p.mind >= 82 && (p.style === '逃げ' || p.style === '先行'),
      when: x => x.t - x.s.delay < 0.6 && x.s.delay < 0.25 && !x.s.late },
    { id: 'nebari', at: 'st', label: '逃げ粘り', group: '速さ', note: '残り600mで先頭にいた馬が、残り300mからつかまりかけると、もうひと踏ん張り', fx: { spd: 0.05, sec: 3.5, free: true },
      learn: p => (p.style === '逃げ' || p.style === '先行') && p.sta >= 85,
      when: x => x.R <= 300 && x.sk.led600 && x.rank <= 3 && x.leader.x - x.s.x < LEN },
    // 気性
    { id: 'tanki', at: 'mid', label: '単騎逃げ', group: '気性', note: '後ろを2馬身以上離して逃げると、気分よく走る', fx: { E: 0.06 },
      learn: p => p.style === '逃げ' && p.mind >= 65,
      when: x => !x.inStraight && x.sk.soloFor >= 10 },
    { id: 'yonkaku', at: 'st', label: '4角先頭', group: '気性', note: '先頭で直線に入ると、脚が戻る', fx: { E: 0.05 },
      learn: p => (p.style === '先行' || p.style === '差し') && p.spd >= 86 && p.kire <= 4,
      when: x => x.inStraight && x.straight - x.R < 30 && x.rank === 1 },
    { id: 'oriai', at: 'mid', label: '折り合い上手', group: '気性', note: '中間点まで一度も掛からなければ、脚が残る', fx: { E: 0.02 },
      learn: p => p.mind >= 85,
      when: x => x.D >= 1600 && x.s.x >= x.D / 2 && !x.sk.kakari && !(x.c && x.c.everKakari) },
    // 根性
    { id: 'nimai', at: 'st', label: '二枚腰', group: '根性', note: '先頭でゴール前、2番手に詰め寄られると、もう一度伸びる', fx: { E: 0.05, spd: 0.025, sec: 2, free: true },
      learn: p => p.style === '逃げ' && p.guts >= 82,
      when: x => x.R < 300 && x.rank === 1 && x.second && x.s.x - x.second.x < LEN },
    { id: 'demuchi', at: 'start', label: '出ムチ', group: '根性', note: 'スタート直後にムチを入れると、前へ行ける', fx: { spd: 0.05, sec: 2.5, pos: 1.5, free: true },
      learn: p => (p.style === '逃げ' || p.style === '先行') && p.guts >= 86,
      when: x => x.t - x.s.delay < 3 && (x.c ? x.c.whips > 0 : true) },
    { id: 'makuri', at: 'st', label: 'まくり', group: '根性', note: '3コーナーから順位を上げ、先頭の2馬身以内で直線に入ると、脚が戻る', fx: { E: 0.06 },
      learn: p => SASHI.includes(p.style) && p.kire <= 4 && p.sta >= 78,
      when: x => x.inStraight && x.straight - x.R < 30 && x.sk.rankMid != null && x.sk.rankMid - x.rank >= 4 && x.leader.x - x.s.x < 2 * LEN },
    { id: 'dokonjo', at: 'any', label: 'ど根性', group: '根性', note: '追い出してから3秒叩き合うと、脚が戻る', fx: { E: 0.02 },
      learn: p => p.guts >= 88,
      when: x => x.sk.duelFor >= 3 },
    { id: 'sessen', at: 'st', label: '接戦巧者', group: '根性', note: 'ゴール前で並ぶと、ひと伸び', fx: { spd: 0.03, sec: 2.5, free: true },
      learn: p => p.guts >= 86,
      when: x => x.R < 100 && x.close },
  ];
  K.BY = {}; K.LIST.forEach(k => { K.BY[k.id] = k; });
  K.ORDER = ['爆発', '損', '速さ', '気性', '根性'];

  // 習得の材料（能力値）。芝・ダートは高いほう
  K.stats = function (h, wIdx) {
    const c = wIdx != null && H.cur ? H.cur(h, wIdx) : h.pot || {};
    const spd = Math.max(c.spd || 0, c.dspd || 0), sta = Math.max(c.sta || 0, c.dsta || 0);
    return { spd, sta, guts: c.guts || 0, mind: c.mind || 0, slope: c.slope || 0, kire: h.kire || 4, style: h.style };
  };
  // 持てる数：総合の力で1〜4
  K.cap = p => { const a = (p.spd + p.sta + p.guts) / 3; return a < 65 ? 1 : a < 78 ? 2 : a < 90 ? 3 : 4; };
  // この馬の発動する特殊能力（id の並び）
  K.of = function (h, wIdx) {
    if (!h) return [];
    if (h.trigFixed) return h.trigFixed.slice(); // オリジナルホースは親から受け継いだもの
    const p = K.stats(h, wIdx);
    // 系統を1つずつ回して取る（爆発 → 損 → 速さ → 気性 → 根性 → 爆発…）。系統の中は表の順
    const ok = K.ORDER.map(g => K.LIST.filter(k => k.group === g && k.learn(p)));
    const cap = K.cap(p), out = [];
    for (let round = 0; out.length < cap; round++) {
      let any = false;
      for (const g of ok) { if (g[round]) { any = true; if (out.length < cap) out.push(g[round].id); } }
      if (!any) break;
    }
    return out;
  };
  K.label = id => (K.BY[id] || H.SKILLS[id] || { label: id }).label;
  K.isBad = id => !!(K.BY[id] || H.SKILLS[id] || {}).bad;
  K.note = id => (K.BY[id] || H.SKILLS[id] || {}).note || '';

  // レースの初めに、各馬の発動の特殊能力を決める
  K.setup = function (sim) {
    for (const s of sim.st) { s.trig = K.of(s.h, sim.wIdx); s.sk = { boxedFor: 0, soloFor: 0, duelFor: 0, led600: false, rankMid: null, whipBefore: false, ikki: false }; }
  };

  const X = { sim: null, s: null, c: null, t: 0, D: 0, R: 0, straight: 0, inStraight: false, rank: 0, n: 0, whipping: false, left: false, right: false, faster: false, close: false, leader: null, second: null, sk: null };
  // 0.1 秒ごと。order＝まだ走っている馬の、前から順の並び
  K.step = function (sim, order, DT) {
    const { D, straight, st, t } = sim;
    const n = st.length;
    const leader = order[0], second = order[1];
    const near = [];
    for (let k = 0; k < order.length; k++) {
      const s = order[k];
      if (s.done || !s.trig || !s.trig.length || t < s.delay) continue;
      const R0 = D - s.x, ph = R0 <= straight + 30 ? 'st' : t - s.delay < 4 ? 'start' : 'mid';
      let need = k < 2 || (s.x >= D * 0.5 && s.sk.rankMid == null);
      for (let q = 0; q < s.trig.length && !need; q++) { const id = s.trig[q], a = K.BY[id].at; if (!s.fired[id] && (a === ph || a === 'any')) need = true; }
      if (!need) continue;
      const me = s.me && sim.ctl ? sim.ctl : null;
      const R = D - s.x, inStraight = R <= straight && R > 0;
      const rank = k + 1;
      const sk = s.sk;
      const whipping = me ? t < me.whipUntil : s.spurting && inStraight;
      if (me && whipping && !inStraight) sk.whipBefore = true;
      // まわり（前 5m・後ろ 3m）の馬。order は前から順なので、近くだけ見る
      near.length = 0;
      for (let q = k - 1; q >= 0 && order[q].x - s.x < 5; q--) near.push(order[q]);
      for (let q = k + 1; q < order.length && s.x - order[q].x < 3; q++) near.push(order[q]);
      let left = false, right = false, front = false, close = false, faster = true;
      for (const o of near) {
        const dl = o.lane - s.lane, dx = o.x - s.x;
        if (dx > 0 && Math.abs(dl) < 0.9) front = true;
        if (dx >= 3) continue;
        if (dl < -0.4 && dl > -1.6) left = true;
        if (dl > 0.4 && dl < 1.6) right = true;
        if (Math.abs(dx) < 1.2 && Math.abs(dl) < 1.6) close = true;
        if (o.v >= s.v) faster = false;
      }
      // 続いている状態の秒（包まれる：前と外に馬がいて、内も馬か内ラチ）
      sk.boxedFor = (left || s.lane < 0.5) && right && front ? sk.boxedFor + DT : 0;
      sk.soloFor = rank === 1 && second && s.x - second.x >= 2 * LEN ? sk.soloFor + DT : 0;
      sk.duelFor = (s.spurting || (me && me.gear > 0.3)) && close ? sk.duelFor + DT : 0;
      if (rank === 1 && R <= 600 && R > 300) sk.led600 = true;
      if (sk.rankMid == null && s.x >= D * 0.5) sk.rankMid = rank;
      if (s.kakari && s.x < D * 0.5 && !me) sk.kakari = true;
      const x = X; x.sim = sim; x.s = s; x.c = me; x.t = t; x.D = D; x.R = R; x.straight = straight; x.inStraight = inStraight; x.rank = rank; x.n = n;
      x.whipping = whipping; x.left = left; x.right = right; x.faster = faster; x.close = close; x.leader = leader; x.second = second; x.sk = sk;
      for (const id of s.trig) {
        if (s.fired[id]) continue;
        const def = K.BY[id];
        if (def.at !== ph && def.at !== 'any') continue;
        if (def.ikki && sk.ikki) continue; // 一気系は1レースに1つだけ
        if (!def.when(x)) continue;
        if (def.ikki) sk.ikki = true;
        HS.Sim.fire(sim, s, id);
        K.apply(sim, s, def);
      }
    }
  };
  // 一気系は、ためた脚（発動したときのスタミナ）で伸びが変わる：倍率 a＋b×スタミナ（lo〜hi）。後ろでためて直線で使うと大きく、早めに脚を使ったあとだと小さい
  K.IKKI = { a: 0.4, b: 2, lo: 0.6, hi: 1.6 };
  K.apply = function (sim, s, k) {
    const f = k.fx;
    const amp = k.ikki ? U.clamp(K.IKKI.a + K.IKKI.b * s.E, K.IKKI.lo, K.IKKI.hi) : 1;
    if (f.spd) s.boost = { mul: 1 + f.spd * amp, until: sim.t + (f.sec || 1.5), id: k.id, free: !!f.free }; // free：脚を使わない速さ（スタートの能力）
    if (f.free && k.at === 'start') s.easyStart = true; // 楽に位置を取れたので、出だし（距離の22%まで）の脚の使い方が軽い
    if (f.top) s.topAdd = (s.topAdd || 0) + f.top;
    if (f.E) s.E = U.clamp(s.E + f.E, -0.2, 1);
    if (f.drift && s.me && sim.ctl && sim.ctl.lastWhip) sim.ctl.lane = U.clamp(sim.ctl.lane + sim.ctl.lastWhip.away * f.drift, 0, 12);
    else if (f.drift) s.driftLane = (s.driftLane || 0) + f.drift * 1.5; // AI の馬は外へよれる（進路の目標が外へずれる）
    if (f.pos) s.gapAdj = (s.gapAdj || 0) - f.pos; // 隊列で、先頭からの差の目標を前へ
  };
})();
