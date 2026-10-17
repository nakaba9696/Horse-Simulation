// fdlibm（V8 の src/base/ieee754.cc）を移したもの。godot/core/hs_math.gd と同じ値になる（一致テスト test_math.gd）
#include "hs_math.h"

namespace hs {

#define F(h) from_bits(0x##h##ULL)

const double M_PI_JS = F(400921fb54442d18);
const double M_TWO_PI_JS = F(401921fb54442d18);
const double M_HALF_PI_JS = F(3ff921fb54442d18);

static const double invpio2 = F(3fe45f306dc9c883), pio2_1 = F(3ff921fb54400000), pio2_1t = F(3dd0b4611a626331), pio2_2 = F(3dd0b4611a600000),
	pio2_2t = F(3ba3198a2e037073), pio2_3 = F(3ba3198a2e000000), pio2_3t = F(397b839a252049c1);
static const double KC1 = F(3fa555555555554c), KC2 = F(bf56c16c16c15177), KC3 = F(3efa01a019cb1590), KC4 = F(be927e4f809c52ad),
	KC5 = F(3e21ee9ebdb4b1c4), KC6 = F(bda8fae9be8838d4);
static const double KS1 = F(bfc5555555555549), KS2 = F(3f8111111110f8a6), KS3 = F(bf2a01a019c161d5), KS4 = F(3ec71de357b1fe7d),
	KS5 = F(be5ae5e68a2b9ceb), KS6 = F(3de5d93a5acfd57c);
static const double o_threshold = F(40862e42fefa39ef), u_threshold = F(c0874910d52d3051), ln2HI = F(3fe62e42fee00000), ln2LO = F(3dea39ef35793c76),
	invln2 = F(3ff71547652b82fe);
static const double EP1 = F(3fc555555555553e), EP2 = F(bf66c16c16bebd93), EP3 = F(3f11566aaf25de2c), EP4 = F(bebbbd41c5d26bf1), EP5 = F(3e66376972bea4d0);
static const double E_ = F(4005bf0a8b145769), twom1000 = F(0170000000000000), two1023 = F(7fe0000000000000), two54 = F(4350000000000000);
static const double Lg1 = F(3fe5555555555593), Lg2 = F(3fd999999997fa04), Lg3 = F(3fd2492494229359), Lg4 = F(3fcc71c51d8e78af),
	Lg5 = F(3fc7466496cb03de), Lg6 = F(3fc39a09d078c69f), Lg7 = F(3fc2f112df3e5244), third17 = F(3fd5555555555555);
static const double CP0 = F(3ffe03e60f61e692), CP1 = F(bffe28e092f02420), CP2 = F(3ff9f1604a49d6c2), CP3 = F(bfe844cbbee751d9), CP4 = F(3fc2b000d4e4edd7);
static const double dp_h1 = F(3fe2b80340000000), dp_l1 = F(3e4cfdeb43cfd006), two53 = F(4340000000000000), huge = F(7e37e43c8800759c);
static const double L1 = F(3fe3333333333303), L2 = F(3fdb6db6db6fabff), L3 = F(3fd55555518f264d), L4 = F(3fd17460a91d4101),
	L5 = F(3fcd864a93c9db65), L6 = F(3fca7e284a454eef);
static const double lg2 = F(3fe62e42fefa39ef), lg2_h = F(3fe62e4300000000), lg2_l = F(be205c610ca86c39), ovt = F(3c971547652b82fe),
	cp = F(3feec709dc3a03fd), cp_h = F(3feec709e0000000), cp_l = F(be3e2fe0145b01f5), ivln2 = F(3ff71547652b82fe), ivln2_h = F(3ff7154760000000),
	ivln2_l = F(3e54ae0bf85ddf44), third22 = F(3fd5555555555555);
static const double INF_ = F(7ff0000000000000), NAN_ = F(7ff8000000000000);

static const int32_t npio2_hw[32] = {
	0x3FF921FB, 0x400921FB, 0x4012D97C, 0x401921FB, 0x401F6A7A, 0x4022D97C,
	0x4025FDBB, 0x402921FB, 0x402C463A, 0x402F6A7A, 0x4031475C, 0x4032D97C,
	0x40346B9C, 0x4035FDBB, 0x40378FDB, 0x403921FB, 0x403AB41B, 0x403C463A,
	0x403DD85A, 0x403F6A7A, 0x40407E4C, 0x4041475C, 0x4042106C, 0x4042D97C,
	0x4043A28C, 0x40446B9C, 0x404534AC, 0x4045FDBB, 0x4046C6CB, 0x40478FDB,
	0x404858EB, 0x404921FB };

// x を π/2 の n 倍と余り（y0＋y1）に。|x| が 2^19×π/2 までだけ（模擬に出てくる範囲）
static int rem_pio2(double x, double &y0, double &y1) {
	int32_t hx = hi_s(x);
	int32_t ix = hx & 0x7FFFFFFF;
	double z;
	if (ix <= 0x3FE921FB) { y0 = x; y1 = 0.0; return 0; }
	if (ix < 0x4002D97C) {
		if (hx > 0) {
			z = x - pio2_1;
			if (ix != 0x3FF921FB) { y0 = z - pio2_1t; y1 = (z - y0) - pio2_1t; }
			else { z -= pio2_2; y0 = z - pio2_2t; y1 = (z - y0) - pio2_2t; }
			return 1;
		} else {
			z = x + pio2_1;
			if (ix != 0x3FF921FB) { y0 = z + pio2_1t; y1 = (z - y0) + pio2_1t; }
			else { z += pio2_2; y0 = z + pio2_2t; y1 = (z - y0) + pio2_2t; }
			return -1;
		}
	}
	if (ix <= 0x413921FB) {
		double t = std::fabs(x);
		int32_t n = (int32_t)(t * invpio2 + 0.5);
		double fn = (double)n;
		double r = t - fn * pio2_1;
		double w = fn * pio2_1t;
		if (n < 32 && ix != npio2_hw[n - 1]) {
			y0 = r - w;
		} else {
			int32_t j = ix >> 20;
			y0 = r - w;
			uint32_t high = hi_u(y0);
			int32_t i = j - (int32_t)((high >> 20) & 0x7FF);
			if (i > 16) {
				t = r;
				w = fn * pio2_2;
				r = t - w;
				w = fn * pio2_2t - ((t - r) - w);
				y0 = r - w;
				high = hi_u(y0);
				i = j - (int32_t)((high >> 20) & 0x7FF);
				if (i > 49) {
					t = r;
					w = fn * pio2_3;
					r = t - w;
					w = fn * pio2_3t - ((t - r) - w);
					y0 = r - w;
				}
			}
		}
		y1 = (r - y0) - w;
		if (hx < 0) { y0 = -y0; y1 = -y1; return -n; }
		return n;
	}
	if (ix >= 0x7FF00000) { y0 = x - x; y1 = x - x; return 0; }
	y0 = NAN_; y1 = NAN_;
	return 0;
}

static double k_cos(double x, double y) {
	int32_t ix = hi_s(x) & 0x7FFFFFFF;
	if (ix < 0x3E400000) {
		if ((int)x == 0) return 1.0;
	}
	double z = x * x;
	double r = z * (KC1 + z * (KC2 + z * (KC3 + z * (KC4 + z * (KC5 + z * KC6)))));
	if (ix < 0x3FD33333) return 1.0 - (0.5 * z - (z * r - x * y));
	double qx;
	if (ix > 0x3FE90000) qx = 0.28125;
	else qx = words((uint32_t)(ix - 0x00200000), 0);
	double iz = 0.5 * z - qx;
	double a = 1.0 - qx;
	return a - (iz - (z * r - x * y));
}

static double k_sin(double x, double y, int iy) {
	int32_t ix = hi_s(x) & 0x7FFFFFFF;
	if (ix < 0x3E400000) {
		if ((int)x == 0) return x;
	}
	double z = x * x;
	double v = z * x;
	double r = KS2 + z * (KS3 + z * (KS4 + z * (KS5 + z * KS6)));
	if (iy == 0) return x + v * (KS1 + z * r);
	return x - ((z * (0.5 * y - v * r) - y) - v * KS1);
}

double cos_(double x) {
	int32_t ix = hi_s(x) & 0x7FFFFFFF;
	if (ix <= 0x3FE921FB) return k_cos(x, 0.0);
	if (ix >= 0x7FF00000) return x - x;
	double y0, y1;
	int n = rem_pio2(x, y0, y1);
	switch (n & 3) {
		case 0: return k_cos(y0, y1);
		case 1: return -k_sin(y0, y1, 1);
		case 2: return -k_cos(y0, y1);
		default: return k_sin(y0, y1, 1);
	}
}

double sin_(double x) {
	int32_t ix = hi_s(x) & 0x7FFFFFFF;
	if (ix <= 0x3FE921FB) return k_sin(x, 0.0, 0);
	if (ix >= 0x7FF00000) return x - x;
	double y0, y1;
	int n = rem_pio2(x, y0, y1);
	switch (n & 3) {
		case 0: return k_sin(y0, y1, 1);
		case 1: return k_cos(y0, y1);
		case 2: return -k_sin(y0, y1, 1);
		default: return -k_cos(y0, y1);
	}
}

double exp_(double x) {
	double hi = 0.0, lo = 0.0;
	int32_t k = 0;
	uint32_t hx = hi_u(x);
	int32_t xsb = (hx >> 31) & 1;
	hx &= 0x7FFFFFFF;
	if (hx >= 0x40862E42) {
		if (hx >= 0x7FF00000) {
			uint32_t lx = lo_u(x);
			if (((hx & 0xFFFFF) | lx) != 0) return x + x;
			return xsb == 0 ? x : 0.0;
		}
		if (x > o_threshold) return INF_;
		if (x < u_threshold) return 0.0;
	}
	if (hx > 0x3FD62E42) {
		if (hx < 0x3FF0A2B2) {
			if (x == 1.0) return E_;
			hi = x - (xsb == 0 ? ln2HI : -ln2HI);
			lo = xsb == 0 ? ln2LO : -ln2LO;
			k = 1 - xsb - xsb;
		} else {
			k = (int32_t)(invln2 * x + (xsb == 0 ? 0.5 : -0.5));
			double tk = (double)k;
			hi = x - tk * ln2HI;
			lo = tk * ln2LO;
		}
		x = hi - lo;
	} else if (hx < 0x3E300000) {
		if (huge + x > 1.0) return 1.0 + x;
	} else {
		k = 0;
	}
	double t = x * x;
	double twopk;
	if (k >= -1021) twopk = words(0x3FF00000u + ((uint32_t)k << 20), 0);
	else twopk = words(0x3FF00000u + ((uint32_t)(k + 1000) << 20), 0);
	double c = x - t * (EP1 + t * (EP2 + t * (EP3 + t * (EP4 + t * EP5))));
	if (k == 0) return 1.0 - ((x * c) / (c - 2.0) - x);
	double y = 1.0 - ((lo - (x * c) / (2.0 - c)) - hi);
	if (k >= -1021) {
		if (k == 1024) return y * 2.0 * two1023;
		return y * twopk;
	}
	return y * twopk * twom1000;
}

double log_(double x) {
	int32_t hx = hi_s(x);
	uint32_t lx = lo_u(x);
	int32_t k = 0;
	if (hx < 0x00100000) {
		if (((hx & 0x7FFFFFFF) | lx) == 0) return -INF_;
		if (hx < 0) return NAN_;
		k -= 54;
		x *= two54;
		hx = hi_s(x);
	}
	if (hx >= 0x7FF00000) return x + x;
	k += (hx >> 20) - 1023;
	hx &= 0x000FFFFF;
	int32_t i = (hx + 0x95F64) & 0x100000;
	x = set_hi(x, (uint32_t)(hx | (i ^ 0x3FF00000)));
	k += (i >> 20);
	double f = x - 1.0;
	double dk, R;
	if ((0x000FFFFF & (2 + hx)) < 3) {
		if (f == 0.0) {
			if (k == 0) return 0.0;
			dk = (double)k;
			return dk * ln2HI + dk * ln2LO;
		}
		R = f * f * (0.5 - third17 * f);
		if (k == 0) return f - R;
		dk = (double)k;
		return dk * ln2HI - ((R - dk * ln2LO) - f);
	}
	double s = f / (2.0 + f);
	dk = (double)k;
	double z = s * s;
	i = hx - 0x6147A;
	double w = z * z;
	int32_t j = 0x6B851 - hx;
	double t1 = w * (Lg2 + w * (Lg4 + w * Lg6));
	double t2 = z * (Lg1 + w * (Lg3 + w * (Lg5 + w * Lg7)));
	i |= j;
	R = t2 + t1;
	if (i > 0) {
		double hfsq = 0.5 * f * f;
		if (k == 0) return f - (hfsq - s * (hfsq + R));
		return dk * ln2HI - ((hfsq - (s * (hfsq + R) + dk * ln2LO)) - f);
	}
	if (k == 0) return f - s * (f - R);
	return dk * ln2HI - ((s * (f - R) - dk * ln2LO) - f);
}

double cbrt(double x) {
	uint32_t hx = hi_u(x), low = lo_u(x);
	uint32_t sgn = hx & 0x80000000u;
	hx ^= sgn;
	if (hx >= 0x7FF00000) return x + x;
	double t = 0.0;
	if (hx < 0x00100000) {
		if ((hx | low) == 0) return x;
		t = set_hi(t, 0x43500000);
		t *= x;
		uint32_t high = hi_u(t);
		t = words(sgn | ((high & 0x7FFFFFFF) / 3 + 696219795), 0);
	} else {
		t = words(sgn | (hx / 3 + 715094163), 0);
	}
	double r = (t * t) * (t / x);
	t = t * ((CP0 + r * (CP1 + r * CP2)) + ((r * r) * r) * (CP3 + r * CP4));
	uint64_t bits = to_bits(t);
	bits = (bits + 0x80000000ULL) & 0xFFFFFFFFC0000000ULL;
	t = from_bits(bits);
	double s = t * t;
	r = x / s;
	double w = t + t;
	r = (r - t) / (w + r);
	t = t + t * r;
	return t;
}

static double scalbn_js(double z, int32_t n) {
	while (n > 0) { int32_t k = n < 1000 ? n : 1000; z *= words(0x3FF00000u + ((uint32_t)k << 20), 0); n -= k; }
	while (n < 0) { int32_t k = -n < 1000 ? -n : 1000; z *= words(0x3FF00000u - ((uint32_t)k << 20), 0); n += k; }
	return z;
}

double pow_(double x, double y) {
	double z, ax, z_h, z_l, p_h, p_l, y1, t1, t2, r, s, t, u, v, w;
	int32_t i, j, k, yisint, n;
	int32_t hx = hi_s(x); uint32_t lx = lo_u(x);
	int32_t hy = hi_s(y); uint32_t ly = lo_u(y);
	int32_t ix = hx & 0x7fffffff;
	int32_t iy = hy & 0x7fffffff;
	if (((uint32_t)iy | ly) == 0) return 1.0;
	if (ix > 0x7ff00000 || (ix == 0x7ff00000 && lx != 0) || iy > 0x7ff00000 || (iy == 0x7ff00000 && ly != 0)) return x + y;
	yisint = 0;
	if (hx < 0) {
		if (iy >= 0x43400000) yisint = 2;
		else if (iy >= 0x3ff00000) {
			k = (iy >> 20) - 0x3ff;
			if (k > 20) {
				uint32_t ju = ly >> (52 - k);
				if ((uint32_t)(ju << (52 - k)) == ly) yisint = 2 - (int32_t)(ju & 1);
			} else if (ly == 0) {
				j = iy >> (20 - k);
				if ((j << (20 - k)) == iy) yisint = 2 - (j & 1);
			}
		}
	}
	if (ly == 0) {
		if (iy == 0x7ff00000) {
			if (((ix - 0x3ff00000) | (int32_t)lx) == 0) return y - y;
			else if (ix >= 0x3ff00000) return hy >= 0 ? y : 0.0;
			else return hy < 0 ? -y : 0.0;
		}
		if (iy == 0x3ff00000) return hy < 0 ? 1.0 / x : x;
		if (hy == 0x40000000) return x * x;
		if (hy == 0x3fe00000) {
			if (hx >= 0) return std::sqrt(x);
		}
	}
	ax = std::fabs(x);
	if (lx == 0) {
		if (ix == 0x7ff00000 || ix == 0 || ix == 0x3ff00000) {
			z = ax;
			if (hy < 0) z = 1.0 / z;
			if (hx < 0) {
				if (((ix - 0x3ff00000) | yisint) == 0) z = NAN_;
				else if (yisint == 1) z = -z;
			}
			return z;
		}
	}
	n = (hx >> 31) + 1;
	if ((n | yisint) == 0) return NAN_;
	s = 1.0;
	if ((n | (yisint - 1)) == 0) s = -1.0;
	if (iy > 0x41e00000) {
		if (iy > 0x43f00000) {
			if (ix <= 0x3fefffff) return hy < 0 ? INF_ : 0.0;
			if (ix >= 0x3ff00000) return hy > 0 ? INF_ : 0.0;
		}
		if (ix < 0x3fefffff) return hy < 0 ? s * INF_ : s * 0.0;
		if (ix > 0x3ff00000) return hy > 0 ? s * INF_ : s * 0.0;
		t = ax - 1.0;
		w = (t * t) * (0.5 - t * (third22 - t * 0.25));
		u = ivln2_h * t;
		v = t * ivln2_l - w * ivln2;
		t1 = u + v;
		t1 = set_lo(t1, 0);
		t2 = v - (t1 - u);
	} else {
		double ss, s2, s_h, s_l, t_h, t_l;
		n = 0;
		if (ix < 0x00100000) {
			ax *= two53;
			n -= 53;
			ix = hi_s(ax);
		}
		n += (ix >> 20) - 0x3ff;
		j = ix & 0x000fffff;
		ix = j | 0x3ff00000;
		if (j <= 0x3988E) k = 0;
		else if (j < 0xBB67A) k = 1;
		else { k = 0; n += 1; ix -= 0x00100000; }
		ax = set_hi(ax, (uint32_t)ix);
		double bpk = k == 0 ? 1.0 : 1.5;
		double dphk = k == 0 ? 0.0 : dp_h1;
		double dplk = k == 0 ? 0.0 : dp_l1;
		u = ax - bpk;
		v = 1.0 / (ax + bpk);
		ss = u * v;
		s_h = ss;
		s_h = set_lo(s_h, 0);
		t_h = 0.0;
		t_h = set_hi(t_h, (uint32_t)(((ix >> 1) | 0x20000000) + 0x00080000 + (k << 18)));
		t_l = ax - (t_h - bpk);
		s_l = v * ((u - s_h * t_h) - s_h * t_l);
		s2 = ss * ss;
		r = s2 * s2 * (L1 + s2 * (L2 + s2 * (L3 + s2 * (L4 + s2 * (L5 + s2 * L6)))));
		r += s_l * (s_h + ss);
		s2 = s_h * s_h;
		t_h = 3.0 + s2 + r;
		t_h = set_lo(t_h, 0);
		t_l = r - ((t_h - 3.0) - s2);
		u = s_h * t_h;
		v = s_l * t_h + t_l * ss;
		p_h = u + v;
		p_h = set_lo(p_h, 0);
		p_l = v - (p_h - u);
		z_h = cp_h * p_h;
		z_l = cp_l * p_h + p_l * cp + dplk;
		t = (double)n;
		t1 = (((z_h + z_l) + dphk) + t);
		t1 = set_lo(t1, 0);
		t2 = z_l - (((t1 - t) - dphk) - z_h);
	}
	y1 = y;
	y1 = set_lo(y1, 0);
	p_l = (y - y1) * t1 + y * t2;
	p_h = y1 * t1;
	z = p_l + p_h;
	j = hi_s(z);
	uint32_t iu = lo_u(z);
	if (j >= 0x40900000) {
		if ((((uint32_t)j - 0x40900000u) | iu) != 0) return s * INF_;
		else if (p_l + ovt > z - p_h) return s * INF_;
	} else if ((j & 0x7fffffff) >= 0x4090cc00) {
		if ((((uint32_t)j - 0xc090cc00u) | iu) != 0) return s * 0.0;
		else if (p_l <= z - p_h) return s * 0.0;
	}
	i = j & 0x7fffffff;
	k = (i >> 20) - 0x3ff;
	n = 0;
	if (i > 0x3fe00000) {
		n = j + (0x00100000 >> (k + 1));
		k = ((n & 0x7fffffff) >> 20) - 0x3ff;
		t = 0.0;
		t = set_hi(t, (uint32_t)(n & ~(0x000fffff >> k)));
		n = ((n & 0x000fffff) | 0x00100000) >> (20 - k);
		if (j < 0) n = -n;
		p_h -= t;
	}
	t = p_l + p_h;
	t = set_lo(t, 0);
	u = t * lg2_h;
	v = (p_l - (t - p_h)) * lg2 + t * lg2_l;
	z = u + v;
	w = v - (z - u);
	t = z * z;
	t1 = z - t * (EP1 + t * (EP2 + t * (EP3 + t * (EP4 + t * EP5))));
	r = (z * t1) / ((t1 - 2.0) - (w + z * w));
	z = 1.0 - (r - z);
	j = hi_s(z);
	j = (int32_t)((uint32_t)j + ((uint32_t)n << 20));
	if ((j >> 20) <= 0) {
		z = scalbn_js(z, n);
	} else {
		int32_t tmp = hi_s(z);
		z = set_hi(z, (uint32_t)tmp + ((uint32_t)n << 20));
	}
	return s * z;
}

double hypot(double a, double b) {
	a = std::fabs(a); b = std::fabs(b);
	if (std::isnan(a) || std::isnan(b)) return (std::isinf(a) || std::isinf(b)) ? INF_ : NAN_;
	double m = maxf(a, b);
	if (std::isinf(m)) return INF_;
	if (m == 0.0) return 0.0;
	double sum = 0.0, comp = 0.0;
	const double vs[2] = { a, b };
	for (double vv : vs) {
		double nn = vv / m;
		double summand = nn * nn - comp;
		double prelim = sum + summand;
		comp = (prelim - sum) - summand;
		sum = prelim;
	}
	return std::sqrt(sum) * m;
}

std::string to_fixed(double x, int d) {
	if (std::isnan(x)) return "NaN";
	bool neg = x < 0.0;
	double ax = std::fabs(x);
	int64_t p = 1;
	for (int i = 0; i < d; i++) p *= 10;
	uint32_t h = hi_u(ax), l = lo_u(ax);
	int64_t ex = (h >> 20) & 0x7FF;
	int64_t m = ((int64_t)(h & 0xFFFFF) << 32) | l;
	if (ex == 0) ex = 1;
	else m |= (int64_t)1 << 52;
	int64_t e = ex - 1075;
	int64_t num = m * p;
	int64_t n;
	if (e >= 0) n = (int64_t)((uint64_t)num << e);
	else {
		int64_t sh = -e;
		if (sh >= 64) n = 0;
		else if (sh == 63) n = num >= ((int64_t)1 << 62) ? 1 : 0;
		else {
			n = num >> sh;
			if (num - (n << sh) >= ((int64_t)1 << (sh - 1))) n += 1;
		}
	}
	std::string s = std::to_string(n);
	if (d > 0) {
		while ((int)s.size() <= d) s = "0" + s;
		s = s.substr(0, s.size() - d) + "." + s.substr(s.size() - d);
	}
	return neg ? "-" + s : s;
}

std::string num_str(double v) {
	if (v == std::floor(v) && std::fabs(v) < 1e18) return std::to_string((long long)v);
	char buf[64];
	snprintf(buf, sizeof buf, "%.17g", v);
	return buf;
}

} // namespace hs
