# @usecalendar/react

## 0.4.0

### Minor Changes

- 0ad8b11: Add `secondaryTimeZones` and `workingHours` to `TimeGridView` and `<Calendar>`.
  
  - `secondaryTimeZones` draws more hour columns, left of the calendar's own, with the time of each hour line in another zone (minutes included for half-hour offsets) and the zone's name in the header. New optional `formatters.timeZoneName` (existing complete `CalendarFormatters` objects keep compiling) and `classNames.secondaryHour`.
  - `workingHours` marks the slots outside them with `data-off-hours` and a muted background (`classNames.offHours`).
  - Core exports the `WorkingHours` type and `isWorkingTime`.

### Patch Changes

- Updated dependencies [0ad8b11]
  - @usecalendar/core@0.4.0

## 0.3.1

### Patch Changes

- 987cd7f: Fix `renderEventWrapper` on timed events in the week and day views: the ref, handlers (`onPointerEnter`, `onContextMenu`, …), `aria-*` and `data-*` props a wrapper adds to its child now reach the event button, merged with the button's own. Hover popovers and context-menu triggers now work there as they do in the month view and the all-day lane.

## 0.3.0

### Minor Changes

- e19faf1: Add an optional event details popover. `eventPopover="click" | "hover" | "both"` on `Calendar`, `MonthView` and `TimeGridView` shows an event's color, title, date and time, location and description, using the native Popover API. `renderEventPopover` replaces its content, and new `classNames` slots (`eventPopover*`) and an `eventWhen` formatter customize it.

### Patch Changes

- Updated dependencies [e19faf1]
  - @usecalendar/core@0.3.0

## 0.2.0

### Minor Changes

- 581e6fc: Add the `hourHeight` prop to `Calendar` and `TimeGridView`: the height of one hour in the week and day views, as a number in rem (default `3`, unchanged) or any CSS length such as `"64px"`. Slot rows, events, drag previews and the current-time line all scale with it; dragging and the initial scroll measure the real grid, so they keep working at any height.

### Patch Changes

- 87c7e84: Faster calendars with many events. `layoutDay` and `layoutWeek` skip events outside the day or week with a cheap check before converting times with `Temporal`, which makes the week and month layouts about 2.5 to 4.5 times faster (500 events: 9 → 3.5 ms and 21 → 4.5 ms). `TimeGridView` and `MonthView` memoize their layouts and the slots' screen-reader labels, so moving one event re-renders about 2.4 times faster and the layout is no longer recomputed on every render. While dragging, the time grid re-renders only when the snapped preview moves. Behavior and markup are unchanged.
- dd49e96: Short events in the week and day views are now sized by height instead of minutes, so they stay readable at any `hourHeight`. An event is drawn at least 0.75rem tall, and uses one line when it is drawn under 3rem: the same as before at the default 3rem per hour (15 minutes minimum, one line under 60 minutes). A dense grid draws short events longer, and a tall grid gives them two lines sooner. Numbers and rem strings are converted directly, also when server rendering; other CSS lengths (`"64px"`) are measured once the grid is mounted.
- fdc44f6: Fix the week view on narrow widths, where the grid scrolls sideways: the hour gutter no longer scrolls away at the end of the horizontal scroll, and events, drag previews and the current-time line stay aligned with their day columns. The grid is now at least as wide as its columns' minimum width.
- d637de4: `CalendarToolbar` no longer lets the previous/next buttons overlap the view switcher on narrow widths. The toolbar now follows its own width (a CSS size container), so it behaves the same in a narrow sidebar as on a phone. Under 36rem the view switcher moves to its own row with equal-width buttons, and only the title truncates. The README has a new "Small screens" recipe for opening the day view on phones.
- Updated dependencies [87c7e84]
- Updated dependencies [1306eb9]
  - @usecalendar/core@0.2.0

## 0.1.0

### Minor Changes

First release.

- `<Calendar>`: toolbar plus month, week and day views, controlled or uncontrolled, with `onRangeChange` for fetching.
- `MonthView`, `TimeGridView`, `CalendarToolbar`, `EventChip` and `EventBlock` for custom layouts, with `useCalendar` and `CalendarProvider`.
- Creating, moving and resizing events by pointer and keyboard, reported through `onSlotClick`, `onRangeSelect` and `onEventChange`.
- Render props: `renderEvent`, `renderAllDayEvent`, `renderMonthEvent`, `renderEventWrapper`, `renderMorePopover`.
- `<MiniCalendar>` and `useMiniCalendar` under the `@usecalendar/react/mini` entry: a horizontal day strip with paging, `days="auto"`, limits, sync with a full calendar through `calendar`, and `renderDay`.
- Remappable keyboard shortcuts (`hotkeys`, `hotkeysScope`, `hotkeyHandlers`) and WAI-ARIA grid and listbox semantics.
- Localization through `locale`, `timeFormat`, `labels` and `formatters`.
- Theming through `--uc-*` tokens that fall back to shadcn/ui tokens (dark mode included), `className` and `classNames`. `theme.css` is for Tailwind v4 apps and `styles.css` for apps without Tailwind.
