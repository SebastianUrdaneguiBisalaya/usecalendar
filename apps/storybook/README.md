# @usecalendar/storybook

A private Storybook for reviewing the usecalendar components by hand while developing: every view, state and edge case, with live controls for props, theme and locale.

It is **not** a test suite and it is **never published**: not to npm, not as a hosted site. There are no test addons (no `@storybook/addon-vitest`, Playwright, Chromatic or screenshot tests); see the "No visual or browser tests" rule in [AGENTS.md](../../AGENTS.md).

## Run it

From the repository root:

```bash
pnpm install
pnpm run storybook   # http://localhost:6006
```

Stories import `@usecalendar/core`, `@usecalendar/react` and `@usecalendar/react/mini` from the packages' **source** (Vite aliases in `.storybook/main.ts`, `paths` in `tsconfig.json`), so edits hot-reload without building and never use a stale `dist`.

Other scripts, run inside `apps/storybook`:

| Command | What it does |
|---|---|
| `pnpm run build-storybook` | Builds a static Storybook into `storybook-static/`, as a local check only. Don't deploy it. |
| `pnpm run typecheck` | Type-checks the stories and the config (also run by the root `pnpm run typecheck`). |

Lint and formatting come from the root `pnpm run lint` (Biome).

## Toolbar

| Control | Effect |
|---|---|
| Theme | `data-theme` on `<html>`: system (OS preference), light or dark. |
| Locale | The `locale` prop (`en-US` by default, `es-PE`, `de-DE`, …). |
| Time zone | The `timeZone` prop. The demo events are authored in the browser's zone, so other zones show them shifted. |
| Week start | The `weekStart` prop. |
| Stylesheet | **Tailwind v4 app**: `@import "tailwindcss"` plus the source `theme.css`. **No Tailwind**: the same input as the prebuilt `styles.css` (no preflight). Classes written only in stories exist only in the Tailwind mode, as in a real app. |

Toolbar values apply to a story's component when its `parameters.calendarGlobals` lists them, unless the story sets that prop itself. Every story also gets the locale through a `CalendarLocaleProvider`.

The **Actions** panel logs every callback (`onEventChange`, `onSlotClick`, `onRangeChange`, shortcuts, …). The **Accessibility** panel runs axe when you ask it to.

## Stories

- `Calendar/Calendar`: month, week and day views; read-only, `isEventEditable`, `draftRange`, `selectedEventId`, custom toolbar, `renderEvent`, `renderEventWrapper`, `hotkeys` overrides, and driving it from `useCalendar`.
- `Calendar/Edge cases`: overlapping, all-day and multi-day events, "+N more", tentative and past events, the current-time line, events crossing midnight, no weekends, week numbers, `slotMinutes`/`snapMinutes`, a mobile viewport, no events.
- `MiniCalendar`: controlled and uncontrolled, `days` (number and `"auto"`), `align`, `step`, `minDate`/`maxDate`, `isDayDisabled`, `renderDay` with event dots, and synced with `<Calendar>`.
- `Building blocks`: `EventChip` and `EventBlock` looks, `CalendarToolbar`, and theming (`--uc-*` tokens, shadcn tokens, `classNames`).

The calendar stories keep their events in React state (`src/support/demo-calendar.tsx`), so creating, moving, resizing and deleting (with the `deleteEvent` shortcut) really work.

Every story opens on a fixed date, `DEMO_DATE` in `src/support/demo-events.ts`, so the layout doesn't depend on today. Only the past-events and current-time stories follow the real clock, and the current-time line always does.

## Adding a story

Put `*.stories.tsx` files in `src/stories/`. Build events with the helpers in `src/support/demo-events.ts` (`timed`, `allDay`, `demoDay`) and render calendars through `DemoCalendar`. When a component gains a prop, state or look, add or update its story.
