import { useUsers } from "../context/UserContext";
import { userColor } from "../lib/userColor";

export function UserSwitch() {
  const { users, activeUser, setActiveUser } = useUsers();

  if (users.length === 0) return null;

  return (
    <div className="user-switch" role="tablist" aria-label="Active lifter">
      {users.map((user) => {
        const active = activeUser?.id === user.id;
        return (
          <button
            key={user.id}
            role="tab"
            aria-selected={active}
            className={`user-switch-btn ${active ? "active" : ""}`}
            style={{ "--user-color": userColor(user) } as React.CSSProperties}
            onClick={() => setActiveUser(user)}
          >
            {user.name}
          </button>
        );
      })}
    </div>
  );
}
