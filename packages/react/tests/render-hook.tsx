import { act } from "react";
import { createRoot } from "react-dom/client";

// React only runs effects synchronously inside `act` when it knows it's under test.
(
  globalThis as {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Renders `useHook` in a detached root (jsdom) and returns a live view of its latest result.
 * Test helper only: no browser, nothing is painted.
 */
export const renderHook = <Result, Props>(
  useHook: (props: Props) => Result,
  initialProps: Props,
) => {
  const result = {
    current: undefined as Result,
  };
  function Probe({ props }: { props: Props }) {
    result.current = useHook(props);
    return null;
  }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<Probe props={initialProps} />));
  return {
    rerender: (props: Props) => act(() => root.render(<Probe props={props} />)),
    result,
    unmount: () => act(() => root.unmount()),
  };
};
