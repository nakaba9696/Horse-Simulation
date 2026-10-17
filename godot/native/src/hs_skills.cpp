// 発動する特殊能力（godot/core/hs_skills.gd・js/core/skills.js と同じ）。レース中の決まった場面で効き目が出る
#include "hs_sim.h"
#include "hs_math.h"
#include "hs_var.h"
#include <mutex>

using namespace godot;

namespace hs {

static const double LEN = 2.4;

// ---------- 特殊能力の id の番号 ----------
static std::vector<String> g_ids;
static std::mutex g_ids_mu;
static void init_ids() {
	if (!g_ids.empty()) return;
	const char *base[] = { "spurt",
		// 発動の特殊能力（LIST の順）
		"saikoubi", "chokusen", "oosoto", "bagun", "sasari", "kongomi", "sessenB", "isshun", "hanno", "startdash", "nebari", "tanki", "yonkaku", "oriai",
		"nimai", "demuchi", "makuri", "dokonjo", "sessen",
		// 馬の特殊能力（HSHorse.SKILLS）
		"big", "fresh", "tataki", "left", "right", "small", "long", "summer", "winter", "hipace", "slowpace", "oonige", "longspurt", "narabu", "nino", "jiyu",
		"inner", "travel", "homebody", "deokure", "kakari", "sora", "sunaB", "leftB", "rightB" };
	for (const char *s : base) g_ids.push_back(String(s));
}
int skill_id(const String &s) {
	std::lock_guard<std::mutex> lk(g_ids_mu);
	init_ids();
	for (size_t i = 0; i < g_ids.size(); i++) if (g_ids[i] == s) return (int)i;
	if (g_ids.size() >= 128) return -1;
	g_ids.push_back(s);
	return (int)g_ids.size() - 1;
}
const String &skill_name(int id) { return g_ids[id]; }
void skill_ids_clear() { std::lock_guard<std::mutex> lk(g_ids_mu); g_ids.clear(); g_ids.shrink_to_fit(); }

// ---------- 発動の特殊能力の表 ----------
struct P { double spd, sta, guts, mind, slope, kire; int style; };
struct X {
	Sim *sim; Runner *s; Ctl *c; double t, D, R, straight; bool inStraight; int rank, n;
	bool whipping, left, right, faster, close; Runner *leader, *second; SkState *sk;
};
enum At { AT_START, AT_MID, AT_ST, AT_ANY };
struct Fx { double spd = 0, sec = 0, E = 0, top = 0, drift = 0, pos = 0; bool free_ = false, hasSec = false; };
struct Def {
	const char *id; At at; const char *label; bool ikki, bad; Fx fx;
	bool (*learn)(const P &);
	bool (*when)(const X &);
};
static inline bool sashi(int st) { return st == ST_SASHI || st == ST_OIKOMI; }
static Fx fx(double spd, double sec, bool free_, double top = 0, double E = 0, double drift = 0, double pos = 0, bool hasSec = true) {
	Fx f; f.spd = spd; f.sec = sec; f.free_ = free_; f.top = top; f.E = E; f.drift = drift; f.pos = pos; f.hasSec = hasSec; return f;
}
static Fx fxE(double E) { Fx f; f.E = E; return f; }

static const Def LIST[] = {
	{ "saikoubi", AT_ST, "豪脚", true, false, fx(0.07, 4.0, true, 0.3),
		[](const P &p) { return p.style == ST_OIKOMI && p.kire >= 6; },
		[](const X &x) { return x.inStraight && x.R > 100 && x.rank >= x.n - 2 && x.whipping; } },
	{ "chokusen", AT_ST, "末脚", true, false, fx(0.05, 4.0, true, 0.2),
		[](const P &p) { return sashi(p.style) && p.kire >= 6; },
		[](const X &x) { return x.inStraight && x.R > 100 && x.rank > x.n / 2.0 && x.whipping; } },
	{ "oosoto", AT_ST, "外差し", true, false, fx(0.045, 4.0, true, 0.2),
		[](const P &p) { return sashi(p.style) && p.slope >= 82; },
		[](const X &x) { return x.inStraight && x.R > 100 && x.s->lane >= 5 && x.whipping; } },
	{ "bagun", AT_ST, "馬群を割る", false, false, fx(0.05, 3.0, true),
		[](const P &p) { return p.style != ST_NIGE && p.guts >= 88; },
		[](const X &x) { return x.inStraight && x.R > 60 && x.left && x.right && x.faster; } },
	{ "sasari", AT_ANY, "ささり癖", false, true, fx(-0.035, 1.5, false),
		[](const P &p) { return p.mind < 64 && p.guts < 76; },
		[](const X &x) {
			if (x.c) return x.c->hasLastWhip && x.t - x.c->lwT < 0.15 && x.s->E < 0.12;
			return x.whipping && x.s->E < 0.15; } },
	{ "kongomi", AT_ANY, "揉まれ弱い", false, true, fxE(-0.03),
		[](const P &p) { return p.mind < 70 && (p.style == ST_NIGE || p.style == ST_OIKOMI); },
		[](const X &x) { return x.sk->boxedFor >= 3; } },
	{ "sessenB", AT_ST, "叩き合い×", false, true, fx(-0.015, 1.5, false),
		[](const P &p) { return p.guts < 70; },
		[](const X &x) { return x.R < 100 && x.close; } },
	{ "isshun", AT_ST, "切れ味", false, false, fx(0.06, 2.5, true),
		[](const P &p) { return p.style != ST_NIGE && p.kire >= 6 && p.spd >= 85; },
		[](const X &x) { return x.R <= 150 && x.rank >= 2 && (x.whipping || x.s->spurting); } },
	{ "hanno", AT_ST, "鋭い反応", false, false, fx(0.045, 3.0, true),
		[](const P &p) { return p.kire >= 7 || (p.kire >= 6 && p.mind >= 82); },
		[](const X &x) { return x.inStraight && x.straight - x.R < 100 && x.whipping && !x.sk->whipBefore; } },
	{ "startdash", AT_START, "好発", false, false, fx(0.06, 3.0, true, 0, 0, 0, 2.0),
		[](const P &p) { return p.mind >= 82 && (p.style == ST_NIGE || p.style == ST_SENKO); },
		[](const X &x) { return x.t - x.s->delay < 0.6 && x.s->delay < 0.25 && !x.s->late; } },
	{ "nebari", AT_ST, "粘り込み", false, false, fx(0.05, 3.5, true),
		[](const P &p) { return (p.style == ST_NIGE || p.style == ST_SENKO) && p.sta >= 85; },
		[](const X &x) { return x.R <= 300 && x.sk->led600 && x.rank <= 3 && x.leader->x - x.s->x < LEN; } },
	{ "tanki", AT_MID, "マイペース", false, false, fxE(0.06),
		[](const P &p) { return p.style == ST_NIGE && p.mind >= 65; },
		[](const X &x) { return !x.inStraight && x.sk->soloFor >= 10; } },
	{ "yonkaku", AT_ST, "早め先頭", false, false, fxE(0.05),
		[](const P &p) { return (p.style == ST_SENKO || p.style == ST_SASHI) && p.spd >= 86 && p.kire <= 4; },
		[](const X &x) { return x.inStraight && x.straight - x.R < 30 && x.rank == 1; } },
	{ "oriai", AT_MID, "折り合い上手", false, false, fxE(0.02),
		[](const P &p) { return p.mind >= 85; },
		[](const X &x) { return x.D >= 1600 && x.s->x >= x.D / 2.0 && !x.sk->kakari && !(x.c && x.c->everKakari); } },
	{ "nimai", AT_ST, "差し返し", false, false, fx(0.025, 2.0, true, 0, 0.05),
		[](const P &p) { return p.style == ST_NIGE && p.guts >= 82; },
		[](const X &x) { return x.R < 300 && x.rank == 1 && x.second != nullptr && x.s->x - x.second->x < LEN; } },
	{ "demuchi", AT_START, "行き脚", false, false, fx(0.05, 2.5, true, 0, 0, 0, 1.5),
		[](const P &p) { return (p.style == ST_NIGE || p.style == ST_SENKO) && p.guts >= 86; },
		[](const X &x) { return x.t - x.s->delay < 3 && (x.c ? x.c->whips > 0 : true); } },
	{ "makuri", AT_ST, "まくり", false, false, fxE(0.06),
		[](const P &p) { return sashi(p.style) && p.kire <= 4 && p.sta >= 78; },
		[](const X &x) { return x.inStraight && x.straight - x.R < 30 && x.sk->rankMid >= 0 && x.sk->rankMid - x.rank >= 4 && x.leader->x - x.s->x < 2 * LEN; } },
	{ "dokonjo", AT_ANY, "勝負根性", false, false, fxE(0.02),
		[](const P &p) { return p.guts >= 88; },
		[](const X &x) { return x.sk->duelFor >= 3; } },
	{ "sessen", AT_ST, "叩き合い", false, false, fx(0.03, 2.5, true),
		[](const P &p) { return p.guts >= 86; },
		[](const X &x) { return x.R < 100 && x.close; } },
};
static const int NLIST = sizeof(LIST) / sizeof(LIST[0]);
static const char *GROUP_OF[NLIST] = { "爆発", "爆発", "爆発", "爆発", "損", "損", "損", "速さ", "速さ", "速さ", "速さ", "気性", "気性", "気性", "根性", "根性", "根性", "根性", "根性" };
static const char *ORDER[5] = { "爆発", "損", "速さ", "気性", "根性" };
// 発動の特殊能力の番号（id の番号 1〜19）→ 表の位置
static inline const Def *def_of(int id) { return (id >= 1 && id <= NLIST) ? &LIST[id - 1] : nullptr; }

String skill_label(int id) {
	const Def *d = def_of(id);
	if (d) return U8(d->label);
	const String &nm = skill_name(id);
	Variant l = data().labels.get(nm, Variant());
	if (l.get_type() == Variant::STRING) return l;
	return nm;
}

static int style_of(const Variant &v) {
	if (is_str(v, "逃げ")) return ST_NIGE;
	if (is_str(v, "先行")) return ST_SENKO;
	if (is_str(v, "差し")) return ST_SASHI;
	if (is_str(v, "追込")) return ST_OIKOMI;
	return ST_NONE;
}

// この馬の発動する特殊能力
std::vector<int> skills_of(const Dictionary &h, const Variant &w_idx) {
	std::vector<int> out;
	Variant tf = h.get("trigFixed", Variant());
	if (tf.booleanize()) {
		Array a = tf;
		for (int i = 0; i < a.size(); i++) out.push_back(skill_id(a[i]));
		return out;
	}
	double spd, sta, guts, mind, slope;
	if (w_idx.get_type() != Variant::NIL) {
		Stats7 c = horse_cur(h, (double)w_idx);
		spd = mx(num_or(c.spd, 0.0), num_or(c.dspd, 0.0)); sta = mx(num_or(c.sta, 0.0), num_or(c.dsta, 0.0));
		guts = num_or(c.guts, 0.0); mind = num_or(c.mind, 0.0); slope = num_or(c.slope, 0.0);
	} else {
		Variant pv = h.get("pot", Variant());
		Dictionary c = truthy(pv) ? (Dictionary)pv : Dictionary();
		spd = mx(num_or(c.get("spd", Variant()), 0.0), num_or(c.get("dspd", Variant()), 0.0));
		sta = mx(num_or(c.get("sta", Variant()), 0.0), num_or(c.get("dsta", Variant()), 0.0));
		guts = num_or(c.get("guts", Variant()), 0.0); mind = num_or(c.get("mind", Variant()), 0.0); slope = num_or(c.get("slope", Variant()), 0.0);
	}
	P p{ spd, sta, guts, mind, slope, num_or(h.get("kire", Variant()), 4.0), style_of(h.get("style", Variant())) };
	double a = (p.spd + p.sta + p.guts) / 3.0;
	int cap = a < 65 ? 1 : (a < 78 ? 2 : (a < 90 ? 3 : 4));
	std::vector<int> ok[5];
	for (int g = 0; g < 5; g++)
		for (int k = 0; k < NLIST; k++)
			if (strcmp(GROUP_OF[k], ORDER[g]) == 0 && LIST[k].learn(p)) ok[g].push_back(k + 1);
	int round_ = 0;
	while ((int)out.size() < cap) {
		bool any = false;
		for (int g = 0; g < 5; g++) {
			if (round_ < (int)ok[g].size()) {
				any = true;
				if ((int)out.size() < cap) out.push_back(ok[g][round_]);
			}
		}
		if (!any) break;
		round_++;
	}
	return out;
}

void skills_setup(Sim &sim) {
	for (auto &s : sim.st) {
		s.trig = skills_of(s.h, sim.wIdx);
		s.sk = SkState();
	}
}

// 一気系は、ためた脚（発動したときのスタミナ）で伸びが変わる
static void apply(Sim &sim, Runner &s, const Def &k) {
	const Fx &f = k.fx;
	double amp = k.ikki ? clamp(0.4 + 2.0 * s.E, 0.6, 1.6) : 1.0;
	if (f.spd != 0.0) { s.boost.on = true; s.boost.mul = 1.0 + f.spd * amp; s.boost.until = sim.t + num_or(f.sec, 1.5); s.boost.id = skill_id(String(k.id)); s.boost.free_ = f.free_; }
	if (f.free_ && k.at == AT_START) s.easyStart = true;
	if (f.top != 0.0) s.topAdd = s.topAdd + f.top;
	if (f.E != 0.0) s.E = clamp(s.E + f.E, -0.2, 1.0);
	if (f.drift != 0.0 && s.me && sim.hasCtl && sim.ctl.hasLastWhip) sim.ctl.lane = clamp(sim.ctl.lane + sim.ctl.lwAway * f.drift, 0.0, 12.0);
	else if (f.drift != 0.0) s.driftLane = num_or(s.driftLane, 0.0) + f.drift * 1.5;
	if (f.pos != 0.0) s.gapAdj = num_or(s.gapAdj, 0.0) - f.pos;
}

// 0.2 秒ごと。order＝まだ走っている馬の、前から順の並び
void skills_step(Sim &sim, const std::vector<int> &order, double DT) {
	double D = sim.D, straight = sim.straight, t = sim.t;
	int n = (int)sim.st.size();
	Runner *leader = order.size() > 0 ? &sim.st[order[0]] : nullptr;
	Runner *second = order.size() > 1 ? &sim.st[order[1]] : nullptr;
	std::vector<Runner *> near;
	near.reserve(n);
	for (size_t k = 0; k < order.size(); k++) {
		Runner &s = sim.st[order[k]];
		if (s.done || s.trig.empty() || t < s.delay) continue;
		double R0 = D - s.x;
		At ph = R0 <= straight + 30 ? AT_ST : (t - s.delay < 4 ? AT_START : AT_MID);
		bool need = k < 2 || (s.x >= D * 0.5 && s.sk.rankMid < 0);
		for (size_t q = 0; q < s.trig.size() && !need; q++) {
			const Def *d = def_of(s.trig[q]);
			if (!d) continue;
			if (!s.fired.has(s.trig[q]) && (d->at == ph || d->at == AT_ANY)) need = true;
		}
		if (!need) continue;
		Ctl *me = (s.me && sim.hasCtl) ? &sim.ctl : nullptr;
		double R = D - s.x;
		bool inStraight = R <= straight && R > 0;
		int rank = (int)k + 1;
		SkState &sk = s.sk;
		bool whipping = me ? (t < me->whipUntil) : (s.spurting && inStraight);
		if (me && whipping && !inStraight) sk.whipBefore = true;
		near.clear();
		for (int q = (int)k - 1; q >= 0 && sim.st[order[q]].x - s.x < 5; q--) near.push_back(&sim.st[order[q]]);
		for (size_t q = k + 1; q < order.size() && s.x - sim.st[order[q]].x < 3; q++) near.push_back(&sim.st[order[q]]);
		bool left = false, right = false, front = false, close = false, faster = true;
		for (Runner *o : near) {
			double dl = o->lane - s.lane, dx = o->x - s.x;
			if (dx > 0 && std::fabs(dl) < 0.9) front = true;
			if (dx >= 3) continue;
			if (dl < -0.4 && dl > -1.6) left = true;
			if (dl > 0.4 && dl < 1.6) right = true;
			if (std::fabs(dx) < 1.2 && std::fabs(dl) < 1.6) close = true;
			if (o->v >= s.v) faster = false;
		}
		sk.boxedFor = ((left || s.lane < 0.5) && right && front) ? sk.boxedFor + DT : 0.0;
		sk.soloFor = (rank == 1 && second != nullptr && s.x - second->x >= 2 * LEN) ? sk.soloFor + DT : 0.0;
		sk.duelFor = ((s.spurting || (me && me->gear > 0.3)) && close) ? sk.duelFor + DT : 0.0;
		if (rank == 1 && R <= 600 && R > 300) sk.led600 = true;
		if (sk.rankMid < 0 && s.x >= D * 0.5) sk.rankMid = rank;
		if (s.kakariDay && s.x < D * 0.5 && !me) sk.kakari = true;
		X x{ &sim, &s, me, t, D, R, straight, inStraight, rank, n, whipping, left, right, faster, close, leader, second, &sk };
		for (size_t q = 0; q < s.trig.size(); q++) {
			int id = s.trig[q];
			if (s.fired.has(id)) continue;
			const Def *def = def_of(id);
			if (!def) continue;
			if (def->at != ph && def->at != AT_ANY) continue;
			if (def->ikki && sk.ikki) continue;
			if (!def->when(x)) continue;
			if (def->ikki) sk.ikki = true;
			fire(sim, s, id);
			apply(sim, s, *def);
		}
	}
}

} // namespace hs
