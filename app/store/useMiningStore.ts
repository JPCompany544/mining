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

  userEmail: string | null;
  isPlanPaid: boolean;

  // Actions
  setUserEmail: (email: string) => void;
  setPlanPaid: (isPaid: boolean, tier?: number) => void;
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

// Payout settlements default honestly to empty for every account and future ones
export const DEFAULT_BTC_SETTLEMENTS: PastSession[] = [];

export const useMiningStore = create<MiningStore>((set, get) => ({
  isMining: false,
  selectedCoin: "btc",
  speedTier: 1, // default Boosted
  currentSession: null,
  history: [],
  unpaidSessions: [],
  isWithdrawalModalOpen: false,
  withdrawalSession: null,

  userEmail: null,
  isPlanPaid: false,

  setUserEmail: (email: string) => {
    const { selectedCoin, speedTier, isPlanPaid } = get();
    set({ userEmail: email });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("chukohash_user_email", email);
        savePreferences({ selectedCoin, speedTier, userEmail: email, isPlanPaid });
      } catch {}
    }
  },

  setPlanPaid: (isPaid: boolean, tier?: number) => {
    const { selectedCoin, speedTier, userEmail } = get();
    const effectiveTier = tier !== undefined ? tier : speedTier;
    set({ isPlanPaid: isPaid, speedTier: effectiveTier });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("chukohash_plan_paid", isPaid ? "true" : "false");
        savePreferences({
          selectedCoin,
          speedTier: effectiveTier,
          userEmail: userEmail || undefined,
          isPlanPaid: isPaid,
          paidTier: effectiveTier,
        });
      } catch {}
    }
  },

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
      const updated = [...unpaidSessions, session];
      set({ unpaidSessions: updated });
      if (typeof window !== "undefined") {
        try { localStorage.setItem("chukohash_unpaid_sessions", JSON.stringify(updated)); } catch {}
      }
    }
  },

  removeUnpaidSession: (sessionId) => {
    const { unpaidSessions } = get();
    const updated = unpaidSessions.filter(s => s.sessionId !== sessionId);
    set({ unpaidSessions: updated });
    if (typeof window !== "undefined") {
      try { localStorage.setItem("chukohash_unpaid_sessions", JSON.stringify(updated)); } catch {}
    }
  },

  setSelectedCoin: (coin) => {
    const { speedTier, userEmail } = get();
    set({ selectedCoin: coin });
    if (typeof window !== "undefined") {
      savePreferences({ selectedCoin: coin, speedTier, userEmail: userEmail || undefined });
    }
  },

  setSpeedTier: (tier) => {
    const { selectedCoin, userEmail } = get();
    set({ speedTier: tier });
    if (typeof window !== "undefined") {
      savePreferences({ selectedCoin, speedTier: tier, userEmail: userEmail || undefined });
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
    let email = prefs?.userEmail || null;
    if (!email) {
      try {
        email = localStorage.getItem("chukohash_user_email");
      } catch {}
    }
    let isPaid = false;
    try {
      const paidStr = localStorage.getItem("chukohash_plan_paid");
      isPaid = paidStr === "true" || (prefs?.isPlanPaid === true);
    } catch {}

    if (prefs) {
      set({
        selectedCoin: prefs.selectedCoin,
        speedTier: prefs.paidTier !== undefined ? prefs.paidTier : prefs.speedTier,
        userEmail: email,
        isPlanPaid: isPaid,
      });
    } else if (email) {
      set({ userEmail: email, isPlanPaid: isPaid });
    } else {
      set({ isPlanPaid: isPaid });
    }

    const savedHistory = loadHistory();
    if (savedHistory && savedHistory.length > 0) {
      // Filter out any legacy mock sessions (starting with NX-)
      const genuineHistory = savedHistory.filter(
        (h) => !h.sessionId?.startsWith("NX-")
      );
      set({ history: genuineHistory });
      persistHistory(genuineHistory);
    } else {
      set({ history: [] });
      persistHistory([]);
    }

    // Restore persistent unpaid sessions if available
    try {
      const savedUnpaid = localStorage.getItem("chukohash_unpaid_sessions");
      if (savedUnpaid) {
        set({ unpaidSessions: JSON.parse(savedUnpaid) });
      }
    } catch {}

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

          const updatedHistory = [newEntry, ...savedHistory.filter(h => h.sessionId !== session.sessionId)];
          const withdrawalData = {
            sessionId: session.sessionId,
            coinId: session.selectedCoin,
            coinName: session.selectedCoin.toUpperCase(),
            coinTicker: session.selectedCoin.toUpperCase(),
            minedAmount: Number(minedCoin.toFixed(8)),
            minedUsd: Number(minedUsd.toFixed(2)),
            speedTier: session.speedTier,
          };

          set({
            isMining: false,
            currentSession: null,
            history: updatedHistory,
            isWithdrawalModalOpen: true,
            withdrawalSession: withdrawalData,
          });

          get().addUnpaidSession(withdrawalData);
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
