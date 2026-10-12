// Constants and Configuration for Fire Starter

export const GRID_COLS = 20;
export const GRID_ROWS = 20;
export const TILE_SIZE = 16; // Internal pixel render tile size (20 * 16 = 320px logical canvas)

export const TILES = {
  ROAD: 0,
  BUILDING: 1,
  ASH: 2,
  WET: 3
};

export const ITEMS = {
  MATCH: {
    id: 'MATCH',
    name: 'マッチ',
    shortName: 'MAT',
    initialAmmo: 15,
    spreadChance: 0.55,
    burnDuration: 4.5,
    range: 1,
    desc: '足元・前方への着火。延焼速度アップ。'
  },
  LIGHTER: {
    id: 'LIGHTER',
    name: 'ジッポー',
    shortName: 'LGT',
    initialAmmo: 6,
    spreadChance: 0.85,
    burnDuration: 6.0,
    range: 1,
    desc: '高熱で確実に着火。周囲へ一気に延焼。'
  },
  MOLOTOV: {
    id: 'MOLOTOV',
    name: '火炎瓶',
    shortName: 'MLT',
    initialAmmo: 4,
    spreadChance: 0.80,
    burnDuration: 5.5,
    stunDuration: 2.5,
    range: 3,
    desc: '3マス先へ投擲。一画を爆砕延焼＆敵をスタン！'
  },
  TIME_BOMB: {
    id: 'TIME_BOMB',
    name: '時限爆弾',
    shortName: 'BMB',
    initialAmmo: 3,
    spreadChance: 0.95,
    burnDuration: 6.0,
    countdown: 3.0,
    stunDuration: 4.0,
    radius: 2,
    desc: '設置後3秒で大爆砕。5x5区画を一掃＆敵を長時スタン！'
  }
};

export const ITEM_LIST = [ITEMS.MATCH, ITEMS.LIGHTER, ITEMS.MOLOTOV, ITEMS.TIME_BOMB];

export const PALETTES = {
  classic: {
    name: 'DMG (グリーン)',
    bg: '#081820',
    c0: '#0f380f', // darkest
    c1: '#306230', // dark
    c2: '#8bac0f', // light
    c3: '#9bbc0f', // lightest
    accentRed: '#8bac0f',
    hudBg: '#0f380f',
    frame: '#8f9489',
    caseAccent: '#8b0000'
  },
  pocket: {
    name: 'Pocket (白黒)',
    bg: '#111111',
    c0: '#1b1b1b',
    c1: '#595959',
    c2: '#b0b0b0',
    c3: '#ffffff',
    accentRed: '#ffffff',
    hudBg: '#1b1b1b',
    frame: '#6b6b6b',
    caseAccent: '#333333'
  },
  cantido: {
    name: 'Cantido (炎熱)',
    bg: '#140602',
    c0: '#260f06',
    c1: '#7c2509',
    c2: '#df611a',
    c3: '#f7d070',
    accentRed: '#ff4500',
    hudBg: '#260f06',
    frame: '#4a2511',
    caseAccent: '#df611a'
  }
};

export const GAME_STATES = {
  TITLE: 'TITLE',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  MAP_OVERVIEW: 'MAP_OVERVIEW',
  TRIBUTE_STATS: 'TRIBUTE_STATS',
  GAME_OVER: 'GAME_OVER'
};

export const DEATH_REASONS = {
  FULL_BURN: {
    id: 'FULL_BURN',
    title: '全焼（完全消滅）',
    msg: '街をすべて焼き尽くし、汝の居場所も灰へと消えた。',
    evaluation: '炎に呑まれし者よ、灰は汝を拒む。'
  },
  CRUSHED: {
    id: 'CRUSHED',
    title: '圧殺（完全浸食）',
    msg: '増殖するエンズビルのコンクリートに呑まれ、息絶えた。',
    evaluation: '悪魔の街の血肉となり、世界に同化した。'
  },
  ARRESTED: {
    id: 'ARRESTED',
    title: '逮捕（現行犯捕縛）',
    msg: '警察官に包囲・捕縛され、黒き炎の儀式は途絶えた。',
    evaluation: '冷たい鉄格子の奥、神の呼び声は遠ざかる。'
  }
};

export const BALANCE = {
  INITIAL_BUILDING_RATIO: 0.40, // 40% starting buildings
  GROWTH_INTERVAL: 2.0,         // Slightly more room to breathe initially
  GROWTH_ACCELERATION: 0.988,   // Interval shrinks gently over time
  MIN_GROWTH_INTERVAL: 0.7,
  BURNING_DAMAGE_RATE: 0.55,    // Fast, crisp destruction rhythm (~1.8s to ash)
  FIRE_TICK_INTERVAL: 0.30,     // Fast spreading tick
  WATER_DURATION: 4.5,          // Wet tile cooldown
  PLAYER_SPEED: 4.6,            // Tiles per second
  PLAYER_DASH_SPEED: 7.5,       // Speedy sprint
  POLICE_SPEED_PATROL: 2.2,
  POLICE_SPEED_CHASE: 4.2,      // Manageable chase speed
  POLICE_LOS_RANGE: 4.5,        // Detection radius
  FIREFIGHTER_SPEED: 3.0,
  DASH_STAMINA_DRAIN: 18,       // Stamina lasts 2x longer
  DASH_STAMINA_RECOVERY: 35,    // Recovers much faster
  ITEM_DROP_CHANCE: 0.42,       // 42% item drops from burned buildings
  STUN_SCORE_BONUS: 250,        // Bonus tribute score for stunning enemies
  DANGER_LOW_BUILDING: 0.05,    // 5% -> risk of full burn
  DANGER_HIGH_BUILDING: 0.90    // 90% -> risk of crushing
};
