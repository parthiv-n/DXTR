const AudioManager = {
  _ctx: null,
  _buffers: {},
  _music: {},
  _currentMusic: null,
  _musicGain: null,
  _sfxGain: null,
  _initialized: false,

  async init() {
    if (this._initialized) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._musicGain = this._ctx.createGain();
    this._musicGain.connect(this._ctx.destination);
    this._sfxGain = this._ctx.createGain();
    this._sfxGain.connect(this._ctx.destination);
    this._sfxGain.gain.value = 0.8;
    this._initialized = true;
  },

  ensureResumed() {
    if (this._ctx && this._ctx.state === "suspended") {
      this._ctx.resume();
    }
  },

  async _loadBuffer(url) {
    if (this._buffers[url]) return this._buffers[url];
    try {
      const resp = await fetch(url);
      const arrayBuf = await resp.arrayBuffer();
      const audioBuf = await this._ctx.decodeAudioData(arrayBuf);
      this._buffers[url] = audioBuf;
      return audioBuf;
    } catch (e) {
      console.warn("Failed to load audio:", url, e);
      return null;
    }
  },

  async preload(urls) {
    await this.init();
    await Promise.all(urls.map(u => this._loadBuffer(u)));
  },

  playSfx(url, volume = 1.0) {
    if (!this._ctx) return;
    this.ensureResumed();
    const buf = this._buffers[url];
    if (!buf) return;
    const source = this._ctx.createBufferSource();
    source.buffer = buf;
    const gain = this._ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this._sfxGain);
    source.start(0);
  },

  playRandomSfx(urls, volume = 1.0) {
    const url = urls[Math.floor(Math.random() * urls.length)];
    this.playSfx(url, volume);
  },

  async playMusic(url, volume = 0.5, loop = true) {
    if (!this._ctx) return;
    this.ensureResumed();
    this.stopMusic();
    const buf = await this._loadBuffer(url);
    if (!buf) return;
    const source = this._ctx.createBufferSource();
    source.buffer = buf;
    source.loop = loop;
    const gain = this._ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this._musicGain);
    source.start(0);
    this._currentMusic = { source, gain, url };
  },

  stopMusic() {
    if (this._currentMusic) {
      try { this._currentMusic.source.stop(); } catch (_) {}
      this._currentMusic = null;
    }
  }
};

export default AudioManager;
