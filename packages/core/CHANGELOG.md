# @usecalendar/core

## 0.4.0

### Minor Changes

- 0ad8b11: Add `secondaryTimeZones` and `workingHours` to `TimeGridView` and `<Calendar>`.
  
  - `secondaryTimeZones` draws more hour columns, left of the calendar's own, with the time of each hour line in another zone (minutes included for half-hour offsets) and the zone's name in the header. New optional `formatters.timeZoneName` (existing complete `CalendarFormatters` objects keep compiling) and `classNames.secondaryHour`.
  - `workingHours` marks the slots outside them with `data-off-hours` and a muted background (`classNames.offHours`).
  - Core exports the `WorkingHours` type and `isWorkingTime`.

## 0.3.0

### Minor Changes

- e19faf1: `CalendarEvent` gains optional `description` and `location` fields, shown in the React event popover.

## 0.2.0

### Minor Changes

- 1306eb9: Export `CALENDAR_FOCUS_KEYS` (with `CALENDAR_FOCUS_ACTIONS`, `CalendarFocusAction` and `CalendarFocusKeyDefinition`): the fixed focus keys (arrows, Home/End, Mod+Home/End, PageUp/PageDown) in the same `{ [action]: { keys, group } }` shape as `CALENDAR_KEYMAP`, so apps can list every key the calendar uses in their own hotkey registry or shortcuts dialog. The keys are listed only; they stay non-configurable and their behavior doesn't change.

### Patch Changes

- 87c7e84: Faster calendars with many events. `layoutDay` and `layoutWeek` skip events outside the day or week with a cheap check before converting times with `Temporal`, which makes the week and month layouts about 2.5 to 4.5 times faster (500 events: 9 → 3.5 ms and 21 → 4.5 ms). `TimeGridView` and `MonthView` memoize their layouts and the slots' screen-reader labels, so moving one event re-renders about 2.4 times faster and the layout is no longer recomputed on every render. While dragging, the time grid re-renders only when the snapped preview moves. Behavior and markup are unchanged.

## 0.1.0

### Minor Changes

First release.

- `CalendarEvent<TData>`, `DateRange` and `TimeRange` types, with instants compared by time, never as text.
- Views and navigation: `visibleDays`, `visibleRange`, `shiftDate`, `startOfWeek`, week starts (`monday`, `sunday`, `saturday`).
- Month layout (weeks, ISO week numbers, multi-day lanes) and day layout (overlapping timed events).
- Drag and resize math: `moveRange`, `resizeRange`, `sweepRange`, snapping.
- Keyboard focus models for the time grid, the month grid and the date strip (`nextFocus`, `nextMonthFocus`, `nextStripFocus`).
- Date strip model for the mini calendar: `stripStart`, `stripDays`, `shiftStrip`, `addStripDays`, `isDayInRange`, `clampDay`.
- Shortcut keymap (`CALENDAR_KEYMAP`) with `resolveKeymap`, `matchesHotkey`, `describeHotkey` and `ariaKeyShortcut`.
