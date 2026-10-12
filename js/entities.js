// Entities: Player, Police AI, Firefighter AI, Projectiles, and Bombs

import { TILES, ITEMS, ITEM_LIST, BALANCE } from './constants.js';

export class Player {
  constructor(x = 10, y = 10, balance = BALANCE) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.dir = 'DOWN';
    this.stamina = 100;
    this.dashing = false;
    this.walkFrame = 0;
    this.walkAnimTimer = 0;
    this.balance = balance || BALANCE;

    // Inventory
    this.selectedItemIdx = 0;
    const mult = (this.balance && this.balance.AMMO_MULTIPLIER) ? this.balance.AMMO_MULTIPLIER : 1.0;
    this.ammo = {
      MATCH: Math.round(ITEMS.MATCH.initialAmmo * mult),
      LIGHTER: Math.round(ITEMS.LIGHTER.initialAmmo * mult),
      MOLOTOV: Math.round(ITEMS.MOLOTOV.initialAmmo * mult),
      TIME_BOMB: Math.round(ITEMS.TIME_BOMB.initialAmmo * mult)
    };
  }

  reset(x = 10, y = 10, balance = null) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.dir = 'DOWN';
    this.stamina = 100;
    this.dashing = false;
    this.walkFrame = 0;
    this.walkAnimTimer = 0;
    this.selectedItemIdx = 0;
    if (balance) this.balance = balance;
    const mult = (this.balance && this.balance.AMMO_MULTIPLIER) ? this.balance.AMMO_MULTIPLIER : 1.0;
    this.ammo = {
      MATCH: Math.round(ITEMS.MATCH.initialAmmo * mult),
      LIGHTER: Math.round(ITEMS.LIGHTER.initialAmmo * mult),
      MOLOTOV: Math.round(ITEMS.MOLOTOV.initialAmmo * mult),
      TIME_BOMB: Math.round(ITEMS.TIME_BOMB.initialAmmo * mult)
    };
  }

  getSelectedItem() {
    return ITEM_LIST[this.selectedItemIdx];
  }

  cycleItem() {
    this.selectedItemIdx = (this.selectedItemIdx + 1) % ITEM_LIST.length;
    return this.getSelectedItem();
  }

  addAmmo(type, count) {
    if (this.ammo[type] !== undefined) {
      this.ammo[type] += count;
    }
  }

  getTile() {
    return {
      x: Math.round(this.x),
      y: Math.round(this.y)
    };
  }

  getFacingTile() {
    const tile = this.getTile();
    if (this.dir === 'UP') tile.y -= 1;
    else if (this.dir === 'DOWN') tile.y += 1;
    else if (this.dir === 'LEFT') tile.x -= 1;
    else if (this.dir === 'RIGHT') tile.x += 1;
    return tile;
  }

  canOccupy(px, py, city) {
    // Player hitbox centered at (px + 0.5, py + 0.5)
    // Half-size: 0.32 tiles (approx 10.2px in 16px tile)
    const half = 0.32;
    const minX = px + 0.5 - half;
    const maxX = px + 0.5 + half;
    const minY = py + 0.5 - half;
    const maxY = py + 0.5 + half;

    const tx1 = Math.floor(minX);
    const tx2 = Math.floor(maxX);
    const ty1 = Math.floor(minY);
    const ty2 = Math.floor(maxY);

    for (let r = ty1; r <= ty2; r++) {
      for (let c = tx1; c <= tx2; c++) {
        if (!city.isWalkable(c, r)) return false;
      }
    }
    return true;
  }

  update(dt, input, city) {
    // 1. Dash & Stamina Management
    const bal = this.balance || BALANCE;
    if (input.bHeld && (input.up || input.down || input.left || input.right) && this.stamina > 10) {
      this.dashing = true;
      this.stamina = Math.max(0, this.stamina - bal.DASH_STAMINA_DRAIN * dt);
      if (this.stamina <= 0) this.dashing = false;
    } else {
      this.dashing = false;
      this.stamina = Math.min(100, this.stamina + bal.DASH_STAMINA_RECOVERY * dt);
    }

    const speed = this.dashing ? bal.PLAYER_DASH_SPEED : bal.PLAYER_SPEED;

    // 2. Continuous Directional Movement with Collision
    let dx = 0;
    let dy = 0;
    if (input.up) { dy -= 1; this.dir = 'UP'; }
    else if (input.down) { dy += 1; this.dir = 'DOWN'; }
    if (input.left) { dx -= 1; this.dir = 'LEFT'; }
    else if (input.right) { dx += 1; this.dir = 'RIGHT'; }

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    if (dx !== 0 || dy !== 0) {
      this.walkAnimTimer += dt;
      if (this.walkAnimTimer > 0.15) {
        this.walkAnimTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 2;
      }

      const half = 0.32;
      const totalDist = speed * dt;
      // Substep to prevent tunneling and allow smooth wall alignment (max 0.1 tile per substep)
      const maxSubStep = 0.1;
      const numSteps = Math.max(1, Math.ceil(totalDist / maxSubStep));
      const stepDist = totalDist / numSteps;
      const subDt = dt / numSteps;

      for (let s = 0; s < numSteps; s++) {
        const targetX = Math.max(0, Math.min(city.cols - 1, this.x + dx * stepDist));
        const targetY = Math.max(0, Math.min(city.rows - 1, this.y + dy * stepDist));

        // 1. Direct move test
        if (this.canOccupy(targetX, targetY, city)) {
          this.x = targetX;
          this.y = targetY;
        } else {
          // 2. Axis-separated movement (wall sliding)
          let movedX = false;
          let movedY = false;

          if (dx !== 0 && this.canOccupy(targetX, this.y, city)) {
            this.x = targetX;
            movedX = true;
          }

          if (dy !== 0 && this.canOccupy(this.x, targetY, city)) {
            this.y = targetY;
            movedY = true;
          }

          // 3. Corner Assist: if moving on one primary axis and clipping a building corner
          const nudgeSpeed = speed * subDt;

          if (dx !== 0 && dy === 0 && !movedX) {
            const minHitY = Math.floor(this.y + 0.5 - half);
            const maxHitY = Math.floor(this.y + 0.5 + half);

            if (minHitY !== maxHitY) {
              const testCol = (dx > 0)
                ? Math.floor(targetX + 0.5 + half)
                : Math.floor(targetX + 0.5 - half);

              const topWalkable = city.isWalkable(testCol, minHitY);
              const btmWalkable = city.isWalkable(testCol, maxHitY);

              let nudgeDir = 0;
              if (topWalkable && !btmWalkable) {
                nudgeDir = -1; // Obstacle is at bottom; nudge UP
              } else if (!topWalkable && btmWalkable) {
                nudgeDir = 1;  // Obstacle is at top; nudge DOWN
              }

              if (nudgeDir !== 0) {
                const testY = this.y + nudgeDir * nudgeSpeed;
                if (this.canOccupy(this.x, testY, city)) {
                  this.y = testY;
                  if (this.canOccupy(targetX, this.y, city)) {
                    this.x = targetX;
                  }
                }
              }
            }
          } else if (dy !== 0 && dx === 0 && !movedY) {
            const minHitX = Math.floor(this.x + 0.5 - half);
            const maxHitX = Math.floor(this.x + 0.5 + half);

            if (minHitX !== maxHitX) {
              const testRow = (dy > 0)
                ? Math.floor(targetY + 0.5 + half)
                : Math.floor(targetY + 0.5 - half);

              const leftWalkable = city.isWalkable(minHitX, testRow);
              const rightWalkable = city.isWalkable(maxHitX, testRow);

              let nudgeDir = 0;
              if (leftWalkable && !rightWalkable) {
                nudgeDir = -1; // Obstacle is at right; nudge LEFT
              } else if (!leftWalkable && rightWalkable) {
                nudgeDir = 1;  // Obstacle is at left; nudge RIGHT
              }

              if (nudgeDir !== 0) {
                const testX = this.x + nudgeDir * nudgeSpeed;
                if (this.canOccupy(testX, this.y, city)) {
                  this.x = testX;
                  if (this.canOccupy(this.x, targetY, city)) {
                    this.y = targetY;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  useWeapon(city, projectiles, bombs, audio) {
    const item = this.getSelectedItem();
    if (this.ammo[item.id] <= 0) return false;

    const currentTile = this.getTile();
    const facingTile = this.getFacingTile();

    if (item.id === 'MATCH') {
      // Ignites facing tile if building or valid; otherwise current tile
      const target = city.isValid(facingTile.x, facingTile.y) ? facingTile : currentTile;
      city.ignite(target.x, target.y, ITEMS.MATCH);
      this.ammo.MATCH--;
      audio.sfxMatch();
      return true;
    }

    if (item.id === 'LIGHTER') {
      // Stronger ignition on facing tile
      const target = city.isValid(facingTile.x, facingTile.y) ? facingTile : currentTile;
      city.ignite(target.x, target.y, ITEMS.LIGHTER);
      this.ammo.LIGHTER--;
      audio.sfxLighter();
      return true;
    }

    if (item.id === 'MOLOTOV') {
      // Throw projectile 3 tiles in facing direction
      projectiles.push(new MolotovProjectile(currentTile.x, currentTile.y, this.dir, 3));
      this.ammo.MOLOTOV--;
      audio.sfxMolotov();
      return true;
    }

    if (item.id === 'TIME_BOMB') {
      // Plant bomb at player's feet
      bombs.push(new TimeBomb(currentTile.x, currentTile.y, ITEMS.TIME_BOMB.countdown));
      this.ammo.TIME_BOMB--;
      audio.sfxBombPlant();
      return true;
    }

    return false;
  }
}

export class Police {
  constructor(x, y, balance = BALANCE) {
    this.x = x;
    this.y = y;
    this.balance = balance || BALANCE;
    this.dir = 'DOWN';
    this.state = 'PATROL'; // 'PATROL', 'CHASE', 'RETREAT', 'DESPAWNED'
    this.alertTimer = 0;
    this.stunTimer = 0;
    this.retreatTimer = 0;
    this.respawnTimer = 0;
    this.path = [];
    this.pathUpdateTimer = 0;
    this.patrolCooldown = 0;
    this.walkAnimTimer = 0;
    this.walkFrame = 0;
  }

  stun(duration) {
    this.stunTimer = Math.max(this.stunTimer, duration);
    if (this.state !== 'RETREAT' && this.state !== 'DESPAWNED') {
      this.state = 'PATROL';
    }
    this.path = [];
  }

  banish(city, audio) {
    if (this.state === 'DESPAWNED') return;
    this.state = 'RETREAT';
    this.retreatTimer = 1.5;
    this.alertTimer = 0;
    this.path = [];
    if (audio && typeof audio.sfxPolicePanic === 'function') {
      audio.sfxPolicePanic();
    }
  }

  shoveAway(player, city) {
    // Breakaway knockback away from player
    let dx = this.x - player.x;
    let dy = this.y - player.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) {
      dx = 0;
      dy = 1;
    } else {
      dx /= len;
      dy /= len;
    }

    // Attempt push back by 1.8 tiles
    const pushDist = 1.8;
    const targetX = Math.round(this.x + dx * pushDist);
    const targetY = Math.round(this.y + dy * pushDist);

    if (city.isValid(targetX, targetY) && city.isWalkable(targetX, targetY)) {
      this.x = targetX;
      this.y = targetY;
    }

    const stunDuration = (this.balance && this.balance.POLICE_BREAKAWAY_STUN) || 1.8;
    this.stun(stunDuration);
    this.state = 'PATROL';
    this.alertTimer = 0;
    this.path = [];
  }

  respawn(city, player, audio) {
    const pTile = player ? player.getTile() : { x: 10, y: 10 };
    // Find valid road tile on outer perimeter furthest from player without fire
    let bestTile = null;
    let maxDist = -1;

    for (let r = 0; r < city.rows; r++) {
      for (let c = 0; c < city.cols; c++) {
        const isEdge = (r <= 2 || r >= city.rows - 3 || c <= 2 || c >= city.cols - 3);
        if (isEdge && city.isWalkable(c, r) && city.fireTimer[r][c] <= 0) {
          const d = Math.hypot(c - pTile.x, r - pTile.y);
          if (d > maxDist) {
            maxDist = d;
            bestTile = { x: c, y: r };
          }
        }
      }
    }

    if (bestTile) {
      this.x = bestTile.x;
      this.y = bestTile.y;
    } else {
      this.x = 2;
      this.y = 2;
    }

    this.state = 'PATROL';
    this.stunTimer = 0;
    this.alertTimer = 0;
    this.retreatTimer = 0;
    this.respawnTimer = 0;
    this.path = [];
    if (audio && typeof audio.sfxPoliceWhistle === 'function') {
      audio.sfxPoliceWhistle();
    }
  }

  hasLineOfSight(playerTile, city) {
    if (this.state === 'RETREAT' || this.state === 'DESPAWNED') return false;

    const losRange = (this.balance && this.balance.POLICE_LOS_RANGE) || 4.5;
    const myTile = { x: Math.round(this.x), y: Math.round(this.y) };
    const dx = playerTile.x - myTile.x;
    const dy = playerTile.y - myTile.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > losRange) return false;

    // Check facing direction cone (45 degrees)
    if (this.dir === 'UP' && dy > 0) return false;
    if (this.dir === 'DOWN' && dy < 0) return false;
    if (this.dir === 'LEFT' && dx > 0) return false;
    if (this.dir === 'RIGHT' && dx < 0) return false;

    // Raycast check for wall obstruction or thick fire/smoke
    const steps = Math.ceil(dist * 2);
    for (let i = 1; i < steps; i++) {
      const rx = Math.round(myTile.x + (dx * i) / steps);
      const ry = Math.round(myTile.y + (dy * i) / steps);
      if (city.isValid(rx, ry)) {
        if (city.grid[ry][rx] === TILES.BUILDING || city.fireTimer[ry][rx] > 0) {
          return false; // Obstructed by wall or smoke
        }
      }
    }
    return true;
  }

  update(dt, player, city, audio, onBanish = null) {
    // 0. Handle Despawned & Respawn Timer
    if (this.state === 'DESPAWNED') {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn(city, player, audio);
      }
      return;
    }

    // 0b. Handle Panic Retreat
    if (this.state === 'RETREAT') {
      this.retreatTimer -= dt;
      if (this.retreatTimer <= 0) {
        this.state = 'DESPAWNED';
        this.respawnTimer = (this.balance && this.balance.POLICE_RESPAWN_DELAY) || 18.0;
        return;
      }
      // Panic run: flee away from player or center at high speed
      const pTile = player ? player.getTile() : { x: 10, y: 10 };
      let dx = this.x - pTile.x;
      let dy = this.y - pTile.y;
      const len = Math.hypot(dx, dy) || 1;
      const speed = ((this.balance && this.balance.POLICE_SPEED_CHASE) || 4.0) * 1.3;

      const step = speed * dt;
      const nextX = this.x + (dx / len) * step;
      const nextY = this.y + (dy / len) * step;
      if (city.isValid(Math.round(nextX), Math.round(nextY)) && city.isWalkable(Math.round(nextX), Math.round(nextY))) {
        this.x = nextX;
        this.y = nextY;
      } else {
        const edgeX = (this.x < city.cols / 2) ? -1 : 1;
        const edgeY = (this.y < city.rows / 2) ? -1 : 1;
        this.x += edgeX * step * 0.7;
        this.y += edgeY * step * 0.7;
      }
      return;
    }

    // If stunned, cannot move or act
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }

    const myTile = { x: Math.round(this.x), y: Math.round(this.y) };

    // Fire Fear: If standing on active fire, panic and retreat!
    if (city.isValid(myTile.x, myTile.y) && city.fireTimer[myTile.y][myTile.x] > 0) {
      this.banish(city, audio);
      if (onBanish) onBanish(this);
      return;
    }

    const playerTile = player ? player.getTile() : { x: 0, y: 0 };

    // 1. Detection Check
    const seesPlayer = player ? this.hasLineOfSight(playerTile, city) : false;

    if (seesPlayer) {
      if (this.state !== 'CHASE' && audio) {
        audio.sfxPoliceAlert();
      }
      this.state = 'CHASE';
      const alertDur = (this.balance && this.balance.POLICE_ALERT_DURATION) || 2.5;
      this.alertTimer = alertDur;
    } else if (this.state === 'CHASE') {
      this.alertTimer -= dt;
      if (this.alertTimer <= 0) {
        this.state = 'PATROL';
        this.path = [];
      }
    }

    const bal = this.balance || BALANCE;
    const speed = (this.state === 'CHASE') ? bal.POLICE_SPEED_CHASE : bal.POLICE_SPEED_PATROL;

    // 2. Pathfinding & Movement (strictly avoid fire!)
    this.pathUpdateTimer -= dt;
    if (this.pathUpdateTimer <= 0) {
      this.pathUpdateTimer = (this.state === 'CHASE') ? 0.35 : 1.2;

      if (this.state === 'CHASE' && player) {
        // Find path avoiding fire
        this.path = city.findPath(myTile.x, myTile.y, playerTile.x, playerTile.y, true, true) || [];
      } else {
        // Random patrol wandering, strictly avoiding fire tiles
        if (!this.path || this.path.length === 0) {
          const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
          const validMoves = dirs.filter(([dc, dr]) => {
            const tc = myTile.x + dc;
            const tr = myTile.y + dr;
            return city.isWalkable(tc, tr) && city.fireTimer[tr][tc] <= 0;
          });
          if (validMoves.length > 0) {
            const [dc, dr] = validMoves[Math.floor(Math.random() * validMoves.length)];
            this.path = [{ x: myTile.x + dc, y: myTile.y + dr }];
          }
        }
      }
    }

    // Move along path
    if (this.path && this.path.length > 0) {
      const nextNode = this.path[0];
      const targetX = nextNode.x;
      const targetY = nextNode.y;

      const diffX = targetX - this.x;
      const diffY = targetY - this.y;
      const dist = Math.sqrt(diffX * diffX + diffY * diffY);

      if (dist < 0.1) {
        this.x = targetX;
        this.y = targetY;
        this.path.shift();
      } else {
        const step = Math.min(dist, speed * dt);
        this.x += (diffX / dist) * step;
        this.y += (diffY / dist) * step;

        if (Math.abs(diffX) > Math.abs(diffY)) {
          this.dir = diffX > 0 ? 'RIGHT' : 'LEFT';
        } else {
          this.dir = diffY > 0 ? 'DOWN' : 'UP';
        }
      }
    }
  }

  checkPlayerCollision(player) {
    if (this.stunTimer > 0) return false;
    if (this.state === 'RETREAT' || this.state === 'DESPAWNED') return false;
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    return Math.sqrt(dx * dx + dy * dy) < 0.65;
  }
}

export class Firefighter {
  constructor(x, y, balance = BALANCE) {
    this.x = x;
    this.y = y;
    this.balance = balance || BALANCE;
    this.dir = 'DOWN';
    this.state = 'PATROL'; // 'PATROL', 'MOVING_TO_FIRE', 'SPRAYING'
    this.targetFire = null;
    this.sprayTimer = 0;
    this.stunTimer = 0;
    this.path = [];
    this.pathTimer = 0;
  }

  stun(duration) {
    this.stunTimer = Math.max(this.stunTimer, duration);
    this.state = 'PATROL';
    this.targetFire = null;
    this.sprayTimer = 0;
    this.path = [];
  }

  update(dt, city, audio) {
    // If stunned by explosion or fire, completely incapacitated
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }

    const myTile = { x: Math.round(this.x), y: Math.round(this.y) };

    // 1. If currently spraying water
    if (this.state === 'SPRAYING') {
      this.sprayTimer -= dt;
      if (this.sprayTimer <= 0) {
        if (this.targetFire) {
          city.extinguish(this.targetFire.x, this.targetFire.y);
          audio.sfxWater();
        }
        this.state = 'PATROL';
        this.targetFire = null;
        this.path = [];
      }
      return;
    }

    // 2. Locate closest active fire
    this.pathTimer -= dt;
    if (this.pathTimer <= 0) {
      this.pathTimer = 0.6;

      const fires = city.getActiveFires();
      if (fires.length > 0) {
        // Find nearest fire
        let nearest = null;
        let minDist = Infinity;
        for (const f of fires) {
          const d = Math.abs(f.x - myTile.x) + Math.abs(f.y - myTile.y);
          if (d < minDist) {
            minDist = d;
            nearest = f;
          }
        }

        if (nearest) {
          this.targetFire = nearest;
          // Check if already adjacent to fire
          if (minDist <= 1) {
            this.state = 'SPRAYING';
            this.sprayTimer = 1.0;
            // Face target fire
            if (nearest.x > myTile.x) this.dir = 'RIGHT';
            else if (nearest.x < myTile.x) this.dir = 'LEFT';
            else if (nearest.y > myTile.y) this.dir = 'DOWN';
            else if (nearest.y < myTile.y) this.dir = 'UP';
            audio.sfxFirefighterSiren();
            return;
          }

          // Pathfind to adjacent tile of the fire
          this.state = 'MOVING_TO_FIRE';
          this.path = city.findPath(myTile.x, myTile.y, nearest.x, nearest.y, true) || [];
          if (this.path.length > 1) {
            this.path.pop(); // Stop 1 tile short of the blaze
          }
        }
      } else {
        this.state = 'PATROL';
        this.targetFire = null;
      }
    }

    // 3. Move along path
    if (this.path && this.path.length > 0) {
      const nextNode = this.path[0];
      const diffX = nextNode.x - this.x;
      const diffY = nextNode.y - this.y;
      const dist = Math.sqrt(diffX * diffX + diffY * diffY);

      if (dist < 0.1) {
        this.x = nextNode.x;
        this.y = nextNode.y;
        this.path.shift();
      } else {
        const ffSpeed = (this.balance && this.balance.FIREFIGHTER_SPEED) || BALANCE.FIREFIGHTER_SPEED;
        const step = Math.min(dist, ffSpeed * dt);
        this.x += (diffX / dist) * step;
        this.y += (diffY / dist) * step;

        if (Math.abs(diffX) > Math.abs(diffY)) {
          this.dir = diffX > 0 ? 'RIGHT' : 'LEFT';
        } else {
          this.dir = diffY > 0 ? 'DOWN' : 'UP';
        }
      }
    }
  }
}

export class MolotovProjectile {
  constructor(startX, startY, dir, range = 3) {
    this.startX = startX;
    this.startY = startY;
    this.x = startX;
    this.y = startY;
    this.dir = dir;
    this.range = range;
    this.targetX = startX;
    this.targetY = startY;

    if (dir === 'UP') this.targetY -= range;
    else if (dir === 'DOWN') this.targetY += range;
    else if (dir === 'LEFT') this.targetX -= range;
    else if (dir === 'RIGHT') this.targetX += range;

    this.progress = 0; // 0 to 1
    this.isDead = false;
  }

  update(dt, city, audio, enemies = [], onStun = null) {
    this.progress += dt * 3.5;
    this.x = this.startX + (this.targetX - this.startX) * this.progress;
    this.y = this.startY + (this.targetY - this.startY) * this.progress;

    if (this.progress >= 1.0) {
      this.isDead = true;
      const hitX = Math.round(this.targetX);
      const hitY = Math.round(this.targetY);

      // 3x3 burst ignition
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = hitX + dx;
          const ty = hitY + dy;
          if (city.isValid(tx, ty)) {
            city.ignite(tx, ty, ITEMS.MOLOTOV);
          }
        }
      }

      // Stun any enemies in 3x3 impact radius
      const stunDur = ITEMS.MOLOTOV.stunDuration || 2.5;
      for (const enemy of enemies) {
        const d = Math.hypot(enemy.x - hitX, enemy.y - hitY);
        if (d <= 1.8) {
          enemy.stun(stunDur);
          if (onStun) onStun(enemy);
        }
      }
    }
  }
}

export class TimeBomb {
  constructor(x, y, countdown = 3.0) {
    this.x = x;
    this.y = y;
    this.timeLeft = countdown;
    this.isDead = false;
    this.exploded = false;
    this.explosionDuration = 0.5;
    this.tickTimer = 0;
  }

  update(dt, city, audio, enemies = [], onStun = null) {
    if (!this.exploded) {
      this.timeLeft -= dt;
      this.tickTimer += dt;

      if (this.tickTimer >= 0.5) {
        this.tickTimer = 0;
        audio.sfxBombTick();
      }

      if (this.timeLeft <= 0) {
        this.exploded = true;
        audio.sfxExplosion();

        // 5x5 Bomb Demolition
        const r = ITEMS.TIME_BOMB.radius;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const tx = this.x + dx;
            const ty = this.y + dy;
            if (city.isValid(tx, ty)) {
              if (city.grid[ty][tx] === TILES.BUILDING) {
                // Instantly blow to ash
                city.grid[ty][tx] = TILES.ASH;
                city.health[ty][tx] = 0;
                if (city.tier) city.tier[ty][tx] = 1;
                city.totalBuildingsBurned++;
              }
              city.ignite(tx, ty, ITEMS.TIME_BOMB);
            }
          }
        }

        // Stun all enemies within blast range (5x5)
        const stunDur = ITEMS.TIME_BOMB.stunDuration || 4.0;
        for (const enemy of enemies) {
          const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
          if (d <= 2.8) {
            enemy.stun(stunDur);
            if (onStun) onStun(enemy);
          }
        }
      }
    } else {
      this.explosionDuration -= dt;
      if (this.explosionDuration <= 0) {
        this.isDead = true;
      }
    }
  }
}
