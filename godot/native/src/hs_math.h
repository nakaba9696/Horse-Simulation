// JS（V8）の Math と同じ値を返す数学の関数（godot/core/hs_math.gd と同じ）。V8 が使う fdlibm（src/base/ieee754.cc）を C++ に移した。
// OS の数学ライブラリ（std::sin など）は JS と最後の桁が違うことがあるので、模擬の中では必ずここを通す。
// fdlibm: Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
// Developed at SunSoft, a Sun Microsystems, Inc. business. Permission to use, copy, modify, and distribute this
// software is freely granted, provided that this notice is preserved.
#pragma once
#include <cstdint>
#include <cstring>
#include <cmath>
#include <string>

namespace hs {

inline double from_bits(uint64_t b) { double d; std::memcpy(&d, &b, 8); return d; }
inline uint64_t to_bits(double d) { uint64_t b; std::memcpy(&b, &d, 8); return b; }
inline int32_t hi_s(double x) { return (int32_t)(uint32_t)(to_bits(x) >> 32); }
inline uint32_t hi_u(double x) { return (uint32_t)(to_bits(x) >> 32); }
inline uint32_t lo_u(double x) { return (uint32_t)to_bits(x); }
inline double words(uint32_t h, uint32_t l) { return from_bits(((uint64_t)h << 32) | l); }
inline double set_hi(double x, uint32_t v) { return words(v, lo_u(x)); }
inline double set_lo(double x, uint32_t v) { return words(hi_u(x), v); }

extern const double M_PI_JS, M_TWO_PI_JS, M_HALF_PI_JS;

// JS の Math.max・Math.min（+0 と -0 を区別する。NaN はそのまま）
inline double mx(double a, double b) {
	if (a > b) return a;
	if (b > a) return b;
	if (a == b && a != 0.0) return a;
	return a + b;
}
inline double mn(double a, double b) {
	if (a < b) return a;
	if (b < a) return b;
	if (a == b && a != 0.0) return a;
	return -((-a) + (-b));
}
inline double clamp(double v, double a, double b) { return mx(a, mn(b, v)); }
// 組み込みの max・min（GDScript の maxf・minf と同じ。-0 を区別しない所で使う）
inline double maxf(double a, double b) { return a < b ? b : a; }
inline double minf(double a, double b) { return a < b ? a : b; }
// Math.round（V8：ceil して、0.5 引いた値が x より大きければ 1 戻す）
inline double round_js(double x) { double c = std::ceil(x); return c - 0.5 <= x ? c : c - 1.0; }
inline double sign_js(double x) { return x > 0.0 ? 1.0 : (x < 0.0 ? -1.0 : x); }

double cos_(double x);
double sin_(double x);
double exp_(double x);
double log_(double x);
double cbrt(double x);
double pow_(double x, double y);
double hypot(double a, double b);
// Number.prototype.toFixed(d)（d は 0〜3）
std::string to_fixed(double x, int d);
// String(数)：整数のときだけ（模擬の実況で使うのは整数だけ）
std::string num_str(double v);

} // namespace hs
