"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { getTierVolatilityConfig } from "../config/volatility";
import {
  brownianStep,
  formatEstHrCrypto,
  formatEstHrUsd,
  idleEstDisplay,
  initEstVolatilityState,
  type EstVolatilityState,
} from "../utils/volatilityEngine";
import { loadVisualState, patchVisualState } from "../storage/persistence";

export interface EstVolatilityDOMRefs {
  estEarnings: RefObject<HTMLElement | null>;
  estUsd: RefObject<HTMLElement | null>;
}

interface UseVisualVolatilityOptions {
  isActive: boolean;
  speedTier: number;
  coinPrice: number;
  refs: EstVolatilityDOMRefs;
}

function writeEstDom(refs: EstVolatilityDOMRefs, estCrypto: string, estUsd: string) {
  if (refs.estEarnings.current) refs.estEarnings.current.textContent = estCrypto;
  if (refs.estUsd.current) refs.estUsd.current.textContent = estUsd;
}

/**
 * Visual-only EST/HR volatility (Phase 3).
 * Driven synchronously on each second increment of the session clock.
 */
export function useVisualVolatility({
  isActive,
  speedTier,
  coinPrice,
  refs,
}: UseVisualVolatilityOptions): {
  stopImmediately: () => void;
  step: (elapsedSeconds: number) => void;
} {
  const domRefsRef = useRef(refs);
  domRefsRef.current = refs;

  const stateRef = useRef<EstVolatilityState>(
    initEstVolatilityState(getTierVolatilityConfig(speedTier))
  );

  const activeRef = useRef(isActive);
  const tierRef = useRef(speedTier);
  const coinPriceRef = useRef(coinPrice);

  activeRef.current = isActive;
  tierRef.current = speedTier;
  coinPriceRef.current = coinPrice;

  const getRefs = () => domRefsRef.current;

  const persistState = useCallback(() => {
    patchVisualState({
      speedTier: tierRef.current,
      displayUsd: stateRef.current.displayUsd,
      targetUsd: stateRef.current.targetUsd,
    });
  }, []);

  const applyIdleNow = useCallback(() => {
    const cfg = getTierVolatilityConfig(tierRef.current);
    const idle = idleEstDisplay(cfg, coinPriceRef.current);
    writeEstDom(getRefs(), idle.estCrypto, idle.estUsd);
  }, []);

  const stopImmediately = useCallback(() => {
    activeRef.current = false;
    applyIdleNow();
  }, [applyIdleNow]);

  const step = useCallback((elapsedSeconds: number) => {
    if (!activeRef.current) return;
    const cfg = getTierVolatilityConfig(tierRef.current);
    
    // Apply single Brownian drift step
    const nextVal = brownianStep(
      stateRef.current.displayUsd,
      cfg.hourlyUsdBase,
      cfg.volatilityMin,
      cfg.volatilityMax
    );
    stateRef.current.displayUsd = nextVal;
    stateRef.current.targetUsd = nextVal;

    writeEstDom(
      getRefs(),
      formatEstHrCrypto(stateRef.current.displayUsd, coinPriceRef.current),
      formatEstHrUsd(stateRef.current.displayUsd)
    );
    
    persistState();
  }, [persistState]);

  useEffect(() => {
    const startEngine = () => {
      const cfg = getTierVolatilityConfig(tierRef.current);
      const restoredState = loadVisualState();
      stateRef.current = initEstVolatilityState(
        cfg,
        restoredState && restoredState.speedTier === tierRef.current
          ? { displayUsd: restoredState.displayUsd, targetUsd: restoredState.targetUsd }
          : undefined
      );

      writeEstDom(
        getRefs(),
        formatEstHrCrypto(stateRef.current.displayUsd, coinPriceRef.current),
        formatEstHrUsd(stateRef.current.displayUsd)
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
  }, [isActive, speedTier, coinPrice, applyIdleNow]);

  return { stopImmediately, step };
}
