// @vitest-environment jsdom
import { act, type ReactNode, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type CalendarState,
  useCalendar,
} from "../../src/calendar/use-calendar.js";
import { CalendarKeymapProvider } from "../../src/hotkeys/keymap-context.js";
import {
  MiniCalendar,
  type MiniCalendarProps,
} from "../../src/mini/mini-calendar.js";
import "../render-hook.js";

const day = (iso: string) => Temporal.PlainDate.from(iso);
const today = Temporal.Now.plainDateISO("UTC");

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

const mountNode = (node: ReactNode) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(node));
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  return {
    container,
    rerender: (next: ReactNode) => act(() => root.render(next)),
  };
};
const mount = (props: Partial<MiniCalendarProps> = {}) =>
  mountNode(
    <MiniCalendar
      timeZone="UTC"
      {...props}
    />,
  );

const option = (container: HTMLElement, iso: string) => {
  const element = container.querySelector<HTMLElement>(`[data-day="${iso}"]`);
  if (element === null) throw new Error(`No day ${iso}`);
  return element;
};
const shown = (container: HTMLElement) =>
  [
    ...container.querySelectorAll("[role=option]"),
  ].map((element) => element.getAttribute("data-day"));
const selected = (container: HTMLElement) =>
  container.querySelector("[data-selected]")?.getAttribute("data-day") ?? null;
const focusedDay = () => document.activeElement?.getAttribute("data-day");
const button = (container: HTMLElement, label: string) => {
  const element = container.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );
  if (element === null) throw new Error(`No button ${label}`);
  return element;
};
const click = (element: HTMLElement) => act(() => element.click());
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

describe("MiniCalendar in the browser", () => {
  it("marks today and makes it the tab stop without a selection", () => {
    const { container } = mount();
    const todayOption = option(container, today.toString());
    expect(todayOption.getAttribute("aria-current")).toBe("date");
    expect(todayOption.getAttribute("data-today")).toBe("true");
    expect(todayOption.className).toContain("bg-uc-muted");
    expect(todayOption.tabIndex).toBe(0);
    expect(selected(container)).toBeNull();
  });

  it("selects a clicked day when uncontrolled", () => {
    const onValueChange = vi.fn();
    const { container } = mount({
      defaultValue: day("2026-11-19"),
      onValueChange,
    });
    expect(selected(container)).toBe("2026-11-19");
    click(option(container, "2026-11-21"));
    expect(selected(container)).toBe("2026-11-21");
    expect(onValueChange).toHaveBeenCalledWith(day("2026-11-21"));
    // Picking a day never moves the strip.
    expect(shown(container)[0]).toBe("2026-11-16");
  });

  it("only reports the pick when controlled", () => {
    const onValueChange = vi.fn();
    const { container, rerender } = mount({
      onValueChange,
      value: day("2026-11-19"),
    });
    click(option(container, "2026-11-20"));
    expect(onValueChange).toHaveBeenCalledWith(day("2026-11-20"));
    expect(selected(container)).toBe("2026-11-19");
    rerender(
      <MiniCalendar
        timeZone="UTC"
        value={day("2026-11-20")}
      />,
    );
    expect(selected(container)).toBe("2026-11-20");
  });

  it("jumps to a controlled value outside the strip", () => {
    const { container, rerender } = mount({
      value: day("2026-11-19"),
    });
    click(button(container, "Next days"));
    expect(shown(container)[0]).toBe("2026-11-23");
    rerender(
      <MiniCalendar
        timeZone="UTC"
        value={day("2027-01-06")}
      />,
    );
    expect(shown(container)[0]).toBe("2027-01-04");
  });

  it("pages with the arrows and reports the start and range", () => {
    const onStartChange = vi.fn();
    const onRangeChange = vi.fn();
    const { container } = mount({
      defaultValue: day("2026-11-19"),
      onRangeChange,
      onStartChange,
    });
    expect(onRangeChange).toHaveBeenLastCalledWith(
      day("2026-11-16"),
      day("2026-11-22"),
    );
    click(button(container, "Next days"));
    expect(onStartChange).toHaveBeenLastCalledWith(day("2026-11-23"));
    expect(onRangeChange).toHaveBeenLastCalledWith(
      day("2026-11-23"),
      day("2026-11-29"),
    );
    click(button(container, "Previous days"));
    click(button(container, "Previous days"));
    expect(shown(container)[0]).toBe("2026-11-09");
    expect(onRangeChange).toHaveBeenCalledTimes(4);
  });

  it("moves one day per arrow with step day", () => {
    const { container } = mount({
      defaultValue: day("2026-11-19"),
      step: "day",
    });
    click(button(container, "Next days"));
    expect(shown(container)[0]).toBe("2026-11-17");
  });

  it("keeps a controlled start", () => {
    const onStartChange = vi.fn();
    const { container } = mount({
      onStartChange,
      start: day("2026-11-02"),
    });
    click(button(container, "Next days"));
    expect(onStartChange).toHaveBeenCalledWith(day("2026-11-09"));
    expect(shown(container)[0]).toBe("2026-11-02");
  });

  it("stops paging and selecting at minDate and maxDate", () => {
    const onValueChange = vi.fn();
    const { container } = mount({
      defaultValue: day("2026-11-19"),
      maxDate: day("2026-11-25"),
      minDate: day("2026-11-10"),
      onValueChange,
    });
    expect(button(container, "Previous days").disabled).toBe(false);
    click(button(container, "Previous days"));
    expect(shown(container)[0]).toBe("2026-11-09");
    expect(button(container, "Previous days").disabled).toBe(true);
    click(option(container, "2026-11-09"));
    expect(onValueChange).not.toHaveBeenCalled();
    click(button(container, "Next days"));
    click(button(container, "Next days"));
    expect(shown(container)[0]).toBe("2026-11-23");
    expect(button(container, "Next days").disabled).toBe(true);
    // The keyboard doesn't page past the limit either.
    const last = option(container, "2026-11-29");
    act(() => last.focus());
    press(last, "ArrowRight");
    expect(shown(container)[0]).toBe("2026-11-23");
  });

  it("moves focus with the arrows, Home/End and PageUp/PageDown", () => {
    const { container } = mount({
      defaultValue: day("2026-11-19"),
    });
    const start = option(container, "2026-11-19");
    act(() => start.focus());
    expect(press(start, "ArrowRight").defaultPrevented).toBe(true);
    expect(focusedDay()).toBe("2026-11-20");
    press(option(container, "2026-11-20"), "End");
    expect(focusedDay()).toBe("2026-11-22");
    press(option(container, "2026-11-22"), "Home");
    expect(focusedDay()).toBe("2026-11-16");
    // Past the first day the strip pages back and focus lands on the far end.
    press(option(container, "2026-11-16"), "ArrowLeft");
    expect(shown(container)[0]).toBe("2026-11-09");
    expect(focusedDay()).toBe("2026-11-15");
    press(option(container, "2026-11-15"), "PageDown");
    expect(shown(container)[0]).toBe("2026-11-16");
    expect(focusedDay()).toBe("2026-11-22");
    // The focused day is the tab stop.
    expect(option(container, "2026-11-22").tabIndex).toBe(0);
    expect(option(container, "2026-11-19").tabIndex).toBe(-1);
  });

  it("selects the focused day with Enter and Space", () => {
    const { container } = mount({
      defaultValue: day("2026-11-19"),
    });
    const target = option(container, "2026-11-20");
    act(() => target.focus());
    expect(press(target, "Enter").defaultPrevented).toBe(true);
    expect(selected(container)).toBe("2026-11-20");
    press(option(container, "2026-11-21"), " ");
    expect(selected(container)).toBe("2026-11-21");
  });

  it("pages with next/previous and shows today with goToToday", () => {
    const { container } = mount({
      defaultValue: day("2020-01-08"),
    });
    const start = option(container, "2020-01-08");
    act(() => start.focus());
    press(start, "j");
    expect(shown(container)[0]).toBe("2020-01-13");
    expect(focusedDay()).toBe("2020-01-15");
    press(option(container, "2020-01-15"), "t");
    expect(shown(container)).toContain(today.toString());
    expect(focusedDay()).toBe(today.toString());
  });

  it("follows the CalendarKeymapProvider shortcuts", () => {
    const { container } = mountNode(
      <CalendarKeymapProvider
        hotkeys={{
          openFocused: "x",
        }}
      >
        <MiniCalendar
          defaultValue={day("2026-11-19")}
          timeZone="UTC"
        />
      </CalendarKeymapProvider>,
    );
    const target = option(container, "2026-11-20");
    expect(press(target, "Enter").defaultPrevented).toBe(false);
    expect(selected(container)).toBe("2026-11-19");
    press(target, "x");
    expect(selected(container)).toBe("2026-11-20");
  });

  it("uses its own hotkeys over the provider's", () => {
    const { container } = mount({
      defaultValue: day("2026-11-19"),
      hotkeys: false,
    });
    const target = option(container, "2026-11-20");
    expect(press(target, "Enter").defaultPrevented).toBe(false);
    press(target, "j");
    expect(selected(container)).toBe("2026-11-19");
    expect(shown(container)[0]).toBe("2026-11-16");
    // Focus keys aren't shortcuts: they always work.
    act(() => target.focus());
    press(target, "ArrowRight");
    expect(focusedDay()).toBe("2026-11-21");
  });

  it("stays in sync with a full calendar", () => {
    let calendar: CalendarState | undefined;
    function Synced() {
      calendar = useCalendar({
        defaultDate: day("2026-11-19"),
        timeZone: "UTC",
        weekStart: "sunday",
      });
      return <MiniCalendar calendar={calendar} />;
    }
    const { container } = mountNode(<Synced />);
    expect(selected(container)).toBe("2026-11-19");
    expect(shown(container)[0]).toBe("2026-11-15");
    click(option(container, "2026-11-17"));
    expect(calendar?.date?.toString()).toBe("2026-11-17");
    expect(selected(container)).toBe("2026-11-17");
    act(() => calendar?.goToNext());
    expect(selected(container)).toBe("2026-11-24");
    expect(shown(container)[0]).toBe("2026-11-22");
  });

  it("keeps a controlled value of its own next to a calendar", () => {
    function Both() {
      const calendar = useCalendar({
        defaultDate: day("2026-11-19"),
        timeZone: "UTC",
      });
      const [value, setValue] = useState(day("2026-11-18"));
      return (
        <>
          <MiniCalendar
            calendar={calendar}
            onValueChange={setValue}
            value={value}
          />
          <output>{calendar.date?.toString()}</output>
        </>
      );
    }
    const { container } = mountNode(<Both />);
    expect(selected(container)).toBe("2026-11-18");
    click(option(container, "2026-11-20"));
    expect(selected(container)).toBe("2026-11-20");
    expect(container.querySelector("output")?.textContent).toBe("2026-11-20");
  });
});
