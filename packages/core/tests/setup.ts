// Node doesn't ship `Temporal` yet: tests run against the spec-compliant polyfill.
// The library itself never imports it (consumers provide `Temporal` natively or via the polyfill).
import "temporal-polyfill/global";
