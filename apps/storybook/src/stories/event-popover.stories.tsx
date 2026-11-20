import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  cloneElement,
  type HTMLAttributes,
  type ReactElement,
  useState,
} from "react";
import { action } from "storybook/actions";
import { DemoCalendar } from "../support/demo-calendar";
import {
  DEMO_DATE,
  DEMO_SCROLL_TIME,
  type DemoEvent,
  weekEvents,
} from "../support/demo-events";

const meta = {
  args: {
    defaultDate: DEMO_DATE,
    defaultView: "week",
    eventPopover: "click",
    initialEvents: weekEvents(),
    scrollToTime: DEMO_SCROLL_TIME,
  },
  argTypes: {
    defaultView: {
      control: "inline-radio",
      options: [
        "day",
        "week",
        "month",
      ],
    },
    eventPopover: {
      control: "inline-radio",
      options: [
        "click",
        "hover",
        false,
      ],
    },
  },
  component: DemoCalendar,
  parameters: {
    calendarGlobals: [
      "locale",
      "timeZone",
      "weekStart",
    ],
  },
  title: "Calendar/Event popover",
} satisfies Meta<typeof DemoCalendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `eventPopover="click"`: click an event (or press Enter on a focused one) for its details. Escape, a click outside or
 * a second click closes it. "Design review", "Lunch with Marta" and "Trip to Cusco" have a location and description;
 * "Sprint planning" is tentative.
 */
export const Click: Story = {};

/** `eventPopover="hover"`: hovering with a mouse opens it after a short delay; a tap still opens it on touch screens. */
export const Hover: Story = {
  args: {
    eventPopover: "hover",
  },
};

/** The popover in the month view, from a bar, a timed event or an event inside "+N more". */
export const Month: Story = {
  args: {
    defaultView: "month",
    eventPopover: "hover",
  },
};

/** `renderEventPopover`: the default `details` plus the app's own actions, which call `close`. */
export const CustomContent: Story = {
  args: {
    renderEventPopover: ({ close, details, event }) => (
      <div className="flex flex-col gap-3">
        {details}
        <div className="flex justify-end gap-2">
          <button
            className="cursor-pointer rounded-uc border border-uc-border bg-transparent px-2 py-1 text-uc-foreground text-xs hover:bg-uc-accent"
            onClick={() => {
              action("delete")(event.id);
              close();
            }}
            type="button"
          >
            Delete
          </button>
          <button
            className="cursor-pointer rounded-uc border-0 bg-uc-primary px-2 py-1 text-uc-primary-foreground text-xs"
            onClick={() => {
              action("edit")(event.id);
              close();
            }}
            type="button"
          >
            Edit
          </button>
        </div>
      </div>
    ),
  },
};

/** The app's own hover card around each event (`renderEventWrapper`), with the built-in popover off. */
function OwnPopoverDemo(props: Story["args"]) {
  const [hovered, setHovered] = useState<{
    event: DemoEvent;
    x: number;
    y: number;
  } | null>(null);
  return (
    <>
      <DemoCalendar
        {...props}
        eventPopover={false}
        initialEvents={props?.initialEvents ?? weekEvents()}
        renderEventWrapper={({ children, event }) =>
          cloneElement(children as ReactElement<HTMLAttributes<HTMLElement>>, {
            onMouseEnter: (pointer) => {
              const box = pointer.currentTarget.getBoundingClientRect();
              setHovered({
                event,
                x: box.right + 8,
                y: box.top,
              });
            },
            onMouseLeave: () => setHovered(null),
          })
        }
      />
      {hovered !== null && (
        <div
          className="pointer-events-none fixed z-50 rounded-uc bg-uc-primary px-2 py-1 text-uc-primary-foreground text-xs shadow-md"
          style={{
            left: hovered.x,
            top: hovered.y,
          }}
        >
          {hovered.event.title} · {hovered.event.data?.owner ?? "No owner"}
        </div>
      )}
    </>
  );
}

export const OwnPopover: Story = {
  render: (args) => <OwnPopoverDemo {...args} />,
};
