"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { useMiningStore } from "@/app/store/useMiningStore";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState("");

  const { isConfigured, siteUrl } = getSupabaseEnv();
  const setUserEmail = useMiningStore((s) => s.setUserEmail);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setResendNotice("");

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Validations
    if (!trimmedEmail) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please verify and re-enter.");
      return;
    }

    if (!isConfigured) {
      setErrorMsg(
        "Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
      );
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      let savedPlan: { name: string; priceUsd: number; clickedAt?: string } | null = null;
      try {
        const raw = localStorage.getItem("chukohash_selected_plan");
        if (raw) savedPlan = JSON.parse(raw);
      } catch {}

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            username: username.trim() || trimmedEmail.split("@")[0],
            ...(savedPlan
              ? {
                  selected_plan: savedPlan.name,
                  selected_plan_price: savedPlan.priceUsd,
                  selected_plan_at: savedPlan.clickedAt || new Date().toISOString(),
                }
              : {}),
          },
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (error) {
        const lowerErr = error.message.toLowerCase();
        if (
          lowerErr.includes("already registered") ||
          lowerErr.includes("already exists") ||
          lowerErr.includes("user already registered")
        ) {
          setErrorMsg(
            "An account with this email address already exists. Please log in or reset your password."
          );
        } else {
          setErrorMsg(error.message);
        }
        setLoading(false);
        return;
      }

      // Check for identity anti-enumeration case (Supabase returns empty identities array if user exists)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setErrorMsg(
          "An account with this email address is already registered. Please sign in or reset your password."
        );
        setLoading(false);
        return;
      }

      // Successful registration!
      setUserEmail(trimmedEmail);

      // If Supabase has email confirmation disabled, user session is immediate
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      // If email confirmation is required (default standard)
      setRegisteredSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during registration.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendNotice("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (error) {
        setResendNotice(`Notice: ${error.message}`);
      } else {
        setResendNotice("Verification email re-sent successfully. Please check your spam folder if delayed.");
      }
    } catch (err: any) {
      setResendNotice(err.message || "Failed to resend confirmation email.");
    } finally {
      setResending(false);
    }
  };

  // Render Verification Sent Screen
  if (registeredSuccess) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div className="auth-header">
            <span className="auth-badge" style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", color: "#ffffff" }}>
              Email Dispatched
            </span>
            <h1 className="auth-title">Verify Your Node</h1>
            <p className="auth-sub">
              We have sent an account activation link to:
            </p>
            <div
              style={{
                margin: "1rem 0",
                padding: "0.75rem 1rem",
                background: "rgba(4, 7, 18, 0.8)",
                borderRadius: "10px",
                border: "1px solid rgba(236, 117, 5, 0.3)",
                color: "#ffae19",
                fontFamily: "monospace",
                fontSize: "1.05rem",
                fontWeight: 700,
              }}
            >
              {email}
            </div>
          </div>

          <div
            style={{
              textAlign: "left",
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              fontSize: "0.88rem",
              color: "#94a3b8",
              lineHeight: 1.6,
            }}
          >
            <p style={{ margin: "0 0 0.5rem 0", color: "#f8fafc", fontWeight: 700 }}>
              Next Steps:
            </p>
            <ol style={{ paddingLeft: "1.2rem", margin: 0 }}>
              <li>Open your inbox and locate the <strong>Chukohash.io</strong> email.</li>
              <li>Click <strong>&quot;CONFIRM &amp; ACTIVATE NODE&quot;</strong>.</li>
              <li>You will be instantly logged in to your private mining terminal.</li>
            </ol>
          </div>

          {resendNotice && (
            <div className="auth-alert auth-alert-success" style={{ textAlign: "left" }}>
              <span>{resendNotice}</span>
            </div>
          )}

          <button
            type="button"
            className="auth-submit-btn"
            style={{
              background: "rgba(236, 117, 5, 0.15)",
              border: "1px solid #EC7505",
              color: "#ffae19",
              boxShadow: "none",
            }}
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? (
              <>
                <span className="auth-spinner" />
                <span>Resending Email...</span>
              </>
            ) : (
              <span>RESEND VERIFICATION EMAIL</span>
            )}
          </button>

          <div className="auth-footer-links">
            <span>Already confirmed?</span>
            <Link href="/login">Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Registration Form
  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-badge">New Miner Node</span>
          <h1 className="auth-title">Register</h1>
          <p className="auth-sub">
            Create your account to start mining Bitcoin & 14+ cryptos.
          </p>
        </div>

        {!isConfigured && (
          <div className="auth-alert auth-alert-warning">
            <span>
              ⚠️ <strong>Supabase Not Connected:</strong> Add your{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>{" "}
              to enable live authentication.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="auth-alert auth-alert-error">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="auth-form">
          <div className="auth-group">
            <label className="auth-label" htmlFor="registerEmail">
              Node Email Address <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div className="auth-input-wrap">
              <input
                id="registerEmail"
                type="email"
                className="auth-input"
                placeholder="miner@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="auth-group">
            <label className="auth-label" htmlFor="registerUsername">
              Miner Call-Sign / Username <span style={{ color: "#64748b" }}>(Optional)</span>
            </label>
            <div className="auth-input-wrap">
              <input
                id="registerUsername"
                type="text"
                className="auth-input"
                placeholder="e.g. ApexMiner-01"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="auth-group">
            <label className="auth-label" htmlFor="registerPassword">
              Master Password <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div className="auth-input-wrap">
              <input
                id="registerPassword"
                type={showPassword ? "text" : "password"}
                className="auth-input"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
              <button
                type="button"
                className="auth-toggle-pwd"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="auth-group">
            <label className="auth-label" htmlFor="confirmPassword">
              Confirm Password <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div className="auth-input-wrap">
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                className="auth-input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="auth-spinner" />
                <span>Registering Miner Node...</span>
              </>
            ) : (
              <span>CREATE ACCOUNT & ALLOCATE NODE →</span>
            )}
          </button>
        </form>

        <div className="auth-footer-links">
          <span>Already registered?</span>
          <Link href="/login">Sign In Here</Link>
        </div>
      </div>
    </div>
  );
}

