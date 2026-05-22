export type LogSeverity = "info" | "success" | "system" | "warn";

export interface LogEntry {
  id: string;
  timestamp: string;
  severity: LogSeverity;
  message: string;
  highlight: boolean;
}

export interface LogTemplate {
  category: string;
  weight: number;
  minTier?: number;
  severity: LogSeverity;
  highlight?: boolean;
  message: string | ((tier: number) => string);
}

const shareNum = () => Math.floor(8000 + Math.random() * 4000);
const diffT = () => (2 + Math.random() * 3).toFixed(2);
const latencyMs = () => Math.floor(18 + Math.random() * 28);
const nodeCount = () => Math.floor(12 + Math.random() * 88);

export const LOG_TEMPLATES: LogTemplate[] = [
  // Connection / System
  { category: "connection", weight: 14, severity: "system", message: "Socket handshake confirmed." },
  { category: "connection", weight: 12, severity: "info", message: "Node handshake complete." },
  { category: "connection", weight: 10, severity: "info", message: "Worker node connected." },
  { category: "connection", weight: 8, severity: "system", message: "TLS tunnel established | AES-256-GCM" },
  { category: "connection", weight: 6, minTier: 2, severity: "success", highlight: true, message: "Turbo cluster synchronized successfully." },
  { category: "connection", weight: 4, minTier: 3, severity: "success", highlight: true, message: () => "Quantum acceleration cluster synchronized." },

  // Pool
  { category: "pool", weight: 13, severity: "info", message: "Pool stratum connection stable." },
  { category: "pool", weight: 11, severity: "success", message: () => `Pool latency optimized | ${latencyMs()}ms` },
  { category: "pool", weight: 9, severity: "info", message: "Pool difficulty retarget synchronized." },
  { category: "pool", weight: 7, minTier: 1, severity: "success", highlight: true, message: "Boosted pool channel authenticated." },

  // Shares
  { category: "share", weight: 16, severity: "success", highlight: true, message: () => `Share accepted #${shareNum()} | Diff: ${diffT()}T` },
  { category: "share", weight: 10, severity: "info", message: () => `Valid share propagated | nonce ${Math.floor(Math.random() * 999999)}` },
  { category: "share", weight: 6, minTier: 2, severity: "success", highlight: true, message: () => `Turbo share batch #${shareNum()} committed` },

  // Market volatility (visual)
  { category: "market", weight: 9, severity: "info", message: "Dynamic volatility calibration complete." },
  { category: "market", weight: 8, severity: "info", message: "Market feed latency nominal | 42ms" },
  { category: "market", weight: 5, severity: "system", message: "Price oracle consensus reached." },

  // Cluster allocation
  { category: "cluster", weight: 12, severity: "info", message: () => `GPU node allocation verified | ${nodeCount()} units` },
  { category: "cluster", weight: 10, severity: "info", message: "Hash cluster redistributed across regional nodes." },
  { category: "cluster", weight: 7, minTier: 1, severity: "success", highlight: true, message: "Regional cluster load balanced." },
  { category: "cluster", weight: 5, minTier: 3, severity: "success", highlight: true, message: "Max-power datacenter slice engaged." },

  // Block validation
  { category: "block", weight: 8, severity: "success", highlight: true, message: "Block share validated." },
  { category: "block", weight: 7, severity: "info", message: "Block verification queue synchronized." },
  { category: "block", weight: 4, minTier: 2, severity: "success", highlight: true, message: "Merkle root verification passed." },

  // Latency
  { category: "latency", weight: 10, severity: "info", message: () => `Round-trip diagnostic | ${latencyMs()}ms avg` },
  { category: "latency", weight: 6, severity: "system", message: "Ingress router heartbeat OK." },

  // Premium tier specials
  { category: "premium", weight: 3, minTier: 2, severity: "success", highlight: true, message: "NVLink mesh topology confirmed." },
  { category: "premium", weight: 2, minTier: 3, severity: "success", highlight: true, message: "H100 tensor core pipeline saturated." },
  { category: "premium", weight: 2, minTier: 3, severity: "success", highlight: true, message: "Cross-region failover disabled — max throughput mode." },
];

export const LOG_ROTATION_MIN_MS = 5000;
export const LOG_ROTATION_MAX_MS = 12000;
export const LOG_MAX_ENTRIES = 32;

export const BOOT_LOG_MESSAGES: Omit<LogEntry, "id">[] = [
  { timestamp: "", severity: "system", message: "System initialized. Ready to deploy mining session.", highlight: true },
  { timestamp: "", severity: "success", message: "Market data updated — 14 assets loaded", highlight: true },
  { timestamp: "", severity: "info", message: "Cluster backbone online | awaiting session", highlight: false },
];
