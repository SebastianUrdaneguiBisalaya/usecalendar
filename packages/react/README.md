# @usecalendar/react

A drop-in, Google Calendar-style calendar for React: month, week and day views, an all-day lane, a current-time line, drag to create, move and resize, full keyboard navigation, and a compact day strip. It's styled with Tailwind CSS v4 and driven entirely by props.

It draws the events you pass and reports what the user wants through callbacks. It never stores or changes your data.

**[Full documentation →](https://github.com/SebastianUrdaneguiBisalaya/usecalendar#readme)**

## Install

```bash
npm install @usecalendar/react
```

- React 19 or newer (`react` and `react-dom` are peer dependencies).
- A global `Temporal`. Where it isn't native (some browsers, Node 24 when server-rendering), add `temporal-polyfill` and import `"temporal-polyfill/global"` once before the calendar renders.

## Styles

```css
/* Tailwind CSS v4 apps */
@import "tailwindcss";
@import "@usecalendar/react/theme.css";
```

```ts
// Apps without Tailwind: prebuilt utilities and tokens, no global reset
import "@usecalendar/react/styles.css";
```

The colors come from `--uc-*` tokens that fall back to your shadcn/ui theme, dark mode included.

## Usage

```tsx
import { Calendar } from "@usecalendar/react";

<div className="h-[720px]">
  <Calendar
    events={events}
    defaultView="week"
    onRangeChange={(range) => fetchEvents(range)}
    onEventClick={(event) => openEditor(event)}
    onSlotClick={(range) => openCreateForm(range)}
    onEventChange={(event, range) => saveTimes(event.id, range)}
  />
</div>
```

The day strip has its own entry point, so it doesn't pull in the grid views:

```tsx
import { MiniCalendar } from "@usecalendar/react/mini";

<MiniCalendar value={day} onValueChange={setDay} days="auto" />
```

## Entry points

| Import | Exports |
|---|---|
| `@usecalendar/react` | `Calendar`, `MonthView`, `TimeGridView`, `CalendarToolbar`, `EventChip`, `EventBlock`, `useCalendar`, `CalendarProvider`, `CalendarLocaleProvider`, `CalendarKeymapProvider`, `useCalendarHotkeys`, clock hooks, and their types |
| `@usecalendar/react/mini` | `MiniCalendar`, `useMiniCalendar`, and their types |
| `@usecalendar/react/theme.css` | Tokens, the Tailwind `@theme` mapping, and `@source` of the components |
| `@usecalendar/react/styles.css` | Prebuilt stylesheet for apps without Tailwind |

Both JavaScript entries ship ES modules and CommonJS with types, and include `"use client"`. The two entries share their React contexts, so a `CalendarLocaleProvider` or `CalendarKeymapProvider` from `@usecalendar/react` also applies to `MiniCalendar`.

## Documentation

- [Components and props](https://github.com/SebastianUrdaneguiBisalaya/usecalendar#components)
- [Recipes: fetching by range, creating, moving and resizing, context menus, syncing the mini calendar](https://github.com/SebastianUrdaneguiBisalaya/usecalendar#recipes)
- [Theming](https://github.com/SebastianUrdaneguiBisalaya/usecalendar#theming) · [Localization](https://github.com/SebastianUrdaneguiBisalaya/usecalendar#localization) · [Keyboard shortcuts](https://github.com/SebastianUrdaneguiBisalaya/usecalendar#keyboard-shortcuts) · [Accessibility](https://github.com/SebastianUrdaneguiBisalaya/usecalendar#accessibility)

## License

ISC
