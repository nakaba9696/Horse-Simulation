// ライバル騎手の画面を Playwright（/opt/pw-browsers の Chromium）で撮る道具（1600×1000）
//   NODE_PATH=$(npm root -g) node tools/shot_rivals.js [出力先]
// 騎手のゲームを始め、自分の馬を持たせて何か月か進め、ライバルと同じレースに乗る週の ホーム・出走表とパドック・騎乗中の馬群レーダー・データの「ライバル」を撮る
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');

async function main() {
  const out = path.resolve(process.argv[2] || 'docs/shots/rivals');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForFunction(() => globalThis.HS && HS.App && HS.Rivals, null, { timeout: 60000 });
  // 始めて、自分の馬を持たせ、ライバルと当たる週まで進める
  const info = await page.evaluate(() => {
    const W = HS.World, H = HS.Horse, App = HS.App, Rv = HS.Rivals, J = HS.Jockey;
    W.newGame({ seed: 21, mode: 'jockey', jockeyName: '青空 翔', name: '青空 翔', region: '美浦' });
    const G = W.get(); G.player.money = 5e5;
    const pick = W.all().filter(h => h.owner !== 'P' && h.loc === 'stable' && h.hist && !h.foreignTrained && !G.rivals.ride[h.id])
      .sort((a, b) => H.overall(H.cur(b, 0)) - H.overall(H.cur(a, 0)) || (a.name < b.name ? -1 : 1)).slice(4, 10);
    for (const h of pick) { h.owner = 'P'; h.auto = true; }
    let w = 0;
    // 何か月か進めて対戦を積み、ライバルが2人以上いる重賞に乗る週で止める
    for (; w < 80; w++) {
      const ok = w > 14 && J.myRides().some(({ card }) => card.race.graded && Rv.inCard(card).length >= 2);
      if (ok) break;
      W.finishWeek({});
    }
    App.st.screen = 'game'; App.st.tab = 'home'; App.st.view = null; App.st.stack = []; App.render();
    return { w, date: W.dateLabel(G.year, G.month, G.week) };
  });
  console.log('週', info);
  await page.waitForTimeout(800);
  await page.evaluate(() => { const el = document.querySelector('.rv-call'); if (el) el.closest('.card').scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, 'home.png') });
  // パドック（出走表・ライバルのひと言）
  page.evaluate(() => { HS.App.nextWeek(); });
  await page.waitForSelector('.paddock', { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const el = document.querySelector('.rv-paddock'); if (el) el.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, 'paddock.png') });
  await page.evaluate(() => { const el = document.querySelector('.entry-t'); if (el) el.scrollIntoView({ block: 'start' }); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, 'entry.png') });
  // 自分で乗る：レースの途中の馬群レーダー（ライバルの馬は札の色の枠）
  await page.evaluate(() => { const b = document.querySelector('[data-x=ride]'); if (b) b.click(); });
  // 発走の合図を待って出し、道中まで進める（ライバルの馬は札の色の二重の枠）
  for (let k = 0; k < 40; k++) { await page.keyboard.press('ArrowUp'); await page.waitForTimeout(250); }
  await page.waitForTimeout(25000);
  await page.screenshot({ path: path.join(out, 'ride_radar.png') });
  await page.screenshot({ path: path.join(out, 'ride_radar_zoom.png'), clip: { x: 1180, y: 120, width: 140, height: 400 } });
  // 騎乗を早送りで終わらせる代わりに、ページを読み直してデータのタブ
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForFunction(() => globalThis.HS && HS.App && HS.Rivals, null, { timeout: 60000 });
  await page.evaluate(() => {
    const W = HS.World, H = HS.Horse, App = HS.App;
    W.newGame({ seed: 21, mode: 'jockey', jockeyName: '青空 翔', name: '青空 翔', region: '美浦' });
    const G = W.get(); G.player.money = 5e5;
    const pick = W.all().filter(h => h.owner !== 'P' && h.loc === 'stable' && h.hist && !h.foreignTrained && !G.rivals.ride[h.id])
      .sort((a, b) => H.overall(H.cur(b, 0)) - H.overall(H.cur(a, 0)) || (a.name < b.name ? -1 : 1)).slice(4, 10);
    for (const h of pick) { h.owner = 'P'; h.auto = true; }
    for (let w = 0; w < 52; w++) W.finishWeek({});
    App.st.screen = 'game'; App.st.tab = 'jrecord'; App.st.view = { name: 'jrecord', jtab: 'rival' }; App.st.stack = []; App.render();
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(out, 'data_rival.png') });
  await page.evaluate(() => { const el = document.querySelector('.rv-grid + h2, h2.sec'); if (el) el.scrollIntoView({ block: 'start' }); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, 'data_rival_log.png') });
  console.log(errors.length ? 'エラー:\n' + errors.join('\n') : 'エラーなし');
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
