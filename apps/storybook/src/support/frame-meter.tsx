import { type CSSProperties, useEffect, useState } from "react";

/** What the meter shows, refreshed once per second. */
type FrameStats = {
  /** Frames painted in the last second. */
  fps: number;
  /** Long animation frames (or long tasks) seen since the last reset. */
  longFrames: number;
  /** Longest of those, in milliseconds. */
  longestFrame: number;
  /** Frames in the last second that took more than 1.5 frames at 60 Hz (25 ms). */
  slowFrames: number;
  /** Longest frame in the last second, in milliseconds. */
  worstFrame: number;
};

const EMPTY: FrameStats = {
  fps: 0,
  longestFrame: 0,
  longFrames: 0,
  slowFrames: 0,
  worstFrame: 0,
};

/** A frame slower than this missed at least one 60 Hz refresh. */
const SLOW_FRAME_MS = 25;

/**
 * The best "slow frame" entry type this browser reports: `long-animation-frame` (Chromium), else `longtask`, else
 * none (Firefox, Safari: only the requestAnimationFrame numbers are shown).
 */
const longFrameEntryType = (): string | null => {
  const supported = PerformanceObserver.supportedEntryTypes;
  if (supported.includes("long-animation-frame")) return "long-animation-frame";
  if (supported.includes("longtask")) return "longtask";
  return null;
};

/**
 * A small overlay with the frame rate while you interact with a story: FPS and the worst frame of the last second
 * (from `requestAnimationFrame`), plus long animation frames (`PerformanceObserver`). It's a manual review aid, like
 * the DevTools FPS meter: the numbers depend on the machine, so nothing asserts on them.
 */
export function FrameMeter() {
  const [stats, setStats] = useState<FrameStats>(EMPTY);
  const [resets, setResets] = useState(0);

  useEffect(() => {
    // `resets` restarts the counters.
    void resets;
    let frames = 0;
    let slow = 0;
    let worst = 0;
    let longFrames = 0;
    let longest = 0;
    let previous = performance.now();
    let windowStart = previous;
    let handle = 0;

    const tick = (now: number): void => {
      const delta = now - previous;
      previous = now;
      frames += 1;
      worst = Math.max(worst, delta);
      if (delta > SLOW_FRAME_MS) slow += 1;
      if (now - windowStart >= 1000) {
        setStats({
          fps: Math.round((frames * 1000) / (now - windowStart)),
          longestFrame: Math.round(longest),
          longFrames,
          slowFrames: slow,
          worstFrame: Math.round(worst),
        });
        frames = 0;
        slow = 0;
        worst = 0;
        windowStart = now;
      }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);

    const entryType = longFrameEntryType();
    const observer =
      entryType === null
        ? null
        : new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              longFrames += 1;
              longest = Math.max(longest, entry.duration);
            }
          });
    observer?.observe({
      buffered: false,
      type: entryType ?? "",
    });

    return () => {
      cancelAnimationFrame(handle);
      observer?.disconnect();
    };
  }, [
    resets,
  ]);

  const tone =
    stats.fps >= 55 ? "#16a34a" : stats.fps >= 40 ? "#d97706" : "#dc2626";

  return (
    <div
      aria-live="off"
      style={panel}
    >
      <strong
        style={{
          color: tone,
          fontSize: 16,
        }}
      >
        {stats.fps} FPS
      </strong>
      <span>worst frame {stats.worstFrame} ms</span>
      <span>
        slow frames (&gt;{SLOW_FRAME_MS} ms) {stats.slowFrames}/s
      </span>
      <span>
        long frames {stats.longFrames}
        {stats.longFrames > 0 ? ` (max ${stats.longestFrame} ms)` : ""}
      </span>
      <button
        onClick={() => {
          setStats(EMPTY);
          setResets((count) => count + 1);
        }}
        type="button"
      >
        Reset
      </button>
    </div>
  );
}

const panel: CSSProperties = {
  background: "var(--uc-popover)",
  border: "1px solid var(--uc-border)",
  borderRadius: 8,
  bottom: 12,
  boxShadow: "0 4px 16px rgb(0 0 0 / 0.15)",
  color: "var(--uc-popover-foreground)",
  display: "grid",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  gap: 2,
  minWidth: 210,
  padding: "8px 10px",
  pointerEvents: "auto",
  position: "fixed",
  right: 12,
  zIndex: 1000,
};
