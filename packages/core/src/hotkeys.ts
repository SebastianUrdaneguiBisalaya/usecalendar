/** Every action the calendar can bind to a keyboard shortcut. */
export const CALENDAR_HOTKEY_ACTIONS = [
  "goToToday",
  "next",
  "previous",
  "goToDate",
  "dayView",
  "weekView",
  "monthView",
  "newEvent",
  "deleteEvent",
  "close",
] as const;

/** An action the calendar can bind to a keyboard shortcut. */
export type CalendarHotkeyAction = (typeof CALENDAR_HOTKEY_ACTIONS)[number];

/** Groups for listing shortcuts (e.g. in a shortcuts dialog or command menu). */
export type CalendarHotkeyGroup = "events" | "general" | "navigation" | "views";

/** One action's shortcut: the keys that trigger it and the group it's listed under. */
export type CalendarHotkeyDefinition = {
  group: CalendarHotkeyGroup;
  /** Key combinations, any of which triggers the action; see {@link parseHotkey} for the syntax. */
  keys: readonly string[];
};

/**
 * The default keyboard shortcuts, the same as tempi's. Shaped like a `@usehotkeys` keymap
 * (`{ [action]: { keys, group } }`), so apps can register it in their own hotkey registry, shortcut lists or
 * command menu.
 *
 * | Action | Keys |
 * |---|---|
 * | `goToToday` | `t` |
 * | `next` / `previous` | `j`, `→` / `k`, `←` |
 * | `goToDate` | `.` |
 * | `dayView` / `weekView` / `monthView` | `d` / `w` / `m` |
 * | `newEvent` | `c` |
 * | `deleteEvent` | `Backspace`, `Delete` |
 * | `close` | `Escape` |
 */
export const CALENDAR_KEYMAP: Readonly<
  Record<CalendarHotkeyAction, CalendarHotkeyDefinition>
> = {
  close: {
    group: "general",
    keys: [
      "escape",
    ],
  },
  dayView: {
    group: "views",
    keys: [
      "d",
    ],
  },
  deleteEvent: {
    group: "events",
    keys: [
      "backspace",
      "delete",
    ],
  },
  goToDate: {
    group: "navigation",
    keys: [
      ".",
    ],
  },
  goToToday: {
    group: "navigation",
    keys: [
      "t",
    ],
  },
  monthView: {
    group: "views",
    keys: [
      "m",
    ],
  },
  newEvent: {
    group: "events",
    keys: [
      "c",
    ],
  },
  next: {
    group: "navigation",
    keys: [
      "j",
      "arrowright",
    ],
  },
  previous: {
    group: "navigation",
    keys: [
      "k",
      "arrowleft",
    ],
  },
  weekView: {
    group: "views",
    keys: [
      "w",
    ],
  },
};

/**
 * Shortcut configuration: `true` for the defaults, `false` to turn every shortcut off, or per-action overrides
 * (keys replace the defaults, `null` turns that action off).
 *
 * @example
 * { next: ["l", "arrowright"], deleteEvent: null }
 */
export type CalendarHotkeys =
  | boolean
  | Partial<Record<CalendarHotkeyAction, string | readonly string[] | null>>;

/** The keys bound to each action after applying `hotkeys`; actions turned off have no keys. */
export const resolveKeymap = (
  hotkeys: CalendarHotkeys | undefined,
): Record<CalendarHotkeyAction, readonly string[]> =>
  Object.fromEntries(
    CALENDAR_HOTKEY_ACTIONS.map((action) => {
      if (hotkeys === false)
        return [
          action,
          [],
        ];
      const override =
        hotkeys === true || hotkeys === undefined ? undefined : hotkeys[action];
      if (override === null)
        return [
          action,
          [],
        ];
      if (override === undefined)
        return [
          action,
          CALENDAR_KEYMAP[action].keys,
        ];
      return [
        action,
        typeof override === "string"
          ? [
              override,
            ]
          : override,
      ];
    }),
  ) as Record<CalendarHotkeyAction, readonly string[]>;

/** A parsed key combination. */
export type Hotkey = {
  alt: boolean;
  ctrl: boolean;
  key: string;
  meta: boolean;
  mod: boolean;
  shift: boolean;
};

/**
 * Parses a key combination: modifiers and a key joined by `+`, case-insensitive.
 *
 * Modifiers are `ctrl`, `alt` (or `option`), `shift`, `meta` (or `cmd`), and `mod` (⌘ on macOS, Ctrl elsewhere).
 * The key is a `KeyboardEvent.key` value (`"t"`, `"."`, `"arrowright"`, `"escape"`, …); `"plus"` and `"space"` name
 * `+` and the space bar.
 *
 * @example
 * parseHotkey("mod+shift+z"); // { mod: true, shift: true, key: "z", … }
 */
export const parseHotkey = (combo: string): Hotkey => {
  const parts = combo.toLowerCase().split("+");
  const raw = parts.pop() ?? "";
  const key = raw === "plus" || raw === "" ? "+" : raw === "space" ? " " : raw;
  const has = (...names: string[]) =>
    parts.some((part) => names.includes(part));
  return {
    alt: has("alt", "option"),
    ctrl: has("ctrl", "control"),
    key,
    meta: has("meta", "cmd", "command"),
    mod: has("mod"),
    shift: has("shift"),
  };
};

/** The fields of a keyboard event the matcher reads; any DOM `KeyboardEvent` satisfies it. */
export type HotkeyEvent = {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
};

const isLetterOrDigit = (key: string) => /^[a-z0-9]$/.test(key);

/**
 * True when `event` is the key combination `combo` (see {@link parseHotkey}).
 *
 * Ctrl, Alt and ⌘ must match exactly, so `t` doesn't fire on ⌘T. Shift must match for letters, digits and named
 * keys; for symbols it's ignored, since typing `?` or `+` needs Shift on most layouts.
 *
 * @param isMac - Whether `mod` means ⌘ (macOS) or Ctrl.
 */
export const matchesHotkey = (
  event: HotkeyEvent,
  combo: string,
  isMac: boolean,
): boolean => {
  const hotkey = parseHotkey(combo);
  const key = event.key.toLowerCase();
  if (key !== hotkey.key) return false;
  const wantsCtrl = hotkey.ctrl || (hotkey.mod && !isMac);
  const wantsMeta = hotkey.meta || (hotkey.mod && isMac);
  if (
    event.ctrlKey !== wantsCtrl ||
    event.metaKey !== wantsMeta ||
    event.altKey !== hotkey.alt
  )
    return false;
  const isSymbol = key.length === 1 && !isLetterOrDigit(key);
  return isSymbol || event.shiftKey === hotkey.shift;
};

/** The first action whose keys match `event` in `keymap`, or `null`. */
export const hotkeyActionFor = (
  event: HotkeyEvent,
  keymap: Readonly<Record<CalendarHotkeyAction, readonly string[]>>,
  isMac: boolean,
): CalendarHotkeyAction | null =>
  CALENDAR_HOTKEY_ACTIONS.find((action) =>
    keymap[action].some((combo) => matchesHotkey(event, combo, isMac)),
  ) ?? null;
