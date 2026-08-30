import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Avatar } from "../components/Avatar";
import type { Leaderboard } from "../api/types";
import { useAuth } from "../context/AuthContext";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const TYPE_LABEL: Record<string, string> = {
  volume: "Volume race",
  exercise: "Exercise showdown",
  consistency: "Consistency race",
};

export function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getLeaderboard(Number(id))
      .then(setBoard)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="empty-state">Loading challenge…</p>;
  if (!board || !id) {
    return (
      <div className="empty-state">
        <p>Couldn't find that challenge.</p>
        <p className="empty-state-sub">
          <Link to="/challenges">Back to challenges</Link>
        </p>
      </div>
    );
  }

  const { challenge, entries } = board;
  const canDelete =
    !!currentUser &&
    (currentUser.role === "admin" || currentUser.id === challenge.created_by);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteChallenge(challenge.id);
      navigate("/challenges");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <Link to="/challenges" className="back-link">
        ← All challenges
      </Link>

      <div className="log-form-header">
        <h2>{challenge.name}</h2>
        <span className={`challenge-status challenge-status-${challenge.status}`}>
          {challenge.status}
        </span>
      </div>

      <p className="session-meta challenge-meta">
        {TYPE_LABEL[challenge.type]}
        {challenge.exercise_name ? ` · ${challenge.exercise_name}` : ""}
        {" · "}
        {challenge.start_date} → {challenge.end_date}
      </p>

      <div className="leaderboard">
        {entries.map((e) => (
          <div
            key={e.user.id}
            className={`leaderboard-row ${e.is_leader ? "leaderboard-row-leader" : ""}`}
          >
            <span className="leaderboard-rank">
              {MEDALS[e.rank] ?? `#${e.rank}`}
            </span>
            <Avatar user={e.user} size={32} />
            <span className="leaderboard-name">{e.user.name}</span>
            <span className="leaderboard-score">
              {e.score} {e.unit}
            </span>
          </div>
        ))}
      </div>

      {canDelete && (
        <button
          type="button"
          className="ghost-btn danger"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting…" : "Delete challenge"}
        </button>
      )}
    </div>
  );
}