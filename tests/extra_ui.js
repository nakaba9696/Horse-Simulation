// 確かめ：画面の仕組み（一覧の並べ替え・絞り込み、フリーレースの馬選びとコースの札、番組表と予約）
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const W = HS.World, L = HS.List, FR = HS.FreeRace, P = HS.Program, T = HS.Season;

  check('list: 並べ替え（向き・値の無いものは最後・同じ値は元の並び）と見出しの切り替え・ひらがなで探す', () => {
    const cols = [{ k: 'v', val: x => x.v, dir: -1 }, { k: 'n', val: x => x.n, str: true, dir: 1 }];
    const items = [{ n: 'イ', v: 3 }, { n: 'ア', v: null }, { n: 'ウ', v: 5 }, { n: 'エ', v: 3 }];
    assert(L.sort(items, cols, 'v').map(x => x.n).join('') === 'ウイエア', '大きい順が違う');
    assert(L.sort(items, cols, 'v', 1).map(x => x.n).join('') === 'イエウア', '小さい順で値の無いものが最後にならない');
    assert(L.sort(items, cols, 'n').map(x => x.n).join('') === 'アイウエ', '名前の順が違う');
    const st = {};
    L.toggle(st, cols, 'v'); assert(st.sortKey === 'v' && st.sortDir === -1, '最初はその列の向き');
    L.toggle(st, cols, 'v'); assert(st.sortDir === 1, 'もう一度で逆順');
    L.toggle(st, cols, 'n'); assert(st.sortKey === 'n' && st.sortDir === 1, '別の列はその列の向き');
    assert(L.match('でぃーぷ', 'ディープインパクト') && !L.match('おるふぇ', 'ディープインパクト') && L.match('', 'x'), 'ひらがなで探せない');
  });

  check('freerace: 馬選びの表（名前・年代・国・脚質・芝ダで絞り、能力の列で並べ替え）', () => {
    const all = FR.table({ tab: 'hist' });
    assert(all.length === HS.DATA.historic.length, '絞らないと全部出ない');
    for (let i = 1; i < 50; i++) assert(all[i - 1].turf >= all[i].turf, '既定は芝の総合力の高い順');
    const q = FR.table({ tab: 'hist', q: 'でぃーぷいん' });
    assert(q.length >= 1 && q.every(x => x.name.includes('ディープイン')), '名前で絞れない');
    const f = FR.table({ tab: 'hist', decade: 1990, cty: '日', style: '差し', surf: 'ダ', sortKey: 'guts', sortDir: -1 });
    assert(f.length > 0, '絞った結果が空');
    for (const x of f) assert(x.born >= 1990 && x.born < 2000 && x.country === '日' && x.style === '差し' && x.dirt > x.turf, `絞り込みが違う ${x.name}`);
    for (let i = 1; i < f.length; i++) assert(Math.round(f[i - 1].pot.guts) >= Math.round(f[i].pot.guts), '根性の順でない');
    const w = FR.table({ tab: 'hist', cty: '外', sortKey: 'name', sortDir: 1 });
    assert(w.length && w.every(x => x.country !== '日'), '海外で絞れない');
    const sp = FR.table({ tab: 'special' });
    assert(sp.length === FR.specials().length && sp.every(x => x.kind === 'special'), 'スペシャルホースの表');
    assert(FR.decades('hist').includes(1990), '年代の選び肢');
    return `史実馬 ${all.length}頭・絞り込み ${f.length}頭`;
  });

  check('freerace: 競馬場の札（中央・地方・海外にまとめ、すべての競馬場が一度だけ）', () => {
    const gs = FR.courseGroups();
    const names = gs.flatMap(g => g.courses.map(c => c.name));
    assert(new Set(names).size === names.length && names.length === FR.courses().length, '競馬場の抜け・重なり');
    assert(gs[0].id === 'jra' && gs[0].courses.some(c => c.name === '東京') && gs[0].courses.every(c => HS.DATA.courses[c.name].region === 'JRA'), '中央の札');
    for (const g of gs) for (const c of g.courses) { assert(c.dir === '右' || c.dir === '左' || c.dir, '回り'); assert(FR.groupOf(c.name) === g.id, 'groupOf が違う ' + c.name); }
    return gs.map(g => `${g.label}${g.courses.length}`).join('・');
  });

  check('program: 番組表（出られるか・適性・予約。オープンも予約でき、その週に出走登録になる）', () => {
    W.newGame({ seed: 21, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get(); G.player.money = 60000;
    let n = 0; for (const it of W.marketHistoric().slice().sort((a, b) => a.price - b.price)) { if (n >= 3) break; if (!W.buy(it)) n++; }
    let guard = 0; while (!(G.month === 7 && G.week === 1) && guard++ < 60) W.finishWeek({});
    const h = W.mine('stable')[0];
    assert(h, '入厩した馬がいない');
    const rows = P.rows(h, {});
    assert(rows.length > 10, '番組表が少なすぎる ' + rows.length);
    assert(rows.every(r => !r.why), '「出られるレース」に出られないものがある');
    assert(rows.every((r, i) => !i || rows[i - 1].wk.i <= r.wk.i), '週の順でない');
    assert(rows.every(r => r.wk.i < T.RESERVE_WEEKS), '1年より先がある');
    for (const r of rows) {
      assert(r.dist === P.fitDist(h, r.race.dist) && r.surf === P.fitSurf(h, r.race.surface), '適性の印');
      if (r.race.dist >= h.distMin && r.race.dist <= h.distMax) assert(r.dist === 3, '距離の内なのに◎でない');
    }
    const all = P.rows(h, { show: 'all', kind: 'graded' });
    assert(all.every(r => r.race.graded) && all.some(r => r.why), '重賞だけ・出られないものも、が効かない');
    assert(P.rows(h, { surf: 'ダ' }).every(r => r.race.surface === 'ダ'), '馬場で絞れない');
    // オープンを予約 → 同じ週はほかを予約できない → その週に出走登録になる
    const c = rows.find(r => r.can === 'reserve' && !r.race.graded);
    assert(c, '予約できるオープンが無い');
    assert(P.reserve(h.id, c.race.key) === null, 'オープンを予約できない');
    const after = P.rows(h, {});
    assert(after.some(r => r.state === 'reserved' && r.race.key === c.race.key), '予約の印が付かない');
    assert(after.filter(r => r.wk.i === c.wk.i && r.race.key !== c.race.key).every(r => r.busy && !r.can), '同じ週のほかのレースが予約できてしまう');
    assert(P.next(h) && P.next(h).reserved, '次走が予約にならない');
    assert(P.reserve(h.id, 'xxxx') === 'レースが見つからない', '無い鍵');
    guard = 0; while (!(G.year === c.wk.y && G.month === c.wk.m && G.week === c.wk.w) && guard++ < 60) W.finishWeek({});
    W.prepareWeek();
    const ent = W.entryOf(h.id);
    assert(ent && ent.raceKey === c.race.key, `予約したオープンに出走登録されない ${JSON.stringify(ent)} ${c.race.key}`);
    const now = P.rows(h, {});
    assert(now.some(r => r.wk.i === 0 && r.state === 'entered'), '今週の出走登録の印');
    return `${rows.length}行・予約 ${c.race.name}（${c.wk.m}月${c.wk.w}週）`;
  });
  check('ui: 能力の段（境目の値・JS と Godot で同じ境目と色・史実馬の値で段が偏りすぎない）', () => {
    const fs = require('fs'), path = require('path'), vm = require('vm');
    const ROOT = path.join(__dirname, '..');
    // uikit は画面の部品なので、document の代わりを置いた箱で読む
    const ctx = vm.createContext({ HS: { U: HS.U, UI: {}, App: {} }, document: { addEventListener() {}, getElementById() { return null; } } });
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/ui/uikit.js'), 'utf8'), ctx, { filename: 'js/ui/uikit.js' });
    const K = ctx.HS.UI.kit;
    const cases = [[50, 'fh', 0], [50.4, 'fh', 0], [50.5, 'fh', 1], [51, 'fh', 1], [60, 'fh', 1], [61, 'fh', 2], [65, 'fh', 2], [66, 'fh', 3], [80, 'fh', 3], [81, 'fh', 4], [99, 'fh', 4],
      [59, 'stat', 0], [60, 'stat', 1], [74, 'stat', 1], [75, 'stat', 2], [84, 'stat', 2], [85, 'stat', 3], [94, 'stat', 3], [94.6, 'stat', 4], [95, 'stat', 4], [120, 'stat', 4],
      [2, 'kire', 0], [3, 'kire', 1], [4, 'kire', 1], [5, 'kire', 2], [6, 'kire', 2], [7, 'kire', 3], [8, 'kire', 4]];
    for (const [v, kind, t] of cases) assert(K.tier(v, kind) === t, `段が違う ${kind} ${v} → ${K.tier(v, kind)}（${t}）`);
    assert(/class="u-num t3 big"/.test(K.num(66, '総合力', true, 'fh')), '札に段の印が付かない');
    assert(/u-num t3/.test(K.num(66, '総合力', false, 40, 85)) && /u-num t3/.test(K.num(86)), '前の呼び方（lo・hi）の段');
    assert(/t0[^]*t2/.test(K.fh(40, 62)), '総合力の芝・ダの札に段の印');
    // Godot の UiTheme と同じ境目・同じ色
    const gd = fs.readFileSync(path.join(ROOT, 'godot/ui/theme.gd'), 'utf8');
    const arr = n => { const m = gd.match(new RegExp(`const ${n} := \\[([^\\]]*)\\]`)); assert(m, `theme.gd に ${n} が無い`); return m[1]; };
    for (const [n, k] of [['TIER_FH', 'fh'], ['TIER_STAT', 'stat'], ['TIER_KIRE', 'kire']]) assert(arr(n).split(',').map(Number).join() === K.TIER[k].join(), `${n} が JS と違う`);
    const gcol = (arr('TIER_BG').match(/"([0-9a-f]{6})"/g) || []).map(x => x.slice(1, -1));
    const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
    for (let i = 0; i < 5; i++) { const m = css.match(new RegExp(`--tier${i}: #([0-9a-f]{6})`)); assert(m && m[1] === gcol[i], `段 ${i} の地の色が JS と Godot で違う`); }
    // 史実馬（年代なしで出る馬）の伸びきった値で数える：飛び抜けているは少数、低いもほどほど
    const H = HS.Horse, T = HS.Season, pool = HS.Eraless.pool();
    const cnt = { fh: [0, 0, 0, 0, 0], stat: [0, 0, 0, 0, 0] };
    pool.forEach((d, i) => { const h = H.fromHistoric(d, 'tier' + i), f = T.fhPeak(h); cnt.fh[K.tier(Math.max(f.turf, f.dirt), 'fh')]++; for (const k of H.STATS) cnt.stat[K.tier(h.pot[k], 'stat')]++; });
    const pct = a => { const n = a.reduce((x, y) => x + y, 0); return a.map(x => Math.round(x / n * 1000) / 10); };
    const pf = pct(cnt.fh), ps = pct(cnt.stat);
    assert(pf[4] < 3 && pf[0] < 5 && pf[2] > 20 && pf[3] > 5, '総合力の段の割合が偏っている ' + pf.join('/'));
    // 能力の運をやめてから（持ち主の決定 2026-10-20）、いちばん低い段（強さの元から大きく下の能力）はほとんどいない
    assert(ps[4] < 8 && ps[0] < 12 && ps.slice(1).every(x => x > 1), '能力の段の割合が偏っている ' + ps.join('/'));
    return `総合力（良いほう）の段 ${pf.join('/')}%・能力の段 ${ps.join('/')}%`;
  });
};
