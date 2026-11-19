import { describe, expect, it } from "vitest";
import {
  boxStyle,
  GUTTER_REM,
  gridStyle,
  hourHeightLength,
} from "../../src/time-grid/grid-geometry.js";

describe("gridStyle", () => {
  it("makes the grid at least as wide as its tracks, so sticky and absolute boxes span the whole scroll", () => {
    const week = gridStyle(7, 3, 30);
    expect(week.gridTemplateColumns).toBe(
      `${GUTTER_REM}rem repeat(7, minmax(7rem, 1fr))`,
    );
    expect(week.minWidth).toBe(`${GUTTER_REM + 7 * 7}rem`);
  });

  it("lets a single day shrink to any width", () => {
    const day = gridStyle(1, 3, 30);
    expect(day.gridTemplateColumns).toBe(
      `${GUTTER_REM}rem repeat(1, minmax(0rem, 1fr))`,
    );
    expect(day.minWidth).toBe(`${GUTTER_REM}rem`);
  });
});

describe("hour height", () => {
  it("reads numbers as rem and uses strings as CSS lengths", () => {
    expect(hourHeightLength(3)).toBe("3rem");
    expect(hourHeightLength(1.5)).toBe("1.5rem");
    expect(hourHeightLength("64px")).toBe("64px");
  });

  it("defaults to 3rem per hour and sets it as a variable on the grid", () => {
    const style = gridStyle(7, 3, 30) as Record<string, unknown>;
    expect(style["--uc-time-grid-hour"]).toBe("3rem");
    expect(
      (gridStyle(7, 3, 30, "64px") as Record<string, unknown>)[
        "--uc-time-grid-hour"
      ],
    ).toBe("64px");
  });

  it("splits the hour into slot rows, whatever its height", () => {
    expect(gridStyle(1, 3, 15).gridTemplateRows).toBe(
      "var(--uc-time-grid-header) repeat(96, calc(var(--uc-time-grid-hour) * 0.25))",
    );
  });
});

describe("boxStyle", () => {
  it("places a box vertically on the hour scale, below the header", () => {
    expect(boxStyle(0, 1, 90, 150)).toMatchObject({
      height: "calc(var(--uc-time-grid-hour) * 1)",
      top: "calc(var(--uc-time-grid-header) + var(--uc-time-grid-hour) * 1.5)",
    });
  });

  it("places a box by percentage of the grid width, after the gutter", () => {
    expect(boxStyle(2, 7, 60, 120)).toMatchObject({
      left: `calc(${GUTTER_REM}rem + (100% - ${GUTTER_REM}rem) / 7 * 2)`,
      width: `calc((100% - ${GUTTER_REM}rem) / 7 / 1)`,
    });
  });
});
