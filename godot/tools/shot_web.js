// ブラウザ版（Three.js）で、Godot の試作と同じレースの記録・同じ秒を撮る（見比べ用）
//   node godot/tools/shot_web.js 出力先 秒:tv|ride:名前 ... [--seq=始め:終わり:枚数:tv|ride:名前]
// index.html を開き、js/ui/watch3d.js の観戦の画面（3D と、その上の順位・実況・掲示板）を、
// requestAnimationFrame の時刻をこちらで進めて、決まった秒で止めて撮る。画面は 960x540（2倍の画素＝1920x1080）。
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = path.join(__dirname, '..', '..');
const args = process.argv.slice(2);
const OUT = args.shift();
const shots = [];
for (const a of args) {
  if (a.startsWith('--seq=')) {
    const [t0, t1, n, cam, name] = a.slice(6).split(':');
    for (let i = 0; i < +n; i++) shots.push({ t: +t0 + (+t1 - +t0) * i / Math.max(1, +n - 1), cam, name: `${name}_${String(i + 1).padStart(2, '0')}` });
  } else { const [t, cam, name] = a.split(':'); shots.push({ t: +t, cam, name }); }
}
const race = JSON.parse(fs.readFileSync(path.join(ROOT, 'godot', 'data', 'race.json'), 'utf8'));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 2 });
  page.on('pageerror', e => console.error('pageerror', e.message));
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForFunction(() => globalThis.HS && HS.Watch3D && HS.Race3D);
  console.log('WebGL:', await page.evaluate(() => HS.Race3D.supported()));
  // 撮影ごとに、はじめから再生し直す（カメラの遅れもブラウザ版のまま）
  let cur = null; // いま再生している撮影（同じカメラで先の秒なら、続きから進める）
  for (const sh of shots) {
    let tNow;
    if (cur && cur.cam === sh.cam && sh.t >= cur.t && sh.t - cur.t < 8) {
      tNow = cur.t;
    } else {
      await page.evaluate(({ race, cam }) => {
        // requestAnimationFrame をこちらで回す
        globalThis.__raf = [];
        globalThis.requestAnimationFrame = cb => { __raf.push(cb); return __raf.length; };
        globalThis.__ts = 1000;
        globalThis.__step = (ms) => { __ts += ms; const q = __raf; __raf = []; for (const cb of q) cb(__ts); };
        document.body.innerHTML = '<div id="shot" style="position:fixed;left:0;top:0;width:960px;z-index:99;background:#000"></div>';
        const horses = race.horses.map(h => ({ name: h.name, coat: h.coat, born: 2021, owner: 'AI', sex: h.sex }));
        const runners = race.horses.map((h, i) => ({ horse: horses[i], num: h.num, frame: h.frame, mine: i === race.me, rider: i === race.me ? 'P' : undefined, jockey: { name: h.jockey } }));
        const results = race.results.map(r => { const i = race.horses.findIndex(h => h.num === r.num); return { pos: r.pos, num: r.num, horse: horses[i], time: r.time, margin: r.margin, mine: i === race.me }; });
        const sim = { results, frames: race.frames, events: race.events, D: race.track.D };
        const rc = { name: race.race.name, short: race.race.short, course: race.race.course, surface: race.race.surface, ground: race.race.ground, dist: race.race.dist, year: 2025 };
        HS.Watch3D.play(document.getElementById('shot'), { race: rc, sim, runners }, { speed: 4 });
        if (cam === 'ride') document.querySelector('[data-cam="ride"]').click();
      }, { race, cam: sh.cam });
      // ×4 で近くまで進め（1コマ 0.1 秒＝レースの 0.4 秒）、最後の 6 秒は ×1・30 コマ毎秒で進める
      const fast = Math.max(0, Math.floor((sh.t + 3 - 6) / 0.4));
      // 1コマ目は時刻を覚えるだけ（進まない）
      await page.evaluate(n => { for (let i = 0; i <= n; i++) __step(100); }, fast);
      await page.evaluate(() => document.querySelector('[data-sp="1"]').click());
      tNow = -3 + fast * 0.4;
    }
    const slow = Math.round((sh.t - tNow) * 30);
    // 最後のコマを描いた直後に、3D と上の表示のキャンバスを重ねて取り出す（WebGL の絵は同じ処理の中でしか読めない）
    const url = await page.evaluate(n => {
      for (let i = 0; i < n; i++) __step(1000 / 30);
      const c3 = document.querySelector('#shot .ride-3d'), c2 = document.querySelector('#shot .ride-canvas');
      const out = document.createElement('canvas');
      out.width = c2.width; out.height = c2.height;
      const g = out.getContext('2d');
      g.drawImage(c3, 0, 0, out.width, out.height);
      g.drawImage(c2, 0, 0);
      return out.toDataURL('image/png');
    }, slow);
    const file = path.join(OUT, sh.name + '.png');
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    cur = { cam: sh.cam, t: tNow + slow / 30 };
    console.log('shot', file, 't=', (tNow + slow / 30).toFixed(2), sh.cam);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
