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
    hourlyUsdBase: 8.93,
    volatilityMin: 0.03,
    volatilityMax: 0.05,
    hashrateMin: 172,
    hashrateMax: 188,
    hashrateUnit: "TH/s",
    hashrateDecimals: 1,
  },
  1: {
    hourlyUsdBase: 17.86,
    volatilityMin: 0.04,
    volatilityMax: 0.06,
    hashrateMin: 435,
    hashrateMax: 465,
    hashrateUnit: "TH/s",
    hashrateDecimals: 1,
  },
  2: {
    hourlyUsdBase: 29.76,
    volatilityMin: 0.05,
    volatilityMax: 0.08,
    hashrateMin: 1.15,
    hashrateMax: 1.25,
    hashrateUnit: "PH/s",
    hashrateDecimals: 2,
  },
  3: {
    hourlyUsdBase: 29.76,
    volatilityMin: 0.05,
    volatilityMax: 0.08,
    hashrateMin: 1.15,
    hashrateMax: 1.25,
    hashrateUnit: "PH/s",
    hashrateDecimals: 2,
  },
};

export function getTierVolatilityConfig(tier: number): TierVolatilityConfig {
  return TIER_VOLATILITY[tier] ?? TIER_VOLATILITY[1];
}

export const EST_UPDATE_INTERVAL_MIN_MS = 2000;
export const EST_UPDATE_INTERVAL_MAX_MS = 4000;
