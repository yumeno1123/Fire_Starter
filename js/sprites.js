// 8-bit Retro Pixel-Art Sprite Renderer

import { TILE_SIZE } from './constants.js';

export class SpriteRenderer {
  constructor(palette) {
    this.p = palette;
  }

  setPalette(palette) {
    this.p = palette;
  }

  // Draw a 16x16 pixel matrix defined as array of 16 strings (each 16 chars)
  // Character mapping:
  // '.' = transparent
  // '0' = palette c0 (darkest)
  // '1' = palette c1 (dark)
  // '2' = palette c2 (light)
  // '3' = palette c3 (lightest)
  // 'R' = accentRed
  drawMatrix(ctx, matrix, x, y, flipX = false) {
    const p = this.p;
    const colorMap = {
      '0': p.c0,
      '1': p.c1,
      '2': p.c2,
      '3': p.c3,
      'R': p.accentRed
    };

    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r];
      for (let c = 0; c < row.length; c++) {
        const char = row[c];
        if (char === '.' || !colorMap[char]) continue;
        ctx.fillStyle = colorMap[char];
        const px = flipX ? (x + 15 - c) : (x + c);
        const py = y + r;
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }

  // --- Tile Sprites ---

  drawRoad(ctx, x, y, seed = 0) {
    ctx.fillStyle = this.p.c0;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    // Subtle road texture specks
    ctx.fillStyle = this.p.c1;
    if ((seed % 3) === 0) ctx.fillRect(x + 3, y + 4, 1, 1);
    if ((seed % 5) === 0) ctx.fillRect(x + 11, y + 12, 1, 1);
    if ((seed % 7) === 0) ctx.fillRect(x + 8, y + 8, 1, 1);
  }

  drawBuilding(ctx, x, y, health = 1.0, isGrowing = false) {
    // Outer wall
    ctx.fillStyle = this.p.c1;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Inner block
    ctx.fillStyle = isGrowing ? this.p.c2 : this.p.c0;
    ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    // Windows / Brutalist architecture details
    ctx.fillStyle = this.p.c2;
    ctx.fillRect(x + 3, y + 3, 3, 3);
    ctx.fillRect(x + 10, y + 3, 3, 3);
    ctx.fillRect(x + 3, y + 9, 3, 3);
    ctx.fillRect(x + 10, y + 9, 3, 3);

    // Damaged crack lines when damaged by fire
    if (health < 0.7) {
      ctx.fillStyle = this.p.c3;
      ctx.fillRect(x + 6, y + 2, 1, 4);
      ctx.fillRect(x + 7, y + 5, 2, 1);
    }
    if (health < 0.4) {
      ctx.fillStyle = this.p.c0;
      ctx.fillRect(x + 2, y + 11, 4, 1);
      ctx.fillRect(x + 5, y + 12, 1, 3);
    }
  }

  drawAsh(ctx, x, y, seed = 0) {
    ctx.fillStyle = this.p.c0;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Burnt rubble debris
    ctx.fillStyle = this.p.c1;
    ctx.fillRect(x + 2, y + 10, 4, 3);
    ctx.fillRect(x + 9, y + 7, 5, 4);
    ctx.fillRect(x + 5, y + 3, 3, 2);

    ctx.fillStyle = this.p.c2;
    ctx.fillRect(x + 3, y + 11, 2, 1);
    ctx.fillRect(x + 10, y + 8, 2, 2);
  }

  drawWet(ctx, x, y) {
    ctx.fillStyle = this.p.c0;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Water puddle ripples
    ctx.fillStyle = this.p.c2;
    ctx.fillRect(x + 3, y + 5, 10, 1);
    ctx.fillRect(x + 2, y + 6, 12, 4);
    ctx.fillRect(x + 4, y + 10, 8, 1);

    ctx.fillStyle = this.p.c3;
    ctx.fillRect(x + 5, y + 7, 4, 1);
    ctx.fillRect(x + 6, y + 8, 2, 1);
  }

  drawFire(ctx, x, y, frame = 0) {
    const f1 = [
      '................',
      '.......2........',
      '......232.......',
      '.....23332......',
      '.....23332......',
      '....2333332.....',
      '....2333332.....',
      '...233333332....',
      '...233.3.332....',
      '..233...3..32...',
      '..2333.33.332...',
      '..23333333332...',
      '...233333332....',
      '....2222222.....',
      '.....11111......',
      '................'
    ];

    const f2 = [
      '................',
      '........2.......',
      '......2332......',
      '.....233332.....',
      '.....233332.....',
      '....23333332....',
      '....23333332....',
      '...2333333332...',
      '...23..3.3332...',
      '..233...3..332..',
      '..2333.333.332..',
      '..23333333332...',
      '...233333332....',
      '....2222222.....',
      '.....11111......',
      '................'
    ];

    this.drawMatrix(ctx, (frame % 2 === 0) ? f1 : f2, x, y);
  }

  // --- Entities ---

  drawPlayer(ctx, x, y, dir = 'DOWN', walkFrame = 0, dashing = false) {
    // Cloaked Firestarter figure with hood and spark
    // 16x16 sprites
    const sprites = {
      DOWN_0: [
        '.....22222......',
        '....2333332.....',
        '....2303032.....', // eyes under hood
        '....2333332.....',
        '.....22222......',
        '...221111122....', // cloak
        '..21111111112...',
        '..21111111112...',
        '..21111111112...',
        '..21111111112...',
        '..21111111112...',
        '..22111111122...',
        '....2222222.....',
        '....202.202.....', // boots
        '....202.202.....',
        '................'
      ],
      DOWN_1: [
        '.....22222......',
        '....2333332.....',
        '....2303032.....',
        '....2333332.....',
        '.....22222......',
        '...221111122....',
        '..21111111112...',
        '..21111111112...',
        '..21111111112...',
        '..21111111112...',
        '..21111111112...',
        '..22111111122...',
        '....2222222.....',
        '....2022........', // walk step
        '.....202........',
        '................'
      ],
      UP_0: [
        '.....22222......',
        '....2222222.....', // back of hood
        '....2222222.....',
        '....2222222.....',
        '.....22222......',
        '...221111122....',
        '..21111111112...',
        '..21111111112...',
        '..21111111112...',
        '..21111111112...',
        '..21111111112...',
        '..22111111122...',
        '....2222222.....',
        '....202.202.....',
        '....202.202.....',
        '................'
      ],
      SIDE_0: [
        '.....22222......',
        '....2333332.....',
        '....2303222.....', // profile eye
        '....2333222.....',
        '.....22222......',
        '....21111222....',
        '...211111112....',
        '...211111112....',
        '...211111112....',
        '...211111112....',
        '...211111112....',
        '...221111122....',
        '....2222222.....',
        '....202.202.....',
        '....202.202.....',
        '................'
      ]
    };

    let sprite;
    let flip = false;
    if (dir === 'UP') {
      sprite = sprites.UP_0;
    } else if (dir === 'LEFT') {
      sprite = sprites.SIDE_0;
      flip = true;
    } else if (dir === 'RIGHT') {
      sprite = sprites.SIDE_0;
      flip = false;
    } else {
      sprite = (walkFrame % 2 === 0) ? sprites.DOWN_0 : sprites.DOWN_1;
    }

    this.drawMatrix(ctx, sprite, x, y, flip);

    // If dashing, draw dash trail spark
    if (dashing) {
      ctx.fillStyle = this.p.c3;
      ctx.fillRect(x + 2, y + 14, 2, 2);
      ctx.fillRect(x + 12, y + 14, 2, 2);
    }
  }

  drawPolice(ctx, x, y, dir = 'DOWN', isAlert = false, walkFrame = 0) {
    // Police Officer: Cap, badge, uniform
    const sprite = [
      '....2222222.....', // cap visor
      '...233333332....',
      '...200000002....',
      '....2333332.....',
      '....2303032.....', // eyes
      '.....23332......',
      '...221111122....', // uniform
      '..21113111112...', // badge '3'
      '..21111111112...',
      '..21111111112...',
      '..21111111112...',
      '..22111111122...',
      '....202.202.....',
      '....202.202.....',
      '....202.202.....',
      '................'
    ];

    const flip = (dir === 'LEFT');
    this.drawMatrix(ctx, sprite, x, y, flip);

    // Alert indicator "!" above police when alerted
    if (isAlert) {
      ctx.fillStyle = this.p.c3;
      ctx.fillRect(x + 7, y - 6, 2, 4);
      ctx.fillRect(x + 7, y - 1, 2, 2);
    }
  }

  drawFirefighter(ctx, x, y, dir = 'DOWN', isSpraying = false, walkFrame = 0) {
    // Firefighter: Helmet with stripe, jacket, boots
    const sprite = [
      '....2333332.....', // yellow helmet
      '...233333332....',
      '....2222222.....',
      '....2333332.....',
      '....2303032.....',
      '.....23332......',
      '...221111122....', // coat
      '..21112221112...', // reflective stripe '2'
      '..21112221112...',
      '..21111111112...',
      '..21111111112...',
      '..22111111122...',
      '....202.202.....',
      '....202.202.....',
      '....202.202.....',
      '................'
    ];

    const flip = (dir === 'LEFT');
    this.drawMatrix(ctx, sprite, x, y, flip);

    // Water spray animation when actively extinguishing
    if (isSpraying) {
      ctx.fillStyle = this.p.c3;
      if (dir === 'RIGHT') {
        ctx.fillRect(x + 16, y + 7, 8, 2);
        ctx.fillRect(x + 22, y + 6, 4, 4);
      } else if (dir === 'LEFT') {
        ctx.fillRect(x - 8, y + 7, 8, 2);
        ctx.fillRect(x - 10, y + 6, 4, 4);
      } else if (dir === 'UP') {
        ctx.fillRect(x + 7, y - 8, 2, 8);
        ctx.fillRect(x + 6, y - 10, 4, 4);
      } else {
        ctx.fillRect(x + 7, y + 16, 2, 8);
        ctx.fillRect(x + 6, y + 22, 4, 4);
      }
    }
  }

  // --- Items & Drops ---

  drawItem(ctx, x, y, itemId) {
    // 16x16 icon for dropped item
    if (itemId === 'MATCH') {
      const match = [
        '................',
        '.........33.....', // phosphorus tip
        '.........33.....',
        '........22......',
        '.......22.......',
        '......22........',
        '.....22.........',
        '....22..........',
        '...22...........',
        '..22............',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
      ];
      this.drawMatrix(ctx, match, x, y);
    } else if (itemId === 'LIGHTER') {
      const lighter = [
        '................',
        '.......3........', // flame
        '......333.......',
        '.....22222......', // hinge
        '.....23332......',
        '.....23332......', // casing
        '.....23332......',
        '.....23332......',
        '.....23332......',
        '.....22222......',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
      ];
      this.drawMatrix(ctx, lighter, x, y);
    } else if (itemId === 'MOLOTOV') {
      const molotov = [
        '................',
        '.......3........', // rag flame
        '......333.......',
        '.......2........', // neck
        '......222.......',
        '.....23332......', // bottle body
        '.....23332......',
        '.....23332......',
        '.....22222......',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
      ];
      this.drawMatrix(ctx, molotov, x, y);
    } else if (itemId === 'TIME_BOMB') {
      const bomb = [
        '................',
        '........3.......', // spark
        '.......2........', // fuse
        '.....22222......',
        '....2333332.....',
        '....2300032.....', // LED timer box
        '....2333332.....',
        '....2333332.....',
        '.....22222......',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
      ];
      this.drawMatrix(ctx, bomb, x, y);
    }
  }

  drawBomb(ctx, x, y, timeLeft = 3.0) {
    // Placed bomb blinking
    const blink = (Math.floor(timeLeft * 6) % 2 === 0);
    ctx.fillStyle = this.p.c0;
    ctx.beginPath();
    ctx.arc(x + 8, y + 8, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = blink ? this.p.c3 : this.p.c2;
    ctx.fillRect(x + 6, y + 6, 4, 4);

    // Fuse spark
    ctx.fillStyle = this.p.c3;
    ctx.fillRect(x + 7, y + 1, 2, 2);
  }

  drawExplosion(ctx, x, y, radius = 2, progress = 0.5) {
    // Expanding explosion circle / shockwave
    const px = x + 8;
    const py = y + 8;
    const currentR = radius * TILE_SIZE * (progress < 0.5 ? progress * 2 : 1.0);

    ctx.fillStyle = (progress < 0.4) ? this.p.c3 : this.p.c2;
    ctx.beginPath();
    ctx.arc(px, py, currentR, 0, Math.PI * 2);
    ctx.fill();

    if (progress > 0.3) {
      ctx.fillStyle = this.p.c0;
      ctx.beginPath();
      ctx.arc(px, py, currentR * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
