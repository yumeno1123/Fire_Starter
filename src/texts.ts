import type { TextMode } from './config';

export type BadEndType = 'suffocation' | 'destruction' | 'arrested';

export interface BadEndContent {
  header: string;
  lines: string[];
}

export interface TextPack {
  modeLabel: string;
  deityName: string;
  cityName: string;
  mythNarrations: {
    day1: string;
    day2: string;
    day3: string;
    day4: string;
    day5: string;
    day6: string;
    loop: string;
  };
  realityTexts: {
    normal: string[];
    suffocationHigh: string[];
    destructionHigh: string[];
  };
  badEnds: Record<BadEndType, BadEndContent>;
  climax: {
    cutIn: string;
    aftermathWhisper: string;
  };
}

export const TEXT_PACKS: Record<TextMode, TextPack> = {
  original: {
    modeLabel: 'ORIGINAL (原作準拠: エンズビル / カンティード)',
    deityName: 'カンティード',
    cityName: 'エンズビル',
    mythNarrations: {
      day1: '「悪徳の街エンズビル。増殖し続ける灰色の牢獄。黒き炎の神カンティードのしもべよ、この街に火を放て」',
      day2: '「唯一の武器は炎。マッチ、ライター、火炎瓶、爆弾……。消防士のウラをかき、警察官の目をかいくぐれ」',
      day3: '「灰色の建物が視界を塞いでいく。息が詰まる前に、小さな火種を路地裏へ落とせ」',
      day4: '「しかし、注意しなければならない。すべてを燃やしつくしてはいけない」',
      day5: '「炎は激しさを増し、もう指先ひとつでは止められない。それでも火を絶やせば街に呑まれる」',
      day6: '「街のすべてが燃えてしまえば、君のいる場所はなくなってしまう。君は生きていけなくなってしまう」',
      loop: '「君の戦いに勝利はない。ただ、街に火を放ち続けるだけ……。カンティードの祝福あれ」',
    },
    realityTexts: {
      normal: [
        '「……川の水、ぬるいな」',
        '「またパンの耳か。まあいいけど」',
        '「誰も私のことなんか見てない。最初からいないみたいに」',
        '「遠くで踏切の音がする。どこにも行かない電車の音」',
        '「ボタンが擦り切れて、親指の腹だけが熱い」',
      ],
      suffocationHigh: [
        '「息ができない。街がどんどん迫ってくる」',
        '「教室の匂いも、あいつの笑い声も、ぜんぶ灰になればいいのに」',
        '「火をつけなきゃ。火をつけないと、私が消えちゃう」',
        '「たすくん……。なんで私を置いてアメリカなんか行っちゃったの」',
      ],
      destructionHigh: [
        '『ねえ聞いた？ 昨夜も倉庫街の方で不審火があったんだって』',
        '『最近やけにサイレンが鳴るよな。誰がやってんだろうな』',
        '「赤い回転灯が、橋の上をいくつも走っていく」',
        '「焦げた匂いがする。画面の中から？ それとも私の制服から？」',
        '「綺麗だなあ……。ぜんぶ燃えちゃえばいいのに。……だめだ、全部燃えたら、私どこで寝ればいいの」',
      ],
    },
    badEnds: {
      suffocation: {
        header: '[ SUFFOCATION : 100% ]',
        lines: [
          '街はすべてを呑み込んだ。',
          '新しいビルが建ち、昨日と同じ朝が来て、誰も君の名前を呼ばない。',
          '君の日常は、何も変わらないまま永遠に続いていく……。',
        ],
      },
      destruction: {
        header: '[ DESTRUCTION : 100% ]',
        lines: [
          'すべてが燃えてしまった。',
          '嫌いだった校舎も、橋の下の隠れ家も、ぜんぶ灰になった。',
          '君のいる場所はなくなった。君はもう、生きていけなくなってしまう……。',
        ],
      },
      arrested: {
        header: '[ ARRESTED ]',
        lines: [
          '「おい、こんな時間に一人で何をしてる」',
          '冷たい手が肩を掴む。手元の小さな神話は、ポケットの中へ取り上げられた。',
        ],
      },
    },
    climax: {
      cutIn: '「黒き炎の神、カンティードの祝福あれ」',
      aftermathWhisper: '「……たすけて、カンティード様」',
    },
  },

  homage: {
    modeLabel: 'HOMAGE (権利クリア版: アッシュビル / ノクス)',
    deityName: 'ノクス',
    cityName: 'アッシュビル',
    mythNarrations: {
      day1: '「灰色の街アッシュビル。増殖し続けるコンクリートの檻。黒き炎の使徒ノクスのしもべよ、この街に火を放て」',
      day2: '「手にあるのは小さな火種だけ。マッチ、ライター、オイル、爆薬……。消防士の網を抜け、警官の視線を振り切れ」',
      day3: '「無機質な壁が空を塗り潰していく。息が止まる前に、乾いた路地へ火花を散らせ」',
      day4: '「だが気をつけろ。街のすべてを焼き尽くしてはならない」',
      day5: '「膨れ上がった劫火は、もう誰の手にも負えない。それでも火を止めれば日常に押し潰される」',
      day6: '「すべてが灰に還れば、君が息をする場所も消えてしまう。君はどこにもいられなくなる」',
      loop: '「このゲームにクリアはない。ただ、凍えない程度に街を焦がし続けるだけ……。黒き炎の祝福あれ」',
    },
    realityTexts: {
      normal: [
        '「……川の水、ぬるいな」',
        '「また冷えたパンの耳か。別にいいけど」',
        '「誰も私のことなんか見てない。最初から透明人間みたいに」',
        '「遠くで踏切が鳴ってる。私を乗せない電車の音」',
        '「プラスチックのボタンが擦り切れて、親指の腹だけが熱い」',
      ],
      suffocationHigh: [
        '「息ができない。灰色の街がどんどん迫ってくる」',
        '「教室の空気も、ヒソヒソ声も、ぜんぶ炭になればいいのに」',
        '「火をつけなきゃ。火をつけないと、私の方が消えちゃう」',
        '「あの人はもういない……。なんで私だけここに置いていったの」',
      ],
      destructionHigh: [
        '『ねえ聞いた？ 昨夜も旧校舎の裏でボヤがあったらしいよ』',
        '『最近やけにサイレンが鳴るよな。誰が火をつけてるんだろうな』',
        '「赤い回転灯が、夕暮れの橋をいくつも渡っていく」',
        '「焦げた匂いがする。液晶の中から？ それとも私の袖口から？」',
        '「綺麗だなあ……。ぜんぶ燃えちゃえばいいのに。……だめだ、全部燃えたら、私どこで眠ればいいの」',
      ],
    },
    badEnds: {
      suffocation: {
        header: '[ SUFFOCATION : 100% ]',
        lines: [
          '街はすべてを呑み込んだ。',
          '新しいビルが建ち、昨日と同じ朝が来て、誰も君の名前を呼ばない。',
          '君の日常は、何も変わらないまま永遠に続いていく……。',
        ],
      },
      destruction: {
        header: '[ DESTRUCTION : 100% ]',
        lines: [
          'すべてが燃えてしまった。',
          '嫌いだった校舎も、橋の下の隠れ家も、ぜんぶ灰になった。',
          '君のいる場所はなくなった。君はもう、生きていけなくなってしまう……。',
        ],
      },
      arrested: {
        header: '[ ARRESTED ]',
        lines: [
          '「おい、こんな時間に一人で何をしてる」',
          '冷たい手が肩を掴む。手元の小さな神話は、ポケットの中へ取り上げられた。',
        ],
      },
    },
    climax: {
      cutIn: '「黒き炎の使徒、ノクスの祝福あれ」',
      aftermathWhisper: '「……たすけて、黒き炎の天使様」',
    },
  },
};

export function getNarrationForDay(mode: TextMode, day: number): string {
  const pack = TEXT_PACKS[mode].mythNarrations;
  if (day === 1) return pack.day1;
  if (day === 2) return pack.day2;
  if (day === 3) return pack.day3;
  if (day === 4) return pack.day4;
  if (day === 5) return pack.day5;
  if (day === 6) return pack.day6;
  return pack.loop;
}
