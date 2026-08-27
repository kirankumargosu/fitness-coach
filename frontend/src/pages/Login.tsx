import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(name.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="app-brand auth-brand">
          <span className="app-brand-mark" aria-hidden="true" />
          <h1>Fitness Coach</h1>
        </div>
        <h2 className="auth-heading">Log in</h2>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          First time? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}