import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Theme.css";
import { getUsername } from "./api";

function hasToken() {
  return !!(
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("token")
  );
}

function ThemeToggle({ darkMode, onToggle }) {
  return (
    <button className="theme-toggle" onClick={onToggle}
      title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
      <span className={`toggle-track${darkMode ? " on" : ""}`}>
        <span className={`toggle-thumb${darkMode ? " on" : ""}`} />
      </span>
      {darkMode ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}

function Sidebar({ active, username, initials }) {
  const navigate = useNavigate();
  const navItems = [
    { label: "Dashboard",      icon: "⊞", path: "/dashboard" },
    { label: "Document Vault", icon: "🗄", path: "/vault" },
    { label: "AI Query Lab",   icon: "🤖", path: "/chat" },
    { label: "Upload Center",  icon: "⬆", path: "/upload" },
  ];
  const handleLogout = () => {
    ["access_token", "token", "authToken", "username", "user_email"].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    navigate("/");
  };
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">📄</div>
        <span className="logo-text">Entera<em>.ai</em></span>
      </div>
      <nav className="sidebar-nav">
        <span className="nav-section-label">Platform</span>
        {navItems.map((item) => (
          <Link key={item.path} to={item.path}
            className={`nav-item${active === item.label ? " active" : ""}`}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
        <span className="nav-section-label" style={{ marginTop: 16 }}>System</span>
        <div className="nav-item" onClick={handleLogout} style={{ color: "var(--status-error)" }}>
          <span className="nav-icon">🚪</span>
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
  );
}

function EmptyState({ icon, title, body, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>{title}</div>
      <div style={{ fontSize: 12.5, color: "var(--text-muted)", maxWidth: 240, lineHeight: 1.65 }}>{body}</div>
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const username = getUsername() || localStorage.getItem("user") || localStorage.getItem("name") || "User";
  const initials = username.split(" ").map((w) => w[0]?.toUpperCase()).slice(0, 2).join("") || "U";

  const [greeting] = useState(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  });

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (!hasToken()) { navigate("/signin"); return; }
    fetchDocs();
  }, [navigate]);

  const fetchDocs = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

      const res = await fetch(`${API_URL}/documents`, {
      headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) { navigate("/signin"); return; }
      const data = await res.json();
      setDocs(data);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  };

  // Derive stats from real docs
  const total      = docs.length;
  const indexed    = docs.filter(d => d.status === "indexed" || !d.status).length;
  const processing = docs.filter(d => d.status === "processing").length;
  const failed     = docs.filter(d => d.status === "failed").length;
  const recent     = docs.slice(0, 5);

  return (
    <div className="app-shell">
      <Sidebar active="Dashboard" username={username} initials={initials} />
      <div className="main-content">

        <header className="page-header">
          <div>
            <div className="page-title">{greeting}, {username} 👋</div>
            <div className="page-subtitle">Document intelligence overview</div>
          </div>
          <div className="header-right">
            <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode(d => !d)} />
            <Link to="/upload" className="btn btn-primary btn-sm">⬆ Upload</Link>
            <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 13, borderRadius: "var(--radius-sm)" }}>
              {initials}
            </div>
          </div>
        </header>

        <main className="page-body">

          {/* KPI row */}
          {!loading && total > 0 && (
            <div className="grid-4 stagger" style={{ marginBottom: 22 }}>
              {[
                { label: "Total Documents", value: total,      color: "var(--accent-blue)",    icon: "🗃" },
                { label: "Indexed",         value: indexed,    color: "var(--status-success)",  icon: "✅" },
                { label: "Processing",      value: processing, color: "var(--accent-violet)",   icon: "⏳" },
                { label: "Failed",          value: failed,     color: "var(--status-error)",    icon: "⚠" },
              ].map((s) => (
                <div key={s.label} className="kpi-card anim-up"
                  style={{ "--kpi-line": s.color, "--kpi-icon-bg": `${s.color}18`, "--kpi-icon-border": `${s.color}30` }}>
                  <div className="kpi-top"><div className="kpi-icon-wrap">{s.icon}</div></div>
                  <div className="kpi-value">{s.value}</div>
                  <div className="kpi-label">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 300px", gap: 18, alignItems: "start" }}>

            {/* Storage Distribution */}
            <div className="card anim-up" style={{ animationDelay: "0ms" }}>
              <div className="card-header">
                <span className="card-title">Storage Distribution</span>
                <Link to="/vault" className="btn btn-ghost btn-sm">View all</Link>
              </div>
              {loading ? (
                <div style={{ padding: "40px 24px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>Loading…</div>
              ) : total === 0 ? (
                <EmptyState icon="🗄" title="No documents yet"
                  body="Upload your first document to see a breakdown by type."
                  action={<Link to="/upload" className="btn btn-primary btn-sm">Upload now</Link>} />
              ) : (
                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Indexed",    value: indexed,    color: "var(--status-success)" },
                    { label: "Processing", value: processing, color: "var(--accent-violet)" },
                    { label: "Failed",     value: failed,     color: "var(--status-error)" },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "var(--text-secondary)" }}>{s.label}</span>
                        <span style={{ color: s.color, fontWeight: 600 }}>{s.value}</span>
                      </div>
                      <div style={{ height: 6, background: "var(--surface-3)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 99, background: s.color, width: total ? `${(s.value / total) * 100}%` : "0%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Processing Activity */}
            <div className="card anim-up" style={{ animationDelay: "55ms" }}>
              <div className="card-header">
                <span className="card-title">Processing Activity</span>
              </div>
              {loading ? (
                <div style={{ padding: "40px 24px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>Loading…</div>
              ) : total === 0 ? (
                <EmptyState icon="📊" title="No activity yet"
                  body="Charts will appear here once documents have been uploaded and processed." />
              ) : (
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
                    {total} document{total !== 1 ? "s" : ""} in vault
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { label: "Indexed",    value: indexed,    bg: "rgba(0,200,120,0.1)",   color: "var(--status-success)" },
                      { label: "Processing", value: processing, bg: "rgba(139,114,250,0.1)", color: "var(--accent-violet)" },
                      { label: "Failed",     value: failed,     bg: "rgba(255,92,122,0.1)",  color: "var(--status-error)" },
                    ].filter(s => s.value > 0).map(s => (
                      <div key={s.label} style={{ padding: "8px 14px", borderRadius: "var(--radius-md)", background: s.bg, border: `1px solid ${s.color}33` }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recent Extractions */}
            <div className="card anim-up" style={{ animationDelay: "110ms" }}>
              <div className="card-header">
                <span className="card-title">Recent Extractions</span>
                <Link to="/vault" className="btn btn-ghost btn-sm">View all</Link>
              </div>
              {loading ? (
                <div style={{ padding: "40px 24px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>Loading…</div>
              ) : total === 0 ? (
                <EmptyState icon="📋" title="Nothing processed yet"
                  body="Recent extractions will appear here as you upload files."
                  action={<Link to="/upload" className="btn btn-ghost btn-sm">Go to Upload Center</Link>} />
              ) : (
                <div style={{ padding: "8px 0" }}>
                  {recent.map((doc, i) => (
                    <div key={doc.doc_id} style={{ padding: "9px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: i < recent.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                      <span style={{ fontSize: 16 }}>📄</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.filename}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          {doc.doc_id?.slice(0, 12)}…
                        </div>
                      </div>
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "rgba(0,200,120,0.1)", color: "var(--status-success)", fontWeight: 600 }}>
                        Indexed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}