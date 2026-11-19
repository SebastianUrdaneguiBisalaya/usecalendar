import type { CalendarEvent } from "@usecalendar/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarProvider } from "../../src/calendar/calendar-context.js";
import {
  type UseCalendarOptions,
  useCalendar,
} from "../../src/calendar/use-calendar.js";
import { EventChip } from "../../src/events/event-chip.js";
import { MonthView, type MonthViewProps } from "../../src/month/month-view.js";

const event = (
  id: string,
  startAt: string,
  endAt: string,
  extra: Partial<
    CalendarEvent<{
      n: number;
    }>
  > = {},
): CalendarEvent<{
  n: number;
}> => ({
  endAt,
  id,
  startAt,
  title: `Event ${id}`,
  ...extra,
});

function Month({
  options,
  ...props
}: MonthViewProps<{
  n: number;
}> & {
  options?: UseCalendarOptions;
}) {
  const calendar = useCalendar({
    date: Temporal.PlainDate.from("2026-11-18"),
    timeZone: "UTC",
    view: "month",
    ...options,
  });
  return (
    <CalendarProvider calendar={calendar}>
      <MonthView {...props} />
    </CalendarProvider>
  );
}

const render = (
  props: Partial<
    MonthViewProps<{
      n: number;
    }>
  > & {
    options?: UseCalendarOptions;
  } = {},
) =>
  renderToStaticMarkup(
    <Month
      events={[]}
      {...props}
    />,
  );

const count = (html: string, text: string) => html.split(text).length - 1;

describe("MonthView", () => {
  it("draws whole weeks from the week start as an ARIA grid", () => {
    const html = render();
    expect(html).toContain('role="grid"');
    expect(html).toContain('aria-label="Schedule"');
    // November 2026 from Monday: 2026-10-26 … 2026-12-06, six rows of seven days.
    expect(count(html, 'role="gridcell"')).toBe(42);
    expect(count(html, 'role="columnheader"')).toBe(7);
    expect(html).toContain('data-day="2026-10-26"');
    expect(html).toContain('data-day="2026-12-06"');
    expect(html.indexOf(">Mon<")).toBeLessThan(html.indexOf(">Sun<"));
  });

  it("marks the days of other months and uses a roving tab stop on the anchor date", () => {
    const html = render();
    expect(html).toMatch(/data-day="2026-10-26" data-outside="true"/);
    expect(html).not.toMatch(/data-day="2026-11-02" data-outside/);
    expect(count(html, 'tabindex="0"')).toBe(1);
    expect(html).toMatch(/data-day="2026-11-18"[^>]*tabindex="0"/);
    expect(html).toContain('aria-label="Wednesday, November 18, 2026"');
  });

  it("starts weeks on Sunday, hides weekends and shows week numbers when asked", () => {
    const sunday = render({
      options: {
        weekStart: "sunday",
      },
    });
    expect(sunday.indexOf(">Sun<")).toBeLessThan(sunday.indexOf(">Mon<"));

    const weekdays = render({
      options: {
        showWeekends: false,
        showWeekNumbers: true,
      },
    });
    expect(count(weekdays, 'role="gridcell"')).toBe(30);
    expect(weekdays).not.toContain(">Sat<");
    expect(count(weekdays, 'role="rowheader"')).toBe(6);
    expect(weekdays).toContain("Week 47");
    expect(weekdays).toContain("2rem repeat(5, minmax(0, 1fr))");
  });

  it("draws events as chips, multi-day ones as bars spanning their days", () => {
    const html = render({
      events: [
        event("timed", "2026-11-18T09:30:00Z", "2026-11-18T10:00:00Z", {
          color: "#6366f1",
        }),
        event("trip", "2026-11-19T00:00:00Z", "2026-11-25T00:00:00Z", {
          allDay: true,
        }),
      ],
    });
    expect(html).toContain("Event timed");
    expect(html).toContain("9:30 AM");
    expect(html).toContain("--uc-event-color:#6366f1");
    // The trip runs Thu 19 – Tue 24: Thu–Sun in one row, Mon–Tue in the next.
    expect(count(html, "Event trip</span>")).toBe(2);
    expect(html).toContain("width:57.14285714285714%");
    expect(html).toContain("data-continues-after");
    expect(html).toContain("data-continues-before");
    // Screen readers hear a day's events through its cell.
    expect(html).toContain(
      'aria-label="Thursday, November 19, 2026. Event trip"',
    );
  });

  it("collapses what doesn't fit into a '+N more' native popover listing every event of the day", () => {
    const html = render({
      events: [
        1,
        2,
        3,
      ].map((n) =>
        event(`e${n}`, `2026-11-18T0${n}:00:00Z`, `2026-11-18T0${n}:30:00Z`),
      ),
    });
    // Until measured, rows fit two lanes: one event and the "+2 more" button.
    expect(html).toContain("+2 more");
    expect(html).toMatch(/popovertarget="([^"]+)"/i);
    const id = html.match(/popovertarget="([^"]+)"/i)?.[1];
    expect(html).toContain(`id="${id}" popover="auto"`);
    expect(html).toContain(`anchor-name:--${id}`);
    expect(html).toContain(`position-anchor:--${id}`);
    expect(id).toMatch(/^[\w-]+$/);
    // One event in the grid, all three in the popover.
    expect(count(html, "Event e1</span>")).toBe(2);
    expect(count(html, "Event e3</span>")).toBe(1);
    expect(html).toContain("Wednesday, November 18, 2026</div>");
  });

  it("lets renderEvent, renderEventWrapper and renderMorePopover replace the defaults", () => {
    const events = [
      1,
      2,
      3,
    ].map((n) =>
      event(`e${n}`, `2026-11-18T0${n}:00:00Z`, `2026-11-18T0${n}:30:00Z`),
    );
    const html = render({
      events,
      renderEvent: (chip, placement) => (
        <EventChip
          {...chip}
          className={`custom-${placement}`}
        />
      ),
      renderEventWrapper: ({ children, event }) => (
        <span data-menu={event.id}>{children}</span>
      ),
      renderMorePopover: ({ events, hiddenCount, label }) => (
        <details data-hidden={hiddenCount}>
          <summary>{label}</summary>
          {events.map((event) => event.id).join(",")}
        </details>
      ),
    });
    expect(html).toContain("custom-grid");
    expect(html).toContain('data-menu="e1"');
    expect(html).toContain(
      '<details data-hidden="2"><summary>+2 more</summary>e1,e2,e3',
    );
    expect(html).not.toContain("popover=");
  });

  it("uses the theme tokens and merges className and classNames so they win", () => {
    const html = render({
      className: "h-96",
      classNames: {
        cell: "border-l-2",
        dayNumber: "text-sm",
        outside: "opacity-50",
      },
    });
    expect(html).toContain("h-96");
    expect(html).not.toContain("h-full");
    expect(html).toContain("border-l-2");
    expect(html).toContain("text-sm");
    expect(html).toMatch(/opacity-50[^>]*data-day="2026-10-26"/);
    expect(html).not.toMatch(/opacity-50[^>]*data-day="2026-11-02"/);
    expect(html).not.toMatch(/\b(bg|text|border)-(white|black|zinc|gray)/);
    expect(html).not.toContain("dark:");
  });

  it("renders an empty grid on the server while the date is unknown", () => {
    const html = render({
      options: {
        date: undefined,
      },
    });
    expect(html).toContain('role="grid"');
    expect(html).not.toContain("gridcell");
  });
});
