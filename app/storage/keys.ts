/** Namespaced localStorage keys for Chukohash. */
export const STORAGE_KEYS = {
  preferences: "chukohash_preferences",
  activeSession: "chukohash_active_session",
  sessionActive: "chukohash_session_active",
  history: "chukohash_history",
  logs: "chukohash_logs",
  visualState: "chukohash_visual_state",
} as const;

/** Legacy keys migrated on first load. */
export const LEGACY_KEYS = {
  selectedCoin: "nexahash_selected_coin",
  speedTier: "nexahash_speed_tier",
  sessionActive: "nexahash_session_active",
  currentSession: "nexahash_current_session",
  history: "nexahash_history",
} as const;
