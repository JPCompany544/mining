import type { MiningSession, PastSession } from "../config/mining";
import type { LogEntry } from "../config/logTemplates";

export interface UserPreferences {
  selectedCoin: string;
  speedTier: number;
}

export interface VisualPersistedState {
  speedTier: number;
  displayHashrate: number;
  targetHashrate: number;
  displayUsd: number;
  targetUsd: number;
  updatedAt: number;
}

export interface PersistedActiveSession {
  session: MiningSession;
  isActive: boolean;
}

export type { MiningSession, PastSession, LogEntry };
