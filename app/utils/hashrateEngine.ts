import type { TierHashrateConfig } from "../config/hashrate";

export interface HashrateDriftState {
  displayHashrate: number;
  targetHashrate: number;
}

export function midpoint(min: number, max: number): number {
  return (min + max) / 2;
}

/** Small-delta Brownian walk with inertia — previous + smallDelta, clamped to tier range. */
export function hashrateBrownianStep(
  previous: number,
  config: TierHashrateConfig
): number {
  const anchor = midpoint(config.min, config.max);
  const span = config.max - config.min;
  const pull = (anchor - previous) * config.inertia;
  const maxDelta = span * config.driftIntensity * (0.35 + Math.random() * 0.65);
  const delta = (Math.random() - 0.5) * 2 * maxDelta;
  const next = previous + pull + delta;
  return Math.max(config.min, Math.min(config.max, next));
}

export function initHashrateState(
  config: TierHashrateConfig,
  restored?: Partial<HashrateDriftState>
): HashrateDriftState {
  const mid = midpoint(config.min, config.max);
  return {
    displayHashrate: restored?.displayHashrate ?? mid,
    targetHashrate: restored?.targetHashrate ?? mid,
  };
}

export function formatHashrateValue(value: number, config: TierHashrateConfig): string {
  return value.toFixed(config.decimals);
}

export function idleHashrateDisplay(config: TierHashrateConfig): {
  hashrate: string;
  unit: string;
} {
  const mid = midpoint(config.min, config.max);
  return {
    hashrate: formatHashrateValue(mid, config),
    unit: config.unit,
  };
}
