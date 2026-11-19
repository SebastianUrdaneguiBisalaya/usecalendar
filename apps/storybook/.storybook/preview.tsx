// Node and some browsers don't ship `Temporal` yet; consumers load the same polyfill (see the README).
import "temporal-polyfill/global";
import "../src/styles/preview.css";
import type { Decorator, Preview } from "@storybook/react-vite";
import { CalendarLocaleProvider } from "@usecalendar/react";
import prebuiltStyles from "../src/styles/prebuilt.css?inline";
import tailwindStyles from "../src/styles/tailwind.css?inline";
import { FrameMeter } from "../src/support/frame-meter";

/**
 * Toolbar values a story's component takes as props, listed in its `parameters.calendarGlobals` (e.g.
 * `["locale", "timeZone", "weekStart"]`). They apply unless the story sets the prop itself. Every story also gets
 * the toolbar locale through a `CalendarLocaleProvider`, for parts that read it from context.
 */
const CALENDAR_GLOBALS = [
  "locale",
  "timeZone",
  "weekStart",
] as const;

const DEFAULT = "default";
const STYLE_ELEMENT_ID = "uc-storybook-styles";

/** Swaps the library stylesheet: a Tailwind v4 app (source `theme.css`) or an app without Tailwind (`styles.css`). */
const applyStylesheet = (mode: unknown): void => {
  let element = document.getElementById(STYLE_ELEMENT_ID);
  if (element === null) {
    element = document.createElement("style");
    element.id = STYLE_ELEMENT_ID;
    document.head.append(element);
  }
  const css = mode === "prebuilt" ? prebuiltStyles : tailwindStyles;
  if (element.textContent !== css) element.textContent = css;
};

/** `data-theme` on `<html>`: forced light or dark, or none to follow the OS preference. */
const applyTheme = (theme: unknown): void => {
  const root = document.documentElement;
  if (theme === "light" || theme === "dark")
    root.setAttribute("data-theme", theme);
  else root.removeAttribute("data-theme");
};

const withStylesAndTheme: Decorator = (Story, context) => {
  const { styles, theme } = context.globals;
  applyStylesheet(styles);
  applyTheme(theme);
  return <Story />;
};

/** The frame meter overlay (toolbar "Frame meter"), for checking frame rates by hand while interacting. */
const withFrameMeter: Decorator = (Story, { globals: { frameMeter } }) => (
  <>
    <Story />
    {frameMeter === "on" && <FrameMeter />}
  </>
);

const withCalendarGlobals: Decorator = (Story, context) => {
  const args: Record<string, unknown> = {
    ...context.args,
  };
  const { calendarGlobals: requested } = context.parameters;
  for (const key of CALENDAR_GLOBALS) {
    if (!Array.isArray(requested) || !requested.includes(key)) continue;
    const value: unknown = context.globals[key];
    if (
      args[key] === undefined &&
      typeof value === "string" &&
      value !== DEFAULT
    )
      args[key] = value;
  }
  const { locale } = context.globals;
  return (
    <CalendarLocaleProvider
      locale={
        typeof locale === "string" && locale !== DEFAULT ? locale : undefined
      }
    >
      {Story({
        args,
      })}
    </CalendarLocaleProvider>
  );
};

const preview: Preview = {
  decorators: [
    withFrameMeter,
    withCalendarGlobals,
    withStylesAndTheme,
  ],
  globalTypes: {
    frameMeter: {
      description:
        "Frame meter: FPS, worst frame and long frames while you interact",
      toolbar: {
        dynamicTitle: true,
        icon: "lightning",
        items: [
          {
            title: "Frame meter off",
            value: "off",
          },
          {
            title: "Frame meter on",
            value: "on",
          },
        ],
      },
    },
    locale: {
      description: "locale prop (BCP 47)",
      toolbar: {
        dynamicTitle: true,
        icon: "globe",
        items: [
          {
            title: "en-US",
            value: DEFAULT,
          },
          "es-PE",
          "en-GB",
          "de-DE",
          "fr-FR",
          "ja-JP",
        ],
      },
    },
    styles: {
      description: "Library stylesheet",
      toolbar: {
        dynamicTitle: true,
        icon: "paintbrush",
        items: [
          {
            title: "Tailwind v4 app (theme.css)",
            value: "tailwind",
          },
          {
            title: "No Tailwind (styles.css)",
            value: "prebuilt",
          },
        ],
      },
    },
    theme: {
      description: "Color scheme (data-theme on <html>)",
      toolbar: {
        dynamicTitle: true,
        icon: "contrast",
        items: [
          {
            title: "System",
            value: "system",
          },
          {
            title: "Light",
            value: "light",
          },
          {
            title: "Dark",
            value: "dark",
          },
        ],
      },
    },
    timeZone: {
      description: "timeZone prop (IANA)",
      toolbar: {
        dynamicTitle: true,
        icon: "time",
        items: [
          {
            title: "Browser time zone",
            value: DEFAULT,
          },
          "UTC",
          "America/Lima",
          "America/New_York",
          "Europe/Madrid",
          "Asia/Tokyo",
          "Pacific/Auckland",
        ],
      },
    },
    weekStart: {
      description: "weekStart prop",
      toolbar: {
        dynamicTitle: true,
        icon: "calendar",
        items: [
          {
            title: "Week starts monday",
            value: DEFAULT,
          },
          {
            title: "Week starts sunday",
            value: "sunday",
          },
          {
            title: "Week starts saturday",
            value: "saturday",
          },
        ],
      },
    },
  },
  initialGlobals: {
    // The a11y panel runs only when asked to: it's a manual review aid, not a test.
    a11y: {
      manual: true,
    },
    frameMeter: "off",
    locale: DEFAULT,
    styles: "tailwind",
    theme: "system",
    timeZone: DEFAULT,
    weekStart: DEFAULT,
  },
  parameters: {
    a11y: {
      test: "off",
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
      },
    },
    layout: "fullscreen",
  },
};

export default preview;
