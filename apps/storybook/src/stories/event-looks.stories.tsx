import type { Meta, StoryObj } from "@storybook/react-vite";
import { EventBlock, EventChip, type EventLook } from "@usecalendar/react";
import type { CSSProperties, ReactNode } from "react";
import {
  allDay,
  COLORS,
  DEMO_DATE,
  type DemoEvent,
  timed,
} from "../support/demo-events";

/** Every look an event can have: past and/or tentative. */
const LOOKS: readonly {
  label: string;
  look: EventLook;
}[] = [
  {
    label: "Upcoming",
    look: {
      past: false,
      tentative: false,
    },
  },
  {
    label: "Tentative",
    look: {
      past: false,
      tentative: true,
    },
  },
  {
    label: "Past",
    look: {
      past: true,
      tentative: false,
    },
  },
  {
    label: "Past + tentative",
    look: {
      past: true,
      tentative: true,
    },
  },
];

const timedEvent: DemoEvent = timed(
  "timed",
  "Design review",
  DEMO_DATE,
  "10:00",
  60,
  {
    color: COLORS.violet,
  },
);
const allDayEvent: DemoEvent = allDay("all-day", "Company offsite", DEMO_DATE);
const { color: _color, ...withoutColor } = timedEvent;
const uncolored: DemoEvent = {
  ...withoutColor,
  id: "uncolored",
  title: "No color (muted foreground)",
};

const grid: CSSProperties = {
  alignItems: "center",
  display: "grid",
  gap: "8px 16px",
  gridTemplateColumns: "140px repeat(4, 200px)",
  padding: 16,
};

/** A table of event looks: one row per variant, one column per {@link LOOKS} entry. */
function Gallery({
  rows,
  height,
}: {
  height: number;
  rows: readonly {
    label: string;
    render: (look: EventLook) => ReactNode;
  }[];
}) {
  return (
    <div style={grid}>
      <span />
      {LOOKS.map(({ label }) => (
        <strong key={label}>{label}</strong>
      ))}
      {rows.map((row) => (
        <Row
          height={height}
          key={row.label}
          label={row.label}
          render={row.render}
        />
      ))}
    </div>
  );
}

function Row({
  height,
  label,
  render,
}: {
  height: number;
  label: string;
  render: (look: EventLook) => ReactNode;
}) {
  return (
    <>
      <span>{label}</span>
      {LOOKS.map(({ label: lookLabel, look }) => (
        <div
          key={lookLabel}
          style={{
            height,
          }}
        >
          {render(look)}
        </div>
      ))}
    </>
  );
}

const meta = {
  parameters: {
    layout: "padded",
  },
  title: "Building blocks/Event looks",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** `EventChip` (month view, all-day lane): dot, bar, spanning and continuing bars, in every look. */
export const Chips: Story = {
  render: () => (
    <Gallery
      height={22}
      rows={[
        {
          label: "Dot (timed)",
          render: (look) => (
            <EventChip
              event={timedEvent}
              look={look}
              time="10:00 AM"
            />
          ),
        },
        {
          label: "Bar (all-day)",
          render: (look) => (
            <EventChip
              event={allDayEvent}
              look={look}
            />
          ),
        },
        {
          label: "Bar (bar prop)",
          render: (look) => (
            <EventChip
              bar
              event={timedEvent}
              look={look}
            />
          ),
        },
        {
          label: "Continues both ways",
          render: (look) => (
            <EventChip
              continuesAfter
              continuesBefore
              event={allDayEvent}
              look={look}
            />
          ),
        },
        {
          label: "No color",
          render: (look) => (
            <EventChip
              event={uncolored}
              look={look}
              time="10:00 AM"
            />
          ),
        },
        {
          label: "Long title",
          render: (look) => (
            <EventChip
              event={{
                ...allDayEvent,
                title:
                  "A very long event title that has to be truncated somewhere",
              }}
              look={look}
            />
          ),
        },
      ]}
    />
  ),
};

/** `EventBlock` (day and week views): regular, compact, continuing, uncolored, in every look. */
export const Blocks: Story = {
  render: () => (
    <div>
      <Gallery
        height={64}
        rows={[
          {
            label: "Regular",
            render: (look) => (
              <EventBlock
                event={timedEvent}
                look={look}
                time="10:00 – 11:00 AM"
              />
            ),
          },
          {
            label: "Continues before",
            render: (look) => (
              <EventBlock
                continuesBefore
                event={timedEvent}
                look={look}
                time="12:00 – 2:00 AM"
              />
            ),
          },
          {
            label: "Continues after",
            render: (look) => (
              <EventBlock
                continuesAfter
                event={timedEvent}
                look={look}
                time="10:00 PM – 12:00 AM"
              />
            ),
          },
          {
            label: "No color",
            render: (look) => (
              <EventBlock
                event={uncolored}
                look={look}
                time="10:00 – 11:00 AM"
              />
            ),
          },
        ]}
      />
      <Gallery
        height={20}
        rows={[
          {
            label: "Compact",
            render: (look) => (
              <EventBlock
                compact
                event={timedEvent}
                look={look}
                time="10:00 AM"
              />
            ),
          },
        ]}
      />
    </div>
  ),
};

/** Every event color on the default chip and block. */
export const Colors: Story = {
  render: () => (
    <Gallery
      height={48}
      rows={Object.entries(COLORS).map(([name, color]) => ({
        label: name,
        render: (look: EventLook) => (
          <div
            style={{
              display: "grid",
              gap: 4,
              gridTemplateRows: "18px 1fr",
              height: "100%",
            }}
          >
            <EventChip
              color={color}
              event={allDayEvent}
              look={look}
            />
            <EventBlock
              color={color}
              compact
              event={timedEvent}
              look={look}
              time="10:00 AM"
            />
          </div>
        ),
      }))}
    />
  ),
};
