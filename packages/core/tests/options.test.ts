import { describe, expect, it } from "vitest";
import { isTimeFormat, isWeekStart } from "../src/options.js";

describe("isWeekStart", () => {
  it("accepts only supported week starts", () => {
    expect(isWeekStart("monday")).toBe(true);
    expect(isWeekStart("sunday")).toBe(true);
    expect(isWeekStart("saturday")).toBe(true);
    expect(isWeekStart("friday")).toBe(false);
  });
});

describe("isTimeFormat", () => {
  it("accepts only 12h and 24h", () => {
    expect(isTimeFormat("12h")).toBe(true);
    expect(isTimeFormat("24h")).toBe(true);
    expect(isTimeFormat("24")).toBe(false);
  });
});
