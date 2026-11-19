# @usecalendar/react

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
