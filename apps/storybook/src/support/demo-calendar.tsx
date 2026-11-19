import type { TimeRange } from "@usecalendar/core";
import { Calendar, type CalendarProps } from "@usecalendar/react";
import { useState } from "react";
import { action } from "storybook/actions";
import type { DemoData, DemoEvent } from "./demo-events";

/** Props of {@link DemoCalendar}. */
export type DemoCalendarProps = Omit<CalendarProps<DemoData>, "events"> & {
  /** Height of the calendar frame in pixels. @defaultValue 720 */
  height?: number | undefined;
  /** The events the story starts with; edits are kept in the story's state. */
  initialEvents: readonly DemoEvent[];
};

let created = 0;

/** A new event over `range`, as an app would create it from a slot click or a drag. */
const newEvent = (range: TimeRange): DemoEvent => {
  created += 1;
  return {
    ...range,
    data: {
      owner: "You",
    },
    id: `new-${created}`,
    title: "New event",
  };
};

/**
 * `<Calendar>` the way an app uses it: events in state, moved and resized through `onEventChange`, created from slot
 * clicks and drags, selected on click and deleted with the `deleteEvent` shortcut. Every callback is also logged to
 * the Actions panel. Callbacks passed as props run after the demo's own.
 */
export function DemoCalendar({
  height = 720,
  hotkeyHandlers,
  initialEvents,
  onEventChange,
  onEventClick,
  onRangeSelect,
  onSlotClick,
  style,
  ...props
}: DemoCalendarProps) {
  const [events, setEvents] = useState<readonly DemoEvent[]>(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const create = (range: TimeRange): void => {
    const event = newEvent(range);
    setEvents((current) => [
      ...current,
      event,
    ]);
    setSelectedEventId(event.id);
  };

  return (
    <Calendar<DemoData>
      events={events}
      hotkeyHandlers={{
        close: () => {
          action("hotkey: close")();
          setSelectedEventId(null);
        },
        deleteEvent: () => {
          action("hotkey: deleteEvent")(selectedEventId);
          setEvents((current) =>
            current.filter((event) => event.id !== selectedEventId),
          );
          setSelectedEventId(null);
        },
        goToDate: () => action("hotkey: goToDate")(),
        newEvent: () => action("hotkey: newEvent")(),
        ...hotkeyHandlers,
      }}
      onDayClick={action("onDayClick")}
      onEventChange={(event, range) => {
        action("onEventChange")(event, range);
        setEvents((current) =>
          current.map((item) =>
            item.id === event.id
              ? {
                  ...item,
                  ...range,
                }
              : item,
          ),
        );
        onEventChange?.(event, range);
      }}
      onEventClick={(event) => {
        action("onEventClick")(event);
        setSelectedEventId(event.id);
        onEventClick?.(event);
      }}
      onRangeChange={action("onRangeChange")}
      onRangeSelect={(range) => {
        action("onRangeSelect")(range);
        if (onRangeSelect === undefined) create(range);
        else onRangeSelect(range);
      }}
      onSlotClick={(range) => {
        action("onSlotClick")(range);
        if (onSlotClick === undefined) create(range);
        else onSlotClick(range);
      }}
      selectedEventId={selectedEventId}
      style={{
        height,
        ...style,
      }}
      {...props}
    />
  );
}
