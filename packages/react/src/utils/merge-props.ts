import type { Ref, RefCallback } from "react";

/**
 * Runs a handler added from outside (e.g. by a `renderEventWrapper` trigger) before the element's own, which is
 * skipped when the outside handler calls `preventDefault()`.
 */
export const composeHandlers =
  <
    E extends {
      defaultPrevented: boolean;
    },
  >(
    outer: ((event: E) => void) | undefined,
    inner: ((event: E) => void) | undefined,
  ) =>
  (event: E) => {
    outer?.(event);
    if (!event.defaultPrevented) inner?.(event);
  };

/** One ref callback that sets every given ref, and clears them again when the element goes away. */
export const mergeRefs =
  <T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> =>
  (node) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === "function") {
        const cleanup = ref(node);
        return typeof cleanup === "function" ? cleanup : () => ref(null);
      }
      if (ref !== null && ref !== undefined) {
        ref.current = node;
        return () => {
          ref.current = null;
        };
      }
      return undefined;
    });
    return () => {
      for (const cleanup of cleanups) cleanup?.();
    };
  };
