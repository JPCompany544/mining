export interface MiningMode {
  id: string;
  name: string;
  durationMs: number;
  targetUsd: number;
  fixedFeeUsd: number;
}

export const MINING_MODES: Record<string, MiningMode> = {
  standard: {
    id: "standard",
    name: "Standard",
    durationMs: 60 * 60 * 1000, // 60 minutes
    targetUsd: 2100,
    fixedFeeUsd: 70,
  },
  boosted: {
    id: "boosted",
    name: "Boosted",
    durationMs: 45 * 60 * 1000, // 45 minutes
    targetUsd: 5500,
    fixedFeeUsd: 100,
  },
  turbo: {
    id: "turbo",
    name: "Turbo",
    durationMs: 30 * 60 * 1000, // 30 minutes
    targetUsd: 12800,
    fixedFeeUsd: 150,
  },
  max: {
    id: "max",
    name: "Max Power",
    durationMs: 10 * 60 * 1000, // 10 minutes
    targetUsd: 35000,
    fixedFeeUsd: 200,
  },
};

export interface MiningSession {
  sessionId: string;
  selectedCoin: string;
  speedTier: number; // 0 = standard, 1 = boosted, 2 = turbo, 3 = max
  startTimestamp: number;
  durationMs: number;
  targetUsd: number;
  baseCoinPrice: number;
}

export interface PastSession {
  sessionId: string;
  coin: string;
  amount: number;
  date: string;
  speedTier?: number;
  completedUsd?: number;
  startedAt?: number;
  completedAt?: number;
  status?: "completed" | "stopped";
}
