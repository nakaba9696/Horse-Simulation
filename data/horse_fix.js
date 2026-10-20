// 史実馬・スペシャルホースの能力の見直しで、持ち主が採った値（docs/SPECIAL_AUDIT.json の adopt）。
// tools/special_audit_apply.js が書く（手で足してもよい）。js/core/datafix.js が、読み込んだ史実馬と data/legends.js の馬に上書きする。
// 書けるのは遊びの値だけ：rating（強さ）・pot（手で決めた能力）・turf/dirt（芝・ダートの向き。100＝得意）・style・distMin/distMax・skills・kire。
// 史実（生年・血統・毛色・勝ち鞍）はここで変えない。why：採った理由（見直しの一覧から写す）
(function () {
  const HS = globalThis.HS = globalThis.HS || {}; HS.DATA = HS.DATA || {};
  HS.DATA.horseFix = {
  };
})();
