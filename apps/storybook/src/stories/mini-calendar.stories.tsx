import type { Meta, StoryObj } from "@storybook/react-vite";
import { itemDays } from "@usecalendar/core";
import { useCalendar } from "@usecalendar/react";
import { MiniCalendar } from "@usecalendar/react/mini";
import { useState } from "react";
import { action } from "storybook/actions";
import { DemoCalendar } from "../support/demo-calendar";
import {
  DEMO_DATE,
  DEMO_SCROLL_TIME,
  demoDay,
  weekEvents,
} from "../support/demo-events";

const meta = {
  args: {
    defaultValue: DEMO_DATE,
    onStartChange: action("onStartChange"),
    onValueChange: action("onValueChange"),
  },
  argTypes: {
    align: {
      control: "inline-radio",
      options: [
        "week",
        "start",
        "center",
      ],
    },
    step: {
      control: "inline-radio",
      options: [
        "page",
        "day",
      ],
    },
  },
  component: MiniCalendar,
  decorators: [
    // Most strips read best at a phone-like width; stories that measure or sit next to <Calendar> set
    // `parameters.frameWidth: "none"`.
    (Story, { parameters: { frameWidth } }) => (
      <div
        style={{
          maxWidth: frameWidth ?? 560,
          padding: 16,
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    calendarGlobals: [
      "locale",
      "timeZone",
      "weekStart",
    ],
    layout: "padded",
  },
  title: "MiniCalendar",
} satisfies Meta<typeof MiniCalendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Uncontrolled: `defaultValue` selects the demo day; the strip keeps its own selection and page. */
export const Uncontrolled: Story = {};

function ControlledDemo(props: Story["args"]) {
  const [value, setValue] = useState<Temporal.PlainDate | null>(DEMO_DATE);
  return (
    <div>
      <MiniCalendar
        {...props}
        defaultValue={undefined}
        onValueChange={setValue}
        value={value}
      />
      <p>
        Selected: {value?.toString() ?? "none"}{" "}
        <button
          onClick={() => setValue(null)}
          type="button"
        >
          Clear
        </button>{" "}
        <button
          onClick={() => setValue(demoDay(30))}
          type="button"
        >
          Jump 30 days
        </button>
      </p>
    </div>
  );
}

/** Controlled: `value` + `onValueChange`, cleared and moved from outside. */
export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};

/** A fixed number of `days`. */
export const FiveDays: Story = {
  args: {
    days: 5,
  },
};

/** `days="auto"`: as many days as fit (each at least `minDayWidth`). Resize the canvas to see it change. */
export const AutoDays: Story = {
  args: {
    days: "auto",
    minDayWidth: 56,
  },
  parameters: {
    frameWidth: "none",
  },
};

/** `align="center"`: the selected day sits in the middle of the strip. */
export const AlignCenter: Story = {
  args: {
    align: "center",
    days: 5,
  },
};

/** `align="start"`: the strip starts at the selected day. */
export const AlignStart: Story = {
  args: {
    align: "start",
  },
};

/** `step="day"`: the arrows move one day instead of a whole page. */
export const StepByDay: Story = {
  args: {
    step: "day",
  },
};

/** `minDate` and `maxDate`: two weeks around the demo day; the strip doesn't page past them. */
export const MinAndMaxDate: Story = {
  args: {
    maxDate: demoDay(7),
    minDate: demoDay(-7),
  },
};

/** `isDayDisabled`: weekends can't be selected (they stay visible and focusable). */
export const DisabledDays: Story = {
  args: {
    isDayDisabled: (day) => day.dayOfWeek >= 6,
  },
};

/** `showWeekends={false}`: Saturdays and Sundays are skipped. */
export const WithoutWeekends: Story = {
  args: {
    showWeekends: false,
  },
};

const eventDays = (() => {
  const zone = Temporal.Now.timeZoneId();
  const days = new Map<string, string[]>();
  for (const event of weekEvents()) {
    const { first, last } = itemDays(event, zone);
    for (
      let day = first;
      Temporal.PlainDate.compare(day, last) <= 0;
      day = day.add({
        days: 1,
      })
    ) {
      days.set(day.toString(), [
        ...(days.get(day.toString()) ?? []),
        event.color ?? "currentColor",
      ]);
    }
  }
  return days;
})();

/** `renderDay` with a dot per event under each day, keeping the default content. */
export const EventDots: Story = {
  args: {
    renderDay: ({ day, defaultContent }) => (
      <>
        {defaultContent}
        <span
          aria-hidden="true"
          style={{
            display: "flex",
            gap: 2,
            height: 4,
            justifyContent: "center",
          }}
        >
          {(eventDays.get(day.toString()) ?? [])
            .slice(0, 3)
            .map((color, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: dots have no identity of their own.
                key={index}
                style={{
                  background: color,
                  borderRadius: 9999,
                  height: 4,
                  width: 4,
                }}
              />
            ))}
        </span>
      </>
    ),
  },
};

/** Synced with `<Calendar>` through one `useCalendar` state: picking a day moves the calendar, and the other way. */
function SyncedDemo() {
  const calendar = useCalendar({
    defaultDate: DEMO_DATE,
    defaultView: "day",
  });
  return (
    <div
      style={{
        display: "grid",
        gap: 8,
      }}
    >
      <MiniCalendar calendar={calendar} />
      <DemoCalendar
        calendar={calendar}
        height={600}
        initialEvents={weekEvents()}
        scrollToTime={DEMO_SCROLL_TIME}
      />
    </div>
  );
}

export const SyncedWithCalendar: Story = {
  parameters: {
    frameWidth: "none",
  },
  render: () => <SyncedDemo />,
};

/** `hotkeys` overrides for the strip: `h`/`l` page, `g` shows today. */
export const HotkeyOverrides: Story = {
  args: {
    hotkeys: {
      goToToday: [
        "g",
      ],
      next: [
        "l",
      ],
      previous: [
        "h",
      ],
    },
  },
};
