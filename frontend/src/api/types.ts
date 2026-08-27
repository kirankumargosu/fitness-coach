export type UserRole = "member" | "admin";

export interface User {
  id: number;
  name: string;
  role: UserRole;
  has_password: boolean;
  first_name: string | null;
  last_name: string | null;
}

export interface Profile {
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null; // "YYYY-MM-DD"
  gender: string | null;
  height: number | null;
  height_unit: "cm" | "in" | null;
  weight: number | null;
  weight_unit: "kg" | "lb" | null;
  goal: string | null;
}

export interface Exercise {
  id: number;
  name: string;
  category?: string | null;
}

export interface SetEntry {
  id: number;
  exercise: Exercise;
  set_number: number;
  reps: number | null;
  weight: number | null;
  weight_unit: "kg" | "lb" | null;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: "km" | "mi" | null;
  notes?: string | null;
}

export interface WorkoutSession {
  id: number;
  user: User;
  title?: string | null;
  date: string; // ISO datetime
  duration_minutes?: number | null;
  notes?: string | null;
  created_at: string;
  sets: SetEntry[];
}

export interface WorkoutSessionSummary {
  id: number;
  user: User;
  title?: string | null;
  date: string;
  duration_minutes?: number | null;
  set_count: number;
  total_volume: number;
}

export type SetKind = "strength" | "cardio";

export interface DraftSet {
  kind: SetKind;
  exercise_name: string;
  set_number: number;
  // Strength
  reps: number;
  weight: number;
  weight_unit: "kg" | "lb";
  // Cardio
  duration_minutes: number;
  distance: number;
  distance_unit: "km" | "mi";
}

export interface PersonalBest {
  exercise: string;
  value: number;
  unit: "kg" | "reps" | "min" | "km";
  rank: number;
  total_lifters: number
  percentile: number
  is_best: boolean
  leader_name: string
  leader_value: number
  leader_units: "kg" | "reps" | "min" | "km";
}
