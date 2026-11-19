---
"@usecalendar/react": minor
---

Add the `hourHeight` prop to `Calendar` and `TimeGridView`: the height of one hour in the week and day views, as a number in rem (default `3`, unchanged) or any CSS length such as `"64px"`. Slot rows, events, drag previews and the current-time line all scale with it; dragging and the initial scroll measure the real grid, so they keep working at any height.
