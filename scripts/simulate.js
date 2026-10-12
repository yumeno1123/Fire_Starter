// Headless Fast Simulator for Fire Starter
// Runs multiple autonomous game sessions using BotAgent and aggregates statistics.

import { Game } from '../js/game.js';
import { BotAgent } from '../js/bot.js';
import { GAME_STATES, DIFFICULTY_KEYS } from '../js/constants.js';

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
    measureText: () => ({ width: 10 }),
    drawImage: () => {}
  })
});

// Parse command line arguments (e.g. node scripts/simulate.js --games=50 --diff=NORMAL)
const args = process.argv.slice(2);
let totalGames = 30;
let difficulty = 'NORMAL';

for (const arg of args) {
  if (arg.startsWith('--games=')) {
    const val = parseInt(arg.split('=')[1], 10);
    if (!isNaN(val) && val > 0) totalGames = val;
  } else if (arg.startsWith('--diff=')) {
    const val = arg.split('=')[1].toUpperCase();
    if (DIFFICULTY_KEYS.includes(val)) difficulty = val;
  }
}

console.log(`\n======================================================`);
console.log(`🔥 FIRE STARTER 自動シミュレーション開始`);
console.log(`   モード: ${difficulty} | 試行回数: ${totalGames} 回`);
console.log(`======================================================\n`);

const results = [];
const startTime = Date.now();

for (let i = 1; i <= totalGames; i++) {
  const canvas = createMockCanvas();
  const game = new Game(canvas);
  game.setDifficulty(difficulty);
  const bot = new BotAgent();

  // Start game
  game.update(0.1, { startJustPressed: true });

  const dt = 0.033; // ~30Hz discrete simulation step for high-speed simulation
  let maxGameSeconds = 300; // 5-minute timeout cap per game
  let elapsed = 0;

  while (game.state === GAME_STATES.PLAYING && elapsed < maxGameSeconds) {
    const input = bot.computeInput(game, dt);
    game.update(dt, input);
    elapsed += dt;
  }

  const deathReasonTitle = game.deathReason ? game.deathReason.title : (elapsed >= maxGameSeconds ? '時間切れ生存' : '不明');
  const deathId = game.deathReason ? game.deathReason.id : 'TIMEOUT';

  results.push({
    gameIndex: i,
    survivalTime: game.survivalTime,
    score: game.tributeScore,
    buildingsBurned: game.city.totalBuildingsBurned,
    tensionTime: game.tensionTime,
    deathId,
    deathReasonTitle
  });

  process.stdout.write(`\r進捗: [${i}/${totalGames}] 完了... 最新スコア: ${game.tributeScore.toLocaleString()}点 (${game.survivalTime.toFixed(1)}秒)`);
}

const simDurationMs = Date.now() - startTime;
console.log(`\n\nシミュレーション完了 (${(simDurationMs / 1000).toFixed(2)} 秒)\n`);

// Aggregate Results
const totalScore = results.reduce((acc, r) => acc + r.score, 0);
const avgScore = Math.round(totalScore / totalGames);
const maxScore = Math.max(...results.map(r => r.score));

const totalTime = results.reduce((acc, r) => acc + r.survivalTime, 0);
const avgTime = (totalTime / totalGames).toFixed(1);
const maxTime = Math.max(...results.map(r => r.survivalTime)).toFixed(1);

const deathCounts = {};
for (const r of results) {
  deathCounts[r.deathReasonTitle] = (deathCounts[r.deathReasonTitle] || 0) + 1;
}

console.log(`------------------------------------------------------`);
console.log(`📊 シミュレーション集計結果 (${difficulty})`);
console.log(`------------------------------------------------------`);
console.log(`・平均生存時間:  ${avgTime} 秒 (最高: ${maxTime} 秒)`);
console.log(`・平均奉納スコア: ${avgScore.toLocaleString()} 点 (最高: ${maxScore.toLocaleString()} 点)`);
console.log(`\n💀 死因の内訳:`);
for (const [title, count] of Object.entries(deathCounts)) {
  const pct = ((count / totalGames) * 100).toFixed(1);
  console.log(`  - ${title}: ${count} 回 (${pct}%)`);
}
console.log(`------------------------------------------------------\n`);
