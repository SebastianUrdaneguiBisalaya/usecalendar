import { describe, expect, it } from "vitest";
import {
  addStripDays,
  clampDay,
  isDayInRange,
  nextStripFocus,
  shiftStrip,
  stripDays,
  stripStart,
} from "../src/date-strip.js";

const day = (text: string) => Temporal.PlainDate.from(text);
const texts = (days: Temporal.PlainDate[]) =>
  days.map((item) => item.toString());

// 2026-11-16 is a Monday; 2026-11-21/22 are Saturday/Sunday.
describe("addStripDays", () => {
  it("moves by calendar days when weekends are shown", () => {
    expect(addStripDays(day("2026-11-18"), 5).toString()).toBe("2026-11-23");
    expect(addStripDays(day("2026-11-18"), -3).toString()).toBe("2026-11-15");
    expect(addStripDays(day("2026-11-18"), 0).toString()).toBe("2026-11-18");
  });

  it("counts only weekdays when weekends are hidden", () => {
    const options = {
      showWeekends: false,
    };
    expect(addStripDays(day("2026-11-20"), 1, options).toString()).toBe(
      "2026-11-23",
    );
    expect(addStripDays(day("2026-11-23"), -1, options).toString()).toBe(
      "2026-11-20",
    );
    // A hidden day counts from the nearest shown day in the direction of travel.
    expect(addStripDays(day("2026-11-21"), 0, options).toString()).toBe(
      "2026-11-23",
    );
    expect(addStripDays(day("2026-11-22"), -1, options).toString()).toBe(
      "2026-11-19",
    );
  });

  it("crosses months, years and leap days by calendar date", () => {
    expect(addStripDays(day("2028-02-28"), 1).toString()).toBe("2028-02-29");
    expect(addStripDays(day("2026-12-31"), 1).toString()).toBe("2027-01-01");
  });
});

describe("stripDays", () => {
  it("lists count days from the start", () => {
    expect(texts(stripDays(day("2026-11-18"), 7))).toEqual([
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
      "2026-11-24",
    ]);
  });

  it("skips hidden weekends but still shows count days", () => {
    expect(
      texts(
        stripDays(day("2026-11-21"), 6, {
          showWeekends: false,
        }),
      ),
    ).toEqual([
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-30",
    ]);
  });

  it("is empty for no days", () => {
    expect(stripDays(day("2026-11-18"), 0)).toEqual([]);
  });
});

describe("stripStart", () => {
  const thursday = day("2026-11-19");

  it("aligns to the week start", () => {
    expect(stripStart(thursday, 7).toString()).toBe("2026-11-16");
    expect(
      stripStart(thursday, 7, {
        weekStart: "sunday",
      }).toString(),
    ).toBe("2026-11-15");
    expect(
      stripStart(thursday, 7, {
        weekStart: "saturday",
      }).toString(),
    ).toBe("2026-11-14");
  });

  it("pages through the week for strips shorter than a week", () => {
    expect(stripStart(day("2026-11-18"), 3).toString()).toBe("2026-11-16");
    expect(stripStart(thursday, 3).toString()).toBe("2026-11-19");
    expect(stripStart(day("2026-11-22"), 3).toString()).toBe("2026-11-22");
  });

  it("aligns weekday strips to the week's first weekday", () => {
    const options = {
      showWeekends: false,
      weekStart: "sunday" as const,
    };
    expect(stripStart(thursday, 5, options).toString()).toBe("2026-11-16");
    // A hidden Saturday is placed as the next Monday.
    expect(stripStart(day("2026-11-21"), 5, options).toString()).toBe(
      "2026-11-23",
    );
  });

  it("puts the day first, or in the middle", () => {
    expect(
      stripStart(thursday, 7, {
        align: "start",
      }).toString(),
    ).toBe("2026-11-19");
    expect(
      stripStart(thursday, 5, {
        align: "center",
      }).toString(),
    ).toBe("2026-11-17");
    expect(
      stripStart(thursday, 4, {
        align: "center",
      }).toString(),
    ).toBe("2026-11-18");
    expect(
      stripStart(day("2026-11-23"), 3, {
        align: "center",
        showWeekends: false,
      }).toString(),
    ).toBe("2026-11-20");
  });

  it("always contains the day", () => {
    for (const align of [
      "week",
      "start",
      "center",
    ] as const)
      for (const count of [
        1,
        3,
        5,
        7,
        10,
      ])
        for (let offset = 0; offset < 14; offset++) {
          const target = day("2026-11-16").add({
            days: offset,
          });
          const days = stripDays(
            stripStart(target, count, {
              align,
            }),
            count,
          );
          expect(days.some((item) => item.equals(target))).toBe(true);
        }
  });
});

describe("shiftStrip", () => {
  it("moves a page or a day", () => {
    expect(shiftStrip(day("2026-11-16"), 7, 1).toString()).toBe("2026-11-23");
    expect(shiftStrip(day("2026-11-16"), 7, -1).toString()).toBe("2026-11-09");
    expect(
      shiftStrip(day("2026-11-16"), 7, -1, {
        step: "day",
      }).toString(),
    ).toBe("2026-11-15");
  });

  it("counts shown days when weekends are hidden", () => {
    expect(
      shiftStrip(day("2026-11-16"), 5, 1, {
        showWeekends: false,
      }).toString(),
    ).toBe("2026-11-23");
    expect(
      shiftStrip(day("2026-11-23"), 5, -1, {
        showWeekends: false,
        step: "day",
      }).toString(),
    ).toBe("2026-11-20");
  });
});

describe("isDayInRange and clampDay", () => {
  const limits = {
    max: day("2026-11-30"),
    min: day("2026-11-10"),
  };

  it("includes both bounds", () => {
    expect(isDayInRange(day("2026-11-10"), limits)).toBe(true);
    expect(isDayInRange(day("2026-11-30"), limits)).toBe(true);
    expect(isDayInRange(day("2026-11-09"), limits)).toBe(false);
    expect(isDayInRange(day("2026-12-01"), limits)).toBe(false);
    expect(isDayInRange(day("1990-01-01"), {})).toBe(true);
  });

  it("moves days outside the limits to the nearest bound", () => {
    expect(clampDay(day("2026-11-01"), limits).toString()).toBe("2026-11-10");
    expect(clampDay(day("2026-12-25"), limits).toString()).toBe("2026-11-30");
    expect(clampDay(day("2026-11-18"), limits).toString()).toBe("2026-11-18");
    expect(
      clampDay(day("2026-12-25"), {
        max: day("2026-11-01"),
        min: day("2026-11-10"),
      }).toString(),
    ).toBe("2026-11-10");
  });
});

describe("nextStripFocus", () => {
  it("moves one day with ←/→ inside the strip", () => {
    expect(nextStripFocus(3, "ArrowLeft", 7)).toEqual({
      index: 2,
      shift: null,
    });
    expect(nextStripFocus(3, "ArrowRight", 7)).toEqual({
      index: 4,
      shift: null,
    });
  });

  it("moves the strip past an edge, landing on the far end of a new page", () => {
    expect(nextStripFocus(6, "ArrowRight", 7)).toEqual({
      index: 0,
      shift: {
        direction: 1,
        step: "page",
      },
    });
    expect(nextStripFocus(0, "ArrowLeft", 7)).toEqual({
      index: 6,
      shift: {
        direction: -1,
        step: "page",
      },
    });
  });

  it("keeps focus on the edge while days slide by with the day step", () => {
    expect(nextStripFocus(6, "ArrowRight", 7, "day")).toEqual({
      index: 6,
      shift: {
        direction: 1,
        step: "day",
      },
    });
    expect(nextStripFocus(0, "ArrowLeft", 7, "day")).toEqual({
      index: 0,
      shift: {
        direction: -1,
        step: "day",
      },
    });
  });

  it("jumps with Home/End and pages with PageUp/PageDown", () => {
    expect(nextStripFocus(3, "Home", 7)).toEqual({
      index: 0,
      shift: null,
    });
    expect(nextStripFocus(3, "End", 7)).toEqual({
      index: 6,
      shift: null,
    });
    expect(nextStripFocus(3, "PageDown", 7, "day")).toEqual({
      index: 3,
      shift: {
        direction: 1,
        step: "page",
      },
    });
    expect(nextStripFocus(3, "PageUp", 7)?.shift?.direction).toBe(-1);
  });

  it("ignores other keys", () => {
    expect(nextStripFocus(3, "Enter", 7)).toBeNull();
    expect(nextStripFocus(3, "ArrowUp", 7)).toBeNull();
  });
});
