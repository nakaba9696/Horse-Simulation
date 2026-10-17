#!/bin/sh
# Windows で遊べる版（.exe）を書き出す：build/windows/TurfLineage.exe と C++ の模擬の DLL
#   sh godot/tools/export_windows.sh
# 要るもの：Godot 4.7.2（GODOT、既定は /home/user/godot-bin/godot）と、その版の書き出し部品のうち
#   windows_release_x86_64.exe（~/.local/share/godot/export_templates/4.7.2.stable/ に置く）。
#   C++ の DLL は godot/native/build.sh で作る（mingw が要る）。DLL が無いと GDScript の模擬で動く（遅い）。
set -e
DIR=$(cd "$(dirname "$0")/.." && pwd)
GODOT=${GODOT:-/home/user/godot-bin/godot}
OUT="$DIR/../build/windows"
mkdir -p "$OUT"
"$GODOT" --headless --path "$DIR" --import >/dev/null 2>&1 || true
"$GODOT" --headless --path "$DIR" --export-release "Windows Desktop" "$OUT/TurfLineage.exe"
ls -la "$OUT"
