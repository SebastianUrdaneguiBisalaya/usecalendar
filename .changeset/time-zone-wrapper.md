---
"@usecalendar/react": minor
---

Add `renderTimeZoneWrapper` to `TimeGridView` and `<Calendar>`: it wraps each time zone header like `renderEventWrapper` wraps events, so you can use your own popover (Radix, Base UI, …) with its own open state. The header renders as a button and receives your trigger's props and ref. When set, the built-in popover is not used.
