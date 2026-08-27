import { useEffect, useState } from "react";
import { api } from "../api/client";
import { PlateRing } from "../components/PlateRing";
import type { PersonalBest, User } from "../api/types";
import { userColor } from "../lib/userColor";

export function PersonalBestsView({ user }: { user: User }) {
  const [bests, setBests] = useState<PersonalBest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getPersonalBests(user.id)
      .then(setBests)
      .finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <p className="empty-state">Loading personal bests…</p>;

  if (bests.length === 0) {
    return (
      <div className="empty-state">
        <p>No personal bests yet for {user.name}.</p>
        <p className="empty-state-sub">Log a session to start tracking them.</p>
      </div>
    );
  }

  const maxOfAll = Math.max(...bests.map((b) => b.value), 1);

  return (
    <div className="pb-grid">
      {bests.map((b) => (
        <div className="pb-card" key={b.exercise}>
          <PlateRing
            fraction={b.value / maxOfAll}
            color={userColor(user)}
            value={String(b.value)}
            label={String(b.unit)}
          />
          <span className="pb-name">{b.exercise}</span>
          <span className={`pb-standing ${b.is_best ? "pb-standing-best" : ""}`}>
            {b.total_lifters === 1
              ? "Only lifter so far"
              : b.is_best
              ? `🏆 Best of ${b.total_lifters}`
              : `#${b.rank} of ${b.total_lifters} · beats ${b.percentile}%`}
          </span>
          {!b.is_best && b.leader_name && (
            <span className="pb-leader">
              {b.leader_name} leads at {b.leader_value} {b.leader_units}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}