"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMiningStore, DEFAULT_BTC_SETTLEMENTS } from "../store/useMiningStore";
import { MINING_PLANS, MiningMode } from "../config/mining";
import { COINS, parseCoinPrice } from "../config/coins";
import { getTierVolatilityConfig } from "../config/volatility";
import { getTierHashrateConfig } from "../config/hashrate";
import { idleEstDisplay } from "../utils/volatilityEngine";
import { idleHashrateDisplay } from "../utils/hashrateEngine";
import { useVisualVolatility } from "../hooks/useVisualVolatility";
import { useHashrateEngine } from "../hooks/useHashrateEngine";
import { useLiveLog } from "../hooks/useLiveLog";
import { formatUsd, formatTime, formatPercentage } from "../utils/formatting";
import WithdrawalModal from "../components/WithdrawalModal";
import UnpaidBanner from "../components/UnpaidBanner";
import PlanEmailModal from "../components/PlanEmailModal";

function playCompletionChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.95);
  } catch {}
}

function notifyMiningCompletion(coinTicker: string, amount: number) {
  playCompletionChime();
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("Mining Session Complete! ⚡", {
        body: `Mined ${amount.toFixed(8)} ${coinTicker}! Ready for payout withdrawal.`,
        icon: "/assets/icons/btc.svg",
      });
    } catch {}
  }
}

export default function DashboardPage() {
  const router = useRouter();

  const isMining = useMiningStore((s) => s.isMining);
  const selectedCoin = useMiningStore((s) => s.selectedCoin);
  const speedTier = useMiningStore((s) => s.speedTier);
  const currentSession = useMiningStore((s) => s.currentSession);
  const userEmail = useMiningStore((s) => s.userEmail);
  const setUserEmail = useMiningStore((s) => s.setUserEmail);
  const isPlanPaid = useMiningStore((s) => s.isPlanPaid);
  const history = useMiningStore((s) => s.history);

  const displayHistory = useMemo(() => {
    return history && history.length > 0 ? history : DEFAULT_BTC_SETTLEMENTS;
  }, [history]);

  const setSelectedCoin = useMiningStore((s) => s.setSelectedCoin);
  const setSpeedTier = useMiningStore((s) => s.setSpeedTier);
  const startMining = useMiningStore((s) => s.startMining);
  const stopMining = useMiningStore((s) => s.stopMining);
  const restoreSession = useMiningStore((s) => s.restoreSession);
  const clearHistory = useMiningStore((s) => s.clearHistory);

  const [miningButtonActive, setMiningButtonActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"settlements" | "logs">("settlements");
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [coinFilter, setCoinFilter] = useState<"unlocked" | "all">("unlocked");
  const [emailInputOpen, setEmailInputOpen] = useState(false);
  const [tempEmail, setTempEmail] = useState("");

  const animationFrameIdRef = useRef<number | null>(null);
  const isMiningLiveRef = useRef(false);
  const lastProcessedSecondRef = useRef<number>(-1);
  const displayCoinRef = useRef<number>(0);
  const displayUsdRef = useRef<number>(0);
  const lastTextWriteRef = useRef<number>(0);

  // Active plan & coin
  const sessionLocked = miningButtonActive && !!currentSession;
  const activeCoin = sessionLocked ? currentSession!.selectedCoin : selectedCoin;
  const activeSpeed = sessionLocked ? currentSession!.speedTier : speedTier;
  const activePlan = MINING_PLANS[Math.min(activeSpeed, MINING_PLANS.length - 1)] || MINING_PLANS[1];

  // DOM Refs for high-performance direct manipulation (60fps rAF loop)
  const minedAmountRef = useRef<HTMLSpanElement>(null);
  const minedUsdRef = useRef<HTMLDivElement>(null);
  const sessionTimeRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const progressPctRef = useRef<HTMLSpanElement>(null);

  const hashrateRef = useRef<HTMLDivElement>(null);
  const hashrateUnitRef = useRef<HTMLDivElement>(null);
  const estEarningsRef = useRef<HTMLDivElement>(null);
  const estUsdRef = useRef<HTMLDivElement>(null);
  const liveLogRef = useRef<HTMLDivElement>(null);

  // Auto fallback if selectedCoin is not allowed on active plan
  useEffect(() => {
    if (miningButtonActive || isMining) return;
    if (!activePlan.allowedCoins.includes(selectedCoin)) {
      setSelectedCoin(activePlan.allowedCoins[0]);
    }
  }, [activePlan, selectedCoin, miningButtonActive, isMining, setSelectedCoin]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    setMiningButtonActive(isMining);
  }, [isMining]);

  const currentCoinData = COINS.find((c) => c.id === activeCoin) || COINS[0];
  const coinPriceNum = parseCoinPrice(currentCoinData.price);

  const idleEst = useMemo(
    () => idleEstDisplay(getTierVolatilityConfig(activeSpeed), coinPriceNum),
    [activeSpeed, coinPriceNum]
  );

  const idleHashrate = useMemo(
    () => idleHashrateDisplay(getTierHashrateConfig(activeSpeed)),
    [activeSpeed]
  );

  const { stopImmediately: stopVolatilityImmediately, step: stepVolatility } = useVisualVolatility({
    isActive: sessionLocked,
    speedTier: activeSpeed,
    coinPrice: coinPriceNum,
    refs: {
      estEarnings: estEarningsRef,
      estUsd: estUsdRef,
    },
  });

  const { stopImmediately: stopHashrateImmediately, step: stepHashrate } = useHashrateEngine({
    isActive: sessionLocked,
    speedTier: activeSpeed,
    refs: {
      hashrate: hashrateRef,
      hashrateUnit: hashrateUnitRef,
    },
  });

  useLiveLog({
    containerRef: liveLogRef,
    isActive: sessionLocked,
    speedTier: activeSpeed,
  });

  const resetMiningDisplay = useCallback((coinId: string) => {
    const coinTicker = COINS.find((c) => c.id === coinId)?.ticker || coinId.toUpperCase();
    const halfUsd = activePlan.targetUsd * 0.5;
    const halfCoin = coinPriceNum > 0 ? halfUsd / coinPriceNum : 0;
    const halfDurationMs = Math.floor(activePlan.durationMs * 0.5);

    displayCoinRef.current = halfCoin;
    displayUsdRef.current = halfUsd;
    lastTextWriteRef.current = 0;

    if (minedAmountRef.current) minedAmountRef.current.textContent = halfCoin.toFixed(8);
    const tickerEl = document.getElementById("minedTicker");
    if (tickerEl) tickerEl.textContent = coinTicker;
    if (minedUsdRef.current) minedUsdRef.current.textContent = formatUsd(halfUsd);
    if (sessionTimeRef.current) sessionTimeRef.current.textContent = formatTime(halfDurationMs);
    if (progressFillRef.current) progressFillRef.current.style.transform = "scaleX(0.5)";
    if (progressPctRef.current) progressPctRef.current.textContent = formatPercentage(50);
  }, [activePlan, coinPriceNum]);

  // RequestAnimationFrame tick loop
  useEffect(() => {
    animationFrameIdRef.current = null;

    const tick = () => {
      const coinTicker = COINS.find((c) => c.id === activeCoin)?.ticker || activeCoin.toUpperCase();

      if (!currentSession) {
        resetMiningDisplay(activeCoin);
        return;
      }

      const now = Date.now();
      const elapsedMs = now - currentSession.startTimestamp;
      const progress = Math.min(Math.max(elapsedMs / currentSession.durationMs, 0), 1);
      const minedUsd = currentSession.targetUsd * progress;
      const minedCoin = minedUsd / currentSession.baseCoinPrice;

      if (minedAmountRef.current && (now - lastTextWriteRef.current > 50 || progress >= 1)) {
        minedAmountRef.current.textContent = minedCoin.toFixed(8);
        lastTextWriteRef.current = now;
      }

      const tickerEl = document.getElementById("minedTicker");
      if (tickerEl && tickerEl.textContent !== coinTicker) {
        tickerEl.textContent = coinTicker;
      }

      if (minedUsdRef.current) {
        minedUsdRef.current.textContent = formatUsd(minedUsd);
      }

      if (sessionTimeRef.current) {
        sessionTimeRef.current.textContent = formatTime(elapsedMs);
      }

      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${progress})`;
      }

      if (progressPctRef.current) {
        progressPctRef.current.textContent = formatPercentage(progress * 100);
      }

      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      if (elapsedSeconds !== lastProcessedSecondRef.current && isMiningLiveRef.current) {
        stepVolatility(elapsedSeconds);
        stepHashrate(elapsedSeconds);
        lastProcessedSecondRef.current = elapsedSeconds;
      }

      if (progress >= 1) {
        isMiningLiveRef.current = false;
        const coinData = COINS.find((c) => c.id === currentSession.selectedCoin) || COINS[0];
        const finalCoinAmount = currentSession.targetUsd / currentSession.baseCoinPrice;

        notifyMiningCompletion(coinData.ticker, finalCoinAmount);

        const withdrawalPayload = {
          sessionId: currentSession.sessionId,
          coinId: currentSession.selectedCoin,
          coinName: coinData.name,
          coinTicker: coinData.ticker,
          minedAmount: finalCoinAmount,
          minedUsd: currentSession.targetUsd,
          speedTier: currentSession.speedTier,
        };

        useMiningStore.getState().openWithdrawalModal(withdrawalPayload);
        stopMining(true);
      } else if (isMiningLiveRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(tick);
      }
    };

    isMiningLiveRef.current = !!(isMining && currentSession);
    if (isMiningLiveRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(tick);
    } else {
      tick();
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [isMining, currentSession, activeCoin, stopMining, resetMiningDisplay, stepVolatility, stepHashrate]);

  const handleMineBtnClick = useCallback(() => {
    const { isMining: freshIsMining, currentSession: freshSession, selectedCoin: freshCoin, isPlanPaid: freshIsPaid } = useMiningStore.getState();

    if (!freshIsMining && !freshIsPaid) {
      setIsCheckoutOpen(true);
      return;
    }

    if (freshIsMining || miningButtonActive) {
      setMiningButtonActive(false);
      isMiningLiveRef.current = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      const coinId = freshSession?.selectedCoin ?? freshCoin ?? selectedCoin;
      stopVolatilityImmediately();
      stopHashrateImmediately();

      if (freshSession) {
        const completedAt = Date.now();
        const elapsedMs = completedAt - freshSession.startTimestamp;
        const progress = Math.min(Math.max(elapsedMs / freshSession.durationMs, 0), 1);
        const minedUsd = freshSession.targetUsd * progress;
        const minedCoin = minedUsd / freshSession.baseCoinPrice;
        const coinData = COINS.find((c) => c.id === freshSession.selectedCoin) || COINS[0];

        const withdrawalPayload = {
          sessionId: freshSession.sessionId,
          coinId: freshSession.selectedCoin,
          coinName: coinData.name,
          coinTicker: coinData.ticker,
          minedAmount: minedCoin,
          minedUsd: minedUsd,
          speedTier: freshSession.speedTier,
        };

        useMiningStore.getState().openWithdrawalModal(withdrawalPayload);
      }

      resetMiningDisplay(coinId);
      stopMining(true);
    } else {
      setMiningButtonActive(true);
      isMiningLiveRef.current = true;
      lastProcessedSecondRef.current = -1;
      const price = parseCoinPrice(COINS.find((c) => c.id === selectedCoin)?.price || "0");
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
      startMining(price);
    }
  }, [miningButtonActive, selectedCoin, stopVolatilityImmediately, stopHashrateImmediately, resetMiningDisplay, stopMining, startMining]);

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempEmail.trim()) {
      setUserEmail(tempEmail.trim());
      setEmailInputOpen(false);
    }
  };

  const displayedCoins = useMemo(() => {
    if (coinFilter === "unlocked") {
      return COINS.filter((c) => activePlan.allowedCoins.includes(c.id));
    }
    return COINS;
  }, [coinFilter, activePlan]);

  return (
    <div className="fintech-dashboard-wrapper">
      <div className="fintech-dashboard-container">
        {/* ─── 1. TOP FINANCIAL HEADER & ACCOUNT RIBBON ─── */}
        <header className="fintech-account-header">
          <div className="fah-left">
            <div className="fah-user-info">
              <span className="fah-account-label">ACCOUNT / CLOUD NODE</span>
              {emailInputOpen ? (
                <form onSubmit={handleSaveEmail} className="fah-email-form">
                  <input
                    type="email"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    placeholder="Enter email..."
                    className="fah-email-input"
                    autoFocus
                  />
                  <button type="submit" className="fah-email-save">Save</button>
                  <button type="button" onClick={() => setEmailInputOpen(false)} className="fah-email-cancel">✕</button>
                </form>
              ) : (
                <div className="fah-email-row" onClick={() => { setTempEmail(userEmail || ""); setEmailInputOpen(true); }}>
                  <span className="fah-email-text">{userEmail || "Connect Email Address"}</span>
                  <button className="fah-edit-btn" aria-label="Edit Email">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="fah-right">
            <Link href="/" className="fah-exit-btn">
              <span>← Plans</span>
            </Link>
          </div>
        </header>

        {/* ─── ACTIVATION BANNER IF UNPAID ─── */}
        {!isPlanPaid && (
          <div className="fintech-activation-bar">
            <div className="fab-info">
              <span className="fab-badge">NODE RESERVED</span>
              <span className="fab-text">
                <strong>{activePlan.name} (${activePlan.priceUsd})</strong> node is reserved. Complete payment to activate remote mining.
              </span>
            </div>
            <button className="fab-btn" onClick={() => setIsCheckoutOpen(true)}>
              Activate Node (${activePlan.priceUsd}) →
            </button>
          </div>
        )}

        {/* ─── 2. THE FIRST THING: MAIN WALLET / MINED BALANCE CARD (FINTECH HERO CARD) ─── */}
        <div className="fintech-card">
          <div className="fc-gradient-overlay" />

          {/* Balance Display */}
          <div className="fc-balance-block">
            <div className="fc-balance-caption">Current Mined Balance</div>
            <div className="fc-crypto-display">
              <span id="minedAmount" ref={minedAmountRef} className="fc-crypto-value">
                {coinPriceNum > 0 ? (activePlan.targetUsd * 0.5 / coinPriceNum).toFixed(8) : "0.00000000"}
              </span>
              <span id="minedTicker" className="fc-crypto-ticker">
                {currentCoinData.ticker}
              </span>
            </div>
            <div id="minedUsd" ref={minedUsdRef} className="fc-usd-value">
              {formatUsd(activePlan.targetUsd * 0.5)}
            </div>
          </div>

          {/* 7-Day Target Progress */}
          <div className="fc-progress-section">
            <div className="fc-progress-labels">
              <span className="fc-prog-left">
                7-Day Contract Target: <strong style={{ color: "#22c55e" }}>${activePlan.targetUsd.toLocaleString()} USD</strong>
              </span>
              <span id="progressPct" ref={progressPctRef} className="fc-prog-pct">
                50%
              </span>
            </div>
            <div className="fc-progress-track">
              <div id="progressFill" ref={progressFillRef} className="fc-progress-fill" style={{ transform: "scaleX(0.5)" }} />
            </div>
          </div>

          {/* Main Financial CTA Button */}
          <div className="fc-cta-wrap">
            <button
              id="mineBtn"
              className={`fc-mine-button ${miningButtonActive ? "stop" : "start"}`}
              onClick={handleMineBtnClick}
            >
              {miningButtonActive ? (
                <span>PAUSE & WITHDRAW MINING</span>
              ) : (
                <span>START CLOUD MINING</span>
              )}
            </button>
          </div>

          {/* Key Metrics Triad right in the card */}
          <div className="fc-metrics-row">
            <div className="fc-metric-item">
              <span className="fcm-label">Cloud Hashrate</span>
              <div className="fcm-val">
                <span id="hashrate" ref={hashrateRef} suppressHydrationWarning>
                  {sessionLocked ? null : idleHashrate.hashrate}
                </span>{" "}
                <span id="hashrateUnit" ref={hashrateUnitRef} suppressHydrationWarning>
                  {sessionLocked ? null : idleHashrate.unit}
                </span>
              </div>
            </div>
            <div className="fc-metric-item">
              <span className="fcm-label">Elapsed Time</span>
              <div id="sessionTime" ref={sessionTimeRef} className="fcm-val">
                {formatTime(Math.floor(activePlan.durationMs * 0.5))}
              </div>
            </div>
            <div className="fc-metric-item">
              <span className="fcm-label">Daily Return (10×)</span>
              <div className="fcm-val green-text">
                +${Math.round(activePlan.dailyUsd)} / day
              </div>
              {/* Invisible hidden volatile refs preserved for engine calculations */}
              <div style={{ display: "none" }}>
                <span id="estEarnings" ref={estEarningsRef} />
                <span id="estUsd" ref={estUsdRef} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. HARDWARE & CLUSTER NODES BENTO ─── */}
        <section className="fintech-section-bento">
          <div className="bento-tile">
            <div className="bento-content">
              <span className="bento-label">Allocated Rig</span>
              <span className="bento-value">{activePlan.rigHardware}</span>
            </div>
          </div>
          <div className="bento-tile">
            <div className="bento-content">
              <span className="bento-label">Datacenter Cluster</span>
              <span className="bento-value">Cluster US-East (GovCloud Tier 4)</span>
            </div>
          </div>
          <div className="bento-tile">
            <div className="bento-content">
              <span className="bento-label">Guaranteed Output</span>
              <span className="bento-value">${activePlan.targetUsd.toLocaleString()} (10× Payout)</span>
            </div>
          </div>
          <div className="bento-tile">
            <div className="bento-content">
              <span className="bento-label">Device Load</span>
              <span className="bento-value">0% · Zero Battery or CPU Usage</span>
            </div>
          </div>
        </section>

        {/* ─── 4. ASSET / TOKEN SELECTION (UN-SLOPPED, CLEAN FINTECH FORMAT) ─── */}
        <section className="fintech-assets-section">
          <div className="fas-header">
            <div className="fas-header-left">
              <h3 className="fas-title">Select Mining Asset</h3>
              <span className="fas-subtitle">
                Current: <strong style={{ color: "#ffae19" }}>{currentCoinData.name} ({currentCoinData.ticker})</strong> · Price: {currentCoinData.price}
              </span>
            </div>
            <div className="fas-filter-pills">
              <button
                className={`fas-pill ${coinFilter === "unlocked" ? "active" : ""}`}
                onClick={() => setCoinFilter("unlocked")}
              >
                Plan Tokens ({activePlan.allowedCoins.length})
              </button>
              <button
                className={`fas-pill ${coinFilter === "all" ? "active" : ""}`}
                onClick={() => setCoinFilter("all")}
              >
                All Supported ({COINS.length})
              </button>
            </div>
          </div>

          <div className="fas-grid">
            {displayedCoins.map((coin) => {
              const isLocked = !activePlan.allowedCoins.includes(coin.id);
              const isSelected = activeCoin === coin.id;
              const reqPlan = MINING_PLANS.find((p) => p.allowedCoins.includes(coin.id));

              return (
                <div
                  key={coin.id}
                  className={`fas-card ${isSelected ? "selected" : ""} ${isLocked ? "locked" : ""}`}
                  onClick={() => {
                    if (miningButtonActive) return;
                    if (isLocked && reqPlan) {
                      setSpeedTier(reqPlan.tierIndex);
                    }
                    setSelectedCoin(coin.id);
                  }}
                >
                  <div className="fas-card-top">
                    <div className="fas-coin-badge">
                      <img
                        src={coin.icon || `/assets/icons/${coin.id}.svg`}
                        alt={coin.ticker}
                        className="fas-coin-icon"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div>
                        <div className="fas-coin-ticker">{coin.ticker}</div>
                        <div className="fas-coin-name">{coin.name}</div>
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="fas-active-tag">Active</span>
                    ) : isLocked ? (
                      <span className="fas-locked-tag">${reqPlan?.priceUsd || "300"}+</span>
                    ) : (
                      <span className="fas-select-tag">Select</span>
                    )}
                  </div>

                  <div className="fas-card-bottom">
                    <span className="fas-coin-price">{coin.price}</span>
                    <span className={`fas-coin-change ${coin.up ? "up" : "down"}`}>{coin.change}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── 5. SETTLEMENTS & ACTIVITY (CLEAN FINTECH TABS - PLACED AFTER MINING ASSETS) ─── */}
        <section className="fintech-history-section">
          <div className="fhs-tab-bar">
            <button
              className={`fhs-tab ${activeTab === "settlements" ? "active" : ""}`}
              onClick={() => setActiveTab("settlements")}
            >
              Payout Settlements ({displayHistory.length})
            </button>
            <button
              className={`fhs-tab ${activeTab === "logs" ? "active" : ""}`}
              onClick={() => setActiveTab("logs")}
            >
              Live Activity
            </button>
          </div>

          <div className="fhs-tab-content">
            {activeTab === "settlements" ? (
              <div className="fhs-settlements-panel">
                <div className="fhs-list">
                  {displayHistory.map((sessionItem, index) => (
                    <div key={sessionItem.sessionId + index} className="fhs-row">
                      <div className="fhs-row-left">
                        <img
                          src="https://cdn.brandfetch.io/idkbqeYUg6/theme/dark/symbol.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q"
                          alt="BTC"
                          className="fhs-coin-icon"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <div className="fhs-row-details">
                          <span className="fhs-row-title">{sessionItem.coin} Cloud Settlement</span>
                          <span className="fhs-row-meta">
                            Session: <code>{sessionItem.sessionId}</code> · {sessionItem.date || "Completed"}
                          </span>
                        </div>
                      </div>
                      <div className="fhs-row-right">
                        <span className="fhs-row-amount">+{sessionItem.amount.toFixed(8)} {sessionItem.coin}</span>
                        <span className="fhs-row-usd">
                          {sessionItem.completedUsd ? `≈ $${sessionItem.completedUsd.toLocaleString()} USD` : "Settled"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="fhs-footer">
                  <button className="fhs-clear-btn" onClick={clearHistory}>
                    Clear Settlement History
                  </button>
                </div>
              </div>
            ) : (
              <div className="fhs-logs-panel">
                <div className="fhs-logs-header">
                  <div className="fhs-lh-left">
                    <span className="fhs-pulse-dot" />
                    <span>Live Mining Activity Stream</span>
                  </div>
                  <span className="fhs-lh-right">Active Connection</span>
                </div>
                <div className="live-log fhs-log-container" id="liveLog" ref={liveLogRef} />
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ─── PLAN SWITCH MODAL (CLEAN BOTTOM-SHEET / MODAL) ─── */}
      {isPlanModalOpen && (
        <div className="fintech-modal-overlay" onClick={() => setIsPlanModalOpen(false)}>
          <div className="fintech-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="fmb-header">
              <h3>Switch Cloud Mining Plan</h3>
              <button className="fmb-close" onClick={() => setIsPlanModalOpen(false)}>✕</button>
            </div>
            <p className="fmb-desc">
              Select your desired datacenter cluster tier. Upgrades take effect immediately on your next or current session.
            </p>
            <div className="fmb-plans-list">
              {MINING_PLANS.map((plan) => {
                const isCurrent = activePlan.tierIndex === plan.tierIndex;
                return (
                  <div
                    key={plan.id}
                    className={`fmb-plan-card ${isCurrent ? "current" : ""}`}
                    onClick={() => {
                      if (miningButtonActive) return;
                      setSpeedTier(plan.tierIndex);
                      setIsPlanModalOpen(false);
                    }}
                  >
                    <div className="fmb-card-header">
                      <span className="fmb-badge">{plan.badge}</span>
                      <span className="fmb-price">${plan.priceUsd}</span>
                    </div>
                    <div className="fmb-plan-name">{plan.name}</div>
                    <div className="fmb-plan-yield">
                      Mines <strong>${plan.targetUsd.toLocaleString()}</strong> in 7 Days (10× Return)
                    </div>
                    <div className="fmb-specs">
                      <span>{plan.rigHardware}</span> · <span style={{ color: "#ffae19" }}>{plan.hashrateDisplay}</span>
                    </div>
                    {isCurrent ? (
                      <div className="fmb-status-current">✓ Active Plan</div>
                    ) : (
                      <button className="fmb-switch-action">Select Plan →</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <WithdrawalModal />
      <UnpaidBanner />
      <PlanEmailModal
        plan={activePlan}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />
    </div>
  );
}
