// 決まった乗り方をする打ち手（ボット）。tools/balance_bench.js と tests/run.js で、乗り方ごとの勝ち負けを比べる。
// 乗り方：
//   none   … スタートだけ切って、あとは何もしない
//   push   … 位置は気にせず、直線の手前からしごいて（段をいちばん上＝全開に）直線でムチ（ただ追う）
//   fit    … 噛み合った乗り方（慣れた人の乗り方）：その日のペースと脚質・気性・特殊能力に合わせて位置を取り、仕掛けどころを選ぶ。
//            追い出してからは脚の残りを見て、全開でゴールまで持つと読めてから全開にする（それまでは段 S.DRIVE.from で脚を配る。2026-10-22）
//   misfit … 噛み合わない乗り方：ペースと逆の位置（スローで後ろ・ハイで前）へ動かし、仕掛けも逆（スローで遅く・ハイで早く）
//   beat   … ただ追うと同じ仕掛け（全開）で、追い出してからは馬の拍子（S.BEAT。首が下がって前へ伸びる所）に合わせてしごき続ける
//   mash   … ただ追うと同じ仕掛け（全開）で、追い出してからは拍子を見ずに 0.1 秒ごとに連打する
//   （2026-10-22 まで beat・mash は噛み合った乗り方に足していた。噛み合った乗り方は全開にするのが最後だけになったので、拍子の効きはただ追うと比べる）
// おまかせ（騎手の腕で自動に乗る）は、模擬を opts.ride なしで作ればよい（ボットは要らない）
module.exports = function (HS) {
  const S = HS.Sim, H = HS.Horse;
  // 脚質ごとの、隊列の中で居たい位置（前から何割目か）
  const MID = { '逃げ': 0, '先行': 0.22, '差し': 0.52, '追込': 0.85 };
  const FRONT = ['nebari', 'tanki', 'nimai', 'yonkaku'];
  const BACK = ['chokusen', 'saikoubi'];

  // いまのペースの読み：決まった地点を過ぎたら判定、その前は逃げ馬の数から（騎乗の画面と同じ）
  const paceRead = sim => {
    if (sim.check) return sim.check.verdict;
    const n = sim.st.filter(s => s.h.style === '逃げ').length;
    return n >= 2 ? 'ハイペース' : n === 0 ? 'スローペース' : '平均ペース';
  };
  // 全開でゴールまで走るのに要る脚（残り R m）。全開の速さ（伸びの上限の上 S.DRIVE.k）で、脚の使い方 ×(1＋S.DRIVE.c)。坂などは見ない
  const driveNeed = (sim, s, R) => {
    const full = 1 + s.kickS * (1 + (sim.top + (s.topAdd || 0) - 1)) * (1 + S.DRIVE.k);
    return R * 0.9 / s.Ds * full * full * full * s.spurtCost * (1 + S.DRIVE.c);
  };
  // 気性が穏やか（または自由自在）で、位置の融通がきくか
  const flexible = s => H.has(s.h, 'jiyu') || S.temperF(s) <= 1.12;

  function make(policy) {
    let nextTap = 0, nextWhip = 0, nextSteer = 0, nextPos = 0;
    // 手綱の段を want に寄せる（0.25 秒に1回まで）
    const tapTo = (sim, want) => {
      const c = sim.ctl;
      if (sim.t < nextTap) return;
      if (c.gear < want - 0.06) { S.ctl.up(sim); nextTap = sim.t + 0.25; }
      else if (c.gear > want + 0.06) { S.ctl.down(sim); nextTap = sim.t + 0.25; }
    };
    // 進路：直線の手前から、前（10m 以内）に馬のいない一番内の進路へ出しておく（詰まってから動くと遅い）
    const steer = sim => {
      const c = sim.ctl, s = sim.st[sim.me];
      if (sim.t < nextSteer || sim.D - s.x > sim.straight + 120) return;
      const free = l => !sim.st.some(o => o !== s && !o.done && o.x > s.x - 1 && o.x - s.x < 10 && Math.abs(o.lane - l) < 0.9);
      if (free(c.lane)) return;
      for (let d = 1; d <= 6; d++) {
        if (c.lane + d <= 9 && free(c.lane + d)) { S.ctl.lane(sim, 1); nextSteer = sim.t + 0.3; return; }
        if (c.lane - d >= 0 && free(c.lane - d)) { S.ctl.lane(sim, -1); nextSteer = sim.t + 0.3; return; }
      }
    };
    return function tick(sim) {
      const c = sim.ctl; if (!c) return;
      const s = sim.st[sim.me];
      if (!c.started) { S.ctl.up(sim); return; }
      if (policy === 'none' || s.done) return;
      steer(sim);
      const R = sim.D - s.x, st = sim.straight, prog = s.x / sim.D;
      const v = paceRead(sim);
      const trig = s.trig || [];
      // 直線のムチ（どの乗り方も同じ）
      const whipNow = () => { if (R < st && sim.t >= nextWhip && c.whips < 9) { S.ctl.whip(sim, c.hand); nextWhip = sim.t + 0.5; } };
      if (policy === 'push' || policy === 'beat' || policy === 'mash') {
        if (R < st + 350) {
          if (policy === 'beat' && c.gear > 0.9) { let off = Math.abs(S.beatPhase(s) - S.BEAT.at); if (off > 0.5) off = 1 - off; if (off < S.BEAT.win * 0.6 && sim.t - c.lastPush > 0.3) S.ctl.up(sim); }
          else if (policy === 'mash' && c.gear > 0.9) S.ctl.up(sim);
          else tapTo(sim, 1);
        }
        whipNow();
        return;
      }
      const fit = policy === 'fit';
      // 仕掛けどころ（残り m）
      const early = st + 460, mid = st + 350, late = st + 80; // 東京の直線（525m）で、早め＝残り985m・ふつう＝875m・遅め＝605m
      let go = v === 'スローペース' ? (fit ? early : late) : v === 'ハイペース' ? (fit ? late : early) : mid;
      if (fit && v === 'ハイペース' && !flexible(s) && (s.h.style === '逃げ' || s.h.style === '先行')) go = mid; // 荒い先行馬は抑えると掛かるので、ふつうに
            if (fit && H.has(s.h, 'longspurt')) go = Math.max(go, st + 320);
      // 慣れた人は、ハイペースでなければ直線の手前 480m から追い出し、脚の残りを配って運ぶ（段 S.DRIVE.from まで。全開にはしない）
      if (fit && v !== 'ハイペース') go = Math.max(go, st + 480);
      if (R <= go) {
        // 全開にするのは、脚の残り（計器のスタミナ）が全開でゴールまで持つと読めてから（馬の持ちはスタミナ・距離適性から。1割の余裕を見る）。
        // ただ追う・噛み合わない乗り方は、追い出したら段をいちばん上（全開）にする
        const gearGo = fit && s.E < driveNeed(sim, s, R) * 1.1 ? S.DRIVE.from : 1;
        tapTo(sim, gearGo);
        whipNow();
        if (fit && trig.includes('oosoto') && c.lane < 5 && R < st + 100) S.ctl.lane(sim, 1);
        return;
      }
      if (prog < 0.08) { tapTo(sim, 0); return; }
      // 道中の位置取り：居たい位置（前から何割目か）を決め、手綱の段を少しずつ動かして寄せる（段は保たれる）
      const base = MID[s.h.style] != null ? MID[s.h.style] : 0.3;
      const shift = v === 'スローペース' ? -1 : v === 'ハイペース' ? 1 : 0;
      let want = null; // null＝動かさない
      if (fit) {
        // 気性が穏やか（自由自在）なら、ペースに合わせて大きく動かす。荒い馬は動かさない
        if (shift && flexible(s)) want = base + shift * 0.28;
        if (trig.some(id => FRONT.includes(id)) && (s.h.style === '逃げ' || s.h.style === '先行') && shift < 0) want = 0;
        if (shift > 0 && trig.some(id => BACK.includes(id))) want = Math.max(want == null ? base : want, 0.6); // ハイペースで直線一気などを持っていれば、後ろでためて直線で
      } else {
        want = shift ? base - shift * 0.45 : base + (base < 0.5 ? 0.45 : -0.45); // ペースと逆へ（平均ペースでも脚質と違う位置へ）
      }
      let g = c.gear;
      if (want != null && sim.t >= nextPos) {
        want = Math.max(0, Math.min(1, want));
        const err = (s.rk == null ? 0.5 : s.rk) - want;
        if (err > 0.08) g = Math.min(0.9, g + 0.08); else if (err < -0.08) g = Math.max(-0.9, g - 0.08);
        nextPos = sim.t + 0.8;
      }
      // 噛み合った乗り方は、気分が悪くなったら手綱を戻してなだめる（掛かり癖の馬は引かない）
      if (fit && c.tension > 60 && !H.has(s.h, 'kakari')) g = Math.min(g, 0);
      // ハイペースの遅仕掛けは、勝手に追い出さないよう手綱を少し抑える
      if (fit && v === 'ハイペース' && R < s.spurtR + 20 && (flexible(s) || s.h.style === '差し' || s.h.style === '追込')) g = Math.min(g, -0.1);
      tapTo(sim, g);
    };
  }
  return { make, paceRead, flexible, MID };
};
