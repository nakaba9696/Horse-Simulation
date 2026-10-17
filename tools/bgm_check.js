// BGM を OfflineAudioContext で波形に書き出し、割れていないか（ピーク < 1）と音の大きさを確かめる
// 使い方：node tools/bgm_check.js [曲の名前…] [--wav 書き出す先のフォルダ] [--stats]
//   --stats：音の物差しも出す。帯域ごとの配分（低い 〜60Hz・ベース 〜250・中低 〜800・中 〜3k・張り 〜8k・空気 8k〜）、
//            左右の広がり（左右の差 ÷ 和 の大きさ）、8小節ごとの音量の起伏（いちばん小さい所と大きい所の差）
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
  const names = args.filter((a, i) => !a.startsWith('--') && (wi < 0 || i !== wi + 1) && i !== args.indexOf('--only') + 1);
  const stats = args.includes('--stats');
  const oi = args.indexOf('--only'), only = oi >= 0 ? args[oi + 1].split(',') : null; // --only lead,K：そのトラック・太鼓だけ
  const { chromium } = requirePlaywright();
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  const browser = await chromium.launch(exe && fs.statSync(exe).isFile() ? { executablePath: exe } : {});
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: fs.readFileSync(process.env.AUDIO_JS || path.join(ROOT, 'js/ui/audio.js'), 'utf8') });
  const list = names.length ? names : await page.evaluate(() => Object.keys(HS.Audio.SONGS));
  let bad = 0;
  if (out) fs.mkdirSync(out, { recursive: true });
  for (const name of list) {
    const r = await page.evaluate(async ({ name, keep, stats, only }) => {
      const t0 = performance.now();
      const b = await HS.Audio.render(name, 0, null, only);
      const ms = performance.now() - t0;
      let peak = 0, sum = 0, n = 0;
      const chs = [b.getChannelData(0), b.getChannelData(1)];
      for (const d of chs) for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += d[i] * d[i]; n++; }
      // 鳴っている所だけの平均の大きさ（RMS）
      const rms = Math.sqrt(sum / n);
      let st = null;
      if (stats) {
        // 4096 点の FFT を重ねずに並べて、帯域ごとの力を足す
        const N = 4096, EDGE = [60, 250, 800, 3000, 8000, 22050], band = new Float64Array(EDGE.length);
        const re = new Float64Array(N), im = new Float64Array(N), win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
        const fft = () => {
          for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
          for (let len = 2; len <= N; len <<= 1) {
            const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
            for (let i = 0; i < N; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
          }
        };
        const [L, R] = chs;
        let mid = 0, side = 0;
        // 広がりは 250Hz より上で測る（低音は真ん中に置くものなので）
        let hl = 0, hr = 0, yl = 0, yr = 0; const k1 = Math.exp(-2 * Math.PI * 250 / 44100);
        for (let i = 0; i < L.length; i++) { yl = (1 - k1) * L[i] + k1 * yl; yr = (1 - k1) * R[i] + k1 * yr; hl = L[i] - yl; hr = R[i] - yr; const m = (hl + hr) / 2, s = (hl - hr) / 2; mid += m * m; side += s * s; }
        for (let off = 0; off + N <= L.length; off += N) {
          for (let i = 0; i < N; i++) { re[i] = (L[off + i] + R[off + i]) / 2 * win[i]; im[i] = 0; }
          fft();
          for (let k = 1; k < N / 2; k++) { const f = k * 44100 / N, pw = re[k] * re[k] + im[k] * im[k]; band[EDGE.findIndex(e => f < e)] += pw; }
        }
        const tot = band.reduce((a, b) => a + b, 0);
        // 8小節ごとの音量
        const s0 = HS.Audio.SONGS[name], seg = Math.round(44100 * 60 / s0.bpm * 4 * 8), lv = [];
        for (let off = 0; off < L.length - seg / 2; off += seg) { let q = 0, c = 0; for (let i = off; i < Math.min(L.length, off + seg); i++) { q += L[i] * L[i] + R[i] * R[i]; c += 2; } lv.push(10 * Math.log10(q / c + 1e-12)); }
        st = { band: Array.from(band, v => v / tot), width: Math.sqrt(side / Math.max(mid, 1e-12)), levels: lv };
      }
      return { peak, rms, sec: b.duration, ms, st, data: keep ? chs.map(d => Array.from(d, v => Math.round(v * 32767))) : null };
    }, { name, keep: !!out, stats, only });
    const db = v => (20 * Math.log10(Math.max(v, 1e-9))).toFixed(1);
    const ok = r.peak < 1;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(11)} ${r.sec.toFixed(1).padStart(5)}秒  ピーク ${r.peak.toFixed(3)}（${db(r.peak)}dB）  RMS ${db(r.rms)}dB  書き出し ${(r.ms / 1000).toFixed(1)}秒`);
    if (r.st) console.log(`     帯域 ${['低', 'ベース', '中低', '中', '張り', '空気'].map((k, i) => k + ' ' + Math.round(r.st.band[i] * 100) + '%').join('・')}  広がり ${r.st.width.toFixed(2)}  8小節ごと ${r.st.levels.map(v => v.toFixed(0)).join(' ')}dB`);
    if (out) fs.writeFileSync(path.join(out, name + '.wav'), wav(r.data.map(a => a.map(v => v / 32767)), 44100));
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
