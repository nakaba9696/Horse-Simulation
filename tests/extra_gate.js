// 検証：スタートは目押し・騎手のゲームに放牧は無い（持ち主の指摘 2026-10-17「スタートのカウントダウンいらない　目押しで」「放牧いらない」）
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const fs = require('fs'), path = require('path'), vm = require('vm');
  const ROOT = path.join(__dirname, '..');
  const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const code = src => src.split('\n').filter(l => !/^\s*(\/\/|#)/.test(l)).map(l => l.replace(/\s\/\/.*$/, '')).join('\n'); // 注釈を除く
  const S = HS.Sim, U = HS.U, W = HS.World, G = S.GATE;

  // 自分で乗るレースを1つ作る（種 seed）
  const rideSim = seed => {
    W.newGame({ seed: 5, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const race = { key: 'gate-test', name: 'テスト', course: '東京', surface: '芝', dist: 1600, ground: '良', year: 2025, month: 5, week: 2, grade: null, cls: 'OP', region: 'JRA' };
    const rng = new U.RNG(seed);
    const runners = [];
    for (let i = 0; i < 10; i++) runners.push({ horse: HS.Horse.makeFiller(new U.RNG(seed * 31 + i), { level: 80, surface: '芝', dist: 1600, born: 2021, name: 'テスト' + i }), jockey: { name: '—', skill: 75 }, weight: 57, num: i + 1, frame: i + 1, rider: i === 3 ? 'P' : null });
    return S.create(race, runners, HS.Horse.weekIndex(2025, 5, 2), rng, { ride: true });
  };

  check('gate: 数え（3・2・1）の数字と音を出さない（JS・Godot とも）', () => {
    const ride = code(read('js/ui/ride.js')), audio = code(read('js/ui/audio.js'));
    assert(!/se\('count'\)/.test(ride) && !/function countdown/.test(ride) && !/COUNT\s*=/.test(ride), 'ride.js に数えが残っている');
    assert(!/name === 'count'/.test(audio), 'audio.js に数えの音が残っている');
    const hud = code(read('godot/ui/ride_hud.gd')), view = code(read('godot/view/race_view.gd'));
    assert(!/_countdown/.test(hud), 'ride_hud.gd に数えが残っている');
    assert(!/const COUNT\b/.test(view) && !/_count_shown/.test(view), 'race_view.gd に数えが残っている');
    // 前触れ（ゲートの上の灯）を描いている
    assert(/view\.tell|tell:/.test(ride) && /setLamps/.test(read('js/ui/race3d.js')) && /set_lamps/.test(view), '前触れの灯が無い');
  });

  check('gate: 待つ秒はレースの種で決まり、毎回少し違う（種の乱数は進めない）', () => {
    const ws = [];
    for (let k = 1; k <= 24; k++) {
      const r = new U.RNG(1000 + k), s0 = r.s;
      const w = S.gateWaitOf(r);
      assert(r.s === s0, '待つ秒を決めると種の乱数が進む');
      assert(w >= G.wait && w < G.wait + G.spread, `待つ秒が範囲の外 ${w}`);
      assert(S.gateWaitOf(new U.RNG(1000 + k)) === w, '同じ種で違う');
      ws.push(w);
    }
    const spread = Math.max(...ws) - Math.min(...ws);
    assert(new Set(ws.map(w => w.toFixed(2))).size >= 18 && spread > G.spread * 0.6, '待つ秒がばらつかない');
    const a = rideSim(77), b = rideSim(77);
    assert(a.gateWait === b.gateWait && a.gateWait > G.tell + 0.5, 'レースの待つ秒が種で決まらない');
    return `${Math.min(...ws).toFixed(2)}〜${Math.max(...ws).toFixed(2)} 秒（レースの秒）`;
  });

  check('gate: 前触れを見て開く瞬間に押せば GOOD、開いてから反応して押すと GOOD にならない、早押し・連打は GOOD にならない', () => {
    const at = (t, pre) => { const sim = rideSim(91); if (pre != null) S.ctl.up(sim, pre); return { r: S.ctl.up(sim, t), sim }; };
    // 灯がついてから tell 秒後に開く。狙って押した（開く 0.1 秒前〜0.08 秒後）
    for (const t of [-0.1, -0.05, 0, 0.05, 0.08]) { const x = at(t); assert(x.r === 'good' && x.sim.st[x.sim.me].delay === 0.05, `狙った押し ${t} が GOOD でない（${x.r}）`); }
    // 開いてから見て押す（人の反応はおよそ 0.2 秒＝レースの秒で 0.27）：GOOD でない・出は押した時刻
    for (const t of [0.15, 0.27, 0.4]) { const x = at(t); assert(x.r === 'ok' && x.sim.st[x.sim.me].delay === t, `反応の押し ${t} が ok でない（${x.r}）`); }
    assert(at(0.6).r === 'late', '0.5 秒より遅いのに出遅れでない');
    // 早押し：馬が煽る（まだ出ない・気分が上がる）。そのあと開いた瞬間に押しても GOOD にならず、出は fumble 秒
    const s1 = rideSim(91), t0 = s1.ctl.tension;
    assert(S.ctl.up(s1, -0.5) === 'fumble' && !s1.ctl.started && s1.ctl.tension > t0, '早押しで馬が煽らない');
    assert(S.ctl.up(s1, 0) === 'ok' && s1.st[s1.me].delay === G.fumble, '早押しのあとでも GOOD になる');
    // 連打（ゲートの中から 0.1 秒おき）は GOOD にならない
    const s2 = rideSim(91); let last = null;
    for (let t = -s2.gateWait; t < 0.3 && !s2.ctl.started; t += 0.1) last = S.ctl.up(s2, t);
    assert(last !== 'good', '連打で GOOD が取れる');
    // 押さなければ出遅れ（模擬が 0.9 秒で出す）
    const s3 = rideSim(91); while (s3.t < 1) S.step(s3);
    assert(s3.ctl.started && s3.st[s3.me].late, '押さないのに出遅れない');
    // GOOD の幅：開く前 buf ＋ 開いたあと good（実時間では 1.35 で割る）
    return `GOOD の幅 ${G.buf}＋${G.good} 秒（実時間 ${((G.buf + G.good) / 1.35 * 1000).toFixed(0)}ms）・前触れは ${G.tell} 秒前（実時間 ${(G.tell / 1.35 * 1000).toFixed(0)}ms）`;
  });

  check('style: 騎乗中に脚質の矢印4つ（追込・差し・先行・逃げ）と得意な位置の帯・いまの位置の点を描く（JS は左上・Godot は左下の板。持ち主の指摘 2026-10-20「脚質は左下に」）', () => {
    const ride = code(read('js/ui/ride.js')), hud = code(read('godot/ui/ride_hud.gd'));
    assert(/STYLE_ORDER = \['追込', '差し', '先行', '逃げ'\]/.test(ride) && /styleRow\(x \+ 12, y \+ 72/.test(ride) && /S\.ZONE\[style\]/.test(ride), 'ride.js に脚質の矢印が無い');
    assert(/func _style_row/.test(hud) && /_style_row\(x \+ 12, y \+ 8,/.test(hud) && /var y := VH - /.test(hud.split('func _style_panel')[1] || '') && /UiStyleArrows\.ORDER/.test(hud) && /HSSim\.ZONE/.test(hud), 'ride_hud.gd に脚質の矢印が無い');
    assert(/const ORDER := \["追込", "差し", "先行", "逃げ"\]/.test(read('godot/ui/style_arrows.gd')), '脚質の印の並びが出走表と違う');
  });

  check('ride: Godot の騎乗の計器に FIGHT・WHIP の表示が無く、折り合いは馬の頭・手綱は HOLD／PUSH の帯（持ち主の指摘 2026-10-20）', () => {
    const hud = code(read('godot/ui/ride_hud.gd'));
    assert(!/"FIGHT"|"WHIP"/.test(hud), 'ride_hud.gd に FIGHT・WHIP の文字が残っている');
    assert(!/func _fight_meter|func _whip_hand/.test(hud), 'ride_hud.gd に気合の目盛り・ムチの手の札が残っている');
    assert(/func _temper/.test(hud) && /func _reins/.test(hud) && /"HOLD"/.test(hud) && /"PUSH"/.test(hud), 'ride_hud.gd に馬の頭の札・手綱の帯が無い');
  });

  // JS 版にしかない確かめ「farm: 騎手のゲームでは…」は外した（持ち主の決定 2026-10-22「不要なら消していい」。JS 版はもう作らない）
};
