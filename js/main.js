// Main Entrypoint & Game Loop

import { Game } from './game.js';
import { InputManager } from './input.js';
import { audio } from './audio.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-screen');
  if (!canvas) return;

  const input = new InputManager();
  input.init();

  const game = new Game(canvas);

  // Audio start on first user interaction
  const initAudioOnUserGesture = () => {
    audio.ensureContext();
    window.removeEventListener('pointerdown', initAudioOnUserGesture);
    window.removeEventListener('keydown', initAudioOnUserGesture);
  };
  window.addEventListener('pointerdown', initAudioOnUserGesture, { once: true });
  window.addEventListener('keydown', initAudioOnUserGesture, { once: true });

  // Main game loop
  let lastTime = performance.now();

  const loop = (currentTime) => {
    const rawDt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Cap delta time to avoid large jumps on tab switch
    const dt = Math.min(rawDt, 0.1);

    game.update(dt, input.state);
    game.render();

    input.resetFrameFlags();

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);

  // Register PWA Service Worker
  if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('Fire Starter SW registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('SW registration failed:', err);
      });
  }
});
