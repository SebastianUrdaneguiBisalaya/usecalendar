import {
  belongsInAllDayLane,
  type CalendarEvent,
  fitWeek,
  layoutDay,
  layoutWeek,
  monthWeeks,
  moveRange,
  nextFocus,
  resizeRange,
  sweepRange,
} from "../src/index.js";
import { BASE_DATE, TIME_ZONE, weekDays } from "./fixtures.js";

// Each scenario does what a view does for one render or one pointer move, so benchmarks and budget tests measure
// the same work the UI does.

/** The week view's layout: every timed event laid out per day, all-day ones in the lane. */
export const layoutWeekView = (events: readonly CalendarEvent[]): number => {
  const days = weekDays();
  const timed = events.filter((event) => !belongsInAllDayLane(event));
  const allDay = events.filter((event) => belongsInAllDayLane(event));
  let placed = 0;
  for (const day of days) placed += layoutDay(timed, day, TIME_ZONE, 15).length;
  placed += fitWeek(layoutWeek(allDay, days, TIME_ZONE), days.length, 2).shown
    .length;
  return placed;
};

/** The month view's layout: the weeks of the month, each with its lanes fitted into three rows. */
export const layoutMonthView = (events: readonly CalendarEvent[]): number => {
  let placed = 0;
  for (const week of monthWeeks(BASE_DATE, "monday"))
    placed += fitWeek(layoutWeek(events, week, TIME_ZONE), week.length, 3).shown
      .length;
  return placed;
};

const range = {
  endAt: "2030-03-13T15:00:00Z",
  startAt: "2030-03-13T14:00:00Z",
};

/** What one pointer move computes while dragging: the moved, resized or swept range. */
export const dragStep = (step: number): number => {
  const moved = moveRange(
    range,
    {
      days: step % 3,
      minutes: step * 5,
    },
    TIME_ZONE,
  );
  const resized = resizeRange(
    range,
    Temporal.Instant.from(range.endAt)
      .toZonedDateTimeISO(TIME_ZONE)
      .add({
        minutes: step * 5,
      }),
  );
  const swept = sweepRange(BASE_DATE, 540, 540 + step * 5, TIME_ZONE);
  return moved.startAt.length + resized.endAt.length + swept.endAt.length;
};

/** Arrow-key focus moves across a busy week (seven days, 20 events each). */
export const focusSteps = (moves: number): number => {
  const events = Array.from(
    {
      length: 7,
    },
    (_, day) =>
      Array.from(
        {
          length: 20,
        },
        (_, index) => ({
          id: `${day}-${index}`,
          slot: index * 2,
        }),
      ),
  );
  let focus: Parameters<typeof nextFocus>[0] = {
    day: 0,
    eventId: null,
    slot: 0,
  };
  const keys = [
    "ArrowDown",
    "ArrowRight",
    "ArrowDown",
    "ArrowLeft",
  ];
  for (let index = 0; index < moves; index += 1)
    focus =
      nextFocus(
        focus,
        keys[index % keys.length] ?? "ArrowDown",
        false,
        events,
        7,
      ) ?? focus;
  return focus.slot;
};
