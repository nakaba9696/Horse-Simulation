// 確かめ：逃げ・追込に足した特殊能力・道悪○・外枠○・持ち主が選んだ名馬の固有の能力（持ち主の決定 2026-10-17）
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const U = HS.U, H = HS.Horse, S = HS.Sim, K = HS.Skills, W = HS.World, D = HS.DATA;
  const LEN = 2.4;
  const race0 = { dist: 2000, surface: '芝', course: '東京', ground: '良', year: 2004 };
  // 14頭（level 82 の頭数合わせの馬）。mod(h, i) で変える
  const field = (rng, mod, o) => {
    o = o || {};
    const f = [];
    for (let i = 0; i < 14; i++) { const h = H.makeFiller(rng, { level: 82, surface: o.surface || '芝', dist: o.dist || 2000, born: 2000 }); h.name = 'h' + i; if (mod) mod(h, i); f.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 }); }
    return f;
  };
  // 1頭目にだけ trig を持たせて N 回走らせる（ほかの馬は発動の能力を持たない）
  const withTrig = (ids, N, style, seed, o) => {
    const setup0 = K.setup, rng = new U.RNG(seed || 31);
    let pos = 0, win = 0, fired = {};
    K.setup = sim => { setup0(sim); sim.st.forEach(s => { s.trig = []; }); sim.st[0].trig = ids.slice(); };
    try {
      for (let k = 0; k < N; k++) {
        const sim = S.create(Object.assign({}, race0, o || {}), field(rng, (h, i) => { if (i === 0 && style) h.style = style; else if (o && o.solo && h.style === '逃げ') h.style = '先行'; }), H.weekIndex(2004, 5, 1), rng, {});
        while (!S.step(sim)) { /* 進める */ }
        const q = S.finish(sim).results.findIndex(r => r.horse.name === 'h0') + 1;
        pos += q; if (q === 1) win++;
        for (const f of sim.skillFx) if (f.i === 0) fired[f.id] = (fired[f.id] || 0) + 1;
      }
    } finally { K.setup = setup0; }
    return { pos: pos / N, win: win / N, fired };
  };

  check('skills2: 逃げ・追込の能力の発動の条件', () => {
    const NEW = ['ikiire', 'nidan', 'genwaku', 'bante', 'kouhou', 'tsuiso', 'sotomawashi', 'sabaki'];
    for (const id of NEW) assert(K.BY[id] && K.BY[id].label && K.BY[id].note, `${id} が無い`);
    // 逃げの能力は逃げ馬だけ、追込の能力は追込の馬だけが身につける
    const p = (style, v) => ({ spd: v, sta: v, guts: v, mind: v, slope: v, kire: 5, style });
    for (const id of ['ikiire', 'nidan', 'genwaku', 'bante']) for (const st of ['先行', '差し', '追込']) for (const v of [50, 80, 95]) assert(!K.BY[id].learn(p(st, v)), `${K.label(id)}を${st}が身につける`);
    for (const id of ['kouhou', 'tsuiso', 'sotomawashi', 'sabaki']) for (const st of ['逃げ', '先行', '差し']) for (const v of [50, 80, 95]) assert(!K.BY[id].learn(p(st, v)), `${K.label(id)}を${st}が身につける`);
    const x = o => Object.assign({ sim: {}, s: { x: 1000, i: 0, r: {} }, c: null, t: 30, D: 2000, R: 1000, straight: 500, inStraight: false, rank: 1, n: 14, close: false, wall: false, leader: { x: 1000 }, second: { x: 990 }, sk: { banteFor: 0, wallFor: 0, rankMid: null } }, o);
    const w = id => K.BY[id].when;
    // 息入れ○：3〜4コーナー（直線の手前 350m 以内）を先頭で
    assert(w('ikiire')(x({ R: 700 })) && !w('ikiire')(x({ R: 900 })) && !w('ikiire')(x({ R: 700, rank: 2 })), '息入れ○の条件');
    // 二段ロケット：先頭で直線に入り、2番手と1馬身以上
    assert(w('nidan')(x({ inStraight: true, R: 480, s: { x: 1520 }, second: { x: 1520 - LEN - 0.1 } })) && !w('nidan')(x({ inStraight: true, R: 480, s: { x: 1520 }, second: { x: 1519 } })), '二段ロケットの条件');
    // 幻惑逃げ：チェックポイントを先頭で通り、スローペース
    assert(w('genwaku')(x({ sim: { check: { lead: 0, verdict: 'スローペース' } } })) && !w('genwaku')(x({ sim: { check: { lead: 0, verdict: '平均ペース' } } })) && !w('genwaku')(x({ sim: { check: { lead: 3, verdict: 'スローペース' } } })) && !w('genwaku')(x({ sim: {} })), '幻惑逃げの条件');
    // 番手×：3番手より後ろで10秒
    assert(w('bante')(x({ sk: { banteFor: 10 } })) && !w('bante')(x({ sk: { banteFor: 5 } })), '番手×の条件');
    // 後方待機○：中間点で後ろから3頭以内・掛かっていない
    assert(w('kouhou')(x({ s: { x: 1001 }, sk: { rankMid: 12 } })) && !w('kouhou')(x({ s: { x: 1001 }, sk: { rankMid: 10 } })) && !w('kouhou')(x({ s: { x: 1001 }, sk: { rankMid: 13, kakari: true } })), '後方待機○の条件');
    // 馬群さばき：直線で前が壁だったのが、空いたとき
    assert(w('sabaki')(x({ inStraight: true, R: 300, sk: { wallFor: 0.8 } })) && !w('sabaki')(x({ inStraight: true, R: 300, sk: { wallFor: 0.8 }, wall: true })) && !w('sabaki')(x({ inStraight: true, R: 300, sk: { wallFor: 0.2 } })), '馬群さばきの条件');
    // 実際に走らせて発動する（幻惑逃げは単騎の逃げで）
    const nige = withTrig(['ikiire', 'nidan', 'genwaku', 'bante'], 80, '逃げ', 5, { solo: true });
    const oi = withTrig(['kouhou', 'tsuiso', 'sotomawashi', 'sabaki'], 60, '追込', 6);
    for (const id of ['ikiire', 'genwaku']) assert((nige.fired[id] || 0) > 0, `${K.label(id)}が発動しない`);
    for (const id of ['kouhou', 'tsuiso', 'sotomawashi', 'sabaki']) assert((oi.fired[id] || 0) > 10, `${K.label(id)}が発動しない（${oi.fired[id] || 0}/60）`);
    return `逃げ ${Object.entries(nige.fired).map(([k, v]) => `${K.label(k)}${v}`).join('・')}／80、追込 ${Object.entries(oi.fired).map(([k, v]) => `${K.label(k)}${v}`).join('・')}／60`;
  });

  check('skills2: 効き目が極端でない・ほかの馬に効く・弱みは損になる', () => {
    const out = [];
    for (const [id, st] of [['ikiire', '逃げ'], ['kouhou', '追込'], ['tsuiso', '追込'], ['sotomawashi', '追込'], ['sabaki', '追込']]) {
      const b = withTrig([], 160, st, 31), r = withTrig([id], 160, st, 31);
      assert(r.win < 0.5 && r.win - b.win < 0.12 && r.pos <= b.pos + 0.1, `${K.label(id)} 勝率 ${b.win}→${r.win}・平均着順 ${b.pos.toFixed(2)}→${r.pos.toFixed(2)}`);
      out.push(`${K.label(id)} ${b.pos.toFixed(2)}→${r.pos.toFixed(2)}`);
    }
    const b = withTrig([], 160, '逃げ', 32), r = withTrig(['bante'], 160, '逃げ', 32);
    assert(r.pos >= b.pos, `番手×が得になっている（${b.pos.toFixed(2)}→${r.pos.toFixed(2)}）`);
    // ほかの馬に効く：後ろの差し・追込だけスタミナが減る（自分と先行は変わらない）
    const st = ['逃げ', '先行', '差し', '追込'].map((style, i) => ({ i, x: 1000 - i * 5, E: 0.8, done: false, h: { style } }));
    K.apply({ t: 10, st }, st[0], K.BY.genwaku);
    assert(st[0].E === 0.8 && st[1].E === 0.8 && st[2].E < 0.8 && st[3].E < 0.8, `幻惑逃げの効き目 ${st.map(s => s.E).join(',')}`);
    out.push(`番手× ${b.pos.toFixed(2)}→${r.pos.toFixed(2)}`);
    return out.join('・');
  });

  check('skills2: 自分で乗るとき：馬群さばきは横に速く動け、外回し○はコーナーの外で遠回りにならない', () => {
    const ride = (ids, lane, T, n) => {
      const rng = new U.RNG(9), setup0 = K.setup;
      K.setup = sim => { setup0(sim); sim.st.forEach(s => { s.trig = []; }); sim.st[0].trig = ids.slice(); };
      try {
        const f = field(rng, (h, i) => { if (i === 0) h.style = '追込'; }).slice(0, n || 14); f[0].rider = 'P';
        const sim = S.create(race0, f, H.weekIndex(2004, 5, 1), rng, { ride: true });
        S.ctl.up(sim);
        const me = sim.st[0], lanes = [];
        while (sim.t < T) { if (lane != null) sim.ctl.lane = lane; S.step(sim); lanes.push(me.lane); }
        return { sim, me, lanes };
      } finally { K.setup = setup0; }
    };
    // 1頭だけで走り、外へ動かす：1秒で動ける幅
    const moved = ids => { const r = ride(ids, null, 20, 1); const l0 = r.me.lane; r.sim.ctl.lane = 12; const t0 = r.sim.t; while (r.sim.t < t0 + 1) S.step(r.sim); return r.me.lane - l0; };
    const plain = moved([]), quick = moved(['sabaki']);
    assert(quick > plain * 1.3, `馬群さばきで横の動きが速くならない（${plain.toFixed(2)}→${quick.toFixed(2)}）`);
    // 外を回り続けると、外回し○は遠回りの分だけ前にいる
    const a = ride([], 6, 70).me.x, b = ride(['sotomawashi'], 6, 70).me.x;
    assert(b > a + 1, `外回し○で遠回りが減らない（${a.toFixed(1)}→${b.toFixed(1)}m）`);
    return `横の動き 1秒で ${plain.toFixed(2)}→${quick.toFixed(2)}・外を回って70秒で ${(b - a).toFixed(1)}m 前`;
  });

  check('skills2: 道悪○・外枠○（持っている特性）', () => {
    const race = g => ({ course: '東京', surface: '芝', dist: 2000, grade: 'G2', month: 5, ground: g });
    assert(S.skillAdj({ skills: ['mud'] }, race('重'), null, {}) > 0 && S.skillAdj({ skills: ['mud'] }, race('不良'), null, {}) > 0 && S.skillAdj({ skills: ['mud'] }, race('良'), null, {}) === 0 && S.skillAdj({ skills: ['mud'] }, race('稍重'), null, {}) === 0, '道悪○');
    assert(S.skillAdj({ skills: ['outer'] }, race('良'), null, { frame: 8 }) > 0 && S.skillAdj({ skills: ['outer'] }, race('良'), null, { frame: 7 }) > 0 && S.skillAdj({ skills: ['outer'] }, race('良'), null, { frame: 3 }) === 0, '外枠○');
    // 運では付けない（持ち主の決定 2026-10-20）：手で決めた表の無い史実馬には外枠○が付かず、道悪○はデータの道悪の向き（86 以上）か手の表だけ
    const hs = D.historic.slice(0, 2500).map((d, i) => H.fromHistoric(d, 't' + i));
    const auto = D.historic.slice(0, 2500).map((d, i) => [d, hs[i]]).filter(([d]) => !Array.isArray(d.skills));
    const nMud = hs.filter(x => x.skills.includes('mud')).length, nOut = hs.filter(x => x.skills.includes('outer')).length;
    assert(!auto.some(([, x]) => x.skills.includes('outer')), '運で外枠○が付いた');
    assert(auto.filter(([, x]) => x.skills.includes('mud')).every(([d]) => (d.heavy || 0) >= H.MUD_HEAVY), '道悪の向きの無い馬に運で道悪○が付いた');
    assert(hs.filter(x => x.skills.includes('mud')).every(x => x.apt.heavy >= H.MUD_HEAVY), '道悪○の馬の道悪の適性が低い');
    return `史実馬 ${hs.length}頭のうち 道悪○ ${nMud}・外枠○ ${nOut}`;
  });

  check('skills2: 脚質ごとの数：逃げと追込は増え、先行は少なめのまま', () => {
    const by = {};
    D.historic.forEach((d, i) => {
      const h = H.fromHistoric(d, 'c' + i), b = by[h.style] = by[h.style] || { n: 0, good: 0, bad: 0 };
      b.n++;
      for (const id of K.of(h).filter(x => !K.isUnique(x)).concat(H.shownSkills(h))) { if (K.isBad(id)) b.bad++; else b.good++; }
    });
    const g = st => by[st].good / by[st].n, bd = st => by[st].bad / by[st].n;
    // 能力の運をやめてから（持ち主の決定 2026-10-20）は 2.73・2.78。足す前（2.8・2.6）より追込は増え、どちらも先行より多い
    assert(g('逃げ') >= 2.65 && g('追込') >= 2.7, `逃げ ${g('逃げ').toFixed(2)}・追込 ${g('追込').toFixed(2)}（前は 2.8・2.6）`);
    assert(g('先行') < 2.45 && g('先行') < g('差し') && g('先行') < g('逃げ') && g('先行') < g('追込'), `先行 ${g('先行').toFixed(2)} が増えた`);
    for (const st of H.STYLES) assert(bd(st) < 0.6, `${st}の弱み ${bd(st).toFixed(2)}`);
    // どの新しい能力も、その脚質の史実馬のうち5〜60％が持つ（弱みは少なめ）
    const cnt = {}, nSt = {};
    D.historic.forEach((d, i) => { const h = H.fromHistoric(d, 'c' + i); nSt[h.style] = (nSt[h.style] || 0) + 1; for (const id of K.of(h)) { const k = h.style + id; cnt[k] = (cnt[k] || 0) + 1; } });
    for (const [st, ids] of [['逃げ', ['ikiire', 'nidan', 'genwaku']], ['追込', ['kouhou', 'tsuiso', 'sotomawashi', 'sabaki']]]) for (const id of ids) { const r = (cnt[st + id] || 0) / nSt[st]; assert(r >= 0.05 && r <= 0.6, `${K.label(id)} ${st}の ${Math.round(r * 100)}%`); }
    // 番手× は損な技なので、史実馬には能力の数から付かない（外部レビューの指摘・持ち主の決定 2026-10-20。前は逃げの 2〜20％）
    assert(!cnt['逃げbante'], `番手× が史実馬の逃げ ${cnt['逃げbante']}頭に付く`);
    return H.STYLES.map(st => `${st} 強み${g(st).toFixed(2)}・弱み${bd(st).toFixed(2)}`).join('／');
  });

  // 持ち主が選んだ名馬（2026-10-17・選ぶページと、そのあと足した16頭。バーラム・テューダーミンストレル・アレッジドはあとで外した）
  const CHOSEN = ['オーモンド', 'キンチェム', 'エクリプス', 'ザテトラーク', 'ブリガディアジェラード', 'ミルリーフ', 'ドミノ', 'フランケル', 'ダンシングブレーヴ', 'アーモンドアイ', 'イクイノックス', 'ウィンクス', 'エネイブル', 'オルフェーヴル', 'ゴールデンシックスティ', 'ゴルディコヴァ', 'セントサイモン', 'シンザン', 'シンボリルドルフ', 'ディープインパクト', 'テイエムオペラオー', 'トレヴ', 'ネアルコ', 'ニジンスキー', 'ミエスク', 'ウォーアドミラル', 'ファーラップ', 'カウントフリート', 'シーバード', 'マンノウォー', 'スペクタキュラービッド', 'セクレタリアト', 'プリティーポリー', 'ラフィアン', 'アバーナント',
    // 2026-10-17 にさらに足した名馬（サイテーションは付ける側に戻った）
    'マニカト', 'ケルソ', 'ドクターフェイガー', 'ネイティヴダンサー', 'フォアゴー', 'トキノミノル', 'クリフジ', 'サイテーション', 'シャーガー', 'フライトライン', 'シーザスターズ', 'リボー', 'ナリタブライアン', 'ブラックキャビア', 'オグリキャップ'];

  check('skills2: 名馬の固有の能力（選んだ名馬に1頭1つ・発動する・オリジナルホースに受け継げる・セーブの往復）', () => {
    const SP = HS.Special, O = HS.Original;
    HS.U.ERA = HS.Eraless.ERA;
    assert(CHOSEN.length === 50 && new Set(CHOSEN).size === 50, '選んだ名馬の数');
    // data/uniques.js の名馬は、選んだ名馬とちょうど同じ。場面の型はどれも K.UWHEN にある
    const names = (D.uniques || []).map(u => u.horse);
    assert(names.length === K.UNIQUES.length, `場面の型が無い固有の能力 ${(D.uniques || []).filter(u => !K.UWHEN[u.when]).map(u => u.horse + ':' + u.when).join(',')}`);
    assert(JSON.stringify([...names].sort()) === JSON.stringify([...CHOSEN].sort()), `選んだ名馬と違う：多い ${names.filter(n => !CHOSEN.includes(n)).join(',')}・足りない ${CHOSEN.filter(n => !names.includes(n)).join(',')}`);
    const ids = new Set();
    const tops = [];
    for (const name of CHOSEN) {
      const u = K.UNIQUE_OF[name];
      assert(u && u.label && u.note && u.why && typeof u.when === 'function', `${name}に固有の能力が無い`);
      assert(!ids.has(u.id), `${u.id} が重なる`); ids.add(u.id);
      assert(!/[A-Za-z]\.[A-Za-z]|騎手|調教師|馬主/.test(u.why + u.note), `${name}の文に人の名前`);
      // 馬のデータ（史実馬か data/legends.js）と名鑑がある。1989年より前の馬はスペシャルホースのどれかのグループに入る
      const d = SP.data(name) || D.historic.find(x => x.name === name);
      assert(d, `${name}が馬のデータにいない`);
      assert((D.profiles || []).some(p => HS.normName(p.name) === HS.normName(name)), `${name}の名鑑が無い`);
      const special = HS.Eraless.isLegend(d);
      if (special) assert(SP.byName(name), `${name}がスペシャルホースのグループに入らない`);
      const h = special ? SP.horse(d, { age: '3+', year: 2030 }) : H.fromHistoric(d, 'uq:' + name);
      const of = K.of(h);
      assert(of[0] === u.id && of.filter(K.isUnique).length === 1, `${name}の能力 ${of.join(',')}`);
      assert(of.length - 1 <= K.cap(K.stats(h)), '固有の能力が持てる数を押し出す');
      if (special) tops.push(d);
    }
    // 伝説級でない名馬も持つ（リボー＝凱旋門賞の連覇のグループ・オグリキャップ＝1989年からの史実馬）。伝説級のマンノウォーも持つ（サイテーションは2026-10-19に伝説級から米国の三冠馬のグループへ）
    assert(K.hasUnique('リボー') && !SP.isTop(SP.data('リボー')) && K.hasUnique('オグリキャップ') && SP.isTop(SP.data('マンノウォー')) && K.hasUnique('サイテーション'), '伝説級かどうかで決まっている');
    // マニカトは名鑑を足したので、スペシャルホースに入る
    assert(SP.byName('マニカト'), 'マニカトがスペシャルホースにいない');
    // 選んでいない史実馬は持たない
    assert(D.historic.slice(0, 2000).every((d, i) => K.hasUnique(d.name) || !K.of(H.fromHistoric(d, 'u' + i)).some(K.isUnique)), '選んでいない史実馬に固有の能力が付く');
    // アバーナント：データの整合（英国の芦毛の短距離馬・1946年生まれ。父オーエンテューダー）
    const ab = SP.data('アバーナント');
    assert(ab && ab.born === 1946 && ab.coat === '芦毛' && ab.sex === '牡' && ab.sire === 'オーエンテューダー' && ab.dam === 'ルストムマハル' && ab.country === '英', 'アバーナントのデータ');
    assert(ab.distMax <= 1600 && ab.retire === 1950 && !ab.tier, 'アバーナントの距離・引退・伝説級でない');
    // 血統表（data/stallions_old.js）の父・母とつながる（母はルストムパシャの仔）
    assert(D.pedigree['オーエンテューダー'] && (D.pedigree['ルストムマハル'] || [])[0] === ab.damsire, 'アバーナントの血統表がつながらない');
    const abP = (D.profiles || []).find(p => p.name === 'アバーナント');
    assert(abP && abP.record === '17戦14勝' && abP.years === '1948〜1950年', 'アバーナントの名鑑');
    // レースで発動する（その馬の場面で）
    const tet = withTrig(['u_tetrarch'], 30, '逃げ', 4, { dist: 1200, course: '中山' });
    assert((tet.fired.u_tetrarch || 0) > 20, `まだらの快速が発動しない ${tet.fired.u_tetrarch || 0}/30`);
    // 2026-10-17 に足した場面の型：差し・追込の名馬の型も発動する
    for (const [id, style, o] of [['u_deepimpact', '追込', {}], ['u_almondeye', '差し', {}], ['u_frankel', '逃げ', { solo: true }], ['u_goldikova', '差し', { dist: 1600 }]]) {
      const r = withTrig([id], 30, style, 5, o);
      assert((r.fired[id] || 0) >= 3, `${K.label(id)}が発動しない ${r.fired[id] || 0}/30`);
    }
    // オリジナルホースへ：固有の能力を持つ名馬を親にすると、固有の能力が候補に入り、受け継いだ仔は発動し、さらに次の代へも渡せる
    W.newGame({ seed: 45, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get();
    const sd = tops.find(d => d.sex === '牡');
    const s = SP.horse(sd, { age: '3+', year: G.year }); s.id = 'lg1'; s.owner = 'P'; s.loc = 'retired'; s.legend = false; G.horses[s.id] = s;
    // 母は、両親の能力が上限（O.MAX_SKILLS）に収まる牝馬を選ぶ。世界の最初の牝馬にすると、史実馬のデータを足しただけで
    // 母が変わり、能力の多い母だと固有の能力が候補から落ちて、この確かめが通らなくなる
    const mares = W.all().filter(x => x.hist && x.sex === '牝' && G.year - x.born >= 4);
    const mare = mares.find(x => O.candidates(s, x).length <= O.MAX_SKILLS) || mares[0];
    mare.owner = 'P'; mare.loc = 'retired';
    const uid = K.UNIQUE_OF[sd.name].id;
    assert(O.skillsOf(s)[0] === uid && O.candidates(s, mare).includes(uid), `候補に入らない ${O.candidates(s, mare).join(',')}`);
    let foal = null;
    for (let k = 0; k < 12 && !foal; k++) {
      mare.foalY = null;
      const r = O.make(s.id, mare.id, 'テスト固有' + k);
      assert(!r.err, `作れない ${r.err}`);
      if (K.of(r.horse).includes(uid)) foal = r.horse;
    }
    assert(foal, '12頭作って一度も受け継がない');
    assert(foal.trigFixed.includes(uid) && O.skillsOf(foal)[0] === uid, '受け継いだ固有の能力が仔の能力の先頭に来ない');
    // セーブの往復：受け継いだ固有の能力が残る。古いセーブ（無くした能力の名を持つ仔）も読める
    const s1 = W.serialize(); W.load(s1);
    const back = W.horse(foal.id);
    assert(back && K.of(back).includes(uid), 'セーブの往復で固有の能力が消える');
    const g = JSON.parse(W.serialize()); g.horses[foal.id].trigFixed = ['nonexistent', uid, 'isshun']; W.load(g);
    assert(JSON.stringify(K.of(W.horse(foal.id))) === JSON.stringify([uid, 'isshun']), '古いセーブの仔の能力が読めない');
    return `${K.UNIQUES.length}頭（スペシャルホース ${tops.length}頭）・${K.UNIQUES.map(u => `${u.horse}「${u.label}」`).join('・')}`;
  });
};
