# @usecalendar/core

The framework-agnostic core of [usecalendar](https://github.com/SebastianUrdaneguiBisalaya/usecalendar#readme), a Google Calendar-style calendar UI. It holds types, constants and pure functions only: no framework, no DOM and no runtime dependencies.

Most apps don't install it directly: [`@usecalendar/react`](https://github.com/SebastianUrdaneguiBisalaya/usecalendar/tree/main/packages/react) depends on it and re-exports what components need. Use it to build an adapter for another framework, or to reuse the calendar math in your own code.

## Install

```bash
npm install @usecalendar/core
```

Dates use the global `Temporal` API. Where it isn't native, import `"temporal-polyfill/global"` once. The package never bundles a polyfill.

## What's inside

| Area | Exports |
|---|---|
| Events and ranges | `CalendarEvent<TData>`, `EventStatus`, `DateRange`, `TimeRange`, `overlapsRange` |
| Views and navigation | `CalendarView`, `CALENDAR_VIEWS`, `visibleDays`, `visibleRange`, `visibleDayRange`, `shiftDate`, `startOfWeek`, `isWeekend`, `daysToUtcRange` |
| Month layout | `monthWeeks`, `weekNumber`, `layoutWeek`, `fitWeek`, `itemDays`, `belongsInAllDayLane` |
| Day layout and editing | `layoutDay`, `MINUTES_PER_DAY`, `moveRange`, `resizeRange`, `sweepRange`, `rangeAt`, `wallTime`, `SNAP_MINUTES` |
| Date strip (mini calendar) | `stripStart`, `stripDays`, `shiftStrip`, `addStripDays`, `isDayInRange`, `clampDay`, `nextStripFocus`, `STRIP_ALIGNS`, `STRIP_STEPS` |
| Keyboard focus | `nextFocus` (time grid), `nextMonthFocus`, `focusKey`, `SLOT_MINUTES` |
| Shortcuts | `CALENDAR_KEYMAP`, `resolveKeymap`, `hotkeyActionFor`, `matchesHotkey`, `parseHotkey`, `describeHotkey`, `ariaKeyShortcut`, action lists |
| Options | `WeekStart`, `TimeFormat`, `isWeekStart`, `isTimeFormat` |

```ts
import { stripDays, stripStart, visibleRange } from "@usecalendar/core";

const day = Temporal.PlainDate.from("2026-11-19");
visibleRange(day, "week", "monday", "America/Lima"); // { start: "2026-11-16T05:00:00.000Z", end: "2026-11-23T05:00:00.000Z" }
stripDays(stripStart(day, 5, { align: "center" }), 5); // 2026-11-17 … 2026-11-21
```

Every export has TSDoc with examples, so your editor shows the details on hover.

## License

ISC
