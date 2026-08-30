import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import type { DraftSet, SetKind } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useUsers } from "../context/UserContext";
import { WorkoutSubNav } from "../components/WorkoutSubNav";
// import { userColor } from "../lib/userColor";
import { ExerciseCombobox } from "../components/ExerciseCombobox";

function toLocalDatetimeInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function emptySet(setNumber: number, kind: SetKind = "strength"): DraftSet {
  return {
    kind,
    exercise_name: "",
    set_number: setNumber,
    reps: 8,
    weight: 0,
    weight_unit: "kg",
    duration_minutes: 20,
    distance: 0,
    distance_unit: "km",
  };
}

export function LogWorkout() {
  const { currentUser } = useAuth();
  const { activeUser, users, setActiveUser } = useUsers();
  const navigate = useNavigate();

  const isAdmin = currentUser?.role === "admin";
  // Members can only ever log for themselves. Admin can log for whoever
  // is currently selected in the header switch (defaults to themselves).
  const logTarget = isAdmin ? activeUser ?? currentUser : currentUser;

  // const [title, setTitle] = useState("");
  const [date, setDate] = useState(toLocalDatetimeInputValue(new Date()));
  // const [duration, setDuration] = useState<string>("");
  // const [notes, setNotes] = useState("");
  const [sets, setSets] = useState<DraftSet[]>([emptySet(1)]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSet = (index: number, patch: Partial<DraftSet>) => {
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  };

  const addSetRow = () => {
    const lastKind = sets[sets.length - 1]?.kind ?? "strength";
    setSets((prev) => [
      {
        ...emptySet(1, lastKind),
        exercise_name: "",
        reps: 0,
        weight: 0,
        duration_minutes: 0,
        distance: 0,
      },
      ...prev,
    ].map((s, i, rows) => ({ ...s, set_number: rows.length - i })));
  };

  const removeSetRow = (index: number) => {
    setSets((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i, rows) => ({ ...s, set_number: rows.length - i }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTarget) return;

    const validSets = sets.filter((s) => s.exercise_name.trim().length > 0);
    if (validSets.length === 0) {
      setError("Log at least one set with an exercise name.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const session = await api.createSession({
        user_id: logTarget.id,
        // title: title.trim() || undefined,
        date: new Date(date).toISOString(),
        // duration_minutes: duration ? Number(duration) : undefined,
        // notes: notes.trim() || undefined,
        sets: validSets.map((s) =>
          s.kind === "strength"
            ? {
              exercise_name: s.exercise_name,
              set_number: s.set_number,
              reps: s.reps,
              weight: s.weight,
              weight_unit: s.weight_unit,
            }
            : {
              exercise_name: s.exercise_name,
              set_number: s.set_number,
              duration_seconds: Math.round(s.duration_minutes * 60),
              distance: s.distance || undefined,
              distance_unit: s.distance_unit,
            }
        ),
      });
      navigate(`/history?session=${session.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't save that session — check the fields and try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!logTarget) {
    return <p className="empty-state">Loading lifters…</p>;
  }

  return (
     <>
      <WorkoutSubNav />
      <form className="log-form" onSubmit={handleSubmit}>
        <div className="log-form-header">
          <div className="log-form-title">
            <h2>Log a session</h2>
          </div>
          {isAdmin ? (
            <label className="field admin-target-picker">
              <span>Logging for</span>
              <select
                value={logTarget.id}
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
          )
            : ""
            //  (
            //   <span className="pill" style={{ borderColor: userColor(logTarget) }}>
            //     Logging for <strong>{logTarget.name}</strong>
            //   </span>
            // )
          }
        </div>

        <div className="field-grid">
          {/* <label className="field">
            <span>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Push day, Leg day, Morning run…"
            />
          </label> */}
          <label className="field date-field">
            <span>Date &amp; time</span>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>


          {/* <label className="field">
            <span>Duration (min)</span>
            <input
              type="number"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="60"
            />
          </label> */}
          
        </div>

        <div className="set-row-toggle-wrap"> 
          <button type="submit" className="secondary-btn" disabled={submitting}>
            {submitting ? "Saving…" : "Save session"}
          </button>
        </div>
        <h3 className="section-label">Sets</h3>
        <button type="button" className="ghost-btn" onClick={addSetRow}>
          + Add set
        </button>

        <div className="set-rows">
          {sets.map((s, i) => (
            <div className={`set-row set-row-${s.kind}`} key={i}>
              <div className="set-row-top">
                <span className="set-index">{s.set_number}</span>
                {/* <input
                  className="set-exercise"
                  placeholder={
                    s.kind === "strength"
                      ? "Exercise, e.g. Bench Press"
                      : "Activity, e.g. Jogging"
                  }
                  value={s.exercise_name}
                  onChange={(e) => updateSet(i, { exercise_name: e.target.value })}
                  list="exercise-suggestions"
                /> */}
                <ExerciseCombobox
                  value={s.exercise_name}
                  onChange={(name) => updateSet(i, { exercise_name: name })}
                  placeholder={
                    s.kind === "strength"
                      ? "Exercise, e.g. Bench Press"
                      : "Activity, e.g. Jogging"
                  }
                />
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => removeSetRow(i)}
                  aria-label="Remove set"
                  disabled={sets.length === 1}
                >
                  ✕
                </button>
              </div>

              <div className="set-row-toggle-wrap">
                <div className="set-kind-toggle" role="group" aria-label="Set type">
                  <button
                    type="button"
                    className={s.kind === "strength" ? "active" : ""}
                    onClick={() => updateSet(i, { kind: "strength" })}
                  >
                    Reps
                  </button>
                  <button
                    type="button"
                    className={s.kind === "cardio" ? "active" : ""}
                    onClick={() => updateSet(i, { kind: "cardio" })}
                  >
                    Time
                  </button>
                </div>
              </div>

              {s.kind === "strength" ? (
                <div className="set-row-fields">
                  <label className="set-field">
                    <span className="set-field-label">Weight</span>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min={0}
                        step="0.05"
                        value={s.weight}
                        onChange={(e) =>
                          updateSet(i, { weight: Number(e.target.value) })
                        }
                        aria-label="Weight"
                      />
                      <select
                        value={s.weight_unit}
                        onChange={(e) =>
                          updateSet(i, {
                            weight_unit: e.target.value as "kg" | "lb",
                          })
                        }
                        aria-label="Weight unit"
                      >
                        <option value="kg">kg</option>
                        <option value="lb">lb</option>
                      </select>
                    </div>
                  </label>
                  <label className="set-field">
                    <span className="set-field-label">Reps</span>
                    <input
                      className="set-num"
                      type="number"
                      min={0}
                      value={s.reps}
                      onChange={(e) =>
                        updateSet(i, { reps: Number(e.target.value) })
                      }
                      aria-label="Reps"
                    />
                  </label>
                </div>
              ) : (
                <div className="set-row-fields">
                  <label className="set-field">
                    <span className="set-field-label">Duration</span>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min={0}
                        value={s.duration_minutes}
                        onChange={(e) =>
                          updateSet(i, {
                            duration_minutes: Number(e.target.value),
                          })
                        }
                        aria-label="Duration in minutes"
                      />
                      <span className="input-unit-fixed">min</span>
                    </div>
                  </label>
                  <label className="set-field">
                    <span className="set-field-label">Distance</span>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={s.distance}
                        onChange={(e) =>
                          updateSet(i, { distance: Number(e.target.value) })
                        }
                        aria-label="Distance"
                      />
                      <select
                        value={s.distance_unit}
                        onChange={(e) =>
                          updateSet(i, {
                            distance_unit: e.target.value as "km" | "mi",
                          })
                        }
                        aria-label="Distance unit"
                      >
                        <option value="km">km</option>
                        <option value="mi">mi</option>
                      </select>
                    </div>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}

      </form>
    </>
  );
}