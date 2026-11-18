import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventChip } from "../../src/events/event-chip.js";

const event = {
  endAt: "2026-11-18T16:00:00Z",
  id: "evt_1",
  startAt: "2026-11-18T15:00:00Z",
  title: "Design review",
};
const look = {
  past: false,
  tentative: false,
};

describe("EventChip", () => {
  it("draws a timed one-day event as a dot, the time and the title", () => {
    const html = renderToStaticMarkup(
      <EventChip
        event={{
          ...event,
          color: "#6366f1",
        }}
        look={look}
        time="10:00 AM"
      />,
    );
    expect(html).toContain('data-variant="dot"');
    expect(html).toContain("--uc-event-color:#6366f1");
    expect(html).toContain("data-uc-event-dot");
    expect(html).toContain("10:00 AM");
    expect(html).toContain("Design review");
  });

  it("draws all-day, multi-day and continuing events as bars without time", () => {
    for (const props of [
      {
        event: {
          ...event,
          allDay: true,
        },
      },
      {
        event,
        span: 2,
      },
      {
        continuesAfter: true,
        event,
      },
      {
        bar: true,
        event,
      },
    ]) {
      const html = renderToStaticMarkup(
        <EventChip
          look={look}
          time="10:00 AM"
          {...props}
        />,
      );
      expect(html).toContain('data-variant="bar"');
      expect(html).not.toContain("10:00 AM");
    }
  });

  it("squares the corners where the event continues", () => {
    const html = renderToStaticMarkup(
      <EventChip
        continuesAfter
        continuesBefore
        event={event}
        look={look}
      />,
    );
    expect(html).toContain("rounded-l-none");
    expect(html).toContain("rounded-r-none");
    expect(html).toContain("data-continues-before");
  });

  it("leaves the color to the theme when the event has none, and lets the color prop win", () => {
    expect(
      renderToStaticMarkup(
        <EventChip
          event={event}
          look={look}
        />,
      ),
    ).not.toContain("--uc-event-color");
    expect(
      renderToStaticMarkup(
        <EventChip
          color="red"
          event={{
            ...event,
            color: "blue",
          }}
          look={look}
        />,
      ),
    ).toContain("--uc-event-color:red");
  });

  it("leaves the tentative look (stripes, ring) to the stylesheet, without inline backgrounds", () => {
    const html = renderToStaticMarkup(
      <EventChip
        event={{
          ...event,
          color: "#6366f1",
        }}
        look={{
          past: false,
          tentative: true,
        }}
      />,
    );
    expect(html).toContain("data-tentative");
    expect(html).not.toContain("background");
  });

  it("mutes past events", () => {
    const html = renderToStaticMarkup(
      <EventChip
        event={{
          ...event,
          allDay: true,
        }}
        look={{
          past: true,
          tentative: false,
        }}
      />,
    );
    expect(html).toContain("text-uc-muted-foreground");
    expect(html).not.toContain("text-uc-foreground");
    expect(html).toContain("data-past");
  });

  it("merges className and classNames after the defaults, so they win", () => {
    const html = renderToStaticMarkup(
      <EventChip
        className="px-3 text-xs"
        classNames={{
          dot: "size-2",
          title: "font-semibold",
        }}
        event={event}
        look={look}
      />,
    );
    expect(html).toContain("px-3");
    expect(html).not.toContain("px-1 ");
    expect(html).toContain("text-xs");
    expect(html).not.toContain("text-[0.7rem]");
    expect(html).toContain("size-2");
    expect(html).not.toContain("size-1.5");
    expect(html).toContain("truncate font-semibold");
  });
});
