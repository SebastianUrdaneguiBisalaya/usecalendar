// @vitest-environment jsdom
import type { CalendarEvent, CalendarView } from "@usecalendar/core";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarProvider } from "../../src/calendar/calendar-context.js";
import { useCalendar } from "../../src/calendar/use-calendar.js";
import { MonthView, type MonthViewProps } from "../../src/month/month-view.js";
import "../render-hook.js";

const today = Temporal.Now.plainDateISO("UTC");

let view: CalendarView = "month";
let date: Temporal.PlainDate | null = null;
function Month(props: Partial<MonthViewProps>) {
  const calendar = useCalendar({
    defaultView: "month",
    timeZone: "UTC",
  });
  view = calendar.view;
  date = calendar.date;
  return (
    <CalendarProvider calendar={calendar}>
      <MonthView
        events={[]}
        {...props}
      />
    </CalendarProvider>
  );
}

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

const mount = (props: Partial<MonthViewProps> = {}) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<Month {...props} />));
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  return container;
};

const cell = (container: HTMLElement, day: Temporal.PlainDate) => {
  const element = container.querySelector<HTMLElement>(
    `[data-day="${day.toString()}"]`,
  );
  if (element === null) throw new Error(`No cell for ${day.toString()}`);
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

describe("MonthView in the browser", () => {
  it("marks today with aria-current and makes it the tab stop", () => {
    const container = mount();
    const todayCell = cell(container, today);
    expect(todayCell.getAttribute("aria-current")).toBe("date");
    expect(todayCell.getAttribute("data-today")).toBe("true");
    expect(todayCell.tabIndex).toBe(0);
    expect(todayCell.querySelector("span")?.className).toContain(
      "bg-uc-primary",
    );
  });

  it("moves focus with the arrow keys and consumes the keys it handles", () => {
    const container = mount();
    const start = cell(container, today);
    act(() => start.focus());

    const down = press(start, "ArrowDown");
    const below = today.add({
      weeks: 1,
    });
    if (container.querySelector(`[data-day="${below.toString()}"]`) !== null) {
      expect(down.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(cell(container, below));
      expect(cell(container, below).tabIndex).toBe(0);
      expect(start.tabIndex).toBe(-1);
    }

    const focused = document.activeElement as HTMLElement;
    press(focused, "Home", {
      ctrlKey: true,
    });
    const first = container.querySelector<HTMLElement>('[role="gridcell"]');
    expect(document.activeElement).toBe(first);
    // At the edge the key isn't consumed, so the global shortcuts can move to the previous month.
    expect(press(first as HTMLElement, "ArrowLeft").defaultPrevented).toBe(
      false,
    );
  });

  it("opens the focused day in the day view on Enter by default", () => {
    const container = mount();
    const target = cell(container, today);
    act(() => target.focus());
    expect(press(target, "Enter").defaultPrevented).toBe(true);
    expect(view).toBe("day");
    expect(date?.equals(today)).toBe(true);
  });

  it("calls onDayClick instead when given, on click and on Space", () => {
    const onDayClick = vi.fn();
    const container = mount({
      onDayClick,
    });
    const target = cell(container, today);
    act(() => target.click());
    act(() => target.focus());
    press(target, " ");
    expect(onDayClick).toHaveBeenCalledTimes(2);
    expect(onDayClick.mock.calls[0]?.[0].equals(today)).toBe(true);
    expect(view).toBe("month");
  });

  it("calls onEventClick with the event, without picking the day underneath", () => {
    const onDayClick = vi.fn();
    const onEventClick = vi.fn();
    const event: CalendarEvent = {
      data: {
        row: 7,
      },
      endAt: `${today.toString()}T10:00:00Z`,
      id: "evt_1",
      startAt: `${today.toString()}T09:00:00Z`,
      title: "Standup",
    };
    const container = mount({
      events: [
        event,
      ],
      onDayClick,
      onEventClick,
    });
    const button = [
      ...container.querySelectorAll("button"),
    ].find((element) => element.textContent?.includes("Standup"));
    act(() => button?.click());
    expect(onEventClick).toHaveBeenCalledWith(event);
    expect(onDayClick).not.toHaveBeenCalled();
  });
});
