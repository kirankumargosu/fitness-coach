import axios from "axios";
import type {
  Exercise,
  PersonalBest,
  User,
  WorkoutSession,
  WorkoutSessionSummary,
} from "./types";

// In production, nginx proxies /api to the backend on the same origin.
// In dev, Vite's proxy (see vite.config.ts) forwards /api to localhost:8000.
const client = axios.create({ baseURL: "/api" });

// Matches the backend's SetEntryCreate: at least one of reps/duration_seconds
// must be present — the caller is responsible for that, the backend validates it.
interface SetPayload {
  exercise_name: string;
  set_number: number;
  reps?: number;
  weight?: number;
  weight_unit?: "kg" | "lb";
  duration_seconds?: number;
  distance?: number;
  distance_unit?: "km" | "mi";
  notes?: string;
}

export const api = {
  getUsers: () => client.get<User[]>("/users").then((r) => r.data),

  // Who nginx's Basic Auth says we are, mapped to a known app user (or
  // null if there's no match — e.g. local dev without nginx in front).
  whoami: () =>
    client
      .get<User | null>("/users/whoami")
      .then((r) => r.data)
      .catch(() => null),

  getExercises: () => client.get<Exercise[]>("/exercises").then((r) => r.data),

  getPersonalBests: (userId: number) =>
    client
      .get<PersonalBest[]>(`/users/${userId}/personal-bests`)
      .then((r) => r.data),

  listSessions: (params: { userId?: number; exerciseId?: number } = {}) =>
    client
      .get<WorkoutSessionSummary[]>("/sessions", {
        params: { user_id: params.userId, exercise_id: params.exerciseId },
      })
      .then((r) => r.data),

  getSession: (id: number) =>
    client.get<WorkoutSession>(`/sessions/${id}`).then((r) => r.data),

  createSession: (payload: {
    user_id: number;
    title?: string;
    date: string;
    duration_minutes?: number;
    notes?: string;
    sets: SetPayload[];
  }) => client.post<WorkoutSession>("/sessions", payload).then((r) => r.data),

  deleteSession: (id: number) => client.delete(`/sessions/${id}`),

  addSet: (sessionId: number, payload: SetPayload) =>
    client.post(`/sessions/${sessionId}/sets`, payload).then((r) => r.data),

  deleteSet: (sessionId: number, setId: number) =>
    client.delete(`/sessions/${sessionId}/sets/${setId}`),
};