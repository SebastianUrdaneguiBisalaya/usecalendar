import { useCallback, useState } from "react";

/**
 * Tracks an element's content height with a `ResizeObserver`: pass `ref` to the element, read `height`
 * (0 until measured, and always 0 during server rendering or where `ResizeObserver` is missing).
 */
export const useElementHeight = <T extends HTMLElement>() => {
  const [height, setHeight] = useState(0);
  // Stable, so React doesn't disconnect and re-observe on every render.
  const ref = useCallback((node: T | null) => {
    if (node === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry?.contentRect.height ?? 0),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return {
    height,
    ref,
  };
};
