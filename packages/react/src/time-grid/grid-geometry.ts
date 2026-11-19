import { MINUTES_PER_DAY } from "@usecalendar/core";
import type { CSSProperties } from "react";

// Sizes in rem so the grid follows the user's font size. Every position below derives from these.
/** Default height of one hour; slots split it evenly, so `slotMinutes` changes the rows but not the scale. */
export const HOUR_HEIGHT_REM = 3;
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

// The header height varies with the all-day lane, and the hour height with the `hourHeight` prop; children read
// both from these variables, set once on the grid, instead of props.
const HEADER = "var(--uc-time-grid-header)";
const HOUR = "var(--uc-time-grid-hour)";

/** CSS length of `minutes` on the grid's scale. */
const minutesToLength = (minutes: number) => `${HOUR} * ${minutes / 60}`;

/** An `hourHeight` prop as a CSS length: numbers are rem, strings are used as they are (`"64px"`). */
export const hourHeightLength = (hourHeight: number | string): string =>
  typeof hourHeight === "number" ? `${hourHeight}rem` : hourHeight;

/** Rows (slots) in one day. */
export const slotsPerDay = (slotMinutes: number): number =>
  MINUTES_PER_DAY / slotMinutes;

/**
 * Grid tracks: the hour gutter and one column per day; the header row and one row per slot.
 *
 * `minWidth` matches the tracks' minimum, so the grid's own box grows with them instead of the tracks overflowing it.
 * That box is the containing block of the sticky hour gutter and of every absolutely placed box (`boxStyle`): if it
 * were only as wide as the scroll container, the gutter would scroll away at the end of a sideways scroll and events
 * would be laid out over the visible width instead of their columns.
 */
export const gridStyle = (
  dayCount: number,
  headerRem: number,
  slotMinutes: number,
  hourHeight: number | string = HOUR_HEIGHT_REM,
): CSSProperties => {
  const minDayRem = dayCount > 1 ? MIN_DAY_REM : 0;
  return {
    "--uc-time-grid-header": `${headerRem}rem`,
    "--uc-time-grid-hour": hourHeightLength(hourHeight),
    gridTemplateColumns: `${GUTTER_REM}rem repeat(${dayCount}, minmax(${minDayRem}rem, 1fr))`,
    gridTemplateRows: `${HEADER} repeat(${slotsPerDay(slotMinutes)}, calc(${minutesToLength(slotMinutes)}))`,
    minWidth: `${GUTTER_REM + dayCount * minDayRem}rem`,
  } as CSSProperties;
};

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
    height: `calc(${minutesToLength(endMinute - startMinute)})`,
    left: `calc(${GUTTER_REM}rem + ${dayWidth} * ${dayIndex + column / columns})`,
    top: `calc(${HEADER} + ${minutesToLength(startMinute)})`,
    width: `calc(${dayWidth} / ${columns})`,
  };
};

/** A value for an attribute selector (`[data-x="…"]`), escaped. Event ids may hold any character. */
export const attributeValue = (value: string): string =>
  value.replace(/["\\]/g, "\\$&");
