import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SpriteRenderer } from '../js/sprites.js';
import { PALETTES } from '../js/constants.js';

describe('SpriteRenderer: Visual distinction', () => {
  it('draws player, police, and firefighter in all directions and states without throwing', () => {
    const fillRectCalls = [];
    const mockCtx = {
      fillStyle: '',
      fillRect(x, y, w, h) {
        fillRectCalls.push({ x, y, w, h, fillStyle: this.fillStyle });
      },
      font: '',
      fillText() {}
    };
    const renderer = new SpriteRenderer(PALETTES.classic);

    // 1. Test Player
    ['DOWN', 'UP', 'LEFT', 'RIGHT'].forEach(dir => {
      assert.doesNotThrow(() => renderer.drawPlayer(mockCtx, 16, 32, dir, 0, false));
      assert.doesNotThrow(() => renderer.drawPlayer(mockCtx, 16, 32, dir, 1, true));
    });

    // 2. Test Police (patrol, alert, stunned, retreat)
    ['DOWN', 'UP', 'LEFT', 'RIGHT'].forEach(dir => {
      assert.doesNotThrow(() => renderer.drawPolice(mockCtx, 16, 32, dir, false, 0, false, false));
      assert.doesNotThrow(() => renderer.drawPolice(mockCtx, 16, 32, dir, true, 0, false, false));
      assert.doesNotThrow(() => renderer.drawPolice(mockCtx, 16, 32, dir, false, 0, true, false));
      assert.doesNotThrow(() => renderer.drawPolice(mockCtx, 16, 32, dir, false, 0, false, true));
    });

    // 3. Test Firefighter (patrol, spraying, stunned)
    ['DOWN', 'UP', 'LEFT', 'RIGHT'].forEach(dir => {
      assert.doesNotThrow(() => renderer.drawFirefighter(mockCtx, 16, 32, dir, false, 0, false));
      assert.doesNotThrow(() => renderer.drawFirefighter(mockCtx, 16, 32, dir, true, 0, false));
      assert.doesNotThrow(() => renderer.drawFirefighter(mockCtx, 16, 32, dir, false, 0, true));
    });

    assert.ok(fillRectCalls.length > 0, 'Canvas fillRect should be invoked to render pixels');
  });
});
