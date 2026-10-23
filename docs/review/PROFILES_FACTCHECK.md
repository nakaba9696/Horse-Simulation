# 名馬の名鑑の史実の裏取り（2026-10-23）

持ち主の指示（2026-10-23）「名馬列伝の妥当性」。10月21日の外部レビュー（[codex/PROFILES_REVIEW.md](codex/PROFILES_REVIEW.md)）は「外部の史実の裏取りは一部だけ」だったので、名鑑（`data/profiles*.js`）の文を外部の出典で確かめた。

## 確かめた馬の選び方
次のどれかに当たる **217頭**（名鑑は全784頭）。
- 10月21日以降に足した・直した名鑑：スルーオゴールド・マニラ・シアトリカル・セントサイモン・ササフラ（`git log -- data/profiles*.js`）
- 外部レビューで指摘された・「外部確認待ち」とされた馬（ゴールデンシックスティ・フライトライン・ディープインパクト・ダリズ・retire を直した10頭・満年齢を直した5頭など29頭）
- 総合力が高い馬：`docs/review/horses.csv` の芝・ダートの高い方が 70.0 以上

確かめた所：年代・戦績・主な勝鞍・解説の中の年・年齢（満年齢）・着差・相手の馬・出来事・種牡馬や繁殖の成績・死んだ年と年齢。人の名前（騎手・調教師・馬主・生産者）が入っていないかも見た（どの馬にも無かった）。
出典は WebFetch・WebSearch で本文を読んだもの（ja/en.wikipedia・JBIS・netkeiba・JRA・各国の主催者や新聞の記録）。

## まとめ
- 確かめた頭数：**217頭**（選んだ馬は全部）。
- 直した件数：**35件**（33頭）。
- 直さずに残したもの（保留）：**58件**。出典どうしが食い違う・数え方の違い・出典に書いていないもの。
- 合っていた所：218行（馬ごと・項目ごと）。
- 確かめられなかった馬：無し。ただし保留の中に「出典が見つからない」細部がある（下の表。racingmuseum.org は 503 で読めなかった）。

満年齢の決まり（2000年以前の旧表記「3歳」＝満2歳）に合わせた直しが5件ある（マルゼンスキー・ビワハヤヒデ・ミホノブルボンの「3歳レコード」、死んだときの年齢のソーユーシンク・レディーズシークレット）。モンジューの死んだ年齢も、生まれた日（1996年4月4日）と死んだ日（2012年3月29日）から満15歳に直した。

## 1. 直したもの（35件）
| 馬 | 項目 | いま（直す前） | 正しい（直した後） | 直したか | 出典 |
|---|---|---|---|---|---|
| フランケル | キャンフォードクリフスが2010年に勝ったのは愛2000ギニー（英2000ギニーは3着） | 前年の2000ギニー馬キャンフォードクリフス | 前年の愛2000ギニー馬キャンフォードクリフス | 直した | https://en.wikipedia.org/wiki/Canford_Cliffs_(horse) |
| シガー | 1995年の初戦は1月22日の条件戦で、ドンH は2戦目 | 1995年はドンハンデキャップからブリーダーズカップクラシックまで10戦全勝 | 1995年はブリーダーズカップクラシックまで10戦全勝 | 直した | https://en.wikipedia.org/wiki/Cigar_(horse) |
| ブラックキャビア | 2011年のライトニングSの着差は3馬身半 | ライトニングステークスは直線の入り口で先頭に立って大差をつけた | ライトニングステークスは直線の入り口で先頭に立って3馬身半差をつけた | 直した | https://en.wikipedia.org/wiki/Black_Caviar |
| ブラックキャビア | 仔は2014年から2024年までに9頭 | 繁殖牝馬として6頭の仔を産み | 繁殖牝馬として9頭の仔を産み | 直した | https://www.thenewdaily.com.au/sport/racing/2024/08/19/black-caviar-die-foal |
| モンジュー | 1996年4月4日生まれ、2012年3月29日に死亡で満15歳 | 2012年、16歳で生涯を閉じた | 2012年、15歳で生涯を閉じた | 直した | https://en.wikipedia.org/wiki/Montjeu |
| アロゲート | 着差は5馬身4分の1と1馬身4分の3で、大差ではない | 続く2戦も大差で勝った | 続く2戦も勝った | 直した | https://en.wikipedia.org/wiki/Arrogate |
| バーイード | 前走は2021年10月16日、ロッキンジSは2022年5月14日 | 2022年は8か月ぶりのロッキンジステークス | 2022年は7か月ぶりのロッキンジステークス | 直した | https://en.wikipedia.org/wiki/Baaeed |
| ホーリーブル | シガーの16連勝は1994年10月から始まり、このドンH はその4勝目 | 勝ったのはこのあと16連勝するシガーだった | 勝ったのは連勝中のシガーだった | 直した | https://en.wikipedia.org/wiki/Cigar_(horse) |
| カーリン | 当日の1番人気はストリートセンス（9-2）で、カーリンは2番人気。前売りの予想オッズでは1番人気だった | 1番人気のケンタッキーダービーはストリートセンスの3着だったが | 2番人気のケンタッキーダービーはストリートセンスの3着だったが | 直した | https://en.wikipedia.org/wiki/2007_Kentucky_Derby |
| ソーユーシンク | 2006年11月10日生・2025年10月20日没で満18歳（19歳は南半球の競走年齢） | 2025年に19歳で生涯を閉じた | 2025年に18歳で生涯を閉じた | 直した | https://en.wikipedia.org/wiki/So_You_Think |
| ガイヤース | 2020年の愛チャンピオンSの着差は3/4馬身 | マジカルに半馬身足らずの差で2着 | マジカルに3/4馬身差で2着 | 直した | https://racing365.com/news/2020/09/12/magical-thwarts-ghaiyyath-in-irish-champion-epic/ |
| オーギュストロダン | 生まれはアイルランド（2020年1月26日） | 日本で生まれたディープインパクト産駒で | アイルランドで生まれたディープインパクト産駒で | 直した | https://en.wikipedia.org/wiki/Auguste_Rodin_(horse) |
| レディーズシークレット | 1982年4月8日生・2003年3月4日没で満20歳 | 出産のときの合併症で21歳で | 出産のときの合併症で20歳で | 直した | https://en.wikipedia.org/wiki/Lady%27s_Secret |
| マニラ | 1986年のUNハンデ（8月9日・G1）がターフクラシック（9月22日）より先 | レキシントンハンデキャップ、シネマハンデキャップ、ユナイテッドネーションズハンデキャップを勝ち、ベルモントパークのターフクラシックで G1 を初めて勝った。 | レキシントンハンデキャップとシネマハンデキャップを勝ち、ユナイテッドネーションズハンデキャップで G1 を初めて勝った。続いてベルモントパークのターフクラシックも勝った。 | 直した | https://en.wikipedia.org/wiki/United_Nations_Stakes |
| マニラ | エストラペードの1986年のエクリプス賞は最優秀芝牝馬 | 米国の最優秀牝馬エストラペード | 米国の最優秀芝牝馬エストラペード | 直した | https://en.wikipedia.org/wiki/Estrapade_(horse) |
| ザテトラーク | ラウスメモリアルSは1913年7月31日で、秋のレースではない | 秋にはラウスメモリアルステークスで | 続くラウスメモリアルステークスで | 直した | https://tbheritage.com/Portraits/TheTetrarch.html |
| ミルリーフ | インフルエンザにかかっていたとわかったのはコロネーションCの後で、病み上がりで走ったのではない | 馬インフルエンザの後で調子を落としながら | 馬インフルエンザで調子を落としながら | 直した | https://ja.wikipedia.org/wiki/ミルリーフ |
| アバーナント | 出典は「1000を超えるレースの勝ち」で、勝ち馬の頭数ではない | 英1000ギニーの勝ち馬など1000頭を超える勝ち馬を出し、 | 英1000ギニーの勝ち馬などを出して産駒の勝ちは1000を超え、 | 直した | https://en.wikipedia.org/wiki/Abernant_(horse) |
| テューダーミンストレル | トミーリーは1956年に英国で生まれた仔。米国に着いたのは1959年（買われたのは1958年秋） | 英国で種牡馬になり、1958年に米国へ渡ってケンタッキーダービー馬トミーリーなどを出した | 英国で種牡馬になってケンタッキーダービー馬トミーリーなどを出し、1959年に米国へ渡った | 直した | https://drf.uky.edu/catalog/1950s/drf1959051201/drf1959051201_6_3 |
| バヤルド | ダービーは5着 | ダービーステークスでは前の馬の落馬に巻き込まれて10着に敗れた | ダービーステークスでは前の馬の落馬に巻き込まれて5着に敗れた | 直した | https://en.wikipedia.org/wiki/Bayardo_(horse) |
| トムフール | 1971年の北米の母の父の首位はダブルジェイで、トムフールは北米で首位になっていない | 種牡馬としてバックパサー、ティムタムなどを出し、1971年には米国の母の父の首位になった。 | 種牡馬としてバックパサー、ティムタムなどを出した。 | 直した | https://en.wikipedia.org/wiki/Leading_broodmare_sire_in_North_America |
| マルゼンスキー | 旧表記の3歳＝満2歳。満年齢に直す | 1分34秒4の3歳レコードで勝った | 1分34秒4の2歳レコードで勝った | 直した | https://ja.wikipedia.org/wiki/マルゼンスキー |
| カーバイン | 1889年のメルボルンカップはブラボーに1馬身差の2着 | メルボルンカップは63.6kgのトップハンデで頭差の2着だった | メルボルンカップは63.6kgのトップハンデで1馬身差の2着だった | 直した | https://latrobejournal.slv.vic.gov.au/latrobejournal/issue/latrobe-74/t1-g-t5.html |
| アジャックス | ヒロイックは1932/33年から種牡馬首位で、1934年生まれは初年度の産駒ではない | 父ヒロイックの初年度の産駒にあたる。 | 父はヒロイック。 | 直した | https://en.wikipedia.org/wiki/Heroic_(horse) |
| タマモクロス | 初勝利（1987年4月11日・阪神の未勝利戦）はダート2戦目 | ダートに移って3戦目でようやく初勝利を挙げた | ダートに移って2戦目でようやく初勝利を挙げた | 直した | https://ja.wikipedia.org/wiki/タマモクロス |
| プティトエトワール | 病気は4歳の1960年のキングジョージのあと。引退は報じられただけ | 5歳の春には馬インフルエンザにかかって一度は引退が決まったが、撤回されてコロネーションカップを連覇した。 | その後は咳の病気でその年の残りを休み、一度は引退が伝えられたが、5歳でもコロネーションカップを勝って連覇した。 | 直した | https://en.wikipedia.org/wiki/Petite_Etoile |
| テンポイント | JRA の成績表は着差3/4 | 天皇賞（春）をクビ差で勝ち | 天皇賞（春）を3/4馬身差で勝ち | 直した | https://www.jra.go.jp/datafile/seiseki/g1/haruten/result/haruten1977.html |
| ザミンストレル | 取りやめたのは凱旋門賞（輸入制限のため）で、引退後すぐ米国へ送られた | 計画されていた米国遠征は取りやめて引退した | 計画されていた凱旋門賞への出走は取りやめて引退した | 直した | https://en.wikipedia.org/wiki/The_Minstrel |
| シングスピール | 3歳までの勝ち鞍は未勝利戦とリステッドのトロイSだけ。G3のゴードンリチャーズSは4歳の1996年 | 重賞はG3を1つ勝っただけだった | 重賞を勝てなかった | 直した | https://ja.wikipedia.org/wiki/シングスピール |
| ファルブラヴ | 2003年愛チャンピオンSの着差はクビ | ハイシャパラルにハナ差の2着 | ハイシャパラルにクビ差の2着 | 直した | https://en.wikipedia.org/wiki/High_Chaparral_(horse) |
| ビワハヤヒデ | 旧表記の年齢（3歳＝満2歳）。レース名はそのまま | 芝1400mの3歳レコードを1秒2縮めた | 芝1400mの2歳レコードを1秒2縮めた | 直した | https://ja.wikipedia.org/wiki/ビワハヤヒデ |
| ミホノブルボン | 旧表記の年齢（3歳＝満2歳） | 1991年9月の新馬戦を3歳コースレコードで勝ち | 1991年9月の新馬戦を2歳のコースレコードで勝ち | 直した | https://ja.wikipedia.org/wiki/ミホノブルボン |
| ドウデュース | 取消は2024年12月20日、有馬記念は12月22日 | 有馬記念の前日に右前脚の跛行で | 有馬記念の2日前に右前脚の跛行で | 直した | https://www.daily.co.jp/umaya/news/2024/12/20/0018465780.shtml |
| ヒカリデュール | 地方で1979年に10戦している（初出走は1979年）。years:'1980〜1983年' だけではアンバーシャダイと重なるので馬名ごと | name:'ヒカリデュール', years:'1980〜1983年' | name:'ヒカリデュール', years:'1979〜1983年' | 直した | https://www.jbis.or.jp/horse/0000101108/record/ |
| スリープレスナイト | デビューが3歳（2007年1月）なので「3歳から」では食い違う。ダートは3戦目から | デビューの2戦は芝だったが、3歳からはダートの短距離で勝ち上がった | デビューの2戦は芝だったが、3戦目からはダートの短距離で勝ち上がった | 直した | https://ja.wikipedia.org/wiki/スリープレスナイト |

## 2. 直さずに残したもの（保留 58件）
| 馬 | 項目 | いま | 出典で分かったこと | 直したか | 出典 |
|---|---|---|---|---|---|
| シーザスターズ | text（エクリプスS の着差） | リップヴァンウィンクルを1馬身差で退け | 1馬身半差（en.wikipedia・報道）／1馬身差（ja.wikipedia） | 直さない（保留） | https://en.wikipedia.org/wiki/Sea_The_Stars ・ https://ja.wikipedia.org/wiki/シーザスターズ |
| マニカト | text（年齢） | 6歳のクイーンエリザベスカップ | ja.wikipedia は 1981/82 年のシーズン（豪州の数え方で6歳）、en.wikipedia は5歳の節に入れていて年が決まらない | 直さない（保留） | https://ja.wikipedia.org/wiki/マニカト ・ https://en.wikipedia.org/wiki/Manikato |
| ラフィアン | text | 勝った8つの重賞のすべてで、そのレースの記録を出している | en.wikipedia の冒頭はこのとおりだが、本文ではCCAオークスはタイ記録など一部が「並んだ」 | 直さない（保留） | https://en.wikipedia.org/wiki/Ruffian_(horse) |
| デイラミ | record | 21戦11勝 | en.wikipedia は19戦11勝（11-3-4）。21戦の出典もあるが着順の数が合わない | 直さない（保留） | https://en.wikipedia.org/wiki/Daylami |
| デイラミ | text（エクリプスS の着差） | エクリプスステークスを半馬身差で勝った | 着差を書いた出典が見つからない | 直さない（保留） | https://en.wikipedia.org/wiki/Daylami |
| ドバイミレニアム | text | 予定していたブリーダーズカップクラシックには出られなかった | BCクラシックが目標だったことを書いた出典が見つからない（話にあったのはモンジューとのマッチレース） | 直さない（保留） | https://en.wikipedia.org/wiki/Dubai_Millennium |
| ザルカヴァ | text（マルセルブサック賞） | 残り300mで先頭から5馬身離れていた | 出典が見つからない（勝った着差は約2馬身半で、名鑑と同じ） | 直さない（保留） | https://fr.wikipedia.org/wiki/Zarkava |
| ディラントーマス | record | 20戦10勝 | （18戦10勝とする出典もある） | 直さない（保留） | en.wikipedia の本文は「20戦10勝」、ja.wikipedia の戦績表も20戦（2007年のブリーダーズカップターフ5着を含む）。ja.wikipedia・en.wikipedia の情報欄は18戦。数え方の違いなので直さない。https://en.wikipedia.org/wiki/Dylan_Thomas_(horse) ・ https://ja.wikipedia.org/wiki/ディラントーマス |
| デインドリーム | text（イタリアのオークスの着差） | 6馬身差 | 6馬身半差？ | 直さない（保留） | en.wikipedia の本文と ja.wikipedia の戦績表は「6 1/2馬身」。ja.wikipedia の本文は「6馬身差」。出典どうしが食い違うので直さない。https://en.wikipedia.org/wiki/Danedream ・ https://ja.wikipedia.org/wiki/デインドリーム |
| デインドリーム | text（2011年バーデン大賞の着差） | 6馬身差 | 6馬身差（en の本文だけ7馬身） | 直さない（保留） | ja.wikipedia の戦績表と en.wikipedia の冒頭は6馬身、en.wikipedia の本文は7馬身。名鑑は多い側に合っている。https://en.wikipedia.org/wiki/Danedream |
| スキップアウェイ | text（1996年ジョッキークラブゴールドカップの着差） | シガーをアタマ差 | アタマ差（en はクビ差） | 直さない（保留） | ja.wikipedia の戦績表はアタマ、en.wikipedia は「by a neck」。食い違うので直さない。https://ja.wikipedia.org/wiki/スキップアウェイ ・ https://en.wikipedia.org/wiki/Skip_Away |
| カーリン | text（ブリーダーズカップクラシックの着差） | 4馬身半差 | 4馬身半差（en は4馬身3/4） | 直さない（保留） | ja.wikipedia の戦績表は4 1/2馬身、en.wikipedia は4¾。食い違うので直さない。https://en.wikipedia.org/wiki/Curlin |
| ソーユーシンク | text「初めて古馬と戦ったコックスプレート」 | 初めて古馬と戦った | - | 直さない（保留） | https://en.wikipedia.org/wiki/So_You_Think （5戦目の勝利で、2馬身半差なのは確かめられた。それまでの4戦に古馬との対戦が無かったかは出典で確かめられなかった） |
| オーギュストロダン | record | 16戦8勝 | - | 直さない（いまのままでよい） | https://en.wikipedia.org/wiki/Auguste_Rodin_(horse) は1走ずつの表で16戦8勝、https://ja.wikipedia.org/wiki/オーギュストロダン_(競走馬) は15戦8勝。en の表を数えると16戦なので直さない |
| ササフラ | text「アイルランドで種牡馬となった」 | アイルランド | - | 直さない（保留） | https://en.wikipedia.org/wiki/Sassafras_(horse) はアイルランドのバリーリンチスタッド、https://ja.wikipedia.org/wiki/ササフラ は「イギリスで種牡馬入り」。食い違うので直さない |
| キンチェム | text（1878年バーデン大賞の決勝の着差） | 6馬身差 | ja.wikipedia は6馬身、en.wikipedia は five lengths | 直さない（出典が食い違う） | https://en.wikipedia.org/wiki/Kincsem ・ https://ja.wikipedia.org/wiki/キンチェム |
| キンチェム | text（1877年ジョッケクルブ賞「大差」） | 大差 | ja.wikipedia の成績表は「大差」。en.wikipedia は当時の新聞で2馬身と10馬身に分かれると書く | 直さない（そのままでよいが出典が割れる） | https://en.wikipedia.org/wiki/Kincsem |
| キンチェム | text（猫の話） | 「という話も残る」 | en.wikipedia は当時の記録に猫は出てこず、連れていたのは馬のチャロガニーと書く。伝承として書いているので直さない | 直さない（書き方は伝承扱いで可） | https://en.wikipedia.org/wiki/Kincsem |
| ザテトラーク | text（3歳時の故障） | 右前脚の球節 | ja.wikipedia は前年と同じ右前の球節、tbheritage は左前の繋靭帯 | 直さない（出典が食い違う） | https://tbheritage.com/Portraits/TheTetrarch.html ・ https://ja.wikipedia.org/wiki/ザテトラーク |
| アレッジド | text（グレートヴォルティジュールS 7馬身差） | 7馬身差 | 着差を書いた確かな出典が見つからない（掲示板の書き込みのみ） | 直さない（出典なし） | https://en.wikipedia.org/wiki/Alleged_(horse) |
| アレッジド | text（100頭のステークス勝ち馬） | 100頭 | Blood-Horse は100頭、ジョッキークラブの記録は94頭 | 直さない（数え方の違い） | https://www.americanclassicpedigrees.com/alleged.html |
| アバーナント | text（デビュー戦「出遅れて2着」・4歳のキングズスタンドS「2着」） | 2着 | en.wikipedia は「デビュー戦で負けた」「斤量を譲って負けた」とだけ書き、着順と出遅れは確かめられない | 直さない（出典なし） | https://en.wikipedia.org/wiki/Abernant_(horse) |
| ニジンスキー | text（ダービーの勝ちタイム） | マームードに次ぐダービー史上2位の速さ | en.wikipedia は「1936年以来の速さ」とだけ書く。1936年より前に2分34秒0台の勝ち馬がいたかどうか確かめられない | 直さない（保留） | https://en.wikipedia.org/wiki/Nijinsky_(horse) |
| アファームド | text（ベルモントSの着差） | 頭差 | en.wikipedia は nose（ハナ差）、ja.wikipedia はアタマ差 | 直さない（出典が食い違う） | https://en.wikipedia.org/wiki/Affirmed ・ https://ja.wikipedia.org/wiki/アファームド |
| ネイティヴダンサー | text（4歳の故障） | 骨膜炎と屈腱炎 | ja.wikipedia は骨膜炎・屈腱炎、en.wikipedia は右前の蹄の打撲と滑液包の炎症 | 直さない（出典が食い違う） | https://en.wikipedia.org/wiki/Native_Dancer ・ https://ja.wikipedia.org/wiki/ネイティヴダンサー |
| クリフジ | text | 11戦のうち7戦は10馬身以上の差をつけた | ja.wikipedia の本文は「7戦が着差10馬身以上」、同じページの成績表では10身4戦＋大差2戦の6戦 | 直さない（保留） | https://ja.wikipedia.org/wiki/クリフジ |
| クリフジ | text | 横浜記念をレコードで6馬身差で勝った | 成績表はレコード・6身で合うが、本文の括弧書きは「横浜記念（10馬身）」で出典の中で食い違う | 直さない（保留） | https://ja.wikipedia.org/wiki/クリフジ |
| サンチャリオット | text | オークスでは発走をやり直させ、走り出す方向を誤りながら1馬身差で勝った | 出典は「発走で左へ飛び出して1ハロン近く損をし、1馬身差で楽に勝った」。発走のやり直しの記述は見つからない（1馬身差は合う） | 直さない（保留） | https://horseracinghof.com/?p=2380 |
| ケルソ | text | 1962年には米国で5頭目の獲得賞金100万ドルの馬になり | 1962年に100万ドルを超えたことは確か。「5頭目」は出典が見つからない（「初めて」とする出典もあり食い違う） | 直さない（保留） | https://www.champsofthetrack.com/post/kelso-making-a-million ・ https://claibornefarm.com/?p=16796 |
| シービスケット | text | 1935年1月にハイアリアパークのダート3ハロン戦でデビュー | 1935年1月19日ハイアリアパークでデビュー（4着）は確か。3ハロンは出典で確かめられない | 直さない（保留） | https://en.wikipedia.org/wiki/Seabiscuit |
| シービスケット | text | 第1回のハリウッドゴールドカップを133ポンドを背負って勝ち | 第1回（1938年）の勝ちは確か。133ポンドは同年4月のベイメドウズハンデキャップの斤量とする出典があり、ゴールドカップの斤量は確かめられない | 直さない（保留） | https://en.wikipedia.org/wiki/Hollywood_Gold_Cup ・ https://vault.si.com/vault/1972/09/25/the-afternoon-the-biscuit-ate-an-admiral |
| バヤルド | text | アスコットのニューステークスでデビューして1馬身半差で勝った | デビュー勝ちは確か。着差は出典に無い | 直さない（保留） | https://en.wikipedia.org/wiki/Bayardo_(horse) |
| ザフライングダッチマン | text | 8か月ぶりの出走となったダービーステークス | ダービーが3歳初戦だったことは確か。8か月の間隔は出典に無い | 直さない（保留） | https://en.wikipedia.org/wiki/The_Flying_Dutchman_(horse) |
| ザフライングダッチマン | text | この年も7戦7勝 | en.wikipedia は公式の1849年の出走を6戦6勝（不戦勝1つは記録から外す）とする。数え方の違い | 直さない（保留） | https://en.wikipedia.org/wiki/The_Flying_Dutchman_(horse) |
| トムフール | text | ネイティヴダンサーとの対戦は相手の故障で実現しなかった | 出典で確かめられない | 直さない（保留） | https://en.wikipedia.org/wiki/Tom_Fool_(horse) |
| ヴェイグリーノーブル | text | サンドウィッチステークスを12馬身差で勝った／直線の手前で進路をふさがれながら／鞍上が替わった | アスコットの2歳戦を12馬身差で勝ったことは確か。レース名・オブザーヴァーGCでの進路の不利・乗り替わりは出典で確かめられない（凱旋門賞の1番人気・3馬身差・サンクルー大賞3着は確か） | 直さない（保留） | https://horseracinghof.com/notable-heroes/vaguely-noble/ ・ https://vault.si.com/vault/1968/10/14/the-racing-doctor-made-the-right-prognosis |
| ダリア | text | 6歳の1976年までG1を10勝し | 出典に G1 の勝ち数が無い | 直さない（保留） | https://en.wikipedia.org/wiki/Dahlia_(horse) |
| ドミノ | text（デビュー戦） | グレーヴセンド競馬場の5ハロンの未勝利戦でデビューし、6馬身差 | 5月22日・グレーヴセンド・5ハロン・6馬身差は合う。ただし出典は「2歳のスウィープステークス」で、未勝利戦とは書いていない | 直さない（保留） | https://www.teamvalor.com/Library/Domino.pdf |
| ドミノ | text（メイトロンS） | 1分9秒00の国内レコード | 出典に時計・レコードの記述なし | 直さない（保留） | https://en.wikipedia.org/wiki/Domino_(horse) |
| ドミノ | text（2歳の賞金） | 170,790ドル | 出典によって 170,790ドル／170,890ドルと食い違う | 直さない（保留） | https://www.teamvalor.com/Library/Domino.pdf ・ https://www.americasbestracing.net/the-sport/2023-underappreciated-horse-racing-stars-19th-century-ben-brush-domino-and-henry-navarre |
| カーバイン | text（デビュー戦） | 1887年11月にクライストチャーチの5ハロン戦でデビューし、出遅れながら勝った | 出典が見つからない（2歳で5戦全勝は合う） | 直さない（保留） | https://en.wikipedia.org/wiki/Carbine_(horse) |
| カーバイン | text（1890年の時計） | 3分28秒2のレコード | 出典は 3:28.25（3分28秒1/4）。端数の書き方の違い | 直さない（保留） | https://en.wikipedia.org/wiki/1890_Melbourne_Cup |
| ラウンドテーブル | text（デビュー） | 1956年2月にデビュー | 出典に日付なし（2歳時10戦5勝は合う） | 直さない（保留） | https://www.americasbestracing.net/the-sport/2020-round-table-champion-the-turf |
| ラウンドテーブル | text（4歳時） | 年明けから7連勝…20戦14勝 | 出典に連勝数・年の成績なし（サンタアニタH・年度代表馬は合う） | 直さない（保留） | https://en.wikipedia.org/wiki/Round_Table_(horse) |
| ラウンドテーブル | text（5歳時） | ワシントンバースデーハンデキャップで右前脚を傷めて16着 | このレースで前脚を傷めたのは合うが、着順の出典なし。右前はその前の裂蹄で、このレースで傷めたのは「もう一方の前脚」とする記事もある | 直さない（保留） | https://drf.uky.edu/catalog/1950s/drf1959050101/drf1959050101_7_3 （検索の抜粋） |
| メルド | text（咳・仔の順番・1000ギニーの展開・フリーハンデ） | 8月に咳の病気／5番目の仔シャーロットタウン ほか | 出典が見つからない | 直さない（保留） | https://en.wikipedia.org/wiki/Meld_(horse) |
| プティトエトワール | text（2歳の休養の理由・オークスの時計） | 歩様の乱れで夏の終わりから休んだ／英ダービーより速かった | 出典に記述なし | 直さない（保留） | https://en.wikipedia.org/wiki/Petite_Etoile |
| コリン | text（2歳の相手） | フェアプレイ、ケルト、キングジェームズらを退けて | フェアプレイは合う。ケルト（同じ厩舎）・キングジェームズと走った出典は見つからない | 直さない（保留） | https://en.wikipedia.org/wiki/Colin_(horse) |
| オールアロング | text（41日間） | 41日間でこの3レースをすべて勝った初めての馬 | Wikipedia は「凱旋門賞を含む4連勝が41日間」「北米の3レースを続けて勝った初めての馬」と書く。別の出典は「北米での41日間」と書き、食い違う | 直さない（保留） | https://en.wikipedia.org/wiki/All_Along ・ https://www.americanclassicpedigrees.com/all-along-fr.html |
| ノーザンダンサー | text（コロネーションフューチュリティ） | 6馬身差 | 出典は6馬身1/4差（端数を丸めた） | 直さない（保留） | https://en.wikipedia.org/wiki/Northern_Dancer |
| スウヰイスー | text（桜花賞の時計） | 1分38秒3 | 記録は「1.38.3/5」（5分の1秒の書き方なら1分38秒6）。ja.wikipedia は1分38秒3 | 直さない（保留） | https://www.ne.jp/asahi/nagi/aflo/grade_race/oka_sho.html |
| スウヰイスー | text（相手の馬） | レダ、クインナルビーらを抑えて／タカハタを破って | 出典が見つからない | 直さない（保留） | https://ja.wikipedia.org/wiki/スウヰイスー |
| フォーエバーヤング | text（エクリプス賞の部門） | エクリプス賞最優秀古牡馬 | エクリプス賞最優秀ダート古牡馬（Older Dirt Male）か | 直さない（ja.wikipedia の本文は「最優秀ダート古牡馬」、冒頭の表は「最優秀古牡馬」で食い違う） | https://ja.wikipedia.org/wiki/フォーエバーヤング_(競走馬) |
| カランダガン | record | 17戦10勝 | 19戦10勝か | 直さない（en.wikipedia の成績表は 2026年10月17日の英チャンピオンS まで19戦10勝、同ページの infobox は 18戦、ja.wikipedia は17戦10勝で、出典が食い違う。名鑑の本文は2026年のキングジョージ2着まで書いており、そこまでで18戦） | https://en.wikipedia.org/wiki/Calandagan ・ https://ja.wikipedia.org/wiki/カランダガン |
| ダイワスカーレット | text | 2023年まで仔を産んだ | 2023年の暮れに繁殖を退いた | 直さない（ja.wikipedia では最後に生まれた仔は2021年のグランスカーレット、2022年は死産、繁殖引退は2023年12月31日。2023年に仔を産んだ記録は見当たらない） | https://ja.wikipedia.org/wiki/ダイワスカーレット |
| サクラローレル | text（年齢の表記） | デビューは4歳（当時の表記）の1月までずれ込んだ | 満年齢なら「3歳の1月」（1994年1月6日） | 直さない（「当時の表記」と断ってあるので誤りではない。満年齢にそろえるなら直す） | https://ja.wikipedia.org/wiki/サクラローレル |
| ファビラスラフイン | text | コースレコードに並ぶタイムで勝った | ja.wikipedia は「当時のコースレコードにコンマ1秒迫るタイム（1分58秒1）」 | 直さない（出典が1つだけ。直すなら「コースレコードに0秒1差のタイムで勝った」） | https://ja.wikipedia.org/wiki/ファビラスラフイン |
| ローマンレジェンド | text | 東京大賞典では直線でワンダーアキュートとの叩き合いを制して | 2012年東京大賞典の2着はハタノヴァンクール（半馬身）、ワンダーアキュートはさらにアタマ差の3着。ja.wikipedia の本文は名鑑と同じ書き方 | 直さない（誤りとまでは言えない。直すなら「ハタノヴァンクールやワンダーアキュートとの叩き合いを制して」） | https://ja.wikipedia.org/wiki/ローマンレジェンド ・ https://www.ne.jp/asahi/nagi/aflo/grade_race/tokyo_daishoten/58.html |

## 3. 合っていたもの
| 馬 | 項目 | 注 | 出典 |
|---|---|---|---|
| シーザスターズ | 全体（ほか） |  | https://ja.wikipedia.org/wiki/シーザスターズ ・ https://en.wikipedia.org/wiki/Sea_The_Stars |
| フランケル | 全体（ほか） |  | https://en.wikipedia.org/wiki/Frankel_(horse) |
| フライトライン | 全体 | デビュー戦の着差は本文13馬身半・表13馬身4分の1で、名鑑は表の値 | https://en.wikipedia.org/wiki/Flightline_(horse) ・ https://www.daily.co.jp/umaya/news/2026/07/06/0020556140.shtml |
| シガー | 全体（ほか） | ドバイWC の着差は ja.wikipedia では半馬身、en の表は4分の3馬身 | https://ja.wikipedia.org/wiki/シガー_(競走馬) |
| エネイブル | 全体 |  | https://ja.wikipedia.org/wiki/エネイブル ・ https://en.wikipedia.org/wiki/Enable_(horse) |
| マニカト | 全体（ほか） |  | https://en.wikipedia.org/wiki/Manikato |
| ブラックキャビア | 全体（ほか） | TJスミスS 2011 の1分08秒71はレースレコード | https://www.bloodstock.com.au/news/story.php?id=37125 |
| アメリカンファラオ | 全体 |  | https://en.wikipedia.org/wiki/American_Pharoah ・ https://ja.wikipedia.org/wiki/ダノンファラオ |
| ラフィアン | 全体（ほか） |  | https://en.wikipedia.org/wiki/Ruffian_(horse) |
| ゼニヤッタ | 全体 | BCクラシックの着差は ja・en の表とも頭差 | https://ja.wikipedia.org/wiki/ゼニヤッタ ・ https://en.wikipedia.org/wiki/Zenyatta |
| トレヴ | 全体 |  | https://en.wikipedia.org/wiki/Tr%C3%AAve_(horse) ・ https://ja.wikipedia.org/wiki/トレヴ |
| ウィンクス | 全体 |  | https://en.wikipedia.org/wiki/Winx_(horse) |
| アロゲート | 全体（ほか） |  | https://en.wikipedia.org/wiki/Arrogate |
| モンジュー | 全体（ほか） |  | https://en.wikipedia.org/wiki/Montjeu |
| ゴーストザッパー | 全体 |  | https://en.wikipedia.org/wiki/Ghostzapper |
| サンデーサイレンス | 全体 | 故障した脚は ja.wikipedia の本文で左前 | https://en.wikipedia.org/wiki/Sunday_Silence ・ https://ja.wikipedia.org/wiki/サンデーサイレンス |
| ジェネラス | 全体 |  | https://en.wikipedia.org/wiki/Generous_(horse) ・ https://ja.wikipedia.org/wiki/エリモハリアー |
| ホーリーブル | 全体（ほか） |  | https://en.wikipedia.org/wiki/Holy_Bull ・ https://www.americasbestracing.net/the-sport/2026-holy-bull-enduring-legacy-brilliance |
| デイラミ | 全体（ほか） |  | https://en.wikipedia.org/wiki/Daylami |
| ドバイミレニアム | 全体（ほか） |  | https://en.wikipedia.org/wiki/Dubai_Millennium |
| ザルカヴァ | 全体（ほか） |  | https://ja.wikipedia.org/wiki/ザルカヴァ ・ https://fr.wikipedia.org/wiki/Zarkava |
| ジャスティファイ | 全体 |  | https://en.wikipedia.org/wiki/Justify_(horse) |
| バーイード | 全体（ほか） |  | https://en.wikipedia.org/wiki/Baaeed ・ https://en.wikipedia.org/wiki/Hukum |
| ラムタラ | 全体 |  | https://en.wikipedia.org/wiki/Lammtarra ・ https://ja.wikipedia.org/wiki/ラムタラ |
| パントレセレブル | 全体 |  | https://en.wikipedia.org/wiki/Peintre_Celebre ・ https://ja.wikipedia.org/wiki/パントレセレブル |
| サンライン | 全体 |  | https://en.wikipedia.org/wiki/Sunline ・ https://ja.wikipedia.org/wiki/サンライン |
| インヴァソール | 全体 |  | https://en.wikipedia.org/wiki/Invasor_(horse) ・ https://ja.wikipedia.org/wiki/インヴァソール |
| ディラントーマス | 全体（record 以外） |  | https://en.wikipedia.org/wiki/Dylan_Thomas_(horse) ・ https://ja.wikipedia.org/wiki/ディラントーマス |
| デインドリーム | 全体（上の2点以外） |  | https://ja.wikipedia.org/wiki/デインドリーム （17戦8勝・2020年12月に日本へ輸入・2023年に蹄葉炎。en の情報欄の16戦7勝は古い値で、en の本文の戦績を数えると17戦8勝） |
| ゴールデンホーン | 全体 |  | https://en.wikipedia.org/wiki/Golden_Horn_(horse) |
| クラックスマン | 全体 |  | https://en.wikipedia.org/wiki/Cracksman_(horse) ・ https://ja.wikipedia.org/wiki/クラックスマン |
| イージーゴア | 全体 |  | https://en.wikipedia.org/wiki/Easy_Goer |
| ナシュワン | 全体 |  | https://en.wikipedia.org/wiki/Nashwan |
| スキップアウェイ | 全体（上の1点以外） |  | https://ja.wikipedia.org/wiki/スキップアウェイ |
| カーリン | 全体（上の2点以外） |  | https://en.wikipedia.org/wiki/Curlin |
| ゴルディコヴァ | 全体 |  | https://en.wikipedia.org/wiki/Goldikova ・ https://ja.wikipedia.org/wiki/ゴルディコヴァ |
| ハービンジャー | 全体 |  | https://en.wikipedia.org/wiki/Harbinger_(horse) ・ https://ja.wikipedia.org/wiki/ハービンジャー |
| ゴールデンシックスティ | 全体 |  | https://en.wikipedia.org/wiki/Golden_Sixty ・ https://ja.wikipedia.org/wiki/ゴールデンシックスティ |
| ムトト | 全体 |  | https://en.wikipedia.org/wiki/Mtoto ・ https://ja.wikipedia.org/wiki/ムトト |
| ソードダンサー | 全体 |  | https://en.wikipedia.org/wiki/Sword_Dancer ・ https://ja.wikipedia.org/wiki/ソードダンサー_(競走馬) |
| シンダー | 全体 |  | https://en.wikipedia.org/wiki/Sinndar |
| サキー | 全体 |  | https://en.wikipedia.org/wiki/Sakhee ・ https://ja.wikipedia.org/wiki/サキー |
| ガリレオ | 全体 |  | https://en.wikipedia.org/wiki/Galileo_(horse) |
| マカイビーディーヴァ | 全体 |  | https://en.wikipedia.org/wiki/Makybe_Diva ・ https://ja.wikipedia.org/wiki/マカイビーディーヴァ |
| ロックオブジブラルタル | 全体 |  | https://en.wikipedia.org/wiki/Rock_of_Gibraltar_(horse) ・ https://ja.wikipedia.org/wiki/ロックオブジブラルタル |
| レイチェルアレクサンドラ | 全体 |  | https://en.wikipedia.org/wiki/Rachel_Alexandra ・ https://ja.wikipedia.org/wiki/レイチェルアレクサンドラ |
| ソーユーシンク | ほかの部分 |  | https://en.wikipedia.org/wiki/So_You_Think ・ https://thoroughbredexpress.com.au/news-archives/rewilding-relentless-at-royal-ascot-2 （2011年のプリンスオブウェールズステークスはクビ差の2着） |
| カリフォルニアクローム | 全体 |  | https://en.wikipedia.org/wiki/California_Chrome ・ https://ja.wikipedia.org/wiki/カリフォルニアクローム （2016年のBCクラシックの着差は、en.wikipedia の本文が「クビ」、ja.wikipedia と報道が「半馬身」。多い方が半馬身なのでいまのままでよい） |
| ガンランナー | 全体 |  | https://en.wikipedia.org/wiki/Gun_Runner_(horse) |
| サルサビル | 全体 |  | https://en.wikipedia.org/wiki/Salsabil_(horse) |
| ジャイアンツコーズウェイ | 全体 |  | https://en.wikipedia.org/wiki/Giant%27s_Causeway_(horse) ・ https://ja.wikipedia.org/wiki/ジャイアンツコーズウェイ |
| スラマニ | 全体 |  | https://ja.wikipedia.org/wiki/スラマニ ・ https://en.wikipedia.org/wiki/Sulamani |
| ハリケーンラン | 全体 |  | https://ja.wikipedia.org/wiki/ハリケーンラン ・ https://en.wikipedia.org/wiki/Hurricane_Run |
| ブリックスアンドモルタル | 全体 |  | https://ja.wikipedia.org/wiki/ブリックスアンドモルタル |
| エースインパクト | 全体 |  | https://ja.wikipedia.org/wiki/エースインパクト ・ https://en.wikipedia.org/wiki/Ace_Impact |
| ブラッシンググルーム | 全体 |  | https://en.wikipedia.org/wiki/Blushing_Groom （1974年4月8日生・1992年5月6日没で満18歳） |
| スペンドアバック | 全体 |  | https://en.wikipedia.org/wiki/Spend_a_Buck |
| エリシオ | 全体 |  | https://ja.wikipedia.org/wiki/エリシオ ・ https://ja.wikipedia.org/wiki/ポップロック_(競走馬) （ポップロックの目黒記念は2006・2007年の2勝） |
| ファンタスティックライト | 全体 |  | https://en.wikipedia.org/wiki/Fantastic_Light ・ https://ja.wikipedia.org/wiki/ジャリスコライト （ジャリスコライトは父ファンタスティックライト、2006年京成杯） |
| ダラカニ | 全体 |  | https://en.wikipedia.org/wiki/Dalakhani （コンデュイットのBCターフは2008・2009年の2勝） |
| ガイヤース | ほかの部分 |  | https://en.wikipedia.org/wiki/Ghaiyyath |
| オーギュストロダン | ほかの部分 |  | https://en.wikipedia.org/wiki/Auguste_Rodin_(horse) ・ https://en.netkeiba.com/news/news_detail.html?id=325 （父の産駒が13世代すべてでクラシック勝ち） |
| ダリズ | 全体 |  | https://en.wikipedia.org/wiki/Daryz ・ https://www.sportinglife.com/racing/news/brilliant-daryz-doubles-up-in-arc/234648 （人の名前・家名は本文に無い。「アガ・カーン4世賞」はレース名なのでよい。「生産者の牧場」も人の名前を出していない） |
| タイムチャーター | 全体 |  | https://en.wikipedia.org/wiki/Time_Charter （1979年4月6日生・2005年7月7日没で満26歳。カジアは息子ジナードの仔） |
| レディーズシークレット | ほかの部分 |  | https://en.wikipedia.org/wiki/Lady%27s_Secret |
| ササフラ | ほかの部分 |  | https://ja.wikipedia.org/wiki/ササフラ ・ https://vault.si.com/vault/1970/10/12/one-head-that-cost-a-crown （11戦6勝・リュパン賞3着・ロワイヤルオーク賞は繰り上がり・凱旋門賞アタマ差・1988年没・産駒の名前） |
| スルーオゴールド | 全体 |  | https://en.wikipedia.org/wiki/Slew_o%27_Gold （21戦12勝・2歳3戦2勝・ダービー4着・ベルモント2着・1984年初戦7月2日は蹄の不安・100万ドルのボーナス・BCクラシックは1番人気でワイルドアゲインに1馬身足らずの2着（ゲートダンサー降着で2着）・殿堂1992年・2007年に27歳で没） |
| マニラ | ほかの部分 |  | https://en.wikipedia.org/wiki/Manila_(horse) ・ https://racingmuseum.org/node/681 （検索の要約で確認：1985年3戦0勝2着2回、18戦12勝2着5回、殿堂2008年） |
| シアトリカル | 全体 |  | https://en.wikipedia.org/wiki/Theatrical_(horse) （22戦10勝・2歳1戦1勝・英ダービー7着・愛ダービー2着・1985年BCターフ11着・1986年マニラにクビ差2着・1987年の勝ち鞍・G1勝ち馬18頭・メディアパズル） |
| キンチェム | 全体 |  | https://en.wikipedia.org/wiki/Kincsem ・ https://ja.wikipedia.org/wiki/キンチェム |
| エクリプス | 全体 | 18戦18勝・単走8回・キングズプレート11回を成績表で数えて確認 | https://en.wikipedia.org/wiki/Eclipse_(horse) |
| セントサイモン | record | 数え方の違い | https://en.wikipedia.org/wiki/St._Simon_(horse) （infobox「9:9-0-0」）・ https://ja.wikipedia.org/wiki/セントサイモン （「10戦10勝（非公式1戦含む）」と成績表） |
| セントサイモン | 全体（record 以外） | ハルネイカーS 6馬身・エプソムGCは単走・アスコットGC/グッドウッドC 20馬身・リーディング9回・母の父首位6回・クラシック勝ち馬10頭・1908年没・父系の途絶 | https://en.wikipedia.org/wiki/St._Simon_(horse) ・ https://ja.wikipedia.org/wiki/セントサイモン |
| マンノウォー | 全体 | ドワイヤーS 1馬身半・ローレンスリアライゼーション「>100 lengths」も成績表どおり | https://en.wikipedia.org/wiki/Man_o%27_War |
| リボー | 全体 |  | https://en.wikipedia.org/wiki/Ribot_(horse) ・ https://ja.wikipedia.org/wiki/リボー |
| ファーラップ | 全体 | 1930年メルボルンC 9st12lb=約62.6kg を63キロ、1931年 68.1キロは ja.wikipedia と同じ | https://en.wikipedia.org/wiki/Phar_Lap ・ https://ja.wikipedia.org/wiki/ファーラップ |
| ザテトラーク | 全体（上の2点以外） |  | https://en.wikipedia.org/wiki/The_Tetrarch |
| グラディアトゥール | 全体 | 毛色は en が鹿毛、ja が黒鹿毛。本文の黒鹿毛は ja に合う | https://ja.wikipedia.org/wiki/グラディアトゥール ・ https://en.wikipedia.org/wiki/Gladiateur |
| セクレタリアト | 全体 |  | https://en.wikipedia.org/wiki/Secretariat_(horse) |
| オーモンド | 全体 |  | https://en.wikipedia.org/wiki/Ormonde_(horse) ・ https://ja.wikipedia.org/wiki/オーモンド_(競走馬) |
| プリティーポリー | 全体 |  | https://en.wikipedia.org/wiki/Pretty_Polly_(horse) ・ https://ja.wikipedia.org/wiki/プリティーポリー |
| ダンシングブレーヴ | 全体 | 凱旋門賞の時計は en が race record、ja がコースレコード（当時） | https://en.wikipedia.org/wiki/Dancing_Brave ・ https://ja.wikipedia.org/wiki/ダンシングブレーヴ |
| シーバード | 全体 |  | https://en.wikipedia.org/wiki/Sea_Bird |
| ミルリーフ | 全体（上の1点以外） |  | https://ja.wikipedia.org/wiki/ミルリーフ |
| サイテーション | 全体 |  | https://en.wikipedia.org/wiki/Citation_(horse) |
| ブリガディアジェラード | 全体 |  | https://en.wikipedia.org/wiki/Brigadier_Gerard_(horse) ・ https://en.wikipedia.org/wiki/Light_Cavalry_(horse) |
| アレッジド | 全体（上の2点以外） | 英セントレジャー1馬身半差は Dunfermline の記事で確認 | https://ja.wikipedia.org/wiki/アレッジド ・ https://en.wikipedia.org/wiki/Dunfermline_(horse) |
| カウントフリート | 全体 |  | https://en.wikipedia.org/wiki/Count_Fleet |
| ウォーアドミラル | 全体 | 11連勝は成績表で確認 | https://en.wikipedia.org/wiki/War_Admiral |
| ドクターフェイガー | 全体 |  | https://en.wikipedia.org/wiki/Dr._Fager |
| アバーナント | 全体（上の2点以外） |  | https://en.wikipedia.org/wiki/Abernant_(horse) |
| ニジンスキー | 全体（上の1点以外） |  | https://en.wikipedia.org/wiki/Nijinsky_(horse) ・ https://ja.wikipedia.org/wiki/ニジンスキー_(競走馬) |
| バーラム | 全体 |  | https://en.wikipedia.org/wiki/Bahram_(horse) |
| ネアルコ | 全体 | リーディングの年は ja 本文で1947・1949年／1947・1948年と揺れるが「2度」は合う | https://en.wikipedia.org/wiki/Nearco ・ https://ja.wikipedia.org/wiki/ネアルコ |
| アファームド | 全体（上の1点以外） |  | https://en.wikipedia.org/wiki/Affirmed |
| バックパサー | 全体 | 1967年ウッドワードSが引退レースは ja.wikipedia で確認 | https://en.wikipedia.org/wiki/Buckpasser ・ https://ja.wikipedia.org/wiki/バックパサー |
| ネイティヴダンサー | 全体（上の1点以外） |  | https://en.wikipedia.org/wiki/Native_Dancer |
| テューダーミンストレル | 全体（上の1点以外） |  | https://en.wikipedia.org/wiki/Tudor_Minstrel |
| クリフジ | 全体（上の2点のほか） |  | https://ja.wikipedia.org/wiki/クリフジ ・ https://www.jra.go.jp/gallery/dendo/horse03/ |
| スペクタキュラービッド | 全体 |  | https://en.wikipedia.org/wiki/Spectacular_Bid |
| トキノミノル | 全体 |  | https://ja.wikipedia.org/wiki/トキノミノル |
| アイシングラス | 全体 |  | https://en.wikipedia.org/wiki/Isinglass_(horse) |
| ダイヤモンドジュビリー | 全体 |  | https://en.wikipedia.org/wiki/Diamond_Jubilee_(horse) |
| シンボリルドルフ | 全体 |  | https://ja.wikipedia.org/wiki/シンボリルドルフ |
| シンザン | 全体 |  | https://ja.wikipedia.org/wiki/シンザン |
| フォアゴー | 全体 |  | https://en.wikipedia.org/wiki/Forego |
| ダマスカス | 全体 |  | https://en.wikipedia.org/wiki/Damascus_(horse) ・ https://www.americasbestracing.net/the-sport/2023-damascus-brilliant-unforgettable-horse-racing-champion |
| ミエスク | 全体 |  | https://en.wikipedia.org/wiki/Miesque |
| パーソナルエンスン | 全体 |  | https://en.wikipedia.org/wiki/Personal_Ensign |
| リファレンスポイント | 全体 |  | https://en.wikipedia.org/wiki/Reference_Point_(horse) |
| サンチャリオット | 全体（上の1点のほか） |  | https://ja.wikipedia.org/wiki/サンチャリオット ・ https://en.wikipedia.org/wiki/Sun_Chariot_(horse) |
| ケルソ | 全体（上の1点のほか） |  | https://en.wikipedia.org/wiki/Kelso_(horse) ・ https://www.theracingbiz.com/2021/01/15/memorable-moments-kelso-wins-the-international/ |
| シアトルスルー | 全体 |  | https://en.wikipedia.org/wiki/Seattle_Slew |
| シービスケット | 全体（上の2点のほか） |  | https://en.wikipedia.org/wiki/Seabiscuit |
| バヤルド | 全体（上の2点のほか） |  | https://en.wikipedia.org/wiki/Bayardo_(horse) |
| ボールドルーラー | 全体 |  | https://en.wikipedia.org/wiki/Bold_Ruler |
| シャーガー | 全体 |  | https://en.wikipedia.org/wiki/Shergar |
| ジョンヘンリー | 全体 | 引退の理由は en.wikipedia が「左前の靭帯」、ja.wikipedia が「右前の屈腱炎の再発」で食い違うが、名鑑は ja に合う | https://ja.wikipedia.org/wiki/ジョンヘンリー ・ https://en.wikipedia.org/wiki/John_Henry_(horse) |
| キングストンタウン | 全体 |  | https://en.wikipedia.org/wiki/Kingston_Town_(horse) |
| エルグランセニョール | 全体 |  | https://en.wikipedia.org/wiki/El_Gran_Senor ・ https://en.wikipedia.org/wiki/Empire_Maker |
| ザフライングダッチマン | 全体（上の2点のほか） |  | https://en.wikipedia.org/wiki/The_Flying_Dutchman_(horse) |
| トムフール | 全体（上の2点のほか） |  | https://en.wikipedia.org/wiki/Tom_Fool_(horse) |
| アレフランス | 全体 |  | https://en.wikipedia.org/wiki/Allez_France ・ https://ja.wikipedia.org/wiki/アレフランス |
| ヴェイグリーノーブル | 全体（上のほか） |  | https://en.wikipedia.org/wiki/Vaguely_Noble |
| ダリア | 全体（上の1点のほか） |  | https://en.wikipedia.org/wiki/Dahlia_(horse) |
| マルゼンスキー | 全体（上の1点のほか） | 朝日杯の着差は本文13馬身・成績表「大差」でどちらでも外れない | https://ja.wikipedia.org/wiki/マルゼンスキー |
| ドミノ | 全体（ほか） |  | https://en.wikipedia.org/wiki/Domino_(horse) ・ https://www.teamvalor.com/Library/Domino.pdf |
| カーバイン | 全体（ほか） |  | https://en.wikipedia.org/wiki/Carbine_(horse) |
| アジャックス | 全体（ほか） |  | https://en.wikipedia.org/wiki/Ajax_II |
| タマモクロス | 全体（ほか） |  | https://ja.wikipedia.org/wiki/タマモクロス |
| アリシーバ | 全体 |  | https://en.wikipedia.org/wiki/Alysheba ・ https://www.derbymuseum.org/Blog/Article/265/Countdown-to-the-Kentucky-Derby-32-Days-to-Go |
| ロイヤルパレス | 全体 |  | https://en.wikipedia.org/wiki/Royal_Palace_(horse) |
| アリダー | 全体 | ユースフルSの着順は Wikipedia の表に5着とあるが表の書き方が乱れている | https://en.wikipedia.org/wiki/Alydar |
| ラウンドテーブル | 全体（ほか） |  | https://en.wikipedia.org/wiki/Round_Table_(horse) ・ https://www.americasbestracing.net/the-sport/2020-round-table-champion-the-turf |
| メルド | 全体（ほか） |  | https://fr.wikipedia.org/wiki/Meld ・ https://en.wikipedia.org/wiki/Meld_(horse) |
| トウショウボーイ | 全体 |  | https://ja.wikipedia.org/wiki/トウショウボーイ |
| プティトエトワール | 全体（ほか） |  | https://en.wikipedia.org/wiki/Petite_Etoile ・ https://en.wikipedia.org/wiki/Zarkava |
| グランディ | 全体 |  | https://en.wikipedia.org/wiki/Grundy_(horse) |
| サーアイヴァー | 全体 |  | https://en.wikipedia.org/wiki/Sir_Ivor |
| トロイ | 全体 |  | https://en.wikipedia.org/wiki/Troy_(horse) |
| エクセラー | 全体 |  | https://en.wikipedia.org/wiki/Exceller |
| コリン | 全体（ほか） |  | https://en.wikipedia.org/wiki/Colin_(horse) ・ https://en.wikipedia.org/wiki/Commando_(horse) |
| ファラリス | 全体 |  | https://en.wikipedia.org/wiki/Phalaris_(horse) ・ https://tbheritage.com/Portraits/Phalaris.html |
| オールアロング | 全体（ほか） |  | https://en.wikipedia.org/wiki/All_Along ・ https://en.wikipedia.org/wiki/1984_Prix_de_l%27Arc_de_Triomphe |
| ノーザンダンサー | 全体（ほか） |  | https://en.wikipedia.org/wiki/Northern_Dancer ・ https://en.wikipedia.org/wiki/Belmont_Stakes_top_three_finishers |
| スウヰイスー | 全体（ほか） |  | https://ja.wikipedia.org/wiki/スウヰイスー |
| テンポイント | 全体（ほか） |  | https://ja.wikipedia.org/wiki/テンポイント |
| ミスターシービー | 全体 |  | https://ja.wikipedia.org/wiki/ミスターシービー |
| タケシバオー | 全体 |  | https://ja.wikipedia.org/wiki/タケシバオー |
| ザミンストレル | 全体（ほか） |  | https://en.wikipedia.org/wiki/The_Minstrel |
| カブラヤオー | 全体 |  | https://ja.wikipedia.org/wiki/カブラヤオー |
| エクスターミネーター | 全体 | 99戦は公式の出走数。ほかに単走の1回がある | https://en.wikipedia.org/wiki/Exterminator_(horse) |
| ロマンチックウォリアー | 全体 |  | https://ja.wikipedia.org/wiki/ロマンチックウォリアー_(競走馬) |
| フォーエバーヤング | 全体（ほか） | 16戦12勝・全日本2歳優駿7馬身差・KYダービーはクビ差3着で連勝5で止まる・BCクラシック半馬身・2026年サウジカップ史上初の連覇・JCGC は海外G1の4勝目で日本調教馬の最多・獲得賞金50億円超 | https://ja.wikipedia.org/wiki/フォーエバーヤング_(競走馬) |
| ディープインパクト | 全体 |  | https://ja.wikipedia.org/wiki/ディープインパクト_(競走馬) |
| オルフェーヴル | 全体 |  | https://ja.wikipedia.org/wiki/オルフェーヴル |
| アーモンドアイ | 全体 |  | https://ja.wikipedia.org/wiki/アーモンドアイ |
| イクイノックス | 全体 | 「キャリア6戦での有馬記念制覇は史上最短」・顕彰馬2025年・種付料2000万円も一致 | https://ja.wikipedia.org/wiki/イクイノックス |
| ナリタブライアン | 全体 |  | https://ja.wikipedia.org/wiki/ナリタブライアン |
| エルコンドルパサー | 全体 |  | https://ja.wikipedia.org/wiki/エルコンドルパサー |
| テイエムオペラオー | 全体 |  | https://ja.wikipedia.org/wiki/テイエムオペラオー |
| ロードカナロア | 全体 | 2013年高松宮記念は成績表に R＝レコードの印 | https://ja.wikipedia.org/wiki/ロードカナロア |
| キタサンブラック | 全体 |  | https://ja.wikipedia.org/wiki/キタサンブラック |
| オグリキャップ | 全体 |  | https://ja.wikipedia.org/wiki/オグリキャップ |
| キングカメハメハ | 全体 | 顕彰馬2024年・ダービーは従来レコードを2秒更新も一致 | https://ja.wikipedia.org/wiki/キングカメハメハ |
| ハーツクライ | 全体 |  | https://ja.wikipedia.org/wiki/ハーツクライ |
| リスグラシュー | 全体 | 宝塚記念と有馬記念の両方を勝った牝馬はそれまでいない | https://ja.wikipedia.org/wiki/リスグラシュー |
| タイキシャトル | 全体 |  | https://ja.wikipedia.org/wiki/タイキシャトル |
| サイレントウィットネス | 全体 |  | https://ja.wikipedia.org/wiki/サイレントウィットネス ・ https://en.wikipedia.org/wiki/Silent_Witness_(horse) |
| シンボリクリスエス | 全体 |  | https://ja.wikipedia.org/wiki/シンボリクリスエス |
| ウオッカ | 全体 |  | https://ja.wikipedia.org/wiki/ウオッカ_(競走馬) |
| ゴールドシップ | 全体 |  | https://ja.wikipedia.org/wiki/ゴールドシップ |
| グランアレグリア | 全体 |  | https://ja.wikipedia.org/wiki/グランアレグリア |
| カランダガン | 全体（ほか） |  | https://en.wikipedia.org/wiki/Calandagan |
| クロフネ | 全体 | デビュー戦は2着、2戦目の新馬とエリカ賞がレコード。本文の「新馬戦を勝ったあとエリカ賞まで2戦続けてレコード」は矛盾しない | https://ja.wikipedia.org/wiki/クロフネ |
| ダイワスカーレット | 全体（ほか） |  | https://ja.wikipedia.org/wiki/ダイワスカーレット |
| ジェンティルドンナ | 全体 |  | https://ja.wikipedia.org/wiki/ジェンティルドンナ |
| トウカイテイオー | 全体 | JC は「日本調教馬として最初の国際G1競走優勝馬」と ja.wikipedia にある | https://ja.wikipedia.org/wiki/トウカイテイオー |
| シングスピール | 全体（ほか） | 5か国＝英・仏・加・日・UAE、BCターフ前日の右前脚骨折は ja.wikipedia どおり | https://ja.wikipedia.org/wiki/シングスピール |
| グラスワンダー | 全体 | 2025年8月に30歳で死亡も一致 | https://ja.wikipedia.org/wiki/グラスワンダー |
| スペシャルウィーク | 全体 |  | https://ja.wikipedia.org/wiki/スペシャルウィーク |
| ファルブラヴ | 全体（ほか） | 26歳は ja.wikipedia の表記どおり | https://ja.wikipedia.org/wiki/ファルブラヴ ・ https://en.wikipedia.org/wiki/Falbrav |
| ゼンノロブロイ | 全体 |  | https://ja.wikipedia.org/wiki/ゼンノロブロイ |
| モーリス | 全体 |  | https://ja.wikipedia.org/wiki/モーリス_(競走馬) |
| メジロマックイーン | 全体 |  | https://ja.wikipedia.org/wiki/メジロマックイーン |
| ビワハヤヒデ | ほか全体 |  | https://ja.wikipedia.org/wiki/ビワハヤヒデ |
| エアグルーヴ | 全体 |  | https://ja.wikipedia.org/wiki/エアグルーヴ |
| スマートファルコン | 全体 |  | https://ja.wikipedia.org/wiki/スマートファルコン |
| ブエナビスタ | 全体 | 「19戦続けて1番人気」は JRA の競走だけの数。間のドバイの2戦は数えていない | https://ja.wikipedia.org/wiki/ブエナビスタ_(競走馬) |
| スノーフェアリー | 全体 |  | https://ja.wikipedia.org/wiki/スノーフェアリー |
| ジャスタウェイ | 全体 |  | https://ja.wikipedia.org/wiki/ジャスタウェイ |
| ドゥラメンテ | 全体 |  | https://ja.wikipedia.org/wiki/ドゥラメンテ |
| ラヴズオンリーユー | 全体 |  | https://ja.wikipedia.org/wiki/ラヴズオンリーユー |
| エフフォーリア | 全体 |  | https://ja.wikipedia.org/wiki/エフフォーリア |
| タイトルホルダー | 全体 |  | https://ja.wikipedia.org/wiki/タイトルホルダー |
| サクラバクシンオー | 全体 |  | https://ja.wikipedia.org/wiki/サクラバクシンオー |
| ミホノブルボン | ほか全体 | 「28歳」は年の数え方〔2017−1989〕で、ゲームの他の馬と同じ | https://ja.wikipedia.org/wiki/ミホノブルボン |
| サクラローレル | ほか全体 |  | https://ja.wikipedia.org/wiki/サクラローレル |
| サイレンススズカ | 全体 |  | https://ja.wikipedia.org/wiki/サイレンススズカ |
| ジャングルポケット | 全体 |  | https://ja.wikipedia.org/wiki/ジャングルポケット_(競走馬) |
| ドウデュース | ほか全体 |  | https://ja.wikipedia.org/wiki/ドウデュース |
| メイショウマンボ | 全体 | 31戦の表で、最後が2017年4月の阪神牝馬ステークス14着・引退して生まれた牧場で繁殖 | https://ja.wikipedia.org/wiki/メイショウマンボ |
| イシノヒカル | 全体 | 菊花賞の着差は ja.wikipedia の本文が「1馬身半」、成績表が「1 1/4身」。名鑑は表の方に合っている | https://ja.wikipedia.org/wiki/イシノヒカル |
| ヒカリデュール | ほか全体 |  | https://ja.wikipedia.org/wiki/ヒカリデユール |
| テンメイ | 全体 | 中央36戦6勝・地方26戦7勝、最後は1982年8月のシアンモア記念4着 | https://ja.wikipedia.org/wiki/テンメイ ・ https://www.jbis.or.jp/horse/0000069408/record/ |
| スリープレスナイト | ほか全体 |  | https://ja.wikipedia.org/wiki/スリープレスナイト |
| ケイティブレイブ | 全体 |  | https://ja.wikipedia.org/wiki/ケイティブレイブ |
| ウインマリリン | 全体 | 最後は2023年有馬記念7着、2025年にタイトルホルダーとの初仔 | https://ja.wikipedia.org/wiki/ウインマリリン |
| サウンドトゥルー | 全体 | 最後は2021年2月17日の金盃3着、3月に調教中の骨折 | https://ja.wikipedia.org/wiki/サウンドトゥルー |
| メリーナイス | 全体 |  | https://ja.wikipedia.org/wiki/メリーナイス |
| ファビラスラフイン | ほか全体 |  | https://ja.wikipedia.org/wiki/ファビラスラフイン |
| ローマンレジェンド | ほか全体 |  | https://ja.wikipedia.org/wiki/ローマンレジェンド |
| ノンコノユメ | 全体 |  | https://ja.wikipedia.org/wiki/ノンコノユメ |
| レシステンシア | 全体 |  | https://ja.wikipedia.org/wiki/レシステンシア_(競走馬) |
| グレープブランデー | 全体 |  | https://ja.wikipedia.org/wiki/グレープブランデー |
| ユーバーレーベン | 全体 |  | https://ja.wikipedia.org/wiki/ユーバーレーベン |
| トウケイニセイ | 全体 | デビューは1989年9月30日の水沢 | https://ja.wikipedia.org/wiki/トウケイニセイ |
| ホスピタリティ | 全体 |  | https://ja.wikipedia.org/wiki/ホスピタリテイ |

## 確かめられなかったもの
- 馬として確かめられなかったものは無い。
- 細部で出典が見つからなかったもの・出典どうしが食い違うものは、2. の表に「直さない」で残した。主なもの：
  - ディラントーマスの通算の戦数（20戦か18戦か）・デイラミの通算（21戦か19戦か）・カランダガンの通算（17戦か19戦か）
  - 着差の食い違い：シーザスターズ（エクリプスS）・デインドリーム・スキップアウェイ・カーリン（BCクラシック）・キンチェム・アファームド（ベルモントS）・クリフジ
  - 出典に書いていない細部：ドミノのメイトロンSの時計、シービスケットのデビュー戦の距離と斤量、ニジンスキーのダービーの時計の順位、ダリアの G1 の勝ち数など
  - ササフラが種牡馬になった国（en：アイルランド／ja：イギリス）
  - ローマンレジェンドの東京大賞典の相手（2着はハタノヴァンクール、ワンダーアキュートはアタマ差の3着。三つどもえの叩き合いなので名鑑の文を誤りとまではしない）
  - セントサイモン：名鑑の戦績は 9戦9勝（公式戦。10月21日に直した）。ja.wikipedia の「10戦10勝」は非公式の試走のマッチを含む数で、名鑑のままでよい。
