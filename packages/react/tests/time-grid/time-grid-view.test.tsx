import type { CalendarEvent } from "@usecalendar/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarProvider } from "../../src/calendar/calendar-context.js";
import {
  type UseCalendarOptions,
  useCalendar,
} from "../../src/calendar/use-calendar.js";
import { EventBlock } from "../../src/events/event-block.js";
import { EventChip } from "../../src/events/event-chip.js";
import {
  TimeGridView,
  type TimeGridViewProps,
} from "../../src/time-grid/time-grid-view.js";

type Props = Partial<TimeGridViewProps> & {
  options?: UseCalendarOptions;
};

function Grid({ options, ...props }: Props) {
  const calendar = useCalendar({
    date: Temporal.PlainDate.from("2030-01-16"),
    timeZone: "UTC",
    view: "week",
    ...options,
  });
  return (
    <CalendarProvider calendar={calendar}>
      <TimeGridView
        events={[]}
        {...props}
      />
    </CalendarProvider>
  );
}

const render = (props: Props = {}) => renderToStaticMarkup(<Grid {...props} />);
const count = (html: string, text: string) => html.split(text).length - 1;

const event = (
  id: string,
  startAt: string,
  endAt: string,
  extra: Partial<CalendarEvent> = {},
): CalendarEvent => ({
  endAt,
  id,
  startAt,
  title: `Event ${id}`,
  ...extra,
});

describe("TimeGridView", () => {
  it("draws the week as an ARIA grid with an hour gutter and 30-minute slots", () => {
    const html = render();
    expect(html).toContain('role="grid"');
    expect(html).toContain('aria-label="Schedule"');
    expect(html).toContain('aria-rowcount="49"');
    expect(html).toContain('aria-colcount="8"');
    expect(count(html, 'role="gridcell"')).toBe(7 * 48);
    expect(count(html, 'role="columnheader"')).toBe(8);
    expect(count(html, 'role="rowheader"')).toBe(48);
    expect(html).toContain("9:00 AM");
    // Half hours are labeled for screen readers only.
    expect(html).toContain('<span class="sr-only">9:30 AM</span>');
    expect(html).toMatch(
      /aria-label="Wednesday, January 16, 2030, 9:00\s–\s9:30\sAM"/,
    );
    expect(html.indexOf(">Mon<")).toBeLessThan(html.indexOf(">Sun<"));
  });

  it("shows one day in the day view and skips weekends when asked", () => {
    expect(
      count(
        render({
          options: {
            view: "day",
          },
        }),
        'role="gridcell"',
      ),
    ).toBe(48);
    const weekdays = render({
      options: {
        showWeekends: false,
      },
    });
    expect(count(weekdays, 'role="gridcell"')).toBe(5 * 48);
    expect(weekdays).not.toContain(">Sat<");
  });

  it("splits hours into slotMinutes rows without changing the hour height", () => {
    const html = render({
      slotMinutes: 15,
    });
    expect(count(html, 'role="gridcell"')).toBe(7 * 96);
    expect(html).toContain("--uc-time-grid-hour:3rem");
    expect(html).toContain("repeat(96, calc(var(--uc-time-grid-hour) * 0.25))");
  });

  it("scales the hour with hourHeight", () => {
    expect(
      render({
        hourHeight: 4,
      }),
    ).toContain("--uc-time-grid-hour:4rem");
    expect(
      render({
        hourHeight: "64px",
      }),
    ).toContain("--uc-time-grid-hour:64px");
  });

  it("sizes short events by height, so they read the same at any hourHeight", () => {
    const half = [
      event("a", "2030-01-16T09:00:00Z", "2030-01-16T09:30:00Z"),
    ];
    // 30 minutes is 1.5rem at the default 3rem per hour: one line.
    expect(
      render({
        events: half,
      }),
    ).toContain("flex-row items-baseline");
    // At 6rem per hour it is 3rem tall: room for title and time on two lines.
    const tall = render({
      events: half,
      hourHeight: 6,
    });
    expect(tall).not.toContain("flex-row items-baseline");
    expect(tall).toContain("flex-col");

    // A 5-minute event is drawn 0.75rem tall: 15 minutes at 3rem per hour, 30 minutes at 1.5rem per hour.
    const short = [
      event("b", "2030-01-16T09:00:00Z", "2030-01-16T09:05:00Z"),
    ];
    expect(
      render({
        events: short,
      }),
    ).toContain("height:calc(var(--uc-time-grid-hour) * 0.25)");
    expect(
      render({
        events: short,
        hourHeight: "1.5rem",
      }),
    ).toContain("height:calc(var(--uc-time-grid-hour) * 0.5)");
  });

  it("uses the default event sizes for CSS lengths until the grid is measured", () => {
    const html = render({
      events: [
        event("b", "2030-01-16T09:00:00Z", "2030-01-16T09:05:00Z"),
      ],
      hourHeight: "24px",
    });
    expect(html).toContain("height:calc(var(--uc-time-grid-hour) * 0.25)");
  });

  it("places timed events by time, side by side when they overlap", () => {
    const html = render({
      events: [
        event("a", "2030-01-16T09:00:00Z", "2030-01-16T10:00:00Z"),
        event("b", "2030-01-16T09:30:00Z", "2030-01-16T11:00:00Z", {
          status: "tentative",
        }),
      ],
    });
    // Wednesday is the third column; 9:00 is nine hours down.
    expect(html).toContain(
      "top:calc(var(--uc-time-grid-header) + var(--uc-time-grid-hour) * 9)",
    );
    expect(html).toContain("height:calc(var(--uc-time-grid-hour) * 1)");
    expect(html).toContain("* 2)");
    expect(html).toContain("* 2.5)");
    expect(html).toContain(
      "width:calc((100% - var(--uc-time-grid-gutter)) / 7 / 2)",
    );
    expect(html).toMatch(/aria-label="Event a, 9:00\s–\s10:00\sAM"/);
    expect(html).toMatch(/aria-label="Event b, 9:30\s–\s11:00\sAM, Tentative"/);
    expect(html).toContain('data-variant="block"');
    expect(html).toContain("data-tentative");
  });

  it("draws all-day and day-long events in the all-day lane, read from the day headers", () => {
    const html = render({
      events: [
        event("trip", "2030-01-15T00:00:00Z", "2030-01-17T00:00:00Z", {
          allDay: true,
        }),
        event("long", "2030-01-18T08:00:00Z", "2030-01-19T09:00:00Z"),
      ],
    });
    expect(html).toContain(
      'aria-label="Tuesday, January 15, 2030. All-day: Event trip"',
    );
    expect(html).toContain('data-variant="bar"');
    expect(html).not.toContain('aria-label="Event long');
    expect(html).toContain("Event long</span>");
  });

  it("collapses the all-day lane to two rows with '+N more', controlled or not", () => {
    const allDay = [
      1,
      2,
      3,
    ].map((n) =>
      event(`d${n}`, "2030-01-16T00:00:00Z", "2030-01-17T00:00:00Z", {
        allDay: true,
      }),
    );
    const expanded = render({
      events: allDay,
    });
    expect(expanded).toContain('aria-label="Show fewer all-day events"');
    expect(expanded).toContain('aria-expanded="true"');
    expect(expanded).not.toContain("+");

    for (const props of [
      {
        defaultAllDayCollapsed: true,
      },
      {
        allDayCollapsed: true,
      },
    ]) {
      const collapsed = render({
        events: allDay,
        ...props,
      });
      expect(collapsed).toContain('aria-label="Show all all-day events"');
      expect(collapsed).toContain("+2 more");
    }
  });

  it("offers dragging and keyboard editing only when events are editable", () => {
    const events = [
      event("a", "2030-01-16T09:00:00Z", "2030-01-16T10:00:00Z"),
    ];
    const handle = "data-uc-resize-handle";

    const readOnly = render({
      events,
    });
    expect(readOnly).not.toContain(handle);
    expect(readOnly).not.toContain("aria-keyshortcuts");

    const editable = render({
      events,
      onEventChange: () => {},
    });
    expect(editable).toContain(handle);
    expect(editable).toContain(
      'aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Alt+Shift+ArrowUp Alt+Shift+ArrowDown"',
    );
    expect(editable).toContain("aria-description=");

    for (const props of [
      {
        editable: false,
      },
      {
        isEventEditable: () => false,
      },
    ])
      expect(
        render({
          events,
          onEventChange: () => {},
          ...props,
        }),
      ).not.toContain(handle);
  });

  it("previews a draft range and marks the selected event", () => {
    const html = render({
      draftRange: {
        endAt: "2030-01-14T11:00:00Z",
        startAt: "2030-01-14T10:00:00Z",
      },
      events: [
        event("a", "2030-01-16T09:00:00Z", "2030-01-16T10:00:00Z"),
      ],
      selectedEventId: "a",
    });
    expect(count(html, "data-uc-ghost")).toBe(1);
    expect(html).toContain('aria-pressed="true"');
    // Without a selection to track, events aren't toggle buttons.
    expect(
      render({
        events: [
          event("a", "2030-01-16T09:00:00Z", "2030-01-16T10:00:00Z"),
        ],
      }),
    ).not.toContain("aria-pressed");
  });

  it("lets renderEvent, renderAllDayEvent and renderEventWrapper replace the defaults", () => {
    const html = render({
      events: [
        event("a", "2030-01-16T09:00:00Z", "2030-01-16T10:00:00Z"),
        event("d", "2030-01-16T00:00:00Z", "2030-01-17T00:00:00Z", {
          allDay: true,
        }),
      ],
      renderAllDayEvent: (chip) => (
        <EventChip
          {...chip}
          className="custom-all-day"
        />
      ),
      renderEvent: (block) => (
        <EventBlock
          {...block}
          className="custom-block"
        />
      ),
      renderEventWrapper: ({ children, event }) => (
        <span data-menu={event.id}>{children}</span>
      ),
    });
    expect(html).toContain("custom-all-day");
    expect(html).toContain("custom-block");
    expect(html).toContain('data-menu="a"');
    expect(html).toContain('data-menu="d"');
  });

  it("uses the theme tokens and merges className and classNames so they win", () => {
    const html = render({
      className: "h-[40rem]",
      classNames: {
        hour: "text-xs",
        slot: "border-l-2",
      },
    });
    expect(html).toContain("h-[40rem]");
    expect(html).not.toContain("h-full");
    expect(html).toContain("border-l-2");
    expect(html).not.toContain("text-[0.7rem]");
    expect(html).not.toMatch(/\b(bg|text|border)-(white|black|zinc|gray|red)/);
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

describe("EventBlock", () => {
  const look = {
    past: false,
    tentative: false,
  };
  const base = event("a", "2030-01-16T09:00:00Z", "2030-01-16T10:00:00Z", {
    color: "#6366f1",
  });

  it("draws a tinted block with the title and time, stacked or side by side", () => {
    const html = renderToStaticMarkup(
      <EventBlock
        event={base}
        look={look}
        time="9:00 – 10:00 AM"
      />,
    );
    expect(html).toContain('data-variant="block"');
    expect(html).toContain("--uc-event-color:#6366f1");
    expect(html).toContain("flex-col");
    expect(html).toContain("9:00 – 10:00 AM");
    expect(
      renderToStaticMarkup(
        <EventBlock
          compact
          event={base}
          look={look}
        />,
      ),
    ).toContain("flex-row");
  });

  it("squares the corners where the event continues and mutes past events", () => {
    const html = renderToStaticMarkup(
      <EventBlock
        continuesAfter
        continuesBefore
        event={base}
        look={{
          past: true,
          tentative: false,
        }}
      />,
    );
    expect(html).toContain("rounded-t-none");
    expect(html).toContain("rounded-b-none");
    expect(html).toContain("data-past");
    expect(html).toContain("text-uc-muted-foreground");
    expect(html).not.toMatch(/style="[^"]*background/);
  });

  const utcName =
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date(0))
      .find((part) => part.type === "timeZoneName")?.value ?? "UTC";

  it("adds an hour column per secondary time zone, named in its header", () => {
    const html = render({
      secondaryTimeZones: [
        {
          timeZone: "America/Lima",
        },
        {
          label: "IST",
          timeZone: "Asia/Kolkata",
        },
      ],
    });
    expect(html).toContain('aria-colcount="10"');
    expect(html).toContain(">GMT-5<");
    expect(html).toContain(">IST<");
    // The calendar's own column is named too. ICU versions name UTC "GMT" or "GMT+0", so ask Intl.
    expect(html).toContain(`>${utcName}<`);
    expect(count(html, 'role="rowheader"')).toBe(3 * 48);
    // Midnight UTC is 7 PM in Lima and 5:30 AM in Kolkata: half-hour offsets keep their minutes.
    expect(html).toContain(">7:00 PM<");
    expect(html).toContain(">5:30 AM<");
    expect(html).toContain("left:8rem");
    expect(html).toContain("--uc-time-grid-gutter:12rem");
  });

  it("shows a second, smaller line under the label, read as one text", () => {
    const html = render({
      classNames: {
        timeZoneName: "my-zone",
      },
      secondaryTimeZones: [
        {
          description: "GMT-5",
          label: "Perú",
          timeZone: "America/Lima",
        },
      ],
      timeZoneLabel: {
        description: "GMT+0",
        label: "Reino Unido",
      },
    });
    expect(html).toMatch(/>Perú<\/span><span class="sr-only">, <\/span>/);
    expect(html).toContain(">GMT-5<");
    expect(html).toContain(">Reino Unido<");
    expect(html).toContain(">GMT+0<");
    expect(count(html, "my-zone")).toBe(2);
  });

  it("keeps one line without a description", () => {
    const html = render({
      secondaryTimeZones: [
        {
          label: "Perú",
          timeZone: "America/Lima",
        },
      ],
    });
    expect(html).toContain(">Perú<");
    expect(html).not.toContain('sr-only">, <');
  });

  it("truncates both lines so the header keeps its height", () => {
    const html = render({
      secondaryTimeZones: [
        {
          description: "A very long description that does not fit",
          label: "A very long label that does not fit",
          timeZone: "America/Lima",
        },
      ],
    });
    // Both lines, plus the calendar's own one-line header.
    expect(count(html, "block max-w-full truncate")).toBe(3);
    expect(html).toContain("overflow-hidden");
    expect(html).toContain("height:3rem");
  });

  it("leaves the gutter alone without secondary time zones", () => {
    const html = render();
    expect(html).not.toContain(`>${utcName}<`);
    expect(html).toContain("--uc-time-grid-gutter:4rem");
  });

  it("marks and mutes the slots outside the working hours", () => {
    const html = render({
      classNames: {
        offHours: "my-off",
      },
      workingHours: {
        days: [
          1,
          2,
          3,
          4,
          5,
        ],
        end: Temporal.PlainTime.from("17:00"),
        start: Temporal.PlainTime.from("09:00"),
      },
    });
    // Weekdays work 16 of 48 slots; the weekend has none.
    expect(count(html, "data-off-hours")).toBe(5 * 32 + 2 * 48);
    expect(count(html, "my-off")).toBe(5 * 32 + 2 * 48);
    expect(html).toContain("bg-uc-muted/60");
  });

  it("marks no slot without working hours", () => {
    expect(render()).not.toContain("data-off-hours");
  });
});
