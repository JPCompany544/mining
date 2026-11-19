"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useMiningStore } from "../store/useMiningStore";
import { COINS } from "../config/coins";
import { PastSession } from "../config/mining";
import Portal from "./Portal";

export default function WithdrawalModal() {
  const isOpen = useMiningStore((s) => s.isWithdrawalModalOpen);
  const session = useMiningStore((s) => s.withdrawalSession);
  const close = useMiningStore((s) => s.closeWithdrawalModal);
  const removeUnpaidSession = useMiningStore((s) => s.removeUnpaidSession);

  // Form states
  const [walletAddress, setWalletAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [memoTag, setMemoTag] = useState("");
  const [addressError, setAddressError] = useState("");
  const [amountError, setAmountError] = useState("");

  // Submission / success state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    amount: string;
    address: string;
    coinTicker: string;
    usdValue: string;
    txId: string;
  } | null>(null);

  // Animation states
  const [mounted, setMounted] = useState(false);
  const [animateClass, setAnimateClass] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Active coin data
  const coinData = useMemo(() => {
    if (!session) return COINS[0];
    return COINS.find((c) => c.id === session.coinId) || {
      id: session.coinId,
      name: session.coinName,
      ticker: session.coinTicker,
      price: "$0.00",
      change: "+0.0%",
      up: true,
      icon: `/assets/icons/${session.coinId}.svg`,
    };
  }, [session]);

  const maxCoinAmount = session?.minedAmount ? Number(session.minedAmount.toFixed(8)) : 0;
  const maxUsdValue = session?.minedUsd ? session.minedUsd : 0;

  // Initialize amount to max when modal opens
  useEffect(() => {
    if (isOpen && session) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setAnimateClass(true));
      setWithdrawAmount(session.minedAmount.toFixed(8));
      setWalletAddress("");
      setMemoTag("");
      setAddressError("");
      setAmountError("");
      setIsSuccess(false);
      setIsSubmitting(false);
      setSubmittedData(null);
      return () => cancelAnimationFrame(frame);
    } else {
      setAnimateClass(false);
      const timer = setTimeout(() => setMounted(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, session]);

  // Handle setting MAX amount
  const handleSetMax = () => {
    if (session) {
      setWithdrawAmount(session.minedAmount.toFixed(8));
      setAmountError("");
    }
  };

  // Live calculated USD equivalent
  const calculatedUsd = useMemo(() => {
    const parsedAmount = parseFloat(withdrawAmount) || 0;
    if (maxCoinAmount > 0 && maxUsdValue > 0) {
      return (parsedAmount * (maxUsdValue / maxCoinAmount)).toFixed(2);
    }
    const unitPrice = parseFloat(coinData.price.replace(/[^0-9.]/g, "")) || 0;
    return (parsedAmount * unitPrice).toFixed(2);
  }, [withdrawAmount, maxCoinAmount, maxUsdValue, coinData]);

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    const trimmedAddress = walletAddress.trim();
    if (!trimmedAddress) {
      setAddressError("Please enter your destination wallet address");
      hasError = true;
    } else if (trimmedAddress.length < 16) {
      setAddressError("Address appears too short for a valid blockchain wallet");
      hasError = true;
    } else {
      setAddressError("");
    }

    const parsedAmount = parseFloat(withdrawAmount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError("Please enter a valid amount to withdraw");
      hasError = true;
    } else if (parsedAmount > maxCoinAmount * 1.0001) {
      setAmountError(`Amount cannot exceed available mined balance (${maxCoinAmount.toFixed(8)})`);
      hasError = true;
    } else {
      setAmountError("");
    }

    if (hasError || !session) return;

    setIsSubmitting(true);

    // Generate simulated tx hash
    const txChars = "0123456789abcdef";
    const randomHex = Array.from({ length: 16 }, () => txChars[Math.floor(Math.random() * txChars.length)]).join("");
    const generatedTxId = `0x${randomHex}...`;

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setSubmittedData({
        amount: parsedAmount.toFixed(8),
        address: trimmedAddress,
        coinTicker: session.coinTicker,
        usdValue: calculatedUsd,
        txId: generatedTxId,
      });

      // Save settlement to history in Zustand store
      const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const newHistoryEntry: PastSession = {
        sessionId: session.sessionId,
        coin: session.coinTicker,
        amount: parsedAmount,
        date: today,
        speedTier: session.speedTier,
        completedUsd: parseFloat(calculatedUsd),
        startedAt: Date.now() - 3600000,
        completedAt: Date.now(),
        status: "completed",
      };

      const currentHistory = useMiningStore.getState().history;
      useMiningStore.setState({
        history: [newHistoryEntry, ...currentHistory.filter((h) => h.sessionId !== session.sessionId)],
      });

      removeUnpaidSession(session.sessionId);
    }, 1200);
  };

  const handleModalClose = () => {
    close();
  };

  if (!mounted || !session) return null;

  return (
    <Portal>
      <div
        className={`modal-overlay ${animateClass ? "show" : ""}`}
        onClick={handleModalClose}
        style={{
          opacity: animateClass ? 1 : 0,
          transition: "opacity 0.25s ease-out",
        }}
      >
        <div
          ref={modalRef}
          className="modal clean-withdrawal-modal"
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: animateClass ? "scale(1) translateY(0)" : "scale(0.96) translateY(18px)",
            transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out",
            opacity: animateClass ? 1 : 0,
          }}
        >
          <button className="clean-modal-close" onClick={handleModalClose} aria-label="Close modal">
            ✕
          </button>

          {!isSuccess ? (
            <div className="wm-content">
              {/* Header */}
              <div className="wm-header">
                <span className="wm-badge">WITHDRAWAL REQUEST</span>
                <h3 className="wm-title">Withdraw Mining Earnings</h3>
                <p className="wm-desc">
                  Transfer your mined cryptocurrency directly to your personal wallet address.
                </p>
              </div>

              {/* Mined Balance Banner */}
              <div className="wm-balance-banner">
                <div className="wmb-left">
                  <img
                    src={coinData.icon}
                    alt={coinData.ticker}
                    className="wmb-coin-icon"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="wmb-coin-details">
                    <span className="wmb-label">Available Balance</span>
                    <span className="wmb-coin-amount">
                      {maxCoinAmount.toFixed(8)} {session.coinTicker}
                    </span>
                  </div>
                </div>
                <div className="wmb-right">
                  <span className="wmb-usd">≈ ${maxUsdValue.toFixed(2)} USD</span>
                  <span className="wmb-session-tag">Session: {session.sessionId}</span>
                </div>
              </div>

              {/* Withdrawal Form */}
              <form onSubmit={handleSubmit} className="wm-form">
                {/* 1. Amount to Withdraw */}
                <div className="wm-field-group">
                  <div className="wm-field-label-row">
                    <label htmlFor="withdrawAmountInput" className="wm-label">
                      Amount to Withdraw
                    </label>
                    <span className="wm-sub-usd">≈ ${calculatedUsd} USD</span>
                  </div>
                  <div className="wm-input-wrap">
                    <input
                      id="withdrawAmountInput"
                      type="number"
                      step="any"
                      min="0"
                      max={maxCoinAmount}
                      value={withdrawAmount}
                      onChange={(e) => {
                        setWithdrawAmount(e.target.value);
                        if (amountError) setAmountError("");
                      }}
                      placeholder="0.00000000"
                      className="wm-input amount-input"
                      required
                    />
                    <div className="wm-input-suffix">
                      <span className="wm-ticker-badge">{session.coinTicker}</span>
                      <button type="button" className="wm-max-btn" onClick={handleSetMax}>
                        MAX
                      </button>
                    </div>
                  </div>
                  {amountError && <span className="wm-error-text">{amountError}</span>}
                </div>

                {/* 2. Destination Wallet Address */}
                <div className="wm-field-group">
                  <div className="wm-field-label-row">
                    <label htmlFor="destinationWalletInput" className="wm-label">
                      Destination {session.coinTicker} Wallet Address
                    </label>
                    <span className="wm-network-pill">{coinData.name} Network</span>
                  </div>
                  <div className="wm-input-wrap">
                    <input
                      id="destinationWalletInput"
                      type="text"
                      value={walletAddress}
                      onChange={(e) => {
                        setWalletAddress(e.target.value);
                        if (addressError) setAddressError("");
                      }}
                      placeholder={`Enter or paste your ${session.coinTicker} address...`}
                      className="wm-input address-input"
                      autoComplete="off"
                      spellCheck="false"
                      autoFocus
                      required
                    />
                  </div>
                  {addressError ? (
                    <span className="wm-error-text">{addressError}</span>
                  ) : (
                    <span className="wm-hint-text">
                      Make sure your address is on the {coinData.name} network to prevent fund loss.
                    </span>
                  )}
                </div>

                {/* 3. Optional Memo / Tag (for XRP/TON/BNB) */}
                {["xrp", "ton", "bnb"].includes(session.coinId.toLowerCase()) && (
                  <div className="wm-field-group">
                    <label htmlFor="memoTagInput" className="wm-label">
                      Memo / Tag <span style={{ color: "#64748b", fontWeight: 500 }}>(Optional)</span>
                    </label>
                    <input
                      id="memoTagInput"
                      type="text"
                      value={memoTag}
                      onChange={(e) => setMemoTag(e.target.value)}
                      placeholder="Enter Memo or Tag if required by your exchange"
                      className="wm-input"
                    />
                  </div>
                )}

                {/* Submit Action Button */}
                <button type="submit" className="wm-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="wm-btn-loading">
                      <span className="wm-spinner" />
                      <span>Initiating Blockchain Payout...</span>
                    </span>
                  ) : (
                    <span>CONFIRM & WITHDRAW ({withdrawAmount || "0"} {session.coinTicker}) →</span>
                  )}
                </button>
              </form>

              <div className="wm-footer-guarantee">
                <span className="wfg-dot" />
                <span>Zero withdrawal fees · Processed via automated node batching</span>
              </div>
            </div>
          ) : (
            /* ─── SUCCESS CONFIRMATION SCREEN ─── */
            <div className="wm-success-view">
              <div className="wms-icon-wrap">
                <span className="wms-check">✓</span>
              </div>

              <h3 className="wms-title">Withdrawal Initiated!</h3>
              <p className="wms-desc">
                Your withdrawal request of{" "}
                <strong style={{ color: "#ffae19" }}>
                  {submittedData?.amount} {submittedData?.coinTicker}
                </strong>{" "}
                (≈ ${submittedData?.usdValue} USD) has been broadcasted to the mining network pool.
              </p>

              <div className="wms-details-box">
                <div className="wmsd-row">
                  <span className="wmsd-label">Destination Address:</span>
                  <code className="wmsd-val address-mono">{submittedData?.address}</code>
                </div>
                <div className="wmsd-row">
                  <span className="wmsd-label">Payout Status:</span>
                  <span className="wmsd-val green-text">Processing (2 confirmations)</span>
                </div>
                <div className="wmsd-row">
                  <span className="wmsd-label">Estimated Arrival:</span>
                  <span className="wmsd-val">5–15 minutes</span>
                </div>
                <div className="wmsd-row">
                  <span className="wmsd-label">Transaction ID:</span>
                  <code className="wmsd-val mono-dim">{submittedData?.txId}</code>
                </div>
              </div>

              <button className="wm-submit-btn" onClick={handleModalClose}>
                DONE · RETURN TO DASHBOARD
              </button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
