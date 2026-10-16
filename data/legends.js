// 伝説の名馬の補い：史実馬のデータ（1955年生〜）より古い馬で、トロフィーの最後のレースに出てくる馬（js/core/trophy.js）
// 形は data/historic_world.js と同じ。世界の暦には出さず、トロフィーのレースと馬の店（倒したあと）にだけ出る
(function(){
const HS = globalThis.HS = globalThis.HS || {}; HS.DATA = HS.DATA || {};
HS.DATA.legendsExtra = [
  { name:'リボー', nameEn:'Ribot', country:'伊', born:1952, sex:'牡', coat:'鹿毛', sire:'テネラニ', dam:'ロマネラ', damsire:'エルグレコ', rating:100, surface:'芝', distMin:1600, distMax:3000, style:'先行', growth:'普通', retire:1956, wins:['1955凱旋門賞','1956キングジョージ6世＆クイーンエリザベスステークス','1956凱旋門賞'], jockey:'E.カミーチ', note:'16戦16勝。凱旋門賞連覇', text:'イタリアで走り、16戦すべてに勝った。1955年と1956年の凱旋門賞を連覇し、1956年のキングジョージ6世＆クイーンエリザベスステークスも勝った。乗ったのはE.カミーチ。' },
];
})();
