"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/config";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { isConfigured, siteUrl } = getSupabaseEnv();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg("Please enter your registered email address.");
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
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg(
          `Password reset link dispatched! Please check your inbox at ${trimmedEmail} and follow the link.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while requesting reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-badge">Security Recovery</span>
          <h1 className="auth-title">Forgot Password</h1>
          <p className="auth-sub">
            Enter your node email to receive a password recovery link.
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

        {successMsg ? (
          <div>
            <div className="auth-alert auth-alert-success">
              <span>{successMsg}</span>
            </div>
            <div className="auth-footer-links" style={{ border: "none", marginTop: "1rem" }}>
              <Link href="/login" className="auth-submit-btn" style={{ textDecoration: "none" }}>
                RETURN TO SIGN IN →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="auth-form">
            <div className="auth-group">
              <label className="auth-label" htmlFor="forgotEmail">
                Node Email Address
              </label>
              <div className="auth-input-wrap">
                <input
                  id="forgotEmail"
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

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="auth-spinner" />
                  <span>Dispatching Reset Link...</span>
                </>
              ) : (
                <span>SEND RESET INSTRUCTIONS →</span>
              )}
            </button>
          </form>
        )}

        <div className="auth-footer-links">
          <span>Remember your password?</span>
          <Link href="/login">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}

