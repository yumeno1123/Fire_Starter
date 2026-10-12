// Entities: Player, Police AI, Firefighter AI, Projectiles, and Bombs

import { TILES, ITEMS, ITEM_LIST, BALANCE } from './constants.js';

export class Player {
  constructor(x = 10, y = 10) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.dir = 'DOWN';
    this.stamina = 100;
    this.dashing = false;
    this.walkFrame = 0;
    this.walkAnimTimer = 0;

    // Inventory
    this.selectedItemIdx = 0;
    this.ammo = {
      MATCH: ITEMS.MATCH.initialAmmo,
      LIGHTER: ITEMS.LIGHTER.initialAmmo,
      MOLOTOV: ITEMS.MOLOTOV.initialAmmo,
      TIME_BOMB: ITEMS.TIME_BOMB.initialAmmo
    };
  }

  reset(x = 10, y = 10) {
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
    this.ammo = {
      MATCH: ITEMS.MATCH.initialAmmo,
      LIGHTER: ITEMS.LIGHTER.initialAmmo,
      MOLOTOV: ITEMS.MOLOTOV.initialAmmo,
      TIME_BOMB: ITEMS.TIME_BOMB.initialAmmo
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

  update(dt, input, city) {
    // 1. Dash & Stamina Management
    if (input.bHeld && (input.up || input.down || input.left || input.right) && this.stamina > 10) {
      this.dashing = true;
      this.stamina = Math.max(0, this.stamina - BALANCE.DASH_STAMINA_DRAIN * dt);
      if (this.stamina <= 0) this.dashing = false;
    } else {
      this.dashing = false;
      this.stamina = Math.min(100, this.stamina + BALANCE.DASH_STAMINA_RECOVERY * dt);
    }

    const speed = this.dashing ? BALANCE.PLAYER_DASH_SPEED : BALANCE.PLAYER_SPEED;

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

      const nextX = this.x + dx * speed * dt;
      const nextY = this.y + dy * speed * dt;

      // Axis-separated collision test with margin
      const margin = 0.25;

      // Check horizontal move
      const testX = (dx > 0) ? nextX + margin : nextX - margin;
      const tX1 = Math.floor(testX);
      const tY1 = Math.floor(this.y - margin);
      const tY2 = Math.floor(this.y + margin);

      if (city.isWalkable(tX1, tY1) && city.isWalkable(tX1, tY2)) {
        this.x = Math.max(0, Math.min(city.cols - 1, nextX));
      }

      // Check vertical move
      const testY = (dy > 0) ? nextY + margin : nextY - margin;
      const tY = Math.floor(testY);
      const tX_1 = Math.floor(this.x - margin);
      const tX_2 = Math.floor(this.x + margin);

      if (city.isWalkable(tX_1, tY) && city.isWalkable(tX_2, tY)) {
        this.y = Math.max(0, Math.min(city.rows - 1, nextY));
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
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dir = 'DOWN';
    this.state = 'PATROL'; // 'PATROL' or 'CHASE'
    this.alertTimer = 0;
    this.stunTimer = 0;
    this.path = [];
    this.pathUpdateTimer = 0;
    this.patrolCooldown = 0;
    this.walkAnimTimer = 0;
    this.walkFrame = 0;
  }

  stun(duration) {
    this.stunTimer = Math.max(this.stunTimer, duration);
    this.state = 'PATROL';
    this.path = [];
  }

  hasLineOfSight(playerTile, city) {
    const losRange = BALANCE.POLICE_LOS_RANGE || 4.5;
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

  update(dt, player, city, audio) {
    // If stunned by explosion or fire, completely incapacitated
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }

    const myTile = { x: Math.round(this.x), y: Math.round(this.y) };
    const playerTile = player.getTile();

    // 1. Detection Check
    const seesPlayer = this.hasLineOfSight(playerTile, city);

    if (seesPlayer) {
      if (this.state !== 'CHASE') {
        audio.sfxPoliceAlert();
      }
      this.state = 'CHASE';
      this.alertTimer = 4.0; // Stay alert for 4 seconds after sighting
    } else if (this.state === 'CHASE') {
      this.alertTimer -= dt;
      if (this.alertTimer <= 0) {
        this.state = 'PATROL';
        this.path = [];
      }
    }

    const speed = (this.state === 'CHASE') ? BALANCE.POLICE_SPEED_CHASE : BALANCE.POLICE_SPEED_PATROL;

    // 2. Pathfinding & Movement
    this.pathUpdateTimer -= dt;
    if (this.pathUpdateTimer <= 0) {
      this.pathUpdateTimer = (this.state === 'CHASE') ? 0.35 : 1.2;

      if (this.state === 'CHASE') {
        this.path = city.findPath(myTile.x, myTile.y, playerTile.x, playerTile.y, true) || [];
      } else {
        // Random patrol wandering
        if (!this.path || this.path.length === 0) {
          const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
          const validMoves = dirs.filter(([dc, dr]) => city.isWalkable(myTile.x + dc, myTile.y + dr));
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
    if (this.stunTimer > 0) return false; // Stunned police cannot arrest
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    return Math.sqrt(dx * dx + dy * dy) < 0.65;
  }
}

export class Firefighter {
  constructor(x, y) {
    this.x = x;
    this.y = y;
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
        const step = Math.min(dist, BALANCE.FIREFIGHTER_SPEED * dt);
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
