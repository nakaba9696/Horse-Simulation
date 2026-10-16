// 騎乗の画面の手ざわり（計器・ムチ・ゴールのあと）を Playwright（/opt/pw-browsers の Chromium）で撮る道具
//   NODE_PATH=$(npm root -g) node tools/shot_feel.js [出力先] [名前の頭] [--video]
// 東京・芝1600・12頭。自分の馬は差し。画面の時計（performance.now・requestAnimationFrame）を道具の側で進めるので、
// 遅い描画（ソフトウェアの WebGL）でも、撮った絵は 30fps で遊んだときと同じ時の流れになる。撮る絵（1600×1000）：
//   <頭>_gate.jpg（ゲートの中）・<頭>_mid.jpg（向こう正面で引いている）・<頭>_whip.jpg（直線でムチを入れた直後）・
//   <頭>_cool.jpg（ゴールを過ぎて流している所）・<頭>_rank.jpg（着順の表示）
// --video を付けると、ムチから着順の表示までを 800×500・20fps の <頭>_finish.webm にする（ffmpeg を使う）
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');

async function main() {
  const args = process.argv.slice(2);
  const video = args.includes('--video');
  const pos = args.filter(a => !a.startsWith('--'));
  const out = path.resolve(pos[0] || 'docs/shots/feel');
  const pre = pos[1] || 'after';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [];
  // 場面ごとに新しいページで開く（前の場面の描画が裏で回り続けないように）。画面の時計は道具が進める
  let page = null;
  const open = async () => {
    if (page) await page.close();
    page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      let vt = 0; const q = [];
      window.__vt = { step(ms) { vt += ms; const c = q.splice(0); c.forEach(f => f(vt)); return c.length; } };
      performance.now = () => vt;
      window.requestAnimationFrame = f => { q.push(f); return q.length; };
    });
    await page.goto('file://' + path.join(ROOT, 'index.html'));
    await page.waitForFunction(() => globalThis.HS && HS.Ride && HS.Sim);
  };
  const step = (ms = 33) => page.evaluate(ms => __vt.step(ms), ms);
  const until = async (fn, max = 3000, ms = 33) => { for (let i = 0; i < max; i++) { if (await page.evaluate(fn)) return true; await step(ms); } throw new Error('待ちきれない：' + fn); };
  const wait = async (sec, ms = 33) => { for (let i = 0; i < sec * 1000 / ms; i++) await step(ms); };
  // jump：模擬をどこまで先に進めておくか（ゴールまでの残り m。0 なら進めない）
  const start = async (jump) => { await open(); return page.evaluate((jump) => {
    const U = HS.U, H = HS.Horse, S = HS.Sim;
    document.body.innerHTML = '<div id="rideshot" style="width:1580px;margin:8px auto"></div>';
    const rng = new U.RNG(7);
    const runners = [];
    for (let i = 0; i < 12; i++) {
      const h = H.makeFiller(rng, { level: 82, surface: '芝', dist: 1600, born: 2000 });
      h.name = ['ターフランナー', 'ミドリノカゼ', 'サクラフブキ', 'ハヤテボシ', 'アオイソラ', 'キンノツバサ', 'ホシノシズク', 'ユメノカケハシ', 'カゼノウタ', 'シロガネ', 'ムラサキノハナ', 'アカツキ'][i];
      if (i === 0) { h.style = '差し'; h.pot.speed = 99; h.pot.stamina = 95; }
      runners.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: Math.ceil((i + 1) * 8 / 12), rider: i === 0 ? 'P' : undefined });
    }
    const race = { name: '確かめ', dist: 1600, surface: '芝', course: '東京', ground: '良', year: 2004, month: 5, weather: '晴', free: true };
    const card = { race, runners };
    const makeSim = () => {
      const sim = S.create(race, runners, H.weekIndex(2004, 5, 1), new U.RNG(11), { frames: true, ride: true });
      if (jump) { S.ctl.up(sim); while (sim.D - sim.st[sim.me].x > jump) S.step(sim); }
      return sim;
    };
    HS.Ride.ride(document.getElementById('rideshot'), card, { makeSim, record: null });
  }, jump); };
  const shot = name => page.screenshot({ path: path.join(out, `${pre}_${name}.jpg`), type: 'jpeg', quality: 86, timeout: 180000 });
  const key = async k => { await page.keyboard.press(k); await step(); };

  // ゲートの中
  await start(0);
  await wait(1.2);
  await shot('gate');
  // 向こう正面：少し引いてためる
  await start(1100);
  await wait(3.2, 100);
  await key('ArrowDown'); await wait(0.15); await key('ArrowDown');
  await wait(1.2);
  await shot('mid');
  // 直線：しごいて、ムチ
  await start(560);
  await wait(3.2, 100);
  for (let i = 0; i < 4; i++) await key('ArrowUp');
  await until(() => { const s = HS.Ride.cur; return s.D - s.st[s.me].x < 380; }, 3000, 100);
  // 動画のコマ（50ms ごとに1枚）
  const frames = video ? { p: fs.mkdtempSync(path.join(require('os').tmpdir(), 'feel-')), n: 0 } : null;
  const vstep = async () => { await step(50); if (frames) await page.screenshot({ path: path.join(frames.p, String(++frames.n).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 80, timeout: 180000 }); };
  await key('x');
  await wait(0.1);
  await shot('whip');
  // ムチを数発（0.5 秒おき）
  for (let i = 0; i < 6; i++) { for (let j = 0; j < 10; j++) await vstep(); await key('x'); }
  // ゴールまで
  for (let i = 0; i < 3000 && !(await page.evaluate(() => HS.Ride.cur.st[HS.Ride.cur.me].done)); i++) await vstep();
  for (let i = 0; i < 26; i++) await vstep();
  await shot('cool');
  for (let i = 0; i < 400 && !(await page.evaluate(() => !!document.querySelector('.ride-close'))); i++) await vstep();
  for (let i = 0; i < 24; i++) await vstep();
  await shot('rank');
  await browser.close();
  if (video) {
    const dst = path.join(out, `${pre}_finish.webm`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '20', '-i', path.join(frames.p, '%04d.jpg'), '-vf', 'scale=800:500', '-c:v', 'libvpx-vp9', '-b:v', '600k', dst]);
    fs.rmSync(frames.p, { recursive: true, force: true });
    console.log('動画：' + dst + ' ' + Math.round(fs.statSync(dst).size / 1024) + 'KB');
  }
  if (errors.length) { console.log('エラー：\n' + errors.join('\n')); process.exitCode = 1; }
  console.log('撮った：' + out);
}
main().catch(e => { console.error(e); process.exit(1); });
