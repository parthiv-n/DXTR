import Bus from "./bus.js";

// Dual-IMU `deviation` (deg): twist one way for left stroke, the other for right.
const TILT_TRIGGER_DEG = 14;
const TILT_NEUTRAL_DEG = 10;

// Gyro-magnitude spike input (mirrors rhythm-rehab and car-racer)
const GYRO_THRESHOLD   = 75;   // deg/s
const GYRO_COOLDOWN_MS = 1000;

class ToolController {
  constructor(renderer, audioManager) {
    this.renderer = renderer;
    this.audio = audioManager;
    this.strokeCount = 0;
    this.totalStrokes = 10;
    this.canHit = true;
    this.hitDelay = 200;
    this.active = false;

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
    this._tiltArmed = true;
    this._gyroState = 'ready';
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
   * Latest `deviation` from parent-forwarded serial JSON (firmware IMU).
   */
  feedDeviation(deviation) {
    if (!this.active || !this.canHit) return;
    if (this.strokeCount >= this.totalStrokes) return;

    const expected = this.getExpectedDirection();

    if (this._tiltArmed) {
      if (expected === -1 && deviation <= -TILT_TRIGGER_DEG) {
        this._handleStroke(-1);
        this._notifyParentStrokeRegistered(deviation, -1);
      } else if (expected === 1 && deviation >= TILT_TRIGGER_DEG) {
        this._handleStroke(1);
        this._notifyParentStrokeRegistered(deviation, 1);
      }
    } else if (Math.abs(deviation) < TILT_NEUTRAL_DEG) {
      this._tiltArmed = true;
    }
  }

  /**
   * Latest gyroscope rates (deg/s) from parent-forwarded serial JSON.
   * A magnitude spike past GYRO_THRESHOLD fires the next expected stroke direction.
   */
  feedGyro(gx, gy, gz) {
    if (!this.active || !this.canHit) return;
    if (this.strokeCount >= this.totalStrokes) return;

    const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
    if (this._gyroState === 'cooldown') {
      if (now - this._lastGyroHitTime >= GYRO_COOLDOWN_MS) this._gyroState = 'ready';
      return;
    }

    const magnitude = Math.sqrt(gx * gx + gy * gy + gz * gz);
    if (magnitude >= GYRO_THRESHOLD) {
      this._gyroState = 'cooldown';
      this._lastGyroHitTime = now;
      const expected = this.getExpectedDirection();
      this._handleStroke(expected);
      this._notifyParentStrokeRegistered(magnitude, expected);
    }
  }

  /** Embedded shell: log which deviation value registered as a brush stroke. */
  _notifyParentStrokeRegistered(deviation, direction) {
    try {
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: "fossil-stroke-registered",
            deviation,
            direction,
            triggerDeg: TILT_TRIGGER_DEG,
            neutralDeg: TILT_NEUTRAL_DEG,
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
