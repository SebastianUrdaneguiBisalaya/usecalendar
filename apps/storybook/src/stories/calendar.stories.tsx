import type { Meta, StoryObj } from "@storybook/react-vite";
import type { TimeRange } from "@usecalendar/core";
import {
  CalendarToolbar,
  EventBlock,
  EventChip,
  useCalendar,
} from "@usecalendar/react";
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
    hotkeysScope: {
      control: "inline-radio",
      options: [
        "document",
        "calendar",
      ],
    },
    hourHeight: {
      control: {
        min: 1,
        step: 0.5,
        type: "number",
      },
    },
    slotMinutes: {
      control: {
        step: 5,
        type: "number",
      },
    },
    snapMinutes: {
      control: {
        step: 5,
        type: "number",
      },
    },
    timeFormat: {
      control: "inline-radio",
      options: [
        "12h",
        "24h",
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
  title: "Calendar/Calendar",
} satisfies Meta<typeof DemoCalendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Month view. Click a day (`onDayClick`) or an event; long days collapse into "+N more". */
export const Month: Story = {
  args: {
    defaultView: "month",
  },
};

/** Week view: click or drag over empty slots to create, drag events to move, drag their bottom edge to resize. */
export const Week: Story = {
  args: {
    defaultView: "week",
  },
};

/** Day view. */
export const Day: Story = {
  args: {
    defaultView: "day",
  },
};

/** `secondaryTimeZones`: Lima and Kolkata (a half-hour offset) beside the calendar's own hours. */
export const SecondaryTimeZones: Story = {
  args: {
    defaultView: "week",
    secondaryTimeZones: [
      {
        timeZone: "America/Lima",
      },
      {
        label: "IST",
        timeZone: "Asia/Kolkata",
      },
    ],
  },
};

/** Two-line headers: a label with the offset under it, for every column. */
export const TimeZoneTwoLines: Story = {
  args: {
    defaultView: "week",
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
  },
};

/** `workingHours`: Monday to Friday, 9:00 to 18:00; every other slot is muted and has `data-off-hours`. */
export const WorkingHours: Story = {
  args: {
    defaultView: "week",
    workingHours: {
      days: [
        1,
        2,
        3,
        4,
        5,
      ],
      end: Temporal.PlainTime.from("18:00"),
      start: Temporal.PlainTime.from("09:00"),
    },
  },
};

/** `editable={false}`: events can be clicked, but not dragged, resized or moved with the keyboard. */
export const ReadOnly: Story = {
  args: {
    defaultView: "week",
    editable: false,
  },
};

/** `isEventEditable`: only events organized by "Ana" can be moved; Luis's design review is locked. */
export const IsEventEditable: Story = {
  args: {
    defaultView: "week",
    isEventEditable: (event) => event.data?.owner === "Ana",
  },
};

/** The "+ New event" draft an app keeps while its form is open: drawn as a ghost with `draftRange`. */
function DraftRangeDemo(props: Story["args"]) {
  const [draft, setDraft] = useState<TimeRange | null>(null);
  const [extra, setExtra] = useState<DemoEvent[]>([]);
  const save = (): void => {
    if (draft === null) return;
    setExtra((current) => [
      ...current,
      {
        ...draft,
        id: `draft-${current.length}`,
        title: "Saved draft",
      },
    ]);
    setDraft(null);
  };
  return (
    <div>
      <p style={panelStyle}>
        {draft === null
          ? "Click or drag over empty slots: the range becomes a draft instead of an event."
          : `Draft: ${draft.startAt} → ${draft.endAt} `}
        {draft !== null && (
          <>
            <button
              onClick={save}
              type="button"
            >
              Save
            </button>{" "}
            <button
              onClick={() => setDraft(null)}
              type="button"
            >
              Cancel
            </button>
          </>
        )}
      </p>
      <DemoCalendar
        {...props}
        draftRange={draft}
        initialEvents={[
          ...(props?.initialEvents ?? []),
          ...extra,
        ]}
        key={extra.length}
        onRangeSelect={setDraft}
        onSlotClick={setDraft}
      />
    </div>
  );
}

export const DraftRange: Story = {
  args: {
    defaultView: "week",
  },
  render: (args) => <DraftRangeDemo {...args} />,
};

/** `selectedEventId` from outside, e.g. the event open in a side panel. */
export const SelectedEvent: Story = {
  args: {
    defaultView: "week",
    selectedEventId: "design-review",
  },
};

/** A custom `toolbar`: the render function gets the calendar state; `CalendarToolbar` still works inside it. */
export const CustomToolbar: Story = {
  args: {
    defaultView: "week",
    toolbar: (calendar) => (
      <div style={panelStyle}>
        <strong>My app header</strong> · {calendar.view} ·{" "}
        {calendar.range === null
          ? ""
          : `${calendar.range.start} → ${calendar.range.end}`}{" "}
        <button
          onClick={calendar.goToToday}
          type="button"
        >
          Today
        </button>
        <CalendarToolbar
          views={[
            "week",
            "month",
          ]}
        />
      </div>
    ),
  },
};

/** No toolbar (`toolbar={false}`). */
export const WithoutToolbar: Story = {
  args: {
    defaultView: "week",
    toolbar: false,
  },
};

/** `renderEvent`, `renderAllDayEvent` and `renderMonthEvent`, keeping the default look with extra content. */
export const RenderEvent: Story = {
  args: {
    defaultView: "week",
    renderAllDayEvent: (chip) => (
      <EventChip
        {...chip}
        event={{
          ...chip.event,
          title: `★ ${chip.event.title}`,
        }}
      />
    ),
    renderEvent: (block) => (
      <EventBlock
        {...block}
        time={`${block.time ?? ""} · ${block.event.data?.owner ?? ""}`}
      />
    ),
    renderMonthEvent: (chip) => (
      <EventChip
        {...chip}
        event={{
          ...chip.event,
          title: `${chip.event.title} (${chip.event.data?.owner ?? ""})`,
        }}
      />
    ),
  },
};

/** `renderEventWrapper`: right-click an event to log a context-menu intent with its `data`. */
export const RenderEventWrapper: Story = {
  args: {
    defaultView: "week",
    // Adds a handler to the event's own button, as a context-menu trigger (`asChild`) would.
    renderEventWrapper: ({ children, event }) =>
      cloneElement(children as ReactElement<HTMLAttributes<HTMLElement>>, {
        onContextMenu: (pointer) => {
          pointer.preventDefault();
          action("context menu")(event.data);
        },
      }),
  },
};

/**
 * `hotkeys` overrides: `h`/`l` for previous/next, `n` for a new event, and the month view shortcut turned off.
 * Shortcuts listen on the document by default; set `hotkeysScope` to `"calendar"` to need focus inside.
 */
export const HotkeyOverrides: Story = {
  args: {
    defaultView: "week",
    hotkeys: {
      monthView: null,
      newEvent: [
        "n",
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

/** `hotkeys={false}`: no global or grid shortcuts. Arrow keys still move focus inside the grid. */
export const HotkeysOff: Story = {
  args: {
    defaultView: "week",
    hotkeys: false,
  },
};

/** Driven from outside with `useCalendar`, e.g. by app buttons; the toolbar and the shortcuts stay in sync. */
function ExternalStateDemo(props: Story["args"]) {
  const calendar = useCalendar({
    defaultDate: DEMO_DATE,
    defaultView: "week",
    onRangeChange: action("onRangeChange"),
  });
  return (
    <div>
      <p style={panelStyle}>
        Outside the calendar:{" "}
        <button
          onClick={calendar.goToPrevious}
          type="button"
        >
          ←
        </button>{" "}
        <button
          onClick={calendar.goToNext}
          type="button"
        >
          →
        </button>{" "}
        <button
          onClick={() =>
            calendar.setView(calendar.view === "week" ? "month" : "week")
          }
          type="button"
        >
          Toggle week / month
        </button>{" "}
        {calendar.date?.toString()}
      </p>
      <DemoCalendar
        {...props}
        calendar={calendar}
        initialEvents={props?.initialEvents ?? []}
      />
    </div>
  );
}

export const ExternalState: Story = {
  render: (args) => <ExternalStateDemo {...args} />,
};

const panelStyle = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  margin: 0,
  padding: "8px 12px",
} as const;
