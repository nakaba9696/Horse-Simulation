// 馬主と騎乗依頼（js/core/owners.js・data/owners.js）の検証。仕様書 docs/SPEC.md「騎乗依頼」
module.exports = function (check, assert, HS) {
  const W = HS.World, O = HS.Owners, U = HS.U, D = HS.DATA;
  const QUICK = !!process.env.QUICK;
  const fs = require('fs'), path = require('path');
  const PATTERNS = ['plain', 'hoops', 'stripes', 'sash', 'cross', 'diamonds', 'stars', 'halves', 'yoke'];
  const SCENES = ['offer', 'paddock', 'win', 'bigwin', 'good', 'lose', 'decline'];
  const GENRES = ['local', 'sprint', 'classic', 'long', 'filly', 'usa', 'europe', 'aus'];
  const NEED_KEYS = ['by', 'pos', 'cls', 'region', 'countries', 'eu', 'surface', 'minDist', 'maxDist', 'ages', 'raceSex', 'horseSex', 'styles', 'popMin', 'names', 'set', 'all', 'twice', 'unbeaten', 'streak', 'wonRegion', 'count'];
  const AVOID = /どこか|少しだけ|そっと|ふと|まるで|気がした|胸が温かく|なぜか/;
  const newGame = seed => { W.newGame({ seed, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' }); return W.get(); };
    // 全員と縁を作る（依頼の仕組みだけを見るテスト用。出会いの場面は見たことにする）
  const meetAll = () => { O.state().flags.overseas = { y: W.get().year }; for (const o of O.list()) O.meet(o.id, { horse: 'テストホース', race: 'テストのレース' }); O.state().queue = []; };
  // レース名から番組のレースを探す
  const raceData = name => (D.races || []).concat(D.racesWorld || []).find(r => r.name === name || r.short === name);

  // 課題の判定（need）を満たすレースと結果を作る
  function synth(n, g) {
    let race = { key: 'test', name: 'テストステークス', short: 'テストS', region: 'JRA', course: '東京', surface: '芝', dist: 2000, age: '3+', graded: false, year: g.year, month: 5, week: 2 };
    if (n.names) { const d = raceData(n.names[0]); assert(d, `レース ${n.names[0]} が番組に無い`); race = Object.assign({}, d, { key: 'test', year: g.year, graded: !!d.grade, short: d.short || d.name }); }
    if (n.cls) { race.grade = ['', 'G3', 'G2', 'G1'][n.cls]; race.graded = true; }
    if (n.region) race.region = n.region;
    if (n.countries) { race.region = '海外'; race.country = n.countries[0]; }
    if (n.eu) { race.region = '海外'; race.country = '仏'; }
    if (n.surface) race.surface = n.surface;
    if (n.minDist && race.dist < n.minDist) race.dist = n.minDist;
    if (n.maxDist && race.dist > n.maxDist) race.dist = n.maxDist;
    if (n.ages) race.age = n.ages[0];
    if (n.raceSex === '牝') race.sex = '牝'; else if (n.raceSex === 'mixed') delete race.sex;
    const k = Math.max(n.streak || 0, n.unbeaten ? 3 : 0, 1);
    const h = { id: 'testh', name: 'テストホース', sex: n.horseSex || '牡', style: (n.styles || ['先行'])[0], born: g.year - 4, owner: n.by === 'own' || n.by === 'orig' ? 'P' : 'AI', original: n.by === 'orig',
      starts: n.unbeaten || n.streak ? k : k + 2, wins: k, results: Array.from({ length: k }, () => ({ pos: 1 })), gradedWins: [] };
    for (const nm of (n.set || []).concat(n.all || [])) h.gradedWins.push({ y: g.year, race: nm, short: nm, grade: 'G1', region: '海外' });
    if (n.twice) for (const y of [g.year - 1, g.year]) h.gradedWins.push({ y, race: n.names[0], short: n.names[0], grade: 'G1', region: 'JRA' });
    if (n.wonRegion) h.gradedWins.push({ y: g.year - 1, race: '帝王賞', short: '帝王賞', grade: 'G1', region: n.wonRegion });
    return { race, me: { pos: 1, pop: n.popMin || 1, horse: h }, isOffer: (n.by || 'offer') === 'offer' };
  }

  check('owners: 仕様書の8つのジャンルに1人ずつ・架空・勝負服・課題5つ・アイテム・場面ごとの台詞（印の無い文が必ずある）・避ける癖', () => {
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
    {
      for (const o of O.list()) {
        assert(o.likes.length >= 2 && o.face && o.face.style && o.voice && o.intro && o.look && o.look.moods, `${o.name} の項目が足りない`);
        assert(o.missions && o.missions.length === 5, `${o.name} の課題が5つでない`);
        o.missions.forEach((m, i) => {
          assert(m.text && m.say && m.need, `${o.name} の課題${i + 1} の文が無い`);
          for (const k of Object.keys(m.need)) assert(NEED_KEYS.includes(k), `${o.name} の課題${i + 1} に知らない判定 ${k}`);
          if (i === 4) assert(['own', 'orig'].includes(m.need.by), `${o.name} の最後の課題がお手馬でない`);
          else assert(!m.need.by || m.need.by === 'offer', `${o.name} の課題${i + 1} が依頼の馬でない`);
        });
        assert(o.item && o.item.name && o.item.text && o.item.bonus && Object.keys(o.item.bonus).length, `${o.name} のアイテムが無い`);
        for (const sc of SCENES) for (const k of ['near', 'close']) {
          const set = (o.lines[sc] || {})[k] || [];
          assert(set.length >= 1 && set.some(t => !/^\[/.test(t)), `${o.name} の ${sc}.${k} に、印の無い文が無い`);
        }
        for (const k of ['meet', 'm1', 'm2', 'm3', 'm4', 'm5', 'award', 'ask']) assert((o.scenes[k] || []).length >= 1, `${o.name} の場面 ${k} が無い`);
        assert(o.scenes.m5.length >= 4 && o.scenes.meet.length >= 2, `${o.name} の最後か出会いの場面が短い`);
        // 持ち主が作った絵：顔の位置があれば、assets/owners_<id>.js に4つの表情がある
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
      }
    }
    const retired = D.owners.filter(o => o.retired).map(o => o.name);
    return `${L.map(o => `${o.name.split(/[ ・]/)[0]}＝${O.signLabel(o)}`).join('・')}（外した人：${retired.join('・')}）`;
  });

  check('owners: ジャンルは重ならない・秘書ユニはふつうのナビゲーター（正体の要素が無い）', () => {
    const L = O.list(), signs = L.map(o => O.signOf(o));
    assert(new Set(signs).size === signs.length, `ジャンルが重なる（${signs}）`);
    for (const o of L) {
      assert(O.LIKE_LABEL[O.signOf(o)], `${o.name} のジャンル ${O.signOf(o)} に名前が無い`);
      assert(o.likes.length <= 3 && o.likes.every(k => O.LIKE_LABEL[k]), `${o.name} の好みが多いか、名前の無い好みがある（${o.likes}）`);
      const u = o.unlock;
      assert(u && u.text && u.hint, `${o.name} の出会いの条件が無い`);
      assert(!AVOID.test(u.hint + u.text), `${o.name} の条件の文に避ける癖の語`);
      assert(!u.hint.includes(o.name.split(/[ ・]/)[0]), `${o.name} のヒントに名前が出ている`);
    }
    // 持ち主の決定（2026-10-19・改め）「ナビゲータはナビゲータです」：ユニに正体の要素（花輪・ハンガリー・無敗の言い伝え・ほのめかしの一言・GF の場面）を持たせない
    const y = O.by('yuni');
    const txt = JSON.stringify(y);
    assert(!y.hints && !y.scenes.gf && !y.plans && !(y.face.extras || []).includes('hairpin'), 'ユニに正体のほのめかし（hints・GF の場面・花の髪留め）が残っている');
    assert(!/花輪|ハンガリー|キンチェム|正体|負けたことがない|押し花|宝もの/.test(txt), `ユニの文に正体の要素が残っている（${txt.match(/花輪|ハンガリー|キンチェム|正体|負けたことがない|押し花|宝もの/)}）`);
    return `8人・ユニはナビゲーター`;
  });

  check('owners: GF を開いている一族の人（キンチェムモチーフ・本人ではない）：顔・場面のひと言・GF の場面で選べる', () => {
    const d = D.gfHost, F = HS.GFHost;
    assert(d && d.name && d.title && d.note && d.face && d.face.extras.includes('wreath') && d.look && d.look.moods && d.voice && d.intro, '一族の人の項目が足りない');
    assert(!D.owners.some(o => o.id === d.id || o.name === d.name), '一族の人が騎乗依頼の馬主と重なる');
    for (const k of ['wait', 'invite', 'week', 'win', 'lose', 'allclear', 'kincsem']) assert((d.lines[k] || []).length >= 1, `一族の人の場面 ${k} が無い`);
    const all = JSON.stringify([d.lines, d.hints, d.intro, d.note]);
    assert(!/キンチェム|化身|生まれ変わり/.test(all), '一族の人をキンチェム本人と言い切る言葉がある');
    assert(/花輪/.test(all) && /ハンガリー/.test(all), 'キンチェムを思わせるモチーフ（花輪・ハンガリー）が無い');
    assert(!AVOID.test(all) && !/……/.test(all) && !/恋|結婚|キス/.test(all), '一族の人の文に避ける癖の語・恋愛の言葉');
    for (const m of all.matchAll(/\{(\w+)\}/g)) assert(['me', 'race'].includes(m[1]), `一族の人の文に知らない差し込み {${m[1]}}`);
    newGame(83);
    const sc = F.scene();
    assert(sc === 'wait', `はじめの場面が ${sc}`);
    const ln = F.line('invite', 'classic');
    assert(ln && !/\{/.test(ln) && ln === F.line('invite', 'classic'), `ひと言が選べない・決まらない（${ln}）`);
    const f = path.join(__dirname, '..', 'godot', 'assets', 'owners', `${d.id}_base.svg`);
    assert(fs.existsSync(f), 'Godot 版の顔の SVG が無い');
    return `${d.name}：「${ln}」`;
  });

  check('owners: 課題の判定：どの課題も、満たす結果で通り、依頼の馬・お手馬・オリジナルホースの区別を間違えない', () => {
    const g = newGame(29);
    let n = 0;
    {
      for (const o of O.list()) o.missions.forEach((m, i) => {
        const x = synth(m.need, g);
        assert(O.needOk(m.need, x.race, x.me, x.isOffer), `${o.name} の課題${i + 1}「${m.text}」が、満たす結果で通らない`);
        assert(!O.needOk(m.need, x.race, Object.assign({}, x.me, { pos: 2 }), x.isOffer), `${o.name} の課題${i + 1} が2着で通る`);
        if ((m.need.by || 'offer') === 'offer') assert(!O.needOk(m.need, x.race, x.me, false), `${o.name} の課題${i + 1} が依頼でない馬で通る`);
        if (m.need.by === 'own' || m.need.by === 'orig') assert(!O.needOk(m.need, x.race, Object.assign({}, x.me, { horse: Object.assign({}, x.me.horse, { owner: 'AI' }) }), true), `${o.name} の課題${i + 1} がお手馬でない馬で通る`);
        if (m.need.by === 'orig') assert(!O.needOk(m.need, x.race, Object.assign({}, x.me, { horse: Object.assign({}, x.me.horse, { original: false }) }), false), `${o.name} の課題${i + 1} がオリジナルホースでない馬で通る`);
        n++;
      });
    }
    return `${n}の課題`;
  });

  check('owners: はじめは依頼が来ない・ジャンルのレースで勝って好感度がたまると出会い、次の週から依頼が来る・海外の人は海外の印のあと', () => {
    const G = newGame(31);
    for (let i = 0; i < 3; i++) {
      assert(O.offers().length === 0, `はじめの${i + 1}週目に依頼が来た`);
      assert(O.knownList().length === 0, '縁のある馬主がいる');
      W.finishWeek({});
    }
    const horse = { id: 'th', name: 'テストホース', sex: '牡', style: '先行', born: G.year - 3, starts: 4, wins: 1 };
    const race = (o) => Object.assign({ key: 'tr', name: 'テスト', region: 'JRA', surface: '芝', dist: 1600, graded: false, age: '3+', year: G.year, month: G.month, week: G.week }, o);
    // 1600m の勝ちでは千石さんの好感度は動かない。1200m の勝ちで上がり、2つで出会う
    O.onResult(race({ dist: 1600 }), { pos: 1, horse });
    assert(O.of('sengoku').pts === 0, '1600m の勝ちで千石さんの好感度が上がった');
    O.onResult(race({ dist: 1200 }), { pos: 1, horse }); O.meetCheck();
    assert(!O.known('sengoku') && O.of('sengoku').pts > 0, '1200m の1勝で、好感度が上がらないか、すぐ出会った');
    O.onResult(race({ dist: 1200, name: '2歳未勝利', age: '2' }), { pos: 1, horse }); O.meetCheck();
    assert(O.known('sengoku') && O.of('sengoku').knownAt.y === G.year, '1200m の2勝で千石さんと縁ができない');
    assert(O.known('yuni'), '2歳のレースの勝ちでユニと縁ができない（2歳・3歳のレースは2つ勝っている）');
    assert(!O.known('takarada') && !O.known('takenouchi'), 'ジャンルの違う馬主とも縁ができた');
    const q = O.state().queue.find(x => x.oid === 'sengoku' && x.kind === 'meet');
    assert(q && q.race && O.sceneLines('sengoku', 'meet', { horse: q.horse, race: q.race }).length >= 2, '出会いの場面が無い');
    assert(G.news.some(n => n.text.includes('千石') && n.text.includes('声がかかった')), '縁のニュースが無い');
    // 海外の人：ダートで勝っても、海外の印の前は出会わない
    for (let i = 0; i < 3; i++) O.onResult(race({ surface: 'ダ', dist: 1800 }), { pos: 1, horse: Object.assign({}, horse, { country: '米' }) });
    O.meetCheck();
    assert(O.of('dakota').pts >= O.MEET && !O.known('dakota'), '海外の印の前にダコタさんと縁ができた');
    O.onResult(race({ region: '海外', country: '米', surface: 'ダ', dist: 2000, graded: true, grade: 'G1' }), { pos: 5, horse });
    assert(O.state().flags.overseas, '海外のレースに出ても印が付かない');
    O.meetCheck();
    assert(O.known('dakota'), '海外の印のあとでダコタさんと縁ができない');
    O.state().queue = [];
    W.finishWeek({});
    let n = 0;
    const known = O.knownList().map(o => o.id);
    for (let i = 0; i < 6; i++) {
      const offs = O.offers();
      assert(offs.every(x => known.includes(x.oid)), `縁の無い馬主から依頼（${offs.map(x => x.oid)}）`);
      n += offs.length;
      W.finishWeek({});
    }
    assert(n > 0, '縁ができたあと6週、依頼が来ない');
    return `縁 ${known.join('・')}・6週で依頼 ${n}件`;
  });

  check('owners: 8つのジャンルの依頼がそのジャンルに寄る（7割以上。OP・G3 の段階）', () => {
    newGame(47);
    const t = {};
    for (let i = 0; i < (QUICK ? 16 : 52); i++) {
      const cards = W.cards();
      for (const stage of [0, 1]) for (const ofr of O.generate(cards, `s${i}`, { stage, all: true })) {
        const c = cards.find(c => c.race.key === ofr.raceKey), h = c.runners.find(x => x.horse.id === ofr.horseId).horse;
        const x = t[ofr.oid] = t[ofr.oid] || { n: 0, fit: 0 };
        x.n++; if (O.signFits(O.by(ofr.oid), c.race, h)) x.fit++;
      }
      W.finishWeek({});
    }
    const rows = O.list().map(o => ({ o, x: t[o.id] || { n: 0, fit: 0 } }));
    for (const { o, x } of rows) {
      assert(x.n >= (QUICK ? 4 : 10), `${o.name} の依頼が少ない（${x.n}件）`);
      assert(x.fit / x.n >= 0.7, `${o.name}（${O.signLabel(o)}）の依頼でジャンルに合うのが ${x.fit}/${x.n}`);
    }
    return rows.map(({ o, x }) => `${O.signLabel(o)} ${Math.round(x.fit / x.n * 100)}%（${x.n}件）`).join('・');
  });

  check('owners: 依頼は毎週来る・受けると乗り、騎乗料が入る・断ると下がる（段階の下限より下がらない）', () => {
    const G = newGame(31);
    meetAll();
    let rides = 0, minN = 99;
    const money0 = G.player.money;
    for (let i = 0; i < (QUICK ? 10 : 20); i++) {
      const offs = O.offers();
      minN = Math.min(minN, offs.length);
      assert(offs.every(o => O.by(o.oid) && W.cardOf(o.raceKey)), '依頼のレースか馬主が無い');
      assert(new Set(offs.map(o => o.raceKey)).size === offs.length, '同じレースに依頼が2つ');
      const o = offs[0];
      if (o) {
        assert(!O.accept(o.raceKey, o.horseId), '受けられない');
        const card = W.cardOf(o.raceKey);
        const me = card.runners.find(x => x.rider === 'P');
        assert(card.ride && me && me.horse.id === o.horseId, '受けた馬に自分が乗っていない');
        rides++;
      }
      W.finishWeek({});
    }
    assert(minN >= 1, `依頼が来ない週がある（少ない週 ${minN}件）`);
    const sum = O.list().reduce((a, o) => a + O.of(o.id).rides, 0);
    assert(sum === rides && G.jockey.total.rides === rides, `乗った数が合わない（馬主 ${sum}・騎手 ${G.jockey.total.rides}・受けた ${rides}）`);
    const fees = O.list().reduce((a, o) => a + O.of(o.id).fees, 0);
    assert(fees > 0 && G.player.money > money0, '騎乗料が入っていない');
    const d = O.offers()[0]; assert(d, '依頼が無い');
    const st = O.of(d.oid); st.pts = 20; const before = st.pts;
    assert(!O.decline(d.raceKey) && st.pts < before && st.dec >= 1, '断っても下がらない');
    assert(!O.offers().some(o => o.raceKey === d.raceKey), '断った依頼が残る');
    for (let i = 0; i < 30; i++) O.addPts(d.oid, -10);
    assert(st.pts === O.STAGES[st.stage].floor, `段階の下限より下がった（${st.pts}）`);
    for (let i = 0; i < 30; i++) O.addPts(d.oid, 10);
    assert(st.stage === 0 && st.pts === O.STAGES[1].floor - 1, `課題をやらずに次の段階の下限を超えた（${st.pts}）`);
    return `乗った ${rides}・騎乗料 ${U.money(fees)}`;
  });

  check('owners: 段階は OP→G3→G2→G1→お手馬の順・段階が上がるほど依頼の格と馬が上がる・やり終えると依頼が止まりアイテムが付く', () => {
    const G = newGame(53);
    meetAll();
    const oid = 'takenouchi', o = O.by(oid), st = O.of(oid);
    // 先の段階の課題を満たしても進まない（順番どおり）
    const late = synth(o.missions[3].need, G);
    O.onResult(late.race, late.me); // 依頼で乗っていない（acc が無い）
    assert(st.stage === 0, '依頼でない馬で、先の段階の課題で進んだ');
    // 段階ごとの依頼の格の上限
    const cls = {};
    for (let i = 0; i < (QUICK ? 10 : 20); i++) {
      const cards = W.cards();
      for (const s of [0, 1, 2, 3, 4]) for (const ofr of O.generate(cards, `c${i}`, { stage: s, all: true })) {
        const c = cards.find(c => c.race.key === ofr.raceKey);
        const k = O.classOf(c.race); (cls[s] = cls[s] || []).push(k);
        assert(k <= O.STAGES[s].maxClass, `段階 ${O.STAGES[s].label} に格 ${k} の依頼（${c.race.name}）`);
      }
      W.finishWeek({});
    }
    assert(U.avg(cls[3]) > U.avg(cls[0]) + 0.3 && Math.max(...cls[3]) >= 3, `格の平均 ${U.avg(cls[0]).toFixed(2)}→${U.avg(cls[3]).toFixed(2)}`);
    // 課題を順にやり終える（依頼の馬は、受けた依頼として acc に書いてから）
    const money0 = G.player.money;
    const s = O.state();
    for (let k = 0; k < 5; k++) {
      const m = o.missions[k];
      for (let c = 0; c < (m.need.count || 1); c++) {
        const x = synth(m.need, G);
        x.race.key = `mk${k}_${c}`;
        if (x.isOffer) { s.week = s.week || { key: 'x', list: [], acc: {}, dec: [] }; s.week.acc[x.race.key] = { oid, horseId: x.me.horse.id }; }
        assert(st.stage === k, `課題${k + 1}の前の段階が ${st.stage}`);
        O.onResult(x.race, x.me);
      }
      assert(st.stage === k + 1 && st.pts >= (k + 1 >= 5 ? 100 : O.STAGES[k + 1].floor), `課題${k + 1}で段階が進まない（${st.stage}・${st.pts}）`);
      assert(s.queue.some(q => q.oid === oid && q.kind === 'm' + (k + 1)) && O.sceneLines(oid, 'm' + (k + 1), { horse: 'A', race: 'B' }).length, `課題${k + 1}の場面が無い`);
      if (k + 1 === O.WEAR_STAGE) assert(O.canWear(oid), 'G1 の段階で勝負服が着せられない');
    }
    assert(O.done(oid) && st.pts === O.MAX && st.got.item && G.player.money > money0, 'やり終えても、好感度がいっぱい・アイテム・お礼が無い');
    const n = U.sum(Array.from({ length: 8 }, (_, i) => O.generate(W.cards(), `d${i}`).filter(x => x.oid === oid).length));
    assert(n === 0, `やり終えた人から依頼が来る（${n}件）`);
    // アイテム：オリジナルホースに足される
    const h = { pot: { spd: 80, sta: 80, dspd: 80, dsta: 80, guts: 80, mind: 80, slope: 80 }, health: 70, distMax: 2400, kire: 4, apt: { heavy: 50 } };
    const it = O.applyItems(h);
    assert(it.includes(o.item.name) && h.pot.sta === 81 && h.pot.dsta === 81, `アイテムが効かない（${JSON.stringify(h.pot)}）`);
    return `お礼 ${U.money(G.player.money - money0)}・格の平均 ${[0, 1, 2, 3, 4].map(k => U.avg(cls[k] || [0]).toFixed(2)).join('→')}`;
  });

  check('owners: オリジナルホースを作るとアイテムのボーナスが付く', () => {
    const G = newGame(57);
    G.owners.st.violaine.got.item = { y: G.year }; G.owners.st.farina.got.item = { y: G.year };
    const mine = W.marketHistoric().slice(0, 40);
    const s = mine.find(x => x.horse.sex !== '牝' && x.price <= G.player.money), m = mine.find(x => x.horse.sex === '牝' && x.price <= G.player.money);
    G.player.money = 1e9;
    W.buy(s); W.buy(m);
    const [hs, hm] = [W.mine().find(h => h.name === s.horse.name), W.mine().find(h => h.name === m.horse.name)];
    for (const h of [hs, hm]) { h.loc = 'retired'; h.retiredY = G.year; }
    const r = HS.Original.make(hs.id, hm.id, 'テストオリジナル');
    assert(!r.err, r.err);
    assert((r.horse.items || []).includes('家紋の指輪') && (r.horse.items || []).includes('赤い表紙の帳面'), `アイテムが付かない（${r.horse.items}）`);
    return `${r.horse.name}：${r.horse.items.join('・')}`;
  });

  check('owners: 少し仲良くなると、頼めば来月の店にその人の好みの馬が並びやすくなる', () => {
    const G = newGame(59);
    meetAll();
    const oid = 'sengoku';
    assert(O.ask(oid), '段階 OP で店に頼めた');
    O.of(oid).stage = 1;
    assert(!O.ask(oid), '段階 G3 で店に頼めない');
    const a = G.owners.ask;
    const next = a.m;
    let guard = 0; while (G.month !== next && guard++ < 10) W.finishWeek({});
    const shop = HS.Eraless.shop();
    const o = O.by(oid);
    const fit = shop.filter(it => !it.legend && O.fitData(o, it.data)).length;
    // 頼まない場合と比べる
    const saved = W.serialize();
    G.owners.ask = null; G.shopStock = null;
    const fit0 = HS.Eraless.shop().filter(it => !it.legend && O.fitData(o, it.data)).length;
    W.load(saved);
    assert(fit > fit0 || fit >= O.ASK_N, `頼んでも好みの馬が増えない（${fit0}→${fit}）`);
    return `短距離の馬 ${fit0}→${fit}頭`;
  });

  check('owners: 古いセーブ（馬主の項目が無い）でも動き、セーブの往復で変わらない', () => {
    newGame(61);
    W.finishWeek({});
    const old = JSON.parse(W.serialize()); delete old.owners;
    W.load(JSON.stringify(old));
    const g = W.get();
    assert(g.owners && O.list().every(o => g.owners.st[o.id]), '古いセーブに馬主の既定値が入らない');
    assert(O.knownList().length === 0 && O.offers().length === 0, '馬主の項目が無いセーブで、縁のある馬主がいる');
    const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
    return '';
  });

  check('owners: 前の形のセーブ（好感度 0〜800・顔見知り／信頼／主戦／相棒・縁）を新しい段階に移す', () => {
    const G = newGame(67);
    W.finishWeek({});
    const old = JSON.parse(W.serialize());
    delete old.owners.v; delete old.owners.flags; delete old.owners.ask;
    const conv = (st, o) => { delete st.stage; delete st.prog; delete st.cleared; Object.assign(st, o); };
    for (const st of Object.values(old.owners.st)) { delete st.known; conv(st, { tier: 0, pts: 0 }); }
    conv(old.owners.st.takenouchi, { met: true, rides: 3, pts: 300, tier: 2, got: { t1: { y: 2025 }, t2: { y: 2025 } } });
    conv(old.owners.st.makino, { pts: 120, tier: 1 });
    conv(old.owners.st.takarada, { met: true, rides: 9, pts: 600, tier: 3, got: { t1: {}, t2: {}, t3: { pending: true } } });
    conv(old.owners.st.kirishima, { met: true, pts: 40 });   // 外した人
    old.owners.queue = [{ oid: 'takenouchi', kind: 'up2', reward: '', y: 2025 }];
    old.owners.wear = { x: 'kirishima' };
    W.load(JSON.stringify(old));
    const s = O.state();
    assert(O.of('takenouchi').stage === 3 && O.of('takenouchi').known && O.canWear('takenouchi'), `主戦→G1 の段階（${O.of('takenouchi').stage}）`);
    assert(O.of('makino').stage === 1 && O.of('makino').known, `信頼→G3 の段階（${O.of('makino').stage}）`);
    assert(O.of('takarada').stage === 4 && O.of('takarada').got.t3.pending, `相棒→お手馬の段階（${O.of('takarada').stage}）`);
    assert(O.of('sengoku').stage === 0 && !O.known('sengoku'), '縁の無い人が変わった');
    for (const id of ['takenouchi', 'makino', 'takarada']) { const st = O.of(id); assert(st.pts >= O.STAGES[st.stage].floor && st.pts < (O.STAGES[st.stage + 1] || { floor: 101 }).floor && st.tier === undefined, `${id} の好感度 ${st.pts}`); }
    assert(O.of('kirishima').known && !O.active('kirishima') && s.wear.x === 'kirishima' && O.by('kirishima').silks, '外した人の縁・勝負服が消えた');
    assert(s.queue.length === 0 && s.v === 2 && s.flags, '前の形の場面が残る');
    let n = 0, bad = 0;
    for (let i = 0; i < 6; i++) { const offs = O.offers(); n += offs.length; bad += offs.filter(x => !['takenouchi', 'makino', 'takarada'].includes(x.oid)).length; W.finishWeek({}); }
    assert(n > 0 && bad === 0, `前のセーブの依頼 ${n}件（縁の無い人・外した人から ${bad}件）`);
    const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
    void G;
    return `6週の依頼 ${n}件`;
  });

  check('owners: 自動で遊ぶと、1年目に最初の出会いがあり、数年で国内の全員と出会う', () => {
    // 遊び方：お手馬が5頭より少なければ買えるいちばん安い馬を買い、来た依頼は受ける（おまかせ騎乗）
    // 種は 9（前は 5）。疲労を作り直したら（2026-10-19）乱数の並びが変わり、種 5 では牝馬の依頼の 55 鞍で1勝もできず宝田さん（牝馬で勝つ）と4年で会えなかった。
    // 前の形でも種 5 は 47 鞍で1勝だけの際どい種だった。種 6・9 は前の形も今の形も4年で全員と会える（6：今 166週・前 163週、9：今 127週・前 150週）
    const G = newGame(9);
    const y0 = G.year, years = QUICK ? 1 : 4;
    let wk = 0;
    const met = {};
    const home = O.list().filter(o => !o.gate);
    while (G.year < y0 + years && home.some(o => met[o.id] == null)) {
      if (W.mine().filter(h => h.loc !== 'retired').length < 5) {
        const it = W.marketHistoric().slice().sort((a, b) => a.price - b.price).find(x => x.price <= G.player.money);
        if (it) W.buy(it);
      }
      for (const o of O.offers()) if (!O.clash(o)) O.accept(o.raceKey, o.horseId);
      W.finishWeek({}); wk++;
      for (const o of O.list()) if (O.known(o.id) && met[o.id] == null) met[o.id] = wk;
      O.state().queue = [];
    }
    const first = Math.min(...Object.values(met));
    // 目安は1年目のうち（40週まで）。仕様書「ある程度勝っていると出会いのイベント」
    assert(Object.keys(met).length >= 1 && first <= 40, `最初の出会いが遅い（${first}週目）`);
    assert(O.list().filter(o => o.gate).every(o => met[o.id] == null) || O.state().flags.overseas, '海外に出ていないのに海外の人と出会った');
    if (!QUICK) assert(home.every(o => met[o.id] != null), `${years}年で出会っていない人：${home.filter(o => met[o.id] == null).map(o => o.name).join('・')}`);
    const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
    return `最初 ${first}週目・` + Object.entries(met).sort((a, b) => a[1] - b[1]).map(([k, w]) => `${O.by(k).name.split(/[ ・]/)[0]} ${w}週`).join('・');
  });

  check('owners: 依頼を受け続けて自動で何年か遊んでも壊れない', () => {
    const G = newGame(73);
    meetAll();
    const years = QUICK ? 1 : 2;
    const y0 = G.year;
    let acc = 0, dec = 0, n = 0;
    while (G.year < y0 + years) {
      const offs = O.offers();
      offs.forEach((o, i) => { if (i === 2) { O.decline(o.raceKey); dec++; } else if (!O.clash(o)) { O.accept(o.raceKey, o.horseId); acc++; } });
      W.finishWeek({}); n++;
      assert(n < 60 * years, '年が進まない');
    }
    const stages = O.list().map(o => O.of(o.id).stage);
    const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
    assert(O.list().some(o => O.of(o.id).pts > O.STAGES[0].floor), '好感度が一度も上がらない');
    if (!QUICK) assert(stages.some(t => t >= 1), '段階が一度も上がらない');
    return `${years}年・受けた ${acc}・断った ${dec}・段階 ${stages.join('/')}`;
  });

  check('owners: docs/OWNERS_DRAFT.md が data/owners.js と同じ（node tools/owners_draft.js で書き出す）', () => {
    const { build } = require('../tools/owners_draft.js');
    const now = fs.readFileSync(path.join(__dirname, '..', 'docs', 'OWNERS_DRAFT.md'), 'utf8');
    assert(now === build(HS), 'docs/OWNERS_DRAFT.md が古い（node tools/owners_draft.js で書き直す）');
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
