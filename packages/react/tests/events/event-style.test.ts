import { describe, expect, it } from "vitest";
import {
  eventLook,
  eventSurfaceProps,
  isPast,
} from "../../src/events/event-style.js";

const event = {
  endAt: "2026-11-18T16:00:00Z",
  status: "confirmed" as const,
};
const end = Date.parse(event.endAt);

describe("isPast / eventLook", () => {
  it("an event is past once its end has been reached", () => {
    expect(isPast(event, end - 1)).toBe(false);
    expect(isPast(event, end)).toBe(true);
  });

  it("nothing is past while now is unknown", () => {
    expect(isPast(event, null)).toBe(false);
  });

  it("reads tentative from the status", () => {
    expect(
      eventLook(
        {
          ...event,
          status: "tentative",
        },
        null,
      ),
    ).toEqual({
      past: false,
      tentative: true,
    });
    expect(
      eventLook(
        {
          endAt: event.endAt,
        },
        end + 1,
      ),
    ).toEqual({
      past: true,
      tentative: false,
    });
  });
});

describe("eventSurfaceProps", () => {
  it("marks the element as an event surface and passes the color as a variable", () => {
    expect(
      eventSurfaceProps(
        "#6366f1",
        {
          past: false,
          tentative: false,
        },
        "bar",
      ),
    ).toEqual({
      "data-uc-event": "",
      "data-variant": "bar",
      style: {
        "--uc-event-color": "#6366f1",
      },
    });
  });

  it("exposes past and tentative as data attributes", () => {
    expect(
      eventSurfaceProps(
        "#6366f1",
        {
          past: true,
          tentative: true,
        },
        "dot",
      ),
    ).toMatchObject({
      "data-past": true,
      "data-tentative": true,
      "data-variant": "dot",
    });
  });

  it("leaves the color to the theme when there is none", () => {
    expect(
      eventSurfaceProps(
        undefined,
        {
          past: false,
          tentative: false,
        },
        "bar",
      ).style,
    ).toEqual({});
  });
});
