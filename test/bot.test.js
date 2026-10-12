import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { BotAgent } from '../js/bot.js';
import { GAME_STATES, TILES } from '../js/constants.js';

const createMockCanvas = () => ({
  width: 320,
  height: 320,
  getContext: () => ({
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    moveTo: () => {},
    lineTo: () => {},
    fillText: () => {},
    measureText: () => ({ width: 10 }),
    drawImage: () => {}
  })
});

// Setup minimal global mocks for Node environment
const mockStorage = new Map();
global.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k)
};

test('BotAgent: starts game from TITLE state', () => {
  const canvas = createMockCanvas();
  const game = new Game(canvas);
  const bot = new BotAgent();

  assert.equal(game.state, GAME_STATES.TITLE);
  const input = bot.computeInput(game);
  assert.equal(input.startJustPressed, true, 'Bot should start game from TITLE state');
});

test('BotAgent: avoids burning when city ratio is critically low', () => {
  const canvas = createMockCanvas();
  const game = new Game(canvas);
  game.update(0.1, { startJustPressed: true }); // Start game
  const bot = new BotAgent();

  // Clear most buildings to drop ratio < 0.10
  for (let r = 0; r < game.city.rows; r++) {
    for (let c = 0; c < game.city.cols; c++) {
      game.city.grid[r][c] = TILES.ROAD;
    }
  }
  // Leave just 2 buildings far away
  game.city.grid[0][0] = TILES.BUILDING;
  game.city.grid[0][1] = TILES.BUILDING;

  const ratio = game.city.getBuildingRatio();
  assert.ok(ratio < 0.10);

  // Even if facing a building, bot must NOT ignite
  game.player.x = 0;
  game.player.y = 1;
  game.player.dir = 'UP'; // Facing (0, 0) building

  const input = bot.computeInput(game);
  assert.equal(input.aJustPressed, false, 'Bot must refrain from burning when ratio is critically low');
});

test('BotAgent: generates movement away from nearby police', () => {
  const canvas = createMockCanvas();
  const game = new Game(canvas);
  game.update(0.1, { startJustPressed: true });
  const bot = new BotAgent();

  // Position player at (10, 10)
  game.player.x = 10;
  game.player.y = 10;

  // Position police at (10, 12) - directly below player
  if (game.policeUnits.length > 0) {
    game.policeUnits[0].x = 10;
    game.policeUnits[0].y = 12;
    game.policeUnits[0].state = 'CHASE';
  }

  // Ensure surrounding roads are clear
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      game.city.grid[10 + dy][10 + dx] = TILES.ROAD;
      game.city.fireTimer[10 + dy][10 + dx] = 0;
    }
  }

  const input = bot.computeInput(game);
  // Bot should flee upward (away from y=12)
  assert.equal(input.up, true, 'Bot should flee upward from approaching police below');
  assert.equal(input.down, false, 'Bot must not move toward police');
});
