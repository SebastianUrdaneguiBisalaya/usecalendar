// @vitest-environment jsdom
// Markup comes from react-dom/server; jsdom is only used to parse the HTML string.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarLocaleProvider } from "../../src/locale/locale-context.js";
import {
  MiniCalendar,
  type MiniCalendarProps,
} from "../../src/mini/mini-calendar.js";

const day = (iso: string) => Temporal.PlainDate.from(iso);
// Whatever the runtime's ICU data calls November in Spanish (e.g. "nov" or "Nov.").
const spanishNovember = new Intl.DateTimeFormat("es-PE", {
  month: "short",
  timeZone: "UTC",
}).format(Date.UTC(2026, 10, 19));
const html = (props: Partial<MiniCalendarProps> = {}) =>
  renderToStaticMarkup(
    <MiniCalendar
      timeZone="UTC"
      value={day("2026-11-19")}
      {...props}
    />,
  );
const parse = (markup: string) => {
  const template = document.createElement("template");
  template.innerHTML = markup;
  return template.content;
};
const shownDays = (markup: string) =>
  [
    ...parse(markup).querySelectorAll("[role=option]"),
  ].map((option) => option.getAttribute("data-day"));

describe("MiniCalendar markup", () => {
  it("is a horizontal listbox of options with labeled arrows", () => {
    const root = parse(html());
    const listbox = root.querySelector("[role=listbox]");
    expect(listbox?.getAttribute("aria-orientation")).toBe("horizontal");
    expect(listbox?.getAttribute("aria-label")).toBe("Dates");
    expect(root.querySelectorAll("[role=option]")).toHaveLength(7);
    const buttons = [
      ...root.querySelectorAll("button"),
    ].map((button) => button.getAttribute("aria-label"));
    expect(buttons).toEqual([
      "Previous days",
      "Next days",
    ]);
    expect(root.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows the week of the selected day by default", () => {
    expect(shownDays(html())).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ]);
  });

  it("follows days, align, weekStart and showWeekends", () => {
    expect(
      shownDays(
        html({
          align: "center",
          days: 3,
        }),
      ),
    ).toEqual([
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
    ]);
    expect(
      shownDays(
        html({
          weekStart: "sunday",
        }),
      )[0],
    ).toBe("2026-11-15");
    expect(
      shownDays(
        html({
          showWeekends: false,
        }),
      ),
    ).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-23",
      "2026-11-24",
    ]);
    expect(
      shownDays(
        html({
          start: day("2026-12-30"),
        }),
      )[0],
    ).toBe("2026-12-30");
  });

  it("labels each day with its full date, month and number", () => {
    const option = parse(html()).querySelector('[data-day="2026-11-19"]');
    expect(option?.getAttribute("aria-label")).toBe(
      "Thursday, November 19, 2026",
    );
    expect(option?.getAttribute("aria-selected")).toBe("true");
    expect(option?.getAttribute("data-selected")).toBe("true");
    expect(option?.getAttribute("tabindex")).toBe("0");
    expect(option?.textContent).toBe("Nov19");
    const other = parse(html()).querySelector('[data-day="2026-11-20"]');
    expect(other?.getAttribute("aria-selected")).toBe("false");
    expect(other?.getAttribute("tabindex")).toBe("-1");
  });

  it("fills the selected day with the primary tokens", () => {
    const option = parse(html()).querySelector('[data-day="2026-11-19"]');
    expect(option?.className).toContain("bg-uc-primary");
    expect(option?.className).toContain("text-uc-primary-foreground");
    expect(option?.className).toContain("rounded-uc");
  });

  it("marks days outside minDate/maxDate or rejected by isDayDisabled", () => {
    const root = parse(
      html({
        isDayDisabled: (candidate) => candidate.day === 21,
        maxDate: day("2026-11-22"),
        minDate: day("2026-11-17"),
      }),
    );
    const disabled = [
      ...root.querySelectorAll("[aria-disabled=true]"),
    ].map((option) => option.getAttribute("data-day"));
    expect(disabled).toEqual([
      "2026-11-16",
      "2026-11-21",
    ]);
    expect(
      root
        .querySelector('[data-day="2026-11-16"]')
        ?.hasAttribute("data-disabled"),
    ).toBe(true);
    const [previous, next] = root.querySelectorAll("button");
    expect(previous?.hasAttribute("disabled")).toBe(true);
    expect(next?.hasAttribute("disabled")).toBe(true);
  });

  it("merges className and classNames after the defaults", () => {
    const root = parse(
      html({
        className: "my-strip",
        classNames: {
          day: "rounded-none",
          dayNumber: "text-lg",
          days: "gap-3",
          month: "uppercase",
          next: "next-button",
          previous: "previous-button",
          root: "p-2",
          selected: "bg-uc-accent",
        },
      }),
    );
    const rootElement = root.firstElementChild;
    expect(rootElement?.className).toContain("my-strip");
    expect(rootElement?.className).toContain("p-2");
    expect(root.querySelector("[role=listbox]")?.className).toContain("gap-3");
    expect(root.querySelector("[role=listbox]")?.className).not.toContain(
      "gap-1",
    );
    const selected = root.querySelector('[data-day="2026-11-19"]');
    expect(selected?.className).toContain("rounded-none");
    expect(selected?.className).not.toContain("rounded-uc");
    expect(selected?.className).toContain("bg-uc-accent");
    expect(selected?.className).not.toContain(" bg-uc-primary ");
    expect(selected?.querySelector("span")?.className).toContain("uppercase");
    expect(root.querySelector("button")?.className).toContain(
      "previous-button",
    );
  });

  it("uses only uc tokens: no palette colors, no dark variants, no inline styles", () => {
    const markup = html({
      isDayDisabled: (candidate) => candidate.day === 21,
    });
    expect(markup).not.toMatch(
      /\b(?:bg|text|border|ring)-(?:white|black|zinc|gray|slate|neutral|stone|red|blue)\b/,
    );
    expect(markup).not.toContain("dark:");
    expect(markup).not.toContain("style=");
  });

  it("renders without days on the server when today isn't known yet", () => {
    const root = parse(renderToStaticMarkup(<MiniCalendar timeZone="UTC" />));
    expect(root.querySelectorAll("[role=option]")).toHaveLength(0);
    expect(root.querySelector("[role=listbox]")?.getAttribute("tabindex")).toBe(
      "0",
    );
  });

  it("localizes through locale, labels and formatters", () => {
    const root = parse(
      html({
        formatters: {
          dayNumber: (shown) => `#${shown.day}`,
        },
        labels: {
          miniCalendar: "Fechas",
          nextDays: "Días siguientes",
        },
        locale: "es-PE",
      }),
    );
    expect(
      root.querySelector("[role=listbox]")?.getAttribute("aria-label"),
    ).toBe("Fechas");
    expect(root.querySelectorAll("button")[1]?.getAttribute("aria-label")).toBe(
      "Días siguientes",
    );
    const option = root.querySelector('[data-day="2026-11-19"]');
    expect(option?.textContent).toBe(`${spanishNovember}#19`);
    expect(option?.getAttribute("aria-label")).toBe(
      "jueves, 19 de noviembre de 2026",
    );
  });

  it("reads the nearest CalendarLocaleProvider", () => {
    const root = parse(
      renderToStaticMarkup(
        <CalendarLocaleProvider
          labels={{
            previousDays: "Anteriores",
          }}
          locale="es-PE"
        >
          <MiniCalendar
            timeZone="UTC"
            value={day("2026-11-19")}
          />
        </CalendarLocaleProvider>,
      ),
    );
    expect(root.querySelector("button")?.getAttribute("aria-label")).toBe(
      "Anteriores",
    );
    expect(root.querySelector('[data-day="2026-11-19"]')?.textContent).toBe(
      `${spanishNovember}19`,
    );
  });

  it("draws custom day content with renderDay", () => {
    const root = parse(
      html({
        renderDay: ({ day: shown, defaultContent, isSelected, month }) => (
          <>
            {defaultContent}
            <i data-dot={shown.toString()}>{isSelected ? "selected" : month}</i>
          </>
        ),
      }),
    );
    const option = root.querySelector('[data-day="2026-11-19"]');
    expect(option?.getAttribute("role")).toBe("option");
    expect(option?.querySelector("i")?.textContent).toBe("selected");
    expect(root.querySelector('[data-dot="2026-11-20"]')?.textContent).toBe(
      "Nov",
    );
  });
});
