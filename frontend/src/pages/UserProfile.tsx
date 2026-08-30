import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { PersonalBestsView } from "../components/PersonalBestsView";
import { BadgesView } from "../components/BadgesView";
import type { User } from "../api/types";

export function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api
      .getUsers()
      .then((users) => {
        const match = users.find((u) => String(u.id) === id);
        if (match) setUser(match);
        else setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="empty-state">Loading…</p>;

  if (notFound || !user) {
    return (
      <div className="empty-state">
        <p>Couldn't find that lifter.</p>
        <p className="empty-state-sub">
          <Link to="/users">Back to the directory</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* <div className="profile-header">
        <Link to="/users" className="back-link">
          ← All lifters
        </Link>
        <h2>{user.name}'s Achievements</h2>
      </div> */}


      <div className="log-form-header">
        <Link to="/users" className="back-link">
          ← All lifters
        </Link>
        <h2>{user.name}'s Achievements</h2>
      </div>

      <details className="personal-bests-entry">
        <summary>Badges</summary>
        <BadgesView user={user} />
      </details>
      <details className="personal-bests-entry">
        <summary>Personal Bests</summary>
        <PersonalBestsView user={user} />
      </details>
    </div>
  );
}