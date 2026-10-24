# v9 の手本と出典

2026-10-25 JST、持ち主が再添付し「走りはこれ」と指定した走り/歩き2動画を正本とする。走りは240×144・33fps・15コマ、歩きは176×144・100fps・130コマ。再添付は以前の2本とSHA一致。原画/原動画を配布せず、依頼で許可された輪郭線と観察点だけを同梱する。由来はowner-example-provenance.json。

v8の首長/頭比/うなじ高さの数値目標は全撤回。v7の旧比率目安も合否基準へ戻さない。下記の実馬PD資料は補助資料で、特定の首長や16m/s完全一致の証明ではない。

旧依頼文の有料12コマ原画は未取得。動画から選ぶ12コマは、その有料原画と同一とは説明しない。駈歩は3拍子の脚順を保ち、指定された走り動画から首頭の運びを参考にする。歩きは斜め投影の限界を明記し、横からの完全一致を主張しない。

# v7 の実馬資料と読み取り

2026-10-24。数値目標だけを当てはめるのではなく、立ち姿の頭頸胴の量感と、連続写真の支持/収縮/浮遊の位相を造形・描画と照合する。

## 配布に使う実馬写真

1. **立ち姿のサラブレッド**: William Ridgeway, *The origin and influence of the thoroughbred horse*, Cambridge University Press, 1905, 図129 “Irish Thoroughbred Stallion”, p.415。University of California Libraries のスキャン。
   - https://archive.org/details/origininfluenceo00ridgrich/page/414/mode/2up
   - メタデータ https://archive.org/metadata/origininfluenceo00ridgrich
   - アーカイブの記録: `possible-copyright-status: NOT_IN_COPYRIGHT`, `copyright-region: US`, publication 1905。著者1853–1926。`thoroughbred-book-metadata.json` に取得記録を保存。
   - `thoroughbred-stand-page.jpg` はPDFの435ページ目を2000pxで描画したもの。`thoroughbred-stand-pd.jpg` は図の矩形切り出しと90°回転のみ。縦横別の伸縮・輪郭補正は行っていない。
   - 首は胸から立ち上がる太い三角形、喉へ細くつながり、長い細い棒には見えない。ただしこの一頭は全サラブレッドの統計的平均ではない。毛色・体格の多様性は残る。
2. **走りの連続写真**: Eadweard Muybridge, *Animal Locomotion*, plate 626, 1887, “A galloping horse and rider”。Wellcome Collection。
   - https://wellcomecollection.org/works/uwc8xuuu
   - metadata https://api.wellcomecollection.org/catalogue/v2/works/uwc8xuuu?include=items
   - IIIF https://iiif.wellcomecollection.org/presentation/v2/b11860613
   - 所蔵館のライセンス: **Public Domain Mark**。`wellcome-work-gallop.txt`, `muybridge-gallop-manifest.json` に記録。
   - `muybridge-gallop-pd.jpg` はIIIFから取得した3000px版。16コマから見える前肢支持→収縮/浮遊→伸長を参照。撮影速度や品種がこの所蔵情報だけから確定するわけではなく、16m/sの現代サラブレッドの測定値とは扱わない。
   - v7との対比は、写真の原番号を保持し、必要なら左右反転を明記する。モデルの脚順と原写真を厳密に同時刻で重ねた検証ではなく、姿勢位相をそろえる視覚資料。

## 頭・首・胴の安定の研究

Dunbar et al. (2008), *Stabilization and mobility of the head, neck and trunk in horses during overground locomotion: comparisons with humans and other primates*, PMC2768006。
https://pmc.ncbi.nlm.nih.gov/articles/PMC2768006/
NCBI BioC原文: https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_xml/PMC2768006/unicode

`pmc-bioc.txt` と `stability-extracted.txt` は原文と抽出。通常PMCページがchallengeを返したため、NCBIが公開するBioC APIを利用。

- 対象は3頭、walk約1.06m/s・trot2.32m/s・canter5.82m/s。**16m/sの競走ギャロップを直接測った論文ではない。**
- pitch方向の空間安定を主に調べており、頭の位置が完全に静止するとは述べていない。canterの頭の鉛直変位は平均23±5cm、頭のpitch幅10±4°、胴8±1°。
- 胴が大きく揺れ、首が必ず大角度で完全補償するという仮説を、そのまま研究の実測結論としない。頭・首・胴を独立に測り、世界に対する頭の角度と鉛直位置の両方を報告する。
- v7では胴の前後ピッチをv6より分かりやすくし、頭の姿勢変化を抑えるが、数値や位相の一致を実馬への完全適合と呼ばない。

## 体形の解説

Horse Extension, “Relating Form to Function: The Horse's Neck”:
https://horses.extension.org/relating-form-to-function-horses-neck/
本文を取得できた。理想の上線（poll→withers）と下線（throatlatch→neck-shoulder junction）の比をおよそ2:1とする。肩の傾斜によって比は変わることも明記している。`neck.html` を保存。

依頼文のミネソタ大学/Wikipediaは今回の取得で403/challengeになり、本文確認済みとは扱わない。頭:首上線=約2:3は依頼の目安として扱い、未取得ページを読んだかのように引用しない。

## 利用者からの動画

2本とも実写ではなく、横からのスタイライズCGのギャロップ（15コマ/0.4545秒）と斜め前のCG常歩（1.3秒）。低頭のWalk、太い付け根、胴と首の位相の希望を理解するためだけに使う。出所不明のため動画・その抽出画像は納品ZIP/リポジトリには含めない。実馬の証拠とCGの動作見本を区別する。

## 配布する取得記録

原典本文・NCBI BioC全文・書籍PDF/全OCRは作業場での調査用とし、配布には含めない。納品には必要なPD写真/元ページ/取得メタデータ、原典へのURLと本書の要約を含める。本文取得できなかったページを確認済みとは記載しない。未知のCG動画と抽出画像も配布しない。
