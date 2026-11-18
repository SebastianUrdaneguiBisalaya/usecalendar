import type { CalendarHotkeys } from "@usecalendar/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CalendarKeymapProvider,
  useCalendarKeymap,
} from "../../src/hotkeys/keymap-context.js";
import { useEventKeyboardHint } from "../../src/hotkeys/use-event-keyboard-hint.js";
import { CalendarLocaleProvider } from "../../src/locale/locale-context.js";

const press = (
  key: string,
  modifiers: Partial<{
    altKey: boolean;
    shiftKey: boolean;
  }> = {},
) => ({
  altKey: false,
  ctrlKey: false,
  key,
  metaKey: false,
  shiftKey: false,
  ...modifiers,
});

function GridAction({ event }: { event: ReturnType<typeof press> }) {
  return <p>{String(useCalendarKeymap().gridActionFor(event))}</p>;
}

function Hint() {
  return <p>{useEventKeyboardHint()}</p>;
}

const withKeys = (
  hotkeys: CalendarHotkeys | undefined,
  children: React.ReactNode,
) =>
  renderToStaticMarkup(
    <CalendarKeymapProvider hotkeys={hotkeys}>
      {children}
    </CalendarKeymapProvider>,
  );

describe("CalendarKeymapProvider", () => {
  it("gives grids tempi's keys by default", () => {
    expect(
      renderToStaticMarkup(
        <GridAction
          event={press("ArrowUp", {
            altKey: true,
          })}
        />,
      ),
    ).toBe("<p>moveEventUp</p>");
    expect(renderToStaticMarkup(<GridAction event={press("Enter")} />)).toBe(
      "<p>openFocused</p>",
    );
  });

  it("applies overrides and turned-off actions to the grids", () => {
    expect(
      withKeys(
        {
          moveEventUp: "shift+arrowup",
        },
        <GridAction
          event={press("ArrowUp", {
            shiftKey: true,
          })}
        />,
      ),
    ).toBe("<p>moveEventUp</p>");
    expect(
      withKeys(
        {
          moveEventUp: "shift+arrowup",
        },
        <GridAction
          event={press("ArrowUp", {
            altKey: true,
          })}
        />,
      ),
    ).toBe("<p>null</p>");
    expect(withKeys(false, <GridAction event={press("Enter")} />)).toBe(
      "<p>null</p>",
    );
  });
});

describe("useEventKeyboardHint", () => {
  it("describes tempi's keys by default", () => {
    expect(renderToStaticMarkup(<Hint />)).toBe(
      "<p>Alt+Up Arrow or Alt+Down Arrow moves it earlier or later. Alt+Left Arrow or Alt+Right Arrow moves it to another day. Alt+Shift+Up Arrow or Alt+Shift+Down Arrow changes its end.</p>",
    );
  });

  it("reflects remapped and turned-off shortcuts", () => {
    const html = withKeys(
      {
        extendEvent: null,
        moveEventToNextDay: null,
        moveEventToPreviousDay: null,
        moveEventUp: "shift+arrowup",
        shortenEvent: null,
      },
      <Hint />,
    );
    expect(html).toBe(
      "<p>Shift+Up Arrow or Alt+Down Arrow moves it earlier or later.</p>",
    );
  });

  it("uses a translated label", () => {
    const html = renderToStaticMarkup(
      <CalendarLocaleProvider
        labels={{
          eventKeyboardHint: (keys) => `Mover: ${keys.moveEventUp}`,
        }}
      >
        <Hint />
      </CalendarLocaleProvider>,
    );
    expect(html).toBe("<p>Mover: Alt+Up Arrow</p>");
  });
});
