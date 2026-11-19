import { useCallback, useState } from "react";

/**
 * Tracks an element's content width with a `ResizeObserver`: pass `ref` to the element, read `width`
 * (0 until measured, and always 0 during server rendering or where `ResizeObserver` is missing).
 */
export const useElementWidth = <T extends HTMLElement>() => {
  const [width, setWidth] = useState(0);
  // Stable, so React doesn't disconnect and re-observe on every render.
  const ref = useCallback((node: T | null) => {
    if (node === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry?.contentRect.width ?? 0),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return {
    ref,
    width,
  };
};
