// お手馬のレースの記録（持ち主の決定 2026-10-20「自分のお手馬についてはどのレースも出走馬やラップ、ゴールタイム　着差などの情報をあとから見れるようにしてください
// 引退後も見れるのは殿堂入り馬のみです」）
// 自分の持ち馬（owner 'P'。自分で乗った・おまかせ・依頼のどれでも）が走ったレースは、戦績の1走（h.results[i]）に rec を付けて残す。
// リプレイが残っていないレースでも、この記録で出走馬とラップを出す。セーブを小さくするため、数字の配列で持つ：
//   rec.f   ＝ 出走馬（着順の並び）。1頭 [馬名, 馬番, タイム（0.1秒の整数）, 着差の言葉, 人気, 騎手]。枠は馬番と頭数から（HS.World.frameOf）
//   rec.lap ＝ 先頭の200mごとのラップ（0.1秒の整数。最初は距離の端数。足すと勝ち時計）。区切りを全部とれなかったときは []
// 引退したら消す（HS.RaceRec.strip）。殿堂入りした馬は、殿堂の写し（G.hallOwn の results）に残る。前のセーブの記録の無い1走は「記録なし」
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const RR = HS.RaceRec = {};
  const t10 = x => Math.round(x * 10);

  // 1レースの記録（sim は S.finish の結果。results は着順の並びで、人気 pop が付いたもの）
  RR.make = function (race, sim) {
    const f = sim.results.map(r => [r.horse.name, r.num, t10(r.time), r.margin || '', r.pop || 0, (r.jockey && r.jockey.name) || '']);
    const lap = [];
    const sp = sim.splits || [];
    if (sp.length && sp.length === HS.Sim.lapMarks(race.dist).length) {
      let prev = 0;
      for (const x of sp) { const c = t10(x); lap.push(c - prev); prev = c; }
      lap.push(t10(sim.results[0].time) - prev);
    }
    return { f, lap };
  };
  // 読む側：出走馬の行（枠・着順つき）とラップ（秒）
  RR.has = r => !!(r && r.rec && r.rec.f && r.rec.f.length);
  RR.rows = function (r) {
    if (!RR.has(r)) return [];
    const n = r.rec.f.length;
    return r.rec.f.map((x, k) => ({ pos: k + 1, name: x[0], num: x[1], frame: HS.World.frameOf(x[1], n), time: x[2] / 10, margin: x[3], pop: x[4], jockey: x[5] }));
  };
  RR.laps = r => (RR.has(r) ? r.rec.lap.map(v => v / 10) : []);
  RR.winTime = r => (RR.has(r) ? r.rec.f[0][2] / 10 : null);
  // 引退：その馬の戦績から記録を消す（殿堂の写しは別に持つ）
  RR.strip = function (h) {
    for (const r of (h && h.results) || []) delete r.rec;
  };
})();
