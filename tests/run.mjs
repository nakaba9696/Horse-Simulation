// 画面を動かさない確認。`node tests/run.mjs` で全部走る。
import assert from 'node:assert/strict';
import { loadHS } from './load.mjs';
import { autoplayWeek } from './autoplay.mjs';

const HS = loadHS();
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const RACE = (distance, extra) => Object.assign({ surface: 'turf', distance, condition: 'good' }, extra);
function clone(h, patch) {
  const c = JSON.parse(JSON.stringify(h));
  Object.assign(c.stats, patch || {});
  return c;
}
function flatHorse(id, stats, style) {
  return { id, name: '馬' + id, stats: Object.assign({ speed: 60, stamina: 60, power: 60, guts: 60, wits: 60 }, stats),
    style: style || 'senko', bestDistance: 2000, aptitude: { turf: 'A', dirt: 'A' }, record: { starts: 0, wins: 0, places: 0 } };
}

test('データ：馬の能力・適性・脚質が正しい範囲にあり、名前が重ならない', () => {
  const horses = HS.createStable(123, 40);
  const names = new Set();
  for (const h of horses) {
    for (const k of HS.STAT_KEYS) assert.ok(h.stats[k] >= 15 && h.stats[k] <= 100, `${h.name} ${k}=${h.stats[k]}`);
    assert.ok(HS.STYLES[h.style], h.style);
    assert.ok(HS.APTITUDE[h.aptitude.turf] && HS.APTITUDE[h.aptitude.dirt]);
    assert.ok(!names.has(h.name), '名前が重なっている: ' + h.name);
    names.add(h.name);
  }
});

test('同じシードなら同じ結果になる', () => {
  const horses = HS.createStable(5, 12);
  const a = HS.simulateRace(RACE(2000), horses, 99).results.map((r) => [r.horseId, r.time]);
  const b = HS.simulateRace(RACE(2000), horses, 99).results.map((r) => [r.horseId, r.time]);
  assert.deepEqual(a, b);
});

test('全頭がゴールし、タイムが現実的な範囲にある', () => {
  for (let k = 0; k < 60; k++) {
    const horses = HS.createStable(k + 1, 8 + (k % 5));
    for (const d of [1200, 2000, 3200]) {
      for (const cond of HS.CONDITION_KEYS) {
        const { results } = HS.simulateRace(RACE(d, { condition: cond, surface: k % 2 ? 'turf' : 'dirt' }), horses, k * 31 + d);
        assert.equal(results.length, horses.length);
        results.forEach((r, i) => {
          assert.equal(r.rank, i + 1);
          assert.ok(Number.isFinite(r.time), 'ゴールしていない');
          const v = d / r.time;
          assert.ok(v > 13 && v < 19.5, `平均 ${v.toFixed(2)} m/s（${d}m）`);
        });
      }
    }
  }
});

test('スピードが高い馬ほど勝ちやすい（ただし必ずではない）', () => {
  let wins = 0;
  const n = 300;
  for (let k = 0; k < n; k++) {
    const horses = [flatHorse(1, { speed: 80 })].concat([2, 3, 4, 5, 6, 7, 8].map((i) => flatHorse(i)));
    if (HS.simulateRace(RACE(1600), horses, k).results[0].horseId === 1) wins++;
  }
  const rate = wins / n;
  assert.ok(rate > 0.4 && rate < 0.99, `勝率 ${rate}`);
});

test('スタミナは長い距離ほど効く', () => {
  const rate = (d) => {
    let wins = 0;
    for (let k = 0; k < 200; k++) {
      const horses = [flatHorse(1, { stamina: 95, speed: 50 })].concat([2, 3, 4, 5, 6, 7].map((i) => flatHorse(i, { stamina: 45 })));
      horses.forEach((h) => { h.bestDistance = d; });
      if (HS.simulateRace(RACE(d), horses, k).results[0].horseId === 1) wins++;
    }
    return wins / 200;
  };
  const short = rate(1200);
  const long = rate(3200);
  assert.ok(long > short + 0.2, `1200m ${short} / 3200m ${long}`);
});

test('脚質ごとの勝ちやすさに極端な偏りが無い', () => {
  const wins = {}, starts = {};
  for (let k = 0; k < 150; k++) {
    const all = HS.createStable(k + 1, 40).sort((a, b) => HS.overall(a) - HS.overall(b));
    const field = all.slice(k % 28, (k % 28) + 12);
    for (const d of [1200, 2000, 3000]) {
      const { results } = HS.simulateRace(RACE(d), field, k * 13 + d);
      field.forEach((h) => { starts[h.style] = (starts[h.style] || 0) + 1; });
      const s = field[results[0].index].style;
      wins[s] = (wins[s] || 0) + 1;
    }
  }
  for (const s of HS.STYLE_KEYS) {
    const ratio = ((wins[s] || 0) / starts[s]) * 12;
    assert.ok(ratio > 0.6 && ratio < 1.5, `${s} の勝ちやすさ ${ratio.toFixed(2)}`);
  }
});


test('データ：種牡馬の系統・ニックス・重賞・調教の参照先が実在する', () => {
  const lines = new Set(Object.values(HS.FOUNDERS));
  for (const st of HS.STALLIONS) {
    assert.ok(lines.has(st.line), `${st.name} の系統 ${st.line}`);
    assert.ok(lines.has(st.damLine), `${st.name} の母父系 ${st.damLine}`);
    assert.ok(HS.STYLES[st.style] && HS.GROWTH[st.growth]);
    for (const k of HS.STAT_KEYS) assert.ok(st.potential[k] > 0 && st.potential[k] <= 100);
  }
  for (const [a, b] of HS.NICKS) assert.ok(lines.has(a) && lines.has(b));
  for (const g of HS.GRADED_RACES) {
    assert.ok(g.week >= 1 && g.week <= HS.WEEKS_PER_YEAR, g.name);
    assert.ok(HS.CLASSES[g.grade] && HS.SURFACES[g.surface]);
  }
  for (const t of Object.values(HS.TRAININGS)) {
    if (t.main) assert.ok(HS.STAT_KEYS.includes(t.main));
    if (t.sub) assert.ok(HS.STAT_KEYS.includes(t.sub));
  }
  const names = new Set(HS.STALLIONS.map((s) => s.name).concat(Object.keys(HS.FOUNDERS)));
  assert.equal(names.size, HS.STALLIONS.length + Object.keys(HS.FOUNDERS).length, '種牡馬と祖の名前が重なっている');
});

test('配合理論：インブリードとニックスを見分ける', () => {
  const game = HS.newGame(1);
  const ruri = game.horses.find((h) => h.name === 'ルリノワルツ'); // 父ツキノミラクル（ツキ系）
  const yuki = HS.STALLIONS.find((s) => s.name === 'ユキワルツ');   // 父ツキノミラクル
  const th1 = HS.breedingTheory(yuki, ruri);
  assert.equal(th1.inbreeds[0].name, 'ツキノミラクル');
  assert.equal(th1.inbreeds[0].cross, '2×2');
  assert.ok(th1.frail);
  const ginga = HS.STALLIONS.find((s) => s.name === 'ギンガオー');  // オーロラ系 × 母父ツキ系 = ニックス
  const th2 = HS.breedingTheory(ginga, ruri);
  assert.ok(th2.nick);
  assert.ok(th2.bonus > 0);
});

test('配合：良い種牡馬ほど素質の高い仔が出やすい', () => {
  const game = HS.newGame(2);
  const mare = game.horses.find((h) => h.status === 'broodmare');
  const avg = (sid) => {
    const rng = HS.createRng(9);
    const st = HS.STALLIONS.find((s) => s.id === sid);
    let total = 0;
    for (let i = 0; i < 200; i++) {
      const f = HS.makeFoal(rng, st, mare, 'x', 'テスト', 1);
      for (const k of HS.STAT_KEYS) assert.ok(f.potential[k] >= 20 && f.potential[k] <= 100);
      total += HS.sumStats(f.potential);
    }
    return total / 200;
  };
  assert.ok(avg('S1') > avg('S12') + 15);
});

test('出走できる条件：新馬・年齢・牝馬限定・クラス', () => {
  const game = HS.newGame(3);
  const h = game.horses.find((x) => x.status === 'stable');
  const race = (extra) => Object.assign({ year: game.year, week: 30, cls: 'debut', age: 2 }, extra);
  assert.equal(HS.ineligibleReason(h, race()), null);
  h.record.starts = 1;
  assert.ok(HS.ineligibleReason(h, race()));
  assert.equal(HS.ineligibleReason(h, race({ cls: 'maiden' })), null);
  assert.ok(HS.ineligibleReason(h, race({ cls: 'maiden', age: 'older' })));
  h.record.wins = 1;
  assert.equal(HS.ineligibleReason(h, race({ cls: 'win1' })), null);
  assert.equal(HS.ineligibleReason(h, race({ cls: 'g1' })), null);
  h.sex = 'colt';
  assert.ok(HS.ineligibleReason(h, race({ cls: 'g1', filly: true })));
  h.fatigue = 95;
  assert.ok(HS.ineligibleReason(h, race({ cls: 'win1' })));
});

test('賞金：着順で配分し、出走手当がつく', () => {
  const r = { cls: 'g1' };
  assert.equal(HS.prizeFor(r, 1), HS.CLASSES.g1.prize + HS.APPEARANCE_FEE);
  assert.equal(HS.prizeFor(r, 2), Math.round(HS.CLASSES.g1.prize * 0.4) + HS.APPEARANCE_FEE);
  assert.equal(HS.prizeFor(r, 9), HS.APPEARANCE_FEE);
});

test('番組表：毎週レースがあり、重賞は決まった週にある', () => {
  const game = HS.newGame(4);
  for (let w = 1; w <= HS.WEEKS_PER_YEAR; w++) {
    const races = HS.weekRaces(game, 1, w);
    assert.ok(races.length >= 3, `${w}週`);
    assert.equal(new Set(races.map((r) => r.id)).size, races.length);
    const graded = HS.GRADED_RACES.filter((g) => g.week === w).length;
    assert.equal(races.filter((r) => r.graded).length, graded);
  }
  // 同じ週は何度呼んでも同じ
  assert.equal(JSON.stringify(HS.weekRaces(game, 2, 15)), JSON.stringify(HS.weekRaces(game, 2, 15)));
});

test('種付け：季節だけ・お金が減り・翌年 3 月に生まれる', () => {
  const game = HS.newGame(5);
  const mare = game.horses.find((h) => h.status === 'broodmare' && !h.pregnant);
  assert.ok(HS.breed(game, mare.id, 'S8'), '季節外は断られる');
  while (game.week !== HS.BREEDING_WEEKS[0]) HS.advanceWeek(game);
  const before = game.money;
  assert.equal(HS.breed(game, mare.id, 'S8'), null);
  assert.equal(game.money, before - HS.studFee(HS.STALLIONS.find((s) => s.id === 'S8')));
  assert.ok(HS.breed(game, mare.id, 'S1'), '受胎中は断られる');
  const count = () => game.horses.filter((h) => h.birthYear === 2).length;
  while (game.year < 2 || game.week < 10) HS.advanceWeek(game);
  assert.ok(count() >= 1, '生まれていない');
  assert.equal(mare.pregnant, null);
});

test('セリ：7 月に開かれ、買うと牧場に来る', () => {
  const game = HS.newGame(6);
  while (!HS.auctionOpen(game)) HS.advanceWeek(game);
  assert.equal(game.auction.length, 6);
  const n = game.horses.length;
  game.money = 1e6;
  assert.equal(HS.buyAtAuction(game, 0), null);
  assert.equal(game.horses.length, n + 1);
  assert.ok(HS.buyAtAuction(game, 0), '二度は買えない');
  while (HS.auctionOpen(game)) HS.advanceWeek(game);
  assert.equal(game.auction, null);
});

test('引退：牝馬は繁殖牝馬に、G1 を勝った牡馬は種牡馬になる', () => {
  const game = HS.newGame(7);
  const colt = game.horses.find((h) => h.status === 'stable');
  colt.sex = 'colt';
  colt.record.g1Wins = 1;
  assert.equal(HS.retire(game, colt.id), null);
  assert.equal(game.ownStallions.length, 1);
  assert.equal(HS.studFee(game.ownStallions[0]), 0);
  assert.ok(HS.allStallions(game).some((s) => s.name === colt.name));
  const filly = game.horses.find((h) => h.status === 'farm');
  game.year = filly.birthYear + 3;
  filly.sex = 'filly';
  assert.equal(HS.retire(game, filly.id), null);
  assert.equal(filly.status, 'broodmare');
});

test('セーブ：古い形や壊れたデータは読み込まない', () => {
  assert.equal(HS.migrate(null), null);
  assert.equal(HS.migrate({ version: 1, horses: [] }), null);
  const g = HS.newGame(8);
  delete g.hallOfFame;
  delete g.horses[0].record;
  const m = HS.migrate(JSON.parse(JSON.stringify(g)));
  assert.equal(JSON.stringify(m.hallOfFame), '[]');
  assert.equal(m.horses[0].record.starts, 0);
});

test('自動で 6 年遊んでも壊れず、レースに勝てる', () => {
  for (const seed of [1, 2]) {
    const game = HS.newGame(seed);
    const rng = HS.createRng(seed);
    let wins = 0;
    for (let w = 0; w < HS.WEEKS_PER_YEAR * 6; w++) {
      const out = autoplayWeek(HS, game, rng);
      out.races.forEach((o) => o.lines.forEach((l) => { if (l.rank === 1) wins++; }));
      assert.ok(Number.isFinite(game.money));
      for (const h of game.horses) for (const k of HS.STAT_KEYS) assert.ok(Number.isFinite(h.stats[k]));
    }
    assert.equal(game.year, 7);
    assert.ok(wins >= 3, `勝ち数 ${wins}`);
  }
});

test('騎手：クラスが足りないと上手い騎手は乗らず、腕はレースに効く', () => {
  const game = HS.newGame(10);
  const h = game.horses.find((x) => x.status === 'stable');
  assert.ok(HS.setJockey(game, h.id, 'J1'), '新馬に一流騎手は乗らない');
  assert.equal(HS.setJockey(game, h.id, 'J5'), null);
  h.record.wins = 2; h.record.starts = 3;
  assert.equal(HS.setJockey(game, h.id, 'J1'), null);
  // 同じ馬どうしなら、上手い騎手の方が勝ちやすい
  let wins = 0;
  for (let k = 0; k < 200; k++) {
    const a = flatHorse(1); a.jockeySkill = 92;
    const b = flatHorse(2); b.jockeySkill = 50;
    const res = HS.simulateRace(RACE(2000), [a, b, flatHorse(3), flatHorse(4)], k).results;
    if (res.findIndex((r) => r.horseId === 1) < res.findIndex((r) => r.horseId === 2)) wins++;
  }
  assert.ok(wins > 110, `上手い騎手が先着 ${wins}/200`);
});

test('調教師：腕の良い厩舎ほど調教で伸びる', () => {
  const grow = (tid) => {
    const game = HS.newGame(11);
    const h = game.horses.find((x) => x.status === 'stable');
    HS.setTrainer(game, h.id, tid);
    const before = HS.sumStats(h.stats);
    for (let w = 0; w < 6; w++) { HS.setTraining(game, h.id, w % 2 ? 'rest' : 'wood'); HS.advanceWeek(game); }
    return HS.sumStats(h.stats) - before;
  };
  assert.ok(grow('T1') > grow('T6'));
});

test('ライバル：重賞に出てきて、成績と表彰が記録される', () => {
  const game = HS.newGame(12);
  assert.equal(game.rivals.length, HS.RIVAL_OWNERS.length * 6);
  const rng = HS.createRng(12);
  for (let w = 0; w < HS.WEEKS_PER_YEAR * 2; w++) autoplayWeek(HS, game, rng);
  const g1 = game.rivals.reduce((a, h) => a + h.record.g1Wins, 0);
  assert.ok(g1 > 0, 'ライバルが G1 を勝っていない');
  assert.equal(game.awards.length, 2);
  const titles = game.awards[0].items.map((i) => i.title);
  for (const t of ['年度代表馬', 'リーディング馬主', 'リーディング騎手']) assert.ok(titles.includes(t), t);
  // 年が明けると新しい 2 歳馬が来て、古い馬は引退する
  assert.ok(game.rivals.every((h) => HS.ageOf(h, game.year) < 6));
});

test('海外遠征：重賞馬だけが出られ、遠征費がかかる', () => {
  const game = HS.newGame(13);
  const h = game.horses.find((x) => x.status === 'stable');
  game.year = h.birthYear + 4;
  game.week = HS.OVERSEAS_RACES[0].week;
  const race = HS.weekRaces(game, game.year, game.week).find((r) => r.overseas);
  assert.ok(race, '海外のレースが番組表に無い');
  assert.ok(HS.ineligibleReason(h, race));
  h.record.wins = 5; h.record.starts = 8; h.record.gradedWins = 1;
  h.fatigue = 0;
  assert.equal(HS.setEntry(game, h.id, race.id), null);
  const before = game.money;
  const out = HS.advanceWeek(game);
  assert.equal(out.races.length, 1);
  assert.ok(game.money < before + out.races[0].lines[0].prize - HS.TRAVEL_COST + 1);
});

test('実況とコメント：レースの流れに沿った文ができる', () => {
  const game = HS.newGame(14);
  const h = game.horses.find((x) => x.status === 'stable');
  game.week = 30;
  const race = HS.weekRaces(game, game.year, game.week).find((r) => r.cls === 'debut');
  HS.setEntry(game, h.id, race.id);
  const out = HS.advanceWeek(game);
  const c = out.races[0].commentary;
  assert.ok(c.length >= 5);
  assert.ok(c[0].text.includes('スタート'));
  assert.ok(c[c.length - 1].text.includes('ゴール') || c[c.length - 2].text.includes('ゴール'));
  for (let i = 1; i < c.length; i++) assert.ok(c[i].t >= c[i - 1].t, '時間の順になっていない');
  assert.ok(out.races[0].paddock[0].text.length > 0);
  assert.ok(HS.raceComment(h, race).length > 0);
  assert.ok(HS.stableComment(h, game).length > 0);
});

test('セーブ：版 2 のセーブを読み込むとライバルが足される', () => {
  const g = HS.newGame(15);
  delete g.rivals; delete g.awards; delete g.jockeyStats;
  g.version = 2;
  const m = HS.migrate(JSON.parse(JSON.stringify(g)));
  assert.equal(m.version, 3);
  assert.ok(m.rivals.length > 0);
  HS.advanceWeek(m);
});

let failed = 0;
for (const t of tests) {
  const start = Date.now();
  try {
    t.fn();
    console.log(`ok   ${t.name} (${Date.now() - start}ms)`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${t.name}\n     ${e.message}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} 通過`);
process.exit(failed ? 1 : 0);
