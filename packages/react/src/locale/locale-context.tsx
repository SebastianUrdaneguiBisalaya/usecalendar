import type { TimeFormat } from "@usecalendar/core";
import { createContext, type ReactNode, use, useMemo } from "react";
import {
  type CalendarFormatters,
  DEFAULT_FORMATTERS,
  localeTimeFormat,
} from "./formatters.js";
import {
  type CalendarLabels,
  type CalendarLabelsInput,
  DEFAULT_LABELS,
  resolveLabels,
} from "./labels.js";

/** Locale, clock format and text options shared by every calendar component. */
export type CalendarLocaleOptions = {
  /** Partial overrides for any date or time the calendar renders; see `CalendarFormatters`. */
  formatters?: Partial<CalendarFormatters> | undefined;
  /** Partial overrides for any text the calendar renders; see `CalendarLabels`. */
  labels?: CalendarLabelsInput | undefined;
  /**
   * BCP 47 locale for every date and time, e.g. `"es-PE"`. Weekday and month names, date order and the
   * default clock format follow it. Labels are not translated automatically: pass `labels` for that.
   *
   * @defaultValue "en-US"
   */
  locale?: string | undefined;
  /**
   * Clock format for every time shown.
   *
   * @defaultValue the locale's own (e.g. `"12h"` for `en-US`, `"24h"` for `es-ES`)
   */
  timeFormat?: TimeFormat | undefined;
};

/** Resolved locale options every component reads. */
export type CalendarLocale = {
  /** Every date and time formatter, defaults filled in. */
  formatters: CalendarFormatters;
  /** Every text label, defaults filled in. */
  labels: CalendarLabels;
  /** BCP 47 locale every date and time is formatted in. */
  locale: string;
  /** Clock format for every time shown. */
  timeFormat: TimeFormat;
};

/** The default locale. */
export const DEFAULT_LOCALE = "en-US";

const DEFAULT_CALENDAR_LOCALE: CalendarLocale = {
  formatters: DEFAULT_FORMATTERS,
  labels: DEFAULT_LABELS,
  locale: DEFAULT_LOCALE,
  timeFormat: localeTimeFormat(DEFAULT_LOCALE),
};

// Components used without a provider get the English defaults.
const CalendarLocaleContext = createContext<CalendarLocale>(
  DEFAULT_CALENDAR_LOCALE,
);

/** Fills in every missing option with its default. */
export const resolveLocale = ({
  formatters,
  labels,
  locale = DEFAULT_LOCALE,
  timeFormat,
}: CalendarLocaleOptions): CalendarLocale => ({
  formatters:
    formatters === undefined
      ? DEFAULT_FORMATTERS
      : {
          ...DEFAULT_FORMATTERS,
          ...formatters,
        },
  labels: resolveLabels(labels),
  locale,
  timeFormat: timeFormat ?? localeTimeFormat(locale),
});

/** Shares locale options with every calendar component below it. Rendered by `<Calendar>`. */
export function CalendarLocaleProvider({
  children,
  formatters,
  labels,
  locale,
  timeFormat,
}: CalendarLocaleOptions & {
  children: ReactNode;
}) {
  const value = useMemo(
    () =>
      resolveLocale({
        formatters,
        labels,
        locale,
        timeFormat,
      }),
    [
      formatters,
      labels,
      locale,
      timeFormat,
    ],
  );
  return (
    <CalendarLocaleContext value={value}>{children}</CalendarLocaleContext>
  );
}

/** The locale options of the nearest `CalendarLocaleProvider`, or the English defaults without one. */
export const useCalendarLocale = (): CalendarLocale =>
  use(CalendarLocaleContext);
