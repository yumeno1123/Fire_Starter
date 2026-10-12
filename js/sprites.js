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
    // Clear paved road tile: asphalt base with subtle cobblestone & lane markings
    ctx.fillStyle = this.p.c0;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Subtle road surface texture specks & paving dots
    ctx.fillStyle = this.p.c1;
    ctx.fillRect(x + 2, y + 2, 1, 1);
    ctx.fillRect(x + 13, y + 2, 1, 1);
    ctx.fillRect(x + 2, y + 13, 1, 1);
    ctx.fillRect(x + 13, y + 13, 1, 1);

    if ((seed % 3) === 0) {
      ctx.fillRect(x + 7, y + 7, 2, 2);
    } else if ((seed % 2) === 0) {
      ctx.fillRect(x + 5, y + 8, 2, 1);
      ctx.fillRect(x + 9, y + 8, 2, 1);
    }
  }

  drawBuilding(ctx, x, y, health = 1.0, isGrowing = false, tier = 1) {
    const healthRatio = Math.max(0, Math.min(1.0, health / (tier || 1)));

    if (isGrowing) {
      // Growing / Sprouting: pulsing warning outline
      ctx.fillStyle = this.p.c2;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = this.p.c0;
      ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.fillStyle = this.p.c3;
      ctx.fillRect(x + 5, y + 5, 6, 6);
      return;
    }

    // 1. Solid Building Block Base (c1 wall body, solid impenetrable obstacle)
    ctx.fillStyle = this.p.c1;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // 2. Beveled Top & Left Light Highlight (c2/c3: gives prominent 3D raised block effect)
    ctx.fillStyle = (tier >= 3) ? this.p.c3 : this.p.c2;
    ctx.fillRect(x, y, TILE_SIZE, 1); // Top rim
    ctx.fillRect(x, y, 1, TILE_SIZE); // Left rim

    // 3. Bottom & Right Cast Shadow (c0: establishes depth against the road)
    ctx.fillStyle = this.p.c0;
    ctx.fillRect(x, y + TILE_SIZE - 1, TILE_SIZE, 1); // Bottom shadow
    ctx.fillRect(x + TILE_SIZE - 1, y, 1, TILE_SIZE); // Right shadow

    if (tier >= 3) {
      // Tier 3: High-Rise Brutalist Fortress / Monolith
      // Heavy double reinforced rim
      ctx.fillStyle = this.p.c2;
      ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 1);
      ctx.fillRect(x + 2, y + TILE_SIZE - 3, TILE_SIZE - 4, 1);
      ctx.fillRect(x + 2, y + 2, 1, TILE_SIZE - 4);
      ctx.fillRect(x + TILE_SIZE - 3, y + 2, 1, TILE_SIZE - 4);

      // Rooftop antenna spire
      ctx.fillStyle = this.p.c3;
      ctx.fillRect(x + 7, y - 2, 2, 3);

      // Dense illuminated glowing windows (c3)
      ctx.fillRect(x + 4, y + 4, 2, 2);
      ctx.fillRect(x + 7, y + 4, 2, 2);
      ctx.fillRect(x + 10, y + 4, 2, 2);
      ctx.fillRect(x + 4, y + 9, 2, 2);
      ctx.fillRect(x + 7, y + 9, 2, 2);
      ctx.fillRect(x + 10, y + 9, 2, 2);

      // Structural steel pillars (c0)
      ctx.fillStyle = this.p.c0;
      ctx.fillRect(x + 6, y + 3, 1, 10);
      ctx.fillRect(x + 9, y + 3, 1, 10);
    } else if (tier === 2) {
      // Tier 2: Mid-Rise Steel-Frame Building
      // Concrete corner columns
      ctx.fillStyle = this.p.c2;
      ctx.fillRect(x + 1, y + 1, 1, TILE_SIZE - 2);
      ctx.fillRect(x + TILE_SIZE - 2, y + 1, 1, TILE_SIZE - 2);

      // Center steel reinforcement beam (c0)
      ctx.fillStyle = this.p.c0;
      ctx.fillRect(x + 2, y + 7, TILE_SIZE - 4, 2);

      // 6 windows (c2) in 2 rows
      ctx.fillStyle = this.p.c2;
      ctx.fillRect(x + 3, y + 3, 2, 3);
      ctx.fillRect(x + 7, y + 3, 2, 3);
      ctx.fillRect(x + 11, y + 3, 2, 3);
      ctx.fillRect(x + 3, y + 10, 2, 3);
      ctx.fillRect(x + 7, y + 10, 2, 3);
      ctx.fillRect(x + 11, y + 10, 2, 3);
    } else {
      // Tier 1: Low-Rise Building (Solid block with 4 windows)
      // Dark window frame recesses (c0)
      ctx.fillStyle = this.p.c0;
      ctx.fillRect(x + 3, y + 3, 4, 4);
      ctx.fillRect(x + 9, y + 3, 4, 4);
      ctx.fillRect(x + 3, y + 9, 4, 4);
      ctx.fillRect(x + 9, y + 9, 4, 4);

      // Glowing glass pane (c2)
      ctx.fillStyle = this.p.c2;
      ctx.fillRect(x + 4, y + 4, 2, 2);
      ctx.fillRect(x + 10, y + 4, 2, 2);
      ctx.fillRect(x + 4, y + 10, 2, 2);
      ctx.fillRect(x + 10, y + 10, 2, 2);
    }

    // Damaged crack lines when damaged by fire
    if (healthRatio < 0.65) {
      ctx.fillStyle = this.p.c3;
      ctx.fillRect(x + 6, y + 2, 1, 4);
      ctx.fillRect(x + 7, y + 5, 2, 1);
    }
    if (healthRatio < 0.35) {
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
    // Cloaked Firestarter figure: pitch-black robe (c0), sharp glowing eyes (c3), flame spark in hand (R/3)
    const sprites = {
      DOWN_0: [
        '.....10001......', // pointed cowl peak
        '....1000001.....', // dark hood
        '....1000001.....',
        '....1303031.....', // glowing sharp eyes from dark hood
        '.....10001......', // cowl rim
        '....1000001.....', // pitch-black cloak (c0)
        '...100000001....',
        '..10000000001...',
        '..10000000001...',
        '..10000000001R..', // glowing spark in hand (R)
        '..100000000013..', // bright spark core (3)
        '..10000000001...',
        '...110000011....',
        '....000.000.....', // dark boots (0)
        '....000.000.....',
        '................'
      ],
      DOWN_1: [
        '.....10001......',
        '....1000001.....',
        '....1000001.....',
        '....1303031.....',
        '.....10001......',
        '....1000001.....',
        '...100000001....',
        '..10000000001...',
        '..10000000001...',
        '..10000000001R..',
        '..100000000013..',
        '..10000000001...',
        '...110000011....',
        '....0000........', // step forward
        '.....000........',
        '................'
      ],
      UP_0: [
        '.....10001......',
        '....1000001.....', // back of hood
        '....1000001.....',
        '....1000001.....',
        '.....10001......',
        '....1000001.....',
        '...100000001....',
        '..10000000001...',
        '..10000000001...',
        '..10000000001...',
        '..10000000001...',
        '..10000000001...',
        '...110000011....',
        '....000.000.....',
        '....000.000.....',
        '................'
      ],
      SIDE_0: [
        '.....10001......',
        '....1000001.....',
        '....1000001.....',
        '....1030011.....', // profile eye
        '.....10001......',
        '....100001......',
        '...10000001.....',
        '..1000000001....',
        '..10000000001...',
        '..10000000001R..', // spark in hand (R)
        '..100000000013..',
        '..1000000001....',
        '...11000001.....',
        '....000.000.....',
        '....000.000.....',
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

    // Floating Player Indicator (▼) above head: ensures player is always instantly identifiable
    const bob = Math.round(Math.sin(Date.now() / 180) * 1.5);
    const my = y - 5 + bob;
    // Outer highlight
    ctx.fillStyle = this.p.c3;
    ctx.fillRect(x + 5, my, 6, 1);
    ctx.fillRect(x + 6, my + 1, 4, 1);
    ctx.fillRect(x + 7, my + 2, 2, 1);
    // Inner high-contrast core
    ctx.fillStyle = this.p.c0;
    ctx.fillRect(x + 6, my, 4, 1);
    ctx.fillRect(x + 7, my + 1, 2, 1);

    // If dashing, draw dash trail spark
    if (dashing) {
      ctx.fillStyle = this.p.accentRed || this.p.c3;
      ctx.fillRect(x + 1, y + 13, 2, 2);
      ctx.fillRect(x + 13, y + 13, 2, 2);
      ctx.fillStyle = this.p.c3;
      ctx.fillRect(x + 2, y + 14, 1, 1);
      ctx.fillRect(x + 13, y + 14, 1, 1);
    }
  }

  drawStunStars(ctx, x, y) {
    const t = Date.now() / 120;
    const off1 = Math.sin(t) * 4;
    const off2 = Math.cos(t) * 3;
    ctx.fillStyle = this.p.c3;
    ctx.fillRect(x + 4 + off1, y - 6, 2, 2);
    ctx.fillRect(x + 10 - off1, y - 6, 2, 2);
    ctx.fillStyle = this.p.c2;
    ctx.fillRect(x + 7 + off2, y - 8, 2, 2);
  }

  drawPolice(ctx, x, y, dir = 'DOWN', isAlert = false, walkFrame = 0, isStunned = false, isRetreating = false) {
    // Police Officer: Visor cap, crisp white uniform shirt (c2), dark tie (c0), blue/grey trousers (c1)
    const sprites = {
      DOWN: [
        '....00000000....', // flat police cap crown
        '...0111111110...',
        '...0333333330...', // gold badge / trim
        '..000000000000..', // wide flat visor
        '....23333332....', // face
        '....23033032....', // eyes
        '....22333322....', // chin
        '...1222002221...', // white shirt (c2) with dark tie (c0) and shoulder pads (c1)
        '..122220022221..', // crisp white uniform shirt
        '..122220022221..',
        '..000000000000..', // dark duty belt (c0)
        '...1111..1111...', // trousers (c1)
        '...1111..1111...',
        '...1111..1111...',
        '...0000..0000...', // black boots (c0)
        '................'
      ],
      UP: [
        '....00000000....',
        '...0111111110...',
        '...0111111110...',
        '..000000000000..', // cap brim
        '....01111110....', // neck
        '....01111110....',
        '....01111110....',
        '...1222222221...', // white shirt back
        '..122222222221..',
        '..122222222221..',
        '..000000000000..', // belt
        '...1111..1111...', // trousers
        '...1111..1111...',
        '...1111..1111...',
        '...0000..0000...', // boots
        '................'
      ],
      SIDE: [
        '....000000......',
        '...01111110.....',
        '...03333110.....', // gold badge on profile
        '.0000000000.....', // visor sticking out
        '....233332......',
        '....230332......',
        '....223332......',
        '...12222001.....', // side shirt & tie
        '..122222001.....',
        '..122222001.....',
        '..000000000.....', // belt
        '...1111.1111....', // trousers
        '...1111.1111....',
        '...1111.1111....',
        '...0000.0000....', // boots
        '................'
      ]
    };

    let sprite;
    let flip = false;
    if (dir === 'UP') {
      sprite = sprites.UP;
    } else if (dir === 'LEFT') {
      sprite = sprites.SIDE;
      flip = true;
    } else if (dir === 'RIGHT') {
      sprite = sprites.SIDE;
      flip = false;
    } else {
      sprite = sprites.DOWN;
    }

    this.drawMatrix(ctx, sprite, x, y, flip);

    // Flashing Patrol Siren Light (🚨) above cap
    if (!isStunned) {
      const flashSpeed = (isAlert || isRetreating) ? 110 : 260;
      const flashCycle = Math.floor(Date.now() / flashSpeed) % 2;
      const sirenY = y - 4;
      const redBright = '#ff2828';
      const redDark = '#551111';
      const blueBright = '#3388ff';
      const blueDark = '#112255';

      // Base siren bar mounting bracket
      ctx.fillStyle = this.p.c0;
      ctx.fillRect(x + 4, sirenY + 2, 8, 1);

      // Left bulb (Red) & Right bulb (Blue / White)
      if (flashCycle === 0) {
        // Left active
        ctx.fillStyle = redBright;
        ctx.fillRect(x + 4, sirenY, 3, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 5, sirenY, 1, 1); // glare

        ctx.fillStyle = blueDark;
        ctx.fillRect(x + 9, sirenY, 3, 2);
      } else {
        // Right active
        ctx.fillStyle = redDark;
        ctx.fillRect(x + 4, sirenY, 3, 2);

        ctx.fillStyle = blueBright;
        ctx.fillRect(x + 9, sirenY, 3, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 10, sirenY, 1, 1); // glare
      }
    }

    if (isStunned) {
      this.drawStunStars(ctx, x, y);
    } else if (isRetreating) {
      // Panic sweat & "!?"
      ctx.fillStyle = this.p.c3;
      ctx.fillRect(x + 5, y - 8, 2, 4);
      ctx.fillRect(x + 5, y - 3, 2, 2);
      ctx.fillStyle = this.p.c2;
      ctx.fillRect(x + 9, y - 8, 3, 2);
      ctx.fillRect(x + 11, y - 6, 2, 2);
      ctx.fillRect(x + 10, y - 3, 2, 2);
    } else if (isAlert) {
      // Alert indicator "!" above police when alerted
      ctx.fillStyle = '#ff2828';
      ctx.fillRect(x + 7, y - 9, 2, 4);
      ctx.fillRect(x + 7, y - 4, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 7, y - 9, 1, 3);
    }
  }

  drawFirefighter(ctx, x, y, dir = 'DOWN', isSpraying = false, walkFrame = 0, isStunned = false) {
    // Firefighter: Massive wide-brim helmet (14px wide), pure white/bright reflective turnouts (c3/c2), oxygen tank
    const sprites = {
      DOWN: [
        '.....333333.....', // wide helmet dome
        '....33333333....',
        '..333333333333..', // helmet shell
        '.22222222222222.', // wide brim (14px wide!)
        '....23333332....', // face shield
        '....23033032....', // safety goggles
        '....20033002....', // breathing mask valve
        '..033333333330..', // bright reflective coat (c3) with side tanks (c0)
        '.03322222222330.', // high-vis reflective bands (c2/c3)
        '.03322222222330.',
        '.03333333333330.', // glowing white coat body
        '..333333333333..', // wide heavy coat skirt
        '...2222..2222...', // insulated bunker pants (c2)
        '...2222..2222...',
        '...1111..1111...', // heavy rubber safety boots (c1)
        '................'
      ],
      UP: [
        '.....333333.....',
        '....33333333....',
        '..333333333333..',
        '.22222222222222.', // wide brim neck guard
        '...2222222222...', // neck protective flap
        '...2222222222...',
        '..001111111100..', // top of oxygen cylinder pack
        '..011133331110..', // yellow pressure cylinder & harness
        '..011133331110..',
        '..011133331110..',
        '..001111111100..', // cylinder base
        '..333333333333..', // bright coat skirt
        '...2222..2222...', // bunker pants
        '...2222..2222...',
        '...1111..1111...', // boots
        '................'
      ],
      SIDE: [
        '....333333......',
        '...33333333.....',
        '..3333333333....',
        '.2222222222222..', // wide brim forward and back
        '....23333322....',
        '....23033222....',
        '....20032222....',
        '.00333333000....', // oxygen cylinder on back, nozzle in front
        '.00332233000....', // reflective band
        '.00332233000....',
        '.00333333333....', // nozzle in hand
        '..3333333333....', // coat hem
        '...2222.2222....', // bunker pants
        '...2222.2222....',
        '...1111.1111....', // boots
        '................'
      ]
    };

    let sprite;
    let flip = false;
    if (dir === 'UP') {
      sprite = sprites.UP;
    } else if (dir === 'LEFT') {
      sprite = sprites.SIDE;
      flip = true;
    } else if (dir === 'RIGHT') {
      sprite = sprites.SIDE;
      flip = false;
    } else {
      sprite = sprites.DOWN;
    }

    this.drawMatrix(ctx, sprite, x, y, flip);

    if (isStunned) {
      this.drawStunStars(ctx, x, y);
    } else if (isSpraying) {
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
