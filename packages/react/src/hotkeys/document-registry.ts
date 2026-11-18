import type { RefObject } from "react";
import { shouldIgnoreHotkey } from "./ignore.js";

/** A calendar listening for global shortcuts on the document. */
export type DocumentHotkeysRegistration = {
  /** Handles a key press; returns whether it was handled. */
  handle: (event: KeyboardEvent) => boolean;
  /** The calendar's root, used to tell which calendar the user last interacted with. */
  target: RefObject<HTMLElement | null> | undefined;
};

// Every calendar with document-scoped shortcuts, in mount order, behind one shared document listener. Only one
// calendar handles each key press: the one the user last focused or clicked, else the one mounted last. So a page
// with several calendars doesn't have them fighting over the same keys.
const registrations: DocumentHotkeysRegistration[] = [];
let active: DocumentHotkeysRegistration | null = null;

const onKeyDown = (event: KeyboardEvent) => {
  if (shouldIgnoreHotkey(event)) return;
  const calendar =
    active !== null && registrations.includes(active)
      ? active
      : registrations.at(-1);
  if (calendar?.handle(event)) event.preventDefault();
};

const onInteraction = (event: Event) => {
  const node = event.target;
  if (!(node instanceof Node)) return;
  // The innermost calendar wins when calendars are nested.
  const touched = registrations.findLast(
    (registration) => registration.target?.current?.contains(node) === true,
  );
  if (touched !== undefined) active = touched;
};

/** Adds a calendar to the shared document listener; returns the function that removes it. */
export const registerDocumentHotkeys = (
  registration: DocumentHotkeysRegistration,
): (() => void) => {
  if (registrations.length === 0) {
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onInteraction, true);
    document.addEventListener("pointerdown", onInteraction, true);
  }
  registrations.push(registration);
  return () => {
    const index = registrations.indexOf(registration);
    if (index !== -1) registrations.splice(index, 1);
    if (active === registration) active = null;
    if (registrations.length === 0) {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onInteraction, true);
      document.removeEventListener("pointerdown", onInteraction, true);
    }
  };
};
