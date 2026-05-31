"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WebSerialDevice } from "@/lib/device/webSerial";

// ─── Types ────────────────────────────────────────────────────────────────────

type CalibPhase =
  | "idle"        // iframe main menu is showing; no overlay
  | "overlay"     // user pressed Start; overlay is visible, awaiting action
  | "connecting"  // port picker is open / connecting
  | "calibrating" // mode:fossil-finder sent; holding still for 10 s
  | "done"        // calibration complete; iframe is running
  | "error";      // timeout or connection error

// ─── Constants ────────────────────────────────────────────────────────────────

const CALIB_TIMEOUT_MS  = 25_000; // overall timeout: device detect + 10 s hold
const HOLD_REQUIRED_MS  = 10_000; // hold-still window; matches progress bar

const SERIAL_LOG_MAX_LINES = 100;

// ─── Fossil Finder palette (matches css/game.css) ─────────────────────────────

// Contrast: cream / textMuted on dark meet WCAG AA for body text; errorText is lighter for AA on dark bg.
const C = {
  dark:      "#1a1209",
  dark2:     "#2e1f13",
  tan:       "#c8a87a",
  cream:     "#f5ebe0",
  textMuted: "#e8ddd4",
  gold:      "#8b6914",
  goldDark:  "#6b4f10",
  brown:     "#5c4033",
  error:     "#e07070",
  errorText: "#fecaca",
  focusRing: "#fbbf24",
} as const;

// ─── Shared button styles ─────────────────────────────────────────────────────

const primaryBtn: React.CSSProperties = {
  padding: "16px 40px",
  fontSize: 20,
  fontWeight: 700,
  fontFamily: "'Barlow', Arial, sans-serif",
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  color: "#1a1209",
  background: `linear-gradient(135deg, ${C.tan}, #b8956a)`,
  boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
  minHeight: 52,
  transition: "filter 0.2s",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  border: "2px solid rgba(245,235,224,0.65)",
  color: C.cream,
  padding: "14px 32px",
  borderRadius: 12,
  fontSize: 18,
  fontWeight: 600,
  fontFamily: "'Barlow', Arial, sans-serif",
  cursor: "pointer",
  minHeight: 52,
  transition: "color 0.2s, border-color 0.2s, background-color 0.2s",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FossilFinderPage() {
  const [phase, setPhase] = useState<CalibPhase>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [usbConnected, setUsbConnected] = useState(false);
  const [serialMonitorOpen, setSerialMonitorOpen] = useState(true);
  /** Ref so pause works without stale closures on WebSerial callbacks. */
  const serialPausedRef = useRef(false);
  const [serialPaused, setSerialPaused] = useState(false);
  const serialLinesRef = useRef<string[]>([]);
  const serialPreRef = useRef<HTMLPreElement>(null);
  const serialDirtyRef = useRef(false);

  // Refs — no re-render when mutated
  const phaseRef      = useRef<CalibPhase>("idle");
  const deviceRef     = useRef<WebSerialDevice | null>(null);
  const iframeRef     = useRef<HTMLIFrameElement>(null);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);
  const skipBtnRef    = useRef<HTMLButtonElement>(null);
  /** Last JSON line from the device (used when a stroke registers). */
  const lastJsonLineRef = useRef<string>("");

  const setPhaseSync = useCallback((p: CalibPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const appendSerialLine = useCallback((line: string) => {
    if (serialPausedRef.current) return;
    const ts = new Date().toLocaleTimeString(undefined, { hour12: false });
    const buf = serialLinesRef.current;
    buf.push(`[${ts}] ${line}`);
    if (buf.length > SERIAL_LOG_MAX_LINES) {
      serialLinesRef.current = buf.slice(-SERIAL_LOG_MAX_LINES);
    }
    serialDirtyRef.current = true;
  }, []);

  const clearSerialLog = useCallback(() => {
    serialLinesRef.current = [];
    serialDirtyRef.current = true;
    if (serialPreRef.current) {
      serialPreRef.current.textContent = "Waiting for lines from the controller…";
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    if (timerRef.current)    { clearTimeout(timerRef.current);   timerRef.current    = null; }
    if (holdTimerRef.current){ clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
  }, []);

  const sendToIframe = useCallback((type: string) => {
    iframeRef.current?.contentWindow?.postMessage({ type }, window.location.origin);
  }, []);

  const finishCalibration = useCallback(() => {
    clearAllTimers();
    setPhaseSync("done");
    sendToIframe("fossil-calibration-done");
  }, [clearAllTimers, setPhaseSync, sendToIframe]);

  // ── Skip: start immediately, no overlay ─────────────────────────────────────

  const startWithoutDevice = useCallback(() => {
    clearAllTimers();
    finishCalibration();
  }, [clearAllTimers, finishCalibration]);

  // ── USB connect ─────────────────────────────────────────────────────────────

  const connectUSB = useCallback(async () => {
    clearAllTimers();
    setPhaseSync("connecting");
    setStatusMsg("Waiting for USB device…");

    const device = new WebSerialDevice({
      onRawLine: (line) => {
        appendSerialLine(line);
        if (line.startsWith("{")) {
          lastJsonLineRef.current = line;
        }
        if (phaseRef.current !== "done") return;
        if (!line.startsWith("{")) return;
        try {
          const obj = JSON.parse(line) as Record<string, unknown>;
          const gx = obj.gx;
          const gy = obj.gy;
          const gz = obj.gz;
          if (
            typeof gx === "number" && Number.isFinite(gx) &&
            typeof gy === "number" && Number.isFinite(gy) &&
            typeof gz === "number" && Number.isFinite(gz)
          ) {
            iframeRef.current?.contentWindow?.postMessage(
              { type: "fossil-sensor", gx, gy, gz },
              window.location.origin
            );
          }
        } catch {
          /* ignore malformed JSON */
        }
      },
      onError: (err) => {
        setPhaseSync("error");
        setStatusMsg(`Device error: ${err.message}`);
      },
      onDisconnect: () => {
        setUsbConnected(false);
        lastJsonLineRef.current = "";
        if (phaseRef.current === "calibrating") {
          clearAllTimers();
          setPhaseSync("error");
          setStatusMsg("Device disconnected during calibration.");
        }
      },
    });

    try {
      const ok = await device.connect(115200);
      if (!ok) return; // onError already set the error state + message
      deviceRef.current = device;
      setUsbConnected(true);
      serialLinesRef.current = [];
      serialDirtyRef.current = true;
      void device.startReading();
      await device.writeLine("mode:fossil-finder");
      setPhaseSync("calibrating");
      setStatusMsg("Hold still while DXTR calibrates…");
      // Same 10s window as the progress bar (per-packet reset broke completion while the device streams roll).
      holdTimerRef.current = setTimeout(() => {
        finishCalibration();
      }, HOLD_REQUIRED_MS);
      timerRef.current = setTimeout(() => {
        setPhaseSync("error");
        setStatusMsg("Calibration timed out. Check DXTR is connected and powered on.");
      }, CALIB_TIMEOUT_MS);
    } catch (err) {
      setPhaseSync("error");
      setStatusMsg(err instanceof Error ? err.message : "Failed to connect");
    }
  }, [appendSerialLine, clearAllTimers, setPhaseSync, finishCalibration]);

  // ── iframe ↔ parent message bus ─────────────────────────────────────────────

  useEffect(() => {
    const handle = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = (event.data ?? {}) as { type?: string };

      if (data.type === "fossil-request-start") {
        setPhaseSync("overlay");
        // Move focus into the dialog once it renders
        setTimeout(() => {
          (primaryBtnRef.current ?? skipBtnRef.current)?.focus();
        }, 50);
      }
      if (data.type === "gameComplete") {
        window.location.href = "/patient";
      }
      if (data.type === "fossil-stroke-registered") {
        const payload = data as {
          type: string;
          deviation?: number;
          direction?: number;
          triggerDeg?: number;
          neutralDeg?: number;
        };
        const dev = payload.deviation;
        const dir = payload.direction;
        const trig = payload.triggerDeg ?? 14;
        if (typeof dev === "number" && (dir === -1 || dir === 1)) {
          appendSerialLine(
            `✓ INPUT REGISTERED: deviation=${dev.toFixed(2)}° (need ${dir === -1 ? "≤" : "≥"} ±${trig}°) → ${dir === -1 ? "LEFT" : "RIGHT"} stroke`
          );
          if (lastJsonLineRef.current) {
            appendSerialLine(`  JSON: ${lastJsonLineRef.current}`);
          }
        }
      }
    };
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [appendSerialLine, setPhaseSync]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearAllTimers();
      if (deviceRef.current) {
        deviceRef.current.stopReading();
        void deviceRef.current.disconnect();
        setUsbConnected(false);
      }
    };
  }, [clearAllTimers]);

  // ── RAF loop for serial monitor (avoids re-renders on every packet) ─────────

  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (serialDirtyRef.current && serialPreRef.current) {
        serialDirtyRef.current = false;
        const lines = serialLinesRef.current;
        serialPreRef.current.textContent =
          lines.length === 0
            ? "Waiting for lines from the controller…"
            : lines.join("\n");
        serialPreRef.current.scrollTop = serialPreRef.current.scrollHeight;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const serialSupported =
    typeof navigator !== "undefined" && "serial" in navigator;

  const showOverlay = phase !== "idle" && phase !== "done";

  const dialogDescribedBy =
    phase === "overlay"
      ? "calib-body calib-steps"
      : phase === "error"
        ? "calib-error-msg"
        : phase === "calibrating"
          ? "calib-status calib-hold-hint"
          : "calib-status";

  return (
    <div className="fixed inset-0 bg-black">
      <iframe
        ref={iframeRef}
        src="/fossil_finder/fossil-finder-html/index.html?patientId=edwin-001"
        className="w-full h-full border-0"
        title="Fossil Finder - DXTR Therapy Game"
        allow="autoplay; serial; bluetooth"
      />

      {/* Back button — z-50 so it floats above overlay */}
      <Link
        href="/patient"
        className="fixed top-5 left-5 z-50 inline-flex items-center gap-2 bg-black/55 hover:bg-black/85 text-white text-lg font-semibold px-5 py-3 min-h-[48px] rounded-full backdrop-blur-sm transition-all outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-amber-400 focus-visible:outline-offset-2"
      >
        <ArrowLeft className="h-5 w-5" />
        Back
      </Link>

      {/* USB serial monitor — raw lines + registered-input highlights */}
      {usbConnected && (
        <div
          className="fixed z-[45] flex flex-col rounded-lg border border-amber-500/40 bg-[#1a1209]/95 text-[#f5ebe0] shadow-lg backdrop-blur-sm"
          style={{
            top: "max(12px, env(safe-area-inset-top))",
            right: 12,
            width: "min(420px, calc(100vw - 24px))",
            maxHeight: "min(40vh, 320px)",
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-amber-500/25 px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-200/90">
            <span className="min-w-0 truncate">
              Serial
              {serialPaused && (
                <span className="ml-1.5 font-extrabold uppercase text-amber-400/95">· paused</span>
              )}
            </span>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
              <button
                type="button"
                className="rounded px-2 py-0.5 text-[10px] font-bold text-amber-100 hover:bg-white/10"
                onClick={() => {
                  serialPausedRef.current = !serialPausedRef.current;
                  setSerialPaused(serialPausedRef.current);
                }}
              >
                {serialPaused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                className="rounded px-2 py-0.5 text-[10px] font-bold text-amber-100 hover:bg-white/10"
                onClick={() => setSerialMonitorOpen((o) => !o)}
              >
                {serialMonitorOpen ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                className="rounded px-2 py-0.5 text-[10px] font-bold text-amber-100 hover:bg-white/10"
                onClick={clearSerialLog}
              >
                Clear
              </button>
            </div>
          </div>
          {serialMonitorOpen && (
            <pre
              ref={serialPreRef}
              className="m-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-2 font-mono text-[11px] leading-snug text-[#e8ddd4]"
              aria-label="USB serial debug output"
            >
              Waiting for lines from the controller…
            </pre>
          )}
        </div>
      )}

      {/* Calibration overlay — appears after Start is pressed */}
      {showOverlay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="calib-title"
          aria-describedby={dialogDescribedBy}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(160deg, ${C.dark} 0%, ${C.dark2} 100%)`,
            fontFamily: "'Barlow', Arial, sans-serif",
          }}
        >
          {/* Thin top accent strip */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 4,
            background: `linear-gradient(90deg, ${C.tan}, ${C.brown})`,
          }} />

          <div style={{ textAlign: "center", maxWidth: 640, width: "100%", padding: "0 clamp(20px, 4vw, 40px)" }}>

            {/* Heading — large text for readability (WCAG 1.4.4) */}
            <h1
              id="calib-title"
              style={{
                fontSize: "clamp(2rem, 5.5vw, 3rem)",
                fontWeight: 900,
                color: C.cream,
                margin: "0 0 16px",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
              }}
            >
              {phase === "overlay" && "Calibrate your DXTR controller"}
              {phase === "connecting" && "Connecting to your device"}
              {phase === "calibrating" && "Hold the controller still"}
              {phase === "error" && "We couldn’t finish setup"}
            </h1>

            {phase === "overlay" && (
              <>
                <p
                  id="calib-body"
                  style={{
                    fontSize: "clamp(1.125rem, 2.5vw, 1.375rem)",
                    color: C.cream,
                    lineHeight: 1.55,
                    margin: "0 0 24px",
                    maxWidth: "38rem",
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                >
                  <strong style={{ fontWeight: 800 }}>Choose an option below.</strong> If you plug in the device, you must{' '}
                  <strong style={{ fontWeight: 800 }}>hold it perfectly still for 10 full seconds</strong> so motion controls work correctly.
                </p>

                <ol
                  id="calib-steps"
                  style={{
                    textAlign: "left",
                    maxWidth: "36rem",
                    margin: "0 auto 32px",
                    paddingLeft: "1.5rem",
                    color: C.textMuted,
                    fontSize: "clamp(1.05rem, 2.2vw, 1.25rem)",
                    lineHeight: 1.65,
                    listStylePosition: "outside",
                  }}
                >
                  <li style={{ marginBottom: 14 }}>
                    <strong style={{ color: C.cream, fontWeight: 800 }}>Using the controller?</strong> Tap{' '}
                    <span style={{ color: C.cream }}>Connect USB</span>, pick your port, then set the device on a flat surface. Do{' '}
                    <strong style={{ color: C.cream }}>not</strong> move or bump it until the progress bar finishes (~10 seconds).
                  </li>
                  <li style={{ marginBottom: 0 }}>
                    <strong style={{ color: C.cream, fontWeight: 800 }}>No controller?</strong> Tap{' '}
                    <span style={{ color: C.cream }}>Continue without device</span> — the game starts right away with keyboard only (no hold-still step).
                  </li>
                </ol>
              </>
            )}

            {/* ── Initial choice ── */}
            {phase === "overlay" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                {serialSupported && (
                  <button
                    ref={primaryBtnRef}
                    type="button"
                    onClick={connectUSB}
                    style={primaryBtn}
                    onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
                    onFocus={(e) => { e.currentTarget.style.outline = `3px solid ${C.focusRing}`; e.currentTarget.style.outlineOffset = "3px"; }}
                    onBlur={(e) => { e.currentTarget.style.outline = ""; }}
                  >
                    <span aria-hidden>🔌 </span>Connect USB — then hold still 10 seconds
                  </button>
                )}
                <button
                  ref={serialSupported ? skipBtnRef : primaryBtnRef}
                  type="button"
                  onClick={startWithoutDevice}
                  style={ghostBtn}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(245,235,224,0.08)";
                    e.currentTarget.style.borderColor = C.cream;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderColor = "rgba(245,235,224,0.65)";
                  }}
                  onFocus={(e) => { e.currentTarget.style.outline = `3px solid ${C.focusRing}`; e.currentTarget.style.outlineOffset = "3px"; }}
                  onBlur={(e) => { e.currentTarget.style.outline = ""; }}
                >
                  Continue without device
                </button>
              </div>
            )}

            {/* ── Active: connecting / calibrating ── */}
            {(phase === "connecting" || phase === "calibrating") && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                <p
                  id="calib-status"
                  aria-live="polite"
                  style={{
                    minHeight: "2.5em",
                    fontSize: "clamp(1.125rem, 2.5vw, 1.5rem)",
                    fontWeight: 700,
                    color: C.cream,
                    lineHeight: 1.45,
                    maxWidth: "32rem",
                  }}
                >
                  {statusMsg}
                </p>

                {phase === "calibrating" && (
                  <p
                    id="calib-hold-hint"
                    style={{
                      fontSize: "clamp(1.0625rem, 2.2vw, 1.25rem)",
                      color: C.textMuted,
                      lineHeight: 1.55,
                      maxWidth: "32rem",
                      margin: 0,
                    }}
                  >
                    Keep the controller on the table or your lap and <strong style={{ color: C.cream }}>do not move it</strong> until
                    the bar below is full and the game starts.
                  </p>
                )}

                {phase === "calibrating" && (
                  <div style={{ width: "100%", maxWidth: 400 }}>
                    <p
                      id="calib-progress-label"
                      style={{
                        margin: "0 0 8px",
                        fontSize: "clamp(1.0625rem, 2vw, 1.125rem)",
                        fontWeight: 700,
                        color: C.cream,
                        textAlign: "left",
                      }}
                    >
                      Calibration progress (about 10 seconds)
                    </p>
                    <div
                      role="progressbar"
                      aria-labelledby="calib-progress-label"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuetext="Calibration in progress"
                      style={{
                        width: "100%",
                        height: 10,
                        background: "#0d0a06",
                        borderRadius: 6,
                        overflow: "hidden",
                        border: "2px solid rgba(245,235,224,0.35)",
                      }}
                    >
                      <div
                        className="calib-progress-fill"
                        style={{
                          height: "100%",
                          width: "0%",
                          background: `linear-gradient(90deg, ${C.tan}, #ddb882)`,
                          borderRadius: 4,
                          animation: "calibFill 10s linear forwards",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Error ── */}
            {phase === "error" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                <p
                  id="calib-error-msg"
                  aria-live="assertive"
                  style={{
                    fontSize: "clamp(1.0625rem, 2.2vw, 1.25rem)",
                    fontWeight: 700,
                    color: C.errorText,
                    lineHeight: 1.55,
                    maxWidth: "32rem",
                  }}
                >
                  {statusMsg}
                </p>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
                  <button
                    ref={primaryBtnRef}
                    type="button"
                    onClick={() => { setPhaseSync("overlay"); setStatusMsg(""); }}
                    style={primaryBtn}
                    onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
                    onFocus={(e) => { e.currentTarget.style.outline = `3px solid ${C.focusRing}`; e.currentTarget.style.outlineOffset = "3px"; }}
                    onBlur={(e) => { e.currentTarget.style.outline = ""; }}
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={startWithoutDevice}
                    style={ghostBtn}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(245,235,224,0.08)";
                      e.currentTarget.style.borderColor = C.cream;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderColor = "rgba(245,235,224,0.65)";
                    }}
                    onFocus={(e) => { e.currentTarget.style.outline = `3px solid ${C.focusRing}`; e.currentTarget.style.outlineOffset = "3px"; }}
                    onBlur={(e) => { e.currentTarget.style.outline = ""; }}
                  >
                    Continue without device
                  </button>
                </div>
              </div>
            )}
          </div>

          <style>{`
            @keyframes calibFill { to { width: 100%; } }
            @media (prefers-reduced-motion: reduce) {
              .calib-progress-fill { animation: none !important; width: 100% !important; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
