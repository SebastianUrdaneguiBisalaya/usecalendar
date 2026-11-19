import { CALENDAR_VIEWS, type CalendarView } from "@usecalendar/core";
import { useCalendarLocale } from "../locale/locale-context.js";
import { Chevron } from "../utils/chevron.js";
import { cn } from "../utils/cn.js";
import { useCalendarContext } from "./calendar-context.js";

/** Class names for each part of a {@link CalendarToolbar}, merged after the defaults so they win. */
export type CalendarToolbarClassNames = {
  /** The group of today / previous / next buttons. */
  navigation?: string | undefined;
  /** The next-period button. */
  next?: string | undefined;
  /** The previous-period button. */
  previous?: string | undefined;
  /** The outer element. */
  root?: string | undefined;
  /** The month and year of the shown period. */
  title?: string | undefined;
  /** The today button. */
  today?: string | undefined;
  /** A button of the view switcher. The current one has `aria-pressed="true"`. */
  view?: string | undefined;
  /** The view switcher. */
  views?: string | undefined;
};

/** Props of {@link CalendarToolbar}. */
export type CalendarToolbarProps = {
  /** Extra classes for the root element, merged after the defaults. */
  className?: string | undefined;
  /** Extra classes per part. */
  classNames?: CalendarToolbarClassNames | undefined;
  /**
   * The views offered by the view switcher, in order. An empty list hides the switcher.
   *
   * @defaultValue `["day", "week", "month"]`
   */
  views?: readonly CalendarView[] | undefined;
};

const BUTTON =
  "m-0 inline-flex h-8 cursor-pointer items-center justify-center rounded-uc border-0 bg-transparent font-medium text-sm text-uc-foreground outline-none hover:bg-uc-accent hover:text-uc-accent-foreground focus-visible:ring-2 focus-visible:ring-uc-ring";

/**
 * The calendar's header: today, previous and next buttons, the shown month and year, and a view switcher. Labels
 * come from `labels` and the title from `formatters.monthYear`.
 *
 * It responds to its own width (a CSS size container), not the viewport: when it's narrower than 36rem the view
 * switcher moves to a second row with equal-width buttons, and the title truncates instead of pushing the buttons.
 *
 * `<Calendar>` renders it unless `toolbar={false}`; render it yourself anywhere inside a `CalendarProvider` (or as
 * `<Calendar toolbar={…}>`) to place or restyle it.
 *
 * @example
 * <CalendarToolbar views={["week", "month"]} classNames={{ title: "text-lg" }} />
 */
export function CalendarToolbar({
  className,
  classNames,
  views = CALENDAR_VIEWS,
}: CalendarToolbarProps) {
  const { date, goToNext, goToPrevious, goToToday, setView, timeZone, view } =
    useCalendarContext();
  const { formatters, labels, locale, timeFormat } = useCalendarLocale();

  return (
    <div
      className={cn(
        // A size container, so the layout follows the toolbar's own width (a narrow sidebar too), not the viewport.
        // `box-border` keeps `w-full` plus padding inside the parent without Tailwind's preflight.
        "@container box-border flex w-full flex-wrap items-center gap-x-3 gap-y-2 border-uc-border border-b bg-uc-background px-3 py-2 text-uc-foreground",
        classNames?.root,
        className,
      )}
    >
      {/* Sized by its content (not `flex-1`'s zero basis), so the view switcher wraps instead of overlapping it. */}
      <div className="flex min-w-0 flex-[1_1_auto] items-center gap-2">
        <nav
          aria-label={labels.navigation}
          className={cn(
            "flex shrink-0 items-center gap-1",
            classNames?.navigation,
          )}
        >
          <button
            className={cn(
              BUTTON,
              "border border-uc-border border-solid px-3",
              classNames?.today,
            )}
            onClick={goToToday}
            type="button"
          >
            {labels.today}
          </button>
          <button
            aria-label={labels.previous}
            className={cn(BUTTON, "size-8 p-0", classNames?.previous)}
            onClick={goToPrevious}
            title={labels.previous}
            type="button"
          >
            <Chevron direction="left" />
          </button>
          <button
            aria-label={labels.next}
            className={cn(BUTTON, "size-8 p-0", classNames?.next)}
            onClick={goToNext}
            title={labels.next}
            type="button"
          >
            <Chevron direction="right" />
          </button>
        </nav>
        <div
          aria-live="polite"
          className={cn(
            "min-w-0 truncate font-semibold text-xl first-letter:uppercase @max-md:text-lg",
            classNames?.title,
          )}
        >
          {date !== null &&
            formatters.monthYear(date, {
              locale,
              timeFormat,
              timeZone,
            })}
        </div>
      </div>
      {views.length > 0 && (
        // biome-ignore lint/a11y/useSemanticElements: a toggle-button group, not a form fieldset.
        <div
          aria-label={labels.viewSwitcher}
          className={cn(
            // Under 36rem it takes its own row, with equal-width buttons.
            "box-border inline-flex items-center rounded-uc border border-uc-border border-solid p-0.5 @max-xl:w-full",
            classNames?.views,
          )}
          role="group"
        >
          {views.map((option) => (
            <button
              aria-pressed={option === view}
              className={cn(
                BUTTON,
                "h-7 px-3 aria-pressed:bg-uc-accent aria-pressed:text-uc-accent-foreground @max-xl:flex-1",
                classNames?.view,
              )}
              key={option}
              onClick={() => setView(option)}
              type="button"
            >
              {labels.views[option]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
