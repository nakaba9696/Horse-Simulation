// グランドフェスティバルを開いている一族の人（data/gfhost.js）：GF の場面で出すひと言を選ぶ（出す場所だけ用意。台詞は下書き）
// 場面：wait 招待の前・invite 招待が届いた・week GF の週・kincsem 全部の GF を勝ったあと（無敗の牝馬が出てくる）。
// win・lose・allclear は、GF の結果の場面ができたら使う（GF の係と相談）。乱数は使わず、年と GF の区分から決まる。
// GF を全制覇したとき（6つの GF のトロフィーがそろったとき。HS.Season.gfAllWon。年をまたいでよく、勝った馬が別でもよい）：
//   花輪をもう一つ渡す場面で、アイテム（一族の花輪。1頭の馬からオリジナルホースを作れる数＋1。js/core/original.js）を渡す
//   （持ち主の決定 2026-10-20「生産可能数＋1はイロナのアイテム」「GF 全制覇でもらう」）。
//   印は G.owners.flags.wreath（騎手のゲームのセーブ）。場面はオーナーの場面の列（kind wreath・oid gfhost。js/ui/ownersui.js が見せる）
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
  // 花輪（アイテム）をもらったか
  F.hasItem = function () { const G = W.get(); return !!(G && G.owners && G.owners.flags && G.owners.flags.wreath); };
  F.fill = function (t, vars) {
    const J = HS.Jockey;
    vars = Object.assign({ me: J && J.me && J.me() ? J.me().name : '' }, vars || {});
    return String(t).replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : '');
  };
  // 花輪の場面の会話
  F.sceneLines = function (vars) { const d = F.data(); return d && d.lines && d.lines.wreath ? d.lines.wreath.map(t => F.fill(t, vars)) : []; };
  // 週の終わり（js/core/owners.js の O.afterWeek から）：GF の全制覇がそろったら、花輪とアイテム（前のセーブですでにそろっていれば、次の週の終わりに）
  F.afterWeek = function (rep) {
    const G = W.get(), d = F.data(), O = HS.Owners, T = HS.Season;
    if (!d || !d.item || !O || !O.on() || F.hasItem() || !T || !T.gfAllWon || !T.gfAllWon()) return;
    const s = O.state();
    s.flags.wreath = { y: G.year };
    W.news(`GF を全制覇した。${d.name}さんから${d.item.name}を受け取った（${d.item.text}）。`, 'g1');
    s.queue.push({ oid: d.id, kind: 'wreath', horse: '', race: '', reward: `${d.item.name}（${d.item.text}）`, y: G.year });
  };
})();
