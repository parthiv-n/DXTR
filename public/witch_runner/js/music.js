const MIN_DB = -60;

function dbToGain(db) {
  return 10 ** (db / 20);
}

let ctx = null;
let master = null;
let musicSource = null;
let musicGain = null;
let broomSource = null;
let broomGain = null;
let windSource = null;
let windGain = null;
let started = false;

const WIND_GAIN_AUDIBLE = dbToGain(-9);
const WIND_RAMP_SEC = 0.18;

export async function initMusic(audioBuffers, existingCtx) {
  ctx = existingCtx || new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(ctx.destination);

  musicGain = ctx.createGain();
  musicGain.gain.value = dbToGain(MIN_DB);
  musicGain.connect(master);

  const musicBuf = audioBuffers.get('assets/music/level_1.ogg');
  if (musicBuf) {
    musicSource = ctx.createBufferSource();
    musicSource.buffer = musicBuf;
    musicSource.loop = true;
    musicSource.playbackRate.value = 0.8;
    musicSource.connect(musicGain);
    musicSource.start();
  }

  broomGain = ctx.createGain();
  broomGain.gain.value = dbToGain(-30);
  broomGain.connect(master);

  const broomBuf = audioBuffers.get('assets/sounds/broom_fly.ogg');
  if (broomBuf) {
    broomSource = ctx.createBufferSource();
    broomSource.buffer = broomBuf;
    broomSource.loop = true;
    broomSource.playbackRate.value = 0.6;
    broomSource.connect(broomGain);
    broomSource.start();
  }

  windGain = ctx.createGain();
  windGain.gain.value = 0;
  windGain.connect(master);

  const windBuf = audioBuffers.get('assets/sounds/wind_rise.mp3');
  if (windBuf) {
    windSource = ctx.createBufferSource();
    windSource.buffer = windBuf;
    windSource.loop = true;
    windSource.connect(windGain);
    windSource.start();
  }

  return ctx;
}

export function startMusic() {
  if (!ctx || started) return;
  started = true;
  const now = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(musicGain.gain.value, now);
  // Linear gain 0–1; ~0.55 = slightly under original 0.7 but audible vs wind/broom
  musicGain.gain.linearRampToValueAtTime(0.1, now + 1.5);

  broomGain.gain.cancelScheduledValues(now);
  broomGain.gain.setValueAtTime(broomGain.gain.value, now);
  broomGain.gain.linearRampToValueAtTime(dbToGain(-12), now + 1.0);
}

export function resumeAudio() {
  if (ctx?.state === 'suspended') ctx.resume();
}

export function tickMusic() {
  // No-op — single looping track, no dynamic pitch changes needed
}

/**
 * Smooth wind SFX while the player is holding Space or actively gripping DXTR.
 * @param {boolean} rising
 * @param {number} dt seconds
 */
export function tickRiseWind(rising, dt) {
  if (!windGain || !ctx) return;
  const target = rising ? WIND_GAIN_AUDIBLE : 0;
  const cur = windGain.gain.value;
  const k = Math.min(1, dt / WIND_RAMP_SEC);
  windGain.gain.value = cur + (target - cur) * k;
}

export function playSfx(name, audioBuffers) {
  const paths = {
    boost: 'assets/sounds/potion_collect.mp4',
  };
  const p = paths[name];
  if (!p) return;

  const buf = audioBuffers?.get(p);
  if (buf && ctx && master) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = dbToGain(-14);
    src.connect(g);
    g.connect(master);
    src.start();
    return;
  }

  // MP4/AAC may fail decodeAudioData in some builds; HTMLMediaElement still plays the clip.
  try {
    const media = new Audio(p);
    media.volume = 0.22;
    void media.play();
  } catch (_) {}
}
