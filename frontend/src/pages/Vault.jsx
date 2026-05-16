import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Theme.css";
import { getUsername} from "./api";

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
  ["access_token","token","authToken","username","user","name","user_email"].forEach(k => {
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
        <div className="nav-item"
          onClick={() => { fullLogout(); navigate("/"); }}
          style={{ color: "var(--status-error)" }}>
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

function FileIcon() {
  return (
    <div style={{
      width: 36, height: 44, borderRadius: 6,
      background: "rgba(26,110,247,0.1)", border: "1px solid rgba(26,110,247,0.27)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 18, flexShrink: 0,
    }}>
      📄
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    indexed:    { cls: "badge-success", label: "Indexed",    dot: "success" },
    processing: { cls: "badge-purple",  label: "Processing", dot: "processing" },
    failed:     { cls: "badge-error",   label: "Failed",     dot: "error" },
  };
  const s = map[status] || map.indexed;
  return (
    <span className={`badge ${s.cls}`}>
      <span className={`status-dot ${s.dot}`} />
      {s.label}
    </span>
  );
}

export default function Vault() {
  const navigate = useNavigate();
  const username = getStoredUsername();
  const initials = getStoredInitials();
  const token = localStorage.getItem("token") || localStorage.getItem("access_token");

  const [docs, setDocs]                   = useState([]);
  const [search, setSearch]               = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [darkMode, setDarkMode]           = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (!hasToken()) navigate("/signin");
  }, [navigate]);

  useEffect(() => {
    if (!token) return;
    fetch("http://localhost:8000/documents", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject("Unauthorized"))
      .then(data => {
        setDocs(data.map(d => ({ ...d, id: d.doc_id, name: d.filename, status: "indexed" })));
      })
      .catch(err => {
        console.error("Fetch error:", err);
        if (err === "Unauthorized") navigate("/signin");
      });
  }, [token, navigate]);

  const handleDelete = async (doc) => {
    try {
      const response = await fetch(`http://localhost:8000/documents/${doc.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== doc.id));
        setConfirmDelete(null);
      } else {
        alert("Failed to delete document from server.");
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const filtered = docs.filter((d) => {
    const q = search.toLowerCase();
    return d.name?.toLowerCase().includes(q) || d.owner?.toLowerCase().includes(q);
  });

  return (
    <div className="app-shell">
      <Sidebar active="Document Vault" username={username} initials={initials} />
      <div className="main-content">

        <header className="page-header">
          <div>
            <div className="page-title">Document Vault</div>
            <div className="page-subtitle">
              {docs.length > 0 ? `${docs.length} documents stored` : "No documents uploaded yet"}
            </div>
          </div>
          <div className="header-right">
            <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode(d => !d)} />
            <Link to="/upload" className="btn btn-primary">⬆ Upload Documents</Link>
          </div>
        </header>

        <main className="page-body">
          {docs.length === 0 ? (
            <div className="card anim-up" style={{ marginTop: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 24px", gap: 14, textAlign: "center" }}>
                <div style={{ fontSize: 48, opacity: 0.25 }}>🗄</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-secondary)" }}>Your vault is empty</div>
                <Link to="/upload" className="btn btn-primary">⬆ Upload your first document</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="card anim-up" style={{ marginBottom: 16 }}>
                <div className="card-inner" style={{ padding: "14px 18px", display: "flex", gap: 14, alignItems: "center" }}>
                  <div className="input-wrap" style={{ flex: 1 }}>
                    <input className="input" placeholder="Search by filename..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="card anim-up">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Status</th>
                      <th>Owner</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <FileIcon />
                            <div>
                              <div style={{ fontWeight: 600 }}>{doc.name}</div>
                              <div style={{ fontSize: 10, opacity: 0.5 }}>{doc.id}</div>
                            </div>
                          </div>
                        </td>
                        <td><StatusBadge status={doc.status} /></td>
                        <td>{doc.owner}</td>
                        <td style={{ textAlign: "center" }}>
                          <button className="btn btn-ghost" onClick={() => setConfirmDelete(doc)} style={{ color: "var(--status-error)" }}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Delete Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Delete Document?</h3>
            <p>Are you sure you want to delete <strong>{confirmDelete.name}</strong>?</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}