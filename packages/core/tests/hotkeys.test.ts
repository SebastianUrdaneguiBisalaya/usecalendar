import { describe, expect, it } from "vitest";
import { nextFocus, nextMonthFocus } from "../src/grid-focus.js";
import {
  ariaKeyShortcut,
  CALENDAR_FOCUS_ACTIONS,
  CALENDAR_FOCUS_KEYS,
  CALENDAR_KEYMAP,
  describeHotkey,
  GLOBAL_HOTKEY_ACTIONS,
  GRID_HOTKEY_ACTIONS,
  hotkeyActionFor,
  matchesHotkey,
  parseHotkey,
  resolveKeymap,
} from "../src/hotkeys.js";

const press = (
  key: string,
  modifiers: Partial<{
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
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

describe("CALENDAR_KEYMAP", () => {
  it("has tempi's keys", () => {
    expect(
      Object.fromEntries(
        Object.entries(CALENDAR_KEYMAP).map(([action, { keys }]) => [
          action,
          keys,
        ]),
      ),
    ).toEqual({
      cancelDrag: [
        "escape",
      ],
      close: [
        "escape",
      ],
      dayView: [
        "d",
      ],
      deleteEvent: [
        "backspace",
        "delete",
      ],
      extendEvent: [
        "alt+shift+arrowdown",
      ],
      goToDate: [
        ".",
      ],
      goToToday: [
        "t",
      ],
      monthView: [
        "m",
      ],
      moveEventDown: [
        "alt+arrowdown",
      ],
      moveEventToNextDay: [
        "alt+arrowright",
      ],
      moveEventToPreviousDay: [
        "alt+arrowleft",
      ],
      moveEventUp: [
        "alt+arrowup",
      ],
      newEvent: [
        "c",
      ],
      next: [
        "j",
        "arrowright",
      ],
      openFocused: [
        "enter",
        "space",
      ],
      previous: [
        "k",
        "arrowleft",
      ],
      shortenEvent: [
        "alt+shift+arrowup",
      ],
      weekView: [
        "w",
      ],
    });
  });

  it("splits actions into global and grid ones", () => {
    expect(
      [
        ...GLOBAL_HOTKEY_ACTIONS,
        ...GRID_HOTKEY_ACTIONS,
      ].sort(),
    ).toEqual(Object.keys(CALENDAR_KEYMAP).sort());
    expect(
      GRID_HOTKEY_ACTIONS.every(
        (action) => CALENDAR_KEYMAP[action].group === "grid",
      ),
    ).toBe(true);
  });
});

describe("CALENDAR_FOCUS_KEYS", () => {
  // KeyboardEvent.key names of the keys the focus functions switch on.
  const EVENT_KEYS: Readonly<Record<string, string>> = {
    arrowdown: "ArrowDown",
    arrowleft: "ArrowLeft",
    arrowright: "ArrowRight",
    arrowup: "ArrowUp",
    end: "End",
    home: "Home",
    pagedown: "PageDown",
    pageup: "PageUp",
  };
  const combos = Object.values(CALENDAR_FOCUS_KEYS).flatMap(({ keys }) => keys);
  const focus = {
    day: 1,
    eventId: null,
    slot: 18,
  };

  it("lists every focus action once, under the focus group", () => {
    expect(Object.keys(CALENDAR_FOCUS_KEYS).sort()).toEqual(
      [
        ...CALENDAR_FOCUS_ACTIONS,
      ].sort(),
    );
    expect(
      Object.values(CALENDAR_FOCUS_KEYS).every(
        ({ group }) => group === "focus",
      ),
    ).toBe(true);
    expect(new Set(combos).size).toBe(combos.length);
  });

  it("lists only keys the time grid handles", () => {
    for (const combo of combos) {
      const { key, mod } = parseHotkey(combo);
      const eventKey = EVENT_KEYS[key];
      expect(eventKey, combo).toBeDefined();
      expect(
        nextFocus(focus, eventKey ?? "", mod, [], 3),
        combo,
      ).not.toBeNull();
    }
  });

  it("lists every key the month grid handles", () => {
    for (const combo of combos) {
      const { key, mod } = parseHotkey(combo);
      const moved = nextMonthFocus(
        {
          column: 3,
          row: 2,
        },
        EVENT_KEYS[key] ?? "",
        mod,
        5,
        7,
      );
      expect(moved === null, combo).toBe(
        key === "pageup" || key === "pagedown",
      );
    }
  });

  it("shares only ←/→ with the defaults (next/previous outside a grid)", () => {
    const configurable = new Set(
      Object.values(CALENDAR_KEYMAP).flatMap(({ keys }) => keys),
    );
    expect(combos.filter((combo) => configurable.has(combo)).sort()).toEqual([
      "arrowleft",
      "arrowright",
    ]);
  });

  it("is spelled per platform by describeHotkey", () => {
    expect(
      describeHotkey(CALENDAR_FOCUS_KEYS.focusFirst.keys[0] ?? "", true),
    ).toBe("Command+Home");
    expect(
      describeHotkey(CALENDAR_FOCUS_KEYS.focusFirst.keys[0] ?? "", false),
    ).toBe("Ctrl+Home");
  });
});

describe("resolveKeymap", () => {
  it("uses the defaults for true or nothing", () => {
    expect(resolveKeymap(undefined).next).toEqual([
      "j",
      "arrowright",
    ]);
    expect(resolveKeymap(true).moveEventUp).toEqual([
      "alt+arrowup",
    ]);
  });

  it("turns everything off with false", () => {
    expect(
      Object.values(resolveKeymap(false)).every((keys) => keys.length === 0),
    ).toBe(true);
  });

  it("replaces keys per action, turns actions off with null, and keeps the rest", () => {
    const keymap = resolveKeymap({
      deleteEvent: null,
      goToToday: "h",
      moveEventUp: "shift+arrowup",
      next: [
        "l",
      ],
    });
    expect(keymap.next).toEqual([
      "l",
    ]);
    expect(keymap.goToToday).toEqual([
      "h",
    ]);
    expect(keymap.moveEventUp).toEqual([
      "shift+arrowup",
    ]);
    expect(keymap.deleteEvent).toEqual([]);
    expect(keymap.previous).toEqual([
      "k",
      "arrowleft",
    ]);
  });
});

describe("parseHotkey", () => {
  it("reads modifiers and the key, case-insensitively", () => {
    expect(parseHotkey("Mod+Shift+Z")).toEqual({
      alt: false,
      ctrl: false,
      key: "z",
      meta: false,
      mod: true,
      shift: true,
    });
    expect(parseHotkey("cmd+option+k")).toMatchObject({
      alt: true,
      key: "k",
      meta: true,
    });
  });

  it("names + and space", () => {
    expect(parseHotkey("ctrl+plus").key).toBe("+");
    expect(parseHotkey("space").key).toBe(" ");
  });
});

describe("matchesHotkey", () => {
  it("matches plain keys only without Ctrl, Alt or ⌘", () => {
    expect(matchesHotkey(press("t"), "t", false)).toBe(true);
    expect(
      matchesHotkey(
        press("t", {
          metaKey: true,
        }),
        "t",
        true,
      ),
    ).toBe(false);
    expect(
      matchesHotkey(
        press("t", {
          ctrlKey: true,
        }),
        "t",
        false,
      ),
    ).toBe(false);
    expect(matchesHotkey(press("ArrowRight"), "arrowright", false)).toBe(true);
    expect(
      matchesHotkey(
        press("ArrowRight", {
          altKey: true,
        }),
        "arrowright",
        false,
      ),
    ).toBe(false);
  });

  it("ignores Caps Lock", () => {
    expect(matchesHotkey(press("T"), "t", false)).toBe(true);
  });

  it("requires Shift to match for letters, named keys and Space", () => {
    expect(
      matchesHotkey(
        press("T", {
          shiftKey: true,
        }),
        "t",
        false,
      ),
    ).toBe(false);
    expect(
      matchesHotkey(
        press("T", {
          shiftKey: true,
        }),
        "shift+t",
        false,
      ),
    ).toBe(true);
    expect(
      matchesHotkey(
        press("ArrowUp", {
          altKey: true,
          shiftKey: true,
        }),
        "alt+arrowup",
        false,
      ),
    ).toBe(false);
    expect(
      matchesHotkey(
        press("ArrowUp", {
          altKey: true,
          shiftKey: true,
        }),
        "alt+shift+arrowup",
        false,
      ),
    ).toBe(true);
    expect(
      matchesHotkey(
        press(" ", {
          shiftKey: true,
        }),
        "space",
        false,
      ),
    ).toBe(false);
  });

  it("ignores Shift for symbols, which need it on many layouts", () => {
    expect(
      matchesHotkey(
        press("?", {
          shiftKey: true,
        }),
        "?",
        false,
      ),
    ).toBe(true);
    expect(
      matchesHotkey(
        press(".", {
          shiftKey: true,
        }),
        ".",
        false,
      ),
    ).toBe(true);
  });

  it("maps mod to ⌘ on macOS and Ctrl elsewhere", () => {
    expect(
      matchesHotkey(
        press("z", {
          metaKey: true,
        }),
        "mod+z",
        true,
      ),
    ).toBe(true);
    expect(
      matchesHotkey(
        press("z", {
          ctrlKey: true,
        }),
        "mod+z",
        true,
      ),
    ).toBe(false);
    expect(
      matchesHotkey(
        press("z", {
          ctrlKey: true,
        }),
        "mod+z",
        false,
      ),
    ).toBe(true);
  });
});

describe("hotkeyActionFor", () => {
  const keymap = resolveKeymap(true);

  it("finds the global action bound to a key press", () => {
    expect(
      hotkeyActionFor(press("j"), keymap, false, GLOBAL_HOTKEY_ACTIONS),
    ).toBe("next");
    expect(
      hotkeyActionFor(press("Delete"), keymap, false, GLOBAL_HOTKEY_ACTIONS),
    ).toBe("deleteEvent");
    expect(
      hotkeyActionFor(press("x"), keymap, false, GLOBAL_HOTKEY_ACTIONS),
    ).toBeNull();
  });

  it("finds grid actions only among grid actions", () => {
    const altUp = press("ArrowUp", {
      altKey: true,
    });
    expect(hotkeyActionFor(altUp, keymap, false, GRID_HOTKEY_ACTIONS)).toBe(
      "moveEventUp",
    );
    expect(
      hotkeyActionFor(altUp, keymap, false, GLOBAL_HOTKEY_ACTIONS),
    ).toBeNull();
    expect(
      hotkeyActionFor(
        press("ArrowDown", {
          altKey: true,
          shiftKey: true,
        }),
        keymap,
        false,
        GRID_HOTKEY_ACTIONS,
      ),
    ).toBe("extendEvent");
    expect(
      hotkeyActionFor(press(" "), keymap, false, GRID_HOTKEY_ACTIONS),
    ).toBe("openFocused");
    expect(
      hotkeyActionFor(press("Escape"), keymap, false, GRID_HOTKEY_ACTIONS),
    ).toBe("cancelDrag");
  });

  it("finds nothing for actions turned off", () => {
    expect(
      hotkeyActionFor(
        press("j"),
        resolveKeymap({
          next: null,
        }),
        false,
        GLOBAL_HOTKEY_ACTIONS,
      ),
    ).toBeNull();
  });
});

describe("describeHotkey", () => {
  it("spells keys out with the platform's modifier names", () => {
    expect(describeHotkey("alt+shift+arrowup", true)).toBe(
      "Option+Shift+Up Arrow",
    );
    expect(describeHotkey("alt+arrowleft", false)).toBe("Alt+Left Arrow");
    expect(describeHotkey("mod+z", true)).toBe("Command+Z");
    expect(describeHotkey("mod+z", false)).toBe("Ctrl+Z");
    expect(describeHotkey("space", false)).toBe("Space");
    expect(describeHotkey(".", false)).toBe(".");
    expect(describeHotkey("ctrl+plus", false)).toBe("Ctrl+Plus");
    expect(describeHotkey("f2", false)).toBe("F2");
  });
});

describe("ariaKeyShortcut", () => {
  it("uses KeyboardEvent.key names with modifiers first", () => {
    expect(ariaKeyShortcut("alt+shift+arrowup", false)).toBe(
      "Alt+Shift+ArrowUp",
    );
    expect(ariaKeyShortcut("enter", false)).toBe("Enter");
    expect(ariaKeyShortcut("space", false)).toBe("Space");
    expect(ariaKeyShortcut("t", false)).toBe("T");
  });

  it("resolves mod for the platform", () => {
    expect(ariaKeyShortcut("mod+z", true)).toBe("Meta+Z");
    expect(ariaKeyShortcut("mod+z", false)).toBe("Control+Z");
  });
});
