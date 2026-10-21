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
  // 番手×・二段ロケット・馬群さばき・幻惑逃げ・息入れ○・後方待機○・追走○・外回し○は、逃げと追込に足したもの（持ち主の決定 2026-10-17「逃げと追込は位置取りがピーキーなので、この2つに足す」。先行は増やさない）。
  // 逃げ・追込の馬は持てる数がいっぱいになるので、系統の中の前のほうに置いて、その脚質の中で持つ馬の割合を合わせた
  K.LIST = [
    // 爆発
    { id: 'saikoubi', at: 'any', label: '豪脚', labelEn: 'Thunder Kick', noteEn: 'From 500m out, whipping from near the back gives a huge surge (set by distance left, not straight length)', group: '爆発', ikki: true, note: '残り500mから、最後方近くでムチを入れると大きく伸びる（直線の長さに関係なく、残りの距離で決まる）', fx: { spd: 0.07, sec: 4, free: true, top: 0.3 },
      learn: p => p.style === '追込' && p.kire >= 6,
      when: x => x.R <= 500 && x.R > 100 && x.rank >= x.n - 2 && (x.c ? x.whipping : x.s.spurting) }, // AI は直線の外でも追い出していれば
    { id: 'chokusen', at: 'st', label: '直線一気', labelEn: 'Straight Charge', noteEn: 'Whipping in the straight from mid-pack or further back gives a surge', group: '爆発', ikki: true, note: '直線で中団より後ろからムチを入れると伸びる', fx: { spd: 0.05, sec: 4, free: true, top: 0.2 },
      learn: p => SASHI.includes(p.style) && p.kire >= 6,
      when: x => x.inStraight && x.R > 100 && x.rank > x.n / 2 && x.whipping },
    { id: 'oosoto', at: 'st', label: '大外一気', labelEn: 'Wide Charge', noteEn: 'Swinging wide in the straight and whipping gives a surge', group: '爆発', ikki: true, note: '直線で外に持ち出してムチを入れると伸びる', fx: { spd: 0.045, sec: 4, free: true, top: 0.2 },
      learn: p => SASHI.includes(p.style) && p.slope >= 82,
      when: x => x.inStraight && x.R > 100 && x.s.lane >= 5 && x.whipping },
    // 損
    { id: 'sasari', at: 'any', label: 'ささり癖', labelEn: 'Lugging In', noteEn: 'Whipping with nothing left makes it lug in and lose drive (its line does not change)', group: '損', bad: true, note: '脚が無いときにムチを入れると、ささって伸びを欠く（進路は変わらない）', fx: { spd: -0.035, sec: 1.5 },
      learn: p => p.mind < 64 && p.guts < 76,
      when: x => x.c ? x.c.lastWhip && x.t - x.c.lastWhip.t < 0.15 && x.s.E < 0.12 : x.whipping && x.s.E < 0.15 },
    { id: 'kongomi', at: 'any', label: '馬込み×', labelEn: 'Hates Traffic', noteEn: 'Loses heart when kept boxed in', group: '損', bad: true, note: '馬群に包まれたままだと、やる気をなくす', fx: { E: -0.03 },
      learn: p => p.mind < 70 && (p.style === '逃げ' || p.style === '追込'),
      when: x => x.sk.boxedFor >= 3 },
    { id: 'bante', at: 'mid', label: '番手×', labelEn: 'Must Lead', noteEn: 'Loses heart when it cannot lead and races second or worse', group: '損', bad: true, note: '逃げられず、2番手より後ろで道中を運ぶと、やる気をなくす', fx: { E: -0.03 },
      learn: p => p.style === '逃げ' && p.mind < 72,
      when: x => x.sk.banteFor >= 10 },
    { id: 'sessenB', at: 'st', label: '叩き合い×', labelEn: 'Shies in Duels', noteEn: 'Flinches when another horse draws level near the line', group: '損', bad: true, note: 'ゴール前で並ばれると、ひるむ', fx: { spd: -0.015, sec: 1.5 },
      learn: p => p.guts < 70,
      when: x => x.R < 100 && x.close },
    // 速さ
    { id: 'isshun', at: 'st', label: '切れ味', labelEn: 'Sharp Kick', noteEn: 'A late burst if second or worse with 150m left', group: '速さ', note: '残り150mで2番手以下なら、ひと伸び', fx: { spd: 0.06, sec: 2.5, free: true },
      learn: p => p.style !== '逃げ' && p.kire >= 6 && p.spd >= 85,
      when: x => x.R <= 150 && x.rank >= 2 && (x.whipping || x.s.spurting) },
    { id: 'hanno', at: 'st', label: '抜群の反応', labelEn: 'Instant Response', noteEn: 'No whip until the straight, then whip right away for a big surge', group: '速さ', note: '直線までムチを使わず、直線に入ってすぐムチを入れると一気に伸びる', fx: { spd: 0.045, sec: 3, free: true },
      learn: p => p.kire >= 7 || (p.kire >= 6 && p.mind >= 82),
      when: x => x.inStraight && x.straight - x.R < 100 && x.whipping && !x.sk.whipBefore },
    { id: 'startdash', at: 'start', label: 'ロケットスタート', labelEn: 'Rocket Start', noteEn: 'A clean break takes it straight to the front', group: '速さ', note: 'うまく出ると、すっと前へ行く', fx: { spd: 0.06, sec: 3, pos: 2, free: true },
      learn: p => p.mind >= 82 && (p.style === '逃げ' || p.style === '先行'),
      when: x => x.t - x.s.delay < 0.6 && x.s.delay < 0.25 && !x.s.late },
    { id: 'nebari', at: 'st', label: '二の脚', labelEn: 'Second Wind', noteEn: 'Led at 600m out and being caught from 300m out: digs in once more', group: '速さ', note: '残り600mで先頭にいた馬が、残り300mからつかまりかけると、もうひと踏ん張り', fx: { spd: 0.05, sec: 3.5, free: true },
      learn: p => (p.style === '逃げ' || p.style === '先行') && p.sta >= 85,
      when: x => x.R <= 300 && x.sk.led600 && x.rank <= 3 && x.leader.x - x.s.x < LEN },
    { id: 'nidan', at: 'st', label: '二段ロケット', labelEn: 'Second Stage', noteEn: 'Leading into the straight by a length or more: kicks again', group: '速さ', note: '先頭で直線に入り、2番手を1馬身以上離していれば、もうひと伸び', fx: { spd: 0.08, sec: 4, free: true },
      learn: p => p.style === '逃げ' && p.spd >= 80,
      when: x => x.inStraight && x.straight - x.R < 30 && x.rank === 1 && x.second && x.s.x - x.second.x >= LEN },
    { id: 'sabaki', at: 'st', label: '馬群さばき', labelEn: 'Gap Finder', noteEn: 'Finds a way through a wall in the straight; hard to block from the side', group: '速さ', note: '直線で前が壁になっても、すぐ進路を見つけて伸びる。横の馬に止められにくい', fx: { spd: 0.03, sec: 2.5, free: true },
      learn: p => p.style === '追込' && p.spd < 85 && p.mind >= 70,
      when: x => x.inStraight && x.R > 100 && x.sk.wallFor >= 0.6 && !x.wall },
    // 気性
    { id: 'genwaku', at: 'any', label: '幻惑逃げ', labelEn: 'Pace Trick', noteEn: 'Leading at the pace checkpoint in a slow pace drains closers behind', group: '気性', note: 'ペースのチェックポイントを先頭で通り、スローなら、後ろの差し・追込の馬が脚を使わされる', fx: { foeE: -0.05, foe: SASHI },
      learn: p => p.style === '逃げ' && p.mind >= 84,
      when: x => !!x.sim.check && x.sim.check.lead === x.s.i && x.sim.check.verdict === 'スローペース' },
    { id: 'ikiire', at: 'mid', label: '息入れ○', labelEn: 'Breather', noteEn: 'Leading round the final turn lets it catch its breath', group: '気性', note: '3〜4コーナーを先頭で回ると、ひと息入って脚が戻る', fx: { E: 0.05 },
      learn: p => p.style === '逃げ' && p.sta >= 84 && p.mind < 84,
      when: x => !x.inStraight && x.R <= x.straight + 350 && x.rank === 1 },
    { id: 'tanki', at: 'mid', label: '単騎逃げ', labelEn: 'Lone Leader', noteEn: 'Running happily when two lengths clear in front', group: '気性', note: '後ろを2馬身以上離して逃げると、気分よく走る', fx: { E: 0.06 },
      learn: p => p.style === '逃げ' && p.mind >= 65,
      when: x => !x.inStraight && x.sk.soloFor >= 10 },
    { id: 'kouhou', at: 'mid', label: '後方待機○', labelEn: 'Patient Closer', noteEn: 'Last three at halfway without pulling: recovers stamina', group: '気性', note: '中間点まで後ろから3頭以内で、掛からずに運ぶと、脚が戻る', fx: { E: 0.025 },
      learn: p => p.style === '追込' && p.mind >= 76,
      when: x => x.s.x >= x.D / 2 && x.sk.rankMid != null && x.sk.rankMid >= x.n - 2 && !x.sk.kakari && !(x.c && x.c.everKakari) },
    { id: 'yonkaku', at: 'st', label: '四角先頭', labelEn: 'Turn Leader', noteEn: 'Entering the straight in front recovers stamina', group: '気性', note: '先頭で直線に入ると、脚が戻る', fx: { E: 0.05 },
      learn: p => (p.style === '先行' || p.style === '差し') && p.spd >= 86 && p.kire <= 4,
      when: x => x.inStraight && x.straight - x.R < 30 && x.rank === 1 },
    { id: 'oriai', at: 'mid', label: '折り合い上手', labelEn: 'Settles Well', noteEn: 'No pulling until halfway: saves stamina', group: '気性', note: '中間点まで一度も掛からなければ、脚が残る', fx: { E: 0.02 },
      learn: p => p.mind >= 85,
      when: x => x.D >= 1600 && x.s.x >= x.D / 2 && !x.sk.kakari && !(x.c && x.c.everKakari) },
    // 根性
    { id: 'nimai', at: 'st', label: '差し返し', labelEn: 'Fights Back', noteEn: 'In front near the line and pressed by the second: kicks again', group: '根性', note: '先頭でゴール前、2番手に詰め寄られると、もう一度伸びる', fx: { E: 0.05, spd: 0.025, sec: 2, free: true },
      learn: p => p.style === '逃げ' && p.guts >= 82,
      when: x => x.R < 300 && x.rank === 1 && x.second && x.s.x - x.second.x < LEN },
    { id: 'demuchi', at: 'start', label: '出ムチ○', labelEn: 'Early Whip', noteEn: 'Whipping right after the start sends it forward', group: '根性', note: 'スタート直後にムチを入れると、前へ行ける', fx: { spd: 0.05, sec: 2.5, pos: 1.5, free: true },
      learn: p => (p.style === '逃げ' || p.style === '先行') && p.guts >= 86,
      when: x => x.t - x.s.delay < 3 && (x.c ? x.c.whips > 0 : true) },
    { id: 'makuri', at: 'st', label: '大まくり', labelEn: 'Big Sweep', noteEn: 'Back half at halfway, passes six or more and enters the straight within a length of the lead: recovers and kicks', group: '根性', note: '中間点で後ろ半分にいた馬が、6頭以上抜いて先頭から1馬身以内で直線に入ると、脚が戻ってひと伸び', fx: { E: 0.1, spd: 0.04, sec: 4, free: true },
      learn: p => SASHI.includes(p.style) && p.kire <= 4 && p.sta >= 78,
      when: x => x.inStraight && x.straight - x.R < 30 && x.sk.rankMid != null && x.sk.rankMid > x.n / 2 && x.sk.rankMid - x.rank >= 6 && x.leader.x - x.s.x < LEN },
    // 追走○・外回し○は、条件が続いている間ずっと効く（racesim.js。cont）。発動の印は初めて効いたときに出す
    { id: 'tsuiso', at: 'any', label: '追走○', labelEn: 'Good Follower', noteEn: 'Uses less stamina while tracking a horse just ahead before the straight', group: '根性', cont: true, note: '直線の前、すぐ前に馬がいる間は、脚の減りが少ない', fx: {},
      learn: p => p.style === '追込' && p.guts >= 82,
      when: () => false },
    { id: 'sotomawashi', at: 'any', label: '外回し○', labelEn: 'Wide Runner', noteEn: 'Going wide on the turns costs no extra stamina', group: '根性', cont: true, note: 'コーナーで外を回っても、余分に脚を使わない', fx: {},
      learn: p => p.style === '追込' && p.sta >= 76 && p.guts < 82,
      when: () => false },
    { id: 'dokonjo', at: 'any', label: 'ど根性', labelEn: 'Pure Grit', noteEn: 'Three seconds of a ding-dong battle after the ride starts: recovers stamina', group: '根性', note: '追い出してから3秒叩き合うと、脚が戻る', fx: { E: 0.02 },
      learn: p => p.guts >= 88,
      when: x => x.sk.duelFor >= 3 },
    { id: 'sessen', at: 'st', label: '叩き合い', labelEn: 'Duel Winner', noteEn: 'Draws level near the line: kicks again', group: '根性', note: 'ゴール前で並ぶと、ひと伸び', fx: { spd: 0.03, sec: 2.5, free: true },
      learn: p => p.guts >= 86,
      when: x => x.R < 100 && x.close },
  ];
  K.BY = {}; K.LIST.forEach(k => { K.BY[k.id] = k; });
  K.ORDER = ['爆発', '損', '速さ', '気性', '根性'];

  // 名馬の固有の能力（data/uniques.js。持ち主が選んだ名馬に1頭1つ。持つかどうかは data/uniques.js に名前があるかで決まる）。場面の型（when の名前 → 条件）。持てる数（K.cap）には数えない
  K.UWHEN = {
    leadStraight: x => x.inStraight && x.straight - x.R < 30 && x.rank === 1,
    leadMid: x => !x.inStraight && x.s.x >= x.D / 2 && x.rank === 1,
    duelEnd: x => x.R < 300 && x.close,
    neck: x => x.R < 100 && x.close,
    longStraight: x => x.D >= 2400 && x.inStraight && x.straight - x.R < 30,
    front3: x => x.R <= 400 && x.rank <= 3,
    holdLead: x => x.R < 300 && x.rank === 1 && x.second && x.s.x - x.second.x < LEN,
    posBreak: x => x.inStraight && x.straight - x.R < 30 && x.rank >= 2 && x.rank <= 4,
    bigLead: x => x.inStraight && x.rank === 1 && x.second && x.s.x - x.second.x >= 2 * LEN,
    nearLead: x => x.R <= 400 && x.rank >= 2 && x.leader.x - x.s.x < LEN,
    start: x => x.t - x.s.delay < 0.6 && !x.s.late,
    sprint: x => x.D <= 1400 && x.inStraight && x.straight - x.R < 30 && x.rank <= 3,
    // 2026-10-17 に足した型（持ち主が選んだ名馬の分。差し・追込の名馬と、マイル・逃げ切り・叩き合いの勝ち方）
    mile: x => x.D >= 1400 && x.D <= 2000 && x.inStraight && x.R <= 400 && x.R > 100 && x.rank >= 2 && x.rank <= 6,
    ledAll: x => x.R <= 400 && x.rank === 1 && x.sk.led600,
    wideKick: x => x.inStraight && x.R > 100 && x.rank > x.n / 2 && x.s.lane >= 3,
    chase: x => x.inStraight && x.R <= 400 && x.R > 100 && x.rank >= 2 && x.leader.x - x.s.x < 3 * LEN,
    lateKick: x => x.inStraight && x.R <= 400 && x.R > 100 && x.rank > x.n / 2,
    fromLast: x => x.inStraight && x.R > 100 && x.rank >= x.n - 2,
    boxed: x => x.inStraight && x.R > 100 && x.sk.wallFor >= 0.6 && !x.wall,
    top2: x => x.R <= 200 && x.rank >= 2 && x.rank <= 3,
    breakAway: x => x.inStraight && x.R > 100 && x.R < 400 && x.close,
    backRecover: x => !x.inStraight && x.R <= x.straight + 400 && x.rank > x.n / 2,
    // 2026-10-20 に足した型（代表の一戦・キャリアの勝ち方の再現。docs/review/UNIQUE_PLAN.md。斤量は使わない：持ち主の決定 2026-10-20「斤量条件は難しいので他のに変えてほしい」）
    // midBack＝中間点で後ろ半分だった（x.sk.rankMid は中間点を過ぎた最初の順位）
    lateOrStayer: x => !x.inStraight && x.R <= x.straight + 400 && (x.s.late || x.D >= 3000),
    longHaul: x => !x.inStraight && x.R <= x.straight + 400 && x.D >= 2400,
    fromBackKick: x => x.inStraight && x.R <= 400 && x.R > 100 && x.sk.rankMid != null && x.sk.rankMid > x.n / 2,
    comeback: x => x.inStraight && x.straight - x.R < 30 && x.sk.rankMid != null && x.sk.rankMid > x.n / 2 && x.sk.rankMid - x.rank >= 3,
    chase5: x => x.inStraight && x.R <= 400 && x.R > 100 && x.rank >= 2 && x.leader.x - x.s.x < 5 * LEN,
    longMakuri: x => !x.inStraight && x.R <= x.straight + 600 && x.sk.rankMid != null && x.sk.rankMid > x.n / 2,
    earlyFromBack: x => x.R <= 600 && x.R > 200 && x.rank <= 3 && x.sk.rankMid != null && x.sk.rankMid > x.n / 2,
    moveUp: x => x.inStraight && x.straight - x.R < 30 && x.rank <= 2 && x.sk.rankMid != null && x.sk.rankMid - x.rank >= 2,
    nearOrLead: x => x.R <= 400 && (x.rank === 1 || x.leader.x - x.s.x < LEN),
    front2Late: x => !x.inStraight && x.R <= x.straight + 400 && x.rank <= 2,
    entryFront3: x => x.inStraight && x.straight - x.R < 30 && x.rank <= 3,
    chaseOrLead: x => x.inStraight && x.R <= 400 && x.R > 100 && (x.rank === 1 || x.leader.x - x.s.x < 3 * LEN),
  };
  K.UNIQUES = (HS.DATA && HS.DATA.uniques || []).filter(u => K.UWHEN[u.when]).map(u => Object.assign({}, u, { unique: true, group: '固有', when: K.UWHEN[u.when], whenId: u.when }));
  K.UNIQUE_OF = {}; // 馬名 → 固有の能力
  K.UNIQUES.forEach(u => { K.BY[u.id] = u; K.UNIQUE_OF[u.horse] = u; });
  K.isUnique = id => !!(K.BY[id] && K.BY[id].unique);
  K.hasUnique = name => !!K.UNIQUE_OF[name]; // 固有の能力を持つ名馬か（data/uniques.js に名前があるか）
  K.uniqueOf = h => h && !h.original && K.hasUnique(h.name) ? K.UNIQUE_OF[h.name].id : null;

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
    // オリジナルホースは親から受け継いだもの（無くした特殊能力は外す）。逸話で決めた名馬（データの trig）は、固有の能力を先頭に
    if (h.trigFixed) { const t = h.trigFixed.filter(id => K.BY[id]), u0 = K.uniqueOf(h); return u0 && !t.includes(u0) ? [u0].concat(t) : t; }
    const p = K.stats(h, wIdx);
    const u = K.uniqueOf(h); // data/uniques.js にある名馬は、固有の能力を先頭に（持てる数とは別）
    // 系統を1つずつ回して取る（爆発 → 損 → 速さ → 気性 → 根性 → 爆発…）。系統の中は表の順
    const ok = K.ORDER.map(g => K.LIST.filter(k => k.group === g && k.learn(p)));
    const cap = K.cap(p), out = [];
    for (let round = 0; out.length < cap; round++) {
      let any = false;
      for (const g of ok) { if (g[round]) { any = true; if (out.length < cap) out.push(g[round].id); } }
      if (!any) break;
    }
    // 史実馬は、損な技（ささり癖・馬込み× など）を能力の数から自動で付けない。逸話のある馬だけ trig に手で書く（外部レビューの指摘・持ち主の決定 2026-10-20）
    const own = h.hist ? out.filter(id => !K.BY[id].bad) : out;
    return u ? [u].concat(own) : own;
  };
  K.label = id => (K.BY[id] || H.SKILLS[id] || { label: id }).label;
  K.isBad = id => !!(K.BY[id] || H.SKILLS[id] || {}).bad;
  K.note = id => (K.BY[id] || H.SKILLS[id] || {}).note || '';

  // レースの初めに、各馬の発動の特殊能力を決める
  K.setup = function (sim) {
    for (const s of sim.st) {
      s.trig = K.of(s.h, sim.wIdx);
      s.sk = { boxedFor: 0, soloFor: 0, duelFor: 0, banteFor: 0, wallFor: 0, led600: false, rankMid: null, whipBefore: false, ikki: false };
    }
  };
  // 続いている間ずっと効く能力と、横の動き・前が壁に効く能力の印（racesim.js が見る）。S.create が K.setup のあとに呼ぶ
  K.flags = s => { const t = s.trig || []; s.tsuiso = t.includes('tsuiso'); s.sotoM = t.includes('sotomawashi'); s.sabaki = t.includes('sabaki'); };

  const X = { sim: null, s: null, c: null, t: 0, D: 0, R: 0, straight: 0, inStraight: false, rank: 0, n: 0, whipping: false, left: false, right: false, faster: false, close: false, wall: false, leader: null, second: null, sk: null };
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
      for (let q = 0; q < s.trig.length && !need; q++) { const id = s.trig[q], d = K.BY[id], a = d.at; if (!s.fired[id] && !d.cont && (a === ph || a === 'any')) need = true; }
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
      let left = false, right = false, front = false, close = false, faster = true, wall = false;
      for (const o of near) {
        const dl = o.lane - s.lane, dx = o.x - s.x;
        if (dx > 0 && Math.abs(dl) < 0.9) front = true;
        if (dx > 0 && dx < 2.6 && Math.abs(dl) < 0.85) wall = true; // すぐ前が壁
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
      if (!inStraight && rank >= 3 && s.x > D * 0.2) sk.banteFor += DT; else if (rank <= 2) sk.banteFor = 0; // 番手×：ハナに立てず3番手より後ろ（2番手以内に上がると数え直し）
      if (inStraight && wall) sk.wallFor += DT;
      if (sk.rankMid == null && s.x >= D * 0.5) sk.rankMid = rank;
      if (s.kakariDay && s.x < D * 0.5 && !me) sk.kakari = true;
      const x = X; x.sim = sim; x.s = s; x.c = me; x.t = t; x.D = D; x.R = R; x.straight = straight; x.inStraight = inStraight; x.rank = rank; x.n = n;
      x.whipping = whipping; x.left = left; x.right = right; x.faster = faster; x.close = close; x.wall = wall; x.leader = leader; x.second = second; x.sk = sk;
      for (const id of s.trig) {
        if (s.fired[id]) continue;
        const def = K.BY[id];
        if (def.cont || (def.at !== ph && def.at !== 'any')) continue;
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
    // free：脚を使わない速さ（スタートの能力）。効き目が重なったら強いほう（倍率が高いほう。同じなら長く残るほう）を残す。固有の技の速さが、あとから出たふつうの技に上書きされない（外部レビューの指摘 2026-10-20）
    if (f.spd) {
      const b = { mul: 1 + f.spd * amp, until: sim.t + (f.sec || 1.5), id: k.id, free: !!f.free }, o = s.boost;
      if (!(o && sim.t < o.until && (o.mul > b.mul || (o.mul === b.mul && o.until >= b.until)))) s.boost = b;
    }
    if (f.free && k.at === 'start') s.easyStart = true; // 楽に位置を取れたので、出だし（距離の22%まで）の脚の使い方が軽い
    if (f.top) s.topAdd = (s.topAdd || 0) + f.top;
    if (f.E) s.E = U.clamp(s.E + f.E, -0.2, 1);
    if (f.drift && s.me && sim.ctl && sim.ctl.lastWhip) sim.ctl.lane = U.clamp(sim.ctl.lane + sim.ctl.lastWhip.away * f.drift, 0, 12);
    else if (f.drift) s.driftLane = (s.driftLane || 0) + f.drift * 1.5; // AI の馬は外へよれる（進路の目標が外へずれる）
    if (f.pos) s.gapAdj = (s.gapAdj || 0) - f.pos; // 隊列で、先頭からの差の目標を前へ
    // ほかの馬に効く（幻惑逃げ・影もなし）：後ろの馬のスタミナを減らす（foe があればその脚質だけ）
    if (f.foeE) for (const o of sim.st) if (o !== s && !o.done && o.x < s.x && (!f.foe || f.foe.includes(o.h.style))) o.E = U.clamp(o.E + f.foeE, -0.2, 1);
  };
})();
