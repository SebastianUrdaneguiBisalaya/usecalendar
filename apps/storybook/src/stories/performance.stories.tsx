import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoCalendar } from "../support/demo-calendar";
import {
  DEMO_DATE,
  DEMO_SCROLL_TIME,
  stressEvents,
} from "../support/demo-events";

/**
 * Stress stories for checking frame rates by hand. The frame meter (toolbar, lightning icon) is on here: drag and
 * resize events, drag over empty slots, scroll the grid, switch views and watch FPS, the worst frame and long
 * frames. For the cause of a slow frame, record it in the DevTools Performance panel or the React DevTools Profiler.
 *
 * Automated budgets (no browser) live in each package's `tests/performance*` files; real frame rates are only checked here.
 */
const meta = {
  args: {
    defaultDate: DEMO_DATE,
    defaultView: "week",
    initialEvents: [],
    scrollToTime: DEMO_SCROLL_TIME,
  },
  component: DemoCalendar,
  globals: {
    frameMeter: "on",
  },
  parameters: {
    calendarGlobals: [
      "locale",
      "timeZone",
      "weekStart",
    ],
  },
  title: "Calendar/Performance",
} satisfies Meta<typeof DemoCalendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A week with 500 events: dozens overlapping per hour, plus a crowded all-day lane. */
export const WeekWith500Events: Story = {
  args: {
    initialEvents: stressEvents({
      count: 500,
    }),
  },
};

/** One day with 120 events between 9:00 and 13:00: many lanes per overlap group. */
export const DayWithHeavyOverlaps: Story = {
  args: {
    defaultView: "day",
    initialEvents: stressEvents({
      allDayShare: 0,
      count: 120,
      days: 1,
      firstDay: 0,
      hours: [
        9,
        13,
      ],
    }),
  },
};

/** A month with 2000 events: every day overflows into "+N more". */
export const MonthWith2000Events: Story = {
  args: {
    defaultView: "month",
    initialEvents: stressEvents({
      count: 2000,
      days: 42,
      firstDay: -16,
    }),
  },
};

/** A month with 300 multi-day bars crossing week rows. */
export const MonthWithMultiDayBars: Story = {
  args: {
    defaultView: "month",
    initialEvents: stressEvents({
      allDayShare: 1,
      count: 300,
      days: 42,
      firstDay: -16,
    }),
  },
};

/** The same 500-event week on a phone: narrow columns and horizontal scrolling. */
export const MobileWeekWith500Events: Story = {
  args: {
    height: 640,
    initialEvents: stressEvents({
      count: 500,
    }),
  },
  globals: {
    frameMeter: "on",
    viewport: {
      isRotated: false,
      value: "mobile1",
    },
  },
};
