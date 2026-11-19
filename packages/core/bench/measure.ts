// Bench helpers compile without DOM or Node types; `performance.now()` exists in both runtimes.
declare const performance: {
  now: () => number;
};

/** Summary of one measured case, in milliseconds per run. */
export type Stats = {
  max: number;
  mean: number;
  median: number;
  min: number;
  /** Runs per second, from the mean. */
  opsPerSecond: number;
  p75: number;
  p99: number;
  samples: number;
};

/** Options of {@link measure}. */
export type MeasureOptions = {
  /** Stop sampling once this much time has been spent (after `minSamples`). @defaultValue 500 */
  budgetMs?: number;
  /** Never take more samples than this. @defaultValue 200 */
  maxSamples?: number;
  /** Always take at least this many samples, even past the budget. @defaultValue 5 */
  minSamples?: number;
  /** Untimed runs first, so JIT warm-up doesn't count. @defaultValue 2 */
  warmup?: number;
};

const percentile = (sorted: readonly number[], share: number): number =>
  sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ??
  Number.NaN;

const round = (value: number): number => Math.round(value * 1000) / 1000;

/** Summarizes timings in milliseconds (one per run). */
export const summarize = (times: readonly number[]): Stats => {
  const sorted = [
    ...times,
  ].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, time) => sum + time, 0) / sorted.length;
  return {
    max: round(sorted.at(-1) ?? Number.NaN),
    mean: round(mean),
    median: round(percentile(sorted, 0.5)),
    min: round(sorted[0] ?? Number.NaN),
    opsPerSecond: round(mean > 0 ? 1000 / mean : Number.POSITIVE_INFINITY),
    p75: round(percentile(sorted, 0.75)),
    p99: round(percentile(sorted, 0.99)),
    samples: sorted.length,
  };
};

const sample = (
  run: () => number,
  {
    budgetMs = 500,
    maxSamples = 200,
    minSamples = 5,
    warmup = 2,
  }: MeasureOptions,
): Stats => {
  for (let index = 0; index < warmup; index += 1) run();
  const times: number[] = [];
  const started = performance.now();
  while (
    times.length < maxSamples &&
    (times.length < minSamples || performance.now() - started < budgetMs)
  )
    times.push(run());
  return summarize(times);
};

/**
 * Times `run` by wall clock, repeatedly, bounded by time so large cases take few samples and a whole report stays
 * short. Whatever `run` returns is ignored.
 */
export const measure = (
  run: () => unknown,
  options: MeasureOptions = {},
): Stats =>
  sample(() => {
    const start = performance.now();
    run();
    return performance.now() - start;
  }, options);

/**
 * Like {@link measure}, but `run` returns its own duration in milliseconds, e.g. a React `<Profiler>` commit time,
 * so setup and teardown inside `run` don't count.
 */
export const measureReported = (
  run: () => number,
  options: MeasureOptions = {},
): Stats => sample(run, options);
