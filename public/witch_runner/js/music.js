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
let started = false;

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

  return ctx;
}

export function startMusic() {
  if (!ctx || started) return;
  started = true;
  const now = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(musicGain.gain.value, now);
  musicGain.gain.linearRampToValueAtTime(0.7, now + 1.5);

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

export function playSfx(name, audioBuffers) {
  if (!ctx) return;
  const paths = {
    boost: 'assets/sounds/explosion.wav',
  };
  const p = paths[name];
  if (!p) return;
  const buf = audioBuffers.get(p);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = dbToGain(2.6);
  src.connect(g);
  g.connect(master);
  src.start();
}
