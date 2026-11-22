"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { MiningMode } from "../config/mining";
import { useMiningStore } from "../store/useMiningStore";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { ensureMinerProfile } from "@/lib/supabase/minerProfile";
import Portal from "./Portal";

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
    name: "Tether",
    symbol: "USDT",
    network: "Tron (TRC-20)",
    address: "TNaZbM2KpomzDT9PRufvyRcFH1EBtTmgCo",
    price: 1.0,
    badge: "Recommended · Lowest Fees",
    icon: "https://cdn.brandfetch.io/idpu_p285y/theme/light/symbol.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q",
  },
  btc: {
    name: "Bitcoin",
    symbol: "BTC",
    network: "Bitcoin Network",
    address: "bc1qagvkz7ad8uqp62hwd5pztgxv82zan3wcjr2ft4",
    price: 77958,
    icon: "https://cdn.brandfetch.io/idkbqeYUg6/theme/dark/symbol.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q",
  },
  eth: {
    name: "Ethereum",
    symbol: "ETH",
    network: "Ethereum (ERC-20)",
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
    badge: "Fastest (~3 sec)",
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
  const cardRef = useRef<HTMLDivElement>(null);

  // Multi-step: 1 = Sign Up / Sign In, 2 = Deposit Payment, 3 = Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Auth states
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");

  // Payment states
  const [selectedCoin, setSelectedCoin] = useState<PaymentCoin>("usdt");
  const [copiedType, setCopiedType] = useState<"address" | "amount" | null>(null);
  const [showQr, setShowQr] = useState(false);

  // Step 3 Confirmation state
  const [verificationStage, setVerificationStage] = useState(0);

  const setUserEmail = useMiningStore((s) => s.setUserEmail);
  const setPlanPaid = useMiningStore((s) => s.setPlanPaid);
  const existingEmail = useMiningStore((s) => s.userEmail);
  const { isConfigured, siteUrl } = getSupabaseEnv();

  // Reset scroll to top when step changes
  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.scrollTop = 0;
    }
  }, [step]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Check auth and reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError("");
      setCopiedType(null);
      setShowQr(false);
      setVerificationStage(0);
      setPassword("");
      setConfirmPassword("");

      if (cardRef.current) {
        cardRef.current.scrollTop = 0;
      }

      if (isConfigured) {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
          if (data?.user) {
            setCurrentUser({ id: data.user.id, email: data.user.email });
            if (data.user.email) setEmail(data.user.email);
          } else {
            setCurrentUser(null);
            setEmail(existingEmail || "");
          }
        });
      } else {
        setEmail(existingEmail || "");
      }
    }
  }, [isOpen, existingEmail, isConfigured]);

  const activeOption = PAYMENT_OPTIONS[selectedCoin];

  // Calculate exact crypto payment amount
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
      setTimeout(() => setCopiedType(null), 2200);
    }
  }, []);

  // Handle Logged-In User Quick Proceed
  const handleProceedExisting = () => {
    if (currentUser?.email) {
      setUserEmail(currentUser.email);
    }
    setStep(2);
  };

  // Step 1: Submit Account -> Proceed to Payment
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (authMode === "register") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please check again.");
        return;
      }
    }

    // Fallback if Supabase credentials are not yet configured
    if (!isConfigured) {
      setUserEmail(cleanEmail);
      setStep(2);
      return;
    }

    setAuthLoading(true);

    try {
      const supabase = createClient();

      if (authMode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              username: username.trim() || cleanEmail.split("@")[0],
            },
            emailRedirectTo: `${siteUrl}/auth/callback`,
          },
        });

        if (signUpError) {
          const lower = signUpError.message.toLowerCase();
          if (
            lower.includes("already registered") ||
            lower.includes("already exists") ||
            lower.includes("user already registered")
          ) {
            setError(
              "An account with this email already exists. Click 'Sign In' above to log in."
            );
          } else {
            setError(signUpError.message);
          }
          setAuthLoading(false);
          return;
        }

        // Check if email already existed (anti-enumeration)
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setError(
            "An account with this email already exists. Click 'Sign In' above to log in."
          );
          setAuthLoading(false);
          return;
        }

        if (data.user) {
          await ensureMinerProfile(supabase, data.user, username.trim());
          setCurrentUser({ id: data.user.id, email: data.user.email });
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (signInError) {
          setError("Incorrect email or password. Please try again.");
          setAuthLoading(false);
          return;
        }

        if (data.user) {
          setCurrentUser({ id: data.user.id, email: data.user.email });
        }
      }

      // Success -> Advance to Step 2 Deposit Payment
      setUserEmail(cleanEmail);
      setAuthLoading(false);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setAuthLoading(false);
    }
  };

  // Step 2: "I Have Paid" -> Step 3 Confirmation & Dashboard Redirect
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
    <Portal>
      <div className="plan-modal-overlay" onClick={step === 3 ? undefined : onClose}>
        <div
          ref={cardRef}
          className="plan-modal-card checkout-card"
          onClick={(e) => e.stopPropagation()}
        >
          {step !== 3 && (
            <button className="plan-modal-close" onClick={onClose} aria-label="Close modal">
              ✕
            </button>
          )}

          {/* ─── STEP 1: CREATE ACCOUNT OR SIGN IN ─── */}
          {step === 1 && (
            <div className="checkout-step-container">
              <div className="plan-modal-header">
                <span className="plan-badge-inline">{plan.name}</span>
                <h3 className="plan-modal-title">
                  {currentUser ? "Confirm Your Plan" : "Create Your Account"}
                </h3>
                <p className="plan-modal-sub">
                  Deposit <strong style={{ color: "#ffae19" }}>${plan.priceUsd}</strong> to start earning{" "}
                  <strong style={{ color: "#22c55e" }}>${plan.targetUsd.toLocaleString()}</strong> in 7 days.
                </p>
              </div>

              {/* If user is already logged in */}
              {currentUser ? (
                <div className="plan-modal-form">
                  <div className="modal-auth-logged-card">
                    <div className="malc-top">
                      <span className="malc-badge">
                        <span className="malc-dot" />
                        LOGGED IN ACCOUNT
                      </span>
                      <button
                        type="button"
                        className="malc-switch-btn"
                        onClick={() => {
                          setCurrentUser(null);
                          setPassword("");
                          setConfirmPassword("");
                        }}
                      >
                        Use Different Account
                      </button>
                    </div>
                    <div className="malc-email">{currentUser.email}</div>
                  </div>

                  <div className="plan-modal-specs">
                    <div className="pms-row">
                      <span>Selected Plan:</span>
                      <strong>{plan.name}</strong>
                    </div>
                    <div className="pms-row">
                      <span>Plan Deposit:</span>
                      <strong style={{ color: "#ffae19" }}>${plan.priceUsd} USD</strong>
                    </div>
                    <div className="pms-row">
                      <span>Expected 7-Day Return:</span>
                      <strong style={{ color: "#22c55e" }}>${plan.targetUsd.toLocaleString()} USD</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="plan-modal-submit"
                    onClick={handleProceedExisting}
                  >
                    CONTINUE TO PAYMENT (${plan.priceUsd}) →
                  </button>
                </div>
              ) : (
                /* If user needs to register or log in */
                <div>
                  <div className="modal-auth-tabs">
                    <button
                      type="button"
                      className={`modal-auth-tab ${authMode === "register" ? "active" : ""}`}
                      onClick={() => {
                        setAuthMode("register");
                        setError("");
                      }}
                    >
                      Create Account
                    </button>
                    <button
                      type="button"
                      className={`modal-auth-tab ${authMode === "login" ? "active" : ""}`}
                      onClick={() => {
                        setAuthMode("login");
                        setError("");
                      }}
                    >
                      Sign In
                    </button>
                  </div>

                  {error && <div className="plan-input-error" style={{ marginBottom: "0.9rem" }}>{error}</div>}

                  <form onSubmit={handleAuthSubmit} className="plan-modal-form">
                    <div className="plan-input-group">
                      <label htmlFor="planUserEmail">Your Email Address</label>
                      <div className="plan-email-input-wrap">
                        <input
                          id="planUserEmail"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError("");
                          }}
                          autoFocus
                          required
                        />
                      </div>
                    </div>

                    {authMode === "register" && (
                      <div className="plan-input-group">
                        <label htmlFor="planUsername">Your Name or Username (Optional)</label>
                        <input
                          id="planUsername"
                          type="text"
                          placeholder="e.g. Alex"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="plan-input-group">
                      <label htmlFor="planPassword">Password</label>
                      <div className="auth-input-wrap" style={{ position: "relative" }}>
                        <input
                          id="planPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder={authMode === "register" ? "At least 6 characters" : "Your password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError("");
                          }}
                          required
                          minLength={6}
                          style={{ width: "100%", paddingRight: "40px" }}
                        />
                        <button
                          type="button"
                          className="auth-toggle-pwd"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          style={{ position: "absolute", right: "12px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                        >
                          {showPassword ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path>
                              <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {authMode === "register" && (
                      <div className="plan-input-group">
                        <label htmlFor="planConfirmPassword">Confirm Password</label>
                        <input
                          id="planConfirmPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="Re-type password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (error) setError("");
                          }}
                          required
                        />
                      </div>
                    )}

                    <div className="plan-modal-specs">
                      <div className="pms-row">
                        <span>Selected Plan:</span>
                        <strong>{plan.name}</strong>
                      </div>
                      <div className="pms-row">
                        <span>Plan Deposit:</span>
                        <strong style={{ color: "#ffae19" }}>${plan.priceUsd} USD</strong>
                      </div>
                      <div className="pms-row">
                        <span>Expected 7-Day Return:</span>
                        <strong style={{ color: "#22c55e" }}>${plan.targetUsd.toLocaleString()} USD</strong>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="plan-modal-submit"
                      disabled={authLoading}
                    >
                      {authLoading ? (
                        "CREATING ACCOUNT..."
                      ) : authMode === "register" ? (
                        `CONTINUE TO PAYMENT ($${plan.priceUsd}) →`
                      ) : (
                        `SIGN IN & CONTINUE ($${plan.priceUsd}) →`
                      )}
                    </button>
                  </form>

                  <p className="plan-modal-footer-note">
                    {authMode === "register"
                      ? "Your account gives you access to your personal mining dashboard and automatic payouts."
                      : "Sign in with your password to continue to payment."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 2: PROFESSIONAL CLEAN DEPOSIT PAYMENT ─── */}
          {step === 2 && (
            <div className="checkout-step-container">
              {/* Header with simple navigation */}
              <div className="pro-checkout-header">
                <button
                  type="button"
                  className="pro-back-btn"
                  onClick={() => setStep(1)}
                >
                  ← Back
                </button>
                <div className="pro-badge">
                  <span className="dot" />
                  Payment Ready
                </div>
              </div>

              {/* Plan Summary Card */}
              <div className="pro-summary-card">
                <div className="pro-summary-left">
                  <span className="pro-plan-title">{plan.name}</span>
                  <span className="pro-user-email">{email}</span>
                </div>
                <div className="pro-summary-right">
                  <span className="pro-plan-price">${plan.priceUsd} USD</span>
                  <span className="pro-plan-payout">Returns ${plan.targetUsd.toLocaleString()}</span>
                </div>
              </div>

              {/* Currency Selector (Horizontal scrollable on mobile) */}
              <div className="pro-coin-selector-wrap">
                <label className="pro-section-title">Select Payment Coin:</label>
                <div className="pro-coin-grid">
                  {(Object.keys(PAYMENT_OPTIONS) as PaymentCoin[]).map((coinKey) => {
                    const opt = PAYMENT_OPTIONS[coinKey];
                    const isSelected = selectedCoin === coinKey;
                    return (
                      <button
                        key={coinKey}
                        type="button"
                        className={`pro-coin-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedCoin(coinKey)}
                      >
                        <img
                          src={opt.icon}
                          alt={opt.symbol}
                          className="pro-coin-icon"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <span className="pro-coin-name">{opt.symbol}</span>
                        <span className="pro-coin-network">{opt.network.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Details Container */}
              <div className="pro-deposit-details">
                {/* Amount Row */}
                <div className="pro-detail-row">
                  <div className="pro-detail-header">
                    <span className="pro-detail-label">Amount to Send</span>
                    <span className="pro-network-pill">{activeOption.network}</span>
                  </div>
                  <div
                    className="pro-amount-box"
                    onClick={() => handleCopy(cryptoAmount, "amount")}
                    style={{ cursor: "pointer" }}
                    title="Tap to copy"
                  >
                    <div className="pro-amount-text">
                      {cryptoAmount} {activeOption.symbol}
                    </div>
                    <button
                      type="button"
                      className="pro-copy-sm-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(cryptoAmount, "amount");
                      }}
                    >
                      {copiedType === "amount" ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Deposit Address Row */}
                <div className="pro-detail-row">
                  <div className="pro-detail-header">
                    <span className="pro-detail-label">Deposit Address</span>
                    <span style={{ fontSize: "0.75rem", color: "#22c55e", fontWeight: 700 }}>
                      {copiedType === "address" ? "Copied to clipboard ✓" : "Tap to copy"}
                    </span>
                  </div>
                  <div
                    className="pro-address-box"
                    onClick={() => handleCopy(activeOption.address, "address")}
                    style={{
                      cursor: "pointer",
                      borderColor: copiedType === "address" ? "#22c55e" : undefined,
                      background: copiedType === "address" ? "rgba(34, 197, 94, 0.1)" : undefined,
                    }}
                    title="Tap to copy"
                  >
                    {activeOption.address}
                  </div>
                  <button
                    type="button"
                    className="pro-copy-full-btn"
                    onClick={() => handleCopy(activeOption.address, "address")}
                    style={{
                      borderColor: copiedType === "address" ? "#22c55e" : undefined,
                      color: copiedType === "address" ? "#22c55e" : undefined,
                      background: copiedType === "address" ? "rgba(34, 197, 94, 0.15)" : undefined,
                    }}
                  >
                    {copiedType === "address" ? "Address Copied to Clipboard ✓" : "Copy Wallet Address"}
                  </button>
                </div>

                {/* Optional QR Code Button */}
                <div>
                  <button
                    type="button"
                    className="pro-qr-toggle-btn"
                    onClick={() => setShowQr(!showQr)}
                  >
                    {showQr ? "Hide QR Code ▲" : "Show QR Code ▼"}
                  </button>

                  {showQr && (
                    <div className="pro-qr-container" style={{ marginTop: "0.5rem" }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                          activeOption.address
                        )}&color=ffae19&bgcolor=080d1a`}
                        alt="Payment QR"
                        className="pro-qr-image"
                      />
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Scan with your crypto wallet</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA: Confirm Payment */}
              <button
                type="button"
                className="pro-submit-payment-btn"
                onClick={handleConfirmPayment}
              >
                I Have Sent the Payment →
              </button>

              <p className="pro-payment-tip">
                Send only <strong>{activeOption.symbol}</strong> using the <strong>{activeOption.network}</strong>. Your plan activates automatically once received.
              </p>
            </div>
          )}

          {/* ─── STEP 3: CLEAN PROFESSIONAL CONFIRMATION ─── */}
          {step === 3 && (
            <div className="pro-confirm-wrapper">
              <div className={`pro-confirm-icon-wrap ${verificationStage === 3 ? "success" : ""}`}>
                {verificationStage < 3 ? (
                  <div className="pro-confirm-spinner" />
                ) : (
                  <span style={{ fontSize: "2rem", color: "#22c55e", fontWeight: "bold" }}>✓</span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                <h3 className="pro-confirm-title">
                  {verificationStage === 1 && "Checking for Payment..."}
                  {verificationStage === 2 && "Payment Detected!"}
                  {verificationStage === 3 && "Payment Confirmed!"}
                </h3>
                <p className="pro-confirm-sub">
                  {verificationStage === 1 && "Checking the blockchain network for your deposit..."}
                  {verificationStage === 2 && "Deposit received. Activating your mining plan..."}
                  {verificationStage === 3 && `Your ${plan.name} plan is ready. Opening your dashboard...`}
                </p>
              </div>

              <div className="pro-confirm-progress-track">
                <div
                  className="pro-confirm-progress-bar"
                  style={{
                    width: verificationStage === 1 ? "40%" : verificationStage === 2 ? "75%" : "100%",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
