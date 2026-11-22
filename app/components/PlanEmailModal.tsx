"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MiningMode } from "../config/mining";
import { useMiningStore } from "../store/useMiningStore";
import { COINS } from "../config/coins";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { ensureMinerProfile } from "@/lib/supabase/minerProfile";

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

  // Multi-step: 1 = Auth / Signup, 2 = Payment Sheet, 3 = Verification / Provisioning
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Auth form state
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
  const [timeLeft, setTimeLeft] = useState(900); // 15:00 minutes

  // Step 3 animation states
  const [verificationStage, setVerificationStage] = useState(0);

  const setUserEmail = useMiningStore((s) => s.setUserEmail);
  const setPlanPaid = useMiningStore((s) => s.setPlanPaid);
  const existingEmail = useMiningStore((s) => s.userEmail);
  const { isConfigured, siteUrl } = getSupabaseEnv();

  // Reset state and check active auth session when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError("");
      setCopiedType(null);
      setTimeLeft(900);
      setVerificationStage(0);
      setPassword("");
      setConfirmPassword("");

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

  // Handle Authenticated User Fast Proceed
  const handleProceedExisting = () => {
    if (currentUser?.email) {
      setUserEmail(currentUser.email);
    }
    setStep(2);
  };

  // Step 1: Sign up or Log in -> Proceed to Step 2
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your account password.");
      return;
    }

    if (authMode === "register") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    // If Supabase is not configured, fallback gracefully to store
    if (!isConfigured) {
      setUserEmail(cleanEmail);
      setStep(2);
      return;
    }

    setAuthLoading(true);

    try {
      const supabase = createClient();

      if (authMode === "register") {
        // Register new miner account
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
              "An account with this email already exists. Click 'Sign In' above to continue."
            );
          } else {
            setError(signUpError.message);
          }
          setAuthLoading(false);
          return;
        }

        // Anti-enumeration duplicate check
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setError(
            "An account with this email is already registered. Click 'Sign In' above to continue."
          );
          setAuthLoading(false);
          return;
        }

        if (data.user) {
          await ensureMinerProfile(supabase, data.user, username.trim());
          setCurrentUser({ id: data.user.id, email: data.user.email });
        }
      } else {
        // Sign in existing miner
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (signInError) {
          setError("Invalid email address or password. Please try again.");
          setAuthLoading(false);
          return;
        }

        if (data.user) {
          setCurrentUser({ id: data.user.id, email: data.user.email });
        }
      }

      // Successful auth -> advance to payment sheet!
      setUserEmail(cleanEmail);
      setAuthLoading(false);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
      setAuthLoading(false);
    }
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

        {/* ─── STEP 1: AUTHENTICATION / REGISTRATION ─── */}
        {step === 1 && (
          <div className="checkout-step-container">
            <div className="plan-modal-header">
              <span className="plan-badge-inline">{plan.badge || "CLOUD RIG"}</span>
              <h3 className="plan-modal-title">
                {currentUser ? "Allocate Mining Node" : "Miner Registration"}
              </h3>
              <p className="plan-modal-sub">
                Deploying <strong style={{ color: "#ffae19" }}>{plan.name}</strong> (${plan.priceUsd} plan · mines{" "}
                <strong style={{ color: "#22c55e" }}>${plan.targetUsd.toLocaleString()}</strong> in 7 days).
              </p>
            </div>

            {/* If user is already authenticated */}
            {currentUser ? (
              <div className="plan-modal-form">
                <div className="modal-auth-logged-card">
                  <div className="malc-top">
                    <span className="malc-badge">
                      <span className="malc-dot" />
                      AUTHENTICATED OPERATOR
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
                      Switch Account
                    </button>
                  </div>
                  <div className="malc-email">{currentUser.email}</div>
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

                <button
                  type="button"
                  className="plan-modal-submit"
                  onClick={handleProceedExisting}
                >
                  PROCEED TO PAYMENT (${plan.priceUsd}) →
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
                    <label htmlFor="planUserEmail">Node Email Address</label>
                    <div className="plan-email-input-wrap">
                      <input
                        id="planUserEmail"
                        type="email"
                        placeholder="miner@domain.com"
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
                      <label htmlFor="planUsername">Call-Sign / Username (Optional)</label>
                      <input
                        id="planUsername"
                        type="text"
                        placeholder="e.g. ApexMiner-01"
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
                        placeholder={authMode === "register" ? "Min. 6 characters" : "Account password"}
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
                        placeholder="Re-enter password"
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

                  <button
                    type="submit"
                    className="plan-modal-submit"
                    disabled={authLoading}
                  >
                    {authLoading ? (
                      "AUTHENTICATING NODE..."
                    ) : authMode === "register" ? (
                      `CREATE ACCOUNT & PROCEED TO PAYMENT ($${plan.priceUsd}) →`
                    ) : (
                      `SIGN IN & PROCEED TO PAYMENT ($${plan.priceUsd}) →`
                    )}
                  </button>
                </form>

                <p className="plan-modal-footer-note">
                  {authMode === "register"
                    ? "Your account securely registers your datacenter node and payout wallet address."
                    : "Sign in with your registered node master password to activate your plan."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 2: INSTANT CRYPTO CHECKOUT ─── */}
        {step === 2 && (
          <div className="checkout-step-container">
            <div className="checkout-nav-bar">
              <button type="button" className="checkout-back-link" onClick={() => setStep(1)}>
                ← Change Account / Plan
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
                <span className="csb-usd-amount">${plan.priceUsd} USD</span>
                <span className="csb-payout-label">10× Output: ${plan.targetUsd.toLocaleString()}</span>
              </div>
            </div>

            {/* Token Selector Pills */}
            <div className="checkout-tokens-section">
              <label className="checkout-section-label">Select Deposit Currency:</label>
              <div className="checkout-token-grid">
                {(Object.keys(PAYMENT_OPTIONS) as PaymentCoin[]).map((coinKey) => {
                  const opt = PAYMENT_OPTIONS[coinKey];
                  const isSelected = selectedCoin === coinKey;
                  return (
                    <button
                      key={coinKey}
                      type="button"
                      className={`checkout-token-pill ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedCoin(coinKey)}
                    >
                      <img
                        src={opt.icon}
                        alt={opt.symbol}
                        className="token-pill-icon"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="token-pill-info">
                        <span className="token-pill-symbol">{opt.symbol}</span>
                        <span className="token-pill-net">{opt.network.split(" ")[0]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Details Container */}
            <div className="checkout-payment-box">
              <div className="cpb-top">
                <div className="cpb-network-badge">
                  <span>Network: </span>
                  <strong>{activeOption.network}</strong>
                </div>
                {activeOption.badge && (
                  <span className="cpb-highlight-badge">{activeOption.badge}</span>
                )}
              </div>

              {/* Exact Amount Row */}
              <div className="cpb-amount-box">
                <span className="cpb-label">Send Exactly:</span>
                <div className="cpb-amount-row">
                  <div className="cpb-crypto-num">
                    <strong className="crypto-val">{cryptoAmount}</strong>
                    <span className="crypto-sym">{activeOption.symbol}</span>
                  </div>
                  <button
                    type="button"
                    className="cpb-copy-btn"
                    onClick={() => handleCopy(cryptoAmount, "amount")}
                  >
                    {copiedType === "amount" ? "COPIED ✓" : "COPY AMOUNT"}
                  </button>
                </div>
              </div>

              {/* QR Code and Wallet Address */}
              <div className="cpb-address-section">
                <div className="cpb-qr-wrapper">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      activeOption.address
                    )}&color=ffae19&bgcolor=030712`}
                    alt={`${activeOption.symbol} Deposit QR`}
                    className="cpb-qr-img"
                    width={130}
                    height={130}
                  />
                  <span className="cpb-qr-caption">Scan with Wallet</span>
                </div>

                <div className="cpb-address-wrap">
                  <span className="cpb-label">Deposit Address:</span>
                  <div className="cpb-addr-box">
                    <code className="cpb-address-text">{activeOption.address}</code>
                  </div>
                  <button
                    type="button"
                    className="cpb-copy-address-btn"
                    onClick={() => handleCopy(activeOption.address, "address")}
                  >
                    {copiedType === "address" ? "ADDRESS COPIED ✓" : "COPY WALLET ADDRESS"}
                  </button>
                </div>
              </div>
            </div>

            {/* CTA: Confirm Broadcast */}
            <button
              type="button"
              className="checkout-confirm-btn"
              onClick={handleConfirmPayment}
            >
              <span>I HAVE SENT {cryptoAmount} {activeOption.symbol} →</span>
            </button>

            <div className="checkout-secure-notice">
              <span>🔒 Encrypted Node Reservation · Guaranteed Instant Activation upon Confirmation</span>
            </div>
          </div>
        )}

        {/* ─── STEP 3: HIGH-TECH VERIFICATION & PROVISIONING STATE ─── */}
        {step === 3 && (
          <div className="checkout-step-container step-verification">
            <div className="verify-radar-wrap">
              {verificationStage < 3 ? (
                <div className="verify-radar-circle">
                  <div className="radar-sweep" />
                  <div className="radar-dot d1" />
                  <div className="radar-dot d2" />
                  <div className="radar-center-icon">⚡</div>
                </div>
              ) : (
                <div className="verify-success-check">
                  <span className="check-icon">✓</span>
                </div>
              )}
            </div>

            <div className="verify-status-box">
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
            </div>

            <div className="verify-terminal">
              <div className="vt-line">[00:01] Listening to {activeOption.network} network node...</div>
              {verificationStage >= 2 && (
                <div className="vt-line green">[00:02] TxHash found: Deposit verified for {email}</div>
              )}
              {verificationStage >= 3 && (
                <div className="vt-line amber">
                  [00:03] Node provisioned: Cluster US-East assigned · 10× yield unlocked
                </div>
              )}
            </div>

            <div className="verify-progress-track">
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
