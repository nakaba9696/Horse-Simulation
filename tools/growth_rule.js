// 史実馬の成長型を、重賞の勝ち鞍の年齢から決める（持ち主の決定 2026-10-20「早熟普通晩成持続に少し種類増やして良い　超晩成とか早め普通とか」）
//   tools/build_auto.js（記録から作る馬）と tools/growth_hand.js（手で書いた馬の見直し）で使う。数と考え方は docs/BALANCE.md「成長型」
//   年齢は2通りで持つ：age＝その年の満年齢（整数）、at＝4月を0とした年齢（小数。H.ageAt と同じ物差し。3歳の皐月賞＝3.0、2歳の12月＝2.67）
const G = module.exports = {};

// その年のそのレースの月（暦から。無ければ6月とみなす）
G.monthOf = (D, race, year) => {
  const r = D.races.find(x => x.name === race && x.from <= year && year <= (x.to || 9999));
  return r ? r.month : 6;
};
G.atOf = (age, month) => age + (month - 4) / 12;

// ws：[{ age, at, year }]（重賞の勝ち鞍ひとつずつ）
G.growthOf = function (ws) {
  const ages = ws.map(w => w.age).filter(a => a != null);
  const ats = ws.map(w => w.at).filter(a => a != null);
  if (!ages.length || !ats.length) return '普通';
  const minA = Math.min(...ages), maxA = Math.max(...ages);
  const first = Math.min(...ats), last = Math.max(...ats);
  const years = new Set(ws.map(w => w.year)).size;
  // 端の型（超早熟・超晩成）は、重賞を2つ以上勝った馬だけ（1つだけでは、たまたまの1勝と見分けられない）
  const many = ws.length >= G.EDGE_WINS;
  // 2歳で重賞を勝ち、3歳の春（皐月賞・桜花賞のころ）までで勝ち鞍が終わった
  if (many && minA <= 2 && last <= G.SUPER_EARLY_LAST) return '超早熟';
  if (maxA <= 3 && minA <= 2) return '早熟';
  if (maxA <= 3) return '早め';
  // 3歳のうちに重賞を勝ち、6歳になっても勝ち、4つ以上の年で勝った
  if (first <= G.LONG_FIRST && last >= G.LONG_LAST && years >= G.LONG_YEARS) return '持続';
  // 5歳を過ぎて（6歳になって）初めて重賞を勝った
  if (many && minA >= G.SUPER_LATE_AGE) return '超晩成';
  return maxA >= 7 ? '晩成' : maxA >= 6 ? '遅め' : '普通';
};
G.SUPER_EARLY_LAST = 3.05; // 3歳の4月まで
G.LONG_FIRST = 3.75;       // 3歳の12月まで
G.LONG_LAST = 6.0;         // 6歳の4月から
G.LONG_YEARS = 4;
G.EDGE_WINS = 2;
G.SUPER_LATE_AGE = 6;      // 6歳から
