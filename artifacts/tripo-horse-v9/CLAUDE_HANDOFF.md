# 馬モデル v9 — Claude 取り込み手順

2026-10-25（Asia/Tokyo）。依頼 `claude/lucid-ptolemy-j204a3` の `docs/handoff/TRIPO_HORSE_V9_REQUEST.md`、読取commit `014b74626240916e984bd3886798101edfab9841`。元は納品枝のv8。ゲーム本体のコード・データは変更していません。

最終GLB SHA-256: `50f8c9d320b6cb72a19a258f237d8589446b1d18b27af18b69cc77fac61dc125`。制作と分離した最終画像レビューは `review/final-primary-review.md` と `review/FINAL_INDEPENDENT_REVIEW.md`、実見範囲はそれぞれcoverage JSONへ。レビューが示す独立素材の範囲を、実ゲームの本採用合格へ広げないでください。

## v8 から変えた所

- 首を短くして頭を下げる制御を撤回。支給走りの15位相を基準に、首を前へ出して角度で頭を運ぶ形にしました。胴の上下と首頭の時機を同じ周期へ合わせ、胴pitch10°を維持。
- 頭を全歩法で均等0.90倍。StandはPD実馬の補助比較、Walkは従来の2回のうなずき、Canterは3拍子の脚順を維持し支給走りの首頭の曲線を参考にしています。Canter専用脚動画に一致したという意味ではありません。
- 首下面の袋状の角を局所sculpt/ウェイト平滑化/2補正で丸め、首肩のつながりを連続化。途中で試した高さ場/曲線リグの不良候補は採用していません。
- 蹄の4既存骨をRoot直下へ付け替え、世界姿勢を5歩法へ焼き込み。蹄底のウェイトを硬くし、胴のしなりの補間で蹄が崩れる問題を修正。骨数54・三角形19,168・6取付点・2補正名・UV2整数IDを保持。
- **シェーダ差分必須**：COLOR_0鼻孔/口と法線guardを維持し、蹄冠にUV2のrest-height由来の連続色境界を追加。茶色の三角が蹄へ刺さる見えを修正。付属 `preview/coat.gdshader` を基に移植してください。

## 取り込み

1. ZIPを展開し `sha256sum -c SHA256SUMS`。`horse-gallop.glb` と `preview/assets/horse.glb` は同じhashです。Godot4.6.3で独立previewを先にimportしてください。
2. `tools/configure_godot_import.py` または同等ConfigFileマージでアニメoptimizer/compression OFF、240fps、不変track保持、自動lightmap UV OFF、embedded_image_handling=3。再import後 `verify.gd` と `verify_socket_tracks.gd`。古い `.godot` cacheを配布物から流用しません。
3. **v9 GLBのSkeleton/5歩法を一式で使う**。4蹄骨の親がLimb_2から `tripo::Root` に変わっています。旧v8のAnimation/Skeleton/骨index・旧手続き蹄補正を混ぜないでください。`hoof-rig-contract.json`参照。モデル内の焼込みとゲーム側の胴/首の二重加算も避けます。
4. 毛色Shaderは付属版のUV2/法線/COLOR_0を移す。COLOR_0は頭ローカル座標の符号化で、頂点色をALBEDOへ直乗算しません。幾何半球guard閾値.15、normal_strength=.03を保持。蹄冠は `leg>0 && region in [0,3]` で `1-smoothstep(.052,.058,rest_height)`。領域0/3の整数IDそのものは変更していません。
5. `RaceNeckCorrective`: Race/Trot/Canter=1、Stand/Walk=0。`WalkNeckCorrective`: Walkだけ1。これらのtrackを削除・旧補正で上書きしないでください。
6. モデルは前−X・上+Y。従来のゲーム用親のY回転+90°・等倍2.6を一度だけ適用。`saddle-track.json`はRace、`attachment-tracks.json`は全5歩法・6点、unscaled model座標。実ノードを使う場合とJSONを再生する場合を混ぜて二重変換しないでください。頭の0.90倍をBitが継承するため、前/上ベクトル長が1とは限りません。方向は正規化かquaternionを使い、Bitへさらに0.90を足さないでください。
7. 周期/基準完歩：Race .45s/7m、Stand3s/0、Walk1.2s/1.6m、Trot173/240s/2.8m、Canter.6s/4.5m。その場走行でRoot前進を足していません。サイズSの場合 `playback=v*period/(stride*S/2.6)`。Race基準16m/sで約1.02857倍です。
8. Saddle/Stirrup/Bit/Withersはv9の再出力を使い、騎手/鞍/鐙/手綱のずれ、歩法切替ブレンド、全景の影、実レース多数頭/LOD/FPSをゲーム側で確認してください。これらは今回未検証です。

**独立studioの影補正**：床の自己投影をOFF（受影は通常）、馬は投影/受影ON、方向光orthogonal/max-distance6m/bias.1/normalbias2。旧100m設定や低normalbiasは小さい素材へ黒い反復帯や床縞を作りました。最終比較は全版この共通条件。これは独立studioの値であり、実ゲームのSunへ6mをそのまま入れません。実景の尺度/範囲で再調整してください。影設定と形の補正は別です。

## 数値は報告用

|版|Stand 首上線 / 頭|襲歩 首上線 / 頭（周期平均）|
|---|---:|---:|
|v6|0.6930 / 0.5636 m|0.7437 / 0.5657 m|
|v7|0.7393 / 0.5633 m|0.6674 / 0.5669 m|
|v8|0.5948 / 0.5640 m|0.4529 / 0.5670 m|
|v9|0.6894 / 0.5076 m|0.7161 / 0.5096 m|


`anatomy-comparison.json`にv6/v7/v8/v9の各歩法の長さ・角度・高さのmean/min/max。上線は皮膚の33点曲線、頭は固定皮膚点間、下線は喉〜付け根の**弦**です。ゲーム側の上線弦と方法が違い、真の骨格寸法ではありません。v8の旧目標で合否を付けていません。v9の襲歩の首上線はStandより平均で長くなります。

機械的記録：Raceの浮遊割合.20（蹄高1.5cm閾値）、Withers上下約.1985m、蹄最下約+2.08mm、実測完歩各脚約6.989〜6.998m、ループ端差0。108位相/240fps bake・世界蹄姿勢を含む検証です。

**ゼロ滑りとは言いません**。`contact-validation.json`の支持全窓の蹄centroid残速度RMS約.32〜.75m/s、端の補間に最大約4.64m/sが残ります。支持端から1baked-key分を除いた内部は約.00010〜.00018m/sですが、こちらだけを採って全窓合格にしていません。蹄底の接触点の静止摩擦や実ゲームの移動と合成した肉眼評価を証明する値ではありません。現状の残件として取り込み時に見てください。

閉曲面の境界/非多様体/巻き順不整合0、全周期の退化面0、全体体積正。可視法線半球guardのGPU監査は28側面で保護後の反対向きpixel0。隠れ面の全自己交差/全局所裏返り0の証明ではありません。全5clip×1920stepのGodot読込・ループ/UV/補正、6点軌跡を別途記録。`rebuild-validation.json`は新規フォルダで元入力からGLBがバイト一致。

## 見比べ・権利・検証の限界

- `comparison/final/`: v7/v8/v9を同尺度・同カメラ・同照明・同時刻で新規578枚。古い候補の合格を流用していません。1600×1000、版ごとのfitなし。v9は反側/背面・顔・毛色3種・全5歩法の連続位相を含みます。
- `reference-render/final/`: v8/v9の80枚。`reference-contours/final/`: 所有者輪郭とv8/v9の比較、15走り全コマ、地面固定、±1コマ位相感度、歩き8、駈歩8、Stand補助。原画は配布しません。
- 走りはユーザーが「走りはこれ」と指定した240×144/33fps/15frame、歩きは176×144/100fps/130frame。`owner-example-provenance.json`にSHA。**有料12コマ原画は未入手**。12枚版は支給15frame動画から抽出した別資料と明記し、全15も残しました。元12を見たとは扱いません。
- 走りは単一の等方scale、79/240周期の一定offset、き甲のフレームごとの平行移動。地面固定版は1つの移動だけ。頸部の局所warpや位相ごとの時間伸縮はしません。観測点の誤差±3source pixels、位相±1コマを併記。制御に使った点の曲線再比較は独立visual合格の根拠ではありません。
- 常歩は斜め前の未知カメラの近似比較で、正確な側面一致は未検証。駈歩は最新の走り正本から首頭だけ参考にし、脚は独自3拍。専用Canter原画との一致を主張しません。StandはPD写真の概略手輪郭。これらを「全4歩法の手本に完全一致」とは扱いません。
- PDの実馬資料は出典/権利metadataと元写真を `reference/`へ同梱。所有者CG動画/有料原画/私用の合成原画は含めず、輪郭/派生注記だけです。外部の有料生成APIは呼んでいません。Tripo由来部分の商用利用は持ち主の契約に従います。
- 元の立体の下垂尾・線状の毛の簡略さ、正本との脚や尾の形/タイミング差、近接での下頸の面感/鼻口の簡略さは残ります。独立レビューが追加する残件も併せて参照してください。実ゲーム騎手/手綱/遷移/LOD/FPS、全隠れ面、独立した人間の実時間動画再生は未検証。

## 修正の記録

初期02/09で袋状下頸・蹄色三角・影の反復帯を指摘され、sculpt/首ウェイト/補正・蹄の世界姿勢/色境界・影診断を順に分けて修正。`review/`に不合格レビューと修正後の別担当レビュー、`before-after.jpg`に同条件のv8/v9、および失敗候補の抜粋を添付。途中レビューを最終候補の合格記録に読み替えません。

納品枝は `codex/tripo-horse-handoff`、置き先 `artifacts/tripo-horse-v9/`。コード/データのgame差分なし。独立素材のみなのでこの納品枝には `tests/run.js` がなく、リポジトリ一般テストは実行不能（ログあり）。素材の専用再制作・import・連続描画・軌跡検証と独立レビューで検証範囲を区別しています。

知恵袋はこのセッションから403で接続できず未更新。一般化した追記候補を `reference/LESSON_FOR_KNOWLEDGEBASE.md` に同梱。Claude側で同ファイルの一項目をKnowledgeBaseへ反映してください。

配布容量調整：単独描画133枚のうち首寄り28枚も可逆WebPへ変換し、復号RGBA全画素一致を検査。残り105枚はPNG。元capture manifestのPNG名はimage-conversion-validation.jsonで配布名へ対応付け。元の画像を間引いたり縮小したりしていません。
