import { SPAWNER_X, VIEW_H } from './constants.js';
import { store } from './store.js';

// --- Grip Orbs ---

export const orbs = [];

const ORB_SPEED = -250;
const ORB_LIFETIME = 5.0;
const ORB_SPAWN_DELAY = 2.0;
export const ORB_HIT_DIST = 60;

const orbSpawner = {
  active: false,
  timer: 0,
  paused: false,
};

export function activateOrbSpawner() {
  orbSpawner.active = true;
  orbSpawner.timer = 1.0;
  orbSpawner.paused = false;
}

export function deactivateOrbSpawner() {
  orbSpawner.active = false;
  orbSpawner.paused = false;
}

export function pauseOrbSpawner() {
  orbSpawner.paused = true;
}

export function resumeOrbSpawner() {
  orbSpawner.paused = false;
  orbSpawner.timer = ORB_SPAWN_DELAY;
}

function orbTargetY() {
  return VIEW_H * (1.0 - store.gripThreshold) * 0.7 + VIEW_H * 0.1;
}

function spawnOrb() {
  orbs.push({
    x: SPAWNER_X,
    y: orbTargetY(),
    age: 0,
    spawnTime: performance.now(),
    collected: false,
    missed: false,
  });
}

export function updateOrbs(dt) {
  if (orbSpawner.active && !orbSpawner.paused && orbs.length === 0) {
    orbSpawner.timer -= dt;
    if (orbSpawner.timer <= 0) {
      spawnOrb();
      orbSpawner.timer = ORB_SPAWN_DELAY;
    }
  }

  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.x += ORB_SPEED * dt;
    o.age += dt;
    if (o.age >= ORB_LIFETIME && !o.collected && !o.missed) {
      o.missed = true;
    }
    if (o.collected) {
      orbs.splice(i, 1);
    }
  }
}

export function checkOrbHit(witchX, witchY) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    if (o.collected || o.missed) continue;
    const dx = witchX - o.x;
    const dy = witchY - o.y;
    if (Math.sqrt(dx * dx + dy * dy) <= ORB_HIT_DIST) {
      o.collected = true;
      return o;
    }
  }
  return null;
}

export function getExpiredOrb() {
  for (let i = orbs.length - 1; i >= 0; i--) {
    if (orbs[i].missed) {
      const o = orbs[i];
      orbs.splice(i, 1);
      return o;
    }
  }
  return null;
}

export function clearEntities() {
  orbs.length = 0;
  orbSpawner.timer = 1.0;
}
