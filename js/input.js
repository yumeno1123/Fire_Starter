// Mobile Virtual Controller & Keyboard Input Manager

export class InputManager {
  constructor() {
    this.state = {
      up: false,
      down: false,
      left: false,
      right: false,
      a: false,
      b: false,
      bHeld: false,
      aJustPressed: false,
      bJustPressed: false,
      startJustPressed: false,
      selectJustPressed: false,
      muteJustPressed: false
    };

    this.dpadActive = false;
    this.dpadPointerId = null;
    this.dpadCenter = { x: 0, y: 0 };
    this.dpadRadius = 40;
  }

  init() {
    this.bindKeyboard();
    this.bindTouchControls();
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Prevent browser default scroll for game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.state.up = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.state.down = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.state.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.state.right = true;
          break;
        case 'KeyZ':
        case 'Space':
        case 'KeyJ':
          if (!this.state.a) this.state.aJustPressed = true;
          this.state.a = true;
          break;
        case 'KeyX':
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyK':
          if (!this.state.b) this.state.bJustPressed = true;
          this.state.b = true;
          this.state.bHeld = true;
          break;
        case 'Enter':
        case 'KeyP':
          this.state.startJustPressed = true;
          break;
        case 'Tab':
        case 'KeyC':
          this.state.selectJustPressed = true;
          break;
        case 'KeyM':
          this.state.muteJustPressed = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.state.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.state.down = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.state.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.state.right = false;
          break;
        case 'KeyZ':
        case 'Space':
        case 'KeyJ':
          this.state.a = false;
          break;
        case 'KeyX':
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyK':
          this.state.b = false;
          this.state.bHeld = false;
          break;
      }
    });
  }

  bindTouchControls() {
    const dpad = document.getElementById('dpad');
    const btnA = document.getElementById('btn-a');
    const btnB = document.getElementById('btn-b');
    const btnStart = document.getElementById('btn-start');
    const btnSelect = document.getElementById('btn-select');
    const btnMute = document.getElementById('btn-mute');

    if (!dpad) return;

    // --- D-Pad Touch/Pointer Handling ---
    const updateDpadDirection = (clientX, clientY) => {
      const dx = clientX - this.dpadCenter.x;
      const dy = clientY - this.dpadCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Deadzone threshold (8px)
      if (dist < 8) {
        this.state.up = false;
        this.state.down = false;
        this.state.left = false;
        this.state.right = false;
        return;
      }

      const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180

      // 8-directional or 4-directional mapping
      this.state.right = (angle >= -67.5 && angle <= 67.5);
      this.state.down = (angle >= 22.5 && angle <= 157.5);
      this.state.left = (angle >= 112.5 || angle <= -112.5);
      this.state.up = (angle >= -157.5 && angle <= -22.5);
    };

    const resetDpad = () => {
      this.dpadActive = false;
      this.dpadPointerId = null;
      this.state.up = false;
      this.state.down = false;
      this.state.left = false;
      this.state.right = false;
      dpad.classList.remove('active');
    };

    dpad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.dpadActive = true;
      this.dpadPointerId = e.pointerId;
      dpad.setPointerCapture(e.pointerId);

      const rect = dpad.getBoundingClientRect();
      this.dpadCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      this.dpadRadius = rect.width / 2;
      dpad.classList.add('active');
      updateDpadDirection(e.clientX, e.clientY);
    });

    dpad.addEventListener('pointermove', (e) => {
      if (this.dpadActive && e.pointerId === this.dpadPointerId) {
        e.preventDefault();
        updateDpadDirection(e.clientX, e.clientY);
      }
    });

    dpad.addEventListener('pointerup', (e) => {
      if (e.pointerId === this.dpadPointerId) {
        e.preventDefault();
        resetDpad();
      }
    });

    dpad.addEventListener('pointercancel', (e) => {
      if (e.pointerId === this.dpadPointerId) {
        e.preventDefault();
        resetDpad();
      }
    });

    // --- Action Buttons ---
    const bindButton = (elem, onPress, onRelease) => {
      if (!elem) return;
      elem.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        elem.classList.add('active');
        if (onPress) onPress();
      });
      elem.addEventListener('pointerup', (e) => {
        e.preventDefault();
        elem.classList.remove('active');
        if (onRelease) onRelease();
      });
      elem.addEventListener('pointercancel', (e) => {
        e.preventDefault();
        elem.classList.remove('active');
        if (onRelease) onRelease();
      });
    };

    bindButton(
      btnA,
      () => {
        this.state.aJustPressed = true;
        this.state.a = true;
      },
      () => {
        this.state.a = false;
      }
    );

    bindButton(
      btnB,
      () => {
        this.state.bJustPressed = true;
        this.state.b = true;
        this.state.bHeld = true;
      },
      () => {
        this.state.b = false;
        this.state.bHeld = false;
      }
    );

    bindButton(btnStart, () => {
      this.state.startJustPressed = true;
    });

    bindButton(btnSelect, () => {
      this.state.selectJustPressed = true;
    });

    if (btnMute) {
      bindButton(btnMute, () => {
        this.state.muteJustPressed = true;
      });
    }
  }

  // Clear single-frame triggered flags at the end of each game update tick
  resetFrameFlags() {
    this.state.aJustPressed = false;
    this.state.bJustPressed = false;
    this.state.startJustPressed = false;
    this.state.selectJustPressed = false;
    this.state.muteJustPressed = false;
  }
}
