import React, { useEffect, useState, useCallback } from "react";
import "./App.css";

// ------------------------------
// API CONFIG
// ------------------------------
const API_BASE = process.env.REACT_APP_API_BASE || "/api";

// Utility: get auth token from localStorage
function getAuthToken() {
  return window.localStorage.getItem("notemaster_token");
}

// Utility: clean minimal fetch wrapper for API with error handling
async function apiFetch(path, { method = "GET", body = null, token } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.message || "API Error");
  return data;
}

// ------------------------------
// AUTH LOGIC
// ------------------------------
function useAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Optionally: implement 'me' endpoint fetching user info
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      return;
    }
    apiFetch("/user/me/", { token })
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const login = async (username, password) => {
    const data = await apiFetch("/auth/login/", {
      method: "POST",
      body: { username, password },
    });
    if (data.token) {
      window.localStorage.setItem("notemaster_token", data.token);
      setUser(data.user);
    } else {
      throw new Error(data.detail || "Auth failed");
    }
  };

  const register = async (username, password) => {
    await apiFetch("/auth/register/", {
      method: "POST",
      body: { username, password },
    });
  };

  const logout = () => {
    window.localStorage.removeItem("notemaster_token");
    setUser(null);
  };

  return { user, login, register, logout, setUser };
}

// ------------------------------
// MAIN APP
// ------------------------------
function App() {
  const [theme] = useState("light"); // Minimal theme logic for now, could be extended
  const { user, login, register, logout, setUser } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  // Only show login/register if not authenticated
  if (!user) {
    return (
      <div className="auth-bg">
        <div className="auth-center-container">
          <div className="auth-box">
            <Logo />
            {showRegister ? (
              <RegisterForm
                onRegister={async (u, p) => {
                  await register(u, p);
                  setShowRegister(false);
                }}
                onSwitchLogin={() => setShowRegister(false)}
              />
            ) : (
              <LoginForm
                onLogin={async (u, p) => {
                  await login(u, p);
                  window.location.reload(); // quick refresh to re-fetch user state
                }}
                onSwitchRegister={() => setShowRegister(true)}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-app-root" data-theme={theme}>
      <Sidebar user={user} logout={logout} />
      <MainPanel token={getAuthToken()} setUser={setUser} />
    </div>
  );
}

// ------------------------------
// LOGO & TOPBAR
// ------------------------------
function Logo() {
  return (
    <div className="logo-row">
      <span className="brand-logo" aria-label="logo">
        📝
      </span>
      <span className="brand-title">NoteMaster</span>
    </div>
  );
}

function TopBar({ user, onLogout, onSearch, searchVal, onSearchChange }) {
  return (
    <header className="topbar">
      <Logo />
      <div className="search-bar-container">
        <input
          className="search-bar"
          type="text"
          placeholder="Search notes..."
          value={searchVal}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>
      <div className="user-section">
        <span className="username">{user.username}</span>
        <button className="btn-light" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

// ------------------------------
// SIDEBAR
// ------------------------------
function Sidebar({ user, logout }) {
  return (
    <aside className="sidebar">
      <Logo />
      <div className="sidebar-bottom">
        <span className="sidebar-user">{user?.username}</span>
        <button className="btn-sidebar" onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
}

// ------------------------------
// NOTE PANEL (Main Area & List)
// ------------------------------
function MainPanel({ token }) {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // Fetch notes
  const fetchNotes = useCallback(() => {
    setLoading(true);
    apiFetch(`/notes/?q=${encodeURIComponent(search)}`, { token })
      .then((data) => setNotes(Array.isArray(data) ? data : []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [token, search]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // For minimal responsiveness, re-fetch on search or edit
  const handleCreate = () => {
    setSelectedNote(null);
    setCreating(true);
    setErrMsg("");
  };

  const handleEdit = (note) => {
    setSelectedNote(note);
    setCreating(false);
    setErrMsg("");
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm("Delete this note?")) return;
    setLoading(true);
    try {
      await apiFetch(`/notes/${noteId}/`, { method: "DELETE", token });
      setNotes(notes.filter((n) => n.id !== noteId));
      setSelectedNote(null);
    } catch (err) {
      setErrMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (note) => {
    setLoading(true);
    setErrMsg("");
    try {
      if (note.id) {
        // Update
        const updated = await apiFetch(`/notes/${note.id}/`, {
          method: "PUT",
          body: { ...note },
          token,
        });
        setNotes((old) =>
          old.map((n) => (n.id === note.id ? updated : n))
        );
        setSelectedNote(updated);
      } else {
        // Create
        const created = await apiFetch(`/notes/`, {
          method: "POST",
          body: { ...note },
          token,
        });
        setNotes((old) => [created, ...old]);
        setSelectedNote(created);
        setCreating(false);
      }
    } catch (e) {
      setErrMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-area">
      <TopBar
        user={{ username: window.localStorage.getItem("notemaster_username") }}
        onLogout={() => {
          window.localStorage.removeItem("notemaster_token");
          window.location.reload();
        }}
        searchVal={search}
        onSearchChange={(v) => setSearch(v)}
      />
      <section className="notes-section">
        <div className="note-list-panel">
          <div className="note-list-header">
            <h2>Your Notes</h2>
            <button className="btn-accent" onClick={handleCreate}>
              + New Note
            </button>
          </div>
          {loading ? (
            <div className="loading">Loading notes...</div>
          ) : (
            <NoteList
              notes={notes}
              onSelect={handleEdit}
              selectedNote={selectedNote}
              search={search}
            />
          )}
        </div>
        <div className="note-editor-panel">
          {errMsg && <div className="error-banner">{errMsg}</div>}
          {(creating || selectedNote) ? (
            <NoteEditor
              note={creating ? { title: "", content: "" } : selectedNote}
              onSave={handleSave}
              onCancel={() => {
                setSelectedNote(null);
                setCreating(false);
                setErrMsg("");
              }}
              onDelete={selectedNote ? () => handleDelete(selectedNote.id) : null}
            />
          ) : (
            <div className="empty-state">
              <span role="img" aria-label="notes">🗒️</span>
              <p>Select or create a note to get started.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ------------------------------
// NOTE LIST
// ------------------------------
function NoteList({ notes, onSelect, selectedNote, search }) {
  if (!notes || !notes.length) {
    return <div className="no-notes-msg">No notes found.</div>;
  }
  // If there's a search term, highlight it in results
  return (
    <ul className="note-list">
      {notes.map((note) => (
        <li
          key={note.id}
          className={
            "note-list-item" +
            (selectedNote && note.id === selectedNote.id ? " selected" : "")
          }
          onClick={() => onSelect(note)}
        >
          <div className="note-title-row">
            <span className="note-title">
              {markSearch(note.title, search)}
            </span>
          </div>
          <div className="note-snippet">
            {markSearch(note.content.slice(0, 48), search)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function markSearch(text, search) {
  if (!search) return text;
  const idx = text.toLowerCase().indexOf(search.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="highlight">{text.slice(idx, idx + search.length)}</span>
      {text.slice(idx + search.length)}
    </>
  );
}

// ------------------------------
// NOTE EDITOR
// ------------------------------
function NoteEditor({ note, onSave, onCancel, onDelete }) {
  const [title, setTitle] = useState(note.title || "");
  const [content, setContent] = useState(note.content || "");
  useEffect(() => {
    setTitle(note.title || "");
    setContent(note.content || "");
  }, [note.id]); // Only reset fields if note changed

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;
    onSave({ id: note.id, title: title.trim(), content: content.trim() });
  };

  return (
    <form className="note-editor-form" onSubmit={handleSubmit}>
      <input
        className="note-title-input"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Title"
        maxLength={64}
        required
        autoFocus
      />
      <textarea
        className="note-content-input"
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Write your note here..."
        rows={12}
        required
      />
      <div className="note-editor-actions">
        <button className="btn-primary" type="submit">
          Save
        </button>
        <button className="btn-light" type="button" onClick={onCancel}>
          Cancel
        </button>
        {onDelete && (
          <button
            className="btn-secondary"
            type="button"
            onClick={onDelete}
            style={{ marginLeft: "auto" }}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

// ------------------------------
// AUTH FORMS
// ------------------------------
function LoginForm({ onLogin, onSwitchRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await onLogin(username.trim(), password);
      window.localStorage.setItem("notemaster_username", username.trim());
    } catch (er) {
      setErr(er.message || "Login failed");
    }
  };
  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Sign In</h2>
      <input
        className="auth-input"
        type="text"
        autoFocus
        autoComplete="username"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        required
        minLength={3}
      />
      <input
        className="auth-input"
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        minLength={4}
      />
      {err && <div className="auth-error">{err}</div>}
      <button className="btn-primary" type="submit">
        Login
      </button>
      <div className="auth-alt">
        <span>Don't have an account?</span>
        <button type="button" className="auth-link" onClick={onSwitchRegister}>
          Register
        </button>
      </div>
    </form>
  );
}

function RegisterForm({ onRegister, onSwitchLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccess(false);
    if (password !== pw2) {
      setErr("Passwords do not match");
      return;
    }
    try {
      await onRegister(username.trim(), password);
      setSuccess(true);
      setTimeout(onSwitchLogin, 1200);
    } catch (er) {
      setErr(er.message || "Registration failed");
    }
  };
  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Register</h2>
      <input
        className="auth-input"
        type="text"
        autoFocus
        autoComplete="username"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        required
        minLength={3}
      />
      <input
        className="auth-input"
        type="password"
        autoComplete="new-password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        minLength={4}
      />
      <input
        className="auth-input"
        type="password"
        autoComplete="new-password"
        placeholder="Confirm Password"
        value={pw2}
        onChange={e => setPw2(e.target.value)}
        required
        minLength={4}
      />
      {err && <div className="auth-error">{err}</div>}
      {success && <div className="auth-success">Registered! Redirecting...</div>}
      <button className="btn-primary" type="submit">
        Register
      </button>
      <div className="auth-alt">
        <span>Already have an account?</span>
        <button type="button" className="auth-link" onClick={onSwitchLogin}>
          Login
        </button>
      </div>
    </form>
  );
}

export default App;
