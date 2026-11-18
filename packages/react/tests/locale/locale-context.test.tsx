import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_LABELS, resolveLabels } from "../../src/locale/labels.js";
import {
  CalendarLocaleProvider,
  resolveLocale,
  useCalendarLocale,
} from "../../src/locale/locale-context.js";

function Probe() {
  const { formatters, labels, locale, timeFormat } = useCalendarLocale();
  const day = Temporal.PlainDate.from("2026-11-15");
  return (
    <p>
      {[
        locale,
        timeFormat,
        labels.today,
        labels.views.week,
        labels.moreEvents(3),
        formatters.weekday(day, {
          locale,
          timeFormat,
          timeZone: "UTC",
        }),
      ].join("|")}
    </p>
  );
}

describe("resolveLabels", () => {
  it("keeps the English defaults for anything not passed", () => {
    expect(resolveLabels(undefined)).toBe(DEFAULT_LABELS);
    const labels = resolveLabels({
      today: "Hoy",
      views: {
        week: "Semana",
      },
    });
    expect(labels.today).toBe("Hoy");
    expect(labels.views).toEqual({
      day: "Day",
      month: "Month",
      week: "Semana",
    });
    expect(labels.moreEvents(2)).toBe("+2 more");
  });
});

describe("resolveLocale", () => {
  it("defaults to en-US with its 12h clock", () => {
    expect(resolveLocale({})).toMatchObject({
      locale: "en-US",
      timeFormat: "12h",
    });
  });

  it("infers the clock from the locale unless timeFormat is given", () => {
    expect(
      resolveLocale({
        locale: "es-ES",
      }).timeFormat,
    ).toBe("24h");
    expect(
      resolveLocale({
        locale: "es-ES",
        timeFormat: "12h",
      }).timeFormat,
    ).toBe("12h");
  });

  it("merges custom formatters over the defaults", () => {
    const { formatters } = resolveLocale({
      formatters: {
        dayNumber: () => "x",
      },
    });
    const context = {
      locale: "en-US",
      timeFormat: "12h" as const,
      timeZone: "UTC",
    };
    expect(
      formatters.dayNumber(Temporal.PlainDate.from("2026-11-15"), context),
    ).toBe("x");
    expect(
      formatters.weekday(Temporal.PlainDate.from("2026-11-15"), context),
    ).toBe("Sun");
  });
});

describe("CalendarLocaleProvider", () => {
  it("gives components the English defaults without a provider", () => {
    expect(renderToStaticMarkup(<Probe />)).toBe(
      "<p>en-US|12h|Today|Week|+3 more|Sun</p>",
    );
  });

  it("shares the resolved options with every component below it", () => {
    const html = renderToStaticMarkup(
      <CalendarLocaleProvider
        labels={{
          moreEvents: (count) => `+${count} más`,
          today: "Hoy",
          views: {
            week: "Semana",
          },
        }}
        locale="es-PE"
      >
        <Probe />
      </CalendarLocaleProvider>,
    );
    expect(html).toBe("<p>es-PE|12h|Hoy|Semana|+3 más|dom</p>");
  });
});
