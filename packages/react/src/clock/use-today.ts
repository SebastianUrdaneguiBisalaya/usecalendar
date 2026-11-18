import { useMemo, useSyncExternalStore } from "react";

// The clock is an external store: notify once the day changes in the time zone, so "today" stays right in an app
// left open overnight. One stable subscriber per zone, so React doesn't resubscribe on every render.
const subscribers = new Map<string, (onChange: () => void) => () => void>();
const subscriberFor = (timeZone: string) => {
  let subscribe = subscribers.get(timeZone);
  if (subscribe === undefined) {
    subscribe = (onChange) => {
      let timer: ReturnType<typeof setTimeout>;
      const schedule = () => {
        const now = Temporal.Now.zonedDateTimeISO(timeZone);
        const untilTomorrow =
          now
            .toPlainDate()
            .add({
              days: 1,
            })
            .toZonedDateTime({
              timeZone,
            }).epochMilliseconds - now.epochMilliseconds;
        timer = setTimeout(() => {
          onChange();
          schedule();
        }, untilTomorrow);
      };
      schedule();
      return () => clearTimeout(timer);
    };
    subscribers.set(timeZone, subscribe);
  }
  return subscribe;
};

// Server rendering can't know the viewer's "today": it renders null and the client fills it in after hydration.
const getServerToday = (): null => null;

/**
 * Today in `timeZone`, updated when the day changes; `null` during server rendering and hydration, so markup
 * never mismatches.
 */
export const useToday = (timeZone: string): Temporal.PlainDate | null => {
  // The snapshot is text: it must stay equal between calls until the day changes.
  const today = useSyncExternalStore(
    subscriberFor(timeZone),
    () => Temporal.Now.plainDateISO(timeZone).toString(),
    getServerToday,
  );
  return useMemo(
    () => (today === null ? null : Temporal.PlainDate.from(today)),
    [
      today,
    ],
  );
};
