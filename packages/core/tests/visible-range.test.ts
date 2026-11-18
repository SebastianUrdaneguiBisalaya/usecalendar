import { describe, expect, it } from "vitest";
import { visibleDayRange, visibleRange } from "../src/visible-range.js";

const date = Temporal.PlainDate.from("2026-11-15");
const texts = ({
  first,
  last,
}: {
  first: Temporal.PlainDate;
  last: Temporal.PlainDate;
}) => [
  first.toString(),
  last.toString(),
];

describe("visibleDayRange", () => {
  it("day view covers only that day", () => {
    expect(texts(visibleDayRange(date, "day", "monday"))).toEqual([
      "2026-11-15",
      "2026-11-15",
    ]);
  });

  it("week view covers the week from the first weekday", () => {
    expect(texts(visibleDayRange(date, "week", "monday"))).toEqual([
      "2026-11-09",
      "2026-11-15",
    ]);
    expect(texts(visibleDayRange(date, "week", "sunday"))).toEqual([
      "2026-11-15",
      "2026-11-21",
    ]);
  });

  it("a week crossing into the next month is still whole", () => {
    expect(
      texts(
        visibleDayRange(
          Temporal.PlainDate.from("2026-12-01"),
          "week",
          "monday",
        ),
      ),
    ).toEqual([
      "2026-11-30",
      "2026-12-06",
    ]);
  });

  it("month view covers the whole weeks it draws", () => {
    expect(texts(visibleDayRange(date, "month", "monday"))).toEqual([
      "2026-10-26",
      "2026-12-06",
    ]);
  });
});

describe("visibleRange", () => {
  it("is the UTC range from the first day's midnight to the day after the last", () => {
    expect(visibleRange(date, "week", "monday", "America/Lima")).toEqual({
      end: "2026-11-16T05:00:00.000Z",
      start: "2026-11-09T05:00:00.000Z",
    });
  });
});
