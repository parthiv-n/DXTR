import Bus from "./bus.js";

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

  _handleStroke(direction) {
    this.canHit = false;

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
