import { Sample } from "@/lib/types";

/**
 * Check if Web Serial API is supported
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

/**
 * Web Serial connection options
 */
export type SerialOptions = {
  baudRate?: number;
  onSample?: (sample: Sample) => void;
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
  private onError?: (error: Error) => void;
  private onDisconnect?: () => void;
  private sessionStartTime: number = 0;

  constructor(options: SerialOptions = {}) {
    this.onSample = options.onSample;
    this.onError = options.onError;
    this.onDisconnect = options.onDisconnect;
  }

  /**
   * Connect to serial port
   */
  async connect(baudRate: number = 115200): Promise<boolean> {
    if (!isWebSerialSupported()) {
      throw new Error("Web Serial API is not supported in this browser");
    }

    try {
      // Request port from user
      this.port = await navigator.serial.requestPort();

      // Open port
      await this.port.open({ baudRate });

      this.sessionStartTime = Date.now();

      // Set up disconnect handler
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
    const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
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
