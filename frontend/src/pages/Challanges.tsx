import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import type { Challenge, ChallengeType, User } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "../components/Avatar";

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function weekFromToday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const STATUS_LABEL: Record<Challenge["status"], string> = {
  upcoming: "Upcoming",
  active: "Active",
  completed: "Completed",
};

export function Challenges() {
  const { currentUser } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<ChallengeType>("volume");
  const [exerciseName, setExerciseName] = useState("");
  const [startDate, setStartDate] = useState(todayLocal());
  const [endDate, setEndDate] = useState(weekFromToday());
  const [participantIds, setParticipantIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.listChallenges(), api.getUsers()])
      .then(([c, u]) => {
        setChallenges(c);
        setUsers(u);
      })
      .finally(() => setLoading(false));
  };

  const members = users.filter((user) => user.role === "member");

  // if (members.length === 0) {
  //   return <p className="empty-state">No one's registered yet.</p>;
  // }

  useEffect(load, []);

  const toggleParticipant = (id: number) => {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (participantIds.length < 2) {
      setError("Pick at least 2 participants.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createChallenge({
        name: name.trim() || (type === "exercise" ? exerciseName : "Challenge"),
        type,
        exercise_name: type === "exercise" ? exerciseName.trim() : undefined,
        start_date: startDate,
        end_date: endDate,
        participant_user_ids: participantIds,
      });
      setName("");
      setExerciseName("");
      setParticipantIds([]);
      setShowForm(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't create that challenge — try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div>
      <div className="log-form-header">
        <h2 className="section-label">Challenges</h2>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? "Cancel" : "+ New challenge"}
        </button>
      </div>

      {showForm && (
        <form className="log-form challenge-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bench Showdown, September Volume War…"
            />
          </label>

          <label className="field">
            <span>Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ChallengeType)}
            >
              <option value="volume">Volume race — total kg lifted</option>
              <option value="exercise">Exercise showdown — best weight on one lift</option>
              <option value="consistency">Consistency race — days trained</option>
            </select>
          </label>

          {type === "exercise" && (
            <label className="field">
              <span>Exercise</span>
              <input
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                placeholder="Bench Press"
                list="exercise-suggestions"
                required
              />
            </label>
          )}

          <div className="field-grid">
            <label className="field">
              <span>Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>End date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
          </div>

          <span className="section-label">Participants</span>
          <div className="participant-picker">
            {members.map((u) => (
              <label key={u.id} className="participant-option">
                <input
                  type="checkbox"
                  checked={participantIds.includes(u.id)}
                  onChange={() => toggleParticipant(u.id)}
                />
                {u.name}
              </label>
            ))}
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? "Creating…" : "Create challenge"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="empty-state">Loading challenges…</p>
      ) : challenges.length === 0 ? (
        <p className="empty-state">No challenges yet — start one above.</p>
      ) : (
        <div className="session-list">
          {challenges.map((c) => (
            <Link to={`/challenges/${c.id}`} className="challenge-card" key={c.id}>
              <div className="challenge-card-top">
                <h3>{c.name}</h3>
                <span className={`challenge-status challenge-status-${c.status}`}>
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
              <span className="session-meta">
                {c.start_date} → {c.end_date}
              </span>
              <div className="challenge-participants">
                {c.participants.map((p) => (
                  <Avatar key={p.id} user={p} size={26} />
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}