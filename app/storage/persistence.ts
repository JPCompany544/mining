import type { MiningSession, PastSession } from "../config/mining";
import type { LogEntry } from "../config/logTemplates";
import { LEGACY_KEYS, STORAGE_KEYS } from "./keys";
import type { UserPreferences, VisualPersistedState, PersistedActiveSession } from "./types";

const THROTTLE_MS = 4000;
let lastVisualWrite = 0;
let pendingVisual: VisualPersistedState | null = null;
let visualTimer: ReturnType<typeof setTimeout> | null = null;
let cachedVisualState: VisualPersistedState | null = null;

let lastLogWrite = 0;
let pendingLogs: LogEntry[] | null = null;
let logTimer: ReturnType<typeof setTimeout> | null = null;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function migrateLegacyStorage(): void {
  if (typeof window === "undefined") return;

  const hasNewPrefs = localStorage.getItem(STORAGE_KEYS.preferences);
  if (!hasNewPrefs) {
    const coin = localStorage.getItem(LEGACY_KEYS.selectedCoin);
    const tier = localStorage.getItem(LEGACY_KEYS.speedTier);
    if (coin || tier) {
      const prefs: UserPreferences = {
        selectedCoin: coin ?? "btc",
        speedTier: tier ? parseInt(tier, 10) : 1,
      };
      localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(prefs));
    }
  }

  const hasNewSession = localStorage.getItem(STORAGE_KEYS.activeSession);
  if (!hasNewSession) {
    const legacySession = localStorage.getItem(LEGACY_KEYS.currentSession);
    const legacyActive = localStorage.getItem(LEGACY_KEYS.sessionActive);
    if (legacySession) {
      const session = safeParse<MiningSession>(legacySession);
      if (session) {
        const payload: PersistedActiveSession = {
          session,
          isActive: legacyActive === "true",
        };
        localStorage.setItem(STORAGE_KEYS.activeSession, JSON.stringify(payload));
        localStorage.setItem(
          STORAGE_KEYS.sessionActive,
          legacyActive === "true" ? "true" : "false"
        );
      }
    }
  }

  const hasNewHistory = localStorage.getItem(STORAGE_KEYS.history);
  if (!hasNewHistory) {
    const legacyHistory = localStorage.getItem(LEGACY_KEYS.history);
    if (legacyHistory) {
      localStorage.setItem(STORAGE_KEYS.history, legacyHistory);
    }
  }
}

function storageAvailable(): boolean {
  return typeof window !== "undefined";
}

export function loadPreferences(): UserPreferences | null {
  if (!storageAvailable()) return null;
  return safeParse<UserPreferences>(localStorage.getItem(STORAGE_KEYS.preferences));
}

export function savePreferences(prefs: UserPreferences): void {
  if (!storageAvailable()) return;
  localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(prefs));
}

export function loadActiveSession(): PersistedActiveSession | null {
  if (!storageAvailable()) return null;
  return safeParse<PersistedActiveSession>(
    localStorage.getItem(STORAGE_KEYS.activeSession)
  );
}

export function saveActiveSession(session: MiningSession | null, isActive: boolean): void {
  if (!storageAvailable()) return;
  if (!session) {
    localStorage.setItem(STORAGE_KEYS.sessionActive, "false");
    localStorage.removeItem(STORAGE_KEYS.activeSession);
    return;
  }
  const payload: PersistedActiveSession = { session, isActive };
  localStorage.setItem(STORAGE_KEYS.activeSession, JSON.stringify(payload));
  localStorage.setItem(STORAGE_KEYS.sessionActive, isActive ? "true" : "false");
}

export function loadHistory(): PastSession[] {
  if (!storageAvailable()) return [];
  return safeParse<PastSession[]>(localStorage.getItem(STORAGE_KEYS.history)) ?? [];
}

export function saveHistory(history: PastSession[]): void {
  if (!storageAvailable()) return;
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
}

export function loadLogs(): LogEntry[] {
  if (!storageAvailable()) return [];
  return safeParse<LogEntry[]>(localStorage.getItem(STORAGE_KEYS.logs)) ?? [];
}

export function saveLogsImmediate(logs: LogEntry[]): void {
  if (!storageAvailable()) return;
  localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(logs.slice(0, 32)));
  lastLogWrite = Date.now();
  pendingLogs = null;
  if (logTimer) {
    clearTimeout(logTimer);
    logTimer = null;
  }
}

export function saveLogsThrottled(logs: LogEntry[]): void {
  if (!storageAvailable()) return;
  pendingLogs = logs.slice(0, 32);
  const elapsed = Date.now() - lastLogWrite;
  if (elapsed >= THROTTLE_MS) {
    saveLogsImmediate(pendingLogs);
    return;
  }
  if (logTimer) return;
  logTimer = setTimeout(() => {
    if (pendingLogs) saveLogsImmediate(pendingLogs);
    logTimer = null;
  }, THROTTLE_MS - elapsed);
}

export function loadVisualState(): VisualPersistedState | null {
  if (!storageAvailable()) return null;
  if (cachedVisualState !== null) return cachedVisualState;
  cachedVisualState = safeParse<VisualPersistedState>(
    localStorage.getItem(STORAGE_KEYS.visualState)
  );
  return cachedVisualState;
}

export function saveVisualStateImmediate(state: VisualPersistedState): void {
  if (!storageAvailable()) return;
  localStorage.setItem(STORAGE_KEYS.visualState, JSON.stringify(state));
  cachedVisualState = state;
  lastVisualWrite = Date.now();
  pendingVisual = null;
  if (visualTimer) {
    clearTimeout(visualTimer);
    visualTimer = null;
  }
}

export function saveVisualStateThrottled(state: VisualPersistedState): void {
  pendingVisual = state;
  cachedVisualState = state;
  const elapsed = Date.now() - lastVisualWrite;
  if (elapsed >= THROTTLE_MS) {
    saveVisualStateImmediate(state);
    return;
  }
  if (visualTimer) return;
  visualTimer = setTimeout(() => {
    if (pendingVisual) saveVisualStateImmediate(pendingVisual);
    visualTimer = null;
  }, THROTTLE_MS - elapsed);
}

export function flushPendingWrites(): void {
  if (pendingVisual) saveVisualStateImmediate(pendingVisual);
  if (pendingLogs) saveLogsImmediate(pendingLogs);
}

export function patchVisualState(patch: Partial<VisualPersistedState>): void {
  if (!storageAvailable()) return;
  const current = loadVisualState();
  saveVisualStateThrottled({
    speedTier: patch.speedTier ?? current?.speedTier ?? 1,
    displayHashrate: patch.displayHashrate ?? current?.displayHashrate ?? 150,
    targetHashrate: patch.targetHashrate ?? current?.targetHashrate ?? 150,
    displayUsd: patch.displayUsd ?? current?.displayUsd ?? 5500,
    targetUsd: patch.targetUsd ?? current?.targetUsd ?? 5500,
    updatedAt: Date.now(),
  });
}
