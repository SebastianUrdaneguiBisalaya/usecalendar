import { describeHotkey } from "@usecalendar/core";
import type { EventKeyboardKeys } from "../locale/labels.js";
import { useCalendarLocale } from "../locale/locale-context.js";
import { useCalendarKeymap } from "./keymap-context.js";
import { useIsMac } from "./platform.js";

const EVENT_ACTIONS: readonly (keyof EventKeyboardKeys)[] = [
  "moveEventUp",
  "moveEventDown",
  "moveEventToPreviousDay",
  "moveEventToNextDay",
  "shortenEvent",
  "extendEvent",
];

/**
 * The screen-reader hint for a focused event, built from the keys actually bound (spelled out, with the
 * platform's modifier names), so it never describes a shortcut that was remapped or turned off.
 */
export const useEventKeyboardHint = (): string => {
  const { labels } = useCalendarLocale();
  const { keymap } = useCalendarKeymap();
  const isMac = useIsMac();
  const keys = Object.fromEntries(
    EVENT_ACTIONS.flatMap((action) => {
      const combo = keymap[action][0];
      return combo === undefined
        ? []
        : [
            [
              action,
              describeHotkey(combo, isMac),
            ],
          ];
    }),
  ) as EventKeyboardKeys;
  return labels.eventKeyboardHint(keys);
};
