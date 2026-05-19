import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Auth.css";

export default function VerifiedEmail() {
  const [status, setStatus] = useState("loading");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("invalid");
      return;
    }

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
    fetch(`${API_URL}/verify?token=${token}`)
      .then((res) => {
        if (res.ok) setStatus("success");
        else setStatus("invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [searchParams]);

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: "center" }}>

        {status === "loading" && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "#1f2937",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
            <h2 style={{ color: "#f9fafb", fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>
              Verifying your email...
            </h2>
            <p style={{ color: "#9ca3af", fontSize: 14 }}>Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "#1f2937",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ color: "#f9fafb", fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>
              Email verified!
            </h2>
            <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.7, margin: "0 0 1.75rem" }}>
              Your account is now active. You can sign in and get started.
            </p>
            <button className="auth-btn" onClick={() => navigate("/signin")}>
              Go to sign in
            </button>
          </>
        )}

        {status === "invalid" && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "#1f2937",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2 style={{ color: "#f9fafb", fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>
              Invalid or expired link
            </h2>
            <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.7, margin: "0 0 1.75rem" }}>
              This verification link is no longer valid. Please sign up again or contact support.
            </p>
            <button className="auth-btn" onClick={() => navigate("/signup")}>
              Back to sign up
            </button>
          </>
        )}

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}