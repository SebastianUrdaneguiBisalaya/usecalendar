// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Calendar, type CalendarProps } from "../../src/calendar/calendar.js";
import "../render-hook.js";

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

const mount = (props: Partial<CalendarProps> = {}) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() =>
    root.render(
      <Calendar
        defaultDate={Temporal.PlainDate.from("2030-01-16")}
        events={[]}
        timeZone="UTC"
        {...props}
      />,
    ),
  );
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  return container;
};

const button = (container: HTMLElement, name: string) => {
  const found = [
    ...container.querySelectorAll("button"),
  ].find(
    (element) =>
      element.textContent === name ||
      element.getAttribute("aria-label") === name,
  );
  if (found === undefined) throw new Error(`No button ${name}`);
  return found;
};

const key = (target: EventTarget, init: KeyboardEventInit) =>
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
  });

describe("Calendar in the browser", () => {
  it("navigates and switches views from the toolbar", () => {
    const onRangeChange = vi.fn();
    const onViewChange = vi.fn();
    const container = mount({
      onRangeChange,
      onViewChange,
    });
    const root = container.querySelector("[data-uc-calendar]");
    expect(onRangeChange).toHaveBeenLastCalledWith(
      {
        end: "2030-01-21T00:00:00.000Z",
        start: "2030-01-14T00:00:00.000Z",
      },
      "week",
    );

    act(() => button(container, "Next").click());
    expect(onRangeChange).toHaveBeenLastCalledWith(
      {
        end: "2030-01-28T00:00:00.000Z",
        start: "2030-01-21T00:00:00.000Z",
      },
      "week",
    );

    act(() => button(container, "Month").click());
    expect(onViewChange).toHaveBeenLastCalledWith("month");
    expect(root?.getAttribute("data-view")).toBe("month");
    expect(button(container, "Month").getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("binds the global shortcuts, configurable through hotkeys", () => {
    const newEvent = vi.fn();
    const container = mount({
      hotkeyHandlers: {
        newEvent,
      },
      hotkeys: {
        monthView: "x",
      },
    });
    const root = container.querySelector("[data-uc-calendar]");
    key(document.body, {
      key: "x",
    });
    expect(root?.getAttribute("data-view")).toBe("month");
    key(document.body, {
      key: "m",
    });
    expect(root?.getAttribute("data-view")).toBe("month");
    key(document.body, {
      key: "d",
    });
    expect(root?.getAttribute("data-view")).toBe("day");
    key(document.body, {
      key: "c",
    });
    expect(newEvent).toHaveBeenCalledTimes(1);
  });

  it("opens a month day in the day view by default", () => {
    const container = mount({
      defaultView: "month",
    });
    const day = container.querySelector<HTMLElement>('[data-day="2030-01-23"]');
    act(() => day?.click());
    expect(
      container.querySelector("[data-uc-calendar]")?.getAttribute("data-view"),
    ).toBe("day");
    expect(container.textContent).toContain("Wed");
  });
});
