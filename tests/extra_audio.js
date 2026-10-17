// 検証：BGM の曲（js/ui/audio.js）がすべて読めて、長さが妥当・場面の曲がそろっている・和音と拍がおしゃれの目安を満たす・
//       Godot 用の書き出し（godot/audio/bgm）と聞き比べ用（docs/audio）が今の曲から作られている
// 音は鳴らさない（Node に Web Audio は無い）。波形の書き出しは tools/render_bgm.js・tools/bgm_check.js（Playwright）
module.exports = function (check, assert, HS) {
  const vm = require('vm'), fs = require('fs'), path = require('path');
  const ROOT = path.join(__dirname, '..');
  const SCENE_SONGS = ['title', 'home', 'paddock', 'paddockGF', 'race', 'fanfare', 'fanfareGF', 'victory', 'lose', 'glory'];
  check('audio: BGM の曲がすべて読めて、長さが妥当・場面の曲がそろっている', () => {
    const doc0 = globalThis.document;
    if (!doc0) globalThis.document = { addEventListener() {} };
    try { vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js/ui/audio.js'), 'utf8'), { filename: 'js/ui/audio.js' }); }
    finally { if (!doc0) delete globalThis.document; }
    const AU = HS.Audio, r = AU.check();
    assert(!r.errors.length, '曲の誤り：\n       ' + r.errors.slice(0, 10).join('\n       '));
    for (const k of SCENE_SONGS) assert(r.info[k], `曲 ${k} が無い`);
    for (const [k, v] of Object.entries(r.info)) {
      if (v.loop) assert(v.loopSeconds >= 50 && v.loopSeconds <= 130, `${k} のくり返しが ${v.loopSeconds.toFixed(1)}秒（50〜130秒に）`);
      else assert(v.seconds >= 3 && v.seconds <= 20, `${k} の長さが ${v.seconds.toFixed(1)}秒（3〜20秒に）`);
    }
    // 画面ごとの曲・GF の曲
    assert(AU.songFor({ screen: 'title' }) === 'title' && AU.songFor({ screen: 'game', view: { name: 'home' } }) === 'home' && AU.songFor({ screen: 'game', view: { name: 'records' } }) === 'glory', '画面ごとの曲が違う');
    // 旋律の移調・鳴らす長さと強さの書式
    assert(AU.T('C5:2 F#4+A4 R:1 @brass Bb3', -12) === 'C4:2 F#3+A3 R:1 @brass Bb2', '移調が違う');
    assert(AU.T('C5:0.5_2^0.7', 12) === 'C6:0.5_2^0.7', '鳴らす長さ・強さの付いた音の移調が違う');
    return Object.entries(r.info).map(([k, v]) => `${k} ${(v.loop ? v.loopSeconds : v.seconds).toFixed(0)}秒`).join('・');
  });
  check('audio: 和音の色と拍の食い（おしゃれの目安）', () => {
    const r = HS.Audio.check().info;
    for (const k of SCENE_SONGS) {
      const v = r[k];
      // 7th・テンションを含む和音が多いこと（三和音だけの曲にしない）
      assert(v.rich >= 0.6, `${k} の 7th・テンションの和音が ${Math.round(v.rich * 100)}%（60% 以上に）`);
      assert(v.swing >= 0 && v.swing <= 0.35, `${k} のスウィング ${v.swing}（0〜0.35）`);
      // 場面の曲（くり返す曲）は、拍の裏で鳴り始める音が3割以上（食い・シンコペーション）
      if (v.loop) assert(v.offbeat >= 0.3, `${k} の拍の裏の音が ${Math.round(v.offbeat * 100)}%（30% 以上に）`);
      if (v.loop) assert(v.instruments.length >= 5, `${k} の楽器が ${v.instruments.length}（5 以上に）`);
    }
    // 場面ごとに性格を分ける：速さが曲ごとに違い、レースがいちばん速い
    const loops = SCENE_SONGS.filter(k => r[k].loop);
    assert(new Set(loops.map(k => r[k].bpm)).size === loops.length, '場面の曲の速さが重なっている');
    assert(loops.every(k => k === 'race' || r[k].bpm < r.race.bpm), 'レースの曲がいちばん速くない');
    return loops.map(k => `${k} ${r[k].bpm}`).join('・');
  });
  check('audio: Godot 用の書き出しと聞き比べのファイルが今の曲から作られている', () => {
    const R = require(path.join(ROOT, 'tools/render_bgm.js')), AU = HS.Audio;
    const dir = path.join(ROOT, 'godot/audio/bgm'), meta = JSON.parse(fs.readFileSync(path.join(dir, 'bgm.json'), 'utf8'));
    assert(meta.source_hash === R.sourceHash(), 'js/ui/audio.js の曲が書き出しより新しい（node tools/render_bgm.js で書き出し直す）');
    let mp3 = 0;
    for (const k of Object.keys(AU.SONGS)) {
      const m = meta.songs[k], s = AU.SONGS[k];
      assert(m && fs.existsSync(path.join(dir, m.file)), `${k} の ogg が無い`);
      assert(m.loop === s.loop, `${k} のくり返しの有無が違う`);
      if (s.loop) {
        const e8 = AU.renderEighth(k), begin = Math.round(s.loopStart * e8 * R.SR) + R.TAIL * R.SR, span = Math.round((s.length - s.loopStart) * e8 * R.SR);
        assert(m.loop_begin_sample === begin && m.loop_end_sample === begin + span, `${k} のくり返しの位置が違う`);
        assert(Math.abs(m.loop_offset - begin / R.SR) < 1e-5, `${k} の loop_offset が違う`);
      }
      const [no, scene] = R.SCENES[k];
      const f = path.join(ROOT, 'docs/audio', `${no}_${scene}.mp3`);
      assert(fs.existsSync(f), `聞き比べの ${no}_${scene}.mp3 が無い`);
      mp3 += fs.statSync(f).size;
    }
    assert(mp3 <= 10 * 1024 * 1024, `docs/audio の mp3 が ${(mp3 / 1048576).toFixed(1)}MB（10MB 以下に）`);
    return `${Object.keys(meta.songs).length}曲・mp3 ${(mp3 / 1048576).toFixed(1)}MB`;
  });
};
