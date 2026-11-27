// Keyboard + mouse + touch input, reduced to the few actions the game needs.
// Space / ArrowUp / W / click / tap = jump (twice for a double jump).
// P or Escape = pause. R or Enter = restart from an end screen.
// The game also reads a held pointer for the title screen's big START button.
export const ACTION_JUMP = 1;
export const ACTION_CONFIRM = 2;
export const ACTION_PAUSE = 4;
export const ACTION_RESTART = 8;

export function createInput(canvas) {
  let actions = 0;
  let jumpQueued = 0;
  const keys = new Set();

  function press(action) {
    actions |= action;
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    const code = event.code;
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW' || code === 'KeyJ') {
      event.preventDefault();
      jumpQueued += 1;
      press(ACTION_JUMP);
      press(ACTION_CONFIRM);
    } else if (code === 'Enter' || code === 'KeyR') {
      press(ACTION_CONFIRM);
      press(ACTION_RESTART);
    } else if (code === 'KeyP' || code === 'Escape') {
      press(ACTION_PAUSE);
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      keys.add('down');
    }
  }

  function onKeyUp(event) {
    if (event.code === 'ArrowDown' || event.code === 'KeyS') keys.delete('down');
  }

  function onPointerDown(event) {
    event.preventDefault();
    jumpQueued += 1;
    press(ACTION_JUMP);
    press(ACTION_CONFIRM);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);

  return {
    /** Drain the actions pressed since the last call (bit flags). */
    takeActions() {
      const out = actions;
      actions = 0;
      return out;
    },
    /** How many jump presses are waiting (jump + double jump consume one each). */
    takeJumps() {
      const out = jumpQueued;
      jumpQueued = 0;
      return out;
    },
    /** Whether the player is holding Down/S (reserved for a future slide). */
    get ducking() {
      return keys.has('down');
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
    },
  };
}
