export type TextMode = 'original' | 'homage';

export type WeaponId = 'match' | 'lighter' | 'molotov' | 'bomb';

export interface WeaponSpec {
  id: WeaponId;
  index: number;
  nameJa: string;
  nameShort: string;
  unlockDay: number;
  cooldownSec: number;
  spreadProbPerSec: number;
  burnDamagePerSec: number;
  policeAlertIncrease: number;
}

export const CONFIG = {
  // LCD Logical Dimensions (28x18 grid, 8x8 dots per cell)
  GRID_COLS: 28,
  GRID_ROWS: 18,
  CELL_SIZE: 8,
  LCD_WIDTH: 224,
  LCD_HEIGHT: 144,

  // Exact Buildable Cell Count (504 total - 64 river - 120 road = 320 buildable)
  TOTAL_BUILDABLE_CELLS: 320,

  // 4-Tone Reflective Monochrome/Olive LCD Palette
  PALETTE: {
    COLOR_0: '#8b956d', // Brightest olive (background / ash / sky)
    COLOR_1: '#6b744e', // Mid-light (road / smoke / UI frame)
    COLOR_2: '#3e442b', // Mid-dark (buildings / NPCs)
    COLOR_3: '#1b1e12', // Darkest (player / black flame / text)
    GHOST_CLEAR: 'rgba(139, 149, 109, 0.35)', // LCD ghosting overlay
    LCD_GRID: 'rgba(27, 30, 18, 0.12)', // 1px dot matrix grid line
    BACKLIGHT_WHITE: '#f4f6e8', // Canti manifestation high-contrast backlight
    SILHOUETTE_BLACK: '#0d0e0a', // Canti manifestation silhouette black
  },

  // Building Durability & Suffocation Contribution Weights
  BUILDING: {
    LEVEL_1: { durability: 100, weight: 1.0 },
    LEVEL_2: { durability: 180, weight: 1.3 },
    LEVEL_3: { durability: 280, weight: 1.8 },
    PROLIFERATION_INTERVAL_SEC: 2.8,
    INITIAL_BUILDING_COUNT: 65,
    UPGRADE_CHANCE_ON_TICK: 0.25,
  },

  // Dilemma Gauge Equations & Thresholds
  GAUGE: {
    INITIAL_SUFFOCATION: 35,
    INITIAL_DESTRUCTION: 0,
    SUFFOCATION_BASE_RATE: 0.18,
    SUFFOCATION_BUILDING_FACTOR: 0.95,
    SUFFOCATION_BURNING_RELIEF: 0.85,
    ASH_RECOVERY_SEC: 12.0,
    DANGER_THRESHOLD: 65,
    SIREN_DESTRUCTION_THRESHOLD: 35,
    REALITY_TEXT_SUFFOCATION_HIGH: 60,
    REALITY_TEXT_DESTRUCTION_HIGH: 35,
  },

  // Time & Narrative Settings
  TIME: {
    SECONDS_PER_DAY: 20.0,
    NARRATION_DISPLAY_SEC: 3.2,
    REALITY_TEXT_INTERVAL_SEC: 6.0,
    MANIFESTATION_DURATION_SEC: 3.5,
    MANIFESTATION_COOLDOWN_SEC: 8.0,
  },

  // Player & NPC Movement / AI Parameters
  ACTORS: {
    PLAYER_SPEED_CELLS_PER_SEC: 6.2,
    POLICE_NORMAL_SPEED_RATIO: 0.24,
    POLICE_ALERT_SPEED_RATIO: 0.38,
    POLICE_SIGHT_RADIUS: 2.6,
    POLICE_ALERT_HEARING_RADIUS: 6.0,
    POLICE_ALERT_DURATION_SEC: 2.8,
    INITIAL_POLICE_COUNT: 1,
    MAX_POLICE_COUNT: 2,
    FIREFIGHTER_SPEED_CELLS_PER_SEC: 2.8,
    FIREFIGHTER_EXTINGUISH_PER_SEC: 42,
    INITIAL_FIREFIGHTER_COUNT: 1,
    MAX_FIREFIGHTER_COUNT: 3,
    SURROUND_RADIUS: 3.8,
    SURROUND_COUNT_TRIGGER: 2,
  },

  // 4 Escalating Ignition Weapons
  WEAPONS: [
    {
      id: 'match',
      index: 0,
      nameJa: 'マッチ',
      nameShort: 'MCH',
      unlockDay: 1,
      cooldownSec: 0.65,
      spreadProbPerSec: 0.12,
      burnDamagePerSec: 24,
      policeAlertIncrease: 5,
    },
    {
      id: 'lighter',
      index: 1,
      nameJa: 'ライター',
      nameShort: 'LTR',
      unlockDay: 2,
      cooldownSec: 0.25,
      spreadProbPerSec: 0.18,
      burnDamagePerSec: 28,
      policeAlertIncrease: 10,
    },
    {
      id: 'molotov',
      index: 2,
      nameJa: '火炎瓶',
      nameShort: 'MLV',
      unlockDay: 4,
      cooldownSec: 1.5,
      spreadProbPerSec: 0.24,
      burnDamagePerSec: 34,
      policeAlertIncrease: 20,
    },
    {
      id: 'bomb',
      index: 3,
      nameJa: '爆弾',
      nameShort: 'BMB',
      unlockDay: 6,
      cooldownSec: 3.0,
      spreadProbPerSec: 0.30,
      burnDamagePerSec: 40,
      policeAlertIncrease: 35,
    },
  ] as readonly WeaponSpec[],
} as const;
