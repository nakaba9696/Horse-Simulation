// 種で固定の乱数（godot/core/hs_rng.gd・js/core/util.js の U.RNG と同じ mulberry32）
#pragma once
#include <cstdint>
#include <cmath>
#include "hs_math.h"

namespace hs {

struct Rng {
	uint32_t s = 1;
	double next() {
		s = s + 0x6D2B79F5u;
		uint32_t t = s;
		t = (uint32_t)((uint64_t)(t ^ (t >> 15)) * (uint64_t)(t | 1));
		t ^= t + (uint32_t)((uint64_t)(t ^ (t >> 7)) * (uint64_t)(t | 61));
		return (double)(t ^ (t >> 14)) / 4294967296.0;
	}
	double float_(double a = 0.0, double b = 1.0) { return a + (b - a) * next(); }
	bool chance(double p) { return next() < p; }
	double normal(double m = 0.0, double sd = 1.0) {
		double u = 0.0, v = 0.0;
		while (u == 0.0) u = next();
		while (v == 0.0) v = next();
		return m + sd * std::sqrt(-2.0 * log_(u)) * cos_(M_TWO_PI_JS * v);
	}
};

} // namespace hs
