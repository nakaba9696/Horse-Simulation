// BGM を音のファイルに書き出す（js/ui/audio.js の曲から作る生成物。手で直さず、曲を変えたらこの道具で作り直す）
// 使い方：node tools/render_bgm.js [曲の名前…]
//   godot/audio/bgm/<曲>.ogg    Godot 版の BGM（Ogg Vorbis・44.1kHz・ステレオ）
//   godot/audio/bgm/bgm.json    くり返しの始まり（秒・サンプル）・速さ・場面の名前・元にした audio.js の版（source_hash）
//   docs/audio/<番号>_<場面>.mp3  聞き比べ用の頭30秒（短い曲は全部）
// Playwright の Chromium（/opt/pw-browsers）で audio.js だけを読み、OfflineAudioContext に描いて、ffmpeg で縮める。
// くり返す曲は「イントロ＋くり返し＋TAIL 秒」を描き、くり返しの範囲を TAIL 秒ずらして切り出す。
// ずらした所では、前の周の響きの尾がもう消えているので、終わりから始まりへ戻っても音が途切れない。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'godot/audio/bgm'), DOCS = path.join(ROOT, 'docs/audio');
const SR = 44100, TAIL = 3, PREVIEW = 30;
const SCENES = {
  title: ['01', 'タイトル'], home: ['02', 'ホーム'], paddock: ['03', 'パドック'], paddockGF: ['04', 'GFのパドック'], race: ['05', 'レース'],
  fanfare: ['06', 'ファンファーレ'], fanfareGF: ['07', 'GFのファンファーレ'], victory: ['08', '勝利'], lose: ['09', '負け'], glory: ['10', '栄光_成績と表彰'],
  // 海外のレース（国・地域ごとのパドックとレース）
  paddockUK: ['11', 'パドック_イギリス・アイルランド'], raceUK: ['12', 'レース_イギリス・アイルランド'],
  paddockFR: ['13', 'パドック_フランス'], raceFR: ['14', 'レース_フランス'],
  paddockUS: ['15', 'パドック_アメリカ・カナダ'], raceUS: ['16', 'レース_アメリカ・カナダ'],
  paddockAU: ['17', 'パドック_オーストラリア'], raceAU: ['18', 'レース_オーストラリア'],
  paddockHK: ['19', 'パドック_香港・シンガポール'], raceHK: ['20', 'レース_香港・シンガポール'],
  paddockME: ['21', 'パドック_ドバイ・サウジ'], raceME: ['22', 'レース_ドバイ・サウジ'],
  paddockDE: ['23', 'パドック_ドイツ'], raceDE: ['24', 'レース_ドイツ'],
};
// 曲の音に関わる範囲（音の部品〜効果音の前）の版。tests/extra_audio.js が書き出しの古さを見分けるのに使う
function sourceHash() {
  const src = fs.readFileSync(path.join(ROOT, 'js/ui/audio.js'), 'utf8');
  const a = src.indexOf('// ---------- 音の部品'), b = src.indexOf('// ---------- 効果音');
  return crypto.createHash('sha1').update(src.slice(a, b) + `|${SR}|${TAIL}`).digest('hex').slice(0, 16);
}
module.exports = { sourceHash, SCENES, TAIL, SR };

function requirePlaywright() {
  for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { return require(p); } catch (e) { /* 次へ */ } }
  throw new Error('playwright が見つからない');
}
function wav(L, R) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(L[i], 44 + i * 4); buf.writeInt16LE(R[i], 46 + i * 4); }
  return buf;
}
const rmsOf = (a, from, to) => { let q = 0; for (let i = from; i < to; i++) q += a[i] * a[i]; return Math.sqrt(q / Math.max(1, to - from)); };

if (require.main === module) (async () => {
  const names = process.argv.slice(2);
  const { chromium } = requirePlaywright();
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  const browser = await chromium.launch(exe && fs.statSync(exe).isFile() ? { executablePath: exe } : {});
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'js/ui/audio.js'), 'utf8') });
  const info = await page.evaluate(() => Object.fromEntries(Object.entries(HS.Audio.SONGS).map(([k, s]) => [k, { bpm: s.bpm, loop: s.loop, loopStart: s.loopStart, length: s.length, eighth: HS.Audio.renderEighth(k) }])));
  const list = names.length ? names : Object.keys(info);
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(DOCS, { recursive: true });
  const jsonPath = path.join(OUT, 'bgm.json');
  const meta = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : { songs: {} };
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'bgm-'));
  for (const name of list) {
    const s = info[name], eighth = s.eighth, len = s.length * eighth, ls = s.loopStart * eighth, span = len - ls;
    const sec = len + TAIL + 0.5;
    // 描いた波形は 16bit にして base64 で受け取る（数の配列より軽い）
    const b64 = await page.evaluate(async ({ name, sec }) => {
      const b = await HS.Audio.render(name, sec, 0);
      const out = [];
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c), q = new Int16Array(d.length);
        for (let i = 0; i < d.length; i++) q[i] = Math.max(-32768, Math.min(32767, Math.round(d[i] * 32767)));
        const u = new Uint8Array(q.buffer); let str = '';
        for (let i = 0; i < u.length; i += 0x8000) str += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
        out.push(btoa(str));
      }
      return out;
    }, { name, sec });
    const [L0, R0] = b64.map(x => { const u = Buffer.from(x, 'base64'); return new Int16Array(u.buffer, u.byteOffset, u.length / 2); });
    let end, begin = 0, seam = null;
    if (s.loop) {
      begin = Math.round(s.loopStart * eighth * SR) + TAIL * SR; end = begin + Math.round(span * SR);
      // つなぎ目：終わりの直前と、始まりの直前の波形の差（小さいほど切れ目が聞こえない）
      const W = 2048; let dq = 0, q = 0;
      for (let i = 0; i < W; i++) for (const A of [L0, R0]) { const x = A[end - W + i], y = A[begin - W + i]; dq += (x - y) ** 2; q += y * y; }
      seam = 10 * Math.log10(dq / Math.max(q, 1));
      // 念のため、終わりの 512 サンプルを始まりの直前の波形へ少しずつ寄せる（戻ったときに波形がつながる）
      const X = 512;
      for (let i = 0; i < X; i++) { const w2 = (i + 1) / X; for (const A of [L0, R0]) A[end - X + i] = Math.round(A[end - X + i] * (1 - w2) + A[begin - X + i] * w2); }
    } else {
      // 終わりの無音を切り、30ミリ秒で消す
      end = L0.length; const th = 32767 * Math.pow(10, -70 / 20);
      while (end > SR * len && Math.abs(L0[end - 1]) < th && Math.abs(R0[end - 1]) < th) end--;
      const f = Math.round(0.03 * SR);
      for (let i = 0; i < f; i++) { const g = 1 - i / f, j = end - f + i; L0[j] = Math.round(L0[j] * g); R0[j] = Math.round(R0[j] * g); }
    }
    const L = L0.subarray(0, end), R = R0.subarray(0, end);
    const w = path.join(tmp, name + '.wav');
    fs.writeFileSync(w, wav(L, R));
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', w, '-c:a', 'libvorbis', '-q:a', '3', path.join(OUT, name + '.ogg')]);
    // 聞き比べ用：頭30秒（くり返す曲は最後の2秒で消す）
    const [no, scene] = SCENES[name] || ['99', name];
    const mp3 = path.join(DOCS, `${no}_${scene}.mp3`);
    for (const f of fs.readdirSync(DOCS)) if (f.startsWith(no + '_') && f.endsWith('.mp3') && path.join(DOCS, f) !== mp3) fs.unlinkSync(path.join(DOCS, f));
    const pv = Math.min(PREVIEW, end / SR);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', w, '-t', String(pv), ...(s.loop ? ['-af', `afade=t=out:st=${pv - 2}:d=2`] : []), '-c:a', 'libmp3lame', '-b:a', '112k', mp3]);
    meta.songs[name] = {
      file: name + '.ogg', scene, loop: s.loop, bpm: s.bpm, seconds: +(end / SR).toFixed(3),
      loop_offset: s.loop ? +(begin / SR).toFixed(6) : 0, loop_begin_sample: s.loop ? begin : 0, loop_end_sample: s.loop ? end : 0,
    };
    console.log(`${name.padEnd(10)} ${(end / SR).toFixed(1).padStart(6)}秒  ${s.loop ? `くり返し ${(begin / SR).toFixed(2)}〜${(end / SR).toFixed(2)}秒  つなぎ目の差 ${seam.toFixed(1)}dB（寄せる前）` : 'くり返さない'}  ogg ${(fs.statSync(path.join(OUT, name + '.ogg')).size / 1024).toFixed(0)}KB  mp3 ${(fs.statSync(mp3).size / 1024).toFixed(0)}KB`);
  }
  meta.note = 'tools/render_bgm.js が js/ui/audio.js の曲から書き出す（手で直さない）。くり返す曲は、終わりまで鳴らしたら loop_offset 秒へ戻る';
  meta.sample_rate = SR; meta.source_hash = sourceHash();
  meta.songs = Object.fromEntries(Object.keys(info).filter(k => meta.songs[k]).map(k => [k, meta.songs[k]]));
  fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2) + '\n');
  fs.rmSync(tmp, { recursive: true, force: true });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
