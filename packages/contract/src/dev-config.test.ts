import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_DEV_CONFIG,
  getDevConfig,
  normalizeDevConfig,
  pickLatencyMs,
  setDevConfig,
  shouldFail,
  type DevConfig,
} from './dev-config';

const base: DevConfig = { ...DEFAULT_DEV_CONFIG };

describe('normalizeDevConfig', () => {
  it('falls back to defaults for garbage input', () => {
    expect(normalizeDevConfig(null)).toEqual(DEFAULT_DEV_CONFIG);
    expect(normalizeDevConfig({ latencyMinMs: 'fast' })).toEqual(DEFAULT_DEV_CONFIG);
  });

  it('fills missing fields from defaults', () => {
    expect(normalizeDevConfig({ failureRatePct: 3 })).toEqual({
      ...DEFAULT_DEV_CONFIG,
      failureRatePct: 3,
    });
  });

  it('swaps an inverted latency range instead of producing a negative span', () => {
    const result = normalizeDevConfig({ latencyMinMs: 900, latencyMaxMs: 100 });
    expect(result.latencyMinMs).toBe(100);
    expect(result.latencyMaxMs).toBe(900);
  });

  it('rejects out-of-range failure rates', () => {
    expect(normalizeDevConfig({ failureRatePct: 250 })).toEqual(DEFAULT_DEV_CONFIG);
  });
});

describe('pickLatencyMs', () => {
  it('is zero when latency is disabled', () => {
    expect(pickLatencyMs({ ...base, latencyEnabled: false }, () => 0.9)).toBe(0);
  });

  it('spans the configured range', () => {
    expect(pickLatencyMs(base, () => 0)).toBe(150);
    expect(pickLatencyMs(base, () => 1)).toBe(600);
    expect(pickLatencyMs(base, () => 0.5)).toBe(375);
  });
});

describe('shouldFail', () => {
  it('never fails at 0%', () => {
    expect(shouldFail(base, () => 0)).toBe(false);
  });

  it('fails when the roll lands under the rate', () => {
    const config = { ...base, failureRatePct: 10 };
    expect(shouldFail(config, () => 0.09)).toBe(true);
    expect(shouldFail(config, () => 0.1)).toBe(false);
  });

  it('always fails at 100%', () => {
    expect(shouldFail({ ...base, failureRatePct: 100 }, () => 0.999)).toBe(true);
  });
});

describe('getDevConfig / setDevConfig', () => {
  function fakeStorage(initial: Record<string, string> = {}) {
    const data = new Map(Object.entries(initial));
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    };
  }

  afterEach(() => vi.unstubAllGlobals());

  it('returns defaults when nothing is stored', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    expect(getDevConfig()).toEqual(DEFAULT_DEV_CONFIG);
  });

  it('round-trips a saved config', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    setDevConfig({ ...base, failureRatePct: 7, latencyEnabled: false });
    expect(getDevConfig()).toEqual({ ...base, failureRatePct: 7, latencyEnabled: false });
  });

  it('recovers from corrupt JSON in storage', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'mekong.devpanel': '{not json' }));
    expect(getDevConfig()).toEqual(DEFAULT_DEV_CONFIG);
  });

  it('survives storage being unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(getDevConfig()).toEqual(DEFAULT_DEV_CONFIG);
    expect(setDevConfig({ ...base, failureRatePct: 5 }).failureRatePct).toBe(5);
  });
});
