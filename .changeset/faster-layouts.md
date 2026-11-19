---
"@usecalendar/core": patch
"@usecalendar/react": patch
---

Faster calendars with many events. `layoutDay` and `layoutWeek` skip events outside the day or week with a cheap check before converting times with `Temporal`, which makes the week and month layouts about 2.5 to 4.5 times faster (500 events: 9 → 3.5 ms and 21 → 4.5 ms). `TimeGridView` and `MonthView` memoize their layouts and the slots' screen-reader labels, so moving one event re-renders about 2.4 times faster and the layout is no longer recomputed on every render. While dragging, the time grid re-renders only when the snapped preview moves. Behavior and markup are unchanged.
