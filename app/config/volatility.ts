/** Visual-only volatility config — never used by the deterministic payout engine. */

export type HashrateUnit = "TH/s" | "PH/s";

export interface TierVolatilityConfig {
  /** Display anchor for EST/HR USD (Brownian mean-reversion target). */
  hourlyUsdBase: number;
  /** Min/max fractional band around base (e.g. 0.04 = ±4%). */
  volatilityMin: number;
  volatilityMax: number;
  hashrateMin: number;
  hashrateMax: number;
  hashrateUnit: HashrateUnit;
  hashrateDecimals: number;
}

export const TIER_VOLATILITY: Record<number, TierVolatilityConfig> = {
  0: {
    hourlyUsdBase: 2100,
    volatilityMin: 0.04,
    volatilityMax: 0.06,
    hashrateMin: 120,
    hashrateMax: 180,
    hashrateUnit: "TH/s",
    hashrateDecimals: 2,
  },
  1: {
    hourlyUsdBase: 5500,
    volatilityMin: 0.05,
    volatilityMax: 0.08,
    hashrateMin: 0.7,
    hashrateMax: 1.4,
    hashrateUnit: "PH/s",
    hashrateDecimals: 2,
  },
  2: {
    hourlyUsdBase: 12800,
    volatilityMin: 0.06,
    volatilityMax: 0.1,
    hashrateMin: 2,
    hashrateMax: 4,
    hashrateUnit: "PH/s",
    hashrateDecimals: 2,
  },
  3: {
    hourlyUsdBase: 35000,
    volatilityMin: 0.08,
    volatilityMax: 0.14,
    hashrateMin: 8,
    hashrateMax: 14,
    hashrateUnit: "PH/s",
    hashrateDecimals: 2,
  },
};

export function getTierVolatilityConfig(tier: number): TierVolatilityConfig {
  return TIER_VOLATILITY[tier] ?? TIER_VOLATILITY[1];
}

export const EST_UPDATE_INTERVAL_MIN_MS = 2000;
export const EST_UPDATE_INTERVAL_MAX_MS = 4000;
