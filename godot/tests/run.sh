#!/bin/sh
# Godot 版の中身のテスト（headless）。node tests/run.js からも呼ばれる（Godot が無ければ飛ばす）
#   sh godot/tests/run.sh [名前の一部 …]
# GODOT＝Godot 4.7 の実行ファイル（既定は PATH の godot か /home/user/godot-bin/godot）
DIR=$(cd "$(dirname "$0")/.." && pwd)
if [ -z "$GODOT" ]; then
  if command -v godot >/dev/null 2>&1; then GODOT=godot; else GODOT=/home/user/godot-bin/godot; fi
fi
if ! [ -x "$GODOT" ] && ! command -v "$GODOT" >/dev/null 2>&1; then echo "godot: 見つからない（GODOT= で場所を渡す）"; exit 2; fi
# class_name の一覧（.godot/global_script_class_cache.cfg）を作るため、先に読み込みだけ行う。
# 標準入力を /dev/null にする：スクリプトの誤りがあると、Godot は入力待ちの debugger で止まる
timeout 600 "$GODOT" --headless --path "$DIR" --import < /dev/null > /dev/null 2>&1
OUT=$(mktemp)
timeout 1800 "$GODOT" --headless --path "$DIR" -s tests/run.gd -- "$@" < /dev/null > "$OUT" 2>&1
RC=$?
grep -v "^Godot Engine\|^$" "$OUT"
# 読み込みの誤りでは Godot が 0 で終わることがあるので、最後の集計の行が無ければ失敗にする
if [ $RC -eq 0 ] && ! grep -q "^godot: [0-9]* passed, 0 failed" "$OUT"; then RC=1; fi
rm -f "$OUT"
exit $RC
