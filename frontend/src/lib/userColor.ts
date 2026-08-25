import type { User } from "../api/types";

/** Each lifter gets a consistent accent color across the app. */
export function userColor(user: Pick<User, "name">): string {
  return user.name.toLowerCase() === "kiran"
    ? "var(--kiran)"
    // : "var(--tony)";
    : user.name.toLowerCase() === "tony" ? "var(--tony)" : "var(--anish)";
}
