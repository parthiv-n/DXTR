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

  tick(dt) {
    let active = false;

    if (this.connected && (this.mode === 'ble' || this.mode === 'serial')) {
      const fresh =
        this._lastHardwarePacketTime > 0 &&
        performance.now() - this._lastHardwarePacketTime < HARDWARE_STALE_MS;
      active = fresh && this._rawHardwareForce >= HARDWARE_ACTIVE_THRESHOLD;
    } else {
      active = this._spaceDown;
    }

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

  async connectBLE() {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: 'DXTR-Controller' }],
      optionalServices: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b'],
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b');
    const char = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8');
    await char.startNotifications();
    char.addEventListener('characteristicvaluechanged', (e) => {
      const json = new TextDecoder().decode(e.target.value);
      try {
        const data = JSON.parse(json);
        if (data.fsrgrip_resistance !== undefined) {
          this.setHardwareForce(this._normalize(data.fsrgrip_resistance));
        }
      } catch {}
    });
    this.connected = true;
    this.mode = 'ble';
  }

  async connectSerial() {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    this.connected = true;
    this.mode = 'serial';

    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    const reader = decoder.readable.getReader();
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
              const data = JSON.parse(line.trim());
              if (data.fsrgrip_resistance !== undefined) {
                this.setHardwareForce(this._normalize(data.fsrgrip_resistance));
              }
            } catch {}
          }
        }
      } catch {}
    };
    readLoop();
  }

  startSimulation() {
    this.mode = 'sim';
  }
}
