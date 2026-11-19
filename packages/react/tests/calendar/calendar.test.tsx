import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Calendar, type CalendarProps } from "../../src/calendar/calendar.js";
import { CalendarProvider } from "../../src/calendar/calendar-context.js";
import { CalendarToolbar } from "../../src/calendar/calendar-toolbar.js";
import { useCalendar } from "../../src/calendar/use-calendar.js";

const date = Temporal.PlainDate.from("2030-01-16");
const render = (props: Partial<CalendarProps> = {}) =>
  renderToStaticMarkup(
    <Calendar
      date={date}
      events={[]}
      timeZone="UTC"
      {...props}
    />,
  );
const count = (html: string, text: string) => html.split(text).length - 1;

describe("Calendar", () => {
  it("shows the week view with a toolbar by default", () => {
    const html = render();
    expect(html).toContain('data-view="week"');
    expect(count(html, 'role="gridcell"')).toBe(7 * 48);
    expect(html).toContain('aria-label="Calendar navigation"');
    expect(html).toContain(">Today</button>");
    expect(html).toContain("January 2030");
    expect(html).toMatch(/aria-pressed="true"[^>]*>Week</);
  });

  it("switches by view: month, day, and the week without weekends", () => {
    expect(
      count(
        render({
          view: "month",
        }),
        'role="gridcell"',
      ),
    ).toBe(35);
    expect(
      count(
        render({
          defaultView: "day",
        }),
        'role="gridcell"',
      ),
    ).toBe(48);
    expect(
      count(
        render({
          showWeekends: false,
        }),
        'role="gridcell"',
      ),
    ).toBe(5 * 48);
    // The day view always shows its day, even a weekend one.
    expect(
      count(
        render({
          date: Temporal.PlainDate.from("2030-01-19"),
          showWeekends: false,
          view: "day",
        }),
        'role="gridcell"',
      ),
    ).toBe(48);
  });

  it("forwards events, locale and view props to the current view", () => {
    const html = render({
      events: [
        {
          endAt: "2030-01-16T10:00:00Z",
          id: "a",
          startAt: "2030-01-16T09:00:00Z",
          title: "Standup",
        },
      ],
      labels: {
        today: "Hoy",
        views: {
          week: "Semana",
        },
      },
      locale: "es-ES",
      slotMinutes: 60,
      view: "week",
    });
    expect(html).toContain("Standup");
    expect(html).toContain(">Hoy</button>");
    expect(html).toContain(">Semana</button>");
    expect(html).toContain("enero de 2030");
    expect(count(html, 'role="gridcell"')).toBe(7 * 24);
    expect(html).toMatch(/>0?9:00</);
  });

  it("replaces or removes the toolbar", () => {
    const none = render({
      toolbar: false,
    });
    expect(none).not.toContain("Calendar navigation");
    const custom = render({
      toolbar: (calendar) => <p>Custom {calendar.view}</p>,
    });
    expect(custom).toContain("<p>Custom week</p>");
    expect(custom).not.toContain("Calendar navigation");
  });

  it("puts className, classNames and style on the root and each part", () => {
    const html = render({
      className: "h-[30rem]",
      classNames: {
        timeGrid: {
          slot: "border-l-2",
        },
        toolbar: {
          title: "text-lg",
        },
        view: "p-2",
      },
      style: {
        "--uc-primary": "#7c3aed",
      } as React.CSSProperties,
    });
    expect(html).toMatch(/class="[^"]*h-\[30rem\][^"]*" data-uc-calendar/);
    expect(html).not.toMatch(/class="[^"]*h-full[^"]*" data-uc-calendar/);
    expect(html).toContain("--uc-primary:#7c3aed");
    expect(html).toContain("border-l-2");
    expect(html).toContain("text-lg");
    expect(html).toContain('class="min-h-0 flex-1 p-2"');
  });

  it("can be driven by state from useCalendar", () => {
    function Shared() {
      const calendar = useCalendar({
        date,
        timeZone: "UTC",
        view: "month",
      });
      return (
        <Calendar
          calendar={calendar}
          events={[]}
          view="day"
        />
      );
    }
    const html = renderToStaticMarkup(<Shared />);
    expect(html).toContain('data-view="month"');
  });
});

describe("CalendarToolbar", () => {
  it("offers only the given views, or no switcher", () => {
    function Toolbar({ views }: { views: ("day" | "month" | "week")[] }) {
      const calendar = useCalendar({
        date,
        timeZone: "UTC",
      });
      return (
        <CalendarProvider calendar={calendar}>
          <CalendarToolbar views={views} />
        </CalendarProvider>
      );
    }
    const two = renderToStaticMarkup(
      <Toolbar
        views={[
          "week",
          "month",
        ]}
      />,
    );
    expect(two).toContain(">Week</button>");
    expect(two).not.toContain(">Day</button>");
    expect(renderToStaticMarkup(<Toolbar views={[]} />)).not.toContain(
      'role="group"',
    );
  });
});
