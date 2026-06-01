import Bus from "./bus.js";
import AudioManager from "./audio-manager.js";
import Renderer from "./renderer.js";
import ToolController from "./tool-controller.js";

const AUDIO = {
  menuMusic: "../assets/audio/music/Kaput_MenuMusic_loop.wav",
  gameMusic: "../assets/audio/music/Kaput_IngameMusic_v_1.0.wav",
  menuAppear: "../assets/audio/sound_effects/menu/sfx_menu_appear.wav",
  buttonForward: "../assets/audio/sound_effects/menu/sfx_button_forward.wav",
  brushSounds: [
    "../assets/audio/sound_effects/brush/sfx_brush_stroke_normal-001.wav",
    "../assets/audio/sound_effects/brush/sfx_brush_stroke_normal-002.wav",
    "../assets/audio/sound_effects/brush/sfx_brush_stroke_normal-003.wav"
  ],
  fossilDamage: [
    "../assets/audio/sound_effects/fossil/sfx_fossil_damaged-001.wav",
    "../assets/audio/sound_effects/fossil/sfx_fossil_damaged-002.wav"
  ]
};

const IMAGES = {
  ground: "../assets/textures/misc/Ground.png",
  dirt: "../assets/dust/Dust_1-1.png",
  brush: "../assets/textures/tools/brush.png",
  starFull: "../assets/textures/ui/Star.png",
  starEmpty: "../assets/textures/ui/Star_empty.png"
};

class Game {
  constructor() {
    this.renderer = null;
    this.toolController = null;
    this.startTime = 0;
    this._audioReady = false;

    this.screens = {};
  }

  async init() {
    const canvas = document.getElementById("game-canvas");
    this.renderer = new Renderer(canvas);

    this.toolController = new ToolController(this.renderer, AudioManager);

    this._onFossilSensor = (event) => {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (msg?.type !== "fossil-sensor") return;
      if (typeof msg.deviation === "number") {
        this.toolController.feedDeviation(msg.deviation);
      }
      if (
        typeof msg.gx === "number" &&
        typeof msg.gy === "number" &&
        typeof msg.gz === "number"
      ) {
        this.toolController.feedGyro(msg.gx, msg.gy, msg.gz);
      }
    };
    window.addEventListener("message", this._onFossilSensor);

    this.screens = {
      mainMenu: document.getElementById("screen-main-menu"),
      playing: document.getElementById("screen-playing"),
      levelComplete: document.getElementById("screen-level-complete"),
      levelSelect: document.getElementById("screen-level-select"),
      gameOver: document.getElementById("screen-game-over")
    };

    Bus.on("on_level_selected", (level, index) => this._onPlayLevel(level, index));
    Bus.on("on_game_over", (health, texture) => this._onGameOver(health, texture));
    Bus.on("all_levels_complete", () => this._showScreen("gameOver"));

    this._setupMainMenu();
    this._setupLevelSelect();
    this._setupLevelComplete();
    this._setupGameOver();

    await this.renderer.loadImage(IMAGES.ground);
    this.renderer.groundImg = this.renderer._images[IMAGES.ground];

    this._showScreen("mainMenu");
  }

  async _ensureAudio() {
    if (!this._audioReady) {
      await AudioManager.init();
      const allAudio = [
        AUDIO.menuMusic, AUDIO.gameMusic, AUDIO.menuAppear, AUDIO.buttonForward,
        ...AUDIO.brushSounds, ...AUDIO.fossilDamage
      ];
      await AudioManager.preload(allAudio);
      this._audioReady = true;
    }
    AudioManager.ensureResumed();
  }

  _showScreen(name) {
    for (const [key, el] of Object.entries(this.screens)) {
      el.classList.toggle("hidden", key !== name);
    }

    if (name === "playing") {
      this.renderer.start();
    } else {
      this.renderer.stop();
      if (name !== "levelComplete" && name !== "gameOver") {
        this.renderer.drawBlank();
      }
    }
  }

  _setupMainMenu() {
    const startBtn = document.getElementById("btn-start");
    const isEmbedded = window.parent !== window;

    if (isEmbedded) {
      // When running inside the Next.js patient shell, delegate calibration to
      // the parent. The parent shows the hold-still overlay, drives USB serial,
      // then posts fossil-calibration-done to unblock play.
      window.addEventListener("message", (event) => {
        if (event.origin !== window.location.origin) return;
        const type = event.data?.type;
        if (type === "fossil-calibration-done" || type === "fossil-calibration-error") {
          this._beginPlay();
        }
      });

      startBtn.addEventListener("click", async () => {
        await this._ensureAudio();
        window.parent.postMessage({ type: "fossil-request-start" }, window.location.origin);
      });
    } else {
      // Standalone (opened directly in browser): start immediately.
      startBtn.addEventListener("click", async () => {
        await this._beginPlay();
      });
    }

    startBtn.addEventListener("mouseenter", async () => {
      await this._ensureAudio();
    });
  }

  async _beginPlay() {
    await this._ensureAudio();
    AudioManager.playSfx(AUDIO.buttonForward);
    AudioManager.stopMusic();
    AudioManager.playMusic(AUDIO.gameMusic, 0.4);
    Bus.playLevelByIndex(0);
  }

  _setupLevelSelect() {
    const grid = document.getElementById("level-select-grid");
    grid.innerHTML = "";

    for (let i = 0; i < Bus.levelsInOrder.length; i++) {
      const level = Bus.levelsInOrder[i];
      const entry = document.createElement("div");
      entry.className = "level-entry";
      entry.dataset.index = i;

      const img = document.createElement("img");
      img.src = level.thumbnail;
      img.className = "level-thumb";
      img.draggable = false;

      const starsDiv = document.createElement("div");
      starsDiv.className = "level-stars";
      starsDiv.id = `level-stars-${i}`;

      entry.appendChild(img);
      entry.appendChild(starsDiv);

      entry.addEventListener("click", async () => {
        if (!Bus.levelPlayed[i]) return;
        await this._ensureAudio();
        AudioManager.playSfx(AUDIO.buttonForward);
        Bus.playLevelByIndex(i);
      });

      grid.appendChild(entry);
    }

    this._updateLevelSelectDisplay();

    Bus.on("on_stars", () => this._updateLevelSelectDisplay());

    const closeBtn = document.getElementById("btn-level-select-close");
    closeBtn.addEventListener("click", () => {
      AudioManager.playSfx(AUDIO.buttonForward);
      this._showScreen("playing");
      this.toolController.activate(false);
    });
  }

  _updateLevelSelectDisplay() {
    for (let i = 0; i < Bus.levelsInOrder.length; i++) {
      const entry = document.querySelector(`.level-entry[data-index="${i}"]`);
      if (!entry) continue;
      const img = entry.querySelector(".level-thumb");
      const starsDiv = entry.querySelector(".level-stars");

      if (Bus.levelPlayed[i]) {
        entry.classList.add("played");
        entry.classList.remove("locked");
        img.style.filter = "none";

        starsDiv.innerHTML = "";
        const stars = Bus.levelStars[i] || 0;
        for (let s = 0; s < 3; s++) {
          const starImg = document.createElement("img");
          starImg.src = s < stars ? IMAGES.starFull : IMAGES.starEmpty;
          starImg.className = "star-icon";
          starsDiv.appendChild(starImg);
        }
      } else {
        entry.classList.add("locked");
        entry.classList.remove("played");
        img.style.filter = "brightness(0)";
        starsDiv.innerHTML = "";
      }
    }
  }

  _setupLevelComplete() {
    document.getElementById("btn-replay").addEventListener("click", async () => {
      await this._ensureAudio();
      AudioManager.playSfx(AUDIO.buttonForward);
      Bus.playSameLevel();
    });

    document.getElementById("btn-next-level").addEventListener("click", async () => {
      await this._ensureAudio();
      AudioManager.playSfx(AUDIO.buttonForward);
      Bus.playNextLevel();
    });
  }

  _setupGameOver() {
    document.getElementById("btn-continue-end").addEventListener("click", async () => {
      await this._ensureAudio();
      AudioManager.playSfx(AUDIO.buttonForward);
      AudioManager.stopMusic();
      AudioManager.playMusic(AUDIO.menuMusic, 0.5);
      this._showScreen("mainMenu");
    });
  }

  async _onPlayLevel(level, index) {
    await this._ensureAudio();

    await this.renderer.preloadLevel(
      level.fossilImage,
      IMAGES.dirt,
      IMAGES.brush,
      IMAGES.ground
    );
    this.renderer.generateDirtSprites();
    this.renderer.resetBrush();

    this.startTime = performance.now();
    this._showScreen("playing");
    this.toolController.activate();

    const hintEl = document.getElementById("stroke-hint");
    if (hintEl) {
      if (this._updateHintInterval) clearInterval(this._updateHintInterval);
      hintEl.textContent = "\u2190 Press LEFT to start brushing";
      this._updateHintInterval = setInterval(() => {
        if (!this.toolController.active) {
          hintEl.textContent = "";
          clearInterval(this._updateHintInterval);
          this._updateHintInterval = null;
          return;
        }
        const p = this.toolController.getProgress();
        const arrow = p.nextKey === "LEFT" ? "\u2190" : "\u2192";
        hintEl.textContent = `${arrow} Press ${p.nextKey} (${p.current}/${p.total})`;
      }, 50);
    }
  }

  _onGameOver(health, texturePath) {
    this.toolController.deactivate();
    const gameTime = performance.now() - this.startTime;

    const level = Bus.getCurrentLevel();
    const levelIndex = Bus.getLevelIndex();

    document.getElementById("lc-description").textContent =
      `You discovered a ${level.name}.`;

    const funFactEl = document.getElementById("lc-fun-fact");
    funFactEl.textContent = level.funFact ? `Did you know? ${level.funFact}` : "";
    funFactEl.style.display = level.funFact ? "" : "none";

    const requiredTimeMs = level.bestTimeSeconds * 1000;

    const fossilImg = document.getElementById("lc-fossil-img");
    fossilImg.src = texturePath;

    let stars;
    if (health === 0) {
      stars = 0;
    } else if (health === 5 && gameTime <= requiredTimeMs) {
      stars = 3;
    } else if (health >= 3) {
      stars = 2;
    } else {
      stars = 1;
    }

    const starsContainer = document.getElementById("lc-stars");
    starsContainer.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const img = document.createElement("img");
      img.src = i < stars ? IMAGES.starFull : IMAGES.starEmpty;
      img.className = "star-icon-large";
      starsContainer.appendChild(img);
    }

    Bus.markLevelPlayed(levelIndex, stars);

    const nextBtn = document.getElementById("btn-next-level");
    nextBtn.style.display = Bus.hasNextLevel() ? "" : "none";

    AudioManager.playSfx(AUDIO.menuAppear);
    this._showScreen("levelComplete");
  }

  openLevelSelect() {
    this.toolController.deactivate();
    AudioManager.playSfx(AUDIO.menuAppear);
    this._updateLevelSelectDisplay();
    this._showScreen("levelSelect");
  }
}

export default Game;
