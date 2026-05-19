import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Auth.css";

export default function VerifiedEmail() {
  const [status, setStatus] = useState("loading");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const s = searchParams.get("status");
    if (s === "success") setStatus("success");
    else setStatus("invalid");
  }, [searchParams]);

  return (
    <div className="auth-container">
      <div className="auth-card auth-card--centered">

        {status === "loading" && (
          <>
            <div className="verify-icon verify-icon--loading">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
            <h2 className="verify-title">Verifying your email…</h2>
            <p className="verify-body">Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="verify-icon verify-icon--success">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="verify-title">Email verified!</h2>
            <p className="verify-body">
              Your account is now active. You can sign in and get started.
            </p>
            <button className="auth-btn" onClick={() => navigate("/signin")}>
              Go to Sign In
            </button>
          </>
        )}

        {status === "invalid" && (
          <>
            <div className="verify-icon verify-icon--error">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2 className="verify-title">Invalid or expired link</h2>
            <p className="verify-body">
              This verification link is no longer valid. Please sign up again or contact support.
            </p>
            <button className="auth-btn" onClick={() => navigate("/signup")}>
              Back to Sign Up
            </button>
          </>
        )}

      </div>
    </div>
  );
}