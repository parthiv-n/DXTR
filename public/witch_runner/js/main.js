import { VIEW_W, VIEW_H, WITCH } from './constants.js';
import { store } from './store.js';
import { on } from './events.js';
import { updateBackground, drawBackground, setGameStarted, resetScroll } from './background.js';
import {
  witch,
  resetWitch,
  updateWitch,
  setGripForce,
  getSpriteRotation,
  onGameStart,
  onGameEnd,
} from './witch.js';
import {
  orbs,
  updateOrbs,
  checkOrbHit,
  clearEntities,
  activateOrbSpawner,
  deactivateOrbSpawner,
} from './spawners.js';
import {
  emitBoost,
  updateParticles,
  drawBoost,
} from './particles.js';
import {
  initMusic,
  startMusic,
  resumeAudio,
  tickMusic,
  playSfx,
} from './music.js';
import {
  ui,
  resetUi,
  startGameUi,
  updateUi,
  drawHUD,
  drawOrbs,
  showEncouragement,
  showMissed,
} from './ui.js';
import { GripInput } from './gripInput.js';
import { fetchGameConfig, completeSet } from './dxtrApi.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const FIXED_DT = 1 / 60;
let accumulator = 0;
let lastTime = 0;

const images = new Map();
const audioBuffers = new Map();

const gripInput = new GripInput();

let gameRunning = false;
let patientId = 'edwin-001';
let pendingSetEnd = false;
let sessionEnded = false;

const REST_DURATION = 15;

// Parse URL params
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('patientId')) patientId = urlParams.get('patientId');
if (urlParams.get('sets')) store.totalSets = parseInt(urlParams.get('sets'), 10) || 5;
if (urlParams.get('threshold')) store.gripThreshold = parseFloat(urlParams.get('threshold')) || 0.5;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = url;
  });
}

const IMAGE_URLS = [
  'assets/textures/sky_1.png',
  'assets/textures/sky_2.png',
  'assets/textures/sky_3.png',
  'assets/textures/sky_clear.png',
  'assets/textures/grass.png',
  'assets/textures/field_1.png',
  'assets/textures/field_2.png',
  'assets/textures/field_3.png',
  'assets/textures/mountains_1.png',
  'assets/textures/mountains_2.png',
  'assets/textures/mountains_3.png',
  'assets/textures/mountains_4.png',
  'assets/textures/clouds_storm_1.png',
  'assets/textures/clouds_storm_2.png',
  'assets/textures/clouds_storm_3.png',
  'assets/textures/clouds_storm_4.png',
  'assets/textures/clouds_inside_1.png',
  'assets/textures/clouds_inside_2.png',
  'assets/textures/clouds_light_1.png',
  'assets/textures/clouds_light_2.png',
  'assets/textures/clouds_light_3.png',
  'assets/textures/clouds_light_4.png',
  'assets/sprites/witch.png',
];

const AUDIO_URLS = [
  'assets/music/level_1.ogg',
  'assets/sounds/broom_fly.ogg',
  'assets/sounds/explosion.wav',
];

let dpr = 1;

function resize() {
  dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scale = Math.min(w / VIEW_W, h / VIEW_H);
  canvas.style.width = `${VIEW_W * scale}px`;
  canvas.style.height = `${VIEW_H * scale}px`;
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// --- Connection screen ---

const connectScreen = document.getElementById('connect-screen');
const patientLabel = document.getElementById('patient-id');
const btnBLE = document.getElementById('btn-ble');
const btnUSB = document.getElementById('btn-usb');
const btnSpace = document.getElementById('btn-space');

if (patientLabel) patientLabel.textContent = `Patient: ${patientId}`;

async function onConnectBLE() {
  try {
    await gripInput.connectBLE();
    ui.inputSource = 'ble';
    beginGame();
  } catch (e) {
    console.warn('BLE connection failed', e);
  }
}

async function onConnectUSB() {
  try {
    await gripInput.connectSerial();
    ui.inputSource = 'serial';
    beginGame();
  } catch (e) {
    console.warn('Serial connection failed', e);
  }
}

function onPlaySpace() {
  gripInput.mode = 'keyboard';
  ui.inputSource = 'keyboard';
  beginGame();
}

if (btnBLE) btnBLE.addEventListener('click', onConnectBLE);
if (btnUSB) btnUSB.addEventListener('click', onConnectUSB);
if (btnSpace) btnSpace.addEventListener('click', onPlaySpace);

async function beginGame() {
  if (connectScreen) connectScreen.style.display = 'none';
  resumeAudio();
  startMusic();

  const config = await fetchGameConfig(patientId);
  if (config?.difficultyParams?.targetGripForce != null) {
    store.gripThreshold = config.difficultyParams.targetGripForce;
  }

  resetScroll();
  setGameStarted(true);
  resetUi();
  startGameUi();
  resetWitch();
  onGameStart();
  store.reset();
  clearEntities();
  activateOrbSpawner();
  gameRunning = true;
  sessionEnded = false;
  pendingSetEnd = false;
}

// --- Rep / Set logic ---

function handleOrbCollected(orb) {
  const reactionTimeMs = performance.now() - orb.spawnTime;
  store.peakForce = Math.max(store.peakForce, gripInput.currentForce);
  store.recordRep(true, store.peakForce, reactionTimeMs);
  store.peakForce = 0;
  showEncouragement();
  emitBoost();
  playSfx('boost', audioBuffers);

  if (store.isSetComplete()) {
    pendingSetEnd = true;
  }
}

function handleOrbMissed(orb) {
  store.recordRep(false, 0, null);
  showMissed();

  if (store.isSetComplete()) {
    pendingSetEnd = true;
  }
}

async function endSet() {
  pendingSetEnd = false;
  deactivateOrbSpawner();

  const reps = store.flushSetReps();

  ui.setCompleteMsg = true;
  ui.setCompleteMsgTimer = 1.5;

  const result = await completeSet(patientId, reps, null);

  if (result?.difficultyAdjustment?.message) {
    // Could display adjustment message — for now logged
    console.log('Difficulty:', result.difficultyAdjustment.message);
  }

  if (store.isSessionComplete()) {
    await endSession();
    return;
  }

  // Wait for "Set Complete!" to show, then start rest
  setTimeout(() => {
    ui.restActive = true;
    ui.restTimer = REST_DURATION;

    setTimeout(() => {
      if (!sessionEnded) {
        activateOrbSpawner();
      }
    }, REST_DURATION * 1000);
  }, 1500);
}

async function endSession() {
  sessionEnded = true;
  gameRunning = false;
  onGameEnd();
  deactivateOrbSpawner();

  // Brief delay then show session complete
  setTimeout(() => {
    ui.sessionCompleteMsg = true;

    setTimeout(() => {
      try {
        window.parent.postMessage({ type: 'gameComplete', source: 'storm-witch' }, '*');
      } catch {}
    }, 3000);
  }, 1800);
}

// --- Particle event ---
on('boost_fx', () => {
  emitBoost();
  playSfx('boost', audioBuffers);
});

// --- Game loop ---

function fixedStep() {
  if (!ui.gameStarted || sessionEnded) return;

  gripInput.tick(FIXED_DT);
  setGripForce(gripInput.currentForce);
  updateWitch(FIXED_DT);

  // Track peak force for current rep
  if (orbs.length > 0) {
    store.peakForce = Math.max(store.peakForce, gripInput.currentForce);
  }

  if (!ui.restActive && !pendingSetEnd) {
    updateOrbs(FIXED_DT);

    // Check orb collection
    const collected = checkOrbHit(witch.x, witch.y);
    if (collected) {
      handleOrbCollected(collected);
    }

    // Check expired orbs — remove after handling
    for (let i = orbs.length - 1; i >= 0; i--) {
      if (orbs[i].missed && !orbs[i].collected) {
        handleOrbMissed(orbs[i]);
        orbs.splice(i, 1);
        break;
      }
    }
  }

  updateBackground(FIXED_DT, 0);
  updateParticles(FIXED_DT, witch.x, witch.y);
  updateUi(FIXED_DT);

  if (pendingSetEnd) {
    endSet();
  }
}

function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  drawBackground(ctx, images, 0);

  // Orbs
  drawOrbs(ctx, orbs);

  // Witch
  const wimg = images.get('assets/sprites/witch.png');
  if (wimg) {
    ctx.save();
    ctx.translate(witch.x, witch.y);
    ctx.rotate(getSpriteRotation());
    const sc = WITCH.spriteScale;
    ctx.drawImage(wimg, (-wimg.width / 2) * sc, (-wimg.height / 2) * sc, wimg.width * sc, wimg.height * sc);
    ctx.restore();
  }

  drawBoost(ctx, witch.x, witch.y);

  // HUD
  if (ui.gameStarted) {
    drawHUD(ctx, store, gripInput);
  }
}

async function bootstrap() {
  gripInput.initKeyboard();
  resize();
  window.addEventListener('resize', resize);

  for (const url of IMAGE_URLS) {
    try {
      images.set(url, await loadImage(url));
    } catch (e) {
      console.warn('Image failed', url, e);
    }
  }

  const actx = new (window.AudioContext || window.webkitAudioContext)();
  for (const url of AUDIO_URLS) {
    try {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buf = await actx.decodeAudioData(arr.slice(0));
      audioBuffers.set(url, buf);
    } catch (e) {
      console.warn('Audio failed', url, e);
    }
  }

  await initMusic(audioBuffers, actx);

  lastTime = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
    lastTime = now;

    if (!ui.gameStarted) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      drawBackground(ctx, images, 0);
      return;
    }

    accumulator += dt;
    while (accumulator >= FIXED_DT) {
      fixedStep();
      accumulator -= FIXED_DT;
    }
    tickMusic();
    draw();
  }

  requestAnimationFrame(frame);
}

bootstrap();
