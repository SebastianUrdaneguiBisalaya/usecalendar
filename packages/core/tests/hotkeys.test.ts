import { describe, expect, it } from "vitest";
import {
  CALENDAR_KEYMAP,
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
      goToDate: [
        ".",
      ],
      goToToday: [
        "t",
      ],
      monthView: [
        "m",
      ],
      newEvent: [
        "c",
      ],
      next: [
        "j",
        "arrowright",
      ],
      previous: [
        "k",
        "arrowleft",
      ],
      weekView: [
        "w",
      ],
    });
  });
});

describe("resolveKeymap", () => {
  it("uses the defaults for true or nothing", () => {
    expect(resolveKeymap(undefined).next).toEqual([
      "j",
      "arrowright",
    ]);
    expect(resolveKeymap(true).goToToday).toEqual([
      "t",
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
    // Caps Lock doesn't get in the way.
    expect(matchesHotkey(press("T"), "t", false)).toBe(true);
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
  });

  it("requires Shift to match for letters and named keys", () => {
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
        press("ArrowRight", {
          shiftKey: true,
        }),
        "arrowright",
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
  it("finds the action bound to a key press", () => {
    const keymap = resolveKeymap(true);
    expect(hotkeyActionFor(press("j"), keymap, false)).toBe("next");
    expect(hotkeyActionFor(press("Delete"), keymap, false)).toBe("deleteEvent");
    expect(hotkeyActionFor(press("x"), keymap, false)).toBeNull();
  });

  it("finds nothing for actions turned off", () => {
    expect(
      hotkeyActionFor(
        press("j"),
        resolveKeymap({
          next: null,
        }),
        false,
      ),
    ).toBeNull();
  });
});
