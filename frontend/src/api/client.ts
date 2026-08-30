import axios from "axios";
import type {
  Exercise,
  PersonalBest,
  Profile,
  User,
  WorkoutSession,
  WorkoutSessionSummary,
  BodyMetric,
  Badge,
  Challenge,
  ChallengeType,
  Leaderboard,
  NutritionEntry,
  NutritionSummary,
  WaterEntry,
  WaterSummary,
} from "./types";

// In production, nginx proxies /api to the backend on the same origin.
// In dev, Vite's proxy (see vite.config.ts) forwards /api to localhost:8000.
// withCredentials so the session cookie set by /api/auth/* is sent back
// on every subsequent request.
const client = axios.create({ baseURL: "/api", withCredentials: true });

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

/** Extracts the backend's {"detail": "..."} message from an axios error, if present. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

export const api = {
  getUsers: () => client.get<User[]>("/users").then((r) => r.data),

  register: (name: string, password: string) =>
    client
      .post<User>("/auth/register", { name, password })
      .then((r) => r.data),

  login: (name: string, password: string) =>
    client.post<User>("/auth/login", { name, password }).then((r) => r.data),

  logout: () => client.post("/auth/logout"),

  changePassword: (current_password: string, new_password: string) =>
    client.post("/auth/change-password", { current_password, new_password }),

  // Who's currently logged in, or null if there's no active session.
  me: () =>
    client
      .get<User>("/auth/me")
      .then((r) => r.data)
      .catch(() => null),

  getExercises: () => client.get<Exercise[]>("/exercises").then((r) => r.data),

  getPersonalBests: (userId: number) =>
    client
      .get<PersonalBest[]>(`/users/${userId}/personal-bests`)
      .then((r) => r.data),

  getBadges: (userId: number) =>
    client.get<Badge[]>(`/users/${userId}/badges`).then((r) => r.data),
  
  getProfile: (userId: number) =>
    client.get<Profile>(`/users/${userId}/profile`).then((r) => r.data),

  updateProfile: (userId: number, payload: Partial<Profile>) =>
    client
      .patch<Profile>(`/users/${userId}/profile`, payload)
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

  getLatestMetric: (userId: number) =>
    client
      .get<BodyMetric | null>("/metrics/latest", { params: { user_id: userId } })
      .then((r) => r.data),

  listMetrics: (userId: number) =>
    client
      .get<BodyMetric[]>("/metrics", { params: { user_id: userId } })
      .then((r) => r.data),

  upsertMetric: (payload: {
    user_id: number;
    date: string;
    weight?: number;
    weight_unit?: "kg" | "lb";
    muscle_mass?: number;
    body_fat_percentage?: number;
    visceral_fat?: number;
    water_percentage?: number;
    protein_percentage?: number;
  }) => client.post<BodyMetric>("/metrics", payload).then((r) => r.data),

  listChallenges: () => client.get<Challenge[]>("/challenges").then((r) => r.data),

  getChallenge: (id: number) =>
    client.get<Challenge>(`/challenges/${id}`).then((r) => r.data),

  getLeaderboard: (id: number) =>
    client.get<Leaderboard>(`/challenges/${id}/leaderboard`).then((r) => r.data),

  createChallenge: (payload: {
    name: string;
    type: ChallengeType;
    exercise_name?: string;
    start_date: string;
    end_date: string;
    participant_user_ids: number[];
  }) => client.post<Challenge>("/challenges", payload).then((r) => r.data),

  deleteChallenge: (id: number) => client.delete(`/challenges/${id}`),

  createNutritionEntry: (payload: { description: string; timestamp?: string }) =>
  client.post<NutritionEntry>("/nutrition", payload).then((r) => r.data),

  listNutritionEntries: (params: { start?: string; end?: string } = {}) =>
    client
      .get<NutritionEntry[]>("/nutrition", { params })
      .then((r) => r.data),

  getNutritionSummary: (date: string) =>
    client
      .get<NutritionSummary>("/nutrition/summary", { params: { date } })
      .then((r) => r.data),

  updateNutritionEntry: (id: number, payload: Partial<NutritionEntry>) =>
    client
      .patch<NutritionEntry>(`/nutrition/${id}`, payload)
      .then((r) => r.data),

  deleteNutritionEntry: (id: number) => client.delete(`/nutrition/${id}`),

  createWaterEntry: (payload: { amount_ml: number; timestamp?: string }) =>
  client.post<WaterEntry>("/water", payload).then((r) => r.data),

  listWaterEntries: (params: { start?: string; end?: string } = {}) =>
    client.get<WaterEntry[]>("/water", { params }).then((r) => r.data),

  getWaterSummary: (date: string) =>
    client
      .get<WaterSummary>("/water/summary", { params: { date } })
      .then((r) => r.data),

  deleteWaterEntry: (id: number) => client.delete(`/water/${id}`),
};