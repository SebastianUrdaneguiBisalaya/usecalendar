import { describe, expect, it } from "vitest";
import {
  DEFAULT_FORMATTERS,
  type FormatContext,
  localeTimeFormat,
} from "../../src/locale/formatters.js";

const day = Temporal.PlainDate.from("2026-11-15");
const en: FormatContext = {
  locale: "en-US",
  timeFormat: "12h",
  timeZone: "America/Lima",
};
const es: FormatContext = {
  locale: "es-PE",
  timeFormat: "24h",
  timeZone: "America/Lima",
};
// Intl may use narrow/thin spaces before AM/PM and around dashes; compare with plain spaces.
const plain = (text: string) => text.replace(/[   ]/g, " ");

describe("DEFAULT_FORMATTERS", () => {
  it("formats calendar days without shifting them, whatever the time zone", () => {
    const tokyo = {
      ...en,
      timeZone: "Asia/Tokyo",
    };
    expect(DEFAULT_FORMATTERS.weekday(day, tokyo)).toBe("Sun");
    expect(DEFAULT_FORMATTERS.dayNumber(day, tokyo)).toBe("15");
    expect(DEFAULT_FORMATTERS.fullDate(day, tokyo)).toBe(
      "Sunday, November 15, 2026",
    );
    expect(DEFAULT_FORMATTERS.monthYear(day, tokyo)).toBe("November 2026");
  });

  it("follows the locale", () => {
    expect(DEFAULT_FORMATTERS.weekday(day, es)).toBe("dom");
    expect(DEFAULT_FORMATTERS.fullDate(day, es)).toBe(
      "domingo, 15 de noviembre de 2026",
    );
    expect(DEFAULT_FORMATTERS.monthYear(day, es)).toBe("noviembre de 2026");
  });

  it("formats hours and event times in the chosen clock format", () => {
    expect(plain(DEFAULT_FORMATTERS.hour(15, en))).toBe("3:00 PM");
    expect(DEFAULT_FORMATTERS.hour(15, es)).toBe("15:00");
    expect(plain(DEFAULT_FORMATTERS.hour(0, en))).toBe("12:00 AM");
    expect(DEFAULT_FORMATTERS.hour(0, es)).toBe("00:00");
  });

  it("shows instants in the calendar's time zone", () => {
    expect(plain(DEFAULT_FORMATTERS.time("2026-11-15T14:30:00Z", en))).toBe(
      "9:30 AM",
    );
    expect(
      DEFAULT_FORMATTERS.time("2026-11-15T14:30:00Z", {
        ...es,
        timeZone: "Europe/Madrid",
      }),
    ).toBe("15:30");
  });

  it("collapses a same-day time range", () => {
    expect(
      plain(
        DEFAULT_FORMATTERS.timeRange(
          "2026-11-15T14:00:00Z",
          "2026-11-15T15:30:00Z",
          en,
        ),
      ),
    ).toBe("9:00 – 10:30 AM");
  });
});

describe("localeTimeFormat", () => {
  it("reads the locale's default clock", () => {
    expect(localeTimeFormat("en-US")).toBe("12h");
    expect(localeTimeFormat("es-ES")).toBe("24h");
    expect(localeTimeFormat("en-GB")).toBe("24h");
  });
});
