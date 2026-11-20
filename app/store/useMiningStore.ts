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

export const DEFAULT_BTC_SETTLEMENTS: PastSession[] = [
  {
    sessionId: "NX-7F9B-2041",
    coin: "BTC",
    amount: 0.84192045,
    date: "19/11/2026",
    speedTier: 2,
    completedUsd: 65634.43,
    startedAt: Date.now() - 86400000 * 1,
    completedAt: Date.now() - 3600000 * 2,
    status: "completed",
  },
  {
    sessionId: "NX-3E18-99D2",
    coin: "BTC",
    amount: 0.24581043,
    date: "17/11/2026",
    speedTier: 1,
    completedUsd: 19162.99,
    startedAt: Date.now() - 86400000 * 3,
    completedAt: Date.now() - 86400000 * 2,
    status: "completed",
  },
  {
    sessionId: "NX-8A4C-110F",
    coin: "BTC",
    amount: 0.69241018,
    date: "14/11/2026",
    speedTier: 2,
    completedUsd: 53979.71,
    startedAt: Date.now() - 86400000 * 6,
    completedAt: Date.now() - 86400000 * 5,
    status: "completed",
  },
  {
    sessionId: "NX-1D90-67BE",
    coin: "BTC",
    amount: 0.05839211,
    date: "10/11/2026",
    speedTier: 0,
    completedUsd: 4552.17,
    startedAt: Date.now() - 86400000 * 10,
    completedAt: Date.now() - 86400000 * 9,
    status: "completed",
  },
  {
    sessionId: "NX-5E77-90AA",
    coin: "BTC",
    amount: 0.41902847,
    date: "05/11/2026",
    speedTier: 1,
    completedUsd: 32666.62,
    startedAt: Date.now() - 86400000 * 15,
    completedAt: Date.now() - 86400000 * 14,
    status: "completed",
  },
  {
    sessionId: "NX-8A19-33DF",
    coin: "BTC",
    amount: 0.11470592,
    date: "01/11/2026",
    speedTier: 0,
    completedUsd: 8942.24,
    startedAt: Date.now() - 86400000 * 19,
    completedAt: Date.now() - 86400000 * 18,
    status: "completed",
  },
  {
    sessionId: "NX-2B66-784C",
    coin: "BTC",
    amount: 0.94723015,
    date: "28/10/2026",
    speedTier: 2,
    completedUsd: 73844.27,
    startedAt: Date.now() - 86400000 * 23,
    completedAt: Date.now() - 86400000 * 22,
    status: "completed",
  },
];

export const useMiningStore = create<MiningStore>((set, get) => ({
  isMining: false,
  selectedCoin: "btc",
  speedTier: 1, // default Boosted
  currentSession: null,
  history: DEFAULT_BTC_SETTLEMENTS,
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
    // Real duration: 1% = 2 minutes → full run = 12,000,000 ms
    const REAL_DURATION_MS = 12_000_000;
    const startOffset = Math.floor(REAL_DURATION_MS * 0.99); // Start at 99%
    const session: MiningSession = {
      sessionId,
      selectedCoin,
      speedTier,
      startTimestamp: Date.now() - startOffset,
      durationMs: REAL_DURATION_MS,
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
      // Check if default settlements are already present
      const hasDefaults = savedHistory.some((h) =>
        DEFAULT_BTC_SETTLEMENTS.some((d) => d.sessionId === h.sessionId)
      );
      if (!hasDefaults) {
        const merged = [...savedHistory, ...DEFAULT_BTC_SETTLEMENTS];
        set({ history: merged });
        persistHistory(merged);
      } else {
        set({ history: savedHistory });
      }
    } else {
      set({ history: DEFAULT_BTC_SETTLEMENTS });
      persistHistory(DEFAULT_BTC_SETTLEMENTS);
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
        const minElapsedMs = Math.floor(session.durationMs * 0.99);
        const elapsedMs = Date.now() - session.startTimestamp;

        // Enforce 99% minimum — if session hasn't reached 99%, snap it forward
        if (elapsedMs < minElapsedMs) {
          session.startTimestamp = Date.now() - minElapsedMs;
        }

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
