/** Visual-only hashrate simulation config — never affects payouts. */

import type { HashrateUnit } from "./volatility";

export interface TierHashrateConfig {
  min: number;
  max: number;
  unit: HashrateUnit;
  decimals: number;
  /** Drift intensity relative to tier span (0–1). */
  driftIntensity: number;
  /** Mean-reversion pull toward median. */
  inertia: number;
}

export const TIER_HASHRATE: Record<number, TierHashrateConfig> = {
  0: {
    min: 172,
    max: 188,
    unit: "TH/s",
    decimals: 1,
    driftIntensity: 0.05,
    inertia: 0.035,
  },
  1: {
    min: 435,
    max: 465,
    unit: "TH/s",
    decimals: 1,
    driftIntensity: 0.06,
    inertia: 0.04,
  },
  2: {
    min: 1.15,
    max: 1.25,
    unit: "PH/s",
    decimals: 2,
    driftIntensity: 0.08,
    inertia: 0.045,
  },
  3: {
    min: 1.15,
    max: 1.25,
    unit: "PH/s",
    decimals: 2,
    driftIntensity: 0.08,
    inertia: 0.045,
  },
};

export function getTierHashrateConfig(tier: number): TierHashrateConfig {
  return TIER_HASHRATE[tier] ?? TIER_HASHRATE[1];
}

export const HASHRATE_UPDATE_MIN_MS = 1500;
export const HASHRATE_UPDATE_MAX_MS = 3000;
