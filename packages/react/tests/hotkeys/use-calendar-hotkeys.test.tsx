// @vitest-environment jsdom
import { act, createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type UseCalendarOptions,
  useCalendar,
} from "../../src/calendar/use-calendar.js";
import {
  type UseCalendarHotkeysOptions,
  useCalendarHotkeys,
} from "../../src/hotkeys/use-calendar-hotkeys.js";
import { renderHook } from "../render-hook.js";

type Props = Omit<UseCalendarHotkeysOptions, "calendar"> & {
  options?: UseCalendarOptions;
};

const LIMA = "America/Lima";

const mounted: (() => void)[] = [];
const render = (props: Props) => {
  const rendered = renderHook(({ options, ...hotkeys }: Props) => {
    const calendar = useCalendar({
      timeZone: LIMA,
      ...options,
    });
    useCalendarHotkeys({
      calendar,
      ...hotkeys,
    });
    return calendar;
  }, props);
  mounted.push(rendered.unmount);
  return rendered;
};

const press = (
  key: string,
  target: EventTarget = document.body,
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

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-15T15:00:00Z"));
});
afterEach(() => {
  // Each mounted calendar listens on the document: unmount them so tests don't share listeners.
  for (const unmount of mounted.splice(0)) unmount();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("useCalendarHotkeys", () => {
  it("navigates with tempi's keys", () => {
    const { result } = render({});
    press("j");
    expect(result.current.date?.toString()).toBe("2026-11-22");
    press("ArrowLeft");
    press("k");
    expect(result.current.date?.toString()).toBe("2026-11-08");
    press("t");
    expect(result.current.date?.toString()).toBe("2026-11-15");
    press("m");
    expect(result.current.view).toBe("month");
    press("d");
    expect(result.current.view).toBe("day");
    press("w");
    expect(result.current.view).toBe("week");
  });

  it("consumes the keys it handles", () => {
    render({});
    expect(press("j").defaultPrevented).toBe(true);
    expect(press("x").defaultPrevented).toBe(false);
  });

  it("only fires app actions that have a handler", () => {
    const newEvent = vi.fn();
    render({
      handlers: {
        newEvent,
      },
    });
    expect(press("c").defaultPrevented).toBe(true);
    expect(newEvent).toHaveBeenCalledTimes(1);
    expect(press("Delete").defaultPrevented).toBe(false);
  });

  it("lets handlers replace the navigation defaults", () => {
    const next = vi.fn();
    const { result } = render({
      handlers: {
        next,
      },
    });
    press("j");
    expect(next).toHaveBeenCalledTimes(1);
    expect(result.current.date?.toString()).toBe("2026-11-15");
  });

  it("applies key overrides and turned-off actions", () => {
    const { result } = render({
      hotkeys: {
        goToToday: null,
        next: [
          "l",
        ],
      },
    });
    press("j");
    expect(result.current.date?.toString()).toBe("2026-11-15");
    press("l");
    expect(result.current.date?.toString()).toBe("2026-11-22");
    press("t");
    expect(result.current.date?.toString()).toBe("2026-11-22");
  });

  it("does nothing with hotkeys={false}", () => {
    const { result } = render({
      hotkeys: false,
    });
    expect(press("j").defaultPrevented).toBe(false);
    expect(result.current.date?.toString()).toBe("2026-11-15");
  });

  it("ignores plain keys while typing, and keys a widget already handled", () => {
    const { result } = render({});
    const input = document.body.appendChild(document.createElement("input"));
    press("j", input);
    const handled = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "j",
    });
    handled.preventDefault();
    act(() => {
      document.body.dispatchEvent(handled);
    });
    expect(result.current.date?.toString()).toBe("2026-11-15");
  });

  it('with scope "calendar", only listens inside the calendar root', () => {
    const root = document.body.appendChild(document.createElement("div"));
    const inside = root.appendChild(document.createElement("button"));
    const target = createRef<HTMLElement>() as {
      current: HTMLElement | null;
    };
    target.current = root;
    const { result } = render({
      scope: "calendar",
      target,
    });
    press("j", document.body);
    expect(result.current.date?.toString()).toBe("2026-11-15");
    press("j", inside);
    expect(result.current.date?.toString()).toBe("2026-11-22");
  });

  it("stops listening when unmounted", () => {
    const { result, unmount } = render({});
    unmount();
    press("j");
    expect(result.current.date?.toString()).toBe("2026-11-15");
  });
});

describe("several calendars on the document", () => {
  const twoCalendars = () => {
    const first = document.body.appendChild(document.createElement("div"));
    const second = document.body.appendChild(document.createElement("div"));
    const firstButton = first.appendChild(document.createElement("button"));
    const secondButton = second.appendChild(document.createElement("button"));
    const a = render({
      target: {
        current: first,
      },
    });
    const b = render({
      target: {
        current: second,
      },
    });
    return {
      a,
      b,
      firstButton,
      secondButton,
    };
  };

  it("lets only one calendar handle each key: the one mounted last, until the user interacts", () => {
    const { a, b } = twoCalendars();
    press("j");
    expect(a.result.current.date?.toString()).toBe("2026-11-15");
    expect(b.result.current.date?.toString()).toBe("2026-11-22");
  });

  it("follows the calendar the user last clicked or focused", () => {
    const { a, b, firstButton, secondButton } = twoCalendars();
    act(() => {
      firstButton.dispatchEvent(
        new Event("pointerdown", {
          bubbles: true,
        }),
      );
    });
    press("j");
    expect(a.result.current.date?.toString()).toBe("2026-11-22");
    expect(b.result.current.date?.toString()).toBe("2026-11-15");
    act(() => secondButton.focus());
    press("j");
    expect(b.result.current.date?.toString()).toBe("2026-11-22");
    expect(a.result.current.date?.toString()).toBe("2026-11-22");
  });

  it("falls back to the remaining calendar when the active one unmounts", () => {
    const { a, b, secondButton } = twoCalendars();
    act(() => secondButton.focus());
    b.unmount();
    press("j");
    expect(a.result.current.date?.toString()).toBe("2026-11-22");
  });
});
