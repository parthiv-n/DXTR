import Bus from "./bus.js";

// Gyroscope spike detection: magnitude threshold + sign of gz for direction.
const GYRO_TRIGGER_DEG_S = 150;  // deg/s magnitude to register a stroke
const GYRO_COOLDOWN_MS = 250;    // minimum ms between strokes

class ToolController {
  constructor(renderer, audioManager) {
    this.renderer = renderer;
    this.audio = audioManager;
    this.strokeCount = 0;
    this.totalStrokes = 10;
    this.canHit = true;
    this.hitDelay = 200;
    this.active = false;
    this._lastGyroHitTime = 0;

    this.brushSounds = [
      "../assets/audio/sound_effects/brush/sfx_brush_stroke_normal-001.wav",
      "../assets/audio/sound_effects/brush/sfx_brush_stroke_normal-002.wav",
      "../assets/audio/sound_effects/brush/sfx_brush_stroke_normal-003.wav"
    ];
    this.fossilDamageSounds = [
      "../assets/audio/sound_effects/fossil/sfx_fossil_damaged-001.wav",
      "../assets/audio/sound_effects/fossil/sfx_fossil_damaged-002.wav"
    ];

    this._onKeyDown = this._onKeyDown.bind(this);
  }

  activate(resetStrokes = true) {
    if (resetStrokes) {
      this.strokeCount = 0;
      this.renderer.resetBrush();
    }
    this.canHit = true;
    this._lastGyroHitTime = 0;
    this.active = true;
    window.removeEventListener("keydown", this._onKeyDown);
    window.addEventListener("keydown", this._onKeyDown);
  }

  deactivate() {
    this.active = false;
    window.removeEventListener("keydown", this._onKeyDown);
  }

  getExpectedDirection() {
    return this.strokeCount % 2 === 0 ? -1 : 1;
  }

  _onKeyDown(event) {
    if (!this.active || !this.canHit) return;
    if (this.strokeCount >= this.totalStrokes) return;

    const expected = this.getExpectedDirection();

    if (event.key === "ArrowLeft" && expected === -1) {
      event.preventDefault();
      this._handleStroke(-1);
    } else if (event.key === "ArrowRight" && expected === 1) {
      event.preventDefault();
      this._handleStroke(1);
    }
  }

  /**
   * Gyroscope rates from parent-forwarded serial JSON.
   * Uses magnitude for spike detection and sign of gz for left/right direction.
   */
  feedGyro(gx, gy, gz) {
    if (!this.active || !this.canHit) return;
    if (this.strokeCount >= this.totalStrokes) return;

    const now = performance.now();
    if (now - this._lastGyroHitTime < GYRO_COOLDOWN_MS) return;

    const magnitude = Math.sqrt(gx * gx + gy * gy + gz * gz);
    if (magnitude < GYRO_TRIGGER_DEG_S) return;

    // gz sign determines twist direction: positive → left stroke, negative → right stroke
    const direction = gz >= 0 ? -1 : 1;
    const expected = this.getExpectedDirection();

    if (direction === expected) {
      this._lastGyroHitTime = now;
      this._handleStroke(direction);
      this._notifyParentStrokeRegistered(magnitude, gz, direction);
    }
  }

  _notifyParentStrokeRegistered(magnitude, gz, direction) {
    try {
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: "fossil-stroke-registered",
            magnitude,
            gz,
            direction,
            triggerDegS: GYRO_TRIGGER_DEG_S,
          },
          window.location.origin
        );
      }
    } catch (_) {
      /* ignore */
    }
  }

  _handleStroke(direction) {
    this.canHit = false;
    this._tiltArmed = false;

    this.audio.playRandomSfx(this.brushSounds, 0.7);

    this.renderer.animateBrushStroke(direction);

    this.strokeCount++;

    setTimeout(() => {
      this._applyDamage();
    }, 33);

    setTimeout(() => {
      this.canHit = true;
    }, this.hitDelay);
  }

  _applyDamage() {
    this.renderer.removeDirtSprite();
    this.audio.playRandomSfx(this.fossilDamageSounds, 0.5);

    if (this.renderer.getDirtCount() === 0) {
      this.deactivate();
      this.renderer.animateBrushExit();
      this.renderer.startFossilReveal();
      const EXIT_DURATION_MS = 500;
      const VIEW_PAUSE_MS = 3000;
      setTimeout(() => {
        Bus.emit("on_game_over", 5, Bus.getCurrentLevel().fossilImage);
      }, EXIT_DURATION_MS + VIEW_PAUSE_MS);
    }
  }

  getProgress() {
    return {
      current: this.strokeCount,
      total: this.totalStrokes,
      nextKey: this.getExpectedDirection() === -1 ? "LEFT" : "RIGHT"
    };
  }
}

export default ToolController;
