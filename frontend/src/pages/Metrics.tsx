import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { TrendChart } from "../components/TrendChart";
import type { BodyMetric } from "../api/types";
import { useAuth } from "../context/AuthContext";

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface FormState {
  date: string;
  weight: string;
  weight_unit: "kg" | "lb";
  muscle_mass: string;
  body_fat_percentage: string;
  visceral_fat: string;
  water_percentage: string;
  protein_percentage: string;
}

function formFromLatest(latest: BodyMetric | null): FormState {
  return {
    date: todayLocal(),
    weight: latest?.weight != null ? String(latest.weight) : "",
    weight_unit: latest?.weight_unit ?? "kg",
    muscle_mass: latest?.muscle_mass != null ? String(latest.muscle_mass) : "",
    body_fat_percentage:
      latest?.body_fat_percentage != null ? String(latest.body_fat_percentage) : "",
    visceral_fat: latest?.visceral_fat != null ? String(latest.visceral_fat) : "",
    water_percentage:
      latest?.water_percentage != null ? String(latest.water_percentage) : "",
    protein_percentage:
      latest?.protein_percentage != null ? String(latest.protein_percentage) : "",
  };
}

const METRIC_CHARTS: {
  key: keyof BodyMetric;
  label: string;
  unit: string;
}[] = [
    { key: "weight", label: "Weight", unit: "" },
    { key: "muscle_mass", label: "Muscle mass", unit: "" },
    { key: "body_fat_percentage", label: "Body fat", unit: "%" },
    { key: "visceral_fat", label: "Visceral fat", unit: "" },
    { key: "water_percentage", label: "Water", unit: "%" },
    { key: "protein_percentage", label: "Protein", unit: "%" },
  ];

export function Metrics() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState<FormState>(formFromLatest(null));
  const [history, setHistory] = useState<BodyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    Promise.all([
      api.getLatestMetric(currentUser.id),
      api.listMetrics(currentUser.id),
    ])
      .then(([latest, list]) => {
        setForm(formFromLatest(latest));
        setHistory(list);
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  if (!currentUser) return null;
  if (loading) return <p className="empty-state">Loading metrics…</p>;

  const update = (patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const toNum = (s: string) => (s === "" ? undefined : Number(s));
      const result = await api.upsertMetric({
        user_id: currentUser.id,
        date: form.date,
        weight: toNum(form.weight),
        weight_unit: form.weight_unit,
        muscle_mass: toNum(form.muscle_mass),
        body_fat_percentage: toNum(form.body_fat_percentage),
        visceral_fat: toNum(form.visceral_fat),
        water_percentage: toNum(form.water_percentage),
        protein_percentage: toNum(form.protein_percentage),
      });
      setHistory((prev) => {
        const withoutSameDate = prev.filter((m) => m.date !== result.date);
        return [...withoutSameDate, result].sort((a, b) =>
          a.date.localeCompare(b.date)
        );
      });
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't save that entry — try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <details className="metrics-entry">
        <summary>Body metrics</summary>
        <form className="log-form" onSubmit={handleSubmit}>

          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => update({ date: e.target.value })}
              required
            />
          </label>

          <div className="field-grid">
            <label className="set-field">
              <span className="set-field-label">Weight</span>
              <div className="input-with-unit">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.weight}
                  onChange={(e) => update({ weight: e.target.value })}
                />
                <select
                  value={form.weight_unit}
                  onChange={(e) =>
                    update({ weight_unit: e.target.value as "kg" | "lb" })
                  }
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </label>
            <label className="field">
              <span>Muscle mass ({form.weight_unit})</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.muscle_mass}
                onChange={(e) => update({ muscle_mass: e.target.value })}
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Body fat %</span>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.body_fat_percentage}
                onChange={(e) => update({ body_fat_percentage: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Visceral fat</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.visceral_fat}
                onChange={(e) => update({ visceral_fat: e.target.value })}
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Water %</span>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.water_percentage}
                onChange={(e) => update({ water_percentage: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Protein %</span>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.protein_percentage}
                onChange={(e) => update({ protein_percentage: e.target.value })}
              />
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}
          {saved && !error && <p className="form-saved">Saved.</p>}

          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? "Saving…" : "Save entry"}
          </button>
        </form>
      </details>

      <h3 className="section-label">Trends</h3>
      <div className="trend-section">
        {METRIC_CHARTS.map(({ key, label, unit }) => {
          const points = history
            .filter((m) => m[key] != null)
            .map((m) => ({ date: m.date, value: m[key] as number }));
          return (
            <div className="trend-card" key={key}>
              <span className="trend-card-label">{label}</span>
              {/* <h3>{label}</h3> */}
              <TrendChart points={points} unit={unit} />
            </div>
          );
        })}
      </div>
    </div>
  );
}