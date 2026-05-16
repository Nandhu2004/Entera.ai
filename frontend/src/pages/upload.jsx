import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Theme.css";
import { uploadDocument, getUsername } from "./api";

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

// ── Theme Toggle ─────────────────────────────────────────────
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

// ── Sidebar ───────────────────────────────────────────────────
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

// ── Stage definitions ─────────────────────────────────────────
const STAGES = [
  { key: "upload",    desc: "Uploading to Server",             icon: "⬆" },
  { key: "ocr",       desc: "Azure OCR Extraction",            icon: "🔍" },
  { key: "vectorize", desc: "Vectorizing & Storing in Qdrant", icon: "🧠" },
];

const STAGE_COLORS = {
  pending: { color: "var(--text-dim)",       bg: "var(--surface-3)" },
  active:  { color: "var(--accent-blue)",    bg: "rgba(26,110,247,0.1)" },
  done:    { color: "var(--status-success)", bg: "rgba(34,211,160,0.1)" },
  error:   { color: "var(--status-error)",   bg: "rgba(255,92,122,0.1)" },
};

function makeFileEntry(rawFile) {
  return {
    id:       Math.random().toString(36).slice(2),
    rawFile,
    name:     rawFile.name,
    size:     `${(rawFile.size / (1024 * 1024)).toFixed(1)} MB`,
    type:     rawFile.type || "application/pdf",
    stages:   { upload: "pending", ocr: "pending", vectorize: "pending" },
    progress: { upload: 0, ocr: 0, vectorize: 0 },
    done:     false,
    error:    null,
    // Populated from real POST /upload response: { message, doc_id, owner }
    docId:    null,
    owner:    null,
    message:  null,
    // Populated from real API response if the endpoint returns extracted text
    ocrText:  null,
    // Real OCR confidence returned by the server, if available
    ocrConfidence: null,
  };
}

export default function Upload() {
  const navigate     = useNavigate();
  const username     = getStoredUsername();
  const initials     = getStoredInitials();
  const fileInputRef = useRef(null);

  const [files, setFiles]             = useState([]);
  const [dragActive, setDragActive]   = useState(false);
  const [validationFile, setValidFile] = useState(null);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (!hasToken()) navigate("/signin");
  }, [navigate]);

  const updateFile = useCallback((id, patch) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  }, []);

  const startUpload = useCallback(async (entry) => {
    updateFile(entry.id, { stages: { upload: "active", ocr: "pending", vectorize: "pending" } });

    // Simulate OCR + vectorize progress while the real upload is in flight
    // (these stages run server-side inside store_document() before the response returns)
    let ocrPct = 0;
    let vecPct = 0;
    let ocrInterval = null;
    let vecInterval = null;

    const startOcrSim = () => {
      setFiles((prev) => prev.map((f) => f.id !== entry.id ? f : ({ ...f, stages: { ...f.stages, ocr: "active" } })));
      ocrInterval = setInterval(() => {
        ocrPct = Math.min(ocrPct + Math.random() * 18, 92);
        setFiles((prev) => prev.map((f) => f.id !== entry.id ? f : ({
          ...f,
          stages:   { ...f.stages, ocr: "active" },
          progress: { ...f.progress, ocr: Math.round(ocrPct) },
        })));
      }, 200);
    };

    const startVecSim = () => {
      ocrInterval && clearInterval(ocrInterval);
      setFiles((prev) => prev.map((f) => f.id !== entry.id ? f : ({
        ...f, stages: { ...f.stages, ocr: "active" }, progress: { ...f.progress, ocr: 100 }
      })));
      setTimeout(() => {
        setFiles((prev) => prev.map((f) => f.id !== entry.id ? f : ({
          ...f, stages: { ...f.stages, ocr: "done", vectorize: "active" }
        })));
        vecInterval = setInterval(() => {
          vecPct = Math.min(vecPct + Math.random() * 22, 92);
          setFiles((prev) => prev.map((f) => f.id !== entry.id ? f : ({
            ...f, progress: { ...f.progress, vectorize: Math.round(vecPct) }
          })));
        }, 150);
      }, 300);
    };

    const ocrSimTimeout = setTimeout(startOcrSim, 800);
    const vecSimTimeout = setTimeout(startVecSim, 2000);

    try {
      const response = await uploadDocument(
        entry.rawFile,
        (pct) => {
          setFiles((prev) => prev.map((f) => f.id !== entry.id ? f : ({
            ...f,
            stages:   { ...f.stages, upload: pct >= 100 ? "done" : "active" },
            progress: { ...f.progress, upload: pct },
          })));
        }
      );

      clearTimeout(ocrSimTimeout);
      clearTimeout(vecSimTimeout);
      ocrInterval && clearInterval(ocrInterval);
      vecInterval && clearInterval(vecInterval);

      // Populate from real server response: { message, doc_id, owner }
      // ocrText and ocrConfidence populated if your endpoint returns them
      setFiles((prev) => prev.map((f) => f.id !== entry.id ? f : ({
        ...f,
        stages:        { upload: "done", ocr: "done", vectorize: "done" },
        progress:      { upload: 100, ocr: 100, vectorize: 100 },
        done:          true,
        error:         null,
        docId:         response.doc_id   || null,
        owner:         response.owner    || null,
        message:       response.message  || null,
        ocrText:       response.ocr_text || null,
        ocrConfidence: response.ocr_confidence || null,
      })));

    } catch (err) {
      clearTimeout(ocrSimTimeout);
      clearTimeout(vecSimTimeout);
      ocrInterval && clearInterval(ocrInterval);
      vecInterval && clearInterval(vecInterval);

      setFiles((prev) => prev.map((f) => f.id !== entry.id ? f : ({
        ...f,
        stages: {
          upload:    f.progress.upload < 100 ? "error" : "done",
          ocr:       ocrPct > 0 ? "error" : "pending",
          vectorize: "pending",
        },
        error: err.message,
        done:  false,
      })));
    }
  }, [updateFile]);

  const addFiles = (rawFiles) => {
    const entries = Array.from(rawFiles)
      .filter((f) => f.type === "application/pdf" || f.type.startsWith("image/"))
      .slice(0, 10)
      .map(makeFileEntry);
    setFiles((prev) => [...prev, ...entries]);
    entries.forEach((e) => startUpload(e));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const completedCount  = files.filter((f) => f.done).length;
  const processingCount = files.filter((f) => !f.done && !f.error).length;

  return (
    <div className="app-shell">
      <Sidebar active="Upload Center" username={username} initials={initials} />

      <div className="main-content">
        <header className="page-header">
          <div>
            <div className="page-title">Upload Center</div>
            <div className="page-subtitle">
              Upload documents to index and query with AI
              {processingCount > 0 && (
                <span style={{ marginLeft: 8, color: "var(--accent-violet)" }}>
                  · {processingCount} processing
                </span>
              )}
            </div>
          </div>
          <div className="header-right">
            <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode(d => !d)} />
            {completedCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, background: "rgba(34,211,160,0.1)", border: "1px solid rgba(34,211,160,0.25)" }}>
                <span className="status-dot success" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--status-success)" }}>{completedCount} indexed</span>
              </div>
            )}
          </div>
        </header>

        <main className="page-body">
          <div style={{ display: "grid", gridTemplateColumns: validationFile ? "1fr 380px" : "1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onClick={() => fileInputRef.current?.click()}
                className="anim-up"
                style={{
                  border: `2px dashed ${dragActive ? "var(--accent-blue)" : "var(--border-default)"}`,
                  borderRadius: "var(--radius-xl)", padding: "48px 32px",
                  textAlign: "center", cursor: "pointer",
                  transition: "all var(--t-normal)",
                  background: dragActive ? "var(--surface-active)" : "var(--surface-2)",
                  boxShadow: dragActive ? "var(--shadow-glow)" : "var(--shadow-card)",
                  position: "relative", overflow: "hidden",
                }}
              >
                <div style={{ position: "relative" }}>
                  <div style={{ fontSize: 52, marginBottom: 16, transition: "filter 0.2s", animation: dragActive ? "bounce 0.5s infinite" : "none" }}>
                    {dragActive ? "📂" : "📁"}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                    {dragActive ? "Release to Upload" : "Drop Files Here"}
                  </div>
                  <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 22 }}>
                    PDF, PNG, JPG · Up to 50 MB per file
                  </div>
                  <button className="btn btn-primary"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    Browse Files
                  </button>

                  {/* Pipeline stage legend */}
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
                    {STAGES.map((s, i) => (
                      <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {i > 0 && <div style={{ width: 18, height: 1, background: "var(--border-subtle)" }} />}
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--surface-active)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                          {s.icon}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
                />
              </div>

              {/* File Cards */}
              {files.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                      Processing Queue ({files.length})
                    </div>
                    {completedCount > 0 && (
                      <Link to="/vault" className="btn btn-ghost btn-sm">View in Vault →</Link>
                    )}
                  </div>

                  {files.map((file, idx) => (
                    <div key={file.id} className="card anim-up" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="card-inner">

                        {/* File info */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 42, height: 50, borderRadius: 8, flexShrink: 0, background: "var(--surface-active)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                            📄
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {file.name}
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 10 }}>
                              <span>{file.size}</span>
                              {file.docId && (
                                <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-blue)", fontSize: 11 }}>
                                  id: {file.docId.slice(0, 8)}…
                                </span>
                              )}
                              {file.owner && (
                                <span style={{ color: "var(--text-dim)", fontSize: 11 }}>
                                  owner: {file.owner}
                                </span>
                              )}
                            </div>
                          </div>
                          {file.done  && <span className="badge badge-success">✓ Indexed</span>}
                          {file.error && <span className="badge badge-error">Failed</span>}
                          {!file.done && !file.error && <span className="badge badge-purple">Processing</span>}
                        </div>

                        {/* Error banner */}
                        {file.error && (
                          <div style={{ background: "rgba(255,92,122,0.08)", border: "1px solid rgba(255,92,122,0.25)", borderRadius: "var(--radius-sm)", padding: "9px 12px", marginBottom: 12, fontSize: 12.5, color: "var(--status-error)" }}>
                            ⚠ {file.error}
                          </div>
                        )}

                        {/* Three-stage pipeline */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {STAGES.map((stage) => {
                            const st  = file.stages[stage.key];
                            const col = STAGE_COLORS[st];
                            const pct = file.progress[stage.key];
                            return (
                              <div key={stage.key}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                                  <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: col.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, border: `1px solid ${col.color}40`, transition: "all 0.3s" }}>
                                    {st === "done" ? "✓" : st === "error" ? "✗" : st === "active" ? "⟳" : stage.icon}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: col.color }}>{stage.desc}</span>
                                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: col.color }}>{pct}%</span>
                                    </div>
                                    <div className="progress-track">
                                      <div className="progress-fill" style={{
                                        width: `${pct}%`,
                                        background: st === "done"
                                          ? "linear-gradient(90deg, var(--status-success), var(--accent-teal))"
                                          : st === "error"
                                          ? "var(--status-error)"
                                          : "linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))",
                                      }} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Server response message */}
                        {file.done && file.message && (
                          <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(34,211,160,0.06)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(34,211,160,0.2)", fontSize: 12, color: "var(--status-success)" }}>
                            ✓ {file.message}
                          </div>
                        )}

                        {/* Actions */}
                        {file.done && (
                          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8 }}>
                            {(file.ocrText || file.ocrConfidence) && (
                              <button className="btn btn-secondary btn-sm" onClick={() => setValidFile(file)}>
                                🔍 Validate Extraction
                              </button>
                            )}
                            <Link to="/vault" className="btn btn-ghost btn-sm">View in Vault</Link>
                            <Link to="/chat"  className="btn btn-ghost btn-sm">Ask AI →</Link>
                          </div>
                        )}
                        {file.error && (
                          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => startUpload(file)}>
                              ↺ Retry Upload
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Validation Panel — only shown when server returns ocr_text */}
            {validationFile && (
              <div style={{ position: "sticky", top: "calc(var(--header-height) + 26px)" }}>
                <div className="card anim-scale">
                  <div className="card-header">
                    <span className="card-title">Extraction Validation</span>
                    <button className="btn btn-ghost btn-icon" style={{ fontSize: 14 }} onClick={() => setValidFile(null)}>✕</button>
                  </div>
                  <div className="card-inner">
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                        {validationFile.name}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span className="badge badge-success">OCR Complete</span>
                        {validationFile.docId && (
                          <span className="badge badge-info" style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>
                            doc_id: {validationFile.docId.slice(0, 12)}…
                          </span>
                        )}
                      </div>
                    </div>

                    {validationFile.owner && (
                      <div style={{ marginBottom: 12, padding: "8px 12px", background: "var(--surface-3)", borderRadius: "var(--radius-sm)", fontSize: 11.5, color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}>
                        <span>Owner: </span>
                        <span style={{ color: "var(--accent-blue)", fontFamily: "var(--font-mono)" }}>{validationFile.owner}</span>
                      </div>
                    )}

                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
                      Extracted Text
                    </div>
                    <div style={{ background: "var(--surface-3)", borderRadius: "var(--radius-md)", padding: 12, fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-secondary)", lineHeight: 1.7, maxHeight: 260, overflowY: "auto", border: "1px solid var(--border-subtle)", whiteSpace: "pre-wrap" }}>
                      {validationFile.ocrText || "No extracted text returned by the server."}
                    </div>

                    {/* OCR confidence — only shown if server returns it */}
                    {validationFile.ocrConfidence != null && (
                      <div style={{ marginTop: 14, padding: 12, background: "var(--surface-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>OCR Confidence</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--status-success)", fontWeight: 600 }}>
                            {validationFile.ocrConfidence}%
                          </span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${validationFile.ocrConfidence}%`, background: "linear-gradient(90deg, var(--status-success), var(--accent-teal))" }} />
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                      <Link to="/chat" className="btn btn-primary" style={{ flex: 1, justifyContent: "center", fontSize: 12 }}>
                        Ask AI about this →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes bounce  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  );
}