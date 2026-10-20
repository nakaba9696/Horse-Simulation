// オーナーと騎乗依頼（js/core/owners.js・data/owners.js）の検証。仕様書 docs/SPEC.md「騎乗依頼」「持ち主の決定（2026-10-20・オーナーの依頼）」
// 出会いの点（OP 1・G3 2・G2 3・G1 4。4点で出会い）・ミッションの馬とレースが固定・クリアで次の依頼が近づいた週に来る・負けても詰まらない・
// 自動で遊んで数年で何人かと出会いミッションが進む・セーブの往復・前の形のセーブ・依頼の馬はデビューと店に出ない・イロナの花輪（生産可能数＋1）
module.exports = function (check, assert, HS) {
  const W = HS.World, O = HS.Owners, U = HS.U, D = HS.DATA, E = HS.Eraless, H = HS.Horse;
  const QUICK = !!process.env.QUICK;
  const fs = require('fs'), path = require('path');
  const PATTERNS = ['plain', 'hoops', 'stripes', 'sash', 'cross', 'diamonds', 'stars', 'halves', 'yoke'];
  const SCENES = ['offer', 'paddock', 'win', 'bigwin', 'good', 'lose', 'decline'];
  const GENRES = ['local', 'sprint', 'classic', 'long', 'filly', 'usa', 'europe', 'aus'];
  const NEED_KEYS = ['by', 'pos', 'cls', 'region', 'countries', 'eu', 'surface', 'minDist', 'maxDist', 'ages', 'raceSex', 'horseSex', 'styles', 'popMin', 'names', 'set', 'all', 'twice', 'unbeaten', 'streak', 'wonRegion', 'count'];
  const AVOID = /どこか|少しだけ|そっと|ふと|まるで|気がした|胸が温かく|なぜか/;
  const newGame = seed => { W.newGame({ seed, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' }); return W.get(); };
  // 暦を飛ばす（ミッションの週の決まりだけを見るテスト用）
  const jump = (y, m, w) => { const g = W.get(); g.year = y; g.month = m; g.week = w; W._week = null; W._cache = null; W._soon = null; W.dirty(); };
  // 出会いの場面は見たことにする
  const meetOne = id => { O.meet(id, { horse: 'テストホース', race: 'テストのレース' }); O.state().queue = []; };
  const raceData = name => O.raceData(name);
  const R_AGES = ['2', '3', '3+', '4+'];
  const R_label = d => HS.Races.label(d);
  const ageOk = (r, a) => (r.age === '2' ? a === 2 : r.age === '3' ? a === 3 : r.age === '3+' ? a >= 3 : r.age === '4+' ? a >= 4 : a >= 2);

  // お手馬の段階の判定（need）を満たすレースと結果を作る
  function synth(n, g) {
    let race = { key: 'test', name: 'テストステークス', short: 'テストS', region: 'JRA', course: '東京', surface: '芝', dist: 2000, age: '3+', graded: false, year: g.year, month: 5, week: 2 };
    if (n.names) { const d = raceData(n.names[0]); assert(d, `レース ${n.names[0]} が番組に無い`); race = Object.assign({}, d, { key: 'test', year: g.year, graded: !!d.grade, short: d.short || d.name }); }
    if (n.cls) { race.grade = ['', 'G3', 'G2', 'G1'][n.cls]; race.graded = true; }
    if (n.region) race.region = n.region;
    if (n.countries) { race.region = '海外'; race.country = n.countries[0]; }
    if (n.eu) { race.region = '海外'; race.country = '仏'; }
    if (n.surface) race.surface = n.surface;
    if (n.ages) race.age = n.ages[0];
    if (n.raceSex === '牝') race.sex = '牝'; else if (n.raceSex === 'mixed') delete race.sex;
    const k = Math.max(n.streak || 0, n.unbeaten ? 3 : 0, 1);
    const h = { id: 'testh', name: 'テストホース', sex: n.horseSex || '牡', style: (n.styles || ['先行'])[0], born: g.year - 4, owner: 'P', original: n.by === 'orig',
      starts: n.unbeaten || n.streak ? k : k + 2, wins: k, results: Array.from({ length: k }, () => ({ pos: 1 })), gradedWins: [] };
    for (const nm of (n.set || []).concat(n.all || [])) h.gradedWins.push({ y: g.year, race: nm, short: nm, grade: 'G1', region: '海外' });
    if (n.twice) for (const y of [g.year - 1, g.year]) h.gradedWins.push({ y, race: n.names[0], short: n.names[0], grade: 'G1', region: 'JRA' });
    if (n.wonRegion) h.gradedWins.push({ y: g.year - 1, race: '帝王賞', short: '帝王賞', grade: 'G1', region: n.wonRegion });
    return { race, me: { pos: 1, pop: n.popMin || 1, horse: h } };
  }

  check('owners: 仕様書の8つのジャンルに1人ずつ・架空・勝負服・ミッション5つ・アイテム・場面ごとの台詞（印の無い文が必ずある）・避ける癖', () => {
    const L = O.list();
    const genres = L.map(o => O.signOf(o));
    for (const gk of GENRES) assert(genres.includes(gk), `ジャンル ${gk} の人がいない`);
    assert(L.length === 8, `依頼をくれる人 ${L.length}人`);
    const ids = new Set(), names = new Set(), silks = new Set();
    const jockeys = new Set((D.jockeys || []).map(j => j.name));
    for (const o of D.owners) {
      assert(!ids.has(o.id) && !names.has(o.name), '重複 ' + o.name); ids.add(o.id); names.add(o.name);
      assert(!jockeys.has(o.name), `${o.name} が騎手の名前と重なる`);
      assert(/^#[0-9a-f]{6}$/i.test(o.silks.base) && /^#[0-9a-f]{6}$/i.test(o.silks.sub) && PATTERNS.includes(o.silks.pattern), `${o.name} の勝負服`);
      const sk = `${o.silks.base}|${o.silks.sub}|${o.silks.pattern}`; assert(!silks.has(sk), `${o.name} の勝負服がほかと同じ`); silks.add(sk);
    }
    for (const o of L) {
      assert(o.likes.length >= 2 && o.face && o.face.style && o.voice && o.intro && o.look && o.look.moods, `${o.name} の項目が足りない`);
      assert(o.missions && o.missions.length === 5, `${o.name} のミッションが5つでない`);
      const last = o.missions[4];
      assert(last.text && last.say && last.need && ['own', 'orig'].includes(last.need.by), `${o.name} の最後のミッションがお手馬でない`);
      for (const k of Object.keys(last.need)) assert(NEED_KEYS.includes(k), `${o.name} の最後のミッションに知らない判定 ${k}`);
      assert(o.item && o.item.name && o.item.text && o.item.bonus && Object.keys(o.item.bonus).length, `${o.name} のアイテムが無い`);
      for (const sc of SCENES) for (const k of ['near', 'close']) {
        const set = (o.lines[sc] || {})[k] || [];
        assert(set.length >= 1 && set.some(t => !/^\[/.test(t)), `${o.name} の ${sc}.${k} に、印の無い文が無い`);
      }
      for (const k of ['meet', 'm1', 'm2', 'm3', 'm4', 'm5', 'award', 'ask']) assert((o.scenes[k] || []).length >= 1, `${o.name} の場面 ${k} が無い`);
      assert(o.scenes.m5.length >= 4 && o.scenes.meet.length >= 2, `${o.name} の最後か出会いの場面が短い`);
      if (o.portrait) {
        const af = path.join(__dirname, '..', 'assets', `owners_${o.id}.js`);
        const at = fs.existsSync(af) ? fs.readFileSync(af, 'utf8') : '';
        for (const m of ['base', 'smile', 'joy', 'sad']) assert(at.includes(`owner_${o.id}_${m}`), `${o.name} の絵 owner_${o.id}_${m} が無い`);
      }
      const all = JSON.stringify([o.lines, o.scenes, o.intro, o.missions.map(m => m.say)]);
      for (const m of all.matchAll(/\{(\w+)\}/g)) assert(['me', 'horse', 'race'].includes(m[1]), `${o.name} の文に知らない差し込み {${m[1]}}`);
      assert(!AVOID.test(all + o.note), `${o.name} の文に避ける癖の語（${(all + o.note).match(AVOID)}）`);
      assert((all.match(/……/g) || []).length === 0, `${o.name} の文に「……」`);
      assert(!/恋|結婚|(?<!アップ)デート|キス/.test(all), `${o.name} の文に恋愛の言葉`);
      // 画面の言葉は「オーナー」（持ち主の決定 2026-10-20）
      assert(!/馬主|好感度/.test(JSON.stringify([o.lines, o.scenes, o.intro, o.note, o.title, o.missions, o.unlock])), `${o.name} の文に「馬主」「好感度」が残っている`);
    }
    const retired = D.owners.filter(o => o.retired).map(o => o.name);
    return `${L.map(o => `${o.name.split(/[ ・]/)[0]}＝${O.signLabel(o)}`).join('・')}（外した人：${retired.join('・')}）`;
  });

  check('owners: ミッションの馬とレースが決まっている（番組にある OP 以上のレース・データにいる1989〜2026年の史実馬・年齢と性とレースの条件が合う・史実の現役のうち）', () => {
    const pool = new Map(E.pool().map(d => [d.name, d]));   // 包む前の全部は HS.DATA.historic から見る
    const hist = new Map((D.historic || []).map(d => [d.name, d]));
    const seen = new Set();
    let n = 0;
    for (const o of O.list()) for (let k = 0; k < O.JOBS; k++) {
      const m = o.missions[k];
      assert(m.horse && m.race && m.age && m.say, `${o.name} のミッション${k + 1}に馬・レース・年齢・ひと言が無い`);
      assert(!m.need && !m.by, `${o.name} のミッション${k + 1}に前の形の判定が残っている`);
      const d = hist.get(m.horse);
      assert(d && E.isPool(d) && !E.isLegend(d), `${o.name} の依頼の馬 ${m.horse} がデータの1989〜2026年の馬にいない`);
      assert(!seen.has(m.horse), `依頼の馬 ${m.horse} がほかのミッションと重なる`); seen.add(m.horse);
      const r = raceData(m.race);
      assert(r, `${o.name} のレース ${m.race} が番組に無い`);
      const cls = O.classOf(Object.assign({}, r, { graded: !!r.grade }));
      assert(cls === k, `${o.name} のミッション${k + 1}（${O.STAGES[k].label}）のレース ${m.race} の格が ${cls}`);
      assert(ageOk(r, m.age) && (r.sex !== '牝' || d.sex === '牝'), `${m.horse}（${m.age}歳・${d.sex}）が ${m.race}（${r.age}${r.sex || ''}）に出られない`);
      assert(m.age <= (d.retire || d.born + 5) - d.born, `${m.horse} は ${m.age}歳ではもう引退している`);
      assert(!(r.age === '2' && r.region === '海外' && r.country === '豪'), `${m.race} は豪州の2歳 G1（出られない）`);
      if (o.gate !== 'overseas') assert(r.region !== '海外', `海外の印の要らない ${o.name} のミッションが海外のレース`);
      assert(O.missionText(o, k).includes(m.horse) && !/\{/.test(O.missionText(o, k)), `${o.name} のミッション${k + 1}の文`);
      n++;
      void pool;
    }
    // OP の段階のレースは、番組に足した名前のあるオープン
    for (const r of D.ownerRaces) assert(r.cls === 'OP' && !r.grade && D.courses[r.course] && R_AGES.includes(r.age) && r.month >= 1 && r.month <= 12 && r.week >= 1 && r.week <= 4, `名前のあるオープン ${r.name} の項目`);
    return `${n}のミッション（${O.list().map(o => `${o.name.split(/[ ・]/)[0]}：${o.missions.slice(0, 4).map(m => m.horse).join('→')}`).join('／')}）`;
  });
  check('owners: 名前のあるオープンが番組の週に入る（鍵は 年-月-週-レース名）', () => {
    const g = newGame(13);
    const r0 = D.ownerRaces[0];
    jump(g.year, r0.month, r0.week);
    const race = W.weekRaces().find(r => r.name === r0.name);
    assert(race && race.key === `${g.year}-${r0.month}-${r0.week}-${r0.name}` && !race.graded && HS.Races.gradeBadge(race) === (r0.listed ? 'L' : 'OP') && race.prize > 0, `${r0.name} が番組に無いか形が違う`);
    assert(HS.Program && HS.Races.ofWeek(g.seed, g.year, r0.month, r0.week).some(r => r.name === r0.name), '番組表の元（R.ofWeek）に無い');
    return `${r0.name}：${race.key}`;
  });

  check('owners: GF を開いている一族の人（キンチェムモチーフ・本人ではない）：顔・場面のひと言・GF の場面で選べる・花輪のアイテム', () => {
    const d = D.gfHost, F = HS.GFHost;
    assert(d && d.name && d.title && d.note && d.face && d.face.extras.includes('wreath') && d.look && d.look.moods && d.voice && d.intro, '一族の人の項目が足りない');
    assert(!D.owners.some(o => o.id === d.id || o.name === d.name), '一族の人が騎乗依頼のオーナーと重なる');
    for (const k of ['wait', 'invite', 'week', 'win', 'lose', 'allclear', 'kincsem', 'wreath']) assert((d.lines[k] || []).length >= 1, `一族の人の場面 ${k} が無い`);
    assert(d.item && d.item.name && d.item.text && d.item.bonus && d.item.bonus.foals === 1, '花輪のアイテム（生産可能数＋1）が無い');
    const all = JSON.stringify([d.lines, d.hints, d.intro, d.note, d.item]);
    assert(!/キンチェム|化身|生まれ変わり/.test(all), '一族の人をキンチェム本人と言い切る言葉がある');
    assert(/花輪/.test(all) && /ハンガリー/.test(all), 'キンチェムを思わせるモチーフ（花輪・ハンガリー）が無い');
    assert(!AVOID.test(all) && !/……/.test(all) && !/恋|結婚|キス/.test(all), '一族の人の文に避ける癖の語・恋愛の言葉');
    for (const m of all.matchAll(/\{(\w+)\}/g)) assert(['me', 'race', 'horse'].includes(m[1]), `一族の人の文に知らない差し込み {${m[1]}}`);
    newGame(83);
    const sc = F.scene();
    assert(sc === 'wait', `はじめの場面が ${sc}`);
    const ln = F.line('invite', 'classic');
    assert(ln && !/\{/.test(ln) && ln === F.line('invite', 'classic'), `ひと言が選べない・決まらない（${ln}）`);
    const f = path.join(__dirname, '..', 'godot', 'assets', 'owners', `${d.id}_base.svg`);
    assert(fs.existsSync(f), 'Godot 版の顔の SVG が無い');
    return `${d.name}：「${ln}」・${d.item.name}`;
  });

  check('owners: お手馬の段階のミッションの判定：満たす結果で通り、お手馬・オリジナルホースの区別を間違えない', () => {
    const g = newGame(29);
    let n = 0;
    for (const o of O.list()) {
      const m = o.missions[4], x = synth(m.need, g);
      assert(O.needOk(m.need, x.race, x.me), `${o.name} の最後のミッション「${m.text}」が、満たす結果で通らない`);
      assert(!O.needOk(m.need, x.race, Object.assign({}, x.me, { pos: 2 })), `${o.name} の最後のミッションが2着で通る`);
      assert(!O.needOk(m.need, x.race, Object.assign({}, x.me, { horse: Object.assign({}, x.me.horse, { owner: 'AI' }) })), `${o.name} の最後のミッションがお手馬でない馬で通る`);
      if (m.need.by === 'orig') assert(!O.needOk(m.need, x.race, Object.assign({}, x.me, { horse: Object.assign({}, x.me.horse, { original: false }) })), `${o.name} の最後のミッションがオリジナルホースでない馬で通る`);
      n++;
    }
    return `${n}人`;
  });

  check('owners: 出会いの点（OP 1・G3 2・G2 3・G1 4。合わせて4点で出会い）・ジャンルの違う勝ちは数えない・海外の人は海外の印のあと', () => {
    const G = newGame(31);
    assert(O.offers().length === 0 && O.knownList().length === 0, 'はじめから縁のあるオーナーがいる');
    const horse = { id: 'th', name: 'テストホース', sex: '牡', style: '先行', born: G.year - 4, starts: 4, wins: 1 };
    const race = o => Object.assign({ key: 'tr', name: 'テスト', region: 'JRA', surface: '芝', dist: 1200, graded: false, age: '3+', year: G.year, month: G.month, week: G.week }, o);
    const win = o => { O.onResult(race(o), { pos: 1, horse }); O.meetCheck(); };
    // 千石さん（短距離）：1600m の勝ちは数えない。OP 1点 → G3 で 3点 → 2着は数えない → OP で 4点、出会い
    win({ dist: 1600 });
    assert(O.of('sengoku').pts === 0, '1600m の勝ちで千石さんの点が入った');
    win({});
    assert(O.of('sengoku').pts === 1 && !O.known('sengoku'), `OP の勝ちが1点でない（${O.of('sengoku').pts}）`);
    win({ graded: true, grade: 'G3' });
    assert(O.of('sengoku').pts === 3 && !O.known('sengoku'), `G3 の勝ちが2点でない（${O.of('sengoku').pts}）`);
    O.onResult(race({ graded: true, grade: 'G1' }), { pos: 2, horse }); O.meetCheck();
    assert(O.of('sengoku').pts === 3, '2着で点が入った');
    win({});
    assert(O.known('sengoku') && O.of('sengoku').knownAt.y === G.year, '4点で千石さんと縁ができない');
    // 竹之内さん（長距離）：G2 は3点、G1 は1つで4点
    win({ dist: 2400, graded: true, grade: 'G2' });
    assert(O.of('takenouchi').pts === 3 && !O.known('takenouchi'), `G2 の勝ちが3点でない（${O.of('takenouchi').pts}）`);
    newGame(31);
    win({ dist: 3200, graded: true, grade: 'G1' });
    assert(O.known('takenouchi') && !O.known('sengoku'), 'G1 の1勝で竹之内さんと縁ができない（か、ジャンルの違う人と縁ができた）');
    const q = O.state().queue.find(x => x.oid === 'takenouchi' && x.kind === 'meet');
    assert(q && O.sceneLines('takenouchi', 'meet', { horse: q.horse, race: q.race }).length >= 2, '出会いの場面が無い');
    // 海外の人：ダートの G1 で4点たまっても、海外の印の前は出会わない
    O.onResult(race({ surface: 'ダ', dist: 2000, graded: true, grade: 'G1' }), { pos: 1, horse: Object.assign({}, horse, { country: '米' }) }); O.meetCheck();
    assert(O.of('dakota').pts >= O.MEET && !O.known('dakota'), '海外の印の前にダコタさんと縁ができた');
    O.onResult(race({ region: '海外', country: '米', surface: 'ダ', dist: 2000, graded: true, grade: 'G1' }), { pos: 5, horse }); O.meetCheck();
    assert(O.state().flags.overseas && O.known('dakota'), '海外の印のあとでダコタさんと縁ができない');
    return `OP ${O.GAIN[0]}・G3 ${O.GAIN[1]}・G2 ${O.GAIN[2]}・G1 ${O.GAIN[3]}・出会い ${O.MEET}点`;
  });

  check('owners: 出会うと最初のミッションの予定ができ、レースの4週前の週に依頼が来る（依頼の馬がオーナーの馬として出られる年齢で世界に出る）・レースの週は依頼の馬に乗る', () => {
    const G = newGame(37);
    meetOne('sengoku');
    const o = O.by('sengoku'), m = o.missions[0], d = raceData(m.race);
    const j = O.of('sengoku').job;
    assert(j && j.k === 0 && j.horse === m.horse && j.race === d.name && j.m === d.month && j.w === d.week && j.y === G.year && !j.on, `予定が違う（${JSON.stringify(j)}）`);
    assert(j.at === H.weekIndex(j.y, j.m, j.w) - O.LEAD, `依頼の週がレースの${O.LEAD}週前でない`);
    // 依頼の週の前の週は来ない・依頼の週に来る
    const back = w => { let y = j.y, mm = j.m, ww = j.w - w; while (ww < 1) { ww += 4; mm--; } return [y, mm, ww]; };
    jump(...back(O.LEAD + 1)); O.tick();
    assert(!O.of('sengoku').job.on && !W.all().some(h => h.name === m.horse), '依頼の週より前に依頼が来た');
    jump(...back(O.LEAD)); O.tick();
    const jj = O.of('sengoku').job;
    const h = W.horse(jj.hid);
    assert(jj.on && h && h.name === m.horse && h.owner !== 'P' && O.ownerOf(h) === 'sengoku' && h.loc === 'stable', '依頼の週に依頼が来ない（か、依頼の馬がオーナーの馬でない）');
    assert(j.y - h.born === m.age && h.rights && h.rights[d.name] === j.y, `依頼の馬の年齢（${j.y - h.born}）か出走の権利が違う`);
    assert(O.state().queue.some(q => q.kind === 'job' && q.oid === 'sengoku' && q.horse === m.horse) && O.offers().length === 1 && O.offers()[0].inWeeks === O.LEAD, '依頼の場面か一覧が無い');
    const line = O.jobLine('sengoku', O.state().queue.find(q => q.kind === 'job'));
    assert(line && line.includes(m.horse) && !/\{/.test(line), `依頼のひと言（${line}）`);
    // レースの週：出走表に依頼の馬がいて、自分が乗る
    jump(j.y, j.m, j.w);
    const card = W.cardOf(O.jobKey(jj));
    const me = card && card.runners.find(x => x.rider === 'P');
    assert(card && card.ride && me && me.horse.id === jj.hid && O.accepted(card.race.key), 'レースの週に依頼の馬に乗っていない');
    const rep = W.finishWeek({});
    const st = O.of('sengoku');
    const r = rep.races.find(x => x.race.key === card.race.key), pos = r.sim.results.find(x => x.rider === 'P').pos;
    if (pos === 1) assert(st.stage === 1 && st.job && st.job.k === 1 && st.job.horse === o.missions[1].horse, '勝ったのに次のミッションに進まない');
    else assert(st.stage === 0 && st.job && st.job.k === 0 && st.job.y === j.y + 1 && st.job.tries === 1 && !st.job.on, '負けたのに次の年の同じレースにならない');
    assert(st.rides === 1 && st.fees > 0 && O.state().react.length === 1, '騎乗料・ひと言が無い');
    return `${m.horse}で${R_label(d)}（${pos}着）→ ${st.stage ? `次は${st.job.horse}で${st.job.race}` : `${st.job.y}年にもう一度`}`;
  });
  check('owners: クリアすると次のミッションの予定ができ、そのレースが近づいた週に次の依頼が来る（段階は OP→G3→G2→G1→お手馬の順・やり終えると依頼が止まりアイテムが付く）', () => {
    const G = newGame(41);
    meetOne('takenouchi');
    const o = O.by('takenouchi'), st = O.of('takenouchi');
    const money0 = G.player.money;
    for (let k = 0; k < O.JOBS; k++) {
      const j = st.job;
      assert(j && j.k === k && j.horse === o.missions[k].horse, `段階${k}の予定が違う`);
      // 依頼が来た週に飛び、クリアしたことにする
      const at = j.at; jump(Math.floor(at / 48), Math.floor((at % 48) / 4) + 1, at % 4 + 1); O.tick();
      assert(st.job.on, `段階${k}の依頼が来ない`);
      jump(j.y, j.m, j.w);
      O.advance('takenouchi', { horse: j.horse, race: j.race });
      assert(st.stage === k + 1 && st.pts >= (k + 1 >= 5 ? 100 : O.STAGES[k + 1].floor), `ミッション${k + 1}で段階が進まない（${st.stage}・${st.pts}）`);
      assert(O.state().queue.some(q => q.oid === 'takenouchi' && q.kind === 'm' + (k + 1)) && O.sceneLines('takenouchi', 'm' + (k + 1), { horse: 'A', race: 'B' }).length, `ミッション${k + 1}の場面が無い`);
      if (k + 1 === O.WEAR_STAGE) assert(O.canWear('takenouchi'), 'G1 の段階で勝負服が着せられない');
      if (k + 1 < O.JOBS) {
        const nj = st.job, nd = raceData(o.missions[k + 1].race);
        assert(nj && !nj.on && nj.m === nd.month && nj.w === nd.week && H.weekIndex(nj.y, nj.m, nj.w) > H.weekIndex(j.y, j.m, j.w) && nj.at === H.weekIndex(nj.y, nj.m, nj.w) - O.LEAD, `ミッション${k + 2}の予定（${JSON.stringify(nj)}）`);
      } else assert(st.job === null, 'お手馬の段階に馬とレースの予定がある');
    }
    // お手馬の段階：自分の馬で条件を満たすとやり終える
    const x = synth(o.missions[4].need, G);
    O.onResult(x.race, x.me);
    assert(O.done('takenouchi') && st.pts === O.MAX && st.got.item && G.player.money > money0, 'やり終えても、友好度がいっぱい・アイテム・お礼が無い');
    O.tick();
    assert(!O.offers().some(f => f.oid === 'takenouchi') && st.job === null, 'やり終えた人から依頼が来る');
    const h = { pot: { spd: 80, sta: 80, dspd: 80, dsta: 80, guts: 80, mind: 80, slope: 80 }, health: 70, distMax: 2400, kire: 4, apt: { heavy: 50 } };
    const it = O.applyItems(h);
    assert(it.includes(o.item.name) && h.pot.sta === 81 && h.pot.dsta === 81, `アイテムが効かない（${JSON.stringify(h.pot)}）`);
    return `お礼 ${U.money(G.player.money - money0)}`;
  });

  check('owners: 負けても詰まらない（次の年の同じレース・同じ馬が出られなければ出られる年齢で出し直す）・見送ると次の年に・自分の馬と重なると依頼が先で、見送れば自分の馬に戻る', () => {
    const G = newGame(43);
    meetOne('sengoku');
    const st = O.of('sengoku'), m = O.by('sengoku').missions[0];
    let j = st.job;
    jump(Math.floor(j.at / 48), Math.floor((j.at % 48) / 4) + 1, j.at % 4 + 1); O.tick();
    const h1 = W.horse(st.job.hid);
    // 負けた（このレースで自分が依頼の馬に乗って勝てなかった）
    jump(j.y, j.m, j.w);
    O.jobResult({ y: j.y, m: j.m, w: j.w, races: [] });
    assert(st.stage === 0 && st.job.y === j.y + 1 && st.job.tries === 1 && st.fails === 1 && !st.job.on, '負けたあと、次の年の同じレースにならない');
    // 次の年：2歳のレースなので、3歳になった馬は使えない。出られる年齢で出し直す
    j = st.job;
    jump(Math.floor(j.at / 48), Math.floor((j.at % 48) / 4) + 1, j.at % 4 + 1); O.tick();
    const h2 = W.horse(st.job.hid);
    assert(st.job.on && h2 && h2.name === m.horse && j.y - h2.born === m.age && !W.horse(h1.id) && W.all().filter(h => h.name === m.horse).length === 1, '次の年の依頼の馬が出られる年齢でない（か、同じ名前の馬が2頭いる）');
    assert(O.state().queue.some(q => q.kind === 'job' && q.retry), 'やり直しの依頼の場面が無い');
    // 見送る：次の年に
    assert(!O.decline('sengoku') && st.job.y === j.y + 1 && !st.job.on && st.dec === 1, '見送っても次の年にならない');
    // 自分の馬と重なる：G3 の段階（函館スプリントS・3歳以上）で、自分の馬を同じレースに登録しておく
    const G2 = newGame(47);
    meetOne('sengoku'); O.advance('sengoku', {}); O.state().queue = [];
    const s2 = O.of('sengoku'), j2 = s2.job;
    jump(Math.floor(j2.at / 48), Math.floor((j2.at % 48) / 4) + 1, j2.at % 4 + 1); O.tick();
    jump(j2.y, j2.m, j2.w);
    G2.player.money = 1e9;
    const it = W.marketHistoric().find(x => x.horse.sex !== '牝');
    W.buy(it);
    const mine = W.mine()[0];
    Object.assign(mine, { born: G2.year - 4, loc: 'stable', auto: false, fatigue: 0 });
    const key = O.jobKey(j2);
    W._week = null;
    assert(!W.enter(mine.id, key), '自分の馬を依頼のレースに登録できない');
    const card = W.cardOf(key);
    const me = card.runners.find(x => x.rider === 'P');
    assert(me && me.horse.id === j2.hid && !card.runners.some(x => x.horse.id === mine.id) && O.clash(O.offers()[0]) && O.clash(O.offers()[0]).id === mine.id, '依頼が先にならない（自分の馬の出走が取り消されない）');
    assert(!O.decline('sengoku'), '自分の馬に乗る（見送る）ができない');
    const card2 = W.cardOf(key);
    const me2 = card2.runners.find(x => x.rider === 'P');
    assert(me2 && me2.horse.id === mine.id && s2.job.y === j2.y + 1, '見送ったのに自分の馬に戻らない（か、依頼が次の年にならない）');
    return `${m.horse}：2年目は出し直し（${h1.id}→${h2.id}）・重なったら依頼が先`;
  });

  check('owners: まだやり終えていないミッションの依頼の馬は、デビューと馬の店に出ない（クリアしたら出られる）', () => {
    const G = newGame(53);
    const res = O.reserved();
    assert(res.size === O.list().length * O.JOBS, `取っておく馬の数が ${res.size}`);
    assert(!W.all().some(h => res.has(h.name)), '始めたときに依頼の馬がデビューしている');
    assert(!E.market().some(it => res.has(it.horse.name)) && !E.pool().some(d => res.has(d.name)), '依頼の馬が馬の店に並ぶ');
    meetOne('makino'); O.advance('makino', {});
    const r2 = O.reserved();
    assert(!r2.has(O.by('makino').missions[0].horse) && r2.has(O.by('makino').missions[1].horse) && E.pool().some(d => d.name === O.by('makino').missions[0].horse), 'クリアした依頼の馬が店に戻らない');
    void G;
    return `${res.size}頭`;
  });

  check('owners: 少し仲良くなると、頼めば来月の店にその人の好みの馬が並びやすくなる', () => {
    const G = newGame(59);
    meetOne('sengoku');
    const oid = 'sengoku';
    assert(O.ask(oid), '段階 OP で店に頼めた');
    O.of(oid).stage = 1;
    assert(!O.ask(oid), '段階 G3 で店に頼めない');
    const a = G.owners.ask;
    jump(a.y, a.m, 1);
    const shop = HS.Eraless.shop();
    const o = O.by(oid);
    const fit = shop.filter(it => !it.legend && O.fitData(o, it.data)).length;
    const saved = W.serialize();
    G.owners.ask = null; G.shopStock = null;
    const fit0 = HS.Eraless.shop().filter(it => !it.legend && O.fitData(o, it.data)).length;
    W.load(saved);
    assert(fit > fit0 || fit >= O.ASK_N, `頼んでも好みの馬が増えない（${fit0}→${fit}）`);
    return `短距離の馬 ${fit0}→${fit}頭`;
  });

  check('owners: 古いセーブ（オーナーの項目が無い）でも動き、セーブの往復で変わらない', () => {
    newGame(61);
    W.finishWeek({});
    const old = JSON.parse(W.serialize()); delete old.owners;
    W.load(JSON.stringify(old));
    const g = W.get();
    assert(g.owners && g.owners.v === 3 && O.list().every(o => g.owners.st[o.id]), '古いセーブにオーナーの既定値が入らない');
    assert(O.knownList().length === 0 && O.offers().length === 0, 'オーナーの項目が無いセーブで、縁のあるオーナーがいる');
    const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
    return '';
  });

  check('owners: 前の形のセーブ（毎週の依頼・好感度 0〜800・顔見知り／信頼／主戦／相棒）をミッションの形に移す', () => {
    const G = newGame(67);
    W.finishWeek({});
    const old = JSON.parse(W.serialize());
    delete old.owners.v; delete old.owners.flags; delete old.owners.ask;
    // 前の版の毎週の依頼（受けて騎乗が入っている）
    old.owners.week = { key: `${G.year}-${G.month}-${G.week}`, list: [{ oid: 'makino', raceKey: 'x-race', horseId: 'x-horse' }], acc: { 'x-race': { oid: 'makino', horseId: 'x-horse' } }, dec: [] };
    old.rides = { 'x-race': 'x-horse' };
    const conv = (st, o) => { delete st.stage; delete st.prog; delete st.cleared; delete st.job; delete st.fails; Object.assign(st, o); };
    for (const st of Object.values(old.owners.st)) { delete st.known; conv(st, { tier: 0, pts: 0 }); }
    conv(old.owners.st.takenouchi, { met: true, rides: 3, pts: 300, tier: 2, got: { t1: { y: 2025 }, t2: { y: 2025 } } });
    conv(old.owners.st.makino, { pts: 120, tier: 1 });
    conv(old.owners.st.takarada, { met: true, rides: 9, pts: 600, tier: 3, got: { t1: {}, t2: {}, t3: { pending: true } } });
    conv(old.owners.st.kirishima, { met: true, pts: 40 });   // 外した人
    old.owners.queue = [{ oid: 'takenouchi', kind: 'up2', reward: '', y: 2025 }];
    old.owners.wear = { x: 'kirishima' };
    W.load(JSON.stringify(old));
    const s = O.state(), g = W.get();
    assert(O.of('takenouchi').stage === 3 && O.of('takenouchi').known && O.canWear('takenouchi'), `主戦→G1 の段階（${O.of('takenouchi').stage}）`);
    assert(O.of('makino').stage === 1 && O.of('makino').known, `信頼→G3 の段階（${O.of('makino').stage}）`);
    assert(O.of('takarada').stage === 4 && O.of('takarada').got.t3.pending, `相棒→お手馬の段階（${O.of('takarada').stage}）`);
    assert(O.of('sengoku').stage === 0 && !O.known('sengoku'), '縁の無い人が変わった');
    assert(!s.week && !g.rides['x-race'], '前の版の毎週の依頼か、その騎乗が残っている');
    assert(O.of('takenouchi').job && O.of('takenouchi').job.horse === O.by('takenouchi').missions[3].horse && O.of('makino').job && O.of('makino').job.k === 1 && !O.of('takarada').job, '前のセーブで縁のある人に、いまの段階のミッションの予定が無い');
    assert(O.of('kirishima').known && !O.active('kirishima') && s.wear.x === 'kirishima' && O.by('kirishima').silks && !O.of('kirishima').job, '外した人の縁・勝負服が消えた（か、外した人に予定がある）');
    assert(s.queue.length === 0 && s.v === 3 && s.flags, '前の形の場面が残る');
    const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
    return `竹之内さん：${O.of('takenouchi').job.horse}で${O.of('takenouchi').job.race}（${O.of('takenouchi').job.y}年）`;
  });

  check('owners: 自動で遊ぶと、数年で何人かと出会い、ミッションが進む（依頼の馬にはいつも自分が乗る）・セーブの往復', () => {
    // 遊び方：お手馬が3頭より少なければ店で馬を買い、自分で乗るつもりで強めに作る（上手に乗る人の代わり）。週はおまかせで進める
    const G = newGame(9);
    const y0 = G.year, years = QUICK ? 1 : 3;
    let wk = 0, rides = 0, issued = 0;
    const met = {};
    while (G.year < y0 + years) {
      if (W.mine().filter(h => h.loc !== 'retired').length < 3) {
        G.player.money = Math.max(G.player.money, 5e5);
        const it = W.marketHistoric().slice().sort((a, b) => a.price - b.price).find(x => x.price <= G.player.money);
        if (it) { W.buy(it); const h = W.mine().find(x => x.name === it.horse.name); for (const k of Object.keys(h.pot)) h.pot[k] = Math.max(h.pot[k], 104); }
      }
      for (const f of O.offers()) if (f.now) { const c = W.cardOf(f.raceKey), me = c && c.runners.find(x => x.rider === 'P'); assert(me && me.horse.id === f.horseId, `${f.race} の依頼の馬に乗っていない`); rides++; }
      issued += O.state().queue.filter(q => q.kind === 'job').length;
      O.state().queue = [];
      W.finishWeek({}); wk++;
      for (const o of O.list()) if (O.known(o.id) && met[o.id] == null) met[o.id] = wk;
      assert(wk < 60 * years, '年が進まない');
    }
    const cleared = O.list().reduce((a, o) => a + O.of(o.id).stage, 0);
    assert(Object.keys(met).length >= (QUICK ? 1 : 3), `出会った人が少ない（${Object.keys(met).length}人）`);
    assert(issued >= 1 && rides >= 1, `依頼が来ない（来た ${issued}・乗った ${rides}）`);
    if (!QUICK) assert(cleared >= 2, `ミッションが進まない（クリア ${cleared}）`);
    assert(O.list().filter(o => o.gate).every(o => met[o.id] == null) || O.state().flags.overseas, '海外に出ていないのに海外の人と出会った');
    const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
    return `${years}年・出会い ${Object.entries(met).sort((a, b) => a[1] - b[1]).map(([k, w]) => `${O.by(k).name.split(/[ ・]/)[0]} ${w}週`).join('・')}・依頼 ${issued}・乗った ${rides}・クリア ${cleared}`;
  });

  check('owners: 初めて GF を勝つと、イロナから花輪（1頭の馬から作れるオリジナルホースが＋1）・2度目はもらわない', () => {
    const G = newGame(71);
    const F = HS.GFHost, Ori = HS.Original;
    assert(!F.hasItem() && Ori.foalsMax() === Ori.FOALS, 'はじめから花輪がある');
    const me = { pos: 1, rider: 'P', horse: { id: 'h1', name: 'テストホース' } };
    const rep = { y: G.year, m: 12, w: 5, races: [{ race: { key: 'gf', name: 'グランドフェスティバル（マイル）', grade: 'GF' }, sim: { results: [me] } }] };
    F.afterWeek(Object.assign({}, rep, { races: [{ race: rep.races[0].race, sim: { results: [Object.assign({}, me, { pos: 2 })] } }] }));
    assert(!F.hasItem(), '2着で花輪をもらった');
    F.afterWeek(rep);
    assert(F.hasItem() && Ori.foalsMax() === Ori.FOALS + 1, '初めての GF の勝ちで花輪をもらえない');
    const q = O.state().queue.filter(x => x.kind === 'wreath');
    assert(q.length === 1 && F.sceneLines({ horse: q[0].horse, race: q[0].race }).every(t => !/\{/.test(t)) && F.sceneLines({ horse: 'A', race: 'B' }).length >= 3, '花輪の場面が無い');
    F.afterWeek(rep);
    assert(O.state().queue.filter(x => x.kind === 'wreath').length === 1, '2度目も花輪の場面が出る');
    const s1 = W.serialize(); W.load(s1); assert(F.hasItem() && W.serialize() === s1, 'セーブの往復で花輪が消える');
    return `${D.gfHost.item.name}：作れる数 ${Ori.FOALS}→${Ori.foalsMax()}`;
  });

  check('owners: オリジナルホースを作るとアイテムのボーナスが付く・1頭の馬から作れる数を超えると親は牧場を去る（花輪で＋1）', () => {
    const G = newGame(57);
    G.owners.st.violaine.got.item = { y: G.year }; G.owners.st.farina.got.item = { y: G.year };
    G.player.money = 1e9;
    const mk = W.marketHistoric().slice(0, 40);
    const s = mk.find(x => x.horse.sex === '牡'), m = mk.find(x => x.horse.sex === '牝');
    W.buy(s); W.buy(m);
    const [hs, hm] = [W.mine().find(h => h.name === s.horse.name), W.mine().find(h => h.name === m.horse.name)];
    for (const h of [hs, hm]) { h.loc = 'retired'; h.retiredY = G.year; }
    const Ori = HS.Original;
    const made = [];
    for (let i = 0; i < Ori.FOALS; i++) {
      hm.foalY = null;
      for (const h of W.mine().filter(x => x.original)) delete G.horses[h.id];   // お手馬の枠を空ける
      const r = Ori.make(hs.id, hm.id, `テストオリジナル${i}`);
      assert(!r.err, r.err);
      if (i === 0) assert((r.horse.items || []).includes('家紋の指輪') && (r.horse.items || []).includes('赤い表紙の帳面'), `アイテムが付かない（${r.horse.items}）`);
      made.push(r.horse.name);
    }
    assert(!W.horse(hs.id) && !W.horse(hm.id), `${Ori.FOALS}頭作っても親が牧場に残る`);
    // 花輪があれば、1頭から1頭多く作れる
    const G2 = newGame(58);
    G2.owners.flags.wreath = { y: G2.year };
    G2.player.money = 1e9;
    const mk2 = W.marketHistoric().slice(0, 40);
    W.buy(mk2.find(x => x.horse.sex === '牡')); W.buy(mk2.find(x => x.horse.sex === '牝'));
    const [a, b] = [W.mine().find(h => h.sex === '牡'), W.mine().find(h => h.sex === '牝')];
    for (const h of [a, b]) { h.loc = 'retired'; h.retiredY = G2.year; }
    for (let i = 0; i < Ori.FOALS + 1; i++) {
      b.foalY = null;
      for (const h of W.mine().filter(x => x.original)) delete G2.horses[h.id];
      assert(!Ori.make(a.id, b.id, `テストオリジナル${i}`).err, `花輪があるのに${i + 1}頭目が作れない`);
      if (i < Ori.FOALS) assert(W.horse(a.id), `花輪があるのに${i + 1}頭目で親が去った`);
    }
    assert(!W.horse(a.id), `${Ori.FOALS + 1}頭作っても親が残る`);
    return `1頭から ${Ori.FOALS}頭（花輪で ${Ori.FOALS + 1}頭）：${made.join('・')}`;
  });

  check('owners: docs/OWNERS_DRAFT.md が data/owners.js と同じ（node tools/owners_draft.js で書き出す）・ミッションの馬とレースが載っている', () => {
    const { build } = require('../tools/owners_draft.js');
    const now = fs.readFileSync(path.join(__dirname, '..', 'docs', 'OWNERS_DRAFT.md'), 'utf8');
    assert(now === build(HS), 'docs/OWNERS_DRAFT.md が古い（node tools/owners_draft.js で書き直す）');
    for (const o of O.list()) for (const m of o.missions.slice(0, O.JOBS)) assert(now.includes(m.horse) && now.includes(O.raceLabel(m.race)), `一覧に ${m.horse}・${m.race} が無い`);
    assert(!/馬主|好感度/.test(now.replace(/外した人[^\n]*/g, '')), '一覧に「馬主」「好感度」が残っている');
    return '';
  });

  check('owners: 絵の無い人の顔（Godot 版の SVG）が data/owners.js と同じ（node tools/owner_faces.js で書き出す）', () => {
    const files = require('../tools/owner_faces.js').build();
    const dir = path.join(__dirname, '..', 'godot', 'assets', 'owners');
    for (const [f, txt] of Object.entries(files)) assert(fs.existsSync(path.join(dir, f)) && fs.readFileSync(path.join(dir, f), 'utf8') === txt, `godot/assets/owners/${f} が古い（node tools/owner_faces.js）`);
    const noArt = O.list().filter(o => !o.portrait).map(o => o.id);
    for (const id of noArt) assert(files[`${id}_base.svg`], `${id} の顔の SVG が無い`);
    return `${Object.keys(files).length}枚（${noArt.join('・')}）`;
  });
};
