# @usecalendar/core

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
