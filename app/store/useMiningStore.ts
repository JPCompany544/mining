import { create } from "zustand";
import { MINING_MODES, MiningSession, PastSession } from "../config/mining";
import {
  migrateLegacyStorage,
  loadPreferences,
  savePreferences,
  loadActiveSession,
  saveActiveSession,
  loadHistory,
  saveHistory as persistHistory,
} from "../storage/persistence";

interface MiningStore {
  isMining: boolean;
  selectedCoin: string;
  speedTier: number; // 0 = standard, 1 = boosted, 2 = turbo, 3 = max
  currentSession: MiningSession | null;
  history: PastSession[];

  // Unpaid Sessions
  unpaidSessions: Array<{
    sessionId: string;
    coinId: string;
    coinName: string;
    coinTicker: string;
    minedAmount: number;
    minedUsd: number;
    speedTier: number;
  }>;

  // Withdrawal Modal centralized state
  isWithdrawalModalOpen: boolean;
  withdrawalSession: {
    sessionId: string;
    coinId: string;
    coinName: string;
    coinTicker: string;
    minedAmount: number;
    minedUsd: number;
    speedTier: number;
  } | null;

  // Actions
  setSelectedCoin: (coin: string) => void;
  setSpeedTier: (tier: number) => void;
  startMining: (coinPrice: number) => void;
  stopMining: (saveHistory: boolean) => void;
  restoreSession: () => void;
  clearHistory: () => void;
  openWithdrawalModal: (session: {
    sessionId: string;
    coinId: string;
    coinName: string;
    coinTicker: string;
    minedAmount: number;
    minedUsd: number;
    speedTier: number;
  }) => void;
  closeWithdrawalModal: () => void;
  addUnpaidSession: (session: any) => void;
  removeUnpaidSession: (sessionId: string) => void;
}

const generateSessionId = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const r = (length: number) =>
    Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `NX-${r(4)}-${r(4)}`;
};

const getModeKeyByTier = (tier: number): string => {
  switch (tier) {
    case 0:
      return "standard";
    case 1:
      return "boosted";
    case 2:
      return "turbo";
    case 3:
      return "max";
    default:
      return "boosted";
  }
};

export const useMiningStore = create<MiningStore>((set, get) => ({
  isMining: false,
  selectedCoin: "btc",
  speedTier: 1, // default Boosted
  currentSession: null,
  history: [],
  unpaidSessions: [],
  isWithdrawalModalOpen: false,
  withdrawalSession: null,

  openWithdrawalModal: (session) => {
    set({
      isWithdrawalModalOpen: true,
      withdrawalSession: session,
    });
  },

  closeWithdrawalModal: () => {
    set({
      isWithdrawalModalOpen: false,
      withdrawalSession: null,
    });
  },

  addUnpaidSession: (session) => {
    const { unpaidSessions } = get();
    if (!unpaidSessions.find(s => s.sessionId === session.sessionId)) {
      set({ unpaidSessions: [...unpaidSessions, session] });
    }
  },

  removeUnpaidSession: (sessionId) => {
    const { unpaidSessions } = get();
    set({ unpaidSessions: unpaidSessions.filter(s => s.sessionId !== sessionId) });
  },

  setSelectedCoin: (coin) => {
    const { speedTier } = get();
    set({ selectedCoin: coin });
    if (typeof window !== "undefined") {
      savePreferences({ selectedCoin: coin, speedTier });
    }
  },

  setSpeedTier: (tier) => {
    const { selectedCoin } = get();
    set({ speedTier: tier });
    if (typeof window !== "undefined") {
      savePreferences({ selectedCoin, speedTier: tier });
    }
  },

  startMining: (coinPrice) => {
    const { selectedCoin, speedTier, isMining } = get();
    if (isMining) return;

    const modeKey = getModeKeyByTier(speedTier);
    const mode = MINING_MODES[modeKey];
    if (!mode) return;

    const sessionId = generateSessionId();
    const session: MiningSession = {
      sessionId,
      selectedCoin,
      speedTier,
      startTimestamp: Date.now(),
      durationMs: mode.durationMs,
      targetUsd: mode.targetUsd,
      baseCoinPrice: coinPrice,
    };

    set({
      isMining: true,
      currentSession: session,
    });

    if (typeof window !== "undefined") {
      saveActiveSession(session, true);
    }
  },

  stopMining: (saveHistory) => {
    const { currentSession, history } = get();
    if (!currentSession) return;

    const completedAt = Date.now();
    const elapsedMs = completedAt - currentSession.startTimestamp;
    const progress = Math.min(Math.max(elapsedMs / currentSession.durationMs, 0), 1);
    const minedUsd = currentSession.targetUsd * progress;
    const minedCoin = minedUsd / currentSession.baseCoinPrice;

    if (saveHistory) {
      const dateStr = new Date(completedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const newEntry: PastSession = {
        sessionId: currentSession.sessionId,
        coin: currentSession.selectedCoin.toUpperCase(),
        amount: Number(minedCoin.toFixed(8)),
        date: dateStr,
        speedTier: currentSession.speedTier,
        completedUsd: Number(minedUsd.toFixed(2)),
        startedAt: currentSession.startTimestamp,
        completedAt,
        status: progress >= 1 ? "completed" : "stopped",
      };

      const updatedHistory = [newEntry, ...history];
      set({ history: updatedHistory });

      if (typeof window !== "undefined") {
        persistHistory(updatedHistory);
      }
    }

    set({
      isMining: false,
      currentSession: null,
    });

    if (typeof window !== "undefined") {
      saveActiveSession(null, false);
    }
  },

  restoreSession: () => {
    if (typeof window === "undefined") return;

    migrateLegacyStorage();

    const prefs = loadPreferences();
    if (prefs) {
      set({ selectedCoin: prefs.selectedCoin, speedTier: prefs.speedTier });
    }

    const savedHistory = loadHistory();
    if (savedHistory.length > 0) {
      set({ history: savedHistory });
    }

    const persisted = loadActiveSession();
    const isActive = persisted?.isActive === true;
    const session = persisted?.session ?? null;

    if (isActive && session) {
      try {
        const elapsedMs = Date.now() - session.startTimestamp;

        if (elapsedMs >= session.durationMs) {
          const minedUsd = session.targetUsd;
          const minedCoin = minedUsd / session.baseCoinPrice;
          const completedAt = session.startTimestamp + session.durationMs;

          const dateStr = new Date(completedAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });

          const newEntry: PastSession = {
            sessionId: session.sessionId,
            coin: session.selectedCoin.toUpperCase(),
            amount: Number(minedCoin.toFixed(8)),
            date: dateStr,
            speedTier: session.speedTier,
            completedUsd: Number(minedUsd.toFixed(2)),
            startedAt: session.startTimestamp,
            completedAt,
            status: "completed",
          };

          const updatedHistory = [newEntry, ...savedHistory];
          set({
            isMining: false,
            currentSession: null,
            history: updatedHistory,
          });

          saveActiveSession(null, false);
          persistHistory(updatedHistory);
        } else {
          set({
            isMining: true,
            currentSession: session,
          });
        }
      } catch (e) {
        console.error("Failed to restore mining session", e);
        set({ isMining: false, currentSession: null });
        saveActiveSession(null, false);
      }
    }
  },

  clearHistory: () => {
    set({ history: [] });
    if (typeof window !== "undefined") {
      persistHistory([]);
    }
  },
}));
