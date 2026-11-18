import { describe, expect, it } from "vitest";
import { cn } from "../../src/utils/cn.js";

describe("cn", () => {
  it("joins truthy class names and skips falsy ones", () => {
    expect(
      cn("a", false, null, undefined, "b", {
        c: true,
        d: false,
      }),
    ).toBe("a b c");
  });

  it("lets later Tailwind utilities override earlier conflicting ones", () => {
    expect(cn("px-2 py-1 bg-muted", "px-4 bg-red-50")).toBe(
      "py-1 px-4 bg-red-50",
    );
  });

  it("keeps non-conflicting utilities from both sides", () => {
    expect(cn("text-sm font-medium", "text-red-500")).toBe(
      "text-sm font-medium text-red-500",
    );
  });

  it("treats the uc-* theme utilities as overridable colors and radius", () => {
    expect(
      cn(
        "bg-uc-background text-uc-muted-foreground rounded-uc",
        "bg-red-50 text-black rounded-none",
      ),
    ).toBe("bg-red-50 text-black rounded-none");
    expect(cn("border-uc-border", "border-blue-500")).toBe("border-blue-500");
  });
});
