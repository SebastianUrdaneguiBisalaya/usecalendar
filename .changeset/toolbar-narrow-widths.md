---
"@usecalendar/react": patch
---

`CalendarToolbar` no longer lets the previous/next buttons overlap the view switcher on narrow widths. The toolbar now follows its own width (a CSS size container), so it behaves the same in a narrow sidebar as on a phone. Under 36rem the view switcher moves to its own row with equal-width buttons, and only the title truncates. The README has a new "Small screens" recipe for opening the day view on phones.
