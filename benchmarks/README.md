# Benchmarks

Saved results of `pnpm run bench:report`, kept in the repo to compare changes over time and to chart. Nothing here is published: each package ships only its `dist/`.

## Run it

```bash
pnpm run bench:report
```

It takes about 30 seconds and runs one case at a time. Each case samples for about 0.5 s (at least 5 samples for core and 3 for React), so large cases take few samples and the CPU isn't kept busy for long. It isn't part of `pnpm run test` or the git hooks.

For a result worth keeping, commit your changes first and close heavy apps: `meta.dirty` records uncommitted changes, and other load on the machine skews the numbers.

Each run writes four files to `results/`:

| File | What it is |
|---|---|
| `latest.json` / `latest.csv` | The most recent run. |
| `<date>_<commit>.json` / `.csv` | The same run, kept as history. |

## What it measures

Every scaling scenario runs with **10, 50, 100, 250, 500, 1000, 2000 and 3000** events. They come from the seeded fixtures in `packages/core/bench/fixtures.ts`: timed events between 07:00 and 20:00, 15 minutes to 3 hours long, so many overlap, plus 15% all-day events lasting 1 to 5 days.

| Scenario (`id`) | Group | What it times |
|---|---|---|
| `week-layout` | core | 7 × `layoutDay` + the all-day lane (`layoutWeek`, `fitWeek`): the layout math the week view does on each render. |
| `month-layout` | core | `monthWeeks` + `layoutWeek`/`fitWeek` per week row: the month view's layout math. Events spread over five weeks. |
| `drag-step` | core | `moveRange` + `resizeRange` + `sweepRange`: the range math of one pointer move while dragging. Doesn't depend on the event count. |
| `focus-100-moves` | core | 100 arrow-key moves with `nextFocus`. Doesn't depend on the event count. |
| `mount-week` | react | Mounting `<Calendar defaultView="week">`. |
| `move-one-event` | react | Re-rendering the week view after one event's times change, as after a drag. |
| `next-week` | react | Clicking the toolbar's Next button in the week view. |
| `mount-month` | react | Mounting `<Calendar defaultView="month">`. |

Core cases are wall-clock times. React cases are commit times from React's `<Profiler>` (`actualDuration`) in jsdom, with React's **development** build. That's the JavaScript side of a frame (rendering and layout math). jsdom doesn't lay out or paint, so real frame rates are checked by hand in Storybook (**Calendar/Performance**, with the frame meter).

## Reading the JSON

```jsonc
{
  "schema": 1,
  "meta": {
    "date": "…", "commit": "26130e3", "branch": "…", "dirty": false,
    "node": "v24.12.0", "cpu": { "model": "Apple M2", "cores": 8 }, "memoryGb": 16,
    "os": { "platform": "darwin", "release": "…", "arch": "arm64" },
    "temporal": "temporal-polyfill",      // or "native"
    "react": { "version": "19.3.1", "build": "development", "environment": "jsdom" },
    "durationSeconds": 30.7
  },
  "settings": { "sizes": [10, 50, …, 3000], "frameMs": 16.667, "unit": "ms", "core": {…}, "react": {…} },
  "scenarios": [
    {
      "id": "week-layout", "group": "core", "title": "Week view layout", "description": "…",
      "results": [
        // events is null for scenarios that don't depend on the count
        { "events": 500, "median": 9.07, "mean": 9.3, "p75": 9.5, "p99": 12.1, "min": 8.7, "max": 12.4,
          "opsPerSecond": 107.5, "samples": 51, "frameShare": 0.544 }
      ]
    }
  ]
}
```

All times are milliseconds per run. `frameShare` is the median divided by one 60 Hz frame (16.7 ms): `0.5` uses half a frame, and anything above `1` drops at least one frame if it happens during an interaction. A frame at 120 Hz has half the time (8.3 ms).

The CSV has one row per scenario and event count, with the same numbers (`median_ms`, `mean_ms`, `p75_ms`, `p99_ms`, `min_ms`, `max_ms`, `ops_per_s`, `samples`, `frame_share`). It opens directly in a spreadsheet.

## Charting

- **Time vs. number of events:** line or bar chart, x = `events`, y = `median` (ms), one series per scenario. Draw a horizontal line at 16.7 ms to show where a 60 Hz frame runs out.
- **Before and after:** load two dated files, the same scenario and count, side by side.
- **Share of a frame:** `frameShare` as a percentage, e.g. stacked bars of layout (core) vs. rendering (react) for the same count.
- Pie charts suit parts of one whole. A single frame's breakdown can work; comparing times across event counts doesn't.

## Caveats

- **Numbers depend on the machine.** Compare runs from the same machine, and publish `meta.cpu` and `meta.node` next to any chart.
- **Temporal:** Node 24 has no native `Temporal`, so runs use `temporal-polyfill`, which is slower than a native implementation. `meta.temporal` records which one ran.
- **React times come from the development build in jsdom.** A production build in a browser is faster. Read the React numbers as relative: how a change or the event count moves them, not what a user sees.
- Medians are reported because they ignore one-off pauses (garbage collection). `p99` and `max` show those pauses.
