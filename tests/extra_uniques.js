// 確かめ：固有の技の「動きを直す」13頭（docs/review/UNIQUE_PLAN.md・持ち主の決定 2026-10-20）
// 代表の一戦（かキャリア）の形を人工の状態で入れると出る・出てほしくない形では出ない。斤量の条件は使わない（「斤量条件は難しいので他のに変えてほしい」）
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const U = HS.U, H = HS.Horse, S = HS.Sim, K = HS.Skills;
  const LEN = 2.4;
  // 場面を作る。gap＝先頭との差（馬身。rank 1 なら 0）、gap2＝2番手との差（馬身。rank 1 のとき）
  const X = o => {
    const D = o.D || 2400, straight = o.straight || 450, R = o.R, n = o.n || 16, rank = o.rank || 1;
    const me = { x: D - R, late: !!o.late, lane: o.lane || 1, delay: 0, i: 0, r: { weight: o.weight || 57 } };
    const leader = rank === 1 ? me : { x: me.x + (o.gap || 0) * LEN };
    const second = rank === 1 ? { x: me.x - (o.gap2 == null ? 1 : o.gap2) * LEN } : me;
    return { sim: {}, s: me, c: null, t: o.t == null ? 60 : o.t, D, R, straight, inStraight: R <= straight && R > 0, rank, n,
      whipping: false, close: !!o.close, wall: false, leader, second,
      sk: { rankMid: o.rankMid == null ? null : o.rankMid, led600: !!o.led600, wallFor: 0, boxedFor: 0, duelFor: 0 } };
  };
  // racesim の区間（skills.js の K.step と同じ決め方）と合わせて出るか
  const fires = (name, o) => {
    const u = K.UNIQUE_OF[name]; assert(u, `${name} の固有の技が無い`);
    const x = X(o), ph = x.R <= x.straight + 30 ? 'st' : x.t < 4 ? 'start' : 'mid';
    return (u.at === 'any' || u.at === ph) && !!u.when(x);
  };
  const yes = (name, o, why) => assert(fires(name, o), `${name}：${why} で出ない`);
  const no = (name, o, why) => assert(!fires(name, o), `${name}：${why} で出る`);

  // 直した馬 → 新しい場面の型
  const NEW = { ファーラップ: 'lateOrStayer', ケルソ: 'longHaul', スペクタキュラービッド: 'moveUp', ウィンクス: 'fromBackKick', オルフェーヴル: 'comeback',
    ゴールデンシックスティ: 'chase5', ディープインパクト: 'longMakuri', トレヴ: 'earlyFromBack', プリティーポリー: 'nearOrLead', サイテーション: 'front2Late',
    シャーガー: 'entryFront3', ナリタブライアン: 'chaseOrLead', ドクターフェイガー: 'ledAll' };

  check('uniques: 動きを直した13頭の型・効き目の幅・斤量を使わない', () => {
    for (const [name, w] of Object.entries(NEW)) assert(K.UNIQUE_OF[name] && K.UNIQUE_OF[name].whenId === w, `${name} の型が ${w} でない（${K.UNIQUE_OF[name] && K.UNIQUE_OF[name].whenId}）`);
    // 斤量の条件はどの型にも無い
    for (const [w, f] of Object.entries(K.UWHEN)) assert(!/weight|heavy/.test(String(f)), `${w} が斤量を見る`);
    assert(!K.UWHEN.heavyOrLate, '57kg以上の型が残っている');
    // 効き目は今の固有の技の幅（速さ＋3〜8%・2.5〜5秒、スタミナ＋0.03〜0.06、終いの上限＋0.1〜0.3）
    for (const u of K.UNIQUES) {
      const f = u.fx;
      if (f.spd) assert(f.spd >= 0.03 && f.spd <= 0.08 && f.sec >= 2.5 && f.sec <= 5, `${u.horse} の速さ ${f.spd}・${f.sec}秒`);
      if (f.E) assert(f.E >= 0.03 && f.E <= 0.06, `${u.horse} のスタミナ ${f.E}`);
      if (f.top) assert(f.top >= 0.1 && f.top <= 0.3, `${u.horse} の終い ${f.top}`);
      assert(!/斤量|キロ|kg/.test(u.note), `${u.horse} の説明に斤量`);
    }
    // 同じ型・効き目だった3頭（ファーラップ・ケルソ・スペクタキュラービッド）は別々
    const sig = n => { const u = K.UNIQUE_OF[n]; return u.whenId + JSON.stringify(u.fx); };
    assert(new Set(['ファーラップ', 'ケルソ', 'スペクタキュラービッド'].map(sig)).size === 3, '3頭の技が重なる');
    // ドクターフェイガーとフランケルも分かれた（同じ ledAll でも効き目が違う）
    assert(sig('ドクターフェイガー') !== sig('フランケル'), 'ドクターフェイガーとフランケルが同じ');
    const fg = K.UNIQUE_OF['ドクターフェイガー'].fx;
    assert(fg.spd === 0.06 && fg.sec === 3 && !fg.E, 'ドクターフェイガーの効き目');
  });

  check('uniques: 代表の一戦・キャリアの形で出て、違う形では出ない', () => {
    // ファーラップ：メルボルンカップ（3200m）・アグアカリエンテ（出遅れ）。重い斤量だけでは出ない
    yes('ファーラップ', { D: 3200, R: 450 + 300, rank: 5 }, '3200mの直線の手前');
    yes('ファーラップ', { D: 2000, R: 400 + 200, rank: 10, late: true }, '出遅れた2000m');
    no('ファーラップ', { D: 2400, R: 450 + 300, rank: 5, weight: 62 }, '出遅れず2400mで重い斤量');
    no('ファーラップ', { D: 3200, R: 450 + 600, rank: 5 }, '直線の手前600m（早すぎ）');
    // ケルソ：2マイルのゴールドカップ。2000mでは出ない・直線に入ってからは出ない
    yes('ケルソ', { D: 3200, R: 400 + 300, rank: 3 }, '3200mの直線の手前');
    no('ケルソ', { D: 2000, R: 400 + 300, rank: 3, late: true, weight: 62 }, '2000m（出遅れ・重い斤量でも）');
    // スペクタキュラービッド：後方からまくって直線入口で先頭
    yes('スペクタキュラービッド', { D: 2000, R: 440, straight: 450, rank: 1, rankMid: 7 }, '中間点7番手から直線入口で先頭');
    no('スペクタキュラービッド', { D: 2000, R: 440, straight: 450, rank: 1, rankMid: 2, late: true }, '中間点から1頭しか抜いていない（出遅れでも）');
    no('スペクタキュラービッド', { D: 2000, R: 440, straight: 450, rank: 3, rankMid: 9 }, '直線入口で3番手');
    // ウィンクス：コックスプレート2016（3〜4コーナーで先頭へ、直線は先頭）。中間点で前にいた形では出ない
    yes('ウィンクス', { D: 2040, R: 300, straight: 300, n: 14, rank: 1, rankMid: 9 }, '中間点9番手から先頭');
    yes('ウィンクス', { D: 2000, R: 300, n: 14, rank: 10, rankMid: 12 }, '後方のまま直線');
    no('ウィンクス', { D: 2000, R: 300, n: 14, rank: 10, rankMid: 4 }, '中間点4番手');
    // オルフェーヴル：有馬記念2013（後方から外を上がり、4コーナーで先頭）
    yes('オルフェーヴル', { D: 2500, R: 300, straight: 310, n: 16, rank: 1, rankMid: 13 }, '中間点13番手から直線入口で先頭');
    no('オルフェーヴル', { D: 2500, R: 300, straight: 310, n: 16, rank: 12, rankMid: 13 }, '1頭しか抜いていない');
    no('オルフェーヴル', { D: 2500, R: 300, straight: 310, n: 16, rank: 1, rankMid: 4 }, '中間点4番手');
    // ゴールデンシックスティ：後方から5馬身以内を差す。2000mでも出る。先頭では出ない
    yes('ゴールデンシックスティ', { D: 2000, R: 300, rank: 5, gap: 4.5 }, '2000mで先頭から4.5馬身');
    no('ゴールデンシックスティ', { D: 1600, R: 300, rank: 1 }, '先頭');
    no('ゴールデンシックスティ', { D: 1600, R: 300, rank: 6, gap: 6 }, '6馬身差');
    // ディープインパクト：天皇賞（春）2006（後方から残り1000m付近で動き、4コーナーで先頭）。直線の前に出る
    yes('ディープインパクト', { D: 3200, R: 400 + 500, straight: 400, n: 17, rank: 12, rankMid: 16 }, '中間点16番手で直線の手前500m');
    yes('ディープインパクト', { D: 3200, R: 400 + 100, straight: 400, n: 17, rank: 1, rankMid: 16 }, '4コーナーで先頭');
    no('ディープインパクト', { D: 3200, R: 400 + 500, straight: 400, n: 17, rank: 3, rankMid: 3 }, '中間点3番手');
    no('ディープインパクト', { D: 3200, R: 300, straight: 400, n: 17, rank: 15, rankMid: 16 }, '直線に入ってから（今の直線一気の場面）');
    // トレヴ：凱旋門賞2013（中間点14番手、残り600mで動いて先頭）。直線の残り400mで後ろのままでは出ない
    yes('トレヴ', { D: 2400, R: 550, straight: 530, n: 17, rank: 1, rankMid: 14 }, '中間点14番手から残り550mで先頭');
    no('トレヴ', { D: 2400, R: 300, straight: 530, n: 17, rank: 12, rankMid: 14 }, '直線で後ろのまま');
    no('トレヴ', { D: 2400, R: 550, straight: 530, n: 17, rank: 2, rankMid: 4 }, '中間点4番手');
    // プリティーポリー：1000ギニー・オークスの逃げ切り
    yes('プリティーポリー', { D: 1600, R: 350, rank: 1 }, '残り350mで先頭');
    yes('プリティーポリー', { D: 1600, R: 350, rank: 2, gap: 0.5 }, '先頭から半馬身');
    no('プリティーポリー', { D: 1600, R: 350, rank: 2, gap: 2 }, '先頭から2馬身');
    // サイテーション：プリークネス・ベルモントはスタート直後から先頭でそのまま
    yes('サイテーション', { D: 2400, R: 450 + 300, rank: 1 }, '直線の手前で先頭');
    yes('サイテーション', { D: 2000, R: 400 + 300, rank: 2 }, '直線の手前で2番手');
    no('サイテーション', { D: 2400, R: 450 + 300, rank: 4 }, '4番手');
    no('サイテーション', { D: 2400, R: 300, rank: 1 }, '直線に入ってから');
    // シャーガー：英ダービー（最後のコーナーで先頭、10馬身差）
    yes('シャーガー', { D: 2400, R: 440, straight: 450, rank: 1 }, '直線入口で先頭');
    yes('シャーガー', { D: 2400, R: 440, straight: 450, rank: 3, gap: 1 }, '直線入口で3番手');
    no('シャーガー', { D: 2400, R: 440, straight: 450, rank: 5, gap: 2 }, '直線入口で5番手');
    // ナリタブライアン：早めに抜け出して突き放す（菊花賞7馬身・有馬記念は4コーナーで先頭）
    yes('ナリタブライアン', { D: 3000, R: 300, rank: 1 }, '残り300mで先頭');
    yes('ナリタブライアン', { D: 2000, R: 300, rank: 3, gap: 2 }, '先頭から2馬身');
    no('ナリタブライアン', { D: 2000, R: 300, rank: 6, gap: 5 }, '先頭から5馬身');
    // ドクターフェイガー：逃げてそのまま（ワシントンパークH）
    yes('ドクターフェイガー', { D: 1600, R: 350, rank: 1, led600: true }, '残り600mから先頭');
    no('ドクターフェイガー', { D: 1600, R: 350, rank: 1, led600: false }, '残り400mで先頭に替わったばかり');
  });

  // 本物のレースで出る（1頭目だけが固有の技を持つ。ほかの馬は発動の能力を持たない）
  check('uniques: 直した技が本物のレースで出る', () => {
    const field = (rng, mod, dist) => {
      const f = [];
      for (let i = 0; i < 14; i++) { const h = H.makeFiller(rng, { level: 82, surface: '芝', dist, born: 2000 }); h.name = 'h' + i; if (mod) mod(h, i); f.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 }); }
      return f;
    };
    const setup0 = K.setup;
    const run = (id, style, dist, N, seed) => {
      const rng = new U.RNG(seed);
      let fired = 0;
      K.setup = sim => { setup0(sim); sim.st.forEach(s => { s.trig = []; }); sim.st[0].trig = [id]; };
      try {
        for (let k = 0; k < N; k++) {
          const sim = S.create({ dist, surface: '芝', course: '東京', ground: '良', year: 2004 }, field(rng, (h, i) => { if (i === 0) h.style = style; }, dist), H.weekIndex(2004, 5, 1), rng, {});
          while (!S.step(sim)) { /* 進める */ }
          S.finish(sim);
          if (sim.skillFx.some(f => f.i === 0 && f.id === id)) fired++;
        }
      } finally { K.setup = setup0; }
      return fired;
    };
    const out = [];
    for (const [name, style, dist] of [['ファーラップ', '先行', 3200], ['ケルソ', '差し', 2400], ['スペクタキュラービッド', '先行', 2000], ['ウィンクス', '追込', 2000],
      ['オルフェーヴル', '追込', 2500], ['ゴールデンシックスティ', '差し', 1600], ['ディープインパクト', '追込', 3200], ['トレヴ', '追込', 2400],
      ['プリティーポリー', '逃げ', 1600], ['サイテーション', '先行', 2400], ['シャーガー', '先行', 2400], ['ナリタブライアン', '先行', 2400], ['ドクターフェイガー', '逃げ', 1600]]) {
      const id = K.UNIQUE_OF[name].id, f = run(id, style, dist, 20, 71);
      assert(f >= 2, `${name}（${style}・${dist}m）が20回で${f}回しか出ない`);
      out.push(`${name}${f}`);
    }
    return out.join('・') + '／20';
  });
};
