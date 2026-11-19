---
"@usecalendar/react": patch
---

Fix the week view on narrow widths, where the grid scrolls sideways: the hour gutter no longer scrolls away at the end of the horizontal scroll, and events, drag previews and the current-time line stay aligned with their day columns. The grid is now at least as wide as its columns' minimum width.
