import test from 'node:test';
import assert from 'node:assert/strict';
import { Player, Police, Firefighter, TimeBomb, MolotovProjectile } from '../js/entities.js';
import { City } from '../js/city.js';
import { TILES, ITEMS, DEATH_REASONS } from '../js/constants.js';

// Mock audio object for headless unit tests
const mockAudio = {
  sfxMatch: () => {},
  sfxLighter: () => {},
  sfxMolotov: () => {},
  sfxBombPlant: () => {},
  sfxBombTick: () => {},
  sfxExplosion: () => {},
  sfxWater: () => {},
  sfxPoliceAlert: () => {},
  sfxPoliceWhistle: () => {},
  sfxPolicePanic: () => {},
  sfxBreakAway: () => {},
  sfxStun: () => {},
  sfxFirefighterSiren: () => {},
  sfxItemSwitch: () => {},
  sfxItemCollect: () => {},
  sfxMenuSelect: () => {},
  sfxGameOver: () => {}
};

test('Player: item cycling and ammo management', () => {
  const player = new Player(5, 5);

  assert.equal(player.getSelectedItem().id, 'MATCH');
  player.cycleItem();
  assert.equal(player.getSelectedItem().id, 'LIGHTER');
  player.cycleItem();
  assert.equal(player.getSelectedItem().id, 'MOLOTOV');
  player.cycleItem();
  assert.equal(player.getSelectedItem().id, 'TIME_BOMB');
  player.cycleItem();
  assert.equal(player.getSelectedItem().id, 'MATCH');

  const initialMatches = player.ammo.MATCH;
  player.addAmmo('MATCH', 5);
  assert.equal(player.ammo.MATCH, initialMatches + 5);
});

test('Player: movement and collision against buildings', () => {
  const city = new City(10, 10);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) city.grid[r][c] = TILES.ROAD;
  }
  // Place wall directly to the right of player
  city.grid[5][6] = TILES.BUILDING;

  const player = new Player(5.0, 5.0);

  // Move right into wall
  const inputRight = { up: false, down: false, left: false, right: true, bHeld: false };
  player.update(0.2, inputRight, city);
  // Player should be prevented from moving past tile 5.75 into 6
  assert.ok(player.x < 5.8, 'Player should collide with building');

  // Move left into open road
  const inputLeft = { up: false, down: false, left: true, right: false, bHeld: false };
  player.update(0.2, inputLeft, city);
  assert.ok(player.x < 5.0, 'Player should move freely on open road');
});

test('Player: dash stamina consumption and recovery', () => {
  const city = new City(10, 10);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) city.grid[r][c] = TILES.ROAD;
  }
  const player = new Player(5, 5);

  const dashInput = { up: false, down: true, left: false, right: false, bHeld: true };
  player.update(1.0, dashInput, city);

  assert.equal(player.dashing, true);
  assert.ok(player.stamina < 100, 'Stamina must decrease during dash');

  const idleInput = { up: false, down: false, left: false, right: false, bHeld: false };
  const staminaAfterDash = player.stamina;
  player.update(0.5, idleInput, city);
  assert.ok(player.stamina > staminaAfterDash, 'Stamina must recover when idle');
});

test('Player: using fire weapons (Match, Lighter, Molotov, Bomb)', () => {
  const city = new City(10, 10);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) city.grid[r][c] = TILES.BUILDING;
  }
  city.grid[5][5] = TILES.ROAD;

  const player = new Player(5, 5);
  player.dir = 'RIGHT';

  const projectiles = [];
  const bombs = [];

  // 1. Use Match
  assert.equal(player.getSelectedItem().id, 'MATCH');
  const matchSuccess = player.useWeapon(city, projectiles, bombs, mockAudio);
  assert.equal(matchSuccess, true);
  assert.ok(city.fireTimer[5][6] > 0, 'Facing building should be ignited');

  // 2. Use Lighter
  player.cycleItem();
  player.dir = 'LEFT';
  const lighterSuccess = player.useWeapon(city, projectiles, bombs, mockAudio);
  assert.equal(lighterSuccess, true);
  assert.ok(city.fireTimer[5][4] > 0, 'Left facing building should be ignited');

  // 3. Use Molotov
  player.cycleItem();
  const molotovSuccess = player.useWeapon(city, projectiles, bombs, mockAudio);
  assert.equal(molotovSuccess, true);
  assert.equal(projectiles.length, 1, 'Molotov projectile must be launched');

  // 4. Use Time Bomb
  player.cycleItem();
  const bombSuccess = player.useWeapon(city, projectiles, bombs, mockAudio);
  assert.equal(bombSuccess, true);
  assert.equal(bombs.length, 1, 'Time bomb must be planted');
});

test('Police AI: line of sight and player arrest detection', () => {
  const city = new City(10, 10);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) city.grid[r][c] = TILES.ROAD;
  }

  const police = new Police(2, 2);
  police.dir = 'RIGHT';

  const player = new Player(5, 2); // In line of sight, 3 tiles to the right

  // Clear line of sight
  assert.equal(police.hasLineOfSight(player.getTile(), city), true);

  // Obstructed by building
  city.grid[2][3] = TILES.BUILDING;
  assert.equal(police.hasLineOfSight(player.getTile(), city), false, 'Building must block vision');

  // Arrest collision test
  police.x = 5.0;
  police.y = 2.0;
  player.x = 5.2;
  player.y = 2.0;
  assert.equal(police.checkPlayerCollision(player), true, 'Close proximity must trigger arrest');
});

test('Firefighter AI: reacts to fire and extinguishes it', () => {
  const city = new City(10, 10);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) city.grid[r][c] = TILES.ROAD;
  }

  const ff = new Firefighter(2, 2);
  city.ignite(3, 2, ITEMS.MATCH);
  assert.ok(city.fireTimer[2][3] > 0);

  // Update firefighter to detect fire
  ff.update(0.1, city, mockAudio);
  assert.ok(ff.state === 'SPRAYING' || ff.state === 'MOVING_TO_FIRE');

  // Simulate spraying completion
  ff.state = 'SPRAYING';
  ff.sprayTimer = 0.05;
  ff.targetFire = { x: 3, y: 2 };
  ff.update(0.1, city, mockAudio);

  assert.equal(city.fireTimer[2][3], 0, 'Fire must be extinguished');
  assert.equal(city.grid[2][3], TILES.WET, 'Tile must become wet');
});

test('TimeBomb: detonation clears 5x5 area into ash', () => {
  const city = new City(10, 10);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) city.grid[r][c] = TILES.BUILDING;
  }

  const bomb = new TimeBomb(5, 5, 0.1);
  bomb.update(0.2, city, mockAudio);

  assert.equal(bomb.exploded, true);
  assert.equal(city.grid[5][5], TILES.ASH);
  assert.equal(city.grid[4][4], TILES.ASH);
  assert.equal(city.grid[6][6], TILES.ASH);
});

test('Stun Mechanics: Bomb & Molotov stun enemies and disable arrest', () => {
  const city = new City(10, 10);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) city.grid[r][c] = TILES.ROAD;
  }

  const police = new Police(5, 4);
  const firefighter = new Firefighter(6, 5);
  const enemies = [police, firefighter];

  let stunTriggered = false;
  const bomb = new TimeBomb(5, 5, 0.05);
  bomb.update(0.1, city, mockAudio, enemies, () => {
    stunTriggered = true;
  });

  assert.equal(stunTriggered, true, 'Bomb explosion should trigger stun callback');
  assert.ok(police.stunTimer > 0, 'Police must be stunned by blast');
  assert.ok(firefighter.stunTimer > 0, 'Firefighter must be stunned by blast');

  // Verify that stunned police cannot arrest player even on direct overlap
  const player = new Player(5, 4);
  assert.equal(police.checkPlayerCollision(player), false, 'Stunned police must not arrest player');
});

test('Stealth: fire/smoke blocks police line of sight', () => {
  const city = new City(10, 10);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) city.grid[r][c] = TILES.ROAD;
  }

  const police = new Police(2, 2);
  police.dir = 'RIGHT';
  const player = new Player(5, 2);

  // Clear line of sight initially
  assert.equal(police.hasLineOfSight(player.getTile(), city), true);

  // Set fire between them at (3, 2)
  city.fireTimer[2][3] = 3.0;

  // Active fire/smoke should obscure line of sight
  assert.equal(police.hasLineOfSight(player.getTile(), city), false, 'Fire and smoke must block line of sight');
});

test('Police Break Away: knockback, stamina drain, and stun', () => {
  const city = new City(10, 10);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) city.grid[r][c] = TILES.ROAD;
  }

  const police = new Police(5, 5);
  const player = new Player(5, 5);
  player.stamina = 100;

  police.shoveAway(player, city);

  assert.ok(police.stunTimer > 0, 'Police must be stunned after breakaway shove');
  assert.equal(police.state, 'PATROL');
  assert.equal(police.checkPlayerCollision(player), false, 'Stunned police cannot arrest player');
});

test('Police Fire Fear: pathfinding avoids flames and standing in fire triggers banish', () => {
  const city = new City(10, 10);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) city.grid[r][c] = TILES.ROAD;
  }

  // Without fire, shortest path from (0, 0) to (2, 0) goes directly through (1, 0)
  const pathNormal = city.findPath(0, 0, 2, 0, true, false);
  assert.deepEqual(pathNormal, [{ x: 1, y: 0 }, { x: 2, y: 0 }]);

  // Place fire at (1, 0)
  city.fireTimer[0][1] = 5.0;

  // Path with avoidFire=true must avoid (1, 0) and route around via row 1
  const pathSafe = city.findPath(0, 0, 2, 0, true, true);
  assert.notEqual(pathSafe[0].x, 1, 'Safe path must not step on burning tile (1,0)');

  // Standing on fire triggers banish / retreat
  const police = new Police(4, 4);
  city.fireTimer[4][4] = 3.0;

  let banished = false;
  police.update(0.1, null, city, mockAudio, () => {
    banished = true;
  });

  assert.equal(banished, true, 'Standing in active fire must trigger banish callback');
  assert.equal(police.state, 'RETREAT', 'Police should enter RETREAT state');
});

test('Police Lifecycle: retreat -> despawn -> perimeter respawn', () => {
  const city = new City(10, 10);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) city.grid[r][c] = TILES.ROAD;
  }

  const police = new Police(5, 5);
  police.banish(city, mockAudio);
  assert.equal(police.state, 'RETREAT');

  // Fast forward past retreat duration (1.5s)
  police.update(1.6, null, city, mockAudio);
  assert.equal(police.state, 'DESPAWNED', 'Police should despawn after retreat timer expires');
  assert.ok(police.respawnTimer > 0, 'Respawn timer should be running');

  // Fast forward past respawn timer
  const respawnTime = police.respawnTimer;
  const player = new Player(5, 5);
  police.update(respawnTime + 0.1, player, city, mockAudio);
  assert.equal(police.state, 'PATROL', 'Police should respawn in PATROL state');
  // Check that respawn position is near map perimeter (row or col <= 2 or >= 7)
  const isPerimeter = (police.y <= 2 || police.y >= 7 || police.x <= 2 || police.x >= 7);
  assert.ok(isPerimeter, 'Police must respawn at outer map perimeter');
});


