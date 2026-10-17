// 確かめ：逃げ・追込に足した特殊能力・道悪○・外枠○・伝説級の名馬の固有の能力（持ち主の決定 2026-10-17）
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
    // 史実馬にも付き、前からの特性（運の並び）は変わらない：道悪○・外枠○を外すと前と同じ
    const hs = D.historic.slice(0, 2500).map((d, i) => H.fromHistoric(d, 't' + i));
    const nMud = hs.filter(x => x.skills.includes('mud')).length, nOut = hs.filter(x => x.skills.includes('outer')).length;
    assert(nMud > 0.02 * hs.length && nMud < 0.12 * hs.length && nOut > 0.02 * hs.length && nOut < 0.12 * hs.length, `道悪○ ${nMud}・外枠○ ${nOut}／${hs.length}`);
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
    assert(g('逃げ') >= 2.9 && g('追込') >= 2.9, `逃げ ${g('逃げ').toFixed(2)}・追込 ${g('追込').toFixed(2)}（前は 2.8・2.6）`);
    assert(g('先行') < 2.45 && g('先行') < g('差し') && g('先行') < g('逃げ') && g('先行') < g('追込'), `先行 ${g('先行').toFixed(2)} が増えた`);
    for (const st of H.STYLES) assert(bd(st) < 0.6, `${st}の弱み ${bd(st).toFixed(2)}`);
    // どの新しい能力も、その脚質の史実馬のうち5〜60％が持つ（弱みは少なめ）
    const cnt = {}, nSt = {};
    D.historic.forEach((d, i) => { const h = H.fromHistoric(d, 'c' + i); nSt[h.style] = (nSt[h.style] || 0) + 1; for (const id of K.of(h)) { const k = h.style + id; cnt[k] = (cnt[k] || 0) + 1; } });
    for (const [st, ids] of [['逃げ', ['ikiire', 'nidan', 'genwaku']], ['追込', ['kouhou', 'tsuiso', 'sotomawashi', 'sabaki']]]) for (const id of ids) { const r = (cnt[st + id] || 0) / nSt[st]; assert(r >= 0.05 && r <= 0.6, `${K.label(id)} ${st}の ${Math.round(r * 100)}%`); }
    const rb = (cnt['逃げbante'] || 0) / nSt['逃げ'];
    assert(rb > 0.02 && rb < 0.2, `番手× 逃げの ${Math.round(rb * 100)}%`);
    return H.STYLES.map(st => `${st} 強み${g(st).toFixed(2)}・弱み${bd(st).toFixed(2)}`).join('／');
  });

  check('skills2: 伝説級の名馬の固有の能力（1頭1つ・発動する・オリジナルホースに受け継げる・セーブの往復）', () => {
    const SP = HS.Special, O = HS.Original;
    const tops = SP.pool().filter(d => SP.isTop(d));
    assert(tops.length >= 10, `伝説級が少ない ${tops.length}`);
    const ids = new Set();
    for (const d of tops) {
      const u = K.UNIQUE_OF[d.name];
      assert(u && u.label && u.note && u.why && typeof u.when === 'function', `${d.name}に固有の能力が無い`);
      assert(!ids.has(u.id), `${u.id} が重なる`); ids.add(u.id);
      const h = SP.horse(d, { age: '3+', year: 2030 });
      const of = K.of(h);
      assert(of[0] === u.id && of.filter(K.isUnique).length === 1, `${d.name}の能力 ${of.join(',')}`);
      assert(of.length - 1 <= K.cap(K.stats(h)), '固有の能力が持てる数を押し出す');
    }
    // 伝説級でない馬は持たない。データの馬名はみな伝説級
    assert(K.UNIQUES.every(u => tops.some(d => d.name === u.horse)), '伝説級でない馬に固有の能力がある');
    assert(D.historic.slice(0, 2000).every((d, i) => !K.of(H.fromHistoric(d, 'u' + i)).some(K.isUnique)), '史実馬に固有の能力が付く');
    // レースで発動する（その馬の場面で）
    const tet = withTrig(['u_tetrarch'], 30, '逃げ', 4, { dist: 1200, course: '中山' });
    assert((tet.fired.u_tetrarch || 0) > 20, `まだらの快速が発動しない ${tet.fired.u_tetrarch || 0}/30`);
    // オリジナルホースへ：伝説級の名馬を親にすると、固有の能力が候補に入り、受け継いだ仔は発動し、さらに次の代へも渡せる
    W.newGame({ seed: 45, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get();
    const sd = tops.find(d => d.sex === '牡');
    const s = SP.horse(sd, { age: '3+', year: G.year }); s.id = 'lg1'; s.owner = 'P'; s.loc = 'retired'; s.legend = false; G.horses[s.id] = s;
    const mare = W.all().find(x => x.hist && x.sex === '牝' && G.year - x.born >= 4);
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
    return `伝説級 ${tops.length}頭・${K.UNIQUES.map(u => `${u.horse}「${u.label}」`).join('・')}`;
  });
};
