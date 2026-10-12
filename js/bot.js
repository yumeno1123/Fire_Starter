// Autonomous Bot Agent for Fire Starter (Rule-Based Heuristic AI)

import { TILES, GAME_STATES } from './constants.js';

export class BotAgent {
  constructor() {
    this.decisionTimer = 0;
    this.currentAction = {
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
    this.targetTile = null;
    this.actionCooldown = 0;
  }

  reset() {
    this.decisionTimer = 0;
    this.targetTile = null;
    this.actionCooldown = 0;
    this.currentAction = {
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
  }

  computeInput(game, dt = 0.016) {
    // Fresh input object
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

    // Handle Title Screen & Menus: Auto Start
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

    const pTile = player.getTile();
    const ratio = city.getBuildingRatio();

    // Active threats
    const activePolice = (game.policeUnits || []).filter(
      p => p.state !== 'DESPAWNED' && p.state !== 'RETREAT' && p.stunTimer <= 0
    );

    // 1. Threat Assessment: Police Proximity
    let closestPolice = null;
    let minPoliceDist = Infinity;
    for (const police of activePolice) {
      const dist = Math.hypot(police.x - player.x, police.y - player.y);
      if (dist < minPoliceDist) {
        minPoliceDist = dist;
        closestPolice = police;
      }
    }

    const underImmediateThreat = closestPolice !== null && minPoliceDist < 4.5;
    const inMeleeDanger = closestPolice !== null && minPoliceDist < 2.0;

    // 2. Weapon Selection & Defense Action
    const currentItem = player.getSelectedItem();
    if (inMeleeDanger) {
      // If we have bomb or molotov, equip and fire to stun police!
      if (currentItem.id !== 'TIME_BOMB' && currentItem.id !== 'MOLOTOV') {
        if (player.ammo.TIME_BOMB > 0 || player.ammo.MOLOTOV > 0) {
          input.bJustPressed = true;
        }
      } else if (player.ammo[currentItem.id] > 0) {
        input.aJustPressed = true; // Blast the approaching police
      }
    }

    // 3. Fire / Igniting Decision (Controlled Burning)
    // - Under 14% ratio: Strictly forbidden! We are close to full-burn defeat.
    // - 14% - 38% (Tension Zone): Highly lucrative border bonus (+30/sec). Fire sparingly, only to open blocked paths.
    // - Over 38%: Actively burn to prevent crushing.
    let shouldBurn = false;
    const facingTile = player.getFacingTile();

    if (ratio > 0.38) {
      // Overcrowded city -> Burn nearby buildings
      if (city.isValid(facingTile.x, facingTile.y) && city.isFlammable(facingTile.x, facingTile.y)) {
        shouldBurn = true;
      }
    } else if (ratio >= 0.14 && ratio <= 0.38) {
      // In Tension Zone -> Only burn if directly trapped or facing dead-end
      const trapped = !this.hasWalkableNeighbor(city, pTile.x, pTile.y);
      if (trapped && city.isValid(facingTile.x, facingTile.y) && city.isFlammable(facingTile.x, facingTile.y)) {
        shouldBurn = true;
      }
    }

    if (shouldBurn && !inMeleeDanger) {
      // Check ammo
      if (player.ammo[currentItem.id] <= 0) {
        input.bJustPressed = true; // Cycle to available item
      } else {
        input.aJustPressed = true;
      }
    }

    // 4. Directional Navigation & Potential Field Evaluation
    const bestMove = this.chooseBestDirection(game, pTile, closestPolice, minPoliceDist, ratio);

    if (bestMove) {
      if (bestMove.dx < 0) input.left = true;
      else if (bestMove.dx > 0) input.right = true;

      if (bestMove.dy < 0) input.up = true;
      else if (bestMove.dy > 0) input.down = true;
    }

    // 5. Dash Decision
    if (underImmediateThreat && player.stamina > 30) {
      input.bHeld = true; // Dash away from police!
    }

    return input;
  }

  hasWalkableNeighbor(city, x, y) {
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    return dirs.some(([dx, dy]) => city.isWalkable(x + dx, y + dy));
  }

  chooseBestDirection(game, pTile, closestPolice, policeDist, ratio) {
    const city = game.city;
    const candidates = [
      { dx: 0, dy: -1 }, // UP
      { dx: 0, dy: 1 },  // DOWN
      { dx: -1, dy: 0 }, // LEFT
      { dx: 1, dy: 0 },  // RIGHT
      { dx: 0, dy: 0 }   // STAY
    ];

    let bestScore = -Infinity;
    let bestCandidate = null;

    for (const cand of candidates) {
      const nx = pTile.x + cand.dx;
      const ny = pTile.y + cand.dy;

      // Stay is only allowed if no police is nearby
      if (cand.dx === 0 && cand.dy === 0) {
        if (closestPolice && policeDist < 3.5) continue;
        const stayScore = this.evaluateTile(game, nx, ny, closestPolice, ratio) - 5;
        if (stayScore > bestScore) {
          bestScore = stayScore;
          bestCandidate = cand;
        }
        continue;
      }

      // Check walkability and active fire
      if (!city.isValid(nx, ny)) continue;
      if (!city.isWalkable(nx, ny)) continue;
      if (city.fireTimer[ny][nx] > 0) continue; // NEVER walk into active fire

      const score = this.evaluateTile(game, nx, ny, closestPolice, ratio);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = cand;
      }
    }

    return bestCandidate;
  }

  evaluateTile(game, x, y, closestPolice, ratio) {
    const city = game.city;
    let score = 100;

    // 1. Repulsion from Police
    if (closestPolice) {
      const dist = Math.hypot(closestPolice.x - x, closestPolice.y - y);
      if (dist < 1.5) score -= 600; // Critical danger
      else if (dist < 3.0) score -= 300;
      else if (dist < 5.0) score -= 100;
      else score += dist * 15; // Reward distancing
    }

    // 2. Repulsion from Active Fire Neighbors
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    let adjacentFires = 0;
    let openExits = 0;

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (city.isValid(nx, ny)) {
        if (city.fireTimer[ny][nx] > 0) adjacentFires++;
        if (city.isWalkable(nx, ny) && city.fireTimer[ny][nx] <= 0) openExits++;
      }
    }

    score -= adjacentFires * 40; // Penalty for staying adjacent to blaze
    score += openExits * 20;     // Prefer open intersections over dead ends

    // 3. Attraction to Items
    if (city.items && city.items.length > 0) {
      let closestItemDist = Infinity;
      for (const item of city.items) {
        const d = Math.abs(item.x - x) + Math.abs(item.y - y);
        if (d < closestItemDist) closestItemDist = d;
      }
      if (closestItemDist <= 5) {
        score += (6 - closestItemDist) * 15;
      }
    }

    // 4. Center Gravity (avoid map edges where one can get trapped)
    const distToCenterX = Math.abs(x - city.cols / 2);
    const distToCenterY = Math.abs(y - city.rows / 2);
    score -= (distToCenterX + distToCenterY) * 2;

    // 5. Fire Targeting (if overcrowded, steer towards combustible blocks)
    if (ratio > 0.45) {
      let combustibleNeighbors = 0;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (city.isValid(nx, ny) && city.isFlammable(nx, ny)) {
          combustibleNeighbors++;
        }
      }
      score += combustibleNeighbors * 25;
    }

    return score;
  }
}
