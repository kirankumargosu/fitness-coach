import { useEffect, useState } from "react";
import { api } from "../api/client";
import { PlateRing } from "../components/PlateRing";
import type { PersonalBest } from "../api/types";
import { useUsers } from "../context/UserContext";
import { userColor } from "../lib/userColor";

export function PersonalBests() {
  const { activeUser } = useUsers();
  const [bests, setBests] = useState<PersonalBest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeUser) return;
    setLoading(true);
    api
      .getPersonalBests(activeUser.id)
      .then(setBests)
      .finally(() => setLoading(false));
  }, [activeUser]);

  if (!activeUser) return null;
  if (loading) return <p className="empty-state">Loading personal bests…</p>;

  if (bests.length === 0) {
    return (
      <div className="empty-state">
        <p>No personal bests yet for {activeUser.name}.</p>
        <p className="empty-state-sub">Log a session to start tracking them.</p>
      </div>
    );
  }

  const maxOfAll = Math.max(...bests.map((b) => b.value), 1);

  return (
    <div>
      <h2 className="section-label">Personal bests — {activeUser.name}</h2>
      <div className="pb-grid">
        {bests.map((b) => (
          <div className="pb-card" key={b.exercise}>
            {/* <PlateRing
              fraction={b.max_weight / maxOfAll}
              color={userColor(activeUser)}
              value={String(b.max_weight)}
              label="best"
            /> */}
            <PlateRing
              fraction={b.value / maxOfAll}
              color={userColor(activeUser)}
              value={String(b.value)}
              label={b.unit}
            />
            <span className="pb-name">{b.exercise}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
