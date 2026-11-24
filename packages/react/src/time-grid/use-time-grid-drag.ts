import {
  type CalendarEvent,
  focusKey,
  MINUTES_PER_DAY,
  moveRange,
  resizeRange,
  sweepRange,
  type TimeRange,
  wallTime,
} from "@usecalendar/core";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { useCalendarKeymap } from "../hotkeys/keymap-context.js";
import { sameRange } from "../utils/same-range.js";

/** A spot on the grid: day column index and minutes from midnight, unsnapped. */
type GridPoint = {
  day: number;
  minute: number;
};

type Drag<TData> =
  | {
      at: GridPoint;
      from: GridPoint;
      kind: "create";
    }
  | {
      at: GridPoint;
      event: CalendarEvent<TData>;
      grab: GridPoint;
      kind: "move";
    }
  | {
      at: GridPoint;
      event: CalendarEvent<TData>;
      grab: GridPoint;
      kind: "resize";
    };

/** The pointer that went down, and its drag once it has moved far enough to be one. */
type Pending<TData> = {
  drag: Drag<TData>;
  pointerId: number;
  started: boolean;
  x: number;
  y: number;
};

/** Pixels the pointer moves before a press becomes a drag, so plain clicks still create or open. */
const DRAG_THRESHOLD = 4;

type TimeGridDragOptions<TData> = {
  days: readonly Temporal.PlainDate[];
  /** A range was swept over empty slots. */
  onCreate: (range: TimeRange) => void;
  /** An event was dropped at new times. */
  onReschedule: (event: CalendarEvent<TData>, range: TimeRange) => void;
  slotMinutes: number;
  snapMinutes: number;
  timeZone: string;
};

/**
 * Pointer dragging on the time grid: sweep empty slots to create, drag an event to move it, drag its bottom edge to
 * resize it. Times snap to `snapMinutes`; the `cancelDrag` shortcut (Escape) cancels. Touch is left to scrolling.
 */
export const useTimeGridDrag = <TData>({
  days,
  onCreate,
  onReschedule,
  slotMinutes,
  snapMinutes,
  timeZone,
}: TimeGridDragOptions<TData>) => {
  const [drag, setDrag] = useState<Drag<TData> | null>(null);
  const pending = useRef<Pending<TData> | null>(null);
  // A drag ends with a click on whatever is under the pointer; it must not also create or open an event.
  const swallowClick = useRef(false);
  const { gridActionFor } = useCalendarKeymap();

  const dayAt = (index: number) =>
    days[Math.min(Math.max(index, 0), days.length - 1)] ?? days[0];

  // Measured from the first slot, so it follows the font size, the all-day lane and the scroll position.
  const pointAt = (
    grid: HTMLElement,
    x: number,
    y: number,
  ): GridPoint | null => {
    const box = grid
      .querySelector(
        `[data-focus-key="${focusKey({
          day: 0,
          eventId: null,
          slot: 0,
        })}"]`,
      )
      ?.getBoundingClientRect();
    if (box === undefined || box.width === 0 || box.height === 0) return null;
    return {
      day: Math.min(
        Math.max(Math.floor((x - box.left) / box.width), 0),
        days.length - 1,
      ),
      minute: Math.min(
        Math.max(((y - box.top) / box.height) * slotMinutes, 0),
        MINUTES_PER_DAY,
      ),
    };
  };

  const rangeOf = (current: Drag<TData>): TimeRange | null => {
    const day = dayAt(
      current.kind === "create" ? current.from.day : current.at.day,
    );
    if (day === undefined) return null;
    switch (current.kind) {
      case "create":
        return sweepRange(
          day,
          current.from.minute,
          current.at.minute,
          timeZone,
          snapMinutes,
        );
      case "move":
        return moveRange(
          current.event,
          {
            days: current.at.day - current.grab.day,
            minutes: current.at.minute - current.grab.minute,
          },
          timeZone,
          snapMinutes,
        );
      case "resize":
        // Back where it was grabbed: keep the end as it is instead of snapping an unaligned one.
        if (
          current.at.day === current.grab.day &&
          Math.round(current.at.minute - current.grab.minute) === 0
        )
          return {
            endAt: current.event.endAt,
            startAt: current.event.startAt,
          };
        return resizeRange(
          current.event,
          wallTime(day, current.at.minute, timeZone),
          snapMinutes,
        );
    }
  };

  const begin = (
    pointer: PointerEvent<HTMLElement>,
    toDrag: (point: GridPoint) => Drag<TData>,
  ) => {
    const grid = pointer.currentTarget.closest<HTMLElement>('[role="grid"]');
    if (
      pointer.button !== 0 ||
      pointer.pointerType === "touch" ||
      grid === null
    )
      return;
    const point = pointAt(grid, pointer.clientX, pointer.clientY);
    if (point === null) return;
    pending.current = {
      drag: toDrag(point),
      pointerId: pointer.pointerId,
      started: false,
      x: pointer.clientX,
      y: pointer.clientY,
    };
  };

  const cancel = () => {
    if (pending.current?.started) swallowClick.current = true;
    pending.current = null;
    setDrag(null);
  };

  // While dragging, the cancel key works wherever focus is. It's consumed before the global shortcuts see it, so
  // Escape cancels the drag without also triggering `close`.
  const dragging = drag !== null;
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;
  useEffect(() => {
    if (!dragging) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (gridActionFor(event) !== "cancelDrag") return;
      event.preventDefault();
      cancelRef.current();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [
    dragging,
    gridActionFor,
  ]);

  return {
    /** The event being moved or resized, drawn faded at its stored times. */
    draggedId: drag !== null && drag.kind !== "create" ? drag.event.id : null,
    dragKind: drag?.kind ?? null,
    /** Spread on the grid element: it follows the pointer once a drag starts. */
    gridHandlers: {
      onClickCapture: (click: { stopPropagation: () => void }) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        click.stopPropagation();
      },
      onLostPointerCapture: cancel,
      onPointerCancel: cancel,
      onPointerMove: (pointer: PointerEvent<HTMLElement>) => {
        const state = pending.current;
        if (state === null || pointer.pointerId !== state.pointerId) return;
        const wasStarted = state.started;
        if (!state.started) {
          if (
            Math.hypot(pointer.clientX - state.x, pointer.clientY - state.y) <
            DRAG_THRESHOLD
          )
            return;
          state.started = true;
          pointer.currentTarget.setPointerCapture(pointer.pointerId);
        }
        const at = pointAt(
          pointer.currentTarget,
          pointer.clientX,
          pointer.clientY,
        );
        if (at === null) return;
        const before = wasStarted ? rangeOf(state.drag) : null;
        state.drag = {
          ...state.drag,
          at,
        };
        // Pointer moves fire many times per snapped step: re-render only when the preview actually moves.
        // The ref keeps the exact position for the drop either way.
        const after = rangeOf(state.drag);
        if (before !== null && after !== null && sameRange(before, after))
          return;
        setDrag(state.drag);
      },
      onPointerUp: (pointer: PointerEvent<HTMLElement>) => {
        const state = pending.current;
        if (state === null || pointer.pointerId !== state.pointerId) return;
        pending.current = null;
        if (!state.started) return;
        swallowClick.current = true;
        setDrag(null);
        const range = rangeOf(state.drag);
        if (range === null) return;
        if (state.drag.kind === "create") onCreate(range);
        else onReschedule(state.drag.event, range);
      },
    },
    /** Where the swept, moved or resized event would go. */
    preview: drag === null ? null : rangeOf(drag),
    /** Clears a click swallowed by a previous drag; call on every pointer down. */
    resetClick: () => {
      swallowClick.current = false;
    },
    /** Pointer down on an empty slot. */
    startCreate: (pointer: PointerEvent<HTMLElement>) =>
      begin(pointer, (at) => ({
        at,
        from: at,
        kind: "create",
      })),
    /** Pointer down on an event. */
    startMove: (
      pointer: PointerEvent<HTMLElement>,
      event: CalendarEvent<TData>,
    ) => {
      // The slot underneath would start a new event instead.
      pointer.stopPropagation();
      begin(pointer, (at) => ({
        at,
        event,
        grab: at,
        kind: "move",
      }));
    },
    /** Pointer down on an event's bottom edge. */
    startResize: (
      pointer: PointerEvent<HTMLElement>,
      event: CalendarEvent<TData>,
    ) => {
      pointer.stopPropagation();
      begin(pointer, (at) => ({
        at,
        event,
        grab: at,
        kind: "resize",
      }));
    },
  };
};
