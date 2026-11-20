import { MINUTES_PER_DAY } from "@usecalendar/core";
import type { CSSProperties } from "react";

// Sizes in rem so the grid follows the user's font size. Every position below derives from these.
/** Default height of one hour; slots split it evenly, so `slotMinutes` changes the rows but not the scale. */
export const HOUR_HEIGHT_REM = 3;
/** Day headers; the all-day lane adds its rows below them. */
export const DAY_HEADER_REM = 3;
/** One row of the all-day lane. */
export const ALL_DAY_LANE_REM = 1.375;
/** Width of one hour column; the grid has one per time zone shown. */
export const GUTTER_REM = 4;
/** Narrowest day column in the week view; below it the grid scrolls sideways. */
const MIN_DAY_REM = 7;
/** Shortest height an event is drawn with, so its title stays readable. Also spaces short events apart. */
const MIN_EVENT_REM = 0.75;
/** Events drawn shorter than this use one line (title and time side by side). */
const COMPACT_EVENT_REM = 3;

// The header height varies with the all-day lane, and the hour height with the `hourHeight` prop; children read
// both from these variables, set once on the grid, instead of props.
const HEADER = "var(--uc-time-grid-header)";
const HOUR = "var(--uc-time-grid-hour)";
/** Width of every hour column together. */
const GUTTER = "var(--uc-time-grid-gutter)";

/** CSS length of `minutes` on the grid's scale. */
const minutesToLength = (minutes: number) => `${HOUR} * ${minutes / 60}`;

/** An `hourHeight` prop as a CSS length: numbers are rem, strings are used as they are (`"64px"`). */
export const hourHeightLength = (hourHeight: number | string): string =>
  typeof hourHeight === "number" ? `${hourHeight}rem` : hourHeight;

const REM_LENGTH = /^\s*(\d+(?:\.\d+)?|\.\d+)rem\s*$/;

/**
 * The hour height in rem, when it can be known without the DOM: numbers, and strings in rem (`"4rem"`). Other CSS
 * lengths (`"64px"`, `"5vh"`) return `null` and are measured once the grid is mounted.
 */
export const hourHeightRem = (hourHeight: number | string): number | null => {
  const rem =
    typeof hourHeight === "number"
      ? hourHeight
      : Number(REM_LENGTH.exec(hourHeight)?.[1] ?? Number.NaN);
  return Number.isFinite(rem) && rem > 0 ? rem : null;
};

/** How short events are drawn at a given hour height, in minutes of that scale. */
export type EventSizing = {
  /** Events drawn shorter than this use one line. */
  compactMinutes: number;
  /** Shortest an event is drawn; also spaces short events apart in the layout. */
  minMinutes: number;
};

/**
 * Turns the event size rules, which are heights, into minutes at `hourRem` per hour, so a short event stays readable
 * on a dense grid and gets its two lines back on a tall one. At the default 3rem: 15 minutes minimum, one line under
 * 60 minutes.
 */
export const eventSizing = (hourRem: number): EventSizing => {
  const rem =
    Number.isFinite(hourRem) && hourRem > 0 ? hourRem : HOUR_HEIGHT_REM;
  const minutes = (height: number) => (height / rem) * 60;
  return {
    compactMinutes: minutes(COMPACT_EVENT_REM),
    // Whole minutes, so positions stay round; the epsilon keeps float noise (15.000000001) from adding one.
    minMinutes: Math.ceil(minutes(MIN_EVENT_REM) - 1e-9),
  };
};

/** Rows (slots) in one day. */
export const slotsPerDay = (slotMinutes: number): number =>
  MINUTES_PER_DAY / slotMinutes;

/**
 * Grid tracks: `gutters` hour columns (one per time zone) and one column per day; the header row and one row per slot.
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
  gutters = 1,
): CSSProperties => {
  const minDayRem = dayCount > 1 ? MIN_DAY_REM : 0;
  const gutterRem = gutters * GUTTER_REM;
  return {
    "--uc-time-grid-gutter": `${gutterRem}rem`,
    "--uc-time-grid-header": `${headerRem}rem`,
    "--uc-time-grid-hour": hourHeightLength(hourHeight),
    gridTemplateColumns: `${Array.from(
      {
        length: gutters,
      },
      () => `${GUTTER_REM}rem`,
    ).join(" ")} repeat(${dayCount}, minmax(${minDayRem}rem, 1fr))`,
    gridTemplateRows: `${HEADER} repeat(${slotsPerDay(slotMinutes)}, calc(${minutesToLength(slotMinutes)}))`,
    minWidth: `${gutterRem + dayCount * minDayRem}rem`,
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
  const dayWidth = `(100% - ${GUTTER}) / ${dayCount}`;
  return {
    height: `calc(${minutesToLength(endMinute - startMinute)})`,
    left: `calc(${GUTTER} + ${dayWidth} * ${dayIndex + column / columns})`,
    top: `calc(${HEADER} + ${minutesToLength(startMinute)})`,
    width: `calc(${dayWidth} / ${columns})`,
  };
};

/** A value for an attribute selector (`[data-x="…"]`), escaped. Event ids may hold any character. */
export const attributeValue = (value: string): string =>
  value.replace(/["\\]/g, "\\$&");
