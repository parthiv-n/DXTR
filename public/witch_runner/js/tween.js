/** Simple time-based tweens (Godot Tween-like). */
const active = [];

export function tweenProp(obj, key, from, to, duration, ease = t => t, onDone) {
  const start = performance.now();
  const tw = {
    update(now) {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const k = ease(t);
      obj[key] = from + (to - from) * k;
      if (t >= 1) {
        active.splice(active.indexOf(tw), 1);
        onDone?.();
        return true;
      }
      return false;
    },
  };
  obj[key] = from;
  active.push(tw);
  return tw;
}

export function updateTweens(now) {
  for (let i = active.length - 1; i >= 0; i--) {
    active[i].update(now);
  }
}

/** Ease helpers matching Godot TRANS_SINE */
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutSine = (t) => Math.sin((t * Math.PI) / 2);
export const easeInSine = (t) => 1 - Math.cos((t * Math.PI) / 2);
