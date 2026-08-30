import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Avatar } from "../components/Avatar";
import type { User } from "../api/types";
import { useAuth } from "../context/AuthContext";

export function Users() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="empty-state">Loading lifters…</p>;

  const members = users.filter((user) => user.role === "member");

  if (members.length === 0) {
    return <p className="empty-state">No one's registered yet.</p>;
  }

  return (
    <div>
      <h2 className="section-label">Lifters</h2>
      <div className="user-directory">
        {members.map((u) => (
          <Link to={`/users/${u.id}`} className="user-directory-card" key={u.id}>
            <Avatar user={u} size={32} />
            <span className="user-directory-name">
              {u.name}
              {currentUser?.id === u.id && <span className="you-tag"> (you)</span>}
            </span>
            <span className="user-directory-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}