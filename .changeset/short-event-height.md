---
"@usecalendar/react": patch
---

Short events in the week and day views are now sized by height instead of minutes, so they stay readable at any `hourHeight`. An event is drawn at least 0.75rem tall, and uses one line when it is drawn under 3rem: the same as before at the default 3rem per hour (15 minutes minimum, one line under 60 minutes). A dense grid draws short events longer, and a tall grid gives them two lines sooner. Numbers and rem strings are converted directly, also when server rendering; other CSS lengths (`"64px"`) are measured once the grid is mounted.
