# 特殊能力の条件・効果の確認表

対象 c54596b。JSの定義・判定関数をそのまま抽出し、馬の性質の実効果は racesim.js の使用箇所を確認。Godotの対応箇所も静的に照合した。全能力の動的同等性試験を新たに行ったという意味ではない。

## 読み方

- 通常の性質25種、発動系26種、固有50種を確認。数は下の実測を参照。
- `R`は残距離、`D`は競走距離、`rank`は1始まりの順位、`n`は頭数、`E`は正規化した残スタミナ、`LEN=2.4m`。
- `learn`は習得候補になる条件、`when`はレース中の発動条件。候補すべてを持つわけではない。
- `at=start`は発走後4秒、`mid`は直線前、`st`は残距離が直線長+30m以下、`any`は区間を問わない。`st`でも個別whenがinStraightを要求する場合がある。
- 自動習得は爆発→損→速さ→気性→根性の順に各系統から取る。capは(spd+sta+guts)/3の65/78/90の境界で1/2/3/4。spd/staは芝ダの高い側を使い、レース時は成長後の現在値。CSVはピークの候補一覧。
- 固有は通常枠と別枠。trigFixedがある馬はその指定を優先する。
- 通常の単発発動は各idにつき1レース1回。一気系3種は合計1回で、速度効果はclamp(0.4+2×E,0.6,1.6)倍。
- `fx.spd=0.05`は速度ブースト1.05倍、secは秒、E=0.05は残スタミナを0.05加算（5%乗算ではない）。topは終いの伸び上限への加算。freeはブースト中に余分な脚を使わない扱い。
- 同時発動の速度ブーストは足し算されず、`K.apply`で後のものが `s.boost` を上書きする。E・top・pos等は別処理。技能の数だけ効果を足して馬を評価しない。
- `cont`の追走○・外回し○はwhenがfalseでも実装済み。racesim.jsの継続判定で効く。馬群さばきも移動・ブロック軽減の常時フラグが別にある。

## 馬の性質

| ID | 名前 | 実際の条件・効果 |
|---|---|---|
| big | 大舞台 | G1でレースの力 +2 |
| fresh | 鉄砲駆け | 前走から10週以上で力 +2（通常の12週以上の休み明け減点は別） |
| tataki | 叩き良化 | 前走から10週以上で力 −2、それ未満で +1.2（前走なしは0） |
| left | 左回り○ | 左回りで力 +1.8 |
| right | 右回り○ | 右回りで力 +1.8 |
| small | 小回り○ | 直線330m未満で力 +1.8 |
| long | 直線巧者 | 直線450m以上で力 +1.8 |
| summer | 夏馬 | 6〜8月で力 +1.8 |
| winter | 冬馬 | 12〜2月で力 +1.8 |
| hipace | ハイペース○ | paceF > 1.006 で力 +1.8 |
| slowpace | スローペース○ | 0 < paceF < 0.994 で力 +1.8 |
| oonige | 大逃げ | 逃げ脚質で有効。AIの出だし・道中目標速度 ×1.02、終いの kick 係数 ×0.5。プレイヤー操作との違いに注意 |
| longspurt | ロングスパート | AI仕掛けの基準を50m早め、バテた後の粘り係数 +0.002 |
| jiyu | 脚質自在 | スローなら1つ前・ハイなら1つ後ろの脚質へ隊列目標を50%寄せる。騎乗時の位置不一致の負担 ×0.35。仕掛けは元の脚質 |
| inner | 内枠○ | 馬番1〜4で力 +1.2（枠番の内側判定ではない） |
| outer | 外枠○ | 7・8枠で力 +1.2 |
| mud | 道悪○ | 重・不良で力 +2。fromHistoric は道悪○ありならheavy90を初期値にする（個別heavyで上書き可） |
| travel | 海外○ | 海外レースで力 +2 |
| homebody | 海外× | 海外レースで力 −3 |
| deokure | 出遅れ癖 | fromHistoricで気性 −14（掛かり癖と併用でも一度、個別気性は除外）、スタートの出遅れ確率 +0.14 |
| kakari | 掛かり癖 | 同じ気性 −14条件、掛かり日の抽選確率 +0.25、騎乗時の手綱を引く反応にも影響 |
| sora | ソラ癖 | AIが脚を使って追い出し中、残り200m未満・先頭・後続に2m超で目標速度 ×0.985 |
| sunaB | 砂かぶり× | ダートで前方4m内の同進路馬の砂をかぶると、追い出し前の消耗 ×1.08。騎乗時の気分の反応も悪化 |
| leftB | 左回り× | 左回りで力 −1.5 |
| rightB | 右回り× | 右回りで力 −1.5 |

## 発動する特殊能力

| ID・名前 | 習得候補の条件（コード） | 発動条件（コード） | 効果 |
|---|---|---|---|
| saikoubi 豪脚 | p => p.style === '追込' && p.kire >= 6 | x => x.R <= 500 && x.R > 100 && x.rank >= x.n - 2 && (x.c ? x.whipping : x.s.spurting) | 残り500mから、最後方近くでムチを入れると大きく伸びる（直線の長さに関係なく、残りの距離で決まる） / {"spd":0.07,"sec":4,"free":true,"top":0.3} |
| chokusen 直線一気 | p => SASHI.includes(p.style) && p.kire >= 6 | x => x.inStraight && x.R > 100 && x.rank > x.n / 2 && x.whipping | 直線で中団より後ろからムチを入れると伸びる / {"spd":0.05,"sec":4,"free":true,"top":0.2} |
| oosoto 大外一気 | p => SASHI.includes(p.style) && p.slope >= 82 | x => x.inStraight && x.R > 100 && x.s.lane >= 5 && x.whipping | 直線で外に持ち出してムチを入れると伸びる / {"spd":0.045,"sec":4,"free":true,"top":0.2} |
| sasari ささり癖 | p => p.mind < 64 && p.guts < 76 | x => x.c ? x.c.lastWhip && x.t - x.c.lastWhip.t < 0.15 && x.s.E < 0.12 : x.whipping && x.s.E < 0.15 | 脚が無いときにムチを入れると、ささって伸びを欠く（進路は変わらない） / {"spd":-0.035,"sec":1.5} |
| kongomi 馬込み× | p => p.mind < 70 && (p.style === '逃げ' \|\| p.style === '追込') | x => x.sk.boxedFor >= 3 | 馬群に包まれたままだと、やる気をなくす / {"E":-0.03} |
| bante 番手× | p => p.style === '逃げ' && p.mind < 72 | x => x.sk.banteFor >= 10 | 逃げられず、2番手より後ろで道中を運ぶと、やる気をなくす / {"E":-0.03} |
| sessenB 叩き合い× | p => p.guts < 70 | x => x.R < 100 && x.close | ゴール前で並ばれると、ひるむ / {"spd":-0.015,"sec":1.5} |
| isshun 切れ味 | p => p.style !== '逃げ' && p.kire >= 6 && p.spd >= 85 | x => x.R <= 150 && x.rank >= 2 && (x.whipping \|\| x.s.spurting) | 残り150mで2番手以下なら、ひと伸び / {"spd":0.06,"sec":2.5,"free":true} |
| hanno 抜群の反応 | p => p.kire >= 7 \|\| (p.kire >= 6 && p.mind >= 82) | x => x.inStraight && x.straight - x.R < 100 && x.whipping && !x.sk.whipBefore | 直線までムチを使わず、直線に入ってすぐムチを入れると一気に伸びる / {"spd":0.045,"sec":3,"free":true} |
| startdash ロケットスタート | p => p.mind >= 82 && (p.style === '逃げ' \|\| p.style === '先行') | x => x.t - x.s.delay < 0.6 && x.s.delay < 0.25 && !x.s.late | うまく出ると、すっと前へ行く / {"spd":0.06,"sec":3,"pos":2,"free":true} |
| nebari 二の脚 | p => (p.style === '逃げ' \|\| p.style === '先行') && p.sta >= 85 | x => x.R <= 300 && x.sk.led600 && x.rank <= 3 && x.leader.x - x.s.x < LEN | 残り600mで先頭にいた馬が、残り300mからつかまりかけると、もうひと踏ん張り / {"spd":0.05,"sec":3.5,"free":true} |
| nidan 二段ロケット | p => p.style === '逃げ' && p.spd >= 80 | x => x.inStraight && x.straight - x.R < 30 && x.rank === 1 && x.second && x.s.x - x.second.x >= LEN | 先頭で直線に入り、2番手を1馬身以上離していれば、もうひと伸び / {"spd":0.08,"sec":4,"free":true} |
| sabaki 馬群さばき | p => p.style === '追込' && p.spd < 85 && p.mind >= 70 | x => x.inStraight && x.R > 100 && x.sk.wallFor >= 0.6 && !x.wall | 直線で前が壁になっても、すぐ進路を見つけて伸びる。横の馬に止められにくい / {"spd":0.03,"sec":2.5,"free":true} |
| genwaku 幻惑逃げ | p => p.style === '逃げ' && p.mind >= 84 | x => !!x.sim.check && x.sim.check.lead === x.s.i && x.sim.check.verdict === 'スローペース' | ペースのチェックポイントを先頭で通り、スローなら、後ろの差し・追込の馬が脚を使わされる / {"foeE":-0.05,"foe":["差し","追込"]} |
| ikiire 息入れ○ | p => p.style === '逃げ' && p.sta >= 84 && p.mind < 84 | x => !x.inStraight && x.R <= x.straight + 350 && x.rank === 1 | 3〜4コーナーを先頭で回ると、ひと息入って脚が戻る / {"E":0.05} |
| tanki 単騎逃げ | p => p.style === '逃げ' && p.mind >= 65 | x => !x.inStraight && x.sk.soloFor >= 10 | 後ろを2馬身以上離して逃げると、気分よく走る / {"E":0.06} |
| kouhou 後方待機○ | p => p.style === '追込' && p.mind >= 76 | x => x.s.x >= x.D / 2 && x.sk.rankMid != null && x.sk.rankMid >= x.n - 2 && !x.sk.kakari && !(x.c && x.c.everKakari) | 中間点まで後ろから3頭以内で、掛からずに運ぶと、脚が戻る / {"E":0.025} |
| yonkaku 四角先頭 | p => (p.style === '先行' \|\| p.style === '差し') && p.spd >= 86 && p.kire <= 4 | x => x.inStraight && x.straight - x.R < 30 && x.rank === 1 | 先頭で直線に入ると、脚が戻る / {"E":0.05} |
| oriai 折り合い上手 | p => p.mind >= 85 | x => x.D >= 1600 && x.s.x >= x.D / 2 && !x.sk.kakari && !(x.c && x.c.everKakari) | 中間点まで一度も掛からなければ、脚が残る / {"E":0.02} |
| nimai 差し返し | p => p.style === '逃げ' && p.guts >= 82 | x => x.R < 300 && x.rank === 1 && x.second && x.s.x - x.second.x < LEN | 先頭でゴール前、2番手に詰め寄られると、もう一度伸びる / {"E":0.05,"spd":0.025,"sec":2,"free":true} |
| demuchi 出ムチ○ | p => (p.style === '逃げ' \|\| p.style === '先行') && p.guts >= 86 | x => x.t - x.s.delay < 3 && (x.c ? x.c.whips > 0 : true) | スタート直後にムチを入れると、前へ行ける / {"spd":0.05,"sec":2.5,"pos":1.5,"free":true} |
| makuri 大まくり | p => SASHI.includes(p.style) && p.kire <= 4 && p.sta >= 78 | x => x.inStraight && x.straight - x.R < 30 && x.sk.rankMid != null && x.sk.rankMid > x.n / 2 && x.sk.rankMid - x.rank >= 6 && x.leader.x - x.s.x < LEN | 中間点で後ろ半分にいた馬が、6頭以上抜いて先頭から1馬身以内で直線に入ると、脚が戻ってひと伸び / {"E":0.1,"spd":0.04,"sec":4,"free":true} |
| tsuiso 追走○ | p => p.style === '追込' && p.guts >= 82 | () => false | 直線の前、すぐ前に馬がいる間は、脚の減りが少ない / {} / 継続フラグ。下記参照 |
| sotomawashi 外回し○ | p => p.style === '追込' && p.sta >= 76 && p.guts < 82 | () => false | コーナーで外を回っても、余分に脚を使わない / {} / 継続フラグ。下記参照 |
| dokonjo ど根性 | p => p.guts >= 88 | x => x.sk.duelFor >= 3 | 追い出してから3秒叩き合うと、脚が戻る / {"E":0.02} |
| sessen 叩き合い | p => p.guts >= 86 | x => x.R < 100 && x.close | ゴール前で並ぶと、ひと伸び / {"spd":0.03,"sec":2.5,"free":true} |

追走○：追い出し前・距離8%超・直線前で、前方4m内かつ進路差0.8未満の馬がいる間、消耗×0.95。外回し○：追い出し中の最終付近のコーナーで消耗×0.96、騎乗時の外回りによる距離損を免除。AIの前壁停止をゼロにする副次効果もある。馬群さばき：騎乗時横速度×1.6・衝突判定の幅とAI前壁停止×0.4など。

## 固有の特殊能力

共通の区間判定も適用される。ここでは原文のwhyを史実確認済みとみなさず、その設定理由として掲載する。

| 馬・ID | 発動区間 | 発動条件 | 効果 | 設定理由（原文） |
|---|---|---|---|---|
| エクリプス / u_eclipse エクリプス・ファースト | st | x => x.inStraight && x.straight - x.R < 30 && x.rank === 1 | {"spd":0.05,"sec":5,"free":true,"foeE":-0.04} | 「エクリプスが1着、ほかは影もない」の言葉が生まれた。18戦18勝のうち8回は相手のいない単走 |
| キンチェム / u_kincsem ハンガリーの奇跡 | st | x => x.R < 300 && x.close | {"spd":0.05,"sec":3,"free":true,"E":0.04} | 54戦54勝。バーデン大賞で同着になり、走り直しの決勝で6馬身差をつけた |
| セントサイモン / u_stsimon 煮えたぎる蒸気機関車 | st | x => x.D >= 2400 && x.inStraight && x.straight - x.R < 30 | {"spd":0.03,"sec":4,"free":true,"E":0.04} | 長い距離のアスコットゴールドカップとグッドウッドカップを、どちらも20馬身差で勝った |
| オーモンド / u_ormonde 英国の至宝 | st | x => x.R < 100 && x.close | {"spd":0.06,"sec":2.5,"free":true} | 喘鳴症が重くなった4歳でも、ハードウィックステークスで首差に競り勝ち、16戦16勝のまま引退した |
| マンノウォー / u_manowar ビッグレッド | mid | x => !x.inStraight && x.s.x >= x.D / 2 && x.rank === 1 | {"E":0.06,"top":0.2} | 「ビッグレッド」と呼ばれた。ベルモントステークスは20馬身差の世界レコード、ローレンスリアライゼーションステークスは100馬身を超える差 |
| ファーラップ / u_pharlap レッドテラー | mid | x => !x.inStraight && x.R <= x.straight + 400 && (x.s.late \|\| (x.s.r.weight \|\| 0) >= 57) | {"E":0.04} | 63キロを背負ってメルボルンカップを3馬身差で勝ち、メキシコでは出遅れながらコースレコードで勝った |
| ウォーアドミラル / u_waradmiral 力強き原子 | st | x => x.R < 300 && x.rank === 1 && x.second && x.s.x - x.second.x < LEN | {"spd":0.05,"sec":3,"free":true,"E":0.03} | ケンタッキーダービーを逃げ切り、プリークネスステークスは内から迫った馬を頭差で抑えた |
| ネアルコ / u_nearco イタリアの至宝 | st | x => x.inStraight && x.straight - x.R < 30 && x.rank >= 2 && x.rank <= 4 | {"spd":0.05,"sec":4,"free":true} | 14戦14勝。最後のパリ大賞典（3000m）は好位から直線で抜け出して1馬身半差 |
| カウントフリート / u_countfleet 疾風の伯爵 | st | x => x.inStraight && x.rank === 1 && x.second && x.s.x - x.second.x >= 2 * LEN | {"spd":0.07,"sec":5,"free":true} | ベルモントステークスを25馬身差で勝った。のちに破られるまでレース史上最大の着差 |
| ザテトラーク / u_tetrarch 白斑の稲妻 | start | x => x.t - x.s.delay < 0.6 && !x.s.late | {"spd":0.07,"sec":4,"free":true,"pos":3} | デビュー戦はスタートから他馬を引き離して勝ち、コヴェントリーステークスは10馬身差。白い斑点のまだら模様の芦毛 |
| ドミノ / u_domino 黒い旋風 | st | x => x.D <= 1400 && x.inStraight && x.straight - x.R < 30 && x.rank <= 3 | {"spd":0.07,"sec":4,"free":true} | 6ハロン前後の競走ではほとんど負けなかった。2歳時は9戦無敗で、メイトロンステークスは国内レコード |
| ブリガディアジェラード / u_brigadier 常勝准将 | st | x => x.D >= 1400 && x.D <= 2000 && x.inStraight && x.R <= 400 && x.R > 100 && x.rank >= 2 && x.rank <= 6 | {"spd":0.05,"sec":4,"free":true} | 18戦17勝。3歳は主にマイルを走り、英2000ギニーをのちの凱旋門賞馬に3馬身差、サセックスSやクイーンエリザベス2世Sも勝った |
| ミルリーフ / u_millreef 小さな巨人 | st | x => x.inStraight && x.straight - x.R < 30 && x.rank >= 2 && x.rank <= 4 | {"spd":0.05,"sec":4,"free":true,"E":0.03} | 凱旋門賞を2400mのコースレコードで勝ち、エクリプスSも10ハロンのコースレコード。英2000ギニーの2着のあとは負けなかった |
| フランケル / u_frankel 英国の怪物 | st | x => x.R <= 400 && x.rank === 1 && x.sk.led600 | {"spd":0.05,"sec":4,"free":true,"E":0.03} | 14戦14勝。英2000ギニーはスタートから先頭に立って押し切り、2着に6馬身差をつけた |
| ダンシングブレーヴ / u_dancingbrave 勇敢なる踊り手 | st | x => x.inStraight && x.R > 100 && x.rank > x.n / 2 && x.s.lane >= 3 | {"spd":0.08,"sec":5,"free":true,"top":0.3,"E":0.03} | 15頭のうち11頭がG1の勝ち馬という凱旋門賞を、後方から大外を伸びてコースレコードで勝った |
| アーモンドアイ / u_almondeye 府中の女神 | st | x => x.inStraight && x.R <= 400 && x.R > 100 && x.rank >= 2 && x.leader.x - x.s.x < 3 * LEN | {"spd":0.05,"sec":3,"free":true} | ジャパンカップで逃げた馬をとらえ、2分20秒6の世界レコードで勝った。芝のG1を9勝した |
| イクイノックス / u_equinox 蒼き天才 | st | x => x.R <= 400 && x.rank <= 3 | {"spd":0.05,"sec":4,"free":true} | 天皇賞（秋）を1分55秒2のレコードで連覇し、ジャパンカップを4馬身差で勝ってG1を6連勝した |
| ウィンクス / u_winx 豪州の女王 | st | x => x.inStraight && x.R <= 400 && x.R > 100 && x.rank > x.n / 2 | {"spd":0.06,"sec":4,"free":true,"top":0.2} | 33連勝し、コックスプレートを4連覇した。G1は25勝で、世界の歴代最多とされる |
| エネイブル / u_enable 欧州の女王 | st | x => x.R < 300 && x.close | {"spd":0.05,"sec":3,"free":true} | キングジョージで直線に並んで競り合い、クビ差で勝った。このレースを初めて3勝した馬になった |
| オルフェーヴル / u_orfevre 金色の暴君 | mid | x => !x.inStraight && x.R <= x.straight + 400 && x.rank > x.n / 2 | {"E":0.05} | 激しい気性で「金色の暴君」と呼ばれた。阪神大賞典で外へ逃げて大きく下がりながら、半馬身差の2着まで追い上げた。三冠馬で、引退レースの有馬記念は8馬身差 |
| ゴールデンシックスティ / u_goldensixty 黄金のマイラー | st | x => x.inStraight && x.R <= 400 && x.R > 100 && x.rank >= 2 && x.leader.x - x.s.x < 3 * LEN | {"spd":0.05,"sec":3,"free":true} | 16連勝し、香港マイルを3勝、チャンピオンズマイルを3連覇した |
| ゴルディコヴァ / u_goldikova 欧州マイルの女王 | st | x => x.D >= 1400 && x.D <= 2000 && x.inStraight && x.R <= 400 && x.R > 100 && x.rank >= 2 && x.rank <= 6 | {"spd":0.05,"sec":4,"free":true} | ブリーダーズカップマイルを初めて3連覇した。ジャックルマロワ賞は6馬身差のレースレコード。G1は14勝 |
| シンザン / u_shinzan ナタの切れ味 | st | x => x.R <= 200 && x.rank >= 2 && x.rank <= 3 | {"spd":0.05,"sec":3,"free":true} | 19戦すべてで連対を外さず、八大競走を5つ勝って「五冠馬」と呼ばれた |
| シンボリルドルフ / u_rudolf 絶対皇帝 | st | x => x.R <= 400 && x.rank <= 3 | {"spd":0.04,"sec":4,"free":true,"E":0.03} | 史上初めて無敗で三冠を果たし、G1を7勝して「皇帝」「七冠馬」と呼ばれた |
| ディープインパクト / u_deepimpact 衝撃の飛翔 | st | x => x.inStraight && x.R > 100 && x.rank >= x.n - 2 | {"spd":0.08,"sec":5,"free":true,"top":0.3,"E":0.03} | 若駒ステークスで最後方から一気に追い込んで圧勝した。無敗の三冠馬で、天皇賞（春）は3分13秒4の世界レコード |
| テイエムオペラオー / u_operao 世紀末覇王 | st | x => x.inStraight && x.R > 100 && x.sk.wallFor >= 0.6 && !x.wall | {"spd":0.05,"sec":3,"free":true} | 「世紀末覇王」と呼ばれた。2000年は8戦8勝で、有馬記念では周りを囲まれ、直線でもなかなか前が開かなかったが、最後にハナ差とらえた |
| トレヴ / u_treve ロンシャンの女王 | st | x => x.inStraight && x.R <= 400 && x.R > 100 && x.rank > x.n / 2 | {"spd":0.08,"sec":5,"free":true,"top":0.2} | 無敗で凱旋門賞に出て5馬身差で勝ち、勝てなかった翌年も凱旋門賞では2馬身差で勝って連覇した |
| ニジンスキー / u_nijinsky 舞神 | st | x => x.inStraight && x.R <= 400 && x.R > 100 && x.rank >= 2 && x.leader.x - x.s.x < 3 * LEN | {"spd":0.06,"sec":3,"free":true} | 英ダービーは直線まで追い出しを待って差し切った。英セントレジャーも勝ち、35年ぶりの英国三冠馬になった |
| ミエスク / u_miesque 稀代の名牝 | st | x => x.D >= 1400 && x.D <= 2000 && x.inStraight && x.R <= 400 && x.R > 100 && x.rank >= 2 && x.rank <= 6 | {"spd":0.05,"sec":4,"free":true} | ブリーダーズカップマイルを初めて連覇した。ジャックルマロワ賞とムーランドロンシャン賞で牡馬を退けた |
| シーバード / u_seabird 伝説の海鳥 | st | x => x.inStraight && x.R > 100 && x.R < 400 && x.close | {"spd":0.06,"sec":4,"free":true} | 凱旋門賞で各国の強豪と競り合い、そこから一気に引き離して6馬身差で勝った。英ダービーは手綱を持ったまま抜け出した |
| スペクタキュラービッド / u_specbid 砂の韋駄天 | mid | x => !x.inStraight && x.R <= x.straight + 400 && (x.s.late \|\| (x.s.r.weight \|\| 0) >= 57) | {"E":0.04} | 130ポンドを背負ったサンタアニタハンデキャップを5馬身差で勝った。ストラブステークスの1.25マイル1分57秒8はダートの世界レコード |
| セクレタリアト / u_secretariat 神速の赤馬 | st | x => x.inStraight && x.straight - x.R < 30 && x.rank === 1 | {"spd":0.06,"sec":5,"free":true,"E":0.04} | ベルモントステークスで31馬身差をつけた。2分24秒0はダートの世界記録として今も破られていない |
| プリティーポリー / u_prettypolly 天下無双 | st | x => x.R <= 400 && x.rank >= 2 && x.leader.x - x.s.x < LEN | {"spd":0.045,"sec":4,"free":true,"E":0.04} | 「天下無双のポリー（Peerless Polly）」と呼ばれた。デビューから15連勝し、24戦22勝。1000ギニー・オークス・セントレジャーの牝馬三冠を取った |
| ラフィアン / u_ruffian 世紀の女王 | mid | x => !x.inStraight && x.s.x >= x.D / 2 && x.rank === 1 | {"E":0.05} | デビューから10連勝した。走ったレースではどれも最初から最後まで先頭を譲らなかった |
| アバーナント / u_abernant 灰色の閃光 | st | x => x.D <= 1400 && x.inStraight && x.straight - x.R < 30 && x.rank <= 3 | {"spd":0.06,"sec":4,"free":true} | 英国の芦毛の短距離馬。ジュライカップとナンソープステークスを2年続けて勝ち、17戦14勝 |
| サイテーション / u_citation 100万ドルホース | st | x => x.R <= 400 && x.rank >= 2 && x.leader.x - x.s.x < LEN | {"spd":0.045,"sec":4,"free":true,"E":0.04} | 三冠の年の終わりまでに15連勝し、のちに16連勝まで伸ばした。6歳でハリウッドゴールドカップを勝ち、史上初めて獲得賞金が100万ドルを超えた |
| マニカト / u_manikato 豪州の短距離王 | st | x => x.D <= 1400 && x.inStraight && x.straight - x.R < 30 && x.rank <= 3 | {"spd":0.06,"sec":4,"free":true} | 豪州の短距離のセン馬。ウィリアムリードステークスを5連覇し、3つのレースをレコードで勝った |
| ケルソ / u_kelso 不屈の鉄人 | mid | x => !x.inStraight && x.R <= x.straight + 400 && (x.s.late \|\| (x.s.r.weight \|\| 0) >= 57) | {"E":0.04} | ジョッキークラブゴールドカップを5連覇し、5年続けて年度代表馬になった。重い斤量のハンデ戦でも勝ち続けた |
| ドクターフェイガー / u_drfager 最速の逃亡者 | st | x => x.R <= 400 && x.rank === 1 && x.sk.led600 | {"spd":0.05,"sec":4,"free":true,"E":0.03} | 先手を取ってそのまま押し切る競馬を得意とした。134ポンドでダートの1マイルを1分32秒2で走る世界レコード |
| ネイティヴダンサー / u_nativedancer グレイゴースト | st | x => x.R < 100 && x.close | {"spd":0.06,"sec":2.5,"free":true} | 「グレイゴースト」と呼ばれた芦毛。22戦21勝で、プリークネスステークスとベルモントステークスをどちらもクビ差で勝った |
| フォアゴー / u_forego 最強の巨人 | st | x => x.inStraight && x.R <= 400 && x.R > 100 && x.rank > x.n / 2 | {"spd":0.08,"sec":5,"free":true,"top":0.3} | 137ポンドを課されたマールボロカップで、向正面の8番手から直線で追い込み、ゴール前でとらえた |
| トキノミノル / u_tokinominoru 幻の馬 | mid | x => !x.inStraight && x.s.x >= x.D / 2 && x.rank === 1 | {"E":0.06,"top":0.1} | 「幻の馬」と呼ばれた。10戦10勝のうち7戦はレコード。東京優駿は出遅れたが、向正面から押し上げて先頭に立った |
| クリフジ / u_kurifuji 不敗の女傑 | st | x => x.R <= 400 && x.rank <= 3 | {"spd":0.05,"sec":5,"free":true} | 11戦11勝で、7戦は10馬身以上の差。菊花賞にあたるレースは大差で勝った |
| シャーガー / u_shergar 白斑の流星 | st | x => x.inStraight && x.straight - x.R < 30 && x.rank >= 2 && x.rank <= 4 | {"spd":0.06,"sec":4,"free":true} | 英ダービーで2着に10馬身差をつけ、公式記録に残るダービーの最大着差を作った |
| フライトライン / u_flightline 砂上の飛行船 | st | x => x.R <= 400 && x.rank <= 3 | {"spd":0.05,"sec":4,"free":true} | 6戦6勝。パシフィッククラシックステークスで19馬身4分の1差、ブリーダーズカップクラシックで8馬身4分の1差 |
| シーザスターズ / u_seathestars 星の王 | st | x => x.R < 300 && x.close | {"spd":0.05,"sec":3,"free":true,"E":0.03} | 英2000ギニー・英ダービー・凱旋門賞を同じ年に勝った初めての馬。英インターナショナルステークスの一騎打ちをレコードで制した |
| リボー / u_ribot イタリアの巨匠 | st | x => x.D >= 2400 && x.inStraight && x.straight - x.R < 30 | {"spd":0.03,"sec":4,"free":true,"E":0.03} | 16戦16勝で凱旋門賞を連覇した。2度目の凱旋門賞は公式で6馬身差 |
| ナリタブライアン / u_brian シャドーロールの怪物 | st | x => x.inStraight && x.R <= 400 && x.R > 100 && x.rank >= 2 && x.leader.x - x.s.x < 3 * LEN | {"spd":0.06,"sec":3,"free":true} | 「シャドーロールの怪物」と呼ばれた三冠馬。東京優駿を5馬身差、菊花賞を7馬身差、有馬記念を3馬身差で勝った |
| ブラックキャビア / u_blackcaviar 漆黒の疾風 | st | x => x.D <= 1400 && x.inStraight && x.straight - x.R < 30 && x.rank <= 3 | {"spd":0.07,"sec":4,"free":true} | 25戦25勝の短距離の牝馬。ライトニングステークスは直線の入り口で先頭に立って大差、ダイヤモンドジュビリーステークスは3番手から抜け出した |
| オグリキャップ / u_oguricap 芦毛の怪物 | st | x => x.R < 100 && x.close | {"spd":0.06,"sec":2.5,"free":true} | 「芦毛の怪物」と呼ばれた。マイルチャンピオンシップは叩き合いをハナ差で制し、引退レースの有馬記念でも勝った |

確認数：馬の性質 25、発動系 26、固有 50。

参照：js/core/horse.js（SKILLS/fromHistoric/histSkills）、js/core/skills.js（LIST/UWHEN/of/step/apply）、js/core/racesim.js（skillAdj/継続処理）、data/uniques.js。Godot対応：core/hs_horse.gd、hs_skills.gd、hs_sim.gd、native/src/hs_skills.cpp。
