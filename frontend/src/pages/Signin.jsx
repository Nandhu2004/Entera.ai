import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";
import { setAuth } from "./api";

export default function SignIn() {
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [error, setError]             = useState("");
  const [notVerified, setNotVerified] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotVerified(false);
    setResendStatus("");

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/token`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAuth(data.access_token, data.username, email);
        navigate("/dashboard");
      } else {
        const errorData = await response.json();
        console.log("STATUS:", response.status, "BODY:", errorData);
        if (response.status === 403) {
          setNotVerified(true);
        } else {
          setError(errorData.detail || "Login failed. Try again.");
        }
      }
    } catch (err) {
      setError("Server connection failed. Is FastAPI running?");
      console.error(err);
    }
  };

  const handleResend = async () => {
    setResendStatus("sending");
    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResendStatus(res.ok ? "sent" : "error");
    } catch {
      setResendStatus("error");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Access your enterprise document intelligence</p>
        </div>

        {error && <p style={{ color: "red", textAlign: "center", fontSize: 14 }}>{error}</p>}

        {notVerified && (
  <div style={{ textAlign: "center", fontSize: 14, marginBottom: 12 }}>
    <p style={{ color: "red", margin: "0 0 6px" }}>
      Your account is not verified.
    </p>

    {resendStatus === "sent" && (
      <span style={{ color: "#22c55e" }}>✓ Verification email resent!</span>
    )}

    {resendStatus === "error" && (
      <span style={{ color: "red" }}>
        Failed to resend.{" "}
        <span
          style={{ color: "#3b82f6", cursor: "pointer", textDecoration: "underline" }}
          onClick={handleResend}
        >
          Try again
        </span>
      </span>
    )}

    {(resendStatus === "" || resendStatus === "sending") && (
      <span
        style={{
          color: resendStatus === "sending" ? "#9ca3af" : "#3b82f6",
          cursor: resendStatus === "sending" ? "default" : "pointer",
          textDecoration: resendStatus === "sending" ? "none" : "underline",
          pointerEvents: resendStatus === "sending" ? "none" : "auto",
        }}
        onClick={resendStatus === "" ? handleResend : undefined}
      >
        {resendStatus === "sending" ? "Sending…" : "Resend verification email"}
      </span>
    )}
  </div>
)}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="user@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-btn">
            Sign In
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <a href="/signup">Create one</a>
        </p>
      </div>
    </div>
  );
}