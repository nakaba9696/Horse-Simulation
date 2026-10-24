// 確かめ：番組の保留の直し（持ち主の決定 2026-10-24「A7A8以外やって」。docs/review/PENDING.md の A1〜A6・A9）
// 週の決め方（1〜7日＝1週・8〜14日＝2週・15〜21日＝3週・22日〜＝4週）・2歳以上（'2+'）・東京大賞典の国際 G1・ゴールデンフリースS の年代
module.exports = function (check, assert, HS) {
  const R = HS.Races;
  const rowOf = (name, y) => HS.DATA.races.filter(r => r.name === name && r.from <= y && y <= (r.to || 9999));
  const one = (name, y) => { const rs = rowOf(name, y); assert(rs.length === 1, `${name}（${y}年）の行が ${rs.length}`); return rs[0]; };
  const wk = d => d <= 7 ? 1 : d <= 14 ? 2 : d <= 21 ? 3 : 4;

  check('racefix: 2025年の週は施行日から同じ決め方で数える（JRA・地方・海外）', () => {
    // 2025年の施行日（JRA・NAR・各主催者の結果。docs/review/RACE_SELECT_FINDINGS.md）
    const D = { 'フェブラリーステークス': [2, 23], '天皇賞（春）': [5, 4], '東京優駿': [6, 1], '安田記念': [6, 8], '宝塚記念': [6, 15], 'スプリンターズステークス': [9, 28],
      '菊花賞': [10, 26], '天皇賞（秋）': [11, 2], 'ジャパンカップ': [11, 30], '有馬記念': [12, 28], 'クイーンカップ': [2, 15], 'セントライト記念': [9, 15],
      '川崎記念': [4, 9], '東京ダービー': [6, 11], 'サウジカップ': [2, 22], 'ナンソープステークス': [8, 22], 'シティオブヨークステークス': [8, 23],
      'トラヴァーズステークス': [8, 23], 'ベルモントステークス': [6, 7], 'サンクルー大賞': [6, 29], 'ブラックキャビアライトニング': [2, 15] };
    for (const [n, [m, d]] of Object.entries(D)) { const r = one(n, 2025); assert(r.month === m && r.week === wk(d), `${n} は ${m}月${wk(d)}週（いま ${r.month}月${r.week}週）`); }
    // 別の週末の G1 が同じ週に重なるときは、早いほうの週末を前の週へ（マイルCS 11/23 と ジャパンC 11/30）
    const mcs = one('マイルチャンピオンシップ', 2025), eli = one('エリザベス女王杯', 2025);
    assert(mcs.month === 11 && mcs.week === 3 && eli.month === 11 && eli.week === 2, `マイルCS ${mcs.week}週・エリザベス女王杯 ${eli.week}週`);
    // 2024年までの行は前の週のまま
    const old = one('東京優駿', 2024); assert(old.month === 5 && old.week === 4, `2024年の日本ダービー ${old.month}月${old.week}週`);
  });

  check('racefix: ナンソープS・アベイドロンシャン賞は2歳も出られる', () => {
    for (const n of ['ナンソープステークス', 'アベイドロンシャン賞']) {
      const r = Object.assign({}, one(n, 2025), { year: 2025, graded: true });
      assert(r.age === '2+', `${n} の年齢 ${r.age}`);
      const two = { born: 2023, sex: '牡', owner: 'P', earn: 1e6 };
      assert(R.ineligibleBase(two, r, 2025) === null, `${n} に2歳が出られない（${R.ineligibleBase(two, r, 2025)}）`);
      assert(R.ineligibleBase({ born: 2024, sex: '牡', earn: 1e6 }, r, 2025) === '年齢', `${n} に1歳が出られる`);
    }
  });

  check('racefix: 東京大賞典は2011年から G1 と出す（ほかの地方は Jpn のまま）', () => {
    const b = (n, y) => R.gradeBadge(Object.assign({}, one(n, y), { year: y }));
    assert(b('東京大賞典', 2025) === 'G1', `東京大賞典 2025 ${b('東京大賞典', 2025)}`);
    assert(b('東京大賞典', 2010) === 'Jpn1', `東京大賞典 2010 ${b('東京大賞典', 2010)}`);
    assert(b('帝王賞', 2025) === 'Jpn1', `帝王賞 ${b('帝王賞', 2025)}`);
  });

  check('racefix: ゴールデンフリースSは2025年は G2・1600m、2026年から G1・1800m（2017年はベレスフォードSと取り違えない）', () => {
    const a = one('ゴールデンフリースステークス', 2025), b = one('ゴールデンフリースステークス', 2026), c = one('ゴールデンフリースステークス', 2016);
    assert(a.grade === 'G2' && a.dist === 1600, `2025 ${a.grade} ${a.dist}`);
    assert(b.grade === 'G1' && b.dist === 1800, `2026 ${b.grade} ${b.dist}`);
    assert(c.grade === 'G3', `2016 ${c.grade}`);
    const sw = (HS.DATA.historic || []).find(h => h.name === 'サクソンウォリアー');
    const ex = (HS.DATA.historicExtraWins || {})['サクソンウォリアー'] || [];
    assert(sw && !sw.wins.concat(ex).some(w => w.includes('ゴールデンフリース')), 'サクソンウォリアーに2017ゴールデンフリースSが残っている');
  });

  check('racefix: 海外の賞金は2025年の1着に寄せた（確かめたものだけ）', () => {
    const p = n => R.prizeOf(one(n, 2025), 2025);
    assert(p('ケンタッキーダービー') === 46500 && p('チェアマンズスプリントプライズ') === 24600 && p('サンタアニタハンデキャップ') === 2700, '賞金');
    assert(p('ケンタッキーオークス') === 5000, '1着が未確認のケンタッキーオークスは直さない');
  });
};
