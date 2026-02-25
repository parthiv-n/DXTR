import { Sample } from "@/lib/types";

export type SimulatorOptions = {
  sampleRateHz: number;
  durationMs: number;
  onSample?: (sample: Sample) => void;
  onComplete?: (samples: Sample[]) => void;
};

/**
 * Generate realistic mock sensor data
 * Simulates sinusoidal ROM patterns and grip pulses
 */
export class DeviceSimulator {
  private sampleRateHz: number;
  private durationMs: number;
  private samples: Sample[] = [];
  private isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private startTime: number = 0;
  private onSample?: (sample: Sample) => void;
  private onComplete?: (samples: Sample[]) => void;

  constructor(options: SimulatorOptions) {
    this.sampleRateHz = options.sampleRateHz;
    this.durationMs = options.durationMs;
    this.onSample = options.onSample;
    this.onComplete = options.onComplete;
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.samples = [];
    this.startTime = Date.now();

    const intervalMs = 1000 / this.sampleRateHz;

    this.intervalId = setInterval(() => {
      const elapsed = Date.now() - this.startTime;

      if (elapsed >= this.durationMs) {
        this.stop();
        return;
      }

      const sample = this.generateSample(elapsed);
      this.samples.push(sample);

      if (this.onSample) {
        this.onSample(sample);
      }
    }, intervalMs);
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.onComplete) {
      this.onComplete(this.samples);
    }
  }

  getSamples(): Sample[] {
    return this.samples;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  private generateSample(t: number): Sample {
    // Time in seconds for calculations
    const tSec = t / 1000;

    // Generate rep-like grip pulses
    // Period of ~3 seconds per rep with some variation
    const repFreq = 0.33 + 0.05 * Math.sin(tSec * 0.2);
    const gripPhase = tSec * repFreq * 2 * Math.PI;

    // Grip values with realistic pulse shape
    const gripBase = 0.3;
    const gripAmplitude = 0.5;
    const gripPulse = Math.pow(Math.max(0, Math.sin(gripPhase)), 2);
    const fsrGrip = gripBase + gripAmplitude * gripPulse + this.noise(0.05);

    // Thumb and extension follow grip with slight delays
    const fsrThumb = gripBase + gripAmplitude * 0.8 * Math.pow(Math.max(0, Math.sin(gripPhase - 0.3)), 2) + this.noise(0.05);
    const fsrExt = gripBase + gripAmplitude * 0.6 * Math.pow(Math.max(0, Math.sin(gripPhase - 0.5)), 2) + this.noise(0.05);

    // ROM: sinusoidal patterns for pronation/supination
    const romFreq = 0.2; // Slower ROM movements
    const pronationDeg = 45 * Math.sin(tSec * romFreq * 2 * Math.PI) + this.noise(3);
    const supinationDeg = -45 * Math.sin(tSec * romFreq * 2 * Math.PI + Math.PI / 4) + this.noise(3);

    // Wrist flex and deviation
    const wristFlexDeg = 30 * Math.sin(tSec * 0.15 * 2 * Math.PI) + this.noise(2);
    const wristDevDeg = 15 * Math.sin(tSec * 0.1 * 2 * Math.PI) + this.noise(1);

    return {
      t,
      fsrGrip: this.clamp(fsrGrip, 0, 1),
      fsrThumb: this.clamp(fsrThumb, 0, 1),
      fsrExt: this.clamp(fsrExt, 0, 1),
      pronationDeg: this.clamp(pronationDeg, -90, 90),
      supinationDeg: this.clamp(supinationDeg, -90, 90),
      wristFlexDeg: this.clamp(wristFlexDeg, -90, 90),
      wristDevDeg: this.clamp(wristDevDeg, -30, 30),
    };
  }

  private noise(amplitude: number): number {
    return (Math.random() - 0.5) * 2 * amplitude;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}

/**
 * Generate samples synchronously for a given duration
 */
export function generateSimulatedSamples(
  sampleRateHz: number,
  durationMs: number
): Sample[] {
  const samples: Sample[] = [];
  const intervalMs = 1000 / sampleRateHz;
  const numSamples = Math.floor(durationMs / intervalMs);

  const sim = new DeviceSimulator({ sampleRateHz, durationMs });

  for (let i = 0; i < numSamples; i++) {
    const t = i * intervalMs;
    const sample = (sim as unknown as { generateSample: (t: number) => Sample }).generateSample(t);
    samples.push(sample);
  }

  return samples;
}
