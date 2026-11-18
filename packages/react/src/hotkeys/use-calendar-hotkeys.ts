import {
  type CalendarHotkeys,
  GLOBAL_HOTKEY_ACTIONS,
  type GlobalHotkeyAction,
  hotkeyActionFor,
  resolveKeymap,
} from "@usecalendar/core";
import { type RefObject, useEffect, useRef } from "react";
import type { CalendarState } from "../calendar/use-calendar.js";
import { registerDocumentHotkeys } from "./document-registry.js";
import { shouldIgnoreHotkey } from "./ignore.js";
import { isMacPlatform } from "./platform.js";

/**
 * Where the calendar listens for its global shortcuts:
 * - `"document"`: anywhere on the page while the calendar is mounted (tempi's behavior). With several calendars
 *   on the page, the one the user last focused or clicked handles the keys (else the one mounted last).
 * - `"calendar"`: only while focus is inside the calendar, for apps with shortcuts of their own on the same keys.
 */
export type CalendarHotkeysScope = "calendar" | "document";

/** What each global shortcut does. Actions without a handler don't consume their keys. */
export type CalendarHotkeyHandlers = Partial<
  Record<GlobalHotkeyAction, (event: KeyboardEvent) => void>
>;

/** Options of {@link useCalendarHotkeys}. */
export type UseCalendarHotkeysOptions = {
  /** The calendar whose navigation the default handlers drive (today, next, previous, views). */
  calendar: CalendarState;
  /**
   * Handlers for the global shortcuts, merged over the navigation defaults. `goToDate`, `newEvent`,
   * `deleteEvent` and `close` have no default: they only fire when given a handler.
   */
  handlers?: CalendarHotkeyHandlers | undefined;
  /** `true` (tempi's keymap), `false` (off) or per-action overrides; see `CalendarHotkeys`. @defaultValue true */
  hotkeys?: CalendarHotkeys | undefined;
  /** @defaultValue "document" */
  scope?: CalendarHotkeysScope | undefined;
  /**
   * The calendar's root element. Required for the `"calendar"` scope; with `"document"`, it lets the calendar the
   * user last interacted with take the keys when there are several.
   */
  target?: RefObject<HTMLElement | null> | undefined;
};

/**
 * Binds the calendar's global keyboard shortcuts: tempi's keymap by default (`CALENDAR_KEYMAP`), configurable per
 * action. Grid shortcuts (Enter, Alt+arrows, …) are handled by the grids themselves, from `CalendarKeymapProvider`.
 * `<Calendar>` calls this for you; call it yourself when composing the parts with `CalendarProvider`.
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
  // Listeners are attached once per scope; they read the latest keymap and handlers from here.
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

    /** Runs the action bound to `event`, if it has a handler; returns whether it did. */
    const handle = (event: KeyboardEvent): boolean => {
      const {
        calendar: state,
        handlers: custom,
        hotkeys: config,
      } = latest.current;
      const action = hotkeyActionFor(
        event,
        resolveKeymap(config),
        isMacPlatform(),
        GLOBAL_HOTKEY_ACTIONS,
      );
      if (action === null) return false;
      const navigation: CalendarHotkeyHandlers = {
        dayView: () => state.setView("day"),
        goToToday: state.goToToday,
        monthView: () => state.setView("month"),
        next: state.goToNext,
        previous: state.goToPrevious,
        weekView: () => state.setView("week"),
      };
      const handler = custom?.[action] ?? navigation[action];
      if (handler === undefined) return false;
      handler(event);
      return true;
    };

    if (scope === "document")
      return registerDocumentHotkeys({
        handle,
        target,
      });

    const element = target?.current;
    if (element === null || element === undefined) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shouldIgnoreHotkey(event) && handle(event)) event.preventDefault();
    };
    element.addEventListener("keydown", onKeyDown);
    return () => element.removeEventListener("keydown", onKeyDown);
  }, [
    enabled,
    scope,
    target,
  ]);
};
