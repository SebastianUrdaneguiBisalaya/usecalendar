/**
 * Actions bound to global shortcuts: they act on the whole calendar, wherever focus is (within the scope).
 */
export const GLOBAL_HOTKEY_ACTIONS = [
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

/**
 * Actions bound to grid shortcuts: they act on the focused day, slot or event, so they only fire while focus is
 * inside a grid. Moving focus (arrows, Home/End, PageUp/PageDown) is not here: it follows the WAI-ARIA grid
 * pattern screen-reader users rely on, so it can't be remapped.
 */
export const GRID_HOTKEY_ACTIONS = [
  "openFocused",
  "moveEventUp",
  "moveEventDown",
  "moveEventToPreviousDay",
  "moveEventToNextDay",
  "shortenEvent",
  "extendEvent",
  "cancelDrag",
] as const;

/** Every action the calendar can bind to a keyboard shortcut. */
export const CALENDAR_HOTKEY_ACTIONS = [
  ...GLOBAL_HOTKEY_ACTIONS,
  ...GRID_HOTKEY_ACTIONS,
] as const;

/** An action bound to a global shortcut; see {@link GLOBAL_HOTKEY_ACTIONS}. */
export type GlobalHotkeyAction = (typeof GLOBAL_HOTKEY_ACTIONS)[number];

/** An action bound to a grid shortcut; see {@link GRID_HOTKEY_ACTIONS}. */
export type GridHotkeyAction = (typeof GRID_HOTKEY_ACTIONS)[number];

/** An action the calendar can bind to a keyboard shortcut. */
export type CalendarHotkeyAction = (typeof CALENDAR_HOTKEY_ACTIONS)[number];

/** Groups for listing shortcuts (e.g. in a shortcuts dialog or command menu). */
export type CalendarHotkeyGroup =
  | "events"
  | "general"
  | "grid"
  | "navigation"
  | "views";

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
 * Global:
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
 *
 * Grid (focused day, slot or event):
 *
 * | Action | Keys |
 * |---|---|
 * | `openFocused` | `Enter`, `Space` |
 * | `moveEventUp` / `moveEventDown` | `Alt+↑` / `Alt+↓` |
 * | `moveEventToPreviousDay` / `moveEventToNextDay` | `Alt+←` / `Alt+→` |
 * | `shortenEvent` / `extendEvent` | `Alt+Shift+↑` / `Alt+Shift+↓` |
 * | `cancelDrag` | `Escape` |
 */
export const CALENDAR_KEYMAP: Readonly<
  Record<CalendarHotkeyAction, CalendarHotkeyDefinition>
> = {
  cancelDrag: {
    group: "grid",
    keys: [
      "escape",
    ],
  },
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
  extendEvent: {
    group: "grid",
    keys: [
      "alt+shift+arrowdown",
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
  moveEventDown: {
    group: "grid",
    keys: [
      "alt+arrowdown",
    ],
  },
  moveEventToNextDay: {
    group: "grid",
    keys: [
      "alt+arrowright",
    ],
  },
  moveEventToPreviousDay: {
    group: "grid",
    keys: [
      "alt+arrowleft",
    ],
  },
  moveEventUp: {
    group: "grid",
    keys: [
      "alt+arrowup",
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
  openFocused: {
    group: "grid",
    keys: [
      "enter",
      "space",
    ],
  },
  previous: {
    group: "navigation",
    keys: [
      "k",
      "arrowleft",
    ],
  },
  shortenEvent: {
    group: "grid",
    keys: [
      "alt+shift+arrowup",
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
 * { next: ["l", "arrowright"], deleteEvent: null, moveEventUp: "shift+arrowup" }
 */
export type CalendarHotkeys =
  | boolean
  | Partial<Record<CalendarHotkeyAction, string | readonly string[] | null>>;

/** The keys bound to each action after applying a {@link CalendarHotkeys} configuration. */
export type ResolvedKeymap = Readonly<
  Record<CalendarHotkeyAction, readonly string[]>
>;

/** The keys bound to each action after applying `hotkeys`; actions turned off have no keys. */
export const resolveKeymap = (
  hotkeys: CalendarHotkeys | undefined,
): ResolvedKeymap =>
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
  ) as ResolvedKeymap;

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
 * keys; for symbols it's ignored, since typing `?` or `+` needs Shift on most layouts. Caps Lock doesn't matter.
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
  const isSymbol = key.length === 1 && key !== " " && !isLetterOrDigit(key);
  return isSymbol || event.shiftKey === hotkey.shift;
};

/**
 * The first of `actions` whose keys match `event` in `keymap`, or `null`.
 *
 * @param actions - The actions to consider, e.g. {@link GLOBAL_HOTKEY_ACTIONS} or {@link GRID_HOTKEY_ACTIONS}.
 */
export const hotkeyActionFor = <Action extends CalendarHotkeyAction>(
  event: HotkeyEvent,
  keymap: ResolvedKeymap,
  isMac: boolean,
  actions: readonly Action[],
): Action | null =>
  actions.find((action) =>
    keymap[action].some((combo) => matchesHotkey(event, combo, isMac)),
  ) ?? null;

const KEY_NAMES: Readonly<Record<string, string>> = {
  " ": "Space",
  arrowdown: "Down Arrow",
  arrowleft: "Left Arrow",
  arrowright: "Right Arrow",
  arrowup: "Up Arrow",
  backspace: "Backspace",
  delete: "Delete",
  end: "End",
  enter: "Enter",
  escape: "Escape",
  home: "Home",
  pagedown: "Page Down",
  pageup: "Page Up",
  tab: "Tab",
};

/**
 * A key combination spelled out in English words, for screen-reader hints and shortcut lists, using the
 * platform's modifier names.
 *
 * @example
 * describeHotkey("alt+shift+arrowup", true); // "Option+Shift+Up Arrow"
 * describeHotkey("mod+z", false); // "Ctrl+Z"
 */
export const describeHotkey = (combo: string, isMac: boolean): string => {
  const { alt, ctrl, key, meta, mod, shift } = parseHotkey(combo);
  const names = [
    (ctrl || (mod && !isMac)) && "Ctrl",
    (meta || (mod && isMac)) && (isMac ? "Command" : "Meta"),
    alt && (isMac ? "Option" : "Alt"),
    shift && "Shift",
    KEY_NAMES[key] ??
      (key === "+"
        ? "Plus"
        : key.length === 1
          ? key.toUpperCase()
          : key[0]?.toUpperCase() + key.slice(1)),
  ];
  return names.filter((name) => typeof name === "string").join("+");
};

const ARIA_KEY_NAMES: Readonly<Record<string, string>> = {
  " ": "Space",
  "+": "Plus",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  arrowup: "ArrowUp",
  backspace: "Backspace",
  delete: "Delete",
  end: "End",
  enter: "Enter",
  escape: "Escape",
  home: "Home",
  pagedown: "PageDown",
  pageup: "PageUp",
  tab: "Tab",
};

/**
 * A key combination in the syntax of the `aria-keyshortcuts` attribute (`KeyboardEvent.key` names joined by `+`,
 * modifiers first), with `mod` resolved for the platform.
 *
 * @example
 * ariaKeyShortcut("alt+shift+arrowup", false); // "Alt+Shift+ArrowUp"
 * ariaKeyShortcut("mod+z", true); // "Meta+Z"
 */
export const ariaKeyShortcut = (combo: string, isMac: boolean): string => {
  const { alt, ctrl, key, meta, mod, shift } = parseHotkey(combo);
  return [
    (ctrl || (mod && !isMac)) && "Control",
    (meta || (mod && isMac)) && "Meta",
    alt && "Alt",
    shift && "Shift",
    ARIA_KEY_NAMES[key] ??
      (key.length === 1
        ? key.toUpperCase()
        : `${key[0]?.toUpperCase()}${key.slice(1)}`),
  ]
    .filter((name) => typeof name === "string")
    .join("+");
};
