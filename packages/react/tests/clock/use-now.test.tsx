// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNow } from "../../src/clock/use-now.js";
import { renderHook } from "../render-hook.js";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-15T15:00:30Z"));
});
afterEach(() => vi.useRealTimers());

describe("useNow", () => {
  it("is the current minute and ticks on the next minute boundary", () => {
    const { result } = renderHook(() => useNow(), undefined);
    expect(result.current).toBe(Date.parse("2026-11-15T15:00:00Z"));
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current).toBe(Date.parse("2026-11-15T15:01:00Z"));
  });
});
