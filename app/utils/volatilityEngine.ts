import type { TierVolatilityConfig } from "../config/volatility";

/** Mean-reverting Brownian step — gradual drift, no wild jumps (EST/HR only). */
export function brownianStep(
  current: number,
  base: number,
  bandMinFrac: number,
  bandMaxFrac: number
): number {
  const bandLow = base * (1 - bandMaxFrac);
  const bandHigh = base * (1 + bandMaxFrac);
  const stepVol = bandMinFrac + Math.random() * (bandMaxFrac - bandMinFrac);
  const meanRevert = (base - current) * (0.025 + Math.random() * 0.035);
  const shock = (Math.random() - 0.5) * 2 * stepVol * base * 0.12;
  const next = current + meanRevert + shock;
  return Math.max(bandLow, Math.min(bandHigh, next));
}

export function lerp(current: number, target: number, alpha: number): number {
  return current + (target - current) * alpha;
}

/** Time-normalized ease-out interpolation factor for ~500ms feel at 60fps. */
export function interpolationAlpha(deltaMs: number): number {
  const tau = 500;
  return 1 - Math.exp(-deltaMs / tau);
}

export function formatEstHrUsd(usdPerHr: number): string {
  return `+$${usdPerHr.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} / hr`;
}

export function formatEstHrCrypto(usdPerHr: number, coinPrice: number): string {
  if (coinPrice <= 0) return "0.00000000";
  return (usdPerHr / coinPrice).toFixed(8);
}

export interface EstVolatilityState {
  displayUsd: number;
  targetUsd: number;
}

export function initEstVolatilityState(
  config: TierVolatilityConfig,
  restored?: Partial<EstVolatilityState>
): EstVolatilityState {
  return {
    displayUsd: restored?.displayUsd ?? config.hourlyUsdBase,
    targetUsd: restored?.targetUsd ?? config.hourlyUsdBase,
  };
}

export function idleEstDisplay(
  config: TierVolatilityConfig,
  coinPrice: number
): { estCrypto: string; estUsd: string } {
  return {
    estCrypto: formatEstHrCrypto(config.hourlyUsdBase, coinPrice),
    estUsd: formatEstHrUsd(config.hourlyUsdBase),
  };
}
