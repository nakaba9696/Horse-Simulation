// 名馬の固有の能力（持ち主の決定 2026-10-17「伝説級の名馬にだけお願いします。親にすればオリジナルホースに引き継ぎ可能です」）。
// 伝説級＝data/legends.js の tier:'legend' の名馬（js/core/special.js の SP.isTop。グランドフィナーレを勝った馬が、次の年の同じ距離のグランドフィナーレに出ると出てくる）。1頭に1つ。
// 効き目は名鑑（data/profiles*.js）に書いてある史実の勝ち方から決めた（why に根になった史実を書く。人の名前は書かない）。
// at：調べる区間（start・mid・st・any。js/core/skills.js と同じ）。when：場面の型（js/core/skills.js の K.UWHEN）。
// fx：spd＝速さの倍率と秒（free なら脚を使わない）、E＝スタミナの増減、pos＝隊列の目標を前へ（m）、foeE＝ほかの馬のスタミナの増減（foe があればその脚質だけ）
(function(){
const HS = globalThis.HS = globalThis.HS || {}; HS.DATA = HS.DATA || {};
HS.DATA.uniques = [
  { horse:'エクリプス', id:'u_eclipse', label:'影もなし', at:'st', when:'leadStraight', fx:{ spd:0.05, sec:5, free:true, foeE:-0.04 },
    note:'先頭で直線に入ると、後ろの馬はみな追う脚をなくし、自分はもうひと伸びする',
    why:'「エクリプスが1着、ほかは影もない」の言葉が生まれた。18戦18勝のうち8回は相手のいない単走' },
  { horse:'キンチェム', id:'u_kincsem', label:'不敗の女王', at:'st', when:'duelEnd', fx:{ spd:0.05, sec:3, free:true, E:0.04 },
    note:'ゴール前で並ばれても負けない。並ぶと脚が戻って伸びる',
    why:'54戦54勝。バーデン大賞で同着になり、走り直しの決勝で6馬身差をつけた' },
  { horse:'セントサイモン', id:'u_stsimon', label:'二十馬身', at:'st', when:'longStraight', fx:{ spd:0.03, sec:4, free:true, E:0.04 },
    note:'2400m以上のレースで直線に入ると、脚が戻ってぐんぐん離す',
    why:'長い距離のアスコットゴールドカップとグッドウッドカップを、どちらも20馬身差で勝った' },
  { horse:'オーモンド', id:'u_ormonde', label:'首差の意地', at:'st', when:'neck', fx:{ spd:0.06, sec:2.5, free:true },
    note:'ゴール前で並ばれると、意地で前に出る',
    why:'喘鳴症が重くなった4歳でも、ハードウィックステークスで首差に競り勝ち、16戦16勝のまま引退した' },
  { horse:'マンノウォー', id:'u_manowar', label:'ビッグレッド', at:'mid', when:'leadMid', fx:{ E:0.06, top:0.2 },
    note:'中間点を先頭で通ると、脚が残り、終いもさらに伸びる',
    why:'「ビッグレッド」と呼ばれた。ベルモントステークスは20馬身差の世界レコード、ローレンスリアライゼーションステークスは100馬身を超える差' },
  { horse:'ファーラップ', id:'u_pharlap', label:'赤毛の恐怖', at:'mid', when:'heavyOrLate', fx:{ E:0.04 },
    note:'重い斤量（57キロ以上）を背負っても、出遅れても、直線の前に脚が戻る',
    why:'63キロを背負ってメルボルンカップを3馬身差で勝ち、メキシコでは出遅れながらコースレコードで勝った' },
  { horse:'バーラム', id:'u_bahram', label:'九戦九勝', at:'st', when:'front3', fx:{ spd:0.05, sec:4, free:true },
    note:'残り400mで3番手以内にいると、そのまま抜け出す',
    why:'9戦すべてに勝った英国の三冠馬。調整の遅れた秋も、英セントレジャーを5馬身差で勝った' },
  { horse:'ウォーアドミラル', id:'u_waradmiral', label:'提督の逃げ', at:'st', when:'holdLead', fx:{ spd:0.05, sec:3, free:true, E:0.03 },
    note:'先頭でゴール前、2番手に1馬身以内まで詰め寄られても、抑えきる',
    why:'ケンタッキーダービーを逃げ切り、プリークネスステークスは内から迫った馬を頭差で抑えた' },
  { horse:'ネアルコ', id:'u_nearco', label:'好位から一閃', at:'st', when:'posBreak', fx:{ spd:0.05, sec:4, free:true },
    note:'2〜4番手で直線に入ると、鋭く抜け出す',
    why:'14戦14勝。最後のパリ大賞典（3000m）は好位から直線で抜け出して1馬身半差' },
  { horse:'カウントフリート', id:'u_countfleet', label:'二十五馬身', at:'st', when:'bigLead', fx:{ spd:0.07, sec:5, free:true },
    note:'直線で先頭に立ち、2番手を2馬身以上離していれば、さらに突き放す',
    why:'ベルモントステークスを25馬身差で勝った。のちに破られるまでレース史上最大の着差' },
  { horse:'サイテーション', id:'u_citation', label:'十六連勝', at:'st', when:'nearLead', fx:{ spd:0.045, sec:4, free:true, E:0.04 },
    note:'残り400mで先頭から1馬身以内にいると、脚が戻って伸びる',
    why:'三冠の年の終わりまでに15連勝し、のちに16連勝まで伸ばした。6歳でもハリウッドゴールドカップを勝った' },
  { horse:'ザテトラーク', id:'u_tetrarch', label:'まだらの快速', at:'start', when:'start', fx:{ spd:0.07, sec:4, free:true, pos:3 },
    note:'ゲートを出ると、すぐに他馬を引き離す',
    why:'デビュー戦はスタートから他馬を引き離して勝ち、コヴェントリーステークスは10馬身差。白い斑点のまだら模様の芦毛' },
  { horse:'ドミノ', id:'u_domino', label:'六ハロンの王', at:'st', when:'sprint', fx:{ spd:0.07, sec:4, free:true },
    note:'1400m以下のレースで、3番手以内で直線に入ると、もうひと伸び',
    why:'6ハロン前後の競走ではほとんど負けなかった。2歳時は9戦無敗で、メイトロンステークスは国内レコード' },
];
})();
