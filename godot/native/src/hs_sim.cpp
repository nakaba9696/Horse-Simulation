// レースの模擬（godot/core/hs_sim.gd と同じ式の並び）。直すときは JS（js/core/racesim.js）・GDScript と一緒に直し、一致テストを回す
#include "hs_sim.h"
#include "hs_math.h"
#include "hs_var.h"
#include <algorithm>
#include <limits>

using namespace godot;

namespace hs {

static const double DT = 0.1;
static const int REC_EVERY = 2;
static const double LEN = 2.4;

// ---------- 調整の値（hs_sim.gd と同じ） ----------
static const double DS = 0.68, MISFIT = 10.0, MISFIT_FROM = 0.2, TENSE_COST = 1.0, KAKARI_COST = 1.6;
static const double T_BASE = 25.0, T_HOT = 0.5, T_KAKARI = 15.0, T_SETTLE = 0.08, T_CALM = 1.2, T_LANE = 8.0;
static const double START_ACC = 7.5, START_SKILL_ACC = 1.35, EASY_START = 0.95, LATE_E = 0.15, PUSH_BASE = 0.25;
static const double LANE_V = 3.0, LANE_DX = 2.0, LANE_GAP = 0.8, LANE_DRIFT = 10.0;
static const double EARLY_PUSH = 500.0, GEAR_GAP = 18.0, GEAR_COST = 0.05, POS_K = 0.004, POS_MAX = 0.03;
static const double W_K = 0.4, W_WIND = 0.6, W_COST = 0.96, W_WINDCOST = 0.98, W_EARLY = 0.2, W_EARLYCOST = 1.2;
static const double CALM_SAVE = 0.97, PACE_HI = 1.006, PACE_LO = 0.994, PACE_K = 25.0, DRAFT = 0.08, PACE_TOP = 50.0, PACE_EARLY = 60.0;
static const double PACE_NIGE[4] = { -0.009, -0.002, 0.003, 0.008 };
static const double PACE_SD = 0.006;
static const double STYLE_MULT[4] = { 1.03, 1.014, 0.995, 0.982 };
static const double STYLE_GAP[4] = { 0.0, 6.0, 13.0, 21.0 };
static const double STYLE_SPURT[4] = { 0.0, 60.0, 120.0, 170.0 };
static const double ZONE[4][2] = { { 0.0, 0.12 }, { 0.05, 0.4 }, { 0.3, 0.75 }, { 0.6, 1.0 } };
static const double HILL_V = 0.4, HILL_E = 100.0, HILL_DV = 0.25, HILL_DE = 10.0, HILL_MID = 0.4;
static const double NINO_SPD = 1.01, NINO_COST = 0.9, NINO_POS = 2.0;
static const double LONGSPURT_R = 50.0, LONGSPURT_Z = 0.002;
static const double JIYU_SLOW = 0.994, JIYU_HI = 1.006, JIYU_K = 0.5, JIYU_MISFIT = 0.35;
static const double SUNA = 1.08;
static const double K_S0 = 0.03, K_S1 = 0.0035, K_R = 60.0, K_A0 = 0.85, K_A1 = 0.05, K_C0 = 0.95, K_C1 = 0.0, K_CS = 0.035, K_Z = 0.0015, K_TOP = 2.2;
static const double O_RAMP = 2.5, O_CALMK = 5.0, O_OVER = 0.55, O_OVERHOT = 0.25, O_FIGHTAFTER = 1.2, O_FIGHTK = 14.0, O_SURGET = 6.0, O_MATCH = 0.35, O_MATCHLO = 0.12,
	O_KEEN = 40.0, O_PASSED = 9.0, O_WALL = 4.0, O_SAND = 3.0, O_COVER = 4.0, O_SHRINKT = 4.0, O_SHRINKSPD = 0.012, O_PUSHSURGE = 10.0, O_SURGEMAX = 45.0;
static const double F_FROM = 300.0, F_DX = 2.4, F_L0 = 0.45, F_L1 = 1.8, F_DV = 0.6, F_G0 = 72.0, F_UP = 10.0, F_LOW = -40.0, F_NARABU = 1.3, F_DECAY = 0.05, F_SPD = 0.012, F_COST = 0.12;
static const double OONIGE_EARLY = 1.02, OONIGE_MID = 1.02, OONIGE_KICK = 0.5, OONIGE_LEAD = 0.055;

// Godot の値は Godot が読み込みを終えてから作る（大域の初期化で作ると落ちる）
static SimData *g_data = nullptr;
void set_data(const SimData &d) { if (!g_data) g_data = new SimData(); *g_data = d; }
const SimData &data() { if (!g_data) g_data = new SimData(); return *g_data; }
void data_clear() { delete g_data; g_data = nullptr; }

static int SK(const char *s) { return skill_id(String(s)); }
static int style_of(const Variant &v) {
	if (is_str(v, "逃げ")) return ST_NIGE;
	if (is_str(v, "先行")) return ST_SENKO;
	if (is_str(v, "差し")) return ST_SASHI;
	if (is_str(v, "追込")) return ST_OIKOMI;
	return ST_NONE;
}

static double base_speed(double dist, const Variant &surface, const Variant &ground, const Variant &course_adj) {
	double v = 27.32 - 1.378 * log_(dist);
	v *= 1.0 + mx(0.0, 1600.0 - dist) / 1600.0 * 0.04;
	if (is_str(surface, "ダ")) v *= 0.955;
	int g = is_str(ground, "稍重") ? 1 : is_str(ground, "重") ? 2 : is_str(ground, "不良") ? 3 : 0;
	static const double TURF[4] = { 0.0, 0.006, 0.015, 0.03 }, DIRT[4] = { 0.0, 0.004, 0.007, 0.009 };
	if (is_str(surface, "芝")) v *= 1.0 - TURF[g];
	else v *= 1.0 + DIRT[g];
	v *= 1.0 + num_or(course_adj, 0.0);
	return dist / (dist / v + 2.4);
}
static inline double temperF(const Runner &s) { return 1.0 + mx(0.0, 70.0 - s.mind) / 25.0; }
static inline double respOf(const Ctl &c) {
	double t = c.hasSpurtTension ? c.spurtTension : c.tension;
	return clamp(1.1 - mx(0.0, t - 35.0) / 80.0, 0.6, 1.1);
}
static double bondF(const Variant &n) {
	if (n.get_type() == Variant::NIL) return 1.0;
	double v = n;
	if (v <= 0) return 1.15;
	if (v < 3) return 1.15 - v * 0.05;
	return mx(0.8, 1.0 - (v - 3.0) * 0.022);
}
static inline double cowardOf(const Runner &s, int sessenB) {
	return clamp((72.0 - s.guts) / 25.0, 0.0, 1.0) + (s.trigHas(sessenB) ? 0.3 : 0.0);
}
double whip_eff(const Ctl &c) { return mx(0.25, 1.0 - 0.07 * mx(0.0, c.whips - 1.0)); }
static String pace_verdict(double f) { return f > PACE_HI ? U8("ハイペース") : (f < PACE_LO ? U8("スローペース") : U8("平均ペース")); }

static void say(Sim &sim, double t, const String &text, const char *kind) {
	Dictionary e;
	e["t"] = t; e["text"] = text; e["kind"] = String(kind);
	sim.events.push_back(e);
}

void fire(Sim &sim, Runner &s, int id) {
	if (s.fired.has(id)) return;
	s.fired.add(id);
	if (id == SK_SPURT) return;
	Dictionary f;
	f["t"] = sim.t; f["i"] = s.i; f["id"] = skill_name(id);
	sim.skillFx.push_back(f);
	if (sim.optFrames && (s.me || s.ownerP || s.hist)) say(sim, sim.t, s.name + U8("の") + skill_label(id) + U8("！"), "skill");
}

// ---------- 作る ----------
double skill_adj(const Dictionary &horse, const Dictionary &race, const Variant &w_idx, const Dictionary &ctx, const Array *ids);

Sim *sim_create(const Dictionary &race, const Array &runners, const Variant &w_idx, uint32_t rng_state, const Dictionary &opts, double era_speed) {
	Sim *simp = new Sim();
	Sim &sim = *simp;
	sim.rng.s = rng_state;
	Rng &rng = sim.rng;
	ForRace cf = track_for_race(race, data().courses, data().layouts);
	Dictionary geo = cf.geo;
	double D = race["dist"];
	double v0 = base_speed(D, race.get("surface", Variant()), race.get("ground", Variant()), geo.get("speed", Variant())) * era_speed;
	double gstraight = geo["straight"];
	double straight = mn(gstraight, D * 0.6);
	int nNige = 0;
	for (int i = 0; i < runners.size(); i++) { Dictionary r = runners[i]; Dictionary h = r["horse"]; if (is_str(h.get("style", Variant()), "逃げ")) nNige++; }
	double paceF = 1.0 + PACE_NIGE[std::min(3, nNige)] + rng.normal(0.0, PACE_SD);
	const int deokure = SK("deokure"), kakariId = SK("kakari"), longspurt = SK("longspurt");
	sim.st.resize(runners.size());
	for (int i = 0; i < runners.size(); i++) {
		Dictionary r = runners[i];
		Dictionary h = r["horse"];
		Dictionary ctx; ctx["paceF"] = paceF; ctx.merge(r, true);
		Runner &s = sim.st[i];
		s.r = r; s.h = h; s.i = i;
		Variant skv = h.get("skills", Variant());
		if (skv.get_type() == Variant::ARRAY) { Array sa = skv; for (int k = 0; k < sa.size(); k++) s.skills.add(skill_id(sa[k])); }
		s.style = style_of(h.get("style", Variant()));
		Dictionary pw = power(h, race, w_idx, ctx);
		double form = rng.normal(0.0, 1.9);
		double A = (double)pw["total"] + form;
		double vc = v0 * (1.0 + 0.0012 * (A - 85.0));
		Dictionary cur = pw["cur"];
		double sta = cur["sta"], guts = cur["guts"], mind = cur["mind"], slopeP = cur["slope"];
		double Ds = mx(800.0, ((double)h["distMax"] + 300.0 + (sta - 75.0) * 12.0) * DS);
		double kire = clamp(num_or(h.get("kire", Variant()), 4.0), 1.0, 8.0);
		double kickS = K_S0 + K_S1 * (kire - 1.0) + 0.0006 * ((double)cur["spd"] - 80.0);
		double styleAdd = s.style >= 0 ? STYLE_SPURT[s.style] : 80.0;
		double spurtR = clamp(straight + 120.0 + styleAdd + (4.5 - kire) * K_R + (s.skills.has(longspurt) ? LONGSPURT_R : 0.0) + rng.normal(0.0, 60.0) * (1.3 - mind / 120.0), 300.0, mn(1300.0, D * 0.6));
		double delay = std::fabs(rng.normal(0.0, 0.12));
		double lateP = 0.02 + mx(0.0, 75.0 - mind) * 0.0008 + (s.skills.has(deokure) ? 0.14 : 0.0);
		bool late = rng.chance(lateP);
		if (late) delay += rng.float_(0.5, 1.4);
		bool kakari = rng.chance(mx(0.0, (72.0 - mind) / 100.0) * 0.3 + (s.skills.has(kakariId) ? 0.25 : 0.0));
		// 道中の位置取り（run_pos）
		double rpMult = s.style >= 0 ? STYLE_MULT[s.style] : 1.0, rpGap = s.style >= 0 ? STYLE_GAP[s.style] : 10.0; int rpJiyu = 0;
		if (s.skills.has(SK("jiyu")) && s.style >= 0) {
			int to = (paceF < JIYU_SLOW && s.style > 0) ? s.style - 1 : ((paceF > JIYU_HI && s.style < 3) ? s.style + 1 : s.style);
			if (to != s.style) {
				rpMult = rpMult + (STYLE_MULT[to] - rpMult) * JIYU_K; rpGap = rpGap + (STYLE_GAP[to] - rpGap) * JIYU_K; rpJiyu = to < s.style ? -1 : 1;
			}
		}
		s.A = A; s.vc = vc; s.Ds = Ds; s.kickS = kickS; s.spurtR = spurtR; s.guts = guts; s.mind = mind; s.slopeP = slopeP;
		s.E = late ? 1.0 - LATE_E : 1.0;
		s.delay = delay; s.late = late; s.kakariDay = kakari;
		s.acc = K_A0 + K_A1 * kire;
		s.zubu = (8.0 - kire) * K_Z + (s.skills.has(longspurt) ? LONGSPURT_Z : 0.0);
		s.spurtCost = K_C0 + K_C1 * (kire - 1.0) + K_CS * (kire - 4.5) * (330.0 - gstraight) / 200.0;
		s.oonige = s.skills.has(SK("oonige")) && s.style == ST_NIGE; s.nino = s.skills.has(SK("nino")); s.narabu = s.skills.has(SK("narabu")); s.sora = s.skills.has(SK("sora"));
		s.sunaB = s.skills.has(SK("sunaB")) && is_str(race.get("surface", Variant()), "ダ"); s.jiyu = s.skills.has(SK("jiyu"));
		s.gapAdj = s.nino ? -NINO_POS : 0.0;
		s.lane = ((double)r["num"] - 1.0) * 0.5;
		s.styleMult = rpMult; s.gap = rpGap; s.jiyuMove = rpJiyu;
		s.name = h.get("name", Variant());
		s.ownerP = is_str(h.get("owner", Variant()), "P");
		s.hist = truthy(h.get("hist", Variant()));
		Variant jk = r.get("jockey", Variant());
		s.jockSkill = jk.booleanize() ? (double)((Dictionary)jk)["skill"] : 70.0;
	}
	std::vector<double> vcs;
	for (auto &s : sim.st) vcs.push_back(s.vc);
	std::sort(vcs.begin(), vcs.end());
	double medVc = vcs[sim.st.size() / 2];
	sim.race = race; sim.runners = runners; sim.wIdx = w_idx; sim.opts = opts; sim.geo = geo; sim.D = D; sim.straight = straight;
	sim.optFrames = opts.get("frames", Variant()).booleanize(); sim.optRide = opts.get("ride", Variant()).booleanize();
	sim.slope = geo.get("slope", Variant());
	sim.slopeFlat = is_str(sim.slope, "平");
	sim.slopeV = is_str(sim.slope, "急") ? 0.008 : is_str(sim.slope, "中") ? 0.005 : is_str(sim.slope, "小") ? 0.003 : 0.0;
	sim.slopeE = is_str(sim.slope, "急") ? 2.2 : is_str(sim.slope, "中") ? 1.4 : is_str(sim.slope, "小") ? 0.8 : 0.0;
	sim.paceF = paceF; sim.pace = medVc * paceF;
	sim.track = cf.track; sim.ownTrack = cf.owned; sim.trackDir = cf.dir; sim.trackLayout = cf.layout;
	{
		Dictionary course = data().courses.get(race.get("course", Variant()), Dictionary());
		sim.dirLeft = is_str(course.get("dir", U8("右")), "左");
	}
	sim.checkAt = D >= 2400 ? 1200.0 : (D >= 1600 ? 1000.0 : 600.0);
	sim.top = K_TOP * clamp(1.0 + (paceF - 1.0) * PACE_TOP, 0.55, 1.6);
	skills_setup(sim);
	for (auto &s : sim.st) {
		s.passive.clear();
		Variant skv = s.h.get("skills", Variant());
		Array sa = truthy(skv) ? (Array)skv : Array();
		for (int k = 0; k < sa.size(); k++) {
			Dictionary ctx; ctx["paceF"] = paceF; ctx.merge(s.r, true);
			Array one; one.push_back(sa[k]);
			if (skill_adj(s.h, race, w_idx, ctx, &one) > 0) s.passive.push_back(skill_id(sa[k]));
		}
		if (s.late && s.skills.has(deokure)) { Dictionary f; f["t"] = 0.6; f["i"] = s.i; f["id"] = String("deokure"); sim.skillFx.push_back(f); }
	}
	int meIdx = -1;
	for (int i = 0; i < runners.size(); i++) { Dictionary r = runners[i]; if (is_str(r.get("rider", Variant()), "P")) { meIdx = i; break; } }
	if (meIdx >= 0) {
		sim.me = meIdx;
		Runner &s = sim.st[meIdx]; s.me = true;
		if (sim.optRide) {
			Ctl &c = sim.ctl;
			Variant bond = opts.get("bond", Variant());
			c.tension = clamp(30.0 + (75.0 - s.mind) * 0.4 * bondF(bond) + (s.kakariDay ? 15.0 : 0.0), 10.0, 70.0);
			c.lane = mn(3.0, s.lane); c.bond = bond; c.bondF = bondF(bond);
			c.passSeen.assign(sim.st.size(), std::numeric_limits<double>::quiet_NaN());
			sim.hasCtl = true;
			s.delay = 99.0; s.late = false;
		}
	}
	say(sim, 0.0, U8("スタートしました！"), "start");
	for (auto &s : sim.st) if (s.late) say(sim, 0.6, s.name + U8("、出遅れた！"), "trouble");
	return simp;
}

// ---------- プレイヤーの操作 ----------
static int rate_of(Ctl &c, double t) {
	std::vector<double> keep;
	for (double x : c.taps) if (t - x < 1) keep.push_back(x);
	keep.push_back(t); c.taps = keep;
	return (int)keep.size();
}
static inline double gear_step(int n) { return mn(0.25, 0.05 + 0.025 * std::min(n, 8)); }

Variant ctl_up(Sim &sim) {
	if (!sim.hasCtl || sim.over) return Variant();
	Ctl &c = sim.ctl;
	Runner &s = sim.st[sim.me];
	if (!c.started) {
		c.started = true;
		if (sim.t < 0.05) { s.delay = 0.05; c.startGood = 1; return String("good"); }
		s.delay = sim.t;
		if (sim.t > 0.5) { s.late = true; s.E -= LATE_E; say(sim, sim.t, s.name + U8("、出遅れた！"), "trouble"); return String("late"); }
		c.startGood = sim.t < 0.25 ? 1 : 0;
		return String(c.startGood ? "good" : "ok");
	}
	int n = rate_of(c, sim.t); double d = gear_step(n);
	double g0 = c.gear; c.gear = mn(1.0, c.gear + d);
	if (!s.spurting) {
		c.tension = clamp(c.tension + (c.gear - g0) * 12.0 * temperF(s), 0.0, 100.0);
		if (c.surge > 5) c.surge = mn(O_SURGEMAX, c.surge + (c.gear - g0) * O_PUSHSURGE);
	}
	c.pushes += 1; c.lastPush = sim.t;
	return String(n >= 5 ? "fast" : "ok");
}
Variant ctl_down(Sim &sim) {
	if (!sim.hasCtl || !sim.ctl.started || sim.over) return Variant();
	Ctl &c = sim.ctl;
	int n = rate_of(c, sim.t); double d = gear_step(n);
	double g0 = c.gear; c.gear = mx(-1.0, c.gear - d);
	c.tension = clamp(c.tension + (g0 - c.gear) * (n >= 5 ? 14.0 : 4.0) * temperF(sim.st[sim.me]), 0.0, 100.0);
	c.lastPull = sim.t;
	return String(n >= 5 ? "fast" : "ok");
}
Variant ctl_swap(Sim &sim) {
	if (!sim.hasCtl || sim.over) return Variant();
	Ctl &c = sim.ctl;
	c.handR = !c.handR; c.swapUntil = sim.t + 0.35;
	return String("swap");
}
Variant ctl_whip(Sim &sim, const Variant &side_) {
	if (!sim.hasCtl || !sim.ctl.started || sim.over) return Variant();
	Ctl &c = sim.ctl;
	Runner &s = sim.st[sim.me];
	bool sideR = side_.booleanize() ? is_str(side_, "R") : c.handR;
	bool known = !side_.booleanize() || is_str(side_, "R") || is_str(side_, "L");
	if (sim.t < c.swapUntil) return String("swap");
	if (!known || sideR != c.handR) return ctl_swap(sim);
	c.whips += 1; c.whipUntil = sim.t + 1.2;
	std::vector<double> keep;
	for (double x : c.whipT) if (sim.t - x < 1.5) keep.push_back(x);
	keep.push_back(sim.t); c.whipT = keep;
	c.windmill = c.whipT.size() >= 3;
	double R = sim.D - s.x;
	if (R > sim.straight + 200) c.tension = clamp(c.tension + 12.0, 0.0, 100.0);
	// ムチでは進路は変わらない（どちらの手で打ってもよれない）。away は打った手と反対の側（見た目の向きだけ）
	double away = (sim.dirLeft == sideR) ? -1.0 : 1.0;
	c.hasLastWhip = true; c.lwT = sim.t; c.lwR = sideR; c.lwAway = away; c.lwYore = false;
	if (c.whips > 12) return String("tired");
	return String(c.windmill ? "windmill" : "ok");
}
Variant ctl_lane(Sim &sim, double d) {
	if (!sim.hasCtl) return Variant();
	Ctl &c = sim.ctl;
	double l0 = c.lane; c.lane = clamp(round_js(c.lane + d), 0.0, 12.0); c.laneT = sim.t;
	Runner &s = sim.st[sim.me];
	if (c.started && c.lane != l0 && !s.spurting && s.x > sim.D * 0.05) c.tension = clamp(c.tension + T_LANE * (temperF(s) - 1.0 + 0.15), 0.0, 100.0);
	return Variant();
}
void ctl_hold(Sim &sim, bool on) {
	if (on && sim.hasCtl && sim.ctl.started && sim.ctl.gear > -1 && sim.t - sim.ctl.lastPull > 0.4) ctl_down(sim);
}

// ---------- 折り合い ----------
static void oriai_step(Sim &sim, Runner &s, Ctl &c, double g, double prog, Runner *ahead1) {
	static const int sessenB = SK("sessenB"), kongomi = SK("kongomi"), kakariId = SK("kakari");
	auto &st = sim.st;
	double bf = c.bondF;
	double tf = 1.0 + (temperF(s) - 1.0) * bf;
	double cw = cowardOf(s, sessenB);
	int zi = s.style >= 0 ? s.style : ST_SENKO;
	double off = (prog > MISFIT_FROM && s.hasRk) ? mx(0.0, mx(ZONE[zi][0] - s.rk, s.rk - ZONE[zi][1])) : 0.0;
	c.misfit = off > 0.05;
	if (prog > 0.08 && sim.step % 5 == 0) {
		double hot = tf - 1.0 + 0.15; bool front = s.style == ST_NIGE || s.style == ST_SENKO; double t = sim.t;
		const char *ev = nullptr;
		for (auto &o : st) {
			if (&o == &s || o.done || (!std::isnan(c.passSeen[o.i]) && t - c.passSeen[o.i] < 10)) continue;
			if (o.x > s.x - 1 && o.x - s.x < 3 && std::fabs(o.lane - s.lane) < 2 && o.v > s.v + 0.35) {
				c.passSeen[o.i] = t; c.surge += O_PASSED * hot * (front ? 1.3 : 1.0) * mx(0.0, 1.0 - cw * 0.6); ev = "passed"; break;
			}
		}
		auto due = [&](double &slot, bool &set, double sec) { if (t - (set ? slot : -99.0) < sec) return false; slot = t; set = true; return true; };
		if (c.blockedNow && due(c.evWall, c.evWallSet, 3.0)) {
			if (cw > 0.5) c.shrink = mn(1.0, c.shrink + 0.3 * cw);
			else c.surge += O_WALL * hot;
			if (!ev) ev = "wall";
		}
		if (is_str(sim.race.get("surface", Variant()), "ダ") && ahead1 && due(c.evSand, c.evSandSet, 2.0)) {
			c.surge += O_SAND * (s.sunaB ? 2.5 : mx(0.0, tf - 1.0) * 0.6 + cw * 0.4); if (!ev) ev = "sand";
		}
		auto side = [&](double d) {
			for (auto &o : st) if (&o != &s && !o.done && std::fabs(o.x - s.x) < 2 && d * (o.lane - s.lane) > 0.5 && d * (o.lane - s.lane) < 1.6) return true;
			return false;
		};
		if (side(1.0) && (s.lane < 0.6 || side(-1.0)) && due(c.evCover, c.evCoverSet, 3.0)) {
			if (cw > 0.4) c.shrink = mn(1.0, c.shrink + 0.2 * cw);
			c.surge += O_COVER * (s.trigHas(kongomi) ? 1.5 : mx(0.0, tf - 1.0));
			if (!ev) ev = "cover";
		}
		if (ev) { c.hasLastEv = true; c.lastEvT = t; c.lastEv = String(ev); }
		c.surge = mn(O_SURGEMAX, c.surge);
	}
	double p = mx(0.0, -g);
	c.pullT = p > 0.05 ? c.pullT + DT : mx(0.0, c.pullT - 2.0 * DT);
	double over = mx(0.2, O_OVER - (tf - 1.0) * O_OVERHOT);
	double rein = 0.0; bool gentle = false;
	bool hasKakari = s.skills.has(kakariId);
	if (p > 0.05 && hasKakari) rein = 1.5;
	else if (p > over && c.pullT > O_FIGHTAFTER && c.tension > O_KEEN) rein = (p - over) * O_FIGHTK * tf * mn(1.0, (c.tension - O_KEEN) / 25.0);
	else if (p > 0.05) { rein = -O_CALMK * mn(p, over) * mn(1.0, c.pullT / O_RAMP); gentle = p >= O_MATCHLO; }
	c.reinFight = rein > 0 && !hasKakari;
	c.surge *= exp_(-DT / (O_SURGET * (gentle ? O_MATCH : 1.0) * (g > 0.05 ? 1.6 : 1.0)));
	c.shrink *= exp_(-DT / O_SHRINKT);
	double rest = T_BASE + mx(0.0, 70.0 - s.mind) * T_HOT * bf + (s.kakariDay ? T_KAKARI : 0.0) + c.surge;
	double ner = (rest - c.tension) * T_SETTLE + off * MISFIT * tf * tf * (s.jiyu ? JIYU_MISFIT : 1.0) * (prog < 0.65 ? 1.0 : 0.5);
	int sides = 0;
	for (auto &o : st) if (&o != &s && !o.done && o.x - s.x > -1.5 && o.x - s.x < 3 && std::fabs(o.lane - s.lane) < 1.6) sides++;
	double boxed = prog < 0.08 ? 0.0 : ((sides >= 2 && (s.style == ST_NIGE || s.style == ST_OIKOMI)) ? 1.5 : (sides ? 0.4 : 0.0));
	double calm = ((ahead1 && s.style != ST_NIGE) ? T_CALM : 0.0) / std::sqrt(tf);
	c.tension = clamp(c.tension + (ner + boxed * tf + rein - calm) * DT, 0.0, 100.0);
}

// 掛かり（頭の上げ具合 0〜1）と耳の向き。3D の馬の首と耳に使う（模擬の結果には効かない）
static void mood_out(Sim &sim, Runner &s, const Ctl *c) {
	double head = 0.0, ears = 0.4;
	if (c) {
		head = mx(clamp((c->tension - 50.0) / 35.0, 0.0, 1.0), c->reinFight ? 1.0 : 0.0);
		if (c->kakariNow) ears = -0.3;
		else if (c->tension < 35) ears = 0.6;
		if (c->shrink > 0.2) ears = mn(ears, -c->shrink);
	} else if (s.kakariDay && s.x < sim.D * 0.5) { head = 0.7; ears = -0.3; }
	if (s.spurting) { head *= 0.3; ears = mn(ears, 0.2); }
	if (s.fight > 30 && s.duel >= 0) ears = mn(ears, -0.7 * mn(1.0, s.fight / 80.0));
	if (s.done) { head = 0.0; ears = 0.5; }
	s.kakari = round_js(head * 100.0) / 100.0; s.ears = round_js(ears * 100.0) / 100.0;
}

// 競り合いの気合
static void fight_step(Sim &sim, Runner &s, double R, double prog) {
	int duel = -1;
	if (prog > 0.3 && (R < sim.straight + F_FROM || s.spurting)) {
		double sx = s.x, sl = s.lane, sv = s.v;
		for (auto &o : sim.st) {
			if (&o == &s || o.done) continue;
			double ddx = o.x - sx;
			if (ddx >= F_DX || ddx <= -F_DX) continue;
			double dl = std::fabs(o.lane - sl);
			if (dl > F_L0 && dl < F_L1 && std::fabs(o.v - sv) < F_DV) { duel = o.i; break; }
		}
	}
	s.duel = duel;
	if (duel >= 0) {
		s.fight = clamp(s.fight + (s.guts - F_G0) / (100.0 - F_G0) * F_UP * (s.narabu ? F_NARABU : 1.0) * DT, F_LOW, 100.0);
		if (s.fight > s.fightPeak) s.fightPeak = s.fight;
	} else if (s.fight != 0.0) {
		s.fight *= 1.0 - F_DECAY * DT;
	}
}

// 前にいる順の並び（前の刻みの並びを、挿し込みで並べ直す）
static std::vector<int> &by_x(Sim &sim) {
	if (sim.byX.empty()) { sim.byX.resize(sim.st.size()); for (size_t i = 0; i < sim.st.size(); i++) sim.byX[i] = (int)i; }
	auto &a = sim.byX;
	for (int i = 1; i < (int)a.size(); i++) {
		int v = a[i]; int j = i - 1;
		while (j >= 0 && sim.st[a[j]].x < sim.st[v].x) { a[j + 1] = a[j]; j--; }
		a[j + 1] = v;
	}
	return a;
}
static Runner *ahead_of(Sim &sim, Runner &s, double dmax, double lmax) {
	for (auto &o : sim.st) if (&o != &s && !o.done && o.x > s.x && o.x - s.x < dmax && std::fabs(o.lane - s.lane) < lmax) return &o;
	return nullptr;
}
static bool near_x(Sim &sim, Runner &s, double dmax) {
	for (auto &o : sim.st) if (&o != &s && !o.done && std::fabs(o.x - s.x) < dmax) return true;
	return false;
}

static void commentary(Sim &sim);

// 0.1 秒進める。終わったら true
bool sim_step(Sim &sim) {
	if (sim.over) return true;
	static const int kakariId = SK("kakari"), longspurt = SK("longspurt"), narabuId = SK("narabu"), soraId = SK("sora"), oonigeId = SK("oonige"),
		sunaBId = SK("sunaB"), ninoId = SK("nino"), jiyuId = SK("jiyu"), oosoto = SK("oosoto");
	double D = sim.D, straight = sim.straight, pace = sim.pace;
	auto &st = sim.st;
	Rng &rng = sim.rng;
	sim.t += DT; sim.step += 1;
	double t = sim.t;
	std::vector<int> order;
	order.reserve(st.size());
	for (int i : by_x(sim)) if (!st[i].done) order.push_back(i);
	for (size_t k = 0; k < order.size(); k++) { st[order[k]].hasRk = true; st[order[k]].rk = order.size() > 1 ? (double)k / (order.size() - 1) : 0.5; }
	Runner *pack = nullptr;
	for (int o : order) if (!st[o].oonige) { pack = &st[o]; break; }
	if (!pack && !order.empty()) pack = &st[order[0]];
	double leaderX = pack ? pack->x : D;
	Ctl *c = sim.hasCtl ? &sim.ctl : nullptr;
	const Track *tr = sim.track;
	for (auto &s : st) {
		if (s.done) { s.v = maxf(6.0, s.v - 0.9 * DT); s.x += s.v * DT; s.kakari = 0.0; s.ears = 0.5; continue; }
		if (s.me && c && !c->started && t >= 0.9) { c->started = true; s.delay = 0.9; s.late = true; s.E -= LATE_E; say(sim, t, s.name + U8("、出遅れた！"), "trouble"); }
		if (t < s.delay) continue;
		double R = D - s.x;
		double prog = s.x / D;
		double target = 0.0;
		double costMul = 1.0;
		bool kakariNow = false;
		if (s.me && c) {
			double g = c->gear;
			if (!s.spurting && (R <= s.spurtR || (g > 0.35 && R < straight + 500))) {
				s.spurting = true; fire(sim, s, SK_SPURT);
				if (s.skills.has(longspurt)) fire(sim, s, longspurt);
			}
			if (s.spurting && g < -0.05 && R > 200) { s.spurting = false; c->hasSpurtTension = false; }
			Runner *ahead1 = ahead_of(sim, s, 5.0, 0.8);
			c->behind = ahead1 != nullptr;
			if (!s.spurting) oriai_step(sim, s, *c, g, prog, ahead1);
			else c->tension = mx(0.0, c->tension - 3.0 * DT);
			if (s.spurting && !c->hasSpurtTension) { c->hasSpurtTension = true; c->spurtTension = c->tension; }
			kakariNow = c->tension > 75 && !s.spurting;
			if (kakariNow && !c->kakariNow && s.skills.has(kakariId)) fire(sim, s, kakariId);
			c->kakariNow = kakariNow;
			if (kakariNow) c->everKakari = true;
			if (s.E <= 0) target = s.vc * (0.9 + 0.0005 * s.guts + s.zubu);
			else {
				if (s.spurting) {
					double ratioE = cbrt(mx(0.0, s.E) * s.Ds / (0.9 * mx(R, 30.0) * s.spurtCost));
					target = s.vc * clamp(ratioE, 1.0 + s.kickS, 1.0 + s.kickS * (1.0 + (sim.top + s.topAdd - 1.0) * clamp(g, PUSH_BASE, 1.0)));
				} else if (prog < 0.22) {
					target = pace * s.styleMult * (s.nino ? NINO_SPD : 1.0);
					if (s.nino) costMul *= NINO_COST;
					if (s.easyStart) costMul *= EASY_START;
					if (g > 0) { target *= 1.0 + g * 0.03; costMul *= 1.0 + 0.6 * g; }
					else if (g < 0) target *= 1.0 + g * (prog < 0.15 ? 0.03 : 0.012);
				} else {
					double gapT = mx(0.0, s.gap + s.gapAdj - g * GEAR_GAP);
					target = pace * (1.0 + clamp((leaderX - s.x - gapT) * POS_K, -POS_MAX, POS_MAX));
					if (g > 0) costMul *= 1.0 + GEAR_COST * g;
				}
				if (g < 0) costMul *= 1.0 + 0.1 * g;
				if (t < c->whipUntil) {
					bool inZone = R < straight + 200;
					double k = c->windmill ? W_WIND : W_K;
					double resp = respOf(*c);
					target *= 1.0 + (inZone ? k * resp : W_EARLY) * s.kickS * whip_eff(*c);
					costMul *= inZone ? ((c->windmill ? W_WINDCOST : W_COST) * (1.0 + (1.0 - resp) * 0.15)) : W_EARLYCOST;
				}
				if (kakariNow) { target *= 1.012; costMul *= KAKARI_COST; }
				else if (c->tension < 35 && !s.spurting) costMul *= CALM_SAVE;
				else if (c->tension > 50 && !s.spurting) costMul *= 1.0 + (c->tension - 50.0) / 100.0 * TENSE_COST;
				if (s.narabu && R < 250 && (g > 0.3 || s.spurting) && near_x(sim, s, 1.5)) { target *= 1.004; fire(sim, s, narabuId); }
			}
			if (c->lane > 0 && t - c->laneT > LANE_DRIFT && t - c->driftT > 1.2) {
				bool blockedIn = false;
				for (auto &o : st) if (&o != &s && !o.done && std::fabs(o.x - s.x) < 3.2 && o.lane < s.lane - 0.2 && o.lane > c->lane - 1.9) { blockedIn = true; break; }
				if (!blockedIn) { c->lane -= 1.0; c->driftT = t; }
			}
			Runner *ahead = ahead_of(sim, s, 2.6, 0.85);
			c->blockedNow = ahead != nullptr;
			if (ahead) target = mn(target, ahead->v - 0.05);
			if (c->shrink > 0.05 && !s.spurting) target *= 1.0 - O_SHRINKSPD * c->shrink;
		} else {
			if (!s.spurting && R <= s.spurtR) {
				s.spurting = true;
				double need = R / s.Ds * 0.9 * pow_(1.0 + s.kickS, 3.0);
				if (need > s.E * 1.15 && R > 260) s.spurting = false;
				else if (s.skills.has(longspurt)) fire(sim, s, longspurt);
			}
			if (s.E <= 0) target = s.vc * (0.9 + 0.0005 * s.guts + s.zubu);
			else if (s.spurting) {
				double ratioE = cbrt(maxf(0.0, s.E) * s.Ds / (0.9 * maxf(R, 30.0) * s.spurtCost));
				target = s.vc * maxf(1.0 + s.kickS, minf(1.0 + s.kickS * (sim.top + s.topAdd), ratioE));
				if (s.oonige) target = s.vc * (1.0 + s.kickS * OONIGE_KICK);
				if (s.narabu && R < 350 && near_x(sim, s, 1.5)) { target *= 1.004; fire(sim, s, narabuId); }
				if (s.sora && R < 200 && order[0] == s.i && order.size() > 1 && s.x - st[order[1]].x > 2) { target *= 0.985; fire(sim, s, soraId); }
			} else if (prog < 0.22) {
				target = pace * s.styleMult * (s.nino ? NINO_SPD : 1.0) * (s.oonige ? OONIGE_EARLY : 1.0);
				if (s.nino) costMul *= NINO_COST;
				if (s.easyStart) costMul *= EASY_START;
			} else if (s.oonige) {
				target = pace * (s.x - leaderX < OONIGE_LEAD * straight * 2000.0 / D ? OONIGE_MID : 1.0);
				if (s.x - leaderX > 10) fire(sim, s, oonigeId);
			} else {
				double g0 = maxf(0.0, s.gap + s.gapAdj);
				double err = pack == &s ? 0.0 : leaderX - s.x - g0;
				target = pace * (1.0 + maxf(-0.02, minf(0.02, err * 0.0012)));
				if (s.kakariDay && prog < 0.5) {
					target *= 1.012;
					if (prog > 0.1 && s.skills.has(kakariId)) fire(sim, s, kakariId);
				}
			}
			if (s.kakariDay && prog < 0.5) costMul *= 1.3;
		}
		if (s.spurting && R > straight && sim.paceF > 1) costMul *= 1.0 + (sim.paceF - 1.0) * PACE_EARLY;
		if (!s.spurting && prog > 0.08 && !s.oonige) {
			double rk = s.hasRk ? s.rk : 0.5;
			costMul *= maxf(0.5, 1.0 + (sim.paceF - 1.0) * PACE_K * (1.0 - 2.0 * rk)) * (1.0 - DRAFT * rk);
		}
		if (s.sunaB && !s.spurting && prog > 0.05 && ahead_of(sim, s, 4.0, 0.8) != nullptr) {
			costMul *= SUNA; s.sunaT = s.sunaT + DT;
			if (s.sunaT > 3) fire(sim, s, sunaBId);
		}
		fight_step(sim, s, R, prog);
		double fk = s.fight / 100.0;
		if (fk != 0.0 && (s.spurting || s.E <= 0)) {
			target *= 1.0 + F_SPD * fk;
			if (fk > 0) costMul *= 1.0 - F_COST * fk;
		}
		if (s.boost.on && t < s.boost.until) {
			target *= s.boost.mul;
			if (s.boost.free_) costMul /= s.boost.mul * s.boost.mul * s.boost.mul;
		}
		double grade = (tr && !tr->flat) ? tr->g_at(R) : 0.0;
		bool onHill = (!tr || tr->flat) && R < 320 && R > 60 && !sim.slopeFlat;
		if (onHill) target *= 1.0 - sim.slopeV * (1.0 - s.slopeP / 120.0);
		double hillW = s.spurting ? 1.0 : HILL_MID;
		if (grade > 0) target *= 1.0 - grade * HILL_V * hillW * (1.0 - s.slopeP / 120.0);
		else if (grade < 0) target *= 1.0 - grade * HILL_DV;
		if (!(s.me && c) && s.spurting && !s.blockedOnce && st.size() >= 10 && (s.style == ST_SASHI || s.style == ST_OIKOMI)) {
			s.blockedOnce = true;
			double jk = s.jockSkill;
			if (rng.chance(0.1 * (1.0 - s.mind / 160.0) * (1.2 - jk / 150.0))) {
				s.blocked = rng.float_(1.0, 2.4); say(sim, t, s.name + U8("、前が壁になった！"), "trouble");
			}
		}
		if (s.blocked > 0) { target *= 0.93; s.blocked -= DT; }
		double accel = s.v < s.vc * 0.9 ? START_ACC * ((s.boost.on && s.boost.free_ && t < s.boost.until) ? START_SKILL_ACC : 1.0) : s.acc + s.slopeP * 0.0015;
		double dv = maxf(-1.4 * DT, minf(accel * DT, target - s.v));
		double vPrev = s.v;
		s.v = mx(0.0, s.v + dv);
		double ratio = s.v / s.vc;
		double cost = (s.v * DT) / s.Ds * 0.9 * ratio * ratio * ratio * costMul;
		if (s.spurting) cost *= s.spurtCost;
		if (onHill) cost *= 1.0 + sim.slopeE * maxf(0.0, minf(0.6, 1.0 - s.slopeP / 100.0));
		if (grade > 0) cost *= 1.0 + grade * HILL_E * hillW * maxf(0.0, minf(0.6, 1.0 - s.slopeP / 100.0));
		else if (grade < 0) cost *= maxf(0.7, 1.0 + grade * HILL_DE);
		if (s.me && c && c->gear > 0.05 && R > straight + EARLY_PUSH) cost *= 1.0 + 8.0 * mx(0.0, ratio - 1.0);
		s.E -= cost;
		double xPrev = s.x;
		double dx = (vPrev + s.v) / 2.0 * DT;
		if (s.me && c && tr) {
			bool corner = tr->corner_at(R) != 0;
			c->wide = corner && s.lane > 1.5;
			if (corner) dx *= 1.0 - 0.005 * mx(0.0, s.lane - 0.5);
		}
		s.x += dx;
		mood_out(sim, s, s.me ? c : nullptr);
		if (!s.hasT600 && s.x >= D - 600) { s.hasT600 = true; s.t600 = t - DT + (D - 600.0 - xPrev) / maxf(0.1, s.x - xPrev) * DT; }
		if (s.x >= D) {
			s.hasFinishT = true; s.finishT = t - DT + (D - xPrev) / maxf(0.1, s.x - xPrev) * DT;
			s.done = true; sim.finished += 1;
			if (!sim.hasWinnerT) { sim.hasWinnerT = true; sim.winnerT = s.finishT; }
		}
	}
	if (sim.step % 2 == 1) skills_step(sim, order, DT * 2.0);
	for (auto &s : st) {
		if (s.done) continue;
		if (!s.passiveShown && D - s.x <= straight) {
			s.passiveShown = true;
			for (int id : s.passive) fire(sim, s, id);
		}
		if (s.nino && t > 1.5 && t < 2) fire(sim, s, ninoId);
		if (s.jiyuMove && t > 8 && t < 8.5) fire(sim, s, jiyuId);
	}
	if (!sim.hasCheck && !order.empty() && st[order[0]].x >= sim.checkAt) {
		String verdict = pace_verdict(sim.paceF);
		sim.hasCheck = true; sim.checkT = t; sim.checkVerdict = verdict;
		if (sim.optFrames) say(sim, t, String(num_str(sim.checkAt).c_str()) + U8("m通過は") + String(to_fixed(t, 1).c_str()) + U8("秒。") + verdict + U8("です。"), "pace");
	}
	// 進路：前から順に、近くの馬と重ならない一番内の位置
	auto &live = by_x(sim);
	Runner *me = c ? &st[sim.me] : nullptr;
	if (me) {
		double want = clamp(c->lane - me->lane, -LANE_V * DT, LANE_V * DT);
		if (std::fabs(want) > 1e-6) {
			double nl = me->lane + want, dir = want > 0 ? 1.0 : (want < 0 ? -1.0 : 0.0);
			bool hit = false;
			for (auto &o : st) if (&o != me && !o.done && std::fabs(o.x - me->x) < LANE_DX && dir * (o.lane - me->lane) > 0 && std::fabs(o.lane - nl) < LANE_GAP) { hit = true; break; }
			if (hit) {
				if (t - (c->hasBumpT ? c->bumpT : -9.0) > 0.4) { c->hasBumpT = true; c->bumpT = t; c->bumpSide = dir; }
				c->lane = clamp(round_js(me->lane - dir * 0.49), 0.0, 12.0);
			} else me->lane = nl;
		}
		me->laneT = c->lane;
	}
	if (sim.step % 2 == 0) {
		double near[64]; int nn;
		for (size_t k = 0; k < live.size(); k++) {
			Runner &s = st[live[k]];
			if (&s == me) continue;
			double want = 0.0;
			bool inStraight = D - s.x < straight;
			if (inStraight && (s.style == ST_SASHI || s.style == ST_OIKOMI)) want = s.trigHas(oosoto) ? 6.0 : 2.0 + (s.i % 4);
			want += s.driftLane;
			nn = 0;
			for (int q = (int)k - 1; q >= 0 && st[live[q]].x - s.x < 2.6; q--) {
				Runner &o = st[live[q]];
				if (nn < 64) near[nn++] = (&o == me) ? me->lane : o.laneT;
			}
			if (me && me->x < s.x && s.x - me->x < 2.6 && nn < 64) near[nn++] = me->lane;
			double lane = want;
			for (int n = 0; n < 20; n++) {
				bool hit = false;
				for (int q = 0; q < nn; q++) if (std::fabs(near[q] - lane) < 0.9) { hit = true; break; }
				if (!hit) break;
				lane += 1.0;
			}
			s.laneT = lane;
			s.lane += (s.laneT - s.lane) * 0.16;
		}
	}
	if (sim.optFrames && sim.step % 5 == 0) commentary(sim);
	if (sim.optFrames && sim.step % REC_EVERY == 0) {
		Array p;
		for (auto &s : st) { Array q; q.push_back(round_js(s.x * 10.0) / 10.0); q.push_back(round_js(s.lane * 100.0) / 100.0); q.push_back(round_js(s.v * 100.0) / 100.0); p.push_back(q); }
		Dictionary f; f["t"] = t; f["p"] = p;
		sim.frames.push_back(f);
	}
	if (sim.finished >= (int)st.size() || t >= 400 || (sim.hasWinnerT && t > sim.winnerT + 25)) sim.over = true;
	if (c && st[sim.me].done && t > st[sim.me].finishT + 4) sim.over = true;
	return sim.over;
}

static std::vector<int> stable_order(Sim &sim, bool byV, const std::vector<int> &src) {
	std::vector<int> a = src;
	if (byV) std::stable_sort(a.begin(), a.end(), [&](int p, int q) { return sim.st[p].v > sim.st[q].v; });
	else std::stable_sort(a.begin(), a.end(), [&](int p, int q) { return sim.st[p].x > sim.st[q].x; });
	return a;
}

static void commentary(Sim &sim) {
	auto &st = sim.st;
	double D = sim.D, straight = sim.straight, t = sim.t;
	auto &k = sim.talk;
	std::vector<int> all(st.size());
	for (size_t i = 0; i < st.size(); i++) all[i] = (int)i;
	std::vector<int> ord = stable_order(sim, false, all);
	Runner &lead = st[ord[0]];
	if (t > 6 && t < 14 && k.lastLeader < 0) { k.lastLeader = lead.i; say(sim, t, U8("ハナを切ったのは") + lead.name + U8("。"), "lead"); }
	double R = D - lead.x;
	if (!k.mid && lead.x > D * 0.5 && D >= 1600) {
		k.mid = true;
		String names;
		for (size_t i = 0; i < ord.size() && i < 3; i++) { if (i) names += U8("、"); names += st[ord[i]].name; }
		say(sim, t, U8("中間点、前は") + names + U8("。"), "mid");
		int pl = -1;
		for (size_t i = 0; i < ord.size(); i++) if (st[ord[i]].ownerP || st[ord[i]].me) { pl = (int)i; break; }
		if (pl >= 0) say(sim, t + 1.5, st[ord[pl]].name + U8("は") + String::num_int64(pl + 1) + U8("番手あたり。"), "mine");
	}
	if (!k.corner && R <= straight + 350) { k.corner = true; say(sim, t, U8("3コーナーから4コーナーへ。各馬が動き出す！"), "corner"); }
	if (!k.straight && R <= straight) { k.straight = true; say(sim, t, U8("最後の直線！ 先頭は") + lead.name + U8("！"), "straight"); }
	if (k.lastLeader >= 0 && lead.i != k.lastLeader && R < straight && R > 30) say(sim, t, lead.name + U8("が先頭に立つ！"), "lead");
	if (!k.f400 && R <= 400 && R > 0) {
		k.f400 = true;
		Runner *second = ord.size() > 1 ? &st[ord[1]] : nullptr;
		if (second && lead.x - second->x > 6) say(sim, t, lead.name + U8("、リードは") + String(num_str(round_js((lead.x - second->x) / LEN)).c_str()) + U8("馬身！"), "mid");
		else if (second) say(sim, t, lead.name + U8("と") + second->name + U8("の叩き合い！"), "duel");
	}
	if (!k.f200 && R <= 200 && R > 0) {
		k.f200 = true;
		std::vector<int> sl(ord.begin() + std::min<size_t>(1, ord.size()), ord.begin() + std::min<size_t>(6, ord.size()));
		std::vector<int> closers = stable_order(sim, true, sl);
		if (!closers.empty() && st[closers[0]].v > lead.v + 0.4) say(sim, t, U8("外から") + st[closers[0]].name + U8("が猛然と追い込む！"), "duel");
	}
	if (k.lastLeader >= 0) k.lastLeader = lead.i;
}

static String margin(double lengths) {
	if (lengths <= 0.003) return U8("同着");
	if (lengths < 0.1) return U8("ハナ");
	if (lengths < 0.25) return U8("アタマ");
	if (lengths < 0.4) return U8("クビ");
	static const double th[] = { 0.6, 0.85, 1.1, 1.35, 1.6, 1.85, 2.25, 2.75, 3.25, 3.75, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5 };
	static const char *lb[] = { "1/2", "3/4", "1", "1 1/4", "1 1/2", "1 3/4", "2", "2 1/2", "3", "3 1/2", "4", "5", "6", "7", "8", "9", "10" };
	for (int i = 0; i < 17; i++) if (lengths < th[i]) return String(lb[i]);
	return U8("大差");
}

Dictionary sim_finish(Sim &sim) {
	auto &st = sim.st;
	double D = sim.D, t = sim.t;
	for (auto &s : st) if (!s.done) { s.hasFinishT = true; s.finishT = t + (D - s.x) / mx(5.0, s.v); s.done = true; }
	if (sim.optFrames) {
		Array p;
		for (auto &s : st) { Array q; q.push_back(s.x); q.push_back(s.lane); q.push_back(s.v); p.push_back(q); }
		Dictionary f; f["t"] = t + DT; f["p"] = p;
		sim.frames.push_back(f);
	}
	std::vector<int> ranked(st.size());
	for (size_t i = 0; i < st.size(); i++) ranked[i] = (int)i;
	std::stable_sort(ranked.begin(), ranked.end(), [&](int p, int q) { return st[p].finishT < st[q].finishT; });
	Runner &winner = st[ranked[0]];
	Array results;
	std::vector<double> lens(ranked.size());
	std::vector<String> margins(ranked.size());
	for (size_t k = 0; k < ranked.size(); k++) {
		Runner &s = st[ranked[k]];
		double lengths = 0.0;
		if (k > 0) lengths = (s.finishT - st[ranked[k - 1]].finishT) * s.vc / LEN;
		lens[k] = lengths; margins[k] = k == 0 ? String("") : margin(lengths);
		Dictionary r;
		r["pos"] = (int64_t)(k + 1); r["num"] = s.r.get("num", Variant()); r["frame"] = s.r.get("frame", Variant()); r["horse"] = s.h;
		r["jockey"] = s.r.get("jockey", Variant()); r["weight"] = s.r.get("weight", Variant());
		r["time"] = s.finishT; r["margin"] = margins[k]; r["lengths"] = lengths;
		r["last3f"] = s.hasT600 ? Variant(s.finishT - s.t600) : Variant();
		r["late"] = s.late; r["blocked"] = s.blockedOnce && s.blocked != 0; r["power"] = s.A; r["endE"] = s.E;
		Variant rider = s.r.get("rider", Variant());
		r["rider"] = truthy(rider) ? rider : Variant();
		results.push_back(r);
	}
	String wname = winner.name;
	String finishText = wname + U8("、1着でゴールイン！");
	if (ranked.size() > 1) {
		Runner &sec = st[ranked[1]];
		if (lens[1] < 0.1) finishText = wname + U8("と") + sec.name + U8("、並んでゴール！ 写真判定……") + wname + U8("がハナ差で制した！");
		else if (lens[1] >= 5) finishText = wname + U8("、圧勝！ ") + margins[1] + U8("馬身突き放してゴール！");
	}
	say(sim, winner.finishT, finishText, "finish");
	// 実況を時刻の順に（安定な並べ替え）
	std::vector<int> ei(sim.events.size());
	for (size_t i = 0; i < ei.size(); i++) ei[i] = (int)i;
	std::vector<double> et(ei.size());
	for (size_t i = 0; i < ei.size(); i++) et[i] = (double)((Dictionary)sim.events[i])["t"];
	std::stable_sort(ei.begin(), ei.end(), [&](int p, int q) { return et[p] < et[q]; });
	Array ev;
	for (int i : ei) ev.push_back(sim.events[i]);
	sim.events = ev;
	Dictionary out;
	out["results"] = results; out["events"] = sim.events; out["frames"] = sim.optFrames ? Variant(sim.frames) : Variant();
	out["D"] = D; out["straight"] = sim.straight; out["lap"] = sim.geo.get("lap", Variant()); out["winnerTime"] = winner.finishT;
	return out;
}

} // namespace hs
