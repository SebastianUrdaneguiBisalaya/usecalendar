import {
  type CalendarHotkeys,
  GRID_HOTKEY_ACTIONS,
  type GridHotkeyAction,
  hotkeyActionFor,
  type ResolvedKeymap,
  resolveKeymap,
} from "@usecalendar/core";
import { createContext, type ReactNode, use, useMemo } from "react";
import { isMacPlatform } from "./platform.js";

/** The resolved shortcut configuration every calendar part reads. */
export type CalendarKeymap = {
  /** The grid action bound to a key press inside a grid, or `null`. */
  gridActionFor: (
    /** A DOM keyboard event, or just the fields the matcher reads. */
    event:
      | KeyboardEvent
      | {
          altKey: boolean;
          ctrlKey: boolean;
          key: string;
          metaKey: boolean;
          shiftKey: boolean;
        },
  ) => GridHotkeyAction | null;
  /** The keys bound to every action; an empty list means the action is off. */
  keymap: ResolvedKeymap;
};

const toCalendarKeymap = (keymap: ResolvedKeymap): CalendarKeymap => ({
  gridActionFor: (event) =>
    hotkeyActionFor(event, keymap, isMacPlatform(), GRID_HOTKEY_ACTIONS),
  keymap,
});

const CalendarKeymapContext = createContext<CalendarKeymap>(
  toCalendarKeymap(resolveKeymap(true)),
);

/**
 * Shares a shortcut configuration with the calendar's grids (Enter, Alt+arrows, …). `<Calendar>` renders it from
 * its `hotkeys` prop; render it yourself when composing the parts with `CalendarProvider`.
 */
export function CalendarKeymapProvider({
  children,
  hotkeys,
}: {
  children: ReactNode;
  hotkeys?: CalendarHotkeys | undefined;
}) {
  const keymap = useMemo(
    () => toCalendarKeymap(resolveKeymap(hotkeys)),
    [
      hotkeys,
    ],
  );
  return (
    <CalendarKeymapContext value={keymap}>{children}</CalendarKeymapContext>
  );
}

/** The shortcut configuration of the nearest `CalendarKeymapProvider`, or tempi's defaults without one. */
export const useCalendarKeymap = (): CalendarKeymap =>
  use(CalendarKeymapContext);
