import { cn } from "../utils/cn.js";
import { boxStyle } from "./grid-geometry.js";

/** Line at the current time across today's column. Decorative: the time is in the header and the clock. */
export function CurrentTimeLine({
  className,
  dayCount,
  dayIndex,
  now,
  timeZone,
}: {
  className: string | undefined;
  dayCount: number;
  dayIndex: number;
  /** Epoch ms; nothing is drawn while unknown (server rendering). */
  now: number | null;
  timeZone: string;
}) {
  if (now === null) return null;
  const time =
    Temporal.Instant.fromEpochMilliseconds(now).toZonedDateTimeISO(timeZone);
  const minute = time.hour * 60 + time.minute;
  const { left, top, width } = boxStyle(dayIndex, dayCount, minute, minute);
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute z-[6] h-0", className)}
      data-uc-current-time=""
      style={{
        left,
        top,
        width,
      }}
    >
      <div className="absolute inset-x-0 -top-px h-0.5 bg-uc-destructive" />
      <div className="absolute -top-1.5 -left-1.5 size-3 rounded-full bg-uc-destructive" />
    </div>
  );
}
