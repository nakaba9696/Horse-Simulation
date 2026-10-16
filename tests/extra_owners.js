// 馬主と騎乗依頼（js/core/owners.js・data/owners.js）の検証
module.exports = function (check, assert, HS) {
  const W = HS.World, O = HS.Owners, U = HS.U, D = HS.DATA;
  const QUICK = !!process.env.QUICK;
  const PATTERNS = ['plain', 'hoops', 'stripes', 'sash', 'cross', 'diamonds', 'stars', 'halves', 'yoke'];
  const SCENES = ['offer', 'paddock', 'win', 'bigwin', 'good', 'lose', 'decline'];
  const newGame = seed => { W.newGame({ seed, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' }); return W.get(); };

  check('owners: 馬主は6〜8人・架空・勝負服・好み・思い出の名馬・場面ごとの台詞（印の無い文が必ずある）・避ける癖', () => {
    const L = D.owners;
    assert(L.length >= 6 && L.length <= 8, `馬主 ${L.length}人`);
    const ids = new Set(), names = new Set(), silks = new Set();
    const jockeys = new Set((D.jockeys || []).map(j => j.name));
    for (const o of L) {
      assert(!ids.has(o.id) && !names.has(o.name), '重複 ' + o.name); ids.add(o.id); names.add(o.name);
      assert(!jockeys.has(o.name), `${o.name} が騎手の名前と重なる`);
      assert(/^#[0-9a-f]{6}$/i.test(o.silks.base) && /^#[0-9a-f]{6}$/i.test(o.silks.sub) && PATTERNS.includes(o.silks.pattern), `${o.name} の勝負服`);
      const sk = `${o.silks.base}|${o.silks.sub}|${o.silks.pattern}`; assert(!silks.has(sk), `${o.name} の勝負服がほかと同じ`); silks.add(sk);
      assert(o.likes.length >= 2 && o.face && o.face.style && o.voice && o.intro, `${o.name} の項目が足りない`);
      assert(HS.Special.data(o.memory), `${o.name} の思い出の名馬 ${o.memory} がスペシャルホースにいない`);
      for (const sc of SCENES) for (const k of ['near', 'close']) {
        const set = (o.lines[sc] || {})[k] || [];
        assert(set.length >= 1 && set.some(t => !/^\[/.test(t)), `${o.name} の ${sc}.${k} に、印の無い文が無い`);
      }
      // 持ち主が作った絵：顔の位置があり、assets/owners_<id>.js に4つの表情がある
      assert(o.portrait && o.portrait.x > 0 && o.portrait.y > 0 && o.portrait.w > 0, `${o.name} の絵の顔の位置が無い`);
      const af = require('path').join(__dirname, '..', 'assets', `owners_${o.id}.js`);
      const at = require('fs').existsSync(af) ? require('fs').readFileSync(af, 'utf8') : '';
      for (const m of ['base', 'smile', 'joy', 'sad']) assert(at.includes(`owner_${o.id}_${m}`), `${o.name} の絵 owner_${o.id}_${m} が無い`);
      for (const k of ['up1', 'up2', 'up3', 'gift', 'bond', 'award']) assert((o.scenes[k] || []).length >= 2, `${o.name} の場面 ${k} が無い`);
      const all = JSON.stringify([o.lines, o.scenes, o.intro]);
      for (const m of all.matchAll(/\{(\w+)\}/g)) assert(['me', 'horse', 'race'].includes(m[1]), `${o.name} の文に知らない差し込み {${m[1]}}`);
      assert(!/どこか|少しだけ|そっと|ふと|まるで|気がした|胸が温かく/.test(all), `${o.name} の文に避ける癖の語`);
      assert((all.match(/……/g) || []).length === 0, `${o.name} の文に「……」`);
    }
    return `${L.length}人`;
  });

  check('owners: 依頼は毎週来る・受けると乗り、結果で好感度と騎乗料が動く・断ると下がる（段階の入口より下がらない）', () => {
    const G = newGame(31);
    let weeks = 0, rides = 0, minN = 99;
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
      W.finishWeek({}); weeks++;
    }
    assert(minN >= 1, `依頼が来ない週がある（少ない週 ${minN}件）`);
    const sum = O.list().reduce((a, o) => a + O.of(o.id).rides, 0);
    assert(sum === rides && G.jockey.total.rides === rides, `乗った数が合わない（馬主 ${sum}・騎手 ${G.jockey.total.rides}・受けた ${rides}）`);
    const fees = O.list().reduce((a, o) => a + O.of(o.id).fees, 0);
    assert(fees > 0 && G.player.money > money0, '騎乗料が入っていない');
    assert(O.list().some(o => O.of(o.id).pts > 0), '好感度が動かない');
    // 断る：下がるが、段階の入口より下にはならない
    const offs = O.offers(); const d = offs[0]; assert(d, '依頼が無い');
    const st = O.of(d.oid); st.pts = 50; const before = st.pts;
    assert(!O.decline(d.raceKey) && st.pts < before && st.dec >= 1, '断っても下がらない');
    assert(!O.offers().some(o => o.raceKey === d.raceKey), '断った依頼が残る');
    O.addPts(d.oid, O.TIERS[1].pts + 5 - st.pts); assert(st.tier === 1, '段階が上がらない');
    for (let i = 0; i < 30; i++) O.addPts(d.oid, -10);
    assert(st.tier === 1 && st.pts === O.TIERS[1].pts, `段階の入口より下がった（${st.pts}）`);
    return `${weeks}週・乗った ${rides}・騎乗料 ${U.money(fees)}`;
  });

  check('owners: 段階が上がるほど、依頼のレースの格と馬の強さが上がる', () => {
    newGame(47);
    const stat = { 0: { cls: [], fh: [], max: 0 }, 3: { cls: [], fh: [], max: 0 } };
    for (let i = 0; i < (QUICK ? 16 : 30); i++) {
      const cards = W.cards(), key = `t${i}`;
      for (const t of [0, 3]) for (const o of O.generate(cards, key, { tier: t })) {
        const c = cards.find(c => c.race.key === o.raceKey), h = c.runners.find(x => x.horse.id === o.horseId).horse;
        const cls = O.classOf(c.race);
        stat[t].cls.push(cls); stat[t].fh.push(O.peak(h)); stat[t].max = Math.max(stat[t].max, cls);
        if (t === 0) assert(cls === 0 && O.peak(h) <= O.TIERS[0].maxFh && c.race.region !== '海外', `顔見知りに ${c.race.name} の依頼`);
      }
      W.finishWeek({});
    }
    const a = k => U.avg(stat[k].cls), f = k => U.avg(stat[k].fh);
    assert(stat[0].cls.length && stat[3].cls.length, '依頼が無い');
    assert(a(3) > a(0) + 0.3 && f(3) > f(0) + 3 && stat[3].max >= 3, `格 ${a(0).toFixed(2)}→${a(3).toFixed(2)}・強さ ${f(0).toFixed(1)}→${f(3).toFixed(1)}・相棒のいちばん上 ${stat[3].max}`);
    return `格の平均 ${a(0).toFixed(2)}→${a(3).toFixed(2)}・総合力 ${f(0).toFixed(1)}→${f(3).toFixed(1)}`;
  });

  check('owners: ご褒美は1度だけ（祝いの品・勝負服・引退した馬・思い出の名馬）・名コンビ賞・勝負服を着せる', () => {
    const G = newGame(53);
    const oid = 'takarada', o = O.by(oid), st = O.of(oid);
    const m0 = G.player.money;
    O.addPts(oid, O.TIERS[1].pts);
    const m1 = G.player.money;
    assert(st.tier === 1 && st.got.t1 && m1 > m0, '信頼の祝いの品が入らない');
    O.addPts(oid, 1); O.addPts(oid, -1);
    assert(!O.grant(oid, 't1') && G.player.money === m1, '祝いの品が2度入る');
    O.addPts(oid, O.MAX);
    assert(st.tier === 3 && st.got.t2 && st.got.t3 && st.got.t3.pending && st.got.bond, `段階 ${st.tier}・ご褒美 ${Object.keys(st.got)}`);
    const gift = W.mine().find(h => h.name === o.memory);
    assert(gift && gift.owner === 'P' && gift.legendBought, `思い出の名馬 ${o.memory} が自分の馬になっていない`);
    O.addPts(oid, 50); assert(W.mine().filter(h => h.name === o.memory).length === 1 && !O.grant(oid, 'bond'), '思い出の名馬が2度入る');
    assert(G.owners.queue.filter(q => q.oid === oid).length === 4, '場面の数が違う（信頼・主戦・相棒・最後）');
    // 勝負服を着せる
    assert(!O.wear(gift.id, oid) && O.silksOf(gift) === o.silks, '主戦の馬主の勝負服を着せられない');
    assert(O.wear(gift.id, 'kirishima'), 'まだの馬主の服を着せられる');
    // 引退した馬：相棒の馬主の馬が年明けに引退すると、牧場へ
    const hers = W.all().filter(h => h.owner !== 'P' && O.ownerOf(h) === oid && (h.loc === 'stable' || h.loc === 'farm'));
    assert(hers.length, '馬主の馬がいない');
    assert(hers.every(h => h.sex === '牝'), '牝馬しか持たない馬主が牡馬を持っている');
    const leaver = hers[0]; leaver.retireYear = G.year - 1;
    // 名コンビ賞：その年に3勝
    st.years[G.year] = { rides: 5, wins: 3 };
    const y0 = G.year; let guard = 0;
    while (G.year === y0 && guard++ < 60) W.finishWeek({});
    const got = st.got.t3.horse && W.mine().find(h => h.name === st.got.t3.horse);
    assert(!st.got.t3.pending && got && got.loc === 'retired' && got.giftFrom === oid, `引退した馬が牧場に来ない（${leaver.name}）`);
    assert(G.owners.awards[y0] && G.owners.awards[y0].oid === oid, '名コンビ賞が無い');
    return `思い出の名馬 ${gift.name}・引退して譲られた ${got.name}`;
  });

  check('owners: 古いセーブ（馬主の項目が無い）でも動き、セーブの往復で変わらない', () => {
    const G = newGame(61);
    W.finishWeek({});
    const old = JSON.parse(W.serialize()); delete old.owners;
    W.load(JSON.stringify(old));
    const g = W.get();
    assert(g.owners && O.list().every(o => g.owners.st[o.id]), '古いセーブに馬主の既定値が入らない');
    assert(O.offers().length >= 1, '古いセーブで依頼が来ない');
    const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
    void G;
    return '';
  });

  check('owners: 依頼を受け続けて自動で何年か遊んでも壊れない', () => {
    const G = newGame(73);
    const years = QUICK ? 1 : 2;
    const y0 = G.year;
    let acc = 0, dec = 0, n = 0;
    while (G.year < y0 + years) {
      const offs = O.offers();
      offs.forEach((o, i) => { if (i === 2) { O.decline(o.raceKey); dec++; } else if (!O.clash(o)) { O.accept(o.raceKey, o.horseId); acc++; } });
      W.finishWeek({}); n++;
      assert(n < 60 * years, '年が進まない');
    }
    const tiers = O.list().map(o => O.of(o.id).tier);
    const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
    // 1年（QUICK）では「信頼」まで届かないことがある（レースの釣り合いしだい）。好感度が上がっていることだけ見る
    if (QUICK) assert(O.list().some(o => O.of(o.id).pts > 0), '好感度が一度も上がらない');
    else assert(tiers.some(t => t >= 1), '段階が一度も上がらない');
    return `${years}年・受けた ${acc}・断った ${dec}・段階 ${tiers.join('/')}`;
  });
};
