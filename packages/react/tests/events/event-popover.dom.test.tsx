// @vitest-environment jsdom
import type { CalendarEvent, CalendarView } from "@usecalendar/core";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarProvider } from "../../src/calendar/calendar-context.js";
import { useCalendar } from "../../src/calendar/use-calendar.js";
import type { EventPopoverOptions } from "../../src/events/event-popover.js";
import { MonthView } from "../../src/month/month-view.js";
import { TimeGridView } from "../../src/time-grid/time-grid-view.js";
import "../render-hook.js";

const standup: CalendarEvent = {
  description: "Daily sync.\nBring blockers.",
  endAt: "2030-01-16T10:00:00Z",
  id: "standup",
  location: "Room 4",
  startAt: "2030-01-16T09:00:00Z",
  title: "Standup",
};
const offsite: CalendarEvent = {
  allDay: true,
  endAt: "2030-01-18T00:00:00Z",
  id: "offsite",
  startAt: "2030-01-17T00:00:00Z",
  title: "Offsite",
};

type Props = EventPopoverOptions & {
  events?: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
};

function View({
  events = [
    standup,
    offsite,
  ],
  view,
  ...props
}: Props & {
  view: CalendarView;
}) {
  const calendar = useCalendar({
    date: Temporal.PlainDate.from("2030-01-16"),
    timeZone: "UTC",
    view,
  });
  return (
    <CalendarProvider calendar={calendar}>
      {view === "month" ? (
        <MonthView
          events={events}
          {...props}
        />
      ) : (
        <TimeGridView
          events={events}
          scrollToTime={Temporal.PlainTime.from("08:00")}
          {...props}
        />
      )}
    </CalendarProvider>
  );
}

// jsdom has no Popover API and, like browsers, won't focus a popover that isn't shown. The stub records how it was
// shown and drops the attribute, which is what makes a shown popover focusable.
let shownAs: string[] = [];
beforeEach(() => {
  shownAs = [];
  HTMLElement.prototype.showPopover = function showPopover(this: HTMLElement) {
    shownAs.push(this.getAttribute("popover") ?? "");
    this.removeAttribute("popover");
  };
});

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.useRealTimers();
  Reflect.deleteProperty(HTMLElement.prototype, "showPopover");
});

const mount = (props: Props, view: CalendarView = "month") => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = (next: Props) =>
    act(() =>
      root.render(
        <View
          view={view}
          {...next}
        />,
      ),
    );
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

const eventButton = (container: HTMLElement, title: string) => {
  const button = [
    ...container.querySelectorAll<HTMLButtonElement>("button"),
  ].find((element) => element.textContent?.includes(title) === true);
  if (button === undefined) throw new Error(`No button for ${title}`);
  return button;
};
const dialog = () =>
  document.querySelector<HTMLElement>('[role="dialog"][data-uc-event-popover]');

const click = (target: HTMLElement) =>
  act(() => {
    target.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
      }),
    );
    target.click();
  });
const pointer = (
  target: EventTarget,
  type: string,
  pointerType: string,
  relatedTarget: EventTarget | null = null,
) =>
  act(() => {
    const event = new MouseEvent(type, {
      bubbles: true,
      relatedTarget,
    });
    Object.assign(event, {
      pointerType,
    });
    target.dispatchEvent(event);
  });
const press = (target: EventTarget, key: string) => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
};

describe("event popover", () => {
  it("is off by default", () => {
    const { container } = mount({});
    const button = eventButton(container, "Standup");
    expect(button.hasAttribute("aria-haspopup")).toBe(false);
    click(button);
    expect(dialog()).toBeNull();
  });

  it("opens on click with the event's details, still calling onEventClick, and a second click closes it", () => {
    const onEventClick = vi.fn();
    const { container } = mount({
      eventPopover: "click",
      onEventClick,
    });
    const button = eventButton(container, "Standup");
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(button.getAttribute("aria-expanded")).toBe("false");

    click(button);
    const popover = dialog();
    expect(popover?.getAttribute("aria-label")).toBe("Standup");
    expect(shownAs).toEqual([
      "manual",
    ]);
    expect(popover?.textContent).toContain("Wednesday, January 16, 2030");
    expect(popover?.textContent).toContain("Room 4");
    expect(popover?.textContent).toContain("Bring blockers.");
    expect(onEventClick).toHaveBeenCalledWith(standup);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.style.getPropertyValue("anchor-name")).not.toBe("");
    expect(document.activeElement).toBe(popover);

    click(button);
    expect(dialog()).toBeNull();
    expect(onEventClick).toHaveBeenCalledTimes(2);
    expect(button.style.getPropertyValue("anchor-name")).toBe("");
  });

  it("closes on Escape, consuming it, and gives focus back to the event", () => {
    const { container } = mount({
      eventPopover: "click",
    });
    const button = eventButton(container, "Standup");
    click(button);
    const popover = dialog();
    if (popover === null) throw new Error("Not open");
    const keydown = press(popover, "Escape");
    expect(keydown.defaultPrevented).toBe(true);
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("closes on a press outside, but not on a press inside", () => {
    const { container } = mount({
      eventPopover: "click",
    });
    click(eventButton(container, "Standup"));
    const popover = dialog();
    if (popover === null) throw new Error("Not open");
    pointer(popover, "pointerdown", "mouse");
    expect(dialog()).not.toBeNull();
    pointer(document.body, "pointerdown", "mouse");
    expect(dialog()).toBeNull();
  });

  it("opens after hovering with a mouse and closes after leaving, but never on touch hover", () => {
    vi.useFakeTimers();
    const { container } = mount({
      eventPopover: "hover",
    });
    const button = eventButton(container, "Standup");

    pointer(button, "pointerover", "touch");
    act(() => vi.advanceTimersByTime(1000));
    expect(dialog()).toBeNull();

    pointer(button, "pointerover", "mouse");
    act(() => vi.advanceTimersByTime(200));
    expect(dialog()).toBeNull();
    act(() => vi.advanceTimersByTime(300));
    expect(dialog()).not.toBeNull();
    // Hovering doesn't move focus.
    expect(document.activeElement).not.toBe(dialog());

    pointer(button, "pointerout", "mouse", document.body);
    act(() => vi.advanceTimersByTime(300));
    expect(dialog()).toBeNull();
  });

  it("leaves clicks to the app in hover mode: a click or tap never opens it and closes a preview", () => {
    vi.useFakeTimers();
    const onEventClick = vi.fn();
    const { container } = mount({
      eventPopover: "hover",
      onEventClick,
    });
    const button = eventButton(container, "Standup");
    click(button);
    expect(dialog()).toBeNull();
    expect(onEventClick).toHaveBeenCalledWith(standup);

    pointer(button, "pointerover", "mouse");
    act(() => vi.advanceTimersByTime(500));
    expect(dialog()).not.toBeNull();
    click(button);
    expect(dialog()).toBeNull();
    expect(onEventClick).toHaveBeenCalledTimes(2);
  });

  it("leaves Enter on a focused time-grid event to onEventClick in hover mode", () => {
    const onEventClick = vi.fn();
    const { container } = mount(
      {
        eventPopover: "hover",
        onEventClick,
      },
      "week",
    );
    const timed = container.querySelector<HTMLElement>(
      '[data-event-id="standup"]',
    );
    if (timed === null) throw new Error("No timed event");
    act(() => timed.focus());
    press(timed, "Enter");
    expect(onEventClick).toHaveBeenCalledWith(standup);
    expect(dialog()).toBeNull();
  });

  it("opens on a tap in both mode, and a hovered popover stays once clicked", () => {
    vi.useFakeTimers();
    const { container } = mount({
      eventPopover: "both",
    });
    const button = eventButton(container, "Standup");
    click(button);
    expect(dialog()).not.toBeNull();
    click(button);
    expect(dialog()).toBeNull();

    pointer(button, "pointerover", "mouse");
    act(() => vi.advanceTimersByTime(500));
    click(button);
    pointer(button, "pointerout", "mouse", document.body);
    act(() => vi.advanceTimersByTime(500));
    expect(dialog()).not.toBeNull();
  });

  it("renders custom content that can close the popover", () => {
    const { container } = mount({
      eventPopover: "click",
      renderEventPopover: ({ close, details, event, when }) => (
        <div>
          <span data-testid="custom">{`${event.title} @ ${when}`}</span>
          {details}
          <button
            onClick={close}
            type="button"
          >
            Done
          </button>
        </div>
      ),
    });
    click(eventButton(container, "Standup"));
    expect(
      dialog()?.querySelector('[data-testid="custom"]')?.textContent,
    ).toMatch(/^Standup @ Wednesday, January 16, 2030/);
    expect(dialog()?.textContent).toContain("Room 4");
    const done = dialog()?.querySelector("button");
    if (done === undefined || done === null) throw new Error("No button");
    act(() => done.click());
    expect(dialog()).toBeNull();
  });

  it("closes when its event is no longer drawn", () => {
    const { container, render } = mount({
      eventPopover: "click",
    });
    click(eventButton(container, "Standup"));
    expect(dialog()).not.toBeNull();
    render({
      eventPopover: "click",
      events: [
        offsite,
      ],
    });
    expect(dialog()).toBeNull();
  });

  it("opens from the time grid: a click on a timed event, a click on an all-day bar, Enter on a focused event", () => {
    const onEventClick = vi.fn();
    const { container } = mount(
      {
        eventPopover: "click",
        onEventClick,
      },
      "week",
    );
    const timed = container.querySelector<HTMLElement>(
      '[data-event-id="standup"]',
    );
    if (timed === null) throw new Error("No timed event");
    click(timed);
    expect(dialog()?.getAttribute("aria-label")).toBe("Standup");
    click(timed);
    expect(dialog()).toBeNull();

    click(eventButton(container, "Offsite"));
    expect(dialog()?.getAttribute("aria-label")).toBe("Offsite");
    expect(dialog()?.textContent).toContain("Thursday, January 17, 2030");
    pointer(document.body, "pointerdown", "mouse");

    act(() => timed.focus());
    const enter = press(timed, "Enter");
    expect(enter.defaultPrevented).toBe(true);
    expect(dialog()?.getAttribute("aria-label")).toBe("Standup");
    expect(onEventClick).toHaveBeenCalledTimes(4);
  });
});
