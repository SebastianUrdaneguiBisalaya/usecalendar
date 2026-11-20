---
"@usecalendar/react": patch
---

Fix `renderEventWrapper` on timed events in the week and day views: the ref, handlers (`onPointerEnter`, `onContextMenu`, …), `aria-*` and `data-*` props a wrapper adds to its child now reach the event button, merged with the button's own. Hover popovers and context-menu triggers now work there as they do in the month view and the all-day lane.
