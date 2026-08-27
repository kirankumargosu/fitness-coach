import type { User } from "../api/types";

/** A small, fixed palette. With open registration we can't hardcode a
 * color per name anymore, so instead every user gets a stable color
 * derived from their id — same person always gets the same color,
 * across devices, without needing a lookup table. */
const PALETTE = [
  "var(--kiran)",
  "var(--tony)",
  "var(--anish)",
  "var(--plate-yellow)",
];

export function userColor(user: Pick<User, "id">): string {
  return PALETTE[user.id % PALETTE.length];
}