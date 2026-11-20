import { MINUTES_PER_DAY } from "./day-layout.js";

/**
 * The hours of the week someone works. The time grid marks every slot outside them as off hours.
 *
 * Times are wall-clock times in the calendar's time zone.
 *
 * @example
 * const workingHours: WorkingHours = {
 *   days: [1, 2, 3, 4, 5], // Monday to Friday
 *   end: Temporal.PlainTime.from("18:00"),
 *   start: Temporal.PlainTime.from("09:00"),
 * };
 */
export type WorkingHours = {
  /** Weekdays with working hours, numbered like `Temporal.PlainDate#dayOfWeek`: 1 is Monday, 7 is Sunday. */
  days: readonly number[];
  /** When the working day ends (exclusive). `00:00` means midnight at the end of the day. */
  end: Temporal.PlainTime;
  /** When the working day starts. */
  start: Temporal.PlainTime;
};

const minuteOfDay = (time: Temporal.PlainTime): number =>
  time.hour * 60 + time.minute;

/**
 * Whether `minute` minutes into `day` (wall-clock time) falls inside the working hours: the day is a working day and
 * the time is at or after `start` and before `end`. An `end` at or before `start` (other than `00:00`) leaves no
 * working time that day.
 *
 * @example
 * isWorkingTime(Temporal.PlainDate.from("2026-11-20"), 9 * 60, workingHours); // true: Friday, 9:00
 */
export const isWorkingTime = (
  day: Temporal.PlainDate,
  minute: number,
  hours: WorkingHours,
): boolean => {
  if (!hours.days.includes(day.dayOfWeek)) return false;
  const start = minuteOfDay(hours.start);
  const end = minuteOfDay(hours.end) || MINUTES_PER_DAY;
  return minute >= start && minute < end;
};
