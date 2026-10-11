// 画面を動かさない確認。`node tests/run.mjs` で全部走る。
import assert from 'node:assert/strict';
import { loadHS } from './load.mjs';

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
  assert.ok(rate > 0.3 && rate < 0.95, `勝率 ${rate}`);
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

test('オッズ：控除率ぶんを引いた確率の合計がおおむね 1 で、人気は 1 から並ぶ', () => {
  const game = HS.newGame(77);
  for (let d = 0; d < 4; d++) {
    const card = HS.createRaceCard(game);
    const sum = card.odds.reduce((a, o) => a + 0.8 / o.win, 0);
    assert.ok(sum > 0.85 && sum < 1.2, `合計 ${sum}`);
    card.odds.forEach((o) => assert.ok(o.win >= 1.1 && o.place >= 1.1 && o.win <= 999.9));
    assert.equal(JSON.stringify(Array.from(card.popularity).sort((a, b) => a - b)), JSON.stringify(card.entries.map((_, i) => i + 1)));
    assert.ok(card.entries.length >= 8 && card.entries.length <= 12);
    game.day++;
  }
});

test('払い戻し：単勝・複勝の当たりはずれと金額', () => {
  const entries = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => flatHorse(i));
  const card = { entries, odds: entries.map((_, i) => ({ win: 2 + i, place: 1.5 })) };
  const results = [2, 0, 5, 1, 3, 4, 6, 7].map((index, i) => ({ index, rank: i + 1, horseId: index + 1, name: 'x' }));
  const st = HS.settle(card, results, [
    { type: 'win', index: 2, amount: 100 },   // 1 着：4 倍
    { type: 'win', index: 0, amount: 100 },   // 2 着：はずれ
    { type: 'place', index: 5, amount: 200 }, // 3 着：1.5 倍
    { type: 'place', index: 1, amount: 100 }, // 4 着：はずれ
  ]);
  assert.equal(st.stake, 500);
  assert.equal(st.payout, 400 + 300);
  assert.deepEqual(st.lines.map((l) => l.hit), [true, false, true, false]);
  // 7 頭以下なら複勝は 2 着まで
  assert.equal(HS.placeSlots(7), 2);
  assert.equal(HS.placeSlots(8), 3);
});

test('レース後に所持金・戦績・日付が進み、尽きたら援助される', () => {
  const game = HS.newGame(3);
  const card = HS.createRaceCard(game);
  const { results } = HS.simulateRace(card.race, card.entries, card.race.seed);
  const winner = game.horses.find((h) => h.id === results[0].horseId);
  const st = { stake: game.money, payout: 0, lines: [] };
  const out = HS.applyResult(game, card, results, st);
  assert.equal(game.day, 2);
  assert.equal(winner.record.wins, 1);
  assert.equal(winner.record.starts, 1);
  assert.ok(out.bailout);
  assert.equal(game.money, 3000);
  assert.equal(game.history.length, 1);
});

test('古いセーブ（項目が足りない）でも読み込める', () => {
  const g = HS.newGame(9);
  delete g.history;
  delete g.day;
  delete g.horses[0].record;
  const m = HS.migrate(JSON.parse(JSON.stringify(g)));
  assert.equal(m.day, 1);
  assert.equal(JSON.stringify(m.history), '[]');
  assert.equal(JSON.stringify(m.horses[0].record), JSON.stringify({ starts: 0, wins: 0, places: 0 }));
  assert.equal(HS.migrate(null), null);
  assert.equal(HS.migrate({ foo: 1 }), null);
});

test('自動で 30 日遊んでも壊れない', () => {
  const game = HS.newGame(2024);
  const rng = HS.createRng(1);
  for (let d = 0; d < 30; d++) {
    const card = HS.createRaceCard(game);
    const { results, frames } = HS.simulateRace(card.race, card.entries, card.race.seed, { record: d % 10 === 0 });
    if (d % 10 === 0) assert.ok(frames.length > 0);
    const bets = [{ type: rng() < 0.5 ? 'win' : 'place', index: rng.int(0, card.entries.length - 1), amount: 100 }];
    const st = HS.settle(card, results, bets);
    HS.applyResult(game, card, results, st);
    assert.ok(Number.isFinite(game.money) && game.money >= 0);
  }
  assert.equal(game.day, 31);
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
