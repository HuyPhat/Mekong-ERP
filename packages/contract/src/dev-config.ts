import { z } from 'zod';

const STORAGE_KEY = 'mekong.devpanel';

export const DevConfigSchema = z.object({
  latencyEnabled: z.boolean(),
  latencyMinMs: z.number().int().min(0).max(5000),
  latencyMaxMs: z.number().int().min(0).max(5000),
  failureRatePct: z.number().min(0).max(100),
});
export type DevConfig = z.infer<typeof DevConfigSchema>;

// PLAN.md §7: 150–600 ms latency by default so loading states are visible;
// random failures are opt-in (they exist to demo the error/retry UX).
export const DEFAULT_DEV_CONFIG: DevConfig = {
  latencyEnabled: true,
  latencyMinMs: 150,
  latencyMaxMs: 600,
  failureRatePct: 0,
};

export function normalizeDevConfig(input: unknown): DevConfig {
  const parsed = DevConfigSchema.safeParse({ ...DEFAULT_DEV_CONFIG, ...(input as object) });
  if (!parsed.success) return DEFAULT_DEV_CONFIG;
  const { latencyMinMs, latencyMaxMs } = parsed.data;
  return {
    ...parsed.data,
    latencyMinMs: Math.min(latencyMinMs, latencyMaxMs),
    latencyMaxMs: Math.max(latencyMinMs, latencyMaxMs),
  };
}

export function getDevConfig(): DevConfig {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? normalizeDevConfig(JSON.parse(raw)) : DEFAULT_DEV_CONFIG;
  } catch {
    return DEFAULT_DEV_CONFIG;
  }
}

export function setDevConfig(config: DevConfig): DevConfig {
  const normalized = normalizeDevConfig(config);
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Storage unavailable (private mode etc.): the panel simply won't persist.
  }
  return normalized;
}

/** Picks a latency in [min, max]; `random` is injectable so tests are deterministic. */
export function pickLatencyMs(config: DevConfig, random: () => number = Math.random): number {
  if (!config.latencyEnabled) return 0;
  return Math.round(config.latencyMinMs + random() * (config.latencyMaxMs - config.latencyMinMs));
}

export function shouldFail(config: DevConfig, random: () => number = Math.random): boolean {
  return config.failureRatePct > 0 && random() * 100 < config.failureRatePct;
}
