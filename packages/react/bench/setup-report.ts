// Records whether the runtime ships `Temporal` before loading the polyfill, so the report says which one it measured.
(
  globalThis as {
    __ucNativeTemporal?: boolean;
  }
).__ucNativeTemporal = "Temporal" in globalThis;
if (!("Temporal" in globalThis)) await import("temporal-polyfill/global");
