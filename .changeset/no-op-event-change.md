---
"@usecalendar/core": patch
"@usecalendar/react": patch
---

Dropping an event where it was no longer reports a change. `moveRange` returns the range as given when the shift rounds to zero, instead of snapping an unaligned event (10:07 → 10:00). The time grid compares the dropped range with the event by instant, so the same times written in another format (`…T15:00:00.000Z` vs `…T15:00:00Z`) don't fire `onEventChange`, and resizing an event back to where it was grabbed keeps its end unsnapped.
