// コースの形（godot/core/hs_track.gd と同じ計算の順）
#include "hs_track.h"
#include "hs_math.h"
#include "hs_var.h"
#include <mutex>
#include <algorithm>
#include <godot_cpp/variant/array.hpp>
#include <godot_cpp/variant/utility_functions.hpp>

using namespace godot;

namespace hs {

static const double STEP = 0.5;
static inline double u01(double v) { return v < 0.0 ? 0.0 : (v > 1.0 ? 1.0 : v); }

Track *Track::make(double lap, double straight_, const Variant &dir) {
	Track *t = new Track();
	t->ell = true;
	double L_ = num_or(lap, 2000.0);
	double minR = L_ * 0.06;
	double runout = mn(170.0, mx(90.0, L_ * 0.07));
	double a_ = mx(num_or(straight_, 400.0) + runout, L_ * 0.22);
	double r_ = (L_ - 2.0 * a_) / (2.0 * M_PI_JS);
	if (r_ < minR) { r_ = minR; a_ = (L_ - 2.0 * M_PI_JS * r_) / 2.0; }
	double st = mn(a_, num_or(straight_, a_));
	t->sign_ = is_str(dir, "左") ? -1.0 : 1.0;
	t->goalX = st - a_ / 2.0;
	t->seg1 = a_ / 2.0 + t->goalX;
	t->L = L_; t->a = a_; t->r = r_; t->straight = st; t->flat = true;
	return t;
}

struct Part { double len, th, r0, r1; int c; };

static double k_at(const Part &q, double u) {
	if (q.th == 0.0) return 0.0;
	double T = std::fabs(q.th), a_ = (q.r1 - q.r0) / (2.0 * T), b = q.r0;
	double phi = std::fabs(a_) < 1e-9 ? u / b : (-b + std::sqrt(mx(0.0, b * b + 4.0 * a_ * u))) / (2.0 * a_);
	return sign_js(q.th) / (q.r0 + (q.r1 - q.r0) * u01(phi / T));
}

static double h_raw(const std::vector<std::pair<double, double>> &E, double s) {
	if (E.size() == 1) return E[0].second;
	if (s <= E[0].first) return E[0].second;
	for (size_t i = 1; i < E.size(); i++) {
		if (s <= E[i].first) {
			double s0 = E[i - 1].first, h0 = E[i - 1].second, s1 = E[i].first, h1 = E[i].second;
			return h0 + (h1 - h0) * (s - s0) / mx(1e-6, s1 - s0);
		}
	}
	return E.back().second;
}

Track *Track::from_layout(const Dictionary &lay, const Variant &dir) {
	Track *t = new Track();
	t->sign_ = is_str(dir, "左") ? -1.0 : 1.0;
	Array segs;
	if (truthy(lay.get("segs", Variant()))) segs = lay["segs"];
	else { Array g; g.push_back("S"); g.push_back(num_or(lay.get("lap", Variant()), 2000.0)); segs.push_back(g); }
	t->line = truthy(lay.get("line", Variant())) || truthy(lay.get("open", Variant()));
	double turn = 0.0;
	for (int i = 0; i < segs.size(); i++) { Array g = segs[i]; turn = turn + (is_str(g[0], "C") ? (double)g[3] : 0.0); }
	double kTurn = (!t->line && turn != 0.0) ? 360.0 / turn : 1.0;
	std::vector<Part> parts;
	for (int i = 0; i < segs.size(); i++) {
		Array g = segs[i];
		if (!is_str(g[0], "C")) parts.push_back({ (double)g[1], 0.0, 0.0, 0.0, 0 });
		else {
			double th = (double)g[3] * kTurn * M_PI_JS / 180.0;
			double c = num_or(g.size() > 4 ? g[4] : Variant(), 3.0);
			parts.push_back({ std::fabs(th) * ((double)g[1] + (double)g[2]) / 2.0, th, (double)g[2], (double)g[1], (int)c });
		}
	}
	double L_ = 0.0;
	for (auto &q : parts) L_ = L_ + q.len;
	int n_ = (int)std::ceil(L_ / STEP) + 1;
	double dl_ = L_ / (n_ - 1);
	t->X.resize(n_); t->Y.resize(n_); t->K.resize(n_); t->C.resize(n_);
	double x = 0.0, y = 0.0, th = M_PI_JS, u0 = 0.0;
	size_t pi_ = 0;
	for (int i = 0; i < n_; i++) {
		double s = i * dl_;
		while (pi_ < parts.size() - 1 && s > u0 + parts[pi_].len) { u0 += parts[pi_].len; pi_++; }
		const Part &q = parts[pi_];
		double k = k_at(q, mx(0.0, mn(q.len, s - u0)));
		t->X[i] = x; t->Y[i] = y; t->K[i] = k; t->C[i] = q.c;
		if (i < n_ - 1) { th += k * dl_ / 2.0; x += cos_(th) * dl_; y += sin_(th) * dl_; th += k * dl_ / 2.0; }
	}
	if (!t->line) {
		double ex = t->X[n_ - 1], ey = t->Y[n_ - 1];
		for (int i = 0; i < n_; i++) { t->X[i] -= ex * i / (n_ - 1); t->Y[i] -= ey * i / (n_ - 1); }
	}
	double inf = from_bits(0x7ff0000000000000ULL);
	double x0 = inf, x1 = -inf, y0 = inf, y1 = -inf;
	for (int i = 0; i < n_; i++) { x0 = mn(x0, t->X[i]); x1 = mx(x1, t->X[i]); y0 = mn(y0, t->Y[i]); y1 = mx(y1, t->Y[i]); }
	double cx = (x0 + x1) / 2.0, cy = (y0 + y1) / 2.0;
	for (int i = 0; i < n_; i++) { t->X[i] -= cx; t->Y[i] -= cy; }
	t->r = mx(1.0, (y1 - y0) / 2.0); t->a = mx(0.0, (x1 - x0) - 2.0 * t->r);
	// 高さ
	std::vector<std::pair<double, double>> E;
	Variant ev = lay.get("elev", Variant());
	if (truthy(ev) && ((Array)ev).size()) {
		Array ea = ev;
		for (int i = 0; i < ea.size(); i++) { Array p = ea[i]; E.push_back({ (double)p[0], (double)p[1] }); }
	} else E.push_back({ 0.0, 0.0 });
	std::stable_sort(E.begin(), E.end(), [](const std::pair<double, double> &p, const std::pair<double, double> &q) { return p.first < q.first; });
	std::vector<double> H(n_);
	for (int i = 0; i < n_; i++) H[i] = h_raw(E, i * dl_);
	t->Hs.resize(n_);
	int w = (int)round_js(8.0 / dl_);
	if (w < 1) w = 1;
	for (int i = 0; i < n_; i++) {
		double tt = 0.0; int c = 0;
		for (int j = -w; j <= w; j++) {
			int k = i + j;
			if (t->line) k = std::max(0, std::min(n_ - 1, k));
			else k = ((k % (n_ - 1)) + (n_ - 1)) % (n_ - 1);
			tt += H[k]; c += 1;
		}
		t->Hs[i] = tt / c;
	}
	t->L = L_; t->n = n_; t->dl = dl_;
	t->straight = mn(num_or(lay.get("straight", Variant()), L_), L_);
	Variant idv = lay.get("id", Variant());
	t->id = truthy(idv) ? (String)idv : String("");
	t->layout = lay;
	return t;
}

TrackPt Track::at(double s) const {
	if (ell) {
		s = std::fmod(std::fmod(s, L) + L, L);
		double u = s, x, y, curv = 0.0; int corner = 0;
		if (u <= seg1) { x = goalX - u; y = r; }
		else {
			u -= seg1;
			if (u <= M_PI_JS * r) { double ang = M_PI_JS / 2.0 + u / r; x = -a / 2.0 + cos_(ang) * r; y = sin_(ang) * r; curv = 1.0 / r; corner = 3; }
			else {
				u -= M_PI_JS * r;
				if (u <= a) { x = -a / 2.0 + u; y = -r; }
				else {
					u -= a;
					if (u <= M_PI_JS * r) { double ang = -M_PI_JS / 2.0 + u / r; x = a / 2.0 + cos_(ang) * r; y = sin_(ang) * r; curv = 1.0 / r; corner = 1; }
					else { u -= M_PI_JS * r; x = a / 2.0 - u; y = r; }
				}
			}
		}
		return { x * sign_, y, curv * sign_, corner };
	}
	int i; double f, over = 0.0;
	if (line) {
		double sc = mx(0.0, mn(L, s));
		i = std::min(n - 2, (int)std::floor(sc / dl)); f = u01(sc / dl - std::floor(sc / dl)); over = s - sc;
	} else {
		double s2 = std::fmod(std::fmod(s, L) + L, L);
		i = std::min(n - 2, (int)std::floor(s2 / dl)); f = s2 / dl - i;
	}
	double px = X[i] + (X[i + 1] - X[i]) * f;
	double py = Y[i] + (Y[i + 1] - Y[i]) * f;
	if (over != 0.0) {
		double hx = X[n - 1] - X[n - 2], hy = Y[n - 1] - Y[n - 2], l = num_or(hypot(hx, hy), 1.0);
		if (over > 0.0) { px += hx / l * over; py += hy / l * over; }
	}
	if (line && s < 0.0) {
		double hx = X[1] - X[0], hy = Y[1] - Y[0], l = num_or(hypot(hx, hy), 1.0);
		px = X[0] + hx / l * s; py = Y[0] + hy / l * s;
	}
	int j = f < 0.5 ? i : i + 1;
	return { px * sign_, py, K[j] * sign_, C[j] };
}

double Track::h_at(double s) const {
	if (ell) return 0.0;
	int i; double f;
	if (line) {
		double sc = maxf(0.0, minf(L, s));
		double q = sc / dl;
		i = std::min(n - 2, (int)std::floor(q)); f = q - std::floor(q);
		f = f < 0.0 ? 0.0 : (f > 1.0 ? 1.0 : f);
	} else {
		s = std::fmod(std::fmod(s, L) + L, L);
		i = std::min(n - 2, (int)std::floor(s / dl)); f = s / dl - i;
	}
	return Hs[i] + (Hs[i + 1] - Hs[i]) * f;
}

int Track::corner_at(double R) const { return at(mx(0.0, R)).corner; }

// レースの競馬場・芝ダート・距離から、使う回りを選ぶ（無ければ null）
static Variant layout_of(const Dictionary &race, const Dictionary &layouts) {
	Variant LY = layouts.get(race.get("course", Variant()), Variant());
	if (!truthy(LY)) return Variant();
	Dictionary ly = LY;
	Variant lv = is_str(race.get("surface", Variant()), "ダ") ? ly.get("dirt", Variant()) : ly.get("turf", Variant());
	if (!truthy(lv) || !((Array)lv).size()) return Variant();
	Array list = lv;
	Variant loop = race.get("loop", Variant());
	if (truthy(loop)) {
		for (int i = 0; i < list.size(); i++) { Dictionary l = list[i]; if (l.get("id", Variant()) == loop) return l; }
	}
	double dist = (double)race.get("dist", 0.0);
	for (int i = 0; i < list.size(); i++) {
		Dictionary l = list[i];
		Array use = l.get("use", Array());
		for (int k = 0; k < use.size(); k++) if (is_num(use[k]) && (double)use[k] == dist) return l;
	}
	for (int i = 0; i < list.size(); i++) { Dictionary l = list[i]; if (!truthy(l.get("line", Variant()))) return l; }
	return list[0];
}

struct CacheEnt { Variant lay; Variant dir; Track *track; };
static std::vector<CacheEnt> g_cache;
static std::mutex g_cache_mu;

void track_cache_clear() {
	std::lock_guard<std::mutex> lk(g_cache_mu);
	for (auto &e : g_cache) delete e.track;
	g_cache.clear(); g_cache.shrink_to_fit();
}

ForRace track_for_race(const Dictionary &race, const Dictionary &courses, const Dictionary &layouts) {
	Dictionary course = courses.get(race.get("course", Variant()), courses.get(U8("東京"), Dictionary()));
	Variant bv = is_str(race.get("surface", Variant()), "ダ") ? course.get("dirt", Variant()) : course.get("turf", Variant());
	if (bv.get_type() == Variant::NIL) bv = course.get("turf", Variant());
	if (bv.get_type() == Variant::NIL) bv = course.get("dirt", Variant());
	if (bv.get_type() == Variant::NIL) { Dictionary d; d["lap"] = 2000.0; d["straight"] = 400.0; d["slope"] = U8("平"); bv = d; }
	Dictionary base = bv;
	Variant lay = layout_of(race, layouts);
	Variant dir = course.get("dir", Variant());
	if (!truthy(lay)) {
		Track *t = Track::make(num_or(base.get("lap", Variant()), 0.0), num_or(base.get("straight", Variant()), 0.0), dir);
		return { base, t, dir, Variant(), true };
	}
	Track *track = nullptr;
	{
		std::lock_guard<std::mutex> lk(g_cache_mu);
		for (auto &e : g_cache) if (UtilityFunctions::is_same(e.lay, lay) && e.dir == dir) { track = e.track; break; }
		if (!track) { track = Track::from_layout(lay, dir); g_cache.push_back({ lay, dir, track }); }
	}
	Dictionary ld = lay;
	Dictionary geo = base.duplicate();
	geo["lap"] = round_js(track->L);
	Variant ls = ld.get("straight", Variant());
	geo["straight"] = truthy(ls) ? ls : base.get("straight", Variant());
	Variant lid = ld.get("id", Variant());
	geo["loop"] = truthy(lid) ? lid : Variant("");
	return { geo, track, dir, lay, false };
}

} // namespace hs
