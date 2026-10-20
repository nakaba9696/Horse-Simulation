// グランドフェスティバルを開いている一族の人（data/gfhost.js）：GF の場面で出すひと言を選ぶ（出す場所だけ用意。台詞は下書き）
// 場面：wait 招待の前・invite 招待が届いた・week GF の週・kincsem 全部の GF を勝ったあと（無敗の牝馬が出てくる）。
// win・lose・allclear は、GF の結果の場面ができたら使う（GF の係と相談）。乱数は使わず、年と GF の区分から決まる。
// Godot 版は godot/core/hs_gfhost.gd（同じ選び方）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, W = HS.World;
  const F = HS.GFHost = {};
  F.data = () => (HS.DATA && HS.DATA.gfHost) || null;
  F.scene = function () {
    const T = HS.Season, G = W.get();
    if (T && T.gfAllWon && T.gfAllWon()) return 'kincsem';
    if (T && T.dcPendingList && T.dcPendingList().length) return 'invite';
    if (G && G.week > 4) return 'week';
    return 'wait';
  };
  // cat：GF の区分（data/gf.js の id）。無ければ「グランドフェスティバル」
  F.line = function (scene, cat) {
    const d = F.data(); if (!d) return '';
    const set = (d.lines || {})[scene] || [];
    if (!set.length) return '';
    const G = W.get(), T = HS.Season, J = HS.Jockey;
    const t = set[U.hash(`gfhost:${scene}:${G ? G.year : 0}:${cat || ''}`) % set.length];
    const vars = { me: J && J.me && J.me() ? J.me().name : '', race: cat && T && T.gfName ? T.gfName(cat) : 'グランドフェスティバル' };
    return String(t).replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : '');
  };
})();
