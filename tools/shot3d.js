// 3D のレースを Playwright（/opt/pw-browsers の Chromium）で撮る道具
//   NODE_PATH=$(npm root -g) node tools/shot3d.js [出力先] [場面の名前…]
// 場面は下の SCENES。data/layouts.js が無い場は、下の仮の形（LAYOUTS）で撮る（データがあればそちらが優先）
// 撮った絵は JPEG（幅 1280）。WebGL はソフトウェア（SwiftShader）なので、1枚に数秒かかる
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');

// 仮の形（実際の回りに似せた確かめ用。ゲームのデータではない）
const LAYOUTS = {
  '中山': { turf: [{ id: '内', lap: 1667, straight: 310, use: [2000, 2500, 1800], segs: [['S', 310], ['C', 120, 95, 180, 3], ['S', 420], ['C', 100, 100, 180, 1], ['S', 300]],
    elev: [[0, 4.6], [60, 4.6], [110, 4.0], [200, 2.2], [330, 0.6], [550, 0], [900, 1.0], [1150, 3.0], [1350, 5.3], [1500, 5.0], [1667, 4.6]] }] },
  '京都': { turf: [{ id: '外', lap: 1894, straight: 404, use: [3000, 2200, 2400, 1600], segs: [['S', 404], ['C', 130, 110, 180, 3], ['S', 450], ['C', 120, 120, 180, 1], ['S', 270]],
    elev: [[0, 0.2], [420, 0], [600, 1.8], [780, 4.3], [950, 3.2], [1150, 0.6], [1300, 0], [1894, 0.2]] }] },
  '新潟': { turf: [{ id: '直線', line: true, lap: 1000, straight: 1000, use: [1000], segs: [['S', 1000]], elev: [[0, 0.3], [400, 0], [1000, 0.6]] }] },
  'エプソム': { turf: [{ id: '馬蹄', line: true, lap: 2414, straight: 600, use: [2400, 2414], segs: [['S', 620], ['C', 260, 200, 110, 3], ['S', 380], ['C', 400, 400, 40, 1], ['S', 600], ['C', 500, 500, 30, 1], ['S', 300]],
    elev: [[0, 6], [150, 4], [700, 12], [1100, 26], [1600, 40], [2414, 1]] }] },
};

const SCENES = {
  // 名前: { course, surface, dist, t（発走からの秒、負なら残りの距離 m で先頭が来た時）, cam }
  nakayama_goal_tv: { course: '中山', surface: '芝', dist: 2000, rem: 150, cam: 'tv' },
  nakayama_goal_ride: { course: '中山', surface: '芝', dist: 2000, rem: 230, cam: 'ride' },
  nakayama_c4_tv: { course: '中山', surface: '芝', dist: 2000, rem: 420, cam: 'tv' },
  kyoto_c3_tv: { course: '京都', surface: '芝', dist: 2400, rem: 820, cam: 'tv' },
  kyoto_c3_ride: { course: '京都', surface: '芝', dist: 2400, rem: 900, cam: 'ride' },
  kyoto_c4_ride: { course: '京都', surface: '芝', dist: 2400, rem: 640, cam: 'ride' },
  niigata1000_tv: { course: '新潟', surface: '芝', dist: 1000, rem: 400, cam: 'tv' },
  niigata1000_ride: { course: '新潟', surface: '芝', dist: 1000, rem: 600, cam: 'ride' },
  niigata1000_gate: { course: '新潟', surface: '芝', dist: 1000, t: -1, cam: 'gate' },
  epsom_tv: { course: 'エプソム', surface: '芝', dist: 2400, rem: 900, cam: 'tv' },
  epsom_ride: { course: 'エプソム', surface: '芝', dist: 2400, rem: 1500, cam: 'ride' },
  epsom_corner_tv: { course: 'エプソム', surface: '芝', dist: 2400, rem: 640, cam: 'tv' },
  // Godot との見比べ（docs/shots/compare と同じ場面：東京 芝2400）
  cmp_1_start_ride: { course: '東京', surface: '芝', dist: 2400, t: 1.2, cam: 'ride', cmp: true },
  cmp_1_start_tv: { course: '東京', surface: '芝', dist: 2400, t: 1.2, cam: 'tv', cmp: true },
  cmp_2_corner3_ride: { course: '東京', surface: '芝', dist: 2400, t: 95, cam: 'ride', cmp: true },
  cmp_2_corner3_tv: { course: '東京', surface: '芝', dist: 2400, t: 95, cam: 'tv', cmp: true },
  cmp_3_straight_ride: { course: '東京', surface: '芝', dist: 2400, t: 122, cam: 'ride', cmp: true },
  cmp_3_straight_tv: { course: '東京', surface: '芝', dist: 2400, t: 122, cam: 'tv', cmp: true },
  cmp_4_goal_ride: { course: '東京', surface: '芝', dist: 2400, rem: 5, cam: 'ride', cmp: true },
  cmp_4_goal_tv: { course: '東京', surface: '芝', dist: 2400, rem: 5, cam: 'tv', cmp: true },
  dirt_tv: { course: '東京', surface: 'ダ', dist: 1600, rem: 300, cam: 'tv' },
  dirt_ride: { course: '東京', surface: 'ダ', dist: 1600, rem: 500, cam: 'ride' },
  // 勝ったときの画面の背景（スタンドとゴール前を内馬場から）
  result_bg: { course: '東京', surface: '芝', dist: 2400, rem: 28, cam: 'fixed', w: 1600, h: 900, fix: { s: -38, u: -8, h: 2.4, ls: 70, lu: 22, lh: 5.5, fov: 58 } },
};

async function main() {
  const out = path.resolve(process.argv[2] || 'docs/shots/terrain3d');
  const names = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(SCENES);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForFunction(() => globalThis.HS && HS.Race3D && HS.Race3D.assetsReady(), null, { timeout: 60000 });
  await page.evaluate(LY => { HS.DATA.layouts = Object.assign({}, LY, HS.DATA.layouts || {}); }, LAYOUTS);
  // 馬の形：環境変数 HORSE=rigged|handmade（無ければ設定のまま）
  if (process.env.HORSE) await page.evaluate(v => HS.HorseRigged && HS.HorseRigged.setModel(v), process.env.HORSE);
  for (const name of names) {
    const sc = SCENES[name];
    if (!sc) { console.log('場面が無い', name); continue; }
    const t0 = Date.now();
    const info = await page.evaluate(async ([name, sc]) => {
      const W = sc.w || 1280, Hh = sc.h || 720;
      document.body.innerHTML = '';
      document.body.style.margin = '0';
      const cv = document.createElement('canvas');
      cv.id = 'shot'; cv.width = W; cv.height = Hh; cv.style.width = W + 'px'; cv.style.height = Hh + 'px'; cv.style.display = 'block';
      document.body.appendChild(cv);
      const U = HS.U, H = HS.Horse, S = HS.Sim;
      const race = { dist: sc.dist, surface: sc.surface, course: sc.course, ground: sc.ground || '良', year: 2024, name: name };
      const rng = new U.RNG(7);
      const coats = ['鹿毛', '黒鹿毛', '栗毛', '芦毛', '青鹿毛', '鹿毛', '栃栗毛', '栗毛', '黒鹿毛', '鹿毛', '芦毛', '青毛', '鹿毛', '栗毛', '黒鹿毛', '鹿毛'];
      const field = [];
      for (let i = 0; i < 16; i++) {
        const h = H.makeFiller(rng, { level: 80, surface: sc.surface, dist: sc.dist, born: 2020 });
        h.coat = coats[i]; h.name = 'H' + i;
        field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: Math.min(8, Math.floor(i / 2) + 1) });
      }
      const sim = S.create(race, field, H.weekIndex(2024, 5, 1), rng, { frames: true });
      while (!S.step(sim)) { /* 進める */ }
      const fr = sim.frames;
      // 撮る時刻
      let t = sc.t;
      if (sc.rem != null) { const f = fr.find(f => Math.max(...f.p.map(p => p[0])) >= sim.D - sc.rem); t = f ? f.t : fr[fr.length - 1].t; }
      const posAt = tt => {
        if (tt <= 0) return field.map((x, j) => [0, (x.num - 1) * 0.5, 0]);
        let i = 0; while (i < fr.length - 2 && fr[i + 1].t < tt) i++;
        const a = fr[i], b = fr[i + 1], k = Math.max(0, Math.min(1, (tt - a.t) / Math.max(1e-6, b.t - a.t)));
        return a.p.map((pa, j) => { const pb = b.p[j]; return [pa[0] + (pb[0] - pa[0]) * k, pa[1] + (pb[1] - pa[1]) * k, pa[2] + (pb[2] - pa[2]) * k]; });
      };
      const course = HS.DATA.courses[race.course];
      const geo = sim.geo;
      const r3 = HS.Race3D.create(cv, {
        D: sim.D, surface: race.surface, ground: race.ground, track: sim.track,
        course: { name: race.course, dir: course.dir, lap: geo.lap, straight: geo.straight, slope: geo.slope },
        horses: field.map((x, j) => ({ num: x.num, frame: x.frame, cap: HS.DATA.frameColors[(x.frame - 1) % 8], silks: HS.RaceView.silksOf(x.horse), coat: x.horse.coat, name: x.horse.name, age: 4, mine: j === 10 })),
      });
      r3.resize(W, Hh, 1);
      const cam = sc.cam;
      // 少し前から回して、カメラと馬の動きをならす
      for (let k = 12; k >= 0; k--) {
        const tt = t - k * 0.1;
        const P = posAt(tt);
        const view = { t: tt, horses: P.map(p => ({ x: p[0], lane: p[1], v: p[2] })), me: 10, phase: tt <= 0 ? 'gate' : 'race', fix: sc.fix };
        r3.render(view, cam, sc.orbit || null);
      }
      const inf = r3.info();
      const img = cv.toDataURL('image/jpeg', 0.88);
      r3.dispose();
      return { inf, t, img, layout: !!(sim.track && sim.track.layout) };
    }, [name, sc]);
    const b64 = info.img.slice(info.img.indexOf(',') + 1);
    fs.writeFileSync(path.join(out, name + '.jpg'), Buffer.from(b64, 'base64'));
    console.log(name, `t=${info.t.toFixed(1)}`, info.layout ? '実際の形' : '楕円', JSON.stringify(info.inf), `${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  if (errors.length) console.log('エラー・警告:\n' + [...new Set(errors)].slice(0, 20).join('\n'));
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
