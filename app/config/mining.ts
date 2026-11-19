export interface MiningMode {
  id: string;
  tierIndex: number;
  name: string;
  badge?: string;
  priceUsd: number;
  fixedFeeUsd: number;
  targetUsd: number;
  dailyUsd: number;
  durationDays: number;
  durationMs: number;
  rigHardware: string;
  hashrateDisplay: string;
  hashrateNumeric: number;
  hashrateUnit: string;
  allowedCoins: string[];
}

export const MINING_MODES: Record<string, MiningMode> = {
  standard: {
    id: "standard",
    tierIndex: 0,
    name: "Node Starter",
    badge: "STARTER RIG",
    priceUsd: 150,
    fixedFeeUsd: 150,
    targetUsd: 1500,
    dailyUsd: 214.28,
    durationDays: 7,
    durationMs: 7 * 24 * 60 * 60 * 1000, // 7 days (604,800,000 ms)
    rigHardware: "4× NVIDIA RTX 4090 Cloud Nodes",
    hashrateDisplay: "180 TH/s",
    hashrateNumeric: 180,
    hashrateUnit: "TH/s",
    allowedCoins: ["btc", "ltc", "doge"],
  },
  boosted: {
    id: "boosted",
    tierIndex: 1,
    name: "Cluster Rig",
    badge: "MOST POPULAR",
    priceUsd: 300,
    fixedFeeUsd: 300,
    targetUsd: 3000,
    dailyUsd: 428.57,
    durationDays: 7,
    durationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    rigHardware: "8× Bitmain Antminer S21 Hydro",
    hashrateDisplay: "450 TH/s",
    hashrateNumeric: 450,
    hashrateUnit: "TH/s",
    allowedCoins: ["btc", "ltc", "doge", "eth", "sol", "ton", "trx", "bnb"],
  },
  turbo: {
    id: "turbo",
    tierIndex: 2,
    name: "Quantum Titan",
    badge: "MAX PROFIT",
    priceUsd: 500,
    fixedFeeUsd: 500,
    targetUsd: 5000,
    dailyUsd: 714.28,
    durationDays: 7,
    durationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    rigHardware: "16× NVIDIA H100 AI/GPU Cluster",
    hashrateDisplay: "1.2 PH/s",
    hashrateNumeric: 1.2,
    hashrateUnit: "PH/s",
    allowedCoins: [
      "btc", "eth", "bnb", "sol", "ton", "xmr", "doge",
      "trx", "ada", "dot", "usdt", "usdc", "ltc", "xrp"
    ],
  },
  // Backwards compatibility alias
  max: {
    id: "max",
    tierIndex: 2,
    name: "Quantum Titan",
    badge: "MAX PROFIT",
    priceUsd: 500,
    fixedFeeUsd: 500,
    targetUsd: 5000,
    dailyUsd: 714.28,
    durationDays: 7,
    durationMs: 7 * 24 * 60 * 60 * 1000,
    rigHardware: "16× NVIDIA H100 AI/GPU Cluster",
    hashrateDisplay: "1.2 PH/s",
    hashrateNumeric: 1.2,
    hashrateUnit: "PH/s",
    allowedCoins: [
      "btc", "eth", "bnb", "sol", "ton", "xmr", "doge",
      "trx", "ada", "dot", "usdt", "usdc", "ltc", "xrp"
    ],
  },
};

export const MINING_PLANS: MiningMode[] = [
  MINING_MODES.standard,
  MINING_MODES.boosted,
  MINING_MODES.turbo,
];

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
