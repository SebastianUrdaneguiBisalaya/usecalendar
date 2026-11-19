# usecalendar

A drop-in, Google Calendar-style calendar for React: month, week and day views, an all-day lane, a current-time line, drag to create, move and resize, full keyboard navigation, and a compact day strip, all styled with Tailwind CSS v4 and driven entirely by props.

usecalendar is a **UI component, agnostic to business logic**. It draws the events you pass and reports what the user wants through callbacks. It never decides what an event is, how to save it, or what a click does.

- **Three views**: month (with week numbers and "+N more" popovers), week and day (time grid with an all-day lane).
- **Editing by intent**: click or drag over empty slots to create, drag to move or resize, Alt+arrows from the keyboard. You get the proposed times and decide what happens.
- **Mini calendar**: a horizontal day strip (`@usecalendar/react/mini`) that works on its own or stays in sync with the full calendar.
- **Controlled or uncontrolled**: every stateful prop comes in both forms (`view` / `defaultView`, `date` / `defaultDate`, `value` / `defaultValue`, …).
- **Generic event data**: `CalendarEvent<TData>` carries your own payload, returned untouched in every callback.
- **Themeable**: `--uc-*` design tokens that follow a shadcn/ui theme (dark mode included) with zero config, plus `className` / `classNames` on every part.
- **Accessible**: WAI-ARIA grid and listbox semantics, roving focus, screen-reader labels, and remappable keyboard shortcuts.
- **Localizable**: any BCP 47 locale through `Intl`, translatable labels, and overridable formatters.
- **SSR-safe**: renders on the server (Next.js App Router, Remix, …) and reads "today" and sizes only after hydration.
- **Small footprint**: `clsx` and `tailwind-merge` are the only runtime dependencies. React is a peer dependency.

## Table of contents

- [Packages](#packages)
- [Installation](#installation)
- [Styling setup](#styling-setup)
- [Quick start](#quick-start)
- [Events and time](#events-and-time)
- [Components](#components)
  - [`<Calendar>`](#calendar)
  - [`<MiniCalendar>`](#minicalendar)
  - [Building blocks](#building-blocks)
- [Recipes](#recipes)
- [Theming](#theming)
- [Localization](#localization)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Accessibility](#accessibility)
- [Contributing](#contributing)
- [License](#license)

## Packages

| Package | Description |
|---|---|
| [`@usecalendar/react`](./packages/react) | React components and hooks: `Calendar`, the views, the toolbar, event rendering and shortcuts. |
| `@usecalendar/react/mini` | Entry point of `@usecalendar/react` with only the `MiniCalendar` day strip, so apps can import it without the grid views. |
| [`@usecalendar/core`](./packages/core) | Framework-agnostic types and calendar math (visible ranges, layouts, drag and keyboard models). Installed automatically with the React package. |

Both packages ship ES modules and CommonJS with TypeScript types. The React entries include the `"use client"` directive, so they work in React Server Components frameworks.

## Installation

```bash
pnpm add @usecalendar/react
# or
npm install @usecalendar/react
```

Requirements:

- **React 19** or newer (`react` and `react-dom` are peer dependencies).
- **`Temporal`**. Dates use the global [`Temporal`](https://tc39.es/proposal-temporal/docs/) API. usecalendar never bundles a polyfill. On runtimes without native `Temporal` (some browsers, and Node 24 when you server-render), load one once, before the calendar renders:

  ```bash
  pnpm add temporal-polyfill
  ```

  ```ts
  import "temporal-polyfill/global";
  ```

  In Next.js, put this import at the top of the client component that renders the calendar, so it runs on the server (SSR) and in the browser.

## Styling setup

Pick **one** of the two stylesheets.

### Tailwind CSS v4 apps

```css
/* app.css */
@import "tailwindcss";
@import "@usecalendar/react/theme.css";
```

`theme.css` defines the `--uc-*` tokens (light and dark), maps them to Tailwind as `uc-*` colors and the `uc` radius (`bg-uc-background`, `text-uc-muted-foreground`, `rounded-uc`, …), and registers the compiled components with `@source`, so Tailwind generates their classes. You don't need to add an `@source` line yourself. Your own utilities can use the same tokens.

### Apps without Tailwind

```ts
import "@usecalendar/react/styles.css";
```

`styles.css` contains only the utilities the components use plus the tokens. It leaves out Tailwind's preflight (global reset), so it never restyles the rest of your page.

Both stylesheets cover the full calendar and the mini calendar. There is no separate stylesheet for `/mini`.

### Sizing

The calendar fills its parent's height (`h-full`). Give the parent, or the calendar itself, a height:

```tsx
<div className="h-[720px]">
  <Calendar events={events} />
</div>
```

## Quick start

### Next.js (App Router)

```tsx
// app/schedule/schedule.tsx
"use client";

import "temporal-polyfill/global";
import { Calendar, type CalendarEvent } from "@usecalendar/react";
import { useState } from "react";

type Meeting = { room: string };

export function Schedule({ initial }: { initial: CalendarEvent<Meeting>[] }) {
  const [events, setEvents] = useState(initial);

  return (
    <div className="h-[calc(100dvh-4rem)]">
      <Calendar
        defaultView="week"
        events={events}
        onEventChange={(event, range) =>
          setEvents((current) =>
            current.map((item) => (item.id === event.id ? { ...item, ...range } : item)),
          )
        }
        onEventClick={(event) => alert(`${event.title} in ${event.data?.room}`)}
      />
    </div>
  );
}
```

```tsx
// app/schedule/page.tsx (a Server Component)
import { Schedule } from "./schedule";

export default async function Page() {
  const events = await loadEvents(); // your data
  return <Schedule initial={events} />;
}
```

```css
/* app/globals.css */
@import "tailwindcss";
@import "@usecalendar/react/theme.css";
```

### Vite + React

```tsx
// src/main.tsx
import "temporal-polyfill/global";
import "./index.css"; // @import "tailwindcss"; @import "@usecalendar/react/theme.css";
import { Calendar, type CalendarEvent } from "@usecalendar/react";
import { createRoot } from "react-dom/client";

const events: CalendarEvent[] = [
  {
    endAt: "2026-11-18T16:00:00Z",
    id: "1",
    startAt: "2026-11-18T15:00:00Z",
    title: "Design review",
  },
];

createRoot(document.getElementById("root")!).render(
  <div style={{ height: "100vh" }}>
    <Calendar events={events} />
  </div>,
);
```

## Events and time

```ts
type CalendarEvent<TData = unknown> = {
  id: string; // unique among the events you pass
  title: string;
  startAt: string; // inclusive, ISO 8601 instant with an offset: "2026-11-18T15:00:00Z"
  endAt: string; // exclusive, same format
  allDay?: boolean; // all-day lane / month bar instead of timed placement
  color?: string; // any CSS color: "#6366f1", "oklch(...)", "var(--brand)"
  status?: "confirmed" | "tentative"; // tentative events are drawn with stripes
  timeZone?: string; // zone an all-day event was created in (keeps it on the same days everywhere)
  data?: TData; // your own payload, handed back in callbacks
};
```

- **Instants, not text.** `startAt` / `endAt` can use any offset (`Z`, `-05:00`, …). They're always compared as points in time, never as strings.
- **Days are `Temporal.PlainDate`.** Props such as `date`, `onDayClick` and the mini calendar's `value` use plain calendar dates, with no time zone.
- **`timeZone`** (an IANA name) decides which day is today and where events are placed. It defaults to the viewer's system zone (UTC during server rendering, until hydration).
- **Recurring events** aren't expanded by the library. Pass each occurrence in the visible range as its own event with a unique `id` (e.g. `` `${seriesId}:${startAt}` ``), and keep whatever identifies the series in `data`.
- **Ranges.** Callbacks that propose times hand you a `TimeRange` (`{ startAt, endAt }`). `onRangeChange` hands you a `DateRange` (`{ start, end }`), the UTC span the view draws.

## Components

All components accept `className` (root element) and `classNames` (one key per part). Both are merged after the defaults with `tailwind-merge`, so your classes always win. Every optional prop also accepts `undefined`, so you can forward your own optional props.

### `<Calendar>`

The complete calendar: a toolbar plus the month, week or day view. `Calendar` is generic over your event data (`Calendar<TData>`).

```tsx
<Calendar
  events={events}
  defaultView="week"
  weekStart="sunday"
  onRangeChange={(range) => fetchEvents(range)}
  onEventClick={(event) => openEditor(event)}
  onSlotClick={(range) => openCreateForm(range)}
  onEventChange={(event, range) => saveTimes(event.id, range)}
/>
```

#### Navigation and display

| Prop | Type | Default | Description |
|---|---|---|---|
| `view` / `defaultView` / `onViewChange` | `"day" \| "week" \| "month"` | `"week"` | Current view, controlled or uncontrolled. |
| `date` / `defaultDate` / `onDateChange` | `Temporal.PlainDate` | today | The day the view is anchored on. While uncontrolled, it follows today until the user navigates away. |
| `onRangeChange` | `(range: DateRange, view) => void` | | Called after render with the UTC range the view draws, once per change. Use it to fetch events. |
| `weekStart` | `"monday" \| "sunday" \| "saturday"` | `"monday"` | First day of the week. `"monday"` also uses ISO 8601 week numbers. |
| `showWeekends` | `boolean` | `true` | Show Saturdays and Sundays in the week and month views. |
| `showWeekNumbers` | `boolean` | `false` | Show week numbers in the month view. |
| `timeZone` | `string` | system zone | IANA time zone every day and time is shown in. |
| `calendar` | `CalendarState` | | State from your own `useCalendar` call. When given, the navigation props above are ignored: pass them to `useCalendar`. |
| `toolbar` | `boolean \| (calendar) => ReactNode` | `true` | The default `CalendarToolbar`, none, or your own header. |
| `style` | `CSSProperties` | | Inline styles for the root, e.g. a height or `--uc-*` token overrides. |

#### Events and editing

| Prop | Type | Default | Description |
|---|---|---|---|
| `events` | `readonly CalendarEvent<TData>[]` | required | The events to draw. |
| `onEventClick` | `(event) => void` | | An event was clicked, or Enter/Space was pressed on it. |
| `onEventChange` | `(event, range: TimeRange) => void` | | The user moved or resized an event (pointer or keyboard). The calendar doesn't change it: update `events` to accept. |
| `onSlotClick` | `(range: TimeRange) => void` | | An empty slot was clicked (or Enter/Space on it), with a range of `defaultEventDuration` minutes. |
| `onRangeSelect` | `(range: TimeRange) => void` | | The user dragged over empty slots, with the swept range. |
| `onDayClick` | `(day: Temporal.PlainDate) => void` | opens the day view | A month cell was picked. |
| `editable` | `boolean` | `true` | Allow moving and resizing. Editing also needs `onEventChange`. |
| `isEventEditable` | `(event) => boolean` | | Turn editing off for single events. |
| `selectedEventId` | `string \| null` | | Shows one event as selected, e.g. the one open in a side panel. |
| `draftRange` | `TimeRange \| null` | | Previews a new event's times on the grid while your form is open. |
| `defaultEventDuration` | `number` | `60` | Minutes of the range `onSlotClick` proposes. |
| `slotMinutes` | `number` | `30` | Length of a grid row. Must divide 60. |
| `snapMinutes` | `number` | `15` | Step dragged and keyboard-edited times snap to. Must divide 60. |
| `scrollToTime` | `Temporal.PlainTime` | one hour before now | Where the time grid scrolls on mount. |
| `allDayCollapsed` / `defaultAllDayCollapsed` / `onAllDayCollapsedChange` | `boolean` | `false` | Whether the all-day lane is collapsed to two rows. |

#### Rendering

| Prop | Type | Description |
|---|---|---|
| `renderEvent` | `(block: EventBlockProps) => ReactNode` | Draws a timed event in the week and day views (default: `EventBlock`). |
| `renderAllDayEvent` | `(chip: EventChipProps) => ReactNode` | Draws an all-day bar (default: `EventChip`). |
| `renderMonthEvent` | `(chip: EventChipProps, placement: "grid" \| "more") => ReactNode` | Draws an event in the month view (default: `EventChip`). |
| `renderEventWrapper` | `({ children, event }) => ReactNode` | Wraps every clickable event, e.g. in a context menu. |
| `renderMorePopover` | `(props: MonthMorePopoverProps) => ReactNode` | Replaces the month view's "+N more" button and popover (native HTML Popover API by default). |

What you return from a render prop goes inside the element that already handles the click, drag and focus, so you can't break those behaviors.

#### Shortcuts, locale and styling

| Prop | Type | Default | Description |
|---|---|---|---|
| `hotkeys` | `CalendarHotkeys` | `true` | `true`, `false`, or per-action overrides. See [Keyboard shortcuts](#keyboard-shortcuts). |
| `hotkeysScope` | `"document" \| "calendar"` | `"document"` | Listen anywhere on the page, or only while focus is inside the calendar. |
| `hotkeyHandlers` | `CalendarHotkeyHandlers` | | Handlers for global shortcuts. `newEvent`, `deleteEvent`, `goToDate` and `close` fire only when you pass a handler. |
| `locale` | `string` | `"en-US"` | BCP 47 locale of every date and time. |
| `timeFormat` | `"12h" \| "24h"` | the locale's | Clock format. |
| `labels` | `CalendarLabelsInput` | English | Partial text overrides. See [Localization](#localization). |
| `formatters` | `Partial<CalendarFormatters>` | `Intl` | Partial date and time format overrides. |
| `className` / `classNames` | `string` / `CalendarClassNames` | | `classNames` has `root`, `view`, plus `toolbar`, `month` and `timeGrid` objects with each view's own parts. |

### `<MiniCalendar>`

A horizontal strip of days with previous and next arrows. Each day shows its month and number, today is highlighted softly, and the selected day is filled. It ships from its own entry point, so importing it doesn't pull in the grid views:

```tsx
import { MiniCalendar } from "@usecalendar/react/mini";

function DayPicker() {
  const [day, setDay] = useState(() => Temporal.Now.plainDateISO());
  return <MiniCalendar value={day} onValueChange={setDay} days="auto" />;
}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` / `defaultValue` / `onValueChange` | `Temporal.PlainDate \| null` | none | Selected day, controlled or uncontrolled. A `value` set from outside the visible days moves the strip to it. |
| `days` | `number \| "auto"` | `7` | Days shown at once. `"auto"` fits as many as the width allows. It measures after mount, so server rendering shows 7. |
| `minDayWidth` | `number` | `48` | Minimum width of a day in pixels (gap included) for `days="auto"`. |
| `align` | `"week" \| "start" \| "center"` | `"week"` | How the strip lines up around the selected day (or today): pages from the start of the week, the day first, or the day in the middle. |
| `step` | `"page" \| "day"` | `"page"` | How far the arrows move: a whole page or one day. |
| `start` / `defaultStart` / `onStartChange` | `Temporal.PlainDate` | lined up by `align` | First day shown, controlled or uncontrolled. |
| `onRangeChange` | `(first, last) => void` | | Called with the first and last day shown whenever they change, e.g. to fetch dots for days with events. |
| `weekStart` | `WeekStart` | `"monday"` | First day of the week, for `align="week"`. |
| `showWeekends` | `boolean` | `true` | When `false`, weekends are skipped and the strip still shows `days` days. |
| `timeZone` | `string` | system zone | Decides which day is today. |
| `minDate` / `maxDate` | `Temporal.PlainDate` | | Selectable bounds (inclusive). The strip doesn't page past them. |
| `isDayDisabled` | `(day) => boolean` | | Makes single days unselectable. They stay visible and focusable. |
| `calendar` | `CalendarState` | | A `useCalendar` state to stay in sync with. See [Syncing the mini calendar with the full calendar](#syncing-the-mini-calendar-with-the-full-calendar). |
| `renderDay` | `(props: MiniCalendarDayRenderProps) => ReactNode` | | Draws a day's content: `{ day, month, dayNumber, isToday, isSelected, isDisabled, defaultContent }`. |
| `hotkeys` | `CalendarHotkeys` | the provider's | The strip's own shortcuts. See [Keyboard shortcuts](#keyboard-shortcuts). |
| `locale` / `labels` / `formatters` | | the provider's | Applied on top of the nearest `CalendarLocaleProvider`. |
| `className` / `classNames` | `string` / `MiniCalendarClassNames` | | Parts: `root`, `previous`, `next`, `days`, `day`, `month`, `dayNumber`, `today`, `selected`, `disabled`. |

Each day also exposes its state as `data-day` (ISO date), `data-today`, `data-selected` and `data-disabled`.

For a strip with your own markup, use the headless hook it's built on:

```tsx
import { useMiniCalendar } from "@usecalendar/react/mini";

const strip = useMiniCalendar({ days: 5, align: "center", onValueChange: setDay });
// strip.days, strip.selected, strip.today, strip.select(day), strip.goToNext(), strip.canGoNext, …
```

### Building blocks

`<Calendar>` is assembled from exported parts. Use them to build your own layout:

| Export | What it is |
|---|---|
| `useCalendar(options)` | Headless navigation state: `date`, `view`, `days`, `range`, `today`, and `goToNext`, `goToPrevious`, `goToToday`, `goToDate`, `setView`. Takes the same navigation options as `<Calendar>`. |
| `CalendarProvider` / `useCalendarContext` | Shares a `CalendarState` with the views and toolbar. `useCalendarContext` throws `CalendarContextError` outside a provider. |
| `MonthView` | The month grid. Props: `events`, `onEventClick`, `onDayClick`, `renderEvent`, `renderEventWrapper`, `renderMorePopover`, `className`, `classNames`. |
| `TimeGridView` | The week and day grid (it draws `calendar.days`). It takes the event, editing and rendering props listed under [`<Calendar>`](#events-and-editing). |
| `CalendarToolbar` | Today, previous and next buttons, title and view switcher. Props: `views`, `className`, `classNames`. It adapts to its own width: under 36rem the view switcher moves to a second row and the title truncates. |
| `EventChip` / `EventBlock` | The default event look (month and all-day bars, time-grid blocks). Spread the props a render prop receives into them to keep the defaults. |
| `CalendarLocaleProvider` / `useCalendarLocale` | Shares `locale`, `timeFormat`, `labels` and `formatters`. |
| `CalendarKeymapProvider` / `useCalendarKeymap` | Shares the shortcut configuration with the grids and the mini calendar. |
| `useCalendarHotkeys` | Binds the global shortcuts for a `CalendarState`. |
| `useToday`, `useNow`, `useSystemTimeZone` | SSR-safe clock hooks (`null` / UTC on the server). |
| `useEventKeyboardHint` | The screen-reader hint describing the event shortcuts actually bound. |

```tsx
import {
  CalendarKeymapProvider,
  CalendarProvider,
  CalendarToolbar,
  MonthView,
  TimeGridView,
  useCalendar,
  useCalendarHotkeys,
} from "@usecalendar/react";

function MyCalendar({ events }) {
  const calendar = useCalendar({ defaultView: "month" });
  useCalendarHotkeys({ calendar });
  return (
    <CalendarProvider calendar={calendar}>
      <CalendarKeymapProvider>
        <CalendarToolbar views={["week", "month"]} />
        {calendar.view === "month" ? <MonthView events={events} /> : <TimeGridView events={events} />}
      </CalendarKeymapProvider>
    </CalendarProvider>
  );
}
```

The framework-agnostic math (visible days and ranges, month and day layout, drag and resize math, focus models, keymap matching) lives in [`@usecalendar/core`](./packages/core).

## Recipes

### Fetching events for the visible range

`onRangeChange` fires after render with the UTC range the current view draws (whole weeks for the month view), once per change. It doesn't fire during server rendering unless `date` is controlled.

```tsx
const [events, setEvents] = useState<CalendarEvent<Row>[]>([]);

<Calendar
  events={events}
  onRangeChange={async ({ start, end }) => {
    const rows = await api.events.list({ from: start, to: end });
    setEvents(rows.map(toCalendarEvent));
  }}
/>
```

With a data library, keep the range in state and let it key the query:

```tsx
const [range, setRange] = useState<DateRange | null>(null);
const { data = [] } = useQuery({ queryKey: ["events", range], queryFn: () => fetchEvents(range!), enabled: range !== null });

<Calendar events={data} onRangeChange={setRange} />
```

### Creating events

A click on an empty slot proposes a `defaultEventDuration`-minute range, and dragging over slots proposes the swept range. Show the draft on the grid while your form is open:

```tsx
const [draft, setDraft] = useState<TimeRange | null>(null);

<Calendar
  events={events}
  draftRange={draft}
  onSlotClick={setDraft}
  onRangeSelect={setDraft}
/>
{draft && <EventForm range={draft} onClose={() => setDraft(null)} />}
```

To create events with the `c` shortcut, pass a handler: `hotkeyHandlers={{ newEvent: () => openCreateForm() }}`.

### Moving and resizing events

Dragging an event, dragging its bottom edge, or the Alt+arrow shortcuts call `onEventChange` with the proposed times. The calendar keeps drawing the old times until you update `events`:

```tsx
<Calendar
  events={events}
  onEventChange={async (event, range) => {
    setEvents((all) => all.map((e) => (e.id === event.id ? { ...e, ...range } : e))); // optimistic
    await api.events.update(event.id, range);
  }}
  isEventEditable={(event) => event.data?.ownerId === me.id}
/>
```

For recurring occurrences, ask "this event or the whole series?" inside `onEventChange` before saving. The calendar doesn't need to know.

### Context menus

`renderEventWrapper` wraps every clickable event (timed, all-day and month). For example, with shadcn/ui's `ContextMenu`:

```tsx
<Calendar
  events={events}
  renderEventWrapper={({ children, event }) => (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => duplicate(event)}>Duplicate</ContextMenuItem>
        <ContextMenuItem onSelect={() => remove(event)}>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )}
/>
```

### Custom event content

Spread the props you receive into the default component to keep its look, or draw your own:

```tsx
<Calendar
  events={events}
  renderEvent={(block) => <EventBlock {...block} classNames={{ title: "font-semibold" }} />}
  renderMonthEvent={(chip, placement) =>
    placement === "more" ? <EventChip {...chip} /> : <EventChip {...chip} classNames={{ time: "hidden" }} />
  }
/>
```

### Syncing the mini calendar with the full calendar

Create the state with `useCalendar` and pass it to both. Picking a day in the strip calls `goToDate`, and navigating the calendar moves the strip:

```tsx
import { Calendar, useCalendar } from "@usecalendar/react";
import { MiniCalendar } from "@usecalendar/react/mini";

function Planner({ events }) {
  const calendar = useCalendar({ defaultView: "day" });
  return (
    <>
      <MiniCalendar calendar={calendar} days="auto" />
      <Calendar calendar={calendar} events={events} />
    </>
  );
}
```

The strip also uses the calendar's `weekStart`, `showWeekends` and `timeZone` unless you pass its own.

### Small screens

The calendar never changes its view on its own: the view belongs to your app. The toolbar adapts to its own width (the view switcher moves to a second row under 36rem), and every view works at phone widths, but seven day columns are tight on a phone. To open the day view on small screens, pick the view after mounting, so server rendering and hydration agree:

```tsx
import type { CalendarEvent, CalendarView } from "@usecalendar/core";
import { Calendar, CalendarToolbar } from "@usecalendar/react";
import { useEffect, useState } from "react";

function ResponsiveCalendar({ events }: { events: CalendarEvent[] }) {
  const [view, setView] = useState<CalendarView>("week");
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    setIsSmall(query.matches);
    if (query.matches) setView("day");
    const onChange = () => setIsSmall(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <Calendar
      events={events}
      onViewChange={setView}
      // Optional: offer only the views that read well on a phone.
      toolbar={() => <CalendarToolbar views={isSmall ? ["day", "month"] : ["day", "week", "month"]} />}
      view={view}
    />
  );
}
```

### Event dots in the mini calendar

```tsx
const [busy, setBusy] = useState<Set<string>>(new Set());

<MiniCalendar
  onRangeChange={async (first, last) => setBusy(new Set(await api.busyDays(first, last)))}
  renderDay={({ day, defaultContent, isSelected }) => (
    <>
      {defaultContent}
      <span
        aria-hidden
        className={`size-1 rounded-full ${isSelected ? "bg-uc-primary-foreground" : "bg-uc-primary"} ${busy.has(day.toString()) ? "" : "invisible"}`}
      />
    </>
  )}
/>
```

## Theming

### Tokens

Colors and radius come from CSS variables. Each one falls back to the matching [shadcn/ui](https://ui.shadcn.com/docs/theming) token, so in a shadcn app the calendar already matches your theme.

| Token | Falls back to | Tailwind utility |
|---|---|---|
| `--uc-background` / `--uc-foreground` | `--background` / `--foreground` | `bg-uc-background`, `text-uc-foreground` |
| `--uc-muted` / `--uc-muted-foreground` | `--muted` / `--muted-foreground` | `bg-uc-muted`, `text-uc-muted-foreground` |
| `--uc-accent` / `--uc-accent-foreground` | `--accent` / `--accent-foreground` | hover states |
| `--uc-primary` / `--uc-primary-foreground` | `--primary` / `--primary-foreground` | today badge, selected day |
| `--uc-popover` / `--uc-popover-foreground` | `--popover` / `--popover-foreground` | "+N more" popover |
| `--uc-border` | `--border` | `border-uc-border` |
| `--uc-ring` | `--ring` | focus rings |
| `--uc-destructive` | `--destructive` | current-time line |
| `--uc-radius` | `--radius` | `rounded-uc` |

Override them globally or on one calendar:

```css
.brand-calendar {
  --uc-primary: oklch(0.55 0.2 280);
  --uc-radius: 0.375rem;
}
```

Event surfaces are tinted from each event's `color` and tuned with variables you can override the same way: `--uc-event-tint`, `--uc-event-past-tint`, `--uc-event-block-tint`, `--uc-event-block-past-tint`, `--uc-event-past-mix`, `--uc-event-stripe-angle` and `--uc-event-stripe-width`.

### Dark mode

Dark mode lives in the tokens. It turns on with a `.dark` class or `data-theme="dark"` on any ancestor (the next-themes and shadcn conventions), or automatically from the OS preference unless a `.light` class or `data-theme="light"` opts out. The components use no `dark:` variants, and the library doesn't define a `dark` custom variant, so yours keeps working.

### Classes

`className` and every `classNames` slot are merged with `tailwind-merge`, so conflicting utilities replace the defaults:

```tsx
<Calendar
  className="rounded-uc border border-uc-border"
  classNames={{ toolbar: { title: "text-lg" }, month: { cell: "min-h-28", today: "bg-violet-600" } }}
/>
<MiniCalendar classNames={{ day: "rounded-full", selected: "bg-violet-600 text-white" }} />
```

The components set nothing visual in inline `style` (only data such as positions and `--uc-event-color`), and the event look lives in `@layer components`. Plain classes and unlayered CSS override everything without `!important`. Fonts are inherited from your app.

Renaming a `classNames` slot, a CSS variable or a `labels` key is treated as a breaking change.

## Localization

```tsx
<Calendar
  locale="es-PE"
  timeFormat="24h"
  labels={{
    today: "Hoy",
    previous: "Anterior",
    next: "Siguiente",
    views: { day: "Día", week: "Semana", month: "Mes" },
    moreEvents: (count) => `+${count} más`,
  }}
/>
```

- **`locale`** formats every weekday, month, date and time through `Intl` and picks the default clock format. Labels aren't translated automatically.
- **`labels`** (partial): `today`, `previous`, `next`, `navigation`, `views`, `viewSwitcher`, `grid`, `moreEvents(count)`, `allDayEvents(titles)`, `expandAllDay`, `collapseAllDay`, `tentative`, `weekNumber(n)`, `weekNumberHeader`, `eventKeyboardHint(keys)`, and for the mini calendar `miniCalendar`, `previousDays` and `nextDays`. English defaults are exported as `DEFAULT_LABELS`.
- **`formatters`** (partial), each `(value, { locale, timeFormat, timeZone }) => string`: `weekday`, `dayNumber`, `fullDate`, `monthYear`, `monthShort` (mini calendar), `hour`, `time` and `timeRange`. Defaults are exported as `DEFAULT_FORMATTERS`.

To share one configuration between a `<MiniCalendar>` and the parts of a calendar you compose yourself, wrap them in `CalendarLocaleProvider`. `<Calendar>` renders its own provider from its props. The mini calendar's `locale`, `labels` and `formatters` props apply on top of the nearest provider.

```tsx
<CalendarLocaleProvider locale="es-PE" labels={{ miniCalendar: "Fechas", previousDays: "Días anteriores", nextDays: "Días siguientes" }}>
  <MiniCalendar />
</CalendarLocaleProvider>
```

## Keyboard shortcuts

**Focus keys are fixed.** They follow the WAI-ARIA grid and listbox patterns that screen-reader users rely on:

| Keys | Month view | Week and day views | Mini calendar |
|---|---|---|---|
| Arrows | Previous/next day or week | ↑/↓ slot or event, ←/→ day | ←/→ day. Past an edge the strip pages. |
| Home / End | First/last day of the week | First/last day | First/last day shown |
| Ctrl+Home / Ctrl+End | First/last day of the grid | First/last slot of the day | |
| PageUp / PageDown | | One hour up/down | Previous/next page |

At the edge of the month grid, the arrow keys are left to the global shortcuts, so → moves to the next month.

**Everything else is configurable** through `hotkeys`. The defaults (exported as `CALENDAR_KEYMAP` from `@usecalendar/core`, shaped like a hotkey-registry keymap) are:

| Action | Keys | Where |
|---|---|---|
| `goToToday` | `t` | global, mini calendar |
| `next` / `previous` | `j`, `→` / `k`, `←` | global, mini calendar (`j` / `k`) |
| `goToDate` | `.` | global (needs a handler) |
| `dayView` / `weekView` / `monthView` | `d` / `w` / `m` | global |
| `newEvent` | `c` | global (needs a handler) |
| `deleteEvent` | `Backspace`, `Delete` | global (needs a handler) |
| `close` | `Escape` | global (needs a handler) |
| `openFocused` | `Enter`, `Space` | grids, mini calendar (select the focused day) |
| `moveEventUp` / `moveEventDown` | `Alt+↑` / `Alt+↓` | time grid |
| `moveEventToPreviousDay` / `moveEventToNextDay` | `Alt+←` / `Alt+→` | time grid |
| `shortenEvent` / `extendEvent` | `Alt+Shift+↑` / `Alt+Shift+↓` | time grid |
| `cancelDrag` | `Escape` | time grid, during a drag |

```tsx
<Calendar
  hotkeys={{ next: ["l", "arrowright"], deleteEvent: null, moveEventUp: "shift+arrowup" }}
  hotkeyHandlers={{ newEvent: () => openCreateForm(), deleteEvent: () => removeSelected() }}
/>
```

- `true` keeps the defaults and `false` turns every shortcut off. In an override object, each key replaces that action's keys, and `null` turns the action off. Combinations use `+` and the modifiers `ctrl`, `alt`, `shift`, `meta` and `mod` (⌘ on macOS, Ctrl elsewhere).
- **Scope.** With the default `hotkeysScope="document"`, every calendar on the page shares one listener, and only the calendar the user last focused or clicked (else the last one mounted) handles a key. `"calendar"` listens only while focus is inside it. Keys typed in inputs and editable fields are ignored.
- **Handled keys are consumed.** A grid or the mini calendar that handles a key calls `preventDefault()`, so the global shortcuts skip it.
- **Mini calendar.** The strip reads the shortcuts of the nearest `CalendarKeymapProvider` (which `<Calendar>` renders), or its own `hotkeys` prop when given. It uses `openFocused`, `previous`, `next` and `goToToday`.
- **Actions that touch your data** (`newEvent`, `deleteEvent`, `goToDate`, `close`) never act on their own: they fire only when you pass a handler.
- Changing a default key is a breaking change (a major version).

## Accessibility

- The month view and the time grid are ARIA `grid`s with a single tab stop and roving focus. Today is marked with `aria-current="date"`.
- Events are buttons named by their title and time (and "Tentative" in the week and day views), with `aria-pressed` for the selected one. A focused event in the time grid describes its move and resize shortcuts, built from the keys actually bound (remapped or turned-off shortcuts are reflected).
- The mini calendar is a horizontal `listbox`. Each day is an `option` with a full-date label, `aria-selected`, `aria-disabled` and `aria-current="date"`, and the arrows are labeled buttons.
- Every visible and screen-reader text is translatable through `labels`.
- Focus rings use the `--uc-ring` token. Don't remove them without a replacement.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, scripts and the pull request checklist. Please report security issues as described in [SECURITY.md](./SECURITY.md). Release notes live in each package's changelog ([core](./packages/core/CHANGELOG.md), [react](./packages/react/CHANGELOG.md)).

## License

[ISC](./LICENSE) © Sebastian Urdanegui Bisalaya
