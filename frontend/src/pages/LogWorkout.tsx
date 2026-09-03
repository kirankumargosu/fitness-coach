import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import type { DraftSetRow, ExerciseBlock, SetKind, WorkoutSession } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useUsers } from "../context/UserContext";
// import { userColor } from "../lib/userColor";
import { WorkoutSubNav } from "../components/WorkoutSubNav";
import { ExerciseCombobox } from "../components/ExerciseCombobox";

function toLocalDatetimeInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
 
function emptyRow(): DraftSetRow {
  return {
    reps: 8,
    weight: 0,
    weight_unit: "kg",
    duration_minutes: 20,
    distance: 0,
    distance_unit: "km",
  };
}

function emptyBlock(kind: SetKind = "strength"): ExerciseBlock {
  return { exercise_name: "", kind, rows: [emptyRow()] };
}

/** Turns a saved session's flat, backend-ordered set list back into the
 * grouped-by-exercise shape the form edits. Rows are ordered highest
 * set_number first, matching this form's "newest row at the top" display
 * convention — so a loaded row's displayed number always equals its true
 * saved set_number, with no relabeling. */
function blocksFromSession(session: WorkoutSession): ExerciseBlock[] {
  const order: string[] = [];
  const byExercise = new Map<string, WorkoutSession["sets"]>();
  for (const s of session.sets) {
    const key = s.exercise.name;
    if (!byExercise.has(key)) {
      byExercise.set(key, []);
      order.push(key);
    }
    byExercise.get(key)!.push(s);
  }
 
  return order.map((name) => {
    const setsForExercise = [...byExercise.get(name)!].sort(
      (a, b) => b.set_number - a.set_number
    );
    const kind: SetKind = setsForExercise[0].reps !== null ? "strength" : "cardio";
    return {
      exercise_name: name,
      kind,
      rows: setsForExercise.map((s) => ({
        reps: s.reps ?? 8,
        weight: s.weight ?? 0,
        weight_unit: (s.weight_unit as "kg" | "lb") ?? "kg",
        duration_minutes: s.duration_seconds ? s.duration_seconds / 60 : 20,
        distance: s.distance ?? 0,
        distance_unit: (s.distance_unit as "km" | "mi") ?? "km",
      })),
    };
  });
}

// Unsaved session state survives navigating away and back (and even a
// page reload) by mirroring it into localStorage as it changes, keyed
// per logging-target user so an admin switching who they're logging for
// doesn't see someone else's in-progress draft.
function draftKey(userId: number): string {
  return `fitness-coach-draft-session-${userId}`;
}

interface DraftState {
  date: string;
  blocks: ExerciseBlock[];
}
 
function loadDraft(userId: number): DraftState | null {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.blocks) || typeof parsed.date !== "string") {
      return null;
    }
    return parsed as DraftState;
  } catch {
    return null;
  }
}

function saveDraft(userId: number, date: string, blocks: ExerciseBlock[]): void {
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify({ date, blocks }));
  } catch {
    // Storage full or unavailable — drafts are a convenience, not
    // critical, so just skip silently rather than breaking logging.
  }
}
 
function clearDraft(userId: number): void {
  try {
    localStorage.removeItem(draftKey(userId));
  } catch {
    // ignore
  }
}


export function LogWorkout() {
  const { currentUser } = useAuth();
  const { activeUser, users, setActiveUser } = useUsers();
  const navigate = useNavigate();
 
  const isAdmin = currentUser?.role === "admin";
  // Members can only ever log for themselves. Admin can log for whoever
  // is currently selected in the header switch (defaults to themselves).
  const logTarget = isAdmin ? activeUser ?? currentUser : currentUser;
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
 
  // const [title, setTitle] = useState("");
  const [date, setDate] = useState(toLocalDatetimeInputValue(new Date()));
  // const [duration, setDuration] = useState<string>("");
  // const [notes, setNotes] = useState("");
  // Sets are grouped by exercise: pick the exercise once, add as many
  // sets under it as you did, then move to the next exercise. No more
  // reselecting the same exercise for every single set.
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([emptyBlock()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydratedForUserId = useRef<number | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  // The form doesn't expose title/duration/notes fields, but an edited
  // session might already have them set — carry them through unchanged
  // rather than wiping them out on save.
  const [carriedTitle, setCarriedTitle] = useState<string | undefined>(undefined);
  const [carriedDuration, setCarriedDuration] = useState<number | undefined>(undefined);
  const [carriedNotes, setCarriedNotes] = useState<string | undefined>(undefined);
 
  // Restore a saved draft (or reset to blank) whenever we land on this
  // page for a given logging target — runs before paint so there's no
  // flash of the empty form. useLayoutEffect rather than useEffect
  // specifically to avoid that flicker.
  useLayoutEffect(() => {
    if (!logTarget) return;
    if (editId) return; // editing an existing session — don't load the new-session draft
    if (hydratedForUserId.current === logTarget.id) return;
    const draft = loadDraft(logTarget.id);
    if (draft) {
      setDate(draft.date);
      setBlocks(draft.blocks);
    } else {
      setDate(toLocalDatetimeInputValue(new Date()));
      setBlocks([emptyBlock()]);
    }
    hydratedForUserId.current = logTarget.id;
  }, [logTarget?.id, editId]);

  // Mirror every change into localStorage — but only once hydration above
  // has run for this user, and never while editing an existing session
  // (that would clobber the separate new-session draft with edit data).
  useEffect(() => {
    if (!logTarget) return;
    if (editingSessionId !== null) return;
    if (hydratedForUserId.current !== logTarget.id) return;
    saveDraft(logTarget.id, date, blocks);
  }, [logTarget?.id, date, blocks, editingSessionId]);

    // Load the session to edit whenever ?edit=<id> is present.
  useEffect(() => {
    if (!editId) {
      setEditingSessionId(null);
      return;
    }
    setLoadingEdit(true);
    api
      .getSession(Number(editId))
      .then((session) => {
        setEditingSessionId(session.id);
        setDate(toLocalDatetimeInputValue(new Date(session.date)));
        setBlocks(blocksFromSession(session));
        setCarriedTitle(session.title ?? undefined);
        setCarriedDuration(session.duration_minutes ?? undefined);
        setCarriedNotes(session.notes ?? undefined);
      })
      .catch(() => setError("Couldn't load that session for editing."))
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  const updateBlock = (blockIndex: number, patch: Partial<ExerciseBlock>) => {
    setBlocks((prev) =>
      prev.map((b, i) => (i === blockIndex ? { ...b, ...patch } : b))
    );
  };

  const updateRow = (
    blockIndex: number,
    rowIndex: number,
    patch: Partial<DraftSetRow>
  ) => {
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === blockIndex
          ? {
            ...b,
            rows: b.rows.map((r, ri) =>
              ri === rowIndex ? { ...r, ...patch } : r
            ),
          }
          : b
      )
    );
  };

  const addExerciseBlock = () => {
    const last = blocks[blocks.length - 1];
    setBlocks((prev) => [emptyBlock(last?.kind ?? "strength"), ...prev]);
  };

  const removeExerciseBlock = (blockIndex: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== blockIndex));
  };

  const addSetRow = (blockIndex: number) => {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIndex) return b;
        return { ...b, rows: [emptyRow(), ...b.rows] };
      })
    );
  };

  const removeSetRow = (blockIndex: number, rowIndex: number) => {
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === blockIndex
          ? { ...b, rows: b.rows.filter((_, ri) => ri !== rowIndex) }
          : b
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTarget) return;
 
    const validBlocks = blocks.filter((b) => b.exercise_name.trim().length > 0);
    if (validBlocks.length === 0) {
      setError("Log at least one set with an exercise name.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const setsPayload = validBlocks.flatMap((b) =>
        b.rows.map((r, i) =>
          b.kind === "strength"
            ? {
              exercise_name: b.exercise_name,
              set_number: i + 1,
              reps: r.reps,
              weight: r.weight,
              weight_unit: r.weight_unit,
            }
            : {
              exercise_name: b.exercise_name,
              set_number: i + 1,
              duration_seconds: Math.round(r.duration_minutes * 60),
              distance: r.distance || undefined,
              distance_unit: r.distance_unit,
            }
        )
      );
 
      if (editingSessionId !== null) {
        await api.updateSessionFull(editingSessionId, {
          title: carriedTitle,
          date: new Date(date).toISOString(),
          duration_minutes: carriedDuration,
          notes: carriedNotes,
          sets: setsPayload,
        });
        navigate(`/history?session=${editingSessionId}`);
      } else {
        const session = await api.createSession({
          user_id: logTarget.id,
          date: new Date(date).toISOString(),
          sets: setsPayload,
        });
        clearDraft(logTarget.id);
        navigate(`/history?session=${session.id}`);
      }
    } catch (err) {
      setError(
        apiErrorMessage(err, "Couldn't save that session — check the fields and try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearDraft = () => {
    if (!logTarget) return;
    clearDraft(logTarget.id);
    setDate(toLocalDatetimeInputValue(new Date()));
    setBlocks([emptyBlock()]);
    setError(null);
  };

  if (!logTarget || loadingEdit) {
    return <p className="empty-state">Loading…</p>;
  }

 return (
    <>
      <WorkoutSubNav />
      <form className="log-form" onSubmit={handleSubmit}>
        <div className="log-form-header">
          <h2>{editingSessionId !== null ? "Edit session" : "Log a session"}</h2>
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
          ) :
            ""
            // (
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
          <label className="field">
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
 
        {/* <label className="field">
          <span>Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="How it felt, what to adjust next time…"
          />
        </label> */}
        <div className="set-row-toggle-wrap">
          <button type="submit" className="secondary-btn" disabled={submitting}>
            {submitting
              ? "Saving…"
              : editingSessionId !== null
              ? "Update session"
              : "Save session"}
          </button>
          {editingSessionId === null && (
            <button
              type="button"
              className="ghost-btn danger"
              onClick={handleClearDraft}
              disabled={submitting}
            >
              Clear session
            </button>
          )}
        </div>
 
        <h3 className="section-label">Exercises</h3>
 
        <button type="button" className="ghost-btn" onClick={addExerciseBlock}>
          + Add exercise
        </button>
 
        <div className="exercise-blocks">
          {blocks.map((block, bi) => (
            <div className={`exercise-block-card exercise-block-${block.kind}`} key={bi}>
              <div className="exercise-block-top">
                <ExerciseCombobox
                  value={block.exercise_name}
                  onChange={(name) => updateBlock(bi, { exercise_name: name })}
                  placeholder={
                    block.kind === "strength"
                      ? "Exercise, e.g. Bench Press"
                      : "Activity, e.g. Jogging"
                  }
                />
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => removeExerciseBlock(bi)}
                  aria-label="Remove exercise"
                  disabled={blocks.length === 1}
                >
                  ✕
                </button>
              </div>
 
              <div className="exercise-block-toggle-wrap">
                <div className="set-kind-toggle" role="group" aria-label="Set type">
                  <button
                    type="button"
                    className={block.kind === "strength" ? "active" : ""}
                    onClick={() => updateBlock(bi, { kind: "strength" })}
                  >
                    Reps
                  </button>
                  <button
                    type="button"
                    className={block.kind === "cardio" ? "active" : ""}
                    onClick={() => updateBlock(bi, { kind: "cardio" })}
                  >
                    Time
                  </button>
                </div>
              </div>
 
              <button
                type="button"
                className="ghost-btn exercise-block-add-set"
                onClick={() => addSetRow(bi)}
              >
                + Add set
              </button>
 
              <div className="exercise-block-rows">
                {block.rows.map((row, ri) => (
                  <div className="set-row-fields exercise-block-row" key={ri}>
                    <span className="set-index">{block.rows.length - ri}</span>
                    {block.kind === "strength" ? (
                      <>
                        <label className="set-field">
                          <span className="set-field-label">Weight</span>
                          <div className="input-with-unit">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.weight}
                              onChange={(e) =>
                                updateRow(bi, ri, { weight: Number(e.target.value) })
                              }
                              aria-label="Weight"
                            />
                            <select
                              value={row.weight_unit}
                              onChange={(e) =>
                                updateRow(bi, ri, {
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
                            value={row.reps}
                            onChange={(e) =>
                              updateRow(bi, ri, { reps: Number(e.target.value) })
                            }
                            aria-label="Reps"
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="set-field">
                          <span className="set-field-label">Duration</span>
                          <div className="input-with-unit">
                            <input
                              type="number"
                              min={0}
                              value={row.duration_minutes}
                              onChange={(e) =>
                                updateRow(bi, ri, {
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
                              step="0.1"
                              value={row.distance}
                              onChange={(e) =>
                                updateRow(bi, ri, {
                                  distance: Number(e.target.value),
                                })
                              }
                              aria-label="Distance"
                            />
                            <select
                              value={row.distance_unit}
                              onChange={(e) =>
                                updateRow(bi, ri, {
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
                      </>
                    )}
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => removeSetRow(bi, ri)}
                      aria-label="Remove this set"
                      disabled={block.rows.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
 
              {/* <button
                type="button"
                className="ghost-btn exercise-block-add-set"
                onClick={() => addSetRow(bi)}
              >
                + Add set
              </button> */}
            </div>
          ))}
        </div>
 
        {/* <button type="button" className="ghost-btn" onClick={addExerciseBlock}>
          + Add exercise
        </button> */}
 
        {error && <p className="form-error">{error}</p>}
 
        {/* <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? "Saving…" : "Save session"}
        </button> */}
      </form>
    </>
  );
}