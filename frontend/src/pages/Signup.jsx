import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";

function validatePassword(password) {
  const rules = [
    { test: p => p.length >= 8,          label: "At least 8 characters" },
    { test: p => /[A-Z]/.test(p),        label: "One uppercase letter" },
    { test: p => /[a-z]/.test(p),        label: "One lowercase letter" },
    { test: p => /[0-9]/.test(p),        label: "One number" },
    { test: p => /[^A-Za-z0-9]/.test(p), label: "One special character" },
  ];
  return rules.map(r => ({ label: r.label, passed: r.test(password) }));
}

export default function SignUp() {
  const [fullName, setFullName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [showRules, setShowRules] = useState(false);
  const navigate = useNavigate();

  const rules = validatePassword(password);
  const allPassed = rules.every(r => r.passed);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!allPassed) {
      setError("Password does not meet all requirements.");
      setShowRules(true);
      return;
    }

    const formData = new FormData();
    formData.append("username", fullName);
    formData.append("email", email);
    formData.append("password", password);

    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || "Verification email sent! Please check your inbox.");
        navigate("/signin");
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Registration failed. Try again.");
      }
    } catch (err) {
      setError("Server connection failed. Please try again later.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Get Started with Entera.ai</h2>
          <p>Deploy RAG-powered search for your team</p>
        </div>

        {error && (
          <p style={{ color: "red", textAlign: "center", fontSize: "14px" }}>{error}</p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" placeholder="John Doe" value={fullName}
              onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Company Email</label>
            <input type="email" placeholder="name@company.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setShowRules(true); }}
              onFocus={() => setShowRules(true)}
              required
            />
            {showRules && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {rules.map((r) => (
                  <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <span style={{ color: r.passed ? "#22c55e" : "#94a3b8", fontSize: 14 }}>
                      {r.passed ? "✓" : "○"}
                    </span>
                    <span style={{ color: r.passed ? "#22c55e" : "#94a3b8" }}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="auth-btn" disabled={showRules && !allPassed}
            style={{ opacity: showRules && !allPassed ? 0.6 : 1 }}>
            Create Account
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </div>
    </div>
  );
}