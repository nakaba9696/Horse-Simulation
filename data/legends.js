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
 // ===== 2026-10-16 に足した名馬（史実は各行の上の出典。uncertain:true は推定を含む） =====
 // uncertain：母父 Gnome のカナ（ノーム）は記事に表記が無く推定。脚質はダービーの後方待機からの見立て。
 // 出典：https://ja.wikipedia.org/wiki/クモハタ
 // 出典：https://www.ne.jp/asahi/nagi/aflo/horse/kumohata.html
 { name:'クモハタ', born:1936, sex:'牡', coat:'栗毛', sire:'トウルヌソル', dam:'星旗', damsire:'ノーム', rating:88, surface:'芝', distMin:1800, distMax:2800, style:'差し', growth:'普通', retire:1940, wins:['1939東京優駿'], note:'21戦9勝。当時の名は東京優駿競走。デビューから9日でダービーを勝った。1952〜1957年のリーディングサイアー', uncertain:true },
 // uncertain：母父 Sir Martin のカナ（サーマーチン）は推定。中央は26戦14勝で1938年に引退し、1949年に地方競馬で5戦2勝した（retire はその1949年）。
 // 出典：https://ja.wikipedia.org/wiki/ヒサトモ
 // 出典：https://www.ne.jp/asahi/nagi/aflo/horse/hisatomo.html
 { name:'ヒサトモ', born:1934, sex:'牝', coat:'鹿毛', sire:'トウルヌソル', dam:'星友', damsire:'サーマーチン', rating:90, surface:'芝', distMin:2000, distMax:3200, style:'先行', growth:'普通', retire:1949, wins:['1937東京優駿','1938天皇賞（秋）'], note:'31戦16勝。当時の名は東京優駿大競走・帝室御賞典（秋）。牝馬で初めてのダービー馬。繁殖名は久友', uncertain:true },
 // uncertain：脚質は記録から読み取れず推定。最後の目黒記念（秋）は1位入線のあと失格。
 // 出典：https://ja.wikipedia.org/wiki/スゲヌマ
 // 出典：https://www.ne.jp/asahi/nagi/aflo/horse/sugenuma.html
 { name:'スゲヌマ', born:1935, sex:'牡', coat:'黒鹿毛', sire:'プライオリーパーク', dam:'国宝', damsire:'ガロン', rating:90, surface:'芝ダ', distMin:2000, distMax:3450, style:'先行', growth:'普通', retire:1939, wins:['1938東京優駿','1939天皇賞（春）'], note:'23戦12勝。当時の名は東京優駿競走・帝室御賞典（春）（鳴尾の土3200m）。種牡馬名はカーネーシービー', uncertain:true },
 // uncertain：母父 Dress Parade のカナ（ドレスパレード）は推定。脚質は菊花賞の逃げからの見立て。
 // 出典：https://ja.wikipedia.org/wiki/マルタケ_(競走馬)
 // 出典：https://www.ne.jp/asahi/nagi/aflo/horse/marutake.html
 { name:'マルタケ', born:1936, sex:'牡', coat:'栗毛', sire:'ハクリユウ', dam:'第二サブスチチユート', damsire:'ドレスパレード', rating:90, surface:'芝ダ', distMin:1800, distMax:3200, style:'先行', growth:'普通', retire:1941, wins:['1939菊花賞','1941天皇賞（春）'], note:'20戦14勝。当時の名は京都農林省賞典四歳呼馬・帝室御賞典（春）（鳴尾の土3200m）', uncertain:true },
 // 出典：https://ja.wikipedia.org/wiki/ミナミホマレ
 { name:'ミナミホマレ', born:1939, sex:'牡', coat:'鹿毛', sire:'プリメロ', dam:'フロリスト', damsire:'ガロン', rating:88, surface:'芝', distMin:1700, distMax:2400, style:'差し', growth:'早め', retire:1942, wins:['1942東京優駿'], note:'当時の名は東京優駿競走。4戦3勝。ゴールデンウエーブ・ダイゴホマレの父' },
 // uncertain：ja.wikipedia・netkeiba・JBIS に記事・競走記録が無く、戦績・生年・毛色は「凪的電脳賽馬」の成績表、改名はミナミホマレの記事の注による。脚質は推定。
 // 出典：https://www.ne.jp/asahi/nagi/aflo/horse/arbeit-kurihikari.html
 // 出典：https://ja.wikipedia.org/wiki/ミナミホマレ （注にアルバイト → クリヒカリの改名）
 { name:'クリヒカリ', born:1939, sex:'牡', coat:'黒鹿毛', sire:'シアンモア', dam:'フリッパンシー', damsire:'フラムボヤント', rating:90, surface:'芝', distMin:1700, distMax:3200, style:'先行', growth:'普通', retire:1943, wins:['1942皐月賞','1943天皇賞（秋）'], note:'13戦9勝。1942年の秋まではアルバイトの名で走り、横浜農林省賞典四歳呼馬（皐月賞）もアルバイトとして勝った。セントライトの半弟', uncertain:true },
 // uncertain：生まれた月日は不明。戦績13戦8勝は不成立の長距離特殊競走を数えない数（成績表は14行）。
 // 出典：https://ja.wikipedia.org/wiki/カイソウ
 { name:'カイソウ', born:1941, sex:'牡', coat:'栗毛', sire:'月友', dam:'第二ベバウ', damsire:'ペリオン', rating:88, surface:'芝', distMin:1600, distMax:2400, style:'先行', growth:'早め', retire:1944, wins:['1944東京優駿'], note:'13戦8勝。当時は無観客・馬券なしの東京能力検定競走。サラブレッド系種。長距離特殊競走（菊花賞にあたる）は1位入線のあと競走不成立', uncertain:true },
 // uncertain：ja.wikipedia に記事が無い。戦績は「凪的電脳賽馬」の成績表、生年月日（1943年5月2日）・毛色・母は JBIS、母父は JBIS の5代血統表。脚質は推定。
 // 出典：https://www.ne.jp/asahi/nagi/aflo/horse/katsufuji.html
 // 出典：https://www.jbis.or.jp/horse/0000333087/
 { name:'カツフジ', born:1943, sex:'牡', coat:'鹿毛', sire:'クモハタ', dam:'第六ホイスリングパイン', damsire:'ステーツマン', rating:88, surface:'芝', distMin:1600, distMax:3200, style:'先行', growth:'普通', retire:1949, wins:['1948天皇賞（秋）','1949京都記念'], note:'京都記念は秋の回。48戦25勝。クモハタの2年目の産駒', uncertain:true },
 // 出典：https://ja.wikipedia.org/wiki/トキツカゼ
 { name:'トキツカゼ', born:1944, sex:'牝', coat:'鹿毛', sire:'プリメロ', dam:'第五マンナ', damsire:'シアンモア', rating:90, surface:'芝', distMin:800, distMax:2600, style:'先行', growth:'普通', retire:1949, wins:['1947皐月賞','1947優駿牝馬','1947カブトヤマ記念'], note:'30戦11勝。皐月賞は当時の名で農林省賞典。オートキツ・オンワードゼアの母。1984年に顕彰馬' },
 // uncertain：ja.wikipedia・JBIS に記事・記録が無く、戦績・生年・毛色・血統は「凪的電脳賽馬」の成績表と血統表だけで確かめた。生年月日は不明。脚質は推定。
 // 出典：https://www.ne.jp/asahi/nagi/aflo/horse/browny.html
 // 出典：https://ja.wikipedia.org/wiki/トキツカゼ （カブトヤマ記念でブラウニーを退けた）
 { name:'ブラウニー', born:1944, sex:'牝', coat:'鹿毛', sire:'トキノチカラ', dam:'千鳥甲', damsire:'カブトヤマ', rating:90, surface:'芝', distMin:1600, distMax:3000, style:'先行', growth:'早め', retire:1947, wins:['1947桜花賞','1947菊花賞'], note:'16戦6勝。菊花賞は当時の名で農林省賞典四歳馬。サラブレッド系種。母の競走名はメイレキ', uncertain:true },
 // uncertain：脚質は記録から読み取れず推定。3歳の札幌でダート1200mを2勝（surface を芝ダとした）。
 // 出典：https://ja.wikipedia.org/wiki/ミハルオー
 // 出典：https://www.ne.jp/asahi/nagi/aflo/horse/miharu_o.html
 { name:'ミハルオー', born:1945, sex:'牡', coat:'栗毛', sire:'月友', dam:'第参フラッシングラス', damsire:'プリメロ', rating:90, surface:'芝ダ', distMin:1000, distMax:3200, style:'先行', growth:'普通', retire:1949, wins:['1948東京優駿','1949天皇賞（春）'], note:'当時の名は優駿競走。19戦13勝', uncertain:true },
 // uncertain：ja.wikipedia の記事は短く出典の明記が無い。戦績は「凪的電脳賽馬」の成績表、生年月日は JBIS。脚質は推定。
 // 出典：https://www.ne.jp/asahi/nagi/aflo/horse/new_ford.html
 // 出典：https://ja.wikipedia.org/wiki/ニユーフオード
 { name:'ニユーフオード', born:1945, sex:'牡', coat:'栗毛', sire:'クモハタ', dam:'アスシービー', damsire:'アスフオード', rating:90, surface:'芝', distMin:1000, distMax:3200, style:'先行', growth:'普通', retire:1950, wins:['1948菊花賞','1949天皇賞（秋）'], note:'40戦12勝', uncertain:true },
 // uncertain：1948年の三歳ステークス（東京）・1950年の金盃（阪神）を勝ったが、いまのどのレースにあたるか確かめられず wins に入れていない。
 // 出典：https://ja.wikipedia.org/wiki/トサミドリ
 { name:'トサミドリ', born:1946, sex:'牡', coat:'鹿毛', sire:'プリメロ', dam:'フリッパンシー', damsire:'フラムボヤント', rating:90, surface:'芝ダ', distMin:1000, distMax:3000, style:'逃げ', growth:'普通', retire:1951, wins:['1949皐月賞','1949菊花賞','1949セントライト記念','1950札幌記念','1951東京新聞杯'], note:'東京新聞杯は当時の名で東京盃。セントライトの半弟。31戦21勝・レコード勝ち10回。1984年に顕彰馬', uncertain:true },
 // uncertain：ja.wikipedia の記事は出典の明記が無く、戦績は「凪的電脳賽馬」の成績表で照らした。脚質は推定。
 // 出典：https://ja.wikipedia.org/wiki/ヤシマドオター
 // 出典：https://www.ne.jp/asahi/nagi/aflo/horse/yashima_doughter.html
 { name:'ヤシマドオター', born:1946, sex:'牝', coat:'鹿毛', sire:'クモハタ', dam:'第二スターリングモア', damsire:'セフト', rating:90, surface:'芝', distMin:1000, distMax:3200, style:'先行', growth:'普通', retire:1950, wins:['1949桜花賞','1950天皇賞（秋）','1950中山記念'], note:'中山記念は秋の回（3200m）。28戦12勝', uncertain:true },
 // 出典：https://ja.wikipedia.org/wiki/クモノハナ
 { name:'クモノハナ', born:1947, sex:'牡', coat:'黒鹿毛', sire:'プリメロ', dam:'第参マンナ', damsire:'シアンモア', rating:90, surface:'芝', distMin:1600, distMax:2400, style:'先行', growth:'普通', retire:1951, wins:['1950皐月賞','1950東京優駿'], note:'28戦9勝。皐月賞と日本ダービーの二冠。菊花賞はアタマ差2着。小岩井農場の最後のダービー馬' },
 // uncertain：脚質は記録から読み取れず推定。
 // 出典：https://ja.wikipedia.org/wiki/イツセイ
 { name:'イツセイ', born:1948, sex:'牡', coat:'栗毛', sire:'セフト', dam:'レボアモンド', damsire:'レイモンド', rating:88, surface:'芝', distMin:1000, distMax:2000, style:'先行', growth:'普通', retire:1952, wins:['1951安田記念','1951カブトヤマ記念'], note:'32戦21勝。安田記念は当時の名で安田賞（第1回）。朝日杯・皐月賞・ダービーはどれもトキノミノルの2着', uncertain:true },
 // uncertain：母父は血統名が第六シアンモア、競走名がオオツカヤマ（ja.wikipedia のリンク先）。どちらで書くか要確認。1952年の阪神記念（芝2400m）も勝ったが、いまのどのレースにあたるか確かめられず wins に入れていない。脚質は推定。
 // 出典：https://ja.wikipedia.org/wiki/トラツクオー
 { name:'トラツクオー', born:1948, sex:'牡', coat:'黒鹿毛', sire:'レイモンド', dam:'大霹', damsire:'オオツカヤマ', rating:90, surface:'芝ダ', distMin:1000, distMax:3200, style:'先行', growth:'普通', retire:1953, wins:['1951菊花賞','1951鳴尾記念','1952函館記念','1952天皇賞（秋）','1953京都金杯','1953毎日王冠'], note:'75戦28勝。はじめて賞金1000万円を超えた馬。鳴尾記念は秋の回、京都金杯は当時の名で金杯（京都）', uncertain:true },
 // 出典：https://ja.wikipedia.org/wiki/クリノハナ
 // 出典：https://www.jbis.or.jp/horse/0000000871/
 { name:'クリノハナ', born:1949, sex:'牡', coat:'栗毛', sire:'プリメロ', dam:'オホヒカリ', damsire:'月友', rating:90, surface:'芝', distMin:1200, distMax:2400, style:'差し', growth:'早め', retire:1952, wins:['1952皐月賞','1952東京優駿'], note:'11戦5勝。デビューから77日で皐月賞・日本ダービーの二冠' },
 // 脚質は記録からの見立て。通算51戦27勝は地方の分に資料の欠けがある（中央は35戦18勝）。
 // 出典：https://ja.wikipedia.org/wiki/スウヰイスー
 // 出典：https://www.jbis.or.jp/horse/0000000780/
 { name:'スウヰイスー', born:1949, sex:'牝', coat:'栗毛', sire:'セフト', dam:'武兆', damsire:'月友', rating:94, surface:'芝ダ', distMin:1000, distMax:2400, style:'先行', growth:'普通', retire:1955, wins:['1952桜花賞','1952優駿牝馬','1952安田記念','1953安田記念'], note:'51戦27勝。初の牝馬二冠（桜花賞・優駿牝馬）。安田記念は当時「安田賞」。1953年から大井へ移った', uncertain:true },
 // 脚質は推定。distMin は重賞の勝ち鞍（鳴尾記念1800m）から。鳴尾記念は1952年が秋、1953年が春の施行。母名は JBIS・血統表の「第一シユリリー」（記事本文は「第一シュリリー」）。
 // 出典：https://ja.wikipedia.org/wiki/クインナルビー
 // 出典：https://www.jbis.or.jp/horse/0000000732/
 { name:'クインナルビー', born:1949, sex:'牝', coat:'栗毛', sire:'クモハタ', dam:'第一シユリリー', damsire:'レヴユーオーダー', rating:88, surface:'芝', distMin:1800, distMax:3200, style:'先行', growth:'普通', retire:1954, wins:['1952鳴尾記念','1953阪神記念','1953鳴尾記念','1953天皇賞（秋）'], note:'44戦17勝。1953年の天皇賞（秋）をレコードで勝った牝馬。オグリキャップの牝系の祖', uncertain:true },
 // 脚質は推定。ダートの勝ちは札幌Sダ1200m・中京記念（砂1800m）。distMin はデビュー戦（芝800m）から。
 // 出典：https://ja.wikipedia.org/wiki/レダ_(競走馬)
 // 出典：https://www.jbis.or.jp/horse/0000000877/
 { name:'レダ', born:1949, sex:'牝', coat:'鹿毛', sire:'ステーツマン', dam:'第弐パラダイスロスト', damsire:'ハクリユウ', rating:88, surface:'芝ダ', distMin:800, distMax:3200, style:'先行', growth:'普通', retire:1953, wins:['1953天皇賞（春）','1953中京記念','1953京都記念（秋）'], note:'29戦17勝。天皇賞（春）を勝った唯一の牝馬。中京記念は当時「中京開設記念」', uncertain:true },
 // ja.wikipedia に記事が無い。生年・毛色・血統・戦績・勝ち鞍は JBIS と netkeiba、各競走の歴代優勝馬表による。脚質は推定。
 // 出典：https://www.jbis.or.jp/horse/0000000749/
 // 出典：https://db.netkeiba.com/horse/000a00293d/
 { name:'タカハタ', born:1949, sex:'牝', coat:'栗毛', sire:'クモハタ', dam:'アートフルノ五', damsire:'セフト', rating:88, surface:'芝', distMin:1100, distMax:3200, style:'先行', growth:'普通', retire:1954, wins:['1951朝日杯3歳ステークス','1953ダイヤモンドステークス','1953目黒記念（春）','1953日本経済賞'], note:'44戦26勝。皐月賞・日本ダービー・優駿牝馬ですべて2着', uncertain:true },
 // 出典：https://ja.wikipedia.org/wiki/ハクリヨウ
 // 出典：https://www.jbis.or.jp/horse/0000001199/
 { name:'ハクリヨウ', born:1950, sex:'牡', coat:'鹿毛', sire:'プリメロ', dam:'第四バツカナムビユーチー', damsire:'ダイオライト', rating:90, surface:'芝', distMin:1800, distMax:3200, style:'先行', growth:'普通', retire:1955, wins:['1953カブトヤマ記念','1953菊花賞','1954東京杯','1954天皇賞（春）','1954毎日王冠','1955金杯','1955目黒記念（春）'], note:'25戦16勝。初代の年度代表馬（1954年）。菊花賞でボストニアンの三冠を阻んだ' },
 // 鳴尾記念は1953年12月（秋）の施行。ja.wikipedia の本文は「1954年」とするが、鳴尾記念の歴代優勝馬表と JBIS は1953年12月27日。
 // 出典：https://ja.wikipedia.org/wiki/ボストニアン_(1950年生の競走馬)
 // 出典：https://www.jbis.or.jp/horse/0000001197/
 { name:'ボストニアン', born:1950, sex:'牡', coat:'栗毛', sire:'セフト', dam:'神正', damsire:'ダイオライト', rating:90, surface:'芝', distMin:1600, distMax:2400, style:'差し', growth:'普通', retire:1954, wins:['1953皐月賞','1953NHK杯','1953東京優駿','1953鳴尾記念','1954阪神記念'], note:'28戦16勝。皐月賞・日本ダービーの二冠。菊花賞はハクリヨウの2着' },
 // distMin は推定（1953年の勝ち鞍の距離が確かめられない）。戦績は ja.wikipedia（『優駿』2000年3月号）の29戦23勝。JBIS は1953年の分が無く21戦15勝。
 // 出典：https://ja.wikipedia.org/wiki/ダイナナホウシユウ
 // 出典：https://www.jbis.or.jp/horse/0000001534/
 { name:'ダイナナホウシユウ', born:1951, sex:'牡', coat:'鹿毛', sire:'シーマー', dam:'白玲', damsire:'レヴユーオーダー', rating:92, surface:'芝', distMin:1200, distMax:3200, style:'逃げ', growth:'普通', retire:1956, wins:['1954皐月賞','1954神戸杯','1954菊花賞','1955京都記念（秋）','1955天皇賞（秋）','1956阪神大賞典'], note:'29戦23勝。デビューから11連勝。「褐色の弾丸列車」。1953年は「タマサン」の名で走った', uncertain:true },
 // 戦績は ja.wikipedia の64戦31勝（中央46戦27勝・地方18戦4勝）。JBIS は1953年の分が無く中央35戦19勝。retire は地方での最後の年（7歳＝1957年）の見立て。
 // 出典：https://ja.wikipedia.org/wiki/タカオー
 // 出典：https://www.jbis.or.jp/horse/0000001536/
 { name:'タカオー', born:1951, sex:'牡', coat:'鹿毛', sire:'シーマー', dam:'タカマサ', damsire:'クモハタ', rating:90, surface:'芝', distMin:1100, distMax:3200, style:'先行', growth:'普通', retire:1957, wins:['1953朝日杯3歳ステークス','1954スプリングステークス','1954NHK杯','1954函館記念','1955天皇賞（春）','1955東京杯'], note:'64戦31勝。11連勝。「走る精密器械」。1955年に南関東へ移った', uncertain:true },
 // ja.wikipedia に記事が無い。生年・毛色・血統・戦績は JBIS と netkeiba。脚質と distMin・distMax（重賞の勝ち鞍とJBISの特別戦）は推定を含む。
 // 出典：https://www.jbis.or.jp/horse/0000001593/
 // 出典：https://ja.wikipedia.org/wiki/メイヂヒカリ （オールカマーの記述）
 { name:'ヤマイチ', born:1951, sex:'牝', coat:'栗毛', sire:'トシシロ', dam:'年藤', damsire:'トウルヌソル', rating:90, surface:'芝', distMin:1600, distMax:2400, style:'先行', growth:'普通', retire:1955, wins:['1954桜花賞','1954優駿牝馬'], note:'29戦5勝。桜花賞・優駿牝馬の二冠', uncertain:true },
 // 脚質・distMin は推定（重賞以外の勝ち鞍の距離が確かめられない）。
 // 出典：https://ja.wikipedia.org/wiki/オートキツ
 // 出典：https://www.jbis.or.jp/horse/0000002030/
 { name:'オートキツ', born:1952, sex:'牡', coat:'栃栗毛', sire:'月友', dam:'トキツカゼ', damsire:'プリメロ', rating:88, surface:'芝', distMin:1600, distMax:2500, style:'先行', growth:'普通', retire:1956, wins:['1955東京優駿','1956ダイヤモンドステークス','1956東京杯'], note:'22戦14勝。日本中央競馬会になって最初のダービー馬。8馬身差。1955年の年度代表馬', uncertain:true },
 // ja.wikipedia に記事が無い。生年・毛色・血統・戦績は JBIS と netkeiba。脚質と distMin は推定。
 // 出典：https://www.jbis.or.jp/horse/0000002128/
 // 出典：https://ja.wikipedia.org/wiki/メイヂヒカリ （朝日盃・オールカマーの記述）
 { name:'ケゴン', born:1952, sex:'牡', coat:'栗毛', sire:'プリメロ', dam:'オーマツカゼ', damsire:'ダイオライト', rating:88, surface:'芝', distMin:1100, distMax:2000, style:'先行', growth:'普通', retire:1956, wins:['1955皐月賞'], note:'22戦5勝。1955年の皐月賞馬。朝日杯3歳ステークス2着、日本ダービー3着', uncertain:true },
 // 出典：https://ja.wikipedia.org/wiki/メイヂヒカリ
 // 出典：https://www.jbis.or.jp/horse/0000002195/
 { name:'メイヂヒカリ', born:1952, sex:'牡', coat:'鹿毛', sire:'クモハタ', dam:'シラハタ', damsire:'プリメロ', rating:94, surface:'芝', distMin:1100, distMax:3200, style:'先行', growth:'普通', retire:1956, wins:['1954朝日杯3歳ステークス','1955オールカマー','1955菊花賞','1956天皇賞（春）','1956有馬記念'], note:'21戦16勝。第1回中山グランプリ（有馬記念）の勝ち馬。1956年の年度代表馬。顕彰馬' },
 // 出典：https://ja.wikipedia.org/wiki/キタノオー
 // 出典：https://www.jbis.or.jp/horse/0000002806/
 { name:'キタノオー', born:1953, sex:'牡', coat:'鹿毛', sire:'トサミドリ', dam:'バウアーヌソル', damsire:'トウルヌソル', rating:92, surface:'芝', distMin:1100, distMax:3200, style:'先行', growth:'普通', retire:1958, wins:['1955朝日杯3歳ステークス','1956スプリングステークス','1956NHK杯','1956セントライト記念','1956菊花賞','1957天皇賞（春）','1957オールカマー'], note:'29戦16勝。サラブレッド系種。菊花賞・天皇賞（春）。ハクチカラとの対戦は6勝4敗' },
 // 毛色は JBIS の「栗毛」。ja.wikipedia は「鹿毛」としている。戦績は中央31戦11勝・米国3戦0勝・地方5戦2勝を合わせた。retire は地方を走った1963年（中央・米国の最後は1960年）。
 // 出典：https://ja.wikipedia.org/wiki/オンワードゼア
 // 出典：https://www.jbis.or.jp/horse/0000003331/
 { name:'オンワードゼア', born:1954, sex:'牡', coat:'栗毛', sire:'マルゼア', dam:'トキツカゼ', damsire:'プリメロ', rating:90, surface:'芝', distMin:1800, distMax:3200, style:'先行', growth:'普通', retire:1963, wins:['1957ラジオNIKKEI賞','1957函館記念','1958金杯','1958天皇賞（春）','1958日本経済賞','1958有馬記念'], note:'39戦13勝。1958年の年度代表馬。ラジオNIKKEI賞は当時「中山4歳ステークス」。1959〜1960年に米国へ遠征し、1963年に「オンワードケイ」の名で北海道の地方競馬を走った', uncertain:true },
 // 父 Bois Roussel のカナは ja.wikipedia では「ボワルセル」。このリポジトリの種牡馬データの表記「ボワルーセル」に合わせた。
 // 出典：https://ja.wikipedia.org/wiki/ヒカルメイジ
 // 出典：https://www.jbis.or.jp/horse/0000003337/
 { name:'ヒカルメイジ', born:1954, sex:'牡', coat:'黒鹿毛', sire:'ボワルーセル', dam:'イサベリーン', damsire:'キャノンロー', rating:88, surface:'芝', distMin:1100, distMax:2400, style:'差し', growth:'普通', retire:1958, wins:['1957スプリングステークス','1957NHK杯','1957東京優駿'], note:'15戦9勝。持込馬で初めてのダービー馬。半弟コマツヒカリもダービー馬' },
 // 母父 Bobsleigh のカナは ja.wikipedia の「ボブスレー」。持込馬。
 // 出典：https://ja.wikipedia.org/wiki/ミスオンワード
 // 出典：https://www.jbis.or.jp/horse/0000003226/
 { name:'ミスオンワード', born:1954, sex:'牝', coat:'鹿毛', sire:'ハードソース', dam:'ホールドタイト', damsire:'ボブスレー', rating:90, surface:'芝', distMin:1200, distMax:2500, style:'先行', growth:'普通', retire:1958, wins:['1956阪神3歳ステークス','1957桜花賞','1957優駿牝馬','1957神戸杯','1958目黒記念（秋）'], note:'28戦14勝。無敗（8戦8勝）で桜花賞・優駿牝馬の二冠。阪神3歳ステークスはこの年京都で施行' },
 // 脚質は推定。retire は JBIS にある最後の記録（1953年2月の川崎記念2着）の年で、それより後に走ったかは確かめられない。通算84戦23勝は ja.wikipedia の値（中央は18戦6勝）。
 // 出典：https://ja.wikipedia.org/wiki/キヨフジ
 // 出典：https://www.jbis.or.jp/horse/0000000476/
 { name:'キヨフジ', local:'川崎', born:1948, sex:'牝', coat:'栗毛', sire:'クモハタ', dam:'リガーユートピア', damsire:'ミラクルユートピア', rating:88, surface:'芝ダ', distMin:1600, distMax:2600, style:'先行', growth:'普通', retire:1953, wins:['1951優駿牝馬'], note:'84戦23勝。地方競馬（川崎）の出身で初めて優駿牝馬を勝った。地方へ戻って開設記念（のちの川崎記念）も勝った', uncertain:true },
 // 出典：https://ja.wikipedia.org/wiki/ゴールデンウエーブ
 // 出典：https://www.jbis.or.jp/horse/0000001577/
 { name:'ゴールデンウエーブ', local:'大井', born:1951, sex:'牡', coat:'黒鹿毛', sire:'ミナミホマレ', dam:'ユウコ', damsire:'レイモンド', rating:88, surface:'芝ダ', distMin:1400, distMax:2400, style:'差し', growth:'普通', retire:1956, wins:['1954東京優駿','1954ラジオNIKKEI賞'], note:'37戦16勝。地方競馬出身で初めてのダービー馬。大井では「ネンタカラ」の名で全日本三才優駿（いまの全日本2歳優駿）を勝った。ラジオNIKKEI賞は当時「中山4歳ステークス」' },
 // distMin はデビュー戦（ダート1000m）、distMax はベルモントステークス（1.5マイル）から
 // 出典：https://ja.wikipedia.org/wiki/ネイティヴダンサー
 // 出典：https://en.wikipedia.org/wiki/Native_Dancer
 { name:'ネイティヴダンサー', nameEn:'Native Dancer', country:'米', born:1950, sex:'牡', coat:'芦毛', sire:'ポリネシアン', dam:'ゲイシャ', damsire:'ディスカヴァリー', rating:90, surface:'ダ', distMin:1000, distMax:2400, style:'先行', growth:'普通', retire:1954, wins:['1953プリークネスステークス','1953ベルモントステークス','1953トラヴァーズステークス'], note:'22戦21勝。唯一の負けは1953年ケンタッキーダービー2着。ほかにフューチュリティステークス・ウッドメモリアル・メトロポリタンハンデキャップ' },
 // style は推定（記録から脚質が確かめられなかった）。dam は ja.wikipedia 本文の「シリーン」（Selene）。リポジトリの data/stallions.js は「セレーネ」と書いている
 // プリンスオブウェールズステークスは当時3歳の競走（en.wikipedia の勝ち鞍の一覧が現在の同名競走の記事につないでいる）
 // 出典：https://ja.wikipedia.org/wiki/ハイペリオン_(競走馬)
 // 出典：https://en.wikipedia.org/wiki/Hyperion_(horse)
 { name:'ハイペリオン', nameEn:'Hyperion', country:'英', born:1930, sex:'牡', coat:'栗毛', sire:'ゲインズバラ', dam:'シリーン', damsire:'チョーサー', rating:90, surface:'芝', distMin:1000, distMax:2900, style:'先行', growth:'普通', retire:1934, wins:['1933プリンスオブウェールズステークス','1933英ダービー','1933英セントレジャー'], note:'13戦9勝。英ダービー・英セントレジャー。ほかにデューハーストステークス・チェスターヴァーズ。英リーディングサイアー6回', uncertain:true },
 // distMin は初勝利のナラガンセットパーク5ハロン、distMax はサンタアニタハンデキャップ（1.25マイル）から
 // 出典：https://ja.wikipedia.org/wiki/シービスケット
 // 出典：https://en.wikipedia.org/wiki/Seabiscuit
 { name:'シービスケット', nameEn:'Seabiscuit', country:'米', born:1933, sex:'牡', coat:'鹿毛', sire:'ハードタック', dam:'スウィングオン', damsire:'ウィスクブルーム', rating:86, surface:'ダ', distMin:1000, distMax:2000, style:'先行', growth:'普通', retire:1940, wins:['1938ハリウッドゴールドカップ','1940サンタアニタハンデキャップ'], note:'89戦33勝。1938年ピムリコスペシャルで三冠馬ウォーアドミラルとのマッチレースに4馬身差で勝った。1938年年度代表馬' },
 // 勝ったレースは2歳戦だけで、data/races_world.js に無いので wins は空にし note に書いた。最後に走ったのは1913年（1914年に調教中の故障で引退）
 // 出典：https://ja.wikipedia.org/wiki/ザテトラーク
 // 出典：https://en.wikipedia.org/wiki/The_Tetrarch
 { name:'ザテトラーク', nameEn:'The Tetrarch', country:'英', born:1911, sex:'牡', coat:'芦毛', sire:'ロアエロド', dam:'ヴァーレン', damsire:'ボナヴィスタ', rating:86, surface:'芝', distMin:1000, distMax:1200, style:'逃げ', growth:'早め', retire:1913, wins:[], unbeaten:7, tier:'legend', note:'7戦7勝（すべて2歳時）。コヴェントリーステークス・ナショナルブリーダーズプロデュースステークス・シャンペンステークスなど。アイルランド生産、英国で調教' },
 // 勝ったレースが data/races_world.js に無いので wins は空にし note に書いた。2歳時の9戦にはドビンスとのマッチレースの同着を含む
 // 出典：https://ja.wikipedia.org/wiki/ドミノ_(競走馬)
 // 出典：https://en.wikipedia.org/wiki/Domino_(horse)
 { name:'ドミノ', nameEn:'Domino', country:'米', born:1891, sex:'牡', coat:'黒鹿毛', sire:'ヒムヤー', dam:'マニーグレイ', damsire:'エンクワイアラー', rating:86, surface:'ダ', distMin:1000, distMax:1600, style:'逃げ', growth:'普通', retire:1895, wins:[], tier:'legend', note:'25戦19勝。フューチュリティステークス・メイトロンステークス・ウィザーズステークスなど。2歳時9戦無敗。1893年年度代表馬（後年の選定）' },
 // distMin は推定（2歳時の勝ち鞍の距離を確かめられず、ブリーダーズフューチュリティ＝当時7ハロン184フィートから）。distMax は1959年マンハッタンハンデキャップ（1と5/8マイル）。style も推定
 // damsire のカナ「サーコスモ」は ja.wikipedia に記事が無く、リポジトリの data/stallions_old.js の表記に合わせた
 // 出典：https://ja.wikipedia.org/wiki/ラウンドテーブル_(競走馬)
 // 出典：https://en.wikipedia.org/wiki/Round_Table_(horse)
 { name:'ラウンドテーブル', nameEn:'Round Table', country:'米', born:1954, sex:'牡', coat:'鹿毛', sire:'プリンスキロ', dam:'ナイツドーター', damsire:'サーコスモ', rating:86, surface:'芝ダ', distMin:1400, distMax:2600, style:'先行', growth:'普通', retire:1959, wins:['1957ハリウッドゴールドカップ','1958サンタアニタハンデキャップ'], note:'66戦43勝。芝とダートで走り、1958年年度代表馬。最優秀芝馬3回。ほかにブルーグラスステークス・アメリカンダービー・ユナイテッドネイションズハンデキャップ', uncertain:true },
 // dam のカナ「ミスグラディエーター」は推定（ja.wikipedia では英字の Miss Gladiator のまま）。damsire は ja.wikipedia の仮リンク「グラディエーター (競走馬)」
 // distMin は2000ギニー（1マイル）から。2歳時の勝ち鞍（クリアウェルステークス）の距離は確かめられなかった。distMax はアスコットゴールドカップ（2.5マイル）
 // '1865ロワイヤルオーク賞' は ja.wikipedia の「プランスアンペアル大賞典（後のロワイヤルオーク賞）」から
 // 出典：https://ja.wikipedia.org/wiki/グラディアトゥール
 // 出典：https://en.wikipedia.org/wiki/Gladiateur
 { name:'グラディアトゥール', nameEn:'Gladiateur', country:'英', born:1862, sex:'牡', coat:'黒鹿毛', sire:'モナルク', dam:'ミスグラディエーター', damsire:'グラディエーター', rating:96, surface:'芝', distMin:1600, distMax:4000, style:'追込', growth:'普通', retire:1866, wins:['1865英2000ギニー','1865英ダービー','1865パリ大賞','1865英セントレジャー','1865ロワイヤルオーク賞','1866アスコットゴールドカップ'], note:'19戦16勝。フランス生産で英国で調教。フランス産馬として初めての英三冠。ロワイヤルオーク賞は当時プランスアンペリアル大賞', uncertain:true },
 // distMin は推定（2歳時のジュライステークスの当時の距離を確かめられなかった）。style も推定（マッチレースで後ろから差した記録から）
 // 出典：https://ja.wikipedia.org/wiki/ザフライングダッチマン
 // 出典：https://en.wikipedia.org/wiki/The_Flying_Dutchman_(horse)
 { name:'ザフライングダッチマン', nameEn:'The Flying Dutchman', country:'英', born:1846, sex:'牡', coat:'黒鹿毛', sire:'ベイミドルトン', dam:'バーベル', damsire:'サンドベック', rating:92, surface:'芝', distMin:1000, distMax:4000, style:'差し', growth:'普通', retire:1851, wins:['1849英ダービー','1849英セントレジャー','1850アスコットゴールドカップ'], note:'16戦15勝。唯一の負けは1850年ドンカスターカップ（ヴォルティジュールの2着）。1851年のマッチレースで雪辱。アスコットゴールドカップは当時の大ロシア皇帝陛下プレート', uncertain:true },
 // style は推定（逃げ切りと追い込みの両方の記録がある）。distMax は1905年ジョッキークラブカップ（18ハロン）から
 // 出典：https://ja.wikipedia.org/wiki/プリティーポリー
 // 出典：https://en.wikipedia.org/wiki/Pretty_Polly_(horse)
 { name:'プリティーポリー', nameEn:'Pretty Polly', country:'英', born:1901, sex:'牝', coat:'栗毛', sire:'ガリニュール', dam:'アドミレイション', damsire:'サラバンド', rating:92, surface:'芝', distMin:1000, distMax:3600, style:'先行', growth:'普通', retire:1906, wins:['1904英1000ギニー','1904英オークス','1904ナッソーステークス','1904英セントレジャー','1905コロネーションカップ','1905英チャンピオンステークス','1906コロネーションカップ'], note:'24戦22勝。英牝馬三冠。デビューから15連勝。アイルランド生産、英国で調教', uncertain:true },
 // style は推定（記録から脚質が確かめられなかった）。distMin は2歳時のニューステークス（5ハロン）、distMax はアスコットゴールドカップ（2.5マイル）
 // プリンスオブウェールズステークスは当時3歳の競走（en.wikipedia の勝ち鞍の一覧が現在の同名競走の記事につないでいる）
 // 出典：https://ja.wikipedia.org/wiki/バヤルド_(競走馬)
 // 出典：https://en.wikipedia.org/wiki/Bayardo_(horse)
 { name:'バヤルド', nameEn:'Bayardo', country:'英', born:1906, sex:'牡', coat:'鹿毛', sire:'ベイロナルド', dam:'ガリカ', damsire:'ガロピン', rating:90, surface:'芝', distMin:1000, distMax:4000, style:'差し', growth:'普通', retire:1910, wins:['1909プリンスオブウェールズステークス','1909エクリプスステークス','1909英セントレジャー','1909英チャンピオンステークス','1910アスコットゴールドカップ'], note:'25戦22勝。2歳時7戦全勝、3歳夏から15連勝。英リーディングサイアー2回（1917・1918年）。ゲインズバラ・ゲイクルセイダーの父', uncertain:true },
 // uncertain：毛色は en.wikipedia が鹿毛（Bay）、Thoroughbred Heritage が黒鹿毛（br.）で食い違う。脚質は記録から決められず推定。
 // 生産はアイルランドの国営牧場、調教は英国（country は調教国の英）。カナ（クラレンス・ディリジェンス）は ja.wikipedia に記事が無く推定。
 // 出典：https://en.wikipedia.org/wiki/Sun_Chariot_(horse) ・ http://www.tbheritage.com/Portraits/Hyperion.html
 { name:'サンチャリオット', nameEn:'Sun Chariot', country:'英', born:1939, sex:'牝', coat:'鹿毛', sire:'ハイペリオン', dam:'クラレンス', damsire:'ディリジェンス', rating:92, surface:'芝', distMin:1000, distMax:2900, style:'先行', growth:'早め', retire:1942, wins:['1942英1000ギニー','1942英オークス','1942英セントレジャー'], note:'9戦8勝。英国の牝馬三冠。戦時中で3競走ともニューマーケットで行われた。2歳でクイーンメアリーステークス・ミドルパークステークス', uncertain:true },
 // 母父 Sansovino のカナ「サンソヴィーノ」は推定（ja.wikipedia に記事なし）。data/stallions.js の 'サンソネット':[null,'レディジューラー'] は父が空。
 // 出典：https://ja.wikipedia.org/wiki/テューダーミンストレル ・ https://en.wikipedia.org/wiki/Tudor_Minstrel
 { name:'テューダーミンストレル', nameEn:'Tudor Minstrel', country:'英', born:1944, sex:'牡', coat:'黒鹿毛', sire:'オーエンテューダー', dam:'サンソネット', damsire:'サンソヴィーノ', rating:88, surface:'芝', distMin:1000, distMax:1600, style:'先行', growth:'早め', retire:1947, wins:['1947英2000ギニー','1947セントジェームズパレスステークス','1947クイーンエリザベス2世ステークス'], note:'10戦8勝。英2000ギニーを8馬身差。1947年のクイーンエリザベス2世ステークスは前身のナイツロイヤルステークス。英ダービー4着' },
 // uncertain：脚質は凱旋門賞（残り300mで先頭）と英オークス（逃げて2着）で違い、推定。
 // 出典：https://en.wikipedia.org/wiki/Coronation_(French_horse) ・ https://ja.wikipedia.org/wiki/コロネーション_(1946年生の競走馬)
 { name:'コロネーション', nameEn:'Coronation', country:'仏', born:1946, sex:'牝', coat:'鹿毛', sire:'ジェベル', dam:'エスメラルダ', damsire:'トウルビヨン', rating:88, surface:'芝', distMin:1000, distMax:2400, style:'差し', growth:'普通', retire:1950, wins:['1949仏1000ギニー','1949凱旋門賞'], note:'13戦6勝。英国では Coronation V の名で走った。仏1000ギニーは1着同着。2歳でクイーンメアリーステークス・ロベールパパン賞。父母ともトウルビヨンの仔', uncertain:true },
 // uncertain：距離の幅（2歳の短距離〜1908年のベルモントステークス 1 3/8 マイル）と脚質は推定。母・母父のカナは推定（ja.wikipedia に記事なし）。
 // 出典：https://ja.wikipedia.org/wiki/コリン_(競走馬) ・ https://en.wikipedia.org/wiki/Colin_(horse)
 { name:'コリン', nameEn:'Colin', country:'米', born:1905, sex:'牡', coat:'黒鹿毛', sire:'コマンド', dam:'パストレラ', damsire:'スプリングフィールド', rating:91, surface:'ダ', distMin:1000, distMax:2200, style:'先行', growth:'早め', retire:1908, wins:['1908ベルモントステークス'], unbeaten:15, note:'15戦15勝。2歳でフューチュリティステークス・シャンペンステークスなど12戦全勝。1907・1908年の年度代表馬', uncertain:true },
 // uncertain：父 McGee・母 Fair Empress・母父 Jim Gore のカナは推定（ja.wikipedia では英字のまま）。ja.wikipedia の母父「White Night」は誤り（White Knight は父の父）で、en.wikipedia の Jim Gore を取った。
 // 通算は en.wikipedia の 99戦50勝（ja.wikipedia の100戦は1922年の単走の公開調教を数えたもの）。距離の幅（6ハロン〜オータムゴールドカップの約2 5/16マイル）と脚質は推定。
 // 出典：https://en.wikipedia.org/wiki/Exterminator_(horse) ・ https://ja.wikipedia.org/wiki/エクスターミネーター
 { name:'エクスターミネーター', nameEn:'Exterminator', country:'米', born:1915, sex:'セ', coat:'栗毛', sire:'マギー', dam:'フェアエンプレス', damsire:'ジムゴア', rating:88, surface:'ダ', distMin:1200, distMax:3700, style:'差し', growth:'普通', retire:1924, wins:['1918ケンタッキーダービー'], note:'99戦50勝。サラトガカップ4連覇（1919〜1922）・ピムリコカップ3連覇・1922年の年度代表馬。ステークス33勝', uncertain:true },
 // uncertain：父は Challenger II（data/stallions.js の 'チャレンジャー':['スウィンフォード',…] と同じ馬）。母 Gallette のカナと、距離の幅・脚質は推定。
 // 出典：https://ja.wikipedia.org/wiki/ギャロレット ・ https://en.wikipedia.org/wiki/Gallorette
 { name:'ギャロレット', nameEn:'Gallorette', country:'米', born:1942, sex:'牝', coat:'栗毛', sire:'チャレンジャー', dam:'ギャレット', damsire:'サーギャラハッド', rating:86, surface:'ダ', distMin:1400, distMax:2000, style:'差し', growth:'普通', retire:1948, wins:['1948ホイットニーステークス'], note:'72戦21勝。1948年は当時の名「ホイットニーハンデキャップ」。メトロポリタンハンデキャップ・ブルックリンハンデキャップ（1946）・1946年の最優秀古牝馬', uncertain:true },
 // uncertain：距離の幅と脚質は推定。種牡馬として data/stallions.js に 'トムフール':['メノウ','ガガ'] がある。
 // 出典：https://ja.wikipedia.org/wiki/トムフール ・ https://en.wikipedia.org/wiki/Tom_Fool
 { name:'トムフール', nameEn:'Tom Fool', country:'米', born:1949, sex:'牡', coat:'鹿毛', sire:'メノウ', dam:'ガガ', damsire:'ブルドッグ', rating:86, surface:'ダ', distMin:1100, distMax:2000, style:'先行', growth:'普通', retire:1953, wins:['1953ホイットニーステークス'], note:'30戦21勝。1953年は10戦10勝でニューヨークのハンデキャップ三冠（メトロポリタン・サバーバン・ブルックリン）。1953年の年度代表馬。当時の名「ホイットニーハンデキャップ」', uncertain:true },
 // uncertain：シドニーカップは data/races_world.js に無いので ja.wikipedia の記事名。母父 Knowsley のカナは推定。距離の幅（5ハロン〜AJCプレート18ハロン）と脚質は推定。
 // 出典：https://ja.wikipedia.org/wiki/カーバイン ・ https://en.wikipedia.org/wiki/Carbine_(horse)
 { name:'カーバイン', nameEn:'Carbine', country:'豪', born:1885, sex:'牡', coat:'鹿毛', sire:'マスケット', dam:'マーシー', damsire:'ノウズリー', rating:88, surface:'芝', distMin:1000, distMax:3600, style:'先行', growth:'普通', retire:1891, wins:['1889シドニーカップ','1890シドニーカップ','1890メルボルンカップ'], note:'43戦33勝。ニュージーランド生まれ。1887〜1888年はニュージーランド、その後は豪州で走った。1890年のメルボルンカップは65.8kgで勝つ', uncertain:true },
 // 毛色は en.wikipedia の dark grey（年とともに白くなった）。ja.wikipedia は芦毛。母・母父のカナは data/stallions_old.js（ルストムマハル・ルストムパシャ）に合わせた。
 // 1949〜1950年のキングズスタンドステークス・キングジョージステークス・2歳時のミドルパークステークスなどは data/races_world.js に無い（勝ちの数え方は note に書いた）。
 // distMin は5ハロン（ナンソープステークス・キングジョージステークス）、distMax は2着の英2000ギニー（1マイル）から。style は推定（en.wikipedia の「先頭から」の記録と、ja.wikipedia の「前から進める競馬に専念した」から逃げ）
 // 出典：https://ja.wikipedia.org/wiki/アバーナント
 // 出典：https://en.wikipedia.org/wiki/Abernant_(horse)
 { name:'アバーナント', nameEn:'Abernant', country:'英', born:1946, sex:'牡', coat:'芦毛', sire:'オーエンテューダー', dam:'ルストムマハル', damsire:'ルストムパシャ', rating:88, surface:'芝', distMin:1000, distMax:1600, style:'逃げ', growth:'早め', retire:1950, wins:['1949ジュライカップ','1949ナンソープステークス','1950ジュライカップ','1950ナンソープステークス'], note:'17戦14勝。2歳はミドルパークステークスなど5連勝、3歳の英2000ギニーはハナ差の2着。キングズスタンドステークス・キングジョージステークスも勝った短距離の名馬', uncertain:true },
 // style は推定（英2000ギニーとニューマーケットSは中間で先頭、ランカシャープレートは逃げ、英ダービーは出遅れて後方から）。distMin はニューステークス（5ハロン）、distMax はアスコットゴールドカップ（2.5マイル）
 // 母はデッドロック（en.wikipedia は Deadlock、表の中は Dead Lock）。相手の馬名のカナ（レイヴンズベリー・レイバーン・ラダス）は推定。獲得賞金は ja.wikipedia と en.wikipedia で数が食い違うので書かない
 // 出典：https://ja.wikipedia.org/wiki/アイシングラス_(競走馬)
 // 出典：https://en.wikipedia.org/wiki/Isinglass_(horse)
 { name:'アイシングラス', nameEn:'Isinglass', country:'英', born:1890, sex:'牡', coat:'鹿毛', sire:'アイソノミー', dam:'デッドロック', damsire:'ウェンロック', rating:93, surface:'芝', distMin:1000, distMax:4000, style:'先行', growth:'普通', retire:1895, wins:['1893英2000ギニー','1893英ダービー','1893英セントレジャー','1894プリンセスオブウェールズステークス','1894エクリプスステークス','1894ジョッキークラブステークス','1895アスコットゴールドカップ'], note:'12戦11勝。英国で6頭目の三冠馬。唯一の負けは1893年ランカシャープレートの2着。獲得賞金は当時の世界記録', uncertain:true },
 // ===== 2026-10-17 に足した名馬（持ち主が「ゲームに入っていない名馬」の一覧から選んだ12頭。史実は各行の上の出典） =====
 // 通算は en.wikipedia の 16戦6勝（年ごとの出走を数えると 6＋7＋3）。ja.wikipedia は13戦6勝。母 Perdita のカナは ja.wikipedia（パーディタ）。
 // style は推定（2000ギニーは2ハロンから先頭、セントレジャーは半マイルから先頭）。distMin は2歳の5ハロン戦、distMax はセントレジャー
 // 出典：https://ja.wikipedia.org/wiki/ダイヤモンドジュビリー_(競走馬)
 // 出典：https://en.wikipedia.org/wiki/Diamond_Jubilee_(horse)
 { name:'ダイヤモンドジュビリー', nameEn:'Diamond Jubilee', country:'英', born:1897, sex:'牡', coat:'鹿毛', sire:'セントサイモン', dam:'パーディタ', damsire:'ハンプトン', rating:89, surface:'芝', distMin:1000, distMax:2900, style:'先行', growth:'普通', retire:1901, wins:['1900英2000ギニー','1900ニューマーケットステークス','1900英ダービー','1900エクリプスステークス','1900英セントレジャー'], note:'16戦6勝。英国で9頭目の三冠馬。全兄にダービー馬パーシモン。気性の激しさで知られた', uncertain:true },
 // 毛色は ja.wikipedia の青鹿毛（en.wikipedia は Brown）。父 Disguise・母 Biturica・母父 Hamburg のカナは推定（ja.wikipedia では英字のまま）。
 // 勝ち鞍はどれも data/races_world.js に無い（フューチュリティステークス・アラバマステークスなど）。距離の幅（2歳の5ハロン〜）と脚質は推定
 // 出典：https://ja.wikipedia.org/wiki/マスケット_(1906年生の競走馬) ・ https://en.wikipedia.org/wiki/Maskette
 { name:'マスケット', nameEn:'Maskette', country:'米', born:1906, sex:'牝', coat:'青鹿毛', sire:'ディスガイズ', dam:'ビトゥリカ', damsire:'ハンブルグ', rating:85, surface:'ダ', distMin:1000, distMax:2000, style:'先行', growth:'早め', retire:1910, wins:['1908スピナウェイステークス','1908メイトロンステークス','1908フューチュリティステークス','1909アラバマステークス','1909ガゼルハンデキャップ'], note:'17戦12勝。牝馬を相手には一度も負けなかった。2歳で牡馬も出るフューチュリティステークスを勝った。1908年の最優秀2歳牝馬・1909年の最優秀3歳牝馬', uncertain:true },
 // 仏ダービー＝ジョッケクルブ賞（2400m）、パリ大賞＝当時は3000m。父 Prestige・母 Gemma のカナは推定。母父 Florizel はダイヤモンドジュビリーの全兄（ja.wikipedia の表記フロリゼル）。
 // style は推定（パリ大賞は残り800mから競り合って差し切った）。distMin は2歳の1000m戦、distMax はパリ大賞
 // 出典：https://en.wikipedia.org/wiki/Sardanapale_(horse)
 { name:'サルダナパル', nameEn:'Sardanapale', country:'仏', born:1911, sex:'牡', coat:'鹿毛', sire:'プレスティージ', dam:'ジェンマ', damsire:'フロリゼル', rating:90, surface:'芝', distMin:1000, distMax:3000, style:'差し', growth:'普通', retire:1914, wins:['1913モルニ賞','1914仏ダービー','1914パリ大賞'], note:'16戦11勝。1914年の欧州の首位とされる。第一次世界大戦で競馬が止まり、3歳の夏で引退した', uncertain:true },
 // 大戦のため1916年のダービー・オークスはニューマーケットの代わりの競走（ニューダービー・ニューオークス）。通算は en.wikipedia の 7戦4勝（ja.wikipedia は8戦4勝）。
 // 母 Silver Fowl・母父 Wildfowler のカナは推定。style はダービーの内から伸びた勝ち方からの見立て。distMin は2歳の5ハロン戦
 // 出典：https://ja.wikipedia.org/wiki/フィフィネラ ・ https://en.wikipedia.org/wiki/Fifinella_(horse)
 { name:'フィフィネラ', nameEn:'Fifinella', country:'英', born:1913, sex:'牝', coat:'栗毛', sire:'ポリメラス', dam:'シルヴァーファウル', damsire:'ワイルドファウラー', rating:87, surface:'芝', distMin:1000, distMax:2400, style:'差し', growth:'普通', retire:1917, wins:['1915チェヴァリーパークステークス','1916英ダービー','1916英オークス'], note:'7戦4勝。英ダービーを勝った最後の牝馬（いまのところ）。2日後のオークスも5馬身差', uncertain:true },
 // 大レースの勝ちは無い（ニューマーケットだけで24戦16勝）。母 Bromus は ja.wikipedia のブロモス、母父 Sainfoin のカナ（セインフォイン）は推定。
 // style と距離の幅（短距離〜3歳時に勝った10ハロン）は推定
 // 出典：https://ja.wikipedia.org/wiki/ファラリス_(競走馬) ・ https://en.wikipedia.org/wiki/Phalaris_(horse)
 { name:'ファラリス', nameEn:'Phalaris', country:'英', born:1913, sex:'牡', coat:'黒鹿毛', sire:'ポリメラス', dam:'ブロモス', damsire:'セインフォイン', rating:84, surface:'芝', distMin:1000, distMax:2000, style:'先行', growth:'普通', retire:1918, wins:['1917チャレンジステークス','1918チャレンジステークス'], note:'24戦16勝。1917・1918年の英国の短距離の首位。種牡馬としていまのサラブレッドの多くの父系の祖になった', uncertain:true },
 // 大戦中のためスペインのサンセバスティアンで走り、7戦5勝。フランスで1戦1勝（4歳）。母 Rondeau は ja.wikipedia のロンド。
 // 父 Ajax は data/stallions_old.js の 'アジャックス'（1901年生のフランスの馬。1934年生の豪州のアジャックスとは別の馬）。style は推定
 // 出典：https://ja.wikipedia.org/wiki/テディ_(競走馬) ・ https://en.wikipedia.org/wiki/Teddy_(horse)
 { name:'テディ', nameEn:'Teddy', country:'仏', born:1913, sex:'牡', coat:'鹿毛', sire:'アジャックス', dam:'ロンド', damsire:'ベイロナルド', rating:82, surface:'芝', distMin:1700, distMax:2800, style:'先行', growth:'普通', retire:1917, wins:['1916サンセバスティアン大賞','1916ビリャメホル賞'], note:'8戦6勝。スペインのセントレジャー（ビリャメホル賞）を勝った。種牡馬としてサーギャラハッド・ブルドッグ・ラトロワンヌの父', uncertain:true },
 // 芦毛（ja.wikipedia はベンドア斑の芦毛）。style は推定（「空飛ぶ牝馬」と呼ばれた先行力から逃げ）。distMax は2着の英1000ギニー（1マイル）
 // 出典：https://ja.wikipedia.org/wiki/ムムタズマハル_(競走馬) ・ https://en.wikipedia.org/wiki/Mumtaz_Mahal_(horse)
 { name:'ムムタズマハル', nameEn:'Mumtaz Mahal', country:'英', born:1921, sex:'牝', coat:'芦毛', sire:'ザテトラーク', dam:'レディジョセフィン', damsire:'サンドリッジ', rating:87, surface:'芝', distMin:1000, distMax:1600, style:'逃げ', growth:'早め', retire:1924, wins:['1923クイーンメアリーステークス','1923シャンペンステークス','1924キングジョージステークス','1924ナンソープステークス'], note:'10戦7勝。2歳で5勝し、3歳の英1000ギニーは2着。孫にナスルーラ', uncertain:true },
 // 毛色は en.wikipedia の Bay or brown から黒鹿毛（ja.wikipedia に記事なし）。父 Laland・母 Nella da Gubbio のカナは推定。
 // style はドイツダービーの見立て（速い逃げ馬を直線でとらえた）。distMin は推定、distMax はドイツダービー
 // 出典：https://en.wikipedia.org/wiki/Nereide_(horse)
 { name:'ネレイーデ', nameEn:'Nereide', country:'独', born:1933, sex:'牝', coat:'黒鹿毛', sire:'ラランド', dam:'ネッラダグッビオ', damsire:'グランドパレード', rating:90, surface:'芝', distMin:1200, distMax:2400, style:'差し', growth:'普通', retire:1936, wins:['1936ドイツダービー','1936ドイツオークス'], unbeaten:10, note:'10戦10勝。ドイツダービーのレコードは1993年まで破られなかった。ブラウネスバントで凱旋門賞馬コリーダを破った', uncertain:true },
 // 1934年生の豪州の馬（Ajax II とも書く）。data/stallions_old.js の 'アジャックス'（1901年生のフランスの馬・テディの父）とは同じ名前の別の馬。
 // 母父は en.wikipedia の Prince Galahad（ja.wikipedia は Cylgad）。カナ（ヒロイック・メドメナム・プリンスギャラハッド）は推定。style は推定。
 // distMin は2歳の5.5ハロン戦、distMax は C.B.フィッシャープレート（12ハロン）
 // 出典：https://ja.wikipedia.org/wiki/アジャックス_(1934年生の競走馬) ・ https://en.wikipedia.org/wiki/Ajax_II
 { name:'アジャックス', nameEn:'Ajax', country:'豪', born:1934, sex:'牡', coat:'栗毛', sire:'ヒロイック', dam:'メドメナム', damsire:'プリンスギャラハッド', rating:89, surface:'芝', distMin:1100, distMax:2400, style:'先行', growth:'普通', retire:1940, wins:['1937ローズヒルギニー','1937コーフィールドギニー','1938ニューマーケットハンデキャップ','1938コックスプレート'], note:'46戦36勝。18連勝のあと、1939年のローソンステークスで1対40の本命ながら3頭立ての2着に敗れた。フューチュリティステークスなど4つの競走を3連覇', uncertain:true },
 // 仏ダービー＝ジョッケクルブ賞、パリ大賞＝パリ大賞典。毛色は ja.wikipedia の黒鹿毛（en.wikipedia は Black）。母 Carissima は data/stallions.js のカリッシマ。
 // 母父 Clarissimus のカナ（クラリッシムス）は推定。style はジョッケクルブ賞の最後方からの見立て。distMin はノアイユ賞（2200m）から推定、distMax はパリ大賞典（3000m）
 // 出典：https://ja.wikipedia.org/wiki/ファリス_(競走馬) ・ https://en.wikipedia.org/wiki/Pharis_(horse)
 { name:'ファリス', nameEn:'Pharis', country:'仏', born:1936, sex:'牡', coat:'黒鹿毛', sire:'ファロス', dam:'カリッシマ', damsire:'クラリッシムス', rating:90, surface:'芝', distMin:2000, distMax:3000, style:'差し', growth:'普通', retire:1939, wins:['1939ノアイユ賞','1939仏ダービー','1939パリ大賞'], unbeaten:3, note:'3戦3勝。第二次世界大戦で競馬が止まり、英国の二冠馬ブルーピーターとの対戦はかなわなかった', uncertain:true },
 // 英国の牝馬三冠。母 Daily Double のカナは推定。style はセントレジャーの最後方からの見立て。distMin は推定、distMax はセントレジャー
 // 出典：https://ja.wikipedia.org/wiki/メルド_(競走馬) ・ https://en.wikipedia.org/wiki/Meld_(horse)
 { name:'メルド', nameEn:'Meld', country:'英', born:1952, sex:'牝', coat:'鹿毛', sire:'アリシドン', dam:'デイリーダブル', damsire:'フェアトライアル', rating:89, surface:'芝', distMin:1200, distMax:2900, style:'差し', growth:'普通', retire:1955, wins:['1955英1000ギニー','1955英オークス','1955コロネーションステークス','1955英セントレジャー'], note:'6戦5勝。3歳は4戦4勝で英国の牝馬三冠。仔に英ダービー馬シャーロットタウン', uncertain:true },
 // 通算は en.wikipedia の 33戦23勝（ja.wikipedia は32戦23勝）。毛色は en.wikipedia の Dark Bay から黒鹿毛（ja.wikipedia は鹿毛）。
 // style は逃げ（プリークネスSもトレントンHも先頭から）。distMax はサバーバンH・トレントンH（10ハロン）
 // 出典：https://ja.wikipedia.org/wiki/ボールドルーラー ・ https://en.wikipedia.org/wiki/Bold_Ruler
 { name:'ボールドルーラー', nameEn:'Bold Ruler', country:'米', born:1954, sex:'牡', coat:'黒鹿毛', sire:'ナスルーラ', dam:'ミスディスコ', damsire:'ディスカバリー', rating:91, surface:'ダ', distMin:1200, distMax:2000, style:'逃げ', growth:'普通', retire:1958, wins:['1956フューチュリティステークス','1957ウッドメモリアルステークス','1957プリークネスステークス','1957トレントンハンデキャップ','1958サバーバンハンデキャップ'], note:'33戦23勝。1957年の年度代表馬。北米のリーディングサイアー8回、セクレタリアトの父', uncertain:true },
];
})();
