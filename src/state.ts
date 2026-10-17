import { CONFIG, type TextMode, type WeaponSpec } from './config';
import { getNarrationForDay, TEXT_PACKS, type BadEndType } from './texts';

export type TerrainType = 'RIVER' | 'ROAD' | 'LOT';

export type LotState =
  | 'EMPTY'
  | 'BUILDING_1'
  | 'BUILDING_2'
  | 'BUILDING_3'
  | 'BURNING'
  | 'ASH';

export interface Cell {
  x: number;
  y: number;
  terrain: TerrainType;
  state: LotState;
  buildingLevel: 0 | 1 | 2 | 3;
  durability: number;
  maxDurability: number;
  spreadProbPerSec: number;
  burnDamagePerSec: number;
  ashTimerSec: number;
  flickerPhase: number;
}

export interface Direction {
  dx: number;
  dy: number;
}

export interface Player {
  x: number;
  y: number;
  facing: Direction;
  weaponIndex: number;
  cooldownSec: number;
  stepPhase: number;
}

export interface Firefighter {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isExtinguishing: boolean;
}

export interface Police {
  id: number;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  isChasing: boolean;
  stunTimerSec: number;
}

export interface VisualEffect {
  type: 'ignition' | 'molotov_arc' | 'explosion' | 'extinguish';
  x: number;
  y: number;
  startX?: number;
  startY?: number;
  radius: number;
  timerSec: number;
  durationSec: number;
}

export interface AudioCallbacks {
  onMoveStep: () => void;
  onIgnite: (weaponIndex: number) => void;
  onWeaponSwitch: () => void;
  onManifestCanti: () => void;
  onBadEnd: (type: BadEndType) => void;
}

export class GameState {
  public cells: Cell[][] = [];
  public buildableCells: Cell[] = [];
  public roadCells: Cell[] = [];

  public player: Player = {
    x: 14.5,
    y: 6.5,
    facing: { dx: 0, dy: -1 },
    weaponIndex: 0,
    cooldownSec: 0,
    stepPhase: 0,
  };

  public firefighters: Firefighter[] = [];
  public police: Police[] = [];
  public effects: VisualEffect[] = [];

  public suffocation: number = CONFIG.GAUGE.INITIAL_SUFFOCATION;
  public destruction: number = CONFIG.GAUGE.INITIAL_DESTRUCTION;

  public elapsedSec: number = 0;
  public day: number = 1;
  public policeAlertTimerSec: number = 0;
  public arrestContactTimerSec: number = 0;
  public proliferationTimerSec: number = 0;

  public narrationText: string = '';
  public narrationTimerSec: number = 0;
  public narrationTotalSec: number = CONFIG.TIME.NARRATION_DISPLAY_SEC;

  public realityText: string = '';
  public realityTextTimerSec: number = 2.0;
  public realityTextVisibleSec: number = 0;

  public isManifesting: boolean = false;
  public manifestTimerSec: number = 0;
  public manifestCooldownSec: number = 0;
  public crackSeeds: Array<{ angle: number; length: number; jitter: number }> = [];

  public badEnd: BadEndType | null = null;
  public badEndTimerSec: number = 0;

  public textMode: TextMode = 'original';
  private nextNpcId: number = 1;
  private stepAccumulator: number = 0;

  constructor() {
    this.resetGame();
  }

  public setTextMode(mode: TextMode): void {
    this.textMode = mode;
    if (this.narrationTimerSec > 0) {
      this.narrationText = getNarrationForDay(this.textMode, this.day);
    }
  }

  public resetGame(): void {
    this.suffocation = CONFIG.GAUGE.INITIAL_SUFFOCATION;
    this.destruction = CONFIG.GAUGE.INITIAL_DESTRUCTION;
    this.elapsedSec = 0;
    this.day = 1;
    this.policeAlertTimerSec = 0;
    this.arrestContactTimerSec = 0;
    this.proliferationTimerSec = 0;
    this.isManifesting = false;
    this.manifestTimerSec = 0;
    this.manifestCooldownSec = 0;
    this.badEnd = null;
    this.badEndTimerSec = 0;
    this.effects = [];

    this.buildTownGrid();
    this.seedInitialBuildings();

    this.player = {
      x: 14.5,
      y: 6.5,
      facing: { dx: 0, dy: -1 },
      weaponIndex: 0,
      cooldownSec: 0,
      stepPhase: 0,
    };

    this.firefighters = [];
    this.police = [];
    this.syncNpcCounts();

    this.triggerDayNarration(1);
    this.realityText = TEXT_PACKS[this.textMode].realityTexts.normal[0];
    this.realityTextVisibleSec = 4.5;
    this.realityTextTimerSec = CONFIG.TIME.REALITY_TEXT_INTERVAL_SEC;
  }

  private buildTownGrid(): void {
    const cols = CONFIG.GRID_COLS;
    const rows = CONFIG.GRID_ROWS;
    this.cells = [];
    this.buildableCells = [];
    this.roadCells = [];

    const terrainMap = this.createExactTerrainLayout(cols, rows);

    for (let y = 0; y < rows; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < cols; x++) {
        const terrain = terrainMap[y][x];
        const cell: Cell = {
          x,
          y,
          terrain,
          state: 'EMPTY',
          buildingLevel: 0,
          durability: 0,
          maxDurability: 0,
          spreadProbPerSec: 0,
          burnDamagePerSec: 0,
          ashTimerSec: 0,
          flickerPhase: Math.random() * Math.PI * 2,
        };
        row.push(cell);
        if (terrain === 'LOT') {
          this.buildableCells.push(cell);
        } else if (terrain === 'ROAD') {
          this.roadCells.push(cell);
        }
      }
      this.cells.push(row);
    }
  }

  /**
   * Generates a 28x18 layout with EXACTLY:
   * - 64 RIVER cells
   * - 120 ROAD cells
   * - 320 LOT (buildable) cells
   */
  private createExactTerrainLayout(cols: number, rows: number): TerrainType[][] {
    const grid: TerrainType[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => 'LOT' as TerrainType),
    );

    const bridgeCols = new Set([7, 8, 19, 20]);
    for (let y = 8; y <= 9; y++) {
      for (let x = 0; x < cols; x++) {
        if (bridgeCols.has(x)) continue;
        grid[y][x] = 'RIVER';
      }
    }

    for (let x = 0; x < 8; x++) {
      grid[0][x] = 'RIVER';
      grid[0][cols - 1 - x] = 'RIVER';
    }

    let roadCount = 0;
    const setRoad = (x: number, y: number): void => {
      if (x < 0 || x >= cols || y < 0 || y >= rows) return;
      if (grid[y][x] !== 'LOT') return;
      if (roadCount >= 120) return;
      grid[y][x] = 'ROAD';
      roadCount++;
    };

    for (const bx of bridgeCols) {
      setRoad(bx, 8);
      setRoad(bx, 9);
    }

    for (let x = 0; x < cols; x++) {
      setRoad(x, 4);
      setRoad(x, 13);
    }

    for (let y = 1; y < rows - 1; y++) {
      setRoad(7, y);
      setRoad(14, y);
      setRoad(20, y);
    }

    for (let x = 2; x < cols - 2; x++) {
      setRoad(x, 16);
      setRoad(x, 1);
    }

    return grid;
  }

  private seedInitialBuildings(): void {
    const shuffled = [...this.buildableCells].sort(() => Math.random() - 0.5);
    const initialCount = CONFIG.BUILDING.INITIAL_BUILDING_COUNT;

    for (let i = 0; i < initialCount && i < shuffled.length; i++) {
      const cell = shuffled[i];
      const roll = Math.random();
      if (roll < 0.72) {
        this.setBuildingState(cell, 1);
      } else if (roll < 0.94) {
        this.setBuildingState(cell, 2);
      } else {
        this.setBuildingState(cell, 3);
      }
    }

    // Ensure at least one building is right next to the starting position (14.5, 6.5)
    const starterCell = this.getCell(13, 6) ?? this.getCell(15, 6);
    if (starterCell && starterCell.terrain === 'LOT') {
      this.setBuildingState(starterCell, 1);
    }
  }

  private setBuildingState(cell: Cell, level: 1 | 2 | 3): void {
    cell.buildingLevel = level;
    if (level === 1) {
      cell.state = 'BUILDING_1';
      cell.durability = CONFIG.BUILDING.LEVEL_1.durability;
      cell.maxDurability = CONFIG.BUILDING.LEVEL_1.durability;
    } else if (level === 2) {
      cell.state = 'BUILDING_2';
      cell.durability = CONFIG.BUILDING.LEVEL_2.durability;
      cell.maxDurability = CONFIG.BUILDING.LEVEL_2.durability;
    } else {
      cell.state = 'BUILDING_3';
      cell.durability = CONFIG.BUILDING.LEVEL_3.durability;
      cell.maxDurability = CONFIG.BUILDING.LEVEL_3.durability;
    }
  }

  public getCurrentWeapon(): WeaponSpec {
    return CONFIG.WEAPONS[this.player.weaponIndex];
  }

  public getUnlockedWeapons(): WeaponSpec[] {
    return CONFIG.WEAPONS.filter((w) => this.day >= w.unlockDay);
  }

  public cycleWeapon(audio?: AudioCallbacks): void {
    if (this.badEnd || this.isManifesting) return;
    const unlocked = this.getUnlockedWeapons();
    if (unlocked.length <= 1) return;

    const currentPos = unlocked.findIndex((w) => w.index === this.player.weaponIndex);
    const nextPos = (currentPos + 1) % unlocked.length;
    this.player.weaponIndex = unlocked[nextPos].index;
    audio?.onWeaponSwitch();
  }

  public canManifestCanti(): boolean {
    if (this.badEnd || this.isManifesting) return false;
    if (this.manifestCooldownSec > 0) return false;

    const isGaugeCritical =
      this.suffocation >= CONFIG.GAUGE.DANGER_THRESHOLD ||
      this.destruction >= CONFIG.GAUGE.DANGER_THRESHOLD;
    if (isGaugeCritical) return true;

    const nearbyNpcs = this.countNearbyNpcs(CONFIG.ACTORS.SURROUND_RADIUS);
    return nearbyNpcs >= CONFIG.ACTORS.SURROUND_COUNT_TRIGGER;
  }

  public countNearbyNpcs(radius: number): number {
    let count = 0;
    for (const p of this.police) {
      if (Math.hypot(p.x - this.player.x, p.y - this.player.y) <= radius) {
        count++;
      }
    }
    for (const f of this.firefighters) {
      if (Math.hypot(f.x - this.player.x, f.y - this.player.y) <= radius) {
        count++;
      }
    }
    return count;
  }

  public tryManifestCanti(audio?: AudioCallbacks): boolean {
    if (!this.canManifestCanti()) return false;

    this.isManifesting = true;
    this.manifestTimerSec = CONFIG.TIME.MANIFESTATION_DURATION_SEC;
    this.manifestCooldownSec = CONFIG.TIME.MANIFESTATION_COOLDOWN_SEC;

    this.crackSeeds = Array.from({ length: 14 }, (_, idx) => ({
      angle: (idx / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.25,
      length: 60 + Math.random() * 90,
      jitter: (Math.random() - 0.5) * 14,
    }));

    audio?.onManifestCanti();
    return true;
  }

  private completeCantiManifestation(): void {
    this.isManifesting = false;
    this.policeAlertTimerSec = 0;
    this.arrestContactTimerSec = 0;

    this.police = [];
    this.firefighters = [];

    const shuffled = [...this.buildableCells].sort(() => Math.random() - 0.5);
    const targetAshCount = Math.floor(CONFIG.TOTAL_BUILDABLE_CELLS * 0.5);

    for (let i = 0; i < shuffled.length; i++) {
      const cell = shuffled[i];
      if (i < targetAshCount) {
        cell.state = 'ASH';
        cell.buildingLevel = 0;
        cell.durability = 0;
        cell.maxDurability = 0;
        cell.ashTimerSec = Math.random() * 6;
      } else if (i < targetAshCount + 55) {
        this.setBuildingState(cell, 1);
      } else {
        cell.state = 'EMPTY';
        cell.buildingLevel = 0;
        cell.durability = 0;
        cell.maxDurability = 0;
        cell.ashTimerSec = 0;
      }
    }

    this.suffocation = 50;
    this.destruction = 50;

    this.realityText = TEXT_PACKS[this.textMode].climax.aftermathWhisper;
    this.realityTextVisibleSec = 5.0;
    this.realityTextTimerSec = CONFIG.TIME.REALITY_TEXT_INTERVAL_SEC;
  }

  public tryIgnite(audio?: AudioCallbacks): boolean {
    if (this.badEnd || this.isManifesting) return false;
    if (this.player.cooldownSec > 0) return false;

    const weapon = this.getCurrentWeapon();
    const ignitedAny = this.applyWeaponIgnition(weapon);
    if (!ignitedAny) return false;

    if (this.narrationTimerSec > 0.6) {
      this.narrationTimerSec = 0.6;
    }

    this.player.cooldownSec = weapon.cooldownSec;
    this.policeAlertTimerSec = CONFIG.ACTORS.POLICE_ALERT_DURATION_SEC;
    audio?.onIgnite(weapon.index);
    return true;
  }

  private applyWeaponIgnition(weapon: WeaponSpec): boolean {
    const px = Math.floor(this.player.x);
    const py = Math.floor(this.player.y);
    const { dx, dy } = this.player.facing;

    if (weapon.id === 'match' || weapon.id === 'lighter') {
      const target = this.findAdjacentIgnitableCell(px, py, dx, dy);
      if (!target) return false;
      this.igniteCell(target, weapon, false);
      this.effects.push({
        type: 'ignition',
        x: target.x + 0.5,
        y: target.y + 0.5,
        radius: 1.2,
        timerSec: 0,
        durationSec: 0.28,
      });
      return true;
    }

    if (weapon.id === 'molotov') {
      const centerX = this.clampCol(px + dx * 3);
      const centerY = this.clampRow(py + dy * 3);
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const cell = this.getCell(centerX + ox, centerY + oy);
          if (cell && cell.terrain === 'LOT' && cell.state !== 'ASH') {
            this.igniteCell(cell, weapon, false);
          }
        }
      }
      this.effects.push({
        type: 'molotov_arc',
        startX: this.player.x,
        startY: this.player.y,
        x: centerX + 0.5,
        y: centerY + 0.5,
        radius: 2.2,
        timerSec: 0,
        durationSec: 0.38,
      });
      return true;
    }

    for (let oy = -2; oy <= 2; oy++) {
      for (let ox = -2; ox <= 2; ox++) {
        const cell = this.getCell(px + ox, py + oy);
        if (!cell || cell.terrain !== 'LOT') continue;
        const isInnerCore = Math.abs(ox) <= 1 && Math.abs(oy) <= 1;
        this.igniteCell(cell, weapon, isInnerCore);
      }
    }
    this.effects.push({
      type: 'explosion',
      x: this.player.x,
      y: this.player.y,
      radius: 3.5,
      timerSec: 0,
      durationSec: 0.55,
    });
    return true;
  }

  private findAdjacentIgnitableCell(
    px: number,
    py: number,
    dx: number,
    dy: number,
  ): Cell | null {
    const candidates: Array<[number, number]> = [
      [px + dx, py + dy],
      [px, py],
      [px + 1, py],
      [px - 1, py],
      [px, py + 1],
      [px, py - 1],
      [px + 1, py - 1],
      [px - 1, py - 1],
      [px + 1, py + 1],
      [px - 1, py + 1],
    ];

    for (const [cx, cy] of candidates) {
      const cell = this.getCell(cx, cy);
      if (
        cell &&
        cell.terrain === 'LOT' &&
        (cell.state === 'BUILDING_1' ||
          cell.state === 'BUILDING_2' ||
          cell.state === 'BUILDING_3')
      ) {
        return cell;
      }
    }

    for (const [cx, cy] of candidates) {
      const cell = this.getCell(cx, cy);
      if (cell && cell.terrain === 'LOT' && cell.state === 'EMPTY') {
        return cell;
      }
    }

    return null;
  }

  private igniteCell(cell: Cell, weapon: WeaponSpec, instantAsh: boolean): void {
    if (cell.terrain !== 'LOT') return;

    if (instantAsh) {
      cell.state = 'ASH';
      cell.buildingLevel = 0;
      cell.durability = 0;
      cell.maxDurability = 0;
      cell.ashTimerSec = 0;
      return;
    }

    if (cell.state === 'EMPTY') {
      cell.buildingLevel = 1;
      cell.durability = 55;
      cell.maxDurability = 55;
    } else if (cell.state !== 'BURNING') {
      cell.maxDurability = Math.max(cell.durability, 80);
    }

    cell.state = 'BURNING';
    cell.spreadProbPerSec = Math.max(cell.spreadProbPerSec, weapon.spreadProbPerSec);
    cell.burnDamagePerSec = Math.max(cell.burnDamagePerSec, weapon.burnDamagePerSec);
    cell.ashTimerSec = 0;
  }

  public update(dt: number, moveInput: Direction, audio?: AudioCallbacks): void {
    if (this.badEnd) {
      this.badEndTimerSec += dt;
      return;
    }

    if (this.manifestCooldownSec > 0) {
      this.manifestCooldownSec = Math.max(0, this.manifestCooldownSec - dt);
    }

    if (this.isManifesting) {
      this.manifestTimerSec -= dt;
      if (this.manifestTimerSec <= 0) {
        this.completeCantiManifestation();
      }
      return;
    }

    this.elapsedSec += dt;
    this.updateDayCycle();
    this.updateTimersAndText(dt);
    this.updatePlayer(dt, moveInput, audio);
    this.updateProliferation(dt);
    this.updateCellsAndFireSpread(dt);
    this.syncNpcCounts();
    this.updateFirefighters(dt);
    this.updatePolice(dt, moveInput, audio);
    this.updateGauges(dt, audio);
    this.updateEffects(dt);
  }

  private updateDayCycle(): void {
    const newDay = Math.floor(this.elapsedSec / CONFIG.TIME.SECONDS_PER_DAY) + 1;
    if (newDay === this.day) return;

    this.day = newDay;
    const unlockedJustNow = CONFIG.WEAPONS.find((w) => w.unlockDay === this.day);
    if (unlockedJustNow) {
      this.player.weaponIndex = unlockedJustNow.index;
    }

    if (this.day === 2 || this.day === 4 || this.day === 6 || this.day % 2 === 0) {
      this.triggerDayNarration(this.day);
    }
  }

  private triggerDayNarration(day: number): void {
    this.narrationText = getNarrationForDay(this.textMode, day);
    this.narrationTimerSec = CONFIG.TIME.NARRATION_DISPLAY_SEC;
    this.narrationTotalSec = CONFIG.TIME.NARRATION_DISPLAY_SEC;
  }

  private updateTimersAndText(dt: number): void {
    if (this.player.cooldownSec > 0) {
      this.player.cooldownSec = Math.max(0, this.player.cooldownSec - dt);
    }
    if (this.policeAlertTimerSec > 0) {
      this.policeAlertTimerSec = Math.max(0, this.policeAlertTimerSec - dt);
    }
    if (this.narrationTimerSec > 0) {
      this.narrationTimerSec = Math.max(0, this.narrationTimerSec - dt);
    }
    if (this.realityTextVisibleSec > 0) {
      this.realityTextVisibleSec = Math.max(0, this.realityTextVisibleSec - dt);
    }

    this.realityTextTimerSec -= dt;
    if (this.realityTextTimerSec <= 0) {
      this.realityTextTimerSec = CONFIG.TIME.REALITY_TEXT_INTERVAL_SEC;
      this.realityText = this.selectRealityText();
      this.realityTextVisibleSec = 4.6;
    }
  }

  private selectRealityText(): string {
    const pack = TEXT_PACKS[this.textMode].realityTexts;
    if (this.destruction >= CONFIG.GAUGE.REALITY_TEXT_DESTRUCTION_HIGH) {
      return pack.destructionHigh[Math.floor(Math.random() * pack.destructionHigh.length)];
    }
    if (this.suffocation >= CONFIG.GAUGE.REALITY_TEXT_SUFFOCATION_HIGH) {
      return pack.suffocationHigh[Math.floor(Math.random() * pack.suffocationHigh.length)];
    }
    return pack.normal[Math.floor(Math.random() * pack.normal.length)];
  }

  private updatePlayer(dt: number, moveInput: Direction, audio?: AudioCallbacks): void {
    const { dx, dy } = moveInput;
    if (dx === 0 && dy === 0) return;

    // Quickly fade narration overlay once the player starts moving
    if (this.narrationTimerSec > 0.75) {
      this.narrationTimerSec = Math.max(0.75, this.narrationTimerSec - dt * 2.5);
    }

    const length = Math.hypot(dx, dy);
    const normX = dx / length;
    const normY = dy / length;

    this.player.facing = {
      dx: Math.sign(dx),
      dy: Math.sign(dy),
    };

    const speed = CONFIG.ACTORS.PLAYER_SPEED_CELLS_PER_SEC;
    const nextX = this.player.x + normX * speed * dt;
    const nextY = this.player.y + normY * speed * dt;

    if (this.isWalkableForPlayer(nextX, this.player.y)) {
      this.player.x = nextX;
    }
    if (this.isWalkableForPlayer(this.player.x, nextY)) {
      this.player.y = nextY;
    }

    this.player.stepPhase += dt * 10;
    this.stepAccumulator += dt;
    if (this.stepAccumulator >= 0.22) {
      this.stepAccumulator = 0;
      audio?.onMoveStep();
    }
  }

  private isWalkableForPlayer(x: number, y: number): boolean {
    if (x < 0.4 || x >= CONFIG.GRID_COLS - 0.4) return false;
    if (y < 1.2 || y >= CONFIG.GRID_ROWS - 0.4) return false;
    const cell = this.getCell(Math.floor(x), Math.floor(y));
    if (!cell) return false;
    return cell.terrain !== 'RIVER';
  }

  private updateProliferation(dt: number): void {
    // Slow down building proliferation when Suffocation is already high
    const highSufDamping = this.suffocation > 70 ? 0.5 : 1.0;
    this.proliferationTimerSec += dt * highSufDamping;

    if (this.proliferationTimerSec < CONFIG.BUILDING.PROLIFERATION_INTERVAL_SEC) {
      return;
    }
    this.proliferationTimerSec -= CONFIG.BUILDING.PROLIFERATION_INTERVAL_SEC;

    const emptyCells = this.buildableCells.filter((c) => c.state === 'EMPTY');
    if (emptyCells.length > 0) {
      const target = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.setBuildingState(target, 1);
    }

    if (Math.random() < CONFIG.BUILDING.UPGRADE_CHANCE_ON_TICK) {
      const upgradable = this.buildableCells.filter(
        (c) => c.state === 'BUILDING_1' || c.state === 'BUILDING_2',
      );
      if (upgradable.length > 0) {
        const target = upgradable[Math.floor(Math.random() * upgradable.length)];
        const nextLevel = target.state === 'BUILDING_1' ? 2 : 3;
        this.setBuildingState(target, nextLevel);
      }
    }
  }

  private updateCellsAndFireSpread(dt: number): void {
    const newlyIgnited: Array<{ cell: Cell; prob: number; dmg: number }> = [];

    // Automatically dampen fire spread when Destruction > 60% so the city doesn't accidentally hit 100%
    const spreadDamping =
      this.destruction > 60
        ? Math.max(0.08, 1 - (this.destruction - 60) / 32)
        : 1.0;

    for (const cell of this.buildableCells) {
      cell.flickerPhase += dt * 12;

      if (cell.state === 'ASH') {
        cell.ashTimerSec += dt;
        if (cell.ashTimerSec >= CONFIG.GAUGE.ASH_RECOVERY_SEC) {
          cell.state = 'EMPTY';
          cell.buildingLevel = 0;
          cell.ashTimerSec = 0;
        }
        continue;
      }

      if (cell.state !== 'BURNING') continue;

      cell.durability -= cell.burnDamagePerSec * dt;
      if (cell.durability <= 0) {
        cell.state = 'ASH';
        cell.buildingLevel = 0;
        cell.durability = 0;
        cell.ashTimerSec = 0;
        continue;
      }

      const neighbors = [
        this.getCell(cell.x + 1, cell.y),
        this.getCell(cell.x - 1, cell.y),
        this.getCell(cell.x, cell.y + 1),
        this.getCell(cell.x, cell.y - 1),
      ];

      for (const nb of neighbors) {
        if (!nb || nb.terrain !== 'LOT') continue;
        const isFlammable =
          nb.state === 'BUILDING_1' ||
          nb.state === 'BUILDING_2' ||
          nb.state === 'BUILDING_3';
        if (!isFlammable) continue;

        if (Math.random() < cell.spreadProbPerSec * spreadDamping * dt) {
          newlyIgnited.push({
            cell: nb,
            prob: cell.spreadProbPerSec,
            dmg: cell.burnDamagePerSec,
          });
        }
      }
    }

    for (const item of newlyIgnited) {
      if (item.cell.state === 'BURNING') continue;
      item.cell.state = 'BURNING';
      item.cell.spreadProbPerSec = item.prob;
      item.cell.burnDamagePerSec = item.dmg;
    }
  }

  private syncNpcCounts(): void {
    const targetFirefighters = Math.min(
      CONFIG.ACTORS.MAX_FIREFIGHTER_COUNT,
      CONFIG.ACTORS.INITIAL_FIREFIGHTER_COUNT +
        Math.floor((this.day - 1) * 0.4 + this.destruction / 30),
    );

    while (this.firefighters.length < targetFirefighters) {
      const spawn = this.pickFarRoadCell(8.0);
      this.firefighters.push({
        id: this.nextNpcId++,
        x: spawn.x + 0.5,
        y: spawn.y + 0.5,
        targetX: spawn.x + 0.5,
        targetY: spawn.y + 0.5,
        isExtinguishing: false,
      });
    }

    const targetPolice = Math.min(
      CONFIG.ACTORS.MAX_POLICE_COUNT,
      CONFIG.ACTORS.INITIAL_POLICE_COUNT +
        Math.floor((this.day - 1) * 0.25 + this.destruction / 45),
    );

    while (this.police.length < targetPolice) {
      const spawn = this.pickFarRoadCell(10.0);
      this.police.push({
        id: this.nextNpcId++,
        x: spawn.x + 0.5,
        y: spawn.y + 0.5,
        dirX: 1,
        dirY: 0,
        isChasing: false,
        stunTimerSec: 0,
      });
    }
  }

  private pickFarRoadCell(minDistance: number): Cell {
    const candidates = this.roadCells.filter(
      (c) => Math.hypot(c.x + 0.5 - this.player.x, c.y + 0.5 - this.player.y) >= minDistance,
    );
    const pool = candidates.length > 0 ? candidates : this.roadCells;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private updateFirefighters(dt: number): void {
    const burningCells = this.buildableCells.filter((c) => c.state === 'BURNING');

    for (const ff of this.firefighters) {
      ff.isExtinguishing = false;

      if (burningCells.length === 0) {
        this.patrolActor(ff, dt, CONFIG.ACTORS.FIREFIGHTER_SPEED_CELLS_PER_SEC * 0.55);
        continue;
      }

      let nearest = burningCells[0];
      let bestDist =
        Math.abs(nearest.x + 0.5 - ff.x) + Math.abs(nearest.y + 0.5 - ff.y);

      for (let i = 1; i < burningCells.length; i++) {
        const candidate = burningCells[i];
        const dist =
          Math.abs(candidate.x + 0.5 - ff.x) + Math.abs(candidate.y + 0.5 - ff.y);
        if (dist < bestDist) {
          bestDist = dist;
          nearest = candidate;
        }
      }

      const dx = nearest.x + 0.5 - ff.x;
      const dy = nearest.y + 0.5 - ff.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= 1.25) {
        ff.isExtinguishing = true;
        nearest.durability += CONFIG.ACTORS.FIREFIGHTER_EXTINGUISH_PER_SEC * dt;
        if (nearest.durability >= nearest.maxDurability) {
          this.restoreExtinguishedCell(nearest);
          this.effects.push({
            type: 'extinguish',
            x: nearest.x + 0.5,
            y: nearest.y + 0.5,
            radius: 1.0,
            timerSec: 0,
            durationSec: 0.25,
          });
        }
        continue;
      }

      this.moveNpcToward(
        ff,
        nearest.x + 0.5,
        nearest.y + 0.5,
        CONFIG.ACTORS.FIREFIGHTER_SPEED_CELLS_PER_SEC,
        dt,
        false,
      );
    }
  }

  private restoreExtinguishedCell(cell: Cell): void {
    if (cell.buildingLevel === 3) {
      this.setBuildingState(cell, 3);
    } else if (cell.buildingLevel === 2) {
      this.setBuildingState(cell, 2);
    } else if (cell.buildingLevel === 1 && cell.maxDurability >= 100) {
      this.setBuildingState(cell, 1);
    } else {
      cell.state = 'EMPTY';
      cell.buildingLevel = 0;
      cell.durability = 0;
      cell.maxDurability = 0;
    }
  }

  private updatePolice(
    dt: number,
    moveInput: Direction,
    audio?: AudioCallbacks,
  ): void {
    const basePlayerSpeed = CONFIG.ACTORS.PLAYER_SPEED_CELLS_PER_SEC;
    const isPlayerMoving = moveInput.dx !== 0 || moveInput.dy !== 0;
    let touchingAnyCop = false;

    for (const cop of this.police) {
      if (cop.stunTimerSec > 0) {
        cop.stunTimerSec = Math.max(0, cop.stunTimerSec - dt);
        cop.isChasing = false;
        continue;
      }

      const distToPlayer = Math.hypot(this.player.x - cop.x, this.player.y - cop.y);

      if (distToPlayer < 0.45) {
        if (isPlayerMoving) {
          // Moving player slips past and shoves the police officer back (2.5s stun)
          cop.stunTimerSec = 2.5;
          cop.isChasing = false;
          const pushX = cop.x + (cop.x - this.player.x) * 2.4;
          const pushY = cop.y + (cop.y - this.player.y) * 2.4;
          if (this.isWalkableForNpc(pushX, pushY, false)) {
            cop.x = pushX;
            cop.y = pushY;
          }
          continue;
        }
        touchingAnyCop = true;
      }

      // Police flinch and retreat if a burning cell is nearby
      const nearbyFire = this.findNearbyBurningCell(cop.x, cop.y, 2.0);
      if (nearbyFire) {
        cop.isChasing = false;
        const awayX = cop.x + (cop.x - (nearbyFire.x + 0.5));
        const awayY = cop.y + (cop.y - (nearbyFire.y + 0.5));
        this.moveNpcToward(
          cop,
          awayX,
          awayY,
          basePlayerSpeed * CONFIG.ACTORS.POLICE_NORMAL_SPEED_RATIO,
          dt,
          true,
        );
        continue;
      }

      const inSight = distToPlayer <= CONFIG.ACTORS.POLICE_SIGHT_RADIUS;
      const inHearingRange =
        this.policeAlertTimerSec > 0 &&
        distToPlayer <= CONFIG.ACTORS.POLICE_ALERT_HEARING_RADIUS;
      cop.isChasing = inSight || inHearingRange;

      if (cop.isChasing) {
        this.moveNpcToward(
          cop,
          this.player.x,
          this.player.y,
          basePlayerSpeed * CONFIG.ACTORS.POLICE_ALERT_SPEED_RATIO,
          dt,
          true,
        );
      } else {
        this.patrolPoliceOnRoad(
          cop,
          basePlayerSpeed * CONFIG.ACTORS.POLICE_NORMAL_SPEED_RATIO,
          dt,
        );
      }
    }

    // Only arrest if the player stands still in contact with police for 2.2s
    if (touchingAnyCop) {
      this.arrestContactTimerSec += dt;
      if (this.arrestContactTimerSec >= 2.2) {
        this.badEnd = 'arrested';
        audio?.onBadEnd('arrested');
      }
    } else {
      this.arrestContactTimerSec = Math.max(0, this.arrestContactTimerSec - dt * 3.0);
    }
  }

  private findNearbyBurningCell(x: number, y: number, radius: number): Cell | null {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    for (let oy = -2; oy <= 2; oy++) {
      for (let ox = -2; ox <= 2; ox++) {
        const cell = this.getCell(cx + ox, cy + oy);
        if (
          cell &&
          cell.state === 'BURNING' &&
          Math.hypot(cell.x + 0.5 - x, cell.y + 0.5 - y) <= radius
        ) {
          return cell;
        }
      }
    }
    return null;
  }

  private moveNpcToward(
    actor: { x: number; y: number },
    targetX: number,
    targetY: number,
    speed: number,
    dt: number,
    avoidFire: boolean,
  ): void {
    let goalX = targetX;
    let goalY = targetY;

    const actorAboveRiver = actor.y < 8.0;
    const actorBelowRiver = actor.y > 10.0;
    const targetAboveRiver = targetY < 8.0;
    const targetBelowRiver = targetY > 10.0;

    if ((actorAboveRiver && targetBelowRiver) || (actorBelowRiver && targetAboveRiver)) {
      const bridgeX = Math.abs(actor.x - 8.0) < Math.abs(actor.x - 20.0) ? 8.0 : 20.0;
      if (Math.abs(actor.x - bridgeX) > 0.9) {
        goalX = bridgeX;
        goalY = actorAboveRiver ? 7.5 : 10.5;
      }
    }

    const dx = goalX - actor.x;
    const dy = goalY - actor.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.05) return;

    const stepX = (dx / dist) * speed * dt;
    const stepY = (dy / dist) * speed * dt;

    if (this.isWalkableForNpc(actor.x + stepX, actor.y, avoidFire)) {
      actor.x += stepX;
    }
    if (this.isWalkableForNpc(actor.x, actor.y + stepY, avoidFire)) {
      actor.y += stepY;
    }
  }

  private patrolActor(
    actor: { x: number; y: number; targetX: number; targetY: number },
    dt: number,
    speed: number,
  ): void {
    const dist = Math.hypot(actor.targetX - actor.x, actor.targetY - actor.y);
    if (dist < 0.6) {
      const road = this.roadCells[Math.floor(Math.random() * this.roadCells.length)];
      actor.targetX = road.x + 0.5;
      actor.targetY = road.y + 0.5;
    }
    this.moveNpcToward(actor, actor.targetX, actor.targetY, speed, dt, false);
  }

  private patrolPoliceOnRoad(cop: Police, speed: number, dt: number): void {
    const nextX = cop.x + cop.dirX * speed * dt;
    const nextY = cop.y + cop.dirY * speed * dt;

    if (this.isWalkableForNpc(nextX, nextY, true)) {
      cop.x = nextX;
      cop.y = nextY;
      if (Math.random() < 0.02) {
        this.pickNewPatrolDirection(cop);
      }
    } else {
      this.pickNewPatrolDirection(cop);
    }
  }

  private pickNewPatrolDirection(cop: Police): void {
    const dirs: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const valid = dirs.filter(([dx, dy]) =>
      this.isWalkableForNpc(cop.x + dx * 0.8, cop.y + dy * 0.8, true),
    );
    const chosen =
      valid.length > 0
        ? valid[Math.floor(Math.random() * valid.length)]
        : dirs[Math.floor(Math.random() * dirs.length)];
    cop.dirX = chosen[0];
    cop.dirY = chosen[1];
  }

  private isWalkableForNpc(x: number, y: number, avoidFire: boolean): boolean {
    if (x < 0.4 || x >= CONFIG.GRID_COLS - 0.4) return false;
    if (y < 1.2 || y >= CONFIG.GRID_ROWS - 0.4) return false;
    const cell = this.getCell(Math.floor(x), Math.floor(y));
    if (!cell || cell.terrain === 'RIVER') return false;
    if (avoidFire && cell.state === 'BURNING') return false;
    return true;
  }

  private updateGauges(dt: number, audio?: AudioCallbacks): void {
    let weightedBuildings = 0;
    let burningCount = 0;
    let ashCount = 0;

    for (const cell of this.buildableCells) {
      if (cell.state === 'BUILDING_1') {
        weightedBuildings += CONFIG.BUILDING.LEVEL_1.weight;
      } else if (cell.state === 'BUILDING_2') {
        weightedBuildings += CONFIG.BUILDING.LEVEL_2.weight;
      } else if (cell.state === 'BUILDING_3') {
        weightedBuildings += CONFIG.BUILDING.LEVEL_3.weight;
      } else if (cell.state === 'BURNING') {
        burningCount++;
      } else if (cell.state === 'ASH') {
        ashCount++;
      }
    }

    let deltaSuffocationPerSec =
      CONFIG.GAUGE.SUFFOCATION_BASE_RATE +
      (weightedBuildings / CONFIG.TOTAL_BUILDABLE_CELLS) *
        CONFIG.GAUGE.SUFFOCATION_BUILDING_FACTOR -
      burningCount * CONFIG.GAUGE.SUFFOCATION_BURNING_RELIEF;

    // Gentle damping near high Suffocation so player has ample time to light a fire
    if (deltaSuffocationPerSec > 0 && this.suffocation > 75) {
      const damping = Math.max(0.22, 1 - (this.suffocation - 75) / 28);
      deltaSuffocationPerSec *= damping;
    }

    this.suffocation = Math.max(
      0,
      Math.min(100, this.suffocation + deltaSuffocationPerSec * dt),
    );

    this.destruction = Math.max(
      0,
      Math.min(
        100,
        ((burningCount + ashCount) / CONFIG.TOTAL_BUILDABLE_CELLS) * 100,
      ),
    );

    if (this.destruction >= 100) {
      this.destruction = 100;
      this.badEnd = 'destruction';
      audio?.onBadEnd('destruction');
      return;
    }

    if (this.suffocation >= 100) {
      this.suffocation = 100;
      this.badEnd = 'suffocation';
      audio?.onBadEnd('suffocation');
    }
  }

  private updateEffects(dt: number): void {
    for (const fx of this.effects) {
      fx.timerSec += dt;
    }
    this.effects = this.effects.filter((fx) => fx.timerSec < fx.durationSec);
  }

  public getCell(x: number, y: number): Cell | null {
    if (x < 0 || x >= CONFIG.GRID_COLS || y < 0 || y >= CONFIG.GRID_ROWS) {
      return null;
    }
    return this.cells[y][x];
  }

  private clampCol(x: number): number {
    return Math.max(1, Math.min(CONFIG.GRID_COLS - 2, x));
  }

  private clampRow(y: number): number {
    return Math.max(1, Math.min(CONFIG.GRID_ROWS - 2, y));
  }
}
