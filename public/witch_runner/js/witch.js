import { WITCH, VIEW_H } from './constants.js';

const REST_Y = VIEW_H * 0.7 + VIEW_H * 0.1;

export const witch = {
  x: 250,
  y: REST_Y,
  vy: 0,
  locked: true,
  gripForce: 0,
  targetY: REST_Y,
};

export function resetWitch() {
  witch.x = 250;
  witch.y = REST_Y;
  witch.vy = 0;
  witch.locked = true;
  witch.gripForce = 0;
  witch.targetY = REST_Y;
}

export function onGameStart() {
  witch.locked = false;
}

export function onGameEnd() {
  witch.locked = true;
}

export function setGripForce(force) {
  witch.gripForce = force;
  // Map grip force 0..1 to screen Y (bottom..top of playable area)
  // At force=0: witch at ~580 (lower area, above grass)
  // At force=1: witch at ~72 (near top)
  witch.targetY = VIEW_H * (1.0 - force) * 0.7 + VIEW_H * 0.1;
}

export function updateWitch(dt) {
  if (witch.locked) return;
  witch.y += (witch.targetY - witch.y) * 0.08;
  const minY = WITCH.minY;
  const maxY = WITCH.maxY;
  if (witch.y < minY) witch.y = minY;
  if (witch.y > maxY) witch.y = maxY;
}

export function getSpriteRotation() {
  const dy = witch.targetY - witch.y;
  const tilt = Math.max(-0.3, Math.min(0.3, dy * 0.002));
  return tilt;
}

