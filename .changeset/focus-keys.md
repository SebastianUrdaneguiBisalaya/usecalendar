---
"@usecalendar/core": minor
---

Export `CALENDAR_FOCUS_KEYS` (with `CALENDAR_FOCUS_ACTIONS`, `CalendarFocusAction` and `CalendarFocusKeyDefinition`): the fixed focus keys (arrows, Home/End, Mod+Home/End, PageUp/PageDown) in the same `{ [action]: { keys, group } }` shape as `CALENDAR_KEYMAP`, so apps can list every key the calendar uses in their own hotkey registry or shortcuts dialog. The keys are listed only; they stay non-configurable and their behavior doesn't change.
