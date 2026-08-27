import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { WorkoutSession, WorkoutSessionSummary } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useUsers } from "../context/UserContext";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMeasure(s: WorkoutSession["sets"][number]): string {
  const parts: string[] = [];
  if (s.reps !== null) {
    parts.push(
      s.weight !== null ? `${s.reps} reps @ ${s.weight} ${s.weight_unit}` : `${s.reps} reps`
    );
  }
  if (s.duration_seconds !== null) {
    const minutes = Math.round(s.duration_seconds / 60);
    parts.push(
      s.distance !== null
        ? `${minutes} min · ${s.distance} ${s.distance_unit}`
        : `${minutes} min`
    );
  }
  return parts.join(" · ") || "—";
}

function SessionDetail({
  sessionId,
  canEdit,
  onDeleted,
}: {
  sessionId: number;
  canEdit: boolean;
  onDeleted: () => void;
}) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.getSession(sessionId).then(setSession);
  }, [sessionId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteSession(sessionId);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  if (!session) return <p className="empty-state">Loading…</p>;

  const byExercise = new Map<string, typeof session.sets>();
  for (const s of session.sets) {
    const key = s.exercise.name;
    byExercise.set(key, [...(byExercise.get(key) ?? []), s]);
  }

  return (
    <div className="session-detail">
      {session.notes && <p className="session-notes">"{session.notes}"</p>}
      {[...byExercise.entries()].map(([name, entries]) => (
        <div className="exercise-block" key={name}>
          <h4>{name}</h4>
          <table className="set-table">
            <thead>
              <tr>
                <th>Set</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((s) => (
                <tr key={s.id}>
                  <td>{s.set_number}</td>
                  <td>{formatMeasure(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {canEdit ? (
        <button
          type="button"
          className="ghost-btn danger"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting…" : "Delete session"}
        </button>
      ) : (
        <p className="view-only-note">View only — this isn't your data.</p>
      )}
    </div>
  );
}

export function History() {
  const { currentUser } = useAuth();
  const { activeUser, users, setActiveUser } = useUsers();
  const [sessions, setSessions] = useState<WorkoutSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const expandedId = searchParams.get("session")
    ? Number(searchParams.get("session"))
    : null;

  const isAdmin = currentUser?.role === "admin";
  // Members only ever see their own history. Admin can browse anyone's,
  // via the picker below, defaulting to themselves.
  const viewedUser = isAdmin ? activeUser ?? currentUser : currentUser;

  const canEdit =
    !!currentUser && !!viewedUser && (isAdmin || currentUser.id === viewedUser.id);

  const load = () => {
    if (!viewedUser) return;
    setLoading(true);
    api
      .listSessions({ userId: viewedUser.id })
      .then(setSessions)
      .finally(() => setLoading(false));
  };

  useEffect(load, [viewedUser]);

  const toggle = (id: number) => {
    setSearchParams(expandedId === id ? {} : { session: String(id) });
  };

  if (!viewedUser) return null;

  return (
    <div>
      {isAdmin && (
        <label className="field admin-target-picker history-picker">
          <span>Viewing</span>
          <select
            value={viewedUser.id}
            onChange={(e) => {
              const picked = users.find((u) => u.id === Number(e.target.value));
              if (picked) setActiveUser(picked);
            }}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {loading ? (
        <p className="empty-state">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <p>No sessions logged yet for {viewedUser.name}.</p>
          {canEdit && (
            <p className="empty-state-sub">Head to "Log workout" to add the first one.</p>
          )}
        </div>
      ) : (
        <div className="session-list">
          {sessions.map((s) => (
            <div className="session-card" key={s.id}>
              <button
                type="button"
                className="session-card-header"
                onClick={() => toggle(s.id)}
                aria-expanded={expandedId === s.id}
              >
                <div>
                  <h3>{formatDate(s.date)}</h3>
                  <span className="session-meta">{s.title || "Workout"}</span>
                </div>
                <div className="session-stats">
                  <span>{s.set_count} sets</span>
                  {s.total_volume > 0 ? (
                    <span>{Math.round(s.total_volume)} vol</span>
                  ) : null}
                  {s.duration_minutes ? <span>{s.duration_minutes} min</span> : null}
                </div>
              </button>
              {expandedId === s.id && (
                <SessionDetail sessionId={s.id} canEdit={canEdit} onDeleted={load} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}