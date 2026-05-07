/** Seconds of continuous hold needed to reach full height (force = 1). */
const MAX_HOLD_FOR_FULL = 2.6;
/** How fast hold "charge" decays when space is released / grip is below threshold (per second). */
const HOLD_DECAY_PER_SEC = 1.15;
/** Raw hardware force above this counts as "gripping" for hold accumulation. */
const HARDWARE_ACTIVE_THRESHOLD = 0.18;

/** If no sensor packet for this long, treat as not gripping (hold decays). */
const HARDWARE_STALE_MS = 200;

export class GripInput {
  constructor() {
    this.currentForce = 0;
    /** Accumulated active-hold time in seconds (0 .. MAX_HOLD_FOR_FULL). */
    this.holdAccumSec = 0;
    this._spaceDown = false;
    this._rawHardwareForce = 0;
    this._lastHardwarePacketTime = 0;
    this.connected = false;
    this.mode = null; // 'ble' | 'serial' | 'sim' | 'keyboard'
    this._serialPort = null;
    this._serialReader = null;
    this._bleDevice = null;
    this._cmdChar = null;
    /**
     * Optional callback for serial/BLE transport debug.
     * If set, called with the raw incoming line (serial) or decoded text (BLE).
     */
    this.onRawLine = null;

    // Single cleanup listener — fires when iframe is torn down (parent navigates away)
    const cleanup = () => {
      try { if (this.connected) this._sendModeCommand('idle'); } catch (_) {}
      try { if (this._serialReader) { this._serialReader.cancel().catch(() => {}); this._serialReader = null; } } catch (_) {}
      try { if (this._serialPort)   { this._serialPort.close().catch(() => {});    this._serialPort   = null; } } catch (_) {}
      try { if (this._bleDevice && this._bleDevice.gatt && this._bleDevice.gatt.connected) { this._bleDevice.gatt.disconnect(); } } catch (_) {}
    };
    window.addEventListener('pagehide',     cleanup);
    window.addEventListener('beforeunload', cleanup);
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        this._spaceDown = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this._spaceDown = false;
      }
    });
  }

  /** True while Space is held (keyboard) or grip is active on DXTR (BLE/USB). */
  isActivelyGripping() {
    if (this.connected && (this.mode === 'ble' || this.mode === 'serial')) {
      const fresh =
        this._lastHardwarePacketTime > 0 &&
        performance.now() - this._lastHardwarePacketTime < HARDWARE_STALE_MS;
      return fresh && this._rawHardwareForce >= HARDWARE_ACTIVE_THRESHOLD;
    }
    return this._spaceDown;
  }

  tick(dt) {
    let active = this.isActivelyGripping();

    if (active) {
      this.holdAccumSec = Math.min(MAX_HOLD_FOR_FULL, this.holdAccumSec + dt);
    } else {
      this.holdAccumSec = Math.max(0, this.holdAccumSec - HOLD_DECAY_PER_SEC * dt);
    }

    this.currentForce = Math.min(1, this.holdAccumSec / MAX_HOLD_FOR_FULL);
  }

  setHardwareForce(force) {
    this._rawHardwareForce = typeof force === 'number' ? force : 0;
    this._lastHardwarePacketTime = performance.now();
  }

  _normalize(resistance) {
    const clamped = Math.max(100, Math.min(1000000, resistance));
    return 1.0 - (clamped - 100) / (1000000 - 100);
  }

  async _sendModeCommand(mode) {
    const cmd = 'mode:' + mode;
    try {
      if (this._cmdChar) {
        await this._cmdChar.writeValue(new TextEncoder().encode(cmd));
      } else if (this._serialPort && this._serialPort.writable) {
        const writer = this._serialPort.writable.getWriter();
        await writer.write(new TextEncoder().encode(cmd + '\n'));
        writer.releaseLock();
      }
    } catch (e) { console.warn('sendModeCommand failed:', e); }
  }

  async connectBLE() {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: 'DXTR-Controller' }],
      optionalServices: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b'],
    });
    this._bleDevice = device;
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b');
    const char = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8');
    await char.startNotifications();
    char.addEventListener('characteristicvaluechanged', (e) => {
      const json = new TextDecoder().decode(e.target.value);
      try {
        if (this.onRawLine) this.onRawLine(json);
        const data = JSON.parse(json);
        if (data.fsrgrip_resistance !== undefined) {
          this.setHardwareForce(this._normalize(data.fsrgrip_resistance));
        }
      } catch {}
    });
    try {
      this._cmdChar = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a9');
    } catch (e) { this._cmdChar = null; }
    this.connected = true;
    this.mode = 'ble';
    await this._sendModeCommand('storm-witch');
  }

  async connectSerial() {
    // If a port from a prior session is still held, close it before requesting a new one
    if (this._serialPort) {
      try { await this._serialPort.close(); } catch (_) {}
      this._serialPort = null;
    }
    const port = await navigator.serial.requestPort();
    // Browser may hand back an already-open port from a prior tab — close it for a clean reopen
    if (port.readable !== null) {
      try { await port.close(); } catch (_) {}
    }
    await port.open({ baudRate: 115200 });
    this._serialPort = port;
    this.connected = true;
    this.mode = 'serial';

    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    const reader = decoder.readable.getReader();
    this._serialReader = reader;
    let buffer = '';

    const readLoop = async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            try {
              const trimmed = line.trim();
              if (trimmed && this.onRawLine) this.onRawLine(trimmed);
              const data = JSON.parse(trimmed);
              if (data.fsrgrip_resistance !== undefined) {
                this.setHardwareForce(this._normalize(data.fsrgrip_resistance));
              }
            } catch {}
          }
        }
      } catch {}
    };
    readLoop();
    await this._sendModeCommand('storm-witch');
  }

  startSimulation() {
    this.mode = 'sim';
  }
}
