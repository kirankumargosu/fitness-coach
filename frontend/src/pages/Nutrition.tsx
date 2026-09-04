import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, apiErrorMessage } from "../api/client";
import type { NutritionEntry, NutritionSummary } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { NutritionSubNav } from "../components/NutritionSubNav";

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayBounds(dateStr: string): { start: string; end: string } {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface EditState {
  description: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  saturated_fat_g: string;
  unsaturated_fat_g: string;
}

function toEditState(e: NutritionEntry): EditState {
  return {
    description: e.description,
    calories: String(e.calories),
    protein_g: String(e.protein_g),
    carbs_g: String(e.carbs_g),
    saturated_fat_g: String(e.saturated_fat_g),
    unsaturated_fat_g: String(e.unsaturated_fat_g),
  };
}

export function Nutrition() {
  const { currentUser } = useAuth();
  const [date, setDate] = useState(todayLocal());
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [summary, setSummary] = useState<NutritionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [description, setDescription] = useState("");
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const [asking, setAsking] = useState(false);
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = () => {
    setLoading(true);
    const { start, end } = dayBounds(date);
    Promise.all([
      api.listNutritionEntries({ start, end }),
      api.getNutritionSummary(date),
    ])
      .then(([e, s]) => {
        setEntries(e);
        setSummary(s);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [date]);

  if (!currentUser) return null;

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setLogging(true);
    setLogError(null);
    setAskAnswer(null);
    try {
      // await api.createNutritionEntry({ description: description.trim() });
      await api.createNutritionEntryByDish({ description: description.trim() });
      setDescription("");
      load();
    } catch (err) {
      setLogError(
        apiErrorMessage(err, "Couldn't estimate that — try rephrasing it.")
      );
    } finally {
      setLogging(false);
    }
  };

  const handleAsk = async () => {
    if (!description.trim()) return;
    setAsking(true);
    setAskError(null);
    setAskAnswer(null);
    try {
      const answer = await api.askNutrition(description.trim());
      setAskAnswer(answer);
    } catch (err) {
      setAskError(apiErrorMessage(err, "Couldn't get a suggestion — try again."));
    } finally {
      setAsking(false);
    }
  };

  const startEdit = (entry: NutritionEntry) => {
    setEditingId(entry.id);
    setEditState(toEditState(entry));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(null);
  };

  const saveEdit = async (id: number) => {
    if (!editState) return;
    setSavingEdit(true);
    try {
      await api.updateNutritionEntry(id, {
        description: editState.description,
        calories: Number(editState.calories),
        protein_g: Number(editState.protein_g),
        carbs_g: Number(editState.carbs_g),
        saturated_fat_g: Number(editState.saturated_fat_g),
        unsaturated_fat_g: Number(editState.unsaturated_fat_g),
      });
      cancelEdit();
      load();
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: number) => {
    await api.deleteNutritionEntry(id);
    load();
  };

  return (
    <div>
      <NutritionSubNav />
      <div className="log-form-header">
        <h2>Nutrition</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="nutrition-date-picker"
        />
      </div>

      <form className="log-form nutrition-log-form" onSubmit={handleLog}>
        <label className="field">
          <span>What did you eat, or ask for a suggestion</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder='"2 eggs and toast" or "suggest a low-calorie high-protein South Indian meal"'
            required
          />
        </label>

        {logError && <p className="form-error">{logError}</p>}
        {askError && <p className="form-error">{askError}</p>}

        <div className="nutrition-form-actions">
          <button type="submit" className="primary-btn" disabled={logging || asking}>
            {logging ? "Estimating…" : "Log it"}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={handleAsk}
            disabled={logging || asking}
          >
            {asking ? "Asking…" : "Ask AI"}
          </button>
        </div>
      </form>

      {summary && summary.entry_count > 0 && (
        <div className="nutrition-summary">
          <div className="nutrition-summary-stat">
            <span className="nutrition-summary-value">
              {Math.round(summary.calories)}
            </span>
            <span className="nutrition-summary-label">kcal</span>
          </div>
          <div className="nutrition-summary-stat">
            <span className="nutrition-summary-value">
              {Math.round(summary.protein_g)}g
            </span>
            <span className="nutrition-summary-label">protein</span>
          </div>
          <div className="nutrition-summary-stat">
            <span className="nutrition-summary-value">
              {Math.round(summary.carbs_g)}g
            </span>
            <span className="nutrition-summary-label">carbs</span>
          </div>
          <div className="nutrition-summary-stat">
            <span className="nutrition-summary-value">
              {Math.round(summary.saturated_fat_g)}g
            </span>
            <span className="nutrition-summary-label">sat fat</span>
          </div>
          <div className="nutrition-summary-stat">
            <span className="nutrition-summary-value">
              {Math.round(summary.unsaturated_fat_g)}g
            </span>
            <span className="nutrition-summary-label">unsat fat</span>
          </div>
        </div>
      )}

      {askAnswer && (
        <div className="nutrition-ask-answer">
          <span className="nutrition-ask-label">Coach's Suggestion</span>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{askAnswer}</ReactMarkdown>
        </div>
      )}

      {loading ? (
        <p className="empty-state">Loading entries…</p>
      ) : entries.length === 0 ? (
        <p className="empty-state">Nothing logged for this day yet.</p>
      ) : (
        <div className="nutrition-list">
          {entries.map((entry) => (
            <div className="nutrition-card" key={entry.id}>
              {editingId === entry.id && editState ? (
                <div className="nutrition-edit">
                  <input
                    value={editState.description}
                    onChange={(e) =>
                      setEditState({ ...editState, description: e.target.value })
                    }
                    className="nutrition-edit-desc"
                  />
                  <div className="nutrition-edit-grid">
                    <label className="set-field">
                      <span className="set-field-label">kcal</span>
                      <input
                        type="number"
                        min={0}
                        value={editState.calories}
                        onChange={(e) =>
                          setEditState({ ...editState, calories: e.target.value })
                        }
                      />
                    </label>
                    <label className="set-field">
                      <span className="set-field-label">Protein</span>
                      <input
                        type="number"
                        min={0}
                        value={editState.protein_g}
                        onChange={(e) =>
                          setEditState({ ...editState, protein_g: e.target.value })
                        }
                      />
                    </label>
                    <label className="set-field">
                      <span className="set-field-label">Carbs</span>
                      <input
                        type="number"
                        min={0}
                        value={editState.carbs_g}
                        onChange={(e) =>
                          setEditState({ ...editState, carbs_g: e.target.value })
                        }
                      />
                    </label>
                    <label className="set-field">
                      <span className="set-field-label">Sat fat</span>
                      <input
                        type="number"
                        min={0}
                        value={editState.saturated_fat_g}
                        onChange={(e) =>
                          setEditState({
                            ...editState,
                            saturated_fat_g: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="set-field">
                      <span className="set-field-label">Unsat fat</span>
                      <input
                        type="number"
                        min={0}
                        value={editState.unsaturated_fat_g}
                        onChange={(e) =>
                          setEditState({
                            ...editState,
                            unsaturated_fat_g: e.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="nutrition-edit-actions">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={savingEdit}
                      onClick={() => saveEdit(entry.id)}
                    >
                      {savingEdit ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="nutrition-card-top">
                    <span className="nutrition-card-desc">{entry.description}</span>
                    <span className="session-meta">{formatTime(entry.timestamp)}</span>
                  </div>
                  <div className="nutrition-card-macros">
                    <span>{Math.round(entry.calories)} kcal</span>
                    <span>{Math.round(entry.protein_g)}g protein</span>
                    <span>{Math.round(entry.carbs_g)}g carbs</span>
                    <span>{Math.round(entry.saturated_fat_g)}g sat fat</span>
                    <span>{Math.round(entry.unsaturated_fat_g)}g unsat fat</span>
                  </div>
                  <div className="nutrition-card-actions">
                    <button
                      type="button"
                      className="ghost-btn edit"
                      onClick={() => startEdit(entry)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-btn danger"
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}