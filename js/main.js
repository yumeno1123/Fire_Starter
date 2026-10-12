// Main Entrypoint & Game Loop

import { Game } from './game.js';
import { InputManager } from './input.js';
import { audio } from './audio.js';
import { BotAgent } from './bot.js';
import { initVersionBadge } from './version.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-screen');
  if (!canvas) return;

  // Initialize GitHub version badge and update checker
  initVersionBadge();

  const input = new InputManager();
  input.init();

  const game = new Game(canvas);
  const bot = new BotAgent();
  let isAutoPlay = false;

  const autoBtn = document.getElementById('btn-auto');
  const toggleAutoPlay = () => {
    isAutoPlay = !isAutoPlay;
    game.isAutoPlay = isAutoPlay;
    if (autoBtn) {
      autoBtn.classList.toggle('active', isAutoPlay);
    }
  };

  if (autoBtn) {
    autoBtn.addEventListener('click', toggleAutoPlay);
  }

  // Keyboard shortcut [P] or [O] to toggle auto play
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' || e.code === 'KeyO') {
      toggleAutoPlay();
    }
  });

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

    // Compute input (Bot takes over when isAutoPlay is enabled)
    let frameInput = input.state;
    if (isAutoPlay) {
      const botInput = bot.computeInput(game, dt);
      frameInput = botInput;
    }

    game.update(dt, frameInput);
    game.render();

    input.resetFrameFlags();

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);

  // Register PWA Service Worker & Force check for updates
  if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        // Trigger background check for updated sw.js immediately
        reg.update();
        console.log('Fire Starter SW registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('SW registration failed:', err);
      });
  }
});
