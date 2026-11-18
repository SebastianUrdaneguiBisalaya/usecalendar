import { describe, expect, it } from "vitest";
import { overlapsRange } from "../src/date-range.js";

const range = {
  end: "2026-11-16T05:00:00.000Z",
  start: "2026-11-09T05:00:00.000Z",
};

describe("overlapsRange", () => {
  it("is true for an event inside the range", () => {
    expect(
      overlapsRange("2026-11-10T14:00:00Z", "2026-11-10T15:00:00Z", range),
    ).toBe(true);
  });

  it("is true for an event that only partly overlaps the range", () => {
    expect(
      overlapsRange("2026-11-08T23:00:00Z", "2026-11-09T06:00:00Z", range),
    ).toBe(true);
  });

  it("treats both ends as half-open: touching is not overlapping", () => {
    expect(
      overlapsRange("2026-11-09T04:00:00Z", "2026-11-09T05:00:00Z", range),
    ).toBe(false);
    expect(
      overlapsRange("2026-11-16T05:00:00Z", "2026-11-16T06:00:00Z", range),
    ).toBe(false);
  });

  it("compares instants by time, whatever their offset", () => {
    // 00:30 in Lima is 05:30 UTC, inside the range even though the text sorts before its start.
    expect(
      overlapsRange(
        "2026-11-09T00:30:00-05:00",
        "2026-11-09T01:00:00-05:00",
        range,
      ),
    ).toBe(true);
  });
});
