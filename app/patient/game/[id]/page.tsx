"use client";

import { useState, useCallback, useEffect, use } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DeviceSimulator } from "@/lib/device/simulator";
import { SessionUploader, UploaderStatus } from "@/lib/device/uploader";
import { WebSerialDevice, isWebSerialSupported } from "@/lib/device/webSerial";
import { Sample, SessionSummary } from "@/lib/types";
import {
  Play,
  Square,
  Usb,
  Cpu,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Activity,
} from "lucide-react";
import Link from "next/link";

// Default patient ID for prototype
const PATIENT_ID = "p_edwin";

type SessionState = "idle" | "connecting" | "recording" | "uploading" | "complete" | "error";

const gameNames: Record<string, string> = {
  "car-racer": "Car Racer",
  "coin-grip": "Coin Grip",
  "bottle-turn": "Bottle Turn",
  "card-flip": "Card Flip",
  "key-turn": "Key Turn",
  "cup-stack": "Cup Stack",
};

export default function GameSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: gameId } = use(params);
  const gameName = gameNames[gameId] || gameId;

  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [sampleCount, setSampleCount] = useState(0);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploaderStatus, setUploaderStatus] = useState<UploaderStatus>("idle");
  const [serialSupported] = useState(isWebSerialSupported());

  // References to device instances
  const [simulator, setSimulator] = useState<DeviceSimulator | null>(null);
  const [serialDevice, setSerialDevice] = useState<WebSerialDevice | null>(null);
  const [uploader, setUploader] = useState<SessionUploader | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simulator) simulator.stop();
      if (serialDevice) serialDevice.disconnect();
    };
  }, [simulator, serialDevice]);

  const handleSample = useCallback(
    async (sample: Sample) => {
      setSampleCount((c) => c + 1);
      if (uploader) {
        await uploader.addSamples([sample]);
      }
    },
    [uploader]
  );

  const startSimulation = useCallback(async () => {
    setSessionState("connecting");
    setError(null);
    setSampleCount(0);
    setSummary(null);

    try {
      // Create uploader
      const newUploader = new SessionUploader({
        onStatusChange: setUploaderStatus,
        onError: (err) => {
          setError(err.message);
          setSessionState("error");
        },
      });

      // Start session
      await newUploader.startSession(PATIENT_ID, gameId, "sim", 25, "sim-0.1");
      setUploader(newUploader);

      // Create and start simulator
      const durationMs = 20000 + Math.random() * 20000; // 20-40 seconds
      const newSimulator = new DeviceSimulator({
        sampleRateHz: 25,
        durationMs,
        onSample: async (sample) => {
          setSampleCount((c) => c + 1);
          await newUploader.addSamples([sample]);
        },
        onComplete: async () => {
          setSessionState("uploading");
          try {
            const result = await newUploader.endSession();
            setSummary(result);
            setSessionState("complete");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
            setSessionState("error");
          }
        },
      });

      setSimulator(newSimulator);
      newSimulator.start();
      setSessionState("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
      setSessionState("error");
    }
  }, [gameId]);

  const startSerial = useCallback(async () => {
    if (!serialSupported) {
      setError("Web Serial is not supported in this browser");
      return;
    }

    setSessionState("connecting");
    setError(null);
    setSampleCount(0);
    setSummary(null);

    try {
      // Create uploader
      const newUploader = new SessionUploader({
        onStatusChange: setUploaderStatus,
        onError: (err) => {
          setError(err.message);
          setSessionState("error");
        },
      });

      // Start session
      await newUploader.startSession(PATIENT_ID, gameId, "usb", 25);
      setUploader(newUploader);

      // Create serial device
      const device = new WebSerialDevice({
        onSample: async (sample) => {
          setSampleCount((c) => c + 1);
          await newUploader.addSamples([sample]);
        },
        onError: (err) => {
          setError(err.message);
          setSessionState("error");
        },
        onDisconnect: () => {
          if (sessionState === "recording") {
            stopSession();
          }
        },
      });

      // Connect to device
      const connected = await device.connect();
      if (!connected) {
        throw new Error("Failed to connect to device");
      }

      setSerialDevice(device);
      device.startReading();
      setSessionState("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setSessionState("error");
    }
  }, [gameId, serialSupported, sessionState]);

  const stopSession = useCallback(async () => {
    // Stop data collection
    if (simulator) {
      simulator.stop();
      setSimulator(null);
    }

    if (serialDevice) {
      serialDevice.stopReading();
      await serialDevice.disconnect();
      setSerialDevice(null);
    }

    // End session if we have an uploader
    if (uploader && sessionState === "recording") {
      setSessionState("uploading");
      try {
        const result = await uploader.endSession();
        setSummary(result);
        setSessionState("complete");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setSessionState("error");
      }
    }
  }, [simulator, serialDevice, uploader, sessionState]);

  const resetSession = useCallback(() => {
    setSessionState("idle");
    setSampleCount(0);
    setSummary(null);
    setError(null);
    setUploader(null);
  }, []);

  return (
    <AppShell variant="patient">
      <div className="max-w-2xl mx-auto px-2 sm:px-0">
        {/* Back link */}
        <Link
          href="/patient"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-dxtr-teal mb-4 md:mb-6 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Missions
        </Link>

        {/* Main card - responsive */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
          {/* Header - responsive */}
          <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-dxtr-teal/10 flex items-center justify-center flex-shrink-0">
              <Activity className="w-6 h-6 md:w-8 md:h-8 text-dxtr-teal" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-gray-800 truncate">{gameName}</h1>
              <p className="text-sm text-gray-500">
                {sessionState === "idle"
                  ? "Choose how to connect your device"
                  : sessionState === "connecting"
                  ? "Connecting..."
                  : sessionState === "recording"
                  ? "Recording session..."
                  : sessionState === "uploading"
                  ? "Uploading data..."
                  : sessionState === "complete"
                  ? "Session complete!"
                  : "An error occurred"}
              </p>
            </div>
          </div>

          {/* Idle state: show connect options */}
          {sessionState === "idle" && (
            <div className="space-y-3">
              <button
                onClick={startSimulation}
                className="w-full py-3 px-4 bg-dxtr-teal text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-dxtr-teal/90 active:scale-[0.98] transition-all"
              >
                <Cpu className="w-5 h-5" />
                Simulate Device Stream
              </button>

              <button
                onClick={startSerial}
                disabled={!serialSupported}
                className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:border-dxtr-teal hover:text-dxtr-teal disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                <Usb className="w-5 h-5" />
                Connect via USB (Web Serial)
              </button>

              {!serialSupported && (
                <p className="text-xs text-amber-600 text-center">
                  Web Serial is not supported in this browser. Use Chrome or Edge.
                </p>
              )}
            </div>
          )}

          {/* Connecting state */}
          {sessionState === "connecting" && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-dxtr-teal mb-4" />
              <p className="text-gray-500">Establishing connection...</p>
            </div>
          )}

          {/* Recording state */}
          {sessionState === "recording" && (
            <div className="space-y-4 md:space-y-6">
              {/* Live stats */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="bg-gray-50 rounded-xl p-3 md:p-4">
                  <div className="text-xs text-gray-500">Samples</div>
                  <div className="text-xl md:text-2xl font-bold text-dxtr-teal">
                    {sampleCount}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 md:p-4">
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="text-xl md:text-2xl font-bold text-green-600 capitalize">
                    {uploaderStatus}
                  </div>
                </div>
              </div>

              {/* Recording indicator */}
              <div className="flex items-center justify-center gap-3 py-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-gray-700 font-medium text-sm md:text-base">
                  Recording in progress
                </span>
              </div>

              {/* Stop button */}
              <button
                onClick={stopSession}
                className="w-full py-3 px-4 bg-red-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-600 active:scale-[0.98] transition-all"
              >
                <Square className="w-5 h-5" />
                Stop & Upload
              </button>
            </div>
          )}

          {/* Uploading state */}
          {sessionState === "uploading" && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-dxtr-teal mb-4" />
              <p className="text-gray-500 text-center">
                Processing and uploading session data...
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {sampleCount} samples collected
              </p>
            </div>
          )}

          {/* Complete state */}
          {sessionState === "complete" && summary && (
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center justify-center gap-3 py-4">
                <CheckCircle className="w-7 h-7 md:w-8 md:h-8 text-green-600" />
                <span className="text-base md:text-lg font-semibold text-green-600">
                  Session Saved!
                </span>
              </div>

              {/* Summary stats - responsive grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4">
                <div className="bg-gray-50 rounded-xl p-3 md:p-4">
                  <div className="text-xs text-gray-500">Duration</div>
                  <div className="text-lg md:text-xl font-bold text-gray-700">
                    {Math.round(summary.durationMs / 1000)}s
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 md:p-4">
                  <div className="text-xs text-gray-500">Reps</div>
                  <div className="text-lg md:text-xl font-bold text-dxtr-teal">
                    {summary.repCount}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 md:p-4">
                  <div className="text-xs text-gray-500">Peak Grip</div>
                  <div className="text-lg md:text-xl font-bold text-gray-700">
                    {Math.round(summary.peakGrip * 100)}%
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 md:p-4">
                  <div className="text-xs text-gray-500">ROM Pronation</div>
                  <div className="text-lg md:text-xl font-bold text-gray-700">{summary.romPronation}°</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 md:p-4">
                  <div className="text-xs text-gray-500">ROM Supination</div>
                  <div className="text-lg md:text-xl font-bold text-gray-700">{summary.romSupination}°</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 md:p-4">
                  <div className="text-xs text-gray-500">Smoothness</div>
                  <div className="text-lg md:text-xl font-bold text-gray-700">
                    {Math.round(summary.smoothness * 100)}%
                  </div>
                </div>
              </div>

              {/* Action buttons - stack on mobile */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={resetSession} 
                  className="flex-1 py-3 px-4 bg-dxtr-teal text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-dxtr-teal/90 active:scale-[0.98] transition-all"
                >
                  <Play className="w-5 h-5" />
                  New Session
                </button>
                <Link 
                  href="/patient" 
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium text-center hover:border-dxtr-teal hover:text-dxtr-teal active:scale-[0.98] transition-all"
                >
                  Back to Missions
                </Link>
              </div>
            </div>
          )}

          {/* Error state */}
          {sessionState === "error" && (
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center justify-center gap-3 py-4">
                <AlertCircle className="w-7 h-7 md:w-8 md:h-8 text-red-500" />
                <span className="text-base md:text-lg font-semibold text-red-500">
                  Error
                </span>
              </div>

              <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
                {error || "An unknown error occurred"}
              </div>

              <button 
                onClick={resetSession} 
                className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:border-dxtr-teal hover:text-dxtr-teal active:scale-[0.98] transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
