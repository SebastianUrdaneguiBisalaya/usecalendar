import { describe, expect, it } from "vitest";
import {
  type DayEvents,
  focusKey,
  type GridFocus,
  nextFocus,
} from "../src/grid-focus.js";

const slot = (day: number, slotIndex: number): GridFocus => ({
  day,
  eventId: null,
  slot: slotIndex,
});
const event = (day: number, slotIndex: number, eventId: string): GridFocus => ({
  day,
  eventId,
  slot: slotIndex,
});

// Day 0 has two events starting at 9:00 (slot 18) and one at 9:30 (slot 19).
const events: DayEvents = [
  [
    {
      id: "a",
      slot: 18,
    },
    {
      id: "b",
      slot: 18,
    },
    {
      id: "c",
      slot: 19,
    },
  ],
  [],
  [],
];

describe("focusKey", () => {
  it("encodes slots and events distinctly", () => {
    expect(focusKey(slot(2, 18))).toBe("2:18");
    expect(focusKey(event(2, 18, "evt_1"))).toBe("2:18:evt_1");
  });
});

describe("nextFocus", () => {
  it("↓/↑ walk each slot followed by the events that start in it", () => {
    expect(nextFocus(slot(0, 18), "ArrowDown", false, events, 3)).toEqual(
      event(0, 18, "a"),
    );
    expect(nextFocus(event(0, 18, "a"), "ArrowDown", false, events, 3)).toEqual(
      event(0, 18, "b"),
    );
    expect(nextFocus(event(0, 18, "b"), "ArrowDown", false, events, 3)).toEqual(
      slot(0, 19),
    );
    expect(nextFocus(slot(0, 19), "ArrowUp", false, events, 3)).toEqual(
      event(0, 18, "b"),
    );
  });

  it("stops at the first and last slot of the day", () => {
    expect(nextFocus(slot(1, 0), "ArrowUp", false, events, 3)).toBeNull();
    expect(nextFocus(slot(1, 47), "ArrowDown", false, events, 3)).toBeNull();
  });

  it("←/→ move to the same slot of the neighboring day, leaving the event", () => {
    expect(
      nextFocus(event(0, 18, "a"), "ArrowRight", false, events, 3),
    ).toEqual(slot(1, 18));
    expect(nextFocus(slot(1, 18), "ArrowLeft", false, events, 3)).toEqual(
      slot(0, 18),
    );
    expect(nextFocus(slot(0, 18), "ArrowLeft", false, events, 3)).toBeNull();
    expect(nextFocus(slot(2, 18), "ArrowRight", false, events, 3)).toBeNull();
  });

  it("Home/End jump to the first/last day, or with Ctrl to the first/last slot", () => {
    expect(nextFocus(slot(1, 18), "Home", false, events, 3)).toEqual(
      slot(0, 18),
    );
    expect(nextFocus(slot(1, 18), "End", false, events, 3)).toEqual(
      slot(2, 18),
    );
    expect(nextFocus(slot(1, 18), "Home", true, events, 3)).toEqual(slot(1, 0));
    expect(nextFocus(slot(1, 18), "End", true, events, 3)).toEqual(slot(1, 47));
  });

  it("PageUp/PageDown move an hour, clamped to the day", () => {
    expect(nextFocus(slot(1, 18), "PageUp", false, events, 3)).toEqual(
      slot(1, 16),
    );
    expect(nextFocus(slot(1, 18), "PageDown", false, events, 3)).toEqual(
      slot(1, 20),
    );
    expect(nextFocus(slot(1, 1), "PageUp", false, events, 3)).toEqual(
      slot(1, 0),
    );
  });

  it("follows a custom slot length", () => {
    // 15-minute slots: 96 per day, 4 per hour.
    expect(
      nextFocus(
        slot(0, 40),
        "PageDown",
        false,
        [
          [],
        ],
        1,
        15,
      ),
    ).toEqual(slot(0, 44));
    expect(
      nextFocus(
        slot(0, 40),
        "End",
        true,
        [
          [],
        ],
        1,
        15,
      ),
    ).toEqual(slot(0, 95));
  });

  it("ignores keys that aren't grid keys", () => {
    expect(nextFocus(slot(0, 18), "Enter", false, events, 3)).toBeNull();
    expect(nextFocus(slot(0, 18), "a", false, events, 3)).toBeNull();
  });
});
