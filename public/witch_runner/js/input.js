/** Matches [project.godot](project.godot): up = Up + W, down = Down + S, jump = Space */

const keys = new Set();
let spacePending = false;

export function initInput() {
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Space') {
      spacePending = true;
      e.preventDefault();
    }
    if (['ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });
}

export function isUp() {
  return keys.has('ArrowUp') || keys.has('KeyW');
}

export function isDown() {
  return keys.has('ArrowDown') || keys.has('KeyS');
}

/** Returns true once per Space keydown. */
export function consumeSpace() {
  if (spacePending) {
    spacePending = false;
    return true;
  }
  return false;
}

export function getSteerAxis() {
  const u = isUp() ? -1 : 0;
  const d = isDown() ? 1 : 0;
  return u + d;
}
