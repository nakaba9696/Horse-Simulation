# 馬モデル v9

2026-10-25（Asia/Tokyo）。納品枝 `codex/tripo-horse-handoff`。元v8から、指定走り動画に合わせて首を前へ出す形と頭頸/胴の時機を修正。首下面の角・蹄の変形/色境界・studioの影帯も修正しました。ゲーム本体のコード・データは変更していません。

Claudeへは [CLAUDE_HANDOFF.md](CLAUDE_HANDOFF.md) を読むよう伝えてください。**4蹄骨の親と付属シェーダの補正を一式で取り込む**必要があります。

- [ZIP一式](tripo-horse-v9.zip) — 103,540,908 bytes（98.74 MiB）。GLB/Blender元/再制作tools/独立Godot4.6.3/1155ファイルのSHA256SUMS/検証/全画像を収録。
- [修正前後](before-after.jpg)、[v7/v8/v9同条件比較](compare-side.jpg)、[首寄り比較](compare-neck.jpg)、[v9と走りの輪郭12枚](v9-video-derived-twelve.jpg)。輪郭は支給15コマ動画から抽出した12枚で、有料12コマ原画ではありません。全15コマ/地面固定/歩き8/駈歩guidance8/Stand PD補助はZIP内。
- [走り比較動画](comparison-preview.mp4)、[常歩](walk-comparison.mp4)、[駈歩](canter-comparison.mp4)。全5歩法の連続画像・比較動画を同梱。
- [一次レビュー](final-primary-review.md)・[最終独立レビュー](FINAL_INDEPENDENT_REVIEW.md)。別担当2名が連続シートと重点原寸で確認。全578枚を全原寸で見た意味ではありません。v8比較assetの旧30fps設定を発見後、全版240fps/nooptimizerへ統一して比較用v8を再描画・再レビューしました。
- [首/頭のv6/v7/v8/v9測定](anatomy-comparison.json)。寸法は報告のみ、旧v8数値の合格基準は撤回。54骨・19,168三角形・7m/.45s・5歩法・6取付点・2補正を維持。

最終GLB SHA-256: `50f8c9d320b6cb72a19a258f237d8589446b1d18b27af18b69cc77fac61dc125`

ZIP SHA-256: `eb16022e7cdbf8f0f60c1e403f3f8b6095bc19ab8a364130ca1d0070ee708ff0`

ZIP展開後 `sha256sum -c SHA256SUMS`。比較578/参照render80の全数を可逆WebPにし、単独133枚は105PNG+首寄り28可逆WebP。全変換を復号RGBA完全一致で確認。画像の間引きや解像度縮小なし。1600×1000、共有カメラ/尺度/照明/歩法時刻です。

独立素材の閲覧範囲で画像レビューを通過しました。**全身の手本完全一致・ゼロ滑り・実ゲーム本採用の合格ではありません。** 接地端の補間残速度（支持全窓RMS約.32〜.75m/s）、正本との脚/尻/尾の差、Walk未知カメラ・Canter専用脚資料不在、ゲームの騎手/手綱/遷移/LOD/FPS等の未検証範囲をHANDOFFへ記載。付属studio影max6mは実レースSunへそのまま流用しません。

支給原動画/有料原画や私用合成は非同梱、許可された派生輪郭とPD資料のみ。新しい有料API呼出しなし。独立した別フォルダからGLBを再制作しバイト一致、最終ZIPのCRC/SHA全件・空cacheからGodot再import/全5歩法/6点軌跡を検証。結果は [delivery-validation.json](delivery-validation.json)。
