import {
  type CalendarHotkeyAction,
  type CalendarHotkeys,
  hotkeyActionFor,
  resolveKeymap,
} from "@usecalendar/core";
import { type RefObject, useEffect, useRef } from "react";
import type { CalendarState } from "../calendar/use-calendar.js";

/**
 * Where the calendar listens for its shortcuts:
 * - `"document"`: anywhere on the page while the calendar is mounted (tempi's behavior);
 * - `"calendar"`: only while focus is inside the calendar, safer when the app has shortcuts of its own.
 */
export type CalendarHotkeysScope = "calendar" | "document";

/** What each shortcut does. Actions without a handler don't consume their keys. */
export type CalendarHotkeyHandlers = Partial<
  Record<CalendarHotkeyAction, (event: KeyboardEvent) => void>
>;

/** Options of {@link useCalendarHotkeys}. */
export type UseCalendarHotkeysOptions = {
  /** The calendar whose navigation the default handlers drive (today, next, previous, views). */
  calendar: CalendarState;
  /**
   * Handlers for the shortcuts, merged over the navigation defaults. `goToDate`, `newEvent`, `deleteEvent` and
   * `close` have no default: they only fire when given a handler.
   */
  handlers?: CalendarHotkeyHandlers | undefined;
  /** `true` (tempi's keymap), `false` (off) or per-action overrides; see `CalendarHotkeys`. @defaultValue true */
  hotkeys?: CalendarHotkeys | undefined;
  /** @defaultValue "document" */
  scope?: CalendarHotkeysScope | undefined;
  /** The calendar's root element; required for the `"calendar"` scope. */
  target?: RefObject<HTMLElement | null> | undefined;
};

const TEXT_INPUT_TYPES = new Set([
  "",
  "date",
  "datetime-local",
  "email",
  "month",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "time",
  "url",
  "week",
]);

const isTyping = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (
    target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
    return true;
  return (
    target instanceof HTMLInputElement &&
    TEXT_INPUT_TYPES.has(target.type.toLowerCase())
  );
};

/**
 * True for key presses shortcuts must leave alone, as in tempi: keys a focused widget already handled (such as
 * the arrows that move focus inside the grid), keys composing text (IME), and plain keys while typing in a field
 * (⌘/Ctrl combinations still fire there).
 */
export const shouldIgnoreHotkey = (event: KeyboardEvent): boolean =>
  event.defaultPrevented ||
  event.isComposing ||
  (!(event.ctrlKey || event.metaKey) && isTyping(event.target));

const isMacPlatform = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const platform =
    (
      navigator as Navigator & {
        userAgentData?: {
          platform?: string;
        };
      }
    ).userAgentData?.platform ?? navigator.platform;
  return /mac|iphone|ipad|ipod/i.test(platform);
};

/**
 * Binds the calendar's keyboard shortcuts: tempi's keymap by default (`CALENDAR_KEYMAP`), configurable per action.
 * `<Calendar>` calls it for you; call it yourself when composing the parts with `CalendarProvider`.
 *
 * To use your own hotkey system instead, turn these off (`hotkeys={false}`) and bind your hooks to the
 * `useCalendar()` actions, registering `CALENDAR_KEYMAP` in your keymap if you list shortcuts.
 *
 * @example
 * useCalendarHotkeys({ calendar, hotkeys: { next: ["l"] }, handlers: { newEvent: () => openEventForm() } });
 */
export const useCalendarHotkeys = ({
  calendar,
  handlers,
  hotkeys = true,
  scope = "document",
  target,
}: UseCalendarHotkeysOptions): void => {
  // The listener is attached once per scope; it reads the latest keymap and handlers from here.
  const latest = useRef({
    calendar,
    handlers,
    hotkeys,
  });
  latest.current = {
    calendar,
    handlers,
    hotkeys,
  };
  const enabled = hotkeys !== false;

  useEffect(() => {
    if (!enabled) return;
    const element = scope === "document" ? document : target?.current;
    if (element === null || element === undefined) return;
    const isMac = isMacPlatform();

    const onKeyDown = (event: Event) => {
      if (!(event instanceof KeyboardEvent) || shouldIgnoreHotkey(event))
        return;
      const {
        calendar: state,
        handlers: custom,
        hotkeys: config,
      } = latest.current;
      const action = hotkeyActionFor(event, resolveKeymap(config), isMac);
      if (action === null) return;
      const navigation: CalendarHotkeyHandlers = {
        dayView: () => state.setView("day"),
        goToToday: state.goToToday,
        monthView: () => state.setView("month"),
        next: state.goToNext,
        previous: state.goToPrevious,
        weekView: () => state.setView("week"),
      };
      const handler = custom?.[action] ?? navigation[action];
      if (handler === undefined) return;
      event.preventDefault();
      handler(event);
    };

    element.addEventListener("keydown", onKeyDown);
    return () => element.removeEventListener("keydown", onKeyDown);
  }, [
    enabled,
    scope,
    target,
  ]);
};
