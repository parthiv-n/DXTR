import {
  Sample,
  StartSessionResponse,
  ChunkResponse,
  EndSessionResponse,
  SessionSummary,
} from "@/lib/types";

export type UploaderStatus = "idle" | "active" | "uploading" | "complete" | "error";

export type UploaderCallbacks = {
  onStatusChange?: (status: UploaderStatus) => void;
  onChunkUploaded?: (seq: number, deduped: boolean) => void;
  onComplete?: (summary: SessionSummary) => void;
  onError?: (error: Error) => void;
};

/**
 * Manages session data upload with chunking and retry logic
 */
export class SessionUploader {
  private sessionId: string | null = null;
  private samples: Sample[] = [];
  private chunkSeq = 0;
  private chunkIntervalMs = 2000;
  private maxSamplesPerChunk = 100;
  private status: UploaderStatus = "idle";
  private callbacks: UploaderCallbacks;
  private lastChunkTime = 0;
  private retryAttempts = 3;
  private retryDelayMs = 1000;

  constructor(callbacks: UploaderCallbacks = {}) {
    this.callbacks = callbacks;
  }

  getStatus(): UploaderStatus {
    return this.status;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getSampleCount(): number {
    return this.samples.length;
  }

  private setStatus(status: UploaderStatus) {
    this.status = status;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(status);
    }
  }

  /**
   * Start a new session
   */
  async startSession(
    patientId: string,
    gameId: string,
    source: "usb" | "sim" | "wifi",
    sampleRateHz: number = 25,
    firmwareVersion?: string
  ): Promise<string> {
    try {
      const response = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          gameId,
          source,
          sampleRateHz,
          firmwareVersion,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start session");
      }

      const data: StartSessionResponse = await response.json();
      this.sessionId = data.sessionId;
      this.chunkIntervalMs = data.chunkIntervalMs;
      this.samples = [];
      this.chunkSeq = 0;
      this.lastChunkTime = 0;
      this.setStatus("active");

      return this.sessionId;
    } catch (error) {
      this.setStatus("error");
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Add samples to the buffer
   * Automatically uploads chunks when buffer is full or time threshold is reached
   */
  async addSamples(newSamples: Sample[]): Promise<void> {
    if (!this.sessionId || this.status !== "active") {
      return;
    }

    this.samples.push(...newSamples);

    // Check if we should upload a chunk
    const lastSample = this.samples[this.samples.length - 1];
    const timeSinceLastChunk = lastSample ? lastSample.t - this.lastChunkTime : 0;

    if (
      this.samples.length >= this.maxSamplesPerChunk ||
      timeSinceLastChunk >= this.chunkIntervalMs
    ) {
      await this.uploadPendingChunk();
    }
  }

  /**
   * Upload pending samples as a chunk
   */
  private async uploadPendingChunk(): Promise<void> {
    if (!this.sessionId || this.samples.length === 0) {
      return;
    }

    const samplesToUpload = this.samples.splice(0, this.maxSamplesPerChunk);
    const t0 = samplesToUpload[0].t;
    const t1 = samplesToUpload[samplesToUpload.length - 1].t;

    this.setStatus("uploading");

    try {
      const response = await this.uploadWithRetry(
        `/api/sessions/${this.sessionId}/chunk`,
        {
          seq: this.chunkSeq,
          t0,
          t1,
          samples: samplesToUpload,
        }
      );

      const data: ChunkResponse = await response.json();

      if (this.callbacks.onChunkUploaded) {
        this.callbacks.onChunkUploaded(data.receivedSeq, data.deduped);
      }

      this.lastChunkTime = t1;
      this.chunkSeq++;
      this.setStatus("active");
    } catch (error) {
      // On error, put samples back for retry
      this.samples.unshift(...samplesToUpload);
      this.setStatus("error");
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * End the session and get summary
   */
  async endSession(): Promise<SessionSummary> {
    if (!this.sessionId) {
      throw new Error("No active session");
    }

    // Upload any remaining samples
    while (this.samples.length > 0) {
      await this.uploadPendingChunk();
    }

    this.setStatus("uploading");

    try {
      // Calculate final duration from last chunk time
      const endedAtT = this.lastChunkTime || 0;

      const response = await this.uploadWithRetry(
        `/api/sessions/${this.sessionId}/end`,
        { endedAtT }
      );

      const data: EndSessionResponse = await response.json();

      this.setStatus("complete");

      if (this.callbacks.onComplete) {
        this.callbacks.onComplete(data.summary);
      }

      return data.summary;
    } catch (error) {
      this.setStatus("error");
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Upload with exponential backoff retry
   */
  private async uploadWithRetry(
    url: string,
    body: unknown,
    attempt = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      return response;
    } catch (error) {
      if (attempt < this.retryAttempts - 1) {
        const delay = this.retryDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.uploadWithRetry(url, body, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Reset the uploader state
   */
  reset() {
    this.sessionId = null;
    this.samples = [];
    this.chunkSeq = 0;
    this.lastChunkTime = 0;
    this.setStatus("idle");
  }
}
