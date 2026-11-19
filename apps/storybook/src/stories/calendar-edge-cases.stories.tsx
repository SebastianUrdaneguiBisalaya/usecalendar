import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CalendarView } from "@usecalendar/core";
import { CalendarToolbar } from "@usecalendar/react";
import { type ComponentProps, useEffect, useState } from "react";
import { DemoCalendar } from "../support/demo-calendar";
import {
  allDay,
  COLORS,
  DEMO_DATE,
  DEMO_SCROLL_TIME,
  type DemoEvent,
  demoDay,
  timed,
  weekEvents,
} from "../support/demo-events";

const meta = {
  args: {
    defaultDate: DEMO_DATE,
    defaultView: "week",
    initialEvents: weekEvents(),
    scrollToTime: DEMO_SCROLL_TIME,
  },
  component: DemoCalendar,
  parameters: {
    calendarGlobals: [
      "locale",
      "timeZone",
      "weekStart",
    ],
  },
  title: "Calendar/Edge cases",
} satisfies Meta<typeof DemoCalendar>;

export default meta;

type Story = StoryObj<typeof meta>;

const overlapping: DemoEvent[] = [
  timed("a", "Overlap A", DEMO_DATE, "09:00", 120),
  timed("b", "Overlap B", DEMO_DATE, "09:30", 60, {
    color: COLORS.rose,
  }),
  timed("c", "Overlap C", DEMO_DATE, "10:00", 90, {
    color: COLORS.amber,
  }),
  timed("d", "Same start D", DEMO_DATE, "09:00", 30, {
    color: COLORS.sky,
  }),
  timed("e", "Back-to-back", DEMO_DATE, "11:30", 30, {
    color: COLORS.emerald,
  }),
  timed("f", "Back-to-back", DEMO_DATE, "12:00", 30, {
    color: COLORS.violet,
  }),
  timed("g", "Five minutes", DEMO_DATE, "13:00", 5),
  timed("h", "Fifteen minutes", DEMO_DATE, "13:30", 15, {
    color: COLORS.rose,
  }),
];

/** Overlapping events share the column; back-to-back events don't; very short events stay readable. */
export const Overlapping: Story = {
  args: {
    defaultView: "day",
    initialEvents: overlapping,
  },
};

/** The same overlaps in the week view, where columns are narrow. */
export const OverlappingInWeek: Story = {
  args: {
    initialEvents: overlapping,
  },
};

const multiDay: DemoEvent[] = [
  allDay("one", "One day", demoDay(0)),
  allDay("two", "Two days", demoDay(-1), 2, {
    color: COLORS.violet,
  }),
  allDay("week", "Crosses the week boundary", demoDay(3), 6, {
    color: COLORS.amber,
  }),
  allDay("long", "Conference (two weeks)", demoDay(-9), 14, {
    color: COLORS.rose,
  }),
  allDay("tentative", "Maybe: team trip", demoDay(1), 2, {
    status: "tentative",
  }),
  timed("timed-multi", "Timed, spans two days", demoDay(-2), "20:00", 26 * 60, {
    color: COLORS.sky,
  }),
  ...weekEvents(),
];

/** All-day and multi-day events in the week view: the all-day lane, its collapse toggle and "+N more". */
export const MultiDayAndAllDay: Story = {
  args: {
    initialEvents: multiDay,
  },
};

/** The same events in the month view: bars span days and break at week rows. */
export const MultiDayInMonth: Story = {
  args: {
    defaultView: "month",
    initialEvents: multiDay,
  },
};

const PALETTE = Object.values(COLORS);

const busyDay: DemoEvent[] = Array.from(
  {
    length: 8,
  },
  (_, index) =>
    timed(
      `busy-${index}`,
      `Meeting ${index + 1}`,
      DEMO_DATE,
      `${String(8 + index).padStart(2, "0")}:00`,
      45,
      {
        color: PALETTE[index % PALETTE.length] ?? COLORS.indigo,
      },
    ),
);

/** A day with more events than fit: the "+N more" button opens a popover (native Popover API) with all of them. */
export const MoreEventsPopover: Story = {
  args: {
    defaultView: "month",
    initialEvents: [
      ...busyDay,
      allDay("busy-all-day", "All-day too", DEMO_DATE),
      ...weekEvents(),
    ],
  },
};

const today = Temporal.Now.plainDateISO();

/**
 * Past (muted) and tentative (striped) events around the **real** today, so the current-time line, past events
 * and upcoming ones show together. The only stories that follow the clock are this one and `CurrentTime`.
 */
export const TentativeAndPast: Story = {
  args: {
    defaultDate: today,
    initialEvents: [
      timed("past", "Past", demoDay(-1, today), "10:00", 60),
      timed(
        "past-tentative",
        "Past, tentative",
        demoDay(-1, today),
        "12:00",
        60,
        {
          status: "tentative",
        },
      ),
      timed("upcoming", "Upcoming", demoDay(1, today), "10:00", 60),
      timed(
        "upcoming-tentative",
        "Upcoming, tentative",
        demoDay(1, today),
        "12:00",
        60,
        {
          color: COLORS.rose,
          status: "tentative",
        },
      ),
      allDay("past-all-day", "Past all-day", demoDay(-1, today)),
      allDay("tentative-all-day", "Tentative all-day", demoDay(1, today), 1, {
        status: "tentative",
      }),
    ],
    scrollToTime: undefined,
  },
};

/** The same around today in the month view. */
export const TentativeAndPastInMonth: Story = {
  args: {
    ...TentativeAndPast.args,
    defaultView: "month",
  },
};

/** Today's week with the current-time line (real clock), scrolled to the current hour by default. */
export const CurrentTime: Story = {
  args: {
    defaultDate: today,
    initialEvents: weekEvents(today),
    scrollToTime: undefined,
  },
};

/** Events crossing midnight are split per day, with squared corners where they continue. */
export const CrossingMidnight: Story = {
  args: {
    initialEvents: [
      timed("night", "Night shift", demoDay(-1), "22:00", 4 * 60, {
        color: COLORS.violet,
      }),
      timed("flight", "Overnight flight", demoDay(1), "23:30", 9 * 60, {
        color: COLORS.sky,
      }),
      timed("to-midnight", "Ends at midnight", DEMO_DATE, "22:00", 120, {
        color: COLORS.rose,
      }),
    ],
    scrollToTime: Temporal.PlainTime.from("20:00"),
  },
};

/** `showWeekends={false}`: five-day weeks in the week and month views. */
export const WithoutWeekends: Story = {
  args: {
    showWeekends: false,
  },
};

/** `showWeekends={false}` in the month view. */
export const WithoutWeekendsInMonth: Story = {
  args: {
    defaultView: "month",
    showWeekends: false,
  },
};

/** `showWeekNumbers` in the month view. */
export const WeekNumbers: Story = {
  args: {
    defaultView: "month",
    showWeekNumbers: true,
  },
};

/** `slotMinutes={15}` and `snapMinutes={5}`: finer rows and drags that snap every 5 minutes. */
export const FineSlots: Story = {
  args: {
    slotMinutes: 15,
    snapMinutes: 5,
  },
};

/** `slotMinutes={60}` and `snapMinutes={30}`. */
export const CoarseSlots: Story = {
  args: {
    defaultEventDuration: 60,
    slotMinutes: 60,
    snapMinutes: 30,
  },
};

/** `hourHeight={1.75}`: a dense grid that fits a working day on screen. */
export const DenseHours: Story = {
  args: {
    hourHeight: 1.75,
  },
};

/** `hourHeight="96px"` with `slotMinutes={15}`: a roomy grid for reading short events. */
export const TallHours: Story = {
  args: {
    hourHeight: "96px",
    slotMinutes: 15,
  },
};

const mobile = {
  viewport: {
    isRotated: false,
    value: "mobile1",
  },
};

/**
 * A phone, the way the README's "Small screens" recipe sets it up: the app picks the day view after mounting and
 * offers only day and month. The toolbar puts the view switcher on its own row.
 */
export const Mobile: Story = {
  args: {
    height: 640,
  },
  globals: mobile,
  render: (args) => <ResponsiveDemo {...args} />,
};

/** The week view on a phone: seven narrow columns, and the toolbar on two rows. */
export const MobileWeek: Story = {
  args: {
    height: 640,
  },
  globals: mobile,
};

/** The month view on a phone. */
export const MobileMonth: Story = {
  args: {
    defaultView: "month",
    height: 640,
  },
  globals: mobile,
};

/**
 * The README's "Small screens" recipe: day view and only day/month under 640px, week view otherwise. Resize the
 * canvas or switch the viewport (reload the story to re-run the initial pick).
 */
export const ResponsiveRecipe: Story = {
  render: (args) => <ResponsiveDemo {...args} />,
};

/** No events at all. */
export const Empty: Story = {
  args: {
    initialEvents: [],
  },
};

/** The README's "Small screens" recipe around `DemoCalendar`. */
function ResponsiveDemo(props: ComponentProps<typeof DemoCalendar>) {
  const [view, setView] = useState<CalendarView>("week");
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    setIsSmall(query.matches);
    if (query.matches) setView("day");
    const onChange = () => setIsSmall(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <DemoCalendar
      {...props}
      defaultView={undefined}
      onViewChange={setView}
      toolbar={() => (
        <CalendarToolbar
          views={
            isSmall
              ? [
                  "day",
                  "month",
                ]
              : [
                  "day",
                  "week",
                  "month",
                ]
          }
        />
      )}
      view={view}
    />
  );
}
