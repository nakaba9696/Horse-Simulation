// 殿堂（お手馬）：トロフィーを2つ以上手にした自分の馬は、引退したときに殿堂入りし、その記録をあとから振り返れる
// （持ち主の指摘 2026-10-16「トロフィーを2個以上獲得した馬は引退時に殿堂入りして記録を振り返れるように。歴代の殿堂入りお手馬を見れるように」）
// 記録は引退したときの写し（G.hallOwn）。馬を牧場から放しても残る
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const W = HS.World;
  const HL = HS.Hall = {};
  HL.NEED = 2;

  // その馬が手にしたトロフィー（前のセーブは馬の名前で引く）
  HL.trophiesOf = function (h) {
    const G = W.get(), TR = HS.Trophy;
    return Object.entries(G.trophies || {}).filter(([, v]) => v && (v.hid ? v.hid === h.id : v.horse === h.name))
      .map(([id, v]) => ({ id, label: TR && TR.BY[id] ? TR.BY[id].label : id, y: v.y, bonus: v.bonus || 0 }))
      .sort((a, b) => a.y - b.y);
  };
  HL.eligible = h => !!h && h.owner === 'P' && HL.trophiesOf(h).length >= HL.NEED;
  HL.list = () => (W.get().hallOwn || []).slice().sort((a, b) => b.trophies.length - a.trophies.length || b.g1 - a.g1 || a.retiredY - b.retiredY);
  HL.byId = id => (W.get().hallOwn || []).find(x => x.id === id) || null;

  // 引退したときに呼ぶ（original.js・jockey.js の引退から）。殿堂入りしたら写しを返す
  HL.onRetire = function (h) {
    const G = W.get();
    if (!HL.eligible(h)) return null;
    G.hallOwn = G.hallOwn || [];
    if (G.hallOwn.some(x => x.id === h.id)) return null;
    const S = HS.Season, O = HS.Original;
    const fh = S && S.fhPeak ? S.fhPeak(h) : null;
    const res = (h.results || []).map(r => Object.assign({}, r));
    const e = {
      id: h.id, name: h.name, born: h.born, sex: h.sex, coat: h.coat, sire: h.sire, dam: h.dam, hist: !!h.hist, original: !!h.original,
      style: h.style, kire: h.kire, skills: O && O.skillsOf ? O.skillsOf(h) : (h.skills || []).slice(),
      starts: h.starts || 0, wins: h.wins || 0, w2: h.w2 || 0, w3: h.w3 || 0, prize: h.prize || 0,
      g1: (h.gradedWins || []).filter(g => g.grade === 'G1' || g.grade === 'GF').length,
      gradedWins: (h.gradedWins || []).map(g => Object.assign({}, g)),
      trophies: HL.trophiesOf(h), titles: (h.titles || []).slice(),
      fh: fh ? { turf: fh.turf, dirt: fh.dirt } : null,
      first: res.length ? res[0].y : G.year, retiredY: G.year, results: res,
    };
    G.hallOwn.push(e);
    W.dirty();
    W.news(`${h.name}が殿堂入りした！（トロフィー ${e.trophies.map(t => t.label).join('・')}）`, 'g1');
    return e;
  };
})();
