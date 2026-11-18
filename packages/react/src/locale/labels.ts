import type { CalendarView } from "@usecalendar/core";

/**
 * Every text the calendar renders that isn't a date or time: visible labels and screen-reader text.
 * Pass a partial object to `labels` to translate or reword any of them; the rest keep their English defaults.
 *
 * @example
 * <Calendar labels={{ today: "Hoy", moreEvents: (count) => `+${count} más`, views: { day: "Día", week: "Semana", month: "Mes" } }} />
 */
export type CalendarLabels = {
  /** Screen-reader summary of the all-day events of a day column, e.g. `"All-day: Holiday, Trip"`. */
  allDayEvents: (titles: readonly string[]) => string;
  /** Button that collapses the all-day lane back to two rows. */
  collapseAllDay: string;
  /** Screen-reader hint on a focused event in the time grid, describing its keyboard shortcuts. */
  eventKeyboardHint: string;
  /** Button that shows every row of the all-day lane. */
  expandAllDay: string;
  /** Accessible name of the calendar grid. */
  grid: string;
  /** Overflow button of a day or column with hidden events, e.g. `"+3 more"`. */
  moreEvents: (count: number) => string;
  /** Toolbar button that moves to the next day, week or month. */
  next: string;
  /** Toolbar button that moves to the previous day, week or month. */
  previous: string;
  /** Toolbar button that goes back to today. */
  today: string;
  /** Names of the views in the toolbar's view switcher. */
  views: Record<CalendarView, string>;
  /** Screen-reader name of a week row in the month view, e.g. `"Week 46"`. */
  weekNumber: (number: number) => string;
  /** Screen-reader header of the week-number column in the month view. */
  weekNumberHeader: string;
};

/** The English labels used for anything not passed in `labels`. */
export const DEFAULT_LABELS: CalendarLabels = {
  allDayEvents: (titles) => `All-day: ${titles.join(", ")}`,
  collapseAllDay: "Show fewer all-day events",
  eventKeyboardHint:
    "Alt plus arrows move it, Alt plus Shift plus up or down arrow changes its end.",
  expandAllDay: "Show all all-day events",
  grid: "Schedule",
  moreEvents: (count) => `+${count} more`,
  next: "Next",
  previous: "Previous",
  today: "Today",
  views: {
    day: "Day",
    month: "Month",
    week: "Week",
  },
  weekNumber: (number) => `Week ${number}`,
  weekNumberHeader: "Week",
};

/** Partial labels as accepted by the `labels` prop; `views` can be partial too. */
export type CalendarLabelsInput = Partial<Omit<CalendarLabels, "views">> & {
  views?: Partial<CalendarLabels["views"]>;
};

/** Fills in every label missing from `labels` with its English default. */
export const resolveLabels = (
  labels: CalendarLabelsInput | undefined,
): CalendarLabels => {
  if (labels === undefined) return DEFAULT_LABELS;
  const { views, ...rest } = labels;
  return {
    ...DEFAULT_LABELS,
    ...rest,
    views: {
      ...DEFAULT_LABELS.views,
      ...views,
    },
  };
};
