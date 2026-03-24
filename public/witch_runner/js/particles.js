import { VIEW_W } from './constants.js';

/** Rain — simplified from GPUParticles2D in [main.tscn](main.tscn) */
const RAIN_N = 400;
const rainDrops = [];

export function initRain() {
  rainDrops.length = 0;
  for (let i = 0; i < RAIN_N; i++) {
    rainDrops.push({
      x: Math.random() * VIEW_W * 2,
      y: Math.random() * 720,
      vx: -400 - Math.random() * 400,
      vy: 600 + Math.random() * 500,
      life: Math.random() * 0.7,
      maxLife: 0.5 + Math.random() * 0.2,
    });
  }
}

export function updateRain(dt, active) {
  if (!active) return;
  for (const p of rainDrops) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life > p.maxLife || p.y > 800) {
      p.x = VIEW_W + Math.random() * 400;
      p.y = -20 - Math.random() * 100;
      p.life = 0;
      p.maxLife = 0.5 + Math.random() * 0.2;
      p.vx = -400 - Math.random() * 400;
      p.vy = 600 + Math.random() * 500;
    }
  }
}

export function drawRain(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(216, 221, 240, 0.85)';
  ctx.lineWidth = 2;
  for (const p of rainDrops) {
    const len = 12 + Math.random() * 8;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + len * -0.45, p.y + len * 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

/** Boost smoke + speed trail — simple circles */
const boostParts = [];
const trailParts = [];

export function emitBoost() {
  for (let i = 0; i < 12; i++) {
    boostParts.push({
      x: (Math.random() - 0.5) * 40,
      y: (Math.random() - 0.5) * 40,
      vx: -80 - Math.random() * 120,
      vy: (Math.random() - 0.5) * 80,
      life: 0,
      max: 0.5 + Math.random() * 0.4,
      s: 1.5 + Math.random() * 2,
    });
  }
}

export function emitTrailBurst(wx, wy) {
  for (let i = 0; i < 8; i++) {
    trailParts.push({
      x: wx - 16,
      y: wy + 13,
      vx: -200 - Math.random() * 150,
      vy: (Math.random() - 0.5) * 100,
      life: 0,
      max: 0.7,
      a: 0.9,
    });
  }
}

let trailEmitting = false;
let trailAcc = 0;

export function setTrailEmitting(on) {
  trailEmitting = on;
}

export function updateParticles(dt, witchX, witchY) {
  for (let i = boostParts.length - 1; i >= 0; i--) {
    const p = boostParts[i];
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life > p.max) boostParts.splice(i, 1);
  }
  if (trailEmitting) {
    trailAcc += dt;
    if (trailAcc > 0.04) {
      trailAcc = 0;
      emitTrailBurst(witchX, witchY);
    }
  } else {
    trailAcc = 0;
  }
  for (let i = trailParts.length - 1; i >= 0; i--) {
    const p = trailParts[i];
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.a = 1 - p.life / p.max;
    if (p.life > p.max) trailParts.splice(i, 1);
  }
}

export function drawBoost(ctx, wx, wy) {
  for (const p of boostParts) {
    const t = p.life / p.max;
    const al = (1 - t) * 0.85;
    ctx.fillStyle = `rgba(232, 242, 255, ${al})`;
    ctx.beginPath();
    ctx.arc(wx + p.x, wy + p.y + 25, p.s * 8 * (1 - t * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawTrail(ctx) {
  for (const p of trailParts) {
    ctx.fillStyle = `rgba(232, 242, 255, ${p.a * 0.6})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
