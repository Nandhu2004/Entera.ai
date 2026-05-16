// ============================================================
// api.js — DocuVault API Service
// ============================================================

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── Token helpers ────────────────────────────────────────────
export const getToken     = ()                       => localStorage.getItem("token") || localStorage.getItem("access_token");
export const getUsername  = ()                       => localStorage.getItem("username");
export const getUserEmail = ()                       => localStorage.getItem("user_email");
export const setAuth      = (token, username, email) => {
  localStorage.setItem("access_token", token);
  localStorage.setItem("username",     username);
  localStorage.setItem("user_email",   email);
};
export const clearAuth    = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("username");
  localStorage.removeItem("user_email");
};
export const isLoggedIn   = () => !!getToken();

export const requireAuth  = (navigate) => {
  if (!getToken()) { navigate("/signin"); return false; }
  return true;
};

// ── Shared fetch wrapper ─────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    clearAuth();
    window.location.href = "/signin";
    throw new Error("Session expired. Please sign in again.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

// ── Auth endpoints ───────────────────────────────────────────

/**
 * POST /signup
 * Body: FormData { username, email, password }
 * Returns: { message }
 */
export async function signup({ username, email, password }) {
  const form = new FormData();
  form.append("username", username);
  form.append("email",    email);
  form.append("password", password);
  return apiFetch("/signup", { method: "POST", body: form });
}

/**
 * POST /token
 * Body: FormData { email, password }
 * Returns: { access_token, token_type, username }
 */
export async function login({ email, password }) {
  const form = new FormData();
  form.append("email",    email);
  form.append("password", password);
  const data = await apiFetch("/token", { method: "POST", body: form });
  setAuth(data.access_token, data.username, email);
  return data;
}

/**
 * GET /verify?token=<token>
 * Returns: { message }
 */
export async function verifyEmail(token) {
  return apiFetch(`/verify?token=${encodeURIComponent(token)}`, { method: "GET" });
}

// ── Document endpoints ───────────────────────────────────────

/**
 * POST /upload
 * Header: Authorization: Bearer <token>  (attached if present; server enforces auth)
 * Body: FormData { file: <File> }
 * Returns: { message, doc_id, owner }
 *
 * Uses XHR instead of fetch so we get real byte-level upload progress.
 * onProgress(pct: number) is called as bytes are sent.
 */
export async function uploadDocument(file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}/upload`);

    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      console.log("[upload] status:", xhr.status, "response:", xhr.responseText.slice(0, 200));
      if (xhr.status === 401 || xhr.status === 403) {
        // Only redirect on auth failure — log first so we can confirm it's genuine
        console.warn("[upload] Auth failure — clearing session and redirecting");
        clearAuth();
        window.location.href = "/signin";
        reject(new Error("Session expired"));
        return;
      }
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.detail || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error("Invalid response from server"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

/**
 * POST /ask
 * Header: Authorization: Bearer <token>
 * Body: FormData { question }
 * Returns: RAG result — shape depends on qa_chain implementation.
 *   Typical: { answer, sources: [{ doc_id, filename, page, snippet }] }
 */
export async function askQuestion(question) {
  const form = new FormData();
  form.append("question", question);
  return apiFetch("/ask", { method: "POST", body: form });
}

// ── Utility ──────────────────────────────────────────────────

export function getUserInitials() {
  const name = getUsername() || "?";
  return name.split(" ").map((w) => w[0]?.toUpperCase()).slice(0, 2).join("");
}