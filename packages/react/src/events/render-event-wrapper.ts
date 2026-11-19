import type { CalendarEvent } from "@usecalendar/core";
import type { ReactElement } from "react";

/** Props of `renderEventWrapper`. */
export type RenderEventWrapperProps<TData = unknown> = {
  /** The clickable event element; render it inside your wrapper (e.g. as a context-menu trigger). */
  children: ReactElement;
  event: CalendarEvent<TData>;
};
