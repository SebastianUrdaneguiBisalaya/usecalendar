import { createContext, type ReactNode, use } from "react";
import { CalendarContextError } from "../errors.js";
import type { CalendarState } from "./use-calendar.js";

const CalendarContext = createContext<CalendarState | null>(null);

/**
 * Shares one calendar's state (from {@link useCalendar}) with every part of it: toolbar, views, and your own
 * components. `<Calendar>` renders it for you; use it directly to compose the parts yourself.
 */
export function CalendarProvider({
  calendar,
  children,
}: {
  calendar: CalendarState;
  children: ReactNode;
}) {
  return <CalendarContext value={calendar}>{children}</CalendarContext>;
}

/**
 * The state of the nearest calendar, for components rendered inside `<Calendar>` or a `CalendarProvider`.
 *
 * @throws {@link CalendarContextError} when used outside of one.
 */
export const useCalendarContext = (): CalendarState => {
  const calendar = use(CalendarContext);
  if (calendar === null) throw new CalendarContextError("useCalendarContext");
  return calendar;
};
