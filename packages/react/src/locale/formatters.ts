import type { TimeFormat } from "@usecalendar/core";

/** Where and how a date or time is being shown; passed to every formatter. */
export type FormatContext = {
  /** BCP 47 locale, e.g. `"en-US"` or `"es-PE"`. */
  locale: string;
  /** Clock format the time should use. */
  timeFormat: TimeFormat;
  /** IANA time zone the calendar is shown in. */
  timeZone: string;
};

/**
 * Every date and time the calendar renders. Pass a partial object to `formatters` to change any of them;
 * the rest use `Intl.DateTimeFormat` with the calendar's `locale` and `timeFormat`.
 *
 * Calendar days (`Temporal.PlainDate`) have no time zone; instants are ISO 8601 strings shown in
 * `context.timeZone`.
 *
 * @example
 * <Calendar formatters={{ weekday: (day, { locale }) => day.toLocaleString(locale, { weekday: "narrow" }) }} />
 */
export type CalendarFormatters = {
  /** Day number in a month cell, e.g. `"15"`. */
  dayNumber: (day: Temporal.PlainDate, context: FormatContext) => string;
  /** A full date for headings and screen readers, e.g. `"Sunday, November 15, 2026"`. */
  fullDate: (day: Temporal.PlainDate, context: FormatContext) => string;
  /** Hour label in the time grid's gutter, e.g. `"9:00 AM"` or `"09:00"`. `hour` is 0–23. */
  hour: (hour: number, context: FormatContext) => string;
  /** Abbreviated month name above a day of the mini calendar, e.g. `"Nov"`. */
  monthShort: (day: Temporal.PlainDate, context: FormatContext) => string;
  /** Month and year, e.g. `"November 2026"`. */
  monthYear: (day: Temporal.PlainDate, context: FormatContext) => string;
  /** Start time of an event, e.g. `"9:30 AM"`. */
  time: (instant: string, context: FormatContext) => string;
  /** An event's start–end span, collapsed where possible, e.g. `"9:00 – 10:30 AM"`. */
  timeRange: (start: string, end: string, context: FormatContext) => string;
  /** Weekday column header, e.g. `"Mon"`. */
  weekday: (day: Temporal.PlainDate, context: FormatContext) => string;
};

// Building Intl formatters is costly and grids format hundreds of cells, so they're reused per option set.
const cache = new Map<string, Intl.DateTimeFormat>();
const intl = (
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat => {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = cache.get(key);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(locale, options);
    cache.set(key, formatter);
  }
  return formatter;
};

const hourCycle = (
  timeFormat: TimeFormat,
): Intl.DateTimeFormatOptions["hourCycle"] =>
  timeFormat === "12h" ? "h12" : "h23";

/** UTC midnight of `day`: formatted with `timeZone: "UTC"`, it prints that calendar day whatever the system zone. */
const utcDate = (day: Temporal.PlainDate): Date =>
  new Date(Date.UTC(day.year, day.month - 1, day.day));

const timeOptions = ({
  timeFormat,
  timeZone,
}: FormatContext): Intl.DateTimeFormatOptions => ({
  hour: "numeric",
  hourCycle: hourCycle(timeFormat),
  minute: "2-digit",
  timeZone,
});

/** The `Intl`-based formatters used for anything not passed in `formatters`. */
export const DEFAULT_FORMATTERS: CalendarFormatters = {
  dayNumber: (day, { locale }) =>
    intl(locale, {
      day: "numeric",
      timeZone: "UTC",
    }).format(utcDate(day)),
  fullDate: (day, { locale }) =>
    intl(locale, {
      dateStyle: "full",
      timeZone: "UTC",
    }).format(utcDate(day)),
  hour: (hour, context) =>
    intl(context.locale, {
      ...timeOptions(context),
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2000, 0, 1, hour))),
  monthShort: (day, { locale }) =>
    intl(locale, {
      month: "short",
      timeZone: "UTC",
    }).format(utcDate(day)),
  monthYear: (day, { locale }) =>
    intl(locale, {
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    }).format(utcDate(day)),
  time: (instant, context) =>
    intl(context.locale, timeOptions(context)).format(new Date(instant)),
  timeRange: (start, end, context) =>
    intl(context.locale, timeOptions(context)).formatRange(
      new Date(start),
      new Date(end),
    ),
  weekday: (day, { locale }) =>
    intl(locale, {
      timeZone: "UTC",
      weekday: "short",
    }).format(utcDate(day)),
};

/**
 * The clock format a locale uses by default: `"12h"` for `en-US`, `"24h"` for `es-ES`, and so on.
 *
 * @example
 * localeTimeFormat("en-US"); // "12h"
 */
export const localeTimeFormat = (locale: string): TimeFormat => {
  const cycle = intl(locale, {
    hour: "numeric",
  }).resolvedOptions().hourCycle;
  return cycle === "h11" || cycle === "h12" ? "12h" : "24h";
};
