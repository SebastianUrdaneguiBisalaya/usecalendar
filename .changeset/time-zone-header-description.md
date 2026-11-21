---
"@usecalendar/react": minor
---

Add a second line to the time zone headers of `TimeGridView` and `<Calendar>`: `secondaryTimeZones` entries take an optional `description` under `label`, the new `timeZoneLabel` prop does the same for the calendar's own column, and `classNames.timeGrid.timeZoneName` styles them. Both lines truncate and are read by screen readers as one text.
