// Godot に見せる窓口。GDScript の HSSim が C++ を読めるときに使う（godot/core/hs_sim.gd の切り替え）。
// 模擬（HSNativeSim）の値は GDScript の HSSim.Sim と同じ名前で読める（sim.t・sim.st[i].x・sim.ctl.tension・sim.track.at(残り) …）
#include "hs_sim.h"
#include "hs_math.h"
#include "hs_var.h"
#include <unordered_map>
#include <string>
#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/classes/ref.hpp>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/variant/packed_float64_array.hpp>
#include <godot_cpp/variant/packed_int32_array.hpp>

using namespace godot;

class HSNativeSim;

// ---------- コース ----------
class HSNativeTrack : public RefCounted {
	GDCLASS(HSNativeTrack, RefCounted)
public:
	hs::Track *t = nullptr;
	bool own = false; // 楕円の形はレースごとに作るので、この包みが持つ（回りの形は使い回しで、消さない）
	~HSNativeTrack() { if (own) delete t; }
	Dictionary at(double s) const { hs::TrackPt p = t->at(s); Dictionary d; d["x"] = p.x; d["y"] = p.y; d["curv"] = p.curv; d["corner"] = p.corner; return d; }
	double h_at(double s) const { return t->h_at(s); }
	double g_at(double s) const { return t->g_at(s); }
	int corner_at(double R) const { return t->corner_at(R); }
	bool _get(const StringName &name, Variant &r) const {
		std::string n = String(name).utf8().get_data();
		if (n == "L") r = t->L; else if (n == "a") r = t->a; else if (n == "r") r = t->r; else if (n == "straight") r = t->straight;
		else if (n == "sign_") r = t->sign_; else if (n == "flat") r = t->flat; else if (n == "line") r = t->line; else if (n == "id") r = t->id;
		else if (n == "layout") r = t->layout; else if (n == "n") r = t->n; else if (n == "dl") r = t->dl;
		else if (n == "X" || n == "Y" || n == "K" || n == "Hs") {
			const std::vector<double> &v = n == "X" ? t->X : n == "Y" ? t->Y : n == "K" ? t->K : t->Hs;
			PackedFloat64Array a; a.resize(v.size()); for (size_t i = 0; i < v.size(); i++) a.set(i, v[i]); r = a;
		} else if (n == "C") { PackedInt32Array a; a.resize(t->C.size()); for (size_t i = 0; i < t->C.size(); i++) a.set(i, t->C[i]); r = a; }
		else return false;
		return true;
	}
protected:
	static void _bind_methods() {
		ClassDB::bind_method(D_METHOD("at", "s"), &HSNativeTrack::at);
		ClassDB::bind_method(D_METHOD("h_at", "s"), &HSNativeTrack::h_at);
		ClassDB::bind_method(D_METHOD("g_at", "s"), &HSNativeTrack::g_at);
		ClassDB::bind_method(D_METHOD("corner_at", "R"), &HSNativeTrack::corner_at);
	}
};

// ---------- 模擬 ----------
class HSNativeSim : public RefCounted {
	GDCLASS(HSNativeSim, RefCounted)
public:
	hs::Sim *sim = nullptr;
	Array stObjs;
	Variant ctlObj;
	Ref<HSNativeTrack> trackObj;
	~HSNativeSim() { delete sim; }

	static void set_data(const Dictionary &courses, const Dictionary &layouts, const Dictionary &labels, const Array &uniques) { hs::set_data({ courses, layouts, labels, uniques }); hs::skills_init(); }
	static Ref<HSNativeSim> create(const Dictionary &race, const Array &runners, const Variant &w_idx, int64_t rng_state, const Dictionary &opts, double era_speed);
	static Dictionary power(const Dictionary &horse, const Dictionary &race, const Variant &w_idx, const Dictionary &ctx) { return hs::power(horse, race, w_idx, ctx); }
	static Array skills_of(const Dictionary &h, const Variant &w_idx) { Array a; for (int id : hs::skills_of(h, w_idx)) a.push_back(hs::skill_name(id)); return a; }
	// 数学の関数（一致テスト用。hs_math.gd と同じ値）
	static double m_cos(double x) { return hs::cos_(x); }
	static double m_sin(double x) { return hs::sin_(x); }
	static double m_exp(double x) { return hs::exp_(x); }
	static double m_log(double x) { return hs::log_(x); }
	static double m_cbrt(double x) { return hs::cbrt(x); }
	static double m_pow(double x, double y) { return hs::pow_(x, y); }
	static double m_hypot(double x, double y) { return hs::hypot(x, y); }
	static double m_round(double x) { return hs::round_js(x); }
	static String m_fixed(double x, int d) { return String(hs::to_fixed(x, d).c_str()); }
	static PackedFloat64Array rng_seq(int64_t state, int n) { hs::Rng r; r.s = (uint32_t)state; PackedFloat64Array a; a.resize(n); for (int i = 0; i < n; i++) a.set(i, r.next()); return a; }

	bool advance() { return hs::sim_step(*sim); }
	Dictionary finish() { return hs::sim_finish(*sim); }
	Variant ctl_up() { return hs::ctl_up(*sim); }
	Variant ctl_down() { return hs::ctl_down(*sim); }
	Variant ctl_whip(const Variant &side) { return hs::ctl_whip(*sim, side); }
	Variant ctl_swap() { return hs::ctl_swap(*sim); }
	Variant ctl_lane(double d) { return hs::ctl_lane(*sim, d); }
	void ctl_hold(bool on) { hs::ctl_hold(*sim, on); }
	bool is_native() const { return true; }
	Variant runner_obj(int i) const { return i >= 0 && i < stObjs.size() ? stObjs[i] : Variant(); }
	bool _get(const StringName &name, Variant &r) const;
	void _get_property_list(List<PropertyInfo> *p_list) const;
protected:
	static void _bind_methods() {
		ClassDB::bind_static_method("HSNativeSim", D_METHOD("set_data", "courses", "layouts", "labels", "uniques"), &HSNativeSim::set_data);
		ClassDB::bind_static_method("HSNativeSim", D_METHOD("create", "race", "runners", "w_idx", "rng_state", "opts", "era_speed"), &HSNativeSim::create);
		ClassDB::bind_static_method("HSNativeSim", D_METHOD("power", "horse", "race", "w_idx", "ctx"), &HSNativeSim::power);
		ClassDB::bind_static_method("HSNativeSim", D_METHOD("skills_of", "h", "w_idx"), &HSNativeSim::skills_of);
		ClassDB::bind_static_method("HSNativeSim", D_METHOD("m_cos", "x"), &HSNativeSim::m_cos);
		ClassDB::bind_static_method("HSNativeSim", D_METHOD("m_sin", "x"), &HSNativeSim::m_sin);
		ClassDB::bind_static_method("HSNativeSim", D_METHOD("m_exp", "x"), &HSNativeSim::m_exp);
		ClassDB::bind_static_method("HSNativeSim", D_METHOD("m_log", "x"), &HSNativeSim::m_log);
		ClassDB::bind_static_method("HSNativeSim", D_METHOD("m_cbrt", "x"), &HSNativeSim::m_cbrt);
		ClassDB::bind_static_method("HSNativeSim", D_METHOD("m_pow", "x", "y"), &HSNativeSim::m_pow);
		ClassDB::bind_static_method("HSNativeSim", D_METHOD("m_hypot", "x", "y"), &HSNativeSim::m_hypot);
		ClassDB::bind_static_method("HSNativeSim", D_METHOD("m_round", "x"), &HSNativeSim::m_round);
		ClassDB::bind_static_method("HSNativeSim", D_METHOD("m_fixed", "x", "d"), &HSNativeSim::m_fixed);
		ClassDB::bind_static_method("HSNativeSim", D_METHOD("rng_seq", "state", "n"), &HSNativeSim::rng_seq);
		ClassDB::bind_method(D_METHOD("advance"), &HSNativeSim::advance);
		ClassDB::bind_method(D_METHOD("finish"), &HSNativeSim::finish);
		ClassDB::bind_method(D_METHOD("ctl_up"), &HSNativeSim::ctl_up);
		ClassDB::bind_method(D_METHOD("ctl_down"), &HSNativeSim::ctl_down);
		ClassDB::bind_method(D_METHOD("ctl_whip", "side"), &HSNativeSim::ctl_whip);
		ClassDB::bind_method(D_METHOD("ctl_swap"), &HSNativeSim::ctl_swap);
		ClassDB::bind_method(D_METHOD("ctl_lane", "d"), &HSNativeSim::ctl_lane);
		ClassDB::bind_method(D_METHOD("ctl_hold", "on"), &HSNativeSim::ctl_hold);
		ClassDB::bind_method(D_METHOD("is_native"), &HSNativeSim::is_native);
	}
};

// ---------- 1頭 ----------
class HSNativeRunner : public RefCounted {
	GDCLASS(HSNativeRunner, RefCounted)
public:
	HSNativeSim *owner = nullptr; // 持ち主の模擬は stObjs で自分を持っているので、こちらは弱い参照
	int idx = 0;
	bool _get(const StringName &name, Variant &r) const;
	void _get_property_list(List<PropertyInfo> *p_list) const;
protected:
	static void _bind_methods() {}
};

// ---------- 操作の状態 ----------
class HSNativeCtl : public RefCounted {
	GDCLASS(HSNativeCtl, RefCounted)
public:
	HSNativeSim *owner = nullptr;
	bool _get(const StringName &name, Variant &r) const;
	void _get_property_list(List<PropertyInfo> *p_list) const;
protected:
	static void _bind_methods() {}
};

static Dictionary idset_dict(const hs::IdSet &s) { Dictionary d; for (int id : s.order) d[hs::skill_name(id)] = true; return d; }
static Array ids_array(const std::vector<int> &v) { Array a; for (int id : v) a.push_back(hs::skill_name(id)); return a; }
static Array dvec(const std::vector<double> &v) { Array a; for (double x : v) a.push_back(x); return a; }

static const char *RUNNER_KEYS[] = { "r", "h", "i", "A", "vc", "Ds", "kickS", "spurtR", "guts", "mind", "slopeP", "x", "v", "E", "delay", "late", "kakariDay",
	"acc", "zubu", "spurtCost", "oonige", "nino", "narabu", "sora", "sunaB", "jiyu", "gapAdj", "driftLane", "me", "fired", "boost", "trig", "sk", "passive",
	"passiveShown", "lane", "laneT", "spurting", "done", "finishT", "t600", "blocked", "blockedOnce", "styleMult", "gap", "jiyuMove", "fight", "duel",
	"fightPeak", "kakari", "headUp", "ears", "rk", "easyStart", "topAdd", "sunaT", "tsuiso", "sotoM", "sabaki" };
static const int N_RUNNER_KEYS = sizeof(RUNNER_KEYS) / sizeof(RUNNER_KEYS[0]);
static std::unordered_map<std::string, int> make_index(const char *const *keys, int n) { std::unordered_map<std::string, int> m; for (int i = 0; i < n; i++) m[keys[i]] = i; return m; }

bool HSNativeRunner::_get(const StringName &name, Variant &r) const {
	static const std::unordered_map<std::string, int> IX = make_index(RUNNER_KEYS, N_RUNNER_KEYS);
	auto it = IX.find(String(name).utf8().get_data());
	if (it == IX.end() || !owner) return false;
	const hs::Runner &s = owner->sim->st[idx];
	switch (it->second) {
		case 0: r = s.r; break; case 1: r = s.h; break; case 2: r = s.i; break; case 3: r = s.A; break; case 4: r = s.vc; break; case 5: r = s.Ds; break;
		case 6: r = s.kickS; break; case 7: r = s.spurtR; break; case 8: r = s.guts; break; case 9: r = s.mind; break; case 10: r = s.slopeP; break;
		case 11: r = s.x; break; case 12: r = s.v; break; case 13: r = s.E; break; case 14: r = s.delay; break; case 15: r = s.late; break;
		case 16: r = s.kakariDay; break; case 17: r = s.acc; break; case 18: r = s.zubu; break; case 19: r = s.spurtCost; break;
		case 20: r = s.oonige; break; case 21: r = false; break; case 22: r = false; break; case 23: r = s.sora; break; case 24: r = s.sunaB; break; // nino・narabu は無くした（前の名前のため false）
		case 25: r = s.jiyu; break; case 26: r = s.gapAdj; break; case 27: r = s.driftLane; break; case 28: r = s.me; break;
		case 29: r = idset_dict(s.fired); break;
		case 30: if (s.boost.on) { Dictionary b; b["mul"] = s.boost.mul; b["until"] = s.boost.until; b["id"] = s.boost.id >= 0 ? Variant(hs::skill_name(s.boost.id)) : Variant(); b["free"] = s.boost.free_; r = b; } else r = Variant(); break;
		case 31: r = ids_array(s.trig); break;
		case 32: { Dictionary d; d["boxedFor"] = s.sk.boxedFor; d["soloFor"] = s.sk.soloFor; d["duelFor"] = s.sk.duelFor; d["led600"] = s.sk.led600;
			d["rankMid"] = s.sk.rankMid >= 0 ? Variant(s.sk.rankMid) : Variant(); d["whipBefore"] = s.sk.whipBefore; d["ikki"] = s.sk.ikki; d["kakari"] = s.sk.kakari; r = d; } break;
		case 33: r = ids_array(s.passive); break;
		case 34: r = s.passiveShown; break; case 35: r = s.lane; break; case 36: r = s.laneT; break; case 37: r = s.spurting; break; case 38: r = s.done; break;
		case 39: r = s.hasFinishT ? Variant(s.finishT) : Variant(); break;
		case 40: r = s.hasT600 ? Variant(s.t600) : Variant(); break;
		case 41: r = s.blocked; break; case 42: r = s.blockedOnce; break; case 43: r = s.styleMult; break; case 44: r = s.gap; break; case 45: r = s.jiyuMove; break;
		case 46: r = s.fight; break;
		case 47: r = owner->runner_obj(s.duel); break;
		case 48: r = s.fightPeak; break; case 49: r = s.kakari; break; case 50: r = s.kakari; break; case 51: r = s.ears; break;
		case 52: r = s.hasRk ? Variant(s.rk) : Variant(); break;
		case 53: r = s.easyStart; break; case 54: r = s.topAdd; break; case 55: r = s.sunaT; break;
		case 56: r = s.tsuiso; break; case 57: r = s.sotoM; break; case 58: r = s.sabaki; break;
		default: return false;
	}
	return true;
}
void HSNativeRunner::_get_property_list(List<PropertyInfo> *p_list) const {
	for (int i = 0; i < N_RUNNER_KEYS; i++) p_list->push_back(PropertyInfo(Variant::NIL, RUNNER_KEYS[i], PROPERTY_HINT_NONE, "", PROPERTY_USAGE_NIL_IS_VARIANT));
}

static const char *CTL_KEYS[] = { "tension", "started", "gear", "hand", "swapUntil", "lastPush", "lastPull", "pushes", "whips", "whipUntil", "windmill", "lane",
	"blockedNow", "wide", "kakariNow", "behind", "surge", "shrink", "pullT", "reinFight", "bumpT", "bumpSide", "bond", "bondF", "spurtTension", "lastEv",
	"startGood", "taps", "whipT", "lastWhip", "laneT", "driftT", "evT", "passSeen", "misfit", "everKakari", "push", "hold" };
static const int N_CTL_KEYS = sizeof(CTL_KEYS) / sizeof(CTL_KEYS[0]);

bool HSNativeCtl::_get(const StringName &name, Variant &r) const {
	static const std::unordered_map<std::string, int> IX = make_index(CTL_KEYS, N_CTL_KEYS);
	auto it = IX.find(String(name).utf8().get_data());
	if (it == IX.end() || !owner) return false;
	const hs::Ctl &c = owner->sim->ctl;
	switch (it->second) {
		case 0: r = c.tension; break; case 1: r = c.started; break; case 2: r = c.gear; break; case 3: r = String(c.handR ? "R" : "L"); break;
		case 4: r = c.swapUntil; break; case 5: r = c.lastPush; break; case 6: r = c.lastPull; break; case 7: r = c.pushes; break; case 8: r = c.whips; break;
		case 9: r = c.whipUntil; break; case 10: r = c.windmill; break; case 11: r = c.lane; break; case 12: r = c.blockedNow; break; case 13: r = c.wide; break;
		case 14: r = c.kakariNow; break; case 15: r = c.behind; break; case 16: r = c.surge; break; case 17: r = c.shrink; break; case 18: r = c.pullT; break;
		case 19: r = c.reinFight; break;
		case 20: r = c.hasBumpT ? Variant(c.bumpT) : Variant(); break;
		case 21: r = c.bumpSide; break; case 22: r = c.bond; break; case 23: r = c.bondF; break;
		case 24: r = c.hasSpurtTension ? Variant(c.spurtTension) : Variant(); break;
		case 25: if (c.hasLastEv) { Dictionary d; d["t"] = c.lastEvT; d["ev"] = c.lastEv; r = d; } else r = Variant(); break;
		case 26: r = c.startGood < 0 ? Variant() : Variant(c.startGood == 1); break;
		case 27: r = dvec(c.taps); break; case 28: r = dvec(c.whipT); break;
		case 29: if (c.hasLastWhip) { Dictionary d; d["t"] = c.lwT; d["side"] = String(c.lwR ? "R" : "L"); d["away"] = c.lwAway; d["yore"] = c.lwYore; r = d; } else r = Variant(); break;
		case 30: r = c.laneT; break; case 31: r = c.driftT; break;
		case 32: { Dictionary d; if (c.evWallSet) d["wall"] = c.evWall; if (c.evSandSet) d["sand"] = c.evSand; if (c.evCoverSet) d["cover"] = c.evCover; r = d; } break;
		case 33: { Dictionary d; for (size_t i = 0; i < c.passSeen.size(); i++) if (!std::isnan(c.passSeen[i])) d[(int64_t)i] = c.passSeen[i]; r = d; } break;
		case 34: r = c.misfit; break; case 35: r = c.everKakari; break; case 36: r = c.push(); break; case 37: r = c.hold(); break;
		default: return false;
	}
	return true;
}
void HSNativeCtl::_get_property_list(List<PropertyInfo> *p_list) const {
	for (int i = 0; i < N_CTL_KEYS; i++) p_list->push_back(PropertyInfo(Variant::NIL, CTL_KEYS[i], PROPERTY_HINT_NONE, "", PROPERTY_USAGE_NIL_IS_VARIANT));
}

static const char *SIM_KEYS[] = { "race", "runners", "wIdx", "opts", "geo", "D", "straight", "slope", "paceF", "pace", "st", "events", "frames", "t", "step",
	"finished", "winnerT", "over", "talk", "track", "me", "ctl", "checkAt", "check", "skillFx", "top" };
static const int N_SIM_KEYS = sizeof(SIM_KEYS) / sizeof(SIM_KEYS[0]);

bool HSNativeSim::_get(const StringName &name, Variant &r) const {
	static const std::unordered_map<std::string, int> IX = make_index(SIM_KEYS, N_SIM_KEYS);
	auto it = IX.find(String(name).utf8().get_data());
	if (it == IX.end() || !sim) return false;
	const hs::Sim &s = *sim;
	switch (it->second) {
		case 0: r = s.race; break; case 1: r = s.runners; break; case 2: r = s.wIdx; break; case 3: r = s.opts; break; case 4: r = s.geo; break;
		case 5: r = s.D; break; case 6: r = s.straight; break; case 7: r = s.slope; break; case 8: r = s.paceF; break; case 9: r = s.pace; break;
		case 10: r = stObjs; break; case 11: r = s.events; break; case 12: r = s.frames; break; case 13: r = s.t; break; case 14: r = s.step; break;
		case 15: r = s.finished; break; case 16: r = s.hasWinnerT ? Variant(s.winnerT) : Variant(); break; case 17: r = s.over; break;
		case 18: { Dictionary d; d["lastLeader"] = runner_obj(s.talk.lastLeader); d["straight"] = s.talk.straight; d["mid"] = s.talk.mid; d["corner"] = s.talk.corner;
			d["f400"] = s.talk.f400; d["f200"] = s.talk.f200; r = d; } break;
		case 19: r = trackObj; break; case 20: r = s.me; break; case 21: r = ctlObj; break; case 22: r = s.checkAt; break;
		case 23: if (s.hasCheck) { Dictionary d; d["t"] = s.checkT; d["at"] = s.checkAt; d["verdict"] = s.checkVerdict; d["lead"] = s.checkLead; r = d; } else r = Variant(); break;
		case 24: r = s.skillFx; break; case 25: r = s.top; break;
		default: return false;
	}
	return true;
}
void HSNativeSim::_get_property_list(List<PropertyInfo> *p_list) const {
	for (int i = 0; i < N_SIM_KEYS; i++) p_list->push_back(PropertyInfo(Variant::NIL, SIM_KEYS[i], PROPERTY_HINT_NONE, "", PROPERTY_USAGE_NIL_IS_VARIANT));
}

Ref<HSNativeSim> HSNativeSim::create(const Dictionary &race, const Array &runners, const Variant &w_idx, int64_t rng_state, const Dictionary &opts, double era_speed) {
	Ref<HSNativeSim> o;
	o.instantiate();
	o->sim = hs::sim_create(race, runners, w_idx, (uint32_t)rng_state, opts, era_speed);
	for (size_t i = 0; i < o->sim->st.size(); i++) {
		Ref<HSNativeRunner> r; r.instantiate(); r->owner = o.ptr(); r->idx = (int)i;
		o->stObjs.push_back(r);
	}
	if (o->sim->hasCtl) { Ref<HSNativeCtl> c; c.instantiate(); c->owner = o.ptr(); o->ctlObj = c; }
	Ref<HSNativeTrack> t; t.instantiate(); t->t = o->sim->track;
	if (o->sim->ownTrack) { t->own = true; o->sim->ownTrack = false; }
	o->trackObj = t;
	return o;
}

void hs_cleanup() { hs::track_cache_clear(); hs::skills_clear(); hs::skill_ids_clear(); hs::data_clear(); }

void hs_register_classes() {
	GDREGISTER_CLASS(HSNativeTrack);
	GDREGISTER_CLASS(HSNativeSim);
	GDREGISTER_CLASS(HSNativeRunner);
	GDREGISTER_CLASS(HSNativeCtl);
}
