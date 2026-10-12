// Autonomous Bot Agent for Fire Starter (Grandmaster AI - Macro Heatmap, BFS Lookahead & Ammo Supply)

import { TILES, GAME_STATES, ITEM_LIST } from './constants.js';

export class BotAgent {
  constructor() {
    this.decisionTimer = 0;
    this.fireCooldown = 0;
    this.bombCooldown = 0;
    this.macroTargetTimer = 0;
    this.currentMacroHotspot = null;
    this.escapeTimer = 0;
    this.escapeDir = null;
    this.lastTile = null;
    this.stuckTimer = 0;
  }

  reset() {
    this.decisionTimer = 0;
    this.fireCooldown = 0;
    this.bombCooldown = 0;
    this.macroTargetTimer = 0;
    this.currentMacroHotspot = null;
    this.escapeTimer = 0;
    this.escapeDir = null;
    this.lastTile = null;
    this.stuckTimer = 0;
  }

  computeInput(game, dt = 0.016) {
    const input = {
      up: false,
      down: false,
      left: false,
      right: false,
      aJustPressed: false,
      bJustPressed: false,
      bHeld: false,
      startJustPressed: false,
      selectJustPressed: false
    };

    if (!game) return input;

    // Handle Title Screen: Auto Start
    if (game.state === GAME_STATES.TITLE) {
      input.startJustPressed = true;
      return input;
    }

    // Handle Game Over: Auto Restart
    if (game.state === GAME_STATES.GAME_OVER) {
      this.decisionTimer += dt;
      if (this.decisionTimer > 0.8) {
        input.aJustPressed = true;
        this.decisionTimer = 0;
      }
      return input;
    }

    // Handle Pause & Modals: Resume immediately
    if (game.state === GAME_STATES.PAUSED || game.state === GAME_STATES.TRIBUTE_STATS) {
      input.startJustPressed = true;
      return input;
    }

    if (game.state !== GAME_STATES.PLAYING) {
      return input;
    }

    const city = game.city;
    const player = game.player;
    if (!city || !player) return input;

    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.bombCooldown > 0) this.bombCooldown -= dt;

    const pTile = player.getTile();
    const ratio = city.getBuildingRatio();

    // Track stationary camping time
    if (this.lastTile && this.lastTile.x === pTile.x && this.lastTile.y === pTile.y) {
      this.stuckTimer += dt;
    } else {
      this.stuckTimer = 0;
      this.lastTile = { ...pTile };
    }

    // 1. Macro Heatmap Hotspot Update (every 1.2 seconds)
    this.macroTargetTimer -= dt;
    if (this.macroTargetTimer <= 0) {
      this.macroTargetTimer = 1.2;
      this.currentMacroHotspot = this.findMacroHotspot(city, pTile);
    }

    // 2. Police Threat Analysis
    const activePolice = (game.policeUnits || []).filter(
      p => p.state !== 'DESPAWNED' && p.state !== 'RETREAT' && p.stunTimer <= 0
    );

    let closestPolice = null;
    let minPoliceDist = Infinity;
    for (const police of activePolice) {
      const dist = Math.hypot(police.x - player.x, police.y - player.y);
      if (dist < minPoliceDist) {
        minPoliceDist = dist;
        closestPolice = police;
      }
    }

    const policeChase = closestPolice !== null && closestPolice.state === 'CHASE';
    const policeNear = closestPolice !== null && minPoliceDist < 4.2;
    const policeCritical = closestPolice !== null && minPoliceDist < 2.0;

    // 3. Escape Routes & Open Space Evaluation
    const safeExits = this.getSafeExits(city, pTile.x, pTile.y);
    // 4. Smart Weapon Selection (Supply Chain Aware)
    // NOTE: TIME_BOMB detonates into a 5x5 fire explosion (burn duration 6.0s) that cuts off roads
    // and causes fatal self-trapping. The Grandmaster AI strictly seals TIME_BOMB, focusing on
    // high-mobility, agile weapons: Zippo Lighter, Molotov, and Match.
    const currentItem = player.getSelectedItem();
    let desiredWeapon = 'MATCH';

    if (policeCritical && player.ammo.MOLOTOV > 0) {
      desiredWeapon = 'MOLOTOV';
    } else if (player.ammo.LIGHTER > 0 && ratio > 0.16) {
      // Primary weapon: Zippo Lighter (high efficiency, fast burn)
      desiredWeapon = 'LIGHTER';
    } else if (player.ammo.MOLOTOV > 0 && ratio > 0.35) {
      // Secondary weapon: Molotov for ranged cluster demolition
      desiredWeapon = 'MOLOTOV';
    } else if (player.ammo.MATCH > 0) {
      desiredWeapon = 'MATCH';
    } else {
      // Cycle to any available agile ammunition (excluding suicidal TIME_BOMB)
      for (const item of ITEM_LIST) {
        if (item.id !== 'TIME_BOMB' && player.ammo[item.id] > 0) {
          desiredWeapon = item.id;
          break;
        }
      }
    }

    // Cycle inventory toward desired weapon
    if (currentItem.id !== desiredWeapon && !player.dashing) {
      input.bJustPressed = true;
    }

    // 5. Active Strategic Ignition
    // Full-burn guard: Never ignite when city is under 13% ratio
    const allowBurning = ratio >= 0.13 && safeExits.length >= 2;
    let turnToTarget = null;

    if (allowBurning && this.fireCooldown <= 0) {
      // Cycle away immediately if TIME_BOMB is held; never detonate
      if (currentItem.id === 'TIME_BOMB') {
        input.bJustPressed = true;
      } else if (currentItem.id === 'MOLOTOV' && player.ammo.MOLOTOV > 0) {
        const molotovTarget = this.findSafeMolotovTarget(city, pTile);
        if (molotovTarget) {
          turnToTarget = molotovTarget;
          input.aJustPressed = true;
          this.fireCooldown = 0.40;
        }
      } else {
        // Direct Ignition: Match or Zippo
        const adjacent = this.findAdjacentFlammable(city, pTile);
        if (adjacent) {
          const comboExpiring = game.comboCount > 0 && game.comboTimer < 1.8;
          const shouldBurn = ratio > 0.20 || comboExpiring || policeNear;

          if (shouldBurn) {
            turnToTarget = adjacent.dir;
            input.aJustPressed = true;
            this.fireCooldown = 0.13; // Highly responsive rapid-fire
          }
        }
      }
    }

    // 6. Intelligent Navigation (BFS Lookahead + Macro Heatmap + Item Drone)
    if (this.escapeTimer > 0 && this.escapeDir) {
      this.escapeTimer -= dt;
      input.bHeld = true; // Sprint away from bomb
      if (this.escapeDir.dx < 0) input.left = true;
      else if (this.escapeDir.dx > 0) input.right = true;
      if (this.escapeDir.dy < 0) input.up = true;
      else if (this.escapeDir.dy > 0) input.down = true;
    } else {
      const bestMove = this.chooseBestDirection(
        game,
        pTile,
        closestPolice,
        minPoliceDist,
        ratio,
        turnToTarget,
        this.currentMacroHotspot
      );

      if (bestMove) {
        if (bestMove.dx < 0) input.left = true;
        else if (bestMove.dx > 0) input.right = true;
        if (bestMove.dy < 0) input.up = true;
        else if (bestMove.dy > 0) input.down = true;
      }
    }

    // 7. Dash & Stamina Management (Sprint to extinguish high-density outbreaks before 90% threshold!)
    const highDensitySprint = ratio > 0.50 && player.stamina > 25;
    if ((policeChase || policeCritical || this.escapeTimer > 0 || ratio > 0.72 || highDensitySprint) && player.stamina > 20) {
      input.bHeld = true;
    }

    return input;
  }

  // Divide map into 4x4 quadrants and locate the densest accessible sector
  findMacroHotspot(city, pTile) {
    const sectorSize = 5; // 20 / 4 = 5 tiles per sector
    let maxScore = -Infinity;
    let bestCenter = null;

    for (let sy = 0; sy < 4; sy++) {
      for (let sx = 0; sx < 4; sx++) {
        let buildings = 0;
        let total = 0;
        const centerX = sx * sectorSize + Math.floor(sectorSize / 2);
        const centerY = sy * sectorSize + Math.floor(sectorSize / 2);

        for (let r = sy * sectorSize; r < (sy + 1) * sectorSize; r++) {
          for (let c = sx * sectorSize; c < (sx + 1) * sectorSize; c++) {
            if (city.isValid(c, r)) {
              total++;
              if (city.grid[r][c] === TILES.BUILDING) buildings++;
            }
          }
        }

        const density = total > 0 ? (buildings / total) : 0;
        const distToPlayer = Math.hypot(centerX - pTile.x, centerY - pTile.y);
        // Strongly prioritize high density sectors over distance to extinguish remote clusters
        const score = density * 300 - distToPlayer * 1.5;

        if (score > maxScore && density >= 0.30) {
          maxScore = score;
          bestCenter = { x: centerX, y: centerY, density };
        }
      }
    }

    return bestCenter;
  }

  // BFS Reachability Depth: Count accessible unburned tiles reachable from (startX, startY)
  evaluateEscapeBreadth(city, startX, startY, maxDepth = 15) {
    if (!city.isValid(startX, startY) || !city.isWalkable(startX, startY) || city.fireTimer[startY][startX] > 0) {
      return 0;
    }

    const queue = [[startX, startY, 0]];
    const visited = new Set([`${startX},${startY}`]);
    let reachableCount = 0;
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    while (queue.length > 0 && reachableCount < maxDepth) {
      const [cx, cy, d] = queue.shift();
      reachableCount++;

      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        const key = `${nx},${ny}`;
        if (city.isValid(nx, ny) && !visited.has(key)) {
          visited.add(key);
          if (city.isWalkable(nx, ny) && city.fireTimer[ny][nx] <= 0) {
            queue.push([nx, ny, d + 1]);
          }
        }
      }
    }

    return reachableCount;
  }

  getSafeExits(city, x, y) {
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    const safe = [];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (city.isValid(nx, ny) && city.isWalkable(nx, ny) && city.fireTimer[ny][nx] <= 0) {
        safe.push({ x: nx, y: ny, dx, dy });
      }
    }
    return safe;
  }

  findLongEscapeRoute(city, x, y, minSteps = 4) {
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    for (const d of dirs) {
      let isClear = true;
      for (let s = 1; s <= minSteps; s++) {
        const nx = x + d.dx * s;
        const ny = y + d.dy * s;
        if (!city.isValid(nx, ny) || !city.isWalkable(nx, ny) || city.fireTimer[ny][nx] > 0) {
          isClear = false;
          break;
        }
      }
      if (isClear) return d;
    }
    return null;
  }

  findAdjacentFlammable(city, pTile) {
    const dirs = [
      { name: 'UP', dx: 0, dy: -1 },
      { name: 'DOWN', dx: 0, dy: 1 },
      { name: 'LEFT', dx: -1, dy: 0 },
      { name: 'RIGHT', dx: 1, dy: 0 }
    ];

    for (const d of dirs) {
      const nx = pTile.x + d.dx;
      const ny = pTile.y + d.dy;
      if (city.isValid(nx, ny) && city.isFlammable(nx, ny) && city.fireTimer[ny][nx] <= 0) {
        return { dir: d.name, x: nx, y: ny };
      }
    }
    return null;
  }

  findSafeMolotovTarget(city, pTile) {
    const dirs = [
      { name: 'UP', dx: 0, dy: -3, checkDx: 0, checkDy: -1 },
      { name: 'DOWN', dx: 0, dy: 3, checkDx: 0, checkDy: 1 },
      { name: 'LEFT', dx: -3, dy: 0, checkDx: -1, checkDy: 0 },
      { name: 'RIGHT', dx: 3, dy: 0, checkDx: 1, checkDy: 0 }
    ];

    for (const d of dirs) {
      const tx = pTile.x + d.dx;
      const ty = pTile.y + d.dy;
      const nearX = pTile.x + d.checkDx;
      const nearY = pTile.y + d.checkDy;

      if (city.isValid(tx, ty) && city.isValid(nearX, nearY)) {
        if (city.fireTimer[nearY][nearX] <= 0) {
          if (city.isFlammable(tx, ty)) {
            return d.name;
          }
        }
      }
    }
    return null;
  }

  chooseBestDirection(game, pTile, closestPolice, policeDist, ratio, turnToTarget, macroHotspot) {
    const city = game.city;
    const candidates = [
      { dx: 0, dy: -1, name: 'UP' },
      { dx: 0, dy: 1, name: 'DOWN' },
      { dx: -1, dy: 0, name: 'LEFT' },
      { dx: 1, dy: 0, name: 'RIGHT' },
      { dx: 0, dy: 0, name: 'STAY' }
    ];

    let bestScore = -Infinity;
    let bestCandidate = null;

    for (const cand of candidates) {
      const nx = pTile.x + cand.dx;
      const ny = pTile.y + cand.dy;

      if (cand.dx === 0 && cand.dy === 0) {
        if (city.fireTimer[ny][nx] > 0) continue;
        if (closestPolice && policeDist < 3.2) continue;
        // Dynamic anti-stuck penalty: discourage stationary camping in an expanding city
        const stayPenalty = 20 + Math.min(200, this.stuckTimer * 150);
        const stayScore = this.evaluateTile(game, nx, ny, closestPolice, ratio, macroHotspot) - stayPenalty;
        if (stayScore > bestScore) {
          bestScore = stayScore;
          bestCandidate = cand;
        }
        continue;
      }

      if (!city.isValid(nx, ny)) continue;
      if (!city.isWalkable(nx, ny)) continue;
      if (city.fireTimer[ny][nx] > 0) continue; // NEVER step into active fire!

      let score = this.evaluateTile(game, nx, ny, closestPolice, ratio, macroHotspot);

      if (turnToTarget && cand.name === turnToTarget) {
        score += 30;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = cand;
      }
    }

    return bestCandidate;
  }

  evaluateTile(game, x, y, closestPolice, ratio, macroHotspot) {
    const city = game.city;
    const player = game.player;
    let score = 100;

    // 1. Strong Repulsion from Police (huge threat)
    if (closestPolice) {
      const dist = Math.hypot(closestPolice.x - x, closestPolice.y - y);
      if (dist < 1.5) score -= 1400; // Critical death threat
      else if (dist < 3.0) score -= 700;
      else if (dist < 5.0) score -= 250;
      else score += dist * 40;
    }

    // 2. BFS Escape Breadth (Eliminate U-turn cul-de-sacs!)
    const reachableBreadth = this.evaluateEscapeBreadth(city, x, y, 12);
    if (reachableBreadth <= 2) score -= 900; // Complete death trap
    else if (reachableBreadth <= 5) score -= 400; // Shallow pocket
    else score += reachableBreadth * 30; // Strongly favor broad road networks

    // 3. Immediate Adjacent Safe Exits & Flame Avoidance
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    let adjacentFires = 0;
    let adjacentFlammableBuildings = 0;

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (city.isValid(nx, ny)) {
        if (city.fireTimer[ny][nx] > 0) adjacentFires++;
        if (city.isFlammable(nx, ny) && city.fireTimer[ny][nx] <= 0) adjacentFlammableBuildings++;
      }
    }

    score -= adjacentFires * 90; // Heavy penalty for standing directly in flame heat

    // 4. Proximity to Flammable Targets
    if (ratio > 0.18) {
      score += adjacentFlammableBuildings * 35;
    }

    // 5. Ammo Supply Chain (Drone Attraction to Dropped Items)
    if (city.items && city.items.length > 0) {
      let closestItemDist = Infinity;
      for (const item of city.items) {
        const d = Math.abs(item.x - x) + Math.abs(item.y - y);
        if (d < closestItemDist) closestItemDist = d;
      }

      // If ammo is low (under 8 rounds), skyrocket item attraction!
      const totalAmmo = (player.ammo.MATCH || 0) + (player.ammo.LIGHTER || 0);
      const urgency = totalAmmo < 8 ? 70 : 35;

      if (closestItemDist <= 8) {
        score += (9 - closestItemDist) * urgency;
      }
    }

    // 6. Macro Heatmap Hotspot Gravity (Scale pull with city density to crush remote outbreaks!)
    if (macroHotspot && ratio > 0.28) {
      const distToHotspot = Math.hypot(macroHotspot.x - x, macroHotspot.y - y);
      const hotspotWeight = ratio > 0.45 ? 12 : 8;
      score += (20 - distToHotspot) * hotspotWeight; // Steer toward the densest sector
    }

    // 7. Soft Perimeter & Corner Apex Guidance
    const isCorner = (x === 0 || x === city.cols - 1) && (y === 0 || y === city.rows - 1);
    const isEdge = x === 0 || x === city.cols - 1 || y === 0 || y === city.rows - 1;
    if (isCorner) score -= 350;
    else if (isEdge) score -= 60;

    // 8. Center-seeking Gravity (avoid corner traps)
    const distToCenterX = Math.abs(x - city.cols / 2);
    const distToCenterY = Math.abs(y - city.rows / 2);
    score -= (distToCenterX + distToCenterY) * 2.5;

    return score;
  }
}
