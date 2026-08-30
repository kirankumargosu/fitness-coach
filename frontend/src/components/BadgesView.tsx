import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Badge, User } from "../api/types";

export function BadgesView({ user }: { user: Pick<User, "id"> }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getBadges(user.id)
      .then(setBadges)
      .finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <p className="empty-state">Loading badges…</p>;

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div>
      <div className="badges-header">
        <span className="badges-count">
          {earnedCount} / {badges.length} earned
        </span>
      </div>
      <div className="badge-grid">
        {badges.map((b) => (
          <div
            key={b.key}
            className={`badge-card ${b.earned ? "earned" : "locked"}`}
            title={b.description}
          >
            <span className="badge-emoji">{b.emoji}</span>
            <span className="badge-name">{b.name}</span>
            <span className="badge-desc">{b.description}</span>
            {b.detail && <span className="badge-detail">{b.detail}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}