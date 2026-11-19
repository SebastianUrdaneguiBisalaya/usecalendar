import { describe, expect, it } from "vitest";
import {
  boxStyle,
  GUTTER_REM,
  gridStyle,
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

describe("boxStyle", () => {
  it("places a box by percentage of the grid width, after the gutter", () => {
    expect(boxStyle(2, 7, 60, 120)).toMatchObject({
      left: `calc(${GUTTER_REM}rem + (100% - ${GUTTER_REM}rem) / 7 * 2)`,
      width: `calc((100% - ${GUTTER_REM}rem) / 7 / 1)`,
    });
  });
});
