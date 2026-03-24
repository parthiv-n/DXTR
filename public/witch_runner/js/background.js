import { VIEW_W, VIEW_H, SCROLL_SPEED } from './constants.js';
import { BACKGROUNDS, SKIES, LEVELS } from './levels.js';
import { LIGHTING } from './constants.js';

/** Scale factor matching the original Godot sprite scale. */
const SPRITE_SCALE = 2.5;

let scrollAccum = 0;
let activeBgId = 'lvl1';
let gameStarted = false;

/** Positive modulo — keeps values in [0, n). */
function modPos(a, n) {
  return ((a % n) + n) % n;
}

export function setGameStarted(v) {
  gameStarted = v;
  if (!v) scrollAccum = 0;
}

export function resetScroll() {
  scrollAccum = 0;
}

export function updateBackground(dt, levelIndex) {
  if (!gameStarted) return;
  const cfg = LEVELS[levelIndex];
  if (!cfg) return;
  activeBgId = cfg.bgId;
  scrollAccum += SCROLL_SPEED * dt;
}

export function getActiveBgId() {
  return activeBgId;
}

export function drawBackground(ctx, images, levelIndex) {
  const cfg = LEVELS[levelIndex];
  if (!cfg) return;

  // --- Sky (full-screen stretch) ---
  const skyImg = images.get(SKIES[cfg.skyId]);
  if (skyImg) {
    ctx.drawImage(skyImg, 0, 0, VIEW_W, VIEW_H);
  }

  // Dark mood overlay
  if (cfg.lighting === LIGHTING.DIMMED) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  } else if (cfg.lighting === LIGHTING.DARK) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  const bg = BACKGROUNDS[cfg.bgId];
  if (!bg) return;

  /**
   * Draw a horizontally-tiling parallax strip.
   *
   * The textures are 512 px wide in the repo (Godot exported at half-res).
   * We draw each tile at  img.naturalWidth * SPRITE_SCALE  wide so the art
   * is never stretched horizontally — we just tile more copies.
   * `h` is the source height in texture-space pixels; drawn height = h * SPRITE_SCALE.
   */
  const drawLayerStrip = (texPath, motion, y, h, flipY) => {
    const img = images.get(texPath);
    if (!img || !img.naturalWidth) return;

    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    // Drawn dimensions for one tile
    const tileW = srcW * SPRITE_SCALE;
    const tileH = h * SPRITE_SCALE;

    // How many source-height rows the strip uses (clamp to actual image height)
    const useSrcH = Math.min(h, srcH);

    // Parallax offset, wrapped to one tile width so it stays numerically stable
    const layerOff = modPos(scrollAccum * motion, tileW);

    // Tile enough copies to cover the viewport
    const maxX = VIEW_W + tileW * 2;
    for (let x = -layerOff; x < maxX; x += tileW) {
      const dx = Math.round(x);
      if (flipY) {
        ctx.save();
        ctx.translate(dx, y + tileH);
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, 0, srcW, useSrcH, 0, 0, tileW, tileH);
        ctx.restore();
      } else {
        ctx.drawImage(img, 0, 0, srcW, useSrcH, dx, y, tileW, tileH);
      }
    }
  };

  for (const layer of bg.layers) {
    drawLayerStrip(layer.tex, layer.motion, layer.y, layer.h, layer.flipY);
  }

  if (bg.hasForeground && bg.fg) {
    const fg = bg.fg;
    drawLayerStrip(fg.tex, 1, fg.y, fg.h, fg.flipY);
  }
}
