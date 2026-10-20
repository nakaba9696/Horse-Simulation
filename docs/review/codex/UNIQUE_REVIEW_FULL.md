# Claudeへ渡すレビュー全文（固有50頭・本文同梱）

この1ファイルに引継ぎ文と全50頭の個別評価を収録しています。別ファイルのUNIQUE_REVIEW.mdを要求せず、このファイルの「全50頭の個別評価」を本文として読んでください。コード・データの修正依頼ではありません。出典リンクは対象コミットのGitHub URLです。外部史実の裏取りは未完了です。

# Claude向け：固有50種の再評価の引継ぎ

対象：nakaba9696/Horse-Simulation、claude/lucid-ptolemy-j204a3、commit `3083ce9b24356236407f6cc053cf726a86da5fa9`。

このファイルの後半に、`UNIQUE_REVIEW.md` の全50頭の評価本文を収録しています。各頭について、現在の技名・条件・効果、同梱資料の根拠、評価、調整案、命名の出典確認状況、該当ファイルと行番号、既存パッシブ・通常発動を分けて記載しています。

## 実施済み

- 全50種の「その馬らしさ」を同梱名鑑と実装に照らして評価。維持候補34、調整候補13、資料不足3。
- JSの条件に人工状態を入れた24ケースを確認。Godot書き出し済みの固有50件はJS定義と完全一致。
- JSの条件・適用箇所とGodot/C++の対応箇所を静的確認。コード・データ変更なし。

## 調整候補13頭

| 馬 | 見直す点 |
|---|---|
| エクリプス | 独走という根拠から、後方全馬のスタミナを削る効果まで導くのは飛躍。演出と史実を分ける |
| ファーラップ | 57kgという閾値では重斤量の個性が弱い。出遅れ救済と重斤量対応を分けて設計する余地 |
| オルフェーヴル | 後方にいるだけでE回復では、まくり・巻き返しの個性が弱い。既存の掛かり癖や通常加速は別に存在 |
| ゴールデンシックスティ | 技名はマイラーだが距離制限なし。先頭3馬身以内に限定する根拠も要確認 |
| ディープインパクト | 直線後ろ3頭以内に限定し、早め進出を支えない。一方3頭立てでは先頭でも成立。通常発動による固有速度の上書きもある |
| シーバード | 凱旋門賞の競り合いには合うが、接戦必須では余裕の抜け出しを拾えない。代表一戦を主題にするか決める |
| スペクタキュラービッド | 重斤量の根拠はあるが、出遅れ救済の根拠は同梱資料にない。レコードの速さもE回復だけでは弱い |
| プリティーポリー | 先頭では不発・先頭から1馬身未満の追う側だけ。大差勝ちや逃げ切りと主題がずれる |
| サイテーション | 100万ドル到達という長期実績と、接戦で追う側限定の効果が直接つながらない |
| マニカト | マイル級実績も名鑑にあるが1400m超では不発。短距離だけを主題にするか見直す |
| ケルソ | 出遅れ救済の根拠が不足。ファーラップ・スペクタキュラービッドと条件・効果が完全同一 |
| シャーガー | 圧勝型なのに直線入口で先頭なら不発。実際のダービー入口順位は未確認 |
| ナリタブライアン | 大差勝ちを根拠にする一方、先頭や3馬身以上離れた場面では不発。阪神大賞典の接戦を主題にするなら根拠文も合わせる |

資料不足3頭：ミルリーフ、ウィンクス、トレヴ。速さ・強さの記述だけでは、現在の細かな順位条件を支持できないため、代表レースの映像・通過順位を確認したい。

他の34頭も無条件の承認ではありません。本文に技名の出典待ち、代表一戦への限定、通常発動との重複などを記載しています。

## 未完了・次にしてほしいこと

このセッションにはWeb検索ツールがなく、公式サイトへの直接取得も403でした。**外部史実の裏取り済みは0頭です。** 他作品の評価も未取得で、根拠にしていません。

1. 検索・閲覧が利用できる環境で、代表レースの公式結果、映像、当事者証言、異名の原典を確認する。
2. 「その馬の代表一戦を再現する技」か「キャリア全体の走り方を表す技」かを明示し、混同せず全50頭を再判定する。
3. 名称を史実上の異名として扱うなら出典を付ける。未確認の評価語は、馬名・具体的なレースや数字由来の命名案と区別する。
4. 各提案は設計案。コード・データの修正はまだ行わず、採否と根拠を整理する。

補助ファイル：`unique-review.json`（全50件の入力・評価・参照）、`unique-probe.cjs` / `unique-probe-results.json`（24ケース）、`REVIEW_FOLLOWUP.md`（前回続報）。本文だけでも個別評価は読めます。


---

# 固有50種の「その馬らしさ」レビュー

対象 `claude/lucid-ptolemy-j204a3` / `3083ce9b24356236407f6cc053cf726a86da5fa9`。2026-10-21 JST。コード・データ変更なし。

**全50種の設計レビューを実施した。史実の外部裏取りは未完了。** ここでの「維持候補」は同梱名鑑と実装の対応に基づく判断で、外部原典で正しいと認定した意味ではない。「調整候補」は表現・条件の見直し案、「資料不足」は名鑑に通過順位等がなく条件の妥当性を決められないもの。すべての史実上の異名も外部出典確認は未完了。

集計：調整候補 13頭、維持候補 34頭、資料不足 3頭。各行の「根拠」は内部資料。原文データと個別評価は [unique-review.json](unique-review.json)、機能確認は [unique-probe-results.json](unique-probe-results.json)。

## 優先する見直し案

1. **圧勝型なのに先頭で発動しない**：シャーガー、ナリタブライアン、プリティーポリー、サイテーション。前者は入口2〜4番手限定、後者3頭は追う側限定。圧勝の史実記述から条件が直接導けていない。実際の代表レースで不発だったとは未確認のため断定しない。
2. **型が一戦に寄りすぎる**：ディープインパクトの直線後方3頭以内、オルフェーヴルの後方でEを戻すだけの型。後方からの順位上昇や持続的な進出を含める案。既存の通常発動や弱点もあるため、馬全体にその特徴が未実装とは言わない。
3. **同型の使い回しの根拠が薄い**：ファーラップ、スペクタキュラービッド、ケルソは同じheavyOrLate＋E0.04。後2頭の出遅れ救済は同梱根拠から導けない。重斤量、長距離持続、速さをそれぞれの主題に分ける案。
4. **距離と名称の対応**：ゴールデンシックスティはマイラーという技名だが距離制限なし。マニカトはマイル級の名鑑記述がある一方1400m超で不発。基礎適性の減点とは別に、何を固有で表すかを決める。
5. **名前の出典**：地域＋女王・王・至宝という評価語や馬名の翻訳を、実在の異名として未確認のまま扱わない。data/uniques.js冒頭の命名規則に従い、異名としての出典がなければ馬名・個別のレースや数字に由来する名前へ寄せる案。名前案自体を史実上の呼称とは呼ばない。

## 効果の読み方と共通の制限

- 出典：[js/core/skills.js:107](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/js/core/skills.js#L107)、[js/core/skills.js:149](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/js/core/skills.js#L149)、[js/core/skills.js:181](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/js/core/skills.js#L181)、[js/core/skills.js:239](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/js/core/skills.js#L239)。Godotは [godot/core/hs_skills.gd:105](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/godot/core/hs_skills.gd#L105) / [godot/core/hs_skills.gd:283](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/godot/core/hs_skills.gd#L283)、C++は [godot/native/src/hs_skills.cpp:150](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/godot/native/src/hs_skills.cpp#L150) / [godot/native/src/hs_skills.cpp:312](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/godot/native/src/hs_skills.cpp#L312) / [godot/native/src/hs_sim.cpp:585](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/godot/native/src/hs_sim.cpp#L585)。
- 以下の条件表はwhenとatの両方を満たす必要がある。st判定の入口は直線長+30mからで、個別条件がinStraightを要求すれば実際の直線に入るまで待つ。
- SPDは目標速度の倍率に加える割合。Eは正規化した残スタミナへの加算で、長期の健康やレース後の疲労回復ではない。topは終いの上限への加算で、脚がなければ万能の加速にはならない。
- freeは追加速度に伴う消耗を補償する処理であり、その間すべてのスタミナ消耗がゼロになるという意味ではない。各固有は1レース1回。
- 固有が先に処理され、後の通常発動のSPDで上書きされる場合がある。E/topは別処理。ディープインパクトの例は [前回続報](REVIEW_FOLLOWUP.md) と probe-results.json を参照。
- closeは縦差1.2m未満・進路差1.6未満の近接。相手は首位や2着馬に限らない。neckという条件名でも着差のクビ差を直接判定していない。
- led600は残600〜300mのどこかで先頭になった記録。最初から先頭、600m地点だけの先頭、連続先頭の意味ではない。wallForは直線の壁時間の累積で、連続0.6秒に限らない。
- 技の数値強度の最適化・全馬の勝率比較は今回の対象外。着差や勝率から速度+何%・何秒を一意に決めることはできない。

## 全50頭の個別評価

### 01. エクリプス — エクリプス・ファースト（調整候補）

- **現在**：leadStraight / at=st。直線入口30m内・先頭。速度+5%・5秒／後方の他馬E-0.04／free。
- **内部根拠**：「エクリプスが1着、ほかは影もない」の言葉が生まれた。18戦18勝のうち8回は相手のいない単走
- **評価**：独走の表現は合うが、相手の脚を一律に奪う効果までを史実の性質とは扱えない。
- **提案**：先頭から引き離す自馬の持続力を中心にする案。foeEを残すなら威圧感のゲーム上の演出と明記。
- **技名**：「Eclipse first, the rest nowhere」に由来する名鑑記述と対応。原文・訳の確認待ち。
- **該当資料**：[data/profiles.js:15](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L15)、[data/uniques.js:10](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L10)。
- **馬全体の補足**：脚質 逃げ、パッシブ big、通常発動 startdash・genwaku・nimai・nebari。

### 02. キンチェム — ハンガリーの奇跡（維持候補）

- **現在**：duelEnd / at=st。残300m未満で近接。速度+5%・3秒／E+0.04／free。
- **内部根拠**：54戦54勝。バーデン大賞で同着になり、走り直しの決勝で6馬身差をつけた
- **評価**：同着後の再戦という名鑑の出来事に、競り合い時の回復と加速が対応する。無敗だから常時勝つという表現にもしていない。
- **提案**：固有は接戦での底力として維持。連戦・遠征の丈夫さはhealth・疲労や既存のど根性・折り合い上手と分けて扱う。
- **技名**：ハンガリーに結びつく名称。通用する異名かは未確認。
- **該当資料**：[data/profiles.js:17](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L17)、[data/uniques.js:13](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L13)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 dokonjo・oriai・startdash・yonkaku。

### 03. セントサイモン — 煮えたぎる蒸気機関車（維持候補）

- **現在**：longStraight / at=st。2400m以上・直線入口30m内。速度+3%・4秒／E+0.04／free。
- **内部根拠**：長い距離のアスコットゴールドカップとグッドウッドカップを、どちらも20馬身差で勝った
- **評価**：2400m以上の直線で回復と持続加速。名鑑の長距離大差勝ちと方向が一致する。
- **提案**：維持案。激しい気性は既存の掛かり癖が担うので、固有に追加の暴走や弱点を必須としない。
- **技名**：蒸気機関車という異名の一次出典を確認する。
- **該当資料**：[data/profiles.js:19](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L19)、[data/uniques.js:16](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L16)。
- **馬全体の補足**：脚質 先行、パッシブ big・kakari、通常発動 startdash・yonkaku・demuchi・nebari。

### 04. オーモンド — 英国の至宝（維持候補）

- **現在**：neck / at=st。残100m未満で近接。速度+6%・2.5秒／free。
- **内部根拠**：喘鳴症が重くなった4歳でも、ハードウィックステークスで首差に競り勝ち、16戦16勝のまま引退した
- **評価**：喘鳴症を抱えた4歳時のハードウィックSの接戦という、特定の場面に対応する。
- **提案**：残100mの競り合いで維持案。病気そのものを回復能力の根拠にしない。
- **技名**：「英国の至宝」が史実上の異名かは未確認。
- **該当資料**：[data/profiles.js:21](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L21)、[data/uniques.js:19](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L19)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 startdash・yonkaku・demuchi・nebari。

### 05. マンノウォー — ビッグレッド（維持候補）

- **現在**：leadMid / at=mid。直線前・中間点以降・先頭。E+0.06／top+0.2。
- **内部根拠**：「ビッグレッド」と呼ばれた。ベルモントステークスは20馬身差の世界レコード、ローレンスリアライゼーションステークスは100馬身を超える差
- **評価**：先頭に立った道中後半で脚を残し、終いの上限を上げる。逃げ脚質と大差勝ちの名鑑に整合する。
- **提案**：維持案。ただし中間点を先頭で通過する必須条件ではなく、中間点以降に先頭へ出ても発動する説明にする。
- **技名**：Big Redは名鑑に記載。外部原文は未確認。
- **該当資料**：[data/profiles.js:23](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L23)、[data/uniques.js:22](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L22)。
- **馬全体の補足**：脚質 逃げ、パッシブ big、通常発動 startdash・genwaku・nimai・nebari。

### 06. ファーラップ — レッドテラー（調整候補）

- **現在**：heavyOrLate / at=mid。直線前400mの区間で、出遅れまたは斤量57kg以上。E+0.04。
- **内部根拠**：63キロを背負ってメルボルンカップを3馬身差で勝ち、メキシコでは出遅れながらコースレコードで勝った
- **評価**：重斤量に耐えたこと、出遅れからの巻き返しの両方は名鑑に根がある。一方57kgは63kg級の逸話を識別しにくい。
- **提案**：重斤量への強さを主題にし、レース内の相対斤量や十分重い斤量を条件にする案。出遅れ救済は別の逸話として残すか検討。具体的な閾値は未決。
- **技名**：Red Terrorは名鑑に訳語と原語あり。
- **該当資料**：[data/profiles.js:35](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L35)、[data/uniques.js:25](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L25)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 startdash・yonkaku・demuchi・nebari。

### 07. ウォーアドミラル — 力強き原子（維持候補）

- **現在**：holdLead / at=st。残300m未満・先頭・2番手が1馬身未満。速度+5%・3秒／E+0.03／free。
- **内部根拠**：ケンタッキーダービーを逃げ切り、プリークネスステークスは内から迫った馬を頭差で抑えた
- **評価**：逃げ切りとプリークネスの競り勝ちに、先頭で迫られた際の回復・加速が対応する。
- **提案**：維持案。単独独走まで接戦能力を広げる必要はない。
- **技名**：「力強き原子」の異名としての出典は未確認。
- **該当資料**：[data/profiles.js:47](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L47)、[data/uniques.js:28](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L28)。
- **馬全体の補足**：脚質 逃げ、パッシブ big、通常発動 startdash・genwaku・nimai・nebari。

### 08. ネアルコ — イタリアの至宝（維持候補）

- **現在**：posBreak / at=st。直線入口30m内・2〜4番手。速度+5%・4秒／free。
- **内部根拠**：14戦14勝。最後のパリ大賞典（3000m）は好位から直線で抜け出して1馬身半差
- **評価**：パリ大賞典の好位抜け出しという名鑑の勝ち方と合う。
- **提案**：2〜4番手という限定は残せるが、正確な直線入口の位置は公式映像・記録で確認する。
- **技名**：イタリアと結びつく呼称だが通用する異名かは未確認。
- **該当資料**：[data/profiles.js:39](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L39)、[data/uniques.js:31](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L31)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 startdash・yonkaku・demuchi・nebari。

### 09. カウントフリート — 疾風の伯爵（維持候補）

- **現在**：bigLead / at=st。直線・先頭・2番手に2馬身以上差。速度+7%・5秒／free。
- **内部根拠**：ベルモントステークスを25馬身差で勝った。のちに破られるまでレース史上最大の着差
- **評価**：先頭で差を広げる条件と25馬身差勝ちの名鑑は整合する。並ばれることを要求しない点が良い。
- **提案**：大差先行の型として維持。着差だけから必要な加速率や秒数は決まらない。
- **技名**：伯爵は馬名に対応するが「疾風の伯爵」という異名の出典は未確認。
- **該当資料**：[data/profiles.js:41](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L41)、[data/uniques.js:34](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L34)。
- **馬全体の補足**：脚質 逃げ、パッシブ big、通常発動 startdash・genwaku・nimai・nebari。

### 10. ザテトラーク — 白斑の稲妻（維持候補）

- **現在**：start / at=start。発馬後0.6秒未満・出遅れでない。速度+7%・4秒／隊列目標3m前／free。
- **内部根拠**：デビュー戦はスタートから他馬を引き離して勝ち、コヴェントリーステークスは10馬身差。白い斑点のまだら模様の芦毛
- **評価**：名鑑のデビュー戦の先行圧勝と短距離の速さに合う。出遅れ時は発動しないため、名鑑の出遅れからの接戦まで万能に再現する技ではない。
- **提案**：好発時の爆発力として維持案。ロケットスタートとの上書きも別途注意。
- **技名**：白斑は名鑑に記載。「稲妻」という異名は要出典。
- **該当資料**：[data/profiles.js:242](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L242)、[data/uniques.js:37](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L37)。
- **馬全体の補足**：脚質 逃げ、パッシブ big、通常発動 startdash・genwaku・nimai・nebari。

### 11. ドミノ — 黒い旋風（維持候補）

- **現在**：sprint / at=st。1400m以下・直線入口30m内・3番手以内。速度+7%・4秒／free。
- **内部根拠**：6ハロン前後の競走ではほとんど負けなかった。2歳時は9戦無敗で、メイトロンステークスは国内レコード
- **評価**：6ハロン前後に強く、長距離では苦戦した名鑑と、1400m以下の前方加速が合う。
- **提案**：短距離限定のまま維持。生涯賞金や種牡馬成績をレース中の効果に混ぜない。
- **技名**：黒い旋風が実際の異名かは要出典。
- **該当資料**：[data/profiles.js:244](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L244)、[data/uniques.js:40](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L40)。
- **馬全体の補足**：脚質 逃げ、パッシブ なし、通常発動 startdash・genwaku・nimai・nebari。

### 12. ブリガディアジェラード — 常勝准将（維持候補）

- **現在**：mile / at=st。1400〜2000m・直線残400〜100m・2〜6番手。速度+5%・4秒／free。
- **内部根拠**：18戦17勝。3歳は主にマイルを走り、英2000ギニーをのちの凱旋門賞馬に3馬身差、サセックスSやクイーンエリザベス2世Sも勝った
- **評価**：中心がマイルという名鑑と1400〜2000mの型が一致。2400mのキングジョージ勝ちがあるだけで、マイル固有を全距離対応にする必要はない。
- **提案**：維持案。先頭に早く出た場合に発動しないことは表現上の制限として説明する。
- **技名**：准将は馬名と対応。「常勝」を含めた異名としての出典は未確認。
- **該当資料**：[data/profiles.js:29](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L29)、[data/famous_world.js:24](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L24)、[data/uniques.js:44](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L44)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 isshun・oriai・demuchi・hanno。

### 13. ミルリーフ — 小さな巨人（資料不足）

- **現在**：posBreak / at=st。直線入口30m内・2〜4番手。速度+5%・4秒／E+0.03／free。
- **内部根拠**：凱旋門賞を2400mのコースレコードで勝ち、エクリプスSも10ハロンのコースレコード。英2000ギニーの2着のあとは負けなかった
- **評価**：直線で抜け出す速さは名鑑のレコード勝ちと整合するが、名鑑だけでは直線入口が常に2〜4番手とは分からない。
- **提案**：映像・通過順位でposBreakの位置条件を確認。速さの主題は維持し、条件の変更確定は保留。
- **技名**：小さな巨人という異名は要出典。
- **該当資料**：[data/profiles.js:9](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L9)、[data/famous_world.js:23](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L23)、[data/uniques.js:47](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L47)。
- **馬全体の補足**：脚質 先行、パッシブ big・travel、通常発動 isshun・oriai・demuchi・hanno。

### 14. フランケル — 英国の怪物（維持候補）

- **現在**：ledAll / at=st。残400m以下・先頭・led600あり。速度+5%・4秒／E+0.03／free。
- **内部根拠**：14戦14勝。英2000ギニーはスタートから先頭に立って押し切り、2着に6馬身差をつけた
- **評価**：英2000ギニーの先頭押し切りという代表場面を選ぶ設計なら合う。全14戦のすべての勝ち方を表す技ではない。
- **提案**：代表レース型として維持。led600は600m地点だけの判定ではなく、残600〜300mのどこかで先頭になる記録。説明を正確にする。
- **技名**：英国の怪物が出典付きの呼称かは未確認。
- **該当資料**：[data/profiles_world.js:99](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_world.js#L99)、[data/famous_world.js:97](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L97)、[data/uniques.js:50](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L50)。
- **馬全体の補足**：脚質 逃げ、パッシブ big・kakari、通常発動 nebari・ikiire・nimai・nidan。

### 15. ダンシングブレーヴ — 勇敢なる踊り手（維持候補）

- **現在**：wideKick / at=st。直線残100m超・後ろ半分・進路3以上。速度+8%・5秒／E+0.03／top+0.3／free。
- **内部根拠**：15頭のうち11頭がG1の勝ち馬という凱旋門賞を、後方から大外を伸びてコースレコードで勝った
- **評価**：名鑑が明記する凱旋門賞の後方・大外・レコードという場面と、位置条件と終いの上限拡張がよく対応する。
- **提案**：型を維持。直線一気などとの速度上書きと、早く抜け出すと不発になる点を運用確認する。
- **技名**：馬名に由来する日本語名として読めるが、異名扱いは外部出典待ち。
- **該当資料**：[data/profiles.js:11](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L11)、[data/famous_world.js:45](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L45)、[data/uniques.js:53](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L53)。
- **馬全体の補足**：脚質 追込、パッシブ big、通常発動 saikoubi・isshun・kouhou・tsuiso。

### 16. アーモンドアイ — 府中の女神（維持候補）

- **現在**：chase / at=st。直線残400〜100m・2番手以下・先頭から3馬身未満。速度+5%・3秒／free。
- **内部根拠**：ジャパンカップで逃げた馬をとらえ、2分20秒6の世界レコードで勝った。芝のG1を9勝した
- **評価**：逃げるキセキをとらえたジャパンカップという名鑑の場面に対応する。東京限定ではない点は名称のイメージと区別が必要。
- **提案**：追走から捕らえる主題は維持。東京限定を足す必要はなく、早め先頭でも支える設計に広げるかは任意。
- **技名**：府中の女神という異名の出典は未確認。
- **該当資料**：[data/profiles_2.js:207](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_2.js#L207)、[data/famous_2.js:115](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_2.js#L115)、[data/uniques.js:56](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L56)。
- **馬全体の補足**：脚質 差し、パッシブ big・long、通常発動 chokusen・isshun・oriai・dokonjo。

### 17. イクイノックス — 蒼き天才（維持候補）

- **現在**：front3 / at=st。残400m以下・3番手以内。速度+5%・4秒／free。
- **内部根拠**：天皇賞（秋）を1分55秒2のレコードで連覇し、ジャパンカップを4馬身差で勝ってG1を6連勝した
- **評価**：先頭3頭以内から突き抜ける型は、逃げ切りも好位からの加速も許容する。先頭を禁止しない点が良い。
- **提案**：維持案。2022秋天など後方からの代表勝利も全て拾いたいなら広げる余地はあるが、必須訂正にはしない。
- **技名**：蒼き天才という異名の根拠は未確認。
- **該当資料**：[data/profiles_2.js:311](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_2.js#L311)、[data/famous_2.js:170](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_2.js#L170)、[data/uniques.js:59](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L59)。
- **馬全体の補足**：脚質 先行、パッシブ big・travel・long、通常発動 isshun・oriai・demuchi・hanno。

### 18. ウィンクス — 豪州の女王（資料不足）

- **現在**：lateKick / at=st。直線残400〜100m・後ろ半分。速度+6%・4秒／top+0.2／free。
- **内部根拠**：33連勝し、コックスプレートを4連覇した。G1は25勝で、世界の歴代最多とされる
- **評価**：名鑑の連勝数・着差は強さを示すが、直線残400m時点で常に後ろ半分という条件までは示さない。
- **提案**：代表コックスプレートの通過順位を確認し、後方から差す個性を維持するか、位置条件を緩めるか判断。
- **技名**：豪州の女王という呼称の外部出典待ち。
- **該当資料**：[data/profiles_world.js:109](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_world.js#L109)、[data/famous_world.js:102](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L102)、[data/uniques.js:62](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L62)。
- **馬全体の補足**：脚質 差し、パッシブ big、通常発動 chokusen・isshun・oriai・dokonjo。

### 19. エネイブル — 欧州の女王（維持候補）

- **現在**：duelEnd / at=st。残300m未満で近接。速度+5%・3秒／free。
- **内部根拠**：キングジョージで直線に並んで競り合い、クビ差で勝った。このレースを初めて3勝した馬になった
- **評価**：名鑑の2019年キングジョージの競り合いと、接戦時の加速が対応する。ただしwhyの「このレースを初めて3勝」は2020年の別の勝利。
- **提案**：固有は維持。2019年のクビ差勝ちと2020年の通算3勝を同じ一戦と読ませないよう根拠説明を分ける。
- **技名**：欧州の女王という呼称の外部出典待ち。
- **該当資料**：[data/profiles_world.js:125](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_world.js#L125)、[data/famous_world.js:110](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L110)、[data/uniques.js:65](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L65)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 startdash・yonkaku・demuchi・nebari。

### 20. オルフェーヴル — 金色の暴君（調整候補）

- **現在**：backRecover / at=mid。直線前400mの区間・後ろ半分。E+0.05。
- **内部根拠**：激しい気性で「金色の暴君」と呼ばれた。阪神大賞典で外へ逃げて大きく下がりながら、半馬身差の2着まで追い上げた。三冠馬で、引退レースの有馬記念は8馬身差
- **評価**：後方でEを戻すだけでは、逸走後の急追や有馬の圧勝という個性が弱い。単に後ろにいることと、下がって巻き返したことも区別していない。
- **提案**：金色の暴君を「道中後半の持続的なまくり」へ寄せ、順位上昇と持続加速・終い上限を組み合わせる案。既存の掛かり癖は残るので、固有に弱点がないという指摘にはしない。
- **技名**：金色の暴君は名鑑の気性像には合うが、異名の出典は別途必要。
- **該当資料**：[data/profiles_2.js:63](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_2.js#L63)、[data/famous_2.js:37](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_2.js#L37)、[data/uniques.js:68](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L68)。
- **馬全体の補足**：脚質 差し、パッシブ big・longspurt・kakari・mud、通常発動 chokusen・isshun・dokonjo・oosoto。

### 21. ゴールデンシックスティ — 黄金のマイラー（調整候補）

- **現在**：chase / at=st。直線残400〜100m・2番手以下・先頭から3馬身未満。速度+5%・3秒／free。
- **内部根拠**：16連勝し、香港マイルを3勝、チャンピオンズマイルを3連覇した
- **評価**：黄金のマイラーなのにchaseには距離条件がなく、3馬身以上離れていると発動しない。名鑑は香港マイル等の連覇を主な根拠にする。
- **提案**：マイル中心の距離条件を検討し、後方から追い上げて射程に入る型にする案。距離や着差の閾値は代表レースを確認後に決める。
- **技名**：黄金は馬名のGoldenに対応。呼称の史実出典は未確認。
- **該当資料**：[data/profiles_world.js:135](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_world.js#L135)、[data/famous_world.js:115](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L115)、[data/uniques.js:71](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L71)。
- **馬全体の補足**：脚質 差し、パッシブ big、通常発動 chokusen・isshun・oriai・dokonjo。

### 22. ゴルディコヴァ — 欧州マイルの女王（維持候補）

- **現在**：mile / at=st。1400〜2000m・直線残400〜100m・2〜6番手。速度+5%・4秒／free。
- **内部根拠**：ブリーダーズカップマイルを初めて3連覇した。ジャックルマロワ賞は6馬身差のレースレコード。G1は14勝
- **評価**：マイルで牡馬を破りBCマイルを3連覇した名鑑と、1400〜2000mでの差し加速が対応する。
- **提案**：維持案。ミエスクと完全同型なので、名馬ごとの違いを求める場合は映像確認後に加速と持続の配分を分ける。
- **技名**：欧州マイルの女王という呼称の出典待ち。
- **該当資料**：[data/profiles_world.js:83](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_world.js#L83)、[data/famous_world.js:88](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L88)、[data/uniques.js:74](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L74)。
- **馬全体の補足**：脚質 差し、パッシブ big・travel、通常発動 chokusen・isshun・oriai・dokonjo。

### 23. シンザン — ナタの切れ味（維持候補）

- **現在**：top2 / at=st。残200m以下・2〜3番手。速度+5%・3秒／free。
- **内部根拠**：19戦すべてで連対を外さず、八大競走を5つ勝って「五冠馬」と呼ばれた
- **評価**：名鑑の菊花賞の残200mから抜く場面が、残200m・2〜3番手という条件に直接対応する。
- **提案**：この場面の再現として維持案。「ナタ」の異名を長い持続力と解釈するなら単純な短時間速度だけで良いか追加検討。
- **技名**：ナタの切れ味という異名の原典は未取得。
- **該当資料**：[data/profiles.js:43](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L43)、[data/famous_old.js:19](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_old.js#L19)、[data/uniques.js:77](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L77)。
- **馬全体の補足**：脚質 先行、パッシブ big・mud、通常発動 startdash・yonkaku・demuchi・nebari。

### 24. シンボリルドルフ — 絶対皇帝（維持候補）

- **現在**：front3 / at=st。残400m以下・3番手以内。速度+4%・4秒／E+0.03／free。
- **内部根拠**：史上初めて無敗で三冠を果たし、G1を7勝して「皇帝」「七冠馬」と呼ばれた
- **評価**：先頭3頭以内から確実に抜け出す設計は皇帝のイメージと矛盾しない。既存の折り合い上手が気性の良さを補う。
- **提案**：維持案。賢い競馬の表現が欠落していると重ねて指摘しない。
- **技名**：皇帝は名鑑に記載。「絶対」を加えた形は要出典。
- **該当資料**：[data/profiles.js:31](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L31)、[data/famous_old.js:90](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_old.js#L90)、[data/uniques.js:80](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L80)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 startdash・oriai・demuchi・nebari。

### 25. ディープインパクト — 衝撃の飛翔（調整候補）

- **現在**：fromLast / at=st。直線残100m超・後ろ3頭以内。速度+8%・5秒／E+0.03／top+0.3／free。
- **内部根拠**：若駒ステークスで最後方から一気に追い込んで圧勝した。無敗の三冠馬で、天皇賞（春）は3分13秒4の世界レコード
- **評価**：飛翔・大きな終いの伸びは合うが、直線で後ろ3頭以内に残る必要がある。道中からまくって直線では前にいる走り方を支えない。少頭数では逆に条件が極端に緩い。
- **提案**：中間点の後方位置や直線前からの順位上昇を記録し、早めに進出しても発動できる型を検討。直線一気による固有速度の上書きも同時に整理。
- **技名**：衝撃は馬名と対応。飛翔という異名・表現の一次出典は未確認。
- **該当資料**：[data/profiles_1.js:301](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_1.js#L301)、[data/famous_1.js:168](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_1.js#L168)、[data/uniques.js:83](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L83)。
- **馬全体の補足**：脚質 差し、パッシブ big・longspurt・deokure、通常発動 chokusen・isshun・dokonjo・oosoto。

### 26. テイエムオペラオー — 世紀末覇王（維持候補）

- **現在**：boxed / at=st。直線残100m超・壁累積0.6秒以上・現在は壁でない。速度+5%・3秒／free。
- **内部根拠**：「世紀末覇王」と呼ばれた。2000年は8戦8勝で、有馬記念では周りを囲まれ、直線でもなかなか前が開かなかったが、最後にハナ差とらえた
- **評価**：2000有馬で囲まれてから勝つ名鑑の場面と、壁からの解放後の加速が直接対応する。
- **提案**：維持案。壁0.6秒は連続ではなく累積。叩き合いの表現は別の通常スキル案として分ける。
- **技名**：世紀末覇王はuniquesのwhyに記載されるが外部原典は未取得。
- **該当資料**：[data/profiles_1.js:189](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_1.js#L189)、[data/famous_1.js:106](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_1.js#L106)、[data/uniques.js:86](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L86)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 startdash・yonkaku・demuchi・nebari。

### 27. トレヴ — ロンシャンの女王（資料不足）

- **現在**：lateKick / at=st。直線残400〜100m・後ろ半分。速度+8%・5秒／top+0.2／free。
- **内部根拠**：無敗で凱旋門賞に出て5馬身差で勝ち、勝てなかった翌年も凱旋門賞では2馬身差で勝って連覇した
- **評価**：凱旋門賞連覇と大差勝ちは名鑑にあるが、後ろ半分・残400〜100mという条件を支持する通過順位が不足している。
- **提案**：2013・2014凱旋門賞の位置取りを確認。加速の主題は維持し、先行している勝利も拾う必要があるか判断。
- **技名**：ロンシャンと連覇の結び付きは内部で明確。女王が史実上の異名かは未確認。
- **該当資料**：[data/profiles_world.js:105](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_world.js#L105)、[data/famous_world.js:100](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L100)、[data/uniques.js:89](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L89)。
- **馬全体の補足**：脚質 差し、パッシブ big・longspurt、通常発動 chokusen・isshun・oriai・dokonjo。

### 28. ニジンスキー — 舞神（維持候補）

- **現在**：chase / at=st。直線残400〜100m・2番手以下・先頭から3馬身未満。速度+6%・3秒／free。
- **内部根拠**：英ダービーは直線まで追い出しを待って差し切った。英セントレジャーも勝ち、35年ぶりの英国三冠馬になった
- **評価**：英ダービーで追い出しを待って差す名鑑の場面と、先頭近くから抜く条件が対応する。
- **提案**：代表ダービー型として維持。3馬身以内という数値の根拠と、長く脚を使う効果にする必要は映像確認待ち。
- **技名**：舞神は馬名の由来を想起させるが、馬の史実上の異名としては要出典。
- **該当資料**：[data/profiles.js:33](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L33)、[data/famous_world.js:20](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L20)、[data/uniques.js:92](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L92)。
- **馬全体の補足**：脚質 差し、パッシブ big、通常発動 chokusen・isshun・oriai・dokonjo。

### 29. ミエスク — 稀代の名牝（維持候補）

- **現在**：mile / at=st。1400〜2000m・直線残400〜100m・2〜6番手。速度+5%・4秒／free。
- **内部根拠**：ブリーダーズカップマイルを初めて連覇した。ジャックルマロワ賞とムーランドロンシャン賞で牡馬を退けた
- **評価**：BCマイル連覇など、名鑑の中心がマイル。距離限定の差し加速は合う。
- **提案**：維持案。ゴルディコヴァと同じ効果でも史実上の誤りとは言わない。違いを付けるにはレース内容の根拠が要る。
- **技名**：稀代の名牝は評価語であり、固有の異名としての根拠は未確認。
- **該当資料**：[data/profiles.js:89](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L89)、[data/famous_world.js:48](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L48)、[data/uniques.js:95](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L95)。
- **馬全体の補足**：脚質 差し、パッシブ big・travel、通常発動 chokusen・isshun・oriai・dokonjo。

### 30. シーバード — 伝説の海鳥（調整候補）

- **現在**：breakAway / at=st。直線残100〜400mで近接。速度+6%・4秒／free。
- **内部根拠**：凱旋門賞で各国の強豪と競り合い、そこから一気に引き離して6馬身差で勝った。英ダービーは手綱を持ったまま抜け出した
- **評価**：名鑑の凱旋門賞には競り合いから突き放す記述がありclose条件に根はある。しかし手綱を持ったまま抜けるダービー像は、接戦必須だと表しにくい。
- **提案**：接戦だけでなく好位から余裕を持って抜け出す場面を許す案。凱旋門賞一戦に絞る方針なら現条件維持も可能。
- **技名**：海鳥は馬名に対応するが「伝説の海鳥」という呼称は未確認。
- **該当資料**：[data/profiles.js:7](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L7)、[data/famous_world.js:13](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L13)、[data/uniques.js:98](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L98)。
- **馬全体の補足**：脚質 差し、パッシブ big・travel、通常発動 chokusen・isshun・oriai・dokonjo。

### 31. スペクタキュラービッド — 砂の韋駄天（調整候補）

- **現在**：heavyOrLate / at=mid。直線前400mの区間で、出遅れまたは斤量57kg以上。E+0.04。
- **内部根拠**：130ポンドを背負ったサンタアニタハンデキャップを5馬身差で勝った。ストラブステークスの1.25マイル1分57秒8はダートの世界レコード
- **評価**：130ポンドでの圧勝は重斤量型の根拠になるが、同じ型にある出遅れ救済の根拠はwhy・名鑑にない。世界レコードの速さもE回復だけでは弱い。
- **提案**：出遅れ条件を切り離し、重斤量下でも持続して加速する型へ寄せる案。ファーラップ・ケルソとの違いを作る。
- **技名**：砂の韋駄天という異名の出典は未確認。
- **該当資料**：[data/profiles.js:53](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L53)、[data/famous_world.js:38](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L38)、[data/uniques.js:101](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L101)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 startdash・yonkaku・demuchi・nebari。

### 32. セクレタリアト — 神速の赤馬（維持候補）

- **現在**：leadStraight / at=st。直線入口30m内・先頭。速度+6%・5秒／E+0.04／free。
- **内部根拠**：ベルモントステークスで31馬身差をつけた。2分24秒0はダートの世界記録として今も破られていない
- **評価**：ベルモントの大差・レコードを、先頭から持続して伸びる場面で表す点は合う。ただし元の馬データは差し脚質。
- **提案**：ベルモントを主題にするなら維持。先頭で直線に入らないと発動しないため、通常の仕掛けで条件に届くかは実レース確認対象。
- **技名**：赤馬は毛色、神速は速さに対応する説明的名称。異名としての原典待ち。
- **該当資料**：[data/profiles.js:13](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L13)、[data/famous_world.js:25](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L25)、[data/uniques.js:104](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L104)。
- **馬全体の補足**：脚質 差し、パッシブ big・longspurt、通常発動 oosoto・yonkaku・makuri・oriai。

### 33. プリティーポリー — 天下無双（調整候補）

- **現在**：nearLead / at=st。残400m以下・2番手以下・先頭から1馬身未満。速度+4.5%・4秒／E+0.04／free。
- **内部根拠**：「天下無双のポリー（Peerless Polly）」と呼ばれた。デビューから15連勝し、24戦22勝。1000ギニー・オークス・セントレジャーの牝馬三冠を取った
- **評価**：名鑑にはデビュー大差勝ちとオークス逃げ切りがあるが、固有は2番手以下で先頭から1馬身未満という接戦だけ。無双の名称に対して条件が狭い。
- **提案**：先頭に立ってからの持続や抜け出しも許す型にする案。追う形もあるため逃げ専用に固定する必要はない。
- **技名**：Peerless Pollyはwhyにあるが原文未取得。「天下無双」は訳としての位置付けを明確にする。
- **該当資料**：[data/profiles.js:252](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L252)、[data/uniques.js:107](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L107)。
- **馬全体の補足**：脚質 先行、パッシブ なし、通常発動 startdash・yonkaku・demuchi・nebari。

### 34. ラフィアン — 世紀の女王（維持候補）

- **現在**：leadMid / at=mid。直線前・中間点以降・先頭。E+0.05。
- **内部根拠**：デビューから10連勝した。走ったレースではどれも最初から最後まで先頭を譲らなかった
- **評価**：名鑑の先頭を譲らない走りと、先頭で道中の脚を残す効果が一致する。
- **提案**：維持案。レコードの速さをさらに固有速度へ足すかは任意。故障による悲劇はゲームの故障なし方針と分ける。
- **技名**：世紀の女王という異名の出典は未確認。
- **該当資料**：[data/profiles_world.js:9](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_world.js#L9)、[data/famous_world.js:30](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L30)、[data/uniques.js:110](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L110)。
- **馬全体の補足**：脚質 逃げ、パッシブ なし、通常発動 startdash・genwaku・nimai・nebari。

### 35. アバーナント — 灰色の閃光（維持候補）

- **現在**：sprint / at=st。1400m以下・直線入口30m内・3番手以内。速度+6%・4秒／free。
- **内部根拠**：英国の芦毛の短距離馬。ジュライカップとナンソープステークスを2年続けて勝ち、17戦14勝
- **評価**：短距離に専念して主要スプリントを連覇した名鑑と、1400m以下・前方での加速が合う。
- **提案**：維持案。ドミノやマニカトと同型であること自体を誤りとはしない。
- **技名**：灰色は芦毛と対応。閃光という異名の原典待ち。
- **該当資料**：[data/profiles.js:260](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L260)、[data/uniques.js:113](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L113)。
- **馬全体の補足**：脚質 逃げ、パッシブ なし、通常発動 nidan・tanki・nimai・demuchi。

### 36. サイテーション — 100万ドルホース（調整候補）

- **現在**：nearLead / at=st。残400m以下・2番手以下・先頭から1馬身未満。速度+4.5%・4秒／E+0.04／free。
- **内部根拠**：三冠の年の終わりまでに15連勝し、のちに16連勝まで伸ばした。6歳でハリウッドゴールドカップを勝ち、史上初めて獲得賞金が100万ドルを超えた
- **評価**：100万ドルは長期実績の到達点だが、現効果は2番手以下・先頭1馬身未満での接戦限定。名鑑の三冠での3.5〜8馬身差勝ちと直接は結び付かない。
- **提案**：レース内では先行から長く伸びる型を検討。獲得賞金そのものを速度条件にせず、長期活躍は成長・健康と分ける。
- **技名**：100万ドル到達は名鑑に明記。歴史的呼称と数字は外部確認待ち。
- **該当資料**：[data/profiles.js:25](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L25)、[data/uniques.js:117](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L117)。
- **馬全体の補足**：脚質 先行、パッシブ なし、通常発動 startdash・yonkaku・demuchi・nebari。

### 37. マニカト — 豪州の短距離王（調整候補）

- **現在**：sprint / at=st。1400m以下・直線入口30m内・3番手以内。速度+6%・4秒／free。
- **内部根拠**：豪州の短距離のセン馬。ウィリアムリードステークスを5連覇し、3つのレースをレコードで勝った
- **評価**：名鑑は短距離だけでなくコーフィールドギニーや1分35秒7のクイーンエリザベスCも挙げるが、技は1400m超で必ず不発。
- **提案**：短距離〜マイルの前方持続型に広げる案。正確な勝利距離を外部確認してから上限を決める。ウィリアムリード5連覇だけを主題にするなら現型も選択可能。
- **技名**：豪州の短距離王は説明語として合うが、固有の呼称としての根拠は未確認。
- **該当資料**：[data/profiles_world.js:7](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_world.js#L7)、[data/uniques.js:120](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L120)。
- **馬全体の補足**：脚質 先行、パッシブ big・right、通常発動 startdash・yonkaku・demuchi・nebari。

### 38. ケルソ — 不屈の鉄人（調整候補）

- **現在**：heavyOrLate / at=mid。直線前400mの区間で、出遅れまたは斤量57kg以上。E+0.04。
- **内部根拠**：ジョッキークラブゴールドカップを5連覇し、5年続けて年度代表馬になった。重い斤量のハンデ戦でも勝ち続けた
- **評価**：重斤量に耐える根拠はあるが、出遅れ救済の根拠は名鑑にない。5年連続年度代表馬・長距離連覇と、汎用E+0.04だけの対応は弱い。
- **提案**：重斤量と長距離で脚を保つ型を検討。長年の頑健さは成長・健康で表し、レース中の回復と混同しない。
- **技名**：不屈の鉄人という呼称の出典は未確認。
- **該当資料**：[data/profiles.js:49](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L49)、[data/famous_world.js:7](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L7)、[data/uniques.js:123](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L123)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 startdash・yonkaku・demuchi・nebari。

### 39. ドクターフェイガー — 最速の逃亡者（維持候補）

- **現在**：ledAll / at=st。残400m以下・先頭・led600あり。速度+5%・4秒／E+0.03／free。
- **内部根拠**：先手を取ってそのまま押し切る競馬を得意とした。134ポンドでダートの1マイルを1分32秒2で走る世界レコード
- **評価**：名鑑の先手を取って押し切る走りに、先頭を保っての加速が合う。掛かり癖も別に既存。
- **提案**：維持案。led600の記録条件は残600〜300mのどこかで先頭であり、最初からずっと先頭という意味ではない。
- **技名**：最速の逃亡者という異名の出典は未確認。
- **該当資料**：[data/profiles.js:73](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L73)、[data/famous_world.js:16](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L16)、[data/uniques.js:126](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L126)。
- **馬全体の補足**：脚質 逃げ、パッシブ kakari、通常発動 nebari・ikiire・nimai・nidan。

### 40. ネイティヴダンサー — グレイゴースト（維持候補）

- **現在**：neck / at=st。残100m未満で近接。速度+6%・2.5秒／free。
- **内部根拠**：「グレイゴースト」と呼ばれた芦毛。22戦21勝で、プリークネスステークスとベルモントステークスをどちらもクビ差で勝った
- **評価**：プリークネスとベルモントをともにクビ差で勝った名鑑と、最後の接戦での加速が対応する。
- **提案**：接戦型として維持。クビ差を必ず勝たせる効果ではないと説明する。
- **技名**：Grey Ghostはwhyにあるが外部原文は未取得。
- **該当資料**：[data/profiles.js:236](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L236)、[data/uniques.js:129](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L129)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 startdash・yonkaku・demuchi・nebari。

### 41. フォアゴー — 最強の巨人（維持候補）

- **現在**：lateKick / at=st。直線残400〜100m・後ろ半分。速度+8%・5秒／top+0.3／free。
- **内部根拠**：137ポンドを課されたマールボロカップで、向正面の8番手から直線で追い込み、ゴール前でとらえた
- **評価**：重斤量下でも後方から追い込んだマールボロCの名鑑と、後方から長く伸びる型が対応する。
- **提案**：維持案。斤量条件を足す必要はなく、豪脚と速度が上書きし合うことを別に確認する。
- **技名**：大柄は名鑑に記載。最強の巨人が固有の異名かは未確認。
- **該当資料**：[data/profiles.js:71](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L71)、[data/famous_world.js:28](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L28)、[data/uniques.js:132](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L132)。
- **馬全体の補足**：脚質 追込、パッシブ big・longspurt、通常発動 saikoubi・isshun・kouhou・tsuiso。

### 42. トキノミノル — 幻の馬（維持候補）

- **現在**：leadMid / at=mid。直線前・中間点以降・先頭。E+0.06／top+0.1。
- **内部根拠**：「幻の馬」と呼ばれた。10戦10勝のうち7戦はレコード。東京優駿は出遅れたが、向正面から押し上げて先頭に立った
- **評価**：向正面から押し上げて先頭に立つダービーの名鑑と、中間点以降の先頭で回復・終い上限加算が対応する。
- **提案**：維持案。「中間点通過時に先頭でないと不可」とは説明しない。先頭を後から取っても道中なら発動可能。
- **技名**：幻の馬は名鑑に明記。外部原典は未取得。
- **該当資料**：[data/profiles.js:63](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L63)、[data/uniques.js:135](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L135)。
- **馬全体の補足**：脚質 逃げ、パッシブ big、通常発動 startdash・genwaku・nimai・nebari。

### 43. クリフジ — 不敗の女傑（維持候補）

- **現在**：front3 / at=st。残400m以下・3番手以内。速度+5%・5秒／free。
- **内部根拠**：11戦11勝で、7戦は10馬身以上の差。菊花賞にあたるレースは大差で勝った
- **評価**：前方に進出して大差を付ける型で、名鑑の大差勝ちの像と大きな矛盾はない。先頭になっても発動できる。
- **提案**：維持案。出遅れの一例だけで出遅れ癖を追加しない。
- **技名**：不敗は11戦11勝という内部記述に対応。女傑の異名出典は未確認。
- **該当資料**：[data/profiles.js:51](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L51)、[data/uniques.js:138](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L138)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 startdash・yonkaku・demuchi・nebari。

### 44. シャーガー — 白斑の流星（調整候補）

- **現在**：posBreak / at=st。直線入口30m内・2〜4番手。速度+6%・4秒／free。
- **内部根拠**：英ダービーで2着に10馬身差をつけ、公式記録に残るダービーの最大着差を作った
- **評価**：名鑑の核は10〜12馬身差の圧勝だが、技は直線入口で2〜4番手限定。入口ですでに先頭なら圧勝型の固有が発動しない。
- **提案**：先頭を含む好位からの抜け出しや、差を広げた後の持続を許す案。実際の英ダービー入口順位を未確認なので、そのレースで不発だったとは断定しない。
- **技名**：白斑の流星という呼称と外見の出典を確認する。
- **該当資料**：[data/profiles.js:67](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L67)、[data/famous_world.js:41](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L41)、[data/uniques.js:141](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L141)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 startdash・oriai・demuchi・nebari。

### 45. フライトライン — 砂上の飛行船（維持候補）

- **現在**：front3 / at=st。残400m以下・3番手以内。速度+5%・4秒／free。
- **内部根拠**：6戦6勝。パシフィッククラシックステークスで19馬身4分の1差、ブリーダーズカップクラシックで8馬身4分の1差
- **評価**：先頭を含む前方から突き放す型は、名鑑の全6勝と大差勝ちの像に合う。
- **提案**：維持案。6戦全勝だからスタートから常に先頭という条件へ狭めない。
- **技名**：飛行船はFlightlineからの創作表現か異名か未確認。
- **該当資料**：[data/profiles_world.js:143](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_world.js#L143)、[data/famous_world.js:119](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L119)、[data/uniques.js:144](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L144)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 startdash・yonkaku・demuchi・nebari。

### 46. シーザスターズ — 星の王（維持候補）

- **現在**：duelEnd / at=st。残300m未満で近接。速度+5%・3秒／E+0.03／free。
- **内部根拠**：英2000ギニー・英ダービー・凱旋門賞を同じ年に勝った初めての馬。英インターナショナルステークスの一騎打ちをレコードで制した
- **評価**：英インターナショナルの一騎打ちをレコードで制した名鑑と、接戦の加速・脚の回復が対応する。
- **提案**：代表一戦型として維持。凱旋門賞の抜け出しまで全部を一つの技に押し込む必要はない。
- **技名**：星は馬名に対応。星の王という異名の原典待ち。
- **該当資料**：[data/profiles_world.js:85](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_world.js#L85)、[data/famous_world.js:89](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L89)、[data/uniques.js:147](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L147)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 isshun・oriai・demuchi・hanno。

### 47. リボー — イタリアの巨匠（維持候補）

- **現在**：longStraight / at=st。2400m以上・直線入口30m内。速度+3%・4秒／E+0.03／free。
- **内部根拠**：16戦16勝で凱旋門賞を連覇した。2度目の凱旋門賞は公式で6馬身差
- **評価**：長距離の大差勝ちと、2400m以上で持続的に伸びる型は整合する。道悪は既存の道悪○が担う。
- **提案**：維持案。セントサイモンとほぼ同型なので、差別化を望むならレース内容に根拠を求める。
- **技名**：イタリアとの結び付きはあるが巨匠という異名の原典は未確認。
- **該当資料**：[data/profiles.js:27](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles.js#L27)、[data/uniques.js:150](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L150)。
- **馬全体の補足**：脚質 先行、パッシブ mud、通常発動 startdash・yonkaku・demuchi・nebari。

### 48. ナリタブライアン — シャドーロールの怪物（調整候補）

- **現在**：chase / at=st。直線残400〜100m・2番手以下・先頭から3馬身未満。速度+6%・3秒／free。
- **内部根拠**：「シャドーロールの怪物」と呼ばれた三冠馬。東京優駿を5馬身差、菊花賞を7馬身差、有馬記念を3馬身差で勝った
- **評価**：名鑑の核は三冠・有馬の大差勝ちだが、固有は2番手以下で先頭から3馬身未満に限られる。すでに突き抜けた場面では助けない。
- **提案**：好位から早く先頭へ出ても持続して引き離せる型を検討。1996阪神大賞典の接戦を主題にするなら現型にも根はあるが、whyをその一戦に合わせる。
- **技名**：シャドーロールの怪物は名鑑に明記。外部原典は未取得。
- **該当資料**：[data/profiles_1.js:93](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_1.js#L93)、[data/famous_1.js:53](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_1.js#L53)、[data/uniques.js:153](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L153)。
- **馬全体の補足**：脚質 差し、パッシブ big・longspurt、通常発動 chokusen・isshun・oriai・dokonjo。

### 49. ブラックキャビア — 漆黒の疾風（維持候補）

- **現在**：sprint / at=st。1400m以下・直線入口30m内・3番手以内。速度+7%・4秒／free。
- **内部根拠**：25戦25勝の短距離の牝馬。ライトニングステークスは直線の入り口で先頭に立って大差、ダイヤモンドジュビリーステークスは3番手から抜け出した
- **評価**：名鑑のライトニングの先頭圧勝とダイヤモンドジュビリーの3番手抜け出しの両方を、短距離・前方条件で拾える。
- **提案**：維持案。単騎先頭限定にしない。ロケットスタート等と重なるが異なる局面の技。
- **技名**：漆黒は馬名と対応するが疾風という異名の出典は未確認。
- **該当資料**：[data/profiles_world.js:91](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_world.js#L91)、[data/famous_world.js:93](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_world.js#L93)、[data/uniques.js:156](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L156)。
- **馬全体の補足**：脚質 先行、パッシブ big・travel、通常発動 startdash・yonkaku・demuchi・nebari。

### 50. オグリキャップ — 芦毛の怪物（維持候補）

- **現在**：neck / at=st。残100m未満で近接。速度+6%・2.5秒／free。
- **内部根拠**：「芦毛の怪物」と呼ばれた。マイルチャンピオンシップは叩き合いをハナ差で制し、引退レースの有馬記念でも勝った
- **評価**：マイルCSのハナ差の叩き合いという名鑑の場面が、残100mの接戦加速と直接対応する。
- **提案**：維持案。引退有馬の復活は別の逸話であり、疲労回復や不調からの復活条件が現実装にあるとは説明しない。
- **技名**：芦毛の怪物は名鑑に明記。外部原典は未取得。
- **該当資料**：[data/profiles_old.js:271](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/profiles_old.js#L271)、[data/famous_old.js:109](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/famous_old.js#L109)、[data/uniques.js:159](https://github.com/nakaba9696/Horse-Simulation/blob/3083ce9b24356236407f6cc053cf726a86da5fa9/data/uniques.js#L159)。
- **馬全体の補足**：脚質 先行、パッシブ big、通常発動 isshun・oriai・demuchi・hanno。

## 実施した確認・未完了の確認

- 全50頭で固有名と馬データ・名鑑の対応を確認。全whenが存在し、Godot書き出し済みuniques.jsonとJSの定義が一致するか確認。
- 代表する条件の肯定・否定ケースをJSの実際のK.UWHENに入力し、取りこぼす場面や少頭数の境界を確認。これは実レースの再現やGodot実行の証明ではない。
- 専用Web検索ツールは利用可能一覧に存在しない。今回も米競馬殿堂への取得は403。前回の取得失敗URLは [network-results.json](network-results.json)。公式本文を読めた馬は0頭で、他作品の評価も根拠に使用していない。
- 全50頭の設計判断は上に記載済み。外部史実、異名の出典、代表レースの正確な通過順位・発動率・勝率影響は未完了。調整候補を即時にデータ修正へ適用しない。
- チェックアウトのコード・データ・文書は変更していない。レビューと検証用ファイルは /workspace/research/horse-stats に保存。


## 同梱した検証結果の要点

{
  "verified": {
    "unique_count": 50,
    "unique_ids": 50,
    "unique_horses": 50,
    "all_have_profile": true,
    "all_have_horse_data": true,
    "all_when_defined": true,
    "godot_data_matches_js": true
  },
  "passing_condition_cases": 24,
  "identical_condition_and_effect_groups": [
    [
      "オーモンド",
      "ネイティヴダンサー",
      "オグリキャップ"
    ],
    [
      "ファーラップ",
      "スペクタキュラービッド",
      "ケルソ"
    ],
    [
      "ドミノ",
      "ブラックキャビア"
    ],
    [
      "ブリガディアジェラード",
      "ゴルディコヴァ",
      "ミエスク"
    ],
    [
      "フランケル",
      "ドクターフェイガー"
    ],
    [
      "アーモンドアイ",
      "ゴールデンシックスティ"
    ],
    [
      "イクイノックス",
      "フライトライン"
    ],
    [
      "ニジンスキー",
      "ナリタブライアン"
    ],
    [
      "プリティーポリー",
      "サイテーション"
    ],
    [
      "アバーナント",
      "マニカト"
    ]
  ],
  "scope": "JSの条件への人工状態入力。史実の通過順位、実レース発動率、Godot実行・C++ビルドは検証していない。"
}
