import { useSyncExternalStore } from "react";

/** True on macOS and iOS, where `mod` means ⌘ and Alt is called Option. */
export const isMacPlatform = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const platform =
    (
      navigator as Navigator & {
        userAgentData?: {
          platform?: string;
        };
      }
    ).userAgentData?.platform ?? navigator.platform;
  return /mac|iphone|ipad|ipod/i.test(platform);
};

const subscribe = () => () => {};
const getServerIsMac = () => false;

/** {@link isMacPlatform} for rendering: `false` on the server and during hydration, so markup never mismatches. */
export const useIsMac = (): boolean =>
  useSyncExternalStore(subscribe, isMacPlatform, getServerIsMac);
