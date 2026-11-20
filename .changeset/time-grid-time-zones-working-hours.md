---
"@usecalendar/core": minor
"@usecalendar/react": minor
---

Add `secondaryTimeZones` and `workingHours` to `TimeGridView` and `<Calendar>`.

- `secondaryTimeZones` draws more hour columns, left of the calendar's own, with the time of each hour line in another zone (minutes included for half-hour offsets) and the zone's name in the header. New `formatters.timeZoneName` and `classNames.secondaryHour`.
- `workingHours` marks the slots outside them with `data-off-hours` and a muted background (`classNames.offHours`).
- Core exports the `WorkingHours` type and `isWorkingTime`.
