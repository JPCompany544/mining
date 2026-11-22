"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { useMiningStore } from "@/app/store/useMiningStore";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(urlError || "");
  const [successMsg, setSuccessMsg] = useState("");
  const [resendingEmail, setResendingEmail] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const { isConfigured } = getSupabaseEnv();
  const setUserEmail = useMiningStore((s) => s.setUserEmail);

  useEffect(() => {
    if (urlError) {
      setErrorMsg(urlError);
    }
  }, [urlError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setShowResend(false);

    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("email not confirmed") ||
          error.message.toLowerCase().includes("not confirmed")
        ) {
          setErrorMsg(
            "Your email has not been verified yet. Please check your inbox or click resend below."
          );
          setShowResend(true);
        } else if (
          error.message.toLowerCase().includes("invalid login credentials") ||
          error.message.toLowerCase().includes("invalid credentials")
        ) {
          setErrorMsg("Invalid email address or password. Please try again.");
        } else {
          setErrorMsg(error.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // Synchronize authenticated email into local store
        if (data.user.email) {
          setUserEmail(data.user.email);
        }
        setSuccessMsg("Authentication successful! Entering cloud terminal...");
        setTimeout(() => {
          router.push(redirectPath);
          router.refresh();
        }, 500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during login.");
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setResendingEmail(true);
    try {
      const supabase = createClient();
      const { siteUrl } = getSupabaseEnv();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg(
          `Verification email dispatched to ${email.trim()}. Please check your inbox.`
        );
        setShowResend(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend confirmation email.");
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <span className="auth-badge">Miner Portal</span>
        <h1 className="auth-title">Sign In</h1>
        <p className="auth-sub">
          Access your cloud mining nodes, hashrate stats & payouts.
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

      {successMsg && (
        <div className="auth-alert auth-alert-success">
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="auth-form">
        <div className="auth-group">
          <label className="auth-label" htmlFor="loginEmail">
            Node Email Address
          </label>
          <div className="auth-input-wrap">
            <input
              id="loginEmail"
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
          <div className="auth-label">
            <label htmlFor="loginPassword">Password</label>
            <Link href="/forgot-password" className="auth-label-link">
              Forgot password?
            </Link>
          </div>
          <div className="auth-input-wrap">
            <input
              id="loginPassword"
              type={showPassword ? "text" : "password"}
              className="auth-input"
              placeholder="Enter account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
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

        <button
          type="submit"
          className="auth-submit-btn"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="auth-spinner" />
              <span>Authenticating Node...</span>
            </>
          ) : (
            <span>SIGN IN TO MINER NODE →</span>
          )}
        </button>

        {showResend && (
          <button
            type="button"
            className="auth-submit-btn"
            style={{
              background: "rgba(236, 117, 5, 0.15)",
              border: "1px solid #EC7505",
              color: "#ffae19",
              boxShadow: "none",
              marginTop: "0.25rem",
            }}
            onClick={handleResendVerification}
            disabled={resendingEmail}
          >
            {resendingEmail ? (
              <>
                <span className="auth-spinner" />
                <span>Sending Verification...</span>
              </>
            ) : (
              <span>RESEND VERIFICATION EMAIL</span>
            )}
          </button>
        )}
      </form>

      <div className="auth-footer-links">
        <span>Need a cloud mining account?</span>
        <Link href="/register">Register Miner Node</Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-page-wrapper">
      <Suspense fallback={<div className="auth-card" style={{ textAlign: "center", color: "#94a3b8" }}>Loading portal...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
