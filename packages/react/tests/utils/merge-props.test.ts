import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { composeHandlers, mergeRefs } from "../../src/utils/merge-props.js";

describe("composeHandlers", () => {
  it("runs the outer handler first, then the inner one unless the default was prevented", () => {
    const calls: string[] = [];
    const handler = composeHandlers<{
      defaultPrevented: boolean;
    }>(
      () => calls.push("outer"),
      () => calls.push("inner"),
    );
    handler({
      defaultPrevented: false,
    });
    expect(calls).toEqual([
      "outer",
      "inner",
    ]);
    handler({
      defaultPrevented: true,
    });
    expect(calls).toEqual([
      "outer",
      "inner",
      "outer",
    ]);
  });

  it("accepts a missing handler on either side", () => {
    const inner = vi.fn();
    composeHandlers(
      undefined,
      inner,
    )({
      defaultPrevented: false,
    });
    expect(inner).toHaveBeenCalledOnce();
    expect(() =>
      composeHandlers(
        undefined,
        undefined,
      )({
        defaultPrevented: false,
      }),
    ).not.toThrow();
  });
});

describe("mergeRefs", () => {
  it("sets callback and object refs, and clears them on cleanup", () => {
    const object = createRef<string>();
    const callback = vi.fn();
    const withCleanup = vi.fn();
    const cleanupOf = vi.fn(() => withCleanup);
    const cleanup = mergeRefs<string>(
      object,
      callback,
      cleanupOf,
      null,
      undefined,
    )("node");
    expect(object.current).toBe("node");
    expect(callback).toHaveBeenCalledWith("node");
    expect(cleanupOf).toHaveBeenCalledWith("node");
    cleanup?.();
    expect(object.current).toBeNull();
    expect(callback).toHaveBeenLastCalledWith(null);
    expect(withCleanup).toHaveBeenCalledOnce();
    expect(cleanupOf).toHaveBeenCalledOnce();
  });
});
