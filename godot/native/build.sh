#!/bin/sh
# C++ の模擬（GDExtension）を作る：godot-cpp を取り、この機械（Linux）向けと、mingw があれば Windows 向けを作る
#   sh godot/native/build.sh
# 要るもの：python3 と scons（pip install scons）・g++。Windows 向けは mingw（apt-get install g++-mingw-w64-x86-64-posix）
set -e
cd "$(dirname "$0")"
sh ./get_godot_cpp.sh
J=$(nproc 2>/dev/null || echo 4)
scons -j"$J"
if command -v x86_64-w64-mingw32-g++ >/dev/null 2>&1; then
  scons -j"$J" platform=windows use_mingw=yes target=template_release
fi
ls -la bin
