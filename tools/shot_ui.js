// 騎乗の外の画面（ホーム・厩舎・馬・次走・店・データ・メニュー・フリーレース・出走表）を Playwright（/opt/pw-browsers の Chromium）で撮る道具
//   NODE_PATH=$(npm root -g) node tools/shot_ui.js [出力先] [撮る名前をカンマで（省くと全部）]
// 騎手のゲームを種 21 で始め、店で4頭買って7月1週まで進めてから撮る。大きさは 1600×1000
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');

// 撮る画面：[名前, ページの中で画面を開く関数（文字列にして渡す）]
const SHOTS = [
  ['01-title', () => { App.st.screen = 'title'; App.st.titleOpen = true; App.render(); }],
  ['02-home', () => { App.st.screen = 'game'; App.st.tab = 'home'; App.st.view = null; App.render(); }],
  ['03-stable', () => { App.st.screen = 'game'; App.act.tab({ tab: 'stable' }); }],
  ['04-horse-info', () => { App.st.screen = 'game'; App.act.tab({ tab: 'stable' }); App.go({ name: 'horse', id: HS.World.mine('stable')[0].id, htab: 'info' }); }],
  ['05-horse-next', () => { App.st.screen = 'game'; App.act.tab({ tab: 'stable' }); App.go({ name: 'horse', id: HS.World.mine('stable')[0].id, htab: 'train' }); }],
  ['06-program', () => { App.st.screen = 'game'; App.act.tab({ tab: 'stable' }); if (App.act.program) App.act.program({ id: HS.World.mine('stable')[0].id }); else App.go({ name: 'horse', id: HS.World.mine('stable')[0].id, htab: 'train' }); }, 1400],
  ['07-market', () => { App.st.screen = 'game'; App.act.tab({ tab: 'market' }); }],
  ['08-market-f', () => { App.st.screen = 'game'; App.act.tab({ tab: 'market' }); App.act.msex({ sex: 'f' }); }],
  ['09-market-horse', () => { App.st.screen = 'game'; App.act.tab({ tab: 'market' }); App.act.horse({ id: HS.World.marketHistoric()[0].horse.id }); }],
  ['10-data', () => { App.st.screen = 'game'; App.act.tab({ tab: 'jrecord' }); }],
  ['11-menu', () => { App.st.screen = 'game'; App.act.tab({ tab: 'menu' }); }],
  ['12-free', () => { App.act.free(); }],
  ['13-free-course', () => { App.act.free(); if (App.act['fr-step']) App.act['fr-step']({ step: 'course' }); }],
  ['14-free-horses', () => { App.act.free(); if (App.act['fr-step']) App.act['fr-step']({ step: 'horses' }); }],
  ['15-entry', () => { App.st.screen = 'game'; App.act.tab({ tab: 'home' }); const c = HS.World.cards().find(c => c.race.graded) || HS.World.cards()[0]; App.modal(HS.UI.entryTable(c) + '<div class="btns mt"><button class="btn gold" data-act="close">ゲートイン</button></div>', { noClose: true, scene: 'paddock' }); }],
  ['16-breed', () => { App.st.screen = 'game'; App.act.tab({ tab: 'breed' }); }],
  // 馬主：何人かと会い、段階をばらばらにしてから
  ['17-owners', () => { const O = HS.Owners; O.state().flags.overseas = { y: 1 }; [['makino', 1], ['sengoku', 3], ['yuni', 2], ['dakota', 0]].forEach(([id, s]) => { O.meet(id); O.of(id).stage = s; O.of(id).pts = O.STAGES[s].floor + 5; }); O.state().queue = []; App.st.screen = 'game'; App.act.owners(); }],
  ['18-owner', () => { App.st.screen = 'game'; App.act.owner({ id: 'yuni' }); }],
];

async function main() {
  const out = path.resolve(process.argv[2] || 'docs/shots/ui/3_after');
  const only = process.argv[3] ? process.argv[3].split(',') : null;
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* なし */ } });
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForFunction(() => globalThis.HS && HS.App && HS.World && document.querySelector('#app').children.length);
  // 遊んでいる途中の世界を作る（買った馬が入厩し、何頭かは走っている）
  await page.evaluate(() => {
    const W = HS.World;
    W.newGame({ seed: 21, mode: 'jockey', jockeyName: '青空 翔', name: '青空 翔', region: '美浦' });
    const G = W.get();
    G.player.money = 60000;
    const shop = W.marketHistoric().slice().sort((a, b) => a.price - b.price);
    let n = 0;
    for (const it of shop) { if (n >= 4) break; if (!W.buy(it)) n++; }
    let guard = 0;
    while (!(G.month === 7 && G.week === 1) && guard++ < 60) W.finishWeek({});
    G.player.money = Math.max(G.player.money, 8000);
    W.saveLocal();
  });
  for (const [name, fn, h] of SHOTS) {
    if (only && !only.some(o => name.startsWith(o))) continue;
    await page.evaluate(() => { HS.App.closeAll(); });
    await page.evaluate(`(() => { const App = HS.App; (${fn.toString()})(); })()`);
    await page.waitForTimeout(900);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(out, `pc-${name}.jpg`), type: 'jpeg', quality: 86, fullPage: false });
    if (h) { await page.setViewportSize({ width: 1600, height: h }); await page.waitForTimeout(300); await page.screenshot({ path: path.join(out, `pc-${name}-tall.jpg`), type: 'jpeg', quality: 86 }); await page.setViewportSize({ width: 1600, height: 1000 }); }
  }
  await browser.close();
  if (errors.length) { console.log('エラー：\n' + [...new Set(errors)].join('\n')); process.exitCode = 1; }
  console.log('撮った：' + out);
}
main().catch(e => { console.error(e); process.exit(1); });
