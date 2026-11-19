import { MINUTES_PER_DAY } from "./day-layout.js";

/** Default length of one time-grid row (slot), in minutes. */
export const SLOT_MINUTES = 30;

/**
 * What has keyboard focus in a time grid: an empty slot (`eventId: null`), or an event that starts in that slot.
 * `day` is the index of the shown day column and `slot` the row index from midnight.
 */
export type GridFocus = {
  day: number;
  eventId: string | null;
  slot: number;
};

/** Events by day column index, each with the slot it starts in, in reading order (start, then lane). */
export type DayEvents = readonly (readonly {
  id: string;
  slot: number;
}[])[];

/**
 * A stable string for a {@link GridFocus}, e.g. to compare focus targets or store one in a `data-*` attribute.
 *
 * @example
 * focusKey({ day: 2, eventId: null, slot: 18 }); // "2:18"
 * focusKey({ day: 2, eventId: "evt_1", slot: 18 }); // "2:18:evt_1"
 */
export const focusKey = ({ day, eventId, slot }: GridFocus): string =>
  eventId === null ? `${day}:${slot}` : `${day}:${slot}:${eventId}`;

// One day reads top to bottom as each slot followed by the events that start in it, so ↑/↓ walk slots and events alike.
const dayItems = (
  events: DayEvents,
  day: number,
  slotsPerDay: number,
): GridFocus[] =>
  Array.from(
    {
      length: slotsPerDay,
    },
    (_, slot) => [
      {
        day,
        eventId: null,
        slot,
      },
      ...(events[day] ?? [])
        .filter((event) => event.slot === slot)
        .map((event) => ({
          day,
          eventId: event.id,
          slot,
        })),
    ],
  ).flat();

/**
 * Where keyboard focus moves for a key press in a time grid, or `null` when the key isn't a grid key or focus
 * is already at the edge.
 *
 * - `↑`/`↓`: previous/next slot or event in the same day.
 * - `←`/`→`: same slot in the previous/next day.
 * - `Home`/`End`: first/last day (with Ctrl/⌘: first/last slot of the day).
 * - `PageUp`/`PageDown`: one hour up/down.
 *
 * @param slotMinutes - Length of one slot; must divide 60 evenly. Defaults to {@link SLOT_MINUTES}.
 */
export const nextFocus = (
  focus: GridFocus,
  key: string,
  ctrlKey: boolean,
  events: DayEvents,
  dayCount: number,
  slotMinutes = SLOT_MINUTES,
): GridFocus | null => {
  const slotsPerDay = MINUTES_PER_DAY / slotMinutes;
  const slotsPerHour = 60 / slotMinutes;
  const slotIn = (day: number, slot: number): GridFocus => ({
    day: Math.min(Math.max(day, 0), dayCount - 1),
    eventId: null,
    slot: Math.min(Math.max(slot, 0), slotsPerDay - 1),
  });
  switch (key) {
    case "ArrowDown":
    case "ArrowUp": {
      const items = dayItems(events, focus.day, slotsPerDay);
      const index = items.findIndex(
        (item) => focusKey(item) === focusKey(focus),
      );
      return items[index + (key === "ArrowDown" ? 1 : -1)] ?? null;
    }
    case "ArrowLeft":
      return focus.day > 0 ? slotIn(focus.day - 1, focus.slot) : null;
    case "ArrowRight":
      return focus.day < dayCount - 1
        ? slotIn(focus.day + 1, focus.slot)
        : null;
    case "Home":
      return ctrlKey ? slotIn(focus.day, 0) : slotIn(0, focus.slot);
    case "End":
      return ctrlKey
        ? slotIn(focus.day, slotsPerDay - 1)
        : slotIn(dayCount - 1, focus.slot);
    case "PageUp":
      return slotIn(focus.day, focus.slot - slotsPerHour);
    case "PageDown":
      return slotIn(focus.day, focus.slot + slotsPerHour);
    default:
      return null;
  }
};

/** A day cell in the month grid: `row` is the week index from the top, `column` the shown day index in it. */
export type MonthCell = {
  column: number;
  row: number;
};

/**
 * Where keyboard focus moves for a key press in the month grid, or `null` when the key isn't a grid key or focus
 * is already at the edge (so the key is left to the global shortcuts, e.g. → moves to the next month).
 *
 * - `↑`/`↓`: same day in the previous/next week.
 * - `←`/`→`: previous/next day in the same week.
 * - `Home`/`End`: first/last day of the week (with Ctrl/⌘: first/last day of the grid).
 *
 * @example
 * nextMonthFocus({ row: 0, column: 3 }, "End", true, 5, 7); // { row: 4, column: 6 }
 */
export const nextMonthFocus = (
  cell: MonthCell,
  key: string,
  ctrlKey: boolean,
  rowCount: number,
  columnCount: number,
): MonthCell | null => {
  const at = (row: number, column: number): MonthCell | null =>
    row >= 0 && row < rowCount && column >= 0 && column < columnCount
      ? {
          column,
          row,
        }
      : null;
  switch (key) {
    case "ArrowDown":
      return at(cell.row + 1, cell.column);
    case "ArrowUp":
      return at(cell.row - 1, cell.column);
    case "ArrowLeft":
      return at(cell.row, cell.column - 1);
    case "ArrowRight":
      return at(cell.row, cell.column + 1);
    case "Home":
      return ctrlKey ? at(0, 0) : at(cell.row, 0);
    case "End":
      return ctrlKey
        ? at(rowCount - 1, columnCount - 1)
        : at(cell.row, columnCount - 1);
    default:
      return null;
  }
};
