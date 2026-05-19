import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Theme.css";
import { askQuestion, getUsername } from "./api";

function hasToken() {
  return !!(
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("token")
  );
}
function getStoredUsername() {
  return getUsername() || localStorage.getItem("user") || localStorage.getItem("name") || "User";
}
function getStoredInitials() {
  const name = getStoredUsername();
  return name.split(" ").map(w => w[0]?.toUpperCase()).slice(0, 2).join("") || "U";
}
function fullLogout() {
  ["access_token", "token", "authToken", "username", "user", "name", "user_email"].forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}

function ThemeToggle({ darkMode, onToggle }) {
  return (
    <button className="theme-toggle" onClick={onToggle}
      title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
      <span className={`toggle-track${darkMode ? " on" : ""}`}>
        <span className={`toggle-thumb${darkMode ? " on" : ""}`} />
      </span>
      {darkMode ? "Dark" : "Light"}
    </button>
  );
}

function Sidebar({ active, username, initials, isOpen, onClose }) {
  const navigate = useNavigate();
  const navItems = [
    { label: "Dashboard",      icon: "⊞", path: "/dashboard" },
    { label: "Document Vault", icon: "🗄", path: "/vault" },
    { label: "AI Query Lab",   icon: "✧", path: "/chat" },
    { label: "Upload Center",  icon: "⬆", path: "/upload" },
  ];
  return (
    <>
      <div className={`sidebar-overlay${isOpen ? " open" : ""}`} onClick={onClose} />
      <aside className={`sidebar${isOpen ? " open" : ""}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">📄</div>
          <span className="logo-text">Entera<em>.ai</em></span>
        </div>
        <nav className="sidebar-nav">
          <span className="nav-section-label">Platform</span>
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}
              className={`nav-item${active === item.label ? " active" : ""}`}
              onClick={onClose}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
          <span className="nav-section-label" style={{ marginTop: 16 }}>System</span>
          <div className="nav-item"
            onClick={() => { fullLogout(); navigate("/"); }}
            style={{ color: "var(--status-error)" }}>
            <span className="nav-label">Sign Out</span>
          </div>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div>
              <div className="user-name">{username || "User"}</div>
              <div className="user-role">Verified Account</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 0" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "var(--accent-blue)",
          animation: `typingBounce 1.2s ${i * 0.2}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );
}

function AnswerText({ text }) {
  if (!text) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {text.split("\n").map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} style={{ margin: 0 }}>
            {parts.map((p, j) =>
              p.startsWith("**") && p.endsWith("**")
                ? <strong key={j} style={{ color: "var(--text-primary)" }}>{p.slice(2, -2)}</strong>
                : p
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const username = getStoredUsername();
  const initials = getStoredInitials();
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([{ role: "system" }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (!hasToken()) navigate("/signin");
  }, [navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Close panels on resize to desktop
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth > 700) {
        setSidebarOpen(false);
        setHistoryOpen(false);
      }
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const sendMessage = async (text) => {
    const q = (text || input).trim();
    if (!q || isLoading) return;

    setInput("");
    setApiError(null);
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setIsLoading(true);
    setHistory((prev) => [{ id: Date.now(), question: q }, ...prev]);
    // Close history panel on mobile after sending
    setHistoryOpen(false);

    try {
      const result = await askQuestion(q);
      const answerText =
        result?.answer ||
        result?.result ||
        result?.response ||
        (typeof result === "string" ? result : null) ||
        "I couldn't find a relevant answer in the indexed documents.";
      setMessages((prev) => [...prev, { role: "assistant", content: answerText }]);
    } catch (err) {
      setApiError(err.message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠ Error contacting the server: ${err.message}`, isError: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="app-shell">
      <Sidebar
        active="AI Query Lab"
        username={username}
        initials={initials}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* History panel overlay — mobile only */}
      {historyOpen && (
        <div
          className="sidebar-overlay open"
          style={{ zIndex: 148 }}
          onClick={() => setHistoryOpen(false)}
        />
      )}

      {/* Query History Panel */}
      <div className={`chat-history-panel${historyOpen ? " open" : ""}`}>
        <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>
            Query History
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => { setMessages([{ role: "system" }]); setApiError(null); setHistoryOpen(false); }}
          >
            + New Query
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {history.length === 0 ? (
            <div style={{ padding: "24px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 24, opacity: 0.25, marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                Your queries this session will appear here
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: 0.8, padding: "10px 8px 4px", textTransform: "uppercase" }}>
                Today
              </div>
              {history.map((h) => (
                <div key={h.id} style={{ padding: "9px 10px", borderRadius: "var(--radius-sm)", marginBottom: 2 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {h.question.length > 48 ? h.question.slice(0, 48) + "…" : h.question}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-content chat-main-content">
        <header className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Hamburger — sidebar toggle on mobile */}
            <button className="menu-toggle" onClick={() => setSidebarOpen(o => !o)} aria-label="Open menu">
              ☰
            </button>
            <div>
              <div className="page-title">AI Query Lab</div>
              <div className="page-subtitle">Ask questions across your uploaded documents</div>
            </div>
          </div>
          <div className="header-right">
            {/* History toggle — mobile only */}
            <button
              className="chat-history-toggle"
              onClick={() => setHistoryOpen(o => !o)}
              aria-label="Query history"
              title="Query History"
            >
              💬
              {history.length > 0 && <span className="chat-history-badge">{history.length}</span>}
            </button>
            <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode(d => !d)} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, background: "var(--surface-active)", border: "1px solid var(--border-strong)" }}>
              <span className="status-dot success" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-blue)" }} className="rag-label">RAG Online</span>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "calc(100vh - var(--header-height))" }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}
            className="chat-messages-area">

            {messages.length === 1 && messages[0].role === "system" && (
              <div style={{ display: "flex", justifyContent: "center", animation: "fadeUp 0.4s ease both" }}>
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-xl)", padding: "28px 32px", maxWidth: 520, textAlign: "center", boxShadow: "var(--shadow-card)" }}>
                  <div style={{ fontSize: 34, marginBottom: 12 }}>✧</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 8 }}>
                    Document Intelligence Assistant
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
                    Ask questions about your uploaded documents. Upload files first in the{" "}
                    <Link to="/upload" style={{ color: "var(--accent-blue)", fontWeight: 600 }}>Upload Center</Link>,
                    then ask anything — the AI will search across all your indexed documents.
                  </div>
                </div>
              </div>
            )}

            {messages.slice(1).map((msg, i) => (
              <div key={i} style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                gap: 12, alignItems: "flex-start",
                animation: "fadeUp 0.3s ease both",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, var(--accent-violet), var(--accent-blue))"
                    : msg.isError ? "rgba(255,92,122,0.15)"
                    : "linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: msg.role === "user" ? 12 : 16, fontWeight: 700, color: "white",
                  border: msg.isError ? "1px solid rgba(255,92,122,0.4)" : "none",
                }}>
                  {msg.role === "user" ? initials : msg.isError ? "⚠" : "✧"}
                </div>

                <div className="chat-bubble-wrap">
                  <div style={{
                    background: msg.role === "user"
                      ? "linear-gradient(135deg, var(--accent-blue), var(--accent-blue-dim))"
                      : msg.isError ? "rgba(255,92,122,0.07)"
                      : "var(--surface-2)",
                    border: msg.role === "user" ? "none"
                      : msg.isError ? "1px solid rgba(255,92,122,0.25)"
                      : "1px solid var(--border-subtle)",
                    borderRadius: msg.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                    padding: "13px 17px", fontSize: 13.5, lineHeight: 1.65,
                    color: msg.role === "user" ? "white" : msg.isError ? "var(--status-error)" : "var(--text-secondary)",
                    boxShadow: msg.role === "user" ? "0 4px 16px rgba(26,110,247,0.2)" : "var(--shadow-sm)",
                    wordBreak: "break-word",
                  }}>
                    {msg.role === "user" ? msg.content : <AnswerText text={msg.content} />}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", animation: "fadeUp 0.3s ease both" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>✧</div>
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", borderRadius: "4px 18px 18px 18px", padding: "10px 16px" }}>
                  <TypingIndicator />
                </div>
              </div>
            )}

            {apiError && !isLoading && (
              <div style={{ background: "rgba(255,92,122,0.07)", border: "1px solid rgba(255,92,122,0.25)", borderRadius: "var(--radius-md)", padding: "10px 16px", fontSize: 12.5, color: "var(--status-error)", display: "flex", alignItems: "center", gap: 8 }}>
                ⚠ {apiError}
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto", color: "var(--status-error)" }} onClick={() => setApiError(null)}>✕</button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="chat-input-bar">
            <div className="chat-input-wrap"
              onFocusCapture={e => { e.currentTarget.style.borderColor = "var(--accent-blue)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,110,247,0.1)"; }}
              onBlurCapture={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask a question… (Enter to send)"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontFamily: "var(--font-body)", fontSize: 13.5, resize: "none", lineHeight: 1.5, minHeight: 20, maxHeight: 120 }}
                rows={1}
              />
              <button className="btn btn-primary btn-icon"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                style={{ flexShrink: 0, opacity: (!input.trim() || isLoading) ? 0.5 : 1, fontSize: 16 }}>
                ↑
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes typingBounce { 0%,60%,100% { transform:translateY(0); } 30% { transform:translateY(-6px); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }

        /* History panel — desktop: fixed strip; mobile: slide-in drawer */
        .chat-history-panel {
          position: fixed;
          left: var(--sidebar-width);
          top: 0; bottom: 0;
          width: 240px;
          background: var(--surface-1);
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          z-index: 99;
          transition: background var(--t-normal), transform var(--t-normal);
        }

        /* Main content offset for history panel on desktop */
        .chat-main-content {
          margin-left: calc(var(--sidebar-width) + 240px) !important;
        }

        .chat-messages-area {
          padding: 24px 32px;
        }

        .chat-bubble-wrap {
          max-width: 70%;
        }

        /* Input bar */
        .chat-input-bar {
          padding: 16px 32px 20px;
          background: var(--header-bg);
          backdrop-filter: blur(12px);
          border-top: 1px solid var(--border-subtle);
        }
        .chat-input-wrap {
          display: flex;
          gap: 10px;
          align-items: flex-end;
          background: var(--surface-2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 10px 14px;
          transition: border-color var(--t-fast), box-shadow var(--t-fast);
        }

        /* History toggle button — hidden on desktop */
        .chat-history-toggle {
          display: none;
          position: relative;
          width: 36px; height: 36px;
          border-radius: var(--radius-sm);
          background: var(--surface-2);
          border: 1px solid var(--border-subtle);
          align-items: center; justify-content: center;
          font-size: 16px; cursor: pointer;
          color: var(--text-secondary);
        }
        .chat-history-badge {
          position: absolute;
          top: 4px; right: 4px;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: var(--accent-blue);
          color: white;
          font-size: 8px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          border: 1.5px solid var(--surface-1);
        }

        /* ---- Tablet (≤900px) ---- */
        @media (max-width: 900px) {
          .chat-main-content {
            margin-left: calc(var(--sidebar-width) + 200px) !important;
          }
          .chat-history-panel {
            width: 200px;
          }
        }

        /* ---- Mobile (≤700px) ---- */
        @media (max-width: 700px) {
          /* Sidebar handled by Theme.css — just reset main margin */
          .chat-main-content {
            margin-left: 0 !important;
          }

          /* History panel becomes a slide-in drawer from the right */
          .chat-history-panel {
            left: auto;
            right: 0;
            width: 280px;
            transform: translateX(100%);
            z-index: 149;
            border-right: none;
            border-left: 1px solid var(--border-subtle);
            box-shadow: var(--shadow-lg);
          }
          .chat-history-panel.open {
            transform: translateX(0);
          }

          /* Show history toggle button */
          .chat-history-toggle {
            display: flex;
          }

          /* Reduce message padding */
          .chat-messages-area {
            padding: 16px !important;
          }

          /* Bubbles take more width on small screens */
          .chat-bubble-wrap {
            max-width: 85%;
          }

          /* Tighter input bar */
          .chat-input-bar {
            padding: 10px 12px 14px;
          }

          /* Hide "RAG Online" text label, keep dot */
          .rag-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}