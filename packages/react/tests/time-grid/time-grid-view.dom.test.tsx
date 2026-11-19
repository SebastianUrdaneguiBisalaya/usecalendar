// @vitest-environment jsdom
import type { CalendarEvent } from "@usecalendar/core";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarProvider } from "../../src/calendar/calendar-context.js";
import { useCalendar } from "../../src/calendar/use-calendar.js";
import {
  TimeGridView,
  type TimeGridViewProps,
} from "../../src/time-grid/time-grid-view.js";
import "../render-hook.js";

// A week that never contains the real today: the tab stop is 8:00 on Monday 2030-01-14.
function Grid(props: Partial<TimeGridViewProps>) {
  const calendar = useCalendar({
    date: Temporal.PlainDate.from("2030-01-16"),
    timeZone: "UTC",
    view: "week",
  });
  return (
    <CalendarProvider calendar={calendar}>
      <TimeGridView
        events={[]}
        {...props}
      />
    </CalendarProvider>
  );
}

const standup: CalendarEvent = {
  endAt: "2030-01-16T10:00:00Z",
  id: "series:2030-01-16",
  startAt: "2030-01-16T09:00:00Z",
  title: "Standup",
};

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.restoreAllMocks();
});

const mount = (props: Partial<TimeGridViewProps> = {}) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = (next: Partial<TimeGridViewProps>) =>
    act(() => root.render(<Grid {...next} />));
  render(props);
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  return {
    container,
    render,
  };
};

const byKey = (container: HTMLElement, key: string) => {
  const element = container.querySelector<HTMLElement>(
    `[data-focus-key="${key}"]`,
  );
  if (element === null) throw new Error(`Nothing focusable at ${key}`);
  return element;
};

const press = (
  target: HTMLElement,
  key: string,
  init: KeyboardEventInit = {},
) => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key,
    ...init,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
};

describe("TimeGridView keyboard", () => {
  it("has one tab stop, 8:00 on the first day when today isn't shown, and moves it with the arrows", () => {
    const { container } = mount();
    const tabStops = container.querySelectorAll('[tabindex="0"]');
    expect(tabStops).toHaveLength(1);
    expect(tabStops[0]?.getAttribute("data-focus-key")).toBe("0:16");

    const start = byKey(container, "0:16");
    act(() => start.focus());
    expect(press(start, "ArrowDown").defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byKey(container, "0:17"));
    press(document.activeElement as HTMLElement, "ArrowRight");
    expect(document.activeElement).toBe(byKey(container, "1:17"));
    press(document.activeElement as HTMLElement, "PageDown");
    expect(document.activeElement).toBe(byKey(container, "1:19"));
    expect(byKey(container, "1:19").tabIndex).toBe(0);
    expect(start.tabIndex).toBe(-1);
  });

  it("stops at events with ↑/↓ and opens them with Enter", () => {
    const onEventClick = vi.fn();
    const { container } = mount({
      events: [
        standup,
      ],
      onEventClick,
    });
    const slot = byKey(container, "2:18");
    act(() => slot.focus());
    press(slot, "ArrowDown");
    const eventButton = byKey(container, "2:18:series:2030-01-16");
    expect(document.activeElement).toBe(eventButton);
    expect(press(eventButton, "Enter").defaultPrevented).toBe(true);
    expect(onEventClick).toHaveBeenCalledWith(standup);
  });

  it("proposes a new event on Enter in a slot, lasting defaultEventDuration", () => {
    const onSlotClick = vi.fn();
    const { container } = mount({
      defaultEventDuration: 30,
      onSlotClick,
    });
    const slot = byKey(container, "2:19");
    act(() => slot.focus());
    press(slot, "Enter");
    expect(onSlotClick).toHaveBeenCalledWith({
      endAt: "2030-01-16T10:00:00Z",
      startAt: "2030-01-16T09:30:00Z",
    });
  });

  it("leaves Enter alone when nothing handles it", () => {
    const { container } = mount();
    const slot = byKey(container, "0:16");
    act(() => slot.focus());
    expect(press(slot, "Enter").defaultPrevented).toBe(false);
  });

  it("moves and resizes the focused event with Alt+arrows, snapped to snapMinutes", () => {
    const onEventChange = vi.fn();
    const { container } = mount({
      events: [
        standup,
      ],
      onEventChange,
      snapMinutes: 30,
    });
    const button = byKey(container, "2:18:series:2030-01-16");
    act(() => button.focus());
    press(button, "ArrowDown", {
      altKey: true,
    });
    press(button, "ArrowLeft", {
      altKey: true,
    });
    press(button, "ArrowDown", {
      altKey: true,
      shiftKey: true,
    });
    expect(onEventChange.mock.calls).toEqual([
      [
        standup,
        {
          endAt: "2030-01-16T10:30:00Z",
          startAt: "2030-01-16T09:30:00Z",
        },
      ],
      [
        standup,
        {
          endAt: "2030-01-15T10:00:00Z",
          startAt: "2030-01-15T09:00:00Z",
        },
      ],
      [
        standup,
        {
          endAt: "2030-01-16T10:30:00Z",
          startAt: "2030-01-16T09:00:00Z",
        },
      ],
    ]);
  });

  it("follows a keyboard-moved event to its new slot once the app moves it", () => {
    const onEventChange = vi.fn();
    const { container, render } = mount({
      events: [
        standup,
      ],
      onEventChange,
    });
    const button = byKey(container, "2:18:series:2030-01-16");
    act(() => button.focus());
    press(button, "ArrowDown", {
      altKey: true,
    });
    render({
      events: [
        {
          ...standup,
          endAt: "2030-01-16T10:30:00Z",
          startAt: "2030-01-16T09:30:00Z",
        },
      ],
      onEventChange,
    });
    expect(document.activeElement).toBe(
      byKey(container, "2:19:series:2030-01-16"),
    );
  });

  it("doesn't edit events that aren't editable", () => {
    const onEventChange = vi.fn();
    const { container } = mount({
      events: [
        standup,
      ],
      isEventEditable: () => false,
      onEventChange,
    });
    const button = byKey(container, "2:18:series:2030-01-16");
    act(() => button.focus());
    expect(
      press(button, "ArrowDown", {
        altKey: true,
      }).defaultPrevented,
    ).toBe(false);
    expect(onEventChange).not.toHaveBeenCalled();
  });
});

describe("TimeGridView clicks", () => {
  it("opens events without also clicking the slot underneath", () => {
    const onEventClick = vi.fn();
    const onSlotClick = vi.fn();
    const { container } = mount({
      events: [
        standup,
      ],
      onEventClick,
      onSlotClick,
    });
    act(() => byKey(container, "2:18:series:2030-01-16").click());
    expect(onEventClick).toHaveBeenCalledWith(standup);
    expect(onSlotClick).not.toHaveBeenCalled();
    act(() => byKey(container, "3:20").click());
    expect(onSlotClick).toHaveBeenCalledWith({
      endAt: "2030-01-17T11:00:00Z",
      startAt: "2030-01-17T10:00:00Z",
    });
  });

  it("toggles the all-day lane and reports it", () => {
    const onAllDayCollapsedChange = vi.fn();
    const { container } = mount({
      events: [
        1,
        2,
        3,
      ].map((n) => ({
        allDay: true,
        endAt: "2030-01-17T00:00:00Z",
        id: `d${n}`,
        startAt: "2030-01-16T00:00:00Z",
        title: `Day ${n}`,
      })),
      onAllDayCollapsedChange,
    });
    const toggle = container.querySelector<HTMLButtonElement>(
      "button[aria-expanded]",
    );
    act(() => toggle?.click());
    expect(onAllDayCollapsedChange).toHaveBeenCalledWith(true);
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).toContain("+2 more");
  });
});

describe("TimeGridView pointer drags", () => {
  // jsdom has no layout: pretend each slot is 100px wide and 24px tall, with the first one at (64, 100).
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        return this.getAttribute("data-focus-key") === "0:0"
          ? new DOMRect(64, 100, 100, 24)
          : new DOMRect();
      },
    );
    HTMLElement.prototype.setPointerCapture = () => {};
  });

  const at = (day: number, minute: number) => ({
    clientX: 64 + day * 100 + 50,
    clientY: 100 + (minute / 30) * 24,
  });
  const pointer = (
    target: Element,
    type: string,
    point: {
      clientX: number;
      clientY: number;
    },
  ) =>
    act(() => {
      const event = new MouseEvent(type, {
        bubbles: true,
        button: 0,
        cancelable: true,
        ...point,
      });
      Object.assign(event, {
        pointerId: 1,
        pointerType: "mouse",
      });
      target.dispatchEvent(event);
    });
  const grid = (container: HTMLElement) =>
    container.querySelector('[role="grid"]') as HTMLElement;

  it("sweeps empty slots into a range for onRangeSelect, without also clicking the slot", () => {
    const onRangeSelect = vi.fn();
    const onSlotClick = vi.fn();
    const { container } = mount({
      onRangeSelect,
      onSlotClick,
    });
    const slot = byKey(container, "1:18");
    pointer(slot, "pointerdown", at(1, 9 * 60 + 5));
    pointer(grid(container), "pointermove", at(1, 10 * 60 + 20));
    expect(container.querySelector("[data-uc-ghost]")).not.toBeNull();
    pointer(grid(container), "pointerup", at(1, 10 * 60 + 20));
    act(() => slot.click());
    expect(onRangeSelect).toHaveBeenCalledWith({
      endAt: "2030-01-15T10:30:00Z",
      startAt: "2030-01-15T09:00:00Z",
    });
    expect(onSlotClick).not.toHaveBeenCalled();
  });

  it("moves an event by the dragged days and minutes, snapped", () => {
    const onEventChange = vi.fn();
    const { container } = mount({
      events: [
        standup,
      ],
      onEventChange,
    });
    const button = byKey(container, "2:18:series:2030-01-16");
    pointer(button, "pointerdown", at(2, 9 * 60 + 10));
    pointer(grid(container), "pointermove", at(3, 10 * 60 + 17));
    expect(button.className).toContain("opacity-40");
    pointer(grid(container), "pointerup", at(3, 10 * 60 + 17));
    expect(onEventChange).toHaveBeenCalledWith(standup, {
      endAt: "2030-01-17T11:00:00Z",
      startAt: "2030-01-17T10:00:00Z",
    });
  });

  it("re-renders only when the snapped preview moves, and drops at the last position", () => {
    const onEventChange = vi.fn();
    const renderEvent = vi.fn(() => null);
    const { container } = mount({
      events: [
        standup,
      ],
      onEventChange,
      renderEvent,
    });
    const button = byKey(container, "2:18:series:2030-01-16");
    pointer(button, "pointerdown", at(2, 9 * 60 + 10));
    // Grabbed at 9:10: these all put the start at 10:10–10:12, which snaps to 10:15.
    pointer(grid(container), "pointermove", at(2, 10 * 60 + 20));
    const renders = renderEvent.mock.calls.length;
    // Still within the same 15-minute snap step: nothing to redraw.
    pointer(grid(container), "pointermove", at(2, 10 * 60 + 21));
    pointer(grid(container), "pointermove", at(2, 10 * 60 + 22));
    expect(renderEvent.mock.calls.length).toBe(renders);
    // The next step moves the preview.
    pointer(grid(container), "pointermove", at(2, 10 * 60 + 40));
    expect(renderEvent.mock.calls.length).toBeGreaterThan(renders);
    pointer(grid(container), "pointerup", at(2, 10 * 60 + 40));
    expect(onEventChange).toHaveBeenCalledWith(standup, {
      endAt: "2030-01-16T11:30:00Z",
      startAt: "2030-01-16T10:30:00Z",
    });
  });

  it("resizes an event from its bottom edge", () => {
    const onEventChange = vi.fn();
    const { container } = mount({
      events: [
        standup,
      ],
      onEventChange,
    });
    const handle = container.querySelector("[data-uc-resize-handle]");
    if (handle === null) throw new Error("No resize handle");
    pointer(handle, "pointerdown", at(2, 10 * 60));
    pointer(grid(container), "pointermove", at(2, 11 * 60 + 40));
    pointer(grid(container), "pointerup", at(2, 11 * 60 + 40));
    expect(onEventChange).toHaveBeenCalledWith(standup, {
      endAt: "2030-01-16T11:45:00Z",
      startAt: "2030-01-16T09:00:00Z",
    });
  });

  it("cancels a drag with Escape, consuming the key", () => {
    const onEventChange = vi.fn();
    const { container } = mount({
      events: [
        standup,
      ],
      onEventChange,
    });
    const button = byKey(container, "2:18:series:2030-01-16");
    pointer(button, "pointerdown", at(2, 9 * 60));
    pointer(grid(container), "pointermove", at(2, 12 * 60));
    expect(press(document.body, "Escape").defaultPrevented).toBe(true);
    expect(container.querySelector("[data-uc-ghost]")).toBeNull();
    pointer(grid(container), "pointerup", at(2, 12 * 60));
    expect(onEventChange).not.toHaveBeenCalled();
  });

  it("doesn't drag events that aren't editable, or sweep without onRangeSelect", () => {
    const onEventChange = vi.fn();
    const { container } = mount({
      editable: false,
      events: [
        standup,
      ],
      onEventChange,
    });
    pointer(
      byKey(container, "2:18:series:2030-01-16"),
      "pointerdown",
      at(2, 9 * 60),
    );
    pointer(byKey(container, "4:2"), "pointerdown", at(4, 60));
    pointer(grid(container), "pointermove", at(3, 12 * 60));
    expect(container.querySelector("[data-uc-ghost]")).toBeNull();
    pointer(grid(container), "pointerup", at(3, 12 * 60));
    expect(onEventChange).not.toHaveBeenCalled();
  });
});
