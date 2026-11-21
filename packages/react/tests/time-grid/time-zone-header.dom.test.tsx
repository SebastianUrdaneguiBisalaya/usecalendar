// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TimeZoneHeader,
  type TimeZonePopoverOptions,
} from "../../src/time-grid/time-zone-header.js";
import "../render-hook.js";

let cleanup: (() => void) | undefined;

// jsdom has no Popover API: the stub only marks the element as shown.
beforeEach(() => {
  HTMLElement.prototype.showPopover = function showPopover(this: HTMLElement) {
    this.removeAttribute("popover");
  };
  HTMLElement.prototype.matches = new Proxy(HTMLElement.prototype.matches, {
    apply: (target, element, args) =>
      args[0] === ":popover-open"
        ? false
        : Reflect.apply(target, element, args),
  });
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.useRealTimers();
  Reflect.deleteProperty(HTMLElement.prototype, "showPopover");
});

const mount = (options: TimeZonePopoverOptions) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() =>
    root.render(
      <TimeZoneHeader
        className={undefined}
        name={{
          description: "GMT-5",
          label: "Perú",
        }}
        popoverClassName="my-popover"
        timeZone="America/Lima"
        {...options}
      />,
    ),
  );
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  return container;
};

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');

describe("time zone popover", () => {
  it("is off by default", () => {
    const container = mount({});
    expect(container.querySelector("button")).toBeNull();
    expect(dialog()).toBeNull();
  });

  it("opens on click, toggles, and closes with Escape", () => {
    const container = mount({
      timeZonePopover: "click",
    });
    const button = container.querySelector("button");
    expect(button?.getAttribute("aria-haspopup")).toBe("dialog");
    act(() => button?.click());
    expect(dialog()?.textContent).toContain("Perú");
    expect(dialog()?.textContent).toContain("GMT-5");
    expect(dialog()?.classList.contains("my-popover")).toBe(true);
    expect(dialog()?.getAttribute("aria-label")).toBe("Perú, GMT-5");
    act(() => button?.click());
    expect(dialog()).toBeNull();
    act(() => button?.click());
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "Escape",
        }),
      );
    });
    expect(dialog()).toBeNull();
  });

  it("previews on hover after a delay without a button", () => {
    vi.useFakeTimers();
    const container = mount({
      timeZonePopover: "hover",
    });
    expect(container.querySelector("button")).toBeNull();
    const target = container.querySelector(":scope > div > div");
    act(() => {
      const hover = new MouseEvent("pointerover", {
        bubbles: true,
      });
      Object.assign(hover, {
        pointerType: "mouse",
      });
      target?.dispatchEvent(hover);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(dialog()).not.toBeNull();
  });

  it("renders a custom popover with the default details", () => {
    const container = mount({
      renderTimeZonePopover: ({ details, timeZone }) => (
        <section>
          {details}
          <small>{timeZone}</small>
        </section>
      ),
      timeZonePopover: "click",
    });
    act(() => container.querySelector("button")?.click());
    expect(dialog()?.querySelector("section small")?.textContent).toBe(
      "America/Lima",
    );
    expect(dialog()?.textContent).toContain("GMT-5");
  });
});
