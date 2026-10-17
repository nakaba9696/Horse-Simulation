#!/bin/sh
# godot-cpp（Godot の C++ の結び目）を版を固定して取ってくる。godot/native/godot-cpp に置く（リポジトリには入れない）
# 10.0.0-stable（api_version 4.3〜4.7 に対応。Godot 4.7.2 で使う）
set -e
cd "$(dirname "$0")"
SHA=507ed9d840c01a3c5b2a39af8bb4000bfac30bf5
if [ -d godot-cpp/.git ] && [ "$(git -C godot-cpp rev-parse HEAD)" = "$SHA" ]; then touch godot-cpp/.gdignore; echo "godot-cpp は取ってある（$SHA）"; exit 0; fi
rm -rf godot-cpp
git init -q godot-cpp
git -C godot-cpp fetch -q --depth 1 https://github.com/godotengine/godot-cpp "$SHA"
git -C godot-cpp checkout -q FETCH_HEAD
touch godot-cpp/.gdignore # Godot に中を読ませない（ファイルが多い）
echo "godot-cpp を取った（$SHA）"
