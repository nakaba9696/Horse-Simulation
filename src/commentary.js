// 実況とコメント（画面には依存しない）。数値はなるべく出さず、言葉で伝える
(function (HS) {
  const style = (h) => HS.STYLES[h.style].label;

  // レースの記録（位置の推移）から実況の文を作る。t は秒
  function buildCommentary(race, field, sim, mineIds) {
    const lines = [];
    const frames = sim.frames;
    if (!frames.length) return lines;
    const D = race.distance;
    const mine = new Set((mineIds || []).map((id) => field.findIndex((h) => h.id === id)).filter((i) => i >= 0));
    const nm = (i) => (mine.has(i) ? `★${field[i].name}` : field[i].name);
    const orderAt = (f) => f.xs.map((x, i) => i).sort((a, b) => f.xs[b] - f.xs[a]);
    const frameAtLead = (dist) => frames.find((f) => Math.max(...f.xs) >= dist) || frames[frames.length - 1];
    const say = (f, text) => lines.push({ t: f.t, text });

    const f0 = frameAtLead(Math.min(150, D * 0.1));
    const o0 = orderAt(f0);
    say({ t: 0.5 }, `${race.name}、スタートしました！`);
    say(f0, `ハナを切ったのは ${nm(o0[0])}。${nm(o0[1])} が続きます。`);

    const f1 = frameAtLead(D * 0.4);
    const o1 = orderAt(f1);
    say(f1, `中団まで来て、先頭は ${nm(o1[0])}、2番手 ${nm(o1[1])}、3番手 ${nm(o1[2])}。最後方は ${nm(o1[o1.length - 1])}。`);
    mine.forEach((i) => {
      const pos = o1.indexOf(i) + 1;
      if (pos > 3) say(f1, `${nm(i)} は ${pos} 番手。${field[i].style === 'sashi' || field[i].style === 'oikomi' ? 'じっと脚をためています。' : '少し位置が後ろか。'}`);
    });

    // スタミナが切れた馬
    const fades = new Set();
    frames.forEach((f, k) => {
      if (k === 0) return;
      f.hp.forEach((hp, i) => {
        if (hp <= 0 && frames[k - 1].hp[i] > 0 && !fades.has(i) && orderAt(f).indexOf(i) < 4) {
          fades.add(i);
          say(f, `${nm(i)} は苦しくなった！ 脚いろが鈍ります。`);
        }
      });
    });

    const f2 = frameAtLead(D * 0.75);
    const o2 = orderAt(f2);
    say(f2, `4コーナーを回って直線！ 先頭は ${nm(o2[0])}、外から ${nm(o2[1])}！`);

    const f3 = frameAtLead(D - 200);
    const o3 = orderAt(f3);
    const gap = f3.xs[o3[0]] - f3.xs[o3[1]];
    if (gap < 2) say(f3, `残り200！ ${nm(o3[0])} と ${nm(o3[1])} の激しい叩き合い！`);
    else if (gap > 6) say(f3, `残り200！ ${nm(o3[0])} が抜け出した！ 後続を突き放す！`);
    else say(f3, `残り200！ ${nm(o3[0])} が先頭、${nm(o3[1])} が迫る！`);
    // 後ろから一気に来た馬
    const rally = sim.results.slice(0, 3).find((r) => o2.indexOf(r.index) >= 5);
    if (rally) say(f3, `大外から ${nm(rally.index)} がすごい脚で飛んでくる！`);

    const w = sim.results[0];
    const second = sim.results[1];
    const lastT = frames[frames.length - 1].t;
    const finishT = Math.min(lastT, w.time + 0.2);
    say({ t: finishT }, `${nm(w.index)}、1着でゴールイン！ 2着は ${nm(second.index)}、着差は ${second.margin}。`);
    if (mine.has(w.index)) say({ t: finishT + 0.5 }, `やりました！ ${field[w.index].jockeyName || '鞍上'} がガッツポーズ！`);
    return lines.sort((a, b) => a.t - b.t);
  }

  // パドックの見立て（調子と疲れから）
  function paddockComment(h) {
    if (h.condition >= 2) return '気合十分、毛ヅヤもピカピカ。仕上がりは最高です。';
    if (h.condition === 1) return '落ち着いて周回しています。好調そうです。';
    if (h.fatigue > 70) return '少し元気がありません。疲れが残っているようです。';
    if (h.condition <= -2) return 'イレ込んで汗をかいています。今日は厳しいかも。';
    if (h.condition === -1) return 'もうひとつ覇気がありません。';
    return 'いつも通りの様子です。';
  }

  // 厩舎の調教師のコメント（今週の様子）
  function stableComment(h, game) {
    if (h.injuredWeeks > 0) return '脚元が治るまでは無理をさせません。';
    if (h.fatigue > 80) return 'かなり疲れています。今週は休ませましょう。';
    if (h.fatigue > 60) return '疲れが見えます。強い調教は控えたいですね。';
    const age = HS.ageOf(h, game.year);
    const cap = HS.capOf(h, age);
    const room = HS.STAT_KEYS.reduce((a, k) => a + Math.max(0, cap[k] - h.stats[k]), 0);
    if (h.condition >= 2) return '絶好調です！ 使うなら今です。';
    if (room > 40) return 'まだまだ鍛える余地があります。しっかり乗り込みましょう。';
    if (room < 8) return '仕上がっています。あとはレースで結果を出すだけです。';
    return '順調にきています。';
  }

  // 出走レースについての調教師の見立て
  function raceComment(h, race) {
    const notes = [];
    const diff = race.distance - h.bestDistance;
    if (diff > 500) notes.push('この距離は少し長いかもしれません');
    else if (diff < -500) notes.push('この距離は少し短いかもしれません');
    else notes.push('距離はぴったりです');
    const apt = h.aptitude[race.surface];
    if (apt === 'D') notes.push(`${HS.SURFACES[race.surface]}は苦手です`);
    else if (apt === 'A') notes.push(`${HS.SURFACES[race.surface]}は得意です`);
    const c = HS.CLASSES[race.cls];
    const scale = race.age === 2 ? 0.82 : race.age === 3 && race.week <= 24 ? 0.93 : 1;
    const sum = HS.sumStats(h.stats);
    if (sum > c.sum[1] * scale) notes.push('力は上。勝ち負けになります');
    else if (sum > ((c.sum[0] + c.sum[1]) / 2) * scale) notes.push('十分戦えます');
    else if (sum > c.sum[0] * scale) notes.push('相手は手ごわいです');
    else notes.push('今の力では厳しい相手です');
    if (race.overseas) notes.push(`遠征費 ${HS.TRAVEL_COST}万円がかかります`);
    return notes.join('。') + '。';
  }

  HS.buildCommentary = buildCommentary;
  HS.paddockComment = paddockComment;
  HS.stableComment = stableComment;
  HS.raceComment = raceComment;
})(globalThis.HS = globalThis.HS || {});
