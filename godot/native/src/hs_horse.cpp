// 馬の能力のうち、模擬に要る所（godot/core/hs_horse.gd の cur・has と hs_sim.gd の power・skill_adj）
#include "hs_sim.h"
#include "hs_math.h"
#include "hs_var.h"

using namespace godot;

namespace hs {

bool horse_has(const Dictionary &h, const char *id) {
	Variant sk = h.get("skills", Variant());
	if (sk.get_type() != Variant::ARRAY) return false;
	return ((Array)sk).has(U8(id));
}

static inline double smooth(double t) { t = clamp(t, 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }

static double growth_factor(const Dictionary &horse, double w_idx) {
	double age = (w_idx - ((double)horse["born"] * 48.0 + 12.0)) / 48.0;
	double p0 = 3.5, p1 = 5.0;
	Variant g = horse.get("growth", Variant());
	if (is_str(g, "早熟")) { p0 = 2.6; p1 = 3.6; }
	else if (is_str(g, "早め")) { p0 = 3.0; p1 = 4.2; }
	else if (is_str(g, "遅め")) { p0 = 4.0; p1 = 5.8; }
	else if (is_str(g, "晩成")) { p0 = 4.6; p1 = 6.8; }
	double shift = num_or(horse.get("peakShift", Variant()), 0.0);
	double ps = p0 + shift, pe = p1 + shift;
	if (age < ps) {
		double t = (age - 1.4) / (ps - 1.4);
		return 0.62 + 0.38 * smooth(t);
	}
	if (age <= pe) return 1.0;
	double d = age - pe;
	return mx(0.55, 1.0 - 0.04 * d - 0.02 * d * d);
}

static const char *STATS[7] = { "spd", "sta", "dspd", "dsta", "guts", "mind", "slope" };

Stats7 horse_cur(const Dictionary &horse, double w_idx) {
	double g = (truthy(horse.get("filler", Variant())) || truthy(horse.get("legend", Variant()))) ? 1.0 : growth_factor(horse, w_idx);
	Dictionary pot = horse["pot"];
	Variant bv = horse.get("bonus", Variant());
	bool hasB = bv.booleanize();
	Dictionary bonus = hasB ? (Dictionary)bv : Dictionary();
	double o[7];
	for (int k = 0; k < 7; k++) {
		String key = STATS[k];
		o[k] = (double)pot[key] * g + num_or(hasB ? bonus.get(key, Variant()) : Variant(), 0.0);
	}
	return { o[0], o[1], o[2], o[3], o[4], o[5], o[6] };
}

static int ground_lv(const Variant &g) {
	if (is_str(g, "稍重")) return 1;
	if (is_str(g, "重")) return 2;
	if (is_str(g, "不良")) return 3;
	return 0;
}

static const double PACE_HI = 1.006, PACE_LO = 0.994;

// 特殊能力のうち、レースの条件で強さが上下するもの（ids を渡すと、その能力だけで数える）
double skill_adj(const Dictionary &horse, const Dictionary &race, const Variant &w_idx, const Dictionary &ctx, const Array *ids) {
	Array sk;
	if (ids) sk = *ids;
	else {
		Variant v = horse.get("skills", Variant());
		if (!v.booleanize()) return 0.0;
		sk = v;
	}
	if (!sk.size()) return 0.0;
	const SimData &D = data();
	Dictionary course = D.courses.get(race.get("course", Variant()), Dictionary());
	Variant gv = is_str(race.get("surface", Variant()), "ダ") ? course.get("dirt", Variant()) : course.get("turf", Variant());
	if (gv.get_type() == Variant::NIL) gv = course.get("turf", Variant());
	if (gv.get_type() == Variant::NIL) gv = course.get("dirt", Variant());
	Dictionary geo = gv.get_type() == Variant::NIL ? Dictionary() : (Dictionary)gv;
	Variant lrw = horse.get("lastRaceW", Variant());
	bool hasGap = lrw.get_type() != Variant::NIL && w_idx.get_type() != Variant::NIL;
	double gap = hasGap ? (double)w_idx - (double)lrw : 0.0;
	Variant dir = course.get("dir", Variant());
	Variant month = race.get("month", Variant()), region = race.get("region", Variant());
	Variant gst = geo.get("straight", Variant());
	bool ctxOk = !ctx.is_empty();
	double a = 0.0;
	for (int q = 0; q < sk.size(); q++) {
		String id = sk[q];
		if (id == "big" && is_str(race.get("grade", Variant()), "G1")) a += 2.0;
		else if (id == "fresh" && hasGap && gap >= 10) a += 2.0;
		else if (id == "tataki" && hasGap) a += gap >= 10 ? -2.0 : 1.2;
		else if (id == "left" && is_str(dir, "左")) a += 1.8;
		else if (id == "right" && is_str(dir, "右")) a += 1.8;
		else if (id == "small" && gst.booleanize() && (double)gst < 330) a += 1.8;
		else if (id == "long" && gst.get_type() != Variant::NIL && (double)gst >= 450) a += 1.8;
		else if (id == "summer" && month.get_type() != Variant::NIL && (double)month >= 6 && (double)month <= 8) a += 1.8;
		else if (id == "winter" && month.get_type() != Variant::NIL && ((double)month == 12 || (double)month <= 2)) a += 1.8;
		else if (id == "inner" && ctxOk && ctx.get("num", Variant()).booleanize() && (double)ctx["num"] <= 4) a += 1.2;
		else if (id == "outer" && ctxOk && ctx.get("frame", Variant()).get_type() != Variant::NIL && (double)ctx["frame"] >= 7) a += 1.2;
		else if (id == "mud" && (is_str(race.get("ground", Variant()), "重") || is_str(race.get("ground", Variant()), "不良"))) a += 2.0;
		else if (id == "travel" && is_str(region, "海外")) a += 2.0;
		else if (id == "homebody" && is_str(region, "海外")) a -= 3.0;
		else if (id == "leftB" && is_str(dir, "左")) a -= 1.5;
		else if (id == "rightB" && is_str(dir, "右")) a -= 1.5;
		else if (id == "hipace" && ctxOk && ctx.get("paceF", Variant()).get_type() != Variant::NIL && (double)ctx["paceF"] > PACE_HI) a += 1.8;
		else if (id == "slowpace" && ctxOk && ctx.get("paceF", Variant()).booleanize() && (double)ctx["paceF"] < PACE_LO) a += 1.8;
	}
	return a;
}

// 疲労の段階と下げ（js/core/racesim.js の S.FATIGUE・S.fatiguePen と同じ）
static const double FAT_AT[4] = { 15.0, 35.0, 55.0, 75.0 };
static const double FAT_PEN[5] = { 0.0, 1.5, 4.0, 8.0, 13.0 };
static const double FAT_STRONG = 86.0, FAT_TOP = 104.3, FAT_KEEP = 0.2;
static double fatigue_pen(double fat, double a) {
	int st = 0;
	while (st < 4 && fat >= FAT_AT[st]) st++;
	double p = FAT_PEN[st];
	if (p == 0.0) return 0.0;
	return p * clamp(1.0 - (a - FAT_STRONG) / (FAT_TOP - FAT_STRONG) * (1.0 - FAT_KEEP), FAT_KEEP, 1.0);
}

Dictionary power(const Dictionary &horse, const Dictionary &race, const Variant &w_idx, const Dictionary &ctx) {
	Stats7 c0 = horse_cur(horse, (double)w_idx);
	bool dirt = is_str(race.get("surface", Variant()), "ダ");
	double spd = dirt ? c0.dspd : c0.spd, sta = dirt ? c0.dsta : c0.sta;
	double a = 0.0;
	if (dirt) { a += spd * 0.42; a += sta * 0.20; a += c0.guts * 0.15; a += c0.mind * 0.11; a += c0.slope * 0.12; }
	else { a += spd * 0.45; a += sta * 0.22; a += c0.guts * 0.16; a += c0.mind * 0.12; a += c0.slope * 0.05; }
	double D = race["dist"];
	double distPen = 0.0;
	double dmin = horse["distMin"], dmax = horse["distMax"];
	if (D < dmin) distPen = (dmin - D) / 100.0 * 1.4;
	if (D > dmax) distPen = (D - dmax) / 100.0 * 1.2;
	double surfPen = 0.0;
	int gl = ground_lv(race.get("ground", Variant()));
	Dictionary apt = horse["apt"];
	double groundAdj = gl * (num_or(apt.get("heavy", Variant()), 50.0) - 55.0) / 45.0 * 1.3;
	Variant lrw = horse.get("lastRaceW", Variant());
	double layoff = (lrw.get_type() != Variant::NIL && w_idx.get_type() != Variant::NIL && (double)w_idx - (double)lrw >= 12) ? 1.2 : 0.0;
	bool ctxOk = !ctx.is_empty();
	double trav = ctxOk ? num_or(ctx.get("travel", Variant()), 0.0) : 0.0; // このレースへの移動の疲れ（HSFatigue.travel）
	double condAdj = num_or(horse.get("cond", Variant()), 0.0) / 100.0 * 3.0 - fatigue_pen(num_or(horse.get("fatigue", Variant()), 0.0) + trav, a) - layoff;
	double jockAdj = 0.0;
	if (ctxOk && ctx.get("jockey", Variant()).booleanize()) jockAdj = ((double)((Dictionary)ctx["jockey"])["skill"] - 75.0) * 0.06;
	double wtAdj = 0.0;
	if (ctxOk && ctx.get("weight", Variant()).booleanize()) wtAdj = -((double)ctx["weight"] - 56.0) * 1.4;
	double skillAdj = skill_adj(horse, race, w_idx, ctx, nullptr);
	double total = a - distPen - surfPen + groundAdj + condAdj + jockAdj + wtAdj + skillAdj;
	Dictionary cur;
	cur["spd"] = spd; cur["sta"] = sta; cur["dspd"] = c0.dspd; cur["dsta"] = c0.dsta; cur["guts"] = c0.guts; cur["mind"] = c0.mind; cur["slope"] = c0.slope;
	Dictionary out;
	out["total"] = total; out["base"] = a; out["distPen"] = distPen; out["surfPen"] = surfPen; out["groundAdj"] = groundAdj;
	out["condAdj"] = condAdj; out["skillAdj"] = skillAdj; out["cur"] = cur;
	return out;
}

} // namespace hs
