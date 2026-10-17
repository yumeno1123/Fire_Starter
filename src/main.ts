import { SoundEngine } from './audio';
import { CONFIG, type TextMode } from './config';
import { Renderer } from './renderer';
import { type AudioCallbacks, type Direction, GameState } from './state';
import { TEXT_PACKS } from './texts';

type ButtonAction = 'up' | 'down' | 'left' | 'right' | 'fire' | 'weapon' | 'pray';

class FireStarterApp {
  private state: GameState;
  private renderer: Renderer;
  private sound: SoundEngine;
  private audioCallbacks: AudioCallbacks;

  private activeActions = new Set<ButtonAction>();
  private lastTimestamp: number = performance.now();

  // DOM Elements
  private sufTextEl: HTMLElement;
  private dstTextEl: HTMLElement;
  private sufBarEl: HTMLElement;
  private dstBarEl: HTMLElement;
  private weaponLabelEl: HTMLElement;
  private weaponPills: NodeListOf<HTMLElement>;
  private prayBtnEl: HTMLElement;
  private subtitleEl: HTMLElement;
  private policeStrobeEl: HTMLElement;
  private powerLedEl: HTMLElement;
  private alertStatusEl: HTMLElement;
  private dayOuterEl: HTMLElement;
  private modeToggleBtn: HTMLElement;
  private soundToggleBtn: HTMLElement;

  constructor() {
    const canvas = document.getElementById('lcd-canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      throw new Error('#lcd-canvas element not found');
    }

    this.state = new GameState();
    this.renderer = new Renderer(canvas);
    this.sound = new SoundEngine();

    this.audioCallbacks = {
      onMoveStep: () => this.sound.playMoveStep(),
      onIgnite: (wIdx) => this.sound.playIgnition(wIdx),
      onWeaponSwitch: () => this.sound.playWeaponSwitch(),
      onManifestCanti: () => this.sound.playCantiGuitarFeedback(),
      onBadEnd: (type) => this.sound.playBadEndSound(type),
    };

    this.sufTextEl = document.getElementById('suf-val-text')!;
    this.dstTextEl = document.getElementById('dst-val-text')!;
    this.sufBarEl = document.getElementById('suf-bar-fill')!;
    this.dstBarEl = document.getElementById('dst-bar-fill')!;
    this.weaponLabelEl = document.getElementById('active-weapon-label')!;
    this.weaponPills = document.querySelectorAll<HTMLElement>('.weapon-pill');
    this.prayBtnEl = document.getElementById('btn-pray')!;
    this.subtitleEl = document.getElementById('reality-subtitle')!;
    this.policeStrobeEl = document.getElementById('police-strobe')!;
    this.powerLedEl = document.getElementById('power-led-dot')!;
    this.alertStatusEl = document.getElementById('alert-status-label')!;
    this.dayOuterEl = document.getElementById('day-outer-indicator')!;
    this.modeToggleBtn = document.getElementById('mode-toggle-btn')!;
    this.soundToggleBtn = document.getElementById('sound-toggle-btn')!;

    this.bindInputEvents(canvas);
    this.bindUtilityButtons();
    requestAnimationFrame((ts) => this.loop(ts));
  }

  private bindInputEvents(canvas: HTMLCanvasElement): void {
    const actionButtons = document.querySelectorAll<HTMLElement>('[data-action]');

    actionButtons.forEach((btn) => {
      const action = btn.dataset.action as ButtonAction;

      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.sound.initOnUserGesture();
        this.pressAction(action);
      });

      const releaseHandler = (e: PointerEvent): void => {
        e.preventDefault();
        this.releaseAction(action);
      };

      btn.addEventListener('pointerup', releaseHandler);
      btn.addEventListener('pointerleave', releaseHandler);
      btn.addEventListener('pointercancel', releaseHandler);
    });

    canvas.addEventListener('pointerdown', () => {
      this.sound.initOnUserGesture();
      if (this.state.badEnd && this.state.badEndTimerSec > 0.45) {
        this.sound.playPlasticButtonClick();
        this.state.resetGame();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.repeat && (e.code === 'KeyX' || e.code === 'KeyC' || e.code === 'Enter')) {
        return;
      }
      const action = this.mapKeyToAction(e.code);
      if (!action) return;

      e.preventDefault();
      this.sound.initOnUserGesture();
      if (!e.repeat) {
        this.pressAction(action);
      }
    });

    window.addEventListener('keyup', (e) => {
      const action = this.mapKeyToAction(e.code);
      if (!action) return;
      e.preventDefault();
      this.releaseAction(action);
    });
  }

  private bindUtilityButtons(): void {
    this.modeToggleBtn.addEventListener('click', () => {
      this.sound.initOnUserGesture();
      this.sound.playPlasticButtonClick();
      const nextMode: TextMode =
        this.state.textMode === 'original' ? 'homage' : 'original';
      this.state.setTextMode(nextMode);
      this.modeToggleBtn.textContent = `MODE: ${TEXT_PACKS[nextMode].modeLabel}`;
    });

    this.soundToggleBtn.addEventListener('click', () => {
      this.sound.initOnUserGesture();
      const muted = this.sound.toggleMute();
      this.soundToggleBtn.textContent = muted ? 'SOUND: OFF' : 'SOUND: ON';
    });
  }

  private mapKeyToAction(code: string): ButtonAction | null {
    switch (code) {
      case 'ArrowUp':
      case 'KeyW':
        return 'up';
      case 'ArrowDown':
      case 'KeyS':
        return 'down';
      case 'ArrowLeft':
      case 'KeyA':
        return 'left';
      case 'ArrowRight':
      case 'KeyD':
        return 'right';
      case 'KeyZ':
      case 'Space':
        return 'fire';
      case 'KeyX':
      case 'ShiftLeft':
      case 'ShiftRight':
        return 'weapon';
      case 'KeyC':
      case 'Enter':
        return 'pray';
      default:
        return null;
    }
  }

  private pressAction(action: ButtonAction): void {
    this.activeActions.add(action);
    this.setButtonVisualPressed(action, true);
    this.sound.playPlasticButtonClick();

    if (this.state.badEnd) {
      if (
        (action === 'fire' || action === 'pray') &&
        this.state.badEndTimerSec > 0.45
      ) {
        this.state.resetGame();
      }
      return;
    }

    if (action === 'fire') {
      this.state.tryIgnite(this.audioCallbacks);
    } else if (action === 'weapon') {
      this.state.cycleWeapon(this.audioCallbacks);
    } else if (action === 'pray') {
      this.state.tryManifestCanti(this.audioCallbacks);
    }
  }

  private releaseAction(action: ButtonAction): void {
    this.activeActions.delete(action);
    this.setButtonVisualPressed(action, false);
  }

  private setButtonVisualPressed(action: ButtonAction, pressed: boolean): void {
    const btn = document.querySelector<HTMLElement>(`[data-action="${action}"]`);
    if (!btn) return;
    btn.classList.toggle('pressed', pressed);
  }

  private computeMoveDirection(): Direction {
    let dx = 0;
    let dy = 0;
    if (this.activeActions.has('left')) dx -= 1;
    if (this.activeActions.has('right')) dx += 1;
    if (this.activeActions.has('up')) dy -= 1;
    if (this.activeActions.has('down')) dy += 1;
    return { dx, dy };
  }

  private loop(timestamp: number): void {
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));

    if (this.activeActions.has('fire') && !this.state.badEnd) {
      this.state.tryIgnite(this.audioCallbacks);
    }

    const moveDir = this.computeMoveDirection();
    this.state.update(dt, moveDir, this.audioCallbacks);

    this.sound.updateContinuousAudio(
      dt,
      this.state.suffocation,
      this.state.destruction,
      this.state.badEnd === null,
      this.state.isManifesting,
    );

    this.renderer.render(this.state, dt);
    this.syncOuterRealityUi();

    requestAnimationFrame((ts) => this.loop(ts));
  }

  private syncOuterRealityUi(): void {
    const sufInt = Math.floor(this.state.suffocation);
    const dstInt = Math.floor(this.state.destruction);

    this.sufTextEl.textContent = `${sufInt}%`;
    this.dstTextEl.textContent = `${dstInt}%`;
    this.sufBarEl.style.width = `${sufInt}%`;
    this.dstBarEl.style.width = `${dstInt}%`;

    const sufDanger = sufInt >= CONFIG.GAUGE.DANGER_THRESHOLD;
    const dstDanger = dstInt >= CONFIG.GAUGE.DANGER_THRESHOLD;
    this.sufBarEl.classList.toggle('danger', sufDanger);
    this.dstBarEl.classList.toggle('danger', dstDanger);

    const weapon = this.state.getCurrentWeapon();
    this.weaponLabelEl.textContent = `${weapon.index + 1}. ${weapon.nameJa}`;

    this.weaponPills.forEach((pill) => {
      const idx = Number(pill.dataset.widx);
      const spec = CONFIG.WEAPONS[idx];
      const unlocked = this.state.day >= spec.unlockDay;
      pill.classList.toggle('unlocked', unlocked);
      pill.classList.toggle('active', idx === weapon.index);
    });

    const canPray = this.state.canManifestCanti();
    this.prayBtnEl.classList.toggle('ready', canPray);
    const deity = TEXT_PACKS[this.state.textMode].deityName;
    this.prayBtnEl.textContent = canPray
      ? `PRAY [START / C] — ${deity}顕現可能!`
      : `PRAY [START / C] — 黒き炎の祈り`;

    // Reality erosion subtitle visibility
    if (this.state.realityTextVisibleSec > 0 && !this.state.badEnd) {
      this.subtitleEl.textContent = this.state.realityText;
      this.subtitleEl.classList.add('visible');
    } else if (this.state.badEnd) {
      const endHeader = TEXT_PACKS[this.state.textMode].badEnds[this.state.badEnd].header;
      this.subtitleEl.textContent = `${endHeader} — FIRE [A] または画面タップで再び河原へ`;
      this.subtitleEl.classList.add('visible');
    } else {
      this.subtitleEl.classList.remove('visible');
    }

    // Police red rotating light strobe in outer frame
    if (this.state.badEnd === 'arrested') {
      const pulse = (Math.sin(this.state.badEndTimerSec * 12) + 1) * 0.5;
      this.policeStrobeEl.style.opacity = String(0.35 + pulse * 0.65);
    } else if (this.state.policeAlertTimerSec > 0) {
      const pulse = (Math.sin(this.state.elapsedSec * 10) + 1) * 0.5;
      this.policeStrobeEl.style.opacity = String(pulse * 0.28);
    } else {
      this.policeStrobeEl.style.opacity = '0';
    }

    // Power LED & Day indicator
    const isCritical = sufDanger || dstDanger || this.state.policeAlertTimerSec > 0;
    this.powerLedEl.classList.toggle('critical', isCritical);
    this.alertStatusEl.textContent =
      this.state.policeAlertTimerSec > 0 ? 'POLICE ALERT' : 'BATTERY';

    const city = TEXT_PACKS[this.state.textMode].cityName;
    this.dayOuterEl.textContent = `${city} // DAY ${String(this.state.day).padStart(2, '0')}`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new FireStarterApp();
});
