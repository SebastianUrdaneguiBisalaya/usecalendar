import type { CalendarEvent } from "@usecalendar/core";
import type { ReactElement } from "react";

/** Props of `renderEventWrapper`. */
export type RenderEventWrapperProps<TData = unknown> = {
  /**
   * The clickable event element; render it inside your wrapper (e.g. as a context-menu trigger). Props and a ref added
   * to it (`cloneElement`, an `asChild` trigger) reach the event's button in every view, run before its own handlers,
   * and can skip them with `preventDefault()`.
   */
  children: ReactElement;
  /** The event being wrapped, with your own `data`. */
  event: CalendarEvent<TData>;
};
