# 引き継ぎ（2026-10-24。前のセッションから新しいセッションへ）

前のセッション（配り役）の会話が長くなったので、持ち主の指示（2026-10-24「新規セッションつくってそっちに引き継いで」）で新しいセッションへ引き継ぐ。作業の枝は `claude/lucid-ptolemy-j204a3`（このまま使う）。

## 最初にすること
1. CLAUDE.md の「仕事を始める前に（知恵袋）」の手順で、KnowledgeBase の `skills/session-ops/SKILL.md` と `skills/game-design/SKILL.md` を読む。
2. **C++ の模擬が JS とずれている所を直す**（下の「落ちているテスト」）。直るまで、ほかの変更を push しない。
3. `QUICK=1 node tests/run.js`（Godot は `/home/user/godot-bin/godot` に 4.7.2 を置くと一緒に回る。C++ の .so が無ければ `docs/GODOT.md` の手順で作る）が全部通ったら push。

## 落ちているテスト（前のセッションで直せなかった → 2026-10-24 に解決。枝 `claude/cpp-golden-fix`）
- **原因：C++ の .so が古かった。** 手元の .so（10月22日に作ったもの）が、いまの `godot/native/src` より前の版だった。`sh godot/native/build.sh` で作り直すと、`race parallel` は C++・GDScript とも全部通った（2030 passed, 0 failed）。C++ のコードも答え（golden）も直していない。
- ついでに `tests/extra_gf.js` の答えの古さを直した（ウォーアドミラルの行き先を `t:us3` → `t:gs_us`。データは持ち主の決定 2026-10-24 のとおりアメリカン GS に移っていた）。
- 以下は前のセッションの記録。
- `sh godot/tests/run.sh race parallel` の C++（native）の側で、「東京芝1800m 良 1972年 16頭」が JS の答え（`godot/tests/golden/races.json`）とずれる。GDScript の側は通る。parallel も 13件ずれる。
  - このコミットの前（e4b0738）では通っていた。そのあと変えたのは、データ（`data/horse_fix.js` の総合力・`data/trophy_horses.js`・名鑑と固有の技の文）と `godot/core/hs_eraless.gd`（倒した隠し馬をデビューに選ぶ）だけで、模擬のコードは変えていない。
  - 書き出したデータ（godot/data）を e4b0738 のものに戻すと、今度は答えを作り直した「札幌ダ2000m 1971年」がずれる（こちらは当然）。1972年のレースは、その状態でも落ちるかを確かめていない。
  - まず、C++ の .so（`godot/native/bin/`。10月22日に作ったもの）が、GDScript の模擬と同じ版かを確かめる。違えば作り直す。

## 2026-10-24 に持ち主が決めたこと（このコミットに入っている）
- **トロフィーの隠し馬**（`data/trophy_horses.js`。一覧は Artifact https://claude.ai/artifact/XUChxLvWDdwfTfq4d8HgJi ・`docs/SPECIAL_HORSES.md`）
  - リーチで出てくるのは、そのトロフィーの名馬からランダムに1頭。トロフィーを手にすると、その名馬が全部店に並ぶ。
  - 「無敗のときだけ出てくる」条件は無し。
  - 1989年からの日本の馬は隠し馬にしない（例外：ジャパンダート GS のスマートファルコン・コパノリッキー・ホッコータルマエ）。海外の総合力73.0以上は全部隠し馬。
  - 1989年からの隠し馬は毎年のデビューに出ないが、一度倒したら毎年のデビューにも選ぶ（`E.beatenHidden`・`beaten_hidden`）。
  - ホールオブフェイム・ワンダーホース・インモータルロード・豪州スプリント三冠は隠し馬なし。
  - 最後のレースの距離に合わない馬はいない（ウィンクスはワールドティアラ GS へ）。
- **総合力**（`data/horse_fix.js`）：ムトト 73.5・ミルリーフ 76.0・サイレントウィットネス 73.5・カーインライジング 74.5・ラッキースワイネス 69.5・サンオーイ 62.5・ハツシバオー 63・マスケット 70・コロネーション 68・ドクターフェイガー（ダ）74.5・ゴールデンホーン 73・ペブルス 71・フォルリ 69・テスコガビー 70.5・カブラヤオー 70.5・トムフール（ダ）73.5・オーソーシャープ 70.5・タロック 71。
- **名鑑の文**：出典で確かめられない着差は数字を書かない。「大差」は10馬身以上と読まれるので使わない。ケルソは3分19秒2のレコード・エネイブルの2017年の凱旋門賞はシャンティイ・ザテトラークのコヴェントリーSは「公式に10馬身とされるが、実際は50馬身と伝えられている」。
- 保留の一覧 `docs/review/PENDING.md` に、決まったこと（B1〜B7・C1・C2・D1〜D3・E1〜E4・F1・F2）を書いてある。

## まだしていない持ち主の頼み
1. **戦績**（名鑑の record）：ザフライングダッチマン「7戦7勝（うち1つは不戦勝）」、カランダガン「19戦10勝」。オーギュストロダン・デイラミ・ディラントーマスはいまのまま。ラウンドテーブルは https://ahonoora.com/round_table.html を参照（デビュー 1956年2月24日・4歳の年明けから7連勝・1959年ワシントンバースデーH 16着は合っていた。4歳の「20戦14勝」は確かめきれていない。通算は66戦43勝）。
2. **馬モデル v8 の取り込み**：`codex/tripo-horse-handoff` の `artifacts/tripo-horse-v8/CLAUDE_HANDOFF.md` を読んで取り込む（v7 の取り込みは枝 `claude/tripo-horse-v7`。依頼文は `docs/handoff/TRIPO_HORSE_V8_REQUEST.md`）。試作の場面で v7・いまの馬と並べ、絵を持ち主に見せて採るかを聞く。
3. **子セッションの取り込み**（終わったら1つずつ merge・生成物と一致テストの答えを作り直す・テストを通して push）：
   - B9・B10（名鑑とデータの穴）：session_01F5iNXEYaZDiV1byUrqzBx6・枝 `claude/hidden-profiles`。**終わっている**。
   - E2・E4（能力の洗い出しと殿堂馬）：session_01NswQfzcqkPQcdP3LGwvbfv・枝 `claude/ability-review`。走っている。終わったら、Codex への依頼文（`docs/review/codex/ABILITIES_REVIEW_REQUEST.md`）を push してから、持ち主に「投げる文」を渡す。
4. **Codex のレビュー**：名鑑と固有の技（`docs/review/codex/PROFILES_UNIQUES_REVIEW_REQUEST.md`。結果は枝 `codex/profiles-review`）。届いたら確かな誤りだけ直す。

## 気をつけること（前のセッションでの失敗）
- 持ち主に「Codex に投げる文」を渡す前に、依頼文のファイルを必ず push して、`git log origin/claude/lucid-ptolemy-j204a3` で載っていることを確かめる。
- 固有の技（`data/uniques.js`）の画面に出る説明は `note`（発動の条件と効果）。`why` は根拠の記録で画面に出ない。
