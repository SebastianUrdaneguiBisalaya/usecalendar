import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;
// The server's zone isn't the viewer's: render in UTC on the server, then switch to the real zone after hydration.
const getServerTimeZone = (): string => "UTC";

/** The viewer's IANA time zone (`"UTC"` during server rendering and hydration). */
export const useSystemTimeZone = (): string =>
  useSyncExternalStore(subscribe, getTimeZone, getServerTimeZone);
