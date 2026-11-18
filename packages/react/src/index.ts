// Public surface of @usecalendar/react. Components and hooks are re-exported here as they land.
export type {
  EventChipClassNames,
  EventChipProps,
} from "./events/event-chip.js";
export { EventChip } from "./events/event-chip.js";
export type {
  EventLook,
  EventSurfaceProps,
  EventVariant,
} from "./events/event-style.js";
export { eventLook, eventSurfaceProps, isPast } from "./events/event-style.js";
export type { CalendarFormatters, FormatContext } from "./locale/formatters.js";
export { DEFAULT_FORMATTERS, localeTimeFormat } from "./locale/formatters.js";
export type { CalendarLabels, CalendarLabelsInput } from "./locale/labels.js";
export { DEFAULT_LABELS } from "./locale/labels.js";
export type {
  CalendarLocale,
  CalendarLocaleOptions,
} from "./locale/locale-context.js";
export {
  CalendarLocaleProvider,
  DEFAULT_LOCALE,
  useCalendarLocale,
} from "./locale/locale-context.js";
