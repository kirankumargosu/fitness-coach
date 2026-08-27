import type { User } from "../api/types";
import { userColor } from "../lib/userColor";

interface AvatarProps {
  user: Pick<User, "id" | "name" | "first_name" | "last_name">;
  size?: number;
}

function initialsFor(user: AvatarProps["user"]): string {
  if (user.first_name || user.last_name) {
    const first = user.first_name?.[0] ?? "";
    const last = user.last_name?.[0] ?? "";
    const combined = (first + last).toUpperCase();
    if (combined) return combined;
  }
  // Fallback for accounts that haven't filled in a profile yet — use the
  // first two letters of their login name.
  return user.name.slice(0, 1).toUpperCase();
}

export function Avatar({ user, size = 36 }: AvatarProps) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: userColor(user),
      }}
      aria-hidden="true"
    >
      {initialsFor(user)}
    </span>
  );
}