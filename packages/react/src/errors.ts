/**
 * Thrown when a calendar hook or component that needs a calendar's state is rendered outside of `<Calendar>`
 * or a `CalendarProvider`.
 */
export class CalendarContextError extends Error {
  constructor(hook: string) {
    super(`${hook} must be used inside <Calendar> or <CalendarProvider>.`);
    this.name = "CalendarContextError";
  }
}
