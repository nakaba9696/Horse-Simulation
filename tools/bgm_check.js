// BGM を OfflineAudioContext で波形に書き出し、割れていないか（ピーク < 1）と音の大きさを確かめる
// 使い方：node tools/bgm_check.js [曲の名前…] [--wav 書き出す先のフォルダ]
//   Playwright の Chromium（/opt/pw-browsers）で js/ui/audio.js だけを読んで鳴らす。ゲームの本体は読まない
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function requirePlaywright() {
  for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { return require(p); } catch (e) { /* 次へ */ } }
  throw new Error('playwright が見つからない');
}

function wav(chs, sr) {
  const n = chs[0].length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(chs[c][i] * 32767))), 44 + i * 4 + c * 2);
  return buf;
}

(async () => {
  const args = process.argv.slice(2);
  const wi = args.indexOf('--wav'), out = wi >= 0 ? args[wi + 1] : null;
  const names = args.filter((a, i) => !a.startsWith('--') && (wi < 0 || i !== wi + 1));
  const { chromium } = requirePlaywright();
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  const browser = await chromium.launch(exe && fs.statSync(exe).isFile() ? { executablePath: exe } : {});
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'js/ui/audio.js'), 'utf8') });
  const list = names.length ? names : await page.evaluate(() => Object.keys(HS.Audio.SONGS));
  let bad = 0;
  if (out) fs.mkdirSync(out, { recursive: true });
  for (const name of list) {
    const r = await page.evaluate(async ({ name, keep }) => {
      const t0 = performance.now();
      const b = await HS.Audio.render(name);
      const ms = performance.now() - t0;
      let peak = 0, sum = 0, n = 0;
      const chs = [b.getChannelData(0), b.getChannelData(1)];
      for (const d of chs) for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += d[i] * d[i]; n++; }
      // 鳴っている所だけの平均の大きさ（RMS）
      const rms = Math.sqrt(sum / n);
      return { peak, rms, sec: b.duration, ms, data: keep ? chs.map(d => Array.from(d, v => Math.round(v * 32767))) : null };
    }, { name, keep: !!out });
    const db = v => (20 * Math.log10(Math.max(v, 1e-9))).toFixed(1);
    const ok = r.peak < 1;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(11)} ${r.sec.toFixed(1).padStart(5)}秒  ピーク ${r.peak.toFixed(3)}（${db(r.peak)}dB）  RMS ${db(r.rms)}dB  書き出し ${(r.ms / 1000).toFixed(1)}秒`);
    if (out) fs.writeFileSync(path.join(out, name + '.wav'), wav(r.data.map(a => a.map(v => v / 32767)), 44100));
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
