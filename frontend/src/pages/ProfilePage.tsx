import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import type { Profile } from "../api/types";
import { useAuth } from "../context/AuthContext";

const EMPTY: Profile = {
  first_name: null,
  last_name: null,
  date_of_birth: null,
  gender: null,
  height: null,
  height_unit: null,
  weight: null,
  weight_unit: null,
  goal: null,
};

export function ProfilePage() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    api
      .getProfile(currentUser.id)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [currentUser]);

  if (!currentUser) return null;
  if (loading) return <p className="empty-state">Loading profile…</p>;

  const update = (patch: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await api.updateProfile(currentUser.id, profile);
      setProfile(result);
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't save your profile — try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="log-form" onSubmit={handleSubmit}>
      <div className="log-form-header">
        <h2>Your details</h2>
        <span className="pill">{currentUser.name}</span>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>First name</span>
          <input
            value={profile.first_name ?? ""}
            onChange={(e) => update({ first_name: e.target.value || null })}
          />
        </label>
        <label className="field">
          <span>Last name</span>
          <input
            value={profile.last_name ?? ""}
            onChange={(e) => update({ last_name: e.target.value || null })}
          />
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Date of birth</span>
          <input
            type="date"
            value={profile.date_of_birth ?? ""}
            onChange={(e) => update({ date_of_birth: e.target.value || null })}
          />
        </label>
        <label className="field">
          <span>Gender</span>
          <select
            value={profile.gender ?? ""}
            onChange={(e) => update({ gender: e.target.value || null })}
          >
            <option value="">Prefer not to say</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Other">Other</option>
          </select>
        </label>
      </div>

      <h3 className="section-label">Body stats</h3>
      <div className="set-row-fields profile-stats-row">
        <label className="set-field">
          <span className="set-field-label">Height</span>
          <div className="input-with-unit">
            <input
              type="number"
              min={0}
              step="0.1"
              value={profile.height ?? ""}
              onChange={(e) =>
                update({ height: e.target.value ? Number(e.target.value) : null })
              }
            />
            <select
              value={profile.height_unit ?? "cm"}
              onChange={(e) =>
                update({ height_unit: e.target.value as "cm" | "in" })
              }
            >
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </div>
        </label>
        <label className="set-field">
          <span className="set-field-label">Weight</span>
          <div className="input-with-unit">
            <input
              type="number"
              min={0}
              step="0.1"
              value={profile.weight ?? ""}
              onChange={(e) =>
                update({ weight: e.target.value ? Number(e.target.value) : null })
              }
            />
            <select
              value={profile.weight_unit ?? "kg"}
              onChange={(e) =>
                update({ weight_unit: e.target.value as "kg" | "lb" })
              }
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </div>
        </label>
      </div>

      <label className="field">
        <span>Goal</span>
        <textarea
          value={profile.goal ?? ""}
          onChange={(e) => update({ goal: e.target.value || null })}
          rows={3}
          placeholder="What are you training towards?"
        />
      </label>

      {error && <p className="form-error">{error}</p>}
      {saved && !error && <p className="form-saved">Saved.</p>}

      <button type="submit" className="primary-btn" disabled={saving}>
        {saving ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}