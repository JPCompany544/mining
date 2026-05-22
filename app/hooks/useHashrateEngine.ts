"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { getTierHashrateConfig } from "../config/hashrate";
import {
  formatHashrateValue,
  hashrateBrownianStep,
  idleHashrateDisplay,
  initHashrateState,
  type HashrateDriftState,
} from "../utils/hashrateEngine";
import { loadVisualState, patchVisualState } from "../storage/persistence";

export interface HashrateDOMRefs {
  hashrate: RefObject<HTMLElement | null>;
  hashrateUnit: RefObject<HTMLElement | null>;
}

interface UseHashrateEngineOptions {
  isActive: boolean;
  speedTier: number;
  refs: HashrateDOMRefs;
}

function writeHashrateDom(
  refs: HashrateDOMRefs,
  value: string,
  unit: string
): void {
  if (refs.hashrate.current) refs.hashrate.current.textContent = value;
  if (refs.hashrateUnit.current) refs.hashrateUnit.current.textContent = unit;
}

/**
 * Visual-only hashrate drift engine (Phase 4).
 * Driven synchronously on each second increment of the session clock.
 */
export function useHashrateEngine({
  isActive,
  speedTier,
  refs,
}: UseHashrateEngineOptions): {
  stopImmediately: () => void;
  step: (elapsedSeconds: number) => void;
} {
  const domRefsRef = useRef(refs);
  domRefsRef.current = refs;

  const stateRef = useRef<HashrateDriftState>(
    initHashrateState(getTierHashrateConfig(speedTier))
  );

  const activeRef = useRef(isActive);
  const tierRef = useRef(speedTier);

  activeRef.current = isActive;
  tierRef.current = speedTier;

  const getRefs = () => domRefsRef.current;

  const persistState = useCallback(() => {
    patchVisualState({
      speedTier: tierRef.current,
      displayHashrate: stateRef.current.displayHashrate,
      targetHashrate: stateRef.current.targetHashrate,
    });
  }, []);

  const applyIdleNow = useCallback(() => {
    const cfg = getTierHashrateConfig(tierRef.current);
    const idle = idleHashrateDisplay(cfg);
    writeHashrateDom(getRefs(), idle.hashrate, idle.unit);
  }, []);

  const stopImmediately = useCallback(() => {
    activeRef.current = false;
    applyIdleNow();
  }, [applyIdleNow]);

  const step = useCallback((elapsedSeconds: number) => {
    if (!activeRef.current) return;
    const cfg = getTierHashrateConfig(tierRef.current);
    
    // Apply single Brownian drift step
    const nextVal = hashrateBrownianStep(stateRef.current.displayHashrate, cfg);
    stateRef.current.displayHashrate = nextVal;
    stateRef.current.targetHashrate = nextVal;

    writeHashrateDom(
      getRefs(),
      formatHashrateValue(stateRef.current.displayHashrate, cfg),
      cfg.unit
    );
    
    persistState();
  }, [persistState]);

  useEffect(() => {
    const startEngine = () => {
      const cfg = getTierHashrateConfig(tierRef.current);
      const restoredState = loadVisualState();
      stateRef.current = initHashrateState(
        cfg,
        restoredState && restoredState.speedTier === tierRef.current
          ? {
              displayHashrate: restoredState.displayHashrate,
              targetHashrate: restoredState.targetHashrate,
            }
          : undefined
      );

      writeHashrateDom(
        getRefs(),
        formatHashrateValue(stateRef.current.displayHashrate, cfg),
        cfg.unit
      );
    };

    const stopEngine = () => {
      applyIdleNow();
    };

    if (isActive) {
      startEngine();
    } else {
      stopEngine();
    }
  }, [isActive, speedTier, applyIdleNow]);

  return { stopImmediately, step };
}
