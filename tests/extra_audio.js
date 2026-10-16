// 検証：BGM の曲（js/ui/audio.js）がすべて読めて、長さが妥当・場面の曲がそろっている
// 音は鳴らさない（Node に Web Audio は無い）。波形の書き出しとピークの確かめは tools/bgm_check.js（Playwright）
module.exports = function (check, assert, HS) {
  check('audio: BGM の曲がすべて読めて、長さが妥当・場面の曲がそろっている', () => {
    const vm = require('vm'), fs = require('fs'), path = require('path');
    const doc0 = globalThis.document;
    if (!doc0) globalThis.document = { addEventListener() {} };
    try { vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js/ui/audio.js'), 'utf8'), { filename: 'js/ui/audio.js' }); }
    finally { if (!doc0) delete globalThis.document; }
    const AU = HS.Audio, r = AU.check();
    assert(!r.errors.length, '曲の誤り：\n       ' + r.errors.slice(0, 10).join('\n       '));
    for (const k of ['title', 'home', 'paddock', 'paddockGF', 'race', 'fanfare', 'fanfareGF', 'victory', 'lose', 'glory']) assert(r.info[k], `曲 ${k} が無い`);
    for (const [k, v] of Object.entries(r.info)) {
      if (v.loop) assert(v.loopSeconds >= 50 && v.loopSeconds <= 130, `${k} のくり返しが ${v.loopSeconds.toFixed(1)}秒（50〜130秒に）`);
      else assert(v.seconds >= 3 && v.seconds <= 20, `${k} の長さが ${v.seconds.toFixed(1)}秒（3〜20秒に）`);
    }
    // 画面ごとの曲・GF の曲
    assert(AU.songFor({ screen: 'title' }) === 'title' && AU.songFor({ screen: 'game', view: { name: 'home' } }) === 'home' && AU.songFor({ screen: 'game', view: { name: 'records' } }) === 'glory', '画面ごとの曲が違う');
    // 旋律の移調
    assert(AU.T('C5:2 F#4+A4 R:1 @brass Bb3', -12) === 'C4:2 F#3+A3 R:1 @brass Bb2', '移調が違う');
    return Object.entries(r.info).map(([k, v]) => `${k} ${(v.loop ? v.loopSeconds : v.seconds).toFixed(0)}秒`).join('・');
  });
};
