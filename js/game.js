// Core Game Engine & State Management

import {
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  TILES,
  PALETTES,
  GAME_STATES,
  DEATH_REASONS,
  TENSION_ZONES,
  DIFFICULTY_SETTINGS,
  DIFFICULTY_KEYS,
  BALANCE
} from './constants.js';
import { SpriteRenderer } from './sprites.js';
import { City } from './city.js';
import { Player, Police, Firefighter } from './entities.js';
import { audio } from './audio.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Palettes
    this.paletteKeys = Object.keys(PALETTES);
    this.paletteIdx = 0;
    this.palette = PALETTES[this.paletteKeys[this.paletteIdx]];
    this.renderer = new SpriteRenderer(this.palette);

    // Difficulty Settings
    this.difficultyKeys = DIFFICULTY_KEYS;
    const savedDiff = (typeof localStorage !== 'undefined') ? localStorage.getItem('firestarter_difficulty') : null;
    const initialDiffIdx = this.difficultyKeys.indexOf(savedDiff);
    this.difficultyIdx = (initialDiffIdx >= 0) ? initialDiffIdx : 1; // Default: NORMAL (idx 1)
    this.difficulty = this.difficultyKeys[this.difficultyIdx];
    this.balance = DIFFICULTY_SETTINGS[this.difficulty];

    // Canvas internal logical resolution
    this.width = GRID_COLS * TILE_SIZE;  // 320px
    this.height = GRID_ROWS * TILE_SIZE; // 320px
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Simulation subsystems
    this.city = new City(GRID_COLS, GRID_ROWS, this.balance);
    this.player = new Player(10, 10, this.balance);
    this.policeUnits = [];
    this.firefighters = [];
    this.projectiles = [];
    this.bombs = [];

    // State machine
    this.state = GAME_STATES.TITLE;
    this.deathReason = null;
    this.highScore = this.getHighScore(this.difficulty);
    this.tributeScore = 0;
    this.survivalTime = 0;
    this.comboCount = 0;
    this.comboTimer = 0;

    // Ambivalence & Tension Zone mechanics
    this.tensionTime = 0;
    this.tensionTickTimer = 0;
    this.maxTensionTime = 0;
    this.ashFallParticles = [];

    // Title screen animation
    this.titleAnimTime = 0;

    // Particle FX (retro smoke and sparks)
    this.particles = [];

    // Screen Shake FX
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
  }

  triggerShake(duration = 0.3, intensity = 4) {
    this.shakeTimer = duration;
    this.shakeIntensity = intensity;
  }

  getHighScore(diffKey) {
    if (typeof localStorage === 'undefined') return 0;
    const key = `firestarter_highscore_${diffKey.toLowerCase()}`;
    const diffScore = localStorage.getItem(key);
    if (diffScore !== null) {
      return parseInt(diffScore, 10) || 0;
    }
    if (diffKey === 'NORMAL') {
      return parseInt(localStorage.getItem('firestarter_highscore') || '0', 10) || 0;
    }
    return 0;
  }

  setDifficulty(diffKey) {
    const idx = this.difficultyKeys.indexOf(diffKey);
    if (idx >= 0) {
      this.difficultyIdx = idx;
      this.difficulty = this.difficultyKeys[idx];
      this.balance = DIFFICULTY_SETTINGS[this.difficulty];
      this.highScore = this.getHighScore(this.difficulty);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('firestarter_difficulty', this.difficulty);
      }
    }
  }

  cycleDifficulty(dir = 1) {
    this.difficultyIdx = (this.difficultyIdx + dir + this.difficultyKeys.length) % this.difficultyKeys.length;
    this.difficulty = this.difficultyKeys[this.difficultyIdx];
    this.balance = DIFFICULTY_SETTINGS[this.difficulty];
    this.highScore = this.getHighScore(this.difficulty);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('firestarter_difficulty', this.difficulty);
    }
    audio.sfxMenuSelect();
  }

  cyclePalette() {
    this.paletteIdx = (this.paletteIdx + 1) % this.paletteKeys.length;
    this.palette = PALETTES[this.paletteKeys[this.paletteIdx]];
    this.renderer.setPalette(this.palette);
    audio.sfxMenuSelect();
  }

  startNewGame() {
    this.city.init(this.balance.INITIAL_BUILDING_RATIO, { x: 10, y: 10 }, this.balance);
    this.player.reset(10, 10, this.balance);

    // Spawn Police Officers based on difficulty balance (EASY/NORMAL: 1, HARD: 2)
    const policeCount = (this.balance && this.balance.POLICE_COUNT !== undefined)
      ? this.balance.POLICE_COUNT
      : 1;
    const spawnPositions = [
      { x: 17, y: 17 },
      { x: 2, y: 2 }
    ];
    this.policeUnits = [];
    for (let i = 0; i < policeCount; i++) {
      const pos = spawnPositions[i % spawnPositions.length];
      this.policeUnits.push(new Police(pos.x, pos.y, this.balance));
    }

    // Spawn 2 Firefighter units
    this.firefighters = [
      new Firefighter(2, 17, this.balance),
      new Firefighter(17, 2, this.balance)
    ];

    this.projectiles = [];
    this.bombs = [];
    this.particles = [];

    this.tributeScore = 0;
    this.survivalTime = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.tensionTime = 0;
    this.tensionTickTimer = 0;
    this.maxTensionTime = 0;
    this.ashFallParticles = [];
    this.deathReason = null;

    this.state = GAME_STATES.PLAYING;
    audio.startBGM();
    audio.sfxMenuSelect();
  }

  gameOver(reason) {
    this.state = GAME_STATES.GAME_OVER;
    this.deathReason = reason;

    if (this.tributeScore > this.highScore) {
      this.highScore = this.tributeScore;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`firestarter_highscore_${this.difficulty.toLowerCase()}`, String(this.highScore));
        localStorage.setItem('firestarter_highscore', String(this.highScore));
      }
    }

    audio.stopBGM();
    audio.sfxGameOver(reason.id);
  }

  getCurrentZone(ratio = null) {
    const r = (ratio !== null) ? ratio : this.city.getBuildingRatio();
    if (r <= TENSION_ZONES.FRENZY.threshold) {
      return TENSION_ZONES.FRENZY;
    }
    if (r <= TENSION_ZONES.TENSION.max) {
      return TENSION_ZONES.TENSION;
    }
    if (r <= TENSION_ZONES.STABLE.max) {
      return TENSION_ZONES.STABLE;
    }
    return TENSION_ZONES.DENSE;
  }

  addTributeScore(points, applyZoneMultiplier = false) {
    this.comboCount++;
    this.comboTimer = 2.5; // Combo window
    const comboMultiplier = 1.0 + Math.min(2.0, (this.comboCount - 1) * 0.2);
    const zoneMultiplier = applyZoneMultiplier ? (this.getCurrentZone().scoreMultiplier || 1.0) : 1.0;
    const earned = Math.round(points * comboMultiplier * zoneMultiplier);
    this.tributeScore += earned;
    return earned;
  }

  // Check if player has any accessible moves (trapped by buildings)
  isPlayerTrapped() {
    const pt = this.player.getTile();
    const dirs = [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]];
    const anyWalkable = dirs.some(([dx, dy]) => this.city.isWalkable(pt.x + dx, pt.y + dy));
    return !anyWalkable;
  }

  update(dt, input) {
    // Palette switch
    if (input.muteJustPressed) {
      audio.toggleMute();
    }

    // --- State Machine Updates ---

    if (this.state === GAME_STATES.TITLE) {
      this.titleAnimTime += dt;
      if (input.upJustPressed || input.leftJustPressed) {
        this.cycleDifficulty(-1);
      } else if (input.downJustPressed || input.rightJustPressed) {
        this.cycleDifficulty(1);
      } else if (input.aJustPressed || input.startJustPressed) {
        this.startNewGame();
      } else if (input.selectJustPressed) {
        this.cyclePalette();
      }
      return;
    }

    if (this.state === GAME_STATES.GAME_OVER) {
      if (input.aJustPressed || input.startJustPressed) {
        this.startNewGame();
      } else if (input.bJustPressed) {
        this.highScore = this.getHighScore(this.difficulty);
        this.state = GAME_STATES.TITLE;
        audio.sfxMenuSelect();
      }
      return;
    }

    if (this.state === GAME_STATES.PAUSED) {
      if (input.startJustPressed || input.aJustPressed) {
        this.state = GAME_STATES.PLAYING;
        audio.sfxMenuSelect();
      }
      return;
    }

    if (this.state === GAME_STATES.TRIBUTE_STATS) {
      if (input.selectJustPressed || input.bJustPressed || input.aJustPressed) {
        this.state = GAME_STATES.PLAYING;
        audio.sfxMenuSelect();
      }
      return;
    }

    // --- Active Playing State ---

    // Pause toggle
    if (input.startJustPressed) {
      this.state = GAME_STATES.PAUSED;
      audio.sfxMenuSelect();
      return;
    }

    // Tribute Stats modal toggle
    if (input.selectJustPressed) {
      this.state = GAME_STATES.TRIBUTE_STATS;
      audio.sfxMenuSelect();
      return;
    }

    // Item Switch (B button quick tap)
    if (input.bJustPressed && !this.player.dashing) {
      this.player.cycleItem();
      audio.sfxItemSwitch();
    }

    // Use Weapon (A button)
    if (input.aJustPressed) {
      this.player.useWeapon(this.city, this.projectiles, this.bombs, audio);
    }

    // Survival time & Combo
    this.survivalTime += dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }

    // Tension zone evaluation & dynamic audio synchronization
    const currentBuildingRatio = this.city.getBuildingRatio();
    const currentZone = this.getCurrentZone(currentBuildingRatio);
    audio.setCityRatio(currentBuildingRatio);

    if (currentZone === TENSION_ZONES.TENSION) {
      this.tensionTime += dt;
      if (this.tensionTime > this.maxTensionTime) {
        this.maxTensionTime = this.tensionTime;
      }
      this.tensionTickTimer += dt;
      if (this.tensionTickTimer >= 1.0) {
        this.tensionTickTimer -= 1.0;
        const borderBonus = TENSION_ZONES.TENSION.perSecondBonus || 30;
        this.tributeScore += borderBonus;
        audio.sfxTensionBonus();
        this.spawnFloatingText(this.player.x * TILE_SIZE, this.player.y * TILE_SIZE - 4, `+${borderBonus} BORDER`);
      }
    } else {
      this.tensionTickTimer = 0;
    }

    // Screen Shake decay
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      if (this.shakeTimer <= 0) this.shakeIntensity = 0;
    }

    // 1. Update Player
    this.player.update(dt, input, this.city);
    if (this.player.dashing) {
      // Dash dust particles
      if (Math.random() < 0.3) {
        this.spawnParticle(this.player.x * TILE_SIZE + 8, this.player.y * TILE_SIZE + 14, 'dust');
      }
    }

    // Check item pickup
    const pTile = this.player.getTile();
    const collected = this.city.collectItem(pTile.x, pTile.y);
    if (collected) {
      this.player.addAmmo(collected.type, collected.type === 'MATCH' ? 5 : collected.type === 'LIGHTER' ? 2 : 1);
      audio.sfxItemCollect();
      this.spawnFloatingText(pTile.x * TILE_SIZE, pTile.y * TILE_SIZE - 4, `+${collected.type}`);
    }

    // 2. Update City Simulation
    this.city.update(dt, pTile, (bx, by) => {
      // Building incinerated callback (applies fire tension zone multiplier)
      this.addTributeScore(100, true);
      this.spawnParticle(bx * TILE_SIZE + 8, by * TILE_SIZE + 8, 'fire_burst');
      this.triggerShake(0.12, 1.5);
    });

    // 3. Update Projectiles & Bombs
    const enemies = [
      ...this.policeUnits.filter(p => p.state !== 'DESPAWNED'),
      ...this.firefighters
    ];

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt, this.city, audio, enemies, (hitEnemy) => {
        if (hitEnemy instanceof Police) {
          const bonus = (this.balance && this.balance.POLICE_BANISH_SCORE_BONUS) || 500;
          hitEnemy.banish(this.city, audio);
          this.addTributeScore(bonus);
          this.spawnFloatingText(hitEnemy.x * TILE_SIZE, hitEnemy.y * TILE_SIZE - 6, `POLICE BANISHED! +${bonus}`);
          this.triggerShake(0.35, 4);
        } else {
          const bonus = (this.balance && this.balance.STUN_SCORE_BONUS) || BALANCE.STUN_SCORE_BONUS || 250;
          audio.sfxStun();
          this.addTributeScore(bonus);
          this.spawnFloatingText(hitEnemy.x * TILE_SIZE, hitEnemy.y * TILE_SIZE - 6, `STUN! +${bonus}`);
          this.triggerShake(0.25, 3);
        }
      });
      if (proj.isDead) this.projectiles.splice(i, 1);
    }

    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      bomb.update(dt, this.city, audio, enemies, (hitEnemy) => {
        if (hitEnemy instanceof Police) {
          const bonus = (this.balance && this.balance.POLICE_BANISH_SCORE_BONUS) || 500;
          hitEnemy.banish(this.city, audio);
          this.addTributeScore(bonus);
          this.spawnFloatingText(hitEnemy.x * TILE_SIZE, hitEnemy.y * TILE_SIZE - 6, `BLAST BANISHED! +${bonus}`);
          this.triggerShake(0.4, 5);
        } else {
          const bonus = (this.balance && this.balance.STUN_SCORE_BONUS) || BALANCE.STUN_SCORE_BONUS || 250;
          audio.sfxStun();
          this.addTributeScore(bonus);
          this.spawnFloatingText(hitEnemy.x * TILE_SIZE, hitEnemy.y * TILE_SIZE - 6, `BLAST STUN! +${bonus}`);
          this.triggerShake(0.4, 5);
        }
      });
      if (bomb.isDead) this.bombs.splice(i, 1);
    }

    // 4. Update Police Officers & Arrest / Breakaway Collision
    for (const police of this.policeUnits) {
      police.update(dt, this.player, this.city, audio, (banishedPolice) => {
        const bonus = (this.balance && this.balance.POLICE_BANISH_SCORE_BONUS) || 500;
        this.addTributeScore(bonus);
        this.spawnFloatingText(banishedPolice.x * TILE_SIZE, banishedPolice.y * TILE_SIZE - 6, `FIRE BANISHED! +${bonus}`);
        this.triggerShake(0.3, 3);
      });

      if (police.checkPlayerCollision(this.player)) {
        const breakCost = (this.balance && this.balance.POLICE_BREAKAWAY_STAMINA_COST) || 35;
        if (this.player.stamina >= breakCost) {
          // Breakaway / Shove tackle!
          this.player.stamina -= breakCost;
          police.shoveAway(this.player, this.city);
          audio.sfxBreakAway();
          this.triggerShake(0.35, 5);
          this.spawnFloatingText(this.player.x * TILE_SIZE, this.player.y * TILE_SIZE - 10, `BREAK AWAY! -${breakCost} STM`);
        } else {
          // Out of stamina -> Arrested!
          this.gameOver(DEATH_REASONS.ARRESTED);
          return;
        }
      }
    }

    // 5. Update Firefighters
    for (const ff of this.firefighters) {
      ff.update(dt, this.city, audio);
    }

    // 6. Check Game Over Conditions
    const buildingCount = this.city.getBuildingCount();
    const buildingRatio = this.city.getBuildingRatio();

    // Condition A: Full Burn (街の全焼・完全消滅)
    if (buildingCount === 0) {
      this.gameOver(DEATH_REASONS.FULL_BURN);
      return;
    }

    // Condition B: Crushed by Endsville Growth (完全浸食・圧殺)
    const dangerHigh = (this.balance && this.balance.DANGER_HIGH_BUILDING) || BALANCE.DANGER_HIGH_BUILDING || 0.90;
    if (buildingRatio >= dangerHigh || this.isPlayerTrapped()) {
      this.gameOver(DEATH_REASONS.CRUSHED);
      return;
    }

    // 7. Ambient ash & smoke particles
    if (Math.random() < 0.25) {
      const fires = this.city.getActiveFires();
      if (fires.length > 0) {
        const randFire = fires[Math.floor(Math.random() * fires.length)];
        this.spawnParticle(randFire.x * TILE_SIZE + Math.random() * 16, randFire.y * TILE_SIZE, 'smoke');
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // 8. Atmospheric Ash Snowfall (snowflakes of ash drifting as city burns)
    const ashSnowRate = 0.15 + (1.0 - buildingRatio) * 0.40;
    if (Math.random() < ashSnowRate) {
      this.ashFallParticles.push({
        x: Math.random() * (this.width + 40) - 20,
        y: -2,
        vx: (Math.random() - 0.5) * 8 + 6,
        vy: 10 + Math.random() * 14,
        life: 3.5,
        maxLife: 3.5,
        size: Math.random() < 0.7 ? 1 : 2
      });
    }

    for (let i = this.ashFallParticles.length - 1; i >= 0; i--) {
      const af = this.ashFallParticles[i];
      af.x += af.vx * dt;
      af.y += af.vy * dt;
      af.life -= dt;
      if (af.life <= 0 || af.y > this.height || af.x > this.width + 30) {
        this.ashFallParticles.splice(i, 1);
      }
    }
  }

  spawnParticle(x, y, type = 'smoke') {
    if (type === 'smoke') {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: -12 - Math.random() * 8,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        type: 'smoke'
      });
    } else if (type === 'dust') {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 4,
        life: 0.3,
        maxLife: 0.3,
        type: 'dust'
      });
    } else if (type === 'fire_burst') {
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 24,
          vy: -10 - Math.random() * 20,
          life: 0.4,
          maxLife: 0.4,
          type: 'spark'
        });
      }
    }
  }

  spawnFloatingText(x, y, text) {
    this.particles.push({
      x, y,
      vx: 0,
      vy: -15,
      life: 0.9,
      maxLife: 0.9,
      type: 'text',
      text
    });
  }

  // --- Rendering Functions ---

  render() {
    const ctx = this.ctx;
    const p = this.palette;

    // Clear background
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.state === GAME_STATES.TITLE) {
      this.renderTitleScreen();
      return;
    }

    // Apply Screen Shake for Game World
    ctx.save();
    if (this.shakeTimer > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(Math.round(sx), Math.round(sy));
    }

    // 1. Draw Grid Tiles
    for (let r = 0; r < this.city.rows; r++) {
      for (let c = 0; c < this.city.cols; c++) {
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;
        const tile = this.city.grid[r][c];

        if (tile === TILES.BUILDING) {
          const h = this.city.health[r][c];
          this.renderer.drawBuilding(ctx, x, y, h);
        } else if (tile === TILES.ASH) {
          this.renderer.drawAsh(ctx, x, y, c + r);
        } else if (tile === TILES.WET) {
          this.renderer.drawWet(ctx, x, y);
        } else {
          this.renderer.drawRoad(ctx, x, y, c * 3 + r * 7);
        }

        // Render Active Fire on Tile
        if (this.city.fireTimer[r][c] > 0) {
          const fFrame = Math.floor(Date.now() / 150);
          this.renderer.drawFire(ctx, x, y, fFrame + c + r);
        }
      }
    }

    // 2. Draw Dropped Items
    for (const item of this.city.items) {
      this.renderer.drawItem(ctx, item.x * TILE_SIZE, item.y * TILE_SIZE, item.type);
    }

    // 3. Draw Bombs
    for (const bomb of this.bombs) {
      if (bomb.exploded) {
        this.renderer.drawExplosion(ctx, bomb.x * TILE_SIZE, bomb.y * TILE_SIZE, 2.5, 1.0 - bomb.explosionDuration / 0.5);
      } else {
        this.renderer.drawBomb(ctx, bomb.x * TILE_SIZE, bomb.y * TILE_SIZE, bomb.timeLeft);
      }
    }

    // 4. Draw Projectiles (Molotov)
    for (const proj of this.projectiles) {
      ctx.fillStyle = p.c3;
      ctx.fillRect(proj.x * TILE_SIZE + 6, proj.y * TILE_SIZE + 6, 4, 4);
      ctx.fillStyle = p.c2;
      ctx.fillRect(proj.x * TILE_SIZE + 7, proj.y * TILE_SIZE + 4, 2, 2);
    }

    // 5. Draw Firefighters
    for (const ff of this.firefighters) {
      this.renderer.drawFirefighter(ctx, ff.x * TILE_SIZE, ff.y * TILE_SIZE, ff.dir, ff.state === 'SPRAYING', 0, ff.stunTimer > 0);
    }

    // 6. Draw Police
    for (const police of this.policeUnits) {
      if (police.state === 'DESPAWNED') continue;
      this.renderer.drawPolice(
        ctx,
        police.x * TILE_SIZE,
        police.y * TILE_SIZE,
        police.dir,
        police.state === 'CHASE',
        0,
        police.stunTimer > 0,
        police.state === 'RETREAT'
      );
    }

    // 7. Draw Player
    this.renderer.drawPlayer(
      ctx,
      this.player.x * TILE_SIZE,
      this.player.y * TILE_SIZE,
      this.player.dir,
      this.player.walkFrame,
      this.player.dashing
    );

    // 8. Draw Particles & Floating Text
    for (const pt of this.particles) {
      if (pt.type === 'smoke') {
        ctx.fillStyle = (pt.life > pt.maxLife * 0.5) ? p.c2 : p.c1;
        ctx.fillRect(pt.x, pt.y, 2, 2);
      } else if (pt.type === 'spark') {
        ctx.fillStyle = p.c3;
        ctx.fillRect(pt.x, pt.y, 2, 2);
      } else if (pt.type === 'text') {
        ctx.font = '8px monospace';
        ctx.fillStyle = p.c3;
        ctx.fillText(pt.text, pt.x, pt.y);
      }
    }

    // 9. Atmospheric Ash Snowfall (snow flakes drifting over city)
    for (const af of this.ashFallParticles) {
      ctx.fillStyle = (af.life > af.maxLife * 0.4) ? p.c2 : p.c1;
      ctx.fillRect(Math.round(af.x), Math.round(af.y), af.size, af.size);
    }

    // End World Transform (Screen Shake)
    ctx.restore();

    // 10. Desolation Vignette (Void encroaches as city and player's refuge shrink)
    const currentRenderRatio = this.city.getBuildingRatio();
    if (currentRenderRatio <= 0.25 && typeof ctx.createRadialGradient === 'function') {
      const voidFactor = Math.min(1.0, (0.25 - currentRenderRatio) / 0.20);
      const grad = ctx.createRadialGradient(
        this.width / 2, this.height / 2, 60 * (1.0 - voidFactor * 0.4),
        this.width / 2, this.height / 2, 160
      );
      grad.addColorStop(0, 'rgba(8, 24, 32, 0)');
      grad.addColorStop(1, `rgba(8, 24, 32, ${Math.min(0.70, 0.20 + voidFactor * 0.5)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 9. Draw In-Game HUD overlay
    this.renderHUD();

    // 10. Modals / Overlays
    if (this.state === GAME_STATES.PAUSED) {
      this.renderPausedScreen();
    } else if (this.state === GAME_STATES.TRIBUTE_STATS) {
      this.renderTributeScreen();
    } else if (this.state === GAME_STATES.GAME_OVER) {
      this.renderGameOverScreen();
    }
  }

  renderHUD() {
    const ctx = this.ctx;
    const p = this.palette;

    // HUD Top bar
    ctx.fillStyle = p.hudBg;
    ctx.fillRect(0, 0, this.width, 18);
    ctx.strokeStyle = p.c1;
    ctx.beginPath();
    ctx.moveTo(0, 18.5);
    ctx.lineTo(this.width, 18.5);
    ctx.stroke();

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = p.c3;

    // Score
    const scoreStr = String(this.tributeScore).padStart(6, '0');
    ctx.fillText(`SCR:${scoreStr}`, 4, 12);

    // City Ratio & Ambivalence Zone Bar
    const bRatio = this.city.getBuildingRatio();
    const ratio = Math.round(bRatio * 100);
    const lowDanger = ratio <= 12;
    const highDanger = ratio >= 75;
    const currentZone = this.getCurrentZone(bRatio);

    if (lowDanger) {
      const blink = Math.floor(Date.now() / 200) % 2 === 0;
      ctx.fillStyle = p.accentRed || p.c3;
      ctx.fillText(blink ? `${ratio}%!NOWHERE!` : `${ratio}%!FRENZYx2.5!`, 72, 12);
    } else if (currentZone === TENSION_ZONES.TENSION) {
      ctx.fillStyle = p.c3;
      ctx.fillText(`${ratio}%[TENSION]`, 74, 12);
    } else if (highDanger) {
      ctx.fillStyle = p.accentRed || p.c3;
      ctx.fillText(`${ratio}%!DENSE!`, 78, 12);
    } else {
      ctx.fillStyle = p.c2;
      ctx.fillText(`CITY:${ratio}%`, 80, 12);
    }

    // Selected Weapon & Ammo
    const item = this.player.getSelectedItem();
    const ammo = this.player.ammo[item.id];
    ctx.fillStyle = p.c3;
    ctx.fillText(`${item.shortName}:${ammo}`, 160, 12);

    // Dash Stamina Bar
    ctx.fillStyle = p.c1;
    ctx.fillRect(230, 6, 40, 6);
    ctx.fillStyle = this.player.dashing ? p.c3 : p.c2;
    ctx.fillRect(230, 6, Math.round((this.player.stamina / 100) * 40), 6);

    // Police Alert Beacon
    const isAlert = this.policeUnits.some(pol => pol.state === 'CHASE');
    if (isAlert && Math.floor(Date.now() / 200) % 2 === 0) {
      ctx.fillStyle = p.c3;
      ctx.fillText('!ALERT!', 280, 12);
    }
  }

  renderTitleScreen() {
    const ctx = this.ctx;
    const p = this.palette;

    // Background motif
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // Frame borders
    ctx.strokeStyle = p.c2;
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, this.width - 12, this.height - 12);

    // Title text
    ctx.textAlign = 'center';
    ctx.fillStyle = p.c3;
    ctx.font = 'bold 18px monospace';
    ctx.fillText('FIRE STARTER', this.width / 2, 46);

    ctx.font = '10px monospace';
    ctx.fillStyle = p.c2;
    ctx.fillText('FLCL / CANTI-LORD EDITION', this.width / 2, 63);

    // Sacred Flame Icon in Center
    const flameY = 82;
    const blink = Math.floor(this.titleAnimTime * 4) % 2;
    this.renderer.drawFire(ctx, this.width / 2 - 16, flameY, blink);
    this.renderer.drawFire(ctx, this.width / 2, flameY, (blink + 1) % 2);

    // Philosophy Quote
    ctx.font = '9px monospace';
    ctx.fillStyle = p.c2;
    ctx.fillText('「救済も完全な勝利も存在しない」', this.width / 2, 118);
    ctx.fillText('燃やし尽くせば帰る場所を失い、', this.width / 2, 131);
    ctx.fillText('燃やさなければ街に呑まれる。', this.width / 2, 144);

    // Difficulty Selector
    const diffY = 168;
    ctx.fillStyle = p.c2;
    ctx.font = '8px monospace';
    ctx.fillText('DIFFICULTY: [ ▲ / ▼ / ◀ / ▶ ]', this.width / 2, diffY);

    const diffOptions = [
      { key: 'EASY', label: 'EASY', x: 68 },
      { key: 'NORMAL', label: 'NORMAL', x: 160 },
      { key: 'HARD', label: 'HARD', x: 252 }
    ];

    diffOptions.forEach((opt) => {
      const isSel = opt.key === this.difficulty;
      if (isSel) {
        ctx.fillStyle = p.c3;
        ctx.fillRect(opt.x - 34, diffY + 7, 68, 16);
        ctx.fillStyle = p.bg;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(opt.label, opt.x, diffY + 19);
      } else {
        ctx.strokeStyle = p.c1;
        ctx.strokeRect(opt.x - 34, diffY + 7, 68, 16);
        ctx.fillStyle = p.c1;
        ctx.font = '10px monospace';
        ctx.fillText(opt.label, opt.x, diffY + 19);
      }
    });

    // Difficulty description text
    ctx.font = '9px monospace';
    ctx.fillStyle = p.c2;
    ctx.fillText(this.balance.desc || '', this.width / 2, diffY + 36);

    // High Score for selected difficulty
    ctx.fillStyle = p.c3;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`HIGH TRIBUTE (${this.difficulty}): ${this.highScore}`, this.width / 2, 230);

    // Start instructions
    if (Math.floor(this.titleAnimTime * 2) % 2 === 0) {
      ctx.fillStyle = p.c3;
      ctx.font = 'bold 11px monospace';
      ctx.fillText('PRESS [A] TO BURN', this.width / 2, 264);
    }

    ctx.font = '8px monospace';
    ctx.fillStyle = p.c1;
    ctx.fillText(`[SELECT]: PALETTE (${this.palette.name})`, this.width / 2, 292);

    ctx.textAlign = 'left';
  }

  renderPausedScreen() {
    const ctx = this.ctx;
    const p = this.palette;

    ctx.fillStyle = 'rgba(8, 24, 32, 0.85)';
    ctx.fillRect(20, 40, this.width - 40, this.height - 80);
    ctx.strokeStyle = p.c2;
    ctx.strokeRect(20, 40, this.width - 40, this.height - 80);

    ctx.textAlign = 'center';
    ctx.fillStyle = p.c3;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('- PAUSE / OVERVIEW -', this.width / 2, 70);

    ctx.font = '10px monospace';
    ctx.fillStyle = p.c2;
    ctx.fillText(`SURVIVED: ${Math.floor(this.survivalTime)}s`, this.width / 2, 100);
    ctx.fillText(`BURNED BLOCKS: ${this.city.totalBuildingsBurned}`, this.width / 2, 120);
    ctx.fillText(`CITY DENSITY: ${Math.round(this.city.getBuildingRatio() * 100)}%`, this.width / 2, 140);
    ctx.fillText(`FIRES ACTIVE: ${this.city.getActiveFires().length}`, this.width / 2, 156);
    ctx.fillText(`DIFFICULTY: ${this.difficulty}`, this.width / 2, 172);

    ctx.font = '9px monospace';
    ctx.fillStyle = p.c1;
    ctx.fillText('A: 炎設置/投擲   B: 切替/ダッシュ', this.width / 2, 200);

    ctx.fillStyle = p.c3;
    ctx.fillText('PRESS [START] TO RESUME', this.width / 2, 230);
    ctx.textAlign = 'left';
  }

  renderTributeScreen() {
    const ctx = this.ctx;
    const p = this.palette;

    ctx.fillStyle = 'rgba(8, 24, 32, 0.9)';
    ctx.fillRect(16, 30, this.width - 32, this.height - 60);
    ctx.strokeStyle = p.c3;
    ctx.strokeRect(16, 30, this.width - 32, this.height - 60);

    ctx.textAlign = 'center';
    ctx.fillStyle = p.c3;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('黒き炎の神 カンティードへの奉納', this.width / 2, 58);

    ctx.font = '10px monospace';
    ctx.fillStyle = p.c2;
    ctx.fillText(`現在の信仰値 (SCORE): ${this.tributeScore}`, this.width / 2, 85);
    ctx.fillText(`最高信仰値 (BEST) : ${this.highScore}`, this.width / 2, 102);
    ctx.fillText(`境界維持時間 (TENSION): ${Math.floor(this.maxTensionTime)}秒`, this.width / 2, 119);

    ctx.fillStyle = p.c3;
    ctx.font = '9px monospace';
    ctx.fillText('【所持火具】', this.width / 2, 142);
    ctx.fillStyle = p.c2;
    ctx.fillText(`マッチ: x${this.player.ammo.MATCH}  ジッポー: x${this.player.ammo.LIGHTER}`, this.width / 2, 158);
    ctx.fillText(`火炎瓶: x${this.player.ammo.MOLOTOV}  時限爆弾: x${this.player.ammo.TIME_BOMB}`, this.width / 2, 174);

    ctx.font = '8px monospace';
    ctx.fillStyle = p.c1;
    ctx.fillText('灰の降る街の片隅で、神の祝福があらんことを', this.width / 2, 215);

    ctx.fillStyle = p.c3;
    ctx.fillText('PRESS [SELECT] TO RETURN', this.width / 2, 245);
    ctx.textAlign = 'left';
  }

  renderGameOverScreen() {
    const ctx = this.ctx;
    const p = this.palette;
    const reason = this.deathReason || DEATH_REASONS.FULL_BURN;

    ctx.fillStyle = 'rgba(8, 24, 32, 0.92)';
    ctx.fillRect(14, 25, this.width - 28, this.height - 50);
    ctx.strokeStyle = p.c3;
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 25, this.width - 28, this.height - 50);

    ctx.textAlign = 'center';

    // Game Over Title
    ctx.fillStyle = p.c3;
    ctx.font = 'bold 15px monospace';
    ctx.fillText('G A M E   O V E R', this.width / 2, 53);

    // Death Title
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = p.accentRed;
    ctx.fillText(`【 ${reason.title} 】`, this.width / 2, 75);

    // Message
    ctx.font = '9px monospace';
    ctx.fillStyle = p.c2;
    ctx.fillText(reason.msg, this.width / 2, 98);

    // Result Stats
    ctx.fillStyle = p.c1;
    ctx.fillRect(28, 112, this.width - 56, 1);

    ctx.fillStyle = p.c3;
    ctx.font = '9px monospace';
    ctx.fillText(`奉納スコア: ${this.tributeScore}`, this.width / 2, 130);
    ctx.fillText(`生存時間: ${Math.floor(this.survivalTime)}秒`, this.width / 2, 145);
    ctx.fillText(`境界維持(TENSION): ${Math.floor(this.maxTensionTime)}秒`, this.width / 2, 160);
    ctx.fillText(`焼却棟数: ${this.city.totalBuildingsBurned}棟`, this.width / 2, 175);

    if (this.tributeScore >= this.highScore && this.tributeScore > 0) {
      ctx.fillStyle = p.c3;
      ctx.fillText('* NEW RECORD *', this.width / 2, 195);
    } else {
      ctx.fillStyle = p.c2;
      ctx.fillText(`BEST SCORE: ${this.highScore}`, this.width / 2, 195);
    }

    // Evaluation & Ambivalence Epilogue
    if (reason.id === 'FULL_BURN') {
      ctx.font = '8px monospace';
      ctx.fillStyle = p.accentRed;
      ctx.fillText('――悪の街を憎んだが、己の居場所も共に灰となった――', this.width / 2, 215);
    } else {
      ctx.font = '8px monospace';
      ctx.fillStyle = p.c2;
      ctx.fillText(reason.evaluation, this.width / 2, 215);
    }

    // Prompt
    ctx.fillStyle = p.c3;
    ctx.font = 'bold 10px monospace';
    ctx.fillText('A: 再度街を焼く / B: 終了', this.width / 2, 255);

    ctx.textAlign = 'left';
  }
}
