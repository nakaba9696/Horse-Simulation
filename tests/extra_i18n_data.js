// 検証：データの英語の名前（持ち主の決定 2026-10-21「言語は日本語と英語にしたい」。決まりは docs/I18N_DATA.md）
// 馬（史実馬・スペシャルホース・G1 馬）・レース（暦の重賞・史実の勝ち鞍の記録のためのレース・オーナーの依頼のオープン・GF）・競馬場・特殊能力・騎手の架空の名前
const fs = require('fs');
const path = require('path');
module.exports = function (check, assert, HS) {
  const D = HS.DATA;
  const JA = /[　-ヿ㐀-鿿＀-￯]/; // かな・漢字・全角
  const okEn = s => typeof s === 'string' && s.trim() === s && s.length > 0 && !JA.test(s);
  const bad = (list, f) => list.filter(x => !okEn(f(x)));

  check('i18n: 史実馬・スペシャルホースに英語の名前がある（日本語の字が無い）', () => {
    const b = bad((D.historic || []).concat(D.legendsExtra || []), h => h.nameEn);
    assert(!b.length, b.slice(0, 10).map(h => h.name + '=' + h.nameEn).join(', '));
    HS.U.ERA = HS.Eraless.ERA;
    const sp = HS.Special.list().map(x => x.d);
    const b2 = bad(sp, d => d.nameEn);
    assert(!b2.length, 'スペシャルホース: ' + b2.slice(0, 10).map(d => d.name).join(', '));
    // トロフィーの隠し馬
    const hid = [].concat(...Object.values(D.trophyHorses || {}).filter(Array.isArray)).map(x => x.name);
    const byName = new Map((D.historic || []).concat(D.legendsExtra || []).map(h => [h.name, h]));
    const b3 = hid.filter(n => byName.has(n) && !okEn(byName.get(n).nameEn));
    assert(!b3.length, '隠し馬: ' + b3.join(', '));
    const rule = (D.historic || []).filter(h => h.nameEnRule).length;
    return `${D.historic.length + (D.legendsExtra || []).length}頭（決まりで作った名前 ${rule}頭）・スペシャルホース ${sp.length}頭`;
  });

  check('i18n: G1 馬・名鑑のある馬は出典で確かめた英語の名前（決まりで作った名前でない）', () => {
    const races = D.races || [];
    const g1 = h => (h.wins || []).some(w => { const y = +w.slice(0, 4), n = w.slice(4); return races.some(r => r.name === n && r.grade === 'G1' && r.from <= y && y <= (r.to || 9999)); });
    const prof = new Set((D.profiles || []).map(p => HS.normName(p.name)));
    const list = (D.historic || []).filter(h => g1(h) || prof.has(HS.normName(h.name)));
    const b = list.filter(h => !okEn(h.nameEn) || h.nameEnRule);
    // 出典で見つからなかった馬は docs/I18N_DATA.md の「確かめられなかった馬」に書く（ここに数の上限を置く）
    assert(b.length <= 10, `${b.length}頭: ` + b.slice(0, 20).map(h => h.name).join(', '));
    return `${list.length}頭（決まりで作った名前 ${b.length}頭）`;
  });

  check('i18n: data/names_en.js の馬はデータにいて、英語の名前に日本語の字が無い', () => {
    const names = new Set((D.historic || []).concat(D.legendsExtra || []).map(h => h.name).concat(D.dropHorses || []));
    const E = D.namesEn || {};
    const miss = Object.keys(E).filter(n => !names.has(n));
    assert(!miss.length, 'データにいない馬: ' + miss.slice(0, 10).join(', '));
    const b = Object.entries(E).filter(([, v]) => !okEn(v) || /\([A-Z]{2,4}\)$/.test(v));
    assert(!b.length, b.slice(0, 10).join(' / '));
    return `${Object.keys(E).length}頭`;
  });

  check('i18n: ローマ字の決まり（ヘボン式・長音を書かない・ンは b m p の前で m・ッは子音を重ねる）', () => {
    const t = { 'シンザン': 'Shinzan', 'トウカイテイオー': 'Tokaiteio', 'スペシャルウィーク': 'Supesharuwiku', 'ジャングルポケット': 'Jangurupoketto', 'サッチャー': 'Satcha', 'シンボリ': 'Shimbori', 'スズホープ（1974）': 'Suzuhopu', 'ニユーフオード': 'Niyufuodo' };
    for (const [k, v] of Object.entries(t)) assert(HS.romaji(k) === v, `${k} → ${HS.romaji(k)}（${v}）`);
  });

  check('i18n: 全部の重賞・史実の勝ち鞍のレース・オーナーの依頼のオープン・GF に英語の名前', () => {
    const all = (D.races || []).concat(D.histRaces || [], D.ownerRaces || []);
    const b = bad(all, r => r.nameEn);
    assert(!b.length, [...new Set(b.map(r => r.name))].slice(0, 10).join(', '));
    const g = bad(D.gf || [], c => c.nameEn).concat(bad(D.gf || [], c => c.trophyEn));
    assert(!g.length, 'GF: ' + g.map(c => c.id).join(', '));
    return `${new Set(all.map(r => r.name)).size}レース・GF ${(D.gf || []).length}`;
  });

  check('i18n: 競馬場に英語の名前', () => {
    const b = Object.entries(D.courses).filter(([, c]) => !okEn(c.nameEn)).map(([k]) => k);
    assert(!b.length, b.join(', '));
    return `${Object.keys(D.courses).length}場`;
  });

  check('i18n: 特殊能力（発動する技・手書きの能力・固有の技）に labelEn・noteEn。Godot の表にも同じ', () => {
    const K = HS.Skills, H = HS.Horse;
    const list = K.LIST.concat(Object.entries(H.SKILLS).map(([id, s]) => Object.assign({ id }, s)), D.uniques || []);
    const b = list.filter(s => !okEn(s.labelEn) || !okEn(s.noteEn)).map(s => s.id);
    assert(!b.length, b.join(', '));
    const labels = list.map(s => s.labelEn);
    const dup = labels.filter((l, i) => labels.indexOf(l) !== i);
    assert(!dup.length, '同じ英語名: ' + dup.join(', '));
    const root = path.join(__dirname, '..');
    const gs = fs.readFileSync(path.join(root, 'godot/core/hs_skills.gd'), 'utf8'), gh = fs.readFileSync(path.join(root, 'godot/core/hs_horse.gd'), 'utf8');
    const q = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    for (const s of K.LIST) assert(gs.includes(`id = "${s.id}"`) && gs.includes(`labelEn = "${q(s.labelEn)}", noteEn = "${q(s.noteEn)}"`), 'Godot の技: ' + s.id);
    for (const [id, s] of Object.entries(H.SKILLS)) assert(gh.includes(`${id} = { label = "${s.label}", labelEn = "${q(s.labelEn)}", noteEn = "${q(s.noteEn)}"`), 'Godot の能力: ' + id);
    return `${list.length}個`;
  });

  check('i18n: 騎手の架空の名前に英語の名前（主戦騎手の表の名前も）', () => {
    const b = (D.jockeys || []).filter(j => !okEn(j.nameEn)).map(j => j.name);
    assert(!b.length, b.slice(0, 10).join(', '));
    const E = D.jockeyNamesEn || {};
    const vals = v => typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).filter(x => typeof x === 'string') : [];
    const miss = [];
    for (const v of Object.values(D.historicJockeys || {})) for (const n of vals(v)) if (n !== '騎手未定' && !okEn(E[n])) miss.push(n);
    assert(!miss.length, [...new Set(miss)].slice(0, 10).join(', '));
    const en = Object.values(E);
    assert(en.length === new Set(en).size, '英語の名前が重なる');
    return `${Object.keys(E).length}人`;
  });
};
