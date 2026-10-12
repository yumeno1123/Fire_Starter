// Constants and Configuration for Fire Starter

export const APP_VERSION = 'v1.5.1';
export const GITHUB_REPO = 'yumeno1123/Fire_Starter';
export const CURRENT_COMMIT_SHORT = 'a0b1b14';

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
    title: '全焼（居場所の消滅）',
    msg: '悪の街をすべて焼き払ったが、汝自身の帰るべき場所も灰へと消えた。',
    evaluation: 'すべてを燃やし尽くせば、己もまた世界から拒絶される。'
  },
  CRUSHED: {
    id: 'CRUSHED',
    title: '圧殺（完全浸食）',
    msg: '増殖するエンズビルのコンクリートに呑まれ、息絶えた。',
    evaluation: '悪魔の街の血肉となり、日常の重圧に同化した。'
  },
  ARRESTED: {
    id: 'ARRESTED',
    title: '逮捕（現行犯捕縛）',
    msg: '警察官に包囲・捕縛され、黒き炎の儀式は途絶えた。',
    evaluation: '冷たい鉄格子の奥、神の呼び声は遠ざかる。'
  }
};

export const TENSION_ZONES = {
  FRENZY: {
    threshold: 0.12,
    name: 'FRENZY (狂気)',
    hudTag: '!FRENZY x2.5!',
    dangerMsg: '!NOWHERE TO GO!',
    scoreMultiplier: 2.5
  },
  TENSION: {
    min: 0.12,
    max: 0.40,
    name: 'TENSION (境界)',
    hudTag: 'ZONE:TENSION',
    scoreMultiplier: 1.5,
    perSecondBonus: 30
  },
  STABLE: {
    min: 0.40,
    max: 0.70,
    name: 'STABLE (安定)',
    hudTag: 'ZONE:STABLE',
    scoreMultiplier: 1.0,
    perSecondBonus: 0
  },
  DENSE: {
    min: 0.70,
    name: 'DENSE (過密)',
    hudTag: '!DENSE!',
    dangerMsg: '!CRUSH ALERT!',
    scoreMultiplier: 0.8
  }
};

export const DIFFICULTY_SETTINGS = {
  EASY: {
    id: 'EASY',
    name: 'EASY',
    label: 'EASY (かんたん)',
    desc: '延焼が穏やか・全焼防止セーフティ',
    INITIAL_BUILDING_RATIO: 0.42,
    GROWTH_INTERVAL: 2.5,
    GROWTH_ACCELERATION: 0.992,
    MIN_GROWTH_INTERVAL: 0.9,
    BURNING_DAMAGE_RATE: 0.28,    // ~3.5s to burn down (buffer against rapid burnout)
    FIRE_TICK_INTERVAL: 0.42,     // Fire spreads slower
    FIRE_SPREAD_MODIFIER: 0.70,   // Spread chance 70% of base
    FIRE_DECAY_RATE: 0.80,        // Decays fast so fires don't engulf whole map
    WATER_DURATION: 4.0,
    EMERGENCY_REGROWTH_RATIO: 0.12, // Demonic city emergency sprout under 12%
    ISOLATED_SPROUT_CHANCE: 0.008,  // 0.8% isolated spontaneous sprout chance (neighbors === 0)
    PLAYER_SPEED: 4.8,
    PLAYER_DASH_SPEED: 7.8,
    POLICE_SPEED_PATROL: 1.9,
    POLICE_SPEED_CHASE: 3.5,
    POLICE_LOS_RANGE: 3.5,
    FIREFIGHTER_SPEED: 3.2,
    DASH_STAMINA_DRAIN: 14,
    DASH_STAMINA_RECOVERY: 42,
    ITEM_DROP_CHANCE: 0.50,
    AMMO_MULTIPLIER: 1.5,
    STUN_SCORE_BONUS: 300,
    POLICE_COUNT: 1,
    POLICE_BREAKAWAY_STAMINA_COST: 25,
    POLICE_BANISH_SCORE_BONUS: 500,
    POLICE_RESPAWN_DELAY: 22.0,
    POLICE_ALERT_DURATION: 2.0,
    POLICE_BREAKAWAY_STUN: 2.0,
    DANGER_LOW_BUILDING: 0.05,
    DANGER_HIGH_BUILDING: 0.92
  },
  NORMAL: {
    id: 'NORMAL',
    name: 'NORMAL',
    label: 'NORMAL (ふつう)',
    desc: '標準バランス: 延焼と増殖の綱渡り',
    INITIAL_BUILDING_RATIO: 0.40,
    GROWTH_INTERVAL: 2.0,
    GROWTH_ACCELERATION: 0.988,
    MIN_GROWTH_INTERVAL: 0.7,
    BURNING_DAMAGE_RATE: 0.38,    // ~2.6s to ash (improved from 1.8s)
    FIRE_TICK_INTERVAL: 0.35,     // Slower spread tick
    FIRE_SPREAD_MODIFIER: 0.85,   // Prevents runaway chain reactions
    FIRE_DECAY_RATE: 0.85,
    WATER_DURATION: 4.5,
    EMERGENCY_REGROWTH_RATIO: 0.07, // Demonic city emergency sprout under 7%
    ISOLATED_SPROUT_CHANCE: 0.015,  // 1.5% isolated spontaneous sprout chance (neighbors === 0)
    PLAYER_SPEED: 4.6,
    PLAYER_DASH_SPEED: 7.5,
    POLICE_SPEED_PATROL: 2.2,
    POLICE_SPEED_CHASE: 4.0,
    POLICE_LOS_RANGE: 4.2,
    FIREFIGHTER_SPEED: 3.0,
    DASH_STAMINA_DRAIN: 18,
    DASH_STAMINA_RECOVERY: 35,
    ITEM_DROP_CHANCE: 0.42,
    AMMO_MULTIPLIER: 1.0,
    STUN_SCORE_BONUS: 250,
    POLICE_COUNT: 1,
    POLICE_BREAKAWAY_STAMINA_COST: 35,
    POLICE_BANISH_SCORE_BONUS: 500,
    POLICE_RESPAWN_DELAY: 18.0,
    POLICE_ALERT_DURATION: 2.5,
    POLICE_BREAKAWAY_STUN: 1.8,
    DANGER_LOW_BUILDING: 0.05,
    DANGER_HIGH_BUILDING: 0.90
  },
  HARD: {
    id: 'HARD',
    name: 'HARD',
    label: 'HARD (むずかしい)',
    desc: '過酷な自己増殖と俊敏な警察の追跡',
    INITIAL_BUILDING_RATIO: 0.38,
    GROWTH_INTERVAL: 1.6,
    GROWTH_ACCELERATION: 0.982,
    MIN_GROWTH_INTERVAL: 0.55,
    BURNING_DAMAGE_RATE: 0.48,
    FIRE_TICK_INTERVAL: 0.30,
    FIRE_SPREAD_MODIFIER: 1.0,
    FIRE_DECAY_RATE: 0.90,
    WATER_DURATION: 5.0,
    EMERGENCY_REGROWTH_RATIO: 0.04,
    ISOLATED_SPROUT_CHANCE: 0.025,  // 2.5% isolated spontaneous sprout chance (neighbors === 0)
    PLAYER_SPEED: 4.5,
    PLAYER_DASH_SPEED: 7.2,
    POLICE_SPEED_PATROL: 2.4,
    POLICE_SPEED_CHASE: 4.4,
    POLICE_LOS_RANGE: 4.8,
    FIREFIGHTER_SPEED: 2.8,
    DASH_STAMINA_DRAIN: 22,
    DASH_STAMINA_RECOVERY: 28,
    ITEM_DROP_CHANCE: 0.35,
    AMMO_MULTIPLIER: 0.8,
    STUN_SCORE_BONUS: 200,
    POLICE_COUNT: 2,
    POLICE_BREAKAWAY_STAMINA_COST: 45,
    POLICE_BANISH_SCORE_BONUS: 500,
    POLICE_RESPAWN_DELAY: 14.0,
    POLICE_ALERT_DURATION: 3.2,
    POLICE_BREAKAWAY_STUN: 1.5,
    DANGER_LOW_BUILDING: 0.05,
    DANGER_HIGH_BUILDING: 0.88
  }
};

export const DIFFICULTY_KEYS = ['EASY', 'NORMAL', 'HARD'];

export const BALANCE = DIFFICULTY_SETTINGS.NORMAL;

