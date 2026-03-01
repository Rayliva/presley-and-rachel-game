/**
 * Input handler - WASD movement, E interact, F eat
 */

export class InputHandler {
  constructor() {
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      e: false,
      eat: false,
    };
    this.ePressed = false;  // debounce E for single press
    this.eatPressed = false;

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.setup();
  }

  setup() {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  destroy() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }

  handleKeyDown(e) {
    const k = e.key.toLowerCase();
    if (k === 'w') this.keys.w = true;
    if (k === 'a') this.keys.a = true;
    if (k === 's') this.keys.s = true;
    if (k === 'd') this.keys.d = true;
    if (k === 'e') {
      if (!this.ePressed) {
        this.ePressed = true;
        this.keys.e = true;
      }
    }
    if (k === 'f') {
      if (!this.eatPressed) {
        this.eatPressed = true;
        this.keys.eat = true;
      }
    }
    if (['w', 'a', 's', 'd', 'e', 'f'].includes(k)) {
      e.preventDefault();
    }
  }

  handleKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k === 'w') this.keys.w = false;
    if (k === 'a') this.keys.a = false;
    if (k === 's') this.keys.s = false;
    if (k === 'd') this.keys.d = false;
    if (k === 'e') {
      this.ePressed = false;
      this.keys.e = false;
    }
    if (k === 'f') {
      this.eatPressed = false;
      this.keys.eat = false;
    }
  }

  /** Call at end of frame to consume one-shot keys */
  consumeOneShotKeys() {
    this.keys.e = false;
    this.keys.eat = false;
  }
}
