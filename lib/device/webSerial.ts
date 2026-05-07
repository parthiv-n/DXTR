/// <reference types="w3c-web-serial" />
import { Sample } from "@/lib/types";

/**
 * Check if Web Serial API is supported
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

const LAST_PORT_SESSION_KEY = "dxtr-web-serial-port-sig";

function portSignature(port: SerialPort): string {
  const info = port.getInfo();
  if (info.usbVendorId !== undefined && info.usbProductId !== undefined) {
    return `usb:${info.usbVendorId}:${info.usbProductId}`;
  }
  return "unknown";
}

function rememberSerialPortChoice(port: SerialPort): void {
  try {
    sessionStorage.setItem(LAST_PORT_SESSION_KEY, portSignature(port));
  } catch {
    /* storage blocked */
  }
}

/** Options for {@link WebSerialDevice.connect}. */
export type SerialConnectOptions = {
  /** If true, always show the port picker (ignore previously granted ports). */
  requestNewPort?: boolean;
};

/**
 * Prefer a previously granted port so navigating between patient pages does not reopen the picker.
 * Falls back to `requestPort()` when none are granted or multiple ports need disambiguation.
 */
async function pickSerialPort(options: SerialConnectOptions): Promise<SerialPort> {
  if (options.requestNewPort) {
    return navigator.serial.requestPort();
  }

  const granted = await navigator.serial.getPorts();
  if (granted.length === 0) {
    return navigator.serial.requestPort();
  }
  if (granted.length === 1) {
    return granted[0];
  }

  let last: string | null = null;
  try {
    last = sessionStorage.getItem(LAST_PORT_SESSION_KEY);
  } catch {
    /* ignore */
  }
  if (last) {
    const matched = granted.find((p) => portSignature(p) === last);
    if (matched) return matched;
  }

  return navigator.serial.requestPort();
}

/**
 * Constructor / streaming callbacks for {@link WebSerialDevice}.
 */
export type SerialOptions = {
  baudRate?: number;
  onSample?: (sample: Sample) => void;
  /** Every complete non-empty line from the device (before session/sample filtering). */
  onRawLine?: (line: string) => void;
  onError?: (error: Error) => void;
  onDisconnect?: () => void;
};

/**
 * Manages Web Serial connection to ESP32 device
 */
export class WebSerialDevice {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private isReading = false;
  private lineBuffer = "";
  private onSample?: (sample: Sample) => void;
  private onRawLine?: (line: string) => void;
  private onError?: (error: Error) => void;
  private onDisconnect?: () => void;
  private sessionStartTime: number = 0;

  constructor(options: SerialOptions = {}) {
    this.onSample = options.onSample;
    this.onRawLine = options.onRawLine;
    this.onError = options.onError;
    this.onDisconnect = options.onDisconnect;
  }

  /**
   * Connect to serial port.
   * Uses `getPorts()` first so a port chosen on one game page stays available on the next without a second picker.
   */
  async connect(baudRate: number = 115200, connectOptions: SerialConnectOptions = {}): Promise<boolean> {
    if (!isWebSerialSupported()) {
      throw new Error("Web Serial API is not supported in this browser");
    }

    const tryOpen = async (port: SerialPort): Promise<void> => {
      // Port may still be open from a prior game session — close it before reopening.
      if (port.readable !== null) {
        await port.close().catch(() => {});
      }
      await port.open({ baudRate });
    };

    try {
      let port = await pickSerialPort(connectOptions);
      try {
        await tryOpen(port);
      } catch (openErr) {
        if (connectOptions.requestNewPort) {
          throw openErr;
        }
        // Granted port may be unplugged or busy — one explicit picker retry
        port = await navigator.serial.requestPort();
        await tryOpen(port);
      }

      this.port = port;
      rememberSerialPortChoice(port);
      this.sessionStartTime = Date.now();
      navigator.serial.addEventListener("disconnect", this.handleDisconnect);
      return true;
    } catch (error) {
      if (this.onError) {
        this.onError(error as Error);
      }
      return false;
    }
  }

  /**
   * Start reading from serial port
   */
  async startReading(): Promise<void> {
    if (!this.port || !this.port.readable) {
      throw new Error("Port not connected");
    }

    this.isReading = true;

    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable as unknown as WritableStream<Uint8Array>);
    this.reader = textDecoder.readable.getReader();

    try {
      while (this.isReading) {
        const { value, done } = await this.reader.read();

        if (done) {
          break;
        }

        if (value) {
          this.processData(value);
        }
      }
    } catch (error) {
      if (this.isReading && this.onError) {
        this.onError(error as Error);
      }
    } finally {
      this.reader?.releaseLock();
      await readableStreamClosed.catch(() => {});
    }
  }

  /**
   * Stop reading
   */
  stopReading(): void {
    this.isReading = false;
  }

  /**
   * Disconnect from serial port
   */
  async disconnect(): Promise<void> {
    this.isReading = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {
        // Ignore cancel errors
      }
      this.reader = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch {
        // Ignore close errors
      }
      this.port = null;
    }

    navigator.serial.removeEventListener("disconnect", this.handleDisconnect);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.port !== null;
  }

  /**
   * Send a line to the device (e.g. `mode:car-racer`). Appends \\n if missing.
   */
  async writeLine(text: string): Promise<void> {
    if (!this.port?.writable) {
      throw new Error("Port not connected or not writable");
    }
    const payload = text.endsWith("\n") ? text : `${text}\n`;
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(payload));
    } finally {
      writer.releaseLock();
    }
  }

  /**
   * Process incoming serial data
   */
  private processData(data: string): void {
    this.lineBuffer += data;

    // Process complete lines
    const lines = this.lineBuffer.split("\n");
    this.lineBuffer = lines.pop() || ""; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        this.onRawLine?.(trimmed);
        this.parseLine(trimmed);
      }
    }
  }

  /**
   * Parse a line of serial data
   * Supports JSON or CSV format
   */
  private parseLine(line: string): void {
    try {
      let sample: Sample;

      if (line.startsWith("{")) {
        // JSON format
        sample = JSON.parse(line) as Sample;
      } else {
        // CSV format: t,fsrGrip,fsrThumb,fsrExt,pron,sup,wflex,wdev
        const parts = line.split(",").map((s) => parseFloat(s.trim()));
        if (parts.length < 8) {
          return; // Invalid line
        }

        sample = {
          t: parts[0] || Date.now() - this.sessionStartTime,
          fsrGrip: parts[1],
          fsrThumb: parts[2],
          fsrExt: parts[3],
          pronationDeg: parts[4],
          supinationDeg: parts[5],
          wristFlexDeg: parts[6],
          wristDevDeg: parts[7],
        };
      }

      // Validate sample has required fields
      if (
        typeof sample.fsrGrip === "number" &&
        typeof sample.pronationDeg === "number"
      ) {
        // Ensure timestamp is relative to session start
        if (sample.t > 1000000000000) {
          // Looks like absolute timestamp
          sample.t = sample.t - this.sessionStartTime;
        }

        if (this.onSample) {
          this.onSample(sample);
        }
      }
    } catch {
      // Ignore parse errors for individual lines
    }
  }

  private handleDisconnect = (): void => {
    this.port = null;
    this.reader = null;
    this.isReading = false;

    if (this.onDisconnect) {
      this.onDisconnect();
    }
  };
}
