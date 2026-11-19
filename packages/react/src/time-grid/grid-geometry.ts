import { MINUTES_PER_DAY } from "@usecalendar/core";
import type { CSSProperties } from "react";

// Sizes in rem so the grid follows the user's font size. Every position below derives from these.
/** Height of one hour; slots split it evenly, so `slotMinutes` changes the rows but not the scale. */
const HOUR_REM = 3;
/** Day headers; the all-day lane adds its rows below them. */
export const DAY_HEADER_REM = 3;
/** One row of the all-day lane. */
export const ALL_DAY_LANE_REM = 1.375;
export const GUTTER_REM = 4;
/** Narrowest day column in the week view; below it the grid scrolls sideways. */
const MIN_DAY_REM = 7;
/** Shortest height an event is drawn with, so its title stays readable. Also spaces short events apart. */
export const MIN_EVENT_MINUTES = 15;
/** Events shorter than this are drawn on one line (title and time side by side). */
export const COMPACT_EVENT_MINUTES = 60;

const minutesToRem = (minutes: number) => (minutes / 60) * HOUR_REM;

// The header height varies with the all-day lane; children read it from this variable instead of a prop.
const HEADER = "var(--uc-time-grid-header)";

/** Rows (slots) in one day. */
export const slotsPerDay = (slotMinutes: number): number =>
  MINUTES_PER_DAY / slotMinutes;

/** Grid tracks: the hour gutter and one column per day; the header row and one row per slot. */
export const gridStyle = (
  dayCount: number,
  headerRem: number,
  slotMinutes: number,
): CSSProperties =>
  ({
    "--uc-time-grid-header": `${headerRem}rem`,
    gridTemplateColumns: `${GUTTER_REM}rem repeat(${dayCount}, minmax(${dayCount > 1 ? MIN_DAY_REM : 0}rem, 1fr))`,
    gridTemplateRows: `${HEADER} repeat(${slotsPerDay(slotMinutes)}, ${minutesToRem(slotMinutes)}rem)`,
  }) as CSSProperties;

/** Absolute box for something spanning `[startMinute, endMinute)` in a day column, inside lane `column` of `columns`. */
export const boxStyle = (
  dayIndex: number,
  dayCount: number,
  startMinute: number,
  endMinute: number,
  column = 0,
  columns = 1,
): Pick<CSSProperties, "height" | "left" | "top" | "width"> => {
  const dayWidth = `(100% - ${GUTTER_REM}rem) / ${dayCount}`;
  return {
    height: `${minutesToRem(endMinute - startMinute)}rem`,
    left: `calc(${GUTTER_REM}rem + ${dayWidth} * ${dayIndex + column / columns})`,
    top: `calc(${HEADER} + ${minutesToRem(startMinute)}rem)`,
    width: `calc(${dayWidth} / ${columns})`,
  };
};

/** A value for an attribute selector (`[data-x="…"]`), escaped. Event ids may hold any character. */
export const attributeValue = (value: string): string =>
  value.replace(/["\\]/g, "\\$&");
