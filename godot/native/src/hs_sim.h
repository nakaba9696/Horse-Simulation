// レースの模擬（godot/core/hs_sim.gd・js/core/racesim.js と同じ）。0.1 秒刻み。同じ種・同じ操作なら JS と毎刻み同じ値になる。
// 模擬の中（step）は C++ の値だけで回し、Godot の値（Variant）を触るのは作るとき・実況・結果をまとめるときだけ
#pragma once
#include <vector>
#include <string>
#include <cstdint>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/array.hpp>
#include <godot_cpp/variant/string.hpp>
#include <godot_cpp/variant/variant.hpp>
#include "hs_rng.h"
#include "hs_track.h"

namespace hs {

// 特殊能力の id（文字）を番号にする。番号は作るときに決まり、模擬の間は読むだけ
int skill_id(const godot::String &s);
const godot::String &skill_name(int id);
enum : int { SK_SPURT = 0 }; // 0 番は仕掛けの合図 "spurt"

struct IdSet {
	uint64_t m[2] = { 0, 0 };
	std::vector<int> order; // 入れた順（GDScript の辞書の並び）
	bool has(int id) const { return id >= 0 && id < 128 && (m[id >> 6] >> (id & 63)) & 1; }
	void add(int id) { if (id < 0 || id >= 128 || has(id)) return; m[id >> 6] |= 1ULL << (id & 63); order.push_back(id); }
};

struct Boost { bool on = false; double mul = 1, until = 0; int id = -1; bool free_ = false; };
struct SkState { double boxedFor = 0, soloFor = 0, duelFor = 0, banteFor = 0, wallFor = 0; bool led600 = false; int rankMid = -1; bool whipBefore = false, ikki = false, kakari = false; };

// 脚質（-1＝そのほか）
enum Style : int { ST_NIGE = 0, ST_SENKO = 1, ST_SASHI = 2, ST_OIKOMI = 3, ST_NONE = -1 };

struct Runner {
	godot::Dictionary r, h;
	int i = 0;
	double A = 0, vc = 0, Ds = 0, kickS = 0, spurtR = 0, guts = 0, mind = 0, slopeP = 0;
	double x = 0, v = 0, E = 1, delay = 0;
	bool late = false, kakariDay = false;
	double acc = 0, zubu = 0, spurtCost = 0;
	bool oonige = false, sora = false, sunaB = false, jiyu = false;
	bool tsuiso = false, sotoM = false, sabaki = false; // 追走○・外回し○・馬群さばき（skills_flags）
	double weightV = 0; // 斤量（無ければ 0）
	double gapAdj = 0, driftLane = 0;
	bool me = false;
	IdSet fired;
	Boost boost;
	std::vector<int> trig;
	SkState sk;
	std::vector<int> passive;
	bool passiveShown = false;
	double lane = 0, laneT = 0;
	bool spurting = false, done = false;
	bool hasFinishT = false; double finishT = 0;
	bool hasT600 = false; double t600 = 0;
	double blocked = 0; bool blockedOnce = false;
	double styleMult = 1, gap = 0; int jiyuMove = 0;
	double fight = 0; int duel = -1; double fightPeak = 0;
	bool held = false; // 前の馬に追いついて、その馬の速さに合わせている（当たり判定。AI の馬）
	double kakari = 0, ears = 0.4;
	bool hasRk = false; double rk = 0;
	bool easyStart = false;
	double topAdd = 0, sunaT = 0;
	// 馬のデータから読んでおくもの
	godot::String name;
	int style = ST_NONE;
	bool ownerP = false, hist = false;
	IdSet skills; // 馬の特殊能力（HSHorse.has）
	double jockSkill = 70; // 騎手の腕（騎手がいなければ 70）
	bool trigHas(int id) const { for (int t : trig) if (t == id) return true; return false; }
};

struct Ctl {
	double tension = 0;
	bool started = false, fumble = false;
	double gear = 0;
	bool handR = true;
	double swapUntil = -1, lastPush = -9, lastPull = -9;
	int pushes = 0, whips = 0;
	double whipUntil = -1;
	bool windmill = false;
	double lane = 0;
	bool blockedNow = false, wide = false, kakariNow = false, behind = false;
	double surge = 0, shrink = 0, pullT = 0;
	bool reinFight = false;
	bool hasBumpT = false; double bumpT = 0; double bumpSide = 0;
	godot::Variant bond;
	double bondF = 1;
	bool hasSpurtTension = false; double spurtTension = 0;
	bool hasLastEv = false; double lastEvT = 0; godot::String lastEv;
	int startGood = -1; // -1＝null
	std::vector<double> taps, whipT;
	bool hasLastWhip = false; double lwT = 0, lwAway = 0; bool lwR = true, lwYore = false;
	double laneT = 0, driftT = 0;
	double evWall = -99, evSand = -99, evCover = -99; bool evWallSet = false, evSandSet = false, evCoverSet = false;
	std::vector<double> passSeen; // 馬ごと（NaN＝まだ）
	bool misfit = false, everKakari = false;
	bool steered = false;          // 進路を自分で動かした
	int beats = 0; double lastBeat = -9; // 拍子の合ったしごきの続いた数・最後の時刻
	double push() const { return mx(0.0, gear); }
	bool hold() const { return gear < -0.05; }
};

struct Sim {
	godot::Dictionary race, opts, geo;
	godot::Array runners;
	godot::Variant wIdx;
	Rng rng;
	bool optFrames = false, optRide = false;
	double D = 0, straight = 0;
	godot::Variant slope;
	bool slopeFlat = false; double slopeV = 0, slopeE = 0; // 坂（"平" なら坂なし。そのほかは急・中・小の値。知らない名前は 0）
	double paceF = 1, pace = 0;
	std::vector<Runner> st;
	godot::Array events, frames, skillFx;
	double t = 0;
	int step = 0, finished = 0;
	bool hasWinnerT = false; double winnerT = 0;
	bool over = false;
	struct Talk { int lastLeader = -1; bool straight = false, mid = false, corner = false, f400 = false, f200 = false; } talk;
	Track *track = nullptr; bool ownTrack = false;
	godot::Variant trackDir, trackLayout;
	bool dirLeft = false; // dir_of（コースの向きが左か）
	int me = -1;
	bool hasCtl = false;
	Ctl ctl;
	std::vector<int> byX;
	double checkAt = 0;
	bool hasCheck = false; double checkT = 0; godot::String checkVerdict; int checkLead = -1;
	double top = 0;
	double gateWait = 0; // ゲートで待つ秒（レースの種から）
	// ラップ（JS の sim.marks・sim.splits・sim.lapN）：200m ごとの区切りと、先頭が過ぎた時刻
	std::vector<double> marks, splits; std::vector<bool> hasSplit; int lapN = 0;
	~Sim() { if (ownTrack) delete track; }
};

// 呼び方は GDScript の HSSim と同じ（data は HSData.d() の courses・layouts と特殊能力の名前）
struct SimData { godot::Dictionary courses, layouts, labels; godot::Array uniques; };
void set_data(const SimData &d);
const SimData &data();
void data_clear();
void skill_ids_clear();

Sim *sim_create(const godot::Dictionary &race, const godot::Array &runners, const godot::Variant &w_idx, uint32_t rng_state, const godot::Dictionary &opts, double era_speed);
bool sim_step(Sim &sim);
godot::Dictionary sim_finish(Sim &sim);
godot::Variant ctl_up(Sim &sim, const godot::Variant &at = godot::Variant());
godot::Variant ctl_down(Sim &sim);
godot::Variant ctl_whip(Sim &sim, const godot::Variant &side);
godot::Variant ctl_swap(Sim &sim);
godot::Variant ctl_lane(Sim &sim, double d);
void ctl_hold(Sim &sim, bool on);
void fire(Sim &sim, Runner &s, int id);
double whip_eff(const Ctl &c);
// 馬場の状態（HSSim.mud_m・ground_fx と同じ）
struct GroundFx { double e, k, m; };
double mud_m(double heavy);
GroundFx ground_fx(const godot::Dictionary &horse, const godot::Dictionary &race);
// 1頭の強さ（HSSim.power と同じ）
godot::Dictionary power(const godot::Dictionary &horse, const godot::Dictionary &race, const godot::Variant &w_idx, const godot::Dictionary &ctx);

// 特殊能力（hs_skills.cpp）
std::vector<int> skills_of(const godot::Dictionary &h, const godot::Variant &w_idx);
void skills_setup(Sim &sim);
void skills_flags(Runner &s);
void skills_init();
void skills_clear();
void skills_step(Sim &sim, const std::vector<int> &order, double DT);
godot::String skill_label(int id);

// 馬（hs_horse の模擬に要る所）
struct Stats7 { double spd, sta, dspd, dsta, guts, mind, slope; };
Stats7 horse_cur(const godot::Dictionary &horse, double w_idx);
bool horse_has(const godot::Dictionary &h, const char *id);

} // namespace hs
