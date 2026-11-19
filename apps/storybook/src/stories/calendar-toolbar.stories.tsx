import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  CalendarProvider,
  CalendarToolbar,
  useCalendar,
} from "@usecalendar/react";
import type { ReactNode } from "react";
import { DEMO_DATE } from "../support/demo-events";

/** `CalendarToolbar` reads the calendar from context: give it its own `useCalendar` state. */
function WithCalendar({ children }: { children: ReactNode }) {
  const calendar = useCalendar({
    defaultDate: DEMO_DATE,
    defaultView: "week",
  });
  return (
    <CalendarProvider calendar={calendar}>
      {children}
      <p
        style={{
          padding: "0 12px",
        }}
      >
        State: {calendar.view} · {calendar.date?.toString()}
      </p>
    </CalendarProvider>
  );
}

const meta = {
  component: CalendarToolbar,
  decorators: [
    (Story) => (
      <WithCalendar>
        <Story />
      </WithCalendar>
    ),
  ],
  title: "Building blocks/CalendarToolbar",
} satisfies Meta<typeof CalendarToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The default toolbar: today, previous/next, the range title and the view switcher. */
export const Default: Story = {};

/** `views` limits and orders the switcher. */
export const TwoViews: Story = {
  args: {
    views: [
      "month",
      "week",
    ],
  },
};

/** An empty `views` list hides the switcher. */
export const WithoutViewSwitcher: Story = {
  args: {
    views: [],
  },
};

/** `classNames` per part, merged after the defaults so they win. */
export const ClassNames: Story = {
  args: {
    classNames: {
      root: "border-b border-uc-border",
      title: "text-uc-primary",
      today: "rounded-full",
    },
  },
};
