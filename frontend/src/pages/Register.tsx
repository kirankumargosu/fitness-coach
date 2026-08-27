import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 4) {
      setError("Password needs to be at least 4 characters.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Name needs to be at least 2 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await register(name.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't register.");
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
        <h2 className="auth-heading">Create an account</h2>
        {/* <p className="auth-hint">Anyone can join — just pick a name and password.</p> */}

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Your name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={50}
              required
              autoFocus
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span>Choose a password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={4}
              required
              autoComplete="new-password"
            />
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={4}
              required
              autoComplete="new-password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}