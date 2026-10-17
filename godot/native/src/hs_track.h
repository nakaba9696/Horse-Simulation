// コースの形（godot/core/hs_track.gd・js/core/track.js と同じ）。ゴールからさかのぼった距離 s から、位置・曲がり・コーナー・高さ・勾配を出す
#pragma once
#include <vector>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/string.hpp>
#include <godot_cpp/variant/variant.hpp>

namespace hs {

struct TrackPt { double x, y, curv; int corner; };

struct Track {
	double L = 0, a = 0, r = 0, straight = 0, sign_ = 1;
	bool flat = false, line = false;
	godot::String id;
	godot::Variant layout; // data の辞書そのもの（無ければ null）
	// 楕円（make）
	bool ell = false;
	double goalX = 0, seg1 = 0;
	// 実際の回り（fromLayout）
	int n = 0;
	double dl = 0;
	std::vector<double> X, Y, K, Hs;
	std::vector<int> C;

	static Track *make(double lap, double straight_, const godot::Variant &dir);
	static Track *from_layout(const godot::Dictionary &lay, const godot::Variant &dir);
	TrackPt at(double s) const;
	double h_at(double s) const;
	double g_at(double s) const { if (ell) return 0.0; return (h_at(s - 5.0) - h_at(s + 5.0)) / 10.0; }
	int corner_at(double R) const;
};

// レースのコース：geo（lap・straight・slope・speed）と形。形は回り・向きごとに使い回す（作ったあとは読むだけ）
struct ForRace { godot::Dictionary geo; Track *track; godot::Variant dir; godot::Variant layout; bool owned; };
void track_cache_clear();
ForRace track_for_race(const godot::Dictionary &race, const godot::Dictionary &courses, const godot::Dictionary &layouts);

} // namespace hs
