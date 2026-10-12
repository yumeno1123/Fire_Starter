import test from 'node:test';
import assert from 'node:assert/strict';
import { City } from '../js/city.js';
import { TILES, ITEMS, BALANCE } from '../js/constants.js';

test('City: initialization and grid setup', () => {
  const city = new City(20, 20);
  city.init(0.4, { x: 10, y: 10 });

  assert.equal(city.cols, 20);
  assert.equal(city.rows, 20);
  assert.equal(city.grid[10][10], TILES.ROAD, 'Player spawn should be a clear road');

  const buildingCount = city.getBuildingCount();
  assert.ok(buildingCount > 10, 'City should have seeded buildings');
  const ratio = city.getBuildingRatio();
  assert.ok(ratio > 0.1 && ratio < 0.8, 'Building ratio should be reasonable');
});

test('City: walkability and bounds', () => {
  const city = new City(10, 10);
  city.grid[0][0] = TILES.ROAD;
  city.grid[0][1] = TILES.BUILDING;
  city.grid[0][2] = TILES.ASH;

  assert.equal(city.isWalkable(0, 0), true, 'Road is walkable');
  assert.equal(city.isWalkable(1, 0), false, 'Building is impassable');
  assert.equal(city.isWalkable(2, 0), true, 'Ash is walkable');
  assert.equal(city.isWalkable(-1, 0), false, 'Out of bounds is unwalkable');
  assert.equal(city.isWalkable(15, 15), false, 'Out of bounds is unwalkable');
});

test('City: ignition, damage and ash transformation', () => {
  const city = new City(10, 10);
  city.grid[3][3] = TILES.BUILDING;
  city.health[3][3] = 0.1; // Low health to test quick burn

  const ignited = city.ignite(3, 3, ITEMS.MATCH);
  assert.equal(ignited, true);
  assert.ok(city.fireTimer[3][3] > 0);

  let destroyedCalled = false;
  // Advance time to burn down building
  city.update(0.5, { x: 0, y: 0 }, (x, y) => {
    if (x === 3 && y === 3) destroyedCalled = true;
  });

  assert.equal(destroyedCalled, true, 'Building destroyed callback should trigger');
  assert.equal(city.grid[3][3], TILES.ASH, 'Burned building must turn into ASH');
  assert.equal(city.totalBuildingsBurned, 1);
});

test('City: extinguishing and wet tile behavior', () => {
  const city = new City(10, 10);
  city.grid[4][4] = TILES.BUILDING;
  city.ignite(4, 4, ITEMS.LIGHTER);
  assert.ok(city.fireTimer[4][4] > 0);

  const extinguished = city.extinguish(4, 4);
  assert.equal(extinguished, true);
  assert.equal(city.fireTimer[4][4], 0);
  assert.equal(city.grid[4][4], TILES.WET);
  assert.ok(city.wetTimer[4][4] > 0);

  // Attempting to re-ignite a wet tile should fail
  const reIgnite = city.ignite(4, 4, ITEMS.LIGHTER);
  assert.equal(reIgnite, false, 'Wet tile should resist ignition');
});

test('City: cellular automaton growth', () => {
  const city = new City(10, 10);
  // Clear all
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      city.grid[r][c] = TILES.ROAD;
    }
  }

  // Create a 2-building neighborhood around (2, 2)
  city.grid[2][1] = TILES.BUILDING;
  city.grid[2][3] = TILES.BUILDING;
  city.grid[1][2] = TILES.BUILDING;

  const countBefore = city.getBuildingCount();
  assert.equal(countBefore, 3);

  // Run growth steps multiple times to test expansion
  for (let i = 0; i < 10; i++) {
    city.stepGrowth({ x: 9, y: 9 });
  }

  const countAfter = city.getBuildingCount();
  assert.ok(countAfter >= countBefore, 'Autonomous growth must expand buildings over time');
});

test('City: isolated sprout when neighbors count is 0', () => {
  // Test with forced 100% isolated sprout chance to ensure deterministic test
  const customBalance = { ...BALANCE, ISOLATED_SPROUT_CHANCE: 1.0, EMERGENCY_REGROWTH_RATIO: 0 };
  const city = new City(5, 5, customBalance);

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      city.grid[r][c] = TILES.ROAD;
    }
  }

  assert.equal(city.getBuildingCount(), 0);

  // Growth step with player at (2, 2)
  city.stepGrowth({ x: 2, y: 2 });

  // Player position (2, 2) should NOT sprout
  assert.equal(city.grid[2][2], TILES.ROAD, 'Player tile must not sprout directly');

  // Other isolated tiles should have sprouted
  assert.ok(city.getBuildingCount() > 0, 'Isolated tiles should sprout when neighbors === 0');
});

test('City: BFS pathfinding', () => {
  const city = new City(10, 10);
  // Clear all
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      city.grid[r][c] = TILES.ROAD;
    }
  }

  // Place a wall obstacle
  city.grid[1][1] = TILES.BUILDING;
  city.grid[2][1] = TILES.BUILDING;
  city.grid[3][1] = TILES.BUILDING;

  // Path from (0, 2) to (2, 2) must go around the wall
  const path = city.findPath(0, 2, 2, 2);
  assert.ok(path !== null, 'Path must be found');
  assert.ok(path.length > 2, 'Path must detour around wall');

  // Verify none of the path points are on the wall
  for (const pt of path) {
    assert.notEqual(city.grid[pt.y][pt.x], TILES.BUILDING);
  }
});

test('City: item drops and collection', () => {
  const city = new City(10, 10);
  city.dropRandomItem(5, 5);
  assert.equal(city.items.length, 1);
  assert.equal(city.items[0].x, 5);
  assert.equal(city.items[0].y, 5);

  const collected = city.collectItem(5, 5);
  assert.ok(collected !== null);
  assert.equal(city.items.length, 0);

  const emptyCollect = city.collectItem(5, 5);
  assert.equal(emptyCollect, null);
});
