const TEXT_INPUT_TYPES = new Set([
  "",
  "date",
  "datetime-local",
  "email",
  "month",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "time",
  "url",
  "week",
]);

const isTyping = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (
    target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
    return true;
  return (
    target instanceof HTMLInputElement &&
    TEXT_INPUT_TYPES.has(target.type.toLowerCase())
  );
};

/**
 * True for key presses global shortcuts must leave alone, as in tempi: keys a focused widget already handled
 * (such as the arrows that move focus inside the grid), keys composing text (IME), and plain keys while typing
 * in a field (⌘/Ctrl combinations still fire there).
 */
export const shouldIgnoreHotkey = (event: KeyboardEvent): boolean =>
  event.defaultPrevented ||
  event.isComposing ||
  (!(event.ctrlKey || event.metaKey) && isTyping(event.target));
