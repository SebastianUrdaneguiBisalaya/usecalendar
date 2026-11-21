import {
  type ComponentPropsWithRef,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { EventPopoverTrigger } from "../events/event-popover.js";
import { cn } from "../utils/cn.js";
import { composeHandlers, mergeRefs } from "../utils/merge-props.js";
import { DAY_HEADER_REM } from "./grid-geometry.js";

/** What opens the time zone popover; the same choices as {@link EventPopoverTrigger}. */
export type TimeZonePopoverTrigger = EventPopoverTrigger;

/** Props of `renderTimeZonePopover`. */
export type TimeZonePopoverProps = {
  /** Closes the popover, e.g. from a button in your content. */
  close: () => void;
  /** The default content (the full label and description); reuse it in yours. */
  details: ReactNode;
  /** Second line, if any, e.g. `"GMT-5"`. */
  description: string | null;
  /** First line, e.g. `"Perú"` or the zone's short name. */
  label: string;
  /** IANA time zone of the column, e.g. `"America/Lima"`. */
  timeZone: string;
};

/** Props of `renderTimeZoneWrapper`. */
export type RenderTimeZoneWrapperProps = {
  /**
   * The time zone header's clickable button; render it inside your wrapper (e.g. as a Radix `PopoverTrigger asChild`).
   * Props and a ref added to it reach the button and run before its own handlers.
   */
  children: ReactElement;
  /** Second line, if any, e.g. `"GMT-5"`. */
  description: string | null;
  /** First line, e.g. `"Perú"` or the zone's short name. */
  label: string;
  /** IANA time zone of the column, e.g. `"America/Lima"`. */
  timeZone: string;
};

/** Props that turn on the time zone popover; shared by `TimeGridView` and `Calendar`. */
export type TimeZonePopoverOptions = {
  /**
   * Shows a popover with the full label and description of a time zone header, uncut, when it's clicked
   * (`"click"`), hovered with a mouse (`"hover"`), or either (`"both"`). Off by default. It closes with Escape, a
   * click outside it, or a second click on the header. In `"hover"` mode keyboard and touch users can't open it.
   *
   * @defaultValue false
   * @example
   * <Calendar timeZonePopover="both" secondaryTimeZones={[{ timeZone: "America/Lima", label: "Perú" }]} />
   */
  timeZonePopover?: TimeZonePopoverTrigger | false | undefined;
  /**
   * Replaces the content of the time zone popover. The calendar still opens, places and closes it.
   *
   * @example
   * renderTimeZonePopover={({ details, timeZone }) => <>{details}<small>{timeZone}</small></>}
   */
  renderTimeZonePopover?:
    | ((props: TimeZonePopoverProps) => ReactNode)
    | undefined;
  /**
   * Wraps each time zone header, like `renderEventWrapper` does for events, so you can use your own popover (Radix,
   * Base UI, …) with its own open state, positioning and closing. The header renders as a button for your trigger.
   * When set, the calendar's built-in popover (`timeZonePopover`, `renderTimeZonePopover`) is not used.
   *
   * @example
   * renderTimeZoneWrapper={({ children, label, description }) => (
   *   <Popover>
   *     <PopoverTrigger asChild>{children}</PopoverTrigger>
   *     <PopoverContent>{label} {description}</PopoverContent>
   *   </Popover>
   * )}
   */
  renderTimeZoneWrapper?:
    | ((props: RenderTimeZoneWrapperProps) => ReactNode)
    | undefined;
};

/** The two lines of a time zone header. */
export type ZoneName = {
  description: string | null;
  label: string;
};

/** Delay before hovering opens the popover, and before leaving closes it (so the pointer can cross the gap). */
const HOVER_OPEN_MS = 400;
const HOVER_CLOSE_MS = 150;

type ZoneButtonOwnProps = {
  className: string;
};

/** Own props, plus whatever a `renderTimeZoneWrapper` trigger adds when it clones the element. */
type ZoneButtonProps = ZoneButtonOwnProps &
  Omit<ComponentPropsWithRef<"button">, keyof ZoneButtonOwnProps> & {
    /** The header's own click handler; runs after one added from outside. */
    ownClick?: (() => void) | undefined;
    /** The header's own ref. */
    ownRef?: ((node: HTMLButtonElement | null) => void) | undefined;
  };

function ZoneButton({
  className,
  onClick,
  ownClick,
  ownRef,
  ref,
  ...rest
}: ZoneButtonProps) {
  return (
    <button
      className={className}
      onClick={composeHandlers(onClick, ownClick)}
      ref={mergeRefs(ref, ownRef)}
      type="button"
      {...rest}
    />
  );
}

type TimeZoneHeaderProps = TimeZonePopoverOptions & {
  className: string | undefined;
  name: ZoneName;
  /** Class names of the popover. */
  popoverClassName: string | undefined;
  timeZone: string;
};

/**
 * A time zone's name in the header cell of its hour column, centered in the height of a day header: `label` and,
 * under it, a smaller `description`, both truncated. Screen readers get one text, "Perú, GMT-5". With
 * `timeZonePopover` it opens a popover with the full text (native HTML Popover API, anchored to the header).
 */
export function TimeZoneHeader({
  className,
  name,
  popoverClassName,
  renderTimeZonePopover,
  renderTimeZoneWrapper,
  timeZone,
  timeZonePopover = false,
}: TimeZoneHeaderProps) {
  // `useId` returns characters (`:`, `«`) that aren't valid in a CSS `anchor-name`.
  const id = `${useId().replace(/[^\w-]/g, "")}-zone-popover`;
  const anchor = `--${id}`;
  const [open, setOpen] = useState<{
    pinned: boolean;
  } | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const setTrigger = (element: HTMLElement | null) => {
    triggerRef.current = element;
  };
  const popoverRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const wrapped = renderTimeZoneWrapper !== undefined;
  const enabled = timeZonePopover !== false && !wrapped;
  const opensOnClick =
    enabled && (timeZonePopover === "click" || timeZonePopover === "both");
  const opensOnHover =
    enabled && (timeZonePopover === "hover" || timeZonePopover === "both");
  const shown = enabled ? open : null;
  const pinned = shown?.pinned ?? false;

  const close = useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    setOpen(null);
  }, []);
  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(
      () => setOpen((state) => (state?.pinned ? state : null)),
      HOVER_CLOSE_MS,
    );
  };

  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    [],
  );

  const isOpen = shown !== null;
  // Anchor to the header and show it in the top layer.
  useEffect(() => {
    const trigger = triggerRef.current;
    const element = popoverRef.current;
    if (!isOpen || trigger === null) return;
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
    isOpen,
  ]);

  // Opened by a click or key: focus goes into the dialog, so screen readers read it. Hovering never moves focus.
  useEffect(() => {
    if (pinned) popoverRef.current?.focus();
  }, [
    pinned,
  ]);

  // Escape and presses outside close it.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) return;
      event.preventDefault();
      const hadFocus =
        popoverRef.current?.contains(document.activeElement) === true;
      close();
      if (hadFocus) triggerRef.current?.focus();
    };
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      // A press on the header is left to its click, which toggles the popover.
      if (
        popoverRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      )
        return;
      close();
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [
    close,
    isOpen,
  ]);

  const text = (
    <>
      <span className="block max-w-full truncate">{name.label}</span>
      {name.description !== null && (
        <>
          <span className="sr-only">, </span>
          <span className="block max-w-full truncate text-[0.6rem] opacity-80">
            {name.description}
          </span>
        </>
      )}
    </>
  );
  const details = (
    <div className="flex flex-col gap-0.5">
      <div className="break-words font-medium text-sm">{name.label}</div>
      {name.description !== null && (
        <div className="break-words text-uc-muted-foreground">
          {name.description}
        </div>
      )}
    </div>
  );

  const onPointerEnter = (pointer: PointerEvent<HTMLElement>) => {
    if (pointer.pointerType !== "mouse" || pointer.buttons !== 0) return;
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(
      () =>
        setOpen(
          (state) =>
            state ?? {
              pinned: false,
            },
        ),
      HOVER_OPEN_MS,
    );
  };
  const onPointerLeave = (pointer: PointerEvent<HTMLElement>) => {
    if (pointer.pointerType !== "mouse") return;
    clearTimeout(openTimer.current);
    scheduleClose();
  };
  const hoverProps = opensOnHover
    ? {
        onPointerEnter,
        onPointerLeave,
      }
    : {};

  const buttonClassName =
    "flex min-w-0 max-w-full cursor-pointer flex-col items-center justify-center border-0 bg-transparent p-0 text-center text-inherit leading-[inherit] [font:inherit]";

  return (
    <>
      <div
        className={cn(
          "flex min-w-0 flex-col items-center justify-center overflow-hidden px-1 text-center text-[0.65rem] text-uc-muted-foreground leading-tight",
          className,
        )}
        style={{
          height: `${DAY_HEADER_REM}rem`,
        }}
      >
        {wrapped ? (
          renderTimeZoneWrapper({
            children: (
              <ZoneButton
                className={buttonClassName}
                ownRef={setTrigger}
              >
                {text}
              </ZoneButton>
            ),
            description: name.description,
            label: name.label,
            timeZone,
          })
        ) : opensOnClick ? (
          <ZoneButton
            aria-expanded={shown !== null}
            aria-haspopup="dialog"
            className={buttonClassName}
            ownClick={() =>
              setOpen((state) =>
                state?.pinned
                  ? null
                  : {
                      pinned: true,
                    },
              )
            }
            ownRef={setTrigger}
            {...hoverProps}
          >
            {text}
          </ZoneButton>
        ) : (
          <div
            className="flex min-w-0 max-w-full flex-col items-center justify-center"
            ref={setTrigger}
            {...hoverProps}
          >
            {text}
          </div>
        )}
      </div>
      {shown !== null && (
        <div
          aria-label={
            name.description === null
              ? name.label
              : `${name.label}, ${name.description}`
          }
          className={cn(
            "max-h-[min(24rem,calc(100vh-1rem))] w-56 max-w-[calc(100vw-1rem)] overflow-auto rounded-uc border border-uc-border bg-uc-popover p-3 text-uc-popover-foreground text-xs shadow-md outline-none",
            popoverClassName,
          )}
          data-uc-popover=""
          id={id}
          onPointerEnter={() => clearTimeout(closeTimer.current)}
          onPointerLeave={(pointer) => {
            if (pointer.pointerType === "mouse" && !shown.pinned)
              scheduleClose();
          }}
          popover="manual"
          ref={popoverRef}
          role="dialog"
          style={{
            positionAnchor: anchor,
          }}
          tabIndex={-1}
        >
          {renderTimeZonePopover === undefined
            ? details
            : renderTimeZonePopover({
                close,
                description: name.description,
                details,
                label: name.label,
                timeZone,
              })}
        </div>
      )}
    </>
  );
}
