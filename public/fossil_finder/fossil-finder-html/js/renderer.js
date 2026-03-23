const GAME_W = 1920;
const GAME_H = 1080;

const FOSSIL_CX = 960;
const FOSSIL_CY = 540;

const DIRT_SPREAD_X = 120;
const DIRT_SPREAD_Y = 100;
const DIRT_COUNT = 10;

const BRUSH_LEFT = -150;
const BRUSH_RIGHT = 150;
const BRUSH_VERTICAL_OFFSET = -100;
const BRUSH_ARC_HEIGHT = 50;
const BRUSH_EXIT_DURATION = 0.5;
const BRUSH_EXIT_OFFSET = 800;
const FOSSIL_REVEAL_DURATION = 3;
const FOSSIL_REVEAL_MAX_SCALE = 1.25;
const FOSSIL_GLOW_RADIUS = 350;

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this._images = {};
    this._animFrame = null;

    this.fossilImg = null;
    this.dirtImg = null;
    this.brushImg = null;
    this.groundImg = null;

    this.dirtSprites = [];
    this.brushX = FOSSIL_CX;
    this.brushY = FOSSIL_CY + BRUSH_VERTICAL_OFFSET;
    this.brushRotation = 0;
    this.brushOffsetX = 0;
    this.brushOffsetY = 0;
    this.brushArcY = 0;

    this._lastTime = 0;
    this._brushAnimStart = 0;
    this._brushAnimDirection = 0;
    this._brushXStart = 0;
    this._brushAnimTargetX = 0;
    this._brushExitStart = 0;
    this._brushExitXStart = 0;
    this._brushExitTargetX = 0;
    this._fossilRevealStart = 0;
    this._fossilRevealScale = 1;

    this._resize();
    window.addEventListener("resize", () => this._resize());
  }

  _resize() {
    const parent = this.canvas.parentElement;
    const pw = parent.clientWidth;
    const ph = parent.clientHeight;
    const scale = Math.min(pw / GAME_W, ph / GAME_H);
    const w = Math.floor(GAME_W * scale);
    const h = Math.floor(GAME_H * scale);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.canvas.width = GAME_W;
    this.canvas.height = GAME_H;
    this.scale = scale;
  }

  _resolveUrl(url) {
    return new URL(url, document.baseURI).href;
  }

  async loadImage(url) {
    const resolved = this._resolveUrl(url);
    if (this._images[resolved]) return this._images[resolved];
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this._images[resolved] = img;
        resolve(img);
      };
      img.onerror = () => {
        console.warn("Failed to load image:", url);
        resolve(null);
      };
      img.src = resolved;
    });
  }

  async preloadLevel(fossilUrl, dirtUrl, brushUrl, groundUrl) {
    const [fossil, dirt, brush, ground] = await Promise.all([
      this.loadImage(fossilUrl),
      this.loadImage(dirtUrl),
      this.loadImage(brushUrl),
      this.loadImage(groundUrl)
    ]);
    this.fossilImg = fossil;
    this.dirtImg = dirt;
    this.brushImg = brush;
    this.groundImg = ground;
  }

  generateDirtSprites() {
    this.dirtSprites = [];
    for (let i = 0; i < DIRT_COUNT; i++) {
      this.dirtSprites.push({
        x: FOSSIL_CX + (Math.random() * 2 - 1) * DIRT_SPREAD_X,
        y: FOSSIL_CY + (Math.random() * 2 - 1) * DIRT_SPREAD_Y,
        rotation: (Math.random() * 2 - 1) * 0.5,
        scale: 1.3 + Math.random() * 0.4,
        alpha: 0.95
      });
    }
  }

  removeDirtSprite() {
    if (this.dirtSprites.length > 0) {
      this.dirtSprites.pop();
    }
  }

  getDirtCount() {
    return this.dirtSprites.length;
  }

  resetBrush() {
    this.brushX = FOSSIL_CX;
    this.brushY = FOSSIL_CY + BRUSH_VERTICAL_OFFSET;
    this.brushRotation = 0;
    this.brushOffsetX = 0;
    this.brushOffsetY = 0;
    this.brushArcY = 0;
    this._brushAnimStart = 0;
    this._brushExitStart = 0;
    this._fossilRevealStart = 0;
    this._fossilRevealScale = 1;
  }

  animateBrushExit() {
    this._brushAnimStart = 0;
    this._brushExitStart = performance.now();
    this._brushExitXStart = this.brushX;
    this._brushExitTargetX = FOSSIL_CX + BRUSH_EXIT_OFFSET;
    this.brushRotation = 0;
    this.brushOffsetX = 0;
    this.brushOffsetY = 0;
    this.brushArcY = 0;
  }

  startFossilReveal() {
    this._fossilRevealStart = performance.now();
  }

  animateBrushStroke(direction) {
    this._brushAnimStart = performance.now();
    this._brushAnimDirection = direction;
    this._brushXStart = this.brushX;
    this._brushAnimTargetX = direction === -1 ? FOSSIL_CX + BRUSH_LEFT : FOSSIL_CX + BRUSH_RIGHT;
  }

  start() {
    const loop = (now) => {
      this._update(now);
      this._draw();
      this._animFrame = requestAnimationFrame(loop);
    };
    this._animFrame = requestAnimationFrame(loop);
  }

  stop() {
    if (this._animFrame) {
      cancelAnimationFrame(this._animFrame);
      this._animFrame = null;
    }
  }

  _update(now) {
    if (this._fossilRevealStart > 0) {
      const elapsed = (now - this._fossilRevealStart) / 1000;
      if (elapsed >= FOSSIL_REVEAL_DURATION) {
        this._fossilRevealScale = FOSSIL_REVEAL_MAX_SCALE;
        this._fossilRevealStart = 0;
      } else {
        const t = elapsed / FOSSIL_REVEAL_DURATION;
        const eased = 1 - (1 - t) * (1 - t);
        this._fossilRevealScale = 1 + (FOSSIL_REVEAL_MAX_SCALE - 1) * eased;
      }
    }

    if (this._brushExitStart > 0) {
      const elapsed = (now - this._brushExitStart) / 1000;
      if (elapsed >= BRUSH_EXIT_DURATION) {
        this.brushX = this._brushExitTargetX;
        this._brushExitStart = 0;
      } else {
        const t = elapsed / BRUSH_EXIT_DURATION;
        const eased = 1 - (1 - t) * (1 - t);
        this.brushX = this._brushExitXStart + (this._brushExitTargetX - this._brushExitXStart) * eased;
      }
      return;
    }

    if (this._brushAnimStart <= 0) return;

    const elapsed = (now - this._brushAnimStart) / 1000;
    const dir = this._brushAnimDirection;

    if (elapsed >= 0.6) {
      this.brushX = this._brushAnimTargetX;
      this.brushRotation = 0;
      this.brushOffsetX = 0;
      this.brushOffsetY = 0;
      this.brushArcY = 0;
      this._brushAnimStart = 0;
      return;
    }

    const X_DURATION = 0.3;
    const SPRITE_DURATION = 0.6;
    const PEAK_TIME = 0.266897;

    if (elapsed <= X_DURATION) {
      const t = elapsed / X_DURATION;
      const eased = 1 - (1 - t) * (1 - t);
      this.brushX = this._brushXStart + (this._brushAnimTargetX - this._brushXStart) * eased;
      this.brushArcY = BRUSH_ARC_HEIGHT * 4 * t * (1 - t);
    } else {
      this.brushX = this._brushAnimTargetX;
      this.brushArcY = 0;
    }

    const tSprite = elapsed / SPRITE_DURATION;
    if (tSprite <= PEAK_TIME) {
      const k = tSprite / PEAK_TIME;
      this.brushRotation = -0.318 * dir * k;
      this.brushOffsetX = 10 * dir * k;
      this.brushOffsetY = -3 * k;
    } else {
      const k = (tSprite - PEAK_TIME) / (1 - PEAK_TIME);
      this.brushRotation = -0.318 * dir * (1 - k);
      this.brushOffsetX = 10 * dir * (1 - k);
      this.brushOffsetY = -3 * (1 - k);
    }
  }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, GAME_W, GAME_H);

    if (this.groundImg) {
      ctx.drawImage(this.groundImg, 0, 0, GAME_W, GAME_H);
    } else {
      ctx.fillStyle = "#8B7355";
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    }

    if (this.fossilImg) {
      const scale = this._fossilRevealScale;
      if (scale > 1) {
        const gradient = ctx.createRadialGradient(
          FOSSIL_CX, FOSSIL_CY, 0,
          FOSSIL_CX, FOSSIL_CY, FOSSIL_GLOW_RADIUS
        );
        gradient.addColorStop(0, "rgba(255, 230, 180, 0.5)");
        gradient.addColorStop(0.4, "rgba(255, 210, 150, 0.25)");
        gradient.addColorStop(0.7, "rgba(255, 200, 120, 0.08)");
        gradient.addColorStop(1, "rgba(255, 190, 100, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(FOSSIL_CX, FOSSIL_CY, FOSSIL_GLOW_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(FOSSIL_CX, FOSSIL_CY);
      ctx.scale(scale, scale);
      ctx.drawImage(
        this.fossilImg,
        -this.fossilImg.width / 2,
        -this.fossilImg.height / 2
      );
      ctx.restore();
    }

    if (this.dirtImg) {
      for (const d of this.dirtSprites) {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotation);
        ctx.scale(d.scale, d.scale);
        ctx.globalAlpha = d.alpha;
        ctx.filter = "sepia(0.3) brightness(0.95)";
        ctx.drawImage(this.dirtImg, -this.dirtImg.width / 2, -this.dirtImg.height / 2);
        ctx.filter = "none";
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    const targetSize = 400;
    ctx.save();
    ctx.translate(this.brushX + this.brushOffsetX, this.brushY + this.brushArcY + this.brushOffsetY);
    ctx.rotate(this.brushRotation);
    if (this.brushImg) {
      const imgW = this.brushImg.naturalWidth || this.brushImg.width;
      const imgH = this.brushImg.naturalHeight || this.brushImg.height;
      const scale = targetSize / Math.max(imgW, imgH);
      const bw = imgW * scale;
      const bh = imgH * scale;
      ctx.drawImage(this.brushImg, -bw / 2, -bh / 2, bw, bh);
    } else {
      const r = targetSize / 2;
      ctx.fillStyle = "#8B4513";
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBlank() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, GAME_W, GAME_H);
    if (this.groundImg) {
      ctx.drawImage(this.groundImg, 0, 0, GAME_W, GAME_H);
    }
  }
}

export default Renderer;
export { GAME_W, GAME_H, FOSSIL_CX, FOSSIL_CY };
