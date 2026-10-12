// Cellular Automaton City Simulation (Endsville Growth & Fire Propagation)

import { GRID_COLS, GRID_ROWS, TILES, BALANCE } from './constants.js';

export class City {
  constructor(cols = GRID_COLS, rows = GRID_ROWS) {
    this.cols = cols;
    this.rows = rows;
    this.grid = new Array(rows).fill(0).map(() => new Array(cols).fill(TILES.ROAD));
    this.health = new Array(rows).fill(1).map(() => new Array(cols).fill(1.0));
    this.fireTimer = new Array(rows).fill(0).map(() => new Array(cols).fill(0));
    this.fireSpreadChance = new Array(rows).fill(0).map(() => new Array(cols).fill(0));
    this.wetTimer = new Array(rows).fill(0).map(() => new Array(cols).fill(0));
    this.growingTimer = new Array(rows).fill(0).map(() => new Array(cols).fill(0)); // Visual warning before solidifying
    this.items = []; // Dropped items on map [{x, y, type}]

    this.growthInterval = BALANCE.GROWTH_INTERVAL;
    this.timeSinceGrowth = 0;
    this.fireTickTimer = 0;
    this.totalBuildingsBurned = 0;
    this.totalFiresStarted = 0;
  }

  init(initialRatio = BALANCE.INITIAL_BUILDING_RATIO, playerSpawn = { x: 10, y: 10 }) {
    this.growthInterval = BALANCE.GROWTH_INTERVAL;
    this.timeSinceGrowth = 0;
    this.fireTickTimer = 0;
    this.totalBuildingsBurned = 0;
    this.totalFiresStarted = 0;
    this.items = [];

    // Clear grid
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = TILES.ROAD;
        this.health[r][c] = 1.0;
        this.fireTimer[r][c] = 0;
        this.fireSpreadChance[r][c] = 0;
        this.wetTimer[r][c] = 0;
        this.growingTimer[r][c] = 0;
      }
    }

    // Seed procedural city clusters (urban blocks)
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        // Keep player spawn and 3x3 surrounding cross clear
        const dist = Math.abs(c - playerSpawn.x) + Math.abs(r - playerSpawn.y);
        if (dist <= 2) continue;

        // Street grid layout with noise
        const isStreet = (r % 4 === 0) || (c % 4 === 0);
        if (!isStreet && Math.random() < (initialRatio * 1.5)) {
          this.grid[r][c] = TILES.BUILDING;
          this.health[r][c] = 1.0;
        } else if (isStreet && Math.random() < 0.12) {
          this.grid[r][c] = TILES.BUILDING;
          this.health[r][c] = 1.0;
        }
      }
    }
  }

  isValid(c, r) {
    return c >= 0 && c < this.cols && r >= 0 && r < this.rows;
  }

  isWalkable(c, r) {
    if (!this.isValid(c, r)) return false;
    const tile = this.grid[r][c];
    // Solid buildings or actively blazing fires block walking
    if (tile === TILES.BUILDING) return false;
    if (this.fireTimer[r][c] > 0) return false;
    return true;
  }

  isFlammable(c, r) {
    if (!this.isValid(c, r)) return false;
    if (this.wetTimer[r][c] > 0) return false;
    if (this.fireTimer[r][c] > 0) return false;
    // Buildings can burn; ash with debris can also reignite with lower resistance
    return this.grid[r][c] === TILES.BUILDING;
  }

  ignite(c, r, itemConfig) {
    if (!this.isValid(c, r)) return false;
    if (this.wetTimer[r][c] > 0) return false;

    // Direct hit on building or road
    this.fireTimer[r][c] = itemConfig.burnDuration;
    this.fireSpreadChance[r][c] = itemConfig.spreadChance;
    this.totalFiresStarted++;
    return true;
  }

  extinguish(c, r) {
    if (!this.isValid(c, r)) return false;
    if (this.fireTimer[r][c] > 0) {
      this.fireTimer[r][c] = 0;
      this.fireSpreadChance[r][c] = 0;
      this.wetTimer[r][c] = BALANCE.WATER_DURATION;
      this.grid[r][c] = TILES.WET;
      return true;
    }
    return false;
  }

  // Count orthogonal building neighbors
  countBuildingNeighbors(c, r) {
    let count = 0;
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (this.isValid(nc, nr) && this.grid[nr][nc] === TILES.BUILDING) {
        count++;
      }
    }
    return count;
  }

  // Cellular Automaton Urban Growth Step
  stepGrowth(playerPos) {
    const nextGrid = this.grid.map(row => [...row]);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        // Tiles currently on fire or wet do not sprout
        if (this.fireTimer[r][c] > 0 || this.wetTimer[r][c] > 0) continue;

        const current = this.grid[r][c];

        if (current === TILES.ROAD || current === TILES.ASH) {
          const neighbors = this.countBuildingNeighbors(c, r);

          // Growth rule: 2 or 3 adjacent buildings induce urban sprawl
          let sproutChance = 0;
          if (neighbors >= 2 && neighbors <= 3) {
            sproutChance = 0.30;
          } else if (neighbors === 1) {
            sproutChance = 0.08;
          } else if (neighbors === 4) {
            sproutChance = 0.45;
          }

          // Ash has a small fertility recovery chance
          if (current === TILES.ASH) {
            sproutChance *= 0.5;
          }

          // Do not directly crush player instantly without notice; give warning
          const distToPlayer = Math.abs(c - playerPos.x) + Math.abs(r - playerPos.y);
          if (distToPlayer === 0) {
            sproutChance = 0; // Don't spawn directly beneath player
          }

          if (Math.random() < sproutChance) {
            nextGrid[r][c] = TILES.BUILDING;
            this.health[r][c] = 1.0;
          }
        }
      }
    }

    this.grid = nextGrid;

    // Speed up growth gradually
    this.growthInterval = Math.max(
      BALANCE.MIN_GROWTH_INTERVAL,
      this.growthInterval * BALANCE.GROWTH_ACCELERATION
    );
  }

  update(dt, playerPos, onBuildingDestroyed = null) {
    // 1. Update Wet Cooldowns
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.wetTimer[r][c] > 0) {
          this.wetTimer[r][c] -= dt;
          if (this.wetTimer[r][c] <= 0) {
            this.wetTimer[r][c] = 0;
            if (this.grid[r][c] === TILES.WET) {
              this.grid[r][c] = TILES.ROAD;
            }
          }
        }
      }
    }

    // 2. Fire Simulation & Damage
    this.fireTickTimer += dt;
    const isSpreadTick = this.fireTickTimer >= (BALANCE.FIRE_TICK_INTERVAL || 0.30);
    if (isSpreadTick) this.fireTickTimer = 0;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.fireTimer[r][c] > 0) {
          this.fireTimer[r][c] -= dt;

          // Damage building if standing on one
          if (this.grid[r][c] === TILES.BUILDING) {
            this.health[r][c] -= BALANCE.BURNING_DAMAGE_RATE * dt;
            if (this.health[r][c] <= 0) {
              this.grid[r][c] = TILES.ASH;
              this.health[r][c] = 0;
              this.totalBuildingsBurned++;

              // Trigger score & item drop callback
              if (onBuildingDestroyed) {
                onBuildingDestroyed(c, r);
              }

              // Roll for item drop
              if (Math.random() < BALANCE.ITEM_DROP_CHANCE) {
                this.dropRandomItem(c, r);
              }
            }
          }

          // Fire Spread Check
          if (isSpreadTick && this.fireTimer[r][c] > 0.5) {
            const spreadChance = this.fireSpreadChance[r][c];
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (const [dc, dr] of dirs) {
              const nc = c + dc;
              const nr = r + dr;
              if (this.isFlammable(nc, nr) && Math.random() < spreadChance) {
                this.fireTimer[nr][nc] = Math.max(3.0, this.fireTimer[r][c] * 0.9);
                this.fireSpreadChance[nr][nc] = spreadChance * 0.95;
              }
            }
          }

          // Fire burns out
          if (this.fireTimer[r][c] <= 0) {
            this.fireTimer[r][c] = 0;
            this.fireSpreadChance[r][c] = 0;
            if (this.grid[r][c] === TILES.BUILDING) {
              this.grid[r][c] = TILES.ASH;
            }
          }
        }
      }
    }

    // 3. Autonomous City Growth
    this.timeSinceGrowth += dt;
    if (this.timeSinceGrowth >= this.growthInterval) {
      this.timeSinceGrowth = 0;
      this.stepGrowth(playerPos);
    }
  }

  dropRandomItem(c, r) {
    const roll = Math.random();
    let type = 'MATCH';
    if (roll < 0.40) {
      type = 'MATCH';
    } else if (roll < 0.70) {
      type = 'LIGHTER';
    } else if (roll < 0.90) {
      type = 'MOLOTOV';
    } else {
      type = 'TIME_BOMB';
    }
    this.items.push({ x: c, y: r, type });
  }

  collectItem(playerTileX, playerTileY) {
    const index = this.items.findIndex(it => it.x === playerTileX && it.y === playerTileY);
    if (index !== -1) {
      const item = this.items[index];
      this.items.splice(index, 1);
      return item;
    }
    return null;
  }

  getBuildingCount() {
    let count = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === TILES.BUILDING) count++;
      }
    }
    return count;
  }

  getTotalTiles() {
    return this.cols * this.rows;
  }

  getBuildingRatio() {
    return this.getBuildingCount() / this.getTotalTiles();
  }

  getActiveFires() {
    const fires = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.fireTimer[r][c] > 0) {
          fires.push({ x: c, y: r });
        }
      }
    }
    return fires;
  }

  // Breadth-First Search Pathfinding on walkable tiles
  findPath(startC, startR, targetC, targetR, allowNearTarget = true) {
    if (startC === targetC && startR === targetR) return [];

    const queue = [[startC, startR]];
    const visited = new Array(this.rows).fill(0).map(() => new Array(this.cols).fill(false));
    const parent = new Map();

    visited[startR][startC] = true;
    let found = false;

    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    while (queue.length > 0) {
      const [currC, currR] = queue.shift();

      if (currC === targetC && currR === targetR) {
        found = true;
        break;
      }

      for (const [dc, dr] of dirs) {
        const nextC = currC + dc;
        const nextR = currR + dr;

        if (this.isValid(nextC, nextR) && !visited[nextR][nextC]) {
          const isTarget = (nextC === targetC && nextR === targetR);
          // Walkable tile, or target tile if allowNearTarget
          if (this.isWalkable(nextC, nextR) || (allowNearTarget && isTarget)) {
            visited[nextR][nextC] = true;
            parent.set(`${nextC},${nextR}`, [currC, currR]);
            queue.push([nextC, nextR]);
          }
        }
      }
    }

    if (!found) return null;

    // Reconstruct path
    const path = [];
    let curKey = `${targetC},${targetR}`;
    while (parent.has(curKey)) {
      const [pc, pr] = parent.get(curKey);
      const [cc, cr] = curKey.split(',').map(Number);
      path.unshift({ x: cc, y: cr });
      curKey = `${pc},${pr}`;
    }

    return path;
  }
}
