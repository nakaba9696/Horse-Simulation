// 騎乗の画面（計器つき）を Playwright（/opt/pw-browsers の Chromium）で撮る道具。競り合いの気合の計器を確かめる
//   NODE_PATH=$(npm root -g) node tools/shot_ride.js [出力先]
// 東京・芝1600・12頭。模擬を直線の手前まで進めてから画面を開き、自分の馬のすぐ横に1頭並べて競り合いにする。
// 撮る絵：fight_rise.jpg（気合が上がっている途中）・fight_max.jpg（気合が上がりきって FIGHT が出た瞬間）。大きさは 1600×1000
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');

async function main() {
  const out = path.resolve(process.argv[2] || 'docs/shots/balance');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForFunction(() => globalThis.HS && HS.Ride && HS.Sim);
  await page.evaluate(() => {
    const U = HS.U, H = HS.Horse, S = HS.Sim;
    document.body.innerHTML = '<div id="rideshot" style="width:1580px;margin:8px auto"></div>';
    const rng = new U.RNG(7);
    const runners = [];
    for (let i = 0; i < 12; i++) {
      const h = H.makeFiller(rng, { level: 82, surface: '芝', dist: 1600, born: 2000 });
      h.name = ['ターフランナー', 'ミドリノカゼ', 'サクラフブキ', 'ハヤテボシ', 'アオイソラ', 'キンノツバサ', 'ホシノシズク', 'ユメノカケハシ', 'カゼノウタ', 'シロガネ', 'ムラサキノハナ', 'アカツキ'][i];
      if (i === 0) { h.pot.guts = 96; h.style = '差し'; }
      runners.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: Math.ceil((i + 1) * 8 / 12), rider: i === 0 ? 'P' : undefined });
    }
    const race = { name: '確かめ', dist: 1600, surface: '芝', course: '東京', ground: '良', year: 2004, month: 5, weather: '晴', free: true };
    const card = { race, runners };
    const makeSim = () => {
      const sim = S.create(race, runners, H.weekIndex(2004, 5, 1), new U.RNG(11), { frames: true, ride: true });
      S.ctl.up(sim);
      while (sim.D - sim.st[sim.me].x > sim.straight + 120) S.step(sim);
      sim.st.forEach(s => { s.fight = 0; s.fightPeak = 0; });
      // 並べる相手（走り出してから、すぐ外の隣・同じ速さに置く）
      const me = sim.st[sim.me];
      HS.ShotRival = sim.st.filter(s => !s.me).sort((a, b) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x))[0];
      HS.ShotT0 = sim.t;
      sim.ctl.gear = 1;
      return sim;
    };
    HS.Ride.ride(document.getElementById('rideshot'), card, { makeSim, record: null });
  });
  // ゲートの数え（3秒）のあと、並んだまま走らせる。並びを保つため、相手の位置を毎コマ合わせる
  await page.evaluate(() => {
    const keep = () => { const sim = HS.Ride.cur; if (!sim) return; const me = sim.st[sim.me], o = HS.ShotRival; if (o && !me.done && sim.t > HS.ShotT0 + 0.3) { o.x = me.x + 0.6; o.lane = me.lane + 1.1; o.laneT = o.lane; o.v = me.v; } requestAnimationFrame(keep); };
    requestAnimationFrame(keep);
  });
  await page.waitForFunction(() => HS.Ride.cur && HS.Ride.cur.st[HS.Ride.cur.me].fight > 25, null, { timeout: 120000 });
  await page.screenshot({ path: path.join(out, 'fight_rise.jpg'), type: 'jpeg', quality: 88 });
  // FIGHT の札は 1.1 秒だけ出るので、撮る前に画面の時計（performance.now）を 10 分の 1 に遅くする（模擬の進みは変わらない）
  await page.waitForFunction(() => HS.Ride.cur.st[HS.Ride.cur.me].fight >= 42, null, { timeout: 120000 });
  await page.evaluate(() => { const real = performance.now.bind(performance), t0 = real(); performance.now = () => t0 + (real() - t0) * 0.1; });
  await page.waitForFunction(() => HS.Ride.cur.st[HS.Ride.cur.me].fight >= 50, null, { timeout: 120000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(out, 'fight_max.jpg'), type: 'jpeg', quality: 88 });
  await browser.close();
  if (errors.length) { console.log('エラー：\n' + errors.join('\n')); process.exitCode = 1; }
  console.log('撮った：' + out);
}
main().catch(e => { console.error(e); process.exit(1); });
