import type { CalendarEvent } from "@usecalendar/core";
import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { useCalendarContext } from "../calendar/calendar-context.js";
import { useCalendarLocale } from "../locale/locale-context.js";
import { cn } from "../utils/cn.js";

/**
 * What opens the event popover: `"click"` (click, tap, or Enter/Space on a focused event), or `"hover"` (also
 * hovering with a mouse; touch and pen can't hover, so a tap opens it like `"click"`).
 */
export type EventPopoverTrigger = "click" | "hover";

/** Props of `renderEventPopover`. */
export type EventPopoverProps<TData = unknown> = {
  /** Closes the popover, e.g. from a button in your content. */
  close: () => void;
  /** The default content (color, title, when, location, description); reuse it in yours. */
  details: ReactNode;
  /** The event the popover is open for, with your own `data`. */
  event: CalendarEvent<TData>;
  /** When the event happens, already formatted (from `formatters.eventWhen`). */
  when: string;
};

/** Props that turn on the event popover; shared by `MonthView`, `TimeGridView` and `Calendar`. */
export type EventPopoverOptions<TData = unknown> = {
  /**
   * Shows a popover with the event's details when it's clicked (`"click"`) or also hovered (`"hover"`). Off by
   * default. `onEventClick` still fires on every click.
   *
   * It closes with Escape, a click outside it, or a second click on the event. To use your app's own popover or
   * hover card component instead, leave this off and wrap events with `renderEventWrapper`.
   *
   * @defaultValue false
   * @example
   * <Calendar events={events} eventPopover="hover" />
   */
  eventPopover?: EventPopoverTrigger | false | undefined;
  /**
   * Replaces the content of the event popover. The calendar still opens, places and closes it.
   *
   * @example
   * renderEventPopover={({ details, event, close }) => (
   *   <>
   *     {details}
   *     <button onClick={() => { close(); openEditor(event.data); }}>Edit</button>
   *   </>
   * )}
   */
  renderEventPopover?:
    | ((props: EventPopoverProps<TData>) => ReactNode)
    | undefined;
};

/** Class names of the event popover's parts, as the views name them in their `classNames`. */
export type EventPopoverClassNames = {
  /** The popover. */
  eventPopover?: string | undefined;
  /** The event's description in the default content. */
  eventPopoverDescription?: string | undefined;
  /** The event's location in the default content. */
  eventPopoverLocation?: string | undefined;
  /** The event's title in the default content. */
  eventPopoverTitle?: string | undefined;
  /** When the event happens, in the default content. */
  eventPopoverWhen?: string | undefined;
};

/** Delay before hovering opens the popover, so passing over events doesn't flash it. */
const HOVER_OPEN_MS = 400;
/** Delay before leaving closes it, so the pointer can cross the gap into the popover. */
const HOVER_CLOSE_MS = 150;

type OpenState<TData> = {
  event: CalendarEvent<TData>;
  /** Opened by a click or a key (stays until dismissed) rather than by hovering. */
  pinned: boolean;
  /** The element it's anchored to. */
  trigger: HTMLElement;
};

/** Props spread on each clickable event when the popover is on. */
export type EventPopoverTriggerProps = {
  "aria-expanded"?: boolean;
  "aria-haspopup"?: "dialog";
  onPointerDownCapture?: () => void;
  onPointerEnter?: (pointer: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (pointer: PointerEvent<HTMLElement>) => void;
};

type UseEventPopoverOptions<TData> = EventPopoverOptions<TData> & {
  classNames: EventPopoverClassNames | undefined;
  /** The events currently drawn: the popover closes when its event goes away and shows the latest copy. */
  events: readonly CalendarEvent<TData>[];
  /** Unique, CSS-ident-safe id of the view. */
  id: string;
};

/**
 * The event popover of one view: one popover element, opened on demand, built on the native HTML Popover API
 * (`popover="manual"`, so it never closes a "+N more" popover it was opened from) and anchored to the event with
 * CSS anchor positioning.
 */
export const useEventPopover = <TData,>({
  classNames,
  eventPopover = false,
  events,
  id,
  renderEventPopover,
}: UseEventPopoverOptions<TData>) => {
  const [open, setOpen] = useState<OpenState<TData> | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const enabled = eventPopover !== false;
  const popoverId = `${id}-event-popover`;
  const anchor = `--${popoverId}`;

  // The latest copy of the open event; it closes when the event is no longer drawn.
  const current =
    open === null
      ? undefined
      : events.find((event) => event.id === open.event.id);
  const shown = enabled && open !== null && current !== undefined ? open : null;
  const trigger = shown?.trigger ?? null;
  const pinned = shown?.pinned ?? false;

  // Its event went away or the popover was turned off: forget it, so it doesn't come back with the event.
  const stale = open !== null && shown === null;
  useEffect(() => {
    if (stale) setOpen(null);
  }, [
    stale,
  ]);

  /** Closes it; focus inside it goes back to the event, so keyboard users don't lose their place. */
  const dismiss = useRef((_restoreFocus: boolean) => {});
  dismiss.current = (restoreFocus) => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    const hadFocus =
      popoverRef.current?.contains(document.activeElement) === true;
    setOpen(null);
    if (restoreFocus && hadFocus && trigger?.isConnected === true)
      trigger.focus();
  };
  const close = () => dismiss.current(true);

  // Timers must not fire after unmount.
  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    [],
  );

  // Anchor to the trigger and show it; the trigger may have been replaced (new range, moved event): close then.
  useEffect(() => {
    if (trigger === null) return;
    if (!trigger.isConnected) {
      setOpen(null);
      return;
    }
    const element = popoverRef.current;
    trigger.style.setProperty("anchor-name", anchor);
    if (
      element !== null &&
      typeof element.showPopover === "function" &&
      !element.matches(":popover-open")
    )
      element.showPopover();
    return () => {
      trigger.style.removeProperty("anchor-name");
    };
  }, [
    anchor,
    trigger,
  ]);

  // Opened by a click or key: focus goes into the dialog, so screen readers read it. Hovering never moves focus.
  useEffect(() => {
    if (pinned && trigger !== null) popoverRef.current?.focus();
  }, [
    pinned,
    trigger,
  ]);

  // Escape and presses outside close it. Escape is consumed, so the global `close` shortcut skips it.
  useEffect(() => {
    if (trigger === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) return;
      event.preventDefault();
      dismiss.current(true);
    };
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      // A press on the trigger is left to its click, which toggles the popover.
      if (popoverRef.current?.contains(target) || trigger.contains(target))
        return;
      dismiss.current(false);
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [
    trigger,
  ]);

  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setOpen((state) => (state === null || state.pinned ? state : null));
    }, HOVER_CLOSE_MS);
  };

  /**
   * Opens the popover for a click or key on an event, or closes it when it's already open (pinned) there. Call it
   * from the event's click handler, next to `onEventClick`.
   */
  const toggle = (event: CalendarEvent<TData>, element: HTMLElement) => {
    if (!enabled) return;
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    setOpen((state) =>
      state?.pinned && state.trigger === element && state.event.id === event.id
        ? null
        : {
            event,
            pinned: true,
            trigger: element,
          },
    );
  };

  const triggerProps = (
    event: CalendarEvent<TData>,
  ): EventPopoverTriggerProps => {
    if (!enabled) return {};
    const props: EventPopoverTriggerProps = {
      "aria-expanded": shown?.event.id === event.id,
      "aria-haspopup": "dialog",
      // Pressing starts a click or a drag: a hover preview gets out of the way.
      onPointerDownCapture: () => {
        clearTimeout(openTimer.current);
        setOpen((state) => (state === null || state.pinned ? state : null));
      },
    };
    if (eventPopover !== "hover") return props;
    props.onPointerEnter = (pointer) => {
      if (pointer.pointerType !== "mouse" || pointer.buttons !== 0) return;
      const element = pointer.currentTarget;
      clearTimeout(closeTimer.current);
      clearTimeout(openTimer.current);
      const show = () =>
        setOpen((state) =>
          state?.pinned === true
            ? state
            : {
                event,
                pinned: false,
                trigger: element,
              },
        );
      // Moving from one previewed event to the next switches right away.
      if (open !== null && !open.pinned) show();
      else openTimer.current = setTimeout(show, HOVER_OPEN_MS);
    };
    props.onPointerLeave = (pointer) => {
      if (pointer.pointerType !== "mouse") return;
      clearTimeout(openTimer.current);
      scheduleClose();
    };
    return props;
  };

  const popover =
    shown === null || current === undefined ? null : (
      <EventPopoverElement
        anchor={anchor}
        classNames={classNames}
        close={close}
        event={current}
        id={popoverId}
        onPointerEnter={() => clearTimeout(closeTimer.current)}
        onPointerLeave={(pointer) => {
          if (pointer.pointerType === "mouse" && !shown.pinned) scheduleClose();
        }}
        popoverRef={popoverRef}
        renderEventPopover={renderEventPopover}
      />
    );

  return {
    enabled,
    popover,
    toggle,
    triggerProps,
  };
};

type EventPopoverElementProps<TData> = {
  anchor: string;
  classNames: EventPopoverClassNames | undefined;
  close: () => void;
  event: CalendarEvent<TData>;
  id: string;
  onPointerEnter: () => void;
  onPointerLeave: (pointer: PointerEvent<HTMLDivElement>) => void;
  popoverRef: RefObject<HTMLDivElement | null>;
  renderEventPopover: EventPopoverOptions<TData>["renderEventPopover"];
};

/** The popover element and its default content. */
function EventPopoverElement<TData>({
  anchor,
  classNames,
  close,
  event,
  id,
  onPointerEnter,
  onPointerLeave,
  popoverRef,
  renderEventPopover,
}: EventPopoverElementProps<TData>) {
  const { timeZone } = useCalendarContext();
  const { formatters, labels, locale, timeFormat } = useCalendarLocale();
  const when = formatters.eventWhen(event, {
    locale,
    timeFormat,
    timeZone,
  });
  const tentative = event.status === "tentative";
  const swatchStyle =
    event.color === undefined
      ? undefined
      : ({
          "--uc-event-color": event.color,
        } as CSSProperties);
  const details = (
    <div className="flex gap-2.5">
      <span
        aria-hidden
        className="mt-1 size-3 shrink-0 rounded-[0.25rem] border-2"
        data-tentative={tentative || undefined}
        data-uc-event-swatch=""
        style={swatchStyle}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          className={cn(
            "break-words font-medium text-sm",
            classNames?.eventPopoverTitle,
          )}
        >
          {event.title}
        </div>
        <div
          className={cn(
            "text-uc-muted-foreground",
            classNames?.eventPopoverWhen,
          )}
        >
          {when}
          {tentative && ` · ${labels.tentative}`}
        </div>
        {event.location !== undefined && event.location !== "" && (
          <div className={cn("break-words", classNames?.eventPopoverLocation)}>
            {event.location}
          </div>
        )}
        {event.description !== undefined && event.description !== "" && (
          <p
            className={cn(
              "m-0 mt-1 line-clamp-6 whitespace-pre-line break-words",
              classNames?.eventPopoverDescription,
            )}
          >
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
  return (
    <div
      aria-label={event.title}
      className={cn(
        "max-h-[min(24rem,calc(100vh-1rem))] w-72 max-w-[calc(100vw-1rem)] overflow-auto rounded-uc border border-uc-border bg-uc-popover p-3 text-uc-popover-foreground text-xs shadow-md outline-none",
        classNames?.eventPopover,
      )}
      data-uc-event-popover=""
      id={id}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      popover="manual"
      ref={popoverRef}
      role="dialog"
      style={{
        positionAnchor: anchor,
      }}
      tabIndex={-1}
    >
      {renderEventPopover === undefined
        ? details
        : renderEventPopover({
            close,
            details,
            event,
            when,
          })}
    </div>
  );
}
