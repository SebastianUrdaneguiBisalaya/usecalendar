import { describe, expect, it } from "vitest";
import {
  eventLook,
  eventSurface,
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

describe("eventSurface", () => {
  it("a confirmed event is a solid tint of its color over the theme background", () => {
    expect(
      eventSurface(
        "#6366f1",
        {
          past: false,
          tentative: false,
        },
        30,
      ),
    ).toEqual({
      accent: "#6366f1",
      style: {
        backgroundColor:
          "color-mix(in oklab, #6366f1 30%, var(--uc-background))",
      },
    });
  });

  it("a past event halves its tint and greys its accent", () => {
    const { accent, style } = eventSurface(
      "#6366f1",
      {
        past: true,
        tentative: false,
      },
      30,
    );
    expect(accent).toBe(
      "color-mix(in oklab, #6366f1 40%, var(--uc-muted-foreground))",
    );
    expect(style.backgroundColor).toBe(
      `color-mix(in oklab, ${accent} 15%, var(--uc-background))`,
    );
  });

  it("a tentative event gets a lighter fill with diagonal stripes", () => {
    const { style } = eventSurface(
      "#6366f1",
      {
        past: false,
        tentative: true,
      },
      30,
    );
    expect(style.backgroundColor).toBe(
      "color-mix(in oklab, #6366f1 15%, var(--uc-background))",
    );
    expect(style.backgroundImage).toContain(
      "repeating-linear-gradient(135deg, color-mix(in oklab, #6366f1 30%, transparent)",
    );
  });
});
