import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { GAME_STATES, DEATH_REASONS, TILES, BALANCE } from '../js/constants.js';

// Setup minimal global mocks for Node environment
const mockStorage = new Map();
global.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k)
};

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
    measureText: () => ({ width: 10 })
  })
});

test('Game: state machine flow and game over conditions', () => {
  const canvas = createMockCanvas();
  const game = new Game(canvas);

  assert.equal(game.state, GAME_STATES.TITLE);

  // Start game via startJustPressed
  game.update(0.1, { startJustPressed: true });
  assert.equal(game.state, GAME_STATES.PLAYING);
  assert.equal(game.tributeScore, 0);

  // Test Pause
  game.update(0.1, { startJustPressed: true });
  assert.equal(game.state, GAME_STATES.PAUSED);
  // Resume
  game.update(0.1, { startJustPressed: true });
  assert.equal(game.state, GAME_STATES.PLAYING);

  // Test Game Over: FULL_BURN
  // Set all buildings to 0
  for (let r = 0; r < game.city.rows; r++) {
    for (let c = 0; c < game.city.cols; c++) {
      game.city.grid[r][c] = TILES.ROAD;
    }
  }
  game.update(0.1, {});
  assert.equal(game.state, GAME_STATES.GAME_OVER);
  assert.equal(game.deathReason.id, DEATH_REASONS.FULL_BURN.id);

  // Restart game
  game.update(0.1, { aJustPressed: true });
  assert.equal(game.state, GAME_STATES.PLAYING);

  // Test Game Over: ARRESTED
  game.policeUnits[0].x = game.player.x;
  game.policeUnits[0].y = game.player.y;
  game.update(0.1, {});
  assert.equal(game.state, GAME_STATES.GAME_OVER);
  assert.equal(game.deathReason.id, DEATH_REASONS.ARRESTED.id);

  // Test Game Over: CRUSHED
  game.startNewGame();
  for (let r = 0; r < game.city.rows; r++) {
    for (let c = 0; c < game.city.cols; c++) {
      game.city.grid[r][c] = TILES.BUILDING;
    }
  }
  game.update(0.1, {});
  assert.equal(game.state, GAME_STATES.GAME_OVER);
  assert.equal(game.deathReason.id, DEATH_REASONS.CRUSHED.id);
});

test('Game: tribute score combo and high score recording', () => {
  const canvas = createMockCanvas();
  const game = new Game(canvas);
  game.startNewGame();

  game.addTributeScore(100);
  assert.equal(game.tributeScore, 100);

  // Combo within time window adds multiplier
  game.addTributeScore(100);
  assert.ok(game.tributeScore > 200, 'Combo should add multiplier points');

  const currentScore = game.tributeScore;
  game.gameOver(DEATH_REASONS.CRUSHED);

  assert.equal(game.highScore, currentScore);
  assert.equal(localStorage.getItem('firestarter_highscore'), String(currentScore));
});

test('Game: difficulty selection, balance propagation, and high scores', () => {
  const canvas = createMockCanvas();
  const game = new Game(canvas);

  // Default difficulty is NORMAL
  assert.equal(game.difficulty, 'NORMAL');

  // Cycle up/left -> EASY
  game.update(0.1, { upJustPressed: true });
  assert.equal(game.difficulty, 'EASY');
  assert.equal(game.balance.id, 'EASY');

  // Start game on EASY
  game.update(0.1, { aJustPressed: true });
  assert.equal(game.state, GAME_STATES.PLAYING);
  assert.equal(game.city.balance.id, 'EASY');
  assert.equal(game.player.balance.id, 'EASY');
  assert.equal(game.policeUnits[0].balance.id, 'EASY');
  assert.equal(game.firefighters[0].balance.id, 'EASY');

  // EASY player receives boosted initial ammo (1.5x)
  assert.ok(game.player.ammo.MATCH > 15, 'EASY difficulty must grant increased initial matches');

  // Game over on EASY records EASY-specific high score
  game.addTributeScore(500);
  game.gameOver(DEATH_REASONS.FULL_BURN);
  assert.equal(localStorage.getItem('firestarter_highscore_easy'), '500');

  // Return to title
  game.update(0.1, { bJustPressed: true });
  assert.equal(game.state, GAME_STATES.TITLE);

  // Cycle to HARD (2 steps forward from EASY: EASY -> NORMAL -> HARD)
  game.update(0.1, { downJustPressed: true });
  assert.equal(game.difficulty, 'NORMAL');
  game.update(0.1, { downJustPressed: true });
  assert.equal(game.difficulty, 'HARD');
  assert.equal(game.balance.id, 'HARD');

  // Start game on HARD
  game.update(0.1, { aJustPressed: true });
  assert.equal(game.city.balance.id, 'HARD');
  assert.equal(game.player.balance.id, 'HARD');
  assert.ok(game.player.ammo.MATCH < 15, 'HARD difficulty has scarcer initial ammo');
});
