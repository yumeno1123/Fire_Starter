import { CONFIG } from './config';
import type { Cell, GameState } from './state';
import { TEXT_PACKS } from './texts';

interface EmberParticle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private embers: EmberParticle[] = [];

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context is not available');
    }
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
    this.initEmbers();
  }

  private initEmbers(): void {
    this.embers = Array.from({ length: 48 }, () => ({
      x: Math.random() * CONFIG.LCD_WIDTH,
      y: Math.random() * CONFIG.LCD_HEIGHT,
      vy: 18 + Math.random() * 34,
      vx: (Math.random() - 0.5) * 12,
      size: Math.random() < 0.65 ? 2 : 3,
    }));
  }

  public render(state: GameState, dt: number): void {
    if (state.isManifesting) {
      this.renderCantiManifestation(state, dt);
      return;
    }

    if (state.badEnd) {
      this.renderBadEnding(state);
      this.drawLcdDotGrid();
      return;
    }

    // 1. Reflective LCD ghosting clear (leaves trailing afterimages)
    this.ctx.fillStyle = CONFIG.PALETTE.GHOST_CLEAR;
    this.ctx.fillRect(0, 0, CONFIG.LCD_WIDTH, CONFIG.LCD_HEIGHT);

    // 2. Draw 28x18 town map cells
    this.drawTownCells(state);

    // 3. Draw visual effects (molotov arc, ignition flash, bomb shockwave)
    this.drawEffects(state);

    // 4. Draw NPCs (Firefighters & Police) and Player
    this.drawFirefighters(state);
    this.drawPolice(state);
    this.drawPlayer(state);

    // 5. Draw LCD Top HUD Bar & Bottom Myth Narration Box
    this.drawTopHud(state);
    if (state.narrationTimerSec > 0) {
      this.drawNarrationOverlay(state);
    }

    // 6. Overlay 1px LCD dot-matrix grid
    this.drawLcdDotGrid();
  }

  private drawTownCells(state: GameState): void {
    const cs = CONFIG.CELL_SIZE;
    for (let y = 1; y < CONFIG.GRID_ROWS; y++) {
      for (let x = 0; x < CONFIG.GRID_COLS; x++) {
        const cell = state.cells[y][x];
        this.drawSingleCell(cell, x * cs, y * cs, state.elapsedSec);
      }
    }
  }

  private drawSingleCell(cell: Cell, px: number, py: number, elapsed: number): void {
    const { COLOR_0, COLOR_1, COLOR_2, COLOR_3 } = CONFIG.PALETTE;

    if (cell.terrain === 'RIVER') {
      this.ctx.fillStyle = COLOR_1;
      this.ctx.fillRect(px, py, 8, 8);
      this.ctx.fillStyle = COLOR_0;
      const waveOffset = Math.floor(elapsed * 3 + cell.x) % 4;
      this.ctx.fillRect(px + waveOffset, py + 2, 3, 1);
      this.ctx.fillRect(px + ((waveOffset + 2) % 5), py + 5, 3, 1);
      return;
    }

    if (cell.terrain === 'ROAD') {
      this.ctx.fillStyle = COLOR_1;
      this.ctx.fillRect(px, py, 8, 8);
      this.ctx.fillStyle = COLOR_0;
      if ((cell.x + cell.y) % 2 === 0) {
        this.ctx.fillRect(px + 3, py + 3, 2, 2);
      }
      if (cell.y === 8 || cell.y === 9) {
        this.ctx.fillStyle = COLOR_2;
        this.ctx.fillRect(px, py, 1, 8);
        this.ctx.fillRect(px + 7, py, 1, 8);
      }
      return;
    }

    // Buildable LOT states
    if (cell.state === 'EMPTY') {
      this.ctx.fillStyle = COLOR_1;
      this.ctx.fillRect(px + 2, py + 5, 1, 1);
      this.ctx.fillRect(px + 5, py + 2, 1, 1);
      return;
    }

    if (cell.state === 'ASH') {
      this.ctx.fillStyle = COLOR_1;
      this.ctx.fillRect(px + 1, py + 6, 2, 1);
      this.ctx.fillRect(px + 4, py + 5, 3, 1);
      this.ctx.fillStyle = COLOR_2;
      this.ctx.fillRect(px + 2, py + 4, 1, 1);
      this.ctx.fillRect(px + 5, py + 6, 1, 1);
      return;
    }

    if (cell.state === 'BUILDING_1') {
      this.ctx.fillStyle = COLOR_2;
      this.ctx.fillRect(px + 1, py + 3, 6, 5);
      this.ctx.fillRect(px + 2, py + 2, 4, 1);
      this.ctx.fillStyle = COLOR_0;
      this.ctx.fillRect(px + 2, py + 4, 1, 1);
      this.ctx.fillRect(px + 5, py + 4, 1, 1);
      return;
    }

    if (cell.state === 'BUILDING_2') {
      this.ctx.fillStyle = COLOR_2;
      this.ctx.fillRect(px + 1, py + 1, 6, 7);
      this.ctx.fillStyle = COLOR_3;
      this.ctx.fillRect(px + 1, py + 1, 6, 1);
      this.ctx.fillStyle = COLOR_0;
      for (let wy = 3; wy <= 5; wy += 2) {
        this.ctx.fillRect(px + 2, py + wy, 1, 1);
        this.ctx.fillRect(px + 5, py + wy, 1, 1);
      }
      return;
    }

    if (cell.state === 'BUILDING_3') {
      this.ctx.fillStyle = COLOR_2;
      this.ctx.fillRect(px, py + 1, 8, 7);
      this.ctx.fillStyle = COLOR_3;
      this.ctx.fillRect(px, py + 1, 8, 2);
      this.ctx.fillRect(px + 5, py, 2, 2);
      this.ctx.fillStyle = COLOR_0;
      for (let wx = 1; wx <= 6; wx += 2) {
        this.ctx.fillRect(px + wx, py + 4, 1, 1);
        this.ctx.fillRect(px + wx, py + 6, 1, 1);
      }
      return;
    }

    // BURNING: Black Flame (COLOR_3 with flickering dark tongues)
    this.drawBlackFlameCell(cell, px, py);
  }

  private drawBlackFlameCell(cell: Cell, px: number, py: number): void {
    const { COLOR_0, COLOR_2, COLOR_3 } = CONFIG.PALETTE;
    const f = Math.floor(cell.flickerPhase) % 4;

    this.ctx.fillStyle = COLOR_2;
    this.ctx.fillRect(px + 1, py + 3, 6, 5);

    this.ctx.fillStyle = COLOR_3;
    this.ctx.fillRect(px + 1, py + 4, 6, 4);
    this.ctx.fillRect(px + 2, py + 2 + (f % 2), 4, 3);
    this.ctx.fillRect(px + 1 + f, py + 1, 2, 2);
    this.ctx.fillRect(px + 5 - f, py, 1, 2);

    this.ctx.fillStyle = COLOR_0;
    this.ctx.fillRect(px + 3 + (f % 2), py + 5, 2, 2);
  }

  private drawEffects(state: GameState): void {
    const cs = CONFIG.CELL_SIZE;
    const { COLOR_0, COLOR_2, COLOR_3 } = CONFIG.PALETTE;

    for (const fx of state.effects) {
      const progress = Math.min(1, fx.timerSec / fx.durationSec);

      if (fx.type === 'molotov_arc' && fx.startX !== undefined && fx.startY !== undefined) {
        const curX = (fx.startX + (fx.x - fx.startX) * progress) * cs;
        const curY =
          (fx.startY + (fx.y - fx.startY) * progress) * cs -
          Math.sin(progress * Math.PI) * 14;
        this.ctx.fillStyle = COLOR_3;
        this.ctx.fillRect(Math.floor(curX) - 1, Math.floor(curY) - 1, 3, 3);
        continue;
      }

      const cx = Math.floor(fx.x * cs);
      const cy = Math.floor(fx.y * cs);
      const r = Math.floor(fx.radius * cs * progress);

      this.ctx.strokeStyle = fx.type === 'extinguish' ? COLOR_0 : COLOR_3;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);

      if (fx.type === 'explosion' && progress < 0.5) {
        this.ctx.fillStyle = progress < 0.25 ? COLOR_0 : COLOR_2;
        this.ctx.fillRect(cx - r + 2, cy - r + 2, r * 2 - 4, r * 2 - 4);
      }
    }
  }

  private drawFirefighters(state: GameState): void {
    const cs = CONFIG.CELL_SIZE;
    const { COLOR_0, COLOR_2, COLOR_3 } = CONFIG.PALETTE;

    for (const ff of state.firefighters) {
      const px = Math.floor(ff.x * cs) - 3;
      const py = Math.floor(ff.y * cs) - 3;

      this.ctx.fillStyle = COLOR_2;
      this.ctx.fillRect(px + 1, py, 4, 2);
      this.ctx.fillRect(px, py + 1, 6, 1);
      this.ctx.fillRect(px + 1, py + 2, 4, 4);

      this.ctx.fillStyle = COLOR_0;
      this.ctx.fillRect(px + 2, py + 2, 2, 1);

      if (ff.isExtinguishing && Math.floor(state.elapsedSec * 15) % 2 === 0) {
        this.ctx.fillStyle = COLOR_3;
        this.ctx.fillRect(px - 2, py + 2, 2, 2);
        this.ctx.fillRect(px + 6, py + 2, 2, 2);
      }
    }
  }

  private drawPolice(state: GameState): void {
    const cs = CONFIG.CELL_SIZE;
    const { COLOR_0, COLOR_2, COLOR_3 } = CONFIG.PALETTE;

    for (const cop of state.police) {
      const px = Math.floor(cop.x * cs) - 3;
      const py = Math.floor(cop.y * cs) - 3;

      this.ctx.fillStyle = COLOR_3;
      this.ctx.fillRect(px + 1, py, 5, 2);
      this.ctx.fillStyle = COLOR_2;
      this.ctx.fillRect(px + 1, py + 2, 4, 4);
      this.ctx.fillStyle = COLOR_0;
      this.ctx.fillRect(px + 2, py + 1, 1, 1);

      if (cop.isChasing && Math.floor(state.elapsedSec * 10) % 2 === 0) {
        this.ctx.fillStyle = COLOR_3;
        this.ctx.fillRect(px + 2, py - 5, 2, 3);
        this.ctx.fillRect(px + 2, py - 1, 2, 1);
      }
    }
  }

  private drawPlayer(state: GameState): void {
    const cs = CONFIG.CELL_SIZE;
    const { COLOR_0, COLOR_3 } = CONFIG.PALETTE;
    const px = Math.floor(state.player.x * cs) - 3;
    const py = Math.floor(state.player.y * cs) - 3;

    // White outline so player is always distinguishable amidst buildings
    this.ctx.fillStyle = COLOR_0;
    this.ctx.fillRect(px, py - 1, 6, 8);

    // Dark silhouette body
    this.ctx.fillStyle = COLOR_3;
    this.ctx.fillRect(px + 1, py, 4, 2);
    this.ctx.fillRect(px + 1, py + 2, 4, 3);
    const legShift = Math.floor(state.player.stepPhase) % 2;
    this.ctx.fillRect(px + 1, py + 5, 1, 1 + legShift);
    this.ctx.fillRect(px + 4, py + 5, 1, 2 - legShift);

    // Facing spark indicator
    const tx = px + 3 + state.player.facing.dx * 4;
    const ty = py + 3 + state.player.facing.dy * 4;
    this.ctx.fillRect(tx, ty, 2, 2);
  }

  private drawTopHud(state: GameState): void {
    const { COLOR_0, COLOR_1, COLOR_2, COLOR_3 } = CONFIG.PALETTE;

    this.ctx.fillStyle = COLOR_3;
    this.ctx.fillRect(0, 0, CONFIG.LCD_WIDTH, 9);
    this.ctx.fillStyle = COLOR_1;
    this.ctx.fillRect(0, 8, CONFIG.LCD_WIDTH, 1);

    this.ctx.font = 'bold 7px monospace';
    this.ctx.textBaseline = 'top';
    this.ctx.fillStyle = COLOR_0;

    const dayStr = `D${String(state.day).padStart(2, '0')}`;
    const sufStr = `SUF:${String(Math.floor(state.suffocation)).padStart(2, '0')}%`;
    const dstStr = `DST:${String(Math.floor(state.destruction)).padStart(2, '0')}%`;
    const weapon = state.getCurrentWeapon();

    this.ctx.fillText(dayStr, 3, 1);

    // Blink SUF or DST if critical (>= 80%)
    const blinkOff = Math.floor(state.elapsedSec * 6) % 2 === 1;
    if (!(state.suffocation >= CONFIG.GAUGE.DANGER_THRESHOLD && blinkOff)) {
      this.ctx.fillText(sufStr, 28, 1);
    }
    if (!(state.destruction >= CONFIG.GAUGE.DANGER_THRESHOLD && blinkOff)) {
      this.ctx.fillText(dstStr, 86, 1);
    }

    this.ctx.fillText(`[${weapon.nameShort}]`, 144, 1);

    if (state.canManifestCanti()) {
      if (!blinkOff) {
        this.ctx.fillStyle = COLOR_0;
        this.ctx.fillRect(182, 1, 39, 7);
        this.ctx.fillStyle = COLOR_3;
        this.ctx.fillText('PRAY!', 187, 1);
      }
    } else {
      this.ctx.fillStyle = COLOR_2;
      this.ctx.fillText('PRAY', 188, 1);
    }
  }

  private drawNarrationOverlay(state: GameState): void {
    const { COLOR_0, COLOR_2, COLOR_3 } = CONFIG.PALETTE;
    const boxX = 6;
    const boxY = 104;
    const boxW = CONFIG.LCD_WIDTH - 12;
    const boxH = 35;

    this.ctx.fillStyle = COLOR_3;
    this.ctx.fillRect(boxX, boxY, boxW, boxH);
    this.ctx.strokeStyle = COLOR_0;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(boxX + 1, boxY + 1, boxW - 2, boxH - 2);

    const elapsedInNarration = state.narrationTotalSec - state.narrationTimerSec;
    const charCount = Math.min(
      state.narrationText.length,
      Math.floor(elapsedInNarration * 32) + 4,
    );
    const visibleText = state.narrationText.slice(0, charCount);

    this.ctx.fillStyle = COLOR_0;
    this.ctx.font = '8px serif';
    this.ctx.textBaseline = 'top';

    const lines = this.wrapText(visibleText, 24);
    lines.slice(0, 3).forEach((line, idx) => {
      this.ctx.fillText(line, boxX + 6, boxY + 5 + idx * 10);
    });

    this.ctx.fillStyle = COLOR_2;
    this.ctx.fillRect(boxX + boxW - 7, boxY + boxH - 6, 3, 3);
  }

  private renderCantiManifestation(state: GameState, dt: number): void {
    const total = CONFIG.TIME.MANIFESTATION_DURATION_SEC;
    const elapsed = total - state.manifestTimerSec;
    const { BACKLIGHT_WHITE, SILHOUETTE_BLACK, COLOR_2 } = CONFIG.PALETTE;

    // Phase 1 (0.0s ~ 0.45s): LCD shatter & stark black/white inversion flashes
    if (elapsed < 0.45) {
      const invert = Math.floor(elapsed * 28) % 2 === 0;
      this.ctx.fillStyle = invert ? BACKLIGHT_WHITE : SILHOUETTE_BLACK;
      this.ctx.fillRect(0, 0, CONFIG.LCD_WIDTH, CONFIG.LCD_HEIGHT);
      this.drawLcdCracks(state, invert ? SILHOUETTE_BLACK : BACKLIGHT_WHITE);
      return;
    }

    // Phase 2 (0.45s ~ 3.2s): Blinding backlight + TV-headed Dark Angel silhouette
    this.ctx.fillStyle = BACKLIGHT_WHITE;
    this.ctx.fillRect(0, 0, CONFIG.LCD_WIDTH, CONFIG.LCD_HEIGHT);

    this.drawLcdCracks(state, 'rgba(13, 14, 10, 0.22)');
    this.updateAndDrawBlackEmbers(dt, SILHOUETTE_BLACK, COLOR_2);
    this.drawBacklitDeitySilhouette(state, elapsed);

    // Cut-in myth text in bold serif
    const cutIn = TEXT_PACKS[state.textMode].climax.cutIn;
    this.ctx.fillStyle = SILHOUETTE_BLACK;
    this.ctx.fillRect(0, 114, CONFIG.LCD_WIDTH, 18);
    this.ctx.fillStyle = BACKLIGHT_WHITE;
    this.ctx.font = 'bold 9px serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(cutIn, CONFIG.LCD_WIDTH / 2, 123);
    this.ctx.textAlign = 'left';
  }

  private drawLcdCracks(state: GameState, strokeStyle: string): void {
    const cx = CONFIG.LCD_WIDTH / 2;
    const cy = CONFIG.LCD_HEIGHT / 2;
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.lineWidth = 1.2;

    for (const seed of state.crackSeeds) {
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      const midX = cx + Math.cos(seed.angle) * (seed.length * 0.45) + seed.jitter;
      const midY = cy + Math.sin(seed.angle) * (seed.length * 0.45) - seed.jitter;
      const endX = cx + Math.cos(seed.angle) * seed.length;
      const endY = cy + Math.sin(seed.angle) * seed.length;
      this.ctx.lineTo(midX, midY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }
  }

  private updateAndDrawBlackEmbers(dt: number, colorA: string, colorB: string): void {
    for (let i = 0; i < this.embers.length; i++) {
      const e = this.embers[i];
      e.y -= e.vy * dt;
      e.x += e.vx * dt;
      if (e.y < -4) {
        e.y = CONFIG.LCD_HEIGHT + 4;
        e.x = Math.random() * CONFIG.LCD_WIDTH;
      }
      this.ctx.fillStyle = i % 3 === 0 ? colorB : colorA;
      this.ctx.fillRect(Math.floor(e.x), Math.floor(e.y), e.size, e.size);
    }
  }

  private drawBacklitDeitySilhouette(state: GameState, elapsed: number): void {
    const cx = CONFIG.LCD_WIDTH / 2;
    const cy = 62 + Math.sin(elapsed * 3.2) * 3;
    const wingSpread = 78 + Math.sin(elapsed * 5.0) * 6;
    const { BACKLIGHT_WHITE, SILHOUETTE_BLACK } = CONFIG.PALETTE;

    this.ctx.fillStyle = SILHOUETTE_BLACK;
    this.ctx.strokeStyle = SILHOUETTE_BLACK;

    // 1. Halo ring above head
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy - 34, 16, 4, -0.12, 0, Math.PI * 2);
    this.ctx.stroke();

    // 2. Huge tattered cloak wings spreading left and right
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - 10);
    this.ctx.lineTo(cx - wingSpread, cy - 32);
    this.ctx.lineTo(cx - wingSpread + 12, cy + 4);
    this.ctx.lineTo(cx - wingSpread * 0.65, cy - 2);
    this.ctx.lineTo(cx - wingSpread * 0.48, cy + 20);
    this.ctx.lineTo(cx - 10, cy + 8);
    this.ctx.lineTo(cx + 10, cy + 8);
    this.ctx.lineTo(cx + wingSpread * 0.48, cy + 20);
    this.ctx.lineTo(cx + wingSpread * 0.65, cy - 2);
    this.ctx.lineTo(cx + wingSpread - 12, cy + 4);
    this.ctx.lineTo(cx + wingSpread, cy - 32);
    this.ctx.closePath();
    this.ctx.fill();

    // 3. Head: Retro CRT TV monitor head in original mode, or angular seraph head in homage mode
    if (state.textMode === 'original') {
      this.ctx.fillRect(cx - 13, cy - 26, 26, 17);
      this.ctx.fillStyle = BACKLIGHT_WHITE;
      this.ctx.fillRect(cx - 9, cy - 22, 18, 9);
      this.ctx.fillStyle = SILHOUETTE_BLACK;
      this.ctx.fillRect(cx - 6, cy - 19, 12, 3);
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - 30);
      this.ctx.lineTo(cx - 12, cy - 12);
      this.ctx.lineTo(cx + 12, cy - 12);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.fillStyle = BACKLIGHT_WHITE;
      this.ctx.fillRect(cx - 6, cy - 19, 12, 2);
      this.ctx.fillStyle = SILHOUETTE_BLACK;
    }

    // 4. Slender floating torso & legs
    this.ctx.fillRect(cx - 6, cy - 9, 12, 22);
    this.ctx.fillRect(cx - 5, cy + 13, 4, 24);
    this.ctx.fillRect(cx + 2, cy + 13, 4, 22);
  }

  private renderBadEnding(state: GameState): void {
    if (!state.badEnd) return;
    const { COLOR_0, COLOR_2, COLOR_3 } = CONFIG.PALETTE;
    const content = TEXT_PACKS[state.textMode].badEnds[state.badEnd];

    if (state.badEnd === 'suffocation') {
      // Fill entire LCD with dense gray-olive buildings
      this.ctx.fillStyle = COLOR_2;
      this.ctx.fillRect(0, 0, CONFIG.LCD_WIDTH, CONFIG.LCD_HEIGHT);
      this.ctx.fillStyle = COLOR_3;
      for (let y = 0; y < CONFIG.LCD_HEIGHT; y += 8) {
        for (let x = 0; x < CONFIG.LCD_WIDTH; x += 8) {
          this.ctx.fillRect(x + 1, y + 1, 6, 2);
        }
      }
    } else if (state.badEnd === 'destruction') {
      // Flash black fire for first 0.7s, then bleach to empty white ash (COLOR_0)
      if (state.badEndTimerSec < 0.7) {
        const flash = Math.floor(state.badEndTimerSec * 20) % 2 === 0;
        this.ctx.fillStyle = flash ? COLOR_3 : COLOR_0;
      } else {
        this.ctx.fillStyle = COLOR_0;
      }
      this.ctx.fillRect(0, 0, CONFIG.LCD_WIDTH, CONFIG.LCD_HEIGHT);
    }

    // Draw Bad End message window
    const winX = 10;
    const winY = 22;
    const winW = CONFIG.LCD_WIDTH - 20;
    const winH = 100;

    this.ctx.fillStyle = state.badEnd === 'destruction' && state.badEndTimerSec >= 0.7 ? COLOR_0 : COLOR_3;
    this.ctx.fillRect(winX, winY, winW, winH);
    this.ctx.strokeStyle = state.badEnd === 'destruction' && state.badEndTimerSec >= 0.7 ? COLOR_3 : COLOR_0;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(winX + 2, winY + 2, winW - 4, winH - 4);

    const textColor =
      state.badEnd === 'destruction' && state.badEndTimerSec >= 0.7 ? COLOR_3 : COLOR_0;
    this.ctx.fillStyle = textColor;
    this.ctx.font = 'bold 8px monospace';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(content.header, winX + 10, winY + 10);

    this.ctx.font = '8px serif';
    let lineY = winY + 26;
    for (const paragraph of content.lines) {
      const wrapped = this.wrapText(paragraph, 22);
      for (const l of wrapped) {
        this.ctx.fillText(l, winX + 10, lineY);
        lineY += 11;
      }
    }

    if (Math.floor(state.badEndTimerSec * 2.5) % 2 === 0) {
      this.ctx.font = 'bold 7px monospace';
      this.ctx.fillText('PRESS [FIRE / START] TO LOOP AGAIN', winX + 18, winY + winH - 14);
    }
  }

  private drawLcdDotGrid(): void {
    this.ctx.fillStyle = CONFIG.PALETTE.LCD_GRID;
    for (let x = 0; x < CONFIG.LCD_WIDTH; x += 2) {
      this.ctx.fillRect(x, 0, 1, CONFIG.LCD_HEIGHT);
    }
    for (let y = 0; y < CONFIG.LCD_HEIGHT; y += 2) {
      this.ctx.fillRect(0, y, CONFIG.LCD_WIDTH, 1);
    }
  }

  private wrapText(text: string, maxCharsPerLine: number): string[] {
    const result: string[] = [];
    for (let i = 0; i < text.length; i += maxCharsPerLine) {
      result.push(text.slice(i, i + maxCharsPerLine));
    }
    return result;
  }
}
