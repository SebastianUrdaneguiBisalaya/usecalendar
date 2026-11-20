import { describe, expect, it } from "vitest";
import { isWorkingTime, type WorkingHours } from "../src/working-hours.js";

const weekdays: WorkingHours = {
  days: [
    1,
    2,
    3,
    4,
    5,
  ],
  end: Temporal.PlainTime.from("18:00"),
  start: Temporal.PlainTime.from("09:30"),
};
const friday = Temporal.PlainDate.from("2026-11-20");
const saturday = Temporal.PlainDate.from("2026-11-21");

describe("isWorkingTime", () => {
  it("includes the start and excludes the end", () => {
    expect(isWorkingTime(friday, 9 * 60 + 29, weekdays)).toBe(false);
    expect(isWorkingTime(friday, 9 * 60 + 30, weekdays)).toBe(true);
    expect(isWorkingTime(friday, 17 * 60 + 59, weekdays)).toBe(true);
    expect(isWorkingTime(friday, 18 * 60, weekdays)).toBe(false);
  });

  it("leaves days that aren't listed off", () => {
    expect(isWorkingTime(saturday, 12 * 60, weekdays)).toBe(false);
    expect(
      isWorkingTime(saturday, 12 * 60, {
        ...weekdays,
        days: [
          6,
        ],
      }),
    ).toBe(true);
  });

  it("reads an end of 00:00 as midnight at the end of the day", () => {
    const evenings: WorkingHours = {
      ...weekdays,
      end: Temporal.PlainTime.from("00:00"),
      start: Temporal.PlainTime.from("20:00"),
    };
    expect(isWorkingTime(friday, 23 * 60 + 30, evenings)).toBe(true);
    expect(isWorkingTime(friday, 19 * 60, evenings)).toBe(false);
  });

  it("has no working time when the end isn't after the start", () => {
    const empty: WorkingHours = {
      ...weekdays,
      end: Temporal.PlainTime.from("09:00"),
      start: Temporal.PlainTime.from("09:00"),
    };
    expect(isWorkingTime(friday, 9 * 60, empty)).toBe(false);
  });
});
