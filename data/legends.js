// スペシャルホースの補い：史実馬のデータ（1955年生〜）より古い名馬。世界の暦には出さず、条件にリーチがかかったレースと、
// 倒したあとの馬の店にだけ出る（js/core/special.js）。形は data/historic_world.js と同じ。unbeaten＝無敗のまま重ねた勝ち数（条件に使う）。
// tier:'legend'＝伝説級（グランドフィナーレを勝った馬が次の年のグランドフィナーレに出ると出てくる。ほかのグループには入らない）。
// リボーは伝説級にしない：凱旋門賞の連覇という史実の顔があるので、そのグループ（凱旋門賞の連覇）で出てくる
(function(){
const HS = globalThis.HS = globalThis.HS || {}; HS.DATA = HS.DATA || {};
HS.DATA.legendsExtra = [
  { name:'エクリプス', tier:'legend', nameEn:'Eclipse', country:'英', born:1764, sex:'牡', coat:'栗毛', sire:'マースク', dam:'スピレッタ', rating:100, surface:'芝', distMin:2000, distMax:4000, style:'逃げ', growth:'普通', retire:1770, wins:[], unbeaten:18, note:'18戦18勝' },
  { name:'キンチェム', tier:'legend', nameEn:'Kincsem', country:'ハンガリー', born:1874, sex:'牝', coat:'栗毛', sire:'カンバスカン', dam:'ウォーターニンフ', rating:100, surface:'芝', distMin:1600, distMax:3200, style:'先行', growth:'普通', retire:1879, wins:['1877バーデン大賞','1878バーデン大賞','1879バーデン大賞'], unbeaten:54, note:'54戦54勝' },
  { name:'セントサイモン', tier:'legend', nameEn:'St. Simon', country:'英', born:1881, sex:'牡', coat:'黒鹿毛', sire:'ガロピン', dam:'セントアンジェラ', rating:100, surface:'芝', distMin:1600, distMax:4000, style:'先行', growth:'普通', retire:1884, wins:['1884アスコットゴールドカップ'], unbeaten:9, note:'9戦9勝' },
  { name:'オーモンド', tier:'legend', nameEn:'Ormonde', country:'英', born:1883, sex:'牡', coat:'鹿毛', sire:'ベンドア', dam:'リリーアグネス', rating:100, surface:'芝', distMin:1600, distMax:2900, style:'先行', growth:'普通', retire:1887, wins:['1886英2000ギニー','1886英ダービー','1886英セントレジャー'], unbeaten:16, note:'16戦16勝。英三冠' },
  { name:'マンノウォー', tier:'legend', nameEn:"Man o' War", country:'米', born:1917, sex:'牡', coat:'栗毛', sire:'フェアプレイ', dam:'マフバー', rating:100, surface:'ダ', distMin:1200, distMax:2400, style:'逃げ', growth:'早め', retire:1920, wins:['1920プリークネスステークス','1920ベルモントステークス'], note:'21戦20勝' },
  { name:'ファーラップ', tier:'legend', nameEn:'Phar Lap', country:'豪', born:1926, sex:'セ', coat:'栗毛', sire:'ナイトレイド', dam:'エントリーティ', rating:99, surface:'芝', distMin:1600, distMax:3200, style:'先行', growth:'普通', retire:1932, wins:['1930コックスプレート','1930メルボルンカップ','1931コックスプレート'] },
  { name:'バーラム', tier:'legend', nameEn:'Bahram', country:'英', born:1932, sex:'牡', coat:'鹿毛', sire:'ブランドフォード', dam:'フライアーズドーター', rating:99, surface:'芝', distMin:1600, distMax:2900, style:'先行', growth:'普通', retire:1935, wins:['1935英2000ギニー','1935英ダービー','1935英セントレジャー'], unbeaten:9, note:'9戦9勝。英三冠' },
  { name:'ウォーアドミラル', tier:'legend', nameEn:'War Admiral', country:'米', born:1934, sex:'牡', coat:'黒鹿毛', sire:'マンノウォー', dam:'ブラッシュアップ', rating:98, surface:'ダ', distMin:1600, distMax:2400, style:'逃げ', growth:'普通', retire:1939, wins:['1937ケンタッキーダービー','1937プリークネスステークス','1937ベルモントステークス'], note:'米三冠' },
  { name:'ネアルコ', tier:'legend', nameEn:'Nearco', country:'伊', born:1935, sex:'牡', coat:'黒鹿毛', sire:'ファロス', dam:'ノガラ', rating:99, surface:'芝', distMin:1000, distMax:3000, style:'先行', growth:'普通', retire:1938, wins:['1938パリ大賞'], unbeaten:14, note:'14戦14勝' },
  { name:'セントライト', born:1938, sex:'牡', coat:'黒鹿毛', sire:'ダイオライト', dam:'フリッパンシー', rating:96, surface:'芝', distMin:1600, distMax:3200, style:'先行', growth:'普通', retire:1941, wins:['1941皐月賞','1941東京優駿','1941菊花賞'], note:'日本で初めての三冠馬' },
  { name:'カウントフリート', tier:'legend', nameEn:'Count Fleet', country:'米', born:1940, sex:'牡', coat:'黒鹿毛', sire:'レイカウント', dam:'クイックリー', rating:99, surface:'ダ', distMin:1200, distMax:2400, style:'逃げ', growth:'早め', retire:1943, wins:['1943ケンタッキーダービー','1943プリークネスステークス','1943ベルモントステークス'], note:'米三冠' },
  { name:'クリフジ', born:1940, sex:'牝', coat:'栗毛', sire:'トウルヌソル', dam:'賢藤', rating:98, surface:'芝', distMin:1600, distMax:3200, style:'先行', growth:'普通', retire:1944, wins:['1943東京優駿','1943優駿牝馬','1943菊花賞'], unbeaten:11, jockey:'前田長吉', note:'11戦11勝。日本ダービー・オークス・菊花賞' },
  { name:'サイテーション', tier:'legend', nameEn:'Citation', country:'米', born:1945, sex:'牡', coat:'鹿毛', sire:'ブルリー', dam:'ハイドロプレーン', rating:100, surface:'ダ', distMin:1200, distMax:3200, style:'先行', growth:'普通', retire:1951, wins:['1948ケンタッキーダービー','1948プリークネスステークス','1948ベルモントステークス'], note:'米三冠' },
  { name:'トキノミノル', born:1948, sex:'牡', coat:'栗毛', sire:'セフト', dam:'第二タイランツクヰーン', rating:96, surface:'芝', distMin:1200, distMax:2400, style:'逃げ', growth:'早め', retire:1951, wins:['1951皐月賞','1951東京優駿'], unbeaten:10, jockey:'岩下密政', note:'10戦10勝。皐月賞・日本ダービー' },
  { name:'リボー', nameEn:'Ribot', country:'伊', born:1952, sex:'牡', coat:'鹿毛', sire:'テネラニ', dam:'ロマネラ', damsire:'エルグレコ', rating:100, surface:'芝', distMin:1600, distMax:3000, style:'先行', growth:'普通', retire:1956, wins:['1955凱旋門賞','1956キングジョージ6世＆クイーンエリザベスステークス','1956凱旋門賞'], unbeaten:16, jockey:'E.カミーチ', note:'16戦16勝。凱旋門賞連覇' },
  { name:'ハクチカラ', born:1953, sex:'牡', coat:'鹿毛', sire:'トビサクラ', dam:'昇城', rating:93, surface:'芝', distMin:1600, distMax:3200, style:'差し', growth:'普通', retire:1959, wins:['1956東京優駿','1957天皇賞（秋）','1957有馬記念'], jockey:'保田隆芳', note:'日本ダービー・天皇賞（秋）・有馬記念' },
];
})();
