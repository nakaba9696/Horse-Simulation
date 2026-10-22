# Claude向け：馬モデル試作 v2

このブランチは成果物の受け渡し専用です。ゲームへの統合は行っていません。ブランチ全体をマージする必要はありません。

## 取得

```sh
git fetch origin codex/tripo-horse-handoff
git show origin/codex/tripo-horse-handoff:artifacts/tripo-horse-v2/horse-claude-handoff-v2.zip > /tmp/horse-claude-handoff-v2.zip
unzip /tmp/horse-claude-handoff-v2.zip -d /tmp/horse-claude-handoff-v2
```

展開後のCLAUDE_HANDOFF.mdに従い、horse-gallop.glbを独立した試作シーンへ取り込んでください。既存馬の上書き・本採用は実画面で比較してから行ってください。

GLB、Blender編集用ファイル、元データ、再生動画、独立Godotプレビュー、再生成スクリプト、検証結果を含みます。歩様の自然さや移動速度との整合には調整が必要です。

ZIP SHA-256: `04e17a2d410f5c3c82a8fa7389f8115b94a27eda5b64eef9774e234688b0270e`
